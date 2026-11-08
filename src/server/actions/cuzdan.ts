'use server';

import {
  butceSchema,
  odemeGeriAlSchema,
  odemeIsleSchema,
  entityIdSchema,
  updateWalletAccountSchema,
  updateWalletDebtSchema,
  updateWalletFlowSchema,
  walletAccountSchema,
  walletDebtPaymentSchema,
  walletDebtSchema,
  walletFlowSchema,
} from '@/lib/schemas';
import { walletTransferSchema } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import {
  addDebtPayment,
  archiveWalletAccount,
  deleteDebtPayment,
  restoreWalletAccount,
  sonlandirWalletFlow,
  yenidenBaslatWalletFlow,
  butceKoy,
  createWalletAccount,
  createWalletDebt,
  createWalletFlow,
  createWalletTransfer,
  deleteWalletTransfer,
  deleteWalletDebt,
  deleteWalletFlow,
  OdemeHatasi as CuzdanHatasi,
  updateWalletAccount,
  updateWalletDebt,
  updateWalletFlow,
} from '@/server/services/cuzdan';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { odemeGeriAl, odemeIsle, OdemeHatasi } from '@/server/services/odeme-onay';
import type { AuditAction } from '@/types';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * CÜZDAN EYLEMLERİ (2026-10-30). Hepsi aynı kalıp: oturum + yazma kapısı
 * (`currentActorId`) ve Zod HER EYLEMİN İLK SATIRLARINDA (§8.6/§8.8 kapısı
 * yardımcının içine bakmıyor), sonra servis + DENETİM KAYDI (`kaydet`).
 *
 * ⚠️ Denetim farkına TUTAR YAZILMIYOR: bakiye ve borç kişisel finans verisi;
 * denetim "ne değişti"yi söylesin, "ne kadar"ı değil (sağlık kaydıyla aynı
 * karar, `actions/health-log.ts`).
 */

/** Servisi çalıştırır, denetim kaydını yazar; tutar YAZMAZ (yalnızca alan adları). */
async function kaydet<T>(
  actorId: string,
  alanlar: object,
  denetim: { action: AuditAction; entity: string; kimlik: (sonuc: T) => string },
  is: () => Promise<T>,
  etiket: string,
): Promise<ApiResponse<T>> {
  try {
    const sonuc = await is();
    await writeAuditLog(
      {
        actorId,
        action: denetim.action,
        entity: denetim.entity,
        entityId: denetim.kimlik(sonuc),
        diff: { alanlar: Object.keys(alanlar).filter((k) => k !== 'id') },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof CuzdanHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure(etiket, error);
  }
}

export async function createWalletAccountAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(walletAccountSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'CREATE', entity: 'WalletAccount', kimlik: (s) => s.id },
    () => createWalletAccount(v),
    'wallet:account:create',
  );
}

export async function updateWalletAccountAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(updateWalletAccountSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletAccount', kimlik: () => v.id },
    () => updateWalletAccount(v),
    'wallet:account:update',
  );
}

export async function archiveWalletAccountAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'ARCHIVE', entity: 'WalletAccount', kimlik: () => v.id },
    () => archiveWalletAccount(v.id),
    'wallet:account:archive',
  );
}

export async function createWalletDebtAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(walletDebtSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'CREATE', entity: 'WalletDebt', kimlik: (s) => s.id },
    () => createWalletDebt(v),
    'wallet:debt:create',
  );
}

export async function updateWalletDebtAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(updateWalletDebtSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletDebt', kimlik: () => v.id },
    () => updateWalletDebt(v),
    'wallet:debt:update',
  );
}

export async function deleteWalletDebtAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'DELETE', entity: 'WalletDebt', kimlik: () => v.id },
    () => deleteWalletDebt(v.id),
    'wallet:debt:delete',
  );
}

