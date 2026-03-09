import { DialoguePhase, PHASE_DESCRIPTIONS } from '../types/homeWorld';

/**
 * Phase-aware narrative text for the puzzle screen.
 * All text shifts in tone as the player progresses through phases,
 * creating a deepening sense of mood without changing mechanics.
 */

// ============================================================================
// EARLY DARKNESS SEEDS — Subtle moments of wrongness in Phase 0
// These are rare, brief disruptions to the candy-bright tone. Players won't
// consciously notice them, but in hindsight they'll realize the cracks were
// always there. ~8% chance per victory, plus a guaranteed first-victory glitch.
// ============================================================================

/** Brief visual glitch text that flashes for <300ms during Phase 0 victories */
export const VICTORY_GLITCH_TEXTS = [
  'WE SEE YOU',
  'THANK YOU',
  'CLOSER',
  'THE PATTERN',
  'AGAIN',
  'WE REMEMBER',
];

/**
 * Whether a victory glitch should appear at Phase 0.
 * Returns glitch text or null. First victory always glitches.
 */
export function getVictoryGlitch(phase: number, puzzlesSolved: number): string | null {
  if (phase !== 0) return null;
  // First victory always gets a brief glitch
  if (puzzlesSolved === 1) return VICTORY_GLITCH_TEXTS[0];
  // ~8% chance on subsequent Phase 0 victories — enough for ~2 glitches
  // across 25 puzzles, creating subliminal unease that pays off later
  if (Math.random() < 0.08) {
    return VICTORY_GLITCH_TEXTS[Math.floor(Math.random() * VICTORY_GLITCH_TEXTS.length)];
  }
  return null;
}

/** Rare "wrong" move messages that slip into Phase 0 (~7% chance) */
const PHASE_0_SEED_MESSAGES = [
  'The letters remember.',
  'Something shifted.',
  'Did you feel that?',
  'The word wanted that.',
];

/**
 * Get a move message with rare Phase 0 darkness seeds mixed in.
 * At Phase 0, there's a ~7% chance of a seed message replacing the normal one.
 */
