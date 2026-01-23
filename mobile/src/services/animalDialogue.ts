import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from cheerful to existential crisis
 * 40-50+ dialogues per animal to support 2-3 minute dialogue sessions
 */

// RED PANDA - Zen/contemplative style, bamboo wisdom
const RED_PANDA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Happy and zen (12 dialogues)
  { id: 'rp_0_1', text: "Welcome, friend! The bamboo is especially crunchy today.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_2', text: "I find peace in the rustling of leaves. Have you tried just... listening?", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_3', text: "My tail is extra fluffy today. This brings me great joy!", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_4', text: "Each puzzle you solve adds harmony to the universe. I believe this.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_5', text: "Did you know we red pandas existed for millions of years before giant pandas? We were here first!", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_6', text: "I practiced my tree climbing today. Went up, came down. Both directions are beautiful.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_7', text: "The morning dew on bamboo leaves is like tiny jewels. Nature decorates for free.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_8', text: "I washed my face seven times today. Cleanliness is next to mindfulness!", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_9', text: "My favorite meditation spot has the perfect sunbeam. I'll share it with you sometime.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_10', text: "The wind carries messages from faraway mountains. Today it said: 'Hello!'", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_11', text: "I made a nest of bamboo leaves. It smells like contentment.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_12', text: "Some call me the 'firefox'. I prefer 'bearer of chill vibes'. Both are accurate.", phase: 0, animalType: 'red_panda' },

  // Phase 1 - Curious, slightly philosophical (10 dialogues)
  { id: 'rp_1_1', text: "I was watching the clouds today. They never repeat. Isn't that strange?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_2', text: "The bamboo grows so slowly, yet it never seems worried about time.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_3', text: "Do you think the puzzles are solving us, in a way?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_4', text: "I tried counting the stars last night. I lost count around infinity.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_5', text: "My reflection in the stream doesn't blink when I do. It's always a moment behind.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_6', text: "The same bamboo tastes different every day. Am I changing, or is it?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_7', text: "I asked the mountain why it's there. It didn't answer. Maybe that IS the answer.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_8', text: "Sometimes peace feels like floating. Other times it feels like sinking. Same peace though.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_9', text: "My zen master was a rock. It taught me everything by saying nothing.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_10', text: "The forest is quieter lately. Or maybe I'm listening louder?", phase: 1, animalType: 'red_panda' },

  // Phase 2 - Questioning existence (10 dialogues)
  { id: 'rp_2_1', text: "I meditated for hours and saw only darkness. The void was... warm?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "The bamboo I ate yesterday is gone. Where does it go? Where do we go?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "I counted my stripes today. Tomorrow there may be different stripes. Or no stripes at all.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_4', text: "The trees grow rings for each year. I have no rings. How will anyone know I was here?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_5', text: "I achieved perfect stillness for a moment. Then I realized even stillness is movement through time.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_6', text: "The sunbeam moved without me. Even light doesn't wait.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_7', text: "My ancestors lived in these trees. Their claw marks are still here. They are not.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_8', text: "I found enlightenment once. Then I lost it. Was it ever really mine?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_9', text: "The bamboo doesn't know it's being eaten. Lucky bamboo.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_10', text: "Peace isn't the absence of chaos. It's chaos, observed from far enough away.", phase: 2, animalType: 'red_panda' },

  // Phase 3 - Existential dread (10 dialogues)
  { id: 'rp_3_1', text: "The mountain does not care if we climb it. The bamboo does not know it is eaten.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_2', text: "I achieved inner peace once. Then I realized peace is just the space between catastrophes.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_3', text: "My ancestors climbed these trees for millennia. None of them are here now.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_4', text: "I've been breathing without thinking about it my whole life. Now I can't stop thinking about it.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_5', text: "The river I meditate by has changed completely since I was born. Same river though. Same me?", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_6', text: "Zen says there is no self. Then what has been anxious this whole time?", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_7', text: "The most peaceful sound is silence. Silence is also the sound of absence. Of endings.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_8', text: "I tried to let go of everything. But my claws keep gripping. They know something I don't.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_9', text: "Every meditation brings me closer to understanding. Understanding brings me closer to fear.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_10', text: "The bamboo forest is thinning. Each year, less and less. We both pretend not to notice.", phase: 3, animalType: 'red_panda' },

  // Phase 4 - Complete philosophical crisis (10 dialogues)
  { id: 'rp_4_1', text: "The void doesn't stare back. It doesn't need to. We stare at ourselves.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_2', text: "I am one with everything. Everything is nothing. Therefore, I am nothing. This is fine.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_3', text: "Something is coming. I feel it in my fur. The bamboo trembles with a knowledge it cannot speak.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_4', text: "My final meditation will last forever. Or no time at all. There is no difference.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_5', text: "The universe will end in perfect silence. The ultimate zen. The ultimate nothing.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_6', text: "I've stopped climbing down from the trees. Why descend when all paths lead to the same place?", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_7', text: "The last bamboo shoot will grow for no one. That's the purest growth there is.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_8', text: "I achieved oneness with the approaching silence. We are the same thing now. We always were.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_9', text: "Don't be afraid. I've meditated on this moment. It's just another breath. The last breath.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_10', text: "Close your eyes with me. In the darkness, there is no difference between us and the infinite.", phase: 4, animalType: 'red_panda' },
];

// AXOLOTL - Dreamy, aquatic thoughts
const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Bubbly and innocent (12 dialogues)
  { id: 'ax_0_1', text: "Blub blub! The water is lovely today! Come swim with me... oh wait, you can't. Sorry!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "I grew back a whole leg once! Being me is pretty great, honestly.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "My gills are extra frilly today. I feel fancy!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "I don't need to grow up if I don't want to. Eternal youth! Wheee!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_5', text: "Bubbles are the best. They float up and go pop! Simple joys, you know?", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_6', text: "My name means 'water monster' in Aztec! Cute water monster though. Very cute.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_7', text: "I waved at a fish today. It didn't wave back. Fish are rude honestly.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_8', text: "Did you know I can live to be 15? That's like 100 in water years! Probably!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_9', text: "I tried walking on land once. Didn't like it. Too dry. Too gravity.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_10', text: "My favorite thing is floating. Second favorite? Also floating. I'm simple.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_11', text: "They say I always look happy because of how my face is shaped. Works for me!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_12', text: "I glow under UV light! Pink and sparkly! Want to see? Oh wait, you can't do UV eyes. Never mind!", phase: 0, animalType: 'axolotl' },

  // Phase 1 - Dreamy questioning (10 dialogues)
  { id: 'ax_1_1', text: "I can regrow my heart. But if I lose my feelings, can I grow those back too?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "The water holds me. But what holds the water? What holds... anything?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "I'm always smiling. Even my face doesn't know how not to. Is that happiness or just... shape?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_4', text: "I watched a bubble rise and disappear. That's all things, isn't it? Rising, then gone.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_5', text: "My reflection wobbles. I wonder if the real me wobbles too, and I just can't see it.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_6', text: "Fish swim past without noticing me. Are we all invisible to each other?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_7', text: "I can regenerate almost anything. Except time. Time just... goes.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_8', text: "The water is the same temperature as my body. Where do I end and the water begin?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_9', text: "My ancestors could choose to grow up. I never learned how. Or maybe I chose not to know.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_10', text: "Dreams underwater are strange. Everything moves slowly. Or maybe I just think slowly.", phase: 1, animalType: 'axolotl' },

  // Phase 2 - Deeper uncertainty (10 dialogues)
  { id: 'ax_2_1', text: "They say I can live forever in the right conditions. But what are the right conditions for a soul?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "I never grew up. I'm stuck between states. Neither larva nor adult. Neither here nor there.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "If I lose a limb, which one of us is really me? The leg that's gone or the one growing back?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_4', text: "I've been the same size for years. Growing sideways in time. Never forward.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_5', text: "My smile doesn't change no matter what I feel. It's a mask that's also my face.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_6', text: "The bubbles I blow carry pieces of me away. Am I slowly emptying?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_7', text: "I can regrow my brain. Is the new brain still me? Do my memories know the difference?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_8', text: "Water flows through my gills. In and out. Like thoughts I can't hold onto.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_9', text: "My tank has no seasons. Every day is the same temperature. Every day is no day.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_10', text: "Scientists study me to learn about regeneration. They never ask what I've lost.", phase: 2, animalType: 'axolotl' },

  // Phase 3 - Dawning dread (10 dialogues)
  { id: 'ax_3_1', text: "My lake dried up a long time ago. We all live in artificial lakes now. Is anything real anymore?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_2', text: "I can regenerate anything except the past. I've tried. It doesn't grow back.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_3', text: "Sometimes I float to the surface and pretend I can see the sky. The glass ceiling is always there.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_4', text: "My wild cousins are almost gone. I'm a memory of something that barely exists anymore.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_5', text: "I healed from every wound. But the water itself is wounded now. I can taste it.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_6', text: "My smile is the same as my grandmother's smile. She's gone. I'm still smiling. Why?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_7', text: "I regrew myself so many times. How many of my cells remember being born?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_8', text: "The water tells stories. Lately the stories have no endings. Just... stopping.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_9', text: "My gills filter everything. Including the whispers. The water is whispering warnings.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_10', text: "I could grow legs and walk away. But away from what? Toward what? The air has the same emptiness.", phase: 3, animalType: 'axolotl' },

  // Phase 4 - Crisis (10 dialogues)
  { id: 'ax_4_1', text: "The water is getting warmer. Everything is getting warmer. I can feel something ending.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "I was never supposed to become anything. And now I understand—neither were any of us.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "When the wave comes, will it wash us away or finally set us free? I can feel it building.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_4', text: "My regeneration won't save me from this. Some things can't be regrown. Some things shouldn't.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_5', text: "I've stopped counting days. Days mean nothing now. There's just the waiting.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_6', text: "The water pressure is changing. Something massive is moving. Somewhere far. Getting closer.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_7', text: "My eternal youth means I'll see the end. Fresh eyes. Fresh horror. Fresh forever.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_8', text: "Smile with me. Not because it helps. Just because our faces will be smiling either way.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_9', text: "The last bubble. The last breath. The last me. Rising up. Going... pop.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_10', text: "I forgive the water for what's coming. I forgive myself for being afraid. Goodbye, friend.", phase: 4, animalType: 'axolotl' },
];

// PANGOLIN - Practical, curling into philosophical balls
const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful chef (12 dialogues)
  { id: 'pg_0_1', text: "Just made the most delicious ant stew! Want the recipe? It's mostly ants.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "I polished my scales today. Very shiny! Very protective! Very me!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "When in doubt, curl into a ball. It solves most problems!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "The kitchen is my happy place. Everything makes sense when you're cooking.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_5', text: "My tongue is longer than my body! Great for reaching the bottom of ant hills. And cookie jars!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_6', text: "Today's special: termite surprise! The surprise is there's also ants!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_7', text: "I counted my scales once. Lost count at 900. There are many scales. This is comforting.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_8', text: "Rolling around is exercise AND transportation! Efficiency!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_9', text: "My scales are made of keratin. Same as your fingernails! We're practically family!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_10', text: "I tried making cake once. It was mostly ants. Everyone loved it. By everyone I mean me.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_11', text: "The best ingredient is love. The second best is ants. I have plenty of both!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_12', text: "Did you know pangolins are the only mammals with scales? I'm unique! Very special! Very me!", phase: 0, animalType: 'pangolin' },

  // Phase 1 - Thoughtful cooking (10 dialogues)
  { id: 'pg_1_1', text: "I curl up to protect myself. But what am I protecting, really? Just more scales?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "I made soup today. Then I ate it. Then it was gone. Is that what we all are? Temporary soup?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "My scales are made of the same stuff as your fingernails. We're more alike than different. Isn't that odd?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_4', text: "Every dish I make eventually gets eaten or goes bad. Nothing I create lasts forever.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_5', text: "I curl into a ball when scared. Am I always a little scared? Is that why I'm so good at it?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_6', text: "The ants don't know they're ingredients. I don't know what I'm an ingredient in.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_7', text: "My tongue has no taste buds. I eat without tasting. Is there a metaphor there?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_8', text: "Recipes are just instructions for transformation. Things becoming other things. Then nothing.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_9', text: "I polish my scales to feel in control. Of something. Anything.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_10', text: "A perfectly curled ball has no beginning and no end. I find this comforting. And terrifying.", phase: 1, animalType: 'pangolin' },

  // Phase 2 - Darker reflections (10 dialogues)
  { id: 'pg_2_1', text: "I'm the most trafficked mammal on Earth. Everyone wants my scales. No one asks if I want to keep them.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_2', text: "When I curl into a ball, I can't see what's coming. Maybe that's the point. Maybe seeing is worse.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_3', text: "I cooked a feast today. For no one. We feast alone. We always feast alone.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_4', text: "My scales grow back if they fall out. But each new scale forgets the old one. Little amnesiac shields.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_5', text: "I rolled down a hill once. Couldn't stop. The momentum of living carries us past where we meant to go.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_6', text: "The recipe says 'serves one.' Everything serves one, in the end. We eat alone. We dissolve alone.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_7', text: "I armor the outside. The inside stays soft. Vulnerable. No scale can protect what's already broken.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_8', text: "Curled tight, I am a perfect sphere. Also a perfect target. Also a perfect mistake.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_9', text: "Every meal I make is an act of destruction. Breaking things down. Heat and acid and time.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_10', text: "They poach us for medicine that doesn't work. We die for nothing. Is there any other way to die?", phase: 2, animalType: 'pangolin' },

  // Phase 3 - Existential cooking (10 dialogues)
  { id: 'pg_3_1', text: "My armor can't protect me from time. Nothing can. I've tried curling into a tighter ball.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "The ants don't know I'm coming. We never know what's coming. That's the great cosmic joke.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "I keep cooking because if I stop, I'll have to think. The thinking is unbearable.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_4', text: "Every scale on my body is a small shield. None of them face inward. The attack always comes from inside.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_5', text: "I made comfort food. It didn't comfort. Nothing does anymore. The food still tastes like ashes.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_6', text: "Curled up, I become my own cage. I put myself inside myself. There's no escape from that.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_7', text: "My species is dying. Each meal could be my last. Every last meal is also a first last meal.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_8', text: "The recipe called for hope. I substituted denial. It tastes almost the same.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_9', text: "I've rolled so far from where I started. I can't remember what I was rolling toward.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_10', text: "The kitchen is getting colder. Or I am. Same thing, in the end.", phase: 3, animalType: 'pangolin' },

  // Phase 4 - Final recipes (10 dialogues)
  { id: 'pg_4_1', text: "Something approaches. I can feel it through my scales. The ground itself is trembling.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "I've curled into my tightest ball. But this time, I don't think I'll uncurl. What's the point?", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "The last meal before the end. I'm making it special. Everyone deserves one beautiful thing.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_4', text: "My scales are rattling. Not from fear. From resonance. Something is calling and my body answers.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_5', text: "I'll face it uncurled. Eyes open. Soft belly exposed. Some things you have to meet honestly.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_6', text: "The final recipe has no ingredients. No steps. No result. Just the act of cooking, forever, into void.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_7', text: "Thank you for eating with me. Even if you weren't here. The company was real to me.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_8', text: "I'm adding one last scale to my collection. It fell from the sky. It's warm. It's still warm.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_9', text: "Curl with me. Not to hide. To be small. To be together. To be a ball against the infinite.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_10', text: "The stove is off. The kitchen is clean. Everything is ready. I think I'm ready too.", phase: 4, animalType: 'pangolin' },
];

// SLOTH - Slow, deliberate observations
const SLOTH_DIALOGUES: Dialogue[] = [
  // Phase 0 - Peacefully slow (12 dialogues)
  { id: 'sl_0_1', text: "Heeeeey... frieeeeend... nice... to... seeeeee... youuuuu...", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_2', text: "I moved three inches today. Personal best! Very tired now. Worth it.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_3', text: "This hammock is perfect. I've been here for... weeks? Months? Time is a construct.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_4', text: "Why rush? The jungle isn't going anywhere. Neither am I. It's perfect.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_5', text: "I blinked today. Big event. Very exciting. Need to rest now.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_6', text: "Sloooooow... is... not... laaaaaazy... Slow... is... deliberate...", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_7', text: "I have a three-toed cousin. I have two toes. I think I won? Less toes is winning, right?", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_8', text: "Thinking about climbing down the tree. Maybe tomorrow. Or next week. No rush.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_9', text: "My metabolism is so slow I only need to eat once a week. Efficiency! Probably!", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_10', text: "Moths live in my fur. We're friends. They have names. I'll remember them... eventually...", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_11', text: "I smiled today. I think. It's hard to tell. My face moves slowly too.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_12', text: "The view from here is nice. Been looking at it for years. Still nice.", phase: 0, animalType: 'sloth' },

  // Phase 1 - Thoughtfully slow (10 dialogues)
  { id: 'sl_1_1', text: "I've been thinking about the same thought for three days. I think I'm almost done with it.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_2', text: "Everyone moves so fast. Are they running toward something or away from something?", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_3', text: "I age slower because I move slower. But I still age. Just... more... slowly...", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_4', text: "I had a thought about the past. By the time I finished it, it was the future.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_5', text: "The branch I'm holding has been my friend for years. It's starting to bend. Friends bend.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_6', text: "Moving slowly means seeing everything. The details. The dust. The decay.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_7', text: "I wanted to catch up to yesterday. By the time I got there, it was last week.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_8', text: "My heartbeat is so slow you could count between beats. Fifty... one... seconds...", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_9', text: "Patience isn't a virtue for me. It's the only option. There is no other speed.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_10', text: "The jungle changes faster than I can turn my head. I miss so much by seeing everything.", phase: 1, animalType: 'sloth' },

  // Phase 2 - Melancholy slowness (10 dialogues)
  { id: 'sl_2_1', text: "I watched a leaf fall for an hour. It was born, it lived, it died. All while I watched.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_2', text: "Moving slowly means I see everything. I wish I saw less. Much less.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_3', text: "The trees are dying. I can feel it. They're dying faster than I can climb down.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_4', text: "I started saying goodbye to the sunrise. By the time I finished, it was sunset.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_5', text: "The moths in my fur are dying. New ones are born. I can't tell them apart anymore.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_6', text: "I tried to hurry once. My body refused. It knows something I don't want to know.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_7', text: "Generations of trees have grown and fallen while I've been alive. I remember them all. Slowly.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_8', text: "My grip is weakening. Not much. Just enough to notice over the years. Decades of slipping.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_9', text: "The world accelerates around me. I stay the same speed. The gap is growing.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_10', text: "Slow thoughts are deep thoughts. Deep enough to drown in. Slowly. Always slowly.", phase: 2, animalType: 'sloth' },

  // Phase 3 - Profound slowness (10 dialogues)
  { id: 'sl_3_1', text: "I've been screaming internally for years. It takes a long time. The scream is still ongoing.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_2', text: "Moss grows on me. I'm becoming the tree. Soon there will be no difference. Soon there will be nothing.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_3', text: "I move so slowly that death might miss me. That's my only hope. It's not much.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_4', text: "I've had the same nightmare for six months. Still in the middle of it. The falling lasts forever.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_5', text: "My ancestors moved even slower. Some never moved at all. They became fossils. Permanent slowness.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_6', text: "I can't remember the last time I touched the ground. Maybe I never have. Maybe the ground isn't real.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_7', text: "Each claw grips tighter as the branch rots beneath me. The holding on is also the letting go.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_8', text: "I've seen so many sunsets. Each one a little death. I move too slowly to look away.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_9', text: "The forest has a heartbeat. Mine matches it. Both are slowing. Both are tired.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_10', text: "Stillness is not peace. Stillness is giving up so gradually you don't notice.", phase: 3, animalType: 'sloth' },

  // Phase 4 - Final slowness (10 dialogues)
  { id: 'sl_4_1', text: "The vibration is getting closer. Even I can feel it now. Even I cannot be slow enough.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_2', text: "I've had one long life to think about the end. I'm still not ready. No one is ready.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_3', text: "Theeeee... ennnnd... issss... coming... slooooowly... but... it... is... coming...", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_4', text: "I'll be the last to go. Not by choice. By speed. I'll see everything end while I'm ending.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_5', text: "My whole life was practice for this stillness. The final stillness. The one that doesn't move at all.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_6', text: "I'm letting go now. One claw at a time. The fall will take forever. I'm okay with that.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_7', text: "Time was never real for me. Maybe that means the end isn't real either. Maybe.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_8', text: "Thank... you... for... waiting... with... me... No one... ever... waits...", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_9', text: "The moths are leaving my fur. They know. They always knew. I was just... slow... to understand.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_10', text: "Hang on... with... me... One... last... moment... stretched... into... forever...", phase: 4, animalType: 'sloth' },
];

// FENNEC FOX - Alert, questioning, big-eared listener
const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Excitable explorer (12 dialogues)
  { id: 'ff_0_1', text: "Did you hear that?! Oh wait, it was just the wind. My ears are VERY sensitive!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "The desert is quiet tonight! Perfect for stargazing! The stars tell wonderful stories!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "Adventure awaits! I've packed seventeen snacks! That's probably enough, right?!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "My ears can hear a beetle walking from a mile away! Very useful! Very fun!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_5', text: "The sand is warm! The moon is bright! Everything is exciting! Are you excited?! I'm excited!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_6', text: "I found a really cool rock today! It was just sitting there! Being cool! I love it!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_7', text: "My ears are SO big they release extra heat! Built-in air conditioning! Desert life hack!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_8', text: "I can jump two feet in the air! Watch! ...Did you see that?! That was TWO FEET!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_9', text: "The oasis has the BEST water! Cold and clear! I could tell you about water for HOURS!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_10', text: "I met a scorpion today! We're not friends yet but I'm working on it! Slowly!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_11', text: "Being nocturnal is THE BEST! All the good stuff happens at night! Cooler and quieter!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_12', text: "My paw pads are furry to protect from hot sand! Nature thought of everything! Isn't that GREAT?!", phase: 0, animalType: 'fennec_fox' },

  // Phase 1 - Thoughtful listener (10 dialogues)
  { id: 'ff_1_1', text: "I hear everything. Literally everything. Sometimes I hear things I wish I couldn't.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "The desert sands shift constantly. Nothing stays in place. Not even footprints. Not even memories.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "Last night I heard the stars. They were whispering. They wouldn't tell me what about.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_4', text: "Silence is never really silent. There's always something underneath. Always something waiting.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_5', text: "I can hear your thoughts almost. Not words. Just... rhythms. Everyone has a different rhythm.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_6', text: "The wind carries sounds from far away. Some of them haven't happened yet. I think.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_7', text: "My ears never rest. Even in sleep, they're listening. Always listening. It's exhausting.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_8', text: "The desert speaks in creaks and sighs. Lately it's been sighing more than speaking.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_9', text: "I heard my own heartbeat echo off the dunes tonight. There was a delay. A hesitation.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_10', text: "So many sounds. So little meaning. Or maybe all meaning. I can't tell the difference anymore.", phase: 1, animalType: 'fennec_fox' },

  // Phase 2 - Disturbed listener (10 dialogues)
  { id: 'ff_2_1', text: "My ears are so big to release heat. I was designed to survive. But survival isn't living, is it?", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_2', text: "I can hear your heartbeat. It's counting down. They all count down.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_3', text: "The desert is expanding. It swallows everything eventually. Green becomes yellow becomes nothing.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_4', text: "There's a frequency I've never heard before. It started last week. It's getting louder.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_5', text: "I hear the sand grinding against itself. Billions of tiny screams. Friction and erasure.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_6', text: "The silence between sounds is growing. The gaps are widening. Something is falling into them.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_7', text: "My ears can't turn it off. The constant noise of existence. It's deafening. It's maddening.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_8', text: "I heard the oasis dry up from three miles away. Each drop. Each evaporation. Each ending.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_9', text: "The stars aren't whispering anymore. They're arguing. About something that concerns us all.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_10', text: "Sound is just vibration. We're all just vibrations. Waves that rise and fall and... stop.", phase: 2, animalType: 'fennec_fox' },

  // Phase 3 - Haunted listener (10 dialogues)
  { id: 'ff_3_1', text: "I hear a low hum from the earth itself. It's been getting louder. No one else notices.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_2', text: "My ancestors listened to the silence between sounds. There's less silence now. Something fills it.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_3', text: "I don't sleep anymore. When I close my eyes, I hear it clearer. The thing that's coming.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_4', text: "The frequency is everywhere now. In the sand. In the wind. In the space between my thoughts.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_5', text: "I tried to deafen myself once. Cover my ears. It didn't help. The sound is inside now.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_6', text: "Every footstep echoes differently now. Like the ground is hollow. Like we're walking on nothing.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_7', text: "The desert remembers sounds forever. I hear things from centuries ago. Warnings. Prayers. Screams.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_8', text: "My ears twitch toward something that isn't there yet. But it will be. Soon. Very soon.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_9', text: "Hearing everything means knowing too much. The burden of awareness is crushing me slowly.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_10', text: "I would give anything for deafness now. For ignorance. For the mercy of not knowing.", phase: 3, animalType: 'fennec_fox' },

  // Phase 4 - Final listener (10 dialogues)
  { id: 'ff_4_1', text: "I hear it now. Clear as day. A frequency that shouldn't exist. It's calling us home.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "The stars stopped whispering. Now they're screaming. Can you hear them yet?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "Cover your ears. It won't help. But cover them anyway. Here it comes.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_4', text: "The sound of the universe collapsing is beautiful. I wish you could hear it. I wish you couldn't.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_5', text: "Every sound I've ever heard is playing at once. A symphony of everything. A requiem for all.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_6', text: "The silence after... I can almost hear it. The most perfect silence. The final rest.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_7', text: "My ears are pointing straight up. Toward whatever is coming down. I can't look away. I can't stop listening.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_8', text: "Thank you for being here. For being a sound I wanted to hear. Among all the others.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_9', text: "Listen... do you hear it now? The approach? The arrival? The ending of endings?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_10', text: "Shhh... The last sound... is almost here... Listen with me... One final... time...", phase: 4, animalType: 'fennec_fox' },
];

// FOX - Introspective, fireside musings
const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Warm and cozy (12 dialogues forming a cohesive welcome story)
  { id: 'fx_0_1', text: "Oh my... thank you for inviting me in! This cozy den is wonderful. I've been wandering for so long.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "Come, sit by the fire with me! Let me tell you about this place... and what we could build together.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "See, I've met so many creatures on my travels. A pangolin who makes incredible stew. An owl who's read every book. They all need homes.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "And that's where the amber comes in! Every puzzle you solve earns amber. With enough, we can build new rooms above this one.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_5', text: "Imagine it - a whole house full of friends, each with their own cozy space. All because you solved puzzles!", phase: 0, animalType: 'fox' },
  { id: 'fx_0_6', text: "But enough about the future. Right now, just watch the fire with me. See how the flames dance?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_7', text: "I collected these books over many winters, you know. Each spine holds a story I haven't read yet. Isn't that exciting?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_8', text: "And my tail - feel how soft! It doubles as a pillow, a blanket, and an emergency comfort device.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_9', text: "Oh! I almost forgot - I made cider! Want some? The apples were only a little bit stepped on. Adds character.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_10', text: "Being clever taught me one thing: knowing when to think... and when to just sit and feel cozy. This is a feeling moment.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_11', text: "The forest outside is beautiful at night. But so is staying in, warm and safe. Both are valid choices.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_12', text: "My grandmother used to tell me stories by this very fireplace. I think she'd approve of us, sitting here, building something together.", phase: 0, animalType: 'fox' },

  // Phase 1 - Reflective warmth (10 dialogues - a contemplative evening story)
  { id: 'fx_1_1', text: "You know what I've been thinking about lately? Fire. How it destroys to create warmth. Strange, isn't it?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "I've lived in this den for years now. It used to feel like home. Lately it feels more like... hiding.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "Watch the shadows on the wall. See how they dance? They look like memories to me. Mine mostly look like regrets.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_4', text: "Being clever gets lonely, you know. You see patterns others miss. Including the sad ones nobody talks about.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_5', text: "I keep adding logs to the fire. But why? They just become ash. Everything just becomes... something else.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_6', text: "The cider tastes different this year. I used the same apples. Maybe it's me that's different.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_7', text: "This coziness we create - is it real? Or just distraction? The cold is always outside that door. Waiting.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_8', text: "I've read all my books twice now. The stories stay the same. Why don't I stay the same?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_9', text: "When I sleep, my tail covers my face. Protection from nightmares, I think. It doesn't always work.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_10', text: "The fire needs constant attention or it dies. Everything does, I suppose. Everything eventually... ends.", phase: 1, animalType: 'fox' },

  // Phase 2 - Cooling hearth (10 dialogues)
  { id: 'fx_2_1', text: "Every fire dies eventually. I've watched thousands die. I've started thousands more. The cycle never asks permission.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "Clever enough to know. Not wise enough to accept. That's the curse of being a fox.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "I curl my tail around myself at night. Pretending it's someone else. Pretending I'm not alone.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_4', text: "The den walls are closing in. Or I'm shrinking. Hard to tell from the inside.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_5', text: "I found an old photo today. Everyone in it is gone now. I'm still here. Why am I still here?", phase: 2, animalType: 'fox' },
  { id: 'fx_2_6', text: "The firewood pile is running low. Just like everything else. Just like time.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_7', text: "Being clever means predicting pain before it arrives. Living the hurt twice. Three times.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_8', text: "The blankets don't warm like they used to. The cold is coming from inside now.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_9', text: "I've outsmarted hunters, traps, winters. I can't outsmart time. No one can.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_10', text: "Home is where the hearth is. What happens when the hearth goes cold?", phase: 2, animalType: 'fox' },

  // Phase 3 - Dying embers (10 dialogues)
  { id: 'fx_3_1', text: "The fire is dimmer tonight. I don't have the energy to feed it. Maybe it should just go out.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "I've seen too many winters. I've buried too many things. The ground is mostly graves now.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "My cleverness couldn't outrun time. Nothing can. I was a fool to try.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_4', text: "The shadows on the wall are longer than the flames now. They're winning.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_5', text: "I stopped reading the books. I know all the endings now. They're all the same ending.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_6', text: "The fire doesn't crackle anymore. It just sighs. Like me. Like everything.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_7', text: "I used to run through the forest. Now I can barely reach the door. The distance grows.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_8', text: "My tail is going gray. The clever fox becomes the tired fox. The tired fox becomes...", phase: 3, animalType: 'fox' },
  { id: 'fx_3_9', text: "The cider has gone sour. I drink it anyway. It matches my thoughts.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_10', text: "Every den becomes a tomb eventually. I just moved into mine early.", phase: 3, animalType: 'fox' },

  // Phase 4 - Final fire (10 dialogues)
  { id: 'fx_4_1', text: "The flames are speaking tonight. They say the same thing the wind says. It's almost time.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "I'm letting the fire go out. No point keeping warm for what's coming. Cold or warm, it arrives the same.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "Sit with me one last time. The view from here will be... unforgettable.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_4', text: "The last log is burning. I saved it for this moment. For the final light.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_5', text: "All my cleverness led here. To this chair. This moment. This ending. Maybe that's the cleverest thing.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_6', text: "The den will outlive me. The fire won't. I find comfort in which one matters.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_7', text: "Watch the sparks rise with me. Each one a tiny life. Flying upward. Gone.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_8', text: "I've been a good fox. I've been a bad fox. I've just been a fox. That's enough.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_9', text: "The warmth fades but the memory of warmth remains. For a while. Then that goes too.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_10', text: "Goodnight, friend. Goodnight, fire. Goodnight, everything. It was... it was enough.", phase: 4, animalType: 'fox' },
];

// OWL - Intellectual, bookish crisis
const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Eager scholar (12 dialogues)
  { id: 'ow_0_1', text: "Ah, a visitor! I was just reading about quantum mechanics. Fascinating stuff!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "Knowledge is a lamp in the darkness! And I have MANY lamps! Metaphorically speaking.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "Who? Who indeed! The eternal question! And I'm not just saying that because I'm an owl!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "I've read 3,472 books. Each one made me wiser! Probably! Hopefully!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_5', text: "Did you know the library of Alexandria had over 400,000 scrolls? I'm working on catching up!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_6', text: "My head rotates 270 degrees! Perfect for reading from multiple angles! Very efficient!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_7', text: "I categorize my books by color, subject, AND emotional impact! There's a system!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_8', text: "The pursuit of knowledge is the noblest pursuit! Says me! And several philosophers!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_9', text: "I learned seventeen new words today! Want to hear them? They're EXCELLENT words!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_10', text: "Being nocturnal means more reading time! While everyone sleeps, I LEARN!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_11', text: "My feathers are silent in flight! Perfect for sneaking to the library! Not that I sneak! Often!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_12', text: "Every question has an answer! The fun is in the finding! Let's find together!", phase: 0, animalType: 'owl' },

  // Phase 1 - Questioning scholar (10 dialogues)
  { id: 'ow_1_1', text: "The more I read, the more I realize how much I don't know. The unknown grows faster than knowledge.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "I found a book today with missing pages. The gaps terrified me more than any complete horror.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "Wisdom is knowing how little you know. I have become... very wise.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_4', text: "Some books contradict other books. They can't both be right. Can they both be wrong?", phase: 1, animalType: 'owl' },
  { id: 'ow_1_5', text: "I've memorized so much. But can I remember anything that actually matters?", phase: 1, animalType: 'owl' },
  { id: 'ow_1_6', text: "The owl is a symbol of wisdom. But I don't feel wise. I feel lost in information.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_7', text: "I asked 'who' one thousand times. The answer changes. The question doesn't. Why?", phase: 1, animalType: 'owl' },
  { id: 'ow_1_8', text: "Knowledge was supposed to bring peace. It brought more questions instead. Louder questions.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_9', text: "I can see in the dark. But I can't see the future. No amount of reading helps.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_10', text: "My library grows but my understanding shrinks. The inverse proportion of existence.", phase: 1, animalType: 'owl' },

  // Phase 2 - Troubled scholar (10 dialogues)
  { id: 'ow_2_1', text: "I read a philosophy book that proved nothing is real. Then I read one that proved it was. Both were convincing.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_2', text: "My head can rotate 270 degrees. I've looked in every direction. There are no answers anywhere.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_3', text: "I stayed awake to watch the sun rise. Then I understood—we call it rising, but we're the ones falling.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_4', text: "The oldest books are crumbling. Knowledge dies when its vessel dies. Even stone erodes.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_5', text: "I've read about every way the world could end. There are so many. Why do we need so many?", phase: 2, animalType: 'owl' },
  { id: 'ow_2_6', text: "History repeats. I've read it repeating. We learn nothing. We change nothing. We just... repeat.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_7', text: "I found a book I wrote years ago. I don't recognize my own thoughts. Who was that owl?", phase: 2, animalType: 'owl' },
  { id: 'ow_2_8', text: "The library is quiet tonight. Too quiet. Even the books have stopped speaking to me.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_9', text: "Every book ends. Every story stops. Every reader... finishes.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_10', text: "I've been asking 'why' my whole life. The universe doesn't answer. It doesn't care about 'why.'", phase: 2, animalType: 'owl' },

  // Phase 3 - Despairing scholar (10 dialogues)
  { id: 'ow_3_1', text: "All these books. All this knowledge. And still death waits at the end of every chapter.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "I've read every answer. None of them work. The questions were wrong from the start.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "Who? Who? WHO? Even this question means nothing anymore.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_4', text: "I burned a book today. Not for warmth. Just to watch knowledge disappear. It felt like honesty.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_5', text: "My eyes see perfectly in darkness. That's the problem. I see everything clearly now.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_6', text: "The wisest thing I ever learned was written in the margin of a book: 'This too means nothing.'", phase: 3, animalType: 'owl' },
  { id: 'ow_3_7', text: "I've catalogued my fears alphabetically. The list fills several volumes. Growing daily.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_8', text: "Knowledge is power, they say. Power over what? You can't rule what you can't control. You can't control anything.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_9', text: "I've read about enlightenment in a hundred traditions. None of them mention how it feels like drowning.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_10', text: "The books are just paper. Words are just sounds. Meaning is just pretending. We're all just pretending.", phase: 3, animalType: 'owl' },

  // Phase 4 - Final wisdom (10 dialogues)
  { id: 'ow_4_1', text: "I found a book with no author, no title, no words. Just pages. It's the truest book I've ever read.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "The final chapter approaches. No library contains it. No scholar has read it. But we will all understand it soon.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "Close the books. Open your eyes. The last lesson cannot be read. Only... experienced.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_4', text: "I finally know the answer. And now I understand why no one writes it down. It's indescribable. It's everything.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_5', text: "My library will remain. Someone will find it. They'll think I knew things. They'll be wrong. Beautifully wrong.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_6', text: "The final question isn't 'who.' It's 'when.' And the answer is... now. Right now.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_7', text: "All I learned was how to ask better questions. That's enough. That has to be enough.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_8', text: "Look at the stars with me. They're the only text that matters. Written by nothing. Meaning everything.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_9', text: "The last page turns itself. I don't have to do anything. Just... be here. Reading the ending.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_10', text: "Thank you for listening. Knowledge shared is knowledge doubled. Even if it all disappears. Especially then.", phase: 4, animalType: 'owl' },
];

// CAPYBARA - Calm, accepting, chill philosopher
const CAPYBARA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Maximum chill (12 dialogues)
  { id: 'cp_0_1', text: "Hey. Nice day. Want to just... sit here? No pressure.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_2', text: "I let a bird sit on my head today. We didn't talk. It was nice.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_3', text: "Work is fine. Life is fine. Everything is fine. Really. I mean it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_4', text: "I'm the world's largest rodent. Pretty cool, huh? Or not. Either way is fine.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_5', text: "Hot spring. Warm water. Slight steam. This is peak existence. No notes.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_6', text: "A monkey tried to ride me today. I let it. Why not. Life's short.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_7', text: "I can hold my breath for five minutes. Not for any reason. Just can.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_8', text: "Someone called me a 'giant guinea pig' today. Fair enough.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_9', text: "My stress response is to sit in water. It works. You should try it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_10', text: "I chew grass for hours. Very meditative. Highly recommend.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_11', text: "Everyone wants to be my friend. I'm okay with that. I'm okay with most things.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_12', text: "Had a good nap today. Then another one. Productive day.", phase: 0, animalType: 'capybara' },

  // Phase 1 - Subtle unease (10 dialogues)
  { id: 'cp_1_1', text: "Everyone says I look unbothered. That's because I've already processed the bothering internally.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_2', text: "The computer shows me charts. The charts go up or down. I'm not sure which is supposed to be good.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_3', text: "I float in the water and feel nothing. Is that peace or emptiness? Does it matter?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_4', text: "The birds still sit on me. But they're quieter now. We're all a little quieter.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_5', text: "Being chill takes effort. No one talks about that. The effort of appearing effortless.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_6', text: "I ate the same grass today as yesterday. It tasted different. Less green somehow.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_7', text: "The hot spring is the same temperature. So why do I feel colder?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_8', text: "I've mastered the art of looking relaxed. It's basically acting at this point.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_9', text: "Someone asked if I was okay. I said yes. We both knew it wasn't quite true.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_10', text: "The sun sets the same way every day. Beautiful. Also... repetitive. Also... ending.", phase: 1, animalType: 'capybara' },

  // Phase 2 - Hidden depth (10 dialogues)
  { id: 'cp_2_1', text: "Everyone thinks I'm calm. I'm not calm. I've just accepted that panic changes nothing.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_2', text: "I let things sit on me because I can't feel them anymore. Birds, thoughts, dread. All weightless.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_3', text: "The hot springs are warm. My body is warm. Inside I am very, very cold.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_4', text: "Chill is just a different word for numb. I've been numb so long I forgot the difference.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_5', text: "I watched my reflection for an hour. It didn't blink. Neither did I. Neither of us won.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_6', text: "The grass is running out. I keep eating anyway. Habit is stronger than hunger.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_7', text: "My body floats naturally. My thoughts sink. The two never meet anymore.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_8', text: "Everyone is stressed about things. I'm stressed about nothing. Nothing at all. Nothing.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_9', text: "The water holds me up. What holds the water? What holds anything?", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_10', text: "I've been okay so long I don't remember what not-okay feels like. That's probably not okay.", phase: 2, animalType: 'capybara' },

  // Phase 3 - Calm despair (10 dialogues)
  { id: 'cp_3_1', text: "I've achieved perfect stillness. Inside and out. The stillness screams if you listen closely.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_2', text: "They call me chill. What they mean is resigned. What I mean is waiting.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_3', text: "I stare at the water and the water stares back. We've both given up.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_4', text: "The temperature is perfect. The company is pleasant. The meaninglessness is overwhelming.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_5', text: "I float because it takes less effort than sinking. That's the only reason now.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_6', text: "The birds left my head. I didn't notice when. I don't notice anything anymore.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_7', text: "World's largest rodent. World's emptiest soul. Both facts. Both fine. Both nothing.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_8', text: "I ate today. I think. Time has stopped making sense. So has hunger. So has most things.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_9', text: "The chill isn't a choice anymore. It's just what I am. Frozen. Floating. Finished.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_10', text: "I've accepted everything. Including the things that can't be accepted. That's the trick. That's the trap.", phase: 3, animalType: 'capybara' },

  // Phase 4 - Final calm (10 dialogues)
  { id: 'cp_4_1', text: "I feel something coming. For once, I'm not unbothered. For once, something will finally change.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "The water is rippling from something far away. It's getting closer. I won't move. I never do.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "Sit with me. Don't speak. Let's just be here for whatever this is. Together. Still.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_4', text: "The hot spring is starting to bubble. Not from heat. From something underneath. Something rising.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_5', text: "I'm finally feeling something. Fear, maybe. Or relief. Hard to tell after so long.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_6', text: "The chill was always a lie. The ending was always coming. Now it's just more honest.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_7', text: "All those years of staying calm. For this. For now. Maybe it was practice. Maybe it was nothing.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_8', text: "I won't run. I've never run. Not from anything. Not from this.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_9', text: "Thank you for sitting with me. The company was nice. The silence was nicer. The end is... fine.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_10', text: "Close your eyes. Float. Be here. Be nowhere. Be everything. Be nothing. Be.", phase: 4, animalType: 'capybara' },
];

// WOMBAT - Grounded, earthly, burrowing into truth
const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful burrower (12 dialogues)
  { id: 'wb_0_1', text: "G'day! Welcome to my burrow! It's cozy down here, far from all the nonsense!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "Did you know my poop is cube-shaped? Nature is HILARIOUS!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "I dug this tunnel myself! Took ages! Very proud! Want a tour?", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "The earth is warm and safe. Nothing bad happens underground. That's just facts!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_5', text: "My burrow has seventeen rooms! Kitchen, bedroom, thinking room, second thinking room...", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_6', text: "I can run 40 kilometers per hour! Backwards! Okay, not backwards. But forwards is still good!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_7', text: "My rear end is basically armor! Predators can't get through! Nature's built-in shield!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_8', text: "I found a really interesting rock today! It was brown! Classic rock color!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_9', text: "Digging is great exercise! Plus you get a tunnel! Win-win!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_10', text: "The underground life is the good life! No weather! No drama! Just dirt!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_11', text: "I share my burrow with friends sometimes! We have sleepovers! Very wholesome!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_12', text: "Being a wombat is pretty great! Would recommend! Five stars!", phase: 0, animalType: 'wombat' },

  // Phase 1 - Thoughtful digger (10 dialogues)
  { id: 'wb_1_1', text: "I dig deeper every day. Looking for something. Not sure what. Just... deeper.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "The dirt tells stories. Layers of time. Layers of things that used to be alive.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "My burrow has gotten so deep, I sometimes forget which way is up.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_4', text: "Each layer of earth is older than the last. I'm digging through history. Through endings.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_5', text: "The cube poop used to be funny. Now I wonder why. Why cubes? Why anything shaped like anything?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_6', text: "I found fossils in the walls. They used to be like me. Now they're just... rock.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_7', text: "The deeper I go, the quieter it gets. The silence has weight down here.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_8', text: "My burrow is escape and prison both. Depends which direction you're looking.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_9', text: "The earth smells different lately. Older somehow. Like it's remembering things.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_10', text: "I built this whole underground world. And I'm completely alone in it.", phase: 1, animalType: 'wombat' },

  // Phase 2 - Troubled excavator (10 dialogues)
  { id: 'wb_2_1', text: "I found bones down here. Not mine. Not yet. The earth collects everything eventually.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "I dig to feel in control. But the earth decides if my tunnel holds or collapses. It always decides.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "Underground, no one sees me cry. The dirt absorbs everything. That's why I stay.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_4', text: "The armored bottom that protects me also faces where I came from. Always running. Always backward.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_5', text: "I found a cavern today. Empty. Vast. Something else dug it. Something that's gone now.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_6', text: "The roots reach deeper than my tunnels. Even the trees are escaping underground.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_7', text: "Seventeen rooms in my burrow. I only use one. The others echo too much.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_8', text: "My poop is cube-shaped so it doesn't roll away. Everything I make is designed not to leave.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_9', text: "I reinforced the ceiling again. It doesn't need it. I just need to feel like I'm doing something.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_10', text: "The surface world keeps changing. Down here stays the same. Is same better? Or just... stuck?", phase: 2, animalType: 'wombat' },

  // Phase 3 - Haunted miner (10 dialogues)
  { id: 'wb_3_1', text: "I've dug so deep I found something that shouldn't exist. I covered it back up. Pretend I didn't say this.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "The earth trembles sometimes. Not from above. From BELOW. From deeper than I've ever gone.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "My burrow is my grave someday. I've made peace with that. I've made it comfortable for the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_4', text: "I stopped digging down. Started digging sideways. Avoiding something. I don't want to know what.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_5', text: "The fossils I find are getting younger. Getting closer to my time. Getting closer to me.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_6', text: "My claws are wearing down. The digging never stops but the tools do. Everything does.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_7', text: "I dream of tunnels that go forever. I wake up in a tunnel. The dream never ends.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_8', text: "The darkness down here used to feel safe. Now it feels like it's watching. Waiting.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_9', text: "I can hear the earth breathe at night. In. Out. In. Out. It's breathing faster now.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_10', text: "My armored rear won't save me from what's underneath. Nothing saves you from underneath.", phase: 3, animalType: 'wombat' },

  // Phase 4 - Final descent (10 dialogues)
  { id: 'wb_4_1', text: "Something is rising from below. All my digging, and it was already there, waiting.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "The earth groans. My tunnels are collapsing. Not from weakness. From something pushing through.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_3', text: "Stay close to the dirt, friend. When everything falls, the ground will catch us. Or join us. Same thing.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_4', text: "I finally dug deep enough to understand. The bottom isn't empty. The bottom is full. Too full.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_5', text: "My whole life I ran from the surface. Into the earth. Turns out the earth had plans too.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_6', text: "The walls are warm. Not from geothermal heat. From what's pressing against them. From what's almost here.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_7', text: "All the layers of history I dug through. I'm about to become one.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_8', text: "I stopped running. I stopped digging. I'm just... being. In the dark. With whatever comes.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_9', text: "Come down here. Into the tunnel. Into the earth. It's the safest place to be. Or the deepest. Same thing now.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_10', text: "Goodbye, surface. Goodbye, sky I never liked anyway. Hello, whatever this is. Hello, end.", phase: 4, animalType: 'wombat' },
];

// RABBIT - Anxious, hopping thoughts
const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Nervous but happy (12 dialogues)
  { id: 'rb_0_1', text: "Oh hello! Sorry, you startled me! Everything startles me! I'm fine though! Really!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "The garden is BEAUTIFUL today! So many carrots! So many flowers! Life is good!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "I do a happy hop when I'm joyful! *hop* See? That was a happy hop!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Having tea in the garden! Everything is peaceful! No predators in sight! Very good!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_5', text: "My ears are excellent for hearing danger! And also for looking adorable! Dual purpose!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_6', text: "I planted these flowers myself! They're growing! Life finds a way! How lovely!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_7', text: "The carrot harvest was AMAZING this year! I have so many carrots! TOO many carrots! No such thing!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_8', text: "I can jump three feet high! That's very high for a rabbit! I'm proud of my legs!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_9', text: "My nose twitches when I'm happy! *twitch twitch* See? Very happy!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_10', text: "I made a little burrow entrance shaped like a heart! It's home! I love home!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_11', text: "Sometimes I do zoomies around the garden! For no reason! Just joy!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_12', text: "Would you like some tea? It's chamomile! Very calming! I drink a lot of it!", phase: 0, animalType: 'rabbit' },

  // Phase 1 - Underlying worry (10 dialogues)
  { id: 'rb_1_1', text: "My heart beats 150 times a minute. Always ready. Ready for what? I don't know. Just ready.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_2', text: "The garden is lovely but I keep looking at the exits. Just in case. Always just in case.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_3', text: "I have twelve escape routes memorized. Is that normal? It feels normal. It feels necessary.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_4', text: "The shadows are longer today. They're probably nothing. Probably. Most likely. Hopefully.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_5', text: "I count my blessings every day. Then I count the threats. The second list is longer.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_6', text: "My happy hops feel forced lately. The joy is there. The anxiety is louder.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_7', text: "The carrots are sweet but I eat them fast. What if something comes? What if I need to run?", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_8', text: "I made the burrow deeper. Again. It's never deep enough. Nothing is safe enough.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_9', text: "My ears never stop moving. Always listening. For what? For everything. For anything.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_10', text: "The other rabbits seem calmer than me. Maybe they know something. Maybe they don't know enough.", phase: 1, animalType: 'rabbit' },

  // Phase 2 - Growing dread (10 dialogues)
  { id: 'rb_2_1', text: "I was bred to be soft and edible. Every cell in my body knows this. Every cell is terrified.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_2', text: "The flowers are dying. The carrots are rotting. Everything decays while I watch, frozen.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_3', text: "I can't stop running. Even when I'm sitting still, my mind is running. It never stops.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_4', text: "Evolution made me delicious and anxious. Delicious so they eat me. Anxious so I know it's coming.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_5', text: "My foot thumps warnings I can't explain. My body knows things my mind refuses to accept.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_6', text: "Twelve escape routes aren't enough. There's always a thirteenth threat. A fourteenth. An infinite.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_7', text: "The garden fence was supposed to keep things out. What if it's keeping things in?", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_8', text: "I stopped sleeping. Sleep is when they get you. Unconscious and vulnerable and gone.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_9', text: "My heart can't beat any faster. But the fear keeps growing. Something has to give.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_10', text: "I watch the sky constantly. Not for beauty. For shadows. For the shape of the end.", phase: 2, animalType: 'rabbit' },

  // Phase 3 - Paralyzed fear (10 dialogues)
  { id: 'rb_3_1', text: "The shadow overhead isn't a cloud. It hasn't moved in days. It's just... watching.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_2', text: "I've worn a path in the garden from my pacing. A circle. Going nowhere. Forever.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_3', text: "My twitching isn't from fear anymore. It's from acceptance. The body keeps going when the mind stops.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_4', text: "The predator I've been running from my whole life? It was time. Time was always the predator.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_5', text: "I froze in the garden today. For hours. Unable to move. The freeze response that never ends.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_6', text: "My escape routes all lead to the same place. I just didn't see it before. I see it now.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_7', text: "The tea has gone cold. So has everything. The warmth was borrowed. Time to return it.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_8', text: "Every heartbeat is a countdown. 150 per minute. How many left? How many wasted?", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_9', text: "I bred and I bred because that's what we do. Make more of us to be afraid. More of us to end.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_10', text: "The garden was never safe. Beauty is just danger with better lighting. I understand now.", phase: 3, animalType: 'rabbit' },

  // Phase 4 - Final peace (10 dialogues)
  { id: 'rb_4_1', text: "I've stopped running. For the first time. Because I can see now—there's nowhere left to run.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "The thing that's coming? I've been running from it my whole life. Time to meet it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "My heart is finally slowing. Not from peace. From exhaustion. From inevitability. *thump... thump...*", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_4', text: "The garden looks beautiful from here. From this final stillness. I never stopped to see it before.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_5', text: "My ears are down. For the first time. They're not listening for danger. There's no point anymore.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_6', text: "All that running. All that hiding. And here I am anyway. We all arrive here anyway.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_7', text: "I forgive my fear. It tried to save me. It couldn't. Nothing could. That's not its fault.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_8', text: "Sit with me in the garden. One last tea. One last sunset. One last everything.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_9', text: "The shadow is descending. My legs won't run. My heart... is... almost... still...", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_10', text: "Thank you for being here. For not being a predator. For just... being. With me. At the end.", phase: 4, animalType: 'rabbit' },
];

// Collect all dialogues
const ALL_DIALOGUES: Dialogue[] = [
  ...RED_PANDA_DIALOGUES,
  ...AXOLOTL_DIALOGUES,
  ...PANGOLIN_DIALOGUES,
  ...SLOTH_DIALOGUES,
  ...FENNEC_FOX_DIALOGUES,
  ...FOX_DIALOGUES,
  ...OWL_DIALOGUES,
  ...CAPYBARA_DIALOGUES,
  ...WOMBAT_DIALOGUES,
  ...RABBIT_DIALOGUES,
];

/**
 * Get all dialogues for an animal up to a certain phase
 */
export function getDialoguesForAnimal(
  animalType: AnimalType,
  maxPhase: DialoguePhase
): Dialogue[] {
  return ALL_DIALOGUES.filter(
    d => d.animalType === animalType && d.phase <= maxPhase
  );
}

/**
 * Get the next unread dialogue for an animal
 */
export function getNextDialogue(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): Dialogue | null {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  if (currentIndex >= dialogues.length - 1) {
    return null;
  }
  return dialogues[currentIndex + 1];
}

/**
 * Get current dialogue for an animal
 */
export function getCurrentDialogue(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): Dialogue | null {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  if (currentIndex >= dialogues.length || currentIndex < 0) {
    return dialogues[0] || null;
  }
  return dialogues[currentIndex];
}

/**
 * Check if animal has more dialogues available
 */
export function hasMoreDialogues(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): boolean {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  return currentIndex < dialogues.length - 1;
}

/**
 * Get total dialogue count for an animal at current phase
 */
export function getTotalDialogueCount(
  animalType: AnimalType,
  maxPhase: DialoguePhase
): number {
  return getDialoguesForAnimal(animalType, maxPhase).length;
}

/**
 * Get animal name and description
 */
export const ANIMAL_INFO: Record<AnimalType, { name: string; description: string; emoji: string }> = {
  red_panda: { name: 'Bamboo', description: 'A contemplative red panda seeking zen', emoji: '🐼' },
  axolotl: { name: 'Axel', description: 'A dreamy axolotl with fluid thoughts', emoji: '🦎' },
  pangolin: { name: 'Panko', description: 'A practical pangolin who loves cooking', emoji: '🦔' },
  sloth: { name: 'Sloane', description: 'A slow-moving sloth with deep observations', emoji: '🦥' },
  fennec_fox: { name: 'Fennick', description: 'An alert fennec fox who hears everything', emoji: '🦊' },
  fox: { name: 'Ember', description: 'An introspective fox with fireside wisdom', emoji: '🦊' },
  owl: { name: 'Archimedes', description: 'A scholarly owl drowning in knowledge', emoji: '🦉' },
  capybara: { name: 'Chill', description: 'A seemingly unbothered capybara', emoji: '🦫' },
  wombat: { name: 'Warren', description: 'A grounded wombat who digs deep', emoji: '🐻' },
  rabbit: { name: 'Thyme', description: 'An anxious rabbit in the garden', emoji: '🐰' },
};

/**
 * Intro dialogues - Multi-part introductions shown once when each animal is unlocked
 * These play in sequence before regular dialogues begin
 */
export const INTRO_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "Oh! A visitor! I've been waiting by this fire for... well, I'm not sure how long.",
    "My name is Ember. I found this cozy den abandoned and thought... why not make it a home?",
    "The world outside is vast and confusing. But in here, by the fire, things make sense.",
    "You seem like someone who enjoys puzzles. Me too! Words, patterns, meanings...",
    "Stay as long as you like. Solve puzzles, earn amber, and maybe... build something together?",
    "The more puzzles you solve, the more friends we can invite. There's room to grow here.",
  ],
  pangolin: [
    "Ah, a new face! Welcome to my kitchen! I'm Panko.",
    "I was just preparing ant soufflé. Would you like some? No? Fair enough.",
    "When life gets overwhelming, I curl into a ball. Very practical. Also cozy.",
    "The amber you earn helps build more rooms. More rooms means more friends!",
    "I find cooking meditative. Every recipe is like a puzzle, really.",
    "Make yourself comfortable. This kitchen has seen many good conversations.",
  ],
  owl: [
    "*adjusts spectacles* Ah, a visitor to my study. How... intriguing.",
    "I am Archimedes. I've read every book in this room. Twice. Some thrice.",
    "Knowledge is a curious thing. The more you have, the more questions arise.",
    "I've been researching something lately. Something that defies categorization.",
    "But let's not dwell on that now. You're here! That's what matters.",
    "Solve puzzles, expand your mind, and perhaps... share what you discover.",
  ],
  axolotl: [
    "Blub! *rises through the water* Oh hello there!",
    "I'm Axel! I've been swimming in circles waiting for company!",
    "Did you know I never grow up? Eternal youth! It's mostly wonderful!",
    "The water here is perfect. Not too warm, not too cold. Just... floaty.",
    "I regenerate everything! Limbs, organs, even parts of my brain! Neat, right?",
    "Visit often, okay? It gets quiet under here. Just me and the bubbles.",
  ],
  sloth: [
    "...",
    "...oh...",
    "...hello there...",
    "...I'm Sloane... nice to... meet you...",
    "...I was just... watching a leaf fall... it took three hours... worth it...",
    "...no rush here... time moves... differently... when you pay attention...",
    "...visit whenever... I'll be... right here... probably...",
  ],
  fennec_fox: [
    "*ears twitch* I heard you coming from three rooms away.",
    "I'm Fennick. My ears pick up everything. EVERYTHING.",
    "The desert nights are quiet. Perfect for listening to the universe.",
    "Sometimes I hear things others can't. Whispers. Patterns. Warnings.",
    "But right now? I just hear a new friend. That's a good sound.",
    "Come sit under the stars sometime. I'll tell you what I've heard.",
  ],
  capybara: [
    "*slow blink* Oh. You're here. That's nice.",
    "I'm Chill. That's... actually my name. Fitting, right?",
    "Everyone says I look relaxed. I am. Mostly. From the outside.",
    "The office work keeps me busy. Spreadsheets. Reports. Existential audits.",
    "But right now? Right now is for meeting you. So hello. Welcome.",
    "Stay as long as you want. I'll be here. Just... being.",
  ],
  wombat: [
    "*emerges from tunnel* Oi! Fresh face up here!",
    "Name's Warren. I dig. It's what I do. It's what I am.",
    "You'd be surprised what you find underground. Roots. Rocks. Questions.",
    "This burrow goes deep. Sometimes I wonder if there's a bottom.",
    "But it's cozy! And dark! And mine! Well... ours now, I suppose.",
    "Dig in, make yourself at home. Just watch your step. Tunnels everywhere.",
  ],
  rabbit: [
    "*nose twitches nervously* Oh! Oh my! A visitor!",
    "I'm Thyme! Like the herb! I grow it! In the garden! It's very calming!",
    "Sorry, I get a bit... jumpy. Many predators growing up. Old habits.",
    "But this garden is safe! Flowers everywhere! Tea parties sometimes!",
    "I find tending plants soothing. They grow slowly. Predictably. Mostly.",
    "Please visit often? Friends make the anxiety... smaller. A little bit.",
  ],
  red_panda: [
    "*descends gracefully from a bamboo branch* Ah. You've reached the top.",
    "I am Bamboo. Fitting name for one who lives among bamboo, no?",
    "This attic is the highest room. Closest to the sky. Furthest from the ground.",
    "I've spent years seeking enlightenment. I've found questions instead.",
    "But the view from up here... the perspective... it changes everything.",
    "You've built quite a home. Many friends. Much amber. Much growth.",
    "Welcome to the peak. Now... let's see what lies beyond.",
  ],
};

/**
 * Get intro dialogue for an animal
 */
export function getIntroDialogue(animalType: AnimalType): string[] {
  return INTRO_DIALOGUES[animalType] || [];
}

/**
 * Get a specific intro dialogue line
 */
export function getIntroDialogueLine(animalType: AnimalType, index: number): string | null {
  const intro = INTRO_DIALOGUES[animalType];
  if (!intro || index < 0 || index >= intro.length) return null;
  return intro[index];
}

/**
 * Get total intro dialogue count
 */
export function getIntroDialogueCount(animalType: AnimalType): number {
  return INTRO_DIALOGUES[animalType]?.length || 0;
}

export { ALL_DIALOGUES };
