import AsyncStorage from '@react-native-async-storage/async-storage';

// Mutable expo-config extra so we can toggle configured/unconfigured per test.
let mockExtra: Record<string, unknown> = {};
let mockCaptureActive = false;
jest.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: mockExtra, version: '1.2.3' };
    },
  },
}));

jest.mock('../dev/playStoreCapture', () => ({
  isPlayStoreCaptureActive: () => mockCaptureActive,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Provide a deterministic, non-empty event batch.
const mockEvents = [
  { type: 'puzzle_completed', data: { stars: 3 }, timestamp: 1_700_000_000_000 },
];
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getAllStoredEvents: jest.fn(async () => mockEvents),
  removeOldestEvents: jest.fn(async () => {}),
}));

import { isTelemetryEnabled, syncTelemetry } from '../services/telemetry';
import { getAllStoredEvents, removeOldestEvents } from '../services/eventLogger';

describe('telemetry Supabase sink', () => {
  let nowOffset = 0;

  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    mockCaptureActive = false;
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    (getAllStoredEvents as jest.Mock).mockClear();
    (removeOldestEvents as jest.Mock).mockClear();
    // Defeat syncTelemetry's per-attempt throttle (module-level lastSyncAttempt
    // persists across tests) by advancing the clock well past SYNC_THROTTLE_MS.
    nowOffset += 10 * 60_000;
    jest.spyOn(Date, 'now').mockImplementation(() => 1_700_000_000_000 + nowOffset);
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
    jest.restoreAllMocks();
  });

  test('isTelemetryEnabled is true when only Supabase is configured', () => {
    mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };
    expect(isTelemetryEnabled()).toBe(true);
  });

  test('stays fully silent when nothing is configured', async () => {
    expect(isTelemetryEnabled()).toBe(false);
    await syncTelemetry();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(removeOldestEvents).not.toHaveBeenCalled();
  });

  test('capture mode suppresses configured telemetry', async () => {
    mockExtra = {
      telemetryEndpoint: 'https://collector.example/capture',
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'anon-key',
    };
    mockCaptureActive = true;

    expect(isTelemetryEnabled()).toBe(false);
    await syncTelemetry();
    expect(getAllStoredEvents).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(removeOldestEvents).not.toHaveBeenCalled();
  });

  test('uploads events to the Supabase `events` table when only Supabase is configured', async () => {
    mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };

    await syncTelemetry();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://x.supabase.co/rest/v1/events');
    expect(init.method).toBe('POST');
    expect(init.headers.apikey).toBe('anon-key');
    expect(init.headers.Prefer).toContain('return=minimal');

    const rows = JSON.parse(init.body);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0].type).toBe('puzzle_completed');
    expect(rows[0].app_version).toBe('1.2.3');
    expect(rows[0].data).toEqual({ stars: 3 });
    expect(typeof rows[0].install_id).toBe('string');
    expect(typeof rows[0].created_at).toBe('string');

    // On success the batch is dequeued.
    expect(removeOldestEvents).toHaveBeenCalledWith(mockEvents.length);
  });

  test('prefers the custom endpoint over Supabase when both are configured', async () => {
    mockExtra = {
      telemetryEndpoint: 'https://collector.example/capture',
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'anon-key',
    };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await syncTelemetry();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://collector.example/capture');
  });
});
