import { Animal, Room, Unlockable, AnimalType, RoomTheme, DialoguePhase, getAnimalPhase, LATE_PHASE_RECRUITS } from '../types/homeWorld';
import { loadProgress, unlockAnimal, unlockRoom, canAfford, markDialogueRead, reserveUnlock, getReservedUnlockId, claimReservedUnlock, spendAmber } from './amberCurrency';
import { getPhaseStartIndex, phase2PoolHasNew, resolveDialogueIndex } from './dialogue/animalDialogueBase';
import { getPhase2PoolCursors } from './dialogue/animalDialogueNarrative';
import { getTotalDialogueCount } from './animalDialogue';
import { isOnCooldown } from './dialogueSession';
import { logEvent } from './eventLogger';
import { loadTendingState } from './tending';
import { loadChoiceState } from './dialogueChoices';
import { getPhase5PoolLength } from './dialogue/phase5Pool';
import { UNLOCK_SKIP_PREMIUM, PHASE_THRESHOLDS } from '../constants/gameBalance';

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
    4: 'The apex chamber. The spiritual leader\'s seat. The rooms below, one sky above. The arrangement complete.',
  },
  star_loft: {
    0: 'A snug loft beneath a wide window full of stars.',
    1: 'Vesper watches the sky for hours up here. Some of the stars seem to watch back.',
    2: 'The stars over the loft have begun to rearrange. Vesper keeps a careful chart.',
    3: 'One patch of sky stays empty no matter the season. Vesper never looks away from it.',
    4: 'The watching chamber. Vesper counted the lights going out. The empty patch is closer now.',
  },
  belfry: {
    0: 'A quiet tower room with an old bell and a fine echo.',
    1: 'Tock taps the beams and listens. The tower answers in little knocks.',
    2: 'The bell hums on its own some nights. Tock says something below is tuning it.',
    3: 'The hollow places in the walls have grown. Tock maps them, knock by knock.',
    4: 'The sounding chamber. Every hollow is a throat. When the bell rings, the house will speak.',
  },
  sky_garden: {
    0: 'A rooftop garden open to the wind. Green and bright.',
    1: 'Moss tends the beds at night. The plants seem to prefer it that way.',
    2: 'The moss up here grows in rings now. Moss walks them slowly, counting.',
    3: 'The garden leans toward the sky the way roots lean toward water.',
    4: 'The crown chamber. The highest green. What descends will touch the garden first.',
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

  // Row 9
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

  // Row 10
  {
    id: 'star_loft',
    name: 'Star Loft',
    floor: 10,
    isUnlocked: false,
    theme: 'star_loft',
    animalId: 'tarsier',
    layoutPosition: { row: 10, col: 0 },
    backgroundColor: '#483D8B',
    accentColor: '#2B2350',
  },

  // Row 11
  {
    id: 'belfry',
    name: 'Belfry',
    floor: 11,
    isUnlocked: false,
    theme: 'belfry',
    animalId: 'aye_aye',
    layoutPosition: { row: 11, col: 0 },
    backgroundColor: '#8B8378',
    accentColor: '#4F4A42',
  },

  // Row 12 (Top Floor)
  {
    id: 'sky_garden',
    name: 'Sky Garden',
    floor: 12,
    isUnlocked: false,
    theme: 'sky_garden',
    animalId: 'kakapo',
    layoutPosition: { row: 12, col: 0 },
    backgroundColor: '#8FBC8F',
    accentColor: '#2E8B57',
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
  // Floor 9 - Bamboo Attic
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
  // Floor 10 - Star Loft
  {
    id: 'tarsier',
    type: 'tarsier',
    name: 'Vesper',
    roomId: 'star_loft',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 45, y: 50 },
    isWalking: false,
    direction: 'right',
  },
  // Floor 11 - Belfry
  {
    id: 'aye_aye',
    type: 'aye_aye',
    name: 'Tock',
    roomId: 'belfry',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 55, y: 50 },
    isWalking: false,
    direction: 'left',
  },
  // Floor 12 - Sky Garden (Top)
  {
    id: 'kakapo',
    type: 'kakapo',
    name: 'Moss',
    roomId: 'sky_garden',
    isUnlocked: false,
    currentDialogueIndex: 0,
    hasNewDialogue: false,
    hasSeenIntro: false,
    lastInteraction: null,
    position: { x: 50, y: 55 },
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
  // EARLY GAME (Puzzles 1-8) - Quick unlocks to hook the player
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
  // EARLY-MID GAME (Puzzles ~8-19) - Building momentum
  // ═══════════════════════════════════════════════════════════════════════════

  // 4. Build the Study
  {
    id: 'unlock_study',
    type: 'room',
    cost: 75,  // Reduced from 100 to compress 2-animal window (Fox+Pangolin only) from ~15 to ~10 puzzles
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
  // MID GAME (Puzzles ~19-74) - The house grows, darkness creeps in.
  // These gates are spread across the Phase 1→3 window so the house keeps
  // growing through the mid-game instead of completing early and leaving the
  // climb to the climax with no new investment. Under the 2026-07 compressed
  // pacing the original ten rooms top out at the Bamboo Attic (74), late in
  // Deeper Questions (Phase 3 floor 62); the high rooms then carry investment
  // through the reveal (~90) to completion/recruit around 96-100. The
  // eight-win dwell completes around 104-108, arming waits for 115, the final
  // board is ~116, and post-revelation is ~117-122.
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
    minPuzzles: 19,
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
    minPuzzles: 29,
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
  // LATE-MID GAME (Puzzles ~60-95) - Existential dread intensifies
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
    minPuzzles: 41,
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
    minPuzzles: 53,
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
  // LATE GAME (Puzzles ~65-74) - The original house tops out just past the
  // Phase 3 floor (62); the high rooms below then carry investment onward
  // through the reveal.
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
    minPuzzles: 65,
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
    minPuzzles: 74,
  },

  // 19. Invite Bamboo the Red Panda
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

  // ═══════════════════════════════════════════════════════════════════════════
  // THE HIGH ROOMS (Puzzles ~84-92) - The house keeps growing above what was
  // once its top, through late Growing Shadows and past the reveal (~90). The
  // gates sit at/past the Phase 3 weighted threshold (PHASE_THRESHOLDS[3] =
  // 84), which the LATE_PHASE_RECRUITS derivation (types/homeWorld.ts) leans
  // on. The gates alone do NOT prove it though: a shared-challenge win pays +1
  // solve and +0 weighted progress, so the Phase-3 floor for the trio is
  // ENFORCED explicitly in isUnlockAvailable rather than implied by the
  // gates. The Sky Garden gate at 92 completes the
  // house/recruits Moss around 96-100. The eight-win dwell completes around
  // 104-108, arming waits for 115, the final board is ~116, and
  // post-revelation is ~117-122.
  // ═══════════════════════════════════════════════════════════════════════════

  // 20. Build the Star Loft
  {
    id: 'unlock_star_loft',
    type: 'room',
    cost: 450,
    isUnlocked: false,
    order: 20,
    targetId: 'star_loft',
    name: 'Star Loft',
    description: 'A high window for watching the night arrive',
    minPuzzles: 84,
  },

  // 21. Invite Vesper the Tarsier
  {
    id: 'unlock_tarsier',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 21,
    targetId: 'tarsier',
    name: 'Vesper the Tarsier',
    description: 'Eyes wide enough to hold the whole night',
  },

  // 22. Build the Belfry
  {
    id: 'unlock_belfry',
    type: 'room',
    cost: 500,
    isUnlocked: false,
    order: 22,
    targetId: 'belfry',
    name: 'Belfry',
    description: 'A silent bell waiting for its hour',
    minPuzzles: 88,
  },

  // 23. Invite Tock the Aye-Aye
  {
    id: 'unlock_aye_aye',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 23,
    targetId: 'aye_aye',
    name: 'Tock the Aye-Aye',
    description: 'Knocks on the world and hears what knocks back',
  },

  // 24. Build the Sky Garden
  {
    id: 'unlock_sky_garden',
    type: 'room',
    cost: 550,
    isUnlocked: false,
    order: 24,
    targetId: 'sky_garden',
    name: 'Sky Garden',
    description: 'A garden grown where only sky should be',
    minPuzzles: 92,
  },

  // 25. Invite Moss the Kakapo (FINAL UNLOCK)
  {
    id: 'unlock_kakapo',
    type: 'character',
    cost: 100,
    isUnlocked: false,
    order: 25,
    targetId: 'kakapo',
    name: 'Moss the Kakapo',
    description: 'Grounded and patient, waiting on the sky',
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

  // NARRATIVE GUARD (descent trio): the LATE_PHASE_RECRUITS derivation rests on
  // "the trio's 84/88/92 solve gates imply global Phase 3", which in turn rests
  // on weighted phase progress never trailing raw solves. Shared-challenge
  // boards break exactly that: they pay full amber but +0 phase progress
  // (skipPhaseProgress), so ~25 friend-link wins inside the first 84 solves put
  // a player at 84 solves with weighted progress still under the Phase-3
  // threshold — the Star Loft opens, Vesper arrives under a dusk sky delivering
  // Phase-3 dread, and her catch-up boost (which needs global Phase 3) never
  // applies. Gate on the WEIGHTED number, which is what the derivation actually
  // wants (see isDescentTrioHeld for why it is not `currentPhase`). A no-op for
  // anyone who has never won a shared-challenge board.
  if (isDescentTrioHeld(unlock, progress)) {
    return { available: false, reason: getDescentTrioNotReadyText() };
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

/**
 * Animals unlocked at Phase 2+ skip ahead instead of replaying bright-days
 * small talk under a dark sky. The descent trio starts at its CURRENT effective
 * animal phase because its mandatory phase-aware catch-up intro already
 * summarizes the earlier arc; replaying another whole block strands its late
 * dialogue before the finale. Earlier recruits retain the prior one-phase-back
 * behavior. Never rewinds an existing read position.
 *
 * Floor at phase 1: a lagging-tier animal unlocked at global Phase 2 has
 * animalPhase 1, so "one phase behind" used to compute 0 and its dark catch-up
 * intro was followed by bright Phase-0 small talk under a dusk sky. Once this
 * fast-forward applies at all (global Phase 2+), no animal starts below the
 * Curious Thoughts block. Vanguard/middle tiers are unaffected (their
 * animalPhase - 1 is already >= 1 whenever this runs).
 */
async function fastForwardLateUnlockDialogue(animalId: string): Promise<void> {
  const progress = await loadProgress();
  if (progress.currentPhase < 2) return;

  const animalType = animalId as AnimalType;
  const animalPhase = getAnimalPhase(progress.currentPhase, animalType);
  const startPhase = LATE_PHASE_RECRUITS.has(animalType)
    ? animalPhase
    : Math.max(1, animalPhase - 1) as DialoguePhase;
  const startIndex = getPhaseStartIndex(animalType, startPhase);
  const existing = progress.lastDialogueRead[animalId] ?? 0;
  if (startIndex > existing) {
    await markDialogueRead(animalId, startIndex);
  }
}

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
    if (success) {
      await fastForwardLateUnlockDialogue(unlock.targetId);
    }
  } else {
    success = await unlockRoom(unlock.targetId, unlock.cost);
  }

  if (success) {
    logEvent({
      type: 'unlock_purchased',
      data: {
        unlockId: unlock.id,
        unlockType: unlock.type,
        targetId: unlock.targetId,
        cost: unlock.cost,
      },
    });
  }

  return { success };
}

/**
 * Whether an unlock can be RESERVED right now: it's the legitimate next unlock
 * (all previous done), it's blocked ONLY by its puzzle-count gate, the player
 * can afford it, and nothing else is already reserved. Reserving is the
 * pay-now / build-when-the-gate-opens path for skilled earners.
 */
export async function canReserveUnlock(unlockId: string): Promise<boolean> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock || unlock.minPuzzles === undefined) return false;

  const progress = await loadProgress();
  if (progress.reservedUnlockId) return false; // one reservation at a time

  // Must be blocked solely by the puzzle gate.
  if (progress.puzzlesSolved >= unlock.minPuzzles) return false;

  // All previous unlocks must be done (it's genuinely the next thing).
  const previous = UNLOCK_PROGRESSION.filter(u => u.order < unlock.order);
  for (const prev of previous) {
    const done = prev.type === 'character'
      ? progress.unlockedAnimals.includes(prev.targetId)
      : progress.unlockedRooms.includes(prev.targetId);
    if (!done) return false;
  }

  // Must be able to afford it.
  return progress.amber >= unlock.cost;
}

