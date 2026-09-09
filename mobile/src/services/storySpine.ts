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
  const word = context.ritualWord?.toUpperCase().replace(/[^A-Z]/g, '') || "the word you offered";
  const kept = storyChoice(state, 'record') === 'keep';
  const privateSeeds = storyChoice(state, 'seeds') === 'confidence';
  const beside = storyChoice(state, 'promise') === 'beside';
  const cup = storyChoice(state, 'cup');
  const cupName = cup === 'flower' ? 'your flower cup' : cup === 'chip' ? 'your chipped cup' : 'your cup';
  const drink = cup === 'flower' ? 'cocoa' : 'tea';
  const scene = (title: string, lines: StoryLine[], memory: string, options?: StoryOption[]): StoryScene => ({ id, title, lines, memory, ...(options ? { options } : {}) });
  switch (id) {
    case 'cup': return scene('A place at the table', [
      ember("I've got two cups and one important question. Tea, or the terrible cocoa I keep trying to improve?"),
      narrator('One cup has a chip in the handle. The other has a crooked flower painted on it.'),
      ember("That flower was meant to be a fox. You can be kind about it, but please don't lie."),
    ], "A cup was kept for you here, before the house asked you for anything.", [
      { id: 'flower', label: 'The flower cup. Cocoa, please.', response: [ember("Brave. I mean about the cocoa. The flower is excellent company."), narrator('She moves the chipped cup to her own place.')] },
      { id: 'chip', label: "The chipped cup. Tea, please.", response: [ember("It suits your hand, doesn't it? I keep forgetting that a thing can be chipped and still be exactly right."), narrator("She puts the cocoa away and does not look disappointed.")] },
    ]);
    case 'echo': return scene('The same word', [
      narrator(`Below the house, ${word} catches against the rim instead of sinking.`),
      ...(has('owl') ? [say('owl', "Wait. I wrote that word in my notebook this morning. Before you brought it down here."), narrator("He lays the open notebook down beside the rim. The letters match.")] : [narrator("The same letters are already scratched into the stone beside the rim. The scratches are old.")]),
      ember("I could call this a coincidence, friend. I would like that word to be some help. It is not."),
      narrator("The word sinks. Its reflection stays on the surface one moment longer."),
    ], `The word ${word} appeared twice, once before you formed it.`);
    case 'supper': return scene('Before it goes cold', [
      ...(cup ? [narrator(`Ember sets ${cupName} at your place. ${cup === 'flower' ? "She has been working on the cocoa recipe again." : "She remembered that you asked for tea."}`)] : []),
      ...(has('pangolin') ? [say('pangolin', "Supper. Now. The empty place at the table can wait. The rest of us have stomachs."), narrator("She sets the covered dish aside on the floor and serves everyone from the ordinary pot.")] : [ember("I spent the whole afternoon keeping a place warm for someone who has not come. Your drink went cold while I did it. That is ridiculous of me, friend."), narrator(`The empty cup is moved aside. Fresh ${cup ? drink : 'tea'} goes in ${cup ? cupName : 'yours'}.`)]),
      ...(has('rabbit') ? [say('rabbit', 'Is it safe?'), ...(has('pangolin') ? [say('pangolin', "It is soup. I made it myself. Ask me about the house after you have eaten.")] : [ember("The tea is safe. I cannot promise you anything else tonight.")])] : [narrator("For a while the room sounds like an ordinary supper, not like a room listening for something.")]),
      narrator("Under the table, the low hum below the floor slips out of rhythm. Nobody hurries to set it right."),
    ], "Someone stopped the preparations for an evening and looked after the people who were already here.");
    case 'plan': return scene('Which way the door faces', [
      ...(has('wombat') ? [say('wombat', "I always read this line on the old plan as a brace. Look which way it points."), narrator("Warren turns a drawing of the foundations so the doorway faces you.")] : [narrator("A loose plan lies under the oldest hearthstone. Its arrows point in toward the house, not away from it.")]),
      ...(has('tarsier') ? [say('tarsier', "My watch keeps the house in sight all night. Nobody ever told me who I am watching for.")] : [ember("All that work to keep something out. Or maybe, friend, that is only what we wanted the drawing to mean.")]),
      ...(has('owl') ? [say('owl', "I wrote \"defense\" beside this mark in the old book. The book never used that word. I did.")] : [narrator("Someone has written SAFE in the margin. The handwriting is much newer than the plan.")]),
      narrator("A line goes through the reassuring word. Nobody writes a new one under it. It is the first answer anyone has crossed out."),
    ], "Every mark on the old plan points inward, at the house. We were the ones who called that safe.");
    case 'plum_recruited':
    case 'plum': return scene(has('axolotl') ? 'A little worried face' : "What the warmth keeps", has('axolotl') ? [
      say('axolotl', "This is PLUM! He is on his first lap of the tank, worried face and all. He usually stops swimming when I laugh."),
      narrator("Axel blows a crooked bubble. PLUM noses it, then turns back to him."),
      say('axolotl', "He is old for a fish. I keep forgetting how quickly somebody else can get old."),
      narrator("His small hand follows PLUM along the glass, close but never touching."),
    ] : [
      ...(cup ? [narrator(`You hold ${cupName}. The ${drink} is warm against your hands.`)] : []),
      ember("This cup has a chip in it, friend, from the day I dropped it. I still remember who was sitting with me. It would be a poorer cup without that chip."),
      narrator("Below the house, a word comes back up out of the dark exactly as it went down. Its reflection does not waver at all."),
      ember("Whatever is down there keeps the shape of everything, exactly. I am starting to wonder whether keeping the shape is enough."),
    ], has('axolotl') ? "PLUM stops swimming when Axel laughs. It is a small thing, and it matters." : "Keeping the shape of a thing does not keep everything that happened to it.");
    case 'record': return scene('The corrected page', [
      ...(has('capybara') ? [say('capybara', "I wrote this in the ledger: \"I am afraid.\" Three words, complete and accurate."), narrator("On his ledger, the ink now reads: EVERYTHING IS WELL."), say('capybara', 'That is tidier. It is also not what I wrote.')] : [narrator("On a page beside the hearth, I AM AFRAID changes to EVERYTHING IS WELL. The wet ink shines."), ember("I watched those letters move with no hand near them. Whatever moved them meant to help, friend. That is what makes this hard.")]),
    ], "The house corrected an uncomfortable truth without asking the one who wrote it.", [
      { id: 'keep', label: 'Keep the original words.', response: [has('capybara') ? say('capybara', 'I have ink.') : ember('Then we will need another pen.'), narrator("The original sentence is copied onto a loose page and kept away from the ledger.")] },
      { id: 'correct', label: 'Leave the page as it is. Remember what happened.', response: [has('capybara') ? say('capybara', "I can leave the house's version on the page. I will not put my name to it.") : ember("We can leave the page alone. We do not have to believe what it says."), narrator("You remember both sentences. The house kept only one.")] },
    ]);
    case 'seeds': return scene('A way out', [
      ...(has('rabbit') ? [say('rabbit', "I packed seeds. I have not decided to leave. I packed them so that leaving stays something I can still choose."), narrator("Thyme sets a small tin down beside the garden gate."), say('rabbit', "Will you keep this between us, or help me tell Ember? I can live with either answer. I cannot live with everyone deciding for me again.")] : [ember("I used to tell you that you could always leave. I have never walked that road past the trees myself."), narrator("By the gate, you set a small stone on the path that leads away. A mark you can come back and check.")]),
    ], "Leaving must stay a decision, even in a house that loves you.", [
      { id: 'confidence', label: 'Keep this between us.', response: [has('rabbit') ? say('rabbit', "Thank you. A secret is a little room with its own door, and I am the one who opens it.") : ember("Then the stone at the gate stays between us. I will not speak for you.")] },
      { id: 'share', label: "Ask for help keeping the way out open.", response: [ember("I will help. And I will ask you first before I tell anyone else."), has('rabbit') ? say('rabbit', "Asking first. That would have been a good rule from the very beginning.") : narrator("The stone stays on the outward side of the gate, pointing away from the house.")] },
    ]);
    case 'promise': return scene('Enough to tell you', [
      ember("I told you I was keeping you safe. That was the promise."),
      say('player', 'Did you know what the words were for?'),
      ember("I knew enough to tell you. And I did not tell you."),
      ember("I knew I was inviting something in. I thought a house full of people who loved each other would teach it to be gentle."),
      ...(has('sloth') ? [say('sloth', "I wanted it to come. I called my waiting patience. That word made it easier to watch everyone else wait without knowing why.")] : []),
      ember("The love in this house was real, friend. It does not excuse what I kept from you."),
    ], "Ember admitted what she had hidden. Love did not cancel what she owed.", [
      { id: 'beside', label: 'Stay beside me. Tell me the rest.', response: [ember("I will tell you the rest. And when I do not know something, I will say so.")] },
      { id: 'apart', label: 'I need some distance from you.', response: [ember("All right. I will keep my distance. Your place in this house does not depend on forgiving me."), narrator(`She moves her chair. ${cup ? cupName[0].toUpperCase() + cupName.slice(1) : 'The cup'} stays within your reach.`)] },
    ]);
    case 'returned': return scene('What came back', has('axolotl') && [state.memories.plum, state.memories.plum_recruited].some(memory => memory?.completed && memory.scene.lines.some(line => line.speaker === 'axolotl')) ? [
      say('axolotl', "PLUM died. I let him drift down to the bottom of the tank. I should have told someone before I did that."),
      narrator("Something with PLUM's worried face swims a full circle of the tank. Then it swims the same circle again, exactly."),
      say('axolotl', "The same bite out of his fin. The same little face."),
      narrator("Axel laughs once. PLUM always stopped for that. This fish keeps swimming."),
      say('axolotl', "Let me have tonight. I am not ready to work this out."),
      ember("It kept the part of PLUM it could understand, friend. The shape of him. We will have to show it what it left out."),
    ] : [
      narrator("The old cup by the hearth is whole again. Even the line where it was mended has disappeared."),
      ember("This is the cup I wanted back, friend. And I cannot remember who was sitting with me when I broke it."),
      narrator("She turns the cup over in her paws, looking for the chip."),
      ember("The shape is perfect. The chip is gone, and so is the memory of breaking it."),
    ], "The house can keep the shape of a thing perfectly, and lose the history that made you love it.");
    case 'council': return scene('Terms of a welcome', [
      narrator("The work stops. The last arrangement has not been made yet."),
      ...(!state.memories.record?.completed ? [narrator("A page that said I AM AFRAID now says EVERYTHING IS WELL. The house calls that kindness: keep the sentence, take away the discomfort.")] : []),
      ember("It learned how to keep us exactly as we are, friend. It never learned where that has to stop."),
      ...(has('red_panda') ? [say('red_panda', "I moved my cushion out of the middle of the mat. There are other places to sit. I should have moved it sooner.")] : []),
      ...(has('rabbit') ? [say('rabbit', privateSeeds ? "There is one thing I am keeping to myself. I am not going to say what it is. That should be allowed." : "I want a way out. Even on the days when I choose to stay.")] : [narrator("The path beyond the gate leads away from the house, and back to it.")]),
      ...(has('wombat') ? [say('wombat', "I'll hang a door you can open from either side. You try the latch yourself before I call the job finished.")] : []),
      ember("Two words will fit at the end, friend. CLOSED keeps one room it cannot enter. A thought you have in there stays yours, uncorrected."),
      ember("CLOSER lets it come and live with us, and keeps a road that leads away. Anyone who stays must be able to leave."),
      narrator("Both words work. Neither is the greater offering. The last letter you move sets the boundary."),
      ember(beside ? "I will stand beside you, friend. You asked me to." : "I will stay by the hearth, friend. You can have as much room as you need."),
    ], "A welcome can come with terms: one private room, or a road that lets you leave.");
    case 'after':
      // Readers who heard the complete terms have already seen the boundary
      // hold in the arrival. Let the next conversation be ordinary life; the
      // door/gate can now be tested directly in the world whenever they choose.
      if (state.boundary && state.memories.council?.completed && !state.arrivedBeforeRevision) {
        return scene('An ordinary morning', [
          narrator(state.boundary === 'remember' ? "The private door is still closed. In the kitchen, a pan has started smoking." : "Someone walked out through the gate and came back with mud on their feet. Someone else fetches a cloth."),
          has('pangolin') ? say('pangolin', "Breakfast. I burned one side and saved the other. You may call it a disaster or a rescue, whichever you prefer.") : ember(`I made ${drink}. There is also toast, if you are willing to scrape it.`),
          ...(has('wombat') ? [say('wombat', "A hinge is squeaking. Ordinary squeak, nothing stranger. I've got the right oil for this one.")] : []),
          ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl')
            ? [say('axolotl', 'I told a funny story about PLUM. Then I felt sad again. Could we have breakfast anyway?')] : []),
          narrator(cup ? `${cupName[0].toUpperCase() + cupName.slice(1)} is at the place you left it.` : 'An empty chair waits beside the table.'),
        ], "Breakfast, a squeaking hinge, and room for more than one feeling.");
      }
      return scene('A small test', [
      ...(state.arrivedBeforeRevision ? [narrator("The arrival has already happened. In the quiet after it, someone asks what the house has learned.")] : [narrator("The seam in the sky has closed. The presence stayed. Now comes the ordinary work of living together.")]),
      ...(state.boundary === 'remember' ? [
        narrator("One door stays closed. Behind it, the words I AM AFRAID are exactly as their author left them."),
        has('capybara') ? say('capybara', kept ? "I filed the original page in that room. Not one letter has been corrected since." : "I wrote those words again, inside that room. This time the ink stayed.") : ember("The warmth stopped at that door. I waited a long time to be certain."),
      ] : state.boundary === 'release' ? [
        narrator("A small stone still sits at the gate, marking the way out. The path runs past the last tree and does not turn back."),
        has('rabbit') ? say('rabbit', "I walked out until I could not see the house. Then I came back. Coming back was my own decision.") : ember("I followed the path past the trees. Coming back felt different, knowing I could have kept walking."),
      ] : [narrator("A cup is set down outside the pattern's lines. Anything left there used to be put back. Nothing moves it for a long time."), ember("One small thing left exactly where we put it. I am watching to see whether it stays there.")]),
      ...(has('axolotl') && state.memories.returned?.scene.lines.some(line => line.speaker === 'axolotl') ? [say('axolotl', "I am still not ready to say what I think about the fish. Thank you for not finishing that thought for me.")] : []),
      ember("You do not owe this morning any particular feeling, friend."),
    ], state.boundary === 'remember' ? "Behind a private door, one thought stays uncorrected." : state.boundary === 'release' ? "The road out works. Coming back is a choice." : "A cup left out of place is the first small test.");
    case 'reply': return scene('Your answer', [
      ...(cup ? [narrator(`${cupName[0].toUpperCase() + cupName.slice(1)} waits beside the chair you chose. Nobody has moved it.`)] : []),
      ember("We have talked a great deal, friend. I would like to listen now."),
    ], 'Your answer belongs to you.', [
      { id: 'angry', label: 'I am still angry.', response: [ember("Yes. I will not rush you out of that anger. I did not tell you the whole truth when it mattered."), narrator("She lets your answer stand. Nothing corrects it.")] },
      { id: 'hopeful', label: 'I want to see what we can make of this.', response: [ember("So do I. This time I am saying it as a wish, not as a promise I cannot keep."), narrator("Chairs are pulled up to the table. Nobody arranges them into a circle.")] },
      { id: 'uncertain', label: 'I do not know yet.', response: [ember("Then that is where we begin. Not knowing is allowed. Nobody gets to finish that sentence for you."), narrator("For once the silence is allowed to last. Nobody hurries to fill it.")] },
      { id: 'quiet', label: 'Sit quietly with me.', response: [narrator("You left a gap between the chairs. She sits on her side of it. Nobody asks you to call this peace.")] },
    ]);
    case 'old_mark': return scene('Something remained', [
      narrator("The bright mornings are back. One old mark has survived them."),
      ...(state.carriedBoundary === 'remember' ? [narrator("One door does not quite match the new walls. Behind it, an old sentence still stands, and nothing has corrected it."), ember("I don't remember writing that, friend. But I know what it took to leave it there and not fix it.")] : state.carriedBoundary === 'release' ? [narrator("A small stone at the garden gate points outward. The path past it runs straight away from the house."), ember("I meant to turn that stone back toward the house. When I got there, I didn't want to.")] : [narrator("Two chairs sit apart, with room between them for a third that nobody has added. Ember measures the gap with her paw and leaves it alone.")]),
      ...(state.carriedRecord && has('capybara') ? [say('capybara', "This page is old. The correction over it is newer. Then the original was written back in on top, newer still. Someone kept arguing.")] : []),
      ember("We chose something once. It has lasted longer than our memory of choosing it."),
    ], "A boundary survived into the bright days. The pattern can carry a change.");
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
      ? `${inherited ? "The morning here is new. This door is not. " : ''}A page waits inside. The warmth stops at the frame.`
      : `${inherited ? "The old marker by the gate still points outward. " : ''}The path passes the last tree. The latch opens from both sides.`,
    action: boundary === 'remember' ? 'Read the page' : 'Walk beyond the trees',
    result: boundary === 'remember'
      ? `${record ? 'The original page' : 'The new page'} still reads: I AM AFRAID. You close the door. Not a letter changes.`
      : "For a while you cannot see the house. When you turn back, the road is still there. Coming back was your decision.",
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
