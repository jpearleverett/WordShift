jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  shouldPromptReview,
  maybePromptReview,
  REVIEW_MAX_PHASE,
  REVIEW_MIN_PUZZLES,
  clearReviewPrompt,
  _clearReviewPromptCache,
} from '../services/reviewPrompt';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

beforeEach(async () => {
  AsyncStorage.clear();
  await clearReviewPrompt();
  _clearReviewPromptCache();
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
  test('fires once, then never again (persisted)', async () => {
    expect(await maybePromptReview({ phase: 0, stars: 3, puzzlesSolved: 20 })).toBe(true);
    // Second eligible call is suppressed by the persisted one-time flag.
    expect(await maybePromptReview({ phase: 0, stars: 3, puzzlesSolved: 25 })).toBe(false);
  });

  test('does not fire (or consume the one-time flag) at Phase 2+', async () => {
    expect(await maybePromptReview({ phase: 2, stars: 3, puzzlesSolved: 20 })).toBe(false);
    // The flag is untouched, so a later legit Phase 0-1 peak can still prompt.
    expect(await maybePromptReview({ phase: 1, stars: 3, puzzlesSolved: 20 })).toBe(true);
  });
});
