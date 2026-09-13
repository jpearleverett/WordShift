import { expect, type BrowserContext, type Page } from '@playwright/test';

export async function prepareHouseJourney(page: Page, context: BrowserContext, reducedMotion = true) {
  // Attach before the large Expo bundle is evaluated in Chromium.
  const debuggerSession = await context.newCDPSession(page);
  await debuggerSession.send('Runtime.enable');
  await debuggerSession.send('Debugger.enable');
  // Seeded journeys must never send fabricated analytics or cloud saves.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.addInitScript(motion => {
    if (!localStorage.getItem('wordshift_settings')) {
      localStorage.setItem('wordshift_settings', JSON.stringify({
        reducedMotion: motion, soundEnabled: false, musicEnabled: false, hapticsEnabled: false,
      }));
    }
  }, reducedMotion);
}

export async function openRoomUpgradeHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0,
  )).toBeGreaterThan(0);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      amber: 1000, totalAmberEarned: 1000, puzzlesSolved: 44, currentPhase: 2, phaseProgress: 55,
      unlockedAnimals: ['fox'], unlockedRooms: ['cozy_den'], introsSeen: ['fox'],
      pendingPhaseTransition: null, pendingVariantTutorials: [], seenVariantTutorials: ['reverse'],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_onboarding_step', 'complete');
    const today = new Date();
    const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    localStorage.setItem('wordshift_daily_login', JSON.stringify({ lastClaimedDate: localDay, cycleDay: 1 }));
    for (const key of [
      'journal_intro', 'starter_intro', 'setup_selector_intro', 'challenge_intro', 'pit_nudge',
      'gated_unlock_intro', 'daily_challenge_intro', 'offering_intro', 'harvest_home_intro',
      'mandatory_harvest', 'modifier_stacking_intro', 'keeper_record', 'unbroken_weave_intro',
    ]) {
      localStorage.setItem(`wordshift_${key}_seen`, 'true');
    }
    localStorage.setItem('wordshift_sacrifices', JSON.stringify({
      totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [],
      lastSacrificeTimestamp: 0, introSeen: true,
    }));
    localStorage.setItem('wordshift_room_upgrades', JSON.stringify({
      purchased: {}, deepened: {}, attunements: {}, pendingGifts: [],
    }));
    localStorage.setItem('wordshift_amber_transactions', '[]');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toHaveCount(0);
}

export async function openHouseShop(page: Page) {
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open Adornments', exact: true }).click();
  await expect(page.getByText('HOUSE UPGRADES', { exact: true })).toBeVisible();
}

export async function buyHouseGift(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toHaveCount(0);
}

export async function visitGiftRecipient(page: Page, giftName: string, animalName = 'Ember') {
  const visit = page.getByRole('button', { name: `Visit ${animalName} to give ${giftName}`, exact: true });
  await visit.scrollIntoViewIfNeeded();
  await expect(visit).toBeEnabled();
  await visit.click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `${animalName}, gift ready to give`, exact: true }).click();
  await expect(page.getByTestId('house-upgrade-gift-modal')).toBeVisible();
}

export async function finishGiftReaction(page: Page) {
  const modal = page.getByTestId('house-upgrade-gift-modal');
  // A reaction has a finite number of deliberate pages. Don't assume every
  // animal or phase has the same passage count.
  for (let index = 0; index < 12; index++) {
    const done = modal.getByRole('button', { name: 'Done', exact: true });
    if (await done.count()) {
      await expect.poll(async () => {
        if (await done.count()) await done.click();
        return modal.count();
      }).toBe(0);
      return;
    }
    const counter = modal.getByLabel(/^Page \d+ of \d+$/);
    const previousPage = await counter.getAttribute('aria-label');
    await expect.poll(async () => {
      const currentPage = await counter.getAttribute('aria-label');
      if (currentPage === previousPage) {
        await modal.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      return counter.getAttribute('aria-label');
    }).not.toBe(previousPage);
  }
  throw new Error('The gift reaction did not finish within twelve passages.');
}

export async function giveHouseGift(page: Page, giftName: string, animalName = 'Ember') {
  await visitGiftRecipient(page, giftName, animalName);
  await page.getByRole('button', { name: `Give ${giftName} to ${animalName}`, exact: true }).click();
  await finishGiftReaction(page);
}
