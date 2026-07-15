import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';

/**
 * Player choice point system for Phase 3 dialogue.
 *
 * Each animal offers one ask/refuse choice through their own established
 * metaphor. The immediate responses remain emotionally distinct, then meet
 * at a shared convergence without explaining what Phase 4 will reveal.
 *
 * Each animal offers the choice once. The stored ask/refuse branch is recalled
 * by authored Phase 4 and Phase 5 callbacks, so the prompt, option, and response
 * must preserve the semantic anchors those later lines remember.
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
    ask: string;    // Curiosity within the animal's metaphor
    refuse: string; // A boundary or refusal within the same metaphor
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
    prompt: 'Ember cups her paws around a coal in the fire that gives no warmth.',
    options: {
      ask: 'What arrangement does the fire see?',
      refuse: 'I don\'t want to know.',
    },
    responses: {
      ask: 'The fire only shows me a place. Its flames warm every chair but one, as if they are saving something for whoever sits there.',
      refuse: 'All right. Sit where the light is kind, and I will not stir the ash. I can keep one cold coal to myself.',
    },
    convergence: 'Even banked low, the hearth keeps a little warmth apart.',
  },
  owl: {
    prompt: 'Archimedes lays one feather across an omitted line and closes the book.',
    options: {
      ask: 'Show me the missing text.',
      refuse: 'Keep the book closed.',
    },
    responses: {
      ask: 'A passage was removed with great care. The lines on either side address an appointed reader, but the title between them is gone.',
      refuse: 'Gladly. Some omissions become louder when spoken, and this one has occupied enough of the room already.',
    },
    convergence: 'The bookmark advances each morning, though Archimedes leaves the cover shut.',
  },
  pangolin: {
    prompt: 'Panko sets a silver cover over a dish and rests both paws on it.',
    options: {
      ask: 'What recipe are you preparing for that dish?',
      refuse: 'I don\'t want to know what is cooking.',
    },
    responses: {
      ask: 'The recipe gives no name for the guest. Still, the plate is warm every evening, and the covered dish grows lighter before I lift it.',
      refuse: 'Then the dish stays covered. There are kinder things to share than an appetite you cannot put a name to.',
    },
    convergence: 'After the oven cools, one covered dish continues to steam.',
  },
  axolotl: {
    prompt: 'Axel surfaces through still water beneath a reflection that takes a moment to follow.',
    options: {
      ask: 'What is moving below the water?',
      refuse: 'I won\'t look into the deep water.',
    },
    responses: {
      ask: 'Not mine. It began beyond the deep glass, no larger than a glint. Lately it reaches the surface before I do.',
      refuse: 'I can cloud the glass and keep the lamps low. You do not have to look below with me.',
    },
    convergence: 'The next ripple returns carrying one reflection more than it took.',
  },
  capybara: {
    prompt: 'Chill closes a folder whose tab has a date but no name.',
    options: {
      ask: 'What does the data in my file show?',
      refuse: 'I don\'t want to read the file.',
    },
    responses: {
      ask: 'The data in your file is mostly dates. They all reserve the same quiet hour for an arrival with no name.',
      refuse: 'Done. I will file it at the back and spare you the minutes. Some appointments are easier to bear without watching the clock.',
    },
    convergence: 'One chair remains open in the meeting room, and no one has canceled.',
  },
  fennec_fox: {
    prompt: 'Fennick turns one ear east and the other toward you.',
    options: {
      ask: 'What do you hear coming?',
      refuse: 'I don\'t want to listen.',
    },
    responses: {
      ask: 'Last week the note was beyond the salt ridge. Tonight it crossed the horizon and settled beneath the wind.',
      refuse: 'For you, I can. I will listen to your breathing instead and keep what travels under the sand to myself.',
    },
    convergence: 'By dawn, the dunes are humming the same low note.',
  },
  sloth: {
    prompt: 'Sloane opens both eyes and studies the oldest branch.',
    options: {
      ask: 'How long have you known?',
      refuse: 'Go back to sleep.',
    },
    responses: {
      ask: 'A long time... The evening used to leave... by the west leaves. Time has brought it... one branch closer.',
      refuse: 'I will... in a while. An old observation... can wait beside me... without becoming yours.',
    },
    convergence: 'Some changes... take so long... they seem still... until they do not.',
  },
  wombat: {
    prompt: 'Warren emerges with pale stone dust on his paws and a broken survey peg.',
    options: {
      ask: 'Where does the tunnel below the foundation lead?',
      refuse: 'I don\'t want to look down that tunnel.',
    },
    responses: {
      ask: 'A chamber I did not cut. Its walls are smooth, and every footing above it settles around the empty space as neatly as if I had measured both together.',
      refuse: 'Already braced and boarded. You need not come below. I only wish the stone would stop answering my hammer from the other side.',
    },
    convergence: 'The house bears down on a room it has never seen.',
  },
  rabbit: {
    prompt: 'Thyme unfolds a map crossed with paths that all curve near the garden.',
    options: {
      ask: 'Why are you afraid of those paths?',
      refuse: 'Keep your fear private.',
    },
    responses: {
      ask: 'I am afraid of where they bend. I marked three roads beyond the hedge, and by morning each line curved back toward the rosemary beds.',
      refuse: 'Thank you. Let us make tea and leave the fear folded with the roads. I would rather hold a warm cup than another direction.',
    },
    convergence: 'At dusk, the garden gate stands open and every path points softly inward.',
  },
  red_panda: {
    prompt: 'Bamboo opens their eyes beside an incense pattern shaped around an empty center.',
    options: {
      ask: 'Is this the arrangement you made peace with?',
      refuse: 'Leave me outside the pattern.',
    },
    responses: {
      ask: 'The pattern, yes, but only its empty center. I have made peace with its shape, not with what belongs there.',
      refuse: 'Then the pattern can leave your place open. Peace does not require an explanation.',
    },
    convergence: 'Bamboo traces the open curve in smoke, then lets it dissolve.',
  },
  tarsier: {
    prompt: 'Vesper turns from the rail, leaving one eye on a faint road through the dark.',
    options: {
      ask: 'What are your eyes holding open out there?',
      refuse: 'Keep the night to yourself.',
    },
    responses: {
      ask: 'A traveler, perhaps, though I have seen no feet. The road grows clearer each night, and the far end no longer looks quite so far.',
      refuse: 'Then keep your eyes on the lantern, bright one. I will keep mine beyond the ridge and bring none of that distance indoors.',
    },
    convergence: 'Vesper leaves a place beside her at the rail, facing the watched road.',
  },
  aye_aye: {
    prompt: 'Tock rests his long finger against the bronze and listens to the bell breathe.',
    options: {
      ask: 'What will the bell say?',
      refuse: 'Put the finger away. Leave her silent.',
    },
    responses: {
      ask: 'One word, friend, but it belongs to her. I know the hollow around it, not the sound itself, and I will not spend her first clear note secondhand.',
      refuse: 'Of course. Some words should not be coaxed from bronze. I can leave her quiet and keep my guesses in my own pocket.',
    },
    convergence: 'Inside the bell, an unsaid syllable gathers and fades.',
  },
  kakapo: {
    prompt: 'Moss kneels where a ridge is passing through the soil from root to root.',
    options: {
      ask: 'What arrangement are the roots describing?',
      refuse: 'I would rather not know.',
    },
    responses: {
      ask: 'Mast season, friend. One root tells the next, and soon trees far apart flower in the same week. The message is older than any one garden.',
      refuse: 'A fair wish. We can tend what is green and let the seed keep the season\'s secret.',
    },
    convergence: 'Beneath the beds, the message passes on without being spoken aloud.',
  },
};

// ============================================================================
// In-memory cache
// ============================================================================

let choiceCache: ChoiceState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateChoiceCache(): void {
  choiceCache = null;
}


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
