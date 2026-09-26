// The trailer's cue sheet (spec section 5), built from the same event table as the
// picture (timeline/events.js) and the bed's measured grid (grid.js), so every
// sound follows the picture if an event moves. audio/score.mjs renders it.
//
//   SCORE = { duration, tune, beds, hits, master }
//
// beds:  the ONE continuous excerpt of home_phase0.mp3. Trailer T plays file time
//        T + GRID.offset (sample-exact), with gain automation (dB), a time-varying
//        low-pass (Hz, log-interpolated, 4th order) and a time-varying vibrato.
// hits:  { at, file | synth, params, db, pan?, rate?, env?, verb?, gate?, pick?, pickEach?,
//          consonance?, sync?, label? }
//        file       a game sound from assets/sounds (the spec 5.3 allowlist only)
//        synth      a voice from audio/synth.mjs
//        db         gain; synth one-shots are normalised to a -6 dBFS peak and ambience
//                   to -20 dBFS RMS, so these read like the game files' own gains
//        env        absolute-time gain automation [[T, dB], ...] on top of `db`
//        rate       playback-rate change (pitch) for a file
//        verb       send to the shared reverb
//        gate       { freq, maxCut } a sustained note steps back while the bed's own
//                   harmony rubs against it (the pad follows the song)
//        pick       { param, from, to } keep only the notes of `param` that sit
//                   consonantly in the bed over [from, to] (the chime, the swell)
//        pickEach   { param } per note of a schedule: keep it, swap it for an `alts`
//                   arpeggio tone, or drop it, by the bed's harmony at that moment
//        consonance report how this note sits against the bed (the music box)
//        tuneToBed  { window, cents } if the bed holds this note, tune onto its partial
//        sync       { event, target, mark } for the beat-sync report. mark: 'onset'
//                   (30% of peak), 'start' (soft attacks that begin on the event), or
//                   'peak' (score.mjs slides the cue so its measured crest lands on target)
// master: amplitude automation [[T, gain], ...] over the whole mix.
//
// Allowed game files (spec 5.3): letter_select, valid_move(_2/_3/_4), star_pop_1/2/3,
// amber_earn, unlock, dialogue, ui_tick, ui_tap, perfect. Nothing else from
// assets/sounds is ever referenced (no *_dark, *_peace, glitch, arrival, phase_change,
// whisper, story_*, pit_devour).

import { E, DURATION } from './timeline/events.js';
import { GRID } from './grid.js';

// ---------------------------------------------------------------------------- pitch
// The bed sits about 5 cents sharp of A440 (measured from its sustained chords),
// so every tuned voice is raised to match.
const TUNE_CENTS = 5;
const T = Math.pow(2, TUNE_CENTS / 1200);
const NOTE = { G3: 196.0, B3: 246.94, D4: 293.66, G4: 392.0, A4: 440.0, B4: 493.88, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.0, 'A#5': 932.33, B5: 987.77, D6: 1174.66, G6: 1567.98, A6: 1760.0, B6: 1975.53, D7: 2349.32, G7: 3135.96, A7: 3520.0, B7: 3951.07 };
const hz = (n) => NOTE[n] * T;

// ---------------------------------------------------------------------------- grid
const { beat: BEAT, bar: BAR, t0Bar1 } = GRID;
const EIGHTH = BEAT / 2, SIXTEENTH = BEAT / 4;
const barT = (n, b = 1, e = 0) => t0Bar1 + (n - 1) * BAR + (b - 1) * BEAT + e * EIGHTH;
/** Bar and beat (1-based) of a trailer time on the grid. */
const beatIndex = (t) => Math.round((t - t0Bar1) / BEAT);

// Stable per-index jitter (no Math.random anywhere in the trailer).
const hash01 = (n) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

const hits = [];
const add = (h) => { hits.push(h); return h; };
/** A cue locked to an event: `event` names the E field in the sync report. */
const at = (event, target, rest, mark = 'onset', offset = 0) => add({ at: target + offset, ...rest, sync: { event, target, mark } });
/** A whoosh whose envelope peak (synth.mjs: sin^2(pi u^shape)) lands on `peak`. */
const whooshAt = (event, peak, { dur, shape = 0.55, db, verb, ...p }) => at(event, peak, { synth: 'whoosh', params: { dur, shape, ...p }, db, verb }, 'peak', -dur * Math.pow(0.5, 1 / shape));

// Where things sit across the frame (house columns: den/aquarium/office/bamboo left).
const COL_PAN = [-0.45, 0, 0.45];

