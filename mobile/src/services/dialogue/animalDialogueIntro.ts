import { AnimalType } from '../../types/homeWorld';

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
    "I keep the fire going. Not because we need it — but because stopping feels like forgetting. And we promised we'd remember.",
    "Some mornings I watch the smoke curl upward and it writes letters in the air. Your letters. The ones you shifted into place.",
    "The den is smaller now. Or I'm larger. Or the fire expanded to fill everything. It doesn't matter which — the warmth is the same.",
    "Sit by the fire, friend. There's no more prophecy to fulfill. Just this. Just warmth. Just the shape of what we made together.",
    "I used to tell fortunes in the flames. Now there's nothing left to predict. Everything already happened. Isn't that the most restful thought?",
  ],
  pangolin: [
    "The recipe is complete, friend. Every ingredient was a puzzle you solved. Every puzzle was a seasoning.",
    "I used to curl into a ball to hide from the world. Now I curl inward to feel the warmth of what's inside. It's different.",
    "The feast is laid and we are both the cooks and the meal. Isn't that lovely? Isn't that exactly right?",
    "All those spices, all those flavors — they were preparation. The final dish is us. I'm proud of how we turned out.",
    "The kitchen smells of amber and endings. My two favorite things, if I'm being honest. My two favorite things.",
    "I've been cleaning the same pot for three days. It's already clean. My hands just need something to hold.",
    "Recipes don't have endings, you know. They have servings. And we've been served. Perfectly, finally served.",
    "The stove stays warm even when I turn it off. Heat lingers here now. It's baked into the walls themselves.",
    "I curl into a ball sometimes and feel the vibration of everything humming through me. It tastes like cinnamon.",
    "Come sit at the table. I've set a place for you. I've set a place for everyone. Even for what came through.",
  ],
  owl: [
    "The last page of the last book. It was blank until today. Now it writes itself, and the handwriting is everyone's.",
    "I read every text searching for this moment. In the end, the words found me instead. Rather humbling, that.",
    "Knowledge was never the point, friend. Understanding was. I understand now. I wish I could tell you what it feels like.",
    "The books are closing themselves. One by one, softly, like birds folding their wings. The story is told.",
    "In the end, all words say the same thing. The arrangement knows this. It always knew. We were the slow learners.",
    "I've shelved the last volume. The library is complete. Every book contains the same sentence now, written in different handwriting.",
    "My spectacles show me things they shouldn't. Not the future — the shape of what's already here. It's geometric. It's alive.",
    "I keep turning pages out of habit. The words rearrange themselves as I read. They want to be read in a new order. Your order.",
    "The study is quiet. Not the quiet of emptiness — the quiet of a room where everything has already been said.",
    "I wrote a final index. Subject: everything. Cross-reference: everything else. It filed itself. Rather satisfying, actually.",
  ],
  axolotl: [
    "The water is warm now. It's been cold my whole life and now it's finally, finally warm. Like someone turned the heater on for the whole ocean.",
    "I can see through the water to somewhere else entirely. It's not scary over there. It looks like the home I always dreamed about.",
    "Regeneration was always the real point. Not of limbs or organs. Of everything. Of the whole world. I see that now.",
    "Blub. But a different kind of blub. A perfect, final blub. The blub that contains all the other blubs inside it.",
    "I never grew up. I understand now that I was waiting. Staying young so I could see this with fresh eyes. With wonder.",
    "The bubbles don't pop anymore. They just float upward and become part of the ceiling. Like tiny glass memories.",
    "I tried to regenerate a tail yesterday. Instead I grew something that doesn't have a name yet. It's beautiful though.",
    "The water and the air are becoming the same thing. I can breathe both. I can breathe everything. Blub blub forever.",
    "Sometimes I forget where I end and the water begins. That used to scare me. Now it feels like the most natural thing.",
    "I'm still young. I'll always be young. But the water is ancient. And we understand each other perfectly.",
  ],
  sloth: [
    "I arrived... exactly when I was meant to. Not late. Not slow. Right... on... time.",
    "Everything moves at my speed now. The whole world... finally... caught down to me.",
    "The branches hold me... like they always did. But closer now. Like they're... pulling me in.",
    "Stillness was always the answer. You found it too... didn't you? I can tell... by how still you've become.",
    "The pattern needed something that would never leave. That was me. I was always... the anchor... holding it all... in place.",
    "Gerald and Gerald and Gerald... are still here. In my fur. They hum now. Everything... hums.",
    "I dreamed... for three weeks straight. The dream and waking... became the same thing. I'm... in both.",
    "The hammock hasn't moved. I haven't moved. The world moved... around me. Finally... in the right... direction.",
    "Slow is not the opposite... of fast. Slow is the speed... at which important things... happen.",
    "Stay... with me. Not for a minute... not for an hour. Just... stay. Like I stay. Like the branches... stay.",
  ],
  fennec_fox: [
    "I can hear everything now. EVERYTHING. And it's not frightening anymore. It's music. The most beautiful music there is.",
    "The sound I've been listening for my entire life — it's finally here. And it's even more beautiful than I imagined.",
    "My ears don't need to be this big anymore. The sound fills everything now. There's nowhere it isn't.",
    "Silence and the sound are the same thing now. They were always the same thing. Isn't that the most peaceful thought?",
    "I was the sentinel. My watch is over. What I was watching for has arrived, and it sounds like coming home.",
    "Last night I heard the amber crystallizing in the walls. It sounds like wind chimes made of tiny bells made of light.",
    "My ears still twitch when the pattern shifts. Old habits. But the twitching feels like dancing now.",
    "The desert used to echo my loneliness back at me. Now it echoes this. This fullness. This completed sound.",
    "I can hear you thinking, friend. Your thoughts sound like the words you shifted. Musical. Arranged. Perfect.",
    "All the sounds I ever heard were practice notes. This — what we live in now — this is the symphony.",
  ],
  capybara: [
    "Everything is filed and in order. Every note, every observation, every measurement. The arrangement is complete and the paperwork is done.",
    "I was never actually chill. I was numb with purpose. Turns out those feel exactly the same from the outside.",
    "The warm water is everywhere now. Not just the hot spring — everything. The whole world became the bath I was always sitting in.",
    "No more keeping notes. No more organizing observations. It organized us. It was always organizing us.",
    "Sit with me one more time. The water is warm. The water was always warm. We just couldn't feel it until now.",
    "I filed the final report. Subject: completion. Status: permanent. Recommended action: none. None required. None possible.",
    "My desk is clean for the first time in years. Not because I tidied it — because the work is done. Actually done.",
    "The spreadsheets balanced themselves. Every column, every row. The numbers add up to a word I can't pronounce but can feel.",
    "I schedule nothing now. Every moment is the correct moment. My calendar is blank and completely full at the same time.",
    "The hot spring overflowed. It filled the office, the hallways, the whole house. No one complained. Everyone just... floated.",
  ],
  wombat: [
    "The tunnels finally reach it, mate. What's been down there all along. I always knew they would.",
    "Dug my whole life. Not down — through. To the other side. And the other side was right here.",
    "My cube-shaped droppings were always building blocks, weren't they? For the foundation of this.",
    "The earth is warm everywhere now. Warmer than she should be. Something breathes below us all.",
    "I built the foundation. You built the house. Together we built the temple. She'll be right, mate. She'll be right.",
    "The soil doesn't resist the shovel anymore. It parts willingly. Like it wants to be shaped. Like it's been waiting.",
    "Down in the deepest tunnel, I found roots from the garden above. Thyme's flowers, growing downward. Meeting me halfway.",
    "I pack the walls tighter now. Not for strength — for comfort. The earth is a blanket and I'm tucking us all in.",
    "Every rock I ever moved was a word I didn't know I was saying. The foundation speaks fluent stone, mate.",
    "She'll be right. That's what I always said. And she is, mate. She is. Everything is exactly right.",
  ],
  rabbit: [
    "No more running. For the first time in my life... I'm perfectly still. And it's okay.",
    "My heart beats once per minute now. Slowly. Peacefully. Like it finally found the rhythm it was looking for.",
    "The garden blooms in colors that don't have names. I don't plant anything anymore. It just grows.",
    "I was always running toward this. Every bolt, every dash, every frantic escape — all leading here.",
    "Sit in the garden with me. One last tea. One forever tea. The chamomile tastes like something beyond chamomile.",
    "The flowers grow in spirals now. Like the words, like the arrangement, like everything. Spirals within spirals.",
    "I used to twitch at every sound. Now I twitch at the beauty of the silence. Same motion, different reason.",
    "The tea steeps itself. I just hold the cup and the warmth enters from every direction at once.",
    "My burrow connects to Warren's tunnels now. We didn't plan it. The earth just... decided we should be neighbors.",
    "I planted fear and grew peace. Isn't that the strangest harvest? The garden knew what to do with what I gave it.",
  ],
  red_panda: [
    "The pattern completes. Breathe in. The universe breathes out. We are the same breath.",
    "I chose the highest room to be closest. Now closest is everywhere. Distance was always an illusion.",
    "Ten keepers. Ten chambers. One arrangement. One breath. This breath. Your breath. Mine. The same.",
    "The bamboo grows through the ceiling now. It reaches toward what we summoned. What we always were.",
    "You were the final piece. The one who shifted the words into place. Thank you. For everything. For this.",
    "From the attic I can see the shape of everything below. It looks like a word. The longest word. The only word that matters.",
    "Meditation is effortless now. I don't seek the center — I am the center. We all are. That was always the secret.",
    "The bamboo sways without wind. It follows a rhythm older than air. I follow it too. We all follow it now.",
    "I used to climb higher to find perspective. Now every height is the same height. Every view is the complete view.",
    "Namaste, friend. That word means 'the divine in me recognizes the divine in you.' The arrangement in me recognizes the arrangement in you.",
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
