import AsyncStorage from './persistenceStorage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { ANIMAL_INFO } from './dialogue/animalDialogueBase';

export type StoryBoundary = 'remember' | 'release';
export type StorySpeaker = AnimalType | 'narrator' | 'player';
export type StorySceneId =
  | 'cup' | 'echo' | 'witness' | 'supper' | 'plan' | 'shelter' | 'plum' | 'plum_recruited' | 'record'
  | 'seeds' | 'promise' | 'returned' | 'council' | 'after' | 'reply' | 'old_mark';

export interface StoryLine { speaker: StorySpeaker; text: string; /** Stable illustration beat; absent on older saved transcripts. */ artId?: string }
export interface StoryOption {
  id: string;
  label: string;
  response: StoryLine[];
}
export interface StoryScene {
  id: StorySceneId;
  title: string;
  lines: StoryLine[];
  options?: StoryOption[];
  memory: string;
}
export interface StoryContext {
  phase: DialoguePhase;
  puzzlesSolved: number;
  cycleCount: number;
  cycleStartPuzzles?: number;
  unlockedAnimals: readonly string[];
  finaleArmed?: boolean;
  finalPuzzleCompleted?: boolean;
  postRevelation?: boolean;
  ritualWord?: string | null;
  houseComplete?: boolean;
}
export interface StoryMemory {
  scene: StoryScene;
  choice?: string;
  completed: boolean;
  page: number;
  /** Costume and setting when this conversation happened, not today's phase. */
  presentationPhase?: DialoguePhase;
  /** Explicitly set aside; retry after a few puzzles without blocking newer conversations. */
  deferredAtPuzzle?: number;
}
export interface StoryCycleArchive {
  cycle: number;
  boundary: StoryBoundary | null;
  memories: Partial<Record<StorySceneId, StoryMemory>>;
}
export interface StoryState {
  version: 1;
  cycle: number;
  memories: Partial<Record<StorySceneId, StoryMemory>>;
  boundary: StoryBoundary | null;
  carriedBoundary: StoryBoundary | null;
  carriedRecord: boolean;
  /** Existing post-arrival saves receive an honest introduction, never a replayed arrival. */
  arrivedBeforeRevision: boolean;
  /** Read-only transcripts from the ten most recent earlier cycles. */
  previousCycles?: StoryCycleArchive[];
  worldInspected?: boolean;
}

export const STORY_STORAGE_KEY = 'wordshift_story_spine';
export const STORY_COPY = {
  journalTitle: 'Things We Kept',
  journalSubtitle: 'Conversations, choices, and the words that changed the house.',
  continue: 'Continue',
  finish: 'Keep this memory',
  later: 'Come back to this',
  resume: 'Continue the conversation',
  close: 'Close',
  back: 'Back',
  memories: 'Our conversations',
  archive: 'Earlier conversations',
  archiveHint: 'Conversations you finished with your friends, kept in their earlier setting. Rereading them does not change your choices.',
  empty: 'There will be things to remember here. For now, come sit by the fire.',
  archivedPages: 'The pages you reached',
  unread: 'A conversation is waiting',
  savedChoice: 'Your answer',
  saving: 'Keeping this moment...',
  saveError: 'That page did not settle. Try again; your answer is still here.',
  retry: 'Try again',
  narrator: 'The house',
  player: 'You',
  finalChoice: 'CLOSED keeps one room of your own. CLOSER keeps a road that leads away. Both are welcomes with a boundary.',
  // archiveChapterTitles (one mood label per stretch of the story) was deleted
  // with the per-stretch chapter rows: a chapter is a speaker now, so the row
  // says who and how much, never what the days felt like.
  archiveLineOne: 'One line kept',
  archiveLineMany: 'lines kept',
  readMemory: 'Read this conversation',
  answerRecorded: 'Answer kept',
  noArchive: 'Their earlier words will be kept here.',
  loading: 'Opening the book...',
  archiveEmpty: 'Finish a conversation with a resident to keep it here.',
  journalLoadError: 'Your saved conversations could not be opened. Please try again.',
  previousCycles: 'Earlier cycles',
  cycleHistoryHint: 'The ten most recent earlier cycles stay here. Their answers cannot be changed.',
  previousPage: 'Previous page',
} as const;

const ORDER: StorySceneId[] = ['cup', 'plum', 'echo', 'witness', 'supper', 'plan', 'shelter', 'record', 'seeds', 'promise', 'returned', 'council', 'after', 'reply'];
const GATES: Record<Exclude<StorySceneId, 'old_mark'>, [number, number]> = {
  cup: [6, 0], echo: [28, 1], witness: [28, 1], supper: [40, 2], plan: [55, 2], shelter: [55, 2],
  plum: [18, 1], plum_recruited: [18, 1], record: [80, 3], seeds: [90, 4], promise: [96, 4],
  returned: [103, 4], council: [115, 4], after: [0, 5], reply: [0, 5],
};
let cache: StoryState | null = null;
let writes: Promise<unknown> = Promise.resolve();
let generation = 0;

export function invalidateStoryCache(): void { cache = null; generation += 1; }

function fresh(context: StoryContext, previous?: StoryState): StoryState {
  const history = [...(previous?.previousCycles ?? [])];
  if (previous && previous.cycle !== context.cycleCount && Object.keys(previous.memories).length) {
    history.push({ cycle: previous.cycle, boundary: previous.boundary, memories: previous.memories });
  }
  return {
    version: 1, cycle: context.cycleCount, memories: {}, boundary: null,
    carriedBoundary: previous?.boundary ?? previous?.carriedBoundary ?? null,
    carriedRecord: previous?.memories.record?.choice === 'keep' || previous?.carriedRecord === true,
    arrivedBeforeRevision: !previous && (context.postRevelation === true || context.phase === 5),
    previousCycles: history.slice(-10),
  };
}

