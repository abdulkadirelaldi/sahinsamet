import { db } from '@/server/db';

import { purgeLoginAttemptsBefore } from '../auth/login-attempt';

const GUN_MS = 24 * 60 * 60_000;
/** ADR-013: giriş denemeleri (IP dahil) 90 gün saklanır. */
const GIRIS_DENEMESI_GUN = 90;
/** İşlem anahtarı yalnızca yeniden denemeyi yakalar; bir ay fazlasıyla yeter. */
const ISLEM_ANAHTARI_GUN = 30;

/** Günlük temizlik (2026-11-02): tablolar paylaşılan diskte sınırsız büyümesin. */
export async function gunlukTemizlik(simdi: Date = new Date()): Promise<void> {
  await purgeLoginAttemptsBefore(new Date(simdi.getTime() - GIRIS_DENEMESI_GUN * GUN_MS));
  await db.islemAnahtari.deleteMany({
    where: { createdAt: { lt: new Date(simdi.getTime() - ISLEM_ANAHTARI_GUN * GUN_MS) } },
  });
}
