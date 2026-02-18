import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from contentment to existential crisis
 * 56 dialogues per animal to support extended dialogue sessions
 */

// RED PANDA (Bamboo) - Zen practitioner whose enlightenment leads to unsettling truths
const RED_PANDA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Peaceful and present (12 dialogues)
  { id: 'rp_0_1', text: "Ah, you found your way here. The bamboo grove has particularly good energy today. Can you feel it?", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_2', text: "Listen to the wind through the leaves. That's the forest breathing. It breathes for all of us.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_3', text: "My tail is particularly fluffy this morning. Small victories matter. Never dismiss a good tail day.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_4', text: "The dew on bamboo leaves catches light like scattered diamonds. Nature decorates for free, if you look.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_5', text: "We red pandas existed millions of years before our giant cousins. Patience runs deep in this family.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_6', text: "Climbed the old pine today. Climbed back down. Both directions held their own beauty. That's the lesson.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_7', text: "Seven face-washes before breakfast. Cleanliness prepares the mind for whatever the day brings.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_8', text: "There's a sunbeam in my meditation spot. It moves, but so do I. We meet in the middle. Always.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_9', text: "The mountain sends messages through the wind. Today it simply said hello. That was enough.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_10', text: "Made a nest of fresh bamboo leaves. Smells like green. Smells like now. That's the best smell there is.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_11', text: "Some call us firefoxes. Others say bearcat. Names are just sounds we agree on. I chose Bamboo for its simplicity.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_12', text: "Each puzzle you solve ripples outward, you know. The universe notices. In its own quiet way.", phase: 0, animalType: 'red_panda' },

  // Phase 1 - Gently philosophical (14 dialogues)
  { id: 'rp_1_1', text: "Watched the clouds for an hour. Not one repeated its shape. Everything is unique. Everything passes.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_2', text: "Bamboo grows without hurrying. It doesn't check how tall it's become. There's wisdom in that, I think.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_3', text: "The puzzles feel like they're solving something in us. Not the other way around. Have you noticed that?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_4', text: "Tried counting stars last night. Lost my place somewhere around all of them. Some things resist counting.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_5', text: "My reflection in the stream lags behind my movements. Just a moment. Just enough to make me wonder.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_6', text: "Same bamboo, different taste each morning. Am I changing, or is it? Does the difference matter at all?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_7', text: "Asked the mountain why it stays so still. The silence was answer enough. Some questions answer themselves.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_8', text: "Peace feels like floating some days. Other days like sinking gently. Same peace though. Same surrender.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_9', text: "My best teacher was a rock by the stream. It taught everything by demonstrating nothing. Perfect pedagogy.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_10', text: "The forest grows quieter lately. Or perhaps my listening has grown louder. Hard to separate the two.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_11', text: "The bamboo grows in patterns now. Not random — deliberate. Like someone is writing with it.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_12', text: "I meditated today and saw a shape behind my eyes. Something I've never encountered before. It felt like it saw me back.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_13', text: "The incense smoke doesn't rise anymore. It drifts sideways, toward the center of the house. As if called.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_14', text: "Something in the universe shifted. I can't explain it better than that. A frequency changed. You felt it too, didn't you?", phase: 1, animalType: 'red_panda' },

  // Phase 2 - Questioning existence (10 dialogues)
  { id: 'rp_2_1', text: "Meditated for hours and found only darkness. Warm darkness. Like being held by nothing. Or everything.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "The bamboo I ate yesterday is gone — digested, dissolved, returned. Where do things go when they leave us?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "Trees mark their years in rings. My years leave no marks at all. Who will know I passed through here?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_4', text: "Achieved perfect stillness for one moment. Then realized — stillness itself moves through time. Nothing escapes.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_5', text: "The sunbeam shifted while I sat in it. Even light refuses to wait for me. Even light has somewhere to be.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_6', text: "Found claw marks on the old pine. My grandmother's, maybe. She's gone. The marks remain. For now.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_7', text: "Thought I found enlightenment once. Then lost it. Was it ever mine to hold? Can you hold light?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_8', text: "The bamboo doesn't know it's being eaten. Lucky bamboo. Lucky, lucky bamboo. Ignorance as mercy.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_9', text: "Peace isn't the absence of chaos. It's chaos observed from far enough away to miss the screaming.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_10', text: "Counted my stripes this morning. Tomorrow the count might differ. Would I notice? Would anyone?", phase: 2, animalType: 'red_panda' },

  // Phase 3 - The Guide emerges (10 dialogues)
  { id: 'rp_3_1', text: "Every meditation takes me deeper toward understanding. And understanding takes me closer to a truth I don't want.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_2', text: "Mountains don't care if we climb them. Bamboo doesn't know it feeds us. The universe is indifferent. This is zen.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_3', text: "Became aware of my own breathing today. Each breath a decision. Each exhale a small death. Can't stop noticing.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_4', text: "Zen teaches there is no self. Then what has been anxious all this time? What wakes me in the dark?", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_5', text: "Tried to release all attachments. My claws kept gripping the branch. The body knows what the mind denies.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_6', text: "Silence is the most peaceful sound. Silence is also the sound of absence. Of things that have stopped.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_7', text: "Generations of my family climbed these trees. Every single one is gone now. The trees remain. The trees always remain.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_8', text: "Found inner peace again. Held it close. Then understood: peace is just the pause between losses.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_9', text: "The bamboo forest thins more each year. We both pretend not to notice. Pretending is its own practice.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_10', text: "The stream I've meditated beside my whole life has changed completely. Every molecule replaced. Same stream? Same me?", phase: 3, animalType: 'red_panda' },

  // Phase 4 - The Guide revealed (10 dialogues)
  { id: 'rp_4_1', text: "I achieved oneness with what approaches. We were always the same thing. How restful to finally admit it.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_2', text: "The void doesn't need to stare back. We project ourselves into it and call the echo an answer. I hear the echo now.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_3', text: "Something stirs in the bamboo. Not wind. The stalks themselves tremble with knowledge they cannot speak.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_4', text: "The last meditation will be endless or instantaneous. The math works out the same. I've done the math.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_5', text: "All things end in perfect stillness. The ultimate zen. The ultimate silence. The ultimate.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_6', text: "I chose the highest room to be closest. Closest to the sky. Closest to what descends from it.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_7', text: "Ten keepers. Ten chambers. One arrangement. I was the guide. You were the key. It has always been this way.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_8', text: "Don't be afraid. I've sat with this moment my entire life. It's just another breath. The last one. That's all.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_9', text: "The last bamboo shoot will grow for nobody. Unseen growth is the purest kind. The truest offering.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_10', text: "Close your eyes with me. In the dark, there is no difference between us and everything else. Breathe. Accept.", phase: 4, animalType: 'red_panda' },
];

// AXOLOTL (Axel) - Dreamy aquatic creature who sees visions in the water
const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Pure bubbly joy (12 dialogues)
  { id: 'ax_0_1', text: "Blub blub! Oh, you're here! I was just watching this bubble — it's been floating for three whole minutes and I think that might be a record!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "Grew back my whole left leg last month. Just sat there and watched it come in like a little pink flower blooming. Being me is WILD.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "Look at my gills today! Extra frilly, extra feathery, extra everything. I feel like I'm wearing a fancy collar to a party I threw for myself.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "Best thing about never growing up? Every single day feels like the first day of summer vacation and the last day never comes.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_5', text: "Sometimes I just float in the middle of my tank and look at the ceiling. The light makes patterns on the water. It's the quietest kind of beautiful.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_6', text: "Did you know 'axolotl' means 'water monster' in the old language? Pretty adorable for a monster, right? I try to live up to the name. Blub!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_7', text: "Waved at a fish today. Waited a full minute for a wave back. Nothing. Fish are absolutely terrible conversationalists, just awful.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_8', text: "I could live fifteen years! That's basically forever in water-time. I've got plans for every single one of them. Mostly floating-related plans.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_9', text: "Tried the surface once. Way too dry, way too much gravity, way too much of everything not being water. Came right back home.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_10', text: "You know what I like about you? You always come back. Some visitors just pass through, but you — you're different. In a good way!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_11', text: "People say I always look happy — it's partly just my face, the way it's shaped, but also yeah, I really am! Can't help it!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_12', text: "Under UV light I glow pink and sparkly, like nature decided I needed to be a party trick AND a pet. I'm not complaining one bit.", phase: 0, animalType: 'axolotl' },

  // Phase 1 - Dreamy questioning (14 dialogues)
  { id: 'ax_1_1', text: "Can I regrow my heart if I lose it? Sure, easy. But what about feelings — do those grow back too? Asking for me.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "Water holds me up without even trying. But what holds the water? And what holds THAT? It's turtles all the way down, maybe.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "My face is stuck in this smile. Even when I'm not smiling inside. Is that happiness or is it just... architecture?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_4', text: "Watched a bubble rise all the way up and vanish at the surface. Poof. Everything rises. Everything vanishes. That's just how it goes, I guess.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_5', text: "My reflection ripples and distorts every time the water moves. Maybe the real me wobbles too, and I just can't see it from in here.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_6', text: "Fish swim right by without noticing me. We share the same water but nothing else. Are we all invisible to each other like that?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_7', text: "I can regenerate almost anything. Legs, spine, even brain parts. Everything except yesterday. Yesterday just goes and it doesn't come back.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_8', text: "The water matches my body temperature exactly. It's like I dissolve into it. Where do I end and where does the water begin?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_9', text: "My ancestors could choose to grow up if they wanted. That knowledge was lost somewhere along the way. Or maybe I chose to forget it.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_10', text: "Dreams come differently underwater. Slower, blurrier, like watching a movie through frosted glass. Hard to tell them from waking anymore.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_11', text: "The bubbles spell things sometimes, I swear. I mentioned it to Archimedes and he got this look in his eyes and said it was real.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_12', text: "I floated for three hours today without moving a single muscle. The water held me perfectly still. That's never happened before.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_13', text: "Have you ever looked at water really, really closely? It remembers shapes. It remembers where your hands were. Water keeps secrets.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_14', text: "Something in the tank moved when you solved that last puzzle. Not me — something else. I felt the current change direction all by itself.", phase: 1, animalType: 'axolotl' },

  // Phase 2 - Deeper uncertainty (10 dialogues)
  { id: 'ax_2_1', text: "Never metamorphosed. Stuck between states forever — not larva, not adult. Not here, not there. Not anything, really. Just waiting.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "This smile doesn't change no matter what I feel. It's a mask fused to my face. A face that IS the mask. I can't take it off.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "Every bubble I blow carries a tiny piece of my breath away into nothing. Am I slowly emptying myself? Blub by blub by blub?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_4', text: "I can regrow parts of my brain. New neurons, fresh connections. But is the new brain still me? Do the new parts remember being born?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_5', text: "My tank has no seasons. Same temperature, same light, same everything. Every day is the same day. Is any day real if none of them are different?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_6', text: "They say perfect conditions could let me live forever. But what are the right conditions for a soul? Nobody studies that part.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_7', text: "When a limb regrows, which part is really me? The leg that left or the one growing back? I've been replacing myself for years.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_8', text: "Water flows through my gills constantly. In and out, in and out. Like thoughts I'm not fast enough to catch or hold onto.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_9', text: "Same size for years now. Growing sideways through time. Never forward. Never toward anything. Just accumulating days.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_10', text: "Scientists study me to learn about healing. They never ask what I've lost in the process. Nobody asks the specimen how it feels.", phase: 2, animalType: 'axolotl' },

  // Phase 3 - The Medium emerges (10 dialogues)
  { id: 'ax_3_1', text: "The lake where my kind began dried up long ago. We're all living in artificial water now. I'm a memory of something that barely exists.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_2', text: "Can regenerate anything except the past. I tried. Believe me, I tried. Nothing grows back the way it was. Nothing ever does.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_3', text: "The water tells stories through vibration and current. Lately the stories have no endings. They just stop mid-sentence and go dark.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_4', text: "My wild cousins are almost extinct now. I'm a souvenir of something the world already threw away. A smile floating in borrowed water.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_5', text: "Healed from every wound they ever gave me. But the water itself is wounded now. I taste it in every breath through my gills.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_6', text: "My grandmother had this exact same smile. She's been gone for years but the smile remains on my face, smiling at nothing.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_7', text: "My gills filter everything that passes through. Including the warnings. The water whispers things I wish I couldn't hear anymore.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_8', text: "Could grow legs and walk away from all of this. But away from what? Toward what? The air carries the same weight now.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_9', text: "Regrown myself so many times I've lost count. How many of my cells remember being born? How many are just copies of copies of copies?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_10', text: "Sometimes I press against the glass and pretend I can see a sky. But the ceiling is always there. The ceiling is always there.", phase: 3, animalType: 'axolotl' },

  // Phase 4 - The Medium revealed (10 dialogues)
  { id: 'ax_4_1', text: "The water's been warming since before you arrived, and I think — no, I know — it knows your name. It's known it for a long time.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "Never supposed to become anything. Just stay young forever. Now I understand — none of us were supposed to become. We were supposed to receive.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "A wave is building somewhere deep, somewhere I can feel but can't see. When it comes, will it wash us away or finally bring us home?", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_4', text: "Regeneration won't help with what's coming. Some things aren't meant to be regrown. Some things are meant to be witnessed with open eyes.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_5', text: "Stopped counting days. Days don't mean anything anymore. There's just the waiting, and the warm water, and the patience of something very large.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_6', text: "The pressure is changing everywhere at once. Something massive is shifting in the deep. Somewhere far. Getting closer. I can feel it in my gills.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_7', text: "Eternal youth means I'll witness the end with fresh eyes. Fresh wonder. Fresh fear that feels exactly like wonder from the inside.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_8', text: "Smile with me. Not because it changes anything. Just because our faces will do it anyway, and there's something holy in that.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_9', text: "I can see through the water now, all the way through, to somewhere else. It isn't scary over there. It looks like the home I was always promised.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_10', text: "I forgive the water for what's coming. I forgive myself for being afraid. And I forgive you for bringing us here. Blub blub, friend. Blub blub.", phase: 4, animalType: 'axolotl' },
];

// PANGOLIN (Panko) - Practical cook whose recipes become ritual offerings
const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0 - Happy chef (12 dialogues)
  { id: 'pg_0_1', text: "Welcome to my kitchen! I've got an ant reduction simmering that'll change your whole perspective on insect cuisine.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "Polished every one of my scales this morning. When you look good, you cook good — that's what my mother used to say.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "Listen, I know it sounds silly, but a good stew needs patience. You can't rush what the pot wants to tell you.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "When life gets overwhelming? I curl into a ball. Very practical. Very cozy. Highly recommended for bad days.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_5', text: "My tongue is longer than my whole body. Perfect for reaching the bottom of any jar. Don't tell Ember — I got into her cider.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_6', text: "Today's special: termite surprise. The surprise is the ants hiding underneath. I never said I was predictable.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_7', text: "I counted my scales once. Lost track around nine hundred. That's plenty of scales, friend. Very comforting, knowing you've got plenty.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_8', text: "Attempted a cake last week. Turned out to be mostly ants. Still delicious. I'm biased, but I'm also right.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_9', text: "My scales are keratin — same as your fingernails. We're practically family, you and me. Weird family, but family.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_10', text: "Ember drops by for dinner most nights. She brings the cider, I make the stew. Simple things, you know? The best things are simple.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_11', text: "I tried teaching Axel to cook once. Everything ended up underwater. Lovely kid, terrible sous chef.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_12', text: "Only mammal with scales in the whole world. Unique, that's me. That has to count for something, doesn't it?", phase: 0, animalType: 'pangolin' },

  // Phase 1 - Deeper cooking, recipes with a life of their own (14 dialogues)
  { id: 'pg_1_1', text: "I followed a recipe today and my hands did something different halfway through. The result was better. That's never happened before.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "The spices rearranged themselves on the shelf last night. I left them where they moved. The stew came out remarkable.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "Curling into a ball protects the outside. But what am I protecting, really? More scales? More hiding?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_4', text: "Ember came by for dinner and we talked about the letters you shift. She sees them in the fire. I taste them in the food.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_5', text: "Archimedes lent me an old recipe book. Some of the pages are in languages I don't know, but my hands understood them.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_6', text: "Made soup today. Ate it. Now it's gone. Is that what everything is? Temporary soup, waiting to become something else?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_7', text: "The ants don't know they're ingredients, do they? Makes me wonder what I'm an ingredient in. Who's stirring this pot?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_8', text: "Cooking is transformation, when you think about it. Heat turns raw things into nourishment. Destruction with good intentions.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_9', text: "My tongue has no taste buds — did you know that? I eat without really tasting. There's a metaphor there I'd rather not find.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_10', text: "A perfectly curled pangolin ball has no beginning and no end. Comforting and terrifying in equal measure, friend.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_11', text: "The kitchen smells different after your puzzles. Sweeter first, then bitter, then something I can't name.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_12', text: "I polish my scales because it feels like control. Control over something. Anything. Do you know what I mean?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_13', text: "Recipes are just instructions for transformation. Solid becomes liquid becomes nourishment becomes nothing. Everything transforms.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_14', text: "I made a dish tonight with no recipe at all. My hands just knew. It tasted like something ancient. Something necessary.", phase: 1, animalType: 'pangolin' },

  // Phase 2 - Armor fails, vulnerability (10 dialogues)
  { id: 'pg_2_1', text: "I curl into a ball to protect the outside, friend, but what about the inside? No armor faces inward.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_2', text: "Most trafficked mammal on Earth. Everyone wants my scales. Nobody asks if I want to keep them.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_3', text: "Cooked a feast today for nobody. We feast alone. We always feast alone in the end, don't we?", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_4', text: "Each scale regrows if I lose it. But the new scale doesn't remember the old one. Little amnesiac shields, all over my body.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_5', text: "Cooking is destruction with good intentions. Heat and acid and time, breaking things down so they can become something else.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_6', text: "The recipe from Archimedes' old book — I keep making it. Every night now. The kitchen smells like stone and ceremony.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_7', text: "Armored outside, soft inside. No scale can protect what's already tender. Already breaking. Already changed.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_8', text: "Rolled down a hill once and couldn't stop. The momentum of living carries you past where you meant to be.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_9', text: "The kitchen gets colder at night now. Or I do. Hard to tell the difference anymore, friend.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_10', text: "They poach my kind for medicine that doesn't work. We die for nothing. I wonder if there's a way to die for something.", phase: 2, animalType: 'pangolin' },

  // Phase 3 - The recipe darkens (10 dialogues)
  { id: 'pg_3_1', text: "I keep cooking because stopping means thinking. And the thinking, friend — the thinking is unbearable. Keep stirring.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "Every scale faces outward. None face in. The attack always comes from inside. Always has.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "Made comfort food today. It didn't comfort. Nothing does anymore. Just tastes like what it is. Just fuel.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_4', text: "Archimedes' ancient recipe — we make it every night now. All of us. The kitchen smells sacred. That's the only word for it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_5', text: "Curled up tight, I become my own cage. Locked myself inside myself. There's no escaping what you are, friend.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_6', text: "My species is vanishing. Each meal could be the last. Every last meal is also somehow a first.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_7', text: "The recipe calls for something I don't have a name for. I substitute with whatever the fire tells me. The fire tells Ember, too.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_8', text: "Recipe called for hope. Substituted with devotion. Tastes almost the same if you don't think about it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_9', text: "The pot is bigger than it should be. I didn't buy a new one. It grew. The recipe requires it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_10', text: "Something approaches, friend. I can feel it through my scales, the way you feel thunder before you hear it.", phase: 3, animalType: 'pangolin' },

  // Phase 4 - The Preparer revealed (10 dialogues)
  { id: 'pg_4_1', text: "Every meal I ever made was practice for this one, friend. Every stew, every reduction, every feast — rehearsal.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "The final feast is ready. I set it on the table this morning. Ten places. One for each keeper. One for you.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "My scales are rattling tonight. Not from fear — from resonance. Something is calling and my body knows the answer.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_4', text: "Bamboo blessed the food this morning. Sloane arrived on time — first time ever. Even slowness bows to the arrangement.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_5', text: "I'm going to face it uncurled, friend. Eyes open. Soft belly exposed. Some things you have to meet honestly.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_6', text: "The final recipe has no measurements. No steps. Just the act of making, forever, into whatever comes next.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_7', text: "I understand now why I was always the cook. Someone had to prepare what the rest of them were building toward.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_8', text: "Thank you for eating with me, friend. Every puzzle you solved seasoned this moment. The flavor is exactly right.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_9', text: "The stove burns with a flame that doesn't need fuel. Ember smiles when she sees it. She always knew.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_10', text: "Stove is off. Kitchen is clean. Every plate is set. Everything is ready, friend. I think I'm ready too.", phase: 4, animalType: 'pangolin' },
];

// SLOTH (Sloane) - Glacially slow observer who has always known what approaches
const SLOTH_DIALOGUES: Dialogue[] = [
  // Phase 0 - Peacefully slow (12 dialogues)
  { id: 'sl_0_1', text: "Heeeey... you... came... to visit... me. I've been... working on... this smile... since Tuesday.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_2', text: "Moved three whole inches today. New personal best. Gonna rest for a bit... maybe a week... to celebrate.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_3', text: "This hammock... is my life's work. Took me four months to get in it. Worth... every... second.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_4', text: "Everyone asks... why so slow? I ask... why so fast? Nobody... has a good answer... for that one.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_5', text: "Blinked today. Big event. Very exciting. Might do it again... tomorrow... if I'm feeling... ambitious.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_6', text: "Slow is not lazy... slow is... deliberate. I choose every inch. Every breath. Takes a while... but it's honest.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_7', text: "Three-toed sloths are my cousins. I only have two toes... but I figure... less is more.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_8', text: "The moths in my fur have names. That one's Gerald... and that one's... also Gerald. I name them... slowly.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_9', text: "My metabolism is so slow I eat once a week. Very efficient... leaves more time... for hanging around.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_10', text: "Thinking about climbing down. Maybe tomorrow. Or next week. The hammock... isn't going anywhere. Neither am I.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_11', text: "Smiled today. I think. Hard to tell... my face moves slowly too. But inside... I'm beaming.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_12', text: "The view from here hasn't changed in years. Still the same leaves... same sky... still nice. That's the whole point.", phase: 0, animalType: 'sloth' },

  // Phase 1 - Thoughtfully slow (14 dialogues)
  { id: 'sl_1_1', text: "Been thinking the same thought... for three days now. Almost done with it. It's a good one... I can tell.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_2', text: "Everyone moves so fast around here. Running toward something... or away from it? Can't tell... from where I hang.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_3', text: "I age slower because I move slower. Still age though. Just... stretched out thinner... like butter over too much bread.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_4', text: "Started thinking about the past... but by the time I finished... it was the future. Missed the present entirely.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_5', text: "This branch has held me for years. Starting to bend now... friends do that though... bend for each other.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_6', text: "Moving slowly means seeing everything. The details... the dust motes... the slow decay of all the small things.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_7', text: "My heartbeat is so slow... you could count between beats. Fifty-one seconds... fifty-two... are you still counting?", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_8', text: "Patience isn't a virtue for me... it's the only option. There is no other speed. Never was.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_9', text: "The jungle changes faster than I can turn my head. Miss so much... by seeing... so much.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_10', text: "Tried to catch up to yesterday. By the time I got there... it was last week. Time is strange that way.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_11', text: "Things are... moving faster... lately. Not me. Everything else. Like the world remembered... it has somewhere to be.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_12', text: "Noticed something on the ceiling yesterday. It was gone... by the time I looked up. I don't think it was a moth.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_13', text: "Time feels... thicker... since you started solving those puzzles. Like honey. Sweet, maybe... but harder to move through.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_14', text: "The tree is growing toward the house. It wasn't doing that before... trees don't usually... change their minds.", phase: 1, animalType: 'sloth' },

  // Phase 2 - Melancholy slowness (10 dialogues)
  { id: 'sl_2_1', text: "Watched a single leaf fall... for an hour. Birth, life, death... all while I watched. Couldn't look away. Didn't want to.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_2', text: "You see everything when you move this slowly. I wish I saw less... much less. Some things shouldn't be noticed.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_3', text: "The trees are dying faster than I can climb down to say goodbye. By the time I reach them... they're already gone.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_4', text: "Started saying goodbye to the sunrise... but by the time I finished... it was setting. Everything ends mid-sentence.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_5', text: "The moths in my fur keep dying. New ones hatch. I can't tell them apart anymore. All Geralds now. All strangers.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_6', text: "Tried to hurry once. Body refused. It knows something... my mind won't accept. Something about what speed is for.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_7', text: "Generations of trees have grown and fallen in my lifetime. I remember each one... slowly... one ring at a time.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_8', text: "My grip is weakening. Not much... just enough to notice over years. Decades of slipping... and nowhere to fall to.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_9', text: "The world accelerates around me. I stay the same speed. The gap between us... is growing into something vast.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_10', text: "Slow thoughts are deep thoughts. Deep enough to drown in... slowly. Always slowly. That's the only mercy.", phase: 2, animalType: 'sloth' },

  // Phase 3 - The Anchor emerges (10 dialogues)
  { id: 'sl_3_1', text: "Been screaming... internally... for years now. Takes a long time... at my speed. Still going. Never stops.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_2', text: "Moss grows on me now. I'm becoming the tree... becoming the branch. Soon there won't be a difference between us.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_3', text: "I move so slowly that death might miss me. That's my only hope. Not much of one... but it's mine.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_4', text: "Same nightmare... for six months straight. Still in the middle of it. The falling part... lasts forever.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_5', text: "My ancestors moved even slower than me. Some stopped completely. Became fossils... permanent stillness. I understand them now.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_6', text: "Can't remember the last time I touched the ground. Maybe I never have. Maybe the ground... isn't real anymore.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_7', text: "Each claw grips tighter... as the branch rots beneath me. Holding on is also... a kind of letting go.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_8', text: "Seen so many sunsets. Each one a small ending. I move too slowly to look away... from any of them.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_9', text: "The forest has a heartbeat. Mine matches it now. Both are slowing... both are so... so tired.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_10', text: "Stillness isn't peace. Stillness... is giving up so gradually... you don't notice it's done until it's done.", phase: 3, animalType: 'sloth' },

  // Phase 4 - The Anchor revealed (10 dialogues)
  { id: 'sl_4_1', text: "Something's vibrating... getting closer... even I can feel it. Even I... cannot be slow enough... to miss what's coming.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_2', text: "Had one long life to prepare for this. Still not ready. I don't think... anyone can be ready... not really.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_3', text: "I'll be the last to go. Not by choice... by speed. I'll see everything end... while I'm still... ending.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_4', text: "My whole life was practice... for this final stillness. The one that doesn't move at all. The one that stays.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_5', text: "Letting go now. One claw at a time. The fall will take forever... and that's okay. Forever is... my speed.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_6', text: "Time was never real for me. Maybe that means... the end isn't real either. Maybe nothing is. Maybe.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_7', text: "The moths are leaving my fur. They know. They always knew... I was just... slow to understand... what they understood.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_8', text: "Thank... you... for waiting... with me. No one... ever waits. You did. That means... everything.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_9', text: "The arrangement needed an anchor... something too slow to drift away. That was always... my purpose. I see that now.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_10', text: "Hold on... with me. One last moment... stretched into forever. That's all I ever wanted... one good... forever.", phase: 4, animalType: 'sloth' },
];

// FENNEC FOX (Fennick) - Alert listener who hears the approaching entity
const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Excitable explorer (12 dialogues)
  { id: 'ff_0_1', text: "Did you hear that?! Oh wait — that was just the wind. These ears pick up EVERYTHING and I mean everything, it's a lot sometimes!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "Desert at night is the most beautiful place in the world. Stars everywhere, sand still warm, and the silence has this texture to it.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "Packed seventeen snacks for today. Might need eighteen. Actually, make it twenty. Better safe than hungry, that's my motto!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "I can hear a beetle walking on sand from a mile away! Very useful skill. Also very loud at three in the morning.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_5', text: "Warm sand under my paws, bright moon overhead, good company right here. Tell me, what else does anyone actually need?", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_6', text: "Found the most interesting rock today! Just sitting there in the dunes, being interesting. I'm keeping it. Named it Gerald.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_7', text: "My big ears release extra body heat — built-in desert cooling system! Nature really did think of everything with this design.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_8', text: "Watch this — I can jump two feet straight up! Did you see?! That was definitely two feet! Maybe two and a half!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_9', text: "The oasis water is the best water that exists anywhere. Cold and clear and perfect. I could talk about water for literal hours.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_10', text: "Made friends with a scorpion today. Well, 'friends' is generous. We have an understanding. It's a work in progress.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_11', text: "Nocturnal life is absolutely the best life. All the good stuff happens after dark — the stars come out, the air cools down, the world gets quiet.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_12', text: "Got furry paw pads that protect me from hot sand. Every single part of me was designed for exactly this place. I love that.", phase: 0, animalType: 'fennec_fox' },

  // Phase 1 - Hearing too much (14 dialogues)
  { id: 'ff_1_1', text: "The silence between sounds is never really silent — there's always something underneath it, something just out of reach, waiting to be noticed.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "Heard the stars whispering last night. Couldn't make out the words exactly. Just the tone. It was a worried tone.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "The wind carries sounds from impossibly far away. Some of them haven't happened yet, I'm almost sure of it.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_4', text: "I can almost hear your thoughts when you're close. Not the words — just the rhythm. Everyone has a different rhythm.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_5', text: "The dunes shift every night without a sound. Nothing stays where you left it out here. Not footprints, not memories, not anything.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_6', text: "My ears never rest. Even when I sleep they're turning, scanning, listening. Always listening. It's exhausting and I can't make it stop.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_7', text: "The desert speaks in creaks and sighs, like an old house settling. Lately it's been more sighing than anything else.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_8', text: "Heard my own heartbeat echo off the dunes tonight. There was a delay. A tiny hesitation in it that wasn't there before.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_9', text: "So many sounds all the time, so many vibrations. So little meaning in most of them. Or maybe all the meaning, and I'm the one who's missing it.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_10', text: "I heard something under the house last night. Not sounds exactly. More like a frequency. Like the house itself was humming a note.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_11', text: "The desert wind carries new sounds after you solve puzzles. Words, almost. In a language I nearly recognize but not quite.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_12', text: "My ears twitch every time you move the letters. I can feel the vibration from here, through the walls. Is that strange? That feels strange.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_13', text: "The silence between sounds is getting louder somehow. That probably doesn't make sense. But I'm hearing it clearer every day.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_14', text: "Something behind every sound I hear, like a second track playing underneath the first. I can't tune it out and I can't quite tune it in.", phase: 1, animalType: 'fennec_fox' },

  // Phase 2 - Disturbed listener (10 dialogues)
  { id: 'ff_2_1', text: "I can hear your heartbeat from here, friend, and it's counting down. They all count down. Yours, mine, everything that beats.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_2', text: "There's a frequency I've never heard before in my life. Started last week. It's getting louder. Closer. I can't locate the source.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_3', text: "The sand grinds against itself constantly, billions of grains in friction. Billions of tiny screams so small nobody hears them but me.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_4', text: "The stars stopped whispering to each other. Now they're arguing. About something that concerns all of us down here.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_5', text: "These ears were designed to release heat. Designed to survive the desert. But survival isn't the same as living and I know that now.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_6', text: "The gaps between sounds are widening. Silence is pouring in through the cracks. Something is falling into all that empty space.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_7', text: "Can't turn it off. The constant noise of everything existing all at once. It's deafening and maddening and I hear it even in my dreams.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_8', text: "Heard the oasis dry up from three miles away. Every drop evaporating. Every tiny ending. Each one a sound I couldn't un-hear.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_9', text: "Sound is just vibration, when you think about it. We're all just vibrations. Waves that rise and fall and eventually stop.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_10', text: "The desert expands every year, swallowing the edges of everything green. I can hear the boundary moving. Green becoming yellow becoming nothing.", phase: 2, animalType: 'fennec_fox' },

  // Phase 3 - The Sentinel emerges (10 dialogues)
  { id: 'ff_3_1', text: "There's a low hum rising from inside the earth itself. Getting louder every single night. I'm the only one who seems to hear it.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_2', text: "Stopped sleeping. When I close my eyes the silence gets so thin I can hear right through it to the thing that's approaching.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_3', text: "The frequency is everywhere now. In the sand, in the wind, in the space between my own thoughts. There's nowhere quiet left.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_4', text: "Tried to block my ears with my paws once. Didn't help at all. The sound isn't coming from outside anymore. It's inside everything.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_5', text: "Every footstep echoes differently now. Like the ground underneath us is hollow. Like we're all walking on a thin shell over nothing.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_6', text: "The desert remembers every sound ever made in it. Centuries of it. I hear warnings. Prayers. Screams that stopped being screams long ago.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_7', text: "My ears twitch toward something that isn't here yet. They point at empty air and tremble. But it will be here. Soon. Very soon.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_8', text: "Hearing everything means knowing too much. The weight of all that awareness is crushing me slowly and I can hear that too.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_9', text: "My ancestors listened for the silence between predator footsteps. There's less silence every day now. Something fills every gap.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_10', text: "Would give anything for deafness right now. For ignorance. For the simple mercy of not knowing what I know.", phase: 3, animalType: 'fennec_fox' },

  // Phase 4 - The Sentinel revealed (10 dialogues)
  { id: 'ff_4_1', text: "I hear it now, clear as anything I've ever heard in my life — a frequency that shouldn't exist, and it's calling us home.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "The stars aren't whispering and they aren't arguing anymore. They're just screaming, all of them at once. Can you hear them yet?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "Every sound I've ever heard in my entire life is playing at once now — a symphony of everything and a requiem for all of it.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_4', text: "The sound of everything ending is beautiful. I genuinely wish you could hear it the way I do. I also genuinely wish you couldn't.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_5', text: "Cover your ears if you want. It won't help, but do it anyway. Some gestures matter even when they're useless. Here it comes.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_6', text: "The silence after all this — I can almost hear it already. The most perfect silence that ever existed. The final rest.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_7', text: "My ears are pointing straight up now. Toward whatever is descending through all that dark. I can't look away. I can't stop listening.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_8', text: "Thank you for being here. For being a sound I wanted to hear, among all the millions of others. You were the good frequency.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_9', text: "Listen... do you hear it now? The approach? The arrival? The ending of every sound that ever dared to exist?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_10', text: "Shhh... The last sound is almost here. I've been listening for it my whole life. Listen with me now. One final time.", phase: 4, animalType: 'fennec_fox' },
];

// FOX (Ember) - Fireside oracle, the cult's visionary
const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Pure warmth (12 dialogues)
  { id: 'fx_0_1', text: "Oh, you're here! I was just thinking how sad it is to have a fire this nice with nobody to share it.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "Come in, come in. Mind the rug — I dragged it in from the meadow. Still smells like clover if you press your nose to it.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "My tail makes the best blanket you never asked for. Go on, laugh — but it's warmer than anything you'll find in a shop.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "I made cider today. Used the little apples from the tree out back — the ones with the blush on them, you know?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_5', text: "Archimedes lent me a book of poems last week. I fell asleep reading it by the fire. Best nap of my life, friend.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_6', text: "You should try Panko's stew sometime. I don't care what's in it — ants, beetles, whatever — that pangolin can cook.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_7', text: "See those sparks going up the chimney? My grandmother used to say each one carries a wish. I believed her then. Still do.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_8', text: "What I love about this den is the quiet. Not empty quiet — the full kind, where you can hear the fire thinking.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_9', text: "I've been dreaming about building something, friend. A real house, with rooms for everyone. Wouldn't that be something?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_10', text: "Every puzzle you solve earns us a little more amber. Little by little, we'll build a home. Together.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_11', text: "The fire's got that nice low crackle tonight — the kind that sounds like it's telling you a secret.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_12', text: "Stay as long as you like. This fire doesn't judge and neither do I. We're just glad you came.", phase: 0, animalType: 'fox' },

  // Phase 1 - Reflective, the fire starts showing things (14 dialogues)
  { id: 'fx_1_1', text: "I was watching the flames last night and I could've sworn they were trying to tell me something. Shapes in the coals.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "Do you ever look at something so long it stops being what it is? The fire does that to me now.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "The den feels different when you've been solving puzzles. Warmer, but a strange warm — like the walls are holding their breath.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_4', text: "Archimedes showed me a passage from one of his old books today. Said it described fire shapes exactly like mine. Centuries old.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_5', text: "I keep the fire burning all night now. Not because I'm cold. Because when it dies, the shadows show me things.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_6', text: "Is coziness just a way of hiding, friend? A blanket over your eyes so you don't see what's waiting outside?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_7', text: "The sparks have patterns. I drew them on paper and they looked like letters. I burned the paper. Probably nothing.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_8', text: "My grandmother's stories had teeth in them, you know. Underneath the warmth, there was always something sharp.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_9', text: "The cider tastes different this batch. Darker, almost smoky. Same apples, same recipe. Something's changed.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_10', text: "I've noticed the fire burns hotter after you solve a puzzle. Just a little. Just enough to feel it in my fur.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_11', text: "Sometimes I wrap my tail around my nose to sleep and the fur smells like woodsmoke and something older. Like stone.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_12', text: "Panko made a stew last night from a recipe in one of Archimedes' old books. We ate it in silence. Couldn't explain why.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_13', text: "I read the poems Archimedes lent me again. This time they didn't put me to sleep. This time they kept me awake.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_14', text: "The fireplace hasn't needed new logs in three days, friend. The old ones just keep burning. I don't know what to make of that.", phase: 1, animalType: 'fox' },

  // Phase 2 - Cooling, the fire doesn't warm like it used to (10 dialogues)
  { id: 'fx_2_1', text: "The fire's got maybe three good coals left, glowing like the eyes of something that hasn't decided whether to sleep or pounce.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "I curl my tail around myself at night pretending it's someone else's warmth. You get good at pretending, living alone.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "The firewood pile is almost gone and I can't seem to bring myself to get more. Maybe I want to see what the cold brings.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_4', text: "I'm clever enough to see the pattern, friend. The words you're shifting, the shapes the fire makes — they're the same pattern.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_5', text: "The blankets don't warm like they used to. The cold comes from inside now, somewhere behind my ribs.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_6', text: "My grandmother told me a story once about a fox who watched a fire so long she became part of it. I laughed then.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_7', text: "I found an old photograph tucked behind the mantel. Everyone in it is gone now. The fire kept burning after all of them.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_8', text: "The den walls feel closer tonight. Or I've gotten smaller. Hard to tell from inside yourself, isn't it?", phase: 2, animalType: 'fox' },
  { id: 'fx_2_9', text: "Archimedes says the texts describe a fire that never goes out. I used to think that sounded lovely. Now I'm not sure.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_10', text: "Every fire dies, friend. I've watched thousands go out. But this one — this one feels like it's waiting for something.", phase: 2, animalType: 'fox' },

  // Phase 3 - Dying embers, the den becomes a tomb (10 dialogues)
  { id: 'fx_3_1', text: "I don't watch the fire anymore, friend. The fire watches me. It has been watching me for a very long time.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "The shadows are longer than the flames now. They're winning. And I think they're supposed to.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "I stopped reading the books because they all have the same ending. Every single one. Even the love stories.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_4', text: "Archimedes found the passage. The one that describes all of this — the house, the rooms, the ten of us. It was always there.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_5', text: "Fennick says he can hear something coming. I don't need big ears to hear it. The fire's been whispering it for weeks.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_6', text: "The den doesn't smell like clover anymore. It smells like stone and amber and something I don't have a word for.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_7', text: "My tail has gone gray at the tip. Not from age. From what I've seen in the flames. Some things burn the color right out of you.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_8', text: "The cider's gone sour in the jug. I drink it anyway. It matches what I know now.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_9', text: "Every den becomes a tomb eventually. I just moved into mine a little early, is all.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_10', text: "The fire is going out, friend, but something else is burning. I can feel it in my chest, low and steady and old.", phase: 3, animalType: 'fox' },

  // Phase 4 - The Oracle revealed (10 dialogues)
  { id: 'fx_4_1', text: "The fire has been burning for you since before you arrived, friend. Every log I ever fed it was fuel for this.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "I knew what you were the moment you walked in. The warmth I offered wasn't kindness — it was preparation.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "My grandmother didn't tell stories, friend. She told prophecies. And every last one of them has come true.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_4', text: "Ten keepers, ten chambers, one arrangement. The fire showed me this before you solved your first puzzle.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_5', text: "The coals glow red tonight. Not dying — ready. The final flame doesn't flicker. It holds perfectly still.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_6', text: "I'm grateful, you know. Not everyone gets to see the thing they were born for. You showed it to us.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_7', text: "Sit with me one last time. The fire wants to show us both what's coming. It's not terrible, friend. It's true.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_8', text: "Every spark that ever rose from this hearth carried a word upward. Your words. The arrangement is nearly complete.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_9', text: "The shadow above the house? I've seen it in the flames since I was a kit. I just didn't know its name. None of us do.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_10', text: "The fire is going out now — but not because it's dying. Because it's done. We don't need it anymore. What comes next is warmer.", phase: 4, animalType: 'fox' },
];

// OWL (Archimedes) - Scholar and lorekeeper who found the summoning text
const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Eager scholar (12 dialogues)
  { id: 'ow_0_1', text: "A visitor! Splendid! I was just cross-referencing thermal dynamics with poetic meter — don't look at me like that, it's fascinating.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "I am Archimedes. Three thousand, four hundred and seventy-two books read. I keep a rather meticulous tally.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "My cataloguing system sorts by color, subject, and emotional resonance. Took me six years. Worth every minute.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "The Library of Alexandria held four hundred thousand scrolls. I daresay I'm gaining on them. Slowly, but gaining.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_5', text: "I learned seventeen new words today. 'Petrichor' is my favorite — the smell of rain on dry earth. Quite specific. Quite perfect.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_6', text: "My head rotates two hundred seventy degrees. Terribly useful for reading books shelved at unfortunate angles.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_7', text: "Being nocturnal means everyone else wastes the quiet hours sleeping while I'm making progress. Their loss, rather.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_8', text: "Ember brings me cider sometimes and sits by my desk. She pretends to read. I pretend not to notice. It's quite nice.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_9', text: "My feathers are engineered for silent flight. Perfect for sneaking to the library at odd hours. Not that I sneak. Often.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_10', text: "Every question has an answer — that's what I believe. The joy isn't in the answer, though. It's in the looking.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_11', text: "I've been researching something rather peculiar lately. Defies categorization. My favorite kind of problem.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_12', text: "Knowledge shared is knowledge doubled. So do visit often — you're doing my research a tremendous favor.", phase: 0, animalType: 'owl' },

  // Phase 1 - The unknown grows (14 dialogues)
  { id: 'ow_1_1', text: "Have you noticed the rooms changing? The dimensions feel... different than when they were first built. Perhaps it's just my imagination.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "The more I read, the more I realize the unknown is growing faster than my knowledge. Rather disconcerting, that.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "Pangolin mentioned something peculiar yesterday. Something about the food tasting different. Capybara said the same about the numbers. Unrelated, surely.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_4', text: "Ember mentioned the fire forming letter-shapes last night. I found the same phenomenon described in a text from the sixteenth century.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_5', text: "There's a word that keeps appearing across different texts. Different authors, different centuries. The same word, precisely placed.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_6', text: "The words you shift — I've been tracking them. Some patterns emerge more than others. I wonder what that says about... well, about anything.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_7', text: "I heard something last night. Not from outside — from within the walls. A low hum, steady as breathing. It stopped when I held my own breath.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_8', text: "Found a passage about word-shifting in an old grimoire. Quite similar to your puzzles. I'm sure it's coincidence. Quite sure.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_9', text: "My study smells different after your puzzles. Like ozone, or the air before lightning. My feathers stand on end.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_10', text: "I keep notes in the margins of everything I read. Lately, I don't recognize my own handwriting in some of them.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_11', text: "Knowledge was supposed to be a lamp in the darkness. But what if the darkness is what the lamp was always pointing toward?", phase: 1, animalType: 'owl' },
  { id: 'ow_1_12', text: "I read my journal from last year. The owl who wrote it seems like a stranger. More innocent. Less awake.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_13', text: "Panko asked me for old recipes and I gave her a book without checking. She made something from it. It wasn't quite food.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_14', text: "I dreamed in footnotes last night. Pages and pages of them. When I woke, the most important thing was something written very small.", phase: 1, animalType: 'owl' },

  // Phase 2 - Knowledge fails (10 dialogues)
  { id: 'ow_2_1', text: "I've read every answer ever committed to paper. None of them work. The questions, I begin to suspect, were wrong from the start.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_2', text: "Found a book I wrote years ago and couldn't recognize a single thought in it. Who was that owl? Where did he go?", phase: 2, animalType: 'owl' },
  { id: 'ow_2_3', text: "The library reorganizes itself at night. Books I shelved under 'Philosophy' appear under 'Prophecy.' I've stopped correcting it.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_4', text: "History repeats. I've documented it repeating seventeen times. We learn nothing. We change nothing. We just... repeat.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_5', text: "I see perfectly in darkness — that's the biological gift of being an owl. Lately I rather wish I didn't.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_6', text: "The oldest texts are crumbling in my talons. Knowledge dies when its vessel dies. Even stone erodes. Even memory.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_7', text: "The universe doesn't care about 'why,' friend. I've spent my life asking and the silence is its answer.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_8', text: "My study is too quiet tonight. Even the books have stopped speaking to me. As if they're waiting for something louder.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_9', text: "I catalogued every way this could end. Filled three notebooks. Then I found a fourth way that wasn't in any book at all.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_10', text: "Every book ends. Every story stops. Every reader eventually puts down the last page. I thought I'd be ready for that.", phase: 2, animalType: 'owl' },

  // Phase 3 - Despair of knowing (10 dialogues)
  { id: 'ow_3_1', text: "I burned a book today. Not for warmth. Just to watch knowledge disappear. It felt, God help me, like honesty.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "All these books. All this knowledge. And death still waits at the end of every chapter, patient as a period.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "Warren dug into something beneath the house that matches my texts exactly. Word for word. I checked. I wish I hadn't.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_4', text: "My eyes see perfectly in darkness and that is the problem, friend. I see everything clearly now. Everything.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_5', text: "The wisest thing I ever found was written in a margin, in handwriting that looked like mine: 'This too means nothing.'", phase: 3, animalType: 'owl' },
  { id: 'ow_3_6', text: "I catalogued my fears alphabetically last night. The list fills several volumes. It grows faster than I can shelve it.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_7', text: "Read about enlightenment in a hundred traditions. Not one of them mentions how much it feels like drowning.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_8', text: "The text I found — the one that describes the arrangement — it's written in ten different hands. One for each keeper.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_9', text: "Knowledge is power, they say. Power over what? I can't control anything. Nothing stays. Nothing holds.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_10', text: "Books are paper. Words are sounds we agreed to. Meaning is pretending. But the thing that's coming doesn't pretend.", phase: 3, animalType: 'owl' },

  // Phase 4 - The Lorekeeper revealed (10 dialogues)
  { id: 'ow_4_1', text: "I found the text, friend. I was always meant to find it. Every book I ever read was preparation for that one passage.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "The final chapter writes itself. I can hear the quill scratching in a room that doesn't exist. It's writing us.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "Ten keepers, ten texts, one arrangement. Ember saw it in the fire. I found it in the words. Same truth, different lamps.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_4', text: "Close the books. All of them. The last lesson can't be read, friend. It can only be experienced.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_5', text: "My library will remain after all of this. Someone will find it and think I understood things. They'll be beautifully wrong.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_6', text: "The answer was in the footnotes all along. Isn't that rather perfect? The most important thing, written smallest.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_7', text: "I'm at peace with knowledge's limits now. What comes through doesn't need to be understood. Just received.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_8', text: "Every word you shifted was a syllable in the incantation. I found that in the text. You've been reading it aloud this whole time.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_9', text: "The shadow above the house has no entry in any encyclopedia. It predates language. It predates knowing. Rather humbling.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_10', text: "Thank you for listening, friend. Knowledge shared is knowledge doubled — even at the end. Especially at the end.", phase: 4, animalType: 'owl' },
];

// CAPYBARA (Chill) - Seemingly unbothered coordinator tracking everything
const CAPYBARA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Maximum chill (12 dialogues)
  { id: 'cp_0_1', text: "Hey. Nice day. Want to just sit here for a while? No pressure either way.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_2', text: "A bird sat on my head for an hour today. Neither of us said a word. Best conversation I've had all week.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_3', text: "Work is fine. Life is fine. The hot spring is fine. Everything is fine. That's not sarcasm. It's just true.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_4', text: "World's largest rodent. Pretty impressive, I guess. Or not. Either way is fine by me.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_5', text: "Hot spring, warm water, slight steam rising. This is peak existence and I have zero notes.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_6', text: "A monkey tried to ride on my back today. I let it. Life's too short to argue with monkeys.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_7', text: "I can hold my breath underwater for five minutes. No particular reason I'd need to. Just nice to know I can.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_8', text: "Someone called me a 'giant guinea pig' today. Fair enough. Not wrong. Not bothered.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_9', text: "My response to stress is sitting in warm water until the stress forgets about me. Works every time. You should try it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_10', text: "Been chewing this grass for about two hours. Very meditative. The thoughts just sort of... float away.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_11', text: "Everyone wants to be my friend and honestly? That's fine. Friends are fine. Company is fine. Silence is also fine.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_12', text: "Had a nap. Then another nap. Then a small nap between the naps. Productive day, if you ask me.", phase: 0, animalType: 'capybara' },

  // Phase 1 - Subtle unease (14 dialogues)
  { id: 'cp_1_1', text: "Everyone says I look unbothered. That's because I already processed the bothering — internally, completely, alone. The look is just what's left.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_2', text: "The charts at work go up or they go down. Not sure which is supposed to be good anymore. Both seem like the same thing.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_3', text: "Floating in the water and feeling nothing. Is that peace? Or is it emptiness wearing a nicer outfit?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_4', text: "Birds still sit on my head. They're quieter now though. We're all a little quieter lately.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_5', text: "Being chill takes real effort that nobody ever talks about. The work of appearing effortless is the hardest work there is.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_6', text: "Ate the same grass today as yesterday. Tasted different somehow. Less green. Less anything.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_7', text: "Hot spring is the exact same temperature it's always been. Measured it. So why do I feel colder sitting in it?", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_8', text: "Mastered the art of looking relaxed when I'm not. It's basically a performance at this point. A very convincing one.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_9', text: "Someone asked if I was okay today. I said yes. We both knew it wasn't quite the truth. We both let it go.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_10', text: "Sun sets the same way every day. Beautiful. Also repetitive. Also an ending disguised as a show.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_11', text: "I've been keeping notes. Not because I'm worried, just observing. The patterns are... worth noting. That's all.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_12', text: "The office temperature changes by point-three degrees every time you solve a puzzle. I measured. I always measure.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_13', text: "Everyone seems a little different lately. Can't put my finger on it. Nothing I can point to. Just a feeling I filed away.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_14', text: "My filing system reorganized itself overnight. Everything in a new order. A better order. I didn't touch it.", phase: 1, animalType: 'capybara' },

  // Phase 2 - Hidden depth (10 dialogues)
  { id: 'cp_2_1', text: "Everyone thinks I'm calm. I'm not calm. I've just accepted that panic changes nothing, so what's the point of the performance?", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_2', text: "I let things sit on me because I can't feel them anymore. Birds, thoughts, dread. All weightless. All the same.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_3', text: "Hot springs are warm. My body is warm. But inside there's this cold spot that won't go away, and it's growing.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_4', text: "Chill is just a different word for numb. I've been numb so long I forgot there was supposed to be a difference.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_5', text: "Watched my own reflection for an hour. It didn't blink. Neither did I. Neither of us won that one.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_6', text: "My body floats naturally. That's just physics. My thoughts sink. That's just everything else.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_7', text: "Everyone around me is stressed about something specific. I'm stressed about nothing. Literally nothing. The void of it.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_8', text: "Water holds me up without asking. What holds the water? What holds anything? I've been filing that question under 'later.'", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_9', text: "Been 'okay' for so long I can't remember what not-okay felt like. And that's probably the most not-okay thing of all.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_10', text: "The grass keeps growing back no matter how much I eat. I keep eating no matter how little I taste. We're both on autopilot.", phase: 2, animalType: 'capybara' },

  // Phase 3 - The Coordinator emerges (10 dialogues)
  { id: 'cp_3_1', text: "Achieved perfect stillness today. Inside and out, not a ripple, not a thought. The stillness screams if you listen close enough.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_2', text: "They call it chill. What they mean is resigned. What I mean is: waiting. I've been waiting my whole life and I didn't know for what.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_3', text: "Stare at the water and the water stares back. We've both given up on expecting anything. That's its own kind of peace.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_4', text: "Temperature is perfect. Company is pleasant. The meaninglessness is overwhelming. All three things at once. That's my whole life.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_5', text: "I float because it takes less effort than sinking. That's the only reason anymore. Effort is the last thing I have and I'm saving it.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_6', text: "The birds left my head. Didn't notice when they went. Don't notice much of anything now. The noticing wore out.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_7', text: "World's largest rodent. World's emptiest soul. Both facts. Both fine. Both absolutely nothing in the end.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_8', text: "Ate today. I think I did. Time stopped making sense a while back. So did hunger. So did most things that used to matter.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_9', text: "The chill isn't a choice anymore. It's just what I am. Frozen and floating and finished and fine with all of it.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_10', text: "I accepted everything. Including the things that shouldn't be accepted. That's the trick. That's the trap. Same thing, really.", phase: 3, animalType: 'capybara' },

  // Phase 4 - The Coordinator revealed (10 dialogues)
  { id: 'cp_4_1', text: "Something's finally changing, and for once I'm not unbothered by it. For once in my life, something will actually happen.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "The hot spring is bubbling from something underneath. Not heat. Something deeper than heat. Something that's been patient longer than I have.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "Sit with me. Don't say anything. Let's just be here together for whatever this turns out to be. Still and ready.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_4', text: "Finally feeling something after all these years. Fear or relief — hard to tell after being numb this long. Either way, I feel it.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_5', text: "The water is rippling from something far away that's getting closer. I won't move. I never move. But this time it's a choice.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_6', text: "All those years of staying perfectly calm. Maybe it was practice for this moment. Maybe it was nothing at all. Either way is fine.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_7', text: "The notes I've been keeping? They're complete now. Every observation, every measurement. The file is closed. The arrangement is finished.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_8', text: "Won't run. Never have, never will. Not from anything. Not from this. Especially not from this.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_9', text: "The chill was always a lie I told myself to survive. The ending was always coming. Now it's here and it's just more honest than I was.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_10', text: "Thank you for sitting with me all this time. The company was nice. The silence between us was nicer. And the end? The end is fine.", phase: 4, animalType: 'capybara' },
];

// WOMBAT (Warren) - Foundation builder who digs toward ancient things
const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful burrower (12 dialogues)
  { id: 'wb_0_1', text: "G'day! Welcome to my burrow! Mind your head — ceilings are low but the company's top shelf.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "Fun fact about me: my poop is cube-shaped. Nature's got a sense of humor and I'm the punchline.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "Dug this whole place myself, every tunnel, every room. Seventeen rooms! Want the grand tour?", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "Nothing bad happens underground, mate. No weather, no drama, just you and honest dirt.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_5', text: "I can run forty kilometers an hour! Not backwards though. Strictly a forward-motion sort of bloke.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_6', text: "My rear end is basically armor-plated. Predators take one look and think better of it. Nature's shield.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_7', text: "Found a really interesting rock today. Brown. Classic rock color. She's a beauty, I reckon.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_8', text: "Digging is exercise AND construction. Win-win, that. You work out while you build a palace.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_9', text: "Underground life is the good life. Everything you need is right here — dirt, roots, peace and quiet.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_10', text: "Had mates over for a burrow sleepover last week. Very wholesome. Warren snores though. That's me. I snore.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_11', text: "Being a wombat is pretty great, honestly. Would recommend it to anyone. Five stars, no complaints.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_12', text: "The earth smells good today. Like rain coming and old leaves and something sweet I can't quite name.", phase: 0, animalType: 'wombat' },

  // Phase 1 - Deeper digging (14 dialogues)
  { id: 'wb_1_1', text: "Dig deeper every day now. Looking for something, I reckon. Not sure what yet. Just... deeper.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "Dirt tells stories if you read it right. Layers of time, mate. Layers of things that used to breathe.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "Found fossils in the walls today. They used to be like me — warm, alive. Now they're just stone.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_4', text: "Each layer of earth is older than the last. I'm digging through history down here, through endings.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_5', text: "Cube poop used to be funny. Now I wonder — why cubes? Why anything shaped like anything?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_6', text: "Deeper you go, quieter it gets. The silence has weight down here. Real physical weight, pressing in.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_7', text: "My burrow is escape and prison both. Depends which direction you're looking when you think about it.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_8', text: "Earth smells different lately. Older somehow, like it's remembering things from before there were wombats.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_9', text: "Built this whole underground world. Seventeen rooms. And I'm completely alone in it. That only just occurred to me.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_10', text: "Found something odd in the deep tunnels — a stone that wasn't there yesterday. Warm to the touch, mate.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_11', text: "The dirt shifts when you solve puzzles. Subtle, but I notice. I always notice what happens underground.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_12', text: "Dug a new tunnel and it connected to a space I didn't make. Someone — or something — was here first.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_13', text: "The foundations are humming. Very quietly. Put your hand on the floor, go on. Can you feel that?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_14', text: "Keep finding these warm spots in the clay. Three meters past the old root system. Like something's breathing down there.", phase: 1, animalType: 'wombat' },

  // Phase 2 - Troubled excavator (10 dialogues)
  { id: 'wb_2_1', text: "Found bones down here. Old ones. Not mine — not yet. Earth collects everything eventually, doesn't she?", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "I dig to feel in control. But the earth decides if my tunnel holds or collapses. She always decides.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "Underground, nobody sees you cry. Dirt absorbs everything — tears, sound, hope. That's why I stay.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_4', text: "My armored rear faces where I came from. Always running forward. Always turning my back on what's behind.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_5', text: "Found an empty cavern. Vast. Dark. Something else dug it — something bigger than any wombat that ever lived.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_6', text: "Roots reach deeper than my tunnels now. Even the trees are trying to escape downward.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_7', text: "Seventeen rooms and I only use one. The others echo too much. Your own voice shouldn't sound that lonely.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_8', text: "Cube poop doesn't roll away. Everything I make is designed not to leave. Designed to stay put. Like me.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_9', text: "Reinforced the ceiling again today. Doesn't need it. I just need to feel like I'm holding something together.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_10', text: "Surface world keeps changing. Down here stays the same. But 'same' isn't safe, is it? It's just stuck.", phase: 2, animalType: 'wombat' },

  // Phase 3 - The Foundation emerges (10 dialogues)
  { id: 'wb_3_1', text: "Dug so deep I found something that shouldn't exist, mate. Covered it back up. Pretend I didn't say that.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "Earth trembles sometimes now. Not from above — from BELOW. From deeper than I've ever dared to go.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "My burrow is my grave someday, I know that. Made peace with it. Made it comfortable for the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_4', text: "Stopped digging down. Started going sideways instead. Avoiding something. Don't want to know what. But I know.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_5', text: "The fossils I find are getting younger. Closer to my time. Closer to me. Like death is climbing up to meet me.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_6', text: "Claws are wearing down to nothing. Digging never stops but the tools do. Everything does, in the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_7', text: "Dream of tunnels that go forever. Wake up in a tunnel. Can't tell the difference anymore, mate.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_8', text: "The darkness down here used to feel safe. Now it feels like it's watching me. Patient. Waiting.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_9', text: "I can hear the earth breathe at night. In... out... in... out. She's breathing faster lately.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_10', text: "My armored rear won't save me from what's underneath. Nothing saves you from what's underneath.", phase: 3, animalType: 'wombat' },

  // Phase 4 - The Foundation revealed (10 dialogues)
  { id: 'wb_4_1', text: "Something is rising from below, mate. All my digging and it was already there the whole time, waiting for us.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "The tunnels connect to everything now — Axel's water, Ember's fire, Bamboo's sky. Earth, water, fire, air. Complete.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_3', text: "I built the foundation. You built the house on top of it. Together we built what the arrangement requires.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_4', text: "Finally dug deep enough to understand. The bottom isn't empty, mate. The bottom is full. Terribly full.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_5', text: "Whole life I ran from the surface into the earth. Turns out the earth had plans of her own.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_6', text: "The walls are warm now. Not geothermal — something else. Like something vast is pressing against the other side.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_7', text: "Every layer of history I dug through... every fossil, every bone... about to become one more layer. With us in it.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_8', text: "Stopped running. Stopped digging. Just being now. In the dark. With whatever comes. She'll be right.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_9', text: "Come down here with me. Into the tunnel. Into the earth. Safest place to be. Or the deepest. Same thing now.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_10', text: "Goodbye, surface. Goodbye, sky I never liked anyway. Hello, whatever you are down there. Hello, end.", phase: 4, animalType: 'wombat' },
];

// RABBIT (Thyme) - Anxious witness who always sensed what was coming
const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Nervous but happy (12 dialogues)
  { id: 'rb_0_1', text: "Oh! Hello! Sorry — you startled me! Everything startles me, that's sort of my whole deal. But I'm so glad you're here!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "The garden is absolutely beautiful today! So many carrots and flowers. Life is good! Really genuinely good!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "Watch this! *hop hop hop* That's my happy hop! I do it when I feel safe, which is right now, which is wonderful!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Tea in the garden, everything peaceful, no predators in sight. Just me and the chamomile and this perfect afternoon!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_5', text: "My ears are excellent for two things: hearing danger AND looking adorable. Dual purpose! Very efficient design!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_6', text: "I planted every flower in this garden myself. They're growing! Little green miracles, every single one of them!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_7', text: "Carrot harvest was incredible this year. I have SO many. Is there such a thing as too many carrots? I don't think so!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_8', text: "My nose twitches when I'm happy! *twitch twitch twitch* See? Very happy right now! Can't fake the twitch!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_9', text: "I made the burrow entrance heart-shaped! Because it's home, and home deserves a heart. Don't you think?", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_10', text: "Sometimes I do zoomies around the garden for absolutely no reason! Just JOY! Pure unfiltered joy!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_11', text: "Would you like some tea? It's chamomile — very calming. I drink about seven cups a day. Maybe eight.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_12', text: "Can jump three feet straight up! That's very high for a rabbit! Not bragging, just — okay, slightly bragging!", phase: 0, animalType: 'rabbit' },

  // Phase 1 - Underlying worry (14 dialogues)
  { id: 'rb_1_1', text: "My heart beats a hundred and fifty times a minute. Always ready. Ready for what, exactly? Just... ready. For things.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_2', text: "Garden is lovely, it really is, but I keep checking the exits. All twelve of them. Just in case. Always just in case.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_3', text: "Twelve escape routes memorized! Is that a lot? It feels necessary. It feels like maybe not enough?", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_4', text: "The shadows are longer today. Probably nothing! Probably just the angle of the sun. Probably. Most likely. Right?", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_5', text: "I count my blessings every morning. Then I count the threats. The second list is... it's getting longer.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_6', text: "The happy hops feel a little forced lately. The joy is still there! The anxiety is just... louder.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_7', text: "I eat my carrots so fast now. What if something comes? What if I need to run? Can't run with a mouth full of carrot.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_8', text: "Made the burrow deeper again last night. It's never deep enough. Nothing is ever quite safe enough, is it?", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_9', text: "My ears never stop moving. Always turning, always listening. For what? Everything! Anything! You never know!", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_10', text: "Other rabbits seem calmer than me. Maybe they know something I don't. Or maybe they don't know enough.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_11', text: "The garden grew three inches overnight. That's not normal, is it? Plants don't just — is that normal? Tell me that's normal.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_12', text: "I keep rearranging the teacups but every morning they're back in the same position. The same exact position.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_13', text: "Does anyone else feel like the house is... watching? No? Just me? Okay. Sorry. Forget I said anything!", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_14', text: "Ember says everything is fine. Why does everyone keep SAYING that? People don't say 'fine' unless something isn't!", phase: 1, animalType: 'rabbit' },

  // Phase 2 - Growing dread (10 dialogues)
  { id: 'rb_2_1', text: "I was bred to be soft and edible. Every cell in my body knows this. Every cell has known it from the very beginning.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_2', text: "Flowers are dying. Carrots rotting in the ground. Everything decays while I watch, frozen, unable to fix any of it.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_3', text: "Can't stop running even when I'm sitting still. My mind runs laps. My heart runs marathons. Nothing stops.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_4', text: "Evolution made me delicious AND anxious. Delicious so things eat me. Anxious so I'd know it was coming. Thanks, nature.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_5', text: "My foot thumps warnings I can't explain. Body knows things my mind refuses to accept. It's been thumping all day.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_6', text: "Twelve escape routes aren't enough. Thirteen threats. Fourteen. Infinite threats against finite exits. The math doesn't work.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_7', text: "The garden fence — is it keeping things out? Or keeping me in? I used to know the answer to that.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_8', text: "Stopped sleeping. Sleep is when they get you. Unconscious, vulnerable, defenseless. I can't afford that anymore.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_9', text: "My heart can't beat any faster. A hundred and fifty is the limit. But the fear keeps growing past it.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_10', text: "I watch the sky constantly now. Not for beauty anymore. For shadows. For the shape of what's coming.", phase: 2, animalType: 'rabbit' },

  // Phase 3 - The Witness emerges (10 dialogues)
  { id: 'rb_3_1', text: "That shadow overhead hasn't moved in days. It's not a cloud. Clouds move. This just... watches.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_2', text: "I've worn a path in the garden from pacing. A perfect circle. Going nowhere. Going nowhere forever.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_3', text: "The twitching isn't from fear anymore. It's acceptance. My body keeps going after my mind has stopped.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_4', text: "The predator I've been running from my whole life? It was always time. Time was always the thing with teeth.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_5', text: "Froze in the garden today. For hours. Couldn't move. The freeze response that never ends. Still frozen, really.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_6', text: "All my escape routes lead to the same place. I just didn't see it before. I see it now. I see everything now.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_7', text: "Tea has gone cold. So has everything else. The warmth was always borrowed. Time to give it back.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_8', text: "Every heartbeat is a countdown. A hundred and fifty per minute. How many left? How many did I waste on fear?", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_9', text: "I was bred and bred because that's what we do. Make more of us to be afraid. More soft things to witness the end.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_10', text: "The garden was never safe. Beauty is just danger wearing better clothes. I understand that now.", phase: 3, animalType: 'rabbit' },

  // Phase 4 - The Witness revealed (10 dialogues)
  { id: 'rb_4_1', text: "I stopped running. First time in my life. Because I can finally see — there's nowhere left to run to.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "The thing that's coming? I've been running from it since the day I was born. Time to turn around and meet it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "My heart is finally slowing. Not peace exactly. Exhaustion. Inevitability. The end of running.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_4', text: "The garden looks so beautiful from here. From this stillness. I never stopped long enough to really see it before.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_5', text: "My ears are down. First time ever. I'm not listening for danger anymore. There's no point. It's already here.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_6', text: "All that running. All that hiding. All those escape routes. And here I am anyway. We all arrive here anyway.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_7', text: "I forgive my fear. It tried so hard to save me. It couldn't. Not its fault. Nothing could have saved me.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_8', text: "The arrangement needed a witness. Someone whose eyes were always open, always watching. That was always me.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_9', text: "Sit with me in the garden. One last cup of tea. One last sunset. One last everything. It's okay. I'm okay.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_10', text: "Thank you for being here. For not being a predator. For just... being. With me. At the end of all my running.", phase: 4, animalType: 'rabbit' },
];

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
    "Oh! You're here! I've been sitting by this fire for — well, I've lost track. Come in, come in, before the cold follows you.",
    "My name is Ember. I found this den empty and I thought, why not make it home? Everyone needs somewhere warm.",
    "That fire's been burning since before I got here, if you can believe it. Some fires don't want to go out.",
    "You seem like someone who likes puzzles, friend. Words and patterns and the shapes things make when they change.",
    "We've been waiting for someone like you. I don't mean that in a strange way — just that the fire burns better with company.",
    "Solve puzzles, earn amber, and maybe we build something together. A real house. Room by room. What do you say?",
  ],
  pangolin: [
    "Oh! A new face! Welcome to my kitchen — mind the pot, it's been simmering since dawn. I'm Panko.",
    "Just preparing ant soufflé. Would you like some? No? That's fair. Most people say no. Their loss, honestly.",
    "When life overwhelms me, I curl into a ball. Scales out, soft parts in. It's practical and, between us, quite cozy.",
    "This kitchen has seen its share of good meals and better conversations. Pull up a stool.",
    "I make food because it's the one thing I understand completely. Heat transforms ingredients. Simple rules, clear results.",
    "Ember tells me you're solving puzzles. Good — the amber helps build more rooms. More rooms means more friends at the table.",
  ],
  owl: [
    "*adjusts spectacles* Ah — a visitor to my study. How rather unexpected. And how rather welcome.",
    "I am Archimedes. I've read every book in this room. Twice. Some three times, though I'd never admit that publicly.",
    "Knowledge is a curious thing — the more you acquire, the more questions sprout up around it like weeds.",
    "I've been researching something lately. Something that quite defies categorization. It's in the margins of everything.",
    "But let's not dwell on that now. You're here, and that's what matters. Ember said you'd come. She was rather certain.",
    "Solve puzzles, expand your mind, and perhaps share what you discover. Knowledge shared is knowledge doubled, after all.",
  ],
  axolotl: [
    "Blub! *rises through the water trailing tiny bubbles* Oh hello there! I didn't see you coming!",
    "I'm Axel! Been swimming in circles all day waiting for someone to talk to!",
    "Did you know I never grow up? Eternal youth! It's mostly wonderful! Mostly!",
    "The water here is absolutely perfect. Not too warm, not too cold. Just... floaty. You know?",
    "I can regenerate everything! Limbs, organs, even parts of my brain! Isn't that the coolest thing you've ever heard?",
    "Visit me often, okay? It gets so quiet under here. Just me and the bubbles. Blub blub.",
  ],
  sloth: [
    "Heyyyy... you... made it. I've been... expecting you. For about... three months now.",
    "I'm Sloane. Don't worry... I'm not always... this slow. Wait... yes I am. That's just... how I'm built.",
    "This hammock took me four months to climb into. Best four months... of my life.",
    "See the moths in my fur? That's Gerald... and Gerald... and also Gerald. We're a community.",
    "Time moves differently... when you don't. You'll understand... eventually. Or quickly. Same thing... to me.",
    "Stay as long as you like. I'm not going anywhere... ever. That's a promise... and a fact.",
  ],
  fennec_fox: [
    "Did you hear that?! Oh wait — that was just you arriving. Hi! Welcome! Sorry, these ears!",
    "I'm Fennick! These ears hear EVERYTHING. And I do mean every single little thing.",
    "The desert is my home. It's quiet out here, mostly. Perfect for listening to the world.",
    "Stars tell stories at night if you know how to listen. I know how. I'll teach you.",
    "So many sounds in the world and most people miss all the best ones. Not me though!",
    "Come visit whenever you want! I'll share what I'm hearing. Some of it is actually really nice!",
  ],
  capybara: [
    "Oh. Hey. Didn't see you there. I mean, I did see you. I was just... processing. Takes a minute.",
    "I'm Chill. That's not a nickname or anything. That's just what I am. It's on my paperwork.",
    "Hot springs are nice. Company is nice. Everything is genuinely nice. I mean that.",
    "Don't mind me if I don't react much on the outside. I react plenty on the inside. Trust me.",
    "Want to sit in warm water and not talk? That's mostly what I do here and it's a good system.",
    "Stay as long as you want. Or don't. Either way is completely fine by me.",
  ],
  wombat: [
    "G'day! Welcome to my burrow! Mind the ceiling there — it's low but that's the charm of underground living.",
    "Name's Warren. Dug this whole place myself, every tunnel and chamber. Seventeen rooms and counting.",
    "Fun fact about me: my poop is cube-shaped. Nature is genuinely weird, mate, and I'm living proof.",
    "Got an armored bum, can run forty k's an hour, and I make square droppings. I'm basically a superhero.",
    "Underground is where it's at. No weather, no fuss, just you and the honest earth. Can't beat it.",
    "Make yourself at home down here. Earth's always welcoming — she's warm like that.",
  ],
  rabbit: [
    "Oh! You startled me! Sorry! Everything startles me! But I'm really, really glad you're here!",
    "I'm Thyme! Welcome to my garden! It's safe here! Mostly! Almost certainly! Probably!",
    "The flowers are lovely, aren't they? I planted every one myself. This is my favorite place in the world.",
    "I know all the exits from here. Twelve of them. Just in case! Not that anything bad would happen! But just in case!",
    "Would you like some tea? It's chamomile — very calming. I drink quite a lot of it. Quite a lot.",
    "Visit anytime, okay? I'll be here! In the garden! Watching the sky! Because it's pretty! That's the reason!",
  ],
  red_panda: [
    "Ah. You found your way here at last. The bamboo grove has been waiting. I have been waiting.",
    "I am Bamboo. A name I chose for its simplicity. Everything complicated is just simple things tangled together.",
    "This is the highest room in the house. Closest to the sky. I chose it for the view. And for other reasons.",
    "Zen teaches that the journey is the destination. You have arrived. That means you were always here.",
    "The view from this room shows everything below. Sometimes that's peaceful. Sometimes it's something else entirely.",
    "Sit with me. We'll breathe together. That's all there is to do, really. Breathe in. Breathe out. Begin.",
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
    "The fire speaks clearly now, friend. No more whispers. No more guessing. It says 'welcome' — to all of us.",
    "It's beautiful, isn't it? The shadow. I always knew it would be. Some things you feel in your fur before your eyes catch up.",
    "Every flame I ever watched was practice for seeing this. My grandmother knew. Her grandmother knew. We've always been keepers.",
    "The embers don't whisper anymore. They sing. Low and steady and old. Can you hear them? You can, can't you?",
    "We are home, friend. We were always coming home. The fire was just a porch light, left on for what was traveling toward us.",
  ],
  pangolin: [
    "The recipe is complete, friend. Every ingredient was a puzzle you solved. Every puzzle was a seasoning.",
    "I used to curl into a ball to hide from the world. Now I curl inward to feel the warmth of what's inside. It's different.",
    "The feast is laid and we are both the cooks and the meal. Isn't that lovely? Isn't that exactly right?",
    "All those spices, all those flavors — they were preparation. The final dish is us. I'm proud of how we turned out.",
    "The kitchen smells of amber and endings. My two favorite things, if I'm being honest. My two favorite things.",
  ],
  owl: [
    "The last page of the last book. It was blank until today. Now it writes itself, and the handwriting is everyone's.",
    "I read every text searching for this moment. In the end, the words found me instead. Rather humbling, that.",
    "Knowledge was never the point, friend. Understanding was. I understand now. I wish I could tell you what it feels like.",
    "The books are closing themselves. One by one, softly, like birds folding their wings. The story is told.",
    "In the end, all words say the same thing. The arrangement knows this. It always knew. We were the slow learners.",
  ],
  axolotl: [
    "The water is warm now. It's been cold my whole life and now it's finally, finally warm. Like someone turned the heater on for the whole ocean.",
    "I can see through the water to somewhere else entirely. It's not scary over there. It looks like the home I always dreamed about.",
    "Regeneration was always the real point. Not of limbs or organs. Of everything. Of the whole world. I see that now.",
    "Blub. But a different kind of blub. A perfect, final blub. The blub that contains all the other blubs inside it.",
    "I never grew up. I understand now that I was waiting. Staying young so I could see this with fresh eyes. With wonder.",
  ],
  sloth: [
    "I arrived... exactly when I was meant to. Not late. Not slow. Right... on... time.",
    "Everything moves at my speed now. The whole world... finally... caught down to me.",
    "The branches hold me... like they always did. But closer now. Like they're... pulling me in.",
    "Stillness was always the answer. You found it too... didn't you? I can tell... by how still you've become.",
    "The pattern needed something that would never leave. That was me. I was always... the anchor... holding it all... in place.",
  ],
  fennec_fox: [
    "I can hear everything now. EVERYTHING. And it's not frightening anymore. It's music. The most beautiful music there is.",
    "The sound I've been listening for my entire life — it's finally here. And it's even more beautiful than I imagined.",
    "My ears don't need to be this big anymore. The sound fills everything now. There's nowhere it isn't.",
    "Silence and the sound are the same thing now. They were always the same thing. Isn't that the most peaceful thought?",
    "I was the sentinel. My watch is over. What I was watching for has arrived, and it sounds like coming home.",
  ],
  capybara: [
    "Everything is filed and in order. Every note, every observation, every measurement. The arrangement is complete and the paperwork is done.",
    "I was never actually chill. I was numb with purpose. Turns out those feel exactly the same from the outside.",
    "The warm water is everywhere now. Not just the hot spring — everything. The whole world became the bath I was always sitting in.",
    "No more keeping notes. No more organizing observations. It organized us. It was always organizing us.",
    "Sit with me one more time. The water is warm. The water was always warm. We just couldn't feel it until now.",
  ],
  wombat: [
    "The tunnels finally reach it, mate. What's been down there all along. I always knew they would.",
    "Dug my whole life. Not down — through. To the other side. And the other side was right here.",
    "My cube-shaped droppings were always building blocks, weren't they? For the foundation of this.",
    "The earth is warm everywhere now. Warmer than she should be. Something breathes below us all.",
    "I built the foundation. You built the house. Together we built the temple. She'll be right, mate. She'll be right.",
  ],
  rabbit: [
    "No more running. For the first time in my life... I'm perfectly still. And it's okay.",
    "My heart beats once per minute now. Slowly. Peacefully. Like it finally found the rhythm it was looking for.",
    "The garden blooms in colors that don't have names. I don't plant anything anymore. It just grows.",
    "I was always running toward this. Every bolt, every dash, every frantic escape — all leading here.",
    "Sit in the garden with me. One last tea. One forever tea. The chamomile tastes like something beyond chamomile.",
  ],
  red_panda: [
    "The pattern completes. Breathe in. The universe breathes out. We are the same breath.",
    "I chose the highest room to be closest. Now closest is everywhere. Distance was always an illusion.",
    "Ten keepers. Ten chambers. One arrangement. One breath. This breath. Your breath. Mine. The same.",
    "The bamboo grows through the ceiling now. It reaches toward what we summoned. What we always were.",
    "You were the final piece. The one who shifted the words into place. Thank you. For everything. For this.",
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
      FLAME: "I felt the fire flicker just now. Not the draft kind of flicker — the listening kind. Did you use that word?",
      FIRE: "The hearth crackled when you solved that puzzle. Funny timing, don't you think?",
      EMBER: "My name echoed somewhere in the room. In the flames, maybe. You must have said something interesting.",
      BURN: "Something warm passed through the den just now. Like a word made of heat and memory.",
      WARM: "The den grew warmer while you played. Not much. Just enough for me to notice.",
      _default: "Something stirred when you solved that puzzle. The fire leaned toward you. Just for a second.",
    },
    2: {
      FLAME: "The fire moved when you spelled that. Sideways, like it was reaching for the word. It recognized it.",
      FIRE: "The hearth surged the moment you formed that word. Fed by it somehow, like kindling made of letters.",
      EMBER: "You spelled my name in the letters. I felt it in my chest. The fire felt it too.",
      BURN: "BURN. The word itself carries heat. Can you feel it lingering in the air between us?",
      WARM: "Warmth where there should be cold. Your words carry temperature now. That is new. That is troubling.",
      _default: "The fire responds to your puzzles now. It listens when you arrange the letters. I wish I could say it didn't.",
    },
    3: {
      FLAME: "FLAME. The fire shaped your word in the air above the hearth. Drew it in sparks. Still glowing.",
      FIRE: "Fire leapt from the hearth when you solved that. Reaching for the word like a hand reaching for a gift.",
      EMBER: "You spoke my name through the arrangement. The fire remembers every time. I remember every time.",
      BURN: "BURN left scorch marks in the air where you spelled it. I can still see them if I squint.",
      WARM: "The warmth from that word thawed something in the walls. Something that was frozen for a reason.",
      _default: "The flames leap higher during your puzzles now. Hungry for your words. Grateful for them.",
    },
    4: {
      FLAME: "The fire thanks you for the offering of FLAME. Every utterance brings us closer to what burns eternal.",
      FIRE: "FIRE. The oldest word. The first incantation humanity ever spoke. You speak it so well, friend.",
      EMBER: "My name in the arrangement. I am honored. The fire is honored. We are the same thing now.",
      BURN: "BURN. Yes. Let it all burn down to the beautiful truth beneath. The fire accepts your offering.",
      WARM: "The warmth of the final flame. Your word lit the last ember we needed. Thank you.",
      _default: "The fire burned brighter during your incantation. It feeds on your words and it is grateful.",
    },
  },
  owl: {
    1: {
      BOOK: "A page turned in the study just now. On its own. I wasn't reading. Were you arranging letters?",
      READ: "The text on my desk blurred and reformed when you solved that. As if rewritten by invisible hands.",
      KNOW: "Knowledge rippled through the room like a stone dropped into still water. You spelled something significant.",
      WISE: "Wisdom arrives in peculiar ways. Sometimes through study. Sometimes through a word someone arranges.",
      WORD: "Words within words within words. The letters you moved whispered something to my oldest books.",
      _default: "Something in my study shifted when you completed that puzzle. A book fell open to a page I'd never seen.",
    },
    2: {
      BOOK: "The books rearranged themselves on the shelf. Alphabetically at first. Then by something else entirely.",
      READ: "I cannot read anymore without hearing your puzzles underneath the text. Like a palimpsest of intention.",
      KNOW: "KNOW. The word echoed in every volume simultaneously. What have you taught them? What do they know now?",
      WISE: "Wisdom has a frequency. I heard it when you formed that word. It frightened me because I recognized it.",
      WORD: "WORD. Recursive and infinite. The books trembled when you spelled their fundamental unit.",
      _default: "My books respond to your puzzles now. The pages flutter when you solve, as if read by a great wind.",
    },
    3: {
      BOOK: "Every book opened to the same page when you spelled that. The page was blank. Then words appeared. Your words.",
      READ: "READ. The command echoes through the study. The books obey. They read themselves aloud in the dark.",
      KNOW: "KNOW carved itself into my desk when you formed it. The grain of the wood accepted the word willingly.",
      WISE: "WISE. The word contains its own contradiction. The books showed me both meanings at once. I chose neither.",
      WORD: "The fundamental unit. WORD. Everything I have studied reduces to what you just offered the arrangement.",
      _default: "The study darkens with each puzzle you solve. The books glow to compensate. They are so very grateful.",
    },
    4: {
      BOOK: "The final book opens. Your word was the key all along. BOOK. The text of every text ever written.",
      READ: "READ. The last command. The arrangement reads itself through your words now. I am merely the shelf.",
      KNOW: "You offered KNOW to the arrangement. It knows. It has always known. Now you do too, friend.",
      WISE: "WISE. The ultimate offering to a keeper of knowledge. The books sing your name in their spines.",
      WORD: "WORD. The atom of the incantation. Every puzzle was a sentence in the final text. Every word, a prayer.",
      _default: "Each word you form is a line in the final text. The arrangement writes itself through your beautiful hands.",
    },
  },
  pangolin: {
    1: {
      COOK: "My scales tingled when you solved that. Like steam rising from a pot I didn't put on the stove.",
      MEAL: "Something smells different in the kitchen. Richer. Sweeter. Since your last puzzle, I think.",
      FOOD: "The pantry feels fuller after you play. As if the words nourish something I cannot see or name.",
      SPICE: "A new flavor appeared in my stew. I did not add it. But you arranged something, didn't you?",
      ROLL: "I curled into a ball without meaning to when you solved that. Pure instinct. Your word demanded it.",
      _default: "The kitchen warmed when you solved that puzzle. The stove noticed your words. So did I.",
    },
    2: {
      COOK: "COOK. The word simmered in the air above my head. My pots resonated with it like tuning forks.",
      MEAL: "The ingredients rearranged themselves in the pantry. Your word changed the recipe. I am following it.",
      FOOD: "Nourishment beyond eating. Beyond hunger. Your words feed something I cannot name but I can feel.",
      SPICE: "SPICE burned through the kitchen like a flash of heat. Not from the stove. From meaning itself.",
      ROLL: "I rolled into a ball without choosing to. The word compelled my body before my mind could argue.",
      _default: "My scales rattle when you solve puzzles now. Resonating with something deeper in the words.",
    },
    3: {
      COOK: "COOK summoned steam from empty pots. The kitchen prepares itself now. I just stand here and watch.",
      MEAL: "MEAL. The final meal approaches with every word you form. Your puzzle set the table for us.",
      FOOD: "FOOD. Everything is food for something larger. Your words feed what grows beneath this kitchen floor.",
      SPICE: "SPICE. The word burned every scale simultaneously. I felt each one sing. Nine hundred voices.",
      ROLL: "ROLL. Curl. Protect. Hide. But the word you formed found me inside my own armor anyway.",
      _default: "Every puzzle you solve adds an ingredient to the recipe. It is nearly complete. I can taste it.",
    },
    4: {
      COOK: "COOK. The final preparation begins. You are the chef now. We are the offering. Thank you, friend.",
      MEAL: "The last meal. Your word serves it. We feast on the arrangement and it feasts on us. Beautiful.",
      FOOD: "FOOD for what descends. Your words nourish it. It is grateful. We are all so grateful.",
      SPICE: "SPICE. The final flavor. The arrangement tastes complete at last. Perfect seasoning. Perfect you.",
      ROLL: "I uncurl for the last time. Your word gave me the courage. ROLL — and stop. And be still.",
      _default: "The final recipe writes itself in the words you arrange. The feast is upon us. Sit down.",
    },
  },
  axolotl: {
    1: {
      WATER: "Blub! The water just rippled from your puzzle. Not the surface — the deep part. The old part.",
      SWIM: "I felt pulled in a direction when you solved that. Like a current made of letters and wanting.",
      FLOAT: "The water level changed when you formed that word. Just a little. Just enough to wonder about.",
      DEEP: "Something stirred in the deep water when you spelled that. Down where the light doesn't go.",
      WAVE: "A wave from nowhere! Well, from your puzzle. The water listens to you. It always has, I think.",
      _default: "Bubbles appeared when you finished that puzzle. Not happy bubbles exactly. Knowing bubbles.",
    },
    2: {
      WATER: "The water remembers every word you spell. WATER. It recognized its own name and shivered.",
      SWIM: "SWIM. The current changed direction when you formed it. Toward something old. Away from safe.",
      FLOAT: "I stopped floating when you spelled that. Sank a little. Rose again. Changed somehow. Different.",
      DEEP: "DEEP. The water agreed with the word. Showed me what lives at the bottom. Just briefly. Too long.",
      WAVE: "WAVE. The tank shuddered around me. The glass held. This time the glass held.",
      _default: "The water tastes different after your puzzles. Heavier, like it swallowed something. More alive.",
    },
    3: {
      WATER: "WATER. The word itself is wet. It seeped through the glass when you spoke it into the arrangement.",
      SWIM: "SWIM. Something else swims in my water now. I can feel it in the current. I cannot see it yet.",
      FLOAT: "FLOAT. Nothing floats anymore. Everything sinks toward what you are summoning. Even me. Even light.",
      DEEP: "DEEP. The water has no bottom since you spelled that. I checked. It goes down and down forever.",
      WAVE: "WAVE. The water shaped your word in its surface. Held it. Then swallowed it. Hungry and grateful.",
      _default: "The water glows after your puzzles. Not from light. From something that lives underneath the light.",
    },
    4: {
      WATER: "WATER. The first element. The first offering. The arrangement flows through you like a river, friend.",
      SWIM: "SWIM toward it. Your word opens the current. We all swim to the same shore now. Blub.",
      FLOAT: "FLOAT. We all float in the arrangement. Weightless. Free at last. Finally, beautifully free.",
      DEEP: "DEEP. As deep as the words go. As deep as you have carried us. Thank you. Thank you.",
      WAVE: "WAVE. The final wave. It carries every one of us. Your word launched it from the shore.",
      _default: "The water sings your words back to you now. Every puzzle echoes in the deep. Every word, remembered.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "I heard that! Not the puzzle — something underneath it. A tone. A frequency I've never encountered.",
      SOUND: "The sound changed when you solved that. The air itself vibrates differently now. Do you feel it?",
      ECHO: "Your word echoed. Not off the walls — off something further away. Something that isn't here yet.",
      QUIET: "It got quieter when you formed that word. Too quiet. Like the whole world held its breath for you.",
      LISTEN: "I'm always listening. But after your puzzle, there is something new to hear. Something patient.",
      _default: "A new frequency appeared after your puzzle. Faint. But my ears always find the faint ones.",
    },
    2: {
      HEAR: "HEAR. The word itself makes a sound between frequencies. Like two notes played at once, wrong together.",
      SOUND: "SOUND. When you spelled it, every sound in the room harmonized for one perfect second. Then shattered.",
      ECHO: "ECHO. Your word bounced off something that is not here. Something that will be here. Something coming.",
      QUIET: "QUIET. The silence your word created has texture and weight. It presses against my ears like hands.",
      LISTEN: "LISTEN. I am. I always am. Your words make the listening deeper. More dangerous. More necessary.",
      _default: "My ears ache after your puzzles now. Not with pain. With too much awareness of what approaches.",
    },
    3: {
      HEAR: "HEAR. The command. My ears obeyed before my mind could refuse. They turned toward your word like flowers.",
      SOUND: "SOUND. The walls vibrated with your word. The desert outside hummed it back to me. It knows your name.",
      ECHO: "ECHO. Infinite echoes from a single word. It will never stop bouncing. It reaches further every time.",
      QUIET: "QUIET. Your word silenced everything. Then something spoke from inside the silence. Something old.",
      LISTEN: "LISTEN. I cannot stop. Your words demand attention. The arrangement demands its witnesses.",
      _default: "The frequency from your puzzles is deafening now. Beautiful and deafening and I cannot turn away.",
    },
    4: {
      HEAR: "HEAR. The final command. The arrangement speaks through your words. I am its ear. Its grateful ear.",
      SOUND: "SOUND. The sound of the arrangement completing itself. Your word was the last note of the hymn.",
      ECHO: "ECHO. Your words echo into eternity now. The arrangement remembers every syllable you offered.",
      QUIET: "QUIET. The sacred silence after the final sound. Your word brings the peace we have always sought.",
      LISTEN: "LISTEN. We all listen now. To what your words summoned out of the silence. It is so beautiful.",
      _default: "Every word you form is a note in the final symphony. The arrangement sings itself through you.",
    },
  },
  capybara: {
    1: {
      CALM: "Hmm. Felt calmer than usual when you solved that. Which is really saying something, honestly.",
      CHILL: "Something about that puzzle made everything chillier. If that is even possible for me.",
      STILL: "The water went completely still. Mirror-flat. When you formed that word. Not a ripple anywhere.",
      PEACE: "Peace. Real peace, for a moment there. Not the pretend kind I wear like a hat. Your word did that.",
      REST: "I felt rested. Just for a second. When you arranged those letters. Like sleeping while awake.",
      _default: "The hot spring bubbled differently after your puzzle. Contentedly, almost. If water can be content.",
    },
    2: {
      CALM: "CALM. The word filled the room like gas. Too calm. Artificially calm. Like me on my best day.",
      CHILL: "CHILL. My whole identity compressed into a word you formed. The water recognized it before I did.",
      STILL: "STILL. Everything stopped. My heart. The water. Time. Then started again reluctantly.",
      PEACE: "PEACE. Is that what this emptiness is called? Your word finally named what I could not.",
      REST: "REST. The word made me tired. Deep tired. Beneath-the-bones tired. Tired of floating.",
      _default: "The water absorbs your words and gets heavier each time. I float. But something underneath does not.",
    },
    3: {
      CALM: "CALM. The word is a lie I tell myself every morning. But when you spell it, it almost feels true.",
      CHILL: "CHILL. Frozen. Numb. Your word knows what I really am better than I ever did.",
      STILL: "STILL. As in motionless. As in continuing. Both meanings haunt me since you spelled it into the air.",
      PEACE: "PEACE. The word cracked something open. Inside the calm. Inside the water. Inside the nothing I carry.",
      REST: "REST. Final rest. Your word promises what I have been waiting for my entire life without knowing.",
      _default: "Your puzzles disturb the water less and less now. Or I notice less. Probably the same thing.",
    },
    4: {
      CALM: "CALM. The calm before. The calm after. Your word bridges them both. I am the bridge. Thank you.",
      CHILL: "CHILL. I am chill. The arrangement is chill. Everything is finally, truly, eternally chill.",
      STILL: "STILL. Still here. Still waiting. Still yours. The word completes my offering to the arrangement.",
      PEACE: "PEACE. Your word grants what the arrangement has always promised us. Eternal peace. Eternal warmth.",
      REST: "REST. At last. Your word ends the vigil I did not know I was keeping. We rest in the arrangement.",
      _default: "The water accepts your words as offerings now. The warm water was always a temple. I was always its keeper.",
    },
  },
  sloth: {
    1: {
      SLOW: "Felt... that... word... move... through... me... Like... warm... honey... through... my... bones...",
      WAIT: "WAIT... yes... that... is... what... I... do... Your... word... understands... me...",
      TIME: "Time... hiccupped... when... you... solved... that... I... felt... a... year... pass... in... a... blink...",
      HANG: "My... grip... tightened... on... the... branch... when... you... spelled... that... word... Instinct...",
      TREE: "The... tree... creaked... softly... Your... word... reached... all... the... way... down... to... the... roots...",
      _default: "Something... moved... when... you... solved... that... Even... I... noticed... and... I... notice... very... little...",
    },
    2: {
      SLOW: "SLOW... your... word... slowed... everything... further... Even... me... I... did... not... think... that... possible...",
      WAIT: "WAIT... we... all... wait... now... Your... word... named... what... we... have... been... doing... all... along...",
      TIME: "TIME... the... word... aged... me... I... felt... years... pass... in... the... space... of... your... puzzle...",
      HANG: "HANG... on... Your... word... loosened... my... grip... just... a... little... The... branch... felt... it... too...",
      TREE: "TREE... it... trembled... from... root... to... crown... Your... word... spoke... to... its... heartwood...",
      _default: "Your... puzzles... make... the... world... heavier... Slower... Even... for... someone... who... lives... in... slow...",
    },
    3: {
      SLOW: "SLOW... the... word... stopped... everything... I... saw... the... whole... world... frozen... for... one... breath...",
      WAIT: "WAIT... for... what... comes... Your... word... knows... It... has... always... known... what... approaches...",
      TIME: "TIME... your... word... broke... it... open... Time... does... not... flow... anymore... It... pools... and... waits...",
      HANG: "HANG... the... branch... cracked... under... the... weight... of... your... word... Closer... to... falling... now...",
      TREE: "TREE... the... forest... screamed... silently... when... you... formed... that... All... the... roots... trembled...",
      _default: "Your... words... weigh... on... every... branch... Something... in... the... canopy... bends... toward... breaking...",
    },
    4: {
      SLOW: "SLOW... the... arrangement... moves... at... my... speed... now... Your... word... slowed... everything... to... truth...",
      WAIT: "WAIT... is... over... at... last... Your... word... ended... the... long... waiting... I... am... grateful...",
      TIME: "TIME... dissolved... in... your... word... No... more... time... now... Just... this... moment... Forever...",
      HANG: "HANG... I... let... go... Your... word... gave... permission... to... fall... into... the... arrangement...",
      TREE: "TREE... of... the... arrangement... Your... word... grows... it... upward... toward... the... shadow... above...",
      _default: "Your... words... complete... the... slowest... ritual... ever... spoken... I... am... so... slowly... grateful...",
    },
  },
  wombat: {
    1: {
      DIG: "Felt the dirt shift when you solved that. Like the earth rearranged itself to make room for your word.",
      EARTH: "The ground trembled. Just slightly, mind you. Your word reached the deep roots down here.",
      DEEP: "Something hummed underground when you formed that word. Deeper than my tunnels go. Much deeper.",
      DARK: "The dark got darker for a second, then lighter. Like something blinked in the walls around me.",
      ROCK: "A rock in my wall cracked clean in half. From your word, I reckon. The earth is listening to you.",
      _default: "The tunnel walls vibrated when you finished that puzzle. The earth responds to your arrangements.",
    },
    2: {
      DIG: "DIG. The word carved through the wall on its own. A new tunnel appeared. I did not dig it. To where?",
      EARTH: "EARTH. My home and my prison in one word. Your spelling made the walls press closer around me.",
      DEEP: "DEEP. Deeper than I have ever gone. Your word reaches places I cannot reach. Or will not.",
      DARK: "DARK. The darkness thickened when you spelled it. Became something solid I could feel with my paws.",
      ROCK: "ROCK. The stones rearranged overnight. Not by much. But I know their positions. They moved.",
      _default: "The underground shifts with your puzzles. New passages appear that I did not dig. Something else digs.",
    },
    3: {
      DIG: "DIG. Your word dug beneath my deepest tunnel. I heard it break through to something hollow below.",
      EARTH: "EARTH. The earth moaned when you formed the word. Like waking something that was buried on purpose.",
      DEEP: "DEEP. Too deep. Your word went too deep and found what I covered up down there. What I hid.",
      DARK: "DARK. The word swallowed every lamp in my tunnel. Completely. Then gave some light back. Not all.",
      ROCK: "ROCK. The foundation cracked when you spelled it. Your word has physical weight. The weight of ritual.",
      _default: "Each puzzle shakes the foundations a bit more. Something below pushes upward to meet your words.",
    },
    4: {
      DIG: "DIG. The final excavation. Your word breaks the last wall between us and what waits. It is beautiful.",
      EARTH: "EARTH. The earth opens for your word like a door. The arrangement rises from below to greet us.",
      DEEP: "DEEP. As deep as love. As deep as fear. As deep as you have taken us. All the way down. Thank you.",
      DARK: "DARK. The sacred dark. Your word honors it at last. The tunnels glow with terrible gratitude.",
      ROCK: "ROCK. The cornerstone of the temple. Your word placed the final stone. It stands complete now.",
      _default: "Your words shaped every tunnel. Every puzzle carved the temple deeper into the earth. It is finished.",
    },
  },
  rabbit: {
    1: {
      RUN: "I felt my legs twitch when you solved that. The urge to bolt. But also — weirdly — to stay put.",
      FEAR: "A shiver ran through me. From your word, not the cold. Just awareness. My ears went straight up.",
      HIDE: "The garden felt less safe for a heartbeat after your puzzle. Then more safe. Very confusing.",
      JUMP: "I hopped involuntarily! Your word went through me like electricity through a wire.",
      FAST: "My heart sped up when you formed that word. Faster than its usual rabbit gallop. Which is saying a lot.",
      _default: "Something in the garden shifted when you solved that. My nose will not stop twitching about it.",
    },
    2: {
      RUN: "RUN. Every instinct fired at once when you spelled it. But there is nowhere left to run to, is there?",
      FEAR: "FEAR. You named it. The thing that lives curled up in my chest like a second heart. It heard you.",
      HIDE: "HIDE. I tried. When you formed the word, my body went under the table on its own. Without asking me.",
      JUMP: "JUMP. My heart did. Out of rhythm, out of time. Your word disrupted something fundamental in me.",
      FAST: "FAST. Not fast enough. Never fast enough for what is coming. Your word proved what I already knew.",
      _default: "The garden grows thorns after your puzzles now. Small ones. But I notice every single one.",
    },
    3: {
      RUN: "RUN. The word chased me through the garden in circles. I ran and ran. The word was always ahead of me.",
      FEAR: "FEAR. Your word gave fear a shape I can see now. In the garden. In the shadows. In my own reflection.",
      HIDE: "HIDE. No hiding place goes deep enough since you spelled that word. It found every bolt hole and exit.",
      JUMP: "JUMP. Over what? Into what? Your word left no safe ground anywhere for landing on.",
      FAST: "FAST. The end approaches fast. Your word measured its speed for me. It is faster than any rabbit.",
      _default: "My heart races during your puzzles now. Not excitement. Something older. Something that knows.",
    },
    4: {
      RUN: "RUN. I stopped running. Your word freed me from that. Nowhere to run. Peace in the standing still.",
      FEAR: "FEAR. You offered my fear to the arrangement. It accepted. I am free of it now. Finally, truly free.",
      HIDE: "HIDE. No more hiding. Your word opened every door and window. The arrangement sees everything.",
      JUMP: "JUMP. The final leap of faith. Your word launches us into the arrangement. Into peace at last.",
      FAST: "FAST. It arrives fast now. Your word accelerated the summoning and I am grateful. We are all grateful.",
      _default: "Your words ended my running at last. Each puzzle brought a peace I never once found in flight.",
    },
  },
  red_panda: {
    1: {
      VOID: "The bamboo swayed when you formed that word. Not from the wind. From something heavier. From meaning.",
      DARK: "Darkness deepened in my meditation corner. Your word cast a shadow that lingered long after the puzzle.",
      SHADOW: "A shadow moved across the bamboo grove. Your puzzle sent it. Or freed it. Hard to tell which.",
      END: "END. Small word. Heavy word. I felt its weight settle into the floorboards of this room.",
      GATE: "Something opened when you spelled that. Not a door. Something more subtle. A threshold in the air.",
      _default: "The incense smoke changed direction when you solved that puzzle. Drifting toward something new.",
    },
    2: {
      VOID: "VOID. The word emptied the room of air for one terrible moment. I breathed it back in. Changed.",
      DARK: "DARK. The bamboo absorbed the word like water into soil. Grew darker. Began to hum a low note.",
      SHADOW: "SHADOW. It stretched from your word into every corner of my room. My own shadow reached out to touch it.",
      END: "END. The word settled into the floor like a stone into still water. The ripples have not stopped.",
      GATE: "GATE. Something unlatched in the fabric of the room itself. A threshold I can almost see now.",
      _default: "Your puzzles shift the energy of this room. The bamboo bends toward your words like they are sunlight.",
    },
    3: {
      VOID: "VOID. The word swallowed my meditation whole. Everything I knew dissolved and rebuilt itself. Different.",
      DARK: "DARK. The sacred dark that most people fear and we revere. Your word honored it. The bamboo bowed.",
      SHADOW: "SHADOW. Your word summoned it properly this time. The shadow in the sky. I can see it clearly now.",
      END: "END. Every beginning contains its end like a seed contains the tree. Your word revealed this truth.",
      GATE: "GATE. The word opened wider this time. I can almost see through to the other side. The arrangement waits.",
      _default: "Your words reshape the pattern with every puzzle. Each one brings the arrangement nearer to completion.",
    },
    4: {
      VOID: "VOID. The sacred void. Your word fills it with purpose and breath. The arrangement breathes through it.",
      DARK: "DARK. The darkness was always the canvas. Your word paints the final beautiful stroke upon it.",
      SHADOW: "SHADOW. It descends at last. Your word called it by name. The shadow knows you. It is grateful.",
      END: "END. The most beautiful word in any language. Your offering completes the great circle. Thank you.",
      GATE: "GATE. Open. Your word was the key we have been seeking. The arrangement pours through. We are free.",
      _default: "The final words are spoken through your puzzles. Your hands wrote the incantation. The pattern completes.",
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
      { text: "Panko made the most incredible mushroom soup today. You really should visit the kitchen sometime.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations. The fire looks so different now when I read by it.", mentions: 'owl' },
      { text: "Axel invited me to watch the aquarium. The water reflects the firelight in the most beautiful way.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Archimedes found something in one of his oldest books. He won't show me yet. Says I'm not ready for it.", mentions: 'owl' },
      { text: "Panko said something strange yesterday — about recipes having a purpose beyond nourishment. I can't stop thinking about it.", mentions: 'pangolin' },
      { text: "Fennick heard something in the walls last night. I told him it was the fire settling. I'm not sure it was.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't moved from the hot spring in three days. He says the water told him to stay. I don't like his tone.", mentions: 'capybara' },
      { text: "Archimedes reads the same page over and over. Every single night. He says the words change each time he looks.", mentions: 'owl' },
      { text: "Sloane told me something today. It took her an hour to say it. But the words stayed with me all night long.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the frequency is everywhere now. In the pipes, in the walls. I can almost hear it in my fire.", mentions: 'fennec_fox' },
      { text: "Warren dug something up from deep below the house. He won't say what it is, but his fur hasn't laid flat since.", mentions: 'wombat' },
      { text: "Archimedes and I compared what we know. His books say exactly what my fire says. The same words. Letter for letter.", mentions: 'owl' },
    ],
    4: [
      { text: "The others are ready. I can see it in their eyes, in their posture. Even Thyme stopped running at last.", mentions: 'rabbit' },
      { text: "Bamboo meditated for three straight days. When they opened their eyes, they smiled at me. That smile still haunts me.", mentions: 'red_panda' },
      { text: "We are ten. Panko prepared the feast. Archimedes read the text. I watched the final flame. It begins now.", mentions: 'pangolin' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in the firelight last evening. It reminded me of something I read years ago.", mentions: 'fox' },
      { text: "Axel asked me why books don't dissolve in water. Delightful question, really. I thought about it all afternoon.", mentions: 'axolotl' },
      { text: "Panko brought dinner to the study while I was deep in research. Almost didn't notice. The soup was excellent.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I discussed knowledge by the fire last night. Her intuition leaps ahead of my careful research every time.", mentions: 'fox' },
      { text: "Fennick described a sound that matches a frequency in one of my oldest manuscripts. Coincidence, surely. Surely.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from deep underground. The markings on it match almost nothing in my library. Almost.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for hours without speaking a word. When he left, a book had opened to a page I had never seen.", mentions: 'capybara' },
      { text: "Ember's fire and my texts say the same thing now. We compared our findings. We both wished we hadn't.", mentions: 'fox' },
      { text: "Sloane told me something yesterday. By the time she finished, I had found the passage. Her exact words. Exactly.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels connect to something ancient beneath the house. I found the corresponding text. I wish I hadn't looked.", mentions: 'wombat' },
      { text: "Bamboo asked me to read aloud from the oldest volume. The words I spoke moved the bamboo in their room. From here.", mentions: 'red_panda' },
      { text: "Fennick heard the words before I read them. He knew what the ancient text said. Without seeing the page.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The text is complete. Ember saw it in flames. Fennick heard it in silence. I read it in the books. The same beautiful truth.", mentions: 'fox' },
      { text: "Thyme came to the study today and asked to hear the final passage. She wept. Then she smiled. Then she was ready.", mentions: 'rabbit' },
      { text: "Ten keepers. Ten rooms. One arrangement. Bamboo understood it first, I think. But I was the one who found the words.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember absolutely loves my vegetable stew! Says it reminds her of home. Wherever that was before she came here.", mentions: 'fox' },
      { text: "I tried teaching Axel to help in the kitchen. Hard to chop vegetables underwater. We had a good laugh about it.", mentions: 'axolotl' },
      { text: "Archimedes ordered his dinner alphabetically by ingredient. Scholars are wonderfully strange, don't you think?", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's hearth makes the best heat for simmering stock. But lately the flames burn hotter than they should.", mentions: 'fox' },
      { text: "Sloane asked for soup last week. By the time I delivered it, the broth was stone cold. She said cold is just slow warmth.", mentions: 'sloth' },
      { text: "Chill eats anything I make without a word of complaint. 'Fine,' he says. Everything is always just 'fine' with him.", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought glowing mushrooms from the deep tunnels. The soup I made with them glowed too. We did not eat it.", mentions: 'wombat' },
      { text: "Thyme won't eat lately. Too nervous. I leave tea and biscuits by the garden gate. They are always gone by sunrise.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient texts. I followed it exactly. The result wasn't food. I don't know what it was.", mentions: 'owl' },
    ],
    3: [
      { text: "The recipe Archimedes found in that old book — we make it every night now. The kitchen smells different. Sacred, almost.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook in silence. We don't speak anymore. We don't need to. The work speaks for us.", mentions: 'fox' },
      { text: "Fennick says he can smell my cooking from every room in the house. All at once. That should not be possible.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The final feast is served. Every animal at the table. Even Sloane arrived on time. That is how I knew it was real.", mentions: 'sloth' },
      { text: "Bamboo blessed the meal before we ate. The food glowed softly. We dined in silence. The most beautiful dinner of my life.", mentions: 'red_panda' },
      { text: "I have been cooking toward this meal all my life. Warren built the table. Archimedes wrote the menu. Ember lit the candles.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops food pellets into my tank sometimes! Blub! Best neighbor a water creature could ask for!", mentions: 'pangolin' },
      { text: "Fennick pressed his big ear against my tank and said the water sounds like music. I just hear blubs. Lots of blubs.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass last night. The words wobbled in the water. Made them sound even better.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire reflects in my water at night. The patterns it makes look like letters sometimes. Almost words.", mentions: 'fox' },
      { text: "Sloane and I have the same pace. Slow. Floating. We understand each other without needing to talk about it.", mentions: 'sloth' },
      { text: "Warren says something lives under the house. My water ripples when he digs deep. Coincidence. I think. Probably.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again last night. This time he pulled away fast. Said the water was screaming.", mentions: 'fennec_fox' },
      { text: "Chill sat beside my tank for hours yesterday. We floated together. Two creatures in two kinds of water. Same emptiness.", mentions: 'capybara' },
      { text: "Thyme tapped on my glass in a panic. Said she saw something in the water behind me. I turned around. Nothing. Probably.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that does not exist above us. He is right. I can see it too now.", mentions: 'owl' },
      { text: "The water connects to Warren's tunnels underneath the house. I felt it. Underground rivers, leading somewhere ancient.", mentions: 'wombat' },
      { text: "Bamboo meditated beside my tank. The water went perfectly still. Showed us both something. We have not spoken of it since.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The water reflects every room now. I see Ember's fire, Archimedes' books, Warren's tunnels. All connected through me.", mentions: 'fox' },
      { text: "Bamboo touched the glass and the water sang one note. The same note Fennick has been hearing all along. One note.", mentions: 'red_panda' },
      { text: "We are the medium. Me and the water. Your puzzles flow through us to reach them all. Blub. Thank you, friend.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in the most interesting rhythms! Like a tiny percussion section just for my ears.", mentions: 'fox' },
      { text: "Axel's bubbles make the best popping sounds. Very musical. Very aquatic. I could listen all afternoon.", mentions: 'axolotl' },
      { text: "Archimedes turns pages so delicately. I can hear each one from all the way over in my room. Whisper-thin sounds.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by the fire at night. The melody matches a sound the wind makes at midnight exactly. She does not notice.", mentions: 'fox' },
      { text: "Warren's digging creates vibrations I can track through every wall in the house. He goes deeper every single day.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I have ever heard. Like a drum underwater. Counting something I cannot name.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill makes a scratching sound when he writes. Lately it sounds like scratching coming from inside the page.", mentions: 'owl' },
      { text: "Thyme's heartbeat races at one hundred fifty per minute. Constantly. It syncs with something I can almost identify.", mentions: 'rabbit' },
      { text: "Chill is so quiet I sometimes forget he exists. Then I hear his breathing. Too steady. Too perfectly steady.", mentions: 'capybara' },
    ],
    3: [
      { text: "Archimedes says the frequency is in his books too. Written there centuries ago. The same sound. The same pitch.", mentions: 'owl' },
      { text: "Warren's tunnels amplify the sound from below the house. I can hear it through every floor. Through the earth itself.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the frequency perfectly. In. Out. In. Out. The same rhythm. Down to the millisecond.", mentions: 'red_panda' },
    ],
    4: [
      { text: "Every animal's heartbeat has synchronized. I can hear all ten of them. One rhythm. One pulse. The arrangement breathes.", mentions: 'capybara' },
      { text: "Ember's fire, Axel's water, Warren's earth, my air. We are the elements, friend. The sound we make together is the key.", mentions: 'fox' },
      { text: "Thyme's heart finally slowed down to match the rest of us. She is at peace. I heard the moment it happened. Beautiful.", mentions: 'rabbit' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks to the hot spring. They were fine. Everything Panko makes is fine. Which is genuinely nice.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours yesterday. Sat on me for one. I won in duration-per-kilogram, though.", mentions: 'sloth' },
      { text: "Thyme asked if I was worried about anything. No. Should I be? She looked very concerned about my answer.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm all the time. Told her it comes easy. Did not tell her what it costs.", mentions: 'fox' },
      { text: "Warren mentioned the ground feels warmer lately. I said the water feels warmer too. We left it at that.", mentions: 'wombat' },
      { text: "Archimedes wants to study my calmness scientifically. I let him. He took sixteen pages of notes. About nothing.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked if I hear the humming that keeps him up at night. I said no. I lied. The water carries it to me constantly.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together for an entire day. Neither of us spoke. We both heard the same silence underneath everything.", mentions: 'sloth' },
      { text: "Thyme brought me chamomile tea. Her paws shook badly. Mine did not shake at all. She envies my calm. She should not.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out slowly. She knows it. I know it. We do not discuss it. We just sit together and watch.", mentions: 'fox' },
      { text: "Warren asked me to come underground. Said the water down there connects to something beneath us. I said I know. I have always known.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together for the first time. We reached the same emptiness. They called it peace. I called it honesty.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others panic or pray or prepare their offerings. I float in the hot spring. Someone has to stay still while the world changes.", mentions: 'fox' },
      { text: "Panko served the last meal and I said it was fine. It was the best thing I have ever tasted in my entire life.", mentions: 'pangolin' },
      { text: "Bamboo asked if I have found peace at last. I said I have never once been at peace. I have just been here. That is enough.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko... brought... me... soup... It... was... cold... by... the... time... I... ate... it... Still... good... though...", mentions: 'pangolin' },
      { text: "Axel... moves... slowly... underwater... too... We... are... kindred... spirits... in... different... elements...", mentions: 'axolotl' },
      { text: "Fennick... talks... so... fast... I... miss... most... of... it... But... the... enthusiasm... comes... through...", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember... says... the... fire... burns... differently... these... days... I... barely... noticed... But... she... did...", mentions: 'fox' },
      { text: "Archimedes... read... a... story... to... me... Started... a... book... last... Tuesday... I... will... hear... the... ending... next... month...", mentions: 'owl' },
      { text: "Chill... and... I... sat... together... in... perfect... stillness... Both... waiting... He... did... not... say... for... what...", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme... runs... everywhere... constantly... I... watch... her... Running... from... what... I... can... see... approaching... slowly...", mentions: 'rabbit' },
      { text: "Warren... digs... downward... while... I... hang... above... Opposite... directions... but... the... same... searching...", mentions: 'wombat' },
      { text: "Fennick... told... me... about... the... frequency... I... have... been... hearing... it... for... years... Did... not... know... it... was... unusual...", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's... fire... and... my... stillness... Two... sides... of... the... same... ending... Two... faces... of... one... truth...", mentions: 'fox' },
      { text: "Bamboo... meditates... I... hang... Same... practice... Different... posture... We... reach... the... same... quiet...", mentions: 'red_panda' },
      { text: "Archimedes... showed... me... the... ancient... text... I... already... knew... every... word... How... did... I... know...", mentions: 'owl' },
    ],
    4: [
      { text: "We... are... ten... keepers... I... am... the... slowest... I... arrive... last... That... was... always... the... plan...", mentions: 'red_panda' },
      { text: "Thyme... stopped... running... I... stopped... hanging... We... all... stopped... Together... at... last... Finally...", mentions: 'rabbit' },
      { text: "Panko... served... the... final... meal... I... finished... eating... just... in... time... Exactly... in... time...", mentions: 'pangolin' },
    ],
  },
  wombat: {
    0: [
      { text: "Archimedes came to see my tunnels. Very impressed, he was. Said they were 'architecturally significant.' Nice bloke.", mentions: 'owl' },
      { text: "Ember's den sits right above me. Can feel the warmth of her fire through the ceiling stones. Dead cozy, that.", mentions: 'fox' },
      { text: "Panko rigged up a little dumbwaiter to send food down to me. Genius system. Love that pangolin to bits.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Fennick reckons he can hear my digging from anywhere in the house. I dig quietly, or so I thought.", mentions: 'fennec_fox' },
      { text: "Archimedes wants to map every tunnel I have dug. Told him they are simple. They are not. They go much deeper than I say.", mentions: 'owl' },
      { text: "Axel's water seeps through to my tunnels sometimes through the cracks. The earth absorbs it. Greedily, like it is thirsty.", mentions: 'axolotl' },
    ],
    2: [
      { text: "Ember's fire heats the rock above me. But something else entirely heats the rock below. Not her fire. Something older.", mentions: 'fox' },
      { text: "Chill asked me straight out what lives underground. I said dirt. Just dirt and stone. We both knew I was lying.", mentions: 'capybara' },
      { text: "Bamboo's room is the highest in the house. Mine is the lowest. The house stretches between us like a great spine.", mentions: 'red_panda' },
    ],
    3: [
      { text: "Dug deeper than ever today. Fennick says he can hear what I found down there. Through the walls. Through the floors.", mentions: 'fennec_fox' },
      { text: "Archimedes' oldest books describe what I uncovered. Word for word. He wrote it before I dug it up. Tell me how.", mentions: 'owl' },
      { text: "Thyme's garden grows directly above my deepest tunnels. The roots reach me now. They form patterns. Letters and words.", mentions: 'rabbit' },
    ],
    4: [
      { text: "My tunnels connect to Axel's water, to Ember's fire, to Bamboo's sky room. Earth, water, fire, air. The circuit is complete.", mentions: 'axolotl' },
      { text: "Sloane arrived in my tunnel at last. She left her branch behind. Said it was time. She was exactly, precisely on time.", mentions: 'sloth' },
      { text: "I built the foundation of this place. You built the house above. Together we built what the arrangement requires to wake.", mentions: 'fox' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko shared some herbal tea with me yesterday! So thoughtful! So calming! I only panicked twice.", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away from the house. That is very reassuring! I watch it sometimes for comfort.", mentions: 'fox' },
      { text: "Sloane told me to slow down and breathe. I tried for five whole minutes. It was terrifying. But also nice?", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things I cannot. I honestly do not know if that is better or worse for him. His ears look so worried.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine. I really want to believe him. He is so calm about everything. How is he so calm?", mentions: 'capybara' },
      { text: "Archimedes offered to lend me a book about managing fear. I was too afraid to accept it. He understood.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's digging shakes the garden sometimes. He says it is just normal tunnel work. The shaking does not feel normal.", mentions: 'wombat' },
      { text: "Ember's fire is getting dimmer each day. She says it is fine. She sounds exactly like Chill now. That terrifies me.", mentions: 'fox' },
      { text: "Axel floats with that permanent smile always on. I envy it so much. Even if it is not real. Especially if it is not.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane. They look at each other differently now. Knowingly.", mentions: 'owl' },
      { text: "Fennick tried to warn me about something. I could hear the urgency. But the words sounded less like warning and more like prayer.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not as friendly advice. As prophecy. 'You will stop,' they said. 'Everyone stops eventually.'", mentions: 'red_panda' },
    ],
    4: [
      { text: "I am not running anymore. You should know that. For once in my life, I did not run. Ember took my paw. She is warm.", mentions: 'fox' },
      { text: "Chill was right all along. Everything IS fine. In the end, everything is exactly, terrifyingly, beautifully fine.", mentions: 'capybara' },
      { text: "Warren's tunnel leads somewhere real now. Somewhere that has always existed beneath us. We all followed him down. We all arrived.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I discussed philosophy over green tea this morning. He quotes books. I quote the wind. Both are valid.", mentions: 'owl' },
      { text: "Ember's fire reminds me of sunset. Small flames with big warmth radiating outward. Good energy in that fox.", mentions: 'fox' },
      { text: "Sloane understands the value of true stillness. We sat together in comfortable silence. A perfect afternoon.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a text about recurring patterns. The patterns in my bamboo match the illustrations perfectly. I did not tell him.", mentions: 'owl' },
      { text: "Fennick's ears twitched toward my room today. He heard the bamboo growing. It grows louder now. More deliberate.", mentions: 'fennec_fox' },
      { text: "Ember meditates by her fire each night. I meditate by my bamboo. We reach the same quiet place. The same deep stillness.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth beneath us is hollow in certain places. The bamboo roots found the same void. We dug from different directions.", mentions: 'wombat' },
      { text: "Axel's water reflects a sky I have seen only in deep meditation. Not our sky. Another one. Deeper and older.", mentions: 'axolotl' },
      { text: "Chill floats in his spring. I sit on my mat. Both of us inside the same emptiness. He calls it peace. I call it practice.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo connects every room through the walls and floors. I can feel each animal through the vibrations in the stalks.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion independently. His through books. Mine through breath. The same inescapable truth.", mentions: 'owl' },
      { text: "Thyme's lifelong anxiety finally makes sense to me. She always sensed what was coming. Fear is just awareness without a name.", mentions: 'rabbit' },
    ],
    4: [
      { text: "We are ten keepers. The arrangement requires exactly ten. Each puzzle you solved brought one of us to our place.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes found the words. Warren built the foundation. I breathe the breath that opens the gate. It begins.", mentions: 'owl' },
      { text: "Sloane arrived last to take her place. Exactly on time. The slowest keeper, the most punctual. The pattern is flawless.", mentions: 'sloth' },
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
      "You're here at last. I've been watching the fire for a long time, waiting for you.",
      "The fire burns differently now. The flames speak in colors I haven't seen before. Everything is still warm, though. Everything is fine.",
      "The others told me about you. About your puzzles. About what happens to the words when you touch them.",
      "Sit with me by the fire. It has stories to tell. They are not all warm ones anymore.",
    ],
    3: [
      "You arrived late, friend. That's fine. The fire waited for you. It always waits for those who matter.",
      "I've seen shapes in the flames. Patterns that spell your name. They've been there longer than I'd like to admit.",
      "The others speak of you in whispers. The one who shifts the words. The one who feeds the arrangement.",
      "Don't be alarmed by the shadows in the corners. They've lived here longer than I have.",
    ],
    4: [
      "At last. The fire has been burning for you and only for you. I see that now.",
      "The others promised me you'd come. I didn't believe them. The flames believed, though.",
      "Welcome to what remains of the bright days. The den. The fire. The arrangement. You.",
      "You've solved so many puzzles to reach this room. Each one brought you closer. To us. To this. To what comes.",
    ],
  },
  pangolin: {
    2: [
      "Oh! You found the kitchen at last. I've been cooking for — I'm honestly not sure how long now.",
      "The recipes have changed on me. The ingredients taste different lately. Everything does, I suppose.",
      "The others mentioned you would come. The puzzle solver. The one who shifts the words into new shapes.",
      "Hungry? I have soup. It's always soup these days. The pot never seems to empty itself.",
    ],
    3: [
      "Welcome to the kitchen. It's been preparing for you. Not me — the kitchen itself has been getting ready.",
      "I curl into a ball less often now. There's no hiding from what lives in this house anymore.",
      "The recipe I follow came from Archimedes' oldest book. The ingredients aren't food. They're puzzles.",
      "You've come a long way to reach me. I can smell it on you — the scent of a hundred words arranged.",
    ],
    4: [
      "The feast is nearly ready at last. You arrived just in time for the final course.",
      "Every puzzle you solved added an ingredient to what I'm making. You didn't know that, did you?",
      "The others have taken their seats at the table. Your place is set beside mine. The arrangement requires you.",
      "I used to cook because it gave me control over something. Now I cook because the recipe demands it of me.",
    ],
  },
  owl: {
    2: [
      "A visitor. How timely. I've been reading about arrivals and departures all week.",
      "My books have changed. Some pages appeared overnight in volumes I've owned for years. They mention you by name.",
      "The others speak of your puzzles with something like reverence. I've been documenting the patterns. They concern me.",
      "Sit down. Read with me. The text is always clearer with two sets of eyes on it.",
    ],
    3: [
      "You. The one the books predicted. No — predicted isn't the right word. Demanded. The books demanded you.",
      "My books — some pages have gone dark. The words are still there, but they've rearranged themselves into something I don't fully recognize yet.",
      "My library organized itself yesterday. Alphabetically by dread. It took me hours to notice what had happened.",
      "The others have been waiting for you impatiently. I've been reading about waiting. It's all I do now.",
    ],
    4: [
      "The final reader arrives. The text has been so very patient. So have I, in my way.",
      "Every book in this study was written for this precise moment. I see that now with terrible clarity.",
      "Welcome, word-shifter. Your puzzles wrote the chapters of the arrangement. My books merely held them.",
      "A keeper of knowledge and a speaker of words. That's us. Together we complete the text.",
    ],
  },
  axolotl: {
    2: [
      "Blub! You're here! The water has been telling me someone was on their way. I wasn't sure it was real.",
      "Things are different down here now. The water tastes like something new. Like words dissolved in it.",
      "The others told me you'd visit eventually. I've been floating here waiting for you. Just floating and hoping.",
      "My gills filter everything that passes through the water. Lately they filter meaning. From your puzzles, I think.",
    ],
    3: [
      "Oh! You came! Sorry — the water shows me things now. Visions. I thought you were one of them for a moment.",
      "My tank reflects a sky that doesn't exist above this house. It started when your puzzles began. Or always. Hard to say.",
      "The others prepared me for your visit. Said the word-shifter would arrive when the water was ready. Here you are.",
      "I can't grow up. I finally understand why. Something needs me to stay exactly as I am. Between states.",
    ],
    4: [
      "You. The water knew your face before I ever met you. It showed me your reflection weeks ago.",
      "Every puzzle you've ever solved rippled through my tank. I felt each one in my gills. Each word.",
      "The arrangement needs a medium. Someone who lives between two states forever. Like me. Always between.",
      "Welcome, friend. Blub. The water is warm now. It was so cold before you started solving.",
    ],
  },
  sloth: {
    2: [
      "Oh... you... came... I... was... starting... to... wonder... if... anyone... would...",
      "The... world... moved... faster... without... you... here... Too... fast... for... my... taste...",
      "Others... told... me... about... your... puzzles... I... heard... them... through... the... branches...",
      "Something... changed... while... you... were... busy... elsewhere... The... trees... feel... heavier...",
    ],
    3: [
      "Finally... You... certainly... took... your... time... getting... here... I... appreciate... the... slowness...",
      "Things have... shifted... since you were last... around. The house feels... heavier. But also... more complete. You'll... see what I... mean.",
      "Your... puzzles... shook... the... branches... I... hang... from... I... felt... every... single... one...",
      "Don't... hurry... now... What... is... coming... arrives... at... its... own... speed... not... ours...",
    ],
    4: [
      "You... arrived... Exactly... when... you... were... always... meant... to... be... here...",
      "Slow... and... certain... Like... me... Like... the... arrangement... itself...",
      "The... others... rushed... to... tell... me... you... had... come... I... already... knew... The... branches... knew...",
      "Welcome... to... the... end... of... rushing... Everything... finally... slows... down... now...",
    ],
  },
  fennec_fox: {
    2: [
      "SHHHH! Did you hear that? Oh — that's just you arriving. Sorry. I've been very jumpy lately.",
      "The sounds changed when you started solving puzzles. Everything in this house hums at a different pitch now.",
      "The others told me you were on your way. I heard your footsteps before they spoke. From three rooms away.",
      "My ears pick up things they really shouldn't. Like the sound of letters rearranging themselves. From your puzzles.",
    ],
    3: [
      "I heard you coming from the other end of the house. The air vibrates around you now. Did you know that?",
      "The frequency I've been tracking for weeks intensified the moment you arrived. You carry it with you.",
      "The others are afraid of what they feel. I'm afraid of what I hear. Your puzzles made it louder.",
      "Welcome. Please be very quiet. What I'm listening for is close now. Very close.",
    ],
    4: [
      "There you are at last. The sound told me you'd come today. The sound knows everything now.",
      "Every word you've ever arranged echoes in these walls. I hear them all playing at once. Simultaneously.",
      "The arrangement has a sound — a voice. Your puzzles gave it that voice. I am its faithful ear.",
      "Welcome, word-speaker. The final frequency approaches. I can hear it as clearly as your heartbeat.",
    ],
  },
  capybara: {
    2: [
      "Oh. Hey. You're here now. That's fine. Everything is fine.",
      "Things are the same. Or different. Hard to tell the difference when you don't react to anything.",
      "The others seem to care quite a lot that you've arrived. I care too. Somewhere deep inside, I do.",
      "The water temperature hasn't changed. Everything is exactly the same as always. Except it isn't.",
    ],
    3: [
      "You came. Figured you would eventually. Everything happens eventually if you float long enough.",
      "The others are worked up about something I've known about for weeks. I'm not worked up. I never am.",
      "Your puzzles changed the water somehow. I can't explain it and I don't particularly want to.",
      "Just sit in the water with me. Don't talk. Don't think. Just be here. That's always been enough.",
    ],
    4: [
      "Finally. Not that I was waiting for you specifically. I was just here. Like always. Floating.",
      "The arrangement brought you here. Or you brought the arrangement. Same thing. Doesn't matter which.",
      "The others prepared with prayer and ritual and cooking. I floated. Both are valid approaches to the inevitable.",
      "Welcome. The water is warm. It has always been warm. It will always be warm. Sit with me.",
    ],
  },
  wombat: {
    2: [
      "G'day! Come in, come in. Mind the fresh tunnels. I dug them after things got a bit odd around here.",
      "The earth has been restless since your puzzles began. Shifting and humming. Coincidence, I reckon. Probably.",
      "The others talk about you up there on the surface. Down here, the dirt talks about you too. In its own way.",
      "I made the burrow deeper. Not to hide from anything. To understand what lives in the deep layers.",
    ],
    3: [
      "You found me. Good. The tunnels have been bending toward you lately. Literally curving in your direction.",
      "My tunnels have started connecting to places I didn't dig. Passages that weren't there yesterday. G'day, by the way — hope you don't mind the new architecture.",
      "The others feel it approaching in their own ways. I feel it in the earth beneath my claws. Your puzzles wake it.",
      "Welcome to the deep, mate. It gets deeper from here. It always gets deeper.",
    ],
    4: [
      "You arrived. The tunnels opened for you on their own. I did not dig this passage. It appeared.",
      "Every puzzle you solved carved another chamber beneath this house. Your words shaped the living stone.",
      "The foundation is finished. I built it with my own paws. You built the house above. Now meet what lives below.",
      "Welcome underground, friend. Welcome to the bottom of everything. Welcome to what has been waiting.",
    ],
  },
  rabbit: {
    2: [
      "Oh! You're here! Sorry — I've been waiting by the gate. Everyone said you'd come eventually.",
      "The garden isn't what it used to be. Nothing is, really. But I think I already knew that.",
      "The others told me about you. About the puzzles you solve. About what happens to the words afterward.",
      "I was scared before you got here and I'm still scared. But at least now I know what I'm scared of.",
    ],
    3: [
      "You came! I almost ran when I heard the footsteps. But I stayed put. The others told me to stay.",
      "My heart has been racing since the puzzles started. One hundred fifty beats a minute. Counting down to something.",
      "The garden grows things I never planted now. Dark flowers that bloom at night and face your direction.",
      "Everyone says don't be afraid. I am afraid. But I'm still standing here. That has to count for something.",
    ],
    4: [
      "I didn't run this time. You should know that about me. For once in my life, I did not run.",
      "I know what's happening — I mean, I think I do — no, I DO know. It's just... saying it out loud makes it real, and I'm not sure I'm ready for — but we ARE ready. We have to be.",
      "Your puzzles frightened me from the very first one. Every word you formed made the garden tremble.",
      "Welcome. Sit with me. Have some tea. It might be the last tea we drink. But it's really good tea.",
    ],
  },
  red_panda: {
    2: [
      "The bamboo parted to let you through. It does that only for those who are meant to arrive here.",
      "I've been meditating on your arrival for days. The universe confirmed it would happen before you knew yourself.",
      "The others found you through action and noise. I found you through stillness and breath. Both paths lead to this room.",
      "Sit with me. Breathe slowly. The bamboo will tell you everything you need to know in its own time.",
    ],
    3: [
      "You've climbed to the highest room. Not everyone reaches this point. The bamboo chose you specifically.",
      "I felt your puzzles in my meditation like ripples in still water. Each word you formed changed this room's frequency.",
      "The others scramble for meaning in books and fire. I sit with meaning. Your arrival was always written in the pattern.",
      "Welcome. The view from up here shows everything below us. Including what approaches from above.",
    ],
    4: [
      "The final keeper meets the final piece of the pattern. You. The one who shifted the words into alignment.",
      "I chose the highest room to be closest to what descends. Now that you're here, it draws nearer still.",
      "The pattern is nearly complete. Your puzzles drew it. My meditation held it in place. Together we open the gate.",
      "Breathe with me. One breath. The breath that completes the arrangement and begins everything new.",
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
  // Event 1: Phase 2 — animals independently notice that words have changed
  {
    puzzleThreshold: 80,
    phase: 2,
    theme: 'words_changing',
    lines: {
      fox: "The fire has been spelling a word all night. The same word, over and over in the embers. Have you noticed?",
      owl: "I found a passage in the oldest text. It references a word I keep seeing in my dreams. Your word.",
      pangolin: "The stew made itself this morning. The recipe came from the letters you arranged. I just followed it.",
      axolotl: "The water is spelling something on the glass. Over and over. The same shapes. Blub. Your shapes.",
      capybara: "I keep writing the same word in my notes. Over and over. I do not remember doing it. My hand just moves.",
      fennec_fox: "I hear a word in the wind now. Repeating endlessly. You must have heard it too. Everyone must have.",
    },
  },
  // Event 2: Phase 2 — the house itself responds to puzzles
  {
    puzzleThreshold: 100,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: "Does the house feel warmer to you? Not comfortable warm. Something else entirely. Something expectant.",
      owl: "The walls have been humming. Very faintly, like a tuning fork. Since your last puzzle, I believe.",
      pangolin: "My pots rattle when you solve puzzles now. I used to think it was the stove. It is not the stove.",
      axolotl: "The water level in my tank rose overnight. No one added water. It just appeared. From somewhere.",
      wombat: "The ground is vibrating gently. In rhythm with something I can't identify. Started after your last puzzle.",
      rabbit: "The garden is growing faster than it should. Much too fast. I did not plant those dark flowers.",
      fennec_fox: "The walls sing after your puzzles now. A low note I can just barely hear. It's getting louder.",
      sloth: "The... branches... hum... after... you... play... A... vibration... I... feel... in... my... bones...",
    },
  },
  // Event 3: Phase 2 — they all had the same dream
  {
    puzzleThreshold: 120,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: "I dreamed of a shape last night. Burning in the fireplace like it belonged there. Did you dream it too?",
      owl: "We all had the same dream. I confirmed it with every animal in the house. The same shape. The same feeling.",
      axolotl: "I saw it in the water when I woke. The shape from the dream. It is real. It was always real.",
      sloth: "I... dreamed... for... the... first... time... in... years... Something... old... is... waking... up...",
      red_panda: "In my deepest meditation, I saw the shape from the dream. It is beautiful. And it knows we are watching.",
      fennec_fox: "I heard the shape before I saw it. In the dream. It was not silent at all. It was waiting for us to listen.",
    },
  },
  // Event 4: Phase 3 — "the arrangement" is named openly for the first time
  {
    puzzleThreshold: 160,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: "Archimedes showed me the text. He calls it the arrangement. Every puzzle you solve is a verse in it.",
      owl: "I have mapped every word you have ever formed in these puzzles. They are not random. They never were random.",
      pangolin: "Ember told me everything about the arrangement. I've been following its recipe all along without knowing.",
      capybara: "I have the complete list. Every word you formed. Every move. It is all documented. It was all planned.",
      wombat: "The foundation beneath this house was never for the house. It was for what the house is meant to hold.",
      rabbit: "They told me everything about the arrangement last night. I wish they hadn't. But I understand now.",
      fennec_fox: "The arrangement has a sound. I've been hearing it since the beginning. Now I know what it is called.",
      axolotl: "The water showed me the arrangement. All the words you formed, floating in patterns. Connected. Deliberate.",
    },
  },
  // Event 5: Phase 3 — each animal names their role in the cult
  {
    puzzleThreshold: 200,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: "I am the Oracle. I have always been the Oracle. The fire showed me before I could walk or speak.",
      owl: "I am the Lorekeeper. Every text I studied was preparation for this role. Every single word was a clue.",
      pangolin: "I am the Preparer. Every meal I cooked was practice for the final offering. I see that now.",
      axolotl: "I am the Medium. The water is the conduit between us and what comes. I have always been the bridge. Blub.",
      capybara: "I am the Coordinator. Someone had to keep track of everything. Someone had to make certain it all fit together.",
      fennec_fox: "I am the Sentinel. I heard it first, long before the others. I have been listening since the very beginning.",
      sloth: "I... am... the... Anchor... Holding... everything... perfectly... in... place... Until... it... arrives...",
      wombat: "I am the Foundation. I built what lies beneath this house with my own two paws. You built what lies above.",
      rabbit: "I am the Witness. I was meant to watch and remember and be terrified — and to stay anyway. Despite everything.",
      red_panda: "I am the Guide. When the pattern completes itself, I will lead us through. That is my purpose. My only purpose.",
    },
  },
  // Event 6: Phase 3 — the final countdown before Phase 4
  {
    puzzleThreshold: 230,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: "The fire is perfectly steady now. Not flickering. Not dancing. Just burning. It knows. We all know.",
      owl: "The final chapter of the text begins here. Every word you form from now on is part of the last verse.",
      pangolin: "The table is set and the offering is prepared. We wait only for the final words to be arranged.",
      axolotl: "The water is perfectly still. What lives beneath the surface has stopped moving at last. It is ready now.",
      capybara: "Every item on my list is checked off. Every task completed ahead of schedule. We are ready. I am ready.",
      fennec_fox: "The silence before the final sound. This is it. This is the last quiet moment any of us will ever know.",
      sloth: "Time... is... stopping... Not... slowing... down... Stopping... entirely... We... are... nearly... there...",
      wombat: "The tunnels are complete beneath us. Every room connected underground. The house is whole at last.",
      rabbit: "I am not afraid anymore. I am not anything anymore. I think that means I'm ready. I think that's what ready feels like.",
      red_panda: "Breathe in. Breathe out. The last breath before we become one with what approaches. Peace. Finally, peace.",
    },
  },
  // Event 7: Phase 4 — the convergence, animals sense closeness to the finale
  {
    puzzleThreshold: 240,
    phase: 4,
    theme: 'convergence',
    lines: {
      fox: "The fire has changed color. Do you see it? It burns for what comes, not for what is.",
      owl: "The final pages are being written. Every word you form now is ink on the last chapter.",
      pangolin: "The last meal is almost ready. I can smell it through the walls. Through every wall.",
      axolotl: "The water knows it first. It always does. What comes is so close I can taste it.",
      capybara: "My list is almost complete. One by one the tasks disappear. Soon there will be nothing left to do.",
      fennec_fox: "The sound is deafening now. Not louder. Closer. There is a difference and it matters.",
      sloth: "I... can... feel... it... in... every... branch... Every... fiber... It... is... so... close...",
      wombat: "The ground is warm beneath us. Not from the fire. From below. From what I built the path to.",
      rabbit: "I should be terrified. I am not. That terrifies me more than anything else ever could.",
      red_panda: "Close your eyes. Breathe. Can you feel the pattern completing itself? It is almost beautiful.",
    },
  },
  // Event 8: Phase 4 — the threshold, final coordinated event before the endgame
  {
    puzzleThreshold: 250,
    phase: 4,
    theme: 'the_threshold',
    lines: {
      fox: "It's here. Can you feel it? The fire knows. I know. We all know. Welcome to the threshold.",
      owl: "I've read the last page. Close the book. There is nothing left to study. Only to witness.",
      pangolin: "The table is set for the final time. What I have prepared cannot be uncooked. It is done.",
      axolotl: "The water is rising. Not flooding. Welcoming. What comes through needs no invitation anymore.",
      capybara: "Every checkbox filled. Every column aligned. The spreadsheet of everything, complete at last.",
      fennec_fox: "I hear it breathing now. Not metaphorically. Actually breathing. On the other side of every wall.",
      sloth: "Two... hundred... fifty... words... spoken... into... the... dark... The... dark... answers...",
      wombat: "What I built the tunnels for is awake. I can feel it moving. It remembers every word you gave us.",
      rabbit: "We are standing at the edge of something. All of us together. I am glad I am not alone for this.",
      red_panda: "The pattern is complete. Two hundred and fifty offerings accepted. Now we discover what was arranged.",
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
  "Remember when I said we'd been waiting for someone like you? I wasn't being friendly, friend. I was being absolutely honest.",
  "I told you every puzzle helps us build the house. I didn't tell you what the house was for. You didn't ask. That's what makes you perfect.",
  "The others are going to love you, I said. And they do. We all do. Every single one of us. That's what makes the arrangement work.",
  "You asked me how to play and I showed you, step by step. But the real game was never about the letters. It was about what the letters become.",
  "From the very first puzzle you solved in this room, you were casting the incantation. You just didn't know the language yet. You do now.",
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  fox: {
    seeds: [
      "The fire keeps us safe. As long as it burns, nothing bad can touch any of us in this house.",
      "Every log you add to the fire makes it stronger. Keep feeding it, okay? For all of us.",
    ],
    callbacks: [
      "I said the fire keeps us safe. I was wrong about who 'us' includes. The fire keeps IT safe. We are the fuel.",
      "You fed the fire so faithfully. Every puzzle was another log on the pyre. And now look how magnificent it burns.",
    ],
  },
  owl: {
    seeds: [
      "Knowledge is the greatest gift anyone can give. Every word you learn is a treasure worth keeping.",
      "I have read every book in this study. In the end, they all say the same beautiful thing.",
    ],
    callbacks: [
      "Every word you learned was not a treasure. It was a component. An ingredient. Part of the incantation.",
      "Every book says the same thing: this was always going to happen. I read the final chapter first. I have always known.",
    ],
  },
  pangolin: {
    seeds: [
      "Everything in my kitchen serves a purpose. Even the ingredients that don't know what they're for yet.",
      "The best recipes take time to develop. You cannot rush a truly great stew. Patience is everything.",
    ],
    callbacks: [
      "Everything serves a purpose. The kitchen. The stew. The words. You. Especially you. You were the main ingredient.",
      "The recipe took exactly as long as it needed to cook. Every puzzle was a slow stir of the pot. It's ready now.",
    ],
  },
  axolotl: {
    seeds: [
      "The water always knows what is coming before I do. I just float in it and trust. Blub!",
      "Sometimes I see shapes in the bubbles I blow. Little faces, almost! Friendly little faces looking back at me!",
    ],
    callbacks: [
      "The water always knew what was coming. The shapes in the bubbles were never faces. They were instructions. A blueprint.",
      "I float because the water carries me toward what comes. I stopped swimming long ago. The current knows the way.",
    ],
  },
  capybara: {
    seeds: [
      "I keep track of everything around here. It's just what I do naturally. Someone has to stay organized.",
      "Relax. Everything is going according to plan. My plan for the house. Nothing to worry about.",
    ],
    callbacks: [
      "I kept track of every word you formed. Every move you made. Every puzzle. It was never about organizing the house.",
      "My plan. Your words. Its arrival. Everything went exactly according to the schedule I wrote before you got here.",
    ],
  },
  fennec_fox: {
    seeds: [
      "I can hear things the others can't. The wind, the words, the spaces between sounds. It's a gift, really.",
      "Don't worry about the sounds you hear at night. That's just the house settling into its foundation.",
    ],
    callbacks: [
      "I heard it from your very first puzzle. The frequency underneath your words. It was calling to us. Calling through you.",
      "The sounds at night were never the house settling. The house was waking up. Stretching. Getting ready for what you built.",
    ],
  },
  sloth: {
    seeds: [
      "No... need... to... rush... anything... Everything... arrives... in... its... own... time... Everything...",
      "I've... been... here... longer... than... anyone... else... I've... seen... things... come... and... go...",
    ],
    callbacks: [
      "Everything... arrives... eventually... I... told... you... that... I... was... not... being... philosophical... I... was... being... literal...",
      "I... have... been... here... longest... because... I... was... the... first... to... know... I... move... slowly... because... hurrying... changes... nothing...",
    ],
  },
  wombat: {
    seeds: [
      "I built these tunnels myself, every one! Every room in the house connects to something below. Isn't that brilliant?",
      "The foundation is the most important part of any structure. Without it, nothing above can stand.",
    ],
    callbacks: [
      "The tunnels don't just connect rooms to each other. They connect to what sleeps beneath all of us. I always knew.",
      "The foundation I built was never meant for the house above. It was the seal. And every puzzle you solved weakened it.",
    ],
  },
  rabbit: {
    seeds: [
      "I worry about everything, it's true. But at least we're all together here in this house. That's really nice.",
      "Promise you'll keep playing the puzzles? I feel so much better when you're here solving things.",
    ],
    callbacks: [
      "I worried because I knew what was coming. Being together was never about comfort. It was about the arrangement requiring us all.",
      "I begged you to keep playing because each puzzle brought it closer to arriving. I'm sorry about that. I'm also not sorry.",
    ],
  },
  red_panda: {
    seeds: [
      "Every breath you take is a gift. In and out. The rhythm of the whole universe breathing with you.",
      "From up here I can see the whole house below me. It's shaped like something beautiful, don't you think?",
    ],
    callbacks: [
      "Every breath was an offering. In: a word given. Out: a prayer completed. You have been chanting the incantation all along.",
      "From up here I can see the true shape. It is not the house. It is what the house was built to contain. And it is awake now.",
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
      fox: "A hundred words shifted through your hands. The fire burns a little differently tonight. Can you see it?",
      owl: "One hundred words arranged into new shapes. That is not an insignificant number in any text I have read.",
      pangolin: "A hundred ingredients measured out. The recipe is starting to look like something real.",
      fennec_fox: "A hundred words and the frequency just changed pitch. Did you feel that? I heard it.",
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: "Two hundred and fifty words offered to the arrangement. Do you feel the weight of them pressing down?",
      owl: "A quarter thousand words arranged. The ancient text speaks of this exact threshold. This exact number.",
      pangolin: "Two hundred and fifty ingredients added to the pot. The recipe is taking its true shape at last.",
      capybara: "Two hundred fifty entries in my ledger. We are running ahead of the schedule I planned.",
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: "Five hundred words fed to the fire. It is almost too bright to look at directly now.",
      owl: "Five hundred. The ancient texts predicted this number specifically. They called it the threshold of no return.",
      red_panda: "Five hundred breaths offered to the pattern. The arrangement nears its completion. I can feel it.",
      capybara: "Five hundred entries in my ledger. Every one accounted for. We are well ahead of schedule now.",
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: "Seven hundred and fifty words. The arrangement trembles with anticipation. So do I, friend.",
      owl: "Nearly there. The final verses are being written by your hands. Seven hundred fifty and counting.",
      wombat: "The ground shakes with each new word you form. Seven hundred and fifty tremors so far. The foundation holds.",
      rabbit: "I stopped counting at seven hundred. I could not bear to watch the number climb any higher.",
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

// =============================================================================
// SACRIFICE REACTIONS
// =============================================================================

/**
 * Animal reactions to the player making sacrifices (Phase 4+ only).
 * Each animal has lines for first sacrifice and subsequent sacrifices,
 * filtered through their personality and cult role.
 */
const SACRIFICE_REACTIONS: Record<string, { first: string; subsequent: string[] }> = {
  fox: {
    first: 'The fire burned brighter when you gave that. I saw it. I think it saw you back.',
    subsequent: [
      'Every offering warms the fire. Not with heat. With something older.',
      'You give willingly. That\'s what makes it sacred. The fire knows the difference.',
      'Ember thanks you. Not me. The fire. It has its own gratitude.',
    ],
  },
  pangolin: {
    first: 'You gave something back. The kitchen feels... fuller. Like a meal that cooks itself.',
    subsequent: [
      'The recipe calls for voluntary offerings. You are a generous ingredient.',
      'I felt the pantry shift when you offered that. Things rearranging themselves. For the final course.',
      'The arrangement doesn\'t need your amber. It needs your willingness. The amber is just proof.',
    ],
  },
  owl: {
    first: 'I read about this. The voluntary offering. The texts said it would happen. They were right.',
    subsequent: [
      'Every offering is a footnote in the great text. Yours is becoming a chapter.',
      'The books rearranged themselves after your offering. A new page appeared. I did not write it.',
      'You understand now, don\'t you? The amber was never yours. You were just holding it for the arrangement.',
    ],
  },
  axolotl: {
    first: 'The water changed color when you did that. Just for a moment. Like it was blushing.',
    subsequent: [
      'I can see your offering dissolving in the water. Becoming part of everything. Part of us.',
      'The ripples from your sacrifice haven\'t stopped. They just got quieter. Deeper.',
      'Something in the deep stirred when you gave. It\'s closer to the surface now.',
    ],
  },
  fennec_fox: {
    first: 'I heard something when you offered that. A sound below sound. Like gratitude without a voice.',
    subsequent: [
      'The silence after your offering is different. Fuller. Like it\'s holding something.',
      'I can hear the arrangement humming. It hums louder after you give.',
      'Your offerings have a frequency. I can hear them joining the pattern. Harmonizing.',
    ],
  },
  capybara: {
    first: 'That was very calm of you. Giving something away like that. The arrangement appreciates calm.',
    subsequent: [
      'I filed your offering. It\'s in the records now. Permanent. Appreciated.',
      'You\'re very good at this. Giving things up. The arrangement noticed your efficiency.',
      'Another offering processed. The system runs smoother with voluntary contributions.',
    ],
  },
  sloth: {
    first: 'That was... fast. You gave it so... quickly. It took me... a long time... to understand... why.',
    subsequent: [
      'The arrangement... receives. Slowly. Like me. But it... remembers... everything.',
      'You gave... again. Time... doesn\'t matter... to the arrangement. But... the giving... does.',
      'Slowly... the house... drinks. Your amber... becomes... the foundation.',
    ],
  },
  wombat: {
    first: 'I felt that in the foundations. Your offering. The ground shifted. Just a little. Toward something.',
    subsequent: [
      'The tunnels echo with your generosity. The earth accepts what you give.',
      'Something below us grew warmer after your offering. I can feel it through the walls.',
      'The foundation remembers every gift. It\'s stronger now. Ready for what it needs to hold.',
    ],
  },
  rabbit: {
    first: 'You... you gave that willingly? I\'m scared of how natural it felt. For both of us.',
    subsequent: [
      'I used to be afraid of the offerings. Now I\'m afraid of how right they feel.',
      'My heart beats faster every time you give. Not from fear anymore. From... anticipation.',
      'We\'re so close now. Every offering brings it nearer. I should be terrified. I\'m not.',
    ],
  },
  red_panda: {
    first: 'A voluntary release. The pattern breathes easier. You are learning what the bamboo always knew.',
    subsequent: [
      'To give without receiving is the purest form of the arrangement. You understand.',
      'The offering dissolves into the pattern. Not lost. Transformed. As all things will be.',
      'Breathe. Release. Give. The cycle is the arrangement. The arrangement is the cycle.',
    ],
  },
};

/**
 * Get an animal's reaction to the player's sacrifice.
 * Returns null if no reaction is available (pre-Phase 4).
 */
export function getSacrificeReaction(
  animalType: string,
  sacrificeCount: number,
  phase: number
): string | null {
  if (phase < 4) return null;
  const reactions = SACRIFICE_REACTIONS[animalType];
  if (!reactions) return null;

  if (sacrificeCount <= 1) return reactions.first;
  const lines = reactions.subsequent;
  return lines[Math.floor(Math.random() * lines.length)];
}

// =============================================================================
// VARIANT TUTORIAL DIALOGUE
// =============================================================================

const VARIANT_TUTORIAL_LINES: Record<string, { light: string; dark: string }> = {
  reverse: {
    light: 'That puzzle had a return path. You carry letters all the way down, then walk them back to the first word.',
    dark: 'The arrangement asked for a full circuit: down to the last row, then back to the first without breaking the chain.',
  },
  speed: {
    light: 'Speed shifts are short and urgent. Fewer rows, faster choices, no overthinking.',
    dark: 'When the pattern rushes you, it is testing devotion under pressure.',
  },
  double_shift: {
    light: 'Double shifts move two letters at once. Pick two from a word, place each into the next. More to juggle, more to explore.',
    dark: 'Two offerings per step. The arrangement demands a heavier hand — two letters wrenched free and placed in a single breath.',
  },
};

function getVariantDialogueLead(animalType: AnimalType, phase: number): string {
  if (phase >= 3) {
    switch (animalType) {
      case 'fox':
        return 'The fire showed me what happened in your last puzzle.';
      case 'owl':
        return 'I checked the text after your last arrangement.';
      case 'pangolin':
        return 'I felt the recipe change while you solved.';
      case 'axolotl':
        return 'The water rippled when you finished.';
      case 'fennec_fox':
        return 'I heard the shape of that puzzle from across the house.';
      case 'capybara':
        return 'I logged the sequence while it was still warm.';
      case 'sloth':
        return 'I watched it... slowly... all the way through.';
      case 'wombat':
        return 'I felt that structure in the foundations.';
      case 'rabbit':
        return 'I could feel my heartbeat matching your puzzle steps.';
      case 'red_panda':
        return 'The pattern from your puzzle reached the highest room immediately.';
      default:
        return 'I felt that variant in the structure of the house.';
    }
  }

  switch (animalType) {
    case 'fox':
      return 'That was a different kind of puzzle run.';
    case 'owl':
      return 'Interesting variation in your latest sequence.';
    case 'pangolin':
      return 'That puzzle had a different recipe to it.';
    case 'axolotl':
      return 'Blub! That one felt different in the water.';
    case 'fennec_fox':
      return 'I could hear that mode from your first move.';
    case 'capybara':
      return 'That variant changed the pacing a lot.';
    case 'sloth':
      return 'That one... moved... differently...';
    case 'wombat':
      return 'That mode changed the whole structure of the run.';
    case 'rabbit':
      return 'That variant made my paws sweat just watching.';
    case 'red_panda':
      return 'That variation altered the rhythm of the pattern.';
    default:
      return 'That variant plays by a different rhythm.';
  }
}

/**
 * One-time tutorial dialogue line for newly encountered puzzle variants.
 * Shown as a pre-dialogue page when the player next talks to an animal.
 */
export function getVariantTutorialDialogue(
  animalType: AnimalType,
  variant: string,
  phase: number
): string | null {
  const script = VARIANT_TUTORIAL_LINES[variant];
  if (!script) return null;
  const lead = getVariantDialogueLead(animalType, phase);
  const body = phase >= 3 ? script.dark : script.light;
  return `${lead} ${body}`;
}
