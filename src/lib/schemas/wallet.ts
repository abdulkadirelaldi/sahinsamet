import * as z from 'zod';

import { HARCAMA_KATEGORILERI } from '@/lib/harcama-kategorileri';

import { WalletAccountKind, WalletFlowKind, WalletFrequency, WalletUnit } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  decimalSchema,
  mediumTextSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/**
 * CÜZDAN şemaları (2026-10-30). Tutarlar METİN (en fazla 10 tam — `computeBaseAmount`ın
 * sınırı — ve 2 ondalık), sayıya çevrilmez (ADR-014/D). Formda virgül
 * yazılabilir; noktaya çevirmek istemcinin işi.
 */
const tutar = decimalSchema(10, 2);
const ad = shortTextSchema.min(1, { error: 'Ad zorunludur.' });
const birim = z.enum(WalletUnit, { error: 'Geçersiz birim.' });

export const walletAccountSchema = z.object({
  name: ad,
  kind: z.enum(WalletAccountKind, { error: 'Geçersiz hesap türü.' }).default('BANK'),
  unit: birim.default('TRY'),
  balance: tutar,
});
/*
 * ⚠️ `.partial()` DEĞİL: varsayılanları korur ve göndermeyen forma `unit: 'TRY'` ekler.
 * Altın hesabının adını düzenlemek onu TL hesabına çeviriyordu (2026-11-02).
 */
export const updateWalletAccountSchema = partialWithoutDefaults(walletAccountSchema).extend({
  id: cuidSchema,
});

export const walletDebtSchema = z
  .object({
    name: ad,
    lender: shortTextSchema.optional(),
    unit: birim.default('TRY'),
    totalAmount: tutar,
    remainingAmount: tutar,
    monthlyPayment: tutar.optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    endDate: dayDateSchema.optional(),
    note: mediumTextSchema.optional(),
  })
  .refine((d) => Number(d.remainingAmount) <= Number(d.totalAmount), {
    error: 'Kalan borç toplam borçtan büyük olamaz.',
    path: ['remainingAmount'],
  });
export const updateWalletDebtSchema = z
  .object({
    id: cuidSchema,
    name: ad.optional(),
    lender: shortTextSchema.nullable().optional(),
    totalAmount: tutar.optional(),
    remainingAmount: tutar.optional(),
    monthlyPayment: tutar.nullable().optional(),
    paymentDay: z.number().int().min(1).max(31).nullable().optional(),
    endDate: dayDateSchema.nullable().optional(),
    note: mediumTextSchema.nullable().optional(),
    isClosed: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.totalAmount === undefined ||
      d.remainingAmount === undefined ||
      Number(d.remainingAmount) <= Number(d.totalAmount),
    { error: 'Kalan borç toplam borçtan büyük olamaz.', path: ['remainingAmount'] },
  );

export const walletDebtPaymentSchema = z.object({
  debtId: cuidSchema,
  date: dayDateSchema,
  amount: tutar.refine((v) => Number(v) > 0, { error: 'Ödeme sıfırdan büyük olmalı.' }),
  note: shortTextSchema.optional(),
  hesapId: cuidSchema.optional(),
  /** Hesap başka birimdeyse hesaptan gerçekten çıkan tutar (hesabın biriminde). */
  hesapTutar: tutar
    .refine((v) => Number(v) > 0, { error: 'Tutar sıfırdan büyük olmalı.' })
    .optional(),
});

export const walletFlowSchema = z.object({
  kind: z.enum(WalletFlowKind),
  name: ad,
  counterparty: shortTextSchema.optional(),
  unit: birim.default('TRY'),
  amount: tutar,
  frequency: z.enum(WalletFrequency).default('MONTHLY'),
  day: z.number().int().min(1).max(31).optional(),
  date: dayDateSchema.optional(),
  category: shortTextSchema.optional(),
  note: mediumTextSchema.optional(),
  hesapId: cuidSchema.optional(),
});
export const updateWalletFlowSchema = partialWithoutDefaults(walletFlowSchema).extend({
  id: cuidSchema,
  hesapId: cuidSchema.nullable().optional(),
  counterparty: shortTextSchema.nullable().optional(),
  day: z.number().int().min(1).max(31).nullable().optional(),
  date: dayDateSchema.nullable().optional(),
  category: shortTextSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export type WalletAccountInput = z.infer<typeof walletAccountSchema>;
export type UpdateWalletAccountInput = z.infer<typeof updateWalletAccountSchema>;
export type WalletDebtInput = z.infer<typeof walletDebtSchema>;
export type UpdateWalletDebtInput = z.infer<typeof updateWalletDebtSchema>;
export type WalletDebtPaymentInput = z.infer<typeof walletDebtPaymentSchema>;
export type WalletFlowInput = z.infer<typeof walletFlowSchema>;
export type UpdateWalletFlowInput = z.infer<typeof updateWalletFlowSchema>;

/* Hızlı ekleme (2026-10-30) — panelin "+" düğmesi. */

/** Hazır harcama kategorileri — bütçe ve dağılım bunlarla gruplanır. */
export { HARCAMA_KATEGORILERI };

export const walletTransferSchema = z
  .object({
    kaynakId: cuidSchema,
    hedefId: cuidSchema,
    amount: tutar.refine((v) => Number(v) > 0, { error: 'Tutar sıfırdan büyük olmalı.' }),
    gun: dayDateSchema,
    note: shortTextSchema.optional(),
  })
  .refine((d) => d.kaynakId !== d.hedefId, {
    error: 'Kaynak ve hedef hesap aynı olamaz.',
    path: ['hedefId'],
  });
export type WalletTransferInput = z.infer<typeof walletTransferSchema>;

export const hizliHarcamaSchema = z.object({
  tutar: tutar.refine((v) => Number(v) > 0, { error: 'Tutar sıfırdan büyük olmalı.' }),
  ne: ad,
  kategori: z.enum(HARCAMA_KATEGORILERI).default('Diğer'),
  hesapId: cuidSchema.optional(),
});
export type HizliHarcamaInput = z.infer<typeof hizliHarcamaSchema>;

export const butceSchema = z.object({
  kategori: z.enum(HARCAMA_KATEGORILERI),
  /** `null` = limiti kaldır. */
  limitTl: tutar.nullable(),
});
export type ButceInput = z.infer<typeof butceSchema>;

/** Aylık ödeme onayı (2026-11-01). Tutar burada YOK: sunucu kaynaktan okur. */
export const odemeIsleSchema = z.object({
  kaynakTur: z.enum(['BORC', 'AKIS']),
  kaynakId: cuidSchema,
  donem: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  durum: z.enum(['ODENDI', 'ATLANDI']),
  hesapId: cuidSchema.optional(),
});
export type OdemeIsleInput = z.infer<typeof odemeIsleSchema>;

export const odemeGeriAlSchema = odemeIsleSchema.pick({
  kaynakTur: true,
  kaynakId: true,
  donem: true,
});
export type OdemeGeriAlInput = z.infer<typeof odemeGeriAlSchema>;
