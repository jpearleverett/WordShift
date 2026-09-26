// Local preview with no database and no external APIs:
//   npm run demo                         spec fixtures from test/fixtures/
//   npm run dev:fixtures -- <scenario>   whole envelopes from fixtures/<scenario>/
//                                        (for example launch-day, degraded, no-data, week-two)
// Then open http://localhost:8080 and sign in with demo-password-1234.
// Refused when NODE_ENV is production.
import { randomBytes } from 'node:crypto';

if (process.env.NODE_ENV === 'production') {
  console.error('Demo mode never runs with NODE_ENV=production.');
  process.exit(1);
}
const scenario = process.argv[2];
if (scenario) process.env.DASHBOARD_FIXTURES = scenario;
process.env.NODE_ENV = 'development';
process.env.DASHBOARD_DEMO = '1';
process.env.DASHBOARD_PASSWORD ??= 'demo-password-1234';
process.env.SESSION_SECRET = randomBytes(32).toString('base64');
process.env.PORT ??= '8080';
process.env.DASHBOARD_TZ ??= 'America/New_York';
const password = process.env.DASHBOARD_PASSWORD === 'demo-password-1234' ? 'demo-password-1234' : 'from DASHBOARD_PASSWORD';
console.error(`Demo dashboard on http://localhost:${process.env.PORT} (password ${password}${scenario ? `, scenario ${scenario}` : ''})`);
await import('../src/server.js');
