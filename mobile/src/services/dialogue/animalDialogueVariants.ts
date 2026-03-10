import { AnimalType } from '../../types/homeWorld';

// =============================================================================
// VARIANT TUTORIAL DIALOGUE
// =============================================================================

const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: 'That puzzle had a return path. You carry letters all the way down, then walk them back to the first word.',
    dark: 'The arrangement asked for a full circuit: down to the last row, then back to the first without breaking the chain.',
  },
  speed: {
    light: 'Speed shifts are short and urgent. Fewer rows, faster choices, no overthinking.',
    dark: 'When the pattern rushes you, it is testing devotion under pressure.',
  },
  double_shift: {
    light: 'Double shifts move two letters at once. Pick two from a word, place each into the next. More to juggle, more to explore.',
    dark: 'Two offerings per step. The arrangement demands a heavier hand — two letters wrenched free and placed in a single breath.',
  },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  if (phase >= 3) {
    switch (animalType) {
      case 'fox':
        return 'The fire showed me what happened in your last puzzle.';
      case 'owl':
        return 'I checked the text after your last arrangement.';
      case 'pangolin':
        return 'I felt the recipe change while you solved.';
      case 'axolotl':
        return 'The water rippled when you finished.';
      case 'fennec_fox':
        return 'I heard the shape of that puzzle from across the house.';
      case 'capybara':
        return 'I logged the sequence while it was still warm.';
      case 'sloth':
        return 'I watched it... slowly... all the way through.';
      case 'wombat':
        return 'I felt that structure in the foundations.';
      case 'rabbit':
        return 'I could feel my heartbeat matching your puzzle steps.';
      case 'red_panda':
        return 'The pattern from your puzzle reached the highest room immediately.';
      default:
        return 'I felt that variant in the structure of the house.';
    }
  }

  switch (animalType) {
    case 'fox':
      return 'That was a different kind of puzzle run.';
    case 'owl':
      return 'Interesting variation in your latest sequence.';
    case 'pangolin':
      return 'That puzzle had a different recipe to it.';
    case 'axolotl':
      return 'Blub! That one felt different in the water.';
    case 'fennec_fox':
      return 'I could hear that mode from your first move.';
    case 'capybara':
      return 'That variant changed the pacing a lot.';
    case 'sloth':
      return 'That one... moved... differently...';
    case 'wombat':
      return 'That mode changed the whole structure of the run.';
    case 'rabbit':
      return 'That variant made my paws sweat just watching.';
    case 'red_panda':
      return 'That variation altered the rhythm of the pattern.';
    default:
      return 'That variant plays by a different rhythm.';
  }
}

/**
 * One-time tutorial dialogue line for newly encountered puzzle variants.
 * Shown as a pre-dialogue page when the player next talks to an animal.
 */
export function getVariantTutorialDialogue(
  animalType: AnimalType,
  variant: string,
  phase: number
): string | null {
  const script = VARIANT_TUTORIAL_LINES[variant];
  if (!script) return null;
  const lead = getVariantDialogueLead(animalType, phase);
  const body = phase >= 3 ? script.dark : script.light;
  return `${lead} ${body}`;
}

export function getVariantTutorialIntroLines(
  variant: string,
  phase: number
): string[] | null {
  const script = VARIANT_TUTORIAL_LINES[variant];
  if (!script) return null;

  const introLead = phase >= 3
    ? 'Something new settled into the house after that puzzle.'
    : 'You unlocked a new kind of puzzle just now.';
  const body = phase >= 3 ? script.dark : script.light;
  const cta = phase >= 3
    ? 'You can choose it from the setup button before you play. More arrangements reveal themselves with time.'
    : 'You can choose it from the setup button before you play. More puzzle styles will appear as we keep going.';

  return [introLead, body, cta];
}
