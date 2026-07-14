/**
 * Onboarding pit-offering contract (FTUE integrity).
 *
 * During the pit_offering step the FoxGuide says "tap each glowing word" and
 * the step advances through the player's own taps. A previous auto-offer
 * effect fired handleHarvestAll ~900ms in, contradicting the instruction and
 * stealing the player's first meaningful pit interaction. These tests pin the
 * fixed behavior via the exported pure decisions in OfferingPitScreen.tsx:
 *
 *  - isPitWordTapEnabled: the tap-to-devour path is live during pit_offering
 *    (and inert during earlier onboarding beats like pit_intro).
 *  - getPitOnboardingOfferAction: completion fires only after the player
 *    drains pendingBatches to 0; the 4s fallback covers reaching the step
 *    with nothing offerable (empty batch, or relaunch after offering).
 *  - createPitOnboardingStallRescue: the stalled-pending safety net — words
 *    pending but NO devour for a generous window (~30s) auto-offers the
 *    remainder so a player whose taps never register (or who taps
 *    some-but-not-all chips) can never be soft-locked. Every successful
 *    devour resets the clock, so the manual flow stays primary and an
 *    actively-tapping player is never preempted.
 *  - A source tripwire ensures the near-instant auto-offer machinery doesn't
 *    reappear (the ONLY auto-offer allowed is the generous stall rescue).
 */

// OfferingPitScreen imports react-native + side-effectful services at module
// scope; stub them so the pure helpers can be imported in the Node test env
// (component-test convention — string tags, no renderer).
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Image: 'Image',
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

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true, soundEnabled: false, hapticsEnabled: false }),
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
}));
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../services/deviceTier', () => ({
  getDeviceTier: () => 'high',
  shouldSimplifyAnimations: () => true,
}));
jest.mock('../services/wordHarvest', () => ({
  getHarvestState: jest.fn(async () => ({ pendingBatches: [] })),
  offerBatch: jest.fn(),
  offerAllBatches: jest.fn(),
}));
jest.mock('../services/amberCurrency', () => ({
  confirmPhaseTransition: jest.fn(),
  spendAmber: jest.fn(),
  awardBonusAmber: jest.fn(),
}));
jest.mock('../services/tending', () => ({
  loadTendingState: jest.fn(async () => ({ level: 0 })),
  getNextTendingInfo: jest.fn(),
  applyTend: jest.fn(),
  isTendingAvailable: () => false,
  getTendingIntensity: () => 0,
}));
jest.mock('../services/weeklyQuests', () => ({
  updateQuestProgress: jest.fn(),
}));

import {
  isPitWordTapEnabled,
  getPitOnboardingOfferAction,
  PitOnboardingOfferAction,
  createPitOnboardingStallRescue,
  PIT_ONBOARDING_STALL_RESCUE_MS,
  shouldShowHarvestPitIntro,
} from '../components/OfferingPitScreen';
import * as fs from 'fs';
import * as path from 'path';

describe('isPitWordTapEnabled (tap-to-devour gating)', () => {
  test('taps are live outside onboarding regardless of step', () => {
    expect(isPitWordTapEnabled(false, undefined)).toBe(true);
    expect(isPitWordTapEnabled(undefined, undefined)).toBe(true);
    expect(isPitWordTapEnabled(false, 'pit_intro')).toBe(true);
  });

  test('taps are live during pit_offering — the player must be able to offer each word', () => {
    // The FoxGuide instructs "tap each glowing word"; suppressing taps here
    // would soft-lock the step now that there is no auto-offer.
    expect(isPitWordTapEnabled(true, 'pit_offering')).toBe(true);
  });

  test('taps are inert during earlier onboarding beats (pit_intro)', () => {
    expect(isPitWordTapEnabled(true, 'pit_intro')).toBe(false);
    expect(isPitWordTapEnabled(true, 'going_to_pit')).toBe(false);
    expect(isPitWordTapEnabled(true, undefined)).toBe(false);
  });
});

