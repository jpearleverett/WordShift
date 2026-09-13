import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  // Attach before Chromium evaluates the large Expo bundle.
  const debuggerSession = await context.newCDPSession(page);
  await debuggerSession.send('Runtime.enable');
  await debuggerSession.send('Debugger.enable');
  // These returning-player fixtures must not publish analytics or cloud saves.
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

async function openStoreHome(page: Page, patron = false) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 120_000 });
  // Let the initial board's real debounced autosave finish before replacing
  // progress, so bootstrap cannot later overwrite this returning-player seed.
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || '{}').solution?.length ?? 0,
  )).toBeGreaterThan(0);
  await page.evaluate(isPatron => {
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
    localStorage.setItem('wordshift_cosmetics', JSON.stringify({ owned: {}, equipped: {} }));
    localStorage.setItem('wordshift_amber_transactions', '[]');
    localStorage.setItem('wordshift_daily_amber', JSON.stringify({ date: localDay, count: 0, claimReceipts: [] }));
    localStorage.setItem('wordshift_entitlements', JSON.stringify({
      granted: isPatron ? { patron: Date.now() } : {},
    }));
  }, patron);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
}

async function openAdornments(page: Page) {
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open Adornments', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Buy Ember-warm for 300 amber', exact: true })).toBeVisible();
}

async function rapidPurchaseAndExit(page: Page, purchaseLabel: string, exitLabel: string) {
  const purchase = page.getByRole('button', { name: purchaseLabel, exact: true });
  const exit = page.getByRole('button', { name: exitLabel, exact: true });
  await purchase.scrollIntoViewIfNeeded();
  await expect(purchase).toBeInViewport();
  await expect(purchase).toBeEnabled();
  await expect(exit).toBeInViewport();
  await expect(exit).toBeEnabled();
  // Dispatch from the actual visible controls in one browser task. A normal
  // awaited Playwright click gives React time to disable the second button,
  // which would miss the narrow duplicate-tap / navigation-before-render race.
  await page.evaluate(({ buyLabel, closeLabel }) => {
    const buy = document.querySelector<HTMLElement>(`[role="button"][aria-label="${buyLabel}"]`);
    const close = document.querySelector<HTMLElement>(`[role="button"][aria-label="${closeLabel}"]`);
    if (!buy || !close) throw new Error('Visible store controls were not found');
    buy.click();
    buy.click();
    close.click();
  }, { buyLabel: purchaseLabel, closeLabel: exitLabel });
}

async function readCosmeticSave(page: Page) {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const cosmetics = JSON.parse(localStorage.getItem('wordshift_cosmetics')!);
    const transactions: { type: string; source: string; amount: number }[] =
      JSON.parse(localStorage.getItem('wordshift_amber_transactions') || '[]');
    return {
      amber: progress.amber,
      ownsEmber: typeof cosmetics.owned.theme_ember === 'number',
      equipped: cosmetics.equipped.tile_theme ?? null,
      spends: transactions.filter(transaction => transaction.type === 'spend').map(({ source, amount }) => ({ source, amount })),
      pendingCommit: localStorage.getItem('wordshift_storage_commit') !== null,
    };
  });
}

const emberPurchase = {
  amber: 700, ownsEmber: true, equipped: 'theme_ember',
  spends: [{ source: 'cosmetic_theme_ember', amount: 300 }], pendingCommit: false,
};

test('a rapid cosmetic double tap and immediate exit save one purchase and its equipped selection', async ({ page }) => {
  await openStoreHome(page);
  await openAdornments(page);
  await rapidPurchaseAndExit(page, 'Buy Ember-warm for 300 amber', 'Go back');
  await expect.poll(() => readCosmeticSave(page)).toEqual(emberPurchase);
  // The same-frame exit is held until the purchase settles. A regular back
  // action must then work, and returning must not offer the owned item again.
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Buy Ember-warm for 300 amber', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Equip Ember-warm', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect.poll(() => readCosmeticSave(page)).toEqual(emberPurchase);
  await page.getByRole('button', { name: 'Open utility menu', exact: true }).click();
  await page.getByRole('button', { name: 'Open Adornments', exact: true }).click();
  await expect(page.getByText('Ember-warm', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buy Ember-warm for 300 amber', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Equip Ember-warm', exact: true })).toHaveCount(0);
});

