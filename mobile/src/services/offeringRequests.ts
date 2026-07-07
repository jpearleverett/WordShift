/**
 * Animal Offering Requests (assessment §6 — "make the descent something the
 * player DOES").
 *
 * From Phase 2 on, each animal asks the player, once, to bring them a word with
 * a particular quality ("Bring me something with warmth in it"). The player
 * doesn't act on it directly — they just keep solving — but the ritual ledger
 * records every word they form, and when a word matching the animal's theme
 * turns up, the request is fulfilled. On the next visit the animal reacts by
 * name: "You brought me EMBER. I felt it." Complicity, enacted instead of
 * asserted.
 *
 * Deliberately lightweight: one lifetime request per animal, matched against a
 * curated theme word-set (biased toward the dread vocabulary the generator
 * favors at Phase 2+, so hits actually happen), delivered through the existing
 * dialogue flow. No progression gating — pure flavor.
 *
 * In-memory cache pattern; persisted under `wordshift_offering_requests`
 * (cloud-synced, cleared by Reset All).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_offering_requests';

/** Phase at/above which animals begin asking for offerings. */
export const OFFERING_REQUEST_MIN_PHASE = 2;

interface AnimalRequestDef {
  /** Short theme label (for tests / debugging). */
  theme: string;
  /** Uppercase words that fulfill the request. Curated per animal. */
  words: string[];
  /** The request line the animal speaks (phase-neutral; delivered Phase 2+). */
  requestLine: string;
  /** Fulfillment reaction; {word} is replaced with the delivered word. */
  fulfillTemplate: string;
}

// Each theme is tuned to the animal's cult role, and the word sets lean on the
// dread lexicon the generator steers toward at Phase 2+ (VOID, ASH, DREAD, ...)
// plus a few common words so a request is reachable within a normal session.
export const ANIMAL_REQUESTS: Record<AnimalType, AnimalRequestDef> = {
  fox: {
    theme: 'warmth',
    words: ['FLAME', 'EMBER', 'GLOW', 'WARM', 'FIRE', 'HEAT', 'ASH', 'COAL', 'BURN', 'SPARK', 'FLARE', 'CHAR'],
    requestLine: 'Bring me something with warmth in it. The fire wants feeding.',
    fulfillTemplate: 'You brought me {word}. I felt it move through the flames. Thank you.',
  },
  pangolin: {
    theme: 'sustenance',
    words: ['BREAD', 'FEAST', 'SALT', 'HERB', 'SPICE', 'MEAT', 'ROOT', 'BROTH', 'GRAIN', 'STEW', 'RIPE', 'FEED'],
    requestLine: 'Offer me something to prepare. Something with substance. The table must be set.',
    fulfillTemplate: 'You gave me {word}. It will go in the pot. The offering takes shape.',
  },
  owl: {
    theme: 'knowledge',
    words: ['LORE', 'RUNE', 'TEXT', 'WORD', 'TOME', 'READ', 'SAGE', 'OMEN', 'GLYPH', 'RITE', 'CODE', 'SIGN'],
    requestLine: 'Find me a word that KNOWS something. The text is missing a piece.',
    fulfillTemplate: 'You found {word}. It fits the gap in the text. We are closer to reading it whole.',
  },
  axolotl: {
    theme: 'water',
    words: ['TIDE', 'POOL', 'DEEP', 'WAVE', 'FLOW', 'MIST', 'RAIN', 'WELL', 'DROWN', 'DAMP', 'FLOOD', 'BRINE'],
    requestLine: 'Give me something wet, something deep. The water shows me more when it is fed.',
    fulfillTemplate: 'You sent {word} into the water. The surface rippled, and I saw... something. Thank you.',
  },
  capybara: {
    theme: 'order',
    words: ['PLAN', 'LIST', 'RANK', 'ORDER', 'TALLY', 'SORT', 'MARK', 'FILE', 'INDEX', 'COUNT', 'ROTA', 'GRID'],
    requestLine: 'Bring me a word about ORDER. The arrangement must be catalogued properly.',
    fulfillTemplate: 'You logged {word}. It is filed correctly now. Everything in its place.',
  },
  fennec_fox: {
    theme: 'sound',
    words: ['ECHO', 'HUSH', 'TONE', 'CALL', 'WAIL', 'DRONE', 'PEAL', 'RING', 'HUM', 'MOAN', 'KNELL', 'CHIME'],
    requestLine: 'Bring me a word that makes a SOUND. I need to be sure of what I am hearing.',
    fulfillTemplate: 'You sent me {word}. Yes. That is the sound. It is closer than it was. Thank you.',
  },
  sloth: {
    theme: 'stillness',
    words: ['SLOW', 'WAIT', 'DUSK', 'REST', 'DREAM', 'CALM', 'STILL', 'DRIFT', 'FADE', 'DOZE', 'LULL', 'SETTLE'],
    requestLine: 'No hurry. But when you can... bring me something STILL. Something that waits.',
    fulfillTemplate: 'You brought me {word}. I have been holding it a long while already. Thank you.',
  },
  wombat: {
    theme: 'earth',
    words: ['STONE', 'DIRT', 'ROOT', 'CLAY', 'DUST', 'DELVE', 'GRAVE', 'MUD', 'ORE', 'CAVE', 'LOAM', 'SILT'],
    requestLine: 'Dig me up a word from the EARTH. The foundation always needs more.',
    fulfillTemplate: 'You brought me {word}. Down it goes, into the foundation. It holds a little better now.',
  },
  rabbit: {
    theme: 'unease',
    words: ['DREAD', 'PANIC', 'FLEE', 'HIDE', 'SHAKE', 'FEAR', 'START', 'THORN', 'CHILL', 'GASP', 'QUAKE', 'FROST'],
    requestLine: 'I... I need to know it is not just me. Bring me a word that feels AFRAID.',
    fulfillTemplate: 'You brought me {word}. So you feel it too. I am not imagining it. That is almost a comfort.',
  },
  red_panda: {
    theme: 'emptiness',
    words: ['VOID', 'HUSH', 'REST', 'STILL', 'CALM', 'EMPTY', 'BLANK', 'HOLLOW', 'PEACE', 'MUTE', 'NULL', 'ZERO'],
    requestLine: 'When you are ready, bring me something EMPTY. There is peace in the hollow places.',
    fulfillTemplate: 'You brought me {word}. Yes. Rest in it a moment. There is nothing to fear in the empty. Thank you.',
  },
};

