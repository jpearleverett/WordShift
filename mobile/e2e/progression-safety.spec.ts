import { test, expect, type Page } from '@playwright/test';
import { getPhaseTransitionEvent } from '../src/services/phaseEvents';

const pendingId = '0:phase:2';
const passages = getPhaseTransitionEvent(2)!.scenes.map(scene => scene.text);

test.beforeEach(async ({ page, context }) => {
  // Attach before the large Expo bundle, as in the existing gameplay journeys.
  const debuggerSession = await context.newCDPSession(page);
  await debuggerSession.send('Runtime.enable');
  await debuggerSession.send('Debugger.enable');
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

async function openInterruptedCeremony(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0,
  )).toBeGreaterThan(0);
  // Start from the game's own initialized save. This represents a committed
  // phase boundary followed by process death before its ceremony was delivered.
  await page.evaluate(id => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      amber: 300, totalAmberEarned: 500, currentPhase: 2, phaseProgress: 55, puzzlesSolved: 32,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'],
      lastDialogueRead: { fox: 32 }, pendingPhaseTransition: null,
      pendingVariantTutorials: [], seenVariantTutorials: ['reverse', 'double_shift'],
      pendingCeremonies: [{ id, kind: 'phase', phase: 2, cycle: 0, previousPhase: 1 }],
      cycleCount: 0, houseCompleted: false, houseCompletionCelebrated: false,
      finalPuzzleCompleted: false, postRevelation: false,
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_onboarding_step', 'complete');
    localStorage.setItem('wordshift_daily_login', JSON.stringify({
      lastClaimedDate: new Date().toLocaleDateString('en-CA'), cycleDay: 1,
    }));
    for (const key of [
      'journal_intro', 'starter_intro', 'setup_selector_intro', 'challenge_intro', 'pit_nudge',
      'gated_unlock_intro', 'daily_challenge_intro', 'offering_intro', 'harvest_home_intro',
      'mandatory_harvest',
    ]) {
      localStorage.setItem(`wordshift_${key}_seen`, 'true');
    }
    localStorage.setItem('wordshift_first_win_glitch', 'true');
    localStorage.setItem('wordshift_preview_graduation_seen_v2', 'true');
  }, pendingId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0]);
}

async function pendingIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    return (progress.pendingCeremonies ?? []).map((ceremony: { id: string }) => ceremony.id);
  });
}

test('an interrupted ceremony replays after relaunch and one accidental Skip never consumes it', async ({ page }) => {
  await openInterruptedCeremony(page);
  await page.getByTestId('phase-transition-next').click();
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[1]);
  expect(await pendingIds(page)).toEqual([pendingId]);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0]);
  const skip = page.getByRole('button', { name: 'Skip transition', exact: true });
  await expect(skip).toBeVisible();
  await expect(skip).toBeEnabled();
  // Deliver a real button's two clicks in one browser task, before React can
  // commit the confirmation. The second click must not acknowledge the scene.
  await skip.evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
  const confirmation = page.getByTestId('phase-transition-skip-confirmation');
  await expect(confirmation).toBeVisible();
  expect(await pendingIds(page)).toEqual([pendingId]);
  await page.getByRole('button', { name: 'Keep reading', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0]);
  expect(await pendingIds(page)).toEqual([pendingId]);

  await skip.click();
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await expect(page.getByTestId('phase-transition-next')).toHaveCount(0);
  await expect.poll(() => pendingIds(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('phase-transition-next')).toHaveCount(0);
});

test('rapid Continue input advances one passage and the final acknowledgement durably clears the ceremony', async ({ page }) => {
  await openInterruptedCeremony(page);
  const next = page.getByTestId('phase-transition-next');
  await expect(next).toBeVisible();
  await expect(next).toBeEnabled();
  await next.evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[1]);
  expect(await pendingIds(page)).toEqual([pendingId]);
  for (let index = 1; index < passages.length; index++) {
    await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[index]);
    // Playwright waits through the brief double-tap guard, just as a deliberate
    // second press does after the new page has appeared.
    await next.click();
  }
  await expect(page.getByTestId('phase-transition-next')).toHaveCount(0);
  await expect.poll(() => pendingIds(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});
