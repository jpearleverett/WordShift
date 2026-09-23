/**
 * Shared capture harness for the refresh-2026-09 Play listing campaign.
 *
 * Port of the concept-stage harness (see assets/Play_store/refresh-2026-09/brief.md,
 * section 2 "Capture harness"). Every helper drives the REAL Expo web build at
 * http://localhost:8081 through Playwright:
 *   - progression is seeded through localStorage only (what a real save holds);
 *   - everything the player sees is reached through real UI input;
 *   - the DOM is never edited, hidden, restyled or re-layered;
 *   - every request that is not to localhost / 127.0.0.1 is aborted, so seeded
 *     saves, analytics and leaderboard calls never reach live services.
 *
 * Nothing here starts or stops the dev server.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved from this file, so the scripts run from any checkout location.
const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { chromium, expect } = require('@playwright/test');
export { expect };

export const APP_URL = process.env.WORDSHIFT_URL || 'http://localhost:8081';
export const CHROMIUM = process.env.WORDSHIFT_CHROMIUM || '/opt/pw-browsers/chromium';

export const ALL_RES = ['fox','pangolin','owl','axolotl','sloth','fennec_fox','capybara','wombat','rabbit','red_panda','tarsier','aye_aye','kakapo'];
export const ALL_ROOMS = ['cozy_den','kitchen','study','aquarium','jungle_room','desert_room','office','burrow','garden','bamboo_attic','star_loft','belfry','sky_garden'];
export const SEEN_KEYS = ['journal_intro','starter_intro','setup_selector_intro','challenge_intro','pit_nudge','gated_unlock_intro','daily_challenge_intro','offering_intro','harvest_home_intro','mandatory_harvest','modifier_stacking_intro','keeper_record','unbroken_weave_intro','expert_intro','lexicon_intro','preview_graduation','full_house_intro','harvest_home_intro','reveal_skip_hint'];
/** Dialogue id prefixes (animalDialogueBase.ts). */
export const PREFIX = { fox: 'fx', pangolin: 'pg', owl: 'ow', axolotl: 'ax', sloth: 'sl', fennec_fox: 'ff', capybara: 'cp', wombat: 'wb' };
/** Accessible names of the resident buttons on the home screen. */
export const RESIDENT_BUTTON = { fox: 'Ember the fox', pangolin: 'Panko the pangolin', owl: 'Archimedes the owl', axolotl: 'Axel the axolotl', sloth: 'Sloane the sloth', fennec_fox: 'Fennick the fennec fox', capybara: 'Chill the capybara', wombat: 'Warren the wombat' };
/** The game's own victory glitch strings (phaseNarrative.ts VICTORY_GLITCH_TEXTS). */
export const VICTORY_GLITCH_TEXTS = ['A LITTLE WARMER', 'THANK YOU', 'STILL WARM', 'ONE MORE CUP', 'THERE YOU ARE', 'SAVED FOR LATER'];

export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function launch({ width = 390, height = 700, dsf = 3, reducedMotion = true, clock = false } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf });
  context.setDefaultTimeout(30_000);
  const blocked = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    blocked.push(url.hostname);
    return route.abort();
  });
  const page = await context.newPage();
  const dbg = await context.newCDPSession(page);
  await dbg.send('Runtime.enable'); await dbg.send('Debugger.enable');
  await page.addInitScript(motion => {
    if (!localStorage.getItem('wordshift_settings')) localStorage.setItem('wordshift_settings', JSON.stringify({
      reducedMotion: motion, soundEnabled: false, musicEnabled: false, hapticsEnabled: false }));
  }, reducedMotion);
  if (clock) { await page.clock.install(); await page.clock.resume(); }
  return { browser, context, page, blocked };
}

/** Wait the way every capture must: fonts ready, then at least 1200 ms. */
export async function settle(page, wait = 1200) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(Math.max(1200, wait));
}

