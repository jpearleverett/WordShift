export type LaunchIntent = { kind: 'link'; value: string } | { kind: 'notification'; value: unknown };

/** Initial OS payloads survive unmount until delivery. Consumed IDs are shared
 * by all sessions in this process; a live tap uses a fresh ID. */
export function createLaunchIntentQueue(consumed: Set<string>, deliver: (intent: LaunchIntent, isCurrent: () => boolean) => void, canDeliver: (intent: LaunchIntent) => boolean = () => true) {
  let disposed = false;
  let ready = false;
  let deliveryVersion = 0;
  const pending = new Map<string, LaunchIntent>();
  const flush = () => {
    if (disposed || !ready) return;
    // Multiple taps while blocked resolve to the latest destination. Retire
    // the superseded initial payload too, so remount cannot resurrect it.
    const latest = [...pending].filter(([id, intent]) => !consumed.has(id) && canDeliver(intent)).pop();
    if (!latest) return;
    for (const id of pending.keys()) {
      consumed.add(id);
      pending.delete(id);
      if (id === latest[0]) break;
    }
    const version = ++deliveryVersion;
    // Daily routing reads storage before navigating. A later tap can finish
    // first, so an earlier read must not overwrite its chosen destination.
    deliver(latest[1], () => !disposed && deliveryVersion === version);
  };
  return {
    add(id: string, intent: LaunchIntent) {
      if (disposed || consumed.has(id)) return;
      pending.set(id, intent);
      flush();
    },
    setReady(value: boolean) { ready = value; flush(); },
    dispose() { disposed = true; pending.clear(); },
  };
}
