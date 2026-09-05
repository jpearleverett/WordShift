import { useStoryFlow } from '../hooks/useStoryFlow';
import { StoryContext, StoryMemory, advanceStoryPage, chooseStoryOption, openStoryScene } from '../services/storySpine';

const states = new Map<number, unknown>();
const refs = new Map<number, { current: unknown }>();
let stateIndex = 0;
let refIndex = 0;

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!states.has(index)) {
      states.set(index, typeof initial === 'function' ? (initial as () => unknown)() : initial);
    }
    return [
      states.get(index),
      (value: unknown) => states.set(index, typeof value === 'function'
        ? (value as (previous: unknown) => unknown)(states.get(index))
        : value),
    ];
  },
  useRef: (initial: unknown) => {
    const index = refIndex++;
    if (!refs.has(index)) refs.set(index, { current: initial });
    return refs.get(index)!;
  },
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
}));

jest.mock('../services/storySpine', () => ({
  advanceStoryPage: jest.fn(),
  chooseStoryOption: jest.fn(),
  openStoryScene: jest.fn(),
}));

const openMock = openStoryScene as jest.Mock;
const advanceMock = advanceStoryPage as jest.Mock;
const chooseMock = chooseStoryOption as jest.Mock;
const context: StoryContext = {
  phase: 0, puzzlesSolved: 6, cycleCount: 0, unlockedAnimals: ['fox'],
};
const memory: StoryMemory = {
  scene: {
    id: 'cup', title: 'A place at the table', memory: 'A cup was kept for you.',
    lines: [
      { speaker: 'fox', text: 'Tea, or cocoa?' },
      { speaker: 'narrator', text: 'One cup has a flower.' },
    ],
  },
  completed: false,
  page: 0,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

let getContext: jest.Mock<Promise<StoryContext>, []>;
function StoryFlowHarness(enabled: boolean) {
  return useStoryFlow(getContext, enabled);
}

function render(enabled = true) {
  stateIndex = 0;
  refIndex = 0;
  return StoryFlowHarness(enabled);
}

beforeEach(() => {
  states.clear();
  refs.clear();
  stateIndex = 0;
  refIndex = 0;
  jest.resetAllMocks();
  getContext = jest.fn(async () => context);
  openMock.mockResolvedValue({ memory, state: { memories: { cup: memory } } });
});

describe('useStoryFlow delivery and cancellation', () => {
  it('opens one scene when prepare is requested concurrently', async () => {
    const opening = deferred<{ memory: StoryMemory; state: { memories: { cup: StoryMemory } } }>();
    openMock.mockReturnValue(opening.promise);
    const hook = render();
    const first = hook.prepare();
    const second = hook.prepare();
    await settle();
    expect(openMock).toHaveBeenCalledTimes(1);
    opening.resolve({ memory, state: { memories: { cup: memory } } });
    await Promise.all([first, second]);
    expect(render().active).toBeNull();
    hook.run(() => {});
    expect(render().active?.memory.page).toBe(0);
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it('runs the parked action exactly once when a conversation is closed', async () => {
    const action = jest.fn();
    let hook = render();
    await hook.prepare();
    hook.run(action);
    await settle();
    hook = render();
    expect(hook.active?.memory.scene.id).toBe('cup');
    expect(action).not.toHaveBeenCalled();
    hook.close();
    hook.close();
    expect(action).toHaveBeenCalledTimes(1);
    expect(render().active).toBeNull();
  });

  it('closing a scene never advances its saved page or invents an answer', async () => {
    let hook = render();
    await hook.prepare();
    hook.run(() => {});
    hook = render();
    hook.close();
    expect(advanceMock).not.toHaveBeenCalled();
    expect(chooseMock).not.toHaveBeenCalled();
    expect(memory.page).toBe(0);
    expect(memory.completed).toBe(false);
  });

  it('keeps the visible page available when its save fails', async () => {
    advanceMock.mockRejectedValue(new Error('Storage unavailable'));
    let hook = render();
    await hook.prepare();
    hook.run(() => {});
    hook = render();
    await expect(hook.advance()).rejects.toThrow('Storage unavailable');
    expect(advanceMock).toHaveBeenCalledTimes(1);
    const visible = render().active;
    expect(visible?.memory.page).toBe(0);
    expect(visible?.memory.completed).toBe(false);
    expect(visible?.memory.scene.id).toBe('cup');
  });

  it('reset prevents a late scene response from reopening the old run', async () => {
    const opening = deferred<{ memory: StoryMemory; state: { memories: { cup: StoryMemory } } }>();
    openMock.mockReturnValue(opening.promise);
    let hook = render();
    const prepared = hook.prepare();
    await settle();
    expect(openMock).toHaveBeenCalledTimes(1);
    hook.reset();
    opening.resolve({ memory, state: { memories: { cup: memory } } });
    await prepared;
    hook = render();
    expect(hook.active).toBeNull();
    expect(hook.journalContext).toBeNull();
  });

  it('reset prevents a delayed journal context from opening the old run', async () => {
    const loading = deferred<StoryContext>();
    getContext.mockReturnValue(loading.promise);
    let hook = render();
    const opened = hook.openJournal();
    hook.reset();
    loading.resolve(context);
    await opened;
    hook = render();
    expect(hook.journalContext).toBeNull();
    expect(hook.active).toBeNull();
  });

  it('reset discards a parked action rather than running it in a new run', async () => {
    const action = jest.fn();
    let hook = render();
    await hook.prepare();
    hook.run(action);
    await settle();
    hook = render();
    expect(hook.active).not.toBeNull();
    hook.reset();
    hook = render();
    hook.close();
    expect(action).not.toHaveBeenCalled();
    expect(render().active).toBeNull();
  });
});

it('reset during context loading prevents an old conversation write', async () => {
  const loading = deferred<StoryContext>();
  getContext.mockReturnValue(loading.promise);
  const hook = render();
  const result = hook.prepare();
  hook.reset();
  loading.resolve(context);
  expect(await result).toBe(false);
  expect(openMock).not.toHaveBeenCalled();
});
