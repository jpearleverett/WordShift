import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

async function capture(page: Page, name: string) {
  const directory = process.env.WORDSHIFT_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`) });
}

async function enlargeBrowserText(page: Page) {
  // Layout coverage only; signed-device checks cover actual system font scaling.
  await page.locator('div[dir="auto"]').evaluateAll(elements => elements.forEach(element => {
    const style = getComputedStyle(element);
    const node = element as HTMLElement;
    // Reusing this helper across paginated scenes must stay at 135%, rather
    // than compounding the size of header/footer nodes that React preserves.
    node.dataset.wordshiftBaseFontSize ??= style.fontSize;
    node.dataset.wordshiftBaseLineHeight ??= style.lineHeight;
    node.style.fontSize = `${parseFloat(node.dataset.wordshiftBaseFontSize) * 1.35}px`;
    const lineHeight = parseFloat(node.dataset.wordshiftBaseLineHeight);
    if (Number.isFinite(lineHeight)) node.style.lineHeight = `${lineHeight * 1.35}px`;
  }));
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
  await enlargeBrowserText(page);
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
  await expect(defer).toBeVisible();
  await defer.click();
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

test('resident dialogue keeps its reading and controls reachable at 320px with enlarged text', async ({ page }) => {
  await openReturningBoard(page);
  await page.getByRole('button', { name: 'Go home', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  const ember = page.getByRole('button', { name: 'Ember the fox', exact: true });
  await ember.scrollIntoViewIfNeeded();
  await ember.click();
  const next = page.getByRole('button', { name: 'Continue dialogue', exact: true });
  await expect(next).toBeVisible();
  await enlargeBrowserText(page);
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  const bounds = await next.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await capture(page, 'updated-resident-small-large-text');
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });
  await expect(ember).toBeVisible();
});

test('a real house ceremony remains readable and can finish at 320px with enlarged text', async ({ page }) => {
  await openReturningBoard(page);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const residents = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];
    Object.assign(progress, {
      currentPhase: 4, phaseProgress: 100, puzzlesSolved: 100,
      houseCompleted: true, houseCompletionCelebrated: false,
      finaleArmed: false, finalPuzzleCompleted: false, postRevelation: false,
      unlockedAnimals: residents, introsSeen: residents,
      unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room', 'desert_room', 'office', 'burrow', 'garden', 'bamboo_attic', 'star_loft', 'belfry', 'sky_garden'],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_sacrifices', JSON.stringify({
      totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [],
      lastSacrificeTimestamp: 0, introSeen: true,
    }));
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const pause = page.getByRole('button', { name: 'Pause and read at my pace', exact: true });
  await expect(pause).toBeVisible({ timeout: 30_000 });
  await pause.click();
  for (let scene = 0; scene < 5; scene++) {
    const advance = page.getByRole('button', { name: scene === 4 ? 'Return to the house' : 'Continue the scene', exact: true });
    await expect(advance).toBeVisible();
    await enlargeBrowserText(page);
    await advance.scrollIntoViewIfNeeded();
    await expect(advance).toBeInViewport();
    const bounds = await advance.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
    await expect(page.getByRole('button', { name: 'Skip transition', exact: true })).toBeInViewport();
    if (scene === 3) await capture(page, 'updated-ceremony-small-large-text');
    await advance.click();
  }
  await expect(page.getByRole('button', { name: 'Skip transition', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).houseCompletionCelebrated)).toBe(true);
});

for (const [letter, finalWord, boundary] of [['D', 'CLOSED', 'remember'], ['R', 'CLOSER', 'release']] as const) {
  test(`playing the final ${finalWord} choice persists its boundary through relaunch`, async ({ page }) => {
    test.setTimeout(180_000);
    await openReturningBoard(page);
    await page.evaluate(() => {
      const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
      Object.assign(progress, { currentPhase: 4, phaseProgress: 160, puzzlesSolved: 160,
        finaleArmed: true, finalPuzzleCompleted: false, postRevelation: false });
      localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
      localStorage.setItem('wordshift_sacrifices', JSON.stringify({
        totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [],
        lastSacrificeTimestamp: 0, introSeen: true,
      }));
      localStorage.removeItem('wordshift_in_progress_puzzle');
      localStorage.removeItem('wordshift_story_spine');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
    const later = page.getByText('Come back to this', { exact: true });
    await expect(later).toBeVisible();
    await later.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').isFinalBoard)).toBe(true);
    const moves = [
      { letter: 'S', formed: 'SCARED' }, { letter: 'D', formed: 'SCARED' },
      { letter: 'S', formed: 'SHARES' }, { letter: 'S', formed: 'CARVES' },
      { letter: 'V', formed: 'CARVED' }, { letter, formed: finalWord },
    ];
    for (const [index, move] of moves.entries()) {
      const source = page.getByTestId(`puzzle-row-${index}`);
      await source.getByRole('button', { name: `Letter ${move.letter}`, exact: true }).first().click();
      // Late-game boards show neutral word previews without a validity verdict.
      const slot = page.getByTestId(`puzzle-row-${index + 1}`).getByRole('button', { name: new RegExp(`(?:forms ${move.formed}, valid word|would form ${move.formed})$`) });
      await slot.scrollIntoViewIfNeeded();
      await slot.click();
    }
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine') || '{}').boundary), { timeout: 30_000 }).toBe(boundary);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).finalPuzzleCompleted)).toBe(true);
    const solved = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine') || '{}').boundary)).toBe(boundary);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).puzzlesSolved)).toBe(solved);
  });
}

test('an interrupted story resumes its saved page and commits the chosen memory once', async ({ page }) => {
  await openReturningBoard(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await enlargeBrowserText(page);
  const continueStory = page.getByRole('button', { name: 'Continue', exact: true });
  await continueStory.scrollIntoViewIfNeeded();
  await expect(continueStory).toBeInViewport();
  await capture(page, 'updated-story-small-large-text');
  await continueStory.click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.page)).toBe(1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click();
  await expect(page.getByText('One cup has a chip in the handle. The other has a crooked flower painted on it.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.choice)).toBe('flower');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Keep this memory', exact: true }).click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.completed)).toBe(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_story_spine')!).memories.cup.choice)).toBe('flower');
  await page.getByRole('button', { name: /^Open journal/ }).click();
  await page.getByRole('button', { name: 'Things We Kept', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Things We Kept', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^A place at the table/ }).click();
  await enlargeBrowserText(page);
  const closeJournal = page.getByRole('button', { name: 'Close', exact: true });
  await closeJournal.scrollIntoViewIfNeeded();
  await expect(closeJournal).toBeInViewport();
  await capture(page, 'updated-story-journal-small-large-text');
  await closeJournal.click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});

test('reset through Settings rebuilds a fresh playable session', async ({ page }) => {
  await openReturningBoard(page);
  await page.getByRole('button', { name: 'Go home', exact: true }).click();
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  const reset = page.getByRole('button', { name: 'Reset All Progress', exact: true });
  await reset.scrollIntoViewIfNeeded();
  await reset.click();
  await page.setViewportSize({ width: 320, height: 568 });
  await enlargeBrowserText(page);
  const confirm = page.getByRole('button', { name: 'Reset Everything', exact: true });
  await confirm.scrollIntoViewIfNeeded();
  await expect(confirm).toBeInViewport();
  await capture(page, 'updated-reset-small-large-text');
  await confirm.click();
  await expect(page.getByText('Reset Complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress') || 'null')?.puzzlesSolved ?? 0)).toBe(0);
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
});

test('a daily resumed after midnight retains its original board identity and clock', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 8, 6, 23, 55));
  await openReturningBoard(page);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    // The daily card unlocks after eight solved boards.
    Object.assign(progress, { puzzlesSolved: 8, phaseProgress: 8 });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Start daily challenge/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').isPlayingDaily)).toBe(true);
  const before = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle')!);
    return { date: save.dailyDate, version: save.dailyBoardVersion, eased: save.dailyEased, started: save.dailyStartedAt,
      words: save.rows.map((row: { originalWord: string }) => row.originalWord) };
  });
  expect(before.date).toBe('2026-09-06');
  expect(before.version).toBeTruthy();
  await page.clock.setFixedTime(new Date(2026, 8, 7, 0, 5));
  await page.evaluate(() => {
    // This cohort has collected the new day's login receipt. Keep the journey
    // focused on resuming its saved daily through the actual daily entry point.
    localStorage.setItem('wordshift_daily_login', JSON.stringify({ lastClaimedDate: '2026-09-07', cycleDay: 2 }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Start daily challenge/ }).click();
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();
  const after = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle')!);
    return { date: save.dailyDate, version: save.dailyBoardVersion, eased: save.dailyEased, started: save.dailyStartedAt,
      words: save.rows.map((row: { originalWord: string }) => row.originalWord) };
  });
  expect(after).toEqual(before);
});

test('claiming a season reward updates amber once and stays claimed after relaunch', async ({ page }) => {
  await openReturningBoard(page);
  await page.evaluate(() => {
    const date = new Date();
    const seasonId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    localStorage.setItem('wordshift_season_pass', JSON.stringify({ seasonId, startPuzzles: 0,
      claimedFree: [], claimedPremium: [], premiumUnlockedByAmber: false }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const openSeason = async () => {
    await page.getByRole('button', { name: /^Open journal/ }).click();
    await page.getByRole('button', { name: /^Open quests(?:,|$)/ }).click();
    await page.getByRole('button', { name: /^Open season pass/ }).click();
  };
  await openSeason();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).amber);
  await page.getByRole('button', { name: 'Claim all (1)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).amber)).toBe(before + 20);
  await expect(page.getByRole('button', { name: /^Claim all/ })).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openSeason();
  await expect(page.getByRole('button', { name: /^Claim all/ })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_season_pass')!).claimedFree)).toEqual([1]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).amber)).toBe(before + 20);
});
