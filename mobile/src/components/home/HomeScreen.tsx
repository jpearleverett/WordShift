import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Animal, Room, DialoguePhase, HomeWorldProgress, Unlockable } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CandyColors } from '../../theme/colors';
import {
  loadProgress,
  getFullProgress,
  markDialogueRead,
  markIntroSeen,
  hasSeenIntro,
  devAddAmber,
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
  getTotalDialogueCount,
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
  formatTimeRemaining,
  updatePuzzleCount,
  isOnCooldown,
  clearAllSessions,
} from '../../services/dialogueSession';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// JUICY ANIMATED BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface JuicyButtonProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  bounceScale?: number;
}

const JuicyButton: React.FC<JuicyButtonProps> = ({
  onPress,
  style,
  children,
  disabled = false,
  bounceScale = 0.92,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle scale pulse (not opacity - keeps button fully visible)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: bounceScale,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  // Combine scale animations
  const combinedScale = Animated.multiply(scaleAnim, pulseAnim);

  return (
    <Animated.View style={{ transform: [{ scale: combinedScale }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={disabled}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CELEBRATION CONFETTI FOR PURCHASES
// ═══════════════════════════════════════════════════════════════════════════

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

const CelebrationConfetti: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 30; i++) {
      const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100;
      const piece: ConfettiPiece = {
        id: i,
        x: new Animated.Value(startX),
        y: new Animated.Value(SCREEN_HEIGHT / 2),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      newPieces.push(piece);

      // Animate each piece
      const targetX = startX + (Math.random() - 0.5) * 300;
      const targetY = SCREEN_HEIGHT + 100;

      Animated.parallel([
        Animated.timing(piece.x, {
          toValue: targetX,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.y, {
          toValue: targetY,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 720 - 360,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(piece.scale, {
            toValue: 1 + Math.random() * 0.5,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: 500,
            delay: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    setPieces(newPieces);

    const timeout = setTimeout(onComplete, 2500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {pieces.map(piece => {
        const rotate = piece.rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        });
        return (
          <Animated.View
            key={piece.id}
            style={[
              confettiStyles.piece,
              {
                backgroundColor: piece.color,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate },
                  { scale: piece.scale },
                ],
                opacity: piece.opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const confettiStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  piece: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// AMBER SPARKLE ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const AmberSparkle: React.FC = () => {
  const sparkles = useRef(
    [...Array(5)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    sparkles.forEach((sparkle, i) => {
      const animate = () => {
        sparkle.x.setValue(Math.random() * 30 - 15);
        sparkle.y.setValue(0);
        sparkle.opacity.setValue(0);
        sparkle.scale.setValue(0.5);

        Animated.parallel([
          Animated.timing(sparkle.y, {
            toValue: -20 - Math.random() * 10,
            duration: 1000,
            useNativeDriver: true,
            delay: i * 200,
          }),
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
              delay: i * 200,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(sparkle.scale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
            delay: i * 200,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, []);

  return (
    <View style={{ position: 'absolute', top: -5, right: 0 }}>
      {sparkles.map((sparkle, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            fontSize: 8,
            transform: [
              { translateX: sparkle.x },
              { translateY: sparkle.y },
              { scale: sparkle.scale },
            ],
            opacity: sparkle.opacity,
          }}
        >
          ✨
        </Animated.Text>
      ))}
    </View>
  );
};

interface HomeScreenProps {
  onPlayPuzzle: () => void;
  onAmberChange?: (newBalance: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayPuzzle,
  onAmberChange,
}) => {
  const [progress, setProgress] = useState<HomeWorldProgress | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRoomUnlock, setShowRoomUnlock] = useState<Room | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [showBuildPrompt, setShowBuildPrompt] = useState(false);
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

  // Intro dialogue state
  const [showIntroDialogue, setShowIntroDialogue] = useState(false);
  const [introAnimal, setIntroAnimal] = useState<Animal | null>(null);
  const [introDialogueIndex, setIntroDialogueIndex] = useState(0);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;
  const dialogueSlide = useRef(new Animated.Value(0)).current;

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

  // Timer for dismissing cooldown message
  useEffect(() => {
    if (cooldownMessage) {
      const timeout = setTimeout(() => {
        setCooldownMessage(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [cooldownMessage]);

  const loadAllData = async () => {
    const [progressData, roomsData, animalsData, unlock, unlocks] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
      getNextUnlock(),
      getUnlockStatus(),
    ]);

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
  const handleAnimalPress = (animal: Animal) => {
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
  };

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

      // Check if session hit max dialogues
      if (status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
        handleCloseDialogue();
        setCooldownMessage(
          `${selectedAnimal.name} wants to rest now. Come back later for more conversation!`
        );
        return;
      }

      // Advance to next dialogue
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
  const handleRoomPress = (room: Room) => {
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
  };

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

  // Get dialogue progress text
  const getDialogueProgress = (): string => {
    if (!selectedAnimal || !progress) return '';
    const current = selectedAnimal.currentDialogueIndex + 1;
    const total = getTotalDialogueCount(selectedAnimal.type, progress.currentPhase);
    return `${current}/${total}`;
  };

  // DEV: Add amber and reset dialogue sessions
  const handleDevButton = async () => {
    // Add 5000 amber
    const newBalance = await devAddAmber(5000);

    // Clear all dialogue sessions so animals can talk again
    await clearAllSessions();

    // Reload data
    await loadAllData();

    // Notify parent of amber change
    onAmberChange?.(newBalance);
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

        <JuicyButton
          style={styles.playButton}
          onPress={onPlayPuzzle}
          bounceScale={0.9}
        >
          <Text style={styles.playButtonText}>PLAY</Text>
        </JuicyButton>
      </View>

      {/* DEV Button - gives amber and resets dialogue sessions */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={handleDevButton}
      >
        <Text style={styles.devButtonText}>DEV</Text>
      </TouchableOpacity>

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
        <Animated.View style={styles.cooldownToast} pointerEvents="none">
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
              <>
                {/* Session status bar */}
                {sessionInfo && sessionInfo.status === 'in_session' && sessionInfo.dialoguesRemaining !== undefined && (
                  <View style={styles.sessionBar}>
                    <Text style={styles.sessionBarText}>
                      {sessionInfo.dialoguesRemaining > 3
                        ? `${selectedAnimal.name} has lots to say!`
                        : sessionInfo.dialoguesRemaining > 0
                          ? `${selectedAnimal.name} is getting tired...`
                          : `${selectedAnimal.name} needs to rest soon`}
                    </Text>
                  </View>
                )}

                {/* Animal portrait */}
                <View style={styles.portraitContainer}>
                  <Text style={styles.portraitEmoji}>
                    {ANIMAL_INFO[selectedAnimal.type]?.emoji || '🐾'}
                  </Text>
                  <View style={styles.nameContainer}>
                    <Text style={styles.animalName}>{selectedAnimal.name}</Text>
                    <Text style={styles.animalDescription}>
                      {ANIMAL_INFO[selectedAnimal.type]?.description}
                    </Text>
                  </View>
                </View>

                {/* Dialogue text */}
                <View style={styles.dialogueBubble}>
                  <Text style={styles.dialogueText}>{getCurrentDialogueText()}</Text>
                </View>

                {/* Progress and continue */}
                <View style={styles.dialogueFooter}>
                  <Text style={styles.dialogueProgress}>{getDialogueProgress()}</Text>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleAdvanceDialogue}
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
              </>
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
              <Text style={styles.allUnlockedText}>
                All characters and rooms unlocked!
              </Text>
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
                  <Text style={styles.introPortraitEmoji}>
                    {ANIMAL_INFO[introAnimal.type]?.emoji || '🐾'}
                  </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
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

  // DEV button
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
  dialogueModal: {
    backgroundColor: CandyColors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  portraitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  portraitEmoji: {
    fontSize: 50,
    marginRight: 16,
  },
  nameContainer: {
    flex: 1,
  },
  animalName: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.purple.main,
  },
  animalDescription: {
    fontSize: 13,
    color: CandyColors.gray[500],
    fontStyle: 'italic',
  },
  dialogueBubble: {
    backgroundColor: CandyColors.gray[100],
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  dialogueText: {
    fontSize: 16,
    color: CandyColors.gray[700],
    lineHeight: 24,
  },
  dialogueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogueProgress: {
    fontSize: 14,
    color: CandyColors.gray[400],
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: CandyColors.purple.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
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

  // Session status bar
  sessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CandyColors.purple.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sessionBarText: {
    color: CandyColors.purple.dark,
    fontSize: 12,
    fontWeight: '700',
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
});

export default HomeScreen;
