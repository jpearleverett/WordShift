module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
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
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/asyncStorage.ts',
    // expo-font ships an untransformed ESM build; the app only calls loadAsync
    // at runtime (theme/fonts.ts), so stub it for the Node test env.
    '^expo-font$': '<rootDir>/src/__tests__/__mocks__/expoFont.ts',
    // Stub static assets (sound/image/font require()s) for Node test resolution
    '\\.(wav|png|webp|ttf)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },
};
