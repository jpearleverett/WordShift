/**
 * Room upgrade system — amber sink for post-unlock engagement.
 *
 * Three tiers per room, all opening at Phase 2+ to maintain mid-game amber
 * demand: a tier-1 decoration, a tier-2 "deepening" (requires tier-1), and
 * three tier-3 "attunement" levels (require tier-1, not the deepening).
 */

import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { invalidateProgressCache, loadProgress, spendAmber } from './amberCurrency';
import { DialoguePhase } from '../types/homeWorld';
import { ANIMALS } from './homeWorldData';

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
  /** Map of roomId → timestamp when the (tier-1) decoration was given */
  purchased: Record<string, number>;
  /** Map of roomId → timestamp when the (tier-2) "deepening" was given */
  deepened: Record<string, number>;
  /** Map of roomId → attunement level reached (0..3; missing = 0) */
  attunements: Record<string, number>;
  /** Paid gifts, retained after giving until the resident's reaction finishes. */
  pendingGifts: HouseUpgradeGift[];
}

export interface RoomAttunement {
  roomId: string;
  /** Flavor copy for attunement levels 1..3 (Kindled / Humming / Attuned). */
  descriptions: [string, string, string];
}

/** What the next attunement purchase for a room looks like. */
export interface RoomAttunementInfo {
  /** The attunement level this purchase reaches (1..3). */
  level: number;
  cost: number;
  name: string;
  description: string;
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
  {
    roomId: 'star_loft',
    name: "Moth Lantern",
    description: "A glass lantern hung unlit at the rail. The moths circle it anyway.",
    cost: 150,
    darkDescription: "Some nights the lantern glows without being lit. The moths never touch the glass.",
  },
  {
    roomId: 'belfry',
    name: "Chalk Circles",
    description: "Small neat chalk rings mark the low woodwork. Tock says every good survey deserves a fair copy.",
    cost: 150,
    darkDescription: "The circles are rounder in the mornings than they were the night before.",
  },
  {
    roomId: 'sky_garden',
    name: "Moonflower Bed",
    description: "A bed of pale flowers that open only for the moon.",
    cost: 150,
    darkDescription: "The moonflowers open at noon now, all facing straight up.",
  },
];

// ---------------------------------------------------------------------------
// Tier-2 "deepenings" (1 per room) — a second, costlier enhancement that opens
// at Phase 2 (the same gate as the tier-1 decorations it builds on), filling the
// ~puzzle 45–95 mid-game spend valley as one continuous sink (decorate, then
// deepen). Requires the room's tier-1 decoration first; never disappears, so
// slower players still find it later. Cosmetic only (never progression). Copy
// leans into the growing dread — these are not cozy.
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
  {
    roomId: 'star_loft',
    name: "The Lit Hour",
    description: "The lantern burns one hour a night now, on its own schedule. Vesper watches it the way she watches everything. Completely.",
    cost: 300,
  },
  {
    roomId: 'belfry',
    name: "Waking Bronze",
    description: "The bell hums at dawn now, unstruck. Tock says she is only clearing her throat.",
    cost: 300,
  },
  {
    roomId: 'sky_garden',
    name: "Upturned Blooms",
    description: "The moonflowers have stopped waiting for the moon. Moss thanks them each dusk for their patience.",
    cost: 300,
  },
];

// ---------------------------------------------------------------------------
// Tier-3 "attunements" (3 levels per room) — the repeatable-ish room-investment
// tier that keeps amber meaningful once decorations and deepenings are bought.
// Opens at Phase 2 (the same gate as deepenings) and requires only the room's
// tier-1 decoration (NOT the deepening), so it runs alongside the deepening as
// one continuous sink: 150/200/250 per level, 600 per room, 7,800 all-in.
// Fiction: each level attunes the room's ambient presence a shade further.
// Purchased strictly in order (the level is a counter). Cosmetic only — the
// room renderer consumes RoomView's synchronous computeEmbellishmentIntensity
// mirror (fed by the maps HomeScreen loads); getRoomEmbellishmentIntensity()
// below is the async service-side equivalent (kept as the canonical formula,
// covered by tests).
// ---------------------------------------------------------------------------

export const ATTUNEMENT_LEVEL_NAMES: readonly string[] = ['Kindled', 'Humming', 'Attuned'];
export const ATTUNEMENT_COSTS: readonly number[] = [150, 200, 250];
export const MAX_ATTUNEMENT_LEVEL = 3;

