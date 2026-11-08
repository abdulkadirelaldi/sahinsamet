import type { AuditLogFilterInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { AuditAction } from '@/types';

import { appDayRangeToInstantFilter, panelSkipTake, toPagedResult } from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `AuditLog` OKUMA YOLU — §4.2 denetim kaydı ekranı, T-052.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA F1'DEN BERİ YOKTU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yazma yolu (`_shared/audit.ts`) F1'den beri çalışıyor ve ADR-022 ile ADR-034
 * onun üzerine kurulu — ama YAZDIĞIMIZ HİÇBİR ŞEYİ OKUYAMIYORDUK. Orkestra Şefi
 * F3 kabul kontrolünde ölçtü: `src/server/` altında `auditLog.findMany` geçen
 * tek dosya üretilmiş Prisma istemcisiydi.
 *
 * ⚠️ OKUMAK YENİ BİR MARUZİYET YÜZEYİ AÇAR ve bu dosyanın en önemli kısmı o
 * yüzeyin nasıl daraltıldığı. Karar ve gerekçe aşağıda, `toDiffSummary`da.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `cachedRead` public okumalar içindir (ADR-011). Gerekçe T-038/T-040 ile
 * birebir aynı: tek kullanıcılı bir panelde hiçbir yükü azaltmadan "yeni kayıt
 * görünmüyor" sınıfından bir hata riski açar. Burada maliyeti DAHA DA yüksek:
 * denetim kaydı, bir şeyin ne zaman olduğunu öğrenmek için açılır — bayat bir
 * denetim ekranı yanlış cevabı GÜVENLE verir. Panel rotalarının hepsi zaten
 * dinamik (T-034 ölçümü). `tests/unit/services/denetim-kaydi.test.ts` bunu
 * kaynaktan sabitliyor.
 *
 * Ad `fetchX` — `getX` DEĞİL. T-040'ın adlandırma kuralı: bu kod tabanında
 * `getX` "önbellekli" demek.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YETKİ — BU DOSYADA YOK VE OLMAMASI KONVANSİYON
 * ───────────────────────────────────────────────────────────────────────────
 *
 * §7.1: panel okuması Server Component içinden DOĞRUDAN servis çağrısıdır;
 * yetki `middleware.ts` + `/panel` rota grubunda, servis katmanında değil
 * (`fetchPostsForPanel`, `fetchContactMessages` da böyle). Buraya bir `auth()`
 * koymak, diğer altı panel okumasının korunduğu izlenimini verirdi — oysa
 * korunmuyorlar, çünkü korumaya ihtiyaçları başka katmanda karşılanıyor.
 *
 * YETKİ RİSKİ BURADA BAŞKA BİR ŞEY: bu modülün bir `'use server'` dosyasından
 * yeniden ihraç edilmesi. O gün `fetchAuditLog` ağdan çağrılabilir bir POST
 * ucuna dönüşür ve denetim kaydının tamamı kimlik doğrulamasız dışarı açılır.
 * `actions/contact-message.ts` aynı tuzağı yorumla kaydediyor; burada ayrıca
 * TESTLE kapatıldı — kapı, eylem dosyalarını kaynaktan tarıyor.
 */

/* ===========================================================================
 * DTO
 * ======================================================================== */

/**
 * Ekrana çıkan `diff` ÖZETİ — ham `diff` DEĞİL.
 *
 * Tip, kararın kendisini taşıyor: `fields` her zaman var, `values` yalnızca
 * izinli anahtarlar için dolu. Ham `diff`i DTO'ya hiç koymamak kasıtlı — bir
 * gün "önce ham gönderelim, arayüz süzsün" diyen biri bu tipi değiştirmek
 * zorunda kalır, yani karar sessizce aşılamaz.
 */
export interface AuditDiffSummaryDto {
  /** Değişen alanların YOL ADLARI (`slug`, `deleted.title`) — DEĞER YOK. */
  fields: string[];
  /** Yalnızca `SHOWN_DIFF_VALUE_KEYS` anahtarlarının değerleri. */
  values: Record<string, string>;
}

/**
 * Listede görünen denetim satırı.
 *
 * `actorEmailHash` BİLEREK YOK. Ekranda 64 karakterlik bir özet, insanın
 * okuyamadığı bir dize; "kim" sorusunu tek kullanıcılı sistemde `actorId`
 * cevaplıyor. Okunamayan bir takma-kimlik basmak, hiçbir fayda karşılığında
 * ekrana kişisel veri taşımak olurdu. Sütun adli inceleme için tabloda kalıyor
 * (ADR-020: aktör silinse bile izi kalsın).
 */
export interface AuditLogListItemDto {
  id: string;
  action: AuditAction;
  /** Model adı — ADR-020/K4 gereği enum değil, serbest dize. */
  entity: string;
  entityId: string | null;
  actorId: string | null;
  /** §4.2 "hangi IP'den" — listede, gerekçe aşağıda. */
  ip: string | null;
  createdAt: string;
  diff: AuditDiffSummaryDto;
}

/* ===========================================================================
 * ⚠️⚠️ KARAR: `diff` DEĞERLERİ EKRANA ÇIKMAZ — ADR-034'ÜN ÖLÇÜLEN BOŞLUĞU
 * ======================================================================== */

/**
 * ADR-034 üç bağımsız ölçümle şunu sabitledi: `redactAuditDiff` ADA BAĞLIDIR ve
 * bilmediği adı koruyamaz.
 *
 *   `{ password: … }`, iç içe, dizi içinde          → maskeleniyor
 *   `{ yeniSifre: … }`, `{ pass: … }`               → SIZIYOR
 *   `{ note: 'şifre: …' }` (masum anahtarın değeri) → SIZIYOR
 *
 * Bugüne kadar bunun bedeli sınırlıydı: `diff` yalnızca YAZILIYORDU. Okunup
 * ekrana basılması yüzeyi gerçekten büyütüyor ve somut olarak: yazılmış bir
 * satır ancak veritabanı erişimiyle okunur, EKRANA BASILAN satır ise yalnızca
 * OTURUM ele geçirmekle okunur. ADR-035 bu projede oturum ele geçirmeyi ciddiye
 * alıyor; denetim ekranı ham `diff` basarsa ele geçirilmiş bir oturum, geçmişte
 * diff'e girmiş her değerin TOPLU DÖKÜMÜNE dönüşür.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * KARAR: DEĞER YOK, ALAN ADI VAR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Ekrana `diff`in ANAHTAR YOLLARI çıkar, değerleri çıkmaz. Dayanak tek bir
 * gözlem ve bu gözlem kararı sezgisel değil YAPISAL yapıyor:
 *
 *   ⚠️ ADR-034'ÜN ÖLÇTÜĞÜ ÜÇ SIZINTI SINIFININ ÜÇÜ DE DEĞER SIZINTISIDIR.
 *
 * `yeniSifre`de sır değerdedir; `pass`te değerdedir; `note: 'şifre: …'`te
 * değerin İÇİNDEDİR. Değerleri hiç göstermemek, ölçülen yüzeyin TAMAMINI
 * kapatır — ve bunu bir ADA BAKMADAN yapar. Yani koruma, hiç kimsenin bir alanı
 * adlandırırken bir listeyi hatırlamasına bağlı değil. ADR-034'ün cümlesi tam
 * buydu: "koruma, hatırlamayı gerektirdiği anda koruma olmaktan çıkar."
 *
 * ALAN ADI HİÇBİR KOŞULDA HASSAS DEĞİL — T-046'nın `profile.socials` için
 * verdiği kararın aynısı, bir seviye yukarıda. `buildDiff`in anahtarları eylem
 * dosyalarında ELLE YAZILMIŞ nesne literallerinden geliyor, kullanıcı
 * girdisinden değil.
 *
 * BİLİNEN SINIR, dürüstçe: `socialsChanged` anahtar adlarını VERİTABANINDAKİ
 * serbest `Json` sütunundan topluyor (`profile.ts` → `row.socials as …`). Yani
 * seed/migration/elle bir yazma oraya beklenmeyen bir ANAHTAR koyarsa o ad
 * ekrana çıkar. Sınır dar: değeri yine çıkmıyor, ve bir alanı değerinin kendisi
 * ile adlandırmak için kasıt gerekir.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * REDDEDİLEN SEÇENEKLER
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `diff`i HİÇ GÖSTERMEMEK — reddedildi. §4.2 ekranın cevaplayacağı soruyu
 *   "ne, ne zaman, hangi IP'den" diye yazıyor; "ne"yi düşürmek ekranı
 *   `action` + `entity` ikilisine indirir ve "başlığı mı durumu mu değişti"
 *   sorusu cevapsız kalır. Maruziyeti sıfırlamanın yolu ekranı işlevsiz
 *   bırakmak değil, değeri düşürmek.
 *
 * OKUMA ANINDA İKİNCİ BİR REDAKSİYON — reddedildi, ve bu en önemli ret.
 *   İkinci redaksiyon da ADA BAĞLI olurdu, yani BİRİNCİSİNİN YAKALADIĞI
 *   KÜMEYİ yakalar: `yeniSifre` ve gömülü sır ikisinden de geçer. Sıfır yeni
 *   kapsam, ama "iki kat redakte ediliyor" diye okunacak bir görüntü. ADR-034
 *   listeyi genişletmeyi tam bu sebeple reddetti: "genişletmek, ağın koruma
 *   olduğu yanılsamasını GÜÇLENDİRİR." Bu seçeneği almak, ADR-034'ün
 *   engellemek için yazıldığı varsayımın ÜÇÜNCÜ kez kurulması olurdu
 *   (T-038'de mesaj gövdesi, T-042s'te şifre).
 *
 * `redactAuditDiff` KALDIRILMIYOR: yazma tarafında bilinen adları yakalamaya
 * devam ediyor ve emniyet ağı olarak değerli (ADR-034). Bu dosya onun
 * yakalayamadığını yakalıyor — ikisi farklı katman, biri diğerinin yerine
 * geçmiyor.
 */

/**
 * DEĞERİ EKRANA ÇIKABİLEN anahtarlar — VARSAYILAN REDDET.
 *
 * ⚠️ POLARİTE ÖNEMLİ VE ADR-034'ÜN REDDETTİĞİ LİSTEDEN FARKI BU: redaksiyon
 * listesi bir KARA LİSTEDİR, yeni bir ad varsayılan olarak KORUNMAZ ve "liste
 * her zaman bir adım geride kalır". Bu bir BEYAZ LİSTEDİR: yeni bir ad
 * varsayılan olarak GÖSTERİLMEZ. Liste geride kalırsa sonuç eksik bilgi olur,
 * sızıntı olmaz. Kusurun yönü tersine çevrildi.
 *
 * Üyelerin ortak özelliği: değeri VERİ DEĞİL, bir ALAN ADI ya da kodda yazılı
 * KAPALI BİR KÜME. Buraya bir anahtar eklemek, maruziyeti BİLEREK genişletmek
 * demektir; çıkarmak her zaman güvenlidir.
 *
 *   `context`        ADR-034 kalıbının bağlamı — `'CHANGE_PASSWORD'`,
 *                    `'TOTP_SETUP'`… hepsi kodda sabit.
 *   `changed`        ADR-034 kalıbının kendisi: değer bir ALAN ADI
 *                    (`'passwordHash'`), alanın içeriği değil.
 *   `socialsChanged` T-046 kalıbı: zaten yalnızca anahtar ADLARI taşıyor.
 *
 * ⚠️ `{ before, after }` ÇİFTLERİ BU LİSTEYE HİÇ GİRMEZ — kuralı keskin tutmak
 * için. O çiftin değeri TANIMI GEREĞİ kayıt içeriğidir; `status` gibi masum
 * görünen bir alan için istisna açmak, listeyi "hangi içerik masum" tartışmasına
 * çevirirdi. Bir durum değişikliğini görmek isteyen kaydın kendisine bakar.
 */
export const SHOWN_DIFF_VALUE_KEYS: ReadonlySet<string> = new Set([
  'context',
  'changed',
  'socialsChanged',
]);

/** `buildDiff`in ürettiği önce/sonra çifti mi — öyleyse YAPRAK sayılır. */
function isBeforeAfterPair(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key === 'before' || key === 'after');
}

