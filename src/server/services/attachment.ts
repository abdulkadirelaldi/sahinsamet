import { createHash, randomUUID } from 'node:crypto';

import { db } from '@/server/db';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/schemas/attachment';
import { deleteObjectQuietly, putObject, type R2Deps } from '@/server/storage/r2';
import type { AttachmentEntity } from '@/types';

import { readImageDimensions, sniffMime, type SniffedMime } from './_shared/file-type';
import { UPLOAD_RATE_LIMIT, uploadWindowStart } from '@/lib/security/rate-limit';
import { fail, writeAuditLog, type ApiFailure } from './_shared';

/**
 * `Attachment` VARLIK KONTROLÜ — T-051/B.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN VAR: ŞEMA BİÇİMİ DOĞRULUYOR, VARLIĞI DOĞRULAMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `coverAttachmentId` (proje + blog) ve `avatarAttachmentId`/`cvAttachmentId`
 * (profil) GİZLİ FORM ALANLARINDAN geliyor. Şema yalnızca `cuidSchema` ile
 * biçimi doğruluyor; var olmayan bir kimlik şemayı geçiyor ve tek kapı
 * veritabanındaki FK kısıtı oluyor (`onDelete: Restrict`).
 *
 * Bu modül o kapıyı YAZMADAN ÖNCEYE taşıyor. İki kazanç:
 *   1. Hangi ALANIN bozuk olduğu KESİN bilinir — çünkü kontrolü biz yapıyoruz.
 *   2. Başarısız bir yazma denemesi hiç yapılmıyor.
 *
 * ⚠️ T-037'NİN KANCASI BURASI. Bugün sorulan soru "bu eklenti VAR MI". Yükleme
 * bağlandığında soru "bu eklenti BU KULLANICIYA MI AİT" olacak ve cevabı aynı
 * fonksiyonun içinde genişleyecek — çağıran taraflar değişmeyecek. Bugün tek
 * kullanıcı olduğu için ikisi aynı kapı; yarın ayrışacak.
 */

/** Bu kontrolün Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface AttachmentExistenceClient {
  attachment: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
}

/**
 * Verilen kimliklerden veritabanında BULUNMAYANLARI döndürür.
 *
 * TEK SORGU: kimlikler `in` ile birlikte sorulup dönen kümeyle farkı alınıyor.
 * Alan başına ayrı `findUnique` çağırmak profil kaydında (avatar + cv) iki
 * gidiş-dönüş demekti ve ileride galeri eklendiğinde doğrusal büyürdü.
 *
 * BOŞ GİRDİ SORGU AÇMAZ: hiçbir eklenti alanı gönderilmemiş bir kaydetme —
 * bugün en sık durum — fazladan hiçbir maliyet ödemiyor.
 *
 * YİNELENEN kimlikler tekilleştiriliyor: profilde aynı dosya hem avatar hem cv
 * olarak seçilebilir ve `in` listesine iki kez koymak gereksiz.
 */
export async function findMissingAttachmentIds(
  ids: readonly (string | null | undefined)[],
  client: AttachmentExistenceClient = db,
): Promise<string[]> {
  const aranacak = [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')),
  ];
  if (aranacak.length === 0) return [];

  const bulunanlar = await client.attachment.findMany({
    where: { id: { in: aranacak } },
    select: { id: true },
  });

  const bulunanKume = new Set(bulunanlar.map((row) => row.id));
  return aranacak.filter((id) => !bulunanKume.has(id));
}

/* ===========================================================================
 * §8.11 / ADR-018 — R2 EKLENTİ YÖNETİMİ (T-037)
 * ======================================================================== */

/**
 * ⚠️ DB'DE ADRES YOK, YALNIZCA ANAHTAR VAR — tasarımın kalbi, esnetilmiyor.
 *
 * `Attachment.url` ADR-018'de KALDIRILDI: kalıcı bir URL ya bayat olurdu (15
 * dakikada ölür) ya da bucket'ın private olmadığı anlamına gelirdi. İmzalı
 * adres `key`den İSTEK ANINDA üretiliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️⚠️ İMZALI ADRES ÖNBELLEĞE GİRMEZ — ADR-018'İN KABUL KRİTERİ, ÖLÇÜLDÜ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ADR-018 bunu T-037'nin kabul kriteri olarak yazmıştı: *"imzalı URL'nin TTL'i
 * önbellek süresinden kısaysa bozuk görsel çıkar."* Ölçtüm ve çatışma GERÇEK:
 *
 *   CONTENT_REVALIDATE_SECONDS = 3600 sn   (önbellek girdisinin ömrü)
 *   SIGNED_GET_TTL_SECONDS     =  900 sn   (§8.11 imzalı adres ömrü)
 *
 * Yani imzalı adres bir `cachedRead` çıktısına girerse, girdi 1 saat yaşarken
 * adres 15 dakikada ölür → her saatin 45 DAKİKASI KIRIK GÖRSEL.
 *
 * ÇÖZÜM TTL'İ BÜYÜTMEK DEĞİL (§8.11 15 dakikayı şart koşuyor ve uzatmak çalınan
 * adresin ömrünü uzatır), İKİSİNİ HİÇ KARŞILAŞTIRMAMAK: imzalı adres
 * ÖNBELLEKLENEN HİÇBİR DTO'YA girmiyor. `AttachmentRefDto` `key` taşıyor (T-031
 * onu böyle tasarlamıştı) ve imza, önbelleğin DIŞINDA, çizim anında üretiliyor.
 *
 * Yapısal olarak sağlanıyor ve `tests/unit/services/eklenti-r2.test.ts` bunu
 * bir kapıyla sabitliyor: önbellekli okuma yollarında `presign`/`url` geçmiyor.
 */

