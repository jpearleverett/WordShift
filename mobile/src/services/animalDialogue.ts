import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from contentment to existential crisis
 * 52 dialogues per animal to support extended dialogue sessions
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

  // Phase 1 - Curious, gently philosophical (10 dialogues)
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

  // Phase 1 - Dreamy questioning (10 dialogues)
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

  // Phase 1 - Thoughtful cooking (10 dialogues)
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

  // Phase 1 - Thoughtfully slow (10 dialogues)
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

  // Phase 1 - Thoughtful listener (10 dialogues)
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

  // Phase 1 - Reflective warmth (10 dialogues)
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

  // Phase 1 - Questioning scholar (10 dialogues)
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

  // Phase 1 - Subtle unease (10 dialogues)
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

  // Phase 1 - Thoughtful digger (10 dialogues)
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

  // Phase 1 - Underlying worry (10 dialogues)
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
