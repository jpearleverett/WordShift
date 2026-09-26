// WordShift live dashboard. Wires polling to rendering and keeps ages ticking.

import { startPolling } from './js/api.js';
import { initTooltip } from './js/charts.js';
import { createRenderer } from './js/render.js';

const SCHEMA_SECTIONS = new Set(['live', 'cohorts', 'progress']);

const state = {
  env: {},            // latest envelope per section: live, cohorts, progress, external
  offline: false,     // the last live request failed
  offlineKind: null,  // 'offline' or 'server'
  schemaMismatch: false,
};
let skewMs = 0;
const nowMs = () => Date.now() + skewMs;

const renderer = createRenderer(document);
initTooltip(document.getElementById('tooltip'));

let frame = 0;
function scheduleRender() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderer.update(state, nowMs());
  });
}

startPolling({
  onEnvelope(key, envelope) {
    const serverNow = Date.parse(envelope.serverNow);
    if (Number.isFinite(serverNow)) skewMs = serverNow - Date.now();
    if (SCHEMA_SECTIONS.has(key) && envelope.data && envelope.data.schemaVersion !== 1) {
      console.warn(`${key}: schemaVersion ${envelope.data.schemaVersion}, this page expects 1`);
      state.schemaMismatch = true;
    }
    state.env[key] = envelope;
    if (key === 'live') {
      state.offline = false;
      state.offlineKind = null;
    }
    scheduleRender();
  },
  onFailure(key, kind) {
    if (key === 'live') {
      state.offline = true;
      state.offlineKind = kind;
      scheduleRender();
    }
  },
  onUnauthorized() {
    location.assign('/login');
  },
});

// One ticker, only while the page is visible, for every "N s ago".
let ticker = 0;
function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => renderer.tick(nowMs(), state), 1000);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInterval(ticker);
  else startTicker();
});
if (!document.hidden) startTicker();
