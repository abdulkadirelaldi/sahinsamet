import { createHash } from 'node:crypto';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';

/**
 * HATA İZLEME (2026-10-31) — panelde bir şey ters gidince sahibi söylemeden
 * görülebilsin. Kaynaklar: sunucu (`instrumentation.ts` → `onRequestError`),
 * ekran (panel hata sınırı → `istemciHatasiAction`) ve içerik (İngilizce dersinde
 * "Bu soruda hata var" → `ingilizceHataBildirAction`).
 *
 * KİŞİSEL VERİ TUTULMAZ: mesajın yalnızca ilk satırı, 300 karaktere kısaltılmış;
 * e-posta ve 6+ haneli sayılar maskelenir (kart, telefon, kimlik); yoldan sorgu
 * dizesi atılır. Aynı hata İMZASIYLA tek satırda sayılır — bir döngüdeki hata
 * tabloyu şişiremez.
 *
 * Kayıt yazılamazsa sessizce geçer: hata kaydı asıl hatayı BÜYÜTMEMELİ.
 */

/** `icerik`: kullanıcının bildirdiği içerik hatası (İngilizce sorusu, 2026-11-06). */
export type HataKaynagi = 'sunucu' | 'istemci' | 'icerik';

/** Mesajı saklanabilir hâle getirir. SAF. */
export function hataMetni(ham: string): string {
  const ilk = ham.split('\n')[0] ?? '';
  return ilk
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[e-posta]')
    .replace(/\d{6,}/g, '[sayı]')
    .slice(0, 300);
}

/** Yoldan sorgu dizesi ve parça atılır; kayıt kimlikleri (cuid) tek forma iner. SAF. */
export function hataYolu(ham: string | null | undefined): string | null {
  if (!ham) return null;
  const yol = ham.split(/[?#]/)[0] ?? '';
  return yol.replace(/\/c[a-z0-9]{20,}/g, '/[id]').slice(0, 200) || null;
}

export function hataImzasi(
  kaynak: HataKaynagi,
  ad: string,
  mesaj: string,
  yol: string | null,
): string {
  return createHash('sha256')
    .update(`${kaynak}|${ad}|${mesaj}|${yol ?? ''}`)
    .digest('hex');
}

export async function hataKaydet(
  girdi: {
    kaynak: HataKaynagi;
    ad: string;
    mesaj: string;
    yol?: string | null;
    ayrinti?: string | null;
  },
  client: Pick<typeof db, 'hataKaydi'> = db,
  simdi: Date = new Date(),
): Promise<void> {
  const ad = (girdi.ad || 'Error').slice(0, 80);
  const mesaj = hataMetni(girdi.mesaj);
  const yol = hataYolu(girdi.yol);
  const imza = hataImzasi(girdi.kaynak, ad, mesaj, yol);
  try {
    await client.hataKaydi.upsert({
      where: { imza },
      create: {
        imza,
        kaynak: girdi.kaynak,
        ad,
        mesaj,
        yol,
        ayrinti: girdi.ayrinti?.slice(0, 200) ?? null,
        ilk: simdi,
        son: simdi,
      },
      update: { sayi: { increment: 1 }, son: simdi },
    });
  } catch (error) {
    guvenliHata('[hata-kaydi] yazılamadı:', error instanceof Error ? error.name : error);
  }
}

export interface HataDto {
  id: string;
  kaynak: HataKaynagi;
  ad: string;
  mesaj: string;
  yol: string | null;
  ayrinti: string | null;
  sayi: number;
  ilk: string;
  son: string;
}

export async function fetchHatalar(client: Pick<typeof db, 'hataKaydi'> = db): Promise<HataDto[]> {
  const satirlar = await client.hataKaydi.findMany({ orderBy: { son: 'desc' }, take: 50 });
  return satirlar.map((h) => ({
    id: h.id,
    kaynak: h.kaynak as HataKaynagi,
    ad: h.ad,
    mesaj: h.mesaj,
    yol: h.yol,
    ayrinti: h.ayrinti,
    sayi: h.sayi,
    ilk: h.ilk.toISOString(),
    son: h.son.toISOString(),
  }));
}

export async function hatalariTemizle(client: Pick<typeof db, 'hataKaydi'> = db): Promise<number> {
  const { count } = await client.hataKaydi.deleteMany({});
  return count;
}
