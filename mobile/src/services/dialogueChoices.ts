import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType } from '../types/homeWorld';
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
  "fox": {
    "prompt": "Ember has warmed two cups. She keeps turning yours by its handle.",
    "options": {
      "ask": "What did you know when I arrived?",
      "refuse": "I need some time before we talk."
    },
    "responses": {
      "ask": "I knew your words helped keep the house warm. I hoped you would stay. I let you think those were the whole truth, because I was afraid you would leave.",
      "refuse": "All right. I will leave your cup here. You do not have to drink it, or make me feel better about it."
    },
    "convergence": "Ember sets the cup down without moving it closer."
  },
  "owl": {
    "prompt": "Archimedes puts a plain notebook beside the oldest book. Their accounts disagree.",
    "options": {
      "ask": "Read me the line that changed.",
      "refuse": "Leave my words out of the comparison."
    },
    "responses": {
      "ask": "The old page says the guest will preserve us. Yesterday my notebook said protect. I have kept both versions. A correction that erases its earlier wording is not evidence I trust.",
      "refuse": "Your words stay out of my notes. I can compare the ink without turning you into a specimen."
    },
    "convergence": "Archimedes dates a fresh page and leaves the earlier one intact."
  },
  "pangolin": {
    "prompt": "Panko holds a bruised pear over the pot. In her paw, the bruise disappears.",
    "options": {
      "ask": "Put the pear aside. See what happens.",
      "refuse": "I do not want to help test it."
    },
    "responses": {
      "ask": "A saucer, then. We can watch. It looks fresh again, but it still smells ripe. I do not know whether the warmth has healed it or stopped something it needed to do.",
      "refuse": "Then no experiment together. I will label the saucer and keep it off the supper table."
    },
    "convergence": "Panko takes the pot off the heat before she reaches for the label."
  },
  "axolotl": {
    "prompt": "Axel draws a finger through the water. A bubble stays where his finger left it.",
    "options": {
      "ask": "Try a different shape.",
      "refuse": "Let it settle. I need a quiet visit."
    },
    "responses": {
      "ask": "A crooked one, then. Oh. It has made the same circle again. I liked the circle the first time. I wanted to know whether I could like something else.",
      "refuse": "Of course, come sit by the glass. I will not keep making things happen just because I can."
    },
    "convergence": "Axel folds his hands. One bubble hangs motionless between them."
  },
  "capybara": {
    "prompt": "Chill has written an objection in the margin. The ink is fading.",
    "options": {
      "ask": "Copy it before it disappears.",
      "refuse": "Keep it private."
    },
    "responses": {
      "ask": "Done. Two copies, separate shelves. The objection is that nobody authorized the word permanent. I would prefer not to be the only one who remembers writing it.",
      "refuse": "I will. The folder stays closed when you visit. Privacy is a reason; it does not require a second reason underneath."
    },
    "convergence": "Chill puts a clean sheet between the wet copies."
  },
  "fennec_fox": {
    "prompt": "Fennick lifts one ear from the low note. For a moment, the ordinary sounds vanish.",
    "options": {
      "ask": "Listen for a small sound instead.",
      "refuse": "Stop listening for now."
    },
    "responses": {
      "ask": "Your sleeve against the chair. There it is. I had to choose it twice before I could hear it. The large note is making everything else sound unnecessary.",
      "refuse": "Yes. Sit with me while I stop. I am not very practiced at putting the watch down."
    },
    "convergence": "Fennick lowers both ears. He keeps his paws on the sand."
  },
  "sloth": {
    "prompt": "Sloane opens both eyes when you ask whether the arrival will be kind.",
    "options": {
      "ask": "Tell me what you actually know.",
      "refuse": "Do not make a promise about it."
    },
    "responses": {
      "ask": "I know the waiting. I know the signs. I do not know the guest. I have wanted the answer for so long that I sometimes describe wanting as knowledge. You may correct me.",
      "refuse": "Then I will make a smaller promise. I will sit with you while we do not know."
    },
    "convergence": "Sloane shifts along the branch and leaves room."
  },
  "wombat": {
    "prompt": "Warren has found an arch beneath the old foundation. His new braces fit it too neatly.",
    "options": {
      "ask": "Show me where your work ends.",
      "refuse": "Keep me above ground."
    },
    "responses": {
      "ask": "Here. Rough cut, my hand. Smooth stone, older than the den. I thought I was shoring up a ruin. Whatever measured that arch knew what a house might put on it.",
      "refuse": "Fair. I'll brace the stairs and bring my drawings up. No sense calling a place safe because you haven't looked down."
    },
    "convergence": "Warren marks the join between old stone and new timber."
  },
  "rabbit": {
    "prompt": "Thyme unfolds a map. She covers one marked path with her paw.",
    "options": {
      "ask": "Help me check the way out.",
      "refuse": "Keep the map between us."
    },
    "responses": {
      "ask": "Thank you. We can walk to the rosemary gate and back. I want to know where the path goes today, not where somebody says it has always gone.",
      "refuse": "Between us, then. Please do not turn it into a report about how frightened I am. It is a map. I worked hard on it."
    },
    "convergence": "Thyme leaves the map unfolded on her own side of the table."
  },
  "red_panda": {
    "prompt": "Bamboo traces a circle in incense. The smoke closes the gap they leave.",
    "options": {
      "ask": "Are you sure that is peace?",
      "refuse": "Leave my place outside the circle."
    },
    "responses": {
      "ask": "No. I have called it peace because I know how to sit inside it. That may tell us more about my practice than about the pattern.",
      "refuse": "I can leave a gap in my drawing. I cannot promise the pattern will respect it. I should not have spoken as though I could."
    },
    "convergence": "Bamboo opens the circle again and watches the smoke."
  },
  "tarsier": {
    "prompt": "Vesper turns one eye from the ridge. The dark pulls at her attention.",
    "options": {
      "ask": "Look at something here with me.",
      "refuse": "Keep the distant watch to yourself."
    },
    "responses": {
      "ask": "The chipped rail, then. The pale mark beside your hand. I can still look at it. I had begun to wonder whether every glance belonged out there.",
      "refuse": "Very well. I will give you the weather and leave the distance in my ledger. I may ask someone else to share my watch; I will not make your answer smaller."
    },
    "convergence": "Vesper rests one paw on the chipped rail."
  },
  "aye_aye": {
    "prompt": "Tock rests his paw on the rope. The bell hums before he touches it.",
    "options": {
      "ask": "Wait until someone answers you.",
      "refuse": "Leave the bell quiet for now."
    },
    "responses": {
      "ask": "Yes. A bell can be heard without being wanted. I will ask before the first pull. That is a rule worth saving sixty years of bronze for.",
      "refuse": "Quiet, then. I have kept her silence a long while. I can keep it without treating the next sound as a debt somebody owes me."
    },
    "convergence": "Tock lays the rope across the rail instead of winding it around his wrist."
  },
  "kakapo": {
    "prompt": "Moss holds a seedpod that has stayed green long past its season.",
    "options": {
      "ask": "Leave one seed unplanted.",
      "refuse": "I would rather not join the experiment."
    },
    "responses": {
      "ask": "One seed, in the dry tin. The rest can go into the bed. A garden needs some difference between what was kept and what was allowed to grow.",
      "refuse": "Fair enough. I can keep a gardening notebook without putting your name on it."
    },
    "convergence": "Moss labels the tin with the date, leaving space underneath."
  }
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