/**
 * Reserve a puzzle-gated unlock (pays now). Returns success + the new balance.
 */
export async function reserveNextUnlock(unlockId: string): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock) return { success: false, error: 'Invalid unlock ID' };
  if (!(await canReserveUnlock(unlockId))) {
    return { success: false, error: 'Cannot reserve this unlock right now' };
  }
  const result = await reserveUnlock(unlockId, unlock.cost);
  if (result.success) {
    logEvent({ type: 'unlock_purchased', data: { unlockId: unlock.id, targetId: unlock.targetId, cost: unlock.cost, reserved: true } });
  }
  return { success: result.success, newBalance: result.newBalance, error: result.error };
}

/**
 * Amber cost to SKIP a level-gated unlock's puzzle requirement and unlock it
 * immediately: the build cost plus UNLOCK_SKIP_PREMIUM.
 */
export function getUnlockSkipCost(unlock: Unlockable): number {
  return Math.ceil(unlock.cost * (1 + UNLOCK_SKIP_PREMIUM));
}

/**
 * Whether an unlock can be SKIPPED right now: it's the legitimate next unlock
 * (all previous done), it's blocked ONLY by its puzzle-count gate, nothing is
 * reserved (skip and reserve are mutually exclusive — a reservation already
 * paid the plain cost), it isn't already unlocked, and the player can afford the
 * premium skip cost. Skipping unlocks the room/animal immediately, bypassing the
 * level wait — the paid shortcut past the gate.
 */
