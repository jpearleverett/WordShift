import { Animal, Room, Unlockable, AnimalType, RoomTheme } from '../types/homeWorld';
import { loadProgress, unlockAnimal, unlockRoom, canAfford } from './amberCurrency';

/**
 * Default room definitions
 * Layout: 5 floors, some split into 2 rooms
 */
export const ROOMS: Room[] = [
  // Floor 4 (Top) - Bamboo Attic (full width)
  {
    id: 'bamboo_attic',
    name: 'Bamboo Attic',
    floor: 4,
    isUnlocked: true, // Starter
    theme: 'bamboo',
    animalId: 'red_panda',
    layoutPosition: { row: 0, col: 0 },
    backgroundColor: '#90EE90',
    accentColor: '#228B22',
  },

  // Floor 3 - Aquarium and Kitchen
  {
    id: 'aquarium',
    name: 'Aquarium Room',
    floor: 3,
    isUnlocked: false,
    theme: 'aquarium',
    animalId: 'axolotl',
    layoutPosition: { row: 1, col: 0 },
    backgroundColor: '#87CEEB',
    accentColor: '#4682B4',
  },
  {
    id: 'kitchen',
    name: 'Rustic Kitchen',
    floor: 3,
    isUnlocked: false,
    theme: 'kitchen',
    animalId: 'pangolin',
    layoutPosition: { row: 1, col: 1 },
    backgroundColor: '#D2691E',
    accentColor: '#8B4513',
  },

  // Floor 2 - Jungle and Desert
  {
    id: 'jungle_room',
    name: 'Jungle Hammock',
    floor: 2,
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
    floor: 2,
    isUnlocked: false,
    theme: 'desert',
    animalId: 'fennec_fox',
    layoutPosition: { row: 2, col: 1 },
    backgroundColor: '#F4A460',
    accentColor: '#DAA520',
  },

  // Floor 1 - Den and Study
  {
    id: 'cozy_den',
    name: 'Cozy Den',
    floor: 1,
    isUnlocked: false,
    theme: 'cozy_den',
    animalId: 'fox',
    layoutPosition: { row: 3, col: 0 },
    backgroundColor: '#CD853F',
    accentColor: '#8B4513',
  },
  {
    id: 'study',
    name: 'Scholar\'s Study',
    floor: 1,
    isUnlocked: false,
    theme: 'study',
    animalId: 'owl',
    layoutPosition: { row: 3, col: 1 },
    backgroundColor: '#4A4A6A',
    accentColor: '#2F2F4F',
  },

  // Floor 0 (Ground) - Office and Cave
  {
    id: 'office',
    name: 'Chill Office',
    floor: 0,
    isUnlocked: false,
    theme: 'office',
    animalId: 'capybara',
    layoutPosition: { row: 4, col: 0 },
    backgroundColor: '#708090',
    accentColor: '#2F4F4F',
  },
  {
    id: 'burrow',
    name: 'Underground Burrow',
    floor: 0,
    isUnlocked: false,
    theme: 'burrow',
    animalId: 'wombat',
    layoutPosition: { row: 4, col: 1 },
    backgroundColor: '#8B7355',
    accentColor: '#5C4033',
  },

  // Garden (Outdoor) - Ground level extension
  {
    id: 'garden',
    name: 'Garden Patio',
    floor: -1,
    isUnlocked: false,
    theme: 'garden',
    animalId: 'rabbit',
    layoutPosition: { row: 5, col: 0 },
    backgroundColor: '#98FB98',
    accentColor: '#228B22',
  },
];

/**
 * Default animal definitions
 */
export const ANIMALS: Animal[] = [
  {
    id: 'red_panda',
    type: 'red_panda',
    name: 'Bamboo',
    roomId: 'bamboo_attic',
    isUnlocked: true, // Starter
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 50, y: 50 },
    isWalking: false,
    direction: 'right',
  },
  {
    id: 'axolotl',
    type: 'axolotl',
    name: 'Axel',
    roomId: 'aquarium',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 40, y: 60 },
    isWalking: false,
    direction: 'right',
  },
  {
    id: 'pangolin',
    type: 'pangolin',
    name: 'Panko',
    roomId: 'kitchen',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 60, y: 50 },
    isWalking: false,
    direction: 'left',
  },
  {
    id: 'sloth',
    type: 'sloth',
    name: 'Sloane',
    roomId: 'jungle_room',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 50, y: 40 },
    isWalking: false,
    direction: 'right',
  },
  {
    id: 'fennec_fox',
    type: 'fennec_fox',
    name: 'Fennick',
    roomId: 'desert_room',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 55, y: 55 },
    isWalking: false,
    direction: 'left',
  },
  {
    id: 'fox',
    type: 'fox',
    name: 'Ember',
    roomId: 'cozy_den',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 45, y: 50 },
    isWalking: false,
    direction: 'right',
  },
  {
    id: 'owl',
    type: 'owl',
    name: 'Archimedes',
    roomId: 'study',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 60, y: 45 },
    isWalking: false,
    direction: 'left',
  },
  {
    id: 'capybara',
    type: 'capybara',
    name: 'Chill',
    roomId: 'office',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 50, y: 55 },
    isWalking: false,
    direction: 'right',
  },
  {
    id: 'wombat',
    type: 'wombat',
    name: 'Warren',
    roomId: 'burrow',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 55, y: 60 },
    isWalking: false,
    direction: 'left',
  },
  {
    id: 'rabbit',
    type: 'rabbit',
    name: 'Thyme',
    roomId: 'garden',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: true,
    lastInteraction: null,
    position: { x: 40, y: 50 },
    isWalking: false,
    direction: 'right',
  },
];

