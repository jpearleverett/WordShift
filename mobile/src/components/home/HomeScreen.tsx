import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Image,
  ScrollView,
  Pressable,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from 'react-native';
// Note: HomeScreen's own UI (header, modals) is outside GestureHandlerRootView,
// so we use react-native's TouchableOpacity here. RoomView and AnimalSprite
// (inside HouseWorld's GestureHandlerRootView) correctly use RNGH's version.
import { Animal, Room, HomeWorldProgress } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CHARACTER_SPRITES } from './AnimalSprite';
import { CandyColors, getDialogueTheme, getPhaseTheme } from '../../theme/colors';
import { SURFACE, getPressSpring, getSurfaceTheme } from '../../theme/surfaces';
import {
  getPixelSkin,
  PANEL_CORNER_DP,
  PANEL_EDGE_DP,
  CARD_CORNER_DP,
  CARD_EDGE_DP,
  BTN_CAP_DP,
  BTN_MD_DP,
  BTN_SHADOW_DP,
} from '../../theme/pixelSkin.generated';
import { PIXEL_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { NineSliceFrame, ThreeSliceStrip } from '../ui/NineSlice';
import { PixelPlaque } from '../ui/PixelPlaque';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import {
  getFullProgress,
  markIntroSeen,
  markHouseCompleted,
  spendAmber,
  awardBonusAmber,
  hasSeenChallengeIntro,
  markChallengeIntroSeen,
  hasSeenPitNudge,
  markPitNudgeSeen,
  hasSeenJournalIntro,
  markJournalIntroSeen,
  hasSeenDailyChallengeIntro,
  markDailyChallengeIntroSeen,
  hasSeenGatedUnlockIntro,
  markGatedUnlockIntroSeen,
  hasSeenMandatoryHarvest,
  hasSeenHarvestHomeIntro,
  markHarvestHomeIntroSeen,
} from '../../services/amberCurrency';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { AUTO_COLLECT_PUZZLE_LIMIT, HARVEST_NUDGE_MIN_AMBER } from '../../constants/gameBalance';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import { AmberInline } from '../AmberInline';

// Candy-style UI icon sprites (cross-platform consistent, replaces emoji)
const AMBER_ICON = require('../../../assets/ui/amber.png');
const FLAME_ICON = require('../../../assets/ui/flame.png');
const JOURNAL_ICON = require('../../../assets/ui/journal.png');
const HINT_ICON = require('../../../assets/ui/hint.png');
const STAR_ICON = require('../../../assets/ui/star_filled.png');
import {
  getChallengeIntroLines,
  getHouseCompletionText,
  getWordsOfferedText,
  getJournalIntroLines,
  getJournalSpotlightSteps,
  getDailyChallengeIntroLines,
  getGatedRoomIntroLines,
  getHarvestHomeIntroLines,
  getHarvestNudgeLine,
} from '../../services/phaseNarrative';
import {
  ROOMS,
  ANIMALS,
  ANIMAL_EMOJIS,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getRoomDescription,
  claimReservedUnlockIfReady,
  getReservedArrivalText,
  getReserveGateText,
} from '../../services/homeWorldData';
import { RulesModal } from '../puzzle/RulesModal';
import {
  ANIMAL_INFO,
  getIntroDialogueLine,
  getIntroDialogueCount,
  getCatchupIntroDialogue,
  getCatchupIntroDialogueCount,
} from '../../services/animalDialogue';
import {
  loadDialogueSessions,
  updatePuzzleCount,
} from '../../services/dialogueSession';

import { useDialogueFlow } from '../../hooks/useDialogueFlow';
import { useUnlockFlow } from '../../hooks/useUnlockFlow';

import { JuicyButton } from './JuicyButton';
import { CelebrationConfetti } from './CelebrationConfetti';
import { AmberSparkle } from './AmberSparkle';
import { Difficulty } from '../../types';
import { OnboardingStep } from '../../services/onboarding';
import {
  isSacrificeAvailable,
  getSacrificeAmounts,
  getSacrificePrompt,
  performSacrifice,
} from '../../services/sacrifice';
import { getGalleryTitle } from '../../services/whisperGallery';
import {
  updateQuestProgress,
  loadWeeklyQuests,
  claimQuestReward,
  getQuestDescription,
  getTimeUntilReset,
  getTimeUntilDailyReset,
  getUnclaimedAmber,
  getPhaseRewardMultiplier,
  CombinedQuestState,
} from '../../services/weeklyQuests';
import { getSettingsSync } from '../../services/settings';
import { getUnlockedVariants } from '../../services/puzzleVariety';
import { getPendingHarvestSummary, HarvestSummary } from '../../services/wordHarvest';
import { getLocalDateString, daysAgoLocal } from '../../services/dateUtils';
import { getHomeAmbientLine, getFoxPitNudgeLines, getShopTitle } from '../../services/phaseNarrative';
import { DailyChallengeCard } from '../DailyChallengeCard';
import { isDailyChallengeUnlocked } from '../../services/dailyChallenge';
import { areUpgradesAvailable, getPurchasedUpgrades, getRoomUpgrade, getUpgradeDescription, purchaseRoomUpgrade, areDeepeningsAvailable, getDeepenedRooms, getRoomDeepening, purchaseRoomDeepening } from '../../services/roomUpgrades';
import { getTendingLevel } from '../../services/tending';
import { hapticLight, hapticSelection } from '../../services/haptics';
import { logEvent } from '../../services/eventLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeScreenProps {
  onPlayPuzzle: (difficulty?: Difficulty) => void;
  /** Start the Daily Challenge (seeded HARD puzzle). */
  onStartDaily?: (difficulty: Difficulty) => void;
  /** Re-check today's leaderboard standing (tapping the completed daily card). */
  onRecheckDailyStanding?: () => void;
  onAmberChange?: (newBalance: number) => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onOpenLedger?: () => void;
  onOpenGallery?: () => void;
  onOpenShop?: () => void;
  onOpenStore?: () => void;
  onOpenPit?: () => void;
  /** Current onboarding step (undefined when onboarding is complete) */
  onboardingStep?: OnboardingStep;
  /** Advance onboarding to next step */
  onAdvanceOnboarding?: (step: OnboardingStep) => Promise<void>;
  /** Whether a phase transition is pending in the pit */
  pitPhaseReady?: boolean;
  /** Persisted vertical pan position for the house scene */
  initialHousePanY?: number | null;
  /** Persist the latest house pan position */
  onHousePanChange?: (panY: number) => void;
  /**
   * Fired once when the house first becomes complete (all rooms + animals).
   * When provided, App plays the full HOUSE_COMPLETION_EVENT cinematic instead
   * of the inline fallback modal.
   */
  onHouseCompleted?: () => void;
}

// --- Header quest pill: pure decisions (node-testable, see questPill.test.ts) ---

/**
 * Count of CLAIMABLE quests across daily + weekly: quests that are completed but
 * not yet claimed — i.e. rewards waiting to be turned in. This is the single
 * shared count behind BOTH the header quest pill and the Journal Hub "Quests (N)"
 * row, so the two surfaces can never disagree.
 *
 * In-progress quests are deliberately NOT counted: a player who claimed every
 * finished quest saw the pill still read "3" from long-running weeklies they
 * couldn't finish yet, which read as "3 rewards to turn in" when there was
 * nothing to claim. The number now tracks exactly what the "!" badge does
 * (claimable amber), so it's bare 🎯 the moment there's nothing left to collect.
 */
export const getActionableQuestCount = (state: CombinedQuestState | null): number => {
  if (!state) return 0;
  return [...state.daily.quests, ...state.weekly.quests]
    .filter(q => q.completed && !q.claimed).length;
};

/**
 * Quest pill gating — exactly the Journal Hub's gate (puzzle 6+ via the
 * post-tutorial light mode, never during onboarding), plus loaded quest data.
 */
export const isQuestPillVisible = (
  isOnboarding: boolean,
  isPostTutorialLightMode: boolean,
  hasQuestState: boolean,
): boolean => !isOnboarding && !isPostTutorialLightMode && hasQuestState;

/**
 * Quest pill label: 🎯 plus the actionable count — or the bare 🎯 when
 * nothing is left to do (all current daily + weekly quests completed and
 * claimed). A lingering "🎯 0" read as a permanent to-do; the number only
 * appears while a quest is actually actionable.
 */
export const getQuestPillLabel = (actionableCount: number): string =>
  actionableCount > 0 ? `🎯 ${actionableCount}` : '🎯';

/**
 * Journal Hub "Quests" row label. Prefers the claimable-amber call-out, then
 * the actionable count, and drops the parenthetical entirely when nothing is
 * left to do (an all-claimed board must never read "Quests (5)").
 */
export const getJournalQuestLabel = (
  actionableCount: number,
  claimableAmber: number,
): string => {
  if (claimableAmber > 0) return `🗓 Quests (+${claimableAmber})`;
  return actionableCount > 0 ? `🗓 Quests (${actionableCount})` : '🗓 Quests';
};

/** Screen-reader label for the quest pill: actionable count, claimable amber, daily reset. */
export const getQuestPillAccessibilityLabel = (
  actionableCount: number,
  claimableAmber: number,
  dailyResetHint: string,
): string =>
  'Open quests.' +
  (actionableCount > 0
    ? ` ${actionableCount} to do.`
    : claimableAmber > 0 ? '' : ' All quests complete.') +
  (claimableAmber > 0 ? ` ${claimableAmber} amber ready to claim.` : '') +
  ` Daily quests reset in ${dailyResetHint}.`;

// --- Local feel-kit primitives (shared anatomy for this file's modals) ---

/**
 * Springy modal-panel entrance: scale 0.92 -> 1 (SURFACE.modalIn). Mounts fresh
 * each time its Modal opens, so the spring runs once per open. Reduced motion
 * pins the end state. Native driver only.
 */
