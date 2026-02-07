import { calculateFreshnessPenalty, isInHardCooldown } from '../services/wordHistory';

describe('calculateFreshnessPenalty', () => {
  test('returns -5 (bonus) for never-seen words', () => {
    const recencyMap = new Map<string, number>();
    expect(calculateFreshnessPenalty('NOVEL', recencyMap)).toBe(-5);
  });

  test('returns 100 (exclude) for words used 0 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 0]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(100);
  });

  test('returns 100 for words at puzzle 14 (still in hard cooldown)', () => {
    const recencyMap = new Map([['WORD', 14]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(100);
  });

  test('returns 50 for words at exactly puzzle 15 (start of soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 15]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(50);
  });

  test('returns 10 for words at puzzle 39 (end of soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 39]]);
    // progress = (39-15)/(40-15) = 24/25 = 0.96
    // penalty = 50 - (0.96 * 40) = 50 - 38.4 = 11.6 -> rounds to 12
    const penalty = calculateFreshnessPenalty('WORD', recencyMap);
    expect(penalty).toBeGreaterThanOrEqual(10);
    expect(penalty).toBeLessThanOrEqual(15);
  });

  test('returns 0 for words at puzzle 40+ (beyond soft cooldown)', () => {
    const recencyMap = new Map([['WORD', 40]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(0);
  });

  test('returns 0 for words at puzzle 100', () => {
    const recencyMap = new Map([['WORD', 100]]);
    expect(calculateFreshnessPenalty('WORD', recencyMap)).toBe(0);
  });

  test('penalty decreases linearly through soft cooldown', () => {
    const recencyMap = new Map<string, number>();

    // At puzzle 15: penalty ~50
    recencyMap.set('A', 15);
    const p15 = calculateFreshnessPenalty('A', recencyMap);

    // At puzzle 27 (midpoint): penalty ~30
    recencyMap.set('B', 27);
    const p27 = calculateFreshnessPenalty('B', recencyMap);

    // At puzzle 39: penalty ~12
    recencyMap.set('C', 39);
    const p39 = calculateFreshnessPenalty('C', recencyMap);

    expect(p15).toBeGreaterThan(p27);
    expect(p27).toBeGreaterThan(p39);
  });
});

describe('isInHardCooldown', () => {
  test('returns true for words used 0 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 0]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(true);
  });

  test('returns true for words used 14 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 14]]);
    expect(isInHardCooldown('WORD', recencyMap)).toBe(true);
  });

  test('returns false for words used exactly 15 puzzles ago', () => {
    const recencyMap = new Map([['WORD', 15]]);
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
