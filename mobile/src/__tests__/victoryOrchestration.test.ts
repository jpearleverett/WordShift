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
    expect(HOOK_SRC).toMatch(/!onboarding && Math\.random\(\) < getWhisperChance\(phase\)/);
    const gateIdx = HOOK_SRC.indexOf('Math.random() < getWhisperChance(phase)');
    const recordIdx = HOOK_SRC.indexOf('recordWhisper({');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(gateIdx);
  });

  test('onboarding wins still never whisper', () => {
    expect(HOOK_SRC).toContain('!onboarding && Math.random()');
  });
});
