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
  | 'app_error';

/**
 * A logged game event
 */
export interface GameEvent {
  type: EventType;
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface StoredEvent extends GameEvent {
  timestamp: number;
}

// In-memory buffer — flushed to storage periodically
let eventBuffer: StoredEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (eventBuffer.length === 0) return;

  const eventsToFlush = [...eventBuffer];
  eventBuffer = [];

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const existing: StoredEvent[] = Array.isArray(parsed) ? parsed : [];

    const combined = [...existing, ...eventsToFlush];

    // Keep only the most recent events
    if (combined.length > MAX_EVENTS) {
      combined.splice(0, combined.length - MAX_EVENTS);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  } catch (error) {
    console.warn('Failed to flush events:', error);
    // Put events back in buffer so they're not lost
    eventBuffer = [...eventsToFlush, ...eventBuffer];
    return;
  }

  // Fire-and-forget telemetry sync. Lazy require avoids a static
  // import cycle (eventLogger ↔ telemetry). No-op when telemetry
  // is disabled (the default).
  try {
    const { syncTelemetry } = require('./telemetry') as typeof import('./telemetry');
    syncTelemetry().catch(() => {});
  } catch {
    // Telemetry unavailable — non-critical
  }
}

/**
 * Get all stored events (for diagnostics/export)
 */
export async function getEvents(): Promise<StoredEvent[]> {
  try {
    // Flush any pending events first
    await flushEvents();

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load events:', error);
    return [];
  }
}

/**
 * Get all stored events (for the telemetry uploader).
 * Flushes any pending buffered events first.
 */
export async function getAllStoredEvents(): Promise<StoredEvent[]> {
  return getEvents();
}

/**
 * Remove the oldest N stored events (called by the telemetry uploader
 * after a successful upload).
 */
export async function removeOldestEvents(count: number): Promise<void> {
  if (count <= 0) return;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const existing: StoredEvent[] = Array.isArray(parsed) ? parsed : [];
    const remaining = existing.slice(count);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (error) {
    console.warn('Failed to remove oldest events:', error);
  }
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
    eventBuffer = [];
    // Drop only the in-memory install-date copy (test isolation); the persisted
    // install date is device meta, deliberately not removed on reset.
    installDateCache = null;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear events:', error);
  }
}