/** Gösterilebilir değerin ekran dizesi. Dizi virgülle; nesne ASLA. */
function toShownValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // Üyelerin kendisi de yalnızca ilkel olabilir; iç içe bir yapıyı
    // düzleştirip basmak, beyaz listenin "değer bir ad" varsayımını aşardı.
    const uyeler = value.filter(
      (item): item is string | number | boolean =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    );
    return uyeler.length === value.length ? uyeler.join(', ') : null;
  }
  return null;
}

/**
 * Ham `diff`ten EKRANA ÇIKACAK özeti üretir.
 *
 * Gezinme iç içe: `{ deleted: { title, … } }` (BULGU-019 kalıbı) yolları
 * `deleted.title` olarak düzleşir, yoksa silme satırları tek bir `deleted`
 * olarak görünür ve hangi alanların gittiği kaybolurdu.
 *
 * DÖNGÜ KORUMASI var — `redactAuditDiff` ile aynı gerekçe: `diff` bir `Json`
 * sütunundan geliyor ve kendine referans veren bir yapı sonsuz özyinelemeyle
 * denetim ekranını değil SUNUCUYU düşürürdü.
 */
export function toDiffSummary(diff: unknown): AuditDiffSummaryDto {
  const fields: string[] = [];
  const values: Record<string, string> = {};

  const gez = (value: unknown, path: string, seen: WeakSet<object>): void => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const kayit = value as Record<string, unknown>;

      // Önce/sonra çifti bir YAPRAKTIR: `slug.before` diye iki satır
      // göstermek, tek bir alanın değiştiğini iki kez söylemek olurdu.
      if (!isBeforeAfterPair(kayit)) {
        const anahtarlar = Object.keys(kayit);
        if (anahtarlar.length > 0) {
          for (const key of anahtarlar) {
            gez(kayit[key], path ? `${path}.${key}` : key, seen);
          }
          return;
        }
      }
    }

    if (!path) return;
    fields.push(path);

    // Beyaz liste YOLUN SON PARÇASINA bakıyor: `deleted.context` de
    // `context`tir ve aynı kapalı kümeden gelir.
    const sonParca = path.slice(path.lastIndexOf('.') + 1);
    if (SHOWN_DIFF_VALUE_KEYS.has(sonParca)) {
      const gosterim = toShownValue(value);
      if (gosterim !== null) values[path] = gosterim;
    }
  };

  gez(diff, '', new WeakSet());

  return { fields, values };
}

