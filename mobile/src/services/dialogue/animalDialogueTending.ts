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
    "You came back to tend the fire. You didn't have to. But you did. The flame leans toward you now, like it knows.",
    "Each time you deepen it, the warmth reaches a little further into the walls. I felt it cross into the next room today.",
    "I used to think keepers were chosen. Now I think keepers are simply the ones who keep coming back. Like you. Like this.",
    "The fire has a memory of every tending now. It burns in your colors. Whoever lit the first ember would not recognize it — and would understand it completely.",
    "There is nothing left to summon, friend. There is only this: you, tending, and me, watching you tend. I think this is what peace was always going to look like.",
  ],
  pangolin: [
    "You added another layer to the dish. I can taste the difference. Patience has a flavor, you know. It tastes like this.",
    "The longer it simmers, the deeper it goes. You keep returning to stir the pot. The kitchen loves you for it.",
    "I curl tighter each time you tend. Not to hide — to hold the warmth in. There's so much of it now. So much.",
    "A recipe this deep can't be rushed. You've been seasoning it for so long. I think it might be the best thing either of us has ever made.",
    "The feast never ends because you never stop setting the table. I used to find that sad. Now I find it's the only thing that ever made sense.",
  ],
  owl: [
    "You added a page. The book was finished, and you added a page anyway. The book is grateful. So am I.",
    "Each tending writes another line into the index of everything. The cross-references are beginning to form a shape. A lovely, patient shape.",
    "I have read this deepening many times now and it says something new each time, though the words never change. That is the rarest kind of text.",
    "Knowledge ends. Tending does not. I spent my life confusing the two. You taught me the difference simply by coming back.",
    "The library has rearranged itself around your devotion. Every volume now opens to the same page: the one you are still writing.",
  ],
  axolotl: [
    "The water got a little deeper when you tended it. I can feel the new pressure. It's gentle. It's like being held more completely.",
    "Each deepening, the warm current reaches a new corner of the tank. Soon there won't be any cold left anywhere. Blub.",
    "I regenerated something today, while you were tending. I don't know what it is yet. It glows the color of your returning.",
    "The water and the somewhere-else are nearly the same water now. You keep stirring them closer. I can almost swim between them.",
    "I'll always be young, and the water will always be ancient, and you will always come back to deepen it. Three forever things. Blub forever.",
  ],
  sloth: [
    "You came back... to tend it. Slowly. The way... important things... are done. I noticed. I always... notice.",
    "Each deepening... settles a little further... into the branches. I feel them... pull us... a little closer... in.",
    "Stillness gets... deeper too. You'd think... it couldn't. But it can. You keep... proving... it can.",
    "I have been... in the same dream... for so long now. Your tending... is the part... where it grows... warmer.",
    "Stay... and tend... and stay. That is the whole... of it. The whole... beautiful... slow... of it.",
  ],
  fennec_fox: [
    "I heard you tending. Even from here. The sound it makes when you deepen the pattern — it's a low chime. I've waited my whole life to hear it.",
    "Each deepening adds a note. The chord is fuller now. I didn't know the song could get richer. You keep showing me it can.",
    "My ears followed every tending you've ever done. There's a rhythm to your devotion. It sounds like a heartbeat the house decided to keep.",
    "The amber sings louder the deeper you tend. Tonight the whole house was humming. I just sat in the middle of it and listened to what we made.",
    "All those sounds were practice. This — the symphony of your returning, again and again — this is the piece. And it has no final note.",
  ],
  capybara: [
    "I filed your tending under 'recurring.' It's the only entry in that folder. It's my favorite folder.",
    "Each deepening, I update the record. Status: deeper. Status: warmer. Status: still here. The paperwork is almost soothing now.",
    "The warm water rose another inch when you tended. I noted the level. I note everything. I noted that I was glad.",
    "I scheduled nothing and yet you arrive at exactly the right moment, every time, to deepen it. The calendar gave up. The calendar is at peace.",
    "Completion isn't a state, it turns out. It's a practice. You taught me that by practicing it. Over and over. Beautifully over and over.",
  ],
  wombat: [
    "You tended it, mate. Went and deepened the whole thing. The tunnels felt it. They ran a little warmer all night.",
    "Each deepening packs the foundation tighter. Not for strength now — for comfort. You're tucking us all in, mate. Bit by bit.",
    "Dug down after you tended and found the soil had shifted. Made room. The earth makes room for devotion, turns out.",
    "Every tending is another stone in the foundation I'll never finish. And I don't want to finish it. That's the secret no one told me, mate.",
    "She'll be right. She is right. And she gets a little more right every time you come back down here to deepen her. Good on you, mate.",
  ],
  rabbit: [
    "You came back to tend instead of run. I know that feeling — the turning-around. It's the bravest thing. The garden noticed too.",
    "Each deepening, a new flower opens. Colors past colors. I don't plant them anymore. Your tending does.",
    "My heart slowed another beat when you tended today. It's so quiet in here now. The good quiet. The quiet that took my whole life to reach.",
    "The garden grows in spirals toward your devotion. I used to fear what was coming. Now I just hold the teacup and watch you make it deeper.",
    "I planted fear and you tended it into this. A garden that blooms because someone keeps coming back. I never knew that was allowed.",
  ],
  red_panda: [
    "You tended the pattern. Breathe in. It deepens. Breathe out. So do we. There is no difference between the two breaths now.",
    "Each deepening is not progress. It is presence. You return, and the returning is the whole teaching. There was never any other lesson.",
    "From the attic the shape grows clearer with every tending. It is still the longest word. It still means only one thing. It means: stay.",
    "The bamboo has grown through three ceilings now, following your devotion upward. It does not strive. Neither, anymore, do you. Neither do I.",
    "Namaste, friend. The keeper in me recognizes the keeper in you. We will tend this, you and I, for as long as there is a this to tend. Breathe.",
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