export async function canSkipUnlockGate(unlockId: string): Promise<boolean> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock || unlock.minPuzzles === undefined) return false;

  const progress = await loadProgress();
  if (progress.reservedUnlockId) return false; // already paid via reserve

  // Must be blocked solely by the puzzle gate.
  if (progress.puzzlesSolved >= unlock.minPuzzles) return false;

  // Not already unlocked.
  const alreadyUnlocked = unlock.type === 'character'
    ? progress.unlockedAnimals.includes(unlock.targetId)
    : progress.unlockedRooms.includes(unlock.targetId);
  if (alreadyUnlocked) return false;

  // All previous unlocks must be done (it's genuinely the next thing).
  const previous = UNLOCK_PROGRESSION.filter(u => u.order < unlock.order);
  for (const prev of previous) {
    const done = prev.type === 'character'
      ? progress.unlockedAnimals.includes(prev.targetId)
      : progress.unlockedRooms.includes(prev.targetId);
    if (!done) return false;
  }

  // NARRATIVE GUARD: never offer a paid skip into a descent-trio room before
  // global Phase 3. The trio's recruits (LATE_PHASE_RECRUITS) carry arcs that
  // assume Phase 3+ — organically their 84/88/92 solve gates imply it (weighted
  // phase progress can never trail raw solves) — but a skip bypasses the solve
  // gate, and amber is purchasable, so without this check cash -> amber -> skip
  // could summon the trio (and, transitively, fire the house-completion
  // ceremony) in the bright phases: a "story is never for sale" leak. Reserve
  // stays available — it waits for the gate, which waits for the phase.
  if (isDescentTrioRoomUnlock(unlock) && progress.currentPhase < 3) return false;

  // Must be able to afford the premium skip cost.
  return progress.amber >= getUnlockSkipCost(unlock);
}

