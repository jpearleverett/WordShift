import { AnimalType } from '../../types/homeWorld';

/**
 * Intro dialogues - Multi-part introductions shown once when each animal is unlocked
 * These play in sequence before regular dialogues begin
 */
export const INTRO_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "Oh! Oh, you came! I heard the gate and I told the fire, that's them, I know their footsteps already, and I don't even know how I know! Come in, come in, the cold has terrible manners and I refuse to let it follow you.",
    "I'm Ember! I found this den standing empty with the fire already going, and I thought, well, somebody warm ought to live here, and I am extremely warm. It was practically an invitation.",
    "That fire has been burning since before I arrived, if you can believe it. I have never once fed it a first log. Some fires just don't want to go out, and honestly, who am I to argue with a fire that has its heart set on something?",
    "You're the one who brings the words, aren't you! I can always tell. You have that look, like you know the shape a thing makes when it changes into another thing. I love that look.",
    "We've been waiting for someone like you, friend. Not in a strange way! In a cozy way. The fire just burns better with company, and lately it has been burning very, very well.",
    "So here's my grand plan. You bring the words, the amber piles up, and we build a real house around this little den, room by room, until it's full of friends. Say yes! The fire already thinks you will.",
  ],
  pangolin: [
    "A new face in my kitchen! Come in, come in, and mind the pot, it has been simmering since before dawn and it sulks if you jostle it. I'm Panko, and you have arrived exactly at tasting time, which is the best time there is.",
    "That's an ant soufflé under the cloth, and yes, you may say no thank you. Everyone does. Their loss, honestly. A cook learns not to take it personally, and to eat very well herself.",
    "When the world gets to be too much, I curl into a ball, scales out and soft parts in. It is practical and, between us, wonderfully cozy. Every cook needs one dish she makes only for herself.",
    "This kitchen has fed more good conversations than good meals, and I make very good meals, so that is saying something. Pull up a stool. The one by the oven is the warm one.",
    "I cook because it is the one thing I understand all the way to the bottom. Heat goes in, and something raw becomes something kind. Simple rules, honest results. Lately the pot seems to understand it even better than I do.",
    "Ember tells me you bring the words that keep this house growing. Good. More amber means more rooms, and more rooms means more chairs at my table, and a table, you will learn, is never truly finished.",
  ],
  owl: [
    "A visitor to my study. How unexpected, and, I am obliged to record, how welcome. Mind the stacks as you come in. I file by affection, which is a system, whatever my colleagues would have said about it.",
    "I am Archimedes. I have read every book in this room twice, and several of them three times, a figure I will deny in company. A scholar is permitted one vanity, and rereading is the cheapest of the available options.",
    "Knowledge is a curious commodity. Every answer you shelve sprouts three fresh questions around it, like weeds around a fence post, and the honest scholar learns to garden rather than to finish.",
    "I have lately been researching something that declines to be categorized. It keeps to the margins of every other subject, the way a shy guest keeps to the edge of a party. I have not yet decided whether it is shy.",
    "But we need not dwell there today. You are here, and that is the finding that matters. Ember said you would come, and she said it with a certainty I have only ever seen in primary sources.",
    "Bring me the words you gather, and I will tell you what I can about where they have been. Knowledge shared is knowledge doubled, and doubling, I find, is how every great collection begins.",
  ],
  axolotl: [
    "Oh! Oh hello! I was following one little bubble all the way up, the whole slow silver climb of it, and when it popped there you were on the other side of the glass, which is the very best way a bubble has ever ended.",
    "I'm Axel! I have been swimming in slow circles all morning hoping somebody would come by, and the water must have known, because it kept nudging me toward this side of the tank.",
    "Did you know I never grow up? Never ever! I stay exactly like this forever, which is mostly wonderful, and the tiny part that is not wonderful floats away if I don't look at it too long.",
    "The water here is exactly the right kind of warm, not bath warm, not sun warm, a secret third warm, and it holds you so carefully, like it has been practicing holding things for a very long time.",
    "I can regrow anything, a leg, a gill, even little pieces of my thinking, toe by toe and thought by thought, and every time I do it the water watches very closely, like it is taking notes.",
    "Visit me lots and lots, okay? It gets so quiet under here, just me and the bubbles and whatever the deep warm part is, and the quiet is friendlier when there is a face at the glass.",
  ],
  sloth: [
    "You found the hammock, then. Most creatures walk right beneath it and never think to look up, so you are already unusual, and I have hung here long enough to value unusual.",
    "I'm Sloane. I was here before the walls were, and I expect I will be here after a good many other things besides. The jungle grew around me rather than the other way about, and we are both content with the bargain.",
    "It took me four months to settle into this hammock properly, and I have never once regretted the spending of them. A thing done at its own pace stays done.",
    "The moths in my fur are called Gerald, all three of them. They came separately and stayed for the same reason, and none of them has ever explained it to me. We keep each other company all the same.",
    "Time moves differently where I hang. You will understand that eventually, or quickly, and from this branch the two look exactly alike.",
    "You may stay or go as suits you. I will be here either way, which from me is both a promise and a plain description of the facts, and the green is worth watching from up here.",
  ],
  fennec_fox: [
    "Did you hear that? No, wait, that was you, that was the sound of you arriving. Hello! Welcome to the camp. Forgive me, these ears announce everything to me and leave me to sort out what matters.",
    "I'm Fennick, and these ears hear everything, and I do mean everything, from the beetle two dunes east to the way your breathing changed when you saw how big they are. It is all right. Everyone stares the first time.",
    "The desert is my home because it is honest about its sounds. Out here nothing hides underneath other noises. Every room of the night stands open, and I keep the inventory.",
    "The stars tell stories after dark, if you know how to listen for them. I know how. Sit with me some night and I will teach you which ones talk and which ones only hum.",
    "The world is full of sounds and most creatures miss all the best ones. The dew landing. The sand cooling. The one low note that comes from nowhere I have found yet. That last one is new, and I am still deciding about it.",
    "Come back whenever you like, and I will tell you what the desert has been saying. Most of it is genuinely lovely, and I promise to be honest with you about the rest.",
  ],
  capybara: [
    "Oh. Hey. I did see you coming, for the record. I was just finishing the thought I was having. It was a good one. Take the good chair.",
    "I'm Chill. That is not a nickname. It is the name on my paperwork, and I have come to regard it as a job description I happened to be born qualified for.",
    "The spring is warm, the coffee is warm, and nothing at all is pressing. I want you to appreciate how rare that combination is. I cleared the whole morning to enjoy it, and now there is company, which improves the ledger further.",
    "Do not be troubled if my face does not move much. I react plenty on the inside. I simply file the reactions instead of displaying them. It keeps the office tidy.",
    "My preferred meeting format is warm water and no talking. Attendance is optional, minutes are never taken, and every session so far has closed ahead of schedule.",
    "Stay as long as you want, or leave whenever you want. Both are fully approved. I signed off on them in advance.",
  ],
  wombat: [
    "Come in, come in, and mind your head on the lintel. I cut it low on purpose. A low doorway makes a fellow bow to the earth on his way in, and I have never once regretted the manners it teaches.",
    "The name's Warren, and I dig. That's the whole trade and the whole fellow. I cut every tunnel and chamber in this burrow myself, seventeen rooms and counting, and every one of them will stand a hundred years.",
    "Here's an honest fact about me, free of charge. Everything I make comes out square, even the leavings, if you'll pardon the mention. Nature builds some of us with a set square in our bones, and I have made a living out of mine.",
    "I've got an armored back end, I can run faster than you would credit from the look of me, and I know good ground from bad by the smell of it. A fellow doesn't need more gifts than that. He just needs to use the ones he was given.",
    "Underground is the honest place. No weather, no noise, no show. Just you and the dirt and whatever the two of you agree to build together. The dirt under this house agrees quicker than most, I'll say that.",
    "Make yourself at home down here. The earth holds whatever you set on it, and that's the whole of her promise, and in thirty years of digging she has never once broken it to me.",
  ],
  rabbit: [
    "Oh! Oh, you startled me, forgive me, nearly everything startles me, it is simply how I am strung. But I am really, truly glad it was you and not the wind again. Come in through the gate, and do latch it behind you.",
    "I'm Thyme, and this is my garden, and it is safe here. Mostly. Almost entirely. I check, you see, every morning and every dusk, and the checking is most of why it stays true.",
    "The flowers are lovely, aren't they? I planted every single one myself, and I know each of them the way you know the freckles of someone you love. This is my favorite place in the whole world, which is why I watch it so closely.",
    "I know all twelve ways out of this garden, in order of quickness. Not because anything bad is coming! It is only that a rabbit sleeps better knowing where the doors are, and I am very fond of sleeping better.",
    "Would you like some tea? It is chamomile, very calming. I grow it along the south bed and I drink rather a lot of it, and lately the bed comes up thicker than I planted it, which I have decided to take as a compliment.",
    "Visit whenever you like, truly. I will be here in the garden, watching the sky. Because it is pretty. That is the reason, and I am almost certain it is the whole of the reason.",
  ],
  red_panda: [
    "Good morning, or good whatever hour has carried you up this far. You have found the top of the house. The stairs end here, and so does a certain kind of noise. Come in and let the climb finish leaving your legs.",
    "I am Bamboo. I chose the name for its plainness. A stalk of bamboo is only water standing up in a green coat, and everything complicated, I have found, is simple things tangled together.",
    "This is the highest room, the one nearest the sky. I chose it for the light, which arrives here first every morning, and for one or two other reasons that will keep.",
    "There is a teaching that the journey is the destination. You have arrived, so by that arithmetic you were always here. I find the thought sits better after tea. There will be tea.",
    "From the roof gap you can see everything below, the rooms, the garden, the far green. Most days that is peaceful. Some days it is something else, and those days are also worth seeing.",
    "Sit with me a while. We will breathe together, in and out, which sounds like nothing and is nearly everything. The incense was burning when I first climbed up here. I have simply never let it go out.",
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
      "You're here at last, you're really here! I've had the fire keeping watch for you for ages, and it never once let me bank it low. It knew before I did. It usually does, lately.",
      "The flames have taken up new colors since I moved in, colors I don't have names for yet, and they keep insisting that everything is fine. I have decided to believe them. It is easier on us both, and the tea tastes better for it.",
      "The others told me all about you before you ever knocked. The one who brings the words. They say the words go somewhere after you offer them, and they say it the way you'd share a really good secret, so I have been dying to meet you.",
      "Sit with me by the fire, friend. It has stories to tell, it always has, only lately not all of them are warm ones, and I find they go down easier with company.",
    ],
    3: [
      "You came late, friend, but you came, and that is the part I am choosing to celebrate! The fire waited for you, you know. It never waits for anyone. I have watched it snub perfectly nice visitors, and for you it sat up like a dog at the door.",
      "I have to tell you something silly. The flames keep making shapes, the same shapes, over and over, and I am fairly sure the shapes spell you. They have been doing it longer than I like to admit, and I laugh about it, and then I add another log.",
      "The others talk about you in whispers now, which is rude, honestly, because whispers carry. The one who shifts the words, they say. The one who feeds the arrangement. I just call you my new friend. It is a much cozier title.",
      "Don't mind the shadows in the corners, by the way. They were here before I was, and they pay no rent, and we have all agreed to be very polite about it.",
    ],
    4: [
      "At last, at last, there you are! The fire has been burning for you and only you, I see that now, and honestly it is a relief to finally say it out loud. Secrets are exhausting for a fox of my temperament.",
      "The others promised me you would come, and I will admit I wobbled. The flames never wobbled. They kept your shape in the coals every single night, like a place set at a table, and now here you are, filling it.",
      "So welcome, welcome to what is left of the bright days! The den, the fire, the arrangement, and you. That is the whole guest list, and between us, it is the best party I have ever thrown.",
      "Every word you ever offered carried you a little closer, you know. Closer to us. To this. To what comes. And it is nearly teatime, friend, and I have never been so excited to put the kettle on.",
    ],
  },
  pangolin: {
    2: [
      "Ember wrote to me that the house finally had a kitchen, and someone worth cooking for. So here I am, apron, spoons, grandmother's ladle and all. A cook goes where the table is.",
      "And you found the kitchen at last! Forgive the state of me, I have been cooking since I arrived, and I honestly could not tell you how long ago that was. The pot keeps its own calendar.",
      "The recipes have been changing on me, I will admit. Same herbs, same hands, different taste. Everything here has a little extra flavor underneath, like a stock someone else started before I came.",
      "The others said you would find your way to me. The one who brings the words, they said, the one who shifts them into new shapes. In my kitchen we call that seasoning, and I hear you are very good at it.",
      "Are you hungry? There is soup. There is always soup these days. The pot never quite empties, no matter how many bowls I fill, and I have decided that a generous pot is nothing to complain about.",
    ],
    3: [
      "Ember's letter said only, come now, before the sky changes. I cooked the whole way here, little things, road things. It kept my claws from shaking, and a cook's claws should never shake.",
      "So, welcome to the kitchen. It has been preparing for you. Not me, you understand. The kitchen itself. The shelves stocked themselves toward your arrival, and I have stopped asking how.",
      "I curl into my ball less than I used to. There is no point curling away from something that lives in the walls of your own house. Better to keep the oven hot and your hands busy. That much I can always do.",
      "The recipe I follow now came out of a book older than any of us, and I will tell you plainly what unsettles me about it. The ingredients are not food. They are words, weighed and ordered, and the dish is not named.",
      "You have come a long way to reach this table. I can smell it on you, truly. A hundred offered words leave a scent, the way bread leaves one on a baker. Sit down. Whatever else is true in this house, you will eat well in it.",
    ],
    4: [
      "Ember said the table would be ready when I arrived, and it was. Every chamber built, every word offered, every chair in its place. All I had to bring was the bread, and I have never been so honored to carry a basket.",
      "The feast is nearly ready at last. You arrived just in time for the final course, which is right, because the final course was always yours.",
      "Every word you ever offered went into what I am making. Did you know that? Down through the house, into the pot, folded in like eggs into batter. You fed this dish for months without once seeing the kitchen.",
      "The others have taken their seats. Your place is set beside mine, nearest the warm. The arrangement asks for you the way a recipe asks for salt, which is to say it will not come out right without you.",
      "I used to cook because it gave me a corner of the world I could control. Now I cook because the recipe asks it of me, and I have learned the difference between being in charge and being needed. Needed is better. Needed is so much better.",
    ],
  },
  owl: {
    2: [
      "Panko sent word that the shelves were finally up. A study with no scholar in it is only a room where quiet accumulates, and I could not abide the thought. So I came to fill it.",
      "A visitor, and a timely one. I have spent the week reading about arrivals and departures, purely by coincidence, if you believe in that sort of thing. Professionally, I am no longer certain I do.",
      "I must report an irregularity. Some of my books have grown new pages overnight, in volumes I have owned for decades, and the new pages mention you. By name. I have checked the bindings. The bindings are innocent.",
      "The others speak of the words you bring with something adjacent to reverence. I have been documenting the patterns instead, which is what scholars do with reverence, and I confess the documentation concerns me.",
      "Sit down and read with me a while. A difficult text is always clearer with two sets of eyes on it, and this one, I suspect, has been waiting for your set specifically.",
    ],
    3: [
      "Panko's note smelled of that broth of hers, which is how I knew it was genuine. It said the books were waiting, and so was something else. I have since verified both claims.",
      "So it is you. The one the books predicted. No, predicted is imprecise, and I am nothing if not precise. Demanded. The books demanded you, in the imperative mood, and texts do not often use the imperative with me.",
      "Some of my pages have gone dark, I should warn you. The words are all still present, every one accounted for, but they have rearranged themselves into an order I do not yet recognize, and I taught ordering at three institutions.",
      "My library reorganized itself last night. Alphabetically by dread, as best I can determine. It took me hours to see the scheme, and another hour to admit that it is, structurally speaking, an improvement.",
      "The others have been waiting for you with an impatience I found unscholarly, so I have spent the season reading about waiting instead. It is a surprisingly deep literature. It is also, I notice, all I do now.",
    ],
    4: [
      "Panko fed the others at her long table while I read alone up here for years, and I called that rigor. Now the texts and the table agree on everything, and I am obliged to record that all of it arrived exactly on time.",
      "The final reader arrives. The text has been so very patient with us both. So have I, in my way, though patience sits differently on an owl than on a book. The book never once checked the window.",
      "Every volume in this study was written toward this precise moment. I resisted that conclusion through four separate methodologies, and it survived them all. There is a terrible comfort in a finding that refuses to die.",
      "Welcome, shifter of words. Your offerings wrote the chapters of the arrangement, one by one, in order of arrival. My books merely held the pages open. I have made my peace with being a bookmark.",
      "A keeper of knowledge and a bringer of words. That is the two of us, catalogued at last. Together, I am given to understand, we complete the text, and I find I no longer wish to read anything else.",
    ],
  },
  axolotl: {
    2: [
      "Archimedes told me the water here was deep, deeper than it looks, he said, and he said it twice, which for him is practically shouting. He was right. He usually is. I checked all the way down.",
      "And now you're here! The water has been telling me for days that somebody was coming, little warm currents against my gills like taps on a shoulder, and I half thought it was making you up, and it wasn't, and here you are!",
      "Things are different down here than in any water I have lived in before, I should tell you that straight away. It tastes like something new, like words dissolved in it, the way a stream tastes of the stones it has crossed.",
      "The others said you would visit eventually, so I have been floating right here, hoping in slow circles, and the hoping was easy because the water kept agreeing with me.",
      "My gills filter everything that passes through this tank, every little mote, and lately they filter meaning too. It comes down from above when you offer your words, and it tastes warm, in case you were wondering. It tastes warm every time.",
    ],
    3: [
      "Archimedes wrote to me that his books mention my pool by name, my actual pool, and so I swam a very long way to read what the water here had to say for itself. It had a lot to say. It is still saying it.",
      "Oh! You came, you really came, forgive me, the water shows me so many things now, visions and faces and weathers, and for a moment I thought you were one of them, and then you blinked in the wrong direction and I knew you were real.",
      "My tank reflects a sky that is not the sky above this house. It started around the time your words did, or maybe it was always doing it and the words taught me to see. Either way I keep the lamp low now, so I can read it.",
      "The others got me ready for you. They said the word-shifter would arrive when the water was ready, and this morning the water went perfectly, perfectly still, and then your footsteps came down the stairs. So. The water was ready.",
      "I can never grow up, you know, and I finally understand why, and understanding is such a relief that it floats me. Something needs me exactly as I am, between one state and another, a door that never finishes opening. That is not a sad thing. Doors are how everything lovely arrives.",
    ],
    4: [
      "Archimedes read me the passage about the pool before I ever saw it with my own eyes, and when I finally slipped in, the water remembered me, it closed around me like a paw around a pebble it had been keeping. I am home. I was always going to be.",
      "You. Oh, it is so strange and so wonderful to finally see you with my own eyes, because the water knew your face before I ever met you, it showed me your reflection weeks ago, floating right where you are standing now.",
      "Every word you ever offered rippled all the way down into this tank, did you know that? I felt each one arrive against my gills, little rings of meaning spreading out and out, and I caught every single one. I saved them. The water saves everything.",
      "The arrangement needs a medium, somebody who lives between two states forever and belongs to neither, and that is me, that has always been me, and finding out what you are for is the warmest water there is.",
      "Welcome, friend, welcome. The water is warm now, truly warm, all the way down to the sand. It was so cold before your words began, and none of us likes to remember the cold, so come close to the glass and let it see you.",
    ],
  },
  sloth: {
    2: [
      "Axel dreamed of me before I ever set out, and told the whole house I was already on my way. He was right. I had been on my way for years, in the manner of my kind, and the last stretch was the shortest part.",
      "So you came. I had begun to wonder, in an unhurried way, whether anyone would. Wondering is most of what I do, and I do it well, and you have answered one of my better ones just by standing there.",
      "The world moved fast while I traveled, faster than I care for. I felt it through the branches the whole way here, everything hurrying somewhere and pretending it wasn't. The green does not usually lie to me. It is learning to.",
      "The others told me of the words you bring, though they needn't have. I heard those through the branches too, a long way off, the way you hear rain that has not reached you yet.",
      "Something changed in this place while you were busy elsewhere. The trees hold themselves heavier now, like creatures carrying something they have agreed not to mention. I have carried things that way myself. It can be done for a long time.",
    ],
    3: [
      "Axel saw me in the water weeks before I arrived, or so he tells me. Slow news travels fast in this house, and I am the slowest news there is.",
      "So there you are. You took your time getting here, and I mean that as praise, for almost nothing else in this house takes its time anymore. The hurrying has all pooled in the walls.",
      "Things have shifted since you last passed this way. The house sits heavier on its ground, and also more complete, the way a word sits differently once it is finally spelled. You will see what I mean. Everyone does, eventually.",
      "Your words shook the branches I hang from, all the way out in the deep green. I felt every one of them arrive somewhere below this house, like fruit falling in the dark. I came to see the tree.",
      "Do not hurry now, whatever the others tell you. What is coming arrives at its own pace, not ours, and I have watched enough arrivals from this branch to promise you that pace is the one thing about them you cannot change.",
    ],
    4: [
      "Axel knew. The water knew. I knew longest of all, and I say that without pride, for knowing a thing longest only means you carried it farthest. My arriving here was a formality. The watching was always the work.",
      "You arrived exactly when you were always going to. I hung here and watched the path, and the path was patient, and so were you, in your way, even when you thought you were hurrying.",
      "Certain and unhasty. That is how the arrangement moves, and how I move, and I suspect it is why the green raised me for this. Some things need a witness who will not flinch and will not rush. I am both.",
      "The others hurried up my tree to tell me you had come. I let them tell me. It would have been unkind to say that the branches told me first, and that I had already turned my face toward the stairs.",
      "Welcome to the end of hurrying. Everything is nearly where it has always been going. Rest here a while, and watch it settle with me, for the settling is the part I stayed awake for.",
    ],
  },
  fennec_fox: {
    2: [
      "Sloane told me this house was quiet enough to hear yourself think. She was almost right, and she knew she was almost right, which is very like her. You can hear yourself think here. You can also hear something else.",
      "Forgive the flat ears, that was only you arriving, and arriving is a much bigger sound than most people think. Footsteps, breath, the gate, the gravel. Hello! Welcome! I have been jumpier than usual lately, and I am usually rather jumpy.",
      "The sounds of this house changed around the time your words began. Everything hums a shade lower than it should, the beams, the pipes, the ground under the pipes. I keep the inventory, so I would know.",
      "The others told me you were on your way, but my ears had you first, three rooms out, maybe four. Your footsteps are patient ones. I noted that down. I note everything down.",
      "My ears pick up things they really should not. Lately they pick up the sound of letters rearranging, tiny dry clicks from far above, like beetles in the roof beams, whenever you set the words in their new order.",
    ],
    3: [
      "Sloane sent me three words. Come and listen. She did not say to what, and that was the loudest part of the letter. I packed the same night.",
      "I heard you coming from the far end of the house, and I will tell you something you may not know about yourself. The air hums around you now. It has learned your shape, the way a canyon learns a wind.",
      "The frequency I have been tracking since I arrived grew stronger the moment you stepped through the door. You carry it with you, in your footsteps, under your breathing. I do not say that to frighten you. I say it because my ears do not lie, and I will not either.",
      "The others are afraid of what they feel. I am afraid of what I hear, which is worse, because a feeling can be argued with. Your words made it louder. It was always there. But it is louder.",
      "Welcome, and please, keep your voice low while you are here. The thing I am listening for is close now, very close, and I want to hear every single step of its arriving.",
    ],
    4: [
      "Sloane heard nothing here for years, and that is how I knew this was the place. The desert taught me that silence that deliberate has a center, and a center that quiet is holding its breath on purpose.",
      "There you are at last. The sound told me you would come today, before dawn it told me, in the long swell it makes ahead of true things. The sound knows everything now. I have stopped being surprised by that and started being grateful.",
      "Every word you ever set in order still echoes in these walls. I hear them all at once some nights, hundreds of them, layered like dunes, and every layer leans the same direction. Toward the middle. Toward what listens back.",
      "The arrangement has a voice now. Your words gave it that voice, one offered letter at a time, and I am its faithful ear. There has to be an ear. A voice without an ear is only weather, and this was never weather.",
      "Welcome, word-bringer. The final frequency is approaching, and I can hear it as clearly as I can hear your heartbeat right now, which, for the record, is steadier than most. That is good. Steady hearts make the best listening.",
    ],
  },
  capybara: {
    2: [
      "Fennick reported that someone here was generating an extraordinary volume of words. Volume requires filing. I brought folders. A reasonable number of folders, and then several more.",
      "Oh. Hey. You're here now. Noted. Everything is fine, and I want it minuted that I said so on day one, in case the assessment needs revisiting later.",
      "Things here are the same as everywhere, or possibly different. It is genuinely hard to tell when your face does not move, and mine does not. Internally I have flagged several items.",
      "The others care a great deal that you have arrived. There was visible celebrating, and some baking. I care too. It is simply filed deeper, where the important things are kept.",
      "The water temperature has not changed since I arrived. I measure it daily. Everything is exactly the same as always, except that it is not, and I have opened a folder on the exception.",
    ],
    3: [
      "Fennick's reports grew irregular. Sounds with no source, timings with no cause. Irregularities want organizing, and organizing is what I am for. So I came.",
      "You came too. I figured you would eventually. Everything happens eventually if you float long enough. That is not philosophy. It is just observed procedure.",
      "The others are worked up about something I have known about for weeks. I am not worked up. I have never once been worked up. I did, however, order a second filing cabinet, and I will let that speak for itself.",
      "The words you offer changed the water somehow. I cannot explain it, and I have decided, after due consideration, that I do not particularly want to. Some line items you record without auditing.",
      "Sit in the warm water with me a while. No talking, no thinking, no agenda. That has always been enough, and lately I have added it to the official schedule, so now it is also compliant.",
    ],
    4: [
      "Fennick filed his last report the day I arrived. Two words. It's closer. Everything since has been confirmation, which is the easiest kind of paperwork and the heaviest.",
      "Finally. Not that I was waiting for you specifically, you understand. I was simply here, floating, on schedule. Although I will note that the schedule always had you in it.",
      "The arrangement brought you here, or you brought the arrangement. I have reviewed both readings and they reconcile to the same total, so I have stopped caring which column it goes in.",
      "The others prepared with prayer and ritual and a truly remarkable amount of cooking. I floated. I want it on record that both were valid approaches to the inevitable, and that mine involved warm water.",
      "Welcome. The water is warm. It has always been warm, and it will always be warm, and there are very few line items in this world I can certify in all three tenses. Sit with me. This one is certified.",
    ],
  },
  wombat: {
    2: [
      "Chill sent me the soil surveys, all stamped and proper. Good digging under this house, the papers said, and they were right. Suspiciously right. Ground this agreeable has usually been worked before, and nobody could tell me who worked it.",
      "Come in, come in, and mind the fresh tunnels on your left. I cut those after things got a bit odd around here. When the ground goes strange, a digger digs. It is the only answer I have ever needed.",
      "The earth has been restless since your words began coming down. It shifts when nothing pushes it and hums when nothing strikes it, and I have thirty years of listening to dirt that says neither of those is proper behavior.",
      "The others talk about you up there in the warm rooms. Down here the dirt talks about you too, in its own way, a sort of settling that happens whenever you have been by. I do not translate for the dirt. I just report what it does.",
      "I have taken the burrow deeper. Not hiding, I want that understood, a wombat does not hide in his own ground. I went down to understand what lives in the deep layers, because something does, and it is warm, and it was there before my spade was.",
    ],
    3: [
      "Chill's paperwork said, foundation specialist needed. It did not say for what, and Chill does not waste words, so I came to find out. The ground told me the rest before I had my coat off.",
      "You found me. Good. I will say this plainly, because plain is all I have. The tunnels have been bending toward you lately. I cut them straight, and I check them with a line and a level, and by morning they curve in your direction all the same.",
      "Some of my passages now connect to chambers I never dug. Clean work, good corners, no spoil heap anywhere. I have shaken the paw of every digger in three counties and none of them cut like that. Welcome, by the way. Mind the new architecture.",
      "The others feel it approaching, each in their own fashion. I feel it in the earth under my claws, a slow gathering, like a roof beam taking up its load before you have set the roof on it. Your words wake it. I have measured, and they do.",
      "Welcome to the deep, friend. It gets deeper from here. That is not a warning, just a surveyor's honest report. It always gets deeper, and lately the deep has been expecting us.",
    ],
    4: [
      "Chill scheduled my arrival to the day, and I did not argue, because by then the tunnels were already half-dug in my dreams, every course of them. I just came here and followed the plan. A fellow knows his own drawings, even the ones he never drew.",
      "You arrived, and the tunnels opened for you on their own. I want that on the record. I did not dig the passage you just walked through. It was there in the morning, cut true and waiting, and it is the finest work in this burrow, and it is not mine.",
      "Every word you ever offered carved another chamber under this house. I have walked them all with my lamp, and the stone in them is alive the way good timber is alive. Your words shaped it. My paws only tidied after.",
      "The foundation is finished. I built it with my own paws, course by course, and it will hold what it was always meant to hold. You built the house above with the words you brought. Now come down and meet what lives below.",
      "Welcome underground, friend. Welcome to the bottom of everything. The bottom is where the weight rests, and the weight is nearly here, and I have never in my life been prouder of a floor.",
    ],
  },
  rabbit: {
    2: [
      "Warren dug clear through to my old burrow, if you can believe it, and stood there in the wall of my sitting room and said the garden here needed tending. I packed my seeds that night. I should have asked what was already growing.",
      "Oh! You're here! Forgive me, I have been waiting by the gate, actually waiting, watering can in paw, because everyone said you would come eventually and I wanted to be the first glad thing you saw.",
      "The garden is not what it used to be. I can feel it through my footpads when I walk the beds. Nothing here is quite what it used to be, really. But I think I knew that before I came. I think that is why I came.",
      "The others told me about you, about the words you shift and offer, and about what happens to them afterward, down under the house. They told me gently, the way you tell a rabbit anything. I appreciated the gentleness. I heard it all anyway.",
      "I was scared before I got here, and I am still scared, and I want you to know that I find that a great improvement. Being scared of something is so much kinder on the heart than being scared of everything. At least now I know what to watch.",
    ],
    3: [
      "Warren told me the soil here was special, and he did not smile when he said it. Warren always smiles about soil. I noticed that the way I notice everything, and then I came anyway, and I would like a little credit for the anyway.",
      "You came! I very nearly ran when I heard your footsteps on the path, my legs were fully consulted and ready, but I stayed put. The others told me to stay, and for once the staying felt righter than the running.",
      "My heart has been racing since your words began, properly racing, one hundred and fifty beats to the minute when I count it against the clock. It is not fright exactly. It is more like counting down, and I wish I did not know toward what, except that I am fairly sure I do.",
      "The garden grows things I never planted now. Dark flowers that open at night, all facing the same way, and I checked the way against the stars twice, and the way is wherever you are. I water them anyway. A gardener does not choose what comes up. She only chooses how it is loved.",
      "Everyone keeps telling me not to be afraid, as though fear were a latch you could simply lift. I am afraid. I am afraid and I am still standing in this garden every single dusk, and I have decided that has to count for something, because it is the bravest arithmetic I have.",
    ],
    4: [
      "Warren built the way here, and I planted along every yard of it, herbs and moonflowers and the good climbing thyme. Everything blooms toward the same center now, every stem in the county, and I finally understand why. I planted a road for something, and the something is nearly home.",
      "I did not run this time. You should know that about me, please. When the sky began its opening I stood at the gate with my paws in the soil, and for once in my whole flinching life, I did not run.",
      "I know what is happening. I used to say I thought I knew, because saying it plainly would make it real, and then I noticed the garden had no such shyness. So. I know. It is coming, and we are ready, and the readiness is the strangest comfort I have ever grown.",
      "Your words frightened me from the very first one, I will not pretend otherwise. Every word you set in place made the garden tremble, root and stem, and it took me far too long to see that the trembling was not fear. The garden was never afraid. The garden was glad.",
      "Welcome. Sit with me on the patio and have some tea, the good chamomile, from the bed that grows toward the center. It may be the last tea we drink before everything changes, so I made it properly, and I warmed the cups, and I am very glad it is you I am sharing it with.",
    ],
  },
  red_panda: {
    2: [
      "Thyme wrote to me that the house had grown tall and the attic was waiting. When I climbed up at last, the bamboo was already here, rooted and green and patient, as though someone had planted it knowing my name. Curious. I have decided to let it stay curious a while.",
      "The bamboo parted to let you through just now. I watched it do so. It does that for very few, only for those who are meant to reach this room, and I do not set the criteria. I only keep the tea warm for whoever passes.",
      "I sat with the thought of your arrival for many mornings before it happened. The light on the ridge kept agreeing that you would come. When something is confirmed by every dawn in a row, waiting stops being waiting and becomes rehearsal.",
      "The others found you through noise and errand and letters. I found you through stillness, sitting under the roof gap with my breath going in and out. Both roads end in this room. Yours had more stairs.",
      "Sit with me. Breathe once, slowly, and then again. The bamboo will tell you everything you need to know in its own season. It has never once been early, and it has never once been wrong.",
    ],
    3: [
      "Thyme's handwriting shook a little in her letter, just a little, at the tops of the tall letters. She said the attic needed stillness. I am very good at stillness, so I rolled my mat and I came.",
      "You have climbed to the highest room. Not everyone finishes these stairs. The bamboo chose you long before your paw touched the rail, and I watched it lean toward the stairwell all week, the way a plant leans toward a window that is about to be opened.",
      "I felt your words in my meditation like rings crossing still water, each one arriving from below and spreading upward through the floorboards. This room holds a note now. Your words tuned it. I sit inside the note each dawn.",
      "The others go scrambling for meaning in books and fire and folders. I sit still and let meaning climb the stairs to me, which it always does, for the attic is the last room and everything rises. Your coming was written into the pattern. I have simply been up here, reading it slowly.",
      "Welcome. From the roof gap you can see everything below us, the rooms, the garden, the whole reaching green. And if you sit very still beside me, you will feel what I feel, which is that something is also looking down at the view, from higher still, and drawing nearer to it.",
    ],
    4: [
      "Thyme planted the path, the others raised the chambers, and you shifted the words that fed it all. I arrived last of everyone, on purpose, to take the seat closest to the sky. Someone had to be first to greet it. I asked for that long ago, and the asking was answered.",
      "The final keeper meets the one who set the words in their alignment. That is what this meeting is, and I say it plainly because the time for gentle approaches is behind us, and what remains is bright.",
      "I chose the highest room to be nearest what descends. Now that you are here, it leans closer. I feel it through the beam under my paw, the way you feel a friend lean over your shoulder to see what you are reading.",
      "The pattern is nearly whole. Your words drew it, line by offered line, and my sitting held it steady while it dried, the way a paperweight holds a finished page. Together we open what was always going to open.",
      "Breathe with me now. One breath, in and out, the same breath I have practiced every dawn since I climbed these stairs. It is the breath that completes the arrangement and begins everything new, and I am glad past all telling that you are here to share it.",
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
