import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test.beforeEach(async ({ page, context }) => {
  // Attach before the large Expo bundle is evaluated in Chromium.
  const debuggerSession = await context.newCDPSession(page);
  await debuggerSession.send('Runtime.enable');
  await debuggerSession.send('Debugger.enable');
  // Seeded purchase journeys must never send fabricated analytics or saves.
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

async function capture(page: Page, name: string) {
  const directory = process.env.WORDSHIFT_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`) });
}

async function openRoomUpgradeHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  // Establish a real initialized save before changing this returning player's
  // cohort. In particular, don't race the opening board's debounced autosave.
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
    localStorage.setItem('wordshift_room_upgrades', JSON.stringify({ purchased: {}, deepened: {}, attunements: {} }));
    localStorage.setItem('wordshift_amber_transactions', '[]');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toHaveCount(0);
}

async function openHouseShop(page: Page) {
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open Adornments', exact: true }).click();
  await expect(page.getByText('HOUSE UPGRADES', { exact: true })).toBeVisible();
}

async function buy(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeEnabled();
  await button.click();
  // A bought row settles in place before its next tier becomes actionable.
  await expect(button).toHaveCount(0);
}

async function seeCozyDen(page: Page, deepened = false) {
  const visit = page.getByRole('button', { name: 'See it in the Cozy Den', exact: true }).first();
  await visit.scrollIntoViewIfNeeded();
  await expect(visit).toBeEnabled();
  await visit.click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  // This is the installed object in RoomView, not its shop thumbnail. Requiring
  // it in the viewport also checks that the room-focus handoff actually lands.
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toBeInViewport();
  if (deepened) {
    await expect(page.getByTestId('room-upgrade-cozy_den-mantel')).toBeInViewport();
  }
}

async function readHouseSave(page: Page) {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const upgrades = JSON.parse(localStorage.getItem('wordshift_room_upgrades')!);
    const transactions: { type: string; source: string; amount: number }[] =
      JSON.parse(localStorage.getItem('wordshift_amber_transactions') || '[]');
    return {
      amber: progress.amber,
      decorated: typeof upgrades.purchased.cozy_den === 'number',
      deepened: typeof upgrades.deepened.cozy_den === 'number',
      attunement: upgrades.attunements.cozy_den ?? 0,
      spends: transactions.filter(transaction => transaction.type === 'spend').map(({ source, amount }) => ({ source, amount })),
      pendingCommit: localStorage.getItem('wordshift_storage_commit') !== null,
    };
  });
}

test('room purchases appear in the actual room and all five upgrades survive relaunch', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await openHouseShop(page);
  await buy(page, 'Decorate Cozy Den with Hearthstone for 75 amber');
  await expect.poll(() => readHouseSave(page)).toEqual({
    amber: 925, decorated: true, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: false,
  });
  await seeCozyDen(page);
  await capture(page, 'room-purchase-hearthstone');

  await openHouseShop(page);
  await buy(page, 'Deepen Cozy Den with Ashen Mantel for 175 amber');
  const attunements = [
    { level: 1, name: 'Kindled', cost: 150 },
    { level: 2, name: 'Humming', cost: 200 },
    { level: 3, name: 'Attuned', cost: 250 },
  ];
  for (const { level, name, cost } of attunements) {
    await buy(page, `Attune Cozy Den, level ${level} of 3, ${name}, for ${cost} amber`);
    await expect.poll(async () => (await readHouseSave(page)).attunement).toBe(level);
  }
  await expect(page.getByRole('button', { name: /^Attune Cozy Den,/ })).toHaveCount(0);
  await seeCozyDen(page, true);
  await capture(page, 'room-purchase-fully-attuned');
  const completedSave = {
    amber: 150, decorated: true, deepened: true, attunement: 3,
    spends: [
      { source: 'room_upgrade_cozy_den', amount: 75 },
      { source: 'room_deepening_cozy_den', amount: 175 },
      { source: 'attunement_cozy_den', amount: 150 },
      { source: 'attunement_cozy_den', amount: 200 },
      { source: 'attunement_cozy_den', amount: 250 },
    ],
    pendingCommit: false,
  };
  await expect.poll(() => readHouseSave(page)).toEqual(completedSave);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-mantel')).toBeVisible();
  await expect.poll(() => readHouseSave(page)).toEqual(completedSave);
  await openHouseShop(page);
  await expect(page.getByRole('button', { name: /^(Decorate|Deepen|Attune) Cozy Den/ })).toHaveCount(0);
  await seeCozyDen(page, true);
});

test('an interrupted room purchase blocks play and Retry save finishes it without charging twice', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await openHouseShop(page);
  await page.evaluate(() => {
    const nativeSetItem = Storage.prototype.setItem;
    sessionStorage.setItem('wordshift_e2e_fail_room_upgrade', 'true');
    Storage.prototype.setItem = function (key: string, value: string) {
      // Fail only application of the ownership entry after the write-ahead
      // journal is durable. The balance and ledger may already be written.
      if (this === localStorage && key === 'wordshift_room_upgrades' &&
          sessionStorage.getItem('wordshift_e2e_fail_room_upgrade') === 'true' &&
          localStorage.getItem('wordshift_storage_commit') !== null) {
        throw new DOMException('Simulated device storage failure', 'QuotaExceededError');
      }
      nativeSetItem.call(this, key, value);
    };
  });
  const decorate = page.getByRole('button', { name: 'Decorate Cozy Den with Hearthstone for 75 amber', exact: true });
  await decorate.scrollIntoViewIfNeeded();
  await decorate.click();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_storage_commit') || '{}').label,
  )).toBe('house_upgrade_purchase');
  await expect.poll(() => readHouseSave(page)).toEqual({
    amber: 925, decorated: false, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: true,
  });
  await capture(page, 'room-purchase-save-recovery');

  // A still-failing retry must keep the protected surface visible.
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Saving still needs a little help.', { exact: false })).toBeVisible();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('wordshift_e2e_fail_room_upgrade'));
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toHaveCount(0);
  const recoveredSave = {
    amber: 925, decorated: true, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: false,
  };
  await expect.poll(() => readHouseSave(page)).toEqual(recoveredSave);
  await seeCozyDen(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toBeVisible();
  await expect.poll(() => readHouseSave(page)).toEqual(recoveredSave);
  await openHouseShop(page);
  await expect(page.getByRole('button', { name: 'Decorate Cozy Den with Hearthstone for 75 amber', exact: true })).toHaveCount(0);
  await seeCozyDen(page);
});
