// Shot timeline. A shot owns a time range and returns what to draw at a local
// time: { scene, camera, look }. Transitions between neighbouring shots are
// declared on the incoming shot: { type: 'cut' | 'dissolve' | 'dip' | 'whip', dur }.

export class Timeline {
  constructor(shots) {
    this.shots = shots.slice().sort((a, b) => a.start - b.start);
  }

  /** Active layers at time t: [{ shot, local, weight }], at most two. */
  at(t) {
    const layers = [];
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (t >= s.start && t < s.end) {
        const tr = s.transition;
        const prev = this.shots[i - 1];
        if (tr && prev && tr.type !== 'cut' && t < s.start + tr.dur) {
          const u = (t - s.start) / tr.dur;
          layers.push({ shot: prev, local: t - prev.start, weight: 1 - u, transition: tr, u, role: 'out' });
          layers.push({ shot: s, local: t - s.start, weight: u, transition: tr, u, role: 'in' });
          return layers;
        }
        layers.push({ shot: s, local: t - s.start, weight: 1 });
        return layers;
      }
    }
    const last = this.shots[this.shots.length - 1];
    return [{ shot: last, local: Math.min(t, last.end) - last.start, weight: 1 }];
  }
}
