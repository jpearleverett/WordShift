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