interface RequestState {
  /** Whether the animal has already SPOKEN its request (asked once, not per visit). */
  requested?: boolean;
  /** The word that fulfilled this animal's request (null = unfulfilled). */
  fulfilledWord: string | null;
  /** Whether the animal has already reacted to the fulfillment in dialogue. */
  acknowledged: boolean;
}

type StoreShape = Partial<Record<AnimalType, RequestState>>;

let cache: StoreShape | null = null;

async function load(): Promise<StoreShape> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cache = stored ? JSON.parse(stored) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

async function save(state: StoreShape): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical.
  }
}

/** Test/reset helper — drop the in-memory cache. */
export function _clearOfferingRequestsCache(): void {
  cache = null;
}

/** Clear all offering-request state for Settings → Reset All. */
export async function clearOfferingRequests(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical.
  }
}

/**
 * Record the words the player just formed and fulfill any animal's outstanding
 * request that they match. A request is only fulfillable AFTER the animal has
 * asked (state.requested) — the loop is ask, then deliver, then react — so
 * words formed before ever meeting the animal don't retroactively count. Only
 * the FIRST matching word sticks per animal. Returns animals newly fulfilled.
 */
export async function recordOfferingFulfillment(formedWords: string[]): Promise<AnimalType[]> {
  if (!formedWords || formedWords.length === 0) return [];
  const upper = formedWords.map(w => w.toUpperCase());
  const state = await load();
  const newlyFulfilled: AnimalType[] = [];

  for (const animal of Object.keys(ANIMAL_REQUESTS) as AnimalType[]) {
    const existing = state[animal];
    if (!existing?.requested) continue; // hasn't asked yet
    if (existing.fulfilledWord) continue; // already fulfilled
    const match = upper.find(w => ANIMAL_REQUESTS[animal].words.includes(w));
    if (match) {
      state[animal] = { ...existing, fulfilledWord: match, acknowledged: false };
      newlyFulfilled.push(animal);
    }
  }

  if (newlyFulfilled.length > 0) {
    await save(state);
  }
  return newlyFulfilled;
}

export interface OfferingDialogue {
  kind: 'request' | 'fulfillment';
  line: string;
}

/**
 * The offering-request line to weave into this animal's dialogue this visit, or
 * null. Requires Phase >= OFFERING_REQUEST_MIN_PHASE. Each call delivers at most
 * one line and marks it consumed, so a request is ASKED once and a fulfillment
 * REACTED to once — never a per-visit repeat:
 *  - `fulfillment` (once) when a request was fulfilled but not yet acknowledged;
 *  - else `request` (once) if the animal hasn't asked yet;
 *  - else null (already asked and waiting, or fulfilled and acknowledged).
 */
export async function takeOfferingDialogue(
  animal: AnimalType,
  phase: DialoguePhase,
  allowRequest: boolean = true
): Promise<OfferingDialogue | null> {
  if (phase < OFFERING_REQUEST_MIN_PHASE) return null;
  const def = ANIMAL_REQUESTS[animal];
  if (!def) return null;
  const state = await load();
  const entry = state[animal];

  if (entry?.fulfilledWord) {
    if (entry.acknowledged) return null; // done forever
    // Deliver the fulfillment reaction once, then mark acknowledged.
    state[animal] = { ...entry, acknowledged: true };
    await save(state);
    return { kind: 'fulfillment', line: def.fulfillTemplate.replace('{word}', entry.fulfilledWord) };
  }

  // Unfulfilled: ask exactly once. Never CONSUME the request unless the caller
  // will actually show it (allowRequest) — otherwise it'd be marked asked but
  // lost behind higher-priority dialogue this visit.
  if (entry?.requested || !allowRequest) return null;
  state[animal] = { requested: true, fulfilledWord: null, acknowledged: false };
  await save(state);
  return { kind: 'request', line: def.requestLine };
}

/** Whether the animal has an outstanding (unfulfilled) request at this phase. */
export async function hasOutstandingRequest(animal: AnimalType, phase: DialoguePhase): Promise<boolean> {
  if (phase < OFFERING_REQUEST_MIN_PHASE) return false;
  const state = await load();
  return !state[animal]?.fulfilledWord;
}
