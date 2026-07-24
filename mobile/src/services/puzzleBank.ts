import AsyncStorage from '@react-native-async-storage/async-storage';
import { PuzzleConfig, Difficulty } from '../types';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import { DialoguePhase } from '../types/homeWorld';
import { isInHardCooldown } from './wordHistory';
import { PuzzleVariant } from './puzzleVariety';
import { COMMON_WORDS } from '../constants/wordLists';
import {
  analyzeStandardBranching,
  type PuzzleBranchingMetrics,
} from './puzzleBranching';
import {
  extendStandardPuzzle,
  PUZZLE_EXTENSION_UNLOCK_PUZZLES,
} from './puzzleExtension';
// Bank novelty/recency tuning lives in the central balance file (single source).
import {
  MAX_USED_TRACKED,
  BANK_RECENT_THRESHOLD,
  BANK_MEDIUM_THRESHOLD,
  BANK_RECENT_PENALTY,
  BANK_MEDIUM_PENALTY,
  BANK_NOVEL_BONUS_FULL,
  BANK_NOVEL_BONUS_MOST,
  BANK_NOVEL_BONUS_SOME,
} from '../constants/gameBalance';
import { isUnbrokenWeaveEligible } from './unbrokenWeave';

// Delivered-experience branching steering. Measured over the shipped banks,
// 62-71% of puzzles have exactly ONE complete solution path, so an unsteered
// draw serves mostly single-route boards. These knobs exist so the player
// instead mostly meets boards with 2+ real routes once route-finding is the
// skill being exercised.
//
// Unlock: engage the moment preview grading goes neutral
// (PREVIEW_GRADING_FULL_LIMIT = 12 in gameBalance) — that is when choice
// starts mattering; before that, EASY-style graded previews carry the
// tutorial and steering would be spent on boards the UI still solves.
const BRANCHING_UNLOCK_PUZZLES = 13;
// Window: how many top context-scored candidates get branching analysis.
// Wide enough that the multi-route subset stays reachable deep into a run
// (a narrow window collapses to whatever freshness happened to rank first).
// Perf: metrics are cached by puzzle id (branchingMetricsCache), so this is
// at most 160 one-time analyses per bank of 3-6 row boards whose path/state
// counts are capped — bounded synchronous work, cache hits thereafter.
const BRANCHING_CONTEXT_CANDIDATES = 160;
// Bonus: strong enough that real structural depth can outrank a modest
// freshness edge (the old 12-point cap was routinely drowned by the novelty
// bonuses, leaving the reorder pass as the only effective lever).
const BRANCHING_BONUS_CAP = 24;
// Chunk size for the cold-cache branching-analysis loop below. On the first
// standard board past BRANCHING_UNLOCK_PUZZLES the metrics cache is empty, so up
// to BRANCHING_CONTEXT_CANDIDATES heavy analyzeStandardBranching traversals
// would otherwise run in ONE synchronous burst on the JS thread and jank the
// board serve (audit F136). The selector is async, so it yields to the event
// loop after every this-many analyses (about 6 yields over 160 candidates) so
// the frame can paint and input stays responsive between chunks. Small enough
// to unblock the thread, large enough not to over-fragment into a yield per
// item. This changes ONLY the yielding cadence, never the selection result.
const BRANCHING_ANALYSIS_CHUNK = 24;
// Trap steering (planning depth): once route-finding is established, boards
// where several LEGAL moves exist but only some complete the chain reward
// look-ahead (reverse mode's 15.9% dead-end states play much deeper than the
// standard banks' ~3.7% trap steps). Engaged ONLY at MEDIUM_PLUS/HARD and
// only past this solve count — newcomers should not meet plausible wrong
// turns cold — and ONLY as a secondary criterion among multi-route
// candidates: a trap with no alternate route is just frustration, so trap
// preference can never promote a single-route board.
const TRAP_STEERING_UNLOCK_PUZZLES = 25;
const branchingMetricsCache = new Map<string, PuzzleBranchingMetrics>();
const standardExtensionCache = new Map<string, PuzzleConfig | null>();
const guaranteedStandardFallbackCache = new Map<Difficulty, PuzzleConfig>();

export function prioritizeMultiRouteCandidates<T>(
  candidates: readonly T[],
  getCompletePathCount: (candidate: T) => number,
  targetPoolSize: number,
  prefersTrap?: (candidate: T) => boolean,
): T[] {
  const preferredPoolSize = Math.min(
    candidates.length,
    Math.max(0, Math.floor(targetPoolSize)),
  );
  let multiRouteIndices: number[] = [];
  const fallbackIndices: number[] = [];

  candidates.forEach((candidate, index) => {
    if (getCompletePathCount(candidate) >= 2) {
      multiRouteIndices.push(index);
    } else {
      fallbackIndices.push(index);
    }
  });

  // Secondary trap preference: WITHIN the multi-route tier only, stable-order
  // trap-bearing boards first. Single-route candidates stay in the fallback
  // tier untouched — trap presence never promotes a board with no alternate
  // completing route.
  if (prefersTrap) {
    const trapIndices: number[] = [];
    const plainIndices: number[] = [];
    for (const index of multiRouteIndices) {
      (prefersTrap(candidates[index]) ? trapIndices : plainIndices).push(index);
    }
    multiRouteIndices = [...trapIndices, ...plainIndices];
  }

  const preferredIndices = multiRouteIndices.slice(0, preferredPoolSize);
  preferredIndices.push(
    ...fallbackIndices.slice(0, preferredPoolSize - preferredIndices.length),
  );
  const preferredSet = new Set(preferredIndices);

  return [
    ...preferredIndices.map(index => candidates[index]),
    ...candidates.filter((_, index) => !preferredSet.has(index)),
  ];
}