function validState(value: unknown): value is StoryState {
  if (!value || typeof value !== 'object') return false;
  const state = value as StoryState;
  return state.version === 1 && Number.isInteger(state.cycle) && state.cycle >= 0 &&
    !!state.memories && typeof state.memories === 'object' && !Array.isArray(state.memories) &&
    (state.boundary === null || state.boundary === 'remember' || state.boundary === 'release') &&
    (state.carriedBoundary === null || state.carriedBoundary === 'remember' || state.carriedBoundary === 'release') &&
    typeof state.carriedRecord === 'boolean' && typeof state.arrivedBeforeRevision === 'boolean' &&
    Object.entries(state.memories).every(([id, memory]) => {
      if (!memory || ![...ORDER, 'old_mark', 'plum_recruited'].includes(id as StorySceneId)) return false;
      const scene = memory.scene;
      const validLine = (line: StoryLine) => !!line && typeof line.text === 'string' && typeof line.speaker === 'string';
      return !!scene && scene.id === id && typeof scene.title === 'string' && typeof scene.memory === 'string' &&
        Array.isArray(scene.lines) && scene.lines.length > 0 && scene.lines.every(validLine) &&
        (!scene.options || (Array.isArray(scene.options) && scene.options.every(option =>
          !!option && typeof option.id === 'string' && typeof option.label === 'string' &&
          Array.isArray(option.response) && option.response.every(validLine)))) &&
        typeof memory.completed === 'boolean' && Number.isInteger(memory.page) && memory.page >= 0 &&
        (memory.presentationPhase === undefined || [0, 1, 2, 3, 4, 5].includes(memory.presentationPhase)) &&
        (memory.deferredAtPuzzle === undefined || (Number.isInteger(memory.deferredAtPuzzle) && memory.deferredAtPuzzle >= 0)) &&
        (memory.choice === undefined || scene.options?.some(option => option.id === memory.choice) === true) &&
        memory.page < scene.lines.length + (scene.options?.find(option => option.id === memory.choice)?.response.length ?? 0);
    }) && (state.previousCycles === undefined || (Array.isArray(state.previousCycles) && state.previousCycles.length <= 10 &&
      state.previousCycles.every(archive => !!archive && Number.isInteger(archive.cycle) && archive.cycle >= 0 &&
        archive.cycle < state.cycle && validState({ ...state, cycle: archive.cycle, boundary: archive.boundary,
          memories: archive.memories, previousCycles: undefined }))));
}

export async function loadStoryState(context: StoryContext): Promise<StoryState> {
  await writes.catch(() => {});
  if (!cache) {
    const readGeneration = generation;
    const stored = await AsyncStorage.getItem(STORY_STORAGE_KEY);
    if (readGeneration !== generation) return loadStoryState(context);
    let parsed: unknown;
    try { parsed = stored ? JSON.parse(stored) : null; } catch { parsed = null; }
    cache = validState(parsed) ? parsed : fresh(context);
  }
  if (cache.cycle !== context.cycleCount) cache = fresh(context, cache);
  return JSON.parse(JSON.stringify(cache)) as StoryState;
}

async function mutate(context: StoryContext, change: (state: StoryState) => void): Promise<StoryState> {
  const currentGeneration = generation;
  const run = writes.catch(() => {}).then(async () => {
    // Do not call loadStoryState here: it awaits this same write queue.
    let state = cache;
    if (!state) {
      const raw = await AsyncStorage.getItem(STORY_STORAGE_KEY);
      let parsed: unknown;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
      state = validState(parsed) ? parsed : fresh(context);
    }
    if (state.cycle !== context.cycleCount) state = fresh(context, state);
    const next = JSON.parse(JSON.stringify(state)) as StoryState;
    change(next);
    if (generation !== currentGeneration) throw new Error('Story state changed while saving');
    await AsyncStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(next));
    if (generation !== currentGeneration) throw new Error('Story state changed while saving');
    cache = next;
    return JSON.parse(JSON.stringify(next)) as StoryState;
  });
  writes = run;
  return run;
}

export async function clearStoryState(): Promise<void> {
  generation += 1;
  await writes.catch(() => {});
  cache = null;
  await AsyncStorage.removeItem(STORY_STORAGE_KEY);
}

export function storyChoice(state: StoryState, id: StorySceneId): string | undefined {
  return state.memories[id]?.choice;
}

/** Old milestones become an explicitly retrospective account, never a stale live event. */
export function selectStoryScene(context: StoryContext, state: StoryState): StorySceneId | null {
  if (context.finalPuzzleCompleted && !context.postRevelation && context.phase < 5) return null;
  if (context.finaleArmed && context.phase < 5 && !state.memories.council?.completed) return 'council';
  const ongoing = Object.values(state.memories).find(memory => memory && !memory.completed && memory.deferredAtPuzzle === undefined &&
    ((context.phase < 5 && !context.postRevelation) || memory.scene.id === 'after' || memory.scene.id === 'reply'));
  if (ongoing && ((context.phase < 5 && !context.postRevelation) ||
      ongoing.scene.id === 'after' || ongoing.scene.id === 'reply')) {
    return ongoing.scene.id;
  }
  if (context.phase >= 5 || context.postRevelation) {
    const id = !state.memories.after?.completed ? 'after' : !state.memories.reply?.completed ? 'reply' : null;
    return id && storyRetryReady(context, state.memories[id]) ? id : null;
  }
  if (context.cycleCount > 0 && !state.memories.old_mark?.completed &&
      state.memories.old_mark?.deferredAtPuzzle === undefined &&
      context.puzzlesSolved - (context.cycleStartPuzzles ?? 0) >= 3) return 'old_mark';
  // A returning player at the last board gets the complete finding and the
  // terms immediately. Missing optional visits never block the ending.
  if (context.finaleArmed && !state.memories.council?.completed) return 'council';
  const count = context.puzzlesSolved - (context.cycleStartPuzzles ?? 0);
  // An early cup fallback must not consume Axel's personal setup forever.
  // Introduce PLUM after the actual recruitment, while there is time to know him.
  if (count >= 18 && context.phase >= 1 && context.phase <= 3 &&
      context.unlockedAnimals.includes('axolotl') && state.memories.plum?.completed &&
      !state.memories.plum.scene.lines.some(line => line.speaker === 'axolotl') &&
      !state.memories.plum_recruited?.completed && state.memories.plum_recruited?.deferredAtPuzzle === undefined &&
      !state.memories.returned) return 'plum_recruited';
  for (const id of ORDER) {
    const [floor, phase] = GATES[id as keyof typeof GATES];
    if (phase >= 5 || state.memories[id]?.completed || state.memories[id]?.deferredAtPuzzle !== undefined) continue;
    if (count >= floor && context.phase >= phase) return id;
  }
  // A newly due conversation gets its turn before the deferred backlog. Never
  // manufacture completion or an answer for the pages the player set aside.
  return Object.values(state.memories)
    .filter((memory): memory is StoryMemory => !!memory && memory.deferredAtPuzzle !== undefined &&
      canResumeStoryScene(context, state, memory.scene.id) && storyRetryReady(context, memory))
    .sort((a, b) => a.deferredAtPuzzle! - b.deferredAtPuzzle!)[0]?.scene.id ?? null;
}

