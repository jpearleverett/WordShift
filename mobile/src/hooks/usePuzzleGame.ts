import { useState, useRef, useCallback } from 'react';
import { RowData, Letter, GameState, MoveHistory, PuzzleSolutionStep, Difficulty } from '../types';
import { generateLocalPuzzle } from '../services/localGenerator';
import { FALLBACK_PUZZLE, FALLBACK_PUZZLE_HARD, COMMON_WORDS } from '../constants';

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
  history: MoveHistory[];
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
}

export interface PuzzleGameActions {
  initGame: (words: string[], puzzleHint?: string, puzzleSolution?: PuzzleSolutionStep[], wordLength?: number) => void;
  startNewGame: (selectedDifficulty?: Difficulty) => Promise<void>;
  handleLetterPress: (letter: Letter, rowIndex: number) => void;
  handleSlotPress: (targetIndex: number) => Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
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
}

export function usePuzzleGame(): [PuzzleGameState, PuzzleGameActions] {
  const [rows, setRows] = useState<RowData[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [message, setMessage] = useState<string>("Loading puzzle...");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MoveHistory[]>([]);
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

  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));

  const shakeError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 2000);
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
    setMessage("Tap a tile to begin!");
    setError(null);
    setHint(puzzleHint || "");
    setSolution(puzzleSolution);
    setCurrentWordLength(wordLength);
    setInvalidAttempts(0);
    setHintsUsed(0);
    setEarnedStars(0);
  }, []);

  const startNewGame = useCallback(async (selectedDifficulty: Difficulty = difficulty) => {
    setGameState(GameState.LOADING);
    setMessage("Mixing up words...");
    setError(null);
    setShowDifficultyMenu(false);
    if (selectedDifficulty !== difficulty) {
      setDifficulty(selectedDifficulty);
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

    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[activeRowIndex + 1].words.map(l => l.char).join("");

    const relevantStep = solution?.find(s =>
      s.stepIndex === activeRowIndex &&
      s.sourceWord === currentSourceWord &&
      s.targetWord === currentTargetWord
    );

    if (relevantStep) {
      setHintsUsed(prev => prev + 1);
      // Educational hint: show which letter and what word it helps form
      setMessage(
        `Move '${relevantStep.letterToMove}' — think "${relevantStep.targetWord}"!`
      );
    } else {
      setMessage("Not quite right — try undoing your last move!");
    }
  }, [gameState, isProcessing, rows, activeRowIndex, solution]);

  const handleSlotPress = useCallback(async (targetIndex: number): Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
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

    setHistory(prev => [...prev, { rows: JSON.parse(JSON.stringify(rows)), activeRowIndex }]);

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
      setIsProcessing(false);
      // Return completion info - caller handles persistence & victory state
      return { completed: true, hintsUsed, invalidAttempts };
    } else {
      setActiveRowIndex(prev => prev + 1);
      const messages = [
        "Delicious!",
        "Tasty move!",
        "Sweet!",
        "Yummy!",
        "Perfect!",
        "Brilliant!",
      ];
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }

    setIsProcessing(false);
    return null;
  }, [selectedLetter, gameState, rows, activeRowIndex, currentWordLength, shakeError, checkValidation, hintsUsed, invalidAttempts]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRows(lastState.rows);
    setActiveRowIndex(lastState.activeRowIndex);
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setMessage("Let's try again!");
  }, [history]);

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
  };

  return [state, actions];
}
