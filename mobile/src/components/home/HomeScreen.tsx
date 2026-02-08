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
import { Animal, Room, DialoguePhase, HomeWorldProgress, Unlockable, ROOM_DECORATIONS, Decoration, getDecorationsForRoom } from '../../types/homeWorld';
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
} from '../../services/amberCurrency';
import {
  ROOMS,
  ANIMALS,
  ANIMAL_EMOJIS,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getNextUnlock,
  purchaseUnlock,
  getUnlockStatus,
  isUnlockAvailable,
} from '../../services/homeWorldData';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  ANIMAL_INFO,
  getIntroDialogueLine,
  getIntroDialogueCount,
} from '../../services/animalDialogue';
import {
  loadDialogueSessions,
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSessionStatus,
  updatePuzzleCount,
} from '../../services/dialogueSession';

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
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRoomUnlock, setShowRoomUnlock] = useState<Room | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [nextUnlock, setNextUnlock] = useState<Unlockable | null>(null);
  const [allUnlocks, setAllUnlocks] = useState<Unlockable[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{
    status: 'available' | 'in_session' | 'cooldown';
    dialoguesRemaining?: number;
    puzzlesRemaining?: number;
  } | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [unlockAvailability, setUnlockAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);

  // Decoration shop state
  const [showDecorationShop, setShowDecorationShop] = useState(false);
  const [purchasedDecorations, setPurchasedDecorations] = useState<{ [roomId: string]: string[] }>({});

  // Intro dialogue state
  const [showIntroDialogue, setShowIntroDialogue] = useState(false);
  const [introAnimal, setIntroAnimal] = useState<Animal | null>(null);
  const [introDialogueIndex, setIntroDialogueIndex] = useState(0);

  // Talking animation state
  const [isTalking, setIsTalking] = useState(false);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;
  const dialogueSlide = useRef(new Animated.Value(0)).current;
  const cooldownOpacity = useRef(new Animated.Value(0)).current;
  const cooldownSlide = useRef(new Animated.Value(20)).current;

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadDialogueSessions(); // Load session data
  }, []);

  // Update session status when selected animal changes
  useEffect(() => {
    if (selectedAnimal) {
      const status = getSessionStatus(selectedAnimal.id);
      setSessionInfo(status);
    }
  }, [selectedAnimal]);

  // Timer for dismissing cooldown message with animation
  useEffect(() => {
    if (cooldownMessage) {
      // Animate in
      cooldownOpacity.setValue(0);
      cooldownSlide.setValue(20);
      Animated.parallel([
        Animated.timing(cooldownOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(cooldownSlide, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate out after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(cooldownOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(cooldownSlide, {
            toValue: 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCooldownMessage(null);
        });
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [cooldownMessage]);

  // Talking animation - alternate between idle and talk sprites
  useEffect(() => {
    if (showDialogue || showIntroDialogue) {
      const interval = setInterval(() => {
        setIsTalking(prev => !prev);
      }, 300); // Toggle every 300ms for talking effect
      return () => clearInterval(interval);
    } else {
      setIsTalking(false);
    }
  }, [showDialogue, showIntroDialogue]);

  const loadAllData = async () => {
    const [progressData, roomsData, animalsData, unlock, unlocks, decorations] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
      getNextUnlock(),
      getUnlockStatus(),
      getAllDecorations(),
    ]);
    setPurchasedDecorations(decorations);

    // Update puzzle count for dialogue session system
    updatePuzzleCount(progressData.puzzlesSolved);

    setProgress(progressData);
    setRooms(roomsData);
    setAnimals(animalsData);
    setNextUnlock(unlock);
    setAllUnlocks(unlocks);

    // Check availability of next unlock
    if (unlock) {
      const availability = await isUnlockAvailable(unlock.id);
      setUnlockAvailability(availability);
    } else {
      setUnlockAvailability(null);
    }

    // Check if there's an empty room waiting for an animal (first-time invite prompt)
    const unlockedRooms = roomsData.filter(r => r.isUnlocked);
    const unlockedAnimalIds = animalsData.filter(a => a.isUnlocked).map(a => a.id);
    const hasEmptyRoom = unlockedRooms.some(room => {
      const roomAnimal = animalsData.find(a => a.roomId === room.id);
      return roomAnimal && !unlockedAnimalIds.includes(roomAnimal.id);
    });

    // Show invite prompt if there's an empty room and the next unlock is a character
    if (hasEmptyRoom && unlock && unlock.type === 'character' && unlock.cost === 0) {
      // First-time experience: show invite prompt
      setShowInvitePrompt(true);
    } else {
      setShowInvitePrompt(false);
    }
  };

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

  // Handle animal tap
  const handleAnimalPress = useCallback((animal: Animal) => {
    // Check if dialogue is available
    const availability = checkDialogueAvailability(animal.id);

    if (!availability.available) {
      // Show cooldown message (vague, doesn't reveal puzzle count)
      setCooldownMessage(
        `${animal.name} needs some quiet time. Play more puzzles and come back!`
      );
      return;
    }

    setSelectedAnimal(animal);
    setShowDialogue(true);

    // Update session info
    const status = getSessionStatus(animal.id);
    setSessionInfo(status);

    // Animate dialogue modal in
    dialogueSlide.setValue(0);
    Animated.spring(dialogueSlide, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [dialogueSlide]);

  // Handle dialogue advance
  const handleAdvanceDialogue = async () => {
    if (!selectedAnimal || !progress) return;

    // Check session availability before continuing
    const availability = checkDialogueAvailability(selectedAnimal.id);
    if (!availability.available && availability.reason !== 'max_dialogues') {
      // Session ended, close dialogue
      handleCloseDialogue();
      setCooldownMessage(
        `${selectedAnimal.name} wants to rest now. Come back after solving some puzzles!`
      );
      return;
    }

    const hasMore = hasMoreDialogues(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      progress.currentPhase
    );

    if (hasMore) {
      // Record this dialogue in the session
      await recordDialogue(selectedAnimal.id);

      // Update session info
      const status = getSessionStatus(selectedAnimal.id);
      setSessionInfo(status);

      // Advance to next dialogue FIRST (before checking session limit)
      const newIndex = selectedAnimal.currentDialogueIndex + 1;
      await markDialogueRead(selectedAnimal.id, newIndex);

      // Update local state
      setAnimals(prev =>
        prev.map(a =>
          a.id === selectedAnimal.id
            ? { ...a, currentDialogueIndex: newIndex, hasNewDialogue: false }
            : a
        )
      );
      setSelectedAnimal(prev =>
        prev ? { ...prev, currentDialogueIndex: newIndex, hasNewDialogue: false } : null
      );

      // Check if session hit max dialogues AFTER advancing
      if (status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
        handleCloseDialogue();
        setCooldownMessage(
          `${selectedAnimal.name} wants to rest now. Come back later for more conversation!`
        );
        return;
      }
    } else {
      // No more dialogues - close
      handleCloseDialogue();
    }
  };

  // Handle closing dialogue (and ending session)
  const handleCloseDialogue = async () => {
    if (selectedAnimal) {
      await endSession(selectedAnimal.id);
    }
    setShowDialogue(false);
    setSelectedAnimal(null);
    setSessionInfo(null);
  };

  // Handle room tap (for locked rooms or rooms needing animals)
  const handleRoomPress = useCallback((room: Room) => {
    if (!room.isUnlocked) {
      setShowRoomUnlock(room);
      return;
    }

    // Check if room needs an animal
    const roomAnimal = animals.find(a => a.roomId === room.id);
    if (roomAnimal && !roomAnimal.isUnlocked && nextUnlock && nextUnlock.targetId === roomAnimal.id) {
      // Show invite prompt for this animal
      setShowInvitePrompt(true);
    }
  }, [animals, nextUnlock]);

  // Handle unlock purchase
  const handlePurchase = async (unlock: Unlockable) => {
    const result = await purchaseUnlock(unlock.id);
    if (result.success) {
      // Trigger celebration confetti!
      setShowCelebration(true);

      await loadAllData();
      setShowShop(false);
      setShowRoomUnlock(null);
      setShowInvitePrompt(false);
      onAmberChange?.(progress!.amber - unlock.cost);

      // If we just unlocked a character, show their intro dialogue
      if (unlock.type === 'character') {
        const animal = ANIMALS.find(a => a.id === unlock.targetId);
        if (animal) {
          // Small delay to let the UI update first
          setTimeout(() => {
            setIntroAnimal(animal);
            setIntroDialogueIndex(0);
            setShowIntroDialogue(true);
          }, 300);
        }
      }
    }
  };

  // Handle advancing intro dialogue
  const handleAdvanceIntroDialogue = async () => {
    if (!introAnimal) return;

    const totalIntro = getIntroDialogueCount(introAnimal.type);
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

  // Get current intro dialogue text
  const getCurrentIntroText = (): string => {
    if (!introAnimal) return '';
    return getIntroDialogueLine(introAnimal.type, introDialogueIndex) || '';
  };

  // Get intro dialogue progress text
  const getIntroProgress = (): string => {
    if (!introAnimal) return '';
    const current = introDialogueIndex + 1;
    const total = getIntroDialogueCount(introAnimal.type);
    return `${current}/${total}`;
  };

  // Check if there are more intro dialogues
  const hasMoreIntroDialogues = (): boolean => {
    if (!introAnimal) return false;
    return introDialogueIndex + 1 < getIntroDialogueCount(introAnimal.type);
  };

  // Get current dialogue text
  const getCurrentDialogueText = (): string => {
    if (!selectedAnimal || !progress) return '';
    const dialogue = getCurrentDialogue(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      progress.currentPhase
    );
    return dialogue?.text || 'Hello, friend!';
  };

  if (!progress || rooms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your home...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with amber and play button */}
      <View style={styles.header}>
        <JuicyButton
          style={styles.amberContainer}
          onPress={() => setShowShop(true)}
          bounceScale={0.95}
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

      {/* Next Unlock Progress Bar */}
      {nextUnlock && (
        <TouchableOpacity
          style={styles.unlockProgressContainer}
          onPress={() => setShowShop(true)}
          activeOpacity={0.8}
          accessibilityLabel={`Next unlock: ${nextUnlock.name}. ${nextUnlock.cost === 0 ? 'Free' : `${progress.amber} of ${nextUnlock.cost} amber`}`}
          accessibilityRole="button"
        >
          <View style={styles.unlockProgressInner}>
            <Text style={styles.unlockProgressLabel}>
              {nextUnlock.type === 'character' ? '🐾' : '🏠'} {nextUnlock.name}
            </Text>
            <View style={styles.unlockProgressBarBg}>
              <View
                style={[
                  styles.unlockProgressBarFill,
                  {
                    width: `${Math.min(100, nextUnlock.cost > 0
                      ? (progress.amber / nextUnlock.cost) * 100
                      : 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.unlockProgressText}>
              {nextUnlock.cost === 0
                ? 'FREE — Tap to invite!'
                : `💎 ${progress.amber} / ${nextUnlock.cost}`}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Daily Challenge Card */}
      {onStartDaily && (
        <DailyChallengeCard onStartDaily={onStartDaily} />
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
        onAnimalPress={handleAnimalPress}
        onRoomPress={handleRoomPress}
      />

      {/* Cooldown Message Toast */}
      {cooldownMessage && (
        <Animated.View
          style={[
            styles.cooldownToast,
            {
              opacity: cooldownOpacity,
              transform: [{ translateY: cooldownSlide }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.cooldownToastText}>{cooldownMessage}</Text>
        </Animated.View>
      )}

      {/* Dialogue Modal */}
      <Modal
        visible={showDialogue}
        transparent
        animationType="none"
        onRequestClose={handleCloseDialogue}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseDialogue}
        >
          <Animated.View
            style={[
              styles.dialogueModal,
              {
                transform: [
                  {
                    translateY: dialogueSlide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
                opacity: dialogueSlide,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {selectedAnimal && (
              <View style={styles.dialogueRow}>
                {/* Sprite column - 30% width, zoomed in to fill */}
                <View style={styles.dialogueSpriteCol}>
                  {CHARACTER_SPRITES[selectedAnimal.type] ? (
                    <Image
                      source={
                        progress.currentPhase >= 4 && CHARACTER_SPRITES[selectedAnimal.type]?.robed
                          ? CHARACTER_SPRITES[selectedAnimal.type]!.robed!
                          : isTalking && CHARACTER_SPRITES[selectedAnimal.type]?.talk
                            ? CHARACTER_SPRITES[selectedAnimal.type]!.talk!
                            : CHARACTER_SPRITES[selectedAnimal.type]!.idle
                      }
                      style={styles.dialogueSpriteImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.dialogueSpriteEmoji}>
                      {ANIMAL_INFO[selectedAnimal.type]?.emoji || '🐾'}
                    </Text>
                  )}
                </View>

                {/* Text column - 70% width */}
                <View style={styles.dialogueTextCol}>
                  <Text style={styles.dialogueAnimalName}>{selectedAnimal.name}</Text>

                  <View style={styles.dialogueBubble}>
                    <Text style={styles.dialogueText}>{getCurrentDialogueText()}</Text>
                  </View>

                  <View style={styles.dialogueFooter}>
                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={handleAdvanceDialogue}
                      accessibilityLabel="Continue dialogue"
                      accessibilityRole="button"
                    >
                      <Text style={styles.continueButtonText}>
                        {hasMoreDialogues(
                          selectedAnimal.type,
                          selectedAnimal.currentDialogueIndex,
                          progress.currentPhase
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
        visible={showShop}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShop(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShop(false)}
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
            {nextUnlock && (
              <View style={styles.nextUnlockContainer}>
                <Text style={styles.nextUnlockLabel}>Next Unlock:</Text>
                <View style={styles.unlockItem}>
                  <View style={styles.unlockInfo}>
                    <Text style={styles.unlockName}>{nextUnlock.name}</Text>
                    <Text style={styles.unlockDescription}>
                      {nextUnlock.description}
                    </Text>
                    <Text style={styles.unlockCost}>
                      💎 {nextUnlock.cost} amber
                    </Text>
                    {unlockAvailability && !unlockAvailability.available && (
                      <Text style={styles.unlockBlockedText}>
                        {unlockAvailability.reason}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      (progress.amber < nextUnlock.cost ||
                       (unlockAvailability && !unlockAvailability.available)) &&
                        styles.buyButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(nextUnlock)}
                    disabled={
                      progress.amber < nextUnlock.cost ||
                      (unlockAvailability !== null && !unlockAvailability.available)
                    }
                  >
                    <Text style={styles.buyButtonText}>
                      {unlockAvailability && !unlockAvailability.available
                        ? 'Locked'
                        : progress.amber >= nextUnlock.cost
                          ? 'Unlock'
                          : 'Need More'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!nextUnlock && (
              <View>
                <Text style={styles.allUnlockedText}>
                  All characters and rooms unlocked!
                </Text>
                <TouchableOpacity
                  style={styles.decorationShopButton}
                  onPress={() => {
                    setShowShop(false);
                    setShowDecorationShop(true);
                  }}
                >
                  <Text style={styles.decorationShopButtonIcon}>🎨</Text>
                  <Text style={styles.decorationShopButtonText}>Browse Decorations</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowShop(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Room Unlock Modal */}
      <Modal
        visible={showRoomUnlock !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoomUnlock(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoomUnlock(null)}
        >
          <View
            style={styles.shopModal}
            onStartShouldSetResponder={() => true}
          >
            {showRoomUnlock && (
              <>
                <Text style={styles.shopTitle}>🔒 Locked Room</Text>
                <Text style={styles.lockedRoomName}>{showRoomUnlock.name}</Text>
                <Text style={styles.shopSubtitle}>
                  Play more puzzles to earn amber and unlock this room!
                </Text>
                <Text style={styles.amberBalance}>Your Amber: 💎 {progress.amber}</Text>

                {nextUnlock && nextUnlock.targetId === showRoomUnlock.id && (
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      styles.buyButtonLarge,
                      progress.amber < nextUnlock.cost && styles.buyButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(nextUnlock)}
                    disabled={progress.amber < nextUnlock.cost}
                  >
                    <Text style={styles.buyButtonText}>
                      Unlock for 💎 {nextUnlock.cost}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowRoomUnlock(null)}
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
        visible={showInvitePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvitePrompt(false)}
      >
        <View style={styles.centeredOverlay}>
          <View
            style={styles.inviteModal}
            onStartShouldSetResponder={() => true}
          >
            {nextUnlock && nextUnlock.type === 'character' && (() => {
              const animalData = ANIMALS.find(a => a.id === nextUnlock.targetId);
              const animalEmoji = animalData ? ANIMAL_EMOJIS[animalData.type] : '🐾';
              const isFirstAnimal = progress?.unlockedAnimals.length === 0;

              return (
                <>
                  <Text style={styles.inviteEmoji}>{animalEmoji}</Text>
                  <Text style={styles.inviteTitle}>
                    {isFirstAnimal ? 'A Visitor Approaches!' : 'A New Friend!'}
                  </Text>
                  <Text style={styles.inviteText}>
                    {nextUnlock.description}
                  </Text>
                  <Text style={styles.inviteText}>
                    {isFirstAnimal
                      ? 'Would you like to invite them into your cozy den?'
                      : `Would you like to welcome ${nextUnlock.name.split(' ')[0]} to your growing home?`
                    }
                  </Text>

                  {nextUnlock.cost > 0 && (
                    <Text style={styles.inviteCost}>
                      Cost: 💎 {nextUnlock.cost} amber
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.inviteButton,
                      progress && progress.amber < nextUnlock.cost && styles.inviteButtonDisabled
                    ]}
                    onPress={async () => {
                      await handlePurchase(nextUnlock);
                      setShowInvitePrompt(false);
                    }}
                    disabled={progress ? progress.amber < nextUnlock.cost : false}
                  >
                    <Text style={styles.inviteButtonText}>
                      {nextUnlock.cost === 0
                        ? 'Welcome, Friend! 🏠'
                        : progress && progress.amber >= nextUnlock.cost
                          ? `Invite ${nextUnlock.name.split(' ')[0]}! 🏠`
                          : 'Need More Amber'
                      }
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inviteCloseButton}
                    onPress={() => setShowInvitePrompt(false)}
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
                          <Text style={styles.decorationDesc}>{dec.description}</Text>
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
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D5A27',
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
    minHeight: 260,
  },
  dialogueSpriteCol: {
    width: '30%',
    backgroundColor: CandyColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dialogueSpriteImage: {
    width: '120%',
    height: '90%',
  },
  dialogueSpriteEmoji: {
    fontSize: Math.min(80, SCREEN_WIDTH * 0.2),
  },
  dialogueTextCol: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  dialogueAnimalName: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.purple.dark,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  dialogueBubble: {
    backgroundColor: CandyColors.gray[100],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flex: 1,
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
});

export default HomeScreen;
