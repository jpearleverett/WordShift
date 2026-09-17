import { test, expect, type Page } from '@playwright/test';
import { getDialoguesForAnimal } from '../src/services/dialogue/animalDialogueBase';
import { INTRO_DIALOGUES } from '../src/services/dialogue/animalDialogueIntro';
import { COORDINATED_EVENTS } from '../src/services/dialogue/animalDialogueNarrative';
import { type AnimalType } from '../src/types/homeWorld';
import { prepareHouseJourney, openRoomUpgradeHome } from './helpers/house';

const residents: AnimalType[] = [
  'fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara',
  'wombat', 'rabbit', 'red_panda', 'tarsier',
];
const readIds = Object.fromEntries(residents.map(type => [
  type, type === 'fox' ? [] : getDialoguesForAnimal(type, 4).map(line => line.id),
]));

test.beforeEach(async ({ page, context }) => {
  await prepareHouseJourney(page, context);
});

async function openFinishedVesperVisit(page: Page, options: { intro?: boolean; gift?: boolean } = {}) {
  await openRoomUpgradeHome(page);
  await page.evaluate(({ allResidents, completed, themes, intro, gift }) => {
    const progress = JSON.parse(localStorage.getItem('wordshift_home_progress')!);
    Object.assign(progress, {
      puzzlesSolved: 100, currentPhase: 4, phaseProgress: 126,
      unlockedAnimals: allResidents,
      unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium', 'jungle_room', 'desert_room', 'office', 'burrow', 'garden', 'bamboo_attic', 'star_loft'],
      introsSeen: intro ? allResidents.filter(id => id !== 'fox') : allResidents,
      pendingPhaseTransition: null, pendingCeremonies: [], pendingVariantTutorials: [],
      seenVariantTutorials: ['reverse', 'double_shift'],
      conversationReadVersion: 1, conversationReadIds: completed,
      lastDialogueRead: Object.fromEntries(allResidents.map(id => [id, completed[id].length])),
      consumedCoordinatedEvents: themes, totalWordsFormed: 0, tutorialSeedsPlanted: true,
    });
    localStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
    localStorage.removeItem('wordshift_dialogue_sessions');
    localStorage.setItem('wordshift_guaranteed_crossref_phase_4', 'true');
    localStorage.setItem('wordshift_dialogue_choices', JSON.stringify({
      offeredBy: allResidents, choices: Object.fromEntries(allResidents.map(id => [id, 'ask'])),
      hasSeenChoice: true, phase4CallbackShown: allResidents,
    }));
    localStorage.setItem('wordshift_narrative_delivery', JSON.stringify({
      seedsDelivered: Object.fromEntries(allResidents.map(id => [id, [0, 1]])),
      callbacksShown: Object.fromEntries(allResidents.map(id => [id, [0, 1]])), phase2PoolCursor: {},
    }));
    localStorage.setItem('wordshift_offering_requests', JSON.stringify(Object.fromEntries(
      allResidents.map(id => [id, { requested: true, fulfilledWord: null, acknowledged: false }]),
    )));
    if (gift) {
      localStorage.setItem('wordshift_room_upgrades', JSON.stringify({
        purchased: {}, deepened: {}, attunements: {},
        pendingGifts: [{ id: 'shortcut-ember-gift', roomId: 'cozy_den', tier: 1, purchasedAt: Date.now() }],
      }));
    }
  }, { allResidents: residents, completed: readIds, themes: COORDINATED_EVENTS.map(event => event.theme), ...options });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible();
  const vesper = page.getByRole('button', { name: 'Vesper the tarsier', exact: true });
  await vesper.scrollIntoViewIfNeeded();
  await vesper.click();

  // A live cross-resident note may precede the finite conversation's closing
  // line; it is drained through the same Next control the player uses.
  const shortcut = page.getByRole('button', { name: 'Talk to Ember', exact: true });
  for (let index = 0; index < 12; index++) {
    const bubble = page.getByTestId('resident-dialogue-bubble');
    await expect(bubble).toBeVisible();
    if (await shortcut.count()) return shortcut;
    const text = await bubble.textContent();
    await page.getByRole('button', { name: 'Continue dialogue', exact: true }).click();
    await expect.poll(() => bubble.textContent()).not.toBe(text);
  }
  throw new Error('Vesper never offered the next friend at the end of her conversation.');
}

test('the conversation footer opens the named friend and leaves their first line unread', async ({ page }) => {
  const shortcut = await openFinishedVesperVisit(page);
  await shortcut.click();
  const bubble = page.getByTestId('resident-dialogue-bubble');
  for (let index = 0; index < 12; index++) {
    await expect(bubble).toBeVisible();
    const text = await bubble.textContent();
    if (text?.includes('Hello, friend!')) break;
    await page.getByRole('button', { name: 'Continue dialogue', exact: true }).click();
    await expect.poll(() => bubble.textContent()).not.toBe(text);
  }
  await expect(bubble).toContainText('Hello, friend!');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).conversationReadIds.fox)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Continue intro', exact: true })).toHaveCount(0);
});

test('the conversation footer opens an unseen full introduction', async ({ page }) => {
  const shortcut = await openFinishedVesperVisit(page, { intro: true });
  await shortcut.click();
  await expect(page.getByRole('button', { name: 'Continue intro', exact: true })).toBeVisible();
  await expect(page.getByText(INTRO_DIALOGUES.fox[0].match(/^.*?[.!?](?:\s|$)/)![0].trim(), { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).introsSeen)).not.toContain('fox');
});

test('the conversation footer offers a purchased gift before the recipient conversation', async ({ page }) => {
  const shortcut = await openFinishedVesperVisit(page, { gift: true });
  await shortcut.click();
  await expect(page.getByTestId('house-upgrade-gift-modal')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Give Hearthstone to Ember', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_home_progress')!).conversationReadIds.fox)).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_room_upgrades')!).purchased)).toEqual({});
});
