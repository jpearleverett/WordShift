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
  /** Map of roomId → timestamp when purchased */
  purchased: Record<string, number>;
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
        cache = parsed;
        return cache!;
      }
    }
  } catch { /* ignore */ }
  cache = { purchased: {} };
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

/** Clear all room upgrade data (for Reset All Data). */
export async function clearRoomUpgrades(): Promise<void> {
  cache = { purchased: {} };
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
