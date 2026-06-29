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
  Linking,
  BackHandler,
  Alert,
} from 'react-native';
import { GameState, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti, StarBurst } from './src/components/Confetti';
import { ActionButton, AnimatedLogo, Toast, VictoryModal, RulesModal, DifficultyMenu, RitualEchoChain } from './src/components/puzzle';
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
import {
  awardBonusAmber,
  spendAmber,
  hasSeenSetupSelectorIntro,
  markSetupSelectorIntroSeen,
  hasSeenPitHarvestIntro,
  markPitHarvestIntroSeen,
  consumePendingVariantTutorial,
  checkFreeStreakFreeze,
  isHouseCompleted,
  isFinalPuzzleCompleted,
  markFinalPuzzleCompleted,
  isPostRevelation,
  markPostRevelation,
} from './src/services/amberCurrency';
import { claimDailyLoginReward, DailyLoginGrant } from './src/services/dailyLoginReward';
import { DailyLoginModal } from './src/components/DailyLoginModal';
import { PatronModal } from './src/components/monetization/PatronModal';
import { submitDailyResult, getDailyRank, DailyRank } from './src/services/leaderboard';
import { recordPuzzleContribution, getAggregateProof, getWordsOfferedText } from './src/services/socialProof';
import { StatsScreen } from './src/components/StatsScreen';
import { AchievementToast } from './src/components/AchievementToast';
import { PhaseTransitionOverlay } from './src/components/PhaseTransitionOverlay';
import { ShareableResult } from './src/services/shareResults';
import { initShareImage } from './src/services/shareImage';
import { ShareResultModal } from './src/components/share/ShareResultModal';
import { getLocalDateString } from './src/services/dateUtils';
import { getSettingsSync } from './src/services/settings';
import { initAudio, soundVictory, soundPerfect, soundValidMove, soundInvalidMove, soundUndo, soundHint, soundTap } from './src/services/audio';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticWarning, hapticError, hapticSelection } from './src/services/haptics';
import { getVariantTutorialIntroLines } from './src/services/animalDialogue';
import {
  getPhaseIndicator,
  getLoadingMessage,
  getRitualMicroEvent,
  getHarvestOverflowMessage,
  getFoxSetupSelectorIntroLines,
  getFoxPitHarvestIntroLines,
  getNotificationPromptText,
  getSpeedTimeUpMessage,
  getDragMissMessage,
} from './src/services/phaseNarrative';
import { getPhaseTransitionEvent, PhaseTransitionEvent, FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT } from './src/services/phaseEvents';
import { generateDailyPuzzle, prewarmDailyPuzzle, isDailyChallengeUnlocked, recordDailyCompletion, getDailyStatus, checkDailyStreakMilestone } from './src/services/dailyChallenge';
import { startFrameMonitoring, stopFrameMonitoring } from './src/services/performanceMonitor';
import { AnimalWhisper } from './src/components/puzzle/AnimalWhisper';
import { WordLedger } from './src/components/WordLedger';
import { WhisperGalleryScreen } from './src/components/WhisperGalleryScreen';
import { isDreadWord, validateWord } from './src/services/localGenerator';
import {
  scheduleAllNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  hasPromptedForNotifications,
  markPromptedForNotifications,
} from './src/services/notifications';
import { runMigrations } from './src/services/dataMigration';
import { initIAP, setBillingProvider } from './src/services/iap';
import { initAds, setAdProvider, maybeShowInterstitial, showRewarded, isRewardedCapReached } from './src/services/ads';
import { initCosmetics } from './src/services/cosmetics';
import { initHints, addHints } from './src/services/hints';
import { StoreModal } from './src/components/monetization/StoreModal';
import { recordInterstitialSeen, consumePatronNudge, consumeRemoveAdsNudge } from './src/services/monetizationPrompts';
import { REWARDED_HINT_GRANT } from './src/constants/gameBalance';
import { createRevenueCatBillingProvider } from './src/services/providers/revenueCatBilling';
import { createAdMobAdProvider } from './src/services/providers/googleAdMobAds';
import { installGlobalErrorHandler } from './src/services/errorReporting';
import { AUTO_COLLECT_PUZZLE_LIMIT, AMBER_UNDO_REFILL_COST } from './src/constants/gameBalance';
import { markPendingChanges, uploadToCloud, installCloudProviderIfConfigured, maybeAutoRestoreOnFreshInstall } from './src/services/cloudSave';
import { initCrashReporter } from './src/services/crashReporter';
import { estimateSlotIndex, findClosestValidSlot } from './src/services/slotEstimation';
import { DROP_SHAKE_KEYFRAME_MS, DROP_SHAKE_INTENSITY, SPEED_ESCALATION_STEP_SEC, SPEED_ESCALATION_MIN_SEC } from './src/constants/timing';
import { OfferingPitScreen } from './src/components/OfferingPitScreen';
import { ShopScreen } from './src/components/shop/ShopScreen';
import { loadPuzzleState, clearPuzzleState } from './src/services/puzzleSaveState';
import { offerBatch } from './src/services/wordHarvest';
import {
  hasVariantModifier,
  getNewlyUnlockedVariants,
  getVariantTimeLimit,
  getVariantTimeLimitForDifficulty,
  getVariantSelectorOptions,
  isVariantUnlocked,
  PuzzleVariant,
  VARIANT_CONFIGS,
} from './src/services/puzzleVariety';
import { appStyles as styles, getScreenBackgroundColor } from './src/styles/appStyles';

// App screen type — expanded with settings, stats, and ledger
type AppScreen = 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery' | 'pit' | 'shop';

type PostVictoryIntroKind = 'variant_unlock' | 'home_tools';
interface PostVictoryIntro {
  kind: PostVictoryIntroKind;
  lines: string[];
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Install the global error handler at module load so it catches errors as
// early as possible — including errors thrown during the first render.
installGlobalErrorHandler();
// Register remote crash forwarding (no-op unless extra.sentryDsn is configured),
// so captured errors reach a collector as soon as one is wired.
initCrashReporter();

function MainApp() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [homePanY, setHomePanY] = useState<number | null>(null);

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

  // Guard: pit-resume useEffect should only fire on initial mount
  const pitResumeCheckedRef = useRef(false);
  const freeFreezeCheckedRef = useRef(false);
  const dailyLoginCheckedRef = useRef(false);
  // Patron (cosmetic IAP) modal — opened from Shop header / Settings
  const [showPatronModal, setShowPatronModal] = useState(false);
  // Store modal — consumable amber/hint packs + the cosmetic bundle.
  const [showStoreModal, setShowStoreModal] = useState(false);
  // Solve-time stopwatch for the Daily Challenge leaderboard (ms since board ready)
  const puzzleStartTimeRef = useRef<number>(0);
  // Daily Challenge leaderboard standing for the current victory (null = none/off)
  const [dailyRank, setDailyRank] = useState<DailyRank | null>(null);
  // Quiet, spoiler-safe aggregate social-proof line for the victory modal
  const [socialProofLine, setSocialProofLine] = useState<string | null>(null);
  // Optional rewarded "double the reward" — one claim per victory
  const [victoryDoubleClaimed, setVictoryDoubleClaimed] = useState(false);

  // Phase transition overlay state
  const [phaseTransitionEvent, setPhaseTransitionEvent] = useState<PhaseTransitionEvent | null>(null);

