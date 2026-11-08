import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Node ESM modül çözümleme kancası — YALNIZCA `pnpm db:seed` için.
 *
 * Neden gerekli: Node'un yerleşik TypeScript desteği (22.18+) tipleri sıyırır ama
 * MODÜL ÇÖZÜMLEMESİNİ değiştirmez. Node ESM iki şeyi bilmez:
 *   1. Uzantısız göreli import (`./common`) — hem bizim kodumuzda hem Prisma'nın
 *      ürettiği istemcide var; ikisi de bundler varsayımıyla yazılmış.
 *   2. `@/` yol takma adı (tsconfig `paths`) — Node tsconfig okumaz.
 *
 * Alternatifler ve neden seçilmedi:
 *   - `tsx` / `ts-node` / `vite-node` → yeni bağımlılık (ADR-004 yasağı)
 *   - Seed'i şemalardan bağımsız yazmak → görevin varlık sebebini ortadan kaldırırdı
 *     (girdilerin `createXSchema`'lardan geçmesi isteniyor)
 *
 * Bu kanca üretim kodunun parçası DEĞİLDİR; uygulama derlemesi Next'in kendi
 * çözümleyicisini kullanır ve bu dosyayı hiç görmez.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(projectRoot, 'src');

/** Uzantısız bir yolu gerçek dosyaya bağlar: `x` → `x.ts` → `x/index.ts` */
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
  // 1) `@/...` takma adı → src/...
  if (specifier.startsWith('@/')) {
    const target = resolveFile(path.join(srcRoot, specifier.slice(2)));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  // 2) Uzantısız göreli import
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const target = resolveFile(path.resolve(parentDir, specifier));
    if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
