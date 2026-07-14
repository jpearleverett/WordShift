/**
 * The one-time mandatory first-harvest gate uses its OWN seen flag, decoupled
 * from the legacy pit-harvest-intro flag. Regression guard: the old passive
 * puzzle-8 Fox intro (shipped in earlier builds) set
 * `wordshift_pit_harvest_intro_seen` on many existing saves; if the new gate
 * read that key it would silently never fire for those players. This pins that
 * the new flag is independent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import {
  hasSeenMandatoryHarvest,
  markMandatoryHarvestSeen,
  hasSeenHarvestHomeIntro,
  markHarvestHomeIntroSeen,
  clearProgress,
} from '../services/amberCurrency';
import {
  getHarvestHomeIntroLines,
  getHarvestNudgeLine,
  getMandatoryHarvestPitIntroLines,
  getSkipConfirmText,
  getSkipConfirmStayLabel,
  getSkipConfirmLeaveLabel,
} from '../services/phaseNarrative';
import { DialoguePhase } from '../types/homeWorld';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
});

describe('mandatory first-harvest gate seen flag', () => {
  test('round-trips and is one-time', async () => {
    expect(await hasSeenMandatoryHarvest()).toBe(false);
    await markMandatoryHarvestSeen();
    expect(await hasSeenMandatoryHarvest()).toBe(true);
  });

  test('is NOT suppressed by the legacy pit-harvest-intro flag', async () => {
    // Simulate an existing save that saw the old passive puzzle-8 Fox intro.
    await AsyncStorage.setItem('wordshift_pit_harvest_intro_seen', 'true');
    // The new gate must still fire (its own flag is unset).
    expect(await hasSeenMandatoryHarvest()).toBe(false);
  });

  test('marking the new flag does not write the legacy key', async () => {
    await markMandatoryHarvestSeen();
    expect(await AsyncStorage.getItem('wordshift_mandatory_harvest_seen')).toBe('true');
    expect(await AsyncStorage.getItem('wordshift_pit_harvest_intro_seen')).toBeNull();
  });
});

describe('harvest home-intro safety-net flag', () => {
  test('round-trips independently of the learned flag', async () => {
    expect(await hasSeenHarvestHomeIntro()).toBe(false);
    await markHarvestHomeIntroSeen();
    expect(await hasSeenHarvestHomeIntro()).toBe(true);
    // Dismissing the home explanation does NOT count as learning the pit —
    // only a real manual offer sets the learned flag.
    expect(await hasSeenMandatoryHarvest()).toBe(false);
  });

  test('Reset All clears both harvest-gate flags', async () => {
    await markMandatoryHarvestSeen();
    await markHarvestHomeIntroSeen();
    await clearProgress();
    expect(await hasSeenMandatoryHarvest()).toBe(false);
    expect(await hasSeenHarvestHomeIntro()).toBe(false);
  });
});

describe('harvest gate narrative copy', () => {
  const phases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test('home intro lines exist for every phase, without em dashes', () => {
    for (const phase of phases) {
      const lines = getHarvestHomeIntroLines(phase);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(10);
        expect(line).not.toMatch(/[—–]/);
      }
    }
  });

  test('pit-arrival intro lines exist for every phase, teach the tap, without em dashes', () => {
    for (const phase of phases) {
      const lines = getMandatoryHarvestPitIntroLines(phase);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(10);
        expect(line).not.toMatch(/[—–]/);
      }
      // The beat must always contain the actual instruction: tap the words.
      expect(lines.some(l => /tap/i.test(l))).toBe(true);
    }
  });

  test('heavy-pit nudge line includes the pending amber and has no em dashes', () => {
    for (const phase of phases) {
      const lines = getHarvestNudgeLine(phase, 240);
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('240');
      expect(lines[0]).not.toMatch(/[—–]/);
    }
  });

  test('skip confirmation copy is present and em-dash free', () => {
    for (const s of [getSkipConfirmText(), getSkipConfirmStayLabel(), getSkipConfirmLeaveLabel()]) {
      expect(s.length).toBeGreaterThan(3);
      expect(s).not.toMatch(/[—–]/);
    }
  });
});

describe('heavy-pit nudge session guard (source scan)', () => {
  // HomeScreen unmounts on every navigation, so a component-level useRef made
  // the "once per app session" nudge re-fire on EVERY home arrival — an engaged
  // player with a heavy pit dismissed the same Fox card many times a day. The
  // guard must live at module scope (survives remounts, resets on relaunch).
  // HomeScreen pulls the full native surface, so following the questPill /
  // appIntegration precedent this is pinned by source scan.
  const HOME_SCREEN = require('fs').readFileSync(
    require('path').resolve(__dirname, '../components/home/HomeScreen.tsx'),
    'utf8'
  );

  test('the guard is a module-scoped variable, not a component ref', () => {
    expect(HOME_SCREEN).toMatch(/^let heavyHarvestNudgeShownThisSession = false;$/m);
    expect(HOME_SCREEN).not.toContain('heavyHarvestNudgeShownRef');
  });

  test('the nudge effect checks and sets the module guard', () => {
    expect(HOME_SCREEN).toContain('if (heavyHarvestNudgeShownThisSession) return;');
    expect(HOME_SCREEN).toContain('heavyHarvestNudgeShownThisSession = true;');
  });

  test('the amber threshold and learned-pit gates stay in place', () => {
    expect(HOME_SCREEN).toMatch(
      /pendingHarvest\.pendingAmber < HARVEST_NUDGE_MIN_AMBER/
    );
    // Nudge only after the pit is learned (teaching belongs to the gate/intro).
    const nudgeEffect = HOME_SCREEN.slice(
      HOME_SCREEN.indexOf('if (heavyHarvestNudgeShownThisSession) return;'),
      HOME_SCREEN.indexOf("setIntroContext('harvest_heavy_nudge')")
    );
    expect(nudgeEffect).toContain('hasSeenMandatoryHarvest()');
  });
});
