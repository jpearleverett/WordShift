// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Generated puzzle data is validated by route, vocabulary and diversity
      // audits. Cover every bank family here, including all Lexicon banks.
      'src/data/*Bank*.ts',
      'src/dictionary.ts',
      'scripts/tools/**/*.mjs',
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
