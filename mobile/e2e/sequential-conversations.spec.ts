import { test, expect, type Page } from '@playwright/test';
import { INTRO_DIALOGUES } from '../src/services/dialogue/animalDialogueIntro';
import { COORDINATED_EVENTS } from '../src/services/dialogue/animalDialogueNarrative';
import { getDialoguesForAnimal } from '../src/services/dialogue/animalDialogueBase';
import { prepareHouseJourney, openRoomUpgradeHome } from './helpers/house';

test.beforeEach(async ({ page, context }) => {
  await prepareHouseJourney(page, context);
});

async function openLateRecruitHome(page: Page) {
  await openRoomUpgradeHome(page);
  await page.evaluate(themes => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const previousResidents = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda'];
    Object.assign(progress, {
      puzzlesSolved: 84, currentPhase: 3, phaseProgress: 88,
      pendingPhaseTransition: null, pendingCeremonies: [], pendingVariantTutorials: [],
      seenVariantTutorials: ['reverse', 'double_shift'],
      unlockedAnimals: previousResidents,
      unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room', 'desert_room', 'office', 'burrow', 'garden', 'bamboo_attic', 'star_loft'],
      introsSeen: previousResidents, lastDialogueRead: {}, conversationReadIds: { tarsier: [] },
      consumedCoordinatedEvents: themes,
      totalWordsFormed: 0,
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.removeItem('wordshift_dialogue_sessions');
    localStorage.removeItem('wordshift_animal_acquaintance');
    localStorage.setItem('wordshift_offering_requests', JSON.stringify({
      tarsier: { requested: true, fulfilledWord: null, acknowledged: false },
    }));
  }, COORDINATED_EVENTS.map(event => event.theme));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
}

async function readVesperIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_home_progress')!).conversationReadIds?.tarsier ?? [],
  );
}

async function visitVesper(page: Page) {
  const animal = page.getByRole('button', { name: 'Vesper the tarsier', exact: true });
  await animal.scrollIntoViewIfNeeded();
  await animal.click();
}

async function expectOrdinaryConversation(page: Page, firstSentence: string) {
  const bubble = page.getByTestId('resident-dialogue-bubble');
  // Live one-off notes can precede ordinary dialogue. Follow their usual
  // Continue control, without changing the stable regular-reading ledger.
  for (let count = 0; count < 12; count++) {
    await expect(bubble).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tell me about yourself', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finish visit', exact: true })).toHaveCount(0);
    const text = await bubble.textContent();
    if (text?.includes(firstSentence)) return;
    await page.getByRole('button', { name: 'Continue dialogue', exact: true }).click();
    await expect.poll(() => bubble.textContent()).not.toBe(text);
  }
  throw new Error(`The next ordinary conversation never reached: ${firstSentence}`);
}

test('a phase-three recruit receives the full welcome and keeps her earliest unread conversation across phases and relaunch', async ({ page }) => {
  await openLateRecruitHome(page);
  const invite = page.getByRole('button', { name: 'Invite animal to Star Loft for 100 amber', exact: true });
  await invite.scrollIntoViewIfNeeded();
  await invite.click();
  await page.getByRole('button', { name: 'Invite for 100 amber', exact: true }).click();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_home_progress')!).unlockedAnimals,
  )).toContain('tarsier');

  for (let index = 0; index < INTRO_DIALOGUES.tarsier.length; index++) {
    const firstSentence = INTRO_DIALOGUES.tarsier[index].match(/^.*?[.!?](?:\s|$)/)![0].trim();
    await expect(page.getByText(firstSentence, { exact: true })).toBeVisible();
    expect(await readVesperIds(page)).toEqual([]);
    expect(await page.evaluate(() =>
      JSON.parse(localStorage.getItem('wordshift_home_progress')!).introsSeen,
    )).not.toContain('tarsier');
    await expect(page.getByRole('button', { name: 'Tell me about yourself', exact: true })).toHaveCount(0);
    await page.getByRole('button', {
      name: index === INTRO_DIALOGUES.tarsier.length - 1 ? 'Welcome and close' : 'Continue intro', exact: true,
    }).click();
  }
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('wordshift_home_progress')!).introsSeen,
  )).toContain('tarsier');
  expect(await readVesperIds(page)).toEqual([]);

  await visitVesper(page);
  await expectOrdinaryConversation(page, 'You looked up before I said anything.');
  // Merely opening the line never claims that it has been read.
  expect(await readVesperIds(page)).toEqual([]);
  for (let pageIndex = 0; pageIndex < 6 && !(await readVesperIds(page)).includes('tr_0_1'); pageIndex++) {
    const bubble = page.getByTestId('resident-dialogue-bubble');
    const previousText = await bubble.textContent();
    await page.getByRole('button', { name: 'Continue dialogue', exact: true }).click();
    await expect.poll(() => bubble.textContent()).not.toBe(previousText);
  }
  expect(await readVesperIds(page)).toEqual(['tr_0_1']);
  await expectOrdinaryConversation(page, 'The chalk marks out there are signed Vesper');
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });

  // The house advances while the reader is still near the start of this
  // friend's story. Neither a new phase nor a fresh process can skip it.
  await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      currentPhase: 4, phaseProgress: 126, puzzlesSolved: 100, pendingPhaseTransition: null, pendingCeremonies: [],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  expect(await readVesperIds(page)).toEqual(['tr_0_1']);
  await visitVesper(page);
  await expectOrdinaryConversation(page, 'The chalk marks out there are signed Vesper');
  expect(await readVesperIds(page)).toEqual(['tr_0_1']);
  await expect(page.getByRole('button', { name: 'Continue intro', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('wordshift_animal_acquaintance'))).toBeNull();
});

