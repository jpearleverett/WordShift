let mockCaptureActive = false;
jest.mock('../dev/playStoreCapture', () => ({
  isPlayStoreCaptureActive: () => mockCaptureActive,
}));

import { logEvent, getEvents, getEventSummary, getRecentEvents, clearEvents } from '../services/eventLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  mockCaptureActive = false;
  (AsyncStorage.clear as jest.Mock)();
  await clearEvents();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('logEvent', () => {
  test('normal mode logs event with auto-generated timestamp', async () => {
    logEvent({ type: 'puzzle_completed' });
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const events = await getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('puzzle_completed');
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  test('capture mode creates no timer, storage, or buffered event side effects', async () => {
    mockCaptureActive = true;
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();

    logEvent({ type: 'app_open', data: { source: 'capture' } });

    expect(jest.getTimerCount()).toBe(0);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    mockCaptureActive = false;
    await expect(getEvents()).resolves.toEqual([]);
  });

  test('logs event with custom data', async () => {
    logEvent({
      type: 'puzzle_completed',
      data: { difficulty: 'HARD', stars: 3 },
    });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const events = await getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ difficulty: 'HARD', stars: 3 });
  });

  test('logs event with custom timestamp', async () => {
    const customTime = 1700000000000;
    logEvent({ type: 'puzzle_started', timestamp: customTime });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const events = await getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toBe(customTime);
  });

  test('buffers multiple events before flush', async () => {
    logEvent({ type: 'puzzle_started' });
    logEvent({ type: 'puzzle_completed' });
    logEvent({ type: 'phase_changed' });

    // Before flush timeout — events should not be stored yet
    const beforeFlush = await AsyncStorage.getItem('wordshift_event_log');
    expect(beforeFlush).toBeNull();

    // After flush timeout — events should be stored
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const events = await getEvents();
    expect(events).toHaveLength(3);
  });
});

describe('getEvents', () => {
  test('returns empty array initially', async () => {
    const events = await getEvents();
    expect(events).toEqual([]);
  });

  test('returns logged events after flush', async () => {
    logEvent({ type: 'puzzle_completed' });
    logEvent({ type: 'puzzle_started' });
    jest.advanceTimersByTime(6000);

    // Allow async flush to complete
    await Promise.resolve();
    const events = await getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('puzzle_completed');
    expect(events[1].type).toBe('puzzle_started');
  });
});

describe('getEventSummary', () => {
  test('returns counts by event type', async () => {
    logEvent({ type: 'puzzle_completed' });
    logEvent({ type: 'puzzle_completed' });
    logEvent({ type: 'puzzle_started' });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const summary = await getEventSummary();
    expect(summary['puzzle_completed']).toBe(2);
    expect(summary['puzzle_started']).toBe(1);
  });
});

describe('getRecentEvents', () => {
  test('filters by event type', async () => {
    logEvent({ type: 'puzzle_completed', data: { stars: 3 } });
    logEvent({ type: 'puzzle_started' });
    logEvent({ type: 'puzzle_completed', data: { stars: 1 } });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const recent = await getRecentEvents('puzzle_completed');
    expect(recent).toHaveLength(2);
    expect(recent.every(e => e.type === 'puzzle_completed')).toBe(true);
  });
});

describe('clearEvents', () => {
  test('removes all stored events', async () => {
    logEvent({ type: 'puzzle_completed' });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    await clearEvents();
    const events = await getEvents();
    expect(events).toEqual([]);
  });
});
