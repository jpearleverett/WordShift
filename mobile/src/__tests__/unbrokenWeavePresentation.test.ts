import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: Array<() => void | (() => void)> = [];

const resetRenderState = () => {
  stateStore.clear();
  stateIndex = 0;
  effectCallbacks = [];
};

const rewindRenderState = () => {
  stateIndex = 0;
  effectCallbacks = [];
};

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!stateStore.has(index)) {
        stateStore.set(index, typeof initial === 'function' ? (initial as () => unknown)() : initial);
      }
      return [
        stateStore.get(index),
        (value: unknown) => stateStore.set(index, typeof value === 'function'
          ? (value as (previous: unknown) => unknown)(stateStore.get(index))
          : value),
      ];
    },
    useEffect: (effect: () => void | (() => void)) => {
      effectCallbacks.push(effect);
    },
  };
});

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Image: 'Image',
  Dimensions: { get: () => ({ height: 800 }) },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
}));

jest.mock('../components/ui/PanelCard', () => ({
  PanelCard: ({ children }: { children: unknown }) => {
    const React = require('react');
    return React.createElement('PanelCard', null, children);
  },
}));
jest.mock('../components/ui/PixelPlaque', () => ({
  PixelPlaque: ({ label }: { label: string }) => {
    const React = require('react');
    return React.createElement('PixelPlaque', { label }, label);
  },
}));
jest.mock('../components/AmberInline', () => ({
  AmberInline: () => null,
}));
jest.mock('../hooks/useScreenInsets', () => ({
  useScreenInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('../components/puzzle/modeIcons', () => ({
  getModeIconSprite: () => null,
}));
jest.mock('../services/starRating', () => ({
  getCumulativeStats: jest.fn(async () => ({
    totalPuzzlesCompleted: 160,
    totalStars: 480,
    threeStarCount: 160,
    twoStarCount: 0,
    oneStarCount: 0,
    totalHintsUsed: 0,
    totalInvalidAttempts: 0,
    byDifficulty: {
      EASY: { completed: 0, stars: 0 },
      MEDIUM: { completed: 0, stars: 0 },
      MEDIUM_PLUS: { completed: 0, stars: 0 },
      HARD: { completed: 0, stars: 0 },
    },
  })),
  getAverageStars: () => 3,
  getThreeStarRate: () => 1,
}));
jest.mock('../services/achievements', () => ({
  getAchievementsWithStatus: jest.fn(async () => []),
  getTotalCount: () => 0,
}));
jest.mock('../services/dailyChallenge', () => ({
  getDailyStatus: jest.fn(async () => ({ totalCompleted: 0, bestStreak: 0 })),
}));
jest.mock('../services/amberCurrency', () => ({
  ...jest.requireActual('../services/amberCurrency'),
  getStreakInfo: jest.fn(async () => ({ currentStreak: 0 })),
}));
jest.mock('../services/masteryRecords', () => ({
  getBestSpeedRound: jest.fn(async () => 0),
  getSolveTrend: jest.fn(async () => null),
  getUnbrokenWeaveMastery: jest.fn(async () => ({
    rank: 2,
    title: 'Fourfold Weave',
    nextObjective: 'Complete a flawless HARD Unbroken Weave.',
    wins: 4,
    flawlessWins: 2,
    difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
    hardFlawless: false,
  })),
}));

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
import { DifficultyMenu } from '../components/puzzle/DifficultyMenu';
import { StatsScreen } from '../components/StatsScreen';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

const VICTORY_MODAL = readSource('components/puzzle/VictoryModal.tsx');
const HOME_SCREEN = readSource('components/home/HomeScreen.tsx');
const HOME_TYPES = readSource('types/homeWorld.ts');
const MASTERY_RECORDS = readSource('services/masteryRecords.ts');
const AMBER_CURRENCY = readSource('services/amberCurrency.ts');

type Element = { type?: unknown; props?: { children?: unknown } };

const textOf = (node: unknown): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf((node as Element).props?.children);
};

const findByA11yLabel = (node: unknown, label: string): Element | null => {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByA11yLabel(child, label);
      if (found) return found;
    }
    return null;
  }
  const element = node as Element & { props?: { accessibilityLabel?: string; children?: unknown } };
  if (element.props?.accessibilityLabel === label) return element;
  return findByA11yLabel(element.props?.children, label);
};

const findByProp = (node: unknown, key: string, value: unknown): Element | null => {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByProp(child, key, value);
      if (found) return found;
    }
    return null;
  }
  const element = node as Element & { props?: Record<string, unknown> };
  if (element.props?.[key] === value) return element;
  return findByProp(element.props?.children, key, value);
};

beforeEach(async () => {
  resetRenderState();
  await AsyncStorage.clear();
  await clearProgress();
});

describe('Unbroken Weave presentation surfaces', () => {
  test('setup renders the supplied rank, title, objective, and original gameplay rule', () => {
    const tree = DifficultyMenu({
      visible: true,
      currentDifficulty: 'HARD',
      gameMode: 'standard',
      currentVariant: 'standard',
      variantOptions: [],
      phase: 5,
      onSelectDifficulty: jest.fn(),
      onSelectVariant: jest.fn(),
      onToggleChallengeMode: jest.fn(),
      showUnbrokenWeave: true,
      onToggleUnbrokenWeave: jest.fn(),
      unbrokenWeaveMastery: {
        rank: 2,
        title: 'Fourfold Weave',
        nextObjective: 'Complete a flawless HARD Unbroken Weave.',
        wins: 4,
        flawlessWins: 2,
        difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
        hardFlawless: false,
      },
    });
    const text = textOf(tree);

    expect(text).toContain('UNBROKEN WEAVE');
    expect(text).toContain('Each letter may cross the chain only once.');
    expect(text).toMatch(/Rank\s+2\s*:\s*Fourfold Weave/);
    expect(text).toContain('Complete a flawless HARD Unbroken Weave.');
    expect(findByA11yLabel(tree, 'Unbroken Weave, off. Each letter may cross the chain only once.')).not.toBeNull();
  });

  test('Stats renders Weave mastery in MASTERY at Phase 5', async () => {
    StatsScreen({
      onClose: jest.fn(),
      puzzlesSolved: 160,
      currentPhase: 5,
      amberBalance: 0,
      phase: 5,
    });
    effectCallbacks.forEach(effect => effect());
    await new Promise(resolve => setTimeout(resolve, 0));
    rewindRenderState();
    const tree = StatsScreen({
      onClose: jest.fn(),
      puzzlesSolved: 160,
      currentPhase: 5,
      amberBalance: 0,
      phase: 5,
    });
    const text = textOf(tree);

    expect(findByProp(tree, 'label', 'MASTERY')).not.toBeNull();
    expect(text).toContain('Unbroken Weave');
    expect(text).toMatch(/Rank\s+2\s*:\s*Fourfold Weave/);
    expect(text).toContain('Complete a flawless HARD Unbroken Weave.');
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
