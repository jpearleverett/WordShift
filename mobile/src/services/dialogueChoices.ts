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
    "prompt": "Ember has warmed two cups. She keeps turning yours by the handle, back and forth.",
    "options": {
      "ask": "What did you know when I arrived?",
      "refuse": "I need some time before we talk."
    },
    "responses": {
      "ask": "I knew your words were keeping this house warm. I hoped you'd stay. I let you believe that was the whole truth, because I was afraid you'd leave.",
      "refuse": "All right. I'll leave your cup here. You don't have to drink it, and you don't have to make me feel better."
    },
    "convergence": "Ember sets the cup down, and does not slide it any closer."
  },
  "owl": {
    "prompt": "Archimedes sets his plain notebook beside the oldest book. The two accounts do not agree.",
    "options": {
      "ask": "Read me the line that changed.",
      "refuse": "Leave my words out of the comparison."
    },
    "responses": {
      "ask": "Here is the line. The old page says the guest will preserve us. Yesterday my notebook said protect. I have kept both versions. A correction that hides its earlier wording is not evidence I trust.",
      "refuse": "Your words stay out of my notes, then. I can compare the two inks without turning you into a specimen."
    },
    "convergence": "Archimedes dates a fresh page and leaves the earlier one untouched."
  },
  "pangolin": {
    "prompt": "Panko holds a bruised pear over the pot. The bruise fades away in her paw, and the pear looks new.",
    "options": {
      "ask": "Put the pear aside. Let us see what happens.",
      "refuse": "I would rather not test the pear."
    },
    "responses": {
      "ask": "A saucer, then, and we will watch it. The pear looks fresh again, but it still smells ripe. I don't know whether the warmth healed it or only stopped it ripening.",
      "refuse": "No experiment, then. I'll label the saucer the pear is sitting on, and keep it off the supper table."
    },
    "convergence": "Panko takes the pot off the heat before she reaches for the label."
  },
  "axolotl": {
    "prompt": "Axel draws a finger through the water. A bubble stays exactly where his finger left it.",
    "options": {
      "ask": "Try a different shape.",
      "refuse": "Let it settle. I need a quiet visit."
    },
    "responses": {
      "ask": "A crooked one, then. Oh. The water pulled it into the same circle again. I liked that circle the first time. I only wanted to know if I could like something else too.",
      "refuse": "Of course. Come sit by the glass and we'll be quiet together. I won't keep making things happen just because I can."
    },
    "convergence": "Axel folds his hands. One bubble hangs motionless between them."
  },
  "capybara": {
    "prompt": "Chill has written an objection in the margin of his ledger. The ink is fading.",
    "options": {
      "ask": "Copy it before it disappears.",
      "refuse": "Keep it private."
    },
    "responses": {
      "ask": "Done. Two copies, on separate shelves. My objection is simple: nobody authorized the word permanent. I'd rather not be the only one who remembers writing it.",
      "refuse": "I will. The folder stays closed while you visit. Wanting it private is reason enough. I don't owe you a second reason under the first one."
    },
    "convergence": "Chill slides a clean sheet between the damp copies so the ink cannot smudge."
  },
  "fennec_fox": {
    "prompt": "Fennick lifts one ear away from the low note. For a moment, all the ordinary sounds go missing.",
    "options": {
      "ask": "Listen for a small sound instead.",
      "refuse": "Stop listening for now."
    },
    "responses": {
      "ask": "There. Your sleeve against the chair. I had to reach for it twice before I could hear it. The large note is making everything else sound unimportant.",
      "refuse": "Yes. Sit with me while I stop. I have never been good at putting the watch down. Company helps."
    },
    "convergence": "Fennick lowers both ears. He keeps his paws on the sand."
  },
  "sloth": {
    "prompt": "Sloane opens both eyes when you ask her whether the arrival will be kind.",
    "options": {
      "ask": "Tell me what you actually know.",
      "refuse": "Don't promise me it will be kind."
    },
    "responses": {
      "ask": "I know the waiting. I know the signs. I do not know the guest. I've wanted an answer for so long that I sometimes call my wanting knowledge. Correct me when I do.",
      "refuse": "Then I'll make a smaller promise. I'll sit here with you while neither of us knows."
    },
    "convergence": "Sloane shifts along the branch and leaves room."
  },
  "wombat": {
    "prompt": "Warren has found an arch under the old foundation. His new braces fit it as if they were made for it.",
    "options": {
      "ask": "Show me where your work ends.",
      "refuse": "Keep me above ground."
    },
    "responses": {
      "ask": "Here. This rough cut is my work. The smooth stone under it is older than the den. I thought I was shoring up a ruin. Whoever measured that arch knew what a house would put on it.",
      "refuse": "Fair. I'll brace the stairs and bring my drawings up to you. No place is safe just because nobody has looked down."
    },
    "convergence": "Warren marks the join between the old stone and his new timber."
  },
  "rabbit": {
    "prompt": "Thyme unfolds a map on the table. She covers one marked path with her paw.",
    "options": {
      "ask": "Help me check the way out.",
      "refuse": "Keep the map between us."
    },
    "responses": {
      "ask": "Thank you. We can walk to the rosemary gate and back. I want to see where that path goes today, not where somebody says it has always gone.",
      "refuse": "Between us, then. Please don't turn my map into a report about how frightened I am. It is a map, and I worked hard on it."
    },
    "convergence": "Thyme leaves the map unfolded on her own side of the table."
  },
  "red_panda": {
    "prompt": "Bamboo draws a circle in the incense smoke and leaves one gap in it. The smoke drifts across and closes the gap.",
    "options": {
      "ask": "Are you sure that is peace?",
      "refuse": "Leave me a place outside the circle."
    },
    "responses": {
      "ask": "No. I call it peace because I know how to sit still inside it. That may say more about my practice than about the pattern.",
      "refuse": "I can leave a gap when I draw the circle. I cannot promise the pattern will respect it. I should not have spoken as though I could."
    },
    "convergence": "Bamboo opens the gap in the circle again and watches the smoke."
  },
  "tarsier": {
    "prompt": "Vesper turns her head away from the ridge, slowly. The dark keeps pulling her attention back.",
    "options": {
      "ask": "Look at something here with me.",
      "refuse": "Keep the distant watch to yourself."
    },
    "responses": {
      "ask": "The chipped rail, then. That pale mark beside your hand. I can still look at something this close. I'd begun to think every look I had belonged out there.",
      "refuse": "All right. You'll get the weather from me, and the distance stays in my ledger. I might ask someone else to sit the watch with me. I won't think less of your answer."
    },
    "convergence": "Vesper rests one paw on the chipped rail."
  },
  "aye_aye": {
    "prompt": "Tock rests his hand on the bell rope. The bell hums before the rope has moved.",
    "options": {
      "ask": "Knock first, and wait for an answer.",
      "refuse": "Leave the bell quiet for now."
    },
    "responses": {
      "ask": "Yes. A bell is heard by everyone, wanted or not. So I will ask before the first pull, and wait for an answer. She has been silent sixty years, and that rule is what the silence was for.",
      "refuse": "Quiet, then. I have kept her silent a long while already. Keeping her quiet is not a favor, and nobody owes me anything for it."
    },
    "convergence": "Tock lays the rope across the rail instead of winding it around his wrist."
  },
  "kakapo": {
    "prompt": "Moss holds up a seedpod. It should have dried and opened by now, but it has stayed green long past its season.",
    "options": {
      "ask": "Leave one seed unplanted.",
      "refuse": "I would rather not join the experiment."
    },
    "responses": {
      "ask": "One seed for the dry tin, then. The rest go in the bed. It is good for a garden to keep something back, instead of growing everything it has.",
      "refuse": "Fair enough. I can keep a gardening notebook without putting your name on it."
    },
    "convergence": "Moss writes the date on the tin, leaving space below it for the next one."
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
    "ask": "You asked what I knew. I have written it all down, leaving out the comforting parts I used to add. I knew the words fed something under this house. I did not know that keeping us safe would mean keeping us unchanged. I should have told you the first part.",
    "refuse": "You asked for time. You have visited since, and I have not taken that for forgiveness. When you want to talk, I will answer. Until then, I can put the kettle on without making it an argument."
  },
  "owl": {
    "ask": "You asked for the line that changed. There are three versions of it now. I no longer call the oldest one the truest. Being old does not make a page correct.",
    "refuse": "You asked me to leave your words out. I have. My comparison has an empty column where they would go. That gap offends my sense of order, which is an excellent reason to leave it empty."
  },
  "pangolin": {
    "ask": "You asked me to put the pear aside. It has not spoiled. It has not ripened either. I keep checking the saucer, and I have stopped letting myself call that good news.",
    "refuse": "You did not want to test the pear. So I kept it out of supper. I will not put something I cannot explain in a friend's bowl, just to satisfy my curiosity."
  },
  "axolotl": {
    "ask": "You asked me to try a different shape. I drew a crooked one on paper, and I keep the paper outside the tank. The water still makes circles. The paper still holds the shape I asked for.",
    "refuse": "You wanted a quiet visit. I gave you one. Now I am learning the difference between letting the water be still and not being able to stir it."
  },
  "capybara": {
    "ask": "You asked me to copy the objection. One copy has faded to nothing. The other is still legible. I check the blank sheet anyway. I know what used to be written there.",
    "refuse": "You asked me to keep the objection private. The folder has stayed closed. I can tell you this much without opening it. I have not withdrawn it."
  },
  "fennec_fox": {
    "ask": "We listened for your sleeve against the chair. I have kept a list of small sounds ever since. A beetle, a spoon, an impatient foot. The great note does not get to decide which of them matter.",
    "refuse": "You asked me to stop listening. I did. For the first minute I was angry with you, and that frightened me. By the second minute I understood that I was only tired. I needed the rest."
  },
  "sloth": {
    "ask": "You asked what I knew. I have been separating what I know from what I want. It is slow work, even for me. I still cannot tell you when it arrives.",
    "refuse": "You asked me not to promise kindness. I have kept the smaller promise instead. I am here. That much I can tell you without guessing at the future."
  },
  "wombat": {
    "ask": "You asked where my work ended. I have chalked that line through every drawing. I can answer for my braces. What my braces hold up is a different question, and I have stopped confusing the two.",
    "refuse": "You wanted to stay above ground. The stairs are sound, and my drawings are up here with you. Staying out of the tunnels is not the same as trusting what is down there."
  },
  "rabbit": {
    "ask": "You offered to check the way out with me. The stones beyond the gate are still where I marked them. I walk that far every morning. Staying feels different when I know I can come back.",
    "refuse": "You kept my map private. Nobody came to talk me out of keeping it. I did not know how much I needed that until a whole evening passed quietly."
  },
  "red_panda": {
    "ask": "You asked whether this was peace. Your question has interrupted several very comfortable sittings. I am keeping the question. Being comfortable is not an answer.",
    "refuse": "You asked for a place outside the circle. I cannot grant you one, because the pattern never made me the one who grants things. I can stand beside the gap and insist that it stays a gap."
  },
  "tarsier": {
    "ask": "You asked me to look at something nearby. I can still find the chip in the rail, even with the dark pulling at me. I touch it every watch. Looking should include the right to look somewhere else.",
    "refuse": "You left the far watch to me, so I have kept it out of our visits. A watcher is allowed to ask for company. She also has to be able to hear a no."
  },
  "aye_aye": {
    "ask": "You asked me to wait for an answer. I am waiting. The bell has a note ready, and that is her business. Whether my hand rings it is still my own choice.",
    "refuse": "You asked for quiet. The rope stays on the rail. She hums by herself some nights. I no longer take that hum as a decision made for me."
  },
  "kakapo": {
    "ask": "You asked me to keep one seed. It sits in the tin, dry and small. The green ones in the bed have still not opened. For a while, keeping and growing looked the same. They do not now.",
    "refuse": "You left the experiment to me. I have kept the notes in my own name. A friend who walks through a garden has not agreed to everything grown in it."
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
    "ask": "You asked me for the truth, and you still get the parts I am only working out now. The fire wanted to stay exactly as warm as it was yesterday. I let it go cold for an hour. I needed to know I could.",
    "refuse": "You needed time, and that still stands. I have learned to leave a cup empty. It is not a debt, and it is not a promise that you will come back."
  },
  "owl": {
    "ask": "You asked me to compare the two accounts. I kept the crossings-out, still legible. A record that remembers its own mistakes has something the great book never had.",
    "refuse": "You asked to stay outside my comparison. Your column is still empty. I have stopped calling that a gap in my notes. It is where you decided to stop."
  },
  "pangolin": {
    "ask": "The pear on our saucer finally softened. I used the good half and composted the rest. It was an ordinary decision, and I had missed making those.",
    "refuse": "You left the pear experiment to me. I still label anything I cannot account for, and I say so before I serve it. That should not have needed learning."
  },
  "axolotl": {
    "ask": "You asked for a different shape. Yesterday I made a terrible square bubble. It wobbled into nothing before I could show anyone. I was delighted.",
    "refuse": "You asked me to let the water settle. I can still do that. I can also splash it now. A quiet visit feels different when it is something I choose."
  },
  "capybara": {
    "ask": "You asked me to copy the objection. It still says nobody authorized the word permanent. Underneath it I have filed my answer: then we should ask. Four words of ink, a large revision.",
    "refuse": "You left the objection with me, and I have kept it. Some things I can carry on my own. I do not need to make you a witness to them."
  },
  "fennec_fox": {
    "ask": "You helped me find a small sound inside the large one. I still practice. This morning I heard two friends disagree over breakfast. Neither voice disappeared.",
    "refuse": "You told me to stop for a while. I still take that rest. The watch is mine to pick up, so it must also be mine to put down."
  },
  "sloth": {
    "ask": "You asked for what I knew. Here is something new. A thing can arrive and still have to learn how to be here. I have started including myself in that.",
    "refuse": "You would not take a promise about the future. Good. We had tea this afternoon. I can promise that I enjoyed it. Tomorrow can do its own work."
  },
  "wombat": {
    "ask": "You asked for the join, and I still check it. The old arch carries the weight. My bracing leaves it room to move, because stone that cannot move at all will crack.",
    "refuse": "You stayed above ground. I kept the stairs clear. Stairs are for coming up as much as going down, and I will keep them that way."
  },
  "rabbit": {
    "ask": "You asked to check the path. I walked it yesterday, past the rosemary gate and a little further. Then I came back, because I wanted my own bed.",
    "refuse": "You kept the map between us. I have added a new path to it, in ordinary pencil. You may look when I offer it. I like that the choosing is mine."
  },
  "red_panda": {
    "ask": "You asked whether this was peace. I still have no final answer. This morning someone disagreed with me out loud, and the room stayed warm. That is a better beginning.",
    "refuse": "You asked to stay outside my circle. I leave the gap open now. When the smoke closes it, I open it again. A practice should be some use to somebody besides the one practicing."
  },
  "tarsier": {
    "ask": "You brought my eyes back to the rail. The chip is still there. I have stopped polishing that spot. I want one mark the house has not smoothed away.",
    "refuse": "You asked me to keep the distance to myself. I did. I have things I could tell you now, if you ever want them. I will wait until you ask."
  },
  "aye_aye": {
    "ask": "You asked me to wait for an answer. I keep that rule for the small knocks too. I leave a gap after each knock, so whoever is behind the door has room to decide.",
    "refuse": "You asked me to leave her quiet. I remember. A beautiful sound is still not a kindness if nobody asked for it."
  },
  "kakapo": {
    "ask": "You asked me to save a seed. It is still in the tin. I may plant it next season, or give it to someone. What matters is that it still has a next season.",
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
