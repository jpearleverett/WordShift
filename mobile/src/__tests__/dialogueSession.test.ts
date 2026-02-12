import {
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSessionStatus,
  formatTimeRemaining,
  updatePuzzleCount,
  updateSessionPhase,
  isOnCooldown,
  clearAllSessions,
  loadDialogueSessions,
  startCooldown,
} from '../services/dialogueSession';
import { DIALOGUE_SESSION_CONFIG, getDialoguesPerSession, getPuzzlesBetweenSessions } from '../types/homeWorld';
import AsyncStorage from '@react-native-async-storage/async-storage';

// At phase 0, getDialoguesPerSession returns 6 (not the raw DIALOGUES_PER_SESSION of 8)
const EFFECTIVE_MAX = getDialoguesPerSession(0);
// At phase 0, getPuzzlesBetweenSessions returns 1 (not the raw PUZZLES_BETWEEN_SESSIONS of 3)
const EFFECTIVE_COOLDOWN = getPuzzlesBetweenSessions(0);

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearAllSessions();
  updatePuzzleCount(0);
  updateSessionPhase(0);
});

describe('checkDialogueAvailability', () => {
  test('animal is available when no session exists', async () => {
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(true);
  });

  test('animal is available during active session', async () => {
    await recordDialogue('fox');
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(true);
  });

  test('animal becomes unavailable after max dialogues', async () => {
    for (let i = 0; i < EFFECTIVE_MAX; i++) {
      await recordDialogue('fox');
    }
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('max_dialogues');
  });

  test('animal becomes available again after cooldown expires', async () => {
    for (let i = 0; i < EFFECTIVE_MAX; i++) {
      await recordDialogue('fox');
    }
    // Trigger max_dialogues cooldown
    await checkDialogueAvailability('fox');

    // Still on cooldown
    expect((await checkDialogueAvailability('fox')).available).toBe(false);

    // Complete required puzzles
    updatePuzzleCount(EFFECTIVE_COOLDOWN);
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(true);
  });
});

describe('recordDialogue', () => {
  test('creates new session on first dialogue', async () => {
    const session = await recordDialogue('fox');
    expect(session.animalId).toBe('fox');
    expect(session.dialoguesInSession).toBe(1);
    expect(session.puzzlesAtSessionEnd).toBeNull();
  });

  test('increments dialogue count on subsequent dialogues', async () => {
    await recordDialogue('fox');
    const session = await recordDialogue('fox');
    expect(session.dialoguesInSession).toBe(2);
  });

  test('tracks sessions per animal independently', async () => {
    await recordDialogue('fox');
    await recordDialogue('fox');
    const owlSession = await recordDialogue('owl');
    expect(owlSession.dialoguesInSession).toBe(1);
  });
});

describe('endSession', () => {
  test('starts cooldown when ending active session', async () => {
    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);
  });

  test('cooldown works from the very first session', async () => {
    // Even the first session should trigger a real cooldown
    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);

    // Must solve puzzles before talking again
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('cooldown');
  });

  test('does nothing if no session exists', async () => {
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(false);
  });
});

describe('isOnCooldown', () => {
  test('returns false when no session exists', () => {
    expect(isOnCooldown('fox')).toBe(false);
  });

  test('returns true after session ends', async () => {
    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);
  });

  test('returns false after enough puzzles completed', async () => {
    updatePuzzleCount(0);
    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);

    // Complete enough puzzles to clear cooldown
    updatePuzzleCount(EFFECTIVE_COOLDOWN);
    expect(isOnCooldown('fox')).toBe(false);
  });
});

describe('getSessionStatus', () => {
  test('returns available when no session exists', () => {
    const status = getSessionStatus('fox');
    expect(status.status).toBe('available');
  });

  test('returns in_session during active session', async () => {
    await recordDialogue('fox');
    const status = getSessionStatus('fox');
    expect(status.status).toBe('in_session');
    expect(status.dialoguesRemaining).toBe(EFFECTIVE_MAX - 1);
  });

  test('returns cooldown when on cooldown', async () => {
    await recordDialogue('fox');
    await endSession('fox');
    const status = getSessionStatus('fox');
    expect(status.status).toBe('cooldown');
    expect(status.puzzlesRemaining).toBe(EFFECTIVE_COOLDOWN);
  });

  test('returns available after cooldown expires', async () => {
    updatePuzzleCount(0);
    await recordDialogue('fox');
    await endSession('fox');

    updatePuzzleCount(EFFECTIVE_COOLDOWN);
    const status = getSessionStatus('fox');
    expect(status.status).toBe('available');
  });
});

describe('formatTimeRemaining', () => {
  test('returns "almost ready" for 1 puzzle', () => {
    expect(formatTimeRemaining(1)).toBe('almost ready');
  });

  test('returns "a little longer" for 2 puzzles', () => {
    expect(formatTimeRemaining(2)).toBe('a little longer');
  });

  test('returns "needs more puzzles" for 3+ puzzles', () => {
    expect(formatTimeRemaining(3)).toBe('needs more puzzles');
    expect(formatTimeRemaining(5)).toBe('needs more puzzles');
  });
});

describe('cooldown lifecycle', () => {
  test('full session → cooldown → available cycle', async () => {
    updatePuzzleCount(0);

    // Start session
    expect((await checkDialogueAvailability('fox')).available).toBe(true);

    // Use all dialogues
    for (let i = 0; i < EFFECTIVE_MAX; i++) {
      await recordDialogue('fox');
    }

    // Should be on cooldown
    const after = await checkDialogueAvailability('fox');
    expect(after.available).toBe(false);

    // Complete required puzzles
    updatePuzzleCount(EFFECTIVE_COOLDOWN);

    // Should be available again
    const afterPuzzles = await checkDialogueAvailability('fox');
    expect(afterPuzzles.available).toBe(true);
  });

  test('multiple sessions preserve sessionsCompleted across cooldowns', async () => {
    updatePuzzleCount(0);

    // First session
    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);

    // Clear cooldown
    updatePuzzleCount(EFFECTIVE_COOLDOWN);
    expect(isOnCooldown('fox')).toBe(false);

    // Second session — animal should still be available after cooldown
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(true);

    await recordDialogue('fox');
    await endSession('fox');
    expect(isOnCooldown('fox')).toBe(true);
  });

  test('closing dialogue early still triggers cooldown', async () => {
    // Read just 1 dialogue then close
    await recordDialogue('fox');
    await endSession('fox');

    // Should be on cooldown even though max wasn't reached
    expect(isOnCooldown('fox')).toBe(true);
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('cooldown');
  });

  test('cannot bypass cooldown by tapping animal again immediately', async () => {
    await recordDialogue('fox');
    await endSession('fox');

    // Tapping again should NOT work
    const result = await checkDialogueAvailability('fox');
    expect(result.available).toBe(false);

    // Still can't talk
    const result2 = await checkDialogueAvailability('fox');
    expect(result2.available).toBe(false);

    // Only after solving puzzles
    updatePuzzleCount(EFFECTIVE_COOLDOWN);
    const result3 = await checkDialogueAvailability('fox');
    expect(result3.available).toBe(true);
  });
});
