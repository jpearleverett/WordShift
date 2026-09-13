/**
 * Furniture coordinates are measured against the actual 250 × 123.466 room
 * paintings. A deepening can alter an existing object or the room itself; a
 * shop thumbnail is not always a second piece of furniture.
 */
export const ROOM_ART_WIDTH = 250;
export const ROOM_ART_HEIGHT = 123.466;

export type RoomPropKind = 'art' | 'hearthstone' | 'mantel' | 'salt' | 'water'
  | 'floorLamp' | 'shadow' | 'chalk' | 'resonance';
export type RoomPropSurface = 'floor' | 'table' | 'wall' | 'hanging' | 'water';

export interface RoomUpgradeProp {
  id: string;
  kind: RoomPropKind;
  tier: 1 | 2;
  left: number;
  top: number;
  width: number;
  height: number;
  surface: RoomPropSurface;
}

export interface RoomLightSource {
  left: number;
  top: number;
  width: number;
  height: number;
  strength?: number;
}

export interface RoomUpgradeLayout {
  decoration: RoomUpgradeProp[];
  deepening: RoomUpgradeProp[];
  deepeningMode: 'add' | 'replace' | 'effect';
  light: RoomLightSource;
  deepenedLight?: RoomLightSource;
  marks: { left: number; top: number }[];
}

const prop = (
  id: string, tier: 1 | 2, left: number, top: number, width: number,
  height: number, surface: RoomPropSurface, kind: RoomPropKind = 'art',
): RoomUpgradeProp => ({ id, tier, left, top, width, height, surface, kind });

