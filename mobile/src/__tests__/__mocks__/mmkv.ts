// Mock react-native-mmkv for tests
// Provides an in-memory synchronous store matching the MMKV V4 API.

const store: Record<string, string | number | boolean> = {};

function createMMKV(_options?: { id?: string }) {
  return {
    getString: jest.fn((key: string): string | undefined => {
      const val = store[key];
      return typeof val === 'string' ? val : undefined;
    }),
    getNumber: jest.fn((key: string): number | undefined => {
      const val = store[key];
      return typeof val === 'number' ? val : undefined;
    }),
    getBoolean: jest.fn((key: string): boolean | undefined => {
      const val = store[key];
      return typeof val === 'boolean' ? val : undefined;
    }),
    set: jest.fn((key: string, value: string | number | boolean): void => {
      store[key] = value;
    }),
    remove: jest.fn((key: string): boolean => {
      const existed = key in store;
      delete store[key];
      return existed;
    }),
    contains: jest.fn((key: string): boolean => {
      return key in store;
    }),
    getAllKeys: jest.fn((): string[] => {
      return Object.keys(store);
    }),
    clearAll: jest.fn((): void => {
      Object.keys(store).forEach(k => delete store[k]);
    }),
    size: 0,
  };
}

// Helper for tests to clear the mock store directly
function clearMockMMKVStore() {
  Object.keys(store).forEach(k => delete store[k]);
}

module.exports = {
  createMMKV,
  clearMockMMKVStore,
};
