import { useState, useCallback, useRef, useEffect } from 'react';
import { Animal, Room, Unlockable, HomeWorldProgress } from '../types/homeWorld';
import {
  ANIMALS,
  getNextUnlock,
  getUnlockStatus,
  purchaseUnlock,
  isUnlockAvailable,
  canReserveUnlock,
  reserveNextUnlock,
  canSkipUnlockGate,
  skipUnlockGate,
  getUnlockSkipCost,
  getReservedSpeedUpState,
  ReservedSpeedUpState,
  skipReservedUnlock,
  getReservedSkipCost,
} from '../services/homeWorldData';
import { getAmberBalance, getReservedUnlockId } from '../services/amberCurrency';
import { hapticError, hapticLight, hapticSuccess } from '../services/haptics';
import { playUiSound } from '../services/uiSound';

interface UseUnlockFlowParams {
  progress: HomeWorldProgress | null;
  animals: Animal[];
  onAmberChange?: (newBalance: number) => void;
  loadAllData: () => Promise<void>;
  setShowCelebration: (show: boolean) => void;
  setIntroAnimal: (animal: Animal | null) => void;
  setIntroDialogueIndex: (index: number) => void;
  setShowIntroDialogue: (show: boolean) => void;
  /**
   * Reset any intro-override state (override lines + context) before a
   * character intro opens. A HomeScreen one-time intro (e.g. the gated-room
   * Reserve explainer) can win the race into the shared intro-dialogue state
   * during this hook's 300ms intro delay; without the reset, the new animal's
   * portrait would deliver the OTHER intro's script.
   */
  resetIntroOverrides?: () => void;
}

