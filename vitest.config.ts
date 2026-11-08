import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Vitest yapılandırması — PROGRAM.md §9, K6 (kapsam ≥ %70).
 *
 * TASARIM KURALI: `pnpm test` **veritabanı olmadan ve `.env` olmadan** geçer.
 * Bu pazarlık konusu değil — CI (T-005), Docker derlemesi ve taze klon bu
 * koşulda çalışır. DB gerektiren bir test yazılacaksa ayrı bir projede ve
 * açıkça işaretlenmiş olarak yazılır (F1'de karara bağlanacak).
 *
 * İKİ PROJE, DOSYA UZANTISINA GÖRE AYRILIR:
 *   - `*.test.ts`  → `node` ortamı. Servisler, Zod şemaları, saf yardımcılar.
 *   - `*.test.tsx` → `jsdom` ortamı + Testing Library. Bileşenler.
 *
 * Ayrım uzantıyla yapılır çünkü tek bir kurulum dosyası her iki ortama
 * uymuyor: `@testing-library/react` içe aktarıldığı anda `document` bekler ve
 * `node` ortamındaki testleri düşürür.
 */

/** §1.1 K6 — `src/server` ve `src/lib` için satır kapsamı hedefi. */
const COVERAGE_THRESHOLD = 70;

/**
 * Eşik F0'da RAPORLANIR, ZORLANMAZ.
 *
 * Şu an uygulamada kapsanacak neredeyse hiç mantık yok (servis katmanı T-015'te
 * geliyor); eşiği bugün zorlamak CI'yı ilk günden kırmızıya çevirir ve
 * kaçınılmaz olarak eşiğin düşürülmesiyle sonuçlanır. `COVERAGE_ENFORCE=1`
 * ile açılır — T-005'te CI'ya, F1 sonunda zorunlu olarak eklenecek.
 */
const enforceCoverage = process.env.COVERAGE_ENFORCE === '1';

export default defineConfig({
  test: {
    // Açık içe aktarma zorunlu: `import { describe, it, expect } from 'vitest'`.
    // Küresel (global) değişken sızdırmak, ESLint'in tanımadığı serbest
    // tanımlayıcılar üretir ve `pnpm lint --max-warnings=0` ile çakışır.
    globals: false,

    // Testler saate bağlı kırılmasın — muhasebe ve sağlık kayıtları tarih
    // ağırlıklı; yerel saat dilimi CI ile geliştirici makinesi arasında
    // sessiz fark üretir (§6 `HealthLog.date` unique).
    env: { TZ: 'UTC' },

    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.tsx'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
    ],

    coverage: {
      provider: 'v8',
      // `skipFull: false` metin raporcusuna DOĞRUDAN verilir. Üst düzey
      // `coverage.skipFull` bu raporcuya geçmiyor; o zaman %100 kapsanan
      // dosyalar tablodan düşüyor ve `middleware.ts` ile `headers.ts` hiç
      // test edilmemiş gibi görünüyor — §8.5/§8.7'yi uygulayan kodun durumu
      // kapsam tablosundan okunamaz hâle geliyordu.
      reporter: [['text', { skipFull: false }], ['html'], ['lcov']],
      reportsDirectory: './coverage',

      // K6 kapsam hedefi bu iki ağacı bağlar. `middleware.ts` de dahil:
      // §8.5/§8.7'yi uygulayan kod kapsamsız kalmamalı.
      include: ['src/server/**', 'src/lib/**', 'src/middleware.ts'],

      exclude: [
        // Prisma 7 üretilmiş istemci — türetilmiş kaynak, VCS dışı (ADR-006).
        'src/server/generated/**',
        '**/*.d.ts',
        '**/.gitkeep',
      ],

      // NOT: Vitest 3'teki `all: true` seçeneği Vitest 4'te kaldırıldı; artık
      // varsayılan davranış. `include` ile eşleşen her dosya, hiç içe
      // aktarılmamış olsa bile %0 olarak raporlanır — yani hiç test edilmemiş
      // bir servis kapsam tablosundan gizlenemez.

      thresholds: enforceCoverage
        ? {
            lines: COVERAGE_THRESHOLD,
            functions: COVERAGE_THRESHOLD,
            branches: COVERAGE_THRESHOLD,
            statements: COVERAGE_THRESHOLD,
          }
        : undefined,
    },
  },
});
