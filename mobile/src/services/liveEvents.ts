import { getLocalDateString, parseLocalDate } from './dateUtils';

/**
 * Live-ops event layer — deterministic, client-side, serverless.
 *
 * WordShift deliberately has no event server. Every "live" event here is pure
 * math on the player's LOCAL calendar, riding the same seeded-determinism
 * rails as the daily challenge and quest rotation: the same date always
 * produces the same answer on every device, with NO Math.random and NO
 * network.
 *
 * The one event shipped: the full moon ("the night the sky thins"). Full
 * moons are approximated from a known lunar epoch (the new moon of
 * 2000-01-06T18:14Z) and the mean synodic month. A LOCAL calendar day is an
 * event day when it contains a moment within +/-1.0 day of a full moon,
 * which yields a 2-3 day window roughly monthly.
 *
 * Day-bucketing follows the app-wide rule: LOCAL calendar days via
 * dateUtils, never toISOString/UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Known new moon: 2000-01-06T18:14Z (standard lunar-phase epoch). */
export const LUNAR_EPOCH_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

/** Mean synodic month (new moon to new moon), in days. */
export const SYNODIC_MONTH_DAYS = 29.530588853;

const SYNODIC_MONTH_MS = SYNODIC_MONTH_DAYS * DAY_MS;

/**
 * Half-width of the event window around each full moon, in ms. A local day
 * is an event day when it overlaps (fullMoon - window, fullMoon + window).
 */
const EVENT_HALF_WINDOW_MS = 1.0 * DAY_MS;

export const FULL_MOON_EVENT_ID = 'full_moon' as const;

/**
 * The moment (epoch ms, UTC timeline) of the `cycle`-th full moon since the
 * lunar epoch: epoch + (cycle + 0.5) * synodic month. Exported so tests can
 * derive real full-moon dates from the formula itself instead of hardcoding
 * an ephemeris.
 */
export function fullMoonTimeMs(cycle: number): number {
  return LUNAR_EPOCH_NEW_MOON_MS + (cycle + 0.5) * SYNODIC_MONTH_MS;
}

/**
 * Whether the given LOCAL calendar day (YYYY-MM-DD, as produced by
 * dateUtils.getLocalDateString) is a full-moon event day: the day contains a
 * moment within +/-1.0 day of a full moon.
 *
 * Pure and deterministic — same string in, same boolean out, everywhere.
 * DST-safe: the day's span is derived from consecutive local midnights, so
 * 23/25-hour days are handled exactly.
 */
export function isEventDay(dateStr: string): boolean {
  const dayStart = parseLocalDate(dateStr);
  const nextMidnight = new Date(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate() + 1
  );
  const startMs = dayStart.getTime();
  const endMs = nextMidnight.getTime(); // exclusive

  // Nearest full-moon cycles around the day's midpoint; checking the
  // neighbors covers every overlap case at month boundaries.
  const midMs = (startMs + endMs) / 2;
  const approxCycle = Math.round(
    (midMs - LUNAR_EPOCH_NEW_MOON_MS) / SYNODIC_MONTH_MS - 0.5
  );
  for (const cycle of [approxCycle - 1, approxCycle, approxCycle + 1]) {
    const fm = fullMoonTimeMs(cycle);
    // Overlap of [startMs, endMs) with the open window
    // (fm - EVENT_HALF_WINDOW_MS, fm + EVENT_HALF_WINDOW_MS).
    if (fm - EVENT_HALF_WINDOW_MS < endMs && fm + EVENT_HALF_WINDOW_MS > startMs) {
      return true;
    }
  }
  return false;
}

export interface ActiveLiveEvent {
  id: typeof FULL_MOON_EVENT_ID;
  /** 0-based position of today within the consecutive run of event days. */
  dayIndex: number;
  /** Event days left INCLUDING today (1 = the final night). */
  daysRemaining: number;
}

/** Local day string offset by whole calendar days from `base` (DST-safe). */
function localDayWithOffset(base: Date, deltaDays: number): string {
  return getLocalDateString(
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays)
  );
}

// The +/-1.0-day window spans 48 hours, which touches at most 3 local
// calendar days (4 across a DST-shortened day). Bound the run walk safely.
const MAX_RUN_WALK = 4;

/**
 * The active full-moon event for the local day containing `now`, or null
 * outside the window. Deterministic for a given `now` — no randomness.
 */
export function getActiveEvent(now: Date = new Date()): ActiveLiveEvent | null {
  if (!isEventDay(getLocalDateString(now))) return null;

  let dayIndex = 0;
  for (let i = 1; i <= MAX_RUN_WALK; i++) {
    if (!isEventDay(localDayWithOffset(now, -i))) break;
    dayIndex++;
  }
  let daysAfter = 0;
  for (let i = 1; i <= MAX_RUN_WALK; i++) {
    if (!isEventDay(localDayWithOffset(now, i))) break;
    daysAfter++;
  }

  return {
    id: FULL_MOON_EVENT_ID,
    dayIndex,
    daysRemaining: daysAfter + 1,
  };
}

/** Bonus rate on the daily challenge's amber during the event (+50%). */
export const EVENT_DAILY_BONUS_RATE = 0.5;

/**
 * The full-moon event's ONLY economy effect: a +50% bonus (rounded) on the
 * daily challenge's amber, returned as the BONUS amount for the caller to
 * credit via awardBonusAmber (source 'event_daily_bonus').
 *
 * This is bonus amber ONLY — it must NEVER feed phase progress. Like every
 * purchased or bonus amber source, the event changes what the player can
 * spend, never how fast the story descends.
 */
export function getEventDailyBonusAmber(baseAmber: number): number {
  if (!Number.isFinite(baseAmber) || baseAmber <= 0) return 0;
  return Math.round(baseAmber * EVENT_DAILY_BONUS_RATE);
}
