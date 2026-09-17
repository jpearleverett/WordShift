import { test, expect, type Page } from '@playwright/test';
import { prepareHouseJourney, openRoomUpgradeHome } from './helpers/house';

const RESIDENTS = [
  { type: 'fox', name: 'Ember', species: 'fox', room: 'cozy_den' },
  { type: 'pangolin', name: 'Panko', species: 'pangolin', room: 'kitchen' },
  { type: 'owl', name: 'Archimedes', species: 'owl', room: 'study' },
  { type: 'axolotl', name: 'Axel', species: 'axolotl', room: 'aquarium' },
  { type: 'sloth', name: 'Sloane', species: 'sloth', room: 'jungle_room' },
  { type: 'fennec_fox', name: 'Fennick', species: 'fennec fox', room: 'desert_room' },
  { type: 'capybara', name: 'Chill', species: 'capybara', room: 'office' },
  { type: 'wombat', name: 'Warren', species: 'wombat', room: 'burrow' },
  { type: 'rabbit', name: 'Thyme', species: 'rabbit', room: 'garden' },
  { type: 'red_panda', name: 'Bamboo', species: 'red panda', room: 'bamboo_attic' },
  { type: 'tarsier', name: 'Vesper', species: 'tarsier', room: 'star_loft' },
  { type: 'aye_aye', name: 'Tock', species: 'aye-aye', room: 'belfry' },
  { type: 'kakapo', name: 'Moss', species: 'kakapo', room: 'sky_garden' },
];

async function openWalkingHouse(page: Page, phase: 3 | 4 | 5, reducedMotion = false) {
  await openRoomUpgradeHome(page);
  await page.evaluate(({ residents, selectedPhase, motion }) => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      puzzlesSolved: 150, phaseProgress: selectedPhase === 3 ? 90 : 140,
      currentPhase: selectedPhase, pendingPhaseTransition: null, pendingCeremonies: [],
      pendingVariantTutorials: [], seenVariantTutorials: ['reverse', 'double_shift'],
      unlockedAnimals: residents.map(resident => resident.type),
      unlockedRooms: residents.map(resident => resident.room),
      introsSeen: residents.map(resident => resident.type),
      houseCompleted: true, houseCompletionCelebrated: true, finaleArmed: false,
      finalPuzzleCompleted: selectedPhase === 5, postRevelation: selectedPhase === 5,
      unbrokenWeaveIntroSeen: true, keeperRecordSeen: true,
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_story_spine', JSON.stringify({
      version: 1, cycle: 0, memories: {}, boundary: selectedPhase === 5 ? 'remember' : null,
      carriedBoundary: null, carriedRecord: false, arrivedBeforeRevision: false,
      previousCycles: [], worldInspected: false,
    }));
    const settings = JSON.parse(localStorage.getItem('wordshift_settings')!);
    localStorage.setItem('wordshift_settings', JSON.stringify({ ...settings, reducedMotion: motion }));
  }, { residents: RESIDENTS, selectedPhase: phase, motion: reducedMotion });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  await expect(page.getByTestId('animal-sprite-body')).toHaveCount(13);
  // Pin the story cohort as well as the rendered population: a recovery gate
  // or invalid seed must not silently turn this into an early-game check.
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_home_progress')!).currentPhase,
  )).toBe(phase);
}

