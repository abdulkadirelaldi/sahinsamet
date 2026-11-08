import { createHash, randomBytes } from 'node:crypto';

import * as z from 'zod';

import { db } from '@/server/db';

import { appToday } from './_shared';
import { kuyrukGunu } from './cuzdan';
import { gununKaydinaEkle } from './health-log';

/**
 * iPHONE KISAYOLLAR BAĞLANTISI (2026-11-01) — adım, uyku, nabız ve kilo
 * kendiliğinden panele gelsin.
 *
 * YETKİ DAR: anahtar yalnızca bu dört ölçüyü YAZAR. Okuyamaz, panele giremez,
 * başka hiçbir şeye dokunamaz. 256 bit rastgele; yalnızca bir kez gösterilir,
 * veritabanında özeti durur. Yeniden üretmek eskisini geçersiz kılar.
 */

const ONEK = 'aesk_';

const anahtarOzeti = (anahtar: string): string =>
  createHash('sha256').update(anahtar, 'utf8').digest('hex');

/**
 * Kısayollar Türkçe bölgede sayıyı metin gönderebilir ("7,5", "8.432", "8.432,5");
 * sayı da gelebilir. Bozuksa `undefined` (Zod reddeder). SAF.
 */
function sayiOku(deger: unknown): unknown {
  if (typeof deger === 'number') return deger;
  if (typeof deger !== 'string') return deger;
  const t = deger.trim().replace(/\s/g, '');
  if (t === '') return undefined;
  // "8.432" Türkçede sekiz bin dört yüz otuz iki: noktadan sonra tam üç hane = binlik.
  const binlik = /^\d{1,3}(\.\d{3})+$/.test(t);
  const normal = binlik || t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const sayi = Number(normal);
  return Number.isFinite(sayi) ? sayi : undefined;
}

const sayi = (en: number, cok: number) =>
  z.preprocess(sayiOku, z.number().min(en).max(cok)).optional();

export const olcumSchema = z
  .object({
    gun: z.iso.date().optional(),
    adim: sayi(0, 200_000),
    uyku: sayi(0, 24),
    nabiz: sayi(20, 250),
    kilo: sayi(20, 400),
  })
  .refine((o) => [o.adim, o.uyku, o.nabiz, o.kilo].some((d) => d !== undefined), {
    error: 'En az bir ölçü gerekli.',
  });
export type OlcumGirdisi = z.infer<typeof olcumSchema>;

/** Olası sonuç: gün, yazılan alan adları. */
export async function olcumYaz(
  girdi: OlcumGirdisi,
  client: Pick<typeof db, 'healthLog'> = db,
  bugun: string = appToday(),
): Promise<{ gun: string; alanlar: string[] }> {
  const gun = kuyrukGunu(girdi.gun, bugun);
  const ek = {
    ...(girdi.adim !== undefined ? { steps: Math.round(girdi.adim) } : {}),
    ...(girdi.uyku !== undefined ? { sleepHours: girdi.uyku.toFixed(2) } : {}),
    ...(girdi.nabiz !== undefined ? { restingHr: Math.round(girdi.nabiz) } : {}),
    ...(girdi.kilo !== undefined ? { weightKg: girdi.kilo.toFixed(2) } : {}),
  };
  await gununKaydinaEkle(gun, ek, client);
  return { gun, alanlar: Object.keys(ek) };
}

/** Yeni anahtar üretir, eskisini geçersiz kılar. Düz anahtar YALNIZCA burada döner. */
export async function anahtarUret(
  userId: string,
  client: Pick<typeof db, 'saglikBaglantisi'> = db,
): Promise<string> {
  const anahtar = ONEK + randomBytes(32).toString('base64url');
  const ozet = anahtarOzeti(anahtar);
  await client.saglikBaglantisi.upsert({
    where: { userId },
    create: { userId, anahtarOzeti: ozet },
    update: { anahtarOzeti: ozet, createdAt: new Date(), sonKullanim: null },
  });
  return anahtar;
}

export async function anahtarSil(
  userId: string,
  client: Pick<typeof db, 'saglikBaglantisi'> = db,
): Promise<void> {
  await client.saglikBaglantisi.deleteMany({ where: { userId } });
}

/** Anahtar geçerliyse sahibinin kimliği; son kullanımı işler. */
export async function anahtarDogrula(
  anahtar: string,
  client: Pick<typeof db, 'saglikBaglantisi'> = db,
  simdi: Date = new Date(),
): Promise<string | null> {
  if (!anahtar.startsWith(ONEK) || anahtar.length > 100) return null;
  const kayit = await client.saglikBaglantisi.findUnique({
    where: { anahtarOzeti: anahtarOzeti(anahtar) },
    select: { userId: true },
  });
  if (!kayit) return null;
  await client.saglikBaglantisi.update({
    where: { userId: kayit.userId },
    data: { sonKullanim: simdi },
  });
  return kayit.userId;
}

export async function fetchBaglanti(
  userId: string,
  client: Pick<typeof db, 'saglikBaglantisi'> = db,
): Promise<{ olusturma: string; sonKullanim: string | null } | null> {
  const k = await client.saglikBaglantisi.findUnique({ where: { userId } });
  return k
    ? { olusturma: k.createdAt.toISOString(), sonKullanim: k.sonKullanim?.toISOString() ?? null }
    : null;
}
