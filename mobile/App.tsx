import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { GameState, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti, StarBurst } from './src/components/Confetti';
import { ActionButton, AnimatedLogo, Toast, LevelDisplay, VictoryModal, RulesModal, DifficultyMenu, RitualEchoChain } from './src/components/puzzle';
import { HomeScreen } from './src/components/home';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CandyColors } from './src/theme/colors';
import { usePuzzleGame } from './src/hooks/usePuzzleGame';
import { useGamePersistence } from './src/hooks/useGamePersistence';
import { useVictoryFlow } from './src/hooks/useVictoryFlow';
import { useAchievementQueue } from './src/hooks/useAchievementQueue';
import { useSpeedTimer } from './src/hooks/useSpeedTimer';
import { useDreadEffects } from './src/hooks/useDreadEffects';
import { useVictoryOrchestration } from './src/hooks/useVictoryOrchestration';
import { useOnboardingFlow } from './src/hooks/useOnboardingFlow';
import { useAutosave } from './src/hooks/useAutosave';
import { logEvent } from './src/services/eventLogger';
import { SettingsScreen } from './src/components/SettingsScreen';
import { FoxGuide } from './src/components/FoxGuide';
import { ONBOARDING_FOX_LINES } from './src/services/onboarding';
import { awardBonusAmber } from './src/services/amberCurrency';
import { checkDailyStreakMilestone, getDailyStatus } from './src/services/dailyChallenge';
import { updateQuestProgress } from './src/services/weeklyQuests';
import { StatsScreen } from './src/components/StatsScreen';
import { AchievementToast } from './src/components/AchievementToast';
import { PhaseTransitionOverlay } from './src/components/PhaseTransitionOverlay';
import { recordDailyCompletion, getTodayString, generateDailyPuzzle } from './src/services/dailyChallenge';
import { sharePuzzleResult } from './src/services/shareResults';
import { getSettingsSync } from './src/services/settings';
import { initAudio, soundVictory, soundPerfect, soundValidMove, soundInvalidMove, soundUndo, soundHint, soundTap } from './src/services/audio';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError, hapticSelection } from './src/services/haptics';
import {
  getPhaseIndicator,
  getLoadingMessage,
  getRitualMicroEvent,
  getHarvestOverflowMessage,
  getVictoryTitle,
  getSessionNudge,
} from './src/services/phaseNarrative';
import { getPhaseTransitionEvent, PhaseTransitionEvent, FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT } from './src/services/phaseEvents';
import { isHouseCompleted, isFinalPuzzleCompleted, markFinalPuzzleCompleted, isPostRevelation, markPostRevelation } from './src/services/amberCurrency';
import { startFrameMonitoring } from './src/services/performanceMonitor';
import { AnimalWhisper } from './src/components/puzzle/AnimalWhisper';
import { WordLedger } from './src/components/WordLedger';
import { WhisperGalleryScreen } from './src/components/WhisperGalleryScreen';
import { isDreadWord, validateWord } from './src/services/localGenerator';
import { scheduleAllNotifications } from './src/services/notifications';
import { markPendingChanges, uploadToCloud } from './src/services/cloudSave';
import { estimateSlotIndex } from './src/services/slotEstimation';
import { DROP_SHAKE_KEYFRAME_MS, DROP_SHAKE_INTENSITY } from './src/constants/timing';
import { OfferingPitScreen } from './src/components/OfferingPitScreen';
import { loadPuzzleState, clearPuzzleState } from './src/services/puzzleSaveState';
import {
  hasVariantModifier,
  getVariantTimeLimit,
  getVariantTimeLimitForDifficulty,
  getVariantSelectorOptions,
  isVariantUnlocked,
  PuzzleVariant,
  VARIANT_CONFIGS,
} from './src/services/puzzleVariety';
import { appStyles as styles, getScreenBackgroundColor } from './src/styles/appStyles';

