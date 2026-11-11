import { hatirlatmaMetni, vadesiGelenler } from '@/lib/takvim/hatirlatma';
import { db } from '@/server/db';

import { appDayToDate, toAppDay } from './_shared';
import { kullaniciyaGonder, vapidAyarlari } from './bildirim';
import { fetchHatirlatmaliEtkinlikler } from './takvim';

/**
 * TAKVİM HATIRLATMA TURU (2026-11-10) — `instrumentation-node.ts` her dakika çağırır.
 *
 * NEDEN AYRI TUR: genel bildirim turu (`bildirimTuru`) 5 dakikada bir koşuyor ve her turda Cüzdan,
 * alışkanlık, sağlık okuyor. "14:30'a 15 dk kala" hatırlatması 5 dakikaya kadar geç gelirdi; o
 * turu dakikaya indirmek ağır sorguları beş kat koşturmak olurdu. Bu tur YALNIZCA takvimi okur.
 *
 * Tekrar önleme genel turla AYNI mekanizma: önce `bildirim_kaydi` satırı (tür `takvim`, anahtar
 * etkinlik + oluşum başlangıcı + öncelik, gün = hatırlatma ANININ günü). Eşsizlik ihlali = zaten
 * gönderildi. Hiçbir cihaza ulaşmazsa satır silinir; tolerans penceresi (15 dk) içinde sonraki
 * dakika yeniden dener. Pencere dışında kalan hatırlatma GÖNDERİLMEZ — sunucu kapalı kaldıysa
 * eski hatırlatmalar yığılıp gelmez.
 */
export async function takvimHatirlatmaTuru(simdi: Date = new Date()): Promise<number> {
  const vapid = vapidAyarlari();
  if (!vapid) return 0;

  const aboneler = await db.pushAbonelik.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });
  if (aboneler.length === 0) return 0;
  const kapali = new Set(
    (
      await db.bildirimTercihi.findMany({
        where: { userId: { in: aboneler.map((a) => a.userId) }, takvim: false },
        select: { userId: true },
      })
    ).map((t) => t.userId),
  );
  const kullanicilar = aboneler.map((a) => a.userId).filter((id) => !kapali.has(id));
  if (kullanicilar.length === 0) return 0;

  const vadesi = vadesiGelenler(await fetchHatirlatmaliEtkinlikler(simdi), simdi);
  let gonderilen = 0;
  for (const userId of kullanicilar) {
    for (const v of vadesi) {
      const kayit = await db.bildirimKaydi
        .create({
          data: {
            tur: 'takvim',
            anahtar: `${userId}:${v.anahtar}`,
            gun: appDayToDate(toAppDay(v.an)),
          },
        })
        .catch((error: unknown) => {
          if ((error as { code?: string }).code === 'P2002') return null;
          throw error;
        });
      if (!kayit) continue;
      const ulasan = await kullaniciyaGonder(
        userId,
        { ...hatirlatmaMetni(v.etkinlik, v.olusum, simdi), tur: 'takvim', anahtar: v.anahtar },
        vapid,
      );
      gonderilen += ulasan;
      if (ulasan === 0) await db.bildirimKaydi.delete({ where: { id: kayit.id } });
    }
  }
  return gonderilen;
}
