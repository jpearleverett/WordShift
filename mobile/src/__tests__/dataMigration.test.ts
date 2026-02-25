import { runMigrations, getSchemaVersion, resetSchemaVersion, CURRENT_SCHEMA_VERSION } from '../services/dataMigration';

jest.mock('../services/storage', () =>
  require('./helpers/mockStorage').createMockStorage()
);

const { storage } = require('../services/storage') as { storage: ReturnType<typeof import('./helpers/mockStorage').createMockStorage>['storage'] };

beforeEach(() => {
  storage.clearAll();
  resetSchemaVersion();
});

describe('Schema Versioning', () => {
  test('starts at version 0 when no version stored', () => {
    const version = getSchemaVersion();
    expect(version).toBe(0);
  });

  test('running migrations updates to current version', () => {
    const result = runMigrations();
    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.migrationsRun).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('running migrations twice is idempotent', () => {
    runMigrations();
    const result = runMigrations();
    expect(result.migrationsRun).toBe(0);
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('schema version persists after migrations', () => {
    runMigrations();
    const version = getSchemaVersion();
    expect(version).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('Migration v2 — Home Progress', () => {
  test('adds phaseProgress from puzzlesSolved when missing', () => {
    const oldProgress = {
      amber: 100,
      totalAmberEarned: 200,
      unlockedAnimals: ['fox'],
      unlockedRooms: ['cozy_den'],
      currentPhase: 1,
      puzzlesSolved: 30,
      phasePuzzleThresholds: [0, 25, 75, 150, 250],
      lastDialogueRead: {},
      currentStreak: 3,
      lastPlayDate: '2026-01-15',
    };
    storage.set('wordshift_home_progress', JSON.stringify(oldProgress));

    runMigrations();

    const stored = storage.getString('wordshift_home_progress');
    const migrated = JSON.parse(stored!);
    expect(migrated.phaseProgress).toBe(30);
    expect(migrated.challengeCompletions).toBe(0);
    expect(migrated.introsSeen).toEqual([]);
    expect(migrated.decorations).toEqual({});
  });

  test('calculates lastClaimedMilestone from puzzlesSolved', () => {
    const oldProgress = {
      amber: 500,
      totalAmberEarned: 800,
      unlockedAnimals: ['fox', 'pangolin'],
      unlockedRooms: ['cozy_den', 'kitchen'],
      currentPhase: 2,
      puzzlesSolved: 80,
      phasePuzzleThresholds: [0, 25, 75, 150, 250],
      lastDialogueRead: {},
      currentStreak: 5,
      lastPlayDate: '2026-01-20',
    };
    storage.set('wordshift_home_progress', JSON.stringify(oldProgress));

    runMigrations();

    const stored = storage.getString('wordshift_home_progress');
    const migrated = JSON.parse(stored!);
    // At 80 puzzles, milestones 10, 25, 50, 75 should all be claimed
    expect(migrated.lastClaimedMilestone).toBe(75);
  });

  test('does not overwrite existing phaseProgress', () => {
    const existingProgress = {
      amber: 100,
      puzzlesSolved: 50,
      phaseProgress: 75, // Already has weighted progress (was accelerated)
      challengeCompletions: 5,
      lastClaimedMilestone: 50,
      introsSeen: ['fox'],
      decorations: { cozy_den: ['cozy_den_rug'] },
    };
    storage.set('wordshift_home_progress', JSON.stringify(existingProgress));

    runMigrations();

    const stored = storage.getString('wordshift_home_progress');
    const migrated = JSON.parse(stored!);
    // Existing values should be preserved
    expect(migrated.phaseProgress).toBe(75);
    expect(migrated.challengeCompletions).toBe(5);
    expect(migrated.lastClaimedMilestone).toBe(50);
  });
});

describe('Migration v2 — Word History', () => {
  test('migrates flat recentWords to grouped puzzleGroups', () => {
    const oldHistory = {
      recentWords: ['SPARK', 'FLAME', 'TIGER', 'BRAVE', 'QUEST', 'GHOST', 'MAGIC', 'STORM'],
      lastUpdated: 1700000000000,
    };
    storage.set('wordshift_word_history', JSON.stringify(oldHistory));

    runMigrations();

    const stored = storage.getString('wordshift_word_history');
    const migrated = JSON.parse(stored!);
    expect(migrated.puzzleGroups).toBeDefined();
    expect(migrated.recentWords).toBeUndefined();
    // 8 words / 5 per puzzle = 2 groups
    expect(migrated.puzzleGroups.length).toBe(2);
    expect(migrated.puzzleGroups[0]).toEqual(['SPARK', 'FLAME', 'TIGER', 'BRAVE', 'QUEST']);
    expect(migrated.puzzleGroups[1]).toEqual(['GHOST', 'MAGIC', 'STORM']);
  });

  test('does not migrate already-grouped history', () => {
    const newHistory = {
      puzzleGroups: [['SPARK', 'FLAME'], ['GHOST', 'MAGIC', 'STORM']],
      lastUpdated: 1700000000000,
    };
    storage.set('wordshift_word_history', JSON.stringify(newHistory));

    runMigrations();

    const stored = storage.getString('wordshift_word_history');
    const migrated = JSON.parse(stored!);
    expect(migrated.puzzleGroups.length).toBe(2);
    expect(migrated.puzzleGroups[0]).toEqual(['SPARK', 'FLAME']);
  });

  test('handles missing word history gracefully', () => {
    // No word history stored at all
    const result = runMigrations();
    expect(result.migrationsRun).toBe(CURRENT_SCHEMA_VERSION);
  });
});
