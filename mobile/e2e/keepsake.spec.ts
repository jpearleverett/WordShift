import { expect, test, type Page } from '@playwright/test';
import { openRoomUpgradeHome, prepareHouseJourney } from './helpers/house';

// The boundary keepsake on the home world: the painted door in the
// foundation (CLOSED) or the gate on the grass beside it (CLOSER). It must
// render as art (no text label), stay on screen at phone widths, and open its
// inspection when tapped.
async function openAfterHome(page: Page, boundary: 'remember' | 'release') {
  await openRoomUpgradeHome(page);
  await page.evaluate(b => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      currentPhase: 5, phaseProgress: 200, puzzlesSolved: 130, postRevelation: true,
      finaleArmed: false, finalPuzzleCompleted: true, houseCompleted: true,
      unbrokenWeaveIntroSeen: true, keeperRecordSeen: true, pendingCeremonies: [],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_story_spine', JSON.stringify({
      version: 1, cycle: progress.cycleCount ?? 0, memories: {}, boundary: b,
      carriedBoundary: null, carriedRecord: false, arrivedBeforeRevision: false,
    }));
    localStorage.removeItem('wordshift_in_progress_puzzle');
  }, boundary);
  await page.reload({ waitUntil: 'domcontentloaded' });
}

test.use({ deviceScaleFactor: 3 });

for (const [boundary, title] of [['remember', 'the private door'], ['release', 'the outward gate']] as const) {
  for (const width of [390, 360]) {
    test(`the ${boundary} keepsake is painted art that stays on a ${width}dp screen and opens when tapped`, async ({ page, context }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 1400 });
      await prepareHouseJourney(page, context);
      await openAfterHome(page, boundary);
      const keepsake = page.getByRole('button', { name: `Inspect ${title}`, exact: true });
      await keepsake.scrollIntoViewIfNeeded();
      await expect(keepsake).toBeVisible();
      await expect(page.getByText(/^(PRIVATE|OUTWARD)$/)).toHaveCount(0);
      const box = await keepsake.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      // A close look for review, with the Play dock hidden for the capture only.
      const dock = await page.getByRole('button', { name: 'Play puzzle', exact: true }).elementHandle();
      await dock!.evaluate(el => { (el as HTMLElement).style.visibility = 'hidden'; });
      await page.screenshot({ path: `test-results/keepsake-${boundary}-${width}.png`,
        clip: { x: Math.max(0, box!.x - 150), y: Math.max(0, box!.y - 70), width: Math.min(width, 220), height: 130 } });
      await dock!.evaluate(el => { (el as HTMLElement).style.visibility = ''; });
      await keepsake.click();
      await expect(page.getByRole('button', { name: 'Back to the house', exact: true })).toBeVisible();
    });
  }
}
