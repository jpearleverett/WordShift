import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialogueSession, DIALOGUE_SESSION_CONFIG } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_dialogue_sessions';

/**
 * Dialogue Session Manager
 * Handles 2-3 minute dialogue sessions with cooldown periods
 */

// In-memory cache of sessions
let sessionsCache: Map<string, DialogueSession> = new Map();

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
 * Returns: { available: boolean, reason?: string, cooldownRemaining?: number }
 */
export function checkDialogueAvailability(animalId: string): {
  available: boolean;
  reason?: string;
  cooldownRemaining?: number;
  sessionTimeRemaining?: number;
} {
  const now = Date.now();
  const session = sessionsCache.get(animalId);

  if (!session) {
    // No session exists - animal is available
    return { available: true };
  }

  // Check if in cooldown
  if (session.cooldownEndTime && now < session.cooldownEndTime) {
    const cooldownRemaining = Math.ceil((session.cooldownEndTime - now) / 1000);
    return {
      available: false,
      reason: 'cooldown',
      cooldownRemaining,
    };
  }

  // Check if cooldown has expired - reset session
  if (session.cooldownEndTime && now >= session.cooldownEndTime) {
    // Cooldown expired, clear the session
    sessionsCache.delete(animalId);
    saveSessions();
    return { available: true };
  }

  // Check if session is still active
  const sessionElapsed = now - session.sessionStartTime;
  const sessionTimeRemaining = Math.ceil(
    (DIALOGUE_SESSION_CONFIG.SESSION_DURATION_MS - sessionElapsed) / 1000
  );

  if (sessionElapsed < DIALOGUE_SESSION_CONFIG.SESSION_DURATION_MS) {
    // Session still active
    // Check if max dialogues reached
    if (session.dialoguesInSession >= DIALOGUE_SESSION_CONFIG.DIALOGUES_PER_SESSION) {
      // Too many dialogues - enter cooldown
      startCooldown(animalId);
      const cooldownRemaining = Math.ceil(DIALOGUE_SESSION_CONFIG.COOLDOWN_DURATION_MS / 1000);
      return {
        available: false,
        reason: 'max_dialogues',
        cooldownRemaining,
      };
    }

    // Check minimum interval between dialogues
    const timeSinceLastDialogue = now - session.lastDialogueTime;
    if (timeSinceLastDialogue < DIALOGUE_SESSION_CONFIG.MIN_DIALOGUE_INTERVAL_MS) {
      return {
        available: true, // Available but should wait
        sessionTimeRemaining,
      };
    }

    return { available: true, sessionTimeRemaining };
  }

  // Session expired - enter cooldown
  startCooldown(animalId);
  const cooldownRemaining = Math.ceil(DIALOGUE_SESSION_CONFIG.COOLDOWN_DURATION_MS / 1000);
  return {
    available: false,
    reason: 'session_expired',
    cooldownRemaining,
  };
}

/**
 * Start or continue a dialogue session with an animal
 */
export async function recordDialogue(animalId: string): Promise<DialogueSession> {
  const now = Date.now();
  let session = sessionsCache.get(animalId);

  if (!session) {
    // Start new session
    session = {
      animalId,
      sessionStartTime: now,
      lastDialogueTime: now,
      dialoguesInSession: 1,
      cooldownEndTime: null,
    };
  } else {
    // Continue existing session
    session.lastDialogueTime = now;
    session.dialoguesInSession += 1;
  }

  sessionsCache.set(animalId, session);
  await saveSessions();
  return session;
}

/**
 * Start cooldown for an animal
 */
export async function startCooldown(animalId: string): Promise<void> {
  const now = Date.now();
  const session = sessionsCache.get(animalId);

  if (session) {
    session.cooldownEndTime = now + DIALOGUE_SESSION_CONFIG.COOLDOWN_DURATION_MS;
    sessionsCache.set(animalId, session);
    await saveSessions();
  } else {
    // Create a session just for cooldown
    const newSession: DialogueSession = {
      animalId,
      sessionStartTime: now,
      lastDialogueTime: now,
      dialoguesInSession: 0,
      cooldownEndTime: now + DIALOGUE_SESSION_CONFIG.COOLDOWN_DURATION_MS,
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

  if (session && !session.cooldownEndTime && session.dialoguesInSession > 0) {
    // Session was active, start cooldown
    await startCooldown(animalId);
  }
}

/**
 * Get formatted time remaining for cooldown or session
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Check if animal has any active session (for UI indicators)
 */
export function hasActiveSession(animalId: string): boolean {
  const session = sessionsCache.get(animalId);
  if (!session) return false;

  const now = Date.now();

  // In cooldown
  if (session.cooldownEndTime && now < session.cooldownEndTime) {
    return true;
  }

  // In active session
  const sessionElapsed = now - session.sessionStartTime;
  return sessionElapsed < DIALOGUE_SESSION_CONFIG.SESSION_DURATION_MS;
}

/**
 * Get session status for UI display
 */
export function getSessionStatus(animalId: string): {
  status: 'available' | 'in_session' | 'cooldown';
  timeRemaining?: number;
  dialoguesRemaining?: number;
} {
  const now = Date.now();
  const session = sessionsCache.get(animalId);

  if (!session) {
    return { status: 'available' };
  }

  // In cooldown
  if (session.cooldownEndTime && now < session.cooldownEndTime) {
    return {
      status: 'cooldown',
      timeRemaining: Math.ceil((session.cooldownEndTime - now) / 1000),
    };
  }

  // Check if session expired
  const sessionElapsed = now - session.sessionStartTime;
  if (sessionElapsed >= DIALOGUE_SESSION_CONFIG.SESSION_DURATION_MS) {
    // Session expired but no cooldown set - probably available
    return { status: 'available' };
  }

  // In active session
  return {
    status: 'in_session',
    timeRemaining: Math.ceil(
      (DIALOGUE_SESSION_CONFIG.SESSION_DURATION_MS - sessionElapsed) / 1000
    ),
    dialoguesRemaining:
      DIALOGUE_SESSION_CONFIG.DIALOGUES_PER_SESSION - session.dialoguesInSession,
  };
}

/**
 * Clear all sessions (for testing)
 */
export async function clearAllSessions(): Promise<void> {
  sessionsCache.clear();
  await AsyncStorage.removeItem(STORAGE_KEY);
}