test('a cosmetic save interruption retries the original ownership and equip without a second amber charge', async ({ page }) => {
  await openStoreHome(page);
  await openAdornments(page);
  await page.evaluate(() => {
    const nativeSetItem = Storage.prototype.setItem;
    sessionStorage.setItem('wordshift_e2e_fail_cosmetic_save', 'true');
    Storage.prototype.setItem = function (key: string, value: string) {
      // Fail ownership application only AFTER the purchase journal is durable.
      // This exercises recovery when the amber debit has already reached disk.
      if (this === localStorage && key === 'wordshift_cosmetics' &&
          sessionStorage.getItem('wordshift_e2e_fail_cosmetic_save') === 'true' &&
          localStorage.getItem('wordshift_storage_commit') !== null) {
        throw new DOMException('Simulated device storage failure', 'QuotaExceededError');
      }
      nativeSetItem.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Buy Ember-warm for 300 amber', exact: true }).click();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_storage_commit') || '{}').label,
  )).toBe('cosmetic_purchase');
  await expect.poll(() => readCosmeticSave(page)).toEqual({
    ...emberPurchase, ownsEmber: false, equipped: null, pendingCommit: true,
  });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Saving still needs a little help.', { exact: false })).toBeVisible();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem('wordshift_e2e_fail_cosmetic_save'));
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toHaveCount(0);
  await expect.poll(() => readCosmeticSave(page)).toEqual(emberPurchase);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect.poll(() => readCosmeticSave(page)).toEqual(emberPurchase);
});

async function readDailySave(page: Page) {
  return page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const daily = JSON.parse(localStorage.getItem('wordshift_daily_amber')!);
    const transactions: { source: string; amount: number }[] =
      JSON.parse(localStorage.getItem('wordshift_amber_transactions') || '[]');
    return {
      amber: progress.amber,
      claims: daily.count,
      receipts: daily.claimReceipts?.length ?? 0,
      grants: transactions.filter(transaction => transaction.source === 'rewarded_daily_amber').map(({ amount }) => amount),
      pendingCommit: localStorage.getItem('wordshift_storage_commit') !== null,
    };
  });
}

test('Patron Daily Amber ignores duplicate taps, survives leaving the store, and retains its daily cap on reload', async ({ page }) => {
  // This verifies the local Patron reward path. Web uses NoOp billing and does
  // not stand in for a signed Android purchase or a real rewarded-ad callback.
  await openStoreHome(page, true);
  await page.getByRole('button', { name: /amber\. Opens the store\.$/ }).click();
  await rapidPurchaseAndExit(page, 'Claim 60 free amber', 'Close store');
  const firstClaim = { amber: 1060, claims: 1, receipts: 1, grants: [60], pendingCommit: false };
  await expect.poll(() => readDailySave(page)).toEqual(firstClaim);
  await expect(page.getByRole('button', { name: 'Close store', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Close store', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect.poll(() => readDailySave(page)).toEqual(firstClaim);
  await page.getByRole('button', { name: /amber\. Opens the store\.$/ }).click();
  await page.getByRole('button', { name: 'Claim 60 free amber', exact: true }).click();
  const completedDay = { amber: 1120, claims: 2, receipts: 2, grants: [60, 60], pendingCommit: false };
  await expect.poll(() => readDailySave(page)).toEqual(completedDay);
  await expect(page.getByRole('button', { name: 'Claim 60 free amber', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close store', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect.poll(() => readDailySave(page)).toEqual(completedDay);
  await page.getByRole('button', { name: /amber\. Opens the store\.$/ }).click();
  await expect(page.getByText('Daily Amber', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Claim 60 free amber', exact: true })).toHaveCount(0);
});