const SpringIn: React.FC<{
  style?: StyleProp<ViewStyle>;
  claimTouches?: boolean;
  children: React.ReactNode;
}> = ({ style, claimTouches, children }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  useEffect(() => {
    if (reducedMotion) return;
    const anim = Animated.spring(scale, {
      toValue: 1,
      ...SURFACE.modalIn,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [scale, reducedMotion]);
  return (
    <Animated.View
      style={[style, { transform: [{ scale }] }]}
      onStartShouldSetResponder={claimTouches ? () => true : undefined}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Framed hub-row (Journal / Utility menus): cottage pixel card frame with an
 * optional ui-sprite icon — replaces the old uniform ghost rows.
 */
const HubRow: React.FC<{
  phase: number;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  icon?: ImageSourcePropType;
  /** Host panel is dt.modalBg, which darkens at phase 2 (see dtHostDark). */
  hostDark?: boolean;
}> = ({ phase, label, onPress, accessibilityLabel, icon, hostDark = false }) => {
  const t = getSurfaceTheme(hostDark && phase < 3 ? 3 : phase);
  const skin = getPixelSkin(phase, hostDark);
  return (
    <TouchableOpacity
      style={styles.hubRow}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <NineSliceFrame
        skin={skin.card}
        cornerDp={CARD_CORNER_DP}
        edgeDp={CARD_EDGE_DP}
        fillColor={skin.fillCard}
      />
      {icon ? <Image source={icon} style={styles.hubRowIcon} resizeMode="contain" /> : null}
      <Text style={[styles.hubRowText, { color: t.body }]}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * Cottage pixel bevel button that accepts arbitrary children (needed where
 * the label embeds <AmberInline /> inside the Text run — CandyButton itself
 * only takes a string label). Mirrors CandyButton's anatomy exactly: 3-slice
 * pixel strip with a baked cast shadow, pressed-state sprite swap, and the
 * label travels down SURFACE.pressTravel while pressed, springing back with
 * phase weight. amber/primary map onto the amber pixel bevel; secondary is
 * the wood-trimmed parchment bevel.
 */
const BevelRowButton: React.FC<{
  phase: number;
  variant: 'primary' | 'amber' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Host panel is dt.modalBg, which darkens at phase 2 (see dtHostDark). */
  hostDark?: boolean;
}> = ({ phase, variant, onPress, disabled = false, accessibilityLabel, style, children, hostDark = false }) => {
  const skin = getPixelSkin(phase, hostDark);
  const reducedMotion = getSettingsSync().reducedMotion;
  const travel = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);
  const buttonSkin = skin.buttons[variant === 'secondary' ? 'secondary' : 'primary'].md;
  const handlePressIn = useCallback(() => {
    setPressed(true);
    if (reducedMotion) return;
    Animated.timing(travel, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  }, [travel, reducedMotion]);
  const handlePressOut = useCallback(() => {
    setPressed(false);
    if (reducedMotion) return;
    Animated.spring(travel, { toValue: 0, ...getPressSpring(phase), useNativeDriver: true }).start();
  }, [travel, phase, reducedMotion]);
  const translateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SURFACE.pressTravel],
  });
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.bevelStrip, disabled && styles.bevelDisabled, style]}
    >
      <ThreeSliceStrip skin={pressed ? buttonSkin.down : buttonSkin.up} capDp={BTN_CAP_DP} />
      <Animated.View style={[styles.bevelContent, { transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayPuzzle,
  onStartDaily,
  onRecheckDailyStanding,
  onAmberChange,
  onOpenSettings,
  onOpenStats,
  onOpenLedger,
  onOpenGallery,
  onOpenShop,
  onOpenStore,
  onOpenPit,
  pitPhaseReady,
  onboardingStep,
  onAdvanceOnboarding,
  initialHousePanY = null,
  onHousePanChange,
  onHouseCompleted,
}) => {
  const screenInsets = useScreenInsets();
  const isOnboarding = onboardingStep !== undefined && onboardingStep !== 'complete';
  const [progress, setProgress] = useState<HomeWorldProgress | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);

  // Decoration shop state

  // Intro dialogue state
  const [showIntroDialogue, setShowIntroDialogue] = useState(false);
  const [introAnimal, setIntroAnimal] = useState<Animal | null>(null);
  const [introDialogueIndex, setIntroDialogueIndex] = useState(0);
  const [introOverrideLines, setIntroOverrideLines] = useState<string[] | null>(null);
  const [introContext, setIntroContext] = useState<'animal_intro' | 'challenge_intro' | 'pit_nudge' | 'daily_challenge_intro' | 'gated_room_intro' | 'harvest_gate_intro' | 'harvest_heavy_nudge'>('animal_intro');
  // Once-per-session guard for the gentle "your pit is getting heavy" nudge.
  const heavyHarvestNudgeShownRef = useRef(false);
  // Journal spotlight intro state
  const [journalSpotlightActive, setJournalSpotlightActive] = useState(false);
  const [journalSpotlightIndex, setJournalSpotlightIndex] = useState(0);
  const [journalSpotlightLines, setJournalSpotlightLines] = useState<string[]>([]);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;
  const playPulse = useRef(new Animated.Value(0)).current;
  const introDialogueSlide = useRef(new Animated.Value(0)).current;
  const [highlightPlayButton, setHighlightPlayButton] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // House completion ceremony state
  const [showHouseCompletion, setShowHouseCompletion] = useState(false);
  const [houseCompletionTextIndex, setHouseCompletionTextIndex] = useState(0);

  // Sacrifice modal state (Phase 4+)
  const [showSacrificeModal, setShowSacrificeModal] = useState(false);
  const [sacrificeMessage, setSacrificeMessage] = useState<string | null>(null);

  // Pending harvest summary for pit badge
  const [pendingHarvest, setPendingHarvest] = useState<HarvestSummary | null>(null);

  // Weekly quest hub
  const [weeklyQuestState, setWeeklyQuestState] = useState<CombinedQuestState | null>(null);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);
  const [questTab, setQuestTab] = useState<'daily' | 'weekly'>('daily');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Ambient home line (atmospheric text when idle)
  const [ambientLine, setAmbientLine] = useState<string | null>(null);
  const ambientOpacity = useRef(new Animated.Value(0)).current;
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  // Bounds the home_empty onboarding recovery reloads (see safety-net effect).
  const homeEmptyRecoveryAttemptsRef = useRef(0);

  // Goal suggestion (contextual next-action hint)

  // Room upgrades
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Record<string, number>>({});
  const [purchasedDeepenings, setPurchasedDeepenings] = useState<Record<string, number>>({});
  const [tendingLevel, setTendingLevel] = useState(0);
  const [upgradeFeedback, setUpgradeFeedback] = useState<string | null>(null);

  // Dialogue flow hook
  const dialogueFlow = useDialogueFlow({
    progress,
    setAnimals,
    onFoxPlayPrompt: () => setHighlightPlayButton(true),
  });

  // loadAllData reference for unlock hook (defined below, stable via useCallback)
  const loadAllDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Unlock flow hook
  const unlockFlow = useUnlockFlow({
    progress,
    animals,
    onAmberChange,
    loadAllData: () => loadAllDataRef.current(),
    setShowCelebration,
    setIntroAnimal,
    setIntroDialogueIndex,
    setShowIntroDialogue,
    // A newly unlocked character's intro must open on a clean slate — if a
    // one-time HomeScreen intro (Reserve explainer etc.) raced into the shared
    // intro state during the unlock delay, its override script would otherwise
    // play under the new animal's portrait.
    resetIntroOverrides: () => {
      setIntroOverrideLines(null);
      setIntroContext('animal_intro');
    },
  });

  // Load all data from storage
  const loadAllData = useCallback(async () => {
    // Claim any reserved unlock whose level gate has opened BEFORE reading rooms,
    // so the freshly-built room is included below and a celebration fires.
    const claimed = await claimReservedUnlockIfReady();

    const [progressData, roomsData, animalsData] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
    ]);

    if (claimed) {
      setShowCelebration(true);
    }

    // Update puzzle count for dialogue session system
    updatePuzzleCount(progressData.puzzlesSolved);

    setProgress(progressData);
    setRooms(roomsData);
    setAnimals(animalsData);

    // Check for house completion (all 10 rooms + all 10 animals unlocked)
    if (!progressData.houseCompleted) {
      const allRoomsUnlocked = roomsData.filter(r => r.isUnlocked).length >= 10;
      const allAnimalsUnlocked = animalsData.filter(a => a.isUnlocked).length >= 10;
      if (allRoomsUnlocked && allAnimalsUnlocked) {
        await markHouseCompleted();
        if (onHouseCompleted) {
          // App plays the full HOUSE_COMPLETION_EVENT cinematic over the home scene.
          onHouseCompleted();
        } else {
          // Fallback (e.g. in isolation/tests): the inline completion modal.
          setShowHouseCompletion(true);
          setHouseCompletionTextIndex(0);
        }
      }
    }

    // Refresh unlock data with fresh arrays (avoids stale state)
    await unlockFlow.refreshUnlockData(roomsData, animalsData);

    // Load pending harvest for pit badge
    const harvestSummary = await getPendingHarvestSummary();
    setPendingHarvest(harvestSummary);

    const unlockedAnimalCount = animalsData.filter(a => a.isUnlocked).length;
    const questState = await loadWeeklyQuests(progressData.currentPhase, {
      puzzlesSolved: progressData.puzzlesSolved,
      unlockedAnimalCount,
      dailyUnlocked: false,
      challengeUnlocked: (progressData.puzzlesSolved ?? 0) >= 15,
      unlockedVariants: getUnlockedVariants(progressData.puzzlesSolved ?? 0, progressData.currentPhase ?? 0),
    });
    setWeeklyQuestState(questState);

    // Load room upgrades (tier 1) + deepenings (tier 2)
    const upgrades = await getPurchasedUpgrades();
    setPurchasedUpgrades(upgrades);
    setPurchasedDeepenings(await getDeepenedRooms());

    // Phase-5 Tending Level — drives the visual "deepening" of the house sigils.
    setTendingLevel(await getTendingLevel());
  }, [unlockFlow.refreshUnlockData, onHouseCompleted]);

  // Keep the ref in sync
  loadAllDataRef.current = loadAllData;

  const claimableQuestAmber = useMemo(() => {
    if (!weeklyQuestState || !progress) return 0;
    return getUnclaimedAmber(weeklyQuestState, progress.currentPhase);
  }, [weeklyQuestState, progress]);

  // ONE count for every quest surface (header pill + Journal Hub row), so the
  // two can never drift apart again. Re-derives whenever weeklyQuestState is
  // replaced (mount load, modal open, and immediately after every claim).
  const actionableQuestCount = useMemo(
    () => getActionableQuestCount(weeklyQuestState),
    [weeklyQuestState]
  );

  // Short "resets in N hours" hint for the quest pill accessibility label.
  const dailyResetHint = useMemo(() => {
    const { hours, minutes } = getTimeUntilDailyReset();
    return hours > 0 ? `${hours} hours` : `${minutes} minutes`;
  }, []);

  const availableRoomUpgrades = useMemo(() => {
    if (!progress) return [];
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const upgrade = getRoomUpgrade(room.id);
        if (!upgrade || purchasedUpgrades[room.id]) return null;
        return { room, upgrade };
      })
      .filter((entry): entry is { room: Room; upgrade: NonNullable<ReturnType<typeof getRoomUpgrade>> } => entry !== null);
  }, [rooms, purchasedUpgrades, progress]);

  // Tier-2 "deepenings": a room is eligible once its tier-1 decoration is in
  // place and the deepening hasn't been bought. Opens at Phase 2 to fill the
  // ~puzzle 65–135 mid-game spend valley (continuous with tier-1 decorations).
  const availableRoomDeepenings = useMemo(() => {
    if (!progress) return [];
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const deepening = getRoomDeepening(room.id);
        if (!deepening) return null;
        if (!purchasedUpgrades[room.id]) return null; // tier-1 required first
        if (purchasedDeepenings[room.id]) return null;
        return { room, deepening };
      })
      .filter((entry): entry is { room: Room; deepening: NonNullable<ReturnType<typeof getRoomDeepening>> } => entry !== null);
  }, [rooms, purchasedUpgrades, purchasedDeepenings, progress]);

  const isPostTutorialLightMode = useMemo(() => {
    if (!progress || isOnboarding) return false;
    return progress.puzzlesSolved <= 5;
  }, [progress, isOnboarding]);

  const shouldShowJournalButton = Boolean(
    !isOnboarding &&
    !isPostTutorialLightMode &&
    (onOpenLedger || onOpenGallery || weeklyQuestState)
  );

  // Header quest pill — same gate as the Journal Hub; puts quests one tap away.
  const showQuestPill = isQuestPillVisible(
    isOnboarding,
    isPostTutorialLightMode,
    weeklyQuestState !== null
  );

  // The pit no longer has a header button — the physical pit entrance below
  // the house is the route to the Offering Pit. The attention state the header
  // badge used to carry (pending harvest batches / a pending phase transition)
  // now flows into HouseWorld so the in-world entrance can glow instead.
  const pitNeedsAttention = Boolean(
    (pendingHarvest && pendingHarvest.pendingBatches > 0) || pitPhaseReady
  );

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadDialogueSessions(); // Load session data
  }, []);

  // Onboarding: auto-show invite prompt when data is loaded during home_empty step
  useEffect(() => {
    if (onboardingStep === 'home_empty' && progress && unlockFlow.nextUnlock) {
      // Automatically show the invite prompt for Fox
      if (unlockFlow.nextUnlock.type === 'character' && unlockFlow.nextUnlock.cost === 0) {
        unlockFlow.setShowInvitePrompt(true);
      }
    }
  }, [onboardingStep, progress, unlockFlow.nextUnlock]);

  // Onboarding safety net: home_empty is the single most fragile moment in the
  // funnel — the FoxGuide has no Continue button, so the ONLY way forward is the
  // invite prompt appearing. If data is slow or `nextUnlock` never resolves to
  // the free Fox invite, a new player stalls on a dead home screen and bounces.
  // After a short delay, self-heal: reload data (re-evaluates the invite) when
  // the unlock hasn't resolved, or force-show the invite when it has. The effect
  // re-runs as state changes, retrying until recovered (capped to avoid a
  // pathological reload loop on a genuinely corrupt install).
  useEffect(() => {
    if (onboardingStep !== 'home_empty') return;
    // Already in a good state — invite is up with valid data.
    if (unlockFlow.showInvitePrompt && unlockFlow.nextUnlock) return;
    const t = setTimeout(() => {
      const next = unlockFlow.nextUnlock;
      if (next && next.type === 'character' && next.cost === 0) {
        unlockFlow.setShowInvitePrompt(true);
      } else if (homeEmptyRecoveryAttemptsRef.current < 5) {
        // Unlock data hasn't resolved (or isn't the free invite yet) — reload.
        homeEmptyRecoveryAttemptsRef.current += 1;
        loadAllData();
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [onboardingStep, unlockFlow.showInvitePrompt, unlockFlow.nextUnlock]);

  // Challenge Mode intro (one-time, Fox-led, after 15 puzzles).
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if ((progress.puzzlesSolved || 0) < 15) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeenChallengeIntro();
      if (seen || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getChallengeIntroLines(progress.currentPhase));
      setIntroContext('challenge_intro');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    progress?.puzzlesSolved,
    progress?.currentPhase,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // Daily Challenge intro (one-time, Fox-led, when the daily card first unlocks).
  // Celebrates the unlock so the new card isn't discovered silently.
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if (!isDailyChallengeUnlocked(progress.puzzlesSolved, progress.currentPhase)) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeenDailyChallengeIntro();
      if (seen || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getDailyChallengeIntroLines(progress.currentPhase));
      setIntroContext('daily_challenge_intro');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    progress?.puzzlesSolved,
    progress?.currentPhase,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // Pit transition Fox nudge (one-time per pending transition)
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if (!pitPhaseReady) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeenPitNudge();
      if (seen || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      // Determine which phase transition is pending (currentPhase + 1)
      const targetPhase = Math.min(4, progress.currentPhase + 1) as 1 | 2 | 3 | 4;

      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getFoxPitNudgeLines(targetPhase));
      setIntroContext('pit_nudge');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    pitPhaseReady,
    progress?.currentPhase,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // Journal intro (one-time, Fox-led spotlight, when journal becomes available)
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if (!shouldShowJournalButton || journalSpotlightActive) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeenJournalIntro();
      if (seen || cancelled) return;

      const lines = getJournalIntroLines(progress.currentPhase);
      setShowJournalModal(true);
      setJournalSpotlightLines(lines);
      setJournalSpotlightIndex(0);
      setJournalSpotlightActive(true);
    })();

    return () => { cancelled = true; };
  }, [
    shouldShowJournalButton,
    progress?.currentPhase,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    journalSpotlightActive,
  ]);

  // First-gate lore intro (one-time, Fox-led): the first time a level-gated
  // room blocks the player (the Jungle Hammock, by default), Fox explains the
  // wait in-world and points at Reserve / Skip. Fires while the gate is actually
  // blocking (below the room's minPuzzles), so a fast player who blew past the
  // gate gets no needless explanation.
  //
  // It fires whether the player is idling on home OR has already opened the
  // room's unlock modal (the intro dialogue renders on top of it, so dismissing
  // reveals the Reserve/Skip buttons underneath). This is deliberate: the
  // blocking window can be brief — a player who unlocks the prior animal, then
  // immediately taps the gated room and reserves/skips it, would otherwise never
  // get a clean render with the modal closed, and the intro would be skipped.
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    const nu = unlockFlow.nextUnlock;
    if (!nu || nu.type !== 'room' || nu.minPuzzles === undefined) return;
    if ((progress.puzzlesSolved || 0) >= nu.minPuzzles) return; // gate already open — no wall
    // Fire only once the player can actually AFFORD to reserve the gated room —
    // Reserve/Skip advice is noise before it's actionable, and firing at the
    // moment the gate first appears collided with the just-unlocked animal's
    // own intro (the previous animal in the progression unlocks seconds before
    // the gated room becomes next).
    if ((progress.amber ?? 0) < nu.cost) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeenGatedUnlockIntro();
      if (seen || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getGatedRoomIntroLines(progress.currentPhase, nu.name));
      setIntroContext('gated_room_intro');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    unlockFlow.nextUnlock,
    unlockFlow.showRoomUnlock,
    progress?.puzzlesSolved,
    progress?.currentPhase,
    progress?.amber,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // First-harvest home safety net (one-time): the victory-modal gate is the
  // primary teacher, but if the player reaches home past the auto-collect
  // window with batches waiting and the pit still unlearned (gate interrupted
  // by a kill / back press / link), Fox explains the pit once from here. The
  // learned flag itself is only set by a real manual offer at the pit, so the
  // victory gate keeps re-arming either way.
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if ((progress.puzzlesSolved || 0) <= AUTO_COLLECT_PUZZLE_LIMIT) return;
    if (!pendingHarvest || pendingHarvest.pendingBatches <= 0) return;

    let cancelled = false;
    (async () => {
      const learned = await hasSeenMandatoryHarvest();
      if (learned || cancelled) return;
      const introSeen = await hasSeenHarvestHomeIntro();
      if (introSeen || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getHarvestHomeIntroLines(progress.currentPhase));
      setIntroContext('harvest_gate_intro');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    progress?.puzzlesSolved,
    progress?.currentPhase,
    pendingHarvest,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // Gentle heavy-pit nudge (once per app session): when a big pile of amber
  // sits unoffered, Fox mentions it once. The pit-entrance glow remains the
  // ambient signal; this is a soft reminder, never a gate. Suppressed while a
  // phase transition is pending (the pit_nudge intro owns that moment) and
  // until the pit has been learned (the safety net above owns teaching).
  useEffect(() => {
    if (!progress || isOnboarding || showIntroDialogue || introOverrideLines) return;
    if (heavyHarvestNudgeShownRef.current) return;
    if (pitPhaseReady) return;
    if ((progress.puzzlesSolved || 0) <= AUTO_COLLECT_PUZZLE_LIMIT) return;
    if (!pendingHarvest || pendingHarvest.pendingAmber < HARVEST_NUDGE_MIN_AMBER) return;

    let cancelled = false;
    (async () => {
      const learned = await hasSeenMandatoryHarvest();
      if (!learned || cancelled) return;

      const fox = animals.find(a => a.id === 'fox') || ANIMALS.find(a => a.id === 'fox') || null;
      if (!fox) return;

      heavyHarvestNudgeShownRef.current = true;
      setIntroAnimal(fox);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(getHarvestNudgeLine(progress.currentPhase, pendingHarvest.pendingAmber));
      setIntroContext('harvest_heavy_nudge');
      setShowIntroDialogue(true);
    })();

    return () => { cancelled = true; };
  }, [
    progress?.puzzlesSolved,
    progress?.currentPhase,
    pendingHarvest,
    pitPhaseReady,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

  // Ambient home line — atmospheric text when no dialogue is active
  // Fades in, holds for 5s, then fades out to avoid persistent visual clutter.
  useEffect(() => {
    if (isOnboarding || !progress || isPostTutorialLightMode) return;
    if (showIntroDialogue || dialogueFlow.showDialogue) {
      setAmbientLine(null);
      ambientOpacity.setValue(0);
      if (ambientAnimRef.current) { ambientAnimRef.current.stop(); ambientAnimRef.current = null; }
      if (ambientTimerRef.current) { clearTimeout(ambientTimerRef.current); ambientTimerRef.current = null; }
      return;
    }

    const line = getHomeAmbientLine(progress.currentPhase);
    setAmbientLine(line);

    const { reducedMotion } = getSettingsSync();
    if (reducedMotion) {
      ambientOpacity.setValue(1);
      ambientTimerRef.current = setTimeout(() => {
        ambientOpacity.setValue(0);
        setAmbientLine(null);
      }, 5000);
    } else {
      ambientOpacity.setValue(0);
      const fadeIn = Animated.timing(ambientOpacity, { toValue: 1, duration: 600, useNativeDriver: true });
      ambientAnimRef.current = fadeIn;
      fadeIn.start(({ finished }) => {
        if (!finished) return; // Animation was stopped by cleanup — don't start orphaned timer
        ambientAnimRef.current = null;
        ambientTimerRef.current = setTimeout(() => {
          const fadeOut = Animated.timing(ambientOpacity, { toValue: 0, duration: 800, useNativeDriver: true });
          ambientAnimRef.current = fadeOut;
          fadeOut.start(({ finished: fadeOutFinished }) => {
            if (!fadeOutFinished) return; // Animation was stopped by cleanup
            ambientAnimRef.current = null;
            setAmbientLine(null);
          });
        }, 5000);
      });
    }

    return () => {
      if (ambientAnimRef.current) { ambientAnimRef.current.stop(); ambientAnimRef.current = null; }
      if (ambientTimerRef.current) { clearTimeout(ambientTimerRef.current); ambientTimerRef.current = null; }
    };
  }, [
    isOnboarding,
    isPostTutorialLightMode,
    progress?.currentPhase,
    showIntroDialogue,
    dialogueFlow.showDialogue,
  ]);


  // Talking animation for intro dialogue
  const [introIsTalking, setIntroIsTalking] = useState(false);
  useEffect(() => {
    if (showIntroDialogue) {
      // Slower mouth-flap cadence on low-end devices
      const interval = setInterval(() => {
        setIntroIsTalking(prev => !prev);
      }, shouldSimplifyAnimations() ? 600 : 300);
      return () => clearInterval(interval);
    } else {
      setIntroIsTalking(false);
    }
  }, [showIntroDialogue]);

  // Slide animation for intro dialogue (matches normal dialogue)
  useEffect(() => {
    if (showIntroDialogue) {
      introDialogueSlide.setValue(0);
      const settings = getSettingsSync();
      if (settings.reducedMotion) {
        introDialogueSlide.setValue(1);
      } else {
        Animated.spring(introDialogueSlide, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [showIntroDialogue, introDialogueSlide]);

  // Animate amber when it changes
  useEffect(() => {
    if (progress) {
      Animated.sequence([
        Animated.timing(amberPulse, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(amberPulse, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [progress?.amber]);

  // Highlight pulse for the PLAY button when Fox nudges the player onward.
  useEffect(() => {
    if (!highlightPlayButton) {
      playPulse.setValue(0);
      return;
    }

    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      playPulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(playPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(playPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [highlightPlayButton, playPulse]);

  // Handle advancing intro dialogue
  const handleAdvanceIntroDialogue = async () => {
    if (!introAnimal || !progress) return;

    const totalIntro = introOverrideLines
      ? introOverrideLines.length
      : shouldUseCatchup()
        ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
        : getIntroDialogueCount(introAnimal.type);
    const nextIndex = introDialogueIndex + 1;

    if (nextIndex < totalIntro) {
      // More intro lines to show
      setIntroDialogueIndex(nextIndex);
    } else {
      // Intro complete - mark as seen and close
      if (introContext === 'challenge_intro') {
        await markChallengeIntroSeen();
      } else if (introContext === 'pit_nudge') {
        await markPitNudgeSeen();
      } else if (introContext === 'daily_challenge_intro') {
        await markDailyChallengeIntroSeen();
      } else if (introContext === 'gated_room_intro') {
        await markGatedUnlockIntroSeen();
      } else if (introContext === 'harvest_gate_intro') {
        await markHarvestHomeIntroSeen();
      } else if (introContext === 'harvest_heavy_nudge') {
        // Session-scoped (heavyHarvestNudgeShownRef) — nothing to persist.
      } else {
        await markIntroSeen(introAnimal.id);
      }
      setShowIntroDialogue(false);
      setIntroAnimal(null);
      setIntroDialogueIndex(0);
      setIntroOverrideLines(null);
      setIntroContext('animal_intro');
    }
  };

  // Handle closing intro dialogue
  const handleCloseIntroDialogue = async () => {
    if (introAnimal) {
      // Mark intros as seen even if closed early so the player isn't forced repeatedly.
      if (introContext === 'challenge_intro') {
        await markChallengeIntroSeen();
      } else if (introContext === 'pit_nudge') {
        await markPitNudgeSeen();
      } else if (introContext === 'daily_challenge_intro') {
        await markDailyChallengeIntroSeen();
      } else if (introContext === 'gated_room_intro') {
        await markGatedUnlockIntroSeen();
      } else if (introContext === 'harvest_gate_intro') {
        await markHarvestHomeIntroSeen();
      } else if (introContext === 'harvest_heavy_nudge') {
        // Session-scoped (heavyHarvestNudgeShownRef) — nothing to persist.
      } else {
        await markIntroSeen(introAnimal.id);
      }
    }
    setShowIntroDialogue(false);
    setIntroAnimal(null);
    setIntroDialogueIndex(0);
    setIntroOverrideLines(null);
    setIntroContext('animal_intro');
  };

  const handleOpenQuestModal = useCallback(async () => {
    hapticLight();
    if (progress) {
      const refreshed = await loadWeeklyQuests(progress.currentPhase, {
        puzzlesSolved: progress.puzzlesSolved,
        unlockedAnimalCount: animals.filter(a => a.isUnlocked).length,
        dailyUnlocked: false,
        challengeUnlocked: (progress.puzzlesSolved ?? 0) >= 15,
        unlockedVariants: getUnlockedVariants(progress.puzzlesSolved ?? 0, progress.currentPhase ?? 0),
      });
      setWeeklyQuestState(refreshed);
    }
    setQuestFeedback(null);
    setShowQuestModal(true);
  }, [progress, animals]);

  const handleClaimQuest = useCallback(async (questId: string) => {
    if (!progress) return;
    const reward = await claimQuestReward(questId, progress.currentPhase);
    if (!reward) return;

    const newBalance = await awardBonusAmber(reward.amber, 'quest_reward');
    onAmberChange?.(newBalance);
    setProgress(prev => prev ? { ...prev, amber: newBalance } : prev);
    setQuestFeedback(`Claimed +${reward.amber} amber!`);
    logEvent({ type: 'quest_reward_claimed', data: { questId, amber: reward.amber } });

    const refreshed = await loadWeeklyQuests(progress.currentPhase, {
      puzzlesSolved: progress.puzzlesSolved,
      unlockedAnimalCount: animals.filter(a => a.isUnlocked).length,
      dailyUnlocked: false,
      challengeUnlocked: (progress.puzzlesSolved ?? 0) >= 15,
    });
    // loadWeeklyQuests returns the module-level cache objects that
    // claimQuestReward mutated IN PLACE — the same references this component
    // already holds in state. Clone every level so the pill/journal counts
    // (and anything memoized on tier or quest identity) re-derive from the
    // post-claim state immediately, not from a stale snapshot.
    setWeeklyQuestState({
      daily: { ...refreshed.daily, quests: refreshed.daily.quests.map(q => ({ ...q })) },
      weekly: { ...refreshed.weekly, quests: refreshed.weekly.quests.map(q => ({ ...q })) },
    });
  }, [progress, onAmberChange, animals]);

  const handlePurchaseUpgrade = useCallback(async (roomId: string) => {
    if (!progress) return;
    const upgrade = getRoomUpgrade(roomId);
    if (!upgrade) return;

    const spendResult = await spendAmber(upgrade.cost, `room_upgrade_${roomId}`);
    if (!spendResult.success) {
      setUpgradeFeedback('Not enough amber for that room upgrade yet.');
      return;
    }

    const purchased = await purchaseRoomUpgrade(roomId);
    if (!purchased) {
      setUpgradeFeedback('That upgrade is already in place.');
      return;
    }

    onAmberChange?.(spendResult.newBalance);
    setUpgradeFeedback(`${upgrade.name} added to ${rooms.find(r => r.id === roomId)?.name || 'the room'}.`);
    logEvent({ type: 'room_upgrade_purchased', data: { roomId, cost: upgrade.cost } });
    await loadAllData();
  }, [progress, onAmberChange, rooms, loadAllData]);

  const handlePurchaseDeepening = useCallback(async (roomId: string) => {
    if (!progress) return;
    const deepening = getRoomDeepening(roomId);
    if (!deepening) return;

    const spendResult = await spendAmber(deepening.cost, `room_deepening_${roomId}`);
    if (!spendResult.success) {
      setUpgradeFeedback('Not enough amber for that yet.');
      return;
    }

    const purchased = await purchaseRoomDeepening(roomId);
    if (!purchased) {
      setUpgradeFeedback('That change is already in place.');
      return;
    }

    onAmberChange?.(spendResult.newBalance);
    setUpgradeFeedback(`${deepening.name} settles into ${rooms.find(r => r.id === roomId)?.name || 'the room'}.`);
    logEvent({ type: 'room_upgrade_purchased', data: { roomId, cost: deepening.cost, tier: 2 } });
    await loadAllData();
  }, [progress, onAmberChange, rooms, loadAllData]);

  const handleOpenJournal = useCallback(() => {
    hapticLight();
    setShowJournalModal(true);
  }, []);

  const handleOpenUtilityMenu = useCallback(() => {
    hapticLight();
    setShowUtilityModal(true);
  }, []);

  // Determine if catch-up dialogues should be used (animal unlocked at Phase 2+)
  const shouldUseCatchup = (): boolean => {
    if (!introAnimal || !progress) return false;
    if (introOverrideLines) return false;
    return getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase) > 0;
  };

  // Get current intro dialogue text (uses catch-up dialogues at Phase 2+)
  const getCurrentIntroText = (): string => {
    if (!introAnimal || !progress) return '';
    if (introOverrideLines) {
      return introOverrideLines[introDialogueIndex] || '';
    }
    if (shouldUseCatchup()) {
      return getCatchupIntroDialogue(introAnimal.type, progress.currentPhase, introDialogueIndex) || '';
    }
    return getIntroDialogueLine(introAnimal.type, introDialogueIndex) || '';
  };

  // Check if there are more intro dialogues
  const hasMoreIntroDialogues = (): boolean => {
    if (!introAnimal || !progress) return false;
    const total = introOverrideLines
      ? introOverrideLines.length
      : shouldUseCatchup()
        ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
        : getIntroDialogueCount(introAnimal.type);
    return introDialogueIndex + 1 < total;
  };

  const isStreakAtRisk = useMemo(() => {
    if (!progress || !progress.currentStreak || progress.currentStreak <= 0) return false;
    const last = progress.lastPlayDate;
    if (!last) return false;
    const today = getLocalDateString();
    if (last === today) return false;
    return daysAgoLocal(last) >= 1;
  }, [progress?.currentStreak, progress?.lastPlayDate]);

  const currentPhase = progress?.currentPhase ?? 0;
  const journalSpotlightStepMeta = useMemo(
    () => getJournalSpotlightSteps(currentPhase, getGalleryTitle(currentPhase)),
    [currentPhase]
  );
  const journalSpotlightPreviewCards = useMemo(
    () => journalSpotlightStepMeta.filter(step => step.showInPreview),
    [journalSpotlightStepMeta]
  );

  if (!progress || rooms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Animated.View style={{ transform: [{ scale: amberPulse }] }}>
            <Text style={styles.loadingEmoji}>🏡</Text>
          </Animated.View>
          <Text style={styles.loadingText}>Loading your home...</Text>
          <Text style={styles.loadingSubtext}>Placing rooms and waking friends.</Text>
        </View>
      </View>
    );
  }

  // Sampled from the sky assets' top rows (sampleSkyTops scratch script) so the
  // screen background meets the sky PNG without a seam — keep in sync with
  // HouseWorld/appStyles; re-sample if the sky assets regenerate.
  const phaseBgColor = {
    0: '#439cf2', 1: '#1583f9', 2: '#684381', 3: '#000212', 4: '#050816', 5: '#050816',
  }[progress.currentPhase] || '#439cf2';

  // Phase-aware dialogue theme for all modals and dialogue boxes
  const dt = getDialogueTheme(progress.currentPhase);
  // Phase-aware surface theme (feel kit) for modal chrome: rows, buttons, scrims
  const st = getSurfaceTheme(progress.currentPhase);
  // The home modals host their content on dt.modalBg, and the dialogue theme
  // darkens at phase 2 — one phase BEFORE the surface theme. hostDark tells
  // every kit component on those panels to use dark-surface tokens at phase 2
  // so nothing renders dark-on-dark or as a glaring light island; panelSt is
  // the same mapping for direct token reads (text/fills placed straight on
  // the panel).
  const dtHostDark = progress.currentPhase >= 2;
  const panelSt = getSurfaceTheme(progress.currentPhase === 2 ? 3 : progress.currentPhase);
  // Cottage pixel skin for the home modal chrome (same hostDark mapping).
  const pixelSkin = getPixelSkin(progress.currentPhase, dtHostDark);
  const phaseTheme = getPhaseTheme(progress.currentPhase);
  const currentJournalSpotlightStep = journalSpotlightStepMeta[
    Math.max(0, Math.min(journalSpotlightIndex, journalSpotlightStepMeta.length - 1))
  ];

  return (
    <View style={[styles.container, { backgroundColor: phaseBgColor }]}>
      {/* Header — ONE row so the world stays dominant. Left cluster: amber
          pill (tap → store) + streak badge; the pill is the only shrinkable
          item (numberOfLines={1} truncation), so nothing can overlap. Right
          cluster: fixed-size actions in order daily (📅) / quests (🎯) /
          journal (📚) / utility menu (☰). There is NO pit button up here —
          the physical pit entrance below the house is the route to the
          Offering Pit. PLAY lives in the bottom-center dock over the world
          (rendered after the house stage). During onboarding only amber +
          streak render;
          the ☰ menu shows whenever onboarding is over (including the
          post-tutorial light mode, so Settings is always reachable).
          Width budget at 360dp (10dp side padding → 340 inner), worst case
          all unlocked: daily 42 + quest ≤54 + journal 38 + ☰ 38 + 3×6 gaps
          = 190; 340 − 190 − 8 cluster gap = 142 for amber + streak (streak
          ≈50 fixed → amber pill ≥84dp before truncating). Early game the
          right cluster is just ☰ (38), leaving ~294dp. */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeftCluster}>
            <TouchableOpacity
              style={styles.amberContainer}
              disabled={!onOpenStore || isOnboarding}
              onPress={() => {
                hapticLight();
                onOpenStore?.();
              }}
              activeOpacity={0.7}
              accessibilityLabel={
                onOpenStore && !isOnboarding
                  ? `${progress.amber} amber. Opens the store.`
                  : `${progress.amber} amber`
              }
              accessibilityRole={onOpenStore && !isOnboarding ? 'button' : undefined}
            >
              <View style={styles.amberInner}>
                <Animated.View style={{ transform: [{ scale: amberPulse }] }}>
                  <Image source={AMBER_ICON} style={styles.amberIconImage} />
                </Animated.View>
                <Text style={styles.amberCount} numberOfLines={1}>{progress.amber}</Text>
                {!isOnboarding && <AmberSparkle />}
              </View>
            </TouchableOpacity>
            {(progress.currentStreak > 1 || isStreakAtRisk) && (
              <View
                style={[styles.streakBadge, isStreakAtRisk && styles.streakAtRiskBadge]}
                accessibilityLabel={`${progress.currentStreak} day streak${isStreakAtRisk ? ', at risk' : ''}`}
              >
                <Image source={FLAME_ICON} style={styles.streakBadgeIcon} />
                <Text style={[styles.streakBadgeCount, isStreakAtRisk && styles.streakAtRiskCount]}>
                  {progress.currentStreak}
                </Text>
              </View>
            )}
          </View>
          {!isOnboarding && (
            <View style={styles.headerRightCluster}>
              {onStartDaily &&
                isDailyChallengeUnlocked(progress.puzzlesSolved, progress.currentPhase) && (
                <DailyChallengeCard
                  onStartDaily={onStartDaily}
                  onRecheckStanding={onRecheckDailyStanding}
                  phase={progress.currentPhase}
                  refreshSignal={progress.puzzlesSolved}
                />
              )}
              {showQuestPill && (
                <TouchableOpacity
                  style={styles.questPill}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => { handleOpenQuestModal().catch(() => {}); }}
                  accessibilityLabel={getQuestPillAccessibilityLabel(
                    actionableQuestCount,
                    claimableQuestAmber,
                    dailyResetHint
                  )}
                  accessibilityRole="button"
                >
                  <Text style={styles.questPillText}>{getQuestPillLabel(actionableQuestCount)}</Text>
                  {claimableQuestAmber > 0 && (
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {shouldShowJournalButton && (
                <TouchableOpacity
                  style={[
                    styles.headerIconBtn,
                    journalSpotlightActive && styles.journalSpotlightIcon,
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={journalSpotlightActive ? async () => {
                    // Spotlight: tapping icon advances to journal modal
                    await markJournalIntroSeen();
                    setJournalSpotlightActive(false);
                    setShowJournalModal(true);
                  } : handleOpenJournal}
                  accessibilityLabel={journalSpotlightActive ? 'Tap to open journal' : `Open journal${claimableQuestAmber > 0 ? `, ${claimableQuestAmber} amber ready in quests` : ''}`}
                  accessibilityRole="button"
                >
                  <Image source={JOURNAL_ICON} style={styles.headerIconImage} />
                  {!journalSpotlightActive && claimableQuestAmber > 0 && (
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={handleOpenUtilityMenu}
                accessibilityLabel="Open utility menu"
                accessibilityRole="button"
              >
                <Text style={styles.headerIconText}>☰</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.houseStage}>
        {/* House World */}
        <HouseWorld
          rooms={rooms}
          animals={animals}
          currentPhase={progress.currentPhase}
          onAnimalPress={dialogueFlow.handleAnimalTap}
          onRoomPress={unlockFlow.handleRoomPress}
          ritualWords={progress.ritualWords}
          nextUnlock={unlockFlow.nextUnlock}
          amberBalance={progress.amber}
          purchasedUpgrades={purchasedUpgrades}
          tendingLevel={tendingLevel}
          savedPanY={initialHousePanY}
          onPanYChange={onHousePanChange}
          pitNeedsAttention={pitNeedsAttention}
          onPitPress={!isOnboarding && onOpenPit ? () => {
            hapticLight();
            onOpenPit();
          } : undefined}
        />

        <View style={styles.homeOverlayColumn} pointerEvents="box-none">
          {/* Next Unlock Progress Bar (hidden during early onboarding, shown during unlock_explained) */}
          {unlockFlow.nextUnlock && (!isOnboarding || onboardingStep === 'unlock_explained') && (
            <TouchableOpacity
              style={styles.unlockProgressContainer}
              activeOpacity={0.85}
              onPress={() => {
                hapticLight();
                setUpgradeFeedback(null);
                unlockFlow.setShowShop(true);
              }}
              accessibilityLabel={`Next unlock. ${unlockFlow.nextUnlock.cost === 0 ? 'Free' : `${progress.amber} of ${unlockFlow.nextUnlock.cost} amber`}`}
              accessibilityRole="button"
              accessibilityValue={{
                min: 0,
                max: unlockFlow.nextUnlock.cost || 1,
                now: Math.min(progress.amber, unlockFlow.nextUnlock.cost || 1),
              }}
            >
              {/* Wooden sign — cottage card frame over the outdoor world. */}
              <NineSliceFrame
                skin={getPixelSkin(progress.currentPhase).card}
                cornerDp={CARD_CORNER_DP}
                edgeDp={CARD_EDGE_DP}
                fillColor={getPixelSkin(progress.currentPhase).fillCard}
              />
              <View style={styles.unlockProgressInner}>
                <Text style={[styles.unlockProgressLabel, { color: st.title }]}>
                  Next Unlock
                </Text>
                <View style={[styles.unlockProgressBarBg, { backgroundColor: st.sectionBorder }]}>
                  <View
                    style={[
                      styles.unlockProgressBarFill,
                      { backgroundColor: st.pillBg },
                      {
                        width: `${Math.min(100, unlockFlow.nextUnlock.cost > 0
                          ? (progress.amber / unlockFlow.nextUnlock.cost) * 100
                          : 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.unlockProgressText, { color: st.body }]}>
                  {unlockFlow.nextUnlock.cost === 0
                    ? 'FREE'
                    : <><AmberInline /> {progress.amber} / {unlockFlow.nextUnlock.cost}</>}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Ambient home line — atmospheric whisper when idle (auto-dismiss
              with fade). Deliberately BOXLESS (player feedback: a framed sign
              here stacked awkwardly under the Next Unlock signage): cream ink
              with a soft warm shadow reads over every phase's sky art. */}
          {ambientLine && !isOnboarding && (
            <Animated.View style={[styles.ambientLineContainer, { opacity: ambientOpacity }]} pointerEvents="none">
              <Text style={styles.ambientLineText}>
                {ambientLine}
              </Text>
            </Animated.View>
          )}

        </View>

        {/* Celebration Confetti */}
        {showCelebration && (
          <CelebrationConfetti onComplete={() => setShowCelebration(false)} />
        )}
      </View>

      {/* PLAY dock — the primary action, docked bottom-center over the world.
          Shown exactly when the old header PLAY was (never during onboarding).
          The world's own pan slack (inside HouseWorld) lets the pit entrance
          scroll clear of the dock. */}
      {!isOnboarding && (
        <Animated.View
          style={[
            styles.playDock,
            { bottom: screenInsets.bottom + 12 },
            highlightPlayButton && {
              transform: [{
                scale: playPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              }],
            },
          ]}
        >
          <JuicyButton
            style={[styles.playButton, highlightPlayButton && styles.playButtonHighlighted]}
            onPress={() => {
              hapticSelection();
              setHighlightPlayButton(false);
              onPlayPuzzle();
            }}
            bounceScale={0.9}
            accessibilityLabel="Play puzzle"
            accessibilityRole="button"
          >
            {/* Inner top gloss — the candy-tile glass sheen (see LetterTile's
                glossyShine). Purely decorative; never intercepts touches. */}
            <View style={styles.playButtonGloss} pointerEvents="none" />
            <Text style={styles.playButtonText}>PLAY</Text>
          </JuicyButton>
        </Animated.View>
      )}

      {/* Cooldown Message Toast */}
      {Boolean(dialogueFlow.cooldownMessage) && (
        <Animated.View
          style={[
            styles.cooldownToast,
            {
              backgroundColor: dt.cooldownBg,
              borderColor: dt.cooldownBorder,
              opacity: dialogueFlow.cooldownOpacity,
              transform: [{ translateY: dialogueFlow.cooldownSlide }],
            },
          ]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityLabel={dialogueFlow.cooldownMessage ?? undefined}
        >
          <Text style={styles.cooldownToastText}>{dialogueFlow.cooldownMessage}</Text>
        </Animated.View>
      )}

      {/* Dialogue Modal */}
      <Modal
        visible={dialogueFlow.showDialogue}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={dialogueFlow.handleCloseDialogue}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}
          activeOpacity={1}
          onPress={dialogueFlow.handleCloseDialogue}
          accessibilityLabel="Close dialogue"
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              styles.dialogueModal,
              {
                shadowColor: dt.modalShadowColor,
                transform: [
                  {
                    translateY: dialogueFlow.dialogueSlide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
                opacity: dialogueFlow.dialogueSlide,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Cottage wood-and-parchment sheet (openBottom: flush to the
                screen edge). Replaces the flat webby card + accent line. */}
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />

            {dialogueFlow.selectedAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column — the zoomed portrait sits on the parchment
                    (transparent bg); a slim accent rail marks the alcove. */}
                <View style={styles.dialogueSpriteCol}>
                  <View style={[styles.dialogueSpriteRail, { backgroundColor: pixelSkin.accent }]} />
                  {CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type] ? (
                    <Image
                      source={
                        progress.currentPhase >= 4 && CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]?.robed
                          ? CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.robed!
                          : dialogueFlow.isTalking && CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]?.talk
                            ? CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.talk!
                            : CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.idle
                      }
                      style={[
                        styles.dialogueSpriteImage,
                        dialogueFlow.isTalking && styles.dialogueSpriteTalking,
                      ]}
                      resizeMode="cover"
                      accessibilityLabel={`${dialogueFlow.selectedAnimal.name} portrait`}
                    />
                  ) : (
                    <Text style={styles.dialogueSpriteEmoji}>
                      {ANIMAL_INFO[dialogueFlow.selectedAnimal.type]?.emoji || '🐾'}
                    </Text>
                  )}
                  {/* Name as a portrait nameplate BELOW the sprite (reclaims the
                      wasted header space; the bubble now starts at the top). */}
                  <Text
                    numberOfLines={1}
                    style={[styles.dialogueAnimalName, { color: dt.nameColor }]}
                  >
                    {dialogueFlow.selectedAnimal.name}
                  </Text>
                  <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />
                </View>

                {/* Text column - 70% width */}
                <View style={styles.dialogueTextCol}>
                  <View style={styles.dialogueBubble}>
                    <NineSliceFrame
                      skin={pixelSkin.card}
                      cornerDp={CARD_CORNER_DP}
                      edgeDp={CARD_EDGE_DP}
                      fillColor={pixelSkin.fillCard}
                    />
                    <Text style={[styles.dialogueText, { color: panelSt.body }]}>{dialogueFlow.dialogueText}</Text>
                  </View>

                  {/* Dialogue choice buttons (Phase 3 choice points) */}
                  {dialogueFlow.activeChoice && dialogueFlow.dialogueText === dialogueFlow.activeChoice.prompt ? (
                    <View style={styles.dialogueChoiceRow}>
                      <TouchableOpacity
                        style={styles.dialogueChoiceBtn}
                        onPress={() => dialogueFlow.handleDialogueChoice('ask')}
                        accessibilityLabel={dialogueFlow.activeChoice.options.ask}
                        accessibilityRole="button"
                      >
                        <NineSliceFrame
                          skin={pixelSkin.card}
                          cornerDp={CARD_CORNER_DP}
                          edgeDp={CARD_EDGE_DP}
                          fillColor={pixelSkin.fillCard}
                        />
                        <Text style={[styles.dialogueChoiceBtnText, { color: panelSt.body }]}>
                          {dialogueFlow.activeChoice.options.ask}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dialogueChoiceBtn}
                        onPress={() => dialogueFlow.handleDialogueChoice('refuse')}
                        accessibilityLabel={dialogueFlow.activeChoice.options.refuse}
                        accessibilityRole="button"
                      >
                        <NineSliceFrame
                          skin={pixelSkin.card}
                          cornerDp={CARD_CORNER_DP}
                          edgeDp={CARD_EDGE_DP}
                          fillColor={pixelSkin.fillCard}
                        />
                        <Text style={[styles.dialogueChoiceBtnText, { color: panelSt.body }]}>
                          {dialogueFlow.activeChoice.options.refuse}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                  <View style={styles.dialogueFooter}>
                    <BevelRowButton
                      phase={progress.currentPhase}
                      variant="primary"
                      hostDark={dtHostDark}
                      onPress={dialogueFlow.handleNextDialogue}
                      accessibilityLabel="Continue dialogue"
                      style={styles.dialogueContinueBevel}
                    >
                      <Text style={[styles.continueButtonText, { color: pixelSkin.ink.primary }]}>
                        {dialogueFlow.hasMoreToShow ? 'Next' : 'Close'}
                      </Text>
                    </BevelRowButton>
                  </View>
                  )}
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Journal Hub Modal */}
      <Modal
        visible={showJournalModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => { if (!journalSpotlightActive) setShowJournalModal(false); }}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: journalSpotlightActive ? 'transparent' : st.overlay }]}
          activeOpacity={1}
          onPress={() => { if (!journalSpotlightActive) setShowJournalModal(false); }}
          accessibilityLabel="Close journal"
          accessibilityRole="button"
        >
          <SpringIn
            claimTouches
            style={styles.compactHubModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            <PixelPlaque
              phase={progress.currentPhase}
              hostDark={dtHostDark}
              label="Journal"
              style={styles.modalPlaque}
            />
            <Text style={[styles.shopSubtitle, { color: panelSt.muted }]}>
              Keep the house&apos;s records in one place.
            </Text>
            {onOpenLedger && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                icon={JOURNAL_ICON}
                label="Word Ledger"
                onPress={() => {
                  setShowJournalModal(false);
                  onOpenLedger?.();
                }}
                accessibilityLabel="Open Word Ledger"
              />
            )}
            {onOpenGallery && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                icon={FLAME_ICON}
                label={getGalleryTitle(progress.currentPhase)}
                onPress={() => {
                  setShowJournalModal(false);
                  onOpenGallery?.();
                }}
                accessibilityLabel="Open Whisper Gallery"
              />
            )}
            {!!weeklyQuestState && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                label={getJournalQuestLabel(actionableQuestCount, claimableQuestAmber)}
                onPress={() => {
                  setShowJournalModal(false);
                  handleOpenQuestModal().catch(() => {});
                }}
                accessibilityLabel={`Open quests${claimableQuestAmber > 0 ? `, ${claimableQuestAmber} amber ready` : ''}`}
              />
            )}
          </SpringIn>
        </TouchableOpacity>
      </Modal>

      {/* Utility Hub Modal */}
      <Modal
        visible={showUtilityModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowUtilityModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: st.overlay }]}
          activeOpacity={1}
          onPress={() => setShowUtilityModal(false)}
          accessibilityLabel="Close utility menu"
          accessibilityRole="button"
        >
          <SpringIn
            claimTouches
            style={styles.compactHubModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            <PixelPlaque
              phase={progress.currentPhase}
              hostDark={dtHostDark}
              label="Menu"
              style={styles.modalPlaque}
            />
            <Text style={[styles.shopSubtitle, { color: panelSt.muted }]}>
              Everything else can stay tucked away until you need it.
            </Text>
            {onOpenStats && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                icon={STAR_ICON}
                label="Statistics"
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenStats?.();
                }}
                accessibilityLabel="Open statistics"
              />
            )}
            {onOpenShop && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                label={`✨ ${getShopTitle(progress.currentPhase)}`}
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenShop?.();
                }}
                accessibilityLabel={`Open ${getShopTitle(progress.currentPhase)}`}
              />
            )}
            {onOpenStore && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                icon={AMBER_ICON}
                label="Store"
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenStore?.();
                }}
                accessibilityLabel="Open store"
              />
            )}
            <HubRow
              phase={progress.currentPhase}
                hostDark={dtHostDark}
              icon={HINT_ICON}
              label="How to Play"
              onPress={() => {
                setShowUtilityModal(false);
                setShowRulesModal(true);
              }}
              accessibilityLabel="How to play"
            />
            {onOpenSettings && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                label="⚙️ Settings"
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenSettings?.();
                }}
                accessibilityLabel="Open settings"
              />
            )}
            {isSacrificeAvailable(progress.currentPhase) && (
              <HubRow
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                icon={FLAME_ICON}
                label={getSacrificePrompt(progress.currentPhase).title}
                onPress={() => {
                  setShowUtilityModal(false);
                  setShowSacrificeModal(true);
                }}
                accessibilityLabel="Open sacrifice"
              />
            )}
          </SpringIn>
        </TouchableOpacity>
      </Modal>

      {/* How to Play — phase-aware rules recap, reachable any time from home */}
      <RulesModal
        visible={showRulesModal}
        phase={progress.currentPhase}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Shop Modal */}
      <Modal
        visible={unlockFlow.showShop}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowShop(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: st.overlay }]}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowShop(false)}
          accessibilityLabel="Close shop"
          accessibilityRole="button"
        >
          <SpringIn
            claimTouches
            style={styles.shopModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            <Text style={[styles.shopTitle, { color: panelSt.title }]}>Unlock Progress</Text>
            <Text style={[styles.shopSubtitle, { color: panelSt.muted }]}>
              Your Amber: <AmberInline /> {progress.amber}
            </Text>
            {upgradeFeedback && (
              <Text style={[styles.shopFeedbackText, { color: panelSt.title }]}>
                {upgradeFeedback}
              </Text>
            )}

            {/* Next unlock */}
            {unlockFlow.nextUnlock && (
              <View style={styles.nextUnlockContainer}>
                <Text style={[styles.nextUnlockLabel, { color: panelSt.muted }]}>Next Unlock:</Text>
                <PanelCard phase={progress.currentPhase} hostDark={dtHostDark} kind="card" style={styles.unlockItem}>
                  <View style={styles.unlockInfo}>
                    <Text style={[styles.unlockName, { color: panelSt.body }]}>{unlockFlow.nextUnlock.name}</Text>
                    <Text style={[styles.unlockDescription, { color: panelSt.muted }]}>
                      {unlockFlow.nextUnlock.type === 'room'
                        ? getRoomDescription(unlockFlow.nextUnlock.targetId, progress.currentPhase)
                        : unlockFlow.nextUnlock.description}
                    </Text>
                    <Text style={[styles.unlockCost, { color: panelSt.amberText }]}>
                      <AmberInline /> {unlockFlow.nextUnlock.cost} amber
                    </Text>
                    {unlockFlow.reservedUnlockId === unlockFlow.nextUnlock.id ? (
                      <Text style={[styles.unlockBlockedText, { color: panelSt.muted }]}>
                        {getReservedArrivalText(unlockFlow.nextUnlock.minPuzzles, progress.puzzlesSolved)}
                      </Text>
                    ) : unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available ? (
                      <Text style={[styles.unlockBlockedText, { color: panelSt.muted }]}>
                        {unlockFlow.canReserve && unlockFlow.nextUnlock.minPuzzles
                          ? `${getReserveGateText(unlockFlow.nextUnlock.minPuzzles, progress.puzzlesSolved)}. Reserve it now and it builds itself then`
                          : unlockFlow.unlockAvailability.reason}
                      </Text>
                    ) : null}
                  </View>
                  {unlockFlow.reservedUnlockId === unlockFlow.nextUnlock.id ? (
                    unlockFlow.canSpeedUpReserved ? (
                      <CandyButton
                        label="Speed up"
                        variant="amber"
                        phase={progress.currentPhase}
                hostDark={dtHostDark}
                        style={styles.rowAction}
                        onPress={() => unlockFlow.handleSpeedUpReserved(unlockFlow.nextUnlock!)}
                        accessibilityLabel={`Speed up ${unlockFlow.nextUnlock.name} and unlock now for ${unlockFlow.reservedSkipCost} amber`}
                      />
                    ) : (
                      <View style={[styles.reservedChip, { backgroundColor: panelSt.secondaryBg, borderColor: panelSt.secondaryBorder }]}>
                        <Text style={[styles.reservedChipText, { color: panelSt.secondaryText }]}>Reserved ✓</Text>
                      </View>
                    )
                  ) : unlockFlow.canReserve ? (
                    <CandyButton
                      label="Reserve"
                      variant="secondary"
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      style={styles.rowAction}
                      onPress={() => unlockFlow.handleReserve(unlockFlow.nextUnlock!)}
                      accessibilityLabel={`Reserve ${unlockFlow.nextUnlock.name} for ${unlockFlow.nextUnlock.cost} amber; it builds at level ${unlockFlow.nextUnlock.minPuzzles}, you're at ${progress.puzzlesSolved}`}
                    />
                  ) : (
                    <CandyButton
                      label={
                        unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available
                          ? 'Locked'
                          : progress.amber >= unlockFlow.nextUnlock.cost
                            ? 'Unlock'
                            : 'Need More'
                      }
                      variant="primary"
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      style={styles.rowAction}
                      onPress={() => unlockFlow.handlePurchase(unlockFlow.nextUnlock!)}
                      disabled={
                        progress.amber < unlockFlow.nextUnlock.cost ||
                        (unlockFlow.unlockAvailability !== null && !unlockFlow.unlockAvailability.available)
                      }
                      accessibilityLabel={`Unlock ${unlockFlow.nextUnlock.name} for ${unlockFlow.nextUnlock.cost} amber`}
                    />
                  )}
                </PanelCard>
              </View>
            )}

            {!unlockFlow.nextUnlock && (
              <View>
                <Text style={[styles.allUnlockedText, { color: panelSt.amberText }]}>
                  All characters and rooms unlocked!
                </Text>
              </View>
            )}

            {areUpgradesAvailable(progress.currentPhase) && (
              <View style={styles.upgradeSection}>
                <Text style={[styles.nextUnlockLabel, { color: panelSt.muted }]}>Room Upgrades</Text>
                {availableRoomUpgrades.length === 0 ? (
                  <Text style={[styles.unlockDescription, { color: panelSt.muted }]}>
                    Every unlocked room already has its decorative upgrade.
                  </Text>
                ) : (
                  availableRoomUpgrades.slice(0, 4).map(({ room, upgrade }) => (
                    <PanelCard
                      key={room.id}
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      kind="card"
                      style={StyleSheet.flatten([styles.unlockItem, styles.upgradeItem])}
                    >
                      <View style={styles.unlockInfo}>
                        <Text style={[styles.unlockName, { color: panelSt.body }]}>{room.name}: {upgrade.name}</Text>
                        <Text style={[styles.unlockDescription, { color: panelSt.muted }]}>
                          {getUpgradeDescription(room.id, progress.currentPhase)}
                        </Text>
                        <Text style={[styles.unlockCost, { color: panelSt.amberText }]}><AmberInline /> {upgrade.cost} amber</Text>
                      </View>
                      <CandyButton
                        label={progress.amber >= upgrade.cost ? 'Decorate' : 'Need More'}
                        variant="amber"
                        phase={progress.currentPhase}
                hostDark={dtHostDark}
                        style={styles.rowAction}
                        onPress={() => {
                          handlePurchaseUpgrade(room.id).catch(() => {});
                        }}
                        disabled={progress.amber < upgrade.cost}
                        accessibilityLabel={`Upgrade ${room.name} with ${upgrade.name} for ${upgrade.cost} amber`}
                      />
                    </PanelCard>
                  ))
                )}
              </View>
            )}

            {areDeepeningsAvailable(progress.currentPhase) && availableRoomDeepenings.length > 0 && (
              <View style={styles.upgradeSection}>
                <Text style={[styles.nextUnlockLabel, { color: panelSt.muted }]}>The House Deepens</Text>
                {availableRoomDeepenings.slice(0, 4).map(({ room, deepening }) => (
                  <PanelCard
                    key={`deepen_${room.id}`}
                    phase={progress.currentPhase}
                hostDark={dtHostDark}
                    kind="card"
                    style={StyleSheet.flatten([styles.unlockItem, styles.upgradeItem])}
                  >
                    <View style={styles.unlockInfo}>
                      <Text style={[styles.unlockName, { color: panelSt.body }]}>{room.name}: {deepening.name}</Text>
                      <Text style={[styles.unlockDescription, { color: panelSt.muted }]}>
                        {deepening.description}
                      </Text>
                      <Text style={[styles.unlockCost, { color: panelSt.amberText }]}><AmberInline /> {deepening.cost} amber</Text>
                    </View>
                    <CandyButton
                      label={progress.amber >= deepening.cost ? 'Deepen' : 'Need More'}
                      variant="amber"
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      style={styles.rowAction}
                      onPress={() => {
                        handlePurchaseDeepening(room.id).catch(() => {});
                      }}
                      disabled={progress.amber < deepening.cost}
                      accessibilityLabel={`Deepen ${room.name} with ${deepening.name} for ${deepening.cost} amber`}
                    />
                  </PanelCard>
                ))}
              </View>
            )}

            {/* Close button */}
            <CandyButton
              label="Close"
              variant="quiet"
              phase={progress.currentPhase}
                hostDark={dtHostDark}
              style={styles.closeAction}
              onPress={() => unlockFlow.setShowShop(false)}
              accessibilityLabel="Close shop"
            />
          </SpringIn>
        </TouchableOpacity>
      </Modal>

      {/* Quest Modal (Daily + Weekly) */}
      <Modal
        visible={showQuestModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowQuestModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: st.overlay }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowQuestModal(false)}
            accessibilityLabel="Close quests"
            accessibilityRole="button"
          />
          <SpringIn
            style={[styles.shopModal, styles.questModal]}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            <PixelPlaque
              phase={progress.currentPhase}
              hostDark={dtHostDark}
              label="Quests"
              style={styles.modalPlaque}
            />
            {questFeedback && (
              <Text style={[styles.shopFeedbackText, { color: panelSt.title }]}>
                {questFeedback}
              </Text>
            )}
            {/* Tab Bar — framed segmented chips */}
            <View style={[styles.questTabBar, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}>
              <TouchableOpacity
                style={[
                  styles.questTab,
                  questTab === 'daily' && { backgroundColor: panelSt.secondaryBg, borderColor: panelSt.secondaryBorder },
                ]}
                onPress={() => setQuestTab('daily')}
                accessibilityLabel="Daily quests tab"
                accessibilityRole="tab"
              >
                <Text style={[styles.questTabText, { color: questTab === 'daily' ? panelSt.title : panelSt.muted }]}>Daily</Text>
                <Text style={[styles.questTabTimer, { color: panelSt.muted }]}>
                  {getTimeUntilDailyReset().hours}h {getTimeUntilDailyReset().minutes}m
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.questTab,
                  questTab === 'weekly' && { backgroundColor: panelSt.secondaryBg, borderColor: panelSt.secondaryBorder },
                ]}
                onPress={() => setQuestTab('weekly')}
                accessibilityLabel="Weekly quests tab"
                accessibilityRole="tab"
              >
                <Text style={[styles.questTabText, { color: questTab === 'weekly' ? panelSt.title : panelSt.muted }]}>Weekly</Text>
                <Text style={[styles.questTabTimer, { color: panelSt.muted }]}>
                  {getTimeUntilReset().days}d {getTimeUntilReset().hours}h
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.questList}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.questListContent}
            >
              {(questTab === 'daily' ? weeklyQuestState?.daily?.quests : weeklyQuestState?.weekly?.quests)?.map(quest => {
                const questPct = quest.completed
                  ? 100
                  : Math.max(0, Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100)));
                return (
                  <PanelCard
                    key={quest.id}
                    phase={progress.currentPhase}
                hostDark={dtHostDark}
                    kind="card"
                    style={StyleSheet.flatten([styles.unlockItem, styles.questItem])}
                  >
                    <View style={styles.unlockInfo}>
                      <Text style={[styles.unlockName, { color: panelSt.body }]}>{quest.title}</Text>
                      <Text style={[styles.unlockDescription, { color: panelSt.muted }]}>
                        {getQuestDescription(quest, progress.currentPhase)}
                      </Text>
                      <Text style={[styles.questProgressText, { color: panelSt.amberText }]}>
                        {quest.completed ? 'Complete' : `${quest.progress} / ${quest.target}`}
                      </Text>
                      <View style={[styles.questBarTrack, { backgroundColor: panelSt.amberTint, borderColor: panelSt.amberTintBorder }]}>
                        <View
                          style={[
                            styles.questBarFill,
                            { backgroundColor: panelSt.amberText, width: `${questPct}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <CandyButton
                      label={
                        quest.claimed
                          ? 'Claimed'
                          : quest.completed
                            ? `Claim +${Math.round(quest.rewardAmber * getPhaseRewardMultiplier(progress.currentPhase))}`
                            : 'In Progress'
                      }
                      variant="amber"
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      style={styles.rowAction}
                      onPress={() => {
                        handleClaimQuest(quest.id).catch(() => {});
                      }}
                      disabled={!quest.completed || quest.claimed}
                      accessibilityLabel={
                        quest.claimed
                          ? `${quest.title} already claimed`
                          : quest.completed
                            ? `Claim ${quest.rewardAmber} amber from ${quest.title}`
                            : `${quest.title} in progress`
                      }
                    />
                  </PanelCard>
                );
              })}
            </ScrollView>
            <CandyButton
              label="Close"
              variant="quiet"
              phase={progress.currentPhase}
                hostDark={dtHostDark}
              style={styles.closeAction}
              onPress={() => setShowQuestModal(false)}
              accessibilityLabel="Close quests"
            />
          </SpringIn>
        </View>
      </Modal>

      {/* Room Unlock Modal */}
      <Modal
        visible={unlockFlow.showRoomUnlock !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowRoomUnlock(null)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: st.overlay }]}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowRoomUnlock(null)}
          accessibilityLabel="Close room unlock"
          accessibilityRole="button"
        >
          <SpringIn
            claimTouches
            style={styles.shopModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            {unlockFlow.showRoomUnlock && (
              <>
                <View style={[styles.lockBadge, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}>
                  <Text style={styles.lockBadgeEmoji}>🔒</Text>
                </View>
                <PixelPlaque
                  phase={progress.currentPhase}
                  hostDark={dtHostDark}
                  label="Locked Room"
                  style={styles.modalPlaque}
                />
                <Text style={[styles.lockedRoomName, { color: panelSt.body }]}>{unlockFlow.showRoomUnlock.name}</Text>
                <Text style={[styles.shopSubtitle, { color: panelSt.muted }]}>
                  Play more puzzles to earn amber and unlock this room!
                </Text>
                <Text style={[styles.amberBalance, { color: panelSt.amberText }]}>Your Amber: <AmberInline /> {progress.amber}</Text>

                {unlockFlow.purchaseError && (
                  <Text style={[styles.shopSubtitle, { color: panelSt.dangerText, marginTop: 8, fontWeight: '600' }]}>
                    {unlockFlow.purchaseError}
                  </Text>
                )}

                {unlockFlow.nextUnlock && unlockFlow.nextUnlock.targetId === unlockFlow.showRoomUnlock.id && (() => {
                  const isReserved = unlockFlow.reservedUnlockId === unlockFlow.nextUnlock.id;
                  const isGated = unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available
                    && unlockFlow.unlockAvailability.reason && !unlockFlow.unlockAvailability.reason.startsWith('Already');
                  const cantAfford = progress.amber < unlockFlow.nextUnlock.cost;
                  const isDisabled = cantAfford || !!isGated;
                  // Reserved: paid, awaiting its level gate — offer to speed it
                  // up (pay the remaining premium, unlock now) if affordable.
                  if (isReserved) {
                    return (
                      <>
                        <Text style={[styles.shopSubtitle, { color: panelSt.title, marginTop: 8, fontWeight: '700' }]}>
                          {getReservedArrivalText(unlockFlow.nextUnlock.minPuzzles, progress.puzzlesSolved)}
                        </Text>
                        {unlockFlow.canSpeedUpReserved && (
                          <BevelRowButton
                            phase={progress.currentPhase}
                hostDark={dtHostDark}
                            variant="amber"
                            style={styles.largeAction}
                            onPress={() => unlockFlow.handleSpeedUpReserved(unlockFlow.nextUnlock!)}
                            accessibilityLabel={`Speed up ${unlockFlow.nextUnlock!.name} and unlock now for ${unlockFlow.reservedSkipCost} amber`}
                          >
                            <Text style={[styles.bevelBtnText, { color: pixelSkin.ink.primary }]}>
                              Speed it up for <AmberInline /> {unlockFlow.reservedSkipCost}
                            </Text>
                          </BevelRowButton>
                        )}
                      </>
                    );
                  }
                  // Gated but affordable: offer to reserve (pay now, auto-builds)
                  // and — if the premium is affordable — to skip the wait entirely.
                  if (unlockFlow.canReserve) {
                    return (
                      <>
                        <Text style={[styles.shopSubtitle, { color: panelSt.muted, marginTop: 8, fontStyle: 'italic' }]}>
                          {getReserveGateText(unlockFlow.nextUnlock.minPuzzles, progress.puzzlesSolved)}. Reserve it now and it builds itself the moment you get there.
                        </Text>
                        <BevelRowButton
                          phase={progress.currentPhase}
                hostDark={dtHostDark}
                          variant="secondary"
                          style={styles.largeAction}
                          onPress={() => unlockFlow.handleReserve(unlockFlow.nextUnlock!)}
                          accessibilityLabel={`Reserve room for ${unlockFlow.nextUnlock!.cost} amber; builds at level ${unlockFlow.nextUnlock!.minPuzzles}, you're at ${progress.puzzlesSolved}`}
                        >
                          <Text style={[styles.bevelBtnText, { color: pixelSkin.ink.secondary }]}>
                            Reserve for <AmberInline /> {unlockFlow.nextUnlock!.cost}
                          </Text>
                        </BevelRowButton>
                        {unlockFlow.canSkip && (
                          <BevelRowButton
                            phase={progress.currentPhase}
                hostDark={dtHostDark}
                            variant="amber"
                            style={styles.largeAction}
                            onPress={() => unlockFlow.handleSkip(unlockFlow.nextUnlock!)}
                            accessibilityLabel={`Skip the wait and unlock ${unlockFlow.nextUnlock!.name} now for ${unlockFlow.skipCost} amber`}
                          >
                            <Text style={[styles.bevelBtnText, { color: pixelSkin.ink.primary }]}>
                              Skip the wait for <AmberInline /> {unlockFlow.skipCost}
                            </Text>
                          </BevelRowButton>
                        )}
                      </>
                    );
                  }
                  return (
                    <>
                      {isGated && (
                        <Text style={[styles.shopSubtitle, { color: panelSt.muted, marginTop: 8, fontStyle: 'italic' }]}>
                          {unlockFlow.unlockAvailability!.reason}
                        </Text>
                      )}
                      <BevelRowButton
                        phase={progress.currentPhase}
                hostDark={dtHostDark}
                        variant="primary"
                        style={styles.largeAction}
                        onPress={() => unlockFlow.handlePurchase(unlockFlow.nextUnlock!)}
                        disabled={isDisabled}
                        accessibilityLabel={`Unlock room for ${unlockFlow.nextUnlock!.cost} amber`}
                      >
                        <Text style={[styles.bevelBtnText, { color: pixelSkin.ink.primary }]}>
                          Unlock for <AmberInline /> {unlockFlow.nextUnlock!.cost}
                        </Text>
                      </BevelRowButton>
                    </>
                  );
                })()}

                <CandyButton
                  label="Close"
                  variant="quiet"
                  phase={progress.currentPhase}
                hostDark={dtHostDark}
                  style={styles.closeAction}
                  onPress={() => unlockFlow.setShowRoomUnlock(null)}
                  accessibilityLabel="Close"
                />
              </>
            )}
          </SpringIn>
        </TouchableOpacity>
      </Modal>

      {/* Animal Invite Prompt */}
      <Modal
        visible={unlockFlow.showInvitePrompt}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowInvitePrompt(false)}
      >
        <View style={[styles.centeredOverlay, { backgroundColor: st.overlay }]}>
          <SpringIn
            claimTouches
            style={styles.inviteModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
            />
            {unlockFlow.nextUnlock && unlockFlow.nextUnlock.type === 'character' && (() => {
              const animalData = ANIMALS.find(a => a.id === unlockFlow.nextUnlock!.targetId);
              const animalEmoji = animalData ? ANIMAL_EMOJIS[animalData.type] : '🐾';
              const animalSprites = animalData ? CHARACTER_SPRITES[animalData.type] : undefined;
              const isFirstAnimal = progress?.unlockedAnimals.length === 0;

              return (
                <>
                  <View style={styles.inviteHeroWrap}>
                    <View pointerEvents="none" style={[styles.inviteHeroGlow, { backgroundColor: panelSt.glow }]} />
                    <View style={[styles.inviteHeroRing, { borderColor: panelSt.secondaryBorder, backgroundColor: panelSt.sectionBg }]}>
                      {animalSprites ? (
                        <Image
                          source={animalSprites.talk || animalSprites.idle}
                          style={styles.inviteSpriteImage}
                          resizeMode="contain"
                          accessibilityLabel={`${animalData?.type || 'animal'} portrait`}
                        />
                      ) : (
                        <Text style={styles.inviteEmoji}>{animalEmoji}</Text>
                      )}
                    </View>
                  </View>
                  <PixelPlaque
                    phase={progress.currentPhase}
                    hostDark={dtHostDark}
                    label={isFirstAnimal ? 'A Visitor Approaches!' : 'A New Friend!'}
                    style={styles.modalPlaque}
                  />
                  <Text style={[styles.inviteText, { color: panelSt.body }]}>
                    {unlockFlow.nextUnlock!.description}
                  </Text>
                  <Text style={[styles.inviteText, { color: panelSt.body }]}>
                    {isFirstAnimal
                      ? 'Would you like to invite them into your cozy den?'
                      : `Would you like to welcome ${unlockFlow.nextUnlock!.name.split(' ')[0]} to your growing home?`
                    }
                  </Text>

                  {unlockFlow.nextUnlock!.cost > 0 && (
                    <Text style={[styles.inviteCost, { color: panelSt.amberText }]}>
                      Cost: <AmberInline /> {unlockFlow.nextUnlock!.cost} amber
                    </Text>
                  )}

                  <CandyButton
                    label={
                      unlockFlow.nextUnlock!.cost === 0
                        ? 'Welcome, Friend! 🏠'
                        : progress && progress.amber >= unlockFlow.nextUnlock!.cost
                          ? `Invite ${unlockFlow.nextUnlock!.name.split(' ')[0]}! 🏠`
                          : 'Need More Amber'
                    }
                    variant="primary"
                    size="lg"
                    phase={progress ? progress.currentPhase : 0}
                    style={styles.inviteAction}
                    onPress={async () => {
                      const suppressIntro = onboardingStep === 'home_empty';
                      await unlockFlow.handlePurchase(unlockFlow.nextUnlock!, { suppressIntro });
                      unlockFlow.setShowInvitePrompt(false);
                      // During onboarding, advance to fox_invited step
                      // (skips the standard intro dialogue — FoxGuide handles it)
                      if (onboardingStep === 'home_empty' && onAdvanceOnboarding) {
                        await markIntroSeen('fox');
                        setShowIntroDialogue(false);
                        setIntroAnimal(null);
                        setIntroOverrideLines(null);
                        setIntroContext('animal_intro');
                        await onAdvanceOnboarding('fox_invited');
                      }
                    }}
                    disabled={progress ? progress.amber < unlockFlow.nextUnlock!.cost : false}
                    accessibilityLabel={unlockFlow.nextUnlock!.cost === 0 ? 'Welcome friend' : `Invite for ${unlockFlow.nextUnlock!.cost} amber`}
                  />

                  {/* Hide "Maybe Later" during onboarding — player must invite Fox */}
                  {!isOnboarding && (
                  <CandyButton
                    label="Maybe Later"
                    variant="quiet"
                    phase={progress ? progress.currentPhase : 0}
                    style={styles.inviteCloseAction}
                    onPress={() => unlockFlow.setShowInvitePrompt(false)}
                    accessibilityLabel="Maybe later"
                  />
                  )}
                </>
              );
            })()}
          </SpringIn>
        </View>
      </Modal>

      {/* Intro Dialogue Modal */}
      <Modal
        visible={showIntroDialogue}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={handleCloseIntroDialogue}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}
          activeOpacity={1}
          onPress={handleCloseIntroDialogue}
          accessibilityLabel="Close intro dialogue"
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              styles.dialogueModal,
              {
                shadowColor: dt.modalShadowColor,
                transform: [
                  {
                    translateY: introDialogueSlide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
                opacity: introDialogueSlide,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />

            {introAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column — zoomed portrait on the parchment. */}
                <View style={styles.dialogueSpriteCol}>
                  <View style={[styles.dialogueSpriteRail, { backgroundColor: pixelSkin.accent }]} />
                  {CHARACTER_SPRITES[introAnimal.type] ? (
                    <Image
                      source={
                        progress && progress.currentPhase >= 4 && CHARACTER_SPRITES[introAnimal.type]?.robed
                          ? CHARACTER_SPRITES[introAnimal.type]!.robed!
                          : introIsTalking && CHARACTER_SPRITES[introAnimal.type]?.talk
                            ? CHARACTER_SPRITES[introAnimal.type]!.talk!
                            : CHARACTER_SPRITES[introAnimal.type]!.idle
                      }
                      style={styles.dialogueSpriteImage}
                      resizeMode="cover"
                      accessibilityLabel={`${introAnimal.name} portrait`}
                    />
                  ) : (
                    <Text style={styles.dialogueSpriteEmoji}>
                      {ANIMAL_INFO[introAnimal.type]?.emoji || '🐾'}
                    </Text>
                  )}
                  {/* Name as a portrait nameplate BELOW the sprite (reclaims the
                      wasted header space; the bubble now starts at the top). */}
                  <Text
                    numberOfLines={1}
                    style={[styles.dialogueAnimalName, { color: dt.nameColor }]}
                  >
                    {introAnimal.name}
                  </Text>
                  <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />
                </View>

                {/* Text column - 70% width */}
                <View style={styles.dialogueTextCol}>
                  <View style={styles.dialogueBubble}>
                    <NineSliceFrame
                      skin={pixelSkin.card}
                      cornerDp={CARD_CORNER_DP}
                      edgeDp={CARD_EDGE_DP}
                      fillColor={pixelSkin.fillCard}
                    />
                    <Text style={[styles.dialogueText, { color: panelSt.body }]}>{getCurrentIntroText()}</Text>
                  </View>

                  <View style={styles.dialogueFooter}>
                    <BevelRowButton
                      phase={progress.currentPhase}
                      variant="primary"
                      hostDark={dtHostDark}
                      onPress={handleAdvanceIntroDialogue}
                      accessibilityLabel={hasMoreIntroDialogues() ? 'Continue intro' : 'Welcome and close'}
                      style={styles.dialogueContinueBevel}
                    >
                      <Text style={[styles.continueButtonText, { color: pixelSkin.ink.primary }]}>
                        {hasMoreIntroDialogues() ? 'Next' : 'Welcome!'}
                      </Text>
                    </BevelRowButton>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Sacrifice Modal (Phase 4+) */}
      <Modal
        visible={showSacrificeModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowSacrificeModal(false)}
      >
        <View style={[styles.centeredOverlay, { backgroundColor: st.overlay }]}>
          <SpringIn
            claimTouches
            style={styles.sacrificeModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
            />
            <Text style={styles.sacrificeEmoji}>🕯️</Text>
            <Text style={[styles.sacrificeTitle, { color: panelSt.title }]}>
              {getSacrificePrompt(progress.currentPhase).title}
            </Text>
            <Text style={[styles.sacrificeSubtitle, { color: panelSt.muted }]}>
              {getSacrificePrompt(progress.currentPhase).subtitle}
            </Text>
            <Text style={[styles.sacrificeBalance, { color: panelSt.body }]}>
              Your Amber: <AmberInline /> {progress.amber}
            </Text>

            {sacrificeMessage ? (
              <View style={[styles.sacrificeResponseBox, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}>
                <Text style={[styles.sacrificeResponseText, { color: panelSt.body }]}>
                  {sacrificeMessage}
                </Text>
                <CandyButton
                  label="Close"
                  variant="primary"
                  phase={progress.currentPhase}
                hostDark={dtHostDark}
                  style={styles.sacrificeCloseAction}
                  onPress={() => {
                    setSacrificeMessage(null);
                    setShowSacrificeModal(false);
                  }}
                />
              </View>
            ) : (
              <View style={styles.sacrificeAmounts}>
                {getSacrificeAmounts(progress.amber).map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.sacrificeAmountBtn, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}
                    onPress={async () => {
                      const spendResult = await spendAmber(amount, 'sacrifice');
                      if (!spendResult.success) return;
                      const result = await performSacrifice(amount, progress.currentPhase);
                      setProgress(prev => prev ? { ...prev, amber: spendResult.newBalance } : prev);
                      onAmberChange?.(spendResult.newBalance);
                      setSacrificeMessage(result.message);
                      // Track sacrifice for weekly quest progress
                      updateQuestProgress({ amberSacrificed: amount }, progress.currentPhase).catch(() => {});
                    }}
                    accessibilityLabel={`Offer ${amount} amber`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.sacrificeAmountText, { color: panelSt.body }]}>
                      <AmberInline /> {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
                {getSacrificeAmounts(progress.amber).length === 0 && (
                  <Text style={[styles.sacrificeNoAmber, { color: panelSt.muted }]}>
                    You don&apos;t have enough amber to offer.
                  </Text>
                )}
              </View>
            )}

            {!sacrificeMessage && (
              <CandyButton
                label="Not now"
                variant="quiet"
                phase={progress.currentPhase}
                hostDark={dtHostDark}
                style={styles.closeAction}
                onPress={() => setShowSacrificeModal(false)}
              />
            )}
          </SpringIn>
        </View>
      </Modal>

      {/* House Completion Ceremony Modal */}
      <Modal
        visible={showHouseCompletion}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowHouseCompletion(false)}
      >
        <View style={[styles.centeredOverlay, { backgroundColor: st.overlay }]}>
          <SpringIn
            claimTouches
            style={[
              styles.houseCompletionModal,
              progress.currentPhase >= 3 && styles.houseCompletionModalDark,
            ]}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
            />
            <View pointerEvents="none" style={[styles.houseCompletionGlow, { backgroundColor: panelSt.glow }]} />
            {(() => {
              const lines = getHouseCompletionText();
              return (
                <>
                  <Text style={styles.houseCompletionEmoji}>
                    {progress.currentPhase >= 4 ? '🌑' : '🏠'}
                  </Text>
                  <Text style={[
                    styles.houseCompletionTitle,
                    { color: panelSt.title },
                  ]}>
                    {progress.currentPhase >= 4 ? 'The Temple' : 'The House is Complete'}
                  </Text>
                  <Text style={[
                    styles.houseCompletionText,
                    { color: panelSt.body },
                  ]}>
                    {lines[houseCompletionTextIndex]}
                  </Text>
                  <View style={styles.introDialogueFooter}>
                    <Text style={[styles.introDialogueProgress, { color: panelSt.muted }]}>
                      {houseCompletionTextIndex + 1}/{lines.length}
                    </Text>
                    <CandyButton
                      label={houseCompletionTextIndex + 1 < lines.length ? 'Continue' : 'Close'}
                      variant="primary"
                      phase={progress.currentPhase}
                hostDark={dtHostDark}
                      onPress={() => {
                        if (houseCompletionTextIndex + 1 < lines.length) {
                          setHouseCompletionTextIndex(houseCompletionTextIndex + 1);
                        } else {
                          setShowHouseCompletion(false);
                        }
                      }}
                      accessibilityLabel={
                        houseCompletionTextIndex + 1 < lines.length ? 'Continue' : 'Close'
                      }
                    />
                  </View>
                </>
              );
            })()}
          </SpringIn>
        </View>
      </Modal>

      {/* Journal Spotlight Intro — Modal so it renders above the journal hub Modal */}
      <Modal
        visible={journalSpotlightActive && journalSpotlightLines.length > 0}
        transparent
        statusBarTranslucent
        animationType="none"
      >
        <View style={[styles.journalSpotlightBackdrop, { backgroundColor: dt.overlayBg }]}>
          <View style={[styles.journalSpotlightPanel, { shadowColor: dt.modalShadowColor }]}>
            {/* Cottage wood-and-parchment sheet (matches the Fox dialogue below
                and every other home sheet); replaces the old flat white panel. */}
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />

            <View style={styles.journalSpotlightHeroRow}>
              <View style={styles.journalSpotlightHeroBadge}>
                <NineSliceFrame
                  skin={pixelSkin.card}
                  cornerDp={CARD_CORNER_DP}
                  edgeDp={CARD_EDGE_DP}
                  fillColor={pixelSkin.fillCard}
                />
                <Text style={styles.journalSpotlightHeroBadgeText}>{currentJournalSpotlightStep.icon}</Text>
              </View>

              <View style={styles.journalSpotlightHeroText}>
                <Text style={[styles.journalSpotlightEyebrow, { color: panelSt.muted }]}>
                  {currentJournalSpotlightStep.eyebrow}
                </Text>
                <Text style={[styles.journalSpotlightTitle, { color: panelSt.title }]}>
                  {currentJournalSpotlightStep.title}
                </Text>
                <Text style={[styles.journalSpotlightSubtitle, { color: panelSt.muted }]}>
                  {currentJournalSpotlightStep.preview}
                </Text>
              </View>

              <Text style={[styles.journalSpotlightCounter, { color: panelSt.muted }]}>
                {journalSpotlightIndex + 1}/{journalSpotlightStepMeta.length}
              </Text>
            </View>

            <View style={styles.journalSpotlightCardGrid}>
              {journalSpotlightPreviewCards.map((step) => {
                const isActive = currentJournalSpotlightStep.id === step.id;
                return (
                  <View
                    key={step.id}
                    style={[
                      styles.journalSpotlightCard,
                      isActive && styles.journalSpotlightCardActive,
                    ]}
                  >
                    <NineSliceFrame
                      skin={pixelSkin.card}
                      cornerDp={CARD_CORNER_DP}
                      edgeDp={CARD_EDGE_DP}
                      fillColor={pixelSkin.fillCard}
                    />
                    <Text style={styles.journalSpotlightCardIcon}>{step.icon}</Text>
                    <Text
                      style={[
                        styles.journalSpotlightCardTitle,
                        { color: isActive ? panelSt.title : panelSt.body },
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={[styles.journalSpotlightCardIndex, { color: panelSt.muted }]}>
                      {step.cardLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.journalSpotlightDialogueRow}>
              {/* Portrait + name below it (reclaims the wasted header space;
                  the bubble now starts at the top of the text column). */}
              <View style={styles.journalSpotlightSpriteWrap}>
                <View
                  style={[
                    styles.journalSpotlightSpriteCol,
                    { backgroundColor: dt.spriteBg, borderColor: dt.bubbleBorder },
                  ]}
                >
                  {CHARACTER_SPRITES.fox ? (
                    <Image
                      source={CHARACTER_SPRITES.fox.talk || CHARACTER_SPRITES.fox.idle}
                      style={styles.journalSpotlightSpriteImage}
                      resizeMode="cover"
                      accessibilityLabel="Fox portrait"
                    />
                  ) : (
                    <Text style={styles.dialogueSpriteEmoji}>🦊</Text>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.journalSpotlightSpeaker, { color: dt.nameColor }]}>
                  {ANIMAL_INFO.fox?.name || 'Ember'}
                </Text>
                <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />
              </View>

              <View style={styles.journalSpotlightDialogueCol}>

                <View style={styles.journalSpotlightBubble}>
                  <NineSliceFrame
                    skin={pixelSkin.card}
                    cornerDp={CARD_CORNER_DP}
                    edgeDp={CARD_EDGE_DP}
                    fillColor={pixelSkin.fillCard}
                  />
                  <Text style={[styles.dialogueText, { color: panelSt.body }]}>
                    {journalSpotlightLines[journalSpotlightIndex]}
                  </Text>
                </View>

                <View style={styles.journalSpotlightFooter}>
                  <View style={styles.journalSpotlightProgressDots}>
                    {journalSpotlightLines.map((_, index) => {
                      const isActive = index === journalSpotlightIndex;
                      return (
                        <View
                          key={index}
                          style={[
                            styles.journalSpotlightDot,
                            {
                              backgroundColor: isActive ? dt.accentLine : dt.bubbleBorder,
                              opacity: isActive ? 1 : 0.6,
                              transform: [{ scale: isActive ? 1.1 : 1 }],
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <BevelRowButton
                    phase={progress.currentPhase}
                    variant="primary"
                    hostDark={dtHostDark}
                    onPress={journalSpotlightIndex < journalSpotlightLines.length - 1
                      ? () => setJournalSpotlightIndex(prev => prev + 1)
                      : async () => {
                          await markJournalIntroSeen();
                          setJournalSpotlightActive(false);
                        }
                    }
                    accessibilityLabel={journalSpotlightIndex < journalSpotlightLines.length - 1 ? 'Continue journal intro' : 'Close journal intro'}
                    style={styles.dialogueContinueBevel}
                  >
                    <Text style={[styles.continueButtonText, { color: pixelSkin.ink.primary }]}>
                      {journalSpotlightIndex < journalSpotlightLines.length - 1
                        ? 'Next'
                        : currentJournalSpotlightStep.finalCtaLabel}
                    </Text>
                  </BevelRowButton>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Phase-0 sky top-row color, sampled from the sky assets (sampleSkyTops
    // scratch script) — re-sample if sky assets regenerate.
    backgroundColor: '#439cf2',
  },
  houseStage: {
    flex: 1,
  },
  homeOverlayColumn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CandyColors.purple.main,
    paddingHorizontal: 20,
  },
  loadingCard: {
    minWidth: 240,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  loadingEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 34,
  },
  loadingText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  loadingSubtext: {
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Single-row header. Everything on the right is fixed-size and non-wrapping;
  // the amber pill is the only shrinkable item (numberOfLines={1} truncation),
  // so nothing can overlap at 360dp — worst case (daily 42 + quest ≤54 +
  // journal 38 + ☰ 38 + 3×6 gaps = 190) still leaves ≥134dp for amber+streak.
  header: {
    paddingHorizontal: 10,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  headerLeftCluster: {
    flex: 1,
    minWidth: 0, // let the amber pill truncate instead of pushing actions out
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  amberContainer: {
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  amberInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  amberEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 20,
  },
  amberCount: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255,165,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  streakAtRiskBadge: {
    backgroundColor: 'rgba(255,60,60,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.4)',
  },
  streakBadgeEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 14,
  },
  streakBadgeCount: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C00',
  },
  streakAtRiskCount: {
    color: '#FF3C3C',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compact on purpose (single line, no reset column) — a fixed-size item in
  // the actions row; the count caps at 10 so it never grows past ~54dp.
  questPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  questPillText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  headerBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: CandyColors.orange.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  headerIconText: {
    fontFamily: PIXEL_FONT,
    fontSize: 16,
  },
  headerIconImage: {
    width: 25,
    height: 25,
  },
  amberIconImage: {
    width: 22,
    height: 22,
  },
  streakBadgeIcon: {
    width: 15,
    height: 15,
  },
  // PLAY dock — bottom-center primary action floating over the world view.
  // `bottom` is applied inline (safe-area inset + 12). Above the world
  // (zIndex 60) but below the header (100) and toasts (1000).
  playDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 60,
  },
  // Candy-glass treatment (playtest: the flat green bar read as a web button).
  // Same recipe as the letter tiles: translucent body over the world, a light
  // top-edge rim + inner gloss for the glassy bevel, and a darker 4px bottom
  // edge for the tiles' "weighty base" (CandyColors.green.shadow, the tile
  // edge shade). Static styles only — the press/pulse springs stay in
  // JuicyButton on the native driver.
  playButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.88)', // green.main as glass
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.45)',    // green.light rim
    borderTopColor: 'rgba(255, 255, 255, 0.55)', // lit top edge
    borderBottomWidth: 4,
    borderBottomColor: CandyColors.green.shadow, // deep bottom edge (tile language)
    shadowColor: CandyColors.green.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonHighlighted: {
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    borderTopColor: CandyColors.yellow.light,
    borderBottomWidth: 4,
    borderBottomColor: CandyColors.yellow.dark,
    shadowColor: CandyColors.yellow.main,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 8,
  },
  // Inner top gloss (nested rounded View, like LetterTile's glossyShine) —
  // sells the candy-glass curve without any extra library or animation.
  playButtonGloss: {
    position: 'absolute',
    top: 4,
    left: 14,
    right: 14,
    height: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  playButtonText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },

  // Words Offered Counter (persistent on home screen)
  wordsOfferedHomeContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 4,
    zIndex: 10,
  },
  wordsOfferedHomeContainerDark: {
    backgroundColor: 'rgba(120, 30, 60, 0.2)',
  },
  wordsOfferedHomeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  wordsOfferedHomeTextDark: {
    color: 'rgba(180, 100, 130, 0.8)',
    fontStyle: 'italic',
  },

  // Unlock progress bar
  unlockProgressContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    // Cottage card frame background; clear its 12dp wood band.
    paddingHorizontal: 18,
    paddingVertical: 16,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockProgressInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  unlockProgressLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
  },
  unlockProgressText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Recessed wood trough (square pixel ends), amber fill.
  unlockProgressBarBg: {
    flex: 2,
    height: 10,
    overflow: 'hidden',
  },
  unlockProgressBarFill: {
    height: '100%',
  },

  // Modal styles — scrim color always comes from the phase theme inline
  // (st.overlay for feel-kit modals, dt.overlayBg for dialogue surfaces).
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centeredOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Dialogue modal — cottage wood-and-parchment sheet (NineSliceFrame panel
  // background, openBottom). No borderRadius/border/backgroundColor: the
  // pixel frame owns the edge. Content is inset to clear the 24dp wood band.
  dialogueModal: {
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    paddingTop: PANEL_EDGE_DP - 6,
    paddingLeft: PANEL_EDGE_DP - 8,
    paddingRight: PANEL_EDGE_DP - 12,
  },
  dialogueAccentLine: {
    height: 3,
    width: '100%',
  },
  dialogueRow: {
    flexDirection: 'row',
  },
  dialogueSpriteCol: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Slim accent rail on the sprite alcove's inner edge (replaces the old flat
  // accent line — carries the skin's second hue between portrait and text).
  dialogueSpriteRail: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  dialogueSpriteImage: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.48,
  },
  // Subtle "talking" lift applied while isTalking toggles (every 300ms). Reads as
  // gentle movement for every animal and ensures the portrait never looks frozen
  // even if an animal's talk frame matches its idle frame. Under reduced motion
  // isTalking stays constant, so this resolves to a static (non-moving) offset.
  dialogueSpriteTalking: {
    transform: [{ translateY: -2 }, { scale: 1.02 }],
  },
  dialogueSpriteEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: Math.min(80, SCREEN_WIDTH * 0.2),
  },
  dialogueTextCol: {
    flex: 1,
    // Name moved below the sprite — the bubble now starts near the top.
    paddingTop: 6,
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  // Portrait nameplate: sits under the sprite, centered in the alcove.
  dialogueAnimalName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 3,
  },
  dialogueNameSeparator: {
    height: 2,
    width: 28,
    borderRadius: 1,
    opacity: 0.5,
    alignSelf: 'center',
  },
  // Cottage parchment tray (NineSliceFrame card background); clear its 12dp
  // wood band. No borderRadius/borderWidth — the pixel frame owns the edge.
  dialogueBubble: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    // Stable-ish height so paging short and 2-3 line lines doesn't resize the
    // sheet and slide the nameplate up and down mid-conversation.
    minHeight: 66,
    justifyContent: 'center',
  },
  dialogueText: {
    fontFamily: PIXEL_FONT,
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  // The cottage bevel sits flush-right in the footer at its own strip height.
  dialogueContinueBevel: {
    minWidth: 132,
  },
  dialogueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
  },

  // Shop modal — chrome comes from the NineSliceFrame pixel panel; the style
  // keeps layout only (padding clears PANEL_EDGE_DP = 24).
  shopModal: {
    padding: 24,
    paddingBottom: 40,
  },
  compactHubModal: {
    padding: 24,
    paddingBottom: 32,
  },
  // Wooden nameplate title overlapping the panel's top frame edge.
  modalPlaque: {
    marginTop: -8,
    marginBottom: 10,
  },
  shopTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  shopSubtitle: {
    fontFamily: PIXEL_FONT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  shopFeedbackText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Pixel-card hub rows (Journal / Utility menus) — the NineSliceFrame is the
  // chrome; padding clears the card frame edge (CARD_EDGE_DP = 15).
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    minHeight: 56,
    marginBottom: 10,
  },
  hubRowIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  hubRowText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nextUnlockContainer: {
    marginBottom: 24,
  },
  upgradeSection: {
    marginBottom: 16,
  },
  nextUnlockLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginBottom: 12,
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  upgradeItem: {
    marginBottom: 10,
  },
  // Shared action placement inside rows / at panel foot
  rowAction: {
    marginLeft: 12,
  },
  closeAction: {
    marginTop: 12,
  },
  largeAction: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  reservedChip: {
    marginLeft: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservedChipText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  // Pixel bevel button anatomy (mirrors CandyButton; needed for labels
  // that embed <AmberInline /> inside the Text run)
  bevelStrip: {
    height: BTN_MD_DP + BTN_SHADOW_DP,
    minWidth: BTN_CAP_DP * 2 + 24,
  },
  bevelDisabled: {
    opacity: 0.45,
  },
  bevelContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    // The baked shadow row sits below the button body — keep the label
    // centered in the body, not the full strip.
    paddingBottom: BTN_SHADOW_DP,
  },
  bevelBtnText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  questModal: {
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  // Framed segmented tab chips (replaces the web-style underline tabs)
  questTabBar: {
    flexDirection: 'row' as const,
    marginBottom: 10,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    padding: 4,
    gap: 4,
  },
  questTab: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderRadius: SURFACE.buttonRadius - 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  questTabText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  questTabTimer: {
    fontFamily: PIXEL_FONT,
    fontSize: 10,
    marginTop: 2,
  },
  // Real quest progress bar: tinted track + amber fill
  questBarTrack: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  questBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  questList: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: SCREEN_HEIGHT * 0.55,
    marginBottom: 12,
  },
  questListContent: {
    paddingBottom: 4,
  },
  questItem: {
    marginBottom: 10,
  },
  unlockInfo: {
    flex: 1,
  },
  unlockName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
  },
  unlockDescription: {
    fontFamily: PIXEL_FONT,
    fontSize: 12,
    marginTop: 2,
  },
  unlockCost: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  questProgressText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  questSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  questSectionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  questSectionTimer: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '600',
  },
  unlockBlockedText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  allUnlockedText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 24,
  },
  // Tinted circle badge framing the locked-room title emoji
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockBadgeEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 24,
  },
  lockedRoomName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  amberBalance: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },


  // Cooldown toast - positioned below header, doesn't block touches
  cooldownToast: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },
  cooldownToastText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Invite modal styles — chrome comes from the NineSliceFrame pixel panel
  inviteModal: {
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
  },
  // Sprite hero: tinted ring + soft glow blob behind the portrait
  inviteHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  inviteHeroGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.35,
  },
  inviteHeroRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inviteEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 80,
  },
  inviteSpriteImage: {
    width: 116,
    height: 116,
  },
  inviteText: {
    fontFamily: PIXEL_FONT,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  inviteAction: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  inviteCost: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  inviteCloseAction: {
    marginTop: 10,
  },

  // Intro dialogue progress text (inline in footer)
  introProgressInline: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 12,
  },
  introDialogueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  introDialogueProgress: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  // Dialogue choice buttons (Phase 3)
  dialogueChoiceRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  dialogueChoiceBtn: {
    // Cottage card frame background; clear its wood band; ≥44dp for the caps.
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogueChoiceBtnText: {
    fontFamily: PIXEL_FONT,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Action row (Gallery + Pit + Sacrifice)
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    zIndex: 10,
  },
  actionRowButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  sacrificeButton: {
    backgroundColor: 'rgba(120, 30, 60, 0.2)',
    borderColor: 'rgba(120, 30, 60, 0.3)',
  },
  journalButton: {
    backgroundColor: 'rgba(45, 70, 120, 0.24)',
    borderColor: 'rgba(120, 180, 255, 0.3)',
  },
  pitPhaseReadyButton: {
    backgroundColor: 'rgba(180, 120, 0, 0.3)',
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1.5,
  },
  actionRowButtonText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Ambient home line — boxless atmospheric whisper (no frame by design).
  ambientLineContainer: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
    marginBottom: 4,
    zIndex: 10,
  },
  ambientLineText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: '#FBF0D9',
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    textShadowColor: 'rgba(20, 10, 6, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Sacrifice modal — chrome comes from the NineSliceFrame pixel panel
  sacrificeModal: {
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
  },
  sacrificeEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 50,
    marginBottom: 12,
  },
  sacrificeTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sacrificeSubtitle: {
    fontFamily: PIXEL_FONT,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  sacrificeBalance: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  sacrificeAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  // Framed selectable offering chips (colors from the surface theme inline —
  // dark phases keep the dread tone via getSurfaceTheme's dark values)
  sacrificeAmountBtn: {
    paddingHorizontal: 18,
    minHeight: 46,
    minWidth: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sacrificeAmountText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
  },
  sacrificeNoAmber: {
    fontFamily: PIXEL_FONT,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sacrificeResponseBox: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
  sacrificeResponseText: {
    fontFamily: PIXEL_FONT,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  sacrificeCloseAction: {
    alignSelf: 'stretch',
  },

  // House completion ceremony styles — chrome from the NineSliceFrame panel
  houseCompletionModal: {
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
  },
  houseCompletionModalDark: {
    // Kept for backward compat but colors now come from dt
  },
  houseCompletionGlow: {
    position: 'absolute',
    top: 4,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.3,
  },
  houseCompletionEmoji: {
    fontFamily: PIXEL_FONT,
    fontSize: 60,
    marginBottom: 16,
  },
  houseCompletionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  houseCompletionText: {
    fontFamily: PIXEL_FONT,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
    letterSpacing: 0.1,
  },

  // Journal spotlight intro styles (rendered as a Modal above the journal hub)
  journalSpotlightBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 18,
    paddingHorizontal: 14,
  },
  journalSpotlightIcon: {
    backgroundColor: 'rgba(255, 200, 80, 0.35)',
    borderColor: '#FFB858',
    borderWidth: 2,
    shadowColor: '#FFB858',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  journalSpotlightPointer: {
    position: 'absolute',
    // top applied inline via useScreenInsets (safe-area aware)
    right: 50,
    maxWidth: 180,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  journalSpotlightPointerText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  journalSpotlightPointerTail: {
    position: 'absolute',
    right: 18,
    bottom: -7,
    width: 14,
    height: 14,
    borderTopWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '135deg' }],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  journalSpotlightPanel: {
    // Cottage pixel frame (NineSliceFrame) owns the edge — no CSS radius/border.
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
  },
  journalSpotlightHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Clear the 24dp panel wood band (the panel itself carries no padding).
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
    gap: 12,
  },
  journalSpotlightHeroBadge: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalSpotlightHeroBadgeText: {
    fontFamily: PIXEL_FONT,
    fontSize: 28,
  },
  journalSpotlightHeroText: {
    flex: 1,
  },
  journalSpotlightEyebrow: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  journalSpotlightTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  journalSpotlightSubtitle: {
    fontFamily: PIXEL_FONT,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  journalSpotlightCounter: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  journalSpotlightCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  journalSpotlightCard: {
    width: '48%',
    minHeight: 84,
    // Cottage card frame owns the edge; clear its 12dp wood band comfortably.
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  journalSpotlightCardActive: {
    transform: [{ translateY: -1 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  journalSpotlightCardIcon: {
    fontFamily: PIXEL_FONT,
    fontSize: 18,
    marginBottom: 8,
  },
  journalSpotlightCardTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  journalSpotlightCardIndex: {
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  journalSpotlightDialogueRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 22,
    gap: 12,
  },
  // Portrait + nameplate stacked; the framed box no longer stretches to the
  // row (it is wrapped), so it carries an explicit height.
  journalSpotlightSpriteWrap: {
    alignItems: 'center',
  },
  journalSpotlightSpriteCol: {
    width: 92,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  journalSpotlightSpriteImage: {
    width: 118,
    height: 140,
  },
  journalSpotlightDialogueCol: {
    flex: 1,
    paddingTop: 6,
  },
  // Portrait nameplate below the framed portrait, centered in the alcove.
  journalSpotlightSpeaker: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 3,
    maxWidth: 100,
  },
  journalSpotlightBubble: {
    // Cottage parchment tray; clear the 12dp wood band, ≥44dp for the caps.
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  journalSpotlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  journalSpotlightProgressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  journalSpotlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default HomeScreen;