/** Panelde ve galeride görünen eklenti. `url` YOK — gerekçe yukarıda. */
export interface AttachmentDto {
  id: string;
  /** R2 nesne anahtarı. İmzalı adres bundan üretilir. */
  key: string;
  mime: string;
  size: number;
  /** Görsel değilse (PDF) ya da boyutu okunamıyorsa (AVIF/SVG) `null`. */
  width: number | null;
  height: number | null;
  entity: AttachmentEntity;
  entityId: string;
  order: number;
  createdAt: string;
}

/** Yükleme izni yanıtı — istemci bu adrese DOĞRUDAN PUT yapıyor. */
const ATTACHMENT_SELECT = {
  id: true,
  key: true,
  mime: true,
  size: true,
  width: true,
  height: true,
  entity: true,
  entityId: true,
  order: true,
  createdAt: true,
} as const;

interface AttachmentRow {
  id: string;
  key: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  entity: AttachmentEntity;
  entityId: string;
  order: number;
  createdAt: Date;
}

export interface AttachmentWriteClient {
  attachment: {
    findMany(args: {
      where: { entity: AttachmentEntity; entityId: string };
      select: typeof ATTACHMENT_SELECT;
      orderBy: ({ order: 'asc' } | { createdAt: 'asc' })[];
    }): Promise<AttachmentRow[]>;
    findUnique(args: {
      where: { id: string };
      select: typeof ATTACHMENT_SELECT;
    }): Promise<AttachmentRow | null>;
    create(args: {
      data: {
        key: string;
        mime: string;
        size: number;
        checksum: string;
        width: number | null;
        height: number | null;
        entity: AttachmentEntity;
        entityId: string;
        order: number;
        uploadedById: string | null;
      };
      select: typeof ATTACHMENT_SELECT;
    }): Promise<AttachmentRow>;
    delete(args: { where: { id: string } }): Promise<AttachmentRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. */
const _uyumYazma: AttachmentWriteClient = db;
void _uyumYazma;

function toDto(row: AttachmentRow): AttachmentDto {
  return {
    id: row.id,
    key: row.key,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    entity: row.entity,
    entityId: row.entityId,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Doğrulanan MIME'dan uzantı — İSTEMCİNİN dosya adından DEĞİL. */
const MIME_EXTENSIONS: Record<SniffedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

/**
 * R2 nesne anahtarı üretir.
 *
 * ⚠️ İSTEMCİNİN DOSYA ADI ANAHTARA HİÇ GİRMİYOR ve bu bir güvenlik kararı.
 * Dosya adı ziyaretçi girdisi; anahtara koymak iki kapıyı birden açardı:
 *   - YOL KAÇIŞI: `../../gizli/x.png` gibi bir ad bucket'ta başka bir yere yazar.
 *   - UZANTI YALANI: `.html`/`.svg` uzantısı, imzalı adresle açıldığında
 *     tarayıcıyı içeriği ÇALIŞTIRMAYA yöneltebilir.
 *
 * Anahtar tamamen bizim ürettiğimiz parçalardan kuruluyor: varlık türü,
 * varlık kimliği, rastgele bir kimlik ve DOĞRULANMIŞ mime'ın uzantısı.
 * `crypto.randomUUID` çakışma riskini pratikte sıfırlıyor; `key @unique` de
 * veritabanı tarafında son savunma.
 */
export function buildAttachmentKey(
  entity: AttachmentEntity,
  entityId: string,
  mime: SniffedMime,
  randomId: string = randomUUID(),
): string {
  return `${entity.toLowerCase()}/${entityId}/${randomId}.${MIME_EXTENSIONS[mime]}`;
}

export async function fetchAttachmentById(
  id: string,
  client: AttachmentWriteClient = db,
): Promise<AttachmentDto | null> {
  const row = await client.attachment.findUnique({ where: { id }, select: ATTACHMENT_SELECT });
  return row ? toDto(row) : null;
}

/** §8.11 — 15 dakikalık imzalı okuma adresi. Önbelleğe GİRMEZ (gerekçe yukarıda). */
/* ===========================================================================
 * §8.16 — YÜKLEME HIZ SINIRI SAYACI (T-061)
 * ======================================================================== */

/**
 * Sayaç bağlamları — denetim kaydının `diff.context` değeri, kodda SABİT
 * (`SHOWN_DIFF_VALUE_KEYS` beyaz listesindeki `context`, yani ekranda okunur).
 */
export const UPLOAD_CONTEXT = 'UPLOAD' as const;

/*
 * ADR-044 ÖNCESİNDE İKİ BAĞLAM VARDI (`UPLOAD_TICKET`, `UPLOAD_CONFIRM`): bilet
 * ve onay iki ayrı uçtu. Tek uç kaldı; tek bağlam. (Eski bağlamlı satırlar
 * denetim kaydında kalır ve SAYILMAZ — yeni bağlam adı, pencere 60 sn olduğu
 * için geçişte en fazla bir dakikalık bir sayım boşluğu demek.)
 */
export type UploadContext = typeof UPLOAD_CONTEXT;

export interface UploadRateClient {
  auditLog: {
    count(args: {
      where: {
        actorId: string;
        entity: 'Attachment';
        createdAt: { gte: Date };
        diff: { path: ['context']; equals: string };
      };
    }): Promise<number>;
  };
}

/**
 * Pencere içindeki yükleme çağrıları — `AuditLog`dan.
 *
 * SAYAÇ NEDEN DENETİM KAYDINDA (bellek değil): tek kullanıcılı, tek süreçli
 * bir uygulamada bellek de çalışırdı, ama yeniden başlatmada SIFIRLANIRDI ve
 * Coolify sağlık kontrolü düşen süreci yeniden başlatıyor (§13.6). Ayrıca
 * kalıp zaten var: TOTP ve şifre değiştirme sayaçları da `AuditLog`da
 * (T-015b/K1) — üçüncü bir mekanizma icat etmek yerine aynısı.
 */
export async function countRecentUploadCalls(
  actorId: string,
  context: UploadContext,
  since: Date,
  client: UploadRateClient = db,
): Promise<number> {
  return client.auditLog.count({
    where: {
      actorId,
      entity: 'Attachment',
      createdAt: { gte: since },
      diff: { path: ['context'], equals: context },
    },
  });
}

/* ===========================================================================
 * ADR-044 — AYNI KÖKENDEN YÜKLEME VE SUNUM
 * ======================================================================== */

/**
 * Herkese açık sunulabilen eklenti türleri. Diğerleri (makbuz, iş, müşteri)
 * yalnızca oturumla — `GET /api/v1/dosya/[id]`.
 *
 * ⚠️ VARSAYILAN REDDET: yeni bir `AttachmentEntity` değeri buraya eklenmeden
 * herkese açılmaz (ADR-034'ün beyaz liste polaritesi).
 */
export const PUBLIC_ATTACHMENT_ENTITIES: ReadonlySet<AttachmentEntity> = new Set<AttachmentEntity>([
  'PROFILE',
]);

/**
 * Polimorfik hedefin VAR OLDUĞUNU doğrular — ADR-018: "Polimorfik ilişkide FK
 * yok; bütünlük UYGULAMA KATMANINDA korunur." Kontrol olmasa, var olmayan bir
 * `entityId` ile açılan eklenti hiçbir galeri sorgusunda görünmeyen yetim bir
 * SATIR olurdu. `default` YOK: yeni bir tür eklenirse `tsc` burayı kırar.
 * (T-037'de eylemdeydi; ADR-044 ile route handler da kullandığı için servise
 * taşındı.)
 */
export async function attachmentTargetExists(
  entity: AttachmentEntity,
  entityId: string,
): Promise<boolean> {
  switch (entity) {
    case 'PROFILE':
      return (await db.profile.count({ where: { id: entityId } })) > 0;
  }
}

export type UploadRejection = 'EMPTY' | 'TOO_LARGE' | 'TYPE_NOT_ALLOWED';

export type StoreResult =
  | { ok: true; attachment: AttachmentDto; checksum: string }
  | { ok: false; reason: UploadRejection };

/**
 * Baytları DOĞRULAR, R2'ye yazar, satırı oluşturur — ADR-044.
 *
 * ⚠️ SIRA: DOĞRULA → R2 → DB. T-037'de doğrulama yazmadan SONRAYDI (tarayıcı
 * önce R2'ye yazıyordu) ve geçersiz bayt R2'de yetim kalabiliyordu. Artık
 * geçersiz bayt R2'ye HİÇ yazılmıyor.
 *
 * R2 → DB sırası korunuyor (T-037 gerekçesi: düşen DB yazımı GÖRÜNMEZ yetim
 * nesne bırakır; ters sıra GÖRÜNÜR kırık satır bırakırdı). DB düşerse nesne
 * HEMEN siliniyor (telafi, fırlatmaz) ve asıl hata yukarı fırlatılıyor.
 */
export async function storeAttachment(
  input: {
    bytes: Buffer;
    entity: AttachmentEntity;
    entityId: string;
    order: number;
    actorId: string;
  },
  deps: { client?: AttachmentWriteClient; r2?: R2Deps } = {},
): Promise<StoreResult> {
  const { bytes, entity, entityId, order, actorId } = input;
  const client = deps.client ?? db;

  if (bytes.length === 0) return { ok: false, reason: 'EMPTY' };
  // BOYUT BEYANDAN DEĞİL BAYTTAN (§8.11).
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: 'TOO_LARGE' };

  // TİP UZANTIDAN DEĞİL İÇERİKTEN (ADR-043: beş tipin hepsi sabit imzalı).
  const mime = sniffMime(bytes);
  if (mime === null || !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, reason: 'TYPE_NOT_ALLOWED' };
  }

  const olcu = readImageDimensions(bytes, mime);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const key = buildAttachmentKey(entity, entityId, mime);

  await putObject(key, bytes, mime, deps.r2);

  try {
    const row = await client.attachment.create({
      data: {
        key,
        mime,
        size: bytes.length,
        checksum,
        width: olcu?.width ?? null,
        height: olcu?.height ?? null,
        entity,
        entityId,
        order,
        uploadedById: actorId,
      },
      select: ATTACHMENT_SELECT,
    });
    return { ok: true, attachment: toDto(row), checksum };
  } catch (error) {
    await deleteObjectQuietly(key, deps.r2);
    throw error;
  }
}

export interface AttachmentServeDto {
  key: string;
  mime: string;
  size: number;
  checksum: string;
  entity: AttachmentEntity;
  entityId: string;
}

/** Sunum ucunun okuması — `checksum` ETag olarak kullanılıyor. */
export async function fetchAttachmentForServing(id: string): Promise<AttachmentServeDto | null> {
  return db.attachment.findUnique({
    where: { id },
    select: { key: true, mime: true, size: true, checksum: true, entity: true, entityId: true },
  });
}

/**
 * §8.16 — yükleme ucunun hız kapısı (T-061, ADR-044 ile tek uç). Sınır
 * aşıldıysa §7.2 zarfı, değilse `null` — ve İZİN VERİLEN çağrı sayaca yazılıyor.
 *
 * ⚠️ SIRA: say → karar ver → yaz. Reddedilen çağrı YAZILMIYOR: yazılsaydı
 * sınırdaki istemci her denemesiyle pencereyi kendi aleyhine uzatırdı.
 * ⚠️ Say-yaz yarışı kabul (T-061 gerekçesi): amaç kaynak tüketimini
 * sınırlamak, tam sayıya kilitlemek değil.
 */
export async function uploadRateGate(
  actorId: string,
  now: Date = new Date(),
): Promise<ApiFailure | null> {
  const sayi = await countRecentUploadCalls(actorId, UPLOAD_CONTEXT, uploadWindowStart(now));
  if (sayi >= UPLOAD_RATE_LIMIT.maxRequests) {
    return fail(
      'RATE_LIMITED',
      `Çok fazla yükleme isteği. Dakikada en fazla ${UPLOAD_RATE_LIMIT.maxRequests} dosya yüklenebilir; biraz bekleyip tekrar deneyin.`,
    );
  }

  await writeAuditLog(
    {
      actorId,
      action: 'CREATE',
      entity: 'Attachment',
      entityId: null,
      diff: { context: UPLOAD_CONTEXT },
    },
    db,
  );
  return null;
}

/**
 * Eklentinin SAHİBİ olan public içeriğin önbellek hedefi — T-037f.
 *
 * Profil fotoğrafı public ana sayfada; yükleme/silme sonrası `content:profile`
 * düşürülmezse yeni fotoğraf önbellek süresince görünmez, silinen fotoğraf
 * kırık bir kare olarak kalırdı.
 */
export async function attachmentOwnerCacheTargets(
  entity: AttachmentEntity,
  entityId: string,
): Promise<{ contentEntity: 'profile' } | null> {
  switch (entity) {
    case 'PROFILE': {
      const p = await db.profile.findUnique({ where: { id: entityId }, select: { id: true } });
      return p ? { contentEntity: 'profile' } : null;
    }
  }
}
