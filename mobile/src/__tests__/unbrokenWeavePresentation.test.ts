import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import {
  clearProgress,
  hasSeenUnbrokenWeaveIntro,
  markUnbrokenWeaveIntroSeen,
} from '../services/amberCurrency';
import {
  getUnbrokenWeaveIntroLines,
  getUnbrokenWeaveRankUpLine,
} from '../services/phaseNarrative';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

const DIFFICULTY_MENU = readSource('components/puzzle/DifficultyMenu.tsx');
const VICTORY_MODAL = readSource('components/puzzle/VictoryModal.tsx');
const STATS_SCREEN = readSource('components/StatsScreen.tsx');
const HOME_SCREEN = readSource('components/home/HomeScreen.tsx');
const HOME_TYPES = readSource('types/homeWorld.ts');
const MASTERY_RECORDS = readSource('services/masteryRecords.ts');
const AMBER_CURRENCY = readSource('services/amberCurrency.ts');

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearProgress();
});

describe('Unbroken Weave presentation surfaces', () => {
  test('setup renders the App-held rank, title, objective, and original gameplay rule', () => {
    expect(DIFFICULTY_MENU).toContain('unbrokenWeaveMastery?: UnbrokenWeaveMastery');
    expect(DIFFICULTY_MENU).toMatch(/unbrokenWeaveMastery\.rank/);
    expect(DIFFICULTY_MENU).toMatch(/unbrokenWeaveMastery\.title/);
    expect(DIFFICULTY_MENU).toMatch(/unbrokenWeaveMastery\.nextObjective/);
    expect(DIFFICULTY_MENU).toContain('Each letter may cross the chain only once.');
  });

  test('Stats loads mastery independently and renders it in MASTERY at Phase 5 or after a Weave win', () => {
    expect(STATS_SCREEN).toMatch(/getUnbrokenWeaveMastery\(\)\.then\(setUnbrokenWeaveMastery\)/);
    expect(STATS_SCREEN).toMatch(/effectivePhase === 5/);
    expect(STATS_SCREEN).toMatch(/unbrokenWeaveMastery\.wins > 0/);
    expect(STATS_SCREEN).toMatch(/unbrokenWeaveMastery\.rank/);
    expect(STATS_SCREEN).toMatch(/unbrokenWeaveMastery\.title/);
    expect(STATS_SCREEN).toMatch(/unbrokenWeaveMastery\.nextObjective/);
    expect(STATS_SCREEN).toContain("label={'MASTERY'}");
  });

  test('Victory renders rank progress and a conditional rank-up line', () => {
    expect(VICTORY_MODAL).toMatch(/victoryData\?\.unbrokenWeaveRank/);
    expect(VICTORY_MODAL).toMatch(/victoryData\.unbrokenWeaveTitle/);
    expect(VICTORY_MODAL).toMatch(/victoryData\.unbrokenWeaveNextObjective/);
    expect(VICTORY_MODAL).toMatch(/victoryData\.unbrokenWeaveRankedUp/);
    expect(VICTORY_MODAL).toMatch(/getUnbrokenWeaveRankUpLine/);
  });
});

describe('one-time quiet-home introduction', () => {
  test('persists the seen flag inside home progress and Reset All clears it', async () => {
    expect(HOME_TYPES).toContain('unbrokenWeaveIntroSeen?: boolean');
    expect(await hasSeenUnbrokenWeaveIntro()).toBe(false);

    await markUnbrokenWeaveIntroSeen();
    expect(await hasSeenUnbrokenWeaveIntro()).toBe(true);

    const stored = JSON.parse(
      (await AsyncStorage.getItem('wordshift_home_progress')) ?? '{}',
    );
    expect(stored.unbrokenWeaveIntroSeen).toBe(true);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain('wordshift_home_progress');
    expect(keys.filter(key => /unbroken.*intro/i.test(key))).toEqual([]);

    await clearProgress();
    expect(await hasSeenUnbrokenWeaveIntro()).toBe(false);
  });

  test('uses existing mastery and home-progress storage rather than parallel services', () => {
    expect(MASTERY_RECORDS).toContain("const STORAGE_KEY = 'wordshift_mastery'");
    expect(MASTERY_RECORDS.match(/wordshift_mastery/g)).toHaveLength(2);
    expect(AMBER_CURRENCY).not.toMatch(/const UNBROKEN_WEAVE_INTRO_SEEN_KEY/);
  });

  test('waits for a quiet post-revelation Phase 5 landing and marks when presented', () => {
    const start = HOME_SCREEN.indexOf('// Unbroken Weave intro');
    const end = HOME_SCREEN.indexOf('// Ambient home line', start);
    const intro = HOME_SCREEN.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(intro).toContain('progress.currentPhase !== 5');
    expect(intro).toContain('progress.postRevelation !== true');
    expect(intro).toContain('showIntroDialogue');
    expect(intro).toContain('dialogueFlow.showDialogue');
    expect(intro).toContain('pendingHouseCompletion');
    expect(intro).toContain('pitPhaseReady');
    expect(intro).toContain('setTimeout');
    expect(intro).toContain('hasSeenUnbrokenWeaveIntro()');
    expect(intro).toContain("setIntroContext('unbroken_weave_intro')");
    expect(intro).toContain('getUnbrokenWeaveIntroLines(progress.currentPhase)');
    expect(intro.indexOf('setIntroOverrideLines(')).toBeLessThan(
      intro.indexOf('markUnbrokenWeaveIntroSeen()'),
    );
  });

  test('copy is phase-aware, points to setup, stays in-world, and has no em dash', () => {
    const bright = getUnbrokenWeaveIntroLines(0);
    const settled = getUnbrokenWeaveIntroLines(5);
    expect(settled).not.toEqual(bright);
    expect(settled.join(' ')).toContain('Unbroken Weave');
    expect(settled.join(' ').toLowerCase()).toContain('setup');

    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const text = [
        ...getUnbrokenWeaveIntroLines(phase),
        getUnbrokenWeaveRankUpLine(phase, 'Thread Joined'),
      ].join(' ');
      expect(text).not.toMatch(/[—–]/);
      expect(text.toLowerCase()).not.toContain('phase 5');
    }
  });
});
