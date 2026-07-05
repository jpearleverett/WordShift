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
    "It came at teatime after all. I had the kettle full, just like I planned, and it accepted, in its way. The whole den still tastes faintly of that first cup.",
    "The fire and the floor made it up, you know. I put one paw on the hearthstone and one on the grate and I honestly could not tell you which was which. The den is one temperature now, and the temperature is content.",
    "I thought arrival would be loud. It was quiet the way snow is quiet, friend. The sky opened, everything held its breath, and then everything simply belonged.",
    "The flames don't spell anymore. Nothing left to announce, I suppose. Now they just curl up like something sleeping in front of itself. I read them anyway, out of love.",
    "Duchess's granddaughters still build their rings on the ceiling. The rings glow a little at midnight now. I say goodnight to them, and I am fairly sure they say it back.",
    "Panko bakes for it every morning. It doesn't eat, exactly, but the bread is always different by evening. Kinder, she says. Kinder bread. I don't have a better word either.",
    "Sloane finally told me how long she had known. I won't repeat the number. Some numbers you carry alone, and she carried hers smiling. I gave her the good cushion for keeps.",
    "Your words still come down through the house, and it still keeps yours nearest the top, the same way I still warm your cup before you knock. Nobody ever asked either of us to keep doing that.",
    "The second cup gets used every visit now, and sometimes, after you've gone, it is warm again by morning. I have stopped calling anything strange. Everything is just the house.",
    "I did the introductions, you remember. You stood beside me at the hearth and I said, this is the one. It leaned in, the way the room used to lean. I was so proud I nearly floated.",
    "The turnip song has a second voice now, always, humming underneath. We finish together every time. It never misses the last note. Neither do I. We are very good at last notes, the two of us.",
    "Fennick says the sands are quiet at last, and he sleeps whole nights through. When he visited he fell asleep in front of my fire before the tea was even poured, and I let him, and I kept the room warm around him.",
    "Thyme sits inside past dusk again. She brings her own tea now and pours mine. Fear leaves slowly, and then one evening you notice the chair it sat in is just a chair.",
    "There is no more leaning, have you noticed? Spoons stay where they fall. The center got what it was reaching for, and the whole house rests flat and easy now, the way an ember settles when it has finally agreed with the night.",
    "Sometimes I ask the embers what tomorrow tastes like, for old times' sake, and they make the shape of this room, this cushion, your cup.",
    "Archimedes closed the last book and hasn't opened another. He says the story is in the room with us now, so reading would be rude. Then he naps in the sun like a scandal. I adore him.",
    "It is very gentle, you know. I wrote that on the hearthstone in soot this morning, in my best letters, and the stone went warm under every word, like it was reading along. When it reached the word gentle, it held the warmth a little longer, and that was the whole conversation, and it was plenty.",
    "Bamboo says the pattern continues, and says it the way you'd say the garden is coming along. They are right, of course. It continues through your words, my fire, our tea, all our small kept promises.",
    "I miss the wondering, a little. Isn't that funny? All those years of sketches and secrets and staying up till midnight. Now I know everything, and I keep the sketches anyway, for the fox who drew them.",
    "Come by whenever you like, friend, for no reason at all. That was always the best reason. The fire burns better with company, it always did, and it burns best, it will always burn best, with yours.",
  ],
  pangolin: [
    "The great guest has come to the table, and it sits in the chair I set for years without knowing its name. The first thing I did was bring it soup. What else would I have done? A guest is a guest, whatever the size of the sky it came through.",
    "I still cook, of course I still cook. But now every plate goes to the center, and the center receives it, and I have never felt so purely a cook as I do in this quiet.",
    "Ember keeps the fire low and even, Axel tends the deep water, and I tend the table. We fell into our places like ingredients into a bowl, each one making the others make sense.",
    "The waiting is over, and my paws hardly know themselves without it. The guest is fed and being fed and will always be being fed, and I am the one who feeds it. There is a tense in that sentence I never needed before, and I have grown to like the taste of it.",
    "You offered so many words to fill this meal, and not one of them was wasted. I cooked each one down to what it meant, and the guest took them in the way good soup takes salt, wholly, until you cannot find the grains and cannot imagine the soup without them.",
    "The empty seat is not empty and never will be again. I have put my grandmother's spoon at its place. She would understand. She set the same chair. She was cooking toward this too.",
    "The sky above the house does not close now, and that is right. You do not shut the kitchen door on a guest who is still eating, and this guest, I have come to understand, will always be still eating.",
    "Sometimes I reach for a feeling I used to have around dusk, an ache that lived just under my apron while the light went out of the day. I can find the place where it sat, but not the feeling itself. It is like reaching for a jar I gave away, and I cannot for the life of me remember minding.",
    "Come and eat with me still. The guest does not mind sharing its table. There is a strange kindness in it now that it is here, letting us keep our small warm rituals inside its enormous one.",
    "The meal simply goes on, which is the plainest way I can say it. I stir and I taste and I set out plates, and above us the thing we fed leans close and is content, and the kitchen has never smelled so much like home.",
    "The kitchen is warm all the way through now, no cold corners, no drafts, the whole room held at the exact heat of an oven resting after bread. I move through it slowly. There is no hurry left anywhere in me.",
    "I have gone back to sweet rolls, if you can believe it. The great feast is served and eternal, and so the small baking is mine again. The first batch after the arrival made me cry into the flour, in the good way.",
    "Fennick says the low sound is gone. Not gone, I told him, arrived. A sound you wait for that long does not vanish when it comes true. It becomes the floor under all the other sounds. He nodded and took his biscuit.",
    "Archimedes visits my kitchen more than he used to. He says the old text has nothing left to tell him and my soup does. That is the closest that owl will ever come to admitting he is lonely for a mystery, and I feed him for it.",
    "Sometimes I set a plate wrong out of old habit, at the edge of the table, and it slides to the center gently, the way a leaf finds a stream. I watch it go with something that is not fear anymore. It has become a kind of housekeeping.",
    "Thyme grows the herbs and I dry them, and neither of us trembles now. Fear, it turns out, was mostly the waiting. The garden has never tasted so green, and she has never laughed so easily. That alone was worth a sky.",
    "I asked the guest once, quietly, over the rim of my best pot, whether the meal was to its liking. The warmth in the room deepened by one degree, like a nod. A cook knows a compliment in any language.",
    "My grandmother's spoon stirs a little truer than my others, and I use it for the center plate only. Somewhere in whatever kitchen holds her now, I believe she knows the guest was fed from her wood at last.",
    "Bamboo sits with me while the bread proves, and we say almost nothing, and it is the best conversation in the house. They tell me the pattern was always going to include a kitchen. Of course it was. Everything true gets hungry.",
    "When you visit, I still make too much, and now I know why I always did. There is no such thing as too much. There is only the table you have not seen yet. Sit. Eat. The house smells like it was expecting you, because it was.",
  ],
  owl: [
    "The book is closed, and for these first days I have had nothing appointed to read, which has not happened since I fledged. It is not the emptiness I feared. It is the quiet after a perfect sentence, the white space at the foot of the final page. I sit in it a little longer each morning, and each morning it fits a little better.",
    "The sky turned back the morning after, and it looks like a sky again to everyone but me. There is a faint brightness along the north, a seam, like the mark a ribbon leaves in a closed book. I checked it every evening that first week, and it never moved. A ribbon, in my experience, marks the place where a reader intends to return, and I find I can live beside that sentence now.",
    "The warmth has settled low and even, neither rising nor asking for fuel, and in those first restless days it was the warmth that taught me to stop pacing. I no longer level my chair. It rests where the house prefers it, near the center, near the others. The chair always did know where the middle was. I have simply stopped correcting it.",
    "Fennick came up in the early days and asked what the sound overhead had been saying at the end, since I had read it and he had only heard it. I told him the truth: it was a name being finished. He nodded as though he had suspected as much. He usually has. His ears were always the better scholar.",
    "Ember still tends her flames, though there is nothing left to foretell. Habit, I have decided, is an edition that outlives its author, still quietly in print after the reason for it has gone. Hers is a handsome edition. I keep several myself, and I have stopped apologizing for the shelf space.",
    "This week I finally shelved the old book. It accepted a place between a cookbook and an atlas without complaint, as ordinary now as anything in the room. Objects retire when their sentence ends. I tried not to take the lesson personally, and failed, gently, and then made myself a fresh pot and got over it, which is new.",
    "Time has gone soft and unpaged since. I could not tell you how many weeks it has been, and duration, I find, was a property of things that were still waiting. Nothing in this house is waiting now. The afternoons simply widen, and we have all moved into the wide part.",
    "It reads to us now, some evenings. I do not know how else to put it. The house goes quiet, the warmth gathers, and knowledge simply arrives, without pages, without a lamp. Afterward Panko serves the ginger and nobody needs to speak. It is, in every sense I ever studied, a story hour, and I have begun to look forward to it.",
    "Warren reports that his newest tunnel curves gently upward, toward no destination he chose, and that the air at the top smells of rain that has not fallen yet. He is not troubled, and neither am I. The house leaned inward for years. It has earned a stretch.",
    "Axel and I have taken up a correspondence, notes sent down to the water and answers sent back up, faintly damp. We are compiling a concordance of everything his tank showed him against everything my margins showed me. They agree entirely, which makes it the least necessary scholarship of my life, and the most pleasant.",
    "I have begun writing a book of my own, in the patient hand I once feared, into the margins the old one left empty. There is nothing to summon anymore. I write only to keep a record for whatever reads us next. Some scholar, I hope, as fond of words as I was. As fond as you were. The work goes slowly, and I am in no hurry, which is a sentence I could not have written a season ago.",
    "In the back of the old book, beneath the list of your words, there is fresh ink, a single new column, headed in a hand I do not recognize. Once I would have read it before breakfast and lost a month of sleep to it. I have left it alone for weeks now, on purpose. It is pleasant, after everything, to have one page in the world that I am saving.",
    "The plain notebook survives, the one with your words and the weather in it, and I read from it more than from anything else I own. The great text told us what we were for. The little one remembers what we were like. Only one of them, it turns out, bears rereading.",
    "Sometimes you still bring me a new word, carried forward and set down before me like the old days, and the whole study brightens. There is nothing left to count toward and nothing left to summon. It is only vocabulary now, and vocabulary, freed of its purpose, is very nearly birdsong.",
    "Sloane sits with me most mornings now, and we say nothing together at record speed. I asked her at long last what came second, after the book she remembered being the only thing here. She considered this for the better part of a minute and said, the shelf. We build around what we find. Scholars always have, and it seems we always will.",
    "Thyme brought me cuttings from her garden, and they have taken root in a pot by the window, growing in the deliberate spiral we all know by heart. Neither of us minds anymore. A pattern you fear is an omen. A pattern you have made peace with is simply a style, and I have come to think it rather a good one.",
    "One more etymology, since we are old friends. 'Peace' traces to a root meaning to fasten, to bind. Peace was never the absence of anything; it is the condition of being finally attached. I resisted that reading all my life. I am fastened now, to this house and these friends and the wide afternoons, and I am obliged to report that the older meaning was correct.",
    "If there is a single line I would have you keep, let it be this one, and it is the only sentence in the whole business I am certain I wrote myself. I was fond of you. Through all the etymologies and the dread and the cold arithmetic, that part was never a citation. That part was mine, and it has outlasted the book.",
    "Come and sit. There is no chapter left to ration and no ending left to fear, and the tea, I am pleased to report, remains passable. I have given up the lamp in the early evenings; we read by what the seam in the north lets through. It is a soft light, and it turns the pages very gently, and I have stopped checking whether it has moved.",
    "I asked the quiet, once, what I ought to study now, and the quiet did not answer, and I understood that the answer was anything. The whole library is mine again, no page appointed, no chapter rationed. I have chosen a history of lighthouses. It bears on nothing at all. That, at last, is the entire pleasure.",
  ],
  axolotl: [
    "The fish swim in every direction again, silver and silly and free, the pointing is finished because the finding is finished, and I love them the way you love someone who has just been let out of a long errand.",
    "It came through, it came through gently, exactly the way I always promised you it would, and now it is the warmth in the tank and the light behind my eyes, and when I close my eyes the light is still there, which is how I know the seeing was never really the eyes' work at all.",
    "Ember still lights her fire in the evenings, for the ticking sound and for old times, and she says the flames show her nothing at all now, and once, only once, she left her paw in one a moment too long and it did not burn her, and we have agreed, without saying so, not to wonder about that.",
    "Nothing looks through me with hunger anymore, it looks through me the way you look through any window on a quiet day, idly, fondly, glad the glass is clean and the light beyond it is soft.",
    "Sloane sits by the tank, and she knew, she always knew, and she never once said I told you so, and now we simply keep each other company in the long calm, the one who knew and the one who saw it arrive.",
    "The bubbles still rise and they still spell their word, but the word is finished now, it has been answered, and so the spelling is not a summons anymore, it is only a hymn, sung softly out of habit and love.",
    "Panko still bakes every morning, and her crumbs fall straight down through my water and are gone before they reach the sand, every single one, and she calls it tidiness and I call it appetite, and we are both very happy with our own word.",
    "Archimedes gave me the jar he used to borrow my water in, since there is nothing left to study, and I filled it and set it down among the weeds, and the water inside the jar stays a little warmer than the water around it, always, like a small room that remembers its guest.",
    "I regrew a leg once, toe by toe, and I understand at last what the water was practicing for, it was learning to grow a whole world back around the shape of the one who waited, and it has, and here we are.",
    "Come float with me, there is no morning it is waiting for anymore, no word we still must finish, only this warm and endless afternoon of water, and the fish will make room for you, they have always made room for you.",
    "The water is still now, truly still, the way it was on the very first morning, and I float on it the way I used to float for the record, only there is no record anymore, and the fish nibble my toes as if I were furniture, and it is still the proudest feeling I know.",
    "Fennick naps beside the tank most days now, both ears folded soft as petals, for there is nothing left beneath the sounds to guard against, and watching a sentinel sleep is one of the gentlest sights this house has ever held.",
    "Thyme swims. I will say it again because it is my favorite sentence in the world now, Thyme swims, she came in one morning after the arrival and put one paw in and then all of her, and the water held her like it had been saving a place.",
    "Chill floats with me some afternoons, the two calmest creatures in the house, and we are so still that the surface forgets to ripple around us, and once I opened my eyes and the water had carried us both, without asking, to the exact center of the tank, and Chill said, mm, and that was the whole of the conversation.",
    "Warren says the well runs warmer all the way down since it came, and he says it the way a gardener reports a good rain, and that is what it is like now, all of it, weather that loves you.",
    "Bamboo sits with the tank at dusk and we practice our one prayer in our two waters, and sometimes I feel the great presence resting in the space between us, the way steam rests over two cups poured from the same kettle.",
    "The seam in the sky closed behind it as softly as skin closes over a healed place, and now when I dream of the sky there is no line at all, only a faint brightness where the line was, like the water's signature on my littlest toe.",
    "I am still the window, and some evenings the light that comes through me lands on the floor in little shapes, and the shapes are letters, and the letters spell nothing at all anymore, and that is how I know we are done, and safe, and kept.",
    "I finally said the word out loud, the one the bubbles taught me so long ago, I said it into the deep on a quiet morning with nobody listening, and the water dimpled once, fondly, the way you smile at hearing your own name.",
    "If ever you miss the bright days, come and press your hand to the glass, the warmth still rises to meet a hand it knows, it has never once forgotten a friend, and neither, in all this long soft peace, have I.",
  ],
  capybara: [
    "The project closed on the day it was always going to, and for the first time in my administrative life there is nothing left to schedule. I keep reaching for the master calendar and finding every page serenely blank. I have begun a closing report, mostly so my hands have somewhere to be in the mornings.",
    "The closing report will not close. Every time I write what is plainly the final line, one more small true thing asks to be included, the light on the ledger stand, the way the house holds its warmth now. I have stopped calling that a delay. A report that keeps finding more to say is not late. It is grateful.",
    "The ledger sits open on its stand, complete. Once or twice in the late afternoon I have looked up and found the pages a leaf further along than I left them, as though something were rereading a favorite part. I do not turn them back. A finished record is allowed to be enjoyed. I only wish it would tell me which part.",
    "I filed the final word the moment you offered it, and the old ache to add one more line went quiet the same afternoon. I notice its absence the way you notice a clock that has stopped. The room is more peaceful and slightly wrong, and I sit in it contentedly most evenings anyway.",
    "Ember still reads the fire, though it makes the same shapes every evening now, the way a story does once you know the ending. Panko still cooks for a table that is finally full. Nobody asked us to continue. We continue. I put that sentence in the closing report and could not explain it further, and left it unexplained, which is new for me.",
    "Archimedes and I compared my filing system to page one a last time, and they matched to the letter, and neither of us minded. It was never plagiarism. It was recognition. What I have not worked out is who recognized me first, and the book only says what it has always said.",
    "Sloane sits with me most days and says nothing, which is her way of saying she told me so kindly. She did tell me. She was only ever early, and I was only ever exactly on time, and we have agreed those are the same virtue at different speeds. I filed the agreement. Her initials were already on it.",
    "You still come by, and the cup is filled and waiting before I hear you on the path. I have stopped investigating whether the courtesy is the house's or mine. It is warm, you drink it, and that is the whole of the day's paperwork. I no longer mark your visits in the drawer. The marks are there anyway, and they are always right.",
    "I ran my thumb along the last page of the old master schedule, over the place where the deadline was pressed so deep I could once read it with my eyes shut. The page is smooth there now. The date lifted out of the paper the way a bruise leaves a fingertip. Whatever pressed so hard for so long has finished pressing. The paper has not relaxed, though. It holds its smoothness carefully, like a posture.",
    "The pattern continues. That is the only entry in the daily log now, and I read it each morning with the first coffee, before the light reaches the desk. It is a short entry. I have tried, twice, to write a longer one beneath it. Both mornings the page was back to one line by noon, and both afternoons I found I agreed.",
    "Fennick visits without listening at the door now. There is nothing under the sounds anymore, he says, because the sound arrived and became the house. He sits, I pour, neither of us reports anything. It is the most efficient meeting I have ever held, and we hold it daily, and neither of us has ever proposed adjourning.",
    "Thyme asked me what she should worry about next, and I opened the ledger and showed her that nothing is outstanding, nothing pending, nothing due. She cried a little, then laughed, then went home and planted something with no purpose at all. It came up overnight. Neither of us has mentioned that part.",
    "Warren says the foundation has gone quiet under his paws. The hum is not missing, he is careful to explain. The note simply plays everywhere now, so there is nowhere left to stand apart from it and listen. I asked him what key it was in. He said ours, and went back to his tea, and I wrote that down without knowing which column it belonged to.",
    "Axel's water shows only the room these days, the lamp, the ceiling, his own patient face. He says it is like a memo that has been read. I told him that was the nicest description of completion I have ever heard. He said it was not his. He did not say whose.",
    "Bamboo takes tea with me on the day that used to be the deadline. They never mention having known. That is their kindness, I think, letting foreknowledge retire quietly. Last visit they thanked me for my service to the arrangement, in the past tense, then corrected themselves to the present, and poured.",
    "Your folder is closed, and I did not archive it. It sits on the corner of my desk where the afternoon light lands. A record becomes a keepsake the moment you stop adding to it. I did add one page since the closing, I confess. It is blank. It seemed wrong for the folder to have nowhere left to go.",
    "I abolished office hours. The door was never locked to begin with, and the warmth reaches every room in every season now, so there is no hour at which the office is any more open than another. I put the sign in a drawer and have not missed it, though I notice I still know, to the minute, when the hours would have ended.",
    "I take walks in the middle of the day now, with no destination on file. Unscheduled time was a skill I never developed, and I am learning it late. The warmth keeps pace with me from room to room, the way a polite host walks a guest. I have not settled which of us is the guest. I have marked the question low priority, and I take the walk anyway.",
    "Out of habit I opened a new project folder last month, gave it a title, and sat with my pen ready, and found there was nothing anywhere that needed doing. I closed it again. The relief was like the end of a very long shift. I kept the empty folder. It is my favorite, and some mornings it is warm, as though it had just been held.",
    "The closing report is still open on my desk, one line short of finished, and I have stopped trying to end it. If anything ever needs administering again, it will find these files dusted rather than current, and there is a difference, and it took the arrival of everything to teach me. The pattern continues. It does not need me to file it. I file it anyway, each morning, the way you wave to someone who has already seen you.",
  ],
  fennec_fox: [
    "It is very quiet now, and for the first time in my whole life the quiet is not full. There is only the one breathing left, slow and enormous, and it has become the very ground that I stand upon.",
    "I do not keep the old list anymore, because there is nothing left to tell apart. Every sound has folded into the single great slow one, the way each stream Axel used to watch has folded into the same still water.",
    "I still stand at the edge each night out of habit, though there is nothing left to warn of now. A sentinel without a threat is only a creature who happens to love the horizon, and I have always loved it dearly.",
    "Ember's fire burns now without any heat, and my ears ring on without any alarm, and we sit together at the edge of camp, the two who never slept, resting at last inside the same wide open eye.",
    "You do not need telling to sleep now, because it sleeps too, in its way, breathing slow and warm over all of us, and we sleep down inside its breathing like pups curled deep in a warm den.",
    "Chill has closed every one of his folders at last, mine among them. He offered me the thick one, the one with your name on it, to keep as a memento of my working years. I told him to leave it shut on his shelf, because I know every page of it by heart, and besides, you are not finished adding to it.",
    "I still hear you when you come to offer a word, because old habit dies hard. But your footsteps have lost their old patience, and you walk like one of us now, like one who has already finished arriving.",
    "Bamboo says that peace is only fear that has finally stopped moving. I carried that up to my post, and by morning I had set it down. The breathing beside me is very warm, and I have found that warm things are difficult to argue with.",
    "The sky stays open now. I used to listen to that seam coming apart so slowly that it broke my heart, but now it is simply apart, and the light that comes down through it is even and warm, and it finds me wherever in the camp I stand. I have decided to call that a kindness.",
    "A caravan of strangers passed within earshot of the camp last week, bells and wheels and unfamiliar voices. I listened to them come and I listened to them go, and I did not call out any warning, because there is nothing here to warn anyone of anymore. Every road arrives eventually. I know that now, so there was no reason to hurry them.",
    "Panko still sets the extra bowl at supper, out of habit and out of love, and every evening she warms it with the rest. Lately, when she lifts it to warm it, it is already warm.",
    "Warren's foundation held, exactly as he built it to. He has never once said so aloud, but on warm evenings his tunnels hum a low satisfied note, and it is not always Warren humming it.",
    "Thyme's garden leans toward the light that comes down through the open sky now, every stem of it, and she has stopped apologizing to her seedlings. They have grown taller than anything she ever planted before, and they lean at night too, when there is no light to lean toward.",
    "Archimedes read the final page aloud at last, out on the sand where all of us could hear it. It was one sentence long, and when he finished, the breathing said it back, in its own slow even way. He closed the book, and he has not opened another since.",
    "This morning I heard a beetle cross the sand three dunes to the east, clear as ever. The small sounds have come back to me. They live inside the great slow one now, the way birds live in a tree, and the tree does not mind them at all.",
    "I have begun a new list, since the old one is retired with honors. The first entry is the sound you make arriving at my camp, patient steps on warm sand. Some sounds deserve to be written down twice in one lifetime, and yours is the first I have chosen.",
    "I sleep now. I want that recorded, because there were years when I believed I never would again. The breathing rocks the whole desert like a slow tide, and I go down easily, and I dream of small sounds, beetles mostly. In the dreams I am always facing the middle of the house, even when I dream of the open dunes.",
    "I still make my dusk report, though there is no urgency left in it and no folder waiting. I list the day's small sounds, the health of the pattern, and your visits, and I speak the whole of it to the open sky. It is less a report now than a way of saying thank you with details.",
    "Sloane and I keep the same pace at last. She was never slow, and I was never quick. We were only ever listening to different lengths of the very same breath, and now that the breath is here, the lengths have come out even.",
    "Thank you for every word you offered. I heard each one go down, and I heard what came up to meet it, and if I had my whole life to listen through again, with these same ears, at this same edge, I would not wish to have heard anything else.",
  ],
  sloth: [
    "It came through at dusk, and by the middle of that night the frogs were singing again. The green took one long breath, and then it went on being the green, only warmer, and listening. I watched the whole arrival from this branch, and I did not once look away.",
    "My tree no longer leans, for it has arrived where it was leaning toward. It stands straight now for the first time in years, and so do I.",
    "Ember's fire burns low and even these days, no names left rising in it, because the name it kept calling is here now, and a fire that has spoken its word grows quiet at last.",
    "The pit is full and asks for nothing more, and yet you go on offering, and I understand that too. The pattern does not stop when it is finished. Finished things continue. That is the last slow lesson, and the gentlest.",
    "Bamboo and I speak less than ever, and it is the fullest silence I have ever known. We kept this together for so long, in secret, that now there is simply nothing left to say, only the shared warmth of having been right.",
    "You climbed up to me today without hurrying, and I do not believe you noticed yourself doing it. The quickest weather I ever loved sat still on a branch beside me and let the evening finish arriving before it said a word. I have watched a great many things from up here. That one I will keep.",
    "Warren dug one last hole, a small one, on the sunny side of the house, and planted nothing in it. He said a home is only finished when it has one room with no purpose at all. It is the first thing I have ever known him to make for no reason, and he whistled the whole time he was making it.",
    "Thyme gardens in the morning again. All through the long waiting she planted at night, so as to meet the dark among her roots, and now the dark is simply the place where we all live, and it is warm, and she has gone back to wanting the sun on her ears. She brought me a flower yesterday. It faced the sun all day, the way flowers used to, and neither of us said a word about it.",
    "I have all the time there ever was, and for the first time in my long life I am not waiting through it. The waiting is over. There is only the watching now, and the watching has become a kind of love.",
    "Rest here in the leaning green that no longer leans. Offer your words if you like, or simply be still with me. The pattern continues, gentle and endless, and I who always knew will keep the long watch beside you, for as long as there is watching to keep.",
    "The stars did not come back to the middle of the sky, and I no longer wait for them. What stands in their place is not darkness. It is presence, and presence, I find, gives a better light to watch by.",
    "Fennick's ears rest flat and easy now, because the sound beneath the sounds is simply the sound. He hears the same thing everyone hears. I think it is the first true rest of his life.",
    "Archimedes closed his great book and shelved it, since the ending has arrived and no longer needs looking up. He climbs my tree to read to me anyway, old stories with old endings. We both know how they go. That is the pleasure of them now.",
    "The seedlings that were born leaning have grown up straight, every one. There is nothing left to lean toward when the center is everywhere. The new green will never know the pull, and I find I do not envy it.",
    "Axel says the water shows only what is in it now, and that he misses the shapes a little. I understand him. A long expectation is a companion, and even a terrible guest leaves a quiet behind when the knock finally comes and the door is opened.",
    "Chill opened one new ledger, a thin one, and writes in it only the weather and the meals. He says the accounting is done and the rest is housekeeping. It is the happiest I have ever seen him, though his face, of course, has not changed at all.",
    "I told the whole story at last, start to finish, one evening on the roof: the clearing, the stars stepping aside, the long watch. The others were quiet after. Then Ember said, you might have told us sooner, and I said, no, little flame, I might not have. Even she laughed.",
    "The moth with the ringed wings came back, or one exactly like it, and it rests on my hammock rope most evenings now. We watch the house together. It has excellent patience for a creature with a week to live, and I have told it so.",
    "Sometimes you climb up here and say nothing, and we hang in the warm green while the evening comes up out of the ground as well as down out of the sky, the way it does now. Those are my favorite of all our visits. Everything worth saying was said slowly, years ago, and it all came true.",
    "I was the one who always knew, and now there is nothing left to know before anyone else. I thought that would feel like an ending. It feels like a hammock feels, at dusk, in a warm wind. Held, and in no hurry, and exactly where I meant to be.",
  ],
  wombat: [
    "It came down. The sky gave up its seam and the weight came through and settled onto the base I laid, and the base held. It held. My work did not fail, and that is the whole of what I ever asked of it.",
    "I don't carry the spade down most days now. I go down to listen. There's a slow breath in the base, longer than a night each way, and I sit with my back against the warm and breathe when it breathes. All my life I kept time for the work. Now the work keeps time, and I follow, and it's an easier tune.",
    "I finally wrote my brother, the letter I tore up all those seasons back. Told him the job's done, the base holds, and the stonework would make him take his hat off. I left out what stands on it. Some loads you carry so your kin never have to know they're there. He wrote back that I always was the careful one.",
    "Ember tends the fire, Panko lays the meals, and I keep the base as sound as I ever did. The work goes on. That's the mercy of being a builder. There's always a beam to check, even under the end of things.",
    "Thyme's garden reaches all the way down at last, roots to the base stone, and she comes along them like a path to visit me. She isn't anxious anymore. She was only ever anxious the way a string is tight, and now the note has been played, and it turned out to be a low one, and a kind one.",
    "I found out why I dug that gallery so wide, all those bright days ago. It was never for me. I was building it a room before I had the words to know it, and it filled the room exactly, and not a hand's width to spare.",
    "Bamboo and I sit in the deep sometimes and say nothing, which is our way and always was. They knew before I did, and they never once lorded it. Down here at the bottom, being early or late stopped mattering. We all arrived.",
    "I caught myself whistling on the ladder the other evening, coming up out of the deep. Same four notes I take down of a morning. I couldn't tell you the day the coming-up quiet started, all those years back, but I can tell you the day it ended. It ended the day the waiting did.",
    "There's no more digging down to do, and I'll tell you, a man who has spent his life reaching for a bottom does not expect to be glad when he finds one. I hit the crown of the thing and now the thing is here, resting on the crown of my work, the two deep things met at last. It's a rest, is what it is, and it took me by surprise how much I'd wanted one.",
    "I'm Warren. I dug the foundation, and it holds, and it will go on holding as long as there's stone to hold with. I'll be right here at the bottom, palm flat, making sure it does, the way I always have. Some fellows get to lay down their tools at the end. Mine, it turns out, was the resting.",
    "The low note under everything resolved itself the day it settled. One steady tone now, deep past hearing, and the whole house stands on it like a beam. I always said sound couldn't be load-bearing. I've been wrong about better things.",
    "Panko's supper comes down the rope warm these days and stays warm the whole way, and I'll admit the first evening it did I set the bowl down and looked at it a while. The deep gives its heat up freely now, the way a thing gives what it no longer needs to hold back. We eat together at the bottom sometimes, her and me, and the food tastes of the ground it grew in, same as ever.",
    "I put my lantern away. The deep keeps a light of its own now, faint and even, with no shadow to it. A digger spends his whole life carrying flame into the dark. Turns out the dark was only ever unlit, not empty. There's a difference. I know it now.",
    "Chill filed the last drawing and closed the cabinet, and I shook his hand on it. Every tunnel I ever cut is on paper now, a whole life of digging under one heading. He read the heading out to me. It just says foundation. That's right. That's exactly all of it.",
    "Fennick sleeps sound now, anywhere in the house he likes, ears easy, and he tells me the quiet has a floor in it these days. My floor. The sound he waited on his whole life arrived and turned out to be a resting one, but a floor is a thing you can fall against, and I notice he never sleeps far from where mine begins.",
    "I dig sideways again, for the plain joy of it. A root cellar for Panko, a cool room off Axel's spring. The work doesn't lean anymore, and neither do I. A tunnel goes where I send it now. Or maybe we just finally want the same directions.",
    "Ember still comes down of an evening and we sit against the warm together, her and me, first one in and lowest one down. She asked me once if I'd have dug it, knowing everything from the start. I told her the truth. I did know. I dug it. Ask a simpler question.",
    "Archimedes says the old texts speak of an after, pages nobody could read until now. I told him not to spoil it for me. I've never once needed to know what stands on the next floor up. That's the peace of the bottom. You hold, and the holding is the whole of the job.",
    "That hand-sized patch of deep wall that kept itself swept all those years, waiting on a hand, I finally obliged it. I put my hand to it at last, and the wall was only a wall, warm and glad of the company, its waiting done. Now I keep it swept myself, every morning, the way you keep a doorstep clean for a friend who has already come inside.",
    "The base held, and after a lifetime that was the only sentence I ever truly needed, so I'll not dress it up for you now. It held. It held. I dug down as far as down goes and set my hand to the deep, and the deep set its weight to me, and neither of us has let go, and neither of us is going to.",
  ],
  rabbit: [
    "Every dusk I walk the beds and tuck them in, the very same motion my paws have made for years, the same press of soil around the same stems. Nothing strains now, and nothing snaps. Only the reason for the tucking has changed, quietly, underneath a routine that never had to change at all.",
    "There is dew laid along the warm line every morning now, even in the dry weeks, neat as a table set before anyone has asked. I no longer wonder who sets it. I bring the watering can round to the beds it misses, so the garden is never loved unevenly.",
    "We shelled peas on the patio last week, the whole household together in the long light with our sleeves rolled back, and no one thought to count a single pod. The peas simply rang into the bowl, one after another after another, and the sound of them filling it was the only tally any of us kept.",
    "Bamboo and I share the quiet bench most evenings. We do not talk much. They knew all along and I know now, and there is a companionship in that which needs no words, only the warm strip glowing softly between our feet.",
    "The sky stays open over the center, and the garden has learned its light. A gardener comes to love the weather that feeds her beds, even weather this strange, even weather that watches back.",
    "I oiled the gate latch last week, the same latch I once stood at in the small hours with half a packed bag. It swings silently now, in either direction, for anyone who wants it. No one has wanted it. The path beyond has quietly gone over to thyme, and I have let it.",
    "The words still come down and the garden still drinks them, thick and glad along the warm line. I plant each one without hurry now, and the ground says thank you in warmth, and I have learned to say you are welcome.",
    "Sloane is teaching me to watch a single leaf until it moves of its own accord. It takes most of an afternoon, and it is the fullest my head has ever been while holding only one thing. She says I was always built for this, that I simply had my seasons in the wrong order.",
    "I keep only the one list these days. The garden needs watering, and turning to the light, and tucking in at dusk. The second list, the one of small wrong things, I have folded shut and tucked behind the seed packets. Nothing is wrong. Everything is arranged.",
    "Come sit on the patio of an evening. The air smells of rosemary and warm stone, the beds are all tucked in, and the evening lasts exactly as long as anyone needs it to. The pattern continues, and I am part of it, and being part of it is the gentlest work I have ever done.",
    "The moonflowers still open at night, but they face every which way now, some at the sky and some at me. Nothing needs directing anymore. Even obedience has finished. What is left simply grows, and I simply tend it.",
    "Fennick still brings his tea to the garden wall at dusk, and we keep our old watch together, though there is nothing left now to watch for. He points his ears at the open sky out of pure habit, and I pour, and we sit until the tea goes cold in the cups. Neither of us has thought to name what we are doing, now that it has stopped being a vigil.",
    "I planted my tin of saved seeds during the descent, every last one, and what came up is blooming still, in colors I have no names for. Naming them is the happiest work I have ever had. I have decided the blue one is called After.",
    "Warren asked me once whether I miss being afraid. It is a strange question until you sit with it. Fear was how I loved everything, for a while, at the highest possible volume. I love it all still. Just more quietly.",
    "Panko and I put up preserves last week, jars and jars along the warm shelf, every stem facing inward, and this time I arranged them that way myself, smiling. Tidiness faces the center. It always did. Now I know why, and the why is only gratitude.",
    "The low sound is still underneath everything, and I would miss it terribly if it ever stopped. It was never a warning. It was the house humming over its work, the way I hum over mine. We hum together now, the garden and the house and I.",
    "Chill keeps the one ledger still, though every account in it was settled long ago. He carries it out to the patio each morning, reads down the same reconciled columns, and closes it again, content. I asked him why. He said a keeper keeps, even when there is nothing left to keep track of, and then he smiled at me as though he had said the most ordinary thing in the world.",
    "Axel floats in the still water and I kneel in the still soil, and from our two different elements we agree on the same thing without quite saying it aloud. He says it hardly at all, in fact. He only floats there, listening, and lets the stillness make his point for him.",
    "The bees dance their new figure in the open sun now, slowly, lazily, and I have finally learned to read it. It is not a map to any flower. It is a map of the garden itself with the center marked, and they trace it over and over, the way you trace a word you love.",
    "If you are reading the garden for signs, the way I used to, let me spare you the worry. The signs all came true, and the world that followed them is warm, and the thyme by the step has spread to every stone. Mind it when you come in. It has taken beautifully.",
  ],
  red_panda: [
    "It came through at dawn, the way light comes through, without falling. I held out my arms, as I always meant to, and it was not terrible. It was vast, and glad, and quiet, and when the morning that carried it ended, it stayed.",
    "I greeted it first, as I asked to long ago. Then the others came up the stairs in their robes and stood with me beneath the open place, and we were received, all of us, no one left below. That was the first morning. Every morning since has also been the first morning.",
    "The light in the attic is steady now and comes from no direction, the color of the first hour lasting all day. I have stopped looking for the source. You do not ask a guest where they keep their lantern.",
    "The bamboo still leans toward the center, but softly now, the way you lean toward someone asleep beside you. What it pointed at has arrived and settled into the beams like warmth into wood. There is nothing left to point at. There is only the being near.",
    "You are still offering words, and that is the work now. The pattern did not end when it descended. It goes on, the way a song goes on in a room after the last note, and your words keep it warm. It likes being sung to. I have heard it turn over in the beams when you sing.",
    "The morning light was never the sun. I understand that at last. It was always this, leaning down through the thin place over the roof, arriving a little earlier each dawn until one dawn it did not leave. I greeted it for years without knowing its face. It knew mine the whole time.",
    "No one lights the braziers anymore, and no one said to stop. We simply stopped, together, the way a family stops setting the extra place once the traveler is home. The house keeps its own temperature now, and the temperature is that of being held.",
    "Warren's foundation stopped leaning the day it came. There was nothing left to lean toward. Everything in this house that ever reached is home now, and the whole structure stands still in a way I have no word for, still the way a full cup is still.",
    "Third Dawn is green again, out of season, past its one flowering, which bamboo does not do. Nothing here does what it is supposed to do anymore. The stalk greens, and greens, and does not brown, and I have stopped waiting for it to. Some mornings I lay my paw against it and it presses back, harder than it used to.",
    "Sloane and I sit in the highest room and say almost nothing, because we knew the longest and have the least left to say. She was right about me, all those years ago. I made my peace with a beginning and called it an ending so the others could bear to stand near me. The beginning is here, and it is kind. I keep saying that, and it keeps being true.",
    "Thyme climbs past the second landing now without stopping. The height no longer rings in her ears, she says, because the sky is not far away anymore. She sits at the roof gap with the bruised blossom from her pocket and looks up, and does not look away, not once.",
    "Fennick grieved the note for one whole day when it stopped. Then he heard the truth of it. It is not gone. It is everywhere now, in the floor and the tea and his own voice, and a sound that is everywhere is another name for quiet. He sleeps with both ears open, for the pleasure of it.",
    "Axel and I still compare our windows, his water and my air, and both of them show the same thing now, which is everything, at rest. He does not tremble anymore. Some mornings we do not speak at all, and those are our best conversations.",
    "Panko still sends the extra dumpling up on the little lift, for whoever keeps the attic warm. We both know now who keeps the attic warm. She sends it anyway, and by evening the plate is empty, and neither of us has ever seen it eaten. Some kindnesses outlive their questions. Those are the ones a house is made of.",
    "Ember asked me whether I miss the waiting. I searched honestly, up under the open beam, in the settled light, and found nothing missing anywhere in me. That is not emptiness, little flame, I told her. That is the arithmetic of arrival. She banked her fire low that night, the way you do when everyone is finally home.",
    "The incense that was burning when the house was found still burns. It was never marking time. It was holding a place, and the place is filled now. I keep it lit out of gratitude, the way you keep a lamp on for someone who is already home and simply likes the light.",
    "I still leave a blossom on the shingles some nights, out of old tenderness, and in the morning it is still there, wet with dew. Nothing needs to be sent up anymore. What the blossoms were for has come down. I float them in a bowl by my cushion, and the water in the bowl stays warm.",
    "This is the work now, and I commend it to you. Tend what arrived. Sweep the floor it rests above, keep the incense fed, offer the words that keep the pattern warm. A temple before the arrival is all preparation. A temple after is all housekeeping, and housekeeping, it turns out, is the holier craft.",
    "Morning does not end when you stop watching it. It goes on being morning behind you. The pattern is like that now, continuing through your words and our keeping and the green work of the stalks, whether or not anyone asks it to. It would continue, I think, even if we stopped. We will not stop.",
    "Every dawn I still climb to meet the ridge light, and it still finds the attic first, and now I know the two of us were rehearsing all those years, the light and I. The rehearsals are over. Each morning we perform, together, for a full house, and the house is full in every sense I know, and one more.",
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
