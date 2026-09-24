/**
 * A moment offer must never be spent on a card for a product the store cannot
 * sell (billing down, or the product not yet created in Play Console): the
 * card would dead-end and the one-time moment would be gone for good. A fresh
 * module per file, since monetizationPrompts caches its state for the process.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { consumeMomentOffer, OfferOwnership } from '../services/monetizationPrompts';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

const NONE: OfferOwnership = {
  starterPack: false, supporter: false, adFree: false, cosmeticBundle: false, keepersEdition: false, anyPurchase: false,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('a moment is not spent on a product the store cannot sell yet', async () => {
  // Keeper's Edition not created in Play Console yet: no card, moment kept.
  expect(await consumeMomentOffer('story_end', NONE, async () => false)).toBeNull();
  // Once the store returns it, the same moment still offers it, once.
  expect(await consumeMomentOffer('story_end', NONE, async () => true)).toBe('keepers_edition');
  expect(await consumeMomentOffer('story_end', NONE, async () => true)).toBeNull();
});

test('a failing store check counts as not sellable', async () => {
  expect(await consumeMomentOffer('ceremony', NONE, async () => { throw new Error('billing down'); })).toBeNull();
  expect(await consumeMomentOffer('ceremony', NONE, async () => true)).toBe('starter');
});