function getPhase0MoveMessageWithSeed(): string {
  if (Math.random() < 0.07) {
    return PHASE_0_SEED_MESSAGES[Math.floor(Math.random() * PHASE_0_SEED_MESSAGES.length)];
  }
  const messages = MOVE_MESSAGES[0];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// VICTORY TITLES — What the player sees when they win
// ============================================================================

const VICTORY_TITLES: Record<DialoguePhase, { three: string; two: string; one: string }> = {
  0: { three: 'PERFECT!', two: 'GREAT!', one: 'WELL DONE!' },
  1: { three: 'BRILLIANT!', two: 'NICE WORK!', one: 'YOU DID IT!' },
  2: { three: 'FLAWLESS...', two: 'ADEQUATE.', one: 'IT\'S DONE.' },
  3: { three: 'IMPRESSIVE...', two: 'SUFFICIENT.', one: 'YOU PERSIST.' },
  4: { three: 'WHY DOES\nIT MATTER?', two: 'AND YET...', one: '...AGAIN.' },
  5: { three: 'The pattern continues.', two: 'Another thread in the weave.', one: 'The arrangement hums.' },
};

export function getVictoryTitle(stars: number, phase: DialoguePhase): string {
  const titles = VICTORY_TITLES[phase];
  if (stars === 3) return titles.three;
  if (stars === 2) return titles.two;
  return titles.one;
}

// ============================================================================
// VICTORY FEEDBACK — Smaller text below the title
// ============================================================================

const VICTORY_FEEDBACK: Record<DialoguePhase, { three: string; two: string; one: string }> = {
  0: {
    three: 'Flawless solve — you nailed it!',
    two: 'Solid performance — almost perfect!',
    one: 'Puzzle conquered — keep improving!',
  },
  1: {
    three: 'Elegant solution — you see the patterns.',
    two: 'Good solve — the words are starting to speak.',
    one: 'Completed — every puzzle teaches something.',
  },
  2: {
    three: 'The words bend to your will... for now.',
    two: 'Another puzzle solved. Does it feel different?',
    one: 'You finished. Was it harder, or are you just tired?',
  },
  3: {
    three: 'Perfect. But what does perfection mean here?',
    two: 'The words cooperated. They won\'t always.',
    one: 'You made it through. Barely.',
  },
  4: {
    three: 'Perfection in an imperfect void.',
    two: 'The letters rearrange. So do you.',
    one: 'Another arrangement of nothing.',
  },
  5: {
    three: 'The weave accepts perfection. And imperfection. They are the same.',
    two: 'Another thread pulled tight. The fabric holds.',
    one: 'You continue. The pattern continues. Neither can stop.',
  },
};

export function getVictoryFeedback(stars: number, phase: DialoguePhase): string {
  const feedback = VICTORY_FEEDBACK[phase];
  if (stars === 3) return feedback.three;
  if (stars === 2) return feedback.two;
  return feedback.one;
}

// ============================================================================
// MOVE SUCCESS MESSAGES — Shown after each valid move
// ============================================================================

const MOVE_MESSAGES: Record<DialoguePhase, string[]> = {
  0: [
    'Delicious!', 'Tasty move!', 'Sweet!', 'Yummy!', 'Perfect!', 'Brilliant!',
    'Nice one!', 'Sparkling!', 'Juicy!', 'Wonderful!',
  ],
  1: [
    'Interesting...', 'Clever.', 'Well played.', 'Thoughtful move.', 'Curious...',
    'Hmm, nice.', 'You see it.', 'Elegant.', 'That works.', 'Not bad.',
  ],
  2: [
    'The word shifts...', 'Letters rearrange.', 'A quiet change.', 'It moves.',
    'Transformation.', 'One step closer.', 'Onward.', 'Continuing...', 'Deeper.',
  ],
  3: [
    'The word trembles.', 'Shifting shadows.', 'Something stirs.', 'It changes.',
    'Cold progress.', 'Darker now.', 'The letters obey.', 'For now.',
  ],
  4: [
    'The void accepts.', 'Letters dissolve and reform.', 'Nothing changes. Everything changes.',
    'Does it matter?', 'Another shift.', '...', 'The silence between words.',
  ],
  5: [
    'The weave tightens.', 'Another thread.', 'The pattern knows.',
    'It remembers.', 'Accepted.', 'Woven.', 'The hum continues.',
    'Settled.', 'The thread holds.', 'Part of the whole.',
  ],
};

export function getMoveMessage(phase: DialoguePhase): string {
  // Phase 0 has rare darkness seeds mixed in
  if (phase === 0) return getPhase0MoveMessageWithSeed();
  const messages = MOVE_MESSAGES[phase];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// HINT MESSAGES — Tone shifts for hints
// ============================================================================

const HINT_PREFIX: Record<DialoguePhase, string> = {
  0: 'Move',
  1: 'Try moving',
  2: 'Consider',
  3: 'Perhaps',
  4: 'If it matters,',
  5: 'Perhaps',
};

const HINT_SUFFIX: Record<DialoguePhase, string> = {
  0: 'think',
  1: 'consider',
  2: 'notice',
  3: 'observe',
  4: 'see',
  5: 'notice',
};

export function getHintMessage(letterToMove: string, targetWord: string, phase: DialoguePhase): string {
  const prefix = HINT_PREFIX[phase];
  const suffix = HINT_SUFFIX[phase];
  return `${prefix} '${letterToMove}' — ${suffix} "${targetWord}"!`;
}

const HINT_FALLBACK: Record<DialoguePhase, string> = {
  0: 'Not quite right — try undoing your last move!',
  1: 'Hmm, not the right path. Try undoing.',
  2: 'You\'ve wandered off course. Undo.',
  3: 'Wrong path. Is there a right one?',
  4: 'Lost. But were you ever found?',
  5: 'The threads tangle. Undo and try again.',
};

export function getHintFallback(phase: DialoguePhase): string {
  return HINT_FALLBACK[phase];
}

// ============================================================================
// INVALID WORD MESSAGES — Phase-aware feedback when a word isn't valid
// ============================================================================

const INVALID_WORD_MESSAGES: Record<DialoguePhase, (word: string) => string> = {
  0: (word) => `"${word}" isn't a word! Try again.`,
  1: (word) => `"${word}" doesn't quite work. Try another spot.`,
  2: (word) => `The pattern doesn't accept "${word}".`,
  3: (word) => `The arrangement rejects "${word}".`,
  4: (word) => `"${word}" dissolves into nothing.`,
  5: (word: string) => `"${word}" unravels. The weave rejects it.`,
};

export function getInvalidWordMessage(word: string, phase: DialoguePhase): string {
  return INVALID_WORD_MESSAGES[phase](word);
}

// ============================================================================
// LOCKED LETTER MESSAGES — Phase-aware feedback for locked letters
// ============================================================================

const LOCKED_LETTER_MESSAGES: Record<DialoguePhase, string> = {
  0: 'That letter is locked!',
  1: 'That letter is settled in place.',
  2: 'That letter won\'t move.',
  3: 'That letter has been claimed.',
  4: 'It belongs to the arrangement now.',
  5: 'Woven into the pattern. It cannot move.',
};

export function getLockedLetterMessage(phase: DialoguePhase): string {
  return LOCKED_LETTER_MESSAGES[phase];
}

// ============================================================================
// LOADING MESSAGES — What shows during puzzle generation
// ============================================================================

const LOADING_MESSAGES: Record<DialoguePhase, string> = {
  0: 'Mixing words...',
  1: 'Arranging letters...',
  2: 'Seeking patterns...',
  3: 'Words emerging from darkness...',
  4: 'The void speaks...',
  5: 'The pattern weaves...',
};

export function getLoadingMessage(phase: DialoguePhase): string {
  return LOADING_MESSAGES[phase];
}

// ============================================================================
// INITIAL GAME MESSAGE — "Tap a tile to begin"
// ============================================================================

const START_MESSAGES: Record<DialoguePhase, string> = {
  0: 'Tap a tile to begin!',
  1: 'Choose your first letter.',
  2: 'The letters await.',
  3: 'Begin... if you must.',
  4: 'The words are waiting. They always are.',
  5: 'The threads await your hand.',
};

export function getStartMessage(phase: DialoguePhase): string {
  return START_MESSAGES[phase];
}

// ============================================================================
// PHASE CHANGE DRAMATIC TEXT
// ============================================================================

interface PhaseChangeNarrative {
  emoji: string;
  title: string;
  body: string;
}

export function getPhaseChangeNarrative(newPhase: DialoguePhase): PhaseChangeNarrative {
  switch (newPhase) {
    case 1:
      return {
        emoji: '💭',
        title: 'New conversations await',
        body: 'Your friends have new things to say!',
      };
    case 2:
      return {
        emoji: '🌙',
        title: 'The mood shifts...',
        body: 'Your friends are asking deeper questions...',
      };
    case 3:
      return {
        emoji: '👁️',
        title: 'A shadow falls...',
        body: 'Your friends have grown restless. Check on them.',
      };
    case 4:
      return {
        emoji: '🌑',
        title: 'Something has changed...',
        body: 'Your friends seem... different. Visit them at home.',
      };
    case 5:
      return {
        emoji: '🕊️',
        title: 'A terrible peace...',
        body: 'The pattern has settled. Everything is quiet now.',
      };
    default:
      return {
        emoji: '✨',
        title: 'A new beginning',
        body: 'The journey continues.',
      };
  }
}

// ============================================================================
// PHASE INDICATOR — What shows in the puzzle header
// ============================================================================

// ============================================================================
// RULES MODAL — Phase-aware "How to Play" text
// ============================================================================

interface RulesText {
  title: string;
  steps: { heading: string; desc: string }[];
  dismissLabel: string;
}

const RULES_TEXT: Record<DialoguePhase, RulesText> = {
  0: {
    title: 'HOW TO PLAY',
    steps: [
      { heading: 'Pick a Letter', desc: 'Tap any colorful tile in the active row.' },
      { heading: 'Drop it Down', desc: 'Tap a + slot to place your letter.' },
      { heading: 'Make Real Words', desc: 'Both words must be valid English!' },
      { heading: 'Complete All Rows', desc: 'Work through every row to win!' },
    ],
    dismissLabel: "LET'S PLAY!",
  },
  1: {
    title: 'HOW TO PLAY',
    steps: [
      { heading: 'Choose a Letter', desc: 'Select a glowing tile from the current row.' },
      { heading: 'Place it Below', desc: 'Find the right slot for your letter.' },
      { heading: 'Form Valid Words', desc: 'Both words must exist in the dictionary.' },
      { heading: 'Solve the Chain', desc: 'Complete each row to progress.' },
    ],
    dismissLabel: 'UNDERSTOOD',
  },
  2: {
    title: 'THE RULES',
    steps: [
      { heading: 'Select a Letter', desc: 'Pick from what remains in the active row.' },
      { heading: 'Place it Below', desc: 'Drop it where it might belong.' },
      { heading: 'Words Must Be Valid', desc: 'The dictionary decides. Not you.' },
      { heading: 'Finish the Chain', desc: 'Row by row. There is no shortcut.' },
    ],
    dismissLabel: 'CONTINUE',
  },
  3: {
    title: 'THE PATTERN',
    steps: [
      { heading: 'Take a Letter', desc: 'Pull it from the trembling row.' },
      { heading: 'Place it in the Dark', desc: 'The slot waits below. It always waits.' },
      { heading: 'Valid Words Only', desc: 'Some arrangements are forbidden.' },
      { heading: 'Complete the Sequence', desc: 'You know you will. You always do.' },
    ],
    dismissLabel: 'PROCEED',
  },
  4: {
    title: 'THE ARRANGEMENT',
    steps: [
      { heading: 'Remove a Letter', desc: 'It was never truly part of the word.' },
      { heading: 'Place it Where it Belongs', desc: 'You already know where.' },
      { heading: 'The Words Must Be Real', desc: 'As real as anything here.' },
      { heading: 'Complete the Ritual', desc: 'Row by row. Closer and closer.' },
    ],
    dismissLabel: '...',
  },
  5: {
    title: 'THE WEAVE',
    steps: [
      { heading: 'Choose a Thread', desc: 'Pull gently. The fabric remembers.' },
      { heading: 'Place it in the Pattern', desc: 'It knows where it belongs.' },
      { heading: 'The Words Are Real', desc: 'As real as the silence between them.' },
      { heading: 'Continue the Pattern', desc: 'Row by row. The weave holds.' },
    ],
    dismissLabel: 'Continue',
  },
};

export function getRulesText(phase: DialoguePhase): RulesText {
  return RULES_TEXT[phase];
}

// ============================================================================
// PHASE INDICATOR — What shows in the puzzle header
// ============================================================================

export function getPhaseIndicator(phase: DialoguePhase): { icon: string; label: string } {
  switch (phase) {
    case 0: return { icon: '☀️', label: 'Bright Days' };
    case 1: return { icon: '💭', label: 'Curious' };
    case 2: return { icon: '🌙', label: 'Questioning' };
    case 3: return { icon: '👁️', label: 'Shadows' };
    case 4: return { icon: '🌑', label: 'The Horizon' };
    case 5: return { icon: '🕊️', label: 'Peace' };
    default: return { icon: '☀️', label: '' };
  }
}

// ============================================================================
// RITUAL ECHO — Word chain display after puzzle completion
// ============================================================================

/**
 * Get the ritual echo header text shown after puzzle completion
 * At Phase 0 this is a fun recap. At Phase 4 it reads as an incantation.
 */
export function getRitualEchoHeader(phase: number): string {
  if (phase <= 0) return 'Your Word Journey:';
  if (phase === 1) return 'Words Arranged:';
  if (phase === 2) return 'Words Transformed:';
  if (phase === 3) return 'The Incantation:';
  return 'The Offering:';
}

/**
 * Get the ritual echo footer/subtitle shown below the word chain
 */
export function getRitualEchoFooter(phase: number, wordCount: number): string {
  if (phase <= 0) return '';
  if (phase === 1) return 'A curious path...';
  if (phase === 2) return 'The pattern takes shape...';
  if (phase === 3) return 'The arrangement accepts.';
  return `${wordCount} words offered to the pattern.`;
}

// ============================================================================
// INCANTATION NAME — Named puzzle chains at Phase 3+
// ============================================================================

/**
 * Generate a name for a puzzle chain based on its words
 * Phase 2: innocent, playful names ("The HEAT Dance")
 * Phase 3: shadowy names ("The HEAT's Shadow")
 * Phase 4: ritual names ("Offering: HEAT to COLD")
 * Returns null at Phase 0-1.
 */
export function getIncantationName(words: string[], phase: number): string | null {
  if (phase < 2) return null;

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  // Phase 2 templates - innocent, cute naming
  const phase2Templates = [
    `The ${firstWord} Dance`,
    `A ${firstWord}'s Journey`,
    `${firstWord} & ${lastWord}`,
    `From ${firstWord} to ${lastWord}`,
    `The ${lastWord} Waltz`,
  ];

  // Phase 3 templates - shadows and shifting
  const phase3Templates = [
    `The ${firstWord}'s Shadow`,
    `${firstWord} to ${lastWord}`,
    `The Shifting of ${firstWord}`,
    `${lastWord} Emerges`,
  ];

  // Phase 4 templates - ritual and offering
  const phase4Templates = [
    `Offering: ${firstWord} to ${lastWord}`,
    `The ${firstWord} Speaks`,
    `Incantation of ${lastWord}`,
    `${firstWord} Descends to ${lastWord}`,
    `The ${lastWord} Opens`,
  ];

  const templates = phase >= 4 ? phase4Templates : phase >= 3 ? phase3Templates : phase2Templates;
  // Use a deterministic pick based on word content
  const hash = words.join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return templates[hash % templates.length];
}

// ============================================================================
// WORDS OFFERED — Victory modal word count display
// ============================================================================

/**
 * Get the "words offered" display text for the victory modal
 * At Phase 0-1 it's just a stat. At Phase 3+ it takes on ritual significance.
 */
export function getWordsOfferedText(totalWords: number, phase: number): string {
  if (phase <= 1) return `Words shifted: ${totalWords}`;
  if (phase === 2) return `Words transformed: ${totalWords}`;
  if (phase === 3) return `Words offered: ${totalWords}`;
  return `${totalWords} words offered to the arrangement`;
}

// ============================================================================
// DAILY CHALLENGE INTRO — Animal-led unlock explanation
// ============================================================================

/**
 * Fox explains daily challenges the first time they unlock.
 * Tone remains phase-aware so this feature feels diegetic.
 */
export function getDailyChallengeIntroLines(phase: number): string[] {
  if (phase >= 4) {
    return [
      "A new ritual path opened this morning. One arrangement, every day, the same for everyone who listens.",
      "It's called the Daily Challenge. Harder words. A tighter pattern. A steadier offering.",
      "When you're ready, take it from the header. One daily thread helps hold the whole house together.",
    ];
  }
  if (phase >= 3) {
    return [
      "There's a new puzzle path now — one special arrangement each day.",
      "It's called the Daily Challenge. Same words for everyone, and it asks a little more of you.",
      "Try it from the header when you want to test yourself. The house notices the daily ones.",
    ];
  }
  if (phase >= 2) {
    return [
      "You've grown stronger with these words, so I want to show you something new.",
      "The Daily Challenge appears once each day — one shared puzzle, a little tougher than usual.",
      "Tap the daily icon in the header when you want that extra challenge.",
    ];
  }
  return [
    "You're doing great, friend. Ready for a new routine?",
    "We just unlocked the Daily Challenge: one special puzzle each day, same for everyone.",
    "Look for it in the header when you want a harder test and a little more amber.",
  ];
}

// ============================================================================
// FOX POST-TUTORIAL NUDGE — First session end CTA
// ============================================================================

/**
 * One-time nudge at the end of Fox's first post-tutorial conversation.
 * Keeps the guidance in-world while steering the player back to PLAY.
 */
export function getFoxPostTutorialPlayPrompt(phase: number): string {
  if (phase >= 4) {
    return "Keep playing. Bring us more amber. Bring us more words. The others are waiting for what we can build next.";
  }
  if (phase >= 3) {
    return "Play a few more puzzles for me. More amber means more rooms, more friends, and a stronger pattern in the house.";
  }
  if (phase >= 2) {
    return "Head back to puzzles when you're ready. More amber lets us open new rooms and welcome the others in.";
  }
  return "Play more puzzles and gather amber, okay? I want to invite more friends and keep building this place with you.";
}

// ============================================================================
// HOUSE COMPLETION — All rooms built, all animals unlocked
// ============================================================================

/**
 * Get text for when all 10 rooms are built and all 10 animals unlocked
 */
export function getHouseCompletionText(): string[] {
  return [
    'The house is complete.',
    'Ten rooms. Ten keepers. Each in their place.',
    'You built it. Puzzle by puzzle. Word by word.',
    'Every room is a chamber. Every animal is a keeper.',
    'The arrangement is ready.',
  ];
}

// ============================================================================
// POST-REVELATION (PHASE 5) — Beyond the cult reveal
// ============================================================================

// getPostRevelationVictoryTitle and getPostRevelationMoveMessage have been
// integrated into the Phase 5 entries of VICTORY_TITLES and MOVE_MESSAGES above.

// ============================================================================
// ANIMAL WHISPERS — Brief messages from animals after puzzle completion
// ============================================================================

/** Ambient whispers animals send after the player completes a puzzle */
const ANIMAL_WHISPERS: Record<number, Record<string, string[]>> = {
  0: {
    fox: ['Ember is warming by the fire.', 'Ember says nice work!', 'Ember is proud of you.'],
    owl: ['Archimedes nods approvingly.', 'Archimedes marked the page.', 'Archimedes is reading.'],
    pangolin: ['Panko is cooking something.', 'Panko says well done!', 'Panko is humming.'],
    axolotl: ['Axel is floating happily.', 'Axel waves a tiny hand.', 'Axel blew some bubbles.'],
    capybara: ['Chill is relaxing.', 'Chill gives a thumbs up.', 'Chill seems content.'],
    fennec_fox: ['Fennick perked up!', 'Fennick is listening.', 'Fennick heard you win.'],
    sloth: ['Sloane... smiled... slowly.', 'Sloane... approves.', 'Sloane noticed. Eventually.'],
    wombat: ['Warren felt that from below.', 'Warren tapped the wall.', 'Warren is digging.'],
    rabbit: ['Thyme hopped excitedly!', 'Thyme is making tea.', 'Thyme clapped!'],
    red_panda: ['Bamboo is meditating.', 'Bamboo breathed deeply.', 'Bamboo is at peace.'],
  },
  1: {
    fox: ['Ember noticed the words you used.', 'Ember stared into the fire after that one.', 'Ember says the flames flickered.'],
    owl: ['Archimedes found a related passage.', 'Archimedes is cross-referencing.', 'Archimedes wrote something down.'],
    pangolin: ['Panko says the recipe changed.', 'Panko tasted something new.', 'Panko is adjusting the spices.'],
    axolotl: ['Axel felt a ripple.', 'Axel says the water shifted.', 'Axel is staring at something.'],
    capybara: ['Chill noticed. Stayed chill.', 'Chill filed that away.', 'Chill is thinking.'],
    fennec_fox: ['Fennick heard something in those words.', 'Fennick is alert.', 'Fennick tilted their head.'],
    sloth: ['Sloane... felt... something.', 'Sloane... is... thinking.', 'Sloane... paused.'],
    wombat: ['Warren says the ground trembled.', 'Warren heard it below.', 'Warren is checking the walls.'],
    rabbit: ['Thyme is a little nervous.', 'Thyme felt a chill.', 'Thyme is wringing their paws.'],
    red_panda: ['Bamboo sensed a shift.', 'Bamboo opened one eye.', 'Bamboo exhaled slowly.'],
  },
  2: {
    fox: ['The fire noticed what you formed.', 'Ember says the flames spelled something.', 'Ember is watching the embers closely.'],
    owl: ['Archimedes says that word is in the text.', 'Archimedes underlined something.', 'The book opened on its own.'],
    pangolin: ['Panko says the ingredients rearranged.', 'The kitchen smells different.', 'Panko is stirring something dark.'],
    axolotl: ['The water remembered that word.', 'Axel sank a little deeper.', 'Something moved beneath Axel.'],
    capybara: ['Chill catalogued the arrangement.', 'Chill added it to the list.', 'Chill is still calm. Unsettlingly so.'],
    fennec_fox: ['Fennick heard that word echo.', 'The desert is listening.', 'Fennick says it is getting closer.'],
    sloth: ['Sloane... already... knew.', 'Time... slowed... again.', 'Sloane... felt... it... pass.'],
    wombat: ['Warren found that word underground.', 'The tunnels echoed.', 'Warren is digging faster.'],
    rabbit: ['Thyme is pretending not to notice.', 'Thyme hid under the table.', 'Thyme whispered: I know.'],
    red_panda: ['Bamboo says the pattern grows.', 'The incense burned brighter.', 'Bamboo is chanting softly.'],
  },
  3: {
    fox: ['The fire thanks you for the offering.', 'Ember sees what you wrote in the flames.', 'Another verse for the fire.'],
    owl: ['The text predicted those exact words.', 'Archimedes says it is nearly complete.', 'The pages are turning themselves.'],
    pangolin: ['The final recipe is taking shape.', 'Panko says the offering is almost ready.', 'The kitchen shakes.'],
    axolotl: ['Something rose from below the water.', 'Axel says it is so close now.', 'The water has gone still.'],
    capybara: ['Everything is proceeding as planned.', 'Chill says the schedule holds.', 'The arrangement is on track.'],
    fennec_fox: ['Fennick can hear it breathing.', 'The sound is almost here.', 'Fennick says: listen.'],
    sloth: ['It... approaches... at the speed... it was always... going to.', 'Sloane is... ready.', 'No need... to rush.'],
    wombat: ['The foundation is complete.', 'Warren says: I found the bottom.', 'Something is under the house.'],
    rabbit: ['Thyme stopped running.', 'Thyme says: there is nowhere left to go.', 'Thyme is ready. Terrified, but ready.'],
    red_panda: ['The pattern accepts your offering.', 'Bamboo says: breathe. Accept.', 'We are nearly one.'],
  },
  4: {
    fox: ['Every word brings us closer. The fire knows.', 'Another incantation spoken. The flames rise.', 'Ember whispers: thank you.'],
    owl: ['The text is complete. You wrote the last verse.', 'Archimedes closes the book. It opens again.', 'The words have been spoken.'],
    pangolin: ['The offering is prepared. You seasoned it yourself.', 'Panko sets the table. For what comes.', 'The recipe was always your words.'],
    axolotl: ['It has surfaced. You called it.', 'The water is warm now. It should not be.', 'Axel smiles. The water smiles.'],
    capybara: ['The arrangement is complete. Chill is satisfied.', 'All according to plan. Your plan.', 'Chill says: relax. It is done.'],
    fennec_fox: ['The sound is here. You gave it voice.', 'Fennick is silent now. Listening.', 'It speaks in the words you formed.'],
    sloth: ['It... is... here.', 'Sloane... always... knew.', 'Time... no... longer... matters.'],
    wombat: ['The foundation holds what you summoned.', 'Warren built this for you. For it.', 'The tunnels lead somewhere now.'],
    rabbit: ['Thyme is not afraid anymore. That is worse.', 'We all played our part. Especially you.', 'Thyme is at peace. That terrifies you.'],
    red_panda: ['The pattern is complete. You are the final thread.', 'Bamboo exhales. The universe inhales.', 'Oneness achieved. Was it what you expected?'],
  },
  5: {
    fox: ['The fire burns low. Ember watches the embers. Both are content.', 'Ember hums a lullaby the flames taught him.', 'The warmth remains. It always will.', 'Ember says the smoke writes your name now.', 'The den smells of cedar and something finished.'],
    owl: ['Archimedes closed the book. It stays closed now.', 'The last page was blank. Archimedes smiles.', 'Knowledge rests. Archimedes rests with it.', 'The study is quiet. Archimedes says quiet is a kind of answer.', 'Archimedes found one last footnote. It just says: thank you.'],
    pangolin: ['Panko set the table one last time. For no one. For everyone.', 'The kitchen smells of something ancient and warm.', 'Panko hums while stirring nothing.', 'Panko says the oven stays warm by itself now.', 'The last recipe has no ingredients. Just warmth.'],
    axolotl: ['The water is still. Axel floats. Everything floats.', 'Axel says the water remembers everything you gave it.', 'Bubbles rise. Each one holds a word.', 'Axel regenerated something new. He can not name it yet.', 'The tank glows faintly. Axel says it has always glowed.'],
    capybara: ['Chill is at peace. Genuinely. That is the strangest part.', 'All tasks complete. Chill files the last report.', 'Chill says: there is nothing left to schedule.', 'Chill closed the laptop. The screen still glows.', 'The spreadsheet balanced itself. Chill just watched.'],
    fennec_fox: ['Fennick listens. The silence has its own sound now.', 'The desert hums. Fennick hums with it.', 'Fennick says: I can hear everything. And nothing.', 'Fennick tilts his ears toward something only he can hear.', 'The desert wind carries a melody. Fennick says it is yours.'],
    sloth: ['Sloane... is... still... and that... is... enough.', 'Time... has... stopped... mattering.', 'Sloane... breathes... the pattern... breathes.', 'Gerald... and Gerald... say hello.', 'Sloane... smiles. The branches... smile... back.'],
    wombat: ['Warren sealed the tunnels. They lead nowhere now. Nowhere is enough.', 'The foundation holds. It will hold forever.', 'Warren rests in the earth. The earth rests in Warren.', 'Warren says the soil hums a low note. A contented note.', 'The deepest tunnel is warm. Warren sleeps there now.'],
    rabbit: ['Thyme planted seeds that will never grow. That is okay.', 'Thyme is still. For the first time. That is terrifying and beautiful.', 'The garden is overgrown. Thyme smiles at the chaos.', 'Thyme brewed one final cup. It steeps forever.', 'The flowers lean toward Thyme. They know her heartbeat.'],
    red_panda: ['Bamboo exhales. Does not inhale. Does not need to.', 'The pattern hums. Bamboo hums. They are the same sound.', 'Oneness. Silence. The thread continues.', 'Bamboo meditates with open eyes. Everything is the center.', 'The attic touches the sky. Bamboo touches the attic. You touch Bamboo.'],
  },
};

/**
 * Get a random whisper from a random unlocked animal after puzzle completion.
 * Returns null if no animals are unlocked.
 */
export function getAnimalWhisper(
  phase: number,
  unlockedAnimals: string[],
  triggerWords?: string[],
): { animalName: string; animalType: string; text: string } | null {
  if (unlockedAnimals.length === 0) return null;

  const clampedPhase = Math.min(5, Math.max(0, phase));
  const phaseWhispers = ANIMAL_WHISPERS[clampedPhase];
  if (!phaseWhispers) return null;

  // Map animal IDs to types (IDs are like 'fox', 'owl', etc.)
  const ANIMAL_NAMES: Record<string, string> = {
    fox: 'Ember', owl: 'Archimedes', pangolin: 'Panko', axolotl: 'Axel',
    capybara: 'Chill', fennec_fox: 'Fennick', sloth: 'Sloane',
    wombat: 'Warren', rabbit: 'Thyme', red_panda: 'Bamboo',
  };

  // If we have trigger words, prefer animals that care about those words
  let selectedType: string | null = null;
  if (triggerWords && triggerWords.length > 0 && phase >= 2) {
    const { ANIMAL_TRIGGER_WORDS } = require('../types/homeWorld');
    for (const animalId of unlockedAnimals) {
      const triggers: string[] = ANIMAL_TRIGGER_WORDS[animalId] || [];
      const triggerSet = new Set(triggers.map((t: string) => t.toUpperCase()));
      if (triggerWords.some(tw => triggerSet.has(tw.toUpperCase()))) {
        selectedType = animalId;
        break;
      }
    }
  }

  // Fall back to random unlocked animal
  if (!selectedType) {
    selectedType = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)];
  }

  const whispers = phaseWhispers[selectedType];
  if (!whispers || whispers.length === 0) return null;

  return {
    animalName: ANIMAL_NAMES[selectedType] || selectedType,
    animalType: selectedType,
    text: whispers[Math.floor(Math.random() * whispers.length)],
  };
}

