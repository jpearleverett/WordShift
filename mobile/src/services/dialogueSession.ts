import { storage } from './storage';
import { DialogueSession, DialoguePhase, DIALOGUE_SESSION_CONFIG, getDialoguesPerSession, getPuzzlesBetweenSessions } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_dialogue_sessions';

/**
 * Dialogue Session Manager (Puzzle-Based)
 * Sessions unlock after completing a certain number of puzzles
 */

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
 * Read all dialogue sessions from MMKV
 */
function readSessions(): Map<string, DialogueSession> {
  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    const sessionsArray: DialogueSession[] = JSON.parse(stored);
    return new Map(sessionsArray.map(s => [s.animalId, s]));
  }
  return new Map();
}

/**
 * Write all dialogue sessions to MMKV
 */
function writeSessions(sessions: Map<string, DialogueSession>): void {
  const sessionsArray = Array.from(sessions.values());
  storage.set(STORAGE_KEY, JSON.stringify(sessionsArray));
}

/**
 * Load all dialogue sessions from storage
 */
export function loadDialogueSessions(): Map<string, DialogueSession> {
  return readSessions();
}

/**
 * Get session for a specific animal
 */
export function getSession(animalId: string): DialogueSession | null {
  const sessions = readSessions();
  return sessions.get(animalId) || null;
}

// Current phase for phase-aware session limits
let currentPhase: DialoguePhase = 0;

/**
 * Set the current narrative phase (for phase-aware session limits)
 */
export function updateSessionPhase(phase: DialoguePhase): void {
  currentPhase = phase;
}

/**
 * Get the effective max dialogues for a session (phase-aware)
 */
function getEffectiveMaxDialogues(): number {
  return getDialoguesPerSession(currentPhase);
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
 */
export function checkDialogueAvailability(animalId: string): {
  available: boolean;
  reason?: string;
  puzzlesRemaining?: number;
} {
  const sessions = readSessions();
  const session = sessions.get(animalId);

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
      sessions.set(animalId, session);
      writeSessions(sessions);
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
  const maxDialogues = getEffectiveMaxDialogues();
  if ((session.dialoguesInSession ?? 0) >= maxDialogues) {
    startCooldown(animalId);
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
  const sessions = readSessions();
  const session = sessions.get(animalId);
  if (!session || session.puzzlesAtSessionEnd === null) return false;
  // Grace period: skip cooldown for newly unlocked animals' first sessions
  const inGracePeriod = (session.sessionsCompleted ?? 0) < DIALOGUE_SESSION_CONFIG.GRACE_PERIOD_SESSIONS;
  if (inGracePeriod) return false;
  return getCooldownRemaining(session) > 0;
}

/**
 * Start or continue a dialogue session with an animal
 */
export function recordDialogue(animalId: string): DialogueSession {
  const sessions = readSessions();
  let session = sessions.get(animalId);

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

  sessions.set(animalId, session);
  writeSessions(sessions);
  return session;
}

/**
 * Start cooldown for an animal (requires puzzles to unlock)
 */
export function startCooldown(animalId: string): void {
  const sessions = readSessions();
  const session = sessions.get(animalId);

  if (session) {
    session.puzzlesAtSessionEnd = currentPuzzleCount;
    session.sessionsCompleted = (session.sessionsCompleted ?? 0) + 1;
    sessions.set(animalId, session);
    writeSessions(sessions);
  } else {
    // Create a session just for cooldown
    const newSession: DialogueSession = {
      animalId,
      dialoguesInSession: 0,
      puzzlesAtSessionEnd: currentPuzzleCount,
      sessionsCompleted: 1,
    };
    sessions.set(animalId, newSession);
    writeSessions(sessions);
  }
}

/**
 * End a dialogue session manually (player leaves dialogue)
 * This triggers cooldown if session was active
 */
export function endSession(animalId: string): void {
  const sessions = readSessions();
  const session = sessions.get(animalId);

  if (session && session.puzzlesAtSessionEnd === null && session.dialoguesInSession > 0) {
    // Session was active, start cooldown
    startCooldown(animalId);
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
  const sessions = readSessions();
  const session = sessions.get(animalId);

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
    dialoguesRemaining: getEffectiveMaxDialogues() - session.dialoguesInSession,
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
export function clearAllSessions(): void {
  storage.remove(STORAGE_KEY);
}
