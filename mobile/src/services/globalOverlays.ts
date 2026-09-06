/** One actionable global overlay at a time. Source state remains parked while
 * another owner is visible; a suspended reward, story or share is not consumed. */
export const GLOBAL_OVERLAYS = [
  'saving', 'navigation', 'ceremony', 'alert', 'story', 'journal', 'share', 'practice',
  'store', 'patron', 'notification', 'dailyLogin', 'victory', 'timeUp',
] as const;
export type GlobalOverlay = typeof GLOBAL_OVERLAYS[number];
export type OverlayRequests = Record<GlobalOverlay, boolean>;

const priority = (owner: GlobalOverlay): number => {
  switch (owner) {
    case 'saving': return 0;
    case 'navigation': return 1;
    case 'ceremony': return 2;
    case 'alert': return 3;
    case 'story': return 4;
    case 'victory': case 'timeUp': return 6;
    default: return 5;
  }
};

export function reconcileOverlayQueue(
  previous: readonly GlobalOverlay[], requested: number,
): GlobalOverlay[] {
  const present = (owner: GlobalOverlay) => (requested & (1 << GLOBAL_OVERLAYS.indexOf(owner))) !== 0;
  const queue = previous.filter(present);
  for (const owner of GLOBAL_OVERLAYS) if (present(owner) && !queue.includes(owner)) queue.push(owner);
  return queue;
}

export function selectOverlayOwner(queue: readonly GlobalOverlay[], eligible: number): GlobalOverlay | null {
  let owner: GlobalOverlay | null = null;
  for (const candidate of queue) {
    if (!(eligible & (1 << GLOBAL_OVERLAYS.indexOf(candidate)))) continue;
    if (owner === null || priority(candidate) < priority(owner)) owner = candidate;
  }
  return owner;
}

export function overlayMask(requests: Partial<OverlayRequests>): number {
  return GLOBAL_OVERLAYS.reduce((mask, owner, index) => requests[owner] ? mask | (1 << index) : mask, 0);
}

export function scheduleGlobalOverlays(previous: readonly GlobalOverlay[], requested: number, eligible: number) {
  const queue = reconcileOverlayQueue(previous, requested);
  const owner = selectOverlayOwner(queue, eligible);
  // Once a dialog becomes visible it keeps its place through temporary
  // ineligibility of an older request. A deferred login becoming eligible
  // must never steal an already-open Store. Critical priorities can still
  // suspend it, and removing that owner restores the same dialog next.
  return { owner, queue: owner ? [owner, ...queue.filter((candidate) => candidate !== owner)] : queue };
}
