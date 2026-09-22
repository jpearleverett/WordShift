import { AnimalType, DialoguePhase } from '../../types/homeWorld';

// =============================================================================
// TRIGGER WORD REACTIONS
// =============================================================================

/**
 * Trigger word reactions - context-aware responses when animals sense words
 * the player spelled that resonate with their domain.
 * Phase 1: Curious, noticing
 * Phase 2: Unsettled, the word affected them
 * Phase 3: The word has power, they felt it
 * Phase 4: The word is part of the incantation, they are grateful
 */
const TRIGGER_WORD_REACTIONS: Record<AnimalType, Record<number, Record<string, string>>> = {
  fox: {
    1: {
      FLAME: "You made FLAME and my fire leaned right over. Shut the window a moment? I want to be sure it's only a draft.",
      FIRE: "FIRE. A word like that deserves a log. All I have are ordinary wooden ones, but on it goes.",
      EMBER: "EMBER. That's my name! I'll answer to it anywhere, not only when you spell it out.",
      BURN: "BURN. That's a fair review of my most recent toast.",
      WARM: "You said WARM and the den warmed a little. Move your chair back from the hearth if it's too much.",
      _default: "The fire stirred when your word arrived. I noticed it. Noticing isn't the same as understanding it, mind you.",
    },
    2: {
      FLAME: "The fire reached out when you made FLAME, the way it did last time. I moved the poker out of its way.",
      FIRE: "You made FIRE, and the hearth flared before I could say the word aloud. I think it's learning your voice.",
      EMBER: "EMBER. I felt that one in my chest. I'd like to know why before I decide it's a compliment.",
      BURN: "BURN left a soot mark on the hearthstone. A damp cloth won't shift this one.",
      WARM: "The room warmed up and I haven't added a log. Lovely, until I try to work out where it came from.",
      _default: "I can read something in the flames when your words arrive. I've been putting off telling you that.",
    },
    3: {
      FLAME: "FLAME hung over the grate in sparks. That much I could read easily. I wish the rest of what the fire says were as clear.",
      FIRE: "The fire reached out past the hearthstone when you made FIRE. I've put the screen up.",
      EMBER: "You spelled EMBER, and the fire said my name back. It sounds different in that voice than in yours.",
      BURN: "BURN left a mark on the hearthstone. I'm leaving it uncovered. We're still trying to understand this fire.",
      WARM: "The warmth has spread to the cold wall where I keep the food. I've moved the food. I don't know what to do about the wall.",
      _default: "The fire is hungry. I keep finding gentler words for that, and gentle words won't help you see what I see.",
    },
    4: {
      FLAME: "FLAME. Every flame in the grate turned to face you at once, like a room full of guests. My fire has never had manners before. I did not like it.",
      FIRE: "FIRE. I know how to keep a fire. I am less certain about what this one is keeping.",
      EMBER: "EMBER. The fire says my name back now, in a voice warmer than mine. I only answer to yours.",
      BURN: "BURN. I held a paw over the grate to test it. The fire drew its heat back, the way a cat pulls in its claws. I do not understand a fire that will not burn.",
      WARM: "WARM. The den has been exactly this warm for three days. I opened the window and nothing changed. I miss being a little cold and grumbling about it.",
      _default: "Your word reached the fire and the fire took it. It has still not answered a single question of mine.",
    },
  },
  owl: {
    1: {
      BOOK: "When you formed BOOK, a page in the old book turned by itself. I've set a paperweight on the next one, just to see.",
      READ: "READ. A sentence in the old book looked different a moment ago. I should have copied it out before I stopped to admire the handwriting.",
      KNOW: "KNOW. A promising word. So far I have a great many more questions than answers.",
      WISE: "WISE. I'll try not to take that personally. I may not try very hard.",
      WORD: "WORD. Now that is a subject I can talk about. Stop me when you need to. I won't stop myself.",
      _default: "The whole study shifted a little when you finished that word. I wrote down the time. I haven't written down a conclusion yet.",
    },
    2: {
      BOOK: "BOOK turned a page in the old book again, under the paperweight I set on it. So it wasn't the wind. One innocent explanation gone.",
      READ: "After READ I copied the changing sentence out of the old book. The copy changed too, in my own handwriting.",
      KNOW: "KNOW is in the old book's index now. It wasn't before. The entry sends me to a blank page.",
      WISE: "A note in the old book's margin called me WISE. Flattery is not peer review.",
      WORD: "Your WORD is written under an older sentence in the book. Different ink, same hand. The pen pressed just as hard, in just the same places.",
      _default: "The book I never ordered reacts when you finish a word. The ordinary books don't. I'm keeping the ordinary ones close by, for comparison.",
    },
    3: {
      BOOK: "BOOK opened the old book to its diagram again, the one it keeps showing me. I'd rather it answered the question I actually asked.",
      READ: "READ. I can read every word of the old book. Understanding it turns out to be a separate skill, and I'm still learning that one.",
      KNOW: "KNOW. The old book uses that word in places where I'd only write 'believe'.",
      WISE: "The old book's margin calls me WISE again. That used to work on me. It doesn't anymore.",
      WORD: "WORD. The old book's diagram shows a use for the words you bring. Describing a use is not the same as being given permission.",
      _default: "There's a missing step in my reading of the old book. I've been hiding that gap inside long sentences. I mean to stop.",
    },
    4: {
      BOOK: "BOOK. I keep my plain notebook open beside the old book now. The two accounts do not agree.",
      READ: "READ. I wrote in the old book's margin that reading a thing is not obeying it. This morning my note had been neatly erased. I have written it again, in ink.",
      KNOW: "KNOW. The old book has started finishing my sentences, with far more certainty than I ever had. So I have started ending mine with question marks. It does not know what to do with those.",
      WISE: "WISE. I would settle for being willing to correct myself. That is harder, and worth more.",
      WORD: "WORD. Yours goes in the record, along with how and when you formed it. Never the word alone.",
      _default: "The old book wrote something new when you finished that word. It reads like a correction. I will compare it with the original before I agree.",
    },
  },
  pangolin: {
    1: {
      COOK: "COOK. That's an invitation, and I accept it every single day.",
      MEAL: "MEAL. I have one nearly ready. Three other ideas were too slow and missed lunch entirely.",
      FOOD: "FOOD. Wash your hands and I'll find you something to eat.",
      SPICE: "SPICE. A little first. We can always add more. Taking pepper back out is a lifetime's work.",
      ROLL: "ROLL. Do you mean the pastry or the pangolin? I can demonstrate both.",
      _default: "The pot stirred itself when your word arrived. I hadn't touched the spoon.",
    },
    2: {
      COOK: "COOK. The stove warmed itself when your word arrived. I checked the fuel before I added any.",
      MEAL: "MEAL. The empty bowl filled a little by itself. I've put it aside to keep an eye on it.",
      FOOD: "FOOD. The word appeared on a page I hadn't opened. The ingredients under it are in my handwriting.",
      SPICE: "SPICE. There is one in the pot tonight that isn't anywhere on my rack.",
      ROLL: "ROLL. The dough folded itself. I flattened it back out to see whether it would try again.",
      _default: "The recipe changes when your words arrive. I put a flour mark beside each line so I can tell.",
    },
    3: {
      COOK: "COOK. I've been asking who this recipe expects me to feed. Nobody has a useful answer.",
      MEAL: "MEAL. There are portions on this table for someone who hasn't introduced themselves.",
      FOOD: "FOOD. I won't serve any of it until I know what went into it.",
      SPICE: "The SPICE is gone from every jar. The pot tastes of it anyway.",
      ROLL: "ROLL. I curled up before answering. I'm a cook with a question now, and I'd like a moment to finish it.",
      _default: "Your word went into the recipe. You never signed your name to anything. Remember that.",
    },
    4: {
      COOK: "COOK. I am still the one who chooses what leaves this kitchen.",
      MEAL: "MEAL. Words feed something in this house. That does not make us the meal.",
      FOOD: "FOOD. The bowl that fills itself filled again as you said it. The same stew as yesterday, down to the last carrot. Nobody in this house wants yesterday's stew forever.",
      SPICE: "SPICE. Taste it before you call it an improvement. That rule works outside the kitchen too.",
      ROLL: "ROLL. I curled up. Scales outside, cook inside. The cook may need a moment.",
      _default: "The pot answered when your word arrived. I am keeping the lid within reach.",
    },
  },
  axolotl: {
    1: {
      WATER: "WATER! Finally, a subject I can introduce properly. I live in it.",
      SWIM: "SWIM! I'd show you my best turn, but GLOW is sitting exactly where I need to turn.",
      FLOAT: "FLOAT! Some days that's my whole afternoon.",
      DEEP: "DEEP! I can show you the shallow end first, if you like.",
      WAVE: "WAVE! Hello back! Oh. You meant the water kind.",
      _default: "A bubble rose the moment your word landed. It went up by a very odd route.",
    },
    2: {
      WATER: "WATER. There's a wet line on the glass now, higher than the water usually reaches.",
      SWIM: "SWIM changed the current. I put a pebble where the current used to turn.",
      FLOAT: "FLOAT. The leaf sank first, then came back up. It's never done that before.",
      DEEP: "DEEP. The bottom looked farther away today. I checked it against the rock I use as a marker.",
      WAVE: "WAVE. One ripple crossed my tank and touched both sides at the same moment.",
      _default: "I saw your letters inside a bubble. I can't tell you how they got in there.",
    },
    3: {
      WATER: "WATER. There's more water past the bottom of my tank. I know how that sounds.",
      SWIM: "SWIM. I swam my usual route and finished beside a different stone.",
      FLOAT: "FLOAT. Staying in one place takes more work than it used to.",
      DEEP: "DEEP. I want to look down there. I also want someone nearby while I do.",
      WAVE: "WAVE. Something under the current answered me. I waited a long moment before I waved back.",
      _default: "Your word went down through the deep part. I didn't know that was where it would go.",
    },
    4: {
      WATER: "WATER. My tank tops itself up now. I scooped a cupful out to see, and when I turned round the line was back where it was. I like water. I also like spilling it.",
      SWIM: "SWIM. I am choosing a different turn this time.",
      FLOAT: "FLOAT. I can rest without agreeing to stay still forever.",
      DEEP: "DEEP. I do not know everything that is underneath me. I can admit that now.",
      WAVE: "WAVE. I waved at the deep part, and it waved back before I had finished, as if it already knew how I wave. So I am inventing a new wave.",
      _default: "The water heard your word. I would like to hear what you meant by it too.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "HEAR. Yes, quite a lot. Would you like the short report?",
      SOUND: "SOUND. The kettle is the loudest thing in camp right now. It usually wins.",
      ECHO: "ECHO. That one came back off the wall. I can show you the angle it took.",
      QUIET: "QUIET. I know a good place for that, just behind the tent canvas.",
      LISTEN: "LISTEN. Stay a moment. The sand clicks as it cools, and I'd like you to hear it.",
      _default: "Your word made my chime twitch. There was hardly any wind to do it.",
    },
    2: {
      HEAR: "HEAR came back to me through my listening bowl. I never said it into the bowl.",
      SOUND: "SOUND. The ordinary echo stops. The low note underneath it keeps going.",
      ECHO: "ECHO. I moved my bowl this morning. The answer still came from where it used to sit.",
      QUIET: "QUIET. The birds stopped all at once. I never heard what stopped them.",
      LISTEN: "LISTEN. Turn this way with me. Tell me the moment you lose the note.",
      _default: "I can hear it in the ground and in the air. I can't separate the two yet.",
    },
    3: {
      HEAR: "HEAR. I do hear it. That doesn't mean I understand what it's warning us about.",
      SOUND: "SOUND. The small noises vanished under the low note. I went out to check that the creatures making them were still there.",
      ECHO: "ECHO. A second voice was already speaking before I finished my first word.",
      QUIET: "QUIET. I wanted it so badly that I nearly forgot to ask which sounds went missing to make it.",
      LISTEN: "LISTEN. You get the whole report first. I won't hand you only the comfortable parts of it.",
      _default: "Your word reached somewhere my chart has no name for. I've marked a gap there.",
    },
    4: {
      HEAR: "HEAR. I listen for the voice beside me, not only the one underneath.",
      SOUND: "SOUND. Your word went down, and the low note sang it back to me, one pitch lower and smoothed out. It took the crack out of your voice. I liked the crack.",
      ECHO: "ECHO. I can repeat your word without pretending it is mine.",
      QUIET: "QUIET. The whole valley hushed when you said it. The crickets, the wind, the sand cooling. I used to ask for quiet. I have never been so frightened of getting it.",
      LISTEN: "LISTEN. Put your ear here, by the bowl. Under the low note the house is still arguing: pots, doors, somebody laughing at the wrong moment. I check every night that it still is.",
      _default: "Your word made the sand shake. That is the observation. The explanation is a separate conversation.",
    },
  },
  capybara: {
    1: {
      CALM: "CALM. That's the goal in this office. Nobody is required to actually manage it.",
      CHILL: "CHILL. Yes? Sorry, that's my name. Did you need something?",
      STILL: "STILL. The printer, for example. It hasn't moved or hummed since Tuesday.",
      PEACE: "PEACE. Nothing on the schedule today. That's the closest I get.",
      REST: "REST. The good chair is free. The squeak comes with it.",
      _default: "The page on my desk moved when you finished your word. The window was shut. Noted.",
    },
    2: {
      CALM: "CALM was already written in the status box on my form. I hadn't assessed anyone yet.",
      CHILL: "CHILL. My name was on a page this morning. I hadn't signed anything.",
      STILL: "STILL. The clock stopped, then started again. I'm keeping that missing minute on record.",
      PEACE: "PEACE. There's a box for it on the form. The box was ticked before I got there.",
      REST: "REST. An appointment vanished from my calendar. I hadn't canceled it.",
      _default: "Your word was already written in the ledger before I picked it up.",
    },
    3: {
      CALM: "CALM. I wrote concerned in my report. The copy that came back says calm.",
      CHILL: "CHILL. Someone signed my name on a page. A signature isn't the same as my agreement.",
      STILL: "STILL. The minute the clocks lost is now listed as productive. I didn't write that.",
      PEACE: "PEACE. People objected at that meeting. The written record leaves the objections out.",
      REST: "REST. I closed the ledger and left it shut. The work can wait.",
      _default: "The office prefers a tidier version of what happened. I'm keeping my own notes.",
    },
    4: {
      CALM: "CALM. That is a feeling each person reports for themselves. I will not enter it for you.",
      CHILL: "CHILL. That is my name, not an instruction.",
      STILL: "STILL. Every clock in the office now agrees to the second. They never agreed before. I have set mine four minutes fast, as a protest.",
      PEACE: "PEACE. I will leave a space on the form for a different answer.",
      REST: "REST. My chair stopped squeaking overnight. I did not oil it. Somebody fixed it while I slept, and I would like my squeak back.",
      _default: "Your word is entered. What it means is still disputed, and I have marked it so.",
    },
  },
  sloth: {
    1: {
      SLOW: "SLOW. That's a good speed for carrying tea up here without spilling it.",
      WAIT: "WAIT. I was going to anyway, but it's kind of you to suggest it.",
      TIME: "TIME. There's plenty for a visit, as long as we don't stop to count it.",
      HANG: "HANG. I'm overqualified. I have hung from this branch for years.",
      TREE: "TREE. This one has put up with me for years, very graciously.",
      _default: "The leaves moved when that word arrived. I was already watching them.",
    },
    2: {
      SLOW: "SLOW. I bent a vine aside at dawn. It has taken all day to stand back up.",
      WAIT: "WAIT. That word is at home in this hammock. So am I.",
      TIME: "TIME. This evening feels like one I sat through years ago.",
      HANG: "HANG. I tied the hammock rope this morning. Something held the loose end for me.",
      TREE: "TREE. There's a low note down in the trunk. I've heard it before.",
      _default: "Something is coming. I have hoped for it a long time, so don't trust my guesses too far.",
    },
    3: {
      SLOW: "SLOW. I'm slow. That shouldn't become an excuse to put off your own answer.",
      WAIT: "WAIT. I wanted the waiting to end. I never asked enough about how it would end.",
      TIME: "TIME. I have wanted this for a very long time. Wanting it that long doesn't make me right.",
      HANG: "HANG. I came down out of the hammock to look at the branch properly.",
      TREE: "TREE. The vines are tying themselves together. I loosened one of them.",
      _default: "I knew something was coming. I can't promise it will mean the same thing for everyone.",
    },
    4: {
      SLOW: "SLOW. I let that word sit in the hammock with me. For a moment I wanted everything to stay exactly this slow forever. That wanting is the part of me I trust least.",
      WAIT: "WAIT. I have been good at that my whole life. Now something is waiting on us, and I do not enjoy it much from this side.",
      TIME: "TIME. I would like another evening with you. I am not asking for every evening.",
      HANG: "HANG. I have hung here a long time. It is a position I can choose to leave.",
      TREE: "TREE. I want this one to keep growing. Growing means it has to change.",
      _default: "The three Geralds woke at your word and settled again, all facing the same way. They have never once agreed on a direction. I turned the hammock so they would argue.",
    },
  },
  wombat: {
    1: {
      DIG: "DIG. Now there's a word I can actually advise on.",
      EARTH: "EARTH. The ground here is good. Still check it before you put weight on it.",
      DEEP: "DEEP. That's a measurement, not a recommendation.",
      DARK: "DARK. Bring the lamp. There's no virtue in walking into a beam you couldn't see.",
      ROCK: "ROCK. Put it down first, then decide where it belongs. No sense holding the weight while you think.",
      _default: "That word of yours rattled the tool rack. I checked the wall behind it.",
    },
    2: {
      DIG: "DIG. A groove has opened under my chalk mark. I didn't cut it, and I'd know my own cut.",
      EARTH: "EARTH. The soil has gone warm along one joint, and only that one.",
      DEEP: "DEEP. I put my measuring rod down and it went farther than the drawing allows.",
      DARK: "DARK. There's a line on the stone that only the lamp shows. Daylight misses it.",
      ROCK: "ROCK. There are marks under the original face of that stone. I didn't put them there.",
      _default: "The old foundation answered that one. Your new rooms sit above something I haven't finished mapping.",
    },
    3: {
      DIG: "DIG. I followed that groove along until it ran straight into my own work.",
      EARTH: "EARTH. The pressure comes up from below, and my brace sends it inward, toward the middle of the house.",
      DEEP: "DEEP. There's a second stone face behind the support. A brace holds things up. That one may be holding something shut.",
      DARK: "DARK. Keep the lamp right here. I want all of us looking at the same joint.",
      ROCK: "ROCK. Someone fitted that stone to keep something shut. I took it for ordinary support.",
      _default: "That word shifted the load. I've written down where it moved and how far.",
    },
    4: {
      DIG: "DIG. I will not cut anything until we have decided what stays whole.",
      EARTH: "EARTH. The soil along the old seal has gone smooth as a plate. I scratched a line in it with my claw, for the record. By morning it will be smoothed over. I will scratch another.",
      DEEP: "DEEP. Deep does not mean safe. Those are two different measurements.",
      DARK: "DARK. The lamp is still a good idea. It was always a good idea.",
      ROCK: "ROCK. That is a fine stone. If we need a gap there, a fine stone still has to move.",
      _default: "The wall answered that one. We still decide what gets built against it.",
    },
  },
  rabbit: {
    1: {
      RUN: "RUN. I can run, certainly. I'd rather finish the watering first.",
      FEAR: "FEAR. I know that one well. What made it come up for you?",
      HIDE: "HIDE. The mint hides me beautifully, right up until it makes me sneeze.",
      JUMP: "JUMP. I did, at a noise behind me. It was my own watering can falling over.",
      FAST: "FAST. Very useful when the rain starts and the washing is still out.",
      _default: "The leaves shook when that word arrived. I wrote down which ones shook.",
    },
    2: {
      RUN: "RUN. The path looked longer today, so I measured it from the gate.",
      FEAR: "FEAR. This time I found a real cause before blaming my nerves.",
      HIDE: "HIDE. Something moved behind the fence. I asked Warren to look as well.",
      JUMP: "JUMP. My own shadow moved before I did.",
      FAST: "FAST. My seedlings opened in the time between two ticks of my timer.",
      _default: "That word turned up on my page, right where I'd written a date. I kept the old scrap.",
    },
    3: {
      RUN: "RUN. I walked the whole route past the gate, not just checked the latch.",
      FEAR: "FEAR. I calmed down and measured again. The numbers were still wrong.",
      HIDE: "HIDE. I moved my tin of spare seeds somewhere I can reach it quickly.",
      JUMP: "JUMP. I startled somebody by being startled myself. Then we both apologized for it.",
      FAST: "FAST. I can be. First I want time enough to decide where I'm going.",
      _default: "My worrying turned up something useful. I wish the others had looked before telling me not to worry.",
    },
    4: {
      RUN: "RUN. I want to keep that as a possibility, even on the days I sit still.",
      FEAR: "FEAR. Mine to understand. It is not a fault for somebody else to repair.",
      HIDE: "HIDE. I would like a private place. That is not the same as wanting to vanish.",
      JUMP: "JUMP. I still jump at things. I still spill the tea when I do.",
      FAST: "FAST. My seedlings came up in an hour, every one the same height, in straighter rows than I planted. I pulled one up to make a gap. I am keeping the gap.",
      _default: "I wrote your word in the facts column. Then every flower in the bed turned toward the house as it landed. That went in the facts column too.",
    },
  },
  red_panda: {
    1: {
      VOID: "VOID. An empty cup isn't a sad thing. It's where the tea goes.",
      DARK: "DARK. There's a lamp up here, if you'd rather sit in the light.",
      SHADOW: "SHADOW. Mine reaches the mat before I do. I have quite a lot of tail.",
      END: "END. We can stop talking whenever you like, and still be friends.",
      GATE: "GATE. A gate is a fine place to stand and say hello to someone.",
      _default: "The incense smoke leaned toward your word. I told myself it was a draft. I might even be right.",
    },
    2: {
      VOID: "VOID. The smoke curls around a gap in the middle of the room. I hadn't noticed the gap until now.",
      DARK: "DARK. I see it better once I look away from the lamp and let my eyes adjust.",
      SHADOW: "SHADOW. One in here falls toward the lamp instead of away from it.",
      END: "END. I decided it meant rest. That may only be what I wanted it to mean.",
      GATE: "GATE. The shape in the smoke looks a little like one. A resemblance isn't proof, but it's somewhere to start.",
      _default: "The warmth up here reassures me. I keep reminding myself that's a feeling I have, not a fact I checked.",
    },
    3: {
      VOID: "VOID. I called that space empty, and then I filled it with everything I hoped for.",
      DARK: "DARK. I told Thyme it was gentle. I never asked her what she'd actually seen.",
      SHADOW: "SHADOW. The shape the bamboo makes doesn't quite match the explanation I gave for it.",
      END: "END. Something here is ending. I kept calling it a rest. Those aren't the same thing.",
      GATE: "GATE. If we're being invited, the invitation should say which side we're allowed to stand on.",
      _default: "I told the others what all this means, and I sounded far too sure. They should hear the part I'm not sure about.",
    },
    4: {
      VOID: "VOID. Not every space has to be filled. We can leave one alone.",
      DARK: "DARK. I do not know everything that is in it.",
      SHADOW: "SHADOW. I will not paint a kind face on it just to keep us calm.",
      END: "END. I used to tell everyone an ending was only a long rest. It was a lovely thing to say. It was not true.",
      GATE: "GATE. A boundary has two sides, and it should matter on both of them.",
      _default: "Your word went up past my roof, and the smoke bent to follow it. I used to call that a blessing. Now I write down which way it bent, and leave the blessing out.",
    },
  },
  tarsier: {
    1: {
      NIGHT: "NIGHT. My working hours. Come up and see the moths before supper. Some of them are supper.",
      MOON: "MOON. The best lamp on this porch tonight, and it costs me no oil at all.",
      STAR: "STAR. I have a favorite. Come up after dusk and I'll point it out for you.",
      WATCH: "WATCH. You're welcome to join me. You don't have to stay for the whole night.",
      BLINK: "BLINK. People keep recommending it. None of them have asked my eyes for an opinion.",
      _default: "Your word went down glimmering beside the ridge. I've marked the spot.",
    },
    2: {
      NIGHT: "NIGHT. There's a darker patch above the ridge. The moon changes, and it stays.",
      MOON: "MOON. Its light crosses the valley, then stops at an edge above the ridge.",
      STAR: "STAR. A small one is gone from the sky. Its chalk mark is gone from my chart too.",
      WATCH: "WATCH. I looked away for a moment. Coming back, I checked the chalk instead of trusting my memory.",
      BLINK: "BLINK. I turned my whole head away instead. When I turned back, the patch was still there.",
      _default: "I can see the edge of that patch. I can't tell you one thing about what's behind it.",
    },
    3: {
      NIGHT: "NIGHT. Something up there holds my attention longer than I intend.",
      MOON: "MOON. It moves the way it always has. I measure the strange movements against it.",
      STAR: "STAR. I named one of them once. That name is missing from my new chart. I still remember it.",
      WATCH: "WATCH. I want to see how this ends. That's my own wish, though. I shouldn't make it your duty.",
      BLINK: "BLINK. Looking away has started to take effort. I'm practicing it.",
      _default: "My family's old log describes this shape. It never says why we were meant to welcome it.",
    },
    4: {
      NIGHT: "NIGHT. The seam over the ridge brightened when you said it, and every moth on my rail turned to face it. I turned them back round. Moths are not good at being told.",
      MOON: "MOON. Plain, ordinary light. I still need it to measure the rest by.",
      STAR: "STAR. A name is worth keeping, even after the star has left the chart.",
      WATCH: "WATCH. I may choose to keep it. I may also put it down for an hour.",
      BLINK: "BLINK. Turn the head, rest the eyes, look at something else. There is more than one way to stop looking.",
      _default: "Your word went down and reached the edge. I am watching the creatures on this side of it too.",
    },
  },
  aye_aye: {
    1: {
      KNOCK: "KNOCK. Tok, tok. Hello back.",
      BELL: "BELL. My bell hasn't rung yet. She takes her time, and I'm a patient colleague.",
      HOLLOW: "HOLLOW. Let me show you how that beam answers a knock.",
      TAP: "TAP. My long finger has been waiting for an invitation like that.",
      TOLL: "TOLL. That's a fine word to say quietly near a sleeping bell.",
      _default: "Your word sounded in the wood. It came up the beams like a footstep, but not one of ours.",
    },
    2: {
      KNOCK: "KNOCK. I knocked one beam, and the answer came from a beam I hadn't touched.",
      BELL: "BELL. The bronze warmed under my hand. I hadn't done anything to warm it.",
      HOLLOW: "HOLLOW. I measured that hollow. The sound keeps going past where it should stop.",
      TAP: "TAP. I stopped tapping halfway. Something else put in the next beat.",
      TOLL: "TOLL. The rope moved on its own. The bell above it stayed perfectly still.",
      _default: "The beams answer one after another. I can follow the order. I can't tell you what it means.",
    },
    3: {
      KNOCK: "KNOCK. I knocked on a lot of shut doors once. I remember wanting someone to answer me too.",
      BELL: "BELL. I want to hear her ring. Wanting isn't a good enough reason to pull the rope.",
      HOLLOW: "HOLLOW. I've been the thing in the walls that people feared. So I won't treat every hollow as an enemy.",
      TAP: "TAP. I stopped tapping, and the reply waited for me. I'd like to know how long it will wait.",
      TOLL: "TOLL. I've loosened the bell rope. I have not pulled it.",
      _default: "A strange guest deserves a fair hearing. A fair hearing includes the hard questions.",
    },
    4: {
      KNOCK: "KNOCK. We should knock, and then wait for an answer before we go in.",
      BELL: "BELL. Her voice is saved for the moment we actually meet our guest.",
      HOLLOW: "HOLLOW. I knocked the old beam and it answered full. The hollow I mapped there last month has been filled in, very neatly. Nobody asked me. I liked that hollow.",
      TAP: "TAP. I can stop after this one knock. That is worth knowing.",
      TOLL: "TOLL. A word you formed is not an instruction to my hand.",
      _default: "The wood answered you. I am listening for whether there is still room to disagree.",
    },
  },
  kakapo: {
    1: {
      GREEN: "GREEN. That's a fine first word for the slate where I keep my garden notes.",
      SEED: "SEED. Light enough to carry up the stairs. One day it will be taller than this roof.",
      NEST: "NEST. Mine is empty, and I still line it every week.",
      BLOOM: "BLOOM. Come and see the small flower by my bucket.",
      BOOM: "BOOM. My voice can go much lower and louder than that. I'm saving it.",
      _default: "Your word stirred one leaf. It might have been the breeze. I left a marker by it.",
    },
    2: {
      GREEN: "GREEN. The warm patch under my far bed spread a little farther today.",
      SEED: "SEED. That one sprouted early. Decades to make a tree, only days to make a shoot.",
      NEST: "NEST. The lining is pressed down. Nobody has been sitting in it.",
      BLOOM: "BLOOM. There's a flower in the bed where I planted nothing.",
      BOOM: "BOOM. I hummed over my calling bowl, then stopped. A low note answered.",
      _default: "Something low sounds back at me up here. I want it to be a reply, not an echo. That's why I'm checking twice.",
    },
    3: {
      GREEN: "GREEN. Every new leaf faces my calling bowl. I turned one pot away to see if it turns back.",
      SEED: "SEED. I kept some back in the tin. One season doesn't need every seed I own.",
      NEST: "NEST. I want a chick in mine. An empty nest isn't a promise of one.",
      BLOOM: "BLOOM. The same flower has come up again, down to the same nick in one petal.",
      BOOM: "BOOM. Humming isn't my real call. I'm still saving the breath for that.",
      _default: "Something answers from under the roots. I can't tell yet whether it's answering me.",
    },
    4: {
      GREEN: "GREEN. I would like this garden to keep growing in ways I did not plan.",
      SEED: "SEED. There is still room here for something we have not planted.",
      NEST: "NEST. I line mine and keep it ready. Whoever comes to it owes me nothing.",
      BLOOM: "BLOOM. The flower I never planted may keep the nick in its petal. I prefer it that way.",
      BOOM: "BOOM. My call takes one great breath, and I am saving it for when we meet. The calling bowl hums whenever you say that word. It is impatient. I am not.",
      _default: "I have wanted an answer for ninety years. That does not mean I will know it when it arrives.",
    },
  },
};