export interface PuzzleBankSelectionOptions {
  unbrokenWeaveOnly?: boolean;
  /** Lexicon (rare-word) mode: draw from the rare-vocabulary bank for this variant+difficulty. */
  lexicon?: boolean;
}

// ---------------------------------------------------------------------------
// Bank Registry — single source of truth for all 12 puzzle banks
//
// Bank data is lazily loaded via require() thunks so the ~5.7MB of
// pre-generated puzzles is parsed only when a bank is first used,
// not at app startup. require() is synchronous in Metro/Node, so
// existing synchronous call paths keep working.
// ---------------------------------------------------------------------------

interface BankRegistryEntry {
  storageKey: string;
  loadBank: () => PreGeneratedPuzzle[];
  bankData: PreGeneratedPuzzle[] | null;
  cache: string[] | null;
  idToWords: Map<string, string[]> | null;
}

const BANK_REGISTRY: Record<string, BankRegistryEntry> = {
  standard:       { storageKey: 'wordshift_played_puzzle_ids',              loadBank: () => require('../data/puzzleBankHard').PUZZLE_BANK_HARD,                              bankData: null, cache: null, idToWords: null },
  std_easy:       { storageKey: 'wordshift_played_std_easy_puzzle_ids',     loadBank: () => require('../data/puzzleBankEasy').PUZZLE_BANK_EASY,                              bankData: null, cache: null, idToWords: null },
  std_medium:     { storageKey: 'wordshift_played_std_medium_puzzle_ids',   loadBank: () => require('../data/puzzleBankMedium').PUZZLE_BANK_MEDIUM,                          bankData: null, cache: null, idToWords: null },
  std_mp:         { storageKey: 'wordshift_played_std_mp_puzzle_ids',       loadBank: () => require('../data/puzzleBankMediumPlus').PUZZLE_BANK_MEDIUM_PLUS,                 bankData: null, cache: null, idToWords: null },
  reverse:        { storageKey: 'wordshift_played_reverse_puzzle_ids',      loadBank: () => require('../data/puzzleBankReverseHard').PUZZLE_BANK_REVERSE_HARD,               bankData: null, cache: null, idToWords: null },
  reverse_easy:   { storageKey: 'wordshift_played_reverse_easy_puzzle_ids', loadBank: () => require('../data/puzzleBankReverseEasy').PUZZLE_BANK_REVERSE_EASY,               bankData: null, cache: null, idToWords: null },
  reverse_medium: { storageKey: 'wordshift_played_reverse_medium_puzzle_ids', loadBank: () => require('../data/puzzleBankReverseMedium').PUZZLE_BANK_REVERSE_MEDIUM,         bankData: null, cache: null, idToWords: null },
  reverse_mp:     { storageKey: 'wordshift_played_reverse_mp_puzzle_ids',   loadBank: () => require('../data/puzzleBankReverseMediumPlus').PUZZLE_BANK_REVERSE_MEDIUM_PLUS,  bankData: null, cache: null, idToWords: null },
  ds_easy:        { storageKey: 'wordshift_played_ds_easy_puzzle_ids',      loadBank: () => require('../data/puzzleBankDoubleShiftEasy').PUZZLE_BANK_DOUBLE_SHIFT_EASY,      bankData: null, cache: null, idToWords: null },
  ds_medium:      { storageKey: 'wordshift_played_ds_medium_puzzle_ids',    loadBank: () => require('../data/puzzleBankDoubleShiftMedium').PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM,  bankData: null, cache: null, idToWords: null },
  ds_mp:          { storageKey: 'wordshift_played_ds_mp_puzzle_ids',        loadBank: () => require('../data/puzzleBankDoubleShiftMediumPlus').PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, bankData: null, cache: null, idToWords: null },
  ds_hard:        { storageKey: 'wordshift_played_ds_hard_puzzle_ids',      loadBank: () => require('../data/puzzleBankDoubleShiftHard').PUZZLE_BANK_DOUBLE_SHIFT_HARD,      bankData: null, cache: null, idToWords: null },
  // EXPERT (apex): standard 6-letter/5-row bank + double 5-letter/7-row bank +
  // a 6-letter reverse bank (added after the hours-long gated reverse run — fair
  // 6-letter reverse-solvable chains are scarce but reachable; the bank is
  // smaller than the E/M/MP/H reverse banks, and recycling handles the size).
  std_expert:     { storageKey: 'wordshift_played_std_expert_puzzle_ids',   loadBank: () => require('../data/puzzleBankExpert').PUZZLE_BANK_EXPERT,                          bankData: null, cache: null, idToWords: null },
  ds_expert:      { storageKey: 'wordshift_played_ds_expert_puzzle_ids',     loadBank: () => require('../data/puzzleBankDoubleShiftExpert').PUZZLE_BANK_DOUBLE_SHIFT_EXPERT,   bankData: null, cache: null, idToWords: null },
  reverse_expert: { storageKey: 'wordshift_played_reverse_expert_puzzle_ids', loadBank: () => require('../data/puzzleBankReverseExpert').PUZZLE_BANK_REVERSE_EXPERT,          bankData: null, cache: null, idToWords: null },
  // LEXICON (rare-word mode): a rare-vocabulary bank per variant x difficulty,
  // selected when the Lexicon toggle is on (composes with any variant/difficulty).
  lex_std_easy:      { storageKey: 'wordshift_played_lex_std_easy_puzzle_ids',   loadBank: () => require('../data/lexiconBankEasy').LEXICON_BANK_EASY,                                 bankData: null, cache: null, idToWords: null },
  lex_std_medium:    { storageKey: 'wordshift_played_lex_std_medium_puzzle_ids', loadBank: () => require('../data/lexiconBankMedium').LEXICON_BANK_MEDIUM,                             bankData: null, cache: null, idToWords: null },
  lex_std_mp:        { storageKey: 'wordshift_played_lex_std_mp_puzzle_ids',     loadBank: () => require('../data/lexiconBankMediumPlus').LEXICON_BANK_MEDIUM_PLUS,                    bankData: null, cache: null, idToWords: null },
  lex_std_hard:      { storageKey: 'wordshift_played_lex_std_hard_puzzle_ids',   loadBank: () => require('../data/lexiconBankHard').LEXICON_BANK_HARD,                                 bankData: null, cache: null, idToWords: null },
  lex_std_expert:    { storageKey: 'wordshift_played_lex_std_expert_puzzle_ids', loadBank: () => require('../data/lexiconBankExpert').LEXICON_BANK_EXPERT,                             bankData: null, cache: null, idToWords: null },
  // Lexicon + REVERSE: the four larger tiers (EASY/MEDIUM/MEDIUM_PLUS/HARD) DO
  // have banks now (added after the hours-long gated rare-reverse run). Only
  // lex_rev_EXPERT stays ON-DEVICE: rare + reverse-solvable + 6-letter is the
  // scarcest corner of the dictionary and it plateaued at ~1 puzzle, so
  // getBankKey returns lex_rev_expert but the absent registry entry makes
  // getBankForSelection return null → on-device rare-lean path (like Lexicon +
  // Speed, which likewise has no bank).
  lex_rev_easy:      { storageKey: 'wordshift_played_lex_rev_easy_puzzle_ids',    loadBank: () => require('../data/lexiconBankReverseEasy').LEXICON_BANK_REVERSE_EASY,                 bankData: null, cache: null, idToWords: null },
  lex_rev_medium:    { storageKey: 'wordshift_played_lex_rev_medium_puzzle_ids',  loadBank: () => require('../data/lexiconBankReverseMedium').LEXICON_BANK_REVERSE_MEDIUM,             bankData: null, cache: null, idToWords: null },
  lex_rev_mp:        { storageKey: 'wordshift_played_lex_rev_mp_puzzle_ids',      loadBank: () => require('../data/lexiconBankReverseMediumPlus').LEXICON_BANK_REVERSE_MEDIUM_PLUS,    bankData: null, cache: null, idToWords: null },
  lex_rev_hard:      { storageKey: 'wordshift_played_lex_rev_hard_puzzle_ids',    loadBank: () => require('../data/lexiconBankReverseHard').LEXICON_BANK_REVERSE_HARD,                 bankData: null, cache: null, idToWords: null },
  lex_ds_easy:       { storageKey: 'wordshift_played_lex_ds_easy_puzzle_ids',    loadBank: () => require('../data/lexiconBankDoubleShiftEasy').LEXICON_BANK_DOUBLE_EASY,               bankData: null, cache: null, idToWords: null },
  lex_ds_medium:     { storageKey: 'wordshift_played_lex_ds_medium_puzzle_ids',  loadBank: () => require('../data/lexiconBankDoubleShiftMedium').LEXICON_BANK_DOUBLE_MEDIUM,           bankData: null, cache: null, idToWords: null },
  lex_ds_mp:         { storageKey: 'wordshift_played_lex_ds_mp_puzzle_ids',      loadBank: () => require('../data/lexiconBankDoubleShiftMediumPlus').LEXICON_BANK_DOUBLE_MEDIUM_PLUS,  bankData: null, cache: null, idToWords: null },
  lex_ds_hard:       { storageKey: 'wordshift_played_lex_ds_hard_puzzle_ids',    loadBank: () => require('../data/lexiconBankDoubleShiftHard').LEXICON_BANK_DOUBLE_HARD,               bankData: null, cache: null, idToWords: null },
  lex_ds_expert:     { storageKey: 'wordshift_played_lex_ds_expert_puzzle_ids',  loadBank: () => require('../data/lexiconBankDoubleShiftExpert').LEXICON_BANK_DOUBLE_EXPERT,           bankData: null, cache: null, idToWords: null },
};

