import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * §8.2 — argon2id PARAMETRELERİNİN TABANI (T-108g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU KAPI SONRADAN ÇIKTI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §8 tablosunda 2. madde (`argon2id ≥19MB / ≥2 iterasyon`) **⏳** duruyordu ve
 * notu `F1 / T-013` diyordu. F5'e girmeden önce ⏳ maddelerin envanterini
 * çıkarırken ölçtüm: **madde F1'de UYGULANMIŞ**, satır bayatlamış.
 *
 * Ama statüyü ✅ yapmadan önce ikinci bir şey ölçtüm: **kapısı var mı?**
 * Yok. Üretim parametrelerini hiçbir iddia okumuyordu. Dahası testler
 * BİLEREK zayıf bir yapılandırma kullanıyor (`change-password.test.ts` →
 * `FAST = { memoryCost: 1 << 12, timeCost: 1 }`) — koşum hızı için doğru bir
 * karar, ama yan etkisi şu: üretim değerleri test takımında HİÇ GÖRÜNMÜYOR.
 *
 * Yani maddenin durumu "uygulandı ve korunuyor" değil, **"uygulandı,
 * ölçülmüyor"**du. Bu yüzden statü ⚠️ yazıldı ve kapı bu dosyada kuruldu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN ÖNEMLİ — GERİLEMENİN BİÇİMİ ÇOK SIRADAN
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `memoryCost` bir maliyet parametresi: büyüdükçe giriş yavaşlar. "Giriş
 * yavaş" şikâyeti ya da CI süresi, birini `19_456`ı düşürmeye ikna edebilir ve
 * değişiklik TEK SATIR. Hiçbir test kırılmaz, hiçbir ekran değişmez; yalnızca
 * çalınmış bir hash'in kırılma maliyeti düşer. Sonuç aylar sonra, başka bir
 * olayla ortaya çıkar.
 *
 * Taban OWASP'ın argon2id için önerdiği asgari bellek ve §8.2 onu şart
 * koşuyor. Kapı SAYIYI değil TABANI ölçüyor: değerler yükseltilebilir
 * (`toBeGreaterThanOrEqual`), düşürülemez.
 */

const KOK = resolve(__dirname, '..', '..', '..');
const KAYNAK = readFileSync(join(KOK, 'src/server/auth/password.ts'), 'utf8');

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040). */
const KOD = KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

/** `19_456` gibi alt çizgili sayı ayırıcılarını okur. */
function sayi(ham: string): number {
  return Number(ham.replace(/_/g, ''));
}

function parametre(ad: string): number | null {
  const eslesme = new RegExp(`${ad}\\s*:\\s*([0-9_]+)`).exec(KOD);
  return eslesme?.[1] ? sayi(eslesme[1]) : null;
}

describe('§8.2 — argon2id maliyet parametreleri tabanın ÜSTÜNDE', () => {
  it('önkoşul — üretim yapılandırması okunabiliyor', () => {
    /*
     * Çapa. Dosya taşınır ya da yapılandırma başka bir biçime geçerse
     * (örneğin ortam değişkeninden okunmaya başlarsa) aşağıdaki iddialar
     * `null` üzerinde yanlış sebeple kırılır — bu iddia ayrımı yapıyor.
     */
    expect(KOD, 'argon2id tipi yapılandırmada yok').toMatch(/type\s*:\s*argon2\.argon2id/);
    expect(parametre('memoryCost'), '`memoryCost` okunamadı').not.toBeNull();
    expect(parametre('timeCost'), '`timeCost` okunamadı').not.toBeNull();
  });

  it('`memoryCost` ≥ 19 MiB (19.456 KiB) — OWASP asgarisi ve §8.2 tabanı', () => {
    expect(
      parametre('memoryCost') ?? 0,
      '`memoryCost` §8.2 tabanının ALTINA düştü. Bu tek satırlık bir düzenlemedir ' +
        've hiçbir ekranı değiştirmez — yalnızca çalınmış bir hash`in kırılma ' +
        'maliyetini düşürür. Yükseltmek serbest, düşürmek değil.',
    ).toBeGreaterThanOrEqual(19_456);
  });

  it('`timeCost` ≥ 2 — §8.2 iterasyon tabanı', () => {
    expect(
      parametre('timeCost') ?? 0,
      '`timeCost` §8.2 tabanının altında (en az 2 isteniyor).',
    ).toBeGreaterThanOrEqual(2);
  });

  it('`argon2id` kullanılıyor — `argon2i`/`argon2d` DEĞİL', () => {
    /*
     * Tip de bir güvenlik kararı: `argon2d` GPU`ya karşı daha iyi ama yan
     * kanal saldırılarına açık, `argon2i` tersi. `argon2id` ikisinin melezi ve
     * parola hash`i için önerilen olan o.
     */
    expect(KOD).toMatch(/argon2\.argon2id/);
    expect(KOD, '`argon2d` ya da `argon2i` seçilmiş — §8.2 `argon2id` istiyor').not.toMatch(
      /argon2\.argon2[di]\b/,
    );
  });

  it('⚠️ bcrypt KULLANILMIYOR', () => {
    // Negatif iddia, yukarıdaki pozitiflerle birlikte anlam taşıyor: dosya
    // tamamen boşalsa da `argon2id` iddiaları kırılır.
    expect(KOD.toLowerCase()).not.toContain('bcrypt');
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · okuyucu gerçekten ısırıyor', () => {
  const oku = (kaynak: string, ad: string): number | null => {
    const m = new RegExp(`${ad}\\s*:\\s*([0-9_]+)`).exec(kaynak);
    return m?.[1] ? Number(m[1].replace(/_/g, '')) : null;
  };

  it('alt çizgili sayı doğru okunuyor', () => {
    expect(oku('  memoryCost: 19_456,', 'memoryCost')).toBe(19456);
    expect(oku('  memoryCost: 19456,', 'memoryCost')).toBe(19456);
  });

  it('TABANIN ALTINDAKİ değer yakalanıyor', () => {
    // Gerilemenin tam biçimi: "giriş yavaş" diye düşürmek.
    expect(oku('  memoryCost: 4_096,', 'memoryCost')).toBeLessThan(19_456);
    expect(oku('  timeCost: 1,', 'timeCost')).toBeLessThan(2);
  });

  it('okunamayan yapılandırma `null` dönüyor — sessiz 0 DEĞİL', () => {
    /*
     * Önemli: okuyucu başarısız olunca `0` dönseydi, taban iddiası "0 >= 19456"
     * ile kırılır ama sebebi "parametre düşürüldü" sanılırdı. `null` ayrımı
     * önkoşul iddiasının doğru teşhis vermesini sağlıyor.
     */
    expect(oku('  memoryCost: process.env.ARGON_MEM,', 'memoryCost')).toBeNull();
  });
});
