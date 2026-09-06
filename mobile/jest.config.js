module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Must match .tsx as well as .ts. A component render test is naturally named
  // `Foo.test.tsx`, and with a `.test.ts`-only pattern such a file is SILENTLY
  // never collected — the suite stays green while the test never runs, which is
  // the worst failure mode a test config has.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        jsx: 'react',
        strict: true,
        types: ['jest', 'node'],
      },
    }],
  },
  // Mock react-native modules that aren't available in Node
  moduleNameMapper: {
    '^expo-crypto$': '<rootDir>/src/__tests__/__mocks__/expoCrypto.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/asyncStorage.ts',
    // expo-font ships an untransformed ESM build; the app only calls loadAsync
    // at runtime (theme/fonts.ts), so stub it for the Node test env.
    '^expo-font$': '<rootDir>/src/__tests__/__mocks__/expoFont.ts',
    // Stub static assets (sound/image/font require()s) for Node test resolution
    '\\.(wav|png|webp|ttf)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },
};
