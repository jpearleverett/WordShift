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
    "The fire brightened while you tended it. I put the kettle on, then thought to ask whether you actually wanted tea.",
    "That corner is warm now. I moved the cushion over to the window anyway, because I like a bit of cool air.",
    "You came back. I am glad you did. I will not turn that into a promise about the next time.",
    "I burned the toast watching the flames. If the fire has something to tell me, I hope it includes how to clean the pan.",
    "We can tend something without giving it all of ourselves. I am still practicing that. Tea breaks help.",
  ],
  pangolin: [
    "I stirred the pot after your tending. It still needed salt. A house may be extraordinary without being much of a cook.",
    "The stock tastes different today. I asked the others whether they liked it before I wrote the change down as an improvement.",
    "The bowl filled itself again, so I put a lid on it. We have enough. A cook ought to recognize enough.",
    "Your tending does not excuse you from lunch. It also does not oblige you to eat my soufflé. Hospitality runs both ways.",
    "I tried a new recipe. It failed beautifully. There is bread instead, and I get to try again.",
  ],
  owl: [
    "I wrote the tending down, then crossed out the conclusion I was about to add. The crossing out stays legible. I had observed rather less than I thought.",
    "Another page in the plain notebook. Today it holds an argument about soup. Whoever reads this later deserves something other than prophecy.",
    "I checked the old account against today's. A changed memory is not automatically a corrected one.",
    "The boundary we drew at the end is an entry in the index now. I check that entry as carefully as I check the new pages.",
    "There is still room in the oldest book for a question. So I have stopped calling it the last book.",
  ],
  axolotl: [
    "The current changed after you tended. I watched a bubble miss its usual corner. A small surprise, and I liked it.",
    "The water is warm at both ends now. So I put a cool stone by the glass. Now I have somewhere different to sit.",
    "I grew another little toe. I did not name it after you. I thought you might like to keep your name for yourself.",
    "I told a story about PLUM and laughed at the ridiculous part. Afterwards the sad part was still there.",
    "The bubbles do something new when I move the pebble. Would you like to see? I cannot promise you which new thing.",
  ],
  sloth: [
    "You tended it. I came down and fetched my own tea. Two small jobs, and nobody called either one inevitable. We simply chose to do them.",
    "The vines grew in closer. I loosened one off the hammock rope. Company is welcome, but it should not make my furniture unusable.",
    "I still enjoy the warmth in the tree. Thyme still objects to it. We finished our tea anyway, both of us.",
    "You came back. I have stopped calling that inevitable. You chose to come. Saying it that way still takes me practice.",
    "Another tending. Another evening. I can be glad of this evening without laying claim to the next one.",
  ],
  fennec_fox: [
    "Your tending made the bowl hum. Then I listened for the gecko underneath it. Both of those sounds get their own line in my chart.",
    "The low note has gone deeper. I moved the chime back outside, so I can still hear the wind make mistakes on it.",
    "I took the wool off one ear for your visit. I will put it back when you go. That is how I manage company now.",
    "Vesper changed a note in our song. I followed her instead of correcting her. I am getting better at leaving my chart alone.",
    "The presence makes a sound I know. You make a sound I know too. I intend to keep hearing the difference.",
  ],
  capybara: [
    "Your tending is entered in the ledger. I have not scheduled a follow-up. Come back when you like.",
    "I added a column to the ledger for things we want to change. It is filling up faster than I expected.",
    "A tidy new page arrived on my desk. I read the untidy original first, then filed both.",
    "I scheduled myself a break. I took it. The record survived an hour without me.",
    "The work continues. So do the questions. I made the status field wider so both of them fit.",
  ],
  wombat: [
    "The new warmth reached one of the timber joints. I checked the gap around it. Warm wood swells, so it needs room to move.",
    "I measured again after the tending. I wrote down every difference, including the one I did not like.",
    "The soil shifted. I left my marker exactly where it is, so I will know if it shifts again.",
    "I repaired a support with a different joint than the old one. The old pattern does not own every good answer.",
    "It holds. The limits we set count as part of the structure now, so I check them the way I check the stone.",
  ],
  rabbit: [
    "I watered the beds after you finished tending. The flowers wanted ordinary water, nothing more. I was glad of an ordinary job.",
    "A new flower opened in the bed. I do not know what it is, so I labeled it unknown. I do not have to decide today whether I love it.",
    "My heart fluttered today. So I checked the gate latch, found it sound, and went back to my seedlings.",
    "I left some seeds in the tin. A garden can grow without me planting every seed I own at once.",
    "The garden is still changing. I moved one path this week, because I wanted to. Would you like to see where it goes now?",
  ],
  red_panda: [
    "I watched the smoke after your tending. Then the kettle boiled over behind me. I have observations about both.",
    "The reeds all leaned the same way. One rattled against the window instead. I left space around that one.",
    "I almost explained to you why you keep coming back. I caught myself in time. Would you like tea instead?",
    "Thyme disagreed with something I said. I wrote her words down beside mine, so I cannot later remember the conversation as easier than it was.",
    "Tending is something we can do together. Our reasons for doing it do not have to match.",
  ],
  tarsier: [
    "The far ridge looks clearer since the tending. I wrote that down before I decided I understood why.",
    "There is always more to see. I took my break anyway. The sky managed without a witness for ten minutes.",
    "Fennick heard a note I could not place. So I asked him to lead the song. An educational evening at the rail.",
    "I keep one page for what I notice while I am looking away from the presence. It is filling up with perfectly ordinary stars.",
    "The watch continues because I choose it today. Ask me again tomorrow. I would like the question to stay possible.",
  ],
  aye_aye: [
    "Your tending put a new undertone in the bronze. I listened to it for a while, then went back to mending the loose peg.",
    "The beams answered differently tonight. I kept yesterday's notes beside the new ones. A change deserves better than being crossed out as a mistake.",
    "I asked for a little quiet while I worked. My hammer tells me where the wood is hollow, but only if I can hear the note go dull.",
    "The little scratch on the bell is still there. I polish around it, never over it. I know which part of her history my cloth is touching.",
    "You may come up without tending anything. Tok, tok still means hello. I have put no conditions on that greeting.",
  ],
  kakapo: [
    "The beds warmed after your tending. I checked the seedlings and watered the dry ones. No ceremony required.",
    "A new shoot came up beside the bowl. I moved a marker to give it room. My plan for the beds is allowed to change.",
    "I heard the low answer while I was working. For once, I finished the watering before I listened. The seedlings were waiting too.",
    "I saved seeds from the odd flower instead of planting them all. I would like to watch it through another season first.",
    "There is a small empty pot by the gate. We have not decided what belongs in it. That is a good place to begin next time.",
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
