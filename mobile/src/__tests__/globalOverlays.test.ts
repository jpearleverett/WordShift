import { GlobalOverlay, overlayMask, reconcileOverlayQueue, selectOverlayOwner, scheduleGlobalOverlays } from '../services/globalOverlays';
import { createLaunchIntentQueue } from '../services/launchIntentQueue';

test('an earned daily reward waits behind Store and returns after it closes', () => {
  let queue = reconcileOverlayQueue([], overlayMask({ store: true }));
  queue = reconcileOverlayQueue(queue, overlayMask({ store: true, dailyLogin: true }));
  expect(selectOverlayOwner(queue, overlayMask({ store: true, dailyLogin: true }))).toBe('store');
  queue = reconcileOverlayQueue(queue, overlayMask({ dailyLogin: true }));
  expect(selectOverlayOwner(queue, overlayMask({ dailyLogin: true }))).toBe('dailyLogin');
});

test('daily eligibility does not block a queued dialog away from quiet home', () => {
  const queue = reconcileOverlayQueue(['dailyLogin'], overlayMask({ dailyLogin: true, journal: true }));
  expect(selectOverlayOwner(queue, overlayMask({ journal: true }))).toBe('journal');
});

test('a deferred older reward becoming eligible cannot steal an already-visible Store', () => {
  const requested = overlayMask({ dailyLogin: true, store: true });
  const store = scheduleGlobalOverlays(['dailyLogin'], requested, overlayMask({ store: true }));
  expect(store.owner).toBe('store');
  const quietHome = scheduleGlobalOverlays(store.queue, requested, requested);
  expect(quietHome.owner).toBe('store');
  const ceremony = scheduleGlobalOverlays(quietHome.queue, requested | overlayMask({ ceremony: true }), requested | overlayMask({ ceremony: true }));
  expect(ceremony.owner).toBe('ceremony');
  expect(scheduleGlobalOverlays(ceremony.queue, requested, requested).owner).toBe('store');
});

test('save recovery and ceremonies suspend dialogs without consuming their queue position', () => {
  const requests = overlayMask({ saving: true, ceremony: true, alert: true, store: true, dailyLogin: true });
  const queue = reconcileOverlayQueue(['store', 'dailyLogin'], requests);
  expect(selectOverlayOwner(queue, requests)).toBe('saving');
  expect(selectOverlayOwner(queue, overlayMask({ ceremony: true, alert: true, store: true, dailyLogin: true }))).toBe('ceremony');
  expect(selectOverlayOwner(queue, overlayMask({ alert: true, store: true, dailyLogin: true }))).toBe('alert');
  expect(selectOverlayOwner(queue, overlayMask({ store: true, dailyLogin: true }))).toBe('store');
  expect(queue.slice(0, 2)).toEqual(['store', 'dailyLogin']);
});

test('a share preview owns the victory controls until it closes', () => {
  const queue: GlobalOverlay[] = ['victory', 'share'];
  expect(selectOverlayOwner(queue, overlayMask({ victory: true, share: true }))).toBe('share');
  expect(selectOverlayOwner(queue, overlayMask({ victory: true }))).toBe('victory');
});

test('victory yields to the unlock introduction before the requested exit continues', () => {
  const victoryRequest = overlayMask({ victory: true });
  const victory = scheduleGlobalOverlays([], victoryRequest, victoryRequest);
  expect(victory.owner).toBe('victory');

  // Even while the completed board is still WON, the introduction must own
  // input. Its parked exit will eventually replace the board or navigate away.
  const introRequest = overlayMask({ victory: true, postVictoryIntro: true });
  const introduction = scheduleGlobalOverlays(victory.queue, introRequest, introRequest);
  expect(introduction.owner).toBe('postVictoryIntro');

  const introOnly = overlayMask({ postVictoryIntro: true });
  const resultDismissed = scheduleGlobalOverlays(introduction.queue, introOnly, introOnly);
  expect(resultDismissed.owner).toBe('postVictoryIntro');
  expect(resultDismissed.queue).not.toContain('victory');
  expect(scheduleGlobalOverlays(resultDismissed.queue, 0, 0)).toEqual({ owner: null, queue: [] });
});

test.each<GlobalOverlay>(['saving', 'navigation', 'ceremony', 'alert'])(
  '%s suspends the unlock introduction and restores it before other dialogs',
  blocker => {
    const requests = overlayMask({ postVictoryIntro: true, story: true, store: true, dailyLogin: true });
    const introduction = scheduleGlobalOverlays(['store', 'dailyLogin'], requests, requests);
    expect(introduction.owner).toBe('postVictoryIntro');

    const blocked = requests | overlayMask({ [blocker]: true });
    const suspended = scheduleGlobalOverlays(introduction.queue, blocked, blocked);
    expect(suspended.owner).toBe(blocker);
    expect(suspended.queue).toContain('postVictoryIntro');

    const resumed = scheduleGlobalOverlays(suspended.queue, requests, requests);
    expect(resumed.owner).toBe('postVictoryIntro');
    expect(resumed.queue).toContain('story');
    expect(resumed.queue).toContain('store');
  },
);

test('acknowledging an unlock hands off to the saved story before an older Store request', () => {
  const requests = overlayMask({ postVictoryIntro: true, story: true, store: true });
  const introduction = scheduleGlobalOverlays(['store'], requests, requests);
  expect(introduction.owner).toBe('postVictoryIntro');

  const afterIntro = overlayMask({ story: true, store: true });
  const story = scheduleGlobalOverlays(introduction.queue, afterIntro, afterIntro);
  expect(story.owner).toBe('story');
  expect(story.queue).not.toContain('postVictoryIntro');

  const afterStory = overlayMask({ store: true });
  expect(scheduleGlobalOverlays(story.queue, afterStory, afterStory).owner).toBe('store');
});

