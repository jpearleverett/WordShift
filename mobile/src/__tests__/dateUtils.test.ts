import {
  getLocalDateString,
  getLocalDateStringDaysAgo,
  parseLocalDate,
  daysAgoLocal,
} from '../services/dateUtils';

describe('dateUtils', () => {
  describe('getLocalDateString', () => {
    it('formats a given date from LOCAL components, zero-padded', () => {
      // Build from local components (never an ISO string — that parses as UTC).
      const d = new Date(2026, 0, 5); // Jan 5, 2026 local
      expect(getLocalDateString(d)).toBe('2026-01-05');
    });

    it('uses the local calendar day, not the UTC day', () => {
      // 2026-06-15 23:30 local. In any timezone behind UTC this is still the
      // 15th locally, but toISOString() would roll it to the 16th (UTC).
      const lateNight = new Date(2026, 5, 15, 23, 30, 0);
      expect(getLocalDateString(lateNight)).toBe('2026-06-15');
    });

    it('defaults to today (local)', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getLocalDateString()).toBe(expected);
    });
  });

  describe('getLocalDateStringDaysAgo', () => {
    it('returns the local day N days before today', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() - 1);
      expect(getLocalDateStringDaysAgo(1)).toBe(getLocalDateString(expected));
    });

    it('0 days ago equals today', () => {
      expect(getLocalDateStringDaysAgo(0)).toBe(getLocalDateString());
    });
  });

  describe('parseLocalDate', () => {
    it('parses a YYYY-MM-DD key to LOCAL midnight', () => {
      const d = parseLocalDate('2026-06-15');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5); // June (0-indexed)
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(0);
    });

    it('round-trips with getLocalDateString', () => {
      const key = '2026-12-31';
      expect(getLocalDateString(parseLocalDate(key))).toBe(key);
    });
  });

  describe('daysAgoLocal', () => {
    it('returns 0 for today', () => {
      expect(daysAgoLocal(getLocalDateString())).toBe(0);
    });

    it('returns 1 for yesterday', () => {
      expect(daysAgoLocal(getLocalDateStringDaysAgo(1))).toBe(1);
    });

    it('returns the whole-day gap for an older date', () => {
      expect(daysAgoLocal(getLocalDateStringDaysAgo(5))).toBe(5);
    });
  });
});
