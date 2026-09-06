import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString, daysAgoLocal } from './dateUtils';

const STORAGE_KEY = 'wordshift_event_log';
const INSTALL_DATE_KEY = 'wordshift_install_date';
const MAX_EVENTS = 500;

/**
 * Event types tracked by the game
 */
export type EventType =
  | 'puzzle_completed'
  | 'puzzle_generation_failed'
  | 'puzzle_started'
  | 'puzzle_restored'
  | 'daily_completed'
  | 'unlock_purchased'
  | 'room_upgrade_purchased'
  | 'dialogue_started'
  | 'dialogue_completed'
  | 'phase_changed'
  | 'phase_reached'
  | 'quest_reward_claimed'
  | 'harvest_auto_collected'
  | 'deep_link_opened'
  | 'share_completed'
  | 'app_open'
  | 'notification_permission_result'
  | 'onboarding_step'
  | 'onboarding_complete'
  | 'pit_offer'
  | 'first_manual_harvest'
  // Purchase funnel: store_opened → purchase_initiated → iap_purchase (success)
  //                                                    ↘ purchase_cancelled / purchase_failed
  | 'store_opened'
  | 'purchase_initiated'
  | 'iap_purchase'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'daily_amber_claimed'
  | 'supporter_stipend_granted'
  | 'season_reward_claimed'
  | 'app_error'
  | 'cloud_sync_result'
  | 'hint_requested'
  | 'puzzle_abandoned'
  | 'ad_availability'
  | 'story_started' | 'story_deferred' | 'story_completed' | 'story_choice'
  | 'story_resumed' | 'cinematic_skipped' | 'story_world_inspected';

/**
 * A logged game event
 */
export interface GameEvent {
  type: EventType;
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface StoredEvent extends GameEvent {
  id: string;
  timestamp: number;
}

// In-memory buffer — flushed to storage periodically
let eventBuffer: StoredEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let storageQueue: Promise<unknown> = Promise.resolve();
const eventSession = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
let eventSequence = 0;
let bufferGeneration = 0;
function eventId(): string { return `${eventSession}_${++eventSequence}`; }
function queued<T>(work: () => Promise<T>): Promise<T> {
  const run = storageQueue.catch(() => {}).then(work);
  storageQueue = run;
  return run;
}
async function readEvents(): Promise<StoredEvent[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed)) return [];
  let changed = false;
  const events = parsed.filter(event => event && typeof event.type === 'string' && Number.isFinite(event.timestamp))
    .map(event => {
      if (typeof event.id === 'string' && event.id) return event as StoredEvent;
      changed = true;
      return { ...event, id: eventId() } as StoredEvent;
    });
  // Assign legacy records an ID once, before handing them to the uploader.
  if (changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events;
}

// In-memory cache of the persisted install date (LOCAL calendar day).
let installDateCache: string | null = null;

/**
 * Whole local calendar days since the app was first seen (0 on install day).
 * The install date is persisted on first call under 'wordshift_install_date'
 * as a LOCAL day key (via dateUtils — never toISOString/UTC), so telemetry
 * like `phase_reached` can segment by player age without any identity beyond
 * the anonymous install. Device meta by design: NOT cloud-synced and NOT
 * cleared by clearEvents (only the in-memory copy is dropped there).
 *
 * Known limitation (accepted): a player who was already mid-game when this
 * key was introduced mints their install date on the first call after the
 * update, so their reported age starts at 0. Harmless for launch — the game
 * ships this key from its first public build, so the only affected cohort is
 * internal-test devices, whose ages segment analytics don't rely on.
 */
export async function getInstallAgeDays(): Promise<number> {
  try {
    if (!installDateCache) {
      const stored = await AsyncStorage.getItem(INSTALL_DATE_KEY);
      if (stored) {
        installDateCache = stored;
      } else {
        installDateCache = getLocalDateString();
        await AsyncStorage.setItem(INSTALL_DATE_KEY, installDateCache);
      }
    }
    // Clamp: a clock rolled backwards must never report a negative age.
    return Math.max(0, daysAgoLocal(installDateCache));
  } catch (error) {
    console.warn('Failed to resolve install age:', error);
    return 0;
  }
}

/**
 * Log a game event. Events are buffered in memory and periodically
 * flushed to AsyncStorage.
 */
export function logEvent(event: GameEvent): void {
  const storedEvent: StoredEvent = {
    ...event,
    id: eventId(),
    timestamp: event.timestamp ?? Date.now(),
  };

  eventBuffer.push(storedEvent);

  // Debounce flush — write at most every 5 seconds
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushEvents();
      flushTimer = null;
    }, 5000);
    // In Node (tests), don't let the debounce timer hold the process open.
    (flushTimer as { unref?: () => void }).unref?.();
  }
}

/**
 * Flush buffered events to AsyncStorage
 */
async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) { await storageQueue.catch(() => {}); return; }
  const eventsToFlush = eventBuffer;
  const generation = bufferGeneration;
  eventBuffer = [];
  try {
    await queued(async () => {
      const combined = [...await readEvents(), ...eventsToFlush].slice(-MAX_EVENTS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    });
  } catch (error) {
    if (generation === bufferGeneration) eventBuffer = [...eventsToFlush, ...eventBuffer];
    console.warn('Failed to flush events:', error);
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Defer this dependency to preserve native availability and import-cycle boundaries.
    const { syncTelemetry } = require('./telemetry') as typeof import('./telemetry');
    void syncTelemetry().catch(() => {});
  } catch { /* Non-critical diagnostics transport. */ }
}

export async function getEvents(): Promise<StoredEvent[]> {
  try {
    await flushEvents();
    return await queued(readEvents);
  } catch (error) {
    console.warn('Failed to load events:', error);
    return [];
  }
}
export async function getAllStoredEvents(): Promise<StoredEvent[]> { return getEvents(); }

/** Acknowledge precisely the uploaded records, never a shifting queue length. */
export async function acknowledgeEvents(ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const acknowledged = new Set(ids);
  await queued(async () => {
    const remaining = (await readEvents()).filter(event => !acknowledged.has(event.id));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  });
}

/** Legacy diagnostics helper. Transports must use acknowledgeEvents. */
export async function removeOldestEvents(count: number): Promise<void> {
  if (count <= 0) return;
  await queued(async () => {
    const events = await readEvents();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(count)));
  });
}

/**
 * Get event counts by type (for quick diagnostics)
 */
export async function getEventSummary(): Promise<Record<string, number>> {
  const events = await getEvents();
  const summary: Record<string, number> = {};

  for (const event of events) {
    summary[event.type] = (summary[event.type] || 0) + 1;
  }

  return summary;
}

/**
 * Get recent events of a specific type
 */
export async function getRecentEvents(type: EventType, limit: number = 20): Promise<StoredEvent[]> {
  const events = await getEvents();
  return events
    .filter(e => e.type === type)
    .slice(-limit);
}

/**
 * Clear all stored events (for testing/reset)
 */
export async function clearEvents(): Promise<void> {
  try {
    bufferGeneration++;
    eventBuffer = [];
    // Drop only the in-memory install-date copy (test isolation); the persisted
    // install date is device meta, deliberately not removed on reset.
    installDateCache = null;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await queued(() => AsyncStorage.removeItem(STORAGE_KEY));
  } catch (error) {
    console.warn('Failed to clear events:', error);
  }
}
