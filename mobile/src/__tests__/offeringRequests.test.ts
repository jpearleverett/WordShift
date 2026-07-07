jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  ANIMAL_REQUESTS,
  OFFERING_REQUEST_MIN_PHASE,
  takeOfferingDialogue,
  recordOfferingFulfillment,
  hasOutstandingRequest,
  clearOfferingRequests,
  _clearOfferingRequestsCache,
} from '../services/offeringRequests';
import { DialoguePhase } from '../types/homeWorld';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

beforeEach(async () => {
  AsyncStorage.clear();
  await clearOfferingRequests();
  _clearOfferingRequestsCache();
});

const P4 = 4 as DialoguePhase;

describe('offering requests', () => {
  test('no request below the min phase', async () => {
    const below = (OFFERING_REQUEST_MIN_PHASE - 1) as DialoguePhase;
    expect(await takeOfferingDialogue('fox', below)).toBeNull();
  });

  test('asks once, then goes quiet until fulfilled', async () => {
    const first = await takeOfferingDialogue('fox', P4);
    expect(first?.kind).toBe('request');
    expect(first?.line).toBe(ANIMAL_REQUESTS.fox.requestLine);
    // Second visit before fulfillment: nothing (does not repeat the ask).
    expect(await takeOfferingDialogue('fox', P4)).toBeNull();
  });

  test('a word before the ask does NOT retroactively fulfill', async () => {
    // Fulfilling word formed before ever meeting Fox.
    const fulfilled = await recordOfferingFulfillment(['EMBER']);
    expect(fulfilled).toEqual([]);
    // Fox still asks fresh.
    expect((await takeOfferingDialogue('fox', P4))?.kind).toBe('request');
  });

  test('ask -> deliver -> react-by-name, exactly once', async () => {
    // Ask.
    await takeOfferingDialogue('fox', P4);
    expect(await hasOutstandingRequest('fox', P4)).toBe(true);
    // Deliver a matching word.
    const fulfilled = await recordOfferingFulfillment(['glow', 'apple']);
    expect(fulfilled).toEqual(['fox']);
    expect(await hasOutstandingRequest('fox', P4)).toBe(false);
    // React by name, once.
    const reaction = await takeOfferingDialogue('fox', P4);
    expect(reaction?.kind).toBe('fulfillment');
    expect(reaction?.line).toContain('GLOW');
    // Done forever.
    expect(await takeOfferingDialogue('fox', P4)).toBeNull();
  });

  test('only the first matching word sticks', async () => {
    await takeOfferingDialogue('fox', P4);
    await recordOfferingFulfillment(['FLAME']);
    await recordOfferingFulfillment(['EMBER']); // ignored — already fulfilled
    const reaction = await takeOfferingDialogue('fox', P4);
    expect(reaction?.line).toContain('FLAME');
  });

  test('allowRequest=false never consumes an unshown request', async () => {
    // Caller says "no room for a fresh request this visit".
    expect(await takeOfferingDialogue('fox', P4, false)).toBeNull();
    // The request is still pending — a later quiet visit asks it.
    expect((await takeOfferingDialogue('fox', P4, true))?.kind).toBe('request');
  });

  test('every animal has a request def with a fulfill template placeholder', () => {
    for (const animal of Object.keys(ANIMAL_REQUESTS) as (keyof typeof ANIMAL_REQUESTS)[]) {
      const def = ANIMAL_REQUESTS[animal];
      expect(def.words.length).toBeGreaterThan(0);
      expect(def.requestLine.length).toBeGreaterThan(0);
      expect(def.fulfillTemplate).toContain('{word}');
      // No em dashes in player-facing copy.
      expect(def.requestLine).not.toMatch(/[—–]/);
      expect(def.fulfillTemplate).not.toMatch(/[—–]/);
    }
  });
});