/**
 * Get a trigger word reaction for an animal when the player has spelled a word
 * that resonates with that animal's domain. Returns null if no reaction.
 */
export function getTriggerWordReaction(
  animalType: AnimalType,
  triggerWord: string,
  phase: DialoguePhase
): string | null {
  // Only trigger at phase 1+
  if (phase < 1) return null;

  const reactions = TRIGGER_WORD_REACTIONS[animalType];
  if (!reactions) return null;

  // Check if this word is in the animal's trigger list
  const phaseReactions = reactions[phase];
  if (!phaseReactions) return null;

  // Return specific reaction or default
  return phaseReactions[triggerWord] || phaseReactions['_default'] || null;
}

// ============================================================================
// WORD THRESHOLD DIALOGUES — Animals reference word count milestones
// ============================================================================

/**
 * Threshold dialogue — animals reference specific word count milestones.
 * Creates tension by making the Words Offered counter feel like a countdown.
 */
export const WORD_THRESHOLD_DIALOGUES: { threshold: number; phase: number; lines: Record<string, string> }[] = [
  {
    threshold: 100,
    phase: 1,
    lines: {
      fox: "A hundred words! That's a lot of shapes to have passed through your hands. I've made tea to mark the occasion.",
      owl: "One hundred words in the record. A round number pleases a cataloguer. It doesn't tell you what's in the catalogue.",
      pangolin: "A hundred words. I once counted a hundred grains of rice while waiting for bread. Your hundred sounds like the better afternoon.",
      fennec_fox: "One hundred words in the count. I've put a mark in my own chart for that. I'll keep listening for what makes each new word sound different.",
      tarsier: "A hundred words in the record. I wasn't watching every single one. Tell me your favorite and I'll give it a page of its own.",
      aye_aye: "The record says a hundred words. I can hear the recent ones in the beams. For the earlier ones I will need your account.",
      kakapo: "A hundred words. A garden grows out of small things, one at a time. Somebody still has to look at every leaf.",
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: "Two hundred and fifty words. I do like knowing how much you've made. But a number isn't the same as asking how you are. So how are you?",
      owl: "Two hundred and fifty entries. I'm comparing what actually happened with what the old book predicted. They don't always match.",
      pangolin: "Two hundred and fifty words now. That's a recipe too long to check line by line. I'm checking it line by line anyway.",
      capybara: "Two hundred and fifty entries. I've checked the count twice. What they mean is still an open question.",
      tarsier: "Two hundred and fifty words. My family's old log keeps a count too. I'm writing yours beside it so I can see where the two differ.",
      aye_aye: "Two hundred and fifty words. The beams still carry some of them. I won't pretend I was here for the beginning of it.",
      kakapo: "Two hundred and fifty words. This garden was growing long before I started tending it. Your words have a history too. I'd like to hear where you began.",
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: "Five hundred words. I used to cheer at every new number. Now I want to know which of them you still think about.",
      owl: "Five hundred words. The old book uses that number as a heading. I use it as a good moment to check every claim written underneath.",
      red_panda: "Five hundred words in the record. Five hundred separate occasions, each with its own reason. No single lesson could hold them all.",
      capybara: "Five hundred entries. The ledger still has room for a correction, an objection, or an answer nobody has given yet.",
      tarsier: "Five hundred words. I used to think every mark in a ledger meant the same thing to whoever wrote it. Now I ask.",
      aye_aye: "Five hundred words. I can hear a pattern in the beams now. I listen hardest for the knocks that break it.",
      kakapo: "Five hundred words. I pick fruit one at a time, even off a heavy branch. Your words got the same care. Which one do you still remember?",
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: "Seven hundred and fifty words. Sit by the fire tonight without adding a single one. The company is what I want.",
      owl: "Seven hundred and fifty words. An impressive record. I am keeping the old book's conclusions about it open to revision all the same.",
      wombat: "Seven hundred and fifty words recorded. They changed the load on this house. I keep measuring. Nobody calls the work done until the numbers hold.",
      rabbit: "Seven hundred and fifty words. I can write a number down without deciding it is a distance I have to travel.",
      tarsier: "Seven hundred and fifty words. There is room in the ledger for another page. And my watch can hold something besides counting.",
      aye_aye: "Seven hundred and fifty. The bronze holds a note under all those words. A big number is no reason to ring her.",
      kakapo: "Seven hundred and fifty words. The small pot by the gate is still empty. I am keeping it for something nobody planned.",
    },
  },
];