// Sample the real room sprites, not a second renderer or a standalone atlas.
// A fixed-source atlas must decode, expose both rows of the complete cycle,
// and advance while its parent actually travels in the direction it faces.
async function observeWalks(page: Page, phase: 3 | 4 | 5) {
  return page.evaluate(async ({ residents, selectedPhase }) => {
    const samples = residents.map(resident => ({
      type: resident.type, frames: new Set<string>(), rows: new Set<number>(),
      distances: [] as number[], facingErrors: 0, decoded: false, wrongOutfit: false,
      lastX: null as number | null,
    }));
    const matrix = (element: Element) => new DOMMatrixReadOnly(getComputedStyle(element).transform);
    const visible = (element: Element, root: Element) => {
      // RN web paints an Image as its wrapper background and keeps the inner
      // img transparent for intrinsic sizing. Inspect the visible wrappers.
      let current: Element | null = element.parentElement;
      while (current && current !== root) {
        if (Number(getComputedStyle(current).opacity) < 0.99) return false;
        current = current.parentElement;
      }
      return true;
    };
    const start = performance.now();
    while (performance.now() - start < 40_000) {
      for (const [index, resident] of residents.entries()) {
        const label = `${resident.name} the ${resident.species}`;
        const button = Array.from(document.querySelectorAll('[role="button"]'))
          .find(element => element.getAttribute('aria-label')?.startsWith(label));
        if (!button) continue;
        const sample = samples[index];
        const body = button.querySelector('[data-testid="animal-sprite-body"]')!;
        const images = Array.from(body.querySelectorAll('img'));
        if (selectedPhase >= 4 && images.some(image =>
          /\/characters\/[^/]+\/(?:idle|talk|walk(?:_\d+)?)\.png/.test(decodeURIComponent(image.src)),
        )) sample.wrongOutfit = true;
        const atlas = body.querySelector('[data-testid="animal-sprite-walk-atlas"]');
        let facing = matrix(body).a;
        let walking = false;
        if (atlas && Number(getComputedStyle(atlas).opacity) > 0.99) {
          const image = atlas.querySelector('img')!;
          sample.decoded ||= image.complete && image.naturalWidth > 0;
          const offset = matrix(atlas.firstElementChild!);
          const x = Math.round(offset.e);
          const y = Math.round(offset.f);
          sample.frames.add(`${x},${y}`);
          sample.rows.add(y);
          facing *= matrix(atlas).a;
          walking = true;
        } else if (resident.type === 'fox' && selectedPhase === 3) {
          const image = images.find(candidate =>
            /\/fox\/walk_\d+\.png/.test(decodeURIComponent(candidate.src)) && visible(candidate, body),
          );
          if (image) {
            sample.decoded ||= image.complete && image.naturalWidth > 0;
            sample.frames.add(decodeURIComponent(image.src).match(/walk_\d+/)![0]);
            walking = true;
          }
        }
        const x = button.getBoundingClientRect().x;
        if (walking && sample.lastX !== null) {
          const distance = x - sample.lastX;
          if (Math.abs(distance) > 0.1 && Math.abs(facing) > 0.95) {
            sample.distances.push(distance);
            if (Math.sign(distance) !== Math.sign(facing)) sample.facingErrors++;
          }
        }
        sample.lastX = x;
      }
      if (samples.every(sample => sample.frames.size >=
        (sample.type === 'fox' && selectedPhase === 3 ? 10 : 8) && sample.distances.length > 3)) break;
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    return samples.map(({ frames, rows, distances, lastX: _lastX, ...sample }) => ({
      ...sample, frames: [...frames], rows: [...rows], movingSamples: distances.length,
    }));
  }, { residents: RESIDENTS, selectedPhase: phase });
}

for (const phase of [3, 4, 5] as const) {
  test(`all thirteen residents walk in their actual rooms in phase ${phase}`, async ({ page, context }, testInfo) => {
    await prepareHouseJourney(page, context, false);
    await openWalkingHouse(page, phase);
    const observations = await observeWalks(page, phase);
    await testInfo.attach(`phase-${phase}-house`, {
      body: await page.screenshot(), contentType: 'image/png',
    });
    await testInfo.attach(`phase-${phase}-walking-observations`, {
      body: JSON.stringify(observations, null, 2), contentType: 'application/json',
    });
    for (const sample of observations) {
      expect(sample.decoded, `${sample.type} decoded`).toBe(true);
      expect(sample.wrongOutfit, `${sample.type} keeps its outfit`).toBe(false);
      expect(sample.frames.length, `${sample.type} complete cycle`).toBe(phase === 3 && sample.type === 'fox' ? 10 : 8);
      if (phase >= 4 || sample.type !== 'fox') expect(sample.rows.sort()).toEqual([-90, 0]);
      expect(sample.movingSamples, `${sample.type} travels while stepping`).toBeGreaterThan(3);
      expect(sample.facingErrors, `${sample.type} faces its travel`).toBe(0);
    }
  });
}

test('reduced motion keeps all thirteen robed residents still and avoids walk decoding', async ({ page, context }) => {
  await prepareHouseJourney(page, context, true);
  await openWalkingHouse(page, 5, true);
  await expect(page.getByTestId('animal-sprite-walk-atlas')).toHaveCount(0);
  const positions = () => page.getByTestId('animal-sprite-body').evaluateAll(elements => elements.map(element => ({
    x: element.getBoundingClientRect().x, transform: getComputedStyle(element).transform,
  })));
  const before = await positions();
  // Exceeds the latest phase-five initial wander delay (7.2s).
  await page.waitForTimeout(7500);
  expect(await positions()).toEqual(before);
  for (const layer of await page.getByTestId('animal-sprite-static').all()) {
    await expect(layer).toHaveCSS('opacity', '1');
    expect(await layer.locator('img').first().getAttribute('src')).toContain('robed');
  }
});