const STORY_DEFER_PUZZLES = 3;
function storyRetryReady(context: StoryContext, memory?: StoryMemory): boolean {
  return memory?.deferredAtPuzzle === undefined || context.puzzlesSolved - memory.deferredAtPuzzle >= STORY_DEFER_PUZZLES;
}

/** Manual journal visits bypass the retry delay, never the arrival's chronology. */
export function canResumeStoryScene(context: StoryContext, state: StoryState, id: StorySceneId): boolean {
  const memory = state.memories[id];
  if (!memory || memory.completed) return false;
  if (context.finalPuzzleCompleted && !context.postRevelation && context.phase < 5) return false;
  if (context.finaleArmed && context.phase < 5 && !state.memories.council?.completed) return id === 'council';
  if (context.phase >= 5 || context.postRevelation) return id === 'after' || (id === 'reply' && state.memories.after?.completed === true);
  return id !== 'after' && id !== 'reply';
}

export async function deferStoryScene(context: StoryContext, id: StorySceneId): Promise<StoryState> {
  return mutate(context, state => {
    const memory = state.memories[id];
    if (memory && !memory.completed) memory.deferredAtPuzzle = context.puzzlesSolved;
  });
}

export function buildStoryScene(id: StorySceneId, context: StoryContext, state: StoryState): StoryScene {
  const has = (animal: AnimalType) => context.unlockedAnimals.includes(animal);
  const say = (speaker: StorySpeaker, text: string, artId?: string): StoryLine => ({ speaker, text, ...(artId ? { artId } : {}) });
  const narrator = (text: string, artId?: string) => say('narrator', text, artId);
  const ember = (text: string, artId?: string) => has('fox') ? say('fox', text, artId) : narrator(text, artId);
  const word = context.ritualWord?.toUpperCase().replace(/[^A-Z]/g, '') || "the word you offered";
  const kept = storyChoice(state, 'record') === 'keep';
  const privateSeeds = storyChoice(state, 'seeds') === 'confidence';
  const beside = storyChoice(state, 'promise') === 'beside';
  const cup = storyChoice(state, 'cup');
  const witness = storyChoice(state, 'witness');
  const shelter = storyChoice(state, 'shelter');
  const cupName = cup === 'flower' ? 'your flower cup' : cup === 'chip' ? 'your chipped cup' : 'your cup';
  const drink = cup === 'flower' ? 'cocoa' : 'tea';
  const scene = (title: string, lines: StoryLine[], memory: string, options?: StoryOption[]): StoryScene => ({ id, title, lines, memory, ...(options ? { options } : {}) });
  switch (id) {
    case 'cup': return scene('A place at the table', [
      ember("I've got two cups and one important question. Tea, or the terrible cocoa I keep trying to improve?", 'cup-01'),
      narrator('One cup has a chip in the handle. The other has a crooked flower painted on it.', 'cup-02'),
      ember("That flower was meant to be a fox. You can be kind about it, but please don't lie.", 'cup-03'),
    ], "A cup was kept for you here, before the house asked you for anything.", [
      { id: 'flower', label: 'The flower cup. Cocoa, please.', response: [ember("Brave. I mean about the cocoa. The flower is excellent company.", 'cup-04'), narrator('She moves the chipped cup to her own place.', 'cup-05')] },
      { id: 'chip', label: "The chipped cup. Tea, please.", response: [ember("It suits your hand, doesn't it? I keep forgetting that a thing can be chipped and still be exactly right.", 'cup-06'), narrator("She puts the cocoa away and does not look disappointed.", 'cup-07')] },
    ]);
    case 'echo': return scene('The same word', [
      narrator(`Below the house, ${word} catches against the rim instead of sinking.`, 'echo-01'),
      ...(has('owl') ? [say('owl', "Wait. I wrote that word in my notebook this morning. Before you brought it down here.", 'echo-02'), narrator("He lays the open notebook down beside the rim. The letters match.", 'echo-03')] : [narrator("The same letters are already scratched into the stone beside the rim. The scratches are old.", 'echo-04')]),
      ember("I could call this a coincidence, friend. I'd like that word to be some help. It isn't.", 'echo-05'),
      narrator("The word sinks. Its reflection stays on the surface one moment longer.", 'echo-06'),
    ], `The word ${word} appeared twice, once before you formed it.`);
    case 'witness': return scene('Who gets to know', [
      narrator('You write down what happened at the rim: the same word, already there before you offered it. You put the date beneath it.', 'witness-01'),
      ember("I'd like to fold that page away, friend. I can hear myself reaching for another comforting explanation.", 'witness-02'),
      ember("But you were there too. Shall we tell the household what we saw, or keep the account between us while we look into it?", 'witness-03'),
    ], 'You decided who would hear the first account of the word that appeared twice.', [
      { id: 'share', label: 'Tell the household what we saw.', response: [
        narrator('You bring the account to the shared table. Those who read it add their initials beneath the date.', 'witness-04'),
        ember("I'll tell them what happened. I'll say I don't know why. You can stop me if I start making it sound safer than it is.", 'witness-05'),
      ] },
      { id: 'private', label: 'Keep the account between us for now.', response: [
        narrator('You fold the dated account and keep it with you. Ember leaves the outside blank.', 'witness-06'),
        ember("Between us, then. When you want someone else to read it, you can be the one to open it.", 'witness-07'),
      ] },
    ]);
    case 'supper': return scene('Before it goes cold', [
      ...(cup ? [narrator(`Ember puts ${cupName} down where you sit. ${cup === 'flower' ? "She has been at the cocoa recipe again." : "She remembered you asked for tea."}`, 'supper-01')] : []),
      ...(has('pangolin') ? [say('pangolin', "Supper. Now. The empty place at the table can wait. The rest of us have stomachs.", 'supper-02'), narrator("She puts the covered dish on the floor, out of the way, and serves everyone from the ordinary pot.", 'supper-03')] : [ember("I spent the whole afternoon keeping a place warm for someone who hasn't come. Your drink went cold while I did it. That's ridiculous of me, friend.", 'supper-04'), narrator(`She moves the empty cup aside and fills ${cup ? cupName : 'yours'} with fresh ${cup ? drink : 'tea'}.`, 'supper-05')]),
      ...(has('rabbit') ? [say('rabbit', 'Is it safe?', 'supper-06'), ...(has('pangolin') ? [say('pangolin', "It's soup. I made it myself. Ask me about the house after you've eaten.", 'supper-07')] : [ember("The tea is safe. I can't promise you anything else tonight.", 'supper-08')])] : [narrator("For a while it sounds like an ordinary supper in here, and not like a house holding still to listen.", 'supper-09')]),
      ...(witness === 'share' ? [narrator('The dated account lies between the dishes, its row of initials visible.', 'supper-10'), ember("You asked us to tell everyone. If anyone has seen something else, this is a good place to say it.", 'supper-11')]
        : witness === 'private' ? [narrator('The folded account is still in your pocket. Ember glances toward you, then leaves it for you to bring up.', 'supper-12')] : []),
      narrator("The low hum under the floor slips out of rhythm. Nobody at the table hurries to set it right.", 'supper-13'),
    ], "Someone stopped the preparations for an evening and looked after the people who were already here.");
    case 'plan': return scene('Which way the door faces', [
      ...(has('wombat') ? [say('wombat', "I always read this line on the old plan as a brace. Look which way it points.", 'plan-01'), narrator("Warren turns a drawing of the foundations so the doorway faces you.", 'plan-02')] : [narrator("A loose plan lies under the oldest hearthstone. Its arrows point in toward the house, not away from it.", 'plan-03')]),
      ...(has('tarsier') ? [say('tarsier', "My watch keeps the house in sight all night. Nobody ever told me who I'm watching for.", 'plan-04')] : [ember("All that work to keep something out. Or maybe, friend, that's only what we wanted the drawing to mean.", 'plan-05')]),
      ...(has('owl') ? [say('owl', "I wrote \"defense\" beside this mark in the old book. The book never used that word. I did.", 'plan-06')] : [narrator("Someone has written SAFE in the margin. The handwriting is much newer than the plan.", 'plan-07')]),
      narrator("A line goes through the reassuring word. Nobody writes a new one under it. It is the first answer anyone has crossed out.", 'plan-08'),
    ], "Every mark on the old plan points inward, at the house. We were the ones who called that safe.");
    case 'shelter': return scene('Something we can do', [
      narrator('The arrows on the old plan all point inward. Beside the drawing, you set a lamp and a small latch.', 'shelter-01'),
      has('wombat') ? say('wombat', "I can mark the road beyond the gate. Or fit this latch to a door we already have, and ask everyone to knock. Which should I start with?", 'shelter-02')
        : ember("We could mark the road beyond the gate, friend. Or put this latch on a door we already have, and ask everyone to knock. Which would help you tonight?", 'shelter-03'),
      narrator('Neither a lamp nor a latch can promise to stop what is below the house. They are things the people here can do for one another now.', 'shelter-04'),
    ], 'You chose a practical precaution for the household: an outward path or a door people must knock on.', [
      { id: 'road', label: 'Mark the road out.', response: [
        narrator('You set the lamp by the gate. Together, you place pale stones along the outward path, as far as the trees.', 'shelter-05'),
        has('wombat') ? say('wombat', "I'll keep these markers clear. I can't tell you yet what happens past the trees.", 'shelter-06')
          : ember("I'll keep the lamp filled. I wish that were the same as knowing where the road ends. It's a start.", 'shelter-07'),
      ] },
      { id: 'room', label: 'Put a latch on one room.', response: [
        narrator('The latch is fitted to the inside of an existing door. You hang a small sign on the outside: PLEASE KNOCK.', 'shelter-08'),
        has('wombat') ? say('wombat', "No new room, no clever seal. Just a door that stays shut until you open it. I can ask people to respect that.", 'shelter-09')
          : ember("I can promise to knock, friend. Whatever the house does, I can wait until you ask me in.", 'shelter-10'),
      ] },
    ]);
    case 'plum_recruited':
    case 'plum': return scene(has('axolotl') ? 'A little worried face' : "What the warmth keeps", has('axolotl') ? [
      say('axolotl', "This is PLUM! He's on his first lap of the tank, worried face and all. He usually stops swimming when I laugh.", 'plum-01'),
      narrator("Axel blows a crooked bubble. PLUM noses it, then turns back to him.", 'plum-02'),
      say('axolotl', "He's old for a fish. I keep forgetting how quickly somebody else can get old.", 'plum-03'),
      narrator("His small hand follows PLUM along the glass, close but never touching.", 'plum-04'),
    ] : [
      ...(cup ? [narrator(`You hold ${cupName}. The ${drink} is warm against your hands.`, 'plum-05')] : []),
      ember("This cup has a chip in it, friend, from the day I dropped it. I still remember who was sitting with me. It would be a poorer cup without that chip.", 'plum-06'),
      narrator("Below the house, a word comes back up out of the dark exactly as it went down. Its reflection does not waver at all.", 'plum-07'),
      ember("Whatever is down there keeps the shape of everything, exactly. I'm starting to wonder whether keeping the shape is enough.", 'plum-08'),
    ], has('axolotl') ? "PLUM stops swimming when Axel laughs. It is a small thing, and it matters." : "Keeping the shape of a thing does not keep everything that happened to it.");
    case 'record': return scene('The corrected page', [
      ...(has('capybara') ? [say('capybara', "I wrote this in the ledger: \"I am afraid.\" Three words, complete and accurate.", 'record-01'), narrator("On his ledger, the ink now reads: EVERYTHING IS WELL.", 'record-02'), say('capybara', 'That\'s tidier. It\'s also not what I wrote.', 'record-03')] : [narrator("On a page beside the hearth, I AM AFRAID changes to EVERYTHING IS WELL. The wet ink shines.", 'record-04'), ember("I watched those letters move with no hand near them. Whatever moved them meant to help, friend. That's what makes this hard.", 'record-05')]),
      ...(witness === 'share' ? [ember("We'll bring this to the shared table, beside the dated account. You asked us to compare what we saw. We need to keep doing that.", 'record-06')]
        : witness === 'private' ? [narrator('You unfold the dated account beside the ledger. For now, you and Ember compare the pages in private.', 'record-07'), ember("Keeping the paper is one thing. Remembering what was on it is another. I'll remember with you.", 'record-08')] : []),
    ], "The house corrected an uncomfortable truth without asking the one who wrote it.", [
      { id: 'keep', label: 'Keep the original words.', response: [has('capybara') ? say('capybara', 'I have ink.', 'record-09') : ember('Then we\'ll need another pen.', 'record-10'), narrator("The original sentence is copied onto a loose page and kept away from the ledger.", 'record-11')] },
      { id: 'correct', label: 'Leave the page as it is. Remember what happened.', response: [has('capybara') ? say('capybara', "I can leave the house's version on the page. I won't put my name to it.", 'record-12') : ember("We can leave the page alone. We don't have to believe what it says.", 'record-13'), narrator("You remember both sentences. The house kept only one.", 'record-14')] },
    ]);
    case 'seeds': return scene('A way out', [
      ...(has('rabbit') ? [say('rabbit', "I packed seeds. I have not decided to leave. I packed them so that leaving stays something I can still choose.", 'seeds-01'), narrator("Thyme sets a small tin down beside the garden gate.", 'seeds-02'), say('rabbit', "Will you keep this between us, or help me tell Ember? I can live with either answer. I cannot live with everyone deciding for me again.", 'seeds-03')] : [ember("I used to tell you that you could always leave. I have never walked that road past the trees myself.", 'seeds-04'), narrator("By the gate, you set a small stone on the path that leads away. A mark you can come back and check.", 'seeds-05')]),
      ...(shelter === 'road' ? [has('rabbit') ? say('rabbit', "I saw the lamp you put here, and the pale stones. Someone had thought about leaving before I packed. That helped.", 'seeds-06')
        : narrator('The lamp you chose is still filled. You clear fallen leaves from the pale stones along the outward path.', 'seeds-07')]
        : shelter === 'room' ? [has('rabbit') ? say('rabbit', "People really wait at that PLEASE KNOCK sign you put up. I want that same say over this tin.", 'seeds-08')
          : ember("I have learned to wait at your PLEASE KNOCK sign. I want the gate to mean something you can decide, too.", 'seeds-09')] : []),
    ], "Leaving must stay a decision, even in a house that loves you.", [
      { id: 'confidence', label: 'Keep this between us.', response: [has('rabbit') ? say('rabbit', "Thank you. A secret is a little room with its own door, and I am the one who opens it.", 'seeds-10') : ember("Then the stone at the gate stays between us. I will not speak for you.", 'seeds-11')] },
      { id: 'share', label: "Ask for help keeping the way out open.", response: [ember("I will help. And I will ask you first before I tell anyone else.", 'seeds-12'), has('rabbit') ? say('rabbit', "Asking first. That would have been a good rule from the very beginning.", 'seeds-13') : narrator("The stone stays on the outward side of the gate, pointing away from the house.", 'seeds-14')] },
    ]);
    case 'promise': return scene('Enough to tell you', [
      ember("I told you I was keeping you safe. That was the promise.", 'promise-01'),
      say('player', 'Did you know what the words were for?', 'promise-02'),
      ember("I knew enough to tell you. And I did not tell you.", 'promise-03'),
      ember("I knew I was inviting something in. I thought a house full of people who loved each other would teach it to be gentle.", 'promise-04'),
      ...(has('sloth') ? [say('sloth', "I wanted it to come. I called my waiting patience. That word made it easier to watch everyone else wait without knowing why.", 'promise-05')] : []),
      ember("The love in this house was real, friend. It does not excuse what I kept from you.", 'promise-06'),
      ...(shelter === 'road' ? [narrator('Through the window, the lamp you chose is lit by the gate.', 'promise-07'), ember("I filled that lamp again. Doing the thing you asked does not make up for the thing I kept from you.", 'promise-08')]
        : shelter === 'room' ? [narrator('The conversation began with a knock. Ember waited until you opened the latched door.', 'promise-09'), ember("You asked us to wait for permission. I should have understood that before we put up the sign.", 'promise-10')] : []),
    ], "Ember admitted what she had hidden. Love did not cancel what she owed.", [
      { id: 'beside', label: 'Stay beside me. Tell me the rest.', response: [ember("I will tell you the rest. And when I do not know something, I will say so.", 'promise-11')] },
      { id: 'apart', label: 'I need some distance from you.', response: [ember("All right. I will keep my distance. Your place in this house does not depend on forgiving me.", 'promise-12'), narrator(`She moves her chair. ${cup ? cupName[0].toUpperCase() + cupName.slice(1) : 'The cup'} stays within your reach.`, 'promise-13')] },
    ]);
    case 'returned': return scene('What came back', has('axolotl') && [state.memories.plum, state.memories.plum_recruited].some(memory => memory?.completed && memory.scene.lines.some(line => line.speaker === 'axolotl')) ? [
      say('axolotl', "PLUM died. I let him drift down to the bottom of the tank. I should have told someone before I did that.", 'returned-01'),
      narrator("Something with PLUM's worried face swims a full circle of the tank. Then it swims the same circle again, exactly.", 'returned-02'),
      say('axolotl', "The same bite out of his fin. The same little face.", 'returned-03'),
      narrator("Axel laughs once. PLUM always stopped for that. This fish keeps swimming.", 'returned-04'),
      say('axolotl', "Let me have tonight. I am not ready to work this out.", 'returned-05'),
      ember("It kept the part of PLUM it could understand, friend. The shape of him. We will have to show it what it left out.", 'returned-06'),
    ] : [
      narrator("The old cup by the hearth is whole again. Even the line where it was mended has disappeared.", 'returned-07'),
      ember("This is the cup I wanted back, friend. And I cannot remember who was sitting with me when I broke it.", 'returned-08'),
      narrator("She turns the cup over in her paws, looking for the chip.", 'returned-09'),
      ember("The shape is perfect. The chip is gone, and so is the memory of breaking it.", 'returned-10'),
    ], "The house can keep the shape of a thing perfectly, and lose the history that made you love it.");
    case 'council': return scene('Terms of a welcome', [
      narrator("The work stops. The last arrangement has not been made yet.", 'council-01'),
      ...(!state.memories.record?.completed ? [narrator("A page that said I AM AFRAID now says EVERYTHING IS WELL. The house calls that kindness: keep the sentence, take away the discomfort.", 'council-02')] : []),
      ember("It learned how to keep us exactly as we are, friend. It never learned where that has to stop.", 'council-03'),
      ...(has('red_panda') ? [say('red_panda', "I moved my cushion out of the middle of the mat. There are other places to sit. I should have moved it sooner.", 'council-04')] : []),
      ...(has('rabbit') ? [say('rabbit', privateSeeds ? "There is one thing I am keeping to myself. I am not going to say what it is. That should be allowed." : "I want a way out. Even on the days when I choose to stay.", privateSeeds ? 'council-05-private' : 'council-05-road')] : [narrator("The path beyond the gate leads away from the house, and back to it.", 'council-06')]),
      ...(has('wombat') ? [say('wombat', "I will hang a door you can open from either side. You try the latch yourself before I call the job finished.", 'council-07')] : []),
      ember("Two words will fit at the end, friend. CLOSED keeps one room it cannot enter. A thought you have in there stays yours, uncorrected.", 'council-08'),
      ember("CLOSER lets it come and live with us, and keeps a road that leads away. Anyone who stays must be able to leave.", 'council-09'),
      ...(witness === 'share' ? [narrator('The dated account is laid on the table again. The people who put their initials on it are asked what they remember.', 'council-10')]
        : witness === 'private' ? [narrator('Your folded account stays with you. What the household has learned since does not give anyone permission to open it.', 'council-11')] : []),
      ...(shelter === 'road' ? [ember("We marked the road because you asked us to. CLOSER can keep that way out open. You may still choose CLOSED, friend; putting out a lamp did not choose your last word.", 'council-12')]
        : shelter === 'room' ? [ember("We fitted the latch because you asked us to. CLOSED can make that room private from the presence too. You may still choose CLOSER; fitting a latch did not choose your last word.", 'council-13')] : []),
      narrator("Both words work. Neither is the greater offering. The last letter you move sets the boundary.", 'council-14'),
      ember(beside ? "I will stand beside you, friend. You asked me to." : "I will stay by the hearth, friend. You can have as much room as you need.", beside ? 'council-15-beside' : 'council-15-apart'),
    ], "A welcome can come with terms: one private room, or a road that lets you leave.");
    case 'after':
      // Readers who heard the complete terms have already seen the boundary
      // hold in the arrival. Let the next conversation be ordinary life; the
      // door/gate can now be tested directly in the world whenever they choose.
      if (state.boundary && state.memories.council?.completed && !state.arrivedBeforeRevision) {
        return scene('An ordinary morning', [
          narrator(state.boundary === 'remember' ? "The private door is still closed. In the kitchen, a pan has started smoking." : "Someone walked out through the gate and came back with mud on their feet. Someone else fetches a cloth.", state.boundary === 'remember' ? 'after-01-private' : 'after-01-road'),
          has('pangolin') ? say('pangolin', "Breakfast. I burned one side and saved the other. You can call it a disaster or a rescue, whichever you prefer.", 'after-02') : ember(`I made ${drink}. There is also toast, if you are willing to scrape it.`, 'after-03'),
          ...(has('wombat') ? [say('wombat', "A hinge is squeaking. Ordinary squeak, nothing stranger. I have the right oil for this one.", 'after-04')] : []),
          ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl')
            ? [say('axolotl', 'I told a funny story about PLUM. Then I felt sad again. Could we have breakfast anyway?', 'after-05')] : []),
          ...getStoryPreparationAftermath(state).map(text => narrator(text, getPreparationArtId(text))),
          narrator(cup ? `${cupName[0].toUpperCase() + cupName.slice(1)} is at the place you left it.` : 'An empty chair waits beside the table.', 'after-06'),
        ], "Breakfast, a squeaking hinge, and room for more than one feeling.");
      }
      return scene('A small test', [
      ...(state.arrivedBeforeRevision ? [narrator("The arrival has already happened. In the quiet after it, someone asks what the house has learned.", 'after-07')] : [narrator("The seam in the sky has closed. The presence stayed. Now comes the ordinary work of living together.", 'after-08')]),
      ...(state.boundary === 'remember' ? [
        narrator("One door stays closed. Behind it, the words I AM AFRAID are exactly as their author left them.", 'after-09'),
        has('capybara') ? say('capybara', kept ? "I filed the original page in that room. Not one letter has been corrected since." : "I wrote those words again, inside that room. This time the ink stayed.", 'after-10') : ember("The warmth stopped at that door. I waited a long time to be certain.", 'after-11'),
      ] : state.boundary === 'release' ? [
        narrator("A small stone still sits at the gate, marking the way out. The path runs past the last tree and does not turn back.", 'after-12'),
        has('rabbit') ? say('rabbit', "I walked out until I could not see the house. Then I came back. Coming back was my own decision.", 'after-13') : ember("I followed the path past the trees. Coming back felt different, knowing I could have kept walking.", 'after-14'),
      ] : [narrator("Someone sets a cup down where the pattern's lines do not run. The house used to put a stray cup back. This one has not moved for a long time.", 'after-15'), ember("One small thing left exactly where we put it. I am watching to see whether it stays there.", 'after-16')]),
      ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl') ? [say('axolotl', "I am still not ready to say what I think about the fish. Thank you for not finishing that thought for me.", 'after-17')] : []),
      ...getStoryPreparationAftermath(state).map(text => narrator(text, getPreparationArtId(text))),
      ember("You do not owe this morning any particular feeling, friend.", 'after-18'),
    ], state.boundary === 'remember' ? "Behind a private door, one thought stays uncorrected." : state.boundary === 'release' ? "The road out works. Coming back is a choice." : "A cup was left out of place on purpose, to see whether the house would put it back.");
    case 'reply': return scene('Your answer', [
      ...(cup ? [narrator(`${cupName[0].toUpperCase() + cupName.slice(1)} waits beside the chair you chose. Nobody has moved it.`, 'reply-01')] : []),
      ember("We have talked a great deal, friend. I would like to listen now.", 'reply-02'),
    ], 'Your answer belongs to you.', [
      { id: 'angry', label: 'I\'m still angry.', response: [ember("Yes. I will not rush you out of that anger. I did not tell you the whole truth when it mattered.", 'reply-03'), narrator("She lets your answer stand. Nothing corrects it.", 'reply-04')] },
      { id: 'hopeful', label: 'I want to see what we can make of this.', response: [ember("So do I. This time I am saying it as a wish, not as a promise I cannot keep.", 'reply-05'), narrator("Chairs are pulled up to the table. Nobody arranges them into a circle.", 'reply-06')] },
      { id: 'uncertain', label: 'I don\'t know yet.', response: [ember("Then that is where we begin. Not knowing is allowed. Nobody gets to finish that sentence for you.", 'reply-07'), narrator("For once the silence is allowed to last. Nobody hurries to fill it.", 'reply-08')] },
      { id: 'quiet', label: 'Sit quietly with me.', response: [narrator("You left a gap between the chairs. She sits on her side of it. Nobody asks you to call this peace.", 'reply-09')] },
    ]);
    case 'old_mark': return scene('Something remained', [
      narrator("The bright mornings are back. One old mark has survived them.", 'old_mark-01'),
      ...(state.carriedBoundary === 'remember' ? [narrator("One door does not quite match the new walls. Behind it, an old sentence still stands, and nothing has corrected it.", 'old_mark-02'), ember("I don't remember writing that, friend. But I know what it took to leave it there and not fix it.", 'old_mark-03')] : state.carriedBoundary === 'release' ? [narrator("A small stone at the garden gate points outward. The path past it runs straight away from the house.", 'old_mark-04'), ember("I meant to turn that stone back toward the house. When I got there, I didn't want to.", 'old_mark-05')] : [narrator("Two chairs sit apart, with room between them for a third that nobody has added. Ember measures the gap with her paw and leaves it alone.", 'old_mark-06')]),
      ...(state.carriedRecord && has('capybara') ? [say('capybara', "This page is old. The correction over it is newer. Then the original was written back in on top, newer still. Someone kept arguing.", 'old_mark-07')] : []),
      ember("We chose something once. It's lasted longer than our memory of choosing it.", 'old_mark-08'),
    ], "A boundary survived into the bright days. The pattern can carry a change.");
  }
}

