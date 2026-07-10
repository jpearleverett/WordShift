import {
  fullMoonTimeMs,
  isEventDay,
  getActiveEvent,
  getEventDailyBonusAmber,
  EVENT_DAILY_BONUS_RATE,
  FULL_MOON_EVENT_ID,
  LUNAR_EPOCH_NEW_MOON_MS,
  SYNODIC_MONTH_DAYS,
} from '../services/liveEvents';
import { getLocalDateString } from '../services/dateUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day (YYYY-MM-DD) containing the given epoch-ms moment. */
function localDayOf(ms: number): string {
  return getLocalDateString(new Date(ms));
}

/** Local day string offset by whole calendar days (DST-safe, local components). */
function addLocalDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return getLocalDateString(new Date(y, m - 1, d + delta));
}

/**
 * Full-moon cycles landing in 2026 — computed from the exported formula
 * itself (epoch + (n + 0.5) x synodic), so the test tracks the
 * implementation, never a hardcoded ephemeris.
 */
function fullMoonCyclesIn2026(): number[] {
  const start = new Date(2026, 0, 1).getTime();
  const end = new Date(2027, 0, 1).getTime();
  const cycles: number[] = [];
  for (let n = 280; n < 380; n++) {
    const t = fullMoonTimeMs(n);
    if (t >= start && t < end) cycles.push(n);
  }
  return cycles;
}

/** Length of the consecutive event-day run containing `dateStr`. */
function eventRunLength(dateStr: string): number {
  expect(isEventDay(dateStr)).toBe(true);
  let len = 1;
  for (let i = 1; i <= 5; i++) {
    if (!isEventDay(addLocalDays(dateStr, -i))) break;
    len++;
  }
  for (let i = 1; i <= 5; i++) {
    if (!isEventDay(addLocalDays(dateStr, i))) break;
    len++;
  }
  return len;
}

