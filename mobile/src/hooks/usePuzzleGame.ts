import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { SavedPuzzleState } from '../services/puzzleSaveState';
import { generateLocalPuzzle, generateDoubleShiftPuzzle, getIncantationName } from '../services/localGenerator';
import { selectPreGeneratedPuzzle } from '../services/puzzleBank';
import { getWordHistoryWithRecency, recordPuzzleWords } from '../services/wordHistory';
import { COMMON_WORDS, CURATED_EARLY_PUZZLES, CURATED_PUZZLE_COUNT, CuratedPuzzle, getRandomFallback } from '../constants';
import { CHALLENGE_MODE_CONFIG, DialoguePhase } from '../types/homeWorld';
import { getMoveMessage, getHintMessage, getHintFallback, getLoadingMessage, getStartMessage, getInvalidWordMessage, getLockedLetterMessage, getNoValidMovesMessage } from '../services/phaseNarrative';
import { getPreferredPuzzleVariant, setPreferredPuzzleVariant, getFullProgress, getRitualWords, isPostRevelation } from '../services/amberCurrency';
import {
  getVariantOverrides,
  getVariantInstruction,
  isVariantCompatibleWithSolution,
  hasVariantModifier,
  isLetterAllowedByVariant,
  getVariantRestrictionError,
  isPuzzleVariant,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';

// Simple ID generator (React Native compatible)
let idCounter = 0;
const generateId = () => `id_${Date.now()}_${idCounter++}`;

/**
 * Pure stuck-detection helper: does ANY legal single-shift move remain
 * from the current source row into its target row?
 *
 * Mirrors the hook's move validation exactly: an unlocked letter can be
 * picked from the source row only if the remaining source letters form a
 * valid word, and it can be dropped at any position of the target row
 * only if the resulting word is valid. Locked letters in the source row
 * cannot be picked; target insertion positions are unrestricted (matching
 * handleSlotPress).
 *
 * Only meaningful for variants where one pick+drop is a full move
 * (i.e., NOT double_shift).
 */
export function hasAnyValidMove(
  rows: RowData[],
  activeRowIndex: number,
  moveDirection: 'down' | 'up',
  isWordValid: (word: string) => boolean
): boolean {
  if (activeRowIndex < 0 || activeRowIndex >= rows.length) return false;
  const targetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
  if (targetRowIndex < 0 || targetRowIndex >= rows.length) return false;

  const sourceLetters = rows[activeRowIndex].words;
  const targetChars = rows[targetRowIndex].words.map(l => l.char);

  for (let i = 0; i < sourceLetters.length; i++) {
    if (sourceLetters[i].isLocked) continue;
    const letter = sourceLetters[i].char;

    // Removing this letter must leave a valid source word
    const remaining = sourceLetters
      .filter((_, idx) => idx !== i)
      .map(l => l.char)
      .join('');
    if (!isWordValid(remaining)) continue;

    // Inserting it at any target position must form a valid word
    for (let j = 0; j <= targetChars.length; j++) {
      const candidate = targetChars.slice(0, j).join('') + letter + targetChars.slice(j).join('');
      if (isWordValid(candidate)) return true;
    }
  }

  return false;
}

export interface PuzzleGameState {
  rows: RowData[];
  activeRowIndex: number;
  selectedLetter: Letter | null;
  gameState: GameState;
  message: string;
  error: string | null;
  history: MoveDelta[];
  isProcessing: boolean;
  hint: string;
  solution: PuzzleSolutionStep[] | undefined;
  reverseSolution: PuzzleSolutionStep[] | undefined;
  difficulty: Difficulty;
  currentWordLength: number;
  showRules: boolean;
  showDifficultyMenu: boolean;
  showConfetti: boolean;
  invalidAttempts: number;
  hintsUsed: number;
  earnedStars: number;
  gameMode: GameMode;
  undosRemaining: number;
  currentPhase: DialoguePhase;
  /** The word chain from the last completed puzzle (for ritual echo display) */
  lastCompletedWords: string[];
  /** Named incantation for the last puzzle (Phase 3+ only, null otherwise) */
  lastIncantationName: string | null;
  /** The word most recently formed by a valid intermediate move (null if none or cleared) */
  lastFormedWord: string | null;
  /** Active puzzle variant key */
  currentVariant: PuzzleVariant;
  /** Player-selected preferred variant for new runs */
  selectedVariant: PuzzleVariant;
  /** Current movement direction ("down" for standard flow, "up" during reverse return leg) */
  moveDirection: 'down' | 'up';
  /** Word previews for each slot position in the target row (when letter is selected) */
  slotPreviews?: Array<{ word: string; isValid: boolean }>;
  /** Double shift phase tracking: pick1 → drop1 → pick2 → drop2 */
  doubleShiftPhase: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  /** Phase 5 echo puzzle: one word is seeded from the player's ritual history */
  isEchoPuzzle: boolean;
  /** True when no legal move remains from the active row — surfaces a recovery panel */
  isStuck: boolean;
}

export interface PuzzleGameActions {
  initGame: (
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength?: number,
    variant?: PuzzleVariant,
    puzzleReverseSolution?: PuzzleSolutionStep[]
  ) => void;
  startNewGame: (
    selectedDifficulty?: Difficulty,
    mode?: GameMode,
    variant?: PuzzleVariant
  ) => Promise<void>;
  handleLetterPress: (letter: Letter, rowIndex: number) => void;
  handleSlotPress: (targetIndex: number) => Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
    variant?: PuzzleVariant;
    /** True on the reverse-shift move that completes the descent (midpoint). */
    reverseMidpoint?: boolean;
  } | null>;
  handleUndo: () => void;
  handleHint: () => void;
  handleNextLevel: () => void;
  /**
   * Start a Daily Challenge from pre-generated words. Always a standard,
   * hint-enabled board (rewards as HARD). Deliberately does NOT mutate the
   * player's chosen difficulty preference.
   */
  startDailyGame: (words: string[], puzzleHint: string | undefined, wordLength: number) => void;
  setShowRules: (show: boolean) => void;
  setShowDifficultyMenu: (show: boolean) => void;
  setShowConfetti: (show: boolean) => void;
  setGameState: (state: GameState) => void;
  setEarnedStars: (stars: number) => void;
  setMessage: (message: string) => void;
  setGameMode: (mode: GameMode) => void;
  setCurrentPhase: (phase: DialoguePhase) => void;
  setSelectedVariant: (variant: PuzzleVariant) => void;
  restorePuzzleState: (saved: SavedPuzzleState) => void;
  /** Restore the current board to its starting state (a true retry of THIS puzzle). */
  resetCurrentPuzzle: () => void;
  clearBoard: () => void;
}