/* ===========================================================================
 * ⚠️ `ip` LİSTEDE, `userAgent` HİÇ OKUNMUYOR — T-038'in ayrımı AYNI DEĞİL
 * ======================================================================== */

/**
 * T-038 mesaj kutusunda `ip`/`userAgent`i LİSTEDEN çıkarıp DETAYA koymuştu
 * (ADR-020, KVKK veri azaltma). Kart haklı olarak "burada da geçerli mi" diye
 * sordu. Cevap: AYRIM GEÇERLİ, AMA ÇİZGİ BAŞKA YERE DÜŞÜYOR — ve sebep,
 * verinin KİME ait olduğu.
 *
 * Mesaj kutusundaki `ip` ÜÇÜNCÜ BİR KİŞİYE, siteye yazan ziyaretçiye aitti.
 * Oradaki azaltma argümanı güçlüydü: başka birinin IP'sini her satırda taşımak
 * için bir sebep yok. Denetim kaydındaki `ip` ise PANEL SAHİBİNİN KENDİ
 * IP'sidir — kendi oturumları hakkında kendi verisi.
 *
 * `ip` LİSTEDE, çünkü §4.2 onu açıkça istiyor ("hangi IP'den") ve denetim
 * kaydında IP'nin DEĞERİ KARŞILAŞTIRMALIDIR: tanıdık bir IP'nin arasındaki
 * yabancıyı bir KOLONU TARAYARAK fark edersiniz, elli satırı tek tek açarak
 * değil. Detaya gömmek veri azaltmanın lafzına uyar, §4.2'nin amacını yıkar.
 *
 * `userAgent` OKUNMUYOR — ve "detayda gizli" değil, HİÇ SEÇİLMİYOR. Üç sebep:
 * ikisinden daha yüksek entropili parmak izi; tek kullanıcılı bir panelde her
 * satırda neredeyse aynı dize olduğu için tarama değeri sıfır; ve onu okuyacak
 * bir ekran YOK (T-052'nin Frontend kapsamı yalnızca liste). Bir `fetchById`
 * yazmak, bugün hiçbir çağıranı olmayan ve "çalışıyormuş gibi görünen" ölü kod
 * olurdu — T-040'ın "bu projenin en pahalı sınıfı" dediği şey. Bir ekran
 * gerektiğinde detay okuması O ZAMAN eklenir; sütun tabloda duruyor.
 *
 * İKİSİ DE 90 GÜN SONRA TEMİZLENİYOR (ADR-020): eski satırlarda `ip` zaten
 * `null` döner ve ekran kendiliğinden daha az gösterir. Bu bir kusur değil,
 * kaydın kendisi korunurken kişisel verinin düşmesi — tasarım böyle.
 */

