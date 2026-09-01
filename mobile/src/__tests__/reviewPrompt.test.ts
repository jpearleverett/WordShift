jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Native store-review module — mocked so maybePromptReview is deterministic in
// Node. Per-test behavior is set by reassigning these functions.
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

import {
  shouldPromptReview,
  maybePromptReview,
  REVIEW_MAX_PHASE,
  REVIEW_MIN_PUZZLES,
  clearReviewPrompt,
  _clearReviewPromptCache,
} from '../services/reviewPrompt';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const StoreReview = require('expo-store-review');

beforeEach(async () => {
  AsyncStorage.clear();
  await clearReviewPrompt();
  _clearReviewPromptCache();
  // Default: native sheet available and the prompt resolves cleanly.
  StoreReview.isAvailableAsync = jest.fn().mockResolvedValue(true);
  StoreReview.requestReview = jest.fn().mockResolvedValue(undefined);
});

const base = {
  phase: 0,
  stars: 3,
  puzzlesSolved: REVIEW_MIN_PUZZLES + 5,
  alreadyPrompted: false,
};

describe('shouldPromptReview', () => {
  test('prompts on a Phase 0-1 perfect win past the settle-in threshold', () => {
    expect(shouldPromptReview({ ...base, phase: 0 })).toBe(true);
    expect(shouldPromptReview({ ...base, phase: 1 })).toBe(true);
  });

  test('HARD-suppresses from Phase 2 onward (the reveal)', () => {
    for (let p = REVIEW_MAX_PHASE; p <= 5; p++) {
      expect(shouldPromptReview({ ...base, phase: p })).toBe(false);
    }
  });

  test('only on a perfect (3-star) delight peak', () => {
    expect(shouldPromptReview({ ...base, stars: 2 })).toBe(false);
    expect(shouldPromptReview({ ...base, stars: 1 })).toBe(false);
  });

  test('not before the settle-in threshold', () => {
    expect(shouldPromptReview({ ...base, puzzlesSolved: REVIEW_MIN_PUZZLES - 1 })).toBe(false);
  });

  test('never twice', () => {
    expect(shouldPromptReview({ ...base, alreadyPrompted: true })).toBe(false);
  });

  test('never during onboarding or the daily', () => {
    expect(shouldPromptReview({ ...base, isOnboarding: true })).toBe(false);
    expect(shouldPromptReview({ ...base, isDaily: true })).toBe(false);
  });
});

describe('maybePromptReview', () => {
  test('fires once (native prompt actually called), then never again', async () => {
    expect(await maybePromptReview({ phase: 0, stars: 3, puzzlesSolved: 20 })).toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    // Second eligible call is suppressed by the persisted one-time flag.
    expect(await maybePromptReview({ phase: 0, stars: 3, puzzlesSolved: 25 })).toBe(false);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  test('does not fire (or consume the one-time flag) at Phase 2+', async () => {
    expect(await maybePromptReview({ phase: 2, stars: 3, puzzlesSolved: 20 })).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    // The flag is untouched, so a later legit Phase 0-1 peak can still prompt.
    expect(await maybePromptReview({ phase: 1, stars: 3, puzzlesSolved: 20 })).toBe(true);
  });

  test('does not consume the one-time flag when the OS review sheet is unavailable', async () => {
    StoreReview.isAvailableAsync = jest.fn().mockResolvedValue(false);
    expect(await maybePromptReview({ phase: 0, stars: 3, puzzlesSolved: 20 })).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    // Flag survived: once the sheet is available, a later peak still prompts.
    StoreReview.isAvailableAsync = jest.fn().mockResolvedValue(true);
    expect(await maybePromptReview({ phase: 1, stars: 3, puzzlesSolved: 21 })).toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  test('does not consume the flag when the native module lacks requestReview', async () => {
    StoreReview.requestReview = undefined;
    expect(await maybePromptReview({ phase: 1, stars: 3, puzzlesSolved: 20 })).toBe(false);
    // Flag survived: a build that later ships the module can still prompt.
    StoreReview.requestReview = jest.fn().mockResolvedValue(undefined);
    expect(await maybePromptReview({ phase: 1, stars: 3, puzzlesSolved: 21 })).toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// The Settings "Rate WordShift" row is the PASSIVE complement to this policy:
// a player-initiated Play Store link only. It must never route through the
// review-prompt machinery (which asks) — a passive link cannot review-bomb,
// so it is allowed at every phase while maybePromptReview stays Phase 0-1.
// ============================================================================
describe('Settings Rate WordShift row (source pin)', () => {
  const fs = require('fs');
  const path = require('path');
  const SETTINGS_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'SettingsScreen.tsx'),
    'utf8'
  );

  test('renders a passive Play Store link in ABOUT', () => {
    expect(SETTINGS_SRC).toMatch(/accessibilityLabel="Rate WordShift"/);
    expect(SETTINGS_SRC).toMatch(/openLink\(PLAY_STORE_URL\)/);
  });

  test('never invokes the prompting review sheet from Settings', () => {
    expect(SETTINGS_SRC).not.toMatch(/maybePromptReview|requestReview|expo-store-review/);
  });
});