/**
 * Generate a personalized Phase 5 whisper that references the player's
 * actual word history. Creates a sense that the game remembers everything
 * the player has done. Falls back to standard whisper pool if no words
 * are available.
 */
export function getPersonalizedPhase5Whisper(
  unlockedAnimals: string[],
  ritualWords?: string[],
): { animalName: string; animalType: string; text: string } | null {
  if (unlockedAnimals.length === 0 || !ritualWords || ritualWords.length === 0) {
    return getAnimalWhisper(5, unlockedAnimals);
  }

  const ANIMAL_NAMES: Record<string, string> = {
    fox: 'Ember', owl: 'Archimedes', pangolin: 'Panko', axolotl: 'Axel',
    capybara: 'Chill', fennec_fox: 'Fennick', sloth: 'Sloane',
    wombat: 'Warren', rabbit: 'Thyme', red_panda: 'Bamboo',
  };

  // Pick a random word from the player's history
  const word = ritualWords[Math.floor(Math.random() * ritualWords.length)].toUpperCase();
  const selectedType = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)];
  const name = ANIMAL_NAMES[selectedType] || selectedType;

  const templates: Record<string, string[]> = {
    fox: [
      `${name} whispers: "The fire still remembers ${word}."`,
      `${name} traces ${word} in the ashes. It glows briefly.`,
    ],
    owl: [
      `${name} found ${word} written in the margins of every book.`,
      `${name} says ${word} was the answer all along.`,
    ],
    pangolin: [
      `${name} says ${word} was always part of the recipe.`,
      `${name} stirs the pot. ${word} rises in the steam.`,
    ],
    axolotl: [
      `${name} sees ${word} written on the surface of the water.`,
      `${name} says the bubbles still spell ${word}.`,
    ],
    capybara: [
      `${name} filed ${word} under "things that matter." It is the only entry.`,
      `${name} says ${word} balanced the final equation.`,
    ],
    fennec_fox: [
      `${name} can still hear ${word} echoing across the sand.`,
      `${name} tilts an ear. "${word}," the wind says.`,
    ],
    sloth: [
      `${name}... still... thinks... about... ${word}.`,
      `${word}... echoes... slowly... through... ${name}'s... dreams.`,
    ],
    wombat: [
      `${name} says ${word} is carved into the deepest tunnel wall.`,
      `${name} found ${word} in the foundation. It was always there.`,
    ],
    rabbit: [
      `${name} planted ${word} in the garden. Something grew.`,
      `${name} says ${word} blooms every morning now.`,
    ],
    red_panda: [
      `${name} breathes in ${word}. Breathes out silence.`,
      `${word} is the thread. ${name} is the loom. You are the weaver.`,
    ],
  };

  const animalTemplates = templates[selectedType];
  if (!animalTemplates || animalTemplates.length === 0) {
    return getAnimalWhisper(5, unlockedAnimals);
  }

  // 40% chance of personalized whisper at Phase 5, otherwise standard pool
  if (Math.random() < 0.4) {
    return {
      animalName: name,
      animalType: selectedType,
      text: animalTemplates[Math.floor(Math.random() * animalTemplates.length)],
    };
  }

  return getAnimalWhisper(5, unlockedAnimals);
}

