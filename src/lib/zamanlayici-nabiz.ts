/**
 * ZAMANLAYICI NABZI (2026-11-02). Bildirim turu sessizce durursa hiçbir yer hata vermez; sabah
 * hatırlatma gelmez ve sebebi bilinmez. Başarılı tur damga vurur, sağlık ucu damganın yaşına
 * bakar, dış izleme alarm verir. `globalThis`: `instrumentation` ile rota ayrı paketlerde
 * derleniyor, modül değişkeni ortak olmaz; süreç ortak.
 */
const ANAHTAR = '__aeZamanlayiciNabiz';
type NabizGlobal = typeof globalThis & { [ANAHTAR]?: number };

/** 5 dakikalık tur için 20 dakika sessizlik durmuş sayılır. */
export const NABIZ_ESIK_MS = 20 * 60_000;

export function nabizVur(simdi: number = Date.now()): void {
  (globalThis as NabizGlobal)[ANAHTAR] = simdi;
}

export type NabizDurumu = 'ok' | 'gecikmis' | 'kapali';

/** `kurulu`: bu süreçte zamanlayıcı çalışmalı mı (üretim + bildirim anahtarları). SAF. */
export function nabizDurumu(
  kurulu: boolean,
  uptimeSaniye: number,
  simdi: number = Date.now(),
): NabizDurumu {
  if (!kurulu) return 'kapali';
  const son = (globalThis as NabizGlobal)[ANAHTAR];
  if (son === undefined) return uptimeSaniye * 1000 > NABIZ_ESIK_MS ? 'gecikmis' : 'ok';
  return simdi - son > NABIZ_ESIK_MS ? 'gecikmis' : 'ok';
}
