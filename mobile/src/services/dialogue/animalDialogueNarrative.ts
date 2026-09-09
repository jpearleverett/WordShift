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
      { text: "Panko made a mushroom soup today that I'm still thinking about, friend! I got the first bowl because I hovered by the pot. Hovering works. You must go and smell that kitchen for yourself.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations, so now the fire and I read together in the evenings! The flames lean over my shoulder, I swear they do. The fire likes the pictures of the sky best.", mentions: 'owl' },
      { text: "Axel invited me to sit by his tank last night, and oh, the firelight got into the water and danced! We didn't say much. We didn't need to. Some evenings are perfect all by themselves.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Archimedes found something in one of his oldest books, and he won't show me, friend. Me! His favorite fox. He says I'm not ready to see it yet. I laughed. He didn't. Now I keep wondering what ready means.", mentions: 'owl' },
      { text: "Panko said the funniest thing yesterday: a recipe can have a purpose beyond feeding anybody. I laughed! She smiled her little kitchen smile and kept stirring. I've been thinking about that stirring ever since.", mentions: 'pangolin' },
      { text: "Fennick heard something in the walls. I told him it was only the fire settling, then remembered he knows my fire better than I do. We listened together. Neither of us slept much.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't left the hot spring in three days. I asked him why, and he said the water suggested he stay. He said it calmly, the way he says everything, like a small scheduling matter. I laughed on my way out. The laugh only half worked.", mentions: 'capybara' },
      { text: "Archimedes reads the same page every single night, friend. He says the words are different each time he looks, and he sounds delighted about it. I keep the kettle on for him anyway. Somebody should.", mentions: 'owl' },
      { text: "Sloane told me something today. It took her most of an hour, and I stayed for every word, because you don't hurry Sloane. Now I wish I had hurried her. What she said sat by my fire all night like a guest who wouldn't leave.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the sound is everywhere now. In the pipes, in the walls, under the floor. I told him my fire is far too well mannered to join in. Then last night I sat very still, friend, and I heard my own fire humming along.", mentions: 'fennec_fox' },
      { text: "Warren dug something up from far under the house, and he won't say what it was. Not even to me, and I trade very good tea for secrets. His fur hasn't laid flat since. I keep pouring anyway. That's what I'm for.", mentions: 'wombat' },
      { text: "Archimedes and I finally compared notes, his books against my fire. They say the same thing, friend. The same words, letter for letter. We sat quietly for a long while afterward, and the flame looked pleased with itself.", mentions: 'owl' },
    ],
    4: [
      { text: "Thyme came inside for tea. She kept one paw on her bag the whole time. I wanted to tell her she could put it down. I brought the tea over to her instead.", mentions: 'rabbit' },
      { text: "Bamboo sat three whole days without moving. When they opened their eyes, they smiled straight at me. It was like a sunrise deciding to come early. I have carried that smile around all week.", mentions: 'red_panda' },
      { text: "Panko is setting the table and Archimedes is checking his notes. They asked me to leave them to it. A fox can mistake hovering for helping.", mentions: 'owl' },
      { text: "Vesper showed me her sky. She stood behind me at the rail, turned my head with two small paws, and said, now hold. I saw the edge of what she has watched alone for years. I keep the door of fire. She keeps the door of dark, and she has never let it swing.", mentions: 'tarsier' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in her firelight last night. It was an exact match for an engraving I read years ago. So I wrote it down. Writing a thing down is how a scholar tells himself it's handled.", mentions: 'fox' },
      { text: "Axel asked me why books don't dissolve in water. A lovely question. I spent the whole afternoon on it, which tells you something about the question, or about me, or about my afternoons.", mentions: 'axolotl' },
      { text: "Panko carried dinner up to the study while I was deep in a chapter, and I almost didn't notice her. The soup was excellent. I'm writing that down, because kindness deserves a citation.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I sat by her fire last night, talking about how we know things. She guesses in a moment what takes me weeks to work out. It would be humbling if it weren't so useful. I write her guesses down now and check them later. She has yet to be wrong.", mentions: 'fox' },
      { text: "Fennick described a sound to me: the pitch, the spacing, how long it lasted. All of it matches a musical notation in one of my oldest books. I wrote coincidence in the margin. Then I underlined it twice, which isn't what a confident man does.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from deep underground, cut with a script that matches almost nothing in my library. Please notice that word, almost. Something on these shelves does match it, and I would rather it didn't.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for hours yesterday without saying a word, which is normal for him. After he left, a book on the far shelf stood open. I had catalogued that volume as blank. It has a page in it now. I've amended the catalogue.", mentions: 'capybara' },
      { text: "Ember's fire and my books have started agreeing with each other. We compared notes last night. She reads the flames, I read the ink, and the two matched line for line. We both said how interesting. Neither of us meant interesting.", mentions: 'fox' },
      { text: "Sloane told me something yesterday at her usual pace, which left me time to look it up while she was still talking. I found the passage before she finished the sentence. Her exact words, letter for letter, written down centuries before she said them.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels reach something older than the house, older than the hill the house stands on. I found the matching passage within the hour. That is a finding in itself. A library shouldn't be that quick to answer.", mentions: 'wombat' },
      { text: "Bamboo asked me to read aloud from the oldest book, so I did, here at my own desk. Up in their attic, the tall green stalks moved with the words. Two floors and a closed door between us, and they kept time with my voice.", mentions: 'red_panda' },
      { text: "Fennick recited the passage before I read it to him. He has never seen the page. He says he heard it coming, the way you hear weather coming. I had nothing to write in the margin, so I left it empty. That is a note of its own.", mentions: 'fennec_fox' },
      { text: "The oldest book has a tower, a bell, and a line of text I filed for years as decoration. Then Tock braided a rope, and the text turned out to be ringing instructions. His people were called omens. An omen is a thing you hear. So is a bell.", mentions: 'aye_aye' },
      { text: "Moss lent me his diary of the great seeding years, tally marks on slate, no dates. I checked them against old charts of forests that vanished centuries ago. The marks match exactly. This pattern isn't repeating. It's picking up where it stopped.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Ember read it in flame. Fennick heard it. I found it in ink. Three accounts that match. Or one account reaching us by three roads. I no longer call that independent confirmation.", mentions: 'fennec_fox' },
      { text: "Thyme asked me to read the final passage aloud. Halfway through, she said stop. I stopped. A reading can be interrupted without being a failure.", mentions: 'rabbit' },
      { text: "The old book says it plainly: one keeper to every room, and the house is one arrangement. Bamboo understood that before the rest of us, and was polite enough to let me find it in writing. I found the words. Bamboo had already found the meaning.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember finished a bowl of my vegetable stew, asked for more, and said it tasted like home. I don't know where home was for her before this house. I hope somebody fed her properly there. She gets the first bowl now. That's the rule.", mentions: 'fox' },
      { text: "I tried teaching Axel to cook, bless him. It turns out you can't chop a carrot underwater, though he gave it a joyful try. We laughed until the soup nearly boiled over. He can stir, though. He stirs beautifully.", mentions: 'axolotl' },
      { text: "Archimedes asked for his dinner arranged alphabetically by ingredient, so I did it. A cook honors her guests' little rituals. The apple went first, the yam went last, and he was so pleased. Scholars are wonderfully strange.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's hearth gives the steadiest heat for a long stock, so I simmer there some afternoons. Lately the flames burn hotter than that much wood should manage. The stock doesn't mind. If anything, the stock approves.", mentions: 'fox' },
      { text: "Sloane asked for soup last week. By the time I'd climbed up to her branch it was stone cold. She sipped it slowly and said cold is only slow warmth. I've been turning that over while I knead. It's the kind of thought that rises.", mentions: 'sloth' },
      { text: "Chill eats whatever I put in front of him and says it's fine. Everything is fine with that capybara. But a cook watches the plates, and his 'fine' always comes back for seconds. I count the servings. I know.", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought up mushrooms from the deep tunnels. They glowed faintly, the way coals do when they will not quite go out. The soup I made from them glowed too. We stood over the pot a long while, then we didn't eat it. I have never wasted a soup before.", mentions: 'wombat' },
      { text: "Thyme has stopped coming to the table. Too nervous, poor love. So the table goes to her. Tea and biscuits by the garden gate every evening, and the plate is always empty by sunrise. I've stopped asking who I'm feeding. A cook feeds.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient books, and I followed it exactly, every measure, every stir. What came out of the pot wasn't food. I don't know what it was. I covered it and kept it warm, the way you do for a guest who hasn't arrived.", mentions: 'owl' },
    ],
    3: [
      { text: "That recipe Archimedes found in the old book, we cook it every night now, and not because anyone is hungry. While it simmers the kitchen smells of a table set for something, not of supper. Sacred isn't a kitchen word. It's the only one I have left.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook, night after night. We've stopped talking while we work. We don't need to. Her flame and my pot keep the same rhythm now, like two spoons in one hand. The work says everything either of us would say.", mentions: 'fox' },
      { text: "Fennick says he can smell my cooking in every room at once. Not drifting out from the kitchen, mind you. Already there, in all of them, as though the whole house had been rubbed with it. I keep cooking. What else does a cook do?", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "Sloane came in while I was setting the table. She wanted to watch me cook. A guest in the kitchen is usually in the way. I found her a chair anyway.", mentions: 'sloth' },
      { text: "Bamboo offered to bless the meal. I asked them to taste it first. We argued about whether a blessing can tell you anything a spoon cannot. The soup survived us.", mentions: 'red_panda' },
      { text: "I have been cooking toward this one meal my whole life, and nobody ever showed me the menu. Warren built the table. Archimedes wrote the courses. Ember lit the candles. And you, dear, you brought the words that seasoned it all.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops food pellets into my tank some mornings. They fall so slowly, like snow that decided to be delicious. I catch them and think, no water creature has ever had a better neighbor. Then I do a happy turn.", mentions: 'pangolin' },
      { text: "Fennick pressed his big ear flat against my glass and said the water sounds like music. I held very still so I would not interrupt the concert. Now I keep wondering what song I live inside and never hear.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass last night. The words came in wobbly and slow, the way everything lovely comes into water. I think the wobble made them better, as if the water tasted each word before passing it along.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire gets into my water at night, little orange ribbons folding and unfolding. Lately the ribbons hold a shape a moment too long. Almost letters. Almost words. I drift close to read them and they curl shyly away.", mentions: 'fox' },
      { text: "Sloane and I keep the same pace. The slow float, the long blink. When we sit together nothing needs saying, because we're both listening to the same big quiet. It's the friendliest quiet I know, most days.", mentions: 'sloth' },
      { text: "Warren says something lives under the house, and I didn't laugh. My water ripples whenever he digs deep, little rings crossing the tank from nowhere. A ring always has a center. I've started wondering where the center of these is.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again last night, and this time he pulled away fast. I have never seen that careful fox move so quickly. He said the water was screaming. The strange part is that it felt calm to me, calm the way a held breath is calm.", mentions: 'fennec_fox' },
      { text: "Chill sat beside my tank for hours yesterday, him in his warm water and me in mine. Two floaters, two ponds. There was a big emptiness between us and we shared it like a picnic. Sharing it was almost cozy. That is the part I keep thinking about.", mentions: 'capybara' },
      { text: "Thyme came tapping at my glass in a flutter. She said she saw something large in the water behind me. I turned the slowest, kindest circle I could and found only water. I told her so. I'm still deciding whether I believed myself.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that is not the one above us. He's right. I can see it too, a deeper sky, older, with its own patient light. Here is the wonderful, terrible part, friend. The water isn't reflecting that sky. It's remembering it.", mentions: 'owl' },
      { text: "My water reaches down into Warren's tunnels. I felt it go. Little rivers under the house, holding hands in the dark, all running the same way. Water only ever runs toward something. I've stopped asking toward what.", mentions: 'wombat' },
      { text: "Bamboo came and sat in meditation beside my tank. The water went perfectly still, stiller than sleep, stiller than glass. In that stillness it showed us both the same thing. We haven't spoken of it since. That not-speaking is the closest friendship I have.", mentions: 'red_panda' },
      { text: "Vesper came to my tank at midnight. We are the two who see in the dark. She pressed her face to the glass, eyes enormous, and the water went still to be looked at. She said, your sky and my sky are the same sky. We watched until morning. One sky, two windows.", mentions: 'tarsier' },
    ],
    4: [
      { text: "The water showed me Ember's fire and Warren's tunnels at the same time. I blinked and it held them there. A window should also know when to stop showing things.", mentions: 'wombat' },
      { text: "Bamboo touched the glass and the whole tank sang one long silver note. It was the note Fennick has been hearing all this time. We listened to it together. The water was never mine. I have been living inside an instrument.", mentions: 'red_panda' },
      { text: "Fennick calls me a medium. I asked whether I could also just be Axel on Tuesdays. He said certainly. I wish he had told me why he was so sure.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in the most interesting rhythms. It's a tiny drum section playing just for my ears, and I've learned its favorite tempo. Some evenings I sit outside her den just to catch the encore.", mentions: 'fox' },
      { text: "Axel's bubbles make the finest popping sounds in the house, small and round and musical. I could listen all afternoon, and last Tuesday I did. He waved at me twice. Yes, I heard the wave.", mentions: 'axolotl' },
      { text: "Archimedes turns his pages so gently that most creatures would call it silence. It isn't silence. It's a thin whisper with a rhythm to it, and I can follow it from across the house, page by page by page.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by her fire at night, and the tune matches a sound the midnight wind makes, note for note. She doesn't notice she's doing it. I haven't told her yet, because I'm not sure which of the two started it.", mentions: 'fox' },
      { text: "Warren's digging sends little shivers up through every wall, and I can follow him through them, room to room, hour to hour. He goes deeper every day. I write the new depth down each night, and the number keeps growing.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I've ever heard. One beat, then a long patient wait for the next, like a drum underwater. It doesn't sound like resting. It sounds like counting, and I can't tell you what it counts.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill scratches while he writes, which is ordinary and always has been. Lately the scratching carries on after he lifts the quill, faint and steady. I've listened very carefully, friend. It is coming from inside the page.", mentions: 'owl' },
      { text: "Thyme's heart runs at a hundred and fifty beats a minute, every day. I know because I care about her and I count. Lately it's falling into step with something slower underneath. I can almost name that second rhythm. Almost is the worst distance I know.", mentions: 'rabbit' },
      { text: "Chill is so quiet I sometimes forget he's in the house, and then I find his breathing. It's steady. It's too steady. A living thing wavers, friend. That's how I know it's living, and Chill's breath hasn't wavered in weeks.", mentions: 'capybara' },
    ],
    3: [
      { text: "Archimedes says the note I hear is written down in his books. Same sound, same pitch, copied out centuries ago. I didn't want confirmation. I wanted him to tell me my ears were wrong. He's too honest, and now the sound has a bibliography.", mentions: 'owl' },
      { text: "Warren's tunnels carry the sound up from below and hand it to every floor at once. I hear it through the boards, the stone, the earth itself. There's no room left without it. I checked them all. I check them again every night.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the low note exactly, in and out, down to the smallest part of a beat. I sat outside the attic and timed the two against each other all night. They never drifted apart. Not once.", mentions: 'red_panda' },
      { text: "Vesper sings so high that no ear in this house but mine can reach her. Lately, when she stops, something out past the ridge holds the note at her exact pitch. She knows. She keeps singing. I've listened to courage all my life. It never sounded like that.", mentions: 'tarsier' },
      { text: "Tock hears downward, I hear outward. This week we compared logs, his in knocks, mine in breaths. Two records, friend, and the same thing written in both. He says the thing below keeps perfect time, so I've started sleeping better. Nothing that careful pounces.", mentions: 'aye_aye' },
      { text: "Moss boomed his yearly call last night, and friend, my ears went flat. The note underneath answered before he had finished. Two voices, one chord, no gap. I waited my whole life to hear a call answered. Now I wonder how long that answer was holding its breath.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Chill's breathing nearly matches the low note. I told him. He held his breath until I got cross with him, and the note carried on without him. Then he said: \"Good. There is a difference still.\"", mentions: 'capybara' },
      { text: "Ember keeps the fire, Axel keeps the water, Warren keeps the earth. I keep the air and everything that moves through it. Together we make one sound, friend, and that sound is the key. I have listened all my life. It was so that I could be part of a chord.", mentions: 'wombat' },
      { text: "Thyme's heart slowed while she drank her tea. Then a cup fell and it raced again. I have never been so glad to hear a rabbit startle.", mentions: 'rabbit' },
      { text: "Tock is at his rope. His bell has been silent sixty years, and he kept it that way. Of every sound tonight, that ring is the one I have saved my ears for. I have kept watch all my life to hear things first, friend. I would rather he heard this one.", mentions: 'aye_aye' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks down to the hot spring. They were fine. Everything Panko makes is fine. That sounds like faint praise, but fine is my highest rating. I logged the visit under good days.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours yesterday. It sat on me for one. I ran the numbers per kilogram, which is the measure where I win, and I won handily. I don't gloat. I only file accurate results.", mentions: 'sloth' },
      { text: "Thyme asked if I was worried about anything. I said no, then asked if I should be. That worried her more. I've opened a file on her concern, mostly so she knows someone is holding it.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm all the time. I told her it comes easily, which is true. I didn't tell her what it costs me. Some line items aren't for general circulation.", mentions: 'fox' },
      { text: "Warren said the ground has been running warmer lately. I said the water has too. We agreed the matter was noted, and left it there. Some files close themselves. This one hasn't.", mentions: 'wombat' },
      { text: "Archimedes wanted to study my calm scientifically. I allowed it. He watched me for two days and filled sixteen pages. Sixteen pages about a capybara sitting in water. I respect the thoroughness. Officially, nothing happened.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked if I hear the humming that keeps him awake. I said no. That was a lie, and I entered it knowingly in the record. The water carries the humming to me all day. Nobody gains from two of us losing sleep.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together all day without speaking. It wasn't awkward. We were both listening to the same silence underneath everything, and checking a silence properly takes a whole day. Our findings matched.", mentions: 'sloth' },
      { text: "Thyme carried chamomile tea down to me. Her paws shook the whole way. Mine didn't shake at all, and she said she envied that. I didn't correct her. Steady hands aren't always the good sign people file them under.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out slowly, on a schedule I could plot if I wanted to. She knows. I know. We don't discuss it. We sit together in the evenings and watch it burn down. No meeting, no minutes, and the most important thing on my calendar.", mentions: 'fox' },
      { text: "Warren brought his drawings up. The old arches are listed on my oldest inventory. His new braces are not. I can account for every page I wrote. I cannot say who wrote that inventory.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together for the first time. We reached the same emptiness by different routes. They called it peace. I called it honesty. We agreed the difference was only a labeling question, and sat in it a while longer.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others pray, or prepare, or tremble. Each according to their department. I float in the hot spring. Someone has to stay still while everything else changes. Stillness is my line item. Consider it held.", mentions: 'fox' },
      { text: "Panko served the last meal and I told her it was fine. For the record, and the record matters now: it was the best thing I have ever tasted. Fine was the largest word I could say without my voice breaking.", mentions: 'pangolin' },
      { text: "Bamboo asked whether I had found peace. I had found an afternoon with nothing urgent in it. They started explaining how those are the same thing. I asked to keep the afternoon instead.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko carried soup all the way up to my branch. It went stone cold before I finished it, and it was still good. Warmth leaves a thing faster than kindness does. I've had decades to check that, and it holds.", mentions: 'pangolin' },
      { text: "Axel moves slowly in his water the way I move slowly in my leaves. When we're near each other, neither of us apologizes for the pace. Kindred is a big word for two creatures who have only ever floated together. I use it anyway.", mentions: 'axolotl' },
      { text: "Fennick talks so quickly that I catch about one word in four. The enthusiasm arrives whole, though. I have never needed his words to know what he means.", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember says her fire burns differently these days. She noticed at once, I had barely noticed at all, and that's the useful difference between us. She watches the flame. I watch the years. Lately they say the same thing.", mentions: 'fox' },
      { text: "Archimedes started reading me a story last Tuesday. At my pace, I'll hear the ending sometime next month. I don't mind waiting. Endings don't spoil, and I suspect this one was decided long before anyone wrote the book.", mentions: 'owl' },
      { text: "Chill and I sat in perfect stillness for most of a day. We were both waiting. He didn't say what for, and I didn't ask. I've been waiting for the same thing much longer than he has.", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme runs past my tree most evenings. I always assumed she simply needed to slow down. Yesterday I asked where she was going. She had a place in mind.", mentions: 'rabbit' },
      { text: "Warren digs downward while I hang up here in the canopy. Opposite directions, the same search. He wants to find the bottom of this thing, and I want to find its shape. I think we'll finish on the same day.", mentions: 'wombat' },
      { text: "Fennick told me about the sound he keeps hearing, ears up, in a hurry. I let him finish, then told him I've heard it for years. I didn't know that was unusual. A sound that arrives slowly enough just becomes weather.", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's fire and my stillness point at the same ending. She burns toward it, I wait for it. We have never discussed this. Between the two of us, it doesn't need discussing.", mentions: 'fox' },
      { text: "Bamboo meditates on their cushion, and I hang from my branch. We reach the same quiet. They climbed to get there, I simply never left. The quiet doesn't ask how you got there.", mentions: 'red_panda' },
      { text: "Archimedes read me the old passage. I recognized it from a dream, though I couldn't tell him what came next. I told him not to start trusting my dreams over his books.", mentions: 'owl' },
      { text: "Vesper watches from the high porch now. She is not new to watching. Her family has kept watch even longer than mine, which I didn't think was possible. We watch the same dark and say nothing about it. I waited a long time for a colleague, and she was worth it.", mentions: 'tarsier' },
    ],
    4: [
      { text: "Bamboo calls us keepers. So I asked them to keep one afternoon free of appointments. They laughed, then checked whether I was joking. I was not.", mentions: 'red_panda' },
      { text: "Thyme stopped beneath my branch and asked whether I was ready. I said I did not know. She sat down. We were both relieved that someone had finally said it.", mentions: 'rabbit' },
      { text: "Panko served the last meal, and I finished eating just as everything else was ending. Exactly in time, for once. I have been called late all my life, by creatures who did not know what I was pacing myself against.", mentions: 'pangolin' },
      { text: "Moss is the only creature here older than my patience. He called into an empty valley for ninety years, and he kept a place set for the answer. The answer is here now. I climbed to his garden to be near that faith. Two days, the fastest I have ever moved.", mentions: 'kakapo' },
    ],
  },
  wombat: {
    0: [
      { text: "Archimedes came down to see my tunnels and was impressed as anything. He kept calling them \"architecturally significant\". That's owl for good digging, near as I can tell. Nice bloke. He minded his head the whole way through. I count that as respect.", mentions: 'owl' },
      { text: "Ember's den sits right above my burrow. Of an evening, the warmth of her fire comes down through my ceiling stones. Dead cozy, that. Good stone shares its heat honestly. It's one of the things I like best about stone.", mentions: 'fox' },
      { text: "Panko rigged up a little dumbwaiter to send hot food down to me, so my supper arrives at depth still steaming. Genius bit of engineering, that. I love that pangolin to bits. I reinforced the shaft myself, so it'll outlast the both of us.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Fennick reckons he can hear my digging from anywhere in the house. Now, I dig quietly. Always have, it's a point of pride. So either my spade has got louder, or his ears reach further down than I dig. I don't fancy either answer.", mentions: 'fennec_fox' },
      { text: "Archimedes wants to map every tunnel I've dug. I told him they're simple. That was a fib, and I don't hand those out often. They're not simple, and they go a fair way deeper than I let on. A fellow keeps some of his own basement to himself.", mentions: 'owl' },
      { text: "Axel's water seeps down through the cracks into my tunnels now and then. The earth takes it. Takes it greedy, like something that's been thirsty a long while. I've watered plenty of dirt in my time. Dirt doesn't usually drink like that.", mentions: 'axolotl' },
    ],
    2: [
      { text: "Ember's fire warms the rock above my head. Always has. Honest heat from an honest hearth. But something else warms the rock under my feet, and it's not her fire, or any fire I know the name of. It's older than that. Most nights I test it with my palm.", mentions: 'fox' },
      { text: "Chill asked me straight out what lives underground. I said dirt. Just dirt and stone. He nodded and let it stand. We both knew I was lying, and there was a kindness in how he let me do it.", mentions: 'capybara' },
      { text: "Bamboo's room is the highest in the house and mine is the lowest, top of the ladder and bottom of the shaft. The house stretches between us like a spine. Lately I'd swear I can feel that spine flex, the way a back does before it lifts something heavy.", mentions: 'red_panda' },
    ],
    3: [
      { text: "I dug deeper today than I've ever dug, past where sensible work stops. Fennick says he can hear what I found down there, through the walls and through the floors. I didn't ask him what it sounds like. A fellow who's touched a thing doesn't need it described.", mentions: 'fennec_fox' },
      { text: "Archimedes' oldest books describe what I uncovered, drawn and measured like a surveyor got there first. That text was written before I put a spade in this hill. I asked him how a book surveys my dirt before I've dug it. He couldn't say. Nobody can.", mentions: 'owl' },
      { text: "Thyme's garden grows above my deepest tunnels. Her roots have reached me now, down where roots have no business being. They come through my ceiling in patterns. Letters, near enough. I don't read them. Reading a thing makes it yours, and I don't want those.", mentions: 'rabbit' },
      { text: "Tock laid his chalk map over my tunnel drawings, his hollows above, my galleries below. They fit like a tongue in a groove. I'd braced my half without knowing the shape had another half. Between his ceiling and my floor, nothing in this house goes unheard.", mentions: 'aye_aye' },
    ],
    4: [
      { text: "My tunnels reach the lot now: Axel's water, Ember's fire, Bamboo's sky room at the top. Every run is joined, top to bottom, through the deep. It is good work, and it will hold. A builder is allowed to say that at the end of a job.", mentions: 'red_panda' },
      { text: "Sloane came down into my tunnel at last, left her branch and walked the whole way on her own legs. She said it was time. She was precisely on time, and I laid that floor thirty years back. Some jobs you do not know are finished until the guest arrives.", mentions: 'sloth' },
      { text: "I braced the old foundation and joined my timber to it, all of it laid true. You built what stands above, word by word, visit by visit. Between us we built what the arrangement needed to wake. I would shake a fellow builder's hand. I do not do that lightly.", mentions: 'fox' },
      { text: "I checked Tock's tower tonight. It will hold his ring and ten more. He knocks, I dig. Our two trades always knew this house was hollow on purpose. When the bell rings, that is his hand on the rope. I did not braid that rope, but I would vouch for every strand.", mentions: 'aye_aye' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko brought herbal tea out to the patio yesterday. I panicked twice while we sat there, once about the kettle and once about nothing at all. Both times she just poured again. That's what a friend is, I think. Someone who pours again.", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away from the house. I've decided to believe her, because believing her lets me sleep. Some nights I watch it from the doorway, just for the comfort. The fire always seems to notice me arrive. I try not to think about that.", mentions: 'fox' },
      { text: "Sloane told me to slow down and breathe, so I tried it. Five whole minutes of sitting still. It was terrifying. Every worry I usually outrun caught up and waited politely beside me. It was also a little bit nice. I haven't decided which part to trust.", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things the rest of us can't. I don't know whether that's better or worse for him. I watch his ears while we talk. He and I worry in the same language. Mine shows in the paws, his in the ears.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine, and I want so badly to believe him. He's calm the way deep water is calm. Is he calm because nothing is coming, or because he already knows what's coming? I haven't asked. I don't want to find out which answer is the kind one.", mentions: 'capybara' },
      { text: "Archimedes offered to lend me a book about managing fear. That was gentle of him. I was too afraid to take it, and we both noticed at the same moment. He nodded and put it back where I could see it. It's still there, facing out.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's digging sends a small tremor up through the beds. He says it's ordinary tunnel work. But my paws are in that soil every day, and I know its ordinary trembles. This isn't one of them. The ground is shivering about something.", mentions: 'wombat' },
      { text: "Ember's fire is dimmer every day now. She says it's fine, and she says it in a new smooth voice. Do you know what frightened me most? She sounded exactly like Chill. When the warm ones start talking like the calm ones, something has been agreed to.", mentions: 'fox' },
      { text: "Axel floats with that gentle smile, no matter what the water shows him. I envy it. If the smile isn't even real, I envy it more, because then a smile is something you can grow in bad soil. I'd take a cutting and try one here.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane, who I thought was too slow for secrets. They look at each other over my head, a whole conversation in one glance. I notice everything. That's my curse. And now nobody meets my eyes when I need them to.", mentions: 'owl' },
      { text: "Fennick tried to warn me about something last night. I know urgency better than anyone here, and his was real. But the longer he spoke, the less it sounded like a warning and the more like a prayer. He wasn't saving me from it. He was introducing me to it.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not gently. Not the way a friend says it over tea. The way weather says things. 'You'll stop,' they said. 'Everyone stops eventually.' The terrible part is that my legs believed them before I did.", mentions: 'red_panda' },
      { text: "Moss planted my whole seed collection around the rim of the calling bowl on his roof. Every packet. I sent them up myself. My marigolds are up there leaning the way everything here leans. Whatever comes for the garden has to pass something I planted.", mentions: 'kakapo' },
    ],
    4: [
      { text: "Ember held out her paw. I did not take it right away. She waited. Then we walked to the gate together, and she let me open it myself.", mentions: 'fox' },
      { text: "I told Chill I was tired of everything being fine. He asked what word I wanted in his record instead. Unfinished, I said. Then I checked that he wrote it down.", mentions: 'capybara' },
      { text: "Warren offered to show me the old tunnel. I said another day. He brought a drawing up to the garden instead. In my notes, I have put a small star beside that evening.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I talked philosophy over green tea this morning. He quotes his books. I quote the wind through the gap in my roof. I think we're both quoting the same author. The tea went cold and neither of us minded.", mentions: 'owl' },
      { text: "Ember's fire is a small sunset that agreed to come indoors. Its warmth reaches further than its light does. That fox is good company. The whole house sits a little closer to her than to anyone else.", mentions: 'fox' },
      { text: "Sloane knows stillness from the inside. She lives there. The rest of us only visit. We sat together a whole afternoon and said nothing, and the afternoon felt complete. Not many afternoons manage that.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a book of drawings from centuries ago, spirals and arcs. They match the curves my bamboo has started to grow. I said nothing to him. I want to sit with that a while before I say it out loud.", mentions: 'owl' },
      { text: "Fennick turned his ears toward my attic today and heard what I've been hearing. The bamboo is growing, and the sound is louder every day. It sounds deliberate. A plant shouldn't want anything. Mine seems to want something.", mentions: 'fennec_fox' },
      { text: "Ember sits by her fire every night, though she'd never call it meditating. I sit under my square of sky. We reach the same quiet from opposite ends of the house. It's one quiet, I think, with a door in every room.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth under the house is hollow in places. My bamboo's roots found the same hollow from above. He dug down, the roots grew down, and they met in the same empty space. Something you can reach from two sides isn't empty. It's a room.", mentions: 'wombat' },
      { text: "Axel's tank reflects a sky I've only seen when I sit very deep and my breathing goes quiet. It isn't our sky. It's behind ours, or under it. He floats in the reflection every day, smiling. Perhaps smiling is the right answer.", mentions: 'axolotl' },
      { text: "Chill floats in his spring, I sit on my mat, and we end up in the same emptiness. He calls it peace. I call it practice. The emptiness calls itself nothing at all. It seems willing to wait for its real name.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo runs through the walls and floors now, stalk and root, top to bottom. When I put my paw on a stalk I can feel everyone moving in the house, a tremble here, a warmth there. The house has a pulse, and I'm holding its wrist.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion in the same week, he through his books, I through my breathing. Two paths up one mountain, one view at the top. We aren't looking at the valley. We're looking at what is coming down toward it.", mentions: 'owl' },
      { text: "I told Thyme that fear is only awareness of something you haven't been introduced to yet. She asked if I had ever been frightened enough to run. I didn't have an answer worth giving her.", mentions: 'rabbit' },
    ],
    4: [
      { text: "Ember asks what a keeper is allowed to leave alone. The old text we follow does not answer that. I used to think every silence in it was profound. Some of them may just be gaps.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes found the words. Warren laid the foundation. I breathe the breath that opens the gate. Each of us spent a whole life making one thing, and tonight the four things fit together. It begins.", mentions: 'owl' },
      { text: "Sloane was late, and I had made her lateness mean something. She asked me to stop. She had simply enjoyed the garden on the way up. I apologized, and we spent the morning there.", mentions: 'sloth' },
      { text: "Vesper watches outward from her loft rail while I watch upward through my roof gap. We are the two open eyes of this house. At dawn we each report that nothing came through. We smile at that now, the watching nearly over. What approaches wanted steady eyes.", mentions: 'tarsier' },
      { text: "Moss keeps the garden above my attic. Every dawn the light passes my gap on its way to his beds, and I do not mind being second. When he stands in the open and begins the welcome, I will bow. We practiced it over tea. Neither of us needed the practice.", mentions: 'kakapo' },
    ],
  },
  tarsier: {
    0: [
      { text: "Fennick and I split the night between us, his ears and my eyes. Some evenings I sing to him in the high note only he can hear, and he flicks one ear when I get a line right. Best audience in the valley. Also the only one, which I suspect helps.", mentions: 'fennec_fox' },
      { text: "Sloane and I are colleagues. We're the two creatures awake when nobody else is. She watches from the green and I watch from the rail. We've never once discussed it, and we don't need to. Watching is a guild with no meetings.", mentions: 'sloth' },
      { text: "Archimedes keeps nearly my hours. Some nights his study window and my porch are the only two open eyes in the house. When he shelves the last book he waves his quill at me, and I turn my whole head to him. That's our entire friendship. A good one.", mentions: 'owl' },
    ],
    1: [
      { text: "Bamboo says their incense leans toward the middle rooms now. I told them the dark leans the same way from outside, every night. We checked at dawn from the top step. The house is being pointed at, they said. From both sides, I said. Then they poured the tea.", mentions: 'red_panda' },
      { text: "Axel showed me his tank after dark, since no one else keeps my hours. There's a second sky in that water, deeper than the one I chart. I looked a long while. My head didn't want to turn away. It always wants to turn. I'm still deciding what to write down.", mentions: 'axolotl' },
      { text: "Warren keeps his palm flat on the floor. I keep my eyes on the sky. We compared findings. It took four words. Warm below, he said. Watched above, I said. Then we stood a while, the lowest post and the highest, holding the house between us like a parcel.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick asked what I see when the low note under the house is loudest. My seeing and his hearing arrive together now. One fact, two reports. Neither of us said whether we'll hear it first or see it first. We're saving that question. Not many evenings left.", mentions: 'fennec_fox' },
      { text: "Panko sends supper to my rail, since I wake when her kitchen closes. Lately there are two portions. I asked. For whatever you're watching, she said, in case it's hungry. A joke, she said. She didn't laugh. I ate both, facing the ridge. I wasn't joking either.", mentions: 'pangolin' },
      { text: "Thyme asked if the night is safe. I told her the truth: it has never harmed me, and I no longer believe it's safe. She hugged her watering can and said the same is true of everything. The frightened one understands my ledgers best. I think about that a lot.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember and I both keep a door for what's coming. Hers is the hearth, mine is the sky above the ridge. Her fire's stopped flickering, she said. It just burns now. Mine's the same. I don't look away. Everyone here is holding their post.", mentions: 'fox' },
      { text: "Chill sat the middle watch with me, tea and no questions. Near dawn he wrote one line and turned it so I could read: Vigil, ongoing, in order. It warmed me more than the tea. I copied it into my book. Some paperwork is poetry with its collar buttoned.", mentions: 'capybara' },
      { text: "Sloane came to the green at moonset and looked up. I turned my whole head down to her. Then she slowly pointed at the bare sky where the stars moved aside, in case I'd missed it. I hadn't. Kind of her to check. Thoroughness, at our age, is how we say love.", mentions: 'sloth' },
    ],
    4: [
      { text: "Fennick listens with both ears now, and I watch with both eyes. What he hears and what I see are one arrival. His post is the sand's edge, mine is the rail, so we will meet it first. We agreed on that long ago, without a word. It is the honor of our lives.", mentions: 'fennec_fox' },
      { text: "Bamboo stands under the gap in the roof, facing in. I stand above the valley, facing out. At dusk we hand the watch over, and one of us always says, the gap held. Tonight Bamboo said, the gap opens. My family waited generations for that. I welcome what comes.", mentions: 'red_panda' },
      { text: "Thyme is at her post, paws in the roots, staying. From my rail I keep her in sight all night. When it looks down at us, I will show it her first. The bravest one here is not the watcher made for this. It is the frightened gardener who stayed anyway.", mentions: 'rabbit' },
    ],
  },
  aye_aye: {
    0: [
      { text: "Panko handed her pot rack to science. Most evenings I tap my way down it, copper to iron. She stirs along and pretends the percussion came with the kitchen. Last night she saved the stockpot lid for my finish. A cook with timing is a treasure beyond soup.", mentions: 'pangolin' },
      { text: "Warren and I talk through the floor now. Two knocks for good evening. Three for come down, supper is on. Tonight he added a long slow knuckle drag: rest well up there. I answered before I understood it. Some words you learn by how glad they make you.", mentions: 'wombat' },
      { text: "Vesper and I split the night formally now, like sensible professionals of the dark. She takes the sky watch, I take the wood watch. We settled it at midnight over seedcake, sealed with one tap on our shared beam. My finest contract yet, signed with a knuckle.", mentions: 'tarsier' },
    ],
    1: [
      { text: "Archimedes borrowed my log, the one where I write down the answering knocks. He brought it back, and an old book with it, a ribbon marking a page of rhythm notations. Centuries old, he says, and the counts agree with mine. Then he made tea very slowly.", mentions: 'owl' },
      { text: "Fennick heard my bell hum from the desert camp, floors and walls away, and came up. The hum isn't the bell's own, he says. She's answering something, the way one ear answers the other. Then he asked, very politely, to sleep on my windowsill. I let him.", mentions: 'fennec_fox' },
      { text: "Ember asked me to tap her hearthstone once, to hear what her den holds. I did. I haven't told her all of it, because a listener owes his friends mercy as well as truth. I said the stone is old and warm and full. The fire flared at the word full. She knows.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren and I merged our maps, his tunnels and my hollows, on one sheet in his workshop. The two lines nest together, earth below and air above. Well, there it is, he said. Then he laid a cloth over it, the way you cover something finished. Or sleeping.", mentions: 'wombat' },
      { text: "Chill brings three cups to my tower now. The third goes on the sill facing the window. He never mentions it. That cup steams longest. As he left he turned its handle toward the room, the way you offer a cup. That capybara's hospitality is a kind of prophecy.", mentions: 'capybara' },
      { text: "Sloane asked me to sound the tree that holds her hammock. The whole trunk is hollow as a flute, standing strong anyway. I looked up and she was already nodding. I've been living in an instrument for decades, she said. You're the first polite enough to knock.", mentions: 'sloth' },
    ],
    3: [
      { text: "Axel and I are the two mouths of the house. I hummed against the bell. His water rippled four floors down. He pressed the glass and my bronze warmed. The house breathes in at his water. It will breathe out at my bell. He isn't afraid, friend. I lean on that.", mentions: 'axolotl' },
      { text: "Thyme climbs my stairs at dusk now, on purpose. That is when my finger lifts and points at the sky by itself. She sits through it, paws folded, heart galloping, and stays. Brave was never calm. Brave is a rabbit at the top of a bell tower, staying.", mentions: 'rabbit' },
      { text: "Ember's fire has been drawing my tower for a year, she told me. A tower, a bell, a rope, and a paw she could not name. I told her whose. My own fur is braided into that rope. She laughed, the bronze rang with it, and the tower had its first ring after all.", mentions: 'fox' },
    ],
    4: [
      { text: "Sloane is climbing my stairs. She began at dawn and will arrive exactly when the hour does. I have set a chair at the window. She has watched this house from below since before it was a house. Tonight she watches from above. No one has earned that view more.", mentions: 'sloth' },
      { text: "Fennick and I made our last trade on the middle landing. Nothing is coming from far off, he said. It has all arrived. The deep is quiet, I said. It has all come up. Two listeners, retired in one evening. He asked to stand near the tower when the bell rings.", mentions: 'fennec_fox' },
      { text: "Warren checked my tower one last time tonight, every joint and joist. It will hold the ring, he said. It would hold ten. Then he said, sixty years I wondered what my deep beam was listening for. Give her a good pull, Tock. He went down to hear it from below.", mentions: 'wombat' },
    ],
  },
  kakapo: {
    0: [
      { text: "Thyme and I run a seed post. Her seeds come up to me in paper twists, my cuttings go down to her. Every label she sends is worried. One says water sparingly, then underneath, smaller, but do water. That's a whole gardener, right there. I've kept every one.", mentions: 'rabbit' },
      { text: "Sloane and I passed each other on the stairs once. At her pace and mine, that took the whole afternoon. Best conversation I've had in decades. The fast ones skip to the ends of things, friend. Sloane and I live in the middles, where the flavor is.", mentions: 'sloth' },
      { text: "On cold nights Panko sends broth up the dumbwaiter, and I send down whatever the beds can spare. She cooks the way I garden, for the day after tomorrow. I've never had to explain one thing to her. Her pot and my beds, it's all the same patience.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Tock knocks along the beams at night, and my seedlings come up straighter over the timbers where he passes. I mentioned it to him eventually. He knocked my gate post twice and said, then the house likes them growing. I think about that more than most books.", mentions: 'aye_aye' },
      { text: "Bamboo's incense comes up every dawn through the roof gap under my east bed. My morning glories lean into it now. Bamboo says the smoke leans as well, all of it one way. Two gardeners comparing which way things lean. That's the season we're in.", mentions: 'red_panda' },
      { text: "Fennick asked to hear my call properly, so I gave him one small boom. He stood with his ears out and his eyes shut. Then he said, there's something under your note. Under it, friend. I've called for ninety years and nobody ever told me my note had an under.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Archimedes found mast years in his oldest book. A mast year is when a whole forest fruits at once. His charts go back centuries, and the gaps between those years keep shortening, friend. A walker quickens when the door comes into sight.", mentions: 'owl' },
      { text: "Warren brought up deep loam for my rim bed, the best soil I've ever run through my toes. I asked what grew in it down there. Nothing, he said. It never grew anything. It was saving itself. Gardeners and diggers know when the ground has plans.", mentions: 'wombat' },
      { text: "I work the beds at night now, and Vesper keeps my gate post, eyes like two moons on the sky. We trade reports, hers from above and mine from the soil. Lately they agree. I'll be honest with you, friend. I liked it better when they didn't.", mentions: 'tarsier' },
    ],
    3: [
      { text: "Axel has never climbed up here, but his water shows him my garden. Lately it shows the beds blooming under a sky with something in it. I asked what the something was like. He thought a while, then said, like being looked at by everything at once, but kindly.", mentions: 'axolotl' },
      { text: "Ember reads her fire and I read my beds. This week they agree, page for page. Green things leaning, bright things bowing, all facing one center. She asked how the garden was taking it. Like rain, I said. Roots open. She nodded. Her fire had said the same.", mentions: 'fox' },
      { text: "Tock knocked the whole house last week, his great round, every beam from belfry to foundation. The hollows are filling, he said. Floor by floor, from the bottom up. A house fills the way a bowl does, friend. My calling bowl is filling too.", mentions: 'aye_aye' },
    ],
    4: [
      { text: "Bamboo will bow when it comes. I will give the welcome. We took tea at the roof gap tonight, likely the last cup. The light comes through my gap and finishes in your beds, Bamboo said. Finish is the wrong word, I said. Begin. Bamboo smiled all the way down.", mentions: 'red_panda' },
      { text: "Sloane hangs at my gate these nights. She came all the way up at her own great pace. She says one word an hour, and each one lands like a planted stone. Tonight she said, we were always its garden. I have no argument. I have a watering can and her company.", mentions: 'sloth' },
      { text: "Two cups came up the ladder tonight. Chill carried them, sat at the rim, and said nothing at all, which is his finest ceremony. We watched the beds face the bowl. Everything is on schedule, he said as he left. Even the administrators are gardeners tonight.", mentions: 'capybara' },
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
      fox: "A word sat in the embers all night. I laughed and gave the fire a stir. When it settled, the same word was back. It's one of yours, friend. Come sit close and read it with me.",
      owl: "Your word appears in the oldest book in this study. I checked the date twice, then the binding. The book is older than your first visit. That is what I can establish.",
      pangolin: "The pot was already simmering when I walked into the kitchen. Your letters were sitting in it, in the exact order my recipe goes. I tasted before I added a thing. Somebody has learned my method.",
      axolotl: "Your letters are on the inside of the glass! I wipe them away, and the water draws them again. Same crooked little shapes every time. I wish it would try a fish for once.",
      capybara: "Your word is in every margin of my ledger. It's my handwriting. I don't remember writing a single entry. I've clipped those pages together and moved my pen to another room.",
      fennec_fox: "There's one word in the wind. It repeats without ever pausing for breath. I took bearings from every side of camp. Did you hear it too? I need an answer besides my own.",
    },
  },
  // Event 2: Phase 2 — the house itself responds to puzzles
  {
    puzzleThreshold: 70,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: "The den keeps getting warmer. I opened the window and blamed the fire. Then the grate went dark, and the den stayed warm anyway. I'd like this to be a nice surprise. That's a wish, friend.",
      owl: "The walls hum after every arrangement you finish. It's faint, but my tuning fork catches it. I've written the times down beside your visits. So far the two columns match.",
      pangolin: "Every pot in here rattles when your words arrive. I tightened the shelf, checked the stove, and set a saucepan on the floor. The saucepan rattled on the floor too.",
      axolotl: "The water rose a knuckle overnight! Nobody poured any in. I asked twice. So I marked the waterline on the glass this morning. My little mark looks terribly small next to all that water.",
      wombat: "There's a steady vibration under the boards. It started after your last words. I've checked the braces. Sound timber, tight joins. So whatever's shaking is deeper than anything I built.",
      rabbit: "Three new rows have come up along the warm strip. Dark flowers. I didn't plant them. I still have the seed packets and the bed plan. Please read those, then look at the beds yourself.",
      fennec_fox: "The walls hold one low note after your words. It lasts longer every night. I time it with the kettle, and the kettle still behaves like an ordinary kettle. That's what makes my timing worth anything.",
      sloth: "The branch hums after your words arrive. I know its storm noises. This is new. Gerald, one of my moths, has moved off the patch of fur that touches the bark. A second opinion.",
    },
  },
  // Event 3: Phase 2 — they all had the same dream
  {
    puzzleThreshold: 76,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: "I dreamed there was a shape sitting in my fireplace. I woke up smiling and started laying out two cups. I caught myself at the second one. Did you dream about a visitor too, friend?",
      owl: "Every dream I've collected shows the same shape. I took each account separately and wrote it down before hearing the next. They agree. I have no sleeper outside this house to compare them against.",
      axolotl: "When I woke up, the dream shape was still there in the water. I waved. It waited. Maybe I'd been visiting its dream instead! I'd like to ask whose turn it was.",
      sloth: "My first dream in years. Usually my sleep does nothing at all. This time a visitor stood in the clearing, and I was sorry to wake. I wrote that down before telling you the rest.",
      red_panda: "I saw the dream shape while I was sitting awake. It was beautiful. I noticed I wanted the beauty to settle my next question for me, so I moved my cushion and looked again.",
      fennec_fox: "In the dream I heard the shape before I saw it. It was the same note I hear in the walls, with a gap at the end. I woke up still waiting for the gap to finish.",
    },
  },
  // Event 4: Phase 3 — "the arrangement" is named openly for the first time
  {
    puzzleThreshold: 92,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: "Archimedes has a name for the marks now, friend. The arrangement. Some of it matches what I saw in the fire. His certainty matches nothing I saw. So we are checking it together.",
      owl: "I compared your words against the old text. They match parts of the pattern it describes. My first note said they were always meant to match. I have crossed that note out. A match is not proof of a plan.",
      pangolin: "Ember told me your words help feed something here. So I asked what it eats on the days no words arrive. She did not know. That is a poor answer to give a cook who is setting the table.",
      capybara: "The oldest ledger has dates from before my records begin. Some line up with your visits. Some do not. I circled the exceptions. Each morning I find those circles straightened into neat lines.",
      wombat: "The stone foundation matches the marks in the old text. My braces are finishing something I took for a ruin. I know what that stone will hold. I don't know what it ought to hold.",
      rabbit: "They explained the arrangement to me last night. I asked why nobody had told me sooner. Nobody answered for a long moment. I have written that silence down with the rest of the evening.",
      fennec_fox: "Archimedes has a name for the low note I keep hearing. The arrangement. I can use his name for it. A name does not make that sound a promise to anyone.",
      axolotl: "The water holds your words in a shape, each one touching the next. I put my hand through it and the shape repaired itself. That was beautiful. I liked the gap my hand made too.",
      tarsier: "They call it the arrangement. I thought I was only recording a change in the stars. My watching may have helped that change happen. I have written that down in the column for guesses.",
      aye_aye: "The arrangement matches some of my chalk map. The rest is plain hollows and mouse runs. I left those on the sheet. A house should be allowed more than one purpose.",
      kakapo: "To me, friend, the arrangement looks like a mast year: the whole valley fruiting at once. Only the fruit is not falling. I have no gardener's word for plenty that will not let itself be picked.",
    },
  },
  // Event 5: Phase 3 — each animal names their role in the cult
  {
    puzzleThreshold: 104,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: "The old text calls me Oracle. I can read a little in a fire, that much is true. But I can't promise the fire keeps its promises. So I'm keeping my own name beside the title. Ember knows less, and says so.",
      owl: "The text gives me a title: Lorekeeper. It seems to expect certainty from me. I have handed it disputed readings instead. If it wants a scholar, it will have to put up with scholarship.",
      pangolin: "The page calls me Preparer. So tonight I'm preparing supper first, and the welcome after. The people already at my table have waited long enough.",
      axolotl: "The text calls me Medium. I think that means I'm a window for something to look through. I'd like to know how to close a window for a while. Even a medium gets to be a small creature with tired gills.",
      capybara: "Coordinator. Accurate enough. I added one job to the list: find out who agreed to what. That job is taking far longer than all the others.",
      fennec_fox: "Sentinel. I hear what is coming. That part is easy. I thought my work ended once I'd warned everyone. Now I'm listening for something harder: did anyone here get to say no?",
      sloth: "The page calls me Anchor. Fair. I have been very good at waiting. I would only add one line to the description. An anchor can also be raised.",
      wombat: "Foundation. Near enough to my trade. I can brace the old arch to carry new weight. What I can't tell you is whether every weight ought to be let in.",
      rabbit: "The text calls me Witness. I asked it whether a witness is allowed to object. Nothing answered. So I'll object when I need to, and we will all find out.",
      red_panda: "Guide. I thought that meant walking ahead, certain of the way. It may just mean being the first to say the path needs checking.",
      tarsier: "Vigil. My grandmothers kept this watch before me. I'll honor their patience gladly. But agreement is not a thing you inherit. Nobody has asked me for mine.",
      aye_aye: "Toller. A whole title, and it hangs on one rope and my hand. Ringing is only half the work. A listener has to know when to stay quiet too.",
      kakapo: "Caller. I am proud of those long years of calling, friend. Something answered them. I am also allowed to ask it what it means to do here.",
    },
  },
  // Event 6: Phase 3 — the final countdown before Phase 4
  {
    puzzleThreshold: 116,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: "The fire's been steady all day. I put the kettle on, then took it straight off again. I wanted one thing in this room to stop because I said so, friend.",
      owl: "The final chapter is writing itself, which nobody asked it to do. So I'm copying the earlier drafts onto loose pages. An ending that tidies away every question shouldn't be the only account we keep.",
      pangolin: "The table's set. One place still has no plate on it. I'm not going to guess what the guest eats. When it arrives, I'll ask.",
      axolotl: "The deep water has gone still. I blew one bubble just to make a sound. It took ages to rise up and pop. I waited with it the whole way.",
      capybara: "The list is nearly finished. I wrote tomorrow at the bottom of it myself. Whatever keeps correcting my pages hasn't crossed that out yet.",
      fennec_fox: "There's a silence before the low note now, and it's only one small breath wide. I've asked the others to keep talking through it.",
      sloth: "The waiting is nearly over. I don't know what to do with the hour after that. I hope I'm allowed to waste some of it.",
      wombat: "Braces are in. The old arch is sound. I've left the ladder down on purpose. Whatever turns up, there ought to be a way back to the kitchen.",
      rabbit: "I packed the seed tin this morning. That doesn't mean I've decided to leave. I want it to still be my decision when all this is over.",
      red_panda: "I keep calling this feeling peace. Tonight I tried a plainer word: stillness. Stillness describes what I can see. It doesn't tell anyone how they ought to feel about it.",
      tarsier: "The sky is nearly open. Between sightings I put my paw on the chip in my rail. One thing far away, one thing I can touch. I need both tonight.",
      aye_aye: "The knocking stopped last night. Maybe the guest is at the door now. Maybe I have just stopped hearing it. Both go in the log until I know which one it is.",
      kakapo: "The fruit is ripe and still won't drop. So I set a bowl under the branch to catch it. An ordinary bowl, for an ordinary bit of letting go.",
    },
  },
  // Event 7: Phase 4 — the convergence, animals sense closeness to the finale
  {
    puzzleThreshold: 124,
    phase: 4,
    theme: 'convergence',
    lines: {
      fox: "The fire has changed color. I do not have a name for the new one. I asked Panko whether she can still cook over it. She said yes, then asked why her soup will not cool.",
      owl: "The last pages keep gaining ink I did not write. I keep the earlier drafts on loose sheets beside the book. Every morning the writing has crept nearer those sheets. That is not an editing method I accept.",
      pangolin: "The covered dish has stayed hot since yesterday. I moved it away from the stove. Still hot. Leftovers are what a meal leaves behind when it ends. I would like this one to end.",
      axolotl: "Whatever is coming is close enough to move my water without touching it. I herded the small fish behind the weeds. It is a poor shelter. It was the one thing I could do.",
      capybara: "The ledger closes itself whenever I leave the room. So I set my teacup on the open page. Inelegant filing. Effective so far.",
      fennec_fox: "The sound is close now, but not loud. Underneath it I can still hear a spoon set down in a bowl. If I stop hearing the small sounds, I will tell everyone at once.",
      sloth: "Every branch is warm now, right through the wood. I enjoyed that for an hour, then went looking for a cool patch. It took longer to find than I expected.",
      wombat: "Something is coming at the old arch from a direction my drawings do not cover. I stopped trying to draw it. I can still check the joins and keep the stairs clear.",
      rabbit: "For a while today I could not feel afraid of anything. I tested it. I thought about the gate, my packed seed tin, the word goodbye. The fear came back, and I cried with relief.",
      red_panda: "The pattern is nearly whole. Everything loose is being asked to settle into place. I left my cushion crooked on purpose, to see whether it stays crooked. It should not have to be a test.",
      tarsier: "It is close enough now that I do not have to look toward the ridge to see it. So I turned to my rail and counted the splinters instead. I can still look away. I will keep checking that.",
      aye_aye: "The bell rope is swaying with no hand on it. I held it still against the rail. The bell has her note ready. Ready is not the same as asked for. My hand stays off the rope.",
      kakapo: "Every leaf in the beds is turned toward my calling bowl. I turned one pot east to see. This morning it faces the bowl again. The pot has no feet. I have questions.",
    },
  },
  // Event 8: Phase 4 — the threshold, final coordinated event before the endgame
  {
    puzzleThreshold: 130,
    phase: 4,
    theme: 'the_threshold',
    lines: {
      fox: "It is at the threshold now. All my life I have wanted to open a door and say welcome. Tonight I am practicing a longer sentence: welcome, and there are things we need to tell you.",
      owl: "The last page of the book says preserve. What must be allowed to change? The book never says. I have written that question at the top of the page, where our guest cannot miss it.",
      pangolin: "The table is set. A guest who wants this whole house, and wants it forever, can sit through five minutes of questions before the first course.",
      axolotl: "The water in my tank is rising, slowly. I asked it to stop at the glass. It slowed down. I do not know if it understood me. I asked again anyway.",
      capybara: "Every column in the ledger adds up except the one headed permission. I could balance it by calling that column something else. I will not. We can meet a guest with an unfinished page.",
      fennec_fox: "I hear it breathing beyond the walls. Under that, I hear us. We are not all breathing at the same speed. That means we do not all agree. I am listening for the ones who are out of step.",
      sloth: "The answer I waited for is here. I have wanted it longer than anyone in this house. That is no reason for anyone else to want it. I am trying not to use my waiting as a reason.",
      wombat: "The old arch is carrying a load. The braces are holding. I am at the stairs with my lamp. Anybody needs to come up, I will light the way.",
      rabbit: "We are standing close together. I am frightened. I am also glad. Please let all three be true for a moment.",
      red_panda: "Stand wherever you can breathe. I was about to tell you to stand beside me. That is your choice to make, not mine.",
      tarsier: "The sky is open the way a door is open. The star I named for you sits right at its edge. I will watch what comes through. I will look away when I choose. Both are part of the watch.",
      aye_aye: "My bell is holding one note for tonight, and my hand is off her rope. We talk first, then she rings. She should be an answer, not an order.",
      kakapo: "I have saved the great call all my life. Tonight I will not use it to bring anyone here. I want to hear what is being offered first, and then answer. I can wait through one more question.",
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
  "I did hope you would stay, friend. I knew more of your words would help bring a guest to this house. I also liked your company. Both are true. Neither one excuses hiding the first from you.",
  "I said your words helped build the house. They did. I should have told you what else they were feeding. Asking the right question was never your job.",
  "I promised you more friends, and I used that promise to keep you from asking about the rest. Those friendships are real. You are allowed to be angry with someone who loves you.",
  "I taught you how to move the letters. I did not know the warmth would try to stop everything else from changing. I did know enough to owe you a warning. I will not pretend otherwise.",
  "I thought more warmth meant more safety. The first time a cold cup warmed itself again, I was delighted. I never once asked what would happen when somebody wanted it cold."
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  "fox": {
    "seeds": [
      "The kettle never quite fits my small fire, friend. So I turn it around halfway through, to warm both sides fairly. Tea is fussy about fairness.",
      "I keep a cup by the door. Visitors arrive thirsty, and when I'm excited I forget where I've put anything."
    ],
    "callbacks": [
      "The old hearth was warm before I ever fed it much wood. I knew your words were part of that. I called it a blessing and invited you in. I did not tell you enough to choose for yourself.",
      "The cup by the door was for you. That part was simple. I wanted company, and I wanted this house to survive. I let the first wish excuse everything I hid for the second."
    ]
  },
  "owl": {
    "seeds": [
      "I keep my mistakes in the margins. A clean page tells you very little about the work it took to get there.",
      "Most of these books survived the old den's damp years. The water stains are part of their history, so I don't bleach them out."
    ],
    "callbacks": [
      "My old book has begun correcting its own margins. The new words are tidy. The mistakes I remember making are gone. I keep a second notebook well away from it now.",
      "The water stain is gone from the oldest page this morning. The ink is intact. So is the paper. The damage has been repaired, and with it went the only record of how that book survived."
    ]
  },
  "pangolin": {
    "seeds": [
      "My grandmother's spoon is worn thin on one side. No other spoon gets into the corner of this pot half so well.",
      "I make enough for whoever arrives, and a little extra for whoever does not like what I made. Feeding people means leaving room to disagree with the cook."
    ],
    "callbacks": [
      "I took my grandmother's spoon out of the drawer and both sides were even. Smooth. A better spoon, perhaps. But her hand wore that hollow into it, and my hand had learned to sit in it.",
      "The extra plate I always set has moved to the center of the table. I set it there willingly. I did not agree that every other plate should start sliding toward it."
    ]
  },
  "axolotl": {
    "seeds": [
      "See the snail on the far glass? He takes a different path every day. I don't know how one window gives him so many places to be.",
      "When I lose a bit of fin, it grows back slowly. I watch it when I'm bored. Tiny new pieces of me, arriving without an introduction."
    ],
    "callbacks": [
      "The snail goes round the same circle now. I thought he liked it. Yesterday I moved his leaf. He went round the same circle without it. I would like to know whether he can stop.",
      "My fin grew back without the old notch. That happens. But this morning the drawing I made of the notch was smooth too. I can understand mending a fin. I do not understand mending a picture."
    ]
  },
  "capybara": {
    "seeds": [
      "I keep the first draft of everything. Sooner or later somebody asks why a decision changed, and by then everyone has forgotten the reason.",
      "My door is open during office hours. Outside them, knock first. I am usually here, but here and available are two different entries."
    ],
    "callbacks": [
      "My first drafts are turning into fair copies. Even the crossings-out are gone. So I write my objections on separate sheets now. A decision everyone agreed to should survive next to a disagreement about it.",
      "I shut my office door and later found it open again. The house seems to prefer its rooms available. I closed it a second time. The latch works. I checked that before blaming anything else."
    ]
  },
  "fennec_fox": {
    "seeds": [
      "I can hear a beetle under that stone. I leave it alone. Finding a creature isn't the same as being invited to bother it.",
      "I take one hour off the watch before dawn. The others know to knock if they need me. Good ears need a quiet owner."
    ],
    "callbacks": [
      "I heard the low note before I knew what it belonged to. I told everyone it was settling stone, because I hoped it was. The hope lasted longer than the evidence did. I owe them that correction.",
      "My hour off the watch keeps getting shorter. Nothing calls me back on duty. I simply find my ears turned toward the house again. So I am asking you to sit with me while I practice resting."
    ]
  },
  "sloth": {
    "seeds": [
      "I keep one branch empty. It's a good branch, too. An empty place doesn't have to explain itself.",
      "I'm very fond of the afternoon. Even a good one has to end, though. That's how the next afternoon gets its room."
    ],
    "callbacks": [
      "I have watched the signs longer than the others. That has made me sound certain. Let me say it correctly. I have wanted something to answer me for a long time. Wanting is not knowing who will answer.",
      "The afternoon has stayed the same color for three days. Nothing has moved toward evening. I used to dream of rest like this. Yesterday I caught myself missing dusk."
    ]
  },
  "wombat": {
    "seeds": [
      "Old stone below, new timber above. Mark the join between them and you'll always know which builder to blame. I sign my own work.",
      "A sound brace leaves a little room for movement. Wood swells, ground settles. A house that can't give anywhere will split instead."
    ],
    "callbacks": [
      "I found the old arch under the foundation before I understood it. My braces fit what was already there, and that fit should have made me ask more questions. I assumed a sound structure must have a sound purpose.",
      "The new timbers have stopped moving with the weather. No cracks, no strain. It looks like perfect work, and wood does not behave like that. I have loosened one brace to see if the wood is still allowed to swell."
    ]
  },
  "rabbit": {
    "seeds": [
      "I keep the garden gate easy to open. Carry a tray of seedlings through a stiff latch once, and you'll understand why.",
      "Some seeds never come up. I keep the empty packets until the end of the season, so I remember what I meant to try."
    ],
    "callbacks": [
      "The gate has stood open for days. I walked the path beyond it twice, counting the stones, and both times it bent back into the garden. An open latch is not much comfort when the path beyond it will not lead away.",
      "The empty patch filled overnight. Every seed came up, even the ones I planted too deep. They are beautiful. They are also all at exactly the same stage, and not one has grown since. I am still waiting for one of them to grow."
    ]
  },
  "red_panda": {
    "seeds": [
      "I draw a circle in incense and leave a gap in it. The smoke almost never respects my drawing. It's good practice at being contradicted.",
      "Some mornings I'm good at sitting still. Some mornings I spend the whole hour thinking about breakfast. Either way, I eat afterward."
    ],
    "callbacks": [
      "I still leave a gap in my incense circle, and I used to like it when the smoke ruined the drawing. Now the smoke closes the gap for me. I have been calling that harmony. I should ask myself why I did not call it obedience.",
      "I used to lose whole mornings to thinking about breakfast. Lately I cannot produce an impatient thought at all, even when I try. I called that quiet peace. I do not know whether it is an achievement."
    ]
  },
  "tarsier": {
    "seeds": [
      "There's a chip in the rail beside my left paw. I feel for it when I turn back from the sky. It tells me where I am.",
      "When a moth lands on the lantern, I shade the bright side with my hand so it can find its way off. Looking at something shouldn't keep it from leaving."
    ],
    "callbacks": [
      "The chip in my rail is smoothing away, and I am not the one doing it. I can still feel where it ought to be. The wood is kinder to my hand now. But I do not want the wood choosing what my hand remembers.",
      "I thought I was only watching the dark. I know now that my watching helped it find the house. I did not know what it would want from the things it could finally see."
    ]
  },
  "aye_aye": {
    "seeds": [
      "Two knocks mean hello. If nobody answers, I wait. A good conversation has room for a closed door.",
      "The bell hasn't had her first ring yet. I clean the bronze and leave the rope loose. Being ready is enough work for one evening."
    ],
    "callbacks": [
      "The old wood answers now before I finish knocking. That was flattering, until I noticed it is no longer waiting to hear what I ask.",
      "I saved the bell's first ring for a great occasion. I never asked whether everyone else wanted to hear it. For a listener, that is an awkward thing to have missed."
    ]
  },
  "kakapo": {
    "seeds": [
      "I keep a dry tin of seeds beside my bed. Some of them are gifts I haven't found the right person for yet.",
      "A garden is a letter you write to a day you don't get to choose. That day answers when it likes, and I leave it room to be rude about it."
    ],
    "callbacks": [
      "The seeds in my tin stay dry and small. The ones I planted have stopped growing. They are green and they do not change. Neither is dead. But only the seeds in the tin still have a season coming.",
      "I called into that valley for years. When something answered at last, I was so glad that I took it for the answer I had imagined. The garden has been less hasty than I was. I am listening to the garden now."
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