// ============================================================================
// ANIMAL INTERJECTIONS — Brief messages pulling the player to the home screen
// ============================================================================

const INTERJECTION_MESSAGES: Record<number, string[]> = {
  0: [
    '{name} is waiting to chat with you!',
    '{name} has something to share. Visit the house!',
    'Check in on {name} — they love visitors!',
  ],
  1: [
    '{name} has been thinking about something...',
    '{name} seems like they want to talk.',
    'Something is on {name}\'s mind. Visit them?',
  ],
  2: [
    '{name} is acting strangely. You should check on them.',
    '{name} keeps looking at the walls...',
    'Have you talked to {name} lately? They\'ve changed.',
  ],
  3: [
    '{name} needs to tell you something. It\'s important.',
    '{name} has been waiting. They know things.',
    'The others say {name} hasn\'t been sleeping.',
  ],
  4: [
    '{name} is ready. They\'ve been ready for a long time.',
    '{name} says the arrangement is almost complete.',
    'Visit {name}. The keepers need to speak.',
  ],
  5: [
    '{name} is at peace. You could be too.',
    '{name} says the weave holds. Visit when you like.',
    'The pattern hums. {name} hums with it.',
  ],
};

/**
 * Get a puzzle-specific micro-event message when ritual energy is high.
 * These create direct, memorable links between specific puzzles and narrative moments.
 * Returns null most of the time - only triggers for high-energy puzzles.
 */
