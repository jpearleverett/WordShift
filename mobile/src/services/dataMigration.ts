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
export const CURRENT_SCHEMA_VERSION = 2;

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
];

/**
 * Get the current stored schema version
 */
export async function getSchemaVersion(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    return stored ? parseInt(stored, 10) : 0;
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
