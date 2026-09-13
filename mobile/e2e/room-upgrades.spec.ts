import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  prepareHouseJourney, openRoomUpgradeHome, openHouseShop, buyHouseGift,
  visitGiftRecipient, giveHouseGift, finishGiftReaction,
} from './helpers/house';

test.beforeEach(async ({ page, context }) => {
  await prepareHouseJourney(page, context);
});

async function capture(page: Page, name: string) {
  const directory = process.env.WORDSHIFT_CAPTURE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`) });
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
      gifts: (upgrades.pendingGifts ?? []).map((gift: { tier: number; level?: number; deliveredAt?: number }) => ({
        tier: gift.tier, level: gift.level ?? null, delivered: gift.deliveredAt !== undefined,
      })),
    };
  });
}

test('all five upgrades require a gift and keep their ownership and charge after relaunch', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await openHouseShop(page);
  await buyHouseGift(page, 'Decorate Cozy Den with Hearthstone for 75 amber');
  await expect.poll(() => readHouseSave(page)).toEqual({
    amber: 925, decorated: false, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: false,
    gifts: [{ tier: 1, level: null, delivered: false }],
  });
  await visitGiftRecipient(page, 'Hearthstone');
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toHaveCount(0);
  await capture(page, 'room-gift-ready');

  // Buying and even opening the recipient's gift do not install it. The
  // unopened gift survives a relaunch and does not ask for a second payment.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ember, gift ready to give', exact: true }).click();
  await page.getByRole('button', { name: 'Give Hearthstone to Ember', exact: true }).click();
  await expect.poll(() => readHouseSave(page)).toEqual({
    amber: 925, decorated: true, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: false,
    gifts: [{ tier: 1, level: null, delivered: true }],
  });
  // Giving commits the effect while retaining an unfinished reaction. It is
  // still waiting after relaunch, so interruption cannot swallow the dialogue.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ember, gift ready to give', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Give Hearthstone to Ember', exact: true })).toHaveCount(0);
  await finishGiftReaction(page);
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toBeInViewport();
  await capture(page, 'room-purchase-hearthstone');

  await openHouseShop(page);
  await buyHouseGift(page, 'Deepen Cozy Den with Ashen Mantel for 175 amber');
  await expect.poll(async () => (await readHouseSave(page)).deepened).toBe(false);
  await giveHouseGift(page, 'Ashen Mantel');
  await expect(page.getByTestId('room-upgrade-cozy_den-mantel')).toBeInViewport();
  const attunements = [
    { level: 1, name: 'Kindled', cost: 150 },
    { level: 2, name: 'Humming', cost: 200 },
    { level: 3, name: 'Attuned', cost: 250 },
  ];
  for (const { level, name, cost } of attunements) {
    await openHouseShop(page);
    await buyHouseGift(page, `Attune Cozy Den, level ${level} of 3, ${name}, for ${cost} amber`);
    await expect.poll(async () => (await readHouseSave(page)).attunement).toBe(level - 1);
    await giveHouseGift(page, `Cozy Den: ${name}`);
    await expect.poll(async () => (await readHouseSave(page)).attunement).toBe(level);
  }
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
    pendingCommit: false, gifts: [],
  };
  await expect.poll(() => readHouseSave(page)).toEqual(completedSave);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toBeVisible();
  await expect(page.getByTestId('room-upgrade-cozy_den-mantel')).toBeVisible();
  await expect.poll(() => readHouseSave(page)).toEqual(completedSave);
  await openHouseShop(page);
  await expect(page.getByRole('button', { name: /^(Decorate|Deepen|Attune) Cozy Den/ })).toHaveCount(0);
});

test('an interrupted gift purchase blocks play and Retry save finishes without charging twice', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await openHouseShop(page);
  await page.evaluate(() => {
    const nativeSetItem = Storage.prototype.setItem;
    sessionStorage.setItem('wordshift_e2e_fail_room_upgrade', 'true');
    Storage.prototype.setItem = function (key: string, value: string) {
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
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: true, gifts: [],
  });
  await capture(page, 'room-purchase-save-recovery');

  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Saving still needs a little help.', { exact: false })).toBeVisible();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('wordshift_e2e_fail_room_upgrade'));
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByText('Finishing your purchase', { exact: true })).toHaveCount(0);
  const recoveredSave = {
    amber: 925, decorated: false, deepened: false, attunement: 0,
    spends: [{ source: 'room_upgrade_cozy_den', amount: 75 }], pendingCommit: false,
    gifts: [{ tier: 1, level: null, delivered: false }],
  };
  await expect.poll(() => readHouseSave(page)).toEqual(recoveredSave);
  await visitGiftRecipient(page, 'Hearthstone');
  await expect(page.getByTestId('room-upgrade-cozy_den-hearthstone')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect.poll(() => readHouseSave(page)).toEqual(recoveredSave);
  await openHouseShop(page);
  await expect(page.getByRole('button', { name: 'Decorate Cozy Den with Hearthstone for 75 amber', exact: true })).toHaveCount(0);
  await giveHouseGift(page, 'Hearthstone');
  await expect.poll(() => readHouseSave(page)).toEqual({ ...recoveredSave, decorated: true, gifts: [] });
});
