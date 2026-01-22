
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';

// Simple ID generator (React Native compatible)
let idCounter = 0;
const generateId = () => `id_${Date.now()}_${idCounter++}`;
import { RowData, Letter, GameState, MoveHistory, PuzzleSolutionStep, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { generateLocalPuzzle, validateWord } from './src/services/localGenerator';
import { FALLBACK_PUZZLE, FALLBACK_PUZZLE_HARD, COMMON_WORDS } from './src/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
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

  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));

  useEffect(() => {
    startNewGame('MEDIUM');
  }, []);

  const initGame = (
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
  };

  const startNewGame = async (selectedDifficulty: Difficulty = difficulty) => {
    setGameState(GameState.LOADING);
    setMessage("Mixing up words...");
    setError(null);
    setShowDifficultyMenu(false);
    if (selectedDifficulty !== difficulty) {
      setDifficulty(selectedDifficulty);
    }

    try {
      // Short delay for UI feedback
      await new Promise(r => setTimeout(r, 300));

      // Wrap generation in a timeout for mobile devices
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
      // Use fallback puzzles immediately
      if (selectedDifficulty === 'HARD') {
        initGame(FALLBACK_PUZZLE_HARD, "Challenge Mode", undefined, 5);
      } else if (selectedDifficulty === 'EASY') {
        initGame(FALLBACK_PUZZLE.slice(0, 3), "Simple Start", undefined, 4);
      } else {
        initGame(FALLBACK_PUZZLE, "Classic Setup", undefined, 4);
      }
    }
  };

  const handleLetterPress = (letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError("Locked letter!");
      return;
    }

    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    } else {
      setSelectedLetter(letter);
      setError(null);
    }
  };

  const shakeError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 1500);
  };

  const checkValidation = (word: string): boolean => {
    return validWordsCache.current.has(word.toUpperCase());
  };

  const handleHint = () => {
    if (gameState !== GameState.PLAYING || isProcessing) return;

    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[activeRowIndex + 1].words.map(l => l.char).join("");

    const relevantStep = solution?.find(s =>
      s.stepIndex === activeRowIndex &&
      s.sourceWord === currentSourceWord &&
      s.targetWord === currentTargetWord
    );

    if (relevantStep) {
      setMessage(`Try moving: ${relevantStep.letterToMove}`);
    } else {
      setMessage("Try undoing previous moves.");
    }
  };

  const handleSlotPress = async (targetIndex: number) => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return;

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
      shakeError(`Source needs ${expectedSourceLength} letters`);
      setIsProcessing(false);
      return;
    }

    if (targetWordStr.length !== expectedTargetLength) {
      shakeError(`Target needs ${expectedTargetLength} letters`);
      setIsProcessing(false);
      return;
    }

    const isSourceValid = checkValidation(sourceWordStr);
    if (!isSourceValid) {
      shakeError(`"${sourceWordStr}" is not a word!`);
      setIsProcessing(false);
      return;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(`"${targetWordStr}" is not a word!`);
      setIsProcessing(false);
      return;
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
      setMessage("Sweet Victory!");
      setGameState(GameState.WON);
    } else {
      setActiveRowIndex(prev => prev + 1);
      setMessage("Tasty! Keep going.");
    }

    setIsProcessing(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRows(lastState.rows);
    setActiveRowIndex(lastState.activeRowIndex);
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setMessage("Oops! Let's try that again.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />

      {/* Background gradient simulation */}
      <View style={styles.backgroundGradient} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>WORD</Text>
          <Text style={styles.titleAccent}>SHIFT</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setShowRules(true)}
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.difficultyButton}
          onPress={() => setShowDifficultyMenu(!showDifficultyMenu)}
        >
          <View style={styles.difficultyDot} />
          <Text style={styles.difficultyText}>{difficulty}</Text>
          <Text style={styles.difficultyArrow}>▼</Text>
        </TouchableOpacity>

        {showDifficultyMenu && (
          <View style={styles.difficultyMenu}>
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.difficultyMenuItem,
                  difficulty === d && styles.difficultyMenuItemActive,
                ]}
                onPress={() => startNewGame(d)}
              >
                <Text
                  style={[
                    styles.difficultyMenuText,
                    difficulty === d && styles.difficultyMenuTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Toast Message */}
      <View style={styles.toastContainer}>
        <View style={[styles.toast, error ? styles.toastError : styles.toastNormal]}>
          <Text style={[styles.toastText, error ? styles.toastTextError : null]}>
            {error || message}
          </Text>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {(gameState === GameState.LOADING || isProcessing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#EC4899" />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.rowsContainer}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, idx) => (
            <Row
              key={row.id}
              rowData={row}
              rowIndex={idx}
              activeRowIndex={activeRowIndex}
              selectedLetter={selectedLetter}
              onLetterPress={handleLetterPress}
              onSlotPress={handleSlotPress}
              isProcessing={isProcessing}
            />
          ))}
        </ScrollView>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <ActionButton
          icon="↩"
          label="UNDO"
          color="#FBBF24"
          borderColor="#D97706"
          onPress={handleUndo}
          disabled={history.length === 0 || gameState === GameState.WON}
        />
        <ActionButton
          icon="💡"
          label="HINT"
          color="#38BDF8"
          borderColor="#0284C7"
          onPress={handleHint}
          disabled={gameState !== GameState.PLAYING}
        />
        <ActionButton
          icon="🔄"
          label="RESET"
          color="#F87171"
          borderColor="#DC2626"
          onPress={() => startNewGame()}
          disabled={false}
        />
      </View>

      {/* Rules Modal */}
      <Modal visible={showRules} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRules(false)}
        >
          <View style={styles.rulesModal} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRules(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.rulesTitle}>HOW TO PLAY</Text>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: '#FCE7F3' }]}>
                <Text style={[styles.ruleNumberText, { color: '#EC4899' }]}>1</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Pick a Letter</Text>
                <Text style={styles.ruleDesc}>Tap a candy tile in the bright active row.</Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[styles.ruleNumberText, { color: '#0EA5E9' }]}>2</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Drop it Down</Text>
                <Text style={styles.ruleDesc}>Tap a slot below to move it.</Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.ruleNumberText, { color: '#F59E0B' }]}>3</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Make Words</Text>
                <Text style={styles.ruleDesc}>Both words created must be valid!</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setShowRules(false)}
            >
              <Text style={styles.gotItButtonText}>GOT IT!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Victory Modal */}
      <Modal visible={gameState === GameState.WON} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.victoryModal}>
            <Text style={styles.victoryEmoji}>🧁</Text>
            <Text style={styles.victoryTitle}>DELICIOUS!</Text>
            <Text style={styles.victorySubtitle}>Puzzle Completed</Text>
            <TouchableOpacity
              style={styles.nextLevelButton}
              onPress={() => startNewGame()}
            >
              <Text style={styles.nextLevelButtonText}>NEXT LEVEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Action Button Component
