/**
 * Uygulama ikonlarını üretir: `src/app/icon.png` (192, yuvarlak köşe),
 * `apple-icon.png` (180, iOS kendisi yuvarlar) ve `favicon.ico` (16/32/48).
 *
 *   node scripts/ikon-uret.mjs [çıktı-dizini]
 *
 * Harfler repodaki Space Grotesk ile Playwright'ın Chromium'unda çiziliyor —
 * ek bağımlılık yok. Baş harfler `src/lib/constants.ts` → `SITE_INITIALS` ile aynı.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = process.argv[2] ?? resolve(KOK, 'src/app');
const font = `data:font/woff2;base64,${readFileSync(`${KOK}/src/app/fonts/space-grotesk.woff2`).toString('base64')}`;

function html(boyut, yuvarlak) {
  const r = yuvarlak ? Math.round(boyut * 0.225) : 0;
  return `<!doctype html><html><head><style>
@font-face{font-family:SG;src:url('${font}') format('woff2');font-weight:600 700;}
html,body{margin:0;width:${boyut}px;height:${boyut}px;background:transparent;}
.k{width:${boyut}px;height:${boyut}px;border-radius:${r}px;background:#0a0a12;display:flex;align-items:center;justify-content:center;}
.t{font-family:SG;font-weight:700;color:#fff;font-size:${Math.round(boyut * 0.44)}px;letter-spacing:-0.04em;line-height:1;display:flex;align-items:baseline;transform:translateY(-${Math.round(boyut * 0.03)}px)}
.n{display:inline-block;width:${Math.max(2, Math.round(boyut * 0.085))}px;height:${Math.max(2, Math.round(boyut * 0.085))}px;background:#7756ff;margin-left:${Math.max(1, Math.round(boyut * 0.025))}px;}
</style></head><body><div class="k"><div class="t">SŞ<span class="n"></span></div></div></body></html>`;
}

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage({ deviceScaleFactor: 1 });
async function cek(boyut, yuvarlak, dosya, saydam = true) {
  await sayfa.setViewportSize({ width: boyut, height: boyut });
  await sayfa.setContent(html(boyut, yuvarlak));
  await sayfa.evaluate(() => document.fonts.ready);
  const png = await sayfa.screenshot({
    omitBackground: saydam,
    clip: { x: 0, y: 0, width: boyut, height: boyut },
  });
  if (dosya) writeFileSync(dosya, png);
  return png;
}
await cek(192, true, `${CIKTI}/icon.png`);
await cek(180, false, `${CIKTI}/apple-icon.png`, false);
const p16 = await cek(16, true, null);
const p32 = await cek(32, true, null);
const p48 = await cek(48, true, null);
// ICO kabı: PNG gömülü girdiler.
const girdiler = [
  [16, p16],
  [32, p32],
  [48, p48],
];
const baslik = Buffer.alloc(6 + 16 * girdiler.length);
baslik.writeUInt16LE(0, 0);
baslik.writeUInt16LE(1, 2);
baslik.writeUInt16LE(girdiler.length, 4);
let ofset = baslik.length;
girdiler.forEach(([b, png], i) => {
  const o = 6 + i * 16;
  baslik.writeUInt8(b, o);
  baslik.writeUInt8(b, o + 1);
  baslik.writeUInt8(0, o + 2);
  baslik.writeUInt8(0, o + 3);
  baslik.writeUInt16LE(1, o + 4);
  baslik.writeUInt16LE(32, o + 6);
  baslik.writeUInt32LE(png.length, o + 8);
  baslik.writeUInt32LE(ofset, o + 12);
  ofset += png.length;
});
writeFileSync(`${CIKTI}/favicon.ico`, Buffer.concat([baslik, ...girdiler.map(([, p]) => p)]));
await tarayici.close();
process.stdout.write(`İkonlar yazıldı: ${CIKTI}\n`);