/**
 * Get the puzzle data for a bank, loading it on first access.
 */
function getBank(bankKey: string): PreGeneratedPuzzle[] {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  if (!entry.bankData) {
    entry.bankData = entry.loadBank();
  }
  return entry.bankData;
}

function toPuzzleConfig(puzzle: PreGeneratedPuzzle): PuzzleConfig {
  const sol0 = puzzle.solution[0];
  const isDS = puzzle.isDoubleShift === true;
  return {
    words: puzzle.words,
    hint: isDS && sol0?.lettersToMove
      ? `Start by shifting '${sol0.lettersToMove[0]}' and '${sol0.lettersToMove[1]}'`
      : `Start by shifting '${sol0?.letterToMove ?? '?'}'`,
    solution: puzzle.solution,
    reverseSolution: puzzle.reverseSolution,
    wordLength: puzzle.wordLength,
    isDoubleShift: isDS || undefined,
  };
}

/**
 * Build each mature standard-bank extension once. Inputs are intentionally
 * puzzle-local and deterministic: live word recency affects selection score,
 * never whether a board can receive its required extra row.
 */
function getCachedStandardExtension(
  bankKey: string,
  puzzle: PreGeneratedPuzzle,
): PuzzleConfig | null {
  const cacheKey = `${bankKey}:${puzzle.id}`;
  if (standardExtensionCache.has(cacheKey)) {
    return standardExtensionCache.get(cacheKey) ?? null;
  }

  const base = toPuzzleConfig(puzzle);
  const extended = extendStandardPuzzle(base, {
    excludedWords: new Set(puzzle.allWords),
  });
  const result = extended.words.length === base.words.length + 1
    ? extended
    : null;
  standardExtensionCache.set(cacheKey, result);
  return result;
}

