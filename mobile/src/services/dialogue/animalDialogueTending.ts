import { AnimalType } from '../../types/homeWorld';
import { TENDING_MILESTONES } from '../../constants/gameBalance';

/**
 * "Deeper Tending" dialogue — the Phase-5 endgame's slow continued revelation.
 *
 * Each animal has one serene line per Tending milestone (5/10/25/50/100). They
 * unlock as the player deepens the pattern at the Tending Shrine, giving the
 * most narrative-invested cohort a steady trickle of genuinely-new dialogue tied
 * directly to the amber sink — without a thousand-line script. They are NOT
 * required narrative (the base post-revelation arc is complete on its own);
 * these are collectible, expressive deepenings, recorded in the Whisper Gallery.
 *
 * Tone: Phase 5 is terrible peace, not dread. Tending is serene custodianship —
 * keeping the fire lit because stopping would feel like forgetting. Each line is
 * about the *act of tending* and the deepening it leaves behind, in the animal's
 * established voice. Ordered to match TENDING_MILESTONES.
 */
export const TENDING_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "The fire brightened when you tended it. I put the kettle on, then remembered to ask whether you wanted tea.",
    "That corner is warm now. I moved the cushion closer to the window anyway. I like a bit of cool air.",
    "You came back. I am glad. I won't turn that into a promise about your next visit.",
    "I burned the toast while watching the flames. If they have a message, I hope it includes how to clean a pan.",
    "We can tend something without giving it every part of ourselves. I'm still practicing. Tea breaks help.",
  ],
  pangolin: [
    "I stirred the pot after your tending. Still needed salt. A house may be extraordinary without being much of a cook.",
    "The stock tastes different today. I asked the others whether they liked it before writing down an improvement.",
    "I put a lid on when the bowl filled. We have enough. A cook ought to recognize enough.",
    "Your tending doesn't excuse you from lunch. It also doesn't oblige you to eat my soufflé. Standards remain complicated.",
    "I tried a new recipe. It failed beautifully. There is bread, and I get to try again.",
  ],
  owl: [
    "I recorded the tending, then crossed out the conclusion I was about to attach. I had observed rather less than I thought.",
    "Another page in the plain notebook. It includes a disagreement about soup. Posterity deserves a varied diet.",
    "I checked the old account against today's. A changed memory is not automatically a corrected one.",
    "The boundary we made is in the index. I check that entry as carefully as the new pages.",
    "There is still room in the book for a question. I have decided to stop calling it the last book.",
  ],
  axolotl: [
    "The current changed when you tended. I watched a bubble miss its usual corner. A tiny surprise. I liked it.",
    "The water is warm at both ends now. I put a cool stone by the glass. Somewhere different to sit.",
    "I grew another little toe. Didn't name it for you. Thought you might prefer your own name back.",
    "I told a story about PLUM and laughed at the ridiculous part. The sad part was still there afterwards.",
    "The bubbles do something new if I move the pebble. Want to see? No promises about what new thing.",
  ],
  sloth: [
    "You tended it. I came down to fetch my own tea. Two creatures doing work nobody had to declare inevitable.",
    "The vines grew closer. I loosened one from the hammock rope. Company should not make the furniture unusable.",
    "I still enjoy the warmth. Thyme still has objections. We both finished our tea.",
    "I've stopped calling each return the thing you were always going to do. It takes some practice, that stopping.",
    "Another tending. Another evening. I can be glad of this one without laying claim to the next.",
  ],
  fennec_fox: [
    "I heard the tending in the bowl. Then I listened for the gecko. Both sounds deserve their own place.",
    "The low note deepened. I moved the chime outside so I could still hear the wind make mistakes.",
    "I took the wool off one ear for your visit. Put it back afterwards. This is how I manage company now.",
    "Vesper changed a note in our song. I followed her. I am getting better at leaving the chart alone.",
    "The presence makes a sound I know. So do you. I intend to keep hearing the difference.",
  ],
  capybara: [
    "Tending entered. No follow-up appointment assumed.",
    "I added a column for things we want to change. It is more popular than anticipated.",
    "The new sheet arrived tidy. I checked the untidy original before filing anything.",
    "I scheduled a break. Took it. The record survived my temporary absence.",
    "Continued work. Continued questions. Status field expanded to fit both.",
  ],
  wombat: [
    "The new warmth reached a joint. I checked the clearance. Expansion needs room.",
    "I measured after the tending. Wrote down the difference, including the part I didn't like.",
    "The soil shifted. I left my marker in place so I can tell whether it shifts again.",
    "I repaired a support with a different joint. The old pattern doesn't own every possible solution.",
    "It holds. Our limits count as part of the structure now. I'll keep checking both.",
  ],
  rabbit: [
    "I watered after you tended. The flowers needed ordinary water. I was pleased to have an ordinary job.",
    "Something new opened in the bed. I labeled it unknown. I don't have to decide immediately whether to love it.",
    "My heart fluttered today. I checked the latch, found it sound, and went back to the seedlings.",
    "I left seeds in the tin. More growth doesn't require planting every possibility at once.",
    "The garden is still changing. I moved a path because I wanted to. Would you like to see where it goes?",
  ],
  red_panda: [
    "I watched the smoke after your tending. Then the kettle boiled over. I have observations about both.",
    "The reeds leaned together. One rattled against the window. I left space around it.",
    "I almost explained your returning to you. Caught myself. Would you like tea instead?",
    "Thyme disagreed with something I said. I wrote her words beside mine so I can't remember an easier conversation.",
    "Tending is a thing we can do together. It needn't make our reasons identical.",
  ],
  tarsier: [
    "The far ridge grew clearer after the tending. I recorded that before deciding I understood why.",
    "There is more to see. I took my break anyway. The sky managed without a witness for ten minutes.",
    "Fennick heard a note I couldn't place. I asked him to lead. An educational evening at the rail.",
    "I keep a page for what I noticed while looking away from the presence. It is filling with quite ordinary stars.",
    "The watch continues because I choose it today. Ask me tomorrow; I would like the question to remain possible.",
  ],
  aye_aye: [
    "A new undertone in the bronze after your tending. I listened, then went back to mending the loose peg.",
    "The beams answered differently. I kept yesterday's notes. A difference deserves better than being erased as an error.",
    "I asked for a little quiet while I worked. My hammer sounds more honest when I can hear it miss.",
    "The bell's scratch remains. I polish around it. I know which part of her history I am touching.",
    "You may come without tending. Tok, tok still means hello. I haven't attached conditions to it.",
  ],
  kakapo: [
    "The beds warmed after you tended. I checked the seedlings and watered the dry ones. No ceremony required.",
    "A new shoot beside the bowl. I moved a marker to give it room. The drawing can change.",
    "I heard the low answer while working. For once, I finished watering before listening. The seedlings were waiting too.",
    "I saved seeds from the odd flower instead of planting them all. I'd like to see another season first.",
    "There is a small empty pot by the gate. We haven't decided what belongs there. Good place to begin next time.",
  ],
};

/**
 * Get the Tending milestone lines an animal has unlocked at the given Tending
 * Level — those whose milestone tier is <= level, in milestone order. The
 * returned array length equals `unlockedTendingLineCount(level)`.
 */
export function getTendingMilestoneLines(animalType: AnimalType, tendingLevel: number): string[] {
  const lines = TENDING_DIALOGUES[animalType] ?? [];
  const out: string[] = [];
  for (let i = 0; i < TENDING_MILESTONES.length; i++) {
    if (TENDING_MILESTONES[i] <= tendingLevel && lines[i]) {
      out.push(lines[i]);
    }
  }
  return out;
}