// ============================================================================ the bed
// One continuous excerpt: T = file - GRID.offset. It opens at T 0.96 with a 40 ms
// fade to -5 dB so it "opens" on the first landing (1.00); the tactile SFX lead.
const BED_IN = E.L_LAND - 0.04;
const DUCK = [E.TYPE_START, E.TYPE_END + 0.02]; // Sloane's typing
const OPEN = E.S10;                             // the hit: back outside, full band in 0.12 s
const FADE = [E.WIGGLE, E.END];                 // 38.30 -> 39.00
const bed = {
  file: 'home_phase0.mp3',
  at: BED_IN,
  from: BED_IN + GRID.offset,
  dur: DURATION - BED_IN,
  gain: [
    [BED_IN, -120], [E.L_LAND, -5],
    [E.GEMS, -5], [E.GEMS + 0.3, -3],            // the amber bursts: the bed rides up
    [E.DROP - 0.03, -3], [E.DROP, 0],            // the drop: full
    [DUCK[0] - 0.12, 0], [DUCK[0], -3], [DUCK[1], -3], [DUCK[1] + 0.2, 0],
    // a 1.5 dB breath under each montage landing so the combo chime keeps its attack
    ...E.M_LANDS.flatMap((t) => [[t - 0.01, 0], [t + 0.004, -1.5], [t + 0.12, -1.5], [t + 0.35, 0]]),
    [E.FILTER_IN, 0], [E.FILTER_IN + 0.9, -4],   // the next room
    [OPEN - 0.005, -4], [OPEN + 0.12, 0],        // back outside on the hit
    [E.CLICK - 0.01, 0], [E.CLICK + 0.004, -2], [E.CLICK + 0.15, -2], [E.CLICK + 0.45, 0], // room for the chime
    [FADE[1], 0],                                // (the end fade is the master's)
  ],
  // 18 kHz -> 1.6 kHz over the push into the kitchen, open again on the hit
  lowpass: { order: 4, points: [[E.FILTER_IN, 18000], [E.FILTER_IN + 0.9, 1600], [OPEN, 1600], [OPEN + 0.12, 18000]] },
  // 0.5 Hz / 3 ms wow while the music is "in the next room"; eases out over the last
  // bar of the breath so the hit lands undelayed and in tune
  vibrato: { rate: 0.5, depthMs: 3, amount: [[E.FILTER_IN, 0], [E.FILTER_IN + 0.9, 1], [OPEN - 1.0, 1], [OPEN, 0]] },
  sync: [
    { event: 'bed opens (E.L_LAND - 0.04)', target: E.L_LAND - 0.04 },
    ...Object.entries(GRID.anchors).map(([k, v]) => ({ event: `anchor ${k}`, target: v, file: GRID.anchorsFile[k] })),
  ],
};

// ============================================================================ ambience
// Room tone never drops out: meadow air runs the whole film (inside, it is the air
// through the open front and the windows), crickets take over from birdsong at dusk.
const AIR = -22, BROOK = -26;
add({
  label: 'meadow air', at: 0, synth: 'meadowAir', params: { dur: DURATION + 0.1, seed: 11 }, db: AIR,
  env: [[0, 0], [E.DROP - 0.1, 0], [E.DROP + 0.8, -8], [E.S04, -9], [E.WHIP, -9], [E.S05 + 0.4, -3],
    [E.S07 - 0.05, -3], [E.S07 + 0.05, -9], [E.S09, -9], [E.S09 + 0.9, -1], [E.END, -1]],
});
add({
  label: 'brook', at: 0, synth: 'brook', params: { dur: DURATION + 0.1, seed: 21 }, db: BROOK,
  env: [[0, 0], [E.CRANE, 0], [E.S02 + 0.8, -5], [E.DROP - 0.1, -6], [E.DROP + 0.8, -18], [E.WHIP, -18], [E.S05 + 0.4, -7],
    [E.S07 - 0.05, -7], [E.S07 + 0.05, -30], [E.S09, -30], [E.S09 + 0.9, -6], [E.END, -6]],
});
// birdsong in the golden hour, crickets from the filter (crossfaded by the music box)
add({
  label: 'birdsong', at: E.S06, synth: 'birdsong', params: { dur: E.MUSIC_BOX - E.S06 + 0.1, seed: 41 }, db: -24, verb: 0.35,
  env: [[E.S06, -12], [E.S06 + 0.6, 0], [E.FILTER_IN, 0], [E.MUSIC_BOX + 0.05, -40]],
});
add({
  label: 'crickets', at: E.FILTER_IN, synth: 'crickets', params: { dur: DURATION - E.FILTER_IN + 0.1, seed: 31, count: 6 }, db: -27, verb: 0.3,
  env: [[E.FILTER_IN, -30], [E.MUSIC_BOX + 0.05, 0], [E.S07 - 0.05, 0], [E.S07 + 0.05, -5], [E.S09, -5], [E.S09 + 0.9, 0], [E.PROBABLY - 0.3, 1.5], [E.S10, 1.5], [E.S10 + 0.2, 0], [E.END, 0]],
});

