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
      FLAME: "The flame leaned when that word landed. Shut the window a moment? I'd like to check something.",
      FIRE: "FIRE. That deserves a log. I can contribute the ordinary kind.",
      EMBER: "My name! I answer to that outside a word board too, you know.",
      BURN: "BURN. A fair review of my most recent toast.",
      WARM: "The den warmed a little. You can still move your chair away from the hearth.",
      _default: "The fire stirred at your word. I noticed. It doesn't mean I've explained it.",
    },
    2: {
      FLAME: "It reached toward FLAME again. I moved the poker out of the way.",
      FIRE: "The hearth answered FIRE before I spoke. It seems to be learning your voice.",
      EMBER: "EMBER. I felt that. I'd like to know why before calling it a compliment.",
      BURN: "A soot mark where BURN settled. This one needs more than a damp cloth.",
      WARM: "Warmth without another log. Useful, until I try accounting for it.",
      _default: "I can read something in the flames. I have been putting off saying so.",
    },
    3: {
      FLAME: "Your word hung over the grate in sparks. FLAME. I wish its next sentence were as legible.",
      FIRE: "It reached past the hearth for FIRE. I put the screen up.",
      EMBER: "My name in its voice is different from my name in yours.",
      BURN: "BURN left a mark on the stone. I won't cover it while we're trying to understand.",
      WARM: "The warmth reached a wall I keep cold food against. I've moved the food.",
      _default: "I keep finding nicer words for hungry. That isn't helping you understand what I see.",
    },
    4: {
      FLAME: "FLAME brightened the hearth. A bright response doesn't tell us what it wants.",
      FIRE: "FIRE. I know how to keep one. I'm less sure about what this one keeps.",
      EMBER: "EMBER is my name. I want it to remain something I can answer for myself.",
      BURN: "BURN can destroy things. I won't promise otherwise because the heat feels gentle.",
      WARM: "WARM. Put your hands near if you want. Near enough is yours to decide.",
      _default: "Your word reached the fire. It still owes us an answer.",
    },
  },
  owl: {
    1: {
      BOOK: "A page turned at BOOK. I have put a weight on the next one.",
      READ: "READ. The sentence looks different. I should have copied it before remarking on the handwriting.",
      KNOW: "KNOW is a promising word. I have considerably more questions than knowledge.",
      WISE: "WISE. I shall try not to take that personally.",
      WORD: "WORD. A useful subject. Shall we begin with the spelling?",
      _default: "The study shifted when you finished. I recorded the time, not a conclusion.",
    },
    2: {
      BOOK: "BOOK moved a page beneath the weight. That eliminates one explanation.",
      READ: "I copied the sentence after READ. The copy changed too.",
      KNOW: "KNOW appeared in the index. The entry sends me to a blank page.",
      WISE: "A margin called me WISE. Flattery is not peer review.",
      WORD: "Your WORD appears under an older sentence. Different ink. Same pressure marks.",
      _default: "The extra volume reacts. Not every book does. I am keeping the uncooperative ones nearby.",
    },
    3: {
      BOOK: "BOOK opened the diagram. I would prefer it answer the question I asked.",
      READ: "READ. I can read it. Understanding it has proved a separate skill.",
      KNOW: "KNOW. The book uses that word where I would write believe.",
      WISE: "The page calls me WISE again. I have stopped finding it persuasive.",
      WORD: "WORD. This diagram may describe a use for yours. A use isn't permission.",
      _default: "My interpretation has a missing step. I intend to stop hiding that step in long sentences.",
    },
    4: {
      BOOK: "BOOK. I've left the plain notebook open beside it.",
      READ: "READ doesn't mean obey. I have written that in the margin.",
      KNOW: "KNOW is a claim. We can ask how.",
      WISE: "WISE. I would settle for willing to correct myself.",
      WORD: "WORD. Yours belongs in the record with the circumstances in which you formed it.",
      _default: "The page answered. I'll compare it to the original before calling it a correction.",
    },
  },
  pangolin: {
    1: {
      COOK: "COOK. An invitation I accept daily.",
      MEAL: "MEAL. I have one nearly ready and several ideas that missed lunch.",
      FOOD: "FOOD. Wash your hands and I'll find you something.",
      SPICE: "SPICE. A little first. We can add more; removing pepper is a career.",
      ROLL: "ROLL. Pastry or pangolin? I demonstrate both.",
      _default: "The pot stirred when your word arrived. I hadn't touched the spoon.",
    },
    2: {
      COOK: "COOK warmed the stove. I checked the fuel before adding any.",
      MEAL: "MEAL. The empty bowl filled a little. I've set it aside to examine.",
      FOOD: "FOOD appeared on a page I hadn't opened. The ingredients are in my handwriting.",
      SPICE: "SPICE. I tasted something that isn't in the rack.",
      ROLL: "ROLL. The dough folded itself. I flattened it to see if it would try again.",
      _default: "The recipe changes when you make words. I keep flour marks beside the lines.",
    },
    3: {
      COOK: "COOK. I asked who the recipe expected me to feed. No useful answer.",
      MEAL: "MEAL. There are portions here for someone who hasn't introduced themselves.",
      FOOD: "FOOD. I won't serve it until I know what went into it.",
      SPICE: "The SPICE is missing from every jar. The pot tastes of it anyway.",
      ROLL: "ROLL. I curled up before answering. Let me finish being a cook with a question.",
      _default: "Your word went into the recipe. Your name didn't sign anything.",
    },
    4: {
      COOK: "COOK. I still choose what leaves this kitchen.",
      MEAL: "MEAL. Words feed something here. That doesn't make us the meal.",
      FOOD: "FOOD is not a name I will give a friend.",
      SPICE: "SPICE. Taste before declaring improvement. A rule with applications.",
      ROLL: "ROLL. Scales outside, cook inside. The cook may need a moment.",
      _default: "The pot answered your word. I am keeping the lid within reach.",
    },
  },
  axolotl: {
    1: {
      WATER: "WATER. A subject I can confidently introduce.",
      SWIM: "SWIM. I'd demonstrate a turn if GLOW would move.",
      FLOAT: "FLOAT. Sometimes my entire afternoon.",
      DEEP: "DEEP. I can show you the shallow bits first.",
      WAVE: "WAVE. Hello back! Oh, the water kind.",
      _default: "A bubble rose when that word landed. It took an odd route.",
    },
    2: {
      WATER: "WATER left a line against the glass above the usual level.",
      SWIM: "SWIM changed the current. I put a pebble where it used to turn.",
      FLOAT: "FLOAT. The leaf went down before it came up. It hadn't done that before.",
      DEEP: "DEEP. The bottom looked farther away. I checked the rock I use as a marker.",
      WAVE: "WAVE reached both sides of the tank at once.",
      _default: "I saw your letters in a bubble. Couldn't tell you how they got there.",
    },
    3: {
      WATER: "WATER. There is water beyond the bottom. I know how that sounds.",
      SWIM: "SWIM. I tried the old route and ended beside a different stone.",
      FLOAT: "FLOAT. Staying in place takes more work now.",
      DEEP: "DEEP. I want to look. I also want someone nearby when I do.",
      WAVE: "WAVE. Something answered from beneath the current. I waited before waving back.",
      _default: "Your word moved through the deep part. I didn't know that was where it went.",
    },
    4: {
      WATER: "WATER is a place I live. It isn't all of who I am.",
      SWIM: "SWIM. I'm choosing a different turn this time.",
      FLOAT: "FLOAT. I can rest without agreeing to stay still forever.",
      DEEP: "DEEP. I don't know everything underneath me. I can admit that now.",
      WAVE: "WAVE. I'll answer a greeting. It isn't a promise about what comes next.",
      _default: "The water heard your word. I want to hear what you meant by it too.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "HEAR. Yes. Quite a lot, actually. Would you like the short report?",
      SOUND: "SOUND. The kettle wins the current competition.",
      ECHO: "ECHO. That one came from the wall. I can show you the angle.",
      QUIET: "QUIET. I know a place behind the canvas.",
      LISTEN: "LISTEN. I'd like you to hear the little click before the sand cools.",
      _default: "Your word made the chime twitch. There wasn't much wind.",
    },
    2: {
      HEAR: "HEAR came back through the bowl. I hadn't spoken into it.",
      SOUND: "SOUND. The low note continues after the ordinary echo ends.",
      ECHO: "ECHO. I moved the bowl. The answer came from its old place.",
      QUIET: "QUIET. The birds stopped before I heard what interrupted them.",
      LISTEN: "LISTEN. One ear this way. Tell me when you lose the note.",
      _default: "I hear it in the ground and the air. I can't yet separate them.",
    },
    3: {
      HEAR: "HEAR. I hear it. That doesn't mean I understand the warning.",
      SOUND: "SOUND. The small noises disappeared under it. I went to check their sources.",
      ECHO: "ECHO. A second voice was already there before my first word ended.",
      QUIET: "QUIET. I wanted that so badly I nearly forgot to ask what went missing.",
      LISTEN: "LISTEN. I owe you this report before deciding what would reassure you.",
      _default: "The word reached a place my chart doesn't name. I have marked a gap.",
    },
    4: {
      HEAR: "HEAR. I'm checking for the voice beside me as well as the one underneath.",
      SOUND: "SOUND. Larger isn't automatically truer.",
      ECHO: "ECHO. I can repeat it without pretending it is mine.",
      QUIET: "QUIET. You may ask for it without consenting to lose your voice.",
      LISTEN: "LISTEN. I can do that without asking you to agree.",
      _default: "Your word made the sand shake. That's the observation. We can discuss the explanation.",
    },
  },
  capybara: {
    1: {
      CALM: "CALM. Current office objective. Not mandatory.",
      CHILL: "CHILL. Yes. Did you need something?",
      STILL: "STILL. The printer is, for example.",
      PEACE: "PEACE. No meetings scheduled. An approximation.",
      REST: "REST. Good chair available.",
      _default: "The page moved when you finished. Window closed. Noted.",
    },
    2: {
      CALM: "CALM appeared in the status field. I hadn't assessed it.",
      CHILL: "CHILL. My name appeared without my signature.",
      STILL: "STILL. The clock stopped, then resumed. I'll keep the missing minute on record.",
      PEACE: "PEACE. The form checked its own box.",
      REST: "REST. An appointment disappeared. I hadn't canceled it.",
      _default: "Your word was entered before I reached the ledger.",
    },
    3: {
      CALM: "CALM. The report uses that word where I wrote concerned.",
      CHILL: "CHILL. A signature bearing my name still needs my authorization.",
      STILL: "STILL. The missing minute is listed as productive.",
      PEACE: "PEACE. There were objections. The page left them out.",
      REST: "REST. I closed the ledger. It can wait.",
      _default: "The office has a preferred version of events. I'm retaining my notes.",
    },
    4: {
      CALM: "CALM. A feeling somebody can report for themselves.",
      CHILL: "CHILL. Name, not an instruction.",
      STILL: "STILL. A clock can stop without the work being done.",
      PEACE: "PEACE. I'll leave space for a different assessment.",
      REST: "REST. Granted without a future commitment.",
      _default: "Entry received. Interpretation remains disputed.",
    },
  },
  sloth: {
    1: {
      SLOW: "SLOW. A fine pace for arriving with tea.",
      WAIT: "WAIT. I had intended to, but thank you.",
      TIME: "TIME. Plenty for a short visit if we don't inventory all of it.",
      HANG: "HANG. An activity at which I am overqualified.",
      TREE: "TREE. This one has tolerated me admirably.",
      _default: "The leaves moved when that word arrived. I was already watching.",
    },
    2: {
      SLOW: "SLOW. The vine took its time returning upright.",
      WAIT: "WAIT. That word found a familiar place in the hammock.",
      TIME: "TIME. I remember this feeling from an older evening.",
      HANG: "HANG. Something held the loose end of the rope while I tied it.",
      TREE: "TREE. A low note in the trunk. I've heard it before.",
      _default: "Something approaches. I have been hoping it would. That makes my guesses partial.",
    },
    3: {
      SLOW: "SLOW. I shouldn't use my pace to delay your answer.",
      WAIT: "WAIT. Yes, I wanted the waiting to end. I didn't ask enough about its ending.",
      TIME: "TIME. A long acquaintance with a wish doesn't turn it into knowledge.",
      HANG: "HANG. I came down to look at the branch properly.",
      TREE: "TREE. Its vines are tying themselves together. I loosened one.",
      _default: "I knew something was coming. I cannot promise what coming means for everyone.",
    },
    4: {
      SLOW: "SLOW. You can take your time deciding.",
      WAIT: "WAIT. Even something old may have to wait for permission.",
      TIME: "TIME. I'd like another evening. Not ownership of every evening.",
      HANG: "HANG. A position I can choose to leave.",
      TREE: "TREE. I want this one to keep growing, which requires it to change.",
      _default: "I am willing to meet it. My willingness doesn't stand in for yours.",
    },
  },
  wombat: {
    1: {
      DIG: "DIG. I can advise on that.",
      EARTH: "EARTH. Good ground here. Check before putting weight on it.",
      DEEP: "DEEP. A measurement, before it is a recommendation.",
      DARK: "DARK. Bring the lamp. No virtue in missing a beam.",
      ROCK: "ROCK. Put it down before deciding where it belongs.",
      _default: "Your word rattled the tool rack. I checked the wall.",
    },
    2: {
      DIG: "DIG. A groove opened beneath the chalk. I didn't cut it.",
      EARTH: "EARTH. The soil warmed along one particular joint.",
      DEEP: "DEEP. My rod reached farther than the drawing allows.",
      DARK: "DARK. The lamp shows a line absent in daylight.",
      ROCK: "ROCK. There are marks under its original face.",
      _default: "The old foundation responds. Your new rooms stand above something I haven't fully mapped.",
    },
    3: {
      DIG: "DIG. I followed the groove until it crossed my own work.",
      EARTH: "EARTH. The pressure comes from below, but the brace directs it inward.",
      DEEP: "DEEP. I found another face behind the support. Could be a seal.",
      DARK: "DARK. Keep the lamp here. I want everyone to see the same joint.",
      ROCK: "ROCK. Someone fitted it to keep something shut. I mistook it for ordinary support.",
      _default: "That word shifted the load. I've written where and how far.",
    },
    4: {
      DIG: "DIG. I won't cut until we've decided what should remain whole.",
      EARTH: "EARTH. It can hold a house without owning its occupants.",
      DEEP: "DEEP. Doesn't automatically mean secure.",
      DARK: "DARK. The lamp remains a good idea.",
      ROCK: "ROCK. If we need a gap, a fine stone still has to move.",
      _default: "The wall answered. We still decide what to build against it.",
    },
  },
  rabbit: {
    1: {
      RUN: "RUN. I can. I'd rather finish watering first.",
      FEAR: "FEAR. Familiar word. What made it turn up for you?",
      HIDE: "HIDE. The mint is excellent cover and poor camouflage for a sneeze.",
      JUMP: "JUMP. I did. Then discovered it was my own watering can.",
      FAST: "FAST. Useful for getting washing in before rain.",
      _default: "The leaves shook when that word arrived. I wrote down which ones.",
    },
    2: {
      RUN: "RUN. The path looked longer. I measured from the gate.",
      FEAR: "FEAR. I found a cause before blaming my nerves this time.",
      HIDE: "HIDE. Something shifted behind the fence. I asked Warren to look too.",
      JUMP: "JUMP. My shadow moved before I did.",
      FAST: "FAST. The seedlings opened between two marks on my timer.",
      _default: "That word appeared where I'd written a date. I kept the old scrap.",
    },
    3: {
      RUN: "RUN. I tested the route, not just the latch.",
      FEAR: "FEAR. The measurements stayed wrong when I calmed down.",
      HIDE: "HIDE. I moved the seed tin where I could reach it.",
      JUMP: "JUMP. I frightened somebody else by being frightened. We both apologized unnecessarily.",
      FAST: "FAST. I want enough time to decide where I'm going.",
      _default: "My worry found something useful. I wish the others had looked before reassuring me.",
    },
    4: {
      RUN: "RUN. A possibility I want to keep, even when I sit.",
      FEAR: "FEAR. Mine to understand. It needn't become a defect somebody repairs.",
      HIDE: "HIDE. I can want a private place without wanting to vanish.",
      JUMP: "JUMP. Still me. Still liable to spill tea.",
      FAST: "FAST. You don't have to answer at that speed.",
      _default: "I wrote your word beside my observations. I won't decide how you felt while forming it.",
    },
  },
  red_panda: {
    1: {
      VOID: "VOID. An empty cup can begin with tea.",
      DARK: "DARK. The attic has a lamp if you prefer it.",
      SHADOW: "SHADOW. Mine covers the mat before I sit. Quite a lot of tail.",
      END: "END. We can stop a conversation and remain friends.",
      GATE: "GATE. A useful place to say hello.",
      _default: "The incense bent toward your word. I assumed a draft. I may be right.",
    },
    2: {
      VOID: "VOID. The smoke leaves a space I hadn't noticed.",
      DARK: "DARK. I can see it better after looking away from the lamp.",
      SHADOW: "SHADOW. One fell against the direction of the light.",
      END: "END. I thought it meant rest. That may be what I wanted it to mean.",
      GATE: "GATE. The shape in the smoke resembles one. Resemblance is a beginning.",
      _default: "I find the warmth reassuring. I'm trying to remember that's a feeling.",
    },
    3: {
      VOID: "VOID. I have put a great many hopes in a place I called empty.",
      DARK: "DARK. I told Thyme it was gentle before asking what she'd seen.",
      SHADOW: "SHADOW. The pattern doesn't quite match my explanation.",
      END: "END. I may have mistaken something finishing for something being prevented.",
      GATE: "GATE. An invitation should tell us which side we can stand on.",
      _default: "I gave the others an interpretation too confidently. I owe them the uncertainty too.",
    },
    4: {
      VOID: "VOID. We can leave a little space unfilled.",
      DARK: "DARK. I don't know everything in it.",
      SHADOW: "SHADOW. I won't give it a friendly face just to calm us.",
      END: "END. Stopping must be an available answer.",
      GATE: "GATE. A boundary matters from both sides.",
      _default: "I hear your word. I won't turn it into a teaching before asking what you meant.",
    },
  },
  tarsier: {
    1: {
      NIGHT: "NIGHT. My working hours. Come see the moths before supper.",
      MOON: "MOON. Tonight's useful lamp needs no oil.",
      STAR: "STAR. I have a favorite to show you.",
      WATCH: "WATCH. You can join me without taking the whole shift.",
      BLINK: "BLINK. One of the things people recommend without consulting my eyes.",
      _default: "Your word left a glimmer beside the ridge. I've marked it.",
    },
    2: {
      NIGHT: "NIGHT. The darker patch remains when the moon changes.",
      MOON: "MOON. Its light stops at an edge above the ridge.",
      STAR: "STAR. One vanished from the chart and the sky together.",
      WATCH: "WATCH. I looked away, then checked the chalk before trusting my memory.",
      BLINK: "BLINK. I turned my head instead. The patch was still there.",
      _default: "I can observe the edge. I can't identify what lies beyond it.",
    },
    3: {
      NIGHT: "NIGHT. Something holds my attention there longer than I intend.",
      MOON: "MOON. I use its ordinary movement to check the strange one.",
      STAR: "STAR. I remembered a name missing from the new chart.",
      WATCH: "WATCH. I want to see the answer. I shouldn't call that everybody's duty.",
      BLINK: "BLINK. Looking away is becoming a task. I am practicing.",
      _default: "The old log describes this shape. It never explains why we were meant to welcome it.",
    },
    4: {
      NIGHT: "NIGHT. The whole sky needn't become one thing we watch.",
      MOON: "MOON. Ordinary light is still useful for comparison.",
      STAR: "STAR. A name is worth keeping even when it doesn't fit the chart.",
      WATCH: "WATCH. I may choose it. I may also take a break.",
      BLINK: "BLINK. Turn, rest, look elsewhere. There is more than one way to interrupt a gaze.",
      _default: "Your word reached the edge. I am also watching the creatures on this side.",
    },
  },
  aye_aye: {
    1: {
      KNOCK: "KNOCK. Tok, tok. Hello back.",
      BELL: "BELL. She hasn't rung. I am a patient colleague.",
      HOLLOW: "HOLLOW. Let me show you how that beam answers.",
      TAP: "TAP. This finger has been waiting for the invitation.",
      TOLL: "TOLL. A fine word to say quietly near a sleeping bell.",
      _default: "Your word sounded in the wood. A different sort of footstep.",
    },
    2: {
      KNOCK: "KNOCK. The answer came from a place I hadn't touched.",
      BELL: "BELL. The bronze warmed beneath my hand.",
      HOLLOW: "HOLLOW. The sound continues beyond the cavity I measured.",
      TAP: "TAP. I paused. Something supplied the next beat.",
      TOLL: "TOLL. The rope moved though the bell stayed still.",
      _default: "The beams answer in sequence. I can follow it without understanding the message.",
    },
    3: {
      KNOCK: "KNOCK. I remember wanting someone to answer me too.",
      BELL: "BELL. I want to hear her. I need a better reason than my wanting.",
      HOLLOW: "HOLLOW. I've been called the thing in the walls. I won't mistake every hollow for an enemy.",
      TAP: "TAP. The reply waited when I stopped. I'd like to see whether it keeps waiting.",
      TOLL: "TOLL. I loosened the rope. I have not pulled it.",
      _default: "A strange guest deserves a fair hearing. Fair hearing includes difficult questions.",
    },
    4: {
      KNOCK: "KNOCK. We should wait for an answer before entering.",
      BELL: "BELL. Her voice is saved for the meeting itself.",
      HOLLOW: "HOLLOW. A room can hold someone's things without owning the person.",
      TAP: "TAP. I can stop after this one.",
      TOLL: "TOLL. A word you formed isn't an instruction to my hand.",
      _default: "The wood answered. I am listening for room to say something different.",
    },
  },
  kakapo: {
    1: {
      GREEN: "GREEN. An excellent beginning to a garden report.",
      SEED: "SEED. Small enough to carry. Ambitious enough to embarrass a roof.",
      NEST: "NEST. Needs lining even when empty.",
      BLOOM: "BLOOM. Come see the little one by the bucket.",
      BOOM: "BOOM. My voice has a larger setting. I'll save the demonstration.",
      _default: "Your word stirred a leaf. Could be the breeze. I left a marker.",
    },
    2: {
      GREEN: "GREEN. The warmth reaches a little farther along the bed.",
      SEED: "SEED. That one germinated early. Decades to a tree, fewer days to a shoot.",
      NEST: "NEST. Something pressed the lining down. Nobody was sitting there.",
      BLOOM: "BLOOM. A flower where I didn't plant one.",
      BOOM: "BOOM. The bowl held a low answer after I stopped humming.",
      _default: "I would like it to be an answer. That is why I'm checking twice.",
    },
    3: {
      GREEN: "GREEN. The new leaves all face inward. I turned one pot.",
      SEED: "SEED. I kept some back. One season needn't have every possibility.",
      NEST: "NEST. I want it filled. I won't call emptiness a promise.",
      BLOOM: "BLOOM. The same flower again, down to a nick in the petal.",
      BOOM: "BOOM. Humming isn't the call. I am saving the breath that matters.",
      _default: "Something answers from the roots. I don't yet know whether it hears me.",
    },
    4: {
      GREEN: "GREEN. I'd like it to keep growing differently.",
      SEED: "SEED. There is room for a future we haven't planted.",
      NEST: "NEST. A cared-for space needn't make a claim on its visitor.",
      BLOOM: "BLOOM. Let the odd flower keep its odd edge.",
      BOOM: "BOOM. I'll use my call when we meet. This word needn't spend it early.",
      _default: "Wanting an answer for ninety years hasn't taught me to recognize every kind of kindness.",
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
      fox: "A hundred words. That's a lot of different shapes passing through your hands. I made tea to mark the occasion.",
      owl: "One hundred words in the record. Round numbers please a cataloguer. They don't explain the contents of the catalogue.",
      pangolin: "A hundred words. I counted a hundred grains once while waiting for bread. Yours sound like the better afternoon.",
      fennec_fox: "One hundred in the count. I've made a mark in my own chart. I'll keep listening for differences between the words too.",
      tarsier: "A hundred words in the record. I wasn't watching every one. Tell me a favorite and I'll give that one its own place.",
      aye_aye: "The record says a hundred words. I can hear the recent ones in the beams. The earlier ones will need your account.",
      kakapo: "A hundred words. A garden can grow out of small things counted patiently. It also needs somebody to look at each leaf.",
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: "Two hundred and fifty words. I like knowing how much you've made. I shouldn't let a count take the place of asking how you are.",
      owl: "Two hundred and fifty entries. I am comparing what happened with what the old text predicted. They don't always match.",
      pangolin: "Two hundred and fifty words in the record. Enough for a recipe to become difficult to check. I am checking anyway.",
      capybara: "Two hundred and fifty entries. Count verified. Interpretation still needs work.",
      tarsier: "Two hundred and fifty words. The old log has a count too. I'm keeping yours beside it so the differences remain visible.",
      aye_aye: "Two hundred and fifty. The beams carry something of that history. I won't pretend I was here to hear its whole beginning.",
      kakapo: "Two hundred and fifty words. The growth here has a history longer than my tending of it. I'd like to hear what you remember.",
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: "Five hundred words. I used to treat a larger count as a reason to celebrate automatically. I'd rather ask what you'd like to remember.",
      owl: "Five hundred. The text uses the number as a heading. I use it as an opportunity to check the claims underneath.",
      red_panda: "Five hundred in the record. Many occasions, many possible reasons. I won't compress them into one lesson.",
      capybara: "Five hundred entries. Still room for a correction, an objection, or an answer somebody hasn't given yet.",
      tarsier: "Five hundred words. I've stopped assuming each mark in a ledger meant the same thing to the person making it.",
      aye_aye: "Five hundred. I can hear a pattern in the beams. I also want to hear the parts that don't fit it.",
      kakapo: "Five hundred words. A full branch still has particular fruit on it. I'd like to know which word you remember.",
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: "Seven hundred and fifty words. You can stop by the fire without adding to the count. I would like the company.",
      owl: "Seven hundred and fifty. An impressive record. I am leaving its conclusions open to revision.",
      wombat: "Seven hundred and fifty words recorded. They changed the load. I'll keep measuring before declaring the work done.",
      rabbit: "Seven hundred and fifty. A number I can write down without deciding it is a distance I have to travel.",
      tarsier: "Seven hundred and fifty words. The ledger can hold another page. My watch can include something other than counting.",
      aye_aye: "Seven hundred and fifty. The bronze holds a note beneath those figures. It needn't be spent just because we've named the count.",
      kakapo: "Seven hundred and fifty words. You haven't outgrown the small empty pot by the gate. There is still room for something unplanned.",
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
    first: "The fire brightened when you set the amber down. I saw that much. It doesn't tell me everything about why you gave it.",
    subsequent: [
      "Thank you. You can keep the next bit for something you want to build.",
      "You needn't give amber to keep your chair beside me.",
      "The flame turned toward it. I'll describe what it did without claiming to know how you feel.",
    ],
  },
  pangolin: {
    first: "I felt warmth through the kitchen floor when you gave that. I checked the stove before looking downstairs.",
    subsequent: [
      "Your portion at supper isn't measured against what you offer.",
      "A gift is yours to give. So is the part you keep.",
      "The pot stirred. I am leaving the rest of the amber where you put it, including the part you haven't offered.",
    ],
  },
  owl: {
    first: "I have recorded the amber offered. Its meaning isn't established by its amount.",
    subsequent: [
      "A material contribution is evidence of an action. It doesn't prove agreement with every interpretation of the action.",
      "The new page describes your gift. I'll check whether it also preserves your reasons, if you choose to tell me.",
      "The amber was yours to use. Old books don't get to invent an older claim after you have given it.",
    ],
  },
  axolotl: {
    first: "The current warmed when you gave the amber. I put my hands in it, then came over to tell you.",
    subsequent: [
      "You can still visit the fish without bringing anything.",
      "I liked the warmth. You don't have to keep making it for me.",
      "The water carried a little glimmer from your offering. I watched it pass instead of asking for another.",
    ],
  },
  fennec_fox: {
    first: "Your amber made a small clear sound when it landed. I waited to hear the end before reporting it.",
    subsequent: [
      "One offering, one sound. I won't listen for a second you haven't decided on.",
      "The low note changed. I can't hear your reasons inside it.",
      "I heard you arrive before I heard the amber. That first sound was welcome too.",
    ],
  },
  capybara: {
    first: "Offering recorded. No recurring payment assumed.",
    subsequent: [
      "Amount received. Motivation left for you to describe.",
      "Keeping the remainder requires no explanation.",
      "I recorded what you gave. Not a promise about what you will give next.",
    ],
  },
  sloth: {
    first: "You gave something. You may now sit without giving an explanation as well.",
    subsequent: [
      "A long wait doesn't entitle anyone to your next offering.",
      "I enjoy the warmth. My enjoyment needn't become your obligation.",
      "Keep something for yourself. An empty hand isn't the only evidence of care.",
    ],
  },
  wombat: {
    first: "Felt that through the foundation. Small load, measurable response.",
    subsequent: [
      "There's work your remaining amber could do. Keep it until you know what you want built.",
      "I can report what shifted. Can't measure a person's willingness with the same gauge.",
      "An offering doesn't sign away your say in the building.",
    ],
  },
  rabbit: {
    first: "The amber caught the light as you set it down. I watched, then went back to my seeds.",
    subsequent: [
      "You can keep some things. My tin is full of reminders.",
      "I don't want you giving something just because you're afraid we'd notice if you didn't.",
      "The flowers turned toward the warmth. I turned back toward you to ask whether you'd like tea.",
    ],
  },
  red_panda: {
    first: "I watched you give the amber. I'll let you tell me what the giving means, if you want to.",
    subsequent: [
      "Keeping something can be a careful choice too.",
      "I nearly made a teaching out of that. Perhaps a thank-you is enough.",
      "The smoke changed direction. Your offering did something. I won't claim it explained you.",
    ],
  },
  tarsier: {
    first: "The amber left a brief light. I saw where it went, not why you chose to give it.",
    subsequent: [
      "I can record the offering without claiming to read your intentions.",
      "You may visit the rail empty-handed. There is already plenty to look at.",
      "The light faded. I left the next line of my record blank. No next gift assumed.",
    ],
  },
  aye_aye: {
    first: "A little knock through the beam when the amber landed. I answered once.",
    subsequent: [
      "A welcome shouldn't become a toll at the stairs.",
      "You gave something the house can hold. It doesn't get to hold every part of the giver.",
      "Tok, tok means hello whether or not anything follows it.",
    ],
  },
  kakapo: {
    first: "A little warmth reached the bed. I checked the seedlings before coming to thank you.",
    subsequent: [
      "Save some for a pot you haven't chosen yet.",
      "The garden felt your offering. It can also welcome a visitor who simply wants to sit.",
      "A seed kept for another season isn't a failed gift. I think amber may be allowed the same consideration.",
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
