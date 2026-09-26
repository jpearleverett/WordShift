// JSON-line logger for Cloud Logging, which reads `severity` and `message`.
// Two layers keep secrets out of the logs: any field whose NAME looks secret is
// replaced, and every registered secret VALUE is scrubbed from every string.

const SECRET_KEY_RE = /pass(word)?|secret|token|cookie|authorization|api_?key|ca_?cert|database_?url|connection_?string|verifier|body|payload/i;
const REDACTED = '[redacted]';

export function createLogger({ write = (line) => process.stdout.write(`${line}\n`), secrets = [] } = {}) {
  const values = new Set();
  const addSecret = (value) => {
    if (typeof value === 'string' && value.length >= 4) values.add(value);
  };
  secrets.forEach(addSecret);

  const scrubString = (text) => {
    let out = text;
    for (const v of values) if (out.includes(v)) out = out.split(v).join(REDACTED);
    return out;
  };
  const scrub = (value, key = '', depth = 0) => {
    if (key && SECRET_KEY_RE.test(key)) return REDACTED;
    if (typeof value === 'string') return scrubString(value);
    if (value === null || typeof value !== 'object') return value;
    if (depth > 4) return '[deep]';
    if (value instanceof Error) {
      return scrub({ name: value.name, code: value.code, message: value.message, stack: value.stack }, '', depth + 1);
    }
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, '', depth + 1));
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrub(v, k, depth + 1);
    return out;
  };
  const emit = (severity, message, fields = {}) => {
    const entry = { severity, message: scrubString(String(message)), ...scrub(fields) };
    let line;
    try {
      line = JSON.stringify(entry);
    } catch {
      line = JSON.stringify({ severity, message: scrubString(String(message)) });
    }
    write(line);
  };
  return {
    addSecret,
    info: (message, fields) => emit('INFO', message, fields),
    warn: (message, fields) => emit('WARNING', message, fields),
    error: (message, fields) => emit('ERROR', message, fields),
  };
}
