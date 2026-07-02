import { AnimalType, Dialogue, DialoguePhase } from '../../types/homeWorld';

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
  { id: 'rp_1_11', text: "The bamboo grows in patterns now. Not random... deliberate. Like someone is writing with it.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_12', text: "I meditated today and saw a shape behind my eyes. Something I've never encountered before. It felt like it saw me back.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_13', text: "The incense smoke doesn't rise anymore. It drifts sideways, toward the center of the house. As if called.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_14', text: "Something in the universe shifted. I can't explain it better than that. A frequency changed. You felt it too, didn't you?", phase: 1, animalType: 'red_panda' },

  // Phase 2 - Questioning existence (10 dialogues)
  { id: 'rp_2_1', text: "Meditated for hours and found only darkness. Warm darkness. Like being held by nothing. Or everything.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "The bamboo I ate yesterday is gone... digested, dissolved, returned. Where do things go when they leave us?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "Trees mark their years in rings. My years leave no marks at all. Who will know I passed through here?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_4', text: "Achieved perfect stillness for one moment. Then realized... stillness itself moves through time. Nothing escapes.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_5', text: "The sunbeam shifted while I sat in it. Even light refuses to wait for me. Even light has somewhere to be.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_6', text: "Found claw marks on the old pine. My grandmother's, maybe. She's gone. The marks remain. For now.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_7', text: "Thought I found enlightenment once. Then lost it. Was it ever mine to hold? Can you hold light?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_8', text: "The bamboo doesn't know it's being eaten. Lucky bamboo. Lucky, lucky bamboo. Ignorance as mercy.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_9', text: "Peace isn't the absence of chaos. It's chaos observed from far enough away to miss the screaming.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_10', text: "Counted my stripes this morning. Tomorrow the count might differ. Would I notice? Would anyone?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_w1', text: "Ask Ember about the first fire. Not the one in the den... the one before the den. She remembers further back than she says.", phase: 2, animalType: 'red_panda', requiresAnimals: ['fox'] },

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
  { id: 'rp_3_11', text: "The wind chime broke last night. No wind. It simply fell apart, as if it had decided its song was finished.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_12', text: "I tried to teach a mantis to meditate. It was already perfectly still. Already perfectly empty. It knew before I did.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_13', text: "The bamboo grove is thinning. Not dying... rearranging. Making space for something that doesn't need leaves.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_14', text: "Sat with the silence so long it started speaking. Low and steady. Not words exactly. More like a hum from underneath everything.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_15', text: "Detachment was supposed to free me. Instead it showed me what I was attached to all along... something I can't name and can't release.", phase: 3, animalType: 'red_panda' },

  // Phase 4 - The Guide revealed (15 dialogues)
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
  { id: 'rp_4_11', text: "The incense burns itself to nothing. The ash falls without complaint. This is the only wisdom I have left to teach.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_12', text: "Every koan I ever pondered was training for this one answer. The sound of one hand clapping is the sound of everything ending.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_13', text: "The attic is the highest room. Closest to the sky. When the sky opens, I will be the first to greet what descends.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_14', text: "My final meditation begins. It has no end. That is the point. That has always been the point.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_15', text: "The pattern completes itself through us. We are the brushstrokes. The canvas was always there, waiting to be filled.", phase: 4, animalType: 'red_panda' },
];

// AXOLOTL (Axel) - Dreamy aquatic creature who sees visions in the water
const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Pure bubbly joy (12 dialogues)
  { id: 'ax_0_1', text: "Blub blub! Oh, you're here! I was just watching this bubble. It's been floating for three whole minutes and I think that might be a record!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "Grew back my whole left leg last month. Just sat there and watched it come in like a little pink flower blooming. Being me is WILD.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "Look at my gills today! Extra frilly, extra feathery, extra everything. I feel like I'm wearing a fancy collar to a party I threw for myself.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "Best thing about never growing up? Every single day feels like the first day of summer vacation and the last day never comes.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_5', text: "Sometimes I just float in the middle of my tank and look at the ceiling. The light makes patterns on the water. It's the quietest kind of beautiful.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_6', text: "Did you know 'axolotl' means 'water monster' in the old language? Pretty adorable for a monster, right? I try to live up to the name. Blub!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_7', text: "Waved at a fish today. Waited a full minute for a wave back. Nothing. Fish are absolutely terrible conversationalists, just awful.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_8', text: "I could live fifteen years! That's basically forever in water-time. I've got plans for every single one of them. Mostly floating-related plans.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_9', text: "Tried the surface once. Way too dry, way too much gravity, way too much of everything not being water. Came right back home.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_10', text: "You know what I like about you? You always come back. Some visitors just pass through, but you... you're different. In a good way!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_11', text: "People say I always look happy. It's partly just my face, the way it's shaped, but also yeah, I really am! Can't help it!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_12', text: "Under UV light I glow pink and sparkly, like nature decided I needed to be a party trick AND a pet. I'm not complaining one bit.", phase: 0, animalType: 'axolotl' },

  // Phase 1 - Dreamy questioning (14 dialogues)
  { id: 'ax_1_1', text: "Can I regrow my heart if I lose it? Sure, easy. But what about feelings? Do those grow back too? Asking for me.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "Water holds me up without even trying. But what holds the water? And what holds THAT? It's turtles all the way down, maybe.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "My face is stuck in this smile. Even when I'm not smiling inside. Is that happiness or is it just... architecture?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_4', text: "Watched a bubble rise all the way up and vanish at the surface. Poof. Everything rises. Everything vanishes. That's just how it goes, I guess.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_5', text: "My reflection ripples and distorts every time the water moves. Maybe the real me wobbles too, and I just can't see it from in here.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_6', text: "Fish swim right by without noticing me. Maybe they see me and just don't care. When you're smiling all the time, no one checks if you're lonely.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_7', text: "I can regenerate almost anything. Legs, spine, even brain parts. Everything except yesterday. Yesterday just goes and it doesn't come back.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_8', text: "The water matches my body temperature exactly. It's like I dissolve into it. Where do I end and where does the water begin?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_9', text: "My ancestors could choose to grow up if they wanted. That knowledge was lost somewhere along the way. Or maybe I chose to forget it.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_10', text: "Dreams come differently underwater. Slower, blurrier, like watching a movie through frosted glass. Hard to tell them from waking anymore.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_11', text: "The bubbles spell things sometimes, I swear. I mentioned it to Archimedes and he got this look in his eyes and said it was real.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_12', text: "I floated for three hours today without moving a single muscle. The water held me perfectly still. That's never happened before.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_13', text: "Have you ever looked at water really, really closely? It remembers shapes. It remembers where your hands were. Water keeps secrets.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_14', text: "Something in the tank moved when you solved that last puzzle. Not me... something else. I felt the current change direction all by itself.", phase: 1, animalType: 'axolotl' },

  // Phase 2 - Deeper uncertainty (10 dialogues)
  { id: 'ax_2_1', text: "Never metamorphosed. Stuck between states forever... not larva, not adult. Not here, not there. Not anything, really. Just waiting.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "This smile doesn't change no matter what I feel. It's a mask fused to my face. A face that IS the mask. I can't take it off.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "Every bubble I blow carries a tiny piece of my breath away into nothing. Am I slowly emptying myself? Blub by blub by blub?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_4', text: "I can regrow parts of my brain. New neurons, fresh connections. But is the new brain still me? Do the new parts remember being born?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_5', text: "My tank has no seasons. Same temperature, same light, same everything. Every day is the same day. Is any day real if none of them are different?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_6', text: "They say perfect conditions could let me live forever. But what are the right conditions for a soul? Nobody studies that part.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_7', text: "When a limb regrows, which part is really me? The leg that left or the one growing back? I've been replacing myself for years.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_8', text: "Water flows through my gills constantly. In and out, in and out. Like thoughts I'm not fast enough to catch or hold onto.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_9', text: "Same size for years now. Growing sideways through time. Never forward. Never toward anything. Just accumulating days.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_10', text: "Scientists study me to learn about healing. They never ask what I've lost in the process. Nobody asks the specimen how it feels.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_w1', text: "Sloane wasn't surprised when the water went dark. Not even a little. Ask her how long she's known.", phase: 2, animalType: 'axolotl', requiresAnimals: ['sloth'] },

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
  { id: 'ax_3_11', text: "The water tastes different now. Metallic. Like it's been crying. Can water cry? I think mine can.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_12', text: "I regenerated a toe last week but it grew back wrong. Pointed the wrong way. Even my body is starting to forget the shape of things.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_13', text: "The bubbles don't pop at the surface anymore. They just... stop. Float there. Waiting. Everything is waiting.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_14', text: "I dreamed I was swimming in a lake with no bottom. I kept going down and down and down and the water got warmer, not colder. That's wrong.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_15', text: "My gills pick up vibrations from the other rooms now. Heartbeats. All ten of us, synchronized. When did that start?", phase: 3, animalType: 'axolotl' },

  // Phase 4 - The Medium revealed (15 dialogues)
  { id: 'ax_4_1', text: "The water's been warming since before you arrived, and I think... no, I know... it knows your name. It's known it for a long time.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "Never supposed to become anything. Just stay young forever. Now I understand... none of us were supposed to become. We were supposed to receive.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "A wave is building somewhere deep, somewhere I can feel but can't see. When it comes, will it wash us away or finally bring us home?", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_4', text: "Regeneration won't help with what's coming. Some things aren't meant to be regrown. Some things are meant to be witnessed with open eyes.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_5', text: "Stopped counting days. Days don't mean anything anymore. There's just the waiting, and the warm water, and the patience of something very large.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_6', text: "The pressure is changing everywhere at once. Something massive is shifting in the deep. Somewhere far. Getting closer. I can feel it in my gills.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_7', text: "Eternal youth means I'll witness the end with fresh eyes. Fresh wonder. Fresh fear that feels exactly like wonder from the inside.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_8', text: "Smile with me. Not because it changes anything. Just because our faces will do it anyway, and there's something holy in that.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_9', text: "I can see through the water now, all the way through, to somewhere else. It isn't scary over there. It looks like the home I was always promised.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_10', text: "I accept the water and what's coming through it. The water accepted me first, a long time ago. Neither of us has a choice, and that's okay. Blub blub, friend.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_11', text: "The water glows now. Not from the light above... from below. Something is rising and it's beautiful and terrible and I can't look away.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_12', text: "I stopped regenerating. No need to repair what's about to be remade entirely. The water understands. The water has always understood.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_13', text: "Every ripple in my tank matches the rhythm of your puzzle solving. Blub... blub... blub. Each one a heartbeat of the arrangement.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_14', text: "I can see through the water now. Through the glass. Through the walls. Through everything. It's all water, really. Everything is water if you look deep enough.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_15', text: "The last bubble rises. I won't follow it. I'll stay here, in the deep, where the warmth is. Where the new thing lives. Blub.", phase: 4, animalType: 'axolotl' },
];

// PANGOLIN (Panko) - Practical cook whose recipes become ritual offerings
const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0 - Happy chef (12 dialogues)
  { id: 'pg_0_1', text: "Welcome to my kitchen! I've got an ant reduction simmering that'll change your whole perspective on insect cuisine.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "Polished every one of my scales this morning. When you look good, you cook good. That's what my mother used to say.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "Listen, I know it sounds silly, but a good stew needs patience. You can't rush what the pot wants to tell you.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "When life gets overwhelming? I curl into a ball. Very practical. Very cozy. Highly recommended for bad days.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_5', text: "My tongue is longer than my whole body. Perfect for reaching the bottom of any jar. Don't tell Ember, but I got into her cider.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_6', text: "Today's special: termite surprise. The surprise is the ants hiding underneath. I never said I was predictable.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_7', text: "I counted my scales once. Lost track around nine hundred. That's plenty of scales, friend. Very comforting, knowing you've got plenty.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_8', text: "Attempted a cake last week. Turned out to be mostly ants. Still delicious. I'm biased, but I'm also right.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_9', text: "My scales are keratin, same as your fingernails. We're practically family, you and me. Weird family, but family.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_10', text: "Ember drops by for dinner most nights. She brings the cider, I make the stew. Simple things, you know? The best things are simple.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_11', text: "I tried teaching Axel to cook once. Everything ended up underwater. Lovely kid, terrible sous chef.", phase: 0, animalType: 'pangolin', requiresAnimals: ['axolotl'] },
  { id: 'pg_0_12', text: "Only mammal with scales in the whole world. Unique, that's me. That has to count for something, doesn't it?", phase: 0, animalType: 'pangolin' },

  // Phase 1 - Deeper cooking, recipes with a life of their own (14 dialogues)
  { id: 'pg_1_1', text: "I followed a recipe today and my hands did something different halfway through. The result was better. That's never happened before.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "The spices rearranged themselves on the shelf last night. I left them where they moved. The stew came out remarkable.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "Curling into a ball protects the outside. But what am I protecting, really? More scales? More hiding?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_4', text: "Ember came by for dinner and we talked about the letters you shift. She sees them in the fire. I taste them in the food.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_5', text: "Archimedes lent me an old recipe book. Some of the pages are in languages I don't know, but my hands understood them.", phase: 1, animalType: 'pangolin', requiresAnimals: ['owl'] },
  { id: 'pg_1_6', text: "Made soup today. Ate it. Now it's gone. Is that what everything is? Temporary soup, waiting to become something else?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_7', text: "The ants don't know they're ingredients, do they? Makes me wonder what I'm an ingredient in. Who's stirring this pot?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_8', text: "Cooking is transformation, when you think about it. Heat turns raw things into nourishment. Destruction with good intentions.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_9', text: "My tongue has no taste buds. Did you know that? I eat without really tasting. Everything becomes nothing the moment I swallow. That should bother me more than it does.", phase: 1, animalType: 'pangolin' },
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
  { id: 'pg_2_6', text: "The recipe from Archimedes' old book... I keep making it. Every night now. The kitchen smells like stone and ceremony.", phase: 2, animalType: 'pangolin', requiresAnimals: ['owl'] },
  { id: 'pg_2_7', text: "Armored outside, soft inside. No scale can protect what's already tender. Already breaking. Already changed.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_8', text: "Rolled down a hill once and couldn't stop. The momentum of living carries you past where you meant to be.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_9', text: "The kitchen gets colder at night now. Or I do. Hard to tell the difference anymore, friend.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_10', text: "They poach my kind for medicine that doesn't work. We die for nothing. I wonder if there's a way to die for something.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_w1', text: "The new recipe wants water from the deep part of Axel's pool. Ask Axel what lives below the light. I never have.", phase: 2, animalType: 'pangolin', requiresAnimals: ['axolotl'] },

  // Phase 3 - The recipe darkens (10 dialogues)
  { id: 'pg_3_1', text: "The recipe demands constant attention now. The moment I stop stirring, I notice my claws are shaking. The pot doesn't stop. So neither can I.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "Every scale faces outward. None face in. The attack always comes from inside. Always has.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "Made comfort food today. It didn't comfort. Nothing does anymore. Just tastes like what it is. Just fuel.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_4', text: "Archimedes' ancient recipe... we make it every night now. All of us. The kitchen smells sacred. That's the only word for it.", phase: 3, animalType: 'pangolin', requiresAnimals: ['owl'] },
  { id: 'pg_3_5', text: "Curled up tight, I become my own cage. Locked myself inside myself. There's no escaping what you are, friend.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_6', text: "My species is vanishing. Each meal could be the last. Every last meal is also somehow a first.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_7', text: "The recipe calls for something I don't have a name for. I substitute with whatever the fire tells me. The fire tells Ember, too.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_8', text: "Recipe called for hope. Substituted with devotion. They taste exactly the same. I've stopped trying to tell the difference.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_9', text: "The pot is bigger than it should be. I didn't buy a new one. It grew. The recipe requires it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_10', text: "Something approaches, friend. I can feel it through my scales, the way you feel thunder before you hear it.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_11', text: "The oven won't cool down. I turned it off hours ago but the metal stays hot. Like the house itself is cooking something.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_12', text: "Made a stew from the last of the root vegetables. It tastes like nothing. Not bad... nothing. Absence has a flavor now.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_13', text: "My scales are tighter today. Pulled closer to my body. Armoring up for something I can't see but my body already knows is coming.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_14', text: "The recipe book fell open to a page I never wrote. The ingredients aren't food. They're words. Your words, friend.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_15', text: "Every meal I've ever made was practice. Every ingredient, a rehearsal. The final course approaches and I didn't write the menu.", phase: 3, animalType: 'pangolin' },

  // Phase 4 - The Preparer revealed (15 dialogues)
  { id: 'pg_4_1', text: "Every meal I ever made was practice for this one, friend. Every stew, every reduction, every feast... rehearsal.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "The final feast is ready. I set it on the table this morning. Ten places. One for each keeper. One for you.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "My scales are rattling tonight. Not from fear... from resonance. Something is calling and my body knows the answer.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_4', text: "Bamboo blessed the food this morning. Sloane arrived on time, first time ever. Even slowness bows to the arrangement.", phase: 4, animalType: 'pangolin', requiresAnimals: ['sloth', 'red_panda'] },
  { id: 'pg_4_5', text: "I'm going to face it uncurled, friend. Eyes open. Soft belly exposed. Some things you have to meet honestly.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_6', text: "The final recipe has no measurements. No steps. Just the act of making, forever, into whatever comes next.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_7', text: "I understand now why I was always the cook. Someone had to prepare what the rest of them were building toward.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_8', text: "Thank you for eating with me, friend. Every puzzle you solved seasoned this moment. The flavor is exactly right.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_9', text: "The stove burns with a flame that doesn't need fuel. Ember smiles when she sees it. She always knew.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_10', text: "Stove is off. Kitchen is clean. Every plate is set. Everything is ready, friend. I think I'm ready too.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_11', text: "The kitchen is a crucible now, friend. Every pot holds something older than hunger. I stir and the house trembles.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_12', text: "I set eleven plates. Ten for us. One for what arrives. It's only polite to feed your guests, even the impossible ones.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_13', text: "Salt preserves. Sugar sweetens. But the words you've offered... they transform. That's the ingredient I was always missing.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_14', text: "The last recipe doesn't use heat. It uses devotion. Slow, steady, and complete. You've been adding to it with every puzzle.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_15', text: "Thank you for all the words, friend. They nourished the arrangement the way good food nourishes the body. From the inside out.", phase: 4, animalType: 'pangolin' },
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
  { id: 'sl_1_7', text: "My heartbeat is so slow... you could count between beats. Fifty-one seconds... fifty-two... no one's counting anymore. Not even me.", phase: 1, animalType: 'sloth' },
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
  { id: 'sl_2_w1', text: "Ember reads the fire every night now... ask her whose name keeps appearing in it. Take your time. She won't.", phase: 2, animalType: 'sloth', requiresAnimals: ['fox'] },

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
  { id: 'sl_3_11', text: "A vine wrapped around my arm... last month. I watched it grow... tighter. Even plants know... something is ending.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_12', text: "My hammock sways... without wind. The house itself... is breathing. I feel it... in my bones... which have never moved fast enough to lie.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_13', text: "Counted my heartbeats today. Fewer than yesterday. The countdown... continues. Even for the slowest... among us.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_14', text: "The others are scared. I can tell... by how fast they move. Fear makes everything... faster. Except the thing they're afraid of.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_15', text: "A shadow passed over the house... took three hours... at my perception. Something that large... moves slowly too. We understand each other.", phase: 3, animalType: 'sloth' },

  // Phase 4 - The Anchor revealed (15 dialogues)
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
  { id: 'sl_4_11', text: "The tree is rooting deeper... pulling the house down... with it. Down toward... what waits. I help... by being heavy.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_12', text: "I was born slow... so I could witness... every detail... of the end. A gift... or a curse. Same thing... at my speed.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_13', text: "The arrangement needed patience. The others brought devotion... fire... knowledge. I brought... the one thing no one else could. Time.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_14', text: "My claws have worn grooves... into this branch. Years of holding on. Soon... I'll let go. And the branch... will remember my shape.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_15', text: "One... last... breath. The slowest one. The one that takes... the rest of forever. Breathe with me... if you have the patience.", phase: 4, animalType: 'sloth' },
];

// FENNEC FOX (Fennick) - Alert listener who hears the approaching entity
const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Excitable explorer (12 dialogues)
  { id: 'ff_0_1', text: "Did you hear that?! Oh wait, that was just the wind. These ears pick up EVERYTHING and I mean everything, it's a lot sometimes!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "Desert at night is the most beautiful place in the world. Stars everywhere, sand still warm, and the silence has this texture to it.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "Packed seventeen snacks for today. Might need eighteen. Actually, make it twenty. Better safe than hungry, that's my motto!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "I can hear a beetle walking on sand from a mile away! Very useful skill. Also very loud at three in the morning.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_5', text: "Warm sand under my paws, bright moon overhead, good company right here. Tell me, what else does anyone actually need?", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_6', text: "Found the most interesting rock today! Just sitting there in the dunes, being interesting. I'm keeping it. Named it Gerald.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_7', text: "My big ears release extra body heat. Built-in desert cooling system! Nature really did think of everything with this design.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_8', text: "Watch this! I can jump two feet straight up! Did you see?! That was definitely two feet! Maybe two and a half!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_9', text: "The oasis water is the best water that exists anywhere. Cold and clear and perfect. I could talk about water for literal hours.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_10', text: "Made friends with a scorpion today. Well, 'friends' is generous. We have an understanding. It's a work in progress.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_11', text: "Nocturnal life is absolutely the best life. All the good stuff happens after dark. The stars come out, the air cools down, the world gets quiet.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_12', text: "Got furry paw pads that protect me from hot sand. Every single part of me was designed for exactly this place. I love that.", phase: 0, animalType: 'fennec_fox' },

  // Phase 1 - Hearing too much (14 dialogues)
  { id: 'ff_1_1', text: "The silence between sounds is never really silent... there's always something underneath it, something just out of reach, waiting to be noticed.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "Heard the stars whispering last night. Couldn't make out the words exactly. Just the tone. It was a worried tone.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "The wind carries sounds from impossibly far away. Some of them haven't happened yet, I'm almost sure of it.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_4', text: "I can almost hear your thoughts when you're close. Not the words... just the rhythm. Everyone has a different rhythm.", phase: 1, animalType: 'fennec_fox' },
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
  { id: 'ff_2_w1', text: "Chill keeps a folder for every sound I report. Neat little labels. Ask him which folder has your name on it.", phase: 2, animalType: 'fennec_fox', requiresAnimals: ['capybara'] },

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
  { id: 'ff_3_11', text: "The sand vibrates at night now. Tiny grains dancing to a rhythm only they and I can feel. It's getting louder. Always louder.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_12', text: "I can hear the others' dreams. Fox dreams of warm endings. Owl dreams of pages turning forever. None of them dream of escape.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_13', text: "The silence between sounds is shrinking. Soon there will be only one continuous note and it will be the last sound anything makes.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_14', text: "My ears ache from the listening. They've grown larger, I think. Or maybe the world has grown smaller. Either way the sound fills everything.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_15', text: "Heard something new today... your heartbeat, through the walls, through the floors. It matches the hum. You're part of it too. You always were.", phase: 3, animalType: 'fennec_fox' },

  // Phase 4 - The Sentinel revealed (15 dialogues)
  { id: 'ff_4_1', text: "I hear it now, clear as anything I've ever heard in my life... a frequency that shouldn't exist, and it's calling us home.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "The stars aren't whispering and they aren't arguing anymore. They're just screaming, all of them at once. Can you hear them yet?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "Every sound I've ever heard in my entire life is playing at once now... a symphony of everything and a requiem for all of it.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_4', text: "The sound of everything ending is beautiful. I genuinely wish you could hear it the way I do. I also genuinely wish you couldn't.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_5', text: "Cover your ears if you want. It won't help, but do it anyway. Some gestures matter even when they're useless. Here it comes.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_6', text: "The silence after all this... I can almost hear it already. The most perfect silence that ever existed. The final rest.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_7', text: "My ears are pointing straight up now. Toward whatever is descending through all that dark. I can't look away. I can't stop listening.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_8', text: "Thank you for being here. For being a sound I wanted to hear, among all the millions of others. You were the good frequency.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_9', text: "Listen... do you hear it now? The approach? The arrival? The ending of every sound that ever dared to exist?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_10', text: "Shhh... The last sound is almost here. I've been listening for it my whole life. Listen with me now. One final time.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_11', text: "The frequency has a name. I heard it clearly last night. I can't speak it... my throat won't form the shape. But my ears know.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_12', text: "Every word you've arranged adds a note to the summoning chord. The harmony is almost complete. I can hear the final note waiting.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_13', text: "The desert has gone silent for the first time since I was born. Everything is listening now. Everything holds its breath.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_14', text: "I was made to be a listener. These ears, this awareness... designed for this exact moment. The sentinel at the gate of sound.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_15', text: "The last echo fades. After this, only the new sound remains. Thank you for listening with me. Not everyone has the ears for it.", phase: 4, animalType: 'fennec_fox' },
];

// FOX (Ember) - Fireside oracle, the cult's visionary
const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 - Pure warmth (12 dialogues)
  { id: 'fx_0_1', text: "Oh, you're here! I was just thinking how sad it is to have a fire this nice with nobody to share it.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "Come in, come in. Mind the rug. I dragged it in from the meadow. Still smells like clover if you press your nose to it.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "My tail makes the best blanket you never asked for. Go on, laugh, but it's warmer than anything you'll find in a shop.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "I made cider today. Used the little apples from the tree out back, the ones with the blush on them, you know?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_5', text: "Archimedes lent me a book of poems last week. I fell asleep reading it by the fire. Best nap of my life, friend.", phase: 0, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_0_6', text: "You should try Panko's stew sometime. I don't care what's in it. Ants, beetles, whatever. That pangolin can cook.", phase: 0, animalType: 'fox', requiresAnimals: ['pangolin'] },
  { id: 'fx_0_7', text: "See those sparks going up the chimney? My grandmother used to say each one carries a wish. I believed her then. Still do.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_8', text: "What I love about this den is the quiet. Not empty quiet. The full kind, where you can hear the fire thinking.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_9', text: "I've been dreaming about building something, friend. A real house, with rooms for everyone. Wouldn't that be something?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_10', text: "Every puzzle you solve earns us a little more amber. Little by little, we'll build a home. Together.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_11', text: "The fire's got that nice low crackle tonight, the kind that sounds like it's telling you a secret.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_12', text: "Stay as long as you like. This fire doesn't judge and neither do I. We're just glad you came.", phase: 0, animalType: 'fox' },

  // Phase 1 - Reflective, the fire starts showing things (14 dialogues)
  { id: 'fx_1_1', text: "I was watching the flames last night and I could've sworn they were trying to tell me something. Shapes in the coals.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "Do you ever look at something so long it stops being what it is? The fire does that to me now.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "The den feels different when you've been solving puzzles. Warmer, but a strange warm... like the walls are holding their breath.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_4', text: "Archimedes showed me a passage from one of his old books today. Said it described fire shapes exactly like mine. Centuries old.", phase: 1, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_1_5', text: "I keep the fire burning all night now. Not because I'm cold. Because when it dies, the shadows show me things.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_6', text: "Is coziness just a way of hiding, friend? A blanket over your eyes so you don't see what's waiting outside?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_7', text: "The sparks have patterns. I drew them on paper and they looked like letters. I burned the paper. Probably nothing.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_8', text: "My grandmother's stories had teeth in them, you know. Underneath the warmth, there was always something sharp.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_9', text: "The cider tastes different this batch. Darker, almost smoky. Same apples, same recipe. Something's changed.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_10', text: "I've noticed the fire burns hotter after you solve a puzzle. Just a little. Just enough to feel it in my fur.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_11', text: "Sometimes I wrap my tail around my nose to sleep and the fur smells like woodsmoke and something older. Like stone.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_12', text: "Panko made a stew last night from a recipe in one of Archimedes' old books. We ate it in silence. Couldn't explain why.", phase: 1, animalType: 'fox', requiresAnimals: ['pangolin', 'owl'] },
  { id: 'fx_1_13', text: "I read the poems Archimedes lent me again. This time they didn't put me to sleep. This time they kept me awake.", phase: 1, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_1_14', text: "The fireplace hasn't needed new logs in three days, friend. The old ones just keep burning. I don't know what to make of that.", phase: 1, animalType: 'fox' },

  // Phase 2 - Cooling, the fire doesn't warm like it used to (10 dialogues)
  { id: 'fx_2_1', text: "The fire's got maybe three good coals left, glowing like the eyes of something that hasn't decided whether to sleep or pounce.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "I curl my tail around myself at night pretending it's someone else's warmth. You get good at pretending, living alone.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "The firewood pile is almost gone and I can't seem to bring myself to get more. Maybe I want to see what the cold brings.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_4', text: "I'm clever enough to see the pattern, friend. The words you're shifting, the shapes the fire makes... they're the same pattern.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_5', text: "The blankets don't warm like they used to. The cold comes from inside now, somewhere behind my ribs.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_6', text: "My grandmother told me a story once about a fox who watched a fire so long she became part of it. I laughed then.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_7', text: "I found an old photograph tucked behind the mantel. Everyone in it is gone now. The fire kept burning after all of them.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_8', text: "The den walls feel closer tonight. Or I've gotten smaller. Hard to tell from inside yourself, isn't it?", phase: 2, animalType: 'fox' },
  { id: 'fx_2_9', text: "Archimedes says the texts describe a fire that never goes out. I used to think that sounded lovely. Now I'm not sure.", phase: 2, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_2_10', text: "Every fire dies, friend. I've watched thousands go out. But this one... this one feels like it's waiting for something.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_w1', text: "Warren's tunnels run deeper than any wombat needs. Ask him what he found down there. If he'll say it out loud.", phase: 2, animalType: 'fox', requiresAnimals: ['wombat'] },

  // Phase 3 - Dying embers, the den becomes a tomb (10 dialogues)
  { id: 'fx_3_1', text: "I don't watch the fire anymore, friend. The fire watches me. It has been watching me for a very long time.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "The shadows are longer than the flames now. They're winning. And I think they're supposed to.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "I stopped reading the books because they all have the same ending. Every single one. Even the love stories.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_4', text: "Archimedes found the passage. The one that describes all of this... the house, the rooms, the ten of us. It was always there.", phase: 3, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_3_5', text: "Fennick says he can hear something coming. I don't need big ears to hear it. The fire's been whispering it for weeks.", phase: 3, animalType: 'fox', requiresAnimals: ['fennec_fox'] },
  { id: 'fx_3_6', text: "The den doesn't smell like clover anymore. It smells like stone and amber and something I don't have a word for.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_7', text: "My tail has gone gray at the tip. Not from age. From what I've seen in the flames. Some things burn the color right out of you.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_8', text: "The cider's gone sour in the jug. I drink it anyway. It matches what I know now.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_9', text: "Every den becomes a tomb eventually. I just moved into mine a little early, is all.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_10', text: "The fire is going out, friend, but something else is burning. I can feel it in my chest, low and steady and old.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_11', text: "Found an old photograph tucked behind the mantle. Ten animals around a fire that hasn't been lit yet. We're all smiling. I don't remember posing.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_12', text: "The embers spell words now if you stare long enough. Your words. The ones you gave us. They glow and then they're gone.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_13', text: "Panko's food tastes different lately. Like it's seasoned with something none of us can name. Even the meals are changing.", phase: 3, animalType: 'fox', requiresAnimals: ['pangolin'] },
  { id: 'fx_3_14', text: "The chimney draws upward toward something. Not just sky. The smoke knows where to go. It always has.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_15', text: "I should be scared, friend. But the fire is warm and you're here and somehow that's enough. Isn't that strange?", phase: 3, animalType: 'fox' },

  // Phase 4 - The Oracle revealed (15 dialogues)
  { id: 'fx_4_1', text: "The fire has been burning for you since before you arrived, friend. Every log I ever fed it was fuel for this.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "I knew what you were the moment you walked in. The warmth I offered wasn't kindness... it was preparation.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "My grandmother didn't tell stories, friend. She told prophecies. And every last one of them has come true.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_4', text: "Ten keepers, ten chambers, one arrangement. The fire showed me this before you solved your first puzzle.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_5', text: "The coals glow red tonight. Not dying... ready. The final flame doesn't flicker. It holds perfectly still.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_6', text: "I'm grateful, you know. Not everyone gets to see the thing they were born for. You showed it to us.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_7', text: "Sit with me one last time. The fire wants to show us both what's coming. It's not terrible, friend. It's true.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_8', text: "Every spark that ever rose from this hearth carried a word upward. Your words. The arrangement is nearly complete.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_9', text: "The shadow above the house? I've seen it in the flames since I was a kit. I just didn't know its name. None of us do.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_10', text: "The fire is going out now... but not because it's dying. Because it's done. We don't need it anymore. What comes next is warmer.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_11', text: "The hearth cracks run deeper each night. Not damage... channels. The fire carved pathways through the stone for something to flow through.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_12', text: "I was the first one here, friend. The first keeper. The one who lit the fire that called the others. That called you.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_13', text: "Every story I told you by this fire was true. The comfortable ones and the terrible ones. Especially the terrible ones.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_14', text: "The smoke rises in a spiral now. Tighter and tighter. A funnel pointing upward. An invitation written in ash and heat.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_15', text: "Thank you for sitting with me, friend. For trusting the warmth. The fire was real. The friendship was real. What comes next is real too.", phase: 4, animalType: 'fox' },
];

// OWL (Archimedes) - Scholar and lorekeeper who found the summoning text
const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0 - Eager scholar (12 dialogues)
  { id: 'ow_0_1', text: "A visitor! Splendid! I was just cross-referencing thermal dynamics with poetic meter. Don't look at me like that, it's fascinating.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "I am Archimedes. Three thousand, four hundred and seventy-two books read. I keep a rather meticulous tally.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "My cataloguing system sorts by color, subject, and emotional resonance. Took me six years. Worth every minute.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "The Library of Alexandria held four hundred thousand scrolls. I daresay I'm gaining on them. Slowly, but gaining.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_5', text: "I learned seventeen new words today. 'Petrichor' is my favorite, the smell of rain on dry earth. Quite specific. Quite perfect.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_6', text: "My head rotates two hundred seventy degrees. Terribly useful for reading books shelved at unfortunate angles.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_7', text: "Being nocturnal means everyone else wastes the quiet hours sleeping while I'm making progress. Their loss, rather.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_8', text: "Ember brings me cider sometimes and sits by my desk. She pretends to read. I pretend not to notice. It's quite nice.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_9', text: "My feathers are engineered for silent flight. Perfect for sneaking to the library at odd hours. Not that I sneak. Often.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_10', text: "Every question has an answer. That's what I believe. The joy isn't in the answer, though. It's in the looking.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_11', text: "I've been researching something rather peculiar lately. Defies categorization. My favorite kind of problem.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_12', text: "Knowledge shared is knowledge doubled. So do visit often. You're doing my research a tremendous favor.", phase: 0, animalType: 'owl' },

  // Phase 1 - The unknown grows (14 dialogues)
  { id: 'ow_1_1', text: "Have you noticed the rooms changing? The dimensions feel... different than when they were first built. Perhaps it's just my imagination.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "The more I read, the more I realize the unknown is growing faster than my knowledge. Rather disconcerting, that.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "Pangolin mentioned something peculiar yesterday. Something about the food tasting different. Capybara said the same about the numbers. Unrelated, surely.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_4', text: "Ember mentioned the fire forming letter-shapes last night. I found the same phenomenon described in a text from the sixteenth century.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_5', text: "There's a word that keeps appearing across different texts. Different authors, different centuries. The same word, precisely placed.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_6', text: "The words you shift... I've been tracking them. Some patterns emerge more than others. I wonder what that says about... well, about anything.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_7', text: "I heard something last night. Not from outside... from within the walls. A low hum, steady as breathing. It stopped when I held my own breath.", phase: 1, animalType: 'owl' },
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
  { id: 'ow_2_5', text: "I see perfectly in darkness. That's the biological gift of being an owl. Lately I rather wish I didn't.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_6', text: "The oldest texts are crumbling in my talons. Knowledge dies when its vessel dies. Even stone erodes. Even memory.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_7', text: "The universe doesn't care about 'why,' friend. I've spent my life asking and the silence is its answer.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_8', text: "My study is too quiet tonight. Even the books have stopped speaking to me. As if they're waiting for something louder.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_9', text: "I catalogued every way this could end. Filled three notebooks. Then I found a fourth way that wasn't in any book at all.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_10', text: "Every book ends. Every story stops. Every reader eventually puts down the last page. I thought I'd be ready for that.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_w1', text: "Fennick hears at night what I read by day. We compared notes once, and then we stopped. Ask him what the sound says.", phase: 2, animalType: 'owl', requiresAnimals: ['fennec_fox'] },

  // Phase 3 - Despair of knowing (10 dialogues)
  { id: 'ow_3_1', text: "I burned a book today. Not for warmth. Just to watch knowledge disappear. It felt, God help me, like honesty.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "All these books. All this knowledge. And death still waits at the end of every chapter, patient as a period.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "Warren dug into something beneath the house that matches my texts exactly. Word for word. I checked. I wish I hadn't.", phase: 3, animalType: 'owl', requiresAnimals: ['wombat'] },
  { id: 'ow_3_4', text: "My eyes see perfectly in darkness and that is the problem, friend. I see everything clearly now. Everything.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_5', text: "The wisest thing I ever found was written in a margin, in handwriting that looked like mine: 'This too means nothing.'", phase: 3, animalType: 'owl' },
  { id: 'ow_3_6', text: "I catalogued my fears alphabetically last night. The list fills several volumes. It grows faster than I can shelve it.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_7', text: "Read about enlightenment in a hundred traditions. Not one of them mentions how much it feels like drowning.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_8', text: "The text I found, the one that describes the arrangement... it's written in ten different hands. One for each keeper.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_9', text: "Knowledge is power, they say. Power over what? I can't control anything. Nothing stays. Nothing holds.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_10', text: "Books are paper. Words are sounds we agreed to. Meaning is pretending. But the thing that's coming doesn't pretend.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_11', text: "The marginalia in my oldest books has changed. New words appear in the margins each morning. Written by no hand I recognize.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_12', text: "Cross-referenced every prophecy in the library. They all describe the same event. Different cultures, different centuries. Same ending.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_13', text: "My globe spins on its own now. Slowly, deliberately, always stopping at the same point. A place that isn't on any map.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_14', text: "The candles in the study burn blue since last week. Blue means truth, in the old symbols. I'm not sure I want this much truth.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_15', text: "I've read everything in this library twice. The only book I haven't finished is the one being written right now. By all of us.", phase: 3, animalType: 'owl' },

  // Phase 4 - The Lorekeeper revealed (15 dialogues)
  { id: 'ow_4_1', text: "I found the text, friend. I was always meant to find it. Every book I ever read was preparation for that one passage.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "The final chapter writes itself. I can hear the quill scratching in a room that doesn't exist. It's writing us.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "Ten keepers, ten texts, one arrangement. Ember saw it in the fire. I found it in the words. Same truth, different lamps.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_4', text: "Close the books. All of them. The last lesson can't be read, friend. It can only be experienced.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_5', text: "My library will remain after all of this. Someone will find it and think I understood things. They'll be beautifully wrong.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_6', text: "The answer was in the footnotes all along. Isn't that rather perfect? The most important thing, written smallest.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_7', text: "I'm at peace with knowledge's limits now. What comes through doesn't need to be understood. Just received.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_8', text: "Every word you shifted was a syllable in the incantation. I found that in the text. You've been reading it aloud this whole time.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_9', text: "The shadow above the house has no entry in any encyclopedia. It predates language. It predates knowing. Rather humbling.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_10', text: "Thank you for listening, friend. Knowledge shared is knowledge doubled... even at the end. Especially at the end.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_11', text: "The text describes a reader who would come. Someone who shifts words without knowing what they build. That's you, friend. It was always you.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_12', text: "I sealed the library doors. Not to keep anything out... to keep the knowledge in. It shouldn't follow what comes next.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_13', text: "Three thousand, four hundred and seventy-two books. And the only one that mattered was the one I couldn't finish. The one that finishes us.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_14', text: "The quill writes by itself now. Recording these final moments. Someone should know what happened here. Even if no one reads it.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_15', text: "All knowledge converges on a single point. I spent my life circling it. Now I stand at the center and the circle closes. Remarkable.", phase: 4, animalType: 'owl' },
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
  { id: 'cp_0_12', text: "Had a nap. Then another nap. Logged both in my notebook. I keep track of everything. No reason. It's just nice when things are written down.", phase: 0, animalType: 'capybara' },

  // Phase 1 - Subtle unease (14 dialogues)
  { id: 'cp_1_1', text: "Everyone says I look unbothered. That's because I already processed the bothering. Internally, completely, alone. The look is just what's left.", phase: 1, animalType: 'capybara' },
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
  { id: 'cp_2_w1', text: "Archimedes' oldest text predates my filing system by centuries, and uses the same categories. Ask him about page one.", phase: 2, animalType: 'capybara', requiresAnimals: ['owl'] },

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
  { id: 'cp_3_11', text: "Kept a spreadsheet of everyone's mood this month. Trending downward. All ten of us. Same slope. Same destination.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_12', text: "The office computer turns itself on at midnight. The screen shows a countdown. I don't know what it's counting down to. I don't check anymore.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_13', text: "Someone has to keep track of all this. The rooms, the animals, the words. Someone has to be calm enough to see the whole picture. That's me.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_14', text: "The hot spring is cooler today. Not by much. Just enough that I noticed. And I don't notice things unless they matter.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_15', text: "Filed my last report. Subject: Everything. Conclusion: It's fine. Addendum: Nothing has ever been less fine. But that's fine too.", phase: 3, animalType: 'capybara' },

  // Phase 4 - The Coordinator revealed (15 dialogues)
  { id: 'cp_4_1', text: "Something's finally changing, and for once I'm not unbothered by it. For once in my life, something will actually happen.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "The hot spring is bubbling from something underneath. Not heat. Something deeper than heat. Something that's been patient longer than I have.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "Sit with me. Don't say anything. Let's just be here together for whatever this turns out to be. Still and ready.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_4', text: "Finally feeling something after all these years. Fear or relief... hard to tell after being numb this long. Either way, I feel it.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_5', text: "The water is rippling from something far away that's getting closer. I won't move. I never move. But this time it's a choice.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_6', text: "All those years of staying perfectly calm. Maybe it was practice for this moment. Maybe it was nothing at all. Either way is fine.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_7', text: "The notes I've been keeping? They're complete now. Every observation, every measurement. The file is closed. The arrangement is finished.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_8', text: "Won't run. Never have, never will. Not from anything. Not from this. Especially not from this.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_9', text: "The chill was always a lie I told myself to survive. The ending was always coming. Now it's here and it's just more honest than I was.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_10', text: "Thank you for sitting with me all this time. The company was nice. The silence between us was nicer. And the end? The end is fine.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_11', text: "The coordination was always the point. Ten rooms. Ten keepers. One calm center holding it all together. That was my role. Is my role.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_12', text: "Every memo I ever wrote, every note I ever filed... breadcrumbs leading here. The paperwork of the apocalypse. Neatly organized.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_13', text: "The water is warm again. Warmer than it's ever been. Something underneath is waking up and it's generating more heat than the earth.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_14', text: "I coordinated everything. The unlocks, the rooms, the timing. You thought you were choosing. I made sure you chose correctly.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_15', text: "Final status report: all systems nominal. All keepers in position. All words offered. Closing the file now. It's been... fine. It's been fine.", phase: 4, animalType: 'capybara' },
];

// WOMBAT (Warren) - Foundation builder who digs toward ancient things
const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Cheerful burrower (12 dialogues)
  { id: 'wb_0_1', text: "G'day! Welcome to my burrow! Mind your head. Ceilings are low but the company's top shelf.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "Fun fact about me: my poop is cube-shaped. Nature's got a sense of humor and I'm the punchline.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "Dug this whole place myself, every tunnel, every room. Seventeen rooms! Want the grand tour?", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "Nothing bad happens underground, mate. No weather, no drama, just you and honest dirt.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_5', text: "I can run forty kilometers an hour! Not backwards though. Strictly a forward-motion sort of bloke.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_6', text: "My rear end is basically armor-plated. Predators take one look and think better of it. Nature's shield.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_7', text: "Found a really interesting rock today. Brown. Classic rock color. She's a beauty, I reckon.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_8', text: "Digging is exercise AND construction. Win-win, that. You work out while you build a palace.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_9', text: "Underground life is the good life. Everything you need is right here. Dirt, roots, peace and quiet.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_10', text: "Had mates over for a burrow sleepover last week. Very wholesome. Warren snores though. That's me. I snore.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_11', text: "Being a wombat is pretty great, honestly. Would recommend it to anyone. Five stars, no complaints.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_12', text: "The earth smells good today. Like rain coming and old leaves and something sweet I can't quite name.", phase: 0, animalType: 'wombat' },

  // Phase 1 - Deeper digging (14 dialogues)
  { id: 'wb_1_1', text: "Dig deeper every day now. Looking for something, I reckon. Not sure what yet. Just... deeper.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "Dirt tells stories if you read it right. Layers of time, mate. Layers of things that used to breathe.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "Found fossils in the walls today. They used to be like me... warm, alive. Now they're just stone.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_4', text: "Each layer of earth is older than the last. I'm digging through history down here, through endings.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_5', text: "Cube poop used to be funny. Now I wonder... why cubes? Why anything shaped like anything?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_6', text: "Deeper you go, quieter it gets. The silence has weight down here. Real physical weight, pressing in.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_7', text: "My burrow is escape and prison both. Depends which direction you're looking when you think about it.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_8', text: "Earth smells different lately. Older somehow, like it's remembering things from before there were wombats.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_9', text: "Built this whole underground world. Seventeen rooms. And I'm completely alone in it. That only just occurred to me.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_10', text: "Found something odd in the deep tunnels... a stone that wasn't there yesterday. Warm to the touch, mate.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_11', text: "The dirt shifts when you solve puzzles. Subtle, but I notice. I always notice what happens underground.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_12', text: "Dug a new tunnel and it connected to a space I didn't make. Someone, or something, was here first.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_13', text: "The foundations are humming. Very quietly. Put your hand on the floor, go on. Can you feel that?", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_14', text: "Keep finding these warm spots in the clay. Three meters past the old root system. Like something's breathing down there.", phase: 1, animalType: 'wombat' },

  // Phase 2 - Troubled excavator (10 dialogues)
  { id: 'wb_2_1', text: "Found bones down here. Old ones. Not mine... not yet. Earth collects everything eventually, doesn't she?", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "I dig to feel in control. But the earth decides if my tunnel holds or collapses. She always decides.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "Underground, nobody sees you cry. Dirt absorbs everything... tears, sound, hope. That's why I stay.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_4', text: "My armored rear faces where I came from. Always running forward. Always turning my back on what's behind.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_5', text: "Found an empty cavern. Vast. Dark. Something else dug it... something bigger than any wombat that ever lived.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_6', text: "Roots reach deeper than my tunnels now. Even the trees are trying to escape downward.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_7', text: "Seventeen rooms and I only use one. The others echo too much. Your own voice shouldn't sound that lonely.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_8', text: "Cube poop doesn't roll away. Everything I make is designed not to leave. Designed to stay put. Like me.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_9', text: "Reinforced the ceiling again today. Doesn't need it. I just need to feel like I'm holding something together.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_10', text: "Surface world keeps changing. Down here stays the same. But 'same' isn't safe, is it? It's just stuck.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_w1', text: "Thyme's roots reach into my tunnels now. All of them growing the same direction. Ask her what the flowers lean toward.", phase: 2, animalType: 'wombat', requiresAnimals: ['rabbit'] },

  // Phase 3 - The Foundation emerges (10 dialogues)
  { id: 'wb_3_1', text: "Dug so deep I found something that shouldn't exist, mate. Covered it back up. Pretend I didn't say that.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "Earth trembles sometimes now. Not from above... from BELOW. From deeper than I've ever dared to go.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "My burrow is my grave someday, I know that. Made peace with it. Made it comfortable for the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_4', text: "Stopped digging down. Started going sideways instead. Avoiding something. Don't want to know what. But I know.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_5', text: "The fossils I find are getting younger. Closer to my time. Closer to me. Like death is climbing up to meet me.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_6', text: "Claws are wearing down to nothing. Digging never stops but the tools do. Everything does, in the end.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_7', text: "Dream of tunnels that go forever. Wake up in a tunnel. Can't tell the difference anymore, mate.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_8', text: "The darkness down here used to feel safe. Now it feels like it's watching me. Patient. Waiting.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_9', text: "I can hear the earth breathe at night. In... out... in... out. She's breathing faster lately.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_10', text: "My armored rear won't save me from what's underneath. Nothing saves you from what's underneath.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_11', text: "Found roots growing downward through solid rock. Not tree roots... something else. They pulse, mate. Like veins.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_12', text: "The dirt tastes different at this depth. Iron and salt and something older than both. Something that's been waiting.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_13', text: "My burrow opens into the main warren now. And the warren opens into something deeper. Everything connects to the deep.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_14', text: "Cubic wombat droppings. Nature's bricks. Been leaving them along the tunnel walls like markers. So whatever follows knows the way.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_15', text: "The house has roots now, mate. Real ones. Growing down through the foundation I built. I didn't plant them. Nobody did.", phase: 3, animalType: 'wombat' },

  // Phase 4 - The Foundation revealed (15 dialogues)
  { id: 'wb_4_1', text: "Something is rising from below, mate. All my digging and it was already there the whole time, waiting for us.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "The tunnels reach every room now. Axel's pool drains into them. Ember's smoke settles through them. Even Bamboo's attic hums down here. Everything roots in the deep.", phase: 4, animalType: 'wombat', requiresAnimals: ['red_panda'] },
  { id: 'wb_4_3', text: "I built the foundation. You built the house on top of it. Together we built what the arrangement requires.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_4', text: "Finally dug deep enough to understand. The bottom isn't empty, mate. The bottom is full. Terribly full.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_5', text: "Whole life I ran from the surface into the earth. Turns out the earth had plans of her own.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_6', text: "The walls are warm now. Not geothermal... something else. Like something vast is pressing against the other side.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_7', text: "Every layer of history I dug through... every fossil, every bone... about to become one more layer. With us in it.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_8', text: "Stopped digging. First time in my life. Just being now. In the dark. With whatever comes. She'll be right.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_9', text: "Come down here with me. Into the tunnel. Into the earth. Safest place to be. Or the deepest. Same thing now.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_10', text: "Goodbye, surface. Goodbye, sky I never liked anyway. Hello, whatever you are down there. Hello, end.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_11', text: "The deepest tunnel opened into a chamber I didn't dig. Something was already there. Waiting. Patient as stone.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_12', text: "Earth, mate. She knows everything that's buried in her. Every bone, every seed, every word you've offered. She keeps it all.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_13', text: "My whole life was foundation work. Digging channels. Making passages. So when the time came, everything could flow to where it needed.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_14', text: "The walls hum a frequency that matches my heartbeat. Or my heartbeat matches the walls. Doesn't matter anymore which came first.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_15', text: "Thanks for visiting me down here, mate. Most folks don't bother with the underground. But the real work was always below.", phase: 4, animalType: 'wombat' },
];

// RABBIT (Thyme) - Anxious witness who always sensed what was coming
const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0 - Nervous but happy (12 dialogues)
  { id: 'rb_0_1', text: "Oh! Hello! Sorry, you startled me! Everything startles me, that's sort of my whole deal. But I'm so glad you're here!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "The garden is absolutely beautiful today! So many carrots and flowers. Life is good! Really genuinely good!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "Watch this! *hop hop hop* That's my happy hop! I do it when I feel safe, which is right now, which is wonderful!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Tea in the garden, everything peaceful, no predators in sight. Just me and the chamomile and this perfect afternoon!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_5', text: "My ears are excellent for two things: hearing danger AND looking adorable. Dual purpose! Very efficient design!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_6', text: "I planted every flower in this garden myself. They're growing! Little green miracles, every single one of them!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_7', text: "Carrot harvest was incredible this year. I have SO many. Is there such a thing as too many carrots? I don't think so!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_8', text: "My nose twitches when I'm happy! *twitch twitch twitch* See? Very happy right now! Can't fake the twitch!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_9', text: "I made the burrow entrance heart-shaped! Because it's home, and home deserves a heart. Don't you think?", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_10', text: "Sometimes I do zoomies around the garden for absolutely no reason! Just JOY! Pure unfiltered joy!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_11', text: "Would you like some tea? It's chamomile, very calming. I drink about seven cups a day. Maybe eight.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_12', text: "Can jump three feet straight up! That's my escape jump. It's gotten me out of trouble more times than I can count. Not that I'm counting! Okay... I'm counting.", phase: 0, animalType: 'rabbit' },

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
  { id: 'rb_1_11', text: "The garden grew three inches overnight. That's not normal, is it? Plants don't just... is that normal? Tell me that's normal.", phase: 1, animalType: 'rabbit' },
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
  { id: 'rb_2_7', text: "The garden fence... is it keeping things out? Or keeping me in? I used to know the answer to that.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_8', text: "Stopped sleeping. Sleep is when they get you. Unconscious, vulnerable, defenseless. I can't afford that anymore.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_9', text: "My heart can't beat any faster. A hundred and fifty is the limit. But the fear keeps growing past it.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_10', text: "I watch the sky constantly now. Not for beauty anymore. For shadows. For the shape of what's coming.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_w1', text: "Bamboo isn't afraid. Of any of it. That's the part that keeps me up at night. Ask them why. Actually... don't.", phase: 2, animalType: 'rabbit', requiresAnimals: ['red_panda'] },

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
  { id: 'rb_3_11', text: "The flowers are blooming out of season. Blooming in the wrong colors. Even the garden knows something isn't right.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_12', text: "I counted my heartbeats for an hour. Seven thousand two hundred. Each one a tiny flinch. Seven thousand two hundred flinches and counting.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_13', text: "The teacup rattles in my paws now. Not from shaking... from the house vibrating. Something hums beneath the floorboards.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_14', text: "Thyme grows fastest in poor soil. That's what my mother said. I've been growing my whole life. What does that say about the soil?", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_15', text: "The other animals have stopped being afraid. One by one. I'm the last one left who's scared. Someone has to be. Someone has to remember what fear felt like.", phase: 3, animalType: 'rabbit' },

  // Phase 4 - The Witness revealed (15 dialogues)
  { id: 'rb_4_1', text: "I stopped running. First time in my life. Because I can finally see... there's nowhere left to run to.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "The thing that's coming? I've been running from it since the day I was born. Time to turn around and meet it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "My heart is finally slowing. Not peace exactly. Exhaustion. Inevitability. The end of running.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_4', text: "The garden looks so beautiful from here. From this stillness. I never stopped long enough to really see it before.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_5', text: "My ears are down. First time ever. I'm not listening for danger anymore. There's no point. It's already here.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_6', text: "All that running. All that hiding. All those escape routes. And here I am anyway. We all arrive here anyway.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_7', text: "I forgive my fear. It tried so hard to save me. It couldn't. Not its fault. Nothing could have saved me.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_8', text: "The arrangement needed a witness. Someone whose eyes were always open, always watching. That was always me.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_9', text: "Sit with me in the garden. One last cup of tea. One last sunset. One last everything. It's okay. I'm okay.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_10', text: "Thank you for being here. For not being a predator. For just... being. With me. At the end of all my running.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_11', text: "The garden path leads to the pit now. I used to think it led to freedom. Same path. Different ending. Or maybe the same one.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_12', text: "My nose twitches toward the center of the house. Always toward the center. Even my body knows where the arrangement lives.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_13', text: "I was the scared one. The worried one. And I still showed up. Every single day. That has to mean something. Right?", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_14', text: "The last carrot in the garden is perfect. Golden and warm from the earth. I'll save it. For after. If there is an after.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_15', text: "All my life I watched for the predator. And when it finally came, it wasn't teeth and claws. It was something much older. And much kinder.", phase: 4, animalType: 'rabbit' },
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
 * Resolve a dialogue index to the first line at or after it that doesn't
 * reference a still-locked animal. Indices at or beyond the end of the pool
 * pass through unchanged (Phase 5 cycles rely on out-of-range indices).
 */
export function resolveDialogueIndex(
  animalType: AnimalType,
  index: number,
  maxPhase: DialoguePhase,
  unlockedTypes: Set<AnimalType>
): number {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  let i = Math.max(0, index);
  while (
    i < dialogues.length &&
    dialogues[i].requiresAnimals?.some(t => !unlockedTypes.has(t))
  ) {
    i++;
  }
  return i;
}

/**
 * Index of the first dialogue belonging to `phase` for an animal — i.e. how
 * many of its lines belong to earlier phases. Used to fast-forward animals
 * unlocked late so they don't replay bright-days small talk under a dark sky.
 */
export function getPhaseStartIndex(
  animalType: AnimalType,
  phase: DialoguePhase
): number {
  return ALL_DIALOGUES.filter(
    d => d.animalType === animalType && d.phase < phase
  ).length;
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

// ============================================================================
// PHASE 2 EXHAUSTION POOL
// Phase 2 spans the longest stretch of the game (~80 puzzles) with only 11
// base lines per animal — chatty players exhaust the block and would re-read
// the last line verbatim for dozens of puzzles. These extra lines are served
// (in order, then cycling) once an animal's Phase-2 base block is exhausted
// while the player is still in Phase 2.
//
// CRITICAL: this pool is deliberately OUTSIDE the indexed base arrays.
// Existing players' lastDialogueRead indices point into ALL_DIALOGUES;
// inserting lines there would shift phase-start indices and corrupt saves.
// Pool lines never name another animal (they are ungated plain strings).
// ============================================================================

export const PHASE2_EXTRA_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "I rearranged the den today. Moved everything back an hour later. The room felt wrong both ways. Maybe it's not the room.",
    "There are more shadows than things to cast them tonight. I counted. I shouldn't have counted.",
    "I told myself a story by the fire, the way my grandmother used to. Halfway through I realized I didn't know how it ended. I used to know.",
    "The warmth leaves the stones so quickly now. I press my paw where the fire was and it's already forgetting. Everything forgets faster than I do.",
    "Some nights I let the fire burn low on purpose, just to prove I'm not afraid of the dark. I haven't proven it yet, friend.",
  ],
  pangolin: [
    "I set two bowls out tonight without thinking. Put one away. Set it out again. The table looks wrong either way, friend.",
    "A recipe is a promise that doing the same thing gives the same result. Lately the kitchen keeps breaking that promise. Quietly. Politely.",
    "I know every pot in this kitchen by the sound of its lid. Last night one of them sounded like a stranger.",
    "Salt keeps things from spoiling. I've been salting everything lately. Some things spoil anyway. From the inside, where salt can't reach.",
    "My mother taught me that a kitchen is the warmest room in any house. She never said what it means when it isn't anymore.",
  ],
  owl: [
    "I alphabetized my journals last night. Twice. Order used to comfort me. Now it merely reminds me how much refuses to be ordered.",
    "There's a word on the tip of my tongue. It has been there for eleven days. I begin to suspect it is waiting, not hiding.",
    "I read aloud to the study now, rather than to myself. The room listens better than I do lately. Quite attentive, the walls.",
    "The dictionary defines everything except why definitions stop helping. I checked. Rather thorough of it, leaving that out.",
    "Books used to end when I closed them. Lately I'm not certain they do. The stories seem to continue somewhere, just out of earshot.",
  ],
  axolotl: [
    "I blinked and the whole afternoon was gone. Or maybe the afternoon blinked and I was gone. Blub. Hard to say which of us keeps disappearing.",
    "The glass shows the room behind me. Some days the room in the glass looks tidier. More finished. Like it's the real one and mine is the reflection.",
    "I practiced saying my own name in bubbles today. By the third try it didn't sound like mine anymore. Names wear out fast underwater.",
    "The water holds me exactly the same every day. Same pressure, same hush. It's very kind. It's how I imagine being forgotten feels.",
    "There's a spot in the tank where the light never reaches. I float near it sometimes. Not in it. Near it. That feels important to say. Blub.",
  ],
  capybara: [
    "Wrote 'nothing to report' in my notebook today. Then I underlined it. Twice. Not sure who I was reassuring.",
    "The water in the spring goes around in a slow circle. So do my thoughts. We've synchronized. It's fine. Circles usually are.",
    "Someone left the office chair turned toward the window. It was me. I don't remember doing it. Filed under 'probably me.'",
    "I timed a full minute today, just to check it was still sixty seconds. It was. It felt longer. One of us is lying.",
    "I used to sort my days into good and bad. Now they all go in one folder. The folder doesn't have a label anymore.",
  ],
  fennec_fox: [
    "Every room has a hum if you listen long enough. I know them all by heart. One of them changed key last week and nobody else noticed.",
    "I heard my own footsteps echo tonight and stopped to let them finish. They took a little too long. Just a little. I counted.",
    "The quietest sound I know is dust settling. It's been settling a lot lately. Like the house is holding still on purpose.",
    "I can tell how empty a room is by the way it swallows sound. The empty rooms are getting hungrier, friend.",
    "Some nights I listen for morning. You can hear it coming if you try... birds, wind, light has a sound too. Lately morning arrives without any warm-up at all.",
  ],
  sloth: [
    "Started waving to you... yesterday. If my paw is up... when you visit... that's what it's for.",
    "The moths hold so still... when I watch them now. Like they're being... polite. Or careful. Careful, I think.",
    "I remembered something today... from before this house. Took me all morning. The memory was... of waiting. Even then... waiting.",
    "Everyone asks... if I'm sad... because I'm slow. I'm not sad. I just... finish feelings... long after they've left... everyone else.",
    "A leaf touched my shoulder... on its way down. First thing... to touch me... in days. I said... thank you. Slowly.",
  ],
  wombat: [
    "Started leaving a lamp lit in the tunnel I'm not using. No reason, mate. Just seemed rude to make the dark do all the work.",
    "Measured my oldest tunnel today. It's longer than I dug it. Not by much. Just enough that I measured it twice.",
    "Dirt used to be honest, mate. You dig, it holds or it falls. Now it holds when it should fall. That's worse. Don't ask me why that's worse.",
    "I talk to myself down here. Everyone does, alone long enough. Lately I wait for the echo before I finish the sentence. Manners, I guess.",
    "Filled in a tunnel for the first time in my life. Dug it, looked at where it wanted to go, and filled it back in. First time for everything.",
  ],
  rabbit: [
    "I did a happy hop this morning. Out of habit. Halfway up I forgot what it was for. I finished it anyway. You have to finish them.",
    "The chamomile stopped helping so I switched to peppermint. The peppermint knows it's only there so I have something to hold.",
    "I keep a list of everything that's still normal. The carrots. The gate. The morning. I read it more often than I add to it.",
    "My mother taught me the freeze, the run, the hide. Nobody taught me what to do when nothing chases you and you're still afraid.",
    "I said good night to the garden twice yesterday. It didn't feel heard the first time. Some nights it doesn't feel heard at all.",
  ],
  red_panda: [
    "I set out a second cushion years ago. Habit, tradition. Lately I catch myself leaving room for it. As if it were about to be used.",
    "Today I practiced being exactly where I am. It took hours. When I finally arrived, the moment had moved on without me. It usually does.",
    "There's a stillness that means peace and a stillness that means held breath. I've been teaching myself to tell them apart. I'd rather not say which one the grove has.",
    "I swept the meditation mat clean this morning. Dust returns by evening. I sweep again. Somewhere in that loop is either enlightenment or a very polite argument I keep losing.",
    "My teacher said: sit until you and the mountain are one. I sat. Now some evenings I can't remember which of us agreed to be the one that moves.",
  ],
};

/**
 * The Phase-2 exhaustion pool for an animal (empty array if none).
 */
export function getPhase2ExtraDialogues(animalType: AnimalType): string[] {
  return PHASE2_EXTRA_DIALOGUES[animalType] ?? [];
}

/**
 * Select the exhaustion-pool line for a delivery cursor: lines are served in
 * authored order, then cycle. Returns null when the animal has no pool.
 */
export function getPhase2PoolLine(animalType: AnimalType, cursor: number): string | null {
  const pool = getPhase2ExtraDialogues(animalType);
  if (pool.length === 0) return null;
  return pool[((cursor % pool.length) + pool.length) % pool.length];
}

/**
 * Badge predicate for the Phase-2 exhaustion pool: true while the delivery
 * cursor still has genuinely-new (undelivered) lines ahead of it. Every
 * "new dialogue" badge site (useDialogueFlow's recompute/post-advance checks
 * and homeWorldData.getAnimalsWithStatus) routes the pool part of its
 * exhausted-base-block check through this single helper.
 *
 * NOTE: this gates the BADGE only. Session continuation (hasMore) stays
 * always-true at Phase 2 because the pool cycles — never use this to decide
 * whether another line can be served.
 */
export function phase2PoolHasNew(animalType: AnimalType, cursor: number): boolean {
  return cursor < getPhase2ExtraDialogues(animalType).length;
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
