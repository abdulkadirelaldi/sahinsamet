import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { auditLogFilterSchema } from '@/lib/schemas';
import {
  SHOWN_DIFF_VALUE_KEYS,
  buildAuditLogWhere,
  fetchAuditLog,
  toDiffSummary,
  type AuditLogReadClient,
} from '@/server/services/audit-log';
import { buildDiff, writeAuditLog } from '@/server/services/_shared';

/**
 * DENETİM KAYDI OKUMA YOLU — §4.2, T-052.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "ADR-034'ÜN ÖLÇÜLEN SIZINTISI EKRANA
 * ULAŞMIYOR": `diff`i okuyup kullanıcıya basmak yeni bir maruziyet yüzeyi ve
 * kararın gerçekten çalıştığı ancak GERÇEK `writeAuditLog` ile ölçülebilir
 * (ADR-034'ün bağlayıcı kuralı — taklit edilmeden).
 */

const KOK = resolve(__dirname, '../../..');

/** Varsayılan filtre — şemadan geçirilmiş, elle kurulmuş değil. */
function filtre(ek: Record<string, unknown> = {}) {
  return auditLogFilterSchema.parse(ek);
}

function istemci(rows: unknown[] = [], total = rows.length) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const count = vi.fn().mockResolvedValue(total);
  const client = { auditLog: { findMany, count } } as unknown as AuditLogReadClient;
  return { client, findMany, count };
}

function satir(ek: Record<string, unknown> = {}) {
  return {
    id: 'log_1',
    action: 'UPDATE' as const,
    entity: 'Project',
    entityId: 'prj_1',
    actorId: 'usr_1',
    diff: {},
    ip: '10.0.0.1',
    createdAt: new Date('2026-10-09T12:00:00.000Z'),
    ...ek,
  };
}

/* ===========================================================================
 * ⚠️⚠️ DIFF KARARI — DEĞER EKRANA ÇIKMAZ
 * ======================================================================== */