interface UseUnlockFlowReturn {
  showShop: boolean;
  showRoomUnlock: Room | null;
  showInvitePrompt: boolean;
  unlockAvailability: { available: boolean; reason?: string } | null;
  purchaseError: string | null;
  nextUnlock: Unlockable | null;
  allUnlocks: Unlockable[];
  /** The reserved (paid-ahead, awaiting its level gate) unlock id, or null. */
  reservedUnlockId: string | null;
  /** Whether the current next unlock can be reserved now (gated + affordable). */
  canReserve: boolean;
  /** Whether the current next unlock can be skipped now (gated + premium affordable). */
  canSkip: boolean;
  /** Premium amber cost to skip the current next unlock's gate (0 when N/A). */
  skipCost: number;
  /** Whether the RESERVED unlock can be sped up now (reserved + premium affordable). */
  canSpeedUpReserved: boolean;
  /**
   * WHY the speed-up is unavailable, so the copy beside the missing button can
   * be true. 'not_yet' is the descent-trio phase guard — no amount of amber
   * changes it, and it must never be priced.
   */
  reservedSpeedUpState: ReservedSpeedUpState;
  /** Remaining premium amber to speed up the reserved unlock (0 when N/A). */
  reservedSkipCost: number;
  handlePurchase: (unlock: Unlockable, options?: { suppressIntro?: boolean }) => Promise<void>;
  handleReserve: (unlock: Unlockable) => Promise<void>;
  handleSkip: (unlock: Unlockable) => Promise<void>;
  handleSpeedUpReserved: (unlock: Unlockable) => Promise<void>;
  handleRoomPress: (room: Room) => void;
  setShowShop: (show: boolean) => void;
  setShowRoomUnlock: (room: Room | null) => void;
  setShowInvitePrompt: (show: boolean) => void;
  /**
   * Update unlock state with fresh data from loadAllData.
   * Accepts the freshly-loaded rooms and animals arrays to avoid stale closure issues.
   */
  refreshUnlockData: (freshRooms: Room[], freshAnimals: Animal[]) => Promise<void>;
  /**
   * Recompute only the affordability-derived flags (canReserve/canSkip/
   * unlockAvailability/speed-up) for the current nextUnlock. Cheap re-check to
   * run whenever the player's amber changes without a full loadAllData, so the
   * Reserve/Skip buttons appear the instant a credit crosses the threshold.
   */
  recheckAffordability: () => Promise<void>;
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
  resetIntroOverrides,
}: UseUnlockFlowParams): UseUnlockFlowReturn {
  const [showShop, setShowShop] = useState(false);
  const [showRoomUnlock, setShowRoomUnlock] = useState<Room | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [nextUnlock, setNextUnlock] = useState<Unlockable | null>(null);
  const [allUnlocks, setAllUnlocks] = useState<Unlockable[]>([]);
  const [reservedUnlockId, setReservedUnlockId] = useState<string | null>(null);
  const [canReserve, setCanReserve] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCost, setSkipCost] = useState(0);
  const [canSpeedUpReserved, setCanSpeedUpReserved] = useState(false);
  const [reservedSpeedUpState, setReservedSpeedUpState] = useState<ReservedSpeedUpState>('none');
  const [reservedSkipCost, setReservedSkipCost] = useState(0);
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

    const reserved = await getReservedUnlockId();
    setReservedUnlockId(reserved);

    if (unlock) {
      const [availability, reservable, skippable, speedState] = await Promise.all([
        isUnlockAvailable(unlock.id),
        canReserveUnlock(unlock.id),
        canSkipUnlockGate(unlock.id),
        getReservedSpeedUpState(unlock.id),
      ]);
      setUnlockAvailability(availability);
      setCanReserve(reservable);
      setCanSkip(skippable);
      setSkipCost(skippable ? getUnlockSkipCost(unlock) : 0);
      setCanSpeedUpReserved(speedState === 'ready');
      setReservedSpeedUpState(speedState);
      // Expose the speed-up premium whenever this unlock is the reservation
      // (even when it's not yet affordable), so the UI can show the option and
      // its cost instead of hiding it — the premium equals the base cost again,
      // which surprises players who just spent that base cost reserving.
      setReservedSkipCost(reserved === unlock.id ? getReservedSkipCost(unlock) : 0);
    } else {
      setUnlockAvailability(null);
      setCanReserve(false);
      setCanSkip(false);
      setSkipCost(0);
      setCanSpeedUpReserved(false);
      setReservedSpeedUpState('none');
      setReservedSkipCost(0);
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

  // Recompute ONLY the affordability-derived flags for the CURRENT nextUnlock
  // (no rooms/animals/unlocks reload). Run on every amber change so the
  // Reserve/Skip buttons appear the instant a credit crosses the threshold: the
  // local `setProgress({...prev, amber})` bumps on the home screen (quest claim,
  // daily reward, spend) update the balance WITHOUT a loadAllData, and these
  // flags used to stay frozen from before the change until the next full
  // refresh (navigate away and back). All of these read the authoritative amber.
  const recheckAffordability = useCallback(async () => {
    const unlock = nextUnlock;
    if (!unlock) return;
    const [availability, reservable, skippable, speedState, reserved] = await Promise.all([
      isUnlockAvailable(unlock.id),
      canReserveUnlock(unlock.id),
      canSkipUnlockGate(unlock.id),
      getReservedSpeedUpState(unlock.id),
      getReservedUnlockId(),
    ]);
    setUnlockAvailability(availability);
    setCanReserve(reservable);
    setCanSkip(skippable);
    setSkipCost(skippable ? getUnlockSkipCost(unlock) : 0);
    setCanSpeedUpReserved(speedState === 'ready');
    setReservedSpeedUpState(speedState);
    setReservedSkipCost(reserved === unlock.id ? getReservedSkipCost(unlock) : 0);
  }, [nextUnlock]);

  // Handle room tap (for locked rooms or rooms needing animals)
  const handleRoomPress = useCallback((room: Room) => {
    hapticLight();
    setPurchaseError(null);
    if (!room.isUnlocked) {
      setShowRoomUnlock(room);
      // Refresh ALL affordability flags when the modal opens (gate info AND
      // Reserve/Skip), so the buttons reflect the current amber even if it
      // changed since the last full refresh — not just unlockAvailability.
      if (nextUnlock && nextUnlock.targetId === room.id) {
        recheckAffordability().catch(() => {});
      }
      return;
    }

    // Check if room needs an animal
    const roomAnimal = animals.find(a => a.roomId === room.id);
    if (roomAnimal && !roomAnimal.isUnlocked && nextUnlock && nextUnlock.targetId === roomAnimal.id) {
      setShowInvitePrompt(true);
    }
  }, [animals, nextUnlock, recheckAffordability]);

  // Reserve a puzzle-gated unlock (pay now, auto-builds when the level opens).
  const handleReserve = useCallback(async (unlock: Unlockable) => {
    setPurchaseError(null);
    const result = await reserveNextUnlock(unlock.id);
    if (result.success) {
      hapticSuccess();
      if (typeof result.newBalance === 'number') onAmberChange?.(result.newBalance);
      await loadAllData();
      setShowRoomUnlock(null);
    } else {
      hapticError();
      setPurchaseError(result.error || 'Unable to reserve right now.');
    }
  }, [loadAllData, onAmberChange]);

  // Skip a level-gated unlock's wait: pay the premium and unlock it NOW.
  // Unlike Reserve, this builds immediately, so it celebrates + shows the
  // new-character intro just like a normal purchase.
  const handleSkip = useCallback(async (unlock: Unlockable) => {
    setPurchaseError(null);
    const result = await skipUnlockGate(unlock.id);
    if (result.success) {
      hapticSuccess();
      playUiSound('unlock');
      setShowCelebration(true);
      if (typeof result.newBalance === 'number') onAmberChange?.(result.newBalance);
      await loadAllData();
      setShowRoomUnlock(null);
      setShowInvitePrompt(false);
      if (unlock.type === 'character') {
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
      setPurchaseError(result.error || 'Unable to skip the wait right now.');
    }
  }, [loadAllData, onAmberChange, setShowCelebration, setIntroAnimal, setIntroDialogueIndex, setShowIntroDialogue]);

  // Speed up an already-reserved unlock: pay the remaining premium, unlock now.
  const handleSpeedUpReserved = useCallback(async (unlock: Unlockable) => {
    setPurchaseError(null);
    const result = await skipReservedUnlock(unlock.id);
    if (result.success) {
      hapticSuccess();
      playUiSound('unlock');
      setShowCelebration(true);
      if (typeof result.newBalance === 'number') onAmberChange?.(result.newBalance);
      await loadAllData();
      setShowRoomUnlock(null);
      setShowInvitePrompt(false);
      if (unlock.type === 'character') {
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
      setPurchaseError(result.error || 'Unable to speed this up right now.');
    }
  }, [loadAllData, onAmberChange, setShowCelebration, setIntroAnimal, setIntroDialogueIndex, setShowIntroDialogue]);

  // Handle unlock purchase
  const handlePurchase = useCallback(async (unlock: Unlockable, options?: { suppressIntro?: boolean }) => {
    const result = await purchaseUnlock(unlock.id);
    if (result.success) {
      hapticSuccess();
      playUiSound('unlock');
      setShowCelebration(true);

      await loadAllData();
      setShowShop(false);
      setShowRoomUnlock(null);
      setShowInvitePrompt(false);
      // Push the STORE's post-spend balance, never a snapshot subtraction:
      // purchaseUnlock validated affordability against the live amberCurrency
      // store, but HomeScreen's `progress` state can be stale-low (it misses
      // credits that never trigger loadAllData), so `progress.amber - cost`
      // could go negative and poison the app-level amber mirror.
      const balance = await getAmberBalance();
      onAmberChange?.(balance);

      // If we just unlocked a character, show their intro dialogue
      if (unlock.type === 'character' && !options?.suppressIntro) {
        const animal = ANIMALS.find(a => a.id === unlock.targetId);
        if (animal) {
          if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
          introTimeoutRef.current = setTimeout(() => {
            introTimeoutRef.current = null;
            // Clean slate: a HomeScreen one-time intro may have claimed the
            // shared intro state during this delay — the new character's
            // intro must never render with another intro's override script.
            resetIntroOverrides?.();
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
  }, [loadAllData, onAmberChange, setShowCelebration, setIntroAnimal, setIntroDialogueIndex, setShowIntroDialogue]);

  return {
    showShop,
    showRoomUnlock,
    showInvitePrompt,
    unlockAvailability,
    purchaseError,
    nextUnlock,
    allUnlocks,
    reservedUnlockId,
    canReserve,
    canSkip,
    skipCost,
    canSpeedUpReserved,
    reservedSpeedUpState,
    reservedSkipCost,
    handlePurchase,
    handleReserve,
    handleSkip,
    handleSpeedUpReserved,
    handleRoomPress,
    setShowShop,
    setShowRoomUnlock,
    setShowInvitePrompt,
    refreshUnlockData,
    recheckAffordability,
  };
}
