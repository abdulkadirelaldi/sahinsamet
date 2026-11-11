import { describe, expect, it } from 'vitest';

import { bildirimEtiketi, bildirimYuku } from '@/server/services/bildirim';

describe('bildirimEtiketi — yeni bildirim hangisinin yerine geçer', () => {
  it('durum hatırlatmaları türün tek etiketini paylaşır: yeni su eskisini siler', () => {
    expect(bildirimEtiketi('su', 's9')).toBe('su');
    expect(bildirimEtiketi('su', 's13')).toBe('su');
    expect(bildirimEtiketi('aliskanlik', 'aksam')).toBe('aliskanlik');
    expect(bildirimEtiketi('ingilizce', 'seri')).toBe('ingilizce');
  });

  it('takvim: aynı oluşumun farklı öncelikli hatırlatmaları aynı etiket', () => {
    const bas = 'e1:2026-11-10T11:30:00.000Z';
    expect(bildirimEtiketi('takvim', `${bas}:1440`)).toBe(`takvim:${bas}`);
    expect(bildirimEtiketi('takvim', `${bas}:15`)).toBe(`takvim:${bas}`);
    expect(bildirimEtiketi('takvim', 'e2:2026-11-10T11:30:00.000Z:15')).not.toBe(`takvim:${bas}`);
  });

  it('diğerleri tür + anahtar: iki borç birbirini silmez; anahtarsızsa tür', () => {
    expect(bildirimEtiketi('borc', 'b1:2026-11-12')).toBe('borc:b1:2026-11-12');
    expect(bildirimEtiketi('borc', 'b2:2026-11-12')).not.toBe(
      bildirimEtiketi('borc', 'b1:2026-11-12'),
    );
    expect(bildirimEtiketi('test')).toBe('test');
  });
});

describe('bildirimYuku', () => {
  it('türsüz yük eski biçimde kalır (geriye uyum)', () => {
    expect(JSON.parse(bildirimYuku({ baslik: 'a', govde: 'b', url: '/panel' }))).toEqual({
      baslik: 'a',
      govde: 'b',
      url: '/panel',
    });
  });

  it('türlü yük tür ve etiket taşır', () => {
    const yuk = JSON.parse(
      bildirimYuku({ baslik: 'a', govde: 'b', url: '/panel', tur: 'borc', anahtar: 'b1:x' }),
    );
    expect(yuk).toEqual({
      baslik: 'a',
      govde: 'b',
      url: '/panel',
      tur: 'borc',
      etiket: 'borc:b1:x',
    });
  });
});
