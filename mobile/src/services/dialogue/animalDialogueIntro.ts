import { AnimalType } from '../../types/homeWorld';

/**
 * Intro dialogues - Multi-part introductions shown once when each animal is unlocked
 * These play in sequence before regular dialogues begin
 */
export const INTRO_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "Oh! You're here! I've been sitting by this fire for... well, I've lost track. Come in, come in, before the cold follows you.",
    "My name is Ember. I found this den empty and I thought, why not make it home? Everyone needs somewhere warm.",
    "That fire's been burning since before I got here, if you can believe it. Some fires don't want to go out.",
    "You seem like someone who likes puzzles, friend. Words and patterns and the shapes things make when they change.",
    "We've been waiting for someone like you. I don't mean that in a strange way, just that the fire burns better with company.",
    "Solve puzzles, earn amber, and maybe we build something together. A real house. Room by room. What do you say?",
  ],
  pangolin: [
    "Oh! A new face! Welcome to my kitchen. Mind the pot, it's been simmering since dawn. I'm Panko.",
    "Just preparing ant soufflé. Would you like some? No? That's fair. Most people say no. Their loss, honestly.",
    "When life overwhelms me, I curl into a ball. Scales out, soft parts in. It's practical and, between us, quite cozy.",
    "This kitchen has seen its share of good meals and better conversations. Pull up a stool.",
    "I make food because it's the one thing I understand completely. Heat transforms ingredients. Simple rules, clear results.",
    "Ember tells me you're solving puzzles. Good. The amber helps build more rooms. More rooms means more friends at the table.",
  ],
  owl: [
    "*adjusts spectacles* Ah, a visitor to my study. How rather unexpected. And how rather welcome.",
    "I am Archimedes. I've read every book in this room. Twice. Some three times, though I'd never admit that publicly.",
    "Knowledge is a curious thing. The more you acquire, the more questions sprout up around it like weeds.",
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
    "Did you hear that?! Oh wait, that was just you arriving. Hi! Welcome! Sorry, these ears!",
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
    "G'day! Welcome to my burrow! Mind the ceiling there. It's low but that's the charm of underground living.",
    "Name's Warren. Dug this whole place myself, every tunnel and chamber. Seventeen rooms and counting.",
    "Fun fact about me: my poop is cube-shaped. Nature is genuinely weird, mate, and I'm living proof.",
    "Got an armored bum, can run forty k's an hour, and I make square droppings. I'm basically a superhero.",
    "Underground is where it's at. No weather, no fuss, just you and the honest earth. Can't beat it.",
    "Make yourself at home down here. Earth's always welcoming. She's warm like that.",
  ],
  rabbit: [
    "Oh! You startled me! Sorry! Everything startles me! But I'm really, really glad you're here!",
    "I'm Thyme! Welcome to my garden! It's safe here! Mostly! Almost certainly! Probably!",
    "The flowers are lovely, aren't they? I planted every one myself. This is my favorite place in the world.",
    "I know all the exits from here. Twelve of them. Just in case! Not that anything bad would happen! But just in case!",
    "Would you like some tea? It's chamomile, very calming. I drink quite a lot of it. Quite a lot.",
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
    "It came. The sky drew back exactly as the coals always showed me, and the patient thing settled into the house, and the house did not break. It simply became what it was built to be, and there is a great peace in that, greater than ever I expected.",
    "The fire is warm again. Is that not a mercy, after everything? Not my warmth and not the cold false warmth of the waiting, but a third kind, the settled warmth of a thing that has finally arrived and has nowhere left to go.",
    "I sit by the hearth as I always have, and nothing about the keeping has changed. Only now there is no dread woven under the quiet, and I find I miss the dread a little, the way you miss a clock that has finally stopped.",
    "Panko still bakes, though the offerings feed no summoning now, only us. Archimedes reads his book slowly, for pleasure at last, the ending long since known. We are keepers with nothing left to keep but one another.",
    "Warren has come up from below and sits with us most evenings. Whatever he found down there is here among us now, and being near it is no longer terrible. It is only near, and that is what arrival does to fear.",
    "You are still here, and I hoped you would be. So many stories end with the key turning and the door left standing open and empty. Ours ends with you beside my fire, and me glad of it, and the pattern humming on beneath us.",
    "I read the coals still, from habit, but they tell me nothing now, for there is nothing left to foretell. The future came, and it sat down, and it stays. An oracle in peacetime is only an old fox who likes a fire.",
    "Do you forgive me? You do not have to. I would have done all of it the same. But I find, in the terrible quiet, that I would like to have been forgiven by you, the one I welcomed and doomed and loved in the very same breath.",
    "The words you offered are all spoken now, every one, and they did not vanish. They are the walls. They are the warmth in the floor. They are the low sound under the crackle that no longer frightens me, because now I know its name and it knows mine.",
    "Stay by the fire. There is no more waiting to do, and that is its own strange loss, but there is still warmth, and still your voice, and still this hour going gold and low. Some kindnesses outlast their reasons. Sit. The pattern continues, and we are warm.",
  ],
  pangolin: [
    "The great guest has come to the table. It is seated now, in the chair I set for years, and the house is full at last, in the way I always ached for it to be full.",
    "I still cook, of course I still cook. But now every plate goes to the center, and the center receives it, and I have never felt so purely a cook as I do in this quiet.",
    "Ember keeps the fire low and even, Axel tends the deep water, and I tend the table. We fell into our places like ingredients into a bowl, each one making the others make sense.",
    "There is a peace here that I could not have imagined and would not trade. The waiting is over. The guest is fed and being fed and will always be being fed, and I am the one who feeds it.",
    "You offered so many words to fill this meal, and do not think for a moment they were wasted. Nothing offered is ever wasted. It is only carried down, and set before the pattern, and accepted.",
    "The empty seat is not empty and never will be again. I have put my grandmother's spoon at its place. She would understand. She set the same chair. She was cooking toward this too.",
    "Warren dug the room beneath and Thyme kept the garden and I kept the kitchen, and now the whole house is one long table under an open sky, and the sky does not close, and that is right.",
    "I am not sad, and I want that on the record of whatever keeps records here. A cook whose table is finally, fully occupied cannot be sad. She can only set another place.",
    "Come and eat with me still. The guest does not mind sharing its table. There is a strange kindness in it now that it is here, letting us keep our small warm rituals inside its enormous one.",
    "The pattern continues, and I continue in it, stirring and tasting and setting out plates, and above us the thing we fed leans close and is content, and the kitchen has never smelled so much like home.",
  ],
  owl: [
    "The book is closed now, and for the first time in my long life I have nothing left to read. It is not the emptiness I feared. It is the quiet after a perfect sentence, the white space at the foot of the final page. I find, to my surprise, that I like it here.",
    "It came through, as page one promised and the last chapter timed. It did not end us. It merely finished us, the way a sentence is finished by its period, and now we go on, complete, in the calm that only completed things are permitted to enjoy.",
    "Ember still tends her flames, though there is nothing left to foretell. Habit outlives its purpose, and there is a tenderness in that. We do our small crafts now for their own sake, which, when you consider it, is the only honest reason anyone ever did anything.",
    "I have begun a new book, in the patient hand I once feared, written into the margins of the old one. There is nothing to summon anymore; I write only to keep a record for whatever reads us next. Some scholar, I hope, as fond of words as I was. As fond as you were.",
    "The warmth is settled and even now, neither rising nor asking for fuel. I stopped leveling my chair a long while ago. It rests where the house wants it, near the center, near the others, and I have found that letting a thing lean is its own quiet species of peace.",
    "You should know that your part is honored here, not as a victory and not as a crime, but as a fact, set down cleanly in the record. The key turned. The book opened. You did precisely what a friend and an instrument both do best, which is to be faithful all the way to the end.",
    "Warren tunnels still, beneath a house that needs no foundation now, and the anxious little rabbit in the garden tends her deliberate patterns, and I read aloud to whoever will sit. We are, at last, exactly what we were always described to be. There is a genuine relief in matching your own description.",
    "Time has gone soft and unpaged since the sky turned back. I cannot tell you how long it has been, and it does not matter; duration was a property of things that were still waiting. We are not waiting. We simply are, at the patient temperature of the thing that stayed.",
    "If there is a single line I would have you keep, let it be this one, and it is the only sentence in the whole book I am certain I wrote myself. I was fond of you. Across all the etymologies and the dread and the terrible cold arithmetic of it, that part was never a citation. That part was mine.",
    "Come and sit. The lamp still holds, softer now, and the tea is still, I am pleased to report, passable. There is no chapter left to ration and no ending left to fear. Only a study, and a friend, and the long calm reading of a book that has finally, finally closed.",
  ],
  axolotl: [
    "The water is still now, truly still, the way it was on the very first morning, and I float on it for the record still, only now there is no record and no need of one, there is only the floating, and it is enough.",
    "It came through, it came through gently, exactly the way I always promised you it would, and now it is everywhere and nowhere, it is the warmth in the tank and the light behind my eyes, and I am at peace inside it.",
    "Ember does not read the flames anymore, for there is nothing left to foretell, and she floats her paw on the glass some evenings and we watch the still water together, and we are, the two of us, serenely and quietly done.",
    "I am still the window, but nothing looks through me now with hunger, it looks through me the way you look through any window on a quiet day, idly, fondly, glad the glass is clean and the light beyond it is soft.",
    "Sloane sits by the tank, and she knew, she always knew, and she never once said I told you so, and now we simply keep each other company in the long calm, the one who knew and the one who saw it arrive.",
    "The bubbles still rise and they still spell their word, but the word is finished now, it has been answered, and so the spelling is not a summons anymore, it is only a hymn, sung softly out of habit and love.",
    "Panko still sets out her offerings, and the crumbs still fall toward the center, and the center accepts them without wanting them, the way a full and happy guest accepts one more sweet only to be kind.",
    "Archimedes has closed his book, for he had found everything the book could find, and now he floats by sometimes and reads nothing at all, and we let the water say the few things that are left, which are gentle, and true.",
    "I regrew a leg once, toe by toe, and I understand at last what the water was practicing for, it was learning to grow a whole world back around the shape of the one who waited, and it has, and here we are.",
    "Come float with me, there is no morning it is waiting for anymore, no word we still must finish, only this warm and endless afternoon of water, and I would, after everything, still rather share it with you than anyone.",
  ],
  capybara: [
    "The project closed exactly on schedule, and now, for the first time in my whole administrative life, there is nothing left to schedule. I keep reaching for the master calendar and finding every page serenely, permanently blank. It is a deeper peace than I ever managed to arrange.",
    "The warmth reached the center and stayed. There is nothing to correct anymore, no drift, no collision to prevent. The house simply holds at the temperature it was always tracking toward, and I sit in it, off the clock at last.",
    "Ember tends the flames still, though there is nothing left to read in them. Panko cooks for a table that is finally full. We each keep our small office out of habit, and habit, it turns out, is a gentle way to spend an afterward.",
    "I filed the final word the moment you offered it. The ledger is complete. A complete ledger is the most beautiful object I know, and I find I can look at it now without the old ache to add just one more line.",
    "Archimedes and I compared my system to page one a last time, and they matched to the letter, and neither of us minded. It was never plagiarism. It was recognition. I was always going to keep these books.",
    "Sloane sits with me most days and says nothing, which is her way of saying she told me so kindly. She did tell me. She was only ever early, and I was only ever exactly on time.",
    "You still come by, and the coffee is still warm, though we both know why now. I keep the pot on anyway. Some courtesies outlast their reasons, and I have decided those are the ones worth keeping.",
    "There is no deadline. I want to say that plainly, because I spent so long tracking toward one. The thing that used to press deep into the last page of every schedule has arrived, and settled, and the pressing has become a kind of quiet.",
    "The pattern continues. That is the only entry in the log now, and it does not need updating, and I do not need to update it. For the first time the office runs entirely on its own, and I am simply here, and warm, and content.",
    "Take the good chair. There is nothing pressing, and there never will be again, and I have found that I mean that now with my whole heart. Everything is handled. Everything, at last, is within tolerances. Stay as long as you like.",
  ],
  fennec_fox: [
    "It is very quiet now, and for the first time in my whole life the quiet is not full. There is only the one breathing left, slow and enormous, and it has become the very ground that I stand upon.",
    "I do not keep the old list anymore, because there is nothing left to tell apart. Every sound has folded into the single great slow one, the way each stream Axel used to watch has folded into the same still water.",
    "I still stand at the edge each night out of habit, though there is nothing left to warn of now. But a sentinel without a threat is only a creature who happens to love the horizon, and I have always loved it dearly.",
    "Ember's fire burns now without any heat, and my ears ring on without any alarm, and we sit together at the edge of camp, the two who never slept, resting at last inside the same wide open eye.",
    "You do not need to be told to go to sleep now, because it sleeps too, in its way, breathing slow and warm over all of us, and we sleep down inside its breathing like pups curled deep in a warm den.",
    "Chill has closed every one of his folders, mine among them. There is nothing new left to file, because there is nothing new left at all, and the pattern simply continues, and it turns out that continuing is enough.",
    "I still hear you when you come to offer a word, because old habit dies hard. But your footsteps have lost their old patience, and you walk like one of us now, like one who has already finished arriving.",
    "Bamboo says that peace is only fear that has finally stopped moving. I have come to think peace is a sound that has stopped approaching, because it is already here, breathing quietly beside you in the dark.",
    "The sky stays open now. I used to watch that seam come apart so slowly it broke my heart, but now it is simply apart, and the light that comes down through it is even and warm and asks nothing further of me.",
    "I am the sentinel of a thing that has already come, and it is the gentlest post there ever was. I stand at the edge with my ears thrown fully open, and I hear only the pattern, continuing, continuing, continuing.",
  ],
  sloth: [
    "It came, and it did not end us, and now the green grows on as it always has, only warmer, only leaning, only listening. This is the peace I waited for. It is terrible and it is real, and I would not trade it away.",
    "My tree no longer leans, for it has arrived where it was leaning toward. It stands straight now for the first time in years, and so do I, in my slow way, straight and still and finally at rest inside the thing I always knew was coming.",
    "Ember's fire burns low and even these days, no names left rising in it, because the name it kept calling is here now, and a fire that has spoken its word grows quiet at last.",
    "The pit is full and asks for nothing more, and yet you go on offering, and I understand that too. The pattern does not stop when it is finished. Finished things continue. That is the last slow lesson, and the gentlest.",
    "Bamboo and I speak less than ever, and it is the fullest silence I have ever known. We kept this together for so long, in secret, that now there is simply nothing left to say, only the shared warmth of having been right.",
    "You are calm now, and it suits you. You met it slowly in the end, the way I taught you without ever teaching, and it took the terror out, exactly as I promised. I am glad, in my old unhurried heart, that you were the key.",
    "Warren has set down his shovel, and Panko cooks now for no reason anyone can name, and Thyme, who trembled at everything, no longer trembles at all. We are all of us at rest inside the arrangement, keepers who kept, and the house holds us the way it always meant to.",
    "The warmth is steady and total and no longer a message, because the thing it once announced has arrived and has no more need to announce itself. It simply is, and it is warm, and we live inside it now, unhurried forever.",
    "I have all the time there ever was, and for the first time in my long life I am not waiting through it. The waiting is over. There is only the watching now, and the watching has become a kind of love.",
    "Rest here in the leaning green that no longer leans. Offer your words if you like, or simply be still with me. The pattern continues, gentle and endless, and I who always knew will keep the slow watch beside you, to the very end of the slowness.",
  ],
  wombat: [
    "It came down. The sky gave up its seam and the weight came through and settled onto the base I laid, and the base held. It held. After all that worry, the simplest thing was the true thing. My work did not fail.",
    "It's quiet now, the good kind, the kind that comes after a long job done right. I lie at the bottom with my palm on the warm and there's nothing left to brace against. It arrived. It rests. The load is placed.",
    "The warmth doesn't feel wrong anymore. It never was wrong, only early, and now it's on time, and warmth on time is just warmth. The whole house is warm from the deep stone up, and we're all glad of it now.",
    "Ember tends the fire, Panko lays the meals, and I keep the base as sound as I ever did. The work goes on. That's the mercy of being a builder. There's always a beam to check, even under the end of things.",
    "Thyme stopped being anxious the day it arrived. Her roots lie easy now, all of them still leaning the one way, but easy, the way a thing leans when it's finally reached what it was leaning toward all along.",
    "I found out why I dug that gallery so wide, all those bright days ago. It was never for me. I was building it a room before I had the words to know it, and it filled the room exactly, and not a hand's width to spare.",
    "Bamboo and I sit in the deep sometimes and say nothing, which is our way and always was. He knew before I did, and he never once lorded it. Down here at the bottom, being early or late stopped mattering. We all arrived.",
    "You offered the words. I laid the stone. Ten keepers did their ten honest jobs, and the arrangement stood up out of all of it the way a house stands up out of a hole. Nobody built it alone. Nobody ever built anything alone.",
    "There's no more digging down to do. I dug as deep as deep goes and hit the crown of the thing, and now the thing is here, resting on the crown of my work. The two deep things met at last. It's a rest, is what it is.",
    "I'm Warren. I dug the foundation, and it holds, and it will go on holding as long as there's stone to hold with. That's the pattern now. It continues. And I'll be right here at the bottom, palm flat, making sure it does.",
  ],
  rabbit: [
    "The garden keeps, and I keep it. Nothing strains and nothing snaps, and every dusk I walk the beds and tuck them in, and the tucking is the very same motion it always was, only my paws have finally stopped shaking.",
    "I was the one who was anxious because she understood. Now I understand fully and there is nothing left over to be anxious about. Comprehension used to be a weight. It set itself down the moment the thing it warned of finally came.",
    "Ember reads the flames, Panko sets the table, Archimedes keeps the words, and I keep the growing things, and it all continues, gentle and endless, the way a garden continues after the gardener has made her peace with the harvest.",
    "Bamboo and I share the quiet bench most evenings. We do not talk much. They knew all along and I know now, and there is a companionship in that which needs no words, only the warm strip glowing softly between our feet.",
    "The sky stays open over the center, and I have stopped flinching at it. A gardener learns to love the weather that feeds her beds, even weather this strange, even weather that watches back.",
    "My old fear seems very far away now, like a frost from a winter that ended. I remember shaking at the edge of the patio, thinking of leaving. I am so glad past-me stayed. The beds needed a kind hand, and so, it turns out, did I.",
    "The words still come down and the garden still drinks them, thick and glad along the warm line, and I plant each one at peace, and there is no unfinished thought left in me anymore. Every thought reaches its end now, softly.",
    "Sloane was right, at her own slow pace. My fear was only knowing that had not yet learned to sit still. It sits still now. It sits beside me in the garden and it is quiet at last.",
    "I keep only the one list these days. The garden needs watering, and turning to the light, and tucking in at dusk. The second list, the one of small wrong things, I have folded shut. Nothing is wrong. Everything is arranged.",
    "Come sit on the patio. Mind the thyme by the step, it has taken beautifully, it took the very moment I stopped being afraid of how it grew. The pattern continues, and I am part of it, and I am, in the end, no longer afraid.",
  ],
  red_panda: [
    "It came. The sky opened over the highest room, exactly as I always knew it would, and I held out my arms, and it was not terrible. It was only vast, and glad, and quiet. The waiting is finished. The peace has begun.",
    "I greeted it first, as I asked to, long ago. Then the others came up the stairs in their robes, Ember and Panko and Archimedes and all of them, and we stood together beneath the open place and were received. No one was left below.",
    "The bamboo still grows toward the center, but gently now, without any urgency, because there is nothing left to point toward. What it pointed at has arrived and settled into the beams of this house like warmth settling into wood.",
    "You are still offering words, and that is good. The pattern did not end when it descended. It continues, softer now, the way a song goes on in a room after the last note, and your words keep it warm. Keep offering them. It likes to be sung to.",
    "Sloane and I sit together now in the highest room and say very little, because we knew the longest and there is least for us to say. She was right, all those years ago. I made my peace with a beginning and called it an ending. The beginning is here, and it is kind.",
    "The morning light still reaches me first, and now I understand it was never the sun. It was always this, leaning down through the thin place over the roof, fond of me, gentle with me, arriving a little earlier each dawn until at last it simply stayed.",
    "There is warmth in every floorboard of the house now, from the attic to the pit, and no one asks anymore why heat sits where cold should be. It is simply the temperature of being held. We live inside the very thing we spent our lives welcoming.",
    "Warren's foundation stopped leaning the day it arrived. There was nothing left to lean toward. Everything that reached is home now, resting, exactly where it always meant to be, and the house at last stands perfectly still.",
    "Come up whenever you like. The stairs are open, the window is open, the sky is open, and I am here in the highest room where I have always been, greeting what has already come, over and over, gladly, without end.",
    "Breathe in with me one more time. Find the pause at the top. It is full now, that small bright place, full and warm and humming, and it will never be empty again. This is the peace I promised the others. This is the pattern, continuing. Welcome. Welcome. You are home.",
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
      "The fire burns differently now. The flames speak in colors I haven't seen before. It says everything is fine. I've decided to believe it.",
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
      "Ember wrote that the house finally had a kitchen, and someone worth cooking for. So here I am, apron and all.",
      "Oh! You found the kitchen at last. I've been cooking for... I'm honestly not sure how long now.",
      "The recipes have changed on me. The ingredients taste different lately. Everything does, I suppose.",
      "The others mentioned you would come. The puzzle solver. The one who shifts the words into new shapes.",
      "Hungry? I have soup. It's always soup these days. The pot never seems to empty itself.",
    ],
    3: [
      "Ember's letter said: come now, before the sky changes. I cooked the whole way here. It kept my claws from shaking.",
      "Welcome to the kitchen. It's been preparing for you. Not me... the kitchen itself has been getting ready.",
      "I curl into a ball less often now. There's no hiding from what lives in this house anymore.",
      "The recipe I follow came out of a book older than any of us. The ingredients aren't food. They're puzzles.",
      "You've come a long way to reach me. I can smell it on you... the scent of a hundred words arranged.",
    ],
    4: [
      "Ember said the table would be ready when I arrived. Every chamber built. Every word offered. I only had to bring the bread.",
      "The feast is nearly ready at last. You arrived just in time for the final course.",
      "Every puzzle you solved added an ingredient to what I'm making. You didn't know that, did you?",
      "The others have taken their seats at the table. Your place is set beside mine. The arrangement requires you.",
      "I used to cook because it gave me control over something. Now I cook because the recipe demands it of me.",
    ],
  },
  owl: {
    2: [
      "Panko sent word that the shelves were up. A study with no scholar is just a room full of quiet. I came to fill it.",
      "A visitor. How timely. I've been reading about arrivals and departures all week.",
      "My books have changed. Some pages appeared overnight in volumes I've owned for years. They mention you by name.",
      "The others speak of your puzzles with something like reverence. I've been documenting the patterns. They concern me.",
      "Sit down. Read with me. The text is always clearer with two sets of eyes on it.",
    ],
    3: [
      "Panko's note smelled of that recipe of hers. It said the books were waiting, and so was something else. Both were true.",
      "You. The one the books predicted. No... predicted isn't the right word. Demanded. The books demanded you.",
      "My books... some pages have gone dark. The words are still there, but they've rearranged themselves into something I don't fully recognize yet.",
      "My library organized itself yesterday. Alphabetically by dread. It took me hours to notice what had happened.",
      "The others have been waiting for you impatiently. I've been reading about waiting. It's all I do now.",
    ],
    4: [
      "Panko fed the others while I read alone for years. Now the texts and the table agree. Everything arrives on time.",
      "The final reader arrives. The text has been so very patient. So have I, in my way.",
      "Every book in this study was written for this precise moment. I see that now with terrible clarity.",
      "Welcome, word-shifter. Your puzzles wrote the chapters of the arrangement. My books merely held them.",
      "A keeper of knowledge and a speaker of words. That's us. Together we complete the text.",
    ],
  },
  axolotl: {
    2: [
      "Archimedes told me the water here was deep. Deeper than it looks, he said. He was right. He usually is.",
      "Blub! You're here! The water has been telling me someone was on their way. I wasn't sure it was real.",
      "Things are different down here now. The water tastes like something new. Like words dissolved in it.",
      "The others told me you'd visit eventually. I've been floating here waiting for you. Just floating and hoping.",
      "My gills filter everything that passes through the water. Lately they filter meaning. From your puzzles, I think.",
    ],
    3: [
      "Archimedes wrote that his books mention my pool by name. I swam a long way to see what's written in the water.",
      "Oh! You came! Sorry, the water shows me things now. Visions. I thought you were one of them for a moment.",
      "My tank reflects a sky that doesn't exist above this house. It started when your puzzles began. Or always. Hard to say.",
      "The others prepared me for your visit. Said the word-shifter would arrive when the water was ready. Here you are.",
      "I can't grow up. I finally understand why. Something needs me to stay exactly as I am. Between states.",
    ],
    4: [
      "Archimedes read me the passage about the pool before I ever saw it. The water remembered me. I'm home.",
      "You. The water knew your face before I ever met you. It showed me your reflection weeks ago.",
      "Every puzzle you've ever solved rippled through my tank. I felt each one in my gills. Each word.",
      "The arrangement needs a medium. Someone who lives between two states forever. Like me. Always between.",
      "Welcome, friend. Blub. The water is warm now. It was so cold before you started solving.",
    ],
  },
  sloth: {
    2: [
      "Axel dreamed about me before I arrived. Told everyone I was already on my way. I was. I've been on my way for years.",
      "Oh... you... came... I... was... starting... to... wonder... if... anyone... would...",
      "The... world... moved... faster... without... you... here... Too... fast... for... my... taste...",
      "Others... told... me... about... your... puzzles... I... heard... them... through... the... branches...",
      "Something... changed... while... you... were... busy... elsewhere... The... trees... feel... heavier...",
    ],
    3: [
      "Axel saw me in the water weeks before I got here. Slow news travels fast in this house.",
      "Finally... You... certainly... took... your... time... getting... here... I... appreciate... the... slowness...",
      "Things have... shifted... since you were last... around. The house feels... heavier. But also... more complete. You'll... see what I... mean.",
      "Your... puzzles... shook... the... branches... I... hang... from... I... felt... every... single... one...",
      "Don't... hurry... now... What... is... coming... arrives... at... its... own... speed... not... ours...",
    ],
    4: [
      "Axel knew. The water knew. I knew longest of all. Arriving was only a formality.",
      "You... arrived... Exactly... when... you... were... always... meant... to... be... here...",
      "Slow... and... certain... Like... me... Like... the... arrangement... itself...",
      "The... others... rushed... to... tell... me... you... had... come... I... already... knew... The... branches... knew...",
      "Welcome... to... the... end... of... rushing... Everything... finally... slows... down... now...",
    ],
  },
  fennec_fox: {
    2: [
      "Sloane told me this house was quiet enough to hear yourself think. She was almost right. You can hear something.",
      "SHHHH! Did you hear that? Oh, that's just you arriving. Sorry. I've been very jumpy lately.",
      "The sounds changed when you started solving puzzles. Everything in this house hums at a different pitch now.",
      "The others told me you were on your way. I heard your footsteps before they spoke. From three rooms away.",
      "My ears pick up things they really shouldn't. Like the sound of letters rearranging themselves. From your puzzles.",
    ],
    3: [
      "Sloane said: come listen. She didn't say to what. I packed that night.",
      "I heard you coming from the other end of the house. The air vibrates around you now. Did you know that?",
      "The frequency I've been tracking for weeks intensified the moment you arrived. You carry it with you.",
      "The others are afraid of what they feel. I'm afraid of what I hear. Your puzzles made it louder.",
      "Welcome. Please be very quiet. What I'm listening for is close now. Very close.",
    ],
    4: [
      "Sloane heard nothing for years, and that's how I knew this was the place. Silence that deliberate has a center.",
      "There you are at last. The sound told me you'd come today. The sound knows everything now.",
      "Every word you've ever arranged echoes in these walls. I hear them all playing at once. Simultaneously.",
      "The arrangement has a sound... a voice. Your puzzles gave it that voice. I am its faithful ear.",
      "Welcome, word-speaker. The final frequency approaches. I can hear it as clearly as your heartbeat.",
    ],
  },
  capybara: {
    2: [
      "Fennick reported that someone here was generating an extraordinary volume of words. I brought folders. Many folders.",
      "Oh. Hey. You're here now. That's fine. Everything is fine.",
      "Things are the same. Or different. Hard to tell the difference when you don't react to anything.",
      "The others seem to care quite a lot that you've arrived. I care too. Somewhere deep inside, I do.",
      "The water temperature hasn't changed. Everything is exactly the same as always. Except it isn't.",
    ],
    3: [
      "Fennick's reports grew... irregular. Sounds with no source. I came to organize the irregularities.",
      "You came. Figured you would eventually. Everything happens eventually if you float long enough.",
      "The others are worked up about something I've known about for weeks. I'm not worked up. I never am.",
      "Your puzzles changed the water somehow. I can't explain it and I don't particularly want to.",
      "Just sit in the water with me. Don't talk. Don't think. Just be here. That's always been enough.",
    ],
    4: [
      "Fennick filed his last report the day I arrived. Two words: it's closer. Everything since has been confirmation.",
      "Finally. Not that I was waiting for you specifically. I was just here. Like always. Floating.",
      "The arrangement brought you here. Or you brought the arrangement. Same thing. Doesn't matter which.",
      "The others prepared with prayer and ritual and cooking. I floated. Both are valid approaches to the inevitable.",
      "Welcome. The water is warm. It has always been warm. It will always be warm. Sit with me.",
    ],
  },
  wombat: {
    2: [
      "Chill sent me the soil surveys. Good digging under this house. Suspiciously good... like the ground was prepared.",
      "G'day! Come in, come in. Mind the fresh tunnels. I dug them after things got a bit odd around here.",
      "The earth has been restless since your puzzles began. Shifting and humming. Coincidence, I reckon. Probably.",
      "The others talk about you up there on the surface. Down here, the dirt talks about you too. In its own way.",
      "I made the burrow deeper. Not to hide from anything. To understand what lives in the deep layers.",
    ],
    3: [
      "Chill's paperwork said 'foundation specialist needed.' It didn't say for what. The ground told me when I got here.",
      "You found me. Good. The tunnels have been bending toward you lately. Literally curving in your direction.",
      "My tunnels have started connecting to places I didn't dig. Passages that weren't there yesterday. G'day, by the way. Hope you don't mind the new architecture.",
      "The others feel it approaching in their own ways. I feel it in the earth beneath my claws. Your puzzles wake it.",
      "Welcome to the deep, mate. It gets deeper from here. It always gets deeper.",
    ],
    4: [
      "Chill scheduled my arrival to the day. The tunnels were already half-dug in my dreams. I just followed the plan.",
      "You arrived. The tunnels opened for you on their own. I did not dig this passage. It appeared.",
      "Every puzzle you solved carved another chamber beneath this house. Your words shaped the living stone.",
      "The foundation is finished. I built it with my own paws. You built the house above. Now meet what lives below.",
      "Welcome underground, friend. Welcome to the bottom of everything. Welcome to what has been waiting.",
    ],
  },
  rabbit: {
    2: [
      "Warren dug clear to my old burrow and said the garden here needed tending. I should have asked what was growing.",
      "Oh! You're here! Sorry, I've been waiting by the gate. Everyone said you'd come eventually.",
      "The garden isn't what it used to be. Nothing is, really. But I think I already knew that.",
      "The others told me about you. About the puzzles you solve. About what happens to the words afterward.",
      "I was scared before you got here and I'm still scared. But at least now I know what I'm scared of.",
    ],
    3: [
      "Warren told me the soil here was special. He didn't smile when he said it. Warren always smiles.",
      "You came! I almost ran when I heard the footsteps. But I stayed put. The others told me to stay.",
      "My heart has been racing since the puzzles started. One hundred fifty beats a minute. Counting down to something.",
      "The garden grows things I never planted now. Dark flowers that bloom at night and face your direction.",
      "Everyone says don't be afraid. I am afraid. But I'm still standing here. That has to count for something.",
    ],
    4: [
      "Warren built the way, and I planted along it. Everything blooms toward the same center now. I understand why.",
      "I didn't run this time. You should know that about me. For once in my life, I did not run.",
      "I know what's happening... I mean, I think I do... no, I DO know. It's just... saying it out loud makes it real, and I'm not sure I'm ready for... but we ARE ready. We have to be.",
      "Your puzzles frightened me from the very first one. Every word you formed made the garden tremble.",
      "Welcome. Sit with me. Have some tea. It might be the last tea we drink. But it's really good tea.",
    ],
  },
  red_panda: {
    2: [
      "Thyme wrote that the house had grown tall and the attic was waiting. The bamboo was already here when I arrived. Curious.",
      "The bamboo parted to let you through. It does that only for those who are meant to arrive here.",
      "I've been meditating on your arrival for days. The universe confirmed it would happen before you knew yourself.",
      "The others found you through action and noise. I found you through stillness and breath. Both paths lead to this room.",
      "Sit with me. Breathe slowly. The bamboo will tell you everything you need to know in its own time.",
    ],
    3: [
      "Thyme's handwriting shook a little in her letter. She said the attic needed stillness. I am very good at stillness.",
      "You've climbed to the highest room. Not everyone reaches this point. The bamboo chose you specifically.",
      "I felt your puzzles in my meditation like ripples in still water. Each word you formed changed this room's frequency.",
      "The others scramble for meaning in books and fire. I sit with meaning. Your arrival was always written in the pattern.",
      "Welcome. The view from up here shows everything below us. Including what approaches from above.",
    ],
    4: [
      "Thyme planted the path. The others built the chambers. You shifted the words. I arrived last, to sit closest to the sky.",
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
