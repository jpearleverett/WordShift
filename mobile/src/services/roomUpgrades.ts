/**
 * Room upgrade system — amber sink for post-unlock engagement.
 *
 * Each room has one purchasable upgrade (cosmetic enhancement + unique dialogue line).
 * Available at Phase 2+ to maintain mid-game amber demand.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';

const STORAGE_KEY = 'wordshift_room_upgrades';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomUpgrade {
  roomId: string;
  name: string;
  description: string;
  cost: number;
  /** Phase-aware description shown when purchased at Phase 3+ */
  darkDescription?: string;
}

export interface RoomUpgradeState {
  /** Map of roomId → timestamp when the (tier-1) decoration was purchased */
  purchased: Record<string, number>;
  /** Map of roomId → timestamp when the (tier-2) "deepening" was purchased */
  deepened: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Upgrade definitions (1 per room)
// ---------------------------------------------------------------------------

export const ROOM_UPGRADES: RoomUpgrade[] = [
  {
    roomId: 'cozy_den',
    name: 'Hearthstone',
    description: 'A carved stone set before the fireplace. The flames burn a little brighter.',
    cost: 75,
    darkDescription: 'The stone pulses with warmth that isn\'t quite natural.',
  },
  {
    roomId: 'kitchen',
    name: 'Copper Pots',
    description: 'A set of gleaming copper pots hanging above the stove.',
    cost: 75,
    darkDescription: 'The pots hum when no one is cooking.',
  },
  {
    roomId: 'study',
    name: 'Gilded Globe',
    description: 'An antique globe on the desk, spinning slowly on its own.',
    cost: 100,
    darkDescription: 'The continents have shifted since yesterday.',
  },
  {
    roomId: 'aquarium',
    name: 'Bioluminescent Coral',
    description: 'Softly glowing coral that lights the water from within.',
    cost: 100,
    darkDescription: 'The coral pulses in time with something below.',
  },
  {
    roomId: 'jungle_room',
    name: 'Hanging Vines',
    description: 'Lush vines draping from the ceiling, flowers blooming year-round.',
    cost: 100,
    darkDescription: 'The vines reach toward the center of the house.',
  },
  {
    roomId: 'desert_room',
    name: 'Star Map',
    description: 'A hand-painted star chart on the tent ceiling.',
    cost: 100,
    darkDescription: 'The stars don\'t match any known constellation.',
  },
  {
    roomId: 'office',
    name: 'Standing Lamp',
    description: 'A warm brass lamp that never flickers.',
    cost: 125,
    darkDescription: 'The light casts shadows that don\'t match the furniture.',
  },
  {
    roomId: 'burrow',
    name: 'Crystal Formation',
    description: 'Crystals growing from the earthen walls, catching dim light.',
    cost: 125,
    darkDescription: 'The crystals vibrate at a frequency you can almost hear.',
  },
  {
    roomId: 'garden',
    name: 'Wind Chimes',
    description: 'Delicate chimes that ring in breezes only they can feel.',
    cost: 125,
    darkDescription: 'The chimes play a melody no one composed.',
  },
  {
    roomId: 'bamboo_attic',
    name: 'Paper Lanterns',
    description: 'Soft paper lanterns floating gently without any string.',
    cost: 150,
    darkDescription: 'The lanterns float higher when you\'re not looking.',
  },
];

// ---------------------------------------------------------------------------
// Tier-2 "deepenings" (1 per room) — a second, costlier enhancement that opens
// at Phase 3, filling the mid-game spend valley (~puzzle 130–155) after the
// tier-1 decorations are exhausted and before the Phase-4 climax. Cosmetic only
// (never progression). Copy leans into the growing dread — these are not cozy.
// ---------------------------------------------------------------------------

export const ROOM_DEEPENINGS: RoomUpgrade[] = [
  {
    roomId: 'cozy_den',
    name: 'Ashen Mantel',
    description: 'The hearth is reset in dark stone. The fire keeps a colder light.',
    cost: 175,
  },
  {
    roomId: 'kitchen',
    name: 'Salt Circle',
    description: 'A ring of salt poured around the table. Panko says it\'s for the bread.',
    cost: 175,
  },
  {
    roomId: 'study',
    name: 'Marginalia',
    description: 'Every book now carries the same handwriting in its margins. None remember writing it.',
    cost: 200,
  },
  {
    roomId: 'aquarium',
    name: 'Still Water',
    description: 'The tank no longer ripples. Axel watches it more than he used to.',
    cost: 200,
  },
  {
    roomId: 'jungle_room',
    name: 'Inward Bloom',
    description: 'The flowers have turned to face the center of the house, all of them, at once.',
    cost: 200,
  },
  {
    roomId: 'desert_room',
    name: 'New Constellation',
    description: 'A shape has been added to the star map. Fennick swears it wasn\'t there.',
    cost: 225,
  },
  {
    roomId: 'office',
    name: 'Second Shadow',
    description: 'The lamp throws two shadows now. Chill has filed the discrepancy and moved on.',
    cost: 225,
  },
  {
    roomId: 'burrow',
    name: 'Listening Crystals',
    description: 'The crystals have grown toward the surface. Warren leaves them be.',
    cost: 250,
  },
  {
    roomId: 'garden',
    name: 'Tuned Chimes',
    description: 'The chimes have settled on a single note. Thyme hums it without noticing.',
    cost: 250,
  },
  {
    roomId: 'bamboo_attic',
    name: 'Risen Lanterns',
    description: 'The lanterns hold near the rafters now, steady, like they\'re waiting. Bamboo is at peace with it.',
    cost: 300,
  },
];

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cache: RoomUpgradeState | null = null;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function loadState(): Promise<RoomUpgradeState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.purchased === 'object') {
        // Normalize: older saves predate the `deepened` map.
        cache = { purchased: parsed.purchased ?? {}, deepened: parsed.deepened ?? {} };
        return cache!;
      }
    }
  } catch { /* ignore */ }
  cache = { purchased: {}, deepened: {} };
  return cache;
}

