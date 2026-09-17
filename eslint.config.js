import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint rules kept deliberately small: type-aware checks that catch real mistakes, plus two
 * project-specific bans that protect the product's promises.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.aws-sam/**',
      '**/coverage/**',
      'fixtures/out/**',
      '.agents/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Document content must never reach a log through console. Handlers use the `log`
          // helper in http.ts, which redacts long digit runs first.
          selector: "MemberExpression[object.name='console']",
          message: 'Use the log() helper from http.ts so document values are redacted.',
        },
      ],
    },
  },
  {
    // Node build scripts: plain ESM JavaScript with the Node globals available.
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Tests may use console and loose typing for fakes.
    files: ['**/*.test.ts', '**/testing/**'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
