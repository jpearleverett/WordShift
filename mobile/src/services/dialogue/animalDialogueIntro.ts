import { AnimalType } from '../../types/homeWorld';

/**
 * Intro dialogues - Multi-part introductions shown once when each animal is unlocked
 * These play in sequence before regular dialogues begin
 */
export const INTRO_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "Oh! Come in, come in. Mind the step. I keep meaning to fix that step, and then I make tea instead.",
    "I'm Ember. I found this old den standing empty and moved in the same afternoon, with a kettle under one arm and no plan at all.",
    "There are two cups on the shelf, and I've been keeping the second one ready. The chipped one is mine. You get the one whose handle stays attached.",
    "You're the one bringing the words. I felt it from in here, like a door opening somewhere under the floor, and I've been hoping you'd knock.",
    "My plan is rooms, one at a time. A kitchen first, in case somebody sensible wants to cook in it. Then more friends.",
    "Nothing grand today. Sit down. Tell me if this cushion needs more stuffing. I'm too attached to it to judge.",
  ],
  pangolin: [
    "Panko. Cook. Mind the pot while I clear you a stool. This kitchen is new to me, and I keep opening cupboards I haven't unpacked yet.",
    "Under that cloth is ant soufflé. You may say no thank you. I shall take it very well and eat your portion.",
    "Would you hold this spoon? Don't stir yet. I want to taste what's in the pot as it is, before we improve it.",
    "When things get too much, I curl up in a ball. Scales outside, cook inside. It took some ingenuity to make an apron that curls up with me.",
    "My grandmother gave me the good spoon. There's a split in the handle that catches my thumb. I haven't the heart to sand it smooth.",
    "Ember said you helped make room for a kitchen. In that case, you eat first. As soon as I find where I put the bowls.",
  ],
  owl: [
    "Mind the stacks. I file by affection. That is a real system, whatever my old colleagues used to say about it.",
    "Archimedes. My own study at last. I intend to keep the desk clear at all times. Please don't look at it yet.",
    "Eleven books in that crate, according to my list. I'll catalogue them after tea. Scholarship has a proper order, and tea comes first.",
    "You may borrow any book you like. Bring it back with the page corners uncreased, and I'll go on being a delightful lender.",
    "Words have histories. Bring me one that interests you, and I'll try to stop talking before supper.",
    "There's a spare chair under those papers. Give me a moment. I've been getting this room ready for visitors and forgot to leave anywhere for a visitor to sit.",
  ],
  axolotl: [
    "Oh! Hello! A bubble popped and there you were. That's the best thing a bubble has ever done.",
    "I'm Axel. I wanted the tank beside the window, then remembered I can't move the tank. Somebody else did the lifting, and I'm taking half the credit.",
    "See this pink toe? It's new. I grew it myself. I'm showing everybody until it stops being exciting.",
    "These are my fish, GLOW and PLUM. GLOW follows the feeding spoon. PLUM argues with it. They're both quite sure they own the tank.",
    "I'm an axolotl. I keep my gills even when I grow up. The fish think that's showing off.",
    "Visit whenever you like, and tell me something from outside. I can see the window, but I can't smell rain through it.",
  ],
  sloth: [
    "Ah. You looked up. A promising start. Most visitors say hello to the hammock first.",
    "Sloane. I knew this clearing before anyone added the new rooms. The old den makes a much better neighbor with company in it.",
    "The hammock is mine. The branch belongs to the tree, and the two of us are still negotiating.",
    "Three moths live in my fur. I call all three Gerald. They arrived separately, but three names would only complicate the administration.",
    "It took me four months to get this comfortable. You needn't match that on your first visit.",
    "Stay or go, whichever suits you. If you stay, please hand me the leaf caught on the rope. It has been annoying me since breakfast.",
  ],
  fennec_fox: [
    "That was you! I heard your step and thought it was the kettle lid clicking. Welcome to camp. I'll put the kettle on.",
    "Fennick. Yes, the ears are real. No, they don't fold away. People do ask.",
    "I can hear things from a long way off. The hard part is remembering to listen to the creature standing right in front of me.",
    "The desert is easier on my ears than a crowded room. Out here I can follow one sound all the way to its end.",
    "Want to hear the sand cool? It clicks as it goes. Sit quietly, it takes a while. I promise not to test you afterwards.",
    "Visit whenever you like. If I'm asleep, knock on the canvas. Gently. It's only canvas, so a light knock is plenty.",
  ],
  capybara: [
    "Hey. The good chair is free. I tested it thoroughly before I declared the office open.",
    "Chill. That's the real name, it's on all the paperwork. I understand why you checked.",
    "Coffee's in the pot. The pot isn't on any form, nobody requisitioned it. We keep a few freedoms here.",
    "My face doesn't do much. I do have reactions, I just don't circulate all of them.",
    "I take my breaks at the hot spring. The ledger stays here on the desk. If I ever carry it down there, stop me.",
    "Stay as long as you like. Leaving is allowed too. Neither one needs a form.",
  ],
  wombat: [
    "Mind your head, that lintel is low. I built this doorway to fit me. Quickest way for a fellow to learn how tall everybody else is.",
    "Warren. Thirty years digging, seventeen chambers in that time. This burrow is my latest job, and I'm proud of the corners.",
    "That old foundation was down here long before anything was built on top of it. Good stone. I'll show you where my new work joins it.",
    "Everything I make comes out square. My corners, my shelves, even what I leave behind in the corner of the tunnel. Nature's joke, and not a polite one.",
    "I can smell a wet patch before it breaks through. Handy in a trade where the ceiling over your head is also the ground.",
    "Put your bag on the crate. The lamp's over here. I can show you the work, or I can make tea. The work is quicker to explain.",
  ],
  rabbit: [
    "Oh! Come in. Please catch the gate before it bangs. The marigolds don't mind the noise, but I do.",
    "I'm Thyme. This is my garden. That bed is thyme as well, the plant. You can see why I label everything.",
    "I grew every flower here from seed. Except this one. It rode in on my scarf, and it refuses to match my planting plan.",
    "There are twelve ways out of this garden, counting the gap behind the mint. A rabbit likes knowing where every path leads.",
    "Chamomile tea? It's much better when I remember to stop steeping it in time. I'm trying a timer.",
    "Visit while I work, if you like. You can help, too. I'll find you a job that doesn't need you to remember where every seed went.",
  ],
  red_panda: [
    "You made it to the top. Sit down before your legs start complaining. I know that staircase.",
    "I'm Bamboo. They and them, if you need a pronoun. And tea, if you need something more useful than a pronoun.",
    "I chose the attic for the morning light. When the sun moves off my mat, I move the mat. Arguing with the roof never worked.",
    "Archimedes packed incense in with my moving crates. I'm getting through the bundle much faster than I'm getting through his books.",
    "One reed in my mat rattles in the breeze. I meant to tie it down. Then I got used to the sound.",
    "You can sit here quietly without doing it correctly. I've had a great deal of practice at doing it wrong.",
  ],
  tarsier: [
    "Up here, on the rail. I'm Vesper, and this is the Star Loft. Step over the chalk on the floor, please. Smudge it and I have to measure every star again, which is a poor way to start a friendship.",
    "My eyes can't move in my head, so I turn the whole head instead. When I look at you, you get all of my attention at once. Tell me if that's too much.",
    "My family kept a night watch. I brought their log up here. It's full of careful entries, and not one of them says why the watch began.",
    "That lantern is unlit on purpose. Lit, I can see the porch. Dark, I can see the whole valley.",
    "There's a patch of sky above the ridge that I can't account for. I won't try to explain it until I've watched it long enough to have something worth showing you.",
    "Come at dusk if you can. I'll show you my favorite star first. The watch was handed down to me. I'd like it to include one thing I picked.",
  ],
  aye_aye: [
    "Tock, that's my name. Mind the last stair, it creaks. It announces visitors far more enthusiastically than I do.",
    "I'm an aye-aye, from the night woods. Lately I've come from several places that didn't want an aye-aye. This tower gave me a different answer.",
    "The bell up here has never rung, not once. I've only just become her keeper. I'd like to be present when she finds her voice.",
    "This long finger taps wood, and the sound tells me what's inside: hollow, solid, or a grub. A peculiar hand is a useful hand, if someone lets it work.",
    "I sleep in the daytime, so visit after dusk and I'll show you around. Every beam here sounds different, and I have favorites already.",
    "Tok, tok. That means hello up here. You don't need to bring anything with you. I'd just like to hear the stairs again.",
  ],
  kakapo: [
    "I'm Moss. Mind the seedlings. I carried their soil up those stairs myself, and I plan to be proud of that for a good while.",
    "I'm a kakapo. I can't fly, so I walked here. Every hill on the way reminded me of it.",
    "That honey smell is me, I'm afraid. The bees call it false advertising. I keep sugar water by the gate to keep the peace.",
    "That shallow bowl in the dirt is where I sit and call. Ninety years of sending it out, then listening for an answer.",
    "I still want to be heard. There. That's a large thing to say to someone I've only just met. Shall we look at something smaller?",
    "This is a rimu seedling. It needs years to become a tree, and it needs water today. You can help with today's part.",
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
    "I sat up watching the clock. It went past midnight at last, and I let the kettle boil dry. The first breakfast after that night was a little smoky.",
    "I keep expecting the fire to explain itself. It is very good at being warm instead.",
    "Duchess the spider has rebuilt her web right across my best cushion. I admire her courage. I object to her location.",
    "You can have tea without talking about that night. You can talk about that night without having tea.",
    "Every evening I write down one thing the house tried to keep the same, and one thing I changed anyway. Yesterday it was the warm spot on the floor. I moved the rug over it.",
    "I asked Panko whether she trusted me. She handed me a knife and watched me chop. We are starting with onions.",
    "The extra cup is back on the shelf. I will take it down when somebody asks for it.",
    "Something is still down there in the warmth. I do not know how much of us it hears. So I ask you things now, instead of answering for you.",
    "My joke about the robes was not funny. I am glad somebody finally said so.",
    "The fire and I are still in a correspondence. I read its letters now the way I would read one from anybody who had lied to me once. Slowly, twice, and out loud.",
    "My tail wore one side of the cushion thin. I turned it over, then turned it back. The worn side fits me better.",
    "You drew a line around the invitation, and it is holding. I want to keep noticing that line, especially when forgetting it would be easier for me.",
    "I would like it to be easy between us again. I am not going to hurry it. Hurrying the easy part is how I got us here.",
    "The chestnuts burned. I laughed, then I cried. Now the room smells appalling. Open the window, will you?",
    "The house still tidies while I sleep. Last night it straightened the kettle lid again. I knocked it crooked at breakfast. We have been at this for a week, and neither of us is winning.",
    "Thyme brought flowers and stayed by the door the whole time. I am glad she came. I am trying to let that be enough.",
    "I took the ceremonial lining out of my sleeves. It snagged every time I reached out for somebody.",
    "I miss the fox I thought I was before I had to explain myself. She was easier company.",
    "My mother said fear is a guest: feed it, but never let it rearrange the furniture. I thought she was only talking about fear.",
    "The kettle is on because I wanted tea. There is enough for you, if you would like some.",
  ],
  pangolin: [
    "Breakfast was late this morning, after that long midnight. Nobody died of waiting for toast. I am calling it a successful service.",
    "My grandmother's spoon still has its split, and it still catches my thumb. I could sand it smooth. Today I do not want to.",
    "The pot still gives the same perfect broth every day, with no help from me. I put too much pepper in mine. We survived.",
    "Ember still comes to chop onions. Yesterday we talked about something besides onions, for almost a minute. It is a start.",
    "There are two chalkboards in my kitchen now. One is what I am cooking. The other is what people actually asked for.",
    "The house is warm, and I still miss my grandmother. Both are true at the same time. No recipe I own explains that.",
    "The ant soufflé collapsed in the tin. I sat down on the floor and ate the whole thing. A private triumph.",
    "When someone leaves a bowl half finished, I ask before I fill it again.",
    "I used to call the whole house my table. I have stopped. It is a lot of rooms, and the things inside them belong to other people.",
    "Something listens at supper. I do not give it a portion that belongs to somebody else.",
    "Archimedes dislikes my soup. He is wrong, and he has written it neatly in his notebook, so the mistake is well preserved.",
    "I cut up the ceremonial cloth and made an oven mitt out of it. Finally, a job I understand.",
    "The recipe that finished itself is still wrapped in its cloth at the back of the drawer. I have not burned it, and I have not cooked it. Tonight it is my grandmother's barley soup.",
    "Company while you eat, or would you rather I found work at the other end of the kitchen? I have potatoes to peel either way.",
    "Our welcome has a limit now. Every recipe I trust says how many it serves, and I used to skip that line. Now I read it first.",
    "My grandmother's bowl was empty plenty of nights. She was still a good cook.",
    "I cleared someone's place at the table before they were ready to leave. I put it all back and apologized.",
    "This loaf has a crooked seam down one side. Leave it be. That is where it tears open easily.",
    "I am proud of this kitchen. I am still working out how proud to be of its cook.",
    "Hungry? It is a plain question. You may give me a plain no.",
  ],
  owl: [
    "My account begins at midnight. The seam in the sky closed after that. The presence stayed. I have written those down as two separate observations, not one explanation.",
    "The old book has an ending. My own notebook still has blank pages. The blank pages are more useful now.",
    "Three things I got wrong before breakfast, and one I got right. My old catalogue was a great deal more flattering than that.",
    "The ordinary notebook stays ordinary. Spilled cups. An argument about soup. Nobody in it turns into a symbol of anything.",
    "I was fond of you before I understood the arrangement. That part was mine. So was my poor judgment.",
    "The presence reads over my shoulder now. I can feel it along the inner wall. So I read aloud the passages where an author admits he was wrong. It goes very quiet for those.",
    "A new entry appeared in my index overnight. The entry is one word: unfinished. I suspect the index disapproves of how often I consult it.",
    "The boundary we made belongs in the record. I have no proper heading for it yet, so I wrote it down without one.",
    "I have asked Panko to write her notes in the margins of a cookbook. My scholarly reputation may not survive it.",
    "I still file by affection. A catalogue is allowed to be personal, so long as it says so.",
    "Some mornings I miss being certain. I am trying not to mistake that feeling for evidence.",
    "Thyme's ruler sits on the desk beside mine. We disagree about where to start measuring. Both of our marks stay on the page.",
    "I cannot explain everything that stayed after the sky closed. I can show you exactly what changed on this page.",
    "I read the poem about the geese aloud. Ember laughed in the wrong place. The poet would have hated her.",
    "I finally told Fennick that I lied to him, the night I said owls go still to listen. He already knew. Owls do go still to listen, he said. Just not like that.",
    "The cover is wearing through at the hinge. I mend it myself. I will not ask this house for a book with a newer past.",
    "One of my own predictions was wrong. I underlined it. A useful page at last.",
    "I let Axel choose what I read next. It was a picture book about a snail. I have eleven questions, and he refuses to answer any of them.",
    "The final word mattered. It did not make every earlier word harmless.",
    "I have a question saved for tomorrow. I am leaving it there until tomorrow.",
  ],
  axolotl: [
    "The light after midnight looked ordinary through the glass. I watched it for a long while anyway. Ordinary took time to trust.",
    "GLOW bit the feeding spoon again. Same spoon, new dent. I was absurdly pleased.",
    "I do not have one answer about PLUM. I have the list instead, with his teeth marks on it. It keeps getting longer, and that seems right.",
    "Tell me one thing that changed outside today. A leaf falling counts. It really does.",
    "The deep current is still down there. I keep a pebble where it splits, so I can watch which way the water goes.",
    "My bubble game has no way to win. You would be good at it. Or terrible. There is no way to tell.",
    "I laughed today and somebody looked worried. Something was funny, that is all. Laughing can happen after things hurt.",
    "I still curl up on the warm spot some afternoons. I set a pebble against the glass first, so I can check whether anything moved while I slept.",
    "My new toe is not new anymore. It is lovely to be bored by a toe.",
    "Some days I can talk about the fish. Some days I would rather hear about your day instead.",
    "Midnight kept a great many things exactly as they were. I would still like to be a little different by your next visit. Taller, maybe. Or better at squares.",
    "I put a rock somewhere inconvenient. Then I moved it, because it annoyed me. An excellent afternoon.",
    "The last A I scratched into the glass is still there. It does not have to be a lesson. It is a small crooked A, and it is mine.",
    "Do not finish a happy sentence for me. I might be taking it somewhere else.",
    "I can be relieved and still have questions. There is room for both in this tank. They do splash.",
    "Water remembers shapes. I remember interruptions. PLUM had a marvelous talent for interrupting me.",
    "Fennick can hear me laugh from his room. I asked whether he can hear me being quiet. Apparently I am bad at that too.",
    "I have not solved the feeling. I have cleaned the lamp. One job done.",
    "When I am sad, the water warms up around me, trying to help. I thank it and swim to the cold end. Some feelings need their own temperature.",
    "Come and see the bubbles whenever you feel like it. I might have thought of something new by then.",
  ],
  capybara: [
    "Midnight ended. There was a day after it, so I dated the next sheet. Best paperwork I have ever done.",
    "My record of what happened has disagreement in it. Disagreement does not spoil a record. It makes it accurate.",
    "Good chair. Same squeak. The house offered me a quiet one again. I declined again.",
    "The house left a tidier copy of my notes on the desk. I am checking it against the messy original before I file it. Tidier is not the same as true.",
    "We agreed on a boundary. I do not get to change it just because it would make my forms simpler.",
    "I made too much coffee. That is an observation, not a requirement that you stay.",
    "I asked Thyme what help she actually wanted. She gave me a real job to do. Much better than telling her to relax.",
    "Some mornings I write down that I am afraid. Some mornings I do not need to. I check the page at noon. So far it says whatever I wrote.",
    "My pen sat uncapped all afternoon. Nobody came along and capped it. Small victory, one ink stain on the carpet.",
    "There is no meeting today. You are welcome to attend anyway.",
    "I do like things in order. Now I check whether somebody was left out to make them look that way.",
    "My first report on all this was wrong. I kept it in the file. I would like to know that mistake by sight next time.",
    "Someone complained today and had no fix to offer. I accepted the complaint. Finding the fix is not the complainer's job.",
    "I took a break in the hot spring and left the ledger here in the office. The two of us do not need to soak together.",
    "I would like all of this settled. But I have stopped writing settled in other people's columns.",
    "Panko and I are speaking again. She reads the whole agenda every morning now and corrects my spelling in red. I have never been so glad to be corrected by somebody.",
    "I signed, then changed my mind. So I crossed the answer out and put my initials beside it. You can still read both.",
    "It still sits in on things. Some evenings the office goes warm and quiet, as if someone has pulled up a chair to listen. I let it listen. I do not let it take the minutes.",
    "Yesterday I felt calm, all on my own. I checked the source twice before I enjoyed it. It was mine. A good day, and an accurate one.",
    "You are here. How you feel about that is your entry to write, not mine.",
  ],
  fennec_fox: [
    "A sound woke me after midnight. It was smaller than I expected. I checked the ordinary answers first, the way I always do.",
    "Ember and I still split the night. We talk at the handover now, which we never used to do. Mostly about whose turn it is to make tea.",
    "The low note is still there, under the wind. The good part is that I can hear the wind as well.",
    "Vesper changed the ending of her song. I followed her instead of correcting her.",
    "I do not want a silence so complete that I could not hear someone ask me to stop.",
    "Wool over one ear, the other still turned toward camp. I am learning to rest by halves.",
    "Axel laughed at a joke I missed. He explained it, which made it less funny. I am glad to miss something ordinary.",
    "I heard your last word land, the night of the arrival. Every word before it had fed the great note. That one made it move over.",
    "A beetle was kicking sand against my bowl. A small musician with no interest in an audience.",
    "My chart still has gaps in it. They stay blank until I hear something worth writing there.",
    "Some days I like the quiet. The other days, I do not owe it anything.",
    "Someone answered me before I had finished asking. So I asked again, from the beginning.",
    "The chime is hanging outside again. The wind can play it badly if it likes.",
    "I can hear a step now without deciding what sort of person is making it.",
    "Sit quietly, or complain out loud. These ears are available for both.",
    "The kettle needs a new lid. I had grown used to the rattle. Being used to a noise is not the same as wanting it that loud.",
    "I stopped listening for a whole minute. Nothing asked me to apologize for it. Next I will try two minutes.",
    "Some sounds still frighten me. A floorboard that stops creaking overnight. A voice that agrees too quickly. The kettle, when it boils exactly on time.",
    "I would like another song with Vesper. One that neither of us knows yet.",
    "There is a quiet place behind the canvas. I have put down a second mat there, for you.",
  ],
  sloth: [
    "I got what I waited for. I am still working out how much of that is good news.",
    "My moths slept through the arrival. All three are named Gerald, and all three missed it. They had their own night.",
    "Our guest lives in my tree now. When I hum, it hums along, half a beat behind me. I have started humming badly on purpose.",
    "Some nights the house still pulls my hammock tight. Every morning I loosen it again. We have a routine now. It is the most regular thing I have ever done.",
    "Some days I am glad it came. I know that is a hard thing for the others to hear.",
    "Thyme disagrees with me about all of it. We can sit in the same shade while she does.",
    "I waited most of my life for this. Now the mornings are full of small jobs, and I did not expect that.",
    "I wanted it here. I am also glad it did not get everything it wanted. Your last word gave it a limit. I would never have thought to set one.",
    "I climbed down and fetched my own dumplings. Panko says her pulley has earned a holiday.",
    "Do not let my long life win an argument for me. I have simply had more years to practice being wrong.",
    "Fennick asked whether I was ever frightened in all my years of waiting. So I told him about my bad night, all of it, at my own pace. He listened to the very end without once finishing my sentences. For Fennick, that is devotion.",
    "I tried apologizing quickly. That was new. I had to start over and do it at my own speed.",
    "The green grows while I sleep. I am learning to stop supervising it in my dreams.",
    "You may dislike what I chose. I would rather hear that than sit beside an easier version of you.",
    "Some afternoons the light sticks and will not move toward evening. So I climb down and walk once around the house, slowly. By the time I am back, it has usually moved on. Usually.",
    "One of the moths has moved out. Gerald, of course. The Geralds who stayed are taking it personally.",
    "I did nothing all afternoon, and I did not call it a discipline. I recommend it.",
    "The warmth is still in the tree. I can be fond of it and still move to another branch.",
    "I have started a new list of things worth hurrying for. Two entries so far. Supper with the others. And telling someone they are wrong while it still matters.",
    "Stay an evening if you like. I will not ask that evening to become forever.",
  ],
  wombat: [
    "The weight on this house changed at midnight. Everything held. Now I look at the joints that held too tight. Those are the ones that crack.",
    "I wrote my brother the whole account this time. The arch, the seal, that midnight. He wrote back that he is coming anyway, with his own spade. Good. My work could use a second pair of eyes.",
    "I kept the revised measurements, not just the first ones. A job that came out well does not prove the first plan was right.",
    "My shovel handle is rough again, the way I like it. Got a splinter in my thumb this morning. Familiar problem, and I will take it.",
    "You drew a limit for this house. I build to that line, not an inch past it.",
    "The old foundation is fine work. I still object to what it was used for. Both things are true.",
    "Thyme's ruler caught a mistake of mine. My own ruler has a worn end. I should have noticed that years ago.",
    "The stone under my mug is still warm. It keeps the tea hot. I do not need a theory for that today.",
    "I repaired the same hinge twice. Used a different pin the second time. If a job keeps coming back, change the method.",
    "My chalk marks stay right beside the old ones. Anybody who comes to check the work can compare the two.",
    "I use the robe as a dust sheet now. Good coverage. Too many holes around the sleeves.",
    "I reinforced the crate. A lot of worried creatures come down here and sit on it, so it may as well hold them.",
    "Something tidied my rubble pile while I slept. I put it back in order of where each piece was cut from. Tidy looks better and tells you nothing.",
    "I understand that seal in the foundation better now. That does not mean I understood it when I laid the brace.",
    "The deep gallery still measures forty-four strides. Three weeks running, no growth. I pace it every morning anyway. A room that stopped growing once can start again.",
    "I liked being needed. That is how a bad instruction starts sounding reasonable.",
    "The wall holds. We still argue about whether it should stand there at all. So I keep two reports, one for each question.",
    "I took an afternoon off. The house did not fall down. Mildly insulting.",
    "If a room wants changing, bring me a drawing. There are more ways to build this house yet.",
    "It holds today. I will check it again the moment anything changes.",
  ],
  rabbit: [
    "The morning after that night, I watered the marigolds. They were thirsty. It was a relief to be asked for something so simple.",
    "Something listens in the garden now. When I talk to the beans, the whole bed goes quiet to hear. So I tell the beans ordinary things. Weather. Slugs. It will have to get used to slugs.",
    "Some seeds are still in the tin, unplanted. I like owning a future I have not arranged into rows yet.",
    "I complained to Bamboo for a whole minute, and they did not once answer me with the weather. That is progress, for both of us.",
    "Every morning I check the gate latch and the gap behind the mint, and I write down what I find. Most mornings both are how I left them. Good news deserves a record too.",
    "I enjoyed my breakfast. Then I felt guilty for enjoying it. Then I had more toast.",
    "One bed is crooked because I planted it crooked. I labeled it, so I will remember that I meant to.",
    "I sewed pockets into my robe. Deep ones. The seed tin fits in the left, and string in the right. It is starting to feel like my own coat.",
    "Ember comes down to the garden most evenings now. I still have questions, and she answers the ones she can. She is learning to bring time as well as tea.",
    "A beetle frightened me this morning. Then it ate a seedling. I crossed out frightened and wrote annoyed.",
    "Please do not praise me for standing in my own garden. Ask me what is growing instead.",
    "Some mornings the garden feels safe, and some mornings it feels watched. I mark each one on the calendar. This month the safe ones are ahead, narrowly.",
    "My old list holds wrong guesses and correct observations. All of it is in my handwriting.",
    "The watering can was still where I left it this morning. Such a small thing to be so pleased about.",
    "I moved a path today, because I wanted it to go that way. The flowers will grow around the new bend.",
    "Tea? You may say no. I am fond of questions that have real answers.",
    "I am angry that I was told I was only nervous. I can be angry and still enjoy my flowers.",
    "Warren asked me before he adjusted the gate latch. I did not know how much I wanted to be asked.",
    "I do not know what next spring will bring. I would like to keep it that way, so it can still surprise me.",
    "Would you hold this string while I measure? I am laying out the new beds, some rows straight and some crooked. I have already decided which. The house can find out when they come up.",
  ],
  red_panda: [
    "The incense smoke curled this morning. I watched it and did not decide what it meant.",
    "Thyme was upset when we sat together. I did not ask her to be calmer for my sake.",
    "The loose reed rattled all through my meditation. I was annoyed. That is the whole report, no lesson attached.",
    "The presence comes up to the attic most evenings, the way warmth rises. It settles under the roof gap, where I used to sit. I do not bow to it. I do not leave, either. We are still working out the rest.",
    "The invitation has a boundary, and it applies to my curiosity too. I do not need to look inside everything.",
    "I can enjoy the warmth now without talking everyone else into feeling it. I am still working on that.",
    "My tea is better when I watch the pot instead of giving a lesson about patience.",
    "One bamboo leaf was facing the wall. I moved the pot so I could see what it was looking at.",
    "I said I did not know. The room stayed standing. That was useful to learn.",
    "I still miss my old certainty sometimes. I put the kettle on and wait for the feeling to pass.",
    "Some evenings the warmth tries to finish my sentences for me, with smooth, kind endings. I stop, and finish them myself. Badly, but they are mine.",
    "Thyme asked why I had been so certain. This time I answered about myself, not about what was coming.",
    "Archimedes' incense is nearly gone. Ordinary supplies run out. I will ask him where he bought it.",
    "The gap in the roof shows less sky than I remembered. I had been filling in the rest from memory.",
    "We can leave a disagreement unfinished and drink our tea while it is warm.",
    "I moved the mat again. No revelation behind it. I wanted the morning light.",
    "Someone rewrote one of my old teachings. I put my own words back and wrote my objection underneath. I want to remember saying it.",
    "Fennick climbed my stairs today, for the first time since that night. He still did not stay for tea. He stayed long enough to say the hum is quieter up here. I wrote that down in his words, not mine.",
    "I would rather be a useful companion than an impressive guide.",
    "Third Dawn has finished flowering. There is a new shoot at its foot, and the warmth keeps leaning over it, as if to keep it small. I water it anyway. I have not named it yet. I want to meet it first.",
  ],
  tarsier: [
    "The opening above the ridge closed over. I still look at the spot where it was. Then I turn and write down what is here now.",
    "There is a page in my watch log marked off duty. I have started using it.",
    "Fennick suggested a song I do not know. I objected. Then I asked him to sing the first part again.",
    "The lantern still lights itself at dusk. Some nights I let it. Some nights I ask it to stay dark, and it stays dark until morning. I check every time.",
    "A moth landed on my notebook. I ate it before I recorded the species. A scholarly loss.",
    "I went downstairs at noon, awake, on purpose. The house by daylight is much busier than my charts suggested. Somebody fed me. Nobody asked me for a report.",
    "The presence lives in the house now, not above the ridge. I still watch the ridge. It was never the only thing in the dark worth watching.",
    "I turn my whole head when a friend speaks. My grandmothers never wrote that skill down in the log.",
    "We set a limit on the invitation. I can see past an edge. That does not make it mine to cross.",
    "A cloud covered my favorite star tonight. I let it go unwatched for a while.",
    "I wanted to see the answer. I did not expect to spend an ordinary morning sitting beside it.",
    "Some nights I am still afraid to look away. I tell Fennick when that happens.",
    "My old star chart came back from the drawer corrected, every star in its proper place. I drew my mistakes back in by hand. They show where I was looking.",
    "The beetle under my lantern has moved out. I do not know where. A private life, apparently.",
    "Bamboo and I ask each other how we slept again, at the dawn handover. Badly, usually, both of us. It is a better question than whether the gap held.",
    "I found Thyme watering the garden. I asked about her flowers. The old me would have reported her position instead.",
    "I use one color of chalk for what I see and another for what I guess. The guessing chalk runs out first.",
    "The chip in my rail is still there. Some mornings it feels shallower. I press a finger into it and say out loud where I am.",
    "I would like tomorrow night to surprise me. Something small. I am not greedy.",
    "Take the spare seat. We can watch the same sky and notice different things.",
  ],
  aye_aye: [
    "The bell has a note in her bronze now. I do not need to ring her to prove it to every visitor.",
    "The little scratch near her rim is still fading. I asked the house, out loud, to leave it alone. It fades more slowly now. I am choosing to call that listening.",
    "Everyone asks what she sounded like that night. I was standing right beside her, and I still cannot describe it. I only know it sounded like an answer.",
    "I like being welcome here. I am learning not to treat that welcome as a debt I owe.",
    "Tok, tok. That still means hello. Some of my vocabulary survived an eventful night.",
    "I catch myself listening at a closed door. Then I remember to knock and ask what is behind it.",
    "My gnawing block needs replacing. I have worn it down to nothing, which is reassuring. Not everything here has become permanent.",
    "A guest can be misunderstood and still need to learn the rules of the house. I include myself in that.",
    "Vesper leaves a space for me beside her on the rail. I sit there, and I ask before filling her quiet with talk.",
    "My finger shook over an ordinary little repair, and I laughed at myself. All that grandeur has not improved my workmanship.",
    "The presence still answers in the beams. I do not know whether it understands why I sometimes stop tapping back.",
    "Our invitation has a limit. I listen carefully whenever the knocking comes close to it.",
    "My robe caught on everything, so I shortened the sleeves. Ancient craft, meet scissors.",
    "Nobody in this house ever latched a door against me. I want to stay the sort of creature who still notices a latch.",
    "There is a grub in the bell frame again. Its business is entirely unaffected by our revelations.",
    "I wanted something lonely to find a home. I still want that. But a home already has others living in it, and they count too.",
    "I have kept one loose peg. It makes a different note from the fitted ones. Pleasantly useless.",
    "No tour today, unless you would like one. We can just sit here where the bell's shadow ends.",
    "I asked for a little quiet, then waited to see whether I would get it. I am still learning how to ask.",
    "Come whenever you like. You do not need to bring a word. The stairs announce you, and I know your step.",
  ],
  kakapo: [
    "After the long midnight, I watered the seedlings. Nothing that happened has made them too important to need water.",
    "Getting an answer is not the same as hearing the voice you hoped for. I am learning to tell the two apart.",
    "My calling bowl has a little rain in it. Today I am letting it be a puddle.",
    "The old call comes out of this body. So does the undignified noise I make getting off a bucket. Same bird, both times.",
    "I waited ninety years for an answer. Now I would rather my days were about something other than the waiting.",
    "The rimu seedling grew a new leaf, its first since the warmth settled in. That was its own work entirely. I only contributed water.",
    "I still smell of honey. The bees come expecting flowers and find only me. Stable diplomatic relations, all the same.",
    "The warmth still comes up under the beds at night, and it still tries to hold the best bloom open past dusk. I fold a leaf over the bloom and let it close. These days the warmth lets me.",
    "The last word you gave that night had an edge to it. I am glad. Even a garden needs a place where the gardener stops digging.",
    "Thyme has not planted every seed she owns. I admire a gardener who keeps some back for weather she has not met yet.",
    "Some days I am glad of the answer. Other days I miss the asking. Nobody warned me that both would be true.",
    "The weed I let stay beside the path has flowered. An excellent argument for leaving a plan unfinished.",
    "I hummed a different tune while I worked today. The seedlings offered no opinion on it.",
    "The ground still knows my grandmother's words. Some nights it offers them, very kindly. I thank it and do not ask for more. Being answered did not give me her back.",
    "Some of the house wanted a welcome from me that night. I gave one answer, for myself. A few of them are still sore about it. I would give the same answer again.",
    "I relined the nest today. No warm stone has turned up in it since the one I carried out to the path. I keep it lined for my own reasons now.",
    "I would like to learn something that takes longer than an afternoon. Better bucket carpentry, perhaps.",
    "If the humming stops, it does not mean I have left the garden. Sometimes it only means I am eating.",
    "A branch grew across the path, so I moved the path. The tree and I are both allowed to change.",
    "Stay and help me water, if you like. There is a small empty pot by the gate for whatever we have not thought of yet.",
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
      "There you are. Let me move the kettle. I've been fussing with it to put off an awkward conversation.",
      "Your words reach the fire, and the flames answer. I can read some of what they say.",
      "I knew your visits were keeping this place alive. I should have told you that before I asked for more words.",
      "Sit down if you want. This time I'll answer the questions you actually ask.",
    ],
    3: [
      "Come in, friend. Take the chair nearest the door.",
      "I invited you in knowing your words sustained something here. I thought that only meant we would end up with a house full of friends.",
      "The fire is asking for more than warmth now. I don't know enough about what that will cost us.",
      "You are allowed to be angry with me. I won't use tea as an argument.",
    ],
    4: [
      "I am here. The kettle can wait if you want to ask me something.",
      "I knew what your words helped sustain. I did not know that being kept would mean never being allowed to change.",
      "That does not excuse what I hid from you. You deserved to know what I knew.",
      "You can sit as far away as you like. I will bring my answers to you there.",
    ],
  },
  pangolin: {
    2: [
      "Ember said there was room for a cook. I've brought pans, spoons, and more onions than I should have carried that far.",
      "Panko. My apron closes at the side. That way I can curl up in a ball without taking it off.",
      "The stove was warm before I ever lit it. I've set a cold pot on it, to see how fast it heats with no flame.",
      "There was a recipe in one of the cupboards. Nothing else in there, just the recipe. I haven't followed it yet.",
      "I'll make something I know first. Are you hungry?",
    ],
    3: [
      "Panko. I came with bread. Difficult news goes down easier when nobody is trying to ignore an empty stomach.",
      "This kitchen is new to me. The warmth coming up through the floor has evidently been here much longer.",
      "The recipe here lists words alongside the ingredients. I've left the page open so you can see it for yourself.",
      "I don't know who wrote that recipe. If words can go in the pot, so could a name. I'm not finding out.",
      "Pull up a stool. We can eat and ask the uncomfortable questions at the same time.",
    ],
    4: [
      "Panko. Cook. I unpacked the ordinary pans first.",
      "I have been told what the words have been feeding. Being hungry does not give a guest permission to take everything.",
      "This spoon belonged to my grandmother. I want to keep its whole history, including the split in the handle.",
      "I can feed a whole room without pretending that everyone in it agrees.",
      "There is bread. You may eat it and remain unconvinced.",
    ],
  },
  owl: {
    2: [
      "Archimedes. New study, old books. Please step over the crate, I haven't finished arranging that corner yet.",
      "I ordered eleven books. Twelve arrived. The extra one has no title anywhere on it.",
      "That untitled book opens on a diagram. It resembles the old foundation of this house. Some of the marks on it are in a different ink.",
      "I'm comparing that diagram to the rooms you helped build. Two things that look alike are worth checking, not worth believing yet.",
      "You may look too. I would rather have a second reader than an admiring audience.",
    ],
    3: [
      "Archimedes. I came here to examine one book, and now I'm the one expected to explain it.",
      "The diagrams draw lines from the old foundations to the words spoken in this house. My first reading of them may be wrong.",
      "I thought the marks described protection. Some of them point inward instead, toward the center of the diagram.",
      "I'll show you the page itself. You shouldn't have to take my word for it just because I sound certain.",
      "There's a plain notebook beside that old book. Everything I'm unsure about goes in there.",
    ],
    4: [
      "Archimedes. I have brought paper, pencils, and a reputation I am still trying to deserve.",
      "The book calls the arrangement preservation. I would like the book to say what that word means.",
      "Being kept and being unable to change might look the same on a diagram. On paper I cannot tell them apart.",
      "My account will preserve the disagreements too, not only the conclusions.",
      "You can correct it. I will not call your version an error before I have heard it.",
    ],
  },
  axolotl: {
    2: [
      "Hello! I'm Axel. I was unpacking my rocks. They traveled better than the fish did.",
      "These are GLOW and PLUM. GLOW follows the feeding spoon. PLUM bites it. Their luggage was mostly opinions.",
      "There's a current in the tank now. I didn't bring a current with me.",
      "Sometimes the current spells letters in the water. I've put a pebble where I first saw them.",
      "Sit by the glass sometime? You can tell me whether those same letters have shown up anywhere else.",
    ],
    3: [
      "I'm Axel. This is a strange time to be making a first impression. I've cleaned the glass, at least.",
      "These are my fish, GLOW and PLUM. Please meet them before anybody tells you they're a sign of something.",
      "When I look down through the bottom of the tank, the water keeps going farther than it should.",
      "I can grow a leg back. That doesn't mean I understand everything that comes back.",
      "I'd like company while I look. We can stop whenever you want.",
    ],
    4: [
      "I am Axel. The pink toe is mine. I grew it myself.",
      "This is more than ordinary water. I know that much. I do not know whether what it keeps comes back the same.",
      "The fish keep the same habits every day. I watch them more closely than I watch my own reflection now.",
      "I want good things to stay. I do not want that wish to be the only thing you know about me.",
      "Will you tell me something from outside? A very small thing will do.",
    ],
  },
  sloth: {
    2: [
      "Sloane. The canopy is mine these days. I've known this clearing a great deal longer than that.",
      "I brought a hammock and three moths, all named Gerald. The moths packed lightly.",
      "There is a low sound under everything in this house. I've heard it before, and I have been hoping to hear it again.",
      "Wanting to hear that sound again is a preference, not an explanation. I would rather you knew that about me.",
      "Pass me the cup if you stay. I can talk without asking you to agree with me.",
    ],
    3: [
      "Sloane. I won't pretend I ended up here by accident.",
      "Something I have waited for is coming closer.",
      "I wanted company that would last. I didn't know all the conditions that came with it.",
      "You can ask a willing creature hard questions. I may need them more than a frightened one would.",
      "I'll come down, so you needn't aim your questions at the underside of a hammock.",
    ],
    4: [
      "Sloane. I am willing, and I am uncertain. You should have both of those before you take any advice from me.",
      "I wanted this. My wanting does not count as permission from anyone else.",
      "My three moths slept through this whole explanation. All named Gerald. Sensible editors, cutting the part nobody needed.",
      "I would like the two of us to go on being able to disagree.",
      "You can end this conversation whenever you want to. I am content to hear your answer another day.",
    ],
  },
  fennec_fox: {
    2: [
      "Fennick. The ears arrive a little before the rest of me.",
      "I chose to camp out here because sounds are easier to tell apart in the open.",
      "There's a low note coming from the house, and from the sky as well.",
      "I've scratched bearings in the sand, one line for each direction the low note comes from. They don't make a sensible map yet.",
      "Tell me if you hear it too. It's fine if you don't.",
    ],
    3: [
      "Fennick. I came here to listen, and I brought wool for the nights when listening gets to be too much.",
      "The low sound covers up the smaller ones. When I stop hearing a creature, I go and check that it's still there.",
      "I don't know yet whether it's a warning. I'll tell you what I heard before I decide.",
      "I want quiet very badly. That's exactly why you should check my conclusions.",
      "If you need a break from the report, go and sit behind the canvas. It's quiet back there.",
    ],
    4: [
      "Fennick. I can hear a great deal. I cannot hear whether someone agreed, unless they say so out loud.",
      "The sound underneath the house is still there.",
      "I am listening for what the sound still leaves room for. Wind, insects, someone disagreeing out loud.",
      "If I ask you to repeat an answer, I want your own words, not an echo of mine.",
      "There is a second mat at camp. You may sit on it and say nothing at all.",
    ],
  },
  capybara: {
    2: [
      "Chill. New office, and I've already tested the good chair. It passed.",
      "Coffee first. Paperwork after, if it turns out to be necessary.",
      "There's a form in here with my signature on it. It's dated before I ever arrived.",
      "I made a copy of that form first. Then I started asking who filled it in.",
      "Have a seat. We can disagree with the paperwork and be comfortable while we do it.",
    ],
    3: [
      "Chill. I brought my own ledger with me. The room had already put one on the desk.",
      "The two ledgers don't say the same thing. I'm keeping both.",
      "The room's ledger records an agreement none of us remembers giving.",
      "I know how the paperwork works here. I never agreed to let it know me.",
      "Coffee's on while we work out which ledger is wrong.",
    ],
    4: [
      "Chill. An office should make it easier to hear people. This one still does.",
      "The forms here want everyone marked content. They are very firm about it.",
      "I have left the status field blank until each person tells me how they are.",
      "A boundary will not be amended just to make a report simpler.",
      "Good chair. No conditions attached.",
    ],
  },
  wombat: {
    2: [
      "Warren. Mind the lintel, it's low. This burrow is new. The stone foundation under it is not.",
      "Thirty years of digging before this job. I brought my own tools. They've worn to fit my hands.",
      "The old plans show joints down here. They're the same kind I'd cut myself to carry a load.",
      "There are grooves cut into the stone. They keep going back behind those joints. I'll need a lamp down here before I explain them.",
      "Sit on the crate while I fetch one. It takes my weight, so it'll take yours.",
    ],
    3: [
      "Warren. I came down to inspect the old foundation, and I've found something the drawing doesn't show.",
      "A support and a seal look much alike. One holds weight up, the other holds something shut.",
      "This one pushes inward, toward the middle, not up. So I want to know what it was built to keep shut.",
      "The rooms you've added are real weight. I keep a gauge down here, and I can watch them press on it.",
      "We'll inspect the old stone and my new timber separately, so we know which is which.",
    ],
    4: [
      "Warren. I know how a structure holds together. I cannot say yet what this one was built for.",
      "That old foundation was down here first. The rooms you helped add came long after it.",
      "The joints down here are excellent work. Excellent work can still follow a bad plan.",
      "If this house needs a limit somewhere, I want a real wall. Measured, and built where everyone can see it.",
      "I brought spare wedges down. A wedge holds a door open. A fellow should leave himself options.",
    ],
  },
  rabbit: {
    2: [
      "I'm Thyme. This garden needed a gardener, so I came with seeds and far too many labels.",
      "This tin holds the seeds I haven't planted yet. I like keeping a few back.",
      "On warm days the gate latch sticks shut. I've only just arrived, and I've already found that much.",
      "Some of these flowers were facing the house before I watered them. Flowers usually face the sun.",
      "I'll write down whatever happens here. I'd like help checking my notes, not help being less curious.",
    ],
    3: [
      "I'm Thyme. Please catch the gate before it bangs.",
      "I've measured every path since I arrived. The numbers don't match the diagram I drew on my first day.",
      "I measured again with steady paws, and the numbers are still wrong. So it isn't my nerves. Somebody else should look.",
      "I keep some seeds back, unplanted. I haven't decided where they should grow.",
      "You can sit here while I work. And please don't call me brave just for asking where a path goes.",
    ],
    4: [
      "I am Thyme. This garden is mine to tend. I am finding out what else here is mine to decide.",
      "There are seeds in this tin. I have planted some of them. The rest are waiting until I choose.",
      "I would like to feel safe. If someone promises me that, I want to hear the exact terms first.",
      "If I disagree with you, it does not mean I failed to understand you.",
      "Would you hold the end of this string? Shaky paws can still take good measurements.",
    ],
  },
  red_panda: {
    2: [
      "I'm Bamboo. The attic has lovely light, and a staircase you'll want to sit down after.",
      "Archimedes sent up incense in one of my crates. I lit a stick while I unpacked.",
      "The smoke always bends toward the gap in my roof.",
      "I find that reassuring. I haven't worked out yet whether it should be.",
      "Tea while we watch? We don't have to reach a conclusion before it cools.",
    ],
    3: [
      "I'm Bamboo. I came up here for the view, and somehow started handing out opinions about everyone below.",
      "Those opinions may have come a little early.",
      "The incense smoke moves in a pattern. I've been mistaking my reading of it for the pattern itself.",
      "Thyme keeps asking me questions. She deserves answers about what she sees, not what I believe.",
      "You can ask me something I don't know. I'm practicing saying so out loud.",
    ],
    4: [
      "I am Bamboo. I should begin with what I am not sure about.",
      "I was calm, and I took that to mean I understood what was happening. I did not.",
      "A gentle hold can still be too tight. I had not thought about that nearly enough.",
      "The loose reed in my mat stays loose. It is allowed to sound different from the others.",
      "Sit however suits you. Your feelings do not have to match mine.",
    ],
  },
  tarsier: {
    2: [
      "Vesper. My post is up here at the rail. My eyes can't turn in my head, so the whole head turns instead.",
      "I brought my family's watch log up with me. They handed the duty down and left out the reason for it.",
      "There's a dark patch above the ridge. Older pages of the log have it drawn in too, long before my time.",
      "I can show you where the edge of that patch has moved. I can't tell you yet why it moved.",
      "Stay for the stars if you like. That patch isn't the only thing up here worth seeing.",
    ],
    3: [
      "Vesper. I keep the night watch here. I wanted you to have my name first, before you had my duty.",
      "There's a patch of sky above the ridge. Every time I turn away from it, it pulls my head back around.",
      "When a friend speaks, the sky loses its hold on me. I've been writing down every one of those interruptions.",
      "I want to see what happens. That's my own wish, though. I won't dress it up as a duty for anyone else.",
      "Take the spare seat. I spend my nights looking far off. Tell me what you notice down here.",
    ],
    4: [
      "Vesper. I keep the night watch, and I badly need someone to check my work.",
      "My family kept this log. It taught us how to watch. It never said what seeing everything would cost us.",
      "I want to be seen. I also want somewhere to turn my face away when I choose.",
      "I mark the sky's edges carefully. The creatures here have limits too, and those deserve the same care.",
      "You may sit up here without watching anything at all. I could use the example.",
    ],
  },
  aye_aye: {
    2: [
      "I'm Tock. I'm an aye-aye. Meet the rest of me before you decide what this long finger means.",
      "Vesper sent word that there was a room up here. I came a long way to find out whether the welcome was real.",
      "The bell here has never rung. I've only just begun keeping her company.",
      "When I tap the walls, something taps back. It comes from deeper than the boards.",
      "Would you like a tour? We can stop at the ordinary wood, if that's enough for you.",
    ],
    3: [
      "I'm Tock. I came from places that called me an omen and shut their doors when I passed.",
      "This tower made room for me. I'm grateful for that, and being grateful isn't the same as understanding what happens here.",
      "The bell stays silent. The beams knock back when I tap them. Neither of them has explained the arrangement.",
      "I want another strange creature to find a home here. That makes me partial, and you should know it.",
      "That rope rings the bell. Ask me hard questions before I put my hand on it.",
    ],
    4: [
      "I am Tock. This finger finds the hollow places. It does not decide who deserves to live in them.",
      "I was driven out of other homes for looking strange. That was wrong, and it stays wrong, whatever happens here.",
      "A guest can deserve to be heard and still have to learn our limits.",
      "The bell rope hangs within reach of my hand. Within reach is not an instruction.",
      "Tok, tok. Hello. That part of the conversation can stay simple.",
    ],
  },
  kakapo: {
    2: [
      "I'm Moss. I carried all this soil up the stairs myself. The roof and I are still discussing the weight.",
      "See that shallow hollow in the dirt? I dug it to call from. Ninety years of calling, then listening for a reply.",
      "When I hum while I work up here, something low hums back.",
      "I'd like that low sound to be the answer I've waited for. Wanting it that badly is why I check twice.",
      "Come and meet the seedlings first. Their needs are wonderfully specific.",
    ],
    3: [
      "I'm Moss. I came to this house hoping to be heard.",
      "I've been calling for ninety years. There's something under these garden beds that sounds like an answer.",
      "That sound only resembles an answer. It has cheered me up more than it should have. I know that.",
      "The rimu seedling needs years to become a tree. It still needs its water today.",
      "Sit while I water. I'll tell you about the one voice I was hoping to hear.",
    ],
    4: [
      "I am Moss. An old caller with a garden and one difficult wish.",
      "I wanted an answer. I also wanted one particular voice that I lost long ago. Those are not the same wish.",
      "The seedlings are still new. I do not want them kept as seedlings forever.",
      "I keep some seeds back in the dry tin. There is weather coming that I have not met yet, and I want something left to plant in it.",
      "I would like company while I work, if you have the time.",
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
