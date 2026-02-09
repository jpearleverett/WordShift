/**
 * Shared AsyncStorage mock factory for test files.
 *
 * Usage:
 *   jest.mock('@react-native-async-storage/async-storage', () =>
 *     require('./helpers/mockAsyncStorage').createMockAsyncStorage()
 *   );
 *
 * Then in beforeEach:
 *   const AsyncStorage = require('@react-native-async-storage/async-storage').default;
 *   AsyncStorage.clear();
 */

export function createMockAsyncStorage() {
  const store: Record<string, string> = {};

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
      multiGet: jest.fn((keys: string[]) =>
        Promise.resolve(keys.map(key => [key, store[key] || null]))
      ),
      multiSet: jest.fn((keyValuePairs: [string, string][]) => {
        keyValuePairs.forEach(([key, value]) => { store[key] = value; });
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
}