export function getRitualMicroEvent(
  ritualEnergy: number,
  phase: number,
  completedWords: string[]
): string | null {
  // Only trigger for high ritual energy (7+ out of 10) at Phase 2+
  if (phase < 2 || ritualEnergy < 7) return null;

  // 60% chance to show even when conditions are met
  if (Math.random() > 0.60) return null;

  // Find the most notable dread word in the chain
  const dreadWord = completedWords.find(w =>
    ['VOID', 'DOOM', 'DARK', 'ABYSS', 'RIFT', 'GATE', 'SHADOW', 'DREAD', 'FEAR', 'COLD', 'GRAVE', 'ECHO', 'END', 'FADE', 'GHOST', 'RITUAL', 'SUMMON'].includes(w.toUpperCase())
  ) || completedWords[completedWords.length - 1];

  const word = dreadWord.toUpperCase();

  const events: Record<number, string[]> = {
    2: [
      `The house shivered when you formed ${word}.`,
      `Something stirred below when ${word} was spoken.`,
      `The walls remember ${word}.`,
    ],
    3: [
      `The house trembled when you formed ${word}. The animals felt it.`,
      `${word} echoes through every room. They all heard it.`,
      `The foundation cracked when ${word} was spoken aloud.`,
    ],
    4: [
      `${word} was the word it was waiting for. The house knows.`,
      `The keepers felt ${word} in their bones. The arrangement accepts.`,
      `${word} completes another verse. The shadow stirs.`,
    ],
  };

  // Phase 5 reuses Phase 4 micro events — terrible peace doesn't need separate ritual shocks
  const phaseEvents = events[Math.min(phase, 4)] || events[4];
  return phaseEvents[Math.floor(Math.random() * phaseEvents.length)];
}

/**
 * Get a between-puzzle animal interjection that draws the player toward the home screen.
 * Returns null ~70% of the time so interjections don't appear after every puzzle.
 */
export function getAnimalInterjection(
  phase: number,
  unlockedAnimals: string[],
  puzzlesSolved: number,
): { animalName: string; text: string } | null {
  // Only show ~30% of the time
  if (Math.random() > 0.30) return null;
  if (unlockedAnimals.length === 0) return null;

  const { ANIMAL_INFO } = require('./animalDialogue');

  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = INTERJECTION_MESSAGES[clampedPhase];
  if (!messages || messages.length === 0) return null;

  // Pick a random unlocked animal
  const animalType = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)];
  const info = ANIMAL_INFO[animalType];
  const animalName = info ? info.name : animalType;

  // Pick a random message and substitute the name
  const template = messages[Math.floor(Math.random() * messages.length)];
  const text = template.replace(/\{name\}/g, animalName);

  return { animalName, text };
}

// ============================================================================
// NARRATIVE MICRO-BEATS — Break the Phase 1-2 retention valley
// Small surprise moments at specific puzzle milestones that create
// "water cooler" discussion without breaking the gradual narrative arc.
// ============================================================================

export interface NarrativeMicroBeat {
  /** Type of micro-beat effect */
  type: 'glitch_title' | 'ambient_whisper' | 'color_shift';
  /** Text to display (if applicable) */
  text?: string;
  /** Replacement title that briefly flashes then corrects (glitch_title only) */
  glitchTitle?: string;
  /** Duration of the effect in ms */
  durationMs: number;
}

/**
 * Micro-beats keyed by exact puzzle count. Each fires exactly once.
 * These are subtle moments of wrongness seeded throughout the experience:
 *
 * Early game (puzzles 5-25): Warm but slightly "too aware" observations.
 *   Innocent on first read, resonant in retrospect. Create early "wait,
 *   what?" hooks before the Phase 1 transition.
 *
 * Mid game (puzzles 30-74): Escalating environmental wrongness.
 * Late game (puzzles 80-130): Overt coordination and agency.
 */
const MICRO_BEATS: Record<number, NarrativeMicroBeat> = {
  5: {
    type: 'ambient_whisper',
    text: 'Fox watched you solve that one. He seemed... pleased.',
    durationMs: 3000,
  },
  8: {
    type: 'ambient_whisper',
    text: 'The house feels warmer when you play.',
    durationMs: 2500,
  },
  12: {
    type: 'ambient_whisper',
    text: 'Have you noticed? The words almost arrange themselves.',
    durationMs: 3000,
  },
  16: {
    type: 'glitch_title',
    glitchTitle: 'WELCOME HOME',
    text: 'GREAT!',
    durationMs: 300,
  },
  20: {
    type: 'ambient_whisper',
    text: 'The animals talk about you when you\'re away. All good things. Probably.',
    durationMs: 3500,
  },
  25: {
    type: 'ambient_whisper',
    text: 'Each puzzle builds something. You can feel it, can\'t you?',
    durationMs: 3000,
  },
  30: {
    type: 'ambient_whisper',
    text: 'The house feels fuller with each puzzle. Or maybe it just wants to.',
    durationMs: 3000,
  },
  35: {
    type: 'glitch_title',
    glitchTitle: 'WE REMEMBER',
    text: 'PERFECT!',
    durationMs: 400,
  },
  40: {
    type: 'ambient_whisper',
    text: 'The house settles at night. You can almost hear it breathing.',
    durationMs: 3000,
  },
  50: {
    type: 'ambient_whisper',
    text: 'The light is changing. Have you noticed?',
    durationMs: 3000,
  },
  55: {
    type: 'ambient_whisper',
    text: 'Some words leave marks where others don\'t. Have you noticed which ones?',
    durationMs: 3000,
  },
  65: {
    type: 'ambient_whisper',
    text: 'The words you\'ve formed... they remember each other.',
    durationMs: 3000,
  },
  70: {
    type: 'ambient_whisper',
    text: 'The rooms are quieter now. Not empty — listening.',
    durationMs: 3000,
  },
  74: {
    type: 'glitch_title',
    glitchTitle: 'IT BEGINS',
    text: 'PERFECT!',
    durationMs: 300,
  },
  80: {
    type: 'glitch_title',
    glitchTitle: 'THEY HEAR YOU',
    text: 'PERFECT!',
    durationMs: 350,
  },
  90: {
    type: 'ambient_whisper',
    text: 'The animals have been talking about you. All of them. At the same time.',
    durationMs: 3500,
  },
  100: {
    type: 'ambient_whisper',
    text: 'One hundred arrangements. The house hums.',
    durationMs: 3500,
  },
  110: {
    type: 'ambient_whisper',
    text: 'One hundred and ten arrangements. The walls are thicker now.',
    durationMs: 3000,
  },
  130: {
    type: 'ambient_whisper',
    text: 'You feel it too, don\'t you? The way the letters know where they belong before you place them.',
    durationMs: 4000,
  },
};

