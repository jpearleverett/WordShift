/**
 * The reveal waits for the whole house, and Ember says so.
 *
 * Two surfaces back one rule (isRevealHeldForHouse in amberCurrency):
 *  - the pit's ward line, for a player standing at a full circle that will not
 *    ignite because somebody has not moved in yet;
 *  - Ember's one-time home beat, fired the moment the last resident arrives,
 *    which is the unread-conversation warning and the ONLY place it can
 *    honestly live (once the reveal is offered the victory screen hides every
 *    exit and the pit seals its own navigation, so "go and listen first" would
 *    be a choice with one real option).
 */
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullHouseIntroLines, getPitHouseIncompleteHint } from '../services/phaseNarrative';
import { hasSeenFullHouseIntro, markFullHouseIntroSeen } from '../services/amberCurrency';
import { ALL_ANIMAL_TYPES } from '../types/homeWorld';
import { FULL_HOUSE_PHASE } from '../constants/gameBalance';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
});

// The house never names its own machinery: no phase, no level, no puzzle
// count, no "unlock". Straight quotes and no em dashes, like every other line.
const FORBIDDEN = /\b(phase|level|unlock(ed|s)?|puzzle|tutorial)\b/i;
const TYPOGRAPHY = /[—–‘’“”]/;

describe('the held-ward line at the pit', () => {
  test('says nothing while everyone is home', () => {
    expect(getPitHouseIncompleteHint(0)).toBeNull();
    expect(getPitHouseIncompleteHint(-1)).toBeNull();
  });

  test('names how many rooms are still waiting, spelled out', () => {
    expect(getPitHouseIncompleteHint(1)).toContain('One room is still waiting');
    expect(getPitHouseIncompleteHint(3)).toContain('Three rooms are still waiting');
    for (const away of [1, 2, 3, 7, 13]) {
      const line = getPitHouseIncompleteHint(away)!;
      // The circle really is full: that is why the pit would otherwise be mute.
      expect(line).toContain('The circle is full. The house is not.');
      expect(line).not.toMatch(/\d/);
      expect(line).not.toMatch(FORBIDDEN);
      expect(line).not.toMatch(TYPOGRAPHY);
    }
  });
});

describe("Ember's full-house beat", () => {
  // The count the caller passes is the number of LIT HOME BADGES, so it
  // already respects dialogue cooldown and covers a resident whose whole
  // introduction is still waiting as well as one left mid-conversation.
  test('always announces the house and never invents an obligation', () => {
    for (const waiting of [0, 1, 2, 13]) {
      const lines = getFullHouseIntroLines(waiting);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every(line => line.trim().length > 0)).toBe(true);
      for (const line of lines) {
        expect(line).not.toMatch(FORBIDDEN);
        expect(line).not.toMatch(TYPOGRAPHY);
      }
      const all = lines.join(' ');
      expect(all).toContain('Everyone is in');
      // Promises the house, never a number of wins: the beat fires when the
      // last resident arrives, which can be well short of the weighted
      // threshold the reveal also needs.
      expect(all).toContain('not waiting on the house any more');
      expect(all).not.toMatch(/\bnext (offering|win)\b/i);
      // Honest about the stake: no line is lost to the reveal, only re-voiced.
      expect(all).toContain('None of it goes away');
    }
  });

  test('mentions the unfinished conversations only when there are some', () => {
    expect(getFullHouseIntroLines(0).join(' ')).not.toContain('have not told you');
    expect(getFullHouseIntroLines(1).join(' ')).toContain('One of them still has something they have not told you');
    expect(getFullHouseIntroLines(4).join(' ')).toContain('Four of them still have something they have not told you');
    // An invitation, never an instruction.
    expect(getFullHouseIntroLines(4).join(' ')).toContain('if you like');
  });
});

describe('the one-time flag', () => {
  test('is unset until the beat is acknowledged, then stays set', async () => {
    expect(await hasSeenFullHouseIntro()).toBe(false);
    await markFullHouseIntroSeen();
    expect(await hasSeenFullHouseIntro()).toBe(true);
    await markFullHouseIntroSeen();
    expect(await hasSeenFullHouseIntro()).toBe(true);
  });
});

describe('the rule the copy describes', () => {
  test('the beat fires one phase below the reveal, with thirteen residents', () => {
    // HomeScreen gates on homePhase === FULL_HOUSE_PHASE - 1, so if either of
    // these moves the beat silently stops firing.
    expect(FULL_HOUSE_PHASE).toBe(4);
    expect(ALL_ANIMAL_TYPES).toHaveLength(13);
  });
});

describe('the bypass stays where it belongs', () => {
  // ignoreFullHouseHold is an optional field on a public options bag, so any
  // future caller could defeat the hold silently. The creator kit needs it
  // (its win loop runs before it buys a room); nothing else may have it.
  test('only the creator kit passes ignoreFullHouseHold', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.join(__dirname, '..');

    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
      .flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
        return /\.tsx?$/.test(entry.name) ? [full] : [];
      });

    const callers = walk(root)
      .filter(file => fs.readFileSync(file, 'utf8').includes('ignoreFullHouseHold'))
      .map(file => path.relative(root, file))
      .sort();

    expect(callers).toEqual(['services/amberCurrency.ts', 'services/creatorKit.ts']);
  });
});
