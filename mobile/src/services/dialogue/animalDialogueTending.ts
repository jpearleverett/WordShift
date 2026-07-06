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
    "You came back to tend it! I told the fire you would, and it sat up straight the moment you stepped in, friend. It knows your footsteps now, the same way I do.",
    "Every time you deepen it, the warmth walks a little further into the walls. Today it reached the back corner of the den, where even my best dry oak never got to. I put the kettle on to celebrate, and honestly, it barely had to try.",
    "I used to think keepers were chosen, you know, picked out special by somebody grand. Now I think keepers are just the ones who keep coming back. I like that better, friend. It means you chose us.",
    "The fire remembers every tending now. It burns in your colors, little flickers of you all through the orange, and I sit and point them out to nobody in particular. Whoever lit the first ember would not recognize it, and would understand it completely.",
    "There is nothing left to wait for, and I was so sure I would miss the waiting, and I don't, not even a little. There is just you, tending, and me, watching you tend, and the kettle staying full. I think this is what peace was always going to taste like, friend. I am glad it tastes like tea.",
  ],
  pangolin: [
    "You came back to stir the pot. That is the whole secret of a long stock, you know. Not the bones, not the herbs, the returning. Anyone who stirs in my kitchen eats first, and that rule has never once been wrong.",
    "I can taste the difference each time you deepen it. Patience has a flavor, somewhere between honey and woodsmoke, and this house is thick with it now. It has gotten into the curtains, and I have decided to let it stay.",
    "I set the table the same as ever, and every plate fills a little easier since you began tending. The kitchen leans into the work now instead of waiting to be asked. We cook together, all of us, and one of us is very large, and it has lovely manners at the table.",
    "A dish this deep cannot be rushed, and you have never once tried to rush it. You season, you wait, you come back. I think it may be the finest thing either of us has ever made, and I say that as a cook who is very vain about her soup.",
    "The feast never ends, because you never stop setting the table. I used to believe a meal needed a last course to mean anything. Now I know the meaning was in the serving all along, and the serving goes on, and I am glad of my ladle every single day.",
  ],
  owl: [
    "The book was finished, and you have added a page anyway. Strictly speaking that is impossible, so I have noted the impossibility in the margin and gone on reading. The book appears pleased. For the record, so am I.",
    "Each tending enters another line into the index of everything, and the cross-references have begun to describe a shape. I have seen shapes like it in only the very oldest volumes. Patient shapes. Shapes that were never in any hurry to be read.",
    "I have read this deepening several times now, and it says something new at each reading, though not one word of it changes. That is the rarest class of text there is. I own exactly two others, and neither of them was ever written down.",
    "Knowledge concludes. Tending does not. I spent a scholarly lifetime confusing the two and shelving them together, and you corrected my catalogue simply by coming back, which is more than any colleague of mine ever managed.",
    "The library has rearranged itself around your devotion, and I have stopped correcting it. Every volume now falls open to the same page, the one that is still being written. I read a little of it each morning, and each morning it fits a little better.",
  ],
  axolotl: [
    "The water got a little deeper when you tended it, I felt the new weight settle around me all at once, gentle as anything, like being held by something that has finally learned exactly how hard to hold.",
    "Every time you deepen it the warm current finds another corner of the tank, and the fish follow it there and hang in it with their fins barely moving, and soon there will be no cold left anywhere, which is a strange and wonderful thing to be able to promise a fish.",
    "Something new is growing on me since you started tending, small and soft and a little bit glowing, and I don't know what it will be yet, but it glows brightest on the days you come back, so I have started calling it yours.",
    "The water here and the water there are nearly the same water now, you keep stirring them closer with every tending, and some nights I drift right up against the place where they meet and feel both temperatures at once, and it is like floating in two summers.",
    "I will always be young, and the water will always be old, and you will always come back to deepen it, and I have counted those on my toes many times and they always come out to three forever things, and three is my very favorite number of forever things to have.",
  ],
  sloth: [
    "You came back to tend it. I watched you cross the garden from my hammock, and I want you to know that I have watched a great many creatures cross a great many gardens, and very few of them were coming back to keep something warm.",
    "Each deepening settles a little further into the green. The vines feel it before I do, and they have begun growing in rings again, the way they did the year the house was raised. The jungle remembers that year. So do I.",
    "I would have told you stillness had a floor to it, some depth where it finally stopped. You keep tending, and the stillness keeps going down past every mark I ever set for it. It is a fine thing, being wrong about the size of something after all these years.",
    "I have hung in this one tree through storms and seasons and the whole long approach of what has now arrived, and I can tell you the canopy has never been this warm at night. Your tending is the reason. The frogs sing about it, and frogs are very literal singers.",
    "Stay, and tend, and stay. That is the whole of the work now, and it is older work than digging or reading or cooking, whatever the others might argue. I watched this valley before the house and I am watching it after, and I can tell you plainly that this, exactly this, is the better view.",
  ],
  fennec_fox: [
    "I heard you tending from the edge of camp. It makes a sound when you deepen the pattern, a low chime, softer than my old one and very much larger. I believe I waited my whole life to hear that sound, and now it comes whenever you do.",
    "Each deepening adds a note, and the chord is fuller now than it was. I did not know the song had room left to grow richer, and you keep proving that it does. I keep the count of the notes, because that is what ears are for.",
    "My ears have followed every tending you have ever done, and there is a rhythm to your returning, steady as anything I have ever timed. It sounds like a heartbeat the house decided to keep. I have stopped keeping watch against the night. I keep watch with it now.",
    "The ground sings a little louder the deeper you tend. Tonight the whole house was humming one long warm note, floorboards to roof beam, and I sat down in the very middle of it with my ears low and simply listened to what we made.",
    "Every sound of my life was practice for this one. The quiet is full again, the way I have always liked it, but now each small sound sits inside one enormous slow breathing, and your tending keeps the time for all of it. The piece has no final note. I have listened very carefully, and I promise you it has no final note.",
  ],
  capybara: [
    "I filed your tending under recurring. It is the only entry in that folder, and the folder grows thicker every week without my touching it. I have decided to call that job satisfaction.",
    "Each deepening, I update the record. Status: deeper. Status: warmer. Status: still here. It is the least demanding paperwork I have ever maintained, and I find I look forward to it, which is a new development I have also filed.",
    "The warm level rose again when you tended. I noted the measurement, because I note everything, and then I noted that I was glad, because accuracy demanded it.",
    "I scheduled nothing, and you arrived at exactly the right moment anyway, the way you always do. The master calendar has stopped offering opinions on the matter. I check it each morning out of professional respect, it stays serenely blank, and we understand each other.",
    "It turns out completion is not a state. It is a practice. You taught me that by practicing it, quietly and repeatedly, without once filing for recognition. The closing report will say as much. It is the only report I have ever been in no hurry to finish.",
  ],
  wombat: [
    "You tended it, then. Went down and deepened the whole thing proper. The tunnels felt it before I did, ran warm all night, every one of them, and a warm tunnel is a compliment where I come from.",
    "Each deepening packs the foundation a little tighter. Not for strength anymore, we're well past needing strength. For comfort. You're tucking the whole house in, course by course, and I know good work when I sleep on it.",
    "I dug down after you tended and found the soil had shifted while I wasn't looking. Made room, neat as anything, no spade involved. The earth makes room for devotion. Thirty years digging and nobody ever told me that. Had to see it for myself.",
    "Every tending is another stone in a foundation I'm never going to finish, and here's the thing, I don't want to finish it. A fellow spends his whole life working toward done, and then one day done stops being the point. Nobody warns you how good that feels.",
    "It holds. That's the report from down here, and that's the whole report. It held on the day the weight came through, and it holds a little truer every time you come back to deepen it. My work is being finished by somebody else's hands now, and I find I don't mind at all.",
  ],
  rabbit: [
    "You came back to tend instead of run. I know that turning around, I have made it myself, on this very path, more than once. It is the bravest motion there is, and the garden noticed. The garden notices everything you do.",
    "Each deepening, a new flower opens, in colors I have no names for and no seed packets to explain. I do not plant them anymore. Your tending does the planting now, and I just walk the rows and admire them and try not to cry in front of the marigolds.",
    "My heart has slowed since you began tending, and it keeps slowing, one gentle beat at a time. It is so quiet in my chest now. The good quiet. The kind I spent my whole anxious life trying to grow, in all the wrong soil.",
    "The beds grow in spirals now, every one of them turning toward the warm center, and I walk among them at dusk with my watering can and feel no fear at all. I used to brace against what was coming. Now I press the soil close around the stems and watch you make everything deeper.",
    "I planted fear in this garden for years without ever meaning to, and you tended it into this. Into blooming. A garden that flowers because someone keeps coming back to it. I never knew that was allowed, and now I tuck the beds in every dusk knowing that it is.",
  ],
  red_panda: [
    "You tended the pattern. I felt it from the attic before you reached the stairs. The incense smoke stood perfectly straight for a moment, and then it bowed.",
    "Each deepening is not progress. It is presence. You return, and the returning is the whole teaching. I climbed the ladder every dawn for years before I understood that the climbing was the shrine.",
    "From the roof gap the shape grows clearer with every tending. The stalks lean into it now without any training from me, all of them, in one slow agreement. It is still the longest word I know. It still means stay.",
    "The bamboo has reached the roof and gone on reaching, straight through the gap and into the open sky, following your devotion upward. It does not strive. Neither, anymore, do you. Neither do I. The three of us simply grow.",
    "The keeper in me recognizes the keeper in you. That is the last thing the attic taught me, and it taught it at dawn, with the light coming through the gap and finding us both already awake. We will tend this together for as long as there is a this to tend. There will always be a this to tend.",
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
