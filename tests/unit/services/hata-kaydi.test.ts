import { describe, expect, it, vi } from 'vitest';

import { hataImzasi, hataKaydet, hataMetni, hataYolu } from '@/server/services/hata-kaydi';

describe('hata kaydı — kişisel veri tutmaz (2026-10-31)', () => {
  it('yalnızca ilk satır, 300 karakter; e-posta ve uzun sayı maskelenir', () => {
    expect(hataMetni('Kullanıcı ali@ornek.com bulunamadı\n    at foo (bar.ts:1)')).toBe(
      'Kullanıcı [e-posta] bulunamadı',
    );
    expect(hataMetni('Kart 4111111111111111 reddedildi, kod 42')).toBe(
      'Kart [sayı] reddedildi, kod 42',
    );
    expect(hataMetni('x'.repeat(500))).toHaveLength(300);
  });

  it('yol: sorgu dizesi atılır, kayıt kimliği tek forma iner', () => {
    expect(hataYolu('/panel/cuzdan/borc/ckabcdefghijklmnopqrstuv?gizli=1#x')).toBe(
      '/panel/cuzdan/borc/[id]',
    );
    expect(hataYolu(null)).toBeNull();
  });

  it('aynı hata aynı imza → sayaç artar, yeni satır açılmaz', async () => {
    const upsert = vi.fn();
    const client = { hataKaydi: { upsert } } as never;
    const simdi = new Date('2026-10-31T10:00:00Z');
    await hataKaydet(
      { kaynak: 'sunucu', ad: 'TypeError', mesaj: 'x tanımsız', yol: '/panel?a=1' },
      client,
      simdi,
    );
    const arg = upsert.mock.calls[0]?.[0];
    expect(arg.where.imza).toBe(hataImzasi('sunucu', 'TypeError', 'x tanımsız', '/panel'));
    expect(arg.update).toEqual({ sayi: { increment: 1 }, son: simdi });
    expect(arg.create).toMatchObject({ kaynak: 'sunucu', ad: 'TypeError', yol: '/panel' });
  });

  it('kayıt yazılamazsa FIRLATMAZ — asıl hatayı büyütmez', async () => {
    const client = {
      hataKaydi: { upsert: vi.fn().mockRejectedValue(new Error('db yok')) },
    } as never;
    await expect(
      hataKaydet({ kaynak: 'istemci', ad: 'E', mesaj: 'm' }, client),
    ).resolves.toBeUndefined();
  });
});
