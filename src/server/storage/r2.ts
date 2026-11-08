import { createHash, createHmac } from 'node:crypto';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * CLOUDFLARE R2 İSTEMCİSİ — §8.11, ADR-018, T-037.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BAĞIMLILIK YOK — VE BU ÖLÇÜLDÜ, VARSAYILMADI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` eklemek yerine SigV4
 * `node:crypto` ile elle imzalanıyor. Karar ölçümle verildi (T-037, GERÇEK R2
 * hesabına karşı):
 *
 *   PUT (imzalı)        → 200
 *   GET (imzalı)        → 200, içerik birebir aynı
 *   GET (imzasız)       → 400   ← erişim YOK
 *   GET (süresi dolmuş) → 403   ← imza ömrü GERÇEKTEN uygulanıyor
 *   DELETE (imzalı)     → 204
 *
 * Yani güvenlik özellikleri (imzasız erişilemez, süre dolunca reddedilir) iki
 * SDK paketi eklemeden sağlanıyor. §5.2'nin paket bütçesi bu kodu etkilemezdi
 * (sunucu tarafı, istemci paketine girmiyor) — ama ADR-004 "onaysız bağımlılık
 * eklenmez" diyor ve gerekçesi yalnızca boyut değil BAKIM YÜKÜ. Kırk beş
 * satırlık, sınanmış, sürüm takibi gerektirmeyen kod yeterliyse SDK'nın
 * karşılığı yok.
 *
 * ⚠️ `R2_ENDPOINT` DİYE BİR DEĞİŞKEN YOK VE OLMAYACAK: adres hesap
 * kimliğinden türetiliyor (`https://<accountId>.r2.cloudflarestorage.com`).
 * İkinci bir değişken, hesap kimliğiyle sapabilen ikinci bir kaynak olurdu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TEMBEL YAPILANDIRMA — `db.ts`in BULGU-002 dersi
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Ortam değişkenleri MODÜL GÖVDESİNDE okunmuyor. `next build`in "Collecting
 * page data" adımı her route modülünü import ediyor; kurulum modül düzeyinde
 * olsaydı `R2_*` bulunmayan her ortamda (CI, Docker derleme katmanı) DERLEME
 * DÜŞERDİ. `db.ts` tam bu sebeple tembel ve aynı kalıp burada da geçerli.
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** §8.11 — imzalı okuma adresinin ömrü. */
export const SIGNED_GET_TTL_SECONDS = 15 * 60;

/**
 * İmzalı YÜKLEME adresinin ömrü — okumadan KISA, ve bu asimetri kasıtlı.
 *
 * Çalınmış bir GET adresi tek bir nesneyi OKUTUR; çalınmış bir PUT adresi
 * bizim bucket'ımıza YAZDIRIR (depolama maliyeti, ve anahtarı bilinen bir
 * nesnenin üzerine yazma). Yazma yetkisinin ömrü bu yüzden daha kısa.
 *
 * Beş dakika, bir kullanıcının dosya seçip 10 MB'a kadar yüklemesi için
 * fazlasıyla yeterli; tarayıcı yüklemeyi hemen başlatıyor.
 */
export const SIGNED_PUT_TTL_SECONDS = 5 * 60;

/**
 * Eksik yapılandırma SESSİZCE YUTULMAZ — hangi anahtarın eksik olduğu söylenir.
 *
 * ⚠️ PARAMETRE TİPİ `NodeJS.ProcessEnv` DEĞİL ve bunu `tsc` öğretti: bu projede
 * `ProcessEnv` `NODE_ENV`i ZORUNLU tutuyor, dolayısıyla testten kısmi bir env
 * nesnesi geçirmek derlenmiyordu. Fonksiyonun gerçekten ihtiyacı "ada göre
 * dize okunabilen bir nesne"; daha geniş bir tip istemek, ihtiyacı olmayan bir
 * şeyi şart koşmaktı.
 */