export const ROOM_ATTUNEMENTS: RoomAttunement[] = [
  {
    roomId: 'cozy_den',
    descriptions: [
      'The fire leans toward the hearthstone now, as if listening. Ember pretends not to notice.',
      'On quiet nights the hearth carries a low note under the crackle. Ember says all good fires sing.',
      'The flames keep the same shape no matter the wood. Ember watches them the whole night through.',
    ],
  },
  {
    roomId: 'kitchen',
    descriptions: [
      'The bread rises fuller beneath the copper pots. Panko takes it as a compliment.',
      'The copper pots ring together now, softly, all on one note. Panko stirs in time.',
      'Every dish comes out perfect, always, exactly. Panko has stopped tasting for salt.',
    ],
  },
  {
    roomId: 'study',
    descriptions: [
      'The books open to the same page now, whichever shelf they came from. Archimedes calls it good indexing.',
      'The globe turns a little faster when someone reads aloud. Archimedes reads aloud more often.',
      'The marginalia has started answering his notes. Archimedes writes back, carefully, in his best hand.',
    ],
  },
  {
    roomId: 'aquarium',
    descriptions: [
      'The coral light reaches farther across the floor each week. Axel floats in it for hours.',
      'A slow current has started in the still water, always circling the same way. Axel drifts with it.',
      'The water holds a reflection that lags half a second behind. Axel waves to it every morning.',
    ],
  },
  {
    roomId: 'jungle_room',
    descriptions: [
      'New shoots grow in straight lines now, all of them. Sloane says the room has made up its mind.',
      'The leaves tremble together in the still air, in perfect time. Sloane finds it restful.',
      'The vines have woven themselves into one continuous knot. Sloane knew the shape before it finished.',
    ],
  },
  {
    roomId: 'desert_room',
    descriptions: [
      'The painted stars glimmer a little after dark. Fennick logs each one that wakes.',
      'The star map whispers like moving sand. Fennick listens with both ears, which is saying something.',
      'The new constellation has grown three more stars. Fennick did not paint them, and he is fine with that.',
    ],
  },
  {
    roomId: 'office',
    descriptions: [
      'The lamp warms the corner it faces before anyone turns it on. Chill appreciates the initiative.',
      'The paperwork sorts itself overnight into an order Chill did not choose. He has adopted the new system.',
      'His shadow stirs a moment before Chill does. He finds it efficient.',
    ],
  },
  {
    roomId: 'burrow',
    descriptions: [
      'The crystals glow faintly when someone speaks kindly. Warren has taken to greeting them.',
      'The earth around the crystals is warm now, like ground above a deep hearth. Warren checks the foundation and finds it perfect.',
      'The crystals repeat the last word said in the room, hours later, very softly. Warren keeps his words gentle.',
    ],
  },
  {
    roomId: 'garden',
    descriptions: [
      'The flowers turn to follow visitors around the patio. Thyme waters them a little faster than she used to.',
      'The chimes answer their single note with a second, lower one. Thyme hears it in her sleep.',
      'The garden holds still when the chimes play, every petal, every blade. Thyme holds still too. It seems polite.',
    ],
  },
  {
    roomId: 'bamboo_attic',
    descriptions: [
      'The lanterns dim and brighten in a slow rhythm, like breathing. Bamboo matches their own breath to it.',
      'The bamboo canes knock together in a pattern too regular for wind. Bamboo calls it the house keeping time.',
      'The lanterns have arranged themselves into a circle at the rafters. Bamboo sits beneath its center, at peace.',
    ],
  },
  {
    roomId: 'star_loft',
    descriptions: [
      'The moths fly in slow circles now, all in the same direction. Vesper counts their turns without blinking.',
      'The moths gather earlier each week. Vesper adjusts her watching accordingly.',
      'Between the stars there is a place the lantern light bends toward. Vesper has seen it. She says the loft sees it too.',
    ],
  },
  {
    roomId: 'belfry',
    descriptions: [
      'The chalk circles stay crisp through dust and drafts. Tock taps each one on his rounds and nods.',
      'The bell\'s hum has spread into the floorboards. Tock walks the belfry heel to toe, mapping where she carries.',
      'The whole tower rings faintly when the wind is right. One note, hers. Tock says she is nearly ready to speak.',
    ],
  },
  {
    roomId: 'sky_garden',
    descriptions: [
      'The moonflowers glow a little at dusk now, before any moon. Moss thanks them anyway.',
      'A low boom rolls through the garden some nights, though Moss says it was not him. He sounds pleased about it.',
      'The blooms have opened as far as they go and stayed there, facing up, patient. Moss booms once each dusk. Something far off answers.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Surface copy: what a tier actually CHANGES on screen.
// The tier descriptions above are fiction (copper pots, a spinning globe); a
// player who bought one looked for the pots and found a faint glow, and the
// report was "I don't see them show up in the game". RoomView now draws the
// promised object from its shop art, so each tier also gets one plain line
// naming the pixels it adds, for the shop card to render under the flavour.
// Phase-aware register, never the word for the stage itself, no dashes.
// ---------------------------------------------------------------------------

export type HouseUpgradeTier = 1 | 2 | 3;

const HOUSE_UPGRADE_SURFACE_LINES: Record<HouseUpgradeTier, { bright: string; dark: string; serene: string }> = {
  1: {
    bright: 'The object appears in the room and its light grows. The plaque gains a lantern pip.',
    dark: 'The object takes its place in the room and the light leans toward it. The plaque keeps a lit pip.',
    serene: 'The object rests in the room and its light stays. The plaque keeps a lantern pip.',
  },
  2: {
    bright: 'The decoration changes with the room. Faint marks appear on the walls.',
    dark: 'The decoration changes with the room. Unfamiliar marks surface on the walls.',
    serene: 'The decoration has settled into its changed form. The wall marks remain.',
  },
  3: {
    bright: 'The glow widens with each level and the plaque gains a pip. At the last level, dust drifts.',
    dark: 'The glow widens with each level and the plaque gains a pip. At the last level, something drifts in the air.',
    serene: 'The glow widens with each level and the plaque gains a pip. At the last level, dust drifts, unhurried.',
  },
};

/**
 * One line naming what a house-upgrade tier visibly changes in its room
 * (tier 1 decoration, tier 2 deepening, tier 3 attunement). Phase-aware:
 * bright through the dusk, the house register once the shadows grow (3-4),
 * serene after the arrival (5). For the shop card, under the flavour copy.
 */
export function getHouseUpgradeSurfaceLine(tier: HouseUpgradeTier, phase: DialoguePhase): string {
  const lines = HOUSE_UPGRADE_SURFACE_LINES[tier] ?? HOUSE_UPGRADE_SURFACE_LINES[1];
  const p = phase as number;
  if (p >= 5) return lines.serene;
  if (p >= 3) return lines.dark;
  return lines.bright;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cache: RoomUpgradeState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateRoomUpgradeCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function loadState(): Promise<RoomUpgradeState> {
  if (cache) return cache;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) {
    cache = { purchased: {}, deepened: {}, attunements: {}, pendingGifts: [] };
    return cache;
  }
  const parsed = JSON.parse(stored);
  const validMap = (value: unknown, levels = false): boolean => !!value && typeof value === 'object' &&
    !Array.isArray(value) && Object.values(value).every(item => typeof item === 'number' &&
      Number.isFinite(item) && item >= 0 && (!levels || (Number.isInteger(item) && item <= MAX_ATTUNEMENT_LEVEL)));
  const pendingGifts: unknown = parsed?.pendingGifts === undefined ? [] : parsed.pendingGifts;
  if (!parsed || !validMap(parsed.purchased) || !validMap(parsed.deepened ?? {}) ||
      !validMap(parsed.attunements ?? {}, true) || !validPendingGifts(pendingGifts)) {
    throw new Error('Your room upgrades could not be read. Please try again.');
  }
  // Normalize legacy saves, but never mistake unreadable ownership for an
  // empty house and charge again for furniture the player already bought.
  // Existing ownership predates gift delivery and remains in place. Never
  // invent a new gift (or another charge) for a legacy purchase.
  cache = {
    purchased: parsed.purchased, deepened: parsed.deepened ?? {}, attunements: parsed.attunements ?? {},
    pendingGifts,
  };
  return cache;
}

const copyState = (state: RoomUpgradeState): RoomUpgradeState => ({
  purchased: { ...state.purchased }, deepened: { ...state.deepened }, attunements: { ...state.attunements },
  pendingGifts: state.pendingGifts.map(gift => ({ ...gift })),
});

async function saveState(next: RoomUpgradeState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  cache = next;
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
 * Grant a room upgrade without charging amber.
 * Returns true if successful, false if already purchased or upgrade doesn't exist.
 * Writes ownership only. Paid purchases must use purchaseHouseUpgrade so the
 * charge and pending gift share one durable commit.
 */
export async function purchaseRoomUpgrade(roomId: string): Promise<boolean> {
  const upgrade = getRoomUpgrade(roomId);
  if (!upgrade) return false;

  const state = await loadState();
  if (roomId in state.purchased) return false;

  const next = copyState(state);
  next.purchased[roomId] = Date.now();
  await saveState(next);
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
 * build on. This is deliberate: Phase 2 spans the ~puzzle 45–95 mid-game
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
 * Grant a room's deepening (tier-2) without charging amber. Requires the tier-1 decoration to be in
 * place first (you deepen a room you've already dressed). Returns false if no
 * deepening exists, the tier-1 upgrade isn't purchased, or it's already bought.
 * Writes ownership only. Use purchaseHouseUpgrade for an atomic paid purchase.
 */
export async function purchaseRoomDeepening(roomId: string): Promise<boolean> {
  const deepening = getRoomDeepening(roomId);
  if (!deepening) return false;

  const state = await loadState();
  if (!(roomId in state.purchased)) return false; // tier-1 required first
  if (roomId in state.deepened) return false;

  const next = copyState(state);
  next.deepened[roomId] = Date.now();
  await saveState(next);
  return true;
}

// ---------------------------------------------------------------------------
// Tier-3 "attunement" API (mirrors the tier-1/tier-2 functions above)
// ---------------------------------------------------------------------------

/** Get the attunement (tier-3) definition for a room, or undefined if none. */
export function getRoomAttunement(roomId: string): RoomAttunement | undefined {
  return ROOM_ATTUNEMENTS.find(a => a.roomId === roomId);
}

/** The attunement level a room has reached (0..3; 0 = not attuned). */
export async function getAttunementLevel(roomId: string): Promise<number> {
  const state = await loadState();
  return state.attunements[roomId] ?? 0;
}

/** All attuned roomId → level reached (rooms at level 0 are omitted). */
export async function getAttunedRooms(): Promise<Record<string, number>> {
  const state = await loadState();
  return { ...state.attunements };
}

/**
 * Attunements open at Phase 2 — the same gate as the deepenings, and for the
 * same reason: they extend the one continuous mid-game sink (decorate, then
 * deepen, then attune level by level) so amber stays meaningful long after the
 * house has finished unlocking. An attunement requires the room's tier-1
 * decoration first (see purchaseRoomAttunement) but deliberately NOT the
 * deepening, so both tiers stay purchasable side by side.
 */
export function areAttunementsAvailable(phase: DialoguePhase): boolean {
  return (phase as number) >= 2;
}

/**
 * Pure lookup: what the attunement purchase reaching `level` (1..3) looks like
 * for a room, or null if the room has no attunement or the level is out of
 * range. UI that already holds the current level map can build rows from this
 * without another storage read.
 */
export function getAttunementForLevel(roomId: string, level: number): RoomAttunementInfo | null {
  const attunement = getRoomAttunement(roomId);
  if (!attunement) return null;
  if (level < 1 || level > MAX_ATTUNEMENT_LEVEL) return null;
  return {
    level,
    cost: ATTUNEMENT_COSTS[level - 1],
    name: ATTUNEMENT_LEVEL_NAMES[level - 1],
    description: attunement.descriptions[level - 1],
  };
}

/**
 * The next attunement purchase available for a room: {level, cost, name,
 * description}, or null when the room has no attunement or is fully attuned.
 */
export async function getNextAttunementInfo(roomId: string): Promise<RoomAttunementInfo | null> {
  const current = await getAttunementLevel(roomId);
  return getAttunementForLevel(roomId, current + 1);
}

/**
 * Grant a room's next attunement level without charging amber (levels are strictly in order — the
 * stored level is a counter). Requires the tier-1 decoration first (like the
 * deepening; the deepening itself is NOT required). Returns false if no
 * attunement exists, the tier-1 upgrade isn't purchased, or the room is
 * already fully attuned.
 * Writes ownership only. Use purchaseHouseUpgrade for an atomic paid purchase.
 */
export async function purchaseRoomAttunement(roomId: string): Promise<boolean> {
  const attunement = getRoomAttunement(roomId);
  if (!attunement) return false;

  const state = await loadState();
  if (!(roomId in state.purchased)) return false; // tier-1 required first
  const current = state.attunements[roomId] ?? 0;
  if (current >= MAX_ATTUNEMENT_LEVEL) return false;

  const next = copyState(state);
  next.attunements[roomId] = current + 1;
  await saveState(next);
  return true;
}

export type HouseUpgradePurchase =
  | { roomId: string; tier: 1 }
  | { roomId: string; tier: 2 }
  | { roomId: string; tier: 3; level: number };

export type HouseUpgradeGift = HouseUpgradePurchase & {
  id: string;
  purchasedAt: number;
  /** The room changes on giving, but the receipt waits for its full reaction. */
  deliveredAt?: number;
};

function sameUpgrade(a: HouseUpgradePurchase, b: HouseUpgradePurchase): boolean {
  return a.roomId === b.roomId && a.tier === b.tier &&
    (a.tier !== 3 || (b.tier === 3 && a.level === b.level));
}

function validPendingGifts(value: unknown): value is HouseUpgradeGift[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const offers = new Set<string>();
  return value.every(gift => {
    if (!gift || typeof gift !== 'object' || typeof gift.id !== 'string' || !gift.id ||
        !getRoomUpgrade(gift.roomId) || ![1, 2, 3].includes(gift.tier) ||
        typeof gift.purchasedAt !== 'number' || !Number.isFinite(gift.purchasedAt) || gift.purchasedAt < 0 ||
        (gift.deliveredAt !== undefined && (typeof gift.deliveredAt !== 'number' ||
          !Number.isFinite(gift.deliveredAt) || gift.deliveredAt < 0)) ||
        (gift.tier === 3 && (!Number.isInteger(gift.level) ||
          gift.level < 1 || gift.level > MAX_ATTUNEMENT_LEVEL))) return false;
    const offer = `${gift.roomId}:${gift.tier}:${gift.tier === 3 ? gift.level : 0}`;
    if (ids.has(gift.id) || offers.has(offer)) return false;
    ids.add(gift.id);
    offers.add(offer);
    return true;
  });
}

export interface HouseUpgradePurchaseResult {
  success: boolean;
  newBalance: number;
  gift?: HouseUpgradeGift;
  reason?: 'already_owned' | 'already_pending' | 'unavailable' | 'not_enough_amber' | 'stale_offer';
}

/**
 * The paid shop path. Validate the exact offer before spending; the amber
 * balance, transaction ledger and pending gift then share one durable
 * commit. Room effects wait for an explicit gift to the resident. Retrying
 * an interrupted commit cannot buy a second copy or another attunement.
 * The three purchaseRoom* functions remain free-grant APIs for other callers.
 */
export async function purchaseHouseUpgrade(request: HouseUpgradePurchase): Promise<HouseUpgradePurchaseResult> {
  try {
    return await runStorageTransaction('house_upgrade_purchase', async () => {
      // Recovery runs before this callback, and may have completed the very
      // purchase being retried. Warm mirrors must not obscure that ownership.
      invalidateRoomUpgradeCache();
      invalidateProgressCache();
      const progress = await loadProgress();
      const state = await loadState();
      const refuse = (reason: HouseUpgradePurchaseResult['reason']): HouseUpgradePurchaseResult =>
        ({ success: false, newBalance: progress.amber, reason });
      const { roomId, tier } = request;
      if (![1, 2, 3].includes(tier) || !areUpgradesAvailable(progress.currentPhase) || !progress.unlockedRooms.includes(roomId)) {
        return refuse('unavailable');
      }
      const item = tier === 1 ? getRoomUpgrade(roomId) : tier === 2 ? getRoomDeepening(roomId) :
        Number.isInteger(request.level) ? getAttunementForLevel(roomId, request.level) : null;
      if (!item) return refuse('unavailable');
      const pending = state.pendingGifts.find(gift => sameUpgrade(gift, request));
      if (pending && pending.deliveredAt === undefined) {
        return { ...refuse('already_pending'), gift: { ...pending } };
      }
      if (tier === 1 && roomId in state.purchased) return refuse('already_owned');
      if (tier > 1 && !(roomId in state.purchased)) return refuse('unavailable');
      if (tier === 2 && roomId in state.deepened) return refuse('already_owned');
      if (tier === 3) {
        const current = state.attunements[roomId] ?? 0;
        if (request.level <= current) return refuse('already_owned');
        if (request.level !== current + 1) return refuse('stale_offer');
      }
      const source = tier === 1 ? `room_upgrade_${roomId}` : tier === 2 ? `room_deepening_${roomId}` : `attunement_${roomId}`;
      const spent = await spendAmber(item.cost, source);
      if (!spent.success) {
        if (spent.error === 'Not enough amber') return refuse('not_enough_amber');
        throw new Error('Another purchase is still saving. Please try again.');
      }
      const next = copyState(state);
      const purchasedAt = Date.now();
      const gift: HouseUpgradeGift = {
        ...request,
        id: `house_gift_${roomId}_${tier}_${tier === 3 ? request.level : 0}_${purchasedAt}_${Math.random().toString(36).slice(2)}`,
        purchasedAt,
      };
      next.pendingGifts.push(gift);
      // Do not publish a staged gift into the room cache before commit.
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { success: true, newBalance: spent.newBalance, gift: { ...gift } };
    });
  } finally {
    // A rejected journal write leaves the old save; a rejected apply leaves
    // recovery work. Neither may leak a warm, partially updated mirror.
    invalidateRoomUpgradeCache();
    invalidateProgressCache();
  }
}

/** Gifts waiting to be given, plus given gifts whose reaction is unfinished. */
export async function getPendingHouseUpgradeGifts(): Promise<HouseUpgradeGift[]> {
  const state = await loadState();
  return state.pendingGifts.map(gift => ({ ...gift }));
}

/**
 * Give one exact purchased gift. Applying its room effect and retaining the
 * reaction receipt is one durable commit; retries never advance another level.
 * A missing ID is a stale callback and cannot grant anything.
 */
export async function deliverHouseUpgradeGift(id: string): Promise<HouseUpgradeGift | null> {
  try {
    return await runStorageTransaction('house_upgrade_delivery', async () => {
      invalidateRoomUpgradeCache();
      invalidateProgressCache();
      const state = await loadState();
      const gift = state.pendingGifts.find(item => item.id === id);
      if (!gift) return null;
      if (gift.deliveredAt !== undefined) return { ...gift };
      const progress = await loadProgress();
      const resident = ANIMALS.find(animal => animal.roomId === gift.roomId);
      if (!resident || !progress.unlockedRooms.includes(gift.roomId) ||
          !progress.unlockedAnimals.includes(resident.id)) {
        throw new Error('Invite this resident before giving them their house upgrade.');
      }
      if (gift.tier > 1 && !(gift.roomId in state.purchased)) {
        throw new Error('Give this resident their decoration before this upgrade.');
      }
      const next = copyState(state);
      const deliveredAt = Date.now();
      if (gift.tier === 1) next.purchased[gift.roomId] ??= deliveredAt;
      else if (gift.tier === 2) next.deepened[gift.roomId] ??= deliveredAt;
      else {
        const current = state.attunements[gift.roomId] ?? 0;
        if (gift.level > current + 1) throw new Error('Give the earlier attunement before this one.');
        next.attunements[gift.roomId] = Math.max(current, gift.level);
      }
      const delivered: HouseUpgradeGift = { ...gift, deliveredAt };
      next.pendingGifts = next.pendingGifts.map(item => item.id === id ? delivered : item);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { ...delivered };
    });
  } finally {
    invalidateRoomUpgradeCache();
    invalidateProgressCache();
  }
}

/** Remove only the delivered gift whose resident reaction was completed. */
export async function acknowledgeHouseUpgradeGift(id: string): Promise<boolean> {
  try {
    return await runStorageTransaction('house_upgrade_reaction', async () => {
      invalidateRoomUpgradeCache();
      invalidateProgressCache();
      const state = await loadState();
      const gift = state.pendingGifts.find(item => item.id === id);
      if (!gift || gift.deliveredAt === undefined) return false;
      const next = copyState(state);
      next.pendingGifts = next.pendingGifts.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    });
  } finally {
    invalidateRoomUpgradeCache();
    invalidateProgressCache();
  }
}

/**
 * How embellished a room is, 0..1, for the wave-2 room renderer:
 * tier-1 decoration = 0.25, deepening = 0.25, attunements = 0.5 × level/3.
 * A fully decorated, deepened, and attuned room reads 1.0.
 */
export async function getRoomEmbellishmentIntensity(roomId: string): Promise<number> {
  const state = await loadState();
  let intensity = 0;
  if (roomId in state.purchased) intensity += 0.25;
  if (roomId in state.deepened) intensity += 0.25;
  const level = Math.min(state.attunements[roomId] ?? 0, MAX_ATTUNEMENT_LEVEL);
  intensity += 0.5 * (level / MAX_ATTUNEMENT_LEVEL);
  return Math.min(1, intensity);
}

/** Clear all room upgrade data (for Reset All Data). */
export async function clearRoomUpgrades(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  cache = { purchased: {}, deepened: {}, attunements: {}, pendingGifts: [] };
}
