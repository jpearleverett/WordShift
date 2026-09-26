// Shot modules in timeline order. Each module owns its time range (see ARCHITECTURE.md).
import oner from './oner.js';
import montage from './montage.js';
import cast from './cast.js';
import interiors from './interiors.js';
import ending from './ending.js';

export const SHOT_MAKERS = [oner, montage, cast, interiors, ending];