export async function openStoryScene(context: StoryContext, requestedId?: StorySceneId): Promise<{ memory: StoryMemory; state: StoryState } | null> {
  const state = await loadStoryState(context);
  const id = requestedId === undefined ? selectStoryScene(context, state)
    : canResumeStoryScene(context, state, requestedId) ? requestedId : null;
  if (!id) return null;
  const existing = state.memories[id];
  if (existing && !existing.completed) {
    if (existing.deferredAtPuzzle === undefined) return { memory: existing, state };
    const resumed = await mutate(context, draft => { delete draft.memories[id]?.deferredAtPuzzle; });
    return { memory: resumed.memories[id]!, state: resumed };
  }
  const scene = buildStoryScene(id, context, state);
  const phase = id === 'old_mark' ? 0 : id === 'plum_recruited' ? context.phase : GATES[id][1];
  const stale = phase < context.phase && id !== 'council' && id !== 'after' && id !== 'reply' && id !== 'old_mark';
  if (stale) {
    scene.lines.unshift({ speaker: 'narrator', text: `From an earlier evening in the house, a conversation worth keeping.`, artId: `${id}-recollection` });
  }
  const next = await mutate(context, draft => {
    draft.memories[id] ??= { scene, page: 0, completed: false, presentationPhase: phase as DialoguePhase };
  });
  return { memory: next.memories[id]!, state: next };
}