describe('toDiffSummary — alan adları çıkar, DEĞERLER çıkmaz', () => {
  it('önce/sonra çifti TEK ALAN olarak görünür, değerleri görünmez', () => {
    const ozet = toDiffSummary(
      buildDiff({ slug: 'eski', status: 'DRAFT' }, { slug: 'yeni', status: 'PUBLISHED' }),
    );

    expect(ozet.fields).toEqual(['slug', 'status']);
    // `slug.before` / `slug.after` diye İKİ satır olmamalı — tek alan değişti.
    expect(ozet.fields).not.toContain('slug.before');
    expect(ozet.values).toEqual({});
    // Değerlerin hiçbiri özette GEÇMİYOR.
    const metin = JSON.stringify(ozet);
    for (const deger of ['eski', 'yeni', 'DRAFT', 'PUBLISHED']) {
      expect(metin, `${deger} ekrana sızdı`).not.toContain(deger);
    }
  });

  it('iç içe silme farkı YOLA düzleşiyor — hangi alanların gittiği kayboluyor', () => {
    // BULGU-019 kalıbı: `{ deleted: { … } }`.
    const ozet = toDiffSummary({
      deleted: { title: 'Gizli başlık', description: 'Gizli açıklama', order: 3 },
    });

    expect(ozet.fields).toEqual(['deleted.title', 'deleted.description', 'deleted.order']);
    expect(ozet.values).toEqual({});
    expect(JSON.stringify(ozet)).not.toContain('Gizli');
  });

  it('BEYAZ LİSTEDEKİ anahtarların değeri görünüyor — ADR-034 kalıbı okunabilir kalsın', () => {
    // T-042s'in kalıbı: değer bir BAĞLAM ve bir ALAN ADI, kayıt içeriği değil.
    const ozet = toDiffSummary({ context: 'CHANGE_PASSWORD', changed: 'passwordHash' });

    expect(ozet.fields).toEqual(['context', 'changed']);
    expect(ozet.values).toEqual({ context: 'CHANGE_PASSWORD', changed: 'passwordHash' });
  });

  it('`socialsChanged` dizisi okunabilir — zaten yalnızca ANAHTAR ADLARI', () => {
    const ozet = toDiffSummary({ socialsChanged: ['github', 'linkedin'] });
    expect(ozet.values).toEqual({ socialsChanged: 'github, linkedin' });
  });

  it('beyaz liste YOLUN SON PARÇASINA bakıyor', () => {
    const ozet = toDiffSummary({ deleted: { context: 'TOTP_SETUP' } });
    expect(ozet.values).toEqual({ 'deleted.context': 'TOTP_SETUP' });
  });

  it('beyaz liste DIŞINDAKİ her anahtarın değeri DÜŞÜYOR — varsayılan reddet', () => {
    const ozet = toDiffSummary({ title: 'Gizli', note: 'Gizli not', amount: 1250 });

    expect(ozet.fields).toEqual(['title', 'note', 'amount']);
    expect(ozet.values).toEqual({});
  });

  it('beyaz listedeki DİZİ iç içe üye taşıyorsa TAMAMI düşüyor', () => {
    /*
     * Beyaz listenin dayanağı "değer bir ADDIR" varsayımı. Bir üye nesne ise o
     * varsayım kırılmış demektir; kalan ilkel üyeleri basıp devam etmek,
     * varsayımı sessizce aşmak olurdu. Kısmi gösterim YOK — hepsi ya da hiç.
     */
    const ozet = toDiffSummary({ socialsChanged: ['github', { gizli: 'deger' }] });

    expect(ozet.fields).toEqual(['socialsChanged']);
    expect(ozet.values).toEqual({});
    expect(JSON.stringify(ozet)).not.toContain('deger');
  });

  it('sayı ve boole değerler beyaz listede okunabiliyor', () => {
    expect(toDiffSummary({ changed: 3 }).values).toEqual({ changed: '3' });
    expect(toDiffSummary({ changed: true }).values).toEqual({ changed: 'true' });
  });

  it('beyaz listedeki anahtar NESNE taşıyorsa İÇİNE İNİLİYOR, değer basılmıyor', () => {
    /*
     * Burada iki mekanizma var ve ikisini ayırmak önemli: gezinme nesnenin
     * İÇİNE iniyor, yani yaprak `context` değil `context.gizli` oluyor — ve
     * `gizli` beyaz listede olmadığı için değeri düşüyor. Yani korumayı
     * sağlayan şey "nesne basılmıyor" değil, beyaz listenin SON PARÇAYA
     * bakması. Yol adının kendisi görünüyor; hassas olmayan tek şey o.
     */
    const ozet = toDiffSummary({ context: { gizli: 'deger' } });

    expect(ozet.fields).toEqual(['context.gizli']);
    expect(ozet.values).toEqual({});
    expect(JSON.stringify(ozet)).not.toContain('deger');
  });

  it('BOŞ nesne yaprak sayılıyor ve değeri basılmıyor', () => {
    // Gezinecek anahtar olmadığı için `{}` bir yaprak; `toShownValue` onu
    // dizeye çevirmeyi REDDEDİYOR, yoksa ekranda `[object Object]` çıkardı.
    const ozet = toDiffSummary({ context: {} });

    expect(ozet.fields).toEqual(['context']);
    expect(ozet.values).toEqual({});
  });

  it('DÖNGÜSEL yapı sunucuyu düşürmüyor', () => {
    const donguluk: Record<string, unknown> = { a: 1 };
    donguluk.self = donguluk;

    expect(() => toDiffSummary(donguluk)).not.toThrow();
  });

  it('boş/eksik `diff` boş özet veriyor', () => {
    for (const girdi of [null, undefined, {}]) {
      expect(toDiffSummary(girdi)).toEqual({ fields: [], values: {} });
    }
  });

  it('beyaz liste KÜÇÜK ve bilinen üç anahtardan oluşuyor', () => {
    /*
     * Bu iddia listeyi KİLİTLİYOR. Buraya bir anahtar eklemek maruziyeti
     * bilerek genişletmek demek ve bu test o kararı sessiz bırakmıyor —
     * ekleyen kişi testi de güncellemek, yani gerekçesini yazmak zorunda.
     */
    expect([...SHOWN_DIFF_VALUE_KEYS].sort()).toEqual(['changed', 'context', 'socialsChanged']);
  });
});

/* ===========================================================================
 * ⚠️⚠️⚠️ ADR-034'ÜN BAĞLAYICI KURALI — `writeAuditLog` TAKLİT EDİLMEDEN
 * ======================================================================== */

