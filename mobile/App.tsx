import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { GameState, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti, StarBurst } from './src/components/Confetti';
import { ActionButton, AnimatedLogo, Toast, LevelDisplay, VictoryModal, RulesModal, DifficultyMenu } from './src/components/puzzle';
import { HomeScreen } from './src/components/home';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CandyColors } from './src/theme/colors';
import { usePuzzleGame } from './src/hooks/usePuzzleGame';
import { useGamePersistence } from './src/hooks/useGamePersistence';
import { useVictoryFlow } from './src/hooks/useVictoryFlow';
import { useAchievementQueue } from './src/hooks/useAchievementQueue';
import { logEvent } from './src/services/eventLogger';
// Feature imports
import { Tutorial, hasTutorialCompleted } from './src/components/Tutorial';
import { SettingsScreen } from './src/components/SettingsScreen';
import { StatsScreen } from './src/components/StatsScreen';
import { AchievementToast } from './src/components/AchievementToast';
import { PhaseTransitionOverlay } from './src/components/PhaseTransitionOverlay';
import { recordDailyCompletion, getTodayString, generateDailyPuzzle } from './src/services/dailyChallenge';
import { sharePuzzleResult } from './src/services/shareResults';
import { getSettingsSync } from './src/services/settings';
import { initAudio, soundVictory, soundPerfect, soundValidMove, soundInvalidMove, soundUndo, soundHint, soundTap } from './src/services/audio';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, hapticSelection } from './src/services/haptics';
import {
  getPhaseIndicator,
  getLoadingMessage,
} from './src/services/phaseNarrative';
import { getPhaseTransitionEvent, PhaseTransitionEvent } from './src/services/phaseEvents';
import { startFrameMonitoring } from './src/services/performanceMonitor';

