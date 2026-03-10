import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Animal, HomeWorldProgress, getAnimalPhase, DialoguePhase, ANIMAL_AWARENESS_TIERS } from '../types/homeWorld';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  getCrossAnimalReference,
  getTriggerWordReaction,
  getVariantTutorialDialogue,
  TUTORIAL_CALLBACK_DIALOGUES,
  getCoordinatedEventLine,
  getWordThresholdDialogue,
  getTotalDialogueCount,
  getSacrificeReaction,
  getPostRevelationDialogue,
  getPostRevelationDialogueCount,
} from '../services/animalDialogue';
import { getSacrificeCount } from '../services/sacrifice';
import {
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSessionStatus,
  isOnCooldown,
} from '../services/dialogueSession';
import {
  markDialogueRead,
  consumeTriggerWords,
  consumePendingVariantTutorial,
  wereTutorialSeedsPlanted,
  markTutorialSeedsPlanted,
  recordConsumedCoordinatedEvent,
  hasSeenGuaranteedCrossRef,
  markGuaranteedCrossRefSeen,
  hasSeenFoxPlayNudge,
  markFoxPlayNudgeSeen,
} from '../services/amberCurrency';
import { getSettingsSync } from '../services/settings';
import { getChoiceForAnimal, recordChoice, PlayerChoice, DialogueChoice } from '../services/dialogueChoices';
import { recordWhisper } from '../services/whisperGallery';
import { getFoxPostTutorialPlayPrompt } from '../services/phaseNarrative';
import { recordAnimalVisit } from '../services/weeklyQuests';
import { hapticLight, hapticSelection } from '../services/haptics';

interface SessionInfo {
  status: 'available' | 'in_session' | 'cooldown';
  dialoguesRemaining?: number;
  puzzlesRemaining?: number;
}

interface UseDialogueFlowParams {
  progress: HomeWorldProgress | null;
  setAnimals: React.Dispatch<React.SetStateAction<Animal[]>>;
  onFoxPlayPrompt?: () => void;
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
  hasMoreToShow: boolean;
  /** Active dialogue choice for Phase 3 choice points */
  activeChoice: DialogueChoice | null;
  handleAnimalTap: (animal: Animal) => Promise<void>;
  handleNextDialogue: () => Promise<void>;
  handleCloseDialogue: () => Promise<void>;
  handleDialogueChoice: (choice: PlayerChoice) => Promise<void>;
}

/**
 * Custom hook encapsulating dialogue session logic for the home screen.
 * Manages animal dialogue state, cooldown animations, and session flow.
 *
 * Dialogue pages flow naturally as a conversation:
 * 1. Trigger word reaction (if any) — animal reacts to a puzzle word
 * 2. Cross-animal reference (if any) — animal mentions another animal
 * 3. Regular dialogue — the animal's main phase dialogue
 * Each shows as a full page in the dialogue bubble, advanced by tapping "Next".
 */
