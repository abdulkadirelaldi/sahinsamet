import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ADR-011 önbellek etiketleri — F3'ün `revalidateTag` çağrıları buna dayanacak.
 *
 * `unstable_cache` SAHTELENİYOR: amaç okumanın sonucunu değil, Next'e HANGİ
 * ETİKETLERİN verildiğini ölçmek. Gerçek uygulama çağrılsaydı veritabanına
 * giderdi; burada okuma gövdesi hiç çalıştırılmıyor.
 */

const { unstableCache, calls } = vi.hoisted(() => {
  const calls: Array<{ keyParts: string[]; tags: string[] }> = [];
  return {
    calls,
    unstableCache: vi.fn(
      (_read: unknown, keyParts: string[], options: { tags: string[]; revalidate?: number }) => {
        calls.push({ keyParts, tags: options.tags });
        // Boş dizi: süzme yardımcıları liste bekliyor. Dönen değer bu testte
        // önemsiz — ölçülen şey Next'e HANGİ anahtar/etiketin verildiği.
        return async (): Promise<unknown[]> => [];
      },
    ),
  };
});

vi.mock('next/cache', () => ({ unstable_cache: unstableCache, revalidateTag: vi.fn() }));

const { CONTENT_REVALIDATE_SECONDS, entityTag } =
  await import('@/server/services/_shared/content-cache');
const { getProfile } = await import('@/server/services/cached');
const { contentTagsToDrop } = await import('@/server/actions/tags');

beforeEach(() => {
  calls.length = 0;
});

function lastCall(): { keyParts: string[]; tags: string[] } {
  const call = calls.at(-1);
  if (!call) throw new Error('unstable_cache hiç çağrılmadı');
  return call;
}

describe('etiket adlandırma kuralı', () => {
  it('varlık etiketi `content:<entity>`', () => {
    expect(entityTag('profile')).toBe('content:profile');
  });

  it('emniyet ağı süresi sonsuz DEĞİL', () => {
    expect(CONTENT_REVALIDATE_SECONDS).toBeGreaterThan(0);
    expect(Number.isFinite(CONTENT_REVALIDATE_SECONDS)).toBe(true);
  });
});

describe('profil önbelleği — okuma ve düşürme AYNI etiket (ADR-029 tam eşleşme)', () => {
  it('getProfile `content:profile` etiketini taşıyor', async () => {
    await getProfile();
    expect(lastCall().tags).toEqual(['content:profile']);
    expect(lastCall().keyParts).toEqual(['profile']);
  });

  it('kayıt sonrası düşürülen etiket okumanın etiketiyle birebir aynı', async () => {
    await getProfile();
    const okuma = lastCall().tags;
    expect(contentTagsToDrop('profile')).toEqual(okuma);
  });
});