// ============================================================================ S01 the first move
at('E.S01 + 0.03 (frame 1)', E.S01 + 0.03, { file: 'letter_select', db: -4, pan: -0.25 });
at('E.S01 + 0.03 (frame 1)', E.S01 + 0.03, { synth: 'resinClick', params: { pan: -0.25 }, db: -7 });
// the L arcs down-right from PLAY into PANT: whoosh panned left to centre
whooshAt('L mid-flight (E.L_LIFT..E.L_LAND)', (E.L_LIFT + E.L_LAND) / 2 + 0.06, { dur: 0.7, from: 500, to: 2600, q: 1.8, pan: [-0.55, 0], gain: 0.3, seed: 201, shape: 0.9, top: 7000, db: -14 });
at('E.PANT_OPEN', E.PANT_OPEN, { synth: 'slotZip', params: { dur: 0.2, pan: 0.05 }, db: -15 }, 'start');
at('E.L_LAND', E.L_LAND, { file: 'valid_move', db: -3 });
at('E.L_LAND', E.L_LAND, { synth: 'ceramicTock', params: { freq: hz('A6'), pan: 0 }, db: -12 });
at('E.SPROUT', E.SPROUT, { synth: 'sproutPluck', params: { notes: [hz('A5'), hz('D6')], pan: -0.05 }, db: -13, verb: 0.15 });
at('E.L_LOCK', E.L_LOCK, { synth: 'lockTink', params: { freq: hz('G7') }, db: -18 });
at('E.T_LIFT', E.T_LIFT, { file: 'letter_select', db: -6, pan: 0.05 });
at('E.EMBER_TALK', E.EMBER_TALK, { file: 'star_pop_1', db: -14, pan: 0.45 });
whooshAt('T mid-flight (E.T_LIFT..E.T_LAND)', (E.T_LIFT + E.T_LAND) / 2, { dur: 1.15, from: 450, to: 2200, q: 1.8, pan: [0.05, -0.1], gain: 0.3, seed: 202, shape: 1.1, top: 6500, db: -17 });
at('E.HEAR_OPEN', E.HEAR_OPEN, { synth: 'slotZip', params: { dur: 0.2, pan: 0, seed: 122 }, db: -16 }, 'start');
at('E.T_LAND', E.T_LAND, { file: 'valid_move_2', db: -4 });
at('E.T_LAND', E.T_LAND, { synth: 'ceramicTock', params: { freq: hz('B6'), seed: 112 }, db: -13 });
at('E.T_LOCK', E.T_LOCK, { synth: 'lockTink', params: { freq: hz('G7') }, db: -19 });
['star_pop_1', 'star_pop_2', 'star_pop_3'].forEach((f, i) => at(`E.FLASH[${i}]`, E.FLASH[i], { file: f, db: -10 - i * 0.5, pan: 0.1 }));
// the amber bursts from the rack's centre, PLAN unfurls into the blueprint
at('E.GEMS', E.GEMS, { file: 'amber_earn', db: -4 });
at('E.GEMS', E.GEMS, { synth: 'gemShower', params: { count: 40, dur: 1.0, seed: 141 }, db: -12, verb: 0.3 });
at('E.GEMS', E.GEMS, { synth: 'paperUnfurl', params: { dur: 0.45, pan: -0.15 }, db: -16 });

// ============================================================================ S02 words build rooms
// the stream climbs the facade: a long shimmer whoosh panned left to right
whooshAt('stream mid-climb (E.S02..E.BLUEPRINT_LAY)', (E.S02 + E.BLUEPRINT_LAY) / 2, { dur: E.BLUEPRINT_LAY - E.S02 + 0.1, from: 350, to: 2400, q: 1.4, pan: [-0.6, 0.6], gain: 0.3, seed: 203, shape: 1.0, top: 7000, db: -15 });
at('E.S02', E.S02, { synth: 'sparkle', params: { dur: E.BLUEPRINT_LAY - E.S02, count: 16, gain: 0.25, seed: 51, pan: [-0.6, 0.6], front: 1.3 }, db: -16, verb: 0.3 }, 'start');
at('E.BLUEPRINT_LAY + 0.35', E.BLUEPRINT_LAY + 0.35, { synth: 'puff', params: { dur: 0.18, cut: 1100, seed: 272 }, db: -24 });
at('E.BLUEPRINT_LAY + 0.2 (chalk lines draw)', E.BLUEPRINT_LAY + 0.2, { synth: 'chalkScribble', params: { dur: E.GEM_BURST + 0.25 - (E.BLUEPRINT_LAY + 0.2), seed: 161 }, db: -20 }, 'start');
at('E.GEM_BURST', E.GEM_BURST, { synth: 'sparkle', params: { dur: 0.6, count: 18, gain: 0.25, seed: 52, lo: 3000, hi: 6500, front: 1.6 }, db: -15, verb: 0.3 }, 'start');
// the bed's own stop: six dry wooden knocks, one per eighth, the last into the drop
const KNOCK_NOTES = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5'];
E.KNOCKS.forEach((k, i) => at(`E.KNOCKS[${i}]`, k, { synth: 'woodKnock', params: { freq: hz(KNOCK_NOTES[i]), seed: 171 + i, pan: [0, -0.35, 0.35, 0, -0.25, 0.25][i] }, db: -6 }));

