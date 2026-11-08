import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { writesRevoked, type WriteGateClient } from '@/server/auth/write-gate';

/**
 * YAZMA KAPISI — ADR-035/B (T-046).
 *
 * Oturumlar KAPANMIYOR; `writesValidFrom`'dan önce verilmiş jetonlar YAZMA
 * yetkisini kaybediyor. Okuma tarafı ara katmanla korunuyor ve ara katman
 * Edge'de veritabanı okuyamıyor (T-014/K1, T-044g'de yeniden ölçüldü) —
 * o katman F6/T-062'ye ertelendi (ADR-035/C).
 */

const KULLANICI = 'clx0000000000000000000001';

/** 2026-09-20 12:00:00 UTC — saniye. */
const IAT = Math.floor(Date.parse('2026-09-20T12:00:00.000Z') / 1000);

function istemci(writesValidFrom: Date | null, varMi = true) {
  const findUnique = vi.fn().mockResolvedValue(varMi ? { writesValidFrom } : null);
  const client: WriteGateClient = { user: { findUnique } };
  return { client, findUnique };
}

/* ===========================================================================
 * TEMEL DAVRANIŞ
 * ======================================================================== */

describe('writesRevoked', () => {
  it('damga YOKSA yazma serbest — dağıtımın kendisi kimseyi kilitlemez', async () => {
    // Migration kolonu `NULL` bırakıyor; `DEFAULT now()` verilseydi dağıtım
    // anında tüm oturumlar yazamaz hâle gelirdi.
    const { client } = istemci(null);
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(false);
  });

  it('damgadan ÖNCE verilmiş jeton yazamaz', async () => {
    const { client } = istemci(new Date('2026-09-20T13:00:00.000Z'));
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(true);
  });

  it('damgadan SONRA verilmiş jeton yazabilir', async () => {
    const { client } = istemci(new Date('2026-09-20T11:00:00.000Z'));
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(false);
  });

  it('yalnızca `writesValidFrom` okunuyor — başka alan çekilmiyor', async () => {
    const { client, findUnique } = istemci(null);
    await writesRevoked(KULLANICI, IAT, client);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: KULLANICI },
      select: { writesValidFrom: true },
    });
  });
});

/* ===========================================================================
 * ⚠️ SINIR — saniye hassasiyeti
 * ======================================================================== */

describe('SINIR: saniye hassasiyeti (kilitlenme tuzağı)', () => {
  /**
   * `iat` SANİYE cinsinden ve aşağı yuvarlanır; `writesValidFrom` milisaniye
   * taşır. `iat * 1000 < validFrom` yazılsaydı, şifre değiştirdikten HEMEN
   * SONRA (aynı saniye içinde) açılan YEPYENİ bir oturum da geçersiz sayılırdı:
   * kullanıcı şifresini değiştirir, yeniden giriş yapar ve YİNE yazamaz.
   *
   * Bu yüzden iki taraf da saniyeye indiriliyor.
   */
  it('AYNI SANİYEDE verilmiş jeton yazabiliyor — yeni giriş kilitlenmiyor', async () => {
    // Damga 12:00:00.500; yeni jetonun `iat`i 12:00:00 (aşağı yuvarlanmış).
    const { client } = istemci(new Date('2026-09-20T12:00:00.500Z'));
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(false);
  });

  it('BİR SANİYE ÖNCEKİ jeton yazamıyor — sınır gerçekten sınır', async () => {
    const { client } = istemci(new Date('2026-09-20T12:00:00.500Z'));
    expect(await writesRevoked(KULLANICI, IAT - 1, client)).toBe(true);
  });

  it('damga tam saniyedeyken de aynı saniye geçiyor', async () => {
    const { client } = istemci(new Date('2026-09-20T12:00:00.000Z'));
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(false);
    expect(await writesRevoked(KULLANICI, IAT - 1, client)).toBe(true);
  });
});

/* ===========================================================================
 * FAIL-CLOSED
 * ======================================================================== */

describe('FAIL-CLOSED — şüphede yazma yok', () => {
  it('`iat` YOKSA yazma yetkisi YOK', async () => {
    // Alanı taşımayan bozuk/eski bir jetonu muaf tutmak, geçersizleştirmeyi
    // atlatmanın en kolay yolu olurdu.
    const { client, findUnique } = istemci(null);
    expect(await writesRevoked(KULLANICI, undefined, client)).toBe(true);
    // Sorgu bile atılmıyor — karar jetondan veriliyor.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('`iat` sayı değilse / sonsuzsa yazma yetkisi YOK', async () => {
    const { client } = istemci(null);
    expect(await writesRevoked(KULLANICI, Number.NaN, client)).toBe(true);
    expect(await writesRevoked(KULLANICI, Number.POSITIVE_INFINITY, client)).toBe(true);
  });

  it('kullanıcı kaydı YOKSA yazma yetkisi YOK', async () => {
    const { client } = istemci(null, false);
    expect(await writesRevoked(KULLANICI, IAT, client)).toBe(true);
  });
});

/* ===========================================================================
 * ⚠️ KAPSAM: KAPI YALNIZCA YAZMA YOLUNDA
 * ======================================================================== */

describe('kapı YALNIZCA yazma yolunda koşuyor', () => {
  const KOK = resolve(__dirname, '../../..');

  function tsDosyalari(dizin: string): string[] {
    const out: string[] = [];
    for (const ad of readdirSync(dizin)) {
      const tam = join(dizin, ad);
      if (statSync(tam).isDirectory()) {
        if (ad === 'generated') continue;
        out.push(...tsDosyalari(tam));
      } else if (ad.endsWith('.ts')) out.push(tam);
    }
    return out;
  }

  /** Yorumlar ayıklanmış kaynak — gerekçe metinleri assert'i yanıltmasın. */
  const kod = (dosya: string) =>
    readFileSync(dosya, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const cagiranlar = tsDosyalari(join(KOK, 'src'))
    .filter((f) => !f.endsWith('write-gate.ts'))
    .filter((f) => /\bwritesRevoked\b/.test(kod(f)))
    .map((f) =>
      f
        .slice(KOK.length + 1)
        .split('\\')
        .join('/'),
    );

  it('TEK çağıran `actions/_shared.ts` — yani tüm action’ların geçtiği kapı', () => {
    /*
     * Kapı bir gün `auth()`'un geri çağrısına ya da bir okuma servisine
     * taşınırsa burası kırılır. O taşıma "normal istek yolu DB'ye gitmez"
     * özelliğini okuma tarafında da kaybettirirdi — ADR-035'in reddettiği
     * alternatif tam olarak bu.
     */
    expect(cagiranlar).toEqual(['src/server/actions/_shared.ts']);
  });

  it('OKUMA servisleri kapıyı içe aktarmıyor', async () => {
    const okumalar = [
      'src/server/services/profile.ts',
      'src/server/services/health-log.ts',
      'src/server/services/cached.ts',
    ];
    for (const dosya of okumalar) {
      expect(kod(join(KOK, dosya)), `${dosya} yazma kapısını çağırıyor`).not.toContain(
        'writesRevoked',
      );
    }
  });

  it('tarama vakum değil — kaynak gerçekten okundu', () => {
    expect(cagiranlar.length).toBeGreaterThan(0);
  });
});
