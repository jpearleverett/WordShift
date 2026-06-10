import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTelemetryEnabled, syncTelemetry, getInstallId } from '../services/telemetry';

// Mock AsyncStorage with the shared helper
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('telemetry', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    (global as Record<string, unknown>).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  test('is disabled by default (no endpoint configured)', () => {
    expect(isTelemetryEnabled()).toBe(false);
  });

  test('syncTelemetry is a no-op when disabled — fetch is never called', async () => {
    await syncTelemetry();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('syncTelemetry never throws when disabled', async () => {
    await expect(syncTelemetry()).resolves.toBeUndefined();
  });

  describe('getInstallId', () => {
    test('generates a non-empty id and persists it', async () => {
      const id = await getInstallId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      const stored = await AsyncStorage.getItem('wordshift_install_id');
      expect(stored).toBe(id);
    });

    test('returns the same id on subsequent calls', async () => {
      const first = await getInstallId();
      const second = await getInstallId();
      expect(second).toBe(first);
    });
  });
});
