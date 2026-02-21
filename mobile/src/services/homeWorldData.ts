import { Animal, Room, Unlockable, AnimalType, RoomTheme, DialoguePhase, getAnimalPhase } from '../types/homeWorld';
import { loadProgress, unlockAnimal, unlockRoom, canAfford } from './amberCurrency';
import { getTotalDialogueCount } from './animalDialogue';
import { isOnCooldown } from './dialogueSession';

// ============================================================================
// PHASE-AWARE ROOM DESCRIPTIONS
// The house is a temple. Each room is a chamber. Descriptions evolve with phase.
// ============================================================================

/**
 * Phase-aware room descriptions. At Phase 0 they're cozy and inviting.
 * By Phase 4, the temple reveals itself.
 */
export const ROOM_DESCRIPTIONS: Record<string, Record<number, string>> = {
  cozy_den: {
    0: 'A warm den with a crackling fireplace. Home.',
    1: 'The fire has burned here for a long time. Ember tends it carefully.',
    2: 'The flames cast shadows that move independently. Ember watches them.',
    3: 'The fire burns without fuel now. Ember says it feeds on something else.',
    4: 'The first chamber. Where the oracle reads the flames. The fire never goes out.',
  },
  kitchen: {
    0: 'A cozy space where friends gather around good food.',
    1: 'Panko is always cooking something. The recipes get more complex.',
    2: 'The hearth burns constantly now. Panko says the fire must not go out.',
    3: 'The kitchen smells of things that have no names. Panko follows a recipe from nowhere.',
    4: 'The preparation chamber. The ovens have been repurposed. Something else is being prepared.',
  },
  study: {
    0: 'A quiet place for deep thoughts and many books.',
    1: 'Archimedes reads all day. Some books seem to read themselves.',
    2: 'The books have rearranged. Archimedes says they found their proper order.',
    3: 'One book remains open at all times. Archimedes will not say which page.',
    4: 'The chamber of knowledge. The text that summoned this was always here. In the letters.',
  },
  aquarium: {
    0: 'A watery haven full of wonder and floating things.',
    1: 'The water is deeper than it should be. Axel dives and surfaces hours later.',
    2: 'Something moves below Axel. In the deepest part. Where light does not reach.',
    3: 'The water has gone dark. Axel says what\'s below is friendly. That should worry you.',
    4: 'The scrying pool. Axel sees through the water into the space between. The medium\'s chamber.',
  },
  jungle_room: {
    0: 'A verdant retreat with vines, hammock, and lazy afternoons.',
    1: 'The vines grow faster than they should. Sloane does not seem to mind.',
    2: 'The jungle thickens. The hammock hangs lower. Time moves differently here.',
    3: 'The vines have woven patterns. The same pattern as the one in Archimedes\' book.',
    4: 'The chamber of patience. Sloane waited longer than anyone. The vines know the arrangement.',
  },
  desert_room: {
    0: 'Sandy silence under watchful stars. A peaceful camp.',
    1: 'Fennick hears things at night. Not animals. Not wind. Something else.',
    2: 'The desert sand has arranged itself into circles while Fennick sleeps.',
    3: 'The stars visible from here have shifted. They now form the same pattern.',
    4: 'The listening chamber. Fennick heard it first. The frequency of what approaches.',
  },
  office: {
    0: 'A tidy workspace where everything has its place.',
    1: 'Chill organizes compulsively. The files have an order that feels deliberate.',
    2: 'The filing system connects to something. Every puzzle you solved has a folder.',
    3: 'Chill\'s spreadsheets track the arrangement. Every word. Every shift. Catalogued.',
    4: 'The administration chamber. Chill coordinated everything. The unshakable calm of certainty.',
  },
  burrow: {
    0: 'An underground home carved with care. Cozy and safe.',
    1: 'Warren\'s tunnels are deeper than a wombat needs. He keeps digging.',
    2: 'The tunnels connect to something below the house. Warren found it accidentally.',
    3: 'Below everything, something stirs. Warren built the path to it.',
    4: 'The foundation chamber. Warren built the connection to what sleeps below. The burrow reaches it.',
  },
  garden: {
    0: 'A beautiful garden patio with flowers and afternoon tea.',
    1: 'The flowers grow in patterns Thyme didn\'t plant. She pretends not to notice.',
    2: 'The garden is arranged in concentric circles. Like a target. Or a sigil.',
    3: 'Flowers bloom and die in minutes. The cycle accelerates. Something feeds on it.',
    4: 'The growth chamber. Where endings bloom like flowers. Thyme watches with terrible peace.',
  },
  bamboo_attic: {
    0: 'The highest room. Peaceful bamboo and sky views.',
    1: 'The bamboo sways without wind. Bamboo meditates on this. Always.',
    2: 'From up here, you can see the shadow in the sky. Bamboo says it has always been there.',
    3: 'The highest room is closest to what gathers above. Bamboo breathes with it.',
    4: 'The apex chamber. The spiritual leader\'s seat. Ten rooms below, one sky above. The arrangement complete.',
  },
};

