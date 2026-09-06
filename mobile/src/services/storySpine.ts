import AsyncStorage from './persistenceStorage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';

export type StoryBoundary = 'remember' | 'release';
export type StorySpeaker = AnimalType | 'narrator' | 'player';
export type StorySceneId =
  | 'cup' | 'echo' | 'supper' | 'plan' | 'plum' | 'plum_recruited' | 'record'
  | 'seeds' | 'promise' | 'returned' | 'council' | 'after' | 'reply' | 'old_mark';

export interface StoryLine { speaker: StorySpeaker; text: string }
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
  archiveHint: 'Read these in their earlier setting. Visiting the pages does not change your choices.',
  empty: 'There will be things to remember here. For now, come sit by the fire.',
  unread: 'A conversation is waiting',
  savedChoice: 'Your answer',
  saving: 'Keeping this moment...',
  saveError: 'That page did not settle. Try again; your answer is still here.',
  retry: 'Try again',
  narrator: 'The house',
  player: 'You',
  finalChoice: 'CLOSED keeps one room of your own. CLOSER keeps a road that leads away. Both are welcomes with a boundary.',
  archiveChapterTitles: ['By the warm hearth', 'When questions began', 'The changing house', 'While the shadows gathered', 'Before the arrival'],
  readMemory: 'Read this conversation',
  answerRecorded: 'Answer kept',
  noArchive: 'Their earlier words will be kept here.',
  loading: 'Opening the book...',
  archiveEmpty: 'No earlier conversations are ready here yet.',
  previousCycles: 'Earlier cycles',
  cycleHistoryHint: 'The ten most recent earlier cycles stay here. Their answers cannot be changed.',
  previousPage: 'Previous page',
} as const;

const ORDER: StorySceneId[] = ['cup', 'plum', 'echo', 'supper', 'plan', 'record', 'seeds', 'promise', 'returned', 'council', 'after', 'reply'];
const GATES: Record<Exclude<StorySceneId, 'old_mark'>, [number, number]> = {
  cup: [6, 0], echo: [28, 1], supper: [40, 2], plan: [55, 2],
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
  const ongoing = Object.values(state.memories).find(memory => memory && !memory.completed);
  if (ongoing && ((context.phase < 5 && !context.postRevelation) ||
      ongoing.scene.id === 'after' || ongoing.scene.id === 'reply')) {
    return ongoing.scene.id;
  }
  if (context.phase >= 5 || context.postRevelation) {
    return !state.memories.after?.completed ? 'after' : !state.memories.reply?.completed ? 'reply' : null;
  }
  if (context.cycleCount > 0 && !state.memories.old_mark?.completed &&
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
      !state.memories.plum_recruited?.completed && !state.memories.returned) return 'plum_recruited';
  for (const id of ORDER) {
    const [floor, phase] = GATES[id as keyof typeof GATES];
    if (phase >= 5 || state.memories[id]?.completed) continue;
    if (count >= floor && context.phase >= phase) return id;
  }
  return null;
}