// ============================================================================ S03 Gerald
at('E.DROP', E.DROP, { file: 'unlock', db: -6 });
at('E.DROP', E.DROP, { synth: 'boom', params: { dur: 0.8, f0: 70, f1: 38, drop: 0.25, gain: 0.5, click: 0.1 }, db: -10 });
at('E.DROP', E.DROP, { synth: 'unrollSwish', params: { dur: 0.42 }, db: -17 }, 'start');
at('E.DROP + 0.1', E.DROP + 0.1, { synth: 'sparkle', params: { dur: 0.35, count: 9, gain: 0.25, seed: 53, lo: 3200, hi: 6000, pan: [-0.3, 0.1] }, db: -19, verb: 0.35 }, 'start');
at('E.SLOANE_POP', E.SLOANE_POP, { synth: 'puff', params: { dur: 0.2, cut: 1800, seed: 273, pan: 0.1 }, db: -15 });
at('E.SLOANE_POP', E.SLOANE_POP, { synth: 'sparkle', params: { dur: 0.22, count: 7, gain: 0.25, seed: 54, lo: 3000, hi: 6000, pan: [0, 0.2] }, db: -15, verb: 0.25 }, 'start');
// the L drops into the hammock's sag and bounces (a soft cloth pat)
at('E.SLOANE_POP + 0.35', E.SLOANE_POP + 0.35, { synth: 'puff', params: { dur: 0.12, cut: 700, seed: 274, pan: 0.05 }, db: -22 });
at('E.BUBBLE', E.BUBBLE, { file: 'dialogue', db: -6, pan: 0.15 });
// typing: one tick on every third character (25 characters a second)
{
  const text = 'Three moths live in my fur. I call all three Gerald.';
  for (let c = 1; c <= text.length; c += 3) at(`E.TYPE_START + ${c}/25`, E.TYPE_START + c / 25, { file: 'ui_tick', db: -26 + (hash01(c) - 0.5) * 2, pan: 0.2 });
}
// the three Geralds: wing-beat flutters panned with their loops (fire.js makeMoths)
[{ sp: 0.9, ph: 0, rate: 21 }, { sp: 1.13, ph: 2.1, rate: 24 }, { sp: 1.36, ph: 4.2, rate: 19 }].forEach((m, i) => add({
  label: `moth ${i + 1}`, at: E.SLOANE_POP, synth: 'mothFlutter',
  params: { dur: E.S04 - E.SLOANE_POP, seed: 181 + i, rate: m.rate, t0: E.SLOANE_POP, sp: m.sp, ph: m.ph, stop: i === 0 ? E.MOTH_LAND : 1e9 },
  db: -31, env: [[E.SLOANE_POP, -6], [E.SLOANE_POP + 0.3, 0], [E.S04 - 0.1, 0], [E.S04, -30]],
}));
at('E.MOTH_LAND', E.MOTH_LAND, { file: 'star_pop_1', db: -14, pan: 0.1 });

