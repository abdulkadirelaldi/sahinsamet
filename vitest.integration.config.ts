import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * GERÇEK VERİTABANI TESTLERİ (2026-11-02) — `pnpm test:integration`.
 *
 * Birim testleri Prisma'yı taklit eder: işlem geri alma, eşsizlik kısıtı ve eşzamanlılık orada
 * hiç çalışmaz. Para ve sayaç yollarının bu yönleri burada gerçek Postgres ile ölçülür. CI'da
 * `migrate deploy` sonrası koşar; `pnpm test` veritabanısız kalır.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    env: { TZ: 'UTC' },
    include: ['tests/integration/**/*.test.ts'],
    // Dosyalar aynı veritabanını paylaşıyor; sırayla koşar.
    fileParallelism: false,
    testTimeout: 30_000,
    setupFiles: ['./tests/integration/_kurulum.ts'],
  },
});