/**
 * Unlock progression order
 * Alternates: character -> room -> character -> room
 */
export const UNLOCK_PROGRESSION: Unlockable[] = [
  // Already unlocked: red_panda + bamboo_attic

  // First unlock tier (cheap)
  {
    id: 'unlock_axolotl',
    type: 'character',
    cost: 25,
    isUnlocked: false,
    order: 1,
    targetId: 'axolotl',
    name: 'Axel the Axolotl',
    description: 'A dreamy creature who never grew up',
  },
  {
    id: 'unlock_aquarium',
    type: 'room',
    cost: 40,
    isUnlocked: false,
    order: 2,
    targetId: 'aquarium',
    name: 'Aquarium Room',
    description: 'A watery haven for aquatic friends',
  },

  // Second unlock tier
  {
    id: 'unlock_pangolin',
    type: 'character',
    cost: 50,
    isUnlocked: false,
    order: 3,
    targetId: 'pangolin',
    name: 'Panko the Pangolin',
    description: 'A chef who curls into philosophical balls',
  },
  {
    id: 'unlock_kitchen',
    type: 'room',
    cost: 65,
    isUnlocked: false,
    order: 4,
    targetId: 'kitchen',
    name: 'Rustic Kitchen',
    description: 'Where comfort food meets existential recipes',
  },

  // Third unlock tier
  {
    id: 'unlock_sloth',
    type: 'character',
    cost: 75,
    isUnlocked: false,
    order: 5,
    targetId: 'sloth',
    name: 'Sloane the Sloth',
    description: 'Moves slowly, thinks deeply',
  },
  {
    id: 'unlock_jungle',
    type: 'room',
    cost: 90,
    isUnlocked: false,
    order: 6,
    targetId: 'jungle_room',
    name: 'Jungle Hammock',
    description: 'A verdant retreat for slow contemplation',
  },

  // Fourth unlock tier
  {
    id: 'unlock_fennec',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 7,
    targetId: 'fennec_fox',
    name: 'Fennick the Fennec Fox',
    description: 'Hears everything, understands too much',
  },
  {
    id: 'unlock_desert',
    type: 'room',
    cost: 120,
    isUnlocked: false,
    order: 8,
    targetId: 'desert_room',
    name: 'Desert Camp',
    description: 'Sandy silence under watchful stars',
  },

  // Fifth unlock tier
  {
    id: 'unlock_fox',
    type: 'character',
    cost: 140,
    isUnlocked: false,
    order: 9,
    targetId: 'fox',
    name: 'Ember the Fox',
    description: 'Keeper of flames and fading hopes',
  },
  {
    id: 'unlock_den',
    type: 'room',
    cost: 160,
    isUnlocked: false,
    order: 10,
    targetId: 'cozy_den',
    name: 'Cozy Den',
    description: 'Warm on the outside, cold within',
  },

  // Sixth unlock tier
  {
    id: 'unlock_owl',
    type: 'character',
    cost: 180,
    isUnlocked: false,
    order: 11,
    targetId: 'owl',
    name: 'Archimedes the Owl',
    description: 'Read every book, found no answers',
  },
  {
    id: 'unlock_study',
    type: 'room',
    cost: 200,
    isUnlocked: false,
    order: 12,
    targetId: 'study',
    name: 'Scholar\'s Study',
    description: 'Knowledge weighs heavy here',
  },

  // Seventh unlock tier
  {
    id: 'unlock_capybara',
    type: 'character',
    cost: 225,
    isUnlocked: false,
    order: 13,
    targetId: 'capybara',
    name: 'Chill the Capybara',
    description: 'Appears calm, screaming internally',
  },
  {
    id: 'unlock_office',
    type: 'room',
    cost: 250,
    isUnlocked: false,
    order: 14,
    targetId: 'office',
    name: 'Chill Office',
    description: 'Productivity is a myth we all believe',
  },

  // Eighth unlock tier
  {
    id: 'unlock_wombat',
    type: 'character',
    cost: 275,
    isUnlocked: false,
    order: 15,
    targetId: 'wombat',
    name: 'Warren the Wombat',
    description: 'Digs deep, finds what shouldn\'t be found',
  },
  {
    id: 'unlock_burrow',
    type: 'room',
    cost: 300,
    isUnlocked: false,
    order: 16,
    targetId: 'burrow',
    name: 'Underground Burrow',
    description: 'Below everything, something stirs',
  },

  // Final unlock tier
  {
    id: 'unlock_rabbit',
    type: 'character',
    cost: 350,
    isUnlocked: false,
    order: 17,
    targetId: 'rabbit',
    name: 'Thyme the Rabbit',
    description: 'Running from what cannot be outrun',
  },
  {
    id: 'unlock_garden',
    type: 'room',
    cost: 400,
    isUnlocked: false,
    order: 18,
    targetId: 'garden',
    name: 'Garden Patio',
    description: 'Where endings bloom like flowers',
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
 * Check if an unlock is available (previous unlocks done, animal unlocked for room)
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

  // For room unlocks, check if the animal for that room is unlocked
  if (unlock.type === 'room') {
    const animalId = getAnimalForRoom(unlock.targetId);
    if (animalId && !progress.unlockedAnimals.includes(animalId)) {
      const animal = ANIMALS.find(a => a.id === animalId);
      return {
        available: false,
        reason: `Must unlock ${animal?.name || 'the animal'} first`,
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
