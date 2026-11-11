import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * PANEL MANIFESTİ (2026-11-11) — Chrome'un yüklenebilirlik koşulları ve Android başlatıcısı:
 * ad, `start_url`, `display`, 192 ve 512 ikon, maskable ikon; kısayollar en çok 4 (Android 4'ünü
 * gösterir) ve hepsi panelin kapsamında. Her ikon DİSKTE var ve PNG başlığındaki boyut
 * manifestte yazanla aynı — yanlış boyutlu ikonu Chrome sessizce yok sayar.
 */
const KOK = resolve(__dirname, '../../..');

interface Ikon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  display_override?: string[];
  theme_color: string;
  background_color: string;
  categories?: string[];
  icons: Ikon[];
  shortcuts: { name: string; short_name?: string; url: string; icons?: Ikon[] }[];
}

const manifest = JSON.parse(
  readFileSync(resolve(KOK, 'public/panel.webmanifest'), 'utf8'),
) as Manifest;

/** `/icon.png` ve `/apple-icon.png` Next'in dosya kuralıyla `src/app`ten, gerisi `public`ten. */
function dosya(src: string): string {
  const ad = src.replace(/^\//, '');
  const genel = resolve(KOK, 'public', ad);
  return existsSync(genel) ? genel : resolve(KOK, 'src/app', ad);
}

/** PNG IHDR: genişlik 16., yükseklik 20. bayttan, büyük uçlu. */
function pngBoyutu(yol: string): string {
  const b = readFileSync(yol);
  expect(b.subarray(1, 4).toString('ascii'), `${yol} PNG değil`).toBe('PNG');
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

describe('panel.webmanifest', () => {
  it('Chrome yüklenebilirlik alanları', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe('/panel');
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    expect(manifest.display).toBe('standalone');
    expect(manifest.display_override).toEqual(['standalone']);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.categories?.length).toBeGreaterThan(0);
  });

  it('her ikon diskte ve boyutu manifestle aynı', () => {
    for (const ikon of [...manifest.icons, ...manifest.shortcuts.flatMap((k) => k.icons ?? [])]) {
      const yol = dosya(ikon.src);
      expect(existsSync(yol), `${ikon.src} yok`).toBe(true);
      expect(ikon.type).toBe('image/png');
      expect(pngBoyutu(yol), ikon.src).toBe(ikon.sizes);
    }
  });

  it('192 ve 512 "any", 512 maskable ve tek renkli rozet var', () => {
    const amac = (i: Ikon) => i.purpose ?? 'any';
    expect(manifest.icons.some((i) => i.sizes === '192x192' && amac(i) === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && amac(i) === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && amac(i) === 'maskable')).toBe(true);
    expect(manifest.icons.some((i) => amac(i) === 'monochrome')).toBe(true);
  });

  it('kısayollar: en çok 4, kapsam içinde, adları dolu; takvim ve etkinlik ekleme var', () => {
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
    expect(manifest.shortcuts.length).toBeLessThanOrEqual(4);
    for (const k of manifest.shortcuts) {
      expect(k.name).toBeTruthy();
      expect(new URL(k.url, 'https://x').pathname.startsWith(manifest.scope)).toBe(true);
    }
    const adresler = manifest.shortcuts.map((k) => k.url);
    expect(adresler).toContain('/panel/takvim');
    expect(adresler).toContain('/panel/takvim?yeni=1');
  });
});

describe('bildirim rozeti', () => {
  it('saydam zeminli PNG (renk tipi 6 = RGBA): Android yalnızca alfayı çizer', () => {
    const b = readFileSync(resolve(KOK, 'public/bildirim-rozet.png'));
    expect(b.readUInt8(25)).toBe(6);
    expect(pngBoyutu(resolve(KOK, 'public/bildirim-rozet.png'))).toBe('96x96');
  });
});