// ============================================================================ S04 over 4,000
// short whooshes into each cut, riding the tile in flight to its landing; the
// landings climb the game's combo ladder
const LADDER = ['valid_move_2', 'valid_move_3', 'valid_move_4'];
E.M_CUTS.forEach((c, i) => {
  const land = E.M_LANDS[i];
  whooshAt(`E.M_CUTS[${i}]`, c, { dur: land - c + 0.14, from: 700, to: 3000, q: 1.8, pan: [0.3, -0.05], gain: 0.3, seed: 210 + i, shape: 0.5, top: 7000, db: -16 });
  at(`E.M_LANDS[${i}]`, land, { file: LADDER[i], db: -2.5 });
  at(`E.M_LANDS[${i}]`, land, { synth: 'ceramicTock', params: { freq: hz(['A6', 'B6', 'D7'][i]), seed: 113 + i }, db: -13 });
});
// the aquarium's bubbles, Axel's happy hop
add({ label: 'aquarium bubbles', at: E.M_CUTS[0], synth: 'waterBubbles', params: { dur: E.M_CUTS[1] - E.M_CUTS[0], rate: 9, seed: 291, pan: -0.2 }, db: -24, env: [[E.M_CUTS[0], 0], [E.M_CUTS[1] - 0.06, 0], [E.M_CUTS[1], -40]] });
// the garden: GLITTER sheds glitter; the perfect chime's tail under it
at('E.M_LANDS[2]', E.M_LANDS[2], { file: 'perfect', db: -12 });
at('E.M_LANDS[2] + 0.02', E.M_LANDS[2] + 0.02, { synth: 'sparkle', params: { dur: 0.8, count: 16, gain: 0.25, seed: 55, lo: 3400, hi: 7000, pan: [-0.4, 0.4] }, db: -17, verb: 0.35 }, 'start');
// the whip into the cast crane: accelerates into the smear
whooshAt('E.S05 (the whip lands)', E.S05, { dur: 0.58, from: 500, to: 3600, q: 1.3, pan: [0.4, -0.4], gain: 0.5, seed: 220, shape: 2.2, top: 8000, db: -9 });

// ============================================================================ S05 animal friends
// a riser (band-passed noise plus a climbing G-major shimmer) into the roof clearing
{
  // the shimmer climbs G4 -> D7 in G-major arpeggio steps, accelerating; each note may
  // swap to a neighbouring arpeggio tone where the bed's chord has no room for it
  const dur = E.ROOF_CLEAR - E.S05 - 0.04;
  const ARP = ['G4', 'B4', 'D5', 'G5', 'B5', 'D6', 'G6', 'B6', 'D7'].map(hz);
  const schedule = Array.from({ length: 18 }, (_, k) => {
    const u = k / 18; const j = Math.min(ARP.length - 1, Math.floor(u * ARP.length));
    return { at: dur * (1 - Math.pow(1 - u, 1.7)) * 0.96, freq: ARP[j], alts: [ARP[j + 1], ARP[j - 1], ARP[j + 2]].filter(Boolean), amp: 0.2 + 0.8 * Math.pow(u, 1.2), pan: (k % 2 ? 0.35 : -0.35) * (0.4 + u) };
  });
  at('E.ROOF_CLEAR (the riser crests, then cuts)', E.ROOF_CLEAR - 0.05, { synth: 'riserShimmer', params: { dur, schedule }, db: -11, verb: 0.35, pickEach: { param: 'schedule' } }, 'peak', -dur);
}
{
  // one readable action per row on sixteenths (cast.js: ACT = bar(9, 1 + row, 1) + col * SIXTEENTH)
  const act = (row, col) => barT(9, 1 + row, 1) + col * SIXTEENTH;
  const pops = [['E.S05 ember heart', 0, 0, 'star_pop_1'], ['E.S05 archimedes thought', 0, 2, 'star_pop_2'], ['E.S05 chill note', 2, 0, 'star_pop_3'], ['E.S05 bamboo sparkle', 3, 0, 'star_pop_1']];
  pops.forEach(([ev, r, c, f]) => at(`${ev} (bar 9.${r + 1}+, col ${c})`, act(r, c), { file: f, db: -16, pan: COL_PAN[c] * 0.8 }));
  at('E.S05 panko steam (row 1, col 1)', act(0, 1), { synth: 'puff', params: { dur: 0.35, cut: 2200, seed: 275 }, db: -26 });
  at('E.S05 axel bubbles (row 2, col 0)', act(1, 0), { synth: 'waterBubbles', params: { dur: 0.45, rate: 12, seed: 292, pan: -0.35 }, db: -27 }, 'start');
  for (let k = 0; k < 3; k++) at(`E.S05 warren dig ${k + 1} (row 3, col 1)`, act(2, 1) + k * 0.13, { synth: 'puff', params: { dur: 0.09, cut: 900, seed: 276 + k }, db: -28 });
  [0, 0.24].forEach((d, k) => at(`E.S05 thyme hop ${k + 1} (row 3, col 2)`, act(2, 2) + d, { synth: 'hopSwish', params: { dur: 0.18, seed: 252 + k, pan: [0.3, 0.4] }, db: -28 }, 'start'));
}
at('E.ROOF_CLEAR', E.ROOF_CLEAR, { synth: 'windChime', params: { notes: [hz('G5'), hz('B5'), hz('D6')], strikes: 8, spread: 0.9, dur: 2.8, seed: 81 }, db: -13, verb: 0.45, pick: { param: 'notes', from: E.ROOF_CLEAR, to: E.ROOF_CLEAR + 0.9 } });