const LIST_SELECT = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  actorId: true,
  diff: true,
  ip: true,
  createdAt: true,
} as const;

interface AuditLogRow {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  diff: unknown;
  ip: string | null;
  createdAt: Date;
}

/** Bu okumanın Prisma'dan ihtiyaç duyduğu asgari yüzey (`ContactMessageClient` kalıbı). */
export interface AuditLogReadClient {
  auditLog: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof LIST_SELECT;
      orderBy: { createdAt: 'asc' | 'desc' }[];
      skip: number;
      take: number;
    }): Promise<AuditLogRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: AuditLogReadClient = db;
void _uyumKontrolu;

function toListDto(row: AuditLogRow): AuditLogListItemDto {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    actorId: row.actorId,
    ip: row.ip,
    createdAt: row.createdAt.toISOString(),
    // ⚠️ HAM `diff` ASLA BURADAN GEÇMEZ — karar yukarıda.
    diff: toDiffSummary(row.diff),
  };
}

/**
 * Filtreyi Prisma `where` bloğuna çevirir — SAF, bu yüzden ayrıca sınanabiliyor.
 *
 * VERİLMEYEN ALAN HİÇ EKLENMEZ. Varsayılan bir `action` ya da `entity` koymak,
 * filtresiz bir çağrının sessizce satır gizlemesi olurdu — denetim kaydında bu,
 * aradığı olayı bulamayan birinin "o olay hiç olmamış" sonucuna varması demek.
 */
