import { useState } from 'react';
import { GlobalOverlay, OverlayRequests, overlayMask, reconcileOverlayQueue, scheduleGlobalOverlays } from '../services/globalOverlays';

export function useGlobalOverlays(requests: OverlayRequests, eligibility: Partial<OverlayRequests> = {}) {
  const requested = overlayMask(requests);
  const eligible = overlayMask({ ...requests, ...eligibility });
  const [snapshot, setSnapshot] = useState<{ requested: number; queue: GlobalOverlay[] }>(() => ({ requested, queue: reconcileOverlayQueue([], requested) }));
  // Derive immediately so two requests in one React commit cannot briefly
  // mount two native Modals while waiting for an effect to reconcile them.
  const current = scheduleGlobalOverlays(snapshot.queue, requested, eligible);
  if (snapshot.requested !== requested || snapshot.queue.join(',') !== current.queue.join(',')) {
    setSnapshot({ requested, queue: current.queue });
  }
  return current.owner;
}