/**
 * Whether this unlock is one of the descent-trio rooms — a gated room whose
 * immediately-following unlock is a LATE_PHASE_RECRUITS animal. Derived from
 * the progression data (no hardcoded room list) so a reordering can't silently
 * strand the guard.
 */
export function isDescentTrioRoomUnlock(unlock: Unlockable): boolean {
  if (unlock.type !== 'room') return false;
  const follower = UNLOCK_PROGRESSION.find(u => u.order === unlock.order + 1);
  return follower?.type === 'character' && LATE_PHASE_RECRUITS.has(follower.targetId as AnimalType);
}

/**
 * Skip a level-gated unlock's puzzle requirement: pays the premium skip cost and
 * unlocks the room/animal immediately. Returns the unlocked item on success so
 * the caller can celebrate / show a new-character intro (same as purchaseUnlock).
 */
export async function skipUnlockGate(unlockId: string): Promise<{
  success: boolean;
  unlock?: Unlockable;
  newBalance?: number;
  error?: string;
}> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock) return { success: false, error: 'Invalid unlock ID' };
  if (!(await canSkipUnlockGate(unlockId))) {
    return { success: false, error: 'Cannot skip this unlock right now' };
  }

  const skipCost = getUnlockSkipCost(unlock);
  const success = unlock.type === 'character'
    ? await unlockAnimal(unlock.targetId, skipCost)
    : await unlockRoom(unlock.targetId, skipCost);
  if (!success) return { success: false, error: 'Not enough amber' };

  if (unlock.type === 'character') {
    await fastForwardLateUnlockDialogue(unlock.targetId);
  }
  logEvent({
    type: 'unlock_purchased',
    data: { unlockId: unlock.id, targetId: unlock.targetId, cost: skipCost, skippedGate: true },
  });
  const progress = await loadProgress();
  return { success: true, unlock, newBalance: progress.amber };
}

