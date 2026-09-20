import { SURFACE } from '../theme/surfaces';

/** Explicit native dimensions keep an image's 960 × 540 asset size out of layout. */
export function getStorySceneLayout(width: number, height: number, top: number, bottom: number, fontScale = 1) {
  const cardWidth = Math.max(1, Math.min(560, width - 32));
  const cardMaxHeight = Math.max(1, height - top - bottom - 32);
  const contentWidth = Math.max(1, cardWidth - SURFACE.panelPadX * 2);
  const scrollMaxHeight = Math.max(1, cardMaxHeight - SURFACE.panelPadY * 2);
  // The picture is a compact illustration above the conversation. Give text
  // more room on short screens and when the player's reading scale is larger.
  const artHeight = Math.min(contentWidth * 9 / 16,
    Math.max(48, Math.min(136, scrollMaxHeight * 0.2) / Math.max(1, fontScale)));
  return {
    cardWidth, cardMaxHeight, scrollMaxHeight,
    artWidth: artHeight * 16 / 9, artHeight,
    portraitSize: scrollMaxHeight < 560 || fontScale > 1.3 ? 48 : 56,
  };
}
