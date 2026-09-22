import { DialoguePhase } from '../../types/homeWorld';
import {
  getAttunementForLevel,
  getRoomDeepening,
  getRoomUpgrade,
  HouseUpgradePurchase,
} from '../roomUpgrades';

type GiftStep = 0 | 1 | 2 | 3 | 4;
type Receipt = { beforeReveal: string; afterReveal: string };

interface ResidentGiftScript {
  roomName: string;
  /** Decoration, deepening, then the three independently delivered attunements. */
  receipts: [Receipt, Receipt, Receipt, Receipt, Receipt];
  /** Global phase at delivery, never the animal's ahead/behind reading cursor. */
  circumstance: [string, string, string, string, string, string];
}

/**
 * Gift conversations have their own manuscript: they must not resize the
 * indexed regular dialogue blocks or spend a visit's dialogue allowance.
 *
 * Every purchase receives a concrete response in its resident's voice, then
 * a response to the current house. The register expands at the revelation;
 * the aftermath permits misgivings and never assumes which boundary was
 * chosen. Attunement receipts do not require the optional deepening.
 */
const RESIDENT_GIFT_SCRIPTS: Record<string, ResidentGiftScript> = {
  cozy_den: {
    roomName: 'Cozy Den',
    receipts: [
      {
        beforeReveal: "A hearthstone for the fire. Thank you. I'll set the carved side toward your chair, where you can see it when the flames settle.",
        afterReveal: 'You carried a hearthstone to my fire. I will set the carved side toward your chair. There is room for your feet beside it, whenever you want that seat.',
      },
      {
        beforeReveal: "This ashen mantel sits well above the hearthstone. The light looks colder against it. Come close enough to feel the heat before you trust the color.",
        afterReveal: 'The ashen mantel gives the hearth a darker edge. Hold a paw near the fire and feel it for yourself. The color of the stone cannot tell you whether a room is warm.',
      },
      {
        beforeReveal: "The hearth is kindled a little further. See how the flame bends toward the stone? I'll sit with it awhile and see whether it does that without company.",
        afterReveal: 'The first attunement draws the flame toward the hearthstone. I will watch it when the room is empty too. I owe you an account of what it does without an audience.',
      },
      {
        beforeReveal: "There's the second note, underneath the crackling. Humming suits this hearth. I'd like to hear what happens when I stop tending it for a moment.",
        afterReveal: 'The second attunement has brought a low note beneath the crackling. I will take my paws away and listen. A fire must leave its keeper time to rest.',
      },
      {
        beforeReveal: "That's the last attunement. The flame holds its shape even when I move the logs. Thank you for bringing it yourself. Stay while I try a different piece of wood.",
        afterReveal: 'The hearth is fully attuned. The flame holds its shape as the logs shift beneath it. I will keep trying different wood. I want this fire to have more than one way to burn.',
      },
    ],
    circumstance: [
      "I've kept this corner for company. A good fire gives us an excuse to put the kettle on.",
      "The room warms a little before I light the fire lately. I've been checking the embers each morning.",
      "Sometimes the heat follows my paw after I've drawn it away. I know something is listening here. I wish I could tell you more clearly what it hears.",
      "The house answers the care we put into it. I've begun to worry about how carefully it keeps things the same. I'll tell you when I see that happen here.",
      'I helped invite what listens through this house. I did not understand how its care could press a changing thing back into place. Your kindness to me does not settle what I owe you.',
      'It is here now. I can tend this fire and still question what its warmth costs. You may sit with me, or leave me to it. I will keep your gift without asking it to mean forgiveness.',
    ],
  },
  kitchen: {
    roomName: 'Rustic Kitchen',
    receipts: [
      {
        beforeReveal: "Copper pots! Let me hear that one. A lovely ring. I'll hang them above the stove, but the smallest is coming straight down again for soup.",
        afterReveal: 'Copper pots, and one small enough for a supper for two. I will hang the others above the stove. That one belongs in my paws, with something simmering inside.',
      },
      {
        beforeReveal: "You've brought the salt circle. I'll lay it around the table carefully. Some of this salt is staying by the breadboard. I still have ordinary cooking to do.",
        afterReveal: 'The salt circle will go around the table. I will keep a little salt beside the breadboard as well. Supper still needs seasoning, whatever the recipe in the house may claim.',
      },
      {
        beforeReveal: "The first attunement, and the dough's already lifting beneath the copper pots. That's quite a compliment. I'll check the middle before I call it a good loaf.",
        afterReveal: 'The first attunement lifts the dough beneath the copper pots. A handsome rise. I will cut the loaf and see how it baked inside before I serve it.',
      },
      {
        beforeReveal: "The second attunement has all the copper pots humming together. I can stir to that. Though I might try a different rhythm and see whether they mind.",
        afterReveal: 'The second attunement brings the copper pots onto one note. My spoon has its own rhythm. I will keep that rhythm for a while and hear what they do.',
      },
      {
        beforeReveal: "Fully attuned, then. The soup tastes exactly like yesterday's. Let me find the pepper. A kitchen should let you change your mind halfway through a recipe.",
        afterReveal: 'The kitchen is fully attuned. Every bowl tastes precisely as the last one did. Pass me the pepper. I would like to find out whether supper can still surprise us.',
      },
    ],
    circumstance: [
      "There's always room at this table. Let me clear the flour from your end.",
      "A pot rang while the stove was cold this morning. I checked for a draft. The window was shut.",
      "The recipe keeps gaining instructions overnight. I've copied the one I actually meant to cook onto a separate scrap.",
      "It's trying to keep every meal exactly right. But I know what a hungry friend sounds like, and the recipe hasn't asked anyone how much they want.",
      'Something wants to preserve this table and everyone around it. I can understand that wish. I cannot let the wish decide that no guest may push a bowl away.',
      'I have kept cooking since the arrival. Some loaves come out uneven, and I let people choose the crust they like. Sit for supper if you want it. The place is yours to leave empty too.',
    ],
  },
  study: {
    roomName: "Scholar's Study",
    receipts: [
      {
        beforeReveal: "A gilded globe. Splendid. I'll put it beside the atlas, where I can compare the coastlines. An ornament is allowed to be useful as well as handsome.",
        afterReveal: 'A gilded globe for the desk. I will keep the atlas beside it. Two accounts of a coastline give me somewhere to begin when one of them changes.',
      },
      {
        beforeReveal: "Marginalia. There's writing beside a passage I left unmarked. Thank you for bringing this to me. I'll copy the passage before I try answering its new neighbor.",
        afterReveal: 'The marginalia has reached this volume too. I will copy the passage and its new handwriting onto separate sheets. An annotation must not quietly become the original.',
      },
      {
        beforeReveal: "The first attunement, and three books have opened to the same page. Convenient, if that's the page I need. I'll leave a bookmark somewhere else as a small experiment.",
        afterReveal: 'With the first attunement, the books open to the same page. I have marked a different passage in each. Useful agreement is something I should be able to test.',
      },
      {
        beforeReveal: "The second attunement has the globe turning while I read aloud. Let me try a shopping list. I want to know whether it prefers learning or simply the sound of a voice.",
        afterReveal: 'The second attunement turns the globe when I read aloud. I will try an ordinary list next. An observation becomes stronger when it survives an unflattering explanation.',
      },
      {
        beforeReveal: "Fully attuned. An answer has appeared beside the question I left in this book. I'll date both of them. I should like to see whether tomorrow permits the same question.",
        afterReveal: 'The study is fully attuned. The book has supplied an answer beside my question. I will preserve both in my own hand, including the part of the answer I dispute.',
      },
    ],
    circumstance: [
      "I keep a small catalogue of things friends have brought me. Your name belongs beside this entry.",
      "I've found two different versions of yesterday's notes. Both are in my handwriting. That deserves a careful record.",
      "The books offer explanations more readily than evidence. I'm learning to leave a little space between the two.",
      "An entry changed after I disagreed with it. I've kept a copy of the disagreement somewhere the book cannot mistake for a margin.",
      'The writing helped us understand the invitation. It also tried to revise the record of our doubts. I will keep the unwelcome version beside the reassuring one.',
      'The presence has arrived, and the accounts still differ. I can keep studying without calling the matter settled. Your gift earns a place in the catalogue, not a vote in favor of my conclusions.',
    ],
  },
  aquarium: {
    roomName: 'Aquarium Room',
    receipts: [
      {
        beforeReveal: "Glowing coral, for me? Oh, look at the sand now. I'll put it where I can float above it, and where you can see the light from outside the glass.",
        afterReveal: 'You brought glowing coral. Look at the light finding the little hollows in the sand. I will set it near the glass, so we can both look at it from where we are.',
      },
      {
        beforeReveal: "Still water. It's so smooth I can see every frond of my gills. Let me wave a hand through it, though. I like being able to tell when I've moved.",
        afterReveal: 'The water has gone still. I can see every little detail in the glass. I will put a hand through the surface and watch for a ripple. I want it to remember that I moved.',
      },
      {
        beforeReveal: "The first attunement makes the coral light reach right across the sand. There's a stone at the back I hadn't seen properly. Come look, it's shaped like a sleepy potato.",
        afterReveal: 'The first attunement carries the coral light across the sand. It has found my little potato-shaped stone at the back. I am glad there are still ordinary things to show you.',
      },
      {
        beforeReveal: "The second attunement has started a slow current. It keeps taking me the same way round. I'll swim the other way for a bit, just to see how that feels.",
        afterReveal: 'The second attunement makes a current around the tank. I will float with it, then swim across it. I need to know which part of the journey is mine.',
      },
      {
        beforeReveal: "Fully attuned. My reflection waved after I'd already stopped. Hello, slow me. I'll move a different hand next time and see whether it really is following.",
        afterReveal: 'The tank is fully attuned. My reflection moves a moment after I do. I will keep changing the gesture. I want an echo that follows me, even when I do something unexpected.',
      },
    ],
    circumstance: [
      "You can sit by the glass while I find the nicest angle. Water makes nearly everything look a little different.",
      "There's a cold patch that moves about without a current. I keep swimming through it from different sides.",
      "The water holds a shape after the thing that made it has gone. It's lovely to look at, and then I start wondering why it stayed.",
      "I used to think keeping something meant you couldn't lose any of it. Now I watch the water smooth away the bits that don't fit, and I want those bits back too.",
      'Something can hold a shape here so carefully that it stops the shape from changing. I understand why that might feel kind. I need it to let a living thing move.',
      'The presence is here, and I still have questions for the water. Some mornings I enjoy floating. Some mornings I check every ripple. You can keep me company without having to tell me it is all right.',
    ],
  },
  jungle_room: {
    roomName: 'Jungle Hammock',
    receipts: [
      {
        beforeReveal: "Hanging vines. Lovely. I'll move this one a little to the left so I can reach a flower without leaving the hammock. Comfort does reward a modest amount of planning.",
        afterReveal: 'Hanging vines, with a flower within reach of the hammock. You have understood my priorities. I will leave enough space between them to see who is at the door.',
      },
      {
        beforeReveal: "The inward bloom has turned every flower toward the house. An attentive audience. I'll turn my hammock toward the window and give them something else to consider.",
        afterReveal: 'The inward bloom has given every flower the same view. I will keep my hammock facing the window. One room can accommodate more than one direction of interest.',
      },
      {
        beforeReveal: "The first attunement has the new shoots growing in straight lines. Very decisive of them. I'll leave a crooked old vine beside them; it's doing a perfectly good job.",
        afterReveal: 'The first attunement sends the new shoots out in straight lines. The old crooked vine can stay beside them. It has held my hammock for years without consulting a ruler.',
      },
      {
        beforeReveal: "The second attunement has all the leaves trembling together. Quite soothing, until you try counting. I'll stop counting now. I should like the option of a nap.",
        afterReveal: 'The second attunement puts every leaf into the same rhythm. I will listen for a while, then turn over. There are limits to the attention I am willing to give a leaf.',
      },
      {
        beforeReveal: "Fully attuned, and the vines have made one enormous knot. I recognize the shape. I'll leave this loose end alone, though. It may be useful to have somewhere to begin undoing it.",
        afterReveal: 'The vines have finished their knot with the last attunement. I recognize the shape. I will leave the loose end within reach. Finishing a thing need not make it impossible to undo.',
      },
    ],
    circumstance: [
      "Thank you for carrying that all the way up. I'd offer to help with the carrying, but we have rather conclusively missed that moment.",
      "The leaves have been turning toward the wall in the evenings. I've had plenty of time to notice. Not much of an explanation yet.",
      "I've been waiting for a change in this house. Waiting gives a person time to become fond of an idea. It doesn't make the idea reliable.",
      "The vines are getting rather firm about where things belong. I wanted to see what the house was becoming. I'd still like it to leave room for a different arrangement.",
      'I wanted the arrival. I never promised it would be harmless, but I made waiting look so comfortable that nobody thought to ask. Be kind to me if you like. Remember that as well.',
      'It has arrived. I still like my hammock, and I have changed my mind about several grander things. We can enjoy an afternoon without making it a declaration that everything was worth it.',
    ],
  },
  desert_room: {
    roomName: 'Desert Camp',
    receipts: [
      {
        beforeReveal: "A star map for the tent! Hold that corner while I smooth it out. I want to compare it with the sky tonight, one bright point at a time.",
        afterReveal: 'A star map for the tent. I will pin each corner and make a copy of the pattern. If a star moves, I want to know which point was here when you brought it.',
      },
      {
        beforeReveal: "The new constellation has a shape I don't know. I'll mark its edges in my notebook. There's a difference between hearing something new and knowing what it means.",
        afterReveal: 'The new constellation needs a page of its own in my notebook. I will draw what is there. I will leave the meaning blank until I have something more than a guess.',
      },
      {
        beforeReveal: "The first attunement has the painted stars glimmering. That one woke first. I'll write it down before the others make me forget the order.",
        afterReveal: 'The first attunement wakes a light in the painted stars. I will record the order as they brighten. A pattern is easier to question when I have kept its beginning.',
      },
      {
        beforeReveal: "The second attunement sounds like sand moving across the star map. Both ears heard it. I'll open the tent flap and listen outside as well.",
        afterReveal: 'The second attunement has given the star map a sound like shifting sand. I will listen outside the tent too. I need something to compare with what the canvas tells me.',
      },
      {
        beforeReveal: "Fully attuned. Three more lights have appeared on the map. I didn't paint those. Pass me my notebook, please. I want the number down before I get used to seeing them.",
        afterReveal: 'The map is fully attuned. Three lights have appeared that were absent from my drawing. I will keep the old drawing beside the new one, with both dates clear.',
      },
    ],
    circumstance: [
      "You brought something worth looking at quietly. My ears are grateful for a task they can share with my eyes.",
      "I've heard a little tapping beyond the tent after dark. Too regular for sand. I haven't found the source.",
      "There are sounds the walls carry better than the open air. I'm keeping separate notes for what I hear and what I think is making it.",
      "The sounds repeat when I try to listen somewhere else. That's what troubles me. A call should leave you free to turn an ear away.",
      'I heard the approach before I could explain it. Hearing first did not make me certain. I will keep recording the sounds that disagree with the pattern.',
      'It has arrived, and my ears still need rest. I close the tent flap when I have heard enough. Thank you for bringing this quietly. Stay if you like. I will not keep watch the whole time.',
    ],
  },
  office: {
    roomName: 'Chill Office',
    receipts: [
      {
        beforeReveal: "A standing lamp. Excellent. The far end of the desk has been surviving on optimism. I'll put it beside the ledger and retire that particular expense.",
        afterReveal: 'A standing lamp for the far end of the desk. I will put it beside the ledger. Clear light should make it harder to overlook the small print.',
      },
      {
        beforeReveal: "Second shadow received. I now cast two, and neither has offered to help with the filing. I'll make a note of which one moves first.",
        afterReveal: 'The lamp now casts a second shadow. Neither has volunteered to do the filing. I will record which one moves first, and keep the observation separate from the joke.',
      },
      {
        beforeReveal: "The first attunement has warmed the lamp's corner before I turned it on. Efficient. I'll leave the switch off awhile and see what exactly we're saving.",
        afterReveal: 'The first attunement warms the corner before the lamp is switched on. I will leave the switch alone and record how long it lasts. Efficiency still needs an explanation.',
      },
      {
        beforeReveal: "The second attunement seems keen to organize my paperwork. I'll leave a few pages out of order deliberately. A filing system should survive a question about its methods.",
        afterReveal: 'The second attunement has begun arranging my papers. I will keep a separate list of the order I chose. A tidy desk is of little use if I cannot find my own decisions.',
      },
      {
        beforeReveal: "Fully attuned. My shadow has got up before I have. Admirable initiative, but I'll remain seated a moment. I'd like to establish who is making this appointment.",
        afterReveal: 'The office is fully attuned. My shadow moves before I do. I will remain seated a moment longer. My diary should contain appointments I have actually agreed to keep.',
      },
    ],
    circumstance: [
      "I'll enter that under household gifts. A much nicer column than repairs.",
      "A line appeared in the ledger before I'd written it. I put a question mark beside it. The question mark was mine, at least.",
      "The totals keep coming out agreeably neat. I've started retaining the untidy workings on a separate sheet.",
      "The ledger has been treating disagreement as a clerical error. I've opened a new column for it. There appears to be quite a lot to enter.",
      'The house can keep a record by changing what the record contains. I helped organize those records. I need to account for the entries that went missing as well as the ones that balanced.',
      'Since the arrival, I have kept the crossed-out entries legible. Your gift goes under kindness received. There is no adjacent box requiring agreement, gratitude on demand, or a promise to stay.',
    ],
  },
  burrow: {
    roomName: 'Underground Burrow',
    receipts: [
      {
        beforeReveal: "A crystal formation. Right, let me find solid earth for it. Those points catch the light nicely, but I want the base sitting true before we stand back and admire it.",
        afterReveal: 'A crystal formation for the burrow. I will bed the base in firm earth and leave the points clear of the beam. A handsome thing still needs sound footing.',
      },
      {
        beforeReveal: "Listening crystals, you say. They've grown toward the surface. I'll check that they're clear of the supports. They can listen all they like if the ceiling stays sound.",
        afterReveal: 'The listening crystals have reached toward the surface. I will measure the clearance beside the supports. I know how much room the beams need, even when the crystals have other interests.',
      },
      {
        beforeReveal: "The first attunement puts a light in the crystals when I speak gently. Well, hello there. I'll try an ordinary work report next and see if that suits them too.",
        afterReveal: 'The first attunement lights the crystals when I speak gently. I will give them the measurements as well. There must be room for an accurate report, however it sounds.',
      },
      {
        beforeReveal: "The second attunement has warmed the earth round the crystals. I'll check the foundation again after it's had time to settle. Warm ground can move, same as any other ground.",
        afterReveal: 'The second attunement warms the earth around the crystals. I will inspect the foundation after it settles. A pleasant temperature does not relieve me of checking the supports.',
      },
      {
        beforeReveal: "Fully attuned. The crystals just repeated my last word. I'll give them a measurement worth keeping. Then I'll change it and see whether they pass the correction along.",
        afterReveal: 'The crystals are fully attuned, and they repeat the last word spoken here. I will read out a measurement, then its correction. Good work depends on being allowed to revise a mark.',
      },
    ],
    circumstance: [
      "Thanks for bringing it down. Mind your head on that beam. I've knocked mine often enough to recommend the precaution.",
      "The ground sounds hollow farther down than I've dug. I know where my work ends. Whatever is beyond it needs another look.",
      "I build things to hold. Lately the earth has been holding shapes I didn't put there. I'm checking them against my own marks.",
      "Something keeps putting a shifted support back where it was. It looks helpful until you remember I moved it for a reason. I'll keep measuring.",
      'I understand the beams I fitted. I learned the older structure had another purpose after I began finding what lay beneath it. I will be plain about where my knowledge ends.',
      'The presence is here. I still check the beams with my own paws. If you want something altered, tell me where it pinches. A home ought to make room for the people living in it.',
    ],
  },
  garden: {
    roomName: 'Garden Patio',
    receipts: [
      {
        beforeReveal: "Wind chimes. Oh, those are lovely. I'll hang them by the herbs, where I can reach them. I like being able to quiet a sound when the garden has had enough.",
        afterReveal: 'Wind chimes for the herb bed. Thank you. I will hang them within reach of the bench, where I can listen or hold them still with my own paw.',
      },
      {
        beforeReveal: "The tuned chimes have settled on one note. I nearly started humming it before I'd listened properly. Let me hear it once all the way through.",
        afterReveal: 'The tuned chimes hold a single note. I caught myself humming before I had decided to join in. I will listen once, quietly, and choose whether to sing.',
      },
      {
        beforeReveal: "The first attunement has the flowers turning to follow you. I didn't teach them that. I'll water the ones facing away from the path as well.",
        afterReveal: 'The first attunement turns the flowers toward a visitor. I will tend the flowers facing the fence too. They should not have to watch anyone to earn their water.',
      },
      {
        beforeReveal: "There's a second, lower note in the chimes now. The second attunement, I suppose. I'll tie them still when I go to bed. I want to choose what I fall asleep hearing.",
        afterReveal: 'The second attunement gives the chimes a lower answering note. I will tie them still at bedtime. The garden may have a voice, and I may need a quiet night.',
      },
      {
        beforeReveal: "Fully attuned. Every petal went still when the chimes rang. I nearly did too. Come help me loosen this bit of soil. I'd like to keep doing what I was doing.",
        afterReveal: 'The garden is fully attuned. The chimes ring and every petal holds still. I will keep loosening the soil beneath this plant. I want to finish the task I chose.',
      },
    ],
    circumstance: [
      "I've made space by the herbs. You remembered this little corner. That means a lot.",
      "Some flowers have opened facing the wrong way for the sun. I'm writing down which ones before I forget.",
      "The beds keep settling into rows I didn't plant. I've left my first drawing tucked under the watering can. I need something that remembers what I chose.",
      "I moved a pot and found it back in its old place. I've moved it again. I'm allowed to like the other spot, even if I sound nervous saying so.",
      'The house would keep the garden beautiful by deciding how every flower belongs. I am still learning to say when I want something else. Please leave me time to find the words.',
      'Since the arrival, I check that the things I move stay moved. I like some parts of the garden and still need distance from others. Thank you for visiting without asking me to feel only one way.',
    ],
  },
  bamboo_attic: {
    roomName: 'Bamboo Attic',
    receipts: [
      {
        beforeReveal: "Paper lanterns. Thank you. I'll set them above the mat and watch where the light falls. A small circle of light can be enough for an evening.",
        afterReveal: 'Paper lanterns for the space above the mat. I will watch where their light falls before I choose where to sit. There is no need to turn that small choice into a teaching.',
      },
      {
        beforeReveal: "The risen lanterns have taken their places by the rafters. I used to think every upward movement meant something. Perhaps I'll simply watch these for a while.",
        afterReveal: 'The risen lanterns hold near the rafters. I once gave every upward movement a spiritual explanation. I will begin with what I can see: their light, their height, their stillness.',
      },
      {
        beforeReveal: "The first attunement makes the lantern light rise and fall like breathing. I'll sit beside it. I needn't make my breath match in order to appreciate it.",
        afterReveal: 'The first attunement gives the lanterns a breathing rhythm. I will let my own breath find its pace. Sitting together does not require us to move as one.',
      },
      {
        beforeReveal: "The second attunement has the bamboo keeping time. It's a patient sound. I'll listen for the spaces between knocks, where I can hear my own breathing too.",
        afterReveal: 'The second attunement sets a regular knocking through the bamboo. I will listen to the pauses as carefully as the notes. My own breath has room in those pauses.',
      },
      {
        beforeReveal: "Fully attuned. The lanterns have formed a circle over the mat. I'll sit a little outside its center today. I wonder how the light looks from there.",
        afterReveal: 'The lanterns form a circle with the final attunement. I will place my mat a little outside its center. I want to see what the light offers from a seat I chose myself.',
      },
    ],
    circumstance: [
      "There is room on the mat if you'd like to sit. We can be quiet without having to do anything with the quiet.",
      "The bamboo has been knocking when there's no breeze. I've been listening before deciding what to call the sound.",
      "I used to take a calm feeling as a sign that I understood. The room has felt calm through some very strange changes. I should allow myself a question.",
      "The rhythm grows easier to follow each evening. I've begun keeping my own count as well. I don't yet know why that feels necessary.",
      'I mistook an interpretation for certainty and spoke as though calm were proof. The house can quiet a doubt without answering it. I need to learn to hear the doubt again.',
      'The presence has arrived. Some quiet still comforts me, and some quiet reminds me of what I failed to question. You may sit, speak, or leave. I will not make a lesson out of your choice.',
    ],
  },
  star_loft: {
    roomName: 'Star Loft',
    receipts: [
      {
        beforeReveal: "A moth lantern. Hang it by the rail, please. I'll leave it unlit to begin with. The moths may tell us whether the light was what brought them.",
        afterReveal: 'A moth lantern for the rail. I will leave it unlit at first. If the moths gather anyway, I want to have seen the difference for myself.',
      },
      {
        beforeReveal: "The lit hour. I'll mark when the lantern wakes and when it dims. An hour sounds precise until you start watching who decides its beginning.",
        afterReveal: 'The lantern has its lit hour now. I will mark its beginning and end against my own clock. A schedule deserves to be observed before it is trusted.',
      },
      {
        beforeReveal: "The first attunement has the moths circling one way. I'll watch for the one that turns aside. A single different flight can tell me more than a hundred matching ones.",
        afterReveal: 'The first attunement turns the moths into a common circle. I will watch for a flight that breaks away. That movement belongs in the record too.',
      },
      {
        beforeReveal: "The second attunement seems to draw the moths earlier. I'll keep the old arrival times beside tonight's. Watching carefully means keeping what has changed.",
        afterReveal: 'With the second attunement, the moths gather earlier. I will keep the old times beside the new ones. A record of change needs both.',
      },
      {
        beforeReveal: "Fully attuned. The lantern light bends toward a dark place between the stars. I'll mark the angle from the rail. I won't guess what lives at the other end.",
        afterReveal: 'The loft is fully attuned. The lantern light bends toward a space between the stars. I can measure the angle from this rail. I cannot name everything beyond it.',
      },
    ],
    circumstance: [
      "You've brought something that rewards watching. Stay by the rail if you like. We needn't fill the whole night with words.",
      "There is a patch of sky the moths keep avoiding. I've marked where it sits in relation to the roof.",
      "I've watched something alter the spaces between the stars. I can tell you where I saw it. What it means is a larger claim.",
      "The pattern repeats more exactly every night. I'm keeping track of the moments I look away as well. I want my watching to remain something I choose.",
      'I saw the signs before anyone else did. Seeing them first did not tell me what they would cost. I try to keep what I saw apart from what I guessed.',
      'It lives in the house now. I still watch the sky, and I close my eyes when I am tired. The loft can keep a light for us. The watch can end at dawn, like any other job.',
    ],
  },
  belfry: {
    roomName: 'Belfry',
    receipts: [
      {
        beforeReveal: "Chalk circles. Good. I'll mark the low woodwork, where a paw can reach to check my survey. Leave that little gap; I want to see whether the chalk stays as I drew it.",
        afterReveal: 'Chalk circles for the low woodwork. I will leave one small gap in the first ring. A survey is more useful when I can tell whether someone has altered the marks.',
      },
      {
        beforeReveal: "Waking bronze. Hear that hum? Nobody struck her. I'll put a paw on the beam and see where the note carries before I say what made her begin.",
        afterReveal: 'The bronze is waking without a strike. I will feel along the beam and map where the note carries. Hearing a voice does not tell me everything about its speaker.',
      },
      {
        beforeReveal: "The first attunement keeps the chalk sharp through a draft. Useful, though I'll keep my rough copy too. I want yesterday's crooked circle somewhere I can still find it.",
        afterReveal: 'The first attunement keeps the chalk circles sharp. I will keep the rough copy beside my survey. The crooked original tells me something a perfect ring cannot.',
      },
      {
        beforeReveal: "The second attunement has carried the bell's hum into the floor. Heel to toe, now. I'll map where she sounds strongest and leave myself a quiet board to stand on.",
        afterReveal: 'The second attunement carries the hum into the floorboards. I will map the strongest places and the quiet ones. A listener needs somewhere to put down the work.',
      },
      {
        beforeReveal: "Fully attuned. The whole tower holds her note when the wind catches it. I'll listen from the stairs as well as beside the bronze. Distance tells you things closeness can't.",
        afterReveal: 'The tower is fully attuned. The wind brings the bronze and wood onto one note. I will listen from the stairs as well. A voice can remain audible without filling every place I stand.',
      },
    ],
    circumstance: [
      "Thanks, friend. Put your paws over your ears if I tap too loudly. A fair survey needn't leave anyone ringing.",
      "Some of the hollows answer after I've put my tapping finger away. I'm marking the late replies separately.",
      "The bell and the beams sometimes answer with the same note. I'll tell you what I can hear. I won't pretend that gives me the whole construction drawing.",
      "One of my chalk gaps closed overnight. I'd left it there on purpose. I've made another, and this time I've kept a copy of the unfinished ring.",
      'The house can improve a mark until the hand that made it disappears from the work. I want the uneven chalk line kept beside the perfect one. Both have something to say.',
      'The presence has arrived, and the bronze still has her voice. I keep a place where I can stand without answering it. We can listen together for as long as we choose, then take the stairs.',
    ],
  },
  sky_garden: {
    roomName: 'Sky Garden',
    receipts: [
      {
        beforeReveal: "A moonflower bed. Thank you, friend. I'll loosen the soil round the roots. They can have time to settle before anyone asks them for a beautiful night.",
        afterReveal: 'A moonflower bed for the garden. I will loosen the soil around the roots and let them settle. A flower needs time to become itself before it owes anyone a bloom.',
      },
      {
        beforeReveal: "Upturned blooms. They've stopped waiting for moonlight. I'll watch through an ordinary afternoon and see whether they still know when to close.",
        afterReveal: 'The upturned blooms have opened without waiting for the moon. I will watch whether they can close again. A flower has work to do in its folded hours too.',
      },
      {
        beforeReveal: "The first attunement puts a little glow in the moonflowers before dusk. I can see the smallest buds now. I'll keep watering those, whether they shine or not.",
        afterReveal: 'The first attunement lights the moonflowers before dusk. I can see the smallest buds more clearly. They will get their share of water while they are still only buds.',
      },
      {
        beforeReveal: "The second attunement has brought a low boom across the beds. That one wasn't mine. I'll answer once, then wait. There's no need to fill every quiet space.",
        afterReveal: 'The second attunement brings a low boom across the beds. I did not make that sound. I will answer once and leave time after it for the garden to be quiet.',
      },
      {
        beforeReveal: "Fully attuned. The flowers are holding themselves wide open. I'll keep a little shade for them. Even a very fine bloom ought to be allowed to finish its day.",
        afterReveal: 'The garden is fully attuned. The flowers hold themselves wide open. I will keep some shade ready. A bloom should be allowed its closing hour, however beautiful it has become.',
      },
    ],
    circumstance: [
      "There is room here for slow-growing things. We can sit a while before I put the watering can away.",
      "A few buds have stayed the same size longer than I expected. I've marked them with little sticks so I can be sure.",
      "The garden has been keeping its prettiest flowers open. I've started watching the young shoots as carefully. I want to see them grow into something new.",
      "A seedling that never changes may look well cared for. I've grown enough plants to know it still needs a next season.",
      'The presence would keep a loved thing at its loveliest. I can see the tenderness in that. I can also see a seedling kept from becoming a tree.',
      'It has arrived, and I still save seed for a season I have not seen. The warmth would rather this garden stayed exactly as it is. I keep a few seeds dry anyway. Next year needs somewhere to start.',
    ],
  },
};

