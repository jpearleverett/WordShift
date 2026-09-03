import { AnimalType } from '../../types/homeWorld';
import { PlayerChoice, getPhase5ChoiceCallback } from '../dialogueChoices';
import { getPostRevelationDialogue, getPostRevelationDialogueCount } from './animalDialogueIntro';
import { getTendingMilestoneLines } from './animalDialogueTending';
import { lineMentionsLockedAnimal } from './animalDialogueNarrative';

/**
 * Build an animal's ordered Phase-5 line pool:
 *   [ base post-revelation lines, optional Phase-3 choice callback, unlocked
 *     Tending milestone lines ]
 *
 * The pool grows as the player deepens the pattern at the Tending Shrine (new
 * milestone lines append at the end). It is the single source of truth shared by
 * the dialogue hook's selection and the home-screen "new dialogue" badge so the
 * two can never disagree about how much content currently exists.
 *
 * The pool is NEVER filtered. Unmet-animal gating rides alongside it as an
 * index PREDICATE (buildPhase5Eligibility) rather than as a shorter array,
 * because `caughtUp` is a persisted COUNT pointer into these exact indices and
 * the player can still finish the house after the reveal. A pool that shrank
 * and grew back would re-serve already-read lines as "new" while the restored
 * ones surfaced only through the shuffled re-read cycle.
 */
export function buildPhase5Pool(
  animalType: AnimalType,
  tendingLevel: number,
  playerChoice: PlayerChoice | null
): string[] {
  const prCount = getPostRevelationDialogueCount(animalType);
  const base: string[] = [];
  for (let i = 0; i < prCount; i++) {
    base.push(getPostRevelationDialogue(animalType, i) || '');
  }
  const choiceCallback = getPhase5ChoiceCallback(animalType, playerChoice);
  const tendingLines = getTendingMilestoneLines(animalType, tendingLevel);
  return [
    ...base,
    ...(choiceCallback ? [choiceCallback] : []),
    ...tendingLines,
  ];
}

/**
 * Which indices of an animal's Phase-5 pool may be delivered right now.
 *
 * Post-revelation lines used to be exempt from the "never name an animal the
 * player hasn't met" rule, on the premise that Phase 5 implied a finished
 * house. The endgame-lockout fix ended that: it also arms on a bare solve
 * floor, so a player who spent amber on the cosmetic catalogue instead of the
 * last rooms reaches the reveal with keepers still unbuilt, and 36 authored
 * lines across 9 speakers name one. Those lines are good writing and stay in
 * the corpus; they are simply withheld until the player has met who they name,
 * and become deliverable the moment that room is built.
 *
 * Returns a predicate over pool INDICES so the pool's coordinate space never
 * moves. An empty `unlockedAnimals` means "not known" and gates nothing — the
 * same convention the rest of the dialogue layer uses.
 */
export function buildPhase5Eligibility(
  animalType: AnimalType,
  pool: string[],
  unlockedAnimals: string[]
): (index: number) => boolean {
  if (unlockedAnimals.length === 0) return () => true;
  const eligible = pool.map(line => !lineMentionsLockedAnimal(line, animalType, unlockedAnimals));
  return (index: number) => eligible[index] ?? true;
}