test('navigation covers a pending ceremony and the ceremony starts after the screen is ready', () => {
  const queue = reconcileOverlayQueue([], overlayMask({ navigation: true, ceremony: true, alert: true }));
  expect(selectOverlayOwner(queue, overlayMask({ navigation: true, ceremony: true, alert: true }))).toBe('navigation');
  expect(selectOverlayOwner(queue, overlayMask({ ceremony: true, alert: true }))).toBe('ceremony');
});

test('Store to Patron is an explicit handoff; closed requests are removed and can be reopened', () => {
  const queue = reconcileOverlayQueue(['store'], overlayMask({ patron: true }));
  expect(queue).toEqual(['patron']);
  expect(reconcileOverlayQueue(queue, overlayMask({ patron: true, store: true }))).toEqual(['patron', 'store']);
});

test('launch payload waits for hydration and modal dismissal instead of an elapsed timer', () => {
  const deliver = jest.fn();
  const session = createLaunchIntentQueue(new Set(), deliver);
  session.add('launch-url', { kind: 'link', value: 'wordshift://challenge/daily' });
  session.setReady(false);
  expect(deliver).not.toHaveBeenCalled();
  session.setReady(true);
  expect(deliver).toHaveBeenCalledTimes(1);
  session.setReady(false); session.setReady(true);
  expect(deliver).toHaveBeenCalledTimes(1);
});

test('unmount before delivery does not burn the launch intent for the replacement session', () => {
  const consumed = new Set<string>();
  const deliver = jest.fn();
  const first = createLaunchIntentQueue(consumed, deliver);
  first.add('launch-url', { kind: 'link', value: 'saved-link' });
  first.dispose(); first.setReady(true);
  first.add('late-network-response', { kind: 'notification', value: 'home' });
  expect(deliver).not.toHaveBeenCalled();
  const second = createLaunchIntentQueue(consumed, deliver);
  second.add('launch-url', { kind: 'link', value: 'saved-link' });
  second.setReady(true);
  second.add('launch-url', { kind: 'link', value: 'saved-link' });
  expect(deliver).toHaveBeenCalledTimes(1);
});

test('the latest explicit tap wins when several destinations arrive behind a blocking scene', () => {
  const deliver = jest.fn();
  const consumed = new Set<string>();
  const session = createLaunchIntentQueue(consumed, deliver);
  session.add('first', { kind: 'link', value: 'old-link' });
  session.add('last', { kind: 'notification', value: 'home' });
  session.setReady(true);
  expect(deliver).toHaveBeenCalledWith({ kind: 'notification', value: 'home' }, expect.any(Function));
  expect(deliver).toHaveBeenCalledTimes(1);
  expect(consumed.has('first')).toBe(true);
});

test('a normal challenge stays queued during onboarding and opens after completion', () => {
  const deliver = jest.fn();
  let onboarding = true;
  const session = createLaunchIntentQueue(new Set(), deliver, (intent) => !onboarding || (intent.kind === 'link' && intent.value.startsWith('wordshift://creator')));
  session.setReady(true);
  session.add('launch-url', { kind: 'link', value: 'wordshift://challenge/daily' });
  expect(deliver).not.toHaveBeenCalled();
  onboarding = false;
  session.setReady(true);
  expect(deliver).toHaveBeenCalledWith({ kind: 'link', value: 'wordshift://challenge/daily' }, expect.any(Function));
});

test('an older eligible creator link does not consume a newer onboarding-blocked destination', () => {
  const deliver = jest.fn();
  const consumed = new Set<string>();
  let onboarding = true;
  const session = createLaunchIntentQueue(consumed, deliver, intent => !onboarding || intent.value === 'creator');
  session.add('creator-first', { kind: 'link', value: 'creator' });
  session.add('daily-later', { kind: 'notification', value: 'daily' });
  session.setReady(true);
  expect(deliver).toHaveBeenLastCalledWith({ kind: 'link', value: 'creator' }, expect.any(Function));
  expect(consumed.has('daily-later')).toBe(false);
  onboarding = false;
  session.setReady(true);
  expect(deliver).toHaveBeenLastCalledWith({ kind: 'notification', value: 'daily' }, expect.any(Function));
  expect(deliver).toHaveBeenCalledTimes(2);
});

test('a deferred daily read cannot navigate over a newer tap or a disposed session', async () => {
  const routes: unknown[] = [];
  const pending: (() => void)[] = [];
  const session = createLaunchIntentQueue(new Set(), (intent, isCurrent) => {
    if (intent.value === 'daily') {
      const read = new Promise<void>(resolve => pending.push(resolve));
      void read.then(() => { if (isCurrent()) routes.push(intent.value); });
    } else if (isCurrent()) routes.push(intent.value);
  });
  session.setReady(true);
  session.add('daily-first', { kind: 'notification', value: 'daily' });
  session.add('home-later', { kind: 'notification', value: 'home' });
  pending.shift()?.();
  await Promise.resolve();
  expect(routes).toEqual(['home']);
  session.add('daily-again', { kind: 'notification', value: 'daily' });
  session.dispose();
  pending.shift()?.();
  await Promise.resolve();
  expect(routes).toEqual(['home']);
});
