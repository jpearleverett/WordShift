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
      },
    }],
  },
  // Mock react-native modules that aren't available in Node
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/asyncStorage.ts',
  },
};
