import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

/**
 * SERVICE WORKER BİLDİRİMİ (2026-11-11). `public/sw.js` derlenmeyen düz bir dosya; gerçek
 * dosya sahte `self` ile yüklenir ve `push` dinleyicisi çağrılır.
 */
type Dinleyici = (e: unknown) => void;

function yukle() {
  const dinleyiciler: Record<string, Dinleyici> = {};
  const showNotification = vi.fn(async () => undefined);
  const self = {
    addEventListener: (ad: string, f: Dinleyici) => {
      dinleyiciler[ad] = f;
    },
    registration: { showNotification },
    location: { origin: 'https://sahinsamet.com' },
  };
  runInNewContext(readFileSync(resolve(__dirname, '../../../public/sw.js'), 'utf8'), {
    self,
    URL,
    caches: {},
    fetch: () => undefined,
  });
  const push = async (veri: unknown) => {
    let bekle: Promise<unknown> = Promise.resolve();
    dinleyiciler.push!({
      data: {
        json: () => {
          if (veri === undefined) throw new Error('boş');
          return veri;
        },
      },
      waitUntil: (p: Promise<unknown>) => {
        bekle = p;
      },
    });
    await bekle;
    return showNotification.mock.calls[0] as unknown as [string, Record<string, unknown>];
  };
  return { push };
}

describe('sw.js push', () => {
  it('yeni yük: etiket sunucudan, renkli ikon + tek renkli rozet, titreşim ve zaman', async () => {
    const [baslik, s] = await yukle().push({
      baslik: '🩺 Sağlık / Doktor',
      govde: 'Diş hekimi',
      url: '/panel/takvim?gorunum=gun&tarih=2026-11-10',
      tur: 'takvim',
      etiket: 'takvim:e1:2026-11-10T11:30:00.000Z',
    });
    expect(baslik).toBe('🩺 Sağlık / Doktor');
    expect(s).toMatchObject({
      body: 'Diş hekimi',
      icon: '/icon.png',
      badge: '/bildirim-rozet.png',
      tag: 'takvim:e1:2026-11-10T11:30:00.000Z',
      renotify: true,
      data: { url: '/panel/takvim?gorunum=gun&tarih=2026-11-10', tur: 'takvim' },
    });
    expect(s.requireInteraction).toBeUndefined();
    expect(Array.isArray(s.vibrate)).toBe(true);
    expect(typeof s.timestamp).toBe('number');
  });

  it('eski yük (etiketsiz) bozulmaz: etiket adresten türetilir', async () => {
    const [, s] = await yukle().push({ baslik: 'Su', govde: 'x', url: '/panel' });
    expect(s.tag).toBe('sahinsamet:/panel');
    expect(s.renotify).toBe(true);
  });

  it('boş yük: varsayılan başlık ve adres', async () => {
    const [baslik, s] = await yukle().push(undefined);
    expect(baslik).toBe('SŞ Panel');
    expect(s).toMatchObject({ body: '', data: { url: '/panel' }, tag: 'sahinsamet:/panel' });
  });
});
