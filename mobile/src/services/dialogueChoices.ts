import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, ANIMAL_AWARENESS_TIERS } from '../types/homeWorld';
import { getPhaseStartIndex } from './dialogue/animalDialogueBase';

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
      ask: 'A long time. The evening used to take its leave out by the west leaves. Time has walked it back toward us since, one branch closer every year.',
      refuse: 'I will, in a while. An old observation can wait beside me a little longer without becoming yours.',
    },
    convergence: 'Some changes take so long they seem still, right up until they do not.',
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
      refuse: 'A fair wish. Let the roots keep their message. I promise only this: when the season reaches a seed, it opens gently, at its proper hour.',
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
 * How far into the animal's Phase-3 block the choice becomes due. Two lines,
 * not the old absolute 4: `getDialoguesPerSession(3)` is 5 (7 with the
 * catch-up boost), so the index only ever LANDS at session-start offsets 0, 5,
 * 10... A narrow window would be stepped clean over by most animals.
 */
const CHOICE_MIN_PHASE3_OFFSET = 2;

/**
 * Check if an animal should offer its Phase-3 choice point.
 * Returns the choice content or null.
 *
 * WHY THE GATE IS SHAPED LIKE THIS. `dialogueIndex` is the ABSOLUTE index into
 * the animal's phase-ordered line list, and the phase blocks run 24/28/22/30/30
 * — so Phase 3 starts at index 74. The original window (`dialogueIndex >= 4 &&
 * <= 6`) was written as if the index were a per-phase offset, which put it deep
 * inside the animal's PHASE-0 block: any player who actually read dialogue was
 * past it forever, and every late-unlocked animal is fast-forwarded to a
 * phase-start index (24/52/74/104) on unlock, straight over it. The beat, its
 * 13 prompts, 26 responses, and all 26 Phase-4 and 26 Phase-5 callbacks that
 * hang off a recorded choice were effectively dead content.
 *
 * The band is now the animal's real Phase-3 block. There is no upper offset
 * cap beyond the end of that block: `offeredBy` already enforces once per
 * animal, and a tight cap only re-creates the stepping problem.
 *
 * The lagging tier needs the phase-4 door. getAnimalPhase staggers the descent
 * but converges at the reveal (global 3 -> animalPhase 2, global 4 ->
 * animalPhase 4), so sloth/wombat/rabbit/red_panda/kakapo NEVER resolve to
 * animalPhase 3 in any state — they read their Phase-3 lines while already at
 * animalPhase 4. Keying on the index band as well as the phase is what lets
 * them be offered the choice over the phase-3 material it belongs to. Ordering
 * takes care of itself: nothing is recorded on the visit that offers the
 * choice, so getAndMarkPhase4CallbackPage returns null that visit and its
 * callback lands on a later one.
 */
