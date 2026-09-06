import AsyncStorage from '@react-native-async-storage/async-storage';

// Mutable expo-config extra so we can toggle configured/unconfigured per test.
let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: mockExtra, version: '1.2.3' };
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Provide a deterministic, non-empty event batch.
const mockEvents = [
  { id: 'event_test_1', type: 'puzzle_completed', data: { stars: 3 }, timestamp: 1_700_000_000_000 },
];
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getAllStoredEvents: jest.fn(async () => mockEvents),
  acknowledgeEvents: jest.fn(async () => {}),
}));

import { isTelemetryEnabled, syncTelemetry } from '../services/telemetry';
import { getAllStoredEvents, acknowledgeEvents } from '../services/eventLogger';

describe('telemetry Supabase sink', () => {
  let nowOffset = 0;

  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => true });
    (getAllStoredEvents as jest.Mock).mockClear();
    (acknowledgeEvents as jest.Mock).mockClear();
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
    expect(acknowledgeEvents).not.toHaveBeenCalled();
  });

  test('uploads events to the Supabase `events` table when only Supabase is configured', async () => {
    mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };

    await syncTelemetry();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/ingest_events_v2');
    expect(init.method).toBe('POST');
    expect(init.headers.apikey).toBe('anon-key');
    const payload = JSON.parse(init.body);
    expect(payload.p_events).toEqual(mockEvents);
    expect(payload.p_app_version).toBe('1.2.3');
    expect(typeof payload.p_install_id).toBe('string');

    // On success the batch is dequeued.
    expect(acknowledgeEvents).toHaveBeenCalledWith(['event_test_1']);
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
  test('overlapping uploads share a single in-flight request', async () => {
    mockExtra = { telemetryEndpoint: 'https://collector.example/capture' };
    let finish!: (response: {ok: boolean}) => void;
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = syncTelemetry();
    for (let tick=0; tick<10; tick++) await Promise.resolve();
    const second = syncTelemetry();
    expect(second).toBe(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    finish({ok: true}); await first;
    expect(acknowledgeEvents).toHaveBeenCalledTimes(1);
  });

  test('a hung custom endpoint times out and retains its exact batch', async () => {
    jest.useFakeTimers();
    try {
      mockExtra = { telemetryEndpoint: 'https://collector.example/capture' };
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
      const upload = syncTelemetry();
      for (let tick=0; tick<10; tick++) await Promise.resolve();
      jest.advanceTimersByTime(8001); await upload;
      expect(acknowledgeEvents).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });

  test('server rejection never acknowledges the local queue', async () => {
    mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };
    (global.fetch as jest.Mock).mockResolvedValue({ok: true, status: 200, json: async () => false});
    await syncTelemetry();
    expect(acknowledgeEvents).not.toHaveBeenCalled();
  });

});