/**
 * "Skip the wait" pitch shown under a gated room's requirement when the player
 * can afford the premium — the paid shortcut past the level gate.
 */
export function getSkipGateText(skipCost: number): string {
  return `Skip the wait now for ${skipCost} amber`;
}

/**
 * The Next Unlock meter's caption when the binding constraint is the LEVEL
 * gate, not the purse. The meter always measured amber against cost, so a
 * reserved room (whose cost was already spent) pinned it at "13252 / 450" and
 * told the player nothing about the 84 solves they were actually waiting on.
 */
export function getNextUnlockMeterText(minPuzzles: number, puzzlesSolved: number): string {
  return `Level ${puzzlesSolved} / ${minPuzzles}`;
}

/** Speed-up line when the purse really is short of the remaining premium. */
export function getReservedSpeedUpNeedAmberText(premium: number): string {
  return `Or speed it up for ${premium} amber once you can set that much aside.`;
}

/**
 * Speed-up line when the HOUSE is refusing, not the purse: the descent-trio
 * rooms cannot be bought forward before the shadows gather. Deliberately
 * carries NO price. Naming a cost for something no amount of amber can buy is
 * the exact lie this line was written to replace, and a player holding
 * thousands read it as being told they were poor. In-world voice: no level,
 * puzzle or phase jargon (narrative rule 7).
 */
export function getReservedSpeedUpNotYetText(): string {
  return 'This one will not be hurried. It arrives when the house is ready for it.';
}

/**
 * Why a locked room is locked, named honestly. The blanket "play more puzzles
 * to earn amber" claim is only true when the purse is actually the blocker; it
 * was printing for a room whose amber was already paid at reserve time.
 */
export function getLockedRoomReasonText(opts: { gated: boolean; canAfford: boolean }): string {
  if (opts.gated) return 'This room is still taking shape. It opens when the house is ready.';
  if (!opts.canAfford) return 'Offer more words to gather the amber this room needs.';
  return 'Ready to build whenever you are.';
}

/**
 * Why one of the last three rooms is refusing, when the refusal is the HOUSE
 * and not the purse or the level board. No numbers, no phase jargon (narrative
 * rule 7) — the same register as getReservedSpeedUpNotYetText, because it is
 * the same refusal seen from the other side.
 */
export function getDescentTrioNotReadyText(): string {
  return 'The house is not ready for this one yet. It comes in its own time.';
}

/**
 * The one short line under the in-world locked room card. It exists because the
 * card cannot borrow the MODAL's sentences: getReserveGateText /
 * getReservedArrivalText return full lines ("Still growing here. Opens at level
 * 84 (you're at 12)"), and the card is a ~108x58dp chip inside a 250x123dp
 * room — those wrap to four or five lines and burst the NineSlice frame. Same
 * module as the modal copy so the two can never say different things about the
 * same room; each sized for its own surface. The spoken accessibility label is
 * free to use the long-form modal helpers.
 */
export function getLockedRoomCardSub(opts: {
  reserved: boolean;
  gateBlocked: boolean;
  minPuzzles?: number;
  puzzlesSolved?: number;
  affordable: boolean;
}): string {
  if (opts.reserved) return 'Reserved';
  if (opts.gateBlocked) {
    // Name the BINDING constraint, the way getNextUnlockMeterText does. A
    // descent-trio room whose level gate is already open is waiting on the
    // house itself (the weighted Phase-3 floor), and no level number describes
    // that wait — quoting one the player has already passed would read as the
    // gate being broken.
    const levelGateOpen =
      opts.minPuzzles === undefined || (opts.puzzlesSolved ?? 0) >= opts.minPuzzles;
    return levelGateOpen ? 'Still growing' : `Opens at level ${opts.minPuzzles}`;
  }
  return opts.affordable ? 'Tap to build' : '';
}