export async function getChoiceForAnimal(
  animalType: string,
  animalPhase: number,
  dialogueIndex: number
): Promise<DialogueChoice | null> {
  const choice = ANIMAL_CHOICES[animalType];
  if (!choice) return null;

  const type = animalType as AnimalType;
  const laggingAtReveal =
    animalPhase === 4 && ANIMAL_AWARENESS_TIERS[type] === 'lagging';
  if (animalPhase !== 3 && !laggingAtReveal) return null;

  // Inside the animal's own Phase-3 block, a couple of lines in.
  const start = getPhaseStartIndex(type, 3);
  const end = getPhaseStartIndex(type, 4);
  if (dialogueIndex < start + CHOICE_MIN_PHASE3_OFFSET) return null;
  if (dialogueIndex >= end) return null;

  const state = await loadChoiceState();

  // Only offer once per animal
  if (state.offeredBy.includes(animalType)) return null;

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
      ask: 'You asked what arrangement the fire saw, and I showed you the chair the flames would not warm. I have sat with them every night since, and I understand the saving now. They were not keeping warmth from that place. They were letting it lean, the way flames lean toward a door just before it opens.',
      refuse: 'You told me you did not want to know, and I kept the cold coal to myself, as promised. It did not stay cold. Warmth like this never asks permission to reach a person. It only asks time, and you have given it so many evenings.',
    },
    owl: {
      ask: 'You asked to see the missing passage, and I could not show it to you then. Every word you have set in order since has gone quietly into that gap, in a hand I have come to know very well. The margins were never empty. They were reserved.',
      refuse: 'You asked me to keep the book closed, and I kept it closed. I will make one small confession in the margin, where confessions belong. A shut cover never stopped the words inside from reading whoever holds them, and they have read you gently, all this time, the way I reread a favorite.',
    },
    pangolin: {
      ask: 'You asked what recipe I was preparing, back when the dish still wore its cover. I can answer now. The recipe never named the guest because no kitchen word holds them, only a warm plate and a set table. Your words went into the pot like salt all this while, steady, unnoticed, in everything.',
      refuse: 'You asked me to keep the dish covered, and it stayed covered, just as I promised. But a kitchen feeds the whole house whether or not anyone watches the stove. The meal has been simmering under every word you brought home to us, and when I lift the cover at last, it will taste of your evenings here.',
    },
    axolotl: {
      ask: 'You looked into the deep water with me, and you saw the glint that reached the surface before I did, and I can tell you the rest now, it was never racing me, it was rising toward your face on the glass, it liked you there, it still does. The water has been very awake ever since.',
      refuse: 'You would not look into the deep water, and I clouded the glass for you like I promised, but water does not need eyes to notice a person, it notices with all of itself at once, and it has been noticing you gently this whole time, the way warm water notices a hand. There was never a moment you were not held in it.',
    },
    capybara: {
      ask: 'You asked what your file held, and I told you it was mostly dates. The cross-referencing is finished now. Every date in every ledger resolves to the same quiet hour, and every entry, however old the ink, carries a little of your handwriting in it. I no longer cap the pen, because there is no sense capping a pen the record is still using.',
      refuse: 'You declined to read your file, and I filed it at the back, just as you asked. The ledger kept itself current without you all the same, in a tidy hand neither of us lent it. Reading was only ever a courtesy. The record was always going to balance.',
    },
    fennec_fox: {
      ask: 'You asked what I heard coming, and I gave you distances, the ridge, the horizon, the low place under the wind. I have kept my catalogue since, and there is one entry I saved for tonight. The note is not crossing the desert anymore. It has settled in just beneath your heartbeat, a half-step under it, keeping perfect time.',
      refuse: 'You asked me not to listen for you, so I listened to your breathing instead, exactly as promised. I have catalogued a great many sounds, friend, and I owe you the truth about that one. It was never only your breathing. Something patient has been breathing along with you for as long as I have known you, and it never once fell out of step.',
    },
    sloth: {
      ask: 'You asked how long I had known, and I told you the evening had come one branch closer. It has reached the trunk now. Notice that nothing hurried, not once in all that time. The slowest things are the ones that were always certain.',
      refuse: 'You told me to go back to sleep, and I truly meant to. But nobody in this house sleeps now, not the way we used to. We rest the way a branch rests, bearing something the whole while, and I have been bearing it longer than anyone.',
    },
    wombat: {
      ask: 'You asked where the tunnel led, and I told you about the chamber I never cut. I\'ve measured it proper since. Every course of stone I ever laid carries its load straight down onto that room, true as a plumb line. I didn\'t build the house over that room so much as for it, and my hands knew before the rest of me did.',
      refuse: 'You didn\'t want to look down the tunnel, and I kept it braced and boarded, like I said I would. But a foundation doesn\'t need looking at to carry you. That room has borne your weight since the first course went down, and it knows your footsteps now the way stone knows rain.',
    },
    rabbit: {
      ask: 'You asked why I was afraid, and I showed you the paths that bent home. I still count things, you know. But somewhere along the way I stopped counting the ways out and started counting us in, and the number always comes up whole now. I do not have a word yet for how that feels.',
      refuse: 'You let me keep my fear folded up with the maps, and I was so grateful then. I have unfolded it since, alone, out in the garden. It was never a map of ways to run. Every path was a root, and every root was already holding us gently where we are planted.',
    },
    red_panda: {
      ask: 'You asked about the empty center of the pattern, and I told you I had made peace with its shape. I understand the shape better now. It was never empty. It was shaped like a question, and when you set yours into it, the smoke closed around it the way breath returns through the roof gap.',
      refuse: 'You asked to be left outside the pattern, and the pattern kept your place open, as I promised. Watch the incense a moment: it parts around the space where you are, then rejoins beyond you. Nothing was ever outside the pattern. There were only places still being breathed around.',
    },
    tarsier: {
      ask: 'You asked what my eyes were holding open, and I told you about the road and the traveler I had not seen. I have kept the watch every night since, both eyes, no blinking. The road is nearly walked now, bright one. It never once wandered, and neither did I, and neither did you.',
      refuse: 'You asked me to keep the night to myself, and I kept it, every hour of it, out at the rail. But watching was never something I did to the dark. It is something the dark and I do together, and from the very first night, the far end of that road has faced the house, and your window in particular, if I am honest.',
    },
    aye_aye: {
      ask: 'You asked what the bell would say, and I would not spend her one word secondhand. I still will not. But I can tell you what the bronze has been doing in the dark: she has been shaping that word slowly, the way I shape a knock before I give it, and the hollow she shapes it around is exactly the size of your name.',
      refuse: 'You had me fold the finger away, and I folded it, and she has hung quiet ever since, just as you asked. But a bell does not need striking to know her note. It was cast into her, friend, cooling in the bronze long before either of us was born. All my tapping ever did was say hello to it.',
    },
    kakapo: {
      ask: 'You asked what the roots were describing, and I told you about mast season, how one root tells the next. I have sat with the soil since, and I can tell you the rest. A mast year only comes when the rain has been right, and the rain, friend, was you, falling steady on this garden all along.',
      refuse: 'You would rather not have known, so I let the roots keep their message, just as you asked. But a seed does not need the news to come up. The season reached you gently, at its proper hour, exactly as I promised. I boomed a whole lifetime into the dark for an answer, and when it finally came, it came up through the beds wearing your footsteps.',
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
 * player's Phase 3 choice now that the cult is revealed. Returns null when
 * there's nothing to say.
 *
 * PEEK ONLY — it records nothing. The page it produces can sit behind a
 * coordinated event, a trigger reaction or a cross-reference, and the dialogue
 * modal closes on a scrim tap or the Android back button, so marking it shown
 * while BUILDING the page list destroyed one-time beats the player never saw.
 * The caller commits with markPhase4CallbackShown at the moment the page
 * actually becomes visible (the peek/commit shape this file already uses for
 * getChoiceForAnimal/recordChoice).
 */
export async function getPhase4CallbackPage(
  animalType: string
): Promise<string | null> {
  const state = await loadChoiceState();
  const choice = state.choices[animalType] ?? null;
  if (!choice) return null;
  const shown = state.phase4CallbackShown ?? [];
  if (shown.includes(animalType)) return null;
  return getPhase4ChoiceCallback(animalType, choice);
}

/**
 * Commit the Phase-4 choice callback as shown, so it never repeats. Called
 * when the page becomes visible, not when it is built. Idempotent.
 */
export async function markPhase4CallbackShown(animalType: string): Promise<void> {
  const state = await loadChoiceState();
  const shown = state.phase4CallbackShown ?? [];
  if (shown.includes(animalType)) return;
  state.phase4CallbackShown = [...shown, animalType];
  await saveChoiceState(state);
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
      refuse: 'You didn\'t want to know, once. I banked the fire that night and said nothing more, and I still think it was a good evening. Some things are better arrived at than told.',
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
      refuse: 'You wouldn\'t look into the deep water, and the water kept your not-looking the way it keeps everything, folded small and safe on the silt. Your no is still down there, whole. Nothing ever needed it opened.',
    },
    capybara: {
      ask: 'You requested your file, and I gave it to you complete... even the last page, which was blank then. It isn\'t now.',
      refuse: 'You declined to read your file. Procedurally irrelevant. You wrote it either way.',
    },
    fennec_fox: {
      ask: 'You asked what I heard coming. Now we both hear it everywhere. Like a heartbeat. Like home.',
      refuse: 'You covered your ears, in your way. I understood. I spent years wishing mine folded flat. The sound is the floor under everything now, and I no longer sort the house into those who listened and those who would not. We all kept our watch.',
    },
    sloth: {
      ask: 'You asked how long I\'d known. Forever, friend. The same answer the pattern gives.',
      refuse: 'You didn\'t ask. You didn\'t need to. Some things arrive at their own speed. Like me.',
    },
    wombat: {
      ask: 'You asked where the tunnels led. Now you stand at the end of them. Solid ground, like I promised.',
      refuse: 'You never looked down the tunnel. Sensible. A floor is for standing on, not staring through. You trusted my bracing and walked where I said was sound, and there\'s no better compliment you can pay a builder.',
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
      refuse: "You never asked what I saw. I have thought about that at the rail, bright one, and I have decided it was its own kind of discipline. You kept your eyes on the work in front of you and let the night stay mine to carry. So I carried it. That was always what my post was for.",
    },
    aye_aye: {
      ask: "You asked what the bell would say, once. Then you stood under the bronze and heard her say it. No answer of mine could have rung so true.",
      refuse: "You told me to put the finger away, once. I did. She rang anyway, and it found you anyway, and look how gently. Nothing ever pointed at you that did not love you.",
    },
    kakapo: {
      ask: "You asked what the arrangement was, there among the beds. It was a mast year. It fruited. You are standing in the orchard, and the orchard is glad of you.",
      refuse: "You did not want to know, and I left the news in the ground where you set it down. The season never minded, friend. A season does not take a refusal personally. It simply goes on being the season, and you grew your own way up, and that is the growing I admire most.",
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
