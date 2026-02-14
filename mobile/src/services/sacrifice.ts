import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sacrifice mechanic for Phase 4+.
 *
 * Players can voluntarily "offer" earned amber back to "the arrangement."
 * The amber is destroyed — they get nothing tangible in return.
 * The house glows briefly. The animals notice. That's it.
 *
 * This reinforces the complicity theme: the player is choosing to give
 * resources to a cosmic horror ritual for no gameplay benefit.
 * The fact that players WILL do this (and they will) is the entire point.
 *
 * "You didn't have to do that. But you did."
 */

const STORAGE_KEY = 'wordshift_sacrifices';

// ============================================================================
// Types
// ============================================================================

export interface SacrificeState {
  totalAmberSacrificed: number;
  sacrificeCount: number;
  lastSacrificeTimestamp: number;
  /** The arrangement remembers what was offered */
  sacrificeHistory: SacrificeEntry[];
}

export interface SacrificeEntry {
  amount: number;
  timestamp: number;
  /** Phase at time of sacrifice */
  phase: number;
}

// ============================================================================
// Sacrifice Response Messages
// ============================================================================

const SACRIFICE_RESPONSES = [
  // First sacrifice — special
  'The arrangement accepts your offering. The house glows, briefly.',
  // Subsequent sacrifices
  'The walls pulse once. The amber dissolves into the pattern.',
  'You hear nothing. But something heard you.',
  'The animals pause, briefly. They know what you did.',
  'The amber sinks into the floor. The foundation drinks.',
  'A warmth that should not be warm.',
  'Accepted. Always accepted.',
  'The pattern grows. You fed it voluntarily.',
  'Ember\'s fire flickers. Not from wind.',
  'The arrangement remembers every offering. Especially the voluntary ones.',
];

const SACRIFICE_MILESTONES: Record<number, string> = {
  1: 'Your first offering. The arrangement noticed.',
  5: 'Five times now. The pattern thanks you. If patterns could thank.',
  10: 'Ten offerings. The house is warmer. Why is the house warmer?',
  25: 'Twenty-five voluntary offerings. The keepers speak of your devotion.',
  50: 'Fifty. The arrangement has never been fed so willingly.',
  100: 'One hundred offerings. You gave everything. You chose to.',
};

// ============================================================================
// In-memory cache
// ============================================================================

let sacrificeCache: SacrificeState | null = null;

function getDefaultState(): SacrificeState {
  return {
    totalAmberSacrificed: 0,
    sacrificeCount: 0,
    lastSacrificeTimestamp: 0,
    sacrificeHistory: [],
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load sacrifice state from storage.
 */
export async function loadSacrificeState(): Promise<SacrificeState> {
  if (sacrificeCache) return sacrificeCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      sacrificeCache = JSON.parse(stored);
      return sacrificeCache!;
    }
  } catch {}
  sacrificeCache = getDefaultState();
  return sacrificeCache;
}

/**
 * Perform a sacrifice. Returns the response message.
 * The caller is responsible for deducting amber from the player's balance.
 */
export async function performSacrifice(
  amount: number,
  currentPhase: number
): Promise<{ message: string; isMilestone: boolean }> {
  const state = await loadSacrificeState();

  const entry: SacrificeEntry = {
    amount,
    timestamp: Date.now(),
    phase: currentPhase,
  };

  state.totalAmberSacrificed += amount;
  state.sacrificeCount += 1;
  state.lastSacrificeTimestamp = Date.now();
  state.sacrificeHistory.push(entry);

  // Cap history at 100 entries
  if (state.sacrificeHistory.length > 100) {
    state.sacrificeHistory = state.sacrificeHistory.slice(-100);
  }

  await saveSacrificeState(state);

  // Check for milestone
  const milestoneMessage = SACRIFICE_MILESTONES[state.sacrificeCount];
  if (milestoneMessage) {
    return { message: milestoneMessage, isMilestone: true };
  }

  // First sacrifice gets special message
  if (state.sacrificeCount === 1) {
    return { message: SACRIFICE_RESPONSES[0], isMilestone: false };
  }

  // Random response
  const responses = SACRIFICE_RESPONSES.slice(1);
  const message = responses[Math.floor(Math.random() * responses.length)];
  return { message, isMilestone: false };
}

/**
 * Check if sacrifice is available (Phase 4+ only).
 */
export function isSacrificeAvailable(currentPhase: number): boolean {
  return currentPhase >= 4;
}

/**
 * Get suggested sacrifice amounts.
 */
export function getSacrificeAmounts(currentBalance: number): number[] {
  const amounts: number[] = [];
  if (currentBalance >= 5) amounts.push(5);
  if (currentBalance >= 10) amounts.push(10);
  if (currentBalance >= 25) amounts.push(25);
  if (currentBalance >= 50) amounts.push(50);
  if (currentBalance >= 100) amounts.push(100);
  return amounts;
}

/**
 * Get phase-aware text for the sacrifice button/prompt.
 */
export function getSacrificePrompt(phase: number): { title: string; subtitle: string } {
  if (phase >= 4) {
    return {
      title: 'Offer to the Arrangement',
      subtitle: 'The amber returns to the pattern. You get nothing. The house remembers.',
    };
  }
  // Should not be visible before Phase 4, but just in case
  return {
    title: 'Offer Amber',
    subtitle: 'Why would you do this?',
  };
}

/**
 * Get sacrifice stats for display.
 */
export async function getSacrificeStats(): Promise<{
  totalSacrificed: number;
  count: number;
  lastSacrifice: number;
}> {
  const state = await loadSacrificeState();
  return {
    totalSacrificed: state.totalAmberSacrificed,
    count: state.sacrificeCount,
    lastSacrifice: state.lastSacrificeTimestamp,
  };
}

// ============================================================================
// Internal
// ============================================================================

async function saveSacrificeState(state: SacrificeState): Promise<void> {
  sacrificeCache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Get the current sacrifice count (for dialogue reactions).
 */
export async function getSacrificeCount(): Promise<number> {
  const state = await loadSacrificeState();
  return state.sacrificeCount;
}

/**
 * Clear sacrifice data (for Settings > Reset All).
 */
export async function clearSacrificeState(): Promise<void> {
  sacrificeCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