describe('ADR-034 sızıntısı EKRANA ULAŞMIYOR — gerçek yazma + gerçek okuma', () => {
  /**
   * ADR-034 üç sızıntı sınıfını ölçtü ve hepsi `redactAuditDiff`ten GEÇİYOR:
   * farklı adla yazılmış sır (`yeniSifre`, `pass`) ve masum anahtarın DEĞERİNE
   * gömülü sır (`note: 'şifre: …'`).
   *
   * Bu blok zinciri uçtan uca kuruyor: GERÇEK `writeAuditLog` (taklit YOK,
   * yani gerçek `redactAuditDiff`) bir satır yazıyor, yazdığı satır
   * yakalanıyor, sonra okuma yolunun özeti üretiliyor. İddia: redaksiyon
   * sızdırsa bile EKRAN sızdırmıyor.
   *
   * Niye böyle kuruldu: redaksiyonun sızdırdığını VARSAYMAK yerine ÖLÇÜYOR.
   * İlk assert o varsayımı test ediyor — ADR-034 bir gün yanlış çıkarsa bu
   * satır kırılır ve alt taraf vakuma düşmez.
   */
  const SIZAN = {
    yeniSifre: 'SIZAN_DEGER_1',
    pass: 'SIZAN_DEGER_2',
    note: 'sifre: SIZAN_DEGER_3',
    // Kara listedeki ad — redaksiyonun YAKALADIĞI küme, kontrol grubu.
    password: 'SIZAN_DEGER_4',
  };

  async function yazilanSatir() {
    const create = vi.fn().mockResolvedValue(undefined);
    await writeAuditLog(
      { actorId: 'usr_1', action: 'UPDATE', entity: 'User', diff: { ...SIZAN } },
      { auditLog: { create } },
    );
    return create.mock.calls[0]?.[0].data as { diff: unknown };
  }

  it('ÖNKOŞUL: redaksiyon GERÇEKTEN sızdırıyor — ADR-034 hâlâ geçerli', async () => {
    const yazilan = JSON.stringify((await yazilanSatir()).diff);

    // Üç sızıntı sınıfı veritabanı satırında DURUYOR.
    expect(yazilan).toContain('SIZAN_DEGER_1');
    expect(yazilan).toContain('SIZAN_DEGER_2');
    expect(yazilan).toContain('SIZAN_DEGER_3');
    // Kontrol grubu: bilinen ad maskelenmiş.
    expect(yazilan).not.toContain('SIZAN_DEGER_4');
    expect(yazilan).toContain('[REDACTED]');
  });

  it('⚠️ EKRANA ÇIKAN ÖZETTE SIZAN DEĞERLERİN HİÇBİRİ YOK', async () => {
    const { diff } = await yazilanSatir();
    const ozet = toDiffSummary(diff);
    const ekran = JSON.stringify(ozet);

    for (const n of [1, 2, 3, 4]) {
      expect(ekran, `SIZAN_DEGER_${n} denetim ekranına ulaştı`).not.toContain(`SIZAN_DEGER_${n}`);
    }
    // Maske bile çıkmıyor: değer alanı hiç doldurulmadı.
    expect(ozet.values).toEqual({});
    // Ama BİLGİ KAYBI DEĞİL: hangi alanların dokunduğu görünüyor.
    expect(ozet.fields).toEqual(['yeniSifre', 'pass', 'note', 'password']);
  });

  it('aynı zincir DTO üzerinden de temiz — `fetchAuditLog` ham diff taşımıyor', async () => {
    const { diff } = await yazilanSatir();
    const { client } = istemci([satir({ diff })]);

    const sayfa = await fetchAuditLog(filtre(), client);

    const ekran = JSON.stringify(sayfa);
    for (const n of [1, 2, 3]) {
      expect(ekran).not.toContain(`SIZAN_DEGER_${n}`);
    }
    expect(sayfa.items[0]?.diff.values).toEqual({});
  });
});

/* ===========================================================================
 * FİLTRE DOĞRULUĞU
 * ======================================================================== */

