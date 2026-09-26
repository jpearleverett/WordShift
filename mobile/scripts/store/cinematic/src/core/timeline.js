// Shot timeline. A shot owns a time range and returns what to draw at a time.
// Transitions are declared on the incoming shot: { type: 'cut' | 'dissolve' |
// 'dip' | 'whip', dur }. During [in.start, in.start + dur] both the outgoing
// and incoming shots render (the outgoing shot's `end` must cover that window).

export class Timeline {
  constructor(shots) {
    this.shots = shots.slice().sort((a, b) => a.start - b.start);
  }

  /** Active layers at time t: [{ shot, local, weight }], at most two (outgoing, incoming). */
  at(t) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (t < s.start || t >= s.end) continue;
      const tr = s.transition;
      const prev = this.shots[i - 1];
      if (tr && prev && tr.type !== 'cut' && t < s.start + tr.dur) {
        const u = (t - s.start) / tr.dur;
        return [
          { shot: prev, local: t - prev.start, weight: 1 - u, transition: tr, u, role: 'out' },
          { shot: s, local: t - s.start, weight: u, transition: tr, u, role: 'in' },
        ];
      }
      return [{ shot: s, local: t - s.start, weight: 1 }];
    }
    const last = this.shots[this.shots.length - 1];
    return [{ shot: last, local: Math.min(t, last.end) - last.start, weight: 1 }];
  }
}