export function getStoryPages(memory: StoryMemory): StoryLine[] {
  const response = memory.scene.options?.find(option => option.id === memory.choice)?.response ?? [];
  return [...memory.scene.lines, ...response];
}

export async function advanceStoryPage(context: StoryContext, id: StorySceneId): Promise<StoryState> {
  return mutate(context, state => {
    const memory = state.memories[id];
    if (!memory || memory.completed) return;
    const pages = getStoryPages(memory);
    if (memory.page + 1 < pages.length) memory.page += 1;
    else if (!memory.scene.options || memory.choice) memory.completed = true;
  });
}

export async function chooseStoryOption(context: StoryContext, id: StorySceneId, choice: string): Promise<StoryState> {
  return mutate(context, state => {
    const memory = state.memories[id];
    if (!memory || memory.completed || memory.choice || memory.page !== memory.scene.lines.length - 1) return;
    const option = memory.scene.options?.find(candidate => candidate.id === choice);
    if (!option) return;
    memory.choice = choice;
    memory.page = option.response.length ? memory.scene.lines.length : memory.scene.lines.length - 1;
    if (option.response.length === 0) memory.completed = true;
  });
}

/** The committed final word is the decision; an autosave/retry cannot overwrite it. */
export async function recordStoryBoundary(context: StoryContext, finalWord: string): Promise<StoryState> {
  return mutate(context, state => {
    if (!state.boundary) {
      if (finalWord.toUpperCase() === 'CLOSED') state.boundary = 'remember';
      if (finalWord.toUpperCase() === 'CLOSER') state.boundary = 'release';
    }
  });
}

