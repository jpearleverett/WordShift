import { DialoguePhase } from '../types/homeWorld';
import { STREAK_MILESTONES } from '../constants/gameBalance';

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
    three: 'Flawless! The words knew exactly where to go.',
    two: 'Lovely work! The whole house felt that one land.',
    one: 'You got there! The puzzle settled happily into place.',
  },
  1: {
    three: 'Elegant solution. You see the patterns.',
    two: 'Good solve. The words are starting to speak.',
    one: 'Completed. Every puzzle teaches something.',
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
// FLAWLESS OFFERING — the perfect-play tier ABOVE 3 stars (0 hints/invalids/undos)
// Phase-aware honorific badge copy. Cheerful praise early, reverent awe late —
// never breaks the fourth wall, never says "no undos/hints" (that's mechanics).
// ============================================================================

const FLAWLESS_HONORIFICS: Record<DialoguePhase, string> = {
  0: 'FLAWLESS!',
  1: 'Flawless.',
  2: 'A Clean Offering',
  3: 'Unwavering.',
  4: 'A Perfect Offering',
  5: 'The Thread Ran True',
};

export function getFlawlessHonorific(phase: DialoguePhase): string {
  return FLAWLESS_HONORIFICS[phase] ?? FLAWLESS_HONORIFICS[0];
}

// ============================================================================
// PACE TREND — private "the words come to you faster now" beat. Phase-aware:
// warm encouragement early, quietly unsettling reverence late (the ease itself
// becomes the horror — the ritual has taught your hands). Never a leaderboard.
// ============================================================================

const PACE_TREND_MESSAGES: Record<DialoguePhase, string> = {
  0: 'The words come to you faster now!',
  1: 'You find them quicker than you used to.',
  2: 'The patterns surface faster now. You barely have to look.',
  3: 'The words arrive before you reach for them.',
  4: 'You no longer search. The arrangement offers, and you accept.',
  5: 'The words come without asking. Your hands already know the way.',
};

export function getPaceTrendMessage(phase: DialoguePhase): string {
  return PACE_TREND_MESSAGES[phase] ?? PACE_TREND_MESSAGES[0];
}

// ============================================================================
// SPEED RECORD — a new best Speed-Shift escalation streak. Phase-aware.
// ============================================================================

export function getSpeedRecordMessage(phase: DialoguePhase, round: number): string {
  if (phase >= 4) return `A new depth reached. Round ${round}.`;
  if (phase >= 2) return `Further than before... Round ${round}.`;
  return `New record! You reached Round ${round}.`;
}

// ============================================================================
// VARIANT NUDGE — Fox (early) / the arrangement (late) gently suggests trying a
// variant the player unlocked but never played. Phase-aware; never nags (once
// per day, only for a never-tried mode). {variant} = the variant's title.
// ============================================================================

export function getVariantNudgeMessage(phase: DialoguePhase, variantTitle: string): string {
  if (phase >= 4) return `The pattern wonders what ${variantTitle} would offer...`;
  if (phase >= 2) return `Have you tried ${variantTitle}? The words move differently there.`;
  return `Fox wonders what happens if you try ${variantTitle}!`;
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
    'The arrangement notes your move.', 'Another verse written.', 'One step deeper.',
    'The letters go where they were always going.', 'It is listening.',
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
// COMBO MOVE MESSAGES — Escalating feedback for consecutive clean moves within a
// single puzzle. `streak` is the count of successful moves so far this board (2+).
// Each tier ramps the energy so a clean run *feels* like it's building, which is
// the genre's core intra-level addiction lever (Toon Blast / Wordscapes). The
// tone still bends with phase: bright and loud early, reverent and cold late.
// ============================================================================

const COMBO_MOVE_MESSAGES: Record<DialoguePhase, string[]> = {
  // Index by tier: [streak 2, streak 3, streak 4+]
  0: ['Nice! 2 in a row!', "Sweet! 3 chain!", "On fire! 🔥"],
  1: ['Two clean. Keep going.', 'Three in a row. Flowing now.', 'A perfect run.'],
  2: ['Two without a stumble.', 'The pattern gathers pace.', 'Unbroken. It builds.'],
  3: ['Two, cleanly.', 'The chain holds... three deep.', 'An unbroken descent.'],
  4: ['Two offered, unbroken.', 'Three... the arrangement leans closer.', 'A flawless verse. It hears.'],
  5: ['Two threads, true.', 'Three, woven without a snag.', 'The weave sings, unbroken.'],
};

/** Escalating message for a clean-move streak (call only when streak >= 2). */
export function getComboMoveMessage(streak: number, phase: DialoguePhase): string {
  const tiers = COMBO_MOVE_MESSAGES[phase];
  const idx = Math.min(Math.max(streak - 2, 0), tiers.length - 1);
  return tiers[idx];
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
  return `${prefix} '${letterToMove}'... ${suffix} "${targetWord}"!`;
}

const HINT_FALLBACK: Record<DialoguePhase, string> = {
  0: 'Not quite right. Try undoing your last move!',
  1: 'Hmm, not the right path. Try undoing.',
  2: 'You\'ve wandered off course. Undo.',
  3: 'Wrong path. Is there a right one?',
  4: 'Lost. But the arrangement knows exactly where you are.',
  5: 'The threads tangle. Undo and try again.',
};

export function getHintFallback(phase: DialoguePhase): string {
  return HINT_FALLBACK[phase];
}

// Shown when the player taps HINT with an empty hint balance.
const OUT_OF_HINTS_MESSAGES: Record<DialoguePhase, string> = {
  0: "You're out of hints! Watch a quick clip or grab more to keep going.",
  1: 'No hints left. Earn one with a short clip, or stock up.',
  2: 'Your hints are spent. The pattern offers more... for a price.',
  3: 'No hints remain. Something will trade you one.',
  4: 'The arrangement has taken your hints. It will give more, if you ask.',
  5: 'Your hints are gone, like everything else. More can be drawn.',
};

export function getOutOfHintsMessage(phase: DialoguePhase): string {
  return OUT_OF_HINTS_MESSAGES[phase];
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
// NO VALID MOVES — Shown when no legal move remains from the current board
// ============================================================================

const NO_VALID_MOVES_MESSAGES: Record<DialoguePhase, string> = {
  0: 'No words fit from here! Undo a move or clear the board to try a fresh path.',
  1: 'Hmm... no word works from here. Undo a move, or clear the board and try another way.',
  2: 'The letters refuse every path from here. Even they seem to know this arrangement was wrong. Undo, or clear the board and begin anew.',
  3: 'No word can form from this arrangement. Unmake a move, or clear it all away.',
  4: 'The arrangement admits no further words. Unmake your moves, or begin again.',
  5: 'The weave has closed around this path. Undo a thread, or clear it and start once more.',
};

export function getNoValidMovesMessage(phase: DialoguePhase): string {
  return NO_VALID_MOVES_MESSAGES[phase];
}

/** Short, phase-aware headline for the stuck-recovery panel. */
const STUCK_PANEL_TITLES: Record<DialoguePhase, string> = {
  0: 'Stuck? No worries!',
  1: 'A dead end.',
  2: 'This path has closed.',
  3: 'The way is shut.',
  4: 'No path remains.',
  5: 'The thread frays.',
};

export function getStuckPanelTitle(phase: DialoguePhase): string {
  return STUCK_PANEL_TITLES[phase];
}

// ============================================================================
// DRAG MISS — Shown when a dragged letter is released away from any row, so the
// drop is ignored. The letter stays picked up; this tells the player why nothing
// happened and that they can simply drop it on a row.
// ============================================================================

const DRAG_MISS_MESSAGES: Record<DialoguePhase, string> = {
  0: 'Oops! Drop the letter onto a row to place it.',
  1: 'Not quite there. Release the letter over a row.',
  2: 'The letter found no row. Bring it down onto one.',
  3: 'It slipped free. Settle the letter onto a row.',
  4: 'The letter would not settle. Lay it upon a row.',
  5: 'The thread drifted loose. Rest it upon a row.',
};

export function getDragMissMessage(phase: DialoguePhase): string {
  return DRAG_MISS_MESSAGES[phase];
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
// SPEED TIMER FAILURE — Shown when the speed-variant countdown hits zero
// ============================================================================

const SPEED_TIME_UP_MESSAGES: Record<DialoguePhase, string> = {
  0: "Time's up! Shake it off. A fresh puzzle awaits.",
  1: 'Time slipped away! Another puzzle is ready whenever you are.',
  2: 'The clock ran dry. The letters scattered before you finished.',
  3: 'Time collapsed. The arrangement closed this path.',
  4: 'The hour was consumed. The arrangement does not wait. Offer again.',
  5: 'Time settled where it fell. The threads rest. Begin again, gently.',
};

export function getSpeedTimeUpMessage(phase: DialoguePhase): string {
  return SPEED_TIME_UP_MESSAGES[phase];
}

// ============================================================================
// REWARDED "DOUBLE THE REWARD" — opt-in, phase-aware, never a coin shout
// ============================================================================

const REWARDED_DOUBLE_LABELS: Record<DialoguePhase, string> = {
  0: 'Double this reward',
  1: 'Double this reward',
  2: 'Linger a moment... double the offering',
  3: 'Stay a while... double the offering',
  4: 'Give it your attention... double the offering',
  5: 'Tend it longer... double the offering',
};

const REWARDED_DOUBLE_CONFIRM: Record<DialoguePhase, string> = {
  0: 'Reward doubled!',
  1: 'Reward doubled!',
  2: 'The offering is doubled.',
  3: 'The offering is doubled.',
  4: 'The offering is doubled.',
  5: 'The offering is doubled.',
};

export function getRewardedDoubleLabel(phase: DialoguePhase): string {
  return REWARDED_DOUBLE_LABELS[phase];
}

export function getRewardedDoubleConfirm(phase: DialoguePhase): string {
  return REWARDED_DOUBLE_CONFIRM[phase];
}

// ============================================================================
// WHISPER GALLERY EMPTY STATE — Shown when no whispers are collected yet
// ============================================================================

const WHISPER_GALLERY_EMPTY_TEXT: Record<DialoguePhase, string> = {
  0: 'No whispers collected yet. Play puzzles and talk to your animal friends!',
  1: 'No whispers collected yet. Play puzzles and visit your friends. They have things to say.',
  2: 'Nothing collected yet. The house is listening for your words.',
  3: 'The walls are quiet... for now.',
  4: 'The walls are quiet... for now.',
  5: 'The walls are quiet now. Every voice rests in its place.',
};

export function getWhisperGalleryEmptyText(phase: DialoguePhase): string {
  return WHISPER_GALLERY_EMPTY_TEXT[phase];
}

// ============================================================================
// NEXT STREAK MILESTONE — One-line nudge toward the next streak reward
// ============================================================================

/**
 * Get a short, phase-toned line describing how far the player is from the
 * next streak milestone (3/7/14/21/30 days). Returns null once the top
 * milestone has been reached.
 */
export function getNextStreakMilestoneText(
  phase: DialoguePhase,
  currentStreak: number,
): string | null {
  const next = STREAK_MILESTONES.find(m => m.streak > currentStreak);
  if (!next) return null;

  const daysLeft = next.streak - currentStreak;
  const dayWord = daysLeft === 1 ? 'day' : 'days';

  switch (phase) {
    case 0:
      return `${daysLeft} more ${dayWord} → +${next.amber} amber!`;
    case 1:
      return `${daysLeft} more ${dayWord} to a +${next.amber} amber streak bonus.`;
    case 2:
      return `${daysLeft} more ${dayWord}. ${next.amber} amber waits at day ${next.streak}.`;
    case 3:
      return `${daysLeft} more ${dayWord}. The pattern counts toward ${next.streak}.`;
    case 4:
      return `${daysLeft} more ${dayWord}. The chain wants ${next.streak}.`;
    case 5:
    default:
      return `The chain continues. Day ${next.streak} will come, in time.`;
  }
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
  if (phase === 4) return 'The Offering:';
  return 'The Pattern:'; // Phase 5 — serene, settled
}

/**
 * Get the ritual echo footer/subtitle shown below the word chain
 */
export function getRitualEchoFooter(phase: number, wordCount: number): string {
  if (phase <= 0) return '';
  if (phase === 1) return 'A curious path...';
  if (phase === 2) return 'The pattern takes shape...';
  if (phase === 3) return 'The arrangement accepts.';
  if (phase === 4) return `${wordCount} words offered to the pattern.`;
  return `${wordCount} words woven into the pattern.`; // Phase 5 — the pattern continues
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

  // Phase 5 templates - serene, settled; the pattern simply continues
  const phase5Templates = [
    `${firstWord} settles into ${lastWord}`,
    `The Weave of ${lastWord}`,
    `${firstWord} Becomes ${lastWord}`,
    `The ${lastWord} Abides`,
    `${firstWord} Returns as ${lastWord}`,
  ];

  const templates = phase >= 5 ? phase5Templates : phase >= 4 ? phase4Templates : phase >= 3 ? phase3Templates : phase2Templates;
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
  if (phase === 4) return `${totalWords} words offered to the arrangement`;
  return `${totalWords} words woven into the pattern`; // Phase 5 — serene
}

/**
 * Non-spoiler journey wording for player-facing stats. Never expose the internal
 * phase model or a numeric phase counter.
 */
export function getJourneyAtmosphereText(phase: number): string {
  const labels = [
    'Bright',
    'Curious',
    'Deepening',
    'Unsettled',
    'Reverent',
    'Still',
  ];
  return labels[phase] ?? labels[0];
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
      "There's a new puzzle path now... one special arrangement each day.",
      "It's called the Daily Challenge. Same words for everyone, and it asks a little more of you.",
      "Try it from the header when you want to test yourself. The house notices the daily ones.",
    ];
  }
  if (phase >= 2) {
    return [
      "You've grown stronger with these words, so I want to show you something new.",
      "The Daily Challenge appears once each day. One shared puzzle, a little tougher than usual.",
      "You'll find it in the header. The same arrangement for everyone, every day. There's something to that.",
    ];
  }
  return [
    "Something new showed up this morning, friend. Come see.",
    "There's a Daily Challenge now. One special puzzle each day, the same one for everyone. A little harder than usual.",
    "You'll find it up in the header. Try it when you're feeling brave. The amber's worth it.",
  ];
}

// ============================================================================
// FOX JOURNAL INTRO — One-time guided walkthrough of the Journal hub
// ============================================================================

/**
 * Fox introduces the Journal when it first becomes available (~puzzle 6).
 * Five lines: concept intro, Word Ledger, Whisper Gallery, Weekly Quests, closing.
 * Phase-aware so the tone matches wherever the player happens to be.
 */
export function getJournalIntroLines(phase: DialoguePhase): string[] {
  if (phase >= 4) {
    return [
      "The arrangement speaks through many voices now. I've gathered them all into one place, a living record.",
      "The Word Ledger holds every word you've offered. Scroll through it and you'll see the shape of what you've built.",
      "The Whisper Gallery preserves every voice... mine, the others', the echoes that linger after each puzzle. Nothing is lost.",
      "And the quests, daily tasks and weekly challenges... the arrangement sets them. Complete them and the amber flows deeper.",
      "Find it all behind the book icon. The pages have been filling themselves. They were always going to.",
    ];
  }
  if (phase >= 3) {
    return [
      "There's a record now. Every voice, every word, every echo that refused to fade... I've been keeping them.",
      "The Word Ledger tracks every word that's passed through your puzzles. Some of them... linger longer than others.",
      "The Whisper Gallery holds what we've said to you. Conversations, whispers, the things spoken between puzzles.",
      "Daily and weekly quests appear in there too. New tasks each day and week, fresh amber for completing them.",
      "The book icon in the header opens it all. I think the house wants you to read what's been written.",
    ];
  }
  if (phase >= 2) {
    return [
      "I've been writing things down, friend. The words, the whispers... everything that passes through this house.",
      "The Word Ledger keeps a record of every word you've shifted. It's longer than you might expect.",
      "The Whisper Gallery collects what the animals say to you. Every conversation, every quiet thought shared after a puzzle.",
      "There are daily and weekly quests in there too. Fresh challenges each day and week with amber waiting at the end.",
      "Tap the book icon up top to open the journal. Some of it reads differently now than when it was first spoken.",
    ];
  }
  if (phase >= 1) {
    return [
      "I started keeping a journal. The words you shift, the things we say to you... it all gets written down.",
      "There's a Word Ledger that tracks every word from your puzzles. It's nice to look back on where you've been.",
      "The Whisper Gallery saves the conversations and little whispers the animals share with you. Every voice, remembered.",
      "You'll also find daily and weekly quests, small goals that refresh each day and week with amber rewards.",
      "Look for the book icon in the header. Take a peek when you have a quiet moment.",
    ];
  }
  return [
    "I've been keeping something for you... a journal! Let me show you what's inside.",
    "See this first part? That's your Word Ledger. Every word you shift in a puzzle gets written down here. It's like a scrapbook of everywhere you've been.",
    "And this... the Whisper Gallery. When the animals talk to you, or whisper something after a puzzle, it all gets saved. So you can come back and read it anytime.",
    "There are daily and weekly quests in here too! Little goals that refresh each day and week. Finish them and you'll earn extra amber.",
    "Tap the book icon up top whenever you want to look back. It's yours, friend.",
  ];
}

export interface JournalSpotlightStep {
  id: 'cover' | 'ledger' | 'gallery' | 'quests' | 'open';
  icon: string;
  title: string;
  eyebrow: string;
  preview: string;
  pointerText: string;
  cardLabel: string;
  showInPreview: boolean;
  finalCtaLabel: string;
}

export function getJournalSpotlightSteps(
  phase: DialoguePhase,
  galleryTitle: string
): JournalSpotlightStep[] {
  if (phase >= 4) {
    return [
      {
        id: 'cover',
        icon: '📚',
        title: 'Journal',
        eyebrow: 'THE RECORD OPENS',
        preview: 'A single place for every word, voice, and task the arrangement keeps.',
        pointerText: 'The marked book up top opens all of this.',
        cardLabel: 'Begin here',
        showInPreview: true,
        finalCtaLabel: 'Enter the Record',
      },
      {
        id: 'ledger',
        icon: '📘',
        title: 'Word Ledger',
        eyebrow: 'THE WORDS',
        preview: 'Every offered word is written down and left to linger.',
        pointerText: 'The marked book up top opens all of this.',
        cardLabel: 'Words',
        showInPreview: true,
        finalCtaLabel: 'Enter the Record',
      },
      {
        id: 'gallery',
        icon: '📜',
        title: galleryTitle,
        eyebrow: 'THE VOICES',
        preview: 'Conversations, whispers, and echoes remain waiting inside.',
        pointerText: 'The marked book up top opens all of this.',
        cardLabel: 'Voices',
        showInPreview: true,
        finalCtaLabel: 'Enter the Record',
      },
      {
        id: 'quests',
        icon: '🗓',
        title: 'Weekly Quests',
        eyebrow: 'THE TASKS',
        preview: 'Fresh work arrives each week, with amber left at the end.',
        pointerText: 'The marked book up top opens all of this.',
        cardLabel: 'Tasks',
        showInPreview: true,
        finalCtaLabel: 'Enter the Record',
      },
      {
        id: 'open',
        icon: '✨',
        title: 'Open It From Here',
        eyebrow: 'READY',
        preview: 'The glowing book in the header is your way back in.',
        pointerText: 'The journal lives here.',
        cardLabel: 'Return anytime',
        showInPreview: false,
        finalCtaLabel: 'Enter the Record',
      },
    ];
  }

  if (phase >= 2) {
    return [
      {
        id: 'cover',
        icon: '📚',
        title: 'Journal',
        eyebrow: 'NOW KEEPING WATCH',
        preview: 'Your words, whispers, and weekly tasks all have a place here now.',
        pointerText: 'The book up top opens all of this.',
        cardLabel: 'Start here',
        showInPreview: true,
        finalCtaLabel: 'Open the Journal',
      },
      {
        id: 'ledger',
        icon: '📘',
        title: 'Word Ledger',
        eyebrow: 'THE WORDS',
        preview: 'Every shifted word is saved, ready to be revisited.',
        pointerText: 'The book up top opens all of this.',
        cardLabel: 'Words',
        showInPreview: true,
        finalCtaLabel: 'Open the Journal',
      },
      {
        id: 'gallery',
        icon: '📜',
        title: galleryTitle,
        eyebrow: 'THE VOICES',
        preview: 'Conversations and post-puzzle whispers stay with you.',
        pointerText: 'The book up top opens all of this.',
        cardLabel: 'Voices',
        showInPreview: true,
        finalCtaLabel: 'Open the Journal',
      },
      {
        id: 'quests',
        icon: '🗓',
        title: 'Weekly Quests',
        eyebrow: 'FRESH EACH WEEK',
        preview: 'Short goals, rotating challenges, and amber rewards.',
        pointerText: 'The book up top opens all of this.',
        cardLabel: 'Goals',
        showInPreview: true,
        finalCtaLabel: 'Open the Journal',
      },
      {
        id: 'open',
        icon: '✨',
        title: 'Open It From Here',
        eyebrow: 'READY',
        preview: 'The glowing book in the header is your shortcut back.',
        pointerText: 'The journal lives here.',
        cardLabel: 'Return anytime',
        showInPreview: false,
        finalCtaLabel: 'Open the Journal',
      },
    ];
  }

  return [
    {
      id: 'cover',
      icon: '📚',
      title: 'Journal',
      eyebrow: 'NEW IN THE HOUSE',
      preview: 'One place for your words, whispers, and weekly tasks.',
      pointerText: 'The book up top opens all of this.',
      cardLabel: 'Start here',
      showInPreview: true,
      finalCtaLabel: 'Take a Look',
    },
    {
      id: 'ledger',
      icon: '📘',
      title: 'Word Ledger',
      eyebrow: 'RECORD',
      preview: 'Every shifted word gets written down here.',
      pointerText: 'The book up top opens all of this.',
      cardLabel: 'Words',
      showInPreview: true,
      finalCtaLabel: 'Take a Look',
    },
    {
      id: 'gallery',
      icon: '📜',
      title: galleryTitle,
      eyebrow: 'VOICES',
      preview: 'Conversations and post-puzzle whispers stay with you.',
      pointerText: 'The book up top opens all of this.',
      cardLabel: 'Voices',
      showInPreview: true,
      finalCtaLabel: 'Take a Look',
    },
    {
      id: 'quests',
      icon: '🗓',
      title: 'Weekly Quests',
      eyebrow: 'FRESH EACH WEEK',
      preview: 'Short goals, rotating challenges, and amber rewards.',
      pointerText: 'The book up top opens all of this.',
      cardLabel: 'Goals',
      showInPreview: true,
      finalCtaLabel: 'Take a Look',
    },
    {
      id: 'open',
      icon: '✨',
      title: 'Open It From Here',
      eyebrow: 'READY',
      preview: 'The glowing book in the header is your shortcut back.',
      pointerText: 'The journal lives here.',
      cardLabel: 'Return anytime',
      showInPreview: false,
      finalCtaLabel: 'Take a Look',
    },
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
  return "Play more puzzles and gather amber, okay? I want to invite more friends. The house will feel so much fuller with everyone here.";
}

export function getFoxSetupSelectorIntroLines(phase: number): string[] {
  if (phase >= 4) {
    return [
      'Before you begin, touch the setup seal. You can choose how demanding the next arrangement should be.',
      'Some paths are short. Some are deeper. In time, stranger patterns will gather there too.',
      'Choose the shape of this next offering, then begin.',
    ];
  }
  if (phase >= 3) {
    return [
      'Before you start, tap the setup button for me. It lets you choose how hard the next puzzle should feel.',
      'Short paths, deeper paths... and later, a few stranger arrangements besides.',
      'Pick a path that feels right, then we will keep building.',
    ];
  }
  return [
    'Before you jump in, tap the setup button. It lets you choose how gentle or tricky the next puzzle will be.',
    'Right now it changes the depth of the path. Later, a few new puzzle styles will show up there too.',
    'Pick what sounds fun, then let us play.',
  ];
}

/**
 * Fox's one-time "Keeper's Welcome" starter-pack intro. Warm, in-world framing:
 * Fox never mentions money (narrative rule 1 — the animals don't know they're in
 * a game); she describes a welcome gift set aside on "the shelf", and dismissing
 * the intro opens the Store where the actual price is shown. Fires early (~puzzle
 * 12), so this is mostly the bright-days voice, with a quieter later variant.
 */
export function getFoxStarterIntroLines(phase: number): string[] {
  if (phase >= 2) {
    return [
      "You've stayed longer than most, friend. The house remembers who remains.",
      'There is a welcome kept for keepers like you. A measure of amber, and a few hints for the road ahead.',
      "It waits on the shelf whenever you'd like it. Small comforts, freely offered.",
    ];
  }
  return [
    "You've settled in so nicely, friend. The house notices who stays.",
    "There's a little welcome we set aside for new keepers. A pouch of amber and a few hints, to keep the early days cozy.",
    "It's waiting on the shelf whenever you'd like to take it. No hurry at all.",
  ];
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
    fox: ['Ember is warming by the fire.', 'Ember says nice work!', 'Ember is proud of you.', 'Ember saved you the warmest spot.', 'Ember says the fire likes you already.'],
    owl: ['Archimedes nods approvingly.', 'Archimedes marked the page.', 'Archimedes is reading.', 'Archimedes dog-eared a happy page.', 'Archimedes says you have a clever mind.'],
    pangolin: ['Panko is cooking something.', 'Panko says well done!', 'Panko is humming.', 'Panko slid you an extra helping.', 'Panko says the kitchen feels brighter with you here.'],
    axolotl: ['Axel is floating happily.', 'Axel waves a tiny hand.', 'Axel blew some bubbles.', 'Axel did a little happy spin.', 'Axel says the water is the perfect temperature.'],
    capybara: ['Chill is relaxing.', 'Chill gives a thumbs up.', 'Chill seems content.', 'Chill saved you a seat in the sun.', 'Chill says: nice and easy. Just like that.'],
    fennec_fox: ['Fennick perked up!', 'Fennick is listening.', 'Fennick heard you win.', 'Fennick wiggled his big ears.', 'Fennick says your footsteps sound friendly.'],
    sloth: ['Sloane... smiled... slowly.', 'Sloane... approves.', 'Sloane noticed. Eventually.', 'Sloane... waved... eventually.', 'Sloane... likes... your... company.'],
    wombat: ['Warren felt that from below.', 'Warren tapped the wall.', 'Warren is digging.', 'Warren left you a cozy nook in the burrow.', 'Warren says the ground feels happy today.'],
    rabbit: ['Thyme hopped excitedly!', 'Thyme is making tea.', 'Thyme clapped!', 'Thyme poured you a fresh cup.', 'Thyme says today is a good day!'],
    red_panda: ['Bamboo is meditating.', 'Bamboo breathed deeply.', 'Bamboo is at peace.', 'Bamboo left you a warm cushion.', 'Bamboo says your heart sounds calm.'],
  },
  1: {
    fox: ['Ember noticed the words you used.', 'Ember stared into the fire after that one.', 'Ember says the flames flickered.', 'Ember wonders where the warmth really comes from.', 'Ember says fire remembers more than we do.'],
    owl: ['Archimedes found a related passage.', 'Archimedes is cross-referencing.', 'Archimedes wrote something down.', 'Archimedes keeps finding the same symbol.', 'Archimedes wonders who wrote the notes in the margins.'],
    pangolin: ['Panko says the recipe changed.', 'Panko tasted something new.', 'Panko is adjusting the spices.', 'Panko swears she did not buy that spice.', 'Panko wonders who taught her this recipe.'],
    axolotl: ['Axel felt a ripple.', 'Axel says the water shifted.', 'Axel is staring at something.', 'Axel wonders what is on the other side of the glass.', 'Axel says the water hums when you win.'],
    capybara: ['Chill noticed. Stayed chill.', 'Chill filed that away.', 'Chill is thinking.', 'Chill wonders why the calm feels arranged.', 'Chill watched the patterns line up. Stayed chill.'],
    fennec_fox: ['Fennick heard something in those words.', 'Fennick is alert.', 'Fennick tilted his head.', 'Fennick wonders what keeps calling.', 'Fennick says the quiet has a shape now.'],
    sloth: ['Sloane... felt... something.', 'Sloane... is... thinking.', 'Sloane... paused.', 'Sloane... wonders... if... you... feel... it... too.', 'Sloane... has... been... counting.'],
    wombat: ['Warren says the ground trembled.', 'Warren heard it below.', 'Warren is checking the walls.', 'Warren wonders how deep the burrow really goes.', 'Warren found a tunnel he did not dig.'],
    rabbit: ['Thyme is a little nervous.', 'Thyme felt a chill.', 'Thyme is wringing her paws.', 'Thyme keeps glancing at the door.', 'Thyme wonders why she keeps counting the exits.'],
    red_panda: ['Bamboo sensed a shift.', 'Bamboo opened one eye.', 'Bamboo exhaled slowly.', 'Bamboo wonders what the stillness is waiting for.', 'Bamboo says the silence learned a word today.'],
  },
  2: {
    fox: ['The fire noticed what you formed.', 'Ember says the flames spelled something.', 'Ember is watching the embers closely.', 'Ember says the fire wants the cold words.', 'The flames leaned toward your last word.'],
    owl: ['Archimedes says that word is in the text.', 'Archimedes underlined something.', 'The book opened on its own.', 'Archimedes says the book was waiting for that word.', 'A page wrote itself while you played.'],
    pangolin: ['Panko says the ingredients rearranged.', 'The kitchen smells different.', 'Panko is stirring something dark.', 'Panko says the pantry rearranged overnight.', 'The kitchen is colder where you stood.'],
    axolotl: ['The water remembered that word.', 'Axel sank a little deeper.', 'Something moved beneath Axel.', 'Axel says something on the glass is looking back.', 'The water dimmed when you finished.'],
    capybara: ['Chill catalogued the arrangement.', 'Chill added it to the list.', 'Chill is still calm. Unsettlingly so.', 'Chill says the schedule has your name in it.', 'Chill underlined your word. Twice.'],
    fennec_fox: ['Fennick heard that word echo.', 'The desert is listening.', 'Fennick says it is getting closer.', 'Fennick says the echo answered this time.', 'The desert held its breath when you won.'],
    sloth: ['Sloane... already... knew.', 'Time... slowed... again.', 'Sloane... felt... it... pass.', 'Sloane... is... not... surprised... anymore.', 'It... was... always... going... to... be... this... word.'],
    wombat: ['Warren found that word underground.', 'The tunnels echoed.', 'Warren is digging faster.', 'Warren says the bottom is deeper than yesterday.', 'Something below repeated your word back.'],
    rabbit: ['Thyme is pretending not to notice.', 'Thyme hid under the table.', 'Thyme whispered: I know.', 'Thyme stopped pretending she did not hear it.', 'Thyme says the walls are thinner now.'],
    red_panda: ['Bamboo says the pattern grows.', 'The incense burned brighter.', 'Bamboo is chanting softly.', 'Bamboo says the pattern learned your hand.', 'The incense bent toward your offering.'],
  },
  3: {
    fox: ['The fire thanks you for the offering.', 'Ember sees what you wrote in the flames.', 'Another verse for the fire.', 'Ember stopped calling it a campfire.', 'The fire eats your words and asks for more.'],
    owl: ['The text predicted those exact words.', 'Archimedes says it is nearly complete.', 'The pages are turning themselves.', 'Archimedes says only the last page remains.', 'The text knows what you will write next.'],
    pangolin: ['The final recipe is taking shape.', 'Panko says the offering is almost ready.', 'The kitchen shakes.', 'Panko says the table is set for a guest.', 'The offering no longer needs her hands.'],
    axolotl: ['Something rose from below the water.', 'Axel says it is so close now.', 'The water has gone still.', 'Axel does not flinch at the shape anymore.', 'The water parted for your last word.'],
    capybara: ['Everything is proceeding as planned.', 'Chill says the schedule holds.', 'The arrangement is on track.', 'Chill says everything is precisely on time.', 'There is nothing left to reschedule.'],
    fennec_fox: ['Fennick can hear it breathing.', 'The sound is almost here.', 'Fennick says: listen.', 'Fennick stopped covering his ears.', 'It is close enough to hear your name now.'],
    sloth: ['It... approaches... at the speed... it was always... going to.', 'Sloane is... ready.', 'No need... to rush.', 'It... arrives... exactly... when... it... must.', 'Sloane... has... already... said... goodbye.'],
    wombat: ['The foundation is complete.', 'Warren says: I found the bottom.', 'Something is under the house.', 'Warren says the foundation is finished. For it.', 'Whatever waits below is awake now.'],
    rabbit: ['Thyme stopped running.', 'Thyme says: there is nowhere left to go.', 'Thyme is ready. Terrified, but ready.', 'Thyme is done running. There is nowhere left.', 'Thyme says the garden gate locked itself.'],
    red_panda: ['The pattern accepts your offering.', 'Bamboo says: breathe. Accept.', 'We are nearly one.', 'Bamboo says the thread is almost whole.', 'There is little left between us and it.'],
  },
  4: {
    fox: ['Every word brings us closer. The fire knows.', 'Another incantation spoken. The flames rise.', 'Ember whispers: thank you.', 'Ember says you fed the fire well, friend.', 'The flames spell your name in gratitude.'],
    owl: ['The text is complete. You wrote the last verse.', 'Archimedes closes the book. It opens again.', 'The words have been spoken.', 'Archimedes says you wrote the closing line.', 'The text is whole. You completed it.'],
    pangolin: ['The offering is prepared. You seasoned it yourself.', 'Panko sets the table. For what comes.', 'The recipe was always your words.', 'Panko says the meal was always for what comes.', 'You seasoned the offering yourself. Perfectly.'],
    axolotl: ['It has surfaced. You called it.', 'The water is warm now. It should not be.', 'Axel smiles. The water smiles.', 'It wears the water like a smile now.', 'Axel says you taught it to surface.'],
    capybara: ['The arrangement is complete. Chill is satisfied.', 'All according to plan. Your plan.', 'Chill says: relax. It is done.', 'Chill says the plan was yours all along.', 'Everything arranged. Nothing left undone.'],
    fennec_fox: ['The sound is here. You gave it voice.', 'Fennick is silent now. Listening.', 'It speaks in the words you formed.', 'It speaks now, in the words you gave it.', 'Fennick says you were the voice it waited for.'],
    sloth: ['It... is... here.', 'Sloane... always... knew.', 'Time... no... longer... matters.', 'You... were... always... part... of... this.', 'It... is... here... because... of... you.'],
    wombat: ['The foundation holds what you summoned.', 'Warren built this for you. For it.', 'The tunnels lead somewhere now.', 'Warren says you summoned what the foundation holds.', 'The tunnels open toward you now.'],
    rabbit: ['Thyme is not afraid anymore. That is worse.', 'We all played our part. Especially you.', 'Thyme is at peace. That terrifies you.', 'Thyme is calm. You should not be.', 'We all helped. You most of all.'],
    red_panda: ['The pattern is complete. You are the final thread.', 'Bamboo exhales. The universe inhales.', 'Oneness achieved. Was it what you expected?', 'Bamboo says you are the final thread, friend.', 'The universe inhales. You exhaled it here.'],
  },
  5: {
    fox: ['The fire burns low. Ember watches the embers. Both are content.', 'Ember hums a lullaby the flames taught her.', 'The warmth remains. It always will.', 'Ember says the smoke writes your name now.', 'The den smells of cedar and something finished.'],
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

  // Personalized whispers are the strongest Phase 5 beat (the game proves it
  // was watching) — favor them over the standard pool most of the time.
  if (Math.random() < 0.65) {
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
    'Check in on {name}, they love visitors!',
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
      `${word} was the word it was waiting for. The arrangement trembles with recognition.`,
      `The keepers felt ${word} in their bones. It feels closer now.`,
      `${word} completes another verse. The silence between the words thickens.`,
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
  /** Type of micro-beat effect. `silent_victory` also suppresses the fanfare. */
  type: 'glitch_title' | 'ambient_whisper' | 'color_shift' | 'silent_victory';
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
    text: 'The rooms are quieter now. Not empty... listening.',
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
  // Mid-game valley beats (140–185): the house finishes around puzzle 130 but the
  // Phase 4 reveal doesn't land until ~155, leaving a stretch with no new unlocks.
  // These keep the narrative pulse alive through that gap — escalating dread that
  // bridges "the house is whole" into the cult reveal and one slog-breaker beyond
  // it — so the climb to the climax never goes quiet.
  140: {
    type: 'ambient_whisper',
    text: 'The house is finished. Every room full. So why does it still feel like it\'s waiting for something?',
    durationMs: 4000,
  },
  155: {
    type: 'ambient_whisper',
    text: 'The animals have stopped pretending the puzzles are just puzzles. They watch you the way you\'d watch a door beginning to open.',
    durationMs: 4500,
  },
  160: {
    // Scripted anticlimax: the fanfare simply does not play. The rendered text
    // is stark; App suppresses the victory chime on this one board so the
    // silence is felt, not described. The most complicit moment is a quiet one.
    type: 'silent_victory',
    text: '...\n\nNo music this time. Only the quiet after.',
    durationMs: 4000,
  },
  170: {
    type: 'ambient_whisper',
    text: 'You could stop now. You know that. You won\'t. They know that too.',
    durationMs: 4000,
  },
  185: {
    type: 'ambient_whisper',
    text: 'Each arrangement settles a little deeper than the last. The space between the words is no longer empty.',
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
 * Whether the victory at this exact completed-puzzle count is a scripted
 * silent-victory anticlimax (the fanfare is suppressed). Pure lookup — the count
 * is monotonic, so this is true for exactly one board. App reads it before
 * playing the victory chime.
 */
export function isSilentVictoryBeat(completedTotal: number): boolean {
  return MICRO_BEATS[completedTotal]?.type === 'silent_victory';
}

/**
 * Message shown when an echo puzzle (seeded from the player's own ritual words)
 * begins. Phase-aware — unsettling during the reveal (Phase 3-4), serene after.
 */
export function getEchoPuzzleMessage(phase: DialoguePhase): string {
  if (phase >= 5) return 'The words are returning. They remember you.';
  if (phase >= 4) return 'You have offered this word before. It has come back for you.';
  return 'These letters feel familiar. Have you arranged them before?';
}

/**
 * "Remembered by name" — when the player feeds the pit a dread word, the
 * arrangement notes the specific offering (assessment §6, the cheapest real
 * complicity lever). Phase 2+ only; {word} is the strongest dread word offered.
 * The point is quiet accusation: you didn't have to give us this.
 */
/**
 * Daily-challenge narrative host line ("Panko prepared today's offering") — the
 * daily was the only ritual with no animal attached (assessment §7). Phase-aware.
 * {host} is the animal's display name, resolved by the caller.
 */
export function getDailyHostLine(hostName: string, phase: DialoguePhase): string {
  if (phase >= 4) return `${hostName} laid out today's offering. It is ready for you.`;
  if (phase >= 2) return `${hostName} prepared today's arrangement. They were waiting for you.`;
  return `${hostName} prepared today's puzzle just for you!`;
}

export function getDreadOfferingLine(word: string, phase: DialoguePhase): string {
  const w = word.toUpperCase();
  if (phase >= 5) return `${w}. It is part of the weave now. Woven by your hand.`;
  if (phase >= 4) return `You gave us ${w}. You didn't have to.`;
  if (phase >= 3) return `${w} slips into the dark. The pit remembers it.`;
  return `Something in ${w} sinks deeper than the rest.`;
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
  action: 'daily' | 'play' | 'pit' | 'quests';
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
    reverse: 'Reverse Shift is available. Try going backward.',
    double_shift: 'Double Shift unlocked. Move two letters at once.',
    speed: 'Speed Shift is ready. Race the clock.',
  },
  2: {
    reverse: 'Reverse Shift... the words can be undone.',
    double_shift: 'Double Shift. Twice the letters, twice the weight.',
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

const QUEST_CLAIM_SUGGESTIONS: Record<DialoguePhase, string[]> = {
  0: ['Your weekly quests have amber ready to claim!', 'Quest rewards are waiting for you.'],
  1: ['Unclaimed quest amber is waiting.', 'Your weekly rewards are ready to collect.'],
  2: ['The week has already yielded amber.', 'Claim what the week has offered.'],
  3: ['The week has prepared its reward.', 'Claim the amber the rituals produced.'],
  4: ['The arrangement has set aside amber for you.', 'Your weekly rewards are ready to be taken.'],
  5: ['The week has left amber in the weave.', 'Claim the threads already completed.'],
};

const PIT_SUGGESTIONS: Record<DialoguePhase, string[]> = {
  0: ['Fresh words are waiting in the pit.', 'Offer your waiting words for amber.'],
  1: ['The pit is holding your latest words.', 'Your newest words are ready to offer.'],
  2: ['The pit is full of waiting arrangements.', 'Pending words linger below.'],
  3: ['The pit waits for what you have gathered.', 'Your latest offerings have not yet been fed.'],
  4: ['The pit is waiting. Feed it what remains.', 'The arrangement has not forgotten your stored words.'],
  5: ['Waiting threads still drift in the pit.', 'The pit still holds what you gathered.'],
};

/**
 * Get a contextual goal suggestion for the home screen.
 * Returns the highest-priority actionable suggestion, or null if none apply.
 *
 * @param phase - Current narrative phase
 * @param dailyAvailable - Daily challenge unlocked AND not completed today
 * @param untriedDifficulties - Difficulty levels never completed (e.g., ['MEDIUM_PLUS', 'HARD'])
 * @param newVariant - Most recently unlocked variant not yet tried, or null
 * @param pendingHarvest - Whether the pit currently holds unoffered words
 * @param claimableQuestAmber - Total amber ready to claim from completed weekly quests
 * @param hasActiveQuests - Whether there are incomplete weekly quests
 */
export function getGoalSuggestion(
  phase: DialoguePhase,
  dailyAvailable: boolean,
  untriedDifficulties: string[],
  newVariant: string | null,
  pendingHarvest: boolean,
  claimableQuestAmber: number,
  hasActiveQuests: boolean,
): GoalSuggestion | null {
  // Priority 1: Unclaimed harvest should be impossible to miss.
  if (pendingHarvest) {
    const lines = PIT_SUGGESTIONS[phase] ?? PIT_SUGGESTIONS[0];
    return { text: lines[Math.floor(Math.random() * lines.length)], action: 'pit' };
  }

  // Priority 2: Claim completed weekly quest rewards.
  if (claimableQuestAmber > 0) {
    const lines = QUEST_CLAIM_SUGGESTIONS[phase] ?? QUEST_CLAIM_SUGGESTIONS[0];
    return {
      text: `${lines[Math.floor(Math.random() * lines.length)]} (+${claimableQuestAmber} amber)`,
      action: 'quests',
    };
  }

  // Priority 3: Uncompleted daily challenge
  if (dailyAvailable) {
    const lines = DAILY_SUGGESTIONS[phase] ?? DAILY_SUGGESTIONS[0];
    return { text: lines[Math.floor(Math.random() * lines.length)], action: 'daily' };
  }

  // Priority 4: Untried difficulty
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

  // Priority 5: Newly unlocked variant
  if (newVariant) {
    const phaseTexts = VARIANT_SUGGESTIONS[phase] ?? VARIANT_SUGGESTIONS[0];
    const text = phaseTexts[newVariant];
    if (text) return { text, action: 'play' };
  }

  // Priority 6: Active weekly quests
  if (hasActiveQuests) {
    const lines = QUEST_SUGGESTIONS[phase] ?? QUEST_SUGGESTIONS[0];
    return { text: lines[Math.floor(Math.random() * lines.length)], action: 'quests' };
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
    '{words} words, {amber} amber. The pit seems pleased!',
    'Wonderful! The house thanks you for {words} words. Here is {amber} amber.',
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
 * Phase-aware message shown when pending harvest batches hit the 200 cap.
 * Oldest batches are merged (never dropped — no amber is lost); this nudges
 * the player to visit the Pit and clear the backlog.
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
  // Threshold kept low: the later phases are several times longer than the
  // first, and a 0.3 gate left the pit mute for dozens of puzzles after each
  // transition.
  if (fraction < 0.15) return null; // Too early
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
    'Something is ready in the pit. I can feel it from here... a kind of warmth.',
    'The marks along the edge are glowing. They weren\'t doing that before.\nYou should go see what your words woke up.',
  ],
  2: [
    'The pit has changed. Can you feel it? The air is thicker down there now.',
    'Your words grew heavy enough to wake something. Go see what the marks have to say.',
  ],
  3: [
    'The dark stirs below. The pit is calling, not with sound, but with... pull.',
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
 * Fox's one-time lore intro the first time a level-gated room (the Jungle
 * Hammock, by default) blocks the player. Explains, in-world, WHY the house
 * can't simply be bought forward here, and points at the two amber options:
 * Reserve (set the amber aside now, it rises on its own when the gate opens)
 * and Skip (press it to completion now, for a little more amber). Fires around
 * the first gate (~level 28), so mostly the bright-days voice, with a quieter
 * later variant. `roomName` is the gated room's display name ("Jungle Hammock").
 */
export function getGatedRoomIntroLines(phase: number, roomName: string): string[] {
  if (phase >= 2) {
    return [
      `The house has grown quickly with you, friend. But the ${roomName} is not ready to rise yet.`,
      'Some rooms ask more than amber. They ask for time, and for words... more of them offered to the pit before the ground will hold the walls.',
      'If you have the amber, you need not wait. Set it aside now and the room will rise on its own when the time comes, or press it to completion now for a little more.',
    ];
  }
  return [
    `The house has grown so quickly with you, friend. But the ${roomName} isn't ready to be built yet.`,
    'Some rooms need more than amber. They need a little time, and a few more words offered before the ground will hold them.',
    "If you'd rather not wait, and you have the amber to spare: set it aside now and the room will build itself when the time comes, or press it to completion now for a little more.",
  ];
}

/**
 * Fox's one-time intro lines when Challenge Mode becomes available (after 15 puzzles).
 */
export function getChallengeIntroLines(phase: DialoguePhase): string[] {
  if (phase >= 5) {
    return [
      'The arrangement has infinite depth, friend. Some paths through it are harder than others.',
      'Challenge Mode strips away the hints you no longer need. The pattern has already shown you everything.',
      'It waits in the puzzle setup. If you want to face what you helped build, face it bare.',
    ];
  }
  if (phase >= 3) {
    return [
      'The patterns grow more complex. There are harder paths, if you dare.',
      'Challenge Mode strips away your safety. No hints, limited undos. But the amber flows thicker.',
      'Look for it in the puzzle setup. The arrangement rewards those who commit fully.',
    ];
  }
  if (phase >= 2) {
    return [
      "You've grown stronger with the letters, friend. Curious about a harder path?",
      'Challenge Mode takes away your hints and limits your undos. Rougher going, but the amber comes back half again as heavy.',
      'You\'ll find it in the puzzle setup. The words feel different when there\'s no safety net.',
    ];
  }
  return [
    "I've been watching you work, friend. You've got a feel for this now.",
    'There\'s something called Challenge Mode. No hints, fewer undos. Tougher, but the amber reward is half again as much.',
    'It\'s tucked into the puzzle setup. Give it a try when you want the letters to push back a little.',
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

/**
 * Lore caption shown in the Victory modal while the pit auto-collects the
 * player's early rewards (the first AUTO_COLLECT_PUZZLE_LIMIT puzzles). It
 * explains, in-world, WHY the amber arrives on its own: the house carries the
 * words down to the pit on the player's behalf while they are still new. The
 * "for now" quietly foreshadows that the help ends (it does, at the mandatory
 * first harvest). Auto-collect only ever runs in Phase 0, but kept phase-aware
 * for consistency.
 */
export function getAutoCollectCaption(phase: DialoguePhase): string {
  if (phase >= 3) return 'The house carries your words down to the pit for you... for now.';
  if (phase >= 2) return 'The house still carries your words to the pit for you, for now.';
  return 'The house carries your words down to the pit for you, for now.';
}

/**
 * Lore dialogue shown in the Victory modal the first time the auto-collect
 * window closes and the player must offer their words at the pit themselves.
 * A one-time teach-by-doing beat: the Victory modal hides the "Next Level" CTA
 * (see VictoryData.mandatoryHarvest) so the player learns the pit by using it,
 * with an in-world line rather than a bare tutorial card. Fires just past
 * AUTO_COLLECT_PUZZLE_LIMIT, squarely Phase 0, but kept phase-aware.
 */
export function getMandatoryHarvestText(phase: DialoguePhase): string {
  if (phase >= 3) return 'The house will carry nothing more for you. Your words wait in the pit. Offer them yourself before you go on.';
  if (phase >= 2) return 'The house has stopped gathering for you, friend. Your words are waiting in the pit now. Offer them yourself before we play on.';
  return 'That is the last the house will carry for you, friend. Your words are waiting in the pit now. Go and offer them yourself before we play on.';
}

/** CTA button label for the one-time mandatory first-harvest gate. */
export function getMandatoryHarvestCTA(phase: DialoguePhase): string {
  if (phase >= 3) return 'Offer your words to the pit';
  return 'Offer your words at the Pit';
}

/**
 * Fox greets the player AT the pit the first time a manual harvest is
 * required (words waiting, pit still unlearned). The victory gate's line only
 * says the house stopped carrying; this beat explains, in-world, what to DO
 * down here. Shown until a real offer marks the harvest learned, so an
 * interrupted first visit re-teaches on the next one. Fires just past
 * AUTO_COLLECT_PUZZLE_LIMIT, squarely Phase 0, but kept phase-aware.
 */
export function getMandatoryHarvestPitIntroLines(phase: DialoguePhase): string[] {
  if (phase >= 3) {
    return [
      'Your words wait above the pit. They will not offer themselves.',
      'The house carries nothing now. What you form, you bring. What you bring, you give.',
      'Tap each word and let the pit take it. The amber returns to you, as it must.',
    ];
  }
  if (phase >= 2) {
    return [
      'You found your way down. Your words are waiting... see them drifting there?',
      'The house does not carry them anymore. That kindness has ended, friend. This part is yours now.',
      'Tap each word and let the pit take it. The amber comes back to you. It always comes back.',
    ];
  }
  return [
    'There you are! And look, your words came down with you... see them floating over the pit?',
    'The house used to carry them down and trade them for you, remember? That part is done now. The pit likes your hands better.',
    'Tap each word and watch it go under! Every one comes back to you as amber, I promise. Go on, try one!',
  ];
}

/**
 * Onboarding skip confirmation (FoxGuide): shown after the first Skip tap so a
 * stray touch can't silently abandon the guided intro. The SAFE action gets
 * the prominent pill; the skip is the quiet text button.
 */
export function getSkipConfirmText(): string {
  return 'Skip the rest of the welcome? There are only a few little steps left, and I so wanted to show you the pit...';
}

export function getSkipConfirmStayLabel(): string {
  return 'Keep going';
}

export function getSkipConfirmLeaveLabel(): string {
  return 'Skip it all';
}

/**
 * Home-screen safety net for the first-harvest gate: if the player somehow
 * lands on home past the auto-collect window with batches waiting and the pit
 * still unlearned (the victory gate was interrupted by a kill, a back press,
 * a link), Fox explains the pit once from home. Fired via the HomeScreen
 * intro-override dialogue; the pit entrance below the house glows the whole
 * time, so the words have a visible anchor.
 */
export function getHarvestHomeIntroLines(phase: DialoguePhase): string[] {
  if (phase >= 3) {
    return [
      'The house no longer carries your words down. They wait in the pit, and they are heavy.',
      'Follow the path below the house. Offer them yourself. Then we continue.',
    ];
  }
  return [
    'Oh! Friend, before you settle in... the house has stopped carrying your amber down for you.',
    'Everything you earn waits in the pit now, down past the bottom of the house. See the little glow below us?',
    'Go tap the words floating there and the pit will trade them for your amber. I promise it is the fun kind of chore.',
  ];
}

/**
 * Gentle once-per-session nudge when a big pile of amber sits unoffered in the
 * pit. One line, warm, never a command — the pit glow does the pointing.
 */
export function getHarvestNudgeLine(phase: DialoguePhase, pendingAmber: number): string[] {
  if (phase >= 4) {
    return [`${pendingAmber} amber waits below. The pit is patient. You need not be.`];
  }
  if (phase >= 2) {
    return [`Your words are pooling in the pit, friend... ${pendingAmber} amber worth. It hums when it waits this long.`];
  }
  return [`Not to fuss, but there is quite a pile waiting in the pit! ${pendingAmber} amber, just sitting there. Shall we go collect it soon?`];
}

// ============================================================================
// TENDING SHRINE — Phase-5 endgame loop. Serene custodianship, never dread.
// The player spends amber to "deepen the pattern" — a cosmetic-only sink.
// ============================================================================

/** Title of the Tending panel in the Offering Pit. */
export function getTendingTitle(): string {
  return 'Tend the Pattern';
}

/** Subtitle / current state of tending. */
export function getTendingSubtitle(level: number): string {
  if (level <= 0) {
    return 'The house is complete. But the pattern can always go deeper. Offer amber, and tend it.';
  }
  return `Tended ${level} ${level === 1 ? 'time' : 'times'}. It keeps its shape because you keep it.`;
}

/** The deepen button label. */
export function getTendingButtonLabel(): string {
  return 'Deepen the pattern';
}

/** Hint shown when the day's first-tending discount is available. */
export function getTendingDailyBonusHint(): string {
  return "The first tending each day costs less. The pattern welcomes a faithful return.";
}

/** Serene confirmation lines after a deepening (non-milestone). */
const TENDING_RESPONSES = [
  'The pattern deepens. Something in the walls settles, contentedly.',
  'The amber sinks in and stays. The house feels a little more like itself.',
  'You tended it. You did not have to. The pattern remembers that you did.',
  'A warmth spreads outward, slow and even. The shape holds.',
  'Deeper now. The keepers pause, somewhere, and feel it too.',
  'The offering takes. The pattern leans, almost imperceptibly, toward you.',
  'It is enough. It is always enough. And still you return.',
  'The fire stays lit. The walls stay warm. The pattern continues.',
];

export function getTendingResultMessage(level: number): string {
  // First tending gets a gentle, specific welcome.
  if (level === 1) {
    return 'The first tending. The pattern accepts it the way a held breath accepts release.';
  }
  return TENDING_RESPONSES[level % TENDING_RESPONSES.length];
}

/** Milestone ceremony copy (fires at TENDING_MILESTONES levels). */
export function getTendingMilestoneCeremonyText(level: number): string[] {
  switch (level) {
    case 5:
      return ['The pattern has deepened five times.', 'The keepers have begun to speak of it. Listen, when you visit them.'];
    case 10:
      return ['Ten tendings.', 'The warmth has reached every room now. The house breathes a little slower, a little fuller.'];
    case 25:
      return ['Twenty-five.', 'The shape is yours now, as much as anyone\'s. The keepers know your devotion by heart.'];
    case 50:
      return ['Fifty tendings offered.', 'There was never anything to summon. There was only this... the deepening, and the keeping. You understand that now.'];
    case 100:
      return ['One hundred.', 'The pattern and the keeper have become the same gesture. Breathe in. It deepens. Breathe out. So do you.'];
    default:
      return ['The pattern deepens.', 'Something old turns over in its long sleep, and is content.'];
  }
}

/** Label for the Tending Level readout. */
export function getTendingLevelLabel(level: number): string {
  return level <= 0 ? 'Untended' : `Depth ${level}`;
}

// ============================================================================
// COSMETIC SHOP — expression, never progression. Tone shifts with phase.
// ============================================================================

export function getShopTitle(phase: number): string {
  if (phase >= 4) return 'Vestments';
  if (phase >= 2) return 'Adornments';
  return 'Tile Shop';
}

export function getShopSubtitle(phase: number): string {
  if (phase >= 4) return 'Dress the offering. It changes nothing, and everything.';
  if (phase >= 2) return 'Spend amber to change how the words look. For yourself.';
  return 'Spend amber to dress up your tiles!';
}

export function getShopThemeSectionLabel(phase: number): string {
  if (phase >= 3) return 'TILE VESTMENTS';
  return 'TILE THEMES';
}

export function getShopConfettiSectionLabel(phase: number): string {
  if (phase >= 3) return 'CELEBRATION';
  return 'CONFETTI';
}

/** Label for the "no theme / default" option. */
export function getShopDefaultThemeName(phase: number): string {
  if (phase >= 3) return 'Unadorned';
  return 'Candy (default)';
}

export function getShopDefaultConfettiName(phase: number): string {
  if (phase >= 3) return 'Unadorned';
  return 'Classic (default)';
}

/** Locked-because-Patron note for entitlement-only cosmetics. */
export function getShopPatronLockedLabel(): string {
  return 'Patron only';
}

// ============================================================================
// NOTIFICATION PRE-PERMISSION PROMPT — In-app card shown before the system
// permission dialog, asking to enable the daily puzzle reminder.
// Tone shifts with phase but stays functional and honest — never deceptive
// about what is being enabled.
// ============================================================================

interface NotificationPromptText {
  title: string;
  body: string;
  accept: string;
  decline: string;
}

const NOTIFICATION_PROMPT_TEXT: Record<DialoguePhase, NotificationPromptText> = {
  0: {
    title: 'Daily reminder?',
    body: 'Want a gentle nudge when a fresh puzzle is ready? You can change this anytime in Settings.',
    accept: 'Sounds good',
    decline: 'Not now',
  },
  1: {
    title: 'A daily reminder?',
    body: 'We could let you know when a new puzzle is waiting for you. You can change this anytime in Settings.',
    accept: 'Yes, please',
    decline: 'Not now',
  },
  2: {
    title: 'Shall we call for you?',
    body: 'A quiet reminder when the day\'s puzzle is ready, nothing more. You can turn this off anytime in Settings.',
    accept: 'Remind me',
    decline: 'Not now',
  },
  3: {
    title: 'A reminder, each day',
    body: 'The puzzles continue whether you arrive or not. We can remind you when one is ready. Settings can silence this whenever you wish.',
    accept: 'Remind me',
    decline: 'Not yet',
  },
  4: {
    title: 'The arrangement keeps its hours',
    body: 'Each day, a puzzle is prepared. We can tell you when it is ready. That is all this enables. Settings can end it at any time.',
    accept: 'Tell me',
    decline: 'Not now',
  },
  5: {
    title: 'The pattern continues',
    body: 'A new puzzle settles into place each day. We can let you know, if you like. You can change this anytime in Settings.',
    accept: 'Let me know',
    decline: 'Not now',
  },
};

export function getNotificationPromptText(phase: DialoguePhase): NotificationPromptText {
  return NOTIFICATION_PROMPT_TEXT[phase];
}

// ============================================================================
// WIN-BACK NOTIFICATION COPY — Lapsed-player ladder (+1 / +3 / +7 days).
// Indexed by rung - 1. Tone escalates across rungs within each phase:
// rung 1 is a gentle nudge the day after going quiet, rung 2 leans harder
// after a few days, rung 3 marks a full week away. Phase register follows
// the usual arc — warm at 0-1, quietly unsettling at 2-3, reverent at 4,
// serene at 5.
// ============================================================================

// Five rungs (+1/+3/+7/+14/+30 days). The tail rungs (4/5) extend the ladder
// past the old 7-day cliff, where the game used to go permanently silent on a
// lapsed player.
const WIN_BACK_MESSAGES: Record<DialoguePhase, [string, string, string, string, string]> = {
  0: [
    'Ember saved your spot by the fire! Come solve a puzzle.',
    'Your animal friends keep asking about you. The puzzles miss you too!',
    'A whole week! The house is still cozy, and everyone\'s waiting. Come say hi.',
    'Two weeks! The fire is still warm and your chair is still empty. Pop back in?',
    'It\'s been a while. The house is exactly as you left it, cozy and waiting. Come home.',
  ],
  1: [
    'The house has been thinking about you. So have the words.',
    'Your friends have gathered new thoughts to share. They\'re saving them for you.',
    'A week of quiet. The patterns wait patiently for your return.',
    'Two weeks. The animals have new questions, and no one to ask but you.',
    'A month, nearly. The quiet has grown thoughtful. Your friends kept your place.',
  ],
  2: [
    'The house is quieter without you.',
    'Three days of stillness. The animals still speak of you... always in the present tense.',
    'A week now. The rooms remember your footsteps. The words remember your hands.',
    'Two weeks. The stillness has settled into something almost like waiting.',
    'A month. The house does not forget. It simply waits, and the waiting deepens.',
  ],
  3: [
    'The house is quieter without you. The animals have noticed.',
    'Something pauses while you are away. It does not like pausing.',
    'Seven days. The house has held its breath the whole time.',
    'Two weeks. What was building does not unbuild. It only leans closer to the door.',
    'A month of your absence. The pattern has not moved. It is very good at not moving.',
  ],
  4: [
    'The arrangement is incomplete without you.',
    'The keepers hold your place at the pattern. They are patient. It is less so.',
    'Seven days of silence. What comes through still waits for your hand.',
    'Two weeks. The keepers have not moved from their places. Neither has it.',
    'A month at the threshold. It has waited longer than this. It can wait for you.',
  ],
  5: [
    'The house rests. It will be here when you return.',
    'The pattern continues, unhurried. Your friends think of you fondly.',
    'A week has passed, gently. Nothing is lost. Return whenever you like.',
    'Two weeks of terrible peace. The house remembers you, and holds no grievance.',
    'A month on. The pattern continues without hurry. The house remembers you still.',
  ],
};

// Dedicated "finished the story" copy — a returning player who saw the finale
// gets a beat that speaks to that, instead of a generic ping. The single most
// likely person to evangelize the game; the ladder should never go silent on
// them. Used at the tail rungs when post-revelation.
const WIN_BACK_FINISHED: [string, string] = [
  'The house remembers you. It remembers everything you offered. Come sit with it a while.',
  'You saw it through to the end, and still it thinks of you. The pattern kept your place.',
];

export function getWinBackMessage(phase: number, rung: 1 | 2 | 3 | 4 | 5, finished = false): string {
  const clampedPhase = Math.min(5, Math.max(0, Math.floor(phase))) as DialoguePhase;
  // Finished-story players get the special tail copy on the long rungs (4/5).
  if (finished && rung >= 4) return WIN_BACK_FINISHED[rung === 5 ? 1 : 0];
  const idx = Math.min(4, Math.max(0, rung - 1));
  return WIN_BACK_MESSAGES[clampedPhase][idx];
}

// ─── Small interaction copy (toasts, alerts, buttons) ───────────────────────

/** Toast shown when the one-time first-daily hint mercy is granted. */
export function getFirstDailyMercyMessage(phase: number, hints: number): string {
  if (phase >= 5) return `+${hints} hints. The pattern provides.`;
  if (phase >= 4) return `+${hints} hints. The first offering is always guided.`;
  if (phase >= 2) return `+${hints} hints for your first daily. Use them well.`;
  return `+${hints} hints for your first daily. Good luck!`;
}

/** Label for the rewarded continue on the speed Time's-Up overlay. */
export function getSpeedRescueLabel(phase: number, seconds: number): string {
  if (phase >= 5) return `Continue (+${seconds}s)`;
  if (phase >= 4) return `It isn't finished (+${seconds}s)`;
  if (phase >= 2) return `Not yet (+${seconds}s)`;
  return `Keep going (+${seconds}s)`;
}

/** Alert body when a daily deep link / notification arrives before the daily is unlocked. */
export function getDailyLockedMessage(phase: number): string {
  if (phase >= 4) return 'The daily offering is not yet yours. Solve more, and it opens.';
  if (phase >= 2) return 'The daily ritual is still closed to you. A few more puzzles first.';
  return 'The Daily Challenge is still locked. Solve a few more puzzles to open it.';
}

/** Alert body for a malformed friend-challenge link. */
export function getBadChallengeLinkMessage(phase: number): string {
  if (phase >= 4) return 'The link is broken. Its words never arrived.';
  if (phase >= 2) return 'That challenge link could not be read. Its words are lost.';
  return 'That challenge link could not be read.';
}

/** Alert body for a well-formed challenge link whose words cannot make a board. */
export function getUnplayableChallengeMessage(phase: number): string {
  if (phase >= 4) return 'The words arrived, but they refuse the arrangement.';
  if (phase >= 2) return 'That challenge could not be read... its words refuse the board.';
  return 'That challenge could not be read. Its words are not playable.';
}

/** Label for the friend-challenge share button on the share preview. */
export function getChallengeFriendLabel(phase: number): string {
  if (phase >= 5) return '⚔️ Pass the pattern along';
  if (phase >= 4) return '⚔️ Draw a friend in';
  if (phase >= 2) return '⚔️ Send this to a friend';
  return '⚔️ Challenge a friend';
}

/** Cosmetic-shop → Store bridge row (title + subtitle). */
export function getShopStoreBridgeText(phase: number): { title: string; subtitle: string } {
  if (phase >= 5) return { title: 'A little more amber?', subtitle: 'The Store is always open.' };
  if (phase >= 4) return { title: 'The pattern asks more than you hold?', subtitle: 'The Store provides.' };
  if (phase >= 2) return { title: 'Short on amber?', subtitle: 'The Store carries more.' };
  return { title: 'Need more amber?', subtitle: 'Amber packs are available in the Store.' };
}

/** Title/subtitle for the very first daily-login reward claim. */
export function getDailyLoginFirstClaimCopy(phase: number): { title: string; subtitle: string } {
  if (phase >= 5) {
    return { title: 'The House Knows You', subtitle: 'A small gift for each day you return' };
  }
  if (phase >= 4) {
    return { title: 'The House Has Been Waiting', subtitle: 'Each return is counted' };
  }
  if (phase >= 2) {
    return { title: 'The House Welcomes You', subtitle: 'It notices each day you visit' };
  }
  return { title: 'Welcome to the House', subtitle: 'A little gift for every day you visit' };
}