describe('buildAuditLogWhere', () => {
  it('VERİLMEYEN alan `where`e HİÇ girmiyor', () => {
    expect(buildAuditLogWhere(filtre())).toEqual({});
  });

  it('her filtre kendi alanına düşüyor', () => {
    const where = buildAuditLogWhere(
      filtre({ action: 'LOGIN_FAILED', entity: 'User', entityId: 'usr_1', actorId: 'usr_2' }),
    );

    expect(where).toEqual({
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: 'usr_1',
      actorId: 'usr_2',
    });
  });

  it('geçersiz eylem REDDEDİLİYOR — serbest dize geçmiyor', () => {
    expect(auditLogFilterSchema.safeParse({ action: 'YOK_BOYLE' }).success).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️ TARİH SINIRI — ÖLÇÜLEN 00:00–03:00 TUZAĞI
 * ======================================================================== */

describe('tarih aralığı — gün sınırı Europe/Istanbul', () => {
  /**
   * ÖLÇÜLDÜ (T-052): `createdAt` bir `DateTime` ve sınır olarak UTC gece
   * yarısını almak o günün Istanbul'daki İLK ÜÇ SAATİNİ sessizce düşürüyordu.
   * Gece yapılan bir panel değişikliği denetim ekranında hiç görünmezdi.
   */
  it('`from` o günün Istanbul gece yarısı — UTC gece yarısı DEĞİL', () => {
    const where = buildAuditLogWhere(filtre({ from: '2026-10-10' }));
    const createdAt = where.createdAt as { gte: Date };

    expect(createdAt.gte.toISOString()).toBe('2026-10-09T21:00:00.000Z');
    // Naif uygulama bunu üretirdi; ürettiği gün bu assert kırılır.
    expect(createdAt.gte.toISOString()).not.toBe('2026-10-10T00:00:00.000Z');
  });

  it('⚠️ 01:30 Istanbul`da yazılan satır AYNI GÜNE düşüyor', () => {
    const where = buildAuditLogWhere(filtre({ from: '2026-10-10', to: '2026-10-10' }));
    const { gte, lt } = where.createdAt as { gte: Date; lt: Date };

    // Istanbul'da 10 Ekim 01:30 = UTC 9 Ekim 22:30.
    const geceSatiri = new Date('2026-10-10T01:30:00+03:00');
    expect(geceSatiri >= gte).toBe(true);
    expect(geceSatiri < lt).toBe(true);

    // Günün son anı da içeride, ertesi günün ilk anı DIŞARIDA.
    expect(new Date('2026-10-10T23:59:59.999+03:00') < lt).toBe(true);
    expect(new Date('2026-10-11T00:00:00.000+03:00') < lt).toBe(false);
  });

  it('`to` DAHİL — üst sınır ertesi günün ilk anı (`lt`)', () => {
    const where = buildAuditLogWhere(filtre({ to: '2026-10-10' }));
    const createdAt = where.createdAt as { gte?: Date; lt: Date };

    expect(createdAt.gte).toBeUndefined();
    expect(createdAt.lt.toISOString()).toBe('2026-10-10T21:00:00.000Z');
    // `23:59:59.999` gibi bir uydurma sınır KULLANILMIYOR.
    expect(createdAt.lt.getUTCMilliseconds()).toBe(0);
  });

  it('TERS aralık şemada reddediliyor — sessizce boş liste dönmüyor', () => {
    const sonuc = auditLogFilterSchema.safeParse({ from: '2026-10-10', to: '2026-10-01' });

    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues[0]?.path).toEqual(['to']);
  });

  it('aynı gün iki uçta da kabul ediliyor', () => {
    expect(auditLogFilterSchema.safeParse({ from: '2026-10-10', to: '2026-10-10' }).success).toBe(
      true,
    );
  });

  it('tarih verilmezse `createdAt` ANAHTARI HİÇ YOK', () => {
    // Boş bir `{}` koymak Prisma'ya anlamsız bir blok göndermek olurdu.
    expect('createdAt' in buildAuditLogWhere(filtre())).toBe(false);
  });
});

/* ===========================================================================
 * SAYFALAMA, SIRALAMA, SEÇİM
 * ======================================================================== */

describe('fetchAuditLog', () => {
  it('sayfalı zarf — `PagedResult` alanları', async () => {
    const { client } = istemci([satir(), satir({ id: 'log_2' })], 42);

    const sayfa = await fetchAuditLog(filtre({ page: 2, perPage: 10 }), client);

    expect(sayfa.total).toBe(42);
    expect(sayfa.page).toBe(2);
    expect(sayfa.perPage).toBe(10);
    expect(sayfa.items).toHaveLength(2);
  });

  it('`skip`/`take` sayfadan hesaplanıyor', async () => {
    const { client, findMany } = istemci();
    await fetchAuditLog(filtre({ page: 3, perPage: 20 }), client);

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 40, take: 20 });
  });

  it('varsayılan sıra EN YENİ ÖNCE', async () => {
    const { client, findMany } = istemci();
    await fetchAuditLog(filtre(), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ createdAt: 'desc' }]);
  });

  it('`sort=asc` yönü değiştiriyor', async () => {
    const { client, findMany } = istemci();
    await fetchAuditLog(filtre({ sort: 'asc' }), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ createdAt: 'asc' }]);
  });

  it('`count` LİSTEYLE AYNI `where`i kullanıyor — toplam filtreyle tutarlı', async () => {
    const { client, findMany, count } = istemci();
    await fetchAuditLog(filtre({ entity: 'Project' }), client);

    expect(count.mock.calls[0]?.[0].where).toEqual(findMany.mock.calls[0]?.[0].where);
    expect(count.mock.calls[0]?.[0].where).toEqual({ entity: 'Project' });
  });

  it('⚠️ `userAgent` SEÇİLMİYOR, `ip` SEÇİLİYOR', async () => {
    const { client, findMany } = istemci();
    await fetchAuditLog(filtre(), client);

    const select = findMany.mock.calls[0]?.[0].select;
    expect(select.ip).toBe(true);
    expect('userAgent' in select).toBe(false);
    // `actorEmailHash` de okunmuyor — gerekçe DTO'nun yanında.
    expect('actorEmailHash' in select).toBe(false);
  });

  it('DTO `userAgent` ve `actorEmailHash` taşımıyor', async () => {
    const { client } = istemci([satir()]);
    const sayfa = await fetchAuditLog(filtre(), client);

    expect(sayfa.items[0]).not.toHaveProperty('userAgent');
    expect(sayfa.items[0]).not.toHaveProperty('actorEmailHash');
    expect(sayfa.items[0]?.ip).toBe('10.0.0.1');
  });

  it('`createdAt` ISO dizesine çevriliyor — Prisma `Date`i dışarı çıkmıyor', async () => {
    const { client } = istemci([satir()]);
    const sayfa = await fetchAuditLog(filtre(), client);

    expect(sayfa.items[0]?.createdAt).toBe('2026-10-09T12:00:00.000Z');
  });

  it('`ip` temizlenmiş eski satırda `null` — 90 gün sonrası (ADR-020)', async () => {
    const { client } = istemci([satir({ ip: null })]);
    const sayfa = await fetchAuditLog(filtre(), client);

    expect(sayfa.items[0]?.ip).toBeNull();
  });
});

