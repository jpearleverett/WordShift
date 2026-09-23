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

async function seedCeremonySave(page: Page, pendingWard = false) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0,
  )).toBeGreaterThan(0);
  // Start from the game's own initialized save. Cover both an unconfirmed
  // ward and a committed phase whose cinematic was interrupted by process death.
  await page.evaluate(({ id, ward }) => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      amber: 300, totalAmberEarned: 500, currentPhase: ward ? 1 : 2, phaseProgress: 55, puzzlesSolved: 32,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'],
      lastDialogueRead: { fox: 32 }, pendingPhaseTransition: ward ? 2 : null,
      conversationReadVersion: 1, conversationReadIds: { fox: ['fx_0_1', 'fx_0_2'] },
      pendingVariantTutorials: [], seenVariantTutorials: ['reverse', 'double_shift'],
      pendingCeremonies: ward ? [] : [{ id, kind: 'phase', phase: 2, cycle: 0, previousPhase: 1 }],
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
    localStorage.setItem('wordshift_share_prompts', JSON.stringify({ sharePromptShown: true }));
    // The one-time ceremony offer is its own beat; this cohort has had it.
    localStorage.setItem('wordshift_monet_prompts', JSON.stringify({ momentOffersShown: ['ceremony'] }));
    localStorage.setItem('wordshift_word_harvest', JSON.stringify({ pendingBatches: [], totalWordsOffered: 0 }));
  }, { id: pendingId, ward: pendingWard });
}

async function openInterruptedCeremony(page: Page) {
  await seedCeremonySave(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0]);
}

async function pendingIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    return (progress.pendingCeremonies ?? []).map((ceremony: { id: string }) => ceremony.id);
  });
}

async function finishPhaseReaction(page: Page) {
  await expect(page.getByTestId('phase-reaction-dialogue')).toBeVisible();
  await expect(page.getByTestId('phase-reaction-text')).not.toBeEmpty();
  await expect.poll(() => pendingIds(page)).toEqual(['0:phase_reaction:2']);
  await page.getByRole('button', { name: "Continue after Ember's response", exact: true }).click();
  await expect(page.getByTestId('phase-reaction-dialogue')).toHaveCount(0);
  await expect.poll(() => pendingIds(page)).toEqual([]);
}

