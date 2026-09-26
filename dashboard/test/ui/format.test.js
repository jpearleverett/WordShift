import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NBSP, addDays, fmtAge, fmtBytes, fmtCompact, fmtDay, fmtDayTime, fmtInt, fmtMoney, fmtPct,
  fmtShort, fmtShortDay, fmtTime, isSmall, niceCeil, num, parseIso, plural, ratio,
} from '../../public/js/format.js';

test('num accepts only finite numbers', () => {
  assert.equal(num(3), 3);
  assert.equal(num(0), 0);
  assert.equal(num('3'), null);
  assert.equal(num(NaN), null);
  assert.equal(num(Infinity), null);
  assert.equal(num(null), null);
  assert.equal(num(undefined), null);
});

test('fmtInt groups thousands and never throws on junk', () => {
  assert.equal(fmtInt(0), '0');
  assert.equal(fmtInt(18422), '18,422');
  assert.equal(fmtInt(1234567), '1,234,567');
  assert.equal(fmtInt(null), 'not available');
  assert.equal(fmtInt('12'), 'not available');
});

test('fmtCompact compacts only from a million', () => {
  assert.equal(fmtCompact(999999), '999,999');
  assert.equal(fmtCompact(1250000), '1.3M');
  assert.equal(fmtCompact(undefined), 'not available');
});

test('fmtShort compacts from ten thousand, for the three-across tiles', () => {
  assert.equal(fmtShort(9999), '9,999');
  assert.equal(fmtShort(13363), '13.4K');
  assert.equal(fmtShort(100000), '100K');
  assert.equal(fmtShort(123456), '123K');
  assert.equal(fmtShort(999999), '1M');
  assert.equal(fmtShort(1250000), '1.25M');
  assert.equal(fmtShort(null), 'not available');
});

test('fmtPct: one decimal under 10%, none above, pending for null', () => {
  assert.equal(fmtPct(null), 'pending');
  assert.equal(fmtPct(0), '0%');
  assert.equal(fmtPct(1), '100%');
  assert.equal(fmtPct(0.042), '4.2%');
  assert.equal(fmtPct(0.5), '50%');
  assert.equal(fmtPct(0.831), '83%');
  assert.equal(fmtPct(0.996), '99.6%', 'never rounds up to a false 100%');
  assert.equal(fmtPct(0.0996), '10.0%');
  assert.equal(fmtPct(0.9964, 2), '99.64%');
  assert.equal(fmtPct(1, 2), '100%');
});

test('ratio guards against empty denominators', () => {
  assert.equal(ratio(1, 4), 0.25);
  assert.equal(ratio(1, 0), null);
  assert.equal(ratio(null, 4), null);
  assert.equal(ratio(1, -3), null);
});

test('fmtAge picks s, min, h, days and keeps the unit on the same line', () => {
  assert.equal(fmtAge(0), `0${NBSP}s`);
  assert.equal(fmtAge(59_999), `59${NBSP}s`);
  assert.equal(fmtAge(60_000), `1${NBSP}min`);
  assert.equal(fmtAge(3_599_999), `59${NBSP}min`);
  assert.equal(fmtAge(3_600_000), `1${NBSP}h`);
  assert.equal(fmtAge(47.9 * 3_600_000), `47${NBSP}h`);
  assert.equal(fmtAge(48 * 3_600_000), `2${NBSP}days`);
  assert.equal(fmtAge(-5_000), `0${NBSP}s`, 'clock skew never shows a negative age');
  assert.equal(fmtAge(null), 'not available');
});

test('fmtBytes: MB without decimals, GB with one from 1024 MB', () => {
  assert.equal(fmtBytes(187695104), '179 MB');
  assert.equal(fmtBytes(1024 * 1024 * 1024), '1.0 GB');
  assert.equal(fmtBytes(1.5 * 1024 ** 3), '1.5 GB');
  assert.equal(fmtBytes(null), 'not available');
});

test('fmtMoney formats the currency and a short form for tiles', () => {
  assert.equal(fmtMoney(3.99, 'USD'), '$3.99');
  assert.equal(fmtMoney(11.97), '$11.97');
  assert.equal(fmtMoney(1284.37, 'USD'), '$1,284.37');
  assert.equal(fmtMoney(1284.37, 'USD', { short: true }), '$1,284');
  assert.equal(fmtMoney(35.91, 'USD', { short: true }), '$35.91');
  assert.equal(fmtMoney(2_500_000, 'USD', { short: true }), '$2.5M');
  assert.equal(fmtMoney(5, 'EUR'), '€5.00');
  assert.equal(fmtMoney(5, 'nope'), '$5.00');
  assert.equal(fmtMoney(null, 'USD'), 'not available');
});

test('parseIso accepts only full UTC timestamps', () => {
  assert.equal(parseIso('2026-09-26T18:30:00Z'), Date.UTC(2026, 8, 26, 18, 30, 0));
  assert.equal(parseIso('2026-09-26T18:30:00.123Z'), Date.UTC(2026, 8, 26, 18, 30, 0, 123));
  assert.equal(parseIso('2026-09-26'), null);
  assert.equal(parseIso('2026-09-26T18:30:00+02:00'), null);
  assert.equal(parseIso(null), null);
});

test('fmtTime shows 24 hour HH:MM in the data time zone', () => {
  assert.equal(fmtTime('2026-09-26T18:29:48Z', 'America/New_York'), '14:29');
  assert.equal(fmtTime('2026-09-26T18:29:48Z', 'UTC'), '18:29');
  assert.equal(fmtTime('2026-09-26T04:05:00Z', 'America/New_York'), '00:05');
  assert.equal(fmtTime('2026-09-26T18:29:48Z', 'Mars/Olympus'), '18:29', 'unknown zone falls back to UTC');
  assert.equal(fmtTime('garbage', 'UTC'), 'not available');
});

test('fmtDay and fmtShortDay read calendar days without a zone shift', () => {
  assert.equal(fmtDay('2026-09-26'), 'Sat 26 Sep');
  assert.equal(fmtDay('2026-10-04'), 'Sun 4 Oct');
  assert.equal(fmtDay('2026-13-01'), 'not available');
  assert.equal(fmtDay(''), 'not available');
  assert.equal(fmtShortDay('2026-09-26'), '26 Sep');
  assert.equal(fmtDayTime('2026-09-26T13:00:00Z', 'America/New_York'), 'Sat 26 Sep, 09:00');
});

test('addDays does UTC calendar arithmetic across month ends', () => {
  assert.equal(addDays('2026-09-26', 2), '2026-09-28');
  assert.equal(addDays('2026-09-26', 8), '2026-10-04');
  assert.equal(addDays('2026-09-26', 15), '2026-10-11');
  assert.equal(addDays('bad', 1), null);
});

test('isSmall marks samples under 30, and unknown ones', () => {
  assert.equal(isSmall(29), true);
  assert.equal(isSmall(30), false);
  assert.equal(isSmall(0), true);
  assert.equal(isSmall(null), true);
});

test('plural and niceCeil', () => {
  assert.equal(plural(1, 'device'), '1 device');
  assert.equal(plural(2, 'device'), '2 devices');
  assert.equal(plural(1500, 'entry', 'entries'), '1,500 entries');
  assert.equal(niceCeil(82), 100);
  assert.equal(niceCeil(262), 300);
  assert.equal(niceCeil(8), 8);
  assert.equal(niceCeil(401), 500);
  assert.equal(niceCeil(1), 1);
  assert.equal(niceCeil(0), 1);
  assert.equal(niceCeil(2.1), 2.5);
  assert.equal(niceCeil(0.3), 0.3);
});
