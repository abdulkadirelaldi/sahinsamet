import { describe, expect, it, vi } from 'vitest';

import {
  istanbulGunu,
  kayitOzeti,
  kuyruguIsle,
  type GonderimSonucu,
  type KuyrukKaydi,
} from '@/components/panel/hizli-kuyruk';
import { kuyrukGunu } from '@/server/services/cuzdan';

const kayit = (id: string): KuyrukKaydi => ({ id, tur: 'su', girdi: { ml: 250 } });
const sirali = (...sonuclar: GonderimSonucu[]) => {
  const fn = vi.fn<(k: KuyrukKaydi) => Promise<GonderimSonucu>>();
  for (const s of sonuclar) fn.mockResolvedValueOnce(s);
  return fn;
};

describe('kuyruguIsle — çevrimdışı kuyruk (2026-10-31)', () => {
  it('hepsi giderse kuyruk boşalır', async () => {
    const s = await kuyruguIsle([kayit('a'), kayit('b')], sirali('tamam', 'tamam'));
    expect(s).toEqual({ kalan: [], gonderilen: 2, reddedilen: [] });
  });

  it('⚠️ ağ yine yoksa durur, kalanlar SIRAYLA korunur', async () => {
    const g = sirali('tamam', 'bekle');
    const s = await kuyruguIsle([kayit('a'), kayit('b'), kayit('c')], g);
    expect(s.kalan.map((k) => k.id)).toEqual(['b', 'c']);
    expect(s.gonderilen).toBe(1);
    expect(g).toHaveBeenCalledTimes(2);
  });

  it('fırlatan gönderici kaydı KAYBETMEZ', async () => {
    const s = await kuyruguIsle([kayit('a')], vi.fn().mockRejectedValue(new TypeError('ağ')));
    expect(s.kalan.map((k) => k.id)).toEqual(['a']);
  });

  it('reddedilen kayıt kuyruğu tıkamaz', async () => {
    const s = await kuyruguIsle([kayit('a'), kayit('b')], sirali('red', 'tamam'));
    expect(s.kalan).toEqual([]);
    expect(s.gonderilen).toBe(1);
    expect(s.reddedilen).toHaveLength(1);
  });
});

describe('günler', () => {
  it('İstanbul günü: UTC 22:00 ertesi gündür', () => {
    expect(istanbulGunu(new Date('2026-10-30T22:00:00Z'))).toBe('2026-10-31');
  });

  it('kuyruk günü: geçmiş korunur, gelecek ve 30 günden eskisi bugün olur', () => {
    const bugun = '2026-10-31';
    expect(kuyrukGunu('2026-10-29', bugun)).toBe('2026-10-29');
    expect(kuyrukGunu('2026-11-01', bugun)).toBe(bugun);
    expect(kuyrukGunu('2026-09-01', bugun)).toBe(bugun);
    expect(kuyrukGunu(undefined, bugun)).toBe(bugun);
  });
});

describe('kayitOzeti (2026-11-01)', () => {
  const k = (tur: KuyrukKaydi['tur'], girdi: Record<string, unknown>): KuyrukKaydi => ({
    id: 'x',
    tur,
    girdi,
  });
  it('kaydı okunur yazar', () => {
    expect(kayitOzeti(k('harcama', { tutar: '77.50', ne: 'Yemek', gun: '2026-10-30' }))).toBe(
      '77,50 ₺ · Yemek · 30 Ekim',
    );
    expect(kayitOzeti(k('kilo', { kg: '82.5' }))).toBe('82,5 kg');
    expect(kayitOzeti(k('su', { ml: 250 }))).toBe('250 ml su');
    expect(kayitOzeti(k('uyku', { saat: '7.5' }))).toBe('7,5 saat uyku');
  });
});

describe('sıra kapanmaz (2026-11-02)', () => {
  const kayit = (id: string, deneme?: number) => ({
    id,
    tur: 'su' as const,
    girdi: { ml: 250 },
    ...(deneme ? { deneme } : {}),
  });

  it('⚠️ sunucunun işleyemediği kayıt arkasındakileri bekletmez', async () => {
    const sonuc = await kuyruguIsle([kayit('a'), kayit('b')], async (k) =>
      k.id === 'a' ? 'atla' : 'tamam',
    );
    expect(sonuc.gonderilen).toBe(1);
    expect(sonuc.kalan).toEqual([kayit('a', 1)]);
  });

  it('⚠️ deneme hakkı bitince sessizce silinmez, eklenemeyenlere geçer', async () => {
    const sonuc = await kuyruguIsle([kayit('a', 4)], async () => 'atla');
    expect(sonuc.kalan).toEqual([]);
    expect(sonuc.reddedilen.map((k) => k.id)).toEqual(['a']);
  });

  it('ağ yoksa (bekle) sıra korunur, atlananlar başta kalır', async () => {
    const sonuc = await kuyruguIsle([kayit('a'), kayit('b'), kayit('c')], async (k) =>
      k.id === 'a' ? 'atla' : k.id === 'b' ? 'bekle' : 'tamam',
    );
    expect(sonuc.kalan.map((k) => k.id)).toEqual(['a', 'b', 'c']);
  });
});