// Per-bank word frequency — the generator's adjacency bias makes "hub" words
// (MATER, CATER, LATER...) appear in dozens of puzzles per bank. Selection
// penalizes them so the long tail of vocabulary actually surfaces.
const bankWordFrequency = new Map<string, Map<string, number>>();

function getBankWordFrequency(bankKey: string): Map<string, number> {
  let freq = bankWordFrequency.get(bankKey);
  if (!freq) {
    freq = new Map();
    for (const puzzle of getBank(bankKey)) {
      for (const word of puzzle.allWords) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
    bankWordFrequency.set(bankKey, freq);
  }
  return freq;
}

// Highest per-word count in a bank (~= its word cap once saturated), cached per
// frequency-map object so the hub-word penalty can calibrate to each bank's own
// saturation instead of fixed thresholds that no longer match the caps.
const bankMaxFreqCache = new WeakMap<Map<string, number>, number>();
function bankMaxFreq(wordFrequency: Map<string, number>): number {
  let m = bankMaxFreqCache.get(wordFrequency);
  if (m === undefined) {
    m = 0;
    for (const v of wordFrequency.values()) {
      if (v > m) m = v;
    }
    bankMaxFreqCache.set(wordFrequency, m);
  }
  return m;
}

/**
 * Derive a "bank key" from difficulty + variant to route to the correct
 * storage, cache, and bank data. Returns a discriminator string.
 */
const DIFFICULTY_SUFFIX: Record<Difficulty, string> = {
  EASY: 'easy', MEDIUM: 'medium', MEDIUM_PLUS: 'mp', HARD: 'hard', EXPERT: 'expert',
};

function getBankKey(difficulty: Difficulty, variant: PuzzleVariant, lexicon = false): string {
  // Lexicon (rare-word) banks are uniform per variant x difficulty: lex_<fam>_<diff>.
  if (lexicon) {
    const fam = variant === 'double_shift' ? 'ds' : variant === 'reverse' ? 'rev' : 'std';
    const key = `lex_${fam}_${DIFFICULTY_SUFFIX[difficulty]}`;
    // lex_rev_expert (Lexicon + reverse + EXPERT) has NO rare bank — rare +
    // reverse-solvable + 6-letter is the scarcest corner of the dictionary and
    // it plateaued at ~1 board. Rather than generate on-device (a wait), serve
    // the FAIR EXPERT-reverse bank: still 6-letter reverse-solvable (and still
    // pays the Lexicon amber bonus), just not rare. Zero-wait beats
    // strictly-rare for this ultra-niche 3-toggle-plus-apex combo. Remapping the
    // KEY (not just the bank data) keeps storage/recency/extension consistent.
    if (key === 'lex_rev_expert') return 'reverse_expert';
    return key;
  }
  // Double shift variants — each difficulty has its own bank (3/4/5/6/7 rows, all 5-letter words)
  if (variant === 'double_shift') {
    if (difficulty === 'EASY') return 'ds_easy';
    if (difficulty === 'MEDIUM') return 'ds_medium';
    if (difficulty === 'MEDIUM_PLUS') return 'ds_mp';
    if (difficulty === 'EXPERT') return 'ds_expert';
    return 'ds_hard';
  }
  if (variant === 'reverse') {
    if (difficulty === 'EASY') return 'reverse_easy';
    if (difficulty === 'MEDIUM') return 'reverse_medium';
    if (difficulty === 'MEDIUM_PLUS') return 'reverse_mp';
    if (difficulty === 'EXPERT') return 'reverse_expert';
    return 'reverse'; // HARD
  }
  // Standard variant — route by difficulty
  if (difficulty === 'EASY') return 'std_easy';
  if (difficulty === 'MEDIUM') return 'std_medium';
  if (difficulty === 'MEDIUM_PLUS') return 'std_mp';
  if (difficulty === 'EXPERT') return 'std_expert';
  return 'standard'; // HARD
}

/**
 * Return a mature standard board without consulting played-puzzle storage.
 * Each real difficulty bank is scanned at most once; shipped bank guards ensure
 * at least one canonical puzzle can receive the required extra row.
 */
export function getGuaranteedExtendedStandardFallback(
  difficulty: Difficulty,
): PuzzleConfig {
  const cached = guaranteedStandardFallbackCache.get(difficulty);
  if (cached) return cached;

  const bankKey = getBankKey(difficulty, 'standard');
  for (const puzzle of getBank(bankKey)) {
    const extended = getCachedStandardExtension(bankKey, puzzle);
    if (extended) {
      guaranteedStandardFallbackCache.set(difficulty, extended);
      return extended;
    }
  }

  throw new Error(`No extendable standard puzzle found for ${difficulty}`);
}

/**
 * Determine the storage key and cache for a given bank key.
 */
function getStorageConfig(bankKey: string): {
  key: string;
  getCache: () => string[] | null;
  setCache: (val: string[] | null) => void;
} {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  return {
    key: entry.storageKey,
    getCache: () => entry.cache,
    setCache: (val) => { entry.cache = val; },
  };
}

/**
 * Get or build the ID→allWords lookup map for a bank.
 * Built lazily from bank data on first access.
 */
function getIdToWordsMap(bankKey: string): Map<string, string[]> {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  if (!entry.idToWords) {
    entry.idToWords = new Map();
    for (const p of getBank(bankKey)) {
      entry.idToWords.set(p.id, p.allWords);
    }
  }
  return entry.idToWords;
}

/**
 * Derive a word→bankPuzzlesAgo recency map from the played puzzle ID history.
 * This gives the bank selection a much longer memory than the general word
 * history (which only tracks the last 15 puzzles in hard cooldown). Each word
 * maps to how many bank selections ago it was last seen (0 = most recent).
 * Words not in the map have never appeared in a played bank puzzle.
 */
function deriveBankWordRecency(
  usedIds: string[],
  bankKey: string
): Map<string, number> {
  const idToWords = getIdToWordsMap(bankKey);
  const recency = new Map<string, number>();

  for (let i = 0; i < usedIds.length; i++) {
    const words = idToWords.get(usedIds[i]);
    if (!words) continue;
    for (const w of words) {
      // Only track the most recent (lowest index) occurrence
      if (!recency.has(w)) {
        recency.set(w, i);
      }
    }
  }

  return recency;
}

/**
 * Load played puzzle IDs from storage into cache.
 */
async function loadUsedPuzzles(bankKey: string = 'standard'): Promise<string[]> {
  const config = getStorageConfig(bankKey);
  const cached = config.getCache();
  if (cached !== null) return cached;
  try {
    const stored = await AsyncStorage.getItem(config.key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Corrupted storage must not poison the played-puzzle tracking
      if (Array.isArray(parsed)) {
        config.setCache(parsed);
        return parsed;
      }
    }
  } catch {
    // Fall through to empty
  }
  config.setCache([]);
  return [];
}

/**
 * Record a puzzle as played.
 */
async function markPuzzlePlayed(puzzleId: string, bankKey: string = 'standard'): Promise<void> {
  const config = getStorageConfig(bankKey);
  const used = await loadUsedPuzzles(bankKey);

  // Remove if already present (re-sort to front)
  const idx = used.indexOf(puzzleId);
  if (idx !== -1) used.splice(idx, 1);

  // Add to front (most recent)
  used.unshift(puzzleId);

  // Cap size
  if (used.length > MAX_USED_TRACKED) {
    used.length = MAX_USED_TRACKED;
  }

  config.setCache(used);

  try {
    await AsyncStorage.setItem(config.key, JSON.stringify(used));
  } catch {
    // Non-critical — will retry on next play
  }
}

/**
 * Get the appropriate puzzle bank for a difficulty level and variant.
 * Returns null if no bank exists for this combination.
 */
function getBankForSelection(difficulty: Difficulty, variant: PuzzleVariant, lexicon = false): PreGeneratedPuzzle[] | null {
  // standard / reverse / double_shift each have their own bank family. SPEED
  // reuses the STANDARD family: getBankKey maps speed -> std_<diff> (or
  // lex_std_<diff>), so a Speed board is a standard board played against the
  // clock, served from the pre-generated bank instead of generating on-device
  // (zero-wait). The +1 extension stays gated to variant === 'standard', so a
  // speed board keeps its base size. Any future variant without a bank family
  // returns null here and falls back to on-device generation.
  const hasBankFamily =
    variant === 'standard' || variant === 'reverse' ||
    variant === 'double_shift' || variant === 'speed';
  if (!hasBankFamily) return null;

  const bankKey = getBankKey(difficulty, variant, lexicon);
  if (!BANK_REGISTRY[bankKey]) return null;
  const bank = getBank(bankKey);
  return bank.length > 0 ? bank : null;
}

/**
 * Score a puzzle's suitability for the current game context.
 * Higher = better match.
 *
 * Scoring layers (in priority order):
 * 1. Phase appropriateness — heaviest weight, matches puzzle dread tier to narrative phase
 * 2. Word history cooldown — short-term (15 puzzles) hard exclusion from general word history
 * 3. Bank word novelty — long-term (150 bank selections) graduated penalty for repeated words
 * 4. Random jitter — prevents deterministic ordering within similar scores
 */
function scorePuzzleForContext(
  puzzle: PreGeneratedPuzzle,
  phase: DialoguePhase,
  usedSet: Set<string>,
  recencyMap: Map<string, number>,
  bankWordRecency: Map<string, number>,
  wordFrequency: Map<string, number>
): number {
  let score = 0;

  // Phase-appropriateness scoring (heaviest weight)
  const idealTier = phase as number;
  const tierDiff = Math.abs(puzzle.dreadTier - idealTier);
  if (tierDiff === 0) score += 40;
  else if (tierDiff === 1) score += 20;
  else if (tierDiff === 2) score += 5;
  else score -= 10;

  // NOTE: the old "+10 lead bonus" for tier=phase+1 was removed in the
  // dread-supply pass. It pre-drained the NEXT phase's (scarce) tier-4
  // puzzles during phase 3, so by the time the black sky arrived the dread
  // boards were already spent and the climax served bright tier-0 words. The
  // tier-match weighting above is enough to steer the vocabulary; the finale
  // now gets its dread supply from the Phase-4 recycle in
  // selectPreGeneratedPuzzle instead of by leading ahead.

  // Word freshness penalty (short-term, from general word history)
  let overlapCount = 0;
  for (const word of puzzle.allWords) {
    if (isInHardCooldown(word, recencyMap)) {
      score -= 30;
      overlapCount++;
    }
  }
  // If more than half the words are in cooldown, heavy exclusion penalty
  if (overlapCount > puzzle.allWords.length / 2) score -= 100;

  // Bank word novelty scoring (long-term memory of bank selections)
  // This fills the gap after the 15-puzzle word history cooldown expires.
  // With only ~780 unique words across 500 standard puzzles (562 for reverse),
  // the general cooldown forgets too quickly — this ensures the selection
  // keeps preferring puzzles with words the player hasn't seen recently.
  let novelWords = 0;
  for (const word of puzzle.allWords) {
    const bankPuzzlesAgo = bankWordRecency.get(word);
    if (bankPuzzlesAgo === undefined) {
      // Never seen from this bank — genuinely novel
      novelWords++;
    } else if (bankPuzzlesAgo < BANK_RECENT_THRESHOLD) {
      // Seen recently in bank — strong penalty
      // (0-14 range overlaps with wordHistory hard cooldown, which already
      //  applies -30. This adds bank-specific penalty for the 15-49 range.)
      if (bankPuzzlesAgo >= 15) {
        score += BANK_RECENT_PENALTY;
      }
    } else if (bankPuzzlesAgo < BANK_MEDIUM_THRESHOLD) {
      // Seen a while ago — moderate penalty
      score += BANK_MEDIUM_PENALTY;
    }
    // 150+ bank selections ago: word has effectively refreshed
  }

  // Bonus for puzzles with novel words — strongly prefer fresh vocabulary
  if (novelWords === puzzle.allWords.length) {
    score += BANK_NOVEL_BONUS_FULL;
  } else if (novelWords >= 3) {
    score += BANK_NOVEL_BONUS_MOST;
  } else if (novelWords >= 1) {
    score += BANK_NOVEL_BONUS_SOME;
  }

  // Hub-word penalty: words the generator over-used across this bank cost
  // score regardless of play history, so the vocabulary long tail surfaces.
  // Calibrated to the bank's OWN saturation (its observed max frequency ~= its
  // word cap): the old fixed 10/18/30 thresholds predated the 3/7/10/12 caps
  // and could NEVER fire on EASY (cap 3) or MEDIUM (cap 7), leaving the penalty
  // dead on most banks. Ratio-to-max makes it bite on every bank.
  const cap = Math.max(1, bankMaxFreq(wordFrequency));
  for (const word of puzzle.allWords) {
    const ratio = (wordFrequency.get(word) ?? 0) / cap;
    if (ratio >= 0.85) score -= 14;
    else if (ratio >= 0.6) score -= 9;
    else if (ratio >= 0.4) score -= 4;
  }

  // Prefer genuinely higher-quality boards. The real scorePuzzleChain result is
  // stored at generation (gated regeneration); legacy banks store a flat 50 so
  // this term is neutral for them and only differentiates regenerated banks.
  score += (puzzle.qualityScore - 50) * 0.3;

  // Random jitter (prevents deterministic ordering)
  score += Math.random() * 15;

  return score;
}

/**
 * Select a puzzle from the pre-generated bank.
 *
 * Returns a PuzzleConfig ready for initGame(), or null if no bank exists
 * for the requested difficulty/variant combination.
 *
 * When all puzzles have been played, recycles the oldest-played puzzles.
 */
export async function selectPreGeneratedPuzzle(
  difficulty: Difficulty,
  phase: DialoguePhase,
  recencyMap: Map<string, number>,
  variant: PuzzleVariant = 'standard',
  puzzlesSolved: number = 0,
  options: PuzzleBankSelectionOptions = {},
): Promise<PuzzleConfig | null> {
  const lexicon = options.lexicon === true;
  const bank = getBankForSelection(difficulty, variant, lexicon);
  if (!bank) return null;
  if (options.unbrokenWeaveOnly && variant !== 'standard') return null;

  const bankKey = getBankKey(difficulty, variant, lexicon);
  const extensionRequired =
    variant === 'standard' &&
    puzzlesSolved >= PUZZLE_EXTENSION_UNLOCK_PUZZLES &&
    !options.unbrokenWeaveOnly &&
    !lexicon; // Lexicon boards are curated rare — never extend (keeps the vocabulary intact)
  const selectableBank = options.unbrokenWeaveOnly
    ? bank.filter(puzzle => isUnbrokenWeaveEligible(puzzle.solution))
    : extensionRequired
      ? bank.filter(puzzle => getCachedStandardExtension(bankKey, puzzle) !== null)
      : bank;
  if (selectableBank.length === 0) return null;

  const storageConfig = getStorageConfig(bankKey);
  const used = await loadUsedPuzzles(bankKey);
  const usedSet = new Set(used);

  // Filter out already-played puzzles
  let available = selectableBank.filter(p => !usedSet.has(p.id));

  // Phase 4+ dread steering: the climax must serve dread vocabulary, but a
  // played board must NEVER be re-served while ANY unplayed board remains
  // (the old played-dread fold-in re-served exact replays while unplayed
  // lower-tier boards sat untouched). Steer the UNPLAYED pool instead:
  // prefer unplayed puzzles at the ideal dread tier, widening to adjacent
  // tiers (1 away, then 2 away) when the ideal tier is spent. If nothing
  // within 2 tiers remains unplayed, the whole unplayed pool stays eligible —
  // a fresh bright board beats an exact replay. Replays happen only through
  // the full-bank exhaustion recycle below, which serves the
  // least-recently-played half first.
  if ((phase as number) >= 4 && available.length > 0) {
    const idealTier = Math.min(4, phase as number);
    for (const spread of [0, 1, 2]) {
      const tierPool = available.filter(p => Math.abs(p.dreadTier - idealTier) <= spread);
      if (tierPool.length > 0) {
        available = tierPool;
        break;
      }
    }
  }

  // If all puzzles exhausted, recycle the oldest-played half
  if (available.length === 0) {
    if (options.unbrokenWeaveOnly || extensionRequired) {
      const selectableIds = new Set(selectableBank.map(puzzle => puzzle.id));
      const usedSelectableIds = used.filter(id => selectableIds.has(id));
      if (usedSelectableIds.length === 0) return null;

      const halfIdx = Math.floor(usedSelectableIds.length / 2);
      const recycledIds = new Set(usedSelectableIds.slice(halfIdx));
      const trimmed = used.filter(id => !recycledIds.has(id));
      storageConfig.setCache(trimmed);
      try {
        await AsyncStorage.setItem(storageConfig.key, JSON.stringify(trimmed));
      } catch {
        // Non-critical
      }
      available = selectableBank.filter(puzzle => recycledIds.has(puzzle.id));
    } else {
      const halfIdx = Math.floor(used.length / 2);
      const recycledIds = new Set(used.slice(halfIdx));

      // Remove recycled IDs from the used list
      const trimmed = used.slice(0, halfIdx);
      storageConfig.setCache(trimmed);
      try {
        await AsyncStorage.setItem(storageConfig.key, JSON.stringify(trimmed));
      } catch {
        // Non-critical
      }

      available = selectableBank.filter(p => recycledIds.has(p.id));

      // If still empty (shouldn't happen), return all
      if (available.length === 0) {
        available = [...selectableBank];
        storageConfig.setCache([]);
        try {
          await AsyncStorage.setItem(storageConfig.key, JSON.stringify([]));
        } catch {
          // Non-critical
        }
      }
    }
  }

  // Derive bank-specific word recency from played puzzle history.
  // This gives the scoring function a long-term memory of which words
  // the player has already seen from this bank, far beyond the 15-puzzle
  // general word history cooldown.
  const bankWordRecency = deriveBankWordRecency(used, bankKey);

  // Score all available puzzles for current context
  const scored = available.map(p => ({
    puzzle: p,
    score: scorePuzzleForContext(p, phase, usedSet, recencyMap, bankWordRecency, getBankWordFrequency(bankKey)),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Once preview grading has gone neutral, favor standard boards with
  // multiple completing routes — the delivered experience should be mostly
  // boards with 2+ real routes, not the banks' single-route majority. Analyze
  // only the strongest context candidates so phase and freshness remain the
  // primary filters and synchronous work stays capped (see the constant docs).
  if (variant === 'standard' && puzzlesSolved >= BRANCHING_UNLOCK_PUZZLES) {
    const candidateCount = Math.min(BRANCHING_CONTEXT_CANDIDATES, scored.length);
    const metricSource = extensionRequired ? 'extended' : 'source';
    const contextCandidates = scored.slice(0, candidateCount);
    // Same as the former .map(), but as an awaitable loop so the cold-cache
    // batch of analyzeStandardBranching traversals can yield the JS thread every
    // BRANCHING_ANALYSIS_CHUNK analyses instead of blocking the board serve in
    // one synchronous burst (F136). Candidates are visited in the same order,
    // scored identically, and the metrics cache is populated identically; the
    // await between chunks is the only difference.
    const depthCandidates: ((typeof contextCandidates)[number] & {
      completePathCount: number;
      trapStepFraction: number;
    })[] = [];
    for (let i = 0; i < contextCandidates.length; i++) {
      if (i > 0 && i % BRANCHING_ANALYSIS_CHUNK === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      const candidate = contextCandidates[i];
      const metricsCacheKey = `${bankKey}:${candidate.puzzle.id}:${metricSource}`;
      let metrics = branchingMetricsCache.get(metricsCacheKey);
      if (!metrics) {
        const branchingWords = extensionRequired
          ? getCachedStandardExtension(bankKey, candidate.puzzle)!.words
          : candidate.puzzle.words;
        metrics = analyzeStandardBranching(
          branchingWords,
          word => COMMON_WORDS.has(word.toUpperCase()),
        );
        branchingMetricsCache.set(metricsCacheKey, metrics);
      }
      depthCandidates.push({
        ...candidate,
        score: candidate.score + Math.min(BRANCHING_BONUS_CAP, metrics.structuralBonus),
        completePathCount: metrics.completePathCount,
        trapStepFraction: metrics.trapStepFraction,
      });
    }
    depthCandidates.sort((a, b) => b.score - a.score);
    // Trap preference is a SECONDARY criterion behind the multi-route tiering,
    // and only where planning depth is the point: the 5-letter banks
    // (MEDIUM_PLUS/HARD) past 25 solves. EASY/MEDIUM and earlier solves keep
    // the plain multi-route ordering — newcomers should not meet plausible
    // wrong turns cold.
    const trapPreferenceActive =
      (difficulty === 'MEDIUM_PLUS' || difficulty === 'HARD') &&
      puzzlesSolved >= TRAP_STEERING_UNLOCK_PUZZLES;
    scored.splice(
      0,
      candidateCount,
      ...prioritizeMultiRouteCandidates(
        depthCandidates,
        candidate => candidate.completePathCount,
        10,
        trapPreferenceActive
          ? candidate => candidate.trapStepFraction > 0
          : undefined,
      ),
    );
  }

  // Pick randomly from the top 10 (wider pool = more vocabulary variety)
  const topN = Math.min(10, scored.length);
  const selected = scored[Math.floor(Math.random() * topN)];

  // Mark as played
  await markPuzzlePlayed(selected.puzzle.id, bankKey);

  if (extensionRequired) {
    // `selectableBank` contains only cache hits, so this cannot fail without a
    // mutation of generated bank data during the process.
    return getCachedStandardExtension(bankKey, selected.puzzle);
  }

  return toPuzzleConfig(selected.puzzle);
}

/**
 * Clear played puzzle tracking (for Reset All Data).
 */
export async function clearPlayedPuzzles(): Promise<void> {
  const keys: string[] = [];
  for (const entry of Object.values(BANK_REGISTRY)) {
    entry.cache = null;
    entry.idToWords = null;
    keys.push(entry.storageKey);
  }
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Non-critical
  }
}
