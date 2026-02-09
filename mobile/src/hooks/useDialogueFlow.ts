import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Animal, HomeWorldProgress, getAnimalPhase, DialoguePhase } from '../types/homeWorld';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  getCrossAnimalReference,
  TUTORIAL_CALLBACK_DIALOGUES,
} from '../services/animalDialogue';
import {
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSessionStatus,
} from '../services/dialogueSession';
import { markDialogueRead, consumeTriggerWords, wereTutorialSeedsPlanted, markTutorialSeedsPlanted } from '../services/amberCurrency';
import { getSettingsSync } from '../services/settings';

interface SessionInfo {
  status: 'available' | 'in_session' | 'cooldown';
  dialoguesRemaining?: number;
  puzzlesRemaining?: number;
}

interface UseDialogueFlowParams {
  progress: HomeWorldProgress | null;
  setAnimals: React.Dispatch<React.SetStateAction<Animal[]>>;
}

interface UseDialogueFlowReturn {
  selectedAnimal: Animal | null;
  showDialogue: boolean;
  dialogueText: string;
  sessionInfo: SessionInfo | null;
  cooldownMessage: string | null;
  cooldownOpacity: Animated.Value;
  cooldownSlide: Animated.Value;
  dialogueSlide: Animated.Value;
  isTalking: boolean;
  triggerReaction: string | null;
  crossAnimalRef: string | null;
  handleAnimalTap: (animal: Animal) => Promise<void>;
  handleNextDialogue: () => Promise<void>;
  handleCloseDialogue: () => Promise<void>;
}

/**
 * Custom hook encapsulating dialogue session logic for the home screen.
 * Manages animal dialogue state, cooldown animations, and session flow.
 */