async function saveState(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get the upgrade definition for a room, or undefined if none exists. */
export function getRoomUpgrade(roomId: string): RoomUpgrade | undefined {
  return ROOM_UPGRADES.find(u => u.roomId === roomId);
}

/** Check if a specific room has been upgraded. */
export async function isRoomUpgraded(roomId: string): Promise<boolean> {
  const state = await loadState();
  return roomId in state.purchased;
}

/** Get all purchased room upgrade IDs. */
export async function getPurchasedUpgrades(): Promise<Record<string, number>> {
  const state = await loadState();
  return { ...state.purchased };
}

/** Check if upgrades are available (Phase 2+). */
export function areUpgradesAvailable(phase: DialoguePhase): boolean {
  return (phase as number) >= 2;
}

/**
 * Purchase a room upgrade.
 * Returns true if successful, false if already purchased or upgrade doesn't exist.
 * Does NOT handle amber spending — caller must call spendAmber first.
 */
export async function purchaseRoomUpgrade(roomId: string): Promise<boolean> {
  const upgrade = getRoomUpgrade(roomId);
  if (!upgrade) return false;

  const state = await loadState();
  if (roomId in state.purchased) return false;

  state.purchased[roomId] = Date.now();
  await saveState();
  return true;
}

/** Get the phase-aware description for a room upgrade. */
export function getUpgradeDescription(roomId: string, phase: DialoguePhase): string {
  const upgrade = getRoomUpgrade(roomId);
  if (!upgrade) return '';
  if ((phase as number) >= 3 && upgrade.darkDescription) {
    return upgrade.darkDescription;
  }
  return upgrade.description;
}

// ---------------------------------------------------------------------------
// Tier-2 "deepening" API (mirrors the tier-1 functions above)
// ---------------------------------------------------------------------------

/** Get the deepening (tier-2) definition for a room, or undefined if none. */
export function getRoomDeepening(roomId: string): RoomUpgrade | undefined {
  return ROOM_DEEPENINGS.find(u => u.roomId === roomId);
}

/** Whether a room's deepening (tier-2) has been purchased. */
export async function isRoomDeepened(roomId: string): Promise<boolean> {
  const state = await loadState();
  return roomId in state.deepened;
}

/** All purchased deepening (tier-2) roomId → timestamp. */
export async function getDeepenedRooms(): Promise<Record<string, number>> {
  const state = await loadState();
  return { ...state.deepened };
}

/**
 * Deepenings open at Phase 2 — the same gate as the tier-1 decorations they
 * build on. This is deliberate: Phase 2 spans the ~puzzle 65–135 mid-game
 * valley, where the house has largely finished unlocking and amber starts to
 * pile up with nothing compelling to spend it on. Opening tier-1 AND tier-2 in
 * the same phase turns two discrete unlock cliffs into one continuous sink
 * (decorate a room, then deepen it) that keeps amber meaningful through the
 * valley and on into Phase 3 — deepenings never disappear, so slower-paced
 * players still find them waiting later. A deepening still requires the room's
 * tier-1 decoration first (see purchaseRoomDeepening), so the natural order
 * holds: dress the room before you deepen it.
 */
export function areDeepeningsAvailable(phase: DialoguePhase): boolean {
  return (phase as number) >= 2;
}

/**
 * Purchase a room's deepening (tier-2). Requires the tier-1 decoration to be in
 * place first (you deepen a room you've already dressed). Returns false if no
 * deepening exists, the tier-1 upgrade isn't purchased, or it's already bought.
 * Does NOT spend amber — caller must call spendAmber first (mirrors tier-1).
 */
export async function purchaseRoomDeepening(roomId: string): Promise<boolean> {
  const deepening = getRoomDeepening(roomId);
  if (!deepening) return false;

  const state = await loadState();
  if (!(roomId in state.purchased)) return false; // tier-1 required first
  if (roomId in state.deepened) return false;

  state.deepened[roomId] = Date.now();
  await saveState();
  return true;
}

/** Clear all room upgrade data (for Reset All Data). */
export async function clearRoomUpgrades(): Promise<void> {
  cache = { purchased: {}, deepened: {} };
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
