import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PARKURLAR } from '@/lib/ingilizce/mufredat';

/**
 * KİMLİK KORUMASI (2026-11-06): tamamlanan dersler ve zayıf sorular kimlikle saklanıyor.
 * Bir ünite, ders ya da soru silinir ya da kimliği değişirse ilerleme SESSİZCE kaybolur.
 * Bu liste bilinen her kimliği tutar; listedekilerden biri müfredatta yoksa test düşer.
 * Yeni kimlik eklemek serbest; listeyi güncellemek bilinçli bir adım:
 *
 *   KIMLIK_GUNCELLE=1 pnpm exec vitest run tests/unit/ingilizce/kimlik-koruma.test.ts
 */
const DOSYA = join(__dirname, 'kimlikler.json');

function simdikiler(): string[] {
  return PARKURLAR.flatMap((p) =>
    p.uniteler.flatMap((u) => [
      u.id,
      ...u.dersler.flatMap((d) => [d.id, ...d.alistirmalar.map((a) => a.id)]),
    ]),
  ).sort();
}

describe('İngilizce kimlik koruması', () => {
  it('bilinen hiçbir kimlik kaybolmadı', () => {
    const simdi = simdikiler();
    if (process.env.KIMLIK_GUNCELLE === '1' || !existsSync(DOSYA)) {
      writeFileSync(DOSYA, `${JSON.stringify(simdi, null, 2)}\n`);
    }
    const bilinen = JSON.parse(readFileSync(DOSYA, 'utf8')) as string[];
    const kume = new Set(simdi);
    expect(bilinen.filter((id) => !kume.has(id))).toEqual([]);
  });

  it('liste güncel: yeni kimlikler listeye eklenmiş', () => {
    const bilinen = new Set(JSON.parse(readFileSync(DOSYA, 'utf8')) as string[]);
    expect(
      simdikiler().filter((id) => !bilinen.has(id)),
      'Yeni kimlik var: KIMLIK_GUNCELLE=1 ile listeyi güncelle.',
    ).toEqual([]);
  });
});
