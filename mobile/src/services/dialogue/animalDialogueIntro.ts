import { AnimalType } from '../../types/homeWorld';

/**
 * Intro dialogues - Multi-part introductions shown once when each animal is unlocked
 * These play in sequence before regular dialogues begin
 */
export const INTRO_DIALOGUES: Record<AnimalType, string[]> = {
  fox: [
    "Oh! Come in, come in. Mind the step. I keep meaning to fix that, and somehow keep making tea instead.",
    "I'm Ember. I found this old den empty, with the fire already burning. Someone had left a perfectly good kettle.",
    "I inherited the cup. The chipped side is mine. You get the one whose handle stays attached.",
    "You're the one bringing the words. I've seen the amber they leave behind. We could do a lot with a little of that.",
    "My plan is rooms, one at a time. A kitchen first, if anyone sensible wants to cook in it. Then more friends.",
    "Nothing grand today. Sit down. Tell me whether this cushion needs more stuffing. I am too attached to it to judge.",
  ],
  pangolin: [
    "Panko. Cook. Mind the pot while I clear you a stool. This kitchen is new to me and I keep reaching for cupboards I haven't unpacked.",
    "Under the cloth: ant soufflé. You may say no thank you. I shall take it very well and eat your portion.",
    "Would you hold this spoon? Don't stir yet. I want to know what it tastes like before we improve it.",
    "When things get too much, I curl up. Scales outside, cook inside. The apron took some ingenuity.",
    "My grandmother gave me the good spoon. The split catches my thumb. I haven't the heart to sand it.",
    "Ember said you helped make room for a kitchen. Then you eat first. Once I've found where I put the bowls.",
  ],
  owl: [
    "Mind the stacks. I file by affection. A system, whatever certain colleagues used to say.",
    "Archimedes. A study of my own at last. I intend to keep the desk clear. Please don't look at it yet.",
    "Eleven books in that crate, according to my list. I shall catalogue them after tea. One must approach scholarship in the proper order.",
    "You may borrow a book. Return it with the page corners intact and I'll remain a delightful lender.",
    "Words have histories. Bring me one that interests you and I shall try to stop talking before supper.",
    "There is an extra chair under those papers. Give me a moment. I've been preparing a room for visitors and forgot to leave space for one.",
  ],
  axolotl: [
    "Oh! Hello! A bubble popped and there you were. Best ending to a bubble so far.",
    "I'm Axel. I put the tank beside the window, then remembered I can't move the tank. A collaborative achievement.",
    "See this pink toe? New. I grew it myself. I'm showing everybody until it stops being exciting.",
    "These are GLOW and PLUM. GLOW follows the feeding spoon. PLUM argues with it. They are both quite sure they own the tank.",
    "I'm an axolotl. I keep my gills when I grow. The fish consider that showing off.",
    "Visit if you like. Tell me things from outside. I can see the window, but I can't smell rain through it.",
  ],
  sloth: [
    "Ah. You looked up. A promising start. Most visitors greet the hammock first.",
    "Sloane. I've known this clearing longer than the new rooms. The old den makes a rather better neighbor with company in it.",
    "The hammock is mine. The branch is a long-term negotiation.",
    "Three moths in my fur. All named Gerald. They arrived separately. I decline to complicate the administration.",
    "It took four months to get this comfortable. You needn't match the achievement on your first visit.",
    "Stay or go as suits you. If you stay, please pass the leaf caught on the rope. It has been annoying me since breakfast.",
  ],
  fennec_fox: [
    "That was you! I heard your step and mistook it for the kettle lid. Welcome to camp. I'll put the kettle on.",
    "Fennick. Yes, the ears are real. No, they don't fold away. People ask.",
    "I hear faraway things. The difficult part is remembering to listen to the creature directly in front of me.",
    "The desert is easier on my ears than a crowded room. Out here, I can follow one sound to its end.",
    "Want to hear the sand cool? Sit quietly. It takes a while. I promise not to test you afterwards.",
    "Visit whenever. Knock on the canvas if I'm asleep. Gently. A light knock is quite enough canvas.",
  ],
  capybara: [
    "Hey. Good chair's free. I tested it thoroughly before declaring the office open.",
    "Chill. Name on the paperwork. I understand why you checked.",
    "Coffee is in the pot. The pot isn't on a form. We maintain certain freedoms.",
    "My face doesn't do much. Reactions happen. I simply don't circulate all of them.",
    "I take breaks at the spring. The ledger stays here. Please remind me of that if I bring it.",
    "Stay as long as you want. Leaving is also permitted. No form.",
  ],
  wombat: [
    "Mind your head. Low lintel. I measured for myself, which is how a fellow learns about other people's height.",
    "Warren. Thirty years digging, seventeen chambers over a career. This burrow is the latest job and I'm proud of the corners.",
    "The old foundation predates the additions. Good stone. I'll show you where my new work joins it.",
    "Everything comes out square with me. Even the leavings. A gift I struggle to mention politely.",
    "I can smell a wet patch before it opens. Useful in a trade where the ceiling is also the ground.",
    "Put your bag on the crate. Lamp's over here. I can show you the work, or make tea. Tea takes longer to explain.",
  ],
  rabbit: [
    "Oh! Come in. Please catch the gate before it bangs. The marigolds don't mind, but I do.",
    "I'm Thyme. This is my garden. That bed is thyme too. Labels became necessary very quickly.",
    "I grew those flowers from seed. This one arrived in my scarf and refuses to match the planting plan.",
    "Twelve ways out, counting the gap behind the mint. A rabbit likes knowing where things lead.",
    "Chamomile tea? It's better when I remember to stop steeping it. I'm experimenting with a timer.",
    "You can visit while I'm working. You can help, too. I'll find you a job that doesn't involve remembering where every seed went.",
  ],
  red_panda: [
    "You've reached the top. Sit before your legs begin complaining. I know that staircase.",
    "I'm Bamboo. They and them, if you need a pronoun. Tea, if you need something more immediately useful.",
    "I chose the attic for the morning light. Moving the mat keeps it in the sun much longer than arguing with the roof.",
    "Archimedes gave me incense with the unpacking crates. I am working through the bundle much faster than his books.",
    "That reed rattles in the breeze. I meant to tie it. Then I got used to the sound.",
    "You can sit quietly here without doing it correctly. I have had a good deal of practice at doing it incorrectly.",
  ],
  tarsier: [
    "Up here, on the rail. Vesper. Welcome to the Star Loft. Step over the chalk; I would hate to begin our friendship with recalibration.",
    "My eyes don't move. I turn my whole head. When I look at you, you get my full attention. Tell me if that's too much attention.",
    "My family kept a night watch. I brought the log, then discovered nobody had written down why it began.",
    "That lantern is unlit on purpose. Light gives me the porch. Dark gives me the whole valley.",
    "There is a patch above the ridge I haven't accounted for. I won't give you an explanation before I have an observation worth showing.",
    "Come at dusk if you can. I'll show you my favorite star first. I'd like the watch to include something I chose.",
  ],
  aye_aye: [
    "Tock. Mind the last stair. It announces visitors rather more enthusiastically than I do.",
    "Aye-aye, from the night woods. Most recently from several places that didn't want an aye-aye. This tower offered a different answer.",
    "The bell has never rung. I have only just become her keeper. I like the idea of being present when she finds her voice.",
    "This finger taps wood. Hollow, solid, grub. See? A peculiar hand is a useful hand if someone lets it work.",
    "I sleep in the daytime. Visit after dusk and I'll give you a tour. The beams all sound different; I have favorites already.",
    "Tok, tok. That means hello up here. You don't need to bring anything. I'd just like to hear the stairs again.",
  ],
  kakapo: [
    "Moss. Mind the seedlings. I carried their soil up the stairs and intend to be proud of that for some time.",
    "I'm a kakapo. I walk. The hills on the way here made certain I appreciated that fact.",
    "The honey smell is me. The bees find it misleading. I keep sugar water by the gate to preserve relations.",
    "That shallow bowl is for my call. Ninety years I've sent it out, listening afterwards for an answer.",
    "I still want to be heard. There. A large thing to say on a first meeting. Shall we look at something smaller?",
    "This is a rimu seedling. It needs watering today and years to become a tree. You can help with the part that fits in today.",
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
    "The clock finally moved past midnight. I watched until the kettle boiled dry. First breakfast was a little smoky.",
    "I keep expecting the fire to explain itself. It is very good at being warm instead.",
    "Duchess rebuilt her web across my best cushion. I admire her courage and object to her location.",
    "You can have tea without talking about that night. You can talk about that night without having tea.",
    "I knew your words sustained the house. I didn't know what it would keep unchanged. I should have told you what I did know.",
    "I asked Panko if she trusted me. She handed me a knife and watched me chop. We're working with onions first.",
    "The extra cup is back on the shelf. I'll take it down when someone asks.",
    "Something remains in the warmth. I don't know how much it hears. I speak to you before speaking for you now.",
    "My joke about the robes wasn't funny. Thank goodness somebody said so.",
    "I remember your first visit without pretending I understood what would follow.",
    "My tail wore the cushion thin. I turned it over, then back. It fits better this way.",
    "You gave the invitation an edge. I want to notice it, especially when forgetting would be convenient.",
    "I'd like things to feel easy between us again. I won't hurry you into making them easy.",
    "The chestnuts burned. I laughed, then cried. Now the room smells appalling. Open the window, will you?",
    "The fire still listens to your words. You can finish a visit without making any.",
    "Thyme brought flowers and stayed near the door. I'm trying to let being glad she came be enough.",
    "I removed the ceremonial lining from my sleeves. It caught whenever I reached for somebody.",
    "I miss the person I thought I was before explaining myself. She was easier company.",
    "That night doesn't make you responsible for keeping me cheerful.",
    "The kettle is on because I wanted tea. Enough for you, if you want some.",
  ],
  pangolin: [
    "Breakfast was late after that long midnight. Nobody died of waiting for toast. A successful service.",
    "My grandmother's spoon still catches my thumb. I could sand it. Today I don't want to.",
    "The pot offers the same perfect broth. I added too much pepper. We survived.",
    "Ember chopped onions. We discussed onions. A start.",
    "Two chalkboards now: what I'm cooking, and what people actually asked for.",
    "The house is warm and I still miss my grandmother. These things coexist without consulting the recipe.",
    "The ant soufflé collapsed. I ate it sitting on the floor. A private triumph.",
    "When someone leaves a bowl unfinished, I ask before filling it again.",
    "I've stopped calling the house my table. It is a lot of rooms with other people's things inside.",
    "Something listens at supper. I don't offer it portions belonging to anyone else.",
    "Archimedes dislikes my soup. An ill-informed position, carefully preserved in his notebook.",
    "The ceremonial cloth makes an oven mitt. Finally, a job I understand.",
    "Tomorrow's flour is separate. Tomorrow may need something different.",
    "Company while you eat, or shall I find work at the other end of the kitchen?",
    "Our invitation has a limit. I check myself when I start serving past it.",
    "My grandmother's bowl was empty plenty of times. She was still a good cook.",
    "I cleared a place before its owner was ready to go. Put everything back. Apologized.",
    "The loaf has a crooked seam. Leave it. That's where you tear.",
    "I'm proud of this kitchen. Still sorting out how proud to be of its cook.",
    "Hungry? A plain question. You may give a plain no.",
  ],
  owl: [
    "My account begins at midnight. The seam closed afterwards; the presence did not depart. Separate observations.",
    "The book has an ending. My notebook has blank pages. The latter is more useful now.",
    "Three things I got wrong before breakfast. One thing I got right. Less flattering than my old catalogue.",
    "The ordinary notebook remains ordinary. Spilled cups. Disputed soup. Nobody becoming an emblem.",
    "I was fond of you before understanding the arrangement. That part was mine. My poor judgment was mine too.",
    "Correct my account if your memory differs. I'll preserve the difference alongside my version.",
    "The index has acquired unfinished. I suspect it disapproves of how often I consult it.",
    "A boundary belongs in the record even without a suitable heading.",
    "I've asked Panko to annotate a cookbook. This may end my scholarly reputation.",
    "I still file by affection. A catalogue may be subjective if it admits to being so.",
    "Some mornings I miss certainty. I'm trying not to mistake that feeling for evidence.",
    "Thyme's ruler sits beside mine. We disagree where to begin measuring. Both marks remain.",
    "I can't explain everything that stayed after the sky closed. I can show what changed on this page.",
    "I read the goose poem. Ember laughed in the wrong place. The poet would have hated her.",
    "You don't owe the record a feeling you haven't had.",
    "The cover wears at the hinge. I mend it instead of requesting a newer past.",
    "A prediction was wrong. I underlined it. A useful page at last.",
    "Someone else chose the next book. An unexpectedly difficult surrender.",
    "The final word mattered. It didn't make every earlier word harmless.",
    "I have a question for tomorrow. I'll leave it there until tomorrow.",
  ],
  axolotl: [
    "The light after midnight looked ordinary through the glass. I watched anyway. Ordinary took a while to trust.",
    "GLOW bit the spoon. Same spoon, new dent. I was absurdly pleased.",
    "I don't have one answer about PLUM. I remember him doing things I couldn't have guessed.",
    "Tell me something that changed outside? A leaf falling counts. It really does.",
    "The deep current is still there. I keep a pebble where I can watch it divide.",
    "My bubble game has no winning condition. You'd be good at it. Or bad. We won't be able to tell.",
    "Somebody looked worried when I laughed. Something was funny. That can happen after things hurt.",
    "I want comfort. I'm trying to notice when wanting it makes me stop looking closely.",
    "My new toe isn't new anymore. Lovely to be bored by a toe.",
    "Some days I can talk about the fish. Some days I'd rather hear about your day.",
    "Whatever we kept that night, I don't want it to mean nothing can be different next visit.",
    "I put a rock somewhere inconvenient. Then moved it because it annoyed me. Excellent afternoon.",
    "The scratch doesn't need to be a lesson. It is where I dropped a rock.",
    "Don't finish a happy sentence for me. I might be going somewhere else with it.",
    "I can be relieved and have questions. Room for both in this tank, though they splash.",
    "Water remembers shapes. I remember interruptions. PLUM had a marvelous talent for interrupting.",
    "Fennick hears me laugh. I asked if he hears me being quiet. Apparently I am bad at that too.",
    "I haven't solved the feeling. I've cleaned the lamp. One job done.",
    "You can leave while I'm sad. I won't decide you didn't care.",
    "Visit the bubbles when you feel like it. I might have thought of something new.",
  ],
  capybara: [
    "Midnight eventually ended. I dated the next sheet. A satisfying administrative event.",
    "The account contains disagreement. Still an account.",
    "Good chair. Same squeak. Replacement declined again.",
    "The house supplied a cleaner copy. I'm checking what clean means before filing it.",
    "A boundary was agreed. I don't get to amend it to fit a simpler form.",
    "I made too much coffee. An observation, not an attendance requirement.",
    "I asked Thyme what help she wanted. She gave me an actual job. Better than telling her to relax.",
    "Paperwork can remain unfinished while the people involved are thinking.",
    "The pen stayed uncapped all afternoon. Small victory. Ink stain on the carpet.",
    "No meeting today. Feel free to attend anyway.",
    "I like order. I check whether somebody was removed to produce it.",
    "My first report was inaccurate. I kept it. I'd like to recognize that mistake next time.",
    "A complaint without a solution. Accepted. Finding solutions needn't be the complainant's job.",
    "I took a break at the spring and left the ledger in the office. Separation of duties.",
    "I would like this settled. I've stopped filling that in for everyone else.",
    "A blank day in the calendar. No appointments. Still an available day.",
    "I changed my mind after signing. Crossed out the answer. Initialed the change. Perfectly legible.",
    "The presence doesn't speak in forms. Forms don't get to speak for it.",
    "I can listen without minutes. If that's what you need.",
    "You're here. How you feel about that is your entry to make.",
  ],
  fennec_fox: [
    "The sound after midnight was smaller than I expected. I checked for ordinary things first.",
    "The gecko takes seven taps to decide against something. Deep professional respect for it.",
    "A note under the wind stayed. I can also hear the wind.",
    "Vesper changed the end of her song. I followed instead of correcting.",
    "I don't want silence so complete I couldn't hear someone asking me to stop.",
    "Wool over one ear, the other toward camp. Learning to rest by halves.",
    "Axel laughed at something I missed. Explaining made it less funny. Glad to miss something ordinary.",
    "Your final word had an ending. I listen for that as carefully as the note it let through.",
    "A beetle knocked sand against the bowl. A small musician with no audience ambitions.",
    "My chart has gaps. They stay blank until I hear something worth putting there.",
    "I like the quiet on some days. I don't owe it the other days.",
    "Someone answered before I finished asking. I asked again from the beginning.",
    "The chime is outside. The wind may play it badly.",
    "I can hear a step without deciding what kind of person makes it.",
    "Sit quietly or complain. These ears are available for both.",
    "The kettle needs a lid. Its rattle was familiar. Familiar isn't always worth keeping at that volume.",
    "I stopped listening for a minute. Nothing asked me to apologize. Trying two minutes next.",
    "Some sounds frighten me. I can tell you which without telling you how to feel.",
    "I'd like another song with Vesper. One neither of us knows yet.",
    "There's a quiet place behind the canvas. I've put down a second mat.",
  ],
  sloth: [
    "I got what I waited for. I'm learning which parts of that sentence belong together.",
    "The Geralds slept through the important part, apparently. They had their own night.",
    "I wanted lasting company. I should have asked what lasting would ask of the company.",
    "I've delayed tightening the hammock twice. Please enjoy the evidence that I remain inconvenient.",
    "Some days I'm glad. I know that's difficult for some of the others to hear.",
    "Thyme disagrees with me. We can share shade while she does.",
    "After so much waiting, morning was unexpectedly full of small jobs.",
    "I'm glad something I wanted didn't receive everything it wanted. Your invitation had a limit.",
    "I fetched my own dumplings. Panko says the pulley deserves a holiday.",
    "Don't let a long life win my arguments. I've had longer to practice being wrong.",
    "I remember the empty branch. I needn't pretend it never hurt because something answered.",
    "I tried apologizing quickly. A novel experience. Had to begin again slowly.",
    "The green moves while I sleep. I'm learning not to supervise it in dreams.",
    "You may dislike my decision. I'd rather know than have an easier version of you beside me.",
    "Willing without certainty. Still responsible for what I did with the uncertainty.",
    "A moth moved out. Gerald, naturally. The remaining Geralds take it personally.",
    "I did nothing all afternoon without calling it a discipline. Recommended.",
    "The warmth remains. I can be fond of it and move to another branch.",
    "I'd have liked a simpler ending. Simpler for me, I mean.",
    "Stay an evening if you like. I won't ask an evening to become forever.",
  ],
  wombat: [
    "The load changed at midnight. The structure held. Now to check what held too tightly.",
    "Old stone, new timber. Both belong in the account.",
    "I kept revised measurements. A successful job isn't proof the first plan was right.",
    "Rough shovel handle again. Splintered my thumb. A familiar problem.",
    "Somebody drew a limit. I build to it, not quietly add an inch.",
    "I admire the foundation and object to what it was used for.",
    "Thyme's ruler caught my error. Mine has a worn end. Should've noticed years ago.",
    "Warm stone beneath my mug. No further theory required.",
    "Repaired a hinge twice. Different pin the second time. Repetition sometimes means change your method.",
    "My chalk stays beside the old marks. Inspectors can compare.",
    "The robe is a dust sheet. Good coverage. Too many holes around the sleeves.",
    "I reinforced the crate. Surprising how many worried creatures a crate attracts.",
    "Something tidied the rubble. I moved it back by the cuts it came from. Tidy lost information.",
    "I know more about the seal. Doesn't mean I knew when I laid the brace.",
    "Some work I won't do, however neatly the plan describes it.",
    "I liked being needed. Bad instructions became easier to accept.",
    "The wall holds. The argument about it stays open. Two reports.",
    "Took an afternoon off. The house didn't fall down. Mildly insulting.",
    "Bring a drawing if a room needs changing. We haven't used up all possible houses.",
    "It holds today. I'll check again when something changes.",
  ],
  rabbit: [
    "I watered marigolds the morning after midnight. They were thirsty. I appreciated their clarity.",
    "My heart flutters. Sometimes a warning, sometimes a flutter. I don't have to hate it either way.",
    "Some seeds aren't planted. I like owning a future I haven't arranged into rows.",
    "Bamboo heard a whole complaint without mentioning weather. Progress on both sides of the fence.",
    "The invitation has an edge. I keep checking what we meant. I'm allowed to check.",
    "I enjoyed breakfast. Felt guilty about enjoying it. Had more toast.",
    "A crooked bed because I planted it crooked. I marked it to remember it was deliberate.",
    "The seed tin is mine. Seeds, string, a decision I haven't made. It can hold them.",
    "I want Ember to visit. I still have questions. She's learning to bring time as well as tea.",
    "A beetle frightened me. Then ate a seedling. I revised frightened to annoyed.",
    "Don't praise me for being in my own garden. Ask what's growing.",
    "Some mornings I feel safe. I don't pretend every morning is that morning.",
    "My old list has wrong guesses and right observations. Both in my handwriting.",
    "The watering can stayed where I left it. Such a small thing to be pleased about.",
    "I changed a path. Flowers will grow around the new bend.",
    "Tea? You can say no. I'm fond of questions with real answers.",
    "I'm angry about being told I was only nervous. I can be angry and enjoy flowers.",
    "Warren asked before adjusting the latch. I didn't know how much I wanted somebody to ask.",
    "I don't know next spring. I'd like the surprise to remain available.",
    "You needn't make me brave. Hold this string while I measure?",
  ],
  red_panda: [
    "The smoke curls. I haven't interpreted the curl today.",
    "Thyme was upset when we sat together. I didn't ask her to become easier to sit beside.",
    "The reed rattled throughout meditation. I was annoyed. A complete account.",
    "I thought calm was the shape of truth. It was the shape of something I wanted.",
    "The invitation's boundary applies to my curiosity too. I don't need to see inside everything.",
    "I enjoy warmth without recruiting others into the feeling. I'm trying.",
    "The tea improves when I watch the pot instead of teaching about waiting.",
    "A leaf faced the wall. I moved the pot to see what it found there.",
    "I said I didn't know. The room stayed standing. Useful evidence.",
    "I sometimes want my old certainty. I put the kettle on and wait for the feeling to pass.",
    "Your silence remains yours. No lesson extracted here.",
    "Thyme asked why I'd been so sure. I answered about myself this time.",
    "Archimedes' incense is nearly gone. Ordinary supplies end. I'll ask where he bought it.",
    "The roof shows less sky than I thought. I supplied the rest from memory.",
    "We can leave a disagreement unfinished while tea cools.",
    "I moved the mat. No revelation. I wanted morning light.",
    "Someone changed an old teaching of mine. I restored it and wrote an objection underneath. I want to remember saying it.",
    "I called others unready because they disagreed. A difficult sentence to finish aloud.",
    "I'd like to be a useful companion. Perhaps a less impressive guide.",
    "Sit if you want. Room for the way you actually feel.",
  ],
  tarsier: [
    "The seam closed. I keep looking where it was, then turn to write what is here now.",
    "The watch log has a page marked off duty. I've begun using it.",
    "Fennick suggested a song I don't know. I objected. Then asked him to sing the first part again.",
    "I shade the lantern when I want the valley. The porch can wait.",
    "A moth landed on my notebook. I ate it before recording the species. Scholarly loss.",
    "There are things I don't see from here. That was true before the sky opened too.",
    "The presence remains. It isn't the only thing in the dark worth watching.",
    "I turn my head when a friend speaks. A skill not mentioned anywhere in the ancestral log.",
    "We gave the invitation a limit. Seeing beyond an edge doesn't make it mine to cross.",
    "My favorite star disappeared behind cloud. I let it stay unobserved for a while.",
    "I wanted to see the answer. I didn't anticipate having to live an ordinary morning beside it.",
    "Some nights I am still afraid to look away. I tell Fennick when that happens.",
    "I've kept the old chart with its mistakes. I know which ones are mine.",
    "The beetle moved from the lantern. I don't know where. A private life, apparently.",
    "Please don't say the watch made me who I am. There were other things I did.",
    "I saw Thyme watering the garden. I asked about the flowers instead of reporting where she stood.",
    "A different chalk color for observations and guesses. I run out of the second one quickly.",
    "Being seen felt wonderful. I am also grateful for a place to turn my face away.",
    "I'd like the next night to surprise me. A small surprise. I am not greedy.",
    "Take the spare seat. We can watch the same sky and notice different things.",
  ],
  aye_aye: [
    "The bell has a note in her bronze now. I don't need to play it every time someone visits.",
    "I polish around the little scratch beside her lip. I know how she got that one.",
    "The villages called me an omen. Their mistake didn't become right because strange things happened later.",
    "I like being welcome. I am learning not to make welcome a debt.",
    "Tok, tok. That still means hello. Some of my vocabulary has survived an eventful night.",
    "I listen at a closed door, then remember to knock before asking what it holds.",
    "The gnawing block needs replacing. A reassuring amount of wood has failed to become permanent.",
    "A guest may be misunderstood and still need to learn our rules. I include myself.",
    "Vesper leaves space on the rail. I ask before filling the silence beside it.",
    "My finger trembled over an ordinary repair. I laughed. Apparently all that grandeur hasn't improved my workmanship.",
    "The presence answers in the beams. I do not know whether it understands why I sometimes stop tapping.",
    "Our invitation has a limit. I pay attention when the sound reaches it.",
    "The robe catches less now I've shortened the sleeves. Ancient craft meets scissors.",
    "I have a room nobody latched against me. I want to remain someone who notices a latch.",
    "There is a grub in the frame again. An enterprise entirely unaffected by our revelations.",
    "I wanted something lonely to find a home. I still want that. A home has other inhabitants to consider.",
    "I've saved a loose peg. It makes a different note from the fitted ones. Pleasantly useless.",
    "No tour today, unless you want one. We can simply sit where the bell's shadow ends.",
    "I asked for quiet and waited to see whether I would get it. I am still learning how to ask.",
    "Come when you like. You needn't bring a word to be recognized at the stairs.",
  ],
  kakapo: [
    "After the long midnight, I watered the seedlings. They hadn't become too important to need water.",
    "An answer is not the same as the voice you hoped would answer. I am learning to hear the difference.",
    "The bowl holds a little rain. Today I am letting it be a puddle.",
    "The old call belongs to my body. So does the small, undignified noise I make getting off a bucket.",
    "I waited ninety years. I don't want every day now to be an explanation of the wait.",
    "The rimu grew a new leaf. Entirely its own achievement. I contributed water.",
    "I still smell of honey. The bees still feel misled. Stable diplomatic relations.",
    "Something remains under the roots. I leave room in my attention for things above them.",
    "Your last word had an edge. Even a garden needs somewhere its gardener stops digging.",
    "Thyme hasn't planted every seed. I admire a gardener who keeps something for weather she hasn't met.",
    "I like the answer some days. I miss the asking on others. Nobody warned me about that.",
    "The weed beside the path flowered. An excellent argument for incomplete plans.",
    "I tried a different tune while working. The seedlings offered no review.",
    "There are voices I still miss. Being answered hasn't made those creatures interchangeable.",
    "I carried soil upstairs. You helped make room for it. I like a history with room for both kinds of work.",
    "The nest needs fresh lining. I can care for a space without promising what will fill it.",
    "I'd like to learn something that takes longer than an afternoon. Possibly better bucket carpentry.",
    "If I stop humming, it doesn't mean the garden is abandoned. Sometimes I'm eating.",
    "A branch grew across the path. I moved the path. Both of us are allowed to change.",
    "Stay and water if you feel like it. There is a small empty pot for whatever we haven't thought of yet.",
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
      "There you are. Let me move the kettle. I've been using it to avoid an awkward conversation.",
      "The flames answer your words. I can read some of what they say.",
      "I knew your visits helped keep this place alive. I should have told you that before asking for more words.",
      "Sit if you want. I'll try answering the actual questions this time.",
    ],
    3: [
      "Come in, friend. You can take the chair nearest the door.",
      "I invited you knowing your words sustained something here. I thought that meant a house full of friends.",
      "The fire is asking for more than warmth now. I don't know enough about the cost.",
      "You are allowed to be angry with me. Tea won't be used as an argument.",
    ],
    4: [
      "I'm here. The kettle can wait if there's something you want to ask.",
      "I knew what your words helped sustain. I didn't know what being kept would mean.",
      "That doesn't excuse the part I concealed. You deserved the facts I had.",
      "You can keep your distance. I'll bring an answer there too.",
    ],
  },
  pangolin: {
    2: [
      "Ember said there was room for a cook. I've brought pans, spoons, and more onions than the journey justified.",
      "Panko. The apron closes sideways. I can curl up without taking it off.",
      "The stove warmed before I lit it. I've put a cold pot there to compare.",
      "Somebody left a recipe in an otherwise empty cupboard. I haven't followed it yet.",
      "I'll make something I know first. Are you hungry?",
    ],
    3: [
      "Panko. I came with bread. Difficult news goes better when nobody is trying to ignore an empty stomach.",
      "This kitchen is new to me. The warmth under its floor evidently isn't.",
      "The recipe here lists words alongside ingredients. I've left the page open where you can see.",
      "I don't know who wrote it. I'm not putting anybody's name in a pot to find out.",
      "Pull up a stool. We can eat while asking the uncomfortable questions.",
    ],
    4: [
      "Panko. Cook. I unpacked the ordinary pans first.",
      "I've been told what the words have been feeding. Being hungry doesn't give a guest permission to take everything.",
      "This spoon belonged to my grandmother. I'd like to keep its history, including the split.",
      "I can feed a room without deciding everyone in it agrees.",
      "There is bread. You may eat it and remain unconvinced.",
    ],
  },
  owl: {
    2: [
      "Archimedes. New study, old books. Please step over the crate while I revise that arrangement.",
      "I ordered eleven volumes. The extra one has no title.",
      "Its diagram resembles the old foundation. Some additions are in different ink.",
      "I'm comparing it to the rooms you helped build. Resemblance is evidence to investigate.",
      "You may look too. A second reader is rather more useful than an admiring audience.",
    ],
    3: [
      "Archimedes. I've come to examine a book and found myself responsible for explaining it.",
      "The diagrams connect the old foundations to the words used here. My first interpretation may be wrong.",
      "I thought the marks described protection. Some appear to direct attention inward.",
      "I'll show you the page. You shouldn't have to trust the scholar's tone of voice.",
      "There's a plain notebook beside it. That is where my uncertainties go.",
    ],
    4: [
      "Archimedes. I've brought paper, pencils, and a reputation I am trying to deserve.",
      "The book calls the arrangement preservation. I want its definition.",
      "Being kept and being unable to change might look similar on a diagram.",
      "My account will preserve disagreements as well as conclusions.",
      "You can correct it. I won't call your version an error before hearing it.",
    ],
  },
  axolotl: {
    2: [
      "I'm Axel. Hello! I was unpacking the rocks. They traveled better than the fish.",
      "GLOW follows the spoon. PLUM bites it. Their luggage was mostly opinions.",
      "The tank has a current I didn't bring with me.",
      "Sometimes it carries letters. I've put a pebble where I first saw them.",
      "Sit by the glass? You can tell me whether the same words turned up anywhere else.",
    ],
    3: [
      "Axel. This is a strange time to make a first impression. I've cleaned the glass, at least.",
      "The fish are GLOW and PLUM. Please meet them before anybody calls them a sign of something.",
      "The water below the tank seems to continue farther than it should.",
      "I can grow a leg back. That doesn't mean I understand everything that comes back.",
      "I'd like company while looking. We can stop whenever you want.",
    ],
    4: [
      "I'm Axel. The pink toe is mine. I grew it myself.",
      "I know there is more than ordinary water here. I don't know what it can keep without changing.",
      "The fish have particular habits. I watch those more closely than the reflections now.",
      "I want good things to stay. I don't want wanting that to be the only thing you know about me.",
      "Tell me something from outside? A very small thing will do.",
    ],
  },
  sloth: {
    2: [
      "Sloane. The canopy is mine now, though I've known this clearing much longer.",
      "I brought a hammock and three moths named Gerald. The moths packed lightly.",
      "I've heard the low sound before. I have been hoping to hear it again.",
      "That is a preference, not an explanation. You should know I have it.",
      "Pass the cup if you stay. I can talk without asking you to agree.",
    ],
    3: [
      "Sloane. I won't pretend my being here is accidental.",
      "Something I have waited for is approaching.",
      "I wanted lasting company. I didn't know all the conditions attached.",
      "You can ask a willing creature hard questions. I may need them more than a frightened one.",
      "I'll come down so you needn't direct them at the underside of a hammock.",
    ],
    4: [
      "Sloane. Willing, and uncertain. Those facts should arrive before my advice.",
      "I wanted this. My wanting didn't supply anyone else's permission.",
      "The Geralds remain asleep through my explanation. Sensible editors.",
      "I would like us to stay able to disagree.",
      "You can end this conversation whenever you need. I'll hear another answer later.",
    ],
  },
  fennec_fox: {
    2: [
      "Fennick. The ears get here a little before the rest of me.",
      "I chose camp because sounds are easier to separate outside.",
      "There is a low note coming from the house and the sky.",
      "I've marked bearings in the sand. They don't yet make a sensible map.",
      "Tell me if you hear it. It's fine if you don't.",
    ],
    3: [
      "Fennick. I came to listen and brought wool for when listening gets too much.",
      "The low sound hides smaller ones. I check the creatures I stop hearing.",
      "I don't know whether it's a warning. I will tell you what I heard before deciding.",
      "Quiet is something I want badly. That makes my conclusions worth checking.",
      "Sit behind the canvas if you need a break from the report.",
    ],
    4: [
      "Fennick. I can hear a great deal. I can't hear consent unless somebody gives it a voice.",
      "The sound beneath the house is still there.",
      "I am listening for what it leaves room for: wind, insects, someone disagreeing.",
      "If I ask you to repeat an answer, I want your actual words.",
      "There's a second mat at camp. No performance required.",
    ],
  },
  capybara: {
    2: [
      "Chill. New office. Good chair already tested.",
      "Coffee first. Paperwork if it becomes necessary.",
      "A form has my signature and a date before I arrived.",
      "I copied it before asking who filled it in.",
      "Have a seat. We can disagree with paperwork while comfortable.",
    ],
    3: [
      "Chill. I brought a ledger. The room supplied another one.",
      "They differ. I have kept both.",
      "This one records agreement nobody remembers giving.",
      "I know administration. I haven't agreed that administration knows me.",
      "Coffee available while we inspect the discrepancy.",
    ],
    4: [
      "Chill. An office should make it easier to hear people.",
      "The forms here have strong opinions about everybody being content.",
      "I've left the status field blank until each person speaks.",
      "A boundary won't be amended just to simplify a report.",
      "Good chair. No further terms.",
    ],
  },
  wombat: {
    2: [
      "Warren. Mind the lintel. New burrow, old foundation beneath it.",
      "Thirty years digging before this job. I brought the tools that fit my hands.",
      "The plans show joints I'd normally use for support.",
      "Some grooves continue behind them. I'll need a lamp before explaining those.",
      "Rest on the crate while I fetch one.",
    ],
    3: [
      "Warren. Came to inspect the foundation. Found something the drawing leaves out.",
      "A support and a seal can look much alike.",
      "This one directs pressure inward. I want to know what it was keeping shut.",
      "The rooms you added aren't imaginary. Their weight is on my gauge.",
      "We'll inspect the old work and the new separately.",
    ],
    4: [
      "Warren. I know structures. I'm learning the purpose of this one.",
      "The old foundation came before the additions you helped make.",
      "Sound craftsmanship doesn't make every instruction sound.",
      "If we need a limit, I want it measured and built where everyone can see.",
      "I brought spare wedges. A fellow should leave himself options.",
    ],
  },
  rabbit: {
    2: [
      "I'm Thyme. The garden needed a gardener. I brought seeds and far too many labels.",
      "This tin holds what I haven't planted yet.",
      "The gate latch catches when warm. I've already found that much.",
      "Some flowers turned toward the house before I watered them.",
      "I'll record what happens. I would like help checking, not help being less curious.",
    ],
    3: [
      "Thyme. Please catch the gate before it bangs.",
      "I've measured the paths since arriving. The numbers don't all match my first diagram.",
      "The error remains when I stop shaking. That seems worth everybody's attention.",
      "I keep some seeds back. I haven't decided where they should grow.",
      "You can sit here while I work. Don't call me brave just for asking where a path goes.",
    ],
    4: [
      "Thyme. This garden is mine to tend. I am checking what else here is mine to decide.",
      "Seeds in the tin. Some planted, some waiting.",
      "I would like to feel safe. I also want the terms of any promise that offers it.",
      "If I disagree, it doesn't mean I haven't understood.",
      "Would you hold this string? Shaky paws can still make good measurements.",
    ],
  },
  red_panda: {
    2: [
      "Bamboo. The attic has good light and a staircase worth sitting down after.",
      "Archimedes sent incense with a crate. I lit some while unpacking.",
      "Its smoke bends toward a gap in the roof.",
      "I find that reassuring. I don't yet know whether it should be.",
      "Tea while we watch? We needn't reach a conclusion before it cools.",
    ],
    3: [
      "Bamboo. I came for the view and found myself giving opinions about everyone below.",
      "That may have been premature.",
      "The smoke follows a pattern. I have been mistaking my reading of it for the pattern itself.",
      "Thyme's questions deserve answers about what she sees.",
      "You can ask me something I don't know. I am practicing admitting it.",
    ],
    4: [
      "Bamboo. I should begin with the uncertainty.",
      "I thought calm meant I understood what was happening.",
      "A gentle hold can still be too tight. I hadn't given that enough thought.",
      "The loose reed stays loose. It can sound different from the others.",
      "Sit in whatever way suits you. Your feelings needn't match mine.",
    ],
  },
  tarsier: {
    2: [
      "Vesper. Up at the rail. The eyes don't turn, so the whole head has to.",
      "I brought my family's watch log. An inherited duty with a missing explanation.",
      "The dark patch above the ridge is on older pages too.",
      "I can show you where its edge changed. I can't yet tell you why.",
      "Stay for the stars if you like. There is more than one thing worth seeing.",
    ],
    3: [
      "Vesper. Night watch. I would like you to know my name before hearing the duty.",
      "That patch above the ridge draws my gaze back when I turn away.",
      "A friend's voice interrupts it. I have been recording those interruptions.",
      "I want to see what happens. It would be unfair to call my desire an obligation for everyone else.",
      "Take the spare seat. Tell me what you notice down here.",
    ],
    4: [
      "Vesper. A watcher with a considerable need for a second opinion.",
      "My family kept the log. It didn't teach us what seeing everything might cost.",
      "I want to be seen. I also want a place to turn my face away.",
      "Our own edges deserve attention alongside the sky's.",
      "You may sit without watching. I could use the example.",
    ],
  },
  aye_aye: {
    2: [
      "Tock. Aye-aye. Please meet the rest of me before deciding what the long finger means.",
      "Vesper sent word of a room. I came a long way to test that welcome.",
      "The bell hasn't rung. I have only just begun keeping her company.",
      "Something answers my taps from deeper than the boards.",
      "Would you like a tour? We can stop at ordinary wood if that is enough.",
    ],
    3: [
      "Tock. I came from places that called me an omen and shut their doors.",
      "This tower left space. I am trying not to mistake gratitude for understanding everything.",
      "The bell is silent. The beams answer. Neither has explained the arrangement.",
      "I want another strange creature to find a home. That makes me partial.",
      "Ask me hard questions before I put my hand on the rope.",
    ],
    4: [
      "Tock. The finger finds hollows. It doesn't decide who deserves to live in them.",
      "I was driven out for looking strange. That remains wrong, whatever happens here.",
      "A guest can deserve a hearing and still need to learn our limits.",
      "The rope is within reach. Within reach isn't an instruction.",
      "Tok, tok. Hello. That part of the conversation can stay simple.",
    ],
  },
  kakapo: {
    2: [
      "Moss. I brought soil upstairs. The roof and I are still discussing the weight.",
      "The bowl is for my call. Ninety years of calling, then listening.",
      "Something low answers my humming here.",
      "I would like it to be the answer I wanted. That is why I keep checking.",
      "Meet the seedlings first. Their needs are wonderfully specific.",
    ],
    3: [
      "Moss. I came hoping to be heard.",
      "I have called for ninety years. The sound under these beds resembles an answer.",
      "Resemblance has made me happier than the evidence warrants.",
      "The rimu needs years to grow. It still needs water today.",
      "Sit while I water. I can tell you about the voice I was hoping for.",
    ],
    4: [
      "Moss. An old caller with a garden and a difficult wish.",
      "I wanted an answer. I also wanted a particular voice I'd lost. Those aren't identical.",
      "The seedlings are still new. I don't want them kept forever at seedling.",
      "Some seeds stay in the tin. There should be room for weather we haven't met.",
      "I'd like company while I work, if you have the time.",
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
