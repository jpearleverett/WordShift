import { AnimalType } from '../../types/homeWorld';

// =============================================================================
// VARIANT TUTORIAL DIALOGUE
// =============================================================================

const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: 'There was a return path folded into it. You carry your letters all the way down to the last word, and then you walk them back up to the first, the whole road twice.',
    dark: 'The arrangement wanted a full circuit this time, down to the last word and then back up to the first, with the chain unbroken the whole way home.',
  },
  speed: {
    // Animal-agnostic by design (this body is appended to EVERY animal's lead
    // in getVariantTutorialDialogue) — keep it warm but personality-neutral.
    light: 'The quick kind is short and urgent. Fewer words to cross, faster choices, and no time left over for second thoughts. That rush is the whole idea.',
    dark: 'When the pattern hurries you like that, it is weighing devotion under pressure. Fewer words, less time, and no room to hesitate, so that only the certain hand finishes.',
  },
  double_shift: {
    light: 'The doubled kind asks for two letters at once. You lift a pair from one word and settle each of them into the next, which is more to hold at once and more to discover.',
    dark: 'The arrangement asks a heavier hand of you now. Two letters lifted free and set down in a single breath, two offerings carried together at every step.',
  },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  if (phase >= 3) {
    switch (animalType) {
      case 'fox':
        return 'Friend, the fire sat straight up and showed me what you just did with the words you brought, every flicker of it, and I have been holding my breath waiting to tell you.';
      case 'owl':
        return 'I consulted the book after your latest arrangement, and it had, of course, already made a note of the change.';
      case 'pangolin':
        return 'I felt the recipe change under my paws while you worked, the way a stock changes the moment a new bone goes in.';
      case 'axolotl':
        return 'The water rippled when you finished, all the way to the glass, and something far down turned over slowly to watch you do it.';
      case 'fennec_fox':
        return 'I heard the shape of it from clear across the house, and it was not a shape my ears had ever been given before.';
      case 'capybara':
        return 'I logged the sequence while it was still warm. It required a new folder, which does not happen often anymore.';
      case 'sloth':
        return 'I watched the whole of it from my branch, slowly and all the way through, and it moved the way arriving things move.';
      case 'wombat':
        return 'I felt that structure come down through the foundations, and it set its weight differently than any load I have carried before.';
      case 'rabbit':
        return 'The whole garden leaned while you worked, and my heart kept time with every word you moved. I have learned to trust what my heart notices.';
      case 'red_panda':
        return 'The pattern of what you offered reached the highest room before you had finished making it. The attic always knows first.';
      default:
        return 'I felt that new shape settle into the bones of the house.';
    }
  }

  switch (animalType) {
    case 'fox':
      return 'Friend, that was a whole new kind of dance you just did with your words, and I watched every step of it from right here by the fire!';
    case 'owl':
      return 'A noteworthy variation in your latest sequence, and I say that as someone who keeps meticulous records of your sequences.';
    case 'pangolin':
      return 'The words you brought followed a different recipe this time, and I could taste the difference from my kitchen.';
    case 'axolotl':
      return 'Oh, the water felt that one differently, it rippled a brand new way and every single fish turned at once to look!';
    case 'fennec_fox':
      return 'I could hear the difference from your very first move. It made a sound I had not catalogued yet, and I catalogue everything.';
    case 'capybara':
      return 'That changed the pacing considerably. I have adjusted the paperwork, which is my way of saying I noticed.';
    case 'sloth':
      return 'That one moved differently, and I have watched enough of your words go by to know a new gait when it ambles past my branch.';
    case 'wombat':
      return 'That one was built on a different plan altogether. I could feel it in the way the weight came down.';
    case 'rabbit':
      return 'That new way of yours made my paws damp just from watching, and I mean that as a compliment, mostly.';
    case 'red_panda':
      return 'The rhythm changed just now. Even the bamboo noticed.';
    default:
      return 'The words you brought moved to a different rhythm this time.';
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

  // This lead is spoken by Ember on the post-victory Fox card, so at bright
  // phases it carries her voice (first person, delighted); dark phases keep
  // the hushed register.
  const introLead = phase >= 3
    ? 'Something new settled into the house after the words you offered just now.'
    : 'Oh! Something new just clicked open, I felt it from here! There is a whole new way to move your words now.';
  const body = phase >= 3 ? script.dark : script.light;
  const cta = phase >= 3
    ? 'You can choose it from the setup button before you begin. More arrangements will reveal themselves in their own time.'
    : 'You can choose it from the setup button before you begin. More ways will show themselves as we keep going.';

  return [introLead, body, cta];
}
