import { DICTIONARY_WORDS } from '../dictionary';
import { getRequiredPuzzleWords, isFairPuzzleWord, isPuzzleVocabularyFair } from '../services/puzzleVocabulary';
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_REVERSE_EASY } from '../data/puzzleBankReverseEasy';
import { PUZZLE_BANK_DOUBLE_SHIFT_EASY } from '../data/puzzleBankDoubleShiftEasy';
import { isChainSolvable } from '../services/puzzleSolvability';
import { CURATED_EARLY_PUZZLES, CURATED_FINAL_PUZZLE } from '../constants/wordLists';

describe('playable vocabulary policy', () => {
  it('quarantines questionable required words without mislabeling rare valid discoveries', () => {
    for (const word of ['THATS', 'WHATS', 'SHES', 'NOS', 'BASSETT', 'ZZZZ']) {
      expect(isFairPuzzleWord(word)).toBe(false);
      expect(isFairPuzzleWord(word, true)).toBe(false);
    }
    for (const word of ['HEART', 'PLANT', 'CLOSED', 'CLOSER', 'GREY', 'CAFE']) expect(isFairPuzzleWord(word)).toBe(true);
    expect(isFairPuzzleWord('JUN')).toBe(false);
    expect(isFairPuzzleWord('RENO')).toBe(false);
  });

  it('checks leftovers, which the bank allWords field does not guarantee', () => {
    const puzzle = { words: ['TREADED', 'HEAT'], solution: [{ stepIndex: 0, sourceWord: 'TREADED', targetWord: 'HEAT', letterToMove: 'T', removalPosition: 0, insertionPosition: 0, explanation: 'Move T to form THEAT.' }] };
    expect(getRequiredPuzzleWords(puzzle)).toContain('READED');
    expect(isPuzzleVocabularyFair(puzzle)).toBe(false);
  });

  it.each([
    ['standard', PUZZLE_BANK_EASY],
    ['reverse', PUZZLE_BANK_REVERSE_EASY],
    ['double_shift', PUZZLE_BANK_DOUBLE_SHIFT_EASY],
  ] as const)('%s retains a substantial pool of complete playable boards', (variant, bank) => {
    const eligible = bank.filter(puzzle => isPuzzleVocabularyFair(puzzle));
    expect(eligible.length).toBeGreaterThan(100);
    const dictionary = new Set(DICTIONARY_WORDS);
    for (const puzzle of eligible) {
      expect(isChainSolvable(variant, puzzle.words, word => dictionary.has(word))).toBe('solvable');
    }
  });

  it('preserves every authored opener and both final choices', () => {
    for (const puzzle of [...CURATED_EARLY_PUZZLES, CURATED_FINAL_PUZZLE]) expect(isPuzzleVocabularyFair(puzzle)).toBe(true);
  });
});
