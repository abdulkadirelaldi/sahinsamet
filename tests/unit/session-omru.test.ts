import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * OTURUM ÖMRÜ — §8.3, ADR-035/A (T-046).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN KAYNAK OKUNUYOR, MODÜL İÇE AKTARILMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `src/server/auth.ts` `next-auth` içe aktarıyor ve o modül Vitest'in `node`
 * ortamında YÜKLENEMİYOR (`next/server` çözülmüyor) — `session.test.ts` aynı
 * duvara çarpıp aynı çözümü seçmişti: yapılandırmanın gerçekten uygulanıp
 * uygulanmadığı sorusu varsayımla değil, KANITLA cevaplanır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE KORUNUYOR: ÇEREZ ÖMRÜ İLE JETON ÖMRÜ BİRLİKTE DEĞİŞSİN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İkisi ayrı sayılarla yazılsaydı biri güncellenip diğeri kalınca TUTARSIZ bir
 * ömür çıkardı — çerez ölmüş ama jeton hâlâ geçerli, ya da tersi. İkisinin de
 * TEK SABİTTEN beslendiğini doğrulamak, o sapmayı yapısal olarak imkânsız kılar.
 */

const KAYNAK = readFileSync(join(resolve(__dirname, '../..'), 'src/server/auth.ts'), 'utf8');

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040 dersi). */
const KOD = KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

describe('§8.3 — oturum ömrü 24 saat (ADR-035/A)', () => {
  /**
   * T-051/A — İDDİA DEĞİŞTİ: "literal 24 saat yazılmış mı" DEĞİL, "kanonik
   * modülden İÇE AKTARILMIŞ mı".
   *
   * T-049g sabiti `src/lib/security/session`e taşıdı; T-051'de `auth.ts` de
   * oradan okumaya geçti. Eski iddia (literal tanımın durması) artık YANLIŞ
   * ŞEYİ korur: literali geri yazmak tam olarak kaçınmak istediğimiz sapmayı
   * geri getirir, ama eski iddia buna YEŞİL derdi.
   *
   * Yürürlükteki DEĞER artık kanonik modülün kendi testinde (aşağıdaki blok);
   * burada korunan şey KAYNAĞIN TEKLİĞİ.
   */
  it('ömür KANONİK MODÜLDEN içe aktarılıyor — literal tanım YOK', () => {
    expect(KOD, 'auth.ts ömrü kendi literaliyle tanımlıyor — tek kaynak bozuldu (T-051/A)').toMatch(
      /import\s*\{[^}]*SESSION_MAX_AGE_SECONDS[^}]*\}\s*from\s*'@\/lib\/security\/session'/,
    );
    expect(KOD, 'auth.ts içinde literal ömür tanımı kalmış').not.toMatch(
      /const\s+SESSION_MAX_AGE_SECONDS\s*=/,
    );
  });

  it('ESKİ 7 günlük değer kaynakta KALMADI', () => {
    // Artık literal hiç olmamalı; bu iddia yine de duruyor çünkü biri
    // "geçici olarak" eski değeri yorum dışı bir yere yazarsa yakalanmalı.
    expect(KOD).not.toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  });

  it('tarama çalışıyor — kaynak gerçekten okundu', () => {
    // Aksi hâlde yukarıdaki iki assert boş dizede arama yapıp sahte yeşil verirdi.
    expect(KOD).toContain('SESSION_MAX_AGE_SECONDS');
    expect(KOD).toContain('strategy');
  });

  it('ÇEREZ ömrü ve OTURUM ömrü AYNI sabitten geliyor', () => {
    // İki kullanım: `session.maxAge` ve `cookies.sessionToken.options.maxAge`.
    const kullanim = KOD.match(/maxAge:\s*SESSION_MAX_AGE_SECONDS/g) ?? [];
    expect(kullanim).toHaveLength(2);
  });

  it('hiçbir `maxAge` ELLE YAZILMIŞ sayı almıyor', () => {
    // `maxAge: 604800` gibi bir satır sabiti atlar ve sapmayı geri getirir.
    expect(KOD).not.toMatch(/maxAge:\s*\d/);
  });

  it('24 saat gerçekten 86400 saniye — birim hatası yok', () => {
    // `24 * 60` (24 dakika) ya da `24 * 60 * 60 * 1000` (ms) yazmak sessiz
    // ve çok pahalı bir hata olurdu.
    expect(24 * 60 * 60).toBe(86_400);
  });
});

/**
 * KAPININ KÖR NOKTASI — T-048g'de ölçüldü ve kapatıldı.
 *
 * Yukarıdaki taramanın tamamı `src/server/auth.ts`e bakıyor. ADR-035/A ömrü
 * 7 günden 24 saate indirdiğinde o dosya güncellendi, kapı yeşil kaldı — ve
 * `tests/e2e/_helpers/session.ts` **7 gün üretmeye devam etti**. Hiçbir test
 * kırılmadı çünkü kimse oraya bakmıyordu.
 *
 * Zararı "yalnızca testte" diye küçümsemek yanlış olurdu: E2E paketi, üretimde
 * ARTIK ÜRETİLEMEYEN bir jeton biçimiyle koşuyordu. Ölçülen ortam ile gerçek
 * ortam arasındaki sessiz sapma, bu deponun defalarca adını koyduğu sınıf
 * (bayat öncül) — bu kez kendi test altyapımızda.
 *
 * Bu blok o boşluğu kapatıyor: kapı artık ÜRETİM sabitini ve TEST jetonunu
 * BİRLİKTE tarıyor.
 */
