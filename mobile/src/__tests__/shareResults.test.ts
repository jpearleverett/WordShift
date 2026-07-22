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

import {
  generateShareText,
  maybeAwardDailyShareBonus,
  isDailyShareBonusAvailable,
  DAILY_SHARE_BONUS_AMBER,
  encodeChallengeLink,
  decodeChallengeLink,
  buildChallengeShareText,
  shareChallengeText,
  MIN_CHALLENGE_WORDS,
  MAX_CHALLENGE_WORDS,
  pickShareIntrigueTagline,
  SHARE_INTRIGUE_TAGLINES,
  CHALLENGE_TAUNTS,
} from '../services/shareResults';
import type { ShareableResult } from '../services/shareResults';
import { PLAY_STORE_URL, WEB_LANDING_URL } from '../constants/links';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('shareResults', () => {
  test('generateShareText includes WordShift header for regular puzzles', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
    });
    expect(text).toContain('WordShift');
    expect(text).toContain('MEDIUM');
    expect(text).toContain('No hints, no mistakes');
  });

  test('generateShareText includes date for daily puzzles', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      hintsUsed: 1,
      invalidAttempts: 0,
      isDaily: true,
      dailyDate: '2026-02-08',
      moveCount: 4,
    });
    expect(text).toContain('Daily');
    expect(text).toContain('2026-02-08');
    expect(text).toContain('HARD');
    expect(text).toContain('wordshift://challenge/daily');
  });

  test('generateShareText shows correct stars', () => {
    const text3 = generateShareText({
      stars: 3,
      difficulty: 'EASY',
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 2,
    });
    const starMatches = text3.match(/⭐/g);
    expect(starMatches?.length).toBe(3);

    const text1 = generateShareText({
      stars: 1,
      difficulty: 'EASY',
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
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      incantationName: 'The FLAME Dance',
    });
    expect(text).toContain('"The FLAME Dance"');
  });

  test('daily shares are spoiler-free (no word chain or incantation)', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'HARD',
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 5,
      isDaily: true,
      dailyDate: '2026-06-21',
      wordChain: ['VOID', 'VOIDS', 'AVOID'],
      incantationName: 'Offering: VOID to AVOID',
    });
    // Grid + date stay; the words must not leak today's daily puzzle.
    expect(text).toContain('2026-06-21');
    expect(text).not.toContain('VOID');
    expect(text).not.toContain('AVOID');
    expect(text).not.toContain('Offering: VOID');
  });

  test('non-daily shares still show the word chain', () => {
    const text = generateShareText({
      stars: 3,
      difficulty: 'MEDIUM',
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      wordChain: ['FLAME', 'FAME', 'FRAME'],
    });
    expect(text).toContain('FLAME');
  });

  test('generateShareText includes animal whisper when provided', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'HARD',
      hintsUsed: 0,
      invalidAttempts: 1,
      moveCount: 4,
      animalWhisper: 'The fire knows your name.',
    });
    expect(text).toContain('"The fire knows your name."');
  });

  test('generateShareText includes a play link for regular puzzles', () => {
    const text = generateShareText({
      stars: 2,
      difficulty: 'MEDIUM',
      hintsUsed: 1,
      invalidAttempts: 0,
      moveCount: 3,
    });
    expect(text).toContain('Play WordShift:');
    expect(text).toContain('wordshift://home');
  });

  describe('install CTA', () => {
    test('regular puzzle share includes both the deep link and the store link', () => {
      const text = generateShareText({
        stars: 3,
        difficulty: 'MEDIUM',
        hintsUsed: 0,
        invalidAttempts: 0,
        moveCount: 3,
      });
      expect(text).toContain('wordshift://home');
      expect(text).toContain(PLAY_STORE_URL);
    });

    test('daily share includes both the daily deep link and the store link', () => {
      const text = generateShareText({
        stars: 2,
        difficulty: 'HARD',
        hintsUsed: 1,
        invalidAttempts: 0,
        isDaily: true,
        dailyDate: '2026-06-21',
        moveCount: 5,
      });
      expect(text).toContain('wordshift://challenge/daily?date=2026-06-21');
      expect(text).toContain(PLAY_STORE_URL);
    });

    test('challenge-mode share includes the store link', () => {
      const text = generateShareText({
        stars: 3,
        difficulty: 'HARD',
        hintsUsed: 0,
        invalidAttempts: 0,
        moveCount: 5,
        isChallenge: true,
      });
      expect(text).toContain(PLAY_STORE_URL);
    });

    test('framed share still carries the store link', () => {
      const text = generateShareText({
        stars: 2,
        difficulty: 'MEDIUM',
        hintsUsed: 0,
        invalidAttempts: 1,
        moveCount: 3,
        shareFrame: 'frame_ritual',
      });
      expect(text).toContain(PLAY_STORE_URL);
    });

    test('link constants are real https URLs', () => {
      expect(PLAY_STORE_URL).toMatch(/^https:\/\/play\.google\.com\//);
      expect(WEB_LANDING_URL).toMatch(/^https:\/\//);
    });
  });

  describe('honest performance grid (moveOutcomes)', () => {
    test('renders one square per move in play order', () => {
      const text = generateShareText({
        stars: 1,
        difficulty: 'MEDIUM',
        hintsUsed: 1,
        invalidAttempts: 2,
        moveCount: 4,
        moveOutcomes: ['clean', 'mistake', 'hint', 'both'],
      });
      expect(text).toContain('🟩🟧🟨🟥');
    });

    test('mistake position is preserved (not front-loaded)', () => {
      const text = generateShareText({
        stars: 2,
        difficulty: 'EASY',
        hintsUsed: 0,
        invalidAttempts: 1,
        moveCount: 3,
        moveOutcomes: ['clean', 'clean', 'mistake'],
      });
      // Legacy fallback would front-load: 🟧🟩🟩. Honest grid keeps order.
      expect(text).toContain('🟩🟩🟧');
      expect(text).not.toContain('🟧🟩🟩');
    });

    test('legacy distribution fallback is unchanged when moveOutcomes absent', () => {
      const text = generateShareText({
        stars: 2,
        difficulty: 'EASY',
        hintsUsed: 0,
        invalidAttempts: 1,
        moveCount: 3,
      });
      expect(text).toContain('🟧🟩🟩');
    });
  });

  describe('friend challenge links', () => {
    test('encode/decode round-trip', () => {
      const words = ['FLAME', 'FAME', 'FRAME'];
      const link = encodeChallengeLink(words);
      expect(link).toBe('wordshift://challenge/p?w=FLAME-FAME-FRAME');
      expect(decodeChallengeLink(link)).toEqual(words);
    });

    test('round-trip at bounds (3-letter and 7-letter words, 6 words)', () => {
      const words = ['CAT', 'COAT', 'COAST', 'COASTS', 'ROASTED', 'DOG'];
      expect(decodeChallengeLink(encodeChallengeLink(words))).toEqual(words);
    });

    test('encode rejects invalid word sets', () => {
      expect(() => encodeChallengeLink([])).toThrow();
      expect(() => encodeChallengeLink(['CAT', 'DOG'])).toThrow(); // too few
      expect(() =>
        encodeChallengeLink(['CAT', 'DOG', 'FOX', 'OWL', 'BAT', 'RAT', 'PIG'])
      ).toThrow(); // too many
      expect(() => encodeChallengeLink(['cat', 'dog', 'fox'])).toThrow(); // lowercase
      expect(() => encodeChallengeLink(['CAT', 'DOG', 'PANGOLIN'])).toThrow(); // 8 letters
      expect(() => encodeChallengeLink(['CAT', 'DOG', 'AB'])).toThrow(); // 2 letters
    });

    test('decode returns null on malformed / untrusted input', () => {
      const malformed = [
        '',
        'wordshift://challenge/p?w=',
        'wordshift://challenge/p?w=cat-dog-fox', // lowercase
        'wordshift://challenge/p?w=CAT-DOG', // too few words
        'wordshift://challenge/p?w=CAT-DOG-FOX-OWL-BAT-RAT-PIG', // too many
        'wordshift://challenge/p?w=CAT-DOG-PANGOLIN', // 8-letter word
        'wordshift://challenge/p?w=CAT-DOG-FOX&x=1', // extra param
        'wordshift://challenge/p?w=CAT-DOG-FOX#frag', // fragment
        'wordshift://challenge/p?w=CAT DOG FOX', // spaces
        'wordshift://challenge/p?w=CAT-DOG-F0X', // digit
        "wordshift://challenge/p?w=CAT-DOG-';DROP", // injection-ish
        'wordshift://challenge/p?w=CAT-DOG-%46OX', // percent-encoding
        'wordshift://challenge/p?w=-CAT-DOG-FOX', // leading dash → empty word
        'wordshift://challenge/p?w=CAT--DOG-FOX', // double dash → empty word
        'wordshift://challenge/daily', // wrong path
        'wordshift://home',
        'https://evil.example/challenge/p?w=CAT-DOG-FOX', // wrong scheme
        'WORDSHIFT://CHALLENGE/P?W=CAT-DOG-FOX', // wrong-case prefix
      ];
      for (const url of malformed) {
        expect(decodeChallengeLink(url)).toBeNull();
      }
    });

    test('buildChallengeShareText includes taunt, deep link, and store link only', () => {
      const text = buildChallengeShareText(['FLAME', 'FAME', 'FRAME'], 'Ember');
      expect(text).toContain('Ember');
      expect(text).toContain('wordshift://challenge/p?w=FLAME-FAME-FRAME');
      expect(text).toContain(PLAY_STORE_URL);
      // No spoilers beyond the starting chain: exactly 3 lines.
      expect(text.split('\n')).toHaveLength(3);
    });

    test('buildChallengeShareText works without a player name', () => {
      const text = buildChallengeShareText(['CAT', 'COAT', 'GOAT']);
      expect(text).toContain('wordshift://challenge/p?w=CAT-COAT-GOAT');
      expect(text).toContain(PLAY_STORE_URL);
    });

    test('challenge taunt is phase-aware (bright playful vs dread) yet always spoiler-safe', () => {
      const words = ['FLAME', 'FAME', 'FRAME'];
      const bright = buildChallengeShareText(words, undefined, 0);
      const dread = buildChallengeShareText(words, undefined, 4);
      // The taunt line differs by phase...
      expect(bright.split('\n')[0]).not.toBe(dread.split('\n')[0]);
      expect(bright).toContain('Think you can shift it?');
      // ...while every phase keeps the exact link + store CTA and 3-line shape.
      for (const phase of [0, 1, 2, 3, 4, 5]) {
        const text = buildChallengeShareText(words, undefined, phase);
        expect(text).toContain('wordshift://challenge/p?w=FLAME-FAME-FRAME');
        expect(text).toContain(PLAY_STORE_URL);
        expect(text.split('\n')).toHaveLength(3);
      }
    });

    test('challenge taunt pools are dash-free (named and anon, every tier)', () => {
      const DASH = /[–—]/;
      for (const tier of Object.values(CHALLENGE_TAUNTS)) {
        expect(DASH.test(tier.anon)).toBe(false);
        expect(DASH.test(tier.named('Ember'))).toBe(false);
      }
    });

    test('word-count bounds are exported as the single source of truth (3-6)', () => {
      // usePuzzleGame.startSharedChallengeGame imports these — keep the two
      // features on one authoritative limit.
      expect(MIN_CHALLENGE_WORDS).toBe(3);
      expect(MAX_CHALLENGE_WORDS).toBe(6);
    });
  });

  describe('shareChallengeText', () => {
    const SHARE_BONUS_KEY = 'wordshift_share_bonus_date';
    const SHARE_COUNT_KEY = 'wordshift_share_count';
    const shareMock = Share.share as jest.Mock;

    beforeEach(async () => {
      shareMock.mockReset();
      // Leave the once-per-day bonus unclaimed for each test (and for the
      // later daily-bonus test — this file shares one AsyncStorage store).
      await AsyncStorage.removeItem(SHARE_BONUS_KEY);
    });

    afterEach(async () => {
      await AsyncStorage.removeItem(SHARE_BONUS_KEY);
    });

    test('completed share records success: share count + daily bonus', async () => {
      const { getFullProgress, clearProgress } = require('../services/amberCurrency');
      await clearProgress();
      await AsyncStorage.removeItem(SHARE_COUNT_KEY);
      shareMock.mockResolvedValue({ action: 'sharedAction' });

      const text = buildChallengeShareText(['FLAME', 'FAME', 'FRAME']);
      const ok = await shareChallengeText(text);

      expect(ok).toBe(true);
      expect(shareMock).toHaveBeenCalledWith({ message: text });
      // Share-count achievement stat bumped…
      expect(await AsyncStorage.getItem(SHARE_COUNT_KEY)).toBe('1');
      // …and the first-share-of-day amber bonus credited, same as the
      // sharePuzzleResult / image paths.
      const progress = await getFullProgress();
      expect(progress.amber).toBe(DAILY_SHARE_BONUS_AMBER);
      expect(await isDailyShareBonusAvailable()).toBe(false);
    });

    test('dismissed share sheet records nothing', async () => {
      await AsyncStorage.removeItem(SHARE_COUNT_KEY);
      shareMock.mockResolvedValue({ action: 'dismissedAction' });

      const ok = await shareChallengeText('challenge text');

      expect(ok).toBe(false);
      expect(await AsyncStorage.getItem(SHARE_COUNT_KEY)).toBeNull();
      expect(await isDailyShareBonusAvailable()).toBe(true);
    });

    test('share failure resolves false without throwing', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        shareMock.mockRejectedValue(new Error('no share sheet'));
        await expect(shareChallengeText('challenge text')).resolves.toBe(false);
        expect(await isDailyShareBonusAvailable()).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  test('daily share bonus is awarded once per day', async () => {
    const { getFullProgress, clearProgress } = require('../services/amberCurrency');
    await clearProgress();

    const first = await maybeAwardDailyShareBonus();
    expect(first).toBe(DAILY_SHARE_BONUS_AMBER);

    const second = await maybeAwardDailyShareBonus();
    expect(second).toBe(0);

    const progress = await getFullProgress();
    expect(progress.amber).toBe(DAILY_SHARE_BONUS_AMBER);
  });

  describe('spoiler-safe intrigue tagline (early share card)', () => {
    const base = (over: Partial<ShareableResult> = {}): ShareableResult => ({
      stars: 3,
      difficulty: 'MEDIUM',
      hintsUsed: 0,
      invalidAttempts: 0,
      moveCount: 3,
      wordChain: ['FLAME', 'FAME', 'FRAME'],
      ...over,
    });

    test('Phase 0 non-daily card gets an intrigue tagline from the pool', () => {
      const tag = pickShareIntrigueTagline(base({ phase: 0 }));
      expect(tag).not.toBeNull();
      expect(SHARE_INTRIGUE_TAGLINES[0]).toContain(tag);
    });

    test('Phase 1 non-daily card gets an intrigue tagline from the pool', () => {
      const tag = pickShareIntrigueTagline(base({ phase: 1 }));
      expect(tag).not.toBeNull();
      expect(SHARE_INTRIGUE_TAGLINES[1]).toContain(tag);
    });

    test('daily cards get no intrigue tagline (kept spoiler-free / unchanged)', () => {
      expect(
        pickShareIntrigueTagline(base({ phase: 0, isDaily: true, dailyDate: '2026-06-21' }))
      ).toBeNull();
      expect(
        pickShareIntrigueTagline(base({ phase: 1, isDaily: true, dailyDate: '2026-06-21' }))
      ).toBeNull();
    });

    test('dark phases (>= 2) get no intrigue tagline (keep existing tagline)', () => {
      for (const phase of [2, 3, 4, 5]) {
        expect(pickShareIntrigueTagline(base({ phase }))).toBeNull();
      }
    });

    test('missing phase defaults to Phase 0 intrigue', () => {
      const tag = pickShareIntrigueTagline(base({ phase: undefined }));
      expect(SHARE_INTRIGUE_TAGLINES[0]).toContain(tag);
    });

    test('deterministic per result: same result yields the same tagline', () => {
      const r = base({ phase: 0 });
      expect(pickShareIntrigueTagline(r)).toBe(pickShareIntrigueTagline(r));
    });

    test('taglines vary across different results (seed spreads over the pool)', () => {
      const seen = new Set<string | null>();
      for (let i = 0; i < 40; i++) {
        seen.add(
          pickShareIntrigueTagline(
            base({ phase: 0, moveCount: i, stars: (i % 3) + 1, wordChain: [`AA${i}`] })
          )
        );
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    test('intrigue tagline pools are dash-free', () => {
      const DASH = /[–—]/;
      for (const pool of Object.values(SHARE_INTRIGUE_TAGLINES)) {
        for (const line of pool) {
          expect(DASH.test(line)).toBe(false);
        }
      }
    });
  });
});
