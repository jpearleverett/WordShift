import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Animal, AnimalType, HomeWorldProgress, getAnimalPhase, DialoguePhase, ANIMAL_AWARENESS_TIERS } from '../types/homeWorld';
import {
  getCurrentDialogue,
  hasMoreDialogues,
  resolveDialogueIndex,
  getCrossAnimalReference,
  getTriggerWordReaction,
  getVariantTutorialDialogue,
  TUTORIAL_CALLBACK_DIALOGUES,
  getCoordinatedEventLine,
  getWordThresholdDialogue,
  getTotalDialogueCount,
  getSacrificeReaction,
  getPhase2ExtraDialogues,
  getPhase2PoolLine,
  phase2PoolHasNew,
  getAndMarkNarrativeSeedPage,
  getAndMarkNarrativeCallbackPage,
  getPhase2PoolCursors,
  advancePhase2PoolCursor,
} from '../services/animalDialogue';
import { getSacrificeCount } from '../services/sacrifice';
import {
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSession,
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
import { takeOfferingDialogue } from '../services/offeringRequests';
import { getSettingsSync } from '../services/settings';
import {
  getChoiceForAnimal,
  recordChoice,
  PlayerChoice,
  DialogueChoice,
  loadChoiceState,
  getAndMarkPhase4CallbackPage,
} from '../services/dialogueChoices';
import { recordWhisper } from '../services/whisperGallery';
import { getFoxPostTutorialPlayPrompt } from '../services/phaseNarrative';
import { recordAnimalVisit } from '../services/weeklyQuests';
import { hapticLight, hapticSelection } from '../services/haptics';
import {
  loadTendingState,
  selectPhase5Dialogue,
  setPhase5CaughtUp,
  hashSeed,
} from '../services/tending';
import { buildPhase5Pool } from '../services/dialogue/phase5Pool';

/**
 * Pick the session-end message. Only claim "come back later" when the animal is
 * GENUINELY on cooldown — during the newly-unlocked grace period the cooldown is
 * skipped, so re-tapping immediately shows more dialogue; telling the player to
 * come back later there is just wrong. Caller passes `onCooldown` read AFTER the
 * session has ended (so grace state is settled).
 */
function sessionEndMessage(name: string, onCooldown: boolean): string {
  return onCooldown
    ? `${name} wants to rest now. Come back after solving a few puzzles.`
    : `${name} still has more to say. Tap them again to keep talking.`;
}

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
  // Recorded Phase 3 choices (loaded once; refreshed when a choice is made) —
  // used synchronously by the Phase 5 post-revelation dialogue cycle.
  const [playerChoices, setPlayerChoices] = useState<Record<string, PlayerChoice>>({});

  // Tending Shrine (Phase 5 endgame) state, loaded synchronously into the hook so
  // the Phase-5 dialogue selection + honest "new dialogue" badge can read it
  // during render. `tendingLevel` grows the per-animal line pool; `tendingCaughtUp`
  // tracks how many pool lines each animal has genuinely delivered.
  const [tendingLevel, setTendingLevel] = useState(0);
  const [tendingCaughtUp, setTendingCaughtUp] = useState<Record<string, number>>({});

  // Phase-2 exhaustion pool cursors (animalType -> lines delivered). Once an
  // animal's Phase-2 base block is exhausted while the player is still in
  // Phase 2, extra lines are served in order (then cycling) instead of
  // re-reading the last base line verbatim. The stored dialogue index stays
  // pinned at the base-block end so saved progress is never inflated.
  const [phase2Cursors, setPhase2Cursors] = useState<Record<string, number>>({});

  const refreshTendingState = useCallback(async () => {
    try {
      const state = await loadTendingState();
      setTendingLevel(state.level);
      setTendingCaughtUp({ ...state.caughtUp });
    } catch {}
  }, []);

  useEffect(() => {
    loadChoiceState()
      .then(state => setPlayerChoices(state.choices ?? {}))
      .catch(() => {});
    refreshTendingState();
    getPhase2PoolCursors()
      .then(cursors => setPhase2Cursors(cursors))
      .catch(() => {});
  }, [refreshTendingState]);

  // Build an animal's current Phase-5 line pool from loaded hook state.
  const getPhase5Pool = (animalType: AnimalType): string[] =>
    buildPhase5Pool(animalType, tendingLevel, playerChoices[animalType] ?? null);

  // Select the Phase-5 line for an animal at a given dialogue index, using the
  // recency-aware selector (new lines in order, then deterministic shuffled
  // re-reads). Returns the pool so callers can reason about its length.
  const selectPhase5 = (animalType: AnimalType, currentDialogueIndex: number) => {
    const pool = getPhase5Pool(animalType);
    const totalRegular = getTotalDialogueCount(animalType, 4);
    const caughtUp = tendingCaughtUp[animalType] ?? 0;
    const deliveredIndex = Math.max(0, currentDialogueIndex - totalRegular);
    const result = selectPhase5Dialogue(pool, caughtUp, deliveredIndex, hashSeed(animalType));
    return { pool, caughtUp, ...result };
  };

  // Animal types currently unlocked — lines tagged with `requiresAnimals`
  // are skipped while any of their referenced animals is still locked.
  const getUnlockedTypes = (): Set<AnimalType> =>
    new Set((progress?.unlockedAnimals ?? []) as AnimalType[]);

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
        // Regular dialogues exhausted — serve the post-revelation pool via the
        // recency-aware selector (genuinely-new lines in order, then a
        // deterministic shuffled re-read so the same lines never arrive in the
        // same verbatim sequence). The pool grows as the player deepens the
        // pattern at the Tending Shrine.
        return selectPhase5(selectedAnimal.type, selectedAnimal.currentDialogueIndex).text;
      }
      // Still within regular Phase 4 dialogues
      const regularDialogue = getCurrentDialogue(
        selectedAnimal.type,
        resolveDialogueIndex(selectedAnimal.type, selectedAnimal.currentDialogueIndex, 4, getUnlockedTypes()),
        4
      );
      return regularDialogue?.text || 'The pattern holds.';
    }

    // Phase 2: once the base block is exhausted, serve the exhaustion pool
    // (in order, then cycling) instead of re-reading the last base line.
    if (animalPhase === 2) {
      const total2 = getTotalDialogueCount(selectedAnimal.type, 2);
      const resolved = resolveDialogueIndex(selectedAnimal.type, selectedAnimal.currentDialogueIndex, 2, getUnlockedTypes());
      if (resolved >= total2) {
        const poolLine = getPhase2PoolLine(selectedAnimal.type, phase2Cursors[selectedAnimal.type] ?? 0);
        if (poolLine) return poolLine;
      }
    }

    const dialogue = getCurrentDialogue(
      selectedAnimal.type,
      resolveDialogueIndex(selectedAnimal.type, selectedAnimal.currentDialogueIndex, animalPhase, getUnlockedTypes()),
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

    // Phase 2: the exhaustion pool cycles, so there is always another line
    if (animalPhase === 2 && getPhase2ExtraDialogues(selectedAnimal.type).length > 0) return true;

    const unlocked = getUnlockedTypes();
    const cur = resolveDialogueIndex(selectedAnimal.type, selectedAnimal.currentDialogueIndex, animalPhase, unlocked);
    const next = resolveDialogueIndex(selectedAnimal.type, cur + 1, animalPhase, unlocked);
    return next < getTotalDialogueCount(selectedAnimal.type, animalPhase);
  };

  // Handle animal tap
  const handleAnimalTap = useCallback(async (animal: Animal) => {
    // Pick up any Tending done since the hook mounted (e.g. the player just
    // deepened the pattern in the pit) so Phase-5 selection/badge are current.
    await refreshTendingState();
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

      // Skip past any lines that reference still-locked animals so the
      // stored read position never points at a blocked line.
      const tapPhase = getAnimalPhase(progress.currentPhase, animal.type);
      const tapResolvePhase = (tapPhase === 5 ? 4 : tapPhase) as DialoguePhase;
      const resolved = resolveDialogueIndex(animal.type, animal.currentDialogueIndex, tapResolvePhase, getUnlockedTypes());
      if (resolved !== animal.currentDialogueIndex) {
        markDialogueRead(animal.id, resolved).catch(() => {});
        setAnimals(prev => prev.map(a => (a.id === animal.id ? { ...a, currentDialogueIndex: resolved } : a)));
        animal = { ...animal, currentDialogueIndex: resolved };
      }
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
        // Key events on the same weighted scale phase transitions use, so an
        // accelerated player (phaseProgress outpacing raw puzzlesSolved)
        // reaches the pre-finale crescendo events before the finale fires.
        const coordEvent = getCoordinatedEventLine(
          animal.type,
          progress.phaseProgress ?? progress.puzzlesSolved,
          progress.currentPhase,
          consumed,
          progress.unlockedAnimals ?? []
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

    // 4b. Offering request (Phase 2+) — the animal asks once for a themed word,
    // and reacts by name when the ledger has since delivered one. A fulfillment
    // reaction always lands (it's a response to the player); the initial request
    // line only fills an otherwise-quiet visit so it never crowds the main arc.
    if (!hasCoordinatedEvent && progress) {
      try {
        // Always allow a fulfillment reaction; only allow a fresh request line
        // (which the service consumes on read) when the visit is otherwise quiet.
        const offering = await takeOfferingDialogue(
          animal.type,
          progress.currentPhase as DialoguePhase,
          pages.length === 0
        );
        if (offering) {
          pages.push(offering.line);
        }
      } catch {
        // Offering-request dialogue is non-critical
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

    // 6b. Phase 0 narrative seed — innocent lines with dark double meanings
    // that Phase 4 recontextualizes. Deterministic: seed 0 becomes due on the
    // animal's 2nd dialogue session, seed 1 on its 5th; each delivers once.
    if (progress && progress.currentPhase === 0) {
      try {
        const sessionNumber = (getSession(animal.id)?.sessionsCompleted ?? 0) + 1;
        const seed = await getAndMarkNarrativeSeedPage(animal.type, sessionNumber);
        if (seed) {
          pages.push(seed);
        }
      } catch {
        // Narrative seeds are non-critical
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

    // 8a. Phase 4+: one-time callback recontextualizing the player's
    // Phase 3 choice now that the cult is revealed.
    if (animalPhase >= 4) {
      try {
        const choiceCallback = await getAndMarkPhase4CallbackPage(animal.type);
        if (choiceCallback) {
          pages.push(choiceCallback);
        }
      } catch {
        // Choice callbacks are non-critical
      }
    }

    // 8b. Phase 4+: one-time callbacks recontextualizing the Phase 0 seed
    // lines the player actually heard (one per visit, each shown once).
    if (animalPhase >= 4) {
      try {
        const seedCallback = await getAndMarkNarrativeCallbackPage(animal.type);
        if (seedCallback) {
          pages.push(seedCallback);
        }
      } catch {
        // Seed callbacks are non-critical
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
  }, [dialogueSlide, progress, refreshTendingState]);

  // Recompute hasNewDialogue for a specific animal after session changes
  const recomputeHasNewDialogue = useCallback((animal: Animal): boolean => {
    if (!animal.isUnlocked || !progress) return false;
    if (isOnCooldown(animal.id)) return false;
    const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
    const totalDialogues = getTotalDialogueCount(animal.type, animalPhase);
    if (animalPhase === 5) {
      const totalRegular = getTotalDialogueCount(animal.type, 4);
      // Still finishing the Phase-4 lines — genuinely has more.
      if (animal.currentDialogueIndex < totalRegular) return true;
      // Post-revelation: honest now — the badge lights only while the animal has
      // undelivered pool lines, and re-lights when a Tending milestone unlocks one.
      const pool = buildPhase5Pool(animal.type, tendingLevel, playerChoices[animal.type] ?? null);
      const caughtUp = tendingCaughtUp[animal.type] ?? 0;
      return caughtUp < pool.length;
    }
    const resolved = resolveDialogueIndex(animal.type, animal.currentDialogueIndex, animalPhase, getUnlockedTypes());
    if (animalPhase === 2 && resolved >= totalDialogues) {
      // Base block exhausted — honest badge: lit only while the exhaustion
      // pool still has undelivered (genuinely new) lines.
      return phase2PoolHasNew(animal.type, phase2Cursors[animal.type] ?? 0);
    }
    return resolved < totalDialogues;
  }, [progress, tendingLevel, tendingCaughtUp, playerChoices, phase2Cursors]);

  // Handle closing dialogue. Manual closes keep the session warm so
  // checking in with an animal never feels punitive.
  const closeDialogue = useCallback(async (startCooldown: boolean) => {
    hapticLight();
    const closingAnimal = selectedAnimal;

    // Terminal read: if the player is closing while on the LAST available line
    // for this animal at a finite phase (nothing more to advance to), advance
    // the stored index PAST it so the "!" badge goes honest-dark. Without this
    // the index caps at the last line forever (index < total stays true), so an
    // exhausted animal — lagging animals like the sloth hit this first — keeps
    // re-lighting its badge after every cooldown while showing only "Close",
    // which reads as being stuck. The cycling pools (Phase 2 exhaustion / Phase 5
    // post-revelation) genuinely always have more, so they're excluded.
    let terminalIndex: number | null = null;
    if (closingAnimal && progress && preDialoguePages.length === 0) {
      const animalPhase = getAnimalPhase(progress.currentPhase, closingAnimal.type);
      const isCyclingPool =
        animalPhase === 5 ||
        (animalPhase === 2 && getPhase2ExtraDialogues(closingAnimal.type).length > 0);
      if (!isCyclingPool) {
        // animalPhase is 0-4 here (5 is a cycling pool, excluded above).
        const unlocked = getUnlockedTypes();
        const cur = resolveDialogueIndex(closingAnimal.type, closingAnimal.currentDialogueIndex, animalPhase, unlocked);
        const next = resolveDialogueIndex(closingAnimal.type, cur + 1, animalPhase, unlocked);
        const total = getTotalDialogueCount(closingAnimal.type, animalPhase);
        if (next >= total && closingAnimal.currentDialogueIndex < total) {
          terminalIndex = total;
          await markDialogueRead(closingAnimal.id, total);
        }
      }
    }

    if (closingAnimal && startCooldown) {
      await endSession(closingAnimal.id);
    }
    // Refresh the animal's badge on cooldown-close OR when a terminal read just
    // advanced its index — either way hasNewDialogue may have changed.
    if (closingAnimal && (startCooldown || terminalIndex !== null)) {
      // Derive the committed index from the CURRENT state value inside the
      // functional update — never from this callback's closure. The forced
      // close that ends a session runs in the same tick as handleNextDialogue's
      // index advance, so the closure's copy of the animal is one line behind;
      // writing it back rolled the in-memory index backwards, and a newly
      // unlocked animal's grace period (no cooldown, no storage reload) then
      // re-served the already-read line at the start of the next session.
      setAnimals(prev =>
        prev.map(a => {
          if (a.id !== closingAnimal.id) return a;
          const idx = terminalIndex !== null
            ? Math.max(terminalIndex, a.currentDialogueIndex)
            : a.currentDialogueIndex;
          const committed = { ...a, currentDialogueIndex: idx };
          return { ...committed, hasNewDialogue: recomputeHasNewDialogue(committed) };
        })
      );
    }
    setShowDialogue(false);
    setSelectedAnimal(null);
    setSessionInfo(null);
    setPreDialoguePages([]);
  }, [selectedAnimal, progress, preDialoguePages, recomputeHasNewDialogue, setAnimals]);

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
      const animalId = selectedAnimal.id;
      const animalName = selectedAnimal.name;
      await closeDialogue(true);
      setCooldownMessage(sessionEndMessage(animalName, isOnCooldown(animalId)));
      return;
    }

    // Per-animal phase awareness for dialogue progression
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);
    // Phase 2: the exhaustion pool means there is always another line — the
    // base block hands off to the pool instead of dead-ending on its last line.
    const phase2Pool = animalPhase === 2 ? getPhase2ExtraDialogues(selectedAnimal.type) : [];
    // Phase 5: the post-revelation pool cycles forever, and it only engages at
    // index >= totalRegular — without this clause the session would dead-end on
    // the last regular line and the pool could never be reached.
    const hasMore = animalPhase === 5 || phase2Pool.length > 0 || hasMoreDialogues(
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

      // Phase 5: if the line just shown was a genuinely-new pool line (not a
      // shuffled re-read), advance the animal's caught-up pointer and persist it,
      // so the badge stays honest and the next visit delivers the following new line.
      const totalRegular = getTotalDialogueCount(selectedAnimal.type, 4);
      let nextCaughtUp = tendingCaughtUp[selectedAnimal.type] ?? 0;
      if (animalPhase === 5 && selectedAnimal.currentDialogueIndex >= totalRegular) {
        const sel = selectPhase5(selectedAnimal.type, selectedAnimal.currentDialogueIndex);
        if (sel.isNew) {
          nextCaughtUp = sel.nextCaughtUp;
          const animalType = selectedAnimal.type;
          setTendingCaughtUp(prev => ({ ...prev, [animalType]: nextCaughtUp }));
          setPhase5CaughtUp(animalType, nextCaughtUp).catch(() => {});
        }
      }

      const status = getSessionStatus(selectedAnimal.id);
      setSessionInfo(status);

      const resolvePhase = (animalPhase === 5 ? 4 : animalPhase) as DialoguePhase;
      const unlocked = getUnlockedTypes();
      const cur = resolveDialogueIndex(selectedAnimal.type, selectedAnimal.currentDialogueIndex, resolvePhase, unlocked);
      const total2 = getTotalDialogueCount(selectedAnimal.type, 2);
      let newIndex: number;
      let nextPhase2Cursor = phase2Cursors[selectedAnimal.type] ?? 0;
      if (animalPhase === 2 && phase2Pool.length > 0 && cur >= total2) {
        // A pool line was just shown: pin the stored index at the base-block
        // end (never inflate it — Phase 3 reads it as a phase-start position)
        // and advance the persisted pool cursor instead.
        newIndex = total2;
        const animalType = selectedAnimal.type;
        nextPhase2Cursor = await advancePhase2PoolCursor(animalType);
        setPhase2Cursors(prev => ({ ...prev, [animalType]: nextPhase2Cursor }));
      } else {
        newIndex = resolveDialogueIndex(selectedAnimal.type, cur + 1, resolvePhase, unlocked);
      }
      await markDialogueRead(selectedAnimal.id, newIndex);

      // Whether genuinely-new (undelivered) lines remain, INDEPENDENT of cooldown:
      // at Phase 5 (post-revelation) the Tending pool / caught-up pointer; at
      // Phase 2 past the base block the exhaustion-pool cursor; otherwise the
      // normal index-vs-total check.
      let hasUndeliveredLines: boolean;
      if (animalPhase === 5 && newIndex >= totalRegular) {
        const pool = getPhase5Pool(selectedAnimal.type);
        hasUndeliveredLines = nextCaughtUp < pool.length;
      } else if (animalPhase === 2 && phase2Pool.length > 0 && newIndex >= total2) {
        hasUndeliveredLines = phase2PoolHasNew(selectedAnimal.type, nextPhase2Cursor);
      } else {
        const totalDialogues = getTotalDialogueCount(selectedAnimal.type, animalPhase);
        hasUndeliveredLines = newIndex < totalDialogues;
      }
      // The "!" badge is lit only when undelivered lines remain AND the animal is
      // available to talk (not resting on cooldown) — mirrors getAnimalsWithStatus.
      const hasNewDialogue = !isOnCooldown(selectedAnimal.id) && hasUndeliveredLines;

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
        const animalId = selectedAnimal.id;
        const animalName = selectedAnimal.name;
        await closeDialogue(true);
        // closeDialogue may have just started this animal's cooldown (e.g. the
        // grace period ending on the 2nd post-unlock session, when the session
        // increment crosses GRACE_PERIOD_SESSIONS). Re-derive the badge with the
        // SETTLED cooldown state — read the same way the message below is — so
        // the "!" badge and the session-end message can never disagree: if the
        // animal is now resting, the badge goes dark until the cooldown clears
        // (getAnimalsWithStatus re-lights it on the next home load).
        const restingNow = isOnCooldown(animalId);
        setAnimals(prev =>
          prev.map(a =>
            a.id === animalId
              ? { ...a, hasNewDialogue: !restingNow && hasUndeliveredLines }
              : a
          )
        );
        setCooldownMessage(sessionEndMessage(animalName, restingNow));
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
  }, [selectedAnimal, progress, closeDialogue, setAnimals, preDialoguePages, onFoxPlayPrompt, tendingLevel, tendingCaughtUp, playerChoices, phase2Cursors]);

  // Handle player choosing a dialogue option (Phase 3 choice points)
  const handleDialogueChoice = useCallback(async (choice: PlayerChoice) => {
    if (!selectedAnimal || !activeChoice) return;
    hapticSelection();
    try {
      const result = await recordChoice(selectedAnimal.type, choice);
      setPlayerChoices(prev => ({ ...prev, [selectedAnimal.type]: choice }));
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
