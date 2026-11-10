import { describe, expect, it } from 'vitest';

import {
  HATIRLATMA_TOLERANSI_MS,
  hatirlatmaAnahtari,
  hatirlatmaAni,
  hatirlatmaEtiketi,
  hatirlatmaMetni,
  kalanMetni,
  sureMetni,
  vadesiGelenler,
  varsayilanHatirlatmalar,
  type HatirlatmaliEtkinlik,
} from '@/lib/takvim/hatirlatma';
import { TEKRAR_YOK } from '@/lib/takvim/tekrar';
import { appDayStartInstant, appWallClockInstant } from '@/server/services/_shared/app-date';

function etkinlik(e: Partial<HatirlatmaliEtkinlik> = {}): HatirlatmaliEtkinlik {
  const baslangic = appWallClockInstant('2026-11-10', 14 * 60 + 30); // 11:30Z
  return {
    id: 'e1',
    baslik: 'Diş hekimi',
    konum: 'Kadıköy',
    kategori: 'SAGLIK',
    tumGun: false,
    baslangic,
    bitis: new Date(baslangic.getTime() + 60 * 60_000),
    tekrar: TEKRAR_YOK,
    istisnalar: [],
    hatirlatmalar: [30],
    ...e,
  };
}

const an = (iso: string) => new Date(iso);

describe('etiketler', () => {
  it('varsayılanlar: saatli 30 dk, tüm gün aynı gün 09:00', () => {
    expect(varsayilanHatirlatmalar(false)).toEqual([30]);
    expect(varsayilanHatirlatmalar(true)).toEqual([0]);
  });

  it('süre metni', () => {
    expect(sureMetni(5)).toBe('5 dk');
    expect(sureMetni(60)).toBe('1 saat');
    expect(sureMetni(90)).toBe('1 saat 30 dk');
    expect(sureMetni(2880)).toBe('2 gün');
    expect(sureMetni(10080)).toBe('1 hafta');
  });

  it('saatli etiketler', () => {
    expect(hatirlatmaEtiketi(0, false)).toBe('Başlangıçta');
    expect(hatirlatmaEtiketi(15, false)).toBe('15 dk önce');
    expect(hatirlatmaEtiketi(1440, false)).toBe('1 gün önce');
  });

  it('tüm gün etiketleri 09:00 çapasına göre', () => {
    expect(hatirlatmaEtiketi(0, true)).toBe('Gününde 09:00');
    expect(hatirlatmaEtiketi(60, true)).toBe('Gününde 08:00');
    expect(hatirlatmaEtiketi(1440, true)).toBe('1 gün önce 09:00');
    expect(hatirlatmaEtiketi(600, true)).toBe('1 gün önce 23:00');
    expect(hatirlatmaEtiketi(10080, true)).toBe('1 hafta önce 09:00');
  });

  it('kalan metni', () => {
    expect(kalanMetni(0)).toBe('şimdi');
    expect(kalanMetni(30)).toBe('30 dk sonra');
    expect(kalanMetni(60)).toBe('1 saat sonra');
    expect(kalanMetni(75)).toBe('1 saat 15 dk sonra');
    expect(kalanMetni(2880)).toBe('2 gün sonra');
  });
});

describe('hatirlatmaAni', () => {
  it('saatli: başlangıçtan önce', () => {
    const e = etkinlik();
    expect(
      hatirlatmaAni({ baslangic: e.baslangic, gun: '2026-11-10' }, false, 30).toISOString(),
    ).toBe('2026-11-10T11:00:00.000Z');
  });

  it('tüm gün: o günün İstanbul 09:00ından önce', () => {
    const o = { baslangic: appDayStartInstant('2026-11-10'), gun: '2026-11-10' };
    expect(hatirlatmaAni(o, true, 0).toISOString()).toBe('2026-11-10T06:00:00.000Z');
    expect(hatirlatmaAni(o, true, 1440).toISOString()).toBe('2026-11-09T06:00:00.000Z');
  });
});

describe('hatirlatmaAnahtari — tekrar önleme', () => {
  it('etkinlik + oluşum başlangıcı + öncelik', () => {
    expect(hatirlatmaAnahtari('e1', an('2026-11-10T11:30:00Z'), 30)).toBe(
      'e1:2026-11-10T11:30:00.000Z:30',
    );
  });

  it('aynı etkinliğin farklı oluşumu ve farklı önceliği farklı anahtar', () => {
    const a = hatirlatmaAnahtari('e1', an('2026-11-10T11:30:00Z'), 30);
    expect(hatirlatmaAnahtari('e1', an('2026-11-11T11:30:00Z'), 30)).not.toBe(a);
    expect(hatirlatmaAnahtari('e1', an('2026-11-10T11:30:00Z'), 10)).not.toBe(a);
  });
});

