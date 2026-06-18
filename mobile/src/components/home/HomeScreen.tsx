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
  StatusBar,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
// Note: HomeScreen's own UI (header, modals) is outside GestureHandlerRootView,
// so we use react-native's TouchableOpacity here. RoomView and AnimalSprite
// (inside HouseWorld's GestureHandlerRootView) correctly use RNGH's version.
import { Animal, Room, HomeWorldProgress } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CHARACTER_SPRITES } from './AnimalSprite';
import { CandyColors, getDialogueTheme, getOverlayBannerTheme, getPhaseTheme } from '../../theme/colors';
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
} from '../../services/amberCurrency';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { AmberInline } from '../AmberInline';

// Candy-style UI icon sprites (cross-platform consistent, replaces emoji)
const AMBER_ICON = require('../../../assets/ui/amber.png');
const FLAME_ICON = require('../../../assets/ui/flame.png');
const JOURNAL_ICON = require('../../../assets/ui/journal.png');
const PIT_ICON = require('../../../assets/ui/pit.png');
import {
  getChallengeIntroLines,
  getHouseCompletionText,
  getWordsOfferedText,
  getJournalIntroLines,
  getJournalSpotlightSteps,
} from '../../services/phaseNarrative';
import {
  ROOMS,
  ANIMALS,
  ANIMAL_EMOJIS,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getRoomDescription,
} from '../../services/homeWorldData';
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
import { getPendingHarvestSummary, HarvestSummary } from '../../services/wordHarvest';
import { getLocalDateString, daysAgoLocal } from '../../services/dateUtils';
import { getPitHomeBadgeLabel, getHomeAmbientLine, getFoxPitNudgeLines } from '../../services/phaseNarrative';
import { DailyChallengeCard } from '../DailyChallengeCard';
import { isDailyChallengeUnlocked } from '../../services/dailyChallenge';
import { areUpgradesAvailable, getPurchasedUpgrades, getRoomUpgrade, getUpgradeDescription, purchaseRoomUpgrade } from '../../services/roomUpgrades';
import { hapticLight, hapticSelection } from '../../services/haptics';
import { logEvent } from '../../services/eventLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeScreenProps {
  onPlayPuzzle: (difficulty?: Difficulty) => void;
  /** Start the Daily Challenge (seeded HARD puzzle). */
  onStartDaily?: (difficulty: Difficulty) => void;
  onAmberChange?: (newBalance: number) => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onOpenLedger?: () => void;
  onOpenGallery?: () => void;
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayPuzzle,
  onStartDaily,
  onAmberChange,
  onOpenSettings,
  onOpenStats,
  onOpenLedger,
  onOpenGallery,
  onOpenPit,
  pitPhaseReady,
  onboardingStep,
  onAdvanceOnboarding,
  initialHousePanY = null,
  onHousePanChange,
}) => {
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
  const [introContext, setIntroContext] = useState<'animal_intro' | 'challenge_intro' | 'pit_nudge'>('animal_intro');
  // Journal spotlight intro state
  const [journalSpotlightActive, setJournalSpotlightActive] = useState(false);
  const [journalSpotlightIndex, setJournalSpotlightIndex] = useState(0);
  const [journalSpotlightLines, setJournalSpotlightLines] = useState<string[]>([]);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;
  const playPulse = useRef(new Animated.Value(0)).current;
  const pitPulseAnim = useRef(new Animated.Value(0)).current;
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

  // Ambient home line (atmospheric text when idle)
  const [ambientLine, setAmbientLine] = useState<string | null>(null);
  const ambientOpacity = useRef(new Animated.Value(0)).current;
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Goal suggestion (contextual next-action hint)

  // Room upgrades
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Record<string, number>>({});
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
  });

  // Load all data from storage
  const loadAllData = useCallback(async () => {
    const [progressData, roomsData, animalsData] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
    ]);

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
        setShowHouseCompletion(true);
        setHouseCompletionTextIndex(0);
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
    });
    setWeeklyQuestState(questState);

    // Load room upgrades
    const upgrades = await getPurchasedUpgrades();
    setPurchasedUpgrades(upgrades);
  }, [unlockFlow.refreshUnlockData]);

  // Keep the ref in sync
  loadAllDataRef.current = loadAllData;

  const claimableQuestAmber = useMemo(() => {
    if (!weeklyQuestState || !progress) return 0;
    return getUnclaimedAmber(weeklyQuestState, progress.currentPhase);
  }, [weeklyQuestState, progress]);

  const activeQuestCount = useMemo(() => {
    if (!weeklyQuestState) return 0;
    const allQuests = [...weeklyQuestState.daily.quests, ...weeklyQuestState.weekly.quests];
    return allQuests.filter(q => !q.claimed).length;
  }, [weeklyQuestState]);

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

  const isPostTutorialLightMode = useMemo(() => {
    if (!progress || isOnboarding) return false;
    return progress.puzzlesSolved <= 5;
  }, [progress, isOnboarding]);

  const shouldShowPitShortcut = !isOnboarding;

  const shouldShowJournalButton = Boolean(
    !isOnboarding &&
    !isPostTutorialLightMode &&
    (onOpenLedger || onOpenGallery || weeklyQuestState)
  );

  const shouldHighlightPitButton = Boolean(
    pitPhaseReady
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

  // Pit button pulse when it needs attention.
  useEffect(() => {
    if (!shouldHighlightPitButton) {
      pitPulseAnim.setValue(0);
      return;
    }
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      pitPulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pitPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pitPulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => { loop.stop(); };
  }, [shouldHighlightPitButton, pitPulseAnim]);

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
    setWeeklyQuestState({ ...refreshed });
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

  // Get intro dialogue progress text
  const getIntroProgress = (): string => {
    if (!introAnimal || !progress) return '';
    const current = introDialogueIndex + 1;
    const total = introOverrideLines
      ? introOverrideLines.length
      : shouldUseCatchup()
        ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
        : getIntroDialogueCount(introAnimal.type);
    return `${current}/${total}`;
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

  const phaseBgColor = {
    0: '#6fb7df', 1: '#104c83', 2: '#514378', 3: '#060612', 4: '#1a122a', 5: '#1E1830',
  }[progress.currentPhase] || '#6fb7df';

  // Phase-aware dialogue theme for all modals and dialogue boxes
  const dt = getDialogueTheme(progress.currentPhase);
  const phaseTheme = getPhaseTheme(progress.currentPhase);
  const currentJournalSpotlightStep = journalSpotlightStepMeta[
    Math.max(0, Math.min(journalSpotlightIndex, journalSpotlightStepMeta.length - 1))
  ];

  return (
    <View style={[styles.container, { backgroundColor: phaseBgColor }]}>
      {/* Header — single row, simplified during onboarding */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={styles.amberContainer}
            accessibilityLabel={`${progress.amber} amber`}
          >
            <View style={styles.amberInner}>
              <Animated.View style={{ transform: [{ scale: amberPulse }] }}>
                <Image source={AMBER_ICON} style={styles.amberIconImage} />
              </Animated.View>
              <Text style={styles.amberCount}>{progress.amber}</Text>
              {!isOnboarding && <AmberSparkle />}
            </View>
          </View>
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

        <View style={styles.headerRight}>
          {!isOnboarding && onStartDaily &&
            isDailyChallengeUnlocked(progress.puzzlesSolved, progress.currentPhase) && (
            <DailyChallengeCard
              onStartDaily={onStartDaily}
              phase={progress.currentPhase}
            />
          )}
          {!isOnboarding && onOpenPit && (
            <Animated.View style={shouldHighlightPitButton ? {
              transform: [{ scale: pitPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
              opacity: pitPulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.75, 1] }),
            } : undefined}>
              <TouchableOpacity
                style={[styles.headerIconBtn, shouldHighlightPitButton && styles.pitHeaderIconBtn]}
                onPress={() => {
                  hapticLight();
                  onOpenPit?.();
                }}
                accessibilityLabel={`${getPitHomeBadgeLabel(progress.currentPhase)}${pendingHarvest && pendingHarvest.pendingBatches > 0 ? `: ${pendingHarvest.pendingWords} words pending` : ''}`}
                accessibilityRole="button"
              >
                <Image source={PIT_ICON} style={styles.headerIconImage} />
                {pendingHarvest && pendingHarvest.pendingWords > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{pendingHarvest.pendingWords}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          {shouldShowJournalButton && (
            <TouchableOpacity
              style={[
                styles.headerIconBtn,
                journalSpotlightActive && styles.journalSpotlightIcon,
              ]}
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
          {!isOnboarding && !isPostTutorialLightMode && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleOpenUtilityMenu}
              accessibilityLabel="Open utility menu"
              accessibilityRole="button"
            >
              <Text style={styles.headerIconText}>☰</Text>
            </TouchableOpacity>
          )}
          {!isOnboarding && (
          <Animated.View
            style={highlightPlayButton ? {
              transform: [{
                scale: playPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              }],
            } : undefined}
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
              <Text style={styles.playButtonText}>PLAY</Text>
            </JuicyButton>
          </Animated.View>
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
          savedPanY={initialHousePanY}
          onPanYChange={onHousePanChange}
          onPitPress={!isOnboarding && onOpenPit ? () => {
            hapticLight();
            onOpenPit();
          } : undefined}
        />

        <View style={styles.homeOverlayColumn} pointerEvents="box-none">
          {/* Next Unlock Progress Bar (hidden during early onboarding, shown during unlock_explained) */}
          {unlockFlow.nextUnlock && (!isOnboarding || onboardingStep === 'unlock_explained') && (
            <TouchableOpacity
              style={[styles.unlockProgressContainer, {
                backgroundColor: progress.currentPhase >= 3
                  ? 'rgba(15, 10, 25, 0.80)'
                  : progress.currentPhase >= 2
                    ? 'rgba(15, 15, 25, 0.78)'
                    : 'rgba(15, 25, 15, 0.75)',
              }]}
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
              <View style={styles.unlockProgressInner}>
                <Text style={styles.unlockProgressLabel}>
                  Next Unlock
                </Text>
                <View style={styles.unlockProgressBarBg}>
                  <View
                    style={[
                      styles.unlockProgressBarFill,
                      {
                        width: `${Math.min(100, unlockFlow.nextUnlock.cost > 0
                          ? (progress.amber / unlockFlow.nextUnlock.cost) * 100
                          : 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.unlockProgressText}>
                  {unlockFlow.nextUnlock.cost === 0
                    ? 'FREE'
                    : <><AmberInline /> {progress.amber} / {unlockFlow.nextUnlock.cost}</>}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Ambient home line — atmospheric text when idle (auto-dismiss with fade) */}
          {ambientLine && !isOnboarding && (() => {
            const bannerTheme = getOverlayBannerTheme(progress.currentPhase);
            return (
              <Animated.View style={[styles.ambientLineContainer, {
                opacity: ambientOpacity,
                backgroundColor: bannerTheme.containerBg,
                borderColor: bannerTheme.borderColor,
              }]}>
                <Text
                  style={[
                    styles.ambientLineText,
                    {
                      color: bannerTheme.textColor,
                      textShadowColor: bannerTheme.textShadowColor,
                    },
                  ]}
                >
                  {ambientLine}
                </Text>
              </Animated.View>
            );
          })()}

        </View>

        {/* Celebration Confetti */}
        {showCelebration && (
          <CelebrationConfetti onComplete={() => setShowCelebration(false)} />
        )}
      </View>

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
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
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
            {/* Decorative accent line at top of modal */}
            <View style={[styles.dialogueAccentLine, { backgroundColor: dt.accentLine }]} />

            {dialogueFlow.selectedAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column - 30% width, zoomed in to fill */}
                <View style={[styles.dialogueSpriteCol, { backgroundColor: dt.spriteBg }]}>
                  {CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type] ? (
                    <Image
                      source={
                        progress.currentPhase >= 4 && CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]?.robed
                          ? CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.robed!
                          : dialogueFlow.isTalking && CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]?.talk
                            ? CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.talk!
                            : CHARACTER_SPRITES[dialogueFlow.selectedAnimal.type]!.idle
                      }
                      style={styles.dialogueSpriteImage}
                      resizeMode="cover"
                      accessibilityLabel={`${dialogueFlow.selectedAnimal.name} portrait`}
                    />
                  ) : (
                    <Text style={styles.dialogueSpriteEmoji}>
                      {ANIMAL_INFO[dialogueFlow.selectedAnimal.type]?.emoji || '🐾'}
                    </Text>
                  )}
                </View>

                {/* Text column - 70% width */}
                <View style={styles.dialogueTextCol}>
                  <Text style={[styles.dialogueAnimalName, { color: dt.nameColor }]}>
                    {dialogueFlow.selectedAnimal.name}
                  </Text>
                  {/* Decorative separator under name */}
                  <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />

                  <View style={[styles.dialogueBubble, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
                    <Text style={[styles.dialogueText, { color: dt.textColor }]}>{dialogueFlow.dialogueText}</Text>
                  </View>

                  {/* Dialogue choice buttons (Phase 3 choice points) */}
                  {dialogueFlow.activeChoice && dialogueFlow.dialogueText === dialogueFlow.activeChoice.prompt ? (
                    <View style={styles.dialogueChoiceRow}>
                      <TouchableOpacity
                        style={[styles.dialogueChoiceBtn, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                        onPress={() => dialogueFlow.handleDialogueChoice('ask')}
                        accessibilityLabel={dialogueFlow.activeChoice.options.ask}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.dialogueChoiceBtnText, { color: dt.textColor }]}>
                          {dialogueFlow.activeChoice.options.ask}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dialogueChoiceBtn, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                        onPress={() => dialogueFlow.handleDialogueChoice('refuse')}
                        accessibilityLabel={dialogueFlow.activeChoice.options.refuse}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.dialogueChoiceBtnText, { color: dt.textColor }]}>
                          {dialogueFlow.activeChoice.options.refuse}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                  <View style={styles.dialogueFooter}>
                    <TouchableOpacity
                      style={[styles.continueButton, { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow }]}
                      onPress={dialogueFlow.handleNextDialogue}
                      accessibilityLabel="Continue dialogue"
                      accessibilityRole="button"
                    >
                      <View style={styles.dialogueButtonShine} />
                      <Text style={styles.continueButtonText}>
                        {dialogueFlow.hasMoreToShow ? 'Next' : 'Close'}
                      </Text>
                    </TouchableOpacity>
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
          style={[styles.modalOverlay, { backgroundColor: journalSpotlightActive ? 'transparent' : dt.overlayBg }]}
          activeOpacity={1}
          onPress={() => { if (!journalSpotlightActive) setShowJournalModal(false); }}
          accessibilityLabel="Close journal"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.compactHubModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.shopTitle, { color: dt.nameColor }]}>Journal</Text>
            <Text style={[styles.shopSubtitle, { color: dt.subtitleColor }]}>
              Keep the house&apos;s records in one place.
            </Text>
            {onOpenLedger && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowJournalModal(false);
                  onOpenLedger?.();
                }}
                accessibilityLabel="Open Word Ledger"
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>📘 Word Ledger</Text>
              </TouchableOpacity>
            )}
            {onOpenGallery && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowJournalModal(false);
                  onOpenGallery?.();
                }}
                accessibilityLabel="Open Whisper Gallery"
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>📜 {getGalleryTitle(progress.currentPhase)}</Text>
              </TouchableOpacity>
            )}
            {!!weeklyQuestState && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowJournalModal(false);
                  handleOpenQuestModal().catch(() => {});
                }}
                accessibilityLabel={`Open quests${claimableQuestAmber > 0 ? `, ${claimableQuestAmber} amber ready` : ''}`}
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>
                  🗓 Quests
                  {claimableQuestAmber > 0
                    ? ` (+${claimableQuestAmber})`
                    : activeQuestCount > 0
                      ? ` (${activeQuestCount})`
                      : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
          style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}
          activeOpacity={1}
          onPress={() => setShowUtilityModal(false)}
          accessibilityLabel="Close utility menu"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.compactHubModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.shopTitle, { color: dt.nameColor }]}>Menu</Text>
            <Text style={[styles.shopSubtitle, { color: dt.subtitleColor }]}>
              Everything else can stay tucked away until you need it.
            </Text>
            {onOpenStats && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenStats?.();
                }}
                accessibilityLabel="Open statistics"
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>📊 Statistics</Text>
              </TouchableOpacity>
            )}
            {onOpenSettings && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenSettings?.();
                }}
                accessibilityLabel="Open settings"
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>⚙️ Settings</Text>
              </TouchableOpacity>
            )}
            {isSacrificeAvailable(progress.currentPhase) && (
              <TouchableOpacity
                style={[styles.hubButton, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                onPress={() => {
                  setShowUtilityModal(false);
                  setShowSacrificeModal(true);
                }}
                accessibilityLabel="Open sacrifice"
                accessibilityRole="button"
              >
                <Text style={[styles.hubButtonText, { color: dt.textColor }]}>🕯️ {getSacrificePrompt(progress.currentPhase).title}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Shop Modal */}
      <Modal
        visible={unlockFlow.showShop}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowShop(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowShop(false)}
          accessibilityLabel="Close shop"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.shopModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.shopTitle, { color: dt.nameColor }]}>Unlock Progress</Text>
            <Text style={[styles.shopSubtitle, { color: dt.subtitleColor }]}>
              Your Amber: <AmberInline /> {progress.amber}
            </Text>
            {upgradeFeedback && (
              <Text style={[styles.shopFeedbackText, { color: dt.nameColor }]}>
                {upgradeFeedback}
              </Text>
            )}

            {/* Next unlock */}
            {unlockFlow.nextUnlock && (
              <View style={styles.nextUnlockContainer}>
                <Text style={styles.nextUnlockLabel}>Next Unlock:</Text>
                <View style={[styles.unlockItem, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
                  <View style={styles.unlockInfo}>
                    <Text style={[styles.unlockName, { color: dt.textColor }]}>{unlockFlow.nextUnlock.name}</Text>
                    <Text style={[styles.unlockDescription, { color: dt.subtitleColor }]}>
                      {unlockFlow.nextUnlock.type === 'room'
                        ? getRoomDescription(unlockFlow.nextUnlock.targetId, progress.currentPhase)
                        : unlockFlow.nextUnlock.description}
                    </Text>
                    <Text style={styles.unlockCost}>
                      <AmberInline /> {unlockFlow.nextUnlock.cost} amber
                    </Text>
                    {unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available && (
                      <Text style={styles.unlockBlockedText}>
                        {unlockFlow.unlockAvailability.reason}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      (progress.amber < unlockFlow.nextUnlock.cost ||
                       (unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available)) &&
                        styles.buyButtonDisabled,
                    ]}
                    onPress={() => unlockFlow.handlePurchase(unlockFlow.nextUnlock!)}
                    disabled={
                      progress.amber < unlockFlow.nextUnlock.cost ||
                      (unlockFlow.unlockAvailability !== null && !unlockFlow.unlockAvailability.available)
                    }
                    accessibilityLabel={`Unlock ${unlockFlow.nextUnlock.name} for ${unlockFlow.nextUnlock.cost} amber`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.buyButtonText}>
                      {unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available
                        ? 'Locked'
                        : progress.amber >= unlockFlow.nextUnlock.cost
                          ? 'Unlock'
                          : 'Need More'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!unlockFlow.nextUnlock && (
              <View>
                <Text style={styles.allUnlockedText}>
                  All characters and rooms unlocked!
                </Text>
              </View>
            )}

            {areUpgradesAvailable(progress.currentPhase) && (
              <View style={styles.upgradeSection}>
                <Text style={styles.nextUnlockLabel}>Room Upgrades</Text>
                {availableRoomUpgrades.length === 0 ? (
                  <Text style={[styles.unlockDescription, { color: dt.subtitleColor }]}>
                    Every unlocked room already has its decorative upgrade.
                  </Text>
                ) : (
                  availableRoomUpgrades.slice(0, 4).map(({ room, upgrade }) => (
                    <View
                      key={room.id}
                      style={[styles.unlockItem, styles.upgradeItem, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                    >
                      <View style={styles.unlockInfo}>
                        <Text style={[styles.unlockName, { color: dt.textColor }]}>{room.name}: {upgrade.name}</Text>
                        <Text style={[styles.unlockDescription, { color: dt.subtitleColor }]}>
                          {getUpgradeDescription(room.id, progress.currentPhase)}
                        </Text>
                        <Text style={styles.unlockCost}><AmberInline /> {upgrade.cost} amber</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.buyButton,
                          progress.amber < upgrade.cost && styles.buyButtonDisabled,
                        ]}
                        onPress={() => {
                          handlePurchaseUpgrade(room.id).catch(() => {});
                        }}
                        disabled={progress.amber < upgrade.cost}
                        accessibilityLabel={`Upgrade ${room.name} with ${upgrade.name} for ${upgrade.cost} amber`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.buyButtonText}>
                          {progress.amber >= upgrade.cost ? 'Decorate' : 'Need More'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => unlockFlow.setShowShop(false)}
              accessibilityLabel="Close shop"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
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
        <View style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowQuestModal(false)}
            accessibilityLabel="Close quests"
            accessibilityRole="button"
          />
          <View
            style={[
              styles.shopModal,
              styles.questModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
          >
            <Text style={[styles.shopTitle, { color: dt.nameColor }]}>Quests</Text>
            {questFeedback && (
              <Text style={[styles.shopFeedbackText, { color: dt.nameColor }]}>
                {questFeedback}
              </Text>
            )}
            {/* Tab Bar */}
            <View style={styles.questTabBar}>
              <TouchableOpacity
                style={[
                  styles.questTab,
                  questTab === 'daily' && [styles.questTabActive, { borderBottomColor: dt.nameColor }],
                ]}
                onPress={() => setQuestTab('daily')}
                accessibilityLabel="Daily quests tab"
                accessibilityRole="tab"
              >
                <Text style={[styles.questTabText, { color: questTab === 'daily' ? dt.nameColor : dt.subtitleColor }]}>Daily</Text>
                <Text style={[styles.questTabTimer, { color: dt.subtitleColor }]}>
                  {getTimeUntilDailyReset().hours}h {getTimeUntilDailyReset().minutes}m
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.questTab,
                  questTab === 'weekly' && [styles.questTabActive, { borderBottomColor: dt.nameColor }],
                ]}
                onPress={() => setQuestTab('weekly')}
                accessibilityLabel="Weekly quests tab"
                accessibilityRole="tab"
              >
                <Text style={[styles.questTabText, { color: questTab === 'weekly' ? dt.nameColor : dt.subtitleColor }]}>Weekly</Text>
                <Text style={[styles.questTabTimer, { color: dt.subtitleColor }]}>
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
              {(questTab === 'daily' ? weeklyQuestState?.daily?.quests : weeklyQuestState?.weekly?.quests)?.map(quest => (
                <View
                  key={quest.id}
                  style={[styles.unlockItem, styles.questItem, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}
                >
                  <View style={styles.unlockInfo}>
                    <Text style={[styles.unlockName, { color: dt.textColor }]}>{quest.title}</Text>
                    <Text style={[styles.unlockDescription, { color: dt.subtitleColor }]}>
                      {getQuestDescription(quest, progress.currentPhase)}
                    </Text>
                    <Text style={styles.questProgressText}>
                      {quest.completed ? 'Complete' : `${quest.progress} / ${quest.target}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      (!quest.completed || quest.claimed) && styles.buyButtonDisabled,
                    ]}
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
                    accessibilityRole="button"
                  >
                    <Text style={styles.buyButtonText}>
                      {quest.claimed
                        ? 'Claimed'
                        : quest.completed
                          ? `Claim +${Math.round(quest.rewardAmber * getPhaseRewardMultiplier(progress.currentPhase))}`
                          : 'In Progress'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQuestModal(false)}
              accessibilityLabel="Close quests"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
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
          style={[styles.modalOverlay, { backgroundColor: dt.overlayBg }]}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowRoomUnlock(null)}
          accessibilityLabel="Close room unlock"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.shopModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {unlockFlow.showRoomUnlock && (
              <>
                <Text style={[styles.shopTitle, { color: dt.nameColor }]}>🔒 Locked Room</Text>
                <Text style={[styles.lockedRoomName, { color: dt.textColor }]}>{unlockFlow.showRoomUnlock.name}</Text>
                <Text style={[styles.shopSubtitle, { color: dt.subtitleColor }]}>
                  Play more puzzles to earn amber and unlock this room!
                </Text>
                <Text style={styles.amberBalance}>Your Amber: <AmberInline /> {progress.amber}</Text>

                {unlockFlow.purchaseError && (
                  <Text style={[styles.shopSubtitle, { color: '#E85050', marginTop: 8, fontWeight: '600' }]}>
                    {unlockFlow.purchaseError}
                  </Text>
                )}

                {unlockFlow.nextUnlock && unlockFlow.nextUnlock.targetId === unlockFlow.showRoomUnlock.id && (() => {
                  const isGated = unlockFlow.unlockAvailability && !unlockFlow.unlockAvailability.available
                    && unlockFlow.unlockAvailability.reason && !unlockFlow.unlockAvailability.reason.startsWith('Already');
                  const cantAfford = progress.amber < unlockFlow.nextUnlock.cost;
                  const isDisabled = cantAfford || !!isGated;
                  return (
                    <>
                      {isGated && (
                        <Text style={[styles.shopSubtitle, { color: dt.subtitleColor, marginTop: 8, fontStyle: 'italic' }]}>
                          {unlockFlow.unlockAvailability!.reason}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.buyButton,
                          styles.buyButtonLarge,
                          isDisabled && styles.buyButtonDisabled,
                        ]}
                        onPress={() => unlockFlow.handlePurchase(unlockFlow.nextUnlock!)}
                        disabled={isDisabled}
                        accessibilityLabel={`Unlock room for ${unlockFlow.nextUnlock!.cost} amber`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.buyButtonText}>
                          Unlock for <AmberInline /> {unlockFlow.nextUnlock!.cost}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => unlockFlow.setShowRoomUnlock(null)}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
        <View style={[styles.centeredOverlay, { backgroundColor: dt.overlayBg }]}>
          <View
            style={[
              styles.inviteModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {unlockFlow.nextUnlock && unlockFlow.nextUnlock.type === 'character' && (() => {
              const animalData = ANIMALS.find(a => a.id === unlockFlow.nextUnlock!.targetId);
              const animalEmoji = animalData ? ANIMAL_EMOJIS[animalData.type] : '🐾';
              const animalSprites = animalData ? CHARACTER_SPRITES[animalData.type] : undefined;
              const isFirstAnimal = progress?.unlockedAnimals.length === 0;

              return (
                <>
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
                  <Text style={[styles.inviteTitle, { color: dt.nameColor }]}>
                    {isFirstAnimal ? 'A Visitor Approaches!' : 'A New Friend!'}
                  </Text>
                  <Text style={[styles.inviteText, { color: dt.textColor }]}>
                    {unlockFlow.nextUnlock!.description}
                  </Text>
                  <Text style={[styles.inviteText, { color: dt.textColor }]}>
                    {isFirstAnimal
                      ? 'Would you like to invite them into your cozy den?'
                      : `Would you like to welcome ${unlockFlow.nextUnlock!.name.split(' ')[0]} to your growing home?`
                    }
                  </Text>

                  {unlockFlow.nextUnlock!.cost > 0 && (
                    <Text style={styles.inviteCost}>
                      Cost: <AmberInline /> {unlockFlow.nextUnlock!.cost} amber
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.inviteButton,
                      { backgroundColor: dt.secondaryButtonBg, shadowColor: dt.secondaryButtonBg },
                      progress && progress.amber < unlockFlow.nextUnlock!.cost && styles.inviteButtonDisabled,
                    ]}
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
                    accessibilityRole="button"
                  >
                    <Text style={styles.inviteButtonText}>
                      {unlockFlow.nextUnlock!.cost === 0
                        ? 'Welcome, Friend! 🏠'
                        : progress && progress.amber >= unlockFlow.nextUnlock!.cost
                          ? `Invite ${unlockFlow.nextUnlock!.name.split(' ')[0]}! 🏠`
                          : 'Need More Amber'
                      }
                    </Text>
                  </TouchableOpacity>

                  {/* Hide "Maybe Later" during onboarding — player must invite Fox */}
                  {!isOnboarding && (
                  <TouchableOpacity
                    style={styles.inviteCloseButton}
                    onPress={() => unlockFlow.setShowInvitePrompt(false)}
                    accessibilityLabel="Maybe later"
                    accessibilityRole="button"
                  >
                    <Text style={styles.inviteCloseButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
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
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
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
            {/* Decorative accent line at top of modal */}
            <View style={[styles.dialogueAccentLine, { backgroundColor: dt.accentLine }]} />

            {introAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column - 30% width, zoomed in to fill */}
                <View style={[styles.dialogueSpriteCol, { backgroundColor: dt.spriteBg }]}>
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
                </View>

                {/* Text column - 70% width */}
                <View style={styles.dialogueTextCol}>
                  <Text style={[styles.dialogueAnimalName, { color: dt.nameColor }]}>
                    {introAnimal.name}
                  </Text>
                  {/* Decorative separator under name */}
                  <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />

                  <View style={[styles.dialogueBubble, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
                    <Text style={[styles.dialogueText, { color: dt.textColor }]}>{getCurrentIntroText()}</Text>
                  </View>

                  <View style={styles.dialogueFooter}>
                    <Text style={[styles.introProgressInline, { color: dt.progressColor }]}>
                      {getIntroProgress()}
                    </Text>
                    <TouchableOpacity
                      style={[styles.continueButton, { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow }]}
                      onPress={handleAdvanceIntroDialogue}
                      accessibilityLabel={hasMoreIntroDialogues() ? 'Continue intro' : 'Welcome and close'}
                      accessibilityRole="button"
                    >
                      <View style={styles.dialogueButtonShine} />
                      <Text style={styles.continueButtonText}>
                        {hasMoreIntroDialogues() ? 'Next' : 'Welcome!'}
                      </Text>
                    </TouchableOpacity>
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
        <View style={[styles.centeredOverlay, { backgroundColor: dt.overlayBg }]}>
          <View
            style={[
              styles.sacrificeModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.sacrificeEmoji}>🕯️</Text>
            <Text style={[styles.sacrificeTitle, { color: dt.nameColor }]}>
              {getSacrificePrompt(progress.currentPhase).title}
            </Text>
            <Text style={[styles.sacrificeSubtitle, { color: dt.subtitleColor }]}>
              {getSacrificePrompt(progress.currentPhase).subtitle}
            </Text>
            <Text style={[styles.sacrificeBalance, { color: dt.textColor }]}>
              Your Amber: <AmberInline /> {progress.amber}
            </Text>

            {sacrificeMessage ? (
              <View style={[styles.sacrificeResponseBox, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
                <Text style={[styles.sacrificeResponseText, { color: dt.textColor }]}>
                  {sacrificeMessage}
                </Text>
                <TouchableOpacity
                  style={[styles.continueButton, { backgroundColor: dt.primaryButtonBg }]}
                  onPress={() => {
                    setSacrificeMessage(null);
                    setShowSacrificeModal(false);
                  }}
                >
                  <Text style={styles.continueButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sacrificeAmounts}>
                {getSacrificeAmounts(progress.amber).map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.sacrificeAmountBtn, { borderColor: dt.bubbleBorder }]}
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
                    <Text style={[styles.sacrificeAmountText, { color: dt.textColor }]}>
                      <AmberInline /> {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
                {getSacrificeAmounts(progress.amber).length === 0 && (
                  <Text style={[styles.sacrificeNoAmber, { color: dt.subtitleColor }]}>
                    You don&apos;t have enough amber to offer.
                  </Text>
                )}
              </View>
            )}

            {!sacrificeMessage && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSacrificeModal(false)}
              >
                <Text style={styles.closeButtonText}>Not now</Text>
              </TouchableOpacity>
            )}
          </View>
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
        <View style={[styles.centeredOverlay, { backgroundColor: dt.overlayBg }]}>
          <View
            style={[
              styles.houseCompletionModal,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
              progress.currentPhase >= 3 && styles.houseCompletionModalDark,
            ]}
            onStartShouldSetResponder={() => true}
          >
            {(() => {
              const lines = getHouseCompletionText();
              return (
                <>
                  <Text style={styles.houseCompletionEmoji}>
                    {progress.currentPhase >= 4 ? '🌑' : '🏠'}
                  </Text>
                  <Text style={[
                    styles.houseCompletionTitle,
                    { color: dt.nameColor },
                  ]}>
                    {progress.currentPhase >= 4 ? 'The Temple' : 'The House is Complete'}
                  </Text>
                  <Text style={[
                    styles.houseCompletionText,
                    { color: dt.textColor },
                  ]}>
                    {lines[houseCompletionTextIndex]}
                  </Text>
                  <View style={styles.introDialogueFooter}>
                    <Text style={[styles.introDialogueProgress, { color: dt.progressColor }]}>
                      {houseCompletionTextIndex + 1}/{lines.length}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.introContinueButton,
                        { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow },
                      ]}
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
                      accessibilityRole="button"
                    >
                      <Text style={styles.introContinueButtonText}>
                        {houseCompletionTextIndex + 1 < lines.length ? 'Continue' : 'Close'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
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
          <View
            style={[
              styles.journalSpotlightPointer,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: phaseTheme.victoryGlowColor,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.journalSpotlightPointerText, { color: dt.nameColor }]}>
              {currentJournalSpotlightStep.pointerText}
            </Text>
            <View
              style={[
                styles.journalSpotlightPointerTail,
                {
                  borderTopColor: dt.modalBg,
                  borderRightColor: dt.modalBg,
                  shadowColor: phaseTheme.victoryGlowColor,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.journalSpotlightPanel,
              {
                backgroundColor: dt.modalBg,
                borderColor: dt.modalBorder,
                shadowColor: dt.modalShadowColor,
              },
            ]}
          >
            <View style={[styles.dialogueAccentLine, { backgroundColor: dt.accentLine }]} />

            <View style={styles.journalSpotlightHeroRow}>
              <View
                style={[
                  styles.journalSpotlightHeroBadge,
                  {
                    backgroundColor: phaseTheme.modalStatBgColor,
                    borderColor: dt.bubbleBorder,
                    shadowColor: phaseTheme.victoryGlowColor,
                  },
                ]}
              >
                <Text style={styles.journalSpotlightHeroBadgeText}>{currentJournalSpotlightStep.icon}</Text>
              </View>

              <View style={styles.journalSpotlightHeroText}>
                <Text style={[styles.journalSpotlightEyebrow, { color: dt.progressColor }]}>
                  {currentJournalSpotlightStep.eyebrow}
                </Text>
                <Text style={[styles.journalSpotlightTitle, { color: dt.nameColor }]}>
                  {currentJournalSpotlightStep.title}
                </Text>
                <Text style={[styles.journalSpotlightSubtitle, { color: dt.subtitleColor }]}>
                  {currentJournalSpotlightStep.preview}
                </Text>
              </View>

              <Text style={[styles.journalSpotlightCounter, { color: dt.progressColor }]}>
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
                      {
                        backgroundColor: isActive ? phaseTheme.modalStatBgColor : dt.bubbleBg,
                        borderColor: isActive ? dt.accentLine : dt.bubbleBorder,
                        shadowColor: isActive ? phaseTheme.victoryGlowColor : 'transparent',
                      },
                      isActive && styles.journalSpotlightCardActive,
                    ]}
                  >
                    <Text style={styles.journalSpotlightCardIcon}>{step.icon}</Text>
                    <Text
                      style={[
                        styles.journalSpotlightCardTitle,
                        { color: isActive ? dt.nameColor : dt.textColor },
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={[styles.journalSpotlightCardIndex, { color: dt.progressColor }]}>
                      {step.cardLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.journalSpotlightDialogueRow}>
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

              <View style={styles.journalSpotlightDialogueCol}>
                <Text style={[styles.journalSpotlightSpeaker, { color: dt.nameColor }]}>
                  {ANIMAL_INFO.fox?.name || 'Ember'}
                </Text>
                <View style={[styles.dialogueNameSeparator, { backgroundColor: dt.accentLine }]} />

                <View
                  style={[
                    styles.journalSpotlightBubble,
                    { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder },
                  ]}
                >
                  <Text style={[styles.dialogueText, { color: dt.textColor }]}>
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

                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow },
                    ]}
                    onPress={journalSpotlightIndex < journalSpotlightLines.length - 1
                      ? () => setJournalSpotlightIndex(prev => prev + 1)
                      : async () => {
                          await markJournalIntroSeen();
                          setJournalSpotlightActive(false);
                        }
                    }
                    accessibilityLabel={journalSpotlightIndex < journalSpotlightLines.length - 1 ? 'Continue journal intro' : 'Close journal intro'}
                    accessibilityRole="button"
                  >
                    <View style={styles.dialogueButtonShine} />
                    <Text style={styles.continueButtonText}>
                      {journalSpotlightIndex < journalSpotlightLines.length - 1
                        ? 'Next'
                        : currentJournalSpotlightStep.finalCtaLabel}
                    </Text>
                  </TouchableOpacity>
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
    backgroundColor: '#6fb7df',
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
    fontSize: 34,
  },
  loadingText: {
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  loadingSubtext: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  amberContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 20,
  },
  amberCount: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
  },
  streakBadgeCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C00',
  },
  streakAtRiskCount: {
    color: '#FF3C3C',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pitHeaderIconBtn: {
    backgroundColor: 'rgba(180, 120, 0, 0.3)',
    borderColor: 'rgba(255, 215, 0, 0.45)',
    borderWidth: 1.5,
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
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  headerIconText: {
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
  playButton: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: CandyColors.green.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonHighlighted: {
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    shadowColor: CandyColors.yellow.main,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 8,
  },
  playButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
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
    borderRadius: 14,
    padding: 12,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    gap: 6,
  },
  unlockProgressLabel: {
    color: CandyColors.white,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flex: 1,
  },
  unlockProgressText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  unlockProgressBarBg: {
    flex: 2,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  unlockProgressBarFill: {
    height: '100%',
    backgroundColor: CandyColors.yellow.main,
    borderRadius: 5,
    shadowColor: CandyColors.yellow.light,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Dialogue modal - side-by-side: 30% sprite, 70% text
  dialogueModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
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
  dialogueSpriteImage: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.48,
  },
  dialogueSpriteEmoji: {
    fontSize: Math.min(80, SCREEN_WIDTH * 0.2),
  },
  dialogueTextCol: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  dialogueAnimalName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dialogueNameSeparator: {
    height: 2,
    width: 32,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 12,
  },
  dialogueBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  dialogueText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  dialogueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dialogueButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  continueButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  // Shop modal
  shopModal: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  compactHubModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  shopTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  shopSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  shopFeedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  hubButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  hubButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  nextUnlockContainer: {
    marginBottom: 24,
  },
  upgradeSection: {
    marginBottom: 16,
  },
  nextUnlockLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.gray[500],
    marginBottom: 12,
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  upgradeItem: {
    marginBottom: 10,
  },
  questModal: {
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  questTabBar: {
    flexDirection: 'row' as const,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  questTab: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  questTabActive: {
    borderBottomWidth: 2,
  },
  questTabText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  questTabTimer: {
    fontSize: 10,
    marginTop: 2,
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
    fontSize: 16,
    fontWeight: '800',
  },
  unlockDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  unlockCost: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.yellow.dark,
    marginTop: 6,
  },
  questProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.orange.dark,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  questSectionTimer: {
    fontSize: 11,
    fontWeight: '600',
  },
  unlockBlockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: CandyColors.orange.main,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buyButton: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignSelf: 'center',
    marginTop: 16,
  },
  buyButtonDisabled: {
    backgroundColor: CandyColors.gray[300],
  },
  buyButtonText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  allUnlockedText: {
    fontSize: 16,
    color: CandyColors.green.main,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
  },
  closeButtonText: {
    color: 'rgba(150, 150, 150, 0.8)',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockedRoomName: {
    fontSize: 18,
    fontWeight: '700',
    color: CandyColors.gray[700],
    textAlign: 'center',
    marginBottom: 8,
  },
  amberBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: CandyColors.yellow.dark,
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
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Invite modal styles
  inviteModal: {
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    maxWidth: 380,
    width: '90%',
  },
  inviteEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  inviteSpriteImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  inviteText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  inviteButton: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inviteButtonDisabled: {
    backgroundColor: CandyColors.gray[400],
    shadowColor: CandyColors.gray[500],
  },
  inviteButtonText: {
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  inviteCost: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.yellow.dark,
    marginTop: 12,
  },
  inviteCloseButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  inviteCloseButtonText: {
    color: CandyColors.gray[500],
    fontSize: 14,
    fontWeight: '600',
  },

  // Intro dialogue progress text (inline in footer)
  introProgressInline: {
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
    fontSize: 13,
    fontWeight: '600',
  },
  introContinueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  introContinueButtonText: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  // Dialogue choice buttons (Phase 3)
  dialogueChoiceRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  dialogueChoiceBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  dialogueChoiceBtnText: {
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
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Ambient home line
  ambientLineContainer: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 4,
    zIndex: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ambientLineText: {
    fontSize: 15,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Sacrifice modal
  sacrificeModal: {
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    maxWidth: 380,
    width: '90%',
    borderWidth: 1,
  },
  sacrificeEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },
  sacrificeTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sacrificeSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  sacrificeBalance: {
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
  sacrificeAmountBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(100, 30, 50, 0.15)',
  },
  sacrificeAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sacrificeNoAmber: {
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
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // House completion ceremony styles
  houseCompletionModal: {
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    maxWidth: 380,
    width: '90%',
    borderWidth: 1,
  },
  houseCompletionModalDark: {
    // Kept for backward compat but colors now come from dt
  },
  houseCompletionEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  houseCompletionTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  houseCompletionText: {
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
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 26 : 60,
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
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
  },
  journalSpotlightHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
  },
  journalSpotlightHeroBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  journalSpotlightHeroBadgeText: {
    fontSize: 28,
  },
  journalSpotlightHeroText: {
    flex: 1,
  },
  journalSpotlightEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  journalSpotlightTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  journalSpotlightSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  journalSpotlightCounter: {
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  journalSpotlightCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  journalSpotlightCard: {
    width: '48%',
    minHeight: 84,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  journalSpotlightCardActive: {
    transform: [{ translateY: -1 }],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  journalSpotlightCardIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  journalSpotlightCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  journalSpotlightCardIndex: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  journalSpotlightDialogueRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 22,
    gap: 12,
  },
  journalSpotlightSpriteCol: {
    width: 92,
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
  journalSpotlightSpeaker: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  journalSpotlightBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
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
