import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  useWindowDimensions,
  Animated,
  Easing,
  AppState,
  Linking,
  BackHandler,
  Image,
} from 'react-native';
import { GameState, Difficulty } from './src/types';
import { Row } from './src/components/Row';
import { AnimatedBackground } from './src/components/AnimatedBackground';
import { Confetti, StarBurst } from './src/components/Confetti';
import { BlindJudgmentOverlay, type BlindJudgmentSignal } from './src/components/BlindJudgmentOverlay';
import { ActionButton, AnimatedLogo, Toast, VictoryModal, RulesModal, DifficultyMenu } from './src/components/puzzle';
import { BadgeAppear } from './src/components/puzzle/BadgeAppear';
import { BrandedLoader } from './src/components/puzzle/BrandedLoader';
import { isValidDifficulty, normalizeDifficulty, getDifficultyChipLabel } from './src/components/puzzle/DifficultyMenu';
import { HomeScreen } from './src/components/home';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AmberInline } from './src/components/AmberInline';
import { CandyColors } from './src/theme/colors';
import { getSurfaceTheme } from './src/theme/surfaces';
import { CandyButton } from './src/components/ui/CandyButton';
import { usePuzzleGame } from './src/hooks/usePuzzleGame';
import { useGamePersistence } from './src/hooks/useGamePersistence';
import { useVictoryFlow, isRoutineVictory } from './src/hooks/useVictoryFlow';
import { useAchievementQueue } from './src/hooks/useAchievementQueue';
import { useSpeedTimer } from './src/hooks/useSpeedTimer';
import { useDreadEffects } from './src/hooks/useDreadEffects';
import { useVictoryOrchestration } from './src/hooks/useVictoryOrchestration';
import { useOnboardingFlow } from './src/hooks/useOnboardingFlow';
import { useAutosave } from './src/hooks/useAutosave';
import { logEvent } from './src/services/eventLogger';
import { SettingsScreen } from './src/components/SettingsScreen';
import { FoxGuide } from './src/components/FoxGuide';
import {
  COLD_OPEN_INSTRUCTION,
  COLD_OPEN_FIRST_MOVE,
  COLD_OPEN_PREVIEW_TEACH,
  ONBOARDING_FOX_LINES,
  resolveColdOpenLaunchRoute,
} from './src/services/onboarding';
import {
  awardBonusAmber,
  spendAmber,
  getCurrentPhase,
  hasSeenSetupSelectorIntro,
  markSetupSelectorIntroSeen,
  hasSeenMandatoryHarvest,
  hasSeenStarterIntro,
  hasSeenFirstWinGlitch,
  markFirstWinGlitchSeen,
  markStarterIntroSeen,
  consumePendingVariantTutorial,
  checkFreeStreakFreeze,
  isHouseCompleted,
  isFinalPuzzleCompleted,
  markFinalPuzzleCompleted,
  isPostRevelation,
  markPostRevelation,
  recordPhase4Dwell,
  getPhase4DwellCount,
  canArmFinale,
  armFinale,
  isFinaleArmed,
  consumeVariantNudge,
  getFullProgress,
  consumeCycleOpening,
} from './src/services/amberCurrency';
import { claimDailyLoginReward, DailyLoginGrant } from './src/services/dailyLoginReward';
import { DailyLoginModal } from './src/components/DailyLoginModal';
import { claimSupporterStipendIfDue } from './src/services/supporterStipend';
import { NotificationPromptModal } from './src/components/NotificationPromptModal';
import { GameAlertModal } from './src/components/ui/GameAlertModal';
import { showGameAlert } from './src/services/gameAlert';
import { PatronModal } from './src/components/monetization/PatronModal';
import { submitDailyResult, getDailyRank, getBeatPercentText, DailyRank } from './src/services/leaderboard';
import { recordPuzzleContribution, getAggregateProof, getWordsOfferedText } from './src/services/socialProof';
import { StatsScreen } from './src/components/StatsScreen';
import { AchievementToast } from './src/components/AchievementToast';
import { PhaseTransitionOverlay } from './src/components/PhaseTransitionOverlay';
import { ShareableResult, decodeChallengeLink, buildChallengeShareText } from './src/services/shareResults';
import { consumeSharePrompt, getSharePromptInvite } from './src/services/sharePrompts';
import { initShareImage } from './src/services/shareImage';
import { ShareResultModal } from './src/components/share/ShareResultModal';
import { getLocalDateString } from './src/services/dateUtils';
import { getSettingsSync, getSettings } from './src/services/settings';
import { announceForA11y } from './src/services/a11yAnnounce';
import { initAudio, setAudioPhase, startMusicForScreen, type MusicScreen, soundVictory, soundPerfect, soundValidMove, soundMidpointTurn, soundInvalidMove, soundUndo, soundHint, soundTap, soundUiTap, soundSelection, soundLetterSelect, soundDailyReady } from './src/services/audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticWarning, hapticError, hapticSelection } from './src/services/haptics';
import { getVariantTutorialIntroLines } from './src/services/animalDialogue';
import {
  getPhaseIndicator,
  getLoadingMessage,
  getRitualMicroEvent,
  isSilentVictoryBeat,
  getHarvestOverflowMessage,
  getFoxSetupSelectorIntroLines,
  getFoxStarterIntroLines,
  getNotificationPromptText,
  getSpeedTimeUpMessage,
  getDragMissMessage,
  getReverseMidpointMessage,
  getFirstDailyMercyMessage,
  getSpeedRescueLabel,
  getDailyLockedMessage,
  getBadChallengeLinkMessage,
  getUnplayableChallengeMessage,
  getPaceTrendMessage,
  getSpeedRecordMessage,
  getVariantNudgeMessage,
  getDailyHostLine,
  getNewCycleOpeningLine,
  getDailyLadderLine,
  getDailyLadderTrendLabel,
  getEventDailyBonusLine,
  getPreviewGraduationMessage,
  getPreviewGraduationTitle,
  getPreviewGraduationConfirm,
  getSwiftVictoryHintMessage,
  getStreakHeldMessage,
  getStreakFreezeReliefMessage,
  getStreakFreezeGrantedMessage,
  getDwellLine,
  getPostCapDwellLine,
  getNoValidMovesMessage,
  getHintGrantMessage,
  getColdOpenSkipLabel,
  getColdOpenSkipAccessibilityLabel,
  getSkipConfirmText,
  getSkipConfirmStayLabel,
  getSkipConfirmLeaveLabel,
  getHouseAskLine,
  getHouseAskFulfilledMessage,
} from './src/services/phaseNarrative';
import { getActiveEvent, getEventDailyBonusAmber } from './src/services/liveEvents';
import {
  getUnbrokenWeaveMastery,
  recordSolveTime,
  getSolveTrend,
  recordSpeedRound,
  recordUnbrokenWeaveVictory,
  UnbrokenWeaveMastery,
} from './src/services/masteryRecords';
import { maybePromptReview } from './src/services/reviewPrompt';
import { getPhaseTransitionEvent, PhaseTransitionEvent, HOUSE_COMPLETION_EVENT, FINAL_PUZZLE_EVENT, POST_REVELATION_EVENT } from './src/services/phaseEvents';
import { generateDailyPuzzle, prewarmDailyPuzzle, isDailyChallengeUnlocked, recordDailyCompletion, getDailyStatus, checkDailyStreakMilestone, grantFirstDailyMercy, getDailyHostName, getDailyDifficulty } from './src/services/dailyChallenge';
import { recordDailyLadderResult, getDailyLadderSummary, shouldShowTrend } from './src/services/dailyLadder';
import { startFrameMonitoring, stopFrameMonitoring } from './src/services/performanceMonitor';
import { AnimalWhisper } from './src/components/puzzle/AnimalWhisper';
import { getModeIconSprite } from './src/components/puzzle/modeIcons';
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
import { initIAP, setBillingProvider, reconcilePendingConsumableGrants, acknowledgeConsumableGrant } from './src/services/iap';
import { initAds, setAdProvider, maybeShowInterstitial, showRewarded, isRewardedCapReached, isAdsReady, RewardedPlacement, isDailyInterstitialAllowed } from './src/services/ads';
import { RewardedAdButton } from './src/components/monetization/RewardedAdButton';
import { initCosmetics } from './src/services/cosmetics';
import { loadPixelFonts, installGlobalFont } from './src/theme/fonts';
import { initHints, addHints, grantBonusHint } from './src/services/hints';
import { loadEntitlements, hasEntitlementSync, isAdFreeSync, ENTITLEMENTS } from './src/services/entitlements';
import { StoreModal } from './src/components/monetization/StoreModal';
import { recordInterstitialSeen, consumePatronNudge, armRemoveAdsNudgeIfEligible, consumePendingRemoveAdsNudge, canOfferRewardedDouble, recordRewardedDoubleOffered, canShowExitNudge, recordExitNudgeShown } from './src/services/monetizationPrompts';
import { createRevenueCatBillingProvider } from './src/services/providers/revenueCatBilling';
import { createAdMobAdProvider } from './src/services/providers/googleAdMobAds';
import { installGlobalErrorHandler, setErrorForwarder } from './src/services/errorReporting';
import { AUTO_COLLECT_PUZZLE_LIMIT, AMBER_UNDO_REFILL_COST, STARTER_INTRO_MIN_PUZZLES, FINALE_DWELL_PUZZLES, INTERSTITIAL_MIN_PUZZLES, HOUSE_ASK_MIN_PUZZLES, HOUSE_ASK_CHANCE, HOUSE_ASK_REWARD_AMBER, REWARDED_HINT_GRANT, EXPERT_DIFFICULTY_UNLOCK_PUZZLES } from './src/constants/gameBalance';
import { pickHouseAsk, evaluateHouseAsk, HouseAsk } from './src/services/houseAsks';
import { getCumulativeStats } from './src/services/starRating';

// Defer the one-time difficulty-selector intro until a few boards are done —
// firing on the very first post-onboarding Play hijacked the "just let me
// play" beat (and the curated early window ignores difficulty anyway).
const SETUP_SELECTOR_INTRO_MIN_PUZZLES = 3;

// One-time Swift Victories pointer: only past this puzzle count (a few boards
// beyond SWIFT_VICTORY_MIN_PUZZLES, so compact mode is actually available and
// the player has felt some choreography repetition worth shortening).
const SWIFT_HINT_MIN_PUZZLES = 24;

// Sequential victory toast pacing: each queued line holds the message slot
// this long before the next shows; the initial delay lets the victory
// choreography (and any ritual micro-event line) land first.
const VICTORY_TOAST_DURATION_MS = 1900;
const VICTORY_TOAST_INITIAL_DELAY_MS = 600;

// House-ask line deferral: when a fresh board's start message already owns the
// single message slot, the ask line waits this long before taking it (so the
// two lines read in sequence instead of the ask clobbering the greeting).
const HOUSE_ASK_LINE_DELAY_MS = 2200;

// One-time, DEVICE-LOCAL UX pointer flags (deliberately not cloud-synced and
// not cleared by Reset All owners' service clears: they mark "this device's
// player has seen this pointer", not game progress).
// v2: the key is versioned. The original toast delivery marked the un-versioned
// key seen the moment it decided to speak, then showed a fading toast that the
// post-phase-transition moment routinely clobbered — so real devices consumed
// the beat invisibly (observed on-device: checks went neutral with no message,
// flag burned). The rename gives every such device one guaranteed showing of
// the now-blocking card; a device that genuinely saw the card marks v2 as usual.
const PREVIEW_GRADUATION_SEEN_KEY = 'wordshift_preview_graduation_seen_v2';
const SWIFT_HINT_SEEN_KEY = 'wordshift_swift_hint_seen';
// The first-stuck mercy flag is device-local ON PURPOSE (never in cloudSave
// SYNC_KEYS): a returning player on a new device may deserve the mercy once
// more.
const FIRST_STUCK_SEEN_KEY = 'wordshift_first_stuck_seen';
async function hasSeenOneTimeFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === 'true';
  } catch {
    // Broken storage must never spam a "one-time" pointer — treat as seen.
    return true;
  }
}
async function markOneTimeFlagSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch {
    // Non-critical.
  }
}

// Module-scope launch-routing guards: an appEpoch remount (late cloud restore)
// re-runs MainApp's mount effects, and both getInitialURL and
// getLastNotificationResponseAsync keep returning the ORIGINAL launch payload —
// these ensure each is routed at most once per process.
let launchUrlProcessed = false;
let coldStartNotificationProcessed = false;
// Set when a slow fresh-install cloud restore lands after boot; the remounted
// MainApp surfaces a one-time "progress restored" notice so the hard reset
// mid-interaction doesn't read as the app glitching.
let pendingRestoreNotice = false;
import { markPendingChanges, uploadToCloud, installCloudProviderIfConfigured, maybeAutoRestoreOnFreshInstall, holdUploadsUntil } from './src/services/cloudSave';
import * as Sentry from '@sentry/react-native';
import { getSentryDsn } from './src/services/supabaseClient';
import { estimateSlotIndex, findClosestValidSlot, computeBoardScale } from './src/services/slotEstimation';
import { DROP_SHAKE_KEYFRAME_MS, DROP_SHAKE_INTENSITY, SPEED_ESCALATION_STEP_SEC, SPEED_ESCALATION_MIN_SEC, SPEED_TICK_CRITICAL_SEC, SWIFT_HINT_TOAST_DELAY_MS, SCREEN_FADE_COVER_MS, SCREEN_FADE_REVEAL_MS, speedTickKind } from './src/constants/timing';
import { OfferingPitScreen } from './src/components/OfferingPitScreen';
import { ShopScreen } from './src/components/shop/ShopScreen';
import { loadPuzzleState, clearPuzzleState } from './src/services/puzzleSaveState';
import { offerBatch, acknowledgeBatchCredit } from './src/services/wordHarvest';
import * as Updates from 'expo-updates';
import { isCreatorKitEnabled, validateCreatorCode, applyCreatorSnapshot, isCreatorEra } from './src/services/creatorKit';
import {
  hasVariantModifier,
  getNewlyUnlockedVariants,
  getUnlockedVariants,
  getVariantTimeLimit,
  getVariantTimeLimitForDifficulty,
  getVariantSelectorOptions,
  getBlindUnlockHint,
  isVariantUnlocked,
  PuzzleVariant,
  VARIANT_CONFIGS,
  CHALLENGE_TOGGLE_UNLOCK_PUZZLES,
  BLIND_TOGGLE_UNLOCK_PUZZLES,
} from './src/services/puzzleVariety';
import { appStyles as styles, getScreenBackgroundColor, getActionButtonColors } from './src/styles/appStyles';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useScreenInsets } from './src/hooks/useScreenInsets';

// App screen type — expanded with settings, stats, and ledger
type AppScreen = 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery' | 'pit' | 'shop';

type PostVictoryIntroKind = 'variant_unlock' | 'starter_pack';
interface PostVictoryIntro {
  kind: PostVictoryIntroKind;
  lines: string[];
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Speed rescue: seconds granted by the one-per-board rewarded continue.
const SPEED_RESCUE_EXTRA_SEC = 30;
const SPEED_RESCUE_PLACEMENT: RewardedPlacement = 'speed_rescue';

// Install the global error handler at module load so it catches errors as
// early as possible — including errors thrown during the first render.
installGlobalErrorHandler();
// Force the single app font (Kurale) onto every Text/TextInput before the
// first render, so no screen can flash a system font while the font loads.
installGlobalFont();
// Initialize Sentry's native SDK for crash reporting. Unlike the JS-only error
// handler above, this captures NATIVE crashes (force-closes / SIGSEGV / Java
// FATAL EXCEPTION) that never reach JS — plus unhandled JS errors. No-op when
// no DSN is configured (e.g. Expo Go without a key), so the app runs offline.
// Errors routed through reportError() (ErrorBoundary, etc.) are forwarded with
// their source/metadata context.
const sentryDsn = getSentryDsn();
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // Crash + error capture only; no performance tracing by default.
    tracesSampleRate: 0,
  });
  setErrorForwarder((error, context) => {
    const err = error instanceof Error ? error : new Error(String(error));
    Sentry.withScope((scope) => {
      scope.setTag('source', context.source);
      if (context.metadata) {
        scope.setExtras(context.metadata as Record<string, unknown>);
      }
      Sentry.captureException(err);
    });
  });
}

