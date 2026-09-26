// Pure formatting helpers. No DOM access, so node:test can import this file.

const INT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
// Three significant digits at most ("13.4K", "123K", "1.25M"): fits a third of a phone.
const SHORT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const NOT_AVAILABLE = 'not available';
/** Non-breaking space: keeps "17 s" and "24 h" on one line. */
export const NBSP = '\u00a0';

/** A finite number, or null. Guards every value that comes from the server. */
export function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 1234 -> "1,234". Non-numbers read "not available". */
export function fmtInt(value) {
  const n = num(value);
  return n === null ? NOT_AVAILABLE : INT.format(Math.round(n));
}

/** Like fmtInt, but compacts from a million up so a stat tile never overflows. */
export function fmtCompact(value) {
  const n = num(value);
  if (n === null) return NOT_AVAILABLE;
  return Math.abs(n) >= 1e6 ? COMPACT.format(n) : INT.format(Math.round(n));
}

/**
 * Short form for the narrow three-across tiles: compacts from ten thousand to
 * three significant digits ("13.4K", "123K"), so a count never wraps. Pair it with the full number
 * (fmtInt) in text a screen reader gets.
 */
export function fmtShort(value) {
  const n = num(value);
  if (n === null) return NOT_AVAILABLE;
  return Math.abs(n) >= 10_000 ? SHORT.format(n) : INT.format(Math.round(n));
}

/**
 * A rate in 0..1 as a percentage with its % sign. Under 10% keeps one decimal,
 * otherwise none; a rate that would round to 0% or 100% without being exactly
 * that keeps one decimal so it never overstates. null reads "pending".
 * `decimals` forces a precision (crash-free rates use 2).
 */
export function fmtPct(rate, decimals) {
  const r = num(rate);
  if (r === null) return 'pending';
  const pct = r * 100;
  let d = typeof decimals === 'number' ? decimals : (r !== 0 && Math.abs(r) < 0.1 ? 1 : 0);
  if (r === 0 || r === 1) d = 0;
  if (typeof decimals !== 'number' && d === 0) {
    const rounded = Math.round(pct);
    if ((rounded === 100 && r < 1) || (rounded === 0 && r > 0)) d = 1;
  }
  return `${pct.toFixed(d)}%`;
}

/** Share of a whole, or null when the whole is not a positive number. */
export function ratio(part, whole) {
  const p = num(part);
  const w = num(whole);
  if (p === null || w === null || w <= 0) return null;
  return p / w;
}

/** Elapsed milliseconds as a short age: "12 s", "4 min", "3 h", "5 days". */
export function fmtAge(ms) {
  const m = num(ms);
  if (m === null) return NOT_AVAILABLE;
  const s = Math.max(0, Math.floor(m / 1000));
  if (s < 60) return `${s}${NBSP}s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}${NBSP}min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}${NBSP}h`;
  return `${Math.floor(h / 24)}${NBSP}days`;
}

/** Bytes as MB with no decimals, or GB with one decimal from 1024 MB. */
export function fmtBytes(bytes) {
  const b = num(bytes);
  if (b === null) return NOT_AVAILABLE;
  const mb = b / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${INT.format(Math.round(mb))} MB`;
}

/**
 * Money in the given ISO currency (USD when missing or unknown). `short` drops
 * the cents from 1,000 up and compacts from a million, for stat tiles.
 */
export function fmtMoney(value, currency, { short = false } = {}) {
  const n = num(value);
  if (n === null) return NOT_AVAILABLE;
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  const opts = { style: 'currency', currency: code };
  if (short && Math.abs(n) >= 1e6) Object.assign(opts, { notation: 'compact', maximumFractionDigits: 1 });
  else if (short && Math.abs(n) >= 1000) Object.assign(opts, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  try {
    return new Intl.NumberFormat('en-US', opts).format(n);
  } catch {
    return new Intl.NumberFormat('en-US', { ...opts, currency: 'USD' }).format(n);
  }
}

/** Milliseconds since the epoch for a server timestamp, or null. */
export function parseIso(iso) {
  if (typeof iso !== 'string' || !ISO_RE.test(iso)) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function safeZone(tz) {
  if (typeof tz !== 'string' || !tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function zonedParts(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeZone(tz), hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(new Date(ms));
  const out = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

/** "HH:MM", 24 hour, in the given IANA zone (UTC when the zone is unknown). */
export function fmtTime(iso, tz) {
  const t = parseIso(iso);
  if (t === null) return NOT_AVAILABLE;
  const p = zonedParts(t, tz);
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${hour}:${p.minute}`;
}

/** A real calendar day "YYYY-MM-DD" as a UTC midnight Date, or null. */
function parseDay(day) {
  const m = typeof day === 'string' ? DAY_RE.exec(day) : null;
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === day ? d : null;
}

/** "Sat 26 Sep" from a calendar day "YYYY-MM-DD" (no time zone shift). */
export function fmtDay(day) {
  const d = parseDay(day);
  if (!d) return NOT_AVAILABLE;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "26 Sep", the short form for chart axes and narrow tables. */
export function fmtShortDay(day) {
  const d = parseDay(day);
  if (!d) return NOT_AVAILABLE;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sat 26 Sep, 09:00" for a timestamp, in the given zone. */
export function fmtDayTime(iso, tz) {
  const t = parseIso(iso);
  if (t === null) return NOT_AVAILABLE;
  const p = zonedParts(t, tz);
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${p.weekday} ${p.day} ${MONTHS[Number(p.month) - 1]}, ${hour}:${p.minute}`;
}

/** Calendar day "YYYY-MM-DD" plus n days (UTC arithmetic, no zone). */
export function addDays(day, n) {
  const d = parseDay(day);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Under 30 is too small a sample to judge a rate on. */
export function isSmall(n) {
  const v = num(n);
  return v === null || v < 30;
}

/** A plural noun: plural(1, 'device') -> "1 device", plural(3, 'device') -> "3 devices". */
export function plural(n, one, many) {
  const v = num(n);
  const word = v === 1 ? one : (many || `${one}s`);
  return `${fmtInt(v)} ${word}`;
}

/** Round a maximum up to a clean axis value, close enough not to waste the plot. */
export function niceCeil(value) {
  const v = num(value);
  if (v === null || v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (v <= step * base + 1e-9) return Math.round(step * base * 1e6) / 1e6;
  }
  return 10 * base;
}
