/**
 * Launch-readiness narrative/FTUE package regressions:
 *  - ftue-2: the preview-graduation card waits one board after a phase
 *    ceremony is acknowledged (ceremonyPlayback deferral) and the first
 *    exit nudge cannot land on the graduation board (EXIT_NUDGE 14, pinned
 *    in monetizationPrompts.test.ts).
 *  - ftue-5: the post-victory home nudge speaks at most once per app session
 *    and draws from a five-line phase-aware pool.
 *  - ftue-6: the dialogue typewriter is quick through Phase 1 and slow from
 *    Phase 2 on; a one-time tap-to-skip hint string exists for every phase.
 *  - ftue-7: the star rule lives in How to Play, and the first sub-3-star
 *    win gets a once-ever receipt naming the cause.
 *  - product-retention-5: the dark-phase win-back rungs read as unsettling
 *    but never as a second-person threat on a lock screen.
 *  - accessibility-devices-5: the rules backdrop is not a focusable button.
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXIT_NUDGE_MIN_PUZZLES, PREVIEW_GRADING_FULL_LIMIT } from '../constants/gameBalance';
import {
  consumePreviewGraduationDeferral,
  createCeremonyPlayback,
  notePhaseCeremonyAcknowledged,
  resetPreviewGraduationDeferral,
  shouldDeferPreviewGraduation,
} from '../services/ceremonyPlayback';
import {
  HOME_NUDGE_MIN_PUZZLES_AWAY,
  resetHomeNudgeSession,
  shouldOfferHomeNudge,
} from '../hooks/useVictoryOrchestration';
import {
  DIALOGUE_REVEAL_CHAR_MS,
  DIALOGUE_REVEAL_CHAR_MS_BRIGHT,
  getDialogueRevealCharMs,
  shouldFrameArrivalResume,
} from '../hooks/useDialogueFlow';
import {
  FIRST_IMPERFECT_STARS_SEEN_KEY,
  consumeFirstImperfectStarsReceipt,
  getArrivalResumeFramingLine,
  getDialogueRevealSkipHint,
  getFirstImperfectStarsMessage,
  getHomescreenNudge,
  getRulesText,
  getWinBackMessage,
  resolveImperfectStarCause,
} from '../services/phaseNarrative';
import { DialoguePhase } from '../types/homeWorld';
import type { PendingCeremony } from '../types/homeWorld';
import type { PhaseTransitionEvent } from '../services/phaseEvents';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
jest.mock('../services/gameAlert', () => ({ showGameAlert: jest.fn() }));
jest.mock('../services/haptics', () => ({
  hapticWarning: jest.fn(), hapticLight: jest.fn(), hapticSelection: jest.fn(),
}));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/uiSound', () => ({ playUiSound: jest.fn() }));
jest.mock('react-native', () => ({
  Animated: {
    Value: class {
      _value: number;
      constructor(v: number) { this._value = v; }
      setValue(v: number) { this._value = v; }
      interpolate() { return 'interpolated'; }
    },
    timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  },
}));

const PHASES: DialoguePhase[] = [0, 1, 2, 3, 4, 5];
const NO_DASHES = /[–—]/;
const NO_CURLY = /[‘’“”]/;
const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('ftue-2: graduation card spacing after a phase ceremony', () => {
  beforeEach(() => resetPreviewGraduationDeferral());

  test('the first exit nudge cannot land on the graduation board exit', () => {
    // Graduation opens on board FULL_LIMIT + 1; the nudge gate must sit past
    // that board's own exit (win FULL_LIMIT + 1).
    // The graduation card can defer to board 14 and the challenge intro lands
    // at 15, so the first exit nudge must clear both.
    expect(EXIT_NUDGE_MIN_PUZZLES).toBeGreaterThan(PREVIEW_GRADING_FULL_LIMIT + 3);
  });

  test('nothing is deferred until a phase ceremony is acknowledged', () => {
    expect(shouldDeferPreviewGraduation()).toBe(false);
    expect(consumePreviewGraduationDeferral()).toBe(false);
  });

  test('an acknowledged phase ceremony defers the card for exactly one board', () => {
    notePhaseCeremonyAcknowledged();
    expect(shouldDeferPreviewGraduation()).toBe(true);
    expect(consumePreviewGraduationDeferral()).toBe(true); // board 13: skipped, beat kept
    expect(consumePreviewGraduationDeferral()).toBe(false); // board 14: the card shows
    expect(shouldDeferPreviewGraduation(true)).toBe(true);
    expect(shouldDeferPreviewGraduation(false)).toBe(false);
  });

  test('completing a PHASE ceremony through the playback arms it; a house ceremony does not', async () => {
    const authored: PhaseTransitionEvent = {
      title: 'A scene', phase: 1, bgColor: '#000', textColor: '#fff', accentColor: '#f00',
      scenes: [{ text: 'A passage.', delay: 0, duration: 100 }],
    };
    const run = async (record: PendingCeremony) => {
      let durable: PendingCeremony[] = [record];
      let current: PhaseTransitionEvent | null = null;
      const playback = createCeremonyPlayback({
        read: async () => durable.map(entry => ({ ...entry })),
        acknowledge: async id => { durable = durable.filter(entry => entry.id !== id); },
        build: async () => authored,
        onEvent: event => { current = event; },
        onWaiting: () => {},
      });
      await playback.refresh();
      await playback.complete(current);
      playback.reset();
    };
    await run({ id: '0:house:4', kind: 'house', phase: 4, cycle: 0 });
    expect(shouldDeferPreviewGraduation()).toBe(false);
    await run({ id: '0:phase:1', kind: 'phase', phase: 1, cycle: 0, previousPhase: 0 });
    expect(shouldDeferPreviewGraduation()).toBe(true);
  });
});

describe('ftue-5: the home nudge is once per session and drawn from a wider pool', () => {
  beforeEach(() => resetHomeNudgeSession());

  test('offers the nudge only after three chained wins and only once per session', () => {
    expect(HOME_NUDGE_MIN_PUZZLES_AWAY).toBe(3);
    expect(shouldOfferHomeNudge(2, false)).toBe(false);
    expect(shouldOfferHomeNudge(3, false)).toBe(true);
    expect(shouldOfferHomeNudge(9, true)).toBe(false);
    // Module-scope default: not shown yet this session.
    expect(shouldOfferHomeNudge(4)).toBe(true);
  });

  test('the hook latches the session guard on the win that shows the nudge', () => {
    const hook = src('hooks/useVictoryOrchestration.ts');
    expect(hook).toMatch(/if \(shouldOfferHomeNudge\(puzzlesSinceHomeVisit\)\) \{/);
    expect(hook).toMatch(/if \(payload\) homeNudgeShownThisSession = true;/);
    expect(hook).not.toMatch(/puzzlesSinceHomeVisit >= 3\)/);
  });

  test('every phase has at least five distinct nudge lines, phase-aware and clean', () => {
    const realRandom = Math.random;
    try {
      for (const phase of PHASES) {
        const lines = new Set<string>();
        for (let k = 0; k < 40; k++) {
          Math.random = () => (k + 0.5) / 40;
          const nudge = getHomescreenNudge(phase, ['fox'], 3);
          expect(nudge).not.toBeNull();
          expect(nudge!.text).not.toMatch(NO_DASHES);
          expect(nudge!.text).not.toMatch(NO_CURLY);
          expect(nudge!.text).not.toContain('{name}');
          lines.add(nudge!.text);
        }
        expect(lines.size).toBeGreaterThanOrEqual(5);
      }
    } finally {
      Math.random = realRandom;
    }
    // Phase 0 stays bright: no dread vocabulary.
    Math.random = () => 0.99;
    try {
      const bright = getHomescreenNudge(0, ['fox'], 3)!.text.toLowerCase();
      expect(bright).not.toMatch(/pattern|keeper|breath|cold/);
    } finally {
      Math.random = realRandom;
    }
  });
});

describe('ftue-6: dialogue reveal cadence and the tap-to-skip hint', () => {
  test('the bright days reveal at 15 ms per character (a 3.0 s page); Phase 2 on keeps 22', () => {
    expect(DIALOGUE_REVEAL_CHAR_MS_BRIGHT).toBe(15);
    expect(DIALOGUE_REVEAL_CHAR_MS).toBe(22);
    expect(getDialogueRevealCharMs(0)).toBe(15);
    expect(getDialogueRevealCharMs(1)).toBe(15);
    for (const phase of [2, 3, 4, 5]) expect(getDialogueRevealCharMs(phase)).toBe(22);
    expect(200 * getDialogueRevealCharMs(0)).toBe(3000);
  });

  test('the reveal effect ticks at the phase-aware cadence', () => {
    const hook = src('hooks/useDialogueFlow.ts');
    expect(hook).toMatch(/const revealCharMs = getDialogueRevealCharMs\(progress\?\.currentPhase \?\? 0\);/);
    expect(hook).toMatch(/\}, revealCharMs\);/);
    expect(hook).toMatch(/revealSkipHint,\n/);
  });

  test('a skip hint exists for every phase, mentions tapping, and is clean', () => {
    for (const phase of PHASES) {
      const hint = getDialogueRevealSkipHint(phase);
      expect(hint.toLowerCase()).toContain('tap');
      expect(hint).not.toMatch(NO_DASHES);
      expect(hint).not.toMatch(NO_CURLY);
    }
  });
});

describe('ftue-7: the star rule is taught', () => {
  test('How to Play carries a phase-aware star rule at every phase, steps stay at four', () => {
    for (const phase of PHASES) {
      const rules = getRulesText(phase);
      expect(rules.steps).toHaveLength(4);
      expect(rules.starRule.toLowerCase()).toContain('star');
      expect(rules.starRule.toLowerCase()).toContain('hint');
      expect(rules.starRule).toContain('Flawless');
      expect(rules.starRule).not.toMatch(NO_DASHES);
      expect(rules.starRule).not.toMatch(NO_CURLY);
    }
    expect(getRulesText(0).starRule).not.toBe(getRulesText(4).starRule);
  });

  test('RulesModal renders the star rule under the steps', () => {
    const modal = src('components/puzzle/RulesModal.tsx');
    expect(modal).toContain('{rules.starRule}');
  });

  test('resolves the cause of a sub-3-star win from the star rule', () => {
    expect(resolveImperfectStarCause(3, 0, 1)).toBeNull();
    expect(resolveImperfectStarCause(3, 0, 0)).toBeNull();
    expect(resolveImperfectStarCause(2, 1, 0)).toBe('hint');
    expect(resolveImperfectStarCause(2, 0, 2)).toBe('slips');
    expect(resolveImperfectStarCause(1, 2, 4)).toBe('both');
    // One slipped drop never costs a star, so it can never be the cause.
    expect(resolveImperfectStarCause(2, 0, 1)).toBeNull();
  });

  test('the receipt names the cause at every phase and stays clean', () => {
    for (const phase of PHASES) {
      const hint = getFirstImperfectStarsMessage(phase, 'hint');
      const slips = getFirstImperfectStarsMessage(phase, 'slips');
      const both = getFirstImperfectStarsMessage(phase, 'both');
      expect(hint.toLowerCase()).toMatch(/hint|guidance/);
      expect(slips.toLowerCase()).toMatch(/slip|falter/);
      expect(new Set([hint, slips, both]).size).toBe(3);
      for (const line of [hint, slips, both]) {
        expect(line).not.toMatch(NO_DASHES);
        expect(line).not.toMatch(NO_CURLY);
        expect(line).not.toMatch(/phase/i);
      }
    }
  });

  test('the receipt fires once ever, and never on a three-star win', async () => {
    await AsyncStorage.clear();
    expect(await consumeFirstImperfectStarsReceipt(0, { stars: 3, hintsUsed: 0, invalidAttempts: 1 })).toBeNull();
    expect(await AsyncStorage.getItem(FIRST_IMPERFECT_STARS_SEEN_KEY)).toBeNull();
    const first = await consumeFirstImperfectStarsReceipt(0, { stars: 2, hintsUsed: 1, invalidAttempts: 0 });
    expect(first).toBe(getFirstImperfectStarsMessage(0, 'hint'));
    expect(await AsyncStorage.getItem(FIRST_IMPERFECT_STARS_SEEN_KEY)).toBe('true');
    expect(await consumeFirstImperfectStarsReceipt(1, { stars: 1, hintsUsed: 0, invalidAttempts: 5 })).toBeNull();
  });
});

describe('product-retention-5: dark-phase win-back copy on a lock screen', () => {
  test('no rung at phases 3-4 carries a second-person threat or an impatient "it"', () => {
    for (const phase of [3, 4]) {
      for (const rung of [1, 2, 3, 4, 5] as const) {
        const msg = getWinBackMessage(phase, rung);
        expect(msg).not.toMatch(/does not like/i);
        expect(msg).not.toMatch(/It is less so/);
        expect(msg).not.toMatch(/leans closer/i);
        expect(msg).not.toMatch(/waits for your hand/i);
        expect(msg).not.toMatch(/wait for you\b/i);
        expect(msg).not.toMatch(NO_DASHES);
        expect(msg).not.toMatch(NO_CURLY);
      }
    }
  });

  test('the pinned openers and the week rung survive the softening', () => {
    expect(getWinBackMessage(3, 1)).toContain('The house is quieter without you');
    expect(getWinBackMessage(4, 1)).toContain('The arrangement is incomplete');
    expect(getWinBackMessage(3, 3).toLowerCase()).toMatch(/week|seven days/);
    expect(getWinBackMessage(4, 3).toLowerCase()).toMatch(/week|seven days/);
  });
});

describe('narrative-2: post-Arrival resume framing decision', () => {
  test('frames only after the Arrival, only pre-arrival material, only once per resident', () => {
    const prior = { hasPriorConversation: true };
    expect(shouldFrameArrivalResume({ arrivalOccurred: true, resumedLinePhase: 3, alreadyFramed: false, ...prior })).toBe(true);
    expect(shouldFrameArrivalResume({ arrivalOccurred: false, resumedLinePhase: 3, alreadyFramed: false, ...prior })).toBe(false);
    expect(shouldFrameArrivalResume({ arrivalOccurred: true, resumedLinePhase: null, alreadyFramed: false, ...prior })).toBe(false);
    expect(shouldFrameArrivalResume({ arrivalOccurred: true, resumedLinePhase: 5, alreadyFramed: false, ...prior })).toBe(false);
    expect(shouldFrameArrivalResume({ arrivalOccurred: true, resumedLinePhase: 0, alreadyFramed: true, ...prior })).toBe(false);
    // A resident recruited after the Arrival has no conversation to resume.
    expect(shouldFrameArrivalResume({ arrivalOccurred: true, resumedLinePhase: 0, alreadyFramed: false, hasPriorConversation: false })).toBe(false);
    const line = getArrivalResumeFramingLine('Ember');
    expect(line).toContain('Ember');
    expect(line).not.toMatch(NO_DASHES);
    expect(line).not.toMatch(NO_CURLY);
  });
});

describe('accessibility-devices-5: the rules backdrop is not announced as a button', () => {
  test('the tap-outside TouchableOpacity is accessible={false}', () => {
    const modal = src('components/puzzle/RulesModal.tsx');
    const backdrop = modal.slice(modal.indexOf('styles.overlayTouch'), modal.indexOf('styles.cardWrap'));
    expect(backdrop).toContain('accessible={false}');
    expect(backdrop).toContain('importantForAccessibility="no"');
  });
});