/**
 * Get the phase-appropriate description for a room
 */
export function getRoomDescription(roomId: string, phase: DialoguePhase): string {
  const descriptions = ROOM_DESCRIPTIONS[roomId];
  if (!descriptions) return '';
  // Find the highest phase description at or below the current phase
  for (let p = phase; p >= 0; p--) {
    if (descriptions[p]) return descriptions[p];
  }
  return descriptions[0] || '';
}

/**
 * Default room definitions
 * Layout: single-column building that grows upward
 * Each room occupies its own row, stacked vertically
 */
export const ROOMS: Room[] = [
  // Row 0 (Ground Floor)
  {
    id: 'cozy_den',
    name: 'Cozy Den',
    floor: 0,
    isUnlocked: true, // Starter room (empty at first)
    theme: 'cozy_den',
    animalId: 'fox',
    layoutPosition: { row: 0, col: 0 },
    backgroundColor: '#CD853F',
    accentColor: '#8B4513',
  },

  // Row 1
  {
    id: 'kitchen',
    name: 'Rustic Kitchen',
    floor: 1,
    isUnlocked: false,
    theme: 'kitchen',
    animalId: 'pangolin',
    layoutPosition: { row: 1, col: 0 },
    backgroundColor: '#D2691E',
    accentColor: '#8B4513',
  },

  // Row 2
  {
    id: 'study',
    name: 'Scholar\'s Study',
    floor: 2,
    isUnlocked: false,
    theme: 'study',
    animalId: 'owl',
    layoutPosition: { row: 2, col: 0 },
    backgroundColor: '#4A4A6A',
    accentColor: '#2F2F4F',
  },

  // Row 3
  {
    id: 'aquarium',
    name: 'Aquarium Room',
    floor: 3,
    isUnlocked: false,
    theme: 'aquarium',
    animalId: 'axolotl',
    layoutPosition: { row: 3, col: 0 },
    backgroundColor: '#87CEEB',
    accentColor: '#4682B4',
  },

  // Row 4
  {
    id: 'jungle_room',
    name: 'Jungle Hammock',
    floor: 4,
    isUnlocked: false,
    theme: 'jungle',
    animalId: 'sloth',
    layoutPosition: { row: 4, col: 0 },
    backgroundColor: '#32CD32',
    accentColor: '#006400',
  },

  // Row 5
  {
    id: 'desert_room',
    name: 'Desert Camp',
    floor: 5,
    isUnlocked: false,
    theme: 'desert',
    animalId: 'fennec_fox',
    layoutPosition: { row: 5, col: 0 },
    backgroundColor: '#F4A460',
    accentColor: '#DAA520',
  },

  // Row 6
  {
    id: 'office',
    name: 'Chill Office',
    floor: 6,
    isUnlocked: false,
    theme: 'office',
    animalId: 'capybara',
    layoutPosition: { row: 6, col: 0 },
    backgroundColor: '#708090',
    accentColor: '#2F4F4F',
  },

  // Row 7
  {
    id: 'burrow',
    name: 'Underground Burrow',
    floor: 7,
    isUnlocked: false,
    theme: 'burrow',
    animalId: 'wombat',
    layoutPosition: { row: 7, col: 0 },
    backgroundColor: '#8B7355',
    accentColor: '#5C4033',
  },

  // Row 8
  {
    id: 'garden',
    name: 'Garden Patio',
    floor: 8,
    isUnlocked: false,
    theme: 'garden',
    animalId: 'rabbit',
    layoutPosition: { row: 8, col: 0 },
    backgroundColor: '#98FB98',
    accentColor: '#228B22',
  },

  // Row 9 (Top Floor)
  {
    id: 'bamboo_attic',
    name: 'Bamboo Attic',
    floor: 9,
    isUnlocked: false,
    theme: 'bamboo',
    animalId: 'red_panda',
    layoutPosition: { row: 9, col: 0 },
    backgroundColor: '#90EE90',
    accentColor: '#228B22',
  },
];