// ============================================================================ S06 where the day goes
// a warm G add9 pad swells under the time-lapse; each voice steps back while the
// bed's own chord rubs against it, so it never clashes with the song
const PAD = [E.S06, E.MUSIC_BOX + 0.2];
['G3', 'B3', 'D4', 'A4', 'D5'].forEach((n, i) => add({
  label: `pad ${n}`, at: PAD[0], synth: 'pad',
  params: { freqs: [hz(n)], dur: PAD[1] - PAD[0], gain: 0.3, cutoff: 1100, attack: 1.3, release: 1.4, seed: 6 + i, wobble: 0.15, pan: [-0.2, 0.2, 0, -0.1, 0.15][i] },
  db: -24 + [0, -1, 0, -2, -4][i], verb: 0.25, gate: { freq: hz(n), maxCut: 18 },
}));
// the camera tips down out of the sky to the hero wide
whooshAt('descent (E.S06 + 0.78..E.LAMPS[0])', (E.S06 + 0.78 + E.LAMPS[0]) / 2, { dur: E.LAMPS[0] - (E.S06 + 0.78), from: 1600, to: 400, q: 1.1, pan: [0.1, -0.1], gain: 0.3, seed: 230, shape: 1.0, top: 5000, db: -24 });
// the lamps switch on one per sixteenth
E.LAMPS.forEach((t, i) => at(`E.LAMPS[${i}]`, t, { file: 'ui_tap', db: -22 + (hash01(i + 40) - 0.5) * 1.5, pan: COL_PAN[i % 3] * 0.7 }));
// the push toward the kitchen, into the cut
whooshAt('E.S07 (push into the cut)', E.S07, { dur: E.S07 - E.PUSH_KITCHEN + 0.12, from: 380, to: 1400, q: 1.0, pan: [0, 0], gain: 0.3, seed: 231, shape: 2.4, top: 3500, db: -24 });

// ============================================================================ the music box (spec 5.2)
// A sine plus a 2.76x partial, in G major, from the next room's point of view it is
// the one thing still in this room. Quarter notes G5 B5 D6 B5 against the bar (G on
// each downbeat), entering on beat 2 of bar 12 (E.MUSIC_BOX). Through S08 it thins
// to beats 1 and 3. It stops at the pull-back (E.S09). Its B5 comes back a semitone
// low exactly once, on the beat of E.JARS_WRONG_NOTE.
const BOX = { G: hz('G5'), B: hz('B5'), D: hz('D6') };
const PATTERN = ['G', 'B', 'D', 'B'];
const BOX_DB = -18;
const wrongBeat = beatIndex(E.JARS_WRONG_NOTE);
for (let k = beatIndex(E.MUSIC_BOX); ; k++) {
  const t = t0Bar1 + k * BEAT;
  if (t >= E.S09 - 0.05) break;
  const beatInBar = ((k % 4) + 4) % 4; // 0 = downbeat
  if (t >= E.S08 - 0.02 && beatInBar % 2 === 1) continue; // sparse in the den
  // in the den the bed turns to C minor under an Eb melody: its D6 on bar 15.3 would
  // rub the Eb, so the thinning box plays G there (a chord tone) and stays innocent
  const n = k === beatIndex(barT(15, 3)) ? 'G' : PATTERN[beatInBar];
  const wrong = k === wrongBeat;
  if (wrong && n !== 'B') throw new Error('the wrong note must fall on a B of the ostinato');
  const freq = wrong ? hz('A#5') : BOX[n];
  // (the wrong note stays on the ostinato's beat; its sync target is the event itself)
  const target = wrong ? E.JARS_WRONG_NOTE : t;
  at(wrong ? 'E.JARS_WRONG_NOTE (A#5, once, on the beat)' : `music box ${n === 'D' ? 'D6' : n + '5'} (bar ${Math.floor(k / 4) + 1}.${beatInBar + 1})`, target,
    { synth: 'musicBox', params: { freq, dur: 2.2, tau: 0.7, pan: 0.18, seed: 71 + (k % 97) }, db: BOX_DB + (beatInBar === 0 ? 0.5 : 0) + (wrong ? 0.5 : 0), verb: 0.4, consonance: true }, 'onset', t - target);
}