/**
 * Is this unlock's ARRIVAL held back by something no amount of amber can move —
 * its level gate, or (descent trio only) the house's own Phase-3 floor?
 *
 * One predicate because the in-world card and the availability check MUST agree
 * on what "gated" means. They did not: the card read the level gate alone, so a
 * shared-challenge player standing at 84 raw solves with weighted progress
 * still under the Phase-3 threshold saw "Tap to build" on a Star Loft that
 * isUnlockAvailable would then refuse.
 */
export function isUnlockGateBlocked(
  unlock: Unlockable | null | undefined,
  progress: { puzzlesSolved?: number; phaseProgress?: number } | null | undefined,
): boolean {
  if (!unlock || !progress) return false;
  const solved = progress.puzzlesSolved ?? 0;
  if (unlock.minPuzzles !== undefined && solved < unlock.minPuzzles) return true;
  return isDescentTrioHeld(unlock, progress);
}

/**
 * The descent trio's narrative floor, in one place: the last three rooms may
 * never arrive before the house has actually descended to Phase 3.
 *
 * WEIGHTED progress, never `currentPhase`: transitions are deferred to the pit
 * ward-ignition ceremony, so reading `currentPhase` would refuse the room to a
 * perfectly normal player at the exact moment it was meant to open, until they
 * walked to the pit and tapped through a ceremony nobody told them about.
 */
function isDescentTrioHeld(
  unlock: Unlockable,
  progress: { puzzlesSolved?: number; phaseProgress?: number },
): boolean {
  if (!isDescentTrioRoomUnlock(unlock)) return false;
  return (progress.phaseProgress ?? progress.puzzlesSolved ?? 0) < PHASE_THRESHOLDS[3];
}

/**
 * Amber to speed up an ALREADY-RESERVED unlock: only the premium delta (the base
 * cost was already paid at reserve time), so the total paid equals a direct skip.
 */
export function getReservedSkipCost(unlock: Unlockable): number {
  return getUnlockSkipCost(unlock) - unlock.cost;
}

/** Why a reserved unlock can or cannot be sped up right now. */
export type ReservedSpeedUpState = 'ready' | 'not_yet' | 'need_amber' | 'none';

/**
 * The REASON behind the speed-up decision, so the UI can say something true
 * instead of assuming an empty purse.
 *
 * The distinction that matters is 'not_yet' vs 'need_amber'. The descent-trio
 * phase guard below is deliberate — amber must never summon the last three
 * rooms during the bright days — but it sat one line above the affordability
 * comparison, so a player at phase 0 holding 13,252 amber against a 225 premium
 * had their balance never read at all, and the UI, seeing only `false`, told
 * them to come back when they could afford it.
 */
export async function getReservedSpeedUpState(unlockId: string): Promise<ReservedSpeedUpState> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock) return 'none';
  const progress = await loadProgress();
  if (progress.reservedUnlockId !== unlockId) return 'none';
  // Gate already open: it auto-claims for free, so there is nothing to buy.
  if (unlock.minPuzzles !== undefined && progress.puzzlesSolved >= unlock.minPuzzles) return 'none';
  // Same narrative guard as canSkipUnlockGate: a reserved descent-trio room may
  // not be sped past its gate before global Phase 3 (the reservation itself
  // stays valid and auto-claims when the gate opens).
  if (isDescentTrioRoomUnlock(unlock) && progress.currentPhase < 3) return 'not_yet';
  return progress.amber >= getReservedSkipCost(unlock) ? 'ready' : 'need_amber';
}

/**
 * Whether a reserved unlock can be sped up now: it is the reservation, its gate
 * hasn't opened yet (once it has, it auto-claims for free — no reason to pay),
 * and the player can afford the remaining premium. Delegates to
 * `getReservedSpeedUpState` so the button gate and the explanation beside it
 * can never drift apart.
 */
export async function canSpeedUpReservedUnlock(unlockId: string): Promise<boolean> {
  return (await getReservedSpeedUpState(unlockId)) === 'ready';
}

/**
 * Speed up a reserved unlock: pay the remaining premium and unlock it NOW,
 * clearing the reservation (the base cost was already spent when it was
 * reserved, so this never double-charges). Returns the unlocked item on success
 * so the caller can celebrate / show a new-character intro.
 */
