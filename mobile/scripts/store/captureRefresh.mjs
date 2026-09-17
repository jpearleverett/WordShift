/**
 * Capture the approved v2 campaign through the actual application UI.
 *
 * DELIVERY STATUS: automation prepared, NOT browser-executed in the authoring
 * session. That session's browser security policy rejected local-file/export
 * access. This script is for an independently authorized local/CI environment;
 * it is not a workaround to run in that restricted session.
 *
 * No DOM, visible copy, game art, or production application code is replaced.
 * Cohort save data is seeded before the unchanged exported Expo bundle loads.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { buildCaptureFixtures, buildBootstrapScript, captureHeaders } from './captureFixtures.mjs';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const campaign = path.join(mobile, 'assets/Play_store/launch-2026-09-v2');
const raw = path.join(campaign, 'raw');
const viewport = { width: 390, height: 700 };
const requestedPixels = { width: 1170, height: 2100 };
const help = `WordShift v2 store capture (prepared; authoring-session browser run blocked)

Usage:
  node scripts/store/captureRefresh.mjs --export-dir /absolute/path/to/expo-export
  node scripts/store/captureRefresh.mjs --export-dir /absolute/path --preflight

Options:
  --export-dir PATH  Required existing Expo web export containing index.html.
  --preflight        Check inputs and source fixtures only; never launch a browser.
  --screens-only     Capture eight phone sources and the genuine first-move result.
  --video-only       Record seven continuous clips plus raw/video.json edit timings.
  --headed           Display Chromium in an authorized desktop environment.
  --help             Print this text; never create a server or launch a browser.

WORDSHIFT_CHROMIUM may select an installed Chromium executable.
Install dependencies and Playwright Chromium before an authorized capture run.
Video capture requires ffprobe (part of FFmpeg). Timing offsets remain estimates
until reviewed; the trailer compositor must use --draft until timingReviewed=true.
The script serves the original export from an ephemeral loopback HTTP origin,
injects only the offline save bootstrap, and blocks every external request.
Completed output replaces matching files only after the whole requested run passes.
No tablet captures or Android-device claims are made. No assets are published.
`;

function parseArgs(args) {
  const options = { screenshots: true, video: true, preflight: false, headed: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--export-dir') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('--export-dir requires a directory.');
      options.exportDir = path.resolve(value);
    } else if (arg === '--screens-only') options.video = false;
    else if (arg === '--video-only') options.screenshots = false;
    else if (arg === '--preflight') options.preflight = true;
    else if (arg === '--headed') options.headed = true;
    else throw new Error(`Unknown option ${arg}. Use --help.`);
  }
  if (!options.exportDir) throw new Error('An explicit --export-dir is required. Use --help.');
  if (!options.screenshots && !options.video) throw new Error('Choose either --screens-only or --video-only, not both.');
  return options;
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const round = seconds => Math.round(seconds * 1000) / 1000;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function preflight(options) {
  const exportRoot = await fs.realpath(options.exportDir);
  const indexPath = path.join(exportRoot, 'index.html');
  const index = await fs.readFile(indexPath, 'utf8');
  if (!/<head(?:\s[^>]*)?>/i.test(index)) throw new Error('Expected an Expo index.html with a head element.');
  if (index.includes('store-capture-bootstrap')) throw new Error('Use a pristine Expo export; index.html already contains a capture bootstrap.');
  const scriptPaths = [...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
  if (!scriptPaths.length) throw new Error('No external application scripts found in the export.');
  const scripts = [];
  for (const src of scriptPaths) {
    if (/^(?:https?:)?\/\//.test(src)) throw new Error(`External bundle URL cannot be used in an offline capture: ${src}`);
    const relative = decodeURIComponent(src.split(/[?#]/)[0]).replace(/^\//, '');
    const file = await fs.realpath(path.resolve(exportRoot, relative));
    if (!file.startsWith(exportRoot + path.sep)) throw new Error('Application script leaves the export directory.');
    const bytes = await fs.readFile(file);
    scripts.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const listing = JSON.parse(await fs.readFile(path.join(campaign, 'copy/listing-en-US.json'), 'utf8'));
  const expectedSlugs = ['01-one-letter', '02-build-a-home', '03-unlikely-friends', '04-after-dark', '05-next-challenge', '06-daily-puzzle', '07-your-kind-of-cozy', '08-choices'];
  if (JSON.stringify(listing.screenshots.map(item => item.slug)) !== JSON.stringify(expectedSlugs)) throw new Error('Approved screenshot slugs changed; review this capture recipe.');
  const timeline = JSON.parse(await fs.readFile(path.join(campaign, 'source/trailer-timeline.json'), 'utf8'));
  const fixtures = buildCaptureFixtures();
  return { exportRoot, index, scripts, fixtures, timeline, listing, exportIndexSha256: sha256(index) };
}

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.wasm': 'application/wasm' };

async function startServer(input) {
  const bootstrap = buildBootstrapScript({ fixtures: input.fixtures });
  const html = input.index.replace(/<head(?:\s[^>]*)?>/i, match => `${match}<script id="store-capture-bootstrap">${bootstrap}</script>`);
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, captureHeaders()); response.end(); return; }
      const url = new URL(request.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || pathname === '/index.html') {
        response.writeHead(200, { ...captureHeaders(), 'Content-Type': mimeTypes['.html'] });
        response.end(request.method === 'HEAD' ? undefined : html);
        return;
      }
      const candidate = path.resolve(input.exportRoot, '.' + pathname);
      const file = await fs.realpath(candidate);
      if (!file.startsWith(input.exportRoot + path.sep)) { response.writeHead(403, captureHeaders()); response.end(); return; }
      const data = await fs.readFile(file);
      response.writeHead(200, { ...captureHeaders(), 'Content-Type': mimeTypes[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(404, captureHeaders()); response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

function probeVideo(file) {
  const result = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,avg_frame_rate', '-of', 'json', file], { encoding: 'utf8' }));
  const stream = result.streams.find(item => item.codec_type === 'video');
  const durationSeconds = Number(result.format.duration);
  if (!stream || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(`Invalid recorded video ${file}`);
  return { durationSeconds, width: stream.width, height: stream.height, avgFrameRate: stream.avg_frame_rate };
}

async function runCapture(options, input) {
  // Deliberately below --help/--preflight: neither mode imports or starts Playwright.
  if (options.video) execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
  const { chromium, expect } = await import('@playwright/test');
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'wordshift-store-capture-'));
  await fs.mkdir(path.join(stage, 'video'), { recursive: true });
  const { server, origin } = await startServer(input);
  let browser;
  const captures = [], clips = {}, warnings = [], networkBlocks = [];
  const shotPath = name => path.join(stage, `${name}.png`);
  const button = (page, name) => page.getByRole('button', { name, exact: typeof name === 'string' });
  const row = (page, index) => page.getByTestId(`puzzle-row-${index}`);
  const letter = (page, index, char) => row(page, index).getByRole('button', { name: `Letter ${char}`, exact: true }).first();
  const slot = (page, index, word) => row(page, index).getByRole('button', { name: new RegExp(`(?:forms |would form )${word}(?:, valid word)?$`) }).first();

  async function openScene(scene, video = false) {
    const recordDir = path.join(stage, 'recordings');
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, colorScheme: 'light', serviceWorkers: 'block', ...(video ? { recordVideo: { dir: recordDir, size: requestedPixels } } : {}) });
    context.setDefaultTimeout(30_000);
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
      networkBlocks.push({ scene, origin: url.origin, type: route.request().resourceType() });
      return route.abort('blockedbyclient');
    });
    const startedEpoch = Date.now(); const beforePage = performance.now();
    const page = await context.newPage();
    const pageReady = performance.now();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Runtime.enable'); await cdp.send('Debugger.enable');
    const offset = () => round((performance.now() - beforePage) / 1000);
    const events = {}, eventList = [];
    const mark = (name, type) => {
      const at = offset(); events[name] = at;
      if (type) eventList.push({ type, atSeconds: at, verified: false });
      return at;
    };
    await page.goto(`${origin}/?storeScene=${scene}&storeMotion=${video ? '1' : '0'}&storeTake=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await expect(button(page, 'Play puzzle')).toBeVisible({ timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready);
    await delay(900);
    const proof = await page.evaluate(() => ({ metadata: window.__WORDSHIFT_CAPTURE_PROVENANCE__, progress: JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}'), settings: JSON.parse(localStorage.getItem('wordshift_settings') || '{}'), date: new Date().toLocaleDateString('en-CA') }));
    if (proof.metadata?.scene !== scene || proof.progress.currentPhase >= 4 || proof.progress.postRevelation) throw new Error(`Unsafe or missing scene fixture ${scene}`);
    if (proof.date !== input.fixtures.capturedLocalDate) throw new Error('Capture crossed a local calendar date or browser/runner time zones differ. Regenerate and restart.');
    const finish = async name => {
      const videoObject = page.video();
      const interactionEnd = offset();
      await context.close();
      if (!video) return;
      const file = path.join(stage, 'video', `${name}.webm`);
      await videoObject.saveAs(file);
      const probed = probeVideo(file);
      const bytes = await fs.readFile(file);
      clips[name] = { file: `video/${name}.webm`, ...probed, requestedWidth: requestedPixels.width, requestedHeight: requestedPixels.height, cssViewport: viewport, deviceScaleFactor: 3, recordingStartEpochMs: startedEpoch, recordingStartUncertaintyMs: Math.ceil(pageReady - beforePage), offsetBasis: 'Wall clock from page creation; align to recorded frames during visual review.', interactionEndSeconds: interactionEnd, events, eventList, audio: false, sha256: sha256(bytes), bytes: bytes.length };
    };
    return { page, context, proof, mark, offset, finish };
  }

  async function settle(page, milliseconds = 900) { await page.evaluate(() => document.fonts.ready); await delay(milliseconds); }
  async function dismissIntroductions(page) {
    for (let index = 0; index < 4; index++) {
      const gotIt = button(page, 'Got it');
      if (!await gotIt.isVisible()) return;
      await gotIt.click(); await delay(250);
    }
    if (await button(page, 'Got it').isVisible()) throw new Error('Unexpected stacked introductions remain.');
  }
  async function openPuzzle(page) {
    await button(page, 'Play puzzle').click();
    const later = button(page, 'Come back to this');
    if (await later.isVisible()) await later.click();
    await dismissIntroductions(page);
    await expect(button(page, 'How to play')).toBeVisible();
    await settle(page);
  }
  async function capture(session, name, description) {
    await settle(session.page);
    await session.page.screenshot({ path: shotPath(name) });
    const bytes = await fs.readFile(shotPath(name));
    // PNG IHDR is authoritative; no renderer resizing or content rewriting.
    if (bytes.readUInt32BE(16) !== requestedPixels.width || bytes.readUInt32BE(20) !== requestedPixels.height) throw new Error(`Unexpected PNG dimensions for ${name}`);
    const saved = await session.page.evaluate(() => ({ home: JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}'), board: JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}'), daily: JSON.parse(localStorage.getItem('wordshift_in_progress_daily') || '{}'), cosmetics: JSON.parse(localStorage.getItem('wordshift_cosmetics') || '{}') }));
    captures.push({ file: `${name}.png`, description, scene: session.proof.metadata.scene, renderer: 'Expo React Native web', width: requestedPixels.width, height: requestedPixels.height, sha256: sha256(bytes), bytes: bytes.length, capturedAt: new Date().toISOString(), fixturePhase: session.proof.progress.currentPhase, actualPhase: saved.home.currentPhase, boardWords: saved.board.rows?.map(item => item.words.map(tile => tile.char).join('')), dailyDate: saved.daily.dailyDate ?? null, dailyBoardVersion: saved.daily.dailyBoardVersion ?? null, dailyEased: saved.daily.dailyEased ?? null, equippedTileTheme: saved.cosmetics.equipped?.tile_theme ?? null, reviewStatus: 'needs_visual_and_android_comparison' });
    console.log(`Captured ${name}.png`);
  }
  async function selectAndDrop(page, sourceRow, char, targetRow, word, hooks = {}) {
    hooks.beforeSelect?.(); await letter(page, sourceRow, char).click();
    await expect(slot(page, targetRow, word)).toBeVisible();
    if (hooks.hold) await delay(hooks.hold);
    hooks.beforeDrop?.(); await slot(page, targetRow, word).click();
  }
  async function frameHome(page) {
    const ember = button(page, 'Ember the fox');
    await ember.scrollIntoViewIfNeeded();
    await settle(page);
  }
  async function panHome(page) {
    // Real drag in the house surface. Never write a CSS transform or pan state.
    await page.mouse.move(310, 330); await page.mouse.down();
    await page.mouse.move(310, 440, { steps: 24 }); await page.mouse.up();
  }
  async function openWarmDialogue(page) {
    await frameHome(page); await button(page, 'Ember the fox').click();
    await expect(button(page, 'Continue dialogue')).toBeVisible();
    await settle(page, 3400);
  }
  async function applyWarmStyle(page) {
    await button(page, 'Open utility menu').click(); await button(page, 'Open Tile Shop').click();
    const buy = button(page, 'Buy Ember-warm for 300 amber');
    await buy.scrollIntoViewIfNeeded(); await expect(buy).toBeEnabled(); await buy.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_cosmetics') || '{}').equipped?.tile_theme)).toBe('theme_ember');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}').amber)).toBe(400);
    await settle(page, 2100); await button(page, 'Go back').click(); await openPuzzle(page);
  }
  async function openDaily(page) {
    await button(page, /^Start daily challenge/).click();
    await dismissIntroductions(page);
    await expect(button(page, 'How to play')).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_daily') || '{}').isPlayingDaily)).toBe(true);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_daily')));
    if (saved.dailyEased !== false || saved.dailyDate !== input.fixtures.capturedLocalDate) throw new Error('Expected the regular current-date daily board, without first-daily easing.');
    await settle(page);
  }

  try {
    browser = await chromium.launch({ ...(process.env.WORDSHIFT_CHROMIUM ? { executablePath: process.env.WORDSHIFT_CHROMIUM } : {}), headless: !options.headed, args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=1024'] });
    if (options.screenshots) {
      let scene = await openScene('opener'); await openPuzzle(scene.page);
      await selectAndDrop(scene.page, 0, 'L', 1, 'PLANT');
      await capture(scene, '01-one-letter-result', 'Genuine PAY / PLANT result after the legal L move; no reconstructed tiles.');
      await button(scene.page, 'UNDO').click(); await letter(scene.page, 0, 'L').click();
      await expect(slot(scene.page, 1, 'PLANT')).toBeVisible();
      await capture(scene, '01-one-letter', 'L selected in PLAY after an actual undo; legal PLANT insertion and real undo message visible.');
      await scene.finish();
      scene = await openScene('home'); await frameHome(scene.page); await capture(scene, '02-build-a-home', 'Current bright phase-1 house with five sequential unlocked rooms and normal residents.'); await scene.finish();
      scene = await openScene('friends'); await openWarmDialogue(scene.page); await capture(scene, '03-unlikely-friends', 'Actual early warm Ember dialogue in the current house layout.'); await scene.finish();
      scene = await openScene('mystery'); await frameHome(scene.page); await capture(scene, '04-after-dark', 'Actual phase-3 pre-storm night house with normal residents; no late reveal or artificial shadow.'); await scene.finish();
      scene = await openScene('double'); await openPuzzle(scene.page);
      await selectAndDrop(scene.page, 0, 'F', 1, 'FLOWER'); await selectAndDrop(scene.page, 0, 'S', 1, 'FLOWERS');
      await capture(scene, '05-next-challenge', 'Shipping Double Shift board after the real two-letter F/S pair: LIP / FLOWERS / WAVES.'); await scene.finish();
      scene = await openScene('daily'); await openDaily(scene.page); await capture(scene, '06-daily-puzzle', 'Actual regular current-date daily challenge, no first-daily bonus, invented rank, or substituted date.'); await scene.finish();
      scene = await openScene('style'); await applyWarmStyle(scene.page); await capture(scene, '07-your-kind-of-cozy', 'Ember-warm purchased for 300 earned amber through the actual shop and visibly equipped on the puzzle board.'); await scene.finish();
      scene = await openScene('choice'); await button(scene.page, 'Play puzzle').click();
      await expect(scene.page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
      await button(scene.page, 'Continue').click(); await button(scene.page, 'Continue').click();
      await expect(button(scene.page, 'The flower cup. Cocoa, please.')).toBeVisible();
      await capture(scene, '08-choices', 'Genuine early cup-choice scene, before an answer is selected.'); await scene.finish();
    }
    if (options.video) {
      let scene = await openScene('opener', true); await openPuzzle(scene.page);
      scene.mark('letterStart'); await delay(350);
      await selectAndDrop(scene.page, 0, 'L', 1, 'PLANT', { hold: 650, beforeSelect: () => scene.mark('letterSelect', 'letter_select'), beforeDrop: () => scene.mark('validMove', 'valid_move') });
      scene.mark('letterResult'); await delay(3100);
      scene.mark('rewardStart'); await delay(250);
      await selectAndDrop(scene.page, 1, 'T', 2, 'HEART', { hold: 450, beforeSelect: () => scene.mark('secondLetterSelect', 'letter_select'), beforeDrop: () => scene.mark('secondValidMove', 'valid_move') });
      await expect(button(scene.page, 'Next level')).toBeVisible(); scene.mark('rewardReady', 'victory');
      await delay(4100); await scene.finish('opener');
      scene = await openScene('home', true); await frameHome(scene.page); scene.mark('homeStart');
      await delay(1800); await panHome(scene.page); await delay(4800); await scene.finish('home');
      scene = await openScene('friends', true); await openWarmDialogue(scene.page); scene.mark('dialogueStart'); await delay(3700); await scene.finish('friends');
      scene = await openScene('style', true); await applyWarmStyle(scene.page); scene.mark('styleStart'); await delay(3700); await scene.finish('style');
      scene = await openScene('daily', true); await openDaily(scene.page); scene.mark('dailyStart');
      const daily = await scene.page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_daily')));
      const initial = daily.solution?.[0];
      if (!initial || initial.lettersToMove) throw new Error('Daily capture requires inspection of this unexpected solution shape.');
      await letter(scene.page, 0, initial.letterToMove).click(); scene.mark('dailyLetterSelect', 'letter_select');
      await delay(3500); await scene.finish('daily');
      scene = await openScene('double', true); await openPuzzle(scene.page); scene.mark('doubleStart');
      await selectAndDrop(scene.page, 0, 'F', 1, 'FLOWER', { hold: 300, beforeSelect: () => scene.mark('doubleFirstSelect', 'letter_select'), beforeDrop: () => scene.mark('doubleFirstDrop', 'valid_move') });
      await selectAndDrop(scene.page, 0, 'S', 1, 'FLOWERS', { hold: 300, beforeSelect: () => scene.mark('doubleSecondSelect', 'letter_select'), beforeDrop: () => scene.mark('doubleSecondDrop', 'valid_move') });
      await delay(3000); await scene.finish('double');
      scene = await openScene('mystery', true); await frameHome(scene.page); scene.mark('nightStart');
      await delay(8500); await scene.finish('mystery');
    }
    await browser.close(); browser = null;
    if (options.video) {
      const cut = (clip, event, durationSeconds, extra = 0) => ({ clip, sourceIn: round(clips[clip].events[event] + extra), durationSeconds });
      const segments = [
        { id: '01-letter-move', cuts: [cut('opener', 'letterStart', 4)] },
        { id: '02-puzzle-reward', cuts: [cut('opener', 'rewardStart', 4)] },
        { id: '03-house-friends', cuts: [cut('home', 'homeStart', 5)] },
        { id: '04-conversation-cozy', cuts: [cut('friends', 'dialogueStart', 2.5), cut('style', 'styleStart', 2.5)] },
        { id: '05-daily', cuts: [cut('daily', 'dailyStart', 2.5)] },
        { id: '06-double', cuts: [cut('double', 'doubleStart', 2.5)] },
        { id: '07-night-introduction', cuts: [cut('mystery', 'nightStart', 2)] },
        { id: '08-night-question', cuts: [cut('mystery', 'nightStart', 2, 2)] },
        { id: '09-end', cuts: [cut('mystery', 'nightStart', 3, 4)] },
      ];
      for (const segment of segments) {
        const approved = input.timeline.segments.find(item => item.id === segment.id);
        if (!approved || Math.abs(segment.cuts.reduce((sum, item) => sum + item.durationSeconds, 0) - (approved.end - approved.start)) > 0.001) throw new Error(`Timeline mismatch ${segment.id}`);
        for (const item of segment.cuts) if (item.sourceIn + item.durationSeconds > clips[item.clip].durationSeconds) throw new Error(`Recorded clip is too short for ${segment.id}; review capture timing before retry.`);
      }
      await fs.writeFile(path.join(stage, 'video.json'), JSON.stringify({ version: 1, status: 'captured_needs_visual_review', timingReviewed: false, sourceCommit: input.fixtures.sourceCommit, renderer: 'Expo React Native web', nativeAndroidVerified: false, capturedAt: new Date().toISOString(), clips, segments, notes: ['No audio was recorded. Sound-effect events are unverified wall-clock observations; do not synchronize audio until reviewed against actual frames.', 'Offsets approximate page-creation recording start. Inspect and adjust every cut, verify walk animation and text readability, then explicitly set timingReviewed=true.', '1170x2100 recording requested with 390x700 CSS viewport and DPR3; each clip records actual ffprobe dimensions.', 'The last seven seconds use continuous genuine phase-3 night footage. No robes or post-revelation state.'] }, null, 2) + '\n');
    }
    const existing = JSON.parse(await fs.readFile(path.join(raw, 'provenance.json'), 'utf8').catch(() => '{}'));
    const provenance = { ...existing, version: 2, status: 'captured_needs_visual_review', sourceCommit: input.fixtures.sourceCommit, renderer: 'Expo React Native web', nativeAndroidVerified: false, capturedAt: new Date().toISOString(), fixtureLocalDate: input.fixtures.capturedLocalDate, viewport, deviceScaleFactor: 3, pixelDimensions: requestedPixels, sourceFiles: input.fixtures.sourceFiles, export: { indexSha256: input.exportIndexSha256, scripts: input.scripts }, captures: options.screenshots ? captures : (existing.captures ?? []), videoManifest: options.video ? 'video.json' : existing.videoManifest ?? null, networkIsolation: { loopbackServer: true, serviceWorkersBlocked: true, sameOriginCsp: true, routeBlocks: networkBlocks }, warnings, note: 'Current real app UI from attainable local fixtures; not Android device screenshots. All visible actions used actual controls. No replacement UI, fictional gameplay, entitlements, leaderboard ranks, altered dates, or ending scenes. Visual and signed-Android comparison remain required before store use.' };
    await fs.writeFile(path.join(stage, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
    await fs.mkdir(raw, { recursive: true });
    for (const entry of await fs.readdir(stage, { withFileTypes: true })) {
      if (entry.name === 'recordings') continue;
      if (entry.isDirectory() && entry.name === 'video' && !options.video) continue;
      await fs.cp(path.join(stage, entry.name), path.join(raw, entry.name), { recursive: true, force: true });
    }
    console.log(`Saved ${captures.length} screenshots and ${Object.keys(clips).length} real footage clips. Visual review remains required.`);
    await fs.rm(stage, { recursive: true, force: true });
  } catch (error) {
    console.error(`Capture did not finish. Completed prior campaign files were preserved. Diagnostic staging: ${stage}`);
    if (browser) {
      const pages = browser.contexts().flatMap(context => context.pages());
      for (let index = 0; index < pages.length; index++) await pages[index].screenshot({ path: path.join(stage, `failure-${index}.png`) }).catch(() => {});
    }
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
}

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(help);
} else {
  const options = parseArgs(argv);
  const input = await preflight(options);
  if (options.preflight) console.log(JSON.stringify({ status: 'preflight_only_no_browser_launched', sourceCommit: input.fixtures.sourceCommit, exportIndexSha256: input.exportIndexSha256, applicationScripts: input.scripts, scenes: Object.keys(input.fixtures.scenes), screenshotCount: input.listing.screenshots.length, trailerSeconds: input.timeline.duration_seconds }, null, 2));
  else await runCapture(options, input);
}