export function useDialogueFlow({
  progress,
  setAnimals,
  onFoxPlayPrompt,
}: UseDialogueFlowParams): UseDialogueFlowReturn {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);

  // Pre-dialogue pages: shown before regular dialogue, one at a time
  // These are trigger reactions, cross-animal refs, coordinated events, etc.
  const [preDialoguePages, setPreDialoguePages] = useState<string[]>([]);
  // Active dialogue choice (Phase 3 choice points)
  const [activeChoice, setActiveChoice] = useState<DialogueChoice | null>(null);

  // Track last-seen sacrifice count per animal to detect new sacrifices
  const lastSeenSacrificeCount = useRef<Record<string, number>>({});

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

  // Get current dialogue text — shows pre-dialogue pages first, then regular dialogue
  const getDialogueText = (): string => {
    // If there are pre-dialogue pages remaining, show the first one
    if (preDialoguePages.length > 0) {
      return preDialoguePages[0];
    }
    // Otherwise show regular dialogue
    if (!selectedAnimal || !progress) return '';
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);

    // Phase 5 (post-revelation): when regular dialogues are exhausted, cycle through
    // the 10 post-revelation lines per animal with modular indexing.
    // Note: getCurrentDialogue clamps out-of-bounds indices instead of returning null,
    // so we must compare the index directly against the total count.
    if (animalPhase === 5) {
      const totalRegular = getTotalDialogueCount(selectedAnimal.type, 4);
      if (selectedAnimal.currentDialogueIndex >= totalRegular) {
        // Regular dialogues exhausted — use post-revelation dialogues
        const prCount = getPostRevelationDialogueCount(selectedAnimal.type);
        // Safe modulo that handles negative values in JS: ((x % n) + n) % n
        const rawIndex = selectedAnimal.currentDialogueIndex - totalRegular;
        const postRevIndex = prCount > 0
          ? ((rawIndex % prCount) + prCount) % prCount
          : 0;
        const postRevDialogue = getPostRevelationDialogue(selectedAnimal.type, postRevIndex);
        return postRevDialogue || 'The pattern holds.';
      }
      // Still within regular Phase 4 dialogues
      const regularDialogue = getCurrentDialogue(
        selectedAnimal.type,
        selectedAnimal.currentDialogueIndex,
        4
      );
      return regularDialogue?.text || 'The pattern holds.';
    }

    const dialogue = getCurrentDialogue(
      selectedAnimal.type,
      selectedAnimal.currentDialogueIndex,
      animalPhase
    );
    return dialogue?.text || 'Hello, friend!';
  };

  // Check if there's more content to show (pre-dialogue pages or regular dialogue)
  const computeHasMore = (): boolean => {
    // If pre-dialogue pages remain, there's always more (regular dialogue follows)
    if (preDialoguePages.length > 0) return true;
    // Otherwise check regular dialogue
    if (!selectedAnimal || !progress) return false;
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);

    // Phase 5: post-revelation dialogues always cycle (never truly exhausted)
    if (animalPhase === 5) return true;

    return hasMoreDialogues(selectedAnimal.type, selectedAnimal.currentDialogueIndex, animalPhase);
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

    hapticSelection();

    if (progress) {
      recordAnimalVisit(animal.id, progress.currentPhase, progress.currentStreak).catch(() => {});
    }

    setSelectedAnimal(animal);
    setShowDialogue(true);

    // Build pre-dialogue pages: these show as sequential conversation pages
    // before the regular dialogue, creating natural conversational flow
    const pages: string[] = [];

    const animalPhase = progress ? getAnimalPhase(progress.currentPhase, animal.type) : 0;

    // 1. Tutorial callback for Fox at Phase 4 — one-time chilling reference
    if (animal.type === 'fox' && progress && progress.currentPhase >= 4) {
      try {
        const seedsPlanted = await wereTutorialSeedsPlanted();
        if (!seedsPlanted) {
          const callbackLine = TUTORIAL_CALLBACK_DIALOGUES[Math.floor(Math.random() * TUTORIAL_CALLBACK_DIALOGUES.length)];
          pages.push(callbackLine);
          await markTutorialSeedsPlanted();
        }
      } catch {
        // Tutorial callback is non-critical
      }
    }

    // 2. Variant tutorial note — one-time explanation for newly encountered modes
    if (progress) {
      try {
        const pendingVariant = await consumePendingVariantTutorial();
        if (pendingVariant) {
          const variantLine = getVariantTutorialDialogue(
            animal.type,
            pendingVariant,
            progress.currentPhase
          );
          if (variantLine) {
            pages.push(variantLine);
          }
        }
      } catch {
        // Variant tutorial pages are non-critical
      }
    }

    // 3. Coordinated event — milestone events take priority over trigger words
    let hasCoordinatedEvent = false;
    if (progress && progress.puzzlesSolved > 0) {
      try {
        const consumed = progress.consumedCoordinatedEvents || [];
        const coordEvent = getCoordinatedEventLine(
          animal.type,
          progress.puzzlesSolved,
          progress.currentPhase,
          consumed
        );
        if (coordEvent) {
          pages.push(coordEvent.text);
          hasCoordinatedEvent = true;
          await recordConsumedCoordinatedEvent(coordEvent.theme);
        }
      } catch {
        // Coordinated events are non-critical
      }
    }

    // 4. Trigger word reaction — use the actual per-animal reactions
    if (!hasCoordinatedEvent) {
      try {
        const consumed = await consumeTriggerWords(animal.type);
        if (consumed.length > 0) {
          const word = consumed[0];
          if (animalPhase >= 1) {
            // Use the per-animal, per-phase, per-word reaction text
            const reaction = getTriggerWordReaction(animal.type, word, animalPhase as DialoguePhase);
            if (reaction) {
              pages.push(reaction);
            }
          }
        }
      } catch {
        // Trigger word consumption is non-critical
      }
    }

    // 5. Sacrifice reaction — animals notice when the player offers amber (Phase 4+)
    if (!hasCoordinatedEvent && pages.length === 0 && progress && progress.currentPhase >= 4) {
      try {
        const currentCount = await getSacrificeCount();
        if (lastSeenSacrificeCount.current[animal.type] === undefined) {
          // First access for this animal since mount — establish baseline without triggering.
          // This prevents stale reactions from old sacrifices after app restart.
          lastSeenSacrificeCount.current[animal.type] = currentCount;
        } else if (currentCount > lastSeenSacrificeCount.current[animal.type]) {
          const reaction = getSacrificeReaction(animal.type, currentCount, progress.currentPhase);
          if (reaction) {
            pages.push(reaction);
          }
          lastSeenSacrificeCount.current[animal.type] = currentCount;
        }
      } catch {
        // Sacrifice reaction is non-critical
      }
    }

    // 6. Word count threshold dialogue — low priority
    if (!hasCoordinatedEvent && pages.length === 0 && progress && progress.totalWordsFormed) {
      const approxPrevious = Math.max(0, (progress.totalWordsFormed || 0) - 5);
      const thresholdLine = getWordThresholdDialogue(
        animal.type,
        progress.totalWordsFormed,
        approxPrevious,
        progress.currentPhase
      );
      if (thresholdLine) {
        pages.push(thresholdLine);
      }
    }

    // 7. Cross-animal reference — frequency scales with phase
    if (progress && progress.unlockedAnimals) {
      const isVanguard = ANIMAL_AWARENESS_TIERS[animal.type] === 'vanguard';
      let forceRef = false;

      if (isVanguard && progress.currentPhase >= 1) {
        try {
          const seen = await hasSeenGuaranteedCrossRef(progress.currentPhase);
          if (!seen) {
            forceRef = true;
            await markGuaranteedCrossRefSeen(progress.currentPhase);
          }
        } catch {
          // Non-critical
        }
      }

      const crossRefChance = animalPhase <= 1 ? 0.20
        : animalPhase === 2 ? 0.25
        : animalPhase === 3 ? 0.45
        : 0.60;

      if (forceRef || Math.random() < crossRefChance) {
        const ref = getCrossAnimalReference(animal.type, animalPhase as DialoguePhase, progress.unlockedAnimals);
        if (ref) {
          pages.push(ref);
        }
      }
    }

    // 8. Dialogue choice point (Phase 3 only) — illusion of agency
    if (animalPhase === 3) {
      try {
        const choice = await getChoiceForAnimal(
          animal.type,
          animalPhase,
          animal.currentDialogueIndex
        );
        if (choice) {
          // Show the choice prompt as a pre-dialogue page
          pages.push(choice.prompt);
          setActiveChoice(choice);
        }
      } catch {
        // Choice points are non-critical
      }
    }

    setPreDialoguePages(pages);

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

  // Recompute hasNewDialogue for a specific animal after session changes
  const recomputeHasNewDialogue = useCallback((animal: Animal): boolean => {
    if (!animal.isUnlocked || !progress) return false;
    if (isOnCooldown(animal.id)) return false;
    const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
    const totalDialogues = getTotalDialogueCount(animal.type, animalPhase);
    return animal.currentDialogueIndex < totalDialogues;
  }, [progress]);

  // Handle closing dialogue. Manual closes keep the session warm so
  // checking in with an animal never feels punitive.
  const closeDialogue = useCallback(async (startCooldown: boolean) => {
    hapticLight();
    const closingAnimal = selectedAnimal;
    if (closingAnimal && startCooldown) {
      await endSession(closingAnimal.id);
      // Update hasNewDialogue for the animal that was talking
      setAnimals(prev =>
        prev.map(a =>
          a.id === closingAnimal.id
            ? { ...a, hasNewDialogue: recomputeHasNewDialogue(a) }
            : a
        )
      );
    }
    setShowDialogue(false);
    setSelectedAnimal(null);
    setSessionInfo(null);
    setPreDialoguePages([]);
  }, [selectedAnimal, recomputeHasNewDialogue, setAnimals]);

  const handleCloseDialogue = useCallback(async () => {
    await closeDialogue(false);
  }, [closeDialogue]);

  // Handle dialogue advance
  const handleNextDialogue = useCallback(async () => {
    if (!selectedAnimal || !progress) return;
    hapticSelection();

    // If still showing pre-dialogue pages, advance through them
    // Pre-dialogue pages don't count toward session dialogue limits
    if (preDialoguePages.length > 0) {
      setPreDialoguePages(prev => prev.slice(1));
      return;
    }

    // Regular dialogue advance — check if session is still available
    const availability = await checkDialogueAvailability(selectedAnimal.id);
    if (!availability.available) {
      closeDialogue(true);
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

      // Record dialogue text in whisper gallery
      const currentText = getDialogueText();
      if (currentText) {
        recordWhisper({
          animalType: selectedAnimal.type,
          animalName: selectedAnimal.name,
          text: currentText,
          phase: animalPhase,
          type: 'dialogue',
        }).catch(() => {});
      }

      const status = getSessionStatus(selectedAnimal.id);
      setSessionInfo(status);

      const newIndex = selectedAnimal.currentDialogueIndex + 1;
      await markDialogueRead(selectedAnimal.id, newIndex);

      const updatedAnimal = { ...selectedAnimal, currentDialogueIndex: newIndex };
      const totalDialogues = getTotalDialogueCount(selectedAnimal.type, animalPhase);
      const hasNewDialogue = !isOnCooldown(selectedAnimal.id) && newIndex < totalDialogues;

      setAnimals(prev =>
        prev.map(a =>
          a.id === selectedAnimal.id
            ? { ...a, currentDialogueIndex: newIndex, hasNewDialogue }
            : a
        )
      );
      setSelectedAnimal(prev =>
        prev ? { ...prev, currentDialogueIndex: newIndex } : null
      );

      if (status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
        closeDialogue(true);
        setCooldownMessage(
          `${selectedAnimal.name} wants to rest now. Come back later for more conversation!`
        );
        return;
      }
    } else {
      // One-time post-tutorial Fox nudge before closing the first session.
      // This keeps guidance in-world and directs the player toward more puzzles.
      if (
        selectedAnimal.type === 'fox' &&
        progress.currentPhase <= 1 &&
        progress.puzzlesSolved >= 1 &&
        progress.puzzlesSolved <= 40
      ) {
        const seenNudge = await hasSeenFoxPlayNudge();
        if (!seenNudge) {
          setPreDialoguePages([getFoxPostTutorialPlayPrompt(progress.currentPhase)]);
          await markFoxPlayNudgeSeen();
          onFoxPlayPrompt?.();
          return;
        }
      }
      closeDialogue(true);
    }
  }, [selectedAnimal, progress, closeDialogue, setAnimals, preDialoguePages, onFoxPlayPrompt]);

  // Handle player choosing a dialogue option (Phase 3 choice points)
  const handleDialogueChoice = useCallback(async (choice: PlayerChoice) => {
    if (!selectedAnimal || !activeChoice) return;
    hapticSelection();
    try {
      const result = await recordChoice(selectedAnimal.type, choice);
      // Replace the current pre-dialogue page with the response, then convergence
      setPreDialoguePages([result.response, result.convergence]);
      setActiveChoice(null);

      // Record the choice response in whisper gallery
      recordWhisper({
        animalType: selectedAnimal.type,
        animalName: selectedAnimal.name,
        text: result.response,
        phase: 3,
        type: 'dialogue',
      }).catch(() => {});
    } catch {
      // Choice handling is non-critical, just close the choice
      setActiveChoice(null);
    }
  }, [selectedAnimal, activeChoice]);

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
    hasMoreToShow: computeHasMore(),
    activeChoice,
    handleAnimalTap,
    handleNextDialogue,
    handleCloseDialogue,
    handleDialogueChoice,
  };
}
