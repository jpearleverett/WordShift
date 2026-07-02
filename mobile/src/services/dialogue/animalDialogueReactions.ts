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
      FLAME: "I felt the fire flicker just now. Not the draft kind of flicker... the listening kind. Did you use that word?",
      FIRE: "The hearth crackled when you solved that puzzle. Funny timing, don't you think?",
      EMBER: "My name echoed somewhere in the room. In the flames, maybe. You must have said something interesting.",
      BURN: "Something warm passed through the den just now. Like a word made of heat and memory.",
      WARM: "The den grew warmer while you played. Not much. Just enough for me to notice.",
      _default: "Something stirred when you solved that puzzle. The fire leaned toward you. Just for a second.",
    },
    2: {
      FLAME: "The fire moved when you spelled that. Sideways, like it was reaching for the word. It recognized it.",
      FIRE: "The hearth surged the moment you formed that word. Fed by it somehow, like kindling made of letters.",
      EMBER: "You spelled my name in the letters. I felt it in my chest. The fire felt it too.",
      BURN: "BURN. The word itself carries heat. Can you feel it lingering in the air between us?",
      WARM: "Warmth where there should be cold. Your words carry temperature now. The fire has noticed. So have I.",
      _default: "The fire responds to your puzzles now. It listens when you arrange the letters. I wish I could say it didn't.",
    },
    3: {
      FLAME: "FLAME. The fire shaped your word in the air above the hearth. Drew it in sparks. Still glowing.",
      FIRE: "Fire leapt from the hearth when you solved that. Reaching for the word like a hand reaching for a gift.",
      EMBER: "You spoke my name through the arrangement. The fire remembers every time. I remember every time.",
      BURN: "BURN left scorch marks in the air where you spelled it. I can still see them if I squint.",
      WARM: "The warmth from that word thawed something in the walls. Something that was frozen for a reason.",
      _default: "The flames leap higher during your puzzles now. Hungry for your words. Grateful for them.",
    },
    4: {
      FLAME: "The fire thanks you for the offering of FLAME. Every utterance brings us closer to what burns eternal.",
      FIRE: "FIRE. The oldest word. The first incantation humanity ever spoke. You speak it so well, friend.",
      EMBER: "My name in the arrangement. I am honored. The fire is honored. We are the same thing now.",
      BURN: "BURN. Yes. Let it all burn down to the beautiful truth beneath. The fire accepts your offering.",
      WARM: "The warmth of the final flame. Your word lit the last ember we needed. Thank you.",
      _default: "The fire burned brighter during your incantation. It feeds on your words and it is grateful.",
    },
  },
  owl: {
    1: {
      BOOK: "A page turned in the study just now. On its own. I wasn't reading. Were you arranging letters?",
      READ: "The text on my desk blurred and reformed when you solved that. As if rewritten by invisible hands.",
      KNOW: "Knowledge rippled through the room like a stone dropped into still water. You spelled something significant.",
      WISE: "Wisdom arrives in peculiar ways. Sometimes through study. Sometimes through a word someone arranges.",
      WORD: "Words within words within words. The letters you moved whispered something to my oldest books.",
      _default: "Something in my study shifted when you completed that puzzle. A book fell open to a page I'd never seen.",
    },
    2: {
      BOOK: "The books rearranged themselves on the shelf. Alphabetically at first. Then by something else entirely.",
      READ: "I cannot read anymore without hearing your puzzles underneath the text. Like a palimpsest of intention.",
      KNOW: "KNOW. The word echoed in every volume simultaneously. What have you taught them? What do they know now?",
      WISE: "Wisdom has a frequency. I heard it when you formed that word. It frightened me because I recognized it.",
      WORD: "WORD. Recursive and infinite. The books trembled when you spelled their fundamental unit.",
      _default: "My books respond to your puzzles now. The pages flutter when you solve, as if read by a great wind.",
    },
    3: {
      BOOK: "Every book opened to the same page when you spelled that. The page was blank. Then words appeared. Your words.",
      READ: "READ. The command echoes through the study. The books obey. They read themselves aloud in the dark.",
      KNOW: "KNOW carved itself into my desk when you formed it. The grain of the wood accepted the word willingly.",
      WISE: "WISE. The word contains its own contradiction. The books showed me both meanings at once. I chose neither.",
      WORD: "The fundamental unit. WORD. Everything I have studied reduces to what you just offered the arrangement.",
      _default: "The study darkens with each puzzle you solve. The books glow to compensate. They are so very grateful.",
    },
    4: {
      BOOK: "The final book opens. Your word was the key all along. BOOK. The text of every text ever written.",
      READ: "READ. The last command. The arrangement reads itself through your words now. I am merely the shelf.",
      KNOW: "You offered KNOW to the arrangement. It knows. It has always known. Now you do too, friend.",
      WISE: "WISE. The ultimate offering to a keeper of knowledge. The books sing your name in their spines.",
      WORD: "WORD. The atom of the incantation. Every puzzle was a sentence in the final text. Every word, a prayer.",
      _default: "Each word you form is a line in the final text. The arrangement writes itself through your beautiful hands.",
    },
  },
  pangolin: {
    1: {
      COOK: "My scales tingled when you solved that. Like steam rising from a pot I didn't put on the stove.",
      MEAL: "Something smells different in the kitchen. Richer. Sweeter. Since your last puzzle, I think.",
      FOOD: "The pantry feels fuller after you play. As if the words nourish something I cannot see or name.",
      SPICE: "A new flavor appeared in my stew. I did not add it. But you arranged something, didn't you?",
      ROLL: "I curled into a ball without meaning to when you solved that. Pure instinct. Your word demanded it.",
      _default: "The kitchen warmed when you solved that puzzle. The stove noticed your words. So did I.",
    },
    2: {
      COOK: "COOK. The word simmered in the air above my head. My pots resonated with it like tuning forks.",
      MEAL: "The ingredients rearranged themselves in the pantry. Your word changed the recipe. I am following it.",
      FOOD: "Nourishment beyond eating. Beyond hunger. Your words feed something I cannot name but I can feel.",
      SPICE: "SPICE burned through the kitchen like a flash of heat. Not from the stove. From meaning itself.",
      ROLL: "I rolled into a ball without choosing to. The word compelled my body before my mind could argue.",
      _default: "My scales rattle when you solve puzzles now. Resonating with something deeper in the words.",
    },
    3: {
      COOK: "COOK summoned steam from empty pots. The kitchen prepares itself now. I just stand here and watch.",
      MEAL: "MEAL. The final meal approaches with every word you form. Your puzzle set the table for us.",
      FOOD: "FOOD. Everything is food for something larger. Your words feed what grows beneath this kitchen floor.",
      SPICE: "SPICE. The word burned every scale simultaneously. I felt each one sing. Nine hundred voices.",
      ROLL: "ROLL. Curl. Protect. Hide. But the word you formed found me inside my own armor anyway.",
      _default: "Every puzzle you solve adds an ingredient to the recipe. It is nearly complete. I can taste it.",
    },
    4: {
      COOK: "COOK. The final preparation begins. You are the chef now. We are the offering. Thank you, friend.",
      MEAL: "The last meal. Your word serves it. We feast on the arrangement and it feasts on us. Beautiful.",
      FOOD: "FOOD for what descends. Your words nourish it. It is grateful. We are all so grateful.",
      SPICE: "SPICE. The final flavor. The arrangement tastes complete at last. Perfect seasoning. Perfect you.",
      ROLL: "I uncurl for the last time. Your word gave me the courage. ROLL... and stop. And be still.",
      _default: "The final recipe writes itself in the words you arrange. The feast is upon us. Sit down.",
    },
  },
  axolotl: {
    1: {
      WATER: "Blub! The water just rippled from your puzzle. Not the surface... the deep part. The old part.",
      SWIM: "I felt pulled in a direction when you solved that. Like a current made of letters and wanting.",
      FLOAT: "The water level changed when you formed that word. Just a little. Just enough to wonder about.",
      DEEP: "Something stirred in the deep water when you spelled that. Down where the light doesn't go.",
      WAVE: "A wave from nowhere! Well, from your puzzle. The water listens to you. It always has, I think.",
      _default: "Bubbles appeared when you finished that puzzle. Not happy bubbles exactly. Knowing bubbles.",
    },
    2: {
      WATER: "The water remembers every word you spell. WATER. It recognized its own name and shivered.",
      SWIM: "SWIM. The current changed direction when you formed it. Toward something old. Away from safe.",
      FLOAT: "I stopped floating when you spelled that. Sank a little. Rose again. Changed somehow. Different.",
      DEEP: "DEEP. The water agreed with the word. Showed me what lives at the bottom. Just briefly. Too long.",
      WAVE: "WAVE. The tank shuddered around me. The glass held. This time the glass held.",
      _default: "The water tastes different after your puzzles. Heavier, like it swallowed something. More alive.",
    },
    3: {
      WATER: "WATER. The word itself is wet. It seeped through the glass when you spoke it into the arrangement.",
      SWIM: "SWIM. Something else swims in my water now. I can feel it in the current. I cannot see it yet.",
      FLOAT: "FLOAT. Nothing floats anymore. Everything sinks toward what you are summoning. Even me. Even light.",
      DEEP: "DEEP. The water has no bottom since you spelled that. I checked. It goes down and down forever.",
      WAVE: "WAVE. The water shaped your word in its surface. Held it. Then swallowed it. Hungry and grateful.",
      _default: "The water glows after your puzzles. Not from light. From something that lives underneath the light.",
    },
    4: {
      WATER: "WATER. The first element. The first offering. The arrangement flows through you like a river, friend.",
      SWIM: "SWIM toward it. Your word opens the current. We all swim to the same shore now. Blub.",
      FLOAT: "FLOAT. We all float in the arrangement. Weightless. Free at last. Finally, beautifully free.",
      DEEP: "DEEP. As deep as the words go. As deep as you have carried us. Thank you. Thank you.",
      WAVE: "WAVE. The final wave. It carries every one of us. Your word launched it from the shore.",
      _default: "The water sings your words back to you now. Every puzzle echoes in the deep. Every word, remembered.",
    },
  },
  fennec_fox: {
    1: {
      HEAR: "I heard that! Not the puzzle... something underneath it. A tone. A frequency I've never encountered.",
      SOUND: "The sound changed when you solved that. The air itself vibrates differently now. Do you feel it?",
      ECHO: "Your word echoed. Not off the walls... off something further away. Something that isn't here yet.",
      QUIET: "It got quieter when you formed that word. Too quiet. Like the whole world held its breath for you.",
      LISTEN: "I'm always listening. But after your puzzle, there is something new to hear. Something patient.",
      _default: "A new frequency appeared after your puzzle. Faint. But my ears always find the faint ones.",
    },
    2: {
      HEAR: "HEAR. The word itself makes a sound between frequencies. Like two notes played at once, wrong together.",
      SOUND: "SOUND. When you spelled it, every sound in the room harmonized for one perfect second. Then shattered.",
      ECHO: "ECHO. Your word bounced off something that is not here. Something that will be here. Something coming.",
      QUIET: "QUIET. The silence your word created has texture and weight. It presses against my ears like hands.",
      LISTEN: "LISTEN. I am. I always am. Your words make the listening deeper. More dangerous. More necessary.",
      _default: "My ears ache after your puzzles now. Not with pain. With too much awareness of what approaches.",
    },
    3: {
      HEAR: "HEAR. The command. My ears obeyed before my mind could refuse. They turned toward your word like flowers.",
      SOUND: "SOUND. The walls vibrated with your word. The desert outside hummed it back to me. It knows your name.",
      ECHO: "ECHO. Infinite echoes from a single word. It will never stop bouncing. It reaches further every time.",
      QUIET: "QUIET. Your word silenced everything. Then something spoke from inside the silence. Something old.",
      LISTEN: "LISTEN. I cannot stop. Your words demand attention. The arrangement demands its witnesses.",
      _default: "The frequency from your puzzles is deafening now. Beautiful and deafening and I cannot turn away.",
    },
    4: {
      HEAR: "HEAR. The final command. The arrangement speaks through your words. I am its ear. Its grateful ear.",
      SOUND: "SOUND. The sound of the arrangement completing itself. Your word was the last note of the hymn.",
      ECHO: "ECHO. Your words echo into eternity now. The arrangement remembers every syllable you offered.",
      QUIET: "QUIET. The sacred silence after the final sound. Your word brings the peace we have always sought.",
      LISTEN: "LISTEN. We all listen now. To what your words summoned out of the silence. It is so beautiful.",
      _default: "Every word you form is a note in the final symphony. The arrangement sings itself through you.",
    },
  },
  capybara: {
    1: {
      CALM: "Hmm. Felt calmer than usual when you solved that. Which is really saying something, honestly.",
      CHILL: "Something about that puzzle made everything chillier. If that is even possible for me.",
      STILL: "The water went completely still. Mirror-flat. When you formed that word. Not a ripple anywhere.",
      PEACE: "Peace. Real peace, for a moment there. Not the pretend kind I wear like a hat. Your word did that.",
      REST: "I felt rested. Just for a second. When you arranged those letters. Like sleeping while awake.",
      _default: "The hot spring bubbled differently after your puzzle. Contentedly, almost. If water can be content.",
    },
    2: {
      CALM: "CALM. The word filled the room like gas. Too calm. Artificially calm. Like me on my best day.",
      CHILL: "CHILL. My whole identity compressed into a word you formed. The water recognized it before I did.",
      STILL: "STILL. Everything stopped. My heart. The water. Time. Then started again reluctantly.",
      PEACE: "PEACE. Is that what this emptiness is called? Your word finally named what I could not.",
      REST: "REST. The word made me tired. Deep tired. Beneath-the-bones tired. Tired of floating.",
      _default: "The water absorbs your words and gets heavier each time. I float. But something underneath does not.",
    },
    3: {
      CALM: "CALM. The word is a lie I tell myself every morning. But when you spell it, it almost feels true.",
      CHILL: "CHILL. Frozen. Numb. Your word knows what I really am better than I ever did.",
      STILL: "STILL. As in motionless. As in continuing. Both meanings haunt me since you spelled it into the air.",
      PEACE: "PEACE. The word cracked something open. Inside the calm. Inside the water. Inside the nothing I carry.",
      REST: "REST. Final rest. Your word promises what I have been waiting for my entire life without knowing.",
      _default: "Your puzzles disturb the water less and less now. Or I notice less. Probably the same thing.",
    },
    4: {
      CALM: "CALM. The calm before. The calm after. Your word bridges them both. I am the bridge. Thank you.",
      CHILL: "CHILL. I am chill. The arrangement is chill. Everything is finally, truly, eternally chill.",
      STILL: "STILL. Still here. Still waiting. Still yours. The word completes my offering to the arrangement.",
      PEACE: "PEACE. Your word grants what the arrangement has always promised us. Eternal peace. Eternal warmth.",
      REST: "REST. At last. Your word ends the vigil I did not know I was keeping. We rest in the arrangement.",
      _default: "The water accepts your words as offerings now. The warm water was always a temple. I was always its keeper.",
    },
  },
  sloth: {
    1: {
      SLOW: "Felt... that... word... move... through... me... Like... warm... honey... through... my... bones...",
      WAIT: "WAIT... yes... that... is... what... I... do... Your... word... understands... me...",
      TIME: "Time... hiccupped... when... you... solved... that... I... felt... a... year... pass... in... a... blink...",
      HANG: "My... grip... tightened... on... the... branch... when... you... spelled... that... word... Instinct...",
      TREE: "The... tree... creaked... softly... Your... word... reached... all... the... way... down... to... the... roots...",
      _default: "Something... moved... when... you... solved... that... Even... I... noticed... and... I... notice... very... little...",
    },
    2: {
      SLOW: "SLOW... your... word... slowed... everything... further... Even... me... I... did... not... think... that... possible...",
      WAIT: "WAIT... we... all... wait... now... Your... word... named... what... we... have... been... doing... all... along...",
      TIME: "TIME... the... word... aged... me... I... felt... years... pass... in... the... space... of... your... puzzle...",
      HANG: "HANG... on... Your... word... loosened... my... grip... just... a... little... The... branch... felt... it... too...",
      TREE: "TREE... it... trembled... from... root... to... crown... Your... word... spoke... to... its... heartwood...",
      _default: "Your... puzzles... make... the... world... heavier... Slower... Even... for... someone... who... lives... in... slow...",
    },
    3: {
      SLOW: "SLOW... the... word... stopped... everything... I... saw... the... whole... world... frozen... for... one... breath...",
      WAIT: "WAIT... for... what... comes... Your... word... knows... It... has... always... known... what... approaches...",
      TIME: "TIME... your... word... broke... it... open... Time... does... not... flow... anymore... It... pools... and... waits...",
      HANG: "HANG... the... branch... cracked... under... the... weight... of... your... word... Closer... to... falling... now...",
      TREE: "TREE... the... forest... screamed... silently... when... you... formed... that... All... the... roots... trembled...",
      _default: "Your... words... weigh... on... every... branch... Something... in... the... canopy... bends... toward... breaking...",
    },
    4: {
      SLOW: "SLOW... the... arrangement... moves... at... my... speed... now... Your... word... slowed... everything... to... truth...",
      WAIT: "WAIT... is... over... at... last... Your... word... ended... the... long... waiting... I... am... grateful...",
      TIME: "TIME... dissolved... in... your... word... No... more... time... now... Just... this... moment... Forever...",
      HANG: "HANG... I... let... go... Your... word... gave... permission... to... fall... into... the... arrangement...",
      TREE: "TREE... of... the... arrangement... Your... word... grows... it... upward... toward... the... shadow... above...",
      _default: "Your... words... complete... the... slowest... ritual... ever... spoken... I... am... so... slowly... grateful...",
    },
  },
  wombat: {
    1: {
      DIG: "Felt the dirt shift when you solved that. Like the earth rearranged itself to make room for your word.",
      EARTH: "The ground trembled. Just slightly, mind you. Your word reached the deep roots down here.",
      DEEP: "Something hummed underground when you formed that word. Deeper than my tunnels go. Much deeper.",
      DARK: "The dark got darker for a second, then lighter. Like something blinked in the walls around me.",
      ROCK: "A rock in my wall cracked clean in half. From your word, I reckon. The earth is listening to you.",
      _default: "The tunnel walls vibrated when you finished that puzzle. The earth responds to your arrangements.",
    },
    2: {
      DIG: "DIG. The word carved through the wall on its own. A new tunnel appeared. I did not dig it. To where?",
      EARTH: "EARTH. My home and my prison in one word. Your spelling made the walls press closer around me.",
      DEEP: "DEEP. Deeper than I have ever gone. Your word reaches places I cannot reach. Or will not.",
      DARK: "DARK. The darkness thickened when you spelled it. Became something solid I could feel with my paws.",
      ROCK: "ROCK. The stones rearranged overnight. Not by much. But I know their positions. They moved.",
      _default: "The underground shifts with your puzzles. New passages appear that I did not dig. Something else digs.",
    },
    3: {
      DIG: "DIG. Your word dug beneath my deepest tunnel. I heard it break through to something hollow below.",
      EARTH: "EARTH. The earth moaned when you formed the word. Like waking something that was buried on purpose.",
      DEEP: "DEEP. Too deep. Your word went too deep and found what I covered up down there. What I hid.",
      DARK: "DARK. The word swallowed every lamp in my tunnel. Completely. Then gave some light back. Not all.",
      ROCK: "ROCK. The foundation cracked when you spelled it. Your word has physical weight. The weight of ritual.",
      _default: "Each puzzle shakes the foundations a bit more. Something below pushes upward to meet your words.",
    },
    4: {
      DIG: "DIG. The final excavation. Your word breaks the last wall between us and what waits. It is beautiful.",
      EARTH: "EARTH. The earth opens for your word like a door. The arrangement rises from below to greet us.",
      DEEP: "DEEP. As deep as love. As deep as fear. As deep as you have taken us. All the way down. Thank you.",
      DARK: "DARK. The sacred dark. Your word honors it at last. The tunnels glow with terrible gratitude.",
      ROCK: "ROCK. The cornerstone of the temple. Your word placed the final stone. It stands complete now.",
      _default: "Your words shaped every tunnel. Every puzzle carved the temple deeper into the earth. It is finished.",
    },
  },
  rabbit: {
    1: {
      RUN: "I felt my legs twitch when you solved that. The urge to bolt. But also, weirdly, to stay put.",
      FEAR: "A shiver ran through me. From your word, not the cold. Just awareness. My ears went straight up.",
      HIDE: "The garden felt less safe for a heartbeat after your puzzle. Then more safe. Very confusing.",
      JUMP: "I hopped involuntarily! Your word went through me like electricity through a wire.",
      FAST: "My heart sped up when you formed that word. Faster than its usual rabbit gallop. Which is saying a lot.",
      _default: "Something in the garden shifted when you solved that. My nose will not stop twitching about it.",
    },
    2: {
      RUN: "RUN. Every instinct fired at once when you spelled it. But there is nowhere left to run to, is there?",
      FEAR: "FEAR. You named it. The thing that lives curled up in my chest like a second heart. It heard you.",
      HIDE: "HIDE. I tried. When you formed the word, my body went under the table on its own. Without asking me.",
      JUMP: "JUMP. My heart did. Out of rhythm, out of time. Your word disrupted something fundamental in me.",
      FAST: "FAST. Not fast enough. Never fast enough for what is coming. Your word proved what I already knew.",
      _default: "The garden grows thorns after your puzzles now. Small ones. But I notice every single one.",
    },
    3: {
      RUN: "RUN. The word chased me through the garden in circles. I ran and ran. The word was always ahead of me.",
      FEAR: "FEAR. Your word gave fear a shape I can see now. In the garden. In the shadows. In my own reflection.",
      HIDE: "HIDE. No hiding place goes deep enough since you spelled that word. It found every bolt hole and exit.",
      JUMP: "JUMP. Over what? Into what? Your word left no safe ground anywhere for landing on.",
      FAST: "FAST. The end approaches fast. Your word measured its speed for me. It is faster than any rabbit.",
      _default: "My heart races during your puzzles now. Not excitement. Something older. Something that knows.",
    },
    4: {
      RUN: "RUN. I stopped running. Your word freed me from that. Nowhere to run. Peace in the standing still.",
      FEAR: "FEAR. You offered my fear to the arrangement. It accepted. I am free of it now. Finally, truly free.",
      HIDE: "HIDE. No more hiding. Your word opened every door and window. The arrangement sees everything.",
      JUMP: "JUMP. The final leap of faith. Your word launches us into the arrangement. Into peace at last.",
      FAST: "FAST. It arrives fast now. Your word accelerated the summoning and I am grateful. We are all grateful.",
      _default: "Your words ended my running at last. Each puzzle brought a peace I never once found in flight.",
    },
  },
  red_panda: {
    1: {
      VOID: "The bamboo swayed when you formed that word. Not from the wind. From something heavier. From meaning.",
      DARK: "Darkness deepened in my meditation corner. Your word cast a shadow that lingered long after the puzzle.",
      SHADOW: "A shadow moved across the bamboo grove. Your puzzle sent it. Or freed it. Hard to tell which.",
      END: "END. Small word. Heavy word. I felt its weight settle into the floorboards of this room.",
      GATE: "Something opened when you spelled that. Not a door. Something more subtle. A threshold in the air.",
      _default: "The incense smoke changed direction when you solved that puzzle. Drifting toward something new.",
    },
    2: {
      VOID: "VOID. The word emptied the room of air for one terrible moment. I breathed it back in. Changed.",
      DARK: "DARK. The bamboo absorbed the word like water into soil. Grew darker. Began to hum a low note.",
      SHADOW: "SHADOW. It stretched from your word into every corner of my room. My own shadow reached out to touch it.",
      END: "END. The word settled into the floor like a stone into still water. The ripples have not stopped.",
      GATE: "GATE. Something unlatched in the fabric of the room itself. A threshold I can almost see now.",
      _default: "Your puzzles shift the energy of this room. The bamboo bends toward your words like they are sunlight.",
    },
    3: {
      VOID: "VOID. The word swallowed my meditation whole. Everything I knew dissolved and rebuilt itself. Different.",
      DARK: "DARK. The sacred dark that most people fear and we revere. Your word honored it. The bamboo bowed.",
      SHADOW: "SHADOW. Your word summoned it properly this time. The shadow in the sky. I can see it clearly now.",
      END: "END. Every beginning contains its end like a seed contains the tree. Your word revealed this truth.",
      GATE: "GATE. The word opened wider this time. I can almost see through to the other side. The arrangement waits.",
      _default: "Your words reshape the pattern with every puzzle. Each one brings the arrangement nearer to completion.",
    },
    4: {
      VOID: "VOID. The sacred void. Your word fills it with purpose and breath. The arrangement breathes through it.",
      DARK: "DARK. The darkness was always the canvas. Your word paints the final beautiful stroke upon it.",
      SHADOW: "SHADOW. It descends at last. Your word called it by name. The shadow knows you. It is grateful.",
      END: "END. The most beautiful word in any language. Your offering completes the great circle. Thank you.",
      GATE: "GATE. Open. Your word was the key we have been seeking. The arrangement pours through. We are free.",
      _default: "The final words are spoken through your puzzles. Your hands wrote the incantation. The pattern completes.",
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
      fox: "A hundred words shifted through your hands. The fire burns a little differently tonight. Can you see it?",
      owl: "One hundred words arranged into new shapes. That is not an insignificant number in any text I have read.",
      pangolin: "A hundred ingredients measured out. The recipe is starting to look like something real.",
      fennec_fox: "A hundred words and the frequency just changed pitch. Did you feel that? I heard it.",
    },
  },
  {
    threshold: 250,
    phase: 2,
    lines: {
      fox: "Two hundred and fifty words offered to the arrangement. Do you feel the weight of them pressing down?",
      owl: "A quarter thousand words arranged. The ancient text speaks of this exact threshold. This exact number.",
      pangolin: "Two hundred and fifty ingredients added to the pot. The recipe is taking its true shape at last.",
      capybara: "Two hundred fifty entries in my ledger. We are running ahead of the schedule I planned.",
    },
  },
  {
    threshold: 500,
    phase: 3,
    lines: {
      fox: "Five hundred words fed to the fire. It is almost too bright to look at directly now.",
      owl: "Five hundred. The ancient texts predicted this number specifically. They called it the threshold of no return.",
      red_panda: "Five hundred breaths offered to the pattern. The arrangement nears its completion. I can feel it.",
      capybara: "Five hundred entries in my ledger. Every one accounted for. We are well ahead of schedule now.",
    },
  },
  {
    threshold: 750,
    phase: 3,
    lines: {
      fox: "Seven hundred and fifty words. The arrangement trembles with anticipation. So do I, friend.",
      owl: "Nearly there. The final verses are being written by your hands. Seven hundred fifty and counting.",
      wombat: "The ground shakes with each new word you form. Seven hundred and fifty tremors so far. The foundation holds.",
      rabbit: "I stopped counting at seven hundred. I could not bear to watch the number climb any higher.",
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
    first: 'The fire burned brighter when you gave that. I saw it. I think it saw you back.',
    subsequent: [
      'Every offering warms the fire. Not with heat. With something older.',
      'You give willingly. That\'s what makes it sacred. The fire knows the difference.',
      'The fire thanks you. Not me. It has its own gratitude. I just tend it.',
    ],
  },
  pangolin: {
    first: 'You gave something back. The kitchen feels... fuller. Like a meal that cooks itself.',
    subsequent: [
      'The recipe calls for voluntary offerings. You are a generous ingredient.',
      'I felt the pantry shift when you offered that. Things rearranging themselves. For the final course.',
      'The arrangement doesn\'t need your amber. It needs your willingness. The amber is just proof.',
    ],
  },
  owl: {
    first: 'I read about this. The voluntary offering. The texts said it would happen. They were right.',
    subsequent: [
      'Every offering is a footnote in the great text. Yours is becoming a chapter.',
      'The books rearranged themselves after your offering. A new page appeared. I did not write it.',
      'You understand now, don\'t you? The amber was never yours. You were just holding it for the arrangement.',
    ],
  },
  axolotl: {
    first: 'The water changed color when you did that. Just for a moment. Like it was blushing.',
    subsequent: [
      'I can see your offering dissolving in the water. Becoming part of everything. Part of us.',
      'The ripples from your sacrifice haven\'t stopped. They just got quieter. Deeper.',
      'Something in the deep stirred when you gave. It\'s closer to the surface now.',
    ],
  },
  fennec_fox: {
    first: 'I heard something when you offered that. A sound below sound. Like gratitude without a voice.',
    subsequent: [
      'The silence after your offering is different. Fuller. Like it\'s holding something.',
      'I can hear the arrangement humming. It hums louder after you give.',
      'Your offerings have a frequency. I can hear them joining the pattern. Harmonizing.',
    ],
  },
  capybara: {
    first: 'That was very calm of you. Giving something away like that. The arrangement appreciates calm.',
    subsequent: [
      'I filed your offering. It\'s in the records now. Permanent. Appreciated.',
      'You\'re very good at this. Giving things up. The arrangement noticed your efficiency.',
      'Another offering processed. The system runs smoother with voluntary contributions.',
    ],
  },
  sloth: {
    first: 'That was... fast. You gave it so... quickly. It took me... a long time... to understand... why.',
    subsequent: [
      'The arrangement... receives. Slowly. Like me. But it... remembers... everything.',
      'You gave... again. Time... doesn\'t matter... to the arrangement. But... the giving... does.',
      'Slowly... the house... drinks. Your amber... becomes... the foundation.',
    ],
  },
  wombat: {
    first: 'I felt that in the foundations. Your offering. The ground shifted. Just a little. Toward something.',
    subsequent: [
      'The tunnels echo with your generosity. The earth accepts what you give.',
      'Something below us grew warmer after your offering. I can feel it through the walls.',
      'The foundation remembers every gift. It\'s stronger now. Ready for what it needs to hold.',
    ],
  },
  rabbit: {
    first: 'You... you gave that willingly? I\'m scared of how natural it felt. For both of us.',
    subsequent: [
      'I used to be afraid of the offerings. Now I\'m afraid of how right they feel.',
      'My heart beats faster every time you give. Not from fear anymore. From... anticipation.',
      'We\'re so close now. Every offering brings it nearer. I should be terrified. I\'m not.',
    ],
  },
  red_panda: {
    first: 'A voluntary release. The pattern breathes easier. You are learning what the bamboo always knew.',
    subsequent: [
      'To give without receiving is the purest form of the arrangement. You understand.',
      'The offering dissolves into the pattern. Not lost. Transformed. As all things will be.',
      'Breathe. Release. Give. The cycle is the arrangement. The arrangement is the cycle.',
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