for (const reducedMotion of [false, true]) {
  test(`phase scenes wait for Continue and support Back with reduced motion ${reducedMotion}`, async ({ page }) => {
    await seedCeremonySave(page);
    await page.evaluate(reduced => {
      const settings = JSON.parse(localStorage.getItem('wordshift_settings')!);
      localStorage.setItem('wordshift_settings', JSON.stringify({ ...settings, reducedMotion: reduced }));
    }, reducedMotion);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reading = page.getByTestId('phase-transition-reading');
    const next = page.getByTestId('phase-transition-next');
    const back = page.getByTestId('phase-transition-back');
    await expect(reading).toContainText(passages[0]);
    await expect(back).toBeDisabled();
    // Longer than the old scene timer, with no text tap or scroll that could
    // have enabled the former opt-in manual mode.
    await page.waitForTimeout(8_000);
    await expect(reading).toContainText(passages[0]);
    expect(await pendingIds(page)).toEqual([pendingId]);
    await next.click();
    await expect(reading).toContainText(passages[1]);
    await back.click();
    await expect(reading).toContainText(passages[0]);
    await expect(back).toBeDisabled();
    for (const control of [next, back]) {
      await expect(control).toBeInViewport();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    for (let index = 0; index < passages.length - 1; index++) await next.click();
    await expect(reading).toContainText(passages.at(-1)!);
    await page.waitForTimeout(8_000);
    await expect(reading).toContainText(passages.at(-1)!);
    expect(await pendingIds(page)).toEqual([pendingId]);
    await back.click();
    await expect(reading).toContainText(passages.at(-2)!);
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
  await finishPhaseReaction(page);
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
  await finishPhaseReaction(page);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});


test('a successful pit ward ceremony leaves the same pit navigation usable', async ({ page }) => {
  await seedCeremonySave(page, true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Enter the Offering Pit/ }).click();
  // This starts before confirmation, with no durable cinematic queued. The
  // pit's real ward ignition must commit the phase and create that receipt.
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0], { timeout: 40_000 });
  expect(await pendingIds(page)).toEqual([pendingId]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).currentPhase)).toBe(2);
  for (const passage of passages) {
    await expect(page.getByTestId('phase-transition-reading')).toContainText(passage);
    await page.getByTestId('phase-transition-next').click();
  }
  await expect(page.getByTestId('phase-transition-next')).toHaveCount(0);
  await finishPhaseReaction(page);
  // No reload or intermediate navigation: the successful cinematic leaves
  // OfferingPitScreen mounted, which is where the old busy ref stayed stuck.
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open statistics', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close utility menu', exact: true }).click({ position: { x: 12, y: 12 } });
  await page.getByRole('button', { name: 'Return home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});

test('a ceremony read failure during boot exposes Retry save and resumes its saved scene', async ({ page }) => {
  await seedCeremonySave(page);
  // Target the fresh ceremony-queue read, after general bootstrap storage has
  // succeeded. A blanket storage failure would test a different boot gate.
  await page.addInitScript(() => {
    sessionStorage.setItem('wordshift_e2e_fail_ceremony_read', 'true');
    const nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (this === localStorage && key === 'wordshift_home_progress' &&
          sessionStorage.getItem('wordshift_e2e_fail_ceremony_read') === 'true' &&
          new Error().stack?.includes('loadFreshCeremonyProgress')) {
        sessionStorage.setItem('wordshift_e2e_ceremony_read_failed', 'true');
        throw new DOMException('Simulated ceremony read failure', 'UnknownError');
      }
      return nativeGetItem.call(this, key);
    };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Your next scene is waiting', { exact: true })).toBeVisible();
  const retry = page.getByRole('button', { name: 'Retry save', exact: true });
  await expect(retry).toBeVisible();
  await expect(retry).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('wordshift_e2e_ceremony_read_failed'))).toBe('true');
  expect(await pendingIds(page)).toEqual([pendingId]);
  await page.evaluate(() => sessionStorage.removeItem('wordshift_e2e_fail_ceremony_read'));
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect(page.getByTestId('phase-transition-reading')).toContainText(passages[0]);
  await page.getByRole('button', { name: 'Skip transition', exact: true }).click();
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await finishPhaseReaction(page);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
});

test('the immediate animal reaction survives relaunch without consuming ordinary conversations', async ({ page }, testInfo) => {
  await openInterruptedCeremony(page);
  const readProgress = () => page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    return { read: progress.conversationReadIds, intros: progress.introsSeen, legacy: progress.lastDialogueRead };
  });
  const before = await readProgress();
  for (const passage of passages) {
    await expect(page.getByTestId('phase-transition-reading')).toContainText(passage);
    await page.getByTestId('phase-transition-next').click();
  }
  await expect(page.getByTestId('phase-reaction-dialogue')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('[data-testid="phase-reaction-dialogue"] div[dir="auto"]').evaluateAll(elements => {
    for (const element of elements) {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      node.style.fontSize = `${parseFloat(style.fontSize) * 1.5}px`;
      const lineHeight = parseFloat(style.lineHeight);
      if (Number.isFinite(lineHeight)) node.style.lineHeight = `${lineHeight * 1.5}px`;
    }
  });
  const continueButton = page.getByRole('button', { name: "Continue after Ember's response", exact: true });
  await expect(continueButton).toBeInViewport();
  const bounds = (await continueButton.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await page.getByTestId('phase-reaction-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(continueButton).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('phase-reaction-small-large-text.png') });
  const reaction = await page.getByTestId('phase-reaction-text').innerText();
  expect(reaction.trim().length).toBeGreaterThan(20);
  expect(await readProgress()).toEqual(before);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('phase-reaction-text')).toHaveText(reaction);
  await expect(page.getByTestId('phase-transition-reading')).toHaveCount(0);
  await finishPhaseReaction(page);
  expect(await readProgress()).toEqual(before);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('phase-reaction-dialogue')).toHaveCount(0);
  expect(await readProgress()).toEqual(before);
});