// ============================================================================ S07 Panko's jars
// the kitchen: a simmering pot, the oven's small fire, crickets through the window
add({ label: 'kitchen oven', at: E.S07, synth: 'fireCrackle', params: { dur: E.S08 - E.S07 + 0.05, seed: 57, rate: 8, pan: 0.3, width: 0.2 }, db: -30, env: [[E.S07, 0], [E.JARS_AWAY, 0], [E.JARS_AWAY + 0.6, 3], [E.JARS_BACK, 3], [E.JARS_BACK + 0.4, 0], [E.S08 - 0.02, 0], [E.S08, -40]] });
add({
  label: 'pot', at: E.S07, synth: 'potBubble', params: { dur: E.S08 - E.S07 + 0.05, seed: 61, rate: 6, pan: -0.1 }, db: -25,
  env: [[E.S07, -8], [E.JARS_RACK - 0.2, -8], [E.JARS_RACK, 0], [E.JARS_AWAY + 0.3, 0], [E.JARS_AWAY + 1.0, -4], [E.JARS_BACK, -4], [E.JARS_BACK + 0.3, -9], [E.S08 - 0.02, -9], [E.S08, -40]],
});
// two soft glass ticks as the jars pass the lens
at('E.S07 + 1/16', E.S07 + SIXTEENTH, { synth: 'glassTick', params: { freq: hz('A7'), seed: 191, pan: -0.25 }, db: -24, verb: 0.3 });
at('E.S07 + 3/16', E.S07 + 3 * SIXTEENTH, { synth: 'glassTick', params: { freq: hz('B7'), seed: 192, pan: 0.05 }, db: -25, verb: 0.3 });
// stir ticks: the spoon meets the pot at each end of Panko's 1.1 Hz rock (interiors.js)
for (let k = Math.ceil(E.JARS_RACK * 2.2 - 0.5); ; k++) {
  const t = (k + 0.5) / 2.2;
  if (t > E.JARS_AWAY - 0.05) break;
  at(`stir tick (1.1 Hz rock, ${t.toFixed(2)})`, t, { synth: 'woodTap', params: { freq: 720 + (k % 2) * 60, seed: 225 + k, decay: 0.02, pan: -0.15 }, db: -27 });
}
// the camera slides back along the shelf on the groove's return
whooshAt('slide back (E.JARS_BACK + 0.24)', E.JARS_BACK + 0.24, { dur: 0.52, from: 600, to: 1500, q: 1.2, pan: [0.3, -0.3], gain: 0.3, seed: 232, shape: 1.0, top: 4000, db: -27 });
at('E.PANKO_TURN', E.PANKO_TURN, { file: 'star_pop_1', db: -12, pan: -0.1 });

// ============================================================================ S08 the fire draws
add({
  label: 'den fire', at: E.S08, synth: 'fireCrackle', params: { dur: E.S09 + 1.0 - E.S08, seed: 51, rate: 15, pan: -0.1, width: 0.3 }, db: -21,
  env: [[E.S08, 0], [E.EMBER_HEART, 0], [E.S09, -3], [E.S09 + 0.9, -28], [E.S09 + 1.0, -60]],
});
// a soft sparkler fizz follows each stroke (walls and floor, left roof, right roof, door, chimney)
const STROKE_FIZZ = [
  { from: 3000, to: 3500, pan: [-0.35, 0.3] }, { from: 3300, to: 4700, pan: [-0.3, 0] }, { from: 4700, to: 3600, pan: [0, 0.3] },
  { from: 3100, to: 3400, pan: [0.05, 0.05] }, { from: 4000, to: 4800, pan: [0.15, 0.2] },
];
E.STROKES.forEach((s, i) => at(`stroke ${i + 1} starts (E.STROKES[${i}] - 1/8)`, s - EIGHTH, { synth: 'sparklerFizz', params: { dur: EIGHTH * 0.94, ...STROKE_FIZZ[i], seed: 201 + i }, db: -18, verb: 0.3 }, 'start'));
// a reversed bell swell peaks on the drawing's completion
at('E.STROKES[4] (the drawing completes)', E.STROKES[4], { synth: 'reverseSwell', params: { freqs: [hz('G4'), hz('D5'), hz('G5'), hz('B5')], dur: 0.55, gain: 0.4, tail: 0.04 }, db: -21, verb: 0.2, pick: { param: 'freqs', from: E.STROKES[4] - 0.55, to: E.STROKES[4] + 0.2 } }, 'peak', -0.55);
at('E.EMBER_HEART', E.EMBER_HEART, { file: 'star_pop_2', db: -12, pan: 0.3 });

