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
 * a response to the current house. Since 2026-09-24 residents contract at
 * every phase, the revealed receipts included (the owner found the expanded
 * register "awkwardly formal");
 * the aftermath permits misgivings and never assumes which boundary was
 * chosen. Attunement receipts do not require the optional deepening.
 */
const RESIDENT_GIFT_SCRIPTS: Record<string, ResidentGiftScript> = {
  cozy_den: {
    roomName: 'Cozy Den',
    receipts: [
      {
        beforeReveal: "A hearthstone for the fire. Thank you. I'll set the carved side toward your chair, where you can see it when the flames settle.",
        afterReveal: "You carried a hearthstone to my fire. I'll set the carved side toward your chair. There's room for your feet beside it, whenever you want that seat.",
      },
      {
        beforeReveal: "This ashen mantel sits well above the hearthstone. The light looks colder against it. Come close enough to feel the heat before you trust the color.",
        afterReveal: "The ashen mantel gives the hearth a darker edge. Hold a paw near the fire and feel it for yourself. The color of the stone can't tell you whether a room is warm.",
      },
      {
        beforeReveal: "The hearth is kindled a little further. See how the flame bends toward the stone? I'll sit with it awhile and see whether it does that without company.",
        afterReveal: "The first attunement draws the flame toward the hearthstone. I'll watch it when the room is empty too. I owe you an account of what it does when nobody's watching.",
      },
      {
        beforeReveal: "There's the second note, underneath the crackling. Humming suits this hearth. I'd like to hear what happens when I stop tending it for a moment.",
        afterReveal: "The second attunement has brought a low note under the crackling. I'll take my paws away and listen. A fire should let its keeper rest.",
      },
      {
        beforeReveal: "That's the last attunement. The flame holds its shape even when I move the logs. Thank you for bringing it yourself. Stay while I try a different piece of wood.",
        afterReveal: "The hearth is fully attuned. The flame holds its shape even when the logs shift under it. I'll keep trying different wood. I want this fire to have more than one way to burn.",
      },
    ],
    circumstance: [
      "I've kept this corner for company. A good fire gives us an excuse to put the kettle on.",
      "The room warms a little before I light the fire lately. I've been checking the embers each morning.",
      "Sometimes the heat follows my paw after I've drawn it away. I know something is listening here. I wish I could tell you more clearly what it hears.",
      "The house answers the care we put into it. I've begun to worry about how carefully it keeps things the same. I'll tell you when I see that happen here.",
      "I helped invite the thing that listens through this house. I didn't understand that its care would push anything that changes back into place. Your kindness doesn't settle what I owe you.",
      "It's here now. I can tend this fire and still question what its warmth costs. You can sit with me, or leave me to it. I'll keep your gift without asking it to mean forgiveness.",
    ],
  },
  kitchen: {
    roomName: 'Rustic Kitchen',
    receipts: [
      {
        beforeReveal: "Copper pots! Let me hear that one. A lovely ring. I'll hang them above the stove, but the smallest is coming straight down again for soup.",
        afterReveal: "Copper pots, and one small enough for a supper for two. I'll hang the others above the stove. That one belongs in my paws, with something simmering in it.",
      },
      {
        beforeReveal: "You've brought the salt circle. I'll lay it around the table carefully. Some of this salt is staying by the breadboard. I still have ordinary cooking to do.",
        afterReveal: "The salt circle goes around the table. I'll keep a little salt by the breadboard too. Supper still needs seasoning, whatever this house thinks the recipe says.",
      },
      {
        beforeReveal: "The first attunement, and the dough's already lifting beneath the copper pots. That's quite a compliment. I'll check the middle before I call it a good loaf.",
        afterReveal: "The first attunement lifts the dough under the copper pots. A handsome rise. I'll cut the loaf and see how it baked inside before I serve it.",
      },
      {
        beforeReveal: "The second attunement has all the copper pots humming together. I can stir to that. Though I might try a different rhythm and see whether they mind.",
        afterReveal: "The second attunement puts the copper pots all on one note. My spoon keeps its own rhythm. I'll keep stirring my way for a while and hear what they do.",
      },
      {
        beforeReveal: "Fully attuned, then. The soup tastes exactly like yesterday's. Let me find the pepper. A kitchen should let you change your mind halfway through a recipe.",
        afterReveal: 'The kitchen is fully attuned. Every bowl tastes exactly like the last one. Pass me the pepper. I want to find out if supper can still surprise us.',
      },
    ],
    circumstance: [
      "There's always room at this table. Let me clear the flour from your end.",
      "A pot rang while the stove was cold this morning. I checked for a draft. The window was shut.",
      "The recipe keeps gaining instructions overnight. I've copied the one I actually meant to cook onto a separate scrap.",
      "It's trying to keep every meal exactly right. But I know what a hungry friend sounds like, and the recipe hasn't asked anyone how much they want.",
      "Something in this house wants to keep this table, and everyone at it, exactly as it is. I understand the wish. I won't let it decide that nobody's allowed to push a bowl away.",
      "I've kept cooking since the arrival. Some loaves come out uneven, and I let people pick the crust they like. Sit for supper if you want it. Your place is yours to leave empty too.",
    ],
  },
  study: {
    roomName: "Scholar's Study",
    receipts: [
      {
        beforeReveal: "A gilded globe. Splendid. I'll put it beside the atlas, where I can compare the coastlines. An ornament is allowed to be useful as well as handsome.",
        afterReveal: "A gilded globe for the desk. I'll keep the atlas beside it. If one of them changes a coastline, the other will show me where to start checking.",
      },
      {
        beforeReveal: "Marginalia. There's writing beside a passage I left unmarked. Thank you for bringing this to me. I'll copy the passage before I try answering its new neighbor.",
        afterReveal: "The notes in the margins have reached this book too. I'll copy the passage and the new handwriting onto separate sheets. A note in the margin mustn't quietly become the original.",
      },
      {
        beforeReveal: "The first attunement, and three books have opened to the same page. Convenient, if that's the page I need. I'll leave a bookmark somewhere else as a small experiment.",
        afterReveal: "Since the first attunement, the books all fall open at the same page. I've marked a different passage in each. If the books agree, I want to be able to test it.",
      },
      {
        beforeReveal: "The second attunement has the globe turning while I read aloud. Let me try a shopping list. I want to know whether it prefers learning or simply the sound of a voice.",
        afterReveal: "Since the second attunement, the globe turns whenever I read aloud. Next I'll read it a shopping list. If it turns for that too, it likes a voice, not learning.",
      },
      {
        beforeReveal: "Fully attuned. An answer has appeared beside the question I left in this book. I'll date both of them. I should like to see whether tomorrow permits the same question.",
        afterReveal: "The study's fully attuned. The book has written an answer beside my question. I'll copy both out in my own hand, including the part of the answer I disagree with.",
      },
    ],
    circumstance: [
      "I keep a small catalogue of things friends have brought me. Your name belongs beside this entry.",
      "I've found two different versions of yesterday's notes. Both are in my handwriting. That deserves a careful record.",
      "The books offer explanations more readily than evidence. I'm learning to leave a little space between the two.",
      "An entry changed after I disagreed with it. I've kept a copy of the disagreement somewhere the book cannot mistake for a margin.",
      "The book helped us understand the invitation. It also tried to rewrite the record of our doubts. I'll keep the unwelcome version beside the reassuring one.",
      "It's here now, and the accounts still don't agree. I can keep studying without calling the matter settled. Your gift goes in the catalogue. It isn't a vote for my conclusions.",
    ],
  },
  aquarium: {
    roomName: 'Aquarium Room',
    receipts: [
      {
        beforeReveal: "Glowing coral, for me? Oh, look at the sand now. I'll put it where I can float above it, and where you can see the light from outside the glass.",
        afterReveal: "You brought glowing coral! Look at the light finding the little hollows in the sand. I'll set it near the glass, so we can both see it from where we are.",
      },
      {
        beforeReveal: "Still water. It's so smooth I can see every frond of my gills. Let me wave a hand through it, though. I like being able to tell when I've moved.",
        afterReveal: "The water's gone still. I can see every little detail in the glass. I'll put a hand through the surface and watch for a ripple. I want it to remember that I moved.",
      },
      {
        beforeReveal: "The first attunement makes the coral light reach right across the sand. There's a stone at the back I hadn't seen properly. Come look, it's shaped like a sleepy potato.",
        afterReveal: "The first attunement carries the coral light across the sand. It's found my little potato-shaped stone at the back. I'm glad there are still ordinary things to show you.",
      },
      {
        beforeReveal: "The second attunement has started a slow current. It keeps taking me the same way round. I'll swim the other way for a bit, just to see how that feels.",
        afterReveal: "The second attunement makes a current around the tank. I'll float with it, then swim across it. I need to know which part of the trip is mine.",
      },
      {
        beforeReveal: "Fully attuned. My reflection waved after I'd already stopped. Hello, slow me. I'll move a different hand next time and see whether it really is following.",
        afterReveal: "The tank's fully attuned. My reflection moves a moment after I do. I'll keep changing what I do. I want an echo that follows me, even when I do something unexpected.",
      },
    ],
    circumstance: [
      "You can sit by the glass while I find the nicest angle. Water makes nearly everything look a little different.",
      "There's a cold patch that moves about without a current. I keep swimming through it from different sides.",
      "The water holds a shape after the thing that made it has gone. It's lovely to look at, and then I start wondering why it stayed.",
      "I used to think keeping something meant you couldn't lose any of it. Now I watch the water smooth away the bits that don't fit, and I want those bits back too.",
      'Something can hold a shape here so carefully that it stops the shape from changing. I understand why that might feel kind. I need it to let a living thing move.',
      "It's here, and I've still got questions for the water. Some mornings I enjoy floating. Some mornings I check every ripple. You can keep me company without having to tell me it's all right.",
    ],
  },
  jungle_room: {
    roomName: 'Jungle Hammock',
    receipts: [
      {
        beforeReveal: "Hanging vines. Lovely. I'll move this one a little to the left so I can reach a flower without leaving the hammock. Comfort does reward a modest amount of planning.",
        afterReveal: "Hanging vines, with a flower within reach of the hammock. You've understood my priorities. I'll leave enough space between them to see who's at the door.",
      },
      {
        beforeReveal: "The inward bloom has turned every flower toward the house. An attentive audience. I'll turn my hammock toward the window and give them something else to consider.",
        afterReveal: "The inward bloom has given every flower the same view. I'll keep my hammock facing the window. One room can hold more than one direction of interest.",
      },
      {
        beforeReveal: "The first attunement has the new shoots growing in straight lines. Very decisive of them. I'll leave a crooked old vine beside them; it's doing a perfectly good job.",
        afterReveal: "The first attunement sends the new shoots out in straight lines. The old crooked vine can stay beside them. It's held my hammock for years without consulting a ruler.",
      },
      {
        beforeReveal: "The second attunement has all the leaves trembling together. Quite soothing, until you try counting. I'll stop counting now. I should like the option of a nap.",
        afterReveal: "The second attunement puts every leaf into the same rhythm. I'll listen for a while, then turn over. There are limits to the attention I'll give a leaf.",
      },
      {
        beforeReveal: "Fully attuned, and the vines have made one enormous knot. I recognize the shape. I'll leave this loose end alone, though. It may be useful to have somewhere to begin undoing it.",
        afterReveal: "The vines have finished their knot with the last attunement. I recognize the shape. I'll leave the loose end within reach. Finishing a thing shouldn't make it impossible to undo.",
      },
    ],
    circumstance: [
      "Thank you for carrying that all the way up. I'd offer to help with the carrying, but we have rather conclusively missed that moment.",
      "The leaves have been turning toward the wall in the evenings. I've had plenty of time to notice. Not much of an explanation yet.",
      "I've been waiting for a change in this house. Waiting gives a person time to become fond of an idea. It doesn't make the idea reliable.",
      "The vines are getting rather firm about where things belong. I wanted to see what the house was becoming. I'd still like it to leave room for a different arrangement.",
      'I wanted the arrival. I never said it would be harmless. But I made the waiting look so comfortable that nobody thought to ask. Be kind to me if you like. Just remember that too.',
      "It's here now. I still like my hammock, and I've changed my mind about several grander things. We can enjoy an afternoon without declaring that everything was worth it.",
    ],
  },
  desert_room: {
    roomName: 'Desert Camp',
    receipts: [
      {
        beforeReveal: "A star map for the tent! Hold that corner while I smooth it out. I want to compare it with the sky tonight, one bright point at a time.",
        afterReveal: "A star map for the tent. I'll pin each corner and copy the pattern. If a star moves, I want to know which point was here when you brought it.",
      },
      {
        beforeReveal: "The new constellation has a shape I don't know. I'll mark its edges in my notebook. There's a difference between hearing something new and knowing what it means.",
        afterReveal: "The new constellation needs its own page in my notebook. I'll draw what's there. I'll leave the meaning blank until I've got something better than a guess.",
      },
      {
        beforeReveal: "The first attunement has the painted stars glimmering. That one woke first. I'll write it down before the others make me forget the order.",
        afterReveal: "The first attunement wakes a light in the painted stars. I'll write down the order they brighten in. A pattern's easier to question when I've kept its beginning.",
      },
      {
        beforeReveal: "The second attunement sounds like sand moving across the star map. Both ears heard it. I'll open the tent flap and listen outside as well.",
        afterReveal: "The second attunement gives the star map a sound like shifting sand. I'll listen outside the tent too. I need something to compare with what the canvas tells me.",
      },
      {
        beforeReveal: "Fully attuned. Three more lights have appeared on the map. I didn't paint those. Pass me my notebook, please. I want the number down before I get used to seeing them.",
        afterReveal: "The map's fully attuned. Three lights have appeared that weren't in my drawing. I'll keep the old drawing beside the new one, with both dates clear.",
      },
    ],
    circumstance: [
      "You brought something worth looking at quietly. My ears are grateful for a task they can share with my eyes.",
      "I've heard a little tapping beyond the tent after dark. Too regular for sand. I haven't found the source.",
      "There are sounds the walls carry better than the open air. I'm keeping separate notes for what I hear and what I think is making it.",
      "The sounds repeat when I try to listen somewhere else. That's what troubles me. A call should leave you free to turn an ear away.",
      "I heard it coming before I could explain it. Hearing it first didn't make me sure of anything. I'll keep recording the sounds that don't fit the pattern.",
      "It's here, and my ears still need rest. I close the tent flap when I've heard enough. Thank you for bringing this quietly. Stay if you like. I won't keep watch the whole time.",
    ],
  },
  office: {
    roomName: 'Chill Office',
    receipts: [
      {
        beforeReveal: "A standing lamp. Excellent. The far end of the desk has been surviving on optimism. I'll put it beside the ledger and retire that particular expense.",
        afterReveal: "A standing lamp for the far end of the desk. I'll put it beside the ledger. Clear light should make the small print harder to miss.",
      },
      {
        beforeReveal: "Second shadow received. I now cast two, and neither has offered to help with the filing. I'll make a note of which one moves first.",
        afterReveal: "The lamp casts a second shadow now. Neither one has volunteered to do the filing. I'll record which one moves first, and keep the observation separate from the joke.",
      },
      {
        beforeReveal: "The first attunement has warmed the lamp's corner before I turned it on. Efficient. I'll leave the switch off awhile and see what exactly we're saving.",
        afterReveal: "The first attunement warms the corner before I've switched the lamp on. I'll leave the switch alone and time how long it lasts. Efficiency still needs an explanation.",
      },
      {
        beforeReveal: "The second attunement seems keen to organize my paperwork. I'll leave a few pages out of order deliberately. A filing system should survive a question about its methods.",
        afterReveal: "The second attunement has started arranging my papers. I'll keep a separate list of the order I chose. A tidy desk isn't much use if I can't find my own decisions.",
      },
      {
        beforeReveal: "Fully attuned. My shadow has got up before I have. Admirable initiative, but I'll remain seated a moment. I'd like to establish who is making this appointment.",
        afterReveal: "The office is fully attuned. My shadow moves before I do. I'll stay seated a moment longer. My diary should only hold appointments I've actually agreed to.",
      },
    ],
    circumstance: [
      "I'll enter that under household gifts. A much nicer column than repairs.",
      "A line appeared in the ledger before I'd written it. I put a question mark beside it. The question mark was mine, at least.",
      "The totals keep coming out agreeably neat. I've started retaining the untidy workings on a separate sheet.",
      "The ledger has been treating disagreement as a clerical error. I've opened a new column for it. There appears to be quite a lot to enter.",
      'The house can keep a record by changing what the record contains. I helped organize those records. I need to account for the entries that went missing as well as the ones that balanced.',
      "Since the arrival, I've kept the crossed-out entries readable. Your gift goes under kindness received. There's no box beside it for agreement, gratitude on demand, or a promise to stay.",
    ],
  },
  burrow: {
    roomName: 'Underground Burrow',
    receipts: [
      {
        beforeReveal: "A crystal formation. Right, let me find solid earth for it. Those points catch the light nicely, but I want the base sitting true before we stand back and admire it.",
        afterReveal: "A crystal formation for the burrow. I'll bed the base in firm earth and keep the points clear of the beam. A handsome thing still needs sound footing.",
      },
      {
        beforeReveal: "Listening crystals, you say. They've grown toward the surface. I'll check that they're clear of the supports. They can listen all they like if the ceiling stays sound.",
        afterReveal: "The listening crystals have grown up toward the surface. I'll measure the gap between them and the supports. I know how much room the beams need, even if the crystals have other ideas.",
      },
      {
        beforeReveal: "The first attunement puts a light in the crystals when I speak gently. Well, hello there. I'll try an ordinary work report next and see if that suits them too.",
        afterReveal: "The first attunement lights the crystals when I speak gently. I'll read them the measurements as well. A true report ought to get a hearing, gentle or not.",
      },
      {
        beforeReveal: "The second attunement has warmed the earth round the crystals. I'll check the foundation again after it's had time to settle. Warm ground can move, same as any other ground.",
        afterReveal: "The second attunement warms the earth round the crystals. I'll check the foundation once it settles. A nice warm floor doesn't get me out of checking the supports.",
      },
      {
        beforeReveal: "Fully attuned. The crystals just repeated my last word. I'll give them a measurement worth keeping. Then I'll change it and see whether they pass the correction along.",
        afterReveal: "Fully attuned. The crystals repeat the last word anyone says down here. I'll read out a measurement, then its correction. Good work depends on being allowed to fix a mark.",
      },
    ],
    circumstance: [
      "Thanks for bringing it down. Mind your head on that beam. I've knocked mine often enough to recommend the precaution.",
      "The ground sounds hollow farther down than I've dug. I know where my work ends. Whatever is beyond it needs another look.",
      "I build things to hold. Lately the earth has been holding shapes I didn't put there. I'm checking them against my own marks.",
      "Something keeps putting a shifted support back where it was. It looks helpful until you remember I moved it for a reason. I'll keep measuring.",
      "I understand the beams I fitted. I only learned the old stone had another purpose once I started digging under it. I'll be plain about where my knowledge ends.",
      'The presence is here. I still check the beams with my own paws. If you want something altered, tell me where it pinches. A home ought to make room for the people living in it.',
    ],
  },
  garden: {
    roomName: 'Garden Patio',
    receipts: [
      {
        beforeReveal: "Wind chimes. Oh, those are lovely. I'll hang them by the herbs, where I can reach them. I like being able to quiet a sound when the garden has had enough.",
        afterReveal: "Wind chimes for the herb bed. Thank you. I'll hang them within reach of the bench, where I can listen, or hold them still with my own paw.",
      },
      {
        beforeReveal: "The tuned chimes have settled on one note. I nearly started humming it before I'd listened properly. Let me hear it once all the way through.",
        afterReveal: "The tuned chimes hold a single note. I caught myself humming before I'd decided to join in. I'll listen once, quietly, and then choose whether to sing.",
      },
      {
        beforeReveal: "The first attunement has the flowers turning to follow you. I didn't teach them that. I'll water the ones facing away from the path as well.",
        afterReveal: "The first attunement turns the flowers toward whoever visits. I'll tend the ones facing the fence too. They shouldn't have to watch anyone to earn their water.",
      },
      {
        beforeReveal: "There's a second, lower note in the chimes now. The second attunement, I suppose. I'll tie them still when I go to bed. I want to choose what I fall asleep hearing.",
        afterReveal: "The second attunement gives the chimes a lower answering note. I'll tie them still at bedtime. The garden can have a voice, and I can still need a quiet night.",
      },
      {
        beforeReveal: "Fully attuned. Every petal went still when the chimes rang. I nearly did too. Come help me loosen this bit of soil. I'd like to keep doing what I was doing.",
        afterReveal: "The garden's fully attuned. The chimes ring and every petal holds still. I'll keep loosening the soil under this plant. I want to finish the job I chose.",
      },
    ],
    circumstance: [
      "I've made space by the herbs. You remembered this little corner. That means a lot.",
      "Some flowers have opened facing the wrong way for the sun. I'm writing down which ones before I forget.",
      "The beds keep settling into rows I didn't plant. I've left my first drawing tucked under the watering can. I need something that remembers what I chose.",
      "I moved a pot and found it back in its old place. I've moved it again. I'm allowed to like the other spot, even if I sound nervous saying so.",
      "The house keeps moving my flowers to where it thinks they belong. I'm still learning to say when I want something else. Please give me time to find the words.",
      'Since the arrival, I check that the things I move stay moved. I like some parts of the garden and still need distance from others. Thank you for visiting without asking me to feel only one way.',
    ],
  },
  bamboo_attic: {
    roomName: 'Bamboo Attic',
    receipts: [
      {
        beforeReveal: "Paper lanterns. Thank you. I'll set them above the mat and watch where the light falls. A small circle of light can be enough for an evening.",
        afterReveal: "Paper lanterns for the space above the mat. I'll watch where their light falls before I choose where to sit. That small choice doesn't need to become a teaching.",
      },
      {
        beforeReveal: "The risen lanterns have taken their places by the rafters. I used to think every upward movement meant something. Perhaps I'll simply watch these for a while.",
        afterReveal: "The lanterns have risen to the rafters and stay there. I used to give every upward movement a spiritual explanation. I'll start with what I can see: their light, their height, their stillness.",
      },
      {
        beforeReveal: "The first attunement makes the lantern light rise and fall like breathing. I'll sit beside it. I needn't make my breath match in order to appreciate it.",
        afterReveal: "The first attunement gives the lanterns a breathing rhythm. I'll let my own breath find its pace. Sitting together doesn't mean we have to move as one.",
      },
      {
        beforeReveal: "The second attunement has the bamboo keeping time. It's a patient sound. I'll listen for the spaces between knocks, where I can hear my own breathing too.",
        afterReveal: "The second attunement sets a steady knocking through the bamboo. I'll listen to the pauses as carefully as the notes. My own breath has room in those pauses.",
      },
      {
        beforeReveal: "Fully attuned. The lanterns have formed a circle over the mat. I'll sit a little outside its center today. I wonder how the light looks from there.",
        afterReveal: "With the last attunement, the lanterns form a circle. I'll put my mat a little outside its center. I want to see what the light offers from a seat I chose myself.",
      },
    ],
    circumstance: [
      "There is room on the mat if you'd like to sit. We can be quiet without having to do anything with the quiet.",
      "The bamboo has been knocking when there's no breeze. I've been listening before deciding what to call the sound.",
      "I used to take a calm feeling as a sign that I understood. The room has felt calm through some very strange changes. I should allow myself a question.",
      "The rhythm grows easier to follow each evening. I've begun keeping my own count as well. I don't yet know why that feels necessary.",
      'I mistook an interpretation for certainty and spoke as though calm were proof. The house can quiet a doubt without answering it. I need to learn to hear the doubt again.',
      "It's here now. Some quiet still comforts me, and some quiet reminds me of what I failed to question. You can sit, speak, or leave. I won't make a lesson out of your choice.",
    ],
  },
  star_loft: {
    roomName: 'Star Loft',
    receipts: [
      {
        beforeReveal: "A moth lantern. Hang it by the rail, please. I'll leave it unlit to begin with. The moths may tell us whether the light was what brought them.",
        afterReveal: "A moth lantern for the rail. I'll leave it unlit at first. If the moths gather anyway, I want to have seen the difference for myself.",
      },
      {
        beforeReveal: "The lit hour. I'll mark when the lantern wakes and when it dims. An hour sounds precise until you start watching who decides its beginning.",
        afterReveal: "The lantern keeps its own lit hour now. I'll mark when it starts and stops against my own clock. A schedule should be watched before it's trusted.",
      },
      {
        beforeReveal: "The first attunement has the moths circling one way. I'll watch for the one that turns aside. A single different flight can tell me more than a hundred matching ones.",
        afterReveal: "The first attunement gathers the moths into one circle. I'll watch for one that breaks away. That flight belongs in the record too.",
      },
      {
        beforeReveal: "The second attunement seems to draw the moths earlier. I'll keep the old arrival times beside tonight's. Watching carefully means keeping what has changed.",
        afterReveal: "Since the second attunement, the moths gather earlier. I'll keep the old times beside the new ones. A record of change needs both.",
      },
      {
        beforeReveal: "Fully attuned. The lantern light bends toward a dark place between the stars. I'll mark the angle from the rail. I won't guess what lives at the other end.",
        afterReveal: "The loft's fully attuned. The lantern light bends toward a space between the stars. I can measure the angle from this rail. I can't name everything beyond it.",
      },
    ],
    circumstance: [
      "You've brought something that rewards watching. Stay by the rail if you like. We needn't fill the whole night with words.",
      "There is a patch of sky the moths keep avoiding. I've marked where it sits in relation to the roof.",
      "I've watched something alter the spaces between the stars. I can tell you where I saw it. What it means is a larger claim.",
      "The pattern repeats more exactly every night. I'm keeping track of the moments I look away as well. I want my watching to remain something I choose.",
      "I saw the signs before anyone else did. Seeing them first didn't tell me what they'd cost. I try to keep what I saw apart from what I guessed.",
      "It lives in the house now. I still watch the sky, and I close my eyes when I'm tired. The loft can keep a light for us. The watch can end at dawn, like any other job.",
    ],
  },
  belfry: {
    roomName: 'Belfry',
    receipts: [
      {
        beforeReveal: "Chalk circles. Good. I'll mark the low woodwork, where a paw can reach to check my survey. Leave that little gap; I want to see whether the chalk stays as I drew it.",
        afterReveal: "Chalk circles for the low woodwork. I'll leave one small gap in the first ring. A survey's more useful when I can tell whether someone's changed my marks.",
      },
      {
        beforeReveal: "Waking bronze. Hear that hum? Nobody struck her. I'll put a paw on the beam and see where the note carries before I say what made her begin.",
        afterReveal: "The bronze is waking and nobody struck her. I'll feel along the beam and map where the note carries. Hearing a voice doesn't tell me everything about who's speaking.",
      },
      {
        beforeReveal: "The first attunement keeps the chalk sharp through a draft. Useful, though I'll keep my rough copy too. I want yesterday's crooked circle somewhere I can still find it.",
        afterReveal: "The first attunement keeps the chalk circles sharp. I'll keep the rough copy beside my survey. The crooked original tells me something a perfect ring can't.",
      },
      {
        beforeReveal: "The second attunement has carried the bell's hum into the floor. Heel to toe, now. I'll map where she sounds strongest and leave myself a quiet board to stand on.",
        afterReveal: "The second attunement carries the hum into the floorboards. I'll map the strongest places and the quiet ones. A listener needs somewhere to set the work down.",
      },
      {
        beforeReveal: "Fully attuned. The whole tower holds her note when the wind catches it. I'll listen from the stairs as well as beside the bronze. Distance tells you things closeness can't.",
        afterReveal: "The tower's fully attuned. When the wind catches it, the bronze and the wood sing one note. I'll listen from the stairs as well. A voice can carry without filling every place I stand.",
      },
    ],
    circumstance: [
      "Thanks, friend. Put your paws over your ears if I tap too loudly. A fair survey needn't leave anyone ringing.",
      "Some of the hollows answer after I've put my tapping finger away. I'm marking the late replies separately.",
      "The bell and the beams sometimes answer with the same note. I'll tell you what I can hear. I won't pretend that gives me the whole construction drawing.",
      "One of my chalk gaps closed overnight. I'd left it there on purpose. I've made another, and this time I've kept a copy of the unfinished ring.",
      "The house keeps tidying my chalk until you can't tell a hand drew it. I want the uneven line kept beside the perfect one. Both have something to say.",
      'It lives in the house now, and the bronze still has her own voice. I keep one board where I can stand without answering it. We can listen together as long as we like, then take the stairs.',
    ],
  },
  sky_garden: {
    roomName: 'Sky Garden',
    receipts: [
      {
        beforeReveal: "A moonflower bed. Thank you, friend. I'll loosen the soil round the roots. They can have time to settle before anyone asks them for a beautiful night.",
        afterReveal: "A moonflower bed for the garden. I'll loosen the soil around the roots and let them settle. A flower needs time to become itself before it owes anyone a bloom.",
      },
      {
        beforeReveal: "Upturned blooms. They've stopped waiting for moonlight. I'll watch through an ordinary afternoon and see whether they still know when to close.",
        afterReveal: "The blooms have opened without waiting for the moon. I'll watch whether they can close again. A flower has work to do in its folded hours too.",
      },
      {
        beforeReveal: "The first attunement puts a little glow in the moonflowers before dusk. I can see the smallest buds now. I'll keep watering those, whether they shine or not.",
        afterReveal: "The first attunement lights the moonflowers before dusk. I can see the smallest buds more clearly. They'll get their share of water while they're still only buds.",
      },
      {
        beforeReveal: "The second attunement has brought a low boom across the beds. That one wasn't mine. I'll answer once, then wait. There's no need to fill every quiet space.",
        afterReveal: "The second attunement sends a low boom across the beds. I didn't make that sound. I'll answer once, and leave time afterward for the garden to be quiet.",
      },
      {
        beforeReveal: "Fully attuned. The flowers are holding themselves wide open. I'll keep a little shade for them. Even a very fine bloom ought to be allowed to finish its day.",
        afterReveal: "The garden's fully attuned. The flowers hold themselves wide open. I'll keep some shade ready. A bloom should be allowed its closing hour, however beautiful it's become.",
      },
    ],
    circumstance: [
      "There is room here for slow-growing things. We can sit a while before I put the watering can away.",
      "A few buds have stayed the same size longer than I expected. I've marked them with little sticks so I can be sure.",
      "The garden has been keeping its prettiest flowers open. I've started watching the young shoots as carefully. I want to see them grow into something new.",
      "A seedling that never changes may look well cared for. I've grown enough plants to know it still needs a next season.",
      'The presence would keep a loved thing at its loveliest. I can see the tenderness in that. I can also see a seedling kept from becoming a tree.',
      "It's here, and I still save seed for a season I haven't seen. The warmth would rather this garden stayed exactly as it is. I keep a few seeds dry anyway. Next year needs somewhere to start.",
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