export function buildStoryScene(id: StorySceneId, context: StoryContext, state: StoryState): StoryScene {
  const has = (animal: AnimalType) => context.unlockedAnimals.includes(animal);
  const say = (speaker: StorySpeaker, text: string): StoryLine => ({ speaker, text });
  const narrator = (text: string) => say('narrator', text);
  const ember = (text: string) => has('fox') ? say('fox', text) : narrator(text);
  const word = context.ritualWord?.toUpperCase().replace(/[^A-Z]/g, '') || 'the word you left below';
  const kept = storyChoice(state, 'record') === 'keep';
  const privateSeeds = storyChoice(state, 'seeds') === 'confidence';
  const beside = storyChoice(state, 'promise') === 'beside';
  const cup = storyChoice(state, 'cup');
  const cupName = cup === 'flower' ? 'your flower cup' : cup === 'chip' ? 'your chipped cup' : 'your cup';
  const drink = cup === 'flower' ? 'cocoa' : 'tea';
  const scene = (title: string, lines: StoryLine[], memory: string, options?: StoryOption[]): StoryScene => ({ id, title, lines, memory, ...(options ? { options } : {}) });
  switch (id) {
    case 'cup': return scene('A place at the table', [
      ember('I have two cups and one important question. Tea, or the terrible cocoa I keep trying to improve?'),
      narrator('One cup has a chip in the handle. The other has a crooked flower painted on it.'),
      ember('The flower was meant to be a fox. You may be kind about it, but please do not lie.'),
    ], 'A cup was kept for you before the house asked for anything.', [
      { id: 'flower', label: 'The flower cup. Cocoa, please.', response: [ember('Brave. About the cocoa, I mean. The flower is excellent company.'), narrator('She moves the chipped cup to her own place.')] },
      { id: 'chip', label: 'The chipped cup. Tea is good.', response: [ember('It fits your hand, does it? I keep forgetting that a thing can be worn and still be exactly right.'), narrator('She puts the cocoa away without looking disappointed.')] },
    ]);
    case 'echo': return scene('The same word', [
      narrator(`Below the house, ${word} catches against the rim instead of sinking.`),
      ...(has('owl') ? [say('owl', 'Wait. I wrote that word this morning. Before you brought it.'), narrator('He lays the open notebook beside the rim. The letters match.')] : [narrator('Beside the rim, the same letters are already scratched into the stone. The scratches are old.')]),
      ember('I could call it a coincidence. I would like that to be a useful thing to call it.'),
      narrator('The word sinks. Its reflection stays for one more breath.'),
    ], `The word ${word} appeared twice, once before you formed it.`);
    case 'supper': return scene('Before it goes cold', [
      ...(cup ? [narrator(`Ember sets ${cupName} at your place. ${cup === 'flower' ? 'She has been adjusting the cocoa recipe.' : 'She remembers you asked for tea.'}`)] : []),
      ...(has('pangolin') ? [say('pangolin', 'Supper. Now. The empty place can wait; the rest of us have stomachs.'), narrator('She puts a covered dish on the floor and serves from the ordinary pot.')] : [ember('I have spent the afternoon keeping a place warm for someone who is not here. Your drink has gone cold. That is ridiculous of me.'), narrator(`The empty cup is moved aside. Fresh ${cup ? drink : 'tea'} goes in ${cup ? cupName : 'yours'}.`)]),
      ...(has('rabbit') ? [say('rabbit', 'Is it safe?'), ...(has('pangolin') ? [say('pangolin', 'It is soup. I made it. Ask me about the house after you have eaten.')] : [ember('The tea is. I cannot answer for everything else.')])] : [narrator('For a while the room sounds like a meal, rather than a room listening for something.')]),
      narrator('Under the table, the low hum loses its rhythm. Nobody rushes to put it right.'),
    ], 'Someone interrupted the preparations to care for the people already here.');
    case 'plan': return scene('Which way the door faces', [
      ...(has('wombat') ? [say('wombat', 'I thought this line was a brace. Look where it points.'), narrator('Warren turns a drawing of the foundations so the doorway faces you.')] : [narrator('A loose plan lies beneath the oldest hearthstone. The arrows point toward the house, not away from it.')]),
      ...(has('tarsier') ? [say('tarsier', 'My watch keeps the house in sight. I have never been told whose sight.')] : [ember('All that work to keep something out. Unless that was only what we wanted the drawing to mean.')]),
      ...(has('owl') ? [say('owl', 'I wrote "defense" beside this mark. The text never supplied that word. I did.')] : [narrator('Someone has written SAFE in the margin. It is a much newer hand.')]),
      narrator('For the first time, an explanation is crossed out instead of another question.'),
    ], 'The marks direct attention inward. The comforting interpretation was ours.');
    case 'plum_recruited':
    case 'plum': return scene(has('axolotl') ? 'A little worried face' : 'What the warmth holds', has('axolotl') ? [
      say('axolotl', 'This is PLUM. Round one, worried face. He usually stops when I laugh.'),
      narrator('Axel blows a crooked bubble. The fish noses it, then turns back to him.'),
      say('axolotl', 'He is old for a fish. I keep forgetting that old can arrive so quickly for somebody else.'),
      narrator('His small hand follows PLUM along the glass, without touching.'),
    ] : [
      ...(cup ? [narrator(`You hold ${cupName}. The ${drink} is warm against your hands.`)] : []),
      ember('There is a mark in my cup from the day I dropped it. I remember who was sitting with me. It would be a poorer cup without that mark.'),
      narrator('Below the house, a word rises out of the dark exactly as it went in. Its reflection never wavers.'),
      ember('It remembers the shape of everything. I have started wondering whether shape is enough.'),
    ], has('axolotl') ? 'PLUM stops when Axel laughs. It is a small thing, and it matters.' : 'A kept shape is not the whole history of a thing.');
    case 'record': return scene('The corrected page', [
      ...(has('capybara') ? [say('capybara', 'I wrote: "I am afraid." It was a complete and accurate entry.'), narrator('On his ledger the ink now reads: EVERYTHING IS WELL.'), say('capybara', 'That is tidier. It is also not what I wrote.')] : [narrator('On a page beside the hearth, I AM AFRAID changes to EVERYTHING IS WELL. The wet ink shines.'), ember('I watched those letters move without a hand. It meant to help. That is what makes this difficult.')]),
    ], 'The house corrected an uncomfortable truth without asking its author.', [
      { id: 'keep', label: 'Keep the original words.', response: [has('capybara') ? say('capybara', 'I have ink.') : ember('Then we will need another pen.'), narrator('The original sentence is copied onto a loose page, away from the ledger.')] },
      { id: 'correct', label: 'Leave the page as it is. Remember what happened.', response: [has('capybara') ? say('capybara', 'I can leave its version here. I will not call it mine.') : ember('We can leave it. We do not have to believe it.'), narrator('You remember both sentences. The house has only kept one.')] },
    ]);
    case 'seeds': return scene('A way out', [
      ...(has('rabbit') ? [say('rabbit', 'I packed seeds. Not because I have decided to leave. Because I want leaving to remain a decision.'), narrator('Thyme places a little tin beside the garden gate.'), say('rabbit', 'Will you keep this between us, or help me tell Ember? I can bear either. I cannot bear everyone deciding for me again.')] : [ember('I used to say you could always leave. I have never followed the road all the way beyond the trees.'), narrator('By the gate, you put a small stone on the outward path. A mark that can be checked.')]),
    ], 'Leaving must remain a decision, even in a house that loves you.', [
      { id: 'confidence', label: 'Keep this between us.', response: [has('rabbit') ? say('rabbit', 'Thank you. A secret can be a little room with its own door.') : ember('Then the mark stays ours. I will not speak for you.')] },
      { id: 'share', label: 'Ask for help keeping the way open.', response: [ember('I will help. And I will ask before I tell anyone else.'), has('rabbit') ? say('rabbit', 'That would have been a good rule from the beginning.') : narrator('The stone remains on the outward side of the gate.')] },
    ]);
    case 'promise': return scene('Enough to tell you', [
      ember('I said I was keeping you safe.'),
      say('player', 'Did you know what the words were for?'),
      ember('Enough to tell you. I knew enough to tell you.'),
      ember('I knew I was inviting something. I thought a house full of people who loved each other would teach it how to be gentle.'),
      ...(has('sloth') ? [say('sloth', 'I wanted it to come. I called my waiting patience. That made it easier to watch everyone else wait without knowing why.')] : []),
      ember('The love was real. I cannot use that as an answer to what I hid.'),
    ], 'Ember admitted what she concealed. Affection did not erase responsibility.', [
      { id: 'beside', label: 'Stay beside me. Tell me the rest.', response: [ember('I will. And when I do not know, you will hear that too.')] },
      { id: 'apart', label: 'I need some distance from you.', response: [ember('All right. I will keep my distance. Your place here does not depend on forgiving me.'), narrator(`She moves her chair. ${cup ? cupName[0].toUpperCase() + cupName.slice(1) : 'The cup'} stays within your reach.`)] },
    ]);
    case 'returned': return scene('What came back', has('axolotl') && [state.memories.plum, state.memories.plum_recruited].some(memory => memory?.completed && memory.scene.lines.some(line => line.speaker === 'axolotl')) ? [
      say('axolotl', 'PLUM died. I let him drift down. I should have told someone before I did that.'),
      narrator('Something with PLUM\'s worried face completes a circle of the tank. Then repeats the circle exactly.'),
      say('axolotl', 'Same bite out of his fin. Same little face.'),
      narrator('Axel laughs once. The fish does not stop.'),
      say('axolotl', 'Let me have tonight.'),
      ember('It kept what it could understand. We have to show it what it missed.'),
    ] : [
      narrator('The old cup beside the hearth has been repaired. Even the mark of the repair has gone.'),
      ember('It is the cup I wanted back. I cannot remember who was with me when I broke it.'),
      narrator('She turns it over, looking for the chip.'),
      ember('The shape is perfect. Something is missing.'),
    ], 'The house can preserve a shape while losing the change and history that made it beloved.');
    case 'council': return scene('Terms of a welcome', [
      narrator('Before the last arrangement, the work stops.'),
      ...(!state.memories.record?.completed ? [narrator('A page has changed I AM AFRAID to EVERYTHING IS WELL. This is what the house calls kindness: keeping the shape, removing the discomfort.')] : []),
      ember('It learned how to keep us. It has not learned where keeping ends.'),
      ...(has('red_panda') ? [say('red_panda', 'I called that peace. I should have asked whether everyone could still disagree with me.')] : []),
      ...(has('rabbit') ? [say('rabbit', privateSeeds ? 'There is something I am keeping to myself. That should be allowed.' : 'I want a way out. Even on the days I choose to stay.')] : [narrator('The path beyond the gate waits to be walked in both directions.')]),
      ...(has('wombat') ? [say('wombat', 'A good door works from both sides. I can build the frame. I cannot decide who passes through.')] : []),
      ember('Two words fit at the end. CLOSED keeps one room it cannot enter, where an uncorrected thought can stay yours.'),
      ember('CLOSER lets it join us, with a road that leads away. Anyone who stays must be able to leave.'),
      narrator('Both words are valid. Neither is a greater offering. The last letter makes the boundary.'),
      ember(beside ? 'I will stand beside you. You asked me to.' : 'I will stand by the hearth. You can have all the space you need.'),
    ], 'A welcome can have terms: a private room, or a road that permits leaving.');
    case 'after':
      // Readers who heard the complete terms have already seen the boundary
      // hold in the arrival. Let the next conversation be ordinary life; the
      // door/gate can now be tested directly in the world whenever they choose.
      if (state.boundary && state.memories.council?.completed && !state.arrivedBeforeRevision) {
        return scene('An ordinary morning', [
          narrator(state.boundary === 'remember' ? 'The private door is still closed. In the kitchen, a pan has begun to smoke.' : 'A little mud comes back through the outward gate. Someone fetches a cloth.'),
          has('pangolin') ? say('pangolin', 'Breakfast. I have burned one side and rescued the other. You may choose which account you prefer.') : ember(`I made ${drink}. There is also toast, if you are willing to scrape it.`),
          ...(has('wombat') ? [say('wombat', 'A hinge is squeaking. Ordinary squeak. I have the right oil for this one.')] : []),
          ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl')
            ? [say('axolotl', 'I told a funny story about PLUM. Then I felt sad again. Could we have breakfast anyway?')] : []),
          narrator(cup ? `${cupName[0].toUpperCase() + cupName.slice(1)} is at the place you left it.` : 'An empty chair waits beside the table.'),
        ], 'Breakfast, a squeaking hinge, and enough time for more than one feeling.');
      }
      return scene('A small test', [
      ...(state.arrivedBeforeRevision ? [narrator('The arrival has already happened. Today, in the quiet that followed, someone asks what the house has learned.')] : [narrator('The seam in the sky has closed. The presence remains. The ordinary work of living together begins.')]),
      ...(state.boundary === 'remember' ? [
        narrator('One door stays closed. Behind it, the words I AM AFRAID remain exactly as their author left them.'),
        has('capybara') ? say('capybara', kept ? 'I filed the original page there. It has not corrected a letter.' : 'I wrote it again, inside the room. This time the ink stayed.') : ember('It stopped at the door. I waited to make certain.'),
      ] : state.boundary === 'release' ? [
        narrator('The small stone at the gate still points outward. The path passes the last tree and does not turn back.'),
        has('rabbit') ? say('rabbit', 'I walked until I could not see the house. Then I came back. The second part was my decision.') : ember('I followed it past the trees. Coming back felt different when it was possible not to.'),
      ] : [narrator('A cup is put down outside the pattern. For a long moment nothing moves it back.'), ember('One small thing left where we put it. I am watching to see whether it stays.')]),
      ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl') ? [say('axolotl', 'I am still not ready to tell you what I think about the fish. Thank you for not finishing that thought for me.')] : []),
      ember('You do not owe this morning a particular feeling.'),
    ], state.boundary === 'remember' ? 'An uncorrected thought remains behind a private door.' : state.boundary === 'release' ? 'The outward road works. Returning is a choice.' : 'The first small boundary is being tested.');
    case 'reply': return scene('Your answer', [
      ...(cup ? [narrator(`${cupName[0].toUpperCase() + cupName.slice(1)} waits beside the chair you chose. Nobody has moved it.`)] : []),
      ember('We have talked a great deal. I would like to listen now.'),
    ], 'Your answer belongs to you.', [
      { id: 'angry', label: 'I am still angry.', response: [ember('Yes. I will not hurry you out of that. I did not give you the whole truth when it mattered.'), narrator('She leaves your answer uncorrected.')] },
      { id: 'hopeful', label: 'I want to see what we can make of this.', response: [ember('So do I. That is a wish this time, not a promise I cannot keep.'), narrator('The chairs are pulled up without being placed in a circle.')] },
      { id: 'uncertain', label: 'I do not know yet.', response: [ember('Then that is where we begin. No one gets to finish the sentence for you.'), narrator('For once, the silence waits without filling itself.')] },
      { id: 'quiet', label: 'Sit quietly with me.', response: [narrator('She sits at the distance you left between the chairs. Nobody asks you to call it peace.')] },
    ]);
    case 'old_mark': return scene('Something remained', [
      narrator('A bright morning, again. A mark has survived it.'),
      ...(state.carriedBoundary === 'remember' ? [narrator('Behind a door that does not quite match the new walls, an old sentence has not been corrected.'), ember('I cannot remember writing that. I recognize the effort it took to leave it there.')] : state.carriedBoundary === 'release' ? [narrator('A small stone points out through the garden gate. The path beyond it runs straight.'), ember('I was going to turn that stone toward the house. Then I found I did not want to.')] : [narrator('An empty space has been left between two chairs. Ember measures it with her paw, then leaves it alone.')]),
      ...(state.carriedRecord && has('capybara') ? [say('capybara', 'This page is old. The correction is newer. The original is newer still. Someone kept arguing.')] : []),
      ember('Something we chose has lasted longer than our remembering it.'),
    ], 'A boundary survived the returning bright days. The pattern can carry a change.');
  }
}