describe('getPitOnboardingOfferAction (player-driven completion)', () => {
  test('resets tracking outside the pit_offering step', () => {
    expect(getPitOnboardingOfferAction('pit_intro', true, 0)).toBe('reset');
    expect(getPitOnboardingOfferAction('complete', false, 3)).toBe('reset');
    expect(getPitOnboardingOfferAction(undefined, true, null)).toBe('reset');
  });

  test('waits while harvest state has not loaded yet', () => {
    expect(getPitOnboardingOfferAction('pit_offering', false, null)).toBe('wait');
  });

  test('tracks pending while words remain — never completes early', () => {
    expect(getPitOnboardingOfferAction('pit_offering', false, 1)).toBe('track_pending');
    // Even after tracking, remaining words keep the step open.
    expect(getPitOnboardingOfferAction('pit_offering', true, 1)).toBe('track_pending');
  });

  test('completes only when the player has drained pending batches to zero', () => {
    expect(getPitOnboardingOfferAction('pit_offering', true, 0)).toBe('complete');
  });

  test('arms the soft-lock fallback when nothing was ever pending (empty batch / relaunch after offering)', () => {
    expect(getPitOnboardingOfferAction('pit_offering', false, 0)).toBe('arm_fallback');
  });

  test('full player-driven sequence: wait → track → complete', () => {
    // Mirrors the effect's ref handling: hadPending flips true on
    // 'track_pending' and false on 'reset'.
    let hadPending = false;
    const step = (onboardingStep: string | undefined, count: number | null): PitOnboardingOfferAction => {
      const action = getPitOnboardingOfferAction(onboardingStep, hadPending, count);
      if (action === 'track_pending') hadPending = true;
      if (action === 'reset') hadPending = false;
      return action;
    };

    // Arrive at the pit during pit_intro — no tracking yet.
    expect(step('pit_intro', 1)).toBe('reset');
    // Fox finishes explaining; step advances. Harvest still loading.
    expect(step('pit_offering', null)).toBe('wait');
    // Batch loads with the tutorial words.
    expect(step('pit_offering', 1)).toBe('track_pending');
    // Player taps the last word; the batch finalizes and pending drains to 0.
    expect(step('pit_offering', 0)).toBe('complete');
    // Step advances home — tracking resets for any future run.
    expect(step('returning_home', 0)).toBe('reset');
  });

  test('relaunch mid-step with words still pending stays tappable and completable', () => {
    // Fresh mount after a kill: hadPending starts false, batch is still
    // pending (batches only finalize once ALL their words are devoured).
    let hadPending = false;
    const first = getPitOnboardingOfferAction('pit_offering', hadPending, 1);
    expect(first).toBe('track_pending');
    hadPending = true;
    expect(getPitOnboardingOfferAction('pit_offering', hadPending, 0)).toBe('complete');
  });
});

