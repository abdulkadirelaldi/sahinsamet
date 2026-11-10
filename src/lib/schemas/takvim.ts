import * as z from 'zod';

import { gecerliGun } from '@/lib/takvim/bicim';
import { EN_COK_HATIRLATMA, EN_UZUN_HATIRLATMA_DK } from '@/lib/takvim/hatirlatma';
import { haftaninGunu } from '@/lib/takvim/tekrar';
import { differenceInAppDays } from '@/server/services/_shared/app-date';
import { TakvimKategori, TakvimTekrar } from '@/types';

import { cuidSchema, dayDateSchema } from './common';

/**
 * TAKVİM (2026-11-10) — etkinlik formu. Tarih + duvar saati ayrı alanlar (`YYYY-MM-DD`, `HH:MM`):
 * form İstanbul saatinde düşünür; ana çeviri sunucuda `appWallClockInstant` ile yapılır.
 *
 * Sınırlar: en çok 5 hatırlatma, en uzun 4 hafta önce; tekrar aralığı 1–99, en çok 730 oluşum.
 * Etkinlik en çok 366 gün, tekrarlayan etkinlik en çok 31 gün sürebilir (her oluşum bir sonrakine
 * binmesin diye kabaca bir tavan; günlük tekrarda zaten 1 gün).
 */

/** `z.iso.date` biçimi doğruluyor ama 30 Şubat'ı kabul ediyor (ölçüldü) — takvim kontrolü ayrıca. */
const gunSchema = dayDateSchema.refine((g) => gecerliGun(g) !== null, {
  error: 'Takvimde olmayan bir gün.',
});

const saatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Saat SS:DD biçiminde olmalı.' });

const bosMetin = (en: number, mesaj: string) =>
  z
    .string()
    .trim()
    .max(en, { error: mesaj })
    .nullish()
    .transform((v) => (v ? v : null));

export const takvimTekrarSchema = z
  .object({
    tur: z.enum(TakvimTekrar),
    aralik: z
      .number()
      .int()
      .min(1, { error: 'Aralık en az 1.' })
      .max(99, { error: 'Aralık en çok 99.' }),
    gunler: z
      .array(z.number().int().min(1).max(7))
      .max(7)
      .transform((g) => [...new Set(g)].sort((a, b) => a - b)),
    bitisGun: gunSchema.nullable(),
    sayi: z
      .number()
      .int()
      .min(1, { error: 'En az 1 kez.' })
      .max(730, { error: 'En çok 730 kez.' })
      .nullable(),
  })
  .refine((k) => k.bitisGun === null || k.sayi === null, {
    error: 'Bitiş tarihi ya da tekrar sayısı — ikisinden biri.',
    path: ['sayi'],
  });

export type TakvimTekrarGirdisi = z.infer<typeof takvimTekrarSchema>;

const etkinlikNesnesi = z.object({
  baslik: z
    .string()
    .trim()
    .min(1, { error: 'Başlık gerekli.' })
    .max(120, { error: 'Başlık en çok 120 karakter.' }),
  aciklama: bosMetin(2000, 'Açıklama en çok 2000 karakter.'),
  konum: bosMetin(200, 'Konum en çok 200 karakter.'),
  kategori: z.enum(TakvimKategori),
  tumGun: z.boolean(),
  baslangicGun: gunSchema,
  baslangicSaat: saatSchema,
  bitisGun: gunSchema,
  bitisSaat: saatSchema,
  tekrar: takvimTekrarSchema,
  hatirlatmalar: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(EN_UZUN_HATIRLATMA_DK, { error: 'Hatırlatma en çok 4 hafta önce olabilir.' }),
    )
    .transform((h) => [...new Set(h)].sort((a, b) => a - b))
    .refine((h) => h.length <= EN_COK_HATIRLATMA, {
      error: `En çok ${EN_COK_HATIRLATMA} hatırlatma.`,
    }),
});

type EtkinlikHam = z.infer<typeof etkinlikNesnesi>;

/** Çapraz alan kuralları — oluşturma ve güncelleme aynı. */
function etkinlikKurallari(v: EtkinlikHam, ctx: z.RefinementCtx): void {
  // Alan hatası varken de çağrılıyor (Zod 4): bozuk gün aritmetiğe girmesin, alan hatası yeter.
  if (!gecerliGun(v.baslangicGun) || !gecerliGun(v.bitisGun)) return;
  const bas = `${v.baslangicGun}T${v.tumGun ? '00:00' : v.baslangicSaat}`;
  const son = `${v.bitisGun}T${v.tumGun ? '00:00' : v.bitisSaat}`;
  if (son < bas) {
    ctx.addIssue({
      code: 'custom',
      message: 'Bitiş başlangıçtan önce olamaz.',
      path: [v.bitisGun < v.baslangicGun ? 'bitisGun' : 'bitisSaat'],
    });
    return;
  }
  const gun = differenceInAppDays(v.baslangicGun, v.bitisGun);
  const tavan = v.tekrar.tur === 'YOK' ? 366 : 31;
  if (gun > tavan) {
    ctx.addIssue({
      code: 'custom',
      message:
        v.tekrar.tur === 'YOK'
          ? 'Etkinlik en çok bir yıl sürebilir.'
          : 'Tekrarlayan etkinlik en çok 31 gün sürebilir.',
      path: ['bitisGun'],
    });
  }
  if (v.tekrar.bitisGun !== null && v.tekrar.bitisGun < v.baslangicGun) {
    ctx.addIssue({
      code: 'custom',
      message: 'Tekrarın bitişi başlangıçtan önce olamaz.',
      path: ['tekrar', 'bitisGun'],
    });
  }
}

/** HAFTALIK ve gün seçilmediyse başlangıcın günü. */
function gunleriTamamla<T extends EtkinlikHam>(v: T): T {
  if (v.tekrar.tur !== 'HAFTALIK' || v.tekrar.gunler.length > 0) return v;
  return { ...v, tekrar: { ...v.tekrar, gunler: [haftaninGunu(v.baslangicGun)] } };
}

export const takvimEtkinligiSchema = etkinlikNesnesi
  .superRefine(etkinlikKurallari)
  .transform(gunleriTamamla);
export type TakvimEtkinligiGirdisi = z.infer<typeof takvimEtkinligiSchema>;

/**
 * Tekrarlayan etkinlikte değişikliğin KAPSAMI: yalnızca bu oluşum, bu ve sonrakiler, tümü.
 * Tekrarlamayan etkinlikte yalnızca `tum` anlamlı; servis öbürlerini de `tum` sayar.
 */
export const TAKVIM_KAPSAMLARI = ['tek', 'sonraki', 'tum'] as const;
export type TakvimKapsami = (typeof TAKVIM_KAPSAMLARI)[number];

const kapsamAlanlari = {
  id: cuidSchema,
  kapsam: z.enum(TAKVIM_KAPSAMLARI),
  /** Tıklanan oluşumun günü — kapsam `tum` iken de saat kaydırmanın referansı. */
  olusumGun: gunSchema,
};

export const takvimGuncelleSchema = etkinlikNesnesi
  .extend(kapsamAlanlari)
  .superRefine(etkinlikKurallari)
  .transform(gunleriTamamla);
export type TakvimGuncelleGirdisi = z.infer<typeof takvimGuncelleSchema>;

export const takvimSilSchema = z.object(kapsamAlanlari);
export type TakvimSilGirdisi = z.infer<typeof takvimSilSchema>;
