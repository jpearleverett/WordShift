/**
 * Authentic Play Store source captures from WordShift's React Native web renderer.
 * Run the app on localhost:8081, then `node scripts/store/captureLaunch.mjs`.
 * No gameplay artwork, labels, or controls are replaced for these captures.
 * Attainable local save cohorts skip repetition; all visible interactions use UI.
 * Network isolation prevents staged saves or analytics reaching live services.
 */
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(mobile, 'assets/Play_store/launch-2026-09/raw');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.WORDSHIFT_CHROMIUM,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 3 });
context.setDefaultTimeout(30_000);
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
});
const page = await context.newPage();
const debuggerSession = await context.newCDPSession(page);
await debuggerSession.send('Runtime.enable');
await debuggerSession.send('Debugger.enable');
await page.addInitScript(() => {
  if (!localStorage.getItem('wordshift_settings')) localStorage.setItem('wordshift_settings', JSON.stringify({
    reducedMotion: true, soundEnabled: false, musicEnabled: false, hapticsEnabled: false,
  }));
});
const captures = JSON.parse(await readFile(path.join(output, 'provenance.json'), 'utf8').catch(() => '{}')).captures ?? [];
const extrasOnly = process.argv.includes('--extras-only');
async function capture(name, description) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  const entry = { file: `${name}.png`, description };
  const previous = captures.findIndex(item => item.file === entry.file);
  if (previous < 0) captures.push(entry);
  else captures[previous] = entry;
  console.log(`Captured ${name}`);
}
async function reloadHome() {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 60_000 });
}
async function deferStory() {
  const later = page.getByRole('button', { name: 'Come back to this', exact: true });
  if (await later.isVisible({ timeout: 1500 })) await later.click();
}
async function dismissIntroductions() {
  for (let pass = 0; pass < 3; pass++) {
    const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
    if (await gotIt.isVisible()) { await gotIt.click(); await page.waitForTimeout(300); }
    else break;
  }
}
try {
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0)).toBeGreaterThan(0);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}');
    Object.assign(progress, { amber: 120, totalAmberEarned: 120, currentPhase: 0, phaseProgress: 6, puzzlesSolved: 6,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'] });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_onboarding_step', 'complete');
    localStorage.setItem('wordshift_daily_login', JSON.stringify({ lastClaimedDate: new Date().toLocaleDateString('en-CA'), cycleDay: 1 }));
    for (const key of ['journal_intro', 'starter_intro', 'setup_selector_intro', 'challenge_intro', 'pit_nudge', 'gated_unlock_intro', 'daily_challenge_intro', 'offering_intro', 'harvest_home_intro']) {
      localStorage.setItem(`wordshift_${key}_seen`, 'true');
    }
  });
  if (!extrasOnly) {
  await reloadHome();
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
  await capture('07-a-place-at-the-table', 'Actual first optional story scene, before any major story reveals.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true })).toBeVisible();
  await capture('08-your-choice', 'Actual early story choice, before any major story reveals.');
  await page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this memory', exact: true }).click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  // Restart through the real control clears the saved cold-open instruction
  // and presents this same real board in its normal returning-player state.
  await page.getByRole('button', { name: 'RESTART', exact: true }).click();
  await capture('01-word-puzzle', 'Real initial board PLAY / PANT / HEAR with onboarding completed; no altered board words.');
  await page.getByTestId('puzzle-row-0').getByRole('button', { name: 'Letter L', exact: true }).click();
  await capture('02-move-one-letter', 'L selected in PLAY; the real game previews insertion choices in PANT.');
  await page.getByTestId('puzzle-row-1').getByRole('button', { name: /forms PLANT, valid word$/ }).click();
  await capture('03-make-two-words', 'First move actually played: PLAY becomes PAY and PANT becomes PLANT.');
  await page.getByTestId('puzzle-row-1').getByRole('button', { name: 'Letter T', exact: true }).click();
  await page.getByTestId('puzzle-row-2').getByRole('button', { name: /forms HEART, valid word$/ }).click();
  await expect(page.getByRole('button', { name: 'Next level', exact: true })).toBeVisible();
  await capture('04-puzzle-complete', 'Actual victory for the two legal moves L→PLANT then T→HEART.');

  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress'));
    const residents = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth'];
    Object.assign(progress, { amber: 184, totalAmberEarned: 1224, currentPhase: 1, phaseProgress: 24, puzzlesSolved: 24,
      unlockedAnimals: residents, unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room'], introsSeen: residents,
      currentStreak: 3, lastPlayDate: new Date().toLocaleDateString('en-CA'), houseCompleted: false, houseCompletionCelebrated: false });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  });
  await reloadHome();
  const ember = page.getByRole('button', { name: 'Ember the fox', exact: true });
  await ember.scrollIntoViewIfNeeded();
  await capture('05-build-a-home', 'Attainable early home with five rooms and five recruited residents; level 24. House scrolled to its furnished lower rooms.');
  await ember.click();
  await expect(page.getByRole('button', { name: 'Continue dialogue', exact: true })).toBeVisible();
  await capture('06-meet-ember', 'An actual resident conversation from Ember; current phase one.');
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });
  await page.getByRole('button', { name: /^Start daily challenge/ }).click();
  await page.waitForTimeout(1000);
  await deferStory();
  await dismissIntroductions();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  await capture('09-daily-challenge', 'Actual local-date daily challenge generated by the game; network features isolated.');
  }
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress'));
    const residents = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth'];
    Object.assign(progress, { amber: 184, totalAmberEarned: 1224, currentPhase: 1, puzzlesSolved: 26, phaseProgress: 26,
      unlockedAnimals: residents, unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room'], introsSeen: residents });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_preview_graduation_seen_v2', 'true');
    const stats = JSON.parse(localStorage.getItem('wordshift_star_stats') || '{}');
    Object.assign(stats, { totalPuzzlesCompleted: 26, totalStars: 72, threeStarCount: 20, twoStarCount: 6, oneStarCount: 0,
      totalInvalidAttempts: 4, totalHintsUsed: 6, noHintPuzzleCount: 20, flawlessCount: 17, lastUpdated: Date.now(),
      byDifficulty: Object.fromEntries(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'].map(difficulty =>
        [difficulty, difficulty === 'EASY' ? { completed: 26, stars: 72 } : { completed: 0, stars: 0 }])) });
    localStorage.setItem('wordshift_star_stats', JSON.stringify(stats));
    localStorage.removeItem('wordshift_in_progress_puzzle');
  });
  await reloadHome();
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  await page.waitForTimeout(1800);
  await deferStory();
  await dismissIntroductions();
  await page.getByRole('button', { name: /Tap to change puzzle setup$/ }).click();
  const doubleShift = page.getByText('Double Shift', { exact: true });
  await doubleShift.evaluate(element => element.scrollIntoView({ block: 'center' }));
  const menuFits = await page.getByRole('button', { name: 'Double Shift', exact: true }).evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.top > 60 && bounds.bottom < window.innerHeight - 20;
  });
  if (menuFits) {
    await capture('10-puzzle-styles', 'Actual puzzle setup showing unlocked Standard, Reverse Shift, and Double Shift modes.');
    await page.getByRole('button', { name: 'Close puzzle setup', exact: true }).click({ position: { x: 4, y: 4 } });
  } else {
    // A real board is a stronger source than a clipped menu. Select the
    // visible title through the normal control; never resize or fake menu UI.
    await doubleShift.click();
  }
  if (!menuFits) {
    await expect(page.getByRole('button', { name: 'Close puzzle setup', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /style Double Shift\./ })).toBeVisible();
    await capture('10-puzzle-styles', 'Actual Double Shift board selected through the unlocked puzzle-style control.');
  }
  await page.getByRole('button', { name: 'Go home', exact: true }).click();
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open Tile Shop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeVisible();
  await page.getByText('Ember-warm', { exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
  await capture('12-make-it-yours', 'Actual cosmetic shop: previews and amber costs from the game, no simulated purchase entitlements.');
} catch (error) {
  await page.screenshot({ path: path.join(output, '_capture-failure.png') }).catch(() => {});
  console.error(await page.locator('body').innerText().catch(() => ''));
  throw error;
} finally {
  await writeFile(path.join(output, 'provenance.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), renderer: 'Actual Expo / React Native web renderer in Chromium',
    viewport: { width: 390, height: 700 }, deviceScaleFactor: 3, pixelDimensions: { width: 1170, height: 2100 },
    note: 'These are genuine app UI renders, not Android device screenshots. Attainable local progression fixtures avoid repetitive play. No DOM replacement, invented UI, or simulated purchase/leaderboard claims. All non-local network requests blocked.',
    captures,
  }, null, 2) + '\n');
  await browser.close();
}
