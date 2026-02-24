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

  // Narrative capture tests (assessment-driven enhancement)

  test('generateShareText includes victory title at Phase 2+', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 50,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 4,
      victoryTitle: 'WHY DOES\nIT MATTER?',
    });
    // Newlines in title should be flattened for sharing
    expect(text).toContain('WHY DOES IT MATTER?');
  });

  test('generateShareText does NOT include victory title at Phase 0-1', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 5,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 0,
      victoryTitle: 'PERFECT!',
    });
    // At Phase 0, we don't include the title since it's generic
    const lines = text.split('\n');
    expect(lines.some(l => l.trim() === 'PERFECT!')).toBe(false);
  });

  test('generateShareText includes totalWordsOffered at Phase 3+ when >= 100', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      level: 100,
      hintsUsed: 0,
      invalidAttempts: 1,
      moveCount: 4,
      phase: 4,
      totalWordsOffered: 500,
    });
    expect(text).toContain('500 words offered.');
  });

  test('generateShareText does NOT include totalWordsOffered when < 100 or phase < 3', () => {
    const textLowCount = generateShareText({
      stars: 2,
      difficulty: 'MEDIUM',
      level: 10,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 4,
      totalWordsOffered: 50,
    });
    expect(textLowCount).not.toContain('words offered');

    const textLowPhase = generateShareText({
      stars: 2,
      difficulty: 'MEDIUM',
      level: 10,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 1,
      totalWordsOffered: 200,
    });
    expect(textLowPhase).not.toContain('words offered');
  });

  test('generateShareText includes phase-aware tagline at Phase 2+', () => {
    const textPhase2 = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 30,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 2,
    });
    expect(textPhase2).toContain('The words are changing.');

    const textPhase4 = generateShareText({
      stars: 3,
      difficulty: 'HARD',
      level: 100,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 4,
      phase: 4,
    });
    expect(textPhase4).toContain('The arrangement continues.');
  });

  test('generateShareText does NOT include tagline at Phase 0-1', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      level: 5,
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      phase: 0,
    });
    expect(text).not.toContain('The words are changing');
    expect(text).not.toContain('Something is listening');
    expect(text).not.toContain('The arrangement continues');
  });

  test('generateShareText uses vertical word chain at Phase 3+', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      level: 100,
      hintsUsed: 0,
      invalidAttempts: 1,
      moveCount: 4,
      phase: 3,
      wordChain: ['VOID', 'ODD', 'DOOM'],
    });
    expect(text).toContain('↓');
    expect(text).not.toContain('→');
  });
});