export function buildAuditLogWhere(filter: AuditLogFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.action) where.action = filter.action;
  if (filter.entity) where.entity = filter.entity;
  if (filter.entityId) where.entityId = filter.entityId;
  if (filter.actorId) where.actorId = filter.actorId;

  // Gün → an dönüşümü ve 00:00–03:00 tuzağı: `_shared/app-date.ts`.
  const createdAt = appDayRangeToInstantFilter({ from: filter.from, to: filter.to });
  if (createdAt) where.createdAt = createdAt;

  return where;
}

/**
 * Denetim kaydı listesi — sayfalı, varsayılan EN YENİ ÖNCE.
 *
 * Sıralama `createdAt` üzerinde ve yön filtreden gelir (`sortDirectionSchema`
 * varsayılanı `desc`). İkincil bir sıralama anahtarı YOK: `createdAt`
 * milisaniye taşıyor ve tek kullanıcılı bir panelde aynı milisaniyede iki satır
 * yazılması pratikte olmuyor — olduğunda sıranın hangisi olduğu da bir şeyi
 * değiştirmiyor.
 */
export async function fetchAuditLog(
  filter: AuditLogFilterInput,
  client: AuditLogReadClient = db,
): Promise<PagedResult<AuditLogListItemDto>> {
  const where = buildAuditLogWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.auditLog.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: filter.sort }],
      skip,
      take,
    }),
    client.auditLog.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toListDto);
}