export async function addDebtPaymentAction(
  raw: unknown,
): Promise<ApiResponse<{ remainingAmount: string; isClosed: boolean }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(walletDebtPaymentSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  try {
    const sonuc = await addDebtPayment(v);
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'WalletDebtPayment',
        entityId: v.debtId,
        diff: { hesaptan: Boolean(v.hesapId) },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof OdemeHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure('wallet:debt:payment', error);
  }
}

export async function deleteDebtPaymentAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id } = parsed.data;
  try {
    await deleteDebtPayment(id);
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'WalletDebtPayment', entityId: id },
      db,
    );
    return ok({ id });
  } catch (error) {
    if (error instanceof OdemeHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure('wallet:debt:payment:delete', error);
  }
}

export async function restoreWalletAccountAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletAccount', kimlik: () => v.id },
    () => restoreWalletAccount(v.id),
    'wallet:account:restore',
  );
}

export async function sonlandirWalletFlowAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletFlow', kimlik: () => v.id },
    () => sonlandirWalletFlow(v.id),
    'wallet:flow:end',
  );
}

export async function yenidenBaslatWalletFlowAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletFlow', kimlik: () => v.id },
    () => yenidenBaslatWalletFlow(v.id),
    'wallet:flow:restart',
  );
}

export async function createWalletFlowAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(walletFlowSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'CREATE', entity: 'WalletFlow', kimlik: (s) => s.id },
    () => db.$transaction((tx) => createWalletFlow(v, tx)),
    'wallet:flow:create',
  );
}

export async function updateWalletFlowAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(updateWalletFlowSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'UPDATE', entity: 'WalletFlow', kimlik: () => v.id },
    () => updateWalletFlow(v),
    'wallet:flow:update',
  );
}

export async function deleteWalletFlowAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'DELETE', entity: 'WalletFlow', kimlik: () => v.id },
    () => deleteWalletFlow(v.id),
    'wallet:flow:delete',
  );
}

export async function createWalletTransferAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(walletTransferSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'CREATE', entity: 'WalletTransfer', kimlik: (s) => s.id },
    () => createWalletTransfer(v),
    'wallet:transfer:create',
  );
}

export async function deleteWalletTransferAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    v,
    { action: 'DELETE', entity: 'WalletTransfer', kimlik: () => v.id },
    async () => {
      await deleteWalletTransfer(v.id);
      return { id: v.id };
    },
    'wallet:transfer:delete',
  );
}

/** Aylık bütçe limiti (2026-10-31). Denetime tutar yazılmaz; kategori ve yön yazılır. */
export async function butceKoyAction(raw: unknown): Promise<ApiResponse<{ kategori: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(butceSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { kategori, limitTl } = parsed.data;

  return kaydet(
    actorId,
    { kategori },
    {
      action: limitTl === null ? 'DELETE' : 'UPDATE',
      entity: 'WalletButce',
      kimlik: () => kategori,
    },
    async () => {
      await butceKoy(kategori, limitTl);
      return { kategori };
    },
    'wallet:butce',
  );
}

/** Aylık ödeme onayı (2026-11-01). Denetime tutar yazılmaz. */
export async function odemeGeriAlAction(
  raw: unknown,
): Promise<ApiResponse<{ geriAlindi: boolean }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(odemeGeriAlSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const girdi = parsed.data;

  try {
    const sonuc = await odemeGeriAl(girdi);
    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'WalletOdeme',
        entityId: girdi.kaynakId,
        diff: { tur: girdi.kaynakTur, donem: girdi.donem, geriAlindi: sonuc.geriAlindi },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    return toFailure('wallet:odeme-geri-al', error);
  }
}

export async function odemeIsleAction(raw: unknown): Promise<ApiResponse<{ yeni: boolean }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(odemeIsleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const girdi = parsed.data;

  try {
    const sonuc = await odemeIsle(girdi);
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'WalletOdeme',
        entityId: girdi.kaynakId,
        diff: { tur: girdi.kaynakTur, donem: girdi.donem, durum: girdi.durum, yeni: sonuc.yeni },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof OdemeHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure('wallet:odeme', error);
  }
}
