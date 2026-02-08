import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { GameState, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti } from './src/components/Confetti';
import { ActionButton, AnimatedLogo, Toast, LevelDisplay } from './src/components/puzzle';
import { HomeScreen } from './src/components/home';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CandyColors } from './src/theme/colors';
import { usePuzzleGame } from './src/hooks/usePuzzleGame';
import { useGamePersistence, VictoryData } from './src/hooks/useGamePersistence';
import { logEvent } from './src/services/eventLogger';

// App screen type
type AppScreen = 'home' | 'puzzle';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');

  // Custom hooks - game logic & persistence separated from UI
  const [puzzle, puzzleActions] = usePuzzleGame();
  const [persistence, persistenceActions] = useGamePersistence();

  // Victory display state
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = () => {
    setCurrentScreen('puzzle');
    puzzleActions.startNewGame(puzzle.difficulty);
    logEvent({ type: 'puzzle_started', data: { difficulty: puzzle.difficulty } });
  };

  // Return to home screen
  const handleGoHome = () => {
    setCurrentScreen('home');
    puzzleActions.setGameState(GameState.IDLE);
    puzzleActions.setShowConfetti(false);
  };

  const handleSlotPress = async (targetIndex: number) => {
    const result = await puzzleActions.handleSlotPress(targetIndex);

    if (result?.completed) {
      // Puzzle completed — record persistence and show victory
      const victory = await persistenceActions.recordVictory(
        puzzle.difficulty,
        result.hintsUsed,
        result.invalidAttempts
      );

      puzzleActions.setEarnedStars(victory.earnedStars);
      setVictoryData(victory);

      puzzleActions.setMessage("Sweet Victory!");
      puzzleActions.setGameState(GameState.WON);
      puzzleActions.setShowConfetti(true);
    }
  };

  const handleNextLevel = () => {
    puzzleActions.setShowConfetti(false);
    setVictoryData(null);
    puzzleActions.handleNextLevel();
  };

  const handleReturnHome = () => {
    puzzleActions.setShowConfetti(false);
    setVictoryData(null);
    setCurrentScreen('home');
    puzzleActions.setGameState(GameState.IDLE);
  };

  // Render home screen
  if (currentScreen === 'home') {
    return (
      <ErrorBoundary
        fallbackMessage="Something went wrong with the home screen. Tap to try again."
        onReset={() => setCurrentScreen('home')}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <HomeScreen
          onPlayPuzzle={handlePlayPuzzle}
          onAmberChange={persistenceActions.setAmberBalance}
        />
      </ErrorBoundary>
    );
  }

  // Render puzzle screen
  return (
    <ErrorBoundary
      fallbackMessage="Something went wrong with the puzzle. Tap to return home."
      onReset={() => { setCurrentScreen('home'); puzzleActions.setGameState(GameState.IDLE); }}
    >
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Animated Background */}
      <AnimatedBackground />

      {/* Confetti celebration */}
      <Confetti active={puzzle.showConfetti} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerHomeButton}
          onPress={handleGoHome}
          accessibilityLabel="Go home"
          accessibilityRole="button"
        >
          <Text style={styles.headerHomeText}>🏠</Text>
        </TouchableOpacity>

        <AnimatedLogo />

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
        <LevelDisplay level={puzzle.level} />

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
          <Text style={styles.difficultyArrow}>▼</Text>
        </TouchableOpacity>

        {puzzle.showDifficultyMenu && (
          <View style={styles.difficultyMenu}>
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.difficultyMenuItem,
                  puzzle.difficulty === d && styles.difficultyMenuItemActive,
                ]}
                onPress={() => puzzleActions.startNewGame(d)}
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
                    puzzle.difficulty === d && styles.difficultyMenuTextActive,
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
        <Toast message={puzzle.error || puzzle.message} isError={!!puzzle.error} />
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        {(puzzle.gameState === GameState.LOADING || puzzle.isProcessing) && (
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
          {puzzle.rows.map((row, idx) => (
            <Row
              key={row.id}
              rowData={row}
              rowIndex={idx}
              activeRowIndex={puzzle.activeRowIndex}
              selectedLetter={puzzle.selectedLetter}
              onLetterPress={puzzleActions.handleLetterPress}
              onSlotPress={handleSlotPress}
              isProcessing={puzzle.isProcessing}
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
          onPress={puzzleActions.handleUndo}
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
          onPress={puzzleActions.handleHint}
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
          onPress={() => puzzleActions.startNewGame()}
          disabled={false}
        />
      </View>

      {/* Rules Modal */}
      <Modal visible={puzzle.showRules} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => puzzleActions.setShowRules(false)}
        >
          <View style={styles.rulesModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalShine} />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => puzzleActions.setShowRules(false)}
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
              onPress={() => puzzleActions.setShowRules(false)}
            >
              <View style={styles.buttonShine} />
              <Text style={styles.gotItButtonText}>LET'S PLAY!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Victory Modal */}
      <Modal visible={puzzle.gameState === GameState.WON} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.victoryScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <View style={styles.victoryModal}>
            <View style={styles.victoryGlow} />
            <View style={styles.modalShine} />

            {/* Stars */}
            <View style={styles.starsContainer}>
              <Text style={[styles.victoryStar, puzzle.earnedStars < 1 && styles.victoryStarEmpty]}>
                {puzzle.earnedStars >= 1 ? '⭐' : '☆'}
              </Text>
              <Text style={[styles.victoryStar, styles.victoryStarBig, puzzle.earnedStars < 2 && styles.victoryStarEmpty]}>
                {puzzle.earnedStars >= 2 ? '⭐' : '☆'}
              </Text>
              <Text style={[styles.victoryStar, puzzle.earnedStars < 3 && styles.victoryStarEmpty]}>
                {puzzle.earnedStars >= 3 ? '⭐' : '☆'}
              </Text>
            </View>

            <Text style={styles.victoryTitle}>
              {puzzle.earnedStars === 3 ? 'PERFECT!' : puzzle.earnedStars === 2 ? 'SWEET!' : 'NICE!'}
            </Text>
            <Text style={styles.victorySubtitle}>Level {puzzle.level} Complete</Text>

            {/* Amber earned */}
            {victoryData && (
              <View style={styles.amberEarnedContainer}>
                <Text style={styles.amberEarnedIcon}>💎</Text>
                <Text style={styles.amberEarnedText}>+{victoryData.amberEarned} Amber</Text>
                {victoryData.streakBonus > 0 && (
                  <Text style={styles.streakBonusText}>
                    (+{victoryData.streakBonus} streak bonus!)
                  </Text>
                )}
              </View>
            )}

            {/* Streak display */}
            {victoryData && victoryData.currentStreak > 1 && (
              <View style={styles.winStreakContainer}>
                <Text style={styles.winStreakEmoji}>🔥</Text>
                <Text style={styles.winStreakText}>{victoryData.currentStreak} Day Streak!</Text>
              </View>
            )}

            {/* Milestone bonus */}
            {victoryData && victoryData.milestoneBonus > 0 && victoryData.milestoneMessage && (
              <View style={styles.milestoneContainer}>
                <Text style={styles.milestoneEmoji}>🏆</Text>
                <Text style={styles.milestoneMessage}>{victoryData.milestoneMessage}</Text>
                <Text style={styles.milestoneBonus}>+{victoryData.milestoneBonus} Bonus Amber!</Text>
              </View>
            )}

            {/* Phase change notification */}
            {victoryData?.phaseChanged && (
              <View style={styles.phaseChangeContainer}>
                <Text style={styles.phaseChangeEmoji}>
                  {victoryData.newPhase >= 4 ? '🌑' : victoryData.newPhase >= 3 ? '👁️' : victoryData.newPhase >= 2 ? '🌙' : '💭'}
                </Text>
                <Text style={styles.phaseChangeTitle}>
                  {victoryData.newPhase >= 4 ? 'Something has changed...'
                    : victoryData.newPhase >= 3 ? 'A shadow falls...'
                    : victoryData.newPhase >= 2 ? 'The mood shifts...'
                    : 'New conversations await'}
                </Text>
                <Text style={styles.phaseChangeText}>
                  {victoryData.newPhase >= 4 ? 'Your friends seem... different. Visit them at home.'
                    : victoryData.newPhase >= 3 ? 'Your friends have grown restless. Check on them.'
                    : victoryData.newPhase >= 2 ? 'Your friends are asking deeper questions...'
                    : 'Your friends have new things to say!'}
                </Text>
              </View>
            )}

            {/* Performance feedback */}
            <Text style={styles.victoryFeedback}>
              {puzzle.earnedStars === 3
                ? 'No hints, minimal mistakes!'
                : puzzle.earnedStars === 2
                ? puzzle.hintsUsed > 0
                  ? `Used ${puzzle.hintsUsed} hint${puzzle.hintsUsed > 1 ? 's' : ''}`
                  : `${puzzle.invalidAttempts} wrong attempt${puzzle.invalidAttempts > 1 ? 's' : ''}`
                : `${puzzle.hintsUsed} hint${puzzle.hintsUsed !== 1 ? 's' : ''}, ${puzzle.invalidAttempts} mistake${puzzle.invalidAttempts !== 1 ? 's' : ''}`}
            </Text>

            <View style={styles.victoryStats}>
              <View style={styles.victoryStatItem}>
                <Text style={styles.victoryStatValue}>Lv.{puzzle.level}</Text>
                <Text style={styles.victoryStatLabel}>{puzzle.difficulty}</Text>
              </View>
              <View style={styles.victoryStatDivider} />
              <View style={styles.victoryStatItem}>
                <Text style={styles.victoryStatValue}>💎 {persistence.amberBalance}</Text>
                <Text style={styles.victoryStatLabel}>Total Amber</Text>
              </View>
            </View>

            {/* Cumulative stats */}
            {persistence.cumulativeStats && (
              <View style={styles.cumulativeStats}>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{persistence.cumulativeStats.totalStars}</Text>
                  <Text style={styles.cumulativeStatLabel}>Total Stars</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{persistence.cumulativeStats.threeStarCount}</Text>
                  <Text style={styles.cumulativeStatLabel}>Perfect</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={styles.cumulativeStatValue}>{persistence.cumulativeStats.totalPuzzlesCompleted}</Text>
                  <Text style={styles.cumulativeStatLabel}>Puzzles</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.victoryButtonRow}>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleReturnHome}
                accessibilityLabel="Return home"
                accessibilityRole="button"
              >
                <Text style={styles.homeButtonText}>🏠 HOME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextLevelButton}
                onPress={handleNextLevel}
                accessibilityLabel="Next level"
                accessibilityRole="button"
              >
                <View style={styles.buttonShine} />
                <Text style={styles.nextLevelButtonText}>NEXT LEVEL</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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

  victoryScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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

  // Milestone bonus
  milestoneContainer: {
    alignItems: 'center',
    backgroundColor: CandyColors.yellow.light,
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  milestoneEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  milestoneMessage: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.yellow.dark,
    marginBottom: 2,
  },
  milestoneBonus: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.green.dark,
  },

  // Phase change notification
  phaseChangeContainer: {
    backgroundColor: CandyColors.purple.dark,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CandyColors.purple.main,
  },
  phaseChangeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  phaseChangeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
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
