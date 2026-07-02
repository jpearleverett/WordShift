/**
 * Header quest pill contract (HomeScreen).
 *
 * Quests were buried two taps deep (header → Journal Hub → Quests) with no
 * in-flight feedback. The header quest pill surfaces them one tap away:
 *
 *  - getActiveIncompleteQuestCount: the pill count is quests still in
 *    progress (not completed, not claimed) across daily + weekly tiers —
 *    completed-but-unclaimed quests are the badge's job, not the count's.
 *  - isQuestPillVisible: gated exactly like the Journal Hub (puzzle 6+ via
 *    the post-tutorial light mode, hidden during onboarding), and only once
 *    quest data has loaded.
 *  - getQuestPillAccessibilityLabel: describes active count, claimable amber
 *    (only when > 0), and the daily reset — never conveyed by color alone.
 *
 * HomeScreen imports react-native + native-adjacent modules at module scope;
 * stub them so the pure helpers can be imported in the Node test env
 * (component-test convention — string tags, no renderer).
 */

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  Modal: 'Modal',
  Image: 'Image',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: 'ios' },
  StatusBar: { currentHeight: 24 },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Easing: {
    in: (e: unknown) => e,
    out: (e: unknown) => e,
    inOut: (e: unknown) => e,
    quad: jest.fn(),
    cubic: jest.fn(),
    linear: jest.fn(),
    sin: jest.fn(),
    ease: jest.fn(),
  },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}));

// Heavy child components (gesture-handler, seeded daily generator) — never
// rendered here; stub to string tags so module load stays Node-safe.
jest.mock('../components/home/HouseWorld', () => ({ HouseWorld: 'HouseWorld' }));
jest.mock('../components/home/AnimalSprite', () => ({ CHARACTER_SPRITES: {} }));
jest.mock('../components/DailyChallengeCard', () => ({ DailyChallengeCard: 'DailyChallengeCard' }));
jest.mock('../services/dailyChallenge', () => ({
  isDailyChallengeUnlocked: jest.fn(() => true),
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticError: jest.fn(),
}));
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../services/deviceTier', () => ({
  getDeviceTier: () => 'high',
  shouldSimplifyAnimations: () => true,
}));

import {
  getActiveIncompleteQuestCount,
  isQuestPillVisible,
  getQuestPillAccessibilityLabel,
} from '../components/home/HomeScreen';
import type { Quest, QuestState, CombinedQuestState } from '../services/weeklyQuests';

const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'q_solve',
  type: 'solve_count',
  tier: 'daily',
  title: 'Word Worker',
  description: 'Solve 3 puzzles',
  target: 3,
  progress: 0,
  completed: false,
  claimed: false,
  rewardAmber: 30,
  ...overrides,
});

const makeState = (daily: Quest[], weekly: Quest[]): CombinedQuestState => {
  const tier = (periodId: string, quests: Quest[]): QuestState => ({
    periodId,
    quests,
    generatedAt: 0,
    animalsVisitedThisPeriod: [],
  });
  return { daily: tier('2026-07-02', daily), weekly: tier('2026-W27', weekly) };
};

describe('getActiveIncompleteQuestCount', () => {
  test('returns 0 when quest state has not loaded', () => {
    expect(getActiveIncompleteQuestCount(null)).toBe(0);
  });

  test('counts in-progress quests across both daily and weekly tiers', () => {
    const state = makeState(
      [makeQuest({ id: 'd1' }), makeQuest({ id: 'd2', progress: 2 })],
      [makeQuest({ id: 'w1', tier: 'weekly' })]
    );
    expect(getActiveIncompleteQuestCount(state)).toBe(3);
  });

  test('excludes completed-but-unclaimed quests (those are the badge, not the count)', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, progress: 3 })],
      [makeQuest({ id: 'w1', tier: 'weekly' })]
    );
    expect(getActiveIncompleteQuestCount(state)).toBe(1);
  });

  test('excludes claimed quests', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, claimed: true })],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, claimed: true })]
    );
    expect(getActiveIncompleteQuestCount(state)).toBe(0);
  });
});

describe('isQuestPillVisible', () => {
  test('hidden during onboarding', () => {
    expect(isQuestPillVisible(true, false, true)).toBe(false);
  });

  test('hidden in the post-tutorial light mode (puzzle 5 and below)', () => {
    expect(isQuestPillVisible(false, true, true)).toBe(false);
  });

  test('hidden until quest data has loaded', () => {
    expect(isQuestPillVisible(false, false, false)).toBe(false);
  });

  test('visible once past the Journal Hub gate with quest data loaded', () => {
    expect(isQuestPillVisible(false, false, true)).toBe(true);
  });
});

describe('getQuestPillAccessibilityLabel', () => {
  test('describes active count and daily reset', () => {
    const label = getQuestPillAccessibilityLabel(3, 0, '5 hours');
    expect(label).toContain('Open quests');
    expect(label).toContain('3 in progress');
    expect(label).toContain('reset in 5 hours');
    expect(label).not.toContain('ready to claim');
  });

  test('announces claimable amber when a reward is waiting', () => {
    const label = getQuestPillAccessibilityLabel(2, 45, '30 minutes');
    expect(label).toContain('45 amber ready to claim');
  });
});
