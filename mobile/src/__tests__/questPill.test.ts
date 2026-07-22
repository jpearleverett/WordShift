/**
 * Header quest pill contract (HomeScreen) + one-row header layout scan.
 *
 * Quests were buried two taps deep (header → Journal Hub → Quests) with no
 * in-flight feedback. The header quest pill surfaces them one tap away, in
 * the single-row header's right cluster (daily → quests → journal → ☰).
 * Per owner direction the header is ONE row: no pit button (the physical
 * pit entrance below the house is the route to the Offering Pit), PLAY
 * docked bottom-center over the world, and the ☰ utility menu visible
 * whenever onboarding is over (including the post-tutorial light mode, so
 * Settings is always reachable from home).
 *
 *  - getActionableQuestCount: the ONE shared count for every quest surface
 *    (header pill + Journal Hub row). Actionable = still in progress (not
 *    completed) PLUS completed-but-unclaimed (claiming is still an action),
 *    across daily AND weekly. Claimed quests never count. Player report
 *    (screenshot): all rewards claimed on both tabs, yet the pill read
 *    "🎯 5" and the journal "Quests (5)" — the two surfaces derived their
 *    numbers differently (journal: all unclaimed quests; pill: in-progress
 *    only) and neither matched what was actually left to do.
 *  - getQuestPillCount: the number only renders while something is still
 *    actionable. When every current quest is completed AND claimed the pill
 *    is the bare target sprite — no lingering count reading as a permanent to-do.
 *  - getJournalQuestLabel: same count feeds the Journal Hub row; the (N)
 *    suffix is omitted entirely when nothing is left to do.
 *  - isQuestPillVisible: gated exactly like the Journal Hub (puzzle 6+ via
 *    the post-tutorial light mode, hidden during onboarding), and only once
 *    quest data has loaded.
 *  - getQuestPillAccessibilityLabel: describes the actionable count (or "All
 *    quests complete"), claimable amber (only when > 0), and the daily reset
 *    — never conveyed by color alone.
 *  - Source scan: the pill lives in the header, opens the quest modal
 *    DIRECTLY (not via the Journal Hub), its '!' badge keys on claimable
 *    amber only, and claiming inside the quest modal replaces the quest
 *    state (fresh references) so both counts re-derive immediately.
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

import * as fs from 'fs';
import * as path from 'path';
import {
  getActionableQuestCount,
  getQuestPillCount,
  getJournalQuestLabel,
  isQuestPillVisible,
  getQuestPillAccessibilityLabel,
} from '../components/home/HomeScreen';
import { getUnclaimedAmber } from '../services/weeklyQuests';
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

describe('getActionableQuestCount (claimable = completed & unclaimed)', () => {
  test('returns 0 when quest state has not loaded', () => {
    expect(getActionableQuestCount(null)).toBe(0);
  });

  test('in-progress quests do NOT count — nothing to turn in yet', () => {
    const state = makeState(
      [makeQuest({ id: 'd1' }), makeQuest({ id: 'd2', progress: 2 })],
      [makeQuest({ id: 'w1', tier: 'weekly' })]
    );
    expect(getActionableQuestCount(state)).toBe(0);
  });

  test('counts completed-but-unclaimed quests (rewards waiting to claim)', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, progress: 3 })],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, progress: 3 })]
    );
    expect(getActionableQuestCount(state)).toBe(2);
  });

  test('excludes claimed quests — ALL claimed on both tabs means 0', () => {
    const state = makeState(
      [
        makeQuest({ id: 'd1', completed: true, claimed: true }),
        makeQuest({ id: 'd2', completed: true, claimed: true }),
      ],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, claimed: true })]
    );
    expect(getActionableQuestCount(state)).toBe(0);
  });

  test('mixed board: only completed-unclaimed counts; in-progress and claimed do not', () => {
    const state = makeState(
      [
        makeQuest({ id: 'd1' }),                                        // in progress -> no
        makeQuest({ id: 'd2', completed: true, progress: 3 }),          // claimable -> yes
        makeQuest({ id: 'd3', completed: true, claimed: true }),        // done -> no
      ],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, claimed: true })]
    );
    expect(getActionableQuestCount(state)).toBe(1);
  });
});

describe('getQuestPillCount (badge/number semantics)', () => {
  // The pill now renders the generated target SPRITE always; the count text is
  // shown only while a quest is actionable (an empty string suppresses it), so
  // a lingering "0" can never read as a permanent to-do.
  test('in-progress quests only: no number — nothing to turn in yet', () => {
    const state = makeState(
      [makeQuest({ id: 'd1' }), makeQuest({ id: 'd2' })],
      [makeQuest({ id: 'w1', tier: 'weekly' })]
    );
    const count = getActionableQuestCount(state);
    expect(count).toBe(0);
    expect(getQuestPillCount(count)).toBe('');
  });

  test('completed-but-unclaimed quests are counted, and the "!" badge condition holds', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, progress: 3 })],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, progress: 3 })]
    );
    const count = getActionableQuestCount(state);
    expect(count).toBe(2);
    expect(getQuestPillCount(count)).toBe('2');
    // The '!' badge keys on claimable amber — lit while rewards wait.
    expect(getUnclaimedAmber(state, 0)).toBeGreaterThan(0);
  });

  test('ALL quests completed AND claimed: no number, no badge', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, claimed: true, progress: 3 })],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, claimed: true, progress: 3 })]
    );
    const count = getActionableQuestCount(state);
    expect(count).toBe(0);
    expect(getQuestPillCount(count)).toBe('');
    expect(getUnclaimedAmber(state, 0)).toBe(0); // badge stays off too
  });
});

describe('getJournalQuestLabel (Journal Hub row shares the same count)', () => {
  test('in-progress quests only: no count suffix (nothing to claim)', () => {
    const state = makeState(
      [makeQuest({ id: 'd1' }), makeQuest({ id: 'd2' })],
      [makeQuest({ id: 'w1', tier: 'weekly' })]
    );
    expect(getJournalQuestLabel(getActionableQuestCount(state), 0)).toBe('Quests');
  });

  test('claimable amber takes precedence over the plain count', () => {
    expect(getJournalQuestLabel(2, 45)).toBe('Quests (+45)');
  });

  test('ALL quests completed AND claimed: no count suffix at all', () => {
    const state = makeState(
      [makeQuest({ id: 'd1', completed: true, claimed: true, progress: 3 })],
      [makeQuest({ id: 'w1', tier: 'weekly', completed: true, claimed: true, progress: 3 })]
    );
    const count = getActionableQuestCount(state);
    const label = getJournalQuestLabel(count, getUnclaimedAmber(state, 0));
    expect(label).toBe('Quests');
    expect(label).not.toMatch(/\d/);
    expect(label).not.toContain('(');
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
  test('describes actionable count and daily reset', () => {
    const label = getQuestPillAccessibilityLabel(3, 0, '5 hours');
    expect(label).toContain('Open quests');
    expect(label).toContain('3 to do');
    expect(label).toContain('reset in 5 hours');
    expect(label).not.toContain('ready to claim');
  });

  test('announces claimable amber when a reward is waiting', () => {
    const label = getQuestPillAccessibilityLabel(2, 45, '30 minutes');
    expect(label).toContain('45 amber ready to claim');
  });

  test('announces completion when nothing is actionable', () => {
    const label = getQuestPillAccessibilityLabel(0, 0, '2 hours');
    expect(label).toContain('All quests complete');
    expect(label).not.toContain('0 to do');
  });

  test('does not claim completion while a reward is still waiting', () => {
    const label = getQuestPillAccessibilityLabel(0, 45, '2 hours');
    expect(label).toContain('45 amber ready to claim');
    expect(label).not.toContain('All quests complete');
  });
});

describe('header wiring (source scan of the one-row header)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../components/home/HomeScreen.tsx'),
    'utf8'
  );
  const pillStart = src.indexOf('styles.questPill');
  // The pill's JSX block (style → badge) is well under this window.
  const pillBlock = src.slice(pillStart, pillStart + 1200);
  // First JSX usage of the header row (the styles definition comes later).
  const headerRowStart = src.indexOf('styles.headerRow');

  test('header is a single row (the old two-row layout is gone)', () => {
    expect(headerRowStart).toBeGreaterThan(-1);
    expect(src).not.toContain('headerStatusRow');
    expect(src).not.toContain('headerActionsRow');
  });

  test('quest pill is rendered in the header right cluster', () => {
    expect(pillStart).toBeGreaterThan(-1);
    expect(src.indexOf('styles.headerRightCluster')).toBeGreaterThan(-1);
    expect(src.indexOf('styles.headerRightCluster')).toBeLessThan(pillStart);
  });

  test('pill opens the quest modal directly (not the Journal Hub)', () => {
    expect(pillBlock).toContain('handleOpenQuestModal');
    expect(pillBlock).not.toContain('setShowJournalModal');
  });

  test('pill renders the target sprite + the shared actionable count', () => {
    // The 🎯 emoji is now the generated quest.png sprite; the count text is
    // still fed by the shared actionableQuestCount (same signal as the badge).
    expect(pillBlock).toContain('QUEST_ICON');
    expect(pillBlock).toContain('getQuestPillCount(actionableQuestCount)');
  });

  test('journal row routes through getJournalQuestLabel fed by the SAME count', () => {
    expect(src).toContain('getJournalQuestLabel(actionableQuestCount, claimableQuestAmber)');
    // The old journal-only derivation (all unclaimed quests) is gone.
    expect(src).not.toContain('activeQuestCount');
    expect(src).not.toContain('getActiveIncompleteQuestCount');
  });

  test('claiming inside the quest modal replaces quest state so counts re-derive', () => {
    const claimStart = src.indexOf('const handleClaimQuest');
    expect(claimStart).toBeGreaterThan(-1);
    const claimBlock = src.slice(claimStart, claimStart + 1600);
    expect(claimBlock).toContain('claimQuestReward');
    // Fresh references at every level — loadWeeklyQuests hands back the same
    // in-place-mutated cache objects the component already holds in state.
    expect(claimBlock).toContain('setWeeklyQuestState({');
    expect(claimBlock).toContain('quests: refreshed.daily.quests.map(q => ({ ...q }))');
    expect(claimBlock).toContain('quests: refreshed.weekly.quests.map(q => ({ ...q }))');
  });

  test('the "!" badge keys on claimable amber only', () => {
    expect(pillBlock).toContain('claimableQuestAmber > 0');
  });

  test('no pit button in the header; attention flows to the world entrance', () => {
    // The header pit shortcut (icon, highlight style, badge label) is gone…
    expect(src).not.toContain('PIT_ICON');
    expect(src).not.toContain('pitHeaderIconBtn');
    expect(src).not.toContain('getPitHomeBadgeLabel');
    // …but the attention computation survives and is handed to HouseWorld so
    // the physical pit entrance below the house can glow instead.
    expect(src).toContain('pitNeedsAttention={pitNeedsAttention}');
    expect(src).toContain('pendingHarvest && pendingHarvest.pendingBatches > 0) || pitPhaseReady');
  });

  test('PLAY lives in a bottom-center dock, not the header', () => {
    const dockStart = src.indexOf('styles.playDock');
    expect(dockStart).toBeGreaterThan(-1);
    // The dock's JSX block carries the primary action + a11y contract.
    const dockBlock = src.slice(dockStart, dockStart + 1500);
    expect(dockBlock).toContain('onPlayPuzzle');
    expect(dockBlock).toContain('accessibilityLabel="Play puzzle"');
    expect(dockBlock).toContain('accessibilityRole="button"');
    // The old in-header flexible PLAY wrapper is gone.
    expect(src).not.toContain('playButtonWrap');
  });

  test('☰ utility menu is visible post-tutorial (light mode no longer hides it)', () => {
    const menuIdx = src.indexOf('Open utility menu');
    expect(menuIdx).toBeGreaterThan(headerRowStart);
    const headerBlock = src.slice(headerRowStart, menuIdx);
    // The right cluster (and thus ☰) is gated on onboarding only — the
    // post-tutorial light mode must NOT hide the menu, or Settings becomes
    // unreachable from home right after the tutorial.
    expect(headerBlock).toContain('{!isOnboarding && (');
    expect(headerBlock).not.toContain('isPostTutorialLightMode');
  });
});
