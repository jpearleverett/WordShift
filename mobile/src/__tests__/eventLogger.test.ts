import { logEvent, getEvents, getEventSummary, getRecentEvents, clearEvents, getInstallAgeDays, acknowledgeEvents } from '../services/eventLogger';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearEvents();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('logEvent', () => {
  test('logs event with auto-generated timestamp', async () => {
    logEvent({ type: 'puzzle_completed' });
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    const events = await getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('puzzle_completed');
    expect(events[0].timestamp).toBeGreaterThan(0);
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

describe('getInstallAgeDays', () => {
  test('first call persists today as the LOCAL install date and returns 0', async () => {
    const age = await getInstallAgeDays();
    expect(age).toBe(0);

    const stored = await AsyncStorage.getItem('wordshift_install_date');
    expect(stored).toBe(getLocalDateString());
  });

  test('reuses a persisted install date and reports whole local days since', async () => {
    const fiveDaysAgo = getLocalDateStringDaysAgo(5);
    await AsyncStorage.setItem('wordshift_install_date', fiveDaysAgo);

    expect(await getInstallAgeDays()).toBe(5);
    // Stable across calls; the stored date is never rewritten.
    expect(await getInstallAgeDays()).toBe(5);
    expect(await AsyncStorage.getItem('wordshift_install_date')).toBe(fiveDaysAgo);
  });

  test('never reports a negative age if the clock rolled backwards', async () => {
    // A "future" install date (device clock moved back after install).
    await AsyncStorage.setItem('wordshift_install_date', getLocalDateStringDaysAgo(-3));
    expect(await getInstallAgeDays()).toBe(0);
  });

  test('clearEvents keeps the persisted install date (device meta, not reset)', async () => {
    await getInstallAgeDays();
    const stored = await AsyncStorage.getItem('wordshift_install_date');
    expect(stored).not.toBeNull();

    await clearEvents();
    expect(await AsyncStorage.getItem('wordshift_install_date')).toBe(stored);
    // And the age still resolves from the same persisted date after the reset.
    expect(await getInstallAgeDays()).toBe(0);
  });
});


describe('identified queue acknowledgement', () => {
  test('delayed upload plus retention trimming keeps every unuploaded event', async () => {
    for (let n=0; n<500; n++) logEvent({type: 'puzzle_started', data: {n}});
    const uploaded = await getEvents();
    for (let n=500; n<600; n++) logEvent({type: 'puzzle_started', data: {n}});
    expect(await getEvents()).toHaveLength(500);
    await acknowledgeEvents(uploaded.map(event => event.id));
    const unsent = await getEvents();
    expect(unsent).toHaveLength(100);
    expect(unsent.map(event => event.data?.n)).toEqual(Array.from({length:100}, (_,i)=>i+500));
  });

  test('legacy event IDs persist across queue reads and acknowledgements', async () => {
    await AsyncStorage.setItem('wordshift_event_log', JSON.stringify([{type:'app_open',timestamp:100}]));
    const [first] = await getEvents();
    const [second] = await getEvents();
    expect(first.id).toBe(second.id);
    expect(first.id).toBeTruthy();
    await acknowledgeEvents([first.id]);
    expect(await getEvents()).toEqual([]);
  });

  test('Reset during a failed flush never resurrects old events', async () => {
    const originalWrite = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
    let reject!: (error:Error)=>void;
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => new Promise((_, fail) => {reject=fail;}));
    try {
      logEvent({type:'app_open'});
      const flushing = getEvents();
      for(let n=0;n<10;n++) await Promise.resolve();
      const clearing = clearEvents();
      reject(new Error('disk full'));
      await Promise.all([flushing, clearing]);
      expect(await getEvents()).toEqual([]);
    } finally { (AsyncStorage.setItem as jest.Mock).mockImplementation(originalWrite); }
  });
});
