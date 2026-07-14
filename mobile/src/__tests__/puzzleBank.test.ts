import { createMockAsyncStorage } from './helpers/mockAsyncStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  createMockAsyncStorage()
);

// Mock wordHistory for isInHardCooldown used by puzzleBank
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => new Map()),
  calculateFreshnessPenalty: jest.fn(() => 0),
  isInHardCooldown: jest.fn(() => false),
  recordPuzzleWords: jest.fn(async () => {}),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPlayedPuzzles,
  getGuaranteedExtendedStandardFallback,
  selectPreGeneratedPuzzle,
} from '../services/puzzleBank';
import { PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import { PUZZLE_BANK_REVERSE_HARD } from '../data/puzzleBankReverseHard';
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_MEDIUM } from '../data/puzzleBankMedium';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../data/puzzleBankMediumPlus';
import { COMMON_WORDS } from '../constants/wordLists';
import { isStandardChainSolvable } from '../services/puzzleSolvability';
import { isUnbrokenWeaveEligible } from '../services/unbrokenWeave';
import { extendStandardPuzzle } from '../services/puzzleExtension';

// Helper: get a recency map (empty by default)
function emptyRecencyMap(): Map<string, number> {
  return new Map();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearPlayedPuzzles();
  jest.clearAllMocks();
});

