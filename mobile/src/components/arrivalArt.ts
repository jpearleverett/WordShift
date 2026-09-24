import { ImageSourcePropType } from 'react-native';
import type { ArrivalImage, MorningImage } from '../services/phaseEvents';

/**
 * The Arrival and the Morning After, one painting per beat (generated with the
 * story pages' style and the in-game entity as the creature's reference; the
 * prompts are recorded in assets/raw/ARRIVAL_ART_PROMPTS.json). Static
 * requires keep every image offline.
 */
export const ARRIVAL_ART: Record<ArrivalImage | MorningImage, ImageSourcePropType> = {
  arrival_table: require('../../assets/story/arrival/arrival_table.webp'),
  arrival_call: require('../../assets/story/arrival/arrival_call.webp'),
  arrival_house: require('../../assets/story/arrival/arrival_house.webp'),
  arrival_seam: require('../../assets/story/arrival/arrival_seam.webp'),
  arrival_descent: require('../../assets/story/arrival/arrival_descent.webp'),
  arrival_hold: require('../../assets/story/arrival/arrival_hold.webp'),
  arrival_rooms: require('../../assets/story/arrival/arrival_rooms.webp'),
  arrival_door: require('../../assets/story/arrival/arrival_door.webp'),
  arrival_gate: require('../../assets/story/arrival/arrival_gate.webp'),
  arrival_bell: require('../../assets/story/arrival/arrival_bell.webp'),
  arrival_settle: require('../../assets/story/arrival/arrival_settle.webp'),
  morning_house: require('../../assets/story/arrival/morning_house.webp'),
  morning_door: require('../../assets/story/arrival/morning_door.webp'),
  morning_road: require('../../assets/story/arrival/morning_road.webp'),
  morning_kitchen: require('../../assets/story/arrival/morning_kitchen.webp'),
  morning_table: require('../../assets/story/arrival/morning_table.webp'),
  morning_window: require('../../assets/story/arrival/morning_window.webp'),
};

/** The in-game entity (entity_back + entity_eyes), head and arms, transparent. */
export const ENTITY_FIGURE = require('../../assets/story/arrival/entity_figure.png');
export const ENTITY_FIGURE_ASPECT = 1035 / 760;
