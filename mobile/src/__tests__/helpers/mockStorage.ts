/**
 * Shared MMKV storage mock factory for test files.
 *
 * Usage:
 *   jest.mock('../services/storage', () =>
 *     require('./helpers/mockStorage').createMockStorage()
 *   );
 *
 * Then in beforeEach:
 *   const { storage } = require('../services/storage');
 *   storage.clearAll();
 */

export function createMockStorage() {
  const store: Record<string, string> = {};

  const mockStorage = {
    getString: jest.fn((key: string): string | undefined => store[key]),
    set: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    remove: jest.fn((key: string) => {
      delete store[key];
    }),
    clearAll: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    getAllKeys: jest.fn((): string[] => Object.keys(store)),
    contains: jest.fn((key: string): boolean => key in store),
    getBoolean: jest.fn((key: string): boolean | undefined => {
      const val = store[key];
      if (val === undefined) return undefined;
      return val === 'true';
    }),
    getNumber: jest.fn((key: string): number | undefined => {
      const val = store[key];
      if (val === undefined) return undefined;
      return Number(val);
    }),
  };

  return {
    storage: mockStorage,
    getObject: jest.fn(<T>(key: string): T | null => {
      const raw = store[key];
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }),
    setObject: jest.fn(<T>(key: string, value: T): void => {
      store[key] = JSON.stringify(value);
    }),
  };
}
