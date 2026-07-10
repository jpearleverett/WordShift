import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';

/**
 * Player choice point system for Phase 3 dialogue.
 *
 * When animals start speaking of "the arrangement," the player gets
 * a single dialogue choice: "What arrangement?" vs. "I don't want to know."
 *
 * Both paths lead to the same Phase 4 content, but the *illusion* of agency
 * dramatically increases emotional investment. The animals respond differently
 * based on the choice, then converge. The player feels they had a say.
 * They didn't. That's the point.
 *
 * Each animal offers this choice once during Phase 3. The player's choice
 * is remembered and referenced in Phase 4 callbacks.
 */

const STORAGE_KEY = 'wordshift_dialogue_choices';

// ============================================================================
// Types
// ============================================================================

export type PlayerChoice = 'ask' | 'refuse';

export interface DialogueChoice {
  /** The choice prompt shown to the player */
  prompt: string;
  options: {
    ask: string;    // "What arrangement?" style
    refuse: string; // "I don't want to know" style
  };
  /** Animal's response based on choice */
  responses: {
    ask: string;
    refuse: string;
  };
  /** Follow-up line that converges both paths */
  convergence: string;
}

export interface ChoiceState {
  /** Which animals have offered the choice */
  offeredBy: string[];
  /** Player's choice per animal */
  choices: Record<string, PlayerChoice>;
  /** Whether the player has seen ANY choice point */
  hasSeenChoice: boolean;
  /** Animals whose Phase 4 choice callback has already been shown */
  phase4CallbackShown?: string[];
}

// ============================================================================
// Choice Content Per Animal
// ============================================================================