export async function skipReservedUnlock(unlockId: string): Promise<{
  success: boolean;
  unlock?: Unlockable;
  newBalance?: number;
  error?: string;
}> {
  const unlock = UNLOCK_PROGRESSION.find(u => u.id === unlockId);
  if (!unlock) return { success: false, error: 'Invalid unlock ID' };
  const progress = await loadProgress();
  if (progress.reservedUnlockId !== unlockId) {
    return { success: false, error: 'This unlock is not reserved' };
  }
  if (isDescentTrioRoomUnlock(unlock) && progress.currentPhase < 3) {
    return { success: false, error: 'This room is not ready to be hurried' };
  }
  const premium = getReservedSkipCost(unlock);
  const spend = await spendAmber(premium, `skip_reserved_${unlock.targetId}`);
  if (!spend.success) return { success: false, error: 'Not enough amber' };
  // Base cost was already spent at reserve time — claim marks it unlocked and
  // clears the reservation (no further spend).
  await claimReservedUnlock(unlock.targetId, unlock.type);
  if (unlock.type === 'character') {
    await fastForwardLateUnlockDialogue(unlock.targetId);
  }
  logEvent({
    type: 'unlock_purchased',
    data: { unlockId: unlock.id, targetId: unlock.targetId, cost: premium, skippedReservedGate: true },
  });
  const after = await loadProgress();
  return { success: true, unlock, newBalance: after.amber };
}

/**
 * If there's a reserved unlock whose level gate has now opened, commit it
 * (no further spend — it was paid at reserve time) and return the unlocked
 * item so the caller can celebrate / show a new-character intro. Returns null
 * when nothing is reserved or the gate isn't met yet.
 */
export async function claimReservedUnlockIfReady(): Promise<Unlockable | null> {
  const reservedId = await getReservedUnlockId();
  if (!reservedId) return null;

  const unlock = UNLOCK_PROGRESSION.find(u => u.id === reservedId);
  if (!unlock) {
    // Reservation points at nothing valid — clear it defensively.
    await claimReservedUnlock('', 'room');
    return null;
  }

  const progress = await loadProgress();

  // Already unlocked somehow (e.g. double-claim) — just clear the reservation.
  const alreadyUnlocked = unlock.type === 'character'
    ? progress.unlockedAnimals.includes(unlock.targetId)
    : progress.unlockedRooms.includes(unlock.targetId);
  if (alreadyUnlocked) {
    await claimReservedUnlock(unlock.targetId, unlock.type);
    return null;
  }

  // Gate must now be met.
  if (unlock.minPuzzles !== undefined && progress.puzzlesSolved < unlock.minPuzzles) {
    return null;
  }

  // ...and for the descent trio the gate really means "the house is ready":
  // the same weighted floor isUnlockAvailable enforces. Without it a player
  // whose raw solves outran their weighted descent (shared-challenge boards pay
  // no phase progress) could reserve the Star Loft and have it delivered here,
  // straight past the guard on the build path. The reservation is not lost or
  // refunded, it simply keeps waiting — which is what a reservation is.
  if (isDescentTrioHeld(unlock, progress)) {
    return null;
  }

  await claimReservedUnlock(unlock.targetId, unlock.type);
  if (unlock.type === 'character') {
    await fastForwardLateUnlockDialogue(unlock.targetId);
  }
  logEvent({ type: 'unlock_purchased', data: { unlockId: unlock.id, targetId: unlock.targetId, cost: unlock.cost, claimedFromReserve: true } });
  return unlock;
}

/**
 * Reserve-ahead copy: the "reserved, awaiting its gate" line. Includes the
 * player's current level so the wait has a visible distance-to-go
 * ("arrives at level 42 (you're at 35)"), instead of naming a target with no
 * sense of how far off it is.
 */
export function getReservedArrivalText(
  minPuzzles: number | undefined,
  puzzlesSolved: number,
): string {
  if (minPuzzles === undefined) return '✓ Reserved';
  return `✓ Reserved. Arrives at level ${minPuzzles} (you're at ${puzzlesSolved})`;
}

/**
 * Reserve-ahead copy: the "gated, offer to reserve" lead-in. Callers append
 * their own reserve pitch after it ("…— you're at 35. Reserve it now and …").
 */
