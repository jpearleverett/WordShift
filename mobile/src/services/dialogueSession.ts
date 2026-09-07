import AsyncStorage from './persistenceStorage';
import { DialogueSession, DialoguePhase, DIALOGUE_SESSION_CONFIG, getDialoguesPerSession, getPuzzlesBetweenSessions } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_dialogue_sessions';

/**
 * Dialogue Session Manager (Puzzle-Based)
 * Sessions unlock after completing a certain number of puzzles
 */

// In-memory cache of sessions
let sessionsCache: Map<string, DialogueSession> = new Map();

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateSessionsCache(): void {
  sessionsCache = new Map();
}

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

// Current phase for phase-aware session limits.
//
// This module is a pure counter: it cannot read progress itself, so the value
// is a MIRROR the app has to keep current. It used to be written only by
// recordVictory, which meant every app launch ran the session rules at phase 0
// until the player finished a puzzle — 3 lines per session instead of 6 at the
// reveal, and a session left warm above the phase-0 cap was refused on the
// first tap and put straight on cooldown. Anything that knows the phase should
// push it here (useDialogueFlow mirrors it on load and again at tap time).
let currentPhase: DialoguePhase = 0;

/**
 * Set the current narrative phase (for phase-aware session limits)
 */
export function updateSessionPhase(phase: DialoguePhase): void {
  currentPhase = phase;
}

/**
 * Get the effective max dialogues for a session (phase-aware).
 * `sessionBonus` is a per-animal extension the CALLER decides (the catch-up
 * boost for late recruits with a regular-dialogue backlog — see
 * getCatchUpSessionBonus in types/homeWorld.ts); this module stays a pure
 * counter and never inspects dialogue state itself.
 */
function getEffectiveMaxDialogues(sessionBonus: number = 0): number {
  return getDialoguesPerSession(currentPhase) + Math.max(0, sessionBonus);
}

/**
 * Check if a session's cooldown has expired
 * Returns puzzles remaining (0 or negative means cooldown complete)
 */
function getCooldownRemaining(session: DialogueSession): number {
  if (session.puzzlesAtSessionEnd === null) return 0;
  const puzzlesSinceEnd = currentPuzzleCount - session.puzzlesAtSessionEnd;
  return getPuzzlesBetweenSessions(currentPhase) - puzzlesSinceEnd;
}

/**
 * Check if an animal is available for dialogue
 * Returns: { available: boolean, reason?: string, puzzlesRemaining?: number }
 * `sessionBonus` extends this animal's session cap (catch-up boost; default 0).
 */
export async function checkDialogueAvailability(animalId: string, sessionBonus: number = 0): Promise<{
  available: boolean;
  reason?: string;
  puzzlesRemaining?: number;
}> {
  const session = sessionsCache.get(animalId);

  if (!session) {
    // No session exists - animal is available
    return { available: true };
  }

  // Check if on cooldown (waiting for puzzles)
  if (session.puzzlesAtSessionEnd !== null) {
    // Grace period: skip cooldown for newly unlocked animals' first sessions
    const inGracePeriod = (session.sessionsCompleted ?? 0) < DIALOGUE_SESSION_CONFIG.GRACE_PERIOD_SESSIONS;

    const remaining = getCooldownRemaining(session);

    if (remaining <= 0 || inGracePeriod) {
      // Cooldown complete (or grace period) - reset session for new round, preserving sessionsCompleted
      session.dialoguesInSession = 0;
      session.puzzlesAtSessionEnd = null;
      sessionsCache.set(animalId, session);
      await saveSessions();
      return { available: true };
    }

    // Still in cooldown
    return {
      available: false,
      reason: 'cooldown',
      puzzlesRemaining: remaining,
    };
  }

  // Session is active - check if max dialogues reached (phase-aware limit)
  const maxDialogues = getEffectiveMaxDialogues(sessionBonus);
  if ((session.dialoguesInSession ?? 0) >= maxDialogues) {
    await startCooldown(animalId);
    return {
      available: false,
      reason: 'max_dialogues',
      puzzlesRemaining: getPuzzlesBetweenSessions(currentPhase),
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
  if (!session || session.puzzlesAtSessionEnd === null) return false;
  // Grace period: skip cooldown for newly unlocked animals' first sessions
  const inGracePeriod = (session.sessionsCompleted ?? 0) < DIALOGUE_SESSION_CONFIG.GRACE_PERIOD_SESSIONS;
  if (inGracePeriod) return false;
  return getCooldownRemaining(session) > 0;
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
      sessionsCompleted: 0,
    };
  } else if (session.puzzlesAtSessionEnd === null) {
    // Continue existing active session
    session.dialoguesInSession += 1;
  } else {
    // Session was on cooldown but now available - start fresh
    const prevSessions = session.sessionsCompleted ?? 0;
    session = {
      animalId,
      dialoguesInSession: 1,
      puzzlesAtSessionEnd: null,
      sessionsCompleted: prevSessions,
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
    session.sessionsCompleted = (session.sessionsCompleted ?? 0) + 1;
    sessionsCache.set(animalId, session);
    await saveSessions();
  } else {
    // Create a session just for cooldown
    const newSession: DialogueSession = {
      animalId,
      dialoguesInSession: 0,
      puzzlesAtSessionEnd: currentPuzzleCount,
      sessionsCompleted: 1,
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
 * `sessionBonus` extends this animal's session cap (catch-up boost; default 0).
 */
export function getSessionStatus(animalId: string, sessionBonus: number = 0): {
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
    const inGracePeriod = (session.sessionsCompleted ?? 0) < DIALOGUE_SESSION_CONFIG.GRACE_PERIOD_SESSIONS;
    const remaining = getCooldownRemaining(session);
    if (remaining <= 0 || inGracePeriod) {
      return { status: 'available' };
    }
    return { status: 'cooldown', puzzlesRemaining: remaining };
  }

  // In active session (phase-aware limit)
  return {
    status: 'in_session',
    dialoguesRemaining: getEffectiveMaxDialogues(sessionBonus) - session.dialoguesInSession,
  };
}

/**
 * Format puzzles remaining for display (kept simple, no numbers shown to player)
 */
export function formatTimeRemaining(puzzles: number): string {
  // Keep this vague so player doesn't know exact number
  if (puzzles <= 1) {
    return 'almost ready';
  } else if (puzzles <= 3) {
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
