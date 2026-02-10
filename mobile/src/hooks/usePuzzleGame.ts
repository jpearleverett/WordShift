import { useState, useRef, useCallback, useEffect } from 'react';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { generateLocalPuzzle, getIncantationName } from '../services/localGenerator';
import { FALLBACK_PUZZLE, FALLBACK_PUZZLE_HARD, COMMON_WORDS } from '../constants';
import { CHALLENGE_MODE_CONFIG, DialoguePhase } from '../types/homeWorld';
import { getMoveMessage, getHintMessage, getHintFallback, getLoadingMessage, getStartMessage } from '../services/phaseNarrative';

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
}

export interface PuzzleGameActions {
  initGame: (words: string[], puzzleHint?: string, puzzleSolution?: PuzzleSolutionStep[], wordLength?: number) => void;
  startNewGame: (selectedDifficulty?: Difficulty, mode?: GameMode) => Promise<void>;
  handleLetterPress: (letter: Letter, rowIndex: number) => void;
  handleSlotPress: (targetIndex: number) => Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
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
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const [lastCompletedWords, setLastCompletedWords] = useState<string[]>([]);
  const [lastIncantationName, setLastIncantationName] = useState<string | null>(null);
  const [lastFormedWord, setLastFormedWord] = useState<string | null>(null);

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

  const initGame = useCallback((
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength: number = 4
  ) => {
    const newRows: RowData[] = words.map(word => ({
      id: generateId(),
      originalWord: word,
      words: word.split('').map(char => ({
        id: generateId(),
        char: char,
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
    setCurrentWordLength(wordLength);
    setInvalidAttempts(0);
    setHintsUsed(0);
    setEarnedStars(0);
    setLastFormedWord(null);
    // Reset undos for challenge mode
    setUndosRemaining(gameMode === 'challenge' ? CHALLENGE_MODE_CONFIG.MAX_UNDOS : Infinity);
  }, [gameMode, currentPhase]);

  const startNewGame = useCallback(async (selectedDifficulty: Difficulty = difficulty, mode?: GameMode) => {
    setGameState(GameState.LOADING);
    setMessage(getLoadingMessage(currentPhase));
    setError(null);
    setShowDifficultyMenu(false);
    if (selectedDifficulty !== difficulty) {
      setDifficulty(selectedDifficulty);
    }
    if (mode !== undefined) {
      setGameMode(mode);
      setUndosRemaining(mode === 'challenge' ? CHALLENGE_MODE_CONFIG.MAX_UNDOS : Infinity);
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), 4000)
      );

      const puzzle = await Promise.race([
        generateLocalPuzzle(selectedDifficulty),
        timeoutPromise
      ]);

      initGame(puzzle.words, puzzle.hint, puzzle.solution, puzzle.wordLength);
    } catch (localErr) {
      console.log("Local generation failed, using fallback:", localErr);
      if (selectedDifficulty === 'HARD') {
        initGame(FALLBACK_PUZZLE_HARD, "Challenge Mode", undefined, 5);
      } else if (selectedDifficulty === 'EASY') {
        initGame(FALLBACK_PUZZLE.slice(0, 3), "Simple Start", undefined, 4);
      } else {
        initGame(FALLBACK_PUZZLE, "Classic Setup", undefined, 4);
      }
    }
  }, [difficulty, initGame]);

  const handleLetterPress = useCallback((letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError("That letter is locked!");
      return;
    }

    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    } else {
      setSelectedLetter(letter);
      setError(null);
    }
  }, [gameState, activeRowIndex, selectedLetter, shakeError]);

  const handleHint = useCallback(() => {
    if (gameState !== GameState.PLAYING || isProcessing) return;

    // Challenge mode: no hints allowed
    if (gameMode === 'challenge') {
      shakeError("No hints in Challenge Mode!");
      return;
    }

    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[activeRowIndex + 1].words.map(l => l.char).join("");

    const relevantStep = solution?.find(s =>
      s.stepIndex === activeRowIndex &&
      s.sourceWord === currentSourceWord &&
      s.targetWord === currentTargetWord
    );

    if (relevantStep) {
      setHintsUsed(prev => prev + 1);
      setMessage(
        getHintMessage(relevantStep.letterToMove, relevantStep.targetWord, currentPhase)
      );
    } else {
      setMessage(getHintFallback(currentPhase));
    }
  }, [gameState, isProcessing, rows, activeRowIndex, solution, currentPhase]);

  const handleSlotPress = useCallback(async (targetIndex: number): Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
  } | null> => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return null;

    const sourceRow = rows[activeRowIndex];
    const targetRow = rows[activeRowIndex + 1];

    const newSourceLetters = sourceRow.words.filter(l => l.id !== selectedLetter.id);
    const newTargetLetters = [...targetRow.words];

    const movedLetter: Letter = { ...selectedLetter, isLocked: true };
    newTargetLetters.splice(targetIndex, 0, movedLetter);

    const sourceWordStr = newSourceLetters.map(l => l.char).join("");
    const targetWordStr = newTargetLetters.map(l => l.char).join("");

    setIsProcessing(true);

    const isStartRow = activeRowIndex === 0;
    const expectedSourceLength = isStartRow ? currentWordLength - 1 : currentWordLength;
    const expectedTargetLength = currentWordLength + 1;

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
      shakeError(`"${sourceWordStr}" isn't a word!`);
      setInvalidAttempts(prev => prev + 1);
      setIsProcessing(false);
      return null;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(`"${targetWordStr}" isn't a word!`);
      setInvalidAttempts(prev => prev + 1);
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
      targetRowIndex: activeRowIndex + 1,
      targetInsertIndex: targetIndex,
      activeRowIndexBefore: activeRowIndex,
    };
    setHistory(prev => [...prev, delta]);

