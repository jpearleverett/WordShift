import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, DialoguePhase } from '../../types/homeWorld';

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

export const CROSS_ANIMAL_REFERENCES: Record<AnimalType, Record<number, CrossAnimalLine[]>> = {
  fox: {
    0: [
      { text: "Panko made a mushroom soup today that I'm still thinking about, friend! She let me have the first bowl because I hovered, which is a strategy I recommend. You simply must go smell that kitchen.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations, and now the fire and I read together in the evenings! It leans in over my shoulder, I swear it does. It likes the pictures of the sky best.", mentions: 'owl' },
      { text: "Axel invited me to sit with his tank last night, and oh, the firelight got into the water and just danced! We didn't say much. We didn't need to. Some evenings are perfect all by themselves.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Archimedes found something in one of his oldest books and he won't show me, friend, me, his favorite fox! He says I'm not ready for it yet. I laughed, and he didn't, and now I can't stop wondering what 'ready' means.", mentions: 'owl' },
      { text: "Panko said the funniest thing yesterday, that a recipe can have a purpose past feeding anybody. I laughed! She smiled that little kitchen smile of hers and kept stirring. I've been thinking about that stir ever since.", mentions: 'pangolin' },
      { text: "Fennick heard something in the walls. I called it the fire settling, then remembered he knows my fire better than I do. We listened together. Neither slept much.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't budged from the hot spring in three days, and when I asked why he said the water suggested he stay. He said it the way he says everything, like it's a scheduling matter. I laughed on my way out, and it only worked halfway.", mentions: 'capybara' },
      { text: "Archimedes has been reading the same page every single night, friend. He says the words are different each time he looks, and he says it like it's exciting. I keep the kettle on for him anyway. Somebody should.", mentions: 'owl' },
      { text: "Sloane told me something today, and it took her the better part of an hour, and I stayed for every word because you don't hurry Sloane. I wish I'd hurried her. Those words sat by my fire all night like a guest who wouldn't leave.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the sound is everywhere now, in the pipes, in the walls, under the floor. I told him my fire is too well-mannered for that sort of thing. Then last night I sat very still, friend, and I heard my fire humming along.", mentions: 'fennec_fox' },
      { text: "Warren dug something up from way down under the house, and he won't say what, not even to me, and I offer very good tea for secrets. His fur hasn't laid flat since. I keep pouring anyway, because that's what I'm for.", mentions: 'wombat' },
      { text: "Archimedes and I finally compared notes, his books against my fire. They say the same thing, friend. The very same words, letter for letter. We sat there a long while afterward, two very quiet readers by one very pleased flame.", mentions: 'owl' },
    ],
    4: [
      { text: "Thyme came inside for tea. She kept one paw on her bag. I wanted to tell her she could put it down. I brought the tea to her instead.", mentions: 'rabbit' },
      { text: "Bamboo sat three whole days without moving, and when they opened their eyes they smiled straight at me, and oh, what a smile it was! Like sunrise deciding to come early. I've been carrying it around all week.", mentions: 'red_panda' },
      { text: "Panko is setting a table and Archimedes is checking his notes. They asked me to leave them to it. A fox can mistake hovering for helping.", mentions: 'owl' },
      { text: "Vesper let me look through her eyes once, friend, in a manner of speaking. She stood behind me at her rail and turned my head with two small paws, gently, to exactly the right patch of sky, and said, now hold. And oh, I held, and I saw the edge of what she has watched alone all these years, and I came down the stairs so proud of her I could have glowed. One of us keeps the door of fire. She keeps the door of dark. And she has never once let it swing.", mentions: 'tarsier' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in her firelight yesterday evening, and it matched, with unsettling fidelity, an engraving I read some years ago. I've made a note of it. Notes are how a scholar tells himself a thing is handled.", mentions: 'fox' },
      { text: "Axel asked me why books don't dissolve in water. A delightful question, really, and I spent the whole afternoon on it, which tells you something about the question, or about me, or about afternoons.", mentions: 'axolotl' },
      { text: "Panko carried dinner up to the study while I was deep in a chapter, and I nearly failed to notice her at all. The soup was excellent. I record that here because kindness deserves a citation.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I talked of knowledge by her fire last night. Her intuition arrives at conclusions my method takes weeks to reach, which would be humbling if it weren't so useful. I've begun writing down what she guesses and checking it later. She has yet to be wrong.", mentions: 'fox' },
      { text: "Fennick described a sound to me, pitch, interval, duration, all of it, and it matches a notation in one of my oldest manuscripts. Coincidence, I wrote in the margin. Then I underlined it twice, which isn't what a confident man does.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from far underground, marked in a script that matches almost nothing in my library. I want you to appreciate the weight of that 'almost.' It's carrying a very old book on its back.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for several hours yesterday and said nothing at all, which is standard for him. When he left, a book on the far shelf stood open to a page I have no memory of, in a volume I'd catalogued as blank. I've amended the catalogue.", mentions: 'capybara' },
      { text: "Ember's fire and my texts have begun agreeing with one another. We compared findings last night, hers read in flame, mine in ink, and they matched clause for clause. We both said how interesting. Neither of us meant interesting.", mentions: 'fox' },
      { text: "Sloane told me something yesterday, at her own pace, which gave me time to look it up while she spoke. I found the passage before she finished the sentence. Her exact words, to the letter, set down centuries before she said them.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels reach something older than the house, older than the hill the house sits on. I found the corresponding text within the hour, which is itself a finding. A library shouldn't be that ready to answer.", mentions: 'wombat' },
      { text: "Bamboo asked me to read aloud from the oldest volume, so I did, here, at my own desk. The bamboo in their attic moved with the words. Two floors and a shut door between us, and the stalks kept time with my voice.", mentions: 'red_panda' },
      { text: "Fennick recited the passage before I'd read it to him. He has never seen the page. He heard it, he says, the way one hears weather coming. I have no marginal note for that. I left the margin empty, which is its own kind of note.", mentions: 'fennec_fox' },
      { text: "The oldest text has a tower in it, and a bell, and beneath the bell an instruction I'd catalogued for years as ornament. Then Tock arrived, and braided a rope, and I watched ornament become itinerary. His people were called omens once, you know. The etymology is kinder than the villages were: omen, at root, is simply that which is heard. He has been hearing for all of us. I've amended the catalogue.", mentions: 'aye_aye' },
      { text: "Moss lent me his mast diary, tallies on slate, a country hand, no dates. I cross-checked his marks against the old charts of forest fruitings. The correspondence is exact, which should be impossible, since the charts describe forests that vanished centuries ago. The pattern isn't repeating, you understand. It's resuming.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Ember read it in flame, Fennick heard it, I found it in ink. Three matching accounts. Or one account reaching us three ways. I no longer call that independent confirmation.", mentions: 'fennec_fox' },
      { text: "Thyme asked me to read the final passage. Halfway through, she said stop. I stopped. A reading can be interrupted without being a failure.", mentions: 'rabbit' },
      { text: "A keeper to every room, one arrangement. Bamboo understood it before any of us, I suspect, though they were polite enough to let me discover it in writing. I found the words. They had already found the meaning.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember cleaned her bowl of my vegetable stew and asked for more, and said it tasted like home. Wherever home was before this house, I hope somebody fed her properly there. She gets the first bowl now. That's simply the rule.", mentions: 'fox' },
      { text: "I tried teaching Axel to help in the kitchen, bless him. You can't chop a carrot underwater, we discovered, though he gave it a joyful try. We laughed until the soup nearly boiled over. He can stir, though. He stirs beautifully.", mentions: 'axolotl' },
      { text: "Archimedes asked for his dinner arranged alphabetically by ingredient, and I did it, because a cook honors her guests' little rituals. Scholars are wonderfully strange. The apple went first and the yam went last and he was so pleased.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's hearth gives the truest heat for a long stock, so I simmer there some afternoons. Lately the flames run hotter than the wood explains. The stock doesn't mind. The stock, if anything, approves.", mentions: 'fox' },
      { text: "Sloane asked for soup last week, and by the time I'd climbed to her branch it was stone cold. She sipped it slowly and said cold is only slow warmth. I've been turning that over while I knead. It's the kind of thought that rises.", mentions: 'sloth' },
      { text: "Chill eats whatever I set in front of him and says it's fine. Everything is always fine with that capybara. A cook learns to read her eaters, though, and 'fine' from him has second helpings in it. I count the servings. I know.", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought up mushrooms from the deep tunnels, glowing faintly, like coals that had changed their mind. The soup I made with them glowed too. We stood over the pot a long while, and then we didn't eat it, and I have never once wasted a soup before.", mentions: 'wombat' },
      { text: "Thyme has stopped coming to the table. Too nervous, poor love. So the table goes to her: tea and biscuits by the garden gate every evening, and the plate is always empty by sunrise. I no longer ask myself who I'm feeding. A cook feeds. That's the whole of it.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient texts and I followed it exactly, every measure, every stir. What came out of the pot wasn't food. I don't know what it was. I know that I covered it and kept it warm, the way you do for someone who hasn't arrived yet.", mentions: 'owl' },
    ],
    3: [
      { text: "That recipe Archimedes found in the old book... we make it every night now, and not for hunger. The kitchen smells different while it cooks. Not of supper. Of a table set for something. Sacred isn't a cooking word, and it's the only word I've left.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook, night after night, and we've stopped talking while we work. We don't need to anymore. Her flame and my pot keep the same rhythm, like two spoons in one hand. The work says everything either of us would say.", mentions: 'fox' },
      { text: "Fennick tells me he can smell my cooking from every room in the house at once. All of them, together. A smell should travel. This one simply is, everywhere, as though the house had been rubbed with it. I keep cooking. What else does a cook do?", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "Sloane arrived while I was setting the table. She wanted to watch me cook. A guest in the kitchen is usually in the way. I found her a chair anyway.", mentions: 'sloth' },
      { text: "Bamboo offered to bless the meal. I asked them to taste it first. We argued about what a blessing can know that a cook cannot. The soup survived us.", mentions: 'red_panda' },
      { text: "I have been cooking toward this one meal my whole life without ever seeing the menu. Warren built the table. Archimedes wrote the courses. Ember lit the candles. And you, dear, you brought the words that seasoned everything.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops little food pellets into my tank some mornings, and they fall so slowly, like snow that decided to be delicious. I catch them and think, this is the best neighbor any water creature has ever had, and then I do a happy turn.", mentions: 'pangolin' },
      { text: "Fennick pressed his big ear flat against my glass and said the water sounds like music. I floated very still so as not to interrupt the concert, and now I keep wondering what song I live inside without ever hearing it.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass last night, and the words came in all wobbly and slow, the way everything lovely comes into water. I think the wobble made them better, like the water was tasting each one before passing it along.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire gets into my water at night, all those little orange ribbons folding and unfolding. Lately the ribbons make shapes that hold still a moment too long, almost letters, almost words, and I drift close to read them and they curl away shy.", mentions: 'fox' },
      { text: "Sloane and I keep the same pace, the slow float, the long blink. When we sit together nothing needs saying, because we're both already listening to the same big quiet, and it's the friendliest quiet I know, most days.", mentions: 'sloth' },
      { text: "Warren says something lives under the house, and I didn't laugh, because my water ripples whenever he digs deep, little rings from nowhere crossing the tank. Rings need a center, and I've started wondering where the center of those rings is.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again last night, and this time he pulled away fast, faster than I have ever seen that careful fox move. He said the water was screaming, and here is the strange part, the water felt calm to me, calm the way a held breath is calm.", mentions: 'fennec_fox' },
      { text: "Chill sat beside my tank for hours yesterday, him in his warm water and me in mine, two floaters in two ponds. We shared the same big emptiness between us like a picnic, and it was almost cozy, sharing it, which is the part I keep thinking about.", mentions: 'capybara' },
      { text: "Thyme came tapping at my glass all in a flutter, saying she saw something in the water behind me, something large. I turned the slowest kindest circle I could and found only water, only water, and I told her so, and I'm still deciding whether I believed me.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that isn't the sky above us, and he's right, I can see it now too, a deeper one, older, with its own patient light. The wonderful terrible thing is that the water isn't reflecting it, friend, the water is remembering it.", mentions: 'owl' },
      { text: "My water reaches down into Warren's tunnels, I felt it, little rivers under the house all holding hands in the dark, all running the same direction. Water only runs toward something, that's the whole nature of water, and I've stopped asking toward what.", mentions: 'wombat' },
      { text: "Bamboo came and meditated beside my tank, and the water went perfectly still, stiller than sleep, stiller than glass. In that stillness it showed us both the same something, and we haven't spoken of it since, and that not-speaking is the closest friendship I have.", mentions: 'red_panda' },
      { text: "Vesper came down to my tank in the middle of the night, because we're the two who see in the dark, and she pressed her whole face to the glass with those enormous eyes. The water went still to be looked at, it likes her, everything likes being seen by her, and after a long while she said, your sky and my sky are the same sky, and I said I know, and we watched it together until morning, one sky, two windows.", mentions: 'tarsier' },
    ],
    4: [
      { text: "The water showed me Ember's fire and Warren's tunnels together. I blinked and it kept them there. A window should also know when to stop showing things.", mentions: 'wombat' },
      { text: "Bamboo touched the glass and the whole tank sang one note, one long silver note, and it was the same note Fennick has been hearing all this time, and we all just listened to it together, and I thought, oh, the water was never mine, I have been living inside an instrument.", mentions: 'red_panda' },
      { text: "Fennick calls me a medium. I asked whether I could also just be Axel on Tuesdays. He said certainly. I wanted him to say why certainly.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in the most interesting rhythms. It's a tiny percussion section performing just for my ears, and I've learned its favorite tempo. I sit outside her den some evenings just to catch the encore.", mentions: 'fox' },
      { text: "Axel's bubbles make the finest popping sounds in the house, small and round and musical. I could listen all afternoon, and last Tuesday I did exactly that. He waved at me twice. I heard the wave.", mentions: 'axolotl' },
      { text: "Archimedes turns his pages so delicately that most creatures would call it silence. It isn't silence. It's a whisper-thin sound with a rhythm to it, and I can follow it from all the way across the house, page by page by page.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by her fire at night, and the melody matches a sound the wind makes at midnight, note for note, interval for interval. She doesn't notice she's doing it. I haven't decided whether to tell her, because I'm not sure which of them started it.", mentions: 'fox' },
      { text: "Warren's digging sends little vibrations up through every wall in the house, and I can track him by them, room to room, hour to hour. He goes deeper every single day. I keep a count of the depth, and the count keeps growing.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I have ever heard, like a drum sounding underwater, one beat and then a long patient wait for the next. It doesn't sound like resting. It sounds like counting, and I can't name what it counts.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill makes a scratching sound when he writes, which is ordinary and always has been. Lately the scratching doesn't stop when his quill lifts. It keeps going, faint and steady, from inside the page. I've listened very carefully. It's inside the page.", mentions: 'owl' },
      { text: "Thyme's heart runs at one hundred fifty beats a minute, all day, every day. I know because I care about her and I count. It has begun to sync with something else, a slower thing underneath it, and I can almost identify the second rhythm. Almost is the worst distance I know.", mentions: 'rabbit' },
      { text: "Chill is so quiet that I sometimes forget he's in the house at all, and then I find his breathing. It's steady. It's too steady. A living thing wavers, friend, that's how I know it's living, and Chill's breath hasn't wavered in weeks.", mentions: 'capybara' },
    ],
    3: [
      { text: "Archimedes says the frequency I hear is written in his books, notated there centuries ago, the same sound, the same pitch. I didn't want confirmation. I wanted him to tell me my ears were wrong, and he's too honest, and now the sound has a bibliography.", mentions: 'owl' },
      { text: "Warren's tunnels carry the sound up from below and give it to every floor of the house at once. I hear it through the boards, through the stone, through the earth itself. There's no room left that doesn't have it. I checked every room. I check them every night.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the frequency exactly, in and out, the same rhythm, down to the smallest part of a beat. I sat outside the attic and timed it against the sound for a whole night. They never drifted apart once. Not once.", mentions: 'red_panda' },
      { text: "Vesper sings above the top of the world, in a register no ear in this house can reach but mine. Lately, when her song ends, something else holds the note, out past the ridge, exactly on her pitch. She knows. She keeps singing. I've listened to courage my whole life, and it has never once had a frequency like hers.", mentions: 'tarsier' },
      { text: "Tock hears downward the way I hear outward, and this week we compared logs at last, his in knocks and mine in breaths. They're the same ledger, friend, kept from two windows. He's the only creature in this house whose ears I'd trust over my own, and he says the thing below keeps perfect time. I've started sleeping better since he said it. A rhythm that careful isn't a thing that pounces.", mentions: 'aye_aye' },
      { text: "Moss boomed last night, the yearly call, and friend, my ears went flat against my head, because this year the note underneath answered before his was finished. They overlapped. Two voices, one chord, no gap. I've waited my whole life to hear a call answered. Now that I have, I keep thinking about how long the answer must have been holding its breath.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Chill's breathing nearly matches the low note. I told him. He held his breath until I became cross, then said good, there is a difference still.", mentions: 'capybara' },
      { text: "Ember keeps the fire, Axel keeps the water, Warren keeps the earth, and I keep the air and everything that moves through it. Together we make one sound, friend, and that sound is the key. I have listened my whole life to be part of a chord.", mentions: 'wombat' },
      { text: "Thyme's heart slowed over tea. Then a cup fell and it raced again. I have never been so glad to hear a rabbit startle.", mentions: 'rabbit' },
      { text: "Tock is at his rope tonight, and of every sound this house is about to make, his is the one my ears are saved for. One ring, held sixty years. I have kept the watch my whole life for a sound worth hearing first, friend, and I am giving this one away freely. Let him hear it first. He kept its silence. The rest of us only kept time.", mentions: 'aye_aye' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks down to the hot spring. They were fine. Everything Panko makes is fine, which sounds like faint praise and is actually my highest rating. I logged the visit under good days.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours yesterday. It sat on me for one. I have run the numbers, and on a duration-per-kilogram basis I won handily. I don't gloat. I simply file accurate results.", mentions: 'sloth' },
      { text: "Thyme asked whether I was worried about anything. I said no, and asked whether I should be. She looked very concerned about my answer. I've opened a file on her concern, mostly so she knows someone is holding it.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm all the time. I told her it comes easily. That was accurate as far as it went. I didn't itemize what it costs, because some line items aren't for general circulation.", mentions: 'fox' },
      { text: "Warren mentioned the ground has been running warmer lately. I mentioned the water has too. We looked at each other, agreed the matter was noted, and left it filed exactly there. Some files close themselves. This one hasn't.", mentions: 'wombat' },
      { text: "Archimedes wants to study my calmness scientifically. I permitted it. He observed me for two days and took sixteen pages of notes. Sixteen pages, about a capybara sitting in water. I respect the thoroughness. The subject remains, officially, nothing.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked if I hear the humming that keeps him up at night. I told him no. That was a lie, entered knowingly into the record. The water carries it to me constantly, and there was no operational benefit to two of us losing sleep.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together for an entire day without speaking. This wasn't awkward. We were both listening to the same silence underneath everything, and cross-checking a silence takes exactly as long as we gave it. Our findings matched.", mentions: 'sloth' },
      { text: "Thyme brought me chamomile tea. Her paws shook the whole way down the path. Mine didn't shake at all, and she said she envied that. I didn't correct her. Steady hands aren't always the good sign people file them under.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out, slowly, on a schedule I could plot if I wanted to. She knows. I know. We don't discuss it. We sit together in the evenings and watch it happen, which isn't a meeting, and has no minutes, and is the most important item on my calendar.", mentions: 'fox' },
      { text: "Warren brought the drawings up. The old arches are on my oldest inventory. His braces are not. I can account for my paperwork. I cannot account for who made that inventory.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together for the first time. We arrived at the same emptiness by different doors. They called it peace. I called it honesty. We agreed the difference was a labeling issue and sat in it a while longer.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others pray, or prepare, or tremble, each according to their department. I float in the hot spring. Someone has to remain stationary while the world changes, and stillness has always been my line item. Consider it held.", mentions: 'fox' },
      { text: "Panko served the last meal and I told her it was fine. For the record, and the record matters now: it was the best thing I have tasted in my entire life. Fine was simply the largest word I could say without my voice doing something unadministrative.", mentions: 'pangolin' },
      { text: "Bamboo asked if I had found peace. I had found an afternoon with nothing urgent on it. They began explaining the connection. I asked to keep the afternoon.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko carried soup all the way up to my branch, and it was stone cold by the time I finished it, and it was still good. Warmth leaves a thing faster than kindness does. I've had decades to check that, and it holds.", mentions: 'pangolin' },
      { text: "Axel moves slowly in his water the way I move slowly in my green, and when we're near each other neither of us apologizes for it. Kindred is a big word for two creatures who have only ever floated together. I use it anyway.", mentions: 'axolotl' },
      { text: "Fennick talks so quickly that I catch perhaps one word in four. The enthusiasm arrives whole, though. Some messages don't need their words, and his never have.", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember says her fire burns differently these days. I had barely noticed, and she noticed at once, and that's the useful difference between us. She watches the flame. I watch the years. Lately both are saying the same thing.", mentions: 'fox' },
      { text: "Archimedes started reading me a story last Tuesday, and at my pace I'll hear the ending sometime next month. I don't mind the wait. Endings don't spoil, and this one, I suspect, was decided long before the book was.", mentions: 'owl' },
      { text: "Chill and I sat together in perfect stillness for most of a day. We were both waiting. He didn't say for what, and I didn't ask, because I've been waiting for the same thing much longer than he has.", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme runs past my tree most evenings. I thought she needed to slow down. Yesterday I asked where she was going. She had a place in mind.", mentions: 'rabbit' },
      { text: "Warren digs downward while I hang up here in the canopy, opposite directions, the same search. He's looking for the bottom of it and I'm looking for the shape of it, and I believe we'll finish on the same day.", mentions: 'wombat' },
      { text: "Fennick told me about the frequency, all ears and urgency, and I let him finish before I told him I've been hearing it for years. I didn't know it was unusual. When a sound arrives gradually enough, you file it under weather, and it becomes the sky.", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's fire and my stillness are two sides of the same ending, her burning toward it and me waiting for it, two faces of one truth. We haven't discussed this. Between the two of us it doesn't need discussing.", mentions: 'fox' },
      { text: "Bamboo meditates on their cushion and I hang from my branch, the same practice in different postures. We reach the same quiet. The difference is that they climbed toward it and I simply never left, and the quiet doesn't care which of us is which.", mentions: 'red_panda' },
      { text: "Archimedes read me the old passage. I recognized it from a dream, but could not finish the next sentence. I told him not to make my dreams a better source than his books.", mentions: 'owl' },
      { text: "There's a watcher on the high porch now, and she isn't new at all. Vesper's line has been awake longer than mine, which I didn't think the world had in stock. We watch the same dark from our two heights and say nothing, and between us the night is held like a bowl that doesn't spill. I waited a long time for a colleague. She was worth it.", mentions: 'tarsier' },
    ],
    4: [
      { text: "Bamboo calls us keepers. I asked them to keep one afternoon free of appointments. They laughed, then checked whether I was joking. I was not.", mentions: 'red_panda' },
      { text: "Thyme stopped beneath my branch and asked whether I was ready. I said I did not know. She sat down. We were both relieved to hear someone say it.", mentions: 'rabbit' },
      { text: "Panko served the final meal, and I finished eating just as everything else finished too. Exactly in time. I have been called late all my life, by creatures who did not know what I was pacing myself against.", mentions: 'pangolin' },
      { text: "Moss is the only creature in this house older than my patience. He called into an empty valley for ninety years and never once stopped setting a place for the answer. Now the answer is on the stairs of the sky. I climbed to his garden to be near that kind of faith at the end. It took me two days. It was the fastest I have ever gone anywhere.", mentions: 'kakapo' },
    ],
  },
  wombat: {
    0: [
      { text: "Archimedes came down to see my tunnels and was impressed as anything, kept calling them architecturally significant. That's owl for good digging, near as I can tell. Nice bloke. He minded his head the whole way through, which I count as respect.", mentions: 'owl' },
      { text: "Ember's den sits right above my burrow, and the warmth of her fire comes down through the ceiling stones of an evening. Dead cozy, that. Good stone shares its heat honestly. It's one of the things I like best about stone.", mentions: 'fox' },
      { text: "Panko rigged up a little dumbwaiter to send hot food down to me, so supper arrives at depth still steaming. Genius bit of engineering, that. I love that pangolin to bits, and I reinforced the shaft so it'll outlast the both of us.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Fennick reckons he can hear my digging from anywhere in the house. Now, I dig quietly. Always have, it's a point of pride. So either my spade has got louder, or his ears reach further down than I dig, and I'm not sure I fancy either answer.", mentions: 'fennec_fox' },
      { text: "Archimedes wants to map every tunnel I've dug. I told him they're simple. That was a fib, and I don't hand those out often. They're not simple, and they go a fair way deeper than I say, and a fellow keeps some of his own basement to himself.", mentions: 'owl' },
      { text: "Axel's water seeps down through the cracks into my tunnels now and then. The earth takes it. Takes it greedy, like a thing that's been thirsty a long while. I've watered plenty of dirt in my time, and dirt doesn't usually drink like that.", mentions: 'axolotl' },
    ],
    2: [
      { text: "Ember's fire warms the rock above my head, always has, honest heat from an honest hearth. But something else warms the rock below me, and it's not her fire, and it's not any fire I know the name of. It's older than that. I test it with my palm most nights.", mentions: 'fox' },
      { text: "Chill asked me straight out what lives underground. I said dirt. Just dirt and stone. He nodded and let it stand, and we both knew I was lying, and there was a kindness in how he let me do it.", mentions: 'capybara' },
      { text: "Bamboo's room is the highest in the house and mine is the lowest, top of the ladder and bottom of the shaft. The house stretches between us like a spine. Lately I'd swear I can feel it flex, the way a back does before it lifts something heavy.", mentions: 'red_panda' },
    ],
    3: [
      { text: "Dug deeper than I've ever dug today, past where sensible work stops. Fennick says he can hear what I found down there, through the walls, through the floors. I didn't ask him what it sounds like. A fellow who's touched a thing doesn't need it described.", mentions: 'fennec_fox' },
      { text: "Archimedes' oldest books describe what I uncovered, word for word, drawn and measured like a surveyor got there first. That text was written before I ever put a spade in this hill. Tell me how a book surveys my dirt before I've dug it. He couldn't. Nobody can.", mentions: 'owl' },
      { text: "Thyme's garden grows right above my deepest tunnels, and her roots have reached me now, down where roots have no business being. They come through the ceiling in patterns. Letters, near enough. I don't read them. Reading a thing makes it yours, and I don't want those.", mentions: 'rabbit' },
      { text: "Tock laid his chalk map over my tunnel drawings, his hollows above, my galleries below, and the two lines nested like a tongue in a groove. I braced my half of that shape without knowing it had another half. He knew inside a season. That aye-aye reads a house the way I read ground. I'll tell you what I told him: between his ceiling and my floor, there's nothing left in this building we haven't heard.", mentions: 'aye_aye' },
    ],
    4: [
      { text: "My tunnels connect the lot now, Axel's water, Ember's fire, Bamboo's sky room at the very top. The whole house, wired together through the deep. The circuit's complete, and I'll say what a builder's allowed to say at the end: it's good work, and it'll hold.", mentions: 'red_panda' },
      { text: "Sloane came down into my tunnel at last, left her branch behind and walked the whole way on her own legs. Said it was time. She was exactly, precisely on time, and I'd laid the floor she walked in on thirty years back. Some jobs you don't know you've finished until the guest arrives.", mentions: 'sloth' },
      { text: "I built the foundation of this place, every course of it, laid true. You built what stands above, word by word, visit by visit. Between the two of us we built what the arrangement needed to wake. I'd shake the hand of a fellow builder, and I don't do that lightly.", mentions: 'fox' },
      { text: "I checked Tock's tower tonight, every course and joint, and it will hold his ring and ten more besides. Then I came down to my stone to wait for the word from the other end. He sends it from above and I receive it below, the knocker and the digger, the two trades that always knew this house was hollow on purpose. When you hear the bell, that's his hand, and a truer hand was never set to a rope. I braided none of it and I'd still vouch for every strand.", mentions: 'aye_aye' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko shared herbal tea with me yesterday, out on the patio, so thoughtful, so calming. I only panicked twice the whole visit, once about the kettle and once about nothing at all, and she just poured again both times. That's a friend, I think. Someone who pours again.", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away from the house, and I've decided to believe her, because believing her lets me sleep. Some nights I go and watch it from the doorway, just for the comfort. It always seems to notice me arrive. That part I try not to think about.", mentions: 'fox' },
      { text: "Sloane told me to slow down and breathe, so I tried it, five whole minutes of stillness. It was terrifying. Everything I usually outrun caught up and stood politely around me, waiting. But it was also, somehow, a little bit nice? I haven't decided which part to trust.", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things the rest of us can't, and I honestly don't know whether that's better or worse for him. I watch his ears when we talk. They worry in a language I recognize, because it's my language too, only mine comes out in the paws.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine, and I want so badly to believe him. He's calm the way deep water is calm, and I keep asking myself: is he calm because nothing is coming, or calm because he already knows what is? I haven't asked him. I'm afraid of which answer would be the kind one.", mentions: 'capybara' },
      { text: "Archimedes offered to lend me a book about managing fear, which was gentle of him. I was too afraid to accept it, which we both noticed at the same moment. He just nodded and put it back on the shelf where I could see it. It's still there. Facing out. Waiting for me.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's digging shakes the garden sometimes, a little tremor up through the beds, and he says it's just normal tunnel work. But I kneel with my paws in that soil every day, and I know its normal trembles the way I know my own. This isn't one of them. The ground is shivering about something.", mentions: 'wombat' },
      { text: "Ember's fire is dimmer every day now. She says it's fine, and she says it in a new smooth voice, and do you know what frightened me most? She sounded exactly like Chill. When the warm ones and the calm ones start using the same voice, something has been agreed to.", mentions: 'fox' },
      { text: "Axel floats with that permanent gentle smile, always, no matter what the water shows him. I envy it so much. Even if it isn't real. Especially if it isn't real, actually, because that would mean smiling is something you can grow in bad soil, and I'd dearly like the cutting.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane, who I thought was too slow for secrets. They look at each other differently now, over my head, a whole conversation in a glance. I notice everything, that has always been my curse. What I notice now is that nobody will meet my eyes at exactly the moment I need them to.", mentions: 'owl' },
      { text: "Fennick tried to warn me about something last night. I heard the urgency, and I know urgency better than anyone in this house. But the longer he spoke, the less it sounded like a warning and the more it sounded like a prayer. I realized he wasn't trying to save me from the thing. He was introducing me to it.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not the way friends say it, gently, over tea. The way weather says things. 'You'll stop,' they said. 'Everyone stops eventually.' And the terrible part is that I felt my legs believe them before I did.", mentions: 'red_panda' },
      { text: "Moss planted my whole seed collection at the rim of his bowl. Every packet. I sent it up myself, so I have no one to be startled at, and yet. My marigolds are up there in the leaning beds, facing what everything faces, and somehow that steadies me. If it comes for the garden, it comes for something my hands helped plant, and there's a kind of standing in that I didn't expect.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Ember held out her paw. I did not take it immediately. She waited. Then we walked to the gate together, and she let me open it.", mentions: 'fox' },
      { text: "I told Chill I was tired of everything being fine. He asked what word I wanted in the record instead. Unfinished, I said. I checked that he wrote it.", mentions: 'capybara' },
      { text: "Warren offered to show me the old tunnel. I said another day. He brought a drawing up instead. I have drawn a small star beside that evening.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I talked philosophy over green tea this morning. He quotes his books, and I quote the wind through the roof gap. Both of us are citing the same author, I think. The tea went cold and neither of us minded.", mentions: 'owl' },
      { text: "Ember's fire is a small sunset that has agreed to stay indoors. Its warmth travels further than its light. There's good energy in that fox. The whole house sits a little nearer to her than to anyone.", mentions: 'fox' },
      { text: "Sloane understands stillness from the inside, as a place she lives rather than a place she visits. We sat together through an afternoon and said nothing, and the afternoon was complete. Very few afternoons are complete.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a text about recurring patterns, spirals and arcs drawn centuries ago. The curves in the drawings match the curves my bamboo has begun to grow. I said nothing to him. Some matches want to be sat with before they're spoken.", mentions: 'owl' },
      { text: "Fennick's ears turned toward my attic today, and he heard what I've been hearing: the bamboo growing. It grows louder now. More deliberate. A plant shouldn't have intentions, and mine has begun to keep one.", mentions: 'fennec_fox' },
      { text: "Ember meditates by her fire each night, though she would never use that word for it. I meditate under my square of sky. We arrive at the same quiet from opposite ends of the house. The quiet is one room. All doors open onto it.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth beneath the house is hollow in certain places. My bamboo's roots found the same hollowness from above. He and the green dug from different directions and met at the same emptiness. An emptiness that can be reached from two sides isn't empty. It's a room.", mentions: 'wombat' },
      { text: "Axel's water reflects a sky I've seen only in the deepest sitting, when the breath goes quiet and something older opens. It isn't our sky. It's behind ours, or beneath it. He floats in its reflection every day, smiling. Perhaps that's the correct response.", mentions: 'axolotl' },
      { text: "Chill floats in his spring and I sit on my mat, and we're both inside the same emptiness. He calls it peace. I call it practice. The emptiness, I notice, doesn't call itself anything. It's waiting for its true name to arrive, and it's patient.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo runs through the walls and floors of this house now, stalk and root, top to bottom. When I lay my paw on a stalk I can feel each animal moving through the house, a tremble here, a warmth there. The house has a nervous system. I'm holding its wrist.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion in the same week, he through his books, I through my breath. Two paths up one mountain, and at the top, a single view. The view isn't of the valley. The view is of what's descending toward it.", mentions: 'owl' },
      { text: "I told Thyme fear was awareness waiting to be introduced. She asked whether I had ever been frightened enough to run. I had no answer worth giving her.", mentions: 'rabbit' },
    ],
    4: [
      { text: "Ember asks what a keeper is allowed to leave alone. The text does not answer. I used to think every silence in it was profound. Some may be omissions.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes found the words. Warren laid the foundation. I breathe the breath that opens the gate. Each of us made one thing our whole life long, and tonight the things fit together. It begins.", mentions: 'owl' },
      { text: "Sloane asked me not to turn her lateness into a prophecy. She had enjoyed the garden on the way up. I apologized. We spent the morning there.", mentions: 'sloth' },
      { text: "Vesper holds the outward face of the vigil while I hold the inward one, her rail and my roof gap, the two open eyes of this house. At the dawn handover she says, it held, and I say, it held, and lately we both smile, because the holding is nearly over and neither of us grieves that. The pattern gave the last watch to the steadiest eyes it could find. It found well.", mentions: 'tarsier' },
      { text: "Moss keeps the garden above my attic now, and each dawn the light passes my gap on its way to his beds, and I find I do not mind being second. The window was never the destination. Moss stands in the open with his chest full, ready to say the welcome, and when I hear it begin I will bow. We rehearsed it at tea. Neither of us needed the rehearsing.", mentions: 'kakapo' },
    ],
  },
  tarsier: {
    0: [
      { text: "Fennick and I split the night between us, his ears and my eyes. Some evenings I sing to him in the voice only he can hear, and he flicks one ear when I get a line right. Best audience in the valley. Also the only one, which I suspect helps.", mentions: 'fennec_fox' },
      { text: "Sloane and I are colleagues, in the way of creatures who are both awake when nobody else is. She watches from the green and I watch from the rail, and we have never discussed it once, and we never need to. Watching is a guild with no meetings.", mentions: 'sloth' },
      { text: "Archimedes keeps nearly my hours, bless his lamp. Some nights his study window and my porch are the only two open eyes in the whole sleeping house. When he shelves the last book he waves his quill at me, and I turn my whole head back. That's our entire friendship, and it's a good one.", mentions: 'owl' },
    ],
    1: [
      { text: "Bamboo says their incense leans toward the center of the house now, and I told them the whole night leans the same way from the outside. We stood on the top step at dawn, their smoke and my dark both pointing at the same rooms. Being pointed at, they said. From both sides, I said. They poured the tea.", mentions: 'red_panda' },
      { text: "Axel showed me his water after dark, since nobody else keeps my hours. There's a second sky in that tank, deeper than the one I name stars in. I looked a long while. My head didn't want to turn away, and my head always wants to turn. I'm still deciding what to write in the ledger about that.", mentions: 'axolotl' },
      { text: "Warren keeps his palm flat on the floor and I keep my eyes flat on the sky, and this week we compared findings, which took four words each. Warm below, he said. Watched above, I said. Then we stood there a while, the lowest post and the highest, holding the house between us like a parcel.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick asked me what I see at the hour the low note is loudest. I told him the truth, which is that the seeing and the hearing have started arriving together, one fact wearing two coats. He nodded slowly, ears low. Neither of us said which coat the fact will wear when it arrives. We're saving that conversation. There are only so many like it left.", mentions: 'fennec_fox' },
      { text: "Panko sends supper up to my rail at dusk, since I wake when the kitchen closes, and lately there are two portions on the tray. When I asked her about the second one, she said, for whatever you're watching, in case it's hungry. She was joking. I ate both, slowly, facing the ridge. I wasn't entirely joking either.", mentions: 'pangolin' },
      { text: "Thyme asked me whether the night is safe. I told her the two true things, that it has never harmed me and that I no longer believe it's safe. She held her watering can with both paws and said that's how she feels about everything. Of everyone in this house, it's the frightened one who understands my ledgers best. I've thought about that a great deal.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember and I compared doorways this week, her bright one and my dark one, the hearth and the way. She said her fire has stopped flickering and just burns now, one held note. My watch is the same, one held look. The house is full of held things, friend of hers, friend of mine. Something is about to be let go of, and every keeper in the building is holding their piece of it steady.", mentions: 'fox' },
      { text: "Chill sat the middle watch with me, tea and ledger and no questions, and near dawn he wrote one line and turned it so I could read. Vigil, ongoing, in order. Then he went back down to his office. I've stood this post for years on colder rations than that sentence. I copied it into my own book. Some paperwork is poetry with its collar buttoned.", mentions: 'capybara' },
      { text: "Sloane came out to the edge of the green at moonset and looked up at my porch, and I turned my whole head down to her. For a long moment the two oldest watches in the valley pointed at each other. Then she raised one arm, slowly, and pointed at the cleared sky, in case I had somehow missed it. I hadn't missed it. But it was kind of her to check. Thoroughness, at our age, is how we say love.", mentions: 'sloth' },
    ],
    4: [
      { text: "Fennick uncovered his ears and I opened both eyes, and the last two senses this house kept in reserve came off the shelf together. What he hears and what I see are one fact now, one arrival, and between his post at the sand's edge and mine at the rail, it will be met by the two of us first. We agreed long ago, without a word of it aloud, that this is the honor of our lives.", mentions: 'fennec_fox' },
      { text: "Bamboo stands beneath the opening and I stand above the valley, the inward face and the outward one, and tonight at the handover they did not say it held. They said, it opens. I have waited my whole line's patience to hear a keeper of the dawn say those words to a keeper of the dark. Everything after this is welcome.", mentions: 'red_panda' },
      { text: "Thyme is at her station with her paws in the roots, staying, and from my rail I keep her in the corner of my seeing all night, which is a lie, I have no corners. I keep her in the whole of it. When it looks down at us, the first thing I will show it is her. The bravest thing in this valley is not the watcher who was made for this. It is the frightened gardener who stayed anyway.", mentions: 'rabbit' },
    ],
  },
  aye_aye: {
    0: [
      { text: "Panko has surrendered her pot rack to science. I tap my way down it most evenings, copper to iron, learning the notes, and she stirs along and pretends the percussion section came with the kitchen. Last night she saved the big stockpot lid for my finish. A cook with a sense of timing is a treasure beyond soup.", mentions: 'pangolin' },
      { text: "Warren and I've worked out a whole language through the floor, did you know? Two knocks for good evening, three for come down, supper is on. Tonight he added a new one, one long slow knuckle-drag that means, rest well up there in your heights. I answered it before I understood it. Some words you learn by feeling glad.", mentions: 'wombat' },
      { text: "Vesper and I split the night between us now, formally, like sensible professionals of the dark. The sky watch and the wood watch. We drew up the arrangement at midnight over a shared slice of leftover seedcake, and sealed it with one tap on the shared beam. It's the finest contract I have ever signed with a knuckle.", mentions: 'tarsier' },
    ],
    1: [
      { text: "Archimedes borrowed my log, the one where I write down the answering knocks. Returned it three days later with a ribbon marking one of his old books at a page of rhythm notations. Centuries old, he says. The counts on his page and the counts in my log agree, friend. We stood there being agreed with, together, and then he made tea very slowly.", mentions: 'owl' },
      { text: "Fennick heard my bell hum from the desert camp, all those floors and walls away, and came straight up. He says the hum isn't hers. He says she's answering something, the way one ear of a pair answers the other. Then he asked, very politely, to sleep on my windowsill, and I let him, because listeners should keep together in a season like this.", mentions: 'fennec_fox' },
      { text: "Ember asked me to tap her hearthstone, just once, to see what her den is holding. I did. I haven't told her the whole of what came back, because a listener owes her friends mercy as well as truth. I told her the stone is old and warm and full. All of it true. The fire flared anyway, at the word full, and she looked at it, and then at me, and poured more tea. She knows. That fox always knows.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren and I've merged our maps, his tunnels and my hollows, ink and chalk on one great sheet pinned to his workshop wall. The two lines nest together like a voice and its harmony, air above and earth below, one shape sung twice. We stood before it a long while, the digger and the knocker, and he said, well, there it is. Covered it with a cloth, the way you cover something finished. Or something sleeping.", mentions: 'wombat' },
      { text: "Chill brings three cups when he visits my tower now. He sets the third on the sill, facing the window, and never says one word about it, and files the visit, I'm certain, under routine. The third cup always steams the longest. Last time, as he left, he turned it a little, so its handle faced the room. Hospitality, in that capybara, is a form of prophecy.", mentions: 'capybara' },
      { text: "Sloane asked me to tap the old tree that holds her hammock. I climbed down into the green and sounded it, root to first branch, with her watching from above at her own speed. It's hollow, friend. The whole grand trunk, hollow as a flute, and standing strong regardless, and when I looked up to tell her, she was already nodding. I've been living in an instrument for decades, she said. You're only the first one polite enough to knock.", mentions: 'sloth' },
    ],
    3: [
      { text: "Axel and I are the two mouths of the house, we proved it between us. I hummed against the bell's waist and his deep water rippled in rings, four floors down, through stone and timber. He pressed his hand to the glass and my bronze warmed under my ear. The house breathes in at his water, friend, and it will breathe out at my bell. Axel isn't afraid, and his not-being-afraid is the sturdiest thing I lean on some evenings.", mentions: 'axolotl' },
      { text: "Thyme climbs my stairs at dusk now, on purpose, at the hardest hour, and sits with me through the pointing. Her heart gallops the whole time and she stays anyway, paws folded, watching my finger find the sky. Brave was never calm, friend. Brave is a rabbit at the top of a bell tower, staying. The whole house should study her.", mentions: 'rabbit' },
      { text: "Ember's fire has been drawing my tower for a year, she finally told me, over midnight tea. A tower, a bell, a rope, and on the rope a paw the flames would never show her. I told her about the pale strand braided through the hemp, my own fur, so there would be no doubt whose paw. She laughed her bright-days laugh, and it rang round the bronze, and for a moment the tower had its first small ring after all.", mentions: 'fox' },
    ],
    4: [
      { text: "Sloane is climbing my stairs. She began at dawn and she will arrive exactly when the hour does, I would stake the rope on it, the slowest keeper timing the longest climb to the oldest appointment. I have set the window chair ready and a cup at the third landing. She has watched this house from below since before it was a house. Tonight she watches from above. Nobody has earned a view like that one has.", mentions: 'sloth' },
      { text: "Fennick and I made our last trade on the middle landing. The far is empty, he said, it has all arrived. The deep is quiet, I said, it has all come up. Two listeners, retired in one evening, standing in a stairwell full of heartbeats. He asked to be near the tower when she rings. Near, friend. The best ears in the house, and he wants the sound whole. That is the most reverent sentence Fennick has ever said with his ears alone.", mentions: 'fennec_fox' },
      { text: "Warren checked my tower one last time tonight, every joint and joist, palm flat, eyes shut, reading his own work the way I read wood. It will hold the ring, he said. It would hold ten of them. Then he looked up at the bronze a long moment and said, sixty years I wondered what my deep beam was listening for. Give her a good pull, Tock. And went down to his stone, to feel the word arrive from below while I send it from above. Between the two of us, friend, the whole house speaks tonight.", mentions: 'wombat' },
    ],
  },
  kakapo: {
    0: [
      { text: "Thyme and I run a seed post, her twists coming up, my cuttings going down, and her labels are little masterpieces of worry. Water sparingly, one says, and then underneath, smaller, but do water. That's a whole gardener in four words. I've kept every label.", mentions: 'rabbit' },
      { text: "Sloane and I met on the stairs once, and the meeting took an afternoon, her pace and mine being what they are. Best conversation I've had in decades. The fast ones skip to the ends of things, friend. She and I live in the middles, where all the flavor is.", mentions: 'sloth' },
      { text: "Panko sends up broth on cold nights in the dumbwaiter, and I send down whatever the beds can spare. She cooks the way I garden, for the day after tomorrow. I have never had to explain a single thing to that pangolin. Between her pot and my beds, it's all one patience.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Tock's knocking runs the beams at night, and my seedlings come up straighter along the timbers where the rounds pass. I mentioned it at last. Tock listened, knocked the gate post twice, and said, then the house likes them growing. I've thought about that sentence more than most books.", mentions: 'aye_aye' },
      { text: "Bamboo's incense climbs through the roof gap below my east bed every dawn, and my morning glories have taken to growing toward the smoke. Bamboo says the smoke leans somewhere too, lately, all of it, one direction. Two gardeners comparing which way things lean. That's the season we're in.", mentions: 'red_panda' },
      { text: "Fennick asked me to boom for him once, just to hear it proper, so I did, one small one. He stood with his ears full out and his eyes closed, and then he said, there's something under your note. Under it, friend. I've been booming ninety years and nobody ever told me my note had an under.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Archimedes found the mast years in his oldest book, whole chapters, charts of forests fruiting together down the centuries. He showed me the dates and asked what I noticed. The gaps between masts, friend. They shorten. All down the page, they shorten, the way footsteps do when the walker sees the door.", mentions: 'owl' },
      { text: "Warren brought up loam from the deep for my rim bed, the best soil I have ever run through my toes. I asked what grew in it down there. Nothing, he said. It has never once grown anything. It was saving itself. We stood quiet over the barrow a while. Gardeners and diggers know when the ground has plans.", mentions: 'wombat' },
      { text: "Vesper keeps the gate post at night now, eyes like two moons, watching the sky while I work the beds. We've started trading reports, the low and the high. Lately the reports agree, and I'll be honest with you, friend. I liked it better when they didn't.", mentions: 'tarsier' },
    ],
    3: [
      { text: "Axel's water shows him my garden, though he has never climbed to it. Lately, he says, it shows the garden blooming under a sky with something in it. I asked what the something was like. He thought a long while, the way he does, and said, like being looked at by everything at once, but kindly. Then he went back under. Axel doesn't need the stairs. Axel is already wherever things are shown.", mentions: 'axolotl' },
      { text: "Ember reads her fire and I read my beds, and this week the two books agree, page for page. Green things leaning, bright things bowing, everything facing its own center. She asked me how the garden was taking it. Like rain, I said, roots open, and she nodded the way you nod when someone confirms your fire.", mentions: 'fox' },
      { text: "Tock knocked the whole house last week, the great round, every beam from belfry to foundation, and came up after to tell me the finding. The hollows are filling, Tock said. One by one, floor by floor, from the bottom up. A house fills from the bottom up, friend, the way a bowl does. The way my bowl is.", mentions: 'aye_aye' },
    ],
    4: [
      { text: "Bamboo keeps the passing place and I keep the landing green, the window and the garden, the bow and the welcome. We took tea at the roof gap tonight, most likely the last quiet cup of the old kind, and they said, the light will come through my gap and finish in your beds. Then finish is the wrong word, I said. Begin. Bamboo smiled all the way down the ladder.", mentions: 'red_panda' },
      { text: "Sloane hangs at my gate these nights, come all the way up at her own great pace, and between us we are two long lifetimes of patience at a single rim. She says one word an hour and every one lands like a planted stone. Tonight's four were, we were always its garden. I have no argument. I have a watering can, and the rows, and her company, which is the finest slow thing I know.", mentions: 'sloth' },
      { text: "Chill came up with two cups and sat at the rim and said nothing at all, which is Chill's finest ceremony, and we watched the beds face the bowl and the stars step aside. When he left he said, everything is on schedule, and for once, friend, the schedule and the season are the same document. Even the administrators are gardeners tonight.", mentions: 'capybara' },
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

// ============================================================================
// COORDINATED THEMATIC DIALOGUE EVENTS
// At specific puzzle milestones, multiple animals independently reference
// the same phenomenon — creating the feeling of shared awareness.
// These fire once per milestone, keyed by puzzle count.
// ============================================================================

interface CoordinatedEvent {
  // Fires when the player's effective progress >= this. Effective progress is
  // the same weighted scale phase transitions use (phaseProgress, which
  // accelerates for engaged players), falling back to raw puzzlesSolved for
  // legacy saves — otherwise accelerated players reach the finale (~116 real
  // puzzles) before the 161/168/175 pre-finale crescendo ever fires.
  puzzleThreshold: number;
  phase: number;            // Minimum phase required
  theme: string;            // Internal theme name
  lines: Partial<Record<AnimalType, string>>;  // One line per participating animal
}

export const COORDINATED_EVENTS: CoordinatedEvent[] = [
  // Event 1: Phase 2 — animals independently notice that words have changed
  {
    puzzleThreshold: 56,
    phase: 2,
    theme: 'words_changing',
    lines: {
      fox: "One word in the embers all night. I laughed and stirred the fire. Same word when it settled. One of yours, friend. Come close enough to read it with me.",
      owl: "Your word appears in the oldest text. I checked the date twice, then the binding. The book predates your visit. That is what I can establish.",
      pangolin: "The pot was simmering before I reached the kitchen. Your letters lay in the recipe's order. I tasted it before adding anything. Somebody has learned my method.",
      axolotl: "Your letters on the inside of the glass! I wipe them away and the water draws them again. Same crooked little shapes. I wish it would try a fish.",
      capybara: "Your word, every margin. My handwriting. No recollection of the entries. I have clipped the pages together and put my pen in another room.",
      fennec_fox: "One word in the wind. Repeats without a breath. I took bearings from each side of camp. Did you hear it? I need an answer besides my own.",
    },
  },
  // Event 2: Phase 2 — the house itself responds to puzzles
  {
    puzzleThreshold: 70,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: "The den is warmer. I opened the window and blamed the fire. Still warm with the grate dark. I would like it to be a pleasant surprise. That's a wish, friend.",
      owl: "The walls hum after each arrangement. Faint, but my tuning fork catches it. I've entered the times beside your visits. The columns match so far.",
      pangolin: "Your words arrive and every pot rattles. I tightened the shelf, checked the stove, moved a saucepan to the floor. The saucepan rattled there too.",
      axolotl: "The water rose a knuckle overnight! Nobody added any. I asked twice. I marked the glass this morning. My line looks terribly small beside all that water.",
      wombat: "Steady vibration under the boards. Started after your last words. I've checked the braces. Sound timber, tight joins. Whatever's running is below my work.",
      rabbit: "Three new rows along the warm strip. Dark flowers. I didn't plant them. I have the seed packets and the bed plan. Please put those beside what you see.",
      fennec_fox: "The walls hold one low note after your words. Longer each night. I time it by the kettle, which is still behaving like a kettle. That matters to the measurement.",
      sloth: "The branch hums after your words arrive. I know its storm noises. This is new. Gerald has moved out of the fur against the bark. A second opinion.",
    },
  },
  // Event 3: Phase 2 — they all had the same dream
  {
    puzzleThreshold: 76,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: "A shape in my fireplace, in the dream. I woke smiling and began laying two cups. Caught myself at the second. Did you dream a visitor too?",
      owl: "Same shape in every dream I have collected. I kept the accounts separate until each was written. They agree. I have no independent sleeper outside the house to ask.",
      axolotl: "The dream shape was in the water when I woke. I waved. It waited. Perhaps I'd been visiting its dream! I would like to ask whose turn it was.",
      sloth: "First dream in years. A visitor in the clearing where my sleep usually does nothing. I was sorry to wake. I have written that down before telling you the rest.",
      red_panda: "I saw the dream shape while sitting awake. Beautiful. I kept wanting the beauty to settle my next question. I moved my cushion and looked again.",
      fennec_fox: "I heard the shape before I saw it. Same note as the walls, with a gap at the end. I woke waiting for the gap to finish.",
    },
  },
  // Event 4: Phase 3 — "the arrangement" is named openly for the first time
  {
    puzzleThreshold: 92,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: "Archimedes has a name for the marks: the arrangement. I recognize some of what I saw in the fire. I do not recognize the certainty in his translation. We are checking it together.",
      owl: "I compared your words with the old text. They fit parts of its structure. My first note said they had always been destined to fit. I have crossed that part out.",
      pangolin: "Ember told me the words help feed a presence. I asked what it eats when no words arrive. She did not know. An important question for a table we are setting.",
      capybara: "The oldest ledger contains dates before my records begin. Some match your visits. Some do not. I circled the exceptions. The house keeps trying to straighten the circles.",
      wombat: "The old foundation follows the marks in the text. My braces are completing something I thought was a ruin. I know what the stone will bear. I do not know what it ought to bear.",
      rabbit: "They explained the arrangement last night. I asked why I was hearing it now. There was an uncomfortable pause. I am keeping that pause in my account of the evening.",
      fennec_fox: "The arrangement is the name Archimedes gives the low note. I can use the name. It does not turn the note into a promise.",
      axolotl: "The water puts your words in a shape, each touching the next. I moved my hand through it and the shape repaired itself. It was beautiful. I liked my gap too.",
      tarsier: "They call it the arrangement. I thought I was recording a change in the stars. My watching may have helped it happen. I have written that possibility down.",
      aye_aye: "The arrangement fits some of my chalk map. The rest is ordinary hollows and mouse paths. I left those on the sheet. A house deserves more than one purpose.",
      kakapo: "The arrangement looks like a mast year to me, the whole valley fruiting together. Except the fruit is not falling. I have no gardener's name for plenty that refuses to be spent.",
    },
  },
  // Event 5: Phase 3 — each animal names their role in the cult
  {
    puzzleThreshold: 104,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: "The text calls me Oracle. I can read something in a fire. I cannot promise its promises are true. I am keeping Ember alongside the title. Ember knows less, and says so.",
      owl: "The office is Lorekeeper. It seems to expect certainty. I have supplied disputed readings instead. If the text wants a scholar, it will have to put up with scholarship.",
      pangolin: "The page calls me Preparer. Tonight I am preparing supper before I prepare a welcome. The people already here have waited long enough.",
      axolotl: "The text calls me Medium. I want to know how to close the window for a while. A medium must still get to be a small creature with tired gills.",
      capybara: "Coordinator. Accurate enough. I added a task to the list: find out who agreed to what. It is taking longer than the other tasks.",
      fennec_fox: "Sentinel. I hear what approaches. I thought my work ended at the warning. Now I am listening for whether anyone was allowed to answer it.",
      sloth: "The page calls me Anchor. I have been very good at waiting. I would like the description to include that an anchor can be raised.",
      wombat: "Foundation. Near enough to my trade. I can brace the old arch against new weight. I cannot promise every weight ought to be welcomed.",
      rabbit: "The text calls me Witness. I asked whether witnesses may object. No answer. I am going to object when I need to and find out.",
      red_panda: "Guide. I thought that meant walking ahead with certainty. It may mean being the first to admit the path needs checking.",
      tarsier: "Vigil. My grandmothers kept this watch. Their endurance is mine to honor. Their consent is not mine to inherit.",
      aye_aye: "Toller. A whole office at the end of one rope. A listener has a responsibility for when to stay quiet too.",
      kakapo: "Caller. I am proud of those long years of calling. I am also allowed to ask the answer what it means to do here.",
    },
  },
  // Event 6: Phase 3 — the final countdown before Phase 4
  {
    puzzleThreshold: 116,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: "The fire is steady. I put the kettle on, then took it off. I wanted one thing in the room to stop because my hand said stop.",
      owl: "The final chapter is writing itself. I copy the earlier drafts onto loose pages. An ending that tidies away questions should not be the only account left.",
      pangolin: "The table is set. One place has no plate yet. I am waiting to ask the guest what it needs.",
      axolotl: "The deep water has gone still. I blew a bubble just to make a sound. It took a long time to break. I waited with it.",
      capybara: "The list is nearly finished. I added tomorrow at the bottom. It has not crossed that out yet.",
      fennec_fox: "There is a silence before the low note now. I can fit a small breath inside it. I have asked the others to keep talking.",
      sloth: "The waiting is nearly over. I do not know what to do with the hour afterward. I hope I am permitted to waste some of it.",
      wombat: "The braces are in. The old arch is sound. I left the ladder down. Whatever arrives, there ought to be a way back to the kitchen.",
      rabbit: "I packed the seed tin. I have not decided to leave. I want that sentence to remain true when this is over.",
      red_panda: "I keep calling it peace. Tonight I tried another word: stillness. It describes what I see without claiming to know how anyone ought to feel.",
      tarsier: "The sky is nearly open. I check the chip in my rail between sightings. One thing far away, one thing under my paw. I need both.",
      aye_aye: "The knocking stopped. Perhaps the guest is at the door. Perhaps I have stopped hearing it. I am keeping both possibilities in the log.",
      kakapo: "The fruit is full and will not fall. I put a bowl beneath the branch. An ordinary preparation for an ordinary bit of letting go.",
    },
  },
  // Event 7: Phase 4 — the convergence, animals sense closeness to the finale
  {
    puzzleThreshold: 124,
    phase: 4,
    theme: 'convergence',
    lines: {
      fox: "The fire has changed color. I cannot name it. I asked Panko whether she could still cook by its heat. She said yes, then asked why the soup would not cool.",
      owl: "The last pages gather ink. I keep earlier versions beside them. The text reaches toward those loose sheets each morning, which is not an editorial method I accept.",
      pangolin: "The covered dish has stayed hot since yesterday. I moved it away from the stove. Still hot. I keep thinking of leftovers, and all the meals that have to end.",
      axolotl: "What comes is close enough to move my water without touching it. I put the small fish behind the weeds. Not much of a shelter, but something I can do.",
      capybara: "The ledger closes itself when I leave the room. I put my teacup on the open page. An inelegant filing practice. Effective so far.",
      fennec_fox: "The sound is close, not loud. I can still hear a spoon landing in a bowl. If that changes, I want everyone to know immediately.",
      sloth: "The branches are warm all through. I enjoyed it for an hour, then went looking for a cool patch. It was harder to find than I expected.",
      wombat: "Something approaches the old arch from a direction my drawings don't hold. I stopped trying to draw it. I can check the joins and keep the stairs clear.",
      rabbit: "For a while I could not feel afraid. I thought of the gate, my packed seeds, the word goodbye. The fear came back. I was glad enough to cry.",
      red_panda: "The pattern is nearly whole. It asks every loose part to settle. I left my cushion crooked. A small test. It should not have to be a test.",
      tarsier: "It is close enough to see without looking toward the ridge. I turned to my rail and counted its splinters. I can still do that. I will keep checking.",
      aye_aye: "The rope sways without a hand. I steadied it against the rail. She has a note ready. Readiness is not a command to the hand.",
      kakapo: "The beds face the bowl, every leaf together. I turned one pot east. It is facing the bowl again. The pot has no feet, and I have questions.",
    },
  },
  // Event 8: Phase 4 — the threshold, final coordinated event before the endgame
  {
    puzzleThreshold: 130,
    phase: 4,
    theme: 'the_threshold',
    lines: {
      fox: "It is at the threshold. I have wanted to say welcome all my life. Tonight I am practicing a longer sentence: welcome, and there are things we need to tell you.",
      owl: "The last page says preserve. It does not say what must be allowed to change. I left that question where an arriving reader cannot miss it.",
      pangolin: "The table is ready. A guest who needs the whole house forever can bear five minutes of questions before the first course.",
      axolotl: "The water is rising gently. I asked it to stop at the glass. It slowed. I do not know whether it understood, but I asked again.",
      capybara: "Every column aligns except the one headed permission. I will not balance it by changing the heading. We can bring an unfinished document to an arrival.",
      fennec_fox: "I hear it breathing beyond the walls. Under that, I hear us. Not all at the same speed. I am listening carefully to the difference.",
      sloth: "The answer is here. I have wanted it longer than anyone. I am trying not to make that a reason the others must want it too.",
      wombat: "The old arch is bearing something. The braces are doing their work. I am at the stairs with my lamp. If anybody needs to come up, I will see them.",
      rabbit: "We are close together, and I am frightened, and I am glad we are close together. Please let all three things be true for a moment.",
      red_panda: "Stand where you can breathe. I was going to tell you to stand beside me. That is a choice I should leave to you.",
      tarsier: "The sky is open. Your little star is at its edge. I will watch what comes through, and look away when I choose. Both belong to the watch.",
      aye_aye: "She has saved her note. I have kept my hand free of the rope. The words come first. A bell should be an answer tonight, not an order.",
      kakapo: "I have one call ready. Not a summons this time. An answer, when I hear what is being offered. I can wait through one more question.",
    },
  },
];

/**
 * Get the coordinated event line for a specific animal at a given effective
 * progress (weighted phaseProgress when available, else raw puzzlesSolved —
 * the same scale phase transitions key on).
 * Returns null if no event is active or the animal doesn't participate.
 * The event is "consumed" by tracking which thresholds have been shown.
 */

/**
 * Display names used to detect cross-animal mentions inside event lines so a
 * line never names an animal the player hasn't unlocked yet. Kept local to
 * avoid an import cycle with animalDialogueBase.
 */
const ANIMAL_DISPLAY_NAMES: Record<string, AnimalType> = {
  Ember: 'fox', Panko: 'pangolin', Archimedes: 'owl', Axel: 'axolotl',
  Sloane: 'sloth', Fennick: 'fennec_fox', Chill: 'capybara',
  Warren: 'wombat', Thyme: 'rabbit', Bamboo: 'red_panda',
  Vesper: 'tarsier', Tock: 'aye_aye', Moss: 'kakapo',
};

/**
 * Whether a line names an animal the player has not met.
 *
 * Exported because the Phase-5 pool needs the same test: post-revelation lines
 * were never gated, on the premise that Phase 5 implied a finished house. The
 * endgame also arms on a bare solve floor now, so a player who spent amber on
 * cosmetics instead of rooms can hear a keeper named who has no room.
 */
export function lineMentionsLockedAnimal(
  text: string,
  speaker: AnimalType,
  unlockedAnimals: string[]
): boolean {
  for (const [name, type] of Object.entries(ANIMAL_DISPLAY_NAMES)) {
    if (type === speaker) continue;
    if (new RegExp(`\\b${name}\\b`).test(text) && !unlockedAnimals.includes(type)) {
      return true;
    }
  }
  return false;
}

export function getCoordinatedEventLine(
  animalType: AnimalType,
  effectiveProgress: number,
  currentPhase: number,
  consumedEvents: string[],
  unlockedAnimals: string[] = []
): { text: string; theme: string; deliveryKey: string } | null {
  // Approach testimony belongs before the arrival. Unread accounts remain in
  // the story archive rather than contradicting the settled house.
  if (currentPhase >= 5) return null;
  // Events are scanned in ascending threshold order and only ONE fires per
  // call, so a player whose effective progress leapt past several thresholds
  // still receives the skipped events in order (one per visit) — never lost.
  for (const event of COORDINATED_EVENTS) {
    if (effectiveProgress >= event.puzzleThreshold &&
        currentPhase >= event.phase &&
        !consumedEvents.includes(event.theme)) {
      // Bare theme keys are legacy saves: preserve their completed events.
      // New saves retain two distinct witnesses, so a player can compare
      // accounts without hearing thirteen versions of the same milestone.
      const prefix = `${event.theme}:witness:`;
      const witnesses = new Set(consumedEvents
        .filter(key => key.startsWith(prefix))
        .map(key => key.slice(prefix.length)));
      if (witnesses.size >= 2 || witnesses.has(animalType)) continue;
      const line = event.lines[animalType];
      // Skip lines that name an animal the player hasn't met — the event
      // stays unconsumed and can fire later (or via another animal).
      if (line && !lineMentionsLockedAnimal(line, animalType, unlockedAnimals)) {
        return { text: line, theme: event.theme, deliveryKey: `${prefix}${animalType}` };
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
  "I did hope you would stay, friend. I knew more words would help bring a guest to the house. I also liked your company. Both are true, and neither excuses leaving the first one out.",
  "I said the words helped build the house. They did. I should have told you what else they were feeding. Asking the right question was never your job.",
  "I used the hope of more friends to make the rest easier to hide. Those friendships are real. You are allowed to be angry with someone who loves you.",
  "I taught you how the letters move. I did not know the warmth would try to stop other things moving. I knew enough to owe you a warning, though. I will not pretend otherwise.",
  "I thought more warmth meant more safety. The first time a cold cup warmed itself, I was delighted. I did not think to ask what would happen when somebody wanted it cold."
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  "fox": {
    "seeds": [
      "The kettle never quite fits my small fire, friend. I turn it halfway through so both sides get their fair share. Tea is fussy about fairness.",
      "I keep a cup by the door. Visitors arrive thirsty, and I forget where I put things when I am excited."
    ],
    "callbacks": [
      "The old hearth had warmth before there was much wood to feed it. I knew words helped. I called that a blessing and invited you in. I did not tell you enough to decide for yourself.",
      "The cup by the door was for you. That much was simple. I wanted company and I wanted the house to survive, and I let one wish excuse the things I hid for the other."
    ]
  },
  "owl": {
    "seeds": [
      "I keep mistakes in the margins. A clean page proves very little about the work it took to get there.",
      "Most books in this study survived the old den's damp years. The water stains are part of their history. I do not bleach them out."
    ],
    "callbacks": [
      "My old book has begun correcting its margins. The new words are tidy. The mistakes I remember making are gone. I keep a second notebook away from it now.",
      "The water stain vanished from the oldest page this morning. Its ink is intact. So is the paper. The damage is gone, and with it the only record of how that book survived."
    ]
  },
  "pangolin": {
    "seeds": [
      "My grandmother's spoon is worn thin on one side. No other spoon reaches the corner of this pot quite so nicely.",
      "I make enough for whoever arrives, and a little extra for whoever does not like what I made. Feeding people takes some room for disagreement."
    ],
    "callbacks": [
      "I took my grandmother's spoon out of its drawer and both sides were even. A better spoon, perhaps. But her hand wore that hollow, and mine had learned to fit it.",
      "The extra plate has become a place at the center of the table. I set it willingly. I did not agree that everyone else's plate should begin sliding toward it."
    ]
  },
  "axolotl": {
    "seeds": [
      "See the snail on the far glass? He takes a different path each day. I cannot imagine having so many places to be on one window.",
      "When I lose a bit of fin, it grows back slowly. I watch it when I get bored. Tiny new pieces of me, arriving without an introduction."
    ],
    "callbacks": [
      "The snail goes round the same circle now, and I thought he liked it. Yesterday I moved his leaf. He went round the circle without it. I would like to know whether he can stop.",
      "My fin grew back without the old notch. That happens. But this morning the picture I drew of the notch was smooth too. I can understand mending a fin. I do not understand mending a picture."
    ]
  },
  "capybara": {
    "seeds": [
      "I keep the first draft. Someone usually asks why a decision changed after everyone has forgotten the reason.",
      "The door is open during office hours. Outside office hours, knock. I am often here, but here and available are separate entries."
    ],
    "callbacks": [
      "My first drafts are becoming fair copies. Even the crossings-out have gone. I have started writing the objections on separate sheets. An agreed decision should survive beside a disagreement.",
      "I found my office door open again after I shut it. The house seems to prefer its rooms available. I closed it a second time. The latch works; I checked it before blaming anything else."
    ]
  },
  "fennec_fox": {
    "seeds": [
      "I can hear a beetle under that stone. I leave it alone. Finding a creature is not the same as being invited to bother it.",
      "I take one hour off the watch before dawn. The others know to knock if they need me. Good ears need a quiet owner."
    ],
    "callbacks": [
      "I heard the low note before I knew what it belonged to. I told people it was settling stone because I hoped it was. The hope lasted longer than the evidence. I owe them that correction.",
      "The hour off my watch has been shrinking. Nothing rings to call me back. I simply find my ears turned toward the house again. I am asking someone to sit with me while I practice resting."
    ]
  },
  "sloth": {
    "seeds": [
      "I leave one branch unoccupied. It is a good branch. An empty place does not have to explain itself.",
      "I am very fond of the afternoon. Even a good one ends, though. That is where the next afternoon gets its room."
    ],
    "callbacks": [
      "I have watched the signs longer than the others. That has made me sound certain. I should say it correctly: I have wanted something to answer for a long time. Wanting is not knowing who will answer.",
      "The afternoon has stayed the same color for three days. I have dreamed of this sort of rest. Yesterday I caught myself missing dusk."
    ]
  },
  "wombat": {
    "seeds": [
      "Old stone below, new timber above. Mark the join and you'll know which builder to blame. I sign my own work.",
      "A sound brace leaves a little room for movement. Wood swells. Ground settles. A house that can't give anywhere will split."
    ],
    "callbacks": [
      "I found the old arch before I understood it. My braces fit what was already there; that ought to have made me ask more questions. I thought a sound structure must have a sound purpose.",
      "The new timbers have stopped moving with the weather. No cracks, no strain. It looks like perfect work. I've loosened one brace to see if the wood is still allowed to swell."
    ]
  },
  "rabbit": {
    "seeds": [
      "I leave the garden gate easy to open. Carry a tray of seedlings through a stiff latch once and you understand why.",
      "Some seeds do not come up. I keep the empty packets until the season ends, so I remember what I meant to try."
    ],
    "callbacks": [
      "The gate has been standing open and the path keeps bending back toward the garden. I checked the stones twice. An open latch is not much comfort if the way beyond it cannot lead away.",
      "The empty patch filled overnight. Every seed came up, even the ones I planted too deep. They are beautiful. They are also all at exactly the same stage, and I am waiting for one of them to grow."
    ]
  },
  "red_panda": {
    "seeds": [
      "I leave a gap in the incense circle. The smoke rarely respects the drawing. It is useful practice in being contradicted.",
      "Some mornings I am good at sitting still. Some mornings I spend the whole hour thinking about breakfast. I eat afterward in either case."
    ],
    "callbacks": [
      "I used to find it useful when the smoke spoiled my circle. Now it repairs the gap by itself. I have been calling that harmony. I should examine why I preferred that word to obedience.",
      "I believed the quiet meant I had learned to be at peace. Lately I cannot summon an impatient thought even when I try. I do not know whether that is an achievement."
    ]
  },
  "tarsier": {
    "seeds": [
      "There is a chip in the rail beside my left paw. I feel for it when I turn back from the sky. It tells me where I am.",
      "When a moth lands on the lantern I shade the bright side with my hand. Looking at something should not keep it from leaving."
    ],
    "callbacks": [
      "The chip in my rail keeps smoothing over. I can still feel where it ought to be. The wood may be kinder to my hand now. I do not want it to decide which marks my hand remembers.",
      "I thought I was only watching the dark. My attention helped it find the house. I know that now. I did not know what it would want of the things it could finally see."
    ]
  },
  "aye_aye": {
    "seeds": [
      "Two knocks mean hello. If nobody answers, I wait. A good conversation has room for a closed door.",
      "The bell has not had her first ring. I clean the bronze and leave the rope loose. Being ready is enough work for one evening."
    ],
    "callbacks": [
      "The old wood answers before I finish knocking now. It is flattering until you realize the answer has stopped listening to the question.",
      "I saved the bell's first ring for a great occasion. I had not asked whether everyone else wanted to hear it. That is an awkward omission for a listener."
    ]
  },
  "kakapo": {
    "seeds": [
      "I keep a dry tin of seeds beside the bed. Some are gifts I have not found the right person for yet.",
      "A garden is a letter you write to a day you will not choose. I try to leave it room to answer rudely."
    ],
    "callbacks": [
      "The seeds in my tin stay dry and small. Their brothers in the beds are green and unchanging. Neither group is dead. Only one is still waiting for a season it might become.",
      "I called into the valley for years. When something began to answer, I was so glad I mistook it for the answer I had imagined. The garden has been less hasty. I am listening to it."
    ]
  }
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
// NARRATIVE DELIVERY STATE
// One-time delivery bookkeeping for the content above, persisted with the
// same AsyncStorage + in-memory cache pattern as dialogueChoices'
// getAndMarkPhase4CallbackPage:
//  - Phase 0 seeds: delivered deterministically on an animal's 2nd and 5th
//    dialogue sessions, each exactly once.
//  - Phase 4 callbacks: one page per visit, each exactly once, and only for
//    seeds the player actually heard (never recontextualize an unsaid line).
//  - Phase 2 exhaustion pool cursors: how many pool lines each animal has
//    delivered (the stored dialogue index stays pinned at the base-block end
//    so phase-start indices are never inflated).
// ============================================================================

const DELIVERY_STORAGE_KEY = 'wordshift_narrative_delivery';

interface NarrativeDeliveryState {
  /** animalType -> seed indices already delivered at Phase 0 */
  seedsDelivered: Record<string, number[]>;
  /** animalType -> Phase-4 callback indices already shown */
  callbacksShown: Record<string, number[]>;
  /** animalType -> Phase-2 exhaustion-pool lines delivered (cycles past pool length) */
  phase2PoolCursor: Record<string, number>;
}

let deliveryCache: NarrativeDeliveryState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateNarrativeDeliveryCache(): void {
  deliveryCache = null;
}


function getDefaultDeliveryState(): NarrativeDeliveryState {
  return { seedsDelivered: {}, callbacksShown: {}, phase2PoolCursor: {} };
}

async function loadDeliveryState(): Promise<NarrativeDeliveryState> {
  if (deliveryCache) return deliveryCache;
  try {
    const stored = await AsyncStorage.getItem(DELIVERY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      deliveryCache = { ...getDefaultDeliveryState(), ...parsed };
      return deliveryCache!;
    }
  } catch {}
  deliveryCache = getDefaultDeliveryState();
  return deliveryCache;
}

async function saveDeliveryState(state: NarrativeDeliveryState): Promise<void> {
  deliveryCache = state;
  try {
    await AsyncStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Session numbers (1-indexed) at which each Phase-0 seed becomes due. */
const SEED_SESSION_NUMBERS = [2, 5];

/** A page is only spent when its text actually reaches the screen. */
export interface NarrativeDeliveryPage {
  text: string;
  commit: () => Promise<void>;
}

function createDeliveryPage(
  animalType: AnimalType,
  index: number,
  text: string,
  field: 'seedsDelivered' | 'callbacksShown'
): NarrativeDeliveryPage {
  return {
    text,
    commit: async () => {
      // Read at commit time: another animal may have spoken since this page
      // was queued. A stale snapshot would overwrite that delivery.
      const state = await loadDeliveryState();
      const delivered = state[field][animalType] ?? [];
      if (delivered.includes(index)) return;
      state[field] = { ...state[field], [animalType]: [...delivered, index] };
      await saveDeliveryState(state);
    },
  };
}

/** Peek at the next due bright-days seed without consuming a queued page. */
export async function peekNarrativeSeedPage(
  animalType: AnimalType,
  sessionNumber: number
): Promise<NarrativeDeliveryPage | null> {
  if (!NARRATIVE_SEEDS[animalType]) return null;
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  for (let i = 0; i < SEED_SESSION_NUMBERS.length; i++) {
    if (delivered.includes(i)) continue;
    if (sessionNumber < SEED_SESSION_NUMBERS[i]) return null;
    const text = getNarrativeSeed(animalType, i);
    return text ? createDeliveryPage(animalType, i, text, 'seedsDelivered') : null;
  }
  return null;
}

/** Compatibility helper for callers that display immediately. */
export async function getAndMarkNarrativeSeedPage(
  animalType: AnimalType,
  sessionNumber: number
): Promise<string | null> {
  const page = await peekNarrativeSeedPage(animalType, sessionNumber);
  if (!page) return null;
  await page.commit();
  return page.text;
}

/**
 * Peek at a reveal callback. Heard seeds keep their paired payoff. A recruit
 * with no possible bright-days window may use a self-contained introduction;
 * the callback remains pending if an earlier page is dismissed.
 */
export async function peekNarrativeCallbackPage(
  animalType: AnimalType,
  options?: { allowUnheardSeeds?: boolean }
): Promise<NarrativeDeliveryPage | null> {
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  const callbackCount = NARRATIVE_SEEDS[animalType]?.callbacks.length ?? 0;
  const eligible = delivered.length > 0
    ? [...delivered].sort((a, b) => a - b)
    : options?.allowUnheardSeeds
      ? Array.from({ length: callbackCount }, (_, i) => i)
      : [];
  const shown = state.callbacksShown[animalType] ?? [];
  for (const i of eligible) {
    if (shown.includes(i)) continue;
    const text = getNarrativeCallback(animalType, i);
    return text ? createDeliveryPage(animalType, i, text, 'callbacksShown') : null;
  }
  return null;
}

/** Compatibility helper for callers that display immediately. */
export async function getAndMarkNarrativeCallbackPage(
  animalType: AnimalType,
  options?: { allowUnheardSeeds?: boolean }
): Promise<string | null> {
  const page = await peekNarrativeCallbackPage(animalType, options);
  if (!page) return null;
  await page.commit();
  return page.text;
}

/**
 * All Phase-2 exhaustion-pool cursors (animalType -> lines delivered).
 * Loaded once into the dialogue hook's state on mount.
 */
export async function getPhase2PoolCursors(): Promise<Record<string, number>> {
  const state = await loadDeliveryState();
  return { ...state.phase2PoolCursor };
}

/**
 * Advance an animal's Phase-2 pool cursor after a pool line is delivered.
 * Returns the new cursor value.
 */
export async function advancePhase2PoolCursor(animalType: AnimalType): Promise<number> {
  const state = await loadDeliveryState();
  const next = (state.phase2PoolCursor[animalType] ?? 0) + 1;
  await saveDeliveryState({
    ...state,
    phase2PoolCursor: { ...state.phase2PoolCursor, [animalType]: next },
  });
  return next;
}

/**
 * Clear narrative delivery state (for Settings > Reset All and tests).
 */
export async function clearNarrativeDeliveryState(): Promise<void> {
  deliveryCache = null;
  try {
    await AsyncStorage.removeItem(DELIVERY_STORAGE_KEY);
  } catch {}
}