describe('liveEvents (full-moon event)', () => {
  describe('lunar formula', () => {
    it('uses the standard epoch and synodic month', () => {
      expect(LUNAR_EPOCH_NEW_MOON_MS).toBe(Date.UTC(2000, 0, 6, 18, 14, 0));
      expect(SYNODIC_MONTH_DAYS).toBeCloseTo(29.530588853, 9);
      // Full moon n is exactly half a synodic month past new moon n.
      expect(fullMoonTimeMs(0)).toBe(
        LUNAR_EPOCH_NEW_MOON_MS + 0.5 * SYNODIC_MONTH_DAYS * DAY_MS
      );
    });

    it('produces 12-13 full moons across 2026', () => {
      const cycles = fullMoonCyclesIn2026();
      expect(cycles.length).toBeGreaterThanOrEqual(12);
      expect(cycles.length).toBeLessThanOrEqual(13);
      // Consecutive cycles are exactly one synodic month apart.
      expect(fullMoonTimeMs(cycles[1]) - fullMoonTimeMs(cycles[0])).toBeCloseTo(
        SYNODIC_MONTH_DAYS * DAY_MS,
        3
      );
    });
  });

  describe('isEventDay', () => {
    it('the local day containing each 2026 full moon is an event day', () => {
      for (const n of fullMoonCyclesIn2026()) {
        expect(isEventDay(localDayOf(fullMoonTimeMs(n)))).toBe(true);
      }
    });

    it('window edges: days containing moments at +/-1.0 day are event days, days beyond are not', () => {
      // Exercise a few 2026 full moons spread across the year.
      const cycles = fullMoonCyclesIn2026();
      for (const n of [cycles[0], cycles[5], cycles[cycles.length - 1]]) {
        const fm = fullMoonTimeMs(n);
        // The days containing the window-edge moments are inside the window.
        const dayAtMinus1 = localDayOf(fm - DAY_MS + 1);
        const dayAtPlus1 = localDayOf(fm + DAY_MS - 1);
        expect(isEventDay(dayAtMinus1)).toBe(true);
        expect(isEventDay(dayAtPlus1)).toBe(true);
        // One calendar day beyond either edge is fully outside the window.
        expect(isEventDay(addLocalDays(dayAtMinus1, -1))).toBe(false);
        expect(isEventDay(addLocalDays(dayAtPlus1, 1))).toBe(false);
      }
    });

    it('yields a 2-3 day window around each 2026 full moon', () => {
      for (const n of fullMoonCyclesIn2026()) {
        const run = eventRunLength(localDayOf(fullMoonTimeMs(n)));
        // 48h window: 3 local days typically, 2 when an edge aligns with
        // midnight (4 only across a DST-shortened day).
        expect(run).toBeGreaterThanOrEqual(2);
        expect(run).toBeLessThanOrEqual(4);
      }
    });

    it('days far from any full moon are not event days', () => {
      const cycles = fullMoonCyclesIn2026();
      for (const n of [cycles[2], cycles[8]]) {
        const fm = fullMoonTimeMs(n);
        // A week after a full moon is far from both this window and the next
        // (the next full moon is ~29.5 days out).
        expect(isEventDay(localDayOf(fm + 7 * DAY_MS))).toBe(false);
        expect(isEventDay(localDayOf(fm - 7 * DAY_MS))).toBe(false);
        // Half a synodic month away is a NEW moon, never an event.
        expect(
          isEventDay(localDayOf(fm + 0.5 * SYNODIC_MONTH_DAYS * DAY_MS))
        ).toBe(false);
      }
    });

    it('is deterministic: same input, same answer', () => {
      const fm = fullMoonTimeMs(fullMoonCyclesIn2026()[3]);
      for (const day of [localDayOf(fm), localDayOf(fm + 10 * DAY_MS)]) {
        expect(isEventDay(day)).toBe(isEventDay(day));
        const first = isEventDay(day);
        for (let i = 0; i < 5; i++) expect(isEventDay(day)).toBe(first);
      }
    });
  });

  describe('getActiveEvent', () => {
    it('returns the event at a full-moon moment with coherent day accounting', () => {
      const fm = fullMoonTimeMs(fullMoonCyclesIn2026()[4]);
      const now = new Date(fm);
      const active = getActiveEvent(now);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(FULL_MOON_EVENT_ID);
      expect(active!.id).toBe('full_moon');
      expect(active!.dayIndex).toBeGreaterThanOrEqual(0);
      expect(active!.daysRemaining).toBeGreaterThanOrEqual(1);
      // dayIndex (0-based) + daysRemaining (includes today) = full run length.
      const run = eventRunLength(localDayOf(fm));
      expect(active!.dayIndex + active!.daysRemaining).toBe(run);
    });

    it('walks the run correctly on the first and last event day', () => {
      const fm = fullMoonTimeMs(fullMoonCyclesIn2026()[6]);
      const fmDay = localDayOf(fm);
      // Find the first day of the run.
      let firstDay = fmDay;
      while (isEventDay(addLocalDays(firstDay, -1))) {
        firstDay = addLocalDays(firstDay, -1);
      }
      const run = eventRunLength(fmDay);
      const [fy, fmm, fd] = firstDay.split('-').map(Number);
      const firstNoon = new Date(fy, fmm - 1, fd, 12, 0, 0);
      const first = getActiveEvent(firstNoon);
      expect(first).toEqual({
        id: 'full_moon',
        dayIndex: 0,
        daysRemaining: run,
      });
      const lastDay = addLocalDays(firstDay, run - 1);
      const [ly, lm, ld] = lastDay.split('-').map(Number);
      const last = getActiveEvent(new Date(ly, lm - 1, ld, 12, 0, 0));
      expect(last).toEqual({
        id: 'full_moon',
        dayIndex: run - 1,
        daysRemaining: 1,
      });
    });

    it('returns null outside the window and is deterministic', () => {
      const fm = fullMoonTimeMs(fullMoonCyclesIn2026()[4]);
      expect(getActiveEvent(new Date(fm + 7 * DAY_MS))).toBeNull();
      const now = new Date(fm);
      expect(getActiveEvent(now)).toEqual(getActiveEvent(now));
    });
  });

  describe('getEventDailyBonusAmber', () => {
    it('returns +50% rounded', () => {
      expect(EVENT_DAILY_BONUS_RATE).toBe(0.5);
      expect(getEventDailyBonusAmber(20)).toBe(10); // daily counts as HARD (20)
      expect(getEventDailyBonusAmber(25)).toBe(13); // 12.5 rounds up
      expect(getEventDailyBonusAmber(8)).toBe(4);
      expect(getEventDailyBonusAmber(1)).toBe(1); // 0.5 rounds up
    });

    it('never returns a bonus for zero, negative, or invalid amber', () => {
      expect(getEventDailyBonusAmber(0)).toBe(0);
      expect(getEventDailyBonusAmber(-10)).toBe(0);
      expect(getEventDailyBonusAmber(NaN)).toBe(0);
      expect(getEventDailyBonusAmber(Infinity)).toBe(0);
    });
  });
});
