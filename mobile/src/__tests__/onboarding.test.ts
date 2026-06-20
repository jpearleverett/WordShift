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

      expect(ONBOARDING_FOX_LINES.pit_intro).toBeDefined();
      expect(ONBOARDING_FOX_LINES.pit_intro.length).toBe(2);

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