/**
 * Default animal definitions
 * Animals are unlocked one at a time - first animal is invited into the starter room
 */
export const ANIMALS: Animal[] = [
  // First animal to invite (ground floor - cozy_den)
  {
    id: 'fox',
    type: 'fox',
    name: 'Ember',
    roomId: 'cozy_den',
    isUnlocked: false, // Must be invited first!
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 45, y: 50 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 1 - Kitchen
  {
    id: 'pangolin',
    type: 'pangolin',
    name: 'Panko',
    roomId: 'kitchen',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 60, y: 50 },
    isWalking: false,
    direction: 'left',
  },
  // Floor 2 - Study
  {
    id: 'owl',
    type: 'owl',
    name: 'Archimedes',
    roomId: 'study',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 60, y: 45 },
    isWalking: false,
    direction: 'left',
  },
  // Floor 3 - Aquarium
  {
    id: 'axolotl',
    type: 'axolotl',
    name: 'Axel',
    roomId: 'aquarium',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 40, y: 60 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 4 - Jungle
  {
    id: 'sloth',
    type: 'sloth',
    name: 'Sloane',
    roomId: 'jungle_room',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 50, y: 40 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 5 - Desert
  {
    id: 'fennec_fox',
    type: 'fennec_fox',
    name: 'Fennick',
    roomId: 'desert_room',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 55, y: 55 },
    isWalking: false,
    direction: 'left',
  },
  // Floor 6 - Office
  {
    id: 'capybara',
    type: 'capybara',
    name: 'Chill',
    roomId: 'office',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 50, y: 55 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 7 - Burrow
  {
    id: 'wombat',
    type: 'wombat',
    name: 'Warren',
    roomId: 'burrow',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 55, y: 60 },
    isWalking: false,
    direction: 'left',
  },
  // Floor 8 - Garden
  {
    id: 'rabbit',
    type: 'rabbit',
    name: 'Thyme',
    roomId: 'garden',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 40, y: 50 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 9 - Bamboo Attic (Top)
  {
    id: 'red_panda',
    type: 'red_panda',
    name: 'Bamboo',
    roomId: 'bamboo_attic',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 50, y: 50 },
    isWalking: false,
    direction: 'right',
  },
];

/**
 * Unlock progression order
 * Flow: invite animal → build next room → invite animal → build room
 * Building grows from ground floor up
 */
