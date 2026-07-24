import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Data Migration System
 *
 * Provides versioned schema migrations for AsyncStorage data.
 * Each migration transforms data from version N to version N+1.
 * On app load, runs any pending migrations sequentially.
 */

const SCHEMA_VERSION_KEY = 'wordshift_schema_version';

/** Current schema version — increment when adding new migrations */
export const CURRENT_SCHEMA_VERSION = 4;

// ---------------------------------------------------------------------------
// v4: dialogue-corpus doubling (67 -> 134 base lines per animal).
// lastDialogueRead indices are positions into each animal's phase-ordered line
// list; doubling the per-phase counts moves every phase boundary, so each
// stored index must be remapped to the same (phase, offset) position in the
// new layout. Kept here (not in amberCurrency) so the mapping constants live
// and die with the migration.
// ---------------------------------------------------------------------------
const V4_OLD_PHASE_STARTS = [0, 12, 26, 37, 52]; // per-phase start indices before doubling
const V4_OLD_TOTAL = 67;
const V4_NEW_PHASE_STARTS = [0, 24, 52, 74, 104]; // after doubling (24/28/22/30/30)
const V4_NEW_TOTAL = 134;

/** Remap one pre-v4 dialogue index to the doubled layout. Exported for tests. */
export function remapDialogueIndexV4(oldIndex: number): number {
  if (typeof oldIndex !== 'number' || !isFinite(oldIndex) || oldIndex <= 0) return 0;
  // Beyond the old total: Phase-5 cycling positions — preserve the distance
  // past the end so post-revelation pool progress keeps its meaning.
  if (oldIndex > V4_OLD_TOTAL) return V4_NEW_TOTAL + (oldIndex - V4_OLD_TOTAL);
  // Within (or exactly at the end of) the old corpus: same phase, same offset.
  // An old terminal read (67 = phase-4 offset 15) lands at the first NEW
  // phase-4 line (119), so finished players resume with fresh content.
  for (let phase = 4; phase >= 0; phase--) {
    if (oldIndex >= V4_OLD_PHASE_STARTS[phase]) {
      return V4_NEW_PHASE_STARTS[phase] + (oldIndex - V4_OLD_PHASE_STARTS[phase]);
    }
  }
  return oldIndex;
}

interface Migration {
  version: number;
  description: string;
  migrate: () => Promise<void>;
}