export function getReserveGateText(
  minPuzzles: number | undefined,
  puzzlesSolved: number,
): string {
  // Anticipatory framing, not a transactional wall: "Unlocks at level N" read
  // as a chore requirement (a fast solver hitting the gate early felt walled).
  // "Still growing here" frames the wait as the house taking shape in-world,
  // while keeping the numbers so progress-to-arrival stays visible.
  if (minPuzzles === undefined) return `Still growing here. You're at level ${puzzlesSolved}`;
  return `Still growing here. Opens at level ${minPuzzles} (you're at ${puzzlesSolved})`;
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

  // Phase-5 endgame: the honest "new dialogue" badge needs the Tending Shrine
  // state + recorded choices. Post-revelation only: getAnimalPhase hard-caps
  // every animal at 4 until the global phase is 5 (the awareness tiers stagger
  // the descent, never the arrival), so no animal can resolve to phase 5 before
  // then. Loaded once, not per animal.
  const nearEndgame = progress.currentPhase >= 5;
  const tendingState = nearEndgame ? await loadTendingState() : null;
  const choiceState = nearEndgame ? await loadChoiceState() : null;
  // Phase-2 exhaustion pool: badge honesty for animals whose base block is
  // done but who still have undelivered pool lines. Loaded once, not per animal.
  const phase2Cursors = progress.currentPhase >= 1 && progress.currentPhase <= 3
    ? await getPhase2PoolCursors()
    : {};
  // Animal types currently unlocked — needed to resolve stored dialogue
  // indices past lines gated on still-locked animals. Animal ids double as
  // types (mirrors useDialogueFlow.getUnlockedTypes).
  const unlockedTypes = new Set(progress.unlockedAnimals as AnimalType[]);

  return ANIMALS.map(animal => {
    const unlocked = progress.unlockedAnimals.includes(animal.id);
    const dialogueIndex = progress.lastDialogueRead[animal.id] ?? 0;

    // Compute hasNewDialogue: true when animal has unread dialogue and is available
    let hasNewDialogue = false;
    if (unlocked && !isOnCooldown(animal.id)) {
      const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
      if (animalPhase === 5 && tendingState) {
        // Post-revelation is pool-only. Regular Phase 3/4 backlog is retired
        // at the reveal and must never light the badge again.
        const poolLen = getPhase5PoolLength(
          animal.type,
          tendingState.level,
          choiceState?.choices?.[animal.type] ?? null
        );
        const caughtUp = tendingState.caughtUp[animal.type] ?? 0;
        hasNewDialogue = caughtUp < poolLen;
      } else if (animalPhase === 2) {
        const totalDialogues = getTotalDialogueCount(animal.type, 2);
        // Resolve the raw stored index past lines gated on still-locked
        // animals (resolveDialogueIndex is pure and cheap), mirroring
        // useDialogueFlow.recomputeHasNewDialogue — the raw index can sit
        // below the total while every remaining line is blocked, which would
        // misreport "new" instead of consulting the exhaustion pool.
        const resolvedIndex = resolveDialogueIndex(animal.type, dialogueIndex, 2, unlockedTypes);
        if (resolvedIndex < totalDialogues) {
          hasNewDialogue = true;
        } else {
          // Base block exhausted — lit only while the exhaustion pool still
          // has genuinely-new lines (mirrors useDialogueFlow's honest badge).
          hasNewDialogue = phase2PoolHasNew(animal.type, phase2Cursors[animal.type] ?? 0);
        }
      } else {
        // Resolve the stored index past any lines gated on still-locked animals
        // (mirrors useDialogueFlow.recomputeHasNewDialogue) so the badge is never
        // lit for an animal whose only remaining lines are all blocked.
        const totalDialogues = getTotalDialogueCount(animal.type, animalPhase);
        const resolvedIndex = resolveDialogueIndex(animal.type, dialogueIndex, animalPhase, unlockedTypes);
        hasNewDialogue = resolvedIndex < totalDialogues;
      }
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
  star_loft: { bg: '#483D8B', accent: '#2B2350', floor: '#5C4033', wall: '#3B3268' },
  belfry: { bg: '#8B8378', accent: '#4F4A42', floor: '#6B5D4F', wall: '#A39A8B' },
  sky_garden: { bg: '#8FBC8F', accent: '#2E8B57', floor: '#90EE90', wall: '#B0E0E6' },
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
  tarsier: '🐵',
  aye_aye: '🐒',
  kakapo: '🦜',
};