// Boot a fresh install, wait for the autosaved cold-open board, then seed a returning cohort.
export async function bootReturning(page, patch = {}, extra = null) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0), { timeout: 30000 }).toBeGreaterThan(0);
  await seed(page, patch, extra);
}
export async function seed(page, patch = {}, extra = null) {
  await page.evaluate(({ patch, keys, extra }) => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}');
    Object.assign(progress, { amber: 120, totalAmberEarned: 120, currentPhase: 0, phaseProgress: 6, puzzlesSolved: 6,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'], pendingPhaseTransition: null,
      pendingVariantTutorials: [], pendingCeremonies: [] }, patch);
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_onboarding_step', 'complete');
    const t = new Date(); const day = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    localStorage.setItem('wordshift_daily_login', JSON.stringify({ lastClaimedDate: day, cycleDay: 1 }));
    for (const k of keys) localStorage.setItem(`wordshift_${k}_seen`, 'true');
    localStorage.setItem('wordshift_preview_graduation_seen_v2', 'true');
    localStorage.setItem('wordshift_first_win_glitch', 'true');
    localStorage.setItem('wordshift_notification_prompted', 'true');
    localStorage.setItem('wordshift_share_prompts', JSON.stringify({ sharePromptShown: true }));
    localStorage.setItem('wordshift_review_prompt', JSON.stringify({ prompted: true }));
    localStorage.setItem('wordshift_monet_prompts', JSON.stringify({ patronNudgeShown: true, removeAdsNudgeShown: true, interstitialsSeen: 0 }));
    localStorage.setItem('wordshift_first_stuck_seen', 'true');
    if (extra) for (const [k, v] of Object.entries(extra)) {
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, { patch, keys: SEEN_KEYS, extra });
}
export async function reloadHome(page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 60_000 });
}
export async function deferStory(page) {
  const later = page.getByRole('button', { name: 'Come back to this', exact: true });
  const ok = await later.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);
  if (ok) { await later.click(); await page.waitForTimeout(500); }
}
export async function dismissIntros(page) {
  for (let i = 0; i < 4; i++) {
    const g = page.getByRole('button', { name: /^(Got it|OK|Continue)$/ });
    if (await g.first().isVisible().catch(() => false)) { await g.first().click(); await page.waitForTimeout(300); } else break;
  }
}

// Port of e2e solveSavedStandardBoard: play the saved board's own stored solution through the real UI.
// stopAfter: number of moves to play (default all). selectOnlyAt: step index at which to only pick the letter and return.
export async function playSolution(page, { stopAfter = Infinity, selectOnlyAt = -1, key = 'wordshift_in_progress_puzzle' } = {}) {
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').solution?.length ?? 0, key), { timeout: 30000 }).toBeGreaterThan(0);
  const board = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const openingBoard = board.rows.map(r => r.originalWord).join(',') === 'PLAY,PANT,HEAR';
  let n = 0;
  for (const step of board.solution) {
    if (n >= stopAfter) break;
    const sourceLetters = board.rows[step.stepIndex].words;
    const removal = step.removalPosition ?? sourceLetters.findIndex(l => l.char === step.letterToMove && !l.isLocked);
    const dup = sourceLetters.slice(0, removal).filter(l => l.char === step.letterToMove && !l.isLocked).length;
    const letter = page.getByTestId(`puzzle-row-${step.stepIndex}`).getByRole('button', { name: `Letter ${step.letterToMove}`, exact: true }).nth(dup);
    await letter.click();
    if (n === selectOnlyAt) return board;
    const insertion = step.insertionPosition ?? (openingBoard ? [1, 4][step.stepIndex] : undefined);
    const target = board.rows[step.stepIndex + 1].words;
    const [moved] = sourceLetters.splice(removal, 1);
    target.splice(insertion, 0, { ...moved, isLocked: true });
    const formed = target.map(v => v.char).join('');
    const slot = page.getByTestId(`puzzle-row-${step.stepIndex + 1}`).getByRole('button', { name: new RegExp(`^(?:Guided drop zone|Drop zone) ${insertion + 1} of \\d+, (?:forms ${formed}, valid word|would form ${formed})$`) });
    await slot.click();
    n++;
    await page.waitForTimeout(250);
  }
  return board;
}

export function starStats(n, difficulties = ['EASY','MEDIUM','MEDIUM_PLUS','HARD']) {
  const per = Math.floor(n / difficulties.length);
  const byDifficulty = {};
  for (const d of ['EASY','MEDIUM','MEDIUM_PLUS','HARD','EXPERT']) byDifficulty[d] = difficulties.includes(d) ? { completed: per, stars: per * 3 } : { completed: 0, stars: 0 };
  byDifficulty[difficulties[0]].completed += n - per * difficulties.length; byDifficulty[difficulties[0]].stars = byDifficulty[difficulties[0]].completed * 3;
  return { totalPuzzlesCompleted: n, totalStars: n * 3 - 4, threeStarCount: n - 4, twoStarCount: 4, oneStarCount: 0,
    totalInvalidAttempts: 6, totalHintsUsed: 4, noHintPuzzleCount: n - 4, flawlessCount: Math.floor(n * 0.6), lastUpdated: Date.now(), byDifficulty };
}
// Drag the house vertically with the mouse (react-native-gesture-handler pan).
// dy < 0 drags the content up (reveals lower rooms); dy > 0 drags it down (reveals upper rooms).
export async function panHouse(page, dy, x = 8, y = 420) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = 20;
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + (dy * i) / steps); await page.waitForTimeout(16); }
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(1200);
}
export function achievementsFor(n, extra = []) {
  const ids = ['first_puzzle','first_perfect','first_animal','flawless_first','streak_3','daily_first','challenge_first', 'reverse_first','double_first','shared_first', ...extra];
  if (n >= 10) ids.push('puzzle_10','perfect_10','no_hints_10');
  if (n >= 25) ids.push('puzzle_25','perfect_25','animals_5','flawless_25','amber_1000','phase_1','all_difficulties','independent_thinker');
  if (n >= 35) ids.push('puzzle_35','hard_10','streak_7','reverse_15','double_15','challenge_10','daily_7');
  if (n >= 50) ids.push('puzzle_50','phase_2','speed_first','variant_explorer','expert_first','perfect_50');
  const now = Date.now();
  return { unlockedIds: ids, unlockDates: Object.fromEntries(ids.map(i => [i, now - 86400000])), lastChecked: now };
}
// Read any due story scene through to the end, picking the first option (real UI, no skipping).
export async function finishStory(page, wait = 2500) {
  const scroll = page.getByTestId('story-scene-scroll');
  const present = await scroll.waitFor({ state: 'visible', timeout: wait }).then(() => true).catch(() => false);
  if (!present) return false;
  console.log('finishStory: scene present');
  for (let i = 0; i < 30; i++) {
    if (!(await scroll.isVisible().catch(() => false))) {
      await page.waitForTimeout(1200);
      if (!(await scroll.isVisible().catch(() => false))) { console.log('finishStory: done'); return true; }
    }
    const keep = scroll.getByRole('button', { name: 'Keep this memory', exact: true });
    const cont = scroll.getByRole('button', { name: 'Continue', exact: true });
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(700); continue; }
    if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(400); continue; }
    // choice page: first option button inside the scroll that is not a nav button
    const opts = scroll.getByRole('button');
    const n = await opts.count();
    for (let k = 0; k < n; k++) {
      const name = (await opts.nth(k).getAttribute('aria-label')) || (await opts.nth(k).innerText());
      if (!/Previous page|Come back to this|Continue|Keep this memory/.test(name)) { console.log('finishStory: choose', name); await opts.nth(k).click(); break; }
    }
    await page.waitForTimeout(500);
  }
  return true;
}

