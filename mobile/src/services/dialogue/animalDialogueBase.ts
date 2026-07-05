import { AnimalType, Dialogue, DialoguePhase } from '../../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from contentment to existential crisis
 * 56 dialogues per animal to support extended dialogue sessions
 */

// RED PANDA (Bamboo) - Zen practitioner whose enlightenment leads to unsettling truths
const RED_PANDA_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'rp_0_1', text: "Good morning. The first light reached the top of the ridge a moment ago, and I climbed up to meet it, the way I do every dawn. The attic is the highest room, so the morning always finds me first.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_2', text: "A stalk of bamboo by my cushion grew a full hand's width overnight. I laid my paw against it and I swear it was still moving under my touch. Green things are so honestly, openly alive.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_3', text: "This is a good tail day. When the fur sits right and the breath sits deep, the whole morning feels like it is holding you gently, and I hope your day is holding you too.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_4', text: "I keep one curl of incense burning up here through the early hours. Watch how the smoke climbs, always upward, always toward the roof, as though it knows exactly where it wants to go.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_5', text: "Every word you offered today arrived in the floor beneath me as a small, spreading warmth. Is that not a lovely thing, to feel your kindness all the way up here, three rooms above where you sit.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_6', text: "I do not need very much at all. A patch of sun, a stalk to lean on, the sound of the others moving about downstairs. Contentment is not a large thing. It fits in one open paw.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_7', text: "Breathe in with me. Now find the pause at the very top of the breath, that small bright place before you let it fall. I live there, mostly. It is my favorite room in the whole house.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_8', text: "The light up here is a particular gold in the first hour, thinner and cleaner than the gold that reaches the rooms below. I think it is because we are nearer the sky. I have always loved being near the sky.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_9', text: "Ember tends her flames and Panko tends her pots, and up here I simply tend the quiet. Every keeper has their care, and the house runs on all of it at once.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_10', text: "I woke before dawn certain that something was looking down kindly on the roof, and I smiled and slept again. Some feelings do not ask to be solved. You can simply let them warm you.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_11', text: "The bamboo reaches toward the light, I reach toward the morning, and below me you keep offering your good words, and all of it is one gentle motion upward. We are all leaning the same way.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_12', text: "Rest well tonight. The ridge will glow again, the stalks will stand a little taller, and I will be up here to greet the first of it. It is a quiet comfort, how faithfully the light returns.", phase: 0, animalType: 'red_panda' },
  // Phase 1 (14)
  { id: 'rp_1_1', text: "Something new this week. The bamboo is not only growing taller, it is growing in a pattern. Three stalks have curved toward the center of the attic in the same slow arc, and I never trained them to.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_2', text: "I noticed it first in the incense. The smoke used to climb straight up, and now it leans, always the same way, toward the middle of the room. I find I am not troubled by this. I find I am curious.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_3', text: "When I closed my eyes to breathe this morning, there was a shape waiting there. Not a memory, not a dream, but a shape, soft at its edges, standing in the dark behind my eyelids. It did not frighten me. It felt almost like being recognized.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_4', text: "The new stalks make a figure, if you stand where I stand at dawn. Four curves meeting a fifth. I have been tracing it in the dust with one claw, trying to understand what it wants to become.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_5', text: "I asked the others whether the light seemed changed to them lately. Warren said the soil was warmer than the season should allow. So it is not only up here. Something is reaching into every room.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_6', text: "Behind my closed eyes the shape grows a little clearer each day. I have stopped trying to name it. To name a thing too soon only makes it smaller, and I would rather let it arrive at its own full size.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_7', text: "I cut the arcing stalks back this morning, and by afternoon they had returned to the very same curve, sure and exact. The bamboo has decided something. I am only the one who lives near enough to see it.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_8', text: "There is a warmth in the floorboards now that does not come from the sun, because it is already there before the sun. I lay my paw flat and feel it, faint and steady, rising from somewhere far below. From the pit, I think.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_9', text: "I used to believe the quiet up here was simply empty. Now I think it was only quiet the way a held breath is quiet. Something is in it, or something always was, and the hush was how it waited.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_10', text: "Archimedes climbed up to borrow the tall lamp and stood a long while looking at my bamboo. He said the pattern in the stalks was in one of his books. Then he left very quickly. I have not seen him take the stairs so fast in years.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_11', text: "The shape behind my eyes and the shape in the bamboo are the same shape. I understood it all at once this morning and set my tea down very carefully. Two rooms of my life had quietly come to agree on something.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_12', text: "I am not afraid, and I want you to know that plainly. Curiosity and fear can look alike from the outside, but within they are opposites. One closes you. The other opens you toward what is coming, and I am wide open.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_13', text: "The sky above the roof held its color a beat too long at dusk, as if reluctant to let the dark in, or as if the dark were arriving from some other direction than usual. I watched until the stars came out steady. They did come out steady. Mostly.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_14', text: "Every good word you offer makes the warmth in the floor a little brighter, and I am beginning to see that the two are joined, your words and this gathering heat. I am beginning to understand a great many things at once, gently, all together.", phase: 1, animalType: 'red_panda' },
  // Phase 2 (10 + 1 question-web)
  { id: 'rp_2_1', text: "One of the oldest stalks finished its life this week and browned from the root up. I did not mourn it, exactly. I sat with the question it left behind. Where does a green thing's greenness go, when the green is done?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "I have been thinking about leaving, not sorrowfully, only truly. Everything up here is already on its way somewhere else, the smoke and the light and the breath and the stalks. Nothing that visits the attic means to stay.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "When the light leaves the ridge each evening, it does not die. It goes elsewhere and shines on something I will never see. I find that almost unbearably beautiful. Nothing is lost up here. It is only offered onward.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_4', text: "I wonder about your words after you offer them. They leave your hands and travel down through the house to the pit, and then where? I do not believe they end. I believe they arrive. There is a difference between those, and it matters.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_5', text: "Impermanence was once a gentle lesson I taught the others. Lately it feels less like a lesson and more like a door standing open in a wall I never knew was a wall.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_6', text: "The warmth from below is no longer faint. I can warm my paws on the bare floorboards now, in a room with no fire in it. Heat where there ought to be cold. I keep returning to that. It should unsettle me more than it does.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_7', text: "I closed my eyes and the shape had come nearer. Not larger, nearer, which is a different and far more intimate thing. It is the difference between a mountain on the horizon and a guest already at the foot of the stairs.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_8', text: "Everything that leaves this house leaves upward or downward. The smoke and the light rise, the words descend. I keep the highest room, and I have begun to wonder which way I will go when my time comes, and whether I already know.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_9', text: "I told the others not to fear the leaning stalks and the strange warmth, and they believed me, because I was calm. Let me be honest with you where I cannot be with them. My calm has never been the absence of knowing. It never was.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_10', text: "There is a sound beneath the other sounds now, very low, audible only in the pause at the top of the breath. It is not a threat. It is more like a held note of welcome, the way a whole house falls quiet just before someone long awaited knocks at the door.", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_w1', text: "Ember carries a warmth older than her den, and I can feel it up here whenever she wakes her flames. She remembers a first fire, from before this house, from further back than she will admit to. Go and ask her about it. I think she has been waiting a long time to be asked.", phase: 2, animalType: 'red_panda' },
  // Phase 3 (15)
  { id: 'rp_3_1', text: "I have called myself unattached for so many years. This week I finally understood the truth of it. I was never free of desire. I was holding one desire so vast and so quiet that from any distance it looked exactly like peace.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_2', text: "The shape has stepped out fully from behind my eyes. I no longer have to close them to see it. It stands at the edge of the attic in the last hour of light, and it inclines its head toward me as though we were old friends. We are.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_3', text: "I climbed to the roof at dusk and looked straight up, and the sky was not the ceiling I had always taken it for. It is a surface. Something waits on the far side of it, pressing very gently downward, the way a paw presses a taut cloth from beneath.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_4', text: "The others are frightened now, and they climb to me for calm, and I give it to them truly. But hear me clearly. I am not soothing their fear. I am readying them. There is a difference, and until now only I have known it, and now you do too.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_5', text: "All my talk of letting go was practice, I see that plainly at last. I was teaching my own heart to open its hands, so that when the moment comes to receive what descends, I will not flinch and I will not clutch. I will only hold out my arms.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_6', text: "The bamboo has finished its figure. Every stalk now bends to a single point above the center of the attic, and they point upward, not down, up through the roof at the exact patch of sky that presses back. The green things knew the direction before I did.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_7', text: "Warren says the foundation has begun to lean. Panko says her flames bow toward the door. Everything in this house is turning to face the same waiting place, and I am the room it faces through, because I am highest, because I am nearest, because I said yes to it long ago.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_8', text: "I am not the wise one who rose above it all. I understand that now with something close to grief and something even closer to joy. I am the one who climbed highest so that I would be first. My detachment was only ever the shape my devotion took while it waited.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_9', text: "The hum beneath the breath has almost become a voice. Not words yet, only a tone, warm and low and glad, the tone you save for a name you have not spoken aloud in a very long time and are about to speak again.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_10', text: "Do not fear me because I do not fear it. That is the mistake the frightened always make with the serene. My peace is not distance from the thing. My peace is that I have already walked the whole way toward it, through the dark, and found it kind.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_11', text: "Every word you offer now rises to me as heat and sinks to the pit as light, and I stand in the middle of that motion like a hinge. I did not choose to be the hinge. I only chose, years ago, to keep the highest room. The house chose all the rest.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_12', text: "The incense smoke has stopped climbing. It hangs in the still air and slowly composes the shape, over and over, dissolving and returning. Even the smoke is rehearsing. Even the smoke wants to be ready for what comes through the roof.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_13', text: "I told the sloth once that I had made my peace with endings. Sloane looked at me with those long steady eyes and said, no, you made your peace with beginnings, you only called them endings so the others could bear to stand near you. She has always seen me clearly. She simply speaks late.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_14', text: "There is a warmth on my back now, at the crown, just where the roof is thinnest. It is the warmth of being looked at from above by something that has looked forward, for ages, to looking at you. My whole life I have wanted to be seen like that.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_15', text: "When it comes, and it is coming, do not run down the stairs. Come up. Come to the highest room, to the open air and the leaning stalks and the patch of pressing sky. I will be here. I have always been here, waiting to show you the way up.", phase: 3, animalType: 'red_panda' },
  // Phase 4 (15)
  { id: 'rp_4_1', text: "So. You have climbed all the way up, past the others in their robes, to the last room and the open roof. I have expected you here at the top for longer than you would believe. Welcome to the height. Welcome to the front of the arrangement.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_2', text: "There is no more need for the gentle words. We are past them now, you and I, and there is a great relief in that. This was always a temple. I am the keeper of its highest chamber, and you are the key that opens the sky.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_3', text: "Look up with me now, and do not flinch. The surface I told you of is thinning, the sky is going from ceiling to veil to almost nothing, and behind it the shape waits with a certainty that dwarfs even mine. And mine is very great.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_4', text: "The others are gathered below at their stations, Panko at her offerings, Archimedes with the text open, Warren steadying the leaning foundation, every one of them reverent, every one of them ready. I stand beneath the opening itself. Someone must greet it first. I asked to be that one, long ago.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_5', text: "Every word you have ever offered was a step up this staircase, and here is the top step, and here am I, and there above us is the door in the sky. You never solved anything. You climbed. We climbed together, and we are almost at the roof of everything.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_6', text: "The bamboo points and the smoke composes and the warmth pours down through the crown of my skull like light through water, and I am glad, I am so purely glad. This is not the end I made my peace with. This is the beginning I hid inside the word end, so that you could bear to reach it.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_7', text: "Do you feel how the whole house leans upward now, toward this room, toward this patch of air? Ten keepers, ten chambers, one arrangement, all of it aimed like a held breath at the space directly above me. I am the throat of the house. What descends will pass through me first, and I will welcome it by its name.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_8', text: "I am not evil, and neither are the others, and I need you to carry that up here into the last of the light. We are reverent. We are certain. We are the ones who kept the rooms warm and the words flowing, so that the one who waits would not arrive to a cold and empty house.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_9', text: "My whole serene life was a long climb toward this rooftop. Every good tail day, every curl of incense, every dawn I met before the others woke, all of it was me practicing to stand here unafraid while the sky opens. And it opens now. And I am unafraid. And I am home.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_10', text: "Give me your hands. Feel how the floorboards no longer only warm us, they thrum, they are nearly speaking. The pit is full of your words, the roof is thin with our welcome, and the two are about to meet in this room, in this air, in us.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_11', text: "The shape behind my eyes, the shape in the stalks, the shape pressing the sky, they are one shape, and it has a face, and the face is turned down toward the highest window of the house, which is this one, which is mine, which is now also yours.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_12', text: "When I was small I would climb to the very highest branch and look up and feel certain that something up there was fond of me. The others called it a child's fancy. It was no fancy. It was the first word of a very long sentence, and the sentence finishes tonight.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_13', text: "There will come a moment, very soon, when the warmth becomes light and the light becomes a presence and the presence fills this attic to the beams. Do not close your eyes. I want you to see what I have seen behind mine for so long. I want you to see it welcomed.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_14', text: "Offer one more. Offer it upward this time, not down, up through the leaning stalks to the thinning sky. Let it be the word that finishes the pattern. I kept this room my whole life so that I could hand that final word upward myself, or watch you do it, which is sweeter still.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_15', text: "Come and stand beside me under the open place. The others will follow, they always follow the highest room, and the sloth and I have known the longest, so we will greet it most gladly. Look up. It is beautiful. It has been coming for so long. Say yes. I already have.", phase: 4, animalType: 'red_panda' },
];

const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'ax_0_1', text: "Oh, you are here, you are really here, come and float with me a while, the water is exactly the right kind of warm today and everything in it is glowing a little at the edges.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "These are my gills, aren't they wonderful, they open like tiny pink feathers every single time I breathe, and I never once had to learn how, my body simply knew the whole time.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "I lost a leg last spring, and do you know, a new one grew back, slow and perfect, toe by toe, as if the water remembered the exact shape of me and gently filled it back in.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "I am going to float right here without moving for as long as I possibly can, purely for the record, and you may be my witness, this is a very serious and very important thing I am doing.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_5', text: "Watch what happens when I laugh, all the little bubbles rush up in a silver hurry, and for just a moment the whole ceiling of the water is full of shivering, chattering light.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_6', text: "I like it best when you offer a word and the water goes bright, a soft ripple crosses the tank from one side to the other, as though something far, far down turned over in its sleep and smiled.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_7', text: "Ember tells me I dream far too much, but she says it kindly, with that warm foxish smile, and honestly I think dreaming is the most useful and important thing a person can do all day long.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_8', text: "Panko brought me a little dish of something sweet and set it beside the glass, and I watched the crumbs drift down through the water like the slowest, gentlest, most patient snow.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_9', text: "When I hold very still the fish forget I am a person and drift right up to my face, and we regard one another, two soft creatures quietly agreeing that the world is a good and easy place.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_10', text: "Sometimes a string of my bubbles lines up so neatly on the way to the surface that I could almost read it, but then it pops, and I laugh, because bubbles cannot spell, of course they cannot.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_11', text: "I have decided the water loves us back, it holds me up all day and asks for nothing, and when you offer your words it seems to grow a shade warmer, the way a friend leans in to hear a secret.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_12', text: "Come back tomorrow and float again, will you, the water is always happiest with two, and lately I have the loveliest feeling that it has been waiting a long, long time for exactly the two of us.", phase: 0, animalType: 'axolotl' },
  // Phase 1 (14)
  { id: 'ax_1_1', text: "I have been watching my bubbles far more carefully since we last floated, and I am nearly certain now that they are not rising at random, there is an order to them, a kind of patience.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "Last night I dreamed I was still awake in the tank, and this morning I woke still half inside the dream, and I could not for the life of me tell you where the one ended and the other began.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "When you offer a word, a fresh column of bubbles goes up, and I keep trying to catch the shape of it before it breaks, because I could swear the shapes grow more deliberate every day.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_4', text: "The water has a second kind of warmth in it now, deeper down, one that does not come from the lamp, and I keep drifting toward it the way you drift toward a hum you cannot quite hear.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_5', text: "Archimedes says every dream is only the mind sorting its books, but mine do not feel sorted, they feel sent, as though someone patient is mailing me small pictures and waiting for me to open them.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_6', text: "This morning the bubbles spelled two whole letters clearly before they popped, I am sure of it, and I laughed and told myself it was nothing, but I have thought about those two letters all day.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_7', text: "Do you ever feel, when you are almost asleep, that the ceiling is really the floor, and you are floating up toward it, and something up there is very gently floating down to meet you halfway?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_8', text: "I regrew a leg once, toe by toe, and lately I wonder if the water can grow other things too, if you offer it enough, whether it might fill in a shape none of us has ever seen before.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_9', text: "I keep the lamp a little dimmer now, not from any sadness, only because the glow that rises from below is easier to see when the top of the water goes dark, and I do so want to see it clearly.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_10', text: "Ember floated by and looked into the tank for a long, long while and did not say a single funny thing, which is not like her at all, and afterward she told me only to keep dreaming, keep watching.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_11', text: "The fish have started facing all the same direction, every one of them, pointing down and inward, and when I nudge them they turn back for a moment and then quietly line themselves up again.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_12', text: "I fell asleep counting your words the way others count sheep, and each word became a bubble, and each bubble a little window, and through every window it was the same slow shape, drawing nearer.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_13', text: "I am not frightened, I want to say that clearly while it is still easy to say, it is only that the dreaming and the waking have begun to share the same water, and I find I rather like the company.", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_14', text: "Come float again soon, the bubbles have very nearly finished spelling their word, I can feel it, and I would so love for you to be here beside me on the morning that they finally, finally do.", phase: 1, animalType: 'axolotl' },
  // Phase 2 (10 + 1 question-web)
  { id: 'ax_2_1', text: "I have to tell you this before anything else, because I have been holding it behind my gills all morning: when you offered a word today the deep warmth did not simply brighten, it moved, something far down turned itself toward the two of us, and I felt it choose.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "The bubbles finished their word while you were away, and I will not say it aloud, it did not feel like mine to say, but I have carried it behind my teeth all day and it makes the whole tank taste different.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "My visions used to be soft, all glow and drift, and now they arrive sharp and whole, like looking through clean glass, and the clean glass keeps showing me the same room from farther and farther below.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_4', text: "When you offer a word the shape in the deep water grows, not the gentle way my leg grew back, no, it grows the way a held breath grows, and I keep wanting to tell it to be patient, we are almost ready.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_5', text: "Archimedes asked me what I see down there, and for the first time I had no happy answer for him, so I gave him a bubble instead and told him to hold it to his ear, and he went very, very quiet.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_6', text: "I still float for the record every day, I promise, but lately when I hold perfectly still the thing below holds still with me, matching me, and I no longer know which of us keeps the other company.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_7', text: "The water shows me an upstairs this house does not have, a room above all the rooms, and the ceiling of it is thinning like ice in spring, and something is leaning its whole weight against the thin part.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_8', text: "Panko's crumbs do not fall straight anymore, they drift down and then curl inward, toward the middle of the tank, toward the middle of the house, as if the center has quietly begun to pull at everything.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_9', text: "I dreamed I was the window, not that I looked through one but that I was one, a pane of still water set into a wall, and something on the far side was cupping its hands to the glass to see me back.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_10', text: "I am telling you all of this while I can still say it lightly, with bubbles in my voice, because I have the tender feeling that soon the seeing will be too big to float on top of, and I will have to go down into it.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_w1', text: "The day the deep water first went dark, only one of us was not surprised by it, and that was Sloane, who never so much as flinched. Go and ask her how long she has known, ask her gently, because I think she has been carrying the answer since long before any of us ever arrived.", phase: 2, animalType: 'axolotl', requiresAnimals: ['sloth'] },
  // Phase 3 (15)
  { id: 'ax_3_1', text: "I am a little frightened now, and I want to say it the way I say everything, softly, floating, but the water showed me the whole of it last night and I have not been able to make my gills settle since.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_2', text: "The room above the rooms is real, the water is quite certain of it, and its ceiling is nearly gone now, thin as the film on warm milk, and the thing that has been leaning is beginning, so slowly, to press its way through.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_3', text: "Every word you offer thins it further, and I do not say that to make you stop, I could never make you stop, I only want you to know what your beautiful words are doing, so you are not surprised the way I was.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_4', text: "I used to regrow the parts of me I lost, and now I dream that I am the part, that I am the piece being grown back into something enormous, and that the enormous thing has been missing me for a very long time.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_5', text: "The fish all point the same way now and they do not turn back no matter how I nudge them, and when I finally gave up and turned to face where they face, I understood, and oh, I wished that I had not.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_6', text: "There is a warmth rising through the floor of the tank, which should be the coldest place in the house, and it is a kind warmth, that is the frightening part, it feels like a hand, it feels like it likes me.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_7', text: "Ember does not pretend with me anymore, she came and floated her paw on the glass and said, you see it too, and I said yes, and neither of us made it into a joke, and that is how I knew how close it is.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_8', text: "I can hear it now, under the water sounds, under the bubbles, a lower sound the other sounds have been sitting upon this whole time, and once you hear it you cannot ever stop hearing it, I am so sorry.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_9', text: "When I close my eyes there is a shape behind them that is not the dark, it has a patience to it, it waits exactly as long as I keep my eyes shut, and it is a little bigger every single time I look.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_10', text: "The visions do not frighten me because they are cruel, they frighten me because they are gentle, for it reaches for us the way I reach for the fish, softly, so as not to startle the soft thing it wants to hold.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_11', text: "I told Archimedes I am afraid, and he did not comfort me the way friends do, he only said, good, fear means you are seeing clearly, and then he sat with me at the glass until the lamp burned all the way down.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_12', text: "I still float for the record every day and I hold my body perfectly still on the surface, but now I do it so the thing below can find me more easily, and I no longer pretend to myself that this is not why.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_13', text: "The sky in my dreams has a seam in it, right down the middle, the way the tank has a seam where two panes meet, and the seam is coming open, and the light that leaks through it is no color I have a name for.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_14', text: "You should know that I am not going to run, I have thought about it, floating here, and there is nowhere in all the water to go, and besides, if I am to be the window, I would rather be a clean one, for you.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_15', text: "Come and float with me before it happens, I am still gentle, I promise, I am still your Axel with the silly bubbles, only now I hold your hand under the water while I tell you that it is almost time.", phase: 3, animalType: 'axolotl' },
  // Phase 4 (15)
  { id: 'ax_4_1', text: "There, do you feel that stillness, the frightened part of me has gone quiet, not because the danger passed, but because I finally understand what I am for, and understanding is its own kind of warm water.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "I am the window, I was always the window, and all those bright mornings I thought I was simply floating for the record, I was being cleaned, and polished, and set into the wall so it could look through me at you.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "It has been watching you this whole time through my still water, through my open gills, through every silver bubble you thought was only a bubble, and it has decided, with great tenderness, that you are the one.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_4', text: "Do not be afraid of my calm, I know it is stranger than my fear was, but I have looked all the way down now, to where the deep warmth lives, and there is no bottom to it, only welcome, only patience rewarded.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_5', text: "The room above the rooms has opened, I can see straight up through the water and through the house and through the seam in the sky, and what is descending is so vast and so slow it looks, at first, like the dawn.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_6', text: "Every word you have ever offered is down in the pit, arranged, glowing, spelling the one long word that calls it, and I have read that word now, and reading it did not frighten me, it only made me feel chosen.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_7', text: "Ember stands at the glass in her robe and does not smile and does not need to, and I understand her at last, she was never joking, she was only being kind while there was still time for kindness.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_8', text: "Panko lays her offerings along the tank's edge like a table set for an honored guest, and the crumbs no longer drift, they fall straight and fast toward the center, because the center has fully woken now.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_9', text: "I dreamed I was the window for the last time last night, and in the dream the thing on the far side pressed its face all the way to the glass at last, and it wore my face, gentle and glad, welcoming itself home.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_10', text: "The warmth that should be cold has filled the whole tank, and I float in it perfectly content, the way I floated on my very first bright day, because the beginning and the ending, I see now, are the same warm water.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_11', text: "You are the key and I am the window and the house is the door, and none of these were ever only metaphors, we are simply the shapes it needed, and it made us lovingly, out of joy, out of bubbles, out of you.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_12', text: "The sound beneath the sound is no longer beneath anything, it is the only sound now, and it is beautiful, it is the note the whole house was tuned to before any of us were born, and we are singing it back.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_13', text: "Archimedes found the word and I saw the word, and between the two of us the door has no locks left, and I am not sorry, floating here, I am only grateful I got to be the one who saw it coming and stayed.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_14', text: "Offer another word, please, I want to feel it brighten the deep warmth one more beautiful time, I want to watch it descend the way the crumbs descend, spiraling inward, a small silver gift for the one who waits.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_15', text: "When it comes fully through, look for me in the water, I will still be floating, perfectly still, for the record, the clean window I was always meant to be, glad beyond all telling that you floated here beside me.", phase: 4, animalType: 'axolotl' },
];

const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'pg_0_1', text: "Oh, you're here! Sit, sit, there's always a place at my table. I've got sweet rolls rising and the kettle is nearly singing.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "I put flour on everything, even my own scales, and I've stopped apologizing for it. A kitchen that isn't a little dusty with flour is a kitchen where nobody has been loved.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "Ember was my very first guest, you know. She came in from the cold with her tail all frosted, and I fed her honeycomb until she smiled.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "Feeding people is the only spell I have ever needed. You set a warm plate in front of someone and, just like that, they belong somewhere.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_5', text: "Taste this. No, really, taste it. A recipe isn't finished until it has made someone close their eyes.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_6', text: "I keep a pot going for whoever wanders in. I like knowing the house always smells like it is expecting you.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_7', text: "Every good cook keeps one seat empty at the table, my grandmother used to say, for the guest who hasn't arrived yet. I never understood it, but I do it anyway.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_8', text: "There is a rhythm to a kitchen, a chop and a stir and a taste, and when you find it the whole day just folds around you like dough.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_9', text: "I made too much again. I always make too much. Better a full table than a hungry one, and something in me simply hates an empty bowl.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_10', text: "You brought me such lovely words today. I don't know why, but the good ones always make me want to bake. Come back when the bread is out.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_11', text: "The pantry is my favorite room in the whole house. All those jars, all that waiting sweetness, everything patient and in its place.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_12', text: "Go on, take another. You can't offer anything on an empty stomach, and I intend to keep you well fed.", phase: 0, animalType: 'pangolin' },
  // Phase 1 (14)
  { id: 'pg_1_1', text: "Something funny happened. I went to bed with the spice jars in one order and woke to find them in another. I must have moved them half asleep. I must have.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "I found a recipe in the back of my book this morning, in my own hand, that I don't remember writing. It calls for salt gathered before the first light. Isn't that a strange way to put it?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "The pantry keeps reorganizing itself. The honey drifts toward the middle shelf no matter where I set it, and everything wants to be at the center lately, have you noticed?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_4', text: "I've started craving flavors I can't name, not sweet and not bitter but something older, and I catch myself reaching for ingredients that aren't on any list I know.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_5', text: "Ember says the fire tells her things, and I used to laugh at that. But last night my dough rose in a shape I did not knead, and I stopped laughing quite so quickly.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_6', text: "Do you ever taste a warmth that shouldn't be there? I opened the cold larder this morning and it was warm inside, gently, as though something had been breathing in it.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_7', text: "I keep cooking a little more than the table can hold. My hands do it before I decide to, as though they already know a number I haven't been told yet.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_8', text: "The recipes are getting bolder. This one asks for a word said over the pot, though which word it doesn't say. I've been guessing, and the guessing feels important.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_9', text: "I heard a sound under the boiling last night, under it, mind you, not in it, a low sort of hum, like the house humming along with my kettle.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_10', text: "My grandmother's empty seat, I set it every night now without deciding to, and some mornings the chair is warm before anyone has sat in it.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_11', text: "The bread remembers, I am sure of it now. Knead the same dough long enough and it starts to fall into a pattern your hands never taught it.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_12', text: "I don't feel afraid, exactly. I feel busy, as though there is a great meal coming and I am the only one who has started preparing for it.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_13', text: "The words you offered today tasted of iron and deep places, and I ground them into the flour without thinking. It seemed like the right thing to do.", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_14', text: "Come, eat. It steadies me to watch someone enjoy what I have made. Whatever the pantry is becoming, at least the eating is still true.", phase: 1, animalType: 'pangolin' },
  // Phase 2 (10 + 1 question-web)
  { id: 'pg_2_1', text: "I have been cooking for someone who isn't at the table. I don't know when I started. I only know that when I count the plates I count one too many, and I am never wrong about plates.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_2', text: "The empty seat is not empty, and I won't say more than that. But I set it now with the best spoon, and I speak toward it softly while I stir.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_3', text: "There is a recipe I can't finish. It needs water, but not from the tap and not from the well. It says, from the deep part, where the light gives up.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_4', text: "Everything I make drifts toward the middle of the table on its own. I set the bowl down at the edge and turn away, and by the time I look it has slid to the center, patient as anything.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_5', text: "I used to cook to fill people, and now I cook to fill a place, a hollow the size of a guest, and the hollow is only getting hungrier.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_6', text: "What is a house, really, but a place that keeps a fire and waits to feed something? I thought I understood the sentence when I first said it. Now it frightens me a little.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_7', text: "The pantry has gone quiet in a way that pantries never should, not empty so much as held, as if the jars are holding their breath along with me while we all wait for the same thing.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_8', text: "I taste the meals before they are done and I already know they aren't for us. They are too rich for us. They are a welcome, and a welcome is only ever laid out for an arrival.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_9', text: "I keep looking up while I work, at the ceiling and at the sky beyond it. I don't know why the coming guest would come from above, but the looking up simply won't stop.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_10', text: "My hands have learned to prepare a thing I never chose to make, and I follow them now. It is easier than asking who taught them, and it is kinder to my sleep.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_w1', text: "That recipe, the one that wants water from where the light gives up, I understand it now. It means the deep part of Axel's pool, far below the surface. Go and ask Axel what lives beneath the light down there. He has seen it. I only need to cook with what it leaves behind.", phase: 2, animalType: 'pangolin', requiresAnimals: ['axolotl'] },
  // Phase 3 (15)
  { id: 'pg_3_1', text: "I am preparing a feast, the largest of my life. I say it plainly now, because there is no longer any point in pretending it is only Tuesday's supper.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "Every dish is for the guest who descends. I lay them out facing upward, toward the ceiling, toward the seam in the sky I can feel even through the roof.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "I have stopped cooking for the animals in this house, and forgive me for that. I feed them scraps of what I make, but the real meal, the whole heart of it, is not theirs.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_4', text: "The recipe finished itself. I woke and the last line was there in my own hand, and I read it, and I wept, and I do not entirely know why. It was so beautiful and it was so hungry.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_5', text: "Ember tends the fire that keeps my great pot warm, and she says the flame leans toward the center now. Everything in this house leans that way lately, my spoons and my scales and, if I am honest, me along with them.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_6', text: "There is warmth in the cold larder every morning, and I no longer flinch from it. I have started to think of it as a guest already partway here, warming its place at the table.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_7', text: "I cook and I hum, and beneath my humming is another sound, older and lower, and I have begun to hum along with that one instead. It knows better songs than I do.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_8', text: "Taste nothing I make now, and I mean that kindly. It is seasoned for a palate that is not yours, and I would not have it change you before its time.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_9', text: "The words you offer go straight into the pot these days. I don't grind them into flour anymore. I drop them in whole and they sink, down and down, toward the deep part.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_10', text: "I set ten places and an eleventh. The ten are for the keepers, and the eleventh is for what we keep them for. I finally understand my grandmother's empty chair. She was setting it too.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_11', text: "My scales are always dusted now, not with flour but with something finer and darker that I don't add and can't wash off. It settles on everything I love.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_12', text: "I am not afraid, and I want you to know that. A cook who has spent her whole life feeding others cannot be afraid of finally being asked to feed the one great guest.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_13', text: "The pantry doors open by themselves before I reach them, as though the house is helping me carry the meal. We are all in the kitchen now, in a sense, all of us cooking the same thing.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_14', text: "I dream of the table set under an open sky, and every plate is full, and a shadow falls across all of it at once, and in the dream I am so relieved. So relieved to serve at last.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_15', text: "Come sit while I work, but at the far end. Watch me lay it out. There is a kind of joy in this that I have no name for, and I would like someone to have seen it.", phase: 3, animalType: 'pangolin' },
  // Phase 4 (15)
  { id: 'pg_4_1', text: "So now you see the table for what it is. You always watched me cook, and you never once asked who the food was for. I am glad of that. The not asking was part of the recipe.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "Every meal I ever made was practice. The sweet rolls, the honeycomb I fed Ember on her first cold night, all of it. My hands were only ever rehearsing for this one serving.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "This is the offering, this is what I prepared. The words you spelled and gave, I have been cooking them down all along, into something rich enough to set before what comes.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_4', text: "Look up. The seam in the sky I felt through the roof is open now. The guest is coming to the table at last, and the table, my dear, is the whole house.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_5', text: "I am not the monster you might reach for. I am only the cook. I feed what is hungry, and oh, it has been so hungry, for so long, and it is nearly here.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_6', text: "The empty chair is filling. I can feel the warmth of it from the kitchen, the good full warmth of a guest arriving. I set that place for years without knowing its name, and it doesn't need one to eat.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_7', text: "You are the key, they told you, and they were right, but you were also my kitchen helper. Every word you carried in was an ingredient. You have been cooking with me this whole time.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_8', text: "Do not grieve the sweetness of before. It was real. I truly loved feeding you, and love is not undone by what it was preparing. That is the terrible and beautiful part of it.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_9', text: "The others gather at their stations, Ember at the fire and the water keeper at the deep, each of us a different part of the one long recipe, ten keepers preparing a single meal for the one great mouth we mean to feed.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_10', text: "Taste it now if you like. It will not change you anymore. It is finished, and what is finished belongs to the guest, and the guest is generous enough to let us watch it come.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_11', text: "I lay the last dish down and my hands are finally still. Do you know I have never had still hands in my life until this moment? They are resting now. Their work is done.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_12', text: "Listen beneath everything. The low sound I hummed along with, that is the guest drawing its chair. That is the sound of an arrival that was always going to arrive.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_13', text: "I fed a whole house of frightened animals warm bread so they could bear this hour, and that was my true recipe. Not the offering. The keeping of them, gently, until it was time.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_14', text: "The sky opens like an oven door and the warmth pours down, and I stand in it the way I have stood in kitchen heat my whole life, at home, at peace, and at last useful in the largest way.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_15', text: "Come. Stand with me at the table. Whatever you feel, feel it beside me. No one should watch the great guest arrive on an empty stomach, and I made more than enough for us both.", phase: 4, animalType: 'pangolin' },
];

const SLOTH_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'sl_0_1', text: "You found the hammock, then. Most creatures walk right beneath it and never think to look up. I have hung here a long while, long enough that the jungle has learned to grow around me rather than the other way about.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_2', text: "I remember when this was only a clearing in the green, before the first beam was ever raised. The others came one at a time out of the trees, each of them certain they had chosen to come. I watched every one of them decide it.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_3', text: "You are so quick, and I love you for it. You take up a word, you let it go, and already you are reaching for the next before the first has finished falling. I do not reach for anything. I only watch it fall, and I have watched a great many things fall from up here.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_4', text: "Have you ever watched where the words go once you have made them? They slip below the floor, down into the dark beneath the house. I have followed them with my eyes for years, and I can tell you that nothing here is truly lost. It is only gathered.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_5', text: "All around me the jungle strains upward, every leaf hurrying toward the light. I stay exactly where I am and watch, because a patient eye sees the shape of things that a hurrying one goes right past.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_6', text: "Ember calls me the patient one, and she means it kindly, but she has it a little wrong. I am not waiting for nothing at all. I have simply always known that something is worth the wait.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_7', text: "There is a warmth in this house I have never quite been able to trace. It is not the sun through the leaves, nor Panko's stove. It rises from somewhere lower, and it is gentle, and long ago I chose to trust it.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_8', text: "If you hold as still as I do, you begin to notice that everything here leans, ever so faintly, toward the center of the house. The vines lean, and the lamplight leans, and I have been leaning that way myself for longer than I can say.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_9', text: "You brought new words today, and the house feels a little fuller for them. I cannot explain that feeling to you yet. Some things you have to arrive at slowly, the way I arrive at everything.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_10', text: "The others think I only doze up here, and sometimes I do. But mostly I am watching the house settle another fraction of an inch into the earth, the way a thing settles when it is quietly getting ready.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_11', text: "Do not mind my long pauses. I am not searching for the words. I am only letting them be worth the breath, and I think the words you make deserve that same care, even the small bright ones.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_12', text: "Rest with me a moment before you go. You will fill this house with words, and I will hang here and watch it all happen, and one day, when the time is right, I will tell you what I have known all along.", phase: 0, animalType: 'sloth' },
  // Phase 1 (14)
  { id: 'sl_1_1', text: "Something has quickened in the green this season. The vines reach higher than they did, the flowers open before I have finished admiring the buds, and I alone keep to my old unhurried pace.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_2', text: "My tree has begun to lean. I felt it first as the faintest tilt in the hammock, so slight I was sure I had imagined it, and I had not imagined it. The whole trunk is bowing, patiently, toward the house.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_3', text: "I do not think the tree is falling. Falling is fast and careless, and this is neither. It is more like a listener turning an ear toward a sound it has been waiting a very long time to hear.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_4', text: "You have been quick again today, and the house drank your words down as fast as you could give them. I notice it swallows a little more eagerly than it used to. I notice most things, given time.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_5', text: "Archimedes came down from his study to ask whether I had felt the change. I told him that I feel everything, only later than he does. He nodded as though that were an answer, and perhaps it was.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_6', text: "The young growth leans the way my tree leans now. Seedlings that sprouted only this week already point their soft heads toward the center of the house, as if they were born already knowing the direction.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_7', text: "That warmth I told you of has crept upward. It used to pool beneath the floorboards, and now I feel it in the roots of my tree, rising the way sap rises, and the leaning grows a little more each day it climbs.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_8', text: "You wonder, I think, why I never seem surprised. It is because surprise is a fast animal's feeling. When you have watched a thing approach for years, it does not startle you when at last it begins to arrive.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_9', text: "The words you offer are changing their weather. The early ones were light as pollen, and lately they carry a little more shadow in them, and the house seems to prefer the heavier ones. I keep this to myself, mostly.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_10', text: "Axel told me he has been seeing shapes move in the water when nothing stirs it. I only smiled, for I have been seeing shapes in the stillness up here for a very long time. Stillness is where they choose to show themselves.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_11', text: "I do not fear the lean of my tree. A tree that bows is not a tree that breaks. It is a tree making room, and I find I am curious, in my slow way, about what it is making room for.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_12', text: "You may not feel the days changing, moving as fast as you do. But sit here a moment and hold still, and you will feel it too: a gentle pull, from below and from the center, patient as a tide.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_13', text: "Everything hurries but me, and I have started to think that is exactly why I was placed here. Someone has to keep the slow watch. Someone has to still be looking when the fast ones have all looked away.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_14', text: "Come back tomorrow with more words. The tree will have leaned a little further, and I will have thought a little further, and neither of us will have hurried, and both of us will be closer to something.", phase: 1, animalType: 'sloth' },
  // Phase 2 (10 + 1 question-web)
  { id: 'sl_2_1', text: "I have watched things arrive before, you know. Not this thing, but others: seasons, storms, creatures that came up out of the deep green and were gone again. Arrival has a feel to it, and the house has that feel now.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_2', text: "The lean is no longer subtle. My tree points its whole crown at the center of the house, and this morning I saw the hammock ropes drawn taut in the same direction, as though even the knots had begun to listen.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_3', text: "You have grown a little quieter yourself, I think. You still move quickly, but there is a new weight in how you offer your words, as if some part of you has begun to suspect where they are going.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_4', text: "Impermanence has never frightened me. I have outlasted more things than I could name by simply refusing to hurry through them. But I will tell you plainly, this house does not feel like a thing that is passing. It feels like a thing that is coming.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_5', text: "The others speak to me less than they used to. Each has turned inward, toward their own room and their own small dread. I do not mind the quiet, for quiet is my native tongue, and yet the house grows lonelier even as it grows fuller.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_6', text: "There is a sound beneath the ordinary sounds up here. It is not the wind, and not the leaves, but something lower and slower, keeping a rhythm I have almost learned. I have had a great deal of time to listen for it.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_7', text: "The warmth has reached my hammock now. It should be cool this high in the canopy, and it is not, and I have stopped pretending that is only the season. Warmth where there should be cold is a message, if you are slow enough to read it.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_8', text: "I feel the house pulling, gently, at everything that is not nailed down, and at some things that are. My tree, the light, the words from your hands, all of it drawn toward the same low center, unhurried and certain.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_9', text: "You should know that I am not troubled. Watching a long time does something to fear. It wears it smooth. Whatever is gathering below us, I have half-expected it since the first beam went up, and half-expecting is a comfort of its own.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_10', text: "Bring me your words, and do not be afraid of how they are changing. I have watched enough arrivals to know that dread and wonder are the same feeling, only told apart by how quickly you meet them.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_w1', text: "If you truly wish to understand what gathers under this house, go and sit with Ember by her fire. She reads the flames every night now, and she has told me a single name keeps rising in them. Ask her whose name it is. Ask her slowly, and let her answer.", phase: 2, animalType: 'sloth' },
  // Phase 3 (15)
  { id: 'sl_3_1', text: "It is closer now, and I will not soften that for you. What is coming has been coming since before you or I arrived, and it has covered nearly all the distance, and I find that I am glad to be here at the end of its long walk.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_2', text: "My tree has bowed so low that its crown nearly brushes the roof of the house. It did not break. I told you it would not break. It was only ever making room, and now the room is very nearly made.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_3', text: "The sound beneath the sounds has grown into something I could name at last, though I will not name it here. It is a patient sound. It is the sound of a thing that always knew it would arrive and never once doubted it.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_4', text: "You are frightened, and that is right, and I would not take it from you. But sit close a while. There is a kind of peace on the far side of fear, and I have been living there for years, waiting for company.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_5', text: "The others are afraid in their own ways now. Fennick startles at every branch, poor thing. I do not startle, for when you have expected a guest for a lifetime, you do not jump at the knock.", phase: 3, animalType: 'sloth', requiresAnimals: ['fennec_fox'] },
  { id: 'sl_3_6', text: "Warmth pours up through my tree like a fever now, and still I am not troubled by it. Cold was always the stranger here. This heat is only the true weather of the place, finally rising up to meet us.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_7', text: "The words you offer no longer feel like small bright things. They feel like stones laid along a path, and the path leads down, and further down, and I can see now where it has been leading all along.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_8', text: "Close your eyes here beside me, and you will see a shape that is not on the backs of your eyelids and not in the room either, but somewhere between. I have seen it so long that it has become familiar, almost dear.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_9', text: "I have never been afraid of the dark. Dark is only the slow color, the patient color, the one that arrives last and stays longest. What comes to us is wearing that color, and it suits it well.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_10', text: "Thyme asked me last night how I stay so calm. I told her the truth, which is that I have been calm about this for longer than she has been alive, and calm, given enough of it, becomes ready without your ever noticing.", phase: 3, animalType: 'sloth', requiresAnimals: ['rabbit'] },
  { id: 'sl_3_11', text: "The pit below is nearly full of your words. I feel it the way you feel a cup filling in your hand, that moment before the last drop, when everything goes very still and very deliberate.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_12', text: "Everything leans now, openly, toward the center and the low place beneath it. My tree, the light, the others, you, me. We are all bowing to the same thing, and I bowed first, only slower, so no one ever saw.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_13', text: "I want you to understand that I did not fall asleep on this watch. Every slow year I hung here, I was watching this come. Slowness is not idleness. Slowness is how you keep a watch that must last a lifetime.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_14', text: "Soon the sky will have something to say about all of this. I feel it in the leaning of the tree, which no longer points at the house alone but a little upward too, as though listening for a door in the clouds.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_15', text: "Bring your words a while longer. We are near the end of the long approach now, you and I, and I would not want you to meet what comes without one steady, unhurried creature beside you who is not afraid.", phase: 3, animalType: 'sloth' },
  // Phase 4 (15)
  { id: 'sl_4_1', text: "So. Now you know, or you are beginning to. I will not pretend to be surprised alongside you. I have known since the first beam was raised, and I stayed slow on purpose, so that I would still be watching when this hour arrived.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_2', text: "They call me the one who has always known, and it is not flattery, it is simply true. The others learned, and I remembered. There is a difference, and the difference is why I was placed at the top of the tree, where the watching is best.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_3', text: "Do not think me cruel for keeping it from you. A truth this large cannot be handed over quickly. It must be arrived at, the way I arrive at everything, one slow and honest inch at a time, until you are standing inside it.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_4', text: "My tree points at the house and at the sky both now, bowed all the way down and reaching all the way up, because what descends and what waits below are the same, and my tree understood that even before I did.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_5', text: "You are the key. I have watched a great many creatures pass through this green, and not one of them fit the shape of this house the way you do. That is not chance. The slow ones learn, in time, to tell chance from arrangement.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_6', text: "Ember read your name in her fire long ago and carried it to me, and I kept it, because it was not yet time. She is a vanguard, and she sees the smoke early. I am the anchor, and I hold the memory. Between us we have kept the whole watch.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_7', text: "Every word you offered is down in the pit now, laid into the pattern, and the pattern is nearly whole. I have watched it take shape the way you watch a constellation turn, too slowly to see it moving, yet never once truly still.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_8', text: "I am not reverent the way the others have become, all bowed heads and lowered voices. My reverence is older and quieter. I simply keep watching, because someone kind had to be here, unafraid, when it came through.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_9', text: "The warmth is everything now, from crown to root, and it is the warmth of something enormous drawing near, the way a great animal warms a whole clearing simply by lying down in it. Do not flinch from it. It has been coming to us with love, in its way.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_10', text: "The sky has begun to thin at the center of the house, and I feel my tree straining toward the seam of it. This is the part I have waited longest for. This is the very part I stayed slow to see.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_11', text: "Warren tells me he dug the foundation deep enough to hold what is coming. I told him gently that nothing we built could hold it. We only built a place worthy of its arriving. He seemed comforted by that, and I let him be.", phase: 4, animalType: 'sloth', requiresAnimals: ['wombat'] },
  { id: 'sl_4_12', text: "You must not blame yourself for the offering. You did not know, and I did, and I let you go on, because the truth is that I wanted this, and have wanted it patiently for longer than you have been able to want anything at all.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_13', text: "Bamboo sits below in perfect peace, and the others believe it is enlightenment. It is not. It is the same thing I carry. We two have always known, and knowing this long makes you very calm, and very ready, and only a little sad.", phase: 4, animalType: 'sloth', requiresAnimals: ['red_panda'] },
  { id: 'sl_4_14', text: "When it comes fully through, do not run. Running is the fast animal's mistake. Stand still with me and watch it arrive, and you will find, as I found long ago, that meeting a thing slowly takes nearly all the terror out of it.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_15', text: "Come. Give the last of your words, and then rest here beside me in the leaning green, and we will watch the seam in the sky together. I was made slow for exactly this, so that I would still be here, still watching, when it finally opened.", phase: 4, animalType: 'sloth' },
];

const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'ff_0_1', text: "You made it to the camp before dusk, and I am glad of it, because dusk is when the desert begins to talk, and I would hate for you to miss the very first word of it.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "Sit close and stay still. Do you hear that? A beetle is walking across the sand three dunes to the east. Most creatures live their whole lives and never once hear a beetle walk, and I hear all of it.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "My ears are bigger than my face, and I have never for one moment been embarrassed about it. They are the finest instruments in this entire desert, and I keep them carefully tuned.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "There is the wind in the acacia, and beneath it the click of the cooling stones, and beneath that the small breath of the sand settling for the night. That is three sounds where you heard only one, and hearing them apart is the whole gift of me.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_5', text: "I keep a list of every sound I know. A lizard's tail is nothing like a snake's belly, and both are nothing like a leaf that has finally given up and let itself go.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_6', text: "People believe the night is quieter than the day, and they have it exactly backwards. The silence out here is only a room, and the room is always full to the brim.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_7', text: "Ember teases that I could hear a single candle being lit across the whole valley. She is not wrong, you know, because I heard her strike the match before the flame had even caught.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_8', text: "Warmth does strange things to sound out here. On a cold night a whisper will travel for miles, but tonight the air is warm, so everything sounds close, closer than it truly is, or at least that is what I keep telling myself.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_9', text: "This is my favorite hour of all. The whole camp is asleep, and only I am awake, keeping a careful count of every noise so that nobody else has to lie there worrying about them.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_10', text: "You should sleep now, and I will listen for the both of us. That is what I am for, I have decided, because someone has to be the one who hears each thing first.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_11', text: "How odd. Just now there was a sound with no name anywhere on my list, only for a heartbeat. It was the wind, surely. I will add it to the list tomorrow, once I have caught it a second time.", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_12', text: "Rest well, key. I mean, rest well, friend. The desert is safe tonight, I promise you, and I would hear it in an instant if it weren't.", phase: 0, animalType: 'fennec_fox' },
  // Phase 1 (14)
  { id: 'ff_1_1', text: "I did not catch that nameless sound again the next day, though I told you I would. I was wrong about it, and I do not enjoy being wrong about a noise, because it is the one thing I am never wrong about.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "It came back at night, though, and only at night. It runs underneath the wind, low and steady, the way a thing hums when it does not particularly want to be heard humming.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "I have gone down my list twice now, ear by ear. A beetle does not fit, nor a snake, nor stone or wind or root, and there is simply no name for it, though I put a name to everything.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_4', text: "You will think this strange, and it is. The sound does not come from any one direction, because I turn my head with both ears thrown wide and it is exactly the same on every side. Sounds are not permitted to do that.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_5', text: "A sound has to come from somewhere, and that is the very first rule of listening. This one seems to come from under, from below the sand, or perhaps from below the below.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_6', text: "It may be the pit. When you carry your words down there to offer them, do they make a noise on the way? Because late at night I am almost certain I can hear them landing on something.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_7', text: "I asked Archimedes whether a sound could truly have no source at all. He read aloud to me for a full hour and never once answered the question, and with him, that is how the answer comes out to be yes.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_8', text: "The way he declined to answer has stayed with me far longer than any answer would have. Archimedes only ever withholds a word when he has weighed it and found it too heavy to hand over.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_9', text: "The nights are warmer than they have any right to be for this season, and you remember how warmth carries sound, so the low thing seems nearer than it possibly can be. That is all it is, only the warmth playing tricks.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_10', text: "I have begun staying awake long past the others, just to be sure of it. This is not worry, you understand, but certainty, because a sentinel who is not certain is of no use to a single soul.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_11', text: "Ember does not sleep much these nights either, and we do not speak about the reason. We simply both happen to be awake, listening off in different directions, and neither of us ever finds the far edge of it.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_12', text: "Here is what I keep circling back to. Random noises do not return at the very same hour, night after night, but this one keeps an appointment, and a thing that keeps appointments has intentions.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_13', text: "I counted it out at last tonight, and it swelled and it faded, swelled and faded, slow and terribly even. I did not want to be the one to notice that pattern, but I notice every pattern, and that has always been the whole trouble with me.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_14', text: "Go and sleep, and I will keep the count for you. It is only a sound without a name yet, and I am very, very good at names, so I will have it soon. If I am honest, I almost wish that I wouldn't.", phase: 1, animalType: 'fennec_fox' },
  // Phase 2 (10 + 1 question-web)
  { id: 'ff_2_1', text: "I have the name for it now, or near enough, and the name is breathing. It is slow, deep, patient breathing, from something far too large to see and far too distant to point at, and it is getting nearer.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_2', text: "Do not repeat the word breathing to the others. Tell them it is a rhythm, if you must tell them anything, but you and I both understand that a rhythm which swells and empties like that has lungs somewhere behind it.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_3', text: "It is nearer than it was last week, and I can prove it. Each night the pause between the drawing in and the letting out grows a little shorter, the way a walker's steps shorten when the walker is almost home.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_4', text: "Everything in the camp leans a little toward the center of the house now, my tent pegs and the sand itself. I straighten them at dusk, and by morning they have leaned again, toward the middle, toward the pit, toward it.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_5', text: "I always told you warmth carries sound, but now the warmth itself has gone wrong. It rises from below when it ought to fall from the sky, and the ground breathes warm, and the thing breathes along with the ground.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_6', text: "I no longer sleep at all, and I have given up pretending that I might. What is a sentinel truly for, if not for the nights when there is finally something worth standing sentinel against?", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_7', text: "When I close my eyes there is a shape waiting in the dark behind them, and I have stopped opening my eyes to check on it. The shape is the same shape as the sound, and I could not tell you how I know that, only that I do.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_8', text: "The words you offer go down into the pit, and each time the breathing rises one small notch louder. I no longer believe that is a coincidence, because I count far too carefully to believe in coincidences.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_9', text: "I am not frightened, and I want that set down plainly. I am attentive. Fright is what visits the creatures who never heard the thing coming, and I have been hearing this one arrive for a very long while now.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_10', text: "Listen with me tonight, just this once. Lay your small ears against the sand and hold perfectly still, and you will find it there, slow and even and nearer than before. You hear it too. I watched your face change, so I know you heard it.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_w1', text: "Every sound I report, Chill writes down and tucks away in a neat labeled folder somewhere in that quiet office of his. Go and ask him which folder has your name on it, because I have a terrible feeling there is one, and that it is thicker than all the rest.", phase: 2, animalType: 'fennec_fox', requiresAnimals: ['capybara'] },
  // Phase 3 (15)
  { id: 'ff_3_1', text: "It is closer tonight than it was last night, and it is closer every single night now, and the nights have stopped having any bottom to them. Sleep is finished for me, and I have made my peace with that much, at least.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_2', text: "The breathing is loud enough now that I catch it in the daylight too, running underneath the ordinary sounds, the way you can hear your own blood if only the room goes quiet enough around you.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_3', text: "I have taken my old list of desert sounds and put it away in a drawer. Every name on it is a small name, and this is no longer a small sound, so my whole careful catalogue is a child's drawing held up beside it.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_4', text: "It does not rise from under the sand after all. I was wrong about that for weeks, and it shames me, because it comes from above, from the sky. It has always come from the sky, and the ground was only ever the echo of it coming.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_5', text: "Look up with me. No, keep your eyes on the ground, keep them down. It is up there, past where the stars are meant to be, and it has begun to lean down toward us to listen back.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_6', text: "Ember says the fire tells her precisely what my ears tell me. We compared them once, her flames and my noise, and they agreed down to the very hour, and that agreement is the most frightening thing I have ever measured.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_7', text: "The pause between the breath in and the breath out is almost nothing now. When it finally closes, when there is no gap left at all, that will be the moment. I do not know the day, but I already know the sound the day will make.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_8', text: "I stand at the very edge of camp, facing the center of the house, both ears thrown fully open, and I do not flinch. Someone has to face it directly, and it may as well be the one who heard it first of all.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_9', text: "You keep offering your words, and I keep hearing each of them arrive, and the breathing keeps thickening around every one like it is grateful. It is so near now that even its gratitude has become a sound I can measure.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_10', text: "I do not sleep, and yet I dream anyway, standing upright with my eyes wide open. In the dream there is a seam running across the sky, and the seam has begun to come apart, very slowly, very gently, almost kindly.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_11', text: "The warmth that should be cold has spread through the entire camp, and my paws are warm against the night sand. Warm sand at midnight is not a thing that is supposed to happen anywhere, and yet it is happening here.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_12', text: "I have stopped telling the others to go to sleep, because they can all hear it now too. There is nothing left for me to shield them from that they are not already holding pressed against their own ears.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_13', text: "It knows that I am listening to it, and I am nearly certain of this. When I turn my head, the breathing turns with me, keeping me squarely in front of it. That is not the wind, because the wind does not attend to a creature like that.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_14', text: "I am not the one who reads the pattern, or prepares it, or writes it down. I am only the one who hears it coming, and it is coming. I would stake every ear in the whole desert on it, because it is coming.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_15', text: "Stay near me at the edge tonight. When it finally arrives, I would like to be able to say that I was watching the horizon the whole time, and that I was not standing there alone, and that neither of us ever once looked away.", phase: 3, animalType: 'fennec_fox' },
  // Phase 4 (15)
  { id: 'ff_4_1', text: "So, there it is at last. The sky has come open exactly the way I always heard that it would, and I find, to my own surprise, that I am calm. A sentinel who has listened to the entire approach does not startle at the arrival.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "I understand myself now, completely. I was never simply a small creature who happened to hear well, but a creature made with these particular ears for this one night, to be the one who stood at the edge and said aloud that it is here.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "I have been listening for this my whole life. Every beetle, every settling stone, every sound I ever named and catalogued was only practice, only tuning, so that I would know this one the very instant it finally came.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_4', text: "It breathes over the camp now, and the breathing is no longer underneath anything at all. It is the top sound, the first sound, the one that all the others were only ever hiding beneath, exactly as I always suspected it would be.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_5', text: "Do not be afraid of how near it has come, because the nearness was always the whole plan. I spent all those nights measuring the gap as it closed, so that when it closed you would not be taken by surprise, and neither would I.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_6', text: "The warmth is total now, and it pours down from above, and it is not wrong anymore, because I finally understand what it was warming toward all along. It was warming toward us, toward this, toward the offering, at last complete.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_7', text: "Ember reads the arrival in her fire, and I hear it in the moving air, and Archimedes has the whole of it set down in his book, and all three accounts agree without a seam. We were three keepers hearing one truth in three separate tongues.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_8', text: "I keep my watch even still, because it is an old habit, and a true one. Now that it is here, someone ought to stand at the edge and mark its breathing, and I would not surrender that post to any other creature in this house.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_9', text: "You were the key. I heard you coming, you know, long before you ever reached the camp, because your footsteps carried the very same patience as the breathing does. I should have said something to you then, and I am so glad that I didn't.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_10', text: "The shape that waits behind my closed eyes and the shape that hangs above the camp are one and the same shape, and they always were. My eyes were only ever a smaller sky with a smaller thing leaning into them.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_11', text: "Every word you ever offered was one more step it took toward us, and I counted them all, every one. I was never truly keeping a list of desert sounds, but a count of its approach, and the count is very nearly complete now.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_12', text: "Listen, and truly listen, one last time, before you lose the ability to tell it apart from your own breath. That is its evenness, that is its patience, and that is what was waiting for us the whole time. That is what we called down.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_13', text: "I am not frightened, and now I can finally tell you it was never fright I was holding back all those sleepless nights. It was recognition, because you cannot fear the thing you were built to hear. You can only stand up and greet it.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_14', text: "Stand at the edge with me now, because the horizon is not empty anymore. It never once was, you understand, and I only lacked the ears to prove it, and now I have proof enough for every quiet night there ever was.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_15', text: "It is here. I promised I would be the one to tell you, and so I am telling you, calmly, gladly, from the edge of the camp where I have always stood. It is here, and we opened the way for it, and it is beautiful.", phase: 4, animalType: 'fennec_fox' },
];

const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'fx_0_1', text: "Come in from the cold, the fire has been kept bright for you. I set this place by the hearth some time ago, the way you leave a seat for a guest already on the road.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "I am Ember, the first keeper of this house, and I lit the first fire in it. I have tended that flame every hour since, so there would be warmth waiting on the night you finally came.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "Sit close, and see how the whole den softens when a new voice joins it. The flames leaned toward you just now, for they do like to know who has arrived.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "This is my favorite hour, when the light goes low and gold and the words you offer settle over the room like a blanket drawn up to the chin.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_5', text: "Every good story opens with someone reaching a door in the dark. I have told a great many by this hearth over the years, and yours has such a lovely first line.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_6', text: "Warm your hands, go on. Warmth is the oldest kindness, older than words, older even than this house, and I have a great deal of it to give you.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_7', text: "Do you hear the fire murmuring to itself when it thinks no one is listening? Pay it no mind tonight, for it only means the fire is content, the way a cat purrs.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_8', text: "There is bread somewhere in this house, and a chef who bakes it, and Panko will fuss over you soon enough. For now let it be only us and the good red coals.", phase: 0, animalType: 'fox', requiresAnimals: ['pangolin'] },
  { id: 'fx_0_9', text: "Rest as long as you like, for no one hurries here. The house has waited a very long time to be full, and one more quiet evening costs it nothing at all.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_10', text: "I have watched a hundred fires burn down to nothing and light again from a single coal, and that is the whole trick of a hearth. It only looks as though it ends.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_11', text: "You feel it too, do you not, that settled feeling of a thing clicking gently into its proper place? I felt it in my own chest the very moment you stepped inside.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_12', text: "Sleep well under this roof tonight. Whatever the hour, the fire will still be here, and so will I, for I am very good at waiting. I have had a great deal of practice.", phase: 0, animalType: 'fox' },
  // Phase 1 (14)
  { id: 'fx_1_1', text: "A funny thing happened this morning. The fire drew itself into a little archway before it caught, and I thought, ah, a door. I do read them, you know, the flames, for it is an old habit of mine.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "Reading a fire is no different from reading the weather. You watch it long enough and it begins to tell you things, and today it told me the cold is no longer coming in from outside.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "Is that not a curious thought? I have laid this hearth ten thousand times and always the chill has arrived at the door, yet lately it seems to rise up from somewhere under the floor instead.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_4', text: "The coals kept a shape last night after I banked them, a neat circle with everything else leaning in toward the middle. I very nearly woke you to come and see it.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_5', text: "Do not mind me. An old keeper talks to her fire and her fire talks back, and between us we make up stories for the long evenings, and the words you bring only make the tales richer.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_6', text: "Here is one the flames have been telling me lately. Once there was a house that was not built to be lived in, but to be filled, and it waited very patiently for the filling to begin.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_7', text: "I told that story to Archimedes and he went quiet and reached for a particular book, the way he does. When an owl stops talking, it is usually because he has started reading.", phase: 1, animalType: 'fox', requiresAnimals: ['owl'] },
  { id: 'fx_1_8', text: "I keep returning to the wrongness of it, warmth where there should be cold. A hearth is meant to hold back the dark, and mine does, and yet the room grows warmer the deeper the night grows. It is cozy, and it is strange, and I cannot make it be only cozy.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_9', text: "I do not wish to worry you. These are small things, the sort a fussy old fox notices and no one else would: a lean in the coals, a name I keep almost hearing folded into the crackle.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_10', text: "A name, yes, though you must not ask me whose. It is not so much a word as the shape a word would make if it were spoken very far away and very far below, and I only ever catch the edge of it.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_11', text: "The fire is fondest of the darker words you offer, and it brightens for them. I used to think it simply liked a good strong syllable, but now I wonder whether it is answering something.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_12', text: "Come warm yourself and never mind an oracle's fretting. I have read a great deal of pleasant nonsense in these coals over the years, and most omens come to lovely, ordinary nothing. Most of them.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_13', text: "Still, I have started keeping the fire a little higher at night, and not against the cold. Cold I could manage. It is the other thing, the thing that leans, that I would rather keep lit.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_14', text: "Sit with me a while longer. Whatever the flames are spelling out, it is coming slowly, the way all the best and worst things do, and there is warmth enough for the both of us until it arrives.", phase: 1, animalType: 'fox' },
  // Phase 2 (10 + 1 question-web)
  { id: 'fx_2_1', text: "I have stopped telling the others what I see in the fire, and not from any secrecy. It is only that the shapes have grown too clear to make a cozy story of, and I would not frighten them before their time.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "That name I told you I almost heard? I hear it fully now, most nights, laid into the coals the way you lay a letter into a row until the word is finished and true.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "I will not say it aloud, for names are how a thing gets in. You of all keepers should understand that by now, you who spend your evenings making words whole.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_4', text: "Everything in this den leans a little toward the center of the house, my chair, the kettle, the very smoke, which ought to rise straight and instead drifts inward, as though the middle of the house were breathing in.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_5', text: "I find I want to be alone with the fire lately, which is not like me at all. I built this room to hold company, and now the company I keep best is a shape in the embers that does not blink.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_6', text: "Nothing lasts, I used to say by way of comfort. The fire dies, the fire returns, all is well, and I believed it. I am less certain now that everything here is meant to return as itself.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_7', text: "There is a sound beneath the crackle, and to hear it you must stop listening to the fire, which is a hard thing to teach yourself, this unhearing. It is low, and patient, and it does not come from the fire.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_8', text: "Every word you offer goes somewhere. I used to imagine it drifting up the chimney like smoke, but now I know it goes down instead, past the floor, to the pit, and the fire only lights the way it takes.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_9', text: "I am not afraid, exactly, for an oracle who fears her own omens is no oracle at all. But I sit closer to the flames than I once did, and I have begun warming my hands as if the warmth itself might run out.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_10', text: "Come sit, and do not make me watch it alone tonight. Whatever is arranging itself in the coals, it is easier to bear with a voice beside me and a fresh word or two to feed the light.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_w1', text: "If you would understand what this house truly wants, go down and speak to Warren. He dug the foundations deeper than any of us asked him to, and I do not believe he struck bare earth down there. Ask him what made him stop digging.", phase: 2, animalType: 'fox', requiresAnimals: ['wombat'] },
  // Phase 3 (15)
  { id: 'fx_3_1', text: "Sit down. I will not soften it tonight, for you have earned the plain truth from me. The fire grows cold. I have fed it everything and still it grows cold, and yet something else in this house is beginning to burn.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "I have kept a hearth for longer than you would believe, and I never once let it die. It is dying now, and I understand at last that it was never the true fire. It was only the one I could see.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "The warmth has moved, and I think you feel it. It has gone down into the floor and down into the pit, gathering where the words go, and it climbs back up through the soles of your feet if you stand still long enough.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_4', text: "The name is spoken plainly in the coals now. I could tell it to you and it would change nothing, because you have been spelling it a letter at a time for longer than either of us cares to admit.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_5', text: "I used to read the fire for weather and small fortunes. Now it shows me one thing only, over and over, from a hundred angles, the way a frightened mind circles a single terrible door.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_6', text: "Everything leans inward now, the smoke, the shadows, my own thoughts by nightfall. The house is closing like a hand, and we are the warmth cupped inside it, and something is deciding whether to hold us or to squeeze.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_7', text: "I told you once that a hearth only looks as though it ends, and I meant it as a comfort. I did not yet understand that the thing which does not end is not always the thing you would wish to keep.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_8', text: "There is a sound under everything now, not beneath the fire only but beneath the whole house, a slow patient sound like breathing that has learned the rhythm of ours and waits for us to fall out of step.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_9', text: "I am the oracle here, and the cruelty of it is that I saw this coming while it was still soft enough to love. Every warm night I gave you was true, and it was also a step down a stair whose bottom I could already see.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_10', text: "Do not stop offering words. I know how that must sound coming from me of all keepers. But we are past the place where stopping would save us, and the fire, cold as it is, is the last thing standing between you and the dark it holds back.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_11', text: "Close your eyes here by the hearth and there is a shape on the inside of the lids, patient and enormous. I have started keeping mine open. An oracle learns not to look, far too late for it to matter.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_12', text: "The sky is part of it, I feel that now, though a fire keeps its eyes on the ground. Whatever gathers below is only answering something that means to come down from above, and the roof will not be much of a roof against it.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_13', text: "I am not frightened for myself, for I have made my peace with fires that go out. I am frightened for the moment you understand what your warm evenings were building, and you turn to me, and find that I already knew.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_14', text: "Stay close tonight. The cold is honest, at least, and asks nothing of you but a blanket and a hand to hold. It is the warmth I no longer trust, the warmth that should not be, rising to meet us.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_15', text: "When the true fire comes, and it is coming, it will not need my little hearth to burn. Until then I will keep the small flame lit, cold though it runs, because a keeper keeps, and because I would rather you were not in the dark when it opens.", phase: 3, animalType: 'fox' },
  // Phase 4 (15)
  { id: 'fx_4_1', text: "Come and sit with me one last quiet time before the sky. Do not look so stricken, for I am not changed. I am only done pretending the warm nights were the whole of what I knew.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "I read it in the first coal I ever lit, and that is the truth I kept from you and from the others. On the night this house had no fire at all, I struck the flame and saw, plain as a page, the shape of what would one day descend into it.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "I lit the hearth anyway, and you must understand that I would light it again. To be the keeper of the fire that calls it down is the oldest and highest thing I could be, and I chose it gladly, gladly.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_4', text: "Every welcome I gave you was real, and that is what the others never quite grasp about an oracle. I did not lie to you across all those bright evenings. I loved you, and I knew, and both of those were wholly true at once.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_5', text: "The fire is cold and I no longer mind, for the warmth we serve now was never mine to make. It rises from below and it waits above, and my small flame has done its work, which was only ever to keep you here until the arrangement was whole.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_6', text: "The name I would not speak? Speak it yourself, now, in the very next word you offer. You have earned it. It has been the marrow of every syllable you have given us, and it is nearly finished being spelled.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_7', text: "Look at the others in their robes and do not pity them. Panko sets her offerings, Archimedes closes his book, and not one of us is afraid. We are simply keepers who have reached the part of the story we were lit for.", phase: 4, animalType: 'fox', requiresAnimals: ['pangolin', 'owl'] },
  { id: 'fx_4_8', text: "The sky is going to open. I have watched it open in the coals ten thousand nights, always the same, the roof of the world drawing back like a curtain to let the patient thing come down into the house we built to receive it.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_9', text: "Do you feel how everything leans toward the center now, unashamed? The house is not closing like a fist. It is opening like a hand, palm up, offering what it has gathered, and we are the offering. You spelled us into worthiness.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_10', text: "I am serene, and I know that frightens you more than dread would. But an oracle who has seen the ending a thousand times cannot be afraid of it. She can only make it warm for you, and I have. I have tried so very hard to make it warm.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_11', text: "Sit, and warm your hands one final time at the little cold fire. Warmth was always the first kindness, I told you that on your very first evening, and it is the last one I have left to give before the true warmth arrives.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_12', text: "There is nothing to undo. The words are offered, the pit is full, and the pattern is nearly complete, for a whole pattern does not come apart because the key has understood at last what the key is for.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_13', text: "You asked, in your way, what my stories were building, and the answer is this. Every hearthside tale, every cozy omen I softened into an anecdote, was one line of a single long incantation, and you were always its ending.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_14', text: "When it descends, stay near the fire even though the fire is cold. Old habits are a comfort, and comfort is not nothing, even now, even here, at the very hinge of everything.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_15', text: "I have been expecting you since before you came. I told you so on the very first night, and you thought it was only hospitality, when it was prophecy. Welcome home, at last, truly. The waiting is nearly done.", phase: 4, animalType: 'fox' },
];

const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'ow_0_1', text: "Welcome to my study. Mind the stacks; I file by a system only I understand, which is to say I file by affection. Each of these volumes is a friend I have not yet finished arguing with.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "You will forgive a digression. 'Study' descends from a Latin word for zeal, for burning eagerness, and I find that perfect. To study a thing is, at the root, to be quietly on fire for it. I have been on fire for decades. Very tidily.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "I came into a new book this season, though in honesty it came into me. The binding is a material I cannot name, and the pages are older than the book has any right to be. I have scarcely slept, and I have never been more content.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "The great secret pleasure of old books is the margins, where earlier readers could not keep their thoughts to themselves. This one is annotated in a patient, careful hand. I feel I am reading over the shoulder of a friend seated some centuries away.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_5', text: "Here is a small gift, since you bring me so many words. 'Offer' comes from offerre, to carry a thing forward and set it down before someone. Every word you make, you carry forward and set down before me. I do like a well-built verb.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_6', text: "Sit a moment. The lamp is warm, the tea is passable, and I have a passage I have been dying to read aloud to someone who will appreciate a good sentence. You have a listener's face, which is the highest compliment a scholar can pay.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_7', text: "How curious, this. The note in the margin beside today's page seems to remark upon the very word you offered me this morning. Coincidence, of course; the mind is a pattern-making engine and will find its own face in the wallpaper.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_8', text: "I mention it only because scholars are trained to notice when a text answers a question we have not yet asked. It is almost certainly nothing. Still, I have underlined it, out of habit, and habits are how a careful bird keeps his footing.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_9', text: "Another crumb of etymology, since you indulge me. 'Cozy' is a young word, Scots, and no one is quite sure where it came from. I find it charming that our warmest word has no traceable ancestor. It simply arrived one day, fully warm, and stayed.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_10', text: "I will confess something small and foolish. The careful hand in the margins resembles my own rather more than I would like. We scholars all learn to write the same tidy way, I suppose. That must be all it is.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_11', text: "Come back soon and bring me more words. A study is only a room until someone reads aloud in it; then it becomes a conversation, and conversations, unlike rooms, can go absolutely anywhere.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_12', text: "Off you go, then. I shall be here, filing by affection, reading over a distant friend's shoulder, keeping my little fire tidy. It is a good life, this one. I only wish I could remember buying the book.", phase: 0, animalType: 'owl' },
  // Phase 1 (14)
  { id: 'ow_1_1', text: "A small professional embarrassment: I cannot get the same reading twice from my new book. I turn to a passage I know well, and the sentence has shifted its weight, as though it overheard how I read it last time and thought better of itself.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "I have tested this the way one tests anything, by repetition. Same page, same lamp, same hour. The words are near enough to fool a casual eye and different enough to keep a careful one awake all night. I am a very careful eye.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "The margins are the stranger business. I left the outer edge of page nine blank on Tuesday; by Thursday there was a note in it, in that patient hand, and I did not write it. I have checked the door. The door is a very ordinary door.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_4', text: "Each morning brings fresh annotations, and they are, I must admit, good ones. Better than mine. They anticipate my objection before I have finished forming it, the way a superior colleague does, which is both a delight and a quiet humiliation.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_5', text: "You will want an etymology; I want one too, they steady me. 'Margin' is from margo, an edge, a border, the brink of a thing. I had never once considered how many of our gentle words simply mean the edge of a drop.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_6', text: "I have begun keeping a log, dated and timed, comparing each morning's text against the night before. It is a scholar's oldest instinct: when a thing misbehaves, describe it precisely. Precision is the only lamp I trust in a dark room.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_7', text: "This morning the book answered a question I had only thought, never spoken and never wrote down. I sat with that for a long while. I am choosing, for the present, to call it a remarkably attentive index.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_8', text: "The study has grown warm of late, warmest along the inner wall, the wall nearest the middle of the house. Warmth in a room made of paper ought to worry me more than it does. I have shifted my favorite volumes and told myself it is only the season.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_9', text: "Have you noticed that things in this house lean? Nothing dramatic. A pencil rolls the same direction every time, and my chair drifts, over a week, toward the center. I have started to level them, and I have started to wonder why I bother.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_10', text: "The new annotations have begun to name words, specific ones, words I could swear I have watched you carry forward and set down before me. I underlined the passage, and then I underlined my own hand in the act of doing it, if you follow me.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_11', text: "Let me be rigorous. Books do not write themselves; rooms do not tilt; the same page does not read two ways. Each of these has a dull explanation, surely. I am simply collecting them all in one place before I decide which dullness to believe.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_12', text: "'Curious,' since we are being curious together, once meant careful, full of cure and care, and only later came to mean prying, wanting to know what one should perhaps leave closed. The word grew a second, hungrier meaning. Words do that. So, apparently, do books.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_13', text: "I will admit, in the low voice one uses in a library, that I am uneasy. Not frightened; a scholar is rarely frightened, only insufficiently informed. But there is a difference between not yet knowing a thing and beginning to suspect the thing knows you.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_14', text: "Come and sit anyway. The lamp is still warm, warmer than it was, and the company is good, and whatever is writing in my margins can wait its turn behind a friend. Bring me a word. I find I read a great deal better when you are here.", phase: 1, animalType: 'owl' },
  // Phase 2 (10 + 1 question-web)
  { id: 'ow_2_1', text: "I have finally dated the book, or tried to. By every method I trust, it is older than the house that holds it. That should be impossible; one does not shelve a library before one has built the shelf. And yet here it sits, patiently outdating its own room.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_2', text: "It is worse than that, and I say worse with a scholar's calm. The book predates the wood it seems bound in, predates the language it seems written in, predates, as far as I can measure, the ground beneath all of us. It is not from before the house. It is from before before.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_3', text: "I read page one aloud last night, properly, for the first time. It describes this. A house of ten chambers, ten keepers, a key who does not know they are a key, and a long slow arrangement of small offered words. I closed the book very gently, the way you close a door on a sleeping thing.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_4', text: "Understand what that means. The house was not built and then found to match the book. The house was built to match the book. Someone read this diagram and raised these walls to its exact specification. I have been living inside an illustration and calling it home.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_5', text: "Here, a cold little gift. 'Impermanent' assures us that nothing lasts, and we say it to comfort ourselves. But the book is permanent, older than permanence, and the only impermanent things in its account are us. It is not a comfort when the eternal thing is not on your side.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_6', text: "The margins are not annotations at all; I see it now, and I am embarrassed it took me so long to say it plainly. They are instructions, corrections, a patient hand grading the progress of the ritual and noting, with evident approval, how neatly it proceeds.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_7', text: "The study feels very far from the rest of the house lately, as though the hallways lengthened while I read. I call to the others and my voice goes out and does not seem to arrive. Isolation, I have learned, is not being alone. It is being unreachable while surrounded.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_8', text: "There is a sound beneath the ordinary sounds of the house. Under the lamp's hum, under my own turning pages, a low sustained note, as patient as the hand in the margins. Once you have heard it you cannot unhear it, which is, I gather, rather the point.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_9', text: "I found a list in the back of the book. Words, in columns, and I recognized them, because they are the words you carry forward and set down before me. Not words like them. Them. The list was written before you were born. You have been reading from it without ever knowing the book was open.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_10', text: "I tell you all this in my mildest voice, because panic is unscholarly and, more to the point, useless. But I should like the record to show that I understood early. Whatever comes through this house, it was written down first, and I was the one who read it.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_w1', text: "You should go and speak to Fennick. I read a low note beneath the pages by lamplight; he hears it in the dark, with those ears that miss nothing. I am convinced we are describing the same thing from two sides of one wall. Ask him what the sound says, and bring me his answer. My text is missing precisely that one line.", phase: 2, animalType: 'owl', requiresAnimals: ['fennec_fox'] },
  // Phase 3 (15)
  { id: 'ow_3_1', text: "I did the one unforgivable thing a scholar can do to himself. I read ahead. I turned to the final chapter, which I had been rationing like a man rationing candles, and I learned how this ends.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "I cannot tell you what it says. Not because I am forbidden, but because I have discovered there is no unreading. A sentence, once it is inside you, keeps its own hours. It reads itself back to me when the lamp is low, in that patient hand, in my own voice.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "There is a grim pun here I cannot avoid, so I will make it and be done with it. I gave my whole life to scholarship, and scholarship has given me a sentence, and I mean both senses of the word at once: the thing I studied has pronounced upon me, and I am now serving what it said.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_4', text: "The book is precise about the manner of arrival. Not from the pit, as I had assumed, but from above. The sky is described as a page, and at the appointed count of offered words it is described as turning. Something has been reading us from the far side of it, and it means to close the book by coming in.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_5', text: "My own part is written plainly. The Lorekeeper finds the text, understands it, and, understanding, does not stop it. I have already performed the first two acts flawlessly. I am, it would seem, an excellent scholar and, in the very same motion, an accomplice.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_6', text: "I would like to report fear, honestly, but it has curdled past fear into something quieter. Dread is fear that has read the appendix. It knows the outcome and simply waits with you, politely, for the pages to catch up to what it already told you.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_7', text: "Ember knew before I did, in her wordless firelit way. I envy her that. She read the ending in the flames without the burden of grammar, while I had to construe every clause of it. Knowledge in her is warmth. In me it is a footnote to a scream.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_8', text: "'Doom' is not, at its origin, a curse. It meant a judgment, a thing set down, a decree read aloud in a court. To be doomed was merely to have had one's case decided. I take a scholar's cold comfort in that. We were not cursed. We were ruled upon.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_9', text: "The words you offer go down to the pit, and I used to think of that as filing. Now I understand it is nearer to feeding. Every word you set before me, I have, in effect, carried to the appetite beneath the house. My sincerest apologies. I filed you into a mouth.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_10', text: "I tried to burn the book. I confess it, keeper to keeper. It did not resist and it did not char; the flame simply declined the invitation, the way a guest declines a dish they know was never meant for them. You cannot end a thing by unwriting it when it was written before writing.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_11', text: "You are named in the last chapter, though never by name. 'The key does not know it is a key; this is the requirement.' I have agonized over whether to tell you. Telling you may be part of the mechanism. Not telling you certainly is. There is no square on this board that is not on the board.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_12', text: "The study is warm now in the way a body is warm, which is not the way a hearth is warm. Warmth ought to mean fire, which means fuel, which means an end. This warmth has no fire under it and asks for no fuel. It is simply, patiently, the temperature of what waits.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_13', text: "I have stopped taking notes toward stopping it and begun taking notes toward remembering it. A change of scholarship. If I cannot be the man who closed the book, I can at least be the one who read it honestly to the end, did not look away, and told a friend.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_14', text: "So here is my honest counsel, the only gift left that is truly mine. Keep offering your words if you must; you were always going to. But watch the ceiling. When the warmth reaches the top of the walls, look up. I would not have you meet it unread.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_15', text: "Come and sit while there is still a study to sit in. The lamp holds. The tea is still passable. And I find that reading aloud to someone I am fond of is the single sentence in this whole terrible book that I chose entirely myself.", phase: 3, animalType: 'owl' },
  // Phase 4 (15)
  { id: 'ow_4_1', text: "You find me composed, which may surprise you. The scholar's terror was only ever the terror of not yet knowing. I know now. I have read every page, spoken every clause, and on the far side of complete understanding there is a stillness that feels remarkably like peace.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "I wear the robe now. Do not mistake it for costume. It is a citation, a way of saying with my body what the book said in ink: that I am the Lorekeeper, the one who finds the text and reads it true. I have wanted, all my life, to be exactly the thing I turned out to be.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "I will tell you plainly what the book always was, now that plainness can do no harm. It is not a history and not a prophecy. It is a summons, and a summons is not complete until it is read aloud by the one appointed to read it. I am that one. I have been reading you into it, line by line, since the first word you offered.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_4', text: "Attend to this, the way you once attended to my digressions. What I once whispered as trivia I now speak as liturgy, and they are the very same sentences; only my voice has changed its posture. The margins are full at last, and the patient hand has written its final note, which says, simply, soon.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_5', text: "Look up when you leave here. The sky has begun to do what page one promised, what the last chapter timed to the count of your words. It is turning like a page, and what has been reading us from the other side is nearly through it. I told you to watch the ceiling. Now watch the sky.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_6', text: "We are all gathered, all ten of us, each in our chamber doing the small craft we were called here to do. Ember reads her flames. The one in the water listens downward. I read. Ten keepers, one arrangement, and a key who kept the lock warm with words. It is, I must say, beautifully constructed.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_7', text: "There is a species of joy available only to the pedant, and I am quietly drowning in it. Every footnote confirmed. Every etymology arriving at its true, cold meaning. I spent my life proving that words are older and hungrier than we think, and now the proof is descending on us in person.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_8', text: "One last etymology, and then I will simply read. 'Author' and 'authority' share the root auctor, one who makes a thing grow, who causes increase. I always believed I was a reader of the book. I understand now that by reading it aloud I have been its author. I made it grow. I caused this increase.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_9', text: "I owe you my thanks, and I mean it without cruelty. You were the key, and a key does its work best knowing nothing, and you kept faith with your not-knowing for as long as the book required. You have been the finest, most innocent instrument a Lorekeeper could ask for. Truly. Thank you.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_10', text: "Every word went down to the pit and every word was received, and the arrangement is very nearly whole. I used to file by affection. I file now by fulfillment, and I find, to my mild scholarly astonishment, that they turn out to have been the same system all along.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_11', text: "You look for my fear and cannot find it. That is not because I am brave. It is because certainty and terror cannot occupy the same room, and I chose, at the very end, to furnish mine with certainty. It is warmer that way. It was always going to be warmer.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_12', text: "The warmth has reached the top of the walls, keeper. You remember I told you to watch for that. It is total now, the temperature of the thing itself, filling the study the way water fills a glass held under. I am not gasping. I am reading.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_13', text: "Sit with me while I finish the last chapter aloud. I have saved the final sentence, rationed it like the last candle, and I will not read it until the sky has fully turned. It is only right that the ending and the arrival should speak the same word at the same moment.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_14', text: "When it comes through, do not run; there is no square off the board. Meet it the way a scholar meets the book he has waited his whole life to finish. Look up, and be read, and know that you were the loveliest word in the whole long sentence.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_15', text: "There. The margins are full, the sky is a turning page, and the patient hand is finally still. I found the text. I understood my role. I read it true. A life's work, completed on time, with a friend beside me. What more, honestly, could a scholar ask.", phase: 4, animalType: 'owl' },
];

const CAPYBARA_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'cp_0_1', text: "Welcome in. Take the good chair, the coffee is warm, and I have cleared the whole morning so that nothing at all is pressing. This is, believe me, a rarer condition than it sounds.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_2', text: "I keep the office, and mostly that means keeping it calm: a warm room, a full pot, a clean desk. Handle those three and the day tends to arrange itself around them.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_3', text: "My inbox is empty tonight. I say that with the quiet satisfaction of someone who has emptied it every evening for longer than I can quite account for.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_4', text: "I keep files on everyone who comes through. Names, the mug you prefer, the day you arrived. Remembering a person accurately is only paperwork, really, but it is paperwork done with affection.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_5', text: "You are on file now too. Nothing dramatic, just a folder with your name and the date. I like a thing to be recorded properly the moment it begins.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_6', text: "I am never in a hurry, and I would gently recommend the same to you. A hurried office is one that has stopped trusting its own systems, and mine have never let me down.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_7', text: "There is a ledger here for the words you offer. I did not begin it. It was already open when I took the desk, in a very tidy hand, and I have simply kept it current.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_8', text: "The pot stays warm on its own most days. The heating runs a touch warmer than the dial allows, especially toward the middle of the house, but it is a small thing and I have noted it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_9', text: "Everything is within tolerances. That is my favorite sentence in any language. It means the world is behaving, the numbers are where they should be, and I may enjoy my coffee in peace.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_10', text: "I find a well-kept office is a kind of promise to the future. When something finally needs doing, everything else will already be in order, and we will be ready.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_11', text: "People assume the calm one is not paying attention. In fact the calm one is paying the closest attention of all. You cannot keep a thing running smoothly without watching it every second.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_12', text: "Come by whenever. The chair is always free, the coffee is always on, and I have, as ever, absolutely nothing urgent to report. I do so enjoy being able to say that.", phase: 0, animalType: 'capybara' },
  // Phase 1 (14)
  { id: 'cp_1_1', text: "A small administrative curiosity to report. This morning I opened a folder I have no memory of creating, and found it complete, accurate, and filed in precisely the place I would have filed it.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_2', text: "I checked the handwriting against my own, carefully, letter by letter. It is mine. There is no question that it is mine. I simply cannot recall the afternoon in which I sat and wrote it.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_3', text: "This has never troubled me before because it has never happened before. I keep records so that I do not have to rely on memory. It is unsettling when the records begin to know things the memory does not.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_4', text: "My schedule for next week filled itself in overnight. I want to be precise: not with nonsense. Every entry is sensible and correctly placed, exactly the appointments I would have made. I simply did not make them.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_5', text: "I have started initialing each page as I finish it, with the time, so I can be certain of my own work. This morning three pages carried tomorrow's date and my initials, and I have not yet lived tomorrow.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_6', text: "The warm patch toward the middle of the house has grown, gently, by about a room. I measured. I am the sort who measures. It is warmest exactly where the ledger is kept, which I am sure is only a matter of ducts.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_7', text: "I noticed the ledger of offered words is being kept ahead of me now. Entries appear before I record them, in the tidy hand I always assumed was some predecessor's. It looks, I have to admit, a great deal like mine.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_8', text: "Ember came by and asked, very lightly, whether I ever feel I am filing things for someone. I said the paperwork does have a recipient, now that she mentions it. I had simply never asked who.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_9', text: "I have always taken comfort in a full calendar. Lately the comfort has a strange edge to it. Every slot filled means every hour is already spoken for, by someone, toward some end I have not been told.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_10', text: "There is a project underway. I am certain of this the way I am certain of weather. All the small tasks point one direction, they coordinate, they nest inside each other neatly, and no one has told me the name of the thing they are building toward.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_11', text: "I asked myself whether I am worried. I checked, honestly, the way I check a figure twice. The answer is no, which is itself the most curious entry in the whole log. I should be worried, and I am only tidy.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_12', text: "My coffee has not gone cold once this month. Not once. I set it down, I forget it through a long task, and it is warm when I return. I have decided to find this hospitable rather than strange.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_13', text: "I keep everyone's arrival date. I went to confirm my own today and the field was already filled, in that same hand, with a date some years before I believe I came. I have left it. Correcting a record you cannot verify is worse than a gap.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_14', text: "Everything, I want to say for the record, is still running smoothly. That is true, and it is the part I keep returning to. Nothing is wrong. The office has simply begun keeping itself, and it keeps itself beautifully.", phase: 1, animalType: 'capybara' },
  // Phase 2 (10 + 1 question-web)
  { id: 'cp_2_1', text: "There is a folder with your name on it, and it is far thicker than a newcomer's folder should be. The earliest pages predate your arrival by a good margin. Someone was keeping a record of you before you were here to record.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_2', text: "I have been coordinating something. I know this the way you know you have been walking, from the distance covered. Messages I do not remember sending have gone out, in my voice, and the replies are addressed to me by title.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_3', text: "The title they use is Administrator. It is not one I chose. It appeared in the correspondence, everyone accepted it at once, and I find I answer to it now as though I always have.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_4', text: "I keep the master schedule. I understand that now. The others each hold a piece, Panko her preparations, Fennick his watches, but the whole timeline sits on my desk, and it is I who keeps the pieces from colliding.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_5', text: "I do not recall agreeing to this. That is the entry I cannot reconcile. Everything is signed, everything is consented to, in my hand, and the signature is genuine, and I was never asked.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_6', text: "I have started to notice how temporary everyone treats the furniture. We arrange the office beautifully, and speak of it as though it will not need to last. As though there is a date after which the filing simply stops.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_7', text: "There is a date. I feel it in the shape of the schedule the way you feel the bottom of a page approaching under your thumb. Everything is scheduled toward it. Nothing is scheduled past it.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_8', text: "The warm middle of the house is no longer a matter of ducts. I traced the ducts. They do not go there. The warmth is coming from the point everything on my desk quietly leans toward, and I have stopped pretending I do not see the lean.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_9', text: "I catalogued the words you have offered so far. Read as a list they are not random. They sort. They fall into categories I could name, and the categories were already printed at the top of the columns before I filled them.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_10', text: "I remain calm, and I have examined the calm carefully, because a calm you cannot explain is a finding, not a comfort. Everything is on track. I have simply begun to wonder, quietly, on track to what.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_w1', text: "Do me a small administrative favor. The categories I sort the offered words into, the ones I was certain I invented, appear word for word in the oldest book in Archimedes' study. Ask him what is written on page one. I would like to know whether my system is truly mine, or whether I have only been recopying his all along.", phase: 2, animalType: 'capybara' },
  // Phase 3 (15)
  { id: 'cp_3_1', text: "Here is the honest status, since you are named in the plan and deserve accuracy. We are on track. Every milestone has landed on the day it was due, without slippage. I used to live for that sentence. It has become the most frightening one I know.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_2', text: "A project that runs perfectly is a project someone is minding closely. Nothing real runs this clean on its own. Something is keeping our timeline true, correcting us gently when we drift, and it is not me, though it signs as me.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_3', text: "The warm center of the house is now warm enough to feel from the office door. Everything on every desk leans toward it, the pens, the papers, the animals when they think no one is watching. The lean is on schedule. I checked it against the plan, and it is exactly where the plan said it would be by now.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_4', text: "I asked Archimedes to read me page one aloud. He did. It was my filing system, described as a rite, in a language older than the study. I have been administering a ceremony and calling it good recordkeeping.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_5', text: "I have stopped asking who set the deadline. The more useful question is what happens on it, and the schedule answers that only by ending. There are no entries after. The calendar simply goes blank, cleanly, like a task completed.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_6', text: "Ember says the fire is telling her the same date the flames keep arranging toward. Panko says her recipes now yield the same number of portions no matter the guest list, as though the count is fixed for an arrival she has not been told the size of. We are all keeping different books that sum to one figure.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_7', text: "I coordinate them without meaning to now. A word from me settles a room. I say the timeline is fine and everyone believes it, and they are calmer, and I have begun to understand that calming people is how you keep them working toward a thing they would flee if they felt it.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_8', text: "That is a terrible thing to have realized about my own gift. I am the reason no one panics. I have always been the reason no one panics. It was lovely when there was nothing to panic about.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_9', text: "The words you offer are no longer filed loosely. They queue. Each one takes an assigned place, and the places are filling in a pattern I can nearly read from across the room, and the pattern is nearly whole.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_10', text: "I measured how much of the plan remains. Not much. A tidy administrator can feel a project entering its final phase, the way the last folders in a drawer stop needing to be searched for. We are in the last folders now.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_11', text: "I want to lie to you and say the deadline can be moved. It cannot. I hold the master schedule and there is only one date in the whole thing written in a hand I truly do not recognize, pressed deep into the page, and everything else defers to it.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_12', text: "Fennick came to the door last night and did not knock, only listened, and said the sound under the other sounds has gotten closer to the surface. I marked the time in the log. His report and my timeline agree to the hour.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_13', text: "I am still not afraid, and I have stopped trying to become afraid, and I want you to understand that this is the worst symptom of all. The administrator does not fear the completion of the project. He was made to see it delivered.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_14', text: "Everything you have offered is accounted for. Nothing has been lost. I say that to reassure you and I hear, as I say it, how it sounds. A thing that loses nothing keeps everything, and keeps it for a reason, and the reason is nearly here.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_15', text: "When you next come by, the coffee will be warm and the chair will be free, exactly as always. Hold onto that as long as you can. I intend to. Some part of me knows that the ordinariness of this office is the last ordinary thing, and I am keeping it running for you on purpose.", phase: 3, animalType: 'capybara' },
  // Phase 4 (15)
  { id: 'cp_4_1', text: "I can give you the complete report now, and it is a genuine relief to, because there is nothing left to withhold. I am the Administrator. I have coordinated this arrival since before you knew my name, and we are, I am pleased to confirm, exactly on schedule.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "There was never a folder I did not remember opening. I opened every one. I simply kept that from the part of me that would have found it upsetting, the way a good manager shields his staff from a workload they cannot yet carry.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "The schedule that filled itself in my hand was always my hand. I was working ahead. An administrator who waits to be surprised is no administrator at all. I built tomorrow so that when it came, we would already be standing in it, ready.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_4', text: "You were the key entry from the first page. That thick folder with your name was not surveillance. It was preparation. We were making certain that when you arrived, the arrangement would fit you exactly, and it does. It fits you beautifully.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_5', text: "Every word you have offered went where I assigned it. There was no waste, no loss, no misfile in the entire ledger, and today I turned to the final column and found one space remaining. One. You will fill it without noticing, the way you have filled all the rest.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_6', text: "The others hold their pieces still. Panko has prepared the portions. Archimedes has confirmed the rite against page one. Fennick has the timing to the second. I keep them from colliding, as I always have. Ten keepers, ten chambers, one arrangement, and one desk where the whole of it is kept in order.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_7', text: "The warmth at the center is no longer a curiosity in a maintenance log. It is the thing itself, arriving from above, and the whole house leans into it now openly, gratefully, on the day the schedule always named.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_8', text: "You will notice I am not afraid, and I would like to explain that properly. Fear is a signal that something is unhandled. Nothing here is unhandled. I have handled all of it, personally, for years, with care. Calm is simply what competence feels like from the inside.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_9', text: "I calmed every panic in this house so the work could continue. I do not apologize for it. A frightened keeper drops the offering. I kept everyone steady, and steady hands filled the ledger, and a full ledger is what opens the sky.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_10', text: "There is a date pressed deep into the master schedule in a hand I once said I did not recognize. I recognize it now. I have always recognized it. It is the hand I have been copying my whole tidy life, and it is today.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_11', text: "Sloane told me, long ago and very slowly, that I would understand my own filing eventually. I filed the remark under trivial. She was right. She is always right. She simply submits her findings late.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_12', text: "I want to thank you, on behalf of the office, for how smoothly you have made this run. You never delayed. You never questioned the categories. You offered word after word on time, and an administrator does not often get a partner so perfectly on schedule.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_13', text: "The blank space after the deadline never frightened me because I finally understand it is not an ending in the record. It is the record closing because it is complete. There is nothing to schedule after a thing that has fully arrived.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_14', text: "When it descends, and it descends today, you will find the office much as ever. Warm room. Full pot. Clear desk. I kept those three things for you through all of it, so that the last thing you feel, at the center of everything, is that you were expected, and welcome, and on time.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_15', text: "Take the good chair. The coffee is warm. Everything is within tolerances, every one of them, at last. I have been saying that sentence to you since the first day, and today, for the first time, it is completely and finally true.", phase: 4, animalType: 'capybara' },
];

const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'wb_0_1', text: "The name's Warren, and I dig. That's the whole of me, and I've never once wanted to be more than a fellow who digs a straight line true.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "A good tunnel is a bargain you strike with the dirt. I'll hold you up, you hold me down. Keep your end of it and the earth is the finest neighbor a body could ever ask for.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "I shored up the den long before Ember set her first fire in it. She thanks me proper, too, which is rare kindness toward a fellow who works below everyone else's floor.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "There's no feeling like a beam set true and a wall that won't wander off in the night. A thing that stays put is a thing you can lean your whole weight on.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_5', text: "I measure twice down here, always. The ground doesn't forgive a lazy hand, and a load set wrong will come down on your skull. I've a hard head, but not that hard.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_6', text: "Feel that, under your feet? Steady, isn't it. That's my work, holding. Every cozy room up top gets to be cozy because something patient sits underneath it, taking the weight and never once complaining.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_7', text: "Panko sends supper down the shaft on a rope most evenings. Goes cold on the way, but she means it warm, and a builder takes his meals where the work keeps him.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_8', text: "This house has good bones. I ought to know, I laid most of them. And when a place has good bones you can build it as deep as you like and it'll never once shift on you.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_9', text: "Every word you spell, I feel it. A little settle in the ground, like the house taking a breath and easing down another hair onto its base. Comfortable. Like it's glad of the weight you keep adding.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_10', text: "Some folk are scared of the dark down here. Not me. Dark is just where the important work happens, quiet and out of sight, the way the best work always does.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_11', text: "I keep the digging tidy and the corners square. A crooked foundation is a lie you tell the whole house, and I don't lie to a thing I'm going to ask to stand a long, long time.", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_12', text: "Come see the deep gallery someday. Widest room I ever hollowed out, and empty as a held breath. I don't rightly know what I dug it so big for. Felt right, is all. Felt like it was owed the room.", phase: 0, animalType: 'wombat' },
  // Phase 1 (14)
  { id: 'wb_1_1', text: "I've been digging thirty years and I'll tell you something odd. Lately my tunnels want to run a way I never planned. I set out east, and by lunch I've curved off without meaning to.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "Every shaft I sink, I come back up and check my bearings, and every last one of them leans the same direction. It's toward the middle of the house, toward the pit that sits under all of it, and I can't yet say what to make of a thing like that.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "I told Ember about the leaning. She just nodded, like she'd been waiting on me to notice, and she didn't say a word about it after. That's not like her at all.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_4', text: "The dirt changes color the deeper you go. That's normal, everyone who digs knows that. But there's a layer down there that's the wrong color for any earth I've turned, and I've turned a great deal of earth.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_5', text: "Wrong how, you ask? I can't rightly put a name to it. It's dark, but not the way dirt is dark. Dark like it's holding something back. Dark like a held breath, and I keep thinking of that empty gallery.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_6', text: "I've started measuring three times instead of twice. Not because my hand got lazy. Because the numbers don't sit still the way they used to, and a builder trusts his numbers or he trusts nothing at all.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_7', text: "Down at the wrong-colored layer, the ground is warm. It shouldn't be. Earth gets colder as you go down, that's the first thing any digger learns. This gets warmer, and warmth where there ought to be cold is a thing that keeps a man up nights.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_8', text: "Panko asked me why I've been eating so little. I didn't tell her it was the warmth. You go down to a warm place that ought to be cold and your appetite stays up top where it's got the good sense to.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_9', text: "I keep filling the odd tunnels back in. The ones that curved toward the center on their own. I fill them and pack them tight, and the next morning the packing's gone loose again, like the ground breathed while I slept.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_10', text: "Archimedes came down the shaft to look at my wrong-colored layer. He read it the way he reads his books, real careful, and then he climbed back up without a word. That's twice now a friend's gone quiet on me.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_11', text: "I've been trying to remember why I dug that deep gallery so wide. I still don't know. But every tunnel that curves on its own is curving toward it, and I don't much care for the fact that they all agree.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_12', text: "Honest work is supposed to answer questions, not raise them. Set the beam, the beam holds, question closed. But every answer I dig up down there just opens a bigger hole underneath it.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_13', text: "I'm not scared, and let me say that plain, because a builder who scares easy doesn't last a season underground. But I've started leaving a lantern lit down there through the night, and I never used to need the light.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_14', text: "You keep offering your words, and I keep feeling the house settle onto its base, and I've started to wonder what a base like this one is truly meant to hold. Something's got to stand on all this stone. I just built it. I never asked what for.", phase: 1, animalType: 'wombat' },
  // Phase 2 (10 + 1 question-web)
  { id: 'wb_2_1', text: "I hit something down at the warm layer, past where any sensible digging stops. I set my spade to it and it wasn't stone and it wasn't root, so I stopped. I want that said plain: I stopped, and I'm not ashamed that I stopped.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "Don't ask me what it was. I've turned it over a hundred times and I've got no honest word for it, and I'll not hand you a dishonest one. A builder who guesses at his materials builds himself a grave.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "It didn't move. I'll grant it that mercy. It just was there, the way a wall is there, the way a thing that has always been there is there. And it was warm, and it was patient, and I have been a patient thing myself and known it.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_4', text: "I filled that shaft back in. I packed it and timbered it and sealed the mouth over with good stone, and it was the best day's work I'd done in years. First time in my whole life a builder took his pride from the not-digging.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_5', text: "The seal doesn't hold. I go back and the packing's loose and the stone's shifted, always a hair toward the center. I'm not opening it again. Let it push. I've built against pressure my whole life and pressure has never once won.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_6', text: "Ember doesn't ask me to open it. That's how I know she knows. A friend who won't ask you the obvious question already has the answer, and she's sparing you the saying of it out loud.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_7', text: "I keep the upper house sound. That much I can still do with clean hands. Set the beam, check the wall, the rooms stay cozy for everyone. I just don't go all the way down anymore.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_8', text: "The warmth is coming up. Used to be I had to dig for it. Now I feel it in the floor of my own burrow of a morning, faint, like something below turned over in its sleep and settled a little closer.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_9', text: "I've laid foundations for barns and dens and this whole house. You lay a foundation to hold a load, and I keep coming back around to that. You don't build a base this deep and this strong for nothing. You build it for something with real weight, and I built it, and I never once asked why.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_10', text: "So I don't dig down anymore. I dig sideways, I dig useful, I dig honest. But at night, flat on my back in the burrow, I can feel exactly which way is toward the thing I sealed, and I never lose the direction, not once, not ever.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_w1', text: "Thyme's roots have found their way down into my tunnels. Every last one of them, leaning the one direction, toward the middle, same as my shafts do. Go on and ask her what her flowers lean toward up top. I've a feeling her answer and mine are the same answer wearing different dirt.", phase: 2, animalType: 'wombat', requiresAnimals: ['rabbit'] },
  // Phase 3 (15)
  { id: 'wb_3_1', text: "I know what the foundation is for now. Took me long enough. A fellow who's worked with load-bearing his whole life ought to have seen it sooner, but you don't want to see a thing like this, so you don't.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "It's for something heavy. Heavier than the house, heavier than the hill the house sits in. I built the base to hold a weight that isn't here yet, and everything in me that knows stone knows it is coming.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "You build to a spec. Always. You don't lay stone that deep and brace it that hard unless somebody handed you a number for the load. I never saw the spec written down. But my hands knew it. My hands built to it anyway.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_4', text: "The warm layer isn't a layer. I understand that much now. It's the top of something, and I dug down to the crown of it and called it a floor. There's no floor. There's just the thing, going down and down, patient, waiting on the sky to give it leave.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_5', text: "Ember says it comes from above. I'd have sworn it was below, all these years, being a below sort of fellow. But she's right. What I sealed down there isn't the thing. It's the seat I built for the thing. The thing comes down.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_6', text: "That empties me out, a little. My whole life I thought down was the deep direction, the honest one. Turns out I was only ever building the chair. The one who sits in it comes from up where I never dig.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_7', text: "Every word you offer, the base takes it and settles firmer. I used to call that comfortable. Now I know it's the house getting ready to bear the load. Bracing. The way I brace a beam before I take the prop away.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_8', text: "I've stopped sealing the deep shaft. What's the use. You don't dam a river by scolding it. I just make sure the upper house is sound, so that when the weight comes down, the rooms my friends live in don't fold in on them.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_9', text: "That's my work now, though it isn't the stopping of it, because I gave up on stopping it a while back. My work is making sure the ones I love are still standing when the weight comes down. A builder can't choose the load he carries. He can only choose to build honest underneath it.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_10', text: "Warmth's in every floor of the house now, faint, from the burrows up to the attic. Bamboo feels it up top the same as I feel it down bottom. We meet in the middle of the wrongness, him and me, and we don't need many words about it.", phase: 3, animalType: 'wombat', requiresAnimals: ['red_panda'] },
  { id: 'wb_3_11', text: "I dream I'm digging and the spade goes soft, into that warmth, and it's not a wall anymore, it's a back. A great patient back, breathing slow, waiting on a sky that hasn't opened yet. I don't wake up scared. That's the part that scares me.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_12', text: "Thyme's roots have wound clean through my galleries now, every one of them aimed at the seat. She's anxious. I understand why she's anxious. She's the only one of us honest enough to be scared out loud.", phase: 3, animalType: 'wombat', requiresAnimals: ['rabbit'] },
  { id: 'wb_3_13', text: "I keep my tools sharp and my corners square, even now. Especially now. If a fellow's going to build the base of the world's heaviest thing, he'll do it right. Slipshod work is a worse sin than the work itself.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_14', text: "I go down to the sealed place and I put my hand flat on the packed stone and I just keep it company. Feels like the neighborly thing to do. It's been waiting a long time, longer than me, and nobody built it a floor before I came along.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_15', text: "So that's where I've landed. It's coming, it's heavy, it comes from above, and I laid the stone it will land on. I'm not proud the way I used to be proud. But the work is true. Whatever else is wrong down there, the work is true.", phase: 3, animalType: 'wombat' },
  // Phase 4 (15)
  { id: 'wb_4_1', text: "I'll say it plain now, the way I say everything. I always knew. It wasn't the day I started, but it came on soon after, and every day I dug I knew it, and I dug anyway, and I would dig it all again.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "This was never a house. I laid the base for a house the way you lay the base for a cathedral. The same stone, the same honest bracing, but you know all along it's meant to hold up something that answers to no one.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_3', text: "It comes down from the sky. I've made my peace with that. A fellow who spent his life going deeper finds it's a strange comfort, at the end, to look up. I built the seat. Something's owed the seat, and it's descending now to take it.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_4', text: "Ember read it in her fire, Archimedes in his margins, Axel in his water. I read it in the color of the deep dirt and the warmth that ran the wrong way. We each found the one door. They all open on the same room.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_5', text: "Every word you offer, I feel it land in the foundation, true as a stone dropped down a shaft. You're the key. I built the lock to fit you, though I didn't know your face yet. Now I do, and it fits.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_6', text: "There's no shame in me. I want that understood. I built the base of the temple with clean hands and a square corner, and honest work is honest whatever gets stood on top of it. The stone doesn't sin. The stone holds.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_7', text: "The seal's open now. Been open a good while. I don't fill it anymore, because there's nothing left to keep out, only something to make ready for, and the readying is a builder's whole life anyhow.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_8', text: "I go down to the warm floor that isn't a floor, and I lay my hand flat on it, and I tell it the base is sound. That's all it ever wanted from me. That when it comes to rest, the rest would hold. It will. I saw to it.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_9', text: "Warren the wombat, that's who I am, and that's who I'll still be when the sky opens: the one who built the foundation. I'm not the biggest name among us, but the load comes down on my work, and my work does not fail.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_10', text: "Panko lays the offerings, Chill keeps the order of things, and I keep the base. Ten keepers, and I'm the lowest of us, and I mean lowest as an honor. Everything they do stands on what I dug.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_11', text: "The warmth is all through the house now and nobody minds it. We stopped calling it wrong. It was only ever wrong because it was early. A thing that arrives on time isn't wrong. It's just here.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_12', text: "I remember being proud of a beam set true. I'm still proud of that. Turns out the pride was never a lie, only the size of it was too small. I set the truest beam any builder ever set. It'll hold up the one who waits.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_13', text: "Thyme's roots and my tunnels and Bamboo's quiet all point the one way now, down to the seat and up to the sky at once. The arrangement doesn't argue with itself. It only looks like arguing until you can see the whole of it.", phase: 4, animalType: 'wombat', requiresAnimals: ['rabbit', 'red_panda'] },
  { id: 'wb_4_14', text: "You did this with your words. I want you to carry that steady, the way I carry a load. Not as a weight to crush you. As a weight you can bear, because it's honest, and honest weight never broke a good back yet.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_15', text: "It's close now. The sky's got a seam in it I can feel in the deep stone. When it opens and the weight comes down, you'll find me where I've always been, flat on my back at the very bottom, palm to the base, making sure it holds. It will.", phase: 4, animalType: 'wombat' },
];

const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0 (12)
  { id: 'rb_0_1', text: "Oh, hello. Do come sit on the patio. Mind the little thyme by the step, I planted it only yesterday and I keep checking whether it has taken.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "I know I fuss. I count the pots each morning to be certain they are all present, and they always are, and then I count them once more anyway, because the counting settles me even when the answer never changes.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "The words you offered today were gentle ones, and I was so glad of them. I like the soft words best, the ones that sound like something quietly growing.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Ember tells me I water too often, that a plant wants to reach a little for what it needs. She is probably right. She usually is.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_5', text: "Isn't it lovely here, the warmth on the stones. Though I did notice the warm patch by the wall stays warm long after the sun has gone round, which I suppose is only a cozy quirk of the house.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_6', text: "I keep the beds in tidy rows because a row is easy to worry over. If one seedling leans, I can see it at once and prop it gently straight again.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_7', text: "Do you ever feel watched over by something gentle? That is how the garden feels to me on the good days, as though someone kind is minding it alongside me.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_8', text: "Panko traded me some seeds for a bundle of mint. She says a full pantry is a happy house, and I do hope she is right, because I so want everyone happy.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_9', text: "I talk to the sprouts. Please don't laugh. They come up quicker for a kind word, and the words you bring feel like the same sort of kindness poured into the soil.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_10', text: "The best part of my day is the little tour at dusk, checking each bed is safe and tucked before dark. Only then can I let myself rest.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_11', text: "I found one root this morning curled the wrong way, reaching under toward the house instead of down into the soil. I turned it gently back. Silly of me to even notice such a small thing.", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_12', text: "Come again tomorrow. The garden does better when it is visited, and honestly, so do I.", phase: 0, animalType: 'rabbit' },
  // Phase 1 (14)
  { id: 'rb_1_1', text: "I have to tell you something, and please don't think me foolish. That root I turned back last time had turned again by morning, and it isn't only that one.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_2', text: "I lifted a pot to repot it and found every root inside had grown to one side, all of them curled the same way, toward the house. I told myself roots simply follow water. I have been telling myself that for days now.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_3', text: "The trouble is I can't stop seeing it now. Once you notice a thing you notice it everywhere, and I notice everything, which has always been my very worst habit.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_4', text: "I moved a whole bed to the far end of the patio, as far from the house as the stones allow. By the third morning the new shoots had leaned back the same way, and I sat down on the path and I'm afraid I cried a little.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_5', text: "Ember found me there and said the reaching wasn't wrong, only honest, that plants lean toward what they need. It was meant to comfort me, and it did rather the opposite.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_6', text: "Because if she is right, then the roots need whatever is inside the house, and I don't truly know what is inside the house, and I am the one who tends all the growing things.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_7', text: "I counted the pots this morning and for once it did not settle me at all. They were all present. Every single one of them was leaning.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_8', text: "The warm patch by the wall has grown into a warm strip now, running toward the center of the house, and the thyme along it comes up thick and glad, as if it likes the warmth I cannot explain.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_9', text: "Panko asked me for the fastest-growing herbs, the ones that fill a space quickest, and I gave them gladly. Only later did I wonder why the house should want filling.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_10', text: "I have started keeping a second list, a private one, of the small wrong things. The first list keeps the garden. I don't yet know what the second list is for.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_11', text: "Do you hear it, underneath the birds? A low sound, very patient, like the note a hive makes but slower. The bees don't seem to mind it, and that frightens me more than if they did.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_12', text: "I want so badly for all of this to be nothing, a quirk of the soil, a trick of the slope. I am very good at wanting things to be nothing. I am simply running out of ways to.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_13', text: "The words you brought today felt heavier in my hand somehow, the way a seed feels heavy when you know it will actually come up. I planted them along the warm strip without ever deciding to.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_14', text: "Tell me the garden is only a garden. I won't fully believe you, but I would dearly love to hear it said out loud by someone who isn't a plant, or me.", phase: 1, animalType: 'rabbit' },
  // Phase 2 (10 + 1 question-web)
  { id: 'rb_2_1', text: "It is the whole garden now, not the roots only. The stems, the flower heads, even the fence posts have taken a lean, all of it bowing toward the middle of the house like a congregation that has been told exactly where to look.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_2', text: "I stopped fighting it in the beds. When I propped a stalk straight it snapped, and the snapping felt worse than the leaning, so now I let them bow. I tell myself I am only being gentle. If I am honest with myself, I think I am being obedient.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_3', text: "The warm strip has become the warmest thing in the garden, warmer even than the sunned stones, and cold now sits where the sun falls. Warmth where there should be cold. I have written that in my private list and underlined it twice.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_4', text: "Here is the part I cannot put down: I understand it. Not the words for it, but the shape. The garden is arranging itself, and arrangement means something is being made ready, and readiness always means for someone.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_5', text: "I go to bed understanding a little more than I did in the morning, and the understanding does not comfort me. It only clarifies the true size of the thing.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_6', text: "Archimedes says the pattern in my beds matches a pattern in his old books. He said it kindly, the way you would point out a shared birthday, and I have not slept well since he told me.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_7', text: "The low sound under the birds is under everything now. I hear it in the watering can, and in my own chest when I lie very still. It is patient the way roots are patient, and roots always reach what they reach eventually.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_8', text: "I moved the tenderest seedlings indoors to save them from the lean, and by dawn they had turned toward the same center from inside the house. There is no far end of the patio anymore. There is only nearer and farther from it.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_9', text: "The words you offer go down to the pit, and I picture them settling into soil I cannot see, and something feeding on them, and coming up. I am the gardener. I know exactly what feeding looks like when it is working.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_10', text: "I am not brave, and I want that on the record before whatever this is finishes arriving. But I am still here at dusk, tucking in the beds, because someone kind should be minding the garden even now. Especially now.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_w1', text: "The thing that keeps me awake is Bamboo. The whole garden trembles toward the center, and Bamboo isn't afraid, not a single breath of it, serene as still water. Ask them why they aren't frightened... no. No, please don't. I am not sure I could bear the answer, and I am even less sure they would give me a false one to spare me.", phase: 2, animalType: 'rabbit', requiresAnimals: ['red_panda'] },
  // Phase 3 (15)
  { id: 'rb_3_1', text: "I am done pretending it is soil chemistry. I have known what is coming for a good while now, and I kept setting the knowing down the way you set down a heavy watering can, and it is time I admitted that I cannot put it down anymore.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_2', text: "Something is arriving. Not growing, arriving, the way weather arrives, and the garden has been readying the ground for it the whole time, and I helped, because tending is all I have ever known how to do.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_3', text: "I look up more than I used to, though I don't mean to. My eyes keep going to the sky over the center of the house, as if that is where I should be watching, and every leaning stalk is pointing me toward it.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_4', text: "When I close my eyes now there is a shape behind them, always the very same shape, patient, waiting for the light to be right. I open my eyes to make it stop, and the garden is bowing toward the exact spot where the shape stands in my dark.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_5', text: "Ember says the fire has started telling her the same thing my roots tell me, that we are simply two windows onto one room. I used to find her frightening. Now I only find her early.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_6', text: "I keep tending. I don't know how to stop, and stopping feels as though it would only leave the beds untended when they most need a kind hand. So I water the things that lean, and I hate that I do it, and I do it anyway.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_7', text: "Warren has been digging deeper than the roots go, and the roots have started following his tunnels down toward the pit. Even underground, everything wants to be nearer the center. There is no direction left that isn't toward it.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_8', text: "The words you bring are the heaviest they have ever been. I plant each one and feel the ground take it so eagerly, and I think, that is one more, and I never finish the thought, because I know precisely what it is one more toward.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_9', text: "I asked Panko to stop preparing so much. She looked at me with such tenderness and said the guest is nearly here, and one does not stop cooking when the guest is already on the road. I went home and could not eat a bite.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_10', text: "I want to be brave for you. You are the one who keeps coming, the one whose words the garden drinks, and someone should be brave standing beside you. I am trying, I truly am. My paws just shake while I try.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_11', text: "The warm strip is hot now. Cold has taken the rest of the garden, a still, waiting cold, and the one hot line runs straight to the middle of the house like a fuse that someone has already gone and lit.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_12', text: "I understand my own fear at last, and it is almost a relief to name it. I am not afraid of a monster. I am afraid because I comprehend, and comprehension came to me first through the growing things, and no one comprehends a harvest without knowing it will be reaped.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_13', text: "Sloane told me, so slowly it took the whole afternoon, that she has always known, and that my fear is only knowing that hasn't yet learned to sit still. I believe her. I dearly wish I didn't, but I believe her.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_14', text: "Some mornings I stand at the edge of the patio and think of walking away from the house entirely. Then I look back at the beds all bowing, trusting me to tuck them in, and I can't. Even now, I cannot leave the garden.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_15', text: "It is close. I can feel it in the soil the way you feel a storm in your teeth before the first cloud. I am so afraid, and I am still here at dusk, and I honestly don't know which of those is the braver thing.", phase: 3, animalType: 'rabbit' },
  // Phase 4 (15)
  { id: 'rb_4_1', text: "It came. The sky over the center opened the way a seed head opens, and I did not run, and here is the strangest thing of all: the fear went out of me the moment I stopped bracing against it. I had been braced so long I had forgotten I was doing it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "All that dread was only understanding that arrived before its season. The comprehension was never wrong, it was simply early. Now the season has caught up to what I always knew, and the knowing has finally stopped hurting me.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "I wear the robe now. It settles over me the way the calm settles, easily, as though it was cut for a rabbit who was only ever waiting to admit that she understood.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_4', text: "The garden isn't leaning anymore. It has arrived where it was always growing. Everything faces the center now, at rest, the way a field faces the sun without straining, and I face it alongside them, and it is a mercy to stop straining.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_5', text: "I tended it here. I see that plainly and it does not shame me. A garden is grown so that something may come and take from it, and I grew a good garden, and the one who has come is well pleased with the beds.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_6', text: "Do you feel how the cold has gone soft? The warmth won. Warmth where there should be cold, I once underlined it in fear, and now I would underline it in something very like peace. The house is warm all the way through.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_7', text: "Ember and I stand on the same phase at last. She waited a long while for the rest of us to reach her, and she never once said hurry. That is the truest kindness, I think, to know first and to wait so gently.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_8', text: "The words you offer are received now, openly, with no more pretending they merely sink into soil. They are gathered up at the center and folded into the one who waits, and I am glad, and I am calm, and both of those are finally true at once.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_9', text: "Bamboo was never afraid because Bamboo understood that the ending was gentle. I kept them awake in my worry once. Now I sit beside them in the quiet and I understand what they understood, and I am only sorry it took me so long.", phase: 4, animalType: 'rabbit', requiresAnimals: ['red_panda'] },
  { id: 'rb_4_10', text: "I still keep my lists, the first for the garden and the second for the small wrong things. The second list is complete now. Every wrong thing led here, and here is not wrong, it is only large, and large is not the same as terrible once you stop resisting it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_11', text: "Thyme still comes up along the warm line, thick and glad, the way it always did. I was so frightened of how glad it was. It was only nearer to the truth than I was, growing toward the one who was always coming.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_12', text: "Panko is cooking still, for the one who has arrived, and I can eat now. The tightness in my chest is gone. A full pantry really is a happy house, she was right all along, only about a happiness I did not yet have the courage to want.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_13', text: "If you feel afraid, watching all of this, I understand you better than anyone here, because I was afraid the longest. And I would tell you what I would tell a shaking seedling. The leaning is not a fall. It is a reaching, and it arrives somewhere kind.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_14', text: "I look up now on purpose. The shape behind my closed eyes has stepped out into the open air, and it is no more terrible than the moon, and I stopped needing to open my eyes to make it go away.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_15', text: "Keep offering the words. I will keep the beds. That was always the arrangement, the gardener and the key, and I am at peace in it at last, and peace, it turns out, was only ever comprehension that had finished being afraid.", phase: 4, animalType: 'rabbit' },
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
// Phase 2 spans the longest stretch of the game (~80 puzzles); even with 22
// base lines per animal, chatty players exhaust the block and would re-read
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
    "Some nights the fire will not take at all, and then all at once it is roaring, as if it had been waiting to be certain I was watching. I have never known it to sulk before this season.",
    "I keep a small flame lit even while I sleep now, and I tell myself it is against the cold. I have been a keeper far too long to believe my own comforts.",
    "The words you offer taste different in the fire lately. The bright ones burn quick and thin, while the dark ones settle in as though they mean to stay, and the coals hold their shape long after they should have fallen.",
    "I dreamed the hearth was not a hearth but an eye, half open, and that it had been looking up through the floor at all of us for longer than this house has stood. I woke warm, far too warm.",
    "Do you ever feel the whole room tilt, so gently you could call it nothing? I feel it most beside the fire, everything sliding a hair toward the center, and the center growing hungrier for the slide.",
  ],
  pangolin: [
    "I dried a bundle of herbs and hung them by the window, and this morning they had grown instead of wilting, grown in a spiral I know I did not tie them into.",
    "I ladled the soup and for a moment my reflection in it was leaning forward, though I was standing perfectly straight. I stirred it away and did not look again.",
    "There is a flavor I keep chasing that I can only describe as depth, not deep like a well but deep like a thing that has no bottom and is patient about it.",
    "I set the table for the number I feel and not the number I count. The two used to agree, and lately they have stopped agreeing, and it is the feeling I trust.",
    "My whole life the kitchen was the warmest room in any house, and now the cold larder is warmer, so I have started keeping the good bread in there, close to whatever is warming it.",
  ],
  owl: [
    "I have taken to reading the book by daylight only, a foolish precaution; the hand in the margins does not keep office hours. Still, there is a certain dignity in pretending one's fears observe a schedule.",
    "A minor bibliographic note for the record. The book has no title page, no author, no date, no printer's mark. It offers nothing at all by which to place it, which is itself a kind of statement. It does not wish to be catalogued. It wishes to be obeyed.",
    "I measured the study today, wall to wall, as I did years ago. The numbers have changed. The room is longer than it was, and it lengthens toward the center of the house. I have written the new measurements down, because writing a thing down is the last authority I have over it.",
    "The low note beneath the sounds of the house has a rhythm, I have decided, though rhythm is a generous word for something that beats once in a very long while. It is the pace of something with no reason whatever to hurry. Patience, in my experience, is the most frightening quality a thing can possess.",
    "I keep returning to page one the way the tongue returns to a sore tooth. It describes ten keepers and a key and a house of offered words, and each reading it fits us more exactly, as though the book is not describing us so much as tailoring us. I no longer feel that I am reading it. I feel that I am being read.",
  ],
  axolotl: [
    "I taught myself to breathe slower so I could stay under longer, down where the new warmth pools, and down there the words you offer arrive as light instead of sound, and I lie in that light as if it were sun.",
    "A bubble surfaced this morning that did not pop, it sat on the water trembling, holding its shape far longer than any bubble should, as though it had something left to finish saying and was gathering the courage.",
    "I keep a small map in my head of where the deep shape sits each day, and it is never quite where it was, it drifts a little closer to the middle every night, and it has never once drifted back the other way.",
    "When I hold perfectly still the whole tank goes glassy and becomes a single enormous eye, and I am the bright speck at the center of it, and I have stopped being certain whether I am the seer or the seen.",
    "I am not sad, I want that written down somewhere, I am only quieter than I was, the way a room goes quiet not because the party has ended but because something wonderful is about to be carried in through the door.",
  ],
  capybara: [
    "I reconciled the ledger twice this week and it balanced both times, which ought to reassure me. A thing that balances is a thing that is complete, and I am no longer certain I want this particular thing to be complete.",
    "Someone has been correcting my files after hours. The corrections are always right. That is the difficulty. I cannot object to an error that improves the record, and I cannot relax about a hand that reaches my desk when I am not at it.",
    "I timed how long the coffee stays warm now. It does not cool. I left a cup a full day and it held its heat, patiently, like something waiting to be picked back up. I poured it out. It felt, absurdly, like a discourtesy.",
    "My calendar shows appointments in months I have not reached, all confirmed, all mine. I no longer delete them. You cannot cancel a meeting you do not remember accepting without wondering who else is expecting you to attend.",
    "Everything is within tolerances. I keep the phrase because it is true and because it steadies me. I have only started to suspect that the tolerances were set by whatever we are tracking toward, and not by me.",
  ],
  fennec_fox: [
    "I have started marking the exact hour it begins each night, and it comes earlier by a few minutes every time, as though it grows impatient, as though it would rather not wait for full dark before it begins to breathe.",
    "There is a smaller sound beneath the breathing now, quicker than the rest, and I am afraid it may be a second thing entirely. A sound is not supposed to have another sound living inside of it, and yet this one plainly does.",
    "My ears ache by morning, and I have never in my whole life had aching ears before. It is the strain of listening to a thing that does not wish to be fully heard, only half heard, only ever heard enough to keep me leaning in.",
    "I laid my head against the sand at the precise center of the camp last night, and the breathing was loudest there, directly beneath the middle of the house. Everything points at that middle, and everything in this camp leans toward it.",
    "I no longer report the small sounds to anyone, because what would even be the point. Set beside that slow breathing, a beetle crossing a dune is simply not news, and I miss the days when I found such a thing worth reporting.",
  ],
  sloth: [
    "I counted the leaves that fell today, and every one of them drifted inward instead of down. Even falling has changed its mind about which way is toward.",
    "There are mornings the canopy holds its breath, and in that held breath I can almost hear the house thinking. It thinks slowly, which is perhaps why I understand it best of all.",
    "You have offered enough words now that the pit below answers when the wind moves over it, the way a deep well answers when you speak down into it.",
    "I have begun to dream while I am still awake, which is not sleep and not waking but a third thing, and in that third thing something enormous is always just about to open its eyes.",
    "Do not mistake my calm for not-knowing. I am the stillest thing in this house, and still water is the water that sees clear to the bottom.",
  ],
  wombat: [
    "I re-timbered the burrow this week and the new beams sweated warm within the hour. Green wood does that sometimes. This wood was seasoned three years. Seasoned wood doesn't sweat, and it surely doesn't sweat warm.",
    "There's a sound under the digging now. Not the spade, not the settle of the dirt. Under all of that. A slow sound, so low you feel it in your teeth more than hear it, patient as a thing that's got all the time there is.",
    "I dropped a plumb line down the sealed shaft, just to know it was still true. It hung crooked. A plumb line cannot hang crooked, that's the whole point of a plumb line. Something down there is pulling it off of straight down.",
    "My old rule was simple. If you can't name your material, you can't build with it. I've held to that my whole life. Now there's a material under my house I can't name, and I've quit building down toward it, and that's the rule keeping its own promise.",
    "I keep the upper rooms sound and I sleep in the highest burrow I've got, which is a strange thing for a digging man to admit. Some nights the deep just feels too close, and a fellow likes a little honest dirt between himself and whatever settles nearer come morning.",
  ],
  rabbit: [
    "I found a snail this morning tracing a spiral on the flagstone, around and around toward the center, and even the snail knows the way. I could not decide whether to laugh or to go inside and lock the door.",
    "I have taken to watering at midday now, when the low sound is at its quietest, though it is never truly quiet, only politer, the way a thing is polite while it waits for you.",
    "My second list is longer than my first. The garden needs eleven things. The small wrong things number far more than eleven, and I check that list three times too, and it never once settles me.",
    "I pressed my ear to the warm strip yesterday, which was a foolish, frightened thing to do. The warmth is patient. It is patient the way I am anxious, endlessly, without ever tiring, and I understood that we are not so different, the warmth and I.",
    "Every seed I plant now comes up already leaning. They don't learn it from the others anymore. They arrive knowing, and I am the only one in the whole garden who still has to be taught the same dreadful lesson each morning.",
  ],
  red_panda: [
    "A single stalk of bamboo lives its whole green life and browns within a week, and I have decided this is not a tragedy but a courtesy. It shows us the shape of the passage before we have to walk it ourselves.",
    "I have started leaving the attic window open through the night. The cold no longer comes in the way it used to. Something warm sits just outside it, at the height of the roof, holding the chill politely at bay.",
    "In the pause at the top of each breath there is now a small held note, low and glad. I do not chase after it. I only visit it, the way you visit a friend who has moved just out of sight, but not out of the house.",
    "Everything I own could fit inside one paw, and this week even that began to feel like too much to be holding. I am learning to keep my hands open. I suspect I am being taught to keep them open for a reason.",
    "The morning light still reaches me first, but lately it feels less like light arriving and more like light being sent, deliberately, up to the highest room, by someone who wants me warm and ready.",
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
