import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The optional Offering spends amber for an authored response and a record of
 * what the player gave. It buys no item or story outcome. Offering quests can
 * return part of the amber; the service and altar must describe that honestly.
 * Recognition is flavor, never proof that spending changed the player's
 * allegiance, erased a boundary, or earned the animals' affection.
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
  /** Whether the one-time Phase-4 offering invitation has been delivered. */
  introSeen?: boolean;
}

export interface SacrificeEntry {
  amount: number;
  timestamp: number;
  /** Phase at time of sacrifice */
  phase: number;
}

/** A private "devotion" standing: how the arrangement regards a repeat giver. */
export interface DevotionTier {
  /** Minimum cumulative offering count to hold this tier. */
  threshold: number;
  /** The title shown at the altar (never "level N" — this is regard, not rank). */
  title: string;
  /** One line on how the arrangement's attention reads at this tier. */
  regard: string;
}

// ============================================================================
// Copy pools
// ============================================================================

// First-ever offering (special). Tests assert this contains "arrangement".
const FIRST_OFFERING = 'The arrangement accepts your offering. The house glows, briefly.';

// Cumulative-count milestones. These OVERRIDE the escalation pools and are the
// collectible beats (recorded to the Whisper Gallery by the caller). The exact
// keywords here are part of the mechanic's contract (see sacrifice.test.ts).
const SACRIFICE_MILESTONES: Record<number, string> = {
  2: 'Twice now. The walls remember.',
  3: 'Three offerings. The animals have noticed.',
  5: 'Five times now. The pattern thanks you. If patterns could thank.',
  10: 'Ten offerings. The house is warmer. Why is the house warmer?',
  25: 'Twenty-five voluntary offerings. The keepers speak of your devotion.',
  50: 'Fifty. A long row of small lights remains where the amber settled.',
  100: 'One hundred offerings. The arrangement remembers each one. Your next decision is still yours.',
};

// Escalating in-session responses. The player can now offer repeatedly without
// closing the altar; consecutive offerings in one sitting (sessionStreak) ramp
// the arrangement's attention from calm acceptance to direct, unsettling
// address. Phase 4 = reverent dread; Phase 5 = serene, arrived.
const OFFERING_RESPONSES: Record<'p4' | 'p5', { calm: string[]; leaning: string[]; fervent: string[] }> = {
  p4: {
    calm: [
      'The walls pulse once. The amber dissolves into the pattern.',
      'You hear nothing. But something heard you.',
      'The amber sinks into the floor. The foundation drinks.',
      'A warmth that should not be warm.',
      'Accepted. Always accepted.',
    ],
    leaning: [
      'A note travels through the nearest beam. Something heard the amber settle.',
      'The pattern grows. You fed it again, and freely.',
      "Ember's fire leans toward you now, though you are not near it.",
      'The house holds its breath around your hands.',
    ],
    fervent: [
      'You are still here. Still giving. The house has stopped pretending to be surprised.',
      'It knows the shape of your giving now. It waits for the next.',
      'Something behind the walls has turned to face you fully.',
      'The light waits after your hand withdraws. You can leave it waiting.',
    ],
  },
  p5: {
    calm: [
      'The pattern accepts. A little warmth gathers around the empty place.',
      'The amber settles into the quiet. Somewhere nearby, a chair moves.',
      'It is received. The mark of this offering stays.',
    ],
    leaning: [
      'The house is warm the way a held hand is warm. It remembers you giving.',
      'The light in the bowl fades before the light at the door.',
      'You give to something that has already arrived. It thanks you anyway.',
    ],
    fervent: [
      'The pattern knows the shape of this gesture. It waits while you decide whether to make another.',
      'The arrival is over. This offering is a new decision, smaller than that night.',
      'The arrangement keeps the amber. Your hand comes away empty and your own.',
    ],
  },
};

