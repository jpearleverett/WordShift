import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import {
  Animal,
  AnimalType,
  HomeWorldProgress,
  getAnimalPhase,
  ANIMAL_AWARENESS_TIERS,
  DialoguePhase,
} from '../types/homeWorld';
import {
  resolveDialogueIndex,
  getCrossAnimalReference,
  getTriggerWordReaction,
  getVariantTutorialDialogue,
  TUTORIAL_CALLBACK_DIALOGUES,
  getCoordinatedEventLine,
  getWordThresholdDialogue,
  getTotalDialogueCount,
  getSacrificeReaction,
  getPhase2ExtraDialogues,
  getPhase2PoolLine,
  phase2PoolHasNew,
  peekNarrativeSeedPage,
  peekNarrativeCallbackPage,
  getPhase2PoolCursors,
  advancePhase2PoolCursor,
} from '../services/animalDialogue';
import { getSacrificeCount } from '../services/sacrifice';
import {
  checkDialogueAvailability,
  recordDialogue,
  endSession,
  getSession,
  getSessionStatus,
  isOnCooldown,
  updateSessionPhase,
  updateConversationBacklog,
} from '../services/dialogueSession';
// Imported straight from the dialogue data module (as homeWorldData does):
// phase-start indices are the only way to read an absolute dialogue index as
// "which phase's material is this animal actually on".
import { getPhaseStartIndex } from '../services/dialogue/animalDialogueBase';
import {
  markDialogueRead,
  consumeTriggerWords,
  getPendingVariantTutorials,
  acknowledgeVariantTutorial,
  wereTutorialSeedsPlanted,
  markTutorialSeedsPlanted,
  recordConsumedCoordinatedEvent,
  hasSeenGuaranteedCrossRef,
  markGuaranteedCrossRefSeen,
  hasSeenFoxPlayNudge,
  markFoxPlayNudgeSeen,
} from '../services/amberCurrency';
import { takeOfferingDialogue } from '../services/offeringRequests';
import { getSettingsSync } from '../services/settings';
import {
  getChoiceForAnimal,
  hasPendingDialogueChoice,
  recordChoice,
  PlayerChoice,
  DialogueChoice,
  loadChoiceState,
  getPhase4CallbackPage,
  markPhase4CallbackShown,
} from '../services/dialogueChoices';
import { recordWhisper } from '../services/whisperGallery';
import {
  getFoxPostTutorialPlayPrompt,
  getDialogueCaughtUpLine,
  getDialogueRevealSkipHint,
  getArrivalResumeFramingLine,
} from '../services/phaseNarrative';
import { recordAnimalVisit, Quest } from '../services/weeklyQuests';
import { hapticLight, hapticSelection } from '../services/haptics';
import {
  loadTendingState,
  selectPhase5Dialogue,
  hasNewPhase5Line,
  setPhase5CaughtUp,
  hashSeed,
} from '../services/tending';
import { buildPhase5Pool, buildPhase5Eligibility } from '../services/dialogue/phase5Pool';
import { getModalInSpring } from '../theme/surfaces';
import { showGameAlert } from '../services/gameAlert';
import { getNextAnimalConversation, completeAnimalConversationLine } from '../services/conversationProgress';
import { adaptAnimalConversationText, hasAnimalConversationArrivalOccurred } from '../services/dialogue/animalConversationText';
import { StorageRecoveryRequiredError } from '../services/persistenceStorage';

/**
 * Maximum characters shown per dialogue page. Lines longer than this are split
 * at sentence boundaries so the speech bubble never grows past a readable size.
 * Pagination is purely presentational: it never touches dialogue indices,
 * session counts, or any persistence.
 *
 * WHY 200 AND NOT 420. At 420 the paginator almost never fired: the corpus
 * averages ~273 characters a line, so 92% of dialogue arrived as ONE page of
 * roughly eight rendered lines in a ~264dp bubble, with a six-second
 * typewriter in front of it. That is a wall of text at conversation cadence,
 * and it is the main reason lines needed re-reading. At 200 a typical line
 * becomes two pages of two or three sentences: one tap, one thought, and a
 * reveal short enough that a reader waits it out instead of skipping it.
 */
export const DIALOGUE_PAGE_CHAR_BUDGET = 200;

/**
 * Per-character dialogue reveal (F25): the visible page materializes one
 * character at a time (typewriter cadence) instead of appearing whole, so the
 * text reads as spoken rather than dumped. Fixed across every animal; only
 * the mouth-flap cadence below varies by species. Instant under reduced
 * motion (the DialogueRevealBody leaf owns the reveal timer).
 */
export const DIALOGUE_REVEAL_CHAR_MS = 22;

/**
 * Bright-days reveal cadence (ftue-6): the 22 ms tick gave a full 200-char
 * page 4.4 s of typewriter, and the phase 0-1 visits are three lines of
 * ~273 chars, so a new player sat through ~20 s of reveal per visit if they
 * never learned the bubble was tappable. 15 ms is the documented 3.0 s page.
 * From Phase 2 on the slowness is the point, so 22 ms stays there.
 */
export const DIALOGUE_REVEAL_CHAR_MS_BRIGHT = 15;

/** Phase-aware per-character reveal cadence: quick through Phase 1, slow after. */
export function getDialogueRevealCharMs(phase: number): number {
  return phase <= 1 ? DIALOGUE_REVEAL_CHAR_MS_BRIGHT : DIALOGUE_REVEAL_CHAR_MS;
}

// ---------------------------------------------------------------------------
// Device-local one-time flags owned by this hook. Guarded lazy requires so the
// pure helpers above stay importable in Node without an AsyncStorage mock.
// ---------------------------------------------------------------------------

/** One-time tap-to-skip hint under the first dialogue reveal (ftue-6). */
export const DIALOGUE_REVEAL_SKIP_HINT_SEEN_KEY = 'wordshift_reveal_skip_hint_seen';
/** Per-resident one-time post-Arrival framing of resumed pre-arrival lines (narrative-2). */
export const ARRIVAL_RESUME_FRAMING_SEEN_KEY = 'wordshift_arrival_resume_framing_seen';

async function readLocalFlag(key: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded lazy require keeps the helpers Node-importable
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeLocalFlag(key: string, value: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded lazy require keeps the helpers Node-importable
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
  } catch {
    // Non-critical: a lost flag repeats a one-line pointer, nothing more.
  }
}

/** Has the one-time reveal skip hint been shown on this device? Broken storage counts as seen. */
export async function hasSeenRevealSkipHint(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded lazy require keeps the helpers Node-importable
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return (await AsyncStorage.getItem(DIALOGUE_REVEAL_SKIP_HINT_SEEN_KEY)) === 'true';
  } catch {
    return true;
  }
}

export function markRevealSkipHintSeen(): Promise<void> {
  return writeLocalFlag(DIALOGUE_REVEAL_SKIP_HINT_SEEN_KEY, 'true');
}

/**
 * Which residents have already had their post-Arrival resume framing. Parsed
 * defensively; a corrupt value simply frames again.
 */
export async function getArrivalResumeFramedAnimals(): Promise<Set<string>> {
  const raw = await readLocalFlag(ARRIVAL_RESUME_FRAMING_SEEN_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function markArrivalResumeFramed(animalId: string): Promise<void> {
  const framed = await getArrivalResumeFramedAnimals();
  framed.add(animalId);
  await writeLocalFlag(ARRIVAL_RESUME_FRAMING_SEEN_KEY, JSON.stringify([...framed]));
}

/**
 * Pure decision (narrative-2): frame this visit's regular line as recollection?
 * Only after the Arrival, only when the resumed line is pre-arrival material
 * (authored phase 0-4, which every regular line is), only once per resident.
 */
export function shouldFrameArrivalResume(params: {
  arrivalOccurred: boolean;
  resumedLinePhase: number | null;
  alreadyFramed: boolean;
  /** The resident has regular lines on the read ledger: a RESUMED conversation, not a first one (a resident recruited after the Arrival has nothing to pick back up). */
  hasPriorConversation: boolean;
}): boolean {
  return params.arrivalOccurred && params.hasPriorConversation && params.resumedLinePhase !== null &&
    params.resumedLinePhase <= 4 && !params.alreadyFramed;
}

/**
 * Per-species mouth-flap cadence (F25): how fast the talk/idle sprite layers
 * alternate while a line is still revealing (the flap stops dead the instant
 * the text finishes landing). Slow, ponderous animals flap slower; quick or
 * anxious ones flap faster. Animals not listed use DEFAULT_FLAP_CADENCE_MS.
 */
const FLAP_CADENCE_MS: Partial<Record<AnimalType, number>> = {
  sloth: 500,
  red_panda: 420,
  kakapo: 380,
  tarsier: 260,
  fennec_fox: 230,
  rabbit: 200,
};
const DEFAULT_FLAP_CADENCE_MS = 300;

interface SentenceUnit {
  /** Sentence text with its terminal punctuation kept attached. */
  text: string;
  /** The whitespace that followed the sentence in the original text. */
  sep: string;
}

/**
 * Split text into sentence units at `. `, `! `, `? ` (runs of terminal
 * punctuation like `...` or `?!` stay with their sentence) and at newlines.
 * Each unit remembers the whitespace that followed it so pages can re-join
 * sentences with their original separators.
 */
function splitIntoSentenceUnits(text: string): SentenceUnit[] {
  const units: SentenceUnit[] = [];
  const pushUnit = (segment: string, sep: string) => {
    if (segment.length > 0) {
      units.push({ text: segment, sep });
    } else if (units.length > 0) {
      // Empty segment (e.g. consecutive newlines): fold the whitespace into
      // the previous unit's separator instead of creating an empty unit.
      units[units.length - 1].sep += sep;
    }
  };
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') {
      // Newlines are boundaries; capture the whole whitespace run as separator.
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      pushUnit(text.slice(start, i), text.slice(i, j));
      start = j;
      i = j;
      continue;
    }
    if (ch === '.' || ch === '!' || ch === '?') {
      // Consume the full punctuation run so `...` / `?!` stay together.
      let j = i + 1;
      while (j < text.length && (text[j] === '.' || text[j] === '!' || text[j] === '?')) j++;
      if (j < text.length && text[j] === ' ') {
        let k = j;
        while (k < text.length && text[k] === ' ') k++;
        pushUnit(text.slice(start, j), text.slice(j, k));
        start = k;
        i = k;
        continue;
      }
      i = j;
      continue;
    }
    i++;
  }
  if (start < text.length) {
    pushUnit(text.slice(start), '');
  }
  return units;
}

