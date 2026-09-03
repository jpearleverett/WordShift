/**
 * Whisper frequency gate (useVictoryOrchestration).
 *
 * A whisper on EVERY win guaranteed fast repeats from the 5-line-per-phase
 * pools, so wins now roll a phase-scaled chance BEFORE any whisper is
 * generated. The pure helper is unit-tested here; the placement of the roll
 * (gating generation AND the gallery record) is pinned by a source scan,
 * following the appIntegration.test.ts idiom for hook wiring that can't be
 * rendered in Node.
 */

import fs from 'fs';
import path from 'path';
import { getWhisperChance } from '../hooks/useVictoryOrchestration';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));
// The hook statically imports haptics; stub it so importing the module in Node
// never pulls expo-haptics' raw TS entry (ts-jest does not transform node_modules).
jest.mock('../services/haptics', () => ({
  hapticWarning: jest.fn(),
  hapticLight: jest.fn(),
}));
// a11yAnnounce statically imports react-native (AccessibilityInfo); stub it so
// importing the hook in Node never pulls the untransformed RN entry.
jest.mock('../services/a11yAnnounce', () => ({
  announceForA11y: jest.fn(),
}));
// The hook now drives the micro-beat/interjection fade (F38) via a couple of
// Animated.Value refs, so importing it in Node needs react-native's real
// (untransformed, Flow-syntax) entry stubbed out, mirroring victoryFlow.test.ts's
// fake Animated.
jest.mock('react-native', () => ({
  Animated: {
    Value: class {
      _value: number;
      constructor(v: number) { this._value = v; }
      setValue(v: number) { this._value = v; }
      interpolate() { return 'interpolated'; }
    },
    timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  },
}));

const HOOK_SRC = fs.readFileSync(
  path.resolve(__dirname, '../hooks/useVictoryOrchestration.ts'),
  'utf8'
);

describe('getWhisperChance', () => {
  test('phases 0-3 whisper on under half of wins', () => {
    for (const phase of [0, 1, 2, 3]) {
      expect(getWhisperChance(phase)).toBe(0.45);
    }
  });

  test('phase 4 whispers more often (the dread thickens)', () => {
    expect(getWhisperChance(4)).toBe(0.6);
  });

  test('phase 5 always whispers (personalized whispers are the endgame feature)', () => {
    expect(getWhisperChance(5)).toBe(1);
  });
});

describe('whisper roll placement', () => {
  test('the roll happens BEFORE generation, so a skipped win also skips the gallery record', () => {
    // The whole whisper block — including recordWhisper — must sit behind the
    // single gate; a whisper the player never saw must not fill the archive.
    expect(HOOK_SRC).toMatch(/!onboarding && !suppressCeremonyCues && Math\.random\(\) < getWhisperChance\(phase\)/);
    const gateIdx = HOOK_SRC.indexOf('Math.random() < getWhisperChance(phase)');
    const recordIdx = HOOK_SRC.indexOf('recordWhisper({');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(gateIdx);
  });

  test('onboarding wins still never whisper', () => {
    expect(HOOK_SRC).toContain('!onboarding && !suppressCeremonyCues && Math.random()');
  });
});

// ===========================================================================
// Micro-beat delivery: the beat is resolved at victory time but revealed
// 600-1800ms later (plus the narrative-slot wait), and EVERY victory exit
// clears that pending reveal. Because the beat tables are exact-count keyed
// against a monotonic counter, acking at resolve time meant a brisk NEXT
// LEVEL tap burned a one-time beat forever — worst of all the scripted silent
// victory, whose fanfare is suppressed by a separate pure lookup, leaving a
// wordless, confetti-less win that reads as a bug.
// ===========================================================================
describe('micro-beat ack placement', () => {
  test('the beat is acked inside the reveal, after the generation check', () => {
    const revealIdx = HOOK_SRC.indexOf('setShowMicroBeat(true)');
    const ackIdx = HOOK_SRC.indexOf('ackVictoryMicroBeat(beatCycleCount)');
    expect(revealIdx).toBeGreaterThan(-1);
    expect(ackIdx).toBeGreaterThan(-1);
    // Acked as it becomes visible, not when it resolved.
    expect(ackIdx).toBeLessThan(revealIdx);
    const resolveIdx = HOOK_SRC.indexOf('await resolveVictoryMicroBeat(');
    expect(resolveIdx).toBeLessThan(ackIdx);
    // The generation guard still stands between them.
    const guard = HOOK_SRC.lastIndexOf('if (gen !== generationRef.current) return;', ackIdx);
    expect(guard).toBeGreaterThan(resolveIdx);
  });

  test('the fabricated dwell line is never acked (it owns no pending record)', () => {
    expect(HOOK_SRC).toContain('if (beatIsKeyed) ackVictoryMicroBeat(beatCycleCount)');
    const dwellIdx = HOOK_SRC.indexOf("beat = { type: 'ambient_whisper', text: dwellLine");
    expect(dwellIdx).toBeGreaterThan(-1);
    // beatIsKeyed is only set from the keyed resolve, never from the dwell line.
    expect(HOOK_SRC.match(/beatIsKeyed = /g)).toHaveLength(2);
  });

  test('the ack is track-aware (a cycled save must not write the absolute set)', () => {
    expect(HOOK_SRC).toContain('beatCycleCount = fullProgress?.cycleCount ?? 0;');
    expect(HOOK_SRC).toContain('ackVictoryMicroBeat(beatCycleCount)');
  });
});
