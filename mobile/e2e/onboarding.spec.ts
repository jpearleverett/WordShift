import { test, expect, type Page } from '@playwright/test';
import { CURATED_EARLY_PUZZLES } from '../src/constants/wordLists';
import { prepareHouseJourney } from './helpers/house';

// The first three minutes of the product, driven end to end from an EMPTY
// save: every other browser journey seeds `wordshift_onboarding_step` as
// 'complete' plus the one-time intro flags, so the cold-open board, the empty
// home, the den invitation, the pit offering and the closing Fox beats were
// only ever covered by hook tests with mocked callbacks and by source-text
// pins. A regression in the rendered wiring (HomeScreen's invite effect, the
// pit FoxGuide props, the victory modal's onboarding CONTINUE) must fail here.

test.beforeEach(async ({ page, context }) => {
  await prepareHouseJourney(page, context);
});

const STEP_KEY = 'wordshift_onboarding_step';

function readOnboardingStep(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), STEP_KEY);
}

function readHomeProgress(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress') || '{}') as {
    amber?: number; unlockedAnimals?: string[]; introsSeen?: string[]; puzzlesSolved?: number;
  });
}

async function openColdOpenBoard(page: Page) {
  // No onboarding flag is seeded: the bootstrap resolves not_started to the
  // self-directed opener board, with its SKIP chip beside HINT and UNDO.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => readOnboardingStep(page)).toBe('cold_open_puzzle');
  await expect(page.getByRole('button', { name: 'Skip the welcome and go home', exact: true })).toBeVisible();
}

async function solveOpenerBoard(page: Page) {
  // Curated board 0: L from PLAY into PANT (PLANT), then T from PLANT into
  // HEAR (HEART). Pin the route against the authored data so a re-authored
  // opener fails at the pin instead of mid-click.
  const opener = CURATED_EARLY_PUZZLES[0];
  expect(opener.words).toEqual(['PLAY', 'PANT', 'HEAR']);
  expect(opener.solution.map(step => step.letterToMove)).toEqual(['L', 'T']);
  const moves = [{ letter: 'L', formed: 'PLANT' }, { letter: 'T', formed: 'HEART' }];
  for (let index = 0; index < moves.length; index++) {
    const move = moves[index];
    const letter = page.getByTestId(`puzzle-row-${index}`)
      .getByRole('button', { name: `Letter ${move.letter}`, exact: true }).first();
    await letter.click();
    await page.getByTestId(`puzzle-row-${index + 1}`)
      .getByRole('button', { name: new RegExp(`forms ${move.formed}, valid word$`) }).click();
  }
}

/**
 * 'clear', or the first occlusion found among the pit's floating words: the
 * prompt card covering one, or two words overlapping. Polled, so the words'
 * spring entrance is simply retried past rather than measured mid-flight.
 */
async function describeWordOcclusion(page: Page): Promise<string> {
  const prompt = await page.getByRole('alert').first().boundingBox();
  if (!prompt) return 'no prompt card';
  const labelled = await page.getByRole('button', { name: /^Word: [A-Z]+, tap to offer$/ }).all();
  const boxes: { label: string; x: number; y: number; width: number; height: number }[] = [];
  for (const word of labelled) {
    const box = await word.boundingBox();
    if (!box) return 'a word has no box';
    boxes.push({ label: (await word.getAttribute('aria-label')) ?? '?', ...box });
  }
  for (const box of boxes) {
    if (box.y < prompt.y + prompt.height) return `${box.label} sits under the prompt card`;
  }
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      const [first, second] = [boxes[a], boxes[b]];
      const overlapping = first.x < second.x + second.width && second.x < first.x + first.width
        && first.y < second.y + second.height && second.y < first.y + first.height;
      if (overlapping) return `${first.label} overlaps ${second.label}`;
    }
  }
  return 'clear';
}

async function tapFoxCard(page: Page, buttonLabel: string) {
  const button = page.getByRole('button', { name: buttonLabel, exact: true });
  await expect(button).toBeVisible();
  await button.click();
}