test('arrival preserves an earlier unread conversation and presents its authored recollection instead of a future arrival', async ({ page }) => {
  await openLateRecruitHome(page);
  const manuscript = getDialoguesForAnimal('tarsier', 4);
  const targetIndex = manuscript.findIndex(line => line.id === 'tr_1_5');
  expect(targetIndex).toBeGreaterThan(0);
  const completedIds = manuscript.slice(0, targetIndex).map(line => line.id);
  await page.evaluate(({ ids, index }) => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    const residents = [...progress.unlockedAnimals, 'tarsier', 'aye_aye', 'kakapo'];
    Object.assign(progress, {
      currentPhase: 5, phaseProgress: 140, puzzlesSolved: 125,
      postRevelation: true, finalPuzzleCompleted: true, finaleArmed: false,
      houseCompleted: true, houseCompletionCelebrated: true,
      unbrokenWeaveIntroSeen: true, keeperRecordSeen: true,
      unlockedAnimals: residents, introsSeen: residents,
      unlockedRooms: [...progress.unlockedRooms, 'belfry', 'sky_garden'],
      conversationReadVersion: 1, conversationReadIds: { tarsier: ids },
      lastDialogueRead: { tarsier: index },
      pendingPhaseTransition: null, pendingCeremonies: [],
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.setItem('wordshift_story_spine', JSON.stringify({
      version: 1, cycle: 0, memories: {}, boundary: 'remember', carriedBoundary: null,
      carriedRecord: false, arrivedBeforeRevision: false, previousCycles: [], worldInspected: false,
    }));
  }, { ids: completedIds, index: targetIndex });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  expect(await readVesperIds(page)).toEqual(completedIds);
  await visitVesper(page);
  const recollection = 'I watched that cleared patch all night before the arrival.';
  await expectOrdinaryConversation(page, recollection);
  const bubble = page.getByTestId('resident-dialogue-bubble');
  await expect(bubble).not.toContainText('waiting for someone');
  expect(await readVesperIds(page)).toEqual(completedIds);

  // Process death while reading neither retires the older manuscript nor
  // acknowledges a passage the player has not finished.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  expect(await readVesperIds(page)).toEqual(completedIds);
  await visitVesper(page);
  await expectOrdinaryConversation(page, recollection);
  for (let pageIndex = 0; pageIndex < 8 && !(await readVesperIds(page)).includes('tr_1_5'); pageIndex++) {
    const previousText = await bubble.textContent();
    await page.getByRole('button', { name: 'Continue dialogue', exact: true }).click();
    await expect.poll(() => bubble.textContent()).not.toBe(previousText);
  }
  expect(await readVesperIds(page)).toEqual([...completedIds, 'tr_1_5']);
  await expectOrdinaryConversation(page, 'The Latch and the Spoon held steady');
});
