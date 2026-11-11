import { describe, expect, it } from 'vitest';

import { platformBul } from '@/lib/platform';

/** Bildirim ayarları doğru yönergeyi göstersin: Android'e iOS'unki, iPhone'a Android'inki yok. */
describe('platformBul', () => {
  it('Poco X7 Pro Chrome (kısaltılmış kimlik: model gizli) → android', () => {
    expect(
      platformBul(
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
        5,
      ),
    ).toBe('android');
  });

  it('modelli eski kimlik de android', () => {
    expect(platformBul('Mozilla/5.0 (Linux; Android 15; 24117RK2CG Build/AQ3A) Chrome/131')).toBe(
      'android',
    );
  });

  it('iPhone → ios', () => {
    expect(
      platformBul(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1',
        5,
      ),
    ).toBe('ios');
  });

  it('iPadOS kendini Mac diye tanıtır: dokunma noktası ayırır', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
    expect(platformBul(ua, 5)).toBe('ios');
    expect(platformBul(ua, 0)).toBe('diger');
  });

  it('masaüstü Chrome → diger', () => {
    expect(
      platformBul(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0 Safari/537.36',
      ),
    ).toBe('diger');
  });
});