test('a fresh install is walked from the cold-open board to a complete onboarding with Fox at home', async ({ page }) => {
  await openColdOpenBoard(page);
  await solveOpenerBoard(page);

  // The opener's victory offers ONE exit during onboarding: Continue.
  const results = page.getByLabel('Results', { exact: true });
  const continueButton = results.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton).toBeVisible({ timeout: 30_000 });
  await expect(results.getByRole('button', { name: 'Next level', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await readHomeProgress(page)).puzzlesSolved).toBe(1);
  await continueButton.click();

  // home_empty: the empty house, Ember calling from the den, and no Play button.
  await expect.poll(() => readOnboardingStep(page)).toBe('home_empty');
  await expect(page.getByText(/Hello up there/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toHaveCount(0);

  // Invite Fox. Ember's greeting asks to be invited in and waits: the visitor
  // invite never opens on its own (it used to open on a timer while the
  // greeting was still being read, which looked like the card dismissing
  // itself). Her card's button opens it; so does the den chip (next test).
  const denChip = page.getByRole('button', { name: 'Invite animal to Cozy Den for free', exact: true });
  const welcome = page.getByRole('button', { name: 'Welcome friend', exact: true });
  await page.waitForTimeout(4000);
  await expect(welcome).toHaveCount(0);
  await expect(page.getByText(/Will you invite me in/)).toBeVisible();
  await expect(denChip).toBeVisible();
  await tapFoxCard(page, 'Come on in!');
  await expect(welcome).toBeVisible({ timeout: 10_000 });
  // The greeting yields to the invitation instead of staying mounted beneath it.
  await expect(page.getByText(/Hello up there/)).toHaveCount(0);
  await expect(denChip).toHaveCount(0);
  // The nameplate upper-cases its label.
  await expect(page.getByText('A VISITOR APPROACHES!', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toHaveCount(0);
  await welcome.click();

  // fox_invited: Ember introduces herself in two cards, then leads to the pit.
  await expect.poll(() => readOnboardingStep(page)).toBe('fox_invited');
  await expect.poll(async () => (await readHomeProgress(page)).unlockedAnimals).toContain('fox');
  await expect(page.getByText(/I'm Ember!/)).toBeVisible();
  await tapFoxCard(page, 'Nice to meet you!');
  await expect(page.getByText(/hoping for someone like you/)).toBeVisible();
  await tapFoxCard(page, "Let's go!");

  // pit_intro: one card at the pit, then the standing "tap each word" prompt.
  await expect.poll(() => readOnboardingStep(page)).toBe('pit_intro');
  await expect(page.getByText(/Here we are, the pit!/)).toBeVisible();
  await tapFoxCard(page, 'Offer words!');
  await expect.poll(() => readOnboardingStep(page)).toBe('pit_offering');
  await expect(page.getByText(/Tap each glowing word to offer it/)).toBeVisible();
  await expect(page.getByRole('button', { name: "Let's go home!", exact: true })).toHaveCount(0);

  // The opener's words were held for the pit rather than auto-collected, and
  // the step advances only once the player has offered every one of them.
  const words = page.getByRole('button', { name: /^Word: [A-Z]+, tap to offer$/ });
  await expect.poll(() => words.count()).toBeGreaterThan(0);
  // Every word has to be individually tappable here: the step has no Offer All
  // and no continue button until all of them are gone, so a word under Ember's
  // standing card or under another word strands the player on the stall rescue.
  // Pinned as geometry rather than left to a 30 s click timeout, which reports
  // the symptom and not the cause.
  await expect.poll(() => describeWordOcclusion(page)).toBe('clear');
  const amberBefore = (await readHomeProgress(page)).amber ?? 0;
  for (let offered = 0; offered < 12; offered++) {
    const remaining = await words.count();
    if (remaining === 0) break;
    await words.first().click();
    await expect.poll(() => words.count()).toBeLessThan(remaining);
  }
  await expect(words).toHaveCount(0);
  await expect(page.getByText(/Real amber, out of words you found yourself/)).toBeVisible();
  await expect.poll(async () => (await readHomeProgress(page)).amber ?? 0).toBeGreaterThan(amberBefore);
  await tapFoxCard(page, "Let's go home!");

  // unlock_explained: two closing beats back home, then the player is free.
  await expect.poll(() => readOnboardingStep(page)).toBe('unlock_explained');
  await expect(page.getByText(/The pit sits just below the house/)).toBeVisible();
  await tapFoxCard(page, 'Next');
  await expect(page.getByText(/keep a place by the hearth/)).toBeVisible();
  await tapFoxCard(page, "Let's play!");

  await expect.poll(() => readOnboardingStep(page)).toBe('complete');
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  // Ember stands in the den (her label may carry a resting suffix).
  await expect(page.getByRole('button', { name: /^Ember the fox/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter the Offering Pit', exact: true })).toBeVisible();
  const progress = await readHomeProgress(page);
  expect(progress.unlockedAnimals).toContain('fox');
  expect(progress.introsSeen).toContain('fox');
  expect(progress.puzzlesSolved).toBe(1);
  expect(progress.amber ?? 0).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('wordshift_tutorial_completed'))).toBe('true');
});

test('tapping the den also invites Ember in during onboarding', async ({ page }) => {
  await openColdOpenBoard(page);
  await solveOpenerBoard(page);
  const results = page.getByLabel('Results', { exact: true });
  const continueButton = results.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton).toBeVisible({ timeout: 30_000 });
  await continueButton.click();
  await expect.poll(() => readOnboardingStep(page)).toBe('home_empty');
  const denChip = page.getByRole('button', { name: 'Invite animal to Cozy Den for free', exact: true });
  await expect(denChip).toBeVisible();
  await denChip.click();
  const welcome = page.getByRole('button', { name: 'Welcome friend', exact: true });
  await expect(welcome).toBeVisible({ timeout: 10_000 });
  await welcome.click();
  await expect.poll(() => readOnboardingStep(page)).toBe('fox_invited');
});

test('skipping from the cold-open board confirms first and lands on a clean home', async ({ page }) => {
  await openColdOpenBoard(page);
  await page.getByRole('button', { name: 'Skip the welcome and go home', exact: true }).click();
  // The first tap only asks; the safe answer keeps the board.
  const keepGoing = page.getByRole('button', { name: 'Keep going', exact: true });
  await expect(keepGoing).toBeVisible();
  await keepGoing.click();
  await expect(keepGoing).toHaveCount(0);
  expect(await readOnboardingStep(page)).toBe('cold_open_puzzle');
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Skip the welcome and go home', exact: true }).click();
  await page.getByRole('button', { name: 'Skip it all', exact: true }).click();
  await expect.poll(() => readOnboardingStep(page)).toBe('complete');
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  // The abandoned opener is dropped so the next Play serves a fresh board.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wordshift_in_progress_puzzle'))).toBeNull();
  expect((await readHomeProgress(page)).puzzlesSolved ?? 0).toBe(0);
});