// ============================================================================ S09 when you're away
whooshAt('pull-back (E.S09..E.S09 + 0.9)', E.S09 + 0.4, { dur: 1.0, from: 1900, to: 380, q: 1.2, pan: [-0.2, 0.2], gain: 0.35, seed: 240, shape: 0.8, top: 6000, db: -18 });
// the staggered emote cascade, bottom to top, left to right, one per sixteenth
E.CASCADE.forEach((t, i) => at(`E.CASCADE[${i}]`, t, { file: 'star_pop_1', db: -18, pan: COL_PAN[i % 3] * 0.8, rate: 1 + Math.floor(i / 3) * 0.02 }));
{
  // chatter: the residents talk in turns through the shared walls (ending.js chatter():
  // pairs by row, phases r * 0.37 / +0.5, turns of 0.9-1.2 s). One dialogue blip at each
  // turn a resident starts, in their own column, each voice at its own pitch.
  const blips = [];
  for (let r = 0; r < 4; r++) {
    [{ col: 0, phase: r * 0.37, turn: 0 }, { col: 1, phase: r * 0.37, turn: 1 }, { col: 2, phase: r * 0.37 + 0.5, turn: 0 }].forEach((p, c) => {
      const len = 0.9 + (p.phase % 0.3);
      for (let k = 0; k < 80; k++) {
        const t = k * len - p.phase * 2;
        if ((k + p.turn) % 2 !== 0 || t < E.S09 + 0.95 || t > E.BREATH - 0.2) continue;
        blips.push({ t, r, c, who: r * 3 + c });
      }
    });
  }
  blips.sort((a, b) => a.t - b.t);
  let last = -1;
  for (const b of blips) {
    if (b.t - last < 0.16) continue;
    if (E.CASCADE.some((c) => Math.abs(c - b.t) < 0.04)) continue;
    last = b.t;
    const semis = (hash01(b.who + 90) - 0.5) * 5;
    at(`chatter (row ${b.r + 1}, col ${b.c + 1})`, b.t, { file: 'dialogue', db: -24 + (hash01(b.who) - 0.5) * 2, pan: COL_PAN[b.c] * 0.8, rate: Math.pow(2, semis / 12) });
  }
}
// "Probably.", in the bed's breath: one G5 sags 30 cents and comes back over 0.9 s
at('E.PROBABLY (G5 sags 30 cents)', E.PROBABLY, { synth: 'musicBox', params: { freq: hz('G5'), dur: 3.0, tau: 1.0, sag: -30, sagDur: 0.9, pan: 0.1, seed: 79 }, db: BOX_DB + 1, verb: 0.45, consonance: true, tuneToBed: { window: [E.PROBABLY, E.PROBABLY + 1.0], cents: 25 } });

// ============================================================================ S10 the sign / MOSTLY
at('E.S10', E.S10, { synth: 'signThunk', params: { pan: -0.15 }, db: -3 });
at('E.GLINT', E.GLINT, { synth: 'sparkle', params: { dur: 0.5, count: 12, gain: 0.25, seed: 56, lo: 3600, hi: 7200, pan: [-0.5, 0.5] }, db: -19, verb: 0.35 }, 'start');
at('E.TREMBLE', E.TREMBLE, { synth: 'woodTap', params: { freq: 1250, seed: 221, pan: 0.05 }, db: -20 });
at('E.TREMBLE + 0.035', E.TREMBLE + 0.035, { synth: 'woodTap', params: { freq: 1320, seed: 222, pan: 0.05 }, db: -22 });
at('E.ROCK', E.ROCK, { synth: 'rockTick', params: { seed: 231, pan: 0.05 }, db: -17 });
at('E.FLIP', E.FLIP, { synth: 'flipTock', params: { seed: 241, pan: 0.05, dur: E.HOP - E.FLIP }, db: -13 });
at('E.HOP', E.HOP, { synth: 'hopSwish', params: { dur: E.CLICK - E.HOP, seed: 251, pan: [0.05, 0] }, db: -21 }, 'start');
// the success chime for a move nobody made, on the bed's final hit
at('E.CLICK', E.CLICK, { file: 'valid_move', db: -3 });
at('E.CLICK', E.CLICK, { synth: 'ceramicTock', params: { freq: hz('G6'), seed: 119 }, db: -15 });
// The bed's final chord rings its own G6 (a bell, measured about 15 cents sharp): the
// box note is tuned onto it, so the resolution never beats against the song.
at('E.CLICK (G6, in tune)', E.CLICK, { synth: 'musicBox', params: { freq: hz('G6'), dur: 2.4, tau: 0.9, pan: 0, seed: 80 }, db: BOX_DB + 1, verb: 0.4, consonance: true, tuneToBed: { window: [E.CLICK + 0.05, E.CLICK + 1.25], cents: 30 } });
at('E.WIGGLE', E.WIGGLE, { synth: 'leafRustle', params: { dur: 0.3, seed: 261 }, db: -30 }, 'start');

// ============================================================================ master
// Everything (the bed's tail, the crickets, the air) fades to silence over the last
// 0.7 s, linearly in amplitude, so the last frame can loop to frame 0.
const master = [[0, 1], [FADE[0], 1], [FADE[1], 0]];

export const SCORE = { duration: DURATION, tune: TUNE_CENTS, beds: [bed], hits, master };
