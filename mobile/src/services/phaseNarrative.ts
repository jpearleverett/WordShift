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
  // ~3% chance on subsequent Phase 0 victories (subtle, not bug-like)
  if (Math.random() < 0.03) {
    return VICTORY_GLITCH_TEXTS[Math.floor(Math.random() * VICTORY_GLITCH_TEXTS.length)];
  }
  return null;
}

/** Rare "wrong" move messages that slip into Phase 0 (~5% chance) */
const PHASE_0_SEED_MESSAGES = [
  'The letters remember.',
  'Something shifted.',
  'Did you feel that?',
  'The word wanted that.',
];

/**
 * Get a move message with rare Phase 0 darkness seeds mixed in.
 * At Phase 0, there's a ~5% chance of a seed message replacing the normal one.
 */
function getPhase0MoveMessageWithSeed(): string {
  if (Math.random() < 0.05) {
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
};

const HINT_SUFFIX: Record<DialoguePhase, string> = {
  0: 'think',
  1: 'consider',
  2: 'notice',
  3: 'observe',
  4: 'see',
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

/**
 * Get victory title for Phase 5 (post-revelation)
 */
export function getPostRevelationVictoryTitle(stars: number): string {
  // Different from Phase 4 - more serene, less questioning
  const titles = [
    'The pattern continues.',
    'Another thread in the weave.',
    'The arrangement hums.',
  ];
  return titles[stars - 1] || titles[0];
}

/**
 * Get move message for Phase 5
 */
export function getPostRevelationMoveMessage(): string {
  const messages = [
    'The weave tightens.',
    'Another thread.',
    'The pattern knows.',
    'It remembers.',
    'Accepted.',
    'Woven.',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

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

  const clampedPhase = Math.min(4, Math.max(0, phase));
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

  const clampedPhase = Math.min(4, Math.max(0, phase));
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
 * These are subtle moments of wrongness during the long Phase 1-2 corridor:
 *
 * - Puzzle 35: Victory title briefly shows wrong text then corrects itself
 * - Puzzle 40: The house is alive — first environmental foreshadowing
 * - Puzzle 50: A whisper appears unbidden on the home screen
 * - Puzzle 55: Word-specific foreshadowing — some words leave marks
 * - Puzzle 65: The victory feedback text contains an anomaly
 * - Puzzle 80: Second glitch title — they're listening
 * - Puzzle 90: The animals are coordinating — collective awareness
 * - Puzzle 100: A brief ambient whisper during puzzle solving
 * - Puzzle 110: The house is changing physically
 * - Puzzle 130: The letters have agency — player complicity deepens
 */
const MICRO_BEATS: Record<number, NarrativeMicroBeat> = {
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

  const clampedPhase = Math.min(4, Math.max(0, phase));
  const messages = HOME_NUDGE_MESSAGES[clampedPhase];
  const animalType = unlockedAnimals[Math.floor(Math.random() * unlockedAnimals.length)];
  const animalName = ANIMAL_DISPLAY_NAMES[animalType] || animalType;
  const template = messages[Math.floor(Math.random() * messages.length)];
  const text = template.replace(/\{name\}/g, animalName);

  return { animalName, text };
}
