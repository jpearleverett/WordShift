import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { SavedPuzzleState } from '../services/puzzleSaveState';
import { generateLocalPuzzle, generateDoubleShiftPuzzle, getIncantationName } from '../services/localGenerator';
import { selectPreGeneratedPuzzle } from '../services/puzzleBank';
import { getWordHistoryWithRecency, recordPuzzleWords } from '../services/wordHistory';
import { COMMON_WORDS, CURATED_EARLY_PUZZLES, CURATED_PUZZLE_COUNT, CuratedPuzzle, getRandomFallback } from '../constants';
import { CHALLENGE_MODE_CONFIG, DialoguePhase } from '../types/homeWorld';
import { getMoveMessage, getHintMessage, getHintFallback, getLoadingMessage, getStartMessage, getInvalidWordMessage, getLockedLetterMessage } from '../services/phaseNarrative';
import { getPreferredPuzzleVariant, setPreferredPuzzleVariant, getFullProgress } from '../services/amberCurrency';
import {
  getVariantOverrides,
  getVariantChainLength,
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
  level: number;
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
  /** Rows revealed in blind variants */
  blindRevealedRows: number[];
  /** Current chain link index for chain variants (1-based) */
  currentChainLink: number;
  /** Total links required for chain variants */
  chainLength: number;
  /** Word previews for each slot position in the target row (when letter is selected) */
  slotPreviews?: Array<{ word: string; isValid: boolean }>;
  /** Double shift phase tracking: pick1 → pick2 → drop1 → drop2 */
  doubleShiftPhase: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  /** First picked letter in double shift (held while dropping second) */
  firstPickedLetter: Letter | null;
}

export interface PuzzleGameActions {
  initGame: (
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength?: number,
    variant?: PuzzleVariant,
    chainLengthOverride?: number,
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
    chainAdvanced?: boolean;
    chainLink?: number;
    chainLength?: number;
    variant?: PuzzleVariant;
  } | null>;
  handleUndo: () => void;
  handleHint: () => void;
  handleNextLevel: () => void;
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
  const [level, setLevel] = useState(1);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [undosRemaining, setUndosRemaining] = useState(Infinity);
  const [currentVariant, setCurrentVariant] = useState<PuzzleVariant>('standard');
  const [selectedVariant, setSelectedVariantState] = useState<PuzzleVariant>('standard');
  const [moveDirection, setMoveDirection] = useState<'down' | 'up'>('down');
  const [blindRevealedRows, setBlindRevealedRows] = useState<number[]>([]);
  const [currentChainLink, setCurrentChainLink] = useState(1);
  const [chainLength, setChainLength] = useState(1);
  const [chainCompletedWords, setChainCompletedWords] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const [lastCompletedWords, setLastCompletedWords] = useState<string[]>([]);
  const [lastIncantationName, setLastIncantationName] = useState<string | null>(null);
  const [lastFormedWord, setLastFormedWord] = useState<string | null>(null);

  // Double shift state: tracks the 4-step flow (pick1 → pick2 → drop1 → drop2)
  const [doubleShiftPhase, setDoubleShiftPhase] = useState<'pick1' | 'pick2' | 'drop1' | 'drop2' | null>(null);
  const [firstPickedLetter, setFirstPickedLetter] = useState<Letter | null>(null);

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