// App screen type — expanded with settings and stats
type AppScreen = 'home' | 'puzzle' | 'settings' | 'stats';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');

  // Custom hooks - game logic & persistence separated from UI
  const [puzzle, puzzleActions] = usePuzzleGame();
  const [persistence, persistenceActions] = useGamePersistence();
  const [victoryFlow, victoryActions] = useVictoryFlow();
  const [achievementState, achievementActions] = useAchievementQueue();

  // Sync narrative phase from persistence into puzzle hook
  useEffect(() => {
    puzzleActions.setCurrentPhase(persistence.currentPhase);
  }, [persistence.currentPhase]);

  // StarBurst effect state for valid moves
  const [starBurst, setStarBurst] = useState<{ active: boolean; x: number; y: number }>({
    active: false, x: 0, y: 0,
  });

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Daily challenge state
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);

  // Phase transition overlay state
  const [phaseTransitionEvent, setPhaseTransitionEvent] = useState<PhaseTransitionEvent | null>(null);

  // Screen transition animation
  const screenFade = useRef(new Animated.Value(1)).current;

  // Initialize on mount
  useEffect(() => {
    initAudio();
    startFrameMonitoring();
    // Check if tutorial needed
    hasTutorialCompleted().then(completed => {
      if (!completed) {
        setShowTutorial(true);
      }
    });
  }, []);

  // Animated screen transition (instant if reducedMotion)
  const transitionTo = useCallback((screen: AppScreen, callback?: () => void) => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      setCurrentScreen(screen);
      callback?.();
      return;
    }
    Animated.timing(screenFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(screen);
      callback?.();
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [screenFade]);

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = useCallback((difficulty?: Difficulty) => {
    hapticLight();
    soundTap();
    const diff = difficulty || puzzle.difficulty;
    transitionTo('puzzle', () => {
      puzzleActions.startNewGame(diff);
      setIsPlayingDaily(false);
      logEvent({ type: 'puzzle_started', data: { difficulty: diff } });
    });
  }, [puzzle.difficulty, puzzleActions, transitionTo]);

  // Start daily challenge — uses seeded generation for deterministic puzzles
  const handleStartDaily = useCallback(async (difficulty: Difficulty) => {
    hapticMedium();
    soundTap();
    transitionTo('puzzle', async () => {
      setIsPlayingDaily(true);
      puzzleActions.setGameState(GameState.LOADING);
      try {
        const daily = await generateDailyPuzzle();
        puzzleActions.initGame(daily.words, daily.hint);
      } catch (err) {
        console.warn('Daily puzzle generation failed, using random:', err);
        puzzleActions.startNewGame(difficulty);
      }
      logEvent({ type: 'puzzle_started', data: { difficulty, isDaily: true } });
    });
  }, [puzzleActions, transitionTo]);

  // Return to home screen
  const handleGoHome = useCallback(() => {
    hapticLight();
    transitionTo('home', () => {
      puzzleActions.setGameState(GameState.IDLE);
      puzzleActions.setShowConfetti(false);
    });
  }, [puzzleActions, transitionTo]);

  const handleSlotPress = useCallback(async (targetIndex: number) => {
    // Block interaction during victory processing
    if (victoryFlow.isProcessingVictory) return;

    const result = await puzzleActions.handleSlotPress(targetIndex);

    if (result?.completed) {
      // Lock interaction during async victory chain
      victoryActions.setProcessingVictory(true);
      hapticSuccess();

      const victory = await persistenceActions.recordVictory(
        puzzle.difficulty,
        result.hintsUsed,
        result.invalidAttempts,
        result.gameMode,
        result.completedWords
      );

      // Record daily challenge completion if applicable
      if (isPlayingDaily) {
        await recordDailyCompletion(
          victory.earnedStars,
          result.hintsUsed,
          result.invalidAttempts
        );
      }

      puzzleActions.setEarnedStars(victory.earnedStars);
      victoryActions.setVictoryData(victory);

      if (victory.earnedStars === 3) {
        soundPerfect();
      } else {
        soundVictory();
      }

      puzzleActions.setGameState(GameState.WON);
      puzzleActions.setShowConfetti(true);
      victoryActions.setProcessingVictory(false);

      // Play choreographed victory sequence
      victoryActions.playVictorySequence(victory.earnedStars);

      // If phase changed, play dramatic flash then show transition overlay
      if (victory.phaseChanged) {
        setTimeout(() => victoryActions.playPhaseChangeFlash(), 800);
        const event = getPhaseTransitionEvent(victory.newPhase as any);
        if (event) {
          setPhaseTransitionEvent(event);
        }
      }

      // Check achievements after brief delay to not block victory display
      setTimeout(() => achievementActions.checkForAchievements(victory), 500);
    } else if (result === null && puzzle.selectedLetter) {
      // Slot press happened but was invalid
      hapticError();
      soundInvalidMove();
    } else if (result === null) {
      // No action
    } else {
      // Valid intermediate move — trigger star burst celebration
      hapticMedium();
      soundValidMove();
      setStarBurst({ active: true, x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.4 });
      setTimeout(() => setStarBurst({ active: false, x: 0, y: 0 }), 600);
    }
  }, [puzzleActions, puzzle.difficulty, puzzle.selectedLetter, persistenceActions, isPlayingDaily, victoryFlow.isProcessingVictory, victoryActions, achievementActions]);

  const handleLetterPress = useCallback((letter: any, rowIndex: number) => {
    hapticLight();
    soundTap();
    puzzleActions.handleLetterPress(letter, rowIndex);
  }, [puzzleActions]);

  const handleUndo = useCallback(() => {
    hapticLight();
    soundUndo();
    puzzleActions.handleUndo();
  }, [puzzleActions]);

  const handleHintPress = useCallback(() => {
    hapticSelection();
    soundHint();
    puzzleActions.handleHint();
  }, [puzzleActions]);

  const handleNextLevel = useCallback(() => {
    hapticLight();
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    puzzleActions.handleNextLevel();
  }, [puzzleActions, victoryActions]);

  const handleReturnHome = useCallback(() => {
    hapticLight();
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    transitionTo('home', () => {
      puzzleActions.setGameState(GameState.IDLE);
    });
  }, [puzzleActions, transitionTo, victoryActions]);

  const handleShare = useCallback(async () => {
    if (!victoryFlow.victoryData) return;
    hapticLight();
    const moveCount = puzzle.rows.length - 1;
    await sharePuzzleResult({
      stars: victoryFlow.victoryData.earnedStars,
      difficulty: puzzle.difficulty,
      level: puzzle.level,
      hintsUsed: puzzle.hintsUsed,
      invalidAttempts: puzzle.invalidAttempts,
      isDaily: isPlayingDaily,
      dailyDate: isPlayingDaily ? getTodayString() : undefined,
      moveCount,
    });
  }, [victoryFlow.victoryData, puzzle, isPlayingDaily]);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    hapticLight();
    puzzleActions.startNewGame(d, puzzle.gameMode);
  }, [puzzleActions, puzzle.gameMode]);

  const handleToggleChallengeMode = useCallback(() => {
    hapticMedium();
    const newMode = puzzle.gameMode === 'challenge' ? 'standard' : 'challenge';
    puzzleActions.startNewGame(puzzle.difficulty, newMode);
  }, [puzzleActions, puzzle.gameMode, puzzle.difficulty]);

  // Tutorial overlay
  if (showTutorial) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Tutorial onComplete={() => setShowTutorial(false)} />
      </View>
    );
  }

  // Settings screen
  if (currentScreen === 'settings') {
    return (
      <Animated.View style={{ flex: 1, opacity: screenFade }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <SettingsScreen onClose={() => transitionTo('home')} />
      </Animated.View>
    );
  }

  // Stats screen
  if (currentScreen === 'stats') {
    return (
      <Animated.View style={{ flex: 1, opacity: screenFade }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <StatsScreen
          onClose={() => transitionTo('home')}
          puzzlesSolved={persistence.cumulativeStats?.totalPuzzlesCompleted || 0}
          currentPhase={persistence.currentPhase}
          amberBalance={persistence.amberBalance}
          phase={persistence.currentPhase}
        />
      </Animated.View>
    );
  }

  // Render home screen
  if (currentScreen === 'home') {
    return (
      <ErrorBoundary
        fallbackMessage="Something went wrong with the home screen. Tap to try again."
        onReset={() => setCurrentScreen('home')}
      >
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <HomeScreen
            onPlayPuzzle={handlePlayPuzzle}
            onAmberChange={persistenceActions.setAmberBalance}
            onOpenSettings={() => transitionTo('settings')}
            onOpenStats={() => transitionTo('stats')}
            onStartDaily={handleStartDaily}
          />
          {/* Achievement toast overlay */}
          <AchievementToast
            achievement={achievementState.currentAchievement}
            onDismiss={achievementActions.dismissAchievement}
            phase={persistence.currentPhase}
          />
        </Animated.View>
      </ErrorBoundary>
    );
  }

  // Render puzzle screen
  return (
    <ErrorBoundary
      fallbackMessage="Something went wrong with the puzzle. Tap to return home."
      onReset={() => { setCurrentScreen('home'); puzzleActions.setGameState(GameState.IDLE); }}
    >
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Animated Background — darkens with narrative phase */}
      <AnimatedBackground phase={persistence.currentPhase} />

      {/* Confetti celebration — colors shift with phase */}
      <Confetti active={puzzle.showConfetti} phase={persistence.currentPhase} />

      {/* Star burst effect on valid moves */}
      <StarBurst active={starBurst.active} x={starBurst.x} y={starBurst.y} />

      {/* Phase change dramatic flash overlay */}
      <Animated.View
        style={[styles.phaseFlashOverlay, { opacity: victoryFlow.phaseFlashOpacity }]}
        pointerEvents="none"
      />

      {/* Phase transition narrative overlay */}
      <PhaseTransitionOverlay
        event={phaseTransitionEvent}
        onComplete={() => setPhaseTransitionEvent(null)}
      />

      {/* Achievement toast overlay */}
      <AchievementToast
        achievement={achievementState.currentAchievement}
        onDismiss={achievementActions.dismissAchievement}
        phase={persistence.currentPhase}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerHomeButton}
          onPress={handleGoHome}
          accessibilityLabel="Go home"
          accessibilityRole="button"
        >
          <Text style={styles.headerHomeText}>{'\uD83C\uDFE0'}</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleArea}>
          {isPlayingDaily ? (
            <View style={styles.dailyBadge}>
              <Text style={styles.dailyBadgeText}>DAILY</Text>
            </View>
          ) : (
            <AnimatedLogo />
          )}
          {/* Phase indicator badge */}
          {persistence.currentPhase > 0 && (
            <View style={[
              styles.phaseBadge,
              persistence.currentPhase >= 3 && styles.phaseBadgeDark,
              persistence.currentPhase >= 4 && styles.phaseBadgeVoid,
            ]}>
              <Text style={styles.phaseBadgeIcon}>{getPhaseIndicator(persistence.currentPhase).icon}</Text>
              <Text style={[
                styles.phaseBadgeText,
                persistence.currentPhase >= 3 && styles.phaseBadgeTextDark,
              ]}>{getPhaseIndicator(persistence.currentPhase).label}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => puzzleActions.setShowRules(true)}
          accessibilityLabel="How to play"
          accessibilityRole="button"
        >
          <View style={styles.helpButtonShine} />
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.leftStatsGroup}>
          <LevelDisplay level={puzzle.level} />
          {/* Challenge Mode Badge */}
          {puzzle.gameMode === 'challenge' && (
            <View style={styles.challengeBadge}>
              <Text style={styles.challengeBadgeText}>CHALLENGE</Text>
              {puzzle.undosRemaining < Infinity && (
                <Text style={styles.challengeUndoText}>
                  {puzzle.undosRemaining} undo{puzzle.undosRemaining !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.difficultyButton}
          onPress={() => puzzleActions.setShowDifficultyMenu(!puzzle.showDifficultyMenu)}
          accessibilityLabel={`Difficulty: ${puzzle.difficulty}. Tap to change`}
          accessibilityRole="button"
        >
          <View style={styles.difficultyButtonShine} />
          <View style={[
            styles.difficultyDot,
            puzzle.difficulty === 'EASY' && styles.difficultyDotEasy,
            puzzle.difficulty === 'MEDIUM' && styles.difficultyDotMedium,
            puzzle.difficulty === 'HARD' && styles.difficultyDotHard,
          ]} />
          <Text style={styles.difficultyText}>{puzzle.difficulty}</Text>
          <Text style={styles.difficultyArrow}>{'\u25BC'}</Text>
        </TouchableOpacity>

        <DifficultyMenu
          visible={puzzle.showDifficultyMenu}
          currentDifficulty={puzzle.difficulty}
          gameMode={puzzle.gameMode}
          onSelectDifficulty={handleSelectDifficulty}
          onToggleChallengeMode={handleToggleChallengeMode}
        />
      </View>

      {/* Toast Message */}
      <View style={styles.toastContainer}>
        <Toast message={puzzle.error || puzzle.message} isError={!!puzzle.error} />
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {(puzzle.gameState === GameState.LOADING || puzzle.isProcessing || victoryFlow.isProcessingVictory) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={CandyColors.pink.main} />
              <Text style={styles.loadingText}>
                {getLoadingMessage(persistence.currentPhase)}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.rowsContainer}
          showsVerticalScrollIndicator={false}
          accessibilityRole="list"
          accessibilityLabel={`Puzzle with ${puzzle.rows.length} word rows`}
        >
          {puzzle.rows.map((row, idx) => (
            <Row
              key={row.id}
              rowData={row}
              rowIndex={idx}
              activeRowIndex={puzzle.activeRowIndex}
              selectedLetter={puzzle.selectedLetter}
              onLetterPress={handleLetterPress}
              onSlotPress={handleSlotPress}
              isProcessing={puzzle.isProcessing}
              phase={persistence.currentPhase}
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
          disabled={puzzle.history.length === 0 || puzzle.gameState === GameState.WON}
        />
        <ActionButton
          icon="💡"
          label="HINT"
          colors={{
            bg: CandyColors.blue.main,
            border: CandyColors.blue.shadow,
            glow: CandyColors.blue.glow,
          }}
          onPress={handleHintPress}
          disabled={puzzle.gameState !== GameState.PLAYING}
        />
        <ActionButton
          icon="🔄"
          label="NEW"
          colors={{
            bg: CandyColors.green.main,
            border: CandyColors.green.shadow,
            glow: CandyColors.green.glow,
          }}
          onPress={() => {
            hapticLight();
            puzzleActions.startNewGame();
          }}
          disabled={false}
        />
      </View>

      {/* Rules Modal — phase-aware text */}
      <RulesModal
        visible={puzzle.showRules}
        phase={persistence.currentPhase}
        onClose={() => puzzleActions.setShowRules(false)}
      />

      {/* Victory Modal — extracted component */}
      <VictoryModal
        visible={puzzle.gameState === GameState.WON}
        earnedStars={puzzle.earnedStars}
        level={puzzle.level}
        difficulty={puzzle.difficulty}
        amberBalance={persistence.amberBalance}
        phase={persistence.currentPhase}
        isPlayingDaily={isPlayingDaily}
        victoryData={victoryFlow.victoryData}
        cumulativeStats={persistence.cumulativeStats}
        completedWords={puzzle.lastCompletedWords}
        incantationName={puzzle.lastIncantationName}
        modalScale={victoryFlow.victoryModalScale}
        modalOpacity={victoryFlow.victoryModalOpacity}
        star1Scale={victoryFlow.victoryStar1}
        star2Scale={victoryFlow.victoryStar2}
        star3Scale={victoryFlow.victoryStar3}
        onNextLevel={handleNextLevel}
        onReturnHome={handleReturnHome}
        onShare={handleShare}
      />
    </Animated.View>
    </ErrorBoundary>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
    paddingBottom: 8,
    zIndex: 100,
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
  headerTitleArea: {
    flex: 1,
    alignItems: 'center',
  },
  dailyBadge: {
    backgroundColor: CandyColors.yellow.main,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.gray[800],
    letterSpacing: 2,
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

  // Toast
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 50,
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

  // Challenge mode styles
  leftStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeBadge: {
    backgroundColor: CandyColors.red.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  challengeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
  },
  challengeUndoText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Phase indicator badge
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  phaseBadgeDark: {
    backgroundColor: 'rgba(60, 30, 80, 0.4)',
  },
  phaseBadgeVoid: {
    backgroundColor: 'rgba(20, 10, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(120, 40, 80, 0.4)',
  },
  phaseBadgeIcon: {
    fontSize: 12,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  phaseBadgeTextDark: {
    color: 'rgba(200, 180, 220, 0.9)',
  },

  // Phase change dramatic flash overlay
  phaseFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999,
  },
});
