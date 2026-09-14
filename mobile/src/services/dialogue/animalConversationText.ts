import { AnimalType, DialoguePhase, HomeWorldProgress } from '../../types/homeWorld';
import { EARLY_CONVERSATION_ADAPTATIONS } from './conversationAdaptationsEarly';
import { MIDDLE_CONVERSATION_ADAPTATIONS } from './conversationAdaptationsMiddle';
import { LATE_CONVERSATION_ADAPTATIONS } from './conversationAdaptationsLate';

export interface AnimalConversationTemporalVariants {
  shadows?: string;
  revealed?: string;
  arrived?: string;
}

/** Stable IDs let presentation change tense without changing saved reading order. */
export const ANIMAL_CONVERSATION_ADAPTATIONS: Readonly<Record<string, AnimalConversationTemporalVariants>> = {
  ...EARLY_CONVERSATION_ADAPTATIONS,
  ...MIDDLE_CONVERSATION_ADAPTATIONS,
  ...LATE_CONVERSATION_ADAPTATIONS,
};

const ANIMAL_DIALOGUE_PREFIX: Record<AnimalType, string> = {
  fox: 'fx_', pangolin: 'pg_', owl: 'ow_', axolotl: 'ax_', sloth: 'sl_',
  fennec_fox: 'ff_', capybara: 'cp_', wombat: 'wb_', rabbit: 'rb_',
  red_panda: 'rp_', tarsier: 'tr_', aye_aye: 'ay_', kakapo: 'kk_',
};

export interface AnimalConversationTextContext {
  animalType: AnimalType;
  id?: string;
  text: string;
  authoredPhase: DialoguePhase;
  /** The current house, independent of this resident's conversation cursor. */
  worldPhase: DialoguePhase;
  /** The Arrival can finish while the house is still waiting to enter Phase 5. */
  arrivalOccurred?: boolean;
}

/** The final board queues Arrival; only its saved acknowledgement completes it. */
export function hasAnimalConversationArrivalOccurred(progress: Pick<
  HomeWorldProgress,
  'postRevelation' | 'finalPuzzleCompleted' | 'pendingCeremonies' | 'currentPhase'
>): boolean {
  return progress.currentPhase === 5 || progress.postRevelation === true ||
    (progress.finalPuzzleCompleted === true &&
      !progress.pendingCeremonies?.some(ceremony => ceremony.kind === 'arrival'));
}

function selectTemporalText(
  key: string,
  original: string,
  worldPhase: DialoguePhase,
  arrivalOccurred = false,
): string {
  const variants = ANIMAL_CONVERSATION_ADAPTATIONS[key];
  if (!variants) return original;
  if ((arrivalOccurred || worldPhase >= 5) && variants.arrived) return variants.arrived;
  if ((arrivalOccurred || worldPhase >= 4) && variants.revealed) return variants.revealed;
  if ((arrivalOccurred || worldPhase >= 3) && variants.shadows) return variants.shadows;
  return original;
}

/**
 * Deliver the same authored utterance in its original sequence. A small set
 * of event-dependent lines has individual temporal variants; ordinary hobbies,
 * jokes and shared company remain verbatim even under a later house sky.
 * This never advances a cursor, edits the manuscript or invents a past choice.
 * The caller still owns eligibility for material from a future story chapter.
 */
export function adaptAnimalConversationText({
  animalType,
  id,
  text,
  authoredPhase,
  worldPhase,
  arrivalOccurred = false,
}: AnimalConversationTextContext): string {
  if (!id || !id.startsWith(ANIMAL_DIALOGUE_PREFIX[animalType]) ||
    (!arrivalOccurred && worldPhase < authoredPhase)) return text;
  return selectTemporalText(id, text, worldPhase, arrivalOccurred);
}

/** Keep every original introductory beat; only obsolete event claims change. */
export function adaptAnimalIntroductionLines(
  animalType: AnimalType,
  lines: readonly string[],
  worldPhase: DialoguePhase,
  arrivalOccurred = false,
): string[] {
  return lines.map((line, index) => selectTemporalText(
    `${animalType}:intro:${index}`, line, worldPhase, arrivalOccurred,
  ));
}