/* ===========================================================================
 * ⚠️ KAPILAR — önbellek yok, ve ağdan çağrılabilir hâle gelmedi
 * ======================================================================== */

describe('okuma yolunun KAPILARI', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const SERVIS = kod('src/server/services/audit-log.ts');

  it('tarama vakum değil — kaynak gerçekten okundu', () => {
    expect(SERVIS).toContain('fetchAuditLog');
    expect(SERVIS).toContain('auditLog.findMany');
  });

  it('ÖNBELLEKLENMİYOR — `next/cache` hiç içe aktarılmıyor', () => {
    /*
     * T-038/T-040 gerekçesi: tek kullanıcılı panelde hiçbir yükü azaltmadan
     * "yeni kayıt görünmüyor" riski açar. Denetim ekranında bayat veri, yanlış
     * cevabı GÜVENLE vermek demek.
     */
    expect(SERVIS).not.toContain('next/cache');
    expect(SERVIS).not.toContain('unstable_cache');
    expect(SERVIS).not.toContain('cachedRead');
  });

  it('ad `fetchX` — `getX` DEĞİL (T-040 kuralı: `getX` önbellekli demek)', () => {
    expect(SERVIS).toMatch(/export\s+async\s+function\s+fetchAuditLog/);
    expect(SERVIS).not.toMatch(/export\s+async\s+function\s+getAuditLog/);
  });

  it('⚠️ HİÇBİR `use server` DOSYASI bu modülü YENİDEN İHRAÇ ETMİYOR', () => {
    /*
     * YETKİ KAPISI BURASI. `'use server'` dosyasından ihraç edilen her işlev
     * ağdan çağrılabilir bir POST ucuna dönüşür; `fetchAuditLog` böyle
     * açılırsa denetim kaydının tamamı kimlik doğrulamasız dışarı çıkar.
     * `actions/contact-message.ts` aynı tuzağı yorumla kaydediyor — burada
     * ölçülüyor.
     */
    const dosyalar = readdirSync(join(KOK, 'src/server/actions')).filter((ad) =>
      ad.endsWith('.ts'),
    );

    expect(dosyalar.length, 'eylem dosyası bulunamadı — tarama vakuma düştü').toBeGreaterThan(5);

    for (const ad of dosyalar) {
      const kaynak = kod(`src/server/actions/${ad}`);
      if (!kaynak.includes('use server')) continue;

      expect(kaynak, `${ad} denetim okumasını yeniden ihraç ediyor`).not.toMatch(
        /export\s*\*\s*from\s*'@?\/?.*audit-log'/,
      );
      expect(kaynak, `${ad} fetchAuditLog'u ihraç ediyor`).not.toMatch(
        /export\s*\{[^}]*fetchAuditLog/,
      );
    }
  });
});
