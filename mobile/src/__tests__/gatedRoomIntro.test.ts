/**
 * First-gate lore intro: the one-time Fox dialogue shown the first time a
 * level-gated room (the Jungle Hammock, by default) blocks the player. It
 * explains the wait in-world and points at the two amber options (Reserve /
 * Skip). Covers the narrative copy contract + the one-time seen flag.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// amberCurrency touches logEvent on some paths — keep the debounced flush timer
// out of the run (standard pattern).
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import { getGatedRoomIntroLines } from '../services/phaseNarrative';
import { hasSeenGatedUnlockIntro, markGatedUnlockIntroSeen } from '../services/amberCurrency';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
});

describe('gated-room first-gate intro copy', () => {
  test('returns non-empty lines that name the room, across phases', () => {
    for (const phase of [0, 1, 2, 4]) {
      const lines = getGatedRoomIntroLines(phase, 'Jungle Hammock');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every(l => l.trim().length > 0)).toBe(true);
      // The room the wait applies to is named in-world.
      expect(lines.join(' ')).toContain('Jungle Hammock');
    }
  });

  test('points at both amber paths (reserve = set aside now, skip = complete now)', () => {
    for (const phase of [0, 2]) {
      const text = getGatedRoomIntroLines(phase, 'Jungle Hammock').join(' ').toLowerCase();
      // Reserve: pay now, it rises/builds itself when the gate opens.
      expect(text).toMatch(/set it aside|build itself|rise on its own/);
      // Skip: pay a premium to complete it now.
      expect(text).toContain('completion now');
    }
  });

  test('never breaks the fourth wall (no "level"/"puzzle"/"unlock" jargon in the lore)', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const text = getGatedRoomIntroLines(phase, 'Jungle Hammock').join(' ').toLowerCase();
      for (const forbidden of ['level', 'puzzle', 'unlock', 'button']) {
        expect(text).not.toContain(forbidden);
      }
    }
  });
});

describe('gated-unlock intro seen flag', () => {
  test('flips after markGatedUnlockIntroSeen and is one-time', async () => {
    expect(await hasSeenGatedUnlockIntro()).toBe(false);
    await markGatedUnlockIntroSeen();
    expect(await hasSeenGatedUnlockIntro()).toBe(true);
  });
});