  const mergeChainWords = useCallback((existing: string[], incoming: string[]): string[] => {
    if (existing.length === 0) return [...incoming];
    if (incoming.length === 0) return [...existing];
    if (existing[existing.length - 1] === incoming[0]) {
      return [...existing, ...incoming.slice(1)];
    }
    return [...existing, ...incoming];
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
    setHint(puzzleHint || "");
    setSolution(puzzleSolution);
    setReverseSolution(options?.reverseSolution);
    setCurrentWordLength(wordLength);
    setLastFormedWord(null);
    setDoubleShiftPhase(hasVariantModifier(variantToUse, 'double_shift') ? 'pick1' : null);
    setFirstPickedLetter(null);
    setMoveDirection('down');
    setBlindRevealedRows(hasVariantModifier(variantToUse, 'blind') ? [0] : []);
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
    chainLengthOverride?: number,
    puzzleReverseSolution?: PuzzleSolutionStep[]
  ) => {
    applyBoard(words, puzzleHint, puzzleSolution, wordLength, {
      resetPerformance: true,
      variant,
      reverseSolution: puzzleReverseSolution,
    });
    const configuredChainLength = hasVariantModifier(variant, 'chain')
      ? (chainLengthOverride ?? getVariantChainLength(variant, difficulty))
      : 1;
    setCurrentChainLink(1);
    setChainLength(configuredChainLength);
    setChainCompletedWords([]);
  }, [applyBoard, difficulty]);

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
        initGame(curated.words, undefined, curated.solution, curated.words[0].length, 'standard', 0);
        setMessage(getStartMessage(currentPhase));
        return;
      }

      // Use pre-generated puzzle bank for standard/reverse variants at all difficulties
      const bankVariants: PuzzleVariant[] = ['standard', 'reverse', 'reverse_blind'];
      const shouldUseBank = bankVariants.includes(variant)
        && (variant !== 'standard' || effectiveMode === 'standard');
      if (shouldUseBank) {
        try {
          const recencyMap = await getWordHistoryWithRecency();
          const bankPuzzle = await selectPreGeneratedPuzzle(selectedDifficulty, currentPhase, recencyMap, variant);
          if (bankPuzzle) {
            const chainLen = getVariantChainLength(variant, selectedDifficulty);
            initGame(bankPuzzle.words, bankPuzzle.hint, bankPuzzle.solution, bankPuzzle.wordLength, variant, chainLen, bankPuzzle.reverseSolution);
            await recordPuzzleWords(bankPuzzle.words);
            if (variant !== 'standard') {
              const config = VARIANT_CONFIGS[variant];
              setMessage(getVariantInstruction(config, currentPhase));
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
      const chainLen = getVariantChainLength(activeVariant, selectedDifficulty);
      initGame(puzzle.words, puzzle.hint, puzzle.solution, puzzle.wordLength, activeVariant, chainLen, puzzle.reverseSolution);
      if (activeVariant !== 'standard') {
        const config = VARIANT_CONFIGS[activeVariant];
        setMessage(getVariantInstruction(config, currentPhase));
      }
    } catch (localErr) {
      console.log("Local generation failed, using fallback:", localErr);
      // Fallback puzzles don't include solver metadata, so restrictions may be
      // impossible to satisfy. Revert restriction variants to standard fallback.
      const fallbackVariant = (
        hasVariantModifier(variant, 'no_vowel') || hasVariantModifier(variant, 'no_consonant')
      ) ? 'standard' : variant;
      const fallbackWords = getRandomFallback(selectedDifficulty);
      const fallbackWordLen = fallbackWords[0].length;
      initGame(
        fallbackWords,
        undefined,
        undefined,
        fallbackWordLen,
        fallbackVariant,
        getVariantChainLength(fallbackVariant, selectedDifficulty)
      );
      if (fallbackVariant !== 'standard') {
        const config = VARIANT_CONFIGS[fallbackVariant];
        setMessage(getVariantInstruction(config, currentPhase));
      } else if (variant !== 'standard') {
        // Variant was dropped during fallback — notify the player
        setMessage(
          currentPhase >= 3
            ? 'The arrangement could not sustain that pattern.'
            : 'That puzzle style wasn\'t available \u2014 starting a standard puzzle instead.'
        );
      }
    }
  }, [difficulty, initGame, gameMode, currentPhase, generatePuzzleForVariant, selectedVariant]);

  const handleLetterPress = useCallback((letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError(getLockedLetterMessage(currentPhase));
      return;
    }

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // Double shift: during drop phase, ignore letter presses on source row
    if (isDoubleShift && (doubleShiftPhase === 'drop1' || doubleShiftPhase === 'drop2')) {
      return;
    }

    if (isDoubleShift) {
      if (!isLetterAllowedByVariant(currentVariant, letter.char)) {
        shakeError(getVariantRestrictionError(currentVariant, currentPhase));
        return;
      }

      if (doubleShiftPhase === 'pick1') {
        // First letter selection
        if (selectedLetter?.id === letter.id) {
          setSelectedLetter(null); // Deselect
        } else {
          setSelectedLetter(letter);
          setDoubleShiftPhase('pick2');
          setError(null);
        }
      } else if (doubleShiftPhase === 'pick2') {
        if (letter.id === selectedLetter?.id) {
          // Deselect first letter, go back to pick1
          setSelectedLetter(null);
          setDoubleShiftPhase('pick1');
          return;
        }
        // Tapping the same second letter again: deselect it
        if (letter.id === firstPickedLetter?.id) {
          setFirstPickedLetter(null);
          return;
        }

        // Validate that removing both letters leaves a valid word
        const sourceRow = rows[activeRowIndex];
        const remaining = sourceRow.words
          .filter(l => l.id !== selectedLetter?.id && l.id !== letter.id)
          .map(l => l.char)
          .join('');
        const isStartRow = activeRowIndex === 0;
        const expectedLen = isStartRow ? currentWordLength - 2 : currentWordLength;
        if (remaining.length !== expectedLen) {
          shakeError(`Need ${expectedLen} letters remaining!`);
          return;
        }
        if (!validWordsCache.current.has(remaining)) {
          shakeError(getInvalidWordMessage(remaining, currentPhase));
          return;
        }

        // Both letters valid — transition to drop phase
        setFirstPickedLetter(selectedLetter);
        setSelectedLetter(letter);
        // Actually, we want to drop the first-picked letter first.
        // So: firstPickedLetter = the one we'll drop first, selectedLetter = the one for drop2
        // Swap so selectedLetter is the first to drop
        setFirstPickedLetter(letter); // store second picked for later
        setSelectedLetter(selectedLetter); // keep first picked as active for drop1
        setDoubleShiftPhase('drop1');
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
  }, [gameState, activeRowIndex, selectedLetter, shakeError, currentVariant, currentPhase, doubleShiftPhase, firstPickedLetter, rows, currentWordLength]);

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

    if (isReverseLeg && activeSolution) {
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
      if (relevantStep.lettersToMove) {
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
      setMessage(getHintFallback(currentPhase));
    }
  }, [gameState, isProcessing, rows, activeRowIndex, solution, reverseSolution, currentPhase, moveDirection]);

  const handleSlotPress = useCallback(async (targetIndex: number): Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
    chainAdvanced?: boolean;
    chainLink?: number;
    chainLength?: number;
    variant?: PuzzleVariant;
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

      if (hasVariantModifier(currentVariant, 'blind')) {
        setBlindRevealedRows(prev =>
          prev.includes(targetRowIndex) ? prev : [...prev, targetRowIndex]
        );
      }

      setRows(newRows);
      // Switch to second letter for dropping
      setSelectedLetter(firstPickedLetter);
      setDoubleShiftPhase('drop2');
      setError(null);
      setIsProcessing(false);
      return null; // Not completed yet — still need to drop second letter
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
      // For double shift drop2, undo the first drop too
      if (isDoubleShift && doubleShiftPhase === 'drop2') {
        // Undo the drop1 delta from history
        setHistory(prev => prev.slice(0, -1));
        // Restore the first letter from history
        const drop1Delta = history[history.length - 1];
        if (drop1Delta) {
          setRows(prevRows => {
            const restored = [...prevRows];
            const tRow = restored[drop1Delta.targetRowIndex];
            const sRow = restored[drop1Delta.sourceRowIndex];
            const newTarget = tRow.words.filter(l => l.id !== drop1Delta.movedLetterId);
            const restoredLetter: Letter = { id: drop1Delta.movedLetterId, char: drop1Delta.movedLetterChar, isLocked: false };
            const newSource = [...sRow.words];
            newSource.splice(drop1Delta.sourceLetterIndex, 0, restoredLetter);
            restored[drop1Delta.targetRowIndex] = { ...tRow, words: newTarget };
            restored[drop1Delta.sourceRowIndex] = { ...sRow, words: newSource };
            return restored;
          });
        }
        setDoubleShiftPhase('pick1');
        setSelectedLetter(null);
        setFirstPickedLetter(null);
      }
      setIsProcessing(false);
      return null;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(getInvalidWordMessage(targetWordStr, currentPhase));
      setInvalidAttempts(prev => prev + 1);
      // For double shift drop2, undo the first drop too
      if (isDoubleShift && doubleShiftPhase === 'drop2') {
        setHistory(prev => prev.slice(0, -1));
        const drop1Delta = history[history.length - 1];
        if (drop1Delta) {
          setRows(prevRows => {
            const restored = [...prevRows];
            const tRow = restored[drop1Delta.targetRowIndex];
            const sRow = restored[drop1Delta.sourceRowIndex];
            const newTarget = tRow.words.filter(l => l.id !== drop1Delta.movedLetterId);
            const restoredLetter: Letter = { id: drop1Delta.movedLetterId, char: drop1Delta.movedLetterChar, isLocked: false };
            const newSource = [...sRow.words];
            newSource.splice(drop1Delta.sourceLetterIndex, 0, restoredLetter);
            restored[drop1Delta.targetRowIndex] = { ...tRow, words: newTarget };
            restored[drop1Delta.sourceRowIndex] = { ...sRow, words: newSource };
            return restored;
          });
        }
        setDoubleShiftPhase('pick1');
        setSelectedLetter(null);
        setFirstPickedLetter(null);
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
        // During forward leg, only the just-moved letter is locked.
        isLocked: isReverseReturn
          ? (l.isLocked || l.id === selectedLetter.id)
          : (l.id === selectedLetter.id),
      })),
    };

    if (hasVariantModifier(currentVariant, 'blind')) {
      setBlindRevealedRows(prev =>
        prev.includes(targetRowIndex) ? prev : [...prev, targetRowIndex]
      );
    }

    setRows(newRows);
    setSelectedLetter(null);
    setError(null);

    // Reset double shift phase for next step
    if (isDoubleShift) {
      setDoubleShiftPhase('pick1');
      setFirstPickedLetter(null);
    }

    const maxForwardSourceIndex = rows.length - 2;
    const isReverseMode = hasVariantModifier(currentVariant, 'reverse');
    const isChainMode = hasVariantModifier(currentVariant, 'chain');

    const finalizeLinkCompletion = async (linkWords: string[]) => {
      if (isChainMode && currentChainLink < chainLength) {
        const nextLink = currentChainLink + 1;
        const aggregatedWords = mergeChainWords(chainCompletedWords, linkWords);
        setChainCompletedWords(aggregatedWords);

        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Chain generation timeout')), 4000)
          );
          const startWord = linkWords[linkWords.length - 1];
          const { puzzle, activeVariant } = await generatePuzzleForVariant(
            difficulty,
            currentVariant,
            timeoutPromise,
            startWord
          );

          applyBoard(
            puzzle.words,
            puzzle.hint,
            puzzle.solution,
            puzzle.wordLength,
            {
              resetPerformance: false,
              preserveVariant: activeVariant === currentVariant,
              variant: activeVariant,
            }
          );
          setCurrentChainLink(nextLink);
          setMessage(
            currentPhase >= 3
              ? `Link ${nextLink}/${chainLength}. The sequence continues.`
              : `Chain link ${nextLink} of ${chainLength}. Keep going!`
          );
          setIsProcessing(false);
          return {
            completed: false,
            hintsUsed,
            invalidAttempts,
            gameMode,
            completedWords: aggregatedWords,
            chainAdvanced: true,
            chainLink: nextLink,
            chainLength,
            variant: currentVariant,
          };
        } catch (chainErr) {
          // If the next link cannot be generated, gracefully finalize this chain.
          console.log('Chain link generation failed, finalizing run:', chainErr);
        }
      }

      const finalWords = isChainMode ? mergeChainWords(chainCompletedWords, linkWords) : linkWords;
      setLastCompletedWords(finalWords);
      setLastIncantationName(getIncantationName(finalWords, currentPhase));
      setChainCompletedWords([]);
      setCurrentChainLink(1);
      setIsProcessing(false);
      return {
        completed: true,
        hintsUsed,
        invalidAttempts,
        gameMode,
        completedWords: finalWords,
        variant: currentVariant,
      };
    };

    if (!isReverseMode) {
      if (activeRowIndex === maxForwardSourceIndex) {
        const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
        return await finalizeLinkCompletion(completedWords);
      }

      setActiveRowIndex(prev => prev + 1);
      setMessage(getMoveMessage(currentPhase));
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr };
    }

    // Reverse Shift: descend to bottom, then return to row 0.
    if (moveDirection === 'down') {
      if (activeRowIndex === maxForwardSourceIndex) {
        setMoveDirection('up');
        setActiveRowIndex(rows.length - 1);
        setMessage(
          currentPhase >= 3
            ? 'The descent is complete. Return every letter to the beginning.'
            : 'Great! Now shift letters back up to the first word.'
        );
      } else {
        setActiveRowIndex(prev => prev + 1);
        setMessage(getMoveMessage(currentPhase));
      }
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr };
    }

    // Returning upward in reverse mode.
    if (activeRowIndex === 1) {
      const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
      return await finalizeLinkCompletion(completedWords);
    }

    setActiveRowIndex(prev => prev - 1);
    setMessage(getMoveMessage(currentPhase));
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
    currentChainLink,
    chainLength,
    chainCompletedWords,
    mergeChainWords,
    generatePuzzleForVariant,
    difficulty,
    applyBoard,
    doubleShiftPhase,
    firstPickedLetter,
    history,
  ]);

  const handleUndo = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    if (history.length === 0) return;

    // Challenge mode: limited undos
    if (gameMode === 'challenge' && undosRemaining <= 0) {
      shakeError("No undos remaining in Challenge Mode!");
      return;
    }

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // Double shift: if we're mid-drop (drop2 phase), just undo the first drop
    if (isDoubleShift && doubleShiftPhase === 'drop2') {
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
      setFirstPickedLetter(null);
      setError(null);
      return;
    }

    // Double shift: undo both letters of a completed step (2 deltas)
    const undoCount = isDoubleShift ? Math.min(2, history.length) : 1;

    setRows(prevRows => {
      const newRows = [...prevRows];
      for (let i = 0; i < undoCount; i++) {
        const delta = history[history.length - 1 - i];
        const targetRow = newRows[delta.targetRowIndex];
        const sourceRow = newRows[delta.sourceRowIndex];
        const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);
        const restoredLetter: Letter = { id: delta.movedLetterId, char: delta.movedLetterChar, isLocked: false };
        const newSourceLetters = [...sourceRow.words];
        newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);
        newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
        newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };
      }
      return newRows;
    });

    const oldestDelta = history[history.length - undoCount];
    setActiveRowIndex(oldestDelta.activeRowIndexBefore);
    if (oldestDelta.moveDirectionBefore) {
      setMoveDirection(oldestDelta.moveDirectionBefore);
    }
    setHistory(prev => prev.slice(0, -undoCount));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setMessage("Let's try again!");

    if (isDoubleShift) {
      setDoubleShiftPhase('pick1');
      setFirstPickedLetter(null);
    }

    if (gameMode === 'challenge') {
      setUndosRemaining(prev => prev - 1);
    }
  }, [history, gameMode, undosRemaining, shakeError, gameState, currentVariant, doubleShiftPhase]);

  const handleNextLevel = useCallback(() => {
    setShowConfetti(false);
    setLevel(prev => prev + 1);
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
    setBlindRevealedRows(saved.blindRevealedRows);
    setCurrentChainLink(saved.currentChainLink);
    setChainLength(saved.chainLength);
    setCurrentPhase(saved.currentPhase);
    setLastFormedWord(saved.lastFormedWord);
    // Reset UI-only state
    setError(null);
    setIsProcessing(false);
    setShowRules(false);
    setShowDifficultyMenu(false);
    setShowConfetti(false);
    setEarnedStars(0);
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
    level,
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
    blindRevealedRows,
    currentChainLink,
    chainLength,
    slotPreviews,
    doubleShiftPhase,
    firstPickedLetter,
  };

  const actions: PuzzleGameActions = {
    initGame,
    startNewGame,
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
  };

  return [state, actions];
}
