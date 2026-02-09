import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Animal, Room, DialoguePhase, HomeWorldProgress, Unlockable, ROOM_DECORATIONS, Decoration, getDecorationsForRoom, getDecorationDescription, getAnimalPhase } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CHARACTER_SPRITES } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';
import {
  loadProgress,
  getFullProgress,
  markDialogueRead,
  markIntroSeen,
  hasSeenIntro,
  purchaseDecoration,
  getAllDecorations,
  markHouseCompleted,
  isHouseCompleted,
  devAddAmber,
  devAddPuzzles,
} from '../../services/amberCurrency';
import { getHouseCompletionText } from '../../services/phaseNarrative';
import {
  ROOMS,
  ANIMALS,
  ANIMAL_EMOJIS,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getRoomDescription,
} from '../../services/homeWorldData';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  ANIMAL_INFO,
  getIntroDialogueLine,
  getIntroDialogueCount,
  getCatchupIntroDialogue,
  getCatchupIntroDialogueCount,
} from '../../services/animalDialogue';
import {
  loadDialogueSessions,
  updatePuzzleCount,
  clearAllSessions,
} from '../../services/dialogueSession';

import { useDialogueFlow } from '../../hooks/useDialogueFlow';
import { useUnlockFlow } from '../../hooks/useUnlockFlow';

