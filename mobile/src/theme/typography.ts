import { TextStyle } from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from './fonts';
import { FONT_SIZE } from './typeScale';

/** Reading roles belong to flexible, scrollable surfaces; tile geometry stays separate. */
export const TEXT_ROLE = {
  body: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.large, lineHeight: 25 },
  reading: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.title, lineHeight: 29 },
  caption: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.bodyLg, lineHeight: 21 },
  label: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.large, lineHeight: 24 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.display, lineHeight: 32 },
} satisfies Record<string, TextStyle>;

export type TextRole = keyof typeof TEXT_ROLE;

/** 0 means the complete OS reading scale, without the legacy chrome ceiling. */
export const READING_MAX_FONT_SCALE = 0;
export const CONTROL_MAX_FONT_SCALE = 2;