/**
 * Migration definitions — each migrates from (version-1) to version.
 * Migrations run in order and must be idempotent (safe to re-run).
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initialize schema version tracking',
    migrate: async () => {
      // No data changes — just establishes the versioning system.
      // All existing data is considered version 0 (pre-migration).
    },
  },
  {
    version: 2,
    description: 'Add phaseProgress, challengeCompletions, lastClaimedMilestone defaults; migrate wordHistory to grouped format',
    migrate: async () => {
      // Migrate home progress — add missing fields with safe defaults
      const progressKey = 'wordshift_home_progress';
      try {
        const stored = await AsyncStorage.getItem(progressKey);
        if (stored) {
          const progress = JSON.parse(stored);

          // Add phaseProgress if missing (initialize from puzzlesSolved)
          if (progress.phaseProgress === undefined) {
            progress.phaseProgress = progress.puzzlesSolved || 0;
          }

          // Add challengeCompletions if missing
          if (progress.challengeCompletions === undefined) {
            progress.challengeCompletions = 0;
          }

          // Add lastClaimedMilestone if missing
          if (progress.lastClaimedMilestone === undefined) {
            // Find the highest milestone at or below current puzzle count
            const milestones = [10, 25, 50, 75, 100, 150, 200, 250, 300, 350];
            const claimed = milestones.filter(m => m <= (progress.puzzlesSolved || 0));
            progress.lastClaimedMilestone = claimed.length > 0 ? claimed[claimed.length - 1] : 0;
          }

          // Add introsSeen if missing
          if (!progress.introsSeen) {
            progress.introsSeen = [];
          }

          // Add decorations if missing
          if (!progress.decorations) {
            progress.decorations = {};
          }

          await AsyncStorage.setItem(progressKey, JSON.stringify(progress));
        }
      } catch (error) {
        console.warn('Migration v2: Failed to migrate home progress:', error);
      }

      // Migrate word history — convert flat array to grouped format
      const historyKey = 'wordshift_word_history';
      try {
        const stored = await AsyncStorage.getItem(historyKey);
        if (stored) {
          const data = JSON.parse(stored);
          // Only migrate if it has the old flat format (recentWords) and not the new grouped format
          if (data.recentWords && !data.puzzleGroups) {
            const words: string[] = data.recentWords;
            const groups: string[][] = [];
            const approxWordsPerPuzzle = 5;
            for (let i = 0; i < words.length; i += approxWordsPerPuzzle) {
              groups.push(words.slice(i, i + approxWordsPerPuzzle));
            }
            const migrated = {
              puzzleGroups: groups,
              lastUpdated: data.lastUpdated || Date.now(),
            };
            await AsyncStorage.setItem(historyKey, JSON.stringify(migrated));
          }
        }
      } catch (error) {
        console.warn('Migration v2: Failed to migrate word history:', error);
      }
    },
  },
  {
    version: 3,
    description: 'Add pendingPhaseTransition and phaseProgressFraction defaults for deferred phase transitions',
    migrate: async () => {
      const progressKey = 'wordshift_home_progress';
      try {
        const stored = await AsyncStorage.getItem(progressKey);
        if (stored) {
          const progress = JSON.parse(stored);

          // Add pendingPhaseTransition if missing
          if (progress.pendingPhaseTransition === undefined) {
            progress.pendingPhaseTransition = null;
          }

          // Add phaseProgressFraction if missing
          if (progress.phaseProgressFraction === undefined) {
            progress.phaseProgressFraction = 0;
          }

          await AsyncStorage.setItem(progressKey, JSON.stringify(progress));
        }
      } catch (error) {
        console.warn('Migration v3: Failed to migrate home progress:', error);
      }
    },
  },
  {
    version: 4,
    description: 'Remap lastDialogueRead indices for the doubled dialogue corpus (67 -> 134 lines per animal)',
    migrate: async () => {
      const progressKey = 'wordshift_home_progress';
      try {
        const stored = await AsyncStorage.getItem(progressKey);
        if (stored) {
          const progress = JSON.parse(stored);
          // Idempotency marker: the remap is NOT safe to apply twice (a
          // remapped index re-remaps to garbage), so guard with a flag the
          // way v2/v3 guard with undefined-checks.
          if (progress.lastDialogueRead && !progress.dialogueIndicesV4) {
            const remapped: Record<string, number> = {};
            for (const [animalId, idx] of Object.entries(progress.lastDialogueRead)) {
              remapped[animalId] = remapDialogueIndexV4(Number(idx));
            }
            progress.lastDialogueRead = remapped;
          }
          progress.dialogueIndicesV4 = true;
          await AsyncStorage.setItem(progressKey, JSON.stringify(progress));
        }
      } catch (error) {
        console.warn('Migration v4: Failed to migrate dialogue indices:', error);
      }
    },
  },
];

/**
 * Get the current stored schema version
 */
export async function getSchemaVersion(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    // A corrupt/non-numeric value must fall back to 0, not NaN. With NaN the
    // gate reads as "not yet current" (NaN >= CURRENT is false, so migration
    // proceeds) but MIGRATIONS.filter(m => m.version > NaN) is EMPTY — so zero
    // migrations run, silently, on every launch, forever. The player is pinned
    // to an unmigrated schema with no error and no recovery path.
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Run all pending migrations.
 * Should be called once on app startup before any data access.
 * Safe to call multiple times — only runs migrations that haven't been applied.
 */
export async function runMigrations(): Promise<{
  migrationsRun: number;
  fromVersion: number;
  toVersion: number;
}> {
  const currentVersion = await getSchemaVersion();
  let migrationsRun = 0;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return { migrationsRun: 0, fromVersion: currentVersion, toVersion: currentVersion };
  }

  const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pendingMigrations) {
    try {
      await migration.migrate();
      await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(migration.version));
      migrationsRun++;
    } catch (error) {
      console.warn(`Migration v${migration.version} failed:`, error);
      // Stop on failure — don't skip migrations
      break;
    }
  }

  const finalVersion = await getSchemaVersion();
  return {
    migrationsRun,
    fromVersion: currentVersion,
    toVersion: finalVersion,
  };
}

/**
 * Reset schema version (for testing)
 */
export async function resetSchemaVersion(): Promise<void> {
  await AsyncStorage.removeItem(SCHEMA_VERSION_KEY);
}