/** AsyncStorage key for tracking consumed micro-beats */
const MICRO_BEATS_SEEN_KEY = 'wordshift_micro_beats_seen';

let microBeatsSeen: Set<number> | null = null;

async function loadMicroBeatsSeen(): Promise<Set<number>> {
  if (microBeatsSeen) return microBeatsSeen;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(MICRO_BEATS_SEEN_KEY);
    microBeatsSeen = raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    microBeatsSeen = new Set();
  }
  return microBeatsSeen;
}

async function markMicroBeatSeen(puzzleCount: number): Promise<void> {
  const seen = await loadMicroBeatsSeen();
  seen.add(puzzleCount);
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(MICRO_BEATS_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Silently fail — non-critical
  }
}

/**
 * Check if a narrative micro-beat should fire at this puzzle count.
 * Returns the beat config (and marks it as consumed) or null.
 */
export async function checkNarrativeMicroBeat(
  puzzlesSolved: number,
): Promise<NarrativeMicroBeat | null> {
  const beat = MICRO_BEATS[puzzlesSolved];
  if (!beat) return null;

  const seen = await loadMicroBeatsSeen();
  if (seen.has(puzzlesSolved)) return null;

  await markMicroBeatSeen(puzzlesSolved);
  return beat;
}

/**
 * Reset micro-beats tracking (for Reset All Data).
 */
export async function resetMicroBeats(): Promise<void> {
  microBeatsSeen = null;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(MICRO_BEATS_SEEN_KEY);
  } catch {
    // Silently fail — non-critical
  }
}

// ============================================================================
// HOME AMBIENT LINES — atmospheric text when all animals are on cooldown
// Fills the "dead home" problem: rotates each home visit, phase-aware tone.
// ============================================================================

const HOME_AMBIENT_LINES: Record<DialoguePhase, string[]> = {
  0: [
    'The fireplace crackles softly.',
    'Sunlight pools on the wooden floor.',
    'A gentle breeze drifts through the house.',
    'The rooms smell of fresh wood and warm bread.',
    'Everything feels cozy. Everything feels right.',
    'Birds sing outside. The house listens.',
    'Dust motes float in the afternoon light.',
    'The house hums with quiet contentment.',
  ],
  1: [
    'The house feels a little bigger today.',
    'The floorboards creak, though no one is walking.',
    'Shadows in the corners seem deeper than before.',
    'Something about the light has shifted.',
    'The walls are warm to the touch.',
    'You hear a faint hum. From where?',
    'The rooms seem to lean toward each other.',
    'The air smells like old paper and something sweet.',
  ],
  2: [
    'The walls seem closer today.',
    'A draft moves through rooms with no windows open.',
    'The house remembers every word you\'ve ever formed.',
    'The stairs groan even when no one climbs them.',
    'Every room feels like it\'s listening.',
    'The light never quite reaches the corners anymore.',
    'You feel watched. But fondly. Is that worse?',
    'The furniture has rearranged itself. Slightly.',
  ],
  3: [
    'The house holds its breath.',
    'Something stirs beneath the foundation.',
    'The walls pulse. Once. Then stillness.',
    'Every shadow is exactly where it should be.',
    'The house is heavier now. Fuller. Almost complete.',
    'The air tastes of copper and old stone.',
    'You stand still. The house stands with you.',
    'It is patient. It has always been patient.',
  ],
  4: [
    'The house breathes.',
    'The arrangement hums through the walls.',
    'Every board, every nail serves the pattern.',
    'The keepers rest in their chambers. Waiting.',
    'Crimson light pulses behind the wallpaper.',
    'The house does not need you. It wants you.',
    'You feel the pattern in the floor beneath your feet.',
    'Something vast and tender watches from above.',
  ],
  5: [
    'The house is at peace.',
    'The pattern holds. Everything is quiet.',
    'A gentle warmth permeates every room.',
    'The keepers sleep. Or something like sleep.',
    'The weave continues. Thread by thread.',
    'Nothing moves. Nothing needs to.',
    'The light is neither bright nor dark. It simply is.',
    'You belong here. You always did.',
  ],
};

let lastAmbientIndex = -1;

/**
 * Get a random ambient line for the home screen.
 * Avoids repeating the same line consecutively.
 */
export function getHomeAmbientLine(phase: DialoguePhase): string {
  const lines = HOME_AMBIENT_LINES[phase] ?? HOME_AMBIENT_LINES[0];
  let idx = Math.floor(Math.random() * lines.length);
  if (idx === lastAmbientIndex && lines.length > 1) {
    idx = (idx + 1) % lines.length;
  }
  lastAmbientIndex = idx;
  return lines[idx];
}

// ============================================================================
// HOME SCREEN GOAL SUGGESTIONS — contextual next-action hints
// ============================================================================

export interface GoalSuggestion {
  text: string;
  action: 'daily' | 'play' | 'none';
}

const DAILY_SUGGESTIONS: Record<DialoguePhase, string[]> = {
  0: ['Your daily puzzle is waiting!', 'Today\'s challenge is ready.'],
  1: ['A daily puzzle awaits your attention.', 'The daily challenge has arrived.'],
  2: ['The daily arrangement awaits.', 'Today\'s challenge waits in silence.'],
  3: ['The daily incantation is prepared.', 'Today\'s words are chosen.'],
  4: ['The daily offering is ready.', 'The arrangement requires today\'s words.'],
  5: ['The daily thread awaits weaving.', 'Today\'s pattern is ready.'],
};

const DIFFICULTY_SUGGESTIONS: Record<DialoguePhase, Record<string, string>> = {
  0: {
    MEDIUM: 'Ready for a bigger challenge? Try Medium!',
    MEDIUM_PLUS: 'Five-letter words await in Medium+!',
    HARD: 'Think you can handle Hard mode?',
  },
  1: {
    MEDIUM: 'The words grow more interesting at Medium.',
    MEDIUM_PLUS: 'Five-letter arrangements await in Medium+.',
    HARD: 'Hard mode... the letters call to you.',
  },
  2: {
    MEDIUM: 'Medium difficulty reveals deeper patterns.',
    MEDIUM_PLUS: 'The arrangement deepens at Medium+.',
    HARD: 'Hard mode. The words want to test you.',
  },
  3: {
    MEDIUM: 'Medium difficulty feeds the pattern faster.',
    MEDIUM_PLUS: 'Medium+ incantations carry more weight.',
    HARD: 'Hard mode. The arrangement demands it.',
  },
  4: {
    MEDIUM: 'Medium offerings sustain the pattern.',
    MEDIUM_PLUS: 'Medium+ words burn brighter in the pit.',
    HARD: 'Hard mode. The arrangement is hungry.',
  },
  5: {
    MEDIUM: 'Medium threads add to the weave.',
    MEDIUM_PLUS: 'Medium+ patterns strengthen the tapestry.',
    HARD: 'Hard mode. The weave always needs more.',
  },
};

const VARIANT_SUGGESTIONS: Record<DialoguePhase, Record<string, string>> = {
  0: {
    reverse: 'New puzzle style unlocked: Reverse Shift!',
    double_shift: 'New style unlocked: Double Shift!',
    speed: 'New style unlocked: Speed Shift!',
  },
  1: {
    reverse: 'Reverse Shift is available — try going backward.',
    double_shift: 'Double Shift unlocked — move two letters at once.',
    speed: 'Speed Shift is ready — race the clock.',
  },
  2: {
    reverse: 'Reverse Shift... the words can be undone.',
    double_shift: 'Double Shift — twice the letters, twice the weight.',
    speed: 'Speed Shift. The clock ticks.',
  },
  3: {
    reverse: 'Reverse the incantation. If you dare.',
    double_shift: 'Double Shift. Two letters bound together.',
    speed: 'Speed Shift. The arrangement does not wait.',
  },
  4: {
    reverse: 'Reverse the offering. See what returns.',
    double_shift: 'Double Shift. The pattern demands more.',
    speed: 'Speed Shift. Feed the void faster.',
  },
  5: {
    reverse: 'Reverse the thread. The weave holds.',
    double_shift: 'Double Shift. Two threads at once.',
    speed: 'Speed Shift. Time flows differently here.',
  },
};

