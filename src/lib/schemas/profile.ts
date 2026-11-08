import * as z from 'zod';

import {
  cuidSchema,
  emailSchema,
  longTextSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/**
 * `Profile` (ADR-017) — tekil kayıt, sabit `id: "singleton"`.
 *
 * Public ana sayfa baştan sona bu kayıttan çizilir: ad (sabit), tanıtım satırı
 * (`headline`), kısa paragraf (`bio`), konum ve sosyal bağlantılar.
 *
 * `socials` SERBEST JSON DEĞİLDİR: aşağıdaki şema onu açıkça bağlar. Serbest
 * bırakılsaydı public sayfada beklenmedik anahtarlar render edilir ve §8.8'in
 * "her girdi doğrulanır" kuralı Json alanının içinde delinmiş olurdu.
 */

/**
 * SOSYAL AĞLAR — anahtar, görünen ad ve kabul edilen alan adları.
 *
 * Sıra = sayfadaki sıra. `alanAdlari` boşsa (web sitesi) her http(s) adresi
 * kabul edilir; doluysa adres o platformun alan adında (ya da alt alan adında)
 * olmak zorunda — `instagram` alanına yanlışlıkla başka bir site yapıştırmak
 * kayıtta yakalanır, ziyaretçiye yanlış etiketli bağlantı olarak gitmez.
 */
export const SOSYAL_AGLAR = [
  { anahtar: 'instagram', etiket: 'Instagram', alanAdlari: ['instagram.com'] },
  { anahtar: 'x', etiket: 'X', alanAdlari: ['x.com', 'twitter.com'] },
  { anahtar: 'linkedin', etiket: 'LinkedIn', alanAdlari: ['linkedin.com'] },
  { anahtar: 'youtube', etiket: 'YouTube', alanAdlari: ['youtube.com', 'youtu.be'] },
  { anahtar: 'tiktok', etiket: 'TikTok', alanAdlari: ['tiktok.com'] },
  { anahtar: 'github', etiket: 'GitHub', alanAdlari: ['github.com'] },
  { anahtar: 'website', etiket: 'Web sitesi', alanAdlari: [] },
] as const satisfies ReadonlyArray<{
  anahtar: string;
  etiket: string;
  alanAdlari: readonly string[];
}>;

export type SosyalAg = (typeof SOSYAL_AGLAR)[number]['anahtar'];

/** Adresin ana makinesi verilen alan adlarından biri ya da onların alt alan adı mı. */
export function alanAdiUyuyorMu(adres: string, alanAdlari: readonly string[]): boolean {
  if (alanAdlari.length === 0) return true;
  let host: string;
  try {
    host = new URL(adres).hostname.toLowerCase();
  } catch {
    return false;
  }
  return alanAdlari.some((alan) => host === alan || host.endsWith(`.${alan}`));
}

/**
 * Tek bir sosyal bağlantı adresi: http(s), en çok 2048 karakter, kullanıcı
 * adı/şifre içermeyen ve (tanımlıysa) platformun alan adında.
 *
 * `javascript:` / `data:` da geçerli URL'dir; burada protokol kontrolüyle
 * reddediliyor — bağlantı olarak basılan alana giremezler.
 */
function sosyalAdresSemasi(etiket: string, alanAdlari: readonly string[]) {
  return z
    .string()
    .trim()
    .max(2048, { error: 'Bağlantı adresi çok uzun.' })
    .pipe(z.url({ error: `${etiket} için geçerli bir adres girin (https:// ile).` }))
    .refine((v) => /^https?:\/\//i.test(v), {
      error: 'Bağlantı adresi http:// ya da https:// ile başlamalı.',
    })
    .refine(
      (v) => {
        try {
          const u = new URL(v);
          return u.username === '' && u.password === '';
        } catch {
          return false;
        }
      },
      { error: 'Adres kullanıcı adı ya da şifre içeremez.' },
    )
    .refine((v) => alanAdiUyuyorMu(v, alanAdlari), {
      error: `Bu bir ${etiket} adresi değil (${alanAdlari.join(' / ')}).`,
    });
}

/**
 * E-posta: düz adres saklanır, sayfada `mailto:` bağlantısına çevrilir.
 * Kullanıcı `mailto:` önekiyle yapıştırırsa önek atılır.
 */
const sosyalEpostaSemasi = z
  .string()
  .trim()
  .transform((v) => v.replace(/^mailto:/i, ''))
  .pipe(emailSchema);

const sosyalShape = Object.fromEntries(
  SOSYAL_AGLAR.map(({ anahtar, etiket, alanAdlari }) => [
    anahtar,
    sosyalAdresSemasi(etiket, alanAdlari).optional(),
  ]),
) as { [K in SosyalAg]: z.ZodOptional<ReturnType<typeof sosyalAdresSemasi>> };

export const socialsSchema = z
  .object({ ...sosyalShape, email: sosyalEpostaSemasi.optional() })
  // Bilinmeyen anahtar sessizce düşmez, HATA verir — yazım hatası fark edilsin.
  .strict();

const profileBase = z.object({
  headline: shortTextSchema.min(1, { error: 'Tanıtım satırı zorunludur.' }),
  bio: longTextSchema.max(2000, { error: 'Tanıtım metni en fazla 2000 karakter.' }),
  /** `null` = temizle (boşaltılan alan), `undefined` = dokunma (T-031 kuralı). */
  location: shortTextSchema.nullable().optional(),
  /** Bağlantıların TAMAMI — gönderildiğinde eski nesnenin yerine geçer. */
  socials: socialsSchema.optional(),
  /** `null` = fotoğrafı kaldır. */
  avatarAttachmentId: cuidSchema.nullable().optional(),
});

export const createProfileSchema = profileBase;
export const updateProfileSchema = partialWithoutDefaults(profileBase);

export type Socials = z.infer<typeof socialsSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Veritabanındaki `socials` JSON'unu OKUMA yolunda süzer: her anahtar kendi
 * şemasından tek tek geçirilir, geçmeyen (bozuk, bilinmeyen, eski biçim) düşer.
 * Kayıt bütünüyle reddedilmez — tek bozuk bağlantı yüzünden sayfa boş kalmasın.
 */
export function socialsOku(ham: unknown): Socials {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return {};
  const kaynak = ham as Record<string, unknown>;
  const sonuc: Record<string, string> = {};
  for (const [anahtar, sema] of Object.entries(socialsSchema.shape)) {
    const deger = kaynak[anahtar];
    if (typeof deger !== 'string' || deger.trim() === '') continue;
    const parsed = sema.safeParse(deger);
    if (parsed.success && typeof parsed.data === 'string') sonuc[anahtar] = parsed.data;
  }
  return sonuc as Socials;
}
