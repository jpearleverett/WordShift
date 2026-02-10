import { DialoguePhase, PHASE_DESCRIPTIONS } from '../types/homeWorld';

/**
 * Phase-aware narrative text for the puzzle screen.
 * All text shifts in tone as the player progresses through phases,
 * creating a deepening sense of mood without changing mechanics.
 */

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
  triggerWords?: string[]
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