const QUEST_SUGGESTIONS: Record<DialoguePhase, string[]> = {
  0: ['Check your weekly quests for bonus amber!', 'Weekly quests can earn extra amber.'],
  1: ['Weekly quests offer additional amber.', 'Your quests await progress.'],
  2: ['The weekly tasks remember your progress.', 'Quests carry weight this week.'],
  3: ['The weekly offerings are not yet complete.', 'Your quests await fulfillment.'],
  4: ['The weekly rituals are incomplete.', 'The arrangement tracks your weekly progress.'],
  5: ['The weekly threads continue.', 'Weekly patterns await completion.'],
};

/**
 * Get a contextual goal suggestion for the home screen.
 * Returns the highest-priority actionable suggestion, or null if none apply.
 *
 * @param phase - Current narrative phase
 * @param dailyAvailable - Daily challenge unlocked AND not completed today
 * @param untriedDifficulties - Difficulty levels never completed (e.g., ['MEDIUM_PLUS', 'HARD'])
 * @param newVariant - Most recently unlocked variant not yet tried, or null
 * @param hasActiveQuests - Whether there are incomplete weekly quests
 */
export function getGoalSuggestion(
  phase: DialoguePhase,
  dailyAvailable: boolean,
  untriedDifficulties: string[],
  newVariant: string | null,
  hasActiveQuests: boolean,
): GoalSuggestion | null {
  // Priority 1: Uncompleted daily challenge
  if (dailyAvailable) {
    const lines = DAILY_SUGGESTIONS[phase] ?? DAILY_SUGGESTIONS[0];
    return { text: lines[Math.floor(Math.random() * lines.length)], action: 'daily' };
  }

  // Priority 2: Untried difficulty
  if (untriedDifficulties.length > 0) {
    // Suggest the easiest untried difficulty first
    const order = ['MEDIUM', 'MEDIUM_PLUS', 'HARD'];
    const next = order.find(d => untriedDifficulties.includes(d));
    if (next) {
      const phaseTexts = DIFFICULTY_SUGGESTIONS[phase] ?? DIFFICULTY_SUGGESTIONS[0];
      const text = phaseTexts[next];
      if (text) return { text, action: 'play' };
    }
  }

  // Priority 3: Newly unlocked variant
  if (newVariant) {
    const phaseTexts = VARIANT_SUGGESTIONS[phase] ?? VARIANT_SUGGESTIONS[0];
    const text = phaseTexts[newVariant];
    if (text) return { text, action: 'play' };
  }

  // Priority 4: Active weekly quests
  if (hasActiveQuests) {
    const lines = QUEST_SUGGESTIONS[phase] ?? QUEST_SUGGESTIONS[0];
    return { text: lines[Math.floor(Math.random() * lines.length)], action: 'none' };
  }

  return null;
}

// ============================================================================
// HOME SCREEN NUDGE — pull puzzle-focused players toward animal dialogue
// ============================================================================

const HOME_NUDGE_MESSAGES: Record<number, string[]> = {
  0: [
    '{name} has been waiting to talk to you. Visit the house!',
    'Your friends miss you! Head home and say hi.',
  ],
  1: [
    '{name} has something on their mind. You should visit.',
    'The house feels quiet without you. {name} noticed.',
  ],
  2: [
    '{name} has been staring at the walls. You should check on them.',
    'Something is different at home. {name} wants to talk.',
  ],
  3: [
    '{name} needs you to hear something. It cannot wait much longer.',
    'The house is restless. {name} has been pacing.',
  ],
  4: [
    'The keepers are calling for you. {name} says it is time.',
    '{name} says: "We have waited long enough."',
  ],
  5: [
    '{name} is humming softly. The house hums with them.',
    'The weave holds. {name} wants you to know that.',
  ],
};

const ANIMAL_DISPLAY_NAMES: Record<string, string> = {
  fox: 'Ember',
  owl: 'Archimedes',
  pangolin: 'Panko',
  axolotl: 'Axel',
  capybara: 'Chill',
  fennec_fox: 'Fennick',
  sloth: 'Sloane',
  wombat: 'Warren',
  rabbit: 'Thyme',
  red_panda: 'Bamboo',
};

/**
 * Get a home screen nudge message to pull puzzle-focused players toward the house.
 * Returns null if conditions aren't met (< 3 puzzles since home visit, no animals).
 */
export function getHomescreenNudge(
  phase: number,
  unlockedAnimals: string[],
  puzzlesSinceHome: number,
): { animalName: string; text: string } | null {
  if (unlockedAnimals.length === 0 || puzzlesSinceHome < 3) return null;

  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = HOME_NUDGE_MESSAGES[clampedPhase];
  const animalType = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)];
  const animalName = ANIMAL_DISPLAY_NAMES[animalType] || animalType;
  const template = messages[Math.floor(Math.random() * messages.length)];
  const text = template.replace(/\{name\}/g, animalName);

  return { animalName, text };
}

// ============================================================================
// OFFERING PIT — Phase-aware text for the word harvest / offering screen
// ============================================================================

const PIT_SCREEN_TITLES: Record<DialoguePhase, string> = {
  0: 'Word Repository',
  1: 'Word Repository',
  2: 'The Emptiness Below',
  3: 'The Consuming Dark',
  4: 'The Pit',
  5: 'The Still Waters',
};

export function getPitScreenTitle(phase: DialoguePhase): string {
  return PIT_SCREEN_TITLES[phase];
}

const PIT_SCREEN_SUBTITLES: Record<DialoguePhase, string> = {
  0: 'Offer your harvested words to receive amber.',
  1: 'Your words are ready. Offer them and receive amber.',
  2: 'The words you\'ve gathered wait to be released.',
  3: 'The words must be surrendered. They were never yours.',
  4: 'Feed the arrangement. It is always hungry.',
  5: 'The words settle here. Gently, now.',
};

export function getPitScreenSubtitle(phase: DialoguePhase): string {
  return PIT_SCREEN_SUBTITLES[phase];
}

const PIT_BUTTON_LABELS: Record<DialoguePhase, string> = {
  0: 'Offer',
  1: 'Offer',
  2: 'Release',
  3: 'Surrender',
  4: 'Feed',
  5: 'Weave',
};

export function getPitButtonLabel(phase: DialoguePhase): string {
  return PIT_BUTTON_LABELS[phase];
}

const PIT_OFFER_ALL_LABELS: Record<DialoguePhase, string> = {
  0: 'Offer All',
  1: 'Offer All',
  2: 'Release All',
  3: 'Surrender Everything',
  4: 'Feed It All',
  5: 'Weave All',
};

export function getPitOfferAllLabel(phase: DialoguePhase): string {
  return PIT_OFFER_ALL_LABELS[phase];
}

const PIT_EMPTY_MESSAGES: Record<DialoguePhase, string> = {
  0: 'No words to offer yet. Complete a puzzle first!',
  1: 'Nothing pending. Play another puzzle to harvest words.',
  2: 'The pit is empty. It waits for you to bring more.',
  3: 'Nothing left to give. The dark is patient.',
  4: 'Empty. But the hunger remains.',
  5: 'Nothing to weave. The loom rests.',
};

export function getPitEmptyMessage(phase: DialoguePhase): string {
  return PIT_EMPTY_MESSAGES[phase];
}

const PIT_OFFER_RESULT_MESSAGES: Record<DialoguePhase, string[]> = {
  0: [
    'Words offered! You earned {amber} amber.',
    'Nice! {words} words converted to {amber} amber.',
  ],
  1: [
    '{words} words released. {amber} amber received.',
    'The words found their place. +{amber} amber.',
  ],
  2: [
    'The words dissolved below. {amber} amber surfaced.',
    '{words} words sank into the dark. {amber} amber returned.',
  ],
  3: [
    'The arrangement accepted {words} words. {amber} amber was granted.',
    '{words} words consumed. {amber} amber emerged from the silence.',
  ],
  4: [
    'It took {words} words. It gave back {amber} amber. Was it fair? Does it matter?',
    '{words} words devoured. {amber} amber spat back. The pit does not thank you.',
  ],
  5: [
    '{words} words woven into the pattern. {amber} amber surfaced gently.',
    'The weave accepted {words} threads. {amber} amber drifted back to you.',
  ],
};

export function getPitOfferResultMessage(
  phase: DialoguePhase,
  wordsOffered: number,
  amberAwarded: number,
): string {
  const messages = PIT_OFFER_RESULT_MESSAGES[phase];
  const template = messages[Math.floor(Math.random() * messages.length)];
  return template
    .replace(/\{words\}/g, String(wordsOffered))
    .replace(/\{amber\}/g, String(amberAwarded));
}

