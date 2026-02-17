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
  Platform,
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
import { logEvent } from './src/services/eventLogger';
// Feature imports
import { hasTutorialCompleted, markTutorialCompleted } from './src/components/Tutorial';
import { SettingsScreen } from './src/components/SettingsScreen';
import { FoxGuide } from './src/components/FoxGuide';
import {
  OnboardingStep,
  getOnboardingStep,
  setOnboardingStep,
  ONBOARDING_FOX_LINES,
} from './src/services/onboarding';
import { markTutorialSeedsPlanted, awardBonusAmber } from './src/services/amberCurrency';
import { checkDailyStreakMilestone, getDailyStatus } from './src/services/dailyChallenge';
import { updateQuestProgress } from './src/services/weeklyQuests';
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
  getRitualMicroEvent,
  getVictoryGlitch,
  checkNarrativeMicroBeat,
  NarrativeMicroBeat,
} from './src/services/phaseNarrative';
import { getPhaseTransitionEvent, PhaseTransitionEvent, FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT } from './src/services/phaseEvents';
import { isHouseCompleted, isFinalPuzzleCompleted, markFinalPuzzleCompleted, isPostRevelation, markPostRevelation, getFullProgress } from './src/services/amberCurrency';
import { startFrameMonitoring } from './src/services/performanceMonitor';
import { getAnimalWhisper, getAnimalInterjection, getHomescreenNudge } from './src/services/phaseNarrative';
import { AnimalWhisper } from './src/components/puzzle/AnimalWhisper';
import { WordLedger } from './src/components/WordLedger';
import { WhisperGalleryScreen } from './src/components/WhisperGalleryScreen';
import { isDreadWord, validateWord } from './src/services/localGenerator';
import { scheduleAllNotifications } from './src/services/notifications';
import { recordWhisper } from './src/services/whisperGallery';
import { markPendingChanges, uploadToCloud } from './src/services/cloudSave';
import { savePuzzleState, loadPuzzleState, clearPuzzleState } from './src/services/puzzleSaveState';
import {
  hasVariantModifier,
  getVariantTimeLimit,
  getVariantTimeLimitForDifficulty,
  getVariantSelectorOptions,
  isVariantUnlocked,
  PuzzleVariant,
  VARIANT_CONFIGS,
} from './src/services/puzzleVariety';

