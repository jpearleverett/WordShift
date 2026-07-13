import { createMockAsyncStorage } from './helpers/mockAsyncStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  createMockAsyncStorage()
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateFreshnessPenalty,
  isInHardCooldown,
  recordPuzzleWords,
  recordFormedWords,
  getWordHistoryWithRecency,
  clearWordHistory,
} from '../services/wordHistory';

describe('calculateFreshnessPenalty', () => {
  test('returns -5 (bonus) for never-seen words', () => {
    const recencyMap = new Map<string, number>();
    expect(calculateFreshnessPenalty('NOVEL', recencyMap)).toBe(-5);
  });

  test('returns 100 (exclude) for words used 0 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 0]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(100);
  });

  test('returns 100 for words at puzzle 24 (still in hard cooldown)', () => {
    const recencyMap = new Map([['WORD', 24]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(100);
  });

  test('returns 50 for words at exactly puzzle 25 (start of soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 25]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(50);
  });

  test('returns ~12 for words at puzzle 59 (end of soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 59]]);
    // progress = (59-25)/(60-25) = 34/35 ~= 0.97
    // penalty = 50 - (0.97 * 40) ~= 11.1 -> rounds to ~11
    const penalty = calculateFreshnessPenalty('WORD', recencyMap);
    expect(penalty).toBeGreaterThanOrEqual(10);
    expect(penalty).toBeLessThanOrEqual(15);
  });

  test('returns 0 for words at puzzle 60+ (beyond soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 60]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(0);
  });

  test('returns 0 for words at puzzle 100', () => {
    const recencyMap = new Map([['WORD', 100]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(0);
  });

  test('penalty decreases linearly through soft cooldown', () => {
    const recencyMap = new Map<string, number>();

    // At puzzle 25: penalty ~50
    recencyMap.set('A', 25);
    const p25 = calculateFreshnessPenalty('A', recencyMap);

    // At puzzle 42 (midpoint): penalty ~30
    recencyMap.set('B', 42);
    const p42 = calculateFreshnessPenalty('B', recencyMap);

    // At puzzle 59: penalty ~12
    recencyMap.set('C', 59);
    const p59 = calculateFreshnessPenalty('C', recencyMap);

    expect(p25).toBeGreaterThan(p42);
    expect(p42).toBeGreaterThan(p59);
  });
});

describe('isInHardCooldown', () => {
  test('returns true for words used 0 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 0]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(true);
  });

  test('returns true for words used 24 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 24]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(true);
  });

  test('returns false for words used exactly 25 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 25]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(false);
  });

  test('returns false for never-seen words', () => {
    const recencyMap = new Map<string, number>();
    expect(isInHardCooldown('NOVEL', recencyMap)).toBe(false);
  });

  test('returns false for old words', () => {
    const recencyMap = new Map([['WORD', 50]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(false);
  });
});

describe('recordFormedWords', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearWordHistory();
  });

  test('merges formed words into the most recent puzzle group (same recency bucket)', async () => {
    // Chain recorded at puzzle start...
    await recordPuzzleWords(['LAMP', 'OVER', 'TIME', 'USED']);
    // ...formed words recorded at victory join the SAME group.
    await recordFormedWords(['LOVER', 'TIMER', 'MUSED']);

    const recency = await getWordHistoryWithRecency();
    expect(recency.get('LAMP')).toBe(0);
    expect(recency.get('LOVER')).toBe(0);
    expect(recency.get('TIMER')).toBe(0);

    // The next puzzle pushes both chain AND formed words one bucket back
    // together — merging kept one group per puzzle.
    await recordPuzzleWords(['FIRE', 'LIKE']);
    const recency2 = await getWordHistoryWithRecency();
    expect(recency2.get('FIRE')).toBe(0);
    expect(recency2.get('LAMP')).toBe(1);
    expect(recency2.get('LOVER')).toBe(1);
  });

  test('does not duplicate words already present in the group', async () => {
    await recordPuzzleWords(['LAMP', 'OVER']);
    await recordFormedWords(['LAMP', 'LOVER']);
    const stored = await AsyncStorage.getItem('wordshift_word_history');
    const parsed = JSON.parse(stored!);
    expect(parsed.puzzleGroups[0]).toEqual(['LAMP', 'OVER', 'LOVER']);
    expect(parsed.puzzleGroups.length).toBe(1);
  });

  test('creates its own group when history is empty', async () => {
    await recordFormedWords(['HEART', 'PLANT']);
    const recency = await getWordHistoryWithRecency();
    expect(recency.get('HEART')).toBe(0);
    expect(recency.get('PLANT')).toBe(0);
  });

  test('empty input is a no-op', async () => {
    await recordPuzzleWords(['LAMP']);
    await recordFormedWords([]);
    const stored = await AsyncStorage.getItem('wordshift_word_history');
    const parsed = JSON.parse(stored!);
    expect(parsed.puzzleGroups.length).toBe(1);
    expect(parsed.puzzleGroups[0]).toEqual(['LAMP']);
  });

  test('uppercases formed words', async () => {
    await recordFormedWords(['heart']);
    const recency = await getWordHistoryWithRecency();
    expect(recency.get('HEART')).toBe(0);
  });
});
