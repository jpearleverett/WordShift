// Positions two shots must agree on across a continuous hand-off.

/** Ember's spot in the den (fraction of the room's painting width) through S08 and the start of S09 (spec 3.2: u 0.40). */
export const EMBER_DEN_U = 0.40;

/** Ember's room-local x in the den (the same convention as world.residents' x0). */
export const emberDenX = (rm) => -rm.roomW / 2 + rm.roomW * EMBER_DEN_U;