/**
 * Hard-split a single sentence that alone exceeds the budget, cutting at the
 * last word boundary under the budget. Only cuts mid-word when a single word
 * exceeds the whole budget (which real dialogue never does).
 */
function hardSplitLongSentence(sentence: string, budget: number): string[] {
  const parts: string[] = [];
  let rest = sentence;
  while (rest.length > budget) {
    let cut = rest.lastIndexOf(' ', budget);
    if (cut <= 0) cut = budget;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^ +/, '');
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

/**
 * Split a dialogue line into display pages no longer than `budget` characters.
 * Splits at sentence boundaries (`. `, `! `, `? `, and newlines), keeping the
 * punctuation with its sentence and packing consecutive sentences greedily so
 * each page is as full as possible without exceeding the budget. Text at or
 * under the budget returns as a single page containing the ORIGINAL string
 * (identity preserved — HomeScreen compares dialogueText against the active
 * choice prompt by equality). Re-joining the pages preserves the original
 * text modulo the whitespace consumed at split points. No page is ever empty
 * and no counters/ellipses are appended (the text stays in-world).
 */
export function splitDialogueIntoPages(
  text: string,
  budget: number = DIALOGUE_PAGE_CHAR_BUDGET
): string[] {
  if (text.length <= budget) return [text];

  const units: SentenceUnit[] = [];
  for (const unit of splitIntoSentenceUnits(text)) {
    if (unit.text.length <= budget) {
      units.push(unit);
    } else {
      const pieces = hardSplitLongSentence(unit.text, budget);
      pieces.forEach((piece, idx) => {
        units.push({ text: piece, sep: idx === pieces.length - 1 ? unit.sep : ' ' });
      });
    }
  }
  if (units.length === 0) return [text];

  const pages: string[] = [];
  let current = '';
  let currentSep = '';
  for (const unit of units) {
    if (current.length === 0) {
      current = unit.text;
    } else if (current.length + currentSep.length + unit.text.length <= budget) {
      current = current + currentSep + unit.text;
    } else {
      pages.push(current);
      current = unit.text;
    }
    currentSep = unit.sep;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [text];
}

/**
 * Resolve which page of a (possibly paginated) dialogue line is visible.
 * `pageSource` is the full text the page cursor was last advanced against;
 * whenever the underlying line changes (new session, pre-page drain, index
 * advance) the source no longer matches and the view self-heals to page 0,
 * so a stale cursor can never show a mid-line page of a fresh line.
 */
export function resolveVisiblePage(
  fullText: string,
  pageSource: string | null,
  pageCursor: number
): { pages: string[]; index: number } {
  const pages = splitDialogueIntoPages(fullText);
  const index = pageSource === fullText ? Math.min(pageCursor, pages.length - 1) : 0;
  return { pages, index };
}

/**
 * Pick the session-end message. Only claim "come back later" when the animal is
 * GENUINELY on cooldown — during the newly-unlocked grace period the cooldown is
 * skipped, so re-tapping immediately shows more dialogue; telling the player to
 * come back later there is just wrong. Caller passes `onCooldown` read AFTER the
 * session has ended (so grace state is settled).
 */
function sessionEndMessage(name: string, onCooldown: boolean): string {
  return onCooldown
    ? `${name} wants to rest now. Come back after solving a few puzzles.`
    : `${name} still has more to say. Tap them again to keep talking.`;
}

interface SessionInfo {
  status: 'available' | 'in_session' | 'cooldown';
  dialoguesRemaining?: number;
  puzzlesRemaining?: number;
}

/**
 * Pure resolver for the "visit next friend" chain. Starting AFTER the current
 * animal in the given display/unlock order and wrapping around the list, it
 * returns the first OTHER unlocked animal for which `hasNewsAvailable` holds
 * (the caller supplies the same availability signal the home badge/tap uses).
 * Never returns the current animal, even if the predicate would accept it;
 * returns null when no other animal qualifies. Order-stable and side-effect
 * free so it can be unit-tested directly.
 */
export function findNextAnimalWithNews<T extends { id: string; isUnlocked: boolean }>(
  animals: T[],
  currentAnimalId: string | null,
  hasNewsAvailable: (animal: T) => boolean
): T | null {
  const count = animals.length;
  if (count === 0) return null;
  const startIndex = currentAnimalId
    ? animals.findIndex(a => a.id === currentAnimalId)
    : -1;
  for (let offset = 1; offset <= count; offset++) {
    const candidate = animals[(startIndex + offset + count) % count];
    if (currentAnimalId !== null && candidate.id === currentAnimalId) continue;
    if (!candidate.isUnlocked) continue;
    if (hasNewsAvailable(candidate)) return candidate;
  }
  return null;
}

interface UseDialogueFlowParams {
  progress: HomeWorldProgress | null;
  setAnimals: React.Dispatch<React.SetStateAction<Animal[]>>;
  onFoxPlayPrompt?: () => void;
  /** Every new resident receives their full introduction through ordinary Talk. */
  onIntroduction?: (animal: Animal) => Promise<void>;
  onConversationProgress?: (ids: Record<string, string[]>, cycleCount: number) => void;
  /**
   * Quests completed by THIS visit (talk-to-animals quests). recordAnimalVisit
   * mutates the quest objects in the module-level cache in place, and the home
   * screen holds those same references, so nothing re-derives on its own: the
   * header quest pill and the journal badge kept showing the pre-completion
   * count until the player opened the quest modal. The host uses this to
   * re-wrap its quest state.
   */
  onQuestsCompleted?: (quests: Quest[]) => void;
}

/**
 * A page shown before the animal's regular dialogue. `commit` is the one-time
 * bookkeeping that must run when the page BECOMES VISIBLE — never when the
 * page list is built.
 *
 * WHY. handleAnimalTap used to consume every one-time source while assembling
 * the list: the coordinated event, the tutorial-seed flag, the guaranteed
 * cross-reference flag, the Phase-4 choice callback. The modal closes on a
 * scrim tap or the Android back button and closeDialogue drops the queue, so a
 * player who dismissed early burned beats nothing had shown them. A
 * coordinated event is the worst case: it is consumed on GLOBAL progress, so
 * one of the eight house-wide crescendos was gone for every animal at once.
 *
 * Commit-on-visible, not commit-on-advance: a page the player saw and then
 * closed on stays committed (at most once), and a page never shown is never
 * burned.
 */
interface PreDialoguePage {
  text: string;
  commit?: () => Promise<void>;
  /** Durable acknowledgement only after all pages of this note are read. */
  onRead?: () => Promise<void>;
}

interface UseDialogueFlowReturn {
  selectedAnimal: Animal | null;
  showDialogue: boolean;
  /** The current page's FULL text (unchanged contract: HomeScreen's choice-
   * prompt equality check and pagination logic key off this exact value). */
  dialogueText: string;
  /** Stable page identity and cadence for the text leaf's private ticker. */
  revealSource: string;
  revealCharMs: number;
  /** True until the text leaf finishes or the player completes the reveal. */
  revealInProgress: boolean;
  /** Jump the current reveal straight to the full text. No-op once complete. */
  completeReveal: () => void;
  /**
   * One-time tap-to-skip pointer (ftue-6): the phase-aware hint string while
   * the FIRST reveal this device has ever shown is still in progress, else
   * null. The host renders it faintly under the bubble; the flag commits when
   * that reveal ends (by tap or by landing), so it is shown exactly once.
   */
  revealSkipHint: string | null;
  sessionInfo: SessionInfo | null;
  cooldownMessage: string | null;
  cooldownOpacity: Animated.Value;
  cooldownSlide: Animated.Value;
  dialogueSlide: Animated.Value;
  isTalking: boolean;
  hasMoreToShow: boolean;
  /** Active dialogue choice for Phase 3 choice points */
  activeChoice: DialogueChoice | null;
  /** The question is showing its available replies. It may be postponed. */
  choiceOpen: boolean;
  /** Only an in-flight durable answer blocks another tap or dismissal. */
  choiceSaving: boolean;
  choiceError: string | null;
  dialogueSaveError: string | null;
  /**
   * The answer the player just gave, echoed above the animal's reply; null
   * again once the reply is left.
   */
  choiceEcho: string | null;
  handleAnimalTap: (animal: Animal) => Promise<void>;
  handleNextDialogue: () => Promise<void>;
  handleCloseDialogue: () => Promise<void>;
  handleDialogueChoice: (choice: PlayerChoice) => Promise<void>;
  /**
   * Resolve the next unlocked animal (after the current one, wrapping) with
   * dialogue genuinely available right now, for the "visit next friend"
   * chain. Fully synchronous; HomeScreen calls it only when the session has
   * reached its end (the button reads "Close").
   */
  getNextAnimalWithNews: (animals: Animal[]) => Animal | null;
  /**
   * Chain to another animal: runs the EXACT Close bookkeeping for the current
   * animal, then opens the next one through the host's normal visit path.
   */
  handleVisitNextAnimal: (next: Animal, openVisit?: (animal: Animal) => Promise<void>) => Promise<void>;
}

/**
 * Custom hook encapsulating dialogue session logic for the home screen.
 * Manages animal dialogue state, cooldown animations, and session flow.
 *
 * Dialogue pages flow naturally as a conversation:
 * 1. Trigger word reaction (if any) — animal reacts to a puzzle word
 * 2. Cross-animal reference (if any) — animal mentions another animal
 * 3. Regular dialogue — the animal's main phase dialogue
 * Each shows as a full page in the dialogue bubble, advanced by tapping "Next".
 *
 * Any line longer than DIALOGUE_PAGE_CHAR_BUDGET is additionally paginated at
 * sentence boundaries; "Next" drains the remaining pages before advancing to
 * the next line. Page advances are purely presentational — they never touch
 * dialogue indices, session counts, or persistence.
 */
export function useDialogueFlow({
  progress,
  setAnimals,
  onFoxPlayPrompt,
  onQuestsCompleted,
  onIntroduction,
  onConversationProgress,
}: UseDialogueFlowParams): UseDialogueFlowReturn {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [talkingFrame, setIsTalking] = useState(false);

  // Only reveal boundaries belong to the flow. Character ticks live in the
  // DialogueRevealBody leaf, keeping the home/world out of the 15–22ms loop.
  const [completedRevealSource, setCompletedRevealSource] = useState<string | null>(null);
  const [dialogueVisit, setDialogueVisit] = useState(0);
  // Skip-hint eligibility (ftue-6): null until the device flag has been read,
  // then true exactly until the first reveal it decorated has ended.
  const [revealSkipHintEligible, setRevealSkipHintEligible] = useState<boolean | null>(null);
  const revealSkipHintShowingRef = useRef(false);

  // Pre-dialogue pages: shown before regular dialogue, one at a time
  // These are trigger reactions, cross-animal refs, coordinated events, etc.
  const [preDialoguePages, setPreDialoguePages] = useState<PreDialoguePage[]>([]);

  // Long-line pagination (purely presentational). `pageCursor` is which page
  // of the current line is visible; `pageSource` records the full text the
  // cursor was advanced against, so resolveVisiblePage self-heals to page 0
  // whenever the underlying line changes. Reset explicitly at every line
  // transition too, so identical consecutive texts can never inherit a cursor.
  const [pageCursor, setPageCursor] = useState(0);
  const [pageSource, setPageSource] = useState<string | null>(null);

  const resetPageQueue = useCallback(() => {
    setPageSource(null);
    setPageCursor(0);
  }, []);
  // Active dialogue choice (Phase 3 choice points)
  const [activeChoice, setActiveChoice] = useState<DialogueChoice | null>(null);
  // The choice page (card turned over to the answers) and the echoed pick.
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [choiceSaving, setChoiceSaving] = useState(false);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [choiceEcho, setChoiceEcho] = useState<string | null>(null);
  // Recorded Phase 3 choices (loaded once; refreshed when a choice is made) —
  // used synchronously by the Phase 5 post-revelation dialogue cycle.
  const [playerChoices, setPlayerChoices] = useState<Record<string, PlayerChoice>>({});
  const [answeredAnimals, setAnsweredAnimals] = useState<string[]>([]);
  const choiceSubmissionRef = useRef(false);
  const choiceSavePendingRef = useRef(false);
  const [conversationReads, setConversationReads] = useState<{
    source: HomeWorldProgress | null;
    ids: Record<string, string[]>;
  } | null>(null);
  const [lineSaving, setLineSaving] = useState(false);
  const [dialogueSaveError, setDialogueSaveError] = useState<string | null>(null);
  const lineRecoveryRequired = useRef(false);
  // A visit is assembled through several storage reads. Closing/unmounting
  // invalidates that work, so an old opener cannot replace a newer visit.
  const visitGenerationRef = useRef(0);
  const openingVisitRef = useRef(false);
  const advancingDialogueRef = useRef(false);
  const visitingNextRef = useRef(false);
  useEffect(() => () => {
    visitGenerationRef.current += 1;
    openingVisitRef.current = false;
  }, []);

  // Tending Shrine (Phase 5 endgame) state, loaded synchronously into the hook so
  // the Phase-5 dialogue selection + honest "new dialogue" badge can read it
  // during render. `tendingLevel` grows the per-animal line pool; `tendingCaughtUp`
  // tracks how many pool lines each animal has genuinely delivered.
  const [tendingLevel, setTendingLevel] = useState(0);
  const [tendingCaughtUp, setTendingCaughtUp] = useState<Record<string, number>>({});

  // Phase-2 exhaustion pool cursors (animalType -> lines delivered). Once an
  // animal's Phase-2 base block is exhausted while the player is still in
  // Phase 2, extra lines are served in order (then cycling) instead of
  // re-reading the last base line verbatim. The stored dialogue index stays
  // pinned at the base-block end so saved progress is never inflated.
  const [phase2Cursors, setPhase2Cursors] = useState<Record<string, number>>({});

  const refreshTendingState = useCallback(async () => {
    try {
      const state = await loadTendingState();
      setTendingLevel(state.level);
      setTendingCaughtUp({ ...state.caughtUp });
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadChoiceState(), loadTendingState(), getPhase2PoolCursors()])
      .then(([choices, tending, cursors]) => {
        if (cancelled) return;
        setPlayerChoices(choices.choices ?? {});
        setAnsweredAnimals(choices.offeredBy ?? Object.keys(choices.choices ?? {}));
        setTendingLevel(tending.level);
        setTendingCaughtUp({ ...tending.caughtUp });
        setPhase2Cursors(cursors);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build an animal's current Phase-5 line pool from loaded hook state.
  const getPhase5Pool = useCallback((animalType: AnimalType): string[] =>
    buildPhase5Pool(animalType, tendingLevel, playerChoices[animalType] ?? null), [tendingLevel, playerChoices]);

  // Select the Phase-5 line for an animal at a given dialogue index, using the
  // recency-aware selector (new lines in order, then deterministic shuffled
  // re-reads). Returns the pool so callers can reason about its length.
  const selectPhase5 = useCallback((animalType: AnimalType, currentDialogueIndex: number) => {
    const pool = getPhase5Pool(animalType);
    const totalRegular = getTotalDialogueCount(animalType, 4);
    const caughtUp = tendingCaughtUp[animalType] ?? 0;
    const deliveredIndex = Math.max(0, currentDialogueIndex - totalRegular);
    // Post-revelation lines are gated on the unlocked animals like every other
    // pool: the endgame arms on a bare solve floor, so reaching Phase 5 no
    // longer implies a finished house.
    const eligible = buildPhase5Eligibility(animalType, pool, progress?.unlockedAnimals ?? []);
    const result = selectPhase5Dialogue(pool, caughtUp, deliveredIndex, hashSeed(animalType), eligible);
    return { pool, caughtUp, ...result };
  }, [getPhase5Pool, tendingCaughtUp, progress?.unlockedAnimals]);

  // Animal types currently unlocked — lines tagged with `requiresAnimals`
  // are skipped while any of their referenced animals is still locked.
  const getUnlockedTypes = useCallback((): Set<AnimalType> =>
    new Set((progress?.unlockedAnimals ?? []) as AnimalType[]), [progress?.unlockedAnimals]);

  const getRegularConversation = useCallback((animal: Animal) => {
    if (!progress) return null;
    const ids = conversationReads?.source === progress ? conversationReads.ids : progress.conversationReadIds;
    const next = getNextAnimalConversation({ ...progress, conversationReadIds: ids }, animal.type,
      getAnimalPhase(progress.currentPhase, animal.type), getUnlockedTypes());
    // Every read of the next line also tells the session layer how far behind
    // the house this resident is, so catch-up pacing follows the reader.
    updateConversationBacklog(animal.id, next?.dialogue.phase);
    return next;
  }, [progress, conversationReads, getUnlockedTypes]);

  // Keep the session layer's phase mirror current.
  //
  // dialogueSession holds the narrative phase in a module variable that only
  // recordVictory ever wrote, and it defaults to 0 — so a player who opened the
  // app and visited their animals BEFORE solving a puzzle got phase-0 session
  // rules for the whole launch: 3 lines per session instead of 6 at the reveal,
  // and a session left warm at 4 lines was refused outright ("preparing, return
  // after more offerings") because 4 >= getDialoguesPerSession(0). It is
  // mirrored here, where the phase is known, and again at tap time below so no
  // render ordering can leave it stale.
  useEffect(() => {
    if (progress) updateSessionPhase(progress.currentPhase);
  }, [progress?.currentPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * The phase whose MATERIAL the animal is currently reading, derived from its
   * resolved index against the phase-block boundaries, never above its
   * awareness-tier phase.
   *
   * WHY: the lagging tier converges at the reveal (getAnimalPhase maps global
   * 3 -> 2 and global 4 -> 4), so sloth/wombat/rabbit/red_panda/kakapo never
   * resolve to animal-phase 3 in any state. Everything keyed on animalPhase
   * alone — the phase-3 cross-references and trigger-word reactions — was
   * therefore unreachable for five of thirteen animals for the whole dread
   * arc. Reading the index instead gives them phase-3 flavor over their
   * phase-3 lines, and rolls forward on its own when the index crosses into
   * the phase-4 block. It also stops a vanguard animal with unread backlog
   * from answering phase-2 lines with phase-3 flavor.
   *
   * getAnimalPhase itself stays untouched: its `4` for the lagging tier at the
   * reveal is load-bearing (the robes are house-wide, and the Phase-4 blocks
   * were orphaned before it).
   */
  const getFlavorPhase = (
    animal: Animal,
    animalPhase: DialoguePhase,
    unlocked: Set<AnimalType>
  ): DialoguePhase => {
    // After Arrival, ambient reactions describe the current house even while
    // older personal lines continue through their adapted wording.
    if (animalPhase >= 5) return animalPhase;
    const resolved = resolveDialogueIndex(
      animal.type,
      animal.currentDialogueIndex,
      animalPhase,
      unlocked
    );
    let reading = 0;
    for (let p = 4; p >= 1; p--) {
      if (resolved >= getPhaseStartIndex(animal.type, p as DialoguePhase)) {
        reading = p;
        break;
      }
    }
    return Math.min(reading, animalPhase) as DialoguePhase;
  };

  /**
   * Run a page's one-time bookkeeping now that the page is on screen. Clears
   * the commit first, so a page can never be committed twice.
   */
  const commitPage = async (page: PreDialoguePage | undefined): Promise<void> => {
    if (!page || !page.commit) return;
    const commit = page.commit;
    page.commit = undefined;
    try {
      await commit();
    } catch {
      // One-time bookkeeping is non-critical; never break the conversation.
    }
  };

  // Track last-seen sacrifice count per animal to detect new sacrifices
  const lastSeenSacrificeCount = useRef<Record<string, number>>({});

  // Animations
  const [dialogueSlide] = useState(() => new Animated.Value(0));
  const [cooldownOpacity] = useState(() => new Animated.Value(0));
  const [cooldownSlide] = useState(() => new Animated.Value(20));

  // Session state changes in the open, advance and close handlers.


  // Timer for dismissing cooldown message with animation
  useEffect(() => {
    if (cooldownMessage) {
      const reducedMotion = getSettingsSync().reducedMotion;

      if (reducedMotion) {
        cooldownOpacity.setValue(1);
        cooldownSlide.setValue(0);

        const timeout = setTimeout(() => {
          cooldownOpacity.setValue(0);
          cooldownSlide.setValue(20);
          setCooldownMessage(null);
        }, 2500);
        return () => clearTimeout(timeout);
      }

      // Animate in
      cooldownOpacity.setValue(0);
      cooldownSlide.setValue(20);
      Animated.parallel([
        Animated.timing(cooldownOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(cooldownSlide, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate out after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(cooldownOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(cooldownSlide, {
            toValue: 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCooldownMessage(null);
        });
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [cooldownMessage, cooldownOpacity, cooldownSlide]);

  // Talking animation (F25): isTalking now flaps only while the current
  // line's per-character reveal is still in progress, at a per-species
  // cadence, and settles the instant the text finishes landing (see the
  // reveal + flap effects declared below getDialogueText, which they depend
  // on for the visible text length).

  // Get the current dialogue line's FULL text — pre-dialogue pages first, then
  // regular dialogue. This is the single source of the visible line; the
  // paginated view (getDialogueText) and the whisper-gallery recording both
  // derive from it.
  const getFullDialogueText = useCallback((): string => {
    // If there are pre-dialogue pages remaining, show the first one
    if (preDialoguePages.length > 0) {
      return preDialoguePages[0].text;
    }
    // Otherwise show regular dialogue
    if (!selectedAnimal || !progress) return '';
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);

    const regular = getRegularConversation(selectedAnimal);
    if (regular) {
      return adaptAnimalConversationText({
        animalType: selectedAnimal.type,
        id: regular.dialogue.id,
        text: regular.dialogue.text,
        authoredPhase: regular.dialogue.phase,
        worldPhase: progress.currentPhase,
        arrivalOccurred: hasAnimalConversationArrivalOccurred(progress),
      });
    }
    // Repeating pools follow the complete eligible personal conversation.
    // Arrival unlocks its pool without deleting any earlier unread passage.
    if (animalPhase === 5) return selectPhase5(selectedAnimal.type, selectedAnimal.currentDialogueIndex).text;
    if (animalPhase === 2) {
      const line = getPhase2PoolLine(selectedAnimal.type, phase2Cursors[selectedAnimal.type] ?? 0);
      if (line) return line;
    }
    return getDialogueCaughtUpLine(animalPhase);

  }, [preDialoguePages, selectedAnimal, progress, selectPhase5, getRegularConversation, phase2Cursors]);

  // The VISIBLE dialogue text: the current page of the current line. Lines at
  // or under the budget pass through unchanged (same string identity, so the
  // HomeScreen `dialogueText === activeChoice.prompt` check still holds); a
  // long line shows one readable page at a time, advanced by "Next".
  const visibleDialogueText = useMemo((): string => {
    const fullText = getFullDialogueText();
    // Never paginate an active choice prompt: the choice buttons render only
    // while dialogueText equals the prompt verbatim. (Prompts are short today;
    // this guards a future long one from silently breaking the choice UI.)
    if (activeChoice && fullText === activeChoice.prompt) return fullText;
    const { pages, index } = resolveVisiblePage(fullText, pageSource, pageCursor);
    return pages[index];
  }, [getFullDialogueText, activeChoice, pageSource, pageCursor]);

  // Check if there's more content to show (remaining pages of the current
  // line, pre-dialogue pages, or further regular dialogue)
  const hasMoreToShow = useMemo((): boolean => {
    // Remaining pages of the current line always mean more — the button must
    // read "Next" while the rest of the line waits.
    const fullText = getFullDialogueText();
    if (!(activeChoice && fullText === activeChoice.prompt)) {
      const { pages, index } = resolveVisiblePage(fullText, pageSource, pageCursor);
      if (index < pages.length - 1) return true;
    }
    // If pre-dialogue pages remain, there's always more (regular dialogue follows)
    if (preDialoguePages.length > 0) return true;
    // Otherwise check regular dialogue
    if (!selectedAnimal || !progress) return false;
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);

    // Even the last regular line needs an explicit Next to save it. A
    // backdrop close or interrupted typewriter must never retire that line.
    if (getRegularConversation(selectedAnimal)) return true;
    if (animalPhase === 5) return true;
    return animalPhase === 2 && getPhase2ExtraDialogues(selectedAnimal.type).length > 0;
  }, [getFullDialogueText, activeChoice, pageSource, pageCursor, preDialoguePages,
    selectedAnimal, progress, getRegularConversation]);

  const revealSource = `${dialogueVisit}:${pageCursor}:${visibleDialogueText}`;
  const revealCharMs = getDialogueRevealCharMs(progress?.currentPhase ?? 0);
  const revealInProgress = showDialogue && !getSettingsSync().reducedMotion &&
    visibleDialogueText.length > 0 && completedRevealSource !== revealSource;

  // One-time tap-to-skip hint (ftue-6). Read the device flag once the first
  // dialogue opens; the hint rides the first reveal it finds in progress and
  // commits the flag the moment that reveal ends, however it ended.
  useEffect(() => {
    if (!showDialogue || revealSkipHintEligible !== null) return;
    let current = true;
    hasSeenRevealSkipHint().then(seen => { if (current) setRevealSkipHintEligible(!seen); });
    return () => { current = false; };
  }, [showDialogue, revealSkipHintEligible]);
  const revealSkipHint =
    revealInProgress && revealSkipHintEligible === true
      ? getDialogueRevealSkipHint(progress?.currentPhase ?? 0)
      : null;
  useEffect(() => {
    if (revealSkipHintShowingRef.current && !revealInProgress) {
      revealSkipHintShowingRef.current = false;
      setRevealSkipHintEligible(false);
      markRevealSkipHintSeen().catch(() => {});
    } else if (revealSkipHint !== null) {
      revealSkipHintShowingRef.current = true;
    }
  }, [revealInProgress, revealSkipHint]);

  // Mouth-flap effect (F25): the talk/idle sprite layers alternate at a
  // per-species cadence ONLY while a reveal is in progress, and settle to a
  // static closed-mouth pose (isTalking false, no interval) the instant the
  // line finishes landing or the modal closes. Reduced motion never reaches
  // here with revealInProgress true (the reveal predicate completes
  // instantly), so this alone is enough to keep the pose static.
  useEffect(() => {
    if (!revealInProgress) return;
    const cadence = selectedAnimal
      ? FLAP_CADENCE_MS[selectedAnimal.type] ?? DEFAULT_FLAP_CADENCE_MS
      : DEFAULT_FLAP_CADENCE_MS;
    const interval = setInterval(() => {
      setIsTalking(prev => !prev);
    }, cadence);
    return () => clearInterval(interval);
  }, [revealInProgress, selectedAnimal]);

  /** Complete the current reveal instantly (tap-to-complete). A no-op once the
   * line has already fully landed. Never advances the dialogue itself. */
  const completeReveal = useCallback(() => {
    setCompletedRevealSource(revealSource);
  }, [revealSource]);

  // Handle animal tap
  const handleAnimalTap = useCallback(async (animal: Animal) => {
    if (openingVisitRef.current || advancingDialogueRef.current) return;
    openingVisitRef.current = true;
    const generation = ++visitGenerationRef.current;
    const ownsVisit = () => generation === visitGenerationRef.current;
    try {
    if (choiceSavePendingRef.current) return;
    if (onIntroduction && progress && !progress.introsSeen.includes(animal.id)) {
      try {
        setCooldownMessage(null);
        await onIntroduction(animal);
      } catch {
        if (ownsVisit()) setCooldownMessage("Couldn't open this conversation. Tap your friend to try again.");
      }
      return;
    }
    // Pick up any Tending done since the hook mounted (e.g. the player just
    // deepened the pattern in the pit) so Phase-5 selection/badge are current.
    await refreshTendingState();
    if (!ownsVisit()) return;
    // Availability and the session cap are phase-aware; make sure the session
    // layer is reading THIS phase and not its module default (see the mirror
    // effect above) before either is consulted.
    if (progress) updateSessionPhase(progress.currentPhase);
    // Resolving the next line reports this resident's reading position, which
    // sets catch-up pacing before the session budget and rest are consulted.
    getRegularConversation(animal);
    const availability = await checkDialogueAvailability(animal.id, 0);
    if (!ownsVisit()) return;

    if (!availability.available) {
      // Phase-aware cooldown messages
      const phase = progress?.currentPhase ?? 0;
      const cooldownMessages = phase >= 3
        ? [
            `${animal.name} is preparing. Return after more offerings.`,
            `The ritual requires patience. ${animal.name} will speak again soon.`,
          ]
        : phase >= 2
          ? [
              `${animal.name} is lost in thought. Come back after solving some puzzles.`,
            ]
          : [
              `${animal.name} needs some quiet time. Play more puzzles and come back!`,
            ];
      setCooldownMessage(cooldownMessages[Math.floor(Math.random() * cooldownMessages.length)]);
      return;
    }

    hapticSelection();

    if (progress) {
      // A talk-to-animals quest completed by this visit has to reach the host:
      // recordAnimalVisit mutates the cached quest objects in place, so no
      // state derived from them ever re-runs on its own. Optional-chained on
      // purpose — the resolved value is undefined under the hook test mocks,
      // and an unguarded read would throw into the .catch and go silent.
      recordAnimalVisit(animal.id, progress.currentPhase, progress.currentStreak)
        .then(completed => {
          if (completed?.length) onQuestsCompleted?.(completed);
        })
        .catch(() => {});

      // Resolving an eligible line is presentation only. Locked-resident
      // lines stay unread and return naturally once that resident arrives.
      const regular = getRegularConversation(animal);
      const cap = getTotalDialogueCount(animal.type, Math.min(getAnimalPhase(progress.currentPhase, animal.type), 4) as DialoguePhase);
      const index = regular?.index ?? (progress.currentPhase === 5 ? Math.max(cap, animal.currentDialogueIndex) : cap);
      animal = { ...animal, currentDialogueIndex: index };
    }

    // Build pre-dialogue pages: these show as sequential conversation pages
    // before the regular dialogue, creating natural conversational flow.
    // Phase 5 permits live variant and fulfilled-offering pages before its
    // post-revelation/Tending pool. Approach testimony and reveal callbacks
    // retire at arrival; the archive preserves their earlier versions.
    const pages: PreDialoguePage[] = [];
    let pendingVisitChoice: DialogueChoice | null = null;

    const animalPhase = progress ? getAnimalPhase(progress.currentPhase, animal.type) : 0;
    // Which era's lines this animal is actually on (see getFlavorPhase): the
    // pools that dress a line must match the line, not the sky.
    const flavorPhase = progress
      ? getFlavorPhase(animal, animalPhase as DialoguePhase, getUnlockedTypes())
      : 0;

    // A due relationship choice leads the visit, ahead of optional atmosphere.
    // A relationship choice follows the reader into the reveal once their
    // personal conversation reaches it, including residents invited later.
    // Never offer it after arrival or recall a branch the player did not choose.
    if (animalPhase === 3 || animalPhase === 4) {
      try {
        const choice = await getChoiceForAnimal(
          animal.type,
          animalPhase,
          animal.currentDialogueIndex
        );
        if (!ownsVisit()) return;
        if (choice) {
          // Show the choice prompt as a pre-dialogue page
          pages.push({ text: choice.prompt });
          pendingVisitChoice = choice;
        }
      } catch {
        // Choice points are non-critical
      }
    }


    // 1. Tutorial callback for Fox at exact global/effective Phase 4. Requiring
    // both excludes vanguard Phase 4 at global Phase 3 and every Phase 5 visit.
    if (
      animal.type === 'fox' &&
      progress?.currentPhase === 4 &&
      animalPhase === 4
    ) {
      try {
        const seedsPlanted = await wereTutorialSeedsPlanted();
        if (!ownsVisit()) return;
        if (!seedsPlanted) {
          const callbackLine = TUTORIAL_CALLBACK_DIALOGUES[Math.floor(Math.random() * TUTORIAL_CALLBACK_DIALOGUES.length)];
          pages.push({ text: callbackLine, commit: () => markTutorialSeedsPlanted() });
        }
      } catch {
        // Tutorial callback is non-critical
      }
    }

    // A mode note stays queued until the reader advances past its final page.
    // Peeking must not consume it: the asynchronous visit can be interrupted
    // before its dialogue is visible, or closed during the typewriter reveal.
    if (progress && pages.length === 0) {
      try {
        const pendingVariant = (await getPendingVariantTutorials())[0];
        if (!ownsVisit()) return;
        if (pendingVariant) {
          const variantLine = getVariantTutorialDialogue(
            animal.type,
            pendingVariant,
            progress.currentPhase
          );
          if (variantLine) {
            pages.push({
              text: variantLine,
              onRead: () => acknowledgeVariantTutorial(pendingVariant),
            });
          }
        }
      } catch {
        // Leave the durable note queued for the next visit.
      }
    }

    // 3. Coordinated event — milestone events take priority over trigger words
    let hasCoordinatedEvent = false;
    if (progress && progress.currentPhase < 5 && progress.puzzlesSolved > 0) {
      try {
        const consumed = progress.consumedCoordinatedEvents || [];
        // Key events on the same weighted scale phase transitions use, so an
        // accelerated player (phaseProgress outpacing raw puzzlesSolved)
        // reaches the pre-finale crescendo events before the finale fires.
        const coordEvent = getCoordinatedEventLine(
          animal.type,
          progress.phaseProgress ?? progress.puzzlesSolved,
          progress.currentPhase,
          consumed,
          progress.unlockedAnimals ?? []
        );
        if (coordEvent) {
          // Commit this witness only when its page is shown. Another animal
          // can then corroborate the event; an interrupted queue spends none.
          const deliveryKey = coordEvent.deliveryKey;
          pages.push({
            text: coordEvent.text,
            commit: () => recordConsumedCoordinatedEvent(deliveryKey),
          });
          hasCoordinatedEvent = true;
        }
      } catch {
        // Coordinated events are non-critical
      }
    }

    // 4. Trigger word reaction — use the actual per-animal reactions.
    // consumeTriggerWords empties a queue as it reads, so it cannot be deferred
    // to a commit; instead it may only ever run when this page would be page 0,
    // which is guaranteed visible the moment the modal opens.
    if (!hasCoordinatedEvent && pages.length === 0) {
      try {
        const consumed = await consumeTriggerWords(animal.type);
        if (!ownsVisit()) return;
        if (consumed.length > 0) {
          const word = consumed[0];
          if (flavorPhase >= 1) {
            // Use the per-animal, per-phase, per-word reaction text
            const reaction = getTriggerWordReaction(animal.type, word, flavorPhase);
            if (reaction) {
              pages.push({ text: reaction });
            }
          }
        }
      } catch {
        // Trigger word consumption is non-critical
      }
    }

    // 4b. Offering request (Phase 2+) — the animal asks once for a themed word,
    // and reacts by name when the ledger has since delivered one.
    // Same rule as the trigger queue: takeOfferingDialogue writes
    // requested/acknowledged as it reads and has no peek half, so it only runs
    // when its page would be page 0 (guaranteed visible on open). A visit
    // already carrying a page simply does not consult it, and the reaction
    // lands whole on the next quiet visit rather than being consumed behind a
    // page the player may close on.
    if (!hasCoordinatedEvent && pages.length === 0 && progress) {
      try {
        // Always allow a fulfillment reaction; only allow a fresh request line
        // (which the service consumes on read) when the visit is otherwise quiet.
        const offering = await takeOfferingDialogue(
          animal.type,
          progress.currentPhase as DialoguePhase,
          pages.length === 0
        );
        if (!ownsVisit()) return;
        if (offering) {
          pages.push({ text: offering.line });
        }
      } catch {
        // Offering-request dialogue is non-critical
      }
    }

    // 5. Sacrifice reaction — animals notice when the player offers amber (Phase 4+)
    if (!hasCoordinatedEvent && pages.length === 0 && progress && progress.currentPhase >= 4) {
      try {
        const currentCount = await getSacrificeCount();
        if (!ownsVisit()) return;
        if (lastSeenSacrificeCount.current[animal.type] === undefined) {
          // First access for this animal since mount — establish baseline without triggering.
          // This prevents stale reactions from old sacrifices after app restart.
          lastSeenSacrificeCount.current[animal.type] = currentCount;
        } else if (currentCount > lastSeenSacrificeCount.current[animal.type]) {
          const reaction = getSacrificeReaction(animal.type, currentCount, progress.currentPhase);
          if (reaction) {
            pages.push({ text: reaction });
          }
          lastSeenSacrificeCount.current[animal.type] = currentCount;
        }
      } catch {
        // Sacrifice reaction is non-critical
      }
    }

    // 6. Word count threshold dialogue — low priority
    if (!hasCoordinatedEvent && pages.length === 0 && progress && progress.totalWordsFormed) {
      const approxPrevious = Math.max(0, (progress.totalWordsFormed || 0) - 5);
      const thresholdLine = getWordThresholdDialogue(
        animal.type,
        progress.totalWordsFormed,
        approxPrevious,
        progress.currentPhase
      );
      if (thresholdLine) {
        pages.push({ text: thresholdLine });
      }
    }

    // 6b. Bright-days narrative seed — innocent lines with dark double meanings
    // that Phase 4 recontextualizes. Deterministic: seed 0 becomes due on the
    // animal's 2nd dialogue session, seed 1 on its 5th; each delivers once.
    // A seed belongs beside the bright chapters, so it plants while either the
    // house (phase <= 1) or this resident's own conversation (next line still
    // in phase 0-1 material) is in the bright days. The second half lets a
    // late recruit, met at Phase 3 but reading from their first line, plant
    // seeds on their own 2nd and 5th visits so the reveal callbacks pay off
    // something the player actually heard.
    const readingBrightChapters = progress
      ? (getRegularConversation(animal)?.dialogue.phase ?? 5) <= 1
      : false;
    if (progress && (progress.currentPhase <= 1 || readingBrightChapters)) {
      try {
        const sessionNumber = (getSession(animal.id)?.sessionsCompleted ?? 0) + 1;
        const seed = await peekNarrativeSeedPage(animal.type, sessionNumber);
        if (!ownsVisit()) return;
        if (seed) {
          pages.push(seed);
        }
      } catch {
        // Narrative seeds are non-critical
      }
    }

    // 7. Cross-animal reference — frequency scales with phase
    if (progress && progress.unlockedAnimals) {
      const isVanguard = ANIMAL_AWARENESS_TIERS[animal.type] === 'vanguard';
      let forceRef = false;

      if (isVanguard && progress.currentPhase >= 1) {
        try {
          forceRef = !(await hasSeenGuaranteedCrossRef(progress.currentPhase));
        if (!ownsVisit()) return;
        } catch {
          // Non-critical
        }
      }

      const crossRefChance = flavorPhase <= 1 ? 0.20
        : flavorPhase === 2 ? 0.25
        : flavorPhase === 3 ? 0.45
        : 0.60;

      if (forceRef || Math.random() < crossRefChance) {
        const ref = getCrossAnimalReference(animal.type, flavorPhase, progress.unlockedAnimals);
        if (ref) {
          // The guaranteed-per-phase flag is spent on the page, not on the
          // attempt: it used to be marked before the lookup, so a phase whose
          // pool resolved to null (every candidate mentioning a locked animal)
          // burned the vanguard's one guaranteed reference showing nothing.
          const refPhase = progress.currentPhase;
          pages.push({
            text: ref,
            commit: forceRef ? () => markGuaranteedCrossRefSeen(refPhase) : undefined,
          });
        }
      }
    }

    // 8a. Phase 4 only: one-time callback recontextualizing the player's
    // Phase 3 choice now that the cult is revealed.
    if (animalPhase === 4) {
      try {
        const choiceCallback = await getPhase4CallbackPage(animal.type);
        if (!ownsVisit()) return;
        if (choiceCallback) {
          const type = animal.type;
          pages.push({
            text: choiceCallback,
            commit: () => markPhase4CallbackShown(type),
          });
        }
      } catch {
        // Choice callbacks are non-critical
      }
    }

    // 8b. Phase 4 only: one-time callbacks recontextualizing the Phase 0 seed
    // lines (one per visit, each shown once). Widened gate: an animal that
    // reaches Phase 4 with NO seeds heard (planting stops once both the house
    // and its reading are past the bright days) still gets its callbacks,
    // which are self-contained. While the resident
    // is still reading their own bright chapters the payoff waits, so a late
    // recruit plants a seed (6b) before its callback recontextualizes it.
    if (animalPhase === 4 && !readingBrightChapters) {
      try {
        const seedCallback = await peekNarrativeCallbackPage(animal.type, {
          allowUnheardSeeds: true,
        });
        if (!ownsVisit()) return;
        if (seedCallback) {
          pages.push(seedCallback);
        }
      } catch {
        // Seed callbacks are non-critical
      }
    }


    // Post-Arrival resume framing (narrative-2): the first time a resident
    // picks their pre-arrival conversation back up after the Arrival, one
    // lead-in page frames the older material as recollection. Presentation
    // only: a pre-dialogue page, no receipt, no read-ID change; its commit
    // marks the per-resident device flag when the page is actually shown.
    if (progress && hasAnimalConversationArrivalOccurred(progress)) {
      try {
        const resumed = getRegularConversation(animal);
        const framed = await getArrivalResumeFramedAnimals();
        if (!ownsVisit()) return;
        if (shouldFrameArrivalResume({
          arrivalOccurred: true,
          resumedLinePhase: resumed ? resumed.dialogue.phase : null,
          alreadyFramed: framed.has(animal.id),
          hasPriorConversation: (progress.conversationReadIds?.[animal.id]?.length ?? 0) > 0,
        })) {
          const framedId = animal.id;
          pages.push({
            text: getArrivalResumeFramingLine(animal.name),
            commit: () => markArrivalResumeFramed(framedId),
          });
        }
      } catch {
        // Framing is decoration; never block the visit on it.
      }
    }

    if (!ownsVisit()) return;
    setSelectedAnimal(animal);
    setDialogueVisit(visit => visit + 1);
    setIsTalking(false);
    setShowDialogue(true);
    // Publish the completed visit together, never an old regular line while
    // this visit's introduction is still being assembled.
    resetPageQueue();
    setChoiceSaving(false);
    setChoiceError(null);
    setDialogueSaveError(null);
    lineRecoveryRequired.current = false;
    setChoiceOpen(false);
    setChoiceEcho(null);
    setActiveChoice(pendingVisitChoice);
    choiceSubmissionRef.current = false;
    setPreDialoguePages(pages);
    // The modal opens on page 0, so page 0 is visible from this moment: commit
    // its bookkeeping here, and every later page as it becomes the head (see
    // handleNextDialogue).
    await commitPage(pages[0]);
    if (!ownsVisit()) return;

    const status = getSessionStatus(animal.id, 0);
    setSessionInfo(status);

    // Animate dialogue modal in — the entrance spring ages with the descent
    // like every other surface (bright springy overshoot -> heavy dark settle).
    if (getSettingsSync().reducedMotion) {
      dialogueSlide.setValue(1);
    } else {
      dialogueSlide.setValue(0);
      const entranceSpring = getModalInSpring(progress?.currentPhase ?? 0);
      Animated.spring(dialogueSlide, {
        toValue: 1,
        friction: entranceSpring.friction,
        tension: entranceSpring.tension,
        useNativeDriver: true,
      }).start();
    }
    } finally {
      if (ownsVisit()) openingVisitRef.current = false;
    }
  }, [dialogueSlide, progress, refreshTendingState, resetPageQueue, onQuestsCompleted, onIntroduction, getRegularConversation, getUnlockedTypes]);

  // Recompute hasNewDialogue for a specific animal after session changes
  const recomputeHasNewDialogue = useCallback((animal: Animal): boolean => {
    if (!animal.isUnlocked || !progress) return false;
    if (onIntroduction && !progress.introsSeen.includes(animal.id)) return true;
    // Resolve the next line first: it reports catch-up pacing, which the
    // cooldown check below depends on.
    const regular = getRegularConversation(animal);
    if (isOnCooldown(animal.id)) return false;
    const animalPhase = getAnimalPhase(progress.currentPhase, animal.type);
    const totalDialogues = getTotalDialogueCount(animal.type, Math.min(animalPhase, 4) as DialoguePhase);
    if (regular) return true;
    if (animalPhase === 5) {
      // Once the regular conversation is complete, only new pool lines light the badge.
      const pool = buildPhase5Pool(animal.type, tendingLevel, playerChoices[animal.type] ?? null);
      const caughtUp = tendingCaughtUp[animal.type] ?? 0;
      // Not `caughtUp < pool.length`: that lights for a pool whose only
      // remaining lines name an animal the player has not met, so the badge
      // promised news and the session opened on a re-read.
      return hasNewPhase5Line(
        pool,
        caughtUp,
        buildPhase5Eligibility(animal.type, pool, progress.unlockedAnimals ?? [])
      );
    }
    if (animalPhase === 2) {
      // Base block exhausted — honest badge: lit only while the exhaustion
      // pool still has undelivered (genuinely new) lines.
      return phase2PoolHasNew(animal.type, phase2Cursors[animal.type] ?? 0);
    }
    return hasPendingDialogueChoice(
      animal.type, animalPhase, totalDialogues, answeredAnimals
    );
  }, [progress, tendingLevel, tendingCaughtUp, playerChoices, answeredAnimals, phase2Cursors, getRegularConversation, onIntroduction]);

  // Handle closing dialogue. Manual closes keep the session warm so
  // checking in with an animal never feels punitive.
  const closeDialogue = useCallback(async (startCooldown: boolean) => {
    visitGenerationRef.current += 1;
    openingVisitRef.current = false;
    hapticLight();
    const closingAnimal = selectedAnimal;

    if (closingAnimal && startCooldown) {
      await endSession(closingAnimal.id);
    }
    if (closingAnimal && startCooldown) {
      setAnimals(prev => prev.map(animal => animal.id === closingAnimal.id
        ? { ...animal, hasNewDialogue: recomputeHasNewDialogue(animal) } : animal));
    }
    setShowDialogue(false);
    setSelectedAnimal(null);
    setSessionInfo(null);
    setPreDialoguePages([]);
    setActiveChoice(null);
    setChoiceOpen(false);
    setChoiceEcho(null);
    setChoiceError(null);
    setDialogueSaveError(null);
    // Closing mid-pages behaves exactly like closing mid-line: nothing extra
    // beyond clearing the page queue so it can't leak into the next session.
    resetPageQueue();
  }, [selectedAnimal, recomputeHasNewDialogue, setAnimals, resetPageQueue]);

  // Leaving an unanswered question records no answer. Its existing pending
  // choice badge brings the player back; only an in-flight save must finish.
  const handleCloseDialogue = useCallback(async () => {
    if (choiceSavePendingRef.current || advancingDialogueRef.current || visitingNextRef.current || lineRecoveryRequired.current) return;
    await closeDialogue(false);
  }, [closeDialogue]);

  // Availability signal for the "visit next friend" chain — the SAME news
  // signal the home "!" badge uses (recomputeHasNewDialogue already folds in
  // isOnCooldown), plus the synchronous equivalent of checkDialogueAvailability
  // for the session budget: an in-session animal whose dialogue budget is
  // spent would flip straight to cooldown on tap, so it is not offered.
  const isChainCandidate = useCallback(
    (animal: Animal): boolean => {
      if (!animal.isUnlocked) return false;
      if (onIntroduction && progress && !progress.introsSeen.includes(animal.id)) return true;
      if (!recomputeHasNewDialogue(animal)) return false;
      const status = getSessionStatus(animal.id, 0);
      if (status.status === 'cooldown') return false;
      if (status.status === 'in_session' && (status.dialoguesRemaining ?? 0) <= 0) return false;
      return true;
    },
    [recomputeHasNewDialogue, onIntroduction, progress]
  );

  // Resolve the next unlocked animal with news, wrapping in display/unlock
  // order and always excluding the current animal. Synchronous by design so
  // HomeScreen can call it at the session-end render without any async work.
  const getNextAnimalWithNews = useCallback(
    (animals: Animal[]): Animal | null => {
      if (!selectedAnimal || !showDialogue) return null;
      return findNextAnimalWithNews(animals, selectedAnimal.id, isChainCandidate);
    },
    [selectedAnimal, showDialogue, isChainCandidate]
  );

  // Chain to the next friend: run the exact same close bookkeeping as the
  // Close button (closeDialogue(false), keeping the current line unread and
  // the session warm), then open the next animal through the host's complete
  // gift/introduction/conversation path. The fallback handleAnimalTap
  // re-checks availability itself, so if the animal's state changed between
  // render and tap the standard cooldown message shows — no special casing.
  const handleVisitNextAnimal = useCallback(
    async (next: Animal, openVisit?: (animal: Animal) => Promise<void>) => {
      if (!next || !next.isUnlocked || choiceSavePendingRef.current || advancingDialogueRef.current || visitingNextRef.current || openingVisitRef.current || lineRecoveryRequired.current) return;
      if (selectedAnimal && next.id === selectedAnimal.id) return;
      visitingNextRef.current = true;
      const closing = closeDialogue(false);
      const generation = visitGenerationRef.current;
      try {
        await closing;
        if (generation !== visitGenerationRef.current) return;
        await (openVisit ?? handleAnimalTap)(next);
      } catch {
        setCooldownMessage(`Couldn't open ${next.name}'s conversation. Tap them to try again.`);
      } finally {
        visitingNextRef.current = false;
      }
    },
    [selectedAnimal, closeDialogue, handleAnimalTap]
  );

  // Handle dialogue advance
  const handleNextDialogue = useCallback(async () => {
    if (!selectedAnimal || !progress || choiceSavePendingRef.current || advancingDialogueRef.current || visitingNextRef.current || openingVisitRef.current) return;
    advancingDialogueRef.current = true;
    try {
    hapticSelection();

    // FIRST: drain any remaining pages of the current line (long lines are
    // paginated for the speech bubble). Advancing a page is presentation only:
    // it never records the session dialogue, never advances lastDialogueRead,
    // and never re-fires once-per-line side effects (whisper recording,
    // trigger-word consumption, Phase-5 caught-up advance).
    const currentFullText = getFullDialogueText();
    if (!(activeChoice && currentFullText === activeChoice.prompt)) {
      const { pages, index } = resolveVisiblePage(currentFullText, pageSource, pageCursor);
      if (index < pages.length - 1) {
        setPageSource(currentFullText);
        setPageCursor(index + 1);
        return;
      }
    }

    // The choice prompt reads as an ordinary line with an ordinary Next, and
    // that Next turns the card over to the answers instead of advancing past
    // the prompt: the page stays the head (HomeScreen's caption reads it) and
    // the answers, not this button, are what move the conversation on.
    if (activeChoice && currentFullText === activeChoice.prompt) {
      if (!choiceOpen) setChoiceOpen(true);
      return;
    }

    // If still showing pre-dialogue pages, advance through them
    // Pre-dialogue pages don't count toward session dialogue limits
    if (preDialoguePages.length > 0) {
      const currentPage = preDialoguePages[0];
      if (currentPage.onRead) {
        try {
          await currentPage.onRead();
          currentPage.onRead = undefined;
        } catch {
          showGameAlert("Couldn't save the conversation", 'Your place is kept. Tap Next again to retry.');
          return;
        }
      }
      resetPageQueue();
      // The echoed pick belongs to the reply page only.
      setChoiceEcho(null);
      const nextHead = preDialoguePages[1];
      // A choice reached on the session's last regular line is still answered
      // in this visit. Its reply/convergence finish before the session closes.
      const remaining = getSessionStatus(selectedAnimal.id, 0).dialoguesRemaining;
      if (!nextHead && remaining !== undefined && remaining <= 0) {
        await closeDialogue(true);
        return;
      }
      setPreDialoguePages(preDialoguePages.slice(1));
      // The next page is now the visible one — commit its bookkeeping here
      // (see PreDialoguePage): never at build time, never on advancing PAST it.
      await commitPage(nextHead);
      return;
    }

    // Regular dialogue advance — check if session is still available (after
    // reporting the reader's current position for catch-up pacing).
    getRegularConversation(selectedAnimal);
    const availability = await checkDialogueAvailability(selectedAnimal.id, 0);
    if (!availability.available) {
      const animalId = selectedAnimal.id;
      const animalName = selectedAnimal.name;
      await closeDialogue(true);
      setCooldownMessage(sessionEndMessage(animalName, isOnCooldown(animalId)));
      return;
    }

    // Per-animal phase awareness for dialogue progression
    const animalPhase = getAnimalPhase(progress.currentPhase, selectedAnimal.type);
    const regular = getRegularConversation(selectedAnimal);
    if (regular) {
      const generation = visitGenerationRef.current;
      setLineSaving(true);
      setDialogueSaveError(null);
      try {
        const result = await completeAnimalConversationLine(selectedAnimal.id, regular.dialogue.id, progress.cycleCount ?? 0);
        if (generation !== visitGenerationRef.current) return;
        if (result.completed) await recordDialogue(selectedAnimal.id);
        if (generation !== visitGenerationRef.current) return;
        let pendingChoice: DialogueChoice | null = null;
        if (!activeChoice && (animalPhase === 3 || animalPhase === 4)) {
          try { pendingChoice = await getChoiceForAnimal(selectedAnimal.type, animalPhase, result.nextIndex); } catch {}
        }
        if (generation !== visitGenerationRef.current) return;
        lineRecoveryRequired.current = false;
        onConversationProgress?.(result.conversationReadIds, result.cycleCount);
        setConversationReads({ source: progress, ids: result.conversationReadIds });
        const status = getSessionStatus(selectedAnimal.id, 0);
        setSessionInfo(status);
        const hasNews = !!result.next || !!pendingChoice || (animalPhase === 2
          ? phase2PoolHasNew(selectedAnimal.type, phase2Cursors[selectedAnimal.type] ?? 0)
          : animalPhase === 5 && selectPhase5(selectedAnimal.type, result.nextIndex).isNew);
        const updated = { ...selectedAnimal, currentDialogueIndex: result.nextIndex,
          hasNewDialogue: !isOnCooldown(selectedAnimal.id) && hasNews };
        setAnimals(prev => prev.map(animal => animal.id === updated.id ? updated : animal));
        setSelectedAnimal(updated);
        resetPageQueue();
        if (pendingChoice) {
          setActiveChoice(pendingChoice);
          setChoiceOpen(false);
          setChoiceEcho(null);
          setChoiceError(null);
          choiceSubmissionRef.current = false;
          setPreDialoguePages([{ text: pendingChoice.prompt }]);
        } else if (status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
          await closeDialogue(true);
          const resting = isOnCooldown(updated.id);
          setAnimals(prev => prev.map(animal => animal.id === updated.id
            ? { ...animal, hasNewDialogue: !resting && hasNews } : animal));
          setCooldownMessage(sessionEndMessage(updated.name, resting));
        }
      } catch (error) {
        if (generation === visitGenerationRef.current) {
          if (error instanceof StorageRecoveryRequiredError) lineRecoveryRequired.current = true;
          setDialogueSaveError('Your place could not be saved. Please retry to continue this conversation.');
        }
      } finally {
        setLineSaving(false);
      }
      return;
    }

    const phase2Pool = animalPhase === 2 ? getPhase2ExtraDialogues(selectedAnimal.type) : [];
    const hasMore = animalPhase === 5 || phase2Pool.length > 0;

    if (hasMore) {
      await recordDialogue(selectedAnimal.id);

      // Base conversation lines are NOT recorded to the gallery. They already
      // live, complete and un-evictable, in the journal's earlier conversations
      // (services/storyArchive reads the same corpus), so copying each read
      // line here produced a second, lossier archive of the same text and let
      // the gallery's 500-entry cap evict the runtime lines that exist nowhere
      // else. The gallery keeps only what the journal cannot show.
      //
      // The LATE POOLS are the other half of that same rule, and they are still
      // recorded (as 'passage', below). storyArchive reads phases 0-4 of
      // ALL_DIALOGUES and nothing else, while the Phase-2 exhaustion pool
      // (PHASE2_EXTRA_DIALOGUES), the post-revelation pool and the Tending
      // milestone lines are each served from their own module, so the journal
      // can never show one of them. `fromLatePool` below is set from the very
      // branches that already detect a pool line, so the two cannot disagree.

      // Phase 5: if the line just shown was a genuinely-new pool line (not a
      // shuffled re-read), advance the animal's caught-up pointer and persist it,
      // so the badge stays honest and the next visit delivers the following new line.
      const totalRegular = getTotalDialogueCount(selectedAnimal.type, 4);
      let nextCaughtUp = tendingCaughtUp[selectedAnimal.type] ?? 0;
      if (animalPhase === 5) {
        const sel = selectPhase5(selectedAnimal.type, selectedAnimal.currentDialogueIndex);
        if (sel.isNew) {
          nextCaughtUp = sel.nextCaughtUp;
          const animalType = selectedAnimal.type;
          setTendingCaughtUp(prev => ({ ...prev, [animalType]: nextCaughtUp }));
          setPhase5CaughtUp(animalType, nextCaughtUp).catch(() => {});
        }
      }

      const status = getSessionStatus(selectedAnimal.id, 0);
      setSessionInfo(status);

      const unlocked = getUnlockedTypes();
      const total2 = getTotalDialogueCount(selectedAnimal.type, 2);
      let newIndex: number;
      let nextPhase2Cursor = phase2Cursors[selectedAnimal.type] ?? 0;
      // Was the line the player just finished reading one the journal cannot
      // show? Phase 5 is always a pool line (post-revelation / choice callback
      // / Tending milestone); Phase 2 is one only past the base block.
      let fromLatePool = animalPhase === 5;
      if (animalPhase === 5) {
        // Keep the regular index at/after the pool boundary and advance it only
        // as the deterministic re-read cursor. It never traverses old content.
        newIndex = Math.max(selectedAnimal.currentDialogueIndex, totalRegular) + 1;
      } else {
        const cur = resolveDialogueIndex(
          selectedAnimal.type,
          selectedAnimal.currentDialogueIndex,
          animalPhase,
          unlocked
        );
        if (animalPhase === 2 && phase2Pool.length > 0 && cur >= total2) {
          // A pool line was just shown: pin the stored index at the base-block
          // end (never inflate it — Phase 3 reads it as a phase-start position)
          // and advance the persisted pool cursor instead.
          fromLatePool = true;
          newIndex = total2;
          const animalType = selectedAnimal.type;
          nextPhase2Cursor = await advancePhase2PoolCursor(animalType);
          setPhase2Cursors(prev => ({ ...prev, [animalType]: nextPhase2Cursor }));
        } else {
          newIndex = resolveDialogueIndex(selectedAnimal.type, cur + 1, animalPhase, unlocked);
        }
      }
      await markDialogueRead(selectedAnimal.id, newIndex);
      // Keep the line that no other surface holds. currentFullText is the FULL
      // line (never the last visible page): reaching this branch means the page
      // queue had already drained, so it is the line just finished, taken
      // before the index above moved on.
      if (fromLatePool && currentFullText) {
        recordWhisper({
          animalType: selectedAnimal.type,
          animalName: selectedAnimal.name,
          text: currentFullText,
          phase: animalPhase,
          type: 'passage',
        }).catch(() => {});
      }
      // A new line is about to show — it must open on its first page.
      resetPageQueue();

      // Whether genuinely-new (undelivered) lines remain, INDEPENDENT of cooldown:
      // at Phase 5 (post-revelation) the Tending pool / caught-up pointer; at
      // Phase 2 past the base block the exhaustion-pool cursor; otherwise the
      // normal index-vs-total check.
      let hasUndeliveredLines: boolean;
      if (animalPhase === 5) {
        const pool = getPhase5Pool(selectedAnimal.type);
        hasUndeliveredLines = hasNewPhase5Line(pool, nextCaughtUp, buildPhase5Eligibility(selectedAnimal.type, pool, progress.unlockedAnimals));
      } else if (animalPhase === 2 && phase2Pool.length > 0 && newIndex >= total2) {
        hasUndeliveredLines = phase2PoolHasNew(selectedAnimal.type, nextPhase2Cursor);
      } else {
        const totalDialogues = getTotalDialogueCount(selectedAnimal.type, animalPhase);
        hasUndeliveredLines = newIndex < totalDialogues;
      }
      // The "!" badge is lit only when undelivered lines remain AND the animal is
      // available to talk (not resting on cooldown) — mirrors getAnimalsWithStatus.
      // Crossing the eligibility threshold is enough: do not require the
      // player to close, solve another puzzle, and reopen the animal first.
      let pendingChoice: DialogueChoice | null = null;
      if (!activeChoice && (animalPhase === 3 || animalPhase === 4)) {
        try {
          pendingChoice = await getChoiceForAnimal(selectedAnimal.type, animalPhase, newIndex);
        } catch {}
      }
      if (pendingChoice) {
        setActiveChoice(pendingChoice);
        setChoiceOpen(false);
        setChoiceEcho(null);
        setChoiceSaving(false);
        setChoiceError(null);
        choiceSubmissionRef.current = false;
        setPreDialoguePages([{ text: pendingChoice.prompt }]);
      }
      hasUndeliveredLines = hasUndeliveredLines || Boolean(pendingChoice);
      const hasNewDialogue = !isOnCooldown(selectedAnimal.id) && hasUndeliveredLines;

      setAnimals(prev =>
        prev.map(a =>
          a.id === selectedAnimal.id
            ? { ...a, currentDialogueIndex: newIndex, hasNewDialogue }
            : a
        )
      );
      setSelectedAnimal(prev =>
        prev ? { ...prev, currentDialogueIndex: newIndex } : null
      );

      if (!pendingChoice && status.dialoguesRemaining !== undefined && status.dialoguesRemaining <= 0) {
        const animalId = selectedAnimal.id;
        const animalName = selectedAnimal.name;
        await closeDialogue(true);
        // closeDialogue may have just started this animal's cooldown (e.g. the
        // grace period ending on the 2nd post-unlock session, when the session
        // increment crosses GRACE_PERIOD_SESSIONS). Re-derive the badge with the
        // SETTLED cooldown state — read the same way the message below is — so
        // the "!" badge and the session-end message can never disagree: if the
        // animal is now resting, the badge goes dark until the cooldown clears
        // (getAnimalsWithStatus re-lights it on the next home load).
        const restingNow = isOnCooldown(animalId);
        setAnimals(prev =>
          prev.map(a =>
            a.id === animalId
              ? { ...a, hasNewDialogue: !restingNow && hasUndeliveredLines }
              : a
          )
        );
        setCooldownMessage(sessionEndMessage(animalName, restingNow));
        return;
      }
    } else {
      // One-time post-tutorial Fox nudge before closing the first session.
      // This keeps guidance in-world and directs the player toward more puzzles.
      if (
        selectedAnimal.type === 'fox' &&
        progress.currentPhase <= 1 &&
        progress.puzzlesSolved >= 1 &&
        progress.puzzlesSolved <= 40
      ) {
        const seenNudge = await hasSeenFoxPlayNudge();
        if (!seenNudge) {
          resetPageQueue();
          setPreDialoguePages([{ text: getFoxPostTutorialPlayPrompt(progress.currentPhase) }]);
          await markFoxPlayNudgeSeen();
          onFoxPlayPrompt?.();
          return;
        }
      }
      closeDialogue(true);
    }
    } finally {
      advancingDialogueRef.current = false;
    }
  }, [selectedAnimal, progress, closeDialogue, setAnimals, preDialoguePages, onFoxPlayPrompt, tendingCaughtUp, phase2Cursors, activeChoice, choiceOpen, pageCursor, pageSource, resetPageQueue, getFullDialogueText, getPhase5Pool, getUnlockedTypes, selectPhase5, getRegularConversation, onConversationProgress]);

  // Handle player choosing a dialogue option (Phase 3 choice points)
  const handleDialogueChoice = useCallback(async (choice: PlayerChoice) => {
    if (!selectedAnimal || !activeChoice || choiceSubmissionRef.current) return;
    choiceSubmissionRef.current = true;
    choiceSavePendingRef.current = true;
    setChoiceSaving(true);
    setChoiceError(null);
    hapticSelection();
    try {
      const result = await recordChoice(selectedAnimal.type, choice);
      const accepted = result.choice ?? choice;
      setPlayerChoices(prev => ({ ...prev, [selectedAnimal.type]: accepted }));
      setAnsweredAnimals(prev => prev.includes(selectedAnimal.type) ? prev : [...prev, selectedAnimal.type]);
      // Replace the current pre-dialogue page with the response, then convergence
      resetPageQueue();
      setPreDialoguePages(prev => [{ text: result.response }, { text: result.convergence }, ...prev.slice(1)]);
      // The card turns back: the pick stays on it, dimmed, above the reply.
      setChoiceOpen(false);
      setChoiceEcho(activeChoice.options[accepted]);
      setActiveChoice(null);

      // Record the choice response in the whisper gallery. Kept (as its own
      // 'choice' kind) because it is generated at answer time and appears in
      // no corpus the journal archive can walk.
      recordWhisper({
        animalType: selectedAnimal.type,
        animalName: selectedAnimal.name,
        text: result.response,
        phase: 3,
        type: 'choice',
      }).catch(() => {});
    } catch {
      // Keep the question and both replies intact so retry is explicit.
      setChoiceError("Your response couldn't be saved. Please choose again to retry.");
      choiceSubmissionRef.current = false;
    } finally {
      choiceSavePendingRef.current = false;
      setChoiceSaving(false);
    }
  }, [selectedAnimal, activeChoice, resetPageQueue]);

  return {
    selectedAnimal,
    showDialogue,
    dialogueText: visibleDialogueText,
    revealSource,
    revealCharMs,
    revealInProgress,
    completeReveal,
    revealSkipHint,
    sessionInfo,
    cooldownMessage,
    cooldownOpacity,
    cooldownSlide,
    dialogueSlide,
    isTalking: revealInProgress && talkingFrame,
    hasMoreToShow,
    activeChoice,
    choiceOpen,
    choiceSaving: choiceSaving || lineSaving,
    choiceError,
    choiceEcho,
    dialogueSaveError,
    handleAnimalTap,
    handleNextDialogue,
    handleCloseDialogue,
    handleDialogueChoice,
    getNextAnimalWithNews,
    handleVisitNextAnimal,
  };
}