// App screen type — expanded with settings, stats, and ledger
type AppScreen = 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery';

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
  }, [persistence.currentPhase]);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save puzzle state during active play (debounced to reduce write churn).
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (puzzle.gameState === GameState.PLAYING && currentScreen === 'puzzle') {
      autosaveTimerRef.current = setTimeout(() => {
        savePuzzleState({
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
          blindRevealedRows: puzzle.blindRevealedRows,
          currentChainLink: puzzle.currentChainLink,
          chainLength: puzzle.chainLength,
          currentPhase: puzzle.currentPhase,
          lastFormedWord: puzzle.lastFormedWord,
          isPlayingDaily,
          dailyDate: isPlayingDaily ? getTodayString() : null,
          savedAt: Date.now(),
        }).catch(() => {});
      }, 120);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    currentScreen,
    isPlayingDaily,
    puzzle.rows,
    puzzle.activeRowIndex,
    puzzle.selectedLetter,
    puzzle.gameState,
    puzzle.message,
    puzzle.history,
    puzzle.invalidAttempts,
    puzzle.hintsUsed,
    puzzle.undosRemaining,
    puzzle.difficulty,
    puzzle.currentWordLength,
    puzzle.hint,
    puzzle.solution,
    puzzle.gameMode,
    puzzle.currentVariant,
    puzzle.selectedVariant,
    puzzle.moveDirection,
    puzzle.blindRevealedRows,
    puzzle.currentChainLink,
    puzzle.chainLength,
    puzzle.currentPhase,
    puzzle.lastFormedWord,
  ]);

  // StarBurst effect state for valid moves
  const [starBurst, setStarBurst] = useState<{ active: boolean; x: number; y: number }>({
    active: false, x: 0, y: 0,
  });
  const [invalidDropSignal, setInvalidDropSignal] = useState(0);

  // Onboarding state (replaces old tutorial overlay)
  const [onboardingStep, setOnboardingStepState] = useState<OnboardingStep>('complete');
  const [onboardingLineIndex, setOnboardingLineIndex] = useState(0);
  const [onboardingReady, setOnboardingReady] = useState(false);

  // Victory animation skip-forward state
  const victoryAnimatingRef = useRef(false);

  // Home nudge — track consecutive puzzles without visiting home
  const puzzlesSinceHomeVisit = useRef(0);

  // Phase transition overlay state
  const [phaseTransitionEvent, setPhaseTransitionEvent] = useState<PhaseTransitionEvent | null>(null);

  // Animal whisper state (shown after puzzle completion)
  const [whisper, setWhisper] = useState<{ animalName: string; text: string } | null>(null);
  const [showWhisper, setShowWhisper] = useState(false);

  // Animal interjection state (brief message pulling player to home screen)
  const [interjection, setInterjection] = useState<{ animalName: string; text: string } | null>(null);
  const [showInterjection, setShowInterjection] = useState(false);

  // Victory glitch state (brief flash text during Phase 0 victories)
  const [victoryGlitch, setVictoryGlitch] = useState<string | null>(null);
  const [showVictoryGlitch, setShowVictoryGlitch] = useState(false);
  const [completionCoda, setCompletionCoda] = useState<{ title: string; text: string } | null>(null);

  // Narrative micro-beat state (subtle surprise moments at specific puzzle milestones)
  const [microBeat, setMicroBeat] = useState<NarrativeMicroBeat | null>(null);
  const [showMicroBeat, setShowMicroBeat] = useState(false);

  // Auto-dismiss interjection after 4 seconds
  useEffect(() => {
    if (showInterjection) {
      const timeout = setTimeout(() => setShowInterjection(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [showInterjection]);

  // Speed variants: run countdown while puzzle is active.
  useEffect(() => {
    const isSpeedVariant = hasVariantModifier(puzzle.currentVariant, 'speed');
    if (!isSpeedVariant || puzzle.gameState !== GameState.PLAYING) {
      setSpeedTimeRemaining(null);
      return;
    }

    const limit = getVariantTimeLimitForDifficulty(puzzle.currentVariant, puzzle.difficulty)
      ?? getVariantTimeLimit(puzzle.currentVariant)
      ?? 60;
    setSpeedTimeRemaining(limit);
    const startedAt = Date.now();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setSpeedTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setPuzzleGameState(GameState.GAME_OVER);
        setPuzzleMessage(
          persistence.currentPhase >= 3
            ? 'Time collapsed. The arrangement closed this path.'
            : 'Time is up! Start a new puzzle and try again.'
        );
      }
    }, 250);

    return () => clearInterval(interval);
  }, [
    puzzle.currentVariant,
    puzzle.gameState,
    puzzle.level,
    puzzle.currentChainLink,
    persistence.currentPhase,
    setPuzzleGameState,
    setPuzzleMessage,
  ]);

  // In-progress ritual echo chain — words formed during current puzzle
  const [ritualEchoWords, setRitualEchoWords] = useState<string[]>([]);

  // Speed variant countdown
  const [speedTimeRemaining, setSpeedTimeRemaining] = useState<number | null>(null);

  // Dread pulse state (flashes on dread word formation)
  const dreadPulseOpacity = useRef(new Animated.Value(0)).current;

  // Screen shake for dread words at Phase 3+
  const screenShakeRef = useRef(new Animated.Value(0)).current;

  // Screen transition animation
  const screenFade = useRef(new Animated.Value(1)).current;

  // Initialize on mount — check onboarding state
  useEffect(() => {
    initAudio();
    startFrameMonitoring();

    // Schedule notifications on app launch (non-blocking)
    scheduleAllNotifications(0).catch(() => {});
    uploadToCloud().catch(() => {});

    (async () => {
      // Check legacy tutorial flag first for backward compat
      const tutorialDone = await hasTutorialCompleted();
      const step = await getOnboardingStep();

      if (tutorialDone && step === 'not_started') {
        // Existing player who completed old tutorial — skip onboarding
        await setOnboardingStep('complete');
        setOnboardingStepState('complete');
      } else if (step === 'not_started') {
        // Fresh install — start onboarding
        await setOnboardingStep('home_empty');
        setOnboardingStepState('home_empty');
        setOnboardingLineIndex(0);
      } else {
        // Resume onboarding from where they left off
        setOnboardingStepState(step);
        setOnboardingLineIndex(0);
      }
      setOnboardingReady(true);
    })();
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

  // Onboarding helpers (declared early so other callbacks can reference them)
  const isOnboarding = onboardingStep !== 'complete';

  /** Advance onboarding to next step */
  const advanceOnboarding = useCallback(async (step: OnboardingStep) => {
    await setOnboardingStep(step);
    setOnboardingStepState(step);
    setOnboardingLineIndex(0);
  }, []);

  // Onboarding tutorial guidance: exact source letter + target slot from solver steps.
  const tutorialGuidance = useMemo(() => {
    if (onboardingStep !== 'puzzle_tutorial') return null;
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
    onboardingStep,
    puzzle.gameState,
    puzzle.solution,
    puzzle.moveDirection,
    puzzle.activeRowIndex,
    puzzle.rows,
  ]);

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = useCallback((difficulty?: Difficulty) => {
    hapticLight();
    soundTap();
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    const diff = difficulty || puzzle.difficulty;
    setRitualEchoWords([]);
    setCompletionCoda(null);
    transitionTo('puzzle', async () => {
      // Check for saved in-progress puzzle
      const saved = await loadPuzzleState();
      const today = getTodayString();
      const canRestoreDaily = Boolean(
        saved?.isPlayingDaily && (!saved.dailyDate || saved.dailyDate === today)
      );
      if (saved && saved.gameState === 'PLAYING' && (!saved.isPlayingDaily || canRestoreDaily)) {
        puzzleActions.restorePuzzleState(saved);
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
  }, [puzzle.difficulty, puzzleActions, transitionTo, persistenceActions]);

  // Start daily challenge — uses seeded generation for deterministic puzzles
  const handleStartDaily = useCallback(async (difficulty: Difficulty) => {
    hapticMedium();
    soundTap();
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    setRitualEchoWords([]);
    setCompletionCoda(null);
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
  }, [puzzleActions, transitionTo]);

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
    if (victoryFlow.isProcessingVictory) return;
    if (puzzle.gameState === GameState.GAME_OVER) return;

    // Onboarding tutorial: keep drops focused on the guided slot.
    if (
      onboardingStep === 'puzzle_tutorial' &&
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
      return;
    }

    const result = await puzzleActions.handleSlotPress(targetIndex);

    if (result?.chainAdvanced) {
      // Chain mode advanced to the next link (not a final victory yet).
      hapticMedium();
      soundValidMove();
      setRitualEchoWords([]);
      return;
    }

    if (result?.completed) {
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
          setTimeout(() => {
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
        setTimeout(() => {
          puzzleActions.setMessage(`${victory.streakMilestoneMessage} (+${victory.streakMilestoneBonus} amber)`);
        }, 800);
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
      setTimeout(() => { victoryAnimatingRef.current = false; }, 1200);

      // If phase changed, immediately show transition overlay and play dramatic flash
      if (victory.phaseChanged) {
        const event = getPhaseTransitionEvent(victory.newPhase as any);
        if (event) {
          setPhaseTransitionEvent(event);
        }
        victoryActions.playPhaseChangeFlash();
      }

      // Check for endgame triggers (final puzzle + post-revelation)
      // Only when NOT already showing a phase transition
      if (!victory.phaseChanged && persistence.currentPhase >= 4) {
        try {
          const houseComplete = await isHouseCompleted();
          if (houseComplete) {
            const finalDone = await isFinalPuzzleCompleted();
            if (!finalDone) {
              // First puzzle after house completion at Phase 4 = the "final puzzle"
              await markFinalPuzzleCompleted();
              setCompletionCoda({
                title: 'THE HOUSE STANDS COMPLETE',
                text: persistence.currentPhase >= 3
                  ? 'You finished what was being built. There is no pretending now.'
                  : 'You completed the house and reached the final path.',
              });
              setTimeout(() => setPhaseTransitionEvent(FINAL_PUZZLE_EVENT), 1500);
            } else {
              const postRev = await isPostRevelation();
              if (!postRev) {
                // First puzzle after final puzzle = post-revelation (Phase 5)
                await markPostRevelation();
                setCompletionCoda({
                  title: 'THE PATTERN REMEMBERS YOU',
                  text: 'You saw it through to the end. The arrangement is complete, and your words remain in every wall.',
                });
                setTimeout(() => setPhaseTransitionEvent(POST_REVELATION_EVENT), 1500);
              }
            }
          }
        } catch {
          // Endgame triggers are non-critical
        }
      }

      // Check achievements after brief delay to not block victory display
      setTimeout(() => achievementActions.checkForAchievements(victory), 500);

      // Victory glitch — brief flash text at Phase 0 (~8% chance, guaranteed first puzzle)
      const glitchText = getVictoryGlitch(persistence.currentPhase, victory.cumulativeStats?.totalPuzzlesCompleted ?? 1);
      if (glitchText) {
        setTimeout(() => {
          setVictoryGlitch(glitchText);
          setShowVictoryGlitch(true);
          setTimeout(() => setShowVictoryGlitch(false), 500);
        }, 300);
      }

      // Narrative micro-beat — surprise moments at specific puzzle milestones
      checkNarrativeMicroBeat(victory.cumulativeStats?.totalPuzzlesCompleted ?? 0).then(beat => {
        if (beat) {
          const delay = beat.type === 'glitch_title' ? 600 : 1800;
          setTimeout(() => {
            setMicroBeat(beat);
            setShowMicroBeat(true);
            setTimeout(() => setShowMicroBeat(false), beat.durationMs);
          }, delay);
        }
      }).catch(() => {});

      // Re-schedule notifications after puzzle completion
      scheduleAllNotifications(persistence.currentPhase).catch(() => {});

      // Mark cloud save as having pending changes
      markPendingChanges().catch(() => {});
      uploadToCloud().catch(() => {});

      // During onboarding, advance to puzzle_complete step
      if (onboardingStep === 'puzzle_tutorial') {
        setTimeout(() => advanceOnboarding('puzzle_complete'), 1000);
      }

      // Trigger animal whisper after a delay (skip during onboarding to keep focus on FoxGuide)
      if (!isOnboarding) setTimeout(async () => {
        try {
          const fullProgress = await getFullProgress();
          const whisperData = getAnimalWhisper(
            persistence.currentPhase,
            fullProgress.unlockedAnimals || [],
            result.completedWords
          );
          if (whisperData) {
            setWhisper({ animalName: whisperData.animalName, text: whisperData.text });
            setShowWhisper(true);
            // Record whisper in gallery
            recordWhisper({
              animalType: whisperData.animalType || 'unknown',
              animalName: whisperData.animalName,
              text: whisperData.text,
              phase: persistence.currentPhase,
              type: 'whisper',
            }).catch(() => {});
          }
        } catch {
          // Whispers are non-critical
        }
      }, 1200);

      // Trigger animal interjection or home nudge after a longer delay (skip during onboarding)
      if (!isOnboarding) setTimeout(async () => {
        if (showWhisper) return; // Don't stack with whisper
        try {
          const fullProgress = await getFullProgress();

          // Home nudge takes priority after 3+ puzzles without visiting home
          if (puzzlesSinceHomeVisit.current >= 3) {
            const nudge = getHomescreenNudge(
              persistence.currentPhase,
              fullProgress.unlockedAnimals || [],
              puzzlesSinceHomeVisit.current
            );
            if (nudge) {
              setInterjection(nudge);
              setShowInterjection(true);
              return;
            }
          }

          // Standard random interjection
          const interj = getAnimalInterjection(
            persistence.currentPhase,
            fullProgress.unlockedAnimals || [],
            fullProgress.puzzlesSolved || 0
          );
          if (interj) {
            setInterjection(interj);
            setShowInterjection(true);
          }
        } catch {
          // Interjections are non-critical
        }
      }, 2500);
    } else if (result === null && puzzle.selectedLetter) {
      // Slot press happened but was invalid
      hapticError();
      soundInvalidMove();
      setInvalidDropSignal(prev => prev + 1);
    } else if (result === null) {
      // No action
    } else {
      // Valid intermediate move — trigger star burst celebration
      hapticMedium();
      soundValidMove();
      setStarBurst({
        active: true,
        x: feedbackOrigin?.x ?? SCREEN_WIDTH / 2,
        y: feedbackOrigin?.y ?? SCREEN_HEIGHT * 0.4,
      });
      setTimeout(() => setStarBurst({ active: false, x: 0, y: 0 }), 600);

      // Track formed word for in-puzzle ritual echo chain
      if (result.formedWord) {
        setRitualEchoWords(prev => [...prev, result.formedWord!]);
      }

      // Dread word visual feedback — subtle dark pulse when a dread word is formed
      if (persistence.currentPhase >= 2 && result.formedWord && isDreadWord(result.formedWord)) {
        triggerDreadPulse(persistence.currentPhase);
      }
    }
  }, [
    puzzleActions,
    puzzle.difficulty,
    puzzle.selectedLetter,
    puzzle.gameState,
    persistenceActions,
    isPlayingDaily,
    victoryFlow.isProcessingVictory,
    victoryActions,
    achievementActions,
    onboardingStep,
    advanceOnboarding,
    tutorialGuidance,
  ]);

  const handleLetterPress = useCallback((letter: any, rowIndex: number) => {
    if (
      onboardingStep === 'puzzle_tutorial' &&
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
      onboardingStep === 'puzzle_tutorial' &&
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
  }, [puzzleActions, onboardingStep, puzzle.gameState, puzzle.selectedLetter, tutorialGuidance]);

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
    clearPuzzleState().catch(() => {});
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    setShowInterjection(false);
    setInterjection(null);
    setRitualEchoWords([]);
    setCompletionCoda(null);
    puzzleActions.handleNextLevel();
  }, [puzzleActions, victoryActions]);

  const handleReturnHome = useCallback(() => {
    hapticLight();
    puzzlesSinceHomeVisit.current = 0;
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    setIsPlayingDaily(false);
    setShowInterjection(false);
    setInterjection(null);
    setRitualEchoWords([]);
    setCompletionCoda(null);
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
      wordChain: puzzle.lastCompletedWords.length > 0 ? puzzle.lastCompletedWords : undefined,
      animalWhisper: whisper?.text,
      phase: persistence.currentPhase,
      incantationName: puzzle.lastIncantationName || undefined,
    });
  }, [victoryFlow.victoryData, puzzle, isPlayingDaily, whisper, persistence.currentPhase]);

  const handleVictoryTapAccelerate = useCallback(() => {
    if (victoryAnimatingRef.current && victoryFlow.victoryData) {
      victoryAnimatingRef.current = false;
      victoryActions.skipToEnd(victoryFlow.victoryData.earnedStars);
    }
  }, [victoryFlow.victoryData, victoryActions]);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    hapticLight();
    setRitualEchoWords([]);
    setCompletionCoda(null);
    puzzleActions.startNewGame(d, puzzle.gameMode, puzzle.selectedVariant);
  }, [puzzleActions, puzzle.gameMode, puzzle.selectedVariant]);

  const handleSelectVariant = useCallback((variant: PuzzleVariant) => {
    if (!isVariantUnlocked(variant, puzzlesSolvedForVariantUnlocks, persistence.currentPhase)) {
      return;
    }
    hapticSelection();
    soundTap();
    setRitualEchoWords([]);
    setCompletionCoda(null);
    puzzleActions.setSelectedVariant(variant);
    puzzleActions.startNewGame(puzzle.difficulty, puzzle.gameMode, variant);
  }, [
    puzzleActions,
    puzzle.difficulty,
    puzzle.gameMode,
    puzzlesSolvedForVariantUnlocks,
    persistence.currentPhase,
  ]);

  // Trigger dread pulse when a dread word is formed during a puzzle
  const triggerDreadPulse = useCallback((phase: number) => {
    // Haptic feedback on dread words
    if (phase >= 3) {
      hapticMedium();
    } else if (phase >= 2) {
      hapticLight();
    }

    if (getSettingsSync().reducedMotion) return;
    const maxOpacity = phase >= 4 ? 0.25 : phase >= 3 ? 0.18 : 0.10;
    Animated.sequence([
      Animated.timing(dreadPulseOpacity, {
        toValue: maxOpacity,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(dreadPulseOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Screen shake on dread words at Phase 3+
    if (phase >= 3) {
      const intensity = phase >= 4 ? 4 : 2;
      Animated.sequence([
        Animated.timing(screenShakeRef, { toValue: intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(screenShakeRef, { toValue: -intensity, duration: 50, useNativeDriver: true }),
        Animated.timing(screenShakeRef, { toValue: intensity * 0.5, duration: 50, useNativeDriver: true }),
        Animated.timing(screenShakeRef, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [dreadPulseOpacity, screenShakeRef]);

  const handleToggleChallengeMode = useCallback(() => {
    hapticMedium();
    setRitualEchoWords([]);
    setCompletionCoda(null);
    const newMode = puzzle.gameMode === 'challenge' ? 'standard' : 'challenge';
    puzzleActions.startNewGame(puzzle.difficulty, newMode, puzzle.selectedVariant);
  }, [puzzleActions, puzzle.gameMode, puzzle.difficulty, puzzle.selectedVariant]);

  // ========================================================================
  // Onboarding flow helpers (continued)
  // ========================================================================

  /** Handle "Continue" tap on the FoxGuide during onboarding */
  const handleOnboardingContinue = useCallback(async () => {
    switch (onboardingStep) {
      case 'home_empty':
        // This is handled by HomeScreen — tapping the den triggers fox_invited
        break;

      case 'fox_invited': {
        const lines = ONBOARDING_FOX_LINES.fox_invited;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          // Fox intro done — go to puzzle
          await advanceOnboarding('going_to_puzzle');
          // Small delay then navigate to puzzle
          setTimeout(async () => {
            await advanceOnboarding('puzzle_tutorial');
            persistenceActions.refreshStats();
            setRitualEchoWords([]);
            transitionTo('puzzle', () => {
              puzzleActions.startNewGame('EASY');
              logEvent({ type: 'puzzle_started', data: { difficulty: 'EASY', onboarding: true } });
            });
          }, 300);
        }
        break;
      }

      case 'puzzle_tutorial': {
        // Contextual guidance — handled by puzzle screen interactions
        // This handles the intro line before the player starts
        const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_intro;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        }
        // After intro, guide is hidden until player makes moves
        break;
      }

      case 'puzzle_complete': {
        const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_complete;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          // Navigate back to home for unlock explanation
          await advanceOnboarding('returning_home');
          hapticLight();
          puzzleActions.setShowConfetti(false);
          victoryActions.resetVictory();
          setRitualEchoWords([]);
          transitionTo('home', async () => {
            puzzleActions.setGameState(GameState.IDLE);
            await advanceOnboarding('unlock_explained');
          });
        }
        break;
      }

      case 'unlock_explained': {
        const lines = ONBOARDING_FOX_LINES.unlock_explained;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          // Onboarding complete!
          await markTutorialCompleted();
          await markTutorialSeedsPlanted().catch(() => {});
          await advanceOnboarding('complete');
        }
        break;
      }

      default:
        break;
    }
  }, [onboardingStep, onboardingLineIndex, advanceOnboarding, transitionTo, puzzleActions, persistenceActions, victoryActions, hapticLight]);

  /** Skip onboarding — during pre-puzzle steps, skip to tutorial puzzle; otherwise complete entirely */
  const handleSkipOnboarding = useCallback(async () => {
    if (onboardingStep === 'fox_invited' || onboardingStep === 'home_empty') {
      // Skip dialogue but continue to tutorial puzzle
      await advanceOnboarding('going_to_puzzle');
      setTimeout(async () => {
        await advanceOnboarding('puzzle_tutorial');
        persistenceActions.refreshStats();
        setRitualEchoWords([]);
        transitionTo('puzzle', () => {
          puzzleActions.startNewGame('EASY');
          logEvent({ type: 'puzzle_started', data: { difficulty: 'EASY', onboarding: true } });
        });
      }, 300);
    } else {
      // During/after puzzle: complete onboarding entirely
      await markTutorialCompleted();
      await markTutorialSeedsPlanted().catch(() => {});
      await advanceOnboarding('complete');
    }
  }, [onboardingStep, advanceOnboarding, persistenceActions, puzzleActions, transitionTo]);

  /** Get current Fox guide text for the active onboarding step */
  const getOnboardingFoxText = useCallback((): string => {
    const key = onboardingStep === 'puzzle_tutorial'
      ? 'puzzle_tutorial_intro'
      : onboardingStep;
    const lines = ONBOARDING_FOX_LINES[key];
    if (!lines || lines.length === 0) return '';
    return lines[Math.min(onboardingLineIndex, lines.length - 1)] || '';
  }, [onboardingStep, onboardingLineIndex]);

  /** Get the Fox guide button text for the current step */
  const getOnboardingButtonText = useCallback((): string => {
    switch (onboardingStep) {
      case 'fox_invited': {
        const lines = ONBOARDING_FOX_LINES.fox_invited;
        if (onboardingLineIndex === 0) return 'Nice to meet you!';
        if (onboardingLineIndex >= lines.length - 1) return "Let's go!";
        return 'Next';
      }
      case 'puzzle_tutorial':
        return 'Got it!';
      case 'puzzle_complete':
        return "Let's go home!";
      case 'unlock_explained': {
        const lines = ONBOARDING_FOX_LINES.unlock_explained;
        if (onboardingLineIndex >= lines.length - 1) return "Let's play!";
        return 'Next';
      }
      default:
        return 'Continue';
    }
  }, [onboardingStep, onboardingLineIndex]);

  // Show loading while onboarding state is being determined
  if (!onboardingReady) {
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
        <View style={styles.screenBackground}>
          <Animated.View style={{ flex: 1, opacity: screenFade }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <SettingsScreen onClose={() => transitionTo('home')} />
          </Animated.View>
        </View>
      );
    }

    if (currentScreen === 'ledger') {
      return (
        <View style={styles.screenBackground}>
          <Animated.View style={{ flex: 1, opacity: screenFade }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <WordLedger
              phase={persistence.currentPhase}
              onClose={() => transitionTo('home')}
            />
          </Animated.View>
        </View>
      );
    }

    if (currentScreen === 'gallery') {
      return (
        <View style={styles.screenBackground}>
          <Animated.View style={{ flex: 1, opacity: screenFade }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <WhisperGalleryScreen
              phase={persistence.currentPhase}
              onClose={() => transitionTo('home')}
            />
          </Animated.View>
        </View>
      );
    }

    if (currentScreen === 'stats') {
      return (
        <View style={styles.screenBackground}>
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
        </View>
      );
    }

    if (currentScreen === 'home') {
      return (
        <ErrorBoundary
          fallbackMessage="Something went wrong with the home screen. Tap to try again."
          onReset={() => setCurrentScreen('home')}
        >
          <View style={styles.screenBackground}>
            <Animated.View style={{ flex: 1, opacity: screenFade }}>
              <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
              <HomeScreen
                onPlayPuzzle={handlePlayPuzzle}
                onAmberChange={persistenceActions.setAmberBalance}
                onOpenSettings={() => transitionTo('settings')}
                onOpenStats={() => transitionTo('stats')}
                onOpenLedger={() => transitionTo('ledger')}
                onOpenGallery={() => transitionTo('gallery')}
                onStartDaily={handleStartDaily}
                onboardingStep={onboardingStep}
                onAdvanceOnboarding={advanceOnboarding}
              />
              {/* Achievement toast overlay */}
              <AchievementToast
                achievement={achievementState.currentAchievement}
                onDismiss={achievementActions.dismissAchievement}
                phase={persistence.currentPhase}
              />
              {/* Fox Guide overlay — shown during onboarding on home screen */}
              {isOnboarding && currentScreen === 'home' && (
                (onboardingStep === 'home_empty' ||
                 onboardingStep === 'fox_invited' ||
                 onboardingStep === 'unlock_explained') && (
                  <FoxGuide
                    visible={true}
                    variant="dialogue"
                    text={getOnboardingFoxText()}
                    buttonText={getOnboardingButtonText()}
                    onContinue={onboardingStep === 'home_empty' ? undefined : handleOnboardingContinue}
                    showSkip={onboardingStep !== 'unlock_explained'}
                    onSkip={handleSkipOnboarding}
                    position={onboardingStep === 'home_empty' ? 'middle' : 'bottom'}
                    anchorStyle={onboardingStep === 'home_empty'
                      ? {
                          top: Math.min(SCREEN_HEIGHT * 0.56, 430),
                          left: 12,
                          right: 12,
                        }
                      : undefined}
                  />
                )
              )}
            </Animated.View>
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
      <View style={styles.screenBackground}>
      <Animated.View style={[styles.container, { opacity: screenFade, transform: [{ translateX: screenShakeRef }] }]}>
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
          {!isOnboarding ? (
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
        {isOnboarding ? null : (
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
            {speedTimeRemaining !== null && (
              <View style={[
                styles.speedBadge,
                speedTimeRemaining <= 10 && styles.speedBadgeUrgent,
              ]}>
                <Text style={styles.speedBadgeText}>⏱ {speedTimeRemaining}s</Text>
              </View>
            )}
            {hasVariantModifier(puzzle.currentVariant, 'chain') && puzzle.chainLength > 1 && (
              <View style={styles.chainBadge}>
                <Text style={styles.chainBadgeText}>
                  LINK {puzzle.currentChainLink}/{puzzle.chainLength}
                </Text>
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
                wordLength={puzzle.currentWordLength}
                concealLetters={
                  hasVariantModifier(puzzle.currentVariant, 'blind') &&
                  idx !== puzzle.activeRowIndex &&
                  !puzzle.blindRevealedRows.includes(idx)
                }
                guidanceActive={onboardingStep === 'puzzle_tutorial'}
                guidedLetterId={tutorialGuidance?.sourceLetterId || null}
                guidedSlotIndex={tutorialGuidance?.targetSlotIndex ?? null}
                invalidDropSignal={invalidDropSignal}
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
          {!isOnboarding && (
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

        {/* Victory Modal — extracted component (hidden during onboarding so FoxGuide is visible) */}
        <VictoryModal
          visible={puzzle.gameState === GameState.WON && !(isOnboarding && (onboardingStep === 'puzzle_tutorial' || onboardingStep === 'puzzle_complete'))}
          earnedStars={puzzle.earnedStars}
          level={puzzle.level}
          difficulty={puzzle.difficulty}
          amberBalance={persistence.amberBalance}
          phase={persistence.currentPhase}
          isPlayingDaily={isPlayingDaily}
          victoryData={victoryFlow.victoryData}
          completionCoda={completionCoda}
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

        {/* Victory Glitch — brief flash text during Phase 0 victories */}
        {showVictoryGlitch && victoryGlitch && (
          <View style={styles.victoryGlitchOverlay} pointerEvents="none">
            <Text style={styles.victoryGlitchText}>{victoryGlitch}</Text>
          </View>
        )}

        {/* Narrative Micro-Beat — surprise moments at puzzle milestones */}
        {showMicroBeat && microBeat && (
          <View style={[
            styles.victoryGlitchOverlay,
            microBeat.type === 'ambient_whisper' && styles.microBeatWhisperOverlay,
          ]} pointerEvents="none">
            <Text style={[
              microBeat.type === 'glitch_title' ? styles.victoryGlitchText : styles.microBeatWhisperText,
            ]}>
              {microBeat.type === 'glitch_title' ? microBeat.glitchTitle : microBeat.text}
            </Text>
          </View>
        )}

        {/* Animal Whisper — ghost-like message from an animal after puzzle completion */}
        <AnimalWhisper
          visible={showWhisper}
          animalName={whisper?.animalName || ''}
          whisperText={whisper?.text || ''}
          phase={persistence.currentPhase}
          onComplete={() => setShowWhisper(false)}
        />

        {/* Animal Interjection — brief message pulling player to home screen */}
        {showInterjection && interjection && !showWhisper && (
          <View style={styles.interjectionContainer}>
            <Text style={[
              styles.interjectionText,
              persistence.currentPhase >= 3 && styles.interjectionTextDark,
            ]}>
              {interjection.text}
            </Text>
          </View>
        )}

        {/* Dread Pulse — subtle dark flash when a dread word is formed */}
        <Animated.View
          style={[styles.dreadPulseOverlay, { opacity: dreadPulseOpacity }]}
          pointerEvents="none"
        />

        {/* Fox Guide overlay — shown during onboarding on puzzle screen */}
        {isOnboarding && (onboardingStep === 'puzzle_tutorial' || onboardingStep === 'puzzle_complete') && (
          <FoxGuide
            visible={true}
            variant="dialogue"
            text={
              onboardingStep === 'puzzle_complete'
                ? ONBOARDING_FOX_LINES.puzzle_tutorial_complete[
                    Math.min(onboardingLineIndex, ONBOARDING_FOX_LINES.puzzle_tutorial_complete.length - 1)
                  ]
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
              onboardingStep === 'puzzle_complete'
                ? "Let's go home!"
                : undefined
            }
            onContinue={
              onboardingStep === 'puzzle_complete'
                ? handleOnboardingContinue
                : undefined
            }
            position="bottom"
            anchorStyle={
              onboardingStep === 'puzzle_complete'
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
      </View>
      </ErrorBoundary>
    );
  };

  // Render screen with global phase transition overlay on top
  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {/* Phase transition overlay — renders above ALL screens */}
      <PhaseTransitionOverlay
        event={phaseTransitionEvent}
        onComplete={() => setPhaseTransitionEvent(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  initialLoadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  initialLoadingCard: {
    minWidth: 220,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  initialLoadingTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1.2,
  },
  initialLoadingSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.4,
  },
  screenBackground: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
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
  difficultyDotMediumPlus: {
    backgroundColor: CandyColors.orange.main,
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
  loadingGlyph: {
    marginTop: 8,
    fontSize: 18,
    color: CandyColors.purple.main,
    opacity: 0.8,
  },
  loadingHint: {
    marginTop: 6,
    fontSize: 11,
    color: CandyColors.gray[500],
    fontWeight: '600',
    letterSpacing: 0.2,
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
  speedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  speedBadgeUrgent: {
    backgroundColor: 'rgba(210, 40, 70, 0.78)',
  },
  speedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 0.3,
  },
  chainBadge: {
    backgroundColor: 'rgba(95, 180, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chainBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(220, 240, 255, 0.95)',
    letterSpacing: 0.3,
  },
  variantBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
  },
  variantBadgeDark: {
    backgroundColor: 'rgba(35, 18, 45, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(130, 70, 120, 0.35)',
  },
  variantBadgeIcon: {
    fontSize: 10,
  },
  variantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  variantBadgeTextDark: {
    color: 'rgba(220, 170, 200, 0.95)',
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
  dreadPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 0, 30, 1)',
    zIndex: 998,
  },
  victoryGlitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  victoryGlitchText: {
    color: '#FF0040',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#FF0040',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  microBeatWhisperOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  microBeatWhisperText: {
    color: 'rgba(200, 180, 220, 0.9)',
    fontSize: 18,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 40,
    letterSpacing: 1,
    textShadowColor: 'rgba(150, 100, 200, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  interjectionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 500,
  },
  interjectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    backgroundColor: 'rgba(100, 60, 140, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  interjectionTextDark: {
    color: 'rgba(200, 160, 180, 0.9)',
    backgroundColor: 'rgba(30, 15, 40, 0.7)',
  },
});
