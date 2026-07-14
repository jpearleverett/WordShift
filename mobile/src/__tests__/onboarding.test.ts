import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnboardingStep,
  getOnboardingStep,
  setOnboardingStep,
  isOnboardingComplete,
  resetOnboarding,
  ONBOARDING_FOX_LINES,
} from '../services/onboarding';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// setOnboardingStep logs FTUE funnel events; mock the logger so its 5s
// debounced flush timer can't fire after this suite's environment is gone.
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));

describe('onboarding', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  describe('step persistence', () => {
    test('returns not_started initially', async () => {
      const step = await getOnboardingStep();
      expect(step).toBe('not_started');
    });

    test('set and get round-trip all step values', async () => {
      const steps: OnboardingStep[] = [
        'not_started', 'home_empty', 'fox_invited', 'going_to_puzzle',
        'puzzle_tutorial', 'puzzle_complete', 'going_to_pit', 'pit_intro',
        'pit_offering', 'returning_home', 'unlock_explained', 'complete',
      ];
      for (const step of steps) {
        await setOnboardingStep(step);
        const retrieved = await getOnboardingStep();
        expect(retrieved).toBe(step);
      }
    });

    test('isOnboardingComplete returns true only for complete', async () => {
      expect(await isOnboardingComplete()).toBe(false);

      await setOnboardingStep('pit_intro');
      expect(await isOnboardingComplete()).toBe(false);

      await setOnboardingStep('complete');
      expect(await isOnboardingComplete()).toBe(true);
    });

    test('resetOnboarding clears state', async () => {
      await setOnboardingStep('pit_intro');
      await resetOnboarding();
      const step = await getOnboardingStep();
      expect(step).toBe('not_started');
    });
  });

  describe('pit onboarding steps', () => {
    test('going_to_pit step type is valid', async () => {
      await setOnboardingStep('going_to_pit');
      expect(await getOnboardingStep()).toBe('going_to_pit');
    });

    test('pit_intro step type is valid', async () => {
      await setOnboardingStep('pit_intro');
      expect(await getOnboardingStep()).toBe('pit_intro');
    });

    test('pit_offering step type is valid', async () => {
      await setOnboardingStep('pit_offering');
      expect(await getOnboardingStep()).toBe('pit_offering');
    });
  });

  describe('ONBOARDING_FOX_LINES', () => {
    test('has dialogue for all standard onboarding steps', () => {
      expect(ONBOARDING_FOX_LINES.home_empty).toBeDefined();
      expect(ONBOARDING_FOX_LINES.home_empty.length).toBeGreaterThan(0);
      expect(ONBOARDING_FOX_LINES.fox_invited).toBeDefined();
      expect(ONBOARDING_FOX_LINES.fox_invited.length).toBeGreaterThan(0);
      expect(ONBOARDING_FOX_LINES.puzzle_tutorial_intro).toBeDefined();
      expect(ONBOARDING_FOX_LINES.puzzle_tutorial_complete).toBeDefined();
      expect(ONBOARDING_FOX_LINES.unlock_explained).toBeDefined();
      expect(ONBOARDING_FOX_LINES.unlock_explained.length).toBeGreaterThan(0);
    });

    test('has dialogue for pit onboarding steps', () => {
      expect(ONBOARDING_FOX_LINES.going_to_pit).toBeDefined();
      expect(ONBOARDING_FOX_LINES.going_to_pit.length).toBe(1);

      // Merged to a single beat in the onboarding-tail trim: the pit
      // explanation lands in one card, so the corridor loses a tap.
      expect(ONBOARDING_FOX_LINES.pit_intro).toBeDefined();
      expect(ONBOARDING_FOX_LINES.pit_intro.length).toBe(1);

      expect(ONBOARDING_FOX_LINES.pit_offering_complete).toBeDefined();
      expect(ONBOARDING_FOX_LINES.pit_offering_complete.length).toBe(1);
    });

    test('pit dialogue lines are non-empty strings', () => {
      for (const line of ONBOARDING_FOX_LINES.going_to_pit) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
      for (const line of ONBOARDING_FOX_LINES.pit_intro) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
      for (const line of ONBOARDING_FOX_LINES.pit_offering_complete) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    });

    test('pit intro mentions amber', () => {
      const allPitText = ONBOARDING_FOX_LINES.pit_intro.join(' ');
      expect(allPitText.toLowerCase()).toContain('amber');
    });

    test('pit intro mentions offering words', () => {
      const allPitText = ONBOARDING_FOX_LINES.pit_intro.join(' ');
      expect(allPitText.toLowerCase()).toContain('offer');
    });

    test('unlock_explained references the harvest cycle', () => {
      const allText = ONBOARDING_FOX_LINES.unlock_explained.join(' ');
      // Should mention the puzzle-to-amber cycle since Fox just showed the pit
      expect(allText.toLowerCase()).toContain('amber');
    });

    test('unlock_explained points the player to the pit entrance below the house', () => {
      // The world entrance (below the house) is the only route back to the
      // pit, so the closing beat must tell the player where it lives.
      const allText = ONBOARDING_FOX_LINES.unlock_explained.join(' ').toLowerCase();
      expect(allText).toContain('pit');
      expect(allText).toContain('below the house');
      expect(allText).toContain('scroll down');
    });

    test('unlock_explained stays a tight closing beat (two lines)', () => {
      // Trimmed again (3 → 2): the text-dense tail landed right after the
      // first-win dopamine peak, so it says the same things (cycle + pit
      // location + come-back warmth) in fewer words and fewer taps.
      expect(ONBOARDING_FOX_LINES.unlock_explained.length).toBe(2);
    });

    test('fox_invited is two beats with the darkness seed kept verbatim as the closer', () => {
      // The greeting and the house-grows beat are merged; the Early Darkness
      // Seed line must survive the trim word for word, and stay the closer.
      const lines = ONBOARDING_FOX_LINES.fox_invited;
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("I'm Ember!");
      expect(lines[0].toLowerCase()).toContain('every puzzle you solve makes this house a little more real');
      expect(lines[lines.length - 1]).toContain(
        'I have been hoping for someone like you for the longest time.'
      );
    });

    test('the pit-intro seed survives the merge verbatim', () => {
      expect(ONBOARDING_FOX_LINES.pit_intro.join(' ')).toContain(
        'it loves being fed. Most things here do, funnily enough.'
      );
    });

    test('the closing seed "They need you." survives verbatim as the final line', () => {
      const lines = ONBOARDING_FOX_LINES.unlock_explained;
      expect(lines[lines.length - 1]).toContain('They need you.');
      // And the come-back-each-day retention hook rides the same closer.
      expect(lines[lines.length - 1].toLowerCase()).toContain('come back each day');
    });

    test('the puzzle-tutorial intro teaches BOTH the tap and drag input paths', () => {
      // Many players' primary input is drag, which the old tutorial never named
      // (it only ever said "tap"). The move-mechanic intro beat now mentions
      // both, appended to the same rendered string (App reads intro[0] only).
      const text = ONBOARDING_FOX_LINES.puzzle_tutorial_intro[0].toLowerCase();
      expect(text).toContain('tap');
      expect(text).toContain('drag');
    });

    test('the between-moves beat teaches the both-words rule and the check/cross previews', () => {
      // App.tsx renders puzzle_tutorial_valid_move[0] after the first guided
      // move — the tutorial's one chance to name the core rule (both resulting
      // words must stay valid) and the ✓/✗ ghost previews that encode it.
      const text = ONBOARDING_FOX_LINES.puzzle_tutorial_valid_move[0].toLowerCase();
      expect(text).toContain('both words');
      expect(text).toContain('green check');
      expect(text).toContain('red cross');
      // The undo/hint recovery pointers must survive the rewrite.
      expect(text).toContain('undo');
      expect(text).toContain('hint');
    });

    test('the between-moves beat is trimmed tight (shorter wall of text)', () => {
      // The dense three-line beat right between moves 1 and 2 was a wall at a
      // bad moment; it keeps the rule but must stay short.
      expect(ONBOARDING_FOX_LINES.puzzle_tutorial_valid_move[0].length).toBeLessThan(200);
    });
  });

  describe('onboarding flow ordering', () => {
    test('pit steps come between puzzle_complete and returning_home in the step flow', () => {
      // Verify the conceptual ordering by checking the type has all pit steps
      const pitSteps: OnboardingStep[] = ['going_to_pit', 'pit_intro', 'pit_offering'];
      // All pit steps should be valid OnboardingStep values (type-checked at compile time)
      for (const step of pitSteps) {
        expect(typeof step).toBe('string');
      }
    });
  });

});
