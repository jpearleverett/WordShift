import { storage } from './storage';

const STORAGE_KEY = 'wordshift_event_log';
const MAX_EVENTS = 500;

/**
 * Event types tracked by the game
 */
export type EventType =
  | 'puzzle_completed'
  | 'puzzle_generation_failed'
  | 'puzzle_started'
  | 'unlock_purchased'
  | 'dialogue_started'
  | 'dialogue_completed'
  | 'phase_changed'
  | 'app_error';

/**
 * A logged game event
 */
export interface GameEvent {
  type: EventType;
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface StoredEvent extends GameEvent {
  timestamp: number;
}

// In-memory buffer — flushed to storage periodically
let eventBuffer: StoredEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Log a game event. Events are buffered in memory and periodically
 * flushed to MMKV.
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
  }
}

/**
 * Flush buffered events to MMKV
 */
function flushEvents(): void {
  if (eventBuffer.length === 0) return;

  const eventsToFlush = [...eventBuffer];
  eventBuffer = [];

  const stored = storage.getString(STORAGE_KEY);
  const existing: StoredEvent[] = stored !== undefined ? JSON.parse(stored) : [];

  const combined = [...existing, ...eventsToFlush];

  // Keep only the most recent events
  if (combined.length > MAX_EVENTS) {
    combined.splice(0, combined.length - MAX_EVENTS);
  }

  storage.set(STORAGE_KEY, JSON.stringify(combined));
}

/**
 * Get all stored events (for diagnostics/export)
 */
export function getEvents(): StoredEvent[] {
  // Flush any pending events first
  flushEvents();

  const stored = storage.getString(STORAGE_KEY);
  return stored !== undefined ? JSON.parse(stored) : [];
}

/**
 * Get event counts by type (for quick diagnostics)
 */
export function getEventSummary(): Record<string, number> {
  const events = getEvents();
  const summary: Record<string, number> = {};

  for (const event of events) {
    summary[event.type] = (summary[event.type] || 0) + 1;
  }

  return summary;
}

/**
 * Get recent events of a specific type
 */
export function getRecentEvents(type: EventType, limit: number = 20): StoredEvent[] {
  const events = getEvents();
  return events
    .filter(e => e.type === type)
    .slice(-limit);
}

/**
 * Clear all stored events (for testing/reset)
 */
export function clearEvents(): void {
  eventBuffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  storage.remove(STORAGE_KEY);
}
