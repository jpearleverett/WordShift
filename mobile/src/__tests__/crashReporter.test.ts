import AsyncStorage from '@react-native-async-storage/async-storage';

// Mutable expo-config extra so we can toggle configured/unconfigured per test.
let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: mockExtra, version: '9.9.9' };
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Keep the local event log out of the picture (avoids the debounced flush timer).
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getAllStoredEvents: jest.fn(async () => []),
  removeOldestEvents: jest.fn(async () => {}),
}));

import { initCrashReporter, parseSentryDsn } from '../services/crashReporter';
import { reportError, setErrorForwarder } from '../services/errorReporting';

/** Flush microtasks so fire-and-forget forwarders complete. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('crashReporter', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    setErrorForwarder(null);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setErrorForwarder(null);
    delete (global as Record<string, unknown>).fetch;
    jest.restoreAllMocks();
  });

  describe('parseSentryDsn', () => {
    test('parses a standard DSN into store url + key', () => {
      const parsed = parseSentryDsn('https://pubkey123@o42.ingest.sentry.io/7654321');
      expect(parsed).not.toBeNull();
      expect(parsed!.publicKey).toBe('pubkey123');
      expect(parsed!.host).toBe('o42.ingest.sentry.io');
      expect(parsed!.projectId).toBe('7654321');
      expect(parsed!.storeUrl).toBe('https://o42.ingest.sentry.io/api/7654321/store/');
    });

    test('returns null for empty or malformed DSNs', () => {
      expect(parseSentryDsn('')).toBeNull();
      expect(parseSentryDsn('not-a-dsn')).toBeNull();
      expect(parseSentryDsn('https://nohost/1')).toBeNull();
    });
  });

  describe('initCrashReporter', () => {
    test('is a no-op without a DSN — no forwarder registered, no fetch on error', async () => {
      initCrashReporter();
      reportError(new Error('boom'), { source: 'test_source' });
      await flush();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('with a DSN, a reported error POSTs to the parsed Sentry store URL with the auth header', async () => {
      mockExtra = { sentryDsn: 'https://pubkey123@o42.ingest.sentry.io/7654321' };
      initCrashReporter();

      reportError(new Error('kaboom'), { source: 'victory_flow', metadata: { foo: 1 } });
      await flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://o42.ingest.sentry.io/api/7654321/store/');
      expect(init.method).toBe('POST');
      expect(init.headers['X-Sentry-Auth']).toContain('sentry_version=7');
      expect(init.headers['X-Sentry-Auth']).toContain('sentry_key=pubkey123');
      expect(init.headers['X-Sentry-Auth']).toContain('sentry_client=wordshift/1.0');

      const payload = JSON.parse(init.body);
      expect(payload.platform).toBe('javascript');
      expect(payload.level).toBe('error');
      expect(payload.message).toBe('kaboom');
      expect(payload.release).toBe('9.9.9');
      expect(payload.tags.source).toBe('victory_flow');
      expect(payload.exception.values[0].type).toBe('Error');
      expect(typeof payload.exception.values[0].stacktrace).toBe('string');
      expect(typeof payload.event_id).toBe('string');
    });

    test('forwards string errors too', async () => {
      mockExtra = { sentryDsn: 'https://k@h.sentry.io/9' };
      initCrashReporter();
      reportError('plain message', { source: 's' });
      await flush();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.message).toBe('plain message');
    });

    test('a malformed DSN registers no forwarder', async () => {
      mockExtra = { sentryDsn: 'garbage' };
      initCrashReporter();
      reportError(new Error('x'), { source: 's' });
      await flush();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a fetch rejection never propagates out of reportError', async () => {
      mockExtra = { sentryDsn: 'https://k@h.sentry.io/9' };
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      initCrashReporter();
      expect(() => reportError(new Error('x'), { source: 's' })).not.toThrow();
      await flush();
    });
  });
});
