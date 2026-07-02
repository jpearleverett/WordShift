/**
 * Onboarding pit-offering contract (FTUE integrity).
 *
 * During the pit_offering step the FoxGuide says "tap each glowing word" and
 * the step must advance ONLY once the player has devoured every pending word
 * themselves. A previous auto-offer effect fired handleHarvestAll ~900ms in,
 * contradicting the instruction and stealing the player's first meaningful
 * pit interaction. These tests pin the fixed behavior via the exported pure
 * decisions in OfferingPitScreen.tsx:
 *
 *  - isPitWordTapEnabled: the tap-to-devour path is live during pit_offering
 *    (and inert during earlier onboarding beats like pit_intro).
 *  - getPitOnboardingOfferAction: completion fires only after the player
 *    drains pendingBatches to 0; the 4s fallback covers reaching the step
 *    with nothing offerable (empty batch, or relaunch after offering).
 *  - A source tripwire ensures the auto-offer machinery doesn't reappear.
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
jest.mock('../components/monetization/RewardedAdButton', () => ({
  RewardedAdButton: () => null,
}));

import {
  isPitWordTapEnabled,
  getPitOnboardingOfferAction,
  PitOnboardingOfferAction,
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

describe('auto-offer removal tripwire', () => {
  test('OfferingPitScreen contains no onboarding auto-offer machinery', () => {
    // Regression guard for the FTUE defect: an effect that invoked
    // handleHarvestAll on the player's behalf during pit_offering. The step
    // must be completed by the player's own taps.
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'OfferingPitScreen.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/onboardingAutoOffer/);
    expect(src).not.toMatch(/handleHarvestAllRef/);
  });
});