export function usePuzzleGame(): [PuzzleGameState, PuzzleGameActions] {
  const [rows, setRows] = useState<RowData[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [message, setMessage] = useState<string>("Loading puzzle...");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MoveDelta[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [solution, setSolution] = useState<PuzzleSolutionStep[] | undefined>(undefined);
  const [reverseSolution, setReverseSolution] = useState<PuzzleSolutionStep[] | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [currentWordLength, setCurrentWordLength] = useState(4);
  const [showRules, setShowRules] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [undosRemaining, setUndosRemaining] = useState(Infinity);
  const [currentVariant, setCurrentVariant] = useState<PuzzleVariant>('standard');
  const [selectedVariant, setSelectedVariantState] = useState<PuzzleVariant>('standard');
  const [moveDirection, setMoveDirection] = useState<'down' | 'up'>('down');
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const [lastCompletedWords, setLastCompletedWords] = useState<string[]>([]);
  const [lastIncantationName, setLastIncantationName] = useState<string | null>(null);
  const [lastFormedWord, setLastFormedWord] = useState<string | null>(null);

  // Double shift state: tracks the 4-step flow (pick1 → drop1 → pick2 → drop2)
  const [doubleShiftPhase, setDoubleShiftPhase] = useState<'pick1' | 'pick2' | 'drop1' | 'drop2' | null>(null);
  const [isEchoPuzzle, setIsEchoPuzzle] = useState(false);
  const [isStuck, setIsStuck] = useState(false);

  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));
  const shakeErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up shakeError timeout on unmount
  useEffect(() => {
    return () => {
      if (shakeErrorTimeout.current) {
        clearTimeout(shakeErrorTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPreferredPuzzleVariant()
      .then((stored) => {
        if (cancelled) return;
        if (stored && isPuzzleVariant(stored)) {
          setSelectedVariantState(stored);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedVariant = useCallback((variant: PuzzleVariant) => {
    setSelectedVariantState(variant);
    setPreferredPuzzleVariant(variant).catch(() => {});
  }, []);

  const shakeError = useCallback((msg: string) => {
    if (shakeErrorTimeout.current) {
      clearTimeout(shakeErrorTimeout.current);
    }
    setError(msg);
    shakeErrorTimeout.current = setTimeout(() => {
      setError(null);
      shakeErrorTimeout.current = null;
    }, 2000);
  }, []);

  const checkValidation = useCallback((word: string): boolean => {
    return validWordsCache.current.has(word.toUpperCase());
  }, []);

  const applyBoard = useCallback((
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength: number = 4,
    options?: {
      resetPerformance?: boolean;
      preserveVariant?: boolean;
      variant?: PuzzleVariant;
      reverseSolution?: PuzzleSolutionStep[];
    }
  ) => {
    const variantToUse = options?.preserveVariant ? currentVariant : (options?.variant || 'standard');
    const resetPerformance = options?.resetPerformance ?? true;

    // Defensive validation: ensure all words are the same length
    const expectedLen = words[0]?.length ?? wordLength;
    const hasInconsistentLengths = words.some(w => w.length !== expectedLen);
    if (hasInconsistentLengths) {
      console.warn('Puzzle has inconsistent word lengths, falling back to safe puzzle');
      const safeFallback = getRandomFallback(difficulty);
      const safeLen = safeFallback[0].length;
      // Recursive call with validated fallback — won't loop because fallback pools are consistent
      return applyBoard(safeFallback, undefined, undefined, safeLen, options);
    }

    const newRows: RowData[] = words.map(word => ({
      id: generateId(),
      originalWord: word,
      words: word.split('').map(char => ({
        id: generateId(),
        char,
        isLocked: false,
      })),
    }));

    setRows(newRows);
    setActiveRowIndex(0);
    setSelectedLetter(null);
    setHistory([]);
    setGameState(GameState.PLAYING);
    setMessage(getStartMessage(currentPhase));
    setError(null);
    setIsStuck(false);
    setHint(puzzleHint || "");
    setSolution(puzzleSolution);
    setReverseSolution(options?.reverseSolution);
    setCurrentWordLength(wordLength);
    setLastFormedWord(null);
    setDoubleShiftPhase(hasVariantModifier(variantToUse, 'double_shift') ? 'pick1' : null);
    setMoveDirection('down');
    if (!options?.preserveVariant) {
      setCurrentVariant(variantToUse);
    }

    if (resetPerformance) {
      setInvalidAttempts(0);
      setHintsUsed(0);
      setEarnedStars(0);
    }

    // Reset undos for challenge mode (scaled by difficulty)
    setUndosRemaining(gameMode === 'challenge' ? CHALLENGE_MODE_CONFIG.getMaxUndos(difficulty) : Infinity);
  }, [currentPhase, currentVariant, gameMode, difficulty]);

  const initGame = useCallback((
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength: number = 4,
    variant: PuzzleVariant = 'standard',
    puzzleReverseSolution?: PuzzleSolutionStep[]
  ) => {
    applyBoard(words, puzzleHint, puzzleSolution, wordLength, {
      resetPerformance: true,
      variant,
      reverseSolution: puzzleReverseSolution,
    });
  }, [applyBoard]);

  const generatePuzzleForVariant = useCallback(async (
    selectedDifficulty: Difficulty,
    variant: PuzzleVariant,
    timeoutPromise: Promise<never>,
    startWord?: string
  ): Promise<{ puzzle: { words: string[]; hint?: string; solution?: PuzzleSolutionStep[]; reverseSolution?: PuzzleSolutionStep[]; wordLength?: number; isDoubleShift?: boolean }; activeVariant: PuzzleVariant }> => {
    let activeVariant = variant;
    const isDoubleShiftVariant = hasVariantModifier(activeVariant, 'double_shift');
    const isReverseVariant = hasVariantModifier(activeVariant, 'reverse');
    const variantOverrides = getVariantOverrides(activeVariant, selectedDifficulty);

    // Double shift uses its own generator
    if (isDoubleShiftVariant) {
      let puzzle = await Promise.race([
        generateDoubleShiftPuzzle(selectedDifficulty, variantOverrides),
        timeoutPromise,
      ]);
      return { puzzle, activeVariant };
    }

    const generationOverrides = {
      ...variantOverrides,
      ...(startWord ? { startWord } : {}),
      // For reverse variants, let the generator handle reverse-solvability
      // internally so it can try many start words within the timeout.
      // relaxBoring widens the candidate pool by skipping anti-boring penalties.
      ...(isReverseVariant ? { requireReverseSolvable: true, relaxBoring: true } : {}),
    } as { targetRows?: number; wordLength?: number; startWord?: string; requireReverseSolvable?: boolean; relaxBoring?: boolean };

    let puzzle = await Promise.race([
      generateLocalPuzzle(selectedDifficulty, generationOverrides),
      timeoutPromise,
    ]);

    if (!isVariantCompatibleWithSolution(activeVariant, puzzle.solution, puzzle.words)) {
      let compatiblePuzzle = null as typeof puzzle | null;
      // Reverse variants use fewer retries since each attempt takes longer
      // but is more likely to succeed with the adjacency index + relaxBoring
      const maxRetries = isReverseVariant ? 2 : 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const retry = await Promise.race([
          generateLocalPuzzle(selectedDifficulty, generationOverrides),
          timeoutPromise,
        ]);
        if (isVariantCompatibleWithSolution(activeVariant, retry.solution, retry.words)) {
          compatiblePuzzle = retry;
          break;
        }
      }

      if (compatiblePuzzle) {
        puzzle = compatiblePuzzle;
      } else {
        activeVariant = 'standard';
        setCurrentVariant('standard');
        puzzle = await Promise.race([
          generateLocalPuzzle(selectedDifficulty, {
            ...getVariantOverrides('standard', selectedDifficulty),
            ...(startWord ? { startWord } : {}),
          }),
          timeoutPromise,
        ]);
      }
    }

    return { puzzle, activeVariant };
  }, []);

  const startNewGame = useCallback(async (
    selectedDifficulty: Difficulty = difficulty,
    mode?: GameMode,
    variantOverride?: PuzzleVariant
  ) => {
    setGameState(GameState.LOADING);
    setMessage(getLoadingMessage(currentPhase));
    setError(null);
    setShowDifficultyMenu(false);
    if (selectedDifficulty !== difficulty) {
      setDifficulty(selectedDifficulty);
    }
    if (mode !== undefined) {
      setGameMode(mode);
      setUndosRemaining(mode === 'challenge' ? CHALLENGE_MODE_CONFIG.getMaxUndos(selectedDifficulty) : Infinity);
    }

    const effectiveMode = mode ?? gameMode;
    let variant: PuzzleVariant = variantOverride ?? selectedVariant;
    // Daily mode currently bypasses this hook path; keep this for safety.
    if (effectiveMode !== 'standard' && variantOverride === undefined) {
      variant = selectedVariant;
    }
    setCurrentVariant(variant);

    try {
      // Serve curated early-game puzzles for the first few solves
      // These are hand-picked to showcase interesting letter moves
      const progress = await getFullProgress();
      const puzzlesSolved = progress?.puzzlesSolved ?? 0;
      if (
        puzzlesSolved < CURATED_PUZZLE_COUNT &&
        (selectedDifficulty === 'EASY' || selectedDifficulty === 'MEDIUM') &&
        variant === 'standard' &&
        effectiveMode === 'standard'
      ) {
        const curated = CURATED_EARLY_PUZZLES[puzzlesSolved];
        initGame(curated.words, undefined, curated.solution, curated.words[0].length, 'standard');
        setMessage(getStartMessage(currentPhase));
        return;
      }

      // Phase 5 echo puzzles: every 5th puzzle seeds a word from ritual history.
      // Falls through to normal bank/generation if echo seeding fails.
      setIsEchoPuzzle(false);
      if (currentPhase === 5 && puzzlesSolved > 0 && puzzlesSolved % 5 === 0 && variant === 'standard') {
        try {
          const postRev = await isPostRevelation();
          if (postRev) {
            const ritualWords = await getRitualWords();
            // Pick words matching the target word length for this difficulty
            const targetLen = selectedDifficulty === 'EASY' || selectedDifficulty === 'MEDIUM' ? 4 : 5;
            const candidates = ritualWords.filter(w => w.length === targetLen);
            if (candidates.length > 0) {
              const echoWord = candidates[Math.floor(Math.random() * candidates.length)];
              const echoPuzzle = await generateLocalPuzzle(selectedDifficulty, { startWord: echoWord });
              if (echoPuzzle) {
                initGame(echoPuzzle.words, echoPuzzle.hint, echoPuzzle.solution, echoPuzzle.wordLength, 'standard');
                await recordPuzzleWords(echoPuzzle.words);
                setIsEchoPuzzle(true);
                setMessage('The words are returning. They remember you.');
                return;
              }
            }
          }
        } catch {
          // Echo puzzle generation failed — fall through to normal path
        }
      }

      // Use pre-generated puzzle bank for standard/reverse/double_shift variants at all difficulties
      const bankVariants: PuzzleVariant[] = ['standard', 'reverse', 'double_shift'];
      const shouldUseBank = bankVariants.includes(variant);
      if (shouldUseBank) {
        try {
          const recencyMap = await getWordHistoryWithRecency();
          const bankPuzzle = await selectPreGeneratedPuzzle(selectedDifficulty, currentPhase, recencyMap, variant);
          if (bankPuzzle) {
            initGame(bankPuzzle.words, bankPuzzle.hint, bankPuzzle.solution, bankPuzzle.wordLength, variant, bankPuzzle.reverseSolution);
            await recordPuzzleWords(bankPuzzle.words);
            if (variant !== 'standard') {
              const config = VARIANT_CONFIGS[variant];
              setMessage(getVariantInstruction(config, currentPhase, selectedDifficulty));
            } else {
              setMessage(getStartMessage(currentPhase));
            }
            return;
          }
        } catch (bankErr) {
          console.log('Puzzle bank selection failed, falling back to generation:', bankErr);
        }
      }

      const isReverseGen = hasVariantModifier(variant, 'reverse');
      const timeoutMs = isReverseGen ? 30000 : 4000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
      );

      const { puzzle, activeVariant } = await generatePuzzleForVariant(
        selectedDifficulty,
        variant,
        timeoutPromise
      );
      initGame(puzzle.words, puzzle.hint, puzzle.solution, puzzle.wordLength, activeVariant, puzzle.reverseSolution);
      if (activeVariant !== 'standard') {
        const config = VARIANT_CONFIGS[activeVariant];
        setMessage(getVariantInstruction(config, currentPhase, selectedDifficulty));
      } else if (variant !== 'standard') {
        // The requested variant couldn't be generated and was downgraded to a
        // standard puzzle. Tell the player instead of silently swapping it.
        setMessage(
          currentPhase >= 3
            ? 'The arrangement could not sustain that pattern — a plain offering instead.'
            : 'That puzzle style wasn\'t available — here\'s a standard puzzle instead.'
        );
      }
    } catch (localErr) {
      console.log("Local generation failed, using fallback:", localErr);
      // Fallback puzzles don't include solver metadata, so restrictions may be
      // impossible to satisfy. Revert restriction variants to standard fallback.
      const fallbackVariant = 'standard' as PuzzleVariant;
      const fallbackWords = getRandomFallback(selectedDifficulty);
      const fallbackWordLen = fallbackWords[0].length;
      initGame(
        fallbackWords,
        undefined,
        undefined,
        fallbackWordLen,
        fallbackVariant
      );
      if (variant !== 'standard') {
        // Variant was dropped during fallback — notify the player
        setMessage(
          currentPhase >= 3
            ? 'The arrangement could not sustain that pattern.'
            : 'That puzzle style wasn\'t available \u2014 starting a standard puzzle instead.'
        );
      }
    }
  }, [difficulty, initGame, gameMode, currentPhase, generatePuzzleForVariant, selectedVariant]);

  // Daily Challenge bypasses the bank/generation path: words are supplied by
  // the seeded daily generator. Always standard mode (hints allowed) with
  // unlimited undos. Difficulty state is left untouched so the player's
  // preferred difficulty survives the daily run.
  const startDailyGame = useCallback((
    words: string[],
    puzzleHint: string | undefined,
    wordLength: number
  ) => {
    setGameMode('standard');
    applyBoard(words, puzzleHint, undefined, wordLength, {
      resetPerformance: true,
      variant: 'standard',
    });
    setUndosRemaining(Infinity);
    setMessage(getStartMessage(currentPhase));
  }, [applyBoard, currentPhase]);

  const handleLetterPress = useCallback((letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError(getLockedLetterMessage(currentPhase));
      return;
    }

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    if (isDoubleShift) {
      if (!isLetterAllowedByVariant(currentVariant, letter.char)) {
        shakeError(getVariantRestrictionError(currentVariant, currentPhase));
        return;
      }

      if (doubleShiftPhase === 'pick1' || doubleShiftPhase === 'drop1') {
        // First letter selection — freely tap between letters, deselect, etc.
        if (selectedLetter?.id === letter.id) {
          setSelectedLetter(null); // Deselect
          setDoubleShiftPhase('pick1');
        } else {
          setSelectedLetter(letter);
          setDoubleShiftPhase('drop1');
          setError(null);
        }
      } else if (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2') {
        // Second letter selection — freely switch between letters, deselect, etc.
        // No validation on tap — only validated when actually dropped
        if (selectedLetter?.id === letter.id) {
          setSelectedLetter(null); // Deselect
          setDoubleShiftPhase('pick2');
          return;
        }

        setSelectedLetter(letter);
        setDoubleShiftPhase('drop2');
        setError(null);
      }
      return;
    }

    // Standard single-shift letter press
    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    } else {
      if (!isLetterAllowedByVariant(currentVariant, letter.char)) {
        shakeError(getVariantRestrictionError(currentVariant, currentPhase));
        return;
      }
      setSelectedLetter(letter);
      setError(null);
    }
  }, [gameState, activeRowIndex, selectedLetter, shakeError, currentVariant, currentPhase, doubleShiftPhase]);

  const handleHint = useCallback(() => {
    if (gameState !== GameState.PLAYING || isProcessing) return;

    // Challenge mode: no hints allowed
    if (gameMode === 'challenge') {
      shakeError("No hints in Challenge Mode!");
      return;
    }

    const hintTargetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
    if (hintTargetRowIndex < 0 || hintTargetRowIndex >= rows.length) {
      setMessage(getHintFallback(currentPhase));
      return;
    }

    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[hintTargetRowIndex].words.map(l => l.char).join("");

    // Use reverse solution for the reverse leg, forward solution otherwise
    const isReverseLeg = moveDirection === 'up';
    const activeSolution = isReverseLeg ? reverseSolution : solution;

    let relevantStep: PuzzleSolutionStep | undefined;

    const isDoubleShiftHint = hasVariantModifier(currentVariant, 'double_shift');
    // During double shift pick2/drop2, the source row has already had one letter removed
    // by drop1, so the current source word won't match the solution step's sourceWord.
    // Fall back to matching by stepIndex only (unique per row in double shift).
    const doubleShiftMidStep = isDoubleShiftHint &&
      (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2');

    if (doubleShiftMidStep && activeSolution) {
      relevantStep = activeSolution.find(s => s.stepIndex === activeRowIndex);
    } else if (isReverseLeg && activeSolution) {
      // During reverse: stepIndex = how many reverse steps completed so far
      const reverseStepIndex = (rows.length - 1) - activeRowIndex;
      relevantStep = activeSolution.find(s =>
        s.stepIndex === reverseStepIndex &&
        s.sourceWord === currentSourceWord &&
        s.targetWord === currentTargetWord
      );
    } else {
      relevantStep = activeSolution?.find(s =>
        s.stepIndex === activeRowIndex &&
        s.sourceWord === currentSourceWord &&
        s.targetWord === currentTargetWord
      );
    }

    if (relevantStep) {
      setHintsUsed(prev => prev + 1);
      if (relevantStep.lettersToMove && doubleShiftMidStep) {
        // Double shift mid-step: only show the second letter (first was already placed)
        setMessage(
          getHintMessage(relevantStep.lettersToMove[1], relevantStep.targetWord, currentPhase)
        );
      } else if (relevantStep.lettersToMove) {
        // Double shift hint: show both letters
        setMessage(
          getHintMessage(
            `${relevantStep.lettersToMove[0]}' and '${relevantStep.lettersToMove[1]}`,
            relevantStep.targetWord,
            currentPhase
          )
        );
      } else {
        setMessage(
          getHintMessage(relevantStep.letterToMove, relevantStep.targetWord, currentPhase)
        );
      }
    } else {
      // Off solution path — try to find any valid move from the current board state
      const sourceLetters = rows[activeRowIndex].words;
      const targetWord = currentTargetWord;
      let foundMove: { letter: string; resultWord: string } | null = null;

      for (let i = 0; i < sourceLetters.length; i++) {
        if (sourceLetters[i].isLocked) continue;
        const letter = sourceLetters[i].char;
        // Check if removing this letter leaves a valid word
        const remaining = sourceLetters
          .filter((_, idx) => idx !== i)
          .map(l => l.char)
          .join('');
        if (!validWordsCache.current.has(remaining)) continue;

        // Check if inserting this letter into any position in the target creates a valid word
        for (let j = 0; j <= targetWord.length; j++) {
          const candidate = targetWord.slice(0, j) + letter + targetWord.slice(j);
          if (validWordsCache.current.has(candidate)) {
            foundMove = { letter, resultWord: candidate };
            break;
          }
        }
        if (foundMove) break;
      }

      if (foundMove) {
        setHintsUsed(prev => prev + 1);
        setMessage(getHintMessage(foundMove.letter, foundMove.resultWord, currentPhase));
      } else {
        setMessage(getHintFallback(currentPhase));
      }
    }
  }, [gameState, isProcessing, rows, activeRowIndex, solution, reverseSolution, currentPhase, moveDirection, currentVariant, doubleShiftPhase, gameMode]);

  const handleSlotPress = useCallback(async (targetIndex: number): Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
    variant?: PuzzleVariant;
    reverseMidpoint?: boolean;
  } | null> => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return null;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    const targetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) {
      shakeError("No valid target row.");
      return null;
    }

    const sourceRow = rows[activeRowIndex];
    const targetRow = rows[targetRowIndex];

    const newSourceLetters = sourceRow.words.filter(l => l.id !== selectedLetter.id);
    const newTargetLetters = [...targetRow.words];

    const movedLetter: Letter = { ...selectedLetter, isLocked: true };
    newTargetLetters.splice(targetIndex, 0, movedLetter);

    const sourceWordStr = newSourceLetters.map(l => l.char).join("");
    const targetWordStr = newTargetLetters.map(l => l.char).join("");

    setIsProcessing(true);

    // --- DOUBLE SHIFT DROP1: Place first letter without validation ---
    if (isDoubleShift && doubleShiftPhase === 'drop1') {
      // Record delta for undo
      const sourceLetterIndex = sourceRow.words.findIndex(l => l.id === selectedLetter.id);
      const delta: MoveDelta = {
        movedLetterId: selectedLetter.id,
        movedLetterChar: selectedLetter.char,
        sourceRowIndex: activeRowIndex,
        sourceLetterIndex,
        targetRowIndex,
        targetInsertIndex: targetIndex,
        activeRowIndexBefore: activeRowIndex,
        moveDirectionBefore: moveDirection,
      };
      setHistory(prev => [...prev, delta]);

      const newRows = [...rows];
      newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
      newRows[targetRowIndex] = { ...targetRow, words: newTargetLetters };

      setRows(newRows);
      // Clear selection — player now picks second letter from source row
      setSelectedLetter(null);
      setDoubleShiftPhase('pick2');
      setError(null);
      setIsProcessing(false);
      // Return a (non-null) result with no formedWord. The first letter is now
      // placed but the word isn't complete, so this routes App.tsx to the
      // positive drop-feedback path (catch bounce + haptic) rather than the
      // null -> "invalid drop" error path, while skipping ritual-echo/dread
      // tracking (which only fire when formedWord is present).
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [] };
    }

    // --- Standard validation (single shift OR double shift drop2) ---
    const isReverseReturn = hasVariantModifier(currentVariant, 'reverse') && moveDirection === 'up';
    const isStartRow = activeRowIndex === 0;

    let expectedSourceLength: number;
    let expectedTargetLength: number;

    if (isDoubleShift && doubleShiftPhase === 'drop2') {
      // After dropping both: source lost 2, target gained 2
      expectedSourceLength = isStartRow ? currentWordLength - 2 : currentWordLength;
      expectedTargetLength = currentWordLength + 2;
    } else {
      expectedSourceLength = isReverseReturn
        ? currentWordLength
        : (isStartRow ? currentWordLength - 1 : currentWordLength);
      expectedTargetLength = isReverseReturn
        ? (targetRowIndex === 0 ? currentWordLength : currentWordLength + 1)
        : currentWordLength + 1;
    }

    if (sourceWordStr.length !== expectedSourceLength) {
      shakeError(`Need ${expectedSourceLength} letters!`);
      setIsProcessing(false);
      return null;
    }

    if (targetWordStr.length !== expectedTargetLength) {
      shakeError(`Need ${expectedTargetLength} letters!`);
      setIsProcessing(false);
      return null;
    }

    const isSourceValid = checkValidation(sourceWordStr);
    if (!isSourceValid) {
      shakeError(getInvalidWordMessage(sourceWordStr, currentPhase));
      setInvalidAttempts(prev => prev + 1);
      // For double shift drop2, go back to pick2 (let player try different letter/slot)
      if (isDoubleShift && doubleShiftPhase === 'drop2') {
        setDoubleShiftPhase('pick2');
        setSelectedLetter(null);
      }
      setIsProcessing(false);
      return null;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(getInvalidWordMessage(targetWordStr, currentPhase));
      setInvalidAttempts(prev => prev + 1);
      // For double shift drop2, go back to pick2 (let player try different letter/slot)
      if (isDoubleShift && doubleShiftPhase === 'drop2') {
        setDoubleShiftPhase('pick2');
        setSelectedLetter(null);
      }
      setIsProcessing(false);
      return null;
    }

    // Store a lightweight move delta instead of deep-cloning entire board state
    const sourceLetterIndex = sourceRow.words.findIndex(l => l.id === selectedLetter.id);
    const delta: MoveDelta = {
      movedLetterId: selectedLetter.id,
      movedLetterChar: selectedLetter.char,
      sourceRowIndex: activeRowIndex,
      sourceLetterIndex,
      targetRowIndex,
      targetInsertIndex: targetIndex,
      activeRowIndexBefore: activeRowIndex,
      moveDirectionBefore: moveDirection,
    };
    setHistory(prev => [...prev, delta]);

    const newRows = [...rows];
    newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
    newRows[targetRowIndex] = {
      ...targetRow,
      words: newTargetLetters.map(l => ({
        ...l,
        // During reverse leg, preserve all existing locks (cumulative locking):
        // every letter that was shifted at any point stays locked.
        // During double shift drop2, preserve the first dropped letter's lock.
        // During standard forward leg, only the just-moved letter is locked.
        isLocked: (isDoubleShift || isReverseReturn)
          ? (l.isLocked || l.id === selectedLetter.id)
          : (l.id === selectedLetter.id),
      })),
    };

    setRows(newRows);
    setSelectedLetter(null);
    setError(null);

    // Reset double shift phase for next step
    if (isDoubleShift) {
      setDoubleShiftPhase('pick1');
    }

    const maxForwardSourceIndex = rows.length - 2;
    const isReverseMode = hasVariantModifier(currentVariant, 'reverse');

    const finalizePuzzleCompletion = async (completedWords: string[]) => {
      setLastCompletedWords(completedWords);
      setLastIncantationName(getIncantationName(completedWords, currentPhase));
      setIsProcessing(false);
      return {
        completed: true,
        hintsUsed,
        invalidAttempts,
        gameMode,
        completedWords,
        variant: currentVariant,
      };
    };

    if (!isReverseMode) {
      if (activeRowIndex === maxForwardSourceIndex) {
        const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
        return await finalizePuzzleCompletion(completedWords);
      }

      setActiveRowIndex(prev => prev + 1);
      // Stuck detection: only for variants where one pick+drop is a full move
      if (!isDoubleShift && !hasAnyValidMove(newRows, activeRowIndex + 1, 'down', checkValidation)) {
        setMessage(getNoValidMovesMessage(currentPhase));
        setIsStuck(true);
      } else {
        setMessage(getMoveMessage(currentPhase));
        setIsStuck(false);
      }
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr };
    }

    // Reverse Shift: descend to bottom, then return to row 0.
    if (moveDirection === 'down') {
      let reachedMidpoint = false;
      if (activeRowIndex === maxForwardSourceIndex) {
        reachedMidpoint = true;
        setMoveDirection('up');
        setActiveRowIndex(rows.length - 1);
        if (!hasAnyValidMove(newRows, rows.length - 1, 'up', checkValidation)) {
          setMessage(getNoValidMovesMessage(currentPhase));
          setIsStuck(true);
        } else {
          setMessage(
            currentPhase >= 3
              ? 'The descent is complete. Return every letter to the beginning.'
              : 'Great! Now shift letters back up to the first word.'
          );
          setIsStuck(false);
        }
      } else {
        setActiveRowIndex(prev => prev + 1);
        const stuck = !hasAnyValidMove(newRows, activeRowIndex + 1, 'down', checkValidation);
        setMessage(stuck ? getNoValidMovesMessage(currentPhase) : getMoveMessage(currentPhase));
        setIsStuck(stuck);
      }
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr, reverseMidpoint: reachedMidpoint };
    }

    // Returning upward in reverse mode.
    if (activeRowIndex === 1) {
      const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
      return await finalizePuzzleCompletion(completedWords);
    }

    setActiveRowIndex(prev => prev - 1);
    const stuckUp = !hasAnyValidMove(newRows, activeRowIndex - 1, 'up', checkValidation);
    setMessage(stuckUp ? getNoValidMovesMessage(currentPhase) : getMoveMessage(currentPhase));
    setIsStuck(stuckUp);
    setLastFormedWord(targetWordStr);
    setIsProcessing(false);
    return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr };
  }, [
    selectedLetter,
    gameState,
    rows,
    activeRowIndex,
    currentWordLength,
    shakeError,
    checkValidation,
    hintsUsed,
    invalidAttempts,
    moveDirection,
    currentVariant,
    currentPhase,
    gameMode,
    doubleShiftPhase,
  ]);

  const handleUndo = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    if (history.length === 0) return;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // Double shift mid-step undo: always allowed even in challenge mode (not a committed move)
    if (isDoubleShift && (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2')) {
      const delta = history[history.length - 1];
      setRows(prevRows => {
        const newRows = [...prevRows];
        const targetRow = newRows[delta.targetRowIndex];
        const sourceRow = newRows[delta.sourceRowIndex];
        const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);
        const restoredLetter: Letter = { id: delta.movedLetterId, char: delta.movedLetterChar, isLocked: false };
        const newSourceLetters = [...sourceRow.words];
        newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);
        newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
        newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };
        return newRows;
      });
      setHistory(prev => prev.slice(0, -1));
      setDoubleShiftPhase('pick1');
      setSelectedLetter(null);
      setError(null);
      return;
    }

    // Challenge mode: limited undos (only applies to committed moves, not mid-step)
    if (gameMode === 'challenge' && undosRemaining <= 0) {
      shakeError("No undos remaining in Challenge Mode!");
      return;
    }

    // Standard undo: always undo 1 delta at a time.
    // For double shift completed steps, the second undo press will reverse the other drop.
    const delta = history[history.length - 1];

    setRows(prevRows => {
      const newRows = [...prevRows];
      const targetRow = newRows[delta.targetRowIndex];
      const sourceRow = newRows[delta.sourceRowIndex];
      const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);
      const restoredLetter: Letter = { id: delta.movedLetterId, char: delta.movedLetterChar, isLocked: false };
      const newSourceLetters = [...sourceRow.words];
      newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);
      newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
      newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };
      return newRows;
    });

    setActiveRowIndex(delta.activeRowIndexBefore);
    if (delta.moveDirectionBefore) {
      setMoveDirection(delta.moveDirectionBefore);
    }
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setIsStuck(false);
    setMessage("Let's try again!");

    // After undoing one delta of a double shift completed step, we're now mid-step
    // (the first drop is still in place). Set to pick2 so player can pick the second letter again.
    if (isDoubleShift) {
      // Check if the previous delta (now the last in history) is the first drop of the same step
      // i.e. same activeRowIndexBefore — meaning there's still a first drop to potentially undo
      const remainingHistory = history.slice(0, -1);
      if (remainingHistory.length > 0) {
        const prevDelta = remainingHistory[remainingHistory.length - 1];
        if (prevDelta.activeRowIndexBefore === delta.activeRowIndexBefore) {
          // The previous delta is the first drop — we're now mid-step
          setDoubleShiftPhase('pick2');
        } else {
          setDoubleShiftPhase('pick1');
        }
      } else {
        setDoubleShiftPhase('pick1');
      }
    }

    if (gameMode === 'challenge') {
      setUndosRemaining(prev => prev - 1);
    }
  }, [history, gameMode, undosRemaining, shakeError, gameState, currentVariant, doubleShiftPhase]);

  const handleNextLevel = useCallback(() => {
    setShowConfetti(false);
    startNewGame();
  }, [startNewGame]);

  // Compute word previews for the target row when a letter is selected.
  // Shows what word would form at each slot position — valid words in green, invalid in red.
  const slotPreviews = useMemo(() => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return undefined;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // For double shift, only show previews during drop phases
    if (isDoubleShift && doubleShiftPhase !== 'drop1' && doubleShiftPhase !== 'drop2') {
      return undefined;
    }

    const targetRowIndex = activeRowIndex + (moveDirection === 'down' ? 1 : -1);
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) return undefined;

    const targetLetters = rows[targetRowIndex].words.map(l => l.char);
    const previews: Array<{ word: string; isValid: boolean }> = [];

    // For each possible insertion position (0 through targetLetters.length)
    for (let i = 0; i <= targetLetters.length; i++) {
      const newWord = [
        ...targetLetters.slice(0, i),
        selectedLetter.char,
        ...targetLetters.slice(i),
      ].join('');

      if (isDoubleShift && doubleShiftPhase === 'drop1') {
        // During drop1, show intermediate words (no validation — they're W+1 intermediates)
        previews.push({ word: newWord, isValid: true });
      } else if (isDoubleShift && doubleShiftPhase === 'drop2') {
        // During drop2, both source and target must be valid words.
        // Source validity is the same for all slots (doesn't depend on drop position),
        // so compute once outside the loop would be ideal, but for clarity we AND here.
        const sourceWordAfterBothRemovals = rows[activeRowIndex].words
          .filter(l => l.id !== selectedLetter.id)
          .map(l => l.char)
          .join('');
        const isSourceValid = validWordsCache.current.has(sourceWordAfterBothRemovals);
        previews.push({
          word: newWord,
          isValid: isSourceValid && validWordsCache.current.has(newWord),
        });
      } else {
        previews.push({
          word: newWord,
          isValid: validWordsCache.current.has(newWord),
        });
      }
    }
    return previews;
  }, [selectedLetter, activeRowIndex, moveDirection, rows, gameState, currentVariant, doubleShiftPhase]);

  const restorePuzzleState = useCallback((saved: SavedPuzzleState) => {
    const selectedExists = saved.selectedLetter
      ? saved.rows.some(row => row.words.some(letter => letter.id === saved.selectedLetter!.id))
      : false;
    setRows(saved.rows);
    setActiveRowIndex(saved.activeRowIndex);
    setSelectedLetter(selectedExists ? saved.selectedLetter : null);
    setGameState(saved.gameState as GameState);
    setMessage(saved.message);
    setHistory(saved.history);
    setInvalidAttempts(saved.invalidAttempts);
    setHintsUsed(saved.hintsUsed);
    setUndosRemaining(saved.undosRemaining);
    setDifficulty(saved.difficulty);
    setCurrentWordLength(saved.currentWordLength);
    setHint(saved.hint);
    setSolution(saved.solution);
    setReverseSolution(saved.reverseSolution);
    setGameMode(saved.gameMode);
    setCurrentVariant(saved.currentVariant);
    setSelectedVariantState(saved.selectedVariant);
    setMoveDirection(saved.moveDirection);
    setCurrentPhase(saved.currentPhase);
    setLastFormedWord(saved.lastFormedWord);
    setDoubleShiftPhase(
      (saved.doubleShiftPhase as typeof doubleShiftPhase)
        ?? (hasVariantModifier(saved.currentVariant, 'double_shift') ? 'pick1' : null)
    );
    // Reset UI-only state
    setError(null);
    setIsProcessing(false);
    setShowRules(false);
    setShowDifficultyMenu(false);
    setShowConfetti(false);
    setEarnedStars(0);
  }, []);

  // Re-apply the same puzzle from its starting words (each row preserves its
  // immutable originalWord). Unlike startNewGame this does NOT fetch a different
  // puzzle — it's a real "retry this board", the recovery path for a stuck state.
  // Performance counters (invalid attempts, hints used) are intentionally kept so
  // a reset can't be used to game the star rating; undos refresh with the board.
  const resetCurrentPuzzle = useCallback(() => {
    if (rows.length === 0) return;
    const originalWords = rows.map(r => r.originalWord);
    const wordLen = originalWords[0]?.length ?? currentWordLength;
    applyBoard(originalWords, hint || undefined, solution, wordLen, {
      resetPerformance: false,
      preserveVariant: true,
      reverseSolution,
    });
  }, [rows, applyBoard, hint, solution, reverseSolution, currentWordLength]);

  const clearBoard = useCallback(() => {
    setRows([]);
    setActiveRowIndex(0);
    setSelectedLetter(null);
    setGameState(GameState.IDLE);
    setMessage('');
    setError(null);
    setHistory([]);
    setLastCompletedWords([]);
    setLastIncantationName(null);
    setLastFormedWord(null);
    setDoubleShiftPhase(null);
    setIsEchoPuzzle(false);
    setIsStuck(false);
  }, []);

  const state: PuzzleGameState = {
    rows,
    activeRowIndex,
    selectedLetter,
    gameState,
    message,
    error,
    history,
    isProcessing,
    hint,
    solution,
    reverseSolution,
    difficulty,
    currentWordLength,
    showRules,
    showDifficultyMenu,
    showConfetti,
    invalidAttempts,
    hintsUsed,
    earnedStars,
    gameMode,
    undosRemaining,
    currentPhase,
    lastCompletedWords,
    lastIncantationName,
    lastFormedWord,
    currentVariant,
    selectedVariant,
    moveDirection,
    slotPreviews,
    doubleShiftPhase,
    isEchoPuzzle,
    isStuck,
  };

  const actions: PuzzleGameActions = {
    initGame,
    startNewGame,
    startDailyGame,
    handleLetterPress,
    handleSlotPress,
    handleUndo,
    handleHint,
    handleNextLevel,
    setShowRules,
    setShowDifficultyMenu,
    setShowConfetti,
    setGameState,
    setEarnedStars,
    setMessage,
    setGameMode,
    setCurrentPhase,
    setSelectedVariant,
    restorePuzzleState,
    resetCurrentPuzzle,
    clearBoard,
  };

  return [state, actions];
}