// App screen type — expanded with settings, stats, and ledger
type AppScreen = 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery' | 'pit';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  // Daily challenge state
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);

  // Custom hooks - game logic & persistence separated from UI
  const [puzzle, puzzleActions] = usePuzzleGame();
  const [persistence, persistenceActions] = useGamePersistence();
  const [victoryFlow, victoryActions] = useVictoryFlow();
  const [achievementState, achievementActions] = useAchievementQueue();
  const setPuzzleGameState = puzzleActions.setGameState;
  const setPuzzleMessage = puzzleActions.setMessage;
  const setSelectedVariant = puzzleActions.setSelectedVariant;

  const puzzlesSolvedForVariantUnlocks = persistence.cumulativeStats?.totalPuzzlesCompleted ?? 0;
  const variantSelectorOptions = useMemo(() => {
    // uiPhase intentionally matches currentPhase — we use the confirmed phase
    // for text tone stability rather than the pending transition target
    return getVariantSelectorOptions(
      puzzlesSolvedForVariantUnlocks,
      persistence.currentPhase,
      persistence.currentPhase
    );
  }, [puzzlesSolvedForVariantUnlocks, persistence.currentPhase]);

  // Clamp selected variant if progression changed (e.g. after reset/migration).
  useEffect(() => {
    if (!isVariantUnlocked(puzzle.selectedVariant, puzzlesSolvedForVariantUnlocks, persistence.currentPhase)) {
      setSelectedVariant('standard');
    }
  }, [
    puzzle.selectedVariant,
    puzzlesSolvedForVariantUnlocks,
    persistence.currentPhase,
    setSelectedVariant,
  ]);

  // Sync narrative phase from persistence into puzzle hook
  useEffect(() => {
    puzzleActions.setCurrentPhase(persistence.currentPhase);
  }, [persistence.currentPhase, puzzleActions.setCurrentPhase]);

  // StarBurst effect state for valid moves
  const [starBurst, setStarBurst] = useState<{ active: boolean; x: number; y: number }>({
    active: false, x: 0, y: 0,
  });
  const [invalidDropSignal, setInvalidDropSignal] = useState(0);
  const [successDropSignal, setSuccessDropSignal] = useState(0);

  // Track whether the current slot press originated from a drag-drop (for haptic/effect escalation)
  const isDragDropRef = useRef(false);
  // Store drop-shake animation so it can be stopped if a new one starts before it finishes
  const dropShakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // In-progress ritual echo chain — words formed during current puzzle
  const [ritualEchoWords, setRitualEchoWords] = useState<string[]>([]);
  const clearRitualEchoWords = useCallback(() => setRitualEchoWords([]), []);

  // Victory animation skip-forward state
  const victoryAnimatingRef = useRef(false);

  // Track victory-flow setTimeout IDs so they can be cleared on navigation/unmount
  const victoryTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const addVictoryTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    victoryTimeoutsRef.current.push(id);
    return id;
  }, []);
  const clearVictoryTimeouts = useCallback(() => {
    victoryTimeoutsRef.current.forEach(clearTimeout);
    victoryTimeoutsRef.current = [];
  }, []);
  useEffect(() => {
    return () => clearVictoryTimeouts();
  }, [clearVictoryTimeouts]);

  // Home nudge — track consecutive puzzles without visiting home
  const puzzlesSinceHomeVisit = useRef(0);

  // Session engagement nudge — contextual between-puzzle prompt
  const [sessionNudge, setSessionNudge] = useState<{ text: string; target: string } | null>(null);

  // Guard: pit-resume useEffect should only fire on initial mount
  const pitResumeCheckedRef = useRef(false);

  // Phase transition overlay state
  const [phaseTransitionEvent, setPhaseTransitionEvent] = useState<PhaseTransitionEvent | null>(null);

  // Restored speed timer value (consumed once by the speed timer effect)
  const restoredSpeedTimeRef = useRef<number | null>(null);

  // Screen transition overlay — fades in to cover old screen, swaps, fades out to reveal new screen
  const transitionOverlay = useRef(new Animated.Value(0)).current;
  // Dynamic background colors for smooth transitions — match overlay/root to destination screen
  const [transitionOverlayColor, setTransitionOverlayColor] = useState('#1A1A2E');
  const [rootBgColor, setRootBgColor] = useState('#1A1A2E');

  // Animated screen transition (instant if reducedMotion)
  const transitionTo = useCallback((screen: AppScreen, callback?: () => void) => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      const destColor = getScreenBackgroundColor(screen, persistence.currentPhase);
      setTransitionOverlayColor(destColor);
      setRootBgColor(destColor);
      setCurrentScreen(screen);
      callback?.();
      return;
    }
    // Fade overlay IN (covers old screen)
    Animated.timing(transitionOverlay, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // While fully opaque: swap colors to match destination screen
      const destColor = getScreenBackgroundColor(screen, persistence.currentPhase);
      setTransitionOverlayColor(destColor);
      setRootBgColor(destColor);

      setCurrentScreen(screen);
      callback?.();
      // Wait one frame for React to render the new screen before revealing
      requestAnimationFrame(() => {
        // Fade overlay OUT — now blends through destination-matching color
        Animated.timing(transitionOverlay, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    });
  }, [transitionOverlay, persistence.currentPhase]);

  // Keep root background in sync with current screen + phase (handles phase changes without transitions)
  useEffect(() => {
    setRootBgColor(getScreenBackgroundColor(currentScreen, persistence.currentPhase));
  }, [currentScreen, persistence.currentPhase]);

  // ========================================================================
  // Extracted hooks
  // ========================================================================

  // Speed timer for speed-variant puzzles
  const onSpeedTimeUp = useCallback(() => {
    setPuzzleGameState(GameState.GAME_OVER);
    setPuzzleMessage(
      persistence.currentPhase >= 3
        ? 'Time collapsed. The arrangement closed this path.'
        : 'Time is up! Start a new puzzle and try again.'
    );
  }, [setPuzzleGameState, setPuzzleMessage, persistence.currentPhase]);

  const [speedTimer, speedTimerActions] = useSpeedTimer(onSpeedTimeUp);
  const { startSpeedTimer, stopSpeedTimer } = speedTimerActions;

  // Start/stop speed timer based on game state
  useEffect(() => {
    const isSpeedVariant = hasVariantModifier(puzzle.currentVariant, 'speed');
    if (!isSpeedVariant || puzzle.gameState !== GameState.PLAYING) {
      stopSpeedTimer();
      return;
    }
    const limit = getVariantTimeLimitForDifficulty(puzzle.currentVariant, puzzle.difficulty)
      ?? getVariantTimeLimit(puzzle.currentVariant)
      ?? 60;
    const initialRemaining = restoredSpeedTimeRef.current ?? limit;
    restoredSpeedTimeRef.current = null;
    startSpeedTimer(initialRemaining);
  }, [
    puzzle.currentVariant,
    puzzle.gameState,
    puzzle.level,
    puzzle.difficulty,
    startSpeedTimer,
    stopSpeedTimer,
  ]);

  // Dread pulse overlay + screen shake
  const [dreadEffects, dreadActions] = useDreadEffects();

  // Post-victory orchestration: whisper, interjection, glitch, micro-beat
  const [orchestration, orchestrationActions] = useVictoryOrchestration();

  // Onboarding flow state machine
  const onboardingCallbacks = useMemo(() => ({
    transitionTo: transitionTo as (screen: string, callback?: () => void) => void,
    startNewGame: puzzleActions.startNewGame as (difficulty: string) => void,
    setGameState: puzzleActions.setGameState as (state: string) => void,
    setShowConfetti: puzzleActions.setShowConfetti,
    refreshStats: persistenceActions.refreshStats,
    resetVictory: victoryActions.resetVictory,
  }), [transitionTo, puzzleActions.startNewGame, puzzleActions.setGameState, puzzleActions.setShowConfetti, persistenceActions.refreshStats, victoryActions.resetVictory]);

  const [onboardingFlow, onboardingActions] = useOnboardingFlow(onboardingCallbacks, clearRitualEchoWords);

  // Auto-save puzzle state during active play
  useAutosave({
    currentScreen,
    isPlayingDaily,
    rows: puzzle.rows,
    activeRowIndex: puzzle.activeRowIndex,
    selectedLetter: puzzle.selectedLetter,
    gameState: puzzle.gameState,
    message: puzzle.message,
    history: puzzle.history,
    invalidAttempts: puzzle.invalidAttempts,
    hintsUsed: puzzle.hintsUsed,
    undosRemaining: puzzle.undosRemaining,
    difficulty: puzzle.difficulty,
    currentWordLength: puzzle.currentWordLength,
    hint: puzzle.hint,
    solution: puzzle.solution,
    reverseSolution: puzzle.reverseSolution,
    gameMode: puzzle.gameMode,
    currentVariant: puzzle.currentVariant,
    selectedVariant: puzzle.selectedVariant,
    moveDirection: puzzle.moveDirection,
    currentPhase: puzzle.currentPhase,
    lastFormedWord: puzzle.lastFormedWord,
    doubleShiftPhase: puzzle.doubleShiftPhase,
    speedTimeRemaining: speedTimer.speedTimeRemaining,
  });

  // ========================================================================
  // Initialization
  // ========================================================================

  // App-level initialization (non-onboarding)
  useEffect(() => {
    initAudio();
    startFrameMonitoring();
    scheduleAllNotifications(0).catch(() => {});
    uploadToCloud().catch(() => {});
  }, []);

  // Resume pit screen if onboarding was interrupted during pit flow (initial mount only)
  useEffect(() => {
    if (onboardingFlow.onboardingReady && !pitResumeCheckedRef.current) {
      pitResumeCheckedRef.current = true;
      if (
        onboardingFlow.onboardingStep === 'going_to_pit' ||
        onboardingFlow.onboardingStep === 'pit_intro' ||
        onboardingFlow.onboardingStep === 'pit_offering'
      ) {
        setCurrentScreen('pit');
      }
    }
  }, [onboardingFlow.onboardingReady, onboardingFlow.onboardingStep]);

  // Onboarding tutorial guidance: exact source letter + target slot from solver steps.
  const tutorialGuidance = useMemo(() => {
    if (onboardingFlow.onboardingStep !== 'puzzle_tutorial') return null;
    if (puzzle.gameState !== GameState.PLAYING) return null;
    if (!puzzle.solution || puzzle.solution.length === 0) return null;

    const targetRowIndex = puzzle.moveDirection === 'down'
      ? puzzle.activeRowIndex + 1
      : puzzle.activeRowIndex - 1;
    if (targetRowIndex < 0 || targetRowIndex >= puzzle.rows.length) return null;

    const sourceRow = puzzle.rows[puzzle.activeRowIndex];
    const targetRow = puzzle.rows[targetRowIndex];
    if (!sourceRow || !targetRow) return null;

    const relevantStep = puzzle.solution.find(step =>
      step.stepIndex === puzzle.activeRowIndex
      && step.sourceWord === sourceRow.originalWord
      && step.targetWord === targetRow.originalWord
    );
    if (!relevantStep) return null;

    // Find the first letter tile in the source row matching the letter to move
    let sourceLetterId: string | null = null;
    for (let i = 0; i < sourceRow.words.length; i++) {
      if (sourceRow.words[i].char === relevantStep.letterToMove) {
        sourceLetterId = sourceRow.words[i].id;
        break;
      }
    }

    // Find the insertion slot that produces a valid word
    let targetSlotIndex: number | null = null;
    for (let i = 0; i <= targetRow.words.length; i++) {
      const candidate = [
        ...targetRow.words.slice(0, i).map(l => l.char),
        relevantStep.letterToMove,
        ...targetRow.words.slice(i).map(l => l.char),
      ].join('');
      if (validateWord(candidate)) {
        targetSlotIndex = i;
        break;
      }
    }

    return {
      sourceLetterId,
      targetSlotIndex,
      letterToMove: relevantStep.letterToMove,
    };
  }, [
    onboardingFlow.onboardingStep,
    puzzle.gameState,
    puzzle.solution,
    puzzle.moveDirection,
    puzzle.activeRowIndex,
    puzzle.rows,
  ]);

  // ========================================================================
  // Navigation & puzzle lifecycle handlers
  // ========================================================================

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = useCallback((difficulty?: Difficulty) => {
    hapticLight();
    soundTap();
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    const diff = difficulty || puzzle.difficulty;
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    transitionTo('puzzle', async () => {
      // Check for saved in-progress puzzle
      const saved = await loadPuzzleState();
      const today = getTodayString();
      const canRestoreDaily = Boolean(
        saved?.isPlayingDaily && (!saved.dailyDate || saved.dailyDate === today)
      );
      if (saved && saved.gameState === 'PLAYING' && (!saved.isPlayingDaily || canRestoreDaily)) {
        puzzleActions.restorePuzzleState(saved);
        // Restore speed timer from saved expiry timestamp
        if (saved.speedTimerExpireAt != null) {
          const remaining = Math.max(0, Math.floor((saved.speedTimerExpireAt - Date.now()) / 1000));
          restoredSpeedTimeRef.current = remaining;
        }
        setIsPlayingDaily(Boolean(saved.isPlayingDaily && canRestoreDaily));
        logEvent({
          type: 'puzzle_restored',
          data: { difficulty: saved.difficulty, isDaily: Boolean(saved.isPlayingDaily && canRestoreDaily) },
        });
      } else {
        clearPuzzleState().catch(() => {});
        puzzleActions.startNewGame(diff);
        setIsPlayingDaily(false);
        logEvent({ type: 'puzzle_started', data: { difficulty: diff } });
      }
    });
  }, [puzzle.difficulty, puzzleActions, transitionTo, persistenceActions, orchestrationActions]);

  // Start daily challenge — uses seeded generation for deterministic puzzles
  const handleStartDaily = useCallback(async (difficulty: Difficulty) => {
    hapticMedium();
    soundTap();
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    transitionTo('puzzle', async () => {
      const saved = await loadPuzzleState();
      const today = getTodayString();
      const canRestoreDaily = Boolean(
        saved
        && saved.gameState === 'PLAYING'
        && saved.isPlayingDaily
        && (!saved.dailyDate || saved.dailyDate === today)
      );

      if (canRestoreDaily && saved) {
        puzzleActions.restorePuzzleState(saved);
        // Restore speed timer from saved expiry timestamp
        if (saved.speedTimerExpireAt != null) {
          const remaining = Math.max(0, Math.floor((saved.speedTimerExpireAt - Date.now()) / 1000));
          restoredSpeedTimeRef.current = remaining;
        }
        setIsPlayingDaily(true);
        logEvent({ type: 'puzzle_restored', data: { difficulty: saved.difficulty, isDaily: true } });
        return;
      }

      clearPuzzleState().catch(() => {});
      setIsPlayingDaily(true);
      puzzleActions.setGameState(GameState.LOADING);
      try {
        const daily = await generateDailyPuzzle();
        puzzleActions.initGame(daily.words, daily.hint, undefined, daily.wordLength);
      } catch (err) {
        console.warn('Daily puzzle generation failed, using random:', err);
        puzzleActions.startNewGame(difficulty);
      }
      logEvent({ type: 'puzzle_started', data: { difficulty, isDaily: true } });
    });
  }, [puzzleActions, transitionTo, persistenceActions, orchestrationActions]);

  // Return to home screen
  const handleGoHome = useCallback(() => {
    hapticLight();
    puzzlesSinceHomeVisit.current = 0;
    transitionTo('home', () => {
      puzzleActions.setGameState(GameState.IDLE);
      puzzleActions.setShowConfetti(false);
    });
  }, [puzzleActions, transitionTo]);

  const handleSlotPress = useCallback(async (
    targetIndex: number,
    feedbackOrigin?: { x: number; y: number }
  ) => {
    // Block interaction during victory processing
    if (victoryFlow.isProcessingVictory) { isDragDropRef.current = false; return; }
    if (puzzle.gameState === GameState.GAME_OVER) { isDragDropRef.current = false; return; }

    // Onboarding tutorial: keep drops focused on the guided slot.
    if (
      onboardingFlow.onboardingStep === 'puzzle_tutorial' &&
      puzzle.gameState === GameState.PLAYING &&
      puzzle.selectedLetter &&
      tutorialGuidance?.targetSlotIndex !== null &&
      tutorialGuidance?.targetSlotIndex !== undefined &&
      targetIndex !== tutorialGuidance.targetSlotIndex
    ) {
      hapticError();
      soundInvalidMove();
      setInvalidDropSignal(prev => prev + 1);
      puzzleActions.setMessage('Drop it into the glowing slot.');
      isDragDropRef.current = false;
      return;
    }

    const result = await puzzleActions.handleSlotPress(targetIndex);

    if (result?.completed) {
      isDragDropRef.current = false;
      // Clear mid-puzzle save on completion
      clearPuzzleState().catch(() => {});

      // Lock interaction during async victory chain
      victoryActions.setProcessingVictory(true);
      hapticSuccess();

      const victory = await persistenceActions.recordVictory(
        puzzle.difficulty,
        result.hintsUsed,
        result.invalidAttempts,
        result.gameMode,
        result.completedWords,
        result.variant || 'standard',
        isPlayingDaily
      );

      // Record daily challenge completion if applicable
      if (isPlayingDaily) {
        const previousDailyStatus = await getDailyStatus();
        const previousDailyStreak = previousDailyStatus.streak;
        await recordDailyCompletion(
          victory.earnedStars,
          result.hintsUsed,
          result.invalidAttempts
        );
        const updatedDailyStatus = await getDailyStatus();

        // Check for daily streak milestone
        const dailyMilestone = checkDailyStreakMilestone(
          updatedDailyStatus.streak,
          previousDailyStreak,
          persistence.currentPhase
        );
        if (dailyMilestone) {
          await awardBonusAmber(dailyMilestone.amber, 'daily_streak_milestone');
          addVictoryTimeout(() => {
            puzzleActions.setMessage(`${dailyMilestone.message} (+${dailyMilestone.amber} amber)`);
          }, 1200);
        }

        // Track daily_streak quest progress
        updateQuestProgress({ dailyStreak: updatedDailyStatus.streak }, persistence.currentPhase).catch(() => {});
      }

      // Check for ritual micro-event on high-energy puzzles
      if (victory.ritualEnergy && victory.ritualEnergy >= 7) {
        const microEvent = getRitualMicroEvent(
          victory.ritualEnergy,
          persistence.currentPhase,
          result.completedWords
        );
        if (microEvent) {
          puzzleActions.setMessage(microEvent);
        }
      }

      // Show streak milestone toast if threshold was just crossed
      if (victory.streakMilestoneMessage) {
        addVictoryTimeout(() => {
          puzzleActions.setMessage(`${victory.streakMilestoneMessage} (+${victory.streakMilestoneBonus} amber)`);
        }, 800);
      }

      // Show harvest overflow warning if pending batches hit the cap
      if (victory.harvestOverflow) {
        addVictoryTimeout(() => {
          puzzleActions.setMessage(getHarvestOverflowMessage(persistence.currentPhase));
        }, 1500);
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
      puzzlesSinceHomeVisit.current += 1;

      // Play choreographed victory sequence (with skip-forward window)
      victoryAnimatingRef.current = true;
      victoryActions.playVictorySequence(victory.earnedStars);
      addVictoryTimeout(() => { victoryAnimatingRef.current = false; }, 1200);

      // Phase transitions are now DEFERRED to the Offering Pit.
      // When phaseTransitionPending is true, the phase change will be confirmed
      // in the pit screen with a ward mark ceremony. Don't play the overlay here.

      // Check for endgame triggers (final puzzle + post-revelation)
      if (!victory.phaseChanged && persistence.currentPhase >= 4) {
        try {
          const houseComplete = await isHouseCompleted();
          if (houseComplete) {
            const finalDone = await isFinalPuzzleCompleted();
            if (!finalDone) {
              await markFinalPuzzleCompleted();
              orchestrationActions.setCompletionCoda({
                title: 'THE HOUSE STANDS COMPLETE',
                text: persistence.currentPhase >= 3
                  ? 'You finished what was being built. There is no pretending now.'
                  : 'You completed the house and reached the final path.',
              });
              addVictoryTimeout(() => setPhaseTransitionEvent(FINAL_PUZZLE_EVENT), 1500);
            } else {
              const postRev = await isPostRevelation();
              if (!postRev) {
                await markPostRevelation();
                orchestrationActions.setCompletionCoda({
                  title: 'THE PATTERN REMEMBERS YOU',
                  text: 'You saw it through to the end. The arrangement is complete, and your words remain in every wall.',
                });
                addVictoryTimeout(() => setPhaseTransitionEvent(POST_REVELATION_EVENT), 1500);
              }
            }
          }
        } catch {
          // Endgame triggers are non-critical
        }
      }

      // Check achievements after brief delay to not block victory display
      addVictoryTimeout(() => achievementActions.checkForAchievements(victory), 500);

      // Post-victory orchestration: glitch, micro-beat, whisper, interjection
      orchestrationActions.processVictory({
        phase: persistence.currentPhase,
        totalPuzzlesCompleted: victory.cumulativeStats?.totalPuzzlesCompleted ?? 1,
        completedWords: result.completedWords,
        isOnboarding: onboardingFlow.isOnboarding,
        puzzlesSinceHomeVisit: puzzlesSinceHomeVisit.current,
      });

      // Compute session engagement nudge (contextual between-puzzle prompt)
      const nudge = getSessionNudge({
        phase: persistence.currentPhase as 0 | 1 | 2 | 3 | 4 | 5,
        puzzlesThisSession: puzzlesSinceHomeVisit.current,
        hasUnclaimedQuests: false, // Would need async check; simplified for now
        hasPendingHarvest: (victory.pendingHarvest?.pendingBatches ?? 0) > 0,
        animalsWithDialogue: [], // Would need cooldown check; simplified for now
        currentStreak: victory.currentStreak ?? 0,
        puzzlesSolved: victory.cumulativeStats?.totalPuzzlesCompleted ?? 0,
        unlockedVariantCount: 0, // Simplified — just pit/harvest/streak nudges
      });
      setSessionNudge(nudge);

      // Re-schedule notifications after puzzle completion
      scheduleAllNotifications(persistence.currentPhase).catch(() => {});

      // Mark cloud save as having pending changes
      markPendingChanges().catch(() => {});
      uploadToCloud().catch(() => {});
    } else if (result === null && puzzle.selectedLetter) {
      // Slot press happened but was invalid
      hapticError();
      soundInvalidMove();
      setInvalidDropSignal(prev => prev + 1);
      isDragDropRef.current = false;
    } else if (result === null) {
      // No action
      isDragDropRef.current = false;
    } else {
      // Valid intermediate move — trigger star burst celebration
      const wasDragDrop = isDragDropRef.current;
      isDragDropRef.current = false;

      // Escalated haptics for drag-drop: heavy thud vs medium tap
      if (wasDragDrop) {
        hapticHeavy();
      } else {
        hapticMedium();
      }
      soundValidMove();

      setStarBurst({
        active: true,
        x: feedbackOrigin?.x ?? SCREEN_WIDTH / 2,
        y: feedbackOrigin?.y ?? SCREEN_HEIGHT * 0.4,
      });
      addVictoryTimeout(() => setStarBurst({ active: false, x: 0, y: 0 }), 600);

      // Drag-drop bonus effects: target row bounce + screen micro-shake
      if (wasDragDrop) {
        setSuccessDropSignal(prev => prev + 1);

        // Light screen micro-shake via existing dread shake infrastructure
        const settings = getSettingsSync();
        if (!settings.reducedMotion) {
          dropShakeAnimRef.current?.stop();
          const shakeAnim = Animated.sequence([
            Animated.timing(dreadEffects.screenShakeRef, { toValue: DROP_SHAKE_INTENSITY, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: -DROP_SHAKE_INTENSITY, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: DROP_SHAKE_INTENSITY * 0.5, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: 0, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
          ]);
          dropShakeAnimRef.current = shakeAnim;
          shakeAnim.start(() => { dropShakeAnimRef.current = null; });
        }
      }

      // Track formed word for in-puzzle ritual echo chain
      if (result.formedWord) {
        setRitualEchoWords(prev => [...prev, result.formedWord!]);
      }

      // Dread word visual feedback — subtle dark pulse when a dread word is formed
      if (persistence.currentPhase >= 2 && result.formedWord && isDreadWord(result.formedWord)) {
        dreadActions.triggerDreadPulse(persistence.currentPhase);
      }
    }
  }, [
    puzzleActions,
    puzzle.difficulty,
    puzzle.selectedLetter,
    puzzle.gameState,
    persistenceActions,
    persistence.currentPhase,
    isPlayingDaily,
    victoryFlow.isProcessingVictory,
    victoryActions,
    achievementActions,
    onboardingFlow.onboardingStep,
    onboardingFlow.isOnboarding,
    orchestrationActions,
    dreadActions,
    dreadEffects,
    tutorialGuidance,
    addVictoryTimeout,
  ]);

  const handleLetterPress = useCallback((letter: any, rowIndex: number) => {
    if (
      onboardingFlow.onboardingStep === 'puzzle_tutorial' &&
      puzzle.gameState === GameState.PLAYING &&
      puzzle.selectedLetter &&
      letter.id !== puzzle.selectedLetter.id
    ) {
      hapticSelection();
      soundTap();
      puzzleActions.setMessage('Keep that letter selected, then drop it into the glowing slot.');
      return;
    }

    if (
      onboardingFlow.onboardingStep === 'puzzle_tutorial' &&
      puzzle.gameState === GameState.PLAYING &&
      !puzzle.selectedLetter &&
      tutorialGuidance?.sourceLetterId &&
      letter.id !== tutorialGuidance.sourceLetterId
    ) {
      hapticSelection();
      soundTap();
      puzzleActions.setMessage(`Try the glowing "${tutorialGuidance.letterToMove}" tile first.`);
      return;
    }

    hapticLight();
    soundTap();
    puzzleActions.handleLetterPress(letter, rowIndex);
  }, [puzzleActions, onboardingFlow.onboardingStep, puzzle.gameState, puzzle.selectedLetter, tutorialGuidance]);

  // Disable puzzle ScrollView during drag to prevent scroll-vs-drag conflict.
  // Toggled by DraggableTile via onDragActiveChange callback.
  const [puzzleScrollEnabled, setPuzzleScrollEnabled] = useState(true);
  const handleDragActiveChange = useCallback((active: boolean) => {
    setPuzzleScrollEnabled(!active);
  }, []);

  // Drag-and-drop: when a letter is dragged onto the target row area, find the
  // closest valid slot and press it. The letter was already selected via onDragStart.
  // Uses refs + setTimeout to ensure React has processed the letter selection state
  // update from onDragStart before we read the computed slot previews.
  const slotPreviewsRef = useRef(puzzle.slotPreviews);
  const handleSlotPressRef = useRef(handleSlotPress);
  slotPreviewsRef.current = puzzle.slotPreviews;
  handleSlotPressRef.current = handleSlotPress;

  const handleLetterDragDrop = useCallback((_letter: any, _rowIndex: number, position: { x: number; y: number }) => {
    // Defer to next tick so React processes the letter selection from onDragStart
    setTimeout(() => {
      const previews = slotPreviewsRef.current;
      const onSlotPress = handleSlotPressRef.current;
      if (!previews || previews.length === 0) return;

      // Estimate which slot the user dropped over based on X position.
      // Use that exact slot — if it's not valid, let handleSlotPress show
      // invalid feedback rather than silently jumping to a distant valid slot.
      const targetWordLength = previews.length - 1;
      const estimated = estimateSlotIndex(position.x, previews.length, targetWordLength);

      // Mark as drag-drop for haptic/effect escalation in handleSlotPress
      isDragDropRef.current = true;
      onSlotPress(estimated, position);
    }, 0);
  }, []);

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
    clearVictoryTimeouts();
    clearPuzzleState().catch(() => {});
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);
    setSessionNudge(null);
    puzzleActions.handleNextLevel();
  }, [puzzleActions, victoryActions, orchestrationActions, clearVictoryTimeouts]);

  // During onboarding, "Continue" on victory modal cleans up and navigates appropriately.
  // After guided tutorial: start the unguided second puzzle.
  // After unguided puzzle: navigate to pit.
  const handleOnboardingVictoryContinue = useCallback(async () => {
    hapticLight();
    clearVictoryTimeouts();
    // Clean up victory state
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);

    if (onboardingFlow.onboardingStep === 'puzzle_tutorial') {
      // After guided tutorial: advance to unguided second puzzle
      await onboardingActions.advanceOnboarding('puzzle_tutorial_free');
      puzzleActions.clearBoard();
      puzzleActions.startNewGame('EASY');
    } else {
      // After unguided puzzle (or puzzle_tutorial_free): navigate to pit
      await onboardingActions.advanceOnboarding('pit_intro');
      transitionTo('pit', () => {
        puzzleActions.setGameState(GameState.IDLE);
      });
    }
  }, [onboardingFlow.onboardingStep, onboardingActions, puzzleActions, victoryActions, orchestrationActions, transitionTo, clearVictoryTimeouts]);

  const handleReturnHome = useCallback(() => {
    hapticLight();
    clearVictoryTimeouts();
    puzzlesSinceHomeVisit.current = 0;
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);
    puzzleActions.clearBoard();
    transitionTo('home');
  }, [puzzleActions, transitionTo, victoryActions, orchestrationActions, clearVictoryTimeouts]);

  const handleGoToPit = useCallback(() => {
    hapticLight();
    clearVictoryTimeouts();
    puzzlesSinceHomeVisit.current = 0;
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);
    puzzleActions.clearBoard();
    transitionTo('pit');
  }, [puzzleActions, transitionTo, victoryActions, orchestrationActions, clearVictoryTimeouts]);

  const handleShare = useCallback(async () => {
    if (!victoryFlow.victoryData) return;
    hapticLight();
    const moveCount = puzzle.rows.length - 1;
    const phase = persistence.currentPhase;
    await sharePuzzleResult({
      stars: victoryFlow.victoryData.earnedStars,
      difficulty: puzzle.difficulty,
      level: puzzle.level,
      hintsUsed: puzzle.hintsUsed,
      invalidAttempts: puzzle.invalidAttempts,
      isDaily: isPlayingDaily,
      dailyDate: isPlayingDaily ? getTodayString() : undefined,
      moveCount,
      wordChain: puzzle.lastCompletedWords.length > 0 ? puzzle.lastCompletedWords : undefined,
      animalWhisper: orchestration.whisper?.text,
      phase,
      incantationName: puzzle.lastIncantationName || undefined,
      victoryTitle: getVictoryTitle(victoryFlow.victoryData.earnedStars, phase as 0 | 1 | 2 | 3 | 4 | 5),
      totalWordsOffered: victoryFlow.victoryData.totalWordsFormed,
    });
  }, [victoryFlow.victoryData, puzzle, isPlayingDaily, orchestration.whisper, persistence.currentPhase]);

  const handleVictoryTapAccelerate = useCallback(() => {
    if (victoryAnimatingRef.current && victoryFlow.victoryData) {
      victoryAnimatingRef.current = false;
      victoryActions.skipToEnd(victoryFlow.victoryData.earnedStars);
    }
  }, [victoryFlow.victoryData, victoryActions]);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    hapticLight();
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    puzzleActions.startNewGame(d, puzzle.gameMode, puzzle.selectedVariant);
  }, [puzzleActions, puzzle.gameMode, puzzle.selectedVariant, orchestrationActions]);

  const handleSelectVariant = useCallback((variant: PuzzleVariant) => {
    if (!isVariantUnlocked(variant, puzzlesSolvedForVariantUnlocks, persistence.currentPhase)) {
      return;
    }
    hapticSelection();
    soundTap();
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    puzzleActions.setSelectedVariant(variant);
    puzzleActions.startNewGame(puzzle.difficulty, puzzle.gameMode, variant);
  }, [
    puzzleActions,
    puzzle.difficulty,
    puzzle.gameMode,
    puzzlesSolvedForVariantUnlocks,
    persistence.currentPhase,
    orchestrationActions,
  ]);

  const handleToggleChallengeMode = useCallback(() => {
    hapticMedium();
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    const newMode = puzzle.gameMode === 'challenge' ? 'standard' : 'challenge';
    puzzleActions.startNewGame(puzzle.difficulty, newMode, puzzle.selectedVariant);
  }, [puzzleActions, puzzle.gameMode, puzzle.difficulty, puzzle.selectedVariant, orchestrationActions]);

  // ========================================================================
  // Render
  // ========================================================================

  // Show loading while onboarding state is being determined
  if (!onboardingFlow.onboardingReady) {
    return (
      <View style={styles.initialLoadingContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.initialLoadingCard}>
          <ActivityIndicator size="large" color={CandyColors.pink.main} />
          <Text style={styles.initialLoadingTitle}>WordShift</Text>
          <Text style={styles.initialLoadingSubtitle}>Preparing your house...</Text>
        </View>
      </View>
    );
  }

  // Helper: render the active screen content
  const renderScreen = () => {
    if (currentScreen === 'settings') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <SettingsScreen onClose={() => transitionTo('home')} />
        </View>
      );
    }

    if (currentScreen === 'ledger') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <WordLedger
            phase={persistence.currentPhase}
            onClose={() => transitionTo('home')}
          />
        </View>
      );
    }

    if (currentScreen === 'gallery') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <WhisperGalleryScreen
            phase={persistence.currentPhase}
            onClose={() => transitionTo('home')}
          />
        </View>
      );
    }

    if (currentScreen === 'stats') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <StatsScreen
            onClose={() => transitionTo('home')}
            puzzlesSolved={persistence.cumulativeStats?.totalPuzzlesCompleted || 0}
            currentPhase={persistence.currentPhase}
            amberBalance={persistence.amberBalance}
            phase={persistence.currentPhase}
          />
        </View>
      );
    }

    if (currentScreen === 'pit') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <OfferingPitScreen
            phase={persistence.currentPhase}
            amberBalance={persistence.amberBalance}
            onClose={() => transitionTo('home')}
            onAmberChange={(newBalance) => {
              persistenceActions.setAmberBalance(newBalance);
            }}
            onOpenStats={() => transitionTo('stats')}
            onOpenSettings={() => transitionTo('settings')}
            phaseProgressFraction={persistence.phaseProgressFraction}
            pendingPhaseTransition={persistence.pendingPhaseTransition}
            onPhaseTransitionConfirmed={(newPhase) => {
              // Refresh all persistence state to pick up the new currentPhase
              persistenceActions.refreshStats();
              // Play the full PhaseTransitionOverlay cinematic
              const event = getPhaseTransitionEvent(newPhase as any);
              if (event) {
                setPhaseTransitionEvent(event);
              }
              victoryActions.playPhaseChangeFlash();
              // Update notifications with new phase
              scheduleAllNotifications(newPhase).catch(() => {});
            }}
            isOnboarding={onboardingFlow.isOnboarding}
            onboardingStep={onboardingFlow.onboardingStep}
            onOnboardingOfferComplete={onboardingActions.handlePitOnboardingOfferComplete}
          />
          {/* Fox Guide overlay — shown during onboarding on pit screen */}
          {onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'pit_intro' || onboardingFlow.onboardingStep === 'pit_offering') && (
            <FoxGuide
              visible={onboardingFlow.onboardingStep === 'pit_intro' || (onboardingFlow.onboardingStep === 'pit_offering' && onboardingFlow.pitOfferDone)}
              variant="dialogue"
              text={onboardingActions.getOnboardingFoxText()}
              buttonText={onboardingActions.getOnboardingButtonText()}
              onContinue={onboardingActions.handleOnboardingContinue}
              position="bottom"
            />
          )}
        </View>
      );
    }

    if (currentScreen === 'home') {
      return (
        <ErrorBoundary
          fallbackMessage="Something went wrong with the home screen. Tap to try again."
          onReset={() => setCurrentScreen('home')}
        >
          <View style={{ flex: 1 }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <HomeScreen
              onPlayPuzzle={handlePlayPuzzle}
              onAmberChange={persistenceActions.setAmberBalance}
              onOpenSettings={() => transitionTo('settings')}
              onOpenStats={() => transitionTo('stats')}
              onOpenLedger={() => transitionTo('ledger')}
              onOpenGallery={() => transitionTo('gallery')}
              onOpenPit={() => transitionTo('pit')}
              onStartDaily={handleStartDaily}
              onboardingStep={onboardingFlow.onboardingStep}
              onAdvanceOnboarding={onboardingActions.advanceOnboarding}
              pitPhaseReady={persistence.pendingPhaseTransition != null}
            />
            {/* Achievement toast overlay */}
            <AchievementToast
              achievement={achievementState.currentAchievement}
              onDismiss={achievementActions.dismissAchievement}
              phase={persistence.currentPhase}
            />
            {/* Fox Guide overlay — shown during onboarding on home screen */}
            {onboardingFlow.isOnboarding && currentScreen === 'home' && (
              (onboardingFlow.onboardingStep === 'home_empty' ||
               onboardingFlow.onboardingStep === 'fox_invited' ||
               onboardingFlow.onboardingStep === 'unlock_explained') && (
                <FoxGuide
                  visible={true}
                  variant="dialogue"
                  text={onboardingActions.getOnboardingFoxText()}
                  buttonText={onboardingActions.getOnboardingButtonText()}
                  onContinue={onboardingFlow.onboardingStep === 'home_empty' ? undefined : onboardingActions.handleOnboardingContinue}
                  showSkip={onboardingFlow.onboardingStep !== 'unlock_explained'}
                  onSkip={onboardingActions.handleSkipOnboarding}
                  position={onboardingFlow.onboardingStep === 'home_empty' ? 'middle' : 'bottom'}
                  anchorStyle={onboardingFlow.onboardingStep === 'home_empty'
                    ? {
                        top: Math.min(SCREEN_HEIGHT * 0.56, 430),
                        left: 12,
                        right: 12,
                      }
                    : undefined}
                />
              )
            )}
          </View>
        </ErrorBoundary>
      );
    }

    // Puzzle screen
    return (
      <ErrorBoundary
        fallbackMessage="Something went wrong with the puzzle. Tap to return home."
        onReset={() => { setCurrentScreen('home'); puzzleActions.setGameState(GameState.IDLE); }}
      >
      <Animated.View style={[styles.container, { transform: [{ translateX: dreadEffects.screenShakeRef }] }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Animated Background — darkens with narrative phase */}
        <AnimatedBackground phase={persistence.currentPhase} />

        {/* Confetti celebration — colors shift with phase */}
        <Confetti active={puzzle.showConfetti} phase={persistence.currentPhase} ritualEnergy={victoryFlow.victoryData?.ritualEnergy ?? 0} />

        {/* Star burst effect on valid moves */}
        <StarBurst active={starBurst.active} x={starBurst.x} y={starBurst.y} phase={persistence.currentPhase} />

        {/* Phase change dramatic flash overlay */}
        <Animated.View
          style={[styles.phaseFlashOverlay, { opacity: victoryFlow.phaseFlashOpacity }]}
          pointerEvents="none"
        />

        {/* Achievement toast overlay */}
        <AchievementToast
          achievement={achievementState.currentAchievement}
          onDismiss={achievementActions.dismissAchievement}
          phase={persistence.currentPhase}
        />

        {/* Header */}
        <View style={styles.header}>
          {/* Hide home button during onboarding tutorial */}
          {!onboardingFlow.isOnboarding ? (
            <TouchableOpacity
              style={styles.headerHomeButton}
              onPress={handleGoHome}
              accessibilityLabel="Go home"
              accessibilityRole="button"
            >
              <Text style={styles.headerHomeText}>{'\uD83C\uDFE0'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerHomeButton} />
          )}

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
              ]}
              accessibilityLabel="Atmosphere shifted"
              accessibilityRole="text"
              >
                <Text style={styles.phaseBadgeIcon}>
                  {getPhaseIndicator(persistence.currentPhase).icon}
                </Text>
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

        {/* Stats Row — hidden during onboarding to reduce clutter */}
        {onboardingFlow.isOnboarding ? null : (
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
            {puzzle.currentVariant !== 'standard' && (
              <View style={[
                styles.variantBadge,
                persistence.currentPhase >= 3 && styles.variantBadgeDark,
              ]}>
                <Text style={styles.variantBadgeIcon}>
                  {VARIANT_CONFIGS[puzzle.currentVariant]?.icon || '✨'}
                </Text>
                <Text style={[
                  styles.variantBadgeText,
                  persistence.currentPhase >= 3 && styles.variantBadgeTextDark,
                ]}>
                  {VARIANT_CONFIGS[puzzle.currentVariant]?.title || 'Variant'}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.difficultyButton}
            onPress={() => puzzleActions.setShowDifficultyMenu(!puzzle.showDifficultyMenu)}
            accessibilityLabel={`Difficulty ${puzzle.difficulty}, style ${VARIANT_CONFIGS[puzzle.selectedVariant]?.title || 'Standard'}. Tap to change puzzle setup`}
            accessibilityRole="button"
          >
            <View style={styles.difficultyButtonShine} />
            <View style={[
              styles.difficultyDot,
              puzzle.difficulty === 'EASY' && styles.difficultyDotEasy,
              puzzle.difficulty === 'MEDIUM' && styles.difficultyDotMedium,
              puzzle.difficulty === 'MEDIUM_PLUS' && styles.difficultyDotMediumPlus,
              puzzle.difficulty === 'HARD' && styles.difficultyDotHard,
            ]} />
            <Text style={styles.difficultyText}>{puzzle.difficulty === 'MEDIUM_PLUS' ? 'MED+' : puzzle.difficulty}</Text>
            <Text style={styles.difficultyArrow}>{'\u25BC'}</Text>
          </TouchableOpacity>

          <DifficultyMenu
            visible={puzzle.showDifficultyMenu}
            currentDifficulty={puzzle.difficulty}
            gameMode={puzzle.gameMode}
            phase={persistence.currentPhase}
            currentVariant={puzzle.selectedVariant}
            activeVariant={puzzle.currentVariant}
            variantOptions={variantSelectorOptions}
            onSelectDifficulty={handleSelectDifficulty}
            onToggleChallengeMode={handleToggleChallengeMode}
            onSelectVariant={handleSelectVariant}
          />
        </View>
        )}

        {/* Toast Message */}
        <View style={styles.toastContainer}>
          <Toast message={puzzle.error || puzzle.message} isError={!!puzzle.error} />
        </View>

        {/* Speed Timer — prominent display */}
        {speedTimer.speedTimeRemaining !== null && (
          <View style={[
            styles.speedTimerContainer,
            speedTimer.speedTimeRemaining <= 10 && styles.speedTimerUrgent,
          ]}>
            <Text style={[
              styles.speedTimerText,
              speedTimer.speedTimeRemaining <= 10 && styles.speedTimerTextUrgent,
            ]}>
              {'\u23F1'} {speedTimer.speedTimeRemaining}s
            </Text>
          </View>
        )}

        {/* Game Area */}
        <View style={styles.gameArea}>
          {(puzzle.gameState === GameState.LOADING || puzzle.isProcessing || victoryFlow.isProcessingVictory) && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={CandyColors.pink.main} />
                <Text style={styles.loadingGlyph}>{persistence.currentPhase >= 3 ? '◈' : '✦'}</Text>
                <Text style={styles.loadingText}>
                  {getLoadingMessage(persistence.currentPhase)}
                </Text>
                <Text style={styles.loadingHint}>
                  {persistence.currentPhase >= 3
                    ? 'The pattern settles into place...'
                    : 'This should only take a moment.'}
                </Text>
              </View>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.rowsContainer}
            showsVerticalScrollIndicator={false}
            scrollEnabled={puzzleScrollEnabled}
            accessibilityRole="list"
            accessibilityLabel={`Puzzle with ${puzzle.rows.length} word rows`}
          >
            {puzzle.rows.map((row, idx) => (
              <Row
                key={row.id}
                rowData={row}
                rowIndex={idx}
                activeRowIndex={puzzle.activeRowIndex}
                moveDirection={puzzle.moveDirection}
                selectedLetter={puzzle.selectedLetter}
                onLetterPress={handleLetterPress}
                onSlotPress={handleSlotPress}
                isProcessing={puzzle.isProcessing}
                phase={persistence.currentPhase}
                wordLength={row.words.length}
                concealLetters={false}
                guidanceActive={onboardingFlow.onboardingStep === 'puzzle_tutorial'}
                guidedLetterId={tutorialGuidance?.sourceLetterId || null}
                guidedSlotIndex={tutorialGuidance?.targetSlotIndex ?? null}
                invalidDropSignal={invalidDropSignal}
                successDropSignal={successDropSignal}
                onLetterDragDrop={handleLetterDragDrop}
                onDragActiveChange={handleDragActiveChange}
                slotPreviews={
                  idx === puzzle.activeRowIndex + (puzzle.moveDirection === 'down' ? 1 : -1)
                    ? puzzle.slotPreviews
                    : undefined
                }
              />
            ))}
          </ScrollView>

          {/* In-puzzle ritual echo chain — shows word chain building in real-time */}
          <RitualEchoChain
            words={ritualEchoWords}
            phase={persistence.currentPhase}
            visible={puzzle.gameState === GameState.PLAYING && ritualEchoWords.length > 0}
          />
        </View>

        {/* Bottom Controls — simplified during onboarding (no NEW button) */}
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
            disabled={puzzle.history.length === 0 || puzzle.gameState !== GameState.PLAYING}
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
          {!onboardingFlow.isOnboarding && (
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
              setRitualEchoWords([]);
              puzzleActions.startNewGame();
            }}
            disabled={false}
          />
          )}
        </View>

        {/* Rules Modal — phase-aware text */}
        <RulesModal
          visible={puzzle.showRules}
          phase={persistence.currentPhase}
          onClose={() => puzzleActions.setShowRules(false)}
        />

        {/* Tap-to-accelerate overlay for victory animation */}
        {puzzle.gameState === GameState.WON && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleVictoryTapAccelerate}
            pointerEvents="box-none"
          />
        )}

        {/* Victory Modal — shown during onboarding puzzle_tutorial (hidden during puzzle_complete when FoxGuide takes over) */}
        <VictoryModal
          visible={puzzle.gameState === GameState.WON && !(onboardingFlow.isOnboarding && onboardingFlow.onboardingStep === 'puzzle_complete')}
          earnedStars={puzzle.earnedStars}
          level={puzzle.level}
          difficulty={puzzle.difficulty}
          phase={persistence.currentPhase}
          phaseTransitionPending={persistence.pendingPhaseTransition != null}
          isPlayingDaily={isPlayingDaily}
          victoryData={victoryFlow.victoryData}
          completionCoda={orchestration.completionCoda}
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
          onGoToPit={handleGoToPit}
          onShare={handleShare}
          isOnboarding={onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'puzzle_tutorial' || onboardingFlow.onboardingStep === 'puzzle_tutorial_free')}
          onOnboardingContinue={handleOnboardingVictoryContinue}
          variant={puzzle.currentVariant}
          gameMode={puzzle.gameMode}
          sessionNudge={sessionNudge}
        />

        {/* Victory Glitch — brief flash text during Phase 0 victories */}
        {orchestration.showVictoryGlitch && orchestration.victoryGlitch && (
          <View style={styles.victoryGlitchOverlay} pointerEvents="none">
            <Text style={styles.victoryGlitchText}>{orchestration.victoryGlitch}</Text>
          </View>
        )}

        {/* Narrative Micro-Beat — surprise moments at puzzle milestones */}
        {orchestration.showMicroBeat && orchestration.microBeat && (
          <View style={[
            styles.victoryGlitchOverlay,
            orchestration.microBeat.type === 'ambient_whisper' && styles.microBeatWhisperOverlay,
          ]} pointerEvents="none">
            <Text style={[
              orchestration.microBeat.type === 'glitch_title' ? styles.victoryGlitchText : styles.microBeatWhisperText,
            ]}>
              {orchestration.microBeat.type === 'glitch_title' ? orchestration.microBeat.glitchTitle : orchestration.microBeat.text}
            </Text>
          </View>
        )}

        {/* Animal Whisper — ghost-like message from an animal after puzzle completion */}
        <AnimalWhisper
          visible={orchestration.showWhisper}
          animalName={orchestration.whisper?.animalName || ''}
          whisperText={orchestration.whisper?.text || ''}
          phase={persistence.currentPhase}
          onComplete={orchestrationActions.dismissWhisper}
        />

        {/* Animal Interjection — brief message pulling player to home screen */}
        {orchestration.showInterjection && orchestration.interjection && !orchestration.showWhisper && (
          <View style={styles.interjectionContainer}>
            <Text style={[
              styles.interjectionText,
              persistence.currentPhase >= 3 && styles.interjectionTextDark,
            ]}>
              {orchestration.interjection.text}
            </Text>
          </View>
        )}

        {/* Dread Pulse — subtle dark flash when a dread word is formed */}
        <Animated.View
          style={[styles.dreadPulseOverlay, { opacity: dreadEffects.dreadPulseOpacity }]}
          pointerEvents="none"
        />

        {/* Fox Guide overlay — shown during onboarding on puzzle screen (hidden when victory modal is showing) */}
        {onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'puzzle_tutorial' || onboardingFlow.onboardingStep === 'puzzle_tutorial_free' || onboardingFlow.onboardingStep === 'puzzle_complete') && !((onboardingFlow.onboardingStep === 'puzzle_tutorial' || onboardingFlow.onboardingStep === 'puzzle_tutorial_free') && puzzle.gameState === GameState.WON) && (
          <FoxGuide
            visible={true}
            variant="dialogue"
            text={
              onboardingFlow.onboardingStep === 'puzzle_complete'
                ? ONBOARDING_FOX_LINES.puzzle_tutorial_complete[
                    Math.min(onboardingFlow.onboardingLineIndex, ONBOARDING_FOX_LINES.puzzle_tutorial_complete.length - 1)
                  ]
                : onboardingFlow.onboardingStep === 'puzzle_tutorial_free'
                  ? (puzzle.gameState === GameState.PLAYING
                      ? ONBOARDING_FOX_LINES.puzzle_tutorial_free_intro[0]
                      : ONBOARDING_FOX_LINES.puzzle_tutorial_free_intro[0])
                  : puzzle.gameState === GameState.PLAYING && puzzle.selectedLetter
                    ? (
                      tutorialGuidance?.targetSlotIndex !== null && tutorialGuidance?.targetSlotIndex !== undefined
                        ? `Now drop "${tutorialGuidance.letterToMove}" into the glowing slot below.`
                        : ONBOARDING_FOX_LINES.puzzle_tutorial_drop[0]
                    )
                    : puzzle.gameState === GameState.PLAYING
                      ? (
                        tutorialGuidance?.letterToMove
                          ? `Tap the glowing "${tutorialGuidance.letterToMove}" tile to pick it up.`
                          : ONBOARDING_FOX_LINES.puzzle_tutorial_pick[0]
                      )
                      : ONBOARDING_FOX_LINES.puzzle_tutorial_intro[0]
            }
            buttonText={
              onboardingFlow.onboardingStep === 'puzzle_complete'
                ? (onboardingFlow.onboardingLineIndex < ONBOARDING_FOX_LINES.puzzle_tutorial_complete.length - 1
                    ? "Next"
                    : "Let's go!")
                : undefined
            }
            onContinue={
              onboardingFlow.onboardingStep === 'puzzle_complete'
                ? onboardingActions.handleOnboardingContinue
                : undefined
            }
            position="bottom"
            anchorStyle={
              onboardingFlow.onboardingStep === 'puzzle_complete'
                ? {
                    // Center the completion dialogue on screen
                    top: Math.min(Math.max(SCREEN_HEIGHT * 0.35, 280), 380),
                    left: 8,
                    right: 8,
                  }
                : puzzle.gameState === GameState.PLAYING
                  ? {
                      // Position well below the 3 tutorial rows
                      // (~50px status bar + ~80px header + 3 rows * ~90px + padding)
                      top: Math.min(Math.max(SCREEN_HEIGHT * 0.64, 470), 580),
                      left: 8,
                      right: 8,
                    }
                  : undefined
            }
          />
        )}
      </Animated.View>
      </ErrorBoundary>
    );
  };

  // Render screen with global overlays on top
  return (
    <View style={{ flex: 1, backgroundColor: rootBgColor }}>
      {renderScreen()}
      {/* Screen transition overlay — solid cover that fades in/out during navigation */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          backgroundColor: transitionOverlayColor,
          opacity: transitionOverlay,
        }]}
      />
      {/* Phase transition overlay — renders above ALL screens */}
      <PhaseTransitionOverlay
        event={phaseTransitionEvent}
        onComplete={() => setPhaseTransitionEvent(null)}
      />
    </View>
  );
}
