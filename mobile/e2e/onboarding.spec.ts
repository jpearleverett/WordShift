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

  // Invite Fox. The den's free invite chip is on screen during home_empty, and
  // the home screen raises the invite prompt on its own after the reveal
  // delay (INVITE_PROMPT_REVEAL_DELAY_MS), hiding the chip once the prompt is
  // up. Pin the EFFECT deterministically: never tap the chip here, so a
  // regression in the automatic invite cannot hide behind the tap route.
  const denChip = page.getByRole('button', { name: 'Invite animal to Cozy Den for free', exact: true });
  await expect(denChip).toBeVisible();
  const welcome = page.getByRole('button', { name: 'Welcome friend', exact: true });
  await expect(welcome).toBeVisible({ timeout: 10_000 });
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