/**
 * Get a threshold dialogue line if the player just crossed a word count milestone.
 * Returns null if no threshold was crossed or animal doesn't have a line.
 */
export function getWordThresholdDialogue(
  animalType: string,
  totalWordsFormed: number,
  previousWordsFormed: number,
  currentPhase: number
): string | null {
  for (const entry of WORD_THRESHOLD_DIALOGUES) {
    if (totalWordsFormed >= entry.threshold &&
        previousWordsFormed < entry.threshold &&
        currentPhase >= entry.phase) {
      return entry.lines[animalType] || null;
    }
  }
  return null;
}

// =============================================================================
// SACRIFICE REACTIONS
// =============================================================================

/**
 * Animal reactions to the player making sacrifices (Phase 4+ only).
 * Each animal has lines for first sacrifice and subsequent sacrifices,
 * filtered through their personality and cult role.
 */
const SACRIFICE_REACTIONS: Record<string, { first: string; subsequent: string[] }> = {
  fox: {
    first: "The fire brightened when you set the amber down. That much I saw. It does not tell me why you gave it, and I will not guess.",
    subsequent: [
      "Thank you. Keep the next handful for something you want to build. The fire will manage.",
      "When your amber went down, the fire made the sound it makes when I say your name. I did not teach it that.",
      "The hearth stayed warm all night after your offering, even with the grate swept out. I slept badly. A fire should need a little help.",
    ],
  },
  pangolin: {
    first: "When you gave that, warmth came up through the kitchen floor. I checked the stove first. Then I looked downstairs.",
    subsequent: [
      "Your portion at supper is not measured against what you give away.",
      "Your amber went down, and every pot in the kitchen came to the boil at once. I did not ask for supper early. I turned them all off, one by one.",
      "You gave amber, and my pot stirred itself with nobody near it. It wants more. I am not reaching for the rest of your amber, and neither is the pot.",
    ],
  },
  owl: {
    first: "I have recorded the amber you offered. The amount tells me what you gave. It does not tell me what it meant.",
    subsequent: [
      "Giving amber is evidence that you gave amber. It does not prove you agree with whatever the book says the gift means.",
      "A new page has appeared in the old book, describing your gift. If you care to tell me your reasons, I will check whether the page kept those too.",
      "The old book has a new line of praise for you this morning, in very flattering ink. I have filed it under flattery, beside the other entries in that hand.",
    ],
  },
  axolotl: {
    first: "The current warmed when you gave the amber. I put my hands in the warm part, then came over to tell you.",
    subsequent: [
      "You can still come and visit the fish without bringing anything.",
      "The water went warm and still after your amber, like a bath nobody gets out of. GLOW would not swim. I splashed until he did.",
      "Your offering sent a small glimmer through the water. I watched it pass instead of asking for another one.",
    ],
  },
  fennec_fox: {
    first: "Your amber made a small clear sound when it landed. I waited until that sound had finished before I wrote it down.",
    subsequent: [
      "Your amber made a sound going down, and something below answered it, pleased. I went and listened to the crickets for a while. They were not pleased about anything. It helped.",
      "The low note changed when your amber went in. I cannot hear your reasons inside it.",
      "I heard you arrive before I heard the amber land. That first sound was welcome too.",
    ],
  },
  capybara: {
    first: "Your offering is recorded. The ledger added a line under it that I did not write: gladly given. I have marked it unverified.",
    subsequent: [
      "The amount is recorded. Why you gave it is yours to say, and I left that line blank.",
      "The filing cabinet warmed up when your amber landed. I keep the tea in there now. Somebody may as well benefit.",
      "A new form appeared on my desk after your offering. It has a box for your next gift, already filled in. I have torn the box off.",
    ],
  },
  sloth: {
    first: "You gave something, and the whole tree went warm. I enjoyed that far too much. Keep an eye on me when I enjoy things.",
    subsequent: [
      "I waited a long time. That does not entitle anyone here to your next offering.",
      "The vines pulled tighter around the branch when your amber went down, like a hand closing. I loosened one. It took all morning, which is fast for me.",
      "Keep something for yourself. An empty hand is not the only proof that you care.",
    ],
  },
  wombat: {
    first: "I felt that go down through the foundation. A small load, and it gave a response I could measure.",
    subsequent: [
      "There is work your remaining amber could do. Hold on to it until you know what you want built.",
      "I can report what shifted down there. Willingness is not something my gauge measures.",
      "Your amber went down and my gauge twitched, then settled on a number I did not set. I have written my own number beside it.",
    ],
  },
  rabbit: {
    first: "The amber caught the light as you set it down. I watched for a moment, then went back to my seeds.",
    subsequent: [
      "You are allowed to keep some things back. My tin is full of seeds that remind me of that.",
      "When your amber landed, every flower in the bed turned toward the house at once. Except the three I planted crooked. I am so proud of those three.",
      "The flowers turned toward the warmth. I turned back to you, to ask if you would like some tea.",
    ],
  },
  red_panda: {
    first: "I watched you give the amber away. You can tell me what it meant to you, if you want to. I will not guess.",
    subsequent: [
      "Warmth came up through my mat after your offering, the kind that makes me want to sleep and agree with everything. I made myself a cup of very bitter tea instead.",
      "I nearly turned that into a lesson. Then I stopped. Thank you is enough.",
      "The smoke changed direction when you gave it. So the giving did something. I will not pretend it told me anything about you.",
    ],
  },
  tarsier: {
    first: "Your amber went down in a brief light. I saw where it went. I did not see why you chose to give it.",
    subsequent: [
      "Your amber went down in a brief light, and for a moment every star over the ridge held perfectly still. I chalked the time. Chalk does not get excited.",
      "You may come up to the rail empty-handed. There is plenty to look at already.",
      "The light faded. I left the next line of my record blank. I am not assuming another gift.",
    ],
  },
  aye_aye: {
    first: "Something knocked through the beam when your amber landed. I knocked back once.",
    subsequent: [
      "A welcome should not turn into a toll you pay at the stairs.",
      "The bronze hummed when your amber landed, a low, pleased sound. She has never hummed for me. I put the cloth back over her.",
      "Tok, tok. That means hello, whether or not you bring anything with it.",
    ],
  },
  kakapo: {
    first: "Some of what you gave reached my seed bed as warmth. I checked the seedlings before I came to thank you.",
    subsequent: [
      "Save some for a pot you have not chosen yet.",
      "After your offering, the whole roof garden bloomed at once, and every bloom was the same bloom. Very generous. I miss my ugly marigold.",
      "A seed kept back for another season is not a failed gift. You may keep some back too.",
    ],
  },
};

/**
 * Get an animal's reaction to the player's sacrifice.
 * Returns null if no reaction is available (pre-Phase 4).
 */
export function getSacrificeReaction(
  animalType: string,
  sacrificeCount: number,
  phase: number
): string | null {
  if (phase < 4) return null;
  const reactions = SACRIFICE_REACTIONS[animalType];
  if (!reactions) return null;

  if (sacrificeCount <= 1) return reactions.first;
  const lines = reactions.subsequent;
  return lines[Math.floor(Math.random() * lines.length)];
}
