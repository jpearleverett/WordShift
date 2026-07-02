/**
 * Configuration validation functions.
 *
 * Pure, synchronous checks that verify data integrity across the game's
 * configuration constants (dialogues, achievements, unlock progression,
 * phase thresholds). Intended to run at dev/test time — never at runtime
 * on a player's device.
 */

import {
  ANIMAL_INFO,
  POST_REVELATION_DIALOGUES,
  PHASE2_EXTRA_DIALOGUES,
  getTotalDialogueCount,
} from './animalDialogue';
import { ACHIEVEMENTS, AchievementCategory } from './achievements';
import { UNLOCK_PROGRESSION, ROOMS, ANIMALS } from './homeWorldData';
import { PHASE_THRESHOLDS, AnimalType, DialoguePhase } from '../types/homeWorld';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// All 10 animal types in the game
// ---------------------------------------------------------------------------

const ALL_ANIMAL_TYPES: AnimalType[] = [
  'fox',
  'pangolin',
  'owl',
  'axolotl',
  'sloth',
  'fennec_fox',
  'capybara',
  'wombat',
  'rabbit',
  'red_panda',
];

// Expected dialogue counts per phase (from CLAUDE.md):
// Phase 0: 12, Phase 1: 14, Phase 2: 11 (incl. question-web hook), Phase 3: 15, Phase 4: 15 = 67 total
const EXPECTED_DIALOGUE_COUNTS_BY_PHASE: Record<number, number> = {
  0: 12,
  1: 14,
  2: 11,
  3: 15,
  4: 15,
};
const EXPECTED_TOTAL_DIALOGUES_PER_ANIMAL = 67;
const EXPECTED_POST_REVELATION_PER_ANIMAL = 10;
// Phase-2 exhaustion pool: extra lines served once the indexed Phase-2 base
// block is exhausted. Deliberately OUTSIDE the base arrays (inserting there
// would shift phase-start indices and corrupt saved lastDialogueRead values).
const EXPECTED_PHASE2_EXTRA_PER_ANIMAL = 5;

// ---------------------------------------------------------------------------
// 1. Dialogue integrity
// ---------------------------------------------------------------------------

/**
 * Validate that every animal has the correct dialogue counts across phases
 * and that POST_REVELATION_DIALOGUES has 10 entries per animal.
 */
