import { socialsOku, type UpdateProfileInput } from '@/lib/schemas/profile';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import { ATTACHMENT_SELECT, toAttachmentRef, type AttachmentRow } from './_shared';
import type { ProfileDto } from './content-dto';

/**
 * `Profile` servisi — tekil kayıt (ADR-017), T-015 konvansiyonu.
 */

interface ProfileRow {
  id: string;
  headline: string;
  bio: string;
  location: string | null;
  socials: unknown;
  avatar: AttachmentRow | null;
}

/**
 * İstemci tipi PRISMA'DAN TÜRETİLİYOR, elle yazılmıyor.
 *
 * Elle yazılmış bir imza (`select: Record<string, unknown>`) Prisma'nın
 * `SelectSubset` jenerikleriyle yapısal olarak uyuşmuyor ve `db` atanamıyor —
 * T-013c'de `LockoutClient` ile aynı duvara çarpılmıştı. `Pick` ile türetmek
 * hem gerçek tip güvenliğini korur hem de testte sahte istemci enjekte etmeye
 * engel değildir (`as unknown as ProfileClient`).
 */
export type ProfileClient = Pick<PrismaClient, 'profile'>;

/** Tekil kaydın sabit kimliği (ADR-017). */
export const PROFILE_ID = 'singleton';

const PROFILE_SELECT = {
  id: true,
  headline: true,
  bio: true,
  location: true,
  socials: true,
  avatar: { select: ATTACHMENT_SELECT },
} as const;

function toDto(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    /**
     * `socials` şemada serbest `Json`; veritabanı şekli zorlamaz. Okuma yolunda
     * `socialsOku` her anahtarı kendi şemasından geçiriyor — bozuk ya da
     * bilinmeyen anahtar public sayfaya ulaşmadan düşer.
     */
    socials: socialsOku(row.socials),
    avatar: toAttachmentRef(row.avatar),
  };
}

/**
 * Profili okur. Ham (önbelleksiz) sürüm — testler ve F3 mutasyonları bunu kullanır.
 *
 * BULUNAMAZSA FIRLATIR, sessiz `null` DÖNMEZ. `Profile` seed ile açılan tekil
 * bir kayıttır (ADR-017); yokluğu bir "boş durum" değil, kurulum hatasıdır.
 * `null` dönseydi public sayfa boş başlıkla render edilir ve sorun ancak
 * kullanıcı fark ettiğinde anlaşılırdı.
 */
export async function fetchProfile(client: ProfileClient = db): Promise<ProfileDto> {
  const row = await client.profile.findUnique({
    where: { id: PROFILE_ID },
    select: PROFILE_SELECT,
  });

  if (!row) {
    throw new Error('Profil kaydı bulunamadı. Seed çalıştırıldı mı? (pnpm db:seed)');
  }

  return toDto(row);
}

/* ===========================================================================
 * YAZMA YOLU — T-031
 * ======================================================================== */

/**
 * Profili yazar — TEKİL KAYIT, `upsert` (ADR-017).
 *
 * NEDEN `create`/`update` AYRIMI YOK: `Profile` tek satırdır ve
 * seed ile açılır. Panelde "yeni profil oluştur" diye bir eylem yoktur; kullanıcı
 * yalnızca kaydeder. İki ayrı eylem sunmak, olmayan bir seçimi kullanıcıya
 * sorardı — ve "önce oluştur mu güncelle mi" kararını her form gönderiminde
 * istemciye taşırdı.
 *
 * `upsert`in ikinci faydası: seed çalıştırılmamış bir kurulumda kaydetmek
 * `RecordNotFound` ile patlamak yerine kaydı açar.
 *
 * KISMİ GÜNCELLEME: `update` tarafında yalnızca gönderilen alanlar yazılır
 * (bkz. `updateProject`); `create` tarafında zorunlu alanlar eksikse Prisma
 * hata verir — bu doğru, çünkü var olmayan bir kaydı kısmi veriyle açmak
 * yarım bir profil üretirdi.
 */
export async function upsertProfile(
  input: UpdateProfileInput,
  client: ProfileClient = db,
): Promise<ProfileDto> {
  const patch = {
    ...(input.headline !== undefined ? { headline: input.headline } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.location !== undefined ? { location: input.location ?? null } : {}),
    ...(input.socials !== undefined ? { socials: input.socials } : {}),
    ...(input.avatarAttachmentId !== undefined
      ? { avatarAttachmentId: input.avatarAttachmentId ?? null }
      : {}),
  };

  const row = await client.profile.upsert({
    where: { id: PROFILE_ID },
    update: patch,
    create: { id: PROFILE_ID, headline: '', bio: '', ...patch },
    select: PROFILE_SELECT,
  });

  return toDto(row);
}

/** Mutasyon öncesi anlık görüntü — `AuditLog` farkı için. Yoksa `null`. */
export async function findProfileSnapshot(client: ProfileClient = db): Promise<ProfileDto | null> {
  const row = await client.profile.findUnique({
    where: { id: PROFILE_ID },
    select: PROFILE_SELECT,
  });
  return row ? toDto(row) : null;
}
