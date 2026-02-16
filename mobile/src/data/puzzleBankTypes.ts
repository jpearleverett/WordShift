import { PuzzleSolutionStep } from '../types';

export interface PreGeneratedPuzzle {
  /** Stable ID (deterministic hash of word chain) */
  id: string;
  /** The word chain */
  words: string[];
  /** Step-by-step solution for hints */
  solution: PuzzleSolutionStep[];
  /** Word length (5 for HARD) */
  wordLength: number;
  /** Quality score (0-100) */
  qualityScore: number;
  /** Highest dread word tier present (0 = no dread words, 1-4 = phase tier) */
  dreadTier: number;
  /** Number of dread words in the chain */
  dreadWordCount: number;
  /** All unique words in the chain (for fast word-overlap checking) */
  allWords: string[];
  /** Semantic clusters touched */
  semanticTags: string[];
}
