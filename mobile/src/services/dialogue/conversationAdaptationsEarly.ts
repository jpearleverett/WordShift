/**
 * Chronology variants for Ember, Panko and Archimedes' personal conversations.
 * Each key retains one manuscript utterance and its position in the conversation.
 * A later world can change how a discovery is told without losing the discovery.
 * Select the latest available threshold: shadows >= 3, revealed >= 4, arrived >= 5.
 */
export const EARLY_CONVERSATION_ADAPTATIONS: Record<
  string,
  { shadows?: string; revealed?: string; arrived?: string }
> = {
  // Ember: the den, her evasions, and the invitation she has to account for.
  'fox:intro:4': {
    shadows: "My plan was rooms, one at a time. A kitchen first, in case somebody sensible wanted to cook in it. Then more friends. Look how much of that you've helped make real.",
  },
  fx_0_10: {
    revealed: "I talk to the fire. I used to praise it for being a good listener and leave out how much I could hear back. Some evenings I still want to talk about the weather.",
  },
  fx_1_1: {
    shadows: "You're here! I wanted to tell you how the fire took up drawing. Actual pictures. I needed a witness, because a fox can only say she's not exaggerating so many times before nobody believes her.",
  },
  fx_1_5: {
    shadows: "The shape it practiced was a circle with a little notch at the top, like a door left open at the top of the sky. I copied them down in soot. There, on the paper by your cup.",
  },
  fx_1_6: {
    shadows: "Those first eleven sketches, laid side by side, are all the same circle getting bigger, like something coming closer to the paper very slowly. I wanted someone to tell me I was imagining the closer part. Convincingly, please. The paper was no help at all.",
  },
  fx_1_9: {
    revealed: "Down first, then up. I noticed it three times and decided not to finish the thought. That's backwards for heat, but I had a new honey and a very convenient subject to change to. You deserved the whole thought as well as the tea.",
  },
  fx_1_12: {
    shadows: "So the oven hummed and the hearth drew pictures. I said that if the house was putting on a concert, nobody here would need to arrange it. It was arranging itself. I made that sound much jollier than it was.",
  },
  fx_1_13: {
    arrived: "Before that long midnight, I kept planning to show a visitor the fire's trick. They ought to see it fresh, I thought. I wouldn't spoil it. I can hear how pleased I was with myself, saving up a surprise I didn't understand.",
  },
  fx_1_14: {
    arrived: "The great hint I planned about the midnight trick was that all the flames pointed the same way for a moment, and the way wasn't up. The rest could wait for an audience, I thought. Waiting was easier for me than explaining.",
  },
  fx_1_15: {
    arrived: "The flames followed whoever was watching. Left, right, even up when I stood on the table. There went the surprise I was saving. I had to call for help getting down, which took some of the grandeur out of the occasion.",
  },
  fx_1_19: {
    shadows: "The first time I closed my eyes and saw that shape, I couldn't place it anywhere I'd been. Tall and soft and dark, very polite, standing just behind the light. I could tell you every part of it except what it wanted.",
  },
  fx_1_20: {
    shadows: "I said it didn't frighten me. It felt like the moment before someone knocks, when you already know they're out there. A friendly knock, probably. I made rather a lot of tea around that probably.",
  },
  fx_1_21: {
    shadows: "I told the fire about the tall dark shape, and it drew that circle again, bigger, notch and all. My two mysteries knew each other. I called that practically tidy. Finding a connection isn't quite the same as understanding one.",
  },
  fx_1_24: {
    revealed: "I once promised to teach you that note. It is easy, I said. It is already in your chest, you only have to agree to it. Agree to what? I never finished that sentence, and still I asked you to trust it.",
  },
  fx_1_25: {
    arrived: "I'd planned a long evening of midnight, blankets, the fire's trick, all of it. Chocolate so thick it was really a dessert. We can still have the blankets and chocolate. I won't put another invitation underneath them.",
  },
  fx_1_27: {
    shadows: "I checked the center of the house after that. Nothing but floor. Beautiful, ordinary floor, slightly warm and slightly humming. I announced that everything was settled and completely fine. Even I could hear how much work the cheerful voice was doing.",
  },
  fx_2_1: {
    revealed: "Come in, sit down. I want to tell you about the week I sorted those sketches. I'd decided to find it funny, and wanted help. You're better at funny than the fire is. The fire was giving me very poor material.",
  },
  fx_2_5: {
    revealed: "I kept asking people to look at me instead of the high shelf. Next visit I'd take the basket down, I promised. That basket listened better than a basket should, and I kept putting the kettle on instead of admitting why I'd moved it.",
  },
  fx_2_6: {
    shadows: "I can read flames, friend. I inherited the knack. For a long time I told myself I only had to pass on the useful parts. Very convenient, letting myself decide which parts those were.",
  },
  fx_2_9: {
    revealed: "I meant to tell the others about the name. I kept setting a day for it, then putting the kettle on instead. Saying it to one friend did not finish the job. I was very good at finding smaller jobs to do first.",
  },
  fx_2_13: {
    revealed: "The smoke drifted toward the center of the house, and so did my feet whenever I stopped paying attention. The floor was as warm as the fire. I called that wonderful manners and endless patience. I hadn't asked why it wanted me in the middle.",
  },
  fx_2_14: {
    revealed: "Say a word and watch the fire. There, it still stands up. I kept inviting friends to see that, and kept putting off finding out what else I was inviting them to. The little performance made a very comfortable excuse.",
  },
  fx_2_15: {
    revealed: "The flames stand up like a crowd at a parade. I used to joke that your words kept both the fire and me sweet. Mostly a joke, I'd add, as though that settled anything. You don't have to bring words to be welcome beside me.",
  },
  fx_2_19: {
    arrived: "Before the arrival, the dark shape behind my eyes began to wave. One polite limb, like Duchess waving from the mantel. Then Duchess moved her web to the middle of the ceiling. Everybody seemed to be moving toward the same spot, even the spider.",
  },
  fx_2_w1: {
    revealed: "Would you go and see Warren about his digging below the house? The first time he told me, he stopped halfway through, and I made tea instead of pressing him. His work deserves a better hearing than I gave it.",
  },
  fx_3_1: {
    arrived: "There was a week before the arrival when I kept telling visitors to leave their coats on. I fed the fire good dry oak, it took every piece politely, and gave almost no heat back. Calling it shy was easier than calling it wrong.",
  },
  fx_3_2: {
    arrived: "I insisted I wasn't worried. The opposite of worried! My paws wouldn't sit still, so I asked somebody to sit with me. Two of us were warmer than one of me. Arithmetic was a great comfort that week.",
  },
  fx_3_3: {
    arrived: "The grate was cold and the floor was warm, so I put the kettle on the floor. Then I made a joke about it. The joke went well. I was running short of jokes, and a fox notices that sort of shortage.",
  },
  fx_3_4: {
    arrived: "While the fire grew cold, something else was beginning to burn underneath us. Slow and patient, like bread rising. I checked it every night. It is here now. At least nobody has to pretend we do not know what it is.",
  },
  fx_3_6: {
    revealed: "I really can read flames. I let it pass for a party trick because that made pleasant company easier. It was never a trick. Telling you now doesn't put that explanation back where it belonged, before anybody started bringing words.",
  },
  fx_3_8: {
    arrived: "The last chapter said something old would come down to this house. The house had been getting ready longer than any of us had been alive. Now it's here, and this is your house too. I'm sorry I kept part of it from you. I'm still glad I met you.",
  },
  fx_3_9: {
    arrived: "Before the arrival I asked, right over the soup, what we were all waiting for. The table went quiet, then somebody passed the bread as if that settled it. It didn't. Bread wasn't an answer then, and it wouldn't be one now. You deserve a plain one.",
  },
  fx_3_14: {
    revealed: "I wanted your words to keep coming, and their bringer in the warm part of the story, here with me at the center of everything. I hadn't asked whether you wanted the center. Wanting a friend made me very persuasive with myself.",
  },
  fx_3_16: {
    arrived: "The small scary thing, before the arrival, was how that shape moved. First behind my closed eyes, then closer, then behind the den itself. Very tall, very patient. I could shut my eyes to the room and still feel where it stood.",
  },
  fx_3_17: {
    arrived: "It did nothing then. That was what got me. It waited the way the sky waits for morning, certain morning will come. I lay there feeling like the morning. Now that it's here, I still dislike how certain it seemed about me.",
  },
  fx_3_24: {
    arrived: "I meant whatever was coming to have to go through this fox before it reached the friends I wanted here. It's here now. I can make you that promise out loud, but keeping it means listening when you tell me where to stand.",
  },
  fx_4_6: {
    arrived: "That robe itched. I expected an ancient secret to come with better lining. Taking the lining out has improved my sleeves considerably. The secret is taking longer to put right.",
  },
  fx_4_21: {
    arrived: "I asked whether warmth that made someone stay could also let them go. We've drawn a line since then, and we keep it. I still ask that question when I set out the cups, because wanting company is when I'm most likely to forget the line.",
  },
  fx_4_24: {
    arrived: "I decided whatever came would have to go through this fox before it reached anybody sheltering here. It came, and that job didn't end. I can promise it to you now. Hold me to it while the guest is here.",
  },
  fx_4_27: {
    arrived: "Before that moment came, I wanted to stand close enough to hear what you actually said. I still do. Tell me where you want me, friend. I won't choose the distance for you.",
  },
  fx_4_28: {
    arrived: "I still don't know what something that old calls kindness. We've had to tell it what we mean by the word. I want to keep checking the meaning, even on evenings when the fire makes everything feel easy.",
  },
  fx_4_30: {
    arrived: "Remember the circle I kept drawing in soot, with a notch at the top? That midnight I saw it over the roof, and it opened. It was a door all along. I drew it eleven times and never asked what would come through. I know now.",
  },

  // Panko: keep the recipe's history without preparing a second arrival.
  pg_0_23: {
    shadows: "The pot stayed warm long after I'd put the stove out. I blamed the good thick iron at first. I still like a good pot, but that one was getting rather more credit than it deserved.",
  },
  pg_1_1: {
    shadows: "The first night the spice jars changed places, I told myself I'd moved them in my sleep. I must have, I said. Twice. That was my whole investigation, and it was a poor one.",
  },
  pg_1_3: {
    shadows: "The next morning the jars had moved again, and I looked properly. They weren't scattered. They were arranged. That was when I stopped blaming my sleeping paws and started keeping track of what the pantry did.",
  },
  pg_1_4: {
    shadows: "The first strange recipe appeared at the back of my book, in my handwriting, though I didn't remember writing it. It called for salt gathered before first light. That was the instruction that made me stop with my thumb on the page.",
  },
  pg_1_6: {
    revealed: "So I gathered the salt before first light. I thought of every recipe as a promise, and I had never broken one. The dish came out the best thing I'd ever cooked. I couldn't tell you what it was. That should have mattered more than how well it turned out.",
  },
  pg_1_9: {
    revealed: "For a while I cooked whatever the morning told me, and the kitchen grew calmer. It stopped feeling like obeying and felt like planning a menu with an old friend. That was the part I should have looked at more closely, with the pot off the stove.",
  },
  pg_1_16: {
    shadows: "I used to laugh when Ember said the fire told her things. Then my dough rose into a shape I'd never kneaded into it. That took the laugh out of me very quickly. I stood there with flour up both arms, looking.",
  },
  pg_1_18: {
    revealed: "I baked that ringed loaf anyway. Waste was waste, whatever shape it came in. It came out an ordinary gold and tasted delicious. I didn't tell the people eating it what the dough had done. I should have let them decide with the whole story.",
  },
  pg_1_20: {
    revealed: "The recipes grew bolder. One asked for a word said over the pot, without saying which word. I guessed, and the guessing felt important. I mistook that feeling for a reason to keep following the page.",
  },
  pg_1_22: {
    revealed: "I began setting my grandmother's empty seat every night without ever deciding to. Some mornings the chair was warm before anyone sat in it. I wanted that warmth to mean so much that I hardly looked at the setting of the place.",
  },
  pg_1_26: {
    arrived: "Before the feast, my paws kept measuring out more than I'd planned, portioning for a number nobody had told me. I began to wonder who was doing the telling. I count the portions aloud now, so I can hear whose meal I'm making.",
  },
  pg_1_27: {
    revealed: "One day's words tasted of iron and deep places. I ground them into the flour without thinking. It seemed the right thing to do at the time. My hands had finished before I'd asked myself why words belonged in bread.",
  },
  pg_1_28: {
    arrived: "I didn't feel afraid then, exactly. I felt busy, as though a great meal was coming and I alone had begun preparing. That is a dangerous feeling for a cook. It fills both hands and leaves very little room for a question.",
  },
  pg_2_1: {
    arrived: "Before the arrival, I was cooking for someone who wasn't at the table. I couldn't say when I'd started. Every night I counted one plate too many, and I am never wrong about plates. I wish I'd trusted that sooner.",
  },
  pg_2_3: {
    revealed: "I decided the empty seat wasn't empty and gave it the best spoon. I spoke toward it while I stirred, quietly enough that I could pretend it was only a cook talking to herself. Wanting a guest made the silence very easy to fill in.",
  },
  pg_2_4: {
    revealed: "What did I say to that seat? Kitchen things. The soup needs longer. The bread is proving. Be patient. The small comforts I'd give any hungry guest who'd come a long way. None of them asked what the guest intended to do once fed.",
  },
  pg_2_6: {
    shadows: "The recipe I couldn't finish called for water, but not from the tap or the well. From the deep part, it said, where the light gives up. A very precise instruction about everything except where to put the bucket.",
  },
  pg_2_8: {
    shadows: "I tried rain water, spring water, the sweet barrel under the eaves. The recipe refused them all. The page still looked hungry. I know how that sounds. I could turn it sideways in good daylight and it still looked hungry.",
  },
  pg_2_10: {
    shadows: "I wanted to finish that recipe so badly that I began to worry it was the only reason I still cooked. I have spent years learning which flavors I like. One page should not have been able to make all of them seem beside the point.",
  },
  pg_2_11: {
    revealed: "For a while the meals seemed to feed nobody at my table. There was a hollow in the kitchen about the size of a guest, and everything ran toward it like water downhill. It never filled. I kept trying larger portions before I questioned the hollow.",
  },
  pg_2_12: {
    arrived: "I tasted those meals before they were done and knew they weren't for us. Too rich. A welcome laid out for someone who hadn't arrived. The guest is here now, but I still remember the first mouthful that made me understand whose supper I was preparing.",
  },
  pg_2_15: {
    arrived: "Before that night, the pantry went quiet in a peculiar way. Full jars, yet everything felt held, as if the jars and I were holding our breath for the same thing. Now I open a jar to use it. It helps to hear the lid come off.",
  },
  pg_2_16: {
    shadows: "I began looking up while I worked, past the ceiling toward the sky. I couldn't have told you why I'd decided the guest would come from above. My eyes kept going there before I had a sensible explanation.",
  },
  pg_2_17: {
    revealed: "Ember looked up too, sometimes in the middle of a sentence. We didn't mention it to each other. I thought we were sharing something by leaving it unsaid. We were also leaving a great many questions where neither of us had to answer them.",
  },
  pg_2_20: {
    revealed: "I insisted nobody was making me do it. My hands went ahead of me, but toward things I thought I wanted, so I called that choosing. I still turn it over. Wanting a dish should not feel the same as finding it already half made.",
  },
  pg_2_w1: {
    shadows: "The recipe asked for water from where the light stops. Axel knows that water firsthand; ask him about it if you want to understand the page. His tank belongs to him. No recipe ever gave anybody permission to put a ladle in it.",
  },
  pg_3_1: {
    arrived: "That feast was the largest I'd ever cooked. I finally stopped calling it Tuesday's supper. The stock had been going three weeks, and you could smell it in the curtains. I washed them twice afterward. They are still very convincing curtains.",
  },
  pg_3_2: {
    arrived: "I laid every finished dish facing upward, toward the seam I could feel through the roof. A cook points the food at the guest, I told myself. The seam has closed now. I set the bowls where the people eating can reach them.",
  },
  pg_3_3: {
    arrived: "A feast begins long before the cooking. Start the stock in one season, lay the table in another. Looking at that table, I felt I'd been getting ready since before I had a word for it. Preparation can swallow years if you never ask what it's for.",
  },
  pg_3_5: {
    revealed: "I let the others eat scraps while I attended to that pot. Thyme thanked me twice for a crust, her ears trembling. I nearly explained everything I suspected. Nearly. She deserved more than a crust and half an answer.",
  },
  pg_3_11: {
    revealed: "The pantry doors opened before I reached them, as though the house wanted to help carry the meal. I began seeing every room as a kitchen and everybody as part of the cooking. Other people's rooms shouldn't have become parts of my recipe.",
  },
  pg_3_14: {
    arrived: "Chill wrote a list of what the feast needed in his tidy, patient hand. Each thing I gathered earned a calm little tick. The last unmarked line said only, the hour. I kept that list. A tick beside midnight would hardly describe what happened.",
  },
  pg_3_15: {
    arrived: "Before the arrival, the table was laid, the fire banked, the extra portion covered. Nobody had asked me to do it. I left the last spoon in the drawer until somebody asked. Such a small piece of the service, but I needed to choose it myself.",
  },
  pg_3_19: {
    revealed: "Eventually I stopped grinding the words into flour and dropped them whole into the pot. They sank down and down toward the deep part. It looked less like cooking every time. I watched with my grandmother's spoon in my hand.",
  },
  pg_3_20: {
    revealed: "The dark words sank fastest, like stones, and the pot murmured after them. I wanted more, and thought a cook could ask a friend to help supply them. But company at my table and food for whatever was down there were different requests. Friendship doesn't make the second one yours to fulfill.",
  },
  pg_3_21: {
    arrived: "I set a place for each keeper, then one more for the guest we were being kept for. My grandmother kept an empty chair too. I thought I understood hers at last. Knowing who came to our table doesn't tell me everything about the chair at hers.",
  },
  pg_3_22: {
    revealed: "I dream of my grandmother stirring low, quiet words into soup. I used to think she spoke to it; later I wondered whether she spoke through it to somebody else. I started saying all good cooks did. I don't know that. I cannot ask her now.",
  },
  pg_3_24: {
    revealed: "I put an empty bowl beside the pot to see whether it would fill on its own. I wanted another pair of eyes there. Mine had grown far too accustomed to a kitchen that served itself.",
  },
  pg_3_25: {
    arrived: "Before that supper, I put out bread and made the rest wait until someone explained what I was cooking toward. Bread was a thing I could offer honestly. It still is. Have some while we talk.",
  },
  pg_4_30: {
    arrived: "Our guest has arrived, and this spoon is still my grandmother's spoon. Every time the split catches my thumb, I know exactly which part of its history I'm holding.",
  },

  // Archimedes: preserve each investigation, correction and scholarly joke.
  'owl:intro:2': {
    shadows: "Eleven books in that first crate, according to my list. That is what I meant to catalogue after tea. Keep an eye on the number when I tell you about it. Scholarship has a proper order, and mine began with a counting problem.",
  },
  ow_0_4: {
    shadows: "There were twelve books in that crate. I counted twice and began to suspect the arithmetic. Suspecting the extra book came later. A scholar prefers the difficulty he already knows how to solve.",
  },
  ow_0_6: {
    shadows: "I set the untitled book aside at first. Perfectly titled books were waiting to be read. I felt very sensible about that decision, for as long as the untitled one let me leave it alone.",
  },
  ow_1_1: {
    shadows: "My first professional embarrassment was that the new book wouldn't give me the same reading twice. A familiar sentence changed a little, as though it had overheard my previous reading and thought better of it. I prefer editions to announce themselves.",
  },
  ow_1_8: {
    revealed: "I began a log: date, hour, the book's text beside the previous night's. The changes were corrections, steady ones, working toward a final copy I hadn't seen. I was recording the method before I understood what else it might correct.",
  },
  ow_1_12: {
    revealed: "The book answered a question I'd carried for years about a friend I lost when I was young. The answer was kind. I still find that hard to square with everything else I've learned. A kind answer doesn't tell me how much its author will let us change.",
  },
  ow_1_13: {
    shadows: "When the study first grew warm along the inner wall, I moved my favorite books and blamed the season. A warm room full of paper should have worried me. Blaming the season spared me a question, though it did nothing useful for the books.",
  },
  ow_1_17: {
    shadows: "Three words appeared in the margin. When I first checked, one had turned up among your words and two hadn't. I kept all three in the account, with the date. Otherwise a later match can make an earlier uncertainty disappear.",
  },
  ow_1_18: {
    shadows: "Ember wasn't surprised. Her fire spelled things too; might it and the book share an author? I said that was absurd, then repeated absurd all week like a charm. Repetition was doing the work that evidence should have done.",
  },
  ow_1_19: {
    shadows: "I made a drawer for dull explanations: drafts, damp, tired eyes, the house settling. Each odd thing got one, filed and dated. I planned to choose a convincing explanation afterward. The drawer is useful now as a record of how badly I wanted an ordinary one.",
  },
  ow_1_23: {
    revealed: "I called it unease, in the low voice one uses in a library. A scholar was only short of information, I insisted. Then I began to suspect the thing knew me. Owning a large vocabulary gave me plenty of words to hide behind.",
  },
  ow_1_25: {
    shadows: "The book began falling open to one page regardless of where I left the ribbon. I called it a habit of the spine. Bindings remember how they've been read, certainly. But I had never read that page, so whose reading was the binding remembering?",
  },
  ow_1_26: {
    shadows: "That page held a diagram, almost a spiral of small marks. Tilt the lamp and the marks became letters. At first I said I couldn't make out the word. The more exact account is that I hadn't tilted the lamp very far.",
  },
  ow_1_28: {
    shadows: "I ordered tools to date the paper properly. A scholar should know how old a thing is before deciding how much to fear it, I decided. That rule appeared in no handbook I owned. I was quite ready to write a handbook to justify buying the tools.",
  },
  ow_2_1: {
    shadows: "I spent a week trying to date the book. Every method I trusted, and two I only respected. The conclusion was not one to announce standing up. Sit, pour something warm, and I'll take you through it in the calmest voice I can manage.",
  },
  ow_2_5: {
    shadows: "The last test I chose was the oldest: read the book aloud. Saying a text can show you what looking at it doesn't. I chose a quiet night. I knew that was exactly the wrong time, which was rather why I chose it. Curiosity has poor office hours.",
  },
  ow_2_7: {
    revealed: "The old foundation matched the first diagram exactly. Your added rooms appeared in a different ink. I nearly called it prophecy before comparing those additions. Two inks were right in front of me, and I was admiring the impressive part.",
  },
  ow_2_11: {
    shadows: "My first theory was protection. Then I checked the arrows. Protection should face outward, toward a threat; these pointed inward. An inconvenient direction for my theory, and a much more useful thing to notice than how elegant the diagram looked.",
  },
  ow_2_16: {
    arrived: "When I first found the list near the back of the book, every word on it matched my log of yours, in order. I dated that comparison. A record of what we knew beforehand is quite different from a book taking credit afterward.",
  },
  ow_2_17: {
    arrived: "The list ran past the words you'd brought. I kept the later ones from you, because a prediction can turn into an instruction. Each morning the next word's ink grew darker. I kept checking it, as if watching carefully meant I wasn't helping it along.",
  },
  ow_2_18: {
    arrived: "I once stood by the top shelf for an hour, meaning to hide the book, and couldn't do it. I needed to know how it ended. The book had found an excellent weakness to use. I leave that hour in my account, unflattering as it is.",
  },
  ow_2_20: {
    arrived: "An entry for the record: the book described the arrival before it happened, and I was one of its readers. That goes beside what it got wrong. An honest account doesn't erase the prediction, and it doesn't let the prediction excuse my part.",
  },
  ow_2_21: {
    revealed: "Each word you made turned another page, and I wanted more. The book felt like my only window. Now that you're here, I'd like to read it with you instead of letting it read us on its own. You can take the chair without bringing another word for the book.",
  },
  ow_3_1: {
    arrived: "The last chapter called what would happen to us preservation. It never said what would be preserved. We've seen some of the answer now. I keep my notes on it beside the chapter, so anyone can see what the book left out.",
  },
  ow_3_2: {
    revealed: "At first I couldn't bring myself to repeat the last chapter. Nobody forbade me. But the sentence stayed in my head, and when the lamp burned low it read itself back to me, in the book's words and my own voice. Keeping it quiet didn't make it harmless.",
  },
  ow_3_5: {
    revealed: "I kept the ending from Ember, who might already know, and from Panko, who handles hard news by baking. I told myself bad news was better carried alone than passed around. That's how I made keeping everyone in the dark sound like taking care of them.",
  },
  ow_3_6: {
    arrived: "The book said the arrival would come from above. I'd written pit in the margin. I crossed it out, and you can still read it. The sky settled that particular argument. A reader should be able to see that I didn't have the right answer first.",
  },
  ow_3_10: {
    arrived: "I spent four nights looking for a second edition, an older copy, anything with a different ending. I found none. One book, apparently never copied. I thought a book like that only had to be right once. Now I pay more attention to what happens after its last page.",
  },
  ow_3_11: {
    arrived: "Before the arrival, dread felt like fear that had skipped ahead to the last page. It sat beside me, politely waiting for the other pages to catch up. I mistook that certainty for knowledge. Living past the last page has cured me of that.",
  },
  ow_3_12: {
    arrived: "Ember knew the words kept something alive. I had diagrams that showed how. Neither her fire nor my pages told us what the guest would do. Now it's here, and we can watch what it does. We still have to keep what we see apart from what we guess comes next.",
  },
  ow_3_21: {
    arrived: "Before the arrival, the study was warm like a body, with no fire under it and no fuel I could measure. I called it the temperature of something waiting. The waiting's over. The warmth is still here, so my description has had to change.",
  },
  ow_3_30: {
    arrived: "Before the arrival I kept a lamp by the window for anyone who found the sky beginning to look like a page. Whatever came down would find itself thoroughly footnoted, I decided. The lamp is still there. Come and sit. The account needs company as much as it needs footnotes.",
  },
  ow_4_18: {
    arrived: "Being kept sounded merciful. Now we've seen some of what it stops us doing, and we've set a limit. I want the record to keep both facts. A comforting word is no substitute for checking what we can still change.",
  },
};