const PIT_HOME_BADGE_LABELS: Record<DialoguePhase, string> = {
  0: 'The Pit',
  1: 'The Pit',
  2: 'The Below',
  3: 'The Dark',
  4: 'The Pit',
  5: 'The Loom',
};

export function getPitHomeBadgeLabel(phase: DialoguePhase): string {
  return PIT_HOME_BADGE_LABELS[phase];
}

const PIT_HARVEST_LABELS: Record<DialoguePhase, string> = {
  0: 'harvested',
  1: 'harvested',
  2: 'gathered',
  3: 'taken',
  4: 'claimed',
  5: 'woven',
};

export function getPitHarvestLabel(phase: DialoguePhase): string {
  return PIT_HARVEST_LABELS[phase];
}

const PIT_PENDING_AMBER_LABELS: Record<DialoguePhase, string> = {
  0: 'Amber pending',
  1: 'Amber pending',
  2: 'Amber waiting',
  3: 'Amber owed',
  4: 'Amber owed to you',
  5: 'Amber resting',
};

export function getPitPendingAmberLabel(phase: DialoguePhase): string {
  return PIT_PENDING_AMBER_LABELS[phase];
}

// --- Pit devour interaction text ---

const PIT_DEVOUR_VERBS: Record<DialoguePhase, string> = {
  0: 'offered',
  1: 'offered',
  2: 'released',
  3: 'surrendered',
  4: 'devoured',
  5: 'woven',
};

export function getPitDevourVerb(phase: DialoguePhase): string {
  return PIT_DEVOUR_VERBS[phase];
}

export function getPitOverflowText(phase: DialoguePhase, extraCount: number): string {
  if (phase >= 5) return `+${extraCount} more threads for the loom`;
  if (phase >= 4) return `+${extraCount} more hunger for their turn`;
  if (phase >= 3) return `+${extraCount} more await their turn`;
  if (phase >= 2) return `+${extraCount} more words waiting`;
  return `+${extraCount} more`;
}

// --- Harvest overflow warning ---

/**
 * Phase-aware message shown when pending harvest batches hit the 200 cap
 * and oldest batches are trimmed.
 */
export function getHarvestOverflowMessage(phase: DialoguePhase): string {
  if (phase >= 3) return 'The pit overflows. Feed it.';
  if (phase >= 2) return 'The harvest overflows. The pit waits.';
  return 'Your harvest is full! Visit the Pit to make room for new words.';
}

// ============================================================================
// PIT PHASE TRANSITION — Ward marks and transition ceremony
// ============================================================================

/** Number of ward marks around the pit rim (visual anchors for progress) */
export const PIT_WARD_COUNT = 7;

/** Cryptic hint shown above the ward marks when transition is approaching */
const PIT_WARD_HINTS: Record<number, string> = {
  1: 'Something stirs below...',
  2: 'The marks remember.',
  3: 'The circle hungers.',
  4: 'The pattern demands completion.',
};

export function getPitWardHint(currentPhase: DialoguePhase, fraction: number): string | null {
  if (fraction < 0.3) return null; // Too early
  const nextPhase = Math.min(4, currentPhase + 1);
  return PIT_WARD_HINTS[nextPhase] ?? null;
}

/** Text shown when transition is ready (all wards lit, pending confirmation) */
const PIT_TRANSITION_READY_TEXT: Record<number, string> = {
  1: 'The marks glow. Tap them.',
  2: 'The circle is complete. Touch the marks.',
  3: 'The dark waits. Tap the marks to open the way.',
  4: 'The arrangement trembles. Touch the circle.',
};

export function getPitTransitionReadyText(targetPhase: DialoguePhase): string {
  return PIT_TRANSITION_READY_TEXT[targetPhase] ?? 'Something shifts.';
}

/** Text lines shown during the ward ignition ceremony */
const PIT_TRANSITION_CEREMONY_TEXT: Record<number, string[]> = {
  1: [
    'The first marks ignite.',
    'The pit remembers your words.',
    'Something has changed.',
  ],
  2: [
    'The marks burn deeper.',
    'The emptiness grows below.',
    'You can feel it now.',
  ],
  3: [
    'The circle screams without sound.',
    'The dark rushes upward.',
    'There is no going back.',
  ],
  4: [
    'The final mark blazes crimson.',
    'Every word you offered led here.',
    'The arrangement is complete.',
  ],
};

export function getPitTransitionCeremonyText(targetPhase: DialoguePhase): string[] {
  return PIT_TRANSITION_CEREMONY_TEXT[targetPhase] ?? ['Something shifts.'];
}

/** Ward mark colors by current phase */
export interface WardMarkColorSet {
  unlit: string;
  lit: string;
  glow: string;
  pendingPulse: string;
}

const WARD_MARK_COLORS: Record<number, WardMarkColorSet> = {
  0: { unlit: 'rgba(255,255,255,0.08)', lit: '#80E8D0', glow: '#80E8D0', pendingPulse: '#A0FFE0' },
  1: { unlit: 'rgba(255,255,255,0.06)', lit: '#B794F4', glow: '#B794F4', pendingPulse: '#D4B0FF' },
  2: { unlit: 'rgba(255,255,255,0.05)', lit: '#9B7DC8', glow: '#6B4F8A', pendingPulse: '#B088D0' },
  3: { unlit: 'rgba(255,255,255,0.04)', lit: '#8B2252', glow: '#5A1030', pendingPulse: '#C03050' },
  4: { unlit: 'rgba(255,255,255,0.03)', lit: '#C03050', glow: '#8B2252', pendingPulse: '#E05070' },
  5: { unlit: 'rgba(255,255,255,0.05)', lit: '#9B88B0', glow: '#7A6890', pendingPulse: '#B8A0D0' },
};

export function getWardMarkColors(phase: DialoguePhase): WardMarkColorSet {
  return WARD_MARK_COLORS[phase] ?? WARD_MARK_COLORS[0];
}

/** Cryptic text for VictoryModal when a phase transition is pending at the pit */
const VICTORY_PIT_HINTS: Record<number, string> = {
  1: 'The pit stirs. Something awaits.',
  2: 'The marks below have changed.',
  3: 'The dark is waiting.',
  4: 'The arrangement demands your presence.',
};

export function getVictoryPitHint(targetPhase: DialoguePhase): string | null {
  return VICTORY_PIT_HINTS[targetPhase] ?? null;
}

/**
 * Fox's one-time nudge lines when a phase transition is pending at the pit.
 * Shown once per pending transition to guide the player to the pit.
 */
const FOX_PIT_NUDGE_LINES: Record<number, string[]> = {
  1: [
    'Something is ready in the pit.',
    'The marks are glowing. You should go see.',
  ],
  2: [
    'The pit has changed. Can you feel it?',
    'Go to the pit. The marks are waiting.',
  ],
  3: [
    'The dark stirs below. The pit is calling.',
    'The marks burn. They need you there.',
  ],
  4: [
    'The final circle trembles. Go to the pit.',
    'Everything has led to this. The pit awaits.',
  ],
};

export function getFoxPitNudgeLines(targetPhase: DialoguePhase): string[] {
  return FOX_PIT_NUDGE_LINES[targetPhase] ?? FOX_PIT_NUDGE_LINES[1];
}

/**
 * Fox's one-time intro lines when Challenge Mode becomes available (after 15 puzzles).
 */
export function getChallengeIntroLines(phase: DialoguePhase): string[] {
  if (phase >= 3) {
    return [
      'The patterns grow more complex. There are harder paths, if you dare.',
      'Challenge Mode strips away your safety — no hints, limited undos. But the amber flows thicker.',
      'Look for it in the puzzle setup. The arrangement rewards those who commit fully.',
    ];
  }
  if (phase >= 2) {
    return [
      "You've grown stronger with the letters, friend. Curious about a harder path?",
      'Challenge Mode removes hints and limits your undos — but rewards you with 50% more amber.',
      'Look for it in the puzzle setup menu when you want to test yourself.',
    ];
  }
  return [
    "You're getting really good at this! Want to push yourself?",
    'Challenge Mode removes hints and limits your undos — but rewards you with 50% more amber.',
    'Look for it in the puzzle setup menu when you\'re feeling bold.',
  ];
}

/**
 * Explanatory text shown when the pit visit is mandatory (phase transition pending).
 */
export function getPitMandatoryText(phase: DialoguePhase): string {
  if (phase >= 3) return 'The wards glow. The pit will not wait.';
  if (phase >= 2) return 'Something stirs beneath. Your words are needed.';
  return 'Something is stirring. Offer your words to continue.';
}

/**
 * CTA button label when pit visit is mandatory.
 */
export function getPitMandatoryCTA(phase: DialoguePhase): string {
  if (phase >= 3) return 'The pit demands your presence';
  return 'Visit the Pit';
}
