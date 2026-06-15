/**
 * Local-time date helpers.
 *
 * Day-bucketing (streaks, daily challenge, "played today") MUST use the
 * player's LOCAL calendar day. Computing the day with `toISOString()` derives
 * it in UTC, which rolls a sub-UTC-timezone player's evening session into
 * "tomorrow" and silently corrupts streak continuity and the daily-completed
 * check. Always derive day keys — and parse stored day keys back — from local
 * components.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's (or the given date's) local calendar day as a zero-padded YYYY-MM-DD string. */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The local calendar day `daysAgo` days before today, as YYYY-MM-DD. */
export function getLocalDateStringDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

/**
 * Parse a YYYY-MM-DD day key into a Date at LOCAL midnight.
 * (`new Date('2026-06-15')` would parse as UTC midnight — wrong for day math.)
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Whole local calendar days between `dateString` and today (today - date).
 * Uses local midnights and rounds, so it is correct across DST transitions
 * (where a calendar day is 23 or 25 hours long).
 */
export function daysAgoLocal(dateString: string): number {
  const then = parseLocalDate(dateString).getTime();
  const today = parseLocalDate(getLocalDateString()).getTime();
  return Math.round((today - then) / DAY_MS);
}
