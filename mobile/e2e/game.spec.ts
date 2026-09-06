import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

async function capture(page: Page, name: string) {
  const directory = process.env.WORDSHIFT_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`) });
}

test.beforeEach(async ({ page, context }) => {
  // The VM needs DevTools attached before the large Expo bundle is evaluated.
  const debuggerSession = await context.newCDPSession(page);
  await debuggerSession.send('Runtime.enable');
  await debuggerSession.send('Debugger.enable');
  // Browser fixtures must never create fabricated production analytics or saves.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('wordshift_settings')) {
      localStorage.setItem('wordshift_settings', JSON.stringify({
        reducedMotion: true, soundEnabled: false, musicEnabled: false, hapticsEnabled: false,
      }));
    }
  });
});

async function openFreshGame(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
}

async function openReturningBoard(page: Page) {
  await openFreshGame(page);
  // Start from a real initialized save, modifying only cohort facts.
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}');
    Object.assign(progress, {
      amber: 120, totalAmberEarned: 120, currentPhase: 0, phaseProgress: 6, puzzlesSolved: 6,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_onboarding_step', 'complete');
    localStorage.setItem('wordshift_daily_login', JSON.stringify({ lastClaimedDate: new Date().toLocaleDateString('en-CA'), cycleDay: 1 }));
    for (const key of ['journal_intro', 'starter_intro', 'setup_selector_intro', 'challenge_intro', 'pit_nudge', 'gated_unlock_intro', 'daily_challenge_intro', 'offering_intro', 'harvest_home_intro']) {
      localStorage.setItem(`wordshift_${key}_seen`, 'true');
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  const defer = page.getByText('Come back to this', { exact: true });
  await expect(defer).toBeVisible();
  await defer.click();
  await expect(page.getByRole('button', { name: /^Hint, \d+ remaining$/ })).toBeVisible();
}

test('fresh board has a visible help icon and scrollable rules at a small viewport', async ({ page }) => {
  await openFreshGame(page);
  const help = page.getByRole('button', { name: 'How to play', exact: true });
  await expect(help.locator('img')).toHaveAttribute('src', /rules/);
  await capture(page, 'updated-fresh-puzzle');
  await help.click();
  await page.setViewportSize({ width: 320, height: 568 });
  // Browser text enlargement tests layout; physical Android font-scale remains a release check.
  await page.locator('div[dir="auto"]').evaluateAll(elements => elements.forEach(element => {
    const style = getComputedStyle(element);
    const node = element as HTMLElement;
    node.style.fontSize = `${parseFloat(style.fontSize) * 1.35}px`;
    node.style.lineHeight = `${parseFloat(style.lineHeight) * 1.35}px`;
  }));
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await close.scrollIntoViewIfNeeded();
  await expect(close).toBeInViewport();
  await capture(page, 'updated-rules-small-large-text');
  await close.click();
  await expect(help).toBeVisible();
});

test('repeating disclosed advice spends one hint and survives reload', async ({ page }) => {
  await openReturningBoard(page);
  const hint = page.getByRole('button', { name: /^Hint, \d+ remaining$/ });
  await expect(hint).toHaveAttribute('aria-label', 'Hint, 5 remaining');
  await hint.click();
  await expect(hint).toHaveAttribute('aria-label', 'Hint, 4 remaining');
  await hint.click();
  await expect(hint).toHaveAttribute('aria-label', 'Hint, 4 remaining');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').hintDisclosures?.length ?? 0)).toBeGreaterThan(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  // The deferred scene may be offered again at this deliberate new Play tap.
  const defer = page.getByText('Come back to this', { exact: true });
  if (await defer.isVisible()) await defer.click();
  await expect(hint).toBeVisible();
  await hint.click();
  await expect(hint).toHaveAttribute('aria-label', 'Hint, 4 remaining');
});

test('optional practice can be played and closed without changing progress', async ({ page }) => {
  await openFreshGame(page);
  const before = await page.evaluate(() => localStorage.getItem('wordshift_home_progress'));
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Practice Double Shift', exact: true }).click();
  await page.getByRole('button', { name: 'H, letter 1', exact: true }).click();
  await page.getByRole('button', { name: 'Position 5, BEATHS', exact: true }).click();
  await expect(page.getByText(/EART and BEATHS are allowed/)).toBeVisible();
  await page.getByRole('button', { name: 'R, letter 3', exact: true }).click();
  await page.getByRole('button', { name: 'Position 2, BREATHS', exact: true }).click();
  await expect(page.getByText(/EAT and BREATHS both fit/)).toBeVisible();
  await capture(page, 'updated-double-practice');
  await page.getByRole('button', { name: 'Close practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wordshift_home_progress'))).toBe(before);
});

test('solving a board exposes accessible results and durable progress', async ({ page }) => {
  await openReturningBoard(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0)).toBeGreaterThan(0);
  const board = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle')!));
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved);
  expect(board.rows.map((row: { originalWord: string }) => row.originalWord)).toEqual(['PLAY', 'PANT', 'HEAR']);
  const moves = [{ letter: 'L', formed: 'PLANT' }, { letter: 'T', formed: 'HEART' }];
  for (let index = 0; index < moves.length; index++) {
    const step = moves[index];
    const source = page.getByTestId(`puzzle-row-${index}`);
    const letter = source.getByRole('button', { name: `Letter ${step.letter}`, exact: true }).first();
    await letter.click();
    const target = page.getByTestId(`puzzle-row-${index + 1}`);
    await target.getByRole('button', { name: new RegExp(`forms ${step.formed}, valid word$`) }).click();
  }
  const next = page.getByRole('button', { name: 'Next level', exact: true });
  await expect(next).toBeVisible({ timeout: 30_000 });
  expect(await next.evaluate(element => element.closest('[aria-hidden="true"]') === null)).toBe(true);
  await capture(page, 'updated-victory');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved)).toBe(before + 1);
  await next.click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
});

for (const boundary of ['remember', 'release'] as const) {
  test(`${boundary} ending remains visible and inspectable in the house`, async ({ page }) => {
    await openReturningBoard(page);
    await page.evaluate(ending => {
      const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
      Object.assign(progress, { currentPhase: 5, phaseProgress: 120, puzzlesSolved: 120,
        postRevelation: true, finalPuzzleCompleted: true, finaleArmed: false,
        unbrokenWeaveIntroSeen: true, keeperRecordSeen: true });
      localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
      // This cohort has already heard the optional endgame introductions.
      // The offering flag belongs to its service state, not a standalone key.
      localStorage.setItem('wordshift_sacrifices', JSON.stringify({
        totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [],
        lastSacrificeTimestamp: 0, introSeen: true,
      }));
      localStorage.setItem('wordshift_story_spine', JSON.stringify({
        version: 1, cycle: 0, memories: {}, boundary: ending, carriedBoundary: null,
        carriedRecord: false, arrivedBeforeRevision: false, previousCycles: [], worldInspected: false,
      }));
    }, boundary);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const object = page.getByRole('button', { name: boundary === 'remember'
      ? 'Inspect the private door' : 'Inspect the outward gate', exact: true });
    await object.scrollIntoViewIfNeeded();
    await expect(object).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Close intro dialogue', exact: true })).toHaveCount(0);
    await capture(page, `updated-house-${boundary}`);
    await object.click();
    await page.getByRole('button', { name: boundary === 'remember'
      ? 'Read the page' : 'Walk beyond the trees', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).worldInspected)).toBe(true);
    await capture(page, `updated-inspection-${boundary}`);
    await page.getByRole('button', { name: 'Back to the house', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(object).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).worldInspected)).toBe(true);
  });
}

test('journal rewards and support benefits are discoverable', async ({ page }) => {
  await openReturningBoard(page);
  await page.getByRole('button', { name: 'Go home', exact: true }).click();
  await page.getByRole('button', { name: /^Open journal/ }).click();
  await expect(page.getByRole('heading', { name: 'STORIES AND DISCOVERIES', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Open quests(?:,|$)/ }).click();
  await expect(page.getByRole('button', { name: /^Open season pass/ })).toBeVisible();
  await capture(page, 'updated-tasks-rewards');
  await page.getByRole('button', { name: 'Close quests', exact: true }).last().click();
  await page.getByRole('button', { name: /amber\. Opens the store\.$/ }).click();
  await page.getByRole('button', { name: 'Compare Remove Ads, Patron and Supporter', exact: true }).click();
  await expect(page.getByText('Supporter · monthly subscription', { exact: true })).toBeVisible();
  await capture(page, 'updated-support-comparison');
  await page.getByRole('button', { name: 'Close store', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});