export function validateDialogueIntegrity(): ValidationResult {
  const errors: string[] = [];

  for (const animalType of ALL_ANIMAL_TYPES) {
    // Check that the animal exists in ANIMAL_INFO
    if (!ANIMAL_INFO[animalType]) {
      errors.push(`ANIMAL_INFO missing entry for '${animalType}'`);
    }

    // Check total dialogue count at max phase (Phase 4 covers 0-4)
    const totalAtPhase4 = getTotalDialogueCount(animalType, 4 as DialoguePhase);
    if (totalAtPhase4 !== EXPECTED_TOTAL_DIALOGUES_PER_ANIMAL) {
      errors.push(
        `${animalType}: expected ${EXPECTED_TOTAL_DIALOGUES_PER_ANIMAL} dialogues through Phase 4, got ${totalAtPhase4}`
      );
    }

    // Verify per-phase counts by checking cumulative totals at each phase boundary
    let expectedCumulative = 0;
    for (let phase = 0; phase <= 4; phase++) {
      expectedCumulative += EXPECTED_DIALOGUE_COUNTS_BY_PHASE[phase];
      const actual = getTotalDialogueCount(animalType, phase as DialoguePhase);
      if (actual !== expectedCumulative) {
        errors.push(
          `${animalType}: expected ${expectedCumulative} cumulative dialogues through Phase ${phase}, got ${actual}`
        );
      }
    }

    // Check POST_REVELATION_DIALOGUES (Phase 5)
    const postRevLines = POST_REVELATION_DIALOGUES[animalType];
    if (!postRevLines) {
      errors.push(`POST_REVELATION_DIALOGUES missing entry for '${animalType}'`);
    } else if (postRevLines.length !== EXPECTED_POST_REVELATION_PER_ANIMAL) {
      errors.push(
        `${animalType}: expected ${EXPECTED_POST_REVELATION_PER_ANIMAL} post-revelation dialogues, got ${postRevLines.length}`
      );
    }

    // Check PHASE2_EXTRA_DIALOGUES (Phase-2 exhaustion pool)
    const phase2Extras = PHASE2_EXTRA_DIALOGUES[animalType];
    if (!phase2Extras) {
      errors.push(`PHASE2_EXTRA_DIALOGUES missing entry for '${animalType}'`);
    } else {
      if (phase2Extras.length !== EXPECTED_PHASE2_EXTRA_PER_ANIMAL) {
        errors.push(
          `${animalType}: expected ${EXPECTED_PHASE2_EXTRA_PER_ANIMAL} Phase-2 extra dialogues, got ${phase2Extras.length}`
        );
      }
      for (let i = 0; i < phase2Extras.length; i++) {
        if (!phase2Extras[i] || phase2Extras[i].trim().length === 0) {
          errors.push(`${animalType}: Phase-2 extra dialogue at index ${i} is empty`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 2. Phase thresholds
// ---------------------------------------------------------------------------

/**
 * Validate that PHASE_THRESHOLDS is a sorted ascending array of the
 * expected length (5 entries for phases 0-4) starting at 0.
 */
export function validatePhaseThresholds(): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(PHASE_THRESHOLDS)) {
    errors.push('PHASE_THRESHOLDS is not an array');
    return { valid: false, errors };
  }

  // 5 threshold entries drive phases 0-4. Phase 5 (post-revelation) is NOT
  // threshold-driven — it's gated on the final-puzzle event via
  // markPostRevelation() — so the 6-phase model still has exactly 5 thresholds.
  if (PHASE_THRESHOLDS.length !== 5) {
    errors.push(
      `PHASE_THRESHOLDS should have 5 entries (thresholds for phases 0-4; phase 5 is event-driven), got ${PHASE_THRESHOLDS.length}`
    );
  }

  if (PHASE_THRESHOLDS[0] !== 0) {
    errors.push(
      `PHASE_THRESHOLDS[0] should be 0 (Phase 0 starts immediately), got ${PHASE_THRESHOLDS[0]}`
    );
  }

  for (let i = 1; i < PHASE_THRESHOLDS.length; i++) {
    if (PHASE_THRESHOLDS[i] <= PHASE_THRESHOLDS[i - 1]) {
      errors.push(
        `PHASE_THRESHOLDS is not strictly ascending at index ${i}: ` +
        `${PHASE_THRESHOLDS[i - 1]} >= ${PHASE_THRESHOLDS[i]}`
      );
    }
  }

  for (let i = 0; i < PHASE_THRESHOLDS.length; i++) {
    if (typeof PHASE_THRESHOLDS[i] !== 'number' || !Number.isInteger(PHASE_THRESHOLDS[i])) {
      errors.push(`PHASE_THRESHOLDS[${i}] is not an integer: ${PHASE_THRESHOLDS[i]}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 3. Achievements
// ---------------------------------------------------------------------------

/**
 * Validate the ACHIEVEMENTS array: correct total count, unique IDs, and
 * all expected categories represented.
 */
export function validateAchievements(): ValidationResult {
  const errors: string[] = [];

  // Check total count (40 achievements across 5 categories)
  if (ACHIEVEMENTS.length !== 40) {
    errors.push(`Expected 40 achievements, got ${ACHIEVEMENTS.length}`);
  }

  // Check unique IDs
  const ids = ACHIEVEMENTS.map((a) => a.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    errors.push(`Duplicate achievement IDs: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check that all expected categories are represented.
  // The actual AchievementCategory type in the codebase defines the canonical set.
  const EXPECTED_CATEGORIES: AchievementCategory[] = [
    'puzzle',
    'mastery',
    'streak',
    'collection',
    'journey',
  ];

  const presentCategories = new Set(ACHIEVEMENTS.map((a) => a.category));
  for (const cat of EXPECTED_CATEGORIES) {
    if (!presentCategories.has(cat)) {
      errors.push(`No achievements found for category '${cat}'`);
    }
  }

  // Verify every achievement has required fields
  for (const achievement of ACHIEVEMENTS) {
    if (!achievement.id) {
      errors.push('Achievement found with empty/missing id');
    }
    if (!achievement.title) {
      errors.push(`Achievement '${achievement.id}' has empty/missing title`);
    }
    if (!achievement.description) {
      errors.push(`Achievement '${achievement.id}' has empty/missing description`);
    }
    if (!achievement.icon) {
      errors.push(`Achievement '${achievement.id}' has empty/missing icon`);
    }
    if (!achievement.category) {
      errors.push(`Achievement '${achievement.id}' has empty/missing category`);
    }
    if (typeof achievement.check !== 'function') {
      errors.push(`Achievement '${achievement.id}' has no check function`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 4. Unlock progression
// ---------------------------------------------------------------------------

/**
 * Validate UNLOCK_PROGRESSION, ROOMS, and ANIMALS:
 * - 19 unlock entries
 * - First entry is Fox (free character invite)
 * - Alternating room/character pattern (with slight exceptions)
 * - All 10 rooms and 10 animals covered
 * - ROOMS has 10 entries, ANIMALS has 10 entries
 * - Orders are sequential 1-19
 */
export function validateUnlockProgression(): ValidationResult {
  const errors: string[] = [];

  // ROOMS and ANIMALS array counts
  if (ROOMS.length !== 10) {
    errors.push(`Expected 10 rooms, got ${ROOMS.length}`);
  }
  if (ANIMALS.length !== 10) {
    errors.push(`Expected 10 animals, got ${ANIMALS.length}`);
  }

  // UNLOCK_PROGRESSION total count
  if (UNLOCK_PROGRESSION.length !== 19) {
    errors.push(`Expected 19 unlock entries, got ${UNLOCK_PROGRESSION.length}`);
  }

  // First entry: Fox, free, character type
  if (UNLOCK_PROGRESSION.length > 0) {
    const first = UNLOCK_PROGRESSION[0];
    if (first.type !== 'character') {
      errors.push(`First unlock should be type 'character', got '${first.type}'`);
    }
    if (first.targetId !== 'fox') {
      errors.push(`First unlock should target 'fox', got '${first.targetId}'`);
    }
    if (first.cost !== 0) {
      errors.push(`First unlock (Fox) should be free (cost 0), got ${first.cost}`);
    }
  }

  // Check sequential ordering
  for (let i = 0; i < UNLOCK_PROGRESSION.length; i++) {
    if (UNLOCK_PROGRESSION[i].order !== i + 1) {
      errors.push(
        `Unlock at index ${i} should have order ${i + 1}, got ${UNLOCK_PROGRESSION[i].order}`
      );
    }
  }

  // Check unique IDs in unlock progression
  const unlockIds = UNLOCK_PROGRESSION.map((u) => u.id);
  const uniqueUnlockIds = new Set(unlockIds);
  if (uniqueUnlockIds.size !== unlockIds.length) {
    const dupes = unlockIds.filter((id, i) => unlockIds.indexOf(id) !== i);
    errors.push(`Duplicate unlock IDs: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check alternating pattern (after the first entry):
  // Expected: character, room, character, room, character, ...
  // i.e. odd indices (1,3,5,...) should be rooms, even indices (2,4,6,...) should be characters
  // (index 0 is character = Fox)
  for (let i = 1; i < UNLOCK_PROGRESSION.length; i++) {
    const expectedType = i % 2 === 1 ? 'room' : 'character';
    if (UNLOCK_PROGRESSION[i].type !== expectedType) {
      errors.push(
        `Unlock at order ${i + 1} ('${UNLOCK_PROGRESSION[i].id}'): expected type '${expectedType}', got '${UNLOCK_PROGRESSION[i].type}'`
      );
    }
  }

  // All 10 rooms covered
  const roomIds = new Set(ROOMS.map((r) => r.id));
  const unlockedRoomIds = new Set(
    UNLOCK_PROGRESSION.filter((u) => u.type === 'room').map((u) => u.targetId)
  );
  // The starter room (cozy_den) is pre-unlocked and not in the progression
  const allRoomsCovered = new Set([...unlockedRoomIds, 'cozy_den']);
  for (const roomId of roomIds) {
    if (!allRoomsCovered.has(roomId)) {
      errors.push(`Room '${roomId}' is not covered by unlock progression or starter`);
    }
  }

  // All 10 animals covered
  const animalIds = new Set(ANIMALS.map((a) => a.id));
  const unlockedAnimalIds = new Set(
    UNLOCK_PROGRESSION.filter((u) => u.type === 'character').map((u) => u.targetId)
  );
  for (const animalId of animalIds) {
    if (!unlockedAnimalIds.has(animalId)) {
      errors.push(`Animal '${animalId}' is not covered by unlock progression`);
    }
  }

  // Verify every room has a unique animal assignment
  const roomAnimalIds = ROOMS.map((r) => r.animalId).filter(Boolean);
  const uniqueRoomAnimals = new Set(roomAnimalIds);
  if (uniqueRoomAnimals.size !== roomAnimalIds.length) {
    errors.push('Some rooms share the same animal assignment');
  }

  // Verify every animal references an existing room
  for (const animal of ANIMALS) {
    if (!roomIds.has(animal.roomId)) {
      errors.push(`Animal '${animal.id}' references non-existent room '${animal.roomId}'`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 5. Aggregate runner
// ---------------------------------------------------------------------------

/**
 * Run all configuration validations and return a combined result.
 */
export function runAllValidations(): ValidationResult {
  const results = [
    validateDialogueIntegrity(),
    validatePhaseThresholds(),
    validateAchievements(),
    validateUnlockProgression(),
  ];

  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
