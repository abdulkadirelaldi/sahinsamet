import { describe, expect, it } from 'vitest';

import { planla, vapidAyarlari, type PlanGirdisi } from '@/server/services/bildirim';

const temel: PlanGirdisi = {
  gun: '2026-10-30',
  saat: 10,
  tercih: { borc: true, aliskanlik: true, su: true },
  borclar: [],
  kalanAliskanliklar: [],
  suMl: 4000,
};

describe('planla — ne zaman ne gider', () => {
  it('borç: 2 gün önce ve ödeme günü, 09–21 arası', () => {
    const borclar = [{ id: 'kk', ad: 'Kredi kartı', odemeGunu: 1, tutar: '4.500,00 ₺' }];
    // 30 Ekim → 2 gün sonra 1 Kasım (ay geçişi)
    const once = planla({ ...temel, borclar });
    expect(once).toEqual([
      expect.objectContaining({
        tur: 'borc',
        anahtar: 'kk:2026-11-01',
        baslik: 'Ödeme yaklaşıyor',
        govde: 'Kredi kartı — 2 gün sonra · 4.500,00 ₺',
      }),
    ]);
    const gunu = planla({ ...temel, gun: '2026-11-01', borclar });
    expect(gunu[0]).toMatchObject({ baslik: 'Bugün ödeme günü', anahtar: 'kk:2026-11-01' });
    // İki bildirim AYNI anahtarı paylaşmıyor? Paylaşıyor ama farklı GÜNLERDE — kayıt (tür, anahtar, gün).
    expect(planla({ ...temel, saat: 8, borclar })).toEqual([]);
    expect(planla({ ...temel, saat: 21, borclar })).toEqual([]);
  });

  it("⚠️ 31'inde ödenen borç kısa ayda son güne düşer", () => {
    const borclar = [{ id: 'k', ad: 'Kira', odemeGunu: 31, tutar: null }];
    expect(planla({ ...temel, gun: '2027-02-28', borclar })[0]).toMatchObject({
      baslik: 'Bugün ödeme günü',
      govde: 'Kira',
    });
    expect(planla({ ...temel, gun: '2027-02-26', borclar })[0]).toMatchObject({
      baslik: 'Ödeme yaklaşıyor',
    });
  });

  it('alışkanlık: 21:00 sonrası, kalan varsa', () => {
    const kalan = ['Kitap oku', 'İngilizce'];
    expect(planla({ ...temel, saat: 20, kalanAliskanliklar: kalan })).toEqual([]);
    expect(planla({ ...temel, saat: 21, kalanAliskanliklar: kalan })).toEqual([
      expect.objectContaining({
        baslik: 'Bugün 2 alışkanlık kaldı',
        govde: 'Kitap oku, İngilizce',
      }),
    ]);
    expect(planla({ ...temel, saat: 22, kalanAliskanliklar: [] })).toEqual([]);
  });

  it('su: yalnızca 11/15/18 penceresinde ve hedefin altındaysa; birikmez', () => {
    const az = { ...temel, suMl: 1250 };
    expect(planla({ ...az, saat: 10 })).toEqual([]);
    expect(planla({ ...az, saat: 11 })).toEqual([
      expect.objectContaining({ anahtar: 's11', govde: 'Bugün 1,25 L içtin, hedef 3,5 L.' }),
    ]);
    expect(planla({ ...az, saat: 14 })).toEqual([]);
    // 19:00'da kalkan sunucu yalnızca 18'in hatırlatmasını gönderir, sabahınkileri değil.
    expect(planla({ ...az, saat: 19 }).map((b) => b.anahtar)).toEqual(['s18']);
    expect(planla({ ...temel, saat: 15, suMl: 3500 })).toEqual([]);
  });

  it('su: kişisel saat ve hedef', () => {
    const tercih = { ...temel.tercih, suHedefMl: 2000, suSaatleri: [18, 9] };
    const az = { ...temel, tercih, suMl: 1500 };
    expect(planla({ ...az, saat: 11 })).toEqual([]);
    expect(planla({ ...az, saat: 9 })).toEqual([
      expect.objectContaining({ anahtar: 's9', govde: 'Bugün 1,5 L içtin, hedef 2 L.' }),
    ]);
    // Sıralı gelmese de en yakın geçmiş saat seçilir.
    expect(planla({ ...az, saat: 19 }).map((b) => b.anahtar)).toEqual(['s18']);
    // Varsayılan hedefin altında ama kişisel hedefe ulaşılmış: hatırlatma yok.
    expect(planla({ ...az, saat: 9, suMl: 2000 })).toEqual([]);
  });

  it('alışkanlık: kişisel saat', () => {
    const tercih = { ...temel.tercih, aliskanlikSaati: 19 };
    const kalan = { ...temel, tercih, kalanAliskanliklar: ['Kitap oku'] };
    expect(planla({ ...kalan, saat: 18 })).toEqual([]);
    expect(planla({ ...kalan, saat: 19 }).map((b) => b.anahtar)).toEqual(['aksam']);
  });

  it('kapalı tercih gönderilmez', () => {
    const kapali = { borc: false, aliskanlik: false, su: false };
    expect(
      planla({
        ...temel,
        saat: 21,
        tercih: kapali,
        suMl: 0,
        kalanAliskanliklar: ['x'],
        borclar: [{ id: 'k', ad: 'K', odemeGunu: 30, tutar: null }],
      }),
    ).toEqual([]);
  });
});

