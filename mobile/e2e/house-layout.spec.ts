import { test, expect, type Page } from '@playwright/test';
import { prepareHouseJourney, openRoomUpgradeHome, openHouseShop, buyHouseGift } from './helpers/house';

test.beforeEach(async ({ page, context }) => {
  // The former attunement gap required the purchase fade. Reduced motion
  // skipped that code path and hid the regression from the older journey.
  await prepareHouseJourney(page, context, false);
});

test('the next-unlock sign stays one compact line on narrow phones and preserves its full announcement', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      puzzlesSolved: 64, currentPhase: 3, phaseProgress: 90,
      unlockedAnimals: ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier'],
      unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room', 'desert_room', 'office', 'burrow', 'garden', 'bamboo_attic', 'star_loft'],
    });
    progress.introsSeen = progress.unlockedAnimals;
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const sign = page.getByTestId('next-unlock-progress');
  const caption = page.getByTestId('next-unlock-caption');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(caption).toHaveText('Next: Belfry · 24 puzzles to go');
    await expect(sign).toHaveAccessibleName('Next: Belfry. 24 puzzles to go. Costs 500 amber.');
    await expect.poll(async () => (await caption.boundingBox())?.height ?? Infinity).toBeLessThanOrEqual(24);
    await expect.poll(async () => (await sign.boundingBox())?.height ?? Infinity).toBeLessThanOrEqual(64);
    const box = (await sign.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  // Full price and options remain available from the compact sign.
  await sign.click();
  await expect(page.getByText('Unlock Progress', { exact: true })).toBeVisible();
});

async function expectContiguousCardsBelowHeading(page: Page, offerKey: string) {
  const heading = page.getByTestId('house-upgrades-heading');
  const offer = page.getByTestId(`house-offer-${offerKey}`);
  await heading.scrollIntoViewIfNeeded();
  await expect(offer).toBeVisible();
  await expect(offer).toHaveCSS('opacity', '1');
  // Pending gifts are visible cards above the offers. Every card, including
  // those receipts, must stay opaque and contiguous beneath the heading.
  await expect.poll(async () => {
    return heading.evaluate((title, targetId) => {
      const children = Array.from(title.parentElement!.children);
      const targetIndex = children.findIndex(child => child.getAttribute('data-testid') === targetId);
      const titleIndex = children.indexOf(title);
      if (targetIndex <= titleIndex) return Infinity;
      let previousBottom = title.getBoundingClientRect().bottom;
      let maximumGap = 0;
      for (const child of children.slice(titleIndex + 1, targetIndex + 1)) {
        const box = child.getBoundingClientRect();
        if (Number(getComputedStyle(child).opacity) < 1 || !child.textContent?.trim()) return Infinity;
        maximumGap = Math.max(maximumGap, box.top - previousBottom);
        previousBottom = box.bottom;
      }
      return maximumGap;
    }, `house-offer-${offerKey}`);
  }).toBeLessThanOrEqual(24);
}

test('successive animated attunement purchases keep all cards contiguous below the heading', async ({ page }) => {
  await openRoomUpgradeHome(page);
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    progress.unlockedRooms = ['cozy_den', 'kitchen', 'study'];
    progress.unlockedAnimals = ['fox', 'pangolin', 'owl'];
    progress.introsSeen = progress.unlockedAnimals;
    progress.amber = 3000;
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    const installed = { cozy_den: Date.now(), kitchen: Date.now(), study: Date.now() };
    localStorage.setItem('wordshift_room_upgrades', JSON.stringify({
      purchased: installed, deepened: installed, attunements: {}, pendingGifts: [],
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await openHouseShop(page);
  await expectContiguousCardsBelowHeading(page, 'attune_cozy_den');
  await buyHouseGift(page, 'Attune Cozy Den, level 1 of 3, Kindled, for 150 amber');
  await expectContiguousCardsBelowHeading(page, 'attune_kitchen');
  await buyHouseGift(page, 'Attune Rustic Kitchen, level 1 of 3, Kindled, for 150 amber');
  await expectContiguousCardsBelowHeading(page, 'attune_study');
  await expect(page.getByRole('button', {
    name: "Attune Scholar's Study, level 1 of 3, Kindled, for 150 amber", exact: true,
  })).toBeEnabled();
});
