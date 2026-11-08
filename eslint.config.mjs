import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/**
 * ESLint 9 flat config.
 *
 * PROGRAM.md §2 yasakları derleme zamanı değil, lint zamanı zorlanır:
 *   - `any`          -> @typescript-eslint/no-explicit-any: error
 *   - `@ts-ignore`   -> @typescript-eslint/ban-ts-comment: error
 * Bu iki kural `warn`'a düşürülemez (§10.6 DoD).
 *
 * `eslint-config-next` hâlâ eslintrc formatında yayımlanıyor; bu yüzden onun
 * taşıdığı `@next/eslint-plugin-next` doğrudan flat config olarak kullanılıyor
 * (bkz. rapor "Kararlar" / K3).
 */
export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'prisma/migrations/**',
      '.pnpm-store/**',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // --- PROGRAM.md §2 sert yasakları ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],

      // --- Genel hijyen ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Yapılandırma dosyaları Node bağlamında çalışır
  {
    files: ['*.config.{js,mjs,ts}', 'postcss.config.mjs', 'next.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
