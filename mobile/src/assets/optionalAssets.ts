import { ImageSourcePropType } from 'react-native';
import { AnimalType, RoomTheme } from '../types/homeWorld';

export interface CharacterSpriteSet {
  idle: ImageSourcePropType;
  talk?: ImageSourcePropType;
  robed?: ImageSourcePropType;
}

/**
 * Optional asset manifest.
 *
 * Keep these maps empty when running without the PNG bundle so the app falls
 * back to emoji/styled visuals. When image assets are available, wire them in
 * here (or generate this file) with static require(...) entries.
 */
export const OPTIONAL_CHARACTER_SPRITES: Partial<Record<AnimalType, CharacterSpriteSet>> = {};

export const OPTIONAL_ROOM_BACKGROUNDS: Partial<Record<RoomTheme, ImageSourcePropType>> = {};

export const OPTIONAL_ENVIRONMENT_SKIES: Partial<Record<'day' | 'dusk' | 'storm' | 'shadow', ImageSourcePropType>> = {};

export const OPTIONAL_FOX_GUIDE_SPRITES: {
  idle?: ImageSourcePropType;
  talk?: ImageSourcePropType;
} = {};