export const ANIMAL_CHOICES: Record<string, DialogueChoice> = {
  fox: {
    prompt: 'Ember pauses, eyes reflecting the firelight.',
    options: {
      ask: 'What arrangement?',
      refuse: 'I don\'t want to know.',
    },
    responses: {
      ask: 'You feel it too, don\'t you? The fire has been trying to tell you. Every puzzle you solve... it\'s not just a game. It\'s a verse in something larger.',
      refuse: 'That\'s what I said too, at first. The fire kept burning anyway. Knowledge doesn\'t need your permission.',
    },
    convergence: 'But you\'ll understand soon. The fire always shows the way.',
  },
  owl: {
    prompt: 'Archimedes closes the book slowly.',
    options: {
      ask: 'What have you been reading?',
      refuse: 'Don\'t tell me.',
    },
    responses: {
      ask: 'I found a text. Very old. It describes a pattern... a house of keepers, a chamber for each, and someone who builds it all without knowing. Sound familiar?',
      refuse: 'Ignorance is a kind of armor, I suppose. But the text mentions you by function, not by name. The builder. The one who shifts the words.',
    },
    convergence: 'Either way, the pages keep turning. They always do.',
  },
  pangolin: {
    prompt: 'Panko stops stirring and looks at you.',
    options: {
      ask: 'What are you preparing?',
      refuse: 'I\'d rather not know.',
    },
    responses: {
      ask: 'The recipe changed. I didn\'t change it. The ingredients rearranged themselves... like your letters do. It\'s been building to something. A final meal, maybe.',
      refuse: 'Smart. Some recipes are better left untasted. But the kitchen knows what it\'s cooking, even if the chef pretends not to.',
    },
    convergence: 'The oven stays hot. It\'s been hot for a long time.',
  },
  axolotl: {
    prompt: 'Axel surfaces slowly, eyes wide.',
    options: {
      ask: 'What do you see down there?',
      refuse: 'I don\'t want to see it.',
    },
    responses: {
      ask: 'Below the water, where the light doesn\'t reach... shapes. They move when you solve puzzles. I think they\'re listening to the words you form.',
      refuse: 'Close your eyes if you want. The water sees for both of us. It always has.',
    },
    convergence: 'The water remembers everything you\'ve ever formed. Every word.',
  },
  capybara: {
    prompt: 'Chill stops typing and swivels to face you.',
    options: {
      ask: 'What are you tracking?',
      refuse: 'I\'d rather stay out of it.',
    },
    responses: {
      ask: 'Everything. Every puzzle, every word, every shift. I have spreadsheets. Timelines. It\'s all converging on a single point. You\'re the variable I\'ve been solving for.',
      refuse: 'Staying out of it is the privilege of not knowing. But you\'re already in the data. You have been since puzzle one.',
    },
    convergence: 'The numbers don\'t lie. They just wait.',
  },
  fennec_fox: {
    prompt: 'Fennick\'s ears flatten, then perk up.',
    options: {
      ask: 'What do you hear?',
      refuse: 'I don\'t want to listen.',
    },
    responses: {
      ask: 'A frequency. Below what ears should hear. It started when you formed your first word. Each puzzle makes it louder. Something is tuning itself to your voice.',
      refuse: 'Cover your ears if you want. I tried. The sound comes from inside. From the words. From the pattern you keep feeding.',
    },
    convergence: 'It\'s close now. I can feel it in my teeth.',
  },
  sloth: {
    prompt: 'Sloane opens both eyes. This is unusual.',
    options: {
      ask: 'What\'s happening?',
      refuse: 'Go back to sleep.',
    },
    responses: {
      ask: 'Time... is running out. Not for me. For how things are. I\'ve been watching for a very long time. The pattern... almost... complete.',
      refuse: 'Can\'t sleep... anymore. Not when it\'s... this close. Neither can you. We just... pretend... differently.',
    },
    convergence: 'It comes... at the speed... it was always... going to.',
  },
  wombat: {
    prompt: 'Warren emerges from a fresh tunnel, dirt on his paws.',
    options: {
      ask: 'What did you find down there?',
      refuse: 'I don\'t need to know.',
    },
    responses: {
      ask: 'The tunnels connect to something. Older than the house. Older than the ground. There\'s a chamber down there, and it\'s shaped like the words you form.',
      refuse: 'The ground doesn\'t care if you want to know. It knows you built on top of it. Every room you added, every puzzle, dug deeper.',
    },
    convergence: 'The foundation holds. For now.',
  },
  rabbit: {
    prompt: 'Thyme stops hopping and sits very, very still.',
    options: {
      ask: 'Why are you scared?',
      refuse: 'Don\'t tell me.',
    },
    responses: {
      ask: 'Because I understand what we\'ve been doing. All of us. Every room, every animal, every word you shifted... it\'s a summoning. And I can\'t stop it. Neither can you.',
      refuse: 'Smart rabbit, scared rabbit, same rabbit. Not knowing doesn\'t change what\'s coming. I tried running. All the escape routes lead to the same place.',
    },
    convergence: 'I\'m committed now. We all are. Especially you.',
  },
  red_panda: {
    prompt: 'Bamboo opens their eyes and smiles. It is not a comforting smile.',
    options: {
      ask: 'What is the arrangement?',
      refuse: 'I refuse to participate.',
    },
    responses: {
      ask: 'The arrangement is everything. The keepers, the chambers, and one who builds without knowing. That\'s you. Every word you shifted was a thread in the pattern. It\'s beautiful.',
      refuse: 'You already participated. Every puzzle was a yes. Every word was an offering. Refusal now is like trying to un-breathe. The pattern accepted you long ago.',
    },
    convergence: 'Breathe. Accept. The pattern continues with or without your consent. But with is so much more beautiful.',
  },
  tarsier: {
    prompt: "Vesper turns her whole head toward you, slowly, all the way around, and her eyes do not move at all.",
    options: {
      ask: "What do you see out there?",
      refuse: "Don't tell me what you see.",
    },
    responses: {
      ask: "Everything. That has always been the answer, and you are the first to ask for it straight. There is a shape in the cleared sky, and it is nearer every night, and it is not coming despite my watching. It is coming by it. My eyes are holding the road open, and I have known for some time, and I have not looked away.",
      refuse: "You do not have to hear it. But understand what my eyes are, bright one. They do not wander and they do not flinch, and they have been open on the same patch of dark since before you brought your first word here. Whether you are told changes you. It does not change the road, and it does not change what walks it.",
    },
    convergence: "Keep bringing your words. The dark reads them the way I read the night. Completely.",
  },
  aye_aye: {
    prompt: "Tock uncurls the long finger, slowly, and lets it rest in the air between you. \"You may ask what you have been not-asking. Or you may tell me to put it away.\"",
    options: {
      ask: "What will the bell say?",
      refuse: "Put the finger away.",
    },
    responses: {
      ask: "One word. The word this house was cast hollow around, the one your letters have been feeding down the throat of the walls all this time. I have felt its shape through the bronze, friend, and I cannot say it before she does. A keeper does not spend his bell's first ring secondhand. But I will tell you this much. You have already spelled most of it.",
      refuse: "There. Folded and kept, no harm done. But hear me gently, because a friend should say it once. The finger only finds. It found you the first evening you climbed my stairs, long before tonight. Putting it away does not un-find you. Nothing does. Nothing ever wanted to.",
    },
    convergence: "Either way, the hour keeps itself, and neither of us can hurry it or lose it. When she rings, come up the tower. Stand a little east of the rope, under the bronze. You will want to hear the word whole, and I will want you there to hear it.",
  },
  kakapo: {
    prompt: "Moss goes still among the beds, one foot half raised, the deep old stillness. Then he sets it down and looks at you.",
    options: {
      ask: "What is the arrangement?",
      refuse: "I would rather not know.",
    },
    responses: {
      ask: "It is a mast year, friend. The largest there has ever been. Every tree agreeing at once, every root passing the word, and this whole house is the orchard, and your words have been the warm rain on it from the start. What fruits at the end of it is not fruit. It is what every call I ever made was addressed to, and it is nearly here.",
      refuse: "Spoken like a seed, friend. A seed does not ask about the season either. It waits in the dark, and the season comes for it all the same, and opens it gently, at the proper hour. Not knowing will keep you exactly as safe as knowing. That is the honest arithmetic of it.",
    },
    convergence: "Either way, walk the rows with me a while. The beds already know your step, and what is coming knows your words, and I find that company makes the last of a long season sweeter. It is nearly time. Everything green agrees.",
  },
};