import { JuicyButton } from './JuicyButton';
import { CelebrationConfetti } from './CelebrationConfetti';
import { AmberSparkle } from './AmberSparkle';
import { DailyChallengeCard } from '../DailyChallengeCard';
import { Difficulty } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeScreenProps {
  onPlayPuzzle: (difficulty?: Difficulty) => void;
  onAmberChange?: (newBalance: number) => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onStartDaily?: (difficulty: Difficulty) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayPuzzle,
  onAmberChange,
  onOpenSettings,
  onOpenStats,
  onStartDaily,
}) => {
  const [progress, setProgress] = useState<HomeWorldProgress | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);

  // Decoration shop state
  const [showDecorationShop, setShowDecorationShop] = useState(false);
  const [purchasedDecorations, setPurchasedDecorations] = useState<{ [roomId: string]: string[] }>({});

  // Intro dialogue state
  const [showIntroDialogue, setShowIntroDialogue] = useState(false);
  const [introAnimal, setIntroAnimal] = useState<Animal | null>(null);
  const [introDialogueIndex, setIntroDialogueIndex] = useState(0);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // House completion ceremony state
  const [showHouseCompletion, setShowHouseCompletion] = useState(false);
  const [houseCompletionTextIndex, setHouseCompletionTextIndex] = useState(0);

  // Dialogue flow hook
  const dialogueFlow = useDialogueFlow({
    progress,
    setAnimals,
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
    const [progressData, roomsData, animalsData, decorations] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
      getAllDecorations(),
    ]);
    setPurchasedDecorations(decorations);

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
  }, [unlockFlow.refreshUnlockData]);

  // Keep the ref in sync
  loadAllDataRef.current = loadAllData;

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadDialogueSessions(); // Load session data
  }, []);

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

  // DEV: Add amber, advance puzzles, clear dialogue cooldowns
  const handleDevButton = async () => {
    const newBalance = await devAddAmber(5000);
    await devAddPuzzles(30);
    await clearAllSessions();
    await loadAllData();
    onAmberChange?.(newBalance);
  };

  // Handle advancing intro dialogue
  const handleAdvanceIntroDialogue = async () => {
    if (!introAnimal || !progress) return;

    const totalIntro = shouldUseCatchup()
      ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
      : getIntroDialogueCount(introAnimal.type);
    const nextIndex = introDialogueIndex + 1;

    if (nextIndex < totalIntro) {
      // More intro lines to show
      setIntroDialogueIndex(nextIndex);
    } else {
      // Intro complete - mark as seen and close
      await markIntroSeen(introAnimal.id);
      setShowIntroDialogue(false);
      setIntroAnimal(null);
      setIntroDialogueIndex(0);
    }
  };

  // Handle closing intro dialogue
  const handleCloseIntroDialogue = async () => {
    if (introAnimal) {
      // Mark intro as seen even if closed early
      await markIntroSeen(introAnimal.id);
    }
    setShowIntroDialogue(false);
    setIntroAnimal(null);
    setIntroDialogueIndex(0);
  };

  // Determine if catch-up dialogues should be used (animal unlocked at Phase 2+)
  const shouldUseCatchup = (): boolean => {
    if (!introAnimal || !progress) return false;
    return getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase) > 0;
  };

  // Get current intro dialogue text (uses catch-up dialogues at Phase 2+)
  const getCurrentIntroText = (): string => {
    if (!introAnimal || !progress) return '';
    if (shouldUseCatchup()) {
      return getCatchupIntroDialogue(introAnimal.type, progress.currentPhase, introDialogueIndex) || '';
    }
    return getIntroDialogueLine(introAnimal.type, introDialogueIndex) || '';
  };

  // Get intro dialogue progress text
  const getIntroProgress = (): string => {
    if (!introAnimal || !progress) return '';
    const current = introDialogueIndex + 1;
    const total = shouldUseCatchup()
      ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
      : getIntroDialogueCount(introAnimal.type);
    return `${current}/${total}`;
  };

  // Check if there are more intro dialogues
  const hasMoreIntroDialogues = (): boolean => {
    if (!introAnimal || !progress) return false;
    const total = shouldUseCatchup()
      ? getCatchupIntroDialogueCount(introAnimal.type, progress.currentPhase)
      : getIntroDialogueCount(introAnimal.type);
    return introDialogueIndex + 1 < total;
  };

  if (!progress || rooms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your home...</Text>
      </View>
    );
  }

  const phaseBgColor = {
    0: '#6fb7df', 1: '#6fb7df', 2: '#514378', 3: '#060612', 4: '#1a122a',
  }[progress.currentPhase] || '#6fb7df';

  return (
    <View style={[styles.container, { backgroundColor: phaseBgColor }]}>
      {/* Header with amber and play button */}
      <View style={styles.header}>
        <JuicyButton
          style={styles.amberContainer}
          onPress={() => unlockFlow.setShowShop(true)}
          bounceScale={0.95}
          accessibilityLabel={`Shop. ${progress.amber} amber`}
          accessibilityRole="button"
        >
          <View style={styles.amberInner}>
            <Animated.View style={{ transform: [{ scale: amberPulse }] }}>
              <Text style={styles.amberEmoji}>💎</Text>
            </Animated.View>
            <Text style={styles.amberCount}>{progress.amber}</Text>
            <Text style={styles.amberPlus}>+</Text>
            <AmberSparkle />
          </View>
        </JuicyButton>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Animal House</Text>
          <Text style={styles.subtitle}>
            Phase {progress.currentPhase + 1}/5 - {progress.puzzlesSolved} puzzles
          </Text>
        </View>

        <View style={styles.headerRight}>
          {onStartDaily && (
            <DailyChallengeCard onStartDaily={onStartDaily} phase={progress.currentPhase} />
          )}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onOpenStats}
            accessibilityLabel="View stats"
            accessibilityRole="button"
          >
            <Text style={styles.headerIconText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onOpenSettings}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Text style={styles.headerIconText}>⚙️</Text>
          </TouchableOpacity>
          <JuicyButton
            style={styles.playButton}
            onPress={() => onPlayPuzzle()}
            bounceScale={0.9}
            accessibilityLabel="Play puzzle"
            accessibilityRole="button"
          >
            <Text style={styles.playButtonText}>PLAY</Text>
          </JuicyButton>
        </View>
      </View>

      {/* DEV button for testing */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.devButton}
          onPress={handleDevButton}
        >
          <Text style={styles.devButtonText}>DEV</Text>
        </TouchableOpacity>
      )}

      {/* Next Unlock Progress Bar */}
      {unlockFlow.nextUnlock && (
        <TouchableOpacity
          style={styles.unlockProgressContainer}
          onPress={() => unlockFlow.setShowShop(true)}
          activeOpacity={0.8}
          accessibilityLabel={`Next unlock: ${unlockFlow.nextUnlock.name}. ${unlockFlow.nextUnlock.cost === 0 ? 'Free' : `${progress.amber} of ${unlockFlow.nextUnlock.cost} amber`}`}
          accessibilityRole="button"
        >
          <View style={styles.unlockProgressInner}>
            <Text style={styles.unlockProgressLabel}>
              {unlockFlow.nextUnlock.type === 'character' ? '🐾' : '🏠'} {unlockFlow.nextUnlock.name}
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
                ? 'FREE — Tap to invite!'
                : `💎 ${progress.amber} / ${unlockFlow.nextUnlock.cost}`}
            </Text>
          </View>
        </TouchableOpacity>
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
      />

      {/* Cooldown Message Toast */}
      {dialogueFlow.cooldownMessage && (
        <Animated.View
          style={[
            styles.cooldownToast,
            {
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
        animationType="none"
        onRequestClose={dialogueFlow.handleCloseDialogue}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={dialogueFlow.handleCloseDialogue}
          accessibilityLabel="Close dialogue"
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              styles.dialogueModal,
              {
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
            {dialogueFlow.selectedAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column - 30% width, zoomed in to fill */}
                <View style={styles.dialogueSpriteCol}>
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
                  <Text style={styles.dialogueAnimalName}>{dialogueFlow.selectedAnimal.name}</Text>

                  {/* Trigger word reaction / tutorial callback — animal noticed a word or Fox recalls tutorial */}
                  {dialogueFlow.triggerReaction && progress.currentPhase >= 2 && (
                    <View style={[
                      styles.triggerReactionBubble,
                      progress.currentPhase >= 3 && styles.triggerReactionBubbleDark,
                    ]}>
                      <Text style={[
                        styles.triggerReactionText,
                        progress.currentPhase >= 3 && styles.triggerReactionTextDark,
                      ]}>
                        {dialogueFlow.triggerReaction}
                      </Text>
                    </View>
                  )}

                  {/* Cross-animal reference — one-off line mentioning another animal */}
                  {dialogueFlow.crossAnimalRef && (
                    <View style={[
                      styles.triggerReactionBubble,
                      progress.currentPhase >= 3 && styles.triggerReactionBubbleDark,
                    ]}>
                      <Text style={[
                        styles.triggerReactionText,
                        progress.currentPhase >= 3 && styles.triggerReactionTextDark,
                      ]}>
                        {dialogueFlow.crossAnimalRef}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogueBubble}>
                    <Text style={styles.dialogueText}>{dialogueFlow.dialogueText}</Text>
                  </View>

                  <View style={styles.dialogueFooter}>
                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={dialogueFlow.handleNextDialogue}
                      accessibilityLabel="Continue dialogue"
                      accessibilityRole="button"
                    >
                      <Text style={styles.continueButtonText}>
                        {hasMoreDialogues(
                          dialogueFlow.selectedAnimal.type,
                          dialogueFlow.selectedAnimal.currentDialogueIndex,
                          getAnimalPhase(progress.currentPhase, dialogueFlow.selectedAnimal.type)
                        )
                          ? 'Next'
                          : 'Close'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowShop(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowShop(false)}
          accessibilityLabel="Close shop"
          accessibilityRole="button"
        >
          <View
            style={styles.shopModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.shopTitle}>Unlock Progress</Text>
            <Text style={styles.shopSubtitle}>
              Your Amber: 💎 {progress.amber}
            </Text>

            {/* Next unlock */}
            {unlockFlow.nextUnlock && (
              <View style={styles.nextUnlockContainer}>
                <Text style={styles.nextUnlockLabel}>Next Unlock:</Text>
                <View style={styles.unlockItem}>
                  <View style={styles.unlockInfo}>
                    <Text style={styles.unlockName}>{unlockFlow.nextUnlock.name}</Text>
                    <Text style={styles.unlockDescription}>
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
                <TouchableOpacity
                  style={styles.decorationShopButton}
                  onPress={() => {
                    unlockFlow.setShowShop(false);
                    setShowDecorationShop(true);
                  }}
                  accessibilityLabel="Browse decorations"
                  accessibilityRole="button"
                >
                  <Text style={styles.decorationShopButtonIcon}>🎨</Text>
                  <Text style={styles.decorationShopButtonText}>Browse Decorations</Text>
                </TouchableOpacity>
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
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowRoomUnlock(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => unlockFlow.setShowRoomUnlock(null)}
          accessibilityLabel="Close room unlock"
          accessibilityRole="button"
        >
          <View
            style={styles.shopModal}
            onStartShouldSetResponder={() => true}
          >
            {unlockFlow.showRoomUnlock && (
              <>
                <Text style={styles.shopTitle}>🔒 Locked Room</Text>
                <Text style={styles.lockedRoomName}>{unlockFlow.showRoomUnlock.name}</Text>
                <Text style={styles.shopSubtitle}>
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
        animationType="fade"
        onRequestClose={() => unlockFlow.setShowInvitePrompt(false)}
      >
        <View style={styles.centeredOverlay}>
          <View
            style={styles.inviteModal}
            onStartShouldSetResponder={() => true}
          >
            {unlockFlow.nextUnlock && unlockFlow.nextUnlock.type === 'character' && (() => {
              const animalData = ANIMALS.find(a => a.id === unlockFlow.nextUnlock!.targetId);
              const animalEmoji = animalData ? ANIMAL_EMOJIS[animalData.type] : '🐾';
              const isFirstAnimal = progress?.unlockedAnimals.length === 0;

              return (
                <>
                  <Text style={styles.inviteEmoji}>{animalEmoji}</Text>
                  <Text style={styles.inviteTitle}>
                    {isFirstAnimal ? 'A Visitor Approaches!' : 'A New Friend!'}
                  </Text>
                  <Text style={styles.inviteText}>
                    {unlockFlow.nextUnlock!.description}
                  </Text>
                  <Text style={styles.inviteText}>
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
                      progress && progress.amber < unlockFlow.nextUnlock!.cost && styles.inviteButtonDisabled
                    ]}
                    onPress={async () => {
                      await unlockFlow.handlePurchase(unlockFlow.nextUnlock!);
                      unlockFlow.setShowInvitePrompt(false);
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

                  <TouchableOpacity
                    style={styles.inviteCloseButton}
                    onPress={() => unlockFlow.setShowInvitePrompt(false)}
                    accessibilityLabel="Maybe later"
                    accessibilityRole="button"
                  >
                    <Text style={styles.inviteCloseButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
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
        animationType="fade"
        onRequestClose={handleCloseIntroDialogue}
      >
        <View style={styles.centeredOverlay}>
          <View
            style={styles.introDialogueModal}
            onStartShouldSetResponder={() => true}
          >
            {introAnimal && (
              <>
                {/* Animal portrait */}
                <View style={styles.introPortraitContainer}>
                  {CHARACTER_SPRITES[introAnimal.type] ? (
                    <Image
                      source={
                        progress && progress.currentPhase >= 4 && CHARACTER_SPRITES[introAnimal.type]?.robed
                          ? CHARACTER_SPRITES[introAnimal.type]!.robed!
                          : CHARACTER_SPRITES[introAnimal.type]?.talk || CHARACTER_SPRITES[introAnimal.type]!.idle
                      }
                      style={styles.introPortraitSprite}
                      resizeMode="contain"
                      accessibilityLabel={`${introAnimal.name} portrait`}
                    />
                  ) : (
                    <Text style={styles.introPortraitEmoji}>
                      {ANIMAL_INFO[introAnimal.type]?.emoji || '🐾'}
                    </Text>
                  )}
                </View>

                <Text style={styles.introAnimalName}>{introAnimal.name}</Text>
                <Text style={styles.introAnimalTitle}>
                  {ANIMAL_INFO[introAnimal.type]?.description}
                </Text>

                {/* Dialogue text */}
                <View style={styles.introDialogueBubble}>
                  <Text style={styles.introDialogueText}>{getCurrentIntroText()}</Text>
                </View>

                {/* Progress and continue */}
                <View style={styles.introDialogueFooter}>
                  <Text style={styles.introDialogueProgress}>{getIntroProgress()}</Text>
                  <TouchableOpacity
                    style={styles.introContinueButton}
                    onPress={handleAdvanceIntroDialogue}
                    accessibilityLabel={hasMoreIntroDialogues() ? 'Continue intro' : 'Welcome and close'}
                    accessibilityRole="button"
                  >
                    <Text style={styles.introContinueButtonText}>
                      {hasMoreIntroDialogues() ? 'Continue' : 'Welcome!'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Decoration Shop Modal */}
      <Modal
        visible={showDecorationShop}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDecorationShop(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDecorationShop(false)}
          accessibilityLabel="Close decoration shop"
          accessibilityRole="button"
        >
          <View
            style={styles.decorationShopModal}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.shopTitle}>Room Decorations</Text>
            <Text style={styles.shopSubtitle}>
              Your Amber: 💎 {progress.amber}
            </Text>

            {rooms.filter(r => r.isUnlocked).map(room => {
              const roomDecorations = getDecorationsForRoom(room.theme);
              const roomPurchased = purchasedDecorations[room.id] || [];
              if (roomDecorations.length === 0) return null;

              return (
                <View key={room.id} style={styles.decorationRoomSection}>
                  <Text style={styles.decorationRoomName}>{room.name}</Text>
                  {roomDecorations.map(dec => {
                    const isPurchased = roomPurchased.includes(dec.id);
                    return (
                      <View key={dec.id} style={styles.decorationItem}>
                        <Text style={styles.decorationIcon}>{dec.icon}</Text>
                        <View style={styles.decorationInfo}>
                          <Text style={styles.decorationName}>{dec.name}</Text>
                          <Text style={styles.decorationDesc}>
                            {getDecorationDescription(dec, progress.currentPhase)}
                          </Text>
                        </View>
                        {isPurchased ? (
                          <View style={styles.decorationOwnedBadge}>
                            <Text style={styles.decorationOwnedText}>Owned</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.decorationBuyBtn,
                              progress.amber < dec.cost && styles.buyButtonDisabled,
                            ]}
                            disabled={progress.amber < dec.cost}
                            onPress={async () => {
                              const result = await purchaseDecoration(room.id, dec.id, dec.cost);
                              if (result.success) {
                                await loadAllData();
                                onAmberChange?.(result.newBalance);
                              }
                            }}
                            accessibilityLabel={`Buy ${dec.name} for ${dec.cost} amber`}
                            accessibilityRole="button"
                          >
                            <Text style={styles.decorationBuyText}>💎 {dec.cost}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDecorationShop(false)}
              accessibilityLabel="Close decoration shop"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* House Completion Ceremony Modal */}
      <Modal
        visible={showHouseCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHouseCompletion(false)}
      >
        <View style={styles.centeredOverlay}>
          <View
            style={[styles.houseCompletionModal, progress.currentPhase >= 3 && styles.houseCompletionModalDark]}
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
                    progress.currentPhase >= 3 && styles.houseCompletionTitleDark,
                  ]}>
                    {progress.currentPhase >= 4 ? 'The Temple' : 'The House is Complete'}
                  </Text>
                  <Text style={[
                    styles.houseCompletionText,
                    progress.currentPhase >= 3 && styles.houseCompletionTextDark,
                  ]}>
                    {lines[houseCompletionTextIndex]}
                  </Text>
                  <View style={styles.introDialogueFooter}>
                    <Text style={styles.introDialogueProgress}>
                      {houseCompletionTextIndex + 1}/{lines.length}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.introContinueButton,
                        progress.currentPhase >= 3 && styles.houseCompletionButton,
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
  },
  loadingText: {
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
  },
  amberContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
  amberPlus: {
    color: CandyColors.yellow.main,
    fontSize: 16,
    fontWeight: '900',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  title: {
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: CandyColors.green.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  devButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 70 : 110,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1000,
  },
  devButtonText: {
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '900',
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
    backgroundColor: CandyColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  dialogueRow: {
    flexDirection: 'row',
  },
  dialogueSpriteCol: {
    width: '30%',
    backgroundColor: CandyColors.gray[100],
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
    color: CandyColors.purple.dark,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  triggerReactionBubble: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
  },
  triggerReactionBubbleDark: {
    backgroundColor: 'rgba(80, 20, 40, 0.3)',
    borderColor: 'rgba(120, 40, 60, 0.4)',
  },
  triggerReactionText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    color: CandyColors.purple.main,
    textAlign: 'center',
  },
  triggerReactionTextDark: {
    color: '#C77DBA',
  },
  dialogueBubble: {
    backgroundColor: CandyColors.gray[100],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dialogueText: {
    fontSize: 15,
    color: CandyColors.gray[700],
    lineHeight: 22,
  },
  dialogueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  continueButton: {
    backgroundColor: CandyColors.purple.main,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: CandyColors.purple.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  // Shop modal
  shopModal: {
    backgroundColor: CandyColors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  shopTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 8,
  },
  shopSubtitle: {
    fontSize: 16,
    color: CandyColors.gray[500],
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
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    padding: 16,
  },
  unlockInfo: {
    flex: 1,
  },
  unlockName: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.gray[700],
  },
  unlockDescription: {
    fontSize: 12,
    color: CandyColors.gray[500],
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
    backgroundColor: CandyColors.gray[200],
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
  },
  closeButtonText: {
    color: CandyColors.gray[600],
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
    backgroundColor: CandyColors.orange.main,
    borderRadius: 16,
    padding: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cooldownToastText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Invite modal styles
  inviteModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  inviteEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 16,
  },
  inviteText: {
    fontSize: 16,
    color: CandyColors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  inviteButton: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 16,
    shadowColor: CandyColors.green.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
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

  // Intro dialogue modal styles
  introDialogueModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    maxWidth: 380,
    width: '90%',
  },
  introPortraitContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CandyColors.purple.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  introPortraitEmoji: {
    fontSize: 50,
  },
  introPortraitSprite: {
    width: 80,
    height: 80,
  },
  introAnimalName: {
    fontSize: 28,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 4,
  },
  introAnimalTitle: {
    fontSize: 14,
    color: CandyColors.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  introDialogueBubble: {
    backgroundColor: CandyColors.gray[100],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  introDialogueText: {
    fontSize: 16,
    color: CandyColors.gray[700],
    lineHeight: 24,
    textAlign: 'center',
  },
  introDialogueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  introDialogueProgress: {
    fontSize: 14,
    color: CandyColors.gray[400],
    fontWeight: '600',
  },
  introContinueButton: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: CandyColors.green.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  introContinueButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  // Decoration shop styles
  decorationShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.purple.light,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    gap: 8,
  },
  decorationShopButtonIcon: {
    fontSize: 20,
  },
  decorationShopButtonText: {
    color: CandyColors.purple.main,
    fontSize: 15,
    fontWeight: '800',
  },
  decorationShopModal: {
    backgroundColor: CandyColors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  decorationRoomSection: {
    marginBottom: 16,
  },
  decorationRoomName: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.purple.main,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: CandyColors.gray[200],
  },
  decorationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  decorationIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  decorationInfo: {
    flex: 1,
  },
  decorationName: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.gray[700],
  },
  decorationDesc: {
    fontSize: 11,
    color: CandyColors.gray[400],
    marginTop: 1,
  },
  decorationBuyBtn: {
    backgroundColor: CandyColors.green.main,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  decorationBuyText: {
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  decorationOwnedBadge: {
    backgroundColor: CandyColors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  decorationOwnedText: {
    color: CandyColors.gray[500],
    fontSize: 12,
    fontWeight: '700',
  },

  // House completion ceremony styles
  houseCompletionModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 30,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    maxWidth: 380,
    width: '90%',
  },
  houseCompletionModalDark: {
    backgroundColor: '#0A0510',
    borderWidth: 1,
    borderColor: 'rgba(140, 100, 60, 0.3)',
  },
  houseCompletionEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  houseCompletionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 20,
  },
  houseCompletionTitleDark: {
    color: '#C4A882',
  },
  houseCompletionText: {
    fontSize: 16,
    color: CandyColors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  houseCompletionTextDark: {
    color: '#8A7A9A',
  },
  houseCompletionButton: {
    backgroundColor: '#3D1560',
  },
});

export default HomeScreen;
