import { AnimalType } from '../../types/homeWorld';
import { PlayerChoice, getPhase5ChoiceCallback } from '../dialogueChoices';
import { getPostRevelationDialogue, getPostRevelationDialogueCount } from './animalDialogueIntro';
import { getTendingMilestoneLines } from './animalDialogueTending';

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
 * KNOWN GAP, and the shape any fix must take. Post-revelation lines are not
 * filtered against the unlocked animals, on the old premise that Phase 5
 * implied a finished house. It does not any more: the endgame also arms on a
 * bare 115-solve floor, so a player who spent amber on cosmetics instead of
 * rooms can hear an animal name a keeper they never met. The filter must NOT
 * shrink this array: `caughtUp` is a persisted COUNT pointer into it, the
 * player can still finish the house after the reveal, and a pool that grows
 * back re-serves already-read lines as "new" while the restored ones surface
 * only through the shuffled re-read cycle. Keep the coordinate space
 * index-stable and pass an eligibility predicate down into selectPhase5Dialogue
 * instead (that needs lineMentionsLockedAnimal exported from
 * animalDialogueNarrative, which is why it is not done here).
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

/** Length of the Phase-5 pool — how many distinct lines currently exist. */
export function getPhase5PoolLength(
  animalType: AnimalType,
  tendingLevel: number,
  playerChoice: PlayerChoice | null
): number {
  return buildPhase5Pool(animalType, tendingLevel, playerChoice).length;
}