describe('createPitOnboardingStallRescue (stalled-pending safety net)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('the rescue window is generous — never a near-instant auto-offer', () => {
    // The old defect was an auto-offer ~900ms in. The stall rescue must stay
    // slow enough that a player reading Fox's prompt and tapping at their own
    // pace never sees it.
    expect(PIT_ONBOARDING_STALL_RESCUE_MS).toBeGreaterThanOrEqual(15000);
  });

  test('fires only after the full stall window with no devour', () => {
    const onStall = jest.fn();
    const rescue = createPitOnboardingStallRescue(onStall);
    rescue.arm();
    jest.advanceTimersByTime(PIT_ONBOARDING_STALL_RESCUE_MS - 1);
    expect(onStall).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  test('every player devour resets the clock — an actively-tapping player is never preempted', () => {
    const onStall = jest.fn();
    const rescue = createPitOnboardingStallRescue(onStall);
    rescue.arm();
    // Player keeps devouring words just inside the window, repeatedly.
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(PIT_ONBOARDING_STALL_RESCUE_MS - 1000);
      rescue.arm(); // successful devour → handleWordDevoured re-arms
      expect(onStall).not.toHaveBeenCalled();
    }
    // Then they stall (tapped some-but-not-all chips) — the rescue fires once.
    jest.advanceTimersByTime(PIT_ONBOARDING_STALL_RESCUE_MS);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  test('fires at most once per arm (no repeat auto-offers)', () => {
    const onStall = jest.fn();
    const rescue = createPitOnboardingStallRescue(onStall);
    rescue.arm();
    jest.advanceTimersByTime(PIT_ONBOARDING_STALL_RESCUE_MS * 3);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  test('cancel (step change / unmount / effect cleanup) prevents the rescue', () => {
    const onStall = jest.fn();
    const rescue = createPitOnboardingStallRescue(onStall);
    rescue.arm();
    rescue.cancel();
    jest.advanceTimersByTime(PIT_ONBOARDING_STALL_RESCUE_MS * 2);
    expect(onStall).not.toHaveBeenCalled();
    // cancel is idempotent and safe when nothing is armed
    rescue.cancel();
  });

  test('supports a custom timeout for callers/tests', () => {
    const onStall = jest.fn();
    const rescue = createPitOnboardingStallRescue(onStall, 5000);
    rescue.arm();
    jest.advanceTimersByTime(4999);
    expect(onStall).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
  });
});

describe('auto-offer removal tripwire', () => {
  test('OfferingPitScreen contains no near-instant onboarding auto-offer machinery', () => {
    // Regression guard for the FTUE defect: an effect that invoked
    // handleHarvestAll on the player's behalf ~900ms into pit_offering. The
    // step is completed by the player's own taps; the ONLY auto-offer is the
    // generous stalled-pending rescue (createPitOnboardingStallRescue),
    // which arms for PIT_ONBOARDING_STALL_RESCUE_MS and resets on every
    // successful devour.
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'OfferingPitScreen.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/onboardingAutoOffer/);
    expect(src).not.toMatch(/handleHarvestAllRef/);
  });
});

describe('pit viewport containment', () => {
  test('the full-screen pit clips stale absolute geometry after a web viewport resize', () => {
    // Pit art/particles use module-level screen geometry. On web, DevTools or a
    // window resize can make that geometry wider than the live viewport; the
    // full-screen host must contain it so the document cannot scroll sideways
    // and carry the onboarding FoxGuide off the left edge.
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'OfferingPitScreen.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /container:\s*\{\s*flex:\s*1,\s*overflow:\s*'hidden'\s*\}/,
    );
  });
});

describe('shouldShowHarvestPitIntro (first-manual-harvest Fox beat)', () => {
  test('fires on arrival with unlearned harvest and words waiting (past auto-collect)', () => {
    expect(shouldShowHarvestPitIntro(false, null, 2, false, true)).toBe(true);
    expect(shouldShowHarvestPitIntro(undefined, null, 1, false, true)).toBe(true);
  });

  test('never fires during onboarding (the onboarding FoxGuide owns the pit)', () => {
    expect(shouldShowHarvestPitIntro(true, null, 2, false, true)).toBe(false);
  });

  test('yields to a pending phase-transition ceremony', () => {
    expect(shouldShowHarvestPitIntro(false, 1 as any, 2, false, true)).toBe(false);
  });

  test('needs words to point at (no batches, or state not loaded yet)', () => {
    expect(shouldShowHarvestPitIntro(false, null, 0, false, true)).toBe(false);
    expect(shouldShowHarvestPitIntro(false, null, null, false, true)).toBe(false);
  });

  test('goes quiet once a real offer has marked the harvest learned', () => {
    expect(shouldShowHarvestPitIntro(false, null, 2, true, true)).toBe(false);
  });

  test('never fires inside the auto-collect window — even with words waiting', () => {
    // The reported bug: onboarding words left un-offered after a skip linger as
    // a pending batch; returning to the pit at 0 real puzzles must NOT trigger
    // "now harvest them yourself" while the house is still carrying words down.
    expect(shouldShowHarvestPitIntro(false, null, 3, false, false)).toBe(false);
  });
});
