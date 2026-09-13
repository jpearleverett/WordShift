/** Own a reading from its first storage await until dismissal, with queued arrivals. */
export function createIntroPresentationGuard<T>(key: (value: T) => string) {
  let serial = 0;
  let active: number | null = null;
  const pending = new Map<string, T>();
  return {
    claim(): number | null {
      if (active !== null) return null;
      active = ++serial;
      return active;
    },
    current(): number | null { return active; },
    owns(token: number | null): boolean { return token !== null && active === token; },
    busy(): boolean { return active !== null; },
    release(token: number | null): boolean {
      if (token === null || active !== token) return false;
      active = null;
      return true;
    },
    enqueue(value: T): number {
      pending.set(key(value), value);
      return pending.size;
    },
    take(): T | null {
      if (active !== null) return null;
      const next = pending.entries().next();
      if (next.done) return null;
      pending.delete(next.value[0]);
      return next.value[1];
    },
    pendingCount(): number { return pending.size; },
    invalidate(): void {
      active = null;
      pending.clear();
      serial += 1;
    },
  };
}