// The rare "offer everything" act: the fullest complicity, in one gesture.
const EVERYTHING_RESPONSES: Record<'p4' | 'p5', string[]> = {
  p4: [
    'Everything. You gave all your amber. The house floods with a light that has no source.',
    'All of it, at once. The walls shudder like something waking. You feel seen to the bone.',
    'You emptied your hands into the pattern. It closes around the gift. Your hands remain outside.',
  ],
  p5: [
    'All the amber in your pouch. The arrangement receives it in a single warm pulse.',
    'Your amber pouch is empty. The door remains where it was.',
    'All of it. The light rises, settles, and leaves room for the next ordinary sound.',
  ],
};

// ============================================================================
// Devotion tiers (private standing — flavor, never mechanical)
// ============================================================================

export const DEVOTION_TIERS: DevotionTier[] = [
  { threshold: 1, title: 'Noticed', regard: 'The arrangement has turned its attention to you.' },
  { threshold: 3, title: 'Marked', regard: 'It knows your hands now.' },
  { threshold: 8, title: 'Known', regard: 'It recognizes the approach of your hands.' },
  { threshold: 20, title: 'Kept', regard: 'A record of your offerings has been kept.' },
  { threshold: 50, title: 'Beloved of the Pattern', regard: 'The keepers speak of your devotion.' },
  { threshold: 100, title: 'One of the Arrangement', regard: 'It remembers a hundred visits. Each visit still had an ending.' },
];

/** Index (0-based) of the highest devotion tier held at `count`, or -1 if none. */
export function getDevotionTierIndex(count: number): number {
  let idx = -1;
  for (let i = 0; i < DEVOTION_TIERS.length; i++) {
    if (count >= DEVOTION_TIERS[i].threshold) idx = i;
    else break;
  }
  return idx;
}

/** The devotion tier held at `count`, or null before the first offering. */
export function getDevotionTier(count: number): DevotionTier | null {
  const idx = getDevotionTierIndex(count);
  return idx >= 0 ? DEVOTION_TIERS[idx] : null;
}

// ============================================================================
// In-memory cache
// ============================================================================

let sacrificeCache: SacrificeState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateSacrificeCache(): void {
  sacrificeCache = null;
}

function getDefaultState(): SacrificeState {
  return {
    totalAmberSacrificed: 0,
    sacrificeCount: 0,
    lastSacrificeTimestamp: 0,
    sacrificeHistory: [],
    introSeen: false,
  };
}

function pick(pool: string[]): string {
  if (pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================================
// Response selection (pure — exported for tests)
// ============================================================================

/**
 * Choose the arrangement's response to an offering. Priority:
 *   1. "Offer everything" — the fullest gesture, its own bespoke pool.
 *   2. First-ever offering — the special welcome (contains "arrangement").
 *   3. Cumulative-count milestone — the collectible beats.
 *   4. Escalation pool — calm / leaning / fervent by in-session streak, and
 *      dread (Phase 4) vs serene (Phase 5) by phase.
 * `isMilestone` marks case 3 only (drives the collectible + emphasis).
 */
export function selectOfferingResponse(params: {
  count: number;
  sessionStreak?: number;
  phase?: number;
  everything?: boolean;
}): { message: string; isMilestone: boolean } {
  const { count } = params;
  const phase = params.phase ?? 4;
  const streak = Math.max(0, params.sessionStreak ?? 0);
  const bank: 'p4' | 'p5' = phase >= 5 ? 'p5' : 'p4';

  if (params.everything) {
    return { message: pick(EVERYTHING_RESPONSES[bank]), isMilestone: false };
  }
  if (count <= 1) {
    return { message: FIRST_OFFERING, isMilestone: false };
  }
  const milestone = SACRIFICE_MILESTONES[count];
  if (milestone) {
    return { message: milestone, isMilestone: true };
  }
  const tier: 'calm' | 'leaning' | 'fervent' = streak >= 6 ? 'fervent' : streak >= 3 ? 'leaning' : 'calm';
  return { message: pick(OFFERING_RESPONSES[bank][tier]), isMilestone: false };
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
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed.totalAmberSacrificed === 'number' &&
        typeof parsed.sacrificeCount === 'number' &&
        Array.isArray(parsed.sacrificeHistory)
      ) {
        // Normalize: older saves predate the introSeen flag.
        sacrificeCache = {
          totalAmberSacrificed: parsed.totalAmberSacrificed,
          sacrificeCount: parsed.sacrificeCount,
          lastSacrificeTimestamp: parsed.lastSacrificeTimestamp ?? 0,
          sacrificeHistory: parsed.sacrificeHistory,
          introSeen: parsed.introSeen === true,
        };
      } else {
        sacrificeCache = getDefaultState();
      }
      return sacrificeCache!;
    }
  } catch {}
  sacrificeCache = getDefaultState();
  return sacrificeCache;
}

