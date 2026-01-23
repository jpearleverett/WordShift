import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';

// Simple ID generator (React Native compatible)
let idCounter = 0;
const generateId = () => `id_${Date.now()}_${idCounter++}`;
import { RowData, Letter, GameState, MoveHistory, PuzzleSolutionStep, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti } from './src/components/Confetti';
import { HomeScreen } from './src/components/home';
import { CandyColors } from './src/theme/colors';
import { generateLocalPuzzle } from './src/services/localGenerator';
import { FALLBACK_PUZZLE, FALLBACK_PUZZLE_HARD, COMMON_WORDS } from './src/constants';
import {
  calculateStars,
  recordPuzzleCompletion,
  getCumulativeStats,
  CumulativeStats,
} from './src/services/starRating';
import {
  awardPuzzleAmber,
  getAmberBalance,
  getCurrentPhase,
  getStreakInfo,
} from './src/services/amberCurrency';
import { AMBER_REWARDS, DialoguePhase, calculateStreakMultiplier } from './src/types/homeWorld';

// App screen type
type AppScreen = 'home' | 'puzzle';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animated Action Button Component
const ActionButton: React.FC<{
  icon: string;
  label: string;
  colors: { bg: string; border: string; glow: string };
  onPress: () => void;
  disabled: boolean;
}> = ({ icon, label, colors, onPress, disabled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
    return () => glowAnim.stopAnimation();
  }, [disabled]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.actionButton,
          disabled && styles.actionButtonDisabled,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Glow effect */}
        {!disabled && (
          <Animated.View
            style={[
              styles.actionButtonGlow,
              { backgroundColor: colors.glow, opacity: glowOpacity },
            ]}
          />
        )}

        {/* Button body */}
        <View
          style={[
            styles.actionButtonIcon,
            { backgroundColor: colors.bg },
          ]}
        >
          {/* Top bevel */}
          <View style={styles.actionButtonBevel} />

          {/* Icon */}
          <Text style={styles.actionButtonIconText}>{icon}</Text>
        </View>

        {/* 3D edge */}
        <View
          style={[
            styles.actionButtonEdge,
            { backgroundColor: colors.border },
          ]}
        />

        {/* Label */}
        <Text style={styles.actionButtonLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Animated Logo Component
const AnimatedLogo: React.FC = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Very subtle rotation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  return (
    <Animated.View
      style={[
        styles.logoContainer,
        {
          transform: [
            { translateY: bounceAnim },
            { rotate },
          ],
        },
      ]}
    >
      <View style={styles.logoInner}>
        <Text style={styles.logoWord}>WORD</Text>
        <Text style={styles.logoShift}>SHIFT</Text>
      </View>
      {/* Sparkle decorations */}
      <View style={[styles.logoSparkle, styles.logoSparkle1]} />
      <View style={[styles.logoSparkle, styles.logoSparkle2]} />
      <View style={[styles.logoSparkle, styles.logoSparkle3]} />
    </Animated.View>
  );
};

// Streak Counter Component
const StreakCounter: React.FC<{ streak: number; level: number }> = ({ streak, level }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streak]);

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>LEVEL</Text>
        <View style={styles.statValueContainer}>
          <Text style={styles.statValue}>{level}</Text>
        </View>
      </View>
      <Animated.View style={[styles.statBox, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.statLabel}>STREAK</Text>
        <View style={[styles.statValueContainer, styles.streakContainer]}>
          <Text style={styles.statValue}>{streak}</Text>
          {streak >= 3 && <Text style={styles.fireEmoji}>🔥</Text>}
        </View>
      </Animated.View>
    </View>
  );
};

