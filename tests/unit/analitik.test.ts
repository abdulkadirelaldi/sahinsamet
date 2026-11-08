import { describe, expect, it } from 'vitest';

import { analitikAyari } from '@/lib/analitik';
import { buildContentSecurityPolicy } from '@/lib/security/headers';

/**
 * Umami — isteğe bağlı analitik. Doğrulama burada, çünkü dönen köken CSP'ye
 * giriyor: geçersiz bir değer politikayı kontrolsüz bir kökene açmamalı.
 */
const SITE = '4f9b1c2e-8a3d-4e5f-9a1b-2c3d4e5f6a7b';

describe('analitikAyari', () => {
  it('iki değer de geçerliyse betik, site kimliği ve köken döner', () => {
    expect(analitikAyari({ UMAMI_URL: 'https://analiz.ornek.com/', UMAMI_SITE_ID: SITE })).toEqual({
      betik: 'https://analiz.ornek.com/script.js',
      siteId: SITE,
      koken: 'https://analiz.ornek.com',
    });
  });

  it('yol ve sorgu kökene SIZMAZ — CSP yalnızca şema + ana makine alır', () => {
    expect(
      analitikAyari({ UMAMI_URL: 'https://analiz.ornek.com/alt/yol?x=1', UMAMI_SITE_ID: SITE })
        ?.koken,
    ).toBe('https://analiz.ornek.com');
  });

  it.each([
    ['ikisi de yok', {}],
    ['yalnızca adres', { UMAMI_URL: 'https://analiz.ornek.com' }],
    ['yalnızca kimlik', { UMAMI_SITE_ID: SITE }],
    ['http (şifresiz)', { UMAMI_URL: 'http://analiz.ornek.com', UMAMI_SITE_ID: SITE }],
    ['geçersiz adres', { UMAMI_URL: 'analiz ornek com', UMAMI_SITE_ID: SITE }],
    [
      'kimlik UUID değil',
      { UMAMI_URL: 'https://analiz.ornek.com', UMAMI_SITE_ID: "x'; script-src *" },
    ],
  ])('%s → null (betik yok, CSP genişlemez)', (_ad, env) => {
    expect(analitikAyari(env)).toBeNull();
  });
});

describe('CSP — analitik kökeni', () => {
  const temel = { nonce: 'n', isProduction: true, isHttps: true };

  it('köken verilirse YALNIZCA connect-src genişler', () => {
    const csp = buildContentSecurityPolicy({ ...temel, analitikKoken: 'https://analiz.ornek.com' });
    expect(csp).toContain("connect-src 'self' https://analiz.ornek.com");
    expect(csp).not.toMatch(/script-src[^;]*analiz\.ornek\.com/);
  });

  it('köken yoksa connect-src yalnızca self', () => {
    expect(buildContentSecurityPolicy(temel)).toContain("connect-src 'self';");
  });
});