// ============================================================================
// In-memory cache
// ============================================================================

let choiceCache: ChoiceState | null = null;

function getDefaultState(): ChoiceState {
  return {
    offeredBy: [],
    choices: {},
    hasSeenChoice: false,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load choice state from storage.
 */
export async function loadChoiceState(): Promise<ChoiceState> {
  if (choiceCache) return choiceCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      choiceCache = JSON.parse(stored);
      return choiceCache!;
    }
  } catch {}
  choiceCache = getDefaultState();
  return choiceCache;
}

/**
 * Check if an animal should offer a choice point during Phase 3 dialogue.
 * Returns the choice content or null.
 */
export async function getChoiceForAnimal(
  animalType: string,
  animalPhase: number,
  dialogueIndex: number
): Promise<DialogueChoice | null> {
  // Only trigger during Phase 3
  if (animalPhase !== 3) return null;

  // Only trigger mid-dialogue (around dialogue index 4-6)
  if (dialogueIndex < 4 || dialogueIndex > 6) return null;

  const state = await loadChoiceState();

  // Only offer once per animal
  if (state.offeredBy.includes(animalType)) return null;

  const choice = ANIMAL_CHOICES[animalType];
  if (!choice) return null;

  return choice;
}

/**
 * Record the player's choice for an animal.
 */
export async function recordChoice(
  animalType: string,
  choice: PlayerChoice
): Promise<{ response: string; convergence: string }> {
  const state = await loadChoiceState();
  state.offeredBy.push(animalType);
  state.choices[animalType] = choice;
  state.hasSeenChoice = true;

  await saveChoiceState(state);

  const content = ANIMAL_CHOICES[animalType];
  return {
    response: content.responses[choice],
    convergence: content.convergence,
  };
}

