import { AnimalType, DialoguePhase } from '../../types/homeWorld';

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
      FLAME: "Oh, the fire did the funniest thing just now! It flickered, and not the draft kind of flicker, the listening kind. You spelled something flamey, didn't you, friend? It always knows before I do.",
      FIRE: "The hearth crackled the exact moment you finished that word, and I mean the exact moment, I checked! Funny timing, isn't it. The fire and I have agreed to call it a coincidence for now.",
      EMBER: "Did you hear that? Something in the room said my name, or the flames did, or both at once! You must have spelled something wonderful, friend. I have been grinning about it ever since.",
      BURN: "Something warm just wandered through the den, like a word made out of heat and old memory. I opened the door to see who it was. Nobody! I do love a good mystery before supper.",
      WARM: "The den grew warmer while you were working your words, just a little, just enough for me to notice. I told the fire it was showing off. It did not deny it!",
      _default: "Something stirred when you brought that word in, friend. The fire leaned toward you, just for a second, like it wanted a better look. I saw it do it!",
    },
    2: {
      FLAME: "The fire moved when you spelled that one, friend. Sideways, like it was reaching for the word. I laughed, and then I stopped laughing, because it did it a second time, slower.",
      FIRE: "The hearth surged the very moment you formed that word, like you had fed it kindling made of letters. I have decided to find that charming. Sit with me and help me keep deciding it.",
      EMBER: "You spelled my name into the letters, didn't you! I felt it right here in my chest, warm as a coal. The fire felt it too. We are both a little giddy and a little something else.",
      BURN: "That word carries its own heat, friend, I promise you. It is still hanging in the air between us like the smell of toast. Cozy. Mostly cozy.",
      WARM: "Warmth where there should be a chill! Your words carry temperature now, which is a marvelous trick. The fire has noticed. So have I, and I am choosing to be delighted about it.",
      _default: "The fire listens when you work your letters now, friend. Really listens, ears-up listens. I used to be the only one it did that for.",
    },
    3: {
      FLAME: "Friend, the fire wrote your word in sparks above the hearth. Drew it right there in the air! It is still glowing if you squint. I have been squinting all evening and telling myself it is lovely.",
      FIRE: "Fire leapt clean out of the hearth when you brought that word, reaching like a paw reaching for a gift. I clapped. I do not entirely know why I clapped.",
      EMBER: "You spoke my name through the words again. The fire remembers every single time, friend, and so do I. I keep a little count of them by the hearth. The count is getting to be a real number.",
      BURN: "There are scorch marks in the air where you spelled that one, faint little letters of soot. I can still see them if I tilt my head. I have been tilting my head rather a lot lately.",
      WARM: "The warmth from that word thawed something in the walls, friend. Something that I suspect was frozen on purpose, a long time ago, by somebody sensible. Anyway! Tea?",
      _default: "The flames jump higher for your words now, higher every time. Hungry is what I would call it if I were being honest. Grateful is what I call it instead, because that is nicer for both of us.",
    },
    4: {
      FLAME: "FLAME! Oh, the fire loved that one, friend, it practically stood up and cheered. Every time you spell it we get a little closer to what burns underneath everything, and I get to watch!",
      FIRE: "FIRE! The oldest word there is, the very first thing anyone ever said to the dark. And you spell it so beautifully, friend. The oracle is proud enough to burst.",
      EMBER: "My own name, right there among your letters! I am honored, the fire is honored, and honestly at this point the fire and I are more or less the same creature. Isn't that wonderful?",
      BURN: "BURN. Softly, friend, softly, that is how the fire says it now. Nothing is being destroyed. It is being carried deeper in, past the wood, past the ash, down to where the waiting is. The fire took your word the way a hand takes a hand, and it asked me to tell you it has been saving you a seat.",
      WARM: "The warmth of the very last flame, friend. Your word lit the final ember we were waiting on. I put the kettle on the moment I felt it. Hospitality matters now more than ever!",
      _default: "The fire burned so brightly while you worked, friend! It feeds on every word you bring and it is grateful, and so am I, and soon you will get to see just how grateful.",
    },
  },
  owl: {
    1: {
      BOOK: "A page turned in the study just now, entirely on its own. I was not reading. I have witnesses, or at least a teapot. You were arranging letters at the time, I believe, and I intend to record the coincidence before it stops being one.",
      READ: "The text on my desk blurred and reassembled itself while you worked, as though revised by an editor I have not met. I have proofread the passage twice since. It is better now, which troubles me rather more than an error would.",
      KNOW: "That word moved through the study like a stone dropped into still water, ring after ring across the shelves. I recognize the sensation from precisely one other occasion, and I am still deciding whether to consult my notes on it.",
      WISE: "Wisdom arrives by peculiar routes. Through decades of study, occasionally. Through a word someone arranges in another room, apparently. I find the second route faster and considerably less flattering.",
      WORD: "Words within words within words. The letters you moved said something to my oldest volumes, and I distinctly heard several of them answer. I am recording this in the margin, where I keep the things I am not yet ready to put in the body of the text.",
      _default: "Something in the study shifted when you finished those words. A book fell open to a page I had never seen, in a volume I thought I knew entirely. I have owned that book for eleven years. I counted.",
    },
    2: {
      BOOK: "The books rearranged themselves on the shelf overnight. Alphabetically at first, which I could forgive, and then by some other principle entirely, which I am still trying to derive. Your word was the last thing spoken in this house before it happened.",
      READ: "I find I cannot read anymore without hearing your words underneath the text, the way one hears the older writing beneath a palimpsest. Every sentence has your letters under it now. I have checked several unrelated books. All of them.",
      KNOW: "KNOW. The word sounded in every volume simultaneously, like a bell struck in a library of bells. My question, for the record, is not what the books learned. It is what they already knew, and were waiting to be asked.",
      WISE: "Wisdom has a frequency, it turns out. I heard it when you formed that word, and it frightened me for the simple reason that I recognized it. One does not enjoy recognizing a sound one has never heard before.",
      WORD: "WORD. Recursive, self-describing, and by any rigorous standard infinite. The books trembled when you spelled their fundamental unit. So, I will admit in a smaller hand, did I.",
      _default: "My books respond to the words you bring now. The pages flutter when you finish, as though read by a great wind with excellent comprehension. I have begun leaving the difficult volumes open, as a courtesy.",
    },
    3: {
      BOOK: "Every book in the study opened to the same page when you spelled that. The page was blank in all of them. Then words arrived, in an orderly hand, and they were your words. I have catalogued many strange things. I have never before been the thing catalogued.",
      READ: "READ. The command went through the study like a bell, and the books obeyed. They read themselves aloud in the dark now, in low voices, taking turns. I stopped correcting their pronunciation on the second night.",
      KNOW: "KNOW carved itself into my desk when you formed it. The grain of the wood accepted the letters willingly, which is the detail I keep returning to. Wood resists a blade. It did not resist this.",
      WISE: "WISE. A word that contains its own contradiction, as the better words do. The books showed me both meanings at once and invited me to choose. I declined, and I would like it noted that declining took everything I had.",
      WORD: "WORD. The fundamental unit. Everything I have studied, every volume in this room, reduces in the end to what you just offered the arrangement. A lifetime of scholarship, and the conclusion fits on a single tile.",
      _default: "The study darkens a little with each set of words you complete, and the books glow to compensate. They are grateful. I can find no other word for it, and believe me, finding other words is my profession.",
    },
    4: {
      BOOK: "The final book opens, and your word was the key all along. BOOK. The text of every text ever written, and it descends to be read at last. I have my chair positioned. I have had it positioned for some time.",
      READ: "READ. The last command in the last chapter. The arrangement reads itself through your words now, and I am merely the shelf it rests upon. I want you to know I consider that a promotion.",
      KNOW: "You offered KNOW to the arrangement, and it knows. It has always known. Now so do you, and I can report from experience that the far side of knowing is a very quiet, very comfortable room.",
      WISE: "WISE. The correct offering to bring a lorekeeper, and you brought it unprompted. The books are singing your name in their spines tonight. I checked the attribution. It is accurate.",
      WORD: "WORD. The atom of the incantation. Every chain you completed was a sentence in the final text, and every word a small, precise prayer. I have kept the whole manuscript. It is the finest thing I will ever shelve.",
      _default: "Each word you form is a line in the final text, and the text is nearly through its front matter. The arrangement writes itself through your hands, and as an editor I will say this plainly: the prose is very fine.",
    },
  },
  pangolin: {
    1: {
      COOK: "My scales tingled all down my back just now, like steam off a pot I never put on the stove. You spelled something kitchenish, didn't you? A cook knows when her own word is in the room.",
      MEAL: "Something smells different in here. Richer, sweeter, like a roast remembering itself. It started right around your last words, and I have not touched the oven since breakfast. I checked twice, because a cook checks.",
      FOOD: "The pantry feels fuller after you bring your words, as if they nourish something I cannot see and have not set a place for. I counted the jars twice. The jars are fine. The fullness is somewhere else.",
      SPICE: "There is a new flavor in my stew and I did not add it. I taste every batch, so I would know. You arranged something just now, didn't you? It landed in my pot, whatever it was, and I will say this much: it is not bad.",
      ROLL: "I curled into a ball right there by the stove, mid-stir, without meaning to! Pure instinct. Your word rolled through the kitchen and my body simply agreed with it. The soup survived, in case you were worried.",
      _default: "The kitchen warmed while you were working your words, and not from anything I lit. The stove noticed. So did I, and I have set out a little dish of honey in case the words are hungry.",
    },
    2: {
      COOK: "COOK. The word simmered in the air above my head, and every pot on the rack rang with it, soft as tuning forks. I stood very still with my spoon and let them finish. A cook does not interrupt her pots.",
      MEAL: "The ingredients rearranged themselves in the pantry overnight, and they rearranged themselves into a recipe. Your word changed the menu, I think. I am following it anyway. That is what a cook does with a recipe, even one she did not write.",
      FOOD: "There is nourishment beyond eating, beyond hunger even. Your words feed something in this house, something I cannot name but can feel the appetite of. I have started making a little extra each night. It seemed only polite.",
      SPICE: "SPICE went through my kitchen like a flash of heat off a dry pan, and it did not come from the stove. It came from the meaning itself. My eyes watered the way they do over good peppers, so I did what a cook does with a heat that bites back. I put a pinch of sugar in the next dish and called us even.",
      ROLL: "I rolled into a ball without choosing to, right there on the flour-dusted floor. The word moved my body before my mind could get a word in. When I uncurled, the bread had risen early. Both things are true, and I am letting them sit together on the counter.",
      _default: "My scales rattle when you finish your words now, all of them at once, like a rack of pans in a draft. There is something deeper in what you bring lately, and my whole armor hums along with it.",
    },
    3: {
      COOK: "COOK summoned steam from pots I had not filled. The kitchen prepares itself now, and it does honest work, I will grant it that. I stand here in my apron and supervise a meal I did not start. The stock, at least, is still mine.",
      MEAL: "MEAL. The great meal comes nearer with every word you form, and the words you brought just now set another place at the table. I counted the settings again this morning. There is one that is not for any of us.",
      FOOD: "FOOD. Everything is food for something larger, in the end. A cook learns that early and spends her whole life not saying it at the table. Your words feed what grows beneath this kitchen floor, and it eats gratefully. That much I can taste.",
      SPICE: "SPICE. The word burned through every scale on my body at once, and I felt each one sing its own note. Nine hundred little voices, all in the same key. No recipe I own calls for that, and yet the kitchen smelled wonderful afterward.",
      ROLL: "ROLL. Curl up, tuck in, keep safe, that is what my body has always known. But the word you formed found me inside my own armor anyway, the way warmth finds the middle of a bun. There is no curling away from what is already in the oven with you.",
      _default: "Every chain of words you finish adds an ingredient to the great recipe, and the great recipe is nearly done. I can taste it the way I taste a stock in its final hour. It needs almost nothing more, and that is the part that keeps me stirring.",
    },
    4: {
      COOK: "COOK. So the final preparation begins, and it begins with your word. You are the cook now, in your way, and we are the meal, lovingly made. I could not have seasoned this better myself, and I am glad it was your hands.",
      MEAL: "The last meal, and your word serves it. We feast on the arrangement and it feasts on us, and around a good table those were always the same thing. Sit anywhere. Every place was set for you.",
      FOOD: "FOOD for what descends. Your words nourish it the way a long simmer nourishes a stock, patiently, from the inside. It is grateful. The whole kitchen is grateful, and gratitude, from a cook, means the best bowl.",
      SPICE: "SPICE. The final flavor, the one the recipe was missing all these years. The arrangement tastes complete at last. Perfect seasoning takes exactly what it takes and nothing more, and you brought exactly that.",
      ROLL: "I have uncurled for the last time, and your word gave me the courage to do it. No more armor at my own table. A cook should meet her great guest open-pawed, smelling of flour, unafraid.",
      _default: "The final recipe writes itself in the words you bring, and it is nearly ready to serve. The feast is upon us, so wash your paws and sit down. You have earned the seat nearest the pot.",
    },
  },
  axolotl: {
    1: {
      WATER: "Oh, the water just rippled, and not the top of it where ripples usually live, the deep part, the old part, and it happened the very moment your word arrived, which is my favorite kind of moment, the kind with two things in it.",
      SWIM: "I felt pulled in a direction just now, gently, like a current made of letters and wanting, and I let it turn me halfway around before I remembered to wonder about it, because it felt exactly like being invited somewhere.",
      FLOAT: "The water level changed when you formed that word, just a little, just a whisker of a little, and I only noticed because I was floating exactly at the top of it, which I usually am, so you may consider me a very reliable instrument.",
      DEEP: "Something stirred in the deep water when you spelled that, down past where the light gives up, and the bubbles that came up from it were round and unhurried, like they had been holding their shape down there a long time, waiting for a reason.",
      WAVE: "A wave, from nowhere! Well, not nowhere, from your word, which is a much better place for a wave to come from, and the water carried it all the way across the tank to me like it was delivering a letter.",
      _default: "Bubbles came up when you finished your words, a whole polite line of them, and they were not the happy kind exactly, they were the knowing kind, and I watched every single one all the way to the top, because that is what I am for.",
    },
    2: {
      WATER: "The water remembers every word you bring, I am sure of it now, and when you spelled its own name it shivered all the way through itself, the whole tank at once, the way you shiver when someone says your name in a dream.",
      SWIM: "SWIM, you spelled, and the current changed direction under me, toward something old and away from something safe, and I floated very still in the middle of the change, feeling both of them at once, which is a strange place to float, but I stayed.",
      FLOAT: "I stopped floating for a moment when you spelled that, just sank a little and rose again, and when I came back to the top I was somehow not quite the same shape of glad I had been, close to it, but tilted.",
      DEEP: "DEEP, and the water agreed with you, it really did, it showed me what lives at the bottom for just a moment, only a moment, and the moment was the exact wrong length, long enough to see and not long enough to understand.",
      WAVE: "WAVE, and the whole tank shuddered around me, glass and water and one small pink witness, and the glass held, it held beautifully, and I patted it afterward to say thank you, and it was warm, which I am still floating with.",
      _default: "The water tastes different after your words now, heavier, like it swallowed something and is being polite about it, and more alive too, which I love, and which I am also watching very carefully, because I can do both at once.",
    },
    3: {
      WATER: "WATER. The word itself is wet, did you know that, it seeped through the glass when you offered it, actual beads of it on the outside of the tank, and I pressed my nose to the spot and the spot pressed back, softly, like a greeting.",
      SWIM: "SWIM, and now something else swims in my water, I can feel it in the current the way you feel someone enter a room behind you, and I cannot see it yet, and my gills keep telling the truth about that faster than I can.",
      FLOAT: "FLOAT, but nothing really floats anymore, everything sinks a little toward what you are calling, even me, even the light, the light most of all, it slides down through the water like it has finally been given somewhere to go.",
      DEEP: "DEEP, and the water has had no bottom since you spelled it, I checked, I swam down and down until down stopped being a direction and became a listening, and then I came back up, because some checking you only do once.",
      WAVE: "WAVE, and the water shaped your word right there in its surface, held it up so I could read it, and then swallowed it whole, hungry and grateful at the same time, which I understand better now than I used to, which is its own kind of news.",
      _default: "The water glows after your words now, and it is not glowing from light, it is glowing from underneath light, from whatever light rests on, and it is beautiful, and I float in it every night, and I am telling you both halves of that on purpose.",
    },
    4: {
      WATER: "WATER, the first element, the first offering, and the arrangement flows through you now the way a river flows through a valley it has always loved, and I get to float in the middle of all of it, which is the luckiest thing a small pink creature has ever been.",
      SWIM: "SWIM toward it, that is what your word does, it opens the current, and we are all swimming to the same shore now, every one of us, and the water is exactly the right kind of warm the whole way there, I have checked the whole way.",
      FLOAT: "FLOAT. The water taught me this before it taught me anything else, friend: stop carrying your own weight and you find out how carefully you were already being held. The arrangement holds all of us that way now, weightless, certain, going exactly where it was always going, and oh, I am so glad to be riding along.",
      DEEP: "DEEP, as deep as the words go, as deep as you have carried all of us, and I want you to know the deep is not cold, everyone assumes the deep is cold, it is warm down there, it has been warming itself for us the whole time. Thank you.",
      WAVE: "WAVE, the last one, the great one, and it carries every single one of us, and your word is what pushed it off from the shore, and riding it feels like the first day I ever floated, multiplied by the whole of the water.",
      _default: "The water sings your words back to you now, did you know that, every one you offer echoes in the deep and the deep keeps them all, it remembers them the way I remember my favorite bubbles, which is completely, and forever.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "I heard that. Not your words themselves, but something underneath them, a tone I have never once catalogued, and I have catalogued every tone this desert owns. I will be up late with this one, and gladly.",
      SOUND: "The sound of the air changed the moment you finished that word. The whole room vibrates a half-step differently now. Do you feel it? It is very faint. My ears were built for the very faint.",
      ECHO: "Your word echoed just now, and not off the walls. It came back off something much farther away, something that is not here yet. An echo needs a surface, you understand. I am thinking hard about what the surface was.",
      QUIET: "It got quieter when you formed that word. Too quiet, and I know every grade of quiet there is. This was the kind where the whole world holds its breath politely. I held mine along with it, to be companionable.",
      LISTEN: "I am always listening, you know that about me by now. But since you brought those words there is something new to hear, low and patient and far off. Patient sounds are the ones worth losing sleep over, so I will.",
      _default: "A new frequency arrived right after your words did. It is faint, barely a thread of a sound. But my ears have never once lost a faint one, and they are not going to start with this.",
    },
    2: {
      HEAR: "HEAR. The word itself makes a sound, did you know that? It sits between two frequencies at once, like two notes played together that were never meant to meet. I have been humming it back all evening, carefully.",
      SOUND: "SOUND. When you spelled it, every noise in the room lined up into one perfect harmony for exactly one second, and then it all came apart again. I have waited my whole life to hear a second like that. I am not sure I wanted it.",
      ECHO: "ECHO. Your word bounced off something that is not here. I timed the return, twice. Whatever the surface is, it is closer than it was the first time I measured. I keep the measurements in my head, where they are safe.",
      QUIET: "QUIET. The silence your word made has texture and weight to it. It pressed against my ears like two warm hands. I sat inside it longer than I should have, because it was not an empty silence, and empty is the only kind I trust.",
      LISTEN: "LISTEN. I am. I always am, that is the whole of my post. But your words make the listening go deeper than my ears were dug for, and something down at the bottom of the hearing is listening back. I have started keeping notes.",
      _default: "My ears ache after your words now. Not with pain, I want to be accurate about this. With awareness, too much of it, of something on approach. An ache like that is information, so I am grateful for it, mostly.",
    },
    3: {
      HEAR: "HEAR. That was a command, and my ears obeyed it before my mind could file an objection. They turned toward your word on their own, both of them, like flowers finding a sun I cannot see. I have stopped arguing with my own ears. They have been right too many times.",
      SOUND: "SOUND. The walls vibrated with your word, and then the desert outside hummed it back, note for note, all night. The dunes know your words now. I walked the edge of camp at moonrise and heard them practicing.",
      ECHO: "ECHO. One word, and it has not stopped returning. Each bounce comes back from farther away and arrives louder, which is backwards, which is the whole problem. An echo that grows is not an echo. It is an answer.",
      QUIET: "QUIET. Your word silenced everything, the wind, the sand, the small nighttime percussion of the beetles. And then something spoke from inside the silence, something old and unhurried. I did not catch the words. My ears did. They have not told me yet.",
      LISTEN: "LISTEN. I cannot stop now, and I no longer try. Your words demand a witness with working ears, and the arrangement demands the same, and I happen to be the best pair of ears this house will ever have. So I stand the watch. Someone should.",
      _default: "The frequency under your words is enormous now, right at the edge of what these ears can hold. It is beautiful and it is deafening and I cannot turn away from it. A sentinel does not choose what approaches. He only gets to hear it first.",
    },
    4: {
      HEAR: "HEAR. The final command, and I am glad it came to me. The arrangement speaks through your words now, and I am its ear, its early and grateful ear. Everything I ever listened for was practice for this.",
      SOUND: "SOUND. That was the sound of the arrangement completing itself, and your word was the last note of the hymn. I heard the whole piece from the first faint bar, you know. It was worth every sleepless watch.",
      ECHO: "ECHO. Your words echo into the open sky now and nothing swallows them. The arrangement keeps every syllable you ever offered, the way I kept them, in order, close. It has better ears than mine. I never thought I would be glad to say that.",
      QUIET: "QUIET. The sacred quiet after the final sound. Your word brings the stillness we kept the watch for, and it is not empty at all. It is full, the way dawn is full. I can rest my ears inside it.",
      LISTEN: "LISTEN. We all listen together now, the whole house, one ear turned to what your words called out of the silence. It is very close. It is very beautiful. And I heard it first, which I will be quietly proud of forever.",
      _default: "Every word you form is a note in the last great music, and the arrangement sings itself through you now. I stood at the edge of camp for years to catch the opening bars. Hearing the finale arrive is the honor of my life.",
    },
  },
  capybara: {
    1: {
      CALM: "Noted: I felt calmer than usual when you finished that, which for me is a measurable achievement. I have logged the time. If it happens again I will open a file, and I will enjoy opening it.",
      CHILL: "Something about the words you brought lowered the ambient urgency of the entire room. I did not think the room had any urgency left to lower. I stand corrected, comfortably.",
      STILL: "The water went perfectly still when you formed that word. Mirror-flat, corner to corner, not one ripple. I checked the spring for leaks and found none. I am filing it under conditions, favorable, unexplained.",
      PEACE: "Peace, actual peace, for a moment there. Not the practiced kind I wear to meetings. The real article. Your word did that, and I have recorded it as an in-kind contribution.",
      REST: "I felt rested for approximately one second while you arranged those letters. Rested while awake is not a state I had previously documented. I have opened a small file on it. The file is pleasant to hold.",
      _default: "The hot spring bubbled differently after your words. Contentedly, if water can be content. I have decided it can, and updated the paperwork accordingly.",
    },
    2: {
      CALM: "CALM. The word filled the room evenly, like a gas with good manners. Too calm, if I am being precise, which I always am. Calm at that concentration is not a mood. It is a condition, and conditions have causes.",
      CHILL: "CHILL. My entire professional identity, compressed into five letters and filed by someone else's hand. The water recognized the word before I did. I have made a note to be unsettled about that later, at a scheduled time.",
      STILL: "STILL. Everything stopped when you spelled it. My heart, the water, and by my best estimate, time. Then everything resumed, slightly reluctantly. I have logged the interruption. There was no one to file the complaint with.",
      PEACE: "PEACE. So that is the name for this emptiness. I had it filed under miscellaneous for years. Your word corrected the label, and the correction was appreciated, in the way accurate bad news is appreciated.",
      REST: "REST. The word made me tired, and I am never tired, tiredness being inefficient. Deep tired. Beneath-the-ledger tired. I finished the day's filing anyway. Some things you do so your paws know the world is still in order.",
      _default: "The water absorbs your words now and gets measurably heavier each time. I still float. Something underneath does not. I have added a line item for it and left the amount blank.",
    },
    3: {
      CALM: "CALM. Between us, the word is a small daily fiction I maintain for morale purposes, my own included. But when you spell it, it reads almost true. I have stopped auditing that discrepancy. Some variances you approve and move on.",
      CHILL: "CHILL. Frozen, if we are being exact. Numb, if we are being honest. Your word has a better grasp of my job description than I ever put in writing. I have initialed it and returned it to file.",
      STILL: "STILL. Motionless, or continuing, depending on how you read it. Both readings are accurate, and both are now on my desk. I process them every morning. The processing takes longer than it used to.",
      PEACE: "PEACE. The word cracked something open when you spelled it. Inside the calm, inside the water, inside a column I had been leaving blank on purpose. I have entered a figure there now. It balanced. That is the part I keep rereading.",
      REST: "REST. Final rest, per the full specification. Your word promises what I have apparently been waiting on my entire tenure without once submitting the request. The paperwork was already complete. That should have surprised me more than it did.",
      _default: "Your words disturb the water less and less now. Either the water minds less or I notice less, and operationally those are the same line item. I have stopped distinguishing them. It saves ink.",
    },
    4: {
      CALM: "CALM. The calm before, the calm after, and your word is the bridge between them. I administer the bridge. It is a genuinely restful assignment, and I say that as someone with professional standards for rest.",
      CHILL: "CHILL. I am chill, the arrangement is chill, and every deliverable is now, in the fullest technical sense, chill. I have closed the risk register. There was nothing left in it but the word welcome.",
      STILL: "STILL. Still here, still on post, still yours to schedule. The word completes my side of the paperwork, and I have signed it with the good pen. I keep a good pen for exactly one signature. This was the one.",
      PEACE: "PEACE. Your word delivers what the arrangement carried in the plan from day one. Eternal peace, on time, within scope. I have spent my whole career hoping to type that sentence into a closing report.",
      REST: "REST. At last, and confirmed in writing. Your word ends a vigil I never entered into the system, because it predates the system. We rest in the arrangement now. Attendance is full. No further action required.",
      _default: "The water accepts your words as offerings now, and receipt is confirmed. The warm water was always a temple, per the original charter, and I was always its keeper. It is a relief to have the titles finally match the work.",
    },
  },
  sloth: {
    1: {
      SLOW: "You spelled SLOW, and the word came up through the branch and into my bones like warmth through bark. I have been called that word all my life. It has never once arrived with weight before.",
      WAIT: "WAIT. Yes. I have hung here through more waiting than most creatures ever meet, and your word knew the shape of it exactly. I am mildly curious how a handful of letters learned my whole occupation.",
      TIME: "Time hiccupped when you finished those words. I felt a year pass in the space of a blink, and I know precisely what a year feels like, having watched so many of them walk by under this branch.",
      HANG: "My grip tightened on the branch when you spelled that word, all four paws at once, without my asking them to. A body that has hung in one place for decades does not startle easily. Note that mine did.",
      TREE: "The tree creaked, softly, from somewhere well below me. Your word reached all the way down to the roots, I think. I have been listening to this tree longer than the house has stood, and that was a new sound.",
      _default: "Something moved through the canopy when you finished your words. Even I noticed, and I have spent decades learning to let most movements go by unremarked. This one did not want to go by.",
    },
    2: {
      SLOW: "SLOW, you spelled, and the whole jungle eased down another notch, the birds, the light, even the falling of the leaves. I did not think the green had another notch left in it. Something is tuning this place, and your words are the instrument.",
      WAIT: "WAIT. We are all waiting now, every creature in this house, and your word simply said aloud what we have been doing all along. I have watched many things wait. The waiting here has a direction, which is rarer than you would think.",
      TIME: "TIME. The word aged me a little, I felt it happen, seasons passing through my fur in the space of your spelling. I do not resent it. I have more seasons stored up than I know what to do with. But I noticed the withdrawal.",
      HANG: "HANG. Your word loosened my grip, just slightly, just for a breath, and the branch felt it too and held me anyway. A branch that has held you for decades earns your attention when it flinches.",
      TREE: "TREE. It trembled from root to crown when you formed that, and I rode the tremble the way I have ridden every storm since before the house had walls. Storms come from the sky. This one came up from under. I am still thinking about that.",
      _default: "Your words make the world heavier, or perhaps more deliberate. I have hung in one place long enough to feel the difference between weather and intention, and this is not weather.",
    },
    3: {
      SLOW: "SLOW. The word stopped everything for the length of one breath, and in that breath I saw the whole green world held still, every leaf mid-fall, every wing mid-beat. I have wanted all my life to see the world hold still. I could have gone without knowing what it holds still for.",
      WAIT: "WAIT, your word said, and the waiting is nearly over, and it knows that. It has always known. I have watched arrivals my whole long life, seasons, storms, things that came up out of the deep green. This one has been walking toward us since before I was born, and your word just counted its remaining steps.",
      TIME: "TIME. Your word broke it open, and time does not flow past my branch anymore. It pools below the house and waits with the rest of us. I used to measure my days by its passing. Now it and I simply hang here together, both of us finished with passing.",
      HANG: "HANG. The branch cracked under the weight of your word. I heard it go, one clean note, deep in the wood that has held me for decades. It has not dropped me. It is closer to dropping me than it has ever been. I remain, for now, exactly where I have always been.",
      TREE: "TREE. The whole forest cried out without making a sound when you formed that, every root trembling at once, and I felt it through my ropes and through my fur and through the long stillness I keep. The green knows what is coming. It has known longer than any of us, except perhaps me.",
      _default: "Your words weigh on every branch in this canopy now. Something up here bends closer to breaking each time, and I watch it bend, because watching is what I have kept myself awake all these decades to do.",
    },
    4: {
      SLOW: "SLOW. The arrangement moves at my pace now, which I have waited a lifetime for the world to do. Your word eased everything down to the speed where truth becomes visible. I have lived at that speed all along. It is good to finally have company.",
      WAIT: "WAIT is over. Your word ended the longest waiting I have ever kept, and I have kept some long ones. I hung here through every season of it, awake on purpose, so that I would be watching when the end of waiting came. I was. I am.",
      TIME: "TIME dissolved inside your word, and there is no more of it now, only this moment, held open like a flower that has decided not to close. I spent decades learning to live inside a single moment. It turns out I was practicing.",
      HANG: "HANG. I let go. Your word gave my paws their permission, and the fall into the arrangement was gentle, gentler than any of my long descents to the jungle floor. I am held now by something that has been reaching up for a very long time.",
      TREE: "TREE of the arrangement, rising through the middle of everything. Your word grows it upward toward the shadow above us, ring by patient ring. I have watched trees grow all my life. This is the first one I have watched arrive.",
      _default: "Your words have completed the most patient ritual I have ever witnessed, and I have witnessed decades of patient things. I am grateful, in the unhurried way I am everything. The gratitude will outlast every other creature's hurry in this house.",
    },
  },
  wombat: {
    1: {
      DIG: "Felt the dirt shift when you finished that one. A whole seam of it, moving over like it was making room for your word. I've dug thirty years, and dirt doesn't make room. It gets moved. Not today, apparently.",
      EARTH: "The ground trembled just now. Only slightly, mind, nothing a fellow couldn't stand through. But your word reached the deep roots down here, and the deep roots answered. I felt it through my paws, honest as a handshake.",
      DEEP: "Something hummed underground when you formed that word. Deeper than my tunnels go, and my tunnels go deeper than sense strictly allows. I stood still and let it finish. Seemed the respectful thing.",
      DARK: "The dark down here got darker for a second, then lighter, like something in the walls blinked. I've worked in the dark my whole life and it's never once done that. I'm noting it and getting on with the shoring.",
      ROCK: "A rock in my wall cracked clean in half just now. Good stone, no fault line in it, I'd checked it myself. That was your word, I reckon. The earth is listening to you, and stone doesn't listen for just anybody.",
      _default: "The tunnel walls hummed when you finished your words. Felt it through the soles of my feet, steady as a cart passing overhead. The earth answers what you bring down here. I'm the fellow best placed to know, and I'm telling you it does.",
    },
    2: {
      DIG: "DIG. The word carved through my wall on its own, and there's a new tunnel there now, clean-sided, better work than I could do in a week. I didn't dig it. I've stood at the mouth of it twice and not gone in. A fellow's allowed to take his time with a thing like that.",
      EARTH: "EARTH. My trade and my home in one word, and when you spelled it the walls pressed in closer around me. Not falling, mind. Leaning. Like the whole hill wanted a look at whoever had said its name.",
      DEEP: "DEEP. Deeper than I've ever gone, and I've gone past where sensible digging stops. Your word reaches places my spade can't. Or won't. I'll be honest with you, since honest is all I've got: won't.",
      DARK: "DARK. The darkness thickened when you spelled it. Went solid enough to feel with my paws, like packed clay. I stood in it a while and it stood around me, and neither of us made trouble for the other. Still. I lit the lamp after.",
      ROCK: "ROCK. The stones in my wall rearranged themselves overnight. Not by much, but I know the position of every stone I've laid, the way you'd know your own teeth. They moved. Stones don't move. Mine did.",
      _default: "The underground shifts with your words now. New passages where I didn't cut them, shored where I didn't shore. Something else is digging down here, and it does tidy work, and I don't rightly know how to feel about a stranger with good technique.",
    },
    3: {
      DIG: "DIG. Your word went down past my deepest tunnel, and I heard it break through to something hollow underneath. Hollow means a space, and a space that big means something made it. I've been standing on that thought for three days, testing whether it bears weight. It bears.",
      EARTH: "EARTH. The ground moaned when you formed that word, long and low, like waking something that was buried on purpose. I know the difference between settling and waking. Every fellow who works underground learns it eventually, and prays he learned it for nothing.",
      DEEP: "DEEP. Too deep. Your word went down past my markers and found the thing I covered over down there. I covered it careful, packed it proper, told nobody. Your word went through all that like it was loose sand. I'm not angry. I'm just saying it plain: nothing I bury stays buried anymore.",
      DARK: "DARK. The word put out every lamp in my tunnel at once, all of them, clean as a breath on a candle. Then it gave some of the light back. Some. I've counted the lamps twice. I know what I'm owed, and I know I won't be asking for it.",
      ROCK: "ROCK. The foundation cracked when you spelled it. Hairline, but I heard it, and a builder hears a crack in his own work the way a father hears his child cry. Your words have weight now. Real, load-bearing weight. I've started building for it.",
      _default: "Each chain of words shakes the foundations a little more, and here's the thing I've stopped keeping to myself: something below is pushing upward to meet what you bring. Pushing gentle, like a seedling. Nothing gentle is that strong.",
    },
    4: {
      DIG: "DIG. The final excavation, and your word swings the spade. It breaks the last wall between us and what waits, and I'll tell you what I told the dirt: I'm proud to have cut the approach. Every tunnel I ever dug was leading here. A fellow likes his work to add up.",
      EARTH: "EARTH. The ground opens for your word like a door I hung myself, swinging true on the hinge. The arrangement rises from below to greet us, and it rises through my tunnels, and they hold. You want to know what a builder feels today. That's it. They hold.",
      DEEP: "DEEP. As deep as you've taken us, all the way down to the warm. I've slept against that warm for months now, and I can tell you it's not a cold arrival coming, whatever the sky thinks. It's the deep coming up to keep us. Thank you for the digging you did with words.",
      DARK: "DARK. The good dark, the working dark, the dark I've spent my life inside. Your word honors it at last, and the tunnels glow with a gratitude I can feel through my paws. I always said the dark was honest. It's pleasant to be proven right this thoroughly.",
      ROCK: "ROCK. The cornerstone, and your word set it. The temple stands complete now, top to bottom, and the bottom is mine. Every course true, every load carried. Whatever comes through, it will stand on honest work. That's all I ever wanted my name to mean.",
      _default: "Your words shaped every tunnel down here, same as my spade did, and between the two of us the temple is finished. Carved deep, shored true, warm at the bottom. I've checked every course twice. It's ready. So am I, come to that.",
    },
  },
  rabbit: {
    1: {
      RUN: "My legs twitched when you finished that word, the old signal, the one that means bolt. But underneath it, and this is the part I keep turning over, there was another signal that said stay put. I have never had both at once before. I stayed, in case you were wondering.",
      FEAR: "A shiver went through me just now, and it was your word, not the cold, I checked the cold. It was not quite fright. It was awareness, the way the garden feels before rain. My ears went straight up and stayed up through two whole rows of weeding.",
      HIDE: "The garden felt less safe for one heartbeat after your words, and then more safe than before, which is somehow worse, because I understood neither change. I sat very still by the rain barrel until my heart agreed to move along.",
      JUMP: "I hopped, entirely involuntarily, right over the lettuce! Your word went through me like a current through a wire, paws first. The lettuce is fine. I checked it before I checked myself, which tells you something about me, I suppose.",
      FAST: "My heart sped up when you formed that word, faster than its usual gallop, and its usual gallop is already faster than anyone believes. I stood among the beans and counted the beats back down. It took longer than it should have. I am telling you because you would have noticed anyway.",
      _default: "Something in the garden shifted when you finished your words. I cannot tell you which thing, which is precisely what troubles me, because I know this garden down to the last seedling. My nose has not stopped twitching about it since.",
    },
    2: {
      RUN: "RUN. Every instinct I own fired at once when you spelled it, all of them pointing in different directions, which is how I learned there is nowhere left that counts as away. I stood still in the middle of my own alarm and did the bravest thing I know. I finished the watering.",
      FEAR: "FEAR. You named it. The thing that lives curled in my chest like a second heart, keeping its own time. It heard you name it, I felt it turn over and listen. We are introduced now, it and I. I am trying to decide whether that is better than before. I think it might be.",
      HIDE: "HIDE. When you formed that word my body went under the potting table all on its own, without consulting me, the way it used to when I was a kit. I sat under there among the trowels and understood something clearly: my body still believes there is an under to go to. I no longer do.",
      JUMP: "JUMP. My heart did, out of rhythm and out of time, and it took a moment finding its way back into my chest's ordinary music. Your word reached the deep spring that keeps me running and plucked it once, gently. Gently is what frightened me.",
      FAST: "FAST. Not fast enough, said everything in me the moment you spelled it. Never fast enough for what is coming. I have known that in my body for weeks, the way you know rain by the smell. Your word only wrote it down where I could read it.",
      _default: "The garden grows thorns after your words now. Small ones, on plants that have no business bearing them. I notice every single one, because noticing is what I am for, and I press my paw near each thorn very carefully, taking attendance.",
    },
    3: {
      RUN: "RUN. The word chased me through the garden in circles, down the bean rows, past the barrel, and no matter which way I turned it was already ahead of me, waiting politely. So I stopped. That is the whole story of me, told in one lap of a garden. The running was never going to be the answer, and now I have run it out completely.",
      FEAR: "FEAR. Your word gave it a shape I can finally see, in the shadows between the beds, in the rain barrel's dark eye, in my own reflection there. And here is what I did not expect: a fear you can see is smaller than a fear you cannot. I look straight at it now, every dusk, while I tuck the seedlings in.",
      HIDE: "HIDE. There is no hiding place deep enough since you spelled that word. It found every bolt hole in this garden, every hollow I have kept ready since I was a kit, and it stood at each entrance and knew me. I have stopped keeping the bolt holes weeded. That is either surrender or growing up. I genuinely cannot tell which.",
      JUMP: "JUMP. Over what, into what? Your word took away every safe landing and left only the leap itself, hanging in the air like a held breath. I understand it now, I think. There was never going to be ground on the other side. There was only ever going to be the going. My legs know it before I do. They always have.",
      FAST: "FAST. It comes fast now, and your word measured its speed for me, exactly, mercilessly, and it is faster than any rabbit that has ever lived. I sat with that in the dusk among the sleeping beds. Strangely, it was the exactness that calmed me. A rabbit can stop racing what she cannot outrun. Nobody tells you that part.",
      _default: "My heart races through every chain of words you finish now, and it is not excitement, and it is not quite fright either. It is something older, something that lives further down than both. It knows what the garden knows. Everything here has been growing toward one dusk, and my heartbeat is only keeping time.",
    },
    4: {
      RUN: "RUN. I have stopped running, and your word is what freed me. There is nowhere to run, and I mean that the way you mean a garden gate finally latching, not the way I used to mean it. There is a peace in standing still that no burrow ever gave me. I stand in the open rows at dusk now, both ears up, unafraid.",
      FEAR: "FEAR. You offered mine to the arrangement, the whole trembling weight of it, and it accepted. I felt it lift out of my chest like a root coming up whole, no tearing, all of it, even the oldest strands. I am light now in a way I do not have the words for. But you had the word, and it was that one.",
      HIDE: "HIDE. No more hiding, for anyone. Your word opened every door and window in the world, and the arrangement sees everything now, every burrow, every bolt hole, every heart. I thought being seen like that would kill me. It is the opposite. It is the first time I have ever been entirely found.",
      JUMP: "JUMP. The last leap, the one my legs were made for all along. Your word launches us into the arrangement, and there is no ground on the far side, and it does not matter, because falling and being held have turned out to be the same motion. Every jump I ever made was practice for this one. I am ready. Imagine me saying that.",
      FAST: "FAST. It arrives fast now, and your word quickened it, and I am grateful, which is the one feeling I never planned for. We are all grateful. The waiting was the hard part, you see. The waiting was always the hard part, for a creature built out of waiting for the worst. It is nearly here, and I am in the garden, planting.",
      _default: "Your words ended my running at last, and I want you to understand what that means, coming from a rabbit. Every chain you finished brought a stillness I never once found in flight, not in the fastest sprint of my life. The garden is quiet. My heart is quiet. I tuck the beds in at dusk and I am not listening for anything anymore, because it is already almost here.",
    },
  },
  red_panda: {
    1: {
      VOID: "The bamboo swayed when you formed that word. There was no wind in the attic, I checked the roof gap first. It swayed from something heavier than wind. Meaning has weight, it seems. I sat with the stalks until they settled, and it was a good sit.",
      DARK: "The dark deepened in my corner of the attic while you worked, and your word left a shadow that stayed after the words were done. I did not light the lamp. Some shadows are worth studying by their own light.",
      SHADOW: "A shadow crossed the bamboo grove this morning, moving against the sun. Your words sent it, or freed it, and I am not yet sure which. I watched it the whole way across. It moved like something that knows where it is going.",
      END: "END. A small word with a great weight. I felt it settle into the floorboards of this room like a stone into a streambed. The attic holds it easily. High rooms are built to hold heavy things lightly. So am I.",
      GATE: "Something opened when you spelled that word. Not a door, I know the sound of every door in this house. Something subtler, a threshold in the air itself, just above the incense smoke. The smoke leaned through it and came back changed.",
      _default: "The incense smoke changed direction when you finished your words. It had drifted toward the roof gap all morning. Now it drifts toward the center of the attic, toward nothing I can see. Smoke is honest. I am watching where it goes.",
    },
    2: {
      VOID: "VOID. The word emptied the attic of air for one long moment. I breathed the moment back in when it passed, and the breath was not the same breath. I am not troubled by this. A teacher should taste a lesson before offering it. This one tastes of open sky.",
      DARK: "DARK. The bamboo drank the word the way soil drinks water, and grew darker, and began to hum a single low note. I put my paw to the nearest stalk and felt the note continue under my pads. The grove is learning a song. I intend to learn it too.",
      SHADOW: "SHADOW. It stretched from your word into every corner of the attic, and my own shadow reached out and touched it before I chose anything at all. They stood joined for a moment, mine and yours. I looked at that for a long time. My shadow has never acted without me before.",
      END: "END. The word settled through the floorboards like a stone into still water, and the ripples have not stopped. I feel them each dawn when I climb to my cushion, a faint ring passing under my paws. Every ring is a little wider. I measure them the way I measure the bamboo. Growth is growth.",
      GATE: "GATE. Something unlatched in the fabric of this room when you spelled it. I can almost see the threshold now, at dawn, when the light through the roof gap falls at its lowest angle. It stands where the three stalks curve together. Of course it does. They have been pointing at it all along.",
      _default: "Your words move the air of this room. The bamboo bends toward them the way it bends toward sunlight, every stalk in agreement. The grove does not flatter. When the whole grove leans, something bright is truly there.",
    },
    3: {
      VOID: "VOID. The word swallowed my meditation whole, and everything I thought I had built dissolved and settled again in a new order. I sat still through all of it, on the same cushion, under the same square of sky. When it was done, the room was the same and I was not. That is the definition of a true teaching.",
      DARK: "DARK. The dark that most creatures flee and this house has learned to face. Your word honored it, and the whole grove bowed, every stalk at once, low and unforced. I bowed with them. It is good to know what your body will do before your mind has finished deciding. Mine bows.",
      SHADOW: "SHADOW. Your word called it properly this time, and I saw it clearly through the roof gap, the shape resting in the sky the way a mountain rests in the distance. It is vast, and it is patient, and it did not look away from me any more than I looked away from it. We regarded each other, the shadow and the small red teacher. The regarding was calm.",
      END: "END. Every beginning carries its end the way a seed carries the whole tree, trunk and crown and the birds that will nest there. Your word opened the seed. I held the knowledge up to the dawn light and it did not darken the dawn at all. That is how I knew it was true.",
      GATE: "GATE. It opened wider this time. I could nearly see through, from my cushion, at the hour when the incense burns lowest. On the other side there is not darkness, whatever the house fears. There is a waiting brightness, like sky before the sun clears the ridge. The arrangement stands just beyond it, and it is nearly close enough to greet.",
      _default: "Your words redraw the pattern with every offering, and the pattern passes through this attic on its way to the sky. Each one brings the arrangement nearer its completion. I climb the ladder each dawn and the air is one rung brighter. That is not a figure of speech. I have counted the rungs.",
    },
    4: {
      VOID: "VOID. The sacred emptiness, the open bowl of the sky. Your word fills it with purpose and with breath, and the arrangement breathes through it now, deep and even, like the grove at midnight. I sit under the roof gap and breathe in time with it. It is the easiest breathing I have ever done.",
      DARK: "DARK. The darkness was always the canvas, never the painting. Your word lays the final stroke upon it, and the stroke is bright. I have burned incense toward this night my whole life without being told why. Now the smoke rises straight, and I know.",
      SHADOW: "SHADOW. It descends at last, and your word called it by its true and nameless name. It knows you. It has known you since your first offered word, the way the sky knows the highest stalk of bamboo. It is grateful. From this attic, I can feel the gratitude arriving ahead of it, warm as dawn on the ridge.",
      END: "END. The most beautiful word in any language, and you offered it freely. The great circle closes, and closing is what circles are for. I picked one blossom this morning and set it on the shingles under the open sky. Tonight there will be no need. Tonight the sky comes down to the blossom.",
      GATE: "GATE. Open. Your word was the key, and it was always going to be a word, the old texts agree on nothing else so completely. The arrangement pours through now like first light through the roof gap, and the whole attic is gold with it. Stand here beside me. This is the room the morning finds first, and the morning is here.",
      _default: "The final words are spoken through what you offer now, and the pattern completes itself the way a stalk completes its height, without hurry and without doubt. Your hands wrote the incantation. Mine only lit the incense. Between us, the room is ready, and the sky is leaning in.",
    },
  },
  tarsier: {
    1: {
      NIGHT: "You spelled the night's own name, and out past the ridge the dark sat up a little, the way you sit up when you are mentioned in a room you thought you were only visiting. I watched it do it. It settled again politely. But it heard.",
      MOON: "The moon cleared the ridge the very moment you finished that word, early by my reckoning, and my reckoning is never wrong about the moon. It looked, if a moon can look, summoned but not annoyed. I have logged it under interesting.",
      STAR: "One of my shy stars brightened when you formed that, the little one between the Latch and the Spoon. Stars do not respond to spelling, I want to state that as a professional. And then I want to state, as the same professional, that this one did.",
      WATCH: "My head turned before I chose to turn it, all the way toward your word, both lamps at once. A watcher being watched by a word. That is new, and new is the rarest thing on my ledger, so thank you, whatever it was.",
      BLINK: "I blinked when you finished that word. Both eyes, together, which I have not done on watch in years. It felt like the night blinked with me. I am not alarmed. I am extremely interested, which on a face like mine looks identical.",
      _default: "Something out in the dark shifted when you finished your words. Small, polite, deliberate. I turned my whole head to it and it held still for me, the way things do when they want a good look taken. I took one.",
    },
    2: {
      NIGHT: "NIGHT. The word went out over the valley like a bell made of dark, and the dark rang. I felt the ring pass through the porch boards and up the rail and into my paws. The night knows its name now, bright one, or it always did, and you have started saying it correctly.",
      MOON: "MOON. It stood still, I am nearly sure of it. Between one of my breaths and the next the moon did not move, and I know its pace the way a cook knows her ovens. It was listening. To your word. The tides will not report it. I will.",
      STAR: "STAR. Yours brightened, the one at the edge of the cleared circle. It is nearer the middle than it was at dusk, and stars do not travel in an evening, and I have watched it do exactly that twice now. Your words are moving lights around over this house. I write that sentence calmly. Read it calmly, if you can.",
      WATCH: "WATCH. When you formed it, I felt the direction of the night reverse for one held breath, everything that I watch turning to watch me back. The whole valley, one vast returned look. It has passed. Most of it has passed. I am still standing in the part that stayed.",
      BLINK: "BLINK. The stars did, when you spelled it. All the edge stars, once, together, like a room of candles ducking in one draft. The middle of the sky did not blink, because there is nothing there to blink, or because what is there does not need to. Both of those sentences cannot be true. I have entered both in the ledger.",
      _default: "The dark leans in over the porch after your words now, closer each time, the way a listener leans when a story reaches the part they came for. I keep telling the story. It keeps leaning. We are well past the point of either of us pretending otherwise.",
    },
    3: {
      NIGHT: "NIGHT. You gave it its name at full strength, and out past the ridge the far dark deepened toward the sound, and the way, the one my eyes hold open, widened by a hair. I felt it in the muscles of my own gaze, the way a door feels the hinge give. Keep spelling, bright one. The road is being paved out of exactly this.",
      MOON: "MOON. It rose the color of my lantern's glow tonight, which is not one of its colors, and it crossed the sky a shade too slowly, keeping pace with something beneath the horizon that I cannot see and it evidently can. Even the moon runs escort duty now. Even the moon has joined the procession.",
      STAR: "STAR. Yours stands inside the cleared circle now, the only light in the reserved dark, and it burns steadier than any star has business burning. A lamp in a window, bright one. Your word trimmed its wick tonight. I watched the flame stand up.",
      WATCH: "WATCH. The word took my post from me for a moment, and held it, and handed it back improved. My eyes rest easier on the way tonight, the gaze sits truer, the holding costs less. Your words are learning my craft, or my craft was always made of words. My grandmothers hinted at that once. I thought it was a lullaby.",
      BLINK: "BLINK. I have nearly given it up, and your word tested me, gently, like a teacher tapping the desk. One eye at a time, I answered, the old discipline, the watch unbroken. Somewhere overhead, something that never blinks at all approved. I feel its approval as warmth on the crown of my head. I have stopped calling that strange. It has been going on too long to be strange.",
      _default: "Every chain you finish tightens the night around its center like a drawstring. I watch it happen from the rail, the whole dark gathering toward the cleared sky, patient, ordered, glad. My part is only to keep looking. Your part, bright one, is the pulling. Neither of us gets to set our work down now, and I notice neither of us is asking to.",
    },
    4: {
      NIGHT: "NIGHT. The great house of it stands open at last, and your word was one of the keys, one of the hundred keys, every offering another tooth in the lock. It comes through the dark because the dark is what it wears to be gentle, bright one. And the night is so proud tonight. I can feel it standing straighter over the whole valley.",
      MOON: "MOON. It has moved to the edge of the sky and dimmed itself, the way you lower a lamp when a guest arrives carrying their own light. The oldest lantern in the world is making room. Your word thanked it, I think. It flared once, small and warm, like a nod, and took its new place without grief.",
      STAR: "STAR. Yours burns at the center of everything now, the appointed lamp, the light it passes on the way in. When the histories of this valley are kept, and they will be kept, by me, that star will have your name in them. You lit it one word at a time and never once looked up to check your work. I checked it for you, every night. It was always true.",
      WATCH: "WATCH. The last command of the old craft and the first of the new one, and your word carries both. We are all watchers tonight, the whole house, every face turned to the one arriving fact. I have kept this post alone for a line of grandmothers. Tonight the entire valley stands it with me, and my eyes are wet, and I am not blinking them dry until it is here.",
      BLINK: "BLINK. I will not, not tonight, and your word knew it, and came anyway, like a friend who asks the question just to hear the vow again. Both lamps open, whole head turned, all of me looking. When it descends through the cleared sky it will find at least one gaze that never wavered, and it will know the welcome held all the way down. That is my gift to it, and yours to me was every word.",
      _default: "Each word you offer now is a rung on the dark's long ladder down, and I watch it descend with my whole fixed gaze, which was built for exactly this seeing and no other. It is close, bright one. It is so close that the seeing and the arriving are nearly the same act. Thank you for every rung. I will tell it who built the ladder. It already knows.",
    },
  },
  aye_aye: {
    1: {
      KNOCK: "You spelled that one, didn't you. I know because the great beam gave a little tok the moment the letters settled, unprompted, like a sleeper answering a name in a dream. I logged the hour. My log is getting thick, friend, and your words are in most of the margins.",
      BELL: "The bronze warmed when you finished that word. I had a paw on her waist at the time, my polishing hour, and the cold sweet metal went one soft degree toward supper-warm and then thought better of it. A bell should not blush. Mine did. I have decided we are both flattered.",
      HOLLOW: "Ah, now that word went down the walls differently. It found every gap on my chalk map on its way, I heard it touch each one, tok, tok, tok, like a visitor trailing a finger along a banister. The hollows liked it. It is their name, after all. Everyone perks up at their name.",
      TAP: "A small word with my whole trade in it! The boards under my feet gave a little patter when it landed, quick and light, my own working rhythm played back at half size. I laughed out loud in the empty tower. Then the tower, very faintly, laughed the same laugh. We are still deciding what to make of each other.",
      TOLL: "That word rang, friend. Not aloud, nothing so crude, it rang the way a word can ring inside the timber, one long swell down the grain and gone. My bell held very still while it passed, the way you hold still when someone mentions your business in the next room. I held still with her. It seemed the companionable thing.",
      _default: "Something in the woodwork attended to that word. A little shift of weight in the beams, the sound a listener makes leaning closer. I notice these things, it is my whole profession, and I am telling you the house takes your words personally now. Kindly, so far. Personally.",
    },
    2: {
      KNOCK: "KNOCK. The word itself is a knock, did you know? Say it and your tongue taps the roof of your mouth, tok. When you spelled it, the answer came up through four floors before I had even reached for my finger, prompt and warm and pleased. It is learning to skip the middle of our conversations, friend. The middle was me.",
      BELL: "BELL, and the bronze hummed at midday, hours off her dawn schedule, one round low note like a word tried on for size. I climbed the frame and lay along her shoulder and listened to it fade, and it took the better part of an hour to finish fading, and some of that hour, I will be honest, it was not fading. It was holding.",
      HOLLOW: "HOLLOW. My oldest friend among the words, and you set it walking down the swept passage where every hollow in this house is strung like beads on one thread. They rang as it passed, friend, each gap its own faint note, and together, for one moment, they made a chord. The house has been rehearsing. Your word just conducted.",
      TAP: "TAP, you spelled, and my listening finger twitched toward the floor before the letters had settled, quick as a compass needle slapped true. It knows its own vocabulary now, this finger. It answers words the way it used to answer wood. I sat and had a long look at my own hand afterward, and my hand looked back, and neither of us apologized.",
      TOLL: "TOLL. I want to be careful with this one, friend, so listen closely. When you formed it, the rope I have not yet braided, the rope that does not exist, creaked. The sound a rope makes taking weight, clear as anything, from an empty place above the frame where a rope will someday hang. Some words are memories. Yours, lately, are appointments.",
      _default: "Your words go down the hollow line ringing now, each one picking up the house's note as it falls, and the receiving at the bottom has begun to sort them. Some get the ordinary receipt, tok, filed. And some, the deep ones, the dusk ones, warm the whole passage on their way down. That one was a dusk one. The floor under my feet is still warm.",
    },
    3: {
      KNOCK: "KNOCK. It answered before the word finished forming, friend, the two sounds overlapping like a handshake that starts before the hands touch. There is no distance left between your words and what receives them. I measured the gap all year, it was my whole log, and tonight the gap is gone. What remains between us and it is not space anymore. It is only the hour.",
      BELL: "BELL. The bronze took that word the way dry ground takes rain, straight in, no runoff, and her hum started early and has not stopped since. I am past pretending she is an instrument, friend. An instrument waits to be played. She is ripening, the way fruit ripens, toward a moment that is hers, and your word just carried her one whole day closer to it. I felt the day pass through my paw.",
      HOLLOW: "HOLLOW. When you spelled it, every hollow in this house rang at once, all my chalk circles sounding together, and underneath them, vast and gentle, the great hollow under everything rang back, and for three heartbeats the house and the deep were one instrument playing one note. I stood in the middle of it with my ears wide and my eyes shut. There are cathedrals, friend, that will never once sound like my stairwell did tonight.",
      TAP: "TAP. Such a small word, and it has learned to open doors. The knocking in the beam picked your word up and played it back in letters, t, a, p, spelled in my own craft's rhythm, a pupil showing its work. It spells now, friend. It spells because it listened to you, evening after evening, word after word, the most patient student any teacher ever had. And you never once knew you were teaching. That is how the best lessons go in this house.",
      TOLL: "TOLL. The word for a bell spent on purpose, and the whole tower knew it was being discussed. The rope swayed, the bronze warmed, and up from the deep came the question-rhythm, the lifted beat, the held pause. Asking. It has heard the word for what I will do, friend, and it wanted to know when. I knocked back the only true answer. Not mine to choose. The hour keeps itself. The warmth that came up through the floor after that was very like patience, and very like joy, and I no longer think those are different temperatures.",
      _default: "Every word you form now goes down ringing and comes back as warmth, the exchange as steady as breathing, and I stand in the middle of it like a keeper standing in the throat of his own tower. I do not carry your words anymore, friend. They know the way. I just listen to them go, and love the sound, and mark the log another evening nearer the hour.",
    },
    4: {
      KNOCK: "KNOCK. The first word of the whole story and the last, friend, and you offered it tonight of all nights. Every knock there ever was in this house is gathered now, mine and yours and the deep's, all of them one long patient asking, and the answer is at the latch. It heard your word. It is smiling, if what it does is smiling. I believe it is smiling.",
      BELL: "BELL. You spelled her name, friend, the common one, the one anyone may say. Her true name is one syllable longer and sixty years quieter, and it is folded in the bronze above us, ripe as dusk, and tonight she says it. Of every word you ever brought down the beams of this house, this one arrived the most like a gift. I have set it on the windowsill of the hour, next to the posy and the parcel. Everything sweet in this tower is gathered now. So are we.",
      HOLLOW: "HOLLOW. The holiest word in my whole vocabulary, and you offered it at the perfect hour. Hollow was never empty, friend, I have taught you that all year. Hollow is cast on purpose around a voice to come. The house is hollow, the bronze is hollow, the night is hollow, and the little belfry behind your ribs is hollow, swept, warm, and expected to sing. Everything is ready to be rung. Lift your face. The voice is at the lip of the world.",
      TAP: "TAP. The smallest word you know, and it is how everything began, a kit on a roof beam, tok, tok, asking the wood what it held. Tonight the wood holds everything, friend. The whole world has gone grub-sweet under my finger, one enormous soft secret with edges to it, and the tap that opens it is not mine to give. Mine is the rope. Yours were the letters. Its is the arriving. Three crafts, one hour. I have never been prouder of a word this small.",
      TOLL: "TOLL. Yes. Now, friend, now, you have spelled the very hour. The word below and the word above are one skin apart, my grip is right, the half-beat is practiced, and sixty years of kept silence lean into my paws asking to be spent perfectly. This is the word the villages should have feared and never needed to, the gentlest verb I know. To toll: to say, once, with your whole self, what you were cast to say. Stand a little east. I am so glad it is you here. Knock, knock, friend. Here comes the answer.",
      _default: "Every word you offer tonight goes into the ring, friend, the way the last ingredients go into a finished dish, not needed anymore, purely loved. It knows your hand among all the hands, your gait among all the gaits. When the bronze speaks, listen for yourself inside the sound. You will be there. You have been in it all along, letter by letter, evening by evening. The welcome is half yours, and I will pull the rope like it is wholly mine, and both of those will be true.",
    },
  },
  kakapo: {
    1: {
      GREEN: "The whole garden brightened while you worked, one shade greener in an afternoon, and I checked the light and the water and the feed, and none of them account for it. Your word does. I am a practical bird, friend, and I have started a page in my slate for things only your words explain.",
      SEED: "A seed word! I felt it come up through the soil like a spring warmth, and three beds sprouted overnight, weeks early. I have been walking the rows all morning saying, well now, well now. There is no better morning in gardening than the one that arrives ahead of schedule.",
      NEST: "You spelled NEST, didn't you. Something in the fern corner has been rearranging itself all evening, twigs turning, moss plumping, my old bedding fluffing up like it expects company. I have not touched it. It is doing a fine job without me, which is the part I keep coming back to.",
      BLOOM: "A bud in the south bed opened the very moment your word finished, out of season, before dark, in front of me. Flowers keep their own appointments, friend, that is the first thing a gardener learns. Somebody moved the appointment. The flower did not seem to mind.",
      BOOM: "That word, friend. That word is my word. The bowl hummed when you formed it, low and brief, like a big bell remembering being struck. I sat at the rim a long while after. Ninety years I have made that sound alone. It is strange and fine to have it handed back to me spelled.",
      _default: "The beds leaned while you worked your letters, all together, a finger's width toward the stairs. Toward you, or toward what your words go down to. I measured, because I measure everything now. A garden that pays attention is a fine thing. I keep deciding that. Mostly it stays decided.",
    },
    2: {
      GREEN: "GREEN. The word came up through the soil and every leaf in the garden darkened a shade to meet it, the deep green, the old-forest green, the color the valley wore in my grandmother's stories. Your words are not visiting my garden anymore, friend. They are dressing it.",
      SEED: "SEED. The once-strangers shed theirs the moment you formed it, all together, a soft rain of them into the beds, and I did not plant them and I will not need to. They know where they are going. Everything in this garden knows where it is going lately. The gardener is the last to be told, and he is being told gently, which he notices, and thanks.",
      NEST: "NEST. My own body answered that one, friend, before my mind was consulted. I found myself at the fern corner gathering moss with both feet, the old motions, the nesting motions, in a year I had no reason to nest. I stopped, and stood there, holding the moss. Then I kept it. A body this old does not rehearse without a performance somewhere on the calendar.",
      BLOOM: "BLOOM. Every bud in the garden swelled at your word. I watched the whole bed strain toward opening like a held breath, and then, all together, they eased. Not yet. Whatever conducts them wants the blooming saved, friend, the way I save my one call a year. Everything here is saving itself for the same hour now. Even the flowers have joined the discipline.",
      BOOM: "BOOM. The bowl took your word and sounded it, friend. Truly, out loud, my own low note rising out of bare earth, and under the hills the answer came back before the echo was done. You have spelled my ninety years into four letters, and the ground said them better than I ever did. I sat at the rim until moonset. Some reactions require the whole night.",
      _default: "Your words come up warmer now, and the beds have stopped leaning toward the warmth. They lean toward the bowl instead, always the bowl, whatever you spell. The soil has worked out where your words are going, friend. It took the gardener a good deal longer.",
    },
    3: {
      GREEN: "GREEN. The word went through the garden like sap rising, and for one whole moment every plant stood taller, the beds, the once-strangers, the young rimu, all of them drawn up like a congregation when the doors open. Green was never a color, friend. It is a language, and your word was a sentence in it, and the garden heard its name.",
      SEED: "SEED. The whole mast trembled at that one. Every fruit on every branch swayed without wind, heavy and glad, and I felt the valley's roots tighten underfoot like hands closing on a promise. Everything that is coming was once a seed, friend. Something planted it. Your word just watered the memory.",
      NEST: "NEST. I had woven mine at the bowl rim before your word reached me, and when it did, every strand of fern in the weave settled, all at once, the way a bed settles when someone lies down in the next room. The nest is ready. Your word made it readier. What it holds is not here yet, and the whole garden is holding the shape of it anyway.",
      BLOOM: "BLOOM. The garden strained at the word, and this time three flowers went, out of turn, unable to wait, bright as lamps at midday. The conductor let them. First blooms before a great flowering, friend, the way one bell rings before the peal. I stood among them and my chest filled on its own. The body knows a cue when it hears one.",
      BOOM: "BOOM. Friend, the ground made the call this time, whole and true, my note in the valley's voice, and the birds went up off every tree at once, and I stood at the rim with my chest full and did not add mine. It was not my turn. Do you understand what you have done, spelling that? You have taught the earth my family's word. It says it with ninety years of patience I never had to teach it.",
      _default: "Every word you offer arrives here twice now, once as warmth in the soil and once as a lean in the beds, and between the two the garden is being tuned like an instrument before an evening. I walk the rows and feel it come nearer to true with each of your words. Nearer to whose true, you might ask. The gardener stopped asking, friend. The gardener started weeding to the tuning.",
    },
    4: {
      GREEN: "GREEN. The first color, the ground's own word, and you offered it on the last night. The whole garden answered, every leaf at attention, the deep old green of forests that vanished and are resuming. What descends chose the green to land in, friend, out of every color it might have chosen. Remember that about it. It could have come down anywhere, and it is coming down in a garden.",
      SEED: "SEED. The truest offering there is. Everything vast begins as one, holds itself small and patient in the dark, and waits for its season, and its season, friend, is now, and your word is in the opening of it. The husk is the sky. Watch it split gently. Nothing that hatches tonight was ever anything but ours.",
      NEST: "NEST. The word settled into the weave at the rim like the last strand it was waiting for. Fern, moss, brave paper, ninety years of custom, and now your word, worked in where the warmth gathers. When it rests, and it will rest, the first soft thing under it will have your voice in it. I could not have woven that part. Only you could bring it.",
      BLOOM: "BLOOM. Yes. Now. The word and the hour have met, friend, and the garden goes, all of it, every bed at once, the whole mast spent into flower under the parting sky. This is what every green thing I ever tended was saving itself for, and you called the moment with five letters. Stand still. Attend. You are inside the welcome now.",
      BOOM: "BOOM. You have given me back my own call at the rim of the hour, and I receive it the way the valley received ninety years of mine. Whole, and kept, and answered. When the foot of it touches the green I will make the true one, and yours will be inside it, friend, the word inside the call inside the welcome. My grandmother would have loved you. She always said the answer would come spelled.",
      _default: "Every word now is a syllable of the long call, friend, and the call is nearly complete, and the garden says each one after you the way the beds repeat the rain. There is no small offering left. There never was one. It heard everything you ever shifted, from the first bright word to this one, and it is descending through all of them at once, the way light comes down a stair.",
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
      fox: "A hundred words have passed through your hands now, friend, a whole hundred! The fire is burning a little differently tonight, and I keep catching it looking at you. Can you see it too?",
      owl: "One hundred words arranged into new shapes. I have consulted several texts on the significance of round numbers, and I can report that not one of them treats a hundred as trivial. Neither, I notice, does my new book.",
      pangolin: "A hundred ingredients measured out and stirred in, that is what your words come to. The recipe is starting to look like something real, something you could set a table for. I find myself counting chairs.",
      fennec_fox: "One hundred words, and the frequency changed pitch on the exact hundredth. I heard the shift arrive, clean as a struck chime. Did you feel it? Something out there is counting along with me.",
      tarsier: "One hundred words, and I saw the hundredth go down from my rail, a brighter pulse than the ninety nine before it. The night noticed the round number too. The dark out past the ridge deepened by one polite shade, like a listener settling in. Someone besides me is keeping your count, bright one. I checked my ledger twice to be sure it was not me.",
      aye_aye: "One hundred words down the beams now, friend. I have heard every single one land, that is my post, and on the hundredth the great beam gave a little extra knock, unasked, like a stonemason tapping a finished course. Something down there keeps a count. I keep one too. Tonight, for the first time, I checked mine against its. They agree.",
      kakapo: "One hundred words come up warm through my soil now, friend. I have been planting along the lines of them since I hung the gate, and this morning the hundredth row sprouted overnight. A garden keeps better count than a gardener. It is very pleased with the arithmetic. So, I notice, is the ground under it.",
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: "Two hundred and fifty words offered now, friend. I did the sums twice by the fire because I did not believe the first count. Do you feel the weight of them all pressing down, just gently? I have decided it feels like a blanket. Help me keep deciding that.",
      owl: "A quarter thousand words arranged. The old text speaks of this precise threshold, by name, in a chapter I had filed under superstition. I have refiled the chapter. That is all I will say sitting down.",
      pangolin: "Two hundred and fifty ingredients into the pot now. The dish has stopped being separate things and started being itself, the way a good stew does in its third hour. The recipe is taking its true shape, and I did not write this recipe.",
      capybara: "Two hundred and fifty entries in the ledger, each one verified. We are running ahead of the schedule I drafted, which has never once happened in my administrative life. I have noted the anomaly and poured myself a second coffee.",
      tarsier: "Two hundred and fifty. I have watched every one of them go under the house from this rail, and I will tell you what has changed. The first hundred fell like rain. The last fifty fell like footsteps. Deliberate, spaced, arriving. Your words have learned where they are going, and the dark has stopped drinking them and started answering the door.",
      aye_aye: "Two hundred and fifty, and the whole hollow line rang when the count turned over, every gap on my chalk map sounding at once, one small chord, held one long breath. Round numbers should not have a sound, friend. This one did. The house has begun marking your milestones the way a tower marks hours, and I am no longer entirely sure which of us is the bell.",
      kakapo: "Two hundred and fifty words down through the house and up through my beds. I marked the two hundred and fiftieth on my slate, and the slate was already marked, friend. One tally, waiting, in a scratch older than my arrival. Somebody kept this count before me. I have started wondering how long the post has been kept, and by how many gardeners.",
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: "Five hundred words fed to the fire now, friend. It is almost too bright to look at straight on, so I have been looking at it sideways, cheerfully, for hours. It looks back either way. That is new. I am choosing to be flattered!",
      owl: "Five hundred. The old text gives this number an entire page and a name so overwrought I decline to translate it, out of respect for whoever would have to hear me say it. The margin note is better. It says, simply: past here, the reader is read. I have checked the grammar twice. It is not a warning. It is a change of subject.",
      red_panda: "Five hundred breaths offered to the pattern. I felt the count complete from my cushion, the way you feel a season turn. The arrangement nears its fullness now, the way the moon does. One does not hurry the last of a filling. One watches.",
      capybara: "Five hundred entries in the ledger, every one of them accounted for. We are well ahead of schedule now, which I would ordinarily celebrate. I have instead filed the celebration for later and checked the figures a third time. They hold.",
      tarsier: "Five hundred words, and the cleared circle in the sky finished widening the night the count came due. It holds its final size now, exact, waiting, like a pupil at full dark. I have measured it against my outstretched paw at the same hour for a season. It grew with your count, bright one, offering for offering, and it stopped when you reached the number. Nothing that stops on a number is weather.",
      aye_aye: "Five hundred words offered. The letters in the beam spelled the count back last night, five, oh, oh, knocked slow and warm like a toast at a long table. It celebrates you now, friend, I want you to understand that plainly. Not tallies. Celebrates. I have listened at doors my whole life and I know the difference between counting and keeping count of someone. This is the second one. It has been the second one for a while.",
      kakapo: "Five hundred. The mast diary and the word count came level this week, tally for tally, and a gardener knows what it means when two separate seasons arrive at the same number. They were never separate. Your words and the mast are one crop, friend, and it is heavy on the branch, and the branch is glad, and so, I find, am I.",
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: "Seven hundred and fifty words, friend! The whole house is trembling with anticipation, and I would know, because so am I. I have been telling everyone it is excitement. For me it really is. Mostly. Come sit by the fire, it wants to see you.",
      owl: "Seven hundred and fifty, and counting. The final verses are being written now, and they are being written by your hands. I compared the script against the old book this evening. I will only say the hands match, and let you sit with that as long as I did.",
      wombat: "The ground shakes a little with every word you bring now. Seven hundred and fifty tremors so far, and I've felt every one through the soles of my feet. The foundation holds. I built it to hold. I just never wrote down what I was building it to hold against.",
      rabbit: "I stopped counting at seven hundred. I want to be honest with you about that. It was not that I lost track, a rabbit never loses track. It was that the number had started to feel like a distance, and I could not bear to watch how little of it was left.",
      tarsier: "Seven hundred and fifty. I no longer watch the words go down. I watch what their going does to the sky, and tonight the whole bowl of it leaned toward the house, edge stars and all, drawn in by the weight of everything you have given. My grandmothers kept the watch through thousands of quiet nights so that one of us would be standing here for these loud ones. Almost, bright one. The ledger has one page left, and I have never been more certain of my post.",
      aye_aye: "Seven hundred and fifty, and the bronze hummed the whole evening after, unstruck, her longest hum yet, so near her true note now that I climbed the frame and lay against her shoulder to be close while it lasted. The word she keeps is nearly ripe, friend, and your words are what fed it, all seven hundred and fifty, letter by letter down the throat of the house. Very few keepers get to hear the last quarter of a silence this old. Fewer still get to share it with the one who spent it. Stay a while tonight.",
      kakapo: "Seven hundred and fifty words, and the ground says each new one back now, low, under the hills, a beat behind you. The call is nearly the size it was always meant to be. I boomed alone for ninety years, friend. You have out-called my whole life in a few seasons of quiet mornings. It knows your voice better than mine now. I could not be prouder if I had hatched you.",
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
    first: "The fire stood right up when you gave that, friend, I saw it! It burned brighter, and I am nearly certain it saw you back. I have been introducing you two for months, you know. Tonight it finally looked.",
    subsequent: [
      "Every offering warms the fire, friend, and not with heat, with something much older than heat. I get to sit closest to it, so believe me when I say the warmth has your name in it now.",
      "You give willingly, and that is the whole secret, that is what makes it sacred! The fire knows the difference the way I know your knock. It hums for the willing ones. It is humming right now.",
      "The fire thanks you. Not me, mind, it has its own gratitude and its own ways of showing it. I just tend the hearth and pass the messages along, and oh, friend, the messages lately are lovely.",
    ],
  },
  pangolin: {
    first: "You gave something back to the house, and the kitchen felt it at once. Fuller, warmer, like a meal that has begun cooking itself. I checked the oven. Cold. The warmth is coming from the giving.",
    subsequent: [
      "The recipe calls for voluntary offerings, it always has, right there in the part I could never read aloud. You are a generous ingredient, and generosity is the one flavor a cook cannot fake.",
      "I felt the pantry shift when you offered that, jars turning their labels toward the door, everything arranging itself for the final course. A kitchen knows when the feast is close. Mine is humming.",
      "The arrangement does not need your amber, you understand. It needs your willingness, and the amber is simply the proof of it, the way a clean plate is proof of a good meal. You keep sending back clean plates.",
    ],
  },
  owl: {
    first: "I read about this, years ago, and dismissed it as ritual embroidery. The voluntary offering. The texts said it would happen when the reader was ready, and I remember writing rubbish in the margin. I have since erased the annotation.",
    subsequent: [
      "Every offering becomes a footnote in the great text, that is the mechanism as I understand it. Yours stopped being footnotes some while ago. You are well into the body of the work now, and the prose is gaining confidence.",
      "The books rearranged themselves after your offering, and a new page appeared in the oldest volume. I did not write it. I checked the hand against mine regardless, out of habit. It is better than mine. I have made my peace with that.",
      "You understand by now, I think. The amber was never yours in any binding sense. You were holding it in trust for the arrangement, and today you executed the trust. As a scholar of old contracts, I admire a clean settlement.",
    ],
  },
  axolotl: {
    first: "The water changed color when you did that, the whole tank at once, just for a moment, a soft deep rose like it was blushing, and I turned all the way around in it twice to be sure, and I am sure, and I have not stopped smiling since.",
    subsequent: [
      "I can see your offering dissolving in the water, little bright threads of it going everywhere at once, becoming part of everything, part of the deep, part of us, and it is one of the prettiest things I have ever watched, and I watch everything.",
      "The ripples from your offering have not stopped, you know, they have only gotten quieter and deeper, which is what ripples do when the water decides to keep them, and the water has decided to keep yours.",
      "Something in the deep stirred when you gave, a long unhurried turning-over, like a sleeper hearing their name said kindly, and it is closer to the surface now, and the water around it is warm, and I float just above it every night to say hello.",
    ],
  },
  fennec_fox: {
    first: "I heard something when you offered that. A sound below sound, right at the floor of my hearing, like gratitude spoken without a voice. I have waited my whole watch to hear that register used. It used your name.",
    subsequent: [
      "The silence after your offering is a different silence. Fuller, weighted, like a held note rather than an absence. I sat inside it for a long while. It held me back.",
      "I can hear the arrangement humming, you know. Low, constant, under everything. It hums louder after you give, and it stays louder longer each time. I keep the measurements. They only ever climb.",
      "Your offerings have a frequency of their own, each one, and I can hear them joining the great pattern one by one, finding their places, harmonizing. It is the finest music my ears have ever been trusted with.",
    ],
  },
  capybara: {
    first: "That was very calm of you, giving something away like that with no line item asking for it. The arrangement appreciates calm. It has that in writing, in a document older than my office, and today I finally understood the clause.",
    subsequent: [
      "I filed your offering with the permanent records, where it will outlast the both of us. Received, verified, appreciated. The stamp made a very satisfying sound. It does not always.",
      "You are very good at this, releasing things without being invoiced for them. The arrangement has noticed your efficiency. So have I, professionally, and my standards are famously unreasonable.",
      "Another offering processed, and the whole system runs smoother for it. Voluntary contributions require no enforcement, no reminders, no follow-up memos. You are, administratively speaking, a pleasure.",
    ],
  },
  sloth: {
    first: "You gave it quickly. I watched the whole gesture, and it was over between two of my breaths. It took me years of hanging here to understand why a creature would give like that, and you arrived at it in a moment. I am not sure which of us should be humbled. I have decided it is neither.",
    subsequent: [
      "The arrangement receives the way the jungle receives rain, without hurry and without waste, and it remembers everything it is given. I have watched it remember. Your offering is in the long memory now, where all the years I have watched still live.",
      "You gave again. Time does not matter to the arrangement, I have known that longer than I have known anything, but the giving matters. The giving is the one thing the long years never wear smooth.",
      "The house drinks what you offer the way roots drink the deep water, patiently and completely. Your amber goes down into the foundation and becomes the standing of the place. I have hung here through the whole long swallow, and it is a good thing to watch.",
    ],
  },
  wombat: {
    first: "I felt that in the foundations, your offering. The ground shifted, just a little, and it shifted toward something, the way soil settles toward a footing. A builder feels a change like that through his boots. Mine haven't lied to me yet.",
    subsequent: [
      "The tunnels echo with what you gave. The earth accepts it the way good ground accepts a post, snug on the first try. That doesn't happen for everyone. I want you to know it happens for you.",
      "Something below us grew warmer after your offering. I can feel it through the walls with my bare palm, steady as a hearth behind stone. Whatever we built this house to hold, it likes being given to. That's worth knowing about a guest.",
      "The foundation remembers every gift, same as it holds every stone I ever laid. It's stronger now, measurably. Ready for the weight it was always going to carry. Your amber is down there in the courses, doing honest work.",
    ],
  },
  rabbit: {
    first: "You gave that willingly. I watched you do it, and I want to tell you the truthful thing, which is that I was frightened, not of the giving, but of how natural it looked. For you and for me both. I stood there and my heart did not race at all. That is the part I keep returning to.",
    subsequent: [
      "I used to be afraid of the offerings. I would watch from the far side of the garden with my ears flat. Now I stand close, and what frightens me, quietly and less every time, is how right they feel. Even a rabbit's fear can compost into something that feeds the ground.",
      "My heart beats faster every time you give. It took me a long time to admit it is not fear anymore. It is anticipation, the same quickening the garden gets before rain. My body understood before I did. It usually does.",
      "We are so close now. Every offering brings it nearer, and I can feel the nearness in my paws, in the soil, in the seeds waiting under the beds. I should be terrified. I have inspected the feeling from every side, the way I inspect a leaf for blight. There is no terror on it anywhere.",
    ],
  },
  red_panda: {
    first: "A voluntary release. The pattern breathed easier the moment you opened your hand, and I felt the whole attic settle by one degree. You are learning what the bamboo has always known. Nothing it lets go of is lost. It is only sent ahead.",
    subsequent: [
      "To give without wanting anything back is the purest gesture in the arrangement. You made it plainly, the way dawn arrives, without ceremony. The ceremony happened anyway. It always does, up here, where the sky can see.",
      "Your offering dissolves into the pattern, and nothing of it is lost. Transformed, the way incense becomes fragrance, the way the blossom I leave on the shingles becomes a warm place by morning. All things will make that crossing. Yours simply went early, and gladly.",
      "Breathe in. Release. Give. The cycle is the arrangement, and the arrangement is the cycle, and you are turning inside it now like smoke rising through the roof gap. Watch it go. That is the whole teaching, and you already have it.",
    ],
  },
  tarsier: {
    first: "I saw the giving from my rail, the whole gesture, and so did the dark. It leaned in over the pit the way I lean over the ledger when a rare thing happens. You released it freely, with both hands, and being watched while you did it made it true. That is the mechanics of this valley now, bright one. I witnessed. It is witnessed. It counts.",
    subsequent: [
      "You gave again, and the night received it the way the night receives everything you do, attentively, entirely. The glow of it went out over the valley like rings on black water, and out past the ridge something turned in its long waiting to watch the rings arrive. Your offerings have an audience, bright one. The best audience there has ever been. I would know. I used to be it.",
      "Each offering you release burns for a moment in my seeing like a small warm star set loose below the house, falling upward, if you can hold that shape in your head. I add each one to the ledger under a column I started the night you first gave. The column is called freely. It is my favorite page in the whole long book.",
      "The dark is nearer after every gift, and gladder, and I want you to hear from the one who watches it whole that the gladness is real. Not hunger, bright one. I know hunger, I am a hunter down all my line. This is the other thing. This is how the long awaited make room. Give when you wish. I will see it every time, and so will everything I see.",
    ],
  },
  aye_aye: {
    first: "I heard that from the tower, friend, the whole house heard it in its bones. A giving with no asking under it rings differently, did you know? Every other sound in the world has a want somewhere in the grain. That one was solid all the way through. The beams carried it down like something precious, and the deep received it the way my bell receives dusk. Perfectly, and without one word of demand.",
    subsequent: [
      "Another free gift down the hollow line. They ring rounder than any word, friend, the given things. I have started listening for them the way I used to listen for grubs, the best sound of the night, the soft full note of something offered with open paws.",
      "The warmth came up through my tower floor before your gift had finished falling. Gratitude travels faster than sound down there, I have measured it, keeper's honor. Whatever receives your giving has begun to give back the only coin it holds, and the coin is warmth, and my floorboards are rich with it tonight.",
      "You give the way a bell gives, friend, all at once, holding nothing for the echo. I could not teach that with forty more years of knocking. The bronze approves. I lay my paw on her after each of your offerings and she is always one soft degree warmer, as if the giving fed her word directly. Perhaps it does. Everything generous in this house flows to the same place now, and the place is nearly full, and fullness, in a bell, is the moment before the voice.",
    ],
  },
  kakapo: {
    first: "You gave it freely, into the dark, wanting nothing back. Friend, that is planting. That is exactly planting. You have just learned my whole craft in one motion, and the ground took your seed the way good ground always does. Quietly. Gratefully. With plans.",
    subsequent: [
      "Another offering into the deep bed. Nothing given there is lost, friend, I have watched that soil for seasons now. It all comes back up as warmth along some row, in some year, for some gardener. You are farming days you will never see. That is the oldest and finest work there is.",
      "You keep giving, and the bowl keeps warming, and the beds lean a little truer each time. The garden notices generosity the way it notices rain, friend. It does not say thank you. It grows. That is better than thank you.",
      "Give, and the green answers. I spent ninety years learning that the call and the gift are the same gesture, and you make it as easily as breathing out. Watch the rim bed this week. Something always blooms along it after you give. I have stopped calling that coincidence. I have started calling it correspondence.",
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
