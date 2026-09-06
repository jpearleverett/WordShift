const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  roots: ['<rootDir>/scripts'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Transpile-only: the generator scripts run for minutes to hours, and
      // ts-jest's type-checking mode retains the TypeScript checker program
      // (millions of AST/Symbol nodes across the module graph, including the
      // multi-MB bank data files) for the process lifetime — observed as
      // heap-limit OOM aborts mid-generation. `npm run typecheck` covers the
      // type safety of everything these scripts import.
      diagnostics: false,
      tsconfig: {
        isolatedModules: true,
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/asyncStorage.ts',
  },
};
