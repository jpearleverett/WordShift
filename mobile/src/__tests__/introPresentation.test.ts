import { createIntroPresentationGuard } from '../services/introPresentation';
import fs from 'fs';
import path from 'path';

const animal = (id: string) => ({ id });

it('holds completion from the first await through a slow introduction and its visible reading', async () => {
  jest.useFakeTimers();
  try {
    const guard = createIntroPresentationGuard<{ id: string }>(value => value.id);
    let completionShown = false;
    let introShown = false;
    let finishStorage!: () => void;
    const storage = new Promise<void>(resolve => { finishStorage = resolve; });
    let token: number | null = null;
    setTimeout(() => {
      token = guard.claim();
      void storage.then(() => { if (guard.owns(token)) introShown = true; });
    }, 300);
    setTimeout(() => { if (!guard.busy() && !guard.pendingCount()) completionShown = true; }, 650);
    await jest.advanceTimersByTimeAsync(900);
    expect(completionShown).toBe(false);
    expect(introShown).toBe(false);
    finishStorage();
    await Promise.resolve();
    expect(introShown).toBe(true);
    expect(guard.busy()).toBe(true);
    expect(guard.release(token)).toBe(true);
    expect(guard.busy()).toBe(false);
  } finally { jest.useRealTimers(); }
});

it('keeps a new arrival queued while another animal saves and presents each arrival once', () => {
  const guard = createIntroPresentationGuard<{ id: string }>(value => value.id);
  const current = guard.claim();
  expect(guard.enqueue(animal('kakapo'))).toBe(1);
  expect(guard.enqueue(animal('kakapo'))).toBe(1);
  expect(guard.enqueue(animal('tarsier'))).toBe(2);
  expect(guard.take()).toBeNull();
  expect(guard.owns(current)).toBe(true);
  guard.release(current);
  expect(guard.take()).toEqual(animal('kakapo'));
  const next = guard.claim();
  expect(guard.take()).toBeNull();
  guard.release(next);
  expect(guard.take()).toEqual(animal('tarsier'));
  expect(guard.pendingCount()).toBe(0);
});

it('cannot apply or release a stale save result over the next reading', () => {
  const guard = createIntroPresentationGuard<{ id: string }>(value => value.id);
  const old = guard.claim();
  guard.release(old);
  const next = guard.claim();
  expect(guard.owns(old)).toBe(false);
  expect(guard.release(old)).toBe(false);
  expect(guard.owns(next)).toBe(true);
  guard.invalidate();
  expect(guard.owns(next)).toBe(false);
});

it('wires opening, pending arrivals, and stale-save guards into the actual HomeScreen', () => {
  const home = fs.readFileSync(path.join(__dirname, '../components/home/HomeScreen.tsx'), 'utf8');
  const opening = home.slice(home.indexOf('const presentAnimalAcquaintance'), home.indexOf('// Dialogue flow hook'));
  expect(opening.indexOf('claimIntroOpening()')).toBeLessThan(opening.indexOf('await getFullProgress()'));
  expect(opening).toContain('owner.enqueue(animal)');
  const completion = home.slice(home.indexOf('// Play the house-completion'), home.indexOf('const claimableQuestAmber'));
  expect(completion).toContain('introOpening || pendingAnimalIntroCount > 0');
  expect(completion).toContain('introPresentationRef.current.busy()');
  const advance = home.slice(home.indexOf('const handleAdvanceIntroDialogue'), home.indexOf('// Handle closing intro dialogue'));
  expect(advance).toContain('if (!owner.owns(token)) return;');
  expect(advance).toContain('owner.release(token)');
});

it('serializes actual generic close handlers so a second close cannot dismiss the next arrival', async () => {
  const home = fs.readFileSync(path.join(__dirname, '../components/home/HomeScreen.tsx'), 'utf8');
  const source = home.slice(home.indexOf('  const handleCloseIntroDialogue = async () => {'), home.indexOf('  const handleOpenQuestModal'));
  const guard = createIntroPresentationGuard<{ id: string }>(value => value.id);
  let finishSave!: () => void;
  const scope = {
    introSavingRef: { current: false }, introPresentationRef: { current: guard },
    introContext: 'animal_intro', introAnimal: animal('rabbit'),
    setIntroSaving: jest.fn(), setIntroSaveError: jest.fn(),
    markIntroSeen: jest.fn(() => new Promise<void>(resolve => { finishSave = resolve; })),
    setShowIntroDialogue: jest.fn(), setIntroAnimal: jest.fn(),
    setIntroDialogueIndex: jest.fn(), setIntroOverrideLines: jest.fn(),
    setAcquaintanceMemory: jest.fn(), setIntroContext: jest.fn(),
  };
  const close = new Function(...Object.keys(scope), `${source}; return handleCloseIntroDialogue;`)(...Object.values(scope));
  const first = close();
  await close();
  expect(scope.markIntroSeen).toHaveBeenCalledTimes(1);
  expect(guard.busy()).toBe(true);
  guard.enqueue(animal('kakapo'));
  finishSave();
  await first;
  expect(scope.setShowIntroDialogue).toHaveBeenCalledTimes(1);
  expect(guard.take()).toEqual(animal('kakapo'));
  const next = guard.claim();
  await Promise.resolve();
  expect(guard.owns(next)).toBe(true);
});
