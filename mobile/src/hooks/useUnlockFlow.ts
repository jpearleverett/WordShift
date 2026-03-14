import { useState, useCallback, useRef, useEffect } from 'react';
import { Animal, Room, Unlockable, HomeWorldProgress } from '../types/homeWorld';
import {
  ANIMALS,
  getNextUnlock,
  getUnlockStatus,
  purchaseUnlock,
  isUnlockAvailable,
} from '../services/homeWorldData';
import { hapticError, hapticLight, hapticSuccess } from '../services/haptics';

interface UseUnlockFlowParams {
  progress: HomeWorldProgress | null;
  animals: Animal[];
  onAmberChange?: (newBalance: number) => void;
  loadAllData: () => Promise<void>;
  setShowCelebration: (show: boolean) => void;
  setIntroAnimal: (animal: Animal | null) => void;
  setIntroDialogueIndex: (index: number) => void;
  setShowIntroDialogue: (show: boolean) => void;
}

interface UseUnlockFlowReturn {
  showShop: boolean;
  showRoomUnlock: Room | null;
  showInvitePrompt: boolean;
  unlockAvailability: { available: boolean; reason?: string } | null;
  purchaseError: string | null;
  nextUnlock: Unlockable | null;
  allUnlocks: Unlockable[];
  handlePurchase: (unlock: Unlockable, options?: { suppressIntro?: boolean }) => Promise<void>;
  handleRoomPress: (room: Room) => void;
  setShowShop: (show: boolean) => void;
  setShowRoomUnlock: (room: Room | null) => void;
  setShowInvitePrompt: (show: boolean) => void;
  /**
   * Update unlock state with fresh data from loadAllData.
   * Accepts the freshly-loaded rooms and animals arrays to avoid stale closure issues.
   */
  refreshUnlockData: (freshRooms: Room[], freshAnimals: Animal[]) => Promise<void>;
}

/**
 * Custom hook encapsulating unlock/shop logic for the home screen.
 * Manages shop modals, room unlock prompts, animal invite flow, and purchase logic.
 */
export function useUnlockFlow({
  progress,
  animals,
  onAmberChange,
  loadAllData,
  setShowCelebration,
  setIntroAnimal,
  setIntroDialogueIndex,
  setShowIntroDialogue,
}: UseUnlockFlowParams): UseUnlockFlowReturn {
  const [showShop, setShowShop] = useState(false);
  const [showRoomUnlock, setShowRoomUnlock] = useState<Room | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [nextUnlock, setNextUnlock] = useState<Unlockable | null>(null);
  const [allUnlocks, setAllUnlocks] = useState<Unlockable[]>([]);
  const [unlockAvailability, setUnlockAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup intro timeout on unmount
  useEffect(() => {
    return () => {
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, []);

  // Refresh unlock data using freshly-loaded rooms/animals (avoids stale state)
  const refreshUnlockData = useCallback(async (freshRooms: Room[], freshAnimals: Animal[]) => {
    const [unlock, unlocks] = await Promise.all([
      getNextUnlock(),
      getUnlockStatus(),
    ]);

    setNextUnlock(unlock);
    setAllUnlocks(unlocks);

    if (unlock) {
      const availability = await isUnlockAvailable(unlock.id);
      setUnlockAvailability(availability);
    } else {
      setUnlockAvailability(null);
    }

    // Check if there's an empty room waiting for an animal (first-time invite prompt)
    const unlockedRooms = freshRooms.filter(r => r.isUnlocked);
    const unlockedAnimalIds = freshAnimals.filter(a => a.isUnlocked).map(a => a.id);
    const hasEmptyRoom = unlockedRooms.some(room => {
      const roomAnimal = freshAnimals.find(a => a.roomId === room.id);
      return roomAnimal && !unlockedAnimalIds.includes(roomAnimal.id);
    });

    if (hasEmptyRoom && unlock && unlock.type === 'character' && unlock.cost === 0) {
      setShowInvitePrompt(true);
    } else {
      setShowInvitePrompt(false);
    }
  }, []);

  // Handle room tap (for locked rooms or rooms needing animals)
  const handleRoomPress = useCallback((room: Room) => {
    hapticLight();
    setPurchaseError(null);
    if (!room.isUnlocked) {
      setShowRoomUnlock(room);
      // Re-check availability when modal opens so puzzle gate info is fresh
      if (nextUnlock && nextUnlock.targetId === room.id) {
        isUnlockAvailable(nextUnlock.id).then(avail => {
          setUnlockAvailability(avail);
        });
      }
      return;
    }

    // Check if room needs an animal
    const roomAnimal = animals.find(a => a.roomId === room.id);
    if (roomAnimal && !roomAnimal.isUnlocked && nextUnlock && nextUnlock.targetId === roomAnimal.id) {
      setShowInvitePrompt(true);
    }
  }, [animals, nextUnlock]);

  // Handle unlock purchase
  const handlePurchase = useCallback(async (unlock: Unlockable, options?: { suppressIntro?: boolean }) => {
    const result = await purchaseUnlock(unlock.id);
    if (result.success) {
      hapticSuccess();
      setShowCelebration(true);

      await loadAllData();
      setShowShop(false);
      setShowRoomUnlock(null);
      setShowInvitePrompt(false);
      if (progress) {
        onAmberChange?.(progress.amber - unlock.cost);
      }

      // If we just unlocked a character, show their intro dialogue
      if (unlock.type === 'character' && !options?.suppressIntro) {
        const animal = ANIMALS.find(a => a.id === unlock.targetId);
        if (animal) {
          if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
          introTimeoutRef.current = setTimeout(() => {
            introTimeoutRef.current = null;
            setIntroAnimal(animal as unknown as Animal);
            setIntroDialogueIndex(0);
            setShowIntroDialogue(true);
          }, 300);
        }
      }
    } else {
      hapticError();
      setPurchaseError(result.error || 'Unable to unlock. Try again later.');
    }
  }, [progress, loadAllData, onAmberChange, setShowCelebration, setIntroAnimal, setIntroDialogueIndex, setShowIntroDialogue]);

  return {
    showShop,
    showRoomUnlock,
    showInvitePrompt,
    unlockAvailability,
    purchaseError,
    nextUnlock,
    allUnlocks,
    handlePurchase,
    handleRoomPress,
    setShowShop,
    setShowRoomUnlock,
    setShowInvitePrompt,
    refreshUnlockData,
  };
}