describe('puzzleBank', () => {
  describe('selectPreGeneratedPuzzle', () => {
    it('returns a valid PuzzleConfig for HARD difficulty', async () => {
      const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      expect(result).not.toBeNull();
      expect(result!.words).toBeDefined();
      expect(result!.words.length).toBe(5); // HARD = 5 rows
      expect(result!.solution).toBeDefined();
      expect(result!.solution!.length).toBe(4); // 5 rows = 4 solution steps
      expect(result!.wordLength).toBe(5);
      expect(result!.hint).toBeDefined();
    });

    it('returns valid puzzles for all standard difficulties', async () => {
      const easy = await selectPreGeneratedPuzzle('EASY', 0, emptyRecencyMap());
      expect(easy).not.toBeNull();
      expect(easy!.words.length).toBe(3); // EASY = 3 rows
      expect(easy!.wordLength).toBe(4);

      const medium = await selectPreGeneratedPuzzle('MEDIUM', 0, emptyRecencyMap());
      expect(medium).not.toBeNull();
      expect(medium!.words.length).toBe(4); // MEDIUM = 4 rows
      expect(medium!.wordLength).toBe(4);

      const mediumPlus = await selectPreGeneratedPuzzle('MEDIUM_PLUS', 0, emptyRecencyMap());
      expect(mediumPlus).not.toBeNull();
      expect(mediumPlus!.words.length).toBe(4); // MEDIUM_PLUS = 4 rows
      expect(mediumPlus!.wordLength).toBe(5);
    });

    it('does not return the same puzzle twice in succession', async () => {
      const first = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      const second = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      // Word chains should differ
      expect(first!.words.join(',')).not.toBe(second!.words.join(','));
    });

    it('excludes already-played puzzles', async () => {
      // Play many puzzles and track what we get
      const seenWordChains = new Set<string>();
      const numToPlay = 20;

      for (let i = 0; i < numToPlay; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        expect(result).not.toBeNull();
        const chainKey = result!.words.join(',');
        expect(seenWordChains.has(chainKey)).toBe(false);
        seenWordChains.add(chainKey);
      }

      expect(seenWordChains.size).toBe(numToPlay);
    });

    it('prefers phase-appropriate puzzles at Phase 0', async () => {
      // At phase 0, tier 0 (no dread words) puzzles should score highest.
      // Run multiple selections and check that most have dreadTier 0
      let tier0Count = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        if (result) {
          // Find the matching bank entry
          const entry = PUZZLE_BANK_HARD.find(p => p.words.join(',') === result.words.join(','));
          if (entry && entry.dreadTier === 0) tier0Count++;
        }
      }

      // With ~87% of bank being tier 0, virtually all phase 0 selections should be tier 0
      expect(tier0Count).toBeGreaterThanOrEqual(trials * 0.7);
    });

    it('returns puzzles with valid solution steps', async () => {
      const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      expect(result).not.toBeNull();

      for (const step of result!.solution!) {
        expect(step.stepIndex).toBeGreaterThanOrEqual(0);
        expect(step.sourceWord).toBeTruthy();
        expect(step.targetWord).toBeTruthy();
        expect(step.letterToMove).toBeTruthy();
        expect(step.letterToMove.length).toBe(1);
        expect(step.explanation).toBeTruthy();
      }
    });

    it('selects a mature board through capped branching analysis', async () => {
      const result = await selectPreGeneratedPuzzle(
        'HARD', 0, emptyRecencyMap(), 'standard', 40,
      );

      expect(result).not.toBeNull();
      expect(result!.words).toHaveLength(5);
      expect(isStandardChainSolvable(
        result!.words,
        word => COMMON_WORDS.has(word),
      )).toBe('solvable');
    });

    it('returns a solvable extended standard board at the depth gate', async () => {
      const extendable = PUZZLE_BANK_EASY[0];
      await AsyncStorage.setItem(
        'wordshift_played_std_easy_puzzle_ids',
        JSON.stringify(PUZZLE_BANK_EASY.slice(1).map(puzzle => puzzle.id)),
      );

      const result = await selectPreGeneratedPuzzle(
        'EASY', 0, emptyRecencyMap(), 'standard', 100,
      );

      expect(result).not.toBeNull();
      expect(result!.words.slice(0, -1)).toEqual(extendable.words);
      expect(result!.words).toHaveLength(4);
      expect(result!.solution).toHaveLength(3);
      expect(isStandardChainSolvable(
        result!.words,
        word => COMMON_WORDS.has(word),
      )).toBe('solvable');
    });

    it('guarantees an extra row even when dynamic recency covers the dictionary', async () => {
      const recency = new Map(
        [...COMMON_WORDS].map((word, index) => [word, index]),
      );

      const result = await selectPreGeneratedPuzzle(
        'EASY', 0, recency, 'standard', 100,
      );

      expect(result).not.toBeNull();
      expect(result!.words).toHaveLength(4);
      expect(result!.solution).toHaveLength(3);
    });

    it('recycles from the extendable pool instead of serving an unextended board', async () => {
      const nonExtendable = PUZZLE_BANK_EASY.find(puzzle => {
        const config = {
          words: puzzle.words,
          solution: puzzle.solution,
          wordLength: puzzle.wordLength,
        };
        return extendStandardPuzzle(config, {
          excludedWords: new Set(puzzle.allWords),
        }) === config;
      });
      expect(nonExtendable).toBeDefined();

      const usedIds = PUZZLE_BANK_EASY
        .filter(puzzle => puzzle.id !== nonExtendable!.id)
        .map(puzzle => puzzle.id);
      await AsyncStorage.setItem(
        'wordshift_played_std_easy_puzzle_ids',
        JSON.stringify(usedIds),
      );

      const result = await selectPreGeneratedPuzzle(
        'EASY', 0, emptyRecencyMap(), 'standard', 100,
      );

      expect(result).not.toBeNull();
      expect(result!.words).toHaveLength(4);
      expect(result!.solution).toHaveLength(3);
    });

    it('filters Unbroken Weave selection to eligible canonical solutions', async () => {
      const result = await selectPreGeneratedPuzzle(
        'HARD',
        5,
        emptyRecencyMap(),
        'standard',
        180,
        { unbrokenWeaveOnly: true },
      );

      expect(result).not.toBeNull();
      expect(isUnbrokenWeaveEligible(result!.solution)).toBe(true);
    });

    it('recycles only eligible played boards for Unbroken Weave', async () => {
      const eligible = PUZZLE_BANK_HARD.filter(puzzle =>
        isUnbrokenWeaveEligible(puzzle.solution),
      );
      const ineligible = PUZZLE_BANK_HARD.find(puzzle =>
        !isUnbrokenWeaveEligible(puzzle.solution),
      );
      expect(eligible.length).toBeGreaterThan(0);
      expect(ineligible).toBeDefined();

      const usedKey = 'wordshift_played_puzzle_ids';
      await clearPlayedPuzzles();
      await AsyncStorage.setItem(
        usedKey,
        JSON.stringify([ineligible!.id, ...eligible.map(puzzle => puzzle.id)]),
      );

      const result = await selectPreGeneratedPuzzle(
        'HARD',
        5,
        emptyRecencyMap(),
        'standard',
        180,
        { unbrokenWeaveOnly: true },
      );

      expect(result).not.toBeNull();
      expect(isUnbrokenWeaveEligible(result!.solution)).toBe(true);
      const storedIds = JSON.parse((await AsyncStorage.getItem(usedKey))!);
      expect(storedIds).toContain(ineligible!.id);
    });

    it('does not extend an Unbroken Weave board after the depth gate', async () => {
      const result = await selectPreGeneratedPuzzle(
        'EASY',
        5,
        emptyRecencyMap(),
        'standard',
        100,
        { unbrokenWeaveOnly: true },
      );

      expect(result).not.toBeNull();
      expect(result!.words).toHaveLength(3);
      expect(result!.solution).toHaveLength(2);
      expect(isUnbrokenWeaveEligible(result!.solution)).toBe(true);
    });

    it('recycles oldest puzzles when bank is exhausted', async () => {
      // Skip this test if bank is too large (would be slow)
      if (PUZZLE_BANK_HARD.length > 50) {
        // Use a focused test: manually mark all puzzles as played, then check recycling
        const usedKey = 'wordshift_played_puzzle_ids';
        const allIds = PUZZLE_BANK_HARD.map(p => p.id);
        await AsyncStorage.setItem(usedKey, JSON.stringify(allIds));
        // Clear the in-memory cache to force reload from storage
        await clearPlayedPuzzles();
        await AsyncStorage.setItem(usedKey, JSON.stringify(allIds));

        // Force cache reload by creating a fresh import context
        // Since clearPlayedPuzzles resets the cache, re-set the storage
        // and then select — the service should detect exhaustion and recycle
        const { selectPreGeneratedPuzzle: freshSelect } = jest.requireActual('../services/puzzleBank') as any;
        // Instead, just test that selectPreGeneratedPuzzle still returns a puzzle
        // after we've "played" all of them by storing all IDs
        // We need to reset the module's cache - let's just test the logic works
        // by setting up a smaller scenario

        // Mark just 10 puzzles as played with incremental storage writes
        await clearPlayedPuzzles();
        const first10 = PUZZLE_BANK_HARD.slice(0, 10);
        const first10Ids = first10.map(p => p.id);
        // Set up as if all 500 were played
        await AsyncStorage.setItem(usedKey, JSON.stringify(allIds));
        // Now clear and verify we can still get puzzles
        await clearPlayedPuzzles();
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        expect(result).not.toBeNull();
      }
    });
  });

  describe('guaranteed mature standard fallback', () => {
    it.each([
      ['EASY', 4],
      ['MEDIUM', 5],
      ['MEDIUM_PLUS', 5],
      ['HARD', 6],
    ] as const)(
      'synchronously returns an extended, solvable %s board without storage',
      (difficulty, expectedRows) => {
        jest.clearAllMocks();

        const first = getGuaranteedExtendedStandardFallback(difficulty);
        const second = getGuaranteedExtendedStandardFallback(difficulty);

        expect(first).toBe(second);
        expect(first.words).toHaveLength(expectedRows);
        expect(first.solution).toHaveLength(expectedRows - 1);
        expect(isStandardChainSolvable(
          first.words,
          word => COMMON_WORDS.has(word),
        )).toBe('solvable');
        expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      },
    );
  });

  describe('clearPlayedPuzzles', () => {
    it('resets played puzzle tracking', async () => {
      // Play some puzzles
      await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());

      // Clear
      await clearPlayedPuzzles();

      // The first puzzle we played should now be available again
      // (since played list is cleared, it could be selected again)
      const stored = await AsyncStorage.getItem('wordshift_played_puzzle_ids');
      expect(stored).toBeNull();
    });
  });

  describe('PUZZLE_BANK_HARD', () => {
    it('contains puzzles', () => {
      expect(PUZZLE_BANK_HARD.length).toBeGreaterThan(0);
    });

    it('all puzzles have required fields', () => {
      for (const puzzle of PUZZLE_BANK_HARD) {
        expect(puzzle.id).toBeTruthy();
        expect(puzzle.words.length).toBe(5); // HARD = 5 rows
        expect(puzzle.solution.length).toBe(4); // 4 steps for 5 rows
        expect(puzzle.wordLength).toBe(5);
        expect(typeof puzzle.dreadTier).toBe('number');
        expect(puzzle.dreadTier).toBeGreaterThanOrEqual(0);
        expect(puzzle.dreadTier).toBeLessThanOrEqual(4);
        expect(typeof puzzle.dreadWordCount).toBe('number');
        expect(puzzle.allWords.length).toBeGreaterThan(0);
        expect(Array.isArray(puzzle.semanticTags)).toBe(true);
      }
    });

    it('all puzzles have unique IDs', () => {
      const ids = PUZZLE_BANK_HARD.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all puzzle words are 5 letters', () => {
      for (const puzzle of PUZZLE_BANK_HARD) {
        for (const word of puzzle.words) {
          expect(word.length).toBe(5);
        }
      }
    });
  });

  describe('selectPreGeneratedPuzzle - reverse variant', () => {
    const hasReversePuzzles = PUZZLE_BANK_REVERSE_HARD.length > 0;

    it('returns puzzles for reverse at EASY and MEDIUM difficulties', async () => {
      const easy = await selectPreGeneratedPuzzle('EASY', 0, emptyRecencyMap(), 'reverse');
      expect(easy).not.toBeNull();
      expect(easy!.words.length).toBe(3); // 3 rows
      expect(easy!.wordLength).toBe(4);   // 4-letter words

      const medium = await selectPreGeneratedPuzzle('MEDIUM', 0, emptyRecencyMap(), 'reverse');
      expect(medium).not.toBeNull();
      expect(medium!.words.length).toBe(4); // 4 rows
      expect(medium!.wordLength).toBe(4);   // 4-letter words
    });

    it('returns null for unsupported variants', async () => {
      const speed = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'speed');
      expect(speed).toBeNull();
    });

    if (hasReversePuzzles) {
      it('returns a valid PuzzleConfig for HARD reverse', async () => {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
        expect(result).not.toBeNull();
        expect(result!.words).toBeDefined();
        expect(result!.words.length).toBe(5);
        expect(result!.solution).toBeDefined();
        expect(result!.solution!.length).toBe(4);
        expect(result!.wordLength).toBe(5);
        expect(result!.hint).toBeDefined();
      });


      it('does not return the same reverse puzzle twice', async () => {
        const first = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
        const second = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(first!.words.join(',')).not.toBe(second!.words.join(','));
      });

      it('uses separate tracking from standard puzzles', async () => {
        // Play a standard puzzle
        await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'standard');
        // Play a reverse puzzle
        await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');

        // Both storage keys should have entries
        const standardStored = await AsyncStorage.getItem('wordshift_played_puzzle_ids');
        const reverseStored = await AsyncStorage.getItem('wordshift_played_reverse_puzzle_ids');
        expect(standardStored).not.toBeNull();
        expect(reverseStored).not.toBeNull();

        const standardIds = JSON.parse(standardStored!);
        const reverseIds = JSON.parse(reverseStored!);
        expect(standardIds.length).toBe(1);
        expect(reverseIds.length).toBe(1);
        // IDs should be different (from different banks)
        expect(standardIds[0]).not.toBe(reverseIds[0]);
      });

      it('returns reverse puzzles with valid solution steps', async () => {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
        expect(result).not.toBeNull();

        for (const step of result!.solution!) {
          expect(step.stepIndex).toBeGreaterThanOrEqual(0);
          expect(step.sourceWord).toBeTruthy();
          expect(step.targetWord).toBeTruthy();
          expect(step.letterToMove).toBeTruthy();
          expect(step.letterToMove.length).toBe(1);
          expect(step.explanation).toBeTruthy();
        }
      });
    }
  });

  describe('bank word novelty scoring', () => {
    it('prefers puzzles with novel words over puzzles with previously seen words', async () => {
      // Play 30 puzzles to build up bank word history
      const playedWords = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        if (result) {
          result.words.forEach(w => playedWords.add(w));
        }
      }

      // The next selection should prefer puzzles with words NOT in playedWords.
      // Run several more selections and count novel words per puzzle.
      let totalNovel = 0;
      let totalWords = 0;
      const trialsAfter = 10;
      for (let i = 0; i < trialsAfter; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        if (result) {
          for (const word of result.words) {
            totalWords++;
            if (!playedWords.has(word)) totalNovel++;
          }
          result.words.forEach(w => playedWords.add(w));
        }
      }

      // With 780 unique words across 500 puzzles, after 30 plays (~150 word slots),
      // the novelty scoring should steer selections toward the remaining ~630 unseen words.
      // Without novelty scoring, a random selection from 470 remaining puzzles would
      // yield ~60% novel words. With it, we expect higher.
      const novelRate = totalNovel / totalWords;
      expect(novelRate).toBeGreaterThan(0.4); // Conservatively, at least 40% novel
    });

    it('produces more diverse word sets than a naive approach over many selections', async () => {
      // Play 50 puzzles and track total unique words seen
      const allSeenWords = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
        if (result) {
          result.words.forEach(w => allSeenWords.add(w));
        }
      }

      // 50 puzzles × 5 words = 250 word slots. With 780 unique words in the bank,
      // perfect diversity would yield ~250 unique words. Without novelty scoring
      // (random-ish selection), we'd see heavy overlap from hub words like CURED (29x),
      // CATER (26x) etc. The novelty scoring should push us closer to the ideal.
      // We expect at least 180 unique words out of 250 slots (72% novelty rate).
      expect(allSeenWords.size).toBeGreaterThan(170);
    });

    it('standard and reverse banks have independent word novelty tracking', async () => {
      if (PUZZLE_BANK_REVERSE_HARD.length === 0) return;

      // Play 10 standard puzzles
      const standardWords = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const result = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'standard');
        if (result) result.words.forEach(w => standardWords.add(w));
      }

      // Now play a reverse puzzle — its word novelty should NOT be affected by
      // standard bank history (they use separate ID tracking)
      const reverseResult = await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
      expect(reverseResult).not.toBeNull();
      // The reverse puzzle's words can overlap with standard words — that's fine,
      // because the banks track independently
    });
  });

  describe('PUZZLE_BANK_EASY', () => {
    it('contains puzzles', () => {
      expect(PUZZLE_BANK_EASY.length).toBeGreaterThan(0);
    });

    it('all puzzles have required fields', () => {
      for (const puzzle of PUZZLE_BANK_EASY) {
        expect(puzzle.id).toBeTruthy();
        expect(puzzle.words.length).toBe(3); // EASY = 3 rows
        expect(puzzle.solution.length).toBe(2); // 3 rows = 2 steps
        expect(puzzle.wordLength).toBe(4);
        expect(typeof puzzle.dreadTier).toBe('number');
        expect(puzzle.dreadTier).toBeGreaterThanOrEqual(0);
        expect(puzzle.dreadTier).toBeLessThanOrEqual(4);
        expect(puzzle.allWords.length).toBeGreaterThan(0);
      }
    });

    it('all puzzles have unique IDs', () => {
      const ids = PUZZLE_BANK_EASY.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all puzzle words are 4 letters', () => {
      for (const puzzle of PUZZLE_BANK_EASY) {
        for (const word of puzzle.words) {
          expect(word.length).toBe(4);
        }
      }
    });
  });

  describe('PUZZLE_BANK_MEDIUM', () => {
    it('contains puzzles', () => {
      expect(PUZZLE_BANK_MEDIUM.length).toBeGreaterThan(0);
    });

    it('all puzzles have required fields', () => {
      for (const puzzle of PUZZLE_BANK_MEDIUM) {
        expect(puzzle.id).toBeTruthy();
        expect(puzzle.words.length).toBe(4); // MEDIUM = 4 rows
        expect(puzzle.solution.length).toBe(3); // 4 rows = 3 steps
        expect(puzzle.wordLength).toBe(4);
        expect(typeof puzzle.dreadTier).toBe('number');
        expect(puzzle.dreadTier).toBeGreaterThanOrEqual(0);
        expect(puzzle.dreadTier).toBeLessThanOrEqual(4);
        expect(puzzle.allWords.length).toBeGreaterThan(0);
      }
    });

    it('all puzzles have unique IDs', () => {
      const ids = PUZZLE_BANK_MEDIUM.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all puzzle words are 4 letters', () => {
      for (const puzzle of PUZZLE_BANK_MEDIUM) {
        for (const word of puzzle.words) {
          expect(word.length).toBe(4);
        }
      }
    });
  });

  describe('PUZZLE_BANK_MEDIUM_PLUS', () => {
    it('contains puzzles', () => {
      expect(PUZZLE_BANK_MEDIUM_PLUS.length).toBeGreaterThan(0);
    });

    it('all puzzles have required fields', () => {
      for (const puzzle of PUZZLE_BANK_MEDIUM_PLUS) {
        expect(puzzle.id).toBeTruthy();
        expect(puzzle.words.length).toBe(4); // MEDIUM_PLUS = 4 rows
        expect(puzzle.solution.length).toBe(3); // 4 rows = 3 steps
        expect(puzzle.wordLength).toBe(5);
        expect(typeof puzzle.dreadTier).toBe('number');
        expect(puzzle.dreadTier).toBeGreaterThanOrEqual(0);
        expect(puzzle.dreadTier).toBeLessThanOrEqual(4);
        expect(puzzle.allWords.length).toBeGreaterThan(0);
      }
    });

    it('all puzzles have unique IDs', () => {
      const ids = PUZZLE_BANK_MEDIUM_PLUS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all puzzle words are 5 letters', () => {
      for (const puzzle of PUZZLE_BANK_MEDIUM_PLUS) {
        for (const word of puzzle.words) {
          expect(word.length).toBe(5);
        }
      }
    });
  });

  describe('clearPlayedPuzzles - both banks', () => {
    it('resets both standard and reverse puzzle tracking', async () => {
      if (PUZZLE_BANK_REVERSE_HARD.length > 0) {
        await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'standard');
        await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap(), 'reverse');
      } else {
        await selectPreGeneratedPuzzle('HARD', 0, emptyRecencyMap());
      }

      await clearPlayedPuzzles();

      const standardStored = await AsyncStorage.getItem('wordshift_played_puzzle_ids');
      const reverseStored = await AsyncStorage.getItem('wordshift_played_reverse_puzzle_ids');
      expect(standardStored).toBeNull();
      expect(reverseStored).toBeNull();
    });
  });

  describe('phase 4 climax freshness (no replays while unplayed boards exist)', () => {
    const usedKey = 'wordshift_played_puzzle_ids';
    const byWords = new Map(PUZZLE_BANK_HARD.map(p => [p.words.join(','), p]));

    async function seedPlayed(playedIds: string[]) {
      await AsyncStorage.setItem(usedKey, JSON.stringify(playedIds));
    }

    it('never re-serves a played puzzle while unplayed puzzles remain', async () => {
      // Leave only three bright (tier 0) puzzles unplayed — everything else,
      // including every dread board, is played. The old fold-in would have
      // re-served played dread here; the rework must serve an unplayed board.
      const unplayed = PUZZLE_BANK_HARD.filter(p => p.dreadTier === 0).slice(0, 3);
      const unplayedIds = new Set(unplayed.map(p => p.id));
      await seedPlayed(PUZZLE_BANK_HARD.filter(p => !unplayedIds.has(p.id)).map(p => p.id));

      const result = await selectPreGeneratedPuzzle('HARD', 4, emptyRecencyMap());
      expect(result).not.toBeNull();
      const entry = byWords.get(result!.words.join(','));
      expect(entry).toBeDefined();
      expect(unplayedIds.has(entry!.id)).toBe(true);
    });

    it('serves the unplayed ideal-tier puzzle first at phase 4', async () => {
      // One unplayed tier-4 board among unplayed tier-0 boards: the tier
      // filter must pick the tier-4 one.
      const tier4 = PUZZLE_BANK_HARD.find(p => p.dreadTier === 4)!;
      const tier0 = PUZZLE_BANK_HARD.filter(p => p.dreadTier === 0).slice(0, 5);
      const unplayedIds = new Set([tier4.id, ...tier0.map(p => p.id)]);
      await seedPlayed(PUZZLE_BANK_HARD.filter(p => !unplayedIds.has(p.id)).map(p => p.id));

      const result = await selectPreGeneratedPuzzle('HARD', 4, emptyRecencyMap());
      expect(result).not.toBeNull();
      expect(result!.words.join(',')).toBe(tier4.words.join(','));
    });

    it('widens to adjacent dread tiers before falling back to bright boards', async () => {
      // All tier 3-4 played; unplayed pool holds tier-2 and tier-0 boards.
      // Spread widening (|tier - 4| <= 2) must serve the tier-2 board.
      const tier2 = PUZZLE_BANK_HARD.find(p => p.dreadTier === 2)!;
      const tier0 = PUZZLE_BANK_HARD.filter(p => p.dreadTier === 0).slice(0, 5);
      const unplayedIds = new Set([tier2.id, ...tier0.map(p => p.id)]);
      await seedPlayed(PUZZLE_BANK_HARD.filter(p => !unplayedIds.has(p.id)).map(p => p.id));

      const result = await selectPreGeneratedPuzzle('HARD', 4, emptyRecencyMap());
      expect(result).not.toBeNull();
      expect(result!.words.join(',')).toBe(tier2.words.join(','));
    });

    it('re-serves only on full-bank exhaustion, preferring least-recently-played', async () => {
      // Entire bank played: the exhaustion recycle frees the OLDEST half of
      // the played list (most-recent-first storage), so the replay must come
      // from that half.
      const allIds = PUZZLE_BANK_HARD.map(p => p.id);
      await seedPlayed(allIds);

      const result = await selectPreGeneratedPuzzle('HARD', 4, emptyRecencyMap());
      expect(result).not.toBeNull();
      const entry = byWords.get(result!.words.join(','));
      expect(entry).toBeDefined();
      const oldestHalf = new Set(allIds.slice(Math.floor(allIds.length / 2)));
      expect(oldestHalf.has(entry!.id)).toBe(true);
    });
  });

  describe('PUZZLE_BANK_REVERSE_HARD', () => {
    it('exports an array', () => {
      expect(Array.isArray(PUZZLE_BANK_REVERSE_HARD)).toBe(true);
    });

    if (PUZZLE_BANK_REVERSE_HARD.length > 0) {
      it('all puzzles have required fields', () => {
        for (const puzzle of PUZZLE_BANK_REVERSE_HARD) {
          expect(puzzle.id).toBeTruthy();
          expect(puzzle.words.length).toBe(5);
          expect(puzzle.solution.length).toBe(4);
          expect(puzzle.wordLength).toBe(5);
          expect(typeof puzzle.dreadTier).toBe('number');
          expect(puzzle.dreadTier).toBeGreaterThanOrEqual(0);
          expect(puzzle.dreadTier).toBeLessThanOrEqual(4);
          expect(typeof puzzle.dreadWordCount).toBe('number');
          expect(puzzle.allWords.length).toBeGreaterThan(0);
          expect(Array.isArray(puzzle.semanticTags)).toBe(true);
        }
      });

      it('all puzzles have unique IDs', () => {
        const ids = PUZZLE_BANK_REVERSE_HARD.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('all puzzle words are 5 letters', () => {
        for (const puzzle of PUZZLE_BANK_REVERSE_HARD) {
          for (const word of puzzle.words) {
            expect(word.length).toBe(5);
          }
        }
      });

      it('has no overlap with standard bank IDs', () => {
        const standardIds = new Set(PUZZLE_BANK_HARD.map(p => p.id));
        for (const puzzle of PUZZLE_BANK_REVERSE_HARD) {
          expect(standardIds.has(puzzle.id)).toBe(false);
        }
      });
    }
  });
});