/** Let two regular lines establish a character's question before offering it. */
const CHOICE_MIN_PHASE3_OFFSET = 2;

/**
 * The choice follows the material the player has reached. It remains available
 * through the reveal for a slow reader or a late recruit whose catch-up intro
 * skipped the Phase-3 block. The recorded branch, rather than a narrow index
 * window, makes the conversation once-only. Arrival ends this opportunity;
 * later callbacks must never manufacture a choice the player did not make.
 */
export async function getChoiceForAnimal(
  animalType: string,
  animalPhase: number,
  dialogueIndex: number
): Promise<DialogueChoice | null> {
  const choice = ANIMAL_CHOICES[animalType];
  if (!choice || (animalPhase !== 3 && animalPhase !== 4)) return null;

  const type = animalType as AnimalType;
  const start = getPhaseStartIndex(type, 3);
  const revealStart = getPhaseStartIndex(type, 4);
  if (dialogueIndex < start + CHOICE_MIN_PHASE3_OFFSET) return null;
  // At phase 3 the reader must still be in that phase's block. At phase 4,
  // recruits such as Vesper begin at revealStart and need the choice here.
  if (animalPhase === 3 && dialogueIndex >= revealStart) return null;

  const state = await loadChoiceState();
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
  "fox": {
    "ask": "You asked what I knew. I have written it down, without the comforting parts I used to put around it. I knew the words fed something. I did not know keeping us safe could mean keeping us unchanged. I should have told you the first part.",
    "refuse": "You asked for time. I have not mistaken the visits since for forgiveness. If you want to talk, I will answer. Until then, I can put the kettle on without making it an argument."
  },
  "owl": {
    "ask": "You asked for the changed line. There are three versions now. I have stopped calling the oldest one the truest; age is not a method of verification.",
    "refuse": "You asked me to leave your words out. I have. The missing column bothers my sense of order, which is an excellent reason to keep it missing."
  },
  "pangolin": {
    "ask": "You asked me to put the pear aside. It has not spoiled. It has not ripened either. I keep checking the saucer, and I have had to stop myself calling that a happy result.",
    "refuse": "You did not want to test the pear. I kept it out of supper. Curiosity is no reason to put an unanswered question in someone's bowl."
  },
  "axolotl": {
    "ask": "You asked me to try a new shape. I keep the crooked drawing outside the tank now. The water makes circles. The paper remembers I asked it for something else.",
    "refuse": "You wanted a quiet visit. I gave you one. I am learning the difference between choosing still water and being unable to stir it."
  },
  "capybara": {
    "ask": "You asked me to copy the objection. One copy faded. The other remains. I check the blank one too; absence is a finding when you know what occupied it.",
    "refuse": "You asked to leave the objection private. I have kept the folder closed. I can tell you this much without opening it: I have not withdrawn it."
  },
  "fennec_fox": {
    "ask": "We listened for your sleeve. I have been keeping a list of small sounds since. A beetle, a spoon, an impatient foot. The great note does not get to decide which ones matter.",
    "refuse": "You asked me to stop listening. I did. For the first minute I was angry with you, which frightened me; by the second I realized I was tired. I needed the rest."
  },
  "sloth": {
    "ask": "You asked what I knew. I have been sorting it from what I wanted. It is a slower job than I expected, even for me. I do not have an arrival date to give you.",
    "refuse": "You asked me not to promise kindness. I have kept to the smaller promise. I am here. That is something I can report without consulting the future."
  },
  "wombat": {
    "ask": "You asked where my work ended. I've chalked that line through every drawing. I can answer for my braces. What they hold is a different question, and I've stopped confusing the two.",
    "refuse": "You wanted to stay above ground. The stairs are sound and the drawings are here. I won't turn a refusal to go underground into trust in what's down there."
  },
  "rabbit": {
    "ask": "You offered to check the way out. The stones beyond the gate are where I marked them. I go that far each morning. Knowing I can return makes staying feel like a different action.",
    "refuse": "You kept my map private. Nobody arrived to talk me out of it. I did not realize how badly I needed that until the whole evening passed quietly."
  },
  "red_panda": {
    "ask": "You asked whether this was peace. The question has interrupted several very comfortable sittings. I am keeping it. Comfort is not an answer.",
    "refuse": "You asked for a place outside. I cannot give you permission the pattern never asked me to administer. I can stand beside the gap and insist it remain a gap."
  },
  "tarsier": {
    "ask": "You asked me to look nearby. I can still find the chip in the rail without the dark taking my eyes away. I check it every watch. Looking should include the right to look elsewhere.",
    "refuse": "You left the far watch to me. I have kept it out of our visits. A watcher may ask for company. She may also receive an answer she did not hope for."
  },
  "aye_aye": {
    "ask": "You asked me to wait for an answer. I am waiting. The bronze has a note ready; that is her business. Whether my hand lends it the house is still mine.",
    "refuse": "You asked for quiet. The rope stays on the rail. She hums sometimes without me. I no longer tell myself that means my answer has already been given."
  },
  "kakapo": {
    "ask": "You asked me to keep one seed. It is dry and small in its tin. The green ones in the bed have not opened. Keeping and growing looked alike for a while. They do not now.",
    "refuse": "You left the experiment to me. I have kept the notes in my own name. A friend walking through a garden has not agreed to everything being grown in it."
  }
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
 * post-revelation dialogue cycle. The outcome remains shared, but the animal remembers the boundary or
 * investigation the player actually chose.
 */
export function getPhase5ChoiceCallback(
  animalType: string,
  choice: PlayerChoice | null
): string | null {
  if (!choice) return null;

  const callbacks: Record<string, Record<PlayerChoice, string>> = {
  "fox": {
    "ask": "You asked for the truth, and I owe you the parts I am still finding out. The fire tried to keep yesterday's warmth today. I let it go cold for an hour. I needed to know I could.",
    "refuse": "You needed time. That still stands. I have learned to leave a cup empty without calling it a place you must come back to."
  },
  "owl": {
    "ask": "You asked me to compare the accounts. I kept the crossings-out. A record that remembers its mistakes has something the great book lacked.",
    "refuse": "You asked to stay outside my comparison. Your empty column is still empty. I have stopped trying to make that look like an omission."
  },
  "pangolin": {
    "ask": "The pear on our saucer finally softened. I used the good half and composted the rest. It was an ordinary decision. I had missed those.",
    "refuse": "You left the pear experiment to me. I still label what I cannot account for, and I tell people before I serve it. That should not have needed learning."
  },
  "axolotl": {
    "ask": "You asked for a different shape. Yesterday I made a terrible square. It wobbled into nothing before I could show anyone. I was delighted.",
    "refuse": "You asked me to let the water settle. I still can. I can also splash it now. A quiet visit feels different when there is a choice."
  },
  "capybara": {
    "ask": "You asked for a copy. It still says nobody authorized permanent. I have filed the answer underneath: then we should ask. Very little ink, a substantial revision.",
    "refuse": "You left the objection with me. I kept it. There are matters I can carry myself without asking a friend to become a witness."
  },
  "fennec_fox": {
    "ask": "You helped me find a small sound inside the large one. I still practice. Today I heard two friends disagree over breakfast. Neither voice disappeared.",
    "refuse": "You told me to stop for a while. I still take that rest. The watch is mine to pick up, which means it must be mine to put down."
  },
  "sloth": {
    "ask": "You asked for what I knew. Here is a new item: a thing can arrive and still need to learn how to be here. I have started including myself in that.",
    "refuse": "You would not take a promise about the future. Good. We had tea this afternoon. I can promise I enjoyed it, and leave tomorrow its own work."
  },
  "wombat": {
    "ask": "You asked for the join. I still check it. The old arch bears the weight; my bracing leaves room for movement. Stone that cannot move at all cracks.",
    "refuse": "You stayed above ground. I kept the stairs clear. They're for coming up as much as going down, and I'll keep them that way."
  },
  "rabbit": {
    "ask": "You asked to check the path. I walked it yesterday, past the rosemary and a little further. Then I came back because I wanted my own bed.",
    "refuse": "You kept the map between us. I have added a path to it, in ordinary pencil. You may look when I offer. I like being able to say that."
  },
  "red_panda": {
    "ask": "You asked whether this was peace. I do not have a final word. This morning someone contradicted me and the room stayed warm. That is a better beginning.",
    "refuse": "You asked to remain outside my circle. I leave the gap now. When the smoke closes it, I open it again. Practice ought to be useful to somebody besides the practitioner."
  },
  "tarsier": {
    "ask": "You brought my eyes back to the rail. The chip is still there. I have stopped polishing that bit; I want one mark the house has not smoothed away.",
    "refuse": "You asked me to keep the distance to myself. I did. There are things I can tell you now, if you want them. I will wait for that part."
  },
  "aye_aye": {
    "ask": "You asked me to wait for an answer. I keep that rule for the little knocks too. A pause before the reply is space for another creature to decide.",
    "refuse": "You asked me to leave her quiet. I remember. I will not call a sound you did not ask for a kindness merely because it was beautiful."
  },
  "kakapo": {
    "ask": "You asked me to save a seed. It is still in the tin. I may plant it next season, or give it away. The important part is that it has a next season.",
    "refuse": "You did not join the experiment. You can still come for tea. I have plenty to tell you about the beans, and none of it requires a theory of the sky."
  }
};

  return callbacks[animalType]?.[choice] ?? null;
}

export async function clearChoiceState(): Promise<void> {
  choiceCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
