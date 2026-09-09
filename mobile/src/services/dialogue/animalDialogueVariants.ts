import { AnimalType } from '../../types/homeWorld';

// The body explains the actual rules. A timed board never measures loyalty.
const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: "Work down to the last word, then climb back up to the first. Every word has to be a real one, going down and coming back.",
    dark: "This route ends where it began. Carry the letters down to the last word, then work back up. Every word must be a real word.",
  },
  speed: {
    light: "A shorter board, with a timer running while you solve it. Good practice for quick decisions. Next time you can choose a different mode.",
    dark: "A shorter board, and a timer. Keep an eye on the clock while you work. The next board can go at a different pace.",
  },
  double_shift: {
    light: "Two letters move at every step. Put both into the next word, and check that both words are real ones.",
    dark: "Two letters travel at every step. Both words change, and both must still be real words.",
  },
};

const VARIANT_DIALOGUE_LEADS: Record<AnimalType, { light: string; dark: string }> = {
  fox: { light: "Oh! There's a new way to move the words. Let me put the kettle down and show you.", dark: "The fire answered differently when you took that route. Here is what changed in the rules." },
  owl: { light: "A variation. An excellent reason to read the instructions before I invent a theory.", dark: "I checked the new rules against what actually happened. That is a useful place to begin." },
  pangolin: { light: "A different recipe, same letters. Read it through before you put anything in the pot.", dark: "The method has changed. Let us understand it before we decide the ending is already settled." },
  axolotl: { light: "Oh, that went differently! I watched the whole thing. GLOW mostly watched the spoon.", dark: "The water took a different route this time. I want to understand this part while I can still see it." },
  fennec_fox: { light: "That had a rhythm I hadn't heard before. Let's find out what made it.", dark: "Those moves made a different sound. The rules explain part of what I heard." },
  capybara: { light: "New procedure. Here is the short briefing.", dark: "A revised procedure. The instructions are still here whenever you want them." },
  sloth: { light: "A different pace. I noticed, even from the hammock.", dark: "The route has changed. You are still allowed to take your time with it." },
  wombat: { light: "Different plan. Let's have a look at how the pieces fit together.", dark: "The load shifted differently that time. Here is the part of it I can explain." },
  rabbit: { light: "New instructions. Good. I like knowing what's changed before I try it.", dark: "I wrote the new rules down. Knowing them helps me more than being told not to worry." },
  red_panda: { light: "A new arrangement. Let's start with the practical part.", dark: "I noticed the change. I will let the instructions explain it before I offer my own reading." },
  tarsier: { light: "I watched that route from the rail. It deserves its own page in my log.", dark: "A new route to record. I checked every step before I gave the shape a name." },
  aye_aye: { light: "That made a different run of knocks through the beams. Let me show you what changed.", dark: "The beams answered a different sequence. Here is how that sequence actually goes." },
  kakapo: { light: "A new way through. A gardener can appreciate a path that changes.", dark: "A different path through the words. I would like to see where each step leads." },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  const lead = VARIANT_DIALOGUE_LEADS[animalType] ?? { light: "The words took a different route. Here is how it works.", dark: "The route has changed. We can look at the new rules together." };
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
    : "Oh! There's another way to move the words now. Put the kettle down, Ember. Show the useful part.";
  const body = phase >= 3 ? script.dark : script.light;
  const cta = "Pick it from the setup button before you start. You can still play the modes you already enjoy.";

  return [introLead, body, cta];
}
