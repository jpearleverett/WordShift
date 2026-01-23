import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Animal, Room, DialoguePhase, HomeWorldProgress, Unlockable } from '../../types/homeWorld';
import { HouseWorld } from './HouseWorld';
import { CandyColors } from '../../theme/colors';
import {
  loadProgress,
  getFullProgress,
  markDialogueRead,
} from '../../services/amberCurrency';
import {
  ROOMS,
  ANIMALS,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getNextUnlock,
  purchaseUnlock,
  getUnlockStatus,
} from '../../services/homeWorldData';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  getTotalDialogueCount,
  ANIMAL_INFO,
} from '../../services/animalDialogue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [nextUnlock, setNextUnlock] = useState<Unlockable | null>(null);
  const [allUnlocks, setAllUnlocks] = useState<Unlockable[]>([]);

  // Animations
  const amberPulse = useRef(new Animated.Value(1)).current;
  const dialogueSlide = useRef(new Animated.Value(0)).current;

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [progressData, roomsData, animalsData, unlock, unlocks] = await Promise.all([
      getFullProgress(),
      getRoomsWithStatus(),
      getAnimalsWithStatus(),
      getNextUnlock(),
      getUnlockStatus(),
    ]);

    setProgress(progressData);
    setRooms(roomsData);
    setAnimals(animalsData);
    setNextUnlock(unlock);
    setAllUnlocks(unlocks);
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
    setSelectedAnimal(animal);
    setShowDialogue(true);

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

    const hasMore = hasMoreDialogues(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      progress.currentPhase
    );

    if (hasMore) {
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
      // Close dialogue
      setShowDialogue(false);
      setSelectedAnimal(null);
    }
  };

  // Handle room tap (for locked rooms)
  const handleRoomPress = (room: Room) => {
    if (!room.isUnlocked) {
      setShowRoomUnlock(room);
    }
  };

  // Handle unlock purchase
  const handlePurchase = async (unlock: Unlockable) => {
    const result = await purchaseUnlock(unlock.id);
    if (result.success) {
      await loadAllData();
      setShowShop(false);
      setShowRoomUnlock(null);
      onAmberChange?.(progress!.amber - unlock.cost);
    }
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

  if (!progress || rooms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your home...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with amber and play button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.amberContainer}
          onPress={() => setShowShop(true)}
        >
          <Animated.View style={{ transform: [{ scale: amberPulse }] }}>
            <Text style={styles.amberEmoji}>💎</Text>
          </Animated.View>
          <Text style={styles.amberCount}>{progress.amber}</Text>
          <Text style={styles.amberPlus}>+</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Animal House</Text>
          <Text style={styles.subtitle}>
            Phase {progress.currentPhase + 1}/5 - {progress.puzzlesSolved} puzzles
          </Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={onPlayPuzzle}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>PLAY</Text>
        </TouchableOpacity>
      </View>

      {/* House World */}
      <HouseWorld
        rooms={rooms}
        animals={animals}
        currentPhase={progress.currentPhase}
        onAnimalPress={handleAnimalPress}
        onRoomPress={handleRoomPress}
      />

      {/* Dialogue Modal */}
      <Modal
        visible={showDialogue}
        transparent
        animationType="none"
        onRequestClose={() => setShowDialogue(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDialogue(false)}
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
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      progress.amber < nextUnlock.cost && styles.buyButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(nextUnlock)}
                    disabled={progress.amber < nextUnlock.cost}
                  >
                    <Text style={styles.buyButtonText}>
                      {progress.amber >= nextUnlock.cost ? 'Unlock' : 'Need More'}
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
    </SafeAreaView>
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
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  amberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
});

export default HomeScreen;
