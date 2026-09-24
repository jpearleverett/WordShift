import { AnimalType } from '../../types/homeWorld';

// The body explains the actual rules. A timed board never measures loyalty.
const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: "Work down to the last word, then climb back up to the first. On the climb, any letter that's already moved stays put. Every word has to be real, going down and coming back.",
    dark: "This route ends where it began. Carry the letters down to the last word, then work back up. On the way back, a letter that has moved once stays where it is. Every word along the way must be real.",
  },
  speed: {
    light: "The same boards, with a clock running while you solve. It sits on top of whatever style you pick, and you can switch it off again.",
    dark: "The same boards, with a clock laid over them. It works with any style you choose. Keep an eye on it while you work.",
  },
  double_shift: {
    light: "Two letters move at every step, both into the next word. Halfway through, the words can look like nonsense. Once both land, the word you left and the word you made must be real.",
    dark: "Two letters travel at every step. Between the first and the second, the words may be no words at all. Once both have landed, the word they left and the word they joined must be real.",
  },
};

const VARIANT_DIALOGUE_LEADS: Record<AnimalType, { light: string; dark: string }> = {
  fox: { light: "Oh! There's a new way to move the words. Let me put the kettle down and show you.", dark: "The fire answered differently when you took that route. Here is what has changed." },
  owl: { light: "A variation. An excellent reason to read the instructions before I invent a theory.", dark: "I checked the new rules against what actually happened. That is a useful place to begin." },
  pangolin: { light: "A different recipe, same letters. Read it through before you put anything in the pot.", dark: "The method has changed. We should understand it before we decide anything is settled." },
  axolotl: { light: "Oh, the words found a new way to move! The tank rippled when it happened. GLOW mostly watched the spoon.", dark: "The water took a different route this time. I want to understand this part while I can still see it." },
  fennec_fox: { light: "There's a new rhythm in the words. I heard it from the camp. Let's find out what makes it.", dark: "Those moves made a different sound. The rules explain part of what I heard." },
  capybara: { light: "New procedure. Here's the short version.", dark: "A revised procedure. The instructions are still here whenever you want them." },
  sloth: { light: "A different pace. I noticed, even from the hammock.", dark: "The route's changed. You can still take your time with it." },
  wombat: { light: "Different plan. Let's have a look at how the pieces fit together.", dark: "The load shifted differently that time. Let me take you through the part I can account for." },
  rabbit: { light: "New instructions. Good. I like knowing what's changed before I try it.", dark: "I wrote the new rules down. Knowing them helps me more than being told not to worry." },
  red_panda: { light: "A new way to lay the words out. Let's start with the practical part.", dark: "I noticed the change. I will let the instructions explain it before I offer my own reading." },
  tarsier: { light: "I watched that route from the rail. It deserves its own page in my log.", dark: "A new route to record. I checked every step before I gave it a name." },
  aye_aye: { light: "That made a different run of knocks through the beams. Let me show you what changed.", dark: "The beams knocked back in a different order. Here is that order." },
  kakapo: { light: "A new way through. I like a path that changes.", dark: "A different path through the words. I would like to see where each step leads." },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  const lead = VARIANT_DIALOGUE_LEADS[animalType] ?? { light: "The words took a different route. Here's how it works.", dark: "The route has changed. We can look at the new rules together." };
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
    ? "There is another way to arrange the words now. Let me show you what changes."
    : "Oh! There's another way to move the words now. Kettle down, Ember. Right, let me show you the useful part.";
  const body = phase >= 3 ? script.dark : script.light;
  const cta = "Pick it in the setup, above the board, before you start. The ways you already like are still there.";

  return [introLead, body, cta];
}