/**
 * Perform an offering. Deducts nothing itself — the CALLER spends the amber
 * first (mirrors the room-upgrade / tending sinks). Returns the arrangement's
 * response plus the running monument (total, count) and, when this offering
 * crosses into a new devotion tier, that tier (so the altar can announce it).
 *
 * `opts.sessionStreak` is the number of offerings made in the current open
 * altar session INCLUDING this one (the UI tracks it); it drives escalation.
 * `opts.everything` marks the "offer everything" gesture.
 */
export async function performSacrifice(
  amount: number,
  currentPhase: number,
  opts?: { sessionStreak?: number; everything?: boolean }
): Promise<{
  message: string;
  isMilestone: boolean;
  total: number;
  count: number;
  tierUp: DevotionTier | null;
}> {
  const state = await loadSacrificeState();
  const prevCount = state.sacrificeCount;

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

  const newCount = state.sacrificeCount;
  const resp = selectOfferingResponse({
    count: newCount,
    sessionStreak: opts?.sessionStreak,
    phase: currentPhase,
    everything: opts?.everything,
  });

  // Announce a newly-crossed devotion tier (metadata only — never replaces the
  // response message, so milestone/first-offering copy is preserved).
  const before = getDevotionTierIndex(prevCount);
  const after = getDevotionTierIndex(newCount);
  const tierUp = after > before ? DEVOTION_TIERS[after] : null;

  return {
    message: resp.message,
    isMilestone: resp.isMilestone,
    total: state.totalAmberSacrificed,
    count: newCount,
    tierUp,
  };
}

/**
 * Check if sacrifice is available (Phase 4+ only).
 */
export function isSacrificeAvailable(currentPhase: number): boolean {
  return currentPhase >= 4;
}

/**
 * Get suggested sacrifice amounts (the affordable subset).
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
  if (phase >= 5) {
    return {
      title: 'Give to the Pattern',
      subtitle: 'The amber returns to the quiet. This buys no item or ending. An active offering quest can return part of the amber.',
    };
  }
  if (phase >= 4) {
    return {
      title: 'Offer to the Arrangement',
      subtitle: 'The amber returns to the pattern. This buys no item or ending. An active offering quest can return part of the amber.',
    };
  }
  // Should not be visible before Phase 4, but just in case
  return {
    title: 'Offer Amber',
    subtitle: 'Why would you do this?',
  };
}

/**
 * The monument line: how much of the player's amber the arrangement now holds.
 * Phase-aware. The caller only shows it once at least one offering exists.
 */
export function getArrangementHoldsLine(total: number, phase: number): string {
  if (phase >= 5) {
    return `The arrangement holds ${total} amber of yours. It is at peace with the weight.`;
  }
  return `The arrangement holds ${total} amber of yours. It remembers every offering.`;
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

/** Whether the one-time Phase-4 offering invitation has been delivered. */
export async function hasSeenOfferingIntro(): Promise<boolean> {
  const state = await loadSacrificeState();
  return state.introSeen === true;
}

/** Mark the one-time Phase-4 offering invitation delivered (rides the synced
 *  sacrifice state, so it follows the player across devices and clears on Reset). */
export async function markOfferingIntroSeen(): Promise<void> {
  const state = await loadSacrificeState();
  state.introSeen = true;
  await saveSacrificeState(state);
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
 * Get total amber sacrificed this week (for weekly quest tracking).
 */
export async function getWeeklySacrificeTotal(): Promise<number> {
  const state = await loadSacrificeState();
  const now = new Date();
  // Calculate start of current week (Monday)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayMs = monday.getTime();

  return state.sacrificeHistory
    .filter(entry => entry.timestamp >= mondayMs)
    .reduce((sum, entry) => sum + entry.amount, 0);
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
