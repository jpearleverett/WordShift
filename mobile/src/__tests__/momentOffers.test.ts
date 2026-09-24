/**
 * One-time offers at the big moments: each moment offers at most once per
 * device, never something the player owns, never an ad-free product to a
 * player who is already ad-free, and the second-purchase offer waits for an
 * actual first purchase instead of being spent early.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { consumeMomentOffer, resolveMomentOffer, OfferOwnership } from '../services/monetizationPrompts';
import { getMomentOfferCopy } from '../services/phaseNarrative';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const NONE: OfferOwnership = {
  starterPack: false, supporter: false, adFree: false, cosmeticBundle: false, keepersEdition: false, anyPurchase: false,
};

// The module keeps an in-memory cache for the process, as on a device, so
// each test below spends a different moment.
beforeEach(async () => {
  await AsyncStorage.clear();
});

test('each moment picks the product that fits it, and skips what is owned', () => {
  expect(resolveMomentOffer('ceremony', NONE)).toBe('starter');
  expect(resolveMomentOffer('ceremony', { ...NONE, starterPack: true })).toBeNull();
  expect(resolveMomentOffer('house_whole', NONE)).toBe('supporter');
  expect(resolveMomentOffer('house_whole', { ...NONE, adFree: true })).toBe('collection');
  expect(resolveMomentOffer('house_whole', { ...NONE, supporter: true, cosmeticBundle: true })).toBeNull();
  expect(resolveMomentOffer('story_end', NONE)).toBe('keepers_edition');
  expect(resolveMomentOffer('story_end', { ...NONE, keepersEdition: true })).toBeNull();
  expect(resolveMomentOffer('second_purchase', NONE)).toBeNull();
  expect(resolveMomentOffer('second_purchase', { ...NONE, anyPurchase: true })).toBe('supporter');
  expect(resolveMomentOffer('second_purchase', { ...NONE, anyPurchase: true, supporter: true })).toBeNull();
});

test('a moment offers once, and the spent moment is saved for the next launch', async () => {
  expect(await consumeMomentOffer('story_end', NONE)).toBe('keepers_edition');
  expect(await consumeMomentOffer('story_end', NONE)).toBeNull();
  const stored = JSON.parse((await AsyncStorage.getItem('wordshift_monet_prompts'))!);
  expect(stored.momentOffersShown).toContain('story_end');
});

test('a moment with nothing to offer is still spent, so it never resurfaces later', async () => {
  expect(await consumeMomentOffer('ceremony', { ...NONE, starterPack: true })).toBeNull();
  expect(await consumeMomentOffer('ceremony', NONE)).toBeNull();
});

test('the second-purchase offer waits for a first purchase', async () => {
  expect(await consumeMomentOffer('second_purchase', NONE)).toBeNull();
  expect(await consumeMomentOffer('second_purchase', { ...NONE, anyPurchase: true })).toBe('supporter');
});

test('every offer card has copy with no em dashes', () => {
  const pairs: [Parameters<typeof getMomentOfferCopy>[0], Parameters<typeof getMomentOfferCopy>[1]][] = [
    ['ceremony', 'starter'], ['house_whole', 'supporter'], ['house_whole', 'collection'],
    ['story_end', 'keepers_edition'], ['second_purchase', 'supporter'],
  ];
  for (const [moment, target] of pairs) {
    for (const phase of [0, 2, 4, 5]) {
      const copy = getMomentOfferCopy(moment, target, phase);
      for (const text of [copy.title, copy.message, copy.accept, copy.decline]) {
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/[–—]/);
      }
    }
  }
});

