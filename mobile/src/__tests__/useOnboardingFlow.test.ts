/**
 * Tests for the onboarding state machine's resume-resilience contract.
 *
 * `normalizeResumeStep` is the guard that prevents a brand-new player from
 * being stranded if the app is killed mid-onboarding: transient steps (which
 * only exist during a setTimeout transition and have no owning screen on
 * relaunch) must snap forward to a stable, resumable target. A regression here
 * re-opens the first-session soft-lock, so it is pinned directly.
 */
// useOnboardingFlow transitively pulls in RN-backed modules (Tutorial component,
// expo-haptics) that don't load in the Node test env. normalizeResumeStep is a
// pure function, so stub those side-effectful deps to import it cleanly.
jest.mock('../components/Tutorial', () => ({
  hasTutorialCompleted: jest.fn(async () => false),
  markTutorialCompleted: jest.fn(async () => {}),
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));

import { normalizeResumeStep } from '../hooks/useOnboardingFlow';
import { ONBOARDING_FOX_LINES, OnboardingStep } from '../services/onboarding';

const ALL_STEPS: OnboardingStep[] = [
  'not_started', 'home_empty', 'fox_invited', 'going_to_puzzle',
  'puzzle_tutorial', 'puzzle_complete', 'going_to_pit', 'pit_intro',
  'pit_offering', 'returning_home', 'unlock_explained', 'complete',
];

// Transient steps that exist only for a transition window and must resume forward.
const TRANSIENT_TO_STABLE: Record<string, OnboardingStep> = {
  going_to_puzzle: 'puzzle_tutorial',
  puzzle_complete: 'puzzle_tutorial',
  going_to_pit: 'pit_intro',
  returning_home: 'unlock_explained',
};

describe('normalizeResumeStep (first-session resume resilience)', () => {
  test('every transient step snaps forward to its stable resumable target', () => {
    for (const [from, to] of Object.entries(TRANSIENT_TO_STABLE)) {
      expect(normalizeResumeStep(from as OnboardingStep)).toBe(to);
    }
  });

  test('stable steps are returned unchanged', () => {
    const stable = ALL_STEPS.filter(s => !(s in TRANSIENT_TO_STABLE));
    for (const s of stable) {
      expect(normalizeResumeStep(s)).toBe(s);
    }
  });

  test('normalization is a fixed point — a resumed step never maps to a transient step', () => {
    for (const s of ALL_STEPS) {
      const once = normalizeResumeStep(s);
      // Re-normalizing the target must be stable (no transient target leaks through).
      expect(normalizeResumeStep(once)).toBe(once);
      expect(once in TRANSIENT_TO_STABLE).toBe(false);
    }
  });
});

describe('onboarding guided-step copy (no blank Fox guide on resume)', () => {
  // The steps a player can actually resume onto that drive a FoxGuide must have
  // non-empty copy, or the resume lands on a guide with nothing to say.
  // (puzzle_tutorial keys into the *_intro line set; pit_offering into *_complete.)
  const resumeCopyKeys = [
    'home_empty',
    'fox_invited',
    'puzzle_tutorial_intro',
    'pit_intro',
    'pit_offering_complete',
    'unlock_explained',
  ];

  test('each guided resume step has at least one non-empty line', () => {
    for (const key of resumeCopyKeys) {
      const lines = ONBOARDING_FOX_LINES[key];
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join('').trim().length).toBeGreaterThan(0);
    }
  });

  test('the reinforcement line wired after the first move exists', () => {
    // App.tsx renders puzzle_tutorial_valid_move once after the first guided
    // move — guard that the copy it references is present.
    const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_valid_move;
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].trim().length).toBeGreaterThan(0);
  });
});
