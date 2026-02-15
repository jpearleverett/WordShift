// Mock react-native Share API before importing anything
jest.mock('react-native', () => ({
  Share: { share: jest.fn(), sharedAction: 'sharedAction' },
  Platform: { OS: 'ios' },
}));

// Mock AsyncStorage (needed by achievements)
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
    },
  };
});

import { generateShareText } from '../services/shareResults';

describe('shareResults', () => {
  test('generateShareText includes level for regular puzzles', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 5,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
    });
    expect(text).toContain('Lv.5');
    expect(text).toContain('MEDIUM');
    expect(text).toContain('No hints, no mistakes');
  });

  test('generateShareText includes date for daily puzzles', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      level: 10,
      hintsUsed: 1,
      invalidAttempts: 0,
      isDaily: true,
      dailyDate: '2026-02-08',
      moveCount: 4,
    });
    expect(text).toContain('Daily');
    expect(text).toContain('2026-02-08');
    expect(text).toContain('HARD');
  });

  test('generateShareText shows correct stars', () => {
    const text3 = generateShareText({
      stars: 3,
      difficulty: 'EASY',
      level: 1,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 2,
    });
    const starMatches = text3.match(/⭐/g);
    expect(starMatches?.length).toBe(3);

    const text1 = generateShareText({
      stars: 1,
      difficulty: 'EASY',
      level: 1,
      hintsUsed: 2,
      invalidAttempts: 3,
      moveCount: 2,
    });
    const starMatches1 = text1.match(/⭐/g);
    expect(starMatches1?.length).toBe(1);
  });

  test('generateShareText includes performance grid', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'MEDIUM',
      level: 3,
      hintsUsed: 0,
      invalidAttempts: 1,
      moveCount: 3,
    });
    expect(text).toMatch(/🟩|🟨|🟧|🟥/);
  });

  test('generateShareText includes word chain when provided', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 5,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      wordChain: ['FLAME', 'FAME', 'FRAME'],
    });
    expect(text).toContain('FLAME');
    expect(text).toContain('FAME');
    expect(text).toContain('FRAME');
  });

  test('generateShareText includes incantation name when provided', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 5,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      incantationName: 'The FLAME Dance',
    });
    expect(text).toContain('"The FLAME Dance"');
  });

  test('generateShareText includes animal whisper when provided', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      level: 10,
      hintsUsed: 0,
      invalidAttempts: 1,
      moveCount: 4,
      animalWhisper: 'The fire knows your name.',
    });
    expect(text).toContain('"The fire knows your name."');
  });
});
