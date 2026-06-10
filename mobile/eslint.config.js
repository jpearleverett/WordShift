// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Auto-generated puzzle banks (5+ MB of data; linting them is pointless)
      'src/data/puzzleBank*.ts',
      'src/dictionary.ts',
      'scripts/tools/*.mjs',
    ],
  },
]);
