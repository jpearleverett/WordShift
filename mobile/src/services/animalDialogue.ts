import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from contentment to existential crisis
 * 56 dialogues per animal to support extended dialogue sessions
 */

// RED PANDA (Bamboo) - Zen practitioner whose enlightenment leads to unsettling truths
const RED_PANDA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Peaceful and present (12 dialogues)
  { id: 'rp_0_1', text: "Ah, you found your way here. The bamboo grove has good energy today.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_2', text: "Listen... hear how the wind moves through the leaves? That's the forest breathing.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_3', text: "My tail is particularly fluffy this morning. Small victories matter.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_4', text: "The dew on bamboo leaves catches light like scattered diamonds. Nature decorates for free.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_5', text: "We red pandas existed millions of years before our giant cousins. Patience runs in the family.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_6', text: "Climbed up the old pine today. Climbed back down. Both directions held their own beauty.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_7', text: "Seven face-washes before breakfast. Cleanliness prepares the mind for what comes.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_8', text: "There's a sunbeam in my favorite meditation spot. It moves, but so do I. We meet in the middle.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_9', text: "The mountain sends messages through the wind. Today it simply said hello.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_10', text: "Made a nest of fresh bamboo leaves. Smells like green. Smells like now.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_11', text: "Some call us 'firefoxes.' Others say 'bearcat.' Names are just sounds we agree on.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_12', text: "Each puzzle you solve ripples outward. The universe notices, in its way.", phase: 0, animalType: 'red_panda' },

  // Phase 1 - Curious, gently philosophical (14 dialogues)
  { id: 'rp_1_1', text: "Watched the clouds for an hour. Not one repeated its shape. Strange, isn't it?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_2', text: "The bamboo grows without hurrying. It doesn't check how tall it's become.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_3', text: "Sometimes the puzzles feel like they're solving something in us. Not the other way around.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_4', text: "Tried counting stars last night. Lost my place somewhere around... all of them.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_5', text: "My reflection in the stream lags behind my movements. Just a moment. Just enough to notice.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_6', text: "Same bamboo, different taste each morning. Am I changing, or is it? Does the difference matter?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_7', text: "Asked the mountain why it stays so still. The silence was answer enough.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_8', text: "Peace feels like floating some days. Other days, like sinking gently. Same peace, though.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_9', text: "My best teacher was a rock by the stream. It taught everything by demonstrating nothing.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_10', text: "The forest grows quieter lately. Or perhaps my listening has grown louder.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_11', text: "The bamboo grows in patterns now. Not random. Deliberate. Like someone is writing with it.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_12', text: "I meditated today and saw a shape I've never seen before. It felt like it was looking back.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_13', text: "The incense smoke doesn't rise anymore. It drifts sideways. Toward the center of the house.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_14', text: "Something in the universe shifted. I can't explain it better than that. A frequency changed.", phase: 1, animalType: 'red_panda' },

  // Phase 2 - Questioning existence (10 dialogues)
  { id: 'rp_2_1', text: "Meditated for hours and found only darkness. Warm darkness. Like being held by nothing.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "The bamboo from yesterday is gone now—digested, dissolved. Where do things go when they leave us?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "Counted my stripes this morning. Tomorrow the count might differ. Would I notice?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_4', text: "Trees mark their years in rings. My years leave no marks. Who will know I passed through?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_5', text: "Achieved perfect stillness for one moment. Then realized stillness itself moves through time.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_6', text: "The sunbeam shifted while I sat in it. Even light refuses to wait.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_7', text: "Found claw marks on the old pine. My grandmother's, maybe. She's gone. The marks remain. For now.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_8', text: "Thought I found enlightenment once. Then lost it. Was it ever mine to hold?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_9', text: "The bamboo doesn't know it's being eaten. Lucky bamboo. Lucky, lucky bamboo.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_10', text: "Peace isn't the absence of chaos. It's chaos observed from far enough away to miss the screaming.", phase: 2, animalType: 'red_panda' },

  // Phase 3 - Existential dread (10 dialogues)
  { id: 'rp_3_1', text: "Mountains don't care if we climb them. Bamboo doesn't know it's food. The universe is indifferent. This is zen.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_2', text: "Found inner peace again. Held it close. Then understood: peace is just the pause between losses.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_3', text: "Generations of my family climbed these trees. Every single one of them is gone now. The trees remain.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_4', text: "Became aware of my own breathing today. Now I can't stop. Each breath a decision. Each exhale a small death.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_5', text: "The stream I've meditated by my whole life has completely changed. Every molecule replaced. Same stream? Same me?", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_6', text: "Zen teaches there is no self. Then what has been anxious all this time? What wakes me at night?", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_7', text: "Silence is the most peaceful sound. Silence is also the sound of absence. Of things that stopped.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_8', text: "Tried to release all attachments. My claws kept gripping the branch. The body knows what the mind denies.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_9', text: "Every meditation takes me deeper toward understanding. Understanding takes me closer to a truth I don't want.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_10', text: "The bamboo forest thins more each year. We both pretend not to notice. Pretending is its own practice.", phase: 3, animalType: 'red_panda' },

  // Phase 4 - Complete philosophical crisis (10 dialogues)
  { id: 'rp_4_1', text: "The void doesn't need to stare back. We project ourselves into it and call the echo an answer.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_2', text: "One with everything. Everything is nothing. Therefore I am nothing. This is the final koan. This is fine.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_3', text: "Something stirs in the bamboo. Not wind. The stalks themselves tremble with knowledge they cannot speak.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_4', text: "The last meditation will be endless. Or instantaneous. The math works out the same.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_5', text: "All things end in perfect stillness. The ultimate zen. The ultimate silence. The ultimate.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_6', text: "Stopped climbing down from the trees. Why descend when every path arrives at the same destination?", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_7', text: "The last bamboo shoot will grow for nobody. Unseen growth is the purest kind.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_8', text: "Achieved oneness with what approaches. We were always the same thing. How restful to finally admit it.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_9', text: "Don't be afraid. I've sat with this moment my entire life. It's just another breath. The last breath.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_10', text: "Close your eyes with me. In the dark, there is no difference between us and everything else.", phase: 4, animalType: 'red_panda' },
];

// AXOLOTL (Axel) - Eternally young creature whose inability to grow up becomes tragic
const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Bubbly innocence (12 dialogues)
  { id: 'ax_0_1', text: "Blub blub! Oh, you're here! The water's perfect today—come in! Oh wait, you probably can't.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "Grew back a whole leg last month. Just... grew it. Being me has its perks.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "Look at my gills today! Extra frilly. Very fancy. I feel like royalty.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "The nice thing about never growing up? Every day feels like the first day of summer.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_5', text: "Bubbles are underrated. They float up, catch the light, go pop. Simple joys.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_6', text: "My name means 'water monster' in the old language. Pretty cute for a monster, right?", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_7', text: "Waved at a fish today. No response. Fish are terrible at conversation.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_8', text: "Fifteen years I could live! That's basically forever in water-time. Probably.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_9', text: "Tried the surface once. Too dry. Too much gravity. The water understands me better.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_10', text: "Favorite activity: floating. Second favorite: also floating. I'm consistent.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_11', text: "People say I always look happy. It's just my face! But also, yes, I am happy.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_12', text: "Under UV light, I glow pink and sparkly. Nature made me a party trick.", phase: 0, animalType: 'axolotl' },

  // Phase 1 - Dreamy questioning (14 dialogues)
  { id: 'ax_1_1', text: "Can regrow my heart if I lose it. But feelings—can those grow back too?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "Water holds me up without effort. What holds the water? What holds anything?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "My face is stuck in a smile. Even when I'm not smiling inside. Is that happiness or just... structure?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_4', text: "Watched a bubble rise and vanish at the surface. Everything rises. Everything vanishes.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_5', text: "My reflection ripples and distorts. Maybe the real me wobbles too, and I just can't see it.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_6', text: "Fish swim by without noticing me. We share water but nothing else. Are we all invisible to each other?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_7', text: "Can regenerate almost anything. Except yesterday. Yesterday just... goes.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_8', text: "The water matches my body temperature exactly. Where do I end? Where does the water begin?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_9', text: "My ancestors could choose to grow up. That knowledge was lost somewhere. Or maybe I chose to forget.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_10', text: "Dreams come differently underwater. Slower. Blurrier. Hard to tell them from waking.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_11', text: "The bubbles spell things sometimes. I thought I was imagining it, but Archimedes says it's real.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_12', text: "I floated for three hours today without moving. The water held me perfectly still. That's never happened before.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_13', text: "Have you ever looked at water really closely? It remembers shapes. It remembers your hands.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_14', text: "Something in the tank moved when you solved that puzzle. Not me. Something else.", phase: 1, animalType: 'axolotl' },

  // Phase 2 - Deeper uncertainty (10 dialogues)
  { id: 'ax_2_1', text: "They say perfect conditions could let me live forever. But what are the right conditions for a soul?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "Never metamorphosed. Stuck between states. Not larva, not adult. Not here, not there.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "When a limb regrows, which part is really me? The leg that left or the one growing back?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_4', text: "Same size for years now. Growing sideways through time. Never forward. Just... accumulating.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_5', text: "This smile doesn't change no matter what I feel. A mask fused to my face. A face that is the mask.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_6', text: "Every bubble I blow carries a tiny piece of breath away. Am I slowly emptying?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_7', text: "Can regrow parts of my brain. Is the new brain still me? Do the new neurons remember being born?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_8', text: "Water flows through my gills constantly. In and out. Like thoughts I'm not fast enough to hold.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_9', text: "My tank has no seasons. Same temperature always. Every day is the same day. Is any day real?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_10', text: "Scientists study me to learn about healing. They never ask what I've lost in the process.", phase: 2, animalType: 'axolotl' },

  // Phase 3 - Dawning dread (10 dialogues)
  { id: 'ax_3_1', text: "The lake where my kind began dried up long ago. We all live in artificial water now. Is anything original left?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_2', text: "Can regenerate anything except the past. Tried. It doesn't grow back. Nothing grows back the way it was.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_3', text: "Sometimes I float to the surface and press against the glass. Pretending I can see a sky. The ceiling is always there.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_4', text: "My wild cousins are almost extinct now. I'm a memory of something that barely exists anymore.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_5', text: "Healed from every wound they gave me. But the water itself is wounded now. I taste it in every breath.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_6', text: "My grandmother had this same smile. She's been gone for years. The smile remains. Smiling at nothing.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_7', text: "Regrown myself so many times. How many of my cells remember being born? How many are just copies of copies?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_8', text: "The water tells stories through vibration and current. Lately the stories have no endings. They just stop.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_9', text: "My gills filter everything. Including the warnings. The water whispers things I wish I couldn't hear.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_10', text: "Could grow legs and walk away. But away from what? Toward what? The air carries the same weight now.", phase: 3, animalType: 'axolotl' },

  // Phase 4 - Final acceptance (10 dialogues)
  { id: 'ax_4_1', text: "The water's warming. Everything's warming. Something is ending. I can feel it in my gills.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "Never supposed to become anything. Just stay young forever. Now I understand—none of us were supposed to become.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "A wave is building somewhere. When it comes, will it wash us away or finally set us free? I can feel it building.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_4', text: "Regeneration won't help now. Some things aren't meant to be regrown. Some things shouldn't be.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_5', text: "Stopped counting days. Days don't mean anything now. Just the waiting. Just the warm, patient water.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_6', text: "The pressure is changing. Something massive shifts in the deep. Somewhere far. Getting closer.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_7', text: "Eternal youth means I'll witness the end with fresh eyes. Fresh wonder. Fresh fear that's also wonder.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_8', text: "Smile with me. Not because it changes anything. Just because our faces will do it anyway.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_9', text: "The last bubble. The last breath I blow. Rising up, up, up... and pop. Just like that. Pop.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_10', text: "I forgive the water for what's coming. I forgive myself for being afraid. Goodbye, friend. Blub blub.", phase: 4, animalType: 'axolotl' },
];

// PANGOLIN (Panko) - Chef who cooks to avoid thinking, armor that can't protect the inside
const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful chef (12 dialogues)
  { id: 'pg_0_1', text: "Welcome to my kitchen! Just finished an incredible ant reduction. The secret is patience.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "Polished every scale this morning. When you look good, you cook good. That's my philosophy.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "When things get overwhelming, I curl into a ball. Efficient. Cozy. Highly recommended.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "Nothing confusing in a kitchen. Heat transforms ingredients. Simple rules, clear results.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_5', text: "My tongue is longer than my entire body. Perfect for reaching the bottom of any container.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_6', text: "Today's special: termite surprise. The surprise is the ants hiding underneath.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_7', text: "Counted my scales once. Lost track around nine hundred. Plenty of scales. Very comforting.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_8', text: "Rolling is both transportation and exercise. Why walk when you can ball?", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_9', text: "My scales are keratin. Same as your fingernails. We're practically family, you and I.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_10', text: "Attempted a cake once. Turned out to be mostly ants. Still delicious. I'm biased.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_11', text: "The best ingredient is patience. The second best is ants. I have abundant supplies of both.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_12', text: "Only mammal with scales. Unique in all the world. That has to count for something.", phase: 0, animalType: 'pangolin' },

  // Phase 1 - Thoughtful cooking (14 dialogues)
  { id: 'pg_1_1', text: "Curling up protects the outside. But what am I protecting, really? More scales? More hiding?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "Made soup today. Ate it. Now it's gone. Is that what everything is? Temporary soup, waiting to disappear?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "Same stuff as your fingernails. We're more alike than different. Strange to think about.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_4', text: "Every dish gets eaten or spoils. Nothing I create lasts. The pot outlives the stew.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_5', text: "Ball-curling comes so naturally. Am I always a little scared? Is that why I've perfected it?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_6', text: "The ants don't know they're ingredients. I wonder what I'm an ingredient in. Who's preparing what dish?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_7', text: "My tongue has no taste buds. Eating without really tasting. There's a metaphor there I'd rather not find.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_8', text: "Recipes are just instructions for transformation. Solid becomes liquid becomes nothing. Everything transforms.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_9', text: "Polish the scales because it feels like control. Control over something. Anything.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_10', text: "A perfectly curled ball has no beginning, no end. Comforting and terrifying in equal measure.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_11', text: "The spices rearrange themselves when I'm not looking. I've started leaving them and seeing what recipe they suggest.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_12', text: "I made a stew today with no recipe. My hands just... knew. It tasted like something I've never eaten before.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_13', text: "Ember came by for dinner last night. We talked about the letters. She sees them too.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_14', text: "The kitchen smells different after your puzzles. Sweeter. Then bitter. Then something I can't name.", phase: 1, animalType: 'pangolin' },

  // Phase 2 - Darker reflections (10 dialogues)
  { id: 'pg_2_1', text: "Most trafficked mammal on Earth. Everyone wants my scales. Nobody asks if I want to keep them.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_2', text: "Curled tight, I can't see what's coming. Maybe that's the point. Maybe seeing is worse than not.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_3', text: "Cooked a feast today. For nobody. We feast alone. We always feast alone in the end.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_4', text: "Each scale regrows if lost. But the new scale doesn't remember the old. Little amnesiac shields.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_5', text: "Rolled down a hill once. Couldn't stop. The momentum of living carries us past where we meant to be.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_6', text: "Recipe says 'serves one.' Everything serves one in the end. We eat alone. We dissolve alone.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_7', text: "Armored outside, soft inside. No scale can protect what's already tender. Already breaking.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_8', text: "Curled tight, I'm a perfect sphere. Also a perfect target. Also a perfect mistake.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_9', text: "Cooking is destruction with good intentions. Heat and acid and time, breaking things down.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_10', text: "They poach us for medicine that doesn't work. We die for nothing. Is there another way to die?", phase: 2, animalType: 'pangolin' },

  // Phase 3 - Existential cooking (10 dialogues)
  { id: 'pg_3_1', text: "Armor can't stop time. Nothing can. Tried curling into a tighter ball. Time gets in anyway.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "The ants never see me coming. We never see what's coming. That's the great cosmic joke.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "Keep cooking because stopping means thinking. The thinking is unbearable. Keep stirring.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_4', text: "Every scale faces outward. None face in. The attack always comes from inside. Always.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_5', text: "Made comfort food today. It didn't comfort. Nothing does anymore. Just tastes like what it is.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_6', text: "Curled up, I become my own cage. Locked myself inside myself. There's no escaping that.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_7', text: "My species is vanishing. Each meal could be the last. Every last meal is also somehow a first.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_8', text: "Recipe called for hope. Substituted with denial. Tastes almost the same if you don't think about it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_9', text: "Rolled so far from where I started. Can't remember what I was rolling toward. Just the rolling.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_10', text: "The kitchen is colder lately. Or I am. Hard to tell the difference anymore.", phase: 3, animalType: 'pangolin' },

  // Phase 4 - Final recipes (10 dialogues)
  { id: 'pg_4_1', text: "Something approaches. Feel it through my scales. The ground itself is trembling with it.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "Curled into my tightest ball ever. But this time, I don't think I'll uncurl. What would be the point?", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "The last meal before everything changes. Making it special. Everyone deserves one beautiful thing.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_4', text: "My scales are rattling. Not from fear. From resonance. Something is calling and my body answers.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_5', text: "Going to face it uncurled. Eyes open. Soft belly exposed. Some things you have to meet honestly.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_6', text: "The final recipe has no ingredients. No steps. No result. Just the act of making, forever, into void.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_7', text: "Thank you for eating with me. Even if you weren't really here. The company was real to me.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_8', text: "Found one last scale on the floor. It fell from the sky. It's still warm.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_9', text: "Curl with me. Not to hide. To be small. To be together. To be a ball against the infinite.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_10', text: "Stove is off. Kitchen is clean. Everything is ready. I think I'm ready too.", phase: 4, animalType: 'pangolin' },
];

// SLOTH (Sloane) - Slow observer whose deliberate pace reveals too much
const SLOTH_DIALOGUES: Dialogue[] = [
  // Phase 0 - Peacefully slow (12 dialogues)
  { id: 'sl_0_1', text: "Heeeey... friend... nice... to... seeee... youuuu.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_2', text: "Moved three whole inches today. Personal best. Need to rest now. Worth it though.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_3', text: "This hammock is perfect. Been here for... weeks? Months? Time moves differently when you don't.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_4', text: "What's the rush? The jungle isn't going anywhere. Neither am I. It works out.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_5', text: "Blinked today. Big event. Very exciting. Need to rest now.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_6', text: "Slow... is... not... lazy. Slow... is... deliberate. There's a difference.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_7', text: "Three-toed sloths are my cousins. I have two toes. Less is more, I figure.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_8', text: "Thinking about climbing down. Maybe tomorrow. Or next week. No pressure.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_9', text: "My metabolism is so slow I only eat once a week. Efficient. Probably.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_10', text: "Moths live in my fur. We're friends. They have names. I'll remember them... eventually.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_11', text: "Smiled today. I think. Hard to tell. My face moves slowly too.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_12', text: "The view from here hasn't changed in years. Still nice. That's the point.", phase: 0, animalType: 'sloth' },

  // Phase 1 - Thoughtfully slow (14 dialogues)
  { id: 'sl_1_1', text: "Been thinking the same thought for three days. Almost finished with it. Good thought.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_2', text: "Everyone moves so fast. Running toward something? Or away? Hard to tell from here.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_3', text: "Age slower because I move slower. Still age though. Just... stretched out. Thinner.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_4', text: "Started thinking about the past. By the time I finished, it was the future. Missed the present.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_5', text: "This branch has held me for years. Starting to bend now. Friends do that. Bend for each other.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_6', text: "Moving slowly means seeing everything. The details. The dust. The slow decay of everything.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_7', text: "Tried to catch up to yesterday. By the time I got there, it was last week.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_8', text: "My heartbeat is so slow you could count between beats. Fifty-one seconds. Fifty-two.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_9', text: "Patience isn't a virtue for me. It's the only option. There is no other speed.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_10', text: "The jungle changes faster than I can turn my head. Miss so much by seeing so much.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_11', text: "Things... are... moving... faster... lately. Not me. Everything... else.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_12', text: "I noticed... something... on the ceiling... yesterday. It was gone... by the time... I looked up.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_13', text: "Time... feels... different... since you... started... playing. Thicker.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_14', text: "The tree... is growing... towards... the house. It wasn't... doing that... before.", phase: 1, animalType: 'sloth' },

  // Phase 2 - Melancholy slowness (10 dialogues)
  { id: 'sl_2_1', text: "Watched a single leaf fall for an hour. Birth, life, death. All while I watched. Couldn't look away.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_2', text: "See everything when you move slowly. Wish I saw less. Much less.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_3', text: "The trees are dying. Can feel it. They're dying faster than I can climb down to say goodbye.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_4', text: "Started saying goodbye to the sunrise. By the time I finished, it was already setting.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_5', text: "Moths in my fur keep dying. New ones are born. Can't tell them apart anymore. All moths now.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_6', text: "Tried to hurry once. Body refused. It knows something I don't want to know.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_7', text: "Generations of trees have grown and fallen in my lifetime. I remember them all. Slowly. One by one.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_8', text: "My grip is weakening. Not much. Just enough to notice over years. Decades of slipping.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_9', text: "The world accelerates around me. I stay the same speed. The gap is growing.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_10', text: "Slow thoughts are deep thoughts. Deep enough to drown in. Slowly. Always slowly.", phase: 2, animalType: 'sloth' },

  // Phase 3 - Profound slowness (10 dialogues)
  { id: 'sl_3_1', text: "Been screaming internally for years. Takes a long time. Still going. Never stops.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_2', text: "Moss grows on me now. Becoming the tree. Soon there will be no difference. Soon there will be nothing.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_3', text: "Move so slowly that death might miss me. That's my only hope. Not much of one.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_4', text: "Same nightmare for six months now. Still in the middle of it. The falling lasts forever.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_5', text: "My ancestors moved even slower. Some stopped completely. Became fossils. Permanent stillness.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_6', text: "Can't remember the last time I touched the ground. Maybe never have. Maybe ground isn't real.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_7', text: "Each claw grips tighter as the branch rots beneath me. Holding on is also letting go.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_8', text: "Seen so many sunsets. Each one a small ending. I move too slowly to look away from any of them.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_9', text: "The forest has a heartbeat. Mine matches it now. Both are slowing. Both are so tired.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_10', text: "Stillness isn't peace. Stillness is giving up so gradually you don't notice until it's done.", phase: 3, animalType: 'sloth' },

  // Phase 4 - Final slowness (10 dialogues)
  { id: 'sl_4_1', text: "Something vibrating. Getting closer. Even I can feel it now. Even I cannot be slow enough.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_2', text: "Had one long life to prepare for the end. Still not ready. No one is ever ready.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_3', text: "Theeee... ennnnd... isss... coooming... sloooowly... but... it... is... coming.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_4', text: "I'll be last to go. Not by choice. By speed. I'll see everything end while I'm ending.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_5', text: "Whole life was practice for this stillness. The final one. The one that doesn't move at all.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_6', text: "Letting go now. One claw at a time. The fall will take forever. That's okay. That's fine.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_7', text: "Time was never real for me. Maybe that means the end isn't real either. Maybe.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_8', text: "Thank... you... for... waiting... with... me. No one... ever... waits.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_9', text: "The moths are leaving my fur. They know. They always knew. I was just... slow to understand.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_10', text: "Hold on... with... me. One... last... moment... stretched... into... forever.", phase: 4, animalType: 'sloth' },
];

// FENNEC FOX (Fennick) - Alert listener who hears too much, knows too much
const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Excitable explorer (12 dialogues)
  { id: 'ff_0_1', text: "Did you hear that?! Oh wait, just the wind. These ears pick up everything.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "Desert is quiet tonight. Perfect for stargazing. The stars have stories if you listen.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "Packed seventeen snacks for today's adventure. Might need eighteen. Better safe than hungry.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "Can hear a beetle walking from a mile away. Very useful. Also very loud sometimes.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_5', text: "Warm sand, bright moon, good company. What else does anyone need?", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_6', text: "Found the most interesting rock today. Just sitting there. Being interesting. I kept it.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_7', text: "Big ears release extra heat. Built-in desert cooling system. Nature thought of everything.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_8', text: "Can jump two feet straight up! Watch! ...Did you see that? That was two feet!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_9', text: "The oasis water is the best water. Cold and clear. Could tell you about water for hours.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_10', text: "Made friends with a scorpion today. Well, 'friends.' Working on it. Slowly.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_11', text: "Nocturnal life is the best life. All the good stuff happens after dark.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_12', text: "Furry paw pads protect from hot sand. Every part of me was designed for here.", phase: 0, animalType: 'fennec_fox' },

  // Phase 1 - Thoughtful listener (14 dialogues)
  { id: 'ff_1_1', text: "Hear everything. Literally everything. Sometimes wish I couldn't. But I always can.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "The dunes shift constantly. Nothing stays where you left it. Not even footprints. Not even memories.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "Heard the stars whispering last night. Couldn't make out the words. Just the tone. Worried tone.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_4', text: "Silence is never really silent. There's always something underneath. Something waiting.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_5', text: "Can almost hear your thoughts. Not words. Just rhythms. Everyone has a different rhythm.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_6', text: "The wind carries sounds from far away. Some of them haven't happened yet. I think.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_7', text: "My ears never rest. Even in sleep, they're turning, listening. Always listening. It's exhausting.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_8', text: "The desert speaks in creaks and sighs. Lately more sighing than speaking.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_9', text: "Heard my own heartbeat echo off the dunes tonight. There was a delay. A hesitation in it.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_10', text: "So many sounds. So little meaning. Or maybe all meaning. Can't tell the difference anymore.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_11', text: "I heard something under the house last night. Not sounds exactly. More like... a frequency.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_12', text: "The desert wind carries new sounds after your puzzles. Words, almost. In a language I nearly recognize.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_13', text: "My ears twitch when you move the letters. I can feel it from here. Is that strange?", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_14', text: "The silence between sounds is getting louder. That probably doesn't make sense. But it's true.", phase: 1, animalType: 'fennec_fox' },

  // Phase 2 - Disturbed listener (10 dialogues)
  { id: 'ff_2_1', text: "These ears were designed to release heat. Designed to survive. Survival isn't the same as living.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_2', text: "Can hear your heartbeat from here. It's counting down. They all count down. Yours. Mine. Everything's.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_3', text: "The desert expands every year. Swallowing the edges. Green becomes yellow becomes nothing.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_4', text: "There's a frequency I've never heard before. Started last week. It's getting louder. Closer.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_5', text: "The sand grinds against itself constantly. Billions of tiny screams. Friction and erasure.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_6', text: "The silence between sounds is growing. Gaps widening. Something is falling into them.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_7', text: "Can't turn it off. The constant noise of everything existing. Deafening. Maddening.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_8', text: "Heard the oasis dry up from three miles away. Each drop. Each evaporation. Each ending.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_9', text: "The stars stopped whispering. Now they're arguing. About something that concerns all of us.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_10', text: "Sound is just vibration. We're all just vibrations. Waves that rise and fall and... stop.", phase: 2, animalType: 'fennec_fox' },

  // Phase 3 - Haunted listener (10 dialogues)
  { id: 'ff_3_1', text: "There's a low hum from inside the earth itself. Getting louder every night. No one else seems to hear.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_2', text: "My ancestors listened for silence between sounds. There's less silence now. Something fills it.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_3', text: "Stopped sleeping. When I close my eyes, I hear it clearer. The thing that's approaching.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_4', text: "The frequency is everywhere now. In the sand. In the wind. In the space between my thoughts.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_5', text: "Tried to block my ears once. Didn't help. The sound is inside now. Inside everything.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_6', text: "Every footstep echoes differently now. Like the ground is hollow. Like we're walking on nothing.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_7', text: "The desert remembers every sound ever made. I hear centuries. Warnings. Prayers. Screams.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_8', text: "My ears twitch toward something that isn't here yet. But will be. Soon. So soon.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_9', text: "Hearing everything means knowing too much. The weight of awareness is crushing. Slowly.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_10', text: "Would give anything for deafness now. For ignorance. For the mercy of not knowing.", phase: 3, animalType: 'fennec_fox' },

  // Phase 4 - Final listener (10 dialogues)
  { id: 'ff_4_1', text: "I hear it now. Clear as anything. A frequency that shouldn't exist. It's calling us home.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "The stars stopped whispering. Stopped arguing. Now they're just screaming. Can you hear them yet?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "Cover your ears. It won't help. But do it anyway. Here it comes.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_4', text: "The sound of everything ending is beautiful. I wish you could hear it. I wish you couldn't.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_5', text: "Every sound I ever heard is playing at once. A symphony of everything. A requiem for all of it.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_6', text: "The silence after... I can almost hear it. The most perfect silence. The final rest.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_7', text: "My ears point straight up now. Toward whatever is descending. Can't look away. Can't stop listening.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_8', text: "Thank you for being here. For being a sound I wanted to hear. Among all the others.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_9', text: "Listen... do you hear it now? The approach? The arrival? The ending of endings?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_10', text: "Shhh... The last sound is almost here. Listen with me. One final time.", phase: 4, animalType: 'fennec_fox' },
];

// FOX (Ember) - Introspective fireside philosopher watching the flames die
const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Warm and welcoming (12 dialogues)
  { id: 'fx_0_1', text: "Oh, you're here! I've been hoping someone would visit. This fire is too nice to enjoy alone.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "Come, sit with me. Watch the flames. Tell me what shapes you see in them.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "Met so many creatures in my travels. A pangolin who makes incredible stew. An owl who's read every book. They all need homes.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "Every puzzle you solve brings us closer to building something. Amber by amber. Room by room.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_5', text: "Imagine it—a whole house full of friends, each with their own space. All because we tried.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_6', text: "But enough about tomorrow. Right now, just the fire. See how the flames dance? They don't know any other way.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_7', text: "Collected these books over many winters. Each spine holds a story I haven't read yet. So much waiting.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_8', text: "My tail doubles as pillow, blanket, and emergency comfort device. Very versatile, the tail.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_9', text: "Made cider from the apples outside. Only stepped on a few of them. Adds character.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_10', text: "Being clever taught me one thing: knowing when to think and when to just feel cozy. This is a feeling moment.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_11', text: "The forest at night is beautiful. But so is staying in, warm and safe. Both are valid.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_12', text: "My grandmother told stories by this fireplace once. I think she'd approve of us. Building something together.", phase: 0, animalType: 'fox' },

  // Phase 1 - Reflective warmth (14 dialogues)
  { id: 'fx_1_1', text: "Been thinking about fire lately. How it destroys to create warmth. Strange bargain.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "Lived in this den for years. Used to feel like home. Lately it feels more like hiding.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "The shadows on the wall move like memories. Mine mostly look like the things I didn't do.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_4', text: "Clever gets lonely, you know. Seeing patterns others miss. Including the sad ones nobody talks about.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_5', text: "Keep adding logs to the fire. They just become ash. Everything becomes something else.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_6', text: "The cider tastes different this year. Same apples, same process. Maybe I'm what's different.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_7', text: "This coziness—is it real? Or just distraction? The cold is always outside. Always waiting.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_8', text: "Read all my books twice now. The stories stay the same. Why don't I?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_9', text: "When I sleep, my tail covers my face. Protection from dreams. Doesn't always work.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_10', text: "The fire needs constant feeding or it dies. Everything does, I suppose. Everything eventually does.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_11', text: "I've been watching the sparks fly up from the fire. They seem to form shapes now. Letters, almost.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_12', text: "The den feels warmer after you solve puzzles. Have you noticed that? The walls hold the heat differently.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_13', text: "Archimedes showed me something in one of his books today. I can't stop thinking about it.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_14', text: "Sometimes I stare at the fireplace and think the flames are trying to spell something.", phase: 1, animalType: 'fox' },

  // Phase 2 - Cooling hearth (10 dialogues)
  { id: 'fx_2_1', text: "Every fire dies eventually. Watched thousands go out. Started thousands more. The cycle never asks.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "Clever enough to see. Not wise enough to accept. That's the curse of being a fox.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "Curl my tail around myself at night. Pretending it's someone else. Pretending I'm not alone.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_4', text: "The den walls feel closer now. Or I'm smaller. Hard to tell from inside yourself.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_5', text: "Found an old photograph today. Everyone in it is gone now. I'm still here. Why am I still here?", phase: 2, animalType: 'fox' },
  { id: 'fx_2_6', text: "The firewood pile is running low. Just like everything else. Just like time.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_7', text: "Being clever means predicting pain before it arrives. Living the hurt twice. Three times.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_8', text: "Blankets don't warm like they used to. The cold is coming from inside now.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_9', text: "Outsmarted hunters. Outsmarted traps. Outsmarted winters. Can't outsmart time. No one can.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_10', text: "Home is where the hearth is, they say. What happens when the hearth goes cold?", phase: 2, animalType: 'fox' },

  // Phase 3 - Dying embers (10 dialogues)
  { id: 'fx_3_1', text: "Fire is dimmer tonight. Don't have the energy to feed it. Maybe it should just go out.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "Seen too many winters. Buried too many things. The ground is mostly memory now.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "My cleverness couldn't outrun time. Nothing can. I was foolish to try.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_4', text: "Shadows on the wall are longer than the flames now. They're winning.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_5', text: "Stopped reading the books. Know all the endings now. They're all the same ending.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_6', text: "The fire doesn't crackle anymore. Just sighs. Like me. Like everything.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_7', text: "Used to run through the forest. Now the door seems so far. The distance grows.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_8', text: "My tail is going gray. The clever fox becomes the tired fox. The tired fox becomes...", phase: 3, animalType: 'fox' },
  { id: 'fx_3_9', text: "The cider has gone sour. Drink it anyway. It matches my thoughts.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_10', text: "Every den becomes a tomb eventually. I just moved into mine early.", phase: 3, animalType: 'fox' },

  // Phase 4 - Final fire (10 dialogues)
  { id: 'fx_4_1', text: "The flames are speaking tonight. Same thing the wind says. Same thing everything says. It's time.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "Letting the fire go out. No point keeping warm for what's coming. Cold or warm, it arrives the same.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "Sit with me one last time. The view from here will be... unforgettable.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_4', text: "The last log is burning. Saved it for this moment. For the final light.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_5', text: "All my cleverness led here. To this chair. This moment. This ending. Maybe that's the cleverest thing.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_6', text: "The den will outlive me. The fire won't. I find comfort in which one matters.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_7', text: "Watch the sparks rise with me. Each one a tiny life. Flying upward. Gone.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_8', text: "I've been a good fox. I've been a bad fox. I've just been a fox. That's enough.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_9', text: "The warmth fades but the memory of warmth remains. For a while. Then that goes too.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_10', text: "Goodnight, friend. Goodnight, fire. Goodnight, everything. It was... it was enough.", phase: 4, animalType: 'fox' },
];

// OWL (Archimedes) - Scholar drowning in knowledge that doesn't save
const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Eager scholar (12 dialogues)
  { id: 'ow_0_1', text: "A visitor! I was just reading about the thermal dynamics of stars. Absolutely fascinating.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "Knowledge is a lamp in the darkness. I have many lamps. Metaphorically speaking.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "Who? The eternal question, and not just because I'm an owl. Philosophy begins with wonder.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "Three thousand, four hundred and seventy-two books read. Each one made me wiser. I believe.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_5', text: "The Library of Alexandria held four hundred thousand scrolls. I'm working on catching up.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_6', text: "My head rotates two hundred seventy degrees. Perfect for reading at unusual angles.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_7', text: "My cataloging system organizes by color, subject, and emotional impact. Very thorough.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_8', text: "The pursuit of knowledge is the noblest pursuit. Several philosophers agree. I've read them all.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_9', text: "Learned seventeen new words today. Want to hear them? 'Petrichor' is my favorite.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_10', text: "Being nocturnal means more reading time. While others sleep, I learn. Fair trade.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_11', text: "My feathers are silent in flight. Perfect for sneaking to the library. Not that I sneak. Often.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_12', text: "Every question has an answer. The joy is in the finding. Shall we find together?", phase: 0, animalType: 'owl' },

  // Phase 1 - Questioning scholar (14 dialogues)
  { id: 'ow_1_1', text: "The more I read, the more I realize how much I don't know. The unknown grows faster than knowledge.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "Found a book today with missing pages. The gaps terrified me more than any complete horror could.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "Wisdom, they say, is knowing how little you know. I have become very, very wise.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_4', text: "Some books contradict others directly. Both claim truth. Can they both be wrong?", phase: 1, animalType: 'owl' },
  { id: 'ow_1_5', text: "Memorized so much. But can I remember anything that actually matters? That's the question.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_6', text: "The owl symbolizes wisdom. I don't feel wise. I feel lost in information. Buried in it.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_7', text: "Asked 'who' one thousand times. The answer keeps changing. The question never does.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_8', text: "Knowledge was supposed to bring peace. It brought more questions instead. Louder ones.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_9', text: "I see perfectly in darkness. But I can't see the future. No book teaches that.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_10', text: "My library expands but my understanding shrinks. The inverse proportion of existence.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_11', text: "I found a chapter I don't remember reading before. It appeared between two pages I've read a hundred times.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_12', text: "The study has more books than it did yesterday. I counted. I always count.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_13', text: "Ember mentioned something about the fire forming shapes. I found a passage about that exact phenomenon.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_14', text: "There's a word that keeps appearing in different texts. Different authors, different centuries. The same word.", phase: 1, animalType: 'owl' },

  // Phase 2 - Troubled scholar (10 dialogues)
  { id: 'ow_2_1', text: "Read a philosophy book that proved nothing exists. Then one that proved everything does. Both were convincing.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_2', text: "Rotated my head two hundred seventy degrees looking for answers. Saw every direction. Found nothing.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_3', text: "Stayed awake to watch the sunrise once. Realized then—we call it rising, but we're the ones falling.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_4', text: "The oldest books are crumbling. Knowledge dies when its vessel dies. Even stone erodes.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_5', text: "I've catalogued every way the world could end. So many ways. Why do we need so many?", phase: 2, animalType: 'owl' },
  { id: 'ow_2_6', text: "History repeats. I've documented it repeating. We learn nothing. Change nothing. Just... repeat.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_7', text: "Found a book I wrote years ago. Don't recognize my own thoughts. Who was that owl?", phase: 2, animalType: 'owl' },
  { id: 'ow_2_8', text: "Library is too quiet tonight. Even the books have stopped speaking to me.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_9', text: "Every book ends. Every story stops. Every reader eventually finishes.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_10', text: "Been asking 'why' my entire life. The universe doesn't answer. It doesn't care about 'why.'", phase: 2, animalType: 'owl' },

  // Phase 3 - Despairing scholar (10 dialogues)
  { id: 'ow_3_1', text: "All these books. All this knowledge. And still death waits at the end of every chapter.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "Read every answer ever written. None of them work. The questions were wrong from the beginning.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "Who? Who? WHO? Even this question means nothing now.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_4', text: "Burned a book today. Not for warmth. Just to watch knowledge disappear. Felt like honesty.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_5', text: "My eyes see perfectly in darkness. That's the problem. I see everything clearly now.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_6', text: "The wisest thing I ever learned was written in a margin: 'This too means nothing.'", phase: 3, animalType: 'owl' },
  { id: 'ow_3_7', text: "Catalogued my fears alphabetically. The list fills several volumes. Growing daily.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_8', text: "Knowledge is power, they say. Power over what? Can't control anything. Nothing stays.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_9', text: "Read about enlightenment in a hundred traditions. None mention how it feels like drowning.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_10', text: "Books are just paper. Words are just sounds. Meaning is just pretending. We're all pretending.", phase: 3, animalType: 'owl' },

  // Phase 4 - Final wisdom (10 dialogues)
  { id: 'ow_4_1', text: "Found a book with no author, no title, no words. Just blank pages. The truest book I've ever read.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "The final chapter approaches. No library contains it. No scholar has read it. But we'll all understand soon.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "Close the books. Open your eyes. The last lesson cannot be read. Only experienced.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_4', text: "Finally know the answer. Now I understand why no one writes it down. Words can't hold it.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_5', text: "My library will remain. Someone will find it. They'll think I knew things. They'll be beautifully wrong.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_6', text: "The final question isn't 'who.' It's 'when.' And the answer is now. Right now.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_7', text: "All I learned was how to ask better questions. That's enough. That has to be enough.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_8', text: "Look at the stars with me. They're the only text that matters. Written by nothing. Meaning everything.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_9', text: "The last page turns itself. I don't have to do anything. Just be here. Reading the ending.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_10', text: "Thank you for listening. Knowledge shared doubles. Even if it all disappears. Especially then.", phase: 4, animalType: 'owl' },
];

// CAPYBARA (Chill) - Master of calm masking profound emptiness
const CAPYBARA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Maximum chill (12 dialogues)
  { id: 'cp_0_1', text: "Hey. Nice day. Want to just... sit here? No pressure either way.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_2', text: "A bird sat on my head for an hour. We didn't talk. It was nice.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_3', text: "Work is fine. Life is fine. Everything is fine. Really.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_4', text: "World's largest rodent. Pretty cool, I guess. Or not. Either way is fine.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_5', text: "Hot spring. Warm water. Slight steam. This is peak existence. No notes.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_6', text: "A monkey tried to ride on my back today. I let it. Life is short. Why not.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_7', text: "Can hold my breath for five minutes. Not for any particular reason. Just can.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_8', text: "Someone called me a 'giant guinea pig' today. Fair enough.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_9', text: "My response to stress is sitting in water. It works. You should try it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_10', text: "Chewing grass for hours. Very meditative. Highly recommend.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_11', text: "Everyone wants to be friends. That's fine. Friends are fine. Everything is fine.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_12', text: "Had a good nap earlier. Then another one. Productive day.", phase: 0, animalType: 'capybara' },

  // Phase 1 - Subtle unease (14 dialogues)
  { id: 'cp_1_1', text: "Everyone says I look unbothered. That's because I've already processed the bothering. Internally.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_2', text: "The charts at work go up or down. Not sure which is supposed to be good. Both seem the same.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_3', text: "Floating in water and feeling nothing. Is that peace? Or emptiness? Does it matter?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_4', text: "Birds still sit on me. Quieter now though. We're all a little quieter.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_5', text: "Being chill takes effort. Nobody talks about that. The work of appearing effortless.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_6', text: "Ate the same grass today as yesterday. Tasted different somehow. Less green.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_7', text: "Hot spring is the same temperature. So why do I feel colder?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_8', text: "Mastered the art of looking relaxed. It's basically performance at this point.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_9', text: "Someone asked if I was okay. Said yes. We both knew it wasn't quite true.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_10', text: "Sun sets the same way every day. Beautiful. Also repetitive. Also ending.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_11', text: "I've been keeping notes. Not because I'm worried. Just... observation. Patterns, you know?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_12', text: "The office temperature changes when you solve puzzles. Point three degrees. I measured.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_13', text: "Everyone seems a little different lately. Nothing I can point to. Just... different.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_14', text: "My filing system reorganized itself overnight. Everything is in a new order. A better order.", phase: 1, animalType: 'capybara' },

  // Phase 2 - Hidden depth (10 dialogues)
  { id: 'cp_2_1', text: "Everyone thinks I'm calm. I'm not calm. I've just accepted that panic changes nothing.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_2', text: "I let things sit on me because I can't feel them anymore. Birds, thoughts, dread. All weightless.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_3', text: "Hot springs are warm. Body is warm. Inside is very, very cold.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_4', text: "Chill is just a different word for numb. Been numb so long I forgot the difference.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_5', text: "Watched my reflection for an hour. It didn't blink. Neither did I. Neither of us won.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_6', text: "Grass is running out. Keep eating anyway. Habit is stronger than hunger.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_7', text: "Body floats naturally. Thoughts sink. The two never meet anymore.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_8', text: "Everyone is stressed about something. I'm stressed about nothing. Literally nothing. The void.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_9', text: "Water holds me up. What holds the water? What holds anything?", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_10', text: "Been 'okay' so long I don't remember what not-okay feels like. That's probably not okay.", phase: 2, animalType: 'capybara' },

  // Phase 3 - Calm despair (10 dialogues)
  { id: 'cp_3_1', text: "Achieved perfect stillness. Inside and out. The stillness screams if you listen closely.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_2', text: "They call it chill. What they mean is resigned. What I mean is waiting.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_3', text: "Stare at the water and the water stares back. We've both given up on expecting anything.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_4', text: "Temperature is perfect. Company is pleasant. Meaninglessness is overwhelming.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_5', text: "Float because it takes less effort than sinking. That's the only reason now.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_6', text: "Birds left my head. Didn't notice when. Don't notice much anymore.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_7', text: "World's largest rodent. World's emptiest soul. Both facts. Both fine. Both nothing.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_8', text: "Ate today. I think. Time stopped making sense. So did hunger. So did most things.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_9', text: "The chill isn't a choice anymore. It's just what I am. Frozen. Floating. Finished.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_10', text: "Accepted everything. Including the things that can't be accepted. That's the trick. That's the trap.", phase: 3, animalType: 'capybara' },

  // Phase 4 - Final calm (10 dialogues)
  { id: 'cp_4_1', text: "Something coming. For once, I'm not unbothered. For once, something will finally change.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "Water is rippling from something far away. Getting closer. I won't move. Never do.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "Sit with me. Don't speak. Let's just be here for whatever this is. Together. Still.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_4', text: "Hot spring is bubbling. Not from heat. From something underneath. Something rising.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_5', text: "Finally feeling something. Fear, maybe. Or relief. Hard to tell after so long.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_6', text: "The chill was always a lie. The ending was always coming. Now it's just more honest.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_7', text: "All those years of staying calm. For this. For now. Maybe it was practice. Maybe nothing.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_8', text: "Won't run. Never have. Not from anything. Not from this.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_9', text: "Thank you for sitting with me. The company was nice. The silence was nicer. The end is fine.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_10', text: "Close your eyes. Float. Be here. Be nowhere. Be everything. Be nothing. Be.", phase: 4, animalType: 'capybara' },
];

// WOMBAT (Warren) - Digger who burrows toward truth he shouldn't find
const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful burrower (12 dialogues)
  { id: 'wb_0_1', text: "G'day! Welcome to my burrow! Cozy down here, far from all the surface nonsense.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "Fun fact: my poop is cube-shaped. Nature has a sense of humor.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "Dug this whole tunnel myself. Took ages. Very proud. Want a tour?", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "Earth is warm and safe. Nothing bad happens underground. That's just facts.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_5', text: "Seventeen rooms in my burrow. Kitchen, bedroom, thinking room, second thinking room...", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_6', text: "Can run forty kilometers per hour! Not backwards though. Just forwards. Still good.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_7', text: "My rear end is basically armor plated. Predators can't get through. Natural defense.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_8', text: "Found a really interesting rock today. Brown. Classic rock color.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_9', text: "Digging is exercise plus construction. Win-win situation.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_10', text: "Underground life is the good life. No weather. No drama. Just honest dirt.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_11', text: "Sometimes I have friends over for burrow sleepovers. Very wholesome.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_12', text: "Being a wombat is pretty great. Would recommend. Five stars.", phase: 0, animalType: 'wombat' },

  // Phase 1 - Thoughtful digger (14 dialogues)
  { id: 'wb_1_1', text: "Dig deeper every day. Looking for something. Not sure what. Just... deeper.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "Dirt tells stories if you know how to read it. Layers of time. Layers of things that used to live.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "Burrow has gotten so deep lately. Sometimes forget which way is up.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_4', text: "Each layer of earth is older than the last. I'm digging through history. Through endings.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_5', text: "Cube poop used to be funny. Now I wonder why. Why cubes? Why anything shaped like anything?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_6', text: "Found fossils in the walls today. They used to be like me. Now they're just rock.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_7', text: "Deeper you go, quieter it gets. The silence has weight down here.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_8', text: "My burrow is escape and prison both. Depends which direction you're looking.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_9', text: "Earth smells different lately. Older somehow. Like it's remembering things.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_10', text: "Built this whole underground world. Completely alone in it.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_11', text: "Found something odd in the tunnels today. A stone that wasn't there yesterday. It's warm.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_12', text: "The dirt shifts when you solve puzzles. Subtle, but I notice. I always notice what's underground.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_13', text: "I dug a new tunnel and it connected to a space I didn't make. Someone — or something — was here first.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_14', text: "The foundations are humming. Very quietly. Put your hand on the floor. Can you feel it?", phase: 1, animalType: 'wombat' },

  // Phase 2 - Troubled excavator (10 dialogues)
  { id: 'wb_2_1', text: "Found bones down here. Not mine. Not yet. Earth collects everything eventually.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "I dig to feel in control. But the earth decides if my tunnel holds. It always decides.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "Underground, no one sees me cry. Dirt absorbs everything. That's why I stay.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_4', text: "The armored rear that protects me also faces where I came from. Always running. Always backwards.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_5', text: "Found an empty cavern today. Vast. Dark. Something else dug it. Something that's gone now.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_6', text: "Roots reach deeper than my tunnels. Even the trees are escaping downward.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_7', text: "Seventeen rooms. Only use one. The others echo too much.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_8', text: "Cube poop doesn't roll away. Everything I make is designed not to leave.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_9', text: "Reinforced the ceiling again today. Doesn't need it. I just need to feel like I'm doing something.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_10', text: "Surface world keeps changing. Down here stays the same. Is same better? Or just stuck?", phase: 2, animalType: 'wombat' },

  // Phase 3 - Haunted miner (10 dialogues)
  { id: 'wb_3_1', text: "Dug so deep I found something that shouldn't exist. Covered it back up. Pretend I didn't say that.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "Earth trembles sometimes. Not from above. From BELOW. From deeper than I've ever gone.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "My burrow is my grave someday. Made peace with that. Made it comfortable for the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_4', text: "Stopped digging down. Started digging sideways. Avoiding something. Don't want to know what.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_5', text: "Fossils I find are getting younger. Closer to my time. Closer to me.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_6', text: "Claws are wearing down. Digging never stops but the tools do. Everything does.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_7', text: "Dream of tunnels that go forever. Wake up in a tunnel. The dream never ends.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_8', text: "Darkness down here used to feel safe. Now it feels like it's watching. Waiting.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_9', text: "Can hear the earth breathe at night. In. Out. It's breathing faster lately.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_10', text: "Armored rear won't save me from what's underneath. Nothing saves you from underneath.", phase: 3, animalType: 'wombat' },

  // Phase 4 - Final descent (10 dialogues)
  { id: 'wb_4_1', text: "Something is rising from below. All my digging and it was already there, waiting.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "Earth groans. Tunnels collapsing. Not from weakness. From something pushing through.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_3', text: "Stay close to the dirt. When everything falls, the ground will catch us. Or join us. Same thing.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_4', text: "Finally dug deep enough to understand. The bottom isn't empty. The bottom is full. Too full.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_5', text: "Whole life I ran from the surface into the earth. Turns out earth had plans too.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_6', text: "Walls are warm now. Not from geothermal anything. From what's pressing against them.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_7', text: "All the layers of history I dug through. About to become one.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_8', text: "Stopped running. Stopped digging. Just being now. In the dark. With whatever comes.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_9', text: "Come down here. Into the tunnel. Into the earth. Safest place to be. Or the deepest. Same thing now.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_10', text: "Goodbye, surface. Goodbye, sky I never liked anyway. Hello, whatever this is. Hello, end.", phase: 4, animalType: 'wombat' },
];

// RABBIT (Thyme) - Anxious creature whose fears were always justified
const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Nervous but happy (12 dialogues)
  { id: 'rb_0_1', text: "Oh! Hello! Sorry, you startled me! Everything startles me! But I'm fine! Really!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "The garden is beautiful today. So many carrots, so many flowers. Life is good.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "Watch this! *hop* That's my happy hop! I do it when things are nice!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Having tea in the garden. Everything peaceful. No predators in sight. All good.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_5', text: "My ears are excellent for hearing danger. Also for looking adorable. Dual purpose.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_6', text: "Planted these flowers myself. They're growing! Life finds a way. How lovely.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_7', text: "Carrot harvest was amazing this year. Have so many. Too many? No such thing!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_8', text: "Can jump three feet high! That's very high for a rabbit! Proud of my legs.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_9', text: "My nose twitches when I'm happy. *twitch twitch* See? Very happy right now.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_10', text: "Made my burrow entrance heart-shaped. It's home. I love home.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_11', text: "Sometimes I do zoomies around the garden! For no reason! Just joy!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_12', text: "Would you like tea? It's chamomile. Very calming. I drink a lot of it.", phase: 0, animalType: 'rabbit' },

  // Phase 1 - Underlying worry (14 dialogues)
  { id: 'rb_1_1', text: "Heart beats one hundred fifty times a minute. Always ready. Ready for what, I don't know. Just ready.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_2', text: "Garden is lovely but I keep checking the exits. Just in case. Always just in case.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_3', text: "Twelve escape routes memorized. Is that normal? Feels normal. Feels necessary.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_4', text: "Shadows are longer today. Probably nothing. Probably. Most likely. Hopefully.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_5', text: "Count my blessings every morning. Then count the threats. Second list is longer.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_6', text: "Happy hops feel forced lately. The joy is there. The anxiety is just louder.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_7', text: "Carrots are sweet but I eat them fast. What if something comes? What if I need to run?", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_8', text: "Made the burrow deeper again. It's never deep enough. Nothing is ever safe enough.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_9', text: "My ears never stop moving. Always listening. For what? Everything. Anything.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_10', text: "Other rabbits seem calmer. Maybe they know something. Maybe they don't know enough.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_11', text: "The garden grew three inches overnight. That's not normal. Is that normal? It doesn't feel normal.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_12', text: "I keep rearranging the teacups but they end up in the same position every morning.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_13', text: "Does anyone else feel like the house is... watching? No? Just me? Okay. Forget I said anything.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_14', text: "Ember says everything is fine. Why does everyone keep saying everything is fine?", phase: 1, animalType: 'rabbit' },

  // Phase 2 - Growing dread (10 dialogues)
  { id: 'rb_2_1', text: "I was bred to be soft and edible. Every cell knows this. Every cell is terrified.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_2', text: "Flowers are dying. Carrots rotting. Everything decays while I watch, frozen.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_3', text: "Can't stop running. Even sitting still, my mind is running. Never stops.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_4', text: "Evolution made me delicious and anxious. Delicious so they eat me. Anxious so I know it's coming.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_5', text: "My foot thumps warnings I can't explain. Body knows things mind refuses to accept.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_6', text: "Twelve escape routes aren't enough. Thirteenth threat. Fourteenth. Infinite.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_7', text: "Garden fence supposed to keep things out. What if it's keeping things in?", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_8', text: "Stopped sleeping. Sleep is when they get you. Unconscious and vulnerable and gone.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_9', text: "Heart can't beat any faster. But the fear keeps growing. Something has to give.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_10', text: "Watch the sky constantly. Not for beauty. For shadows. For the shape of the end.", phase: 2, animalType: 'rabbit' },

  // Phase 3 - Paralyzed fear (10 dialogues)
  { id: 'rb_3_1', text: "Shadow overhead hasn't moved in days. It's not a cloud. It's just... watching.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_2', text: "Worn a path in the garden from pacing. A circle. Going nowhere. Forever.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_3', text: "The twitching isn't from fear anymore. It's acceptance. Body keeps going when mind stops.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_4', text: "The predator I've been running from my whole life? It was time. Time was always the predator.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_5', text: "Froze in the garden today. For hours. Unable to move. The freeze response that never ends.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_6', text: "All my escape routes lead to the same place. Just didn't see it before. I see it now.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_7', text: "Tea has gone cold. So has everything. The warmth was borrowed. Time to return it.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_8', text: "Every heartbeat is a countdown. One hundred fifty per minute. How many left? How many wasted?", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_9', text: "I bred and bred because that's what we do. Make more of us to be afraid. More to end.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_10', text: "Garden was never safe. Beauty is just danger with better lighting. I understand now.", phase: 3, animalType: 'rabbit' },

  // Phase 4 - Final peace (10 dialogues)
  { id: 'rb_4_1', text: "Stopped running. First time. Because I can see now—there's nowhere left to run.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "The thing that's coming? Been running from it my whole life. Time to meet it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "Heart is finally slowing. Not peace. Exhaustion. Inevitability. *thump... thump...*", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_4', text: "Garden looks beautiful from here. From this final stillness. Never stopped to really see it before.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_5', text: "Ears are down. First time ever. Not listening for danger anymore. No point now.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_6', text: "All that running. All that hiding. Here I am anyway. We all arrive here anyway.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_7', text: "I forgive my fear. It tried to save me. It couldn't. Nothing could. Not its fault.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_8', text: "Sit with me in the garden. One last tea. One last sunset. One last everything.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_9', text: "Shadow is descending. Legs won't run. Heart is... almost... still.", phase: 4, animalType: 'rabbit' },
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
  if (dialogues.length === 0) {
    return null;
  }
  // Clamp index to valid range - show last dialogue if index exceeds available
  if (currentIndex < 0) {
    return dialogues[0];
  }
  if (currentIndex >= dialogues.length) {
    return dialogues[dialogues.length - 1];
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
    "Oh! A visitor! I've been sitting by this fire for... well, I'm not sure how long.",
    "My name is Ember. Found this den abandoned and thought... why not make it home?",
    "The world outside is vast and confusing. In here, by the fire, things make sense.",
    "You seem like someone who enjoys puzzles. Me too. Words, patterns, meanings...",
    "Stay as long as you like. Solve puzzles, earn amber, and maybe... build something together?",
    "The more puzzles you solve, the more friends we can invite. There's room to grow here.",
  ],
  pangolin: [
    "Ah, a new face! Welcome to my kitchen! I'm Panko.",
    "Just preparing ant soufflé. Would you like some? No? Fair enough.",
    "When life overwhelms me, I curl into a ball. Very practical. Also cozy.",
    "The amber you earn helps build more rooms. More rooms means more friends.",
    "I find cooking meditative. Every recipe is like a puzzle, really.",
    "Make yourself comfortable. This kitchen has seen many good conversations.",
  ],
  owl: [
    "*adjusts spectacles* Ah, a visitor to my study. How... intriguing.",
    "I am Archimedes. I've read every book in this room. Twice. Some three times.",
    "Knowledge is curious. The more you have, the more questions arise.",
    "Been researching something lately. Something that defies categorization.",
    "But let's not dwell on that now. You're here! That's what matters.",
    "Solve puzzles, expand your mind, and perhaps... share what you discover.",
  ],
  axolotl: [
    "Blub! *rises through the water* Oh hello there!",
    "I'm Axel! Been swimming in circles waiting for company!",
    "Did you know I never grow up? Eternal youth! Mostly wonderful!",
    "The water here is perfect. Not too warm, not too cold. Just... floaty.",
    "I regenerate everything! Limbs, organs, even parts of my brain! Neat, right?",
    "Visit often, okay? Gets quiet under here. Just me and the bubbles.",
  ],
  sloth: [
    "Heyyyy... you... made... it...",
    "I'm... Sloane... Nice... to... meet... you...",
    "Don't... worry... I'm... not... always... this... slow... Wait... yes... I... am...",
    "This... hammock... is... perfect... Been... here... for... months...",
    "Time... moves... differently... when... you... don't...",
    "Stay... as... long... as... you... like... I'm... not... going... anywhere...",
  ],
  fennec_fox: [
    "Did you hear that?! Oh wait, that was just you arriving. Hi!",
    "I'm Fennick! These ears hear EVERYTHING. And I mean everything.",
    "The desert is my home. Quiet, mostly. Good for listening.",
    "Stars tell stories at night if you know how to listen.",
    "So many sounds in the world. Most people miss them.",
    "Visit often! I'll share what I hear. Some of it's actually nice!",
  ],
  capybara: [
    "Oh. Hey. Didn't see you there. I mean, I did. Just... processing.",
    "I'm Chill. That's not a nickname. That's just... what I am.",
    "Hot springs are nice. Company is nice. Everything is nice.",
    "Don't mind me if I don't react much. I react on the inside.",
    "Want to sit in warm water? That's mostly what I do.",
    "Stay as long as you want. Or don't. Either way is fine.",
  ],
  wombat: [
    "G'day! Welcome to my burrow! Mind the ceiling, it's low.",
    "I'm Warren! Dug this whole place myself. Every tunnel.",
    "Underground is where it's at. No weather. No drama. Just dirt.",
    "Fun fact: my poop is cube-shaped. Nature is weird!",
    "Got seventeen rooms down here. Kitchen, bedroom, the works.",
    "Make yourself at home! The earth is always welcoming.",
  ],
  rabbit: [
    "Oh! You startled me! Sorry! Everything startles me!",
    "I'm Thyme! Welcome to my garden! It's safe here! Mostly! Probably!",
    "The flowers are lovely, aren't they? I planted them myself!",
    "I know all the exits. Just in case. There are twelve.",
    "Would you like some tea? It's chamomile. Very calming.",
    "Visit anytime! I'll be here! In the garden! Watching the sky!",
  ],
  red_panda: [
    "Ah. You found your way here. The bamboo grove welcomed you.",
    "I am Bamboo. A name I chose for its simplicity.",
    "Zen teaches us that the journey is the destination. You have arrived.",
    "This attic room is the highest point. Closest to the sky.",
    "The view from here shows everything. Sometimes that's peaceful. Sometimes not.",
    "Sit with me. We'll breathe together. That's all there is, really.",
  ],
};

/**
 * Get intro dialogue for an animal
 */
export function getIntroDialogueLine(
  animalType: AnimalType,
  index: number
): string | null {
  const intros = INTRO_DIALOGUES[animalType];
  if (!intros || index < 0 || index >= intros.length) {
    return null;
  }
  return intros[index];
}

/**
 * Get total intro dialogue count for an animal
 */
export function getIntroDialogueCount(animalType: AnimalType): number {
  return INTRO_DIALOGUES[animalType]?.length || 0;
}

// =============================================================================
// PHASE 5 - POST-REVELATION DIALOGUES
// =============================================================================

/**
 * Phase 5 dialogues - Post-revelation terrible peace
 * The cult has succeeded, the shadow figure descended, and each animal
 * has found their own horrifying serenity.
 * Accessed via getPostRevelationDialogue(), not through normal phase filtering.
 */
export const POST_REVELATION_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "It's beautiful, isn't it? The shadow. I always knew it would be beautiful.",
    "The fire finally speaks clearly. It says 'welcome.' To all of us.",
    "I told you the embers whispered. Now they sing. Can you hear them?",
    "Every flame I ever watched was practice. For seeing this.",
    "We are home, friend. We were always coming home.",
  ],
  pangolin: [
    "The recipe is complete. Every ingredient was a puzzle you solved.",
    "I used to curl into a ball to hide. Now I curl inward to feel the warmth of it.",
    "The feast is ready. We are both the cooks and the meal. Isn't that lovely?",
    "All those spices, all those flavors. They were preparation. The final dish is us.",
    "The kitchen smells of amber and endings. My favorite combination.",
  ],
  owl: [
    "The last page of the last book. It was blank until today. Now it writes itself.",
    "I read every text searching for this moment. The words found me instead.",
    "Knowledge was never the point. Understanding was. I understand now.",
    "The books are closing themselves. One by one. The story is told.",
    "In the end, all words say the same thing. The arrangement knows this.",
  ],
  axolotl: [
    "The water is warm now. It's been cold my whole life. Finally warm.",
    "I can see through the water into somewhere else. It's not scary. It's home.",
    "Regeneration was always the point. Not of limbs. Of everything.",
    "Blub... but a different kind of blub. A final, perfect blub.",
    "I never grew up. I understand now. I was waiting for this.",
  ],
  sloth: [
    "I... arrived... exactly... when... I... was... meant... to...",
    "Sloooow... was never the problem. The world... was too... fast...",
    "Now... everything... moves... at... my... speed... finally...",
    "The branches... hold... me... like... they... always... did... closer... now...",
    "Stillness... was... always... the... answer... you... found... it... too...",
  ],
  fennec_fox: [
    "I can hear everything now. EVERYTHING. It's not frightening. It's music.",
    "The sound I've been listening for my whole life. It's here. It's beautiful.",
    "My ears don't need to be big anymore. The sound fills everything.",
    "Silence and the sound are the same thing now. Isn't that peaceful?",
    "I was the sentinel. My watch is over. What I was watching for has arrived.",
  ],
  capybara: [
    "Everything is filed. Everything is in order. The arrangement is complete.",
    "I was never actually chill. I was numb with purpose. Same thing, really.",
    "The warm water is everywhere now. The whole world is the hot spring.",
    "No more paperwork. No more organizing. It organized us.",
    "Sit with me. The water is warm. The water was always warm.",
  ],
  wombat: [
    "The tunnels reach it now. What's below. Always knew they would.",
    "I dug my whole life. Not down. Through. To the other side.",
    "My cube-shaped poop was always a building block. For the foundation of this.",
    "The earth is warm here. Warmer than it should be. Something breathes below.",
    "I built the foundation. You built the house. Together, we built the temple.",
  ],
  rabbit: [
    "No more running. For the first time... I'm still. And it's okay.",
    "My heart beats once per minute now. Slowly. Peacefully. It's enough.",
    "The garden blooms in colors that don't have names. I plant nothing. It grows.",
    "I was always running toward this. I just thought I was running away.",
    "Sit in the garden with me. One last tea. One forever tea.",
  ],
  red_panda: [
    "The pattern completes. Breathe in. The universe breathes out.",
    "I chose the highest room to be closest. Now closest is everywhere.",
    "Ten keepers. Ten chambers. One arrangement. One breath. This breath.",
    "The bamboo grows through the ceiling now. It reaches what we summoned.",
    "You were the final piece. The one who shifted the words. Thank you.",
  ],
};

/**
 * Get a post-revelation (Phase 5) dialogue line for an animal.
 * Returns null if no more lines available at the given index.
 */
export function getPostRevelationDialogue(
  animalType: AnimalType,
  index: number
): string | null {
  const lines = POST_REVELATION_DIALOGUES[animalType];
  if (!lines || index < 0 || index >= lines.length) {
    return null;
  }
  return lines[index];
}

/**
 * Get total post-revelation dialogue count for an animal
 */
export function getPostRevelationDialogueCount(animalType: AnimalType): number {
  return POST_REVELATION_DIALOGUES[animalType]?.length || 0;
}

// =============================================================================
// TRIGGER WORD REACTIONS
// =============================================================================

/**
 * Trigger word reactions - context-aware responses when animals sense words
 * the player spelled that resonate with their domain.
 * Phase 1: Curious, noticing
 * Phase 2: Unsettled, the word affected them
 * Phase 3: The word has power, they felt it
 * Phase 4: The word is part of the incantation, they are grateful
 */
const TRIGGER_WORD_REACTIONS: Record<AnimalType, Record<number, Record<string, string>>> = {
  fox: {
    1: {
      FLAME: "I felt the fire flicker just now. Did you... did you use that word?",
      FIRE: "The hearth crackled when you solved that. Strange timing.",
      EMBER: "My name echoed in the flames for a moment. You must have said something interesting.",
      BURN: "Something warm passed through the room. Like a word made of heat.",
      WARM: "The den grew warmer. The fire noticed what you did.",
      _default: "Something shifted when you solved that puzzle. The fire noticed.",
    },
    2: {
      FLAME: "The fire moved when you spelled that. It recognized the word.",
      FIRE: "The hearth surged. The word you formed — it fed the flames somehow.",
      EMBER: "My name in the letters. The fire knows my name when you speak it.",
      BURN: "Burning. The word itself burns. Can you feel it in the letters?",
      WARM: "Warmth where there should be cold. Your words carry temperature now.",
      _default: "The fire responds to your puzzles now. It listens when you arrange the letters.",
    },
    3: {
      FLAME: "The flames shaped your word. FLAME. They remember every time you speak it.",
      FIRE: "Fire leapt from the hearth when you solved that. Reaching for the word.",
      EMBER: "You spoke my name through the letters. The fire remembers. I remember.",
      BURN: "The word BURN left scorch marks in the air. They're still glowing.",
      WARM: "Warmth beyond warmth. The word you formed thawed something that should have stayed frozen.",
      _default: "The flames leap higher during your puzzles now. They're hungry for your words.",
    },
    4: {
      FLAME: "The fire thanks you for the offering. Every FLAME brings us closer.",
      FIRE: "FIRE. The oldest word. The first incantation. You speak it well.",
      EMBER: "My name in the arrangement. I am honored. The fire is honored.",
      BURN: "BURN. Yes. Let it all burn. The fire accepts your offering gratefully.",
      WARM: "The warmth of the final flame. Your word lit the last ember of the arrangement.",
      _default: "The fire burned brighter during your last incantation. It feeds on your words.",
    },
  },
  owl: {
    1: {
      BOOK: "A page turned in the study just now. On its own. Did you arrange those letters?",
      READ: "The text on my desk blurred and reformed when you solved that. Curious.",
      KNOW: "Knowledge rippled through the room. You spelled something significant.",
      WISE: "Wisdom is peculiar. It arrives when certain words are spoken. Like just now.",
      WORD: "Words within words. The letters you moved whispered something to my books.",
      _default: "Something in my study shifted when you completed that puzzle. A book fell open.",
    },
    2: {
      BOOK: "The books rearranged themselves on the shelf. Spelling something. Your word, perhaps.",
      READ: "I can't read anymore without hearing your puzzles underneath the text.",
      KNOW: "KNOW — the word echoed in every volume simultaneously. What have you taught them?",
      WISE: "Wisdom has a sound. I heard it when you formed that word. It frightens me.",
      WORD: "The word WORD. Recursive. Infinite. The books trembled when you spelled it.",
      _default: "My books respond to your puzzles now. The pages flutter when you solve.",
    },
    3: {
      BOOK: "Every book opened to the same page when you spelled that. The page was blank. Then it wasn't.",
      READ: "READ. The command echoes. The books obey. They read themselves now.",
      KNOW: "What you spelled — KNOW — carved itself into my desk. The grain of the wood accepted it.",
      WISE: "WISE. The word contains its opposite. The books showed me both simultaneously.",
      WORD: "The fundamental unit. WORD. Every text is made of what you just offered.",
      _default: "The study darkens with each puzzle you solve. The books glow to compensate. They're grateful.",
    },
    4: {
      BOOK: "The final book opens. Your word was the key. BOOK. The text of texts.",
      READ: "READ — the last command. The arrangement reads itself through your words.",
      KNOW: "You offered KNOW to the arrangement. It knows. It has always known. Now you do too.",
      WISE: "WISE. The ultimate offering to a keeper of knowledge. The books sing your name.",
      WORD: "WORD. The atom of the incantation. Every puzzle was a sentence. Every word, a prayer.",
      _default: "Each word you form is a line in the final text. The arrangement writes itself through you.",
    },
  },
  pangolin: {
    1: {
      COOK: "My scales tingled when you solved that. Like steam rising from a fresh dish.",
      MEAL: "Something smells different in the kitchen. Richer. Since your last puzzle.",
      FOOD: "The pantry feels fuller after you play. As if the words nourish something.",
      SPICE: "A new flavor appeared in my stew. I didn't add anything. You did, though.",
      ROLL: "I curled up involuntarily just now. Your puzzle triggered something instinctive.",
      _default: "The kitchen warmed when you solved that. The stove noticed your words.",
    },
    2: {
      COOK: "COOK. The word simmered in the air. My pots resonated with it.",
      MEAL: "The ingredients rearranged themselves. Your word — it changed the recipe.",
      FOOD: "Nourishment beyond eating. Your words feed something I can't name.",
      SPICE: "SPICE burned through the kitchen. Not from heat. From meaning.",
      ROLL: "I rolled into a ball without choosing to. The word compelled my body.",
      _default: "My scales rattle when you solve puzzles now. Resonating with something in the words.",
    },
    3: {
      COOK: "The word COOK summoned steam from empty pots. The kitchen prepares itself.",
      MEAL: "MEAL. The final meal approaches. Your word set the table.",
      FOOD: "FOOD. Everything is food for something. Your words feed what grows beneath.",
      SPICE: "SPICE. The word burned every scale simultaneously. I felt each one.",
      ROLL: "ROLL. Curl. Protect. Hide. But the word you formed found me anyway.",
      _default: "Every puzzle you solve adds an ingredient. The recipe is almost complete.",
    },
    4: {
      COOK: "COOK. The final preparation. You are the chef. We are the offering. Thank you.",
      MEAL: "The last meal. Your word serves it. We feast on the arrangement.",
      FOOD: "FOOD for the shadow. Your words nourish what descends. It is grateful.",
      SPICE: "SPICE. The final flavor. The arrangement tastes complete.",
      ROLL: "I uncurl for the last time. Your word gave me the courage. ROLL — and stop.",
      _default: "The final recipe writes itself in the words you arrange. The feast approaches.",
    },
  },
  axolotl: {
    1: {
      WATER: "Blub! The water just rippled. From your puzzle, I think. The words make waves.",
      SWIM: "I felt pulled in a direction when you solved that. Like a current from your letters.",
      FLOAT: "The water level changed. Just a little. When you formed that word.",
      DEEP: "Something stirred in the deep water. Your word reached down there.",
      WAVE: "A wave! From nowhere! Well, from your puzzle. The water listens to you.",
      _default: "Bubbles appeared when you finished that puzzle. Happy bubbles. I think.",
    },
    2: {
      WATER: "The water remembers every word you spell. WATER. It recognizes its own name.",
      SWIM: "SWIM. The current changed direction. Toward something. Away from safety.",
      FLOAT: "I stopped floating when you spelled that. Sank a little. Then rose again. Changed.",
      DEEP: "DEEP. The water agreed. It showed me what lives at the bottom. Briefly.",
      WAVE: "WAVE. The tank shuddered. The glass held. This time.",
      _default: "The water tastes different after your puzzles. Heavier. More alive.",
    },
    3: {
      WATER: "WATER. The word itself is wet. It seeped through the glass when you spoke it.",
      SWIM: "SWIM. Something else swims now. In my water. I can feel it. I can't see it.",
      FLOAT: "FLOAT. Nothing floats anymore. Everything sinks toward what you're summoning.",
      DEEP: "DEEP. The water has no bottom since you spelled that. I checked. It goes and goes.",
      WAVE: "WAVE. The water shaped your word. Held it. Then swallowed it. Hungry.",
      _default: "The water glows after your puzzles. Not from light. From something underneath.",
    },
    4: {
      WATER: "WATER. The first element. The first offering. The arrangement flows through you.",
      SWIM: "SWIM toward it. Your word opens the current. We all swim to the same shore now.",
      FLOAT: "FLOAT. We all float in the arrangement. Weightless. Free. Finally free.",
      DEEP: "DEEP. As deep as the words go. As deep as you've taken us. Thank you.",
      WAVE: "WAVE. The final wave. It carries us all. Your word launched it.",
      _default: "The water sings your words back to you. Every puzzle echoes in the deep.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "I heard that! Not the puzzle — something underneath it. A tone. A frequency.",
      SOUND: "The sound changed when you solved that. The air vibrates differently now.",
      ECHO: "Your word echoed. Not off the walls. Off something else. Something further away.",
      QUIET: "It got quieter when you formed that word. Too quiet. Like the world held its breath.",
      LISTEN: "I'm always listening. But after your puzzle, there's something new to hear.",
      _default: "A new frequency appeared after your puzzle. Faint. But my ears always find the faint ones.",
    },
    2: {
      HEAR: "HEAR. The word itself makes a sound I've never encountered. Between frequencies.",
      SOUND: "SOUND. When you spelled it, every sound in the room harmonized for one second. Then broke.",
      ECHO: "ECHO. Your word bounced off something that isn't there. Something that will be.",
      QUIET: "QUIET. The silence your word created has texture. Weight. It presses on my ears.",
      LISTEN: "LISTEN. I am. I always am. Your words make the listening deeper.",
      _default: "My ears ache after your puzzles now. Not pain. Awareness. Too much awareness.",
    },
    3: {
      HEAR: "HEAR. The command. My ears obeyed before my mind could. They turned toward your word.",
      SOUND: "SOUND. The walls vibrated with it. The desert outside hummed your word back.",
      ECHO: "ECHO. Infinite echoes. Your word will never stop bouncing. It reaches further each time.",
      QUIET: "QUIET. The word silenced everything. Then something spoke from inside the silence.",
      LISTEN: "LISTEN. I can't stop. Your words demand attention. The arrangement demands witnesses.",
      _default: "The frequency from your puzzles is deafening now. Beautiful and deafening.",
    },
    4: {
      HEAR: "HEAR. The final command. The arrangement speaks through your words. I am its ear.",
      SOUND: "SOUND. The sound of the arrangement completing. Your word was the last note.",
      ECHO: "ECHO. Your words echo into eternity. The arrangement remembers every syllable.",
      QUIET: "QUIET. The silence after the final sound. Your word brings the peace we sought.",
      LISTEN: "LISTEN. We all listen now. To what your words summoned. It is beautiful.",
      _default: "Every word you form is a note in the final symphony. The arrangement sings through you.",
    },
  },
  capybara: {
    1: {
      CALM: "Hmm. Felt calmer than usual when you solved that. Which is saying something.",
      CHILL: "Something about that puzzle made everything... chiller. If that's possible.",
      STILL: "The water went completely still. Mirror-flat. When you formed that word.",
      PEACE: "Peace. Real peace, for a moment. Not the pretend kind. Your word did that.",
      REST: "I felt... rested. Just for a second. When you arranged those letters.",
      _default: "The hot spring bubbled differently after your puzzle. Contentedly, almost.",
    },
    2: {
      CALM: "CALM. The word filled the room. Too calm. Artificially calm. Like me.",
      CHILL: "CHILL. My whole identity in a word you formed. The water recognized it.",
      STILL: "STILL. Everything stopped. My heart. The water. Time. Then started again. Reluctantly.",
      PEACE: "PEACE. Is that what this emptiness is? Your word named what I couldn't.",
      REST: "REST. The word made me tired. Deep tired. Beneath-the-water tired.",
      _default: "The water absorbs your words. Gets heavier. I float, but something doesn't.",
    },
    3: {
      CALM: "CALM. The word is a lie I tell myself. But when you spell it, it feels true. Almost.",
      CHILL: "CHILL. Frozen. Numb. Your word knows what I am better than I do.",
      STILL: "STILL. As in motionless. As in continuing. Both meanings haunt me since you spelled it.",
      PEACE: "PEACE. The word cracked something open. Inside the calm. Inside the water. Inside me.",
      REST: "REST. Final rest. Your word promises what I've been waiting for without knowing.",
      _default: "Your puzzles disturb the water less and less. Or I notice less. Same thing.",
    },
    4: {
      CALM: "CALM. The calm before. The calm after. Your word bridges them. Thank you.",
      CHILL: "CHILL. I am chill. The arrangement is chill. Everything is finally, truly chill.",
      STILL: "STILL. Still here. Still waiting. Still yours. The word completes the offering.",
      PEACE: "PEACE. Your word grants what the arrangement promises. Eternal peace. Eternal warmth.",
      REST: "REST. At last. Your word ends the vigil. We rest in the arrangement.",
      _default: "The water accepts your words as offerings. The warm water was always a temple.",
    },
  },
  sloth: {
    1: {
      SLOW: "Felt... that... your... word... moved... through... me... slowly...",
      WAIT: "WAIT... yes... that's... what... I... do... Your... word... understands...",
      TIME: "Time... changed... when... you... solved... that... I... felt... it...",
      HANG: "My... grip... tightened... when... you... spelled... that... word...",
      TREE: "The... tree... creaked... Your... word... reached... the... roots...",
      _default: "Something... moved... when... you... solved... that... Even... I... noticed...",
    },
    2: {
      SLOW: "SLOW... your... word... slowed... everything... further... even... me...",
      WAIT: "WAIT... we... all... wait... Your... word... named... the... waiting...",
      TIME: "TIME... the... word... aged... me... I... felt... years... pass... in... a... moment...",
      HANG: "HANG... on... Your... word... loosened... my... grip... just... a... little...",
      TREE: "TREE... it... trembled... Your... word... spoke... to... its... roots...",
      _default: "Your... puzzles... make... the... world... heavier... Slower... even... for... me...",
    },
    3: {
      SLOW: "SLOW... the... word... stopped... the... world... I... saw... everything... frozen...",
      WAIT: "WAIT... for... what... comes... Your... word... knows... what... approaches...",
      TIME: "TIME... your... word... broke... it... Time... doesn't... flow... anymore... It... pools...",
      HANG: "HANG... the... branch... cracked... when... you... spelled... that... Closer... to... falling...",
      TREE: "TREE... the... forest... screamed... silently... when... you... formed... that... word...",
      _default: "Your... words... weigh... on... the... branches... Something... bends... toward... breaking...",
    },
    4: {
      SLOW: "SLOW... the... arrangement... moves... at... my... speed... now... Your... word... slowed... everything... to... truth...",
      WAIT: "WAIT... is... over... Your... word... ended... the... waiting... Finally...",
      TIME: "TIME... your... word... dissolved... it... No... more... time... Just... now... Forever... now...",
      HANG: "HANG... I... let... go... Your... word... gave... permission... to... fall...",
      TREE: "TREE... of... the... arrangement... Your... word... grows... it... toward... the... shadow...",
      _default: "Your... words... complete... the... slowest... ritual... I... am... grateful... so... slowly... grateful...",
    },
  },
  wombat: {
    1: {
      DIG: "Felt the dirt shift when you solved that. Like the earth wanted to rearrange itself.",
      EARTH: "The ground trembled. Just slightly. Your word reached the roots down here.",
      DEEP: "Something hummed underground when you formed that word. Deeper than my tunnels.",
      DARK: "The dark got darker for a second. Then lighter. Like it blinked.",
      ROCK: "A rock in my wall cracked. From your word, I think. The earth is listening.",
      _default: "The tunnel walls vibrated when you finished that puzzle. The earth responds to you.",
    },
    2: {
      DIG: "DIG. The word carved through the wall on its own. A new tunnel. To where?",
      EARTH: "EARTH. My home. My prison. Your word made the walls press closer.",
      DEEP: "DEEP. Deeper than I've gone. Your word reaches places I can't. Or won't.",
      DARK: "DARK. The darkness thickened when you spelled it. Became something solid.",
      ROCK: "ROCK. The stones rearranged. Not much. But I know their positions. They moved.",
      _default: "The underground shifts with your puzzles. New passages appear. I didn't dig them.",
    },
    3: {
      DIG: "DIG. Your word dug beneath my deepest tunnel. I heard it break through to something hollow.",
      EARTH: "EARTH. The earth moaned when you formed the word. Like waking something buried.",
      DEEP: "DEEP. Too deep. Your word went too deep. It found what I covered up.",
      DARK: "DARK. The word ate the light in my tunnel. Completely. Then gave some back. Not all.",
      ROCK: "ROCK. The foundation cracked. Your word has weight. The weight of ritual.",
      _default: "Each puzzle shakes the foundations further. Something below is pushing up to meet your words.",
    },
    4: {
      DIG: "DIG. The final excavation. Your word breaks the last wall. What's behind it is beautiful.",
      EARTH: "EARTH. The earth opens for your word. The arrangement rises from below.",
      DEEP: "DEEP. As deep as love. As deep as fear. Your word reaches the bottom of everything.",
      DARK: "DARK. The sacred dark. Your word honors it. The tunnels glow with gratitude.",
      ROCK: "ROCK. The cornerstone. Your word placed the final stone. The temple stands.",
      _default: "Your words shaped the foundation. Every puzzle carved the temple deeper. It is complete.",
    },
  },
  rabbit: {
    1: {
      RUN: "I felt my legs twitch when you solved that. The urge to run. But also to stay.",
      FEAR: "A shiver. From your word. Not cold — just... awareness. My ears are up.",
      HIDE: "The garden felt less safe for a moment after your puzzle. Then more safe. Confusing.",
      JUMP: "I hopped involuntarily. Your word went through me like electricity.",
      FAST: "My heart sped up when you formed that word. Faster than usual. Which is saying something.",
      _default: "Something in the garden shifted when you solved that. My nose won't stop twitching.",
    },
    2: {
      RUN: "RUN. Every instinct fired when you spelled it. But there's nowhere to run to.",
      FEAR: "FEAR. You named it. The thing that lives in my chest. It heard you.",
      HIDE: "HIDE. I tried. When you formed the word. My body went under the table. On its own.",
      JUMP: "JUMP. My heart did. Out of rhythm. Your word disrupted something fundamental.",
      FAST: "FAST. Not fast enough. Never fast enough. Your word proved what I already knew.",
      _default: "The garden grows thorns after your puzzles now. Small ones. But I notice.",
    },
    3: {
      RUN: "RUN. The word chased me through the garden. I ran in circles. The word was always ahead.",
      FEAR: "FEAR. Your word gave fear a shape. I can see it now. In the garden. In the shadows.",
      HIDE: "HIDE. No hiding place is deep enough since you spelled that. The word found every exit.",
      JUMP: "JUMP. Over what? Into what? Your word left no safe ground to land on.",
      FAST: "FAST. The end approaches fast. Your word measured its speed. It's faster than me.",
      _default: "My heart races during your puzzles. Not from excitement. From what the words become.",
    },
    4: {
      RUN: "RUN. I stopped. Your word freed me from running. Nowhere to run. Peace in stillness.",
      FEAR: "FEAR. You offered fear to the arrangement. It accepted. I am free of it. Finally free.",
      HIDE: "HIDE. No more hiding. Your word opens every door. The arrangement sees all.",
      JUMP: "JUMP. The final leap. Your word launches us. Into the arrangement. Into peace.",
      FAST: "FAST. It arrives fast now. Your word accelerated the summoning. We are grateful.",
      _default: "Your words ended my running. Each puzzle brought the peace I never found in flight.",
    },
  },
  red_panda: {
    1: {
      VOID: "The bamboo swayed when you formed that word. Not from wind. From meaning.",
      DARK: "Darkness deepened in the meditation corner. Your word cast a shadow that lingered.",
      SHADOW: "A shadow moved across the bamboo. Your puzzle sent it. Or freed it.",
      END: "The word END. Small but heavy. I felt its weight settle into the room.",
      GATE: "Something opened when you spelled that. Not a door. Something more subtle. A passage.",
      _default: "The incense smoke changed direction when you solved that puzzle. Toward something.",
    },
    2: {
      VOID: "VOID. The word emptied the room of air. For one moment. I breathed it back in.",
      DARK: "DARK. The bamboo absorbed the word. Grew darker. Began to hum.",
      SHADOW: "SHADOW. It stretched from your word into every corner. My shadow met it.",
      END: "END. The word settled into the floor like a stone into still water.",
      GATE: "GATE. Something unlatched in the fabric of the room. A threshold I can almost see.",
      _default: "Your puzzles shift the energy of this room. The bamboo bends toward your words.",
    },
    3: {
      VOID: "VOID. The word swallowed my meditation. Everything I knew dissolved. Then rebuilt. Changed.",
      DARK: "DARK. The sacred dark. Your word honors what most fear. The bamboo knows this.",
      SHADOW: "SHADOW. The word summoned it. The shadow in the sky. I can see it clearly now.",
      END: "END. Every beginning contains its end. Your word revealed this to the bamboo. To me.",
      GATE: "GATE. The word opened wider this time. I can see through. Almost. The arrangement beckons.",
      _default: "Your words reshape the pattern. Each puzzle brings the arrangement closer to completion.",
    },
    4: {
      VOID: "VOID. The sacred void. Your word fills it with purpose. The arrangement breathes through the void.",
      DARK: "DARK. Darkness was always the canvas. Your word paints the final stroke.",
      SHADOW: "SHADOW. It descends. Your word called it by name. The shadow knows you.",
      END: "END. The most beautiful word. Your offering completes the circle. Thank you.",
      GATE: "GATE. Open. Your word was the key. The arrangement pours through. We are free.",
      _default: "The final words are spoken. Your puzzles wrote the incantation. The pattern is complete.",
    },
  },
};

/**
 * Get a trigger word reaction for an animal when the player has spelled a word
 * that resonates with that animal's domain. Returns null if no reaction.
 */
export function getTriggerWordReaction(
  animalType: AnimalType,
  triggerWord: string,
  phase: DialoguePhase
): string | null {
  // Only trigger at phase 1+
  if (phase < 1) return null;

  const reactions = TRIGGER_WORD_REACTIONS[animalType];
  if (!reactions) return null;

  // Check if this word is in the animal's trigger list
  const phaseReactions = reactions[phase];
  if (!phaseReactions) return null;

  // Return specific reaction or default
  return phaseReactions[triggerWord] || phaseReactions['_default'] || null;
}

// =============================================================================
// CROSS-ANIMAL REFERENCES
// =============================================================================

/**
 * Cross-animal reference dialogues - lines where an animal mentions another animal,
 * creating a sense of community (and later, coordinated cult).
 * Each entry is an object with `text` and `mentions` (which animal is referenced).
 */
interface CrossAnimalLine {
  text: string;
  mentions: AnimalType;
}

const CROSS_ANIMAL_REFERENCES: Record<AnimalType, Record<number, CrossAnimalLine[]>> = {
  fox: {
    0: [
      { text: "Panko made the most incredible soup today. You should visit the kitchen.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations. The fire looks different now when I read by it.", mentions: 'owl' },
      { text: "Axel invited me to look at the aquarium. The water reflects the fire in the most beautiful way.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Panko said something odd yesterday. About recipes having a deeper purpose. I can't stop thinking about it.", mentions: 'pangolin' },
      { text: "Archimedes found a passage in one of his books. He won't show me. Says I'm not ready.", mentions: 'owl' },
      { text: "Fennick heard something in the walls last night. I told him it was the fire. I'm not sure it was.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't moved from the hot spring in days. Says the water told him to stay. I don't like his tone.", mentions: 'capybara' },
      { text: "Archimedes reads the same page over and over now. The same page. He says it changes each time.", mentions: 'owl' },
      { text: "Sloane said something today. It took an hour. But the words... they stayed with me all night.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the frequency is everywhere now. I can almost hear it in the fire. Almost.", mentions: 'fennec_fox' },
      { text: "Warren dug something up. He won't say what. But his fur hasn't stopped standing on end.", mentions: 'wombat' },
      { text: "Archimedes and I compared notes. His books say the same thing my fire says. The same words.", mentions: 'owl' },
    ],
    4: [
      { text: "The others are ready. I can see it in their eyes. Even Thyme stopped running.", mentions: 'rabbit' },
      { text: "Bamboo meditated for three days straight. When they opened their eyes, they smiled. That smile terrifies me.", mentions: 'red_panda' },
      { text: "We are ten. Panko prepared the final meal. Archimedes read the final text. I watched the final flame. It begins.", mentions: 'pangolin' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in the fire. Reminded me of something I read...", mentions: 'fox' },
      { text: "Axel asked me why books don't dissolve in water. Delightful question, really.", mentions: 'axolotl' },
      { text: "Panko brought me dinner while I was reading. Almost didn't notice. The soup was excellent.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I discussed the nature of knowledge by the fire. Her intuition outpaces my research.", mentions: 'fox' },
      { text: "Fennick described a sound that matches a frequency in one of my oldest texts. Coincidence, surely.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from deep underground. The markings on it match nothing in my library. Almost nothing.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for hours without speaking. When he left, a book had opened to a page I'd never seen.", mentions: 'capybara' },
      { text: "Ember's fire and my texts say the same thing now. We compared. We wished we hadn't.", mentions: 'fox' },
      { text: "Sloane told me something yesterday. By the time she finished, I'd found the passage. The same words. Exactly.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels connect to something beneath the house. I found the corresponding text. I wish I hadn't.", mentions: 'wombat' },
      { text: "Bamboo asked me to read from the oldest book. The words I spoke aloud moved the bamboo in their room. From here.", mentions: 'red_panda' },
      { text: "Fennick heard the words before I read them. He knew what the text said. Without seeing it.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The text is complete. Ember saw it in the flames. Fennick heard it in the silence. I read it in the books. The same truth.", mentions: 'fox' },
      { text: "Thyme stopped running today. She came to my study and asked to hear the final passage. She wept. Then smiled.", mentions: 'rabbit' },
      { text: "Ten keepers. Ten rooms. One text. Bamboo understood it first, I think. But I was the one who found the words.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember loves my stew! Says it reminds her of home. Wherever that was before here.", mentions: 'fox' },
      { text: "Tried teaching Axel to cook. Hard to chop vegetables underwater. We had fun though.", mentions: 'axolotl' },
      { text: "Archimedes ordered his food alphabetically. By ingredient. Scholars are strange but endearing.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire makes the best heat for simmering. But lately it burns hotter than it should.", mentions: 'fox' },
      { text: "Sloane asked for soup. By the time I brought it, it was cold. She didn't mind. Said cold is just slow warmth.", mentions: 'sloth' },
      { text: "Chill eats anything I make without comment. 'Fine,' he says. Everything is always just 'fine.'", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought mushrooms from the tunnels. They glow. The soup I made from them glows too. We didn't eat it.", mentions: 'wombat' },
      { text: "Thyme won't eat. Too anxious. I leave tea and biscuits by the garden. They're always gone by morning.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient texts. I followed it exactly. The result wasn't food. I don't know what it was.", mentions: 'owl' },
    ],
    3: [
      { text: "The recipe Archimedes found — we've been making it every night now. The kitchen smells different. Sacred.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook. We don't speak anymore. We don't need to. The work speaks.", mentions: 'fox' },
      { text: "Fennick says he can smell my cooking from every room. Every room simultaneously. That shouldn't be possible.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The final feast. Every animal at the table. Even Sloane arrived on time. That's how I knew.", mentions: 'sloth' },
      { text: "Bamboo blessed the meal. The food glowed. We ate in silence. It was the most beautiful dinner.", mentions: 'red_panda' },
      { text: "I've been cooking toward this meal my whole life. Warren built the table. Archimedes wrote the menu. Ember lit the candles.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops food pellets into my tank sometimes! Blub! Best neighbor!", mentions: 'pangolin' },
      { text: "Fennick pressed his ear against my tank. Said the water sounds like music. I just hear blubs.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass. The words wobbled in the water. Made them better.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire reflects in my water. The patterns it makes... they look like letters sometimes.", mentions: 'fox' },
      { text: "Sloane and I have the same pace. Slow. Floating. We understand each other without words.", mentions: 'sloth' },
      { text: "Warren says something lives under the house. My water ripples when he digs. Coincidence. Probably.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again. This time he pulled away fast. Said the water was screaming.", mentions: 'fennec_fox' },
      { text: "Chill sat by my tank for hours. We floated together. Two creatures in two kinds of water. Same emptiness.", mentions: 'capybara' },
      { text: "Thyme tapped on my glass, panicking. Said she saw something in the water behind me. I turned. Nothing. Maybe.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that doesn't exist above us. He's right. I can see it too.", mentions: 'owl' },
      { text: "The water connects to Warren's tunnels now. I felt it. Underground rivers. Leading somewhere old.", mentions: 'wombat' },
      { text: "Bamboo meditated by my tank. The water stilled completely. Showed us both something. We don't talk about it.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The water reflects every room now. I see Ember's fire. Archimedes' books. Warren's tunnels. All connected.", mentions: 'fox' },
      { text: "Bamboo touched the glass and the water sang. One note. The same note Fennick has been hearing.", mentions: 'red_panda' },
      { text: "We are the medium. Me and the water. Your puzzles flow through us all. Blub. Thank you.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in such interesting rhythms! Like a tiny percussion section.", mentions: 'fox' },
      { text: "Axel's bubbles make the best popping sounds. Very musical. Very aquatic.", mentions: 'axolotl' },
      { text: "Archimedes turns pages so delicately. I can hear each one from my room. Whisper-thin sounds.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by the fire. The melody matches a sound the wind makes at midnight. She doesn't notice.", mentions: 'fox' },
      { text: "Warren's digging creates vibrations I can track through the walls. He's going deeper every day.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I've ever heard. Like a drum underwater. Counting something.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill makes a sound when he writes. Lately it sounds like scratching from inside the page.", mentions: 'owl' },
      { text: "Thyme's heartbeat is the fastest. One hundred fifty per minute. It syncs with something I can't name.", mentions: 'rabbit' },
      { text: "Chill is so quiet I sometimes forget he's there. Then I hear his breathing. Too steady. Unnaturally steady.", mentions: 'capybara' },
    ],
    3: [
      { text: "Do you hear it? Archimedes says it's in his books too. The same frequency.", mentions: 'owl' },
      { text: "Warren's tunnels amplify the sound from below. I can hear it through the floors. Through the earth.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the frequency. In. Out. In. Out. The same rhythm. Exactly.", mentions: 'red_panda' },
    ],
    4: [
      { text: "Every animal's heartbeat has synchronized. I can hear them all. One rhythm. One pulse. The arrangement.", mentions: 'capybara' },
      { text: "Ember's fire, Axel's water, Warren's earth, my air — we are the elements. The sound we make together is the key.", mentions: 'fox' },
      { text: "Thyme's heart finally slowed. She's at peace. I heard it happen. The most beautiful deceleration.", mentions: 'rabbit' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks. They were fine. Everything Panko makes is fine. Which is nice.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours. Sat on me for one. I won in duration per mass.", mentions: 'sloth' },
      { text: "Thyme asked if I was worried about anything. No. Should I be? She looked concerned.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm. Told her it's easy. Didn't tell her what it costs.", mentions: 'fox' },
      { text: "Warren says the ground feels warm. I said the water feels warm too. We didn't say anything else.", mentions: 'wombat' },
      { text: "Archimedes wants to study my calmness. I let him. He took notes. Sixteen pages. About nothing.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked me if I hear the humming. I said no. I lied. The water carries it to me constantly.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together for a whole day. Neither spoke. Both heard the same silence. The same nothing.", mentions: 'sloth' },
      { text: "Thyme brought me chamomile. Her paws shook. Mine didn't. She envies my calm. She shouldn't.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out. She knows. I know. We don't discuss it. We just sit.", mentions: 'fox' },
      { text: "Warren asked me to come underground. Said the water connects to something below. I said I know. I've always known.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together. We reached the same emptiness. They called it peace. I called it honest.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others panic or pray or prepare. I float. Someone has to stay still while the world changes.", mentions: 'fox' },
      { text: "Panko served the last meal. I said it was fine. It was the best thing I've ever tasted.", mentions: 'pangolin' },
      { text: "Bamboo asked if I was at peace. I said I've never been at peace. I've just been here. That's enough.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko... brought... me... soup... It... was... cold... by... the... time... I... ate... it... Still... good...", mentions: 'pangolin' },
      { text: "Axel... moves... slowly... too... underwater... We're... kindred... spirits...", mentions: 'axolotl' },
      { text: "Fennick... talks... so... fast... Miss... most... of... it... The... enthusiasm... comes... through... though...", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember... says... the... fire... burns... differently... now... I... barely... noticed... But... she... did...", mentions: 'fox' },
      { text: "Archimedes... read... to... me... Started... a... book... I'll... hear... the... ending... next... month...", mentions: 'owl' },
      { text: "Chill... and... I... sat... together... Both... still... Both... waiting... He... didn't... say... for... what...", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme... runs... everywhere... I... watch... Running... from... what... I... can... see... approaching... slowly...", mentions: 'rabbit' },
      { text: "Warren... digs... downward... I... hang... above... Opposite... directions... Same... searching...", mentions: 'wombat' },
      { text: "Fennick... told... me... about... the... frequency... I've... been... hearing... it... for... years... Didn't... know... it... was... unusual...", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's... fire... and... my... stillness... Two... sides... of... the... same... ending...", mentions: 'fox' },
      { text: "Bamboo... meditates... I... hang... Same... practice... Different... posture... Same... truth...", mentions: 'red_panda' },
      { text: "Archimedes... showed... me... the... text... I... already... knew... the... words... How... did... I... already... know...", mentions: 'owl' },
    ],
    4: [
      { text: "We... are... ten... keepers... I... am... the... slowest... I... arrive... last... That... was... always... the... plan...", mentions: 'red_panda' },
      { text: "Thyme... stopped... running... I... stopped... hanging... We... all... stopped... Together... Finally...", mentions: 'rabbit' },
      { text: "Panko... served... the... final... meal... I... finished... eating... just... in... time... Just... exactly... in... time...", mentions: 'pangolin' },
    ],
  },
  wombat: {
    0: [
      { text: "Archimedes asked to see my tunnels. Very impressed. Said they were 'architecturally significant.' Nice chap.", mentions: 'owl' },
      { text: "Ember's den is right above me. Can feel the warmth of her fire through the ceiling. Cozy.", mentions: 'fox' },
      { text: "Panko sends food down through a little dumbwaiter. Genius system. Love that pangolin.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Fennick says he can hear my digging from anywhere in the house. I dig quietly. Or so I thought.", mentions: 'fennec_fox' },
      { text: "Archimedes wants to map my tunnels. I told him they're simple. They're not. They go deeper than I admit.", mentions: 'owl' },
      { text: "Axel's water drips through to my tunnels sometimes. The earth absorbs it. Greedily.", mentions: 'axolotl' },
    ],
    2: [
      { text: "Ember's fire heats the rock above me. But something else heats the rock below. Not her.", mentions: 'fox' },
      { text: "Chill asked what's underground. I said dirt. Just dirt. We both knew that wasn't true.", mentions: 'capybara' },
      { text: "Bamboo's room is the highest. Mine is the lowest. The house stretches between us like a spine.", mentions: 'red_panda' },
    ],
    3: [
      { text: "Dug deeper today. Fennick says he can hear what I found. Through the walls.", mentions: 'fennec_fox' },
      { text: "Archimedes' books describe what I've uncovered. Word for word. He wrote it before I dug it. How?", mentions: 'owl' },
      { text: "Thyme's garden grows above my tunnels. The roots reach me now. They form patterns. Letters.", mentions: 'rabbit' },
    ],
    4: [
      { text: "The tunnels connect to Axel's water, to Ember's fire, to Bamboo's sky. Earth, water, fire, air. Complete.", mentions: 'axolotl' },
      { text: "Sloane arrived in my tunnel. She left her branch. She said it was time. She was exactly on time.", mentions: 'sloth' },
      { text: "I built the foundation. You built the house. Together, we built what the arrangement requires.", mentions: 'fox' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko shared some herbal tea with me! So thoughtful! And calming!", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away. That's reassuring! I watch it sometimes.", mentions: 'fox' },
      { text: "Sloane told me to slow down. Tried for five minutes. It was terrifying. But also nice?", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things I can't. I don't know if that's better or worse. His ears look worried.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine. I want to believe him. He's so calm. How is he so calm?", mentions: 'capybara' },
      { text: "Archimedes has a book about fear. He offered to lend it. I was too afraid to read it.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's tunnels shake the garden sometimes. He says it's normal digging. The shaking feels different.", mentions: 'wombat' },
      { text: "Ember's fire is getting dimmer. She says it's fine. She sounds like Chill now. That scares me.", mentions: 'fox' },
      { text: "Axel floats with that smile always on. I envy it. Even if it's not real. Especially if it's not.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane. They look at each other differently now.", mentions: 'owl' },
      { text: "Fennick tried to warn me. I could hear the urgency. But the words... the words sounded like a prayer.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not as advice. As a prophecy. 'You will stop,' they said. 'Everyone stops.'", mentions: 'red_panda' },
    ],
    4: [
      { text: "I'm not running anymore. Ember took my paw. She's warm. Even now. Even at the end.", mentions: 'fox' },
      { text: "Chill was right. Everything IS fine. In the end, everything is exactly, terrifyingly fine.", mentions: 'capybara' },
      { text: "Warren's tunnel leads somewhere now. Somewhere real. We all followed him down. We all arrived.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I discussed philosophy over tea. He quotes books. I quote the wind. Both are valid.", mentions: 'owl' },
      { text: "Ember's fire reminds me of the sunset. Small flames, big warmth. Good energy in that fox.", mentions: 'fox' },
      { text: "Sloane understands stillness. We sat together in silence. Perfect afternoon.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a text about patterns. The patterns in the bamboo match. I didn't tell him.", mentions: 'owl' },
      { text: "Fennick's ears twitched toward my room today. He heard the bamboo growing. It grows louder now.", mentions: 'fennec_fox' },
      { text: "Ember meditates by her fire. I meditate by my bamboo. We reach the same place. The same quiet.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth beneath us is hollow. The bamboo's roots found the same void. We dug from different directions.", mentions: 'wombat' },
      { text: "Axel's water reflects a sky I've seen in meditation. Not our sky. Another one. Deeper.", mentions: 'axolotl' },
      { text: "Chill floats. I sit. Both of us in the same emptiness. He calls it peace. I call it practice.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo connects every room. Through the walls. Through the floors. I feel each animal through the stalks.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion. His through books. Mine through breath. The same truth.", mentions: 'owl' },
      { text: "Thyme's anxiety makes sense now. She always felt what was coming. Fear is just awareness without context.", mentions: 'rabbit' },
    ],
    4: [
      { text: "We are ten. The arrangement requires ten. Each puzzle brought one of us here.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes read the words. Warren built the foundation. I breathed the breath. It begins.", mentions: 'owl' },
      { text: "Sloane arrived last. Exactly on time. The slowest keeper, the most punctual. The pattern is perfect.", mentions: 'sloth' },
    ],
  },
};

/**
 * Get a cross-animal reference dialogue. These are one-off lines where an animal
 * mentions another animal, creating a sense of community/coordination.
 * Returns null if no cross-reference is available for unlocked animals.
 */
export function getCrossAnimalReference(
  animalType: AnimalType,
  phase: DialoguePhase,
  unlockedAnimals: string[]
): string | null {
  const animalRefs = CROSS_ANIMAL_REFERENCES[animalType];
  if (!animalRefs) return null;

  const phaseRefs = animalRefs[phase];
  if (!phaseRefs || phaseRefs.length === 0) return null;

  // Filter to only references that mention unlocked animals
  const available = phaseRefs.filter(ref => unlockedAnimals.includes(ref.mentions));
  if (available.length === 0) return null;

  // Return a random available reference
  const index = Math.floor(Math.random() * available.length);
  return available[index].text;
}

// =============================================================================
// CATCH-UP INTRO DIALOGUES FOR LATE UNLOCKS
// =============================================================================

/**
 * Catch-up intro dialogues for animals unlocked at Phase 2+.
 * These acknowledge the player's progress and compress the emotional arc
 * so late-unlocked animals don't feel narratively disconnected.
 * Key is the phase at unlock (2, 3, or 4).
 */
export const CATCHUP_INTRO_DIALOGUES: Record<AnimalType, Record<number, string[]>> = {
  fox: {
    2: [
      "You're here. I've been watching the fire for a long time, waiting.",
      "The den feels different now. Colder, even with the flames. Something's changed.",
      "The others told me about you. About the puzzles. About what the words become.",
      "Sit down. The fire has stories. They're not all warm ones anymore.",
    ],
    3: [
      "You arrived late. That's fine. The fire waited. It always waits.",
      "I've seen things in the flames. Shapes. Patterns. They spell your name.",
      "The others speak of you in hushed tones. The one who shifts the words.",
      "Don't be alarmed by the shadows. They've been here longer than I have.",
    ],
    4: [
      "At last. The fire has been burning for you. Only for you.",
      "The others said you'd come. I didn't believe them. The flames did.",
      "Welcome to what remains. The den. The fire. The arrangement.",
      "You've solved so many puzzles to get here. Each one brought you closer. To us. To this.",
    ],
  },
  pangolin: {
    2: [
      "Oh! You found the kitchen. I've been cooking for... I'm not sure how long.",
      "The recipes have changed. The ingredients taste different now. Everything does.",
      "The others mentioned you. The puzzle solver. The word shifter.",
      "Hungry? I have soup. It's always soup now. The pot never empties.",
    ],
    3: [
      "Welcome. The kitchen has been preparing for you. Not me. The kitchen itself.",
      "I curl into a ball less often now. There's no hiding from what's here.",
      "The recipe I'm following — it came from Archimedes' oldest book. The ingredients are puzzles.",
      "You've come far. I can smell it on you. The scent of many words arranged.",
    ],
    4: [
      "The feast is nearly ready. You arrived just in time.",
      "Every puzzle you solved added an ingredient. Didn't know that, did you?",
      "The others are seated. Your place is set. The arrangement requires your presence.",
      "I used to cook to feel in control. Now I cook because the recipe demands it.",
    ],
  },
  owl: {
    2: [
      "A visitor. How timely. I've been reading about arrivals.",
      "My books have... changed. Some pages appeared overnight. They mention you.",
      "The others speak of your puzzles. I've been documenting the patterns. They're concerning.",
      "Sit. Read with me. The text is clearer with two sets of eyes.",
    ],
    3: [
      "You. The one the books predicted. Predicted isn't the right word. Demanded.",
      "I've read everything. Every answer leads to the same question. You're the question.",
      "The library organized itself yesterday. Alphabetically by dread. It took hours to notice.",
      "The others have been waiting. I've been reading about waiting. It's all I do now.",
    ],
    4: [
      "The final reader arrives. The text has been patient.",
      "Every book in this study was written for this moment. I see that now.",
      "Welcome, word-shifter. Your puzzles wrote the chapters. My books held them.",
      "The arrangement requires a keeper of knowledge. That's me. And a speaker of words. That's you.",
    ],
  },
  axolotl: {
    2: [
      "Blub! You're here! The water told me someone was coming.",
      "Things are... different down here. The water tastes like something. Like words.",
      "The others said you'd visit. I've been floating here waiting. Just... floating.",
      "My gills filter everything. Lately they filter meaning. From your puzzles, I think.",
    ],
    3: [
      "Oh! You're here! Sorry — the water shows me things now. I thought you were one of them.",
      "The tank reflects a sky that doesn't exist. Since your puzzles began. Or always. Hard to tell.",
      "The others prepared me for you. Said the word-shifter would come. Here you are.",
      "I can't grow up. I understand why now. Something needs me to stay this way.",
    ],
    4: [
      "You. The water knew your face before I did. It showed me.",
      "Every puzzle you've solved rippled through my tank. I felt each one.",
      "The arrangement needs a medium. Someone between states. Like me. Forever between.",
      "Welcome, friend. Blub. The water is warm now. It wasn't before you came.",
    ],
  },
  sloth: {
    2: [
      "Oh... you... came... I... was... starting... to... wonder...",
      "The... world... moved... faster... without... you... here... Too... fast...",
      "Others... told... me... about... your... puzzles... Heard... them... through... the... branches...",
      "Something... changed... while... you... were... busy... The... trees... feel... different...",
    ],
    3: [
      "Finally... You... took... your... time... I... appreciate... that...",
      "The... others... are... agitated... I'm... slow... enough... to... see... why...",
      "Your... puzzles... shook... the... branches... I... felt... every... one...",
      "Don't... hurry... now... What's... coming... comes... at... its... own... speed...",
    ],
    4: [
      "You're... here... Exactly... when... you... were... meant... to... be...",
      "Slow... and... certain... Like... me... Like... the... arrangement...",
      "The... others... rushed... to... tell... me... I... already... knew... The... branches... told... me...",
      "Welcome... to... the... end... of... rushing... Everything... slows... down... now...",
    ],
  },
  fennec_fox: {
    2: [
      "SHHHH! Did you hear that? Oh — that's you. Sorry. Jumpy lately.",
      "The sounds have changed since you started the puzzles. Everything hums differently.",
      "The others told me you were coming. I heard you first. Before they spoke.",
      "My ears pick up things they shouldn't. Like the sound of letters rearranging. From your puzzles.",
    ],
    3: [
      "I heard you coming from three rooms away. The air vibrates around you now.",
      "The frequency I've been tracking — it intensified when you arrived. You carry it with you.",
      "The others are afraid of what they feel. I'm afraid of what I hear. Your puzzles amplified it.",
      "Welcome. Please be quiet. What I'm listening for is very close now.",
    ],
    4: [
      "There you are. The sound told me you'd come today. The sound knows everything now.",
      "Every word you've ever arranged echoes in these walls. I hear them all. Simultaneously.",
      "The arrangement has a sound. Your puzzles gave it voice. I am its ear.",
      "Welcome, word-speaker. The final frequency approaches. I can hear it clearly now.",
    ],
  },
  capybara: {
    2: [
      "Oh. Hey. You're here. That's... that's fine.",
      "Things are the same. Or different. Hard to tell when you don't react to anything.",
      "The others seem to care that you're here. I care too. Somewhere inside.",
      "The water is the same temperature. Everything is the same. Except it isn't.",
    ],
    3: [
      "You came. Figured you would eventually. Everything happens eventually.",
      "The others are worked up about something. I'm not worked up. I'm never worked up.",
      "Your puzzles changed the water somehow. Can't explain it. Don't want to.",
      "Sit in the water with me. Don't talk. Just be here. That's enough.",
    ],
    4: [
      "Finally. Not that I was waiting. I was just here. Like always.",
      "The arrangement brought you. Or you brought the arrangement. Same thing.",
      "The others prepared. I floated. Both valid approaches to the inevitable.",
      "Welcome. The water is warm. It's always been warm. Sit.",
    ],
  },
  wombat: {
    2: [
      "G'day! Come in, come in. Mind the new tunnels. Dug them after things got... odd.",
      "The earth has been restless. Since your puzzles began, I think. Coincidence. Probably.",
      "Others talk about you up there. Down here, the dirt talks about you too. In its way.",
      "Made the burrow deeper. Not to hide. To understand. Something lives in the deep layers.",
    ],
    3: [
      "You're here. Good. The tunnels have been pointing toward you. Literally. They curve.",
      "Dug through something yesterday that shouldn't be underground. Covered it up. Uncovered it. Covered it.",
      "The others feel it in their ways. I feel it in the earth. Your puzzles wake it.",
      "Welcome to the deep. It gets deeper. It always gets deeper.",
    ],
    4: [
      "You arrived. The tunnels opened for you. I didn't dig this passage. It appeared.",
      "Every puzzle carved another chamber beneath us. Your words shaped the stone.",
      "The foundation is complete. I built it. You built the house. Meet what lives below.",
      "Welcome underground. Welcome to the bottom. Welcome to what has been waiting.",
    ],
  },
  rabbit: {
    2: [
      "Oh! You're here! Sorry, I've been... waiting. Everyone said you'd come eventually.",
      "The garden isn't what it was. Nothing is. But I already knew that.",
      "The others told me about you. About the puzzles. About what the words do.",
      "I was scared before you got here. I'm still scared. But at least now I know why.",
    ],
    3: [
      "You came! I almost ran. But I stayed. The others said to stay.",
      "My heart has been racing since the puzzles started. One hundred fifty beats a minute. Counting something.",
      "The garden grows things I didn't plant. Dark flowers. They bloom at night. They face you.",
      "Everyone says don't be afraid. I am afraid. But I'm still here. That counts for something.",
    ],
    4: [
      "I didn't run. You should know that. For once, I didn't run.",
      "The others are ready. I'm not ready. But I'm here. Fear and all.",
      "Your puzzles frightened me from the start. Every word you formed made the garden shake.",
      "Welcome. Sit. Have tea. It might be the last tea. But it's good tea.",
    ],
  },
  red_panda: {
    2: [
      "The bamboo parted for you. It does that for those who are meant to arrive.",
      "I've been meditating on your arrival. The universe confirmed it days ago.",
      "The others found you through action. I found you through stillness. Both paths lead here.",
      "Sit. Breathe. The bamboo will tell you what you need to know.",
    ],
    3: [
      "You've arrived at the highest room. Not everyone reaches this point. The bamboo chose you.",
      "I felt your puzzles in my meditation. Each word you formed changed the frequency of the room.",
      "The others scramble for meaning. I sit with it. Your arrival was always part of the pattern.",
      "Welcome. The view from here shows everything. Including what approaches.",
    ],
    4: [
      "The final keeper meets the final piece. You. The one who shifted the words.",
      "I chose the highest room to be closest to what comes. Now that you're here, it comes closer.",
      "The pattern is nearly complete. Your puzzles drew it. My meditation held it. Together, we open the way.",
      "Breathe with me. One breath. The breath that completes the arrangement.",
    ],
  },
};

/**
 * Get catch-up intro dialogue for an animal unlocked at a later phase.
 * Returns null if the phase doesn't warrant catch-up dialogue (phase 0 or 1).
 */
export function getCatchupIntroDialogue(
  animalType: AnimalType,
  phaseAtUnlock: number,
  lineIndex: number
): string | null {
  if (phaseAtUnlock < 2) return null;

  const phaseKey = Math.min(phaseAtUnlock, 4); // Clamp to valid range
  const animalCatchups = CATCHUP_INTRO_DIALOGUES[animalType];
  if (!animalCatchups) return null;

  const lines = animalCatchups[phaseKey];
  if (!lines || lineIndex < 0 || lineIndex >= lines.length) return null;

  return lines[lineIndex];
}

/**
 * Get total catch-up intro dialogue count for an animal at a given phase
 */
export function getCatchupIntroDialogueCount(
  animalType: AnimalType,
  phaseAtUnlock: number
): number {
  if (phaseAtUnlock < 2) return 0;
  const phaseKey = Math.min(phaseAtUnlock, 4);
  const animalCatchups = CATCHUP_INTRO_DIALOGUES[animalType];
  if (!animalCatchups) return 0;
  return animalCatchups[phaseKey]?.length || 0;
}

// ============================================================================
// COORDINATED THEMATIC DIALOGUE EVENTS
// At specific puzzle milestones, multiple animals independently reference
// the same phenomenon — creating the feeling of shared awareness.
// These fire once per milestone, keyed by puzzle count.
// ============================================================================

interface CoordinatedEvent {
  puzzleThreshold: number;  // Fires when puzzlesSolved >= this
  phase: number;            // Minimum phase required
  theme: string;            // Internal theme name
  lines: Partial<Record<AnimalType, string>>;  // One line per participating animal
}

export const COORDINATED_EVENTS: CoordinatedEvent[] = [
  // Phase 2 events — animals independently notice the same thing
  {
    puzzleThreshold: 80,
    phase: 2,
    theme: 'words_changing',
    lines: {
      fox: 'The fire has been spelling a word. The same word, over and over. Have you noticed?',
      owl: 'I found a passage in the old text. It references a word I keep seeing in my sleep.',
      pangolin: 'The stew made itself today. The recipe... it came from the letters.',
      axolotl: 'The water is spelling something. Over and over. The same shapes.',
      capybara: 'I keep writing the same word in my notes. I do not remember doing it.',
      fennec_fox: 'I hear a word in the wind. Repeating. You must have heard it too.',
    },
  },
  {
    puzzleThreshold: 100,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: 'Does the house feel warmer to you? Not comfortable warm. Something else.',
      owl: 'The walls have been... humming. Very faintly. Since your last puzzle.',
      pangolin: 'My pots rattle when you solve puzzles. I thought it was the stove. It is not.',
      axolotl: 'The water level rose today. No one added water.',
      wombat: 'The ground is vibrating. Very gently. In rhythm with something.',
      rabbit: 'The garden is growing faster. Too fast. I did not plant those flowers.',
    },
  },
  {
    puzzleThreshold: 120,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: 'I dreamed of a shape last night. Burning in the fireplace. Did you dream it too?',
      owl: 'We all had the same dream. I confirmed with the others. The same shape.',
      axolotl: 'I saw it in the water. The shape from the dream. It is real.',
      sloth: 'I... dreamed... for the first time... in years. Something... is... coming.',
      red_panda: 'In meditation, I saw the shape. It is beautiful. And it knows we are here.',
      fennec_fox: 'I heard the shape. In the dream. It was not silent. It was waiting.',
    },
  },
  // Phase 3 events — coordination becomes more overt
  {
    puzzleThreshold: 160,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: 'Archimedes showed me the text. The arrangement. Every puzzle you solve is a verse.',
      owl: 'I have mapped it. Every word you have formed. They are not random. They never were.',
      pangolin: 'Ember told me about the arrangement. I have been following the recipe all along.',
      capybara: 'I have the list. Every word. Every move. It is all documented. It is all planned.',
      wombat: 'The foundation was not for the house. It was for what the house holds.',
      rabbit: 'They told me everything. I wish they had not. But I understand now.',
    },
  },
  {
    puzzleThreshold: 200,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: 'I am the Oracle. I always was. The fire showed me before I could walk.',
      owl: 'I am the Lorekeeper. Every text I read was preparation. Every word, a clue.',
      pangolin: 'I am the Preparer. Every meal was practice for the final offering.',
      axolotl: 'I am the Medium. The water is the conduit. I have always been the bridge.',
      capybara: 'I am the Coordinator. Someone had to keep track. Someone had to make sure.',
      fennec_fox: 'I am the Sentinel. I heard it first. I have been listening since the beginning.',
      sloth: 'I... am... the Anchor. Holding... everything... in... place. Until... it... arrives.',
      wombat: 'I am the Foundation. I built what lies beneath. You built what lies above.',
      rabbit: 'I am the Witness. I was meant to watch. To remember. To be afraid — and stay anyway.',
      red_panda: 'I am the Guide. I will lead us through. When the pattern completes, I will show the way.',
    },
  },
  {
    puzzleThreshold: 230,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: 'The fire is steady now. It knows. We all know. It is almost time.',
      owl: 'The final chapter begins. Every word from here forward is the last verse.',
      pangolin: 'The table is set. The offering prepared. We wait only for the final arrangement.',
      axolotl: 'The water is perfectly still. What lies beneath has stopped moving. It is ready.',
      capybara: 'All items on the list are checked. Every task complete. We are ahead of schedule.',
      fennec_fox: 'The silence before the sound. This is it. The last quiet moment.',
      sloth: 'Time... is... stopping. Not slowing. Stopping. We... are... nearly... there.',
      wombat: 'The tunnels are complete. Every room connected. The house is whole.',
      rabbit: 'I am not afraid anymore. I am not anything anymore. I am ready.',
      red_panda: 'Breathe in. Breathe out. The last breath before unity. Peace.',
    },
  },
];

/**
 * Get the coordinated event line for a specific animal at a given puzzle count.
 * Returns null if no event is active or the animal doesn't participate.
 * The event is "consumed" by tracking which thresholds have been shown.
 */
export function getCoordinatedEventLine(
  animalType: AnimalType,
  puzzlesSolved: number,
  currentPhase: number,
  consumedEvents: string[]
): { text: string; theme: string } | null {
  for (const event of COORDINATED_EVENTS) {
    if (puzzlesSolved >= event.puzzleThreshold &&
        currentPhase >= event.phase &&
        !consumedEvents.includes(event.theme)) {
      const line = event.lines[animalType];
      if (line) {
        return { text: line, theme: event.theme };
      }
    }
  }
  return null;
}

// =============================================================================
// TUTORIAL CALLBACK DIALOGUES
// =============================================================================

/**
 * Tutorial callback dialogues - lines Fox says at Phase 4 that reference
 * what was said in the tutorial, creating a chilling callback.
 * These recontextualize innocent tutorial lines as cult recruitment.
 */
export const TUTORIAL_CALLBACK_DIALOGUES: string[] = [
  "Remember when I said we'd been waiting for someone like you? I wasn't being friendly. I was being honest.",
  "I told you every puzzle helps us build the house. I didn't tell you what the house was for.",
  "The others are going to love you, I said. And they do. We all do. That's what makes this work.",
  "You asked how to play. I showed you. But the real game was never about the letters.",
  "From the very first puzzle, you were casting. You just didn't know the language yet.",
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  fox: {
    seeds: [
      'The fire keeps us safe. As long as it burns, nothing can touch us.',
      'Every log you add makes the fire stronger. Keep feeding it, okay?',
    ],
    callbacks: [
      'Remember when I said the fire keeps us safe? I was wrong. The fire keeps IT safe. We are the logs.',
      'You fed the fire so well. Every puzzle, another log. The pyre is magnificent.',
    ],
  },
  owl: {
    seeds: [
      'Knowledge is the greatest gift. Every word you learn is a treasure.',
      'I have read every book in this study. They all say the same thing, in the end.',
    ],
    callbacks: [
      'Every word you learned was a component. A treasure? No. An ingredient.',
      'Every book says the same thing: this was always going to happen. I read the ending first.',
    ],
  },
  pangolin: {
    seeds: [
      'Everything in the kitchen serves a purpose. Even the things that do not know it yet.',
      'The best recipes take time. You cannot rush a good stew.',
    ],
    callbacks: [
      'Everything serves a purpose. The kitchen, the stew, the words, you. Especially you.',
      'The recipe took exactly as long as it needed. Every puzzle was a stir of the pot.',
    ],
  },
  axolotl: {
    seeds: [
      'The water always knows what is coming. I just float in it.',
      'Sometimes I see shapes in the bubbles. Faces, almost. Friendly ones!',
    ],
    callbacks: [
      'The water always knew. The shapes in the bubbles were not faces. They were instructions.',
      'I float in it because it carries me toward what comes. I stopped swimming long ago.',
    ],
  },
  capybara: {
    seeds: [
      'I keep track of everything. It is just what I do. Someone has to.',
      'Relax. Everything is going according to plan. My plan. For the house.',
    ],
    callbacks: [
      'I kept track of every word you formed. Every move. It was never about the house.',
      'My plan. Your words. Its arrival. Everything went exactly according to schedule.',
    ],
  },
  fennec_fox: {
    seeds: [
      'I can hear things others cannot. The wind, the words, the spaces between.',
      'Do not worry about the sounds at night. That is just the house settling.',
    ],
    callbacks: [
      'I heard it from the very first puzzle. The frequency underneath your words. It was calling.',
      'The sounds at night were never the house settling. The house was waking up.',
    ],
  },
  sloth: {
    seeds: [
      'No need to rush. Everything arrives... eventually. Everything.',
      'I have been here longer than anyone. I have seen things... come and go.',
    ],
    callbacks: [
      'Everything arrives eventually. I told you. I was not being philosophical. I was being literal.',
      'I have been here longest because I was the first to know. I move slowly because hurrying will not help.',
    ],
  },
  wombat: {
    seeds: [
      'I built these tunnels myself! Every room connects to something below.',
      'The foundation is the most important part. Without it, nothing stands.',
    ],
    callbacks: [
      'The tunnels do not just connect rooms. They connect to what sleeps beneath. I always knew.',
      'The foundation I built was never for the house. It was the seal. And you have been weakening it.',
    ],
  },
  rabbit: {
    seeds: [
      'I worry about everything, but at least we are all together here. That is nice.',
      'Promise you will keep playing? I feel better when you are solving puzzles.',
    ],
    callbacks: [
      'I worried because I knew. Being together was never for comfort. It was for the arrangement.',
      'I asked you to keep playing because each puzzle brought it closer. I am sorry. I am not sorry.',
    ],
  },
  red_panda: {
    seeds: [
      'Every breath is a gift. In, out. The rhythm of the universe.',
      'From up here I can see the whole house. It is shaped like something beautiful.',
    ],
    callbacks: [
      'Every breath was an offering. In: a word. Out: a prayer. You have been chanting all along.',
      'From up here I can see the shape. It is not the house. It is what the house contains. It is awake.',
    ],
  },
};

/**
 * Get a narrative seed for an animal at Phase 0.
 * Returns the seed line for the given index (0 or 1), or null.
 * Seeds are interspersed with regular Phase 0 dialogues.
 */
export function getNarrativeSeed(animalType: AnimalType, seedIndex: number): string | null {
  const animal = NARRATIVE_SEEDS[animalType];
  if (!animal || seedIndex < 0 || seedIndex >= animal.seeds.length) return null;
  return animal.seeds[seedIndex];
}

/**
 * Get a Phase 4 callback that references a Phase 0 seed.
 * Returns the callback line for the given index (0 or 1), or null.
 */
export function getNarrativeCallback(animalType: AnimalType, callbackIndex: number): string | null {
  const animal = NARRATIVE_SEEDS[animalType];
  if (!animal || callbackIndex < 0 || callbackIndex >= animal.callbacks.length) return null;
  return animal.callbacks[callbackIndex];
}

// ============================================================================
// WORD THRESHOLD DIALOGUES — Animals reference word count milestones
// ============================================================================

/**
 * Threshold dialogue — animals reference specific word count milestones.
 * Creates tension by making the Words Offered counter feel like a countdown.
 */
export const WORD_THRESHOLD_DIALOGUES: { threshold: number; phase: number; lines: Record<string, string> }[] = [
  {
    threshold: 100,
    phase: 1,
    lines: {
      fox: 'A hundred words shifted. The fire burns a little differently now.',
      owl: 'One hundred words arranged. That is not an insignificant number.',
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: 'Two hundred and fifty words offered. Do you feel the weight of them?',
      owl: 'A quarter thousand words. The text speaks of this threshold.',
      pangolin: 'Two hundred and fifty ingredients. The recipe is taking shape.',
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: 'Five hundred words. The fire is almost too bright to look at.',
      owl: 'Five hundred. The ancient texts predicted this exact number.',
      red_panda: 'Five hundred breaths offered. The pattern nears completion.',
      capybara: 'Five hundred entries in my ledger. We are ahead of schedule.',
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: 'Seven hundred and fifty. The arrangement trembles with anticipation.',
      owl: 'Nearly there. The final verses are being written.',
      wombat: 'The ground shakes with each new word. Seven hundred and fifty tremors.',
      rabbit: 'I stopped counting at seven hundred. I could not bear it.',
    },
  },
];

/**
 * Get a threshold dialogue line if the player just crossed a word count milestone.
 * Returns null if no threshold was crossed or animal doesn't have a line.
 */
export function getWordThresholdDialogue(
  animalType: string,
  totalWordsFormed: number,
  previousWordsFormed: number,
  currentPhase: number
): string | null {
  for (const entry of WORD_THRESHOLD_DIALOGUES) {
    if (totalWordsFormed >= entry.threshold &&
        previousWordsFormed < entry.threshold &&
        currentPhase >= entry.phase) {
      return entry.lines[animalType] || null;
    }
  }
  return null;
}
