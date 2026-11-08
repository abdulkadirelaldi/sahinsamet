import { describe, expect, it } from 'vitest';

import { adrestenAyrinti, sosyalBaglantilar } from '@/components/profil/sosyal';
import {
  alanAdiUyuyorMu,
  socialsOku,
  socialsSchema,
  updateProfileSchema,
} from '@/lib/schemas/profile';

describe('socialsSchema — sosyal bağlantı doğrulaması', () => {
  it('platformun kendi alan adındaki https adresini kabul eder (www ve alt alan adı dahil)', () => {
    expect(
      socialsSchema.safeParse({
        instagram: 'https://www.instagram.com/samet',
        x: 'https://twitter.com/samet',
        linkedin: 'https://tr.linkedin.com/company/ornek',
        youtube: 'https://youtu.be/abc',
        tiktok: 'https://www.tiktok.com/@samet',
        github: 'https://github.com/samet',
        website: 'https://herhangi-bir-site.com.tr/yol',
      }).success,
    ).toBe(true);
  });

  it('BAŞKA platformun adresini o alana kabul etmez', () => {
    const sonuc = socialsSchema.safeParse({ instagram: 'https://x.com/samet' });
    expect(sonuc.success).toBe(false);
  });

  it('alan adına benzeyen sahte adresi reddeder (instagram.com.kotu.site, kotuinstagram.com)', () => {
    expect(
      socialsSchema.safeParse({ instagram: 'https://instagram.com.kotu.site/a' }).success,
    ).toBe(false);
    expect(socialsSchema.safeParse({ instagram: 'https://kotuinstagram.com/a' }).success).toBe(
      false,
    );
  });

  it('javascript:, data: ve protokolsüz adresleri reddeder', () => {
    for (const adres of [
      'javascript:alert(1)',
      'data:text/html,x',
      'instagram.com/samet',
      'ftp://ornek.com',
    ]) {
      expect(socialsSchema.safeParse({ website: adres }).success, adres).toBe(false);
    }
  });

  it('kullanıcı adı/şifre içeren adresi reddeder', () => {
    expect(socialsSchema.safeParse({ website: 'https://a:b@ornek.com' }).success).toBe(false);
  });

  it('e-posta: `mailto:` önekini atar, küçük harfe indirir, geçersizi reddeder', () => {
    expect(socialsSchema.parse({ email: 'mailto:Samet@Ornek.com' })).toEqual({
      email: 'samet@ornek.com',
    });
    expect(socialsSchema.safeParse({ email: 'eposta-degil' }).success).toBe(false);
  });

  it('bilinmeyen anahtar sessizce düşmez, HATA verir (.strict)', () => {
    expect(socialsSchema.safeParse({ githubb: 'https://github.com/a' }).success).toBe(false);
  });

  it('profil formunun iç içe alan hatası `socials.<anahtar>` yoluna düşüyor', () => {
    const sonuc = updateProfileSchema.safeParse({ socials: { tiktok: 'https://ornek.com' } });
    expect(sonuc.success).toBe(false);
    if (!sonuc.success) expect(sonuc.error.issues[0]?.path).toEqual(['socials', 'tiktok']);
  });
});

describe('alanAdiUyuyorMu', () => {
  it('boş liste her adresi kabul eder (web sitesi)', () => {
    expect(alanAdiUyuyorMu('https://ornek.com', [])).toBe(true);
  });
  it('bozuk adres false', () => {
    expect(alanAdiUyuyorMu('::', ['ornek.com'])).toBe(false);
  });
});

describe('socialsOku — okuma yolunda süzme', () => {
  it('geçerli anahtarları korur, bozuk/bilinmeyen/boş olanları düşürür', () => {
    expect(
      socialsOku({
        github: 'https://github.com/a',
        instagram: 'https://kotu.site/a',
        bilinmeyen: 'https://ornek.com',
        x: '',
        email: 'a@b.com',
      }),
    ).toEqual({ github: 'https://github.com/a', email: 'a@b.com' });
  });

  it('null, dizi ve ilkel değerde boş nesne', () => {
    expect(socialsOku(null)).toEqual({});
    expect(socialsOku(['a'])).toEqual({});
    expect(socialsOku('x')).toEqual({});
  });
});

describe('sosyalBaglantilar / adrestenAyrinti', () => {
  it('yalnızca dolu bağlantılar, sabit sırada; e-posta mailto ve sonda', () => {
    const liste = sosyalBaglantilar({
      email: 'a@b.com',
      website: 'https://ornek.com/',
      x: 'https://x.com/samet',
    });
    expect(liste.map((b) => [b.anahtar, b.href, b.ayrinti])).toEqual([
      ['x', 'https://x.com/samet', '@samet'],
      ['website', 'https://ornek.com/', 'ornek.com'],
      ['email', 'mailto:a@b.com', 'a@b.com'],
    ]);
    expect(sosyalBaglantilar(null)).toEqual([]);
    expect(sosyalBaglantilar({})).toEqual([]);
  });

  it('LinkedIn alt yolu ve YouTube @kanal biçimleri', () => {
    expect(adrestenAyrinti('linkedin', 'https://linkedin.com/company/ornek-sirket')).toBe(
      '@ornek-sirket',
    );
    expect(adrestenAyrinti('youtube', 'https://youtube.com/@kanal')).toBe('@kanal');
    expect(adrestenAyrinti('github', 'https://github.com/')).toBe('github.com');
  });
});
