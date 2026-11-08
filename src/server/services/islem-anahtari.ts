import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';

/**
 * TEK KEZ ÇALIŞTIRMA (2026-10-31) — hızlı kayıt tekrar önleme.
 *
 * Zayıf şebekede istek sunucuya ulaşıp YANITI kaybolabilir; istemci kaydı
 * kuyruğa alır ve yeniden gönderir. Anahtar işle AYNI işlemde yazılır:
 * - iş başarılı → anahtar kalıcı; aynı anahtarla ikinci çağrı işi çalıştırmaz.
 * - iş başarısız → ikisi de geri alınır; yeniden deneme normal çalışır.
 * Eşzamanlı iki çağrıda birincil anahtar ihlali (P2002) kazananı belirler.
 *
 * ⚠️ P2002 HER ZAMAN "işlendi" DEMEK DEĞİL: günün ilk su ve kilo kayıtları aynı anda
 * gelirse `health_log.date` de çakışır. Anahtar yazılmamışsa kayıt yapılmamıştır;
 * bir kez daha denenir. Artık o gün satırı var, ikinci deneme güncellemeye düşer.
 *
 * @returns işin sonucu; anahtar DAHA ÖNCE işlendiyse `null`.
 */
export async function birKez<T>(
  anahtar: string | undefined,
  is: (tx: Prisma.TransactionClient) => Promise<T>,
  client: Pick<typeof db, '$transaction' | 'islemAnahtari'> = db,
): Promise<T | null> {
  const dene = () =>
    client.$transaction(async (tx) => {
      if (anahtar) await tx.islemAnahtari.create({ data: { anahtar } });
      return is(tx);
    });
  try {
    return await dene();
  } catch (error) {
    if (!anahtar || (error as { code?: unknown }).code !== 'P2002') throw error;
    const islendi = await client.islemAnahtari.findUnique({ where: { anahtar } });
    if (islendi) return null;
    return dene();
  }
}