export function readR2Config(env: Record<string, string | undefined> = process.env): R2Config {
  const gerekli = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
  const eksik = gerekli.filter((ad) => !env[ad]);

  if (eksik.length > 0) {
    // §8.20 — mesajda DEĞER yok, yalnızca eksik anahtarın ADI.
    throw new Error(`R2 yapılandırması eksik: ${eksik.join(', ')}. .env dosyasını kontrol edin.`);
  }

  return {
    accountId: env.R2_ACCOUNT_ID as string,
    accessKeyId: env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    bucket: env.R2_BUCKET as string,
  };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/** `https://<accountId>.r2.cloudflarestorage.com` — tek kaynak. */
function hostFor(config: R2Config): string {
  return `${config.accountId}.r2.cloudflarestorage.com`;
}

/**
 * Anahtarı yol parçası olarak kodlar.
 *
 * ⚠️ PARÇA PARÇA kodlanıyor: `encodeURIComponent` eğik çizgiyi de kodlar
 * (`%2F`) ve o zaman R2 anahtarı TEK bir isim sanar — `projeler/x.png`
 * klasörsüz bir `projeler%2Fx.png` nesnesine dönüşür. İmza da kanonik yol
 * üzerinden hesaplandığı için uyuşmazlık 403 verir.
 */
function encodeKeyPath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export type R2Method = 'GET' | 'PUT' | 'DELETE' | 'HEAD';

/**
 * Sorgu dizesinde imzalı (presigned) adres üretir.
 *
 * `UNSIGNED-PAYLOAD` kullanılıyor: gövde imzaya girmiyor, çünkü tarayıcı
 * doğrudan yüklerken sunucu baytları görmüyor ve göremediği bir şeyi
 * imzalayamaz. Gövdenin DOĞRULANMASI ayrı bir adım (`confirmUpload` nesneyi
 * R2'den geri okuyup sihirli baytına bakıyor) — imza orada değil, orada
 * İÇERİK kontrolü var.
 */
export function presignUrl(
  input: {
    key: string;
    method: R2Method;
    expiresIn: number;
    /** Deterministik imza için — testte sabitlenir. */
    now?: Date;
  },
  config: R2Config = readR2Config(),
): string {
  const host = hostFor(config);
  const now = input.now ?? new Date();

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  // R2 bölgeyi `auto` bekliyor; gerçek bir bölge adı 403 verir.
  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${config.bucket}/${encodeKeyPath(input.key)}`;

  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });
  // SIRA ZORUNLU: kanonik istek sorgu parametrelerinin SIRALI olmasını şart
  // koşuyor; sıralamazsak imza sunucudakiyle uyuşmaz.
  params.sort();

  const canonicalRequest = [
    input.method,
    canonicalUri,
    params.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  let anahtar = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  for (const parca of [region, service, 'aws4_request']) anahtar = hmac(anahtar, parca);
  const signature = hmac(anahtar, stringToSign).toString('hex');

  return `https://${host}${canonicalUri}?${params.toString()}&X-Amz-Signature=${signature}`;
}

/* ===========================================================================
 * NESNE İŞLEMLERİ — imzalı adres üzerinden `fetch`
 * ======================================================================== */

/**
 * R2'ye yapılan ağ çağrılarının ENJEKTE EDİLEBİLİR yüzeyi.
 *
 * ⚠️ TESTLER GERÇEK R2'YE YAZMAZ ve yazamamalı: CI'da anahtar yok ve
 * olmayacak (kart bağlayıcı). Bu yüzden `fetch` dışarıdan veriliyor ve birim
 * testleri taklit bir `fetch` geçiriyor — `db` istemcisinin enjekte edilme
 * gerekçesinin aynısı (T-003c: `pnpm test` DB'siz koşar).
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface R2Deps {
  config?: R2Config;
  fetchImpl?: FetchLike;
  now?: Date;
}

/** Nesnenin TAMAMINI okur — sunum ucu (`/api/v1/dosya/[id]`, ADR-044) kullanıyor. */
export async function getObjectBytes(key: string, deps: R2Deps = {}): Promise<Buffer | null> {
  const url = presignUrl(
    { key, method: 'GET', expiresIn: SIGNED_GET_TTL_SECONDS, now: deps.now },
    deps.config ?? readR2Config(),
  );
  const istek = deps.fetchImpl ?? fetch;

  const yanit = await istek(url);
  if (yanit.status === 404) return null;
  if (!yanit.ok) throw new Error(`R2 okuma başarısız: ${yanit.status}`);

  return Buffer.from(await yanit.arrayBuffer());
}

/**
 * Nesneyi siler. BAŞARISIZLIKTA FIRLATMAZ.
 *
 * ⚠️ FIRLATMAMASI ZORUNLU VE GEREKÇESİ `writeAuditLog` İLE AYNI: bu fonksiyonun
 * tek çağrı yeri TELAFİ yolu — `Attachment` yazımı başarısız olduğunda yüklenen
 * nesneyi geri almak. Orada fırlatsa, ASIL hatayı (DB yazma hatası) maskeler ve
 * kullanıcıya yanlış sebebi gösterirdik.
 *
 * Telafi başarısız olursa nesne yetim kalıyor ve §13.5 gece temizliği onu
 * topluyor (ADR-018 bu işi zaten öngörmüş). Yani tek hat değil, iki hat.
 */
export async function deleteObjectQuietly(key: string, deps: R2Deps = {}): Promise<boolean> {
  try {
    const url = presignUrl(
      { key, method: 'DELETE', expiresIn: SIGNED_PUT_TTL_SECONDS, now: deps.now },
      deps.config ?? readR2Config(),
    );
    const istek = deps.fetchImpl ?? fetch;
    const yanit = await istek(url, { method: 'DELETE' });

    return yanit.ok || yanit.status === 404;
  } catch (error) {
    guvenliHata('[r2] nesne silinemedi:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Nesneyi SUNUCUDAN yazar — ADR-044.
 *
 * T-037'de bunun yerine tarayıcıya imzalı PUT adresi veriliyordu
 * (`presignUpload`); bucket'ta CORS olmadığı için hiçbir tarayıcıdan
 * çalışmıyordu. Sunucudan yazmak CORS'a tabi değil ve imza AYNI
 * (`presignUrl`), yani ikinci bir imzalama yolu yok.
 *
 * `Content-Type` YAZILIYOR: sunum ucu tipi satırdan okuyor ama nesnenin
 * kendisi de doğru tipi taşısın (R2 panelinden ya da yedekten bakan biri için).
 */
export async function putObject(
  key: string,
  bytes: Buffer,
  contentType: string,
  deps: R2Deps = {},
): Promise<void> {
  const url = presignUrl(
    { key, method: 'PUT', expiresIn: SIGNED_PUT_TTL_SECONDS, now: deps.now },
    deps.config ?? readR2Config(),
  );
  const istek = deps.fetchImpl ?? fetch;
  const yanit = await istek(url, {
    method: 'PUT',
    body: new Uint8Array(bytes),
    headers: { 'Content-Type': contentType },
  });
  if (!yanit.ok) throw new Error(`R2 yazma başarısız: ${yanit.status}`);
}