export function getStorySceneOrder(): readonly StorySceneId[] { return ORDER; }

/** Old saves can recover a scene's original costume without changing its transcript. */
export function getStoryPresentationPhase(memory: StoryMemory): DialoguePhase {
  return memory.presentationPhase ?? (memory.scene.id === 'old_mark' ? 0 : GATES[memory.scene.id][1] as DialoguePhase);
}

/** Stable subjects for the optional aftermath paragraphs, shared by both endings. */
function getPreparationArtId(text: string): string {
  if (text.startsWith('At the shared table')) return 'after-witness-share';
  if (text.startsWith('You keep the dated account')) return 'after-witness-private';
  if (text.startsWith('The pale stones')) return 'after-road-release';
  if (text.startsWith('Someone still fills')) return 'after-road-remember';
  if (text.startsWith('The PLEASE KNOCK sign still')) return 'after-room-remember';
  return 'after-room-release';
}

/**
 * Keep the resident in view while the narrator or player takes a turn.
 *
 * Residents the narrator can name, as word-boundary patterns. A narration page
 * carries no speaker, so when one OPENS a scene there is no portrait yet to
 * hold over: the old fallback took "the first animal who speaks anywhere in
 * this scene", which put Panko's face beside the supper scene's opening line,
 * `Ember sets your flower cup at your place.` The line's own text is the only
 * signal that page carries, so it is read before reaching for the scene.
 */