export function useDialogueFlow({
  progress,
  setAnimals,
}: UseDialogueFlowParams): UseDialogueFlowReturn {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [triggerReaction, setTriggerReaction] = useState<string | null>(null);
  const [crossAnimalRef, setCrossAnimalRef] = useState<string | null>(null);

  // Animations
  const dialogueSlide = useRef(new Animated.Value(0)).current;
  const cooldownOpacity = useRef(new Animated.Value(0)).current;
  const cooldownSlide = useRef(new Animated.Value(20)).current;

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
      const reducedMotion = getSettingsSync().reducedMotion;

      if (reducedMotion) {
        cooldownOpacity.setValue(1);
        cooldownSlide.setValue(0);

        const timeout = setTimeout(() => {
          cooldownOpacity.setValue(0);
          cooldownSlide.setValue(20);
          setCooldownMessage(null);
        }, 2500);
        return () => clearTimeout(timeout);
      }

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
    if (showDialogue) {
      if (getSettingsSync().reducedMotion) {
        setIsTalking(true);
        return;
      }
      const interval = setInterval(() => {
        setIsTalking(prev => !prev);
      }, 300);
      return () => clearInterval(interval);
    } else {
      setIsTalking(false);
    }
  }, [showDialogue]);

  // Get current dialogue text (uses per-animal phase awareness)
  const getDialogueText = (): string => {
    if (!selectedAnimal || !progress) return '';
    // Per-animal phase: vanguard animals are 1 phase ahead, lagging are 1 behind
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);
    const dialogue = getCurrentDialogue(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      animalPhase
    );
    return dialogue?.text || 'Hello, friend!';
  };

  // Handle animal tap
  const handleAnimalTap = useCallback(async (animal: Animal) => {
    const availability = await checkDialogueAvailability(animal.id);

    if (!availability.available) {
      // Phase-aware cooldown messages
      const phase = progress?.currentPhase ?? 0;
      const cooldownMessages = phase >= 3
        ? [
            `${animal.name} is preparing. Return after more offerings.`,
            `The ritual requires patience. ${animal.name} will speak again soon.`,
          ]
        : phase >= 2
          ? [
              `${animal.name} is lost in thought. Come back after solving some puzzles.`,
            ]
          : [
              `${animal.name} needs some quiet time. Play more puzzles and come back!`,
            ];
      setCooldownMessage(cooldownMessages[Math.floor(Math.random() * cooldownMessages.length)]);
      return;
    }

    setSelectedAnimal(animal);
    setShowDialogue(true);
    setTriggerReaction(null);
    setCrossAnimalRef(null);

    // Check for trigger word reactions from recent puzzles
    try {
      const consumed = await consumeTriggerWords(animal.type);
      if (consumed.length > 0) {
        // Animal noticed a trigger word from recent puzzles
        const word = consumed[0]; // Show reaction to first trigger word
        const animalPhase = progress ? getAnimalPhase(progress.currentPhase, animal.type) : 0;
        if (animalPhase >= 2) {
          setTriggerReaction(`You spelled "${word}"... ${animal.name} noticed.`);
        }
      }
    } catch {
      // Trigger word consumption is non-critical
    }

    // Tutorial callback for Fox at Phase 4 — one-time chilling reference to tutorial lines
    if (animal.type === 'fox' && progress && progress.currentPhase >= 4) {
      try {
        const seedsPlanted = await wereTutorialSeedsPlanted();
        if (!seedsPlanted) {
          const callbackLine = TUTORIAL_CALLBACK_DIALOGUES[Math.floor(Math.random() * TUTORIAL_CALLBACK_DIALOGUES.length)];
          setTriggerReaction(callbackLine);
          await markTutorialSeedsPlanted();
        }
      } catch {
        // Tutorial callback is non-critical
      }
    }

    // Cross-animal reference — ~25% chance to show a one-off reference to another animal
    if (progress && progress.unlockedAnimals) {
      const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
      if (Math.random() < 0.25) {
        const ref = getCrossAnimalReference(animal.type, animalPhase as DialoguePhase, progress.unlockedAnimals);
        if (ref) {
          setCrossAnimalRef(ref);
        }
      }
    }

    const status = getSessionStatus(animal.id);
    setSessionInfo(status);

    // Animate dialogue modal in
    if (getSettingsSync().reducedMotion) {
      dialogueSlide.setValue(1);
    } else {
      dialogueSlide.setValue(0);
      Animated.spring(dialogueSlide, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [dialogueSlide, progress]);

  // Handle closing dialogue (and ending session)
  const handleCloseDialogue = useCallback(async () => {
    if (selectedAnimal) {
      await endSession(selectedAnimal.id);
    }
    setShowDialogue(false);
    setSelectedAnimal(null);
    setSessionInfo(null);
    setTriggerReaction(null);
    setCrossAnimalRef(null);
  }, [selectedAnimal]);

  // Handle dialogue advance
  const handleNextDialogue = useCallback(async () => {
    if (!selectedAnimal || !progress) return;

    const availability = await checkDialogueAvailability(selectedAnimal.id);
    if (!availability.available && availability.reason !== 'max_dialogues') {
      handleCloseDialogue();
      setCooldownMessage(
        `${selectedAnimal.name} wants to rest now. Come back after solving some puzzles!`
      );
      return;
    }

    // Per-animal phase awareness for dialogue progression
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);
    const hasMore = hasMoreDialogues(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      animalPhase
    );

    if (hasMore) {
      await recordDialogue(selectedAnimal.id);

      const status = getSessionStatus(selectedAnimal.id);
      setSessionInfo(status);

      const newIndex = selectedAnimal.currentDialogueIndex + 1;
      await markDialogueRead(selectedAnimal.id, newIndex);

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

      if (status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
        handleCloseDialogue();
        setCooldownMessage(
          `${selectedAnimal.name} wants to rest now. Come back later for more conversation!`
        );
        return;
      }
    } else {
      handleCloseDialogue();
    }
  }, [selectedAnimal, progress, handleCloseDialogue, setAnimals]);

  return {
    selectedAnimal,
    showDialogue,
    dialogueText: getDialogueText(),
    sessionInfo,
    cooldownMessage,
    cooldownOpacity,
    cooldownSlide,
    dialogueSlide,
    isTalking,
    triggerReaction,
    crossAnimalRef,
    handleAnimalTap,
    handleNextDialogue,
    handleCloseDialogue,
  };
}