  // True while the player is in a Daily Challenge run (drives autosave tagging,
  // victory recording, and the VictoryModal "Daily Challenge Complete" header).
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);
  // Result-card share preview (null = closed).
  const [shareResultData, setShareResultData] = useState<ShareableResult | null>(null);

  // Daily-login claim modal — set to the already-granted reward to present it
  // (null = closed). Purely presentational; amber is credited before this is set.
  const [dailyLoginGrant, setDailyLoginGrant] = useState<DailyLoginGrant | null>(null);

  // Speed-variant escalation: consecutive speed wins increment this, shortening
  // each subsequent clock. Reset on time-up or whenever a fresh run begins.
  const [speedRound, setSpeedRound] = useState(0);

  // Restored speed timer value (consumed once by the speed timer effect)
  const restoredSpeedTimeRef = useRef<number | null>(null);

  // One-time post-tutorial setup reveal
  const [showSetupSelectorIntro, setShowSetupSelectorIntro] = useState(false);
  const [setupSelectorIntroIndex, setSetupSelectorIntroIndex] = useState(0);
  const setupSelectorLines = useMemo(
    () => getFoxSetupSelectorIntroLines(persistence.currentPhase),
    [persistence.currentPhase]
  );
  const [postVictoryIntro, setPostVictoryIntro] = useState<PostVictoryIntro | null>(null);
  const [postVictoryIntroIndex, setPostVictoryIntroIndex] = useState(0);
  const queuedPostVictoryIntrosRef = useRef<PostVictoryIntro[]>([]);
  const pendingPostVictoryActionRef = useRef<(() => void) | null>(null);

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
    setSpeedRound(0); // Failing the clock resets the escalation ladder.
    hapticWarning();
    soundInvalidMove();
    setPuzzleMessage(getSpeedTimeUpMessage(persistence.currentPhase));
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
    const baseLimit = getVariantTimeLimitForDifficulty(puzzle.currentVariant, puzzle.difficulty)
      ?? getVariantTimeLimit(puzzle.currentVariant)
      ?? 60;
    // Escalate pressure across a speed streak: each consecutive win trims the
    // clock, floored so it never becomes impossible.
    const escalatedLimit = Math.max(
      SPEED_ESCALATION_MIN_SEC,
      baseLimit - speedRound * SPEED_ESCALATION_STEP_SEC
    );
    const initialRemaining = restoredSpeedTimeRef.current ?? escalatedLimit;
    restoredSpeedTimeRef.current = null;
    startSpeedTimer(initialRemaining);
  }, [
    puzzle.currentVariant,
    puzzle.gameState,
    puzzle.difficulty,
    speedRound,
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
    // Frame-rate monitoring is a diagnostic-only tool: its samples are never
    // read in production (no consumer, telemetry disabled by default), so the
    // perpetual requestAnimationFrame loop would be pure battery/CPU cost on
    // every device. Restrict it to dev builds; stop it on unmount.
    if (__DEV__) {
      startFrameMonitoring();
    }
    scheduleAllNotifications(0).catch(() => {});
    uploadToCloud().catch(() => {});
    return () => {
      if (__DEV__) {
        stopFrameMonitoring();
      }
    };
  }, []);

  // Android hardware back button: sub-screens navigate home; home exits the app.
  // Swallowed during onboarding so back can't break the guided flow.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onboardingFlow.isOnboarding) {
        return true;
      }
      if (currentScreen !== 'home') {
        // Mirror the in-UI home button: reset transient puzzle UI state
        // (mid-puzzle progress itself is preserved by autosave).
        transitionTo('home', () => {
          if (currentScreen === 'puzzle') {
            puzzleActions.setGameState(GameState.IDLE);
            puzzleActions.setShowConfetti(false);
          }
        });
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [currentScreen, transitionTo, onboardingFlow.isOnboarding, puzzleActions]);

  // Resume the correct screen if onboarding was interrupted (initial mount only).
  // The onboarding hook has already normalized transient steps to stable ones,
  // so here we only need to map a stable step to its owning screen. Without this,
  // a kill during the puzzle/pit/return beats would relaunch to a dead home
  // screen (no Fox guide, no Play button) — an unrecoverable first-session brick.
  useEffect(() => {
    if (onboardingFlow.onboardingReady && !pitResumeCheckedRef.current) {
      pitResumeCheckedRef.current = true;
      const step = onboardingFlow.onboardingStep;
      if (step === 'going_to_pit' || step === 'pit_intro' || step === 'pit_offering') {
        setCurrentScreen('pit');
      } else if (step === 'puzzle_tutorial') {
        // Re-init the guided tutorial puzzle so the player resumes a live,
        // winnable board with the Fox overlay rather than a dead screen.
        setCurrentScreen('puzzle');
        puzzleActions.startNewGame('EASY');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.onboardingReady, onboardingFlow.onboardingStep]);

  // Free streak freeze: grant one every 14 days (and one on first launch).
  // Runs once per session after boot. Granted silently during onboarding;
  // afterwards a gentle notice tells the player their streak is protected.
  useEffect(() => {
    if (!onboardingFlow.onboardingReady || freeFreezeCheckedRef.current) return;
    freeFreezeCheckedRef.current = true;
    (async () => {
      try {
        const granted = await checkFreeStreakFreeze();
        if (granted && !onboardingFlow.isOnboarding) {
          Alert.alert(
            'Free Streak Freeze',
            'Your streak is protected for one missed day. Keep the chain alive.'
          );
        }
      } catch {
        // Non-critical — never block launch on a freeze grant.
      }
    })();
  }, [onboardingFlow.onboardingReady, onboardingFlow.isOnboarding]);

  // Daily login reward: rewards opening the app (not just solving). Runs once per
  // session after boot, skipped during onboarding so the first session isn't
  // interrupted before the player understands amber.
  useEffect(() => {
    if (!onboardingFlow.onboardingReady || dailyLoginCheckedRef.current) return;
    if (onboardingFlow.isOnboarding) return;
    dailyLoginCheckedRef.current = true;
    (async () => {
      try {
        const grant = await claimDailyLoginReward();
        if (grant) {
          persistenceActions.refreshStats();
          setDailyLoginGrant(grant);
        }
      } catch {
        // Non-critical — never block launch on the login reward.
      }
    })();
  }, [onboardingFlow.onboardingReady, onboardingFlow.isOnboarding]);

  // Pre-generate today's daily puzzle in the background once it's unlocked, so
  // tapping the Daily Challenge card opens instantly instead of waiting on the
  // seeded 6-letter / 5-row generation (noticeable on low-end devices).
  useEffect(() => {
    if (onboardingFlow.isOnboarding) return;
    if (!isDailyChallengeUnlocked(puzzlesSolvedForVariantUnlocks, persistence.currentPhase)) return;
    prewarmDailyPuzzle();
  }, [onboardingFlow.isOnboarding, puzzlesSolvedForVariantUnlocks, persistence.currentPhase]);

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

  const maybeShowSetupSelectorIntro = useCallback(async () => {
    if (onboardingFlow.isOnboarding) return;
    const seen = await hasSeenSetupSelectorIntro();
    if (seen) return;

    setSetupSelectorIntroIndex(0);
    setTimeout(() => {
      setShowSetupSelectorIntro(true);
      puzzleActions.setShowDifficultyMenu(true);
    }, 250);
  }, [onboardingFlow.isOnboarding, puzzleActions]);

  const dismissSetupSelectorIntro = useCallback(async () => {
    await markSetupSelectorIntroSeen();
    setShowSetupSelectorIntro(false);
  }, []);

  const handleAdvanceSetupSelectorIntro = useCallback(async () => {
    const nextIndex = setupSelectorIntroIndex + 1;
    if (nextIndex < setupSelectorLines.length) {
      setSetupSelectorIntroIndex(nextIndex);
      return;
    }

    await dismissSetupSelectorIntro();
  }, [setupSelectorIntroIndex, setupSelectorLines.length, dismissSetupSelectorIntro]);

  const advanceQueuedPostVictoryIntro = useCallback(async () => {
    const nextIntro = queuedPostVictoryIntrosRef.current.shift() ?? null;

    if (!nextIntro) {
      setPostVictoryIntro(null);
      const action = pendingPostVictoryActionRef.current;
      pendingPostVictoryActionRef.current = null;
      action?.();
      return;
    }

    if (nextIntro.kind === 'variant_unlock') {
      await consumePendingVariantTutorial();
    }

    setPostVictoryIntroIndex(0);
    setPostVictoryIntro(nextIntro);
  }, []);

  const dismissPostVictoryIntro = useCallback(async () => {
    if (postVictoryIntro?.kind === 'home_tools') {
      await markPitHarvestIntroSeen();
    }
    setPostVictoryIntro(null);
    await advanceQueuedPostVictoryIntro();
  }, [postVictoryIntro, advanceQueuedPostVictoryIntro]);

  const handleAdvancePostVictoryIntro = useCallback(async () => {
    if (!postVictoryIntro) return;
    const nextIndex = postVictoryIntroIndex + 1;
    if (nextIndex < postVictoryIntro.lines.length) {
      setPostVictoryIntroIndex(nextIndex);
      return;
    }

    await dismissPostVictoryIntro();
  }, [postVictoryIntro, postVictoryIntroIndex, dismissPostVictoryIntro]);

  const startVictoryExitFlow = useCallback((action: () => void) => {
    clearVictoryTimeouts();
    // The completed puzzle's autosave must never be resumable from Play
    clearPuzzleState().catch(() => {});
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);

    if (queuedPostVictoryIntrosRef.current.length > 0) {
      pendingPostVictoryActionRef.current = action;
      advanceQueuedPostVictoryIntro().catch(() => {
        const pendingAction = pendingPostVictoryActionRef.current;
        pendingPostVictoryActionRef.current = null;
        pendingAction?.();
      });
      return;
    }

    action();
  }, [clearVictoryTimeouts, puzzleActions, victoryActions, orchestrationActions, advanceQueuedPostVictoryIntro]);

  // ========================================================================
  // Navigation & puzzle lifecycle handlers
  // ========================================================================

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = useCallback((difficulty?: Difficulty) => {
    hapticLight();
    soundTap();
    setIsPlayingDaily(false);
    setSpeedRound(0);
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    const diff = difficulty || puzzle.difficulty;
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    transitionTo('puzzle', async () => {
      // Check for saved in-progress puzzle
      const saved = await loadPuzzleState();
      if (saved && saved.gameState === 'PLAYING' && !saved.isPlayingDaily) {
        puzzleActions.restorePuzzleState(saved);
        // Restore speed timer from the saved remaining seconds so a kill/
        // relaunch resumes the countdown instead of expiring it. Legacy
        // saves without the field fall back to the absolute expiry timestamp.
        if (saved.speedTimeRemainingSec != null) {
          restoredSpeedTimeRef.current = Math.max(0, saved.speedTimeRemainingSec);
        } else if (saved.speedTimerExpireAt != null) {
          restoredSpeedTimeRef.current = Math.max(0, Math.floor((saved.speedTimerExpireAt - Date.now()) / 1000));
        }
        logEvent({
          type: 'puzzle_restored',
          data: { difficulty: saved.difficulty },
        });
        maybeShowSetupSelectorIntro().catch(() => {});
      } else {
        clearPuzzleState().catch(() => {});
        await puzzleActions.startNewGame(diff);
        logEvent({ type: 'puzzle_started', data: { difficulty: diff } });
        maybeShowSetupSelectorIntro().catch(() => {});
      }
    });
  }, [puzzle.difficulty, puzzleActions, transitionTo, persistenceActions, orchestrationActions, maybeShowSetupSelectorIntro]);

  const handleIncomingLink = useCallback((url: string) => {
    if (!url.startsWith('wordshift://')) return;
    logEvent({ type: 'deep_link_opened', data: { url } });

    if (onboardingFlow.onboardingStep && onboardingFlow.onboardingStep !== 'complete') {
      return;
    }

    if (url.includes('home')) {
      transitionTo('home');
    }
  }, [onboardingFlow.onboardingStep, transitionTo]);

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleIncomingLink(url);
    }).catch(() => {});

    const subscription = Linking.addEventListener('url', event => {
      handleIncomingLink(event.url);
    });

    return () => subscription.remove();
  }, [handleIncomingLink]);

  // Return to home screen
  const handleGoHome = useCallback(() => {
    hapticLight();
    puzzlesSinceHomeVisit.current = 0;
    setIsPlayingDaily(false);
    setSpeedRound(0);
    transitionTo('home', () => {
      puzzleActions.setGameState(GameState.IDLE);
      puzzleActions.setShowConfetti(false);
    });
  }, [puzzleActions, transitionTo]);

  // Start the Daily Challenge (seeded, always HARD: 6-letter words, 5 rows).
  const handleStartDaily = useCallback((_difficulty: Difficulty) => {
    hapticLight();
    soundTap();
    persistenceActions.refreshStats();
    setRitualEchoWords([]);
    orchestrationActions.setCompletionCoda(null);
    setIsPlayingDaily(true);
    setSpeedRound(0);
    transitionTo('puzzle', async () => {
      puzzleActions.setGameState(GameState.LOADING);
      puzzleActions.setMessage(getLoadingMessage(persistence.currentPhase));
      try {
        const daily = await generateDailyPuzzle();
        puzzleActions.startDailyGame(daily.words, daily.hint, daily.wordLength);
        puzzleStartTimeRef.current = Date.now();
        logEvent({ type: 'puzzle_started', data: { difficulty: 'HARD', daily: true } });
        maybeShowSetupSelectorIntro().catch(() => {});
      } catch {
        // Daily generation failed — fall back to a standard HARD puzzle so the
        // player is never stranded on a loading screen.
        setIsPlayingDaily(false);
        await puzzleActions.startNewGame('HARD');
      }
    });
  }, [puzzleActions, transitionTo, persistenceActions, orchestrationActions, persistence.currentPhase, maybeShowSetupSelectorIntro]);

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
      // Speed streak: a completed speed puzzle ratchets up the next clock.
      if (hasVariantModifier(puzzle.currentVariant, 'speed')) {
        setSpeedRound(prev => prev + 1);
      }
      // Clear mid-puzzle save on completion
      clearPuzzleState().catch(() => {});

      // Lock interaction during async victory chain
      victoryActions.setProcessingVictory(true);
      hapticSuccess();

      const victory = await persistenceActions.recordVictory(
        // Daily Challenge always rewards as HARD regardless of the player's
        // chosen difficulty preference (which is left untouched during a daily).
        isPlayingDaily ? 'HARD' : puzzle.difficulty,
        result.hintsUsed,
        result.invalidAttempts,
        result.gameMode,
        result.completedWords,
        result.variant || 'standard',
        isPlayingDaily
      );

      // Aggregate social proof: contribute this puzzle's words to the global
      // daily count (spoiler-safe, anonymous). No-op until the backend is on.
      recordPuzzleContribution(result.completedWords?.length ?? 0);
      setSocialProofLine(null);
      setVictoryDoubleClaimed(false);
      (async () => {
        try {
          const proof = await getAggregateProof();
          if (proof && proof.wordsOfferedToday > 0) {
            setSocialProofLine(getWordsOfferedText(proof.wordsOfferedToday, persistence.currentPhase));
          }
        } catch {
          // Social proof is decorative — never block the victory flow.
        }
      })();

      // Record Daily Challenge completion + streak milestone (deferred toast).
      if (isPlayingDaily) {
        // Submit to the daily leaderboard and fetch standing for the modal.
        // Fire-and-forget; both no-op (null) until the backend is configured.
        setDailyRank(null);
        (async () => {
          try {
            const elapsedMs = puzzleStartTimeRef.current > 0
              ? Date.now() - puzzleStartTimeRef.current
              : 0;
            await submitDailyResult({
              date: getLocalDateString(),
              timeMs: elapsedMs,
              stars: victory.earnedStars,
              hintsUsed: result.hintsUsed,
            });
            const rank = await getDailyRank(getLocalDateString());
            if (rank) setDailyRank(rank);
          } catch {
            // Leaderboard is non-critical — never block the victory flow.
          }
        })();
        try {
          const before = await getDailyStatus();
          const dailyProgress = await recordDailyCompletion(
            victory.earnedStars,
            result.hintsUsed,
            result.invalidAttempts
          );
          logEvent({
            type: 'daily_completed',
            data: { stars: victory.earnedStars, streak: dailyProgress.currentStreak },
          });
          const milestone = checkDailyStreakMilestone(
            dailyProgress.currentStreak,
            before.streak,
            persistence.currentPhase
          );
          if (milestone) {
            const newBalance = await awardBonusAmber(milestone.amber, 'daily_streak_milestone');
            persistenceActions.setAmberBalance(newBalance);
            addVictoryTimeout(() => {
              puzzleActions.setMessage(`${milestone.message} (+${milestone.amber} amber)`);
            }, 1100);
          } else if (dailyProgress.streakSavedByFreeze) {
            // A banked freeze forgave a missed day — let the player know the
            // chain survived so the protection feels real, not silent.
            addVictoryTimeout(() => {
              puzzleActions.setMessage('🛡️ A missed day — but your daily streak held.');
            }, 1100);
          }
        } catch {
          // Daily recording is non-critical — never block the victory flow.
        }
      }

      let finalVictory = victory;
      const shouldAutoCollectVictory = (
        (onboardingFlow.onboardingStep === undefined || onboardingFlow.onboardingStep === 'complete') &&
        !victory.phaseTransitionPending &&
        !!victory.harvestBatchId &&
        ((victory.cumulativeStats?.totalPuzzlesCompleted ?? 0) <= AUTO_COLLECT_PUZZLE_LIMIT)
      );

      if (shouldAutoCollectVictory && victory.harvestBatchId) {
        const autoCollected = await offerBatch(victory.harvestBatchId);
        if (autoCollected && autoCollected.amberAwarded > 0) {
          const newBalance = await awardBonusAmber(autoCollected.amberAwarded, 'auto_word_offering');
          persistenceActions.setAmberBalance(newBalance);
          logEvent({
            type: 'harvest_auto_collected',
            data: {
              amberAwarded: autoCollected.amberAwarded,
              wordsOffered: autoCollected.wordsOffered,
              puzzlesSolved: victory.cumulativeStats?.totalPuzzlesCompleted ?? 0,
            },
          });
          finalVictory = {
            ...victory,
            amberBalance: newBalance,
            pendingHarvest: autoCollected.remainingSummary,
            autoCollected: true,
          };
        }
      }

      const completedTotal = finalVictory.cumulativeStats?.totalPuzzlesCompleted ?? 0;
      const immediateIntros: PostVictoryIntro[] = [];
      const newlyUnlockedVariants = getNewlyUnlockedVariants(completedTotal, finalVictory.newPhase);
      if (newlyUnlockedVariants.length > 0) {
        const lines = getVariantTutorialIntroLines(newlyUnlockedVariants[0], finalVictory.newPhase);
        if (lines && lines.length > 0) {
          immediateIntros.push({
            kind: 'variant_unlock',
            lines,
          });
        }
      }
      // Fox explains manual harvesting exactly when the auto-collect window
      // closes (the NEXT puzzle's amber will queue in the pit).
      if (completedTotal === AUTO_COLLECT_PUZZLE_LIMIT && !(await hasSeenPitHarvestIntro())) {
        immediateIntros.push({
          kind: 'home_tools',
          lines: getFoxPitHarvestIntroLines(finalVictory.newPhase),
        });
      }
      queuedPostVictoryIntrosRef.current = immediateIntros;

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

      // Surface the "your streak was protected" moment when a freeze was consumed
      if (victory.streakSaved) {
        addVictoryTimeout(() => {
          puzzleActions.setMessage('🛡️ A streak freeze protected your streak!');
        }, 600);
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
      victoryActions.setVictoryData(finalVictory);

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
      addVictoryTimeout(() => achievementActions.checkForAchievements(finalVictory), 500);

      // Post-victory orchestration: glitch, micro-beat, whisper, interjection
      orchestrationActions.processVictory({
        phase: persistence.currentPhase,
        totalPuzzlesCompleted: finalVictory.cumulativeStats?.totalPuzzlesCompleted ?? 1,
        completedWords: result.completedWords,
        isOnboarding: onboardingFlow.isOnboarding,
        puzzlesSinceHomeVisit: puzzlesSinceHomeVisit.current,
      });

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
      // Valid intermediate move.
      const wasDragDrop = isDragDropRef.current;
      isDragDropRef.current = false;

      // Double-shift drop1 is only HALF a move — the first of two letters is
      // placed but no word is formed yet (no formedWord). Give it an honest
      // "click into place" (soft haptic + tap sound + catch bounce) instead of
      // the full star-burst celebration, which is reserved for completed words.
      const isHalfMove = !result.formedWord && !result.completed;

      if (isHalfMove) {
        hapticSelection();
        soundTap();
        if (wasDragDrop) setSuccessDropSignal(prev => prev + 1);
        return;
      }

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

      // Target-row catch bounce on BOTH inputs so the placed tile always
      // "lands" — the default/accessible tap path used to skip this and feel
      // noticeably flatter than a drag-drop.
      setSuccessDropSignal(prev => prev + 1);

      // Screen micro-shake via the existing dread-shake infrastructure, scaled
      // by input: a firm thud for drag-drop, a lighter tick for tap. Drag still
      // feels heavier (and gets hapticHeavy above), but tap is no longer silent
      // on screen.
      {
        const settings = getSettingsSync();
        if (!settings.reducedMotion) {
          const intensity = wasDragDrop ? DROP_SHAKE_INTENSITY : DROP_SHAKE_INTENSITY * 0.45;
          dropShakeAnimRef.current?.stop();
          const shakeAnim = Animated.sequence([
            Animated.timing(dreadEffects.screenShakeRef, { toValue: intensity, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: -intensity, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: intensity * 0.5, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
            Animated.timing(dreadEffects.screenShakeRef, { toValue: 0, duration: DROP_SHAKE_KEYFRAME_MS, useNativeDriver: true }),
          ]);
          dropShakeAnimRef.current = shakeAnim;
          shakeAnim.start(() => { dropShakeAnimRef.current = null; });
        }
      }

      // Reverse-shift midpoint: mark the descent-complete milestone with a
      // distinct celebratory haptic so the return leg feels like a second act
      // rather than a continuation.
      if (result.reverseMidpoint) {
        hapticSuccess();
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

  // Track the active row + move direction (read inside the deferred drop handler)
  // and a registry of each row's measurable node for Y-bounds checking on drop.
  const activeRowIndexRef = useRef(puzzle.activeRowIndex);
  const moveDirectionRef = useRef(puzzle.moveDirection);
  activeRowIndexRef.current = puzzle.activeRowIndex;
  moveDirectionRef.current = puzzle.moveDirection;
  const rowNodeRefs = useRef(new Map<number, any>());
  const registerRowNode = useCallback((rowIndex: number, node: any) => {
    if (node) rowNodeRefs.current.set(rowIndex, node);
    else rowNodeRefs.current.delete(rowIndex);
  }, []);
  // Read inside the deferred drop handler (which has empty deps) so a rejected
  // drop can give phase-aware feedback without going stale.
  const currentPhaseRef = useRef(persistence.currentPhase);
  currentPhaseRef.current = persistence.currentPhase;
  const setMessageRef = useRef(puzzleActions.setMessage);
  setMessageRef.current = puzzleActions.setMessage;

  const handleLetterDragDrop = useCallback((_letter: any, _rowIndex: number, position: { x: number; y: number }) => {
    // Defer to next tick so React processes the letter selection from onDragStart
    setTimeout(() => {
      const previews = slotPreviewsRef.current;
      const onSlotPress = handleSlotPressRef.current;
      if (!previews || previews.length === 0) {
        // Previews weren't ready when the drop resolved (rare: a slow frame
        // between onDragStart's selection commit and this deferred read). Don't
        // swallow the drop silently — that reads as "the game ate my letter."
        // The picked-up letter is still selected, so give the same gentle
        // feedback as an off-row miss and let the player retry.
        hapticSelection();
        setMessageRef.current(getDragMissMessage(currentPhaseRef.current));
        return;
      }

      // Estimate which slot the user dropped over based on X position.
      const targetWordLength = previews.length - 1;
      const estimateOut: { droppedRightOfCenter?: boolean } = {};
      const estimated = estimateSlotIndex(
        position.x,
        previews.length,
        targetWordLength,
        estimateOut,
      );

      // Near-miss forgiveness: arc slots are only ~28px wide on a finger-driven
      // layout, so a drop that lands one slot shy of its intended (valid) target
      // reads as "the game dropped my letter for nothing." If the estimated slot
      // is invalid but an *immediately adjacent* slot is valid, snap to it.
      // Bounded to ±1 slot so we still never teleport a letter across the row to
      // a distant valid slot — an invalid drop that isn't a clear near-miss
      // still falls through to handleSlotPress's invalid feedback.
      let targetSlot = estimated;
      if (!previews[estimated]?.isValid) {
        const closestValid = findClosestValidSlot(
          estimated,
          previews,
          estimateOut.droppedRightOfCenter,
        );
        if (closestValid !== null && Math.abs(closestValid - estimated) <= 1) {
          targetSlot = closestValid;
        }
      }

      const commit = () => {
        // Mark as drag-drop for haptic/effect escalation in handleSlotPress
        isDragDropRef.current = true;
        onSlotPress(targetSlot, position);
      };

      // Y-axis bounds guard: only commit if the drop actually landed on (or near)
      // the target row. Without this, a flick released far above/below the board
      // still snaps to the nearest-X slot and commits an unintended move.
      const targetIdx =
        activeRowIndexRef.current + (moveDirectionRef.current === 'down' ? 1 : -1);
      const node = rowNodeRefs.current.get(targetIdx);
      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          // Generous tolerance (one row-height of slack each side) so legitimate
          // in-row drops are never rejected; only far-off releases are ignored.
          const tol = h || 64;
          if (position.y >= y - tol && position.y <= y + h + tol) {
            commit();
          } else {
            // Released far from the target row — ignore the drop, but give
            // feedback: the picked-up letter is still selected, so the player
            // can simply drop it onto a row. Without this the floating tile just
            // vanishes with no signal, reading as a dropped-for-nothing bug.
            hapticSelection();
            setMessageRef.current(getDragMissMessage(currentPhaseRef.current));
          }
        });
      } else {
        // No measurement available — preserve prior behavior (don't block).
        commit();
      }
    }, 0);
  }, []);

  const handleUndo = useCallback(() => {
    hapticLight();
    soundUndo();
    puzzleActions.handleUndo();
  }, [puzzleActions]);

  // Challenge-only convenience: spend EARNED amber to refill one undo when out.
  // Convenience, never progress — Challenge stays hint-free by design.
  const handleBuyUndo = useCallback(async () => {
    if (puzzle.gameMode !== 'challenge') return;
    if (persistence.amberBalance < AMBER_UNDO_REFILL_COST) {
      puzzleActions.setMessage('Not enough amber for an undo.');
      hapticWarning();
      return;
    }
    const spend = await spendAmber(AMBER_UNDO_REFILL_COST, 'undo_refill');
    if (spend.success) {
      persistenceActions.setAmberBalance(spend.newBalance);
      puzzleActions.grantExtraUndo();
      hapticSuccess();
      soundUndo();
    }
  }, [puzzle.gameMode, persistence.amberBalance, puzzleActions, persistenceActions]);

  const handleHintPress = useCallback(() => {
    hapticSelection();
    soundHint();
    puzzleActions.handleHint();
  }, [puzzleActions]);

  // Out-of-hints recovery: a completed `hint_recovery` clip grants one hint;
  // otherwise (no provider / cap / dismissed) we gently route to the store.
  const handleClaimRewardedHint = useCallback(async () => {
    try {
      const res = await showRewarded('hint_recovery');
      if (res.completed) {
        await addHints(REWARDED_HINT_GRANT, 'rewarded_hint');
        puzzleActions.refreshHintBalance();
        hapticSuccess();
        puzzleActions.setMessage(`+${REWARDED_HINT_GRANT} hint`);
      } else if (res.reason === 'daily_cap') {
        puzzleActions.setMessage('Daily clip limit reached — try the store.');
      } else {
        setShowStoreModal(true);
      }
    } catch {
      setShowStoreModal(true);
    }
  }, [puzzleActions]);

  // Raised by the hint button when the balance is empty. Offers a rewarded clip
  // (when under the daily cap) or the store. Guarded against re-entrant alerts.
  const outOfHintsAlertRef = useRef(false);
  const handleOutOfHints = useCallback(async () => {
    if (outOfHintsAlertRef.current) return;
    outOfHintsAlertRef.current = true;
    const done = () => { outOfHintsAlertRef.current = false; };
    const capReached = await isRewardedCapReached().catch(() => false);
    const buttons: { text: string; style?: 'cancel'; onPress?: () => void }[] = [];
    if (!capReached) {
      buttons.push({ text: 'Watch a clip (+1)', onPress: () => { done(); handleClaimRewardedHint(); } });
    }
    buttons.push({ text: 'Get hints', onPress: () => { done(); setShowStoreModal(true); } });
    buttons.push({ text: 'Not now', style: 'cancel', onPress: done });
    Alert.alert(
      'Out of hints',
      'Watch a short clip for a free hint, or grab a hint pack in the store.',
      buttons,
      { onDismiss: done, cancelable: true },
    );
  }, [handleClaimRewardedHint]);

  const prevOutOfHintsSignal = useRef(0);
  useEffect(() => {
    if (puzzle.outOfHintsSignal > prevOutOfHintsSignal.current) {
      prevOutOfHintsSignal.current = puzzle.outOfHintsSignal;
      handleOutOfHints();
    }
  }, [puzzle.outOfHintsSignal, handleOutOfHints]);

  // One-time contextual notification prompt — shown after dismissing the
  // victory modal once the player has finished 3+ puzzles. The OS permission
  // dialog is only triggered if the player accepts the in-app prompt.
  const notificationPromptInFlightRef = useRef(false);
  const maybePromptForNotifications = useCallback(async () => {
    if (notificationPromptInFlightRef.current) return;
    notificationPromptInFlightRef.current = true;
    try {
      if (onboardingFlow.isOnboarding) return;
      if ((persistence.cumulativeStats?.totalPuzzlesCompleted ?? 0) < 3) return;
      if (await hasPromptedForNotifications()) return;
      if ((await getNotificationPermissionStatus()) === 'granted') return;
      await markPromptedForNotifications();

      const { title, body, accept, decline } = getNotificationPromptText(persistence.currentPhase);
      Alert.alert(title, body, [
        {
          text: decline,
          style: 'cancel',
          onPress: () => {
            logEvent({
              type: 'notification_permission_result',
              data: { granted: false, prompted: true },
            });
          },
        },
        {
          text: accept,
          onPress: async () => {
            const granted = await requestNotificationPermission();
            logEvent({
              type: 'notification_permission_result',
              data: { granted },
            });
            if (granted) {
              scheduleAllNotifications(persistence.currentPhase).catch(() => {});
            }
          },
        },
      ]);
    } finally {
      notificationPromptInFlightRef.current = false;
    }
  }, [onboardingFlow.isOnboarding, persistence.cumulativeStats, persistence.currentPhase]);

  // Fire an interstitial on a normal puzzle→next/home exit. All narrative-beat
  // exemptions live here so ads never interrupt a ceremony, the daily, the pit
  // ignition, onboarding, or the serene post-revelation tone. Must run BEFORE
  // startVictoryExitFlow (which resets victoryData). Patron suppression + cadence
  // are handled inside ads.ts. Fire-and-forget: the ad overlays the transition.
  const maybeShowVictoryInterstitial = useCallback(() => {
    const vd = victoryFlow.victoryData;
    if (!vd) return;
    const step = onboardingFlow.onboardingStep;
    const inOnboarding = step !== undefined && step !== 'complete';
    const exempt =
      inOnboarding ||
      isPlayingDaily ||
      vd.phaseTransitionPending ||                     // pit ignition ceremony incoming
      phaseTransitionEvent != null ||                  // final / post-revelation cinematic queued
      (vd.newPhase as number) >= 5 ||                  // post-revelation: never break the serene tone
      vd.puzzlesSolved <= AUTO_COLLECT_PUZZLE_LIMIT;   // protect the early "pure delight" window — no ads in the first session
    maybeShowInterstitial({
      puzzlesSolved: vd.puzzlesSolved,
      phase: vd.newPhase,
      exempt,
    }).then(async (shown) => {
      if (!shown) return;
      // After the player has actually seen a few interstitials, offer the
      // contextual one-time Remove-Ads upsell ("tired of these?").
      await recordInterstitialSeen();
      if (await consumeRemoveAdsNudge()) {
        Alert.alert(
          'Tired of ads?',
          'You can remove interstitials for good, or become a Patron for a quieter table and a little amber every puzzle.',
          [
            { text: 'Maybe later', style: 'cancel' },
            { text: 'See options', onPress: () => setShowPatronModal(true) },
          ],
        );
      }
    }).catch(() => {});
  }, [victoryFlow.victoryData, onboardingFlow.onboardingStep, isPlayingDaily, phaseTransitionEvent]);

  // One-time, low-pressure Patron nudge once the player has settled in. Suppressed
  // for Patrons and during onboarding (gating lives in monetizationPrompts.ts).
  const patronNudgeInFlightRef = useRef(false);
  const maybeShowPatronNudge = useCallback(async () => {
    if (patronNudgeInFlightRef.current) return;
    patronNudgeInFlightRef.current = true;
    try {
      if (onboardingFlow.isOnboarding) return;
      const solved =
        victoryFlow.victoryData?.puzzlesSolved ??
        persistence.cumulativeStats?.totalPuzzlesCompleted ??
        0;
      if (await consumePatronNudge(solved)) {
        setShowPatronModal(true);
      }
    } finally {
      patronNudgeInFlightRef.current = false;
    }
  }, [onboardingFlow.isOnboarding, victoryFlow.victoryData, persistence.cumulativeStats]);

  const handleNextLevel = useCallback(() => {
    hapticLight();
    setIsPlayingDaily(false);
    maybeShowVictoryInterstitial();
    startVictoryExitFlow(() => {
      clearPuzzleState().catch(() => {});
      puzzleActions.handleNextLevel();
    });
    maybePromptForNotifications().catch(() => {});
    maybeShowPatronNudge().catch(() => {});
  }, [puzzleActions, startVictoryExitFlow, maybePromptForNotifications, maybeShowVictoryInterstitial, maybeShowPatronNudge]);

  // During onboarding, "Continue" on the victory modal dismisses the modal and
  // surfaces the puzzle-screen completion beat ("Feel how the house settled...").
  // That FoxGuide's own Continue (handleOnboardingContinue) then routes to the pit.
  const handleOnboardingVictoryContinue = useCallback(async () => {
    hapticLight();
    clearVictoryTimeouts();
    // Clean up victory state so the Fox completion beat is visible behind the modal
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();
    setRitualEchoWords([]);
    await onboardingActions.advanceOnboarding('puzzle_complete');
  }, [onboardingActions, puzzleActions, victoryActions, orchestrationActions, clearVictoryTimeouts]);

  const handleReturnHome = useCallback(() => {
    hapticLight();
    setIsPlayingDaily(false);
    maybeShowVictoryInterstitial();
    startVictoryExitFlow(() => {
      puzzlesSinceHomeVisit.current = 0;
      puzzleActions.clearBoard();
      transitionTo('home');
    });
    maybePromptForNotifications().catch(() => {});
    maybeShowPatronNudge().catch(() => {});
  }, [puzzleActions, transitionTo, startVictoryExitFlow, maybePromptForNotifications, maybeShowVictoryInterstitial, maybeShowPatronNudge]);

  const handleGoToPit = useCallback(() => {
    hapticLight();
    startVictoryExitFlow(() => {
      puzzlesSinceHomeVisit.current = 0;
      puzzleActions.clearBoard();
      transitionTo('pit');
    });
  }, [puzzleActions, transitionTo, startVictoryExitFlow]);

  // Optional rewarded "double the reward": credits a bonus equal to this
  // puzzle's amber (a true 2x), reward-only — never phase progress. One claim
  // per victory. Inert until a real ad provider is connected.
  const handleRewardedDouble = useCallback(async () => {
    const earned = victoryFlow.victoryData?.amberEarned ?? 0;
    if (earned <= 0 || victoryDoubleClaimed) return;
    try {
      const newBalance = await awardBonusAmber(earned, 'rewarded_victory_double');
      persistenceActions.setAmberBalance(newBalance);
      setVictoryDoubleClaimed(true);
    } catch {
      // Non-critical — never block the victory flow.
    }
  }, [victoryFlow.victoryData, victoryDoubleClaimed, persistenceActions]);

  // Share opens a preview of the result card (which shares an image when the
  // native capturer is present, else falls back to the emoji-grid text share).
  // It overlays the victory screen rather than exiting it, so sharing never
  // costs the player their victory moment.
  const handleShare = useCallback(() => {
    if (!victoryFlow.victoryData) return;
    hapticLight();
    const moveCount = puzzle.rows.length - 1;
    setShareResultData({
      stars: victoryFlow.victoryData.earnedStars,
      difficulty: isPlayingDaily ? 'HARD' : puzzle.difficulty,
      hintsUsed: puzzle.hintsUsed,
      invalidAttempts: puzzle.invalidAttempts,
      isDaily: isPlayingDaily,
      dailyDate: isPlayingDaily ? getLocalDateString() : undefined,
      moveCount,
      wordChain: puzzle.lastCompletedWords.length > 0 ? puzzle.lastCompletedWords : undefined,
      animalWhisper: orchestration.whisper?.text,
      phase: persistence.currentPhase,
      incantationName: puzzle.lastIncantationName || undefined,
    });
  }, [victoryFlow.victoryData, puzzle, orchestration.whisper, persistence.currentPhase, isPlayingDaily]);

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
    setSpeedRound(0);
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
    setSpeedRound(0);
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
    setSpeedRound(0);
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

    if (currentScreen === 'shop') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <ShopScreen
            phase={persistence.currentPhase}
            amberBalance={persistence.amberBalance}
            onClose={() => transitionTo('home')}
            onAmberChange={(newBalance) => persistenceActions.setAmberBalance(newBalance)}
            onOpenPatron={() => setShowPatronModal(true)}
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
          {/* Fox Guide overlay — shown during onboarding on pit screen. During
              pit_offering it stays visible the whole time: first as a standing
              "tap each word" prompt with NO continue button (so the player must
              actually offer), then — once pitOfferDone — with the completion
              beat and a continue button. */}
          {onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'pit_intro' || onboardingFlow.onboardingStep === 'pit_offering') && (
            <FoxGuide
              visible={onboardingFlow.onboardingStep === 'pit_intro' || onboardingFlow.onboardingStep === 'pit_offering'}
              variant="dialogue"
              text={onboardingActions.getOnboardingFoxText()}
              buttonText={onboardingActions.getOnboardingButtonText()}
              onContinue={
                // pit_offering has no manual Continue: before offering the player
                // taps the words; after offering it auto-returns home. pit_intro
                // keeps its Continue to advance into the offering step.
                onboardingFlow.onboardingStep === 'pit_offering'
                  ? undefined
                  : onboardingActions.handleOnboardingContinue
              }
              showSkip={true}
              onSkip={onboardingActions.handleSkipOnboarding}
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
              onStartDaily={handleStartDaily}
              onAmberChange={persistenceActions.setAmberBalance}
              onOpenSettings={() => transitionTo('settings')}
              onOpenStats={() => transitionTo('stats')}
              onOpenLedger={() => transitionTo('ledger')}
              onOpenGallery={() => transitionTo('gallery')}
              onOpenShop={() => transitionTo('shop')}
              onOpenStore={() => setShowStoreModal(true)}
              onOpenPit={() => transitionTo('pit')}
              onboardingStep={onboardingFlow.onboardingStep}
              onAdvanceOnboarding={onboardingActions.advanceOnboarding}
              pitPhaseReady={persistence.pendingPhaseTransition != null}
              initialHousePanY={homePanY}
              onHousePanChange={setHomePanY}
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
                  showSkip={true}
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
            <AnimatedLogo />
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
            {/* Challenge Mode Badge */}
            {puzzle.gameMode === 'challenge' && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>CHALLENGE</Text>
                {puzzle.undosRemaining < Infinity && (
                  <Text style={styles.challengeUndoText}>
                    {puzzle.undosRemaining} undo{puzzle.undosRemaining !== 1 ? 's' : ''}
                  </Text>
                )}
                {puzzle.undosRemaining === 0 && puzzle.gameState === GameState.PLAYING && (
                  <TouchableOpacity
                    style={[
                      styles.buyUndoButton,
                      persistence.amberBalance < AMBER_UNDO_REFILL_COST && styles.buyUndoButtonDisabled,
                    ]}
                    onPress={handleBuyUndo}
                    disabled={persistence.amberBalance < AMBER_UNDO_REFILL_COST}
                    accessibilityRole="button"
                    accessibilityLabel={`Refill one undo for ${AMBER_UNDO_REFILL_COST} amber`}
                  >
                    <Text style={styles.buyUndoText}>↩ +1 · {AMBER_UNDO_REFILL_COST}💎</Text>
                  </TouchableOpacity>
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
            style={[
              styles.difficultyButton,
              showSetupSelectorIntro && styles.difficultyButtonHighlighted,
            ]}
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
            showChallengeToggle={puzzlesSolvedForVariantUnlocks >= 15}
            introMode={showSetupSelectorIntro}
            introHintText={showSetupSelectorIntro ? setupSelectorLines[1] : undefined}
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
            {speedRound > 0 && (
              <Text
                style={styles.speedRoundText}
                accessibilityLabel={`Speed round ${speedRound + 1}, faster clock`}
              >
                {'\uD83D\uDD25'} Round {speedRound + 1}
              </Text>
            )}
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

          {/* Time's Up overlay — speed variant only (GAME_OVER is set solely on time-up) */}
          {puzzle.gameState === GameState.GAME_OVER && (
            <View style={styles.loadingOverlay} accessibilityRole="alert">
              <View style={styles.loadingBox}>
                <Text style={styles.loadingGlyph}>{persistence.currentPhase >= 3 ? '◈' : '⏱'}</Text>
                <Text style={styles.timeUpText}>
                  {puzzle.message || getSpeedTimeUpMessage(persistence.currentPhase)}
                </Text>
                <View style={styles.timeUpButtonRow}>
                  <Pressable
                    style={styles.timeUpButtonPrimary}
                    onPress={() => {
                      hapticLight();
                      setRitualEchoWords([]);
                      puzzleActions.startNewGame();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Try again with a new puzzle"
                  >
                    <Text style={styles.timeUpButtonText}>Try Again</Text>
                  </Pressable>
                  <Pressable
                    style={styles.timeUpButtonSecondary}
                    onPress={() => {
                      hapticLight();
                      setCurrentScreen('home');
                      puzzleActions.setGameState(GameState.IDLE);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Return home"
                  >
                    <Text style={styles.timeUpButtonTextSecondary}>Home</Text>
                  </Pressable>
                </View>
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
                onMeasureRef={registerRowNode}
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

        {/* The proactive "you're stuck — undo/restart" panel was removed by
            design: reaching a dead-end (and deciding to undo) is part of the
            challenge, so we don't interrupt with a popup. Undo and Restart/NEW
            remain always available in the controls below. */}

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
            label={puzzle.gameMode === 'challenge' ? 'HINT' : `HINT · ${puzzle.hintBalance}`}
            colors={{
              bg: CandyColors.blue.main,
              border: CandyColors.blue.shadow,
              glow: CandyColors.blue.glow,
            }}
            onPress={handleHintPress}
            disabled={puzzle.gameState !== GameState.PLAYING}
            accessibilityLabel={
              puzzle.gameMode === 'challenge'
                ? 'Hint (unavailable in Challenge Mode)'
                : `Hint, ${puzzle.hintBalance} remaining`
            }
          />
          {!onboardingFlow.isOnboarding && (
          <ActionButton
            icon="🔄"
            label={puzzle.gameState === GameState.PLAYING ? "RESTART" : "NEW"}
            colors={{
              bg: CandyColors.green.main,
              border: CandyColors.green.shadow,
              glow: CandyColors.green.glow,
            }}
            onPress={() => {
              hapticLight();
              setRitualEchoWords([]);
              // RESTART while playing resets THIS board (a true retry); NEW (idle)
              // fetches a fresh puzzle.
              if (puzzle.gameState === GameState.PLAYING) {
                puzzleActions.resetCurrentPuzzle();
              } else {
                puzzleActions.startNewGame();
              }
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
          difficulty={isPlayingDaily ? 'HARD' : puzzle.difficulty}
          phase={persistence.currentPhase}
          phaseTransitionPending={persistence.pendingPhaseTransition != null}
          isPlayingDaily={isPlayingDaily}
          dailyRank={dailyRank}
          socialProofLine={socialProofLine}
          rewardedDoubleEnabled={(persistence.cumulativeStats?.totalPuzzlesCompleted ?? 0) > AUTO_COLLECT_PUZZLE_LIMIT}
          rewardedDoubleClaimed={victoryDoubleClaimed}
          onRewardedDouble={handleRewardedDouble}
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
          isOnboarding={onboardingFlow.isOnboarding && onboardingFlow.onboardingStep === 'puzzle_tutorial'}
          onOnboardingContinue={handleOnboardingVictoryContinue}
          variant={puzzle.currentVariant}
          gameMode={puzzle.gameMode}
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
        {onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'puzzle_tutorial' || onboardingFlow.onboardingStep === 'puzzle_complete') && !(onboardingFlow.onboardingStep === 'puzzle_tutorial' && puzzle.gameState === GameState.WON) && (
          <FoxGuide
            visible={true}
            variant="dialogue"
            text={
              onboardingFlow.onboardingStep === 'puzzle_complete'
                ? ONBOARDING_FOX_LINES.puzzle_tutorial_complete[
                    Math.min(onboardingFlow.onboardingLineIndex, ONBOARDING_FOX_LINES.puzzle_tutorial_complete.length - 1)
                  ]
                : puzzle.gameState === GameState.PLAYING && puzzle.selectedLetter
                  ? (
                    tutorialGuidance?.targetSlotIndex !== null && tutorialGuidance?.targetSlotIndex !== undefined
                      ? `Now drop "${tutorialGuidance.letterToMove}" into the glowing slot below.`
                      : ONBOARDING_FOX_LINES.puzzle_tutorial_drop[0]
                  )
                  : puzzle.gameState === GameState.PLAYING
                    ? (
                      // After the FIRST successful move, give the "that little
                      // click" reinforcement beat (once, between move 1 and 2),
                      // merged with the next-tile hint so the player is never
                      // left without guidance.
                      puzzle.history.length === 1
                        ? `${ONBOARDING_FOX_LINES.puzzle_tutorial_valid_move[0]}${
                            tutorialGuidance?.letterToMove
                              ? `\n\nNow tap the glowing "${tutorialGuidance.letterToMove}".`
                              : ''
                          }`
                        : tutorialGuidance?.letterToMove
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
            showSkip={true}
            onSkip={onboardingActions.handleSkipOnboarding}
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
        {!onboardingFlow.isOnboarding && showSetupSelectorIntro && (
          <FoxGuide
            visible={true}
            variant="dialogue"
            text={setupSelectorLines[Math.min(setupSelectorIntroIndex, setupSelectorLines.length - 1)]}
            buttonText={setupSelectorIntroIndex < setupSelectorLines.length - 1 ? 'Next' : 'Got it'}
            onContinue={handleAdvanceSetupSelectorIntro}
            showSkip={true}
            onSkip={dismissSetupSelectorIntro}
            position="bottom"
            anchorStyle={{
              top: Math.min(Math.max(SCREEN_HEIGHT * 0.38, 300), 420),
              left: 8,
              right: 8,
            }}
          />
        )}
        {!onboardingFlow.isOnboarding && postVictoryIntro && (
          <FoxGuide
            visible={true}
            variant="dialogue"
            text={postVictoryIntro.lines[Math.min(postVictoryIntroIndex, postVictoryIntro.lines.length - 1)]}
            buttonText={postVictoryIntroIndex < postVictoryIntro.lines.length - 1 ? 'Next' : 'Continue'}
            onContinue={handleAdvancePostVictoryIntro}
            showSkip={true}
            onSkip={dismissPostVictoryIntro}
            position="bottom"
            anchorStyle={{
              top: Math.min(Math.max(SCREEN_HEIGHT * 0.38, 300), 420),
              left: 8,
              right: 8,
            }}
          />
        )}
      </Animated.View>
      </ErrorBoundary>
    );
  };

  // Render screen with global overlays on top
  return (
    <View style={{ flex: 1, backgroundColor: rootBgColor }}>
      {/* Catch-all boundary: the home/puzzle screens carry their own inner
          boundaries; this outer one covers the secondary screens (settings,
          stats, ledger, gallery, pit) so a render error on any of them returns
          the player home instead of crashing the entire app. */}
      <ErrorBoundary
        fallbackMessage="Something went wrong. Tap to return home."
        onReset={() => setCurrentScreen('home')}
      >
        {renderScreen()}
      </ErrorBoundary>
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
      {/* Shareable result card preview — overlays everything */}
      <ShareResultModal
        result={shareResultData}
        onClose={() => setShareResultData(null)}
        onShared={() => {
          // shareImage logs the share_completed event (with image/text kind);
          // refresh to pick up the first-share-of-day amber bonus.
          persistenceActions.refreshStats();
        }}
      />
      {/* Daily login reward — celebratory claim modal (amber already credited) */}
      <DailyLoginModal
        grant={dailyLoginGrant}
        phase={persistence.currentPhase}
        onClose={() => setDailyLoginGrant(null)}
      />
      <PatronModal
        visible={showPatronModal}
        phase={persistence.currentPhase}
        onClose={() => setShowPatronModal(false)}
        onPatronChange={(isPatron) => { if (isPatron) persistenceActions.refreshStats(); }}
      />
      <StoreModal
        visible={showStoreModal}
        phase={persistence.currentPhase}
        amberBalance={persistence.amberBalance}
        hintBalance={puzzle.hintBalance}
        onClose={() => setShowStoreModal(false)}
        onAmberChange={persistenceActions.setAmberBalance}
        onHintsChange={() => puzzleActions.refreshHintBalance()}
        onOpenPatron={() => setShowPatronModal(true)}
      />
    </View>
  );
}

/**
 * Bootstrap gate: runs data migrations BEFORE MainApp mounts so that all
 * service caches read migrated data. Never blocks forever — the app renders
 * even if migrations fail (failures are logged, not fatal).
 */
export default function App() {
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    logEvent({ type: 'app_open' });
    (async () => {
      try {
        // Install the cloud provider (no-op unless Supabase is configured), then
        // pull a cloud save BEFORE migrations/services read storage — so a fresh
        // install (or a device switch via recovery code) restores prior progress.
        installCloudProviderIfConfigured();
        await maybeAutoRestoreOnFreshInstall();
        await runMigrations();
        // Monetization scaffold: warm entitlement cache + init (NoOp) billing/ads
        // providers so isPatronSync() and ad gating read correct values. Safe in
        // Expo Go — no native modules until a real provider is wired.
        initShareImage(); // registers the native image capturer if present (no-op in Expo Go)
        // RevenueCat billing: inert until react-native-purchases is installed AND
        // revenueCatIosKey/AndroidKey are set in app.json → extra. initIAP() configures it.
        setBillingProvider(createRevenueCatBillingProvider());
        // AdMob: inert until react-native-google-mobile-ads is installed AND the
        // admob*Id* keys are set in app.json → extra. initAds() initializes it
        // (and the adapter requests GDPR/UMP consent on init).
        setAdProvider(createAdMobAdProvider());
        // initHints seeds the one-time free hint stash; awaited before MainApp
        // mounts, so usePuzzleGame reads the correct balance on its first render.
        await Promise.all([initIAP(), initAds(), initCosmetics(), initHints()]);
      } catch (error) {
        console.warn('Bootstrap init failed:', error);
      } finally {
        if (!cancelled) setBootReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Plain dark view while booting — matches the root default background
  // so there's no flash before MainApp renders.
  if (!bootReady) {
    return <View style={{ flex: 1, backgroundColor: '#1A1A2E' }} />;
  }

  return <MainApp />;
}