const NAMED_RESIDENTS: readonly (readonly [RegExp, AnimalType])[] =
  (Object.keys(ANIMAL_INFO) as AnimalType[]).map(
    type => [new RegExp(`\\b${ANIMAL_INFO[type].name}\\b`), type] as const,
  );

function residentNamedIn(text: string): AnimalType | null {
  for (const [pattern, type] of NAMED_RESIDENTS) if (pattern.test(text)) return type;
  return null;
}

export function getStoryPortraitSpeaker(memory: StoryMemory, page: number): AnimalType {
  const pages = getStoryPages(memory);
  const isAnimal = (speaker: StorySpeaker): speaker is AnimalType => speaker !== 'narrator' && speaker !== 'player';
  const at = Math.min(page, pages.length - 1);
  // Whoever is already in view STAYS in view while the narrator describes the
  // room -- continuity is the point, so a narrated beat never swaps the face.
  for (let index = at; index >= 0; index -= 1) {
    if (isAnimal(pages[index].speaker)) return pages[index].speaker as AnimalType;
  }
  // Nobody has spoken yet. Show the resident this page is actually about,
  // then whoever speaks first, then Ember (a narrator-only transcript).
  const named = at >= 0 ? residentNamedIn(pages[at].text) : null;
  if (named) return named;
  return pages.find(line => isAnimal(line.speaker))?.speaker as AnimalType ?? 'fox';
}

