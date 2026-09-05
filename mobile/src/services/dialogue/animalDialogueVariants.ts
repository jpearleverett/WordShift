import { AnimalType } from '../../types/homeWorld';

// The body explains the actual rules. A timed board never measures loyalty.
const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: 'This route goes down to the last word, then back up to the first. Keep the chain valid in both directions.',
    dark: 'The route returns to its beginning. Carry the letters down, then work back up through a valid chain.',
  },
  speed: {
    light: 'This is a shorter board with a timer. It is a chance to try quicker decisions; you can choose another mode next time.',
    dark: 'A shorter board, with a timer. Watch the clock as you work. The next board can use a different pace.',
  },
  double_shift: {
    light: 'Move two letters at each step. Place both in the next word and make sure the new words are valid.',
    dark: 'Two letters travel at each step. Both words change, and both must remain valid.',
  },
};

const VARIANT_DIALOGUE_LEADS: Record<AnimalType, { light: string; dark: string }> = {
  fox: { light: "Oh! A new way to move the words. Let me put the kettle down so I can show you.", dark: "I saw the fire respond differently to that route. Here is what changed in the rules." },
  owl: { light: "A variation. An excellent reason to consult the instructions before inventing a theory.", dark: "I checked the rules against the result. A useful place to begin." },
  pangolin: { light: "A different recipe for the same letters. Read it before putting everything in the pot.", dark: "The method changed. I would like us to understand it before calling the result inevitable." },
  axolotl: { light: "Oh, that went differently! I was watching. GLOW was mostly watching the spoon.", dark: "The water took a different route. I want to understand this part while I can see it." },
  fennec_fox: { light: "That had a rhythm I hadn't heard before. Let's look at what made it.", dark: "A different sound from those moves. The rules explain part of what I heard." },
  capybara: { light: "New procedure. Short briefing.", dark: "A revised procedure. The instructions remain available." },
  sloth: { light: "A different pace. I noticed from the hammock.", dark: "The route changed. You are still allowed time to understand it." },
  wombat: { light: "Different plan. Let's check how the pieces fit.", dark: "The load moved differently. Here is the part we can account for." },
  rabbit: { light: "New instructions. Good. I like being told what has changed before trying it.", dark: "I wrote down the changed rules. Knowing them helps more than being told not to worry." },
  red_panda: { light: "A new arrangement. We can look at its practical part first.", dark: "I noticed a change. I will let the instructions explain it before offering an interpretation." },
  tarsier: { light: "I watched that route from the rail. It deserves its own page in the log.", dark: "A new route to record. I checked the steps before giving the shape a name." },
  aye_aye: { light: "A different run of knocks through the beams. Let me show you what changed.", dark: "The beams answered a different sequence. These are its actual steps." },
  kakapo: { light: "A new way through. A gardener can appreciate a path changing.", dark: "A different path through the words. I'd like to see where each step goes." },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  const lead = VARIANT_DIALOGUE_LEADS[animalType] ?? { light: "The words took a different route. Here is how it works.", dark: "The route changed. We can check its rules." };
  return phase >= 3 ? lead.dark : lead.light;
}

/** One-time explanation on the next animal visit after a variant unlocks. */
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

/** Ember's three-page explanation on the post-victory card. */
export function getVariantTutorialIntroLines(
  variant: string,
  phase: number
): string[] | null {
  const script = VARIANT_TUTORIAL_LINES[variant];
  if (!script) return null;

  const introLead = phase >= 3
    ? 'There is another way to arrange the words. Let me show you what changes.'
    : 'Oh! Another way to move the words has opened. Put the kettle down, Ember. Show the useful part.';
  const body = phase >= 3 ? script.dark : script.light;
  const cta = 'Choose it from the setup button before you begin. You can keep using the modes you already enjoy.';

  return [introLead, body, cta];
}