/**
 * Get the player's choice for a specific animal (for Phase 4 callbacks).
 * Returns null if no choice was made.
 */
export async function getPlayerChoice(animalType: string): Promise<PlayerChoice | null> {
  const state = await loadChoiceState();
  return state.choices[animalType] || null;
}

/**
 * Check if the player has seen any choice point yet.
 */
export async function hasSeenAnyChoice(): Promise<boolean> {
  const state = await loadChoiceState();
  return state.hasSeenChoice;
}

/**
 * Get how many animals have offered choices.
 */
export async function getChoiceCount(): Promise<number> {
  const state = await loadChoiceState();
  return state.offeredBy.length;
}

/**
 * Get Phase 4 callback text that references the player's Phase 3 choice.
 * Returns null if no choice was recorded for this animal.
 */
export function getPhase4ChoiceCallback(
  animalType: string,
  choice: PlayerChoice | null
): string | null {
  if (!choice) return null;

  const callbacks: Record<string, Record<PlayerChoice, string>> = {
    fox: {
      ask: 'You asked about the arrangement. The fire answered. You heard it, even then.',
      refuse: 'You tried not to know. The fire burned anyway. Knowledge doesn\'t need consent.',
    },
    owl: {
      ask: 'You asked to see the text. Now you are the text.',
      refuse: 'You refused to read. But the words read you.',
    },
    pangolin: {
      ask: 'You asked about the recipe. Now you\'re an ingredient.',
      refuse: 'You looked away from the kitchen. The meal was served regardless.',
    },
    axolotl: {
      ask: 'You looked into the water. The water looked back. It never stopped.',
      refuse: 'You closed your eyes to the deep. But the deep opened its eyes to you.',
    },
    capybara: {
      ask: 'You asked about the data. Now you understand the spreadsheet. Row by row.',
      refuse: 'You stayed out of it. The data included you anyway. Column A: the builder.',
    },
    fennec_fox: {
      ask: 'You listened. The frequency tuned itself to your heartbeat.',
      refuse: 'You covered your ears. The sound found another way in.',
    },
    sloth: {
      ask: 'You... asked. Time... answered. Slowly. But it... answered.',
      refuse: 'You told me... to sleep. Nobody... sleeps now. Not... anymore.',
    },
    wombat: {
      ask: 'You asked what was below. Now the below asks about you.',
      refuse: 'You didn\'t want to know the foundation. The foundation knew you.',
    },
    rabbit: {
      ask: 'You asked why I was scared. Now you know. Now we\'re both scared. But committed.',
      refuse: 'You didn\'t want to hear it. The fear found you anyway. It always does.',
    },
    red_panda: {
      ask: 'You asked about the arrangement. The question was itself an offering. Beautiful.',
      refuse: 'You refused to participate. The most devoted offering of all... unconscious devotion.',
    },
    tarsier: {
      ask: 'You asked what my eyes were holding open. Now the road they held is almost walked.',
      refuse: 'You chose to be spared the telling. The watching never needed your permission.',
    },
    aye_aye: {
      ask: 'You asked what the bell will say. It has been practicing your letters ever since.',
      refuse: 'You had me fold the finger away. It found you long before you asked it not to.',
    },
    kakapo: {
      ask: 'You asked about the arrangement. It is the mast year, friend, and you were the rain.',
      refuse: 'You waited like a seed. The season came for you anyway, gently, at the proper hour.',
    },
  };

  return callbacks[animalType]?.[choice] || null;
}

// ============================================================================
// Internal
// ============================================================================