function getGiftStep(request: HouseUpgradePurchase): GiftStep | null {
  if (request.tier === 1) return 0;
  if (request.tier === 2) return 1;
  if (request.tier === 3 && Number.isInteger(request.level) && request.level >= 1 && request.level <= 3) {
    return (request.level + 1) as GiftStep;
  }
  return null;
}

function getResidentGiftScript(roomId: string): ResidentGiftScript | undefined {
  return Object.prototype.hasOwnProperty.call(RESIDENT_GIFT_SCRIPTS, roomId)
    ? RESIDENT_GIFT_SCRIPTS[roomId]
    : undefined;
}

/** Display label for an exact pending purchase, including its attunement level. */
export function getHouseUpgradeGiftName(request: HouseUpgradePurchase): string {
  if (request.tier === 1) return getRoomUpgrade(request.roomId)?.name ?? 'House upgrade';
  if (request.tier === 2) return getRoomDeepening(request.roomId)?.name ?? 'House upgrade';
  const info = getAttunementForLevel(request.roomId, request.level);
  const script = getResidentGiftScript(request.roomId);
  return info && script && getGiftStep(request) !== null ? `${script.roomName}: ${info.name}` : 'House upgrade';
}

/**
 * Read at handover using the current GLOBAL phase. Pending gifts can outlive
 * the phase in which they were bought. No save access or dialogue consumption.
 * Unknown/corrupt requests are left for the owning service to reject.
 */
export function getHouseUpgradeGiftDialogue(request: HouseUpgradePurchase, phase: DialoguePhase): string[] {
  const script = getResidentGiftScript(request.roomId);
  const step = getGiftStep(request);
  if (!script || step === null) return [];
  const currentPhase = Number.isFinite(phase) ? Math.max(0, Math.min(5, Math.floor(phase))) : 0;
  const receipt = script.receipts[step];
  return [
    currentPhase >= 4 ? receipt.afterReveal : receipt.beforeReveal,
    script.circumstance[currentPhase],
  ];
}