    const newRows = [...rows];
    newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
    newRows[activeRowIndex + 1] = {
      ...targetRow,
      words: newTargetLetters.map(l => ({
        ...l,
        isLocked: l.id === selectedLetter.id,
      })),
    };

    setRows(newRows);
    setSelectedLetter(null);
    setError(null);

    const maxMoves = rows.length - 1;
    if (activeRowIndex === maxMoves - 1) {
      // Capture the completed word chain for ritual echo
      const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
      setLastCompletedWords(completedWords);
      setLastIncantationName(getIncantationName(completedWords, currentPhase));

      setIsProcessing(false);
      // Return completion info - caller handles persistence & victory state
      return { completed: true, hintsUsed, invalidAttempts, gameMode, completedWords };
    } else {
      setActiveRowIndex(prev => prev + 1);
      setMessage(getMoveMessage(currentPhase));
      setLastFormedWord(targetWordStr);
    }

    setIsProcessing(false);
    return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr };
  }, [selectedLetter, gameState, rows, activeRowIndex, currentWordLength, shakeError, checkValidation, hintsUsed, invalidAttempts]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    // Challenge mode: limited undos
    if (gameMode === 'challenge' && undosRemaining <= 0) {
      shakeError("No undos remaining in Challenge Mode!");
      return;
    }

    const delta = history[history.length - 1];

    // Reconstruct previous state from delta:
    // 1. Remove movedLetter from target row
    // 2. Insert it back into source row at original position (unlocked)
    setRows(prevRows => {
      const newRows = [...prevRows];
      const targetRow = newRows[delta.targetRowIndex];
      const sourceRow = newRows[delta.sourceRowIndex];

      // Remove the moved letter from target
      const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);

      // Re-insert into source at original position (unlocked)
      const restoredLetter: Letter = {
        id: delta.movedLetterId,
        char: delta.movedLetterChar,
        isLocked: false,
      };
      const newSourceLetters = [...sourceRow.words];
      newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);

      newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
      newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };

      return newRows;
    });

    setActiveRowIndex(delta.activeRowIndexBefore);
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setMessage("Let's try again!");

    if (gameMode === 'challenge') {
      setUndosRemaining(prev => prev - 1);
    }
  }, [history, gameMode, undosRemaining, shakeError]);

  const handleNextLevel = useCallback(() => {
    setShowConfetti(false);
    setLevel(prev => prev + 1);
    startNewGame();
  }, [startNewGame]);

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
  };

  return [state, actions];
}
