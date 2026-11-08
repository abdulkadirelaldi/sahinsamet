import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * PARA KURALLARI TEK YERDE — ADR-037 KAPISI, T-101.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU KAPI VAR: AYNI SINIFIN ÜÇÜNCÜ ÖRNEĞİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `prisma/seed.ts` ADR-014'ün çarpımını YEREL OLARAK yeniden tanımlamıştı ve
 * yorumu şöyle diyordu: *"Bu yardımcı seed'e özeldir. Üretimdeki karşılığı
 * T-015'te servis katmanında yazılacak."*
 *
 * T-015 yazıldı. Öncül bayatladı ama kimse geri dönmedi — ve SAPMA TAM BURADAN
 * DOĞDU: yerel kopya `null → null` kuralını bilmiyordu, çağrı noktaları
 * `?? '0'` yazmak zorunda kalmıştı ve tutarı bilinmeyen bir `LEAD` işi için
 * `baseAmount = 0.00` ("bedava iş") üretiyordu. ADR-030 seed'i ölçüm
 * sözleşmesi saydığı için bu, servisin ÜRETEMEYECEĞİ bir fikstür demekti.
 *
 * Aynı sınıfın önceki iki örneği `MDX_OPTIONS` (T-047→T-053) ve
 * `SESSION_MAX_AGE_SECONDS` (T-048g→T-051). Üçüncü kez olduğu için kural artık
 * bir kapı hak ediyor.
 *
 * ⚠️ KAPININ SORUSU T-053'ÜN MDX KAPISIYLA AYNI: "EŞLEŞİYOR MU" DEĞİL,
 * "KAÇ YERDE TANIMLI". Eşleşmeyi ölçmek, çiftlenmeyi kabul edip sapmasını
 * izlemek olurdu; teklik ölçüldüğünde sapma YAPISAL OLARAK imkânsız.
 */

const KOK = resolve(__dirname, '../../..');
const KANONIK = 'src/server/services/_shared/money.ts';

/** `money.ts`in ihraç ettiği, başka hiçbir yerde TANIMLANMAMASI gereken işlevler. */
const PARA_ISLEVLERI = [
  'computeBaseAmount',
  'deriveBaseAmount',
  'sumMoney',
  'subtractMoney',
] as const;

/** Taranan ağaçlar — üretim kodu, seed ve betikler. Testler hariç. */
const TARANAN = ['src', 'prisma'] as const;

function tsDosyalari(dizin: string, toplanan: string[] = []): string[] {
  for (const ad of readdirSync(join(KOK, dizin))) {
    const yol = join(dizin, ad);
    const tam = join(KOK, yol);

    if (statSync(tam).isDirectory()) {
      // Üretilmiş Prisma istemcisi taranmaz: bizim yazdığımız kod değil.
      if (ad === 'generated' || ad === 'node_modules' || ad === 'migrations') continue;
      tsDosyalari(yol, toplanan);
      continue;
    }
    if (/\.tsx?$/.test(ad)) toplanan.push(yol);
  }
  return toplanan;
}

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040). */
function kod(yol: string): string {
  return readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

describe('ADR-037 — para kuralları TEK TANIM', () => {
  const dosyalar = TARANAN.flatMap((dizin) => tsDosyalari(dizin));

  it('tarama vakum değil — gerçekten dosya bulundu', () => {
    /*
     * Sahte yeşil koruması: tarama boş dönerse aşağıdaki iddia hiçbir şey
     * ölçmez ve yeşil kalır. T-050'de kendi testlerimde bulduğum sınıf.
     */
    expect(dosyalar.length).toBeGreaterThan(50);
    expect(dosyalar).toContain(KANONIK);
  });

  it('kanonik modül DÖRT işlevi de ihraç ediyor', () => {
    const kanonik = kod(KANONIK);
    for (const islev of PARA_ISLEVLERI) {
      expect(kanonik, `${islev} kanonik modülde ihraç edilmiyor`).toMatch(
        new RegExp(`export\\s+function\\s+${islev}\\b`),
      );
    }
  });

  it('⚠️ HİÇBİR BAŞKA DOSYA bu işlevleri TANIMLAMIYOR', () => {
    const ihlaller: string[] = [];

    for (const yol of dosyalar) {
      if (yol === KANONIK) continue;
      const kaynak = kod(yol);

      for (const islev of PARA_ISLEVLERI) {
        // Yerel tanımın her biçimi: `function x`, `const x = (`, `const x = function`.
        const desen = new RegExp(
          `(?:function\\s+${islev}\\b|(?:const|let|var)\\s+${islev}\\s*[:=])`,
        );
        if (desen.test(kaynak)) ihlaller.push(`${yol} → ${islev}`);
      }
    }

    expect(
      ihlaller,
      `para kuralı yerel olarak yeniden tanımlanmış:\n${ihlaller.join('\n')}`,
    ).toEqual([]);
  });

  it('kapı GERÇEKTEN kırılıyor — desen yerel bir tanımı yakalıyor', () => {
    /*
     * ⚠️ VAKUM OLMAMA KANITI. Yukarıdaki iddia bugün yeşil; deseni hiçbir şeyi
     * yakalamayacak biçimde yazmış olsaydım da yeşil kalırdı. Bu yüzden desen
     * `seed.ts`in SİLİNEN kopyasının gerçek metniyle sınanıyor.
     */
    const silinenKopya = 'function computeBaseAmount(amount: string, fxRate: string): string {';
    const desen = new RegExp(
      '(?:function\\s+computeBaseAmount\\b|(?:const|let|var)\\s+computeBaseAmount\\s*[:=])',
    );

    expect(desen.test(silinenKopya)).toBe(true);
    expect(desen.test('const x = computeBaseAmount(a, b);')).toBe(false);
    expect(desen.test("import { computeBaseAmount } from '@/x';")).toBe(false);
  });
});