export const UNLOCK_PROGRESSION: Unlockable[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // EARLY GAME (Puzzles 1-50) - Quick unlocks to hook the player
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. First: Invite Ember the Fox into the starter room (FREE!)
  {
    id: 'unlock_fox',
    type: 'character',
    cost: 0, // Free to start the journey
    isUnlocked: false,
    order: 1,
    targetId: 'fox',
    name: 'Ember the Fox',
    description: 'A wandering fox looking for a warm home',
  },

  // 2. Build the Kitchen above
  {
    id: 'unlock_kitchen',
    type: 'room',
    cost: 50,
    isUnlocked: false,
    order: 2,
    targetId: 'kitchen',
    name: 'Rustic Kitchen',
    description: 'A cozy space for culinary adventures',
  },

  // 3. Invite Panko the Pangolin
  {
    id: 'unlock_pangolin',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 3,
    targetId: 'pangolin',
    name: 'Panko the Pangolin',
    description: 'A chef who curls into philosophical balls',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EARLY-MID GAME (Puzzles 50-120) - Building momentum
  // ═══════════════════════════════════════════════════════════════════════════

  // 4. Build the Study
  {
    id: 'unlock_study',
    type: 'room',
    cost: 100,
    isUnlocked: false,
    order: 4,
    targetId: 'study',
    name: 'Scholar\'s Study',
    description: 'A quiet place for deep thoughts',
  },

  // 5. Invite Archimedes the Owl
  {
    id: 'unlock_owl',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 5,
    targetId: 'owl',
    name: 'Archimedes the Owl',
    description: 'Read every book, still searching for answers',
  },

  // 6. Build the Aquarium
  {
    id: 'unlock_aquarium',
    type: 'room',
    cost: 140,
    isUnlocked: false,
    order: 6,
    targetId: 'aquarium',
    name: 'Aquarium Room',
    description: 'A watery haven full of wonder',
  },

  // 7. Invite Axel the Axolotl
  {
    id: 'unlock_axolotl',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 7,
    targetId: 'axolotl',
    name: 'Axel the Axolotl',
    description: 'A dreamy creature who never grew up',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MID GAME (Puzzles 120-200) - The house grows, darkness creeps in
  // ═══════════════════════════════════════════════════════════════════════════

  // 8. Build the Jungle Room
  {
    id: 'unlock_jungle',
    type: 'room',
    cost: 200,
    isUnlocked: false,
    order: 8,
    targetId: 'jungle_room',
    name: 'Jungle Hammock',
    description: 'A verdant retreat for slow contemplation',
    minPuzzles: 55,
  },

  // 9. Invite Sloane the Sloth
  {
    id: 'unlock_sloth',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 9,
    targetId: 'sloth',
    name: 'Sloane the Sloth',
    description: 'Moves slowly, thinks deeply',
  },

  // 10. Build the Desert Room
  {
    id: 'unlock_desert',
    type: 'room',
    cost: 225,
    isUnlocked: false,
    order: 10,
    targetId: 'desert_room',
    name: 'Desert Camp',
    description: 'Sandy silence under watchful stars',
    minPuzzles: 75,
  },

  // 11. Invite Fennick the Fennec Fox
  {
    id: 'unlock_fennec',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 11,
    targetId: 'fennec_fox',
    name: 'Fennick the Fennec Fox',
    description: 'Hears everything, understands too much',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LATE-MID GAME (Puzzles 200-280) - Existential dread intensifies
  // ═══════════════════════════════════════════════════════════════════════════

  // 12. Build the Office
  {
    id: 'unlock_office',
    type: 'room',
    cost: 275,
    isUnlocked: false,
    order: 12,
    targetId: 'office',
    name: 'Chill Office',
    description: 'Where productivity meets existential doubt',
    minPuzzles: 95,
  },

  // 13. Invite Chill the Capybara
  {
    id: 'unlock_capybara',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 13,
    targetId: 'capybara',
    name: 'Chill the Capybara',
    description: 'Appears calm, screaming internally',
  },

  // 14. Build the Burrow
  {
    id: 'unlock_burrow',
    type: 'room',
    cost: 250,  // Reduced from 325 to smooth unlock curve at puzzles 100-150
    isUnlocked: false,
    order: 14,
    targetId: 'burrow',
    name: 'Underground Burrow',
    description: 'Below everything, something stirs',
    minPuzzles: 115,
  },

  // 15. Invite Warren the Wombat
  {
    id: 'unlock_wombat',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 15,
    targetId: 'wombat',
    name: 'Warren the Wombat',
    description: 'Digs deep, finds what shouldn\'t be found',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // END GAME (Puzzles 280-350+) - Final revelations
  // ═══════════════════════════════════════════════════════════════════════════

  // 16. Build the Garden
  {
    id: 'unlock_garden',
    type: 'room',
    cost: 300,  // Reduced from 400 to smooth unlock curve at puzzles 100-150
    isUnlocked: false,
    order: 16,
    targetId: 'garden',
    name: 'Garden Patio',
    description: 'Where endings bloom like flowers',
    minPuzzles: 140,
  },

  // 17. Invite Thyme the Rabbit
  {
    id: 'unlock_rabbit',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 17,
    targetId: 'rabbit',
    name: 'Thyme the Rabbit',
    description: 'Running from what cannot be outrun',
  },

  // 18. Build the Bamboo Attic (Top)
  {
    id: 'unlock_bamboo_attic',
    type: 'room',
    cost: 400,  // Reduced from 475 to smooth amber economy cliff at puzzles 140-170
    isUnlocked: false,
    order: 18,
    targetId: 'bamboo_attic',
    name: 'Bamboo Attic',
    description: 'The highest place, closest to the sky',
    minPuzzles: 170,
  },

  // 19. Invite Bamboo the Red Panda (FINAL UNLOCK)
  {
    id: 'unlock_red_panda',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 19,
    targetId: 'red_panda',
    name: 'Bamboo the Red Panda',
    description: 'Zen master seeking inner peace at the top',
  },
];

/**
 * Get the next available unlock (respects unlock sequence)
 */
export async function getNextUnlock(): Promise<Unlockable | null> {
  const progress = await loadProgress();

  for (const unlock of UNLOCK_PROGRESSION) {
    const isTargetUnlocked = unlock.type === 'character'
      ? progress.unlockedAnimals.includes(unlock.targetId)
      : progress.unlockedRooms.includes(unlock.targetId);

    if (!isTargetUnlocked) {
      // Check if this unlock is available
      const availability = await isUnlockAvailable(unlock.id);
      if (availability.available) {
        return unlock;
      }
      // If not available, return the first unavailable one anyway
      // so the UI can show what's next (even if blocked)
      return { ...unlock, isUnlocked: false };
    }
  }

  return null; // Everything unlocked
}

/**
 * Get all unlocks with their current status
 */
export async function getUnlockStatus(): Promise<Unlockable[]> {
  const progress = await loadProgress();

  return UNLOCK_PROGRESSION.map(unlock => ({
    ...unlock,
    isUnlocked: unlock.type === 'character'
      ? progress.unlockedAnimals.includes(unlock.targetId)
      : progress.unlockedRooms.includes(unlock.targetId),
  }));
}

/**
 * Get the animal associated with a room
 */
function getAnimalForRoom(roomId: string): string | null {
  const room = ROOMS.find(r => r.id === roomId);
  return room?.animalId || null;
}

/**
 * Check if an unlock is available
 * Flow: invite animal → build room → invite animal → build room
 * For the first animal, the room already exists
 */
export async function isUnlockAvailable(unlockId: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  const progress = await loadProgress();
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);

  if (!unlock) {
    return { available: false, reason: 'Invalid unlock ID' };
  }

  // Check if already unlocked
  const isTargetUnlocked = unlock.type === 'character'
    ? progress.unlockedAnimals.includes(unlock.targetId)
    : progress.unlockedRooms.includes(unlock.targetId);

  if (isTargetUnlocked) {
    return { available: false, reason: 'Already unlocked' };
  }

  // Check if all previous unlocks are done
  const previousUnlocks = UNLOCK_PROGRESSION.filter(u => u.order < unlock.order);
  for (const prev of previousUnlocks) {
    const isPrevUnlocked = prev.type === 'character'
      ? progress.unlockedAnimals.includes(prev.targetId)
      : progress.unlockedRooms.includes(prev.targetId);

    if (!isPrevUnlocked) {
      return {
        available: false,
        reason: `Must unlock ${prev.name} first`,
      };
    }
  }

  // Check puzzle-count gate (prevents house speed-running)
  if (unlock.minPuzzles !== undefined && progress.puzzlesSolved < unlock.minPuzzles) {
    return {
      available: false,
      reason: `Complete ${unlock.minPuzzles} puzzles first (${progress.puzzlesSolved} so far)`,
    };
  }

  // For character unlocks, check if the room exists
  if (unlock.type === 'character') {
    const animal = ANIMALS.find(a => a.id === unlock.targetId);
    if (animal && !progress.unlockedRooms.includes(animal.roomId)) {
      const room = ROOMS.find(r => r.id === animal.roomId);
      return {
        available: false,
        reason: `Must build ${room?.name || 'the room'} first`,
      };
    }
  }

  return { available: true };
}

/**
 * Attempt to purchase an unlock
 */
export async function purchaseUnlock(unlockId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock) {
    return { success: false, error: 'Invalid unlock ID' };
  }

  // Check if unlock is available (sequence validation)
  const availability = await isUnlockAvailable(unlockId);
  if (!availability.available) {
    return { success: false, error: availability.reason };
  }

  const affordable = await canAfford(unlock.cost);
  if (!affordable) {
    return { success: false, error: 'Not enough amber' };
  }

  let success: boolean;
  if (unlock.type === 'character') {
    success = await unlockAnimal(unlock.targetId, unlock.cost);
  } else {
    success = await unlockRoom(unlock.targetId, unlock.cost);
  }

  return { success };
}

/**
 * Get rooms with unlock status
 */
export async function getRoomsWithStatus(): Promise<Room[]> {
  const progress = await loadProgress();

  return ROOMS.map(room => ({
    ...room,
    isUnlocked: progress.unlockedRooms.includes(room.id),
  }));
}

/**
 * Get animals with unlock status and saved dialogue progress
 */
export async function getAnimalsWithStatus(): Promise<Animal[]> {
  const progress = await loadProgress();

  return ANIMALS.map(animal => {
    const unlocked = progress.unlockedAnimals.includes(animal.id);
    const dialogueIndex = progress.lastDialogueRead[animal.id] ?? 0;

    // Compute hasNewDialogue: true when animal has unread dialogue and is available
    let hasNewDialogue = false;
    if (unlocked && !isOnCooldown(animal.id)) {
      const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
      const totalDialogues = getTotalDialogueCount(animal.type, animalPhase);
      hasNewDialogue = dialogueIndex < totalDialogues;
    }

    return {
      ...animal,
      isUnlocked: unlocked,
      currentDialogueIndex: dialogueIndex,
      hasNewDialogue,
    };
  });
}

/**
 * Get total unlock progress
 */
export async function getUnlockProgress(): Promise<{
  unlockedCount: number;
  totalCount: number;
  percentage: number;
}> {
  const progress = await loadProgress();
  const totalCount = UNLOCK_PROGRESSION.length;
  const unlockedCount = progress.unlockedAnimals.length + progress.unlockedRooms.length - 1; // Subtract starter room (cozy_den is pre-unlocked)

  return {
    unlockedCount: Math.max(0, unlockedCount),
    totalCount,
    percentage: Math.round((unlockedCount / totalCount) * 100),
  };
}

/**
 * Room theme colors for rendering
 */
export const ROOM_THEME_COLORS: Record<RoomTheme, {
  bg: string;
  accent: string;
  floor: string;
  wall: string;
}> = {
  bamboo: { bg: '#90EE90', accent: '#228B22', floor: '#DEB887', wall: '#98FB98' },
  aquarium: { bg: '#87CEEB', accent: '#4682B4', floor: '#4169E1', wall: '#ADD8E6' },
  kitchen: { bg: '#D2691E', accent: '#8B4513', floor: '#A0522D', wall: '#DEB887' },
  jungle: { bg: '#32CD32', accent: '#006400', floor: '#8B4513', wall: '#228B22' },
  desert: { bg: '#F4A460', accent: '#DAA520', floor: '#DEB887', wall: '#FFE4B5' },
  cozy_den: { bg: '#CD853F', accent: '#8B4513', floor: '#8B4513', wall: '#D2691E' },
  study: { bg: '#4A4A6A', accent: '#2F2F4F', floor: '#8B4513', wall: '#696969' },
  office: { bg: '#708090', accent: '#2F4F4F', floor: '#A9A9A9', wall: '#778899' },
  burrow: { bg: '#8B7355', accent: '#5C4033', floor: '#6B4423', wall: '#A0522D' },
  garden: { bg: '#98FB98', accent: '#228B22', floor: '#90EE90', wall: '#87CEEB' },
};

/**
 * Animal emoji for simple representation
 */
export const ANIMAL_EMOJIS: Record<AnimalType, string> = {
  red_panda: '🐼',
  axolotl: '🦎',
  pangolin: '🦔',
  sloth: '🦥',
  fennec_fox: '🦊',
  fox: '🦊',
  owl: '🦉',
  capybara: '🦫',
  wombat: '🐻',
  rabbit: '🐰',
};