/** Preparations leave traces, but only the final word grants a boundary. */
function getStoryPreparationAftermath(state: StoryState): string[] {
  if (!state.boundary) return [];
  const lines: string[] = [];
  const witness = storyChoice(state, 'witness');
  const shelter = storyChoice(state, 'shelter');
  if (witness === 'share') {
    lines.push('At the shared table, the dated account has room beneath the initials for anyone to add what they remember. You asked for witnesses; people still come to compare their accounts.');
  } else if (witness === 'private') {
    lines.push('You keep the dated account folded. Ember has not opened it for anyone else. When you want to tell that part of the story, you still get to be the one who tells it.');
  }
  if (shelter === 'road') {
    lines.push(state.boundary === 'release'
      ? 'The pale stones you laid lead to the road your last word kept open. Someone fills the lamp by the gate each evening.'
      : 'Someone still fills the lamp by the gate each evening. The pale stones remain where you laid them, though it was a private room you chose to protect.');
  } else if (shelter === 'room') {
    lines.push(state.boundary === 'remember'
      ? 'The PLEASE KNOCK sign still hangs beside the latch you chose. People wait for an answer, and now the warmth must wait outside that room too.'
      : 'The PLEASE KNOCK sign stays beside the latch you chose. People still wait for an answer. The road, rather than this room, is the boundary that holds against the presence.');
  }
  return lines;
}

export interface StoryWorldKeepsake {
  boundary: StoryBoundary;
  inherited: boolean;
  inspected: boolean;
  title: string;
  invitation: string;
  action: string;
  result: string;
  landingLine: string;
  cupLine: string | null;
  replyLine: string | null;
  residentLine: string;
}
export function getStoryWorldKeepsake(state: StoryState, context: StoryContext): StoryWorldKeepsake | null {
  const currentBoundary = context.phase === 5 || context.postRevelation ? state.boundary : null;
  const boundary = currentBoundary ?? state.carriedBoundary;
  if (!boundary) return null;
  const inherited = !currentBoundary;
  const cup = storyChoice(state, 'cup');
  const record = storyChoice(state, 'record') === 'keep' || (inherited && state.carriedRecord);
  const reply = storyChoice(state, 'reply');
  // Earlier-cycle preparations live in the archive. Do not invent them in a
  // new house, or retrofit choices onto saves that never made them.
  const preparations = inherited ? [] : getStoryPreparationAftermath(state);
  const boundaryResult = boundary === 'remember'
    ? `${record ? 'The original page' : 'The new page'} still reads: I AM AFRAID. You close the door. Not a letter changes.`
    : "For a while you cannot see the house. When you turn back, the road is still there. Coming back was your decision.";
  return {
    boundary, inherited, inspected: state.worldInspected === true,
    title: boundary === 'remember' ? 'The private door' : 'The outward gate',
    invitation: boundary === 'remember'
      ? `${inherited ? "The morning here is new. This door is not. " : ''}A page waits inside. The warmth stops at the frame.`
      : `${inherited ? "The old marker by the gate still points outward. " : ''}The path passes the last tree. The latch opens from both sides.`,
    action: boundary === 'remember' ? 'Read the page' : 'Walk beyond the trees',
    result: [boundaryResult, ...preparations].join('\n\n'),
    landingLine: boundary === 'remember' ? 'One door stays yours. The kettle is on.' : "The gate opens both ways. There is warmth here whenever you come back.",
    residentLine: boundary === 'remember'
      ? (context.unlockedAnimals.includes('wombat') ? "Warren tests the hinge. \"It swings clean. No sticking, no surprises. Good.\"" : "Ember waits outside. \"Take your time. I can warm the kettle again.\"")
      : (context.unlockedAnimals.includes('rabbit') ? "Thyme slips the seed tin into her pocket. \"I still want to see what grows past the trees.\"" : "Ember raises a hand from the doorway. She leaves the gate open behind you."),
    cupLine: cup === 'flower' ? "Your flower cup is beside the hearth. The cocoa keeps getting better."
      : cup === 'chip' ? "Your chipped cup is beside the hearth. Tea, whenever you want it." : null,
    replyLine: reply === 'angry' ? "Ember leaves the other chair at the distance you chose. Nobody has left a note asking you to move it closer."
      : reply === 'uncertain' ? "The space under your answer is still blank. Nobody has filled it in." : null,
  };
}
export async function inspectStoryWorld(context: StoryContext): Promise<StoryState> {
  return mutate(context, state => { if (getStoryWorldKeepsake(state, context)) state.worldInspected = true; });
}

/** Commit inherited boundaries as part of the cycle reset, before cloud sync. */
export async function beginStoryCycle(context: StoryContext): Promise<StoryState> {
  return mutate(context, () => {});
}