describe('vadesiGelenler', () => {
  it('vakti gelince gönderilir (14:30 etkinliği, 30 dk önce → 14:00)', () => {
    const v = vadesiGelenler([etkinlik()], an('2026-11-10T11:00:20Z'));
    expect(v).toHaveLength(1);
    expect(v[0]!.anahtar).toBe('e1:2026-11-10T11:30:00.000Z:30');
    expect(v[0]!.an.toISOString()).toBe('2026-11-10T11:00:00.000Z');
  });

  it('vakti gelmeden gönderilmez', () => {
    expect(vadesiGelenler([etkinlik()], an('2026-11-10T10:59:59Z'))).toEqual([]);
  });

  it('⚠️ tolerans dışında (sunucu kapalı kaldı) yığılıp gelmez', () => {
    const sinir = new Date(Date.parse('2026-11-10T11:00:00Z') + HATIRLATMA_TOLERANSI_MS);
    expect(vadesiGelenler([etkinlik()], sinir)).toHaveLength(1);
    expect(vadesiGelenler([etkinlik()], new Date(sinir.getTime() + 1))).toEqual([]);
  });

  it('etkinlik bittiyse gönderilmez — tolerans içinde olsa da', () => {
    const e = etkinlik({ hatirlatmalar: [0] });
    e.bitis = new Date(e.baslangic.getTime() + 5 * 60_000);
    expect(vadesiGelenler([e], an('2026-11-10T11:34:00Z'))).toHaveLength(1);
    expect(vadesiGelenler([e], an('2026-11-10T11:35:00Z'))).toEqual([]);
  });

  it('süresi sıfır etkinlikte "başlangıçta" hatırlatması tolerans içinde gider', () => {
    const e = etkinlik({ hatirlatmalar: [0] });
    e.bitis = e.baslangic;
    expect(vadesiGelenler([e], an('2026-11-10T11:31:00Z'))).toHaveLength(1);
  });

  it('birden çok öncelik ayrı ayrı; hatırlatmasız etkinlik atlanır', () => {
    const e = etkinlik({ hatirlatmalar: [10, 30, 30] });
    expect(vadesiGelenler([e], an('2026-11-10T11:00:00Z')).map((v) => v.dk)).toEqual([30]);
    expect(vadesiGelenler([e], an('2026-11-10T11:20:00Z')).map((v) => v.dk)).toEqual([10]);
    expect(vadesiGelenler([etkinlik({ hatirlatmalar: [] })], an('2026-11-10T11:00:00Z'))).toEqual(
      [],
    );
  });

  it('tüm gün: "1 gün önce 09:00" önceki gün 09:00da', () => {
    const e = etkinlik({
      tumGun: true,
      baslangic: appDayStartInstant('2026-11-12'),
      bitis: appDayStartInstant('2026-11-13'),
      hatirlatmalar: [1440, 0],
    });
    const once = vadesiGelenler([e], an('2026-11-11T06:00:30Z'));
    expect(once.map((v) => v.dk)).toEqual([1440]);
    expect(vadesiGelenler([e], an('2026-11-12T06:01:00Z')).map((v) => v.dk)).toEqual([0]);
  });

  it('tekrarlayan etkinliğin her oluşumu kendi anahtarıyla; istisna günü yok', () => {
    const e = etkinlik({
      tekrar: { ...TEKRAR_YOK, tur: 'GUNLUK' },
      istisnalar: ['2026-11-12'],
      hatirlatmalar: [30],
    });
    expect(vadesiGelenler([e], an('2026-11-11T11:00:00Z'))[0]!.anahtar).toBe(
      'e1:2026-11-11T11:30:00.000Z:30',
    );
    expect(vadesiGelenler([e], an('2026-11-12T11:00:00Z'))).toEqual([]);
  });

  it('4 hafta önceki hatırlatma da pencereye girer', () => {
    const e = etkinlik({ hatirlatmalar: [40320] });
    expect(vadesiGelenler([e], an('2026-10-13T11:30:00Z'))).toHaveLength(1);
  });
});

describe('hatirlatmaMetni — Türkçe push', () => {
  it('bugün: "Diş hekimi · 14:30\'da (30 dk sonra) · Kadıköy"', () => {
    const e = etkinlik();
    const m = hatirlatmaMetni(
      e,
      { baslangic: e.baslangic, gun: '2026-11-10' },
      an('2026-11-10T11:00:00Z'),
    );
    expect(m).toEqual({
      baslik: '🩺 Sağlık / Doktor',
      govde: "Diş hekimi · 14:30'da (30 dk sonra) · Kadıköy",
      url: '/panel/takvim?gorunum=gun&tarih=2026-11-10',
    });
  });

  it('yarın ve konumsuz', () => {
    const e = etkinlik({ konum: null, kategori: 'TOPLANTI', baslik: 'Sprint' });
    const m = hatirlatmaMetni(
      e,
      { baslangic: e.baslangic, gun: '2026-11-10' },
      an('2026-11-09T11:30:00Z'),
    );
    expect(m.govde).toBe("Sprint · Yarın 14:30'da (1 gün sonra)");
    expect(m.baslik).toBe('👥 Toplantı');
  });

  it('tüm gün', () => {
    const e = etkinlik({ tumGun: true, konum: null, baslik: 'Doğum günü', kategori: 'KISISEL' });
    const m = hatirlatmaMetni(
      e,
      { baslangic: appDayStartInstant('2026-11-12'), gun: '2026-11-12' },
      an('2026-11-10T06:00:00Z'),
    );
    expect(m.govde).toBe('Doğum günü · 12 Kasım Perşembe (tüm gün)');
  });
});
