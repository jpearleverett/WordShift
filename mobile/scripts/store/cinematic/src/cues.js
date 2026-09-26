// Placeholder cue sheet (replaced by the real one with the timeline).
export const SCORE = {
  duration: 8,
  beds: [
    { file: 'home_phase0.mp3', from: 96.2, at: 0, dur: 8, gain: [[0, -30], [0.5, -9], [6, -9], [8, -60]], lowpass: [[0, 20000], [4, 20000], [6, 1600]] },
  ],
  hits: [
    { at: 0.05, file: 'letter_select', db: -4 },
    { at: 1.0, synth: 'whoosh', params: { dur: 0.9, from: 300, to: 4000 }, db: -6 },
    { at: 2.0, synth: 'clack', params: { pitch: 1 }, db: -3, verb: 0.3 },
    { at: 3.0, synth: 'boom', params: {}, db: -4, verb: 0.4 },
    { at: 4.0, synth: 'bell', params: { freq: 783.99 }, db: -8, verb: 0.6 },
    { at: 4.5, synth: 'sparkle', params: {}, db: -10, verb: 0.5 },
    { at: 5.0, synth: 'riser', params: { dur: 2 }, db: -8 },
    { at: 7.0, synth: 'reverseSwell', params: { dur: 1 }, db: -8 },
  ],
};