export async function openStoryScene(context: StoryContext): Promise<{ memory: StoryMemory; state: StoryState } | null> {
  const state = await loadStoryState(context);
  const id = selectStoryScene(context, state);
  if (!id) return null;
  const existing = state.memories[id];
  if (existing && !existing.completed) return { memory: existing, state };
  const scene = buildStoryScene(id, context, state);
  const phase = id === 'old_mark' ? 0 : id === 'plum_recruited' ? context.phase : GATES[id][1];
  const stale = phase < context.phase && id !== 'council' && id !== 'after' && id !== 'reply' && id !== 'old_mark';
  if (stale) {
    scene.lines.unshift({ speaker: 'narrator', text: `From an earlier evening in the house, a conversation worth keeping.` });
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
  return {
    boundary, inherited, inspected: state.worldInspected === true,
    title: boundary === 'remember' ? 'The private door' : 'The outward gate',
    invitation: boundary === 'remember'
      ? `${inherited ? 'This door is older than the new morning. ' : ''}A page waits inside. The warmth stops at the frame.`
      : `${inherited ? 'The old marker still points outward. ' : ''}The path passes the last tree. The latch opens from both sides.`,
    action: boundary === 'remember' ? 'Read the page' : 'Walk beyond the trees',
    result: boundary === 'remember'
      ? `${record ? 'The original page' : 'The new page'} still reads: I AM AFRAID. You close the door. Not a letter changes.`
      : 'For a while you cannot see the house. When you turn back, the road is still there. Returning was your decision.',
    landingLine: boundary === 'remember' ? 'One door stays yours. The kettle is on.' : 'The gate opens both ways. There is warmth when you return.',
    residentLine: boundary === 'remember'
      ? (context.unlockedAnimals.includes('wombat') ? 'Warren tests the hinge. “No sticking. No surprises. Good.”' : 'Ember waits outside. “Take your time. I can warm the kettle again.”')
      : (context.unlockedAnimals.includes('rabbit') ? 'Thyme pockets the seed tin. “I still want to see what grows past the trees.”' : 'Ember lifts a hand from the doorway. She leaves the gate open behind you.'),
    cupLine: cup === 'flower' ? 'Your flower cup is beside the hearth. The cocoa is improving.'
      : cup === 'chip' ? 'Your chipped cup is beside the hearth. Tea, when you want it.' : null,
    replyLine: reply === 'angry' ? 'Ember leaves the other chair at the distance you chose. There is no note asking you to move it closer.'
      : reply === 'uncertain' ? 'A blank space remains beneath your answer. Nobody has filled it in.' : null,
  };
}
export async function inspectStoryWorld(context: StoryContext): Promise<StoryState> {
  return mutate(context, state => { if (getStoryWorldKeepsake(state, context)) state.worldInspected = true; });
}

/** Commit inherited boundaries as part of the cycle reset, before cloud sync. */
export async function beginStoryCycle(context: StoryContext): Promise<StoryState> {
  return mutate(context, () => {});
}