// Toast Message Component
const Toast: React.FC<{ message: string; isError: boolean }> = ({ message, isError }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(-20);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (isError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [message, isError]);

  return (
    <Animated.View
      style={[
        styles.toast,
        isError ? styles.toastError : styles.toastNormal,
        {
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.toastShine} />
      <Text style={[styles.toastText, isError && styles.toastTextError]}>
        {message}
      </Text>
    </Animated.View>
  );
};

export default function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');

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
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);

  // Star rating tracking
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats | null>(null);

  // Amber currency tracking
  const [amberEarned, setAmberEarned] = useState(0);
  const [amberBalance, setAmberBalance] = useState(0);
  const [phaseChanged, setPhaseChanged] = useState(false);
  const [newPhase, setNewPhase] = useState<DialoguePhase>(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));

  useEffect(() => {
    // Load cumulative stats and amber balance
    getCumulativeStats().then(setCumulativeStats);
    getAmberBalance().then(setAmberBalance);
    getCurrentPhase().then(setNewPhase);
  }, []);

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = () => {
    setCurrentScreen('puzzle');
    startNewGame(difficulty);
  };

  // Return to home screen
  const handleGoHome = () => {
    setCurrentScreen('home');
    setGameState(GameState.IDLE);
    setShowConfetti(false);
  };

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
    // Reset star rating tracking for new puzzle
    setInvalidAttempts(0);
    setHintsUsed(0);
    setEarnedStars(0);
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
      await new Promise(r => setTimeout(r, 300));

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
  };

  const handleLetterPress = (letter: Letter, rowIndex: number) => {
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
  };

  const shakeError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 2000);
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
      setHintsUsed(prev => prev + 1);
      setMessage(`Try the letter: ${relevantStep.letterToMove}`);
    } else {
      setMessage("Hmm, try undoing a move!");
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
      shakeError(`Need ${expectedSourceLength} letters!`);
      setIsProcessing(false);
      return;
    }

    if (targetWordStr.length !== expectedTargetLength) {
      shakeError(`Need ${expectedTargetLength} letters!`);
      setIsProcessing(false);
      return;
    }

    const isSourceValid = checkValidation(sourceWordStr);
    if (!isSourceValid) {
      shakeError(`"${sourceWordStr}" isn't a word!`);
      setStreak(0);
      setInvalidAttempts(prev => prev + 1);
      setIsProcessing(false);
      return;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(`"${targetWordStr}" isn't a word!`);
      setStreak(0);
      setInvalidAttempts(prev => prev + 1);
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
    setStreak(prev => prev + 1);

    const maxMoves = rows.length - 1;
    if (activeRowIndex === maxMoves - 1) {
      // Calculate stars and record completion
      const stars = calculateStars(hintsUsed, invalidAttempts);
      setEarnedStars(stars);

      // Record completion and award amber
      Promise.all([
        recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts),
        awardPuzzleAmber(difficulty, stars),
      ]).then(([_, amberResult]) => {
        // Refresh cumulative stats
        getCumulativeStats().then(setCumulativeStats);
        // Update amber display
        setAmberEarned(amberResult.amount);
        setAmberBalance(amberResult.newBalance);
        setPhaseChanged(amberResult.phaseChanged);
        setNewPhase(amberResult.newPhase);
        setStreakBonus(amberResult.streakBonus);
        setCurrentStreak(amberResult.currentStreak);
      });

      setMessage("Sweet Victory!");
      setGameState(GameState.WON);
      setShowConfetti(true);
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
    setMessage("Let's try again!");
    setStreak(prev => Math.max(0, prev - 1));
  };

  const handleNextLevel = () => {
    setShowConfetti(false);
    setLevel(prev => prev + 1);
    setAmberEarned(0);
    setPhaseChanged(false);
    setStreakBonus(0);
    startNewGame();
  };

  const handleReturnHome = () => {
    setShowConfetti(false);
    setAmberEarned(0);
    setPhaseChanged(false);
    setStreakBonus(0);
    setCurrentScreen('home');
    setGameState(GameState.IDLE);
  };

  // Render home screen
  if (currentScreen === 'home') {
    return (
      <>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <HomeScreen
          onPlayPuzzle={handlePlayPuzzle}
          onAmberChange={setAmberBalance}
        />
      </>
    );
  }

  // Render puzzle screen
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Animated Background */}
      <AnimatedBackground />

      {/* Confetti celebration */}
      <Confetti active={showConfetti} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerHomeButton}
          onPress={handleGoHome}
        >
          <Text style={styles.headerHomeText}>🏠</Text>
        </TouchableOpacity>

        <AnimatedLogo />

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowRules(true)}
        >
          <View style={styles.helpButtonShine} />
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StreakCounter streak={streak} level={level} />

        <TouchableOpacity
          style={styles.difficultyButton}
          onPress={() => setShowDifficultyMenu(!showDifficultyMenu)}
        >
          <View style={styles.difficultyButtonShine} />
          <View style={[
            styles.difficultyDot,
            difficulty === 'EASY' && styles.difficultyDotEasy,
            difficulty === 'MEDIUM' && styles.difficultyDotMedium,
            difficulty === 'HARD' && styles.difficultyDotHard,
          ]} />
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
                <View style={[
                  styles.difficultyMenuDot,
                  d === 'EASY' && styles.difficultyDotEasy,
                  d === 'MEDIUM' && styles.difficultyDotMedium,
                  d === 'HARD' && styles.difficultyDotHard,
                ]} />
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
        <Toast message={error || message} isError={!!error} />
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {(gameState === GameState.LOADING || isProcessing) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={CandyColors.pink.main} />
              <Text style={styles.loadingText}>Mixing words...</Text>
            </View>
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
          colors={{
            bg: CandyColors.yellow.main,
            border: CandyColors.yellow.shadow,
            glow: CandyColors.yellow.glow,
          }}
          onPress={handleUndo}
          disabled={history.length === 0 || gameState === GameState.WON}
        />
        <ActionButton
          icon="💡"
          label="HINT"
          colors={{
            bg: CandyColors.blue.main,
            border: CandyColors.blue.shadow,
            glow: CandyColors.blue.glow,
          }}
          onPress={handleHint}
          disabled={gameState !== GameState.PLAYING}
        />
        <ActionButton
          icon="🔄"
          label="NEW"
          colors={{
            bg: CandyColors.green.main,
            border: CandyColors.green.shadow,
            glow: CandyColors.green.glow,
          }}
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
            {/* Modal shine */}
            <View style={styles.modalShine} />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRules(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.rulesTitle}>HOW TO PLAY</Text>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: CandyColors.pink.light }]}>
                <Text style={[styles.ruleNumberText, { color: CandyColors.pink.dark }]}>1</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Pick a Letter</Text>
                <Text style={styles.ruleDesc}>Tap any colorful tile in the active row.</Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: CandyColors.blue.light }]}>
                <Text style={[styles.ruleNumberText, { color: CandyColors.blue.dark }]}>2</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Drop it Down</Text>
                <Text style={styles.ruleDesc}>Tap a + slot to place your letter.</Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: CandyColors.yellow.light }]}>
                <Text style={[styles.ruleNumberText, { color: CandyColors.yellow.shadow }]}>3</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Make Real Words</Text>
                <Text style={styles.ruleDesc}>Both words must be valid English!</Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleNumber, { backgroundColor: CandyColors.green.light }]}>
                <Text style={[styles.ruleNumberText, { color: CandyColors.green.dark }]}>4</Text>
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleHeading}>Complete All Rows</Text>
                <Text style={styles.ruleDesc}>Work through every row to win!</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setShowRules(false)}
            >
              <View style={styles.buttonShine} />
              <Text style={styles.gotItButtonText}>LET'S PLAY!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Victory Modal */}
      <Modal visible={gameState === GameState.WON} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.victoryModal}>
            {/* Decorative elements */}
            <View style={styles.victoryGlow} />
            <View style={styles.modalShine} />

            {/* Stars - show earned vs empty */}
            <View style={styles.starsContainer}>
              <Text style={[styles.victoryStar, earnedStars < 1 && styles.victoryStarEmpty]}>
                {earnedStars >= 1 ? '⭐' : '☆'}
              </Text>
              <Text style={[styles.victoryStar, styles.victoryStarBig, earnedStars < 2 && styles.victoryStarEmpty]}>
                {earnedStars >= 2 ? '⭐' : '☆'}
              </Text>
              <Text style={[styles.victoryStar, earnedStars < 3 && styles.victoryStarEmpty]}>
                {earnedStars >= 3 ? '⭐' : '☆'}
              </Text>
            </View>

            <Text style={styles.victoryTitle}>
              {earnedStars === 3 ? 'PERFECT!' : earnedStars === 2 ? 'SWEET!' : 'NICE!'}
            </Text>
            <Text style={styles.victorySubtitle}>Level {level} Complete</Text>

            {/* Amber earned */}
            <View style={styles.amberEarnedContainer}>
              <Text style={styles.amberEarnedIcon}>💎</Text>
              <Text style={styles.amberEarnedText}>+{amberEarned} Amber</Text>
              {streakBonus > 0 && (
                <Text style={styles.streakBonusText}>
                  (+{streakBonus} streak bonus!)
                </Text>
              )}
            </View>

            {/* Streak display */}
            {currentStreak > 1 && (
              <View style={styles.winStreakContainer}>
                <Text style={styles.winStreakEmoji}>🔥</Text>
                <Text style={styles.winStreakText}>{currentStreak} Day Streak!</Text>
              </View>
            )}

            {/* Phase change notification */}
            {phaseChanged && (
              <View style={styles.phaseChangeContainer}>
                <Text style={styles.phaseChangeText}>
                  Your friends have new things to say...
                </Text>
              </View>
            )}

            {/* Performance feedback */}
            <Text style={styles.victoryFeedback}>
              {earnedStars === 3
                ? 'No hints, minimal mistakes!'
                : earnedStars === 2
                ? hintsUsed > 0
                  ? `Used ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}`
                  : `${invalidAttempts} wrong attempt${invalidAttempts > 1 ? 's' : ''}`
                : `${hintsUsed} hint${hintsUsed !== 1 ? 's' : ''}, ${invalidAttempts} mistake${invalidAttempts !== 1 ? 's' : ''}`}
            </Text>

            <View style={styles.victoryStats}>
              <View style={styles.victoryStatItem}>
                <Text style={styles.victoryStatValue}>{streak}</Text>
                <Text style={styles.victoryStatLabel}>Streak</Text>
              </View>
              <View style={styles.victoryStatDivider} />
              <View style={styles.victoryStatItem}>
                <Text style={styles.victoryStatValue}>💎 {amberBalance}</Text>
                <Text style={styles.victoryStatLabel}>Total Amber</Text>
              </View>
            </View>

            {/* Cumulative stats */}
            {cumulativeStats && (
              <View style={styles.cumulativeStats}>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{cumulativeStats.totalStars}</Text>
                  <Text style={styles.cumulativeStatLabel}>Total Stars</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{cumulativeStats.threeStarCount}</Text>
                  <Text style={styles.cumulativeStatLabel}>Perfect</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{cumulativeStats.totalPuzzlesCompleted}</Text>
                  <Text style={styles.cumulativeStatLabel}>Puzzles</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.victoryButtonRow}>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleReturnHome}
              >
                <Text style={styles.homeButtonText}>🏠 HOME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextLevelButton}
                onPress={handleNextLevel}
              >
                <View style={styles.buttonShine} />
                <Text style={styles.nextLevelButtonText}>NEXT LEVEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CandyColors.purple.main,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
    zIndex: 100,
  },
  logoContainer: {
    position: 'relative',
  },
  logoInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWord: {
    fontSize: 32,
    fontWeight: '900',
    color: CandyColors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoShift: {
    fontSize: 32,
    fontWeight: '900',
    color: CandyColors.yellow.main,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoSparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: CandyColors.white,
    borderRadius: 4,
  },
  logoSparkle1: {
    top: -5,
    left: 20,
  },
  logoSparkle2: {
    top: 5,
    right: -10,
  },
  logoSparkle3: {
    bottom: -3,
    left: 60,
  },
  headerHomeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerHomeText: {
    fontSize: 20,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  helpButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  helpButtonText: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.white,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: CandyColors.white,
  },
  fireEmoji: {
    fontSize: 14,
    marginLeft: 4,
  },

  // Difficulty selector
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  difficultyButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  difficultyDotEasy: {
    backgroundColor: CandyColors.green.main,
  },
  difficultyDotMedium: {
    backgroundColor: CandyColors.yellow.main,
  },
  difficultyDotHard: {
    backgroundColor: CandyColors.red.main,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.white,
    marginRight: 6,
  },
  difficultyArrow: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  difficultyMenu: {
    position: 'absolute',
    right: 20,
    top: 52,
    backgroundColor: CandyColors.white,
    borderRadius: 16,
    padding: 8,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 200,
  },
  difficultyMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  difficultyMenuItemActive: {
    backgroundColor: CandyColors.purple.light + '30',
  },
  difficultyMenuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  difficultyMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.gray[600],
  },
  difficultyMenuTextActive: {
    color: CandyColors.purple.main,
  },

  // Toast
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 50,
  },
  toast: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toastNormal: {
    backgroundColor: CandyColors.white,
    shadowColor: CandyColors.purple.main,
  },
  toastError: {
    backgroundColor: CandyColors.red.main,
    shadowColor: CandyColors.red.dark,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  toastTextError: {
    color: CandyColors.white,
  },

  // Game area
  gameArea: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  rowsContainer: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderRadius: 24,
  },
  loadingBox: {
    backgroundColor: CandyColors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.purple.main,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    position: 'relative',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: 20,
    borderRadius: 20,
  },
  actionButtonIcon: {
    width: 64,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  actionButtonEdge: {
    position: 'absolute',
    bottom: 16,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    zIndex: -1,
  },
  actionButtonIconText: {
    fontSize: 28,
  },
  actionButtonLabel: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(76, 29, 149, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  // Rules modal
  rulesModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 32,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CandyColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: CandyColors.gray[400],
    fontWeight: '700',
  },
  rulesTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  ruleNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ruleNumberText: {
    fontSize: 20,
    fontWeight: '900',
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.gray[700],
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 13,
    color: CandyColors.gray[500],
  },
  gotItButton: {
    backgroundColor: CandyColors.purple.main,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  gotItButtonText: {
    color: CandyColors.white,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },

  // Victory modal
  victoryModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
  },
  victoryGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 200,
    backgroundColor: CandyColors.yellow.light,
    opacity: 0.3,
    borderRadius: 100,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  victoryStar: {
    fontSize: 36,
    marginHorizontal: 4,
  },
  victoryStarBig: {
    fontSize: 52,
    marginBottom: 4,
  },
  victoryStarEmpty: {
    opacity: 0.3,
  },
  victoryTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: CandyColors.pink.main,
    marginBottom: 8,
    textShadowColor: CandyColors.pink.shadow,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  victorySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.gray[500],
    marginBottom: 4,
  },
  victoryFeedback: {
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginBottom: 16,
  },
  victoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  victoryStatItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  victoryStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: CandyColors.purple.main,
  },
  victoryStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.gray[400],
    letterSpacing: 1,
    marginTop: 2,
  },
  victoryStatDivider: {
    width: 2,
    height: 40,
    backgroundColor: CandyColors.gray[200],
    borderRadius: 1,
  },
  cumulativeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CandyColors.gray[200],
  },
  cumulativeStatItem: {
    alignItems: 'center',
  },
  cumulativeStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  cumulativeStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginTop: 2,
  },
  nextLevelButton: {
    backgroundColor: CandyColors.pink.main,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    overflow: 'hidden',
    shadowColor: CandyColors.pink.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextLevelButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Amber earned display
  amberEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.yellow.light,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  amberEarnedIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  amberEarnedText: {
    fontSize: 18,
    fontWeight: '900',
    color: CandyColors.yellow.shadow,
  },
  streakBonusText: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.orange.main,
    marginLeft: 8,
  },

  // Win screen streak display
  winStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.orange.light,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  winStreakEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  winStreakText: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.orange.dark,
  },

  // Phase change notification
  phaseChangeContainer: {
    backgroundColor: CandyColors.purple.light + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  phaseChangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.purple.main,
    fontStyle: 'italic',
  },

  // Victory button row
  victoryButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  homeButton: {
    backgroundColor: CandyColors.gray[200],
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  homeButtonText: {
    color: CandyColors.gray[600],
    fontSize: 16,
    fontWeight: '800',
  },
});
