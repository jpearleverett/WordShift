import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialogueSession, DIALOGUE_SESSION_CONFIG } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_dialogue_sessions';

/**
 * Dialogue Session Manager (Puzzle-Based)
 * Sessions unlock after completing a certain number of puzzles
 */

// In-memory cache of sessions
let sessionsCache: Map<string, DialogueSession> = new Map();

// Current puzzle count (must be updated externally)
let currentPuzzleCount = 0;

/**
 * Set the current puzzle count (called when puzzle is completed)
 */
export function updatePuzzleCount(count: number): void {
  currentPuzzleCount = count;
}

/**
 * Get current puzzle count
 */
export function getPuzzleCount(): number {
  return currentPuzzleCount;
}

/**
 * Load all dialogue sessions from storage
 */
export async function loadDialogueSessions(): Promise<Map<string, DialogueSession>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sessionsArray: DialogueSession[] = JSON.parse(stored);
      sessionsCache = new Map(sessionsArray.map(s => [s.animalId, s]));
    }
  } catch (error) {
    console.error('Failed to load dialogue sessions:', error);
  }
  return sessionsCache;
}

/**
 * Save all dialogue sessions to storage
 */
async function saveSessions(): Promise<void> {
  try {
    const sessionsArray = Array.from(sessionsCache.values());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsArray));
  } catch (error) {
    console.error('Failed to save dialogue sessions:', error);
  }
}

/**
 * Get session for a specific animal
 */
export function getSession(animalId: string): DialogueSession | null {
  return sessionsCache.get(animalId) || null;
}

/**
 * Check if an animal is available for dialogue
 * Returns: { available: boolean, reason?: string, puzzlesRemaining?: number }
 */
export function checkDialogueAvailability(animalId: string): {
  available: boolean;
  reason?: string;
  puzzlesRemaining?: number;
} {
  const session = sessionsCache.get(animalId);

  if (!session) {
    // No session exists - animal is available
    return { available: true };
  }

  // Check if on cooldown (waiting for puzzles)
  if (session.puzzlesAtSessionEnd !== null) {
    const puzzlesSinceEnd = currentPuzzleCount - session.puzzlesAtSessionEnd;
    const puzzlesRequired = DIALOGUE_SESSION_CONFIG.PUZZLES_BETWEEN_SESSIONS;

    if (puzzlesSinceEnd >= puzzlesRequired) {
      // Cooldown complete - clear session and make available
      sessionsCache.delete(animalId);
      saveSessions();
      return { available: true };
    }

    // Still in cooldown
    const puzzlesRemaining = puzzlesRequired - puzzlesSinceEnd;
    return {
      available: false,
      reason: 'cooldown',
      puzzlesRemaining,
    };
  }

  // Session is active - check if max dialogues reached
  if (session.dialoguesInSession >= DIALOGUE_SESSION_CONFIG.DIALOGUES_PER_SESSION) {
    // Too many dialogues - enter cooldown
    startCooldown(animalId);
    return {
      available: false,
      reason: 'max_dialogues',
      puzzlesRemaining: DIALOGUE_SESSION_CONFIG.PUZZLES_BETWEEN_SESSIONS,
    };
  }

  // Session active and dialogues available
  return { available: true };
}

/**
 * Check if an animal is on cooldown (for UI indicators like hiding exclamation)
 */
export function isOnCooldown(animalId: string): boolean {
  const session = sessionsCache.get(animalId);

  if (!session) {
    return false;
  }

  // On cooldown if puzzlesAtSessionEnd is set
  if (session.puzzlesAtSessionEnd !== null) {
    const puzzlesSinceEnd = currentPuzzleCount - session.puzzlesAtSessionEnd;
    return puzzlesSinceEnd < DIALOGUE_SESSION_CONFIG.PUZZLES_BETWEEN_SESSIONS;
  }

  return false;
}

/**
 * Start or continue a dialogue session with an animal
 */
export async function recordDialogue(animalId: string): Promise<DialogueSession> {
  let session = sessionsCache.get(animalId);

  if (!session) {
    // Start new session
    session = {
      animalId,
      dialoguesInSession: 1,
      puzzlesAtSessionEnd: null,
    };
  } else if (session.puzzlesAtSessionEnd === null) {
    // Continue existing active session
    session.dialoguesInSession += 1;
  } else {
    // Session was on cooldown but now available - start fresh
    session = {
      animalId,
      dialoguesInSession: 1,
      puzzlesAtSessionEnd: null,
    };
  }

  sessionsCache.set(animalId, session);
  await saveSessions();
  return session;
}

/**
 * Start cooldown for an animal (requires puzzles to unlock)
 */
export async function startCooldown(animalId: string): Promise<void> {
  const session = sessionsCache.get(animalId);

  if (session) {
    session.puzzlesAtSessionEnd = currentPuzzleCount;
    sessionsCache.set(animalId, session);
    await saveSessions();
  } else {
    // Create a session just for cooldown
    const newSession: DialogueSession = {
      animalId,
      dialoguesInSession: 0,
      puzzlesAtSessionEnd: currentPuzzleCount,
    };
    sessionsCache.set(animalId, newSession);
    await saveSessions();
  }
}

/**
 * End a dialogue session manually (player leaves dialogue)
 * This triggers cooldown if session was active
 */
export async function endSession(animalId: string): Promise<void> {
  const session = sessionsCache.get(animalId);

  if (session && session.puzzlesAtSessionEnd === null && session.dialoguesInSession > 0) {
    // Session was active, start cooldown
    await startCooldown(animalId);
  }
}

/**
 * Get session status for UI display
 */
export function getSessionStatus(animalId: string): {
  status: 'available' | 'in_session' | 'cooldown';
  dialoguesRemaining?: number;
  puzzlesRemaining?: number;
} {
  const session = sessionsCache.get(animalId);

  if (!session) {
    return { status: 'available' };
  }

  // Check if on cooldown
  if (session.puzzlesAtSessionEnd !== null) {
    const puzzlesSinceEnd = currentPuzzleCount - session.puzzlesAtSessionEnd;
    const puzzlesRequired = DIALOGUE_SESSION_CONFIG.PUZZLES_BETWEEN_SESSIONS;

    if (puzzlesSinceEnd >= puzzlesRequired) {
      return { status: 'available' };
    }

    return {
      status: 'cooldown',
      puzzlesRemaining: puzzlesRequired - puzzlesSinceEnd,
    };
  }

  // In active session
  return {
    status: 'in_session',
    dialoguesRemaining: DIALOGUE_SESSION_CONFIG.DIALOGUES_PER_SESSION - session.dialoguesInSession,
  };
}

/**
 * Format puzzles remaining for display (kept simple, no numbers shown to player)
 */
export function formatTimeRemaining(puzzles: number): string {
  // Keep this vague so player doesn't know exact number
  if (puzzles <= 1) {
    return 'almost ready';
  } else if (puzzles <= 2) {
    return 'a little longer';
  } else {
    return 'needs more puzzles';
  }
}

/**
 * Clear all sessions (for testing)
 */
export async function clearAllSessions(): Promise<void> {
  sessionsCache.clear();
  await AsyncStorage.removeItem(STORAGE_KEY);
}