export const ROOM_UPGRADE_LAYOUTS: Record<string, RoomUpgradeLayout> = {
  cozy_den: {
    decoration: [prop('hearthstone', 1, 34, 94, 33, 10, 'floor', 'hearthstone')],
    deepening: [prop('mantel', 2, 10, 35, 68, 17, 'wall', 'mantel')],
    deepeningMode: 'effect',
    light: { left: 21, top: 53, width: 59, height: 53 },
    marks: [{ left: 10, top: 53 }, { left: 11, top: 73 }, { left: 183, top: 74 }, { left: 222, top: 92 }],
  },
  kitchen: {
    decoration: [prop('pot-large', 1, 201, 33, 23, 25, 'hanging'), prop('pot-small', 1, 184, 39, 18, 20, 'hanging')],
    deepening: [prop('salt-circle', 2, 64, 110, 123, 9, 'floor', 'salt')],
    deepeningMode: 'effect',
    light: { left: 206, top: 59, width: 40, height: 37 },
    marks: [{ left: 13, top: 75 }, { left: 45, top: 79 }, { left: 197, top: 85 }, { left: 231, top: 97 }],
  },
  study: {
    decoration: [prop('globe', 1, 141, 49, 27, 28, 'table')],
    deepening: [prop('marginalia', 2, 98, 63, 26, 20, 'table')],
    deepeningMode: 'add',
    light: { left: 133, top: 45, width: 42, height: 38 },
    marks: [{ left: 7, top: 43 }, { left: 8, top: 72 }, { left: 193, top: 68 }, { left: 202, top: 88 }],
  },
  aquarium: {
    decoration: [prop('coral', 1, 184, 82, 29, 33, 'water')],
    deepening: [prop('still-water', 2, 14, 39, 222, 13, 'water', 'water')],
    deepeningMode: 'effect',
    light: { left: 170, top: 73, width: 57, height: 47 },
    marks: [{ left: 30, top: 75 }, { left: 56, top: 92 }, { left: 219, top: 76 }, { left: 211, top: 101 }],
  },
  jungle_room: {
    decoration: [prop('vines', 1, 201, 33, 34, 45, 'hanging')],
    deepening: [prop('inward-bloom-upper', 2, 212, 42, 18, 21, 'hanging'), prop('inward-bloom-lower', 2, 198, 57, 17, 20, 'hanging')],
    deepeningMode: 'effect',
    light: { left: 195, top: 38, width: 45, height: 47 },
    marks: [{ left: 17, top: 46 }, { left: 28, top: 75 }, { left: 201, top: 90 }, { left: 220, top: 98 }],
  },
  desert_room: {
    decoration: [prop('star-map', 1, 199, 37, 31, 28, 'wall')],
    deepening: [prop('new-constellation', 2, 199, 37, 31, 28, 'wall')],
    deepeningMode: 'replace',
    light: { left: 191, top: 31, width: 46, height: 39, strength: 0.65 },
    marks: [{ left: 183, top: 68 }, { left: 217, top: 73 }, { left: 201, top: 90 }, { left: 232, top: 91 }],
  },
  office: {
    decoration: [prop('standing-lamp', 1, 213, 51, 27, 63, 'floor', 'floorLamp')],
    deepening: [prop('second-shadow', 2, 164, 103, 65, 11, 'floor', 'shadow')],
    deepeningMode: 'effect',
    light: { left: 201, top: 44, width: 46, height: 51 },
    marks: [{ left: 11, top: 72 }, { left: 33, top: 81 }, { left: 182, top: 42 }, { left: 188, top: 82 }],
  },
  burrow: {
    decoration: [prop('crystals', 1, 224, 37, 20, 25, 'wall')],
    deepening: [prop('listening-crystals', 2, 221, 32, 23, 30, 'wall')],
    deepeningMode: 'replace',
    light: { left: 211, top: 27, width: 36, height: 43 },
    marks: [{ left: 54, top: 44 }, { left: 60, top: 75 }, { left: 179, top: 41 }, { left: 232, top: 91 }],
  },
  garden: {
    decoration: [prop('chimes', 1, 212, 31, 22, 32, 'hanging')],
    deepening: [prop('tuned-chimes', 2, 212, 31, 22, 32, 'hanging')],
    deepeningMode: 'replace',
    light: { left: 201, top: 29, width: 43, height: 43, strength: 0.6 },
    marks: [{ left: 17, top: 46 }, { left: 27, top: 78 }, { left: 188, top: 74 }, { left: 212, top: 95 }],
  },
  bamboo_attic: {
    decoration: [prop('lantern-right', 1, 212, 45, 23, 30, 'hanging'), prop('lantern-left', 1, 15, 59, 19, 25, 'hanging')],
    deepening: [prop('lantern-right-risen', 2, 212, 18, 23, 30, 'hanging'), prop('lantern-left-risen', 2, 15, 30, 19, 25, 'hanging')],
    deepeningMode: 'replace',
    light: { left: 201, top: 37, width: 43, height: 43 },
    deepenedLight: { left: 201, top: 10, width: 43, height: 43 },
    marks: [{ left: 47, top: 44 }, { left: 54, top: 83 }, { left: 190, top: 61 }, { left: 229, top: 94 }],
  },
  star_loft: {
    decoration: [prop('moth-lantern', 1, 212, 56, 20, 28, 'hanging')],
    deepening: [prop('lit-hour', 2, 212, 56, 20, 28, 'hanging')],
    deepeningMode: 'replace',
    light: { left: 204, top: 49, width: 37, height: 41, strength: 0.25 },
    deepenedLight: { left: 204, top: 49, width: 37, height: 41 },
    marks: [{ left: 14, top: 49 }, { left: 25, top: 80 }, { left: 190, top: 86 }, { left: 223, top: 99 }],
  },
  belfry: {
    decoration: [prop('chalk-rings', 1, 173, 85, 22, 7, 'wall', 'chalk')],
    deepening: [prop('bronze-resonance', 2, 211, 4, 26, 28, 'wall', 'resonance')],
    deepeningMode: 'effect',
    light: { left: 14, top: 14, width: 39, height: 43 },
    marks: [{ left: 15, top: 54 }, { left: 25, top: 77 }, { left: 185, top: 81 }, { left: 222, top: 99 }],
  },
  sky_garden: {
    decoration: [prop('moonflowers', 1, 188, 85, 43, 29, 'floor')],
    deepening: [prop('upturned-blooms-left', 2, 186, 86, 20, 27, 'floor'), prop('upturned-blooms-middle', 2, 201, 84, 20, 29, 'floor'), prop('upturned-blooms-right', 2, 214, 88, 19, 25, 'floor')],
    deepeningMode: 'replace',
    light: { left: 181, top: 75, width: 57, height: 43 },
    marks: [{ left: 19, top: 55 }, { left: 30, top: 83 }, { left: 174, top: 79 }, { left: 222, top: 105 }],
  },
};

export function getRoomUpgradeScene(roomId: string, upgraded: boolean, deepened: boolean) {
  const layout = ROOM_UPGRADE_LAYOUTS[roomId];
  if (!layout || !upgraded) return { props: [] as RoomUpgradeProp[], light: null, marks: [] };
  return {
    props: deepened
      ? [...(layout.deepeningMode === 'replace' ? [] : layout.decoration), ...layout.deepening]
      : layout.decoration,
    light: deepened ? layout.deepenedLight ?? layout.light : layout.light,
    marks: layout.marks,
  };
}