const ActionButton: React.FC<{
  icon: string;
  label: string;
  color: string;
  borderColor: string;
  onPress: () => void;
  disabled: boolean;
}> = ({ icon, label, color, borderColor, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={[styles.actionButtonIcon, { backgroundColor: color, borderBottomColor: borderColor }]}>
      <Text style={styles.actionButtonIconText}>{icon}</Text>
    </View>
    <Text style={styles.actionButtonLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F5',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF0F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 100,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  titleAccent: {
    fontSize: 28,
    fontWeight: '900',
    color: '#EC4899',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EC4899',
  },

  // Difficulty selector
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9333EA',
    marginRight: 4,
  },
  difficultyArrow: {
    fontSize: 8,
    color: '#9333EA',
    opacity: 0.5,
  },
  difficultyMenu: {
    position: 'absolute',
    right: 20,
    top: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 200,
  },
  difficultyMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  difficultyMenuItemActive: {
    backgroundColor: '#F3E8FF',
  },
  difficultyMenuText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  difficultyMenuTextActive: {
    color: '#9333EA',
  },

  // Toast
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  toast: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastNormal: {
    backgroundColor: '#FFFFFF',
  },
  toastError: {
    backgroundColor: '#F87171',
    transform: [{ rotate: '1deg' }],
  },
  toastText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9333EA',
  },
  toastTextError: {
    color: '#FFFFFF',
  },

  // Game area
  gameArea: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  rowsContainer: {
    paddingVertical: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderRadius: 24,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonIconText: {
    fontSize: 28,
  },
  actionButtonLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(88, 28, 135, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Rules modal
  rulesModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  rulesTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#9333EA',
    textAlign: 'center',
    marginBottom: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ruleNumber: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ruleNumberText: {
    fontSize: 18,
    fontWeight: '900',
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  gotItButton: {
    backgroundColor: '#9333EA',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Victory modal
  victoryModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    borderWidth: 4,
    borderColor: '#FCE7F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  victoryEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EC4899',
    marginBottom: 8,
  },
  victorySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 24,
  },
  nextLevelButton: {
    backgroundColor: '#EC4899',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderBottomWidth: 4,
    borderBottomColor: '#9333EA',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextLevelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
