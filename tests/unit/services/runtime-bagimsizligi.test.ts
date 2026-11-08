import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ÇALIŞMA ZAMANI BAĞIMSIZLIĞI KAPISI — BULGU-012.
 *
 * `next/*` yalnızca Next çalışma zamanında çözülür. Düz Node ile koşan bir
 * betik (seed, §13.5 cron işleri) ona DOLAYLI olarak bile dokunursa
 * `ERR_MODULE_NOT_FOUND` ile ölür. BULGU-012'de tam bu oldu: `_shared` barrel'ı
 * `content-cache.ts`'i yeniden ihraç ediyordu, `pnpm db:seed` kırıldı ve F2
 * dalında CI iki gün kırmızı kaldı.
 *
 * Bu test içe aktarma grafiğini STATİK yürür — modülleri çalıştırmaz. Sebep:
 * `import()` ile denemek, kırılmayı yalnızca o modül gerçekten yüklenirse
 * yakalar ve hata mesajı zinciri göstermez. Statik yürüyüş SUÇLU YOLU basar.
 */

const ROOT = resolve(__dirname, '../../..');
const SRC = join(ROOT, 'src');

/** Next'e bağlı olmasına İZİN VERİLEN modüller — bilinçli istisnalar. */
const NEXT_BAGIMLI_IZIN = [
  'src/server/services/cached.ts',
  'src/server/services/index.ts',
  'src/server/services/_shared/content-cache.ts',
];

/**
 * Üretilen Prisma istemcisine girilmez: on binlerce satır ve `next/*`
 * içeremez (Prisma'nın çıktısı çalışma zamanından bağımsızdır).
 */
const GIRILMEZ = ['src/server/generated/'];

const IMPORT_PATTERN = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(IMPORT_PATTERN)].map((m) => m[1] as string);
}

/** `@/x` ve `./x` çözümlemesi. Bare specifier (zod, pg) → null. */
function resolveSpecifier(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;

  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function isNextSpecifier(spec: string): boolean {
  return spec === 'next' || spec.startsWith('next/');
}

function relPath(file: string): string {
  return relative(ROOT, file).split('\\').join('/');
}

/**
 * `entry`den ulaşılabilen ilk `next/*` bağımlılığını, ona götüren yolla
 * birlikte döndürür. Temizse `null`.
 */
function findNextDependency(entry: string): string | null {
  const seen = new Set<string>();
  const queue: Array<{ file: string; path: string[] }> = [{ file: entry, path: [relPath(entry)] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (seen.has(current.file)) continue;
    seen.add(current.file);

    if (GIRILMEZ.some((prefix) => relPath(current.file).startsWith(prefix))) continue;

    for (const spec of importSpecifiers(current.file)) {
      if (isNextSpecifier(spec)) {
        return [...current.path, spec].join('\n  → ');
      }
      const next = resolveSpecifier(spec, current.file);
      if (next !== null && !seen.has(next)) {
        queue.push({ file: next, path: [...current.path, relPath(next)] });
      }
    }
  }
  return null;
}

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsFilesUnder(full));
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/* ========================================================================= */

describe('düz Node ile koşan betikler — next/* zincire GİRMEMELİ', () => {
  it('prisma/seed.ts temiz (pnpm db:seed bunun üzerinde koşuyor)', () => {
    // Bu testin kırılması = CI'ın seed adımının kırılması. BULGU-012 aynen buydu.
    expect(findNextDependency(join(ROOT, 'prisma/seed.ts'))).toBeNull();
  });

  it('_shared barrel SAF — cron betikleri buradan yardımcı alacak', () => {
    expect(findNextDependency(join(SRC, 'server/services/_shared/index.ts'))).toBeNull();
  });

  it('@/server/db temiz — her betiğin veritabanı girişi', () => {
    expect(findNextDependency(join(SRC, 'server/db.ts'))).toBeNull();
  });
});

describe('servis katmanı — yalnızca izin verilen modüller Next\u2019e bağlı', () => {
  const services = tsFilesUnder(join(SRC, 'server/services'));

  it('taranan dosya sayısı beklenen aralıkta (tarama gerçekten çalışıyor)', () => {
    expect(services.length).toBeGreaterThan(10);
  });

  for (const file of services) {
    const rel = relPath(file);
    if (NEXT_BAGIMLI_IZIN.includes(rel)) continue;

    it(`${rel} düz Node'da içe aktarılabilir`, () => {
      const chain = findNextDependency(file);
      expect(chain, `next/* şu zincirle sızıyor:\n  ${chain}`).toBeNull();
    });
  }

  it('izin listesi ÖLÜ DEĞİL — her istisna gerçekten Next\u2019e bağlı', () => {
    // İzin listesinde artık Next'e bağlı olmayan bir dosya kalırsa kapı gevşer.
    for (const rel of NEXT_BAGIMLI_IZIN) {
      expect(findNextDependency(join(ROOT, rel)), `${rel} artık Next'e bağlı değil`).not.toBeNull();
    }
  });
});