function MainApp() {
  // Safe-area bases (notch / home indicator) — screens add breathing room on top
  const screenInsets = useScreenInsets();
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  // Launch-route gate: currentScreen defaults to 'home', but a cold launch may
  // resolve into the puzzle or pit (an interrupted-onboarding resume). Until the
  // resume effect decides, we keep showing the branded boot screen rather than
  // painting 'home' for a frame and then swapping to the board (the F141 home
  // flash). Cleared by the resume effect (every branch) and, as a brick-proof
  // backstop, by a short timeout so a stalled decision can never trap the boot
  // screen.
  const [bootRouting, setBootRouting] = useState(true);
  const [homePanY, setHomePanY] = useState<number | null>(null);

  // Custom hooks - game logic & persistence separated from UI
  const [puzzle, puzzleActions] = usePuzzleGame();
  const [persistence, persistenceActions] = useGamePersistence();
  const [victoryFlow, victoryActions] = useVictoryFlow();
  const [achievementState, achievementActions] = useAchievementQueue();
  const setPuzzleGameState = puzzleActions.setGameState;
  const setPuzzleMessage = puzzleActions.setMessage;
  const setSelectedVariant = puzzleActions.setSelectedVariant;

  // Live mirrors of gameState + victory-lock for callbacks that must read the
  // CURRENT value without capturing it in a stale closure (e.g. the speed
  // timer's onTimeUp, which can otherwise fire a loss buzz after a winning
  // commit — a buzzer-beater race).
  const gameStateRef = useRef(puzzle.gameState);
  useEffect(() => { gameStateRef.current = puzzle.gameState; }, [puzzle.gameState]);
  const isProcessingVictoryRef = useRef(victoryFlow.isProcessingVictory);
  useEffect(() => { isProcessingVictoryRef.current = victoryFlow.isProcessingVictory; }, [victoryFlow.isProcessingVictory]);

  // Milestone hint-gift acknowledgment: the trickle grants a hint during the
  // victory window (HINT button occluded by the modal). Defer a one-shot pulse
  // on the HINT button to the NEXT board so the raised count is acknowledged
  // rather than swapping in silently.
  const [hintPulseSignal, setHintPulseSignal] = useState(0);
  const hintPulsePendingRef = useRef(false);
  // Grace-gate the board LOADING overlay: a fast bank pick sets LOADING for a
  // few ms, which used to flash the whole loading card. Only show it once
  // LOADING/isProcessing has persisted past a short window (mirrors the
  // victorySpinnerVisible grace on the record/persist gap).
  const [loadingGraceVisible, setLoadingGraceVisible] = useState(false);
  useEffect(() => {
    const loading = puzzle.gameState === GameState.LOADING || puzzle.isProcessing;
    if (!loading) { setLoadingGraceVisible(false); return; }
    const t = setTimeout(() => setLoadingGraceVisible(true), 250);
    return () => clearTimeout(t);
  }, [puzzle.gameState, puzzle.isProcessing]);

  // Brick-proof backstop for the launch-route gate: if the resume decision
  // never lands (e.g. onboarding load stalls), lift the boot screen anyway so
  // the app can never hang on it. Worst case this restores the pre-fix behavior
  // (a possible home flash), never a stuck screen.
  useEffect(() => {
    const t = setTimeout(() => setBootRouting(false), 800);
    return () => clearTimeout(t);
  }, []);
  // Tracked timer for the one-time Swift-Victories hint (F110): cleared on
  // unmount so a raw setTimeout can't fire into a torn-down tree.
  const swiftHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (swiftHintTimerRef.current) clearTimeout(swiftHintTimerRef.current); }, []);
  useEffect(() => {
    if (puzzle.gameState === GameState.PLAYING && hintPulsePendingRef.current) {
      hintPulsePendingRef.current = false;
      setHintPulseSignal((s) => s + 1);
    }
  }, [puzzle.gameState]);

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

  // StarBurst effect state for valid moves. comboTier drives the burst's
  // size/count escalation (Confetti.StarBurst) so a rising clean-move streak
  // visibly grows the celebration instead of firing an identical 8-square pop.
  const [starBurst, setStarBurst] = useState<{ active: boolean; x: number; y: number; comboTier: number }>({
    active: false, x: 0, y: 0, comboTier: 0,
  });
  // Cold-open first-move settle (F61): a one-shot warm success haptic so the
  // "Feel that?" line describes something the hands actually felt. Fires once.
  const coldOpenSettleFiredRef = useRef(false);
  const [invalidDropSignal, setInvalidDropSignal] = useState(0);
  const [successDropSignal, setSuccessDropSignal] = useState(0);
  // Blind Offering's once-at-the-end judgment beat (see BlindJudgmentOverlay):
  // an id-bumped signal so the accept-sweep / reject-pulse re-fires each time.
  const [blindJudgmentSignal, setBlindJudgmentSignal] = useState<BlindJudgmentSignal | null>(null);
  const blindJudgmentIdRef = useRef(0);
  const fireBlindJudgment = useCallback((kind: 'accepted' | 'rejected') => {
    blindJudgmentIdRef.current += 1;
    setBlindJudgmentSignal({ kind, id: blindJudgmentIdRef.current });
  }, []);

  // Track whether the current slot press originated from a drag-drop (for haptic/effect escalation)
  const isDragDropRef = useRef(false);
  // Store drop-shake animation so it can be stopped if a new one starts before it finishes
  const dropShakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

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

  // Sequential victory toast queue. The post-victory receipts (streak
  // milestone amber, daily milestones, freeze saves, harvest overflow, pace
  // beats...) used to race into the single setMessage slot at fixed delays,
  // so any two on one win clobbered each other. Each queued line now holds
  // the slot for VICTORY_TOAST_DURATION_MS before the next shows. Priority:
  // money receipts outrank informational lines, which outrank nudges,
  // regardless of arrival order (several enqueuers are fire-and-forget
  // promises). Cleared on new-board starts and victory-exit navigation.
  const victoryToastQueueRef = useRef<{ message: string; rank: number }[]>([]);
  const victoryToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNextVictoryToast = useCallback(function showNext() {
    const next = victoryToastQueueRef.current.shift();
    if (!next) {
      victoryToastTimerRef.current = null;
      setVictoryReceipt(null);
      return;
    }
    // Route into the in-modal receipt slot (VictoryModal), NOT the board Toast
    // which renders under the modal overlay and would be invisible during the
    // victory window.
    setVictoryReceipt(next.message);
    victoryToastTimerRef.current = setTimeout(showNext, VICTORY_TOAST_DURATION_MS);
  }, []);
  const enqueueVictoryToast = useCallback((
    message: string,
    priority: 'receipt' | 'info' | 'nudge' = 'info'
  ) => {
    const rank = priority === 'receipt' ? 0 : priority === 'info' ? 1 : 2;
    const queue = victoryToastQueueRef.current;
    let insertAt = queue.length;
    while (insertAt > 0 && queue[insertAt - 1].rank > rank) insertAt--;
    queue.splice(insertAt, 0, { message, rank });
    if (victoryToastTimerRef.current === null) {
      victoryToastTimerRef.current = setTimeout(
        showNextVictoryToast,
        VICTORY_TOAST_INITIAL_DELAY_MS
      );
    }
  }, [showNextVictoryToast]);
  const clearVictoryToastQueue = useCallback(() => {
    victoryToastQueueRef.current = [];
    if (victoryToastTimerRef.current !== null) {
      clearTimeout(victoryToastTimerRef.current);
      victoryToastTimerRef.current = null;
    }
    setVictoryReceipt(null);
  }, []);

  // Endgame cinematics (FINAL_PUZZLE_EVENT / POST_REVELATION_EVENT) are the
  // game's climax, but their completion flags persist BEFORE the cinematic is
  // queued on a 1.5s victory timeout. A habitual exit inside that window runs
  // startVictoryExitFlow -> clearVictoryTimeouts, which drops the queued event
  // FOREVER (the flag is set, so the next win never re-queues it). Hold the
  // queued event here so an exit in the window can play it instead of losing
  // it — the PhaseTransitionOverlay renders at App root above every screen.
  const pendingEndgameEventRef = useRef<PhaseTransitionEvent | null>(null);

  // HOUSE ASKS — the small optional per-board constraint (services/houseAsks):
  // on some standard boards the house asks that one letter travel, or that it
  // stay untouched. App-level state ONLY, on purpose: the ask deliberately
  // does NOT survive autosave restore (dropped silently — a deliberate
  // simplification: a restored board simply has no ask), and an unkept ask is
  // never mentioned again (soft-fail contract).
  const [houseAsk, setHouseAsk] = useState<HouseAsk | null>(null);
  // Pending deferred ask-line timer (the board-start message gets the slot
  // first); cancelled whenever the ask is cleared.
  const houseAskLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Armed immediately before each restorePuzzleState call so a restored board
  // never rolls a fresh ask; consumed (reset) by the board-identity roll effect.
  const houseAskRestoreSuppressRef = useRef(false);
  const clearHouseAsk = useCallback(() => {
    if (houseAskLineTimerRef.current !== null) {
      clearTimeout(houseAskLineTimerRef.current);
      houseAskLineTimerRef.current = null;
    }
    setHouseAsk(null);
  }, []);

  useEffect(() => {
    return () => {
      clearVictoryTimeouts();
      clearVictoryToastQueue();
      // A pending deferred house-ask line must not fire after teardown.
      if (houseAskLineTimerRef.current !== null) {
        clearTimeout(houseAskLineTimerRef.current);
        houseAskLineTimerRef.current = null;
      }
    };
  }, [clearVictoryTimeouts, clearVictoryToastQueue]);

  // Home nudge — track consecutive puzzles without visiting home
  const puzzlesSinceHomeVisit = useRef(0);

  // Guard: pit-resume useEffect should only fire on initial mount
  const pitResumeCheckedRef = useRef(false);
  // Local day the daily launch tasks (freeze grant, login claim) last ran for.
  // Null until the first run; compared against getLocalDateString() so the
  // AppState listener can re-run them after an overnight foreground return
  // without ever double-firing on the same local day.
  const dailyTasksDateRef = useRef<string | null>(null);
  // True once THIS SESSION has contained any onboarding (launched mid-intro
  // or completed it live). While set, the daily-login claim/modal is skipped
  // for the whole session: a "welcome back" reward must never precede
  // leaving, so the 7-day cycle starts on the player's NEXT launch instead
  // of minutes into the very first session.
  const onboardingSessionRef = useRef(false);
  // Set when the store-review sheet fired on this win (it runs mid-victory,
  // outside the one-nudge-per-exit chain); the exit checks + clears it so a
  // review sheet and a nudge can never stack on the same win.
  const reviewPromptFiredRef = useRef(false);
  // Patron (cosmetic IAP) modal — opened from Shop header / Settings
  const [showPatronModal, setShowPatronModal] = useState(false);
  // Store modal — consumable amber/hint packs + the cosmetic bundle.
  const [showStoreModal, setShowStoreModal] = useState(false);
  // Bumped when an amber-changing App-level modal (Store/Patron) closes, so a
  // mounted HomeScreen reloads its progress (purchased amber must register
  // against the next unlock immediately, not after the next screen change).
  const [homeRefreshSignal, setHomeRefreshSignal] = useState(0);
  // Solve-time stopwatch for the Daily Challenge leaderboard (ms since board ready)
  const puzzleStartTimeRef = useRef<number>(0);
  // True while the current daily board was eased (first-ever daily) — its
  // result skips the shared leaderboard submit (the board isn't the shared one).
  const dailyEasedRef = useRef<boolean>(false);
  // handleShare is defined far below; the share-prompt (declared above it) calls
  // it through this ref, kept current each render, to avoid a TDZ cycle.
  const handleShareRef = useRef<() => void>(() => {});
  const buildShareDataRef = useRef<() => { result: ShareableResult; challengeText: string | null } | null>(() => null);
  const openShareModalRef = useRef<(d: { result: ShareableResult; challengeText: string | null }) => void>(() => {});
  // Share payload snapshotted at victory-exit time, BEFORE startVictoryExitFlow
  // resets victoryData — the proactive share prompt reads it so its Share CTA
  // works after teardown.
  const pendingShareSnapshotRef = useRef<{ result: ShareableResult; challengeText: string | null } | null>(null);
  // Daily Challenge leaderboard standing for the current victory (null = none/off)
  const [dailyRank, setDailyRank] = useState<DailyRank | null>(null);
  // Persistent daily-ladder "best this week / your history" line + trend for the
  // Victory modal. Works offline (independent of the live dailyRank fetch).
  const [dailyLadderLine, setDailyLadderLine] = useState<string | null>(null);
  // Full-moon event bonus line, shown inside the VictoryModal on event-day
  // daily completions (the puzzle toast renders UNDER the modal overlay).
  const [eventBonusLine, setEventBonusLine] = useState<string | null>(null);
  // Victory receipt line: the sequential victory-toast queue plays through this
  // IN-MODAL slot (VictoryModal renders it), not the board Toast — the board
  // Toast is zIndex 50, UNDER the modal's 500, so victory receipts were
  // effectively invisible. The board Toast is now reserved for board-time
  // messages only. Cleared with the queue on every victory-exit path.
  const [victoryReceipt, setVictoryReceipt] = useState<string | null>(null);
  const [dailyLadderTrend, setDailyLadderTrend] = useState<'up' | 'down' | 'flat' | null>(null);
  // Quiet, spoiler-safe aggregate social-proof line for the victory modal
  const [socialProofLine, setSocialProofLine] = useState<string | null>(null);
  // Last-known global words-offered count for today; reused when a victory's
  // own fetch fails so the social-proof line doesn't blink out mid-session.
  const socialProofCacheRef = useRef<{ date: string; count: number } | null>(null);
  // Optional rewarded "double the reward" — one claim per victory
  const [victoryDoubleClaimed, setVictoryDoubleClaimed] = useState(false);
  // The setup menu keeps this private ladder snapshot current without making
  // the puzzle hook own persistence for a Phase-5-only modifier.
  const [unbrokenWeaveMastery, setUnbrokenWeaveMastery] = useState<UnbrokenWeaveMastery | null>(null);
  // Whether THIS victory presents the double slot at all. Decided (and the
  // presentation recorded) once per victory at processing time — the slot is
  // cadence-capped per local day and blocked at phase 4+ (monetizationPrompts).
  const [victoryDoubleOffer, setVictoryDoubleOffer] = useState(false);

  // Phase transition overlay state
  const [phaseTransitionEvent, setPhaseTransitionEvent] = useState<PhaseTransitionEvent | null>(null);

  // True while the player is in a Daily Challenge run (drives autosave tagging,
  // victory recording, and the VictoryModal "Daily Challenge Complete" header).
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);
  // Result-card share preview (null = closed).
  const [shareResultData, setShareResultData] = useState<ShareableResult | null>(null);
  // Friend-challenge share text for the just-completed board (standard,
  // non-daily only — the encoded link starts a standard board on the
  // recipient's device, so other variants/dailies never offer it).
  const [shareChallengeText, setShareChallengeText] = useState<string | null>(null);

  // Daily-login claim modal — set to the already-granted reward to present it
  // (null = closed). Purely presentational; amber is credited before this is set.
  const [dailyLoginGrant, setDailyLoginGrant] = useState<DailyLoginGrant | null>(null);
  // One-time daily-reminder pre-permission prompt (styled in-game modal, not a
  // bare OS Alert). Content is the phase-aware getNotificationPromptText copy.
  const [notificationPrompt, setNotificationPrompt] = useState<
    { title: string; body: string; accept: string; decline: string } | null
  >(null);

  // Speed-variant escalation: consecutive speed wins increment this, shortening
  // each subsequent clock. Reset on time-up exit or whenever a fresh run begins
  // (a rewarded rescue deliberately does NOT reset it — the run continues).
  const [speedRound, setSpeedRound] = useState(0);
  // The private "words come to you faster now" pace beat fires at most once per
  // app session so it lands as a rare moment, not a nag.
  const fasterBeatShownRef = useRef(false);
  // One rewarded rescue per board: set when a rescue is claimed, reset on every
  // fresh-board path so the next attempt gets its own rescue.
  const [speedRescueUsed, setSpeedRescueUsed] = useState(false);
  // Every fresh-run entry point must reset BOTH pieces of speed-run state
  // together (escalation ladder + once-per-board rescue) — one callable so a
  // future entry point can't forget half the pair.
  const resetSpeedRun = useCallback(() => {
    setSpeedRound(0);
    setSpeedRescueUsed(false);
  }, []);

  // Restored speed timer value (consumed once by the speed timer effect)
  const restoredSpeedTimeRef = useRef<number | null>(null);
  // Final-countdown tension. The displayed value is a whole-second integer that
  // changes once per second, so a per-second tick + a native-driver "pop" turns
  // the game's deadest moment into its tensest. speedPulseScale runs on the UI
  // thread, independent of React re-renders.
  const speedPulseScale = useRef(new Animated.Value(1)).current;
  const prevSpeedRemainingRef = useRef<number | null>(null);
  // Speed escalation cue: the "Round N" badge pops (and rings a bright sting)
  // each time the streak tightens the clock, so the ladder is a felt moment
  // instead of a silent number change.
  const speedRoundPulse = useRef(new Animated.Value(1)).current;
  const prevSpeedRoundRef = useRef(0);
  useEffect(() => {
    const prev = prevSpeedRoundRef.current;
    prevSpeedRoundRef.current = speedRound;
    if (speedRound > prev && speedRound > 0) {
      if (getSettingsSync().reducedMotion) {
        speedRoundPulse.setValue(1);
      } else {
        speedRoundPulse.setValue(0.6);
        Animated.spring(speedRoundPulse, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
      }
      // A bright rising ping (the top rung of the move ladder) marks the tighter
      // clock — distinct from the completing move's own streak-tiered chime.
      soundValidMove(4);
    }
  }, [speedRound, speedRoundPulse]);

  // Setup-chip anchor: the difficulty menu (a Modal) hangs from the chip's real
  // window position, measured on open. Cosmetic-only — the Modal owns its bounds
  // so a stale/missing measurement just falls back to the static offset.
  const difficultyChipRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const [difficultyMenuAnchorTop, setDifficultyMenuAnchorTop] = useState<number | null>(null);
  const measureDifficultyChip = useCallback(() => {
    const node = difficultyChipRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      if (typeof y === 'number' && typeof h === 'number' && h > 0) {
        // Hang the panel a small gap below the chip's bottom edge.
        setDifficultyMenuAnchorTop(y + h + 8);
      }
    });
  }, []);

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
  // Per-destination screen reveal signature (F60): as the transition overlay
  // lifts, the arriving screen settles with a native-driver motion keyed to the
  // destination — puzzle/home breathe in (scale 1.02->1.0), the pit sinks in
  // (translateY -14->0, "underground"). 0 = at rest; 1 = the start-of-reveal
  // extreme. Rests at 0 so the wrapper transform is neutral between transitions.
  const screenRevealAnim = useRef(new Animated.Value(0)).current;
  const [screenRevealKind, setScreenRevealKind] = useState<'lift' | 'sink' | 'none'>('none');
  // Opacity stutter for the prominent first-victory glitch (held at 1 under
  // reduced motion).
  const glitchStutter = useRef(new Animated.Value(1)).current;
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
      duration: SCREEN_FADE_COVER_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // While fully opaque: swap colors to match destination screen
      const destColor = getScreenBackgroundColor(screen, persistence.currentPhase);
      setTransitionOverlayColor(destColor);
      setRootBgColor(destColor);

      setCurrentScreen(screen);
      callback?.();
      // Arm the destination reveal signature: the pit sinks in, every other
      // screen breathes in. Set the anim to its start extreme now (hidden under
      // the opaque overlay), then settle it as the overlay lifts.
      const kind: 'lift' | 'sink' = screen === 'pit' ? 'sink' : 'lift';
      setScreenRevealKind(kind);
      screenRevealAnim.setValue(1);
      // Wait one frame for React to render the new screen before revealing
      requestAnimationFrame(() => {
        // Fade overlay OUT — now blends through destination-matching color
        Animated.timing(transitionOverlay, {
          toValue: 0,
          duration: SCREEN_FADE_REVEAL_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start();
        // Settle the reveal signature (springs the arriving screen into place).
        Animated.spring(screenRevealAnim, {
          toValue: 0,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }).start();
      });
    });
  }, [transitionOverlay, screenRevealAnim, persistence.currentPhase]);

  // Keep root background AND the transition-cover color in sync with the current
  // screen + phase (handles phase changes without transitions). The cover color
  // must track the screen at REST, or the next transition's fade-IN covers the
  // OUTGOING screen with a stale color (its init '#1A1A2E', or the previous
  // transition's destination) and briefly washes the screen dark before the
  // swap. Syncing it here makes every fade-in an invisible same-color cover; the
  // mid-transition swap to the destination color (in transitionTo) is unchanged.
  useEffect(() => {
    const c = getScreenBackgroundColor(currentScreen, persistence.currentPhase);
    setRootBgColor(c);
    setTransitionOverlayColor(c);
  }, [currentScreen, persistence.currentPhase]);

  // ========================================================================
  // Extracted hooks
  // ========================================================================

  // Speed timer for speed-variant puzzles. The escalation ladder is NOT reset
  // here: a rewarded rescue may continue this run, so the reset moved to the
  // Time's-Up overlay exits (Try Again / Home) — every other fresh-run path
  // already resets it.
  const onSpeedTimeUp = useCallback(() => {
    // Buzzer-beater guard: a winning commit that lands in the same frame as the
    // clock hitting 0 must NOT get loss feedback. If the victory flow is
    // already processing, or the board is no longer PLAYING, swallow the timeout.
    if (isProcessingVictoryRef.current || gameStateRef.current !== GameState.PLAYING) return;
    setPuzzleGameState(GameState.GAME_OVER);
    hapticWarning();
    soundInvalidMove();
    setPuzzleMessage(getSpeedTimeUpMessage(persistence.currentPhase));
  }, [setPuzzleGameState, setPuzzleMessage, persistence.currentPhase]);

  const [speedTimer, speedTimerActions] = useSpeedTimer(onSpeedTimeUp);
  const { startSpeedTimer, stopSpeedTimer } = speedTimerActions;

  // Countdown tick. The drain envelope ramps rather than staying flat until the
  // wire: a gentle 'soft' pre-tick from 10..6s (no sound, faint haptic, tiny
  // pop), then a 'normal' tick inside the tension zone (5..4), then 'critical'
  // (3..1, heavier haptic + bigger pop). Never on the start, never on a rescue
  // that raises the clock, never at 0. Sound/haptics self-gate on their own
  // settings; the visual pop is suppressed under reduced motion.
  useEffect(() => {
    const r = speedTimer.speedTimeRemaining;
    const prev = prevSpeedRemainingRef.current;
    prevSpeedRemainingRef.current = r;
    const kind = speedTickKind(prev, r);
    if (kind === 'none') {
      speedPulseScale.setValue(1);
      return;
    }
    const critical = kind === 'critical';
    const soft = kind === 'soft';
    // The soft pre-tick is felt, not heard: a faint haptic keeps the drain
    // present without a per-second chime crowding the whole run with sound.
    if (soft) {
      hapticSelection();
    } else {
      soundTap();
      if (critical) { hapticMedium(); } else { hapticSelection(); }
    }
    if (!getSettingsSync().reducedMotion) {
      speedPulseScale.setValue(1);
      Animated.sequence([
        Animated.timing(speedPulseScale, { toValue: critical ? 1.28 : soft ? 1.07 : 1.16, duration: 90, useNativeDriver: true }),
        Animated.spring(speedPulseScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [speedTimer.speedTimeRemaining, speedPulseScale]);

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
    clearBoard: puzzleActions.clearBoard,
    setShowConfetti: puzzleActions.setShowConfetti,
    refreshStats: persistenceActions.refreshStats,
    resetVictory: victoryActions.resetVictory,
  }), [transitionTo, puzzleActions.startNewGame, puzzleActions.setGameState, puzzleActions.clearBoard, puzzleActions.setShowConfetti, persistenceActions.refreshStats, victoryActions.resetVictory]);

  const [onboardingFlow, onboardingActions] = useOnboardingFlow(onboardingCallbacks);

  const launchColdOpenPuzzle = useCallback(async () => {
    const [saved, stats] = await Promise.all([
      loadPuzzleState(),
      getCumulativeStats(),
    ]);
    const canRestoreColdOpen = (
      saved?.gameState === GameState.PLAYING &&
      !saved.isPlayingDaily &&
      saved.difficulty === 'EASY' &&
      saved.gameMode === 'standard' &&
      saved.currentVariant === 'standard' &&
      saved.blindMode !== true &&
      saved.unbrokenWeaveMode !== true
    );
    const route = resolveColdOpenLaunchRoute(
      canRestoreColdOpen,
      stats?.totalPuzzlesCompleted ?? 0,
    );

    if (route === 'home_empty') {
      if (saved) await clearPuzzleState();
      await onboardingActions.advanceOnboarding('home_empty');
      transitionTo('home', () => {
        puzzleActions.clearBoard();
      });
      setBootRouting(false);
      return;
    }

    // Set the screen BEFORE lifting the boot gate so the board paints directly,
    // never a frame of 'home' in between.
    setCurrentScreen('puzzle');
    setBootRouting(false);
    if (route === 'restore' && saved) {
      // Restored boards never carry (or roll) a house ask.
      houseAskRestoreSuppressRef.current = true;
      puzzleActions.restorePuzzleState(saved);
    } else {
      if (saved) await clearPuzzleState();
      await puzzleActions.startNewGame('EASY', 'standard', 'standard', false, false);
    }
    puzzleActions.setMessage(COLD_OPEN_INSTRUCTION);
    logEvent({ type: 'puzzle_started', data: { difficulty: 'EASY', onboarding: true } });
  }, [onboardingActions, puzzleActions, transitionTo]);

  const handleColdOpenSkipPress = useCallback(() => {
    showGameAlert(
      '',
      getSkipConfirmText(),
      [
        {
          text: getSkipConfirmLeaveLabel(),
          style: 'destructive',
          onPress: onboardingActions.handleSkipOnboarding,
        },
        {
          text: getSkipConfirmStayLabel(),
          style: 'cancel',
        },
      ],
    );
  }, [onboardingActions.handleSkipOnboarding]);

  // Auto-save puzzle state during active play
  useAutosave({
    currentScreen,
    isPlayingDaily,
    rows: puzzle.rows,
    activeRowIndex: puzzle.activeRowIndex,
    selectedLetter: puzzle.selectedLetter,
    gameState: puzzle.gameState,
    isProcessingVictory: victoryFlow.isProcessingVictory,
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
    blindMode: puzzle.blindMode,
    unbrokenWeaveMode: puzzle.unbrokenWeaveMode,
    spentLetters: puzzle.spentLetters,
    currentVariant: puzzle.currentVariant,
    selectedVariant: puzzle.selectedVariant,
    moveDirection: puzzle.moveDirection,
    currentPhase: puzzle.currentPhase,
    lastFormedWord: puzzle.lastFormedWord,
    doubleShiftPhase: puzzle.doubleShiftPhase,
    speedTimeRemaining: speedTimer.speedTimeRemaining,
    isSharedChallenge: puzzle.isSharedChallenge,
    isFinalBoard: puzzle.isFinalBoard,
  });

  // ========================================================================
  // Initialization
  // ========================================================================

  // Keep the audio service's phase mirror in sync so move/victory chimes switch
  // to their dark variants once the descent deepens (Phase 3+).
  useEffect(() => {
    setAudioPhase(persistence.currentPhase);
  }, [persistence.currentPhase]);

  useEffect(() => {
    getUnbrokenWeaveMastery().then(setUnbrokenWeaveMastery).catch(() => {});
  }, []);

  // Ambient music bed. Starts once persistence hydrates (the bed must open on
  // the REAL phase, not a Phase-0 default — cumulativeStats flips from null
  // exactly once, in the same batch that sets currentPhase), and re-crossfades
  // when the phase advances — but only after any ceremony overlay completes
  // (phaseTransitionEvent -> null), so the pit ignition / finale cinematics
  // keep their own soundscape and the new bed lands as the world settles.
  // startMusicForPhase is a no-op when the right bed is already playing, so
  // re-runs (refreshStats, appEpoch remounts, a rebuildSessionFromStorage
  // whose refresh changes currentPhase) are free.
  //
  // Backgrounding: audio.ts initializes expo-audio with
  // shouldPlayInBackground: false, which auto-pauses playback when the app
  // leaves the foreground — deliberately NO stopMusic() here (stopping would
  // release the player and force a re-decode + fade-up from silence on every
  // app switch). The foreground listener resumes the paused bed: a same-track
  // startMusicForPhase calls play() when the player isn't playing.
  const musicPhaseRef = useRef(persistence.currentPhase);
  musicPhaseRef.current = persistence.currentPhase;
  // The music FAMILY follows the screen: the puzzle screen gets a focused bed,
  // the Offering Pit a ritual one, and every other screen (home + all the menus)
  // keeps the world bed. It's tracked in a ref too so the foreground-resume
  // restarts the bed for the screen the player is actually on.
  const musicScreen: MusicScreen =
    currentScreen === 'puzzle' ? 'puzzle' : currentScreen === 'pit' ? 'pit' : 'home';
  const musicScreenRef = useRef(musicScreen);
  musicScreenRef.current = musicScreen;
  const musicHydratedRef = useRef(false);
  useEffect(() => {
    if (persistence.cumulativeStats === null) return;
    musicHydratedRef.current = true;
    if (phaseTransitionEvent !== null) return;
    startMusicForScreen(musicScreen, persistence.currentPhase).catch(() => {});
  }, [persistence.cumulativeStats, persistence.currentPhase, phaseTransitionEvent, musicScreen]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!musicHydratedRef.current) return;
      startMusicForScreen(musicScreenRef.current, musicPhaseRef.current).catch(() => {});
    });
    return () => subscription.remove();
  }, []);

  // Glitch stutter for the prominent first-victory glitch: a short on/off
  // flicker so a held 1.4s glitch reads as a genuine tear, not a caption.
  // Reduced motion pins it fully visible.
  useEffect(() => {
    if (!(orchestration.showVictoryGlitch && orchestration.victoryGlitchProminent)) return;
    // Screen-reader treatment (F155): the PROMINENT held glitch (the guaranteed
    // first-win "something else is here" beat) is spoken so its wrong-note lands
    // for a screen-reader player too. The SUBLIMINAL ~8% ambient glitches are
    // NOT prominent, so they stay silent by design — a flicker, not a caption.
    if (orchestration.victoryGlitch) {
      announceForA11y(orchestration.victoryGlitch);
    }
    if (getSettingsSync().reducedMotion) {
      glitchStutter.setValue(1);
      return;
    }
    const flick = (to: number, duration: number) =>
      Animated.timing(glitchStutter, { toValue: to, duration, useNativeDriver: true });
    const seq = Animated.sequence([
      flick(0.25, 60), flick(1, 70), flick(0.5, 50), flick(1, 90),
      flick(0.35, 55), flick(1, 120),
    ]);
    seq.start();
    return () => { seq.stop(); glitchStutter.setValue(1); };
  }, [orchestration.showVictoryGlitch, orchestration.victoryGlitchProminent, orchestration.victoryGlitch, glitchStutter]);

  // New Cycle (NG+) opening beat — once per new cycle, on the first quiet home
  // landing after it begins, the bright days announce themselves (wrongly).
  useEffect(() => {
    if (onboardingFlow.isOnboarding) return;
    consumeCycleOpening().then(cycle => {
      if (cycle != null) {
        showGameAlert('', getNewCycleOpeningLine(cycle));
      }
    }).catch(() => {});
  }, [onboardingFlow.isOnboarding]);

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
    uploadToCloud().catch(() => {});
    return () => {
      if (__DEV__) {
        stopFrameMonitoring();
      }
    };
  }, []);

  // One-time notice after a late cloud restore remounted the app: without it,
  // a fresh-install player a minute into onboarding sees the screen silently
  // hard-reset to their restored save with zero explanation.
  useEffect(() => {
    if (pendingRestoreNotice) {
      pendingRestoreNotice = false;
      showGameAlert('Restored', 'Your saved progress was found in the cloud and restored.');
    }
  }, []);

  // Schedule notifications once persistence has hydrated, with the REAL phase.
  // The old mount-time scheduleAllNotifications(0) rewrote the entire reminder
  // ladder with bright Phase-0 copy on every browse-only launch — precisely for
  // the lapsed dark-phase players the win-back ladder targets. cumulativeStats
  // flips from null exactly once, when the initial persistence load lands (the
  // same batch that sets currentPhase), so this fires once with correct data.
  const notificationsScheduledRef = useRef(false);
  useEffect(() => {
    if (persistence.cumulativeStats === null) return;
    if (notificationsScheduledRef.current) return;
    notificationsScheduledRef.current = true;
    scheduleAllNotifications(persistence.currentPhase).catch(() => {});
  }, [persistence.cumulativeStats, persistence.currentPhase]);

  // (The Android hardware-back handler lives below handleGoToPit — its deps
  // array references that callback, which must be initialized first.)

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
        setBootRouting(false);
      } else if (step === 'cold_open_puzzle') {
        // A kill during the self-directed opener resumes the exact autosaved
        // board when possible; otherwise start curated EASY puzzle 0.
        // launchColdOpenPuzzle lifts the boot gate itself once it has set the
        // screen (so the board, not home, is what appears); clear on failure too.
        launchColdOpenPuzzle().catch(() => setBootRouting(false));
      } else if (step === 'puzzle_tutorial') {
        // Re-init the guided tutorial puzzle so the player resumes a live,
        // winnable board with the Fox overlay rather than a dead screen.
        setCurrentScreen('puzzle');
        puzzleActions.startNewGame('EASY', 'standard', 'standard', false, false);
        setBootRouting(false);
      } else {
        // Normal launch (onboarding complete, or a non-puzzle step): home is the
        // correct destination, so lift the boot gate and let it paint.
        setBootRouting(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.onboardingReady, onboardingFlow.onboardingStep, launchColdOpenPuzzle]);

  // Cold-open warmth: the opener's guiding voice (COLD_OPEN_INSTRUCTION, set at
  // launch) reacts with delight the instant the player lands their first valid
  // move. Keyed on history LENGTH reaching 1 so it fires exactly once and never
  // stomps invalid-word feedback (a rejected drop doesn't grow history). The
  // hook sets its generic move message on that same move; this effect runs
  // after the commit, so Ember's line wins. Only the cold-open step, only while
  // playing.
  useEffect(() => {
    if (onboardingFlow.onboardingStep !== 'cold_open_puzzle') return;
    if (puzzle.gameState !== GameState.PLAYING) return;
    if (puzzle.history.length === 1) {
      puzzleActions.setMessage(COLD_OPEN_FIRST_MOVE);
      // Make the delight FELT, not just told: ~150ms after the commit (letting
      // the move's own catch bounce + star burst land first), a warm SUCCESS
      // haptic — a step above the ordinary move haptic — so the hands feel the
      // beat the line describes. Once ever.
      if (!coldOpenSettleFiredRef.current) {
        coldOpenSettleFiredRef.current = true;
        const t = setTimeout(() => { hapticSuccess(); }, 150);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.onboardingStep, puzzle.gameState, puzzle.history.length]);

  // Cold-open preview teach: the first time the player picks a letter UP on
  // the opener board (the ghost previews just appeared, no move committed
  // yet), the same warm voice explains the green check / red cross marks and
  // names undo — the tools are taught at the exact moment they first matter.
  // Ref-guarded to once; keyed on selection BEFORE the first commit so it can
  // never clobber the first-move delight line above (which fires on history
  // growth, after the commit).
  const coldOpenPreviewTaughtRef = useRef(false);
  useEffect(() => {
    if (onboardingFlow.onboardingStep !== 'cold_open_puzzle') return;
    if (puzzle.gameState !== GameState.PLAYING) return;
    if (!puzzle.selectedLetter) return;
    if (puzzle.history.length > 0) return;
    if (coldOpenPreviewTaughtRef.current) return;
    coldOpenPreviewTaughtRef.current = true;
    puzzleActions.setMessage(COLD_OPEN_PREVIEW_TEACH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.onboardingStep, puzzle.gameState, puzzle.selectedLetter, puzzle.history.length]);

  // Session-scoped onboarding marker for the daily-login deferral: latched
  // the first time this session observes an onboarding step (post-hydration),
  // and never unlatched — completion mid-session must keep the skip.
  useEffect(() => {
    if (onboardingFlow.onboardingReady && onboardingFlow.isOnboarding) {
      onboardingSessionRef.current = true;
    }
  }, [onboardingFlow.onboardingReady, onboardingFlow.isOnboarding]);

  // Daily launch tasks — free streak freeze (every 14 days) + daily login
  // reward claim. Runs once per LOCAL day: on cold launch via the effect below,
  // and again from the AppState listener when the app returns to the foreground
  // after a local-day rollover (a session kept alive overnight would otherwise
  // miss a whole day of the daily systems). The freeze is granted silently
  // during onboarding; the login claim waits until onboarding completes so the
  // first session isn't interrupted before the player understands amber.
  const runDailyLaunchTasks = useCallback(async (isRollover: boolean = false) => {
    if (!onboardingFlow.onboardingReady) return;
    const today = getLocalDateString();
    if (dailyTasksDateRef.current === today) return;
    dailyTasksDateRef.current = today;

    try {
      const granted = await checkFreeStreakFreeze();
      // The notice is a launch-moment courtesy only — on a mid-session day
      // rollover the player may be mid-puzzle, so the grant stays silent.
      if (granted && !onboardingFlow.isOnboarding && !isRollover) {
        // A gift, not a trivial receipt: a success haptic + a bright ping so
        // the free freeze reads as something earned, not a stray alert.
        hapticSuccess();
        soundValidMove(3);
        showGameAlert(
          'Free Streak Freeze',
          getStreakFreezeGrantedMessage(persistence.currentPhase)
        );
      }
    } catch {
      // Non-critical — never block launch on a freeze grant.
    }

    if (onboardingFlow.isOnboarding) {
      // Don't consume the day: when onboarding completes this re-runs and the
      // login reward is claimed then (checkFreeStreakFreeze is idempotent).
      dailyTasksDateRef.current = null;
      return;
    }

    // First-session deferral: a session that contained onboarding never
    // claims the daily login reward (onboardingSessionRef) — the claim is
    // NOT consumed, so the cycle starts on the next launch, when "come back
    // each day" actually has a yesterday. Every other launch task runs.
    if (!onboardingSessionRef.current) {
      try {
        const grant = await claimDailyLoginReward();
        if (grant) {
          persistenceActions.refreshStats();
          // Presentation is deferred: the modal only shows on a quiet home
          // screen (see dailyLoginGrantVisible), so a claim that lands while
          // the player is elsewhere is held and presented on home arrival.
          setDailyLoginGrant(grant);
        }
      } catch {
        // Non-critical — never block launch on the login reward.
      }
    }

    try {
      // Supporter subscribers receive a recurring monthly amber stipend. Claim
      // is idempotent (once per local month) and gated on the entitlement, so
      // this is a silent no-op for everyone else. The amber surfaces on the next
      // stats refresh; no modal (the recurring stipend is quiet by design).
      const stipend = await claimSupporterStipendIfDue();
      if (stipend) {
        persistenceActions.refreshStats();
        logEvent({ type: 'supporter_stipend_granted', data: { amount: stipend.amount, month: stipend.month } });
      }
    } catch {
      // Non-critical — never block launch on the stipend.
    }

    if (isRollover) {
      // A new local day invalidates day-bucketed state computed at launch:
      // reschedule the notification ladder and refresh streak/stats display.
      scheduleAllNotifications(persistence.currentPhase).catch(() => {});
      persistenceActions.refreshStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.onboardingReady, onboardingFlow.isOnboarding, persistence.currentPhase]);

  useEffect(() => {
    runDailyLaunchTasks().catch(() => {});
  }, [runDailyLaunchTasks]);

  // Day rollover: re-run the daily tasks when the app comes back to the
  // foreground on a NEW local day. Same-day foregrounds are no-ops (the date
  // guard above), and a null date means the launch run hasn't happened yet.
  const runDailyLaunchTasksRef = useRef(runDailyLaunchTasks);
  runDailyLaunchTasksRef.current = runDailyLaunchTasks;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (dailyTasksDateRef.current === null) return;
      if (dailyTasksDateRef.current === getLocalDateString()) return;
      runDailyLaunchTasksRef.current(true).catch(() => {});
    });
    return () => subscription.remove();
  }, []);

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

  // Tutorial Fox bubble avoidance: the bubble must never cover the rows the
  // player is being asked to touch. While the guided move happens in the
  // LOWER half of the board (e.g. rows 3-4), the bubble flips to the top of
  // the screen (over the header — spent upper rows only); while acting on
  // the upper rows it sits at the bottom, above the UNDO/HINT controls.
  // The flip is an instant style swap — never an animated reposition — so
  // reducedMotion needs no special casing, and the row-index heuristic works
  // on any screen height (640dp included) because the involved rows are
  // always on the opposite half from the bubble.
  const tutorialFoxAnchor = useMemo(() => {
    const rowCount = puzzle.rows.length;
    // Source is activeRowIndex, target the row below (tutorial boards only
    // descend); the pair's lower row decides which half the action is in.
    const targetRowIndex = puzzle.activeRowIndex + 1;
    const actionInLowerHalf = rowCount > 0 && targetRowIndex * 2 >= rowCount;
    return actionInLowerHalf
      ? { top: screenInsets.top + 8, left: 8, right: 8 }
      : { bottom: Math.max(30, screenInsets.bottom) + 104, left: 8, right: 8 };
  }, [puzzle.rows.length, puzzle.activeRowIndex, screenInsets.top, screenInsets.bottom]);

  const maybeShowSetupSelectorIntro = useCallback(async () => {
    if (onboardingFlow.isOnboarding) return;
    const seen = await hasSeenSetupSelectorIntro();
    if (seen) return;
    // Defer the one-time selector reveal until the player has a few boards
    // behind them: firing on the very first free Play hijacked the "just let
    // me play" beat with a second tutorial, before changing difficulty was
    // ever relevant. The curated window (first 5 puzzles) ignores difficulty
    // anyway, so the taught choice was inert at that moment.
    const stats = await getCumulativeStats();
    if ((stats?.totalPuzzlesCompleted ?? 0) < SETUP_SELECTOR_INTRO_MIN_PUZZLES) return;

    // SEQUENCED, not stacked (Modal regression fix): the intro used to open
    // the setup menu TOGETHER with the Fox card, which worked when the menu
    // was an inline dropdown — but the menu is now a fullscreen native Modal,
    // which stacks above the entire app hierarchy: the Fox card rendered
    // half-hidden UNDER the menu panel and taps on it hit the Modal backdrop.
    // Now Fox speaks first (menu closed, chip highlighted); the menu opens
    // when the card's last line is acknowledged (see handleAdvance below).
    setSetupSelectorIntroIndex(0);
    setTimeout(() => {
      setShowSetupSelectorIntro(true);
    }, 250);
  }, [onboardingFlow.isOnboarding]);

  const dismissSetupSelectorIntro = useCallback(async () => {
    await markSetupSelectorIntroSeen();
    setShowSetupSelectorIntro(false);
    // Close the menu if the intro opened it. Leaving it floating after the
    // intro ended read as a stuck modal.
    puzzleActions.setShowDifficultyMenu(false);
  }, [puzzleActions]);

  const handleAdvanceSetupSelectorIntro = useCallback(async () => {
    const nextIndex = setupSelectorIntroIndex + 1;
    if (nextIndex < setupSelectorLines.length) {
      setSetupSelectorIntroIndex(nextIndex);
      return;
    }

    // Last line acknowledged: NOW open the menu (introMode: difficulty rows +
    // the hint line). The Fox card hides while the menu is up (render gate),
    // and the menu-close effect below completes the intro.
    puzzleActions.setShowDifficultyMenu(true);
  }, [setupSelectorIntroIndex, setupSelectorLines.length, puzzleActions]);

  // Complete the setup intro when its menu closes by ANY path: backdrop tap,
  // Android back, the chip toggle, or a difficulty pick (the hook closes the
  // menu inside startNewGame). Transition-edge detection (open -> closed) so
  // the card phase, where the menu was never open, can't complete it early.
  const introMenuWasOpenRef = useRef(false);
  useEffect(() => {
    if (!showSetupSelectorIntro) {
      introMenuWasOpenRef.current = false;
      return;
    }
    if (introMenuWasOpenRef.current && !puzzle.showDifficultyMenu) {
      dismissSetupSelectorIntro();
      return;
    }
    introMenuWasOpenRef.current = puzzle.showDifficultyMenu;
  }, [showSetupSelectorIntro, puzzle.showDifficultyMenu, dismissSetupSelectorIntro]);

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
    const dismissedKind = postVictoryIntro?.kind;
    if (dismissedKind === 'starter_pack') {
      await markStarterIntroSeen();
    }
    setPostVictoryIntro(null);
    await advanceQueuedPostVictoryIntro();
    // After the starter intro closes, open the Store so the "welcome" Fox
    // described is right there (the Keeper's Welcome hero card).
    if (dismissedKind === 'starter_pack') {
      setShowStoreModal(true);
    }
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

  // Queue an endgame cinematic on the usual 1.5s beat, but also record it so a
  // victory exit inside the window can rescue it (see pendingEndgameEventRef).
  const queueEndgameCinematic = useCallback((event: PhaseTransitionEvent) => {
    pendingEndgameEventRef.current = event;
    addVictoryTimeout(() => {
      pendingEndgameEventRef.current = null;
      setPhaseTransitionEvent(event);
    }, 1500);
  }, [addVictoryTimeout]);

  const startVictoryExitFlow = useCallback((action: () => void) => {
    // Rescue a queued endgame cinematic before clearVictoryTimeouts drops its
    // timer: play it now, over the navigation, instead of losing it forever.
    const pendingEndgame = pendingEndgameEventRef.current;
    if (pendingEndgame) {
      pendingEndgameEventRef.current = null;
      setPhaseTransitionEvent(pendingEndgame);
    }
    clearVictoryTimeouts();
    clearVictoryToastQueue();
    // The completed puzzle's autosave must never be resumable from Play
    clearPuzzleState().catch(() => {});
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();

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
  }, [clearVictoryTimeouts, clearVictoryToastQueue, puzzleActions, victoryActions, orchestrationActions, advanceQueuedPostVictoryIntro]);

  // ========================================================================
  // Navigation & puzzle lifecycle handlers
  // ========================================================================

  // Start puzzle when navigating to puzzle screen
  const handlePlayPuzzle = useCallback((difficulty?: Difficulty) => {
    hapticLight();
    soundUiTap();
    setIsPlayingDaily(false);
    resetSpeedRun();
    // A fresh board must not inherit the previous win's queued toasts.
    clearVictoryToastQueue();
    // Refresh persistence data (phase, stats) before starting puzzle
    persistenceActions.refreshStats();
    // A board must never start from an unset difficulty: normalize the request
    // so an out-of-union live value (e.g. state poisoned by a legacy restore)
    // can never reach startNewGame and serve a board whose shape matches no
    // selected difficulty.
    const diff = normalizeDifficulty(difficulty || puzzle.difficulty);
    orchestrationActions.setCompletionCoda(null);
    transitionTo('puzzle', async () => {
      // Check for saved in-progress puzzle. A save whose difficulty is not a
      // real Difficulty (older schema / corrupt row) is DISCARDED, not
      // restored: restorePuzzleState copies saved.difficulty into both the
      // live state and the retained preference, so restoring it would blank
      // the setup chip and seed every following board from an unset value.
      const saved = await loadPuzzleState();
      if (saved && saved.gameState === 'PLAYING' && !saved.isPlayingDaily && isValidDifficulty(saved.difficulty)) {
        // Restored boards never carry (or roll) a house ask — the ask does
        // not survive autosave (dropped silently; deliberate simplification).
        houseAskRestoreSuppressRef.current = true;
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
  }, [puzzle.difficulty, puzzleActions, transitionTo, persistenceActions, orchestrationActions, maybeShowSetupSelectorIntro, clearVictoryToastQueue]);

  // Return to home screen
  const handleGoHome = useCallback(() => {
    hapticLight();
    puzzlesSinceHomeVisit.current = 0;
    setIsPlayingDaily(false);
    resetSpeedRun();
    clearVictoryToastQueue();
    transitionTo('home', () => {
      if (puzzle.unbrokenWeaveMode) {
        clearPuzzleState().catch(() => {});
        puzzleActions.clearBoard();
      } else {
        puzzleActions.setGameState(GameState.IDLE);
      }
      puzzleActions.setShowConfetti(false);
    });
  }, [puzzleActions, puzzle.unbrokenWeaveMode, transitionTo, clearVictoryToastQueue]);

  // Reset All completed but an in-place reload wasn't available (Expo Go /
  // dev client — Updates.reloadAsync throws there). Storage and service
  // caches are already wiped by performFullReset; this rebuilds every piece
  // of App-level in-memory state from the cleared services so the live
  // session genuinely starts over: fresh persistence (amber 0 / phase 0 /
  // no stats), an empty board, no victory/ceremony remnants, and onboarding
  // restarted from the cold open instead of dumping the player back onto
  // a home screen still rendering their old save.
  const rebuildSessionFromStorage = useCallback((opts: { restartOnboarding: boolean }) => {
    clearVictoryTimeouts();
    clearVictoryToastQueue();
    puzzleActions.clearBoard();
    puzzleActions.setShowConfetti(false);
    puzzleActions.refreshHintBalance();
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();
    setIsPlayingDaily(false);
    resetSpeedRun();
    setVictoryDoubleClaimed(false);
    setVictoryDoubleOffer(false);
    setDailyRank(null);
    setDailyLadderLine(null);
    setDailyLadderTrend(null);
    setEventBonusLine(null);
    setSocialProofLine(null);
    setShareResultData(null);
    setShareChallengeText(null);
    setDailyLoginGrant(null);
    setPhaseTransitionEvent(null);
    setShowSetupSelectorIntro(false);
    setPostVictoryIntro(null);
    queuedPostVictoryIntrosRef.current = [];
    pendingPostVictoryActionRef.current = null;
    setHomePanY(null);
    puzzlesSinceHomeVisit.current = 0;
    // Re-read the rebuilt persistence (amber, phase, stats, pending transition).
    persistenceActions.refreshStats().catch(() => {});
    getUnbrokenWeaveMastery().then(setUnbrokenWeaveMastery).catch(() => {});
    // Reset All: onboarding storage is back to 'not_started'; mirror the
    // fresh-launch init so the intro replays this session. Creator snapshot:
    // storage says 'complete' and must stay complete.
    onboardingActions
      .advanceOnboarding(opts.restartOnboarding ? 'cold_open_puzzle' : 'complete')
      .then(() => {
        if (opts.restartOnboarding) {
          launchColdOpenPuzzle().catch(() => {});
        } else {
          transitionTo('home');
        }
      })
      .catch(() => {});
  }, [
    clearVictoryTimeouts,
    clearVictoryToastQueue,
    puzzleActions,
    victoryActions,
    orchestrationActions,
    persistenceActions,
    onboardingActions,
    launchColdOpenPuzzle,
    resetSpeedRun,
    transitionTo,
  ]);

  const handleResetComplete = useCallback(() => {
    rebuildSessionFromStorage({ restartOnboarding: true });
  }, [rebuildSessionFromStorage]);

  // Re-check today's daily leaderboard standing (tapping the completed daily
  // card). The standing used to be shown exactly once, on completion; this gives
  // it a re-check surface (assessment §7). Degrades gracefully when the backend
  // is off or standings haven't aggregated yet.
  const handleRecheckDailyStanding = useCallback(() => {
    hapticLight();
    (async () => {
      try {
        // The card's corner badge is the daily streak — name it here so the
        // number on the calendar icon always has an in-context explanation.
        const daily = await getDailyStatus();
        const streakLine = daily.streak > 1 ? `\nDaily streak: ${daily.streak} days.` : '';
        const rank = await getDailyRank(getLocalDateString());
        if (rank) {
          showGameAlert(
            'Today’s Standing',
            `${getBeatPercentText(rank.percentile, persistence.currentPhase)}\nRank ${rank.rank} of ${rank.total} today.${streakLine}`
          );
        } else {
          showGameAlert('Today’s Standing', `The standings are still gathering. Check back a little later.${streakLine}`);
        }
      } catch {
        // Non-critical — leaderboard is decorative.
      }
    })();
  }, [persistence.currentPhase]);

  // The daily board start proper — reached only through handleStartDaily's
  // replay guard below.
  const startDailyBoard = useCallback(() => {
    persistenceActions.refreshStats();
    orchestrationActions.setCompletionCoda(null);
    setIsPlayingDaily(true);
    resetSpeedRun();
    clearVictoryToastQueue();
    transitionTo('puzzle', async () => {
      puzzleActions.setGameState(GameState.LOADING);
      puzzleActions.setMessage(getLoadingMessage(persistence.currentPhase));
      try {
        const daily = await generateDailyPuzzle();
        puzzleActions.startDailyGame(daily.words, daily.hint, daily.wordLength, daily.solution);
        puzzleStartTimeRef.current = Date.now();
        // The first-ever daily gets an eased (MEDIUM) board so it isn't a
        // brutal first competitive impression; its board differs from the
        // shared one, so its result must NOT hit the leaderboard (still pays
        // full HARD reward + records to the local ladder).
        dailyEasedRef.current = daily.eased === true;
        logEvent({ type: 'puzzle_started', data: { difficulty: 'HARD', daily: true, eased: dailyEasedRef.current } });
        // First-daily mercy: a one-time hint cushion so the first HARD daily
        // (6-letter, 5-row) isn't a wall. Only fires after the board actually
        // started; null on every call after the one-time grant.
        try {
          const mercyHints = await grantFirstDailyMercy();
          if (mercyHints !== null) {
            puzzleActions.refreshHintBalance();
            puzzleActions.setMessage(getFirstDailyMercyMessage(persistence.currentPhase, mercyHints));
          } else {
            // Narrative host: name the animal who "prepared" today's offering —
            // only ever one the player has met (assessment §7). Skipped on the
            // first daily so the mercy message isn't clobbered.
            const prog = await getFullProgress();
            const hostName = getDailyHostName(prog?.unlockedAnimals ?? []);
            puzzleActions.setMessage(getDailyHostLine(hostName, persistence.currentPhase));
          }
        } catch {
          // Non-critical — the daily plays fine without the mercy grant.
        }
        maybeShowSetupSelectorIntro().catch(() => {});
      } catch {
        // Daily generation failed — fall back to a standard HARD puzzle so the
        // player is never stranded on a loading screen.
        setIsPlayingDaily(false);
        await puzzleActions.startNewGame('HARD', 'standard', 'standard', false, false);
      }
    });
  }, [puzzleActions, transitionTo, persistenceActions, orchestrationActions, persistence.currentPhase, maybeShowSetupSelectorIntro, clearVictoryToastQueue]);

  // Start the Daily Challenge (seeded; difficulty follows the week ramp).
  const handleStartDaily = useCallback((_difficulty: Difficulty) => {
    hapticLight();
    soundUiTap();
    (async () => {
      // Replay guard: the seeded daily board is identical all day and pays full
      // HARD-tier amber plus phase progress, so replays (deep link, notification
      // tap, any future surface) would be pure farming. A daily already
      // completed today re-checks the standing instead — the same surface as
      // tapping the completed card.
      try {
        const status = await getDailyStatus();
        if (status.isCompleted) {
          transitionTo('home');
          handleRecheckDailyStanding();
          return;
        }
      } catch {
        // Status read failed — fall through and let the daily start.
      }
      startDailyBoard();
    })();
  }, [transitionTo, handleRecheckDailyStanding, startDailyBoard]);

  // Start a puzzle from a friend-shared challenge link. The hook validates the
  // decoded words (dictionary membership, uniform length) and returns false
  // without touching the board on bad input — links are attacker-constructable,
  // so decode's shape check alone is never trusted.
  const handleStartSharedChallenge = useCallback((words: string[]) => {
    const ok = puzzleActions.startSharedChallengeGame(words);
    if (!ok) {
      showGameAlert('Challenge link', getUnplayableChallengeMessage(persistence.currentPhase));
      return;
    }
    hapticLight();
    soundTap();
    setIsPlayingDaily(false);
    resetSpeedRun();
    orchestrationActions.setCompletionCoda(null);
    persistenceActions.refreshStats();
    logEvent({ type: 'puzzle_started', data: { shared: true, words: words.length } });
    transitionTo('puzzle');
  }, [puzzleActions, transitionTo, persistenceActions, orchestrationActions, persistence.currentPhase]);

  const handleIncomingLink = useCallback((url: string) => {
    // Scheme/host matching is case-insensitive on Android intents, so compare
    // lowercased — a mixed-case link must neither bypass routing nor, worse,
    // bypass the creator-code telemetry redaction below.
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.startsWith('wordshift://')) return;
    // Never upload the creator code to telemetry.
    logEvent({
      type: 'deep_link_opened',
      data: { url: lowerUrl.startsWith('wordshift://creator') ? 'wordshift://creator?<redacted>' : url },
    });

    // Creator/press fast-forward: wordshift://creator?code=CODE&era=dusk|shadows|reveal|peace.
    // Deliberately BEFORE the onboarding guard (a reviewer on a fresh install is
    // mid-onboarding; the snapshot itself completes onboarding). Fully inert
    // unless a creatorCode is configured in app config extra.
    if (lowerUrl.startsWith('wordshift://creator')) {
      if (!isCreatorKitEnabled()) return;
      let code = '';
      let era = '';
      try {
        for (const pair of (url.split('?')[1] ?? '').split('&')) {
          const [k, v] = pair.split('=');
          // decodeURIComponent throws URIError on malformed escapes ("%E0%"),
          // and this runs before any validation — a bad link must be ignored,
          // never crash a press build.
          if (k?.toLowerCase() === 'code') code = decodeURIComponent(v ?? '');
          if (k?.toLowerCase() === 'era') era = decodeURIComponent(v ?? '').toLowerCase();
        }
      } catch {
        return;
      }
      if (!validateCreatorCode(code) || !isCreatorEra(era)) return;
      showGameAlert(
        'Creator fast-forward',
        `This replaces ALL progress on this device with a review save ("${era}"). This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Overwrite save',
            onPress: async () => {
              const ok = await applyCreatorSnapshot(era);
              if (!ok) {
                showGameAlert('Creator fast-forward', 'The snapshot could not be applied.');
                return;
              }
              try {
                await Updates.reloadAsync();
              } catch {
                // Expo Go / dev client: reload throws. The snapshot mutated
                // storage through the services, so rebuilding App-level state
                // (WITHOUT restarting onboarding) is sufficient.
                rebuildSessionFromStorage({ restartOnboarding: false });
              }
            },
          },
        ],
      );
      return;
    }

    if (onboardingFlow.onboardingStep && onboardingFlow.onboardingStep !== 'complete') {
      return;
    }
    // Never let a link navigate over the first-harvest gate — the forced pit
    // beat must complete first (the link is rare and re-tappable; the teaching
    // beat is one-time).
    if (puzzle.gameState === GameState.WON && victoryFlow.victoryData?.mandatoryHarvest) {
      return;
    }

    if (lowerUrl.startsWith('wordshift://challenge/daily')) {
      // The optional ?date= param is ignored — the daily is always today's.
      // Unlock inputs read FRESH from storage: a cold-start link routes ~1.2s
      // after launch, before React persistence state may have hydrated (a
      // stale zero showed unlocked players a false "still locked" alert).
      (async () => {
        try {
          const [stats, phaseNow] = await Promise.all([getCumulativeStats(), getCurrentPhase()]);
          if (isDailyChallengeUnlocked(stats.totalPuzzlesCompleted, phaseNow)) {
            handleStartDaily('HARD');
          } else {
            transitionTo('home');
            showGameAlert('Daily Challenge', getDailyLockedMessage(phaseNow));
          }
        } catch {
          handleStartDaily('HARD');
        }
      })();
      return;
    }

    if (lowerUrl.startsWith('wordshift://challenge/p')) {
      const words = decodeChallengeLink(url);
      if (words) {
        handleStartSharedChallenge(words);
      } else {
        showGameAlert('Challenge link', getBadChallengeLinkMessage(persistence.currentPhase));
      }
      return;
    }

    if (lowerUrl.includes('home')) {
      transitionTo('home');
    }
  }, [
    onboardingFlow.onboardingStep,
    transitionTo,
    puzzlesSolvedForVariantUnlocks,
    persistence.currentPhase,
    handleStartDaily,
    handleStartSharedChallenge,
    puzzle.gameState,
    victoryFlow.victoryData,
  ]);

  // The handler lives in a ref so the Linking subscription is created exactly
  // once and the launch URL is processed exactly once. With the callback in the
  // dep array the effect re-ran whenever its identity changed (every solve /
  // phase change), re-invoking getInitialURL() — which keeps returning the
  // app's original launch URL — and re-launching a shared-challenge link
  // mid-session. The launch URL is routed after a short delay so persistence
  // state has hydrated before any daily/challenge routing decision.
  const handleIncomingLinkRef = useRef(handleIncomingLink);
  handleIncomingLinkRef.current = handleIncomingLink;
  useEffect(() => {
    let launchTimer: ReturnType<typeof setTimeout> | null = null;
    Linking.getInitialURL().then(url => {
      // Module-scope guard: an appEpoch remount (late cloud restore) re-runs
      // this effect, and getInitialURL keeps returning the original launch URL
      // — without the guard the remount would re-route the player into the
      // launch link's board a second time.
      if (url && !launchUrlProcessed) {
        launchUrlProcessed = true;
        launchTimer = setTimeout(() => handleIncomingLinkRef.current(url), 1200);
      }
    }).catch(() => {});

    const subscription = Linking.addEventListener('url', event => {
      handleIncomingLinkRef.current(event.url);
    });

    return () => {
      if (launchTimer) clearTimeout(launchTimer);
      subscription.remove();
    };
  }, []);

  // Notification tap routing: scheduled notifications carry a data.target
  // payload ('daily' → the daily-challenge start path, 'home' → home screen).
  // The handler lives in a ref so the subscription is created exactly once;
  // expo-notifications is lazily required with the same guarded pattern as
  // services/notifications.ts (absent module → taps just open the app).
  const routeNotificationTargetRef = useRef<(target: unknown) => void>(() => {});
  routeNotificationTargetRef.current = (target: unknown) => {
    if (onboardingFlow.onboardingStep && onboardingFlow.onboardingStep !== 'complete') {
      return;
    }
    // Never route over the first-harvest gate (same rule as deep links).
    if (puzzle.gameState === GameState.WON && victoryFlow.victoryData?.mandatoryHarvest) {
      return;
    }
    if (target === 'daily') {
      // Read the unlock inputs FRESH from storage: a cold-start tap routes
      // ~1.2s after launch, and the React persistence state can still be
      // unhydrated then — a stale zero here showed fully-unlocked players a
      // false "still locked" alert.
      (async () => {
        try {
          const [stats, phaseNow] = await Promise.all([getCumulativeStats(), getCurrentPhase()]);
          if (isDailyChallengeUnlocked(stats.totalPuzzlesCompleted, phaseNow)) {
            handleStartDaily('HARD');
          } else {
            // Same courtesy the deep-link path gives: say why the tap landed
            // on home instead of silently swallowing it.
            transitionTo('home');
            showGameAlert('Daily Challenge', getDailyLockedMessage(phaseNow));
          }
        } catch {
          // Storage read failed — let handleStartDaily's own guards decide.
          handleStartDaily('HARD');
        }
      })();
    } else if (target === 'home') {
      transitionTo('home');
    }
  };
  useEffect(() => {
    let subscription: { remove?: () => void } | null = null;
    let coldStartTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const Notifications = require('expo-notifications');
      subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        routeNotificationTargetRef.current(
          response?.notification?.request?.content?.data?.target
        );
      });
      // Cold-start taps never reach the runtime listener — the notification
      // that LAUNCHED the app is only available via getLastNotificationResponseAsync.
      // Deferred briefly so persistence state hydrates before routing to the daily.
      // Module-scope guard: an appEpoch remount must not re-route the tap.
      Notifications.getLastNotificationResponseAsync?.()
        .then((response: any) => {
          const target = response?.notification?.request?.content?.data?.target;
          if (target != null && !coldStartNotificationProcessed) {
            coldStartNotificationProcessed = true;
            coldStartTimer = setTimeout(() => routeNotificationTargetRef.current(target), 1200);
          }
        })
        .catch(() => {});
    } catch {
      subscription = null;
    }
    return () => {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      subscription?.remove?.();
    };
  }, []);

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

    const result = await puzzleActions.handleSlotPress(
      targetIndex,
      isDragDropRef.current ? 'drag' : 'tap'
    );

    if (result?.completed) {
      isDragDropRef.current = false;
      // Stop the speed clock SYNCHRONOUSLY at the win so a buzzer-beater commit
      // can't let the countdown reach 0 and fire loss feedback before the
      // gameState render effect tears the timer down (onSpeedTimeUp also guards
      // on the victory lock, but stopping here closes the window entirely).
      if (hasVariantModifier(puzzle.currentVariant, 'speed')) {
        stopSpeedTimer();
      }
      // Blind Offering's end-of-board reveal (accepted): validity was hidden the
      // whole board, so the chain validating IS the payoff. Fire the green
      // accept-sweep + a rising chime + a success haptic, distinct from an
      // ordinary win, in the window before the victory modal covers the board
      // (the stars pop over the board first). The finale board keeps its silence.
      if (puzzle.blindMode && !puzzle.isFinalBoard) {
        fireBlindJudgment('accepted');
        soundValidMove(3);
        hapticSuccess();
      }
      // This win owns the review-destack flag from here on — a stale value
      // from an earlier win must not swallow this exit's nudges.
      reviewPromptFiredRef.current = false;
      // THE marked final board's win: the fanfare is suppressed (the quiet IS
      // the moment) and the finale cinematic fires from the endgame block below.
      const wasFinalBoard = result.isFinalBoard === true;
      // Speed streak: a completed speed puzzle ratchets up the next clock, and
      // the peak streak is remembered as a best-round record (the in-run counter
      // evaporates on every reset). Surface a new record as an in-world beat.
      if (hasVariantModifier(puzzle.currentVariant, 'speed')) {
        const newRound = speedRound + 1;
        setSpeedRound(newRound);
        recordSpeedRound(newRound).then(res => {
          if (res.isNewRecord && res.best >= 3) {
            enqueueVictoryToast(getSpeedRecordMessage(persistence.currentPhase, res.best));
          }
        }).catch(() => {});
      }
      // Private pace trend: record standard, non-daily solve durations and, at
      // most once per session, surface the "getting faster" beat when the recent
      // median is meaningfully quicker than before. Skipped for restored boards
      // (result.solveTimeMs is undefined) and timed/speed boards.
      if (
        result.solveTimeMs != null &&
        result.variant === 'standard' &&
        !isPlayingDaily
      ) {
        const solveDifficulty = puzzle.difficulty;
        recordSolveTime(solveDifficulty, result.solveTimeMs).then(async () => {
          if (fasterBeatShownRef.current) return;
          const trend = await getSolveTrend(solveDifficulty);
          if (trend?.improving) {
            fasterBeatShownRef.current = true;
            enqueueVictoryToast(getPaceTrendMessage(persistence.currentPhase));
          }
        }).catch(() => {});
      }
      // Variant-offer nudge: once per local day, after a STANDARD board, gently
      // suggest a variant the player has unlocked but never tried. Skipped
      // during onboarding. (This replaced the old never-called shouldOfferVariant
      // helper, since deleted from puzzleVariety.)
      if (
        (result.variant ?? 'standard') === 'standard' &&
        !isPlayingDaily &&
        (onboardingFlow.onboardingStep === undefined || onboardingFlow.onboardingStep === 'complete')
      ) {
        const unlockedVariants = getUnlockedVariants(puzzlesSolvedForVariantUnlocks, persistence.currentPhase);
        consumeVariantNudge(unlockedVariants, 'standard').then(nudgeVariant => {
          if (nudgeVariant) {
            const title = VARIANT_CONFIGS[nudgeVariant as PuzzleVariant]?.title || 'a new style';
            enqueueVictoryToast(getVariantNudgeMessage(persistence.currentPhase, title), 'nudge');
          }
        }).catch(() => {});
      }
      // Clear mid-puzzle save on completion
      clearPuzzleState().catch(() => {});

      // Lock interaction during async victory chain. Deliberately NO haptic
      // here: the victory's success haptic belongs to the modal becoming
      // visible (VictoryModal fires hapticSuccess on visible) — firing one at
      // processing start too made every win buzz twice ~300ms apart, blurring
      // the star rhythm (tap-tap-tap-THUD) that follows.
      victoryActions.setProcessingVictory(true);

      const victory = await persistenceActions.recordVictory(
        // Daily Challenge always rewards as HARD regardless of the player's
        // chosen difficulty preference (which is left untouched during a daily).
        // Shared-link boards price as EASY: the chain is attacker-craftable
        // (a trivial 3-word link must not pay the crafter's HARD base).
        isPlayingDaily ? 'HARD' : puzzle.isSharedChallenge ? 'EASY' : puzzle.difficulty,
        result.hintsUsed,
        result.invalidAttempts,
        result.gameMode,
        result.completedWords,
        result.variant || 'standard',
        isPlayingDaily,
        result.undosUsed ?? 0,
        result.blind ?? false,
        // Shared-link boards pay amber but never feed phase progress (the
        // chain is attacker-craftable, so it must not advance the story).
        puzzle.isSharedChallenge ?? false,
        // Resonant choices made on this board (amber-only bonus, capped in
        // the economy layer; never phase progress).
        result.resonantChoiceCount ?? 0
      );

      // Aggregate social proof: contribute this puzzle's words to the global
      // daily count (spoiler-safe, anonymous). No-op until the backend is on.
      // The bump RPC returns the post-increment total, so prefer it over a
      // separate read (which used to race the fire-and-forget bump and made
      // the line appear only "some of the time"). A same-local-day cached
      // count covers transient network failures so the line doesn't flicker
      // out between victories.
      setSocialProofLine(null);
      // Event bonus is a DAILY-victory line; clear it here so a full-moon
      // daily's +50% line can never linger onto later normal-board victories.
      setEventBonusLine(null);
      setVictoryDoubleClaimed(false);
      // Rewarded-double cadence gate: the 2x slot presents up to
      // REWARDED_DOUBLE_DAILY_CAP times per local day and never at phase 4+
      // (the dread arc is protected like interstitials) — on every win it made
      // the base reward read as the amount the player failed to claim. Decided
      // + recorded HERE, once per victory (processing time), so modal
      // re-renders can never double-count a presentation.
      //
      // Only spend a daily slot when the button can ACTUALLY present: ad-free
      // owners always can (the instant ✦), everyone else needs a ready ad
      // provider with rewarded budget left. Recording an offer for a button
      // that then self-hides (cold-start SDK not up yet, no provider, or the
      // rewarded daily cap reached) silently burned the day's slots on an
      // invisible affordance — the reason the 2x "never showed up." So the
      // slot now surfaces on the FIRST eligible win it can render on.
      setVictoryDoubleOffer(false);
      if (victory.puzzlesSolved > AUTO_COLLECT_PUZZLE_LIMIT) {
        (async () => {
          try {
            const canPresentDouble =
              isAdFreeSync() || (isAdsReady() && !(await isRewardedCapReached()));
            if (canPresentDouble && (await canOfferRewardedDouble(persistence.currentPhase))) {
              await recordRewardedDoubleOffered();
              setVictoryDoubleOffer(true);
            }
          } catch {
            // Non-critical — the victory flow never blocks on the 2x slot.
          }
        })();
      }
      (async () => {
        try {
          const today = getLocalDateString();
          let count = await recordPuzzleContribution(result.completedWords?.length ?? 0);
          if (count == null) {
            const proof = await getAggregateProof();
            count = proof?.wordsOfferedToday ?? null;
          }
          if (count == null && socialProofCacheRef.current?.date === today) {
            count = socialProofCacheRef.current.count;
          }
          if (count != null && count > 0) {
            socialProofCacheRef.current = { date: today, count };
            setSocialProofLine(getWordsOfferedText(count, persistence.currentPhase));
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
        setDailyLadderLine(null);
        setDailyLadderTrend(null);
        setEventBonusLine(null);
        (async () => {
          const date = getLocalDateString();
          const elapsedMs = puzzleStartTimeRef.current > 0
            ? Date.now() - puzzleStartTimeRef.current
            : 0;
          let rank: DailyRank | null = null;
          try {
            // Skip the shared leaderboard for an eased first-daily board — it
            // isn't the same board everyone else played, so its time/stars
            // aren't comparable. Full reward + local ladder still apply.
            if (!dailyEasedRef.current) {
              await submitDailyResult({
                date,
                timeMs: elapsedMs,
                stars: victory.earnedStars,
                hintsUsed: result.hintsUsed,
              });
              rank = await getDailyRank(date);
              if (rank) setDailyRank(rank);
            }
          } catch {
            // Leaderboard is non-critical — never block the victory flow.
          }
          // Persist the local ladder entry regardless of backend availability,
          // then surface the returning-player "best this week / your history"
          // line. This is the offline hook: rank/percentile are null offline and
          // the line falls back to participation copy from local history.
          try {
            await recordDailyLadderResult({
              date,
              rank: rank?.rank ?? null,
              percentile: rank?.percentile ?? null,
              timeMs: elapsedMs,
              stars: victory.earnedStars,
              // Record the ACTUAL board difficulty — an eased first daily is a
              // MEDIUM board, so labelling it HARD would skew the local
              // best-this-week / trend line with an easy fast time.
              difficulty: getDailyDifficulty(date, dailyEasedRef.current),
              // Spoiler-safe resonance tally (stored only when positive).
              resonantChoiceCount: result.resonantChoiceCount,
            });
            const summary = await getDailyLadderSummary();
            setDailyLadderLine(getDailyLadderLine(summary, persistence.currentPhase));
            // Only attach a placement trend beside a placement line (a week-scoped
            // rank/percentile), never beside the offline participation fallback.
            setDailyLadderTrend(shouldShowTrend(summary) ? summary.trend : null);
          } catch {
            // Ladder is decorative — never block the victory flow.
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
            // A daily-streak milestone is a distinct celebration, not a plain
            // receipt: fire the (previously-unwired) daily_ready chime + a
            // success haptic so it doesn't land silently like a trivial line.
            hapticSuccess();
            soundDailyReady();
            enqueueVictoryToast(`${milestone.message} (+${milestone.amber} amber)`, 'receipt');
          } else if (dailyProgress.streakSavedByFreeze) {
            // A banked freeze forgave a missed day — let the player know the
            // chain survived so the protection feels real, not silent. Phase-
            // aware copy (the house protects warmly at every register).
            enqueueVictoryToast(getStreakFreezeReliefMessage(persistence.currentPhase, true));
          } else if (dailyProgress.streakDecayedTo != null) {
            // Decay-to-milestone: the lapse cost the climb, not the streak —
            // name the checkpoint it held at (phase-aware copy).
            const heldAt = dailyProgress.streakDecayedTo;
            enqueueVictoryToast(getStreakHeldMessage(heldAt, persistence.currentPhase));
          }
          // Full-moon event: +50% bonus on the daily's amber, credited as
          // BONUS amber only. Never feeds phase progress (same rule as every
          // bonus/purchased amber source). Basis: the solve's earned parts
          // (base + stars + streak + challenge), NOT one-time milestone /
          // first-completion windfalls — those can be huge in the endgame tail
          // and aren't "today's daily". Surfaced inside the VictoryModal
          // (a toast would render underneath the modal overlay and never show).
          if (getActiveEvent()) {
            const b = victory.amberBreakdown;
            const bonusBasis = b
              ? b.base + b.starBonus + b.streakBonus + b.challengeBonus
              : victory.amberEarned;
            const eventBonus = getEventDailyBonusAmber(bonusBasis);
            if (eventBonus > 0) {
              const newBalance = await awardBonusAmber(eventBonus, 'event_daily_bonus');
              persistenceActions.setAmberBalance(newBalance);
              setEventBonusLine(getEventDailyBonusLine(persistence.currentPhase, eventBonus));
            }
          }
        } catch {
          // Daily recording is non-critical — never block the victory flow.
        }
      }

      let finalVictory = victory;
      if (puzzle.unbrokenWeaveMode) {
        const { mastery, rankedUp } = await recordUnbrokenWeaveVictory(puzzle.difficulty, victory.flawless === true);
        setUnbrokenWeaveMastery(mastery);
        finalVictory = {
          ...finalVictory,
          unbrokenWeaveRank: mastery.rank,
          unbrokenWeaveTitle: mastery.title,
          unbrokenWeaveNextObjective: mastery.nextObjective,
          unbrokenWeaveRankedUp: rankedUp,
        };
      }
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
          // Apply-then-ack: clear the pending-credit ledger entry only after
          // the amber landed (kill between the writes replays, never loses).
          if (autoCollected.creditId) {
            acknowledgeBatchCredit(autoCollected.creditId).catch(() => {});
          }
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
      // First harvest gate: fires when the auto-collect window has closed, a
      // real batch waits in the pit, and the player has not yet LEARNED manual
      // harvesting. The Victory modal forces the pit visit (teach the pit by
      // using it, with a lore beat). The learned flag is set ONLY when the
      // player completes a manual offer at the pit (OfferingPitScreen) — never
      // here — so the gate re-fires on every eligible victory (standard, daily,
      // variant) until a real harvest happens. No interruption (back press,
      // app kill, deep link, notification tap) can consume the beat unseen.
      // Skipped during onboarding and when a phase-transition ceremony already
      // claims the pit (that ceremony forces the same pit visit anyway).
      if (
        (onboardingFlow.onboardingStep === undefined || onboardingFlow.onboardingStep === 'complete') &&
        !finalVictory.phaseTransitionPending &&
        !finalVictory.autoCollected &&
        !!finalVictory.harvestBatchId &&
        completedTotal >= AUTO_COLLECT_PUZZLE_LIMIT + 1 &&
        !(await hasSeenMandatoryHarvest())
      ) {
        finalVictory = { ...finalVictory, mandatoryHarvest: true };
      }
      // Fox introduces the Keeper's Welcome starter pack once, past puzzle 20,
      // for players who don't already own it. Declutter rule: never stack it on
      // a victory that ALREADY has another intro or the mandatory-harvest gate
      // — the store pitch waits for a quiet win (it re-fires until seen, since
      // hasSeenStarterIntro is only set on dismissal), so a newcomer never gets
      // two new-thing beats on one victory.
      if (
        immediateIntros.length === 0 &&
        !finalVictory.mandatoryHarvest &&
        completedTotal >= STARTER_INTRO_MIN_PUZZLES &&
        !hasEntitlementSync(ENTITLEMENTS.STARTER_PACK) &&
        !(await hasSeenStarterIntro())
      ) {
        immediateIntros.push({
          kind: 'starter_pack',
          lines: getFoxStarterIntroLines(finalVictory.newPhase),
        });
      }
      // The final board's victory is a ceremony, never a compact strip — the
      // flag routes useVictoryFlow to the full (but hushed) treatment.
      if (wasFinalBoard) {
        finalVictory = { ...finalVictory, finalBoard: true };
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
          // Route through the in-modal victory toast queue (not the board Toast,
          // which renders UNDER the victory modal scrim and would bury it).
          enqueueVictoryToast(microEvent, 'info');
        }
      }

      // Post-victory receipts and beats all ride the sequential toast queue
      // (enqueueVictoryToast) — receipts first, informational lines after,
      // nudges last — so no message clobbers another on a stacked win.

      // Surface the "your streak was protected" moment when a freeze was
      // consumed — phase-aware copy (warm at every register, never scolds).
      if (victory.streakSaved) {
        enqueueVictoryToast(getStreakFreezeReliefMessage(persistence.currentPhase, false));
      }

      // Show streak milestone toast if threshold was just crossed. Scale the
      // celebration to the milestone's magnitude so a 30-day chain clearly
      // outweighs a 3-day one: EVERY milestone rings a felt success haptic and a
      // combo-ladder ping, and the ping's tier climbs with the reward (the 3/7
      // day tiers at tier 2, the 50/65 tiers at tier 3, the 100 crown at tier 4)
      // instead of the small milestones landing silent like a trivial receipt.
      if (victory.streakMilestoneMessage) {
        enqueueVictoryToast(`${victory.streakMilestoneMessage} (+${victory.streakMilestoneBonus} amber)`, 'receipt');
        const streakBonus = victory.streakMilestoneBonus ?? 0;
        hapticSuccess();
        soundValidMove(streakBonus >= 100 ? 4 : streakBonus >= 50 ? 3 : 2);
      }

      // Milestone hint trickle: a win that crossed a puzzle-count milestone
      // tops the hint stash up by one (soft-capped in hints.ts, so it never
      // stacks a stockpile) — the difficulty tail is where the lifetime free
      // hints run dry.
      if (victory.milestoneBonus > 0) {
        grantBonusHint('milestone').then(granted => {
          if (granted) {
            puzzleActions.refreshHintBalance();
            enqueueVictoryToast(getHintGrantMessage(persistence.currentPhase), 'receipt');
            // Acknowledge the raised count with a HINT-button pulse on the next
            // board (the button is occluded by the victory modal right now).
            hintPulsePendingRef.current = true;
          }
        }).catch(() => {});
      }

      // Show harvest overflow warning if pending batches hit the cap
      if (victory.harvestOverflow) {
        enqueueVictoryToast(getHarvestOverflowMessage(persistence.currentPhase));
      }

      puzzleActions.setEarnedStars(victory.earnedStars);
      victoryActions.setVictoryData(finalVictory);

      // Scripted anticlimax: on the one silent-victory board the fanfare simply
      // does not play (the micro-beat renders the stark line instead). The most
      // complicit moment in the descent is a quiet one. The FINAL board gets
      // the same silence — no chime, no confetti — before the arrival plays.
      if (!isSilentVictoryBeat(completedTotal) && !wasFinalBoard) {
        if (victory.earnedStars === 3) {
          soundPerfect();
        } else {
          soundVictory();
        }
      }

      puzzleActions.setGameState(GameState.WON);
      // Full sensory silence on BOTH quiet beats: the scripted silent victory
      // (148) and the final board. Confetti raining over "No music this time.
      // Only the quiet after." would undo the anticlimax the beat exists for.
      puzzleActions.setShowConfetti(
        !wasFinalBoard && !isSilentVictoryBeat(completedTotal)
      );
      victoryActions.setProcessingVictory(false);
      puzzlesSinceHomeVisit.current += 1;

      // Store-review prompt — ONLY on a Phase 0-1 delight peak (a perfect win),
      // HARD-suppressed from Phase 2 on so the reveal's betrayal can't harvest
      // one-star reviews (assessment §9). Policy-gated + once-ever; deferred so
      // it lands after the victory choreography settles.
      addVictoryTimeout(() => {
        maybePromptReview({
          phase: persistence.currentPhase,
          stars: victory.earnedStars,
          puzzlesSolved: completedTotal,
          isOnboarding: !(onboardingFlow.onboardingStep === undefined || onboardingFlow.onboardingStep === 'complete'),
          isDaily: isPlayingDaily,
        }).then(prompted => {
          // The OS review sheet fired mid-victory, outside the exit-nudge
          // chain — flag it so THIS win's exit runs no nudges on top
          // (runVictoryExitNudges checks + clears the flag, non-consuming
          // for the deferred nudges themselves).
          if (prompted) reviewPromptFiredRef.current = true;
        }).catch(() => {});
      }, 1800);

      // Play choreographed victory sequence (the modal gates tap-to-skip to
      // its own entrance window via onSkip). The ceremony ages with the phase
      // (heavier springs / stone-like haptics at the reveal), and BOTH quiet
      // beats (the final board and the scripted silent victory) are hushed so
      // the phone never celebrates while the screen performs silence.
      const victoryHushed = wasFinalBoard || isSilentVictoryBeat(completedTotal);
      victoryActions.playVictorySequence(victory.earnedStars, persistence.currentPhase, victoryHushed);

      // Phase transitions are now DEFERRED to the Offering Pit.
      // When phaseTransitionPending is true, the phase change will be confirmed
      // in the pit screen with a ward mark ceremony. Don't play the overlay here.

      // Check for endgame triggers (dwell voice → finale arming → the marked
      // final board's win → post-revelation).
      //
      // The finale is no longer declared retroactively on an ordinary win:
      // only a capped eight-win dwell AND completedTotal >=
      // FINALE_ARM_MIN_PUZZLES (160) arm finaleArmed. The NEXT standard board
      // start then serves the marked FINAL BOARD (usePuzzleGame.startNewGame).
      // Its victory — and only its victory — plays FINAL_PUZZLE_EVENT. The win
      // after that triggers POST_REVELATION_EVENT + markPostRevelation,
      // exactly as before.
      let dwellLineForWin: string | null = null;
      if (!victory.phaseChanged && persistence.currentPhase >= 4) {
        try {
          const houseComplete = await isHouseCompleted();
          if (houseComplete) {
            const finalDone = await isFinalPuzzleCompleted();
            if (!finalDone) {
              if (wasFinalBoard) {
                // The last arrangement is complete. markFinalPuzzleCompleted
                // also disarms the finale (single atomic write).
                await markFinalPuzzleCompleted();
                orchestrationActions.setCompletionCoda({
                  title: 'THE HOUSE STANDS COMPLETE',
                  text: persistence.currentPhase >= 3
                    ? 'You finished what was being built. There is no pretending now.'
                    : 'You completed the house and reached the final path.',
                });
                queueEndgameCinematic(FINAL_PUZZLE_EVENT);
              } else if (!(await isFinaleArmed())) {
                // Dwell gate: the finale used to fire on the FIRST Phase-4
                // victory, so the whole cult-reveal era flashed past in one
                // puzzle. Require FINALE_DWELL_PUZZLES Phase-4 puzzles first
                // so the robed sprites, sacrifice mechanic, and 300 Phase-4
                // dialogue lines are actually played. Even after all eight
                // dwell wins land early (completion/recruit ~136, dwell ~143),
                // hold the marked board until arming at 160. The final board
                // is ~161 and post-revelation ~162, giving the descent trio
                // time to speak. Never shown as a counter (narrative rule 7)
                // — the house "is not yet ready."
                const dwellBefore = await getPhase4DwellCount();
                const dwell = await recordPhase4Dwell();
                if (canArmFinale(dwell, completedTotal)) {
                  await armFinale();
                }
                // Dwell voice: the wait after "The arrangement is ready."
                // reads as held breath, not silence — one counter-free line
                // per dwell win, surfaced through the ambient overlay in the
                // victory cascade (skipped when a keyed micro-beat fires).
                dwellLineForWin = dwellBefore >= FINALE_DWELL_PUZZLES
                  ? getPostCapDwellLine(completedTotal, persistence.currentPhase)
                  : getDwellLine(Math.min(dwell, FINALE_DWELL_PUZZLES), persistence.currentPhase);
              }
              // Armed but not the final board (a daily / restored board):
              // hold still — the arrangement has already chosen its board.
            } else {
              const postRev = await isPostRevelation();
              if (!postRev) {
                await markPostRevelation();
                orchestrationActions.setCompletionCoda({
                  title: 'THE PATTERN REMEMBERS YOU',
                  text: 'You saw it through to the end. The arrangement is complete, and your words remain in every wall.',
                });
                queueEndgameCinematic(POST_REVELATION_EVENT);
              }
            }
          }
        } catch {
          // Endgame triggers are non-critical
        }
      }

      // Check achievements after brief delay to not block victory display
      addVictoryTimeout(() => achievementActions.checkForAchievements(finalVictory), 500);

      // The guaranteed, prominent opening-promise glitch fires on the player's
      // FIRST free-play win (one-time), not the guided tutorial.
      let firstFreeWin = false;
      if (!onboardingFlow.isOnboarding) {
        try {
          firstFreeWin = !(await hasSeenFirstWinGlitch());
          if (firstFreeWin) markFirstWinGlitchSeen().catch(() => {});
        } catch {
          firstFreeWin = false;
        }
      }

      // Post-victory orchestration: glitch, micro-beat, whisper, interjection
      orchestrationActions.processVictory({
        phase: persistence.currentPhase,
        totalPuzzlesCompleted: finalVictory.cumulativeStats?.totalPuzzlesCompleted ?? 1,
        completedWords: result.completedWords,
        isOnboarding: onboardingFlow.isOnboarding,
        puzzlesSinceHomeVisit: puzzlesSinceHomeVisit.current,
        firstFreeWin,
        dwellLine: dwellLineForWin,
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
    } else if (result.blindFailed) {
      // Blind Offering's end-of-board reveal (rejected): the final letter landed
      // but the chain contains a non-word. The move committed (the hook's
      // message tells the player to undo); feedback here is the full error
      // language, never the half-move click this result shape would otherwise
      // hit — plus the bespoke crimson reject-pulse so the apex mode's refusal
      // lands with weight instead of a bare shake.
      isDragDropRef.current = false;
      fireBlindJudgment('rejected');
      hapticError();
      soundInvalidMove();
      setInvalidDropSignal(prev => prev + 1);
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
      // Audio combo ladder: the chime climbs with the clean-move streak
      // (tier 0 base → 1/2/3; dark variants resolve inside audio.ts).
      soundValidMove(result.comboTier ?? 0);

      setStarBurst({
        active: true,
        x: feedbackOrigin?.x ?? SCREEN_WIDTH / 2,
        y: feedbackOrigin?.y ?? SCREEN_HEIGHT * 0.4,
        comboTier: result.comboTier ?? 0,
      });
      addVictoryTimeout(() => setStarBurst({ active: false, x: 0, y: 0, comboTier: 0 }), 600);

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

      // Reverse-shift midpoint: mark the descent->ascent turn as its own "second
      // act" — a distinct celebratory haptic, its OWN dedicated turn chime (a
      // rising marimba into a handbell, above the move ladder so it reads as a
      // chapter break, not another combo step; sinks at Phase 3+), AND a phase-
      // aware beat line (was a lone haptic with no sound or message).
      if (result.reverseMidpoint) {
        hapticSuccess();
        soundMidpointTurn();
        puzzleActions.setMessage(getReverseMidpointMessage(persistence.currentPhase));
        // The descent->ascent turn gets a distinct VISUAL second act: re-fire a
        // top-tier star burst (bigger/denser than a move's) at the board center
        // so the chapter break is seen as well as felt/heard.
        setStarBurst({
          active: true,
          x: SCREEN_WIDTH / 2,
          y: SCREEN_HEIGHT * 0.4,
          comboTier: 3,
        });
        addVictoryTimeout(() => setStarBurst({ active: false, x: 0, y: 0, comboTier: 0 }), 700);
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
    enqueueVictoryToast,
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

    // Locked tiles in the active source row are tappable for FEEDBACK only
    // (Row mounts a feedback touchable on them): full rejection language —
    // error haptic + rejection thud, then the hook's locked branch raises the
    // shake + locked-letter message. Never the select chime a real pick gets.
    // Gated on PLAYING so a stray tap during victory/processing stays silent
    // (matching the hook's own guard, which would swallow the press anyway).
    if (letter.isLocked) {
      if (puzzle.gameState === GameState.PLAYING) {
        hapticError();
        soundInvalidMove();
        puzzleActions.handleLetterPress(letter, rowIndex);
      }
      return;
    }

    hapticLight();
    soundLetterSelect();
    puzzleActions.handleLetterPress(letter, rowIndex);
  }, [puzzleActions, onboardingFlow.onboardingStep, puzzle.gameState, puzzle.selectedLetter, tutorialGuidance]);

  // Quiet acknowledgment for taps on tiles in completed/future rows (they
  // used to mount no touchable at all, so a confused poke got literally
  // nothing). A light selection haptic ONLY — no toast, no sound, no
  // game-state change; the tile plays its own subtle pulse. Stable identity
  // (empty deps) so the memoized Rows never re-render for this.
  const handleInactiveTilePress = useCallback(() => {
    hapticSelection();
  }, []);

  // Track the active row + move direction (read inside the deferred drop
  // handler and the per-move hover handler) and a registry of each row's
  // measurable node for Y-bounds checking on drop/hover.
  const activeRowIndexRef = useRef(puzzle.activeRowIndex);
  const moveDirectionRef = useRef(puzzle.moveDirection);
  const rowsRef = useRef(puzzle.rows);
  activeRowIndexRef.current = puzzle.activeRowIndex;
  moveDirectionRef.current = puzzle.moveDirection;
  rowsRef.current = puzzle.rows;

  // Board scale-to-fit (F139/F140). Reads the LIVE window width (F138 for the
  // board: reacts to split-screen / fold / resize) and the board's base word
  // length to pick a single uniform scale — < 1 to fit a narrow screen where
  // the fixed arc geometry would clip, up to a modest cap on a tablet. Captured
  // at board change so it never wobbles mid-move (a fresh board's rows are all
  // at base length). Ordinary phones resolve to exactly 1, so their rendering
  // and drag math are byte-identical. The ref mirror lets the drag callbacks
  // feed the same scale into estimateSlotIndex without rebuilding on resize.
  const { width: boardWindowWidth } = useWindowDimensions();
  const boardFirstRowId = puzzle.rows.length > 0 ? puzzle.rows[0].id : null;
  const boardBaseWordLen = useMemo(
    () => (puzzle.rows.length > 0 ? Math.max(...puzzle.rows.map((r) => r.words.length)) : 4),
    // Capture at board change only; rows are all at base length the instant a
    // new board mounts, so this is the stable base (never the mid-move max).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardFirstRowId],
  );
  const boardScale = useMemo(
    () => computeBoardScale(boardWindowWidth, boardBaseWordLen),
    [boardWindowWidth, boardBaseWordLen],
  );
  const boardScaleRef = useRef(1);
  boardScaleRef.current = boardScale;
  const rowNodeRefs = useRef(new Map<number, any>());
  const registerRowNode = useCallback((rowIndex: number, node: any) => {
    if (node) rowNodeRefs.current.set(rowIndex, node);
    else rowNodeRefs.current.delete(rowIndex);
  }, []);

  // Disable puzzle ScrollView during drag to prevent scroll-vs-drag conflict.
  // Toggled by DraggableTile via onDragActiveChange callback. Drag start also
  // measures the target row's window bounds ONCE (cheap, async) so the
  // per-move hover handler can Y-gate with a plain sync compare; drag end
  // clears both the cached bounds and any live hover highlight.
  const [puzzleScrollEnabled, setPuzzleScrollEnabled] = useState(true);
  // Live drag-hover highlight: the slot the finger is currently over. Purely
  // geometric (nearest slot by X, row-gated by Y) — NEVER validity-filtered,
  // so it can't become a second snapping tell in the hidden-validity modes.
  const [hoverSlot, setHoverSlot] = useState<{ rowIndex: number; slotIndex: number } | null>(null);
  const hoverSlotRef = useRef<{ rowIndex: number; slotIndex: number } | null>(null);
  const dragHoverBoundsRef = useRef<{ y: number; h: number } | null>(null);
  const clearHoverSlot = useCallback(() => {
    if (hoverSlotRef.current !== null) {
      hoverSlotRef.current = null;
      setHoverSlot(null);
    }
  }, []);
  const handleDragActiveChange = useCallback((active: boolean) => {
    setPuzzleScrollEnabled(!active);
    dragHoverBoundsRef.current = null;
    if (active) {
      const targetIdx =
        activeRowIndexRef.current + (moveDirectionRef.current === 'down' ? 1 : -1);
      const node = rowNodeRefs.current.get(targetIdx);
      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          dragHoverBoundsRef.current = { y, h: h || 64 };
        });
      }
    } else {
      clearHoverSlot();
    }
  }, [clearHoverSlot]);

  // Per-move hover update from DraggableTile. Runs inside the PanResponder
  // move path, so it must stay cheap: derive the slot, ref-compare against the
  // last one, and only setState when the hovered slot actually changes.
  const handleLetterDragMove = useCallback((position: { x: number; y: number }) => {
    const targetIdx =
      activeRowIndexRef.current + (moveDirectionRef.current === 'down' ? 1 : -1);
    const targetRow = rowsRef.current?.[targetIdx];
    let next: { rowIndex: number; slotIndex: number } | null = null;
    if (targetRow) {
      // Y-gate with the same generous tolerance the drop path uses (one
      // row-height of slack each side), so hover predicts the drop outcome.
      // Missing bounds (measure still in flight) fail open — hover shows.
      const bounds = dragHoverBoundsRef.current;
      const inBand =
        !bounds ||
        (position.y >= bounds.y - bounds.h && position.y <= bounds.y + bounds.h * 2);
      if (inBand) {
        const slotCount = targetRow.words.length + 1;
        const slotIndex = estimateSlotIndex(position.x, slotCount, targetRow.words.length, undefined, boardScaleRef.current);
        next = { rowIndex: targetIdx, slotIndex };
      }
    }
    const prev = hoverSlotRef.current;
    if (
      (prev === null && next === null) ||
      (prev !== null && next !== null && prev.rowIndex === next.rowIndex && prev.slotIndex === next.slotIndex)
    ) {
      return;
    }
    // Tick the hand on a genuine crossing INTO a slot (not when leaving to
    // empty space): the visual hover swell now has a matching haptic, so the
    // slot boundary is felt, not only seen. hapticSelection is settings-gated.
    if (next !== null) hapticSelection();
    hoverSlotRef.current = next;
    setHoverSlot(next);
  }, []);

  // Every fresh board must present from the FIRST word. All board-building
  // paths (Play, Next Level, RESTART, daily, shared challenge, variant /
  // difficulty switch — they all route through the hook's applyBoard, which
  // mints new row ids — plus autosave restore, which swaps in saved rows)
  // change the first row's identity, so one effect here covers every entry
  // point instead of sprinkling scroll calls across eight call sites.
  const puzzleScrollRef = useRef<ScrollView>(null);
  const boardIdentity = puzzle.rows.length > 0 ? puzzle.rows[0].id : null;
  useEffect(() => {
    if (boardIdentity !== null) {
      puzzleScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [boardIdentity]);

  // One-time preview-graduation beat: the FIRST fully-neutral board (after the
  // 12-solve full-grading window) explains, in-world, that the checks have
  // stepped back and the player judges words themselves now. This used to be a
  // fading Toast that raced the board-start line and was trivially missed; a
  // "the rules just changed" moment must be UNMISSABLE, so it now fires as a
  // BLOCKING cottage card (showGameAlert host) that covers the board until the
  // player acknowledges it — the player sees the change and the reason together,
  // then dismisses to the (now ungraded) board. Gated on the underlying mode
  // (not previewValidityVisible or the raw solve count) so a hidden-preview
  // rescue board can't consume it early. Blind Offering and onboarding excluded.
  // One time EVER via the device flag; the session ref keeps one storage read.
  const graduationCheckedRef = useRef(false);
  useEffect(() => {
    if (boardIdentity === null) return;
    if (puzzle.gameState !== GameState.PLAYING) return;
    if (puzzle.previewGradingMode !== 'neutral' || puzzle.blindMode) return;
    if (onboardingFlow.isOnboarding) return;
    if (graduationCheckedRef.current) return;
    graduationCheckedRef.current = true;
    (async () => {
      if (await hasSeenOneTimeFlag(PREVIEW_GRADUATION_SEEN_KEY)) return;
      const phase = persistence.currentPhase;
      // Seen = ACKNOWLEDGED (the mandatory-harvest contract): the flag commits
      // when the player dismisses the card, not when we decide to show it — a
      // kill between decision and render re-fires the beat on the next neutral
      // board instead of burning it invisibly (the old toast's failure mode).
      showGameAlert(
        getPreviewGraduationTitle(phase),
        getPreviewGraduationMessage(phase),
        [{
          text: getPreviewGraduationConfirm(phase),
          onPress: () => { markOneTimeFlagSeen(PREVIEW_GRADUATION_SEEN_KEY).catch(() => {}); },
        }],
        // "The rules just changed" — an authored narrative beat, not a mundane
        // utility confirm. The 'beat' tone deepens the scrim, pops from further
        // back, and wears a soft accent glow so this once-ever moment is felt.
        'beat',
      );
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires per fresh board; actions/phase read at fire time
  }, [boardIdentity, puzzle.gameState, puzzle.previewGradingMode, puzzle.blindMode, onboardingFlow.isOnboarding]);

  // First-stuck mercy — the ONLY consumer of puzzle.isStuck. Stuck detection
  // stays silent by product decision (discovering a dead end and choosing
  // undo/restart is part of the challenge), EXCEPT the very first dead end
  // ever, which gets one phase-aware pointer through the normal message slot:
  // without it, a player who doesn't recognize the dead end gets nothing but
  // error-shakes. The flag is committed before the message shows, so it fires
  // once ever; every later stuck is silent again. Device-local ON PURPOSE
  // (see FIRST_STUCK_SEEN_KEY).
  const firstStuckCheckedRef = useRef(false);
  useEffect(() => {
    if (!puzzle.isStuck) return;
    if (firstStuckCheckedRef.current) return;
    firstStuckCheckedRef.current = true;
    (async () => {
      if (await hasSeenOneTimeFlag(FIRST_STUCK_SEEN_KEY)) return;
      await markOneTimeFlagSeen(FIRST_STUCK_SEEN_KEY);
      puzzleActions.setMessage(getNoValidMovesMessage(persistence.currentPhase));
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot; actions/phase read at fire time
  }, [puzzle.isStuck]);

  // HOUSE ASKS roll — at most one ask per fresh STANDARD board, decided once
  // at board start. Keyed on board identity so one effect covers every
  // board-building path (Play, Next Level, RESTART, difficulty/variant
  // switches); every gate is read at fire time. Never on: the daily,
  // shared-challenge boards, the finale board, Unbroken Weave, Blind
  // Offering, non-standard variants (reverse/double/speed), during
  // onboarding, or below HOUSE_ASK_MIN_PUZZLES (which also covers the
  // curated early boards). A restored autosave board never rolls (suppress
  // ref + committed-move guard): the ask does not survive autosave restore —
  // dropped silently (deliberate simplification, no persistence).
  useEffect(() => {
    // A board-identity change always retires any live ask + queued ask line
    // first (an ask never outlives its board).
    clearHouseAsk();
    const wasRestore = houseAskRestoreSuppressRef.current;
    houseAskRestoreSuppressRef.current = false;
    if (boardIdentity === null || wasRestore) return;
    if (puzzle.gameState !== GameState.PLAYING) return;
    if (onboardingFlow.isOnboarding) return;
    if (isPlayingDaily || puzzle.isSharedChallenge || puzzle.isFinalBoard) return;
    if (puzzle.currentVariant !== 'standard') return;
    if (puzzle.blindMode || puzzle.unbrokenWeaveMode) return;
    if (puzzlesSolvedForVariantUnlocks < HOUSE_ASK_MIN_PUZZLES) return;
    if (puzzle.moveHistorySummary.length > 0) return; // mid-board state — never roll late
    if (Math.random() >= HOUSE_ASK_CHANCE) return;
    const startWords = puzzle.rows.map(r => r.words.map(l => l.char).join(''));
    const ask = pickHouseAsk(puzzle.solution, startWords);
    if (!ask) return;
    setHouseAsk(ask);
    const line = getHouseAskLine(persistence.currentPhase, ask.kind, ask.letter);
    if (puzzle.message) {
      // The board-start message owns the slot — let it breathe, then the ask
      // line takes over (queued briefly, never clobbering the greeting).
      houseAskLineTimerRef.current = setTimeout(() => {
        houseAskLineTimerRef.current = null;
        puzzleActions.setMessage(line);
      }, HOUSE_ASK_LINE_DELAY_MS);
    } else {
      puzzleActions.setMessage(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rolls once per fresh board; gates/actions read at fire time
  }, [boardIdentity]);

  // HOUSE ASKS evaluation — judged exactly once, at the WON commit (the
  // completing move is already in the committed summary there). Kept: bonus
  // amber ONLY via awardBonusAmber (never phase progress — hard design rule)
  // plus a receipt-priority toast. Unkept: cleared with NO message, ever
  // (soft-fail contract — the house never scolds).
  useEffect(() => {
    if (puzzle.gameState !== GameState.WON || houseAsk === null) return;
    const kept = evaluateHouseAsk(houseAsk, puzzle.moveHistorySummary);
    clearHouseAsk();
    if (!kept) return;
    (async () => {
      try {
        const newBalance = await awardBonusAmber(HOUSE_ASK_REWARD_AMBER, 'house_ask');
        persistenceActions.setAmberBalance(newBalance);
        enqueueVictoryToast(getHouseAskFulfilledMessage(persistence.currentPhase), 'receipt');
      } catch {
        // Non-critical — the victory flow never blocks on the ask receipt.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per won board; history/phase read at fire time
  }, [puzzle.gameState, houseAsk]);

  // Leaving the puzzle screen retires the ask (home button, hardware back,
  // victory exits, pit routes — every exit path lands off-screen). Returning
  // to the same in-memory board resumes it WITHOUT an ask, matching the
  // autosave contract: an interrupted board simply has no ask.
  useEffect(() => {
    if (currentScreen !== 'puzzle') clearHouseAsk();
  }, [currentScreen, clearHouseAsk]);

  // Drag-and-drop: when a letter is dragged onto the target row area, find the
  // closest valid slot and press it. The letter was already selected via onDragStart.
  // Uses refs + setTimeout to ensure React has processed the letter selection state
  // update from onDragStart before we read the computed slot previews.
  const slotPreviewsRef = useRef(puzzle.slotPreviews);
  const handleSlotPressRef = useRef(handleSlotPress);
  slotPreviewsRef.current = puzzle.slotPreviews;
  handleSlotPressRef.current = handleSlotPress;
  // The verb-depth gate, mirrored for the deferred drop handler: near-miss
  // snapping keys off preview VALIDITY, so it may only run while the ✓/✗
  // grading is actually shown — otherwise the snap itself leaks validity on
  // boards where the player is meant to judge the word.
  const previewValidityVisibleRef = useRef(puzzle.previewValidityVisible);
  previewValidityVisibleRef.current = puzzle.previewValidityVisible;

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
      // Previews are SUPPRESSED in blind and challenge modes, but a drag still
      // needs slot geometry to resolve a drop — otherwise every drag in those
      // modes dies as a "miss" and only taps work. Compute the slot count from
      // the live board; only the near-miss snapping (which keys off preview
      // validity) genuinely requires previews.
      let slotCount = previews?.length ?? 0;
      if (slotCount === 0) {
        const targetRowIdx =
          activeRowIndexRef.current + (moveDirectionRef.current === 'down' ? 1 : -1);
        const targetRow = rowsRef.current?.[targetRowIdx];
        if (targetRow) slotCount = targetRow.words.length + 1;
      }
      if (slotCount === 0) {
        // Board state wasn't ready when the drop resolved (rare: a slow frame
        // between onDragStart's selection commit and this deferred read). Don't
        // swallow the drop silently — that reads as "the game ate my letter."
        // The picked-up letter is still selected, so give the same gentle
        // feedback as an off-row miss and let the player retry.
        hapticSelection();
        setMessageRef.current(getDragMissMessage(currentPhaseRef.current));
        return;
      }

      // Estimate which slot the user dropped over based on X position.
      const targetWordLength = slotCount - 1;
      const estimateOut: { droppedRightOfCenter?: boolean } = {};
      const estimated = estimateSlotIndex(
        position.x,
        slotCount,
        targetWordLength,
        estimateOut,
        boardScaleRef.current,
      );

      // Near-miss forgiveness: arc slots are only ~28px wide on a finger-driven
      // layout, so a drop that lands one slot shy of its intended (valid) target
      // reads as "the game dropped my letter for nothing." If the estimated slot
      // is invalid but an *immediately adjacent* slot is valid, snap to it.
      // Bounded to ±1 slot so we still never teleport a letter across the row to
      // a distant valid slot — an invalid drop that isn't a clear near-miss
      // still falls through to handleSlotPress's invalid feedback.
      let targetSlot = estimated;
      // Near-miss snapping ONLY while the ✓/✗ validity grading is shown
      // (previewValidityVisible: EASY / double-shift): the snap keys off
      // validity, so on hidden-validity boards (MEDIUM+ standard/reverse/
      // speed, daily, shared links) and in blind mode it would leak the very
      // information the player is meant to judge. Everywhere else the drop
      // commits to the nearest slot geometrically and handleSlotPress gives
      // real validation feedback.
      if (previews && previewValidityVisibleRef.current && !previews[estimated]?.isValid) {
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
  // Convenience, never progress — Challenge stays hint-free by design. Blind
  // Offering is excluded: its undos are always free and unlimited, so a refill
  // would charge amber for nothing (the chip is hidden in blind too — this
  // guard is defense in depth).
  const handleBuyUndo = useCallback(async () => {
    if (puzzle.gameMode !== 'challenge' || puzzle.blindMode) return;
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
  }, [puzzle.gameMode, puzzle.blindMode, persistence.amberBalance, puzzleActions, persistenceActions]);

  const handleHintPress = useCallback(() => {
    hapticSelection();
    soundHint();
    puzzleActions.handleHint();
  }, [puzzleActions]);

  // Out-of-hints recovery: a completed `hint_recovery` clip grants one hint.
  // Declining/closing the clip (or an ad failure) is a quiet toast, never a
  // forced Store — the explicit store path stays available via the
  // out-of-hints alert's own "Get hints" button (handleOutOfHints).
  const handleClaimRewardedHint = useCallback(async () => {
    try {
      const res = await showRewarded('hint_recovery');
      if (res.completed) {
        await addHints(REWARDED_HINT_GRANT, 'rewarded_hint');
        puzzleActions.refreshHintBalance();
        hapticSuccess();
        puzzleActions.setMessage(`+${REWARDED_HINT_GRANT} hint`);
      } else if (res.reason === 'daily_cap') {
        puzzleActions.setMessage('Daily clip limit reached. Try the store.');
      } else {
        puzzleActions.setMessage('No hint this time. Hint packs live in the store.');
      }
    } catch {
      puzzleActions.setMessage('No hint this time. Hint packs live in the store.');
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
    showGameAlert(
      'Out of hints',
      'Watch a short clip for a free hint, or grab a hint pack in the store.',
      buttons,
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
  // Returns whether the prompt was actually presented so the victory-exit
  // nudge chain can honor its one-nudge-per-exit contract.
  const notificationPromptInFlightRef = useRef(false);
  const maybePromptForNotifications = useCallback(async (): Promise<boolean> => {
    if (notificationPromptInFlightRef.current) return false;
    notificationPromptInFlightRef.current = true;
    try {
      if (onboardingFlow.isOnboarding) return false;
      if ((persistence.cumulativeStats?.totalPuzzlesCompleted ?? 0) < 3) return false;
      // Declutter: never stack the permission prompt on a victory that already
      // has a Fox intro playing/queued. Return WITHOUT marking prompted so it
      // simply waits for a quiet victory exit.
      if (postVictoryIntro || queuedPostVictoryIntrosRef.current.length > 0) return false;
      if (await hasPromptedForNotifications()) return false;
      if ((await getNotificationPermissionStatus()) === 'granted') return false;
      await markPromptedForNotifications();

      const { title, body, accept, decline } = getNotificationPromptText(persistence.currentPhase);
      // Present the styled in-game modal instead of a bare OS Alert. The
      // accept/decline handlers (below) own the permission request + telemetry.
      setNotificationPrompt({ title, body, accept, decline });
      return true;
    } finally {
      notificationPromptInFlightRef.current = false;
    }
  }, [onboardingFlow.isOnboarding, persistence.cumulativeStats, persistence.currentPhase]);

  const handleNotificationPromptDecline = useCallback(() => {
    setNotificationPrompt(null);
    logEvent({
      type: 'notification_permission_result',
      data: { granted: false, prompted: true },
    });
  }, []);

  const handleNotificationPromptAccept = useCallback(async () => {
    setNotificationPrompt(null);
    const granted = await requestNotificationPermission();
    logEvent({
      type: 'notification_permission_result',
      data: { granted },
    });
    if (granted) {
      scheduleAllNotifications(persistence.currentPhase).catch(() => {});
    }
  }, [persistence.currentPhase]);

  // Fire an interstitial on a normal puzzle→next/home exit. All narrative-beat
  // exemptions live here so ads never interrupt a ceremony, the daily, the pit
  // ignition, onboarding, or the serene post-revelation tone. Must run BEFORE
  // startVictoryExitFlow (which resets victoryData). Patron suppression + cadence
  // are handled inside ads.ts. Fire-and-forget: the ad overlays the transition.
  const maybeShowVictoryInterstitial = useCallback((): Promise<boolean> => {
    const vd = victoryFlow.victoryData;
    if (!vd) return Promise.resolve(false);
    const step = onboardingFlow.onboardingStep;
    const inOnboarding = step !== undefined && step !== 'complete';
    const exempt =
      inOnboarding ||
      // The daily is exempt only from Phase 3 on (protecting the dread arc);
      // at the bright phases its reliably habitual session carries the normal
      // interstitial cadence (policy in ads.isDailyInterstitialAllowed).
      (isPlayingDaily && !isDailyInterstitialAllowed(vd.newPhase as number)) ||
      vd.mandatoryHarvest ||                           // first-harvest teaching beat: never interrupt with an ad
      vd.phaseTransitionPending ||                     // pit ignition ceremony incoming
      persistence.pendingPhaseTransition != null ||    // ward ceremony waiting in the pit
      phaseTransitionEvent != null ||                  // final / post-revelation cinematic queued
      (vd.newPhase as number) >= 5 ||                  // post-revelation: never break the serene tone
      // Protect the early "pure delight" window — no ads in the first
      // session, and no first ad inside the early new-things cluster
      // (daily unlock 8, first-harvest gate 9, reverse 10, graduation 13,
      // challenge intro 15 — the first ad waits for the exit of win 17).
      vd.puzzlesSolved <= INTERSTITIAL_MIN_PUZZLES;
    return maybeShowInterstitial({
      puzzlesSolved: vd.puzzlesSolved,
      phase: vd.newPhase,
      exempt,
    }).then(async (shown) => {
      if (!shown) return false;
      // After the player has actually seen a few interstitials, ARM the
      // contextual one-time Remove-Ads upsell ("tired of these?") — it is
      // presented on the NEXT qualifying exit (maybeShowRemoveAdsOffer in the
      // nudge chain), never stacked on the interstitial that just played.
      await recordInterstitialSeen();
      await armRemoveAdsNudgeIfEligible();
      return true;
    }).catch(() => false);
  }, [victoryFlow.victoryData, onboardingFlow.onboardingStep, isPlayingDaily, phaseTransitionEvent, persistence.pendingPhaseTransition]);

  // Deferred one-time Remove-Ads offer: armed by maybeShowVictoryInterstitial
  // right after an interstitial actually played, presented here on the next
  // ad-free victory exit so the upsell never doubles the most annoying moment.
  const maybeShowRemoveAdsOffer = useCallback(async (): Promise<boolean> => {
    if (onboardingFlow.isOnboarding) return false;
    // Same anti-stacking guard as the share/notification prompts: never layer
    // on a Fox intro. Return WITHOUT consuming — the armed offer just waits
    // for a quieter exit.
    if (postVictoryIntro || queuedPostVictoryIntrosRef.current.length > 0) return false;
    if (!(await consumePendingRemoveAdsNudge())) return false;
    showGameAlert(
      'Tired of ads?',
      'You can remove interstitials for good, or become a Patron for a quieter table and a little amber every puzzle.',
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'See options', onPress: () => setShowPatronModal(true) },
      ],
    );
    return true;
  }, [onboardingFlow.isOnboarding, postVictoryIntro]);

  // One-time, low-pressure Patron nudge once the player has settled in. Suppressed
  // for Patrons and during onboarding (gating lives in monetizationPrompts.ts).
  const patronNudgeInFlightRef = useRef(false);
  const maybeShowPatronNudge = useCallback(async (): Promise<boolean> => {
    if (patronNudgeInFlightRef.current) return false;
    patronNudgeInFlightRef.current = true;
    try {
      if (onboardingFlow.isOnboarding) return false;
      const solved =
        victoryFlow.victoryData?.puzzlesSolved ??
        persistence.cumulativeStats?.totalPuzzlesCompleted ??
        0;
      if (await consumePatronNudge(solved)) {
        setShowPatronModal(true);
        return true;
      }
      return false;
    } finally {
      patronNudgeInFlightRef.current = false;
    }
  }, [onboardingFlow.isOnboarding, victoryFlow.victoryData, persistence.cumulativeStats]);

  // One-time proactive SHARE invite at a genuine peak (the first flawless win).
  // The game already nudges players to buy but never to share — this is the
  // growth counterpart, frequency-capped exactly like the monetization nudges.
  // (Phase transitions were considered as a second trigger but are deferred to
  // the pit ceremony, which never routes through this exit — flawless-only is
  // the reachable peak, and it lands early for nearly every player.) Returns
  // whether it fired so the exit flow can keep to one nudge per victory. Never
  // on a mandatory-harvest / ceremony exit, and never stacked on a queued Fox
  // intro or an interstitial that just showed.
  const maybeShowSharePrompt = useCallback(async (): Promise<boolean> => {
    const vd = victoryFlow.victoryData;
    if (!vd) return false;
    if (onboardingFlow.isOnboarding) return false;
    if (vd.mandatoryHarvest || vd.phaseTransitionPending || persistence.pendingPhaseTransition != null) return false;
    // Same anti-stacking guard the notification prompt uses: never layer on a
    // Fox intro. Return WITHOUT consuming so it waits for a quiet exit.
    if (postVictoryIntro || queuedPostVictoryIntrosRef.current.length > 0) return false;
    // Snapshot taken at exit time (before teardown nulled victoryData); if it's
    // missing, don't consume the one-time prompt on a broken exit.
    const snapshot = pendingShareSnapshotRef.current;
    if (!snapshot) return false;
    const fired = await consumeSharePrompt({
      isFlawlessWin: vd.flawless === true,
      isPhaseTransition: false,
      isOnboarding: false,
    });
    if (fired) {
      showGameAlert(
        '',
        getSharePromptInvite(persistence.currentPhase),
        [
          { text: 'Not now', style: 'cancel' },
          // Open the modal from the pre-teardown snapshot — victoryData/board
          // state is already reset by the time this fires.
          { text: 'Share', onPress: () => { hapticLight(); openShareModalRef.current(snapshot); } },
        ],
      );
    }
    return fired;
  }, [victoryFlow.victoryData, onboardingFlow.isOnboarding, persistence.pendingPhaseTransition, persistence.currentPhase, postVictoryIntro]);

  // At most ONE of the victory-exit nudges (share / notification permission /
  // deferred remove-ads / patron) fires per exit — the share peak takes
  // precedence when eligible, and every step short-circuits the rest.
  // Skipped entirely when an interstitial just showed this exit, so a nudge
  // never piles on top of an ad.
  const runVictoryExitNudges = useCallback(async (
    interstitialShown: boolean,
    introWillPresent: boolean = false
  ) => {
    // A queued Fox intro presents the moment the exit flow runs — it would
    // stack under any nudge AND burn the nudge's one-time flag on a cluttered
    // exit. The queue is shift()ed synchronously inside startVictoryExitFlow,
    // so callers capture this BEFORE the exit flow and pass it in (checking
    // the ref here would always see an empty queue).
    if (interstitialShown || introWillPresent) return;
    // The store-review sheet fired on this win (mid-victory, outside this
    // chain): its exit runs NO nudges. Non-consuming — the deferred nudges
    // keep their one-time flags and simply wait for a quieter exit.
    if (reviewPromptFiredRef.current) {
      reviewPromptFiredRef.current = false;
      return;
    }
    const solved =
      victoryFlow.victoryData?.puzzlesSolved ??
      persistence.cumulativeStats?.totalPuzzlesCompleted ??
      0;
    if (!(await canShowExitNudge(solved))) return;
    if (await maybeShowSharePrompt()) {
      await recordExitNudgeShown(solved);
      return;
    }
    if (await maybePromptForNotifications()) {
      await recordExitNudgeShown(solved);
      return;
    }
    if (await maybeShowRemoveAdsOffer()) {
      await recordExitNudgeShown(solved);
      return;
    }
    if (await maybeShowPatronNudge()) {
      await recordExitNudgeShown(solved);
    }
  }, [
    victoryFlow.victoryData,
    persistence.cumulativeStats,
    maybeShowSharePrompt,
    maybePromptForNotifications,
    maybeShowRemoveAdsOffer,
    maybeShowPatronNudge,
  ]);

  // One-time Swift Victories pointer: after the FIRST routine win past
  // SWIFT_HINT_MIN_PUZZLES, a quiet toast points at the Settings toggle that
  // keeps celebrations short. Routine wins only (isRoutineVictory — never the
  // daily, milestones, quest turn-ins, or ceremonies), only while the setting
  // is off, never during onboarding. Fired from the Next Level exit
  // specifically — the toast surfaces on the puzzle screen, so it must land
  // where the player is about to be. The delay lets the next board's start
  // message settle first; the flag is consumed only when the toast will show.
  const maybeShowSwiftVictoryHint = useCallback(() => {
    const vd = victoryFlow.victoryData;
    if (!vd) return;
    if (onboardingFlow.isOnboarding) return;
    if (getSettingsSync().swiftVictories === true) return;
    if (!isRoutineVictory(vd)) return;
    if ((vd.puzzlesSolved ?? 0) <= SWIFT_HINT_MIN_PUZZLES) return;
    const phase = persistence.currentPhase;
    (async () => {
      if (await hasSeenOneTimeFlag(SWIFT_HINT_SEEN_KEY)) return;
      // TRACKED timer (cleared on unmount) — and the seen-flag is set only when
      // the hint actually shows, so an interrupted exit can't burn the one-time
      // beat unseen (the same class of bug the preview-graduation card had).
      if (swiftHintTimerRef.current) clearTimeout(swiftHintTimerRef.current);
      swiftHintTimerRef.current = setTimeout(() => {
        swiftHintTimerRef.current = null;
        puzzleActions.setMessage(getSwiftVictoryHintMessage(phase));
        markOneTimeFlagSeen(SWIFT_HINT_SEEN_KEY).catch(() => {});
      }, SWIFT_HINT_TOAST_DELAY_MS);
    })().catch(() => {});
  }, [victoryFlow.victoryData, onboardingFlow.isOnboarding, persistence.currentPhase, puzzleActions]);

  const handleNextLevel = useCallback(() => {
    hapticLight();
    setIsPlayingDaily(false);
    setSpeedRescueUsed(false);
    // Reads victoryData — must run before the exit flow resets it.
    maybeShowSwiftVictoryHint();
    // Snapshot the share payload BEFORE the exit flow resets victoryData.
    pendingShareSnapshotRef.current = buildShareDataRef.current();
    const adShown = maybeShowVictoryInterstitial();
    // Capture BEFORE startVictoryExitFlow shift()s the intro queue.
    const introWillPresent =
      queuedPostVictoryIntrosRef.current.length > 0 || postVictoryIntro !== null;
    startVictoryExitFlow(() => {
      clearPuzzleState().catch(() => {});
      puzzleActions.handleNextLevel();
    });
    Promise.resolve(adShown)
      .then((shown) => runVictoryExitNudges(shown === true, introWillPresent))
      .catch(() => {});
  }, [puzzleActions, startVictoryExitFlow, runVictoryExitNudges, maybeShowVictoryInterstitial, maybeShowSwiftVictoryHint, postVictoryIntro]);

  // The cold-open Continue reveals the empty home and Fox invitation. Legacy
  // guided-puzzle resumes keep their old puzzle-screen completion beat.
  const handleOnboardingVictoryContinue = useCallback(async () => {
    hapticLight();
    clearVictoryTimeouts();
    clearVictoryToastQueue();
    puzzleActions.setShowConfetti(false);
    victoryActions.resetVictory();
    orchestrationActions.resetOrchestration();
    if (onboardingFlow.onboardingStep === 'cold_open_puzzle') {
      await onboardingActions.advanceOnboarding('home_empty');
      transitionTo('home', () => {
        puzzleActions.clearBoard();
      });
      return;
    }
    await onboardingActions.advanceOnboarding('puzzle_complete');
  }, [
    onboardingFlow.onboardingStep,
    onboardingActions,
    puzzleActions,
    victoryActions,
    orchestrationActions,
    clearVictoryTimeouts,
    clearVictoryToastQueue,
    transitionTo,
  ]);

  const handleReturnHome = useCallback(() => {
    hapticLight();
    setIsPlayingDaily(false);
    // Snapshot the share payload BEFORE the exit flow resets victoryData.
    pendingShareSnapshotRef.current = buildShareDataRef.current();
    const adShown = maybeShowVictoryInterstitial();
    // Capture BEFORE startVictoryExitFlow shift()s the intro queue.
    const introWillPresent =
      queuedPostVictoryIntrosRef.current.length > 0 || postVictoryIntro !== null;
    startVictoryExitFlow(() => {
      puzzlesSinceHomeVisit.current = 0;
      puzzleActions.clearBoard();
      transitionTo('home');
    });
    Promise.resolve(adShown)
      .then((shown) => runVictoryExitNudges(shown === true, introWillPresent))
      .catch(() => {});
  }, [puzzleActions, transitionTo, startVictoryExitFlow, runVictoryExitNudges, maybeShowVictoryInterstitial, postVictoryIntro]);

  // The pit route (Collect Now) is deliberately EXEMPT from interstitials:
  // the player is on their way to collect amber they already earned, and an
  // ad tax on your own earnings poisons the harvest loop. The next-level and
  // home exits keep the normal cadence, so ad inventory shifts rather than
  // disappears.
  const handleGoToPit = useCallback(() => {
    hapticLight();
    startVictoryExitFlow(() => {
      puzzlesSinceHomeVisit.current = 0;
      puzzleActions.clearBoard();
      transitionTo('pit');
    });
  }, [puzzleActions, transitionTo, startVictoryExitFlow]);

  // Android hardware back button: sub-screens navigate home; home exits the app.
  // Swallowed during onboarding so back can't break the guided flow.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onboardingFlow.isOnboarding) {
        // On the very first interactive screen (the cold-open opener, nothing
        // committed yet), back should EXIT the app like any first screen — a
        // dead back button reads as broken. State is persisted; relaunch
        // resumes the opener via resolveColdOpenLaunchRoute. Every LATER guided
        // step still swallows back so a stray press can't abort the tutorial.
        if (onboardingFlow.onboardingStep === 'cold_open_puzzle' && puzzle.history.length === 0) {
          return false;
        }
        return true;
      }
      // A pit-mandatory victory (first-harvest gate or pending ward ceremony)
      // must not be escapable via hardware back — back does what the only
      // visible CTA does and routes to the pit instead of stranding the beat.
      if (
        currentScreen === 'puzzle' &&
        puzzle.gameState === GameState.WON &&
        (victoryFlow.victoryData?.mandatoryHarvest || persistence.pendingPhaseTransition != null)
      ) {
        handleGoToPit();
        return true;
      }
      // A plain victory back must run the SAME exit as the modal's Home button
      // (handleReturnHome) so it inherits the full teardown — clear victory
      // timeouts, reset victory + orchestration, clear the board, and honor the
      // interstitial exemptions — instead of a bare transitionTo that left the
      // victory flow half-torn-down.
      if (currentScreen === 'puzzle' && puzzle.gameState === GameState.WON) {
        handleReturnHome();
        return true;
      }
      if (currentScreen !== 'home') {
        // Mirror the in-UI home button: reset transient puzzle UI state
        // (mid-puzzle progress itself is preserved by autosave).
        transitionTo('home', () => {
          if (currentScreen === 'puzzle') {
            if (puzzle.unbrokenWeaveMode) {
              clearPuzzleState().catch(() => {});
              puzzleActions.clearBoard();
            } else {
              puzzleActions.setGameState(GameState.IDLE);
            }
            puzzleActions.setShowConfetti(false);
          }
        });
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [currentScreen, transitionTo, onboardingFlow.isOnboarding, onboardingFlow.onboardingStep, puzzleActions, puzzle.gameState, puzzle.history.length, puzzle.unbrokenWeaveMode, victoryFlow.victoryData, persistence.pendingPhaseTransition, handleGoToPit, handleReturnHome]);

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

  // Speed rescue: a completed rewarded view revives a timed-out speed run with
  // extra seconds. The hook flips GAME_OVER → PLAYING; the speed-timer effect
  // then restarts the clock from restoredSpeedTimeRef. speedRound is
  // deliberately NOT reset — the run (and its escalation ladder) continues.
  const handleSpeedRescue = useCallback(() => {
    restoredSpeedTimeRef.current = SPEED_RESCUE_EXTRA_SEC;
    const ok = puzzleActions.resumeSpeedAfterRescue(SPEED_RESCUE_EXTRA_SEC);
    if (ok) {
      setSpeedRescueUsed(true);
      hapticSuccess();
    } else {
      restoredSpeedTimeRef.current = null;
    }
  }, [puzzleActions]);

  // Share opens a preview of the result card (which shares an image when the
  // native capturer is present, else falls back to the emoji-grid text share).
  // It overlays the victory screen rather than exiting it, so sharing never
  // costs the player their victory moment.
  // Build the share payload from CURRENT victory + board state. Returns null
  // when there's no active victory. Kept separate so callers that fire around
  // the victory-exit teardown (the proactive share prompt) can snapshot the
  // payload while state is still valid, rather than reading it back after
  // resetVictory() has nulled victoryData.
  const buildShareData = useCallback((): { result: ShareableResult; challengeText: string | null } | null => {
    if (!victoryFlow.victoryData) return null;
    const moveCount = puzzle.rows.length - 1;
    const result: ShareableResult = {
      stars: victoryFlow.victoryData.earnedStars,
      difficulty: isPlayingDaily ? 'HARD' : puzzle.difficulty,
      hintsUsed: puzzle.hintsUsed,
      invalidAttempts: puzzle.invalidAttempts,
      // Honest per-move grid; empty after an autosave restore, in which case
      // shareResults falls back to the legacy distribution grid.
      moveOutcomes: puzzle.moveOutcomes.length > 0 ? puzzle.moveOutcomes : undefined,
      isDaily: isPlayingDaily,
      dailyDate: isPlayingDaily ? getLocalDateString() : undefined,
      moveCount,
      wordChain: puzzle.lastCompletedWords.length > 0 ? puzzle.lastCompletedWords : undefined,
      animalWhisper: orchestration.whisper?.text,
      phase: persistence.currentPhase,
      incantationName: puzzle.lastIncantationName || undefined,
    };
    // Friend challenge: only a standard, non-daily board encodes into a link
    // the recipient can actually play (the deep link starts a standard board).
    let challengeText: string | null = null;
    if (!isPlayingDaily && puzzle.currentVariant === 'standard') {
      try {
        // Thread the sender's phase so the taunt tone decays with the descent
        // (spoiler-safe: never names the entity, only tints the lure).
        challengeText = buildChallengeShareText(
          puzzle.rows.map(r => r.originalWord),
          undefined,
          persistence.currentPhase,
        );
      } catch {
        challengeText = null;
      }
    }
    return { result, challengeText };
  }, [victoryFlow.victoryData, puzzle, orchestration.whisper, persistence.currentPhase, isPlayingDaily]);

  const openShareModal = useCallback((data: { result: ShareableResult; challengeText: string | null }) => {
    setShareResultData(data.result);
    setShareChallengeText(data.challengeText);
  }, []);
  openShareModalRef.current = openShareModal;

  const handleShare = useCallback(() => {
    const data = buildShareData();
    if (!data) return;
    hapticLight();
    openShareModal(data);
  }, [buildShareData, openShareModal]);
  handleShareRef.current = handleShare;
  buildShareDataRef.current = buildShareData;

  const handleVictoryTapAccelerate = useCallback(() => {
    if (!victoryFlow.victoryData) return;
    // Skipping a hushed beat keeps its soft settle instead of the celebration
    // THUD (the finale board OR the scripted silent victory).
    const hushed =
      victoryFlow.victoryData.finalBoard === true ||
      isSilentVictoryBeat(victoryFlow.victoryData.puzzlesSolved ?? 0);
    victoryActions.skipToEnd(victoryFlow.victoryData.earnedStars, hushed);
  }, [victoryFlow.victoryData, victoryActions]);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    hapticLight();
    soundSelection();
    orchestrationActions.setCompletionCoda(null);
    resetSpeedRun();
    puzzleActions.startNewGame(d, puzzle.gameMode, puzzle.selectedVariant);
  }, [puzzleActions, puzzle.gameMode, puzzle.selectedVariant, orchestrationActions]);

  const handleSelectVariant = useCallback((variant: PuzzleVariant) => {
    if (!isVariantUnlocked(variant, puzzlesSolvedForVariantUnlocks, persistence.currentPhase)) {
      return;
    }
    hapticSelection();
    soundSelection();
    orchestrationActions.setCompletionCoda(null);
    resetSpeedRun();
    puzzleActions.setSelectedVariant(variant);
    puzzleActions.startNewGame(
      puzzle.difficulty,
      puzzle.gameMode,
      variant,
      undefined,
      false,
    );
  }, [
    puzzleActions,
    puzzle.difficulty,
    puzzle.gameMode,
    puzzlesSolvedForVariantUnlocks,
    persistence.currentPhase,
    orchestrationActions,
  ]);

  // Trial ladder: Challenge and Blind Offering are mutually exclusive rungs.
  // Challenge = no hints + limited undos, previews ON. Blind Offering = the
  // apex rung: no hints (it runs under gameMode 'challenge') PLUS previews
  // hidden and free moves judged once at the end of the chain — but undos
  // stay free and unlimited in blind (the challenge undo budget never applies).
  const handleToggleChallengeMode = useCallback(() => {
    hapticMedium();
    soundSelection();
    orchestrationActions.setCompletionCoda(null);
    resetSpeedRun();
    const isChallengeOnly = puzzle.gameMode === 'challenge' && !puzzle.blindMode;
    const newMode = isChallengeOnly ? 'standard' : 'challenge';
    puzzleActions.startNewGame(
      puzzle.difficulty,
      newMode,
      puzzle.selectedVariant,
      false,
      false,
    );
  }, [puzzleActions, puzzle.gameMode, puzzle.difficulty, puzzle.selectedVariant, puzzle.blindMode, orchestrationActions]);

  // Blind Offering: chosen before the board (a fresh board applies it so the
  // player can't toggle previews back on mid-solve to peek). Sticky across Next
  // Level; selecting it engages the challenge rung (no hints — undos stay free
  // in blind), deselecting returns to standard. Composes with any
  // variant/difficulty.
  const handleToggleBlindMode = useCallback(() => {
    // Gate: Blind Offering is the apex rung and unlocks late. Turning it OFF
    // is always allowed (a restored legacy board may carry it in while locked).
    if (!puzzle.blindMode && puzzlesSolvedForVariantUnlocks < BLIND_TOGGLE_UNLOCK_PUZZLES) {
      return;
    }
    hapticMedium();
    soundSelection();
    orchestrationActions.setCompletionCoda(null);
    resetSpeedRun();
    if (puzzle.blindMode) {
      puzzleActions.startNewGame(
        puzzle.difficulty,
        'standard',
        puzzle.selectedVariant,
        false,
        false,
      );
    } else {
      puzzleActions.startNewGame(
        puzzle.difficulty,
        'challenge',
        puzzle.selectedVariant,
        true,
        false,
      );
    }
  }, [puzzleActions, puzzle.difficulty, puzzle.selectedVariant, puzzle.blindMode, puzzlesSolvedForVariantUnlocks, orchestrationActions, resetSpeedRun]);

  const handleToggleUnbrokenWeave = useCallback(() => {
    if (persistence.currentPhase !== 5) return;
    hapticMedium();
    soundSelection();
    orchestrationActions.setCompletionCoda(null);
    resetSpeedRun();
    puzzleActions.startNewGame(
      puzzle.difficulty,
      'standard',
      'standard',
      false,
      !puzzle.unbrokenWeaveMode,
    );
  }, [
    persistence.currentPhase,
    puzzleActions,
    puzzle.difficulty,
    puzzle.unbrokenWeaveMode,
    orchestrationActions,
    resetSpeedRun,
  ]);

  // Combination styles: one tap arms a variant plus its trial rung atomically
  // on a fresh board (never two sequential startNewGame calls, which would
  // race the toggle logic against stale mode state).
  // Present the daily-login grant only on a quiet home screen — never over the
  // puzzle, the victory flow, a post-victory intro, or a queued ceremony. The
  // grant itself was already credited; this gates presentation only, so a claim
  // made elsewhere is simply held until the player next lands home.
  const dailyLoginGrantVisible =
    dailyLoginGrant !== null &&
    currentScreen === 'home' &&
    !onboardingFlow.isOnboarding &&
    !victoryFlow.isProcessingVictory &&
    victoryFlow.victoryData === null &&
    postVictoryIntro === null &&
    phaseTransitionEvent === null;

  // ========================================================================
  // Render
  // ========================================================================

  // Show loading while onboarding state is being determined AND while the
  // launch route is still resolving (bootRouting). Extending the hold across
  // the resume decision means a cold launch that resolves into the board or pit
  // never paints 'home' for a frame first (the F141 home flash) — the same
  // branded card simply stays up one beat longer, then the real destination
  // appears directly.
  if (!onboardingFlow.onboardingReady || bootRouting) {
    // The SAME window-relative branded hold as the bootstrap gate, so the
    // native-splash -> bootstrap-gate -> MainApp-hydration holds read as ONE
    // continuous branded moment instead of blinking through the old near-black
    // (#1A1A2E, a Phase-4 color) card — or a differently-sized icon — on launch.
    return <BootHold />;
  }

  // Helper: render the active screen content
  const renderScreen = () => {
    if (currentScreen === 'settings') {
      return (
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <SettingsScreen
            phase={persistence.currentPhase}
            onClose={() => transitionTo('home')}
            onReset={handleResetComplete}
            onCloudRestored={() => rebuildSessionFromStorage({ restartOnboarding: false })}
          />
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
            onOpenStore={() => setShowStoreModal(true)}
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
            onOpenStore={() => setShowStoreModal(true)}
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
            completedPuzzles={persistence.cumulativeStats?.totalPuzzlesCompleted ?? 0}
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
              // Compact + top-anchored so Ember never covers the pit or the
              // floating words the player must tap during the offering step
              // (the pit + float zone live in the lower two-thirds of the screen).
              variant="compact"
              text={onboardingActions.getOnboardingFoxText()}
              buttonText={onboardingActions.getOnboardingButtonText()}
              onContinue={
                // Before offering, pit_offering has NO continue button: the
                // player must tap the words themselves. Once pitOfferDone, the
                // completion beat shows its continue button and waits for the
                // player to tap "Let's go home!" (getOnboardingButtonText's
                // pit_offering label) — no auto-return. pit_intro keeps its
                // Continue to advance into the offering step.
                onboardingFlow.onboardingStep === 'pit_offering' && !onboardingFlow.pitOfferDone
                  ? undefined
                  : onboardingActions.handleOnboardingContinue
              }
              showSkip={true}
              onSkip={onboardingActions.handleSkipOnboarding}
              position="top"
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
              onRecheckDailyStanding={handleRecheckDailyStanding}
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
              onHouseCompleted={() => setPhaseTransitionEvent(HOUSE_COMPLETION_EVENT)}
              refreshSignal={homeRefreshSignal}
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
    // Setup-chip guard: the pill must always show the LIVE difficulty. If the
    // hook state ever slips outside the union (legacy/corrupt restore), the
    // raw value rendered an EMPTY pill — the colored dot matched no case and
    // Text renders nothing for undefined — so both the dot and the label go
    // through the normalizer (MEDIUM fallback, the hook's own default).
    const chipDifficulty = normalizeDifficulty(puzzle.difficulty);
    // Phase-aware surface for the pause-state cards (board-gen / victory-record
    // spinner + the speed Time's-Up overlay) so they track the descent instead
    // of flashing Phase-0 white candy whenever the game pauses.
    const pauseSurface = getSurfaceTheme(persistence.currentPhase);
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
        <StarBurst active={starBurst.active} x={starBurst.x} y={starBurst.y} phase={persistence.currentPhase} comboTier={starBurst.comboTier} />

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

        {/* Header — safe-area top inset applied inline (StyleSheet is static) */}
        <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
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
            /* The home route is deliberately withheld during onboarding, but
               the stand-in must be INVISIBLE: reusing the button style drew an
               empty lighter circle (its translucent background with no icon).
               This spacer keeps the exact footprint so the wordmark stays
               centered, with no chrome, no touches, and no a11y focus. */
            <View
              style={styles.headerHomeSpacer}
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            />
          )}

          <View style={styles.headerTitleArea}>
            <AnimatedLogo phase={persistence.currentPhase} />
            {/* Phase indicator badge */}
            {persistence.currentPhase > 0 && (
              <View style={[
                styles.phaseBadge,
                persistence.currentPhase === 2 && styles.phaseBadgeDusk,
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
            {/* Challenge Mode Badge — hidden in Blind Offering. Blind runs
                under gameMode 'challenge' internally, but its undos are always
                free, so the undo-budget chrome (count + amber refill chip) is
                meaningless there and the double chip read as a bug. The Blind
                badge below is the mode's one standing indicator. */}
            {puzzle.gameMode === 'challenge' && !puzzle.blindMode && (
              <BadgeAppear style={[
                styles.challengeBadge,
                persistence.currentPhase === 2 && styles.challengeBadgeDusk,
                persistence.currentPhase >= 3 && styles.challengeBadgeDark,
                persistence.currentPhase >= 4 && styles.challengeBadgeVoid,
              ]}>
                <Text style={styles.challengeBadgeText}>CHALLENGE</Text>
                {puzzle.undosRemaining < Infinity && (
                  <Text style={styles.challengeUndoText}>
                    {puzzle.undosRemaining} undo{puzzle.undosRemaining !== 1 ? 's' : ''}
                  </Text>
                )}
                {puzzle.undosRemaining === 0 && puzzle.gameState === GameState.PLAYING && (
                  // The refill chip mounts mid-board the instant undos hit 0, so
                  // it gets its own BadgeAppear entrance rather than hard-cutting
                  // into the already-mounted challenge badge.
                  <BadgeAppear>
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
                      <Text style={styles.buyUndoText}>
                        {'\u21a9'} +1 {'\u00b7'} {AMBER_UNDO_REFILL_COST} <AmberInline size={11} />
                      </Text>
                    </TouchableOpacity>
                  </BadgeAppear>
                )}
              </BadgeAppear>
            )}
            {puzzle.currentVariant !== 'standard' && (
              <BadgeAppear style={[
                styles.variantBadge,
                persistence.currentPhase === 2 && styles.variantBadgeDusk,
                persistence.currentPhase >= 3 && styles.variantBadgeDark,
              ]}>
                {getModeIconSprite(VARIANT_CONFIGS[puzzle.currentVariant]?.icon || '') ? (
                  <Image
                    source={getModeIconSprite(VARIANT_CONFIGS[puzzle.currentVariant]?.icon || '')!}
                    style={styles.variantBadgeIconImage}
                  />
                ) : (
                  <Text style={styles.variantBadgeIcon}>
                    {VARIANT_CONFIGS[puzzle.currentVariant]?.icon || '✨'}
                  </Text>
                )}
                <Text style={[
                  styles.variantBadgeText,
                  persistence.currentPhase === 2 && styles.variantBadgeTextDusk,
                  persistence.currentPhase >= 3 && styles.variantBadgeTextDark,
                ]}>
                  {VARIANT_CONFIGS[puzzle.currentVariant]?.title || 'Variant'}
                </Text>
              </BadgeAppear>
            )}
            {/* Blind Offering badge — the previews are hidden, so without a
                standing indicator the player has no way to tell blind is on
                (or remember to turn it off). Same chrome as the variant badge. */}
            {puzzle.blindMode && (
              <BadgeAppear
                style={[
                  styles.variantBadge,
                  persistence.currentPhase === 2 && styles.variantBadgeDusk,
                  persistence.currentPhase >= 3 && styles.variantBadgeDark,
                ]}
                accessible
                accessibilityLabel="Blind Offering is on: word previews hidden"
              >
                <Image source={getModeIconSprite('🌑')!} style={styles.variantBadgeIconImage} />
                <Text style={[
                  styles.variantBadgeText,
                  persistence.currentPhase === 2 && styles.variantBadgeTextDusk,
                  persistence.currentPhase >= 3 && styles.variantBadgeTextDark,
                ]}>
                  {persistence.currentPhase >= 2 ? 'Blind Offering' : 'Blind'}
                </Text>
              </BadgeAppear>
            )}
            {puzzle.unbrokenWeaveMode && (
              <BadgeAppear
                style={[
                  styles.variantBadge,
                  styles.variantBadgeDark,
                ]}
                accessible
                accessibilityLabel={`Unbroken Weave is on, ${puzzle.spentLetters.length} letters spent`}
              >
                <Image source={getModeIconSprite('🧵')!} style={styles.variantBadgeIconImage} />
                <Text style={[
                  styles.variantBadgeText,
                  styles.variantBadgeTextDark,
                ]}>
                  {puzzle.spentLetters.length}
                </Text>
              </BadgeAppear>
            )}
            {/* House Ask badge — the small standing reminder while an ask is
                live on this board (soft-fail: it simply disappears unkept,
                never scolds). Same chrome AND sprite treatment as the variant
                badges (home.png), so no raw emoji sits beside candy sprites;
                the full phase-aware ask line rides the accessibility label. */}
            {houseAsk !== null && (
              <BadgeAppear
                style={[
                  styles.variantBadge,
                  persistence.currentPhase === 2 && styles.variantBadgeDusk,
                  persistence.currentPhase >= 3 && styles.variantBadgeDark,
                ]}
                accessible
                accessibilityLabel={getHouseAskLine(persistence.currentPhase, houseAsk.kind, houseAsk.letter)}
              >
                {getModeIconSprite('house') ? (
                  <Image source={getModeIconSprite('house')!} style={styles.variantBadgeIconImage} />
                ) : (
                  <Text style={styles.variantBadgeIcon}>🏠</Text>
                )}
                <Text style={[
                  styles.variantBadgeText,
                  persistence.currentPhase === 2 && styles.variantBadgeTextDusk,
                  persistence.currentPhase >= 3 && styles.variantBadgeTextDark,
                ]}>
                  {houseAsk.letter.toUpperCase()}
                </Text>
              </BadgeAppear>
            )}
          </View>

          <TouchableOpacity
            ref={difficultyChipRef}
            style={[
              styles.difficultyButton,
              persistence.currentPhase === 2 && styles.difficultyButtonDusk,
              persistence.currentPhase >= 3 && styles.difficultyButtonDark,
              persistence.currentPhase >= 4 && styles.difficultyButtonVoid,
              showSetupSelectorIntro && styles.difficultyButtonHighlighted,
            ]}
            onPress={() => {
              const opening = !puzzle.showDifficultyMenu;
              if (opening) measureDifficultyChip();
              puzzleActions.setShowDifficultyMenu(opening);
            }}
            accessibilityLabel={`Difficulty ${chipDifficulty}, style ${VARIANT_CONFIGS[puzzle.selectedVariant]?.title || 'Standard'}. Tap to change puzzle setup`}
            accessibilityRole="button"
          >
            {persistence.currentPhase < 3 && <View style={styles.difficultyButtonShine} />}
            <View style={[
              styles.difficultyDot,
              chipDifficulty === 'EASY' && styles.difficultyDotEasy,
              chipDifficulty === 'MEDIUM' && styles.difficultyDotMedium,
              chipDifficulty === 'MEDIUM_PLUS' && styles.difficultyDotMediumPlus,
              chipDifficulty === 'HARD' && styles.difficultyDotHard,
            ]} />
            <Text style={styles.difficultyText}>{getDifficultyChipLabel(puzzle.difficulty)}</Text>
            <Text style={styles.difficultyArrow}>{'\u25BC'}</Text>
          </TouchableOpacity>

          <DifficultyMenu
            visible={puzzle.showDifficultyMenu}
            onClose={() => puzzleActions.setShowDifficultyMenu(false)}
            anchorTop={difficultyMenuAnchorTop}
            currentDifficulty={puzzle.difficulty}
            gameMode={puzzle.gameMode}
            phase={persistence.currentPhase}
            currentVariant={puzzle.selectedVariant}
            activeVariant={puzzle.currentVariant}
            variantOptions={variantSelectorOptions}
            onSelectDifficulty={handleSelectDifficulty}
            onToggleChallengeMode={handleToggleChallengeMode}
            onSelectVariant={handleSelectVariant}
            showChallengeToggle={puzzlesSolvedForVariantUnlocks >= CHALLENGE_TOGGLE_UNLOCK_PUZZLES}
            blindActive={puzzle.blindMode}
            onToggleBlindMode={handleToggleBlindMode}
            // The blind row appears with the trial-ladder section (challenge
            // gate) but stays a teased locked row until its own late gate.
            showBlindToggle={puzzlesSolvedForVariantUnlocks >= CHALLENGE_TOGGLE_UNLOCK_PUZZLES}
            blindLocked={puzzlesSolvedForVariantUnlocks < BLIND_TOGGLE_UNLOCK_PUZZLES}
            blindUnlockHint={getBlindUnlockHint(puzzlesSolvedForVariantUnlocks, persistence.currentPhase)}
            expertLocked={puzzlesSolvedForVariantUnlocks < EXPERT_DIFFICULTY_UNLOCK_PUZZLES}
            expertUnlockHint={`6-letter apex. Opens at ${EXPERT_DIFFICULTY_UNLOCK_PUZZLES} (you're at ${puzzlesSolvedForVariantUnlocks})`}
            showUnbrokenWeave={persistence.currentPhase === 5}
            unbrokenWeaveActive={puzzle.unbrokenWeaveMode}
            onToggleUnbrokenWeave={handleToggleUnbrokenWeave}
            unbrokenWeaveMastery={unbrokenWeaveMastery}
            introMode={showSetupSelectorIntro}
            introHintText={showSetupSelectorIntro ? setupSelectorLines[1] : undefined}
          />
        </View>
        )}

        {/* Toast Message — the cold-open's guiding lines wear a warm "voice"
            skin (cottage italic on parchment) instead of the system chrome. */}
        <View style={styles.toastContainer}>
          <Toast
            message={puzzle.error || puzzle.message}
            isError={!!puzzle.error}
            phase={persistence.currentPhase}
            isVoice={
              !puzzle.error &&
              (puzzle.message === COLD_OPEN_INSTRUCTION ||
                puzzle.message === COLD_OPEN_FIRST_MOVE ||
                puzzle.message === COLD_OPEN_PREVIEW_TEACH)
            }
          />
        </View>

        {/* Speed Timer — prominent display */}
        {speedTimer.speedTimeRemaining !== null && (
          <View style={[
            styles.speedTimerContainer,
            speedTimer.speedTimeRemaining <= 10 && styles.speedTimerUrgent,
            speedTimer.speedTimeRemaining <= SPEED_TICK_CRITICAL_SEC && styles.speedTimerCritical,
          ]}>
            <Animated.View style={{ transform: [{ scale: speedPulseScale }] }}>
              <Text style={[
                styles.speedTimerText,
                speedTimer.speedTimeRemaining <= 10 && styles.speedTimerTextUrgent,
                speedTimer.speedTimeRemaining <= SPEED_TICK_CRITICAL_SEC && styles.speedTimerTextCritical,
              ]}>
                {speedTimer.speedTimeRemaining}s
              </Text>
            </Animated.View>
            {speedRound > 0 && (
              <Animated.View
                style={[styles.speedRoundRow, { transform: [{ scale: speedRoundPulse }], opacity: speedRoundPulse }]}
                accessibilityLabel={`Speed round ${speedRound + 1}, faster clock`}
              >
                <Image
                  source={require('./assets/ui/flame.png')}
                  style={styles.speedRoundFlame}
                />
                <Text style={styles.speedRoundText}>Round {speedRound + 1}</Text>
              </Animated.View>
            )}
          </View>
        )}

        {/* Game Area */}
        <View style={styles.gameArea}>
          {/* victorySpinnerVisible only turns true when the victory record/
              persist gap outlasts a grace window — the normal brief gap never
              flashes a spinner over the celebration. */}
          {(loadingGraceVisible || victoryFlow.victorySpinnerVisible) && (
            <View style={styles.loadingOverlay}>
              <View style={[styles.loadingBox, { backgroundColor: pauseSurface.cardBg, borderWidth: 1, borderColor: pauseSurface.cardBorder }]}>
                <BrandedLoader size={44} />
                <Text style={[styles.loadingGlyph, { color: pauseSurface.title }]}>{persistence.currentPhase >= 3 ? '◈' : '✦'}</Text>
                <Text style={[styles.loadingText, { color: pauseSurface.title }]}>
                  {getLoadingMessage(persistence.currentPhase)}
                </Text>
                <Text style={[styles.loadingHint, { color: pauseSurface.muted }]}>
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
              <View style={[styles.loadingBox, { backgroundColor: pauseSurface.cardBg, borderWidth: 1, borderColor: pauseSurface.cardBorder }]}>
                <Text style={[styles.loadingGlyph, { color: pauseSurface.title }]}>{'◈'}</Text>
                <Text style={[styles.timeUpText, { color: pauseSurface.title }]}>
                  {puzzle.message || getSpeedTimeUpMessage(persistence.currentPhase)}
                </Text>
                {/* Opt-in rewarded rescue — once per board. RewardedAdButton
                    self-gates on provider readiness, the daily rewarded cap,
                    and Patron status (it isn't rendered when unavailable). */}
                {!speedRescueUsed && (
                  <RewardedAdButton
                    placement={SPEED_RESCUE_PLACEMENT}
                    phase={persistence.currentPhase}
                    surface="dark"
                    label={getSpeedRescueLabel(persistence.currentPhase, SPEED_RESCUE_EXTRA_SEC)}
                    onReward={handleSpeedRescue}
                    style={styles.speedRescueButton}
                  />
                )}
                <View style={styles.timeUpButtonRow}>
                  <CandyButton
                    label="Try Again"
                    phase={persistence.currentPhase}
                    variant="primary"
                    style={styles.timeUpButtonFlex}
                    soundKind="none"
                    onPress={() => {
                      hapticLight();
                      // Abandoning the timed-out run resets the escalation
                      // ladder (time-up no longer resets it — a rescue may
                      // continue the run).
                      resetSpeedRun();
                      puzzleActions.startNewGame();
                    }}
                    accessibilityLabel="Try again with a new puzzle"
                  />
                  <CandyButton
                    label="Home"
                    phase={persistence.currentPhase}
                    variant="secondary"
                    style={styles.timeUpButtonFlex}
                    soundKind="none"
                    onPress={() => {
                      hapticLight();
                      resetSpeedRun();
                      setCurrentScreen('home');
                      puzzleActions.setGameState(GameState.IDLE);
                    }}
                    accessibilityLabel="Return home"
                  />
                </View>
              </View>
            </View>
          )}

          <ScrollView
            ref={puzzleScrollRef}
            contentContainerStyle={styles.rowsContainer}
            showsVerticalScrollIndicator={false}
            scrollEnabled={puzzleScrollEnabled}
            accessibilityRole="list"
            accessibilityLabel={`Puzzle with ${puzzle.rows.length} word rows`}
          >
            {/* Board scale-to-fit wrapper (F139/F140): a single uniform scale
                around the board's horizontal center. undefined at scale 1 (the
                ordinary-phone case), so the wrapper is layout-transparent there;
                the drag math is fed the same scale so drops stay aligned. */}
            <View style={boardScale !== 1 ? { transform: [{ scale: boardScale }] } : undefined}>
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
                onInactivePress={handleInactiveTilePress}
                isProcessing={puzzle.isProcessing}
                phase={persistence.currentPhase}
                wordLength={row.words.length}
                concealLetters={false}
                guidanceActive={onboardingFlow.onboardingStep === 'puzzle_tutorial'}
                guidedLetterId={tutorialGuidance?.sourceLetterId || null}
                guidedSlotIndex={tutorialGuidance?.targetSlotIndex ?? null}
                hintLetterId={
                  puzzle.hintHighlight && idx === puzzle.hintHighlight.rowIndex
                    ? puzzle.hintHighlight.letterId
                    : null
                }
                hintSlotIndex={
                  puzzle.hintHighlight
                  && idx === puzzle.hintHighlight.targetRowIndex
                  && puzzle.selectedLetter?.id === puzzle.hintHighlight.letterId
                    ? (puzzle.hintHighlight.targetSlotIndex ?? null)
                    : null
                }
                arrival={
                  puzzle.lastArrival && idx === puzzle.lastArrival.rowIndex
                    ? puzzle.lastArrival
                    : null
                }
                invalidDropSignal={invalidDropSignal}
                successDropSignal={successDropSignal}
                onLetterDragDrop={handleLetterDragDrop}
                onLetterDragMove={handleLetterDragMove}
                onDragActiveChange={handleDragActiveChange}
                onMeasureRef={registerRowNode}
                slotPreviews={
                  idx === puzzle.activeRowIndex + (puzzle.moveDirection === 'down' ? 1 : -1)
                    ? puzzle.slotPreviews
                    : undefined
                }
                previewValidityVisible={puzzle.previewValidityVisible}
                hoverSlotIndex={
                  hoverSlot && idx === hoverSlot.rowIndex ? hoverSlot.slotIndex : null
                }
              />
            ))}
            </View>
          </ScrollView>
          {/* Blind Offering judgment beat — overlays the board (pointer-
              transparent), plays only when a blind board resolves. */}
          <BlindJudgmentOverlay signal={blindJudgmentSignal} phase={persistence.currentPhase} />
        </View>

        {/* No stuck-panel / no immediate "unwinnable" announcement — product
            decision: discovering a dead-end and choosing to undo or restart
            is part of the challenge. puzzle.isStuck drives ONLY the one-time
            first-stuck mercy toast (see firstStuckCheckedRef); every later
            stuck stays silent, and the always-available UNDO / RESTART
            controls below are the player's way out. */}

        {/* Bottom Controls — simplified during onboarding (no NEW button).
            Bottom padding grows past the legacy 30 to clear the home
            indicator / gesture nav bar on tall devices. */}
        <View style={[styles.controls, { paddingBottom: Math.max(30, screenInsets.bottom) }]}>
          <ActionButton
            icon="↩"
            label="UNDO"
            colors={getActionButtonColors('undo', persistence.currentPhase)}
            phase={persistence.currentPhase}
            onPress={handleUndo}
            disabled={puzzle.history.length === 0 || puzzle.gameState !== GameState.PLAYING}
          />
          <ActionButton
            icon="💡"
            label={puzzle.gameMode === 'challenge' ? 'HINT' : `HINT · ${puzzle.hintBalance}`}
            colors={getActionButtonColors('hint', persistence.currentPhase)}
            phase={persistence.currentPhase}
            pulseSignal={hintPulseSignal}
            onPress={handleHintPress}
            disabled={puzzle.gameState !== GameState.PLAYING}
            accessibilityLabel={
              puzzle.gameMode === 'challenge'
                ? 'Hint (unavailable in Challenge Mode)'
                : `Hint, ${puzzle.hintBalance} remaining`
            }
          />
          {onboardingFlow.onboardingStep === 'cold_open_puzzle' && (
            <ActionButton
              icon="⏭"
              label={getColdOpenSkipLabel()}
              colors={getActionButtonColors('restart', persistence.currentPhase)}
              phase={persistence.currentPhase}
              onPress={handleColdOpenSkipPress}
              disabled={false}
              accessibilityLabel={getColdOpenSkipAccessibilityLabel()}
            />
          )}
          {!onboardingFlow.isOnboarding && (
          <ActionButton
            icon="🔄"
            label={puzzle.gameState === GameState.PLAYING ? "RESTART" : "NEW"}
            colors={getActionButtonColors('restart', persistence.currentPhase)}
            phase={persistence.currentPhase}
            onPress={() => {
              hapticLight();
              // RESTART while playing resets THIS board (a true retry); NEW (idle)
              // fetches a fresh puzzle.
              if (puzzle.gameState === GameState.PLAYING) {
                // A distinct "taking the board back" sound (the reset re-runs the
                // Row board-serve cascade, which supplies the visual exhale).
                soundUndo();
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

        {/* Victory Modal — shown during onboarding puzzle_tutorial. Hidden while
            the FoxGuide completion beat runs (puzzle_complete) AND through the
            going_to_pit transition window: gameState is still WON during the
            ~300ms before the pit transition overlay covers the screen, so
            without the second exclusion the modal flashed back in.
            Tap-to-skip lives INSIDE the modal (onSkip): the old childless
            box-none Pressable here never received touches — dead code. */}
        <VictoryModal
          visible={puzzle.gameState === GameState.WON && !(onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'puzzle_complete' || onboardingFlow.onboardingStep === 'going_to_pit'))}
          earnedStars={puzzle.earnedStars}
          difficulty={isPlayingDaily ? 'HARD' : puzzle.difficulty}
          phase={persistence.currentPhase}
          phaseTransitionPending={persistence.pendingPhaseTransition != null}
          isPlayingDaily={isPlayingDaily}
          dailyRank={dailyRank}
          dailyHistoryLine={dailyLadderLine}
          dailyTrend={dailyLadderTrend}
          socialProofLine={socialProofLine}
          eventBonusLine={eventBonusLine}
          receiptLine={victoryReceipt}
          forceFullCeremony={phaseTransitionEvent != null}
          rewardedDoubleEnabled={victoryDoubleOffer}
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
          onSkip={handleVictoryTapAccelerate}
          isOnboarding={onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'cold_open_puzzle' || onboardingFlow.onboardingStep === 'puzzle_tutorial')}
          onOnboardingContinue={handleOnboardingVictoryContinue}
          variant={puzzle.currentVariant}
          gameMode={puzzle.gameMode}
        />

        {/* Victory Glitch — brief flash text during Phase 0 victories */}
        {orchestration.showVictoryGlitch && orchestration.victoryGlitch && (
          <View
            style={[
              styles.victoryGlitchOverlay,
              orchestration.victoryGlitchProminent && styles.victoryGlitchOverlayProminent,
            ]}
            pointerEvents="none"
            // The flicker is a subliminal atmospheric flash, not reading matter:
            // keep it OUT of the screen-reader swipe order (pointerEvents alone
            // doesn't remove it). The prominent glitch is spoken deliberately via
            // announceForA11y (see the glitchStutter effect), so nothing is lost.
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Animated.Text
              style={[
                styles.victoryGlitchText,
                orchestration.victoryGlitchProminent && styles.victoryGlitchTextProminent,
                orchestration.victoryGlitchProminent && { opacity: glitchStutter },
              ]}
            >
              {orchestration.victoryGlitch}
            </Animated.Text>
          </View>
        )}

        {/* Narrative Micro-Beat — surprise moments at puzzle milestones */}
        {orchestration.showMicroBeat && orchestration.microBeat && (
          // F38: fade + settle in/out via the orchestration hook's drivers
          // (glitch_title hard-cuts — the hook snaps its opacity/translateY to
          // 1/0 instantly; the whisper beats animate them).
          <Animated.View style={[
            styles.victoryGlitchOverlay,
            (orchestration.microBeat.type === 'ambient_whisper' || orchestration.microBeat.type === 'silent_victory') && styles.microBeatWhisperOverlay,
            { opacity: orchestration.microBeatOpacity, transform: [{ translateY: orchestration.microBeatTranslateY }] },
          ]} pointerEvents="none"
            // Atmospheric flash; the ambient_whisper/silent_victory beats are
            // spoken via the announce pipeline, so keep the visual node out of
            // the screen-reader swipe order.
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden>
            <Text style={[
              orchestration.microBeat.type === 'glitch_title' ? styles.victoryGlitchText : styles.microBeatWhisperText,
            ]}>
              {orchestration.microBeat.type === 'glitch_title' ? orchestration.microBeat.glitchTitle : orchestration.microBeat.text}
            </Text>
          </Animated.View>
        )}

        {/* Animal Whisper — ghost-like message from an animal after puzzle completion */}
        <AnimalWhisper
          visible={orchestration.showWhisper}
          animalName={orchestration.whisper?.animalName || ''}
          whisperText={orchestration.whisper?.text || ''}
          phase={persistence.currentPhase}
          onComplete={orchestrationActions.dismissWhisper}
          topInset={screenInsets.top}
        />

        {/* Animal Interjection — brief message pulling player to home screen.
            The narrative-slot arbiter (revealWhenFree / isNarrativeVoiceActive)
            already guarantees the whisper and interjection never reveal at the
            same time, so the render no longer ALSO gates on !showWhisper — that
            extra gate hard-unmounted the interjection mid-fade if a late whisper
            flipped showWhisper, reading as a flash. Now it always fades out via
            its own driver. */}
        {orchestration.showInterjection && orchestration.interjection && (
          // pointerEvents="none": a decorative overlay that lives up to 4s —
          // it must never swallow taps meant for the board/buttons under it
          // (the whisper overlay already does the same).
          // F38: fade + settle in/out via the orchestration hook's drivers.
          <Animated.View style={[
            styles.interjectionContainer,
            persistence.currentPhase >= 3
              ? styles.interjectionContainerDark
              : persistence.currentPhase === 2
                ? styles.interjectionContainerMuted
                : styles.interjectionContainerLight,
            { top: screenInsets.top + 12, opacity: orchestration.interjectionOpacity, transform: [{ translateY: orchestration.interjectionTranslateY }] },
          ]} pointerEvents="none"
            // Transient atmospheric nudge: keep it out of the screen-reader
            // swipe order (the load-bearing narrative rides the whisper +
            // announce pipeline).
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden>
            <Text style={[
              styles.interjectionText,
              persistence.currentPhase >= 3
                ? styles.interjectionTextDark
                : persistence.currentPhase === 2
                  ? styles.interjectionTextMuted
                  : styles.interjectionTextLight,
            ]}>
              {orchestration.interjection.text}
            </Text>
          </Animated.View>
        )}

        {/* Dread Pulse — subtle dark flash when a dread word is formed */}
        <Animated.View
          style={[styles.dreadPulseOverlay, { opacity: dreadEffects.dreadPulseOpacity }]}
          pointerEvents="none"
        />

        {/* Fox Guide overlay — shown during onboarding on puzzle screen (hidden when victory modal is showing).
            While a move is required (puzzle_tutorial + PLAYING) the guide
            drops to the small compact card and dynamically dodges the active
            rows (tutorialFoxAnchor): the full dialogue card was tall enough
            to blot out the lower rows — and the UNDO/HINT controls — on
            small screens. The dialogue variant returns for the intro and
            completion beats, where no board interaction is needed. */}
        {onboardingFlow.isOnboarding && (onboardingFlow.onboardingStep === 'puzzle_tutorial' || onboardingFlow.onboardingStep === 'puzzle_complete') && !(onboardingFlow.onboardingStep === 'puzzle_tutorial' && puzzle.gameState === GameState.WON) && (
          <FoxGuide
            visible={true}
            variant={
              onboardingFlow.onboardingStep === 'puzzle_tutorial' && puzzle.gameState === GameState.PLAYING
                ? 'compact'
                : 'dialogue'
            }
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
                          ? `Tap the glowing "${tutorialGuidance.letterToMove}" tile to pick it up. Or just drag it.`
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
                  // Dynamic avoidance: top of screen while acting on the
                  // lower rows, above the controls while acting on the
                  // upper rows — the active rows are never covered.
                  ? tutorialFoxAnchor
                  : undefined
            }
          />
        )}
        {/* Hidden while the setup menu (a fullscreen Modal that stacks above
            this hierarchy) is open — the intro SEQUENCES card then menu. */}
        {!onboardingFlow.isOnboarding && showSetupSelectorIntro && !puzzle.showDifficultyMenu && (
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

  // A blocking full-screen overlay (the victory modal, the Time's-Up GAME_OVER
  // overlay, or a phase-transition cinematic) is up: the screen underneath is
  // visually occluded, so it must be hidden from the screen reader too, or
  // VoiceOver/TalkBack focus leaks into the board/home behind the overlay.
  const victoryModalVisible =
    puzzle.gameState === GameState.WON &&
    !(onboardingFlow.isOnboarding &&
      (onboardingFlow.onboardingStep === 'puzzle_complete' ||
        onboardingFlow.onboardingStep === 'going_to_pit'));
  const blockingOverlayActive =
    victoryModalVisible ||
    puzzle.gameState === GameState.GAME_OVER ||
    phaseTransitionEvent != null;

  // Render screen with global overlays on top
  return (
    <View style={{ flex: 1, backgroundColor: rootBgColor }}>
      {/* Catch-all boundary: the home/puzzle screens carry their own inner
          boundaries; this outer one covers the secondary screens (settings,
          stats, ledger, gallery, pit) so a render error on any of them returns
          the player home instead of crashing the entire app. */}
      <Animated.View
        style={{
          flex: 1,
          transform: screenRevealKind === 'sink'
            ? [{ translateY: screenRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }]
            : [{ scale: screenRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
        }}
        accessibilityElementsHidden={blockingOverlayActive}
        importantForAccessibility={blockingOverlayActive ? 'no-hide-descendants' : 'auto'}
      >
      <ErrorBoundary
        fallbackMessage="Something went wrong. Tap to return home."
        onReset={() => setCurrentScreen('home')}
      >
        {renderScreen()}
      </ErrorBoundary>
      </Animated.View>
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
        challengeText={shareChallengeText}
        onClose={() => setShareResultData(null)}
        onShared={() => {
          // shareImage logs the share_completed event (with image/text kind);
          // refresh to pick up the first-share-of-day amber bonus.
          persistenceActions.refreshStats();
        }}
      />
      {/* Daily login reward — celebratory claim modal (amber already credited).
          Presented only on a quiet home screen: while the player is mid-puzzle,
          in the victory flow, a post-victory intro, or a ceremony, the claimed
          grant is held in state and surfaces on the next home arrival. */}
      <DailyLoginModal
        grant={dailyLoginGrantVisible ? dailyLoginGrant : null}
        phase={persistence.currentPhase}
        onClose={() => setDailyLoginGrant(null)}
      />
      <NotificationPromptModal
        visible={notificationPrompt !== null}
        phase={persistence.currentPhase}
        title={notificationPrompt?.title ?? ''}
        body={notificationPrompt?.body ?? ''}
        acceptLabel={notificationPrompt?.accept ?? ''}
        declineLabel={notificationPrompt?.decline ?? ''}
        onAccept={handleNotificationPromptAccept}
        onDecline={handleNotificationPromptDecline}
      />
      <PatronModal
        visible={showPatronModal}
        phase={persistence.currentPhase}
        onClose={() => {
          setShowPatronModal(false);
          setHomeRefreshSignal(n => n + 1);
        }}
        onPatronChange={(isPatron) => { if (isPatron) persistenceActions.refreshStats(); }}
      />
      <StoreModal
        visible={showStoreModal}
        phase={persistence.currentPhase}
        amberBalance={persistence.amberBalance}
        hintBalance={puzzle.hintBalance}
        onClose={() => {
          setShowStoreModal(false);
          setHomeRefreshSignal(n => n + 1);
        }}
        onAmberChange={persistenceActions.setAmberBalance}
        onHintsChange={() => puzzleActions.refreshHintBalance()}
        onOpenPatron={() => setShowPatronModal(true)}
      />
      {/* Cottage-skinned Alert.alert replacement — mounted last so it layers
          over every screen and modal (see services/gameAlert). */}
      <GameAlertModal phase={persistence.currentPhase} />
    </View>
  );
}

/**
 * Bootstrap gate: runs data migrations BEFORE MainApp mounts so that all
 * service caches read migrated data. Never blocks forever — the app renders
 * even if migrations fail (failures are logged, not fatal).
 */
// How long the first frame may wait on the fresh-install cloud restore. The
// restore is a single RPC that normally resolves well under a second; on a
// slow/flaky network its 8s client timeout would otherwise hold the very first
// launch hostage behind a boot screen. If the race times out we boot as a
// fresh install and, should the slow restore eventually succeed, re-run
// migrations and remount MainApp (restoreFromCloudData already invalidates
// the service caches, so the remount re-reads the restored save).
const BOOT_RESTORE_RACE_MS = 2500;

/**
 * The branded boot hold (F97/F119/F127): the fox icon card + wooden wordmark +
 * quiet spinner on the splash cream, sized RELATIVE TO THE WINDOW so it mirrors
 * the native splash's `contain` math (square 1600 art master) on every device
 * instead of a fixed 152/244px that jumped on the splash->JS handoff. Shared by
 * the App bootstrap gate and MainApp's onboarding-hydration gate so all three
 * holds (native splash, bootstrap, hydration) read as ONE continuous frame.
 */
function BootHold() {
  const { width, height } = useWindowDimensions();
  const m = Math.min(width, height);
  const iconSize = Math.round(m * (740 / 1600));
  const wordmarkWidth = Math.round(m * (810 / 1600));
  const gap = Math.round(m * (64 / 1600));
  return (
    <View style={bootStyles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={[bootStyles.iconCard, { width: iconSize, height: iconSize, borderRadius: Math.round(iconSize * 0.18), marginBottom: gap }]}>
        <Image
          source={require('./assets/icon.png')}
          style={bootStyles.iconImage}
          resizeMode="cover"
          accessibilityLabel="WordShift"
        />
      </View>
      <Image
        source={require('./assets/ui/wordmark.png')}
        style={{ width: wordmarkWidth, height: Math.round(wordmarkWidth * 0.25) }}
        resizeMode="contain"
      />
      <BrandedLoader size={30} style={{ marginTop: Math.round(gap * 1.4) }} />
    </View>
  );
}

function App() {
  const [bootReady, setBootReady] = useState(false);
  // Bumped when a slow cloud restore lands after boot — remounts MainApp so
  // every hook re-reads the restored storage.
  const [appEpoch, setAppEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    logEvent({ type: 'app_open' });
    (async () => {
      try {
        // Install the cloud provider (no-op unless Supabase is configured), then
        // pull a cloud save BEFORE migrations/services read storage — so a fresh
        // install (or a device switch via recovery code) restores prior progress.
        // The wait is capped: D1 is decided on this exact launch, and a network
        // stall must not read as a hung app.
        installCloudProviderIfConfigured();
        const restorePromise = maybeAutoRestoreOnFreshInstall();
        // Background uploads (MainApp fires one on mount) wait for the restore
        // to settle so a slow first launch can't push near-empty fresh-install
        // state over the cloud row the restore is still downloading.
        holdUploadsUntil(restorePromise);
        const raced = await Promise.race([
          restorePromise.then((restored) => ({ restored, timedOut: false })),
          new Promise<{ restored: boolean; timedOut: boolean }>((resolve) =>
            setTimeout(() => resolve({ restored: false, timedOut: true }), BOOT_RESTORE_RACE_MS)
          ),
        ]);
        if (raced.timedOut) {
          // Boot proceeds as a fresh install. If the restore later succeeds,
          // apply it: re-run migrations over the restored data, then remount.
          void restorePromise
            .then(async (restored) => {
              if (restored && !cancelled) {
                await runMigrations();
                // The remount hard-resets whatever the player was doing; the
                // notice tells them why (their cloud progress arrived).
                pendingRestoreNotice = true;
                setAppEpoch((epoch) => epoch + 1);
              }
            })
            .catch(() => {});
        }
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
        // Store/ad SDK init is fire-and-forget: the first frame must never wait
        // on billing config or the ads consent → SDK init → preload chain (the
        // adapter runs that whole chain in the background internally). Worst
        // case the first eligible ad/purchase surface is briefly unavailable.
        void initIAP().catch((err) => console.warn('initIAP failed:', err));
        void initAds().catch((err) => console.warn('initAds failed:', err));
        // initHints seeds the one-time free hint stash; awaited before MainApp
        // mounts, so usePuzzleGame reads the correct balance on its first render.
        // loadEntitlements warms the sync cache (isPatronSync / ad suppression /
        // Store first-purchase badge) — a cheap local read that must NOT ride on
        // the fire-and-forget initIAP, or a cold cache briefly misreports
        // Patron/ad-free status and the Store's 2x-first-purchase badge.
        // loadPixelFonts registers the cottage dialogue/chrome font before the
        // first frame (never throws — falls back to system font on failure).
        // getSettings() warms the settings cache BEFORE the first frame. Every
        // render-path consumer reads getSettingsSync() (settingsCache ||
        // DEFAULT_SETTINGS); without this warm, a fresh launch returns DEFAULTS
        // until some audio/haptic call happens to warm the cache first — so a
        // persisted preference (Swift Victories, Reduced Motion, Sound/Haptics
        // off) silently reads as its default on early renders. Warming it here
        // makes getSettingsSync authoritative from frame one.
        await Promise.all([getSettings(), initCosmetics(), initHints(), loadEntitlements(), loadPixelFonts()]);
        // Recover any consumable purchase whose reward never landed (app killed
        // between the store success and the grant). Apply-then-ack gives
        // at-least-once delivery: a crash mid-recovery replays rather than
        // loses a paid purchase. Local-only reads/writes — cheap to await, and
        // doing it before MainApp mounts means the first frame shows the
        // recovered balance.
        try {
          const pendingGrants = await reconcilePendingConsumableGrants();
          for (const grant of pendingGrants) {
            if (grant.reward.kind === 'amber') {
              await awardBonusAmber(grant.reward.amount, `iap_recovered_${grant.productId}`);
            } else {
              await addHints(grant.reward.amount, `iap_recovered_${grant.productId}`);
            }
            await acknowledgeConsumableGrant(grant.grantId);
          }
        } catch (error) {
          console.warn('Pending IAP grant recovery failed:', error);
        }
      } catch (error) {
        console.warn('Bootstrap init failed:', error);
      } finally {
        if (!cancelled) setBootReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Branded boot view while booting — the wordmark + a quiet spinner on the
  // root background, so a slow first launch reads as loading rather than a
  // hung black screen. SafeAreaProvider wraps both branches so
  // useSafeAreaInsets is available everywhere in MainApp.
  return (
    <SafeAreaProvider>
      {bootReady ? (
        <MainApp key={appEpoch} />
      ) : (
        <BootHold />
      )}
    </SafeAreaProvider>
  );
}

const bootStyles = StyleSheet.create({
  container: {
    flex: 1,
    // Matches the native splash background (#FFF0F5) so splash → boot is a
    // seamless hold rather than a bright-pink-to-near-black hard cut on the
    // first impression. The wooden wordmark reads well on both.
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rounded fox card — width/height/borderRadius/marginBottom are supplied
  // window-relative by BootHold (F127). No shadow: the native splash card is
  // shadowless, so a boot shadow made the handoff visibly pop.
  iconCard: {
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    width: 244,
    height: 61,
  },
  spinner: {
    marginTop: 30,
  },
});

// Wrap the root in Sentry's higher-order component so native crash context and
// (if enabled) profiling attach to the running app. No-op when Sentry isn't
// initialized.
export default Sentry.wrap(App);