describe('§8.3 — E2E yardımcısı ömrü İÇE AKTARIYOR (T-049g)', () => {
  const E2E_KAYNAK = readFileSync(
    join(resolve(__dirname, '../..'), 'tests/e2e/_helpers/session.ts'),
    'utf8',
  );
  const E2E_KOD = E2E_KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

  it('tarama çalışıyor — yardımcı gerçekten okundu', () => {
    // Sahte yeşil koruması: dosya taşınırsa/adı değişirse burası önce kırılır.
    expect(E2E_KOD).toContain('maxAge');
    expect(E2E_KOD).toContain('encode');
  });

  /**
   * T-048g'de bu iddia "varsayılan 24 saat olarak YAZILMIŞ mı" diye soruyordu.
   * T-049g sabiti `src/lib/security/session`e taşıdığı için soru DEĞİŞTİ:
   * artık doğru cevap "sayı yazılmamış, içe aktarılmış". Daha güçlü, çünkü
   * sapmayı yakalamak yerine İMKÂNSIZ kılıyor.
   */
  it('ömür sabiti İÇE AKTARILIYOR — sayı tekrar yazılmıyor', () => {
    expect(E2E_KOD).toMatch(/import\s*\{[^}]*SESSION_MAX_AGE_SECONDS[^}]*\}\s*from/);
    expect(E2E_KOD).toMatch(/maxAge:\s*input\.maxAgeSeconds\s*\?\?\s*SESSION_MAX_AGE_SECONDS/);
  });

  it('yardımcıda ELLE YAZILMIŞ ömür sayısı YOK', () => {
    // Eski 7 günlük değer de, yerine konan 24 saatlik sayı da olmamalı:
    // ikisi de "iki yerde yazılı sayı" sorununun tekrarı olurdu.
    expect(E2E_KOD).not.toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    expect(E2E_KOD).not.toMatch(/604800/);
    expect(E2E_KOD).not.toMatch(/maxAge:\s*input\.maxAgeSeconds\s*\?\?\s*\d/);
  });
});

/* ===========================================================================
 * KANONİK MODÜL — tek tanımın kendisi (T-051/A)
 *
 * T-049g'de burada GEÇİCİ bir çapraz kontrol vardı: `auth.ts` kendi kopyasını
 * kullandığı için iki tanımın ayrışmadığı ölçülüyordu. T-051/A ile `auth.ts`
 * içe aktarmaya geçti, yani karşılaştırılacak İKİNCİ DEĞER YOK — çapraz
 * kontrol silindi. Yerinde bırakmak, var olmayan bir sapmayı ölçen ve bu yüzden
 * hiçbir şey korumayan bir test bırakmak olurdu.
 *
 * Kalan iki iddia geçişten BAĞIMSIZ ve kalıcı: değerin kendisi, ve modülün
 * Edge-güvenli kalması (T-044g'de ölçülen duvar — taşımanın önkoşulu).
 * ======================================================================== */

describe('§8.3 — kanonik sabit (src/lib/security/session)', () => {
  const KANONIK_KAYNAK = readFileSync(
    join(resolve(__dirname, '../..'), 'src/lib/security/session.ts'),
    'utf8',
  );
  const KANONIK_KOD = KANONIK_KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

  it('kanonik sabit İHRAÇ EDİLMİŞ ve 24 saat', () => {
    // İhraç edilmemiş bir sabit taşımanın amacını boşa çıkarır: kimse okuyamaz.
    expect(KANONIK_KOD).toMatch(
      /export\s+const\s+SESSION_MAX_AGE_SECONDS\s*=\s*24\s*\*\s*60\s*\*\s*60/,
    );
  });

  it('24 saat gerçekten 86400 saniye — birim hatası yok', () => {
    // `24 * 60` (24 dakika) ya da `* 1000` (ms) yazmak sessiz ve pahalı olurdu.
    expect(24 * 60 * 60).toBe(86_400);
  });

  it('kanonik modül EDGE-GÜVENLİ kalıyor', () => {
    /*
     * Taşımanın tek sebebi bu modülün hem Edge ara katmanından hem node
     * ortamından okunabilmesiydi. Buraya `@/server/*` girerse o özellik
     * kaybolur ve ara katman derlemesi `UnhandledSchemeError` ile düşer —
     * T-044g'de ölçüldü. Bu dal geçişten BAĞIMSIZ, bu yüzden kalıcı.
     */
    const iceAktarmalar = [...KANONIK_KOD.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);

    expect(iceAktarmalar).not.toContain('@/server/db');
    for (const yol of iceAktarmalar) {
      expect(yol, `${yol} Edge'de yüklenemeyebilir`).not.toMatch(/^@\/server\//);
    }
  });
});
