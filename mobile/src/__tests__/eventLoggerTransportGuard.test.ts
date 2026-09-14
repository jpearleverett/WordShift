import { logEvent, getEvents } from '../services/eventLogger';

// The upload transport is deferred-required at flush time. A telemetry module
// with no uploader (a partial jest.mock like supabaseCloud.test.ts's, or the
// empty placeholder Jest hands back for a require after teardown) must never
// make a flush reject: the debounce timer calls flushEvents with no handler,
// so a rejection there is unhandled and kills an in-band run, and the awaited
// getEvents path would swallow it into an empty result, losing the events.
jest.mock('../services/telemetry', () => ({ getInstallId: jest.fn(async () => 'install') }));

test('a flush survives a telemetry module without syncTelemetry and still stores the events', async () => {
  logEvent({ type: 'puzzle_completed' });
  const events = await getEvents();
  expect(events.map(event => event.type)).toEqual(['puzzle_completed']);
});
