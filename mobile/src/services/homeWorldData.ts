import { Animal, Room, Unlockable, AnimalType, RoomTheme } from '../types/homeWorld';
import { loadProgress, unlockAnimal, unlockRoom, canAfford } from './amberCurrency';

/**
 * Default room definitions
 * Layout: 2-column building that grows upward
 * Each row has 2 rooms side by side before going to next floor
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
  {
    id: 'kitchen',
    name: 'Rustic Kitchen',
    floor: 1,
    isUnlocked: false,
    theme: 'kitchen',
    animalId: 'pangolin',
    layoutPosition: { row: 0, col: 1 },
    backgroundColor: '#D2691E',
    accentColor: '#8B4513',
  },

  // Row 1
  {
    id: 'study',
    name: 'Scholar\'s Study',
    floor: 2,
    isUnlocked: false,
    theme: 'study',
    animalId: 'owl',
    layoutPosition: { row: 1, col: 0 },
    backgroundColor: '#4A4A6A',
    accentColor: '#2F2F4F',
  },
  {
    id: 'aquarium',
    name: 'Aquarium Room',
    floor: 3,
    isUnlocked: false,
    theme: 'aquarium',
    animalId: 'axolotl',
    layoutPosition: { row: 1, col: 1 },
    backgroundColor: '#87CEEB',
    accentColor: '#4682B4',
  },

  // Row 2
  {
    id: 'jungle_room',
    name: 'Jungle Hammock',
    floor: 4,
    isUnlocked: false,
    theme: 'jungle',
    animalId: 'sloth',
    layoutPosition: { row: 2, col: 0 },
    backgroundColor: '#32CD32',
    accentColor: '#006400',
  },
  {
    id: 'desert_room',
    name: 'Desert Camp',
    floor: 5,
    isUnlocked: false,
    theme: 'desert',
    animalId: 'fennec_fox',
    layoutPosition: { row: 2, col: 1 },
    backgroundColor: '#F4A460',
    accentColor: '#DAA520',
  },

  // Row 3
  {
    id: 'office',
    name: 'Chill Office',
    floor: 6,
    isUnlocked: false,
    theme: 'office',
    animalId: 'capybara',
    layoutPosition: { row: 3, col: 0 },
    backgroundColor: '#708090',
    accentColor: '#2F4F4F',
  },
  {
    id: 'burrow',
    name: 'Underground Burrow',
    floor: 7,
    isUnlocked: false,
    theme: 'burrow',
    animalId: 'wombat',
    layoutPosition: { row: 3, col: 1 },
    backgroundColor: '#8B7355',
    accentColor: '#5C4033',
  },

  // Row 4 (Top Floor)
  {
    id: 'garden',
    name: 'Garden Patio',
    floor: 8,
    isUnlocked: false,
    theme: 'garden',
    animalId: 'rabbit',
    layoutPosition: { row: 4, col: 0 },
    backgroundColor: '#98FB98',
    accentColor: '#228B22',
  },
  {
    id: 'bamboo_attic',
    name: 'Bamboo Attic',
    floor: 9,
    isUnlocked: false,
    theme: 'bamboo',
    animalId: 'red_panda',
    layoutPosition: { row: 4, col: 1 },
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    hasNewDialogue: true,
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
    cost: 30,
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
    cost: 25,
    isUnlocked: false,
    order: 3,
    targetId: 'pangolin',
    name: 'Panko the Pangolin',
    description: 'A chef who curls into philosophical balls',
  },

  // 4. Build the Study
  {
    id: 'unlock_study',
    type: 'room',
    cost: 50,
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
    cost: 40,
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
    cost: 75,
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
    cost: 50,
    isUnlocked: false,
    order: 7,
    targetId: 'axolotl',
    name: 'Axel the Axolotl',
    description: 'A dreamy creature who never grew up',
  },

  // 8. Build the Jungle Room
  {
    id: 'unlock_jungle',
    type: 'room',
    cost: 100,
    isUnlocked: false,
    order: 8,
    targetId: 'jungle_room',
    name: 'Jungle Hammock',
    description: 'A verdant retreat for slow contemplation',
  },

  // 9. Invite Sloane the Sloth
  {
    id: 'unlock_sloth',
    type: 'character',
    cost: 75,
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
    cost: 125,
    isUnlocked: false,
    order: 10,
    targetId: 'desert_room',
    name: 'Desert Camp',
    description: 'Sandy silence under watchful stars',
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

  // 12. Build the Office
  {
    id: 'unlock_office',
    type: 'room',
    cost: 150,
    isUnlocked: false,
    order: 12,
    targetId: 'office',
    name: 'Chill Office',
    description: 'Where productivity meets existential doubt',
  },

  // 13. Invite Chill the Capybara
  {
    id: 'unlock_capybara',
    type: 'character',
    cost: 125,
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
    cost: 175,
    isUnlocked: false,
    order: 14,
    targetId: 'burrow',
    name: 'Underground Burrow',
    description: 'Below everything, something stirs',
  },

  // 15. Invite Warren the Wombat
  {
    id: 'unlock_wombat',
    type: 'character',
    cost: 150,
    isUnlocked: false,
    order: 15,
    targetId: 'wombat',
    name: 'Warren the Wombat',
    description: 'Digs deep, finds what shouldn\'t be found',
  },

  // 16. Build the Garden
  {
    id: 'unlock_garden',
    type: 'room',
    cost: 200,
    isUnlocked: false,
    order: 16,
    targetId: 'garden',
    name: 'Garden Patio',
    description: 'Where endings bloom like flowers',
  },

  // 17. Invite Thyme the Rabbit
  {
    id: 'unlock_rabbit',
    type: 'character',
    cost: 175,
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
    cost: 250,
    isUnlocked: false,
    order: 18,
    targetId: 'bamboo_attic',
    name: 'Bamboo Attic',
    description: 'The highest place, closest to the sky',
  },

  // 19. Invite Bamboo the Red Panda
  {
    id: 'unlock_red_panda',
    type: 'character',
    cost: 200,
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
 * Get animals with unlock status
 */
export async function getAnimalsWithStatus(): Promise<Animal[]> {
  const progress = await loadProgress();

  return ANIMALS.map(animal => ({
    ...animal,
    isUnlocked: progress.unlockedAnimals.includes(animal.id),
  }));
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
  const unlockedCount = progress.unlockedAnimals.length + progress.unlockedRooms.length - 2; // Subtract starter room/animal

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
