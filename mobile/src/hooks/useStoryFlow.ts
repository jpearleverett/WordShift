import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceStoryPage, chooseStoryOption, openStoryScene,
  StoryContext, StoryMemory,
} from '../services/storySpine';
import { logStoryEvent } from '../services/storyTelemetry';

/** A saved conversation owns one exit action, including through cinematic transitions. */
export function useStoryFlow(getContext: () => Promise<StoryContext>, enabled: boolean) {
  const [active, setActive] = useState<{ context: StoryContext; memory: StoryMemory } | null>(null);
  const [journalContext, setJournalContext] = useState<StoryContext | null>(null);
  const prepared = useRef<typeof active>(null);
  const preparing = useRef<Promise<boolean> | null>(null);
  const exitAction = useRef<(() => void) | null>(null);
  const operation = useRef(false);
  const epoch = useRef(0);
  const journalRequest = useRef(0);
  const readingStarted = useRef<number | null>(null);

  const prepare = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;
    if (preparing.current) return preparing.current;
    if (prepared.current) return true;
    const started = epoch.current;
    const request = (async () => {
      const context = await getContext();
      if (started !== epoch.current) return false;
      const result = await openStoryScene(context);
      if (started !== epoch.current) return false;
      prepared.current = result ? { context, memory: result.memory } : null;
      return !!result;
    })();
    preparing.current = request;
    try { return await request; } finally { if (preparing.current === request) preparing.current = null; }
  }, [enabled, getContext]);

  const run = useCallback((action: () => void) => {
    const pending = prepared.current;
    if (!pending) { action(); return; }
    exitAction.current = action;
    readingStarted.current = Date.now();
    logStoryEvent('story_started', pending.context, pending.memory);
    setActive(pending);
  }, []);

  const close = useCallback(() => {
    if (operation.current) return;
    const action = exitAction.current;
    if (readingStarted.current !== null && prepared.current) {
      logStoryEvent('story_deferred', prepared.current.context, prepared.current.memory,
        { elapsedMs: Math.max(0, Date.now() - readingStarted.current) });
    }
    readingStarted.current = null;
    exitAction.current = null;
    prepared.current = null;
    setActive(null);
    action?.();
  }, []);

  const save = useCallback(async (choice?: string) => {
    if (!active || operation.current) return;
    operation.current = true;
    const started = epoch.current;
    try {
      const state = choice === undefined
        ? await advanceStoryPage(active.context, active.memory.scene.id)
        : await chooseStoryOption(active.context, active.memory.scene.id, choice);
      if (started !== epoch.current) return;
      const memory = state.memories[active.memory.scene.id];
      if (choice !== undefined && memory?.choice === choice && !active.memory.choice) {
        logStoryEvent('story_choice', active.context, memory, { choiceId: choice });
      }
      if (memory?.completed) {
        logStoryEvent('story_completed', active.context, memory,
          { elapsedMs: Math.max(0, Date.now() - (readingStarted.current ?? Date.now())) });
        readingStarted.current = null;
        operation.current = false;
        close();
      } else if (memory) {
        const next = { context: active.context, memory };
        prepared.current = next;
        setActive(next);
      }
    } finally { if (started === epoch.current) operation.current = false; }
  }, [active, close]);

  const openJournal = useCallback(async () => {
    const started = epoch.current;
    const request = ++journalRequest.current;
    const context = await getContext();
    if (started === epoch.current && request === journalRequest.current) setJournalContext(context);
  }, [getContext]);
  const closeJournal = useCallback(() => {
    journalRequest.current += 1;
    setJournalContext(null);
  }, []);
  const resume = useCallback(async () => {
    setJournalContext(null);
    if (await prepare()) {
      if (prepared.current) logStoryEvent('story_resumed', prepared.current.context, prepared.current.memory);
      run(() => {});
    }
  }, [prepare, run]);
  const reset = useCallback(() => {
    epoch.current += 1;
    journalRequest.current += 1;
    operation.current = false;
    readingStarted.current = null;
    prepared.current = null;
    preparing.current = null;
    exitAction.current = null;
    setActive(null);
    setJournalContext(null);
  }, []);

  useEffect(() => () => {
    epoch.current += 1;
    exitAction.current = null;
    prepared.current = null;
  }, []);

  return {
    active, journalContext, prepare, run, close, reset, openJournal, closeJournal, resume,
    advance: useCallback(() => save(), [save]),
    choose: useCallback((choice: string) => save(choice), [save]),
  };
}
