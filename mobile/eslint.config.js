// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Playwright evidence includes generated third-party viewer bundles.
      'playwright-report/**',
      'test-results/**',
      // Store capture exports include the generated application bundle.
      'store-output/**',
      // Generated puzzle data is validated by route, vocabulary and diversity
      // audits. Cover every bank family here, including all Lexicon banks.
      'src/data/*Bank*.ts',
      'src/dictionary.ts',
      'scripts/tools/**/*.mjs',
      // Vendored three.js for the cinematic trailer, copied verbatim from npm.
      'scripts/store/cinematic/vendor/**',
    ],
  },
  {
    // Animation objects now have stable state ownership; event/native refs
    // stay behind explicit lifecycle boundaries. Prevent render-time ref,
    // mutation and purity regressions after the SDK 57 migration.
    rules: {
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/purity': 'error',
    },
  },
  {
    // Node-environment build/generator scripts (CommonJS globals). These are
    // throwaway puzzle-bank generators, not shipping code, so their CommonJS
    // idioms and test-scaffold unused vars are downgraded off — otherwise their
    // ~328 warnings drown the handful that touch real app code in CI output.
    files: ['scripts/**/*.js', 'scripts/**/*.ts'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
      },
    },
    rules: {
      'import/first': 'off',
      'import/no-commonjs': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    // The cinematic trailer's browser modules resolve 'three' through the
    // page's import map (vendored copy), which the node resolver cannot see.
    files: ['scripts/store/cinematic/src/**/*.js'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^three(/|$)'] }],
    },
  },
  {
    // Test files: jest.mock hoisting forces require()-after-import, and test
    // scaffolds carry intentionally-unused fixtures. These idioms are expected
    // in tests, so downgrade the rules that only flag them here — keeping the
    // CI warning list focused on real shipping-code signal.
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/__tests__/**'],
    rules: {
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
]);
