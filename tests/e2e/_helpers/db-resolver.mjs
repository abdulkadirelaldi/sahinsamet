import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * ESM çözümleme kancası — YALNIZCA E2E veritabanı görevleri için.
 *
 * NEDEN GEREKLİ: Playwright'in TypeScript yükleyicisi `tsconfig.json`'daki
 * `paths` eşlemesini `src/**` altındaki dosyalar için uygulamıyor. Ölçüldü:
 * test dosyaları `@/...` çözebiliyor, ama `src/server/auth/login-attempt.ts`
 * kendi içinde `@/server/db` yazdığı anda "Cannot find module" alınıyor.
 * Kök `tsconfig.json`'a `baseUrl` eklemek çözerdi ama o dosya bu görevin
 * kapsamı dışında (ve değişikliği Next ile `tsc` tarafını da etkilerdi).
 *
 * ÇÖZÜM: veritabanı işleri Playwright sürecinde DEĞİL, bu kancayla donatılmış
 * ayrı bir Node sürecinde koşar (`db-task.ts`). Böylece Backend'in gerçek
 * `encryptSecret` / `hashBackupCodes` uygulamaları TÜKETİLİR — güvenlik
 * ilkelleri test tarafında YENİDEN YAZILMAZ. Kopyalasaydık, biçim değiştiğinde
 * testler sessizce yanlış veri yazardı.
 *
 * Aynı sorunu Backend `prisma/seed-resolver.mjs` ile çözmüştü; bu, aynı
 * yaklaşımın test ağacındaki eşdeğeri — o dosya "yalnızca seed için" diye
 * işaretli olduğundan ona bağlanılmadı.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const srcRoot = path.join(projectRoot, 'src');

/** Uzantısız yolu gerçek dosyaya bağlar: `x` → `x.ts` → `x/index.ts` */
function resolveFile(absolutePath) {
  if (path.extname(absolutePath) && existsSync(absolutePath)) return absolutePath;

  for (const candidate of [
    `${absolutePath}.ts`,
    `${absolutePath}.tsx`,
    path.join(absolutePath, 'index.ts'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

export function resolve(specifier, context, nextResolve) {
  // 1) `@/...` takma adı → `src/...`
  if (specifier.startsWith('@/')) {
    const target = resolveFile(path.join(srcRoot, specifier.slice(2)));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  // 2) Uzantısız göreli import (Prisma'nın ürettiği istemci bunu kullanıyor)
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const target = resolveFile(path.resolve(parentDir, specifier));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