/**
 * conversationReadIds from { animalType: [prefix, from, to] }, where prefix
 * carries the phase (for example ['fx_0', 1, 18] gives fx_0_1 .. fx_0_18).
 * A value may also be a list of such ranges: [['fx_0', 1, 24], ['fx_1', 1, 15]].
 * A bare two-letter prefix means phase 0.
 */
export function conversationRead(map) {
  const out = {};
  for (const [animal, spec] of Object.entries(map)) {
    const ranges = Array.isArray(spec[0]) ? spec : [spec];
    const ids = [];
    for (const [prefix, from, to] of ranges) {
      const p = /_\d+$/.test(prefix) ? prefix : `${prefix}_0`;
      for (let n = from; n <= to; n++) ids.push(`${p}_${n}`);
    }
    out[animal] = ids;
  }
  return out;
}

/** wordshift_dialogue_sessions from [[animalId, puzzlesAtSessionEnd, sessionsCompleted], ...]. */
export function sessions(list) {
  return list.map(([animalId, puzzlesAtSessionEnd, sessionsCompleted]) =>
    ({ animalId, dialoguesInSession: 0, puzzlesAtSessionEnd, sessionsCompleted }));
}

export function gitHead(cwd = REPO_ROOT) {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd }).toString().trim(); } catch { return 'unknown'; }
}
/** True when nothing under mobile/src differs from HEAD, i.e. the captured build is HEAD's game code. */
export function srcClean(cwd = REPO_ROOT) {
  try { return execFileSync('git', ['status', '--porcelain', '--', 'mobile/src', 'mobile/App.tsx', 'mobile/assets/story', 'mobile/assets/ui'], { cwd }).toString().trim() === ''; } catch { return false; }
}
export async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

/** Visible text on the page, for provenance and screening. */
export async function bodyText(page) {
  return page.locator('body').innerText().catch(() => '');
}
/**
 * Victory glitch strings actually on screen: an element whose own text is
 * exactly one of VICTORY_GLITCH_TEXTS and whose effective opacity (the
 * product up its ancestor chain) is above 1%.
 */
export async function visibleGlitchTexts(page) {
  return page.evaluate(texts => {
    const out = [];
    for (const el of document.querySelectorAll('div, span')) {
      if (el.children.length) continue;
      const t = el.textContent?.trim();
      if (!t || !texts.includes(t)) continue;
      let op = 1, a = el, shown = true;
      while (a && a !== document.body) {
        const cs = getComputedStyle(a);
        if (cs.display === 'none' || cs.visibility === 'hidden') { shown = false; break; }
        op *= parseFloat(cs.opacity || '1');
        a = a.parentElement;
      }
      const r = el.getBoundingClientRect();
      if (shown && op > 0.01 && r.width > 0 && r.height > 0) out.push(t);
    }
    return out;
  }, VICTORY_GLITCH_TEXTS);
}
/** Screens a frame: no visible victory glitch string and no grim word anywhere in the page text. */
export async function screenText(page, grim = []) {
  const text = (await bodyText(page)).toUpperCase();
  const glitch = await visibleGlitchTexts(page);
  const bad = grim.filter(w => new RegExp(`\\b${w}\\b`).test(text));
  return { glitch, grim: bad, ok: glitch.length === 0 && bad.length === 0 };
}
