import { describe, expect, it } from 'vitest';

import {
  isTwoFactorSetupPath,
  readTwoFactorClaim,
  requiresTwoFactorSetup,
  TWO_FACTOR_CLAIM,
  TWO_FACTOR_SETUP_PATH,
} from '@/lib/security/two-factor';

/**
 * §8.1 — "2FA kurulumu ilk girişte zorunludur."
 *
 * Karar mantığı saf tutulduğu için tamamı burada sınanabiliyor; ara katmanın
 * bu kararı NASIL uyguladığı `middleware.test.ts` ve `auth.spec.ts`'in işi.
 */

describe('readTwoFactorClaim', () => {
  it('boolean değerleri olduğu gibi okur', () => {
    expect(readTwoFactorClaim({ [TWO_FACTOR_CLAIM]: true })).toBe(true);
    expect(readTwoFactorClaim({ [TWO_FACTOR_CLAIM]: false })).toBe(false);
  });

  /**
   * `null` ile `false` AYRI durumlardır — biri "alan yok", öteki "2FA yok".
   * Karıştırılırsa 2FA'sı kurulu kullanıcılar kurulum ekranına kilitlenir.
   */
  it('alan yoksa null döner — false ile karıştırılmaz', () => {
    expect(readTwoFactorClaim({})).toBeNull();
    expect(readTwoFactorClaim(null)).toBeNull();
    expect(readTwoFactorClaim(undefined)).toBeNull();
  });

  /**
   * Jeton bizim ürettiğimiz için tip sapması beklenmiyor; yine de boolean
   * olmayan bir değer "kurulu" sayılmamalı. `'true'` dizesi `Boolean()` ile
   * true olurdu — bu yüzden tip kontrolü kesin.
   */
  it('boolean olmayan değerleri null sayar', () => {
    expect(readTwoFactorClaim({ [TWO_FACTOR_CLAIM]: 'true' })).toBeNull();
    expect(readTwoFactorClaim({ [TWO_FACTOR_CLAIM]: 1 })).toBeNull();
    expect(readTwoFactorClaim({ [TWO_FACTOR_CLAIM]: {} })).toBeNull();
  });
});

describe('isTwoFactorSetupPath', () => {
  it('kurulum ekranını ve alt yollarını tanır', () => {
    expect(isTwoFactorSetupPath(TWO_FACTOR_SETUP_PATH)).toBe(true);
    expect(isTwoFactorSetupPath(`${TWO_FACTOR_SETUP_PATH}/`)).toBe(true);
    expect(isTwoFactorSetupPath(`${TWO_FACTOR_SETUP_PATH}/kurtarma`)).toBe(true);
  });

  it('diğer panel yollarını kurulum ekranı SAYMAZ', () => {
    expect(isTwoFactorSetupPath('/panel')).toBe(false);
    expect(isTwoFactorSetupPath('/panel/ayarlar')).toBe(false);
    expect(isTwoFactorSetupPath('/panel/muhasebe')).toBe(false);
  });

  /** Segment sınırı — `/panel/ayarlar/guvenlik-yedek` muaf olmamalı. */
  it('segment sınırında olmayan benzer yolları muaf tutmaz', () => {
    expect(isTwoFactorSetupPath(`${TWO_FACTOR_SETUP_PATH}-yedek`)).toBe(false);
    expect(isTwoFactorSetupPath('/panel/ayarlar/guvenlikli')).toBe(false);
  });
});

describe('requiresTwoFactorSetup', () => {
  it('2FA kurulu değilse panel yollarında kuruluma yönlendirir', () => {
    for (const pathname of ['/panel', '/panel/muhasebe', '/panel/ayarlar', '/api/v1/panel/x']) {
      expect(requiresTwoFactorSetup({ pathname, twoFactorEnabled: false }), pathname).toBe(true);
    }
  });

  /** Döngü koruması — kurulum ekranının kendisi asla yönlendirilmez. */
  it('kurulum ekranının KENDİSİ yönlendirilmez — döngü yok', () => {
    expect(
      requiresTwoFactorSetup({ pathname: TWO_FACTOR_SETUP_PATH, twoFactorEnabled: false }),
    ).toBe(false);
    expect(
      requiresTwoFactorSetup({
        pathname: `${TWO_FACTOR_SETUP_PATH}/kurtarma`,
        twoFactorEnabled: false,
      }),
    ).toBe(false);
  });

  it('2FA kuruluysa hiçbir yol yönlendirilmez', () => {
    for (const pathname of ['/panel', '/panel/muhasebe', TWO_FACTOR_SETUP_PATH]) {
      expect(requiresTwoFactorSetup({ pathname, twoFactorEnabled: true }), pathname).toBe(false);
    }
  });

  /**
   * BEKLENTİ T-019b'DE TERSİNE ÇEVRİLDİ — "burada neden ters döndü?" sorusunun
   * cevabı:
   *
   * T-019'da `null` GEÇİRİLİYORDU. O sırada `tfa` alanını giriş akışı henüz
   * jetona koymuyordu (BULGU-008); `null`'ı "kurulu değil" saymak, 2FA'sı
   * ZATEN KURULU olan kullanıcıyı da kurulum ekranına kalıcı kilitlerdi —
   * jetonu alanı hiçbir zaman kazanmayacağı için.
   *
   * Backend T-013e'de alanı hem girişte hem kurulum sonrası tazelemede yazdı.
   * Artık her geçerli jeton alanı taşıyor, dolayısıyla `null` "beklenmedik
   * durum" demektir ve kapı KAPALI yönde başarısız olmalıdır: alanı yazan kod
   * bir gün sessizce bozulursa kapının da sessizce açılmaması gerekir.
   */
  it('alan jetonda yoksa KURULUMA YÖNLENDİRİR — kapalı yönde başarısız (T-019b)', () => {
    expect(requiresTwoFactorSetup({ pathname: '/panel', twoFactorEnabled: null })).toBe(true);
  });

  /** Muafiyet `null` için de geçerli — aksi hâlde kullanıcı kuruluma ulaşamaz. */
  it('alan yokken bile kurulum ekranı muaf — döngü yok', () => {
    expect(
      requiresTwoFactorSetup({ pathname: TWO_FACTOR_SETUP_PATH, twoFactorEnabled: null }),
    ).toBe(false);
  });
});
