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
} from 'react-native';
// Note: HomeScreen's own UI (header, modals) is outside GestureHandlerRootView,
// so we use react-native's TouchableOpacity here. RoomView and AnimalSprite
// (inside HouseWorld's GestureHandlerRootView) correctly use RNGH's version.
import { Animal, Room, HomeWorldProgress } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CHARACTER_SPRITES } from './AnimalSprite';
import { CandyColors, getDialogueTheme, getPhaseTheme } from '../../theme/colors';
import {
  getFullProgress,
  markIntroSeen,
  markHouseCompleted,
  spendAmber,
  hasSeenDailyChallengeIntro,
  markDailyChallengeIntroSeen,
  hasSeenChallengeIntro,
  markChallengeIntroSeen,
  hasSeenPitNudge,
  markPitNudgeSeen,
} from '../../services/amberCurrency';
import {
  getDailyChallengeIntroLines,
  getChallengeIntroLines,
  getHouseCompletionText,
  getWordsOfferedText,
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
import { DailyChallengeCard } from '../DailyChallengeCard';
import { Difficulty } from '../../types';
import { OnboardingStep } from '../../services/onboarding';
import { isDailyChallengeUnlocked, isDailyCompleted } from '../../services/dailyChallenge';
import { getUnlockedVariants } from '../../services/puzzleVariety';
import {
  isSacrificeAvailable,
  getSacrificeAmounts,
  getSacrificePrompt,
  performSacrifice,
} from '../../services/sacrifice';
import { getGalleryTitle } from '../../services/whisperGallery';
import { updateQuestProgress, loadWeeklyQuests } from '../../services/weeklyQuests';
import { getSettingsSync } from '../../services/settings';
import { getPendingHarvestSummary, HarvestSummary } from '../../services/wordHarvest';
import { getPitHomeBadgeLabel, getHomeAmbientLine, getGoalSuggestion, GoalSuggestion, getFoxPitNudgeLines } from '../../services/phaseNarrative';
import { getPurchasedUpgrades } from '../../services/roomUpgrades';
import { hapticLight, hapticSelection } from '../../services/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeScreenProps {
  onPlayPuzzle: (difficulty?: Difficulty) => void;
  onAmberChange?: (newBalance: number) => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onOpenLedger?: () => void;
  onOpenGallery?: () => void;
  onOpenPit?: () => void;
  onStartDaily?: (difficulty: Difficulty) => void;
  /** Current onboarding step (undefined when onboarding is complete) */
  onboardingStep?: OnboardingStep;
  /** Advance onboarding to next step */
  onAdvanceOnboarding?: (step: OnboardingStep) => Promise<void>;
  /** Whether a phase transition is pending in the pit */
  pitPhaseReady?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayPuzzle,
  onAmberChange,
  onOpenSettings,
  onOpenStats,
  onOpenLedger,
  onOpenGallery,
  onOpenPit,
  pitPhaseReady,
  onStartDaily,
  onboardingStep,
  onAdvanceOnboarding,
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
  const [introContext, setIntroContext] = useState<'animal_intro' | 'daily_unlock' | 'challenge_intro' | 'pit_nudge'>('animal_intro');

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

  // Ambient home line (atmospheric text when idle)
  const [ambientLine, setAmbientLine] = useState<string | null>(null);
  const ambientOpacity = useRef(new Animated.Value(0)).current;
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Goal suggestion (contextual next-action hint)
  const [goalSuggestion, setGoalSuggestion] = useState<GoalSuggestion | null>(null);
  const goalOpacity = useRef(new Animated.Value(0)).current;
  const goalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Room upgrades
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Record<string, number>>({});

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

    // Load room upgrades
    const upgrades = await getPurchasedUpgrades();
    setPurchasedUpgrades(upgrades);
  }, [unlockFlow.refreshUnlockData]);

  // Keep the ref in sync
  loadAllDataRef.current = loadAllData;

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

  // Daily challenge unlock introduction (one-time, animal-led).
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
      setIntroContext('daily_unlock');
      setShowIntroDialogue(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    progress?.puzzlesSolved,
    progress?.currentPhase,
    isOnboarding,
    showIntroDialogue,
    introOverrideLines,
    animals,
  ]);

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

  // Ambient home line — atmospheric text when no dialogue is active
  // Fades in, holds for 5s, then fades out to avoid persistent visual clutter.
  useEffect(() => {
    if (isOnboarding || !progress) return;
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
    progress?.currentPhase,
    showIntroDialogue,
    dialogueFlow.showDialogue,
  ]);

  // Goal suggestion — contextual next-action hint below ambient line
  // Appears after a short delay (staggered from ambient line), then auto-dismisses with fade.
  useEffect(() => {
    if (isOnboarding || !progress) {
      setGoalSuggestion(null);
      goalOpacity.setValue(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const phase = progress.currentPhase;
      const puzzles = progress.puzzlesSolved ?? 0;

      // Check daily availability
      const dailyUnlocked = isDailyChallengeUnlocked(puzzles, phase as number);
      const dailyDone = dailyUnlocked ? await isDailyCompleted() : true;
      const dailyAvailable = dailyUnlocked && !dailyDone;

      // Check untried difficulties
      const completed = progress.completedDifficulties ?? [];
      const allDiffs = ['MEDIUM', 'MEDIUM_PLUS', 'HARD'];
      const untried = allDiffs.filter(d => !completed.includes(d));

      // Check unlocked variants for any not yet tried
      const unlocked = getUnlockedVariants(puzzles, phase as number);
      const preferred = progress.preferredPuzzleVariant;
      const nonStandard = unlocked.filter(v => v !== 'standard');
      const newVariant = nonStandard.length > 0 && !preferred
        ? nonStandard[0]
        : null;

      // Check weekly quests
      let hasActiveQuests = false;
      try {
        const questState = await loadWeeklyQuests(phase as number);
        hasActiveQuests = questState.quests.some(q => !q.completed);
      } catch { /* ignore */ }

      if (cancelled) return;
      const suggestion = getGoalSuggestion(phase, dailyAvailable, untried, newVariant, hasActiveQuests);
      setGoalSuggestion(suggestion);

      if (!suggestion) return;

      const { reducedMotion } = getSettingsSync();
      const appearDelay = 2000; // 2s stagger after ambient line

      if (reducedMotion) {
        goalTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          goalOpacity.setValue(1);
          goalTimerRef.current = setTimeout(() => {
            if (cancelled) return;
            goalOpacity.setValue(0);
            setGoalSuggestion(null);
          }, 6000);
        }, appearDelay);
      } else {
        goalTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          goalOpacity.setValue(0);
          const fadeIn = Animated.timing(goalOpacity, { toValue: 1, duration: 400, useNativeDriver: true });
          goalAnimRef.current = fadeIn;
          fadeIn.start(({ finished }) => {
            if (!finished || cancelled) return;
            goalAnimRef.current = null;
            goalTimerRef.current = setTimeout(() => {
              if (cancelled) return;
              const fadeOut = Animated.timing(goalOpacity, { toValue: 0, duration: 600, useNativeDriver: true });
              goalAnimRef.current = fadeOut;
              fadeOut.start(({ finished: fadeOutFinished }) => {
                if (!fadeOutFinished || cancelled) return;
                goalAnimRef.current = null;
                setGoalSuggestion(null);
              });
            }, 6000);
          });
        }, appearDelay);
      }
    })();
    return () => {
      cancelled = true;
      if (goalAnimRef.current) { goalAnimRef.current.stop(); goalAnimRef.current = null; }
      if (goalTimerRef.current) { clearTimeout(goalTimerRef.current); goalTimerRef.current = null; }
    };
  }, [isOnboarding, progress?.currentPhase, progress?.puzzlesSolved, progress?.completedDifficulties]);

  // Talking animation for intro dialogue
  const [introIsTalking, setIntroIsTalking] = useState(false);
  useEffect(() => {
    if (showIntroDialogue) {
      const interval = setInterval(() => {
        setIntroIsTalking(prev => !prev);
      }, 300);
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

  // Pit button pulse when phase transition is pending
  useEffect(() => {
    if (!pitPhaseReady) {
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
  }, [pitPhaseReady, pitPulseAnim]);

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
      if (introContext === 'daily_unlock') {
        await markDailyChallengeIntroSeen();
      } else if (introContext === 'challenge_intro') {
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
      if (introContext === 'daily_unlock') {
        await markDailyChallengeIntroSeen();
      } else if (introContext === 'challenge_intro') {
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
    const today = new Date().toISOString().split('T')[0];
    if (last === today) return false;
    const lastDate = new Date(last);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 1;
  }, [progress?.currentStreak, progress?.lastPlayDate]);

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
    0: '#6fb7df', 1: '#6fb7df', 2: '#514378', 3: '#060612', 4: '#1a122a', 5: '#1E1830',
  }[progress.currentPhase] || '#6fb7df';

  // Phase-aware dialogue theme for all modals and dialogue boxes
  const dt = getDialogueTheme(progress.currentPhase);

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
                <Text style={styles.amberEmoji}>💎</Text>
              </Animated.View>
              <Text style={styles.amberCount}>{progress.amber}</Text>
              {!isOnboarding && <AmberSparkle />}
            </View>
          </View>
          {progress.currentStreak > 0 && (
            <View
              style={[styles.streakBadge, isStreakAtRisk && styles.streakAtRiskBadge]}
              accessibilityLabel={`${progress.currentStreak} day streak${isStreakAtRisk ? ', at risk' : ''}`}
            >
              <Text style={styles.streakBadgeEmoji}>{'\uD83D\uDD25'}</Text>
              <Text style={[styles.streakBadgeCount, isStreakAtRisk && styles.streakAtRiskCount]}>
                {progress.currentStreak}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {!isOnboarding && onStartDaily && isDailyChallengeUnlocked(progress.puzzlesSolved, progress.currentPhase) && (
            <DailyChallengeCard onStartDaily={(d) => { onStartDaily!(d); }} phase={progress.currentPhase} />
          )}
          {!isOnboarding && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                hapticLight();
                onOpenStats?.();
              }}
              accessibilityLabel="View stats"
              accessibilityRole="button"
            >
              <Text style={styles.headerIconText}>📊</Text>
            </TouchableOpacity>
          )}
          {!isOnboarding && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                hapticLight();
                onOpenSettings?.();
              }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Text style={styles.headerIconText}>⚙️</Text>
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

      {/* Next Unlock Progress Bar (hidden during early onboarding, shown during unlock_explained) */}
      {unlockFlow.nextUnlock && (!isOnboarding || onboardingStep === 'unlock_explained') && (
        <View
          style={styles.unlockProgressContainer}
          accessibilityLabel={`Next unlock. ${unlockFlow.nextUnlock.cost === 0 ? 'Free' : `${progress.amber} of ${unlockFlow.nextUnlock.cost} amber`}`}
          accessibilityRole="progressbar"
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
                : `💎 ${progress.amber} / ${unlockFlow.nextUnlock.cost}`}
            </Text>
          </View>
        </View>
      )}

      {/* Action Row — Gallery + Pit (hidden during onboarding) */}
      {!isOnboarding && (
        <View style={styles.actionRow}>
          {onOpenGallery && (
            <TouchableOpacity
              style={styles.actionRowButton}
              onPress={() => {
                hapticLight();
                onOpenGallery?.();
              }}
              accessibilityLabel="Whisper Gallery"
              accessibilityRole="button"
            >
              <Text style={styles.actionRowButtonText}>
                📜 {getGalleryTitle(progress.currentPhase)}
              </Text>
            </TouchableOpacity>
          )}
          {onOpenPit && (
            <Animated.View style={pitPhaseReady ? {
              transform: [{ scale: pitPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
              opacity: pitPulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.75, 1] }),
            } : undefined}>
              <TouchableOpacity
                style={[styles.actionRowButton, pitPhaseReady && styles.pitPhaseReadyButton]}
                onPress={() => {
                  hapticLight();
                  onOpenPit();
                }}
                accessibilityLabel={`${getPitHomeBadgeLabel(progress.currentPhase)}${pitPhaseReady ? ' - phase transition ready' : ''}${pendingHarvest && pendingHarvest.pendingBatches > 0 ? `: ${pendingHarvest.pendingWords} words pending` : ''}`}
                accessibilityRole="button"
              >
                <Text style={[styles.actionRowButtonText, pitPhaseReady && { color: '#FFD700' }]}>
                  {pitPhaseReady ? '🔥' : '⭕'} {getPitHomeBadgeLabel(progress.currentPhase)}
                  {pendingHarvest && pendingHarvest.pendingBatches > 0 && (
                    ` (${pendingHarvest.pendingWords})`
                  )}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          {isSacrificeAvailable(progress.currentPhase) && (
            <TouchableOpacity
              style={[styles.actionRowButton, styles.sacrificeButton]}
              onPress={() => {
                hapticSelection();
                setShowSacrificeModal(true);
              }}
              accessibilityLabel="Offer amber to the arrangement"
              accessibilityRole="button"
            >
              <Text style={styles.actionRowButtonText}>
                🕯️ {getSacrificePrompt(progress.currentPhase).title}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ambient home line — atmospheric text when idle (auto-dismiss with fade) */}
      {ambientLine && !isOnboarding && (
        <Animated.View style={[styles.ambientLineContainer, { opacity: ambientOpacity }]}>
          <Text
            style={[
              styles.ambientLineText,
              { color: getPhaseTheme(progress.currentPhase).modalSecondaryTextColor },
            ]}
          >
            {ambientLine}
          </Text>
        </Animated.View>
      )}

      {/* Goal suggestion — contextual next-action hint (auto-dismiss with fade) */}
      {goalSuggestion && !isOnboarding && (
        <Animated.View style={{ opacity: goalOpacity }}>
          <TouchableOpacity
            style={styles.goalSuggestionContainer}
            onPress={() => {
              if (goalSuggestion.action === 'daily' && onStartDaily) {
                onStartDaily('HARD' as Difficulty);
              } else if (goalSuggestion.action === 'play') {
                onPlayPuzzle();
              }
            }}
            activeOpacity={goalSuggestion.action === 'none' ? 1 : 0.7}
          >
            <Text
              style={[
                styles.goalSuggestionText,
                { color: getPhaseTheme(progress.currentPhase).modalTextColor },
              ]}
            >
              {goalSuggestion.text}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Celebration Confetti */}
      {showCelebration && (
        <CelebrationConfetti onComplete={() => setShowCelebration(false)} />
      )}

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
      />

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
          accessibilityLabel={dialogueFlow.cooldownMessage}
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
              Your Amber: 💎 {progress.amber}
            </Text>

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
                      💎 {unlockFlow.nextUnlock.cost} amber
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
                <Text style={styles.amberBalance}>Your Amber: 💎 {progress.amber}</Text>

                {unlockFlow.nextUnlock && unlockFlow.nextUnlock.targetId === unlockFlow.showRoomUnlock.id && (
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      styles.buyButtonLarge,
                      progress.amber < unlockFlow.nextUnlock.cost && styles.buyButtonDisabled,
                    ]}
                    onPress={() => unlockFlow.handlePurchase(unlockFlow.nextUnlock!)}
                    disabled={progress.amber < unlockFlow.nextUnlock.cost}
                    accessibilityLabel={`Unlock room for ${unlockFlow.nextUnlock.cost} amber`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.buyButtonText}>
                      Unlock for 💎 {unlockFlow.nextUnlock.cost}
                    </Text>
                  </TouchableOpacity>
                )}

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
                      Cost: 💎 {unlockFlow.nextUnlock!.cost} amber
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
              Your Amber: 💎 {progress.amber}
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
                      💎 {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
                {getSacrificeAmounts(progress.amber).length === 0 && (
                  <Text style={[styles.sacrificeNoAmber, { color: dt.subtitleColor }]}>
                    You don't have enough amber to offer.
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6fb7df',
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
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
  headerIconText: {
    fontSize: 16,
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
    backgroundColor: 'rgba(30, 60, 30, 0.85)',
    borderRadius: 12,
    padding: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  unlockProgressInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  unlockProgressLabel: {
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  unlockProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  unlockProgressBarBg: {
    flex: 2,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  unlockProgressBarFill: {
    height: '100%',
    backgroundColor: CandyColors.yellow.main,
    borderRadius: 4,
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
  nextUnlockContainer: {
    marginBottom: 24,
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 2,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    borderRadius: 10,
  },
  ambientLineText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  goalSuggestionContainer: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    zIndex: 10,
  },
  goalSuggestionText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.85,
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
});

export default HomeScreen;