describe('vapidAyarlari', () => {
  it('anahtar yoksa özellik kapalı', () => {
    expect(vapidAyarlari({})).toBeNull();
    expect(vapidAyarlari({ VAPID_PUBLIC_KEY: 'a', VAPID_PRIVATE_KEY: 'b' })).toMatchObject({
      publicKey: 'a',
      subject: 'mailto:bildirim@sahinsamet.com',
    });
  });
});

describe('planla · düzenli gider (2026-11-01)', () => {
  const kira = { id: 'k', ad: 'Kira', tutar: '8.000,00 ₺', ayinGunu: 5, yillik: null };
  const sigorta = { id: 's', ad: 'Sigorta', tutar: '3.000,00 ₺', ayinGunu: null, yillik: '11-15' };

  it('aylık: 2 gün önce ve günü; başka gün yok', () => {
    expect(planla({ ...temel, gun: '2026-11-03', giderler: [kira] })[0]).toMatchObject({
      baslik: 'Ödeme yaklaşıyor',
      govde: 'Kira — 2 gün sonra · 8.000,00 ₺',
    });
    expect(planla({ ...temel, gun: '2026-11-05', giderler: [kira] })[0]).toMatchObject({
      baslik: 'Bugün ödeme günü',
    });
    expect(planla({ ...temel, gun: '2026-11-04', giderler: [kira] })).toEqual([]);
  });

  it('⚠️ onaylanan ay hatırlatılmaz', () => {
    expect(
      planla({
        ...temel,
        gun: '2026-11-05',
        giderler: [kira],
        giderOdenen: new Set(['k:2026-11']),
      }),
    ).toEqual([]);
  });

  it('yıllık: 7 gün önce ve günü', () => {
    expect(planla({ ...temel, gun: '2026-11-08', giderler: [sigorta] })[0]?.govde).toContain(
      '7 gün sonra',
    );
    expect(planla({ ...temel, gun: '2026-11-15', giderler: [sigorta] })).toHaveLength(1);
    expect(planla({ ...temel, gun: '2026-11-10', giderler: [sigorta] })).toEqual([]);
  });

  it('tercih kapalıysa ve gece gönderilmez', () => {
    const kapali = { ...temel.tercih, borc: false };
    expect(planla({ ...temel, gun: '2026-11-05', tercih: kapali, giderler: [kira] })).toEqual([]);
    expect(planla({ ...temel, gun: '2026-11-05', saat: 23, giderler: [kira] })).toEqual([]);
  });
});