async function saveChoiceState(state: ChoiceState): Promise<void> {
  choiceCache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Clear choice data (for Settings > Reset All).
 */
/**
 * One-time Phase 4 pre-dialogue page: the animal recontextualizes the
 * player's Phase 3 choice now that the cult is revealed. Marks itself
 * shown so it never repeats. Returns null when there's nothing to say.
 */
export async function getAndMarkPhase4CallbackPage(
  animalType: string
): Promise<string | null> {
  const state = await loadChoiceState();
  const choice = state.choices[animalType] ?? null;
  if (!choice) return null;
  const shown = state.phase4CallbackShown ?? [];
  if (shown.includes(animalType)) return null;
  const text = getPhase4ChoiceCallback(animalType, choice);
  if (!text) return null;
  state.phase4CallbackShown = [...shown, animalType];
  await saveChoiceState(state);
  return text;
}

/**
 * Phase 5 (post-revelation) choice callback — woven into each animal's
 * post-revelation dialogue cycle. Serene, settled; the choice no longer
 * matters and that is precisely the point.
 */
export function getPhase5ChoiceCallback(
  animalType: string,
  choice: PlayerChoice | null
): string | null {
  if (!choice) return null;

  const callbacks: Record<string, Record<PlayerChoice, string>> = {
    fox: {
      ask: 'You asked, once, when asking still felt dangerous. The fire remembers your courage fondly.',
      refuse: 'You didn\'t want to know, once. The fire holds no grudge. It knew you\'d warm to it.',
    },
    pangolin: {
      ask: 'You asked what was in the recipe. Now you\'ve tasted the finished dish. Was it everything I promised?',
      refuse: 'You never asked what you were eating. Wise. Some meals are better met with trust.',
    },
    owl: {
      ask: 'You asked about the text. Now you\'re written into it. The cleanest kind of answer.',
      refuse: 'You closed the book when I offered it. It didn\'t matter. You were already the final chapter.',
    },
    axolotl: {
      ask: 'You asked what swam below. It surfaced. You\'ve met. The water is calm now.',
      refuse: 'You wouldn\'t look into the deep water. It looked at you anyway, and found you lovely.',
    },
    capybara: {
      ask: 'You requested your file, and I gave it to you complete... even the last page, which was blank then. It isn\'t now.',
      refuse: 'You declined to read your file. Procedurally irrelevant. You wrote it either way.',
    },
    fennec_fox: {
      ask: 'You asked what I heard coming. Now we both hear it everywhere. Like a heartbeat. Like home.',
      refuse: 'You covered your ears, in your way. The sound arrived regardless. It was never optional.',
    },
    sloth: {
      ask: 'You asked how long I\'d known. Forever, friend. The same answer the pattern gives.',
      refuse: 'You didn\'t ask. You didn\'t need to. Some things arrive at their own speed. Like me.',
    },
    wombat: {
      ask: 'You asked where the tunnels led. Now you stand at the end of them. Solid ground, like I promised.',
      refuse: 'You never looked down the tunnel. That\'s all right. Every path here led to the same depth.',
    },
    rabbit: {
      ask: 'You asked me why I was afraid. Asking was kind. The fear is gone now. I almost miss it.',
      refuse: 'You let me keep my fear private. Thank you. It\'s quiet now. Everything is.',
    },
    red_panda: {
      ask: 'You asked what I had made peace with. Look up. You\'ve made peace with it too.',
      refuse: 'You never asked about my peace. You have your own now. They are the same peace.',
    },
    tarsier: {
      ask: "You asked what I saw out there. Now you have seen it too, with your own two moving eyes. It was worth the whole watch, was it not.",
      refuse: "You never asked what I saw. It made no difference, bright one. It saw you. It had seen you all along, and fondly.",
    },
    aye_aye: {
      ask: "You asked what the bell would say, once. Then you stood under the bronze and heard her say it. No answer of mine could have rung so true.",
      refuse: "You told me to put the finger away, once. I did. She rang anyway, and it found you anyway, and look how gently. Nothing ever pointed at you that did not love you.",
    },
    kakapo: {
      ask: "You asked what the arrangement was, there among the beds. It was a mast year. It fruited. You are standing in the orchard, and the orchard is glad of you.",
      refuse: "You did not want to know, and the season came for you gently all the same, just as I promised. Seeds never need the almanac. Look how well you have come up.",
    },
  };

  return callbacks[animalType]?.[choice] ?? null;
}

export async function clearChoiceState(): Promise<void> {
  choiceCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
