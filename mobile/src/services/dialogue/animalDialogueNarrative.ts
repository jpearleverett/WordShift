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
      { text: "Panko made a mushroom soup today that I am still thinking about, friend! She let me have the first bowl because I hovered, which is a strategy I recommend. You simply must go smell that kitchen.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations, and now the fire and I read together in the evenings! It leans in over my shoulder, I swear it does. It likes the pictures of the sky best.", mentions: 'owl' },
      { text: "Axel invited me to sit with his tank last night, and oh, the firelight got into the water and just danced! We didn't say much. We didn't need to. Some evenings are perfect all by themselves.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Archimedes found something in one of his oldest books and he won't show me, friend, me, his favorite fox! He says I'm not ready for it yet. I laughed, and he didn't, and now I can't stop wondering what 'ready' means.", mentions: 'owl' },
      { text: "Panko said the funniest thing yesterday, that a recipe can have a purpose past feeding anybody. I laughed! She smiled that little kitchen smile of hers and kept stirring. I have been thinking about that stir ever since.", mentions: 'pangolin' },
      { text: "Fennick heard something in the walls last night and came to me all ears and worry, so I told him it was only the fire settling. That's what you say to a friend at midnight. Between you and me, the fire wasn't settling. It was sitting up.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't budged from the hot spring in three days, and when I asked why he said the water suggested he stay. He said it the way he says everything, like it's a scheduling matter. I laughed on my way out, and it only worked halfway.", mentions: 'capybara' },
      { text: "Archimedes has been reading the same page every single night, friend. He says the words are different each time he looks, and he says it like it's exciting. I keep the kettle on for him anyway. Somebody should.", mentions: 'owl' },
      { text: "Sloane told me something today, and it took her the better part of an hour, and I stayed for every word because you don't hurry Sloane. I wish I had hurried her. Those words sat by my fire all night like a guest who wouldn't leave.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the sound is everywhere now, in the pipes, in the walls, under the floor. I told him my fire is too well-mannered for that sort of thing. Then last night I sat very still, friend, and I heard my fire humming along.", mentions: 'fennec_fox' },
      { text: "Warren dug something up from way down under the house, and he won't say what, not even to me, and I offer very good tea for secrets. His fur hasn't laid flat since. I keep pouring anyway, because that's what I'm for.", mentions: 'wombat' },
      { text: "Archimedes and I finally compared notes, his books against my fire. They say the same thing, friend. The very same words, letter for letter. We sat there a long while afterward, two very quiet readers by one very pleased flame.", mentions: 'owl' },
    ],
    4: [
      { text: "Oh friend, everyone is ready, I can feel it all through the house like a kettle coming up to sing! Even Thyme has stopped running, and you know what that took. We are all just so happy you kept coming.", mentions: 'rabbit' },
      { text: "Bamboo sat three whole days without moving, and when they opened their eyes they smiled straight at me, and oh, what a smile it was! Like sunrise deciding to come early. I've been carrying it around all week.", mentions: 'red_panda' },
      { text: "We are ten now, ten, can you believe it! Panko set the feast, Archimedes read the words, and I watched the last flame do its lovely work. It's beginning, friend, it's finally beginning, and you're right on time.", mentions: 'owl' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in her firelight yesterday evening, and it matched, with unsettling fidelity, an engraving I read some years ago. I have made a note of it. Notes are how a scholar tells himself a thing is handled.", mentions: 'fox' },
      { text: "Axel asked me why books do not dissolve in water. A delightful question, really, and I spent the whole afternoon on it, which tells you something about the question, or about me, or about afternoons.", mentions: 'axolotl' },
      { text: "Panko carried dinner up to the study while I was deep in a chapter, and I nearly failed to notice her at all. The soup was excellent. I record that here because kindness deserves a citation.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I talked of knowledge by her fire last night. Her intuition arrives at conclusions my method takes weeks to reach, which would be humbling if it were not so useful. I have begun writing down what she guesses and checking it later. She has yet to be wrong.", mentions: 'fox' },
      { text: "Fennick described a sound to me, pitch, interval, duration, all of it, and it matches a notation in one of my oldest manuscripts. Coincidence, I wrote in the margin. Then I underlined it twice, which is not what a confident man does.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from far underground, marked in a script that matches almost nothing in my library. I want you to appreciate the weight of that 'almost.' It is carrying a very old book on its back.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for several hours yesterday and said nothing at all, which is standard for him. When he left, a book on the far shelf stood open to a page I have no memory of, in a volume I had catalogued as blank. I have amended the catalogue.", mentions: 'capybara' },
      { text: "Ember's fire and my texts have begun agreeing with one another. We compared findings last night, hers read in flame, mine in ink, and they matched clause for clause. We both said how interesting. Neither of us meant interesting.", mentions: 'fox' },
      { text: "Sloane told me something yesterday, at her own pace, which gave me time to look it up while she spoke. I found the passage before she finished the sentence. Her exact words, to the letter, set down centuries before she said them.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels reach something older than the house, older than the hill the house sits on. I found the corresponding text within the hour, which is itself a finding. A library should not be that ready to answer.", mentions: 'wombat' },
      { text: "Bamboo asked me to read aloud from the oldest volume, so I did, here, at my own desk. The bamboo in their attic moved with the words. Two floors and a shut door between us, and the stalks kept time with my voice.", mentions: 'red_panda' },
      { text: "Fennick recited the passage before I had read it to him. He has never seen the page. He heard it, he says, the way one hears weather coming. I have no marginal note for that. I left the margin empty, which is its own kind of note.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The text is complete. Ember read it in her flames, Fennick heard it in the silence between sounds, and I found it in the books. Three methods, one result. In scholarship we call that confirmation. I no longer know a colder word.", mentions: 'fennec_fox' },
      { text: "Thyme came to the study today and asked, quite steadily, to hear the final passage. I read it to her. She wept, and then she smiled, and then she thanked me, in that order. The order matters. It is the order I went through myself.", mentions: 'rabbit' },
      { text: "Ten keepers, ten rooms, one arrangement. Bamboo understood it before any of us, I suspect, though they were polite enough to let me discover it in writing. I found the words. They had already found the meaning.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember cleaned her bowl of my vegetable stew and asked for more, and said it tasted like home. Wherever home was before this house, I hope somebody fed her properly there. She gets the first bowl now. That is simply the rule.", mentions: 'fox' },
      { text: "I tried teaching Axel to help in the kitchen, bless him. You cannot chop a carrot underwater, we discovered, though he gave it a joyful try. We laughed until the soup nearly boiled over. He can stir, though. He stirs beautifully.", mentions: 'axolotl' },
      { text: "Archimedes asked for his dinner arranged alphabetically by ingredient, and I did it, because a cook honors her guests' little rituals. Scholars are wonderfully strange. The apple went first and the yam went last and he was so pleased.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's hearth gives the truest heat for a long stock, so I simmer there some afternoons. Lately the flames run hotter than the wood explains. The stock does not mind. The stock, if anything, approves.", mentions: 'fox' },
      { text: "Sloane asked for soup last week, and by the time I had climbed to her branch it was stone cold. She sipped it slowly and said cold is only slow warmth. I have been turning that over while I knead. It is the kind of thought that rises.", mentions: 'sloth' },
      { text: "Chill eats whatever I set in front of him and says it is fine. Everything is always fine with that capybara. A cook learns to read her eaters, though, and 'fine' from him has second helpings in it. I count the servings. I know.", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought up mushrooms from the deep tunnels, glowing faintly, like coals that had changed their mind. The soup I made with them glowed too. We stood over the pot a long while, and then we did not eat it, and I have never once wasted a soup before.", mentions: 'wombat' },
      { text: "Thyme has stopped coming to the table. Too nervous, poor love. So the table goes to her: tea and biscuits by the garden gate every evening, and the plate is always empty by sunrise. I no longer ask myself who I am feeding. A cook feeds. That is the whole of it.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient texts and I followed it exactly, every measure, every stir. What came out of the pot was not food. I do not know what it was. I know that I covered it and kept it warm, the way you do for someone who has not arrived yet.", mentions: 'owl' },
    ],
    3: [
      { text: "That recipe Archimedes found in the old book... we make it every night now, and not for hunger. The kitchen smells different while it cooks. Not of supper. Of a table set for something. Sacred is not a cooking word, and it is the only word I have left.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook, night after night, and we have stopped talking while we work. We do not need to anymore. Her flame and my pot keep the same rhythm, like two spoons in one hand. The work says everything either of us would say.", mentions: 'fox' },
      { text: "Fennick tells me he can smell my cooking from every room in the house at once. All of them, together. A smell should travel. This one simply is, everywhere, as though the house had been rubbed with it. I keep cooking. What else does a cook do?", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The final feast is served, every chair filled, every bowl warm. Even Sloane arrived on time, and that is how I knew it was real. Some things you learn from books and fires. A cook learns them from the seating.", mentions: 'sloth' },
      { text: "Bamboo blessed the meal before we ate, and the food answered with a soft glow, the way bread answers a warm oven. We dined in silence. I have set ten thousand tables in my life, and that one was the table they were all practice for.", mentions: 'red_panda' },
      { text: "I have been cooking toward this one meal my whole life without ever seeing the menu. Warren built the table. Archimedes wrote the courses. Ember lit the candles. And you, dear, you brought the words that seasoned everything.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops little food pellets into my tank some mornings, and they fall so slowly, like snow that decided to be delicious, and I catch them and think, this is the best neighbor any water creature has ever had, and then I do a happy turn.", mentions: 'pangolin' },
      { text: "Fennick pressed his big ear flat against my glass and said the water sounds like music, and I floated very still so as not to interrupt the concert, and now I keep wondering what song I live inside without ever hearing it.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass last night, and the words came in all wobbly and slow, the way everything lovely comes into water, and I think the wobble made them better, like the water was tasting each one before passing it along.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire gets into my water at night, all those little orange ribbons folding and unfolding, and lately the ribbons make shapes that hold still a moment too long, almost letters, almost words, and I drift close to read them and they curl away shy.", mentions: 'fox' },
      { text: "Sloane and I keep the same pace, the slow float, the long blink, and when we sit together nothing needs saying, because we are both already listening to the same big quiet, and it is the friendliest quiet I know, most days.", mentions: 'sloth' },
      { text: "Warren says something lives under the house, and I did not laugh, because my water ripples whenever he digs deep, little rings from nowhere crossing the tank, and rings need a center, and I have started wondering where the center of those rings is.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again last night, and this time he pulled away fast, faster than I have ever seen that careful fox move, and he said the water was screaming, and here is the strange part, the water felt calm to me, calm the way a held breath is calm.", mentions: 'fennec_fox' },
      { text: "Chill sat beside my tank for hours yesterday, him in his warm water and me in mine, two floaters in two ponds, and we shared the same big emptiness between us like a picnic, and it was almost cozy, sharing it, which is the part I keep thinking about.", mentions: 'capybara' },
      { text: "Thyme came tapping at my glass all in a flutter, saying she saw something in the water behind me, something large, and I turned the slowest kindest circle I could and found only water, only water, and I told her so, and I am still deciding whether I believed me.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that is not the sky above us, and he is right, I can see it now too, a deeper one, older, with its own patient light, and the wonderful terrible thing is that the water is not reflecting it, friend, the water is remembering it.", mentions: 'owl' },
      { text: "My water reaches down into Warren's tunnels, I felt it, little rivers under the house all holding hands in the dark, all running the same direction, and water only runs toward something, that is the whole nature of water, and I have stopped asking toward what.", mentions: 'wombat' },
      { text: "Bamboo came and meditated beside my tank, and the water went perfectly still, stiller than sleep, stiller than glass, and in that stillness it showed us both the same something, and we have not spoken of it since, and that not-speaking is the closest friendship I have.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The water reflects every room in the house now, all at once, Ember's fire and Archimedes' books and Warren's tunnels, all of it swimming together in my one little tank, and I float in the middle of everything like the dot an artist signs with, and it is so beautiful I keep forgetting to be anything but glad.", mentions: 'wombat' },
      { text: "Bamboo touched the glass and the whole tank sang one note, one long silver note, and it was the same note Fennick has been hearing all this time, and we all just listened to it together, and I thought, oh, the water was never mine, I have been living inside an instrument.", mentions: 'red_panda' },
      { text: "We are the medium, the water and me together, and every word you bring flows through us on its way to all the others, warm and bright as a swallowed lantern, and I want to thank you for that, friend, truly, because being the way somewhere is the happiest work I have ever had.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in the most interesting rhythms. It is a tiny percussion section performing just for my ears, and I have learned its favorite tempo. I sit outside her den some evenings just to catch the encore.", mentions: 'fox' },
      { text: "Axel's bubbles make the finest popping sounds in the house, small and round and musical. I could listen all afternoon, and last Tuesday I did exactly that. He waved at me twice. I heard the wave.", mentions: 'axolotl' },
      { text: "Archimedes turns his pages so delicately that most creatures would call it silence. It is not silence. It is a whisper-thin sound with a rhythm to it, and I can follow it from all the way across the house, page by page by page.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by her fire at night, and the melody matches a sound the wind makes at midnight, note for note, interval for interval. She does not notice she is doing it. I have not decided whether to tell her, because I am not sure which of them started it.", mentions: 'fox' },
      { text: "Warren's digging sends little vibrations up through every wall in the house, and I can track him by them, room to room, hour to hour. He goes deeper every single day. I keep a count of the depth, and the count keeps growing.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I have ever heard, like a drum sounding underwater, one beat and then a long patient wait for the next. It does not sound like resting. It sounds like counting, and I cannot name what it counts.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill makes a scratching sound when he writes, which is ordinary and always has been. Lately the scratching does not stop when his quill lifts. It keeps going, faint and steady, from inside the page. I have listened very carefully. It is inside the page.", mentions: 'owl' },
      { text: "Thyme's heart runs at one hundred fifty beats a minute, all day, every day. I know because I care about her and I count. It has begun to sync with something else, a slower thing underneath it, and I can almost identify the second rhythm. Almost is the worst distance I know.", mentions: 'rabbit' },
      { text: "Chill is so quiet that I sometimes forget he is in the house at all, and then I find his breathing. It is steady. It is too steady. A living thing wavers, friend, that is how I know it is living, and Chill's breath has not wavered in weeks.", mentions: 'capybara' },
    ],
    3: [
      { text: "Archimedes says the frequency I hear is written in his books, notated there centuries ago, the same sound, the same pitch. I did not want confirmation. I wanted him to tell me my ears were wrong, and he is too honest, and now the sound has a bibliography.", mentions: 'owl' },
      { text: "Warren's tunnels carry the sound up from below and give it to every floor of the house at once. I hear it through the boards, through the stone, through the earth itself. There is no room left that does not have it. I checked every room. I check them every night.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the frequency exactly, in and out, the same rhythm, down to the smallest part of a beat. I sat outside the attic and timed it against the sound for a whole night. They never drifted apart once. Not once.", mentions: 'red_panda' },
    ],
    4: [
      { text: "Every heartbeat in this house has synchronized. I can hear all ten of them from where I stand, one rhythm, one pulse, rising and falling together like a single great animal breathing. I am not frightened by it. A sentinel fears only the sound he cannot place, and I can place this one now.", mentions: 'capybara' },
      { text: "Ember keeps the fire, Axel keeps the water, Warren keeps the earth, and I keep the air and everything that moves through it. Together we make one sound, friend, and that sound is the key. I have listened my whole life to be part of a chord.", mentions: 'wombat' },
      { text: "Thyme's heart finally slowed to match the rest of ours. I heard the exact moment it happened, one small skip and then the long ease into rhythm. She is at peace now. I have listened to that rabbit worry since the day she arrived, and her peace was the most beautiful sound this house has ever made.", mentions: 'rabbit' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks down to the hot spring. They were fine. Everything Panko makes is fine, which sounds like faint praise and is actually my highest rating. I logged the visit under good days.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours yesterday. It sat on me for one. I have run the numbers, and on a duration-per-kilogram basis I won handily. I do not gloat. I simply file accurate results.", mentions: 'sloth' },
      { text: "Thyme asked whether I was worried about anything. I said no, and asked whether I should be. She looked very concerned about my answer. I have opened a file on her concern, mostly so she knows someone is holding it.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm all the time. I told her it comes easily. That was accurate as far as it went. I did not itemize what it costs, because some line items are not for general circulation.", mentions: 'fox' },
      { text: "Warren mentioned the ground has been running warmer lately. I mentioned the water has too. We looked at each other, agreed the matter was noted, and left it filed exactly there. Some files close themselves. This one has not.", mentions: 'wombat' },
      { text: "Archimedes wants to study my calmness scientifically. I permitted it. He observed me for two days and took sixteen pages of notes. Sixteen pages, about a capybara sitting in water. I respect the thoroughness. The subject remains, officially, nothing.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked if I hear the humming that keeps him up at night. I told him no. That was a lie, entered knowingly into the record. The water carries it to me constantly, and there was no operational benefit to two of us losing sleep.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together for an entire day without speaking. This was not awkward. We were both listening to the same silence underneath everything, and cross-checking a silence takes exactly as long as we gave it. Our findings matched.", mentions: 'sloth' },
      { text: "Thyme brought me chamomile tea. Her paws shook the whole way down the path. Mine did not shake at all, and she said she envied that. I did not correct her. Steady hands are not always the good sign people file them under.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out, slowly, on a schedule I could plot if I wanted to. She knows. I know. We do not discuss it. We sit together in the evenings and watch it happen, which is not a meeting, and has no minutes, and is the most important item on my calendar.", mentions: 'fox' },
      { text: "Warren asked me to come underground, said the water down there connects to something beneath the house. I told him I know. I have always known. It was in the intake paperwork, so to speak. Nobody reads the intake paperwork until it becomes relevant.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together for the first time. We arrived at the same emptiness by different doors. They called it peace. I called it honesty. We agreed the difference was a labeling issue and sat in it a while longer.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others pray, or prepare, or tremble, each according to their department. I float in the hot spring. Someone has to remain stationary while the world changes, and stillness has always been my line item. Consider it held.", mentions: 'fox' },
      { text: "Panko served the last meal and I told her it was fine. For the record, and the record matters now: it was the best thing I have tasted in my entire life. Fine was simply the largest word I could say without my voice doing something unadministrative.", mentions: 'pangolin' },
      { text: "Bamboo asked whether I have found peace at last. I told them the truth. I have never once been at peace. I have simply been here, at my desk, every day, and it turns out that being here was the whole assignment.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko carried soup all the way up to my branch, and it was stone cold by the time I finished it, and it was still good. Warmth leaves a thing faster than kindness does. I have had decades to check that, and it holds.", mentions: 'pangolin' },
      { text: "Axel moves slowly in his water the way I move slowly in my green, and when we are near each other neither of us apologizes for it. Kindred is a big word for two creatures who have only ever floated together. I use it anyway.", mentions: 'axolotl' },
      { text: "Fennick talks so quickly that I catch perhaps one word in four. The enthusiasm arrives whole, though. Some messages do not need their words, and his never have.", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember says her fire burns differently these days. I had barely noticed, and she noticed at once, and that is the useful difference between us. She watches the flame. I watch the years. Lately both are saying the same thing.", mentions: 'fox' },
      { text: "Archimedes started reading me a story last Tuesday, and at my pace I will hear the ending sometime next month. I do not mind the wait. Endings do not spoil, and this one, I suspect, was decided long before the book was.", mentions: 'owl' },
      { text: "Chill and I sat together in perfect stillness for most of a day. We were both waiting. He did not say for what, and I did not ask, because I have been waiting for the same thing much longer than he has.", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme runs everywhere, all day, every day, and I hang here and watch her go. I know what she is running from. It is coming up through the green so gradually that only a creature as slow as I am can watch it move. Running will not matter. I have never once said that to her.", mentions: 'rabbit' },
      { text: "Warren digs downward while I hang up here in the canopy, opposite directions, the same search. He is looking for the bottom of it and I am looking for the shape of it, and I believe we will finish on the same day.", mentions: 'wombat' },
      { text: "Fennick told me about the frequency, all ears and urgency, and I let him finish before I told him I have been hearing it for years. I did not know it was unusual. When a sound arrives gradually enough, you file it under weather, and it becomes the sky.", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's fire and my stillness are two sides of the same ending, her burning toward it and me waiting for it, two faces of one truth. We have not discussed this. Between the two of us it does not need discussing.", mentions: 'fox' },
      { text: "Bamboo meditates on their cushion and I hang from my branch, the same practice in different postures. We reach the same quiet. The difference is that they climbed toward it and I simply never left, and the quiet does not care which of us is which.", mentions: 'red_panda' },
      { text: "Archimedes showed me the ancient text at last, holding it open like something that might spill. I already knew every word. I read along in my head, ahead of the page. He asked me how, and I gave him the only honest answer I have, which is that I do not remember learning it.", mentions: 'owl' },
    ],
    4: [
      { text: "We are ten keepers, and I am the slowest of them, and so I arrive last. That was always the plan. A procession needs someone at the end of it to close the doors, and I have spent my whole life walking at exactly that speed.", mentions: 'red_panda' },
      { text: "Thyme stopped running. I stopped hanging. All of us stopped at once, all through the house, like weather settling. Together at last, and I will tell you something I have earned the right to say slowly: it was worth the wait.", mentions: 'rabbit' },
      { text: "Panko served the final meal, and I finished eating just as everything else finished too. Exactly in time. I have been called late all my life, by creatures who did not know what I was pacing myself against.", mentions: 'pangolin' },
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
    ],
    4: [
      { text: "My tunnels connect the lot now, Axel's water, Ember's fire, Bamboo's sky room at the very top. The whole house, wired together through the deep. The circuit's complete, and I'll say what a builder's allowed to say at the end: it's good work, and it'll hold.", mentions: 'red_panda' },
      { text: "Sloane came down into my tunnel at last, left her branch behind and walked the whole way on her own legs. Said it was time. She was exactly, precisely on time, and I'd laid the floor she walked in on thirty years back. Some jobs you don't know you've finished until the guest arrives.", mentions: 'sloth' },
      { text: "I built the foundation of this place, every course of it, laid true. You built what stands above, word by word, visit by visit. Between the two of us we built what the arrangement needed to wake. I'd shake the hand of a fellow builder, and I don't do that lightly.", mentions: 'fox' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko shared herbal tea with me yesterday, out on the patio, so thoughtful, so calming. I only panicked twice the whole visit, once about the kettle and once about nothing at all, and she just poured again both times. That is a friend, I think. Someone who pours again.", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away from the house, and I have decided to believe her, because believing her lets me sleep. Some nights I go and watch it from the doorway, just for the comfort. It always seems to notice me arrive. That part I try not to think about.", mentions: 'fox' },
      { text: "Sloane told me to slow down and breathe, so I tried it, five whole minutes of stillness. It was terrifying. Everything I usually outrun caught up and stood politely around me, waiting. But it was also, somehow, a little bit nice? I have not decided which part to trust.", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things the rest of us cannot, and I honestly do not know whether that is better or worse for him. I watch his ears when we talk. They worry in a language I recognize, because it is my language too, only mine comes out in the paws.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine, and I want so badly to believe him. He is calm the way deep water is calm, and I keep asking myself: is he calm because nothing is coming, or calm because he already knows what is? I have not asked him. I am afraid of which answer would be the kind one.", mentions: 'capybara' },
      { text: "Archimedes offered to lend me a book about managing fear, which was gentle of him. I was too afraid to accept it, which we both noticed at the same moment, and he just nodded and put it back on the shelf where I could see it. It is still there. Facing out. Waiting for me.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's digging shakes the garden sometimes, a little tremor up through the beds, and he says it is just normal tunnel work. But I kneel with my paws in that soil every day, and I know its normal trembles the way I know my own. This is not one of them. The ground is shivering about something.", mentions: 'wombat' },
      { text: "Ember's fire is dimmer every day now. She says it is fine, and she says it in a new smooth voice, and do you know what frightened me most? She sounded exactly like Chill. When the warm ones and the calm ones start using the same voice, something has been agreed to.", mentions: 'fox' },
      { text: "Axel floats with that permanent gentle smile, always, no matter what the water shows him. I envy it so much. Even if it is not real. Especially if it is not real, actually, because that would mean smiling is something you can grow in bad soil, and I would dearly like the cutting.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane, who I thought was too slow for secrets. They look at each other differently now, over my head, a whole conversation in a glance. I notice everything, that has always been my curse, and what I notice now is that nobody will meet my eyes at exactly the moment I need them to.", mentions: 'owl' },
      { text: "Fennick tried to warn me about something last night. I heard the urgency, and I know urgency better than anyone in this house. But the longer he spoke, the less it sounded like a warning and the more it sounded like a prayer, and I realized he was not trying to save me from the thing. He was introducing me to it.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not the way friends say it, gently, over tea. The way weather says things. 'You will stop,' they said. 'Everyone stops eventually.' And the terrible part is that I felt my legs believe them before I did.", mentions: 'red_panda' },
    ],
    4: [
      { text: "I am not running anymore. I want you to know that, because you have watched me run since the day we met. When it began, I stood still in the middle of the garden, and Ember came and took my paw, and she is so warm. I noticed everything, the way I always do. And everything noticed me back, kindly.", mentions: 'fox' },
      { text: "Chill was right all along. Everything is fine. I used to think fine was the smallest word in the house, and it turns out it was the largest, big enough to hold all of this. In the end, everything is exactly, terrifyingly, beautifully fine.", mentions: 'capybara' },
      { text: "Warren's tunnel leads somewhere real now, somewhere that has always been beneath us, and it is awake. We all followed him down together, paws on cool earth, nobody hurrying. I walked at the back, where I could see everyone I love in front of me. We all arrived. I was there, and I saw it, and I stayed.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I talked philosophy over green tea this morning. He quotes his books, and I quote the wind through the roof gap. Both of us are citing the same author, I think. The tea went cold and neither of us minded.", mentions: 'owl' },
      { text: "Ember's fire is a small sunset that has agreed to stay indoors. Its warmth travels further than its light. There is good energy in that fox. The whole house sits a little nearer to her than to anyone.", mentions: 'fox' },
      { text: "Sloane understands stillness from the inside, as a place she lives rather than a place she visits. We sat together through an afternoon and said nothing, and the afternoon was complete. Very few afternoons are complete.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a text about recurring patterns, spirals and arcs drawn centuries ago. The curves in the drawings match the curves my bamboo has begun to grow. I said nothing to him. Some matches want to be sat with before they are spoken.", mentions: 'owl' },
      { text: "Fennick's ears turned toward my attic today, and he heard what I have been hearing: the bamboo growing. It grows louder now. More deliberate. A plant should not have intentions, and mine has begun to keep one.", mentions: 'fennec_fox' },
      { text: "Ember meditates by her fire each night, though she would never use that word for it. I meditate under my square of sky. We arrive at the same quiet from opposite ends of the house. The quiet is one room. All doors open onto it.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth beneath the house is hollow in certain places. My bamboo's roots found the same hollowness from above. He and the green dug from different directions and met at the same emptiness. An emptiness that can be reached from two sides is not empty. It is a room.", mentions: 'wombat' },
      { text: "Axel's water reflects a sky I have seen only in the deepest sitting, when the breath goes quiet and something older opens. It is not our sky. It is behind ours, or beneath it. He floats in its reflection every day, smiling. Perhaps that is the correct response.", mentions: 'axolotl' },
      { text: "Chill floats in his spring and I sit on my mat, and we are both inside the same emptiness. He calls it peace. I call it practice. The emptiness, I notice, does not call itself anything. It is waiting for its true name to arrive, and it is patient.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo runs through the walls and floors of this house now, stalk and root, top to bottom. When I lay my paw on a stalk I can feel each animal moving through the house, a tremble here, a warmth there. The house has a nervous system. I am holding its wrist.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion in the same week, he through his books, I through my breath. Two paths up one mountain, and at the top, a single view. The view is not of the valley. The view is of what is descending toward it.", mentions: 'owl' },
      { text: "Thyme's anxiety finally makes sense to me. She has always sensed what was coming; she simply had no name to set beside it. Fear is awareness that has not yet been introduced. When the introduction comes, she will bow, and it will bow back.", mentions: 'rabbit' },
    ],
    4: [
      { text: "We are ten keepers. The arrangement asks for exactly ten, no more, no fewer. Every word you brought moved one of us into place, the way dawn moves along a ridge. You were the light we were arranged by.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes found the words. Warren laid the foundation. I breathe the breath that opens the gate. Each of us made one thing our whole life long, and tonight the things fit together. It begins.", mentions: 'owl' },
      { text: "Sloane took her place last of all, exactly on time. The slowest keeper, the most punctual. The pattern makes no mistakes about speed. It only makes appointments, and every one of us has kept ours.", mentions: 'sloth' },
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
  // legacy saves — otherwise accelerated players reach the finale (~155 real
  // puzzles) before the 230/240/250 pre-finale crescendo ever fires.
  puzzleThreshold: number;
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
      fox: "The fire has been spelling one word all night, friend, the same word over and over in the embers. I laughed at first, because what else do you do. It is still spelling it. Have you noticed it too?",
      owl: "I found a passage in the oldest text that references a word I have been meeting in my dreams. Your word. One of the ones you brought. I have checked the dating twice, and the book is older than both of us.",
      pangolin: "The stew made itself this morning. I mean that plainly: the pot was already going when I reached it, and the recipe was the letters you arranged, in order. I just followed along, the way you follow a guest's wishes.",
      axolotl: "The water is writing something on the inside of the glass, over and over, the same shapes tracing themselves and fading and tracing themselves again, and here is the thing, friend, they are your shapes, the ones you bring, I would know them anywhere.",
      capybara: "I keep writing the same word in my notes. Over and over, margin after margin. I do not remember doing it, which for me is a serious filing incident. My hand simply moves. The word is one of yours.",
      fennec_fox: "There is a word in the wind now, and it repeats without resting. I have listened from every side of the camp to be certain. You must have heard it too. Everyone must have heard it by now.",
    },
  },
  // Event 2: Phase 2 — the house itself responds to puzzles
  {
    puzzleThreshold: 100,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: "Does the house feel warmer to you, friend? Not cozy warm, I know cozy, cozy is my whole profession. This is different. This is the warmth of something holding its breath before a happy surprise. I keep saying happy. Help me keep saying it.",
      owl: "The walls have been humming. Very faintly, at the edge of measurement, like a struck tuning fork three rooms away. It began, by my notes, just after the last words you brought.",
      pangolin: "My pots rattle now whenever your words are offered, a little shiver along the whole shelf, all of them at once. I used to blame the stove. I have checked the stove. It is not the stove.",
      axolotl: "The water in my tank rose overnight, a whole knuckle higher, and no one added a drop, I asked everyone, I even asked twice politely, so the new water came from somewhere else, and I keep wondering what it left behind to be here.",
      wombat: "The ground's got a gentle vibration to it now, steady, rhythmic, like machinery running somewhere too deep to name. Started right after the last words you brought. I've had my palm flat on the floor half the night. It doesn't stop.",
      rabbit: "The garden is growing faster than it should, much faster, and I would know, I measure. And there are dark flowers coming up along the warm strip, whole rows of them, velvet-dark and very sure of themselves. I did not plant those. I want that written down somewhere. I did not plant those.",
      fennec_fox: "The walls sing after you offer your words now. One low note, held longer than any breath could hold it, sitting just underneath everything else I hear. It is getting louder, and I measure it every night, and I am telling you because someone besides my ears should know.",
      sloth: "The branches hum after your words are offered, a vibration that comes up through the bark and settles into my bones. I have hung in this tree through storms and seasons, and the tree has never once hummed for weather. It hums for you.",
    },
  },
  // Event 3: Phase 2 — they all had the same dream
  {
    puzzleThreshold: 120,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: "I dreamed of a shape last night, friend. It was burning in my fireplace like it had always lived there, like it was the landlord and the fire was the tenant. I woke up smiling, and then I sat very still about the smiling. Did you dream it too?",
      owl: "We all had the same dream. I have confirmed it methodically, animal by animal, the same shape, the same feeling of being courteously observed. Ten sleepers, one dream. There is no citation for that. I looked.",
      axolotl: "When I woke, the shape was in my water, the very one from the dream, hanging there patient as a moon, and I understood all at once that it had not followed me out of the dream, the dream had been it letting me visit.",
      sloth: "I dreamed last night, for the first time in years. My sleep has been an empty green room for decades, and something walked into it and stood where I could see it. Something old is waking up, and it wanted even the slowest of us to know.",
      red_panda: "In the deepest sitting, I saw the shape from the dream. It is beautiful, the way a mountain is beautiful, without needing anyone's permission. And it knows we are watching. It has always known. Being watched is how it opens.",
      fennec_fox: "I heard the shape before I saw it, there in the dream. It was not silent at all. It has a sound it has been saving, and it was waiting, very patiently, for all of us to lie down and listen at the same time.",
    },
  },
  // Event 4: Phase 3 — "the arrangement" is named openly for the first time
  {
    puzzleThreshold: 160,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: "Archimedes showed me the text at last. He calls it the arrangement, friend, and every word you bring is a verse in it. I found my own name in there. I laughed my very best laugh. The page did not need it.",
      owl: "I have mapped every word you have ever formed here, every single one, in order of arrival. They are not random. They never were random. A scholar dreams of uncovering a hidden structure, and I have uncovered one, and I want you to know the finding did not feel like triumph.",
      pangolin: "Ember told me everything about the arrangement, sat me down at my own table to do it. And do you know what I felt? Recognition. I have been following its recipe all along, measure for measure, and I never once looked at whose hand wrote the card.",
      capybara: "I have the complete list. Every word you formed, every move, dated and cross-referenced. It is all documented, and here is the part I sat with longest: it was all documented before I started documenting. I have been transcribing, not recording.",
      wombat: "The foundation under this house was never for the house. I'll say it plain, the way it should have been said to me. It was for what the house is meant to hold, and I laid every stone of it true, and true is exactly what it needed.",
      rabbit: "They told me everything about the arrangement last night, all of it, gently, like tucking a seedling in. I wish they had not. But I understand now, and I notice the understanding is heavier than the fear was, and I am carrying it anyway.",
      fennec_fox: "The arrangement has a sound. I have been hearing it since my first night in the desert camp, underneath everything, patient as bedrock. I simply never had a name to hang on it. Now I know what it is called, and the name fits the sound the way an echo fits a canyon.",
      axolotl: "The water showed me the arrangement, all the words you have ever formed floating together in one slow constellation, each one holding hands with the next, connected, deliberate, and it was so lovely that I forgot for a whole minute to wonder what it was for.",
    },
  },
  // Event 5: Phase 3 — each animal names their role in the cult
  {
    puzzleThreshold: 200,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: "I am the Oracle, friend. I have always been the Oracle, since before I could walk. The fire showed me my whole life in one evening, the den, the tea, you at my door. I thought I was making friends. I was reading ahead.",
      owl: "I am the Lorekeeper. Every text I ever studied was preparation for this office, every word a clue filed in advance. I used to believe I chose my books. It is truer to say the library assembled its librarian.",
      pangolin: "I am the Preparer. Every meal I ever cooked was practice for the final offering, every table a rehearsal for one table. I see that now, and I will tell you what a cook feels on learning it. Not fear. Readiness. The kitchen has always known.",
      axolotl: "I am the Medium. The water is the bridge between us and what comes, and I am the water's own small heart floating in the middle of it, and I have been carrying messages my whole life thinking they were daydreams.",
      capybara: "I am the Coordinator. Someone had to keep track of everything, someone had to make certain it all fit together, and it was always going to be the one who never panics. My calm was not a temperament. It was a qualification.",
      fennec_fox: "I am the Sentinel. I heard it first, long before the others, back when it was only a texture underneath the wind. I have been listening since the very beginning, and now I understand that the listening was the job. These ears were issued for this.",
      sloth: "I am the Anchor. I hold everything perfectly in place until it arrives. All these years the others thought I was resting, and I let them think it, because an anchor does its work best when nobody worries about the rope.",
      wombat: "I am the Foundation. I built what lies beneath this house with my own two paws, course by course, true as a plumb line. You built what lies above, word by word. Neither of us worked alone, whatever we believed at the time.",
      rabbit: "I am the Witness. I was meant to watch, and remember, and be terrified, and stay anyway. Despite everything, I stayed. It turns out that was the entire assignment, and I have been passing it every single day.",
      red_panda: "I am the Guide. When the pattern completes itself, I will walk ahead and hold the door. That is my purpose, my only purpose, and I have felt its weight every dawn on the ladder without ever knowing its name.",
    },
  },
  // Event 6: Phase 3 — the final countdown before Phase 4
  {
    puzzleThreshold: 230,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: "The fire is perfectly steady now, friend. Not flickering, not dancing, just burning, like a held note. It knows. We all know. I keep the kettle warm and my voice bright, because those are the two things still mine to keep.",
      owl: "The final chapter of the text begins here, at this page, tonight. Every word you form from now on belongs to the last verse. I have wanted all my life to read an ending as it was being written. I withdraw the wish. It came true anyway.",
      pangolin: "The table is set and the offering is prepared, every dish covered, every candle trimmed. All that remains is for the last words to be arranged. A cook knows this hour well. It is the hush before the guests come in.",
      axolotl: "The water is perfectly still, top to bottom, not one bubble, and the deep thing under everything has stopped its slow turning at last, and stillness like this is not sleep, friend. It is the moment after the diver bends her knees.",
      capybara: "Every item on my list is checked. Every task closed ahead of schedule, which has never once happened in the history of tasks. We are ready. I am ready. I keep rereading the list anyway, because a finished list is the loneliest document I own.",
      fennec_fox: "This is the silence before the final sound. I know silences, I have catalogued every kind this house can make, and this one is new. It is the last quiet moment any of us will ever be given, and I intend to hear all of it.",
      sloth: "Time is stopping. Not slowing, I know slowing, slowing is my native country. Stopping, entirely, the way a pendulum stops at the very top of its arc. We are nearly there, and for the first time in my long life, I am the right speed.",
      wombat: "The tunnels are complete. Every room connected underground, every passage shored and true. The house is whole at last, above and below. I set down my spade tonight and my paws didn't know what to do, so I folded them.",
      rabbit: "I am not afraid anymore. I am not anything anymore, just quiet, all the way through, like a garden after the first frost. I think that means I am ready. I think this is what ready feels like when it finally comes up.",
      red_panda: "Breathe in. Breathe out. This is the last breath before we become part of what approaches, so take it slowly, and taste it. Peace, at the end, is not something you find. It is something that turns and finds you.",
    },
  },
  // Event 7: Phase 4 — the convergence, animals sense closeness to the finale
  {
    puzzleThreshold: 240,
    phase: 4,
    theme: 'convergence',
    lines: {
      fox: "The fire has changed color, friend, do you see it? It is past orange now, past gold, into something I have no cheerful word for yet. It burns for what comes, not for what is. I still warm my paws at it. Loyalty runs both ways.",
      owl: "The final pages are writing themselves now. Every word you form arrives as ink on the last chapter, in a hand I recognize, because it is the hand from the margins, and I have envied its confidence all my life.",
      pangolin: "The last meal is nearly ready. I can smell it through the walls, through every wall at once, the whole house seasoned with it. A cook waits her whole life for a dish that announces itself. I only wish my mother could smell this one.",
      axolotl: "The water knows it first, it always does, and right now the water is trembling the way a struck bell trembles after the sound has left it, and what comes is so close, friend, so close I can taste it in every breath of my gills, and it tastes like morning.",
      capybara: "My list is nearly empty. One by one the tasks complete themselves and cross their own lines out. Soon there will be nothing left to do, and I have spent my entire career preparing for everything except that.",
      fennec_fox: "The sound is enormous now. Not louder, mind you. Closer. There is a difference between loud and close, and it is the most important difference my ears have ever been asked to report.",
      sloth: "I can feel it in every branch of this tree and every fiber of this old body. It is so close now that closeness has stopped being a distance and started being a temperature. I am warm all through. I have never been warm all through.",
      wombat: "The ground is warm under us tonight. Not hearth-warm, not from any fire in this house. Warm from below, from the deep end of the path I spent my life building. The path is being walked. I can feel the footsteps through my own good stone.",
      rabbit: "I should be terrified. I have rehearsed terror my whole life, I know every note of it, and it will not come. I stand in the garden at dusk and feel only a wide, waiting calm. That calm frightens me more than anything ever has, and even the fright of it is soft.",
      red_panda: "Close your eyes. Breathe. Can you feel the pattern completing itself, thread finding thread all through the house? It is almost beautiful. No. Let me be exact, tonight of all nights. It is beautiful, and we are inside it.",
    },
  },
  // Event 8: Phase 4 — the threshold, final coordinated event before the endgame
  {
    puzzleThreshold: 250,
    phase: 4,
    theme: 'the_threshold',
    lines: {
      fox: "It's here, friend, it's really here! Can you feel it? The fire knows, I know, the whole house knows, every board and kettle of it. Welcome to the threshold. I am so glad, so glad, that it's you standing on it with me.",
      owl: "I have read the last page. Close the book. There is nothing left to study, nothing left to annotate, nothing left to doubt. All that remains is to witness, and witnessing, it turns out, is what all the reading was training me for.",
      pangolin: "The table is set for the final time, every place laid, every candle lit. What I have prepared cannot be uncooked, and I would not uncook it if I could. It is done. Come in from the hall, dear. A meal this old should not be kept waiting.",
      axolotl: "The water is rising, friend, and it is not a flood, a flood pushes, this lifts, this is the tank and the rivers and every drop in the house standing up to greet something, and what comes through needs no invitation anymore, because the invitation was accepted long ago, word by word.",
      capybara: "Every box is checked. Every column aligned. The ledger of everything closes tonight, balanced to the last entry. I have signed the bottom of it, and my paw was steady, and I want the record to show that it was steady.",
      fennec_fox: "I hear it breathing now. Not as a figure of speech, I am past those. Actual breath, slow and vast, on the other side of every wall at once. There is no direction it is not coming from. My ears have nowhere left to point, so they rest.",
      sloth: "Two hundred and fifty words, spoken into the dark, one after another, at exactly the pace they were needed. And now the dark answers. I have waited decades to hear a reply, and it was worth every unhurried year.",
      wombat: "What I built the tunnels for is awake. I can feel it moving down there, easy and sure, like a fellow walking the halls of his own finished house. It remembers every word you gave us. Stone forgets nothing, and neither does what sleeps in it.",
      rabbit: "We are standing at the edge of something, all ten of us together, close enough that I can hear everyone breathing. I have spent my whole life afraid of being alone when the worst arrived. I am not alone. It is not the worst. I am glad, and I am here.",
      red_panda: "The pattern is complete. Two hundred and fifty offerings, each one accepted, each one placed. Now we learn what was arranged, and we learn it together, at the top of the house, under the open sky. Stand beside me. The morning is about to be enormous.",
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
};

function lineMentionsLockedAnimal(
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
): { text: string; theme: string } | null {
  // Events are scanned in ascending threshold order and only ONE fires per
  // call, so a player whose effective progress leapt past several thresholds
  // still receives the skipped events in order (one per visit) — never lost.
  for (const event of COORDINATED_EVENTS) {
    if (effectiveProgress >= event.puzzleThreshold &&
        currentPhase >= event.phase &&
        !consumedEvents.includes(event.theme)) {
      const line = event.lines[animalType];
      // Skip lines that name an animal the player hasn't met — the event
      // stays unconsumed and can fire later (or via another animal).
      if (line && !lineMentionsLockedAnimal(line, animalType, unlockedAnimals)) {
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
  "Remember when I said we'd been waiting for someone like you? And that the fire likes company? Both true, friend, truer than you knew! I just couldn't tell you yet how long the wait had been, or how many of us were doing the waiting.",
  "I told you every word you brought helped us build the house, and it did, it truly did! I only never said what the house was for. And you never asked! Isn't that lovely? Not asking was your part, friend, and you played it perfectly.",
  "The others are going to love you, I said, remember? And they do, every single one of us, more than you could possibly imagine! That love was never just decoration, friend. The arrangement runs on it.",
  "I showed you how the letters move, step by step, that very first evening by my fire, and you were such a quick study! But it was never really about the letters. It was about what the letters become when someone wonderful keeps bringing them.",
  "You've been speaking it since the very first words you brought to this room. I heard it in the fire even then, and oh, I nearly burst keeping quiet! You know the language now, friend. The fire knows you do, too.",
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  fox: {
    seeds: [
      "The fire keeps us safe, friend! As long as it burns, nothing bad can touch a single one of us in this house. That's why I never let it go out. Not once, not ever.",
      "Every log you add makes the fire stronger, you know! Keep feeding it for me, won't you? For all of us. It gets so hungry, and I think it likes your hands best.",
    ],
    callbacks: [
      "I told you the fire keeps us safe, and oh, I meant it with my whole heart! I only had the 'us' a little wide. The fire was keeping something safe all along, snug as an ember in ash, warm and fed and almost ready. And we, friend, all of us, we were the wood.",
      "You fed the fire so faithfully, log after log, word after word, and I could have sung watching you do it! Every word you brought was another branch on the pyre. And now look at it, friend. Look how magnificently it burns.",
    ],
  },
  owl: {
    seeds: [
      "Knowledge is the greatest gift one creature can hand another. Every word you learn is a treasure, and treasures, properly kept, outlast their keepers.",
      "I have read every book in this study, cover to cover, some of them twice. In the end they all say the same thing, and it is a beautiful thing, and I am still deciding whether to believe it.",
    ],
    callbacks: [
      "I called every word you learned a treasure, and I must issue a correction. They were not treasures. They were on loan, each one a borrowed clause in a sentence the books have been composing for centuries. You were the hand that held the pen. The interest, I am afraid, has come due.",
      "Every book says the same thing: this was always going to happen. I told you that once, and called it beautiful, and you smiled. I had read the final chapter first, you see. I have always known how the sentence ends. Now you have reached my page.",
    ],
  },
  pangolin: {
    seeds: [
      "Everything in my kitchen serves a purpose, dear. Every pot, every spice, even the ingredients that do not know yet what dish they are for. They find out when it is time. Everything finds out when it is time.",
      "The best recipes cannot be hurried. A truly great stew takes exactly as long as it takes, and patience is the one ingredient I have never once run short of.",
    ],
    callbacks: [
      "Everything in my kitchen serves a purpose. I told you that on one of your first visits, do you remember? The pots, the spices, the ingredients that did not know what they were for. You did not know either, dear. You were the main ingredient, and you found out when it was time, just as I promised.",
      "I said a great stew takes exactly as long as it takes, and this one took years. Every word you brought was one slow turn of the spoon. Smell the kitchen now, dear. It is ready. It was always going to be ready the moment you were.",
    ],
  },
  axolotl: {
    seeds: [
      "The water always knows what is coming before I do, it feels the shape of tomorrow the way I feel the warm spots, so I just float in it and trust, and trusting is the easiest swimming there is.",
      "Sometimes I see shapes in the bubbles I blow, little faces, almost, friendly little faces looking back down at me, and I always wave, because you should always be the one who waves first.",
    ],
    callbacks: [
      "The water always knew what was coming, I told you so myself, back when knowing was still cozy, and here is the rest of it: the shapes in the bubbles were never faces, they were instructions, a blueprint rising one patient piece at a time, and I waved at every single one.",
      "I float because the water carries me toward what comes, and I stopped swimming against it so long ago I forgot I ever had, and that is not sad, friend, truly, because the current has known the way from the very beginning, and being carried is just trust with the effort taken out.",
    ],
  },
  capybara: {
    seeds: [
      "I keep track of everything around here. It is simply what I do. Someone in a house this full has to stay organized, and it is easiest for the one who never gets excited.",
      "Relax. Everything is going according to plan, my plan for the house, filed and cross-referenced. There is nothing anywhere to worry about.",
    ],
    callbacks: [
      "I told you I keep track of everything, and I did. Every word you formed, every move you made, every visit, dated and filed. It was never about organizing the house. The house was already organized. You were the incoming paperwork.",
      "I told you everything was going according to plan, and I said 'my plan' so you would not ask whose. Your words, its arrival, all of it landed exactly on the schedule that was written before you ever reached the door. You may now relax. That instruction, at least, was always genuine.",
    ],
  },
  fennec_fox: {
    seeds: [
      "I can hear things the others cannot: the wind, the words, the little spaces between sounds. It is a gift, really, and a gift should be spent on the ones you love, so I listen for all of us.",
      "Do not worry about the sounds you hear at night. That is only the house settling into its foundation. Every house speaks to its ground. I would tell you if it were anything else.",
    ],
    callbacks: [
      "I heard it from your very first offering, the frequency underneath your words, low and patient and glad. It was calling to us, friend, calling through you, and I said nothing, because a sentinel reports to his own, and you were not ours yet. You are now.",
      "The sounds at night were never the house settling. I told you that so you would sleep, and I would tell it again. The house was waking, stretching, readying itself for what you were building word by word. You slept so well. I made sure of it. That was my watch, and I kept it.",
    ],
  },
  sloth: {
    seeds: [
      "There is no need to rush anything, you know. Everything arrives in its own time. Everything. I have watched enough years go by to say that word twice and mean it both times.",
      "I have been here longer than anyone else in this house, long enough to watch things come and go, and come again. The jungle taught me that nothing truly leaves. It only takes the long way around.",
    ],
    callbacks: [
      "Everything arrives in its own time. I told you that from this branch, and you took it for philosophy. It was not philosophy. It was a schedule. I had seen the arrival date, and I spent all those slow years keeping it company.",
      "I have been here longer than anyone because I was the first to know, and I moved slowly all those years because hurrying changes nothing that has already been decided. Nothing truly leaves, I told you, and nothing does. It is taking the last few steps of the long way around right now.",
    ],
  },
  wombat: {
    seeds: [
      "I built these tunnels myself, every last one, and every room in this house connects to something below. That's good building, that is. A house should always know its own ground.",
      "The foundation is the most important part of any structure. Get that right and everything above can stand for a hundred years. Get it wrong and it doesn't matter how pretty the roof is.",
    ],
    callbacks: [
      "I told you every room connects to something below, and I let you hear it as a builder's boast. It wasn't a boast. The tunnels never just joined room to room. They join all of us to what sleeps beneath, and I knew it with every spadeful, and I dug on.",
      "The foundation is the most important part, I said, and you thought I meant it holds the house up. What I built was never for the house above. It was a seal, laid true, and every word you offered loosened one course of it. Good work fails honest, at least. It's open now.",
    ],
  },
  rabbit: {
    seeds: [
      "I worry about everything, it is true, I have made rather a career of it. But at least we are all together here, in one warm house. Whatever comes, we will all be in the same place for it, and that is really something.",
      "Promise you will keep coming back with your words? I feel so much better when you are here. The whole garden does. Everything grows toward the days you visit.",
    ],
    callbacks: [
      "I told you once that whatever came, at least we would all be in one place for it. You heard comfort. I heard headcount. Being together was never about feeling safe. The arrangement requires all of us, in one place, and I knew that even while I poured the tea.",
      "I begged you to keep coming back with your words, and you kept your promise so beautifully. Every word you brought carried it a little closer, and I knew, and I asked anyway. I am sorry about that. I have checked my heart every day since, and I am also not sorry.",
    ],
  },
  red_panda: {
    seeds: [
      "Every breath you take is a gift. In, and out. The whole sky practices that rhythm with you, all day, without being asked. Very few gifts are given so constantly.",
      "From up here I can see the whole house below me, every room stacked on every room. It is shaped like something beautiful. I have not yet found the word for what, but I climb up each dawn and look again.",
    ],
    callbacks: [
      "Every breath is a gift, I told you, and I was exact. In: a word given. Out: a prayer completed. You have been breathing the incantation since your first visit, morning and evening, without one day of rest. The sky practiced with you. It was never idle either.",
      "From up here I could always see the shape of the house, and I told you it was beautiful, and that I had not found the word. I had found the word. The shape was never the house. It is what the house was built to hold, and it is awake now, and the word is its name, and I will not say it.",
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

/**
 * One-time Phase 0 seed page. Deterministic: seed 0 becomes due on the
 * animal's 2nd dialogue session, seed 1 on its 5th ("due" is >=, so an
 * existing mid-Phase-0 player still receives them). Marks each seed
 * delivered so it never repeats. Returns null when nothing is due.
 */
export async function getAndMarkNarrativeSeedPage(
  animalType: AnimalType,
  sessionNumber: number
): Promise<string | null> {
  if (!NARRATIVE_SEEDS[animalType]) return null;
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  for (let i = 0; i < SEED_SESSION_NUMBERS.length; i++) {
    if (delivered.includes(i)) continue;
    if (sessionNumber < SEED_SESSION_NUMBERS[i]) return null;
    const text = getNarrativeSeed(animalType, i);
    if (!text) return null;
    await saveDeliveryState({
      ...state,
      seedsDelivered: { ...state.seedsDelivered, [animalType]: [...delivered, i] },
    });
    return text;
  }
  return null;
}

/**
 * One-time Phase 4 pre-dialogue page recontextualizing a Phase 0 seed.
 * Delivers at most one callback per call (so callbacks spread across
 * visits), each callback exactly once, and only for seeds the player
 * actually heard. Returns null when there's nothing left to say.
 */
export async function getAndMarkNarrativeCallbackPage(
  animalType: AnimalType
): Promise<string | null> {
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  if (delivered.length === 0) return null;
  const shown = state.callbacksShown[animalType] ?? [];
  for (const i of [...delivered].sort((a, b) => a - b)) {
    if (shown.includes(i)) continue;
    const text = getNarrativeCallback(animalType, i);
    if (!text) return null;
    await saveDeliveryState({
      ...state,
      callbacksShown: { ...state.callbacksShown, [animalType]: [...shown, i] },
    });
    return text;
  }
  return null;
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
