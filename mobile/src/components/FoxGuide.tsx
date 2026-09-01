import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { getDialogueTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { hapticLight } from '../services/haptics';
import { playUiSound } from '../services/uiSound';
import {
  getSkipConfirmText,
  getSkipConfirmStayLabel,
  getSkipConfirmLeaveLabel,
} from '../services/phaseNarrative';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import {
  getPixelSkin,
  CARD_CORNER_DP,
  CARD_EDGE_DP,
  PANEL_CORNER_DP,
  PANEL_EDGE_DP,
  BTN_CAP_DP,
  BTN_MD_DP,
  BTN_SHADOW_DP,
} from '../theme/pixelSkin.generated';
import { NineSliceFrame, ThreeSliceStrip } from './ui/NineSlice';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { FONT_SIZE } from '../theme/typeScale';

// FoxGuide is always a Phase-0 tutorial moment → bright cottage skin.
const FOX_SKIN = getPixelSkin(0);
const FOX_SURFACE = getSurfaceTheme(0);

/** Cottage pixel-bevel button for the FoxGuide footer (accepts a string label). */
const FoxBevelButton: React.FC<{
  label: string;
  onPress?: () => void;
  accessibilityLabel: string;
}> = ({ label, onPress, accessibilityLabel }) => (
  <TouchableOpacity
    style={foxBevelStyles.strip}
    onPress={onPress ? () => { hapticLight(); playUiSound('dialogue'); onPress(); } : undefined}
    activeOpacity={0.85}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
  >
    <ThreeSliceStrip skin={FOX_SKIN.buttons.primary.md.up} capDp={BTN_CAP_DP} />
    <View style={foxBevelStyles.content}>
      <Text style={[foxBevelStyles.label, { color: FOX_SKIN.ink.primary }]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const foxBevelStyles = StyleSheet.create({
  strip: { height: BTN_MD_DP + BTN_SHADOW_DP, minWidth: 112 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: BTN_SHADOW_DP,
  },
  label: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.callout, fontWeight: '800', letterSpacing: 0.4 },
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fox sprites with fallback
let foxTalkSprite: ImageSourcePropType | null = null;
let foxIdleSprite: ImageSourcePropType | null = null;
try {
  foxTalkSprite = require('../../assets/characters/fox/talk.png');
} catch {
  foxTalkSprite = null;
}
try {
  foxIdleSprite = require('../../assets/characters/fox/idle.png');
} catch {
  foxIdleSprite = null;
}

interface FoxGuideProps {
  /** Whether the guide is visible */
  visible: boolean;
  /** The text Fox says */
  text: string;
  /** Button label (defaults to "Next", matching the home dialogue card) */
  buttonText?: string;
  /** Called when the player taps the button */
  onContinue?: () => void;
  /** Position on screen */
  position?: 'bottom' | 'top' | 'middle';
  /** Optional absolute positioning override for context-aware placement */
  anchorStyle?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Whether to show the skip button */
  showSkip?: boolean;
  /** Called when skip is tapped */
  onSkip?: () => void;
  /** Whether Fox should animate (bounce) */
  speaking?: boolean;
  /** Visual variant: 'compact' for floating card, 'dialogue' for HomeScreen-matching dialogue box */
  variant?: 'compact' | 'dialogue';
}

/**
 * FoxGuide — a floating Fox speech bubble overlay used during onboarding.
 * Appears at the bottom (or top) of any screen to guide the player.
 *
 * Both variants share the HomeScreen animal-dialogue card anatomy (accent
 * line, full-height lavender sprite panel, name header + underline, lavender
 * bubble, footer with quiet Skip + solid purple pill) so the tutorial reads
 * as the same app as the home dialogue:
 *
 * variant='dialogue' — full-size card, exact HomeScreen dialogue values
 * variant='compact'  — the same anatomy shrunk down so it never covers the
 *                      board during move-required tutorial steps
 */
export const FoxGuide: React.FC<FoxGuideProps> = ({
  visible,
  text,
  buttonText = 'Next',
  onContinue,
  position = 'bottom',
  anchorStyle,
  showSkip = false,
  onSkip,
  speaking = true,
  variant = 'compact',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const [isTalking, setIsTalking] = useState(false);
  // Two-step skip: the first Skip tap swaps the card to a confirmation (the
  // safe "keep going" gets the prominent pill; the skip is the quiet button),
  // so one stray touch can never silently abandon the guided intro.
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const reducedMotion = getSettingsSync().reducedMotion;
  const hasInteractiveControls = Boolean(onContinue || (showSkip && onSkip));
  // The card renders nothing without text (see the early returns below), so the
  // talk toggle must also key on this — otherwise a visible-but-textless guide
  // would leak a running interval behind a null render.
  const hasText = Boolean(text && text.trim().length > 0);

  // Show/hide animation
  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(visible ? 1 : 0);
      slideAnim.setValue(visible ? 0 : 30);
      return;
    }
    if (visible) {
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Fox bounce when speaking
  useEffect(() => {
    if (reducedMotion || !speaking || !visible) {
      bounceAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, visible]);

  // Talking animation - alternate between idle and talk sprites, mirroring the
  // HomeScreen dialogue portrait (useDialogueFlow): 300ms toggle while the card
  // is showing text; under reduced motion the talk frame is pinned (static, no
  // interval). Deliberately NOT keyed on `text` — line changes within a step
  // keep the toggle running uninterrupted, exactly like paging home dialogue.
  useEffect(() => {
    if (visible && hasText && speaking) {
      if (reducedMotion) {
        setIsTalking(true);
        return;
      }
      const interval = setInterval(() => {
        setIsTalking(prev => !prev);
      }, 300);
      return () => clearInterval(interval);
    } else {
      setIsTalking(false);
    }
  }, [visible, hasText, speaking, reducedMotion]);

  // Animate text changes
  useEffect(() => {
    if (reducedMotion) {
      textFadeAnim.setValue(1);
      return;
    }
    textFadeAnim.setValue(0);
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [text]);

  // A step advance or hide must never strand the skip confirmation — the
  // confirm applies to the moment it was asked in, not to a new line.
  useEffect(() => {
    setConfirmingSkip(false);
  }, [text, visible]);

  if (!visible) return null;
  // Never render an empty shell: with no text Fox has nothing to say, and a
  // bare card (or a lone Skip button in an empty box) reads as a broken overlay.
  if (!text || text.trim().length === 0) return null;

  const displayText = confirmingSkip ? getSkipConfirmText() : text;
  const isTop = position === 'top';
  const isMiddle = position === 'middle';
  const resolvedPositionStyle = anchorStyle || (isTop ? { top: Math.max(80, SCREEN_HEIGHT * 0.12) } : isMiddle ? { top: Math.max(180, SCREEN_HEIGHT * 0.25) } : { bottom: Math.max(30, SCREEN_HEIGHT * 0.04) });

  // Dialogue theme (always Phase 0 during tutorial — every FoxGuide call site
  // is a Phase-0 Fox moment)
  const dt = getDialogueTheme(0);
  const isCompact = variant === 'compact';
  // Idle + talk are PRE-MOUNTED and opacity-switched (never swap one Image's
  // `source` per talk tick — the async re-decode flickers the first cycle, the
  // exact anti-pattern the codebase bans; F29). Mirrors the HomeScreen portrait.
  const hasFoxSprite = Boolean(foxIdleSprite || foxTalkSprite);
  const showTalkFox = Boolean(isTalking && foxTalkSprite);

  return (
    <Animated.View
      style={[
        styles.container,
        resolvedPositionStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: Animated.multiply(slideAnim, isTop ? -1 : 1) }],
        },
      ]}
      // Let puzzle/home interactions pass through when Fox is informational only.
      pointerEvents={hasInteractiveControls ? 'box-none' : 'none'}
      accessibilityRole={isCompact ? 'alert' : undefined}
      accessibilityLabel={isCompact ? `Ember says: ${displayText}` : undefined}
    >
      <View
        style={[
          isCompact ? styles.compactCard : styles.dialogueCard,
          { shadowColor: dt.modalShadowColor },
        ]}
      >
        {/* Cottage wood-and-parchment sheet — matches the HomeScreen animal
            dialogue (replaces the flat webby white card + accent line). The
            full dialogue card uses the panel frame; the compact move-prompt card
            uses the lighter card frame so it stays small over the board. */}
        <NineSliceFrame
          skin={isCompact ? FOX_SKIN.card : FOX_SKIN.panel}
          cornerDp={isCompact ? CARD_CORNER_DP : PANEL_CORNER_DP}
          edgeDp={isCompact ? CARD_EDGE_DP : PANEL_EDGE_DP}
          fillColor={isCompact ? FOX_SKIN.fillCard : FOX_SKIN.fill}
        />

        <View style={styles.cardRow}>
          {/* Sprite alcove — transparent, sits directly on the parchment
              (the accent rail was removed with the home dialogue's). */}
          <View style={isCompact ? styles.compactSpriteCol : styles.dialogueSpriteCol}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
              {hasFoxSprite ? (
                <View
                  style={isCompact ? styles.compactSpriteImage : styles.dialogueSpriteImage}
                  accessibilityLabel="Ember portrait"
                >
                  {foxIdleSprite && (
                    <Image
                      source={foxIdleSprite}
                      style={[styles.foxSpriteLayer, showTalkFox && styles.foxSpriteLayerHidden]}
                      resizeMode="cover"
                    />
                  )}
                  {foxTalkSprite && (
                    <Image
                      source={foxTalkSprite}
                      style={[styles.foxSpriteLayer, !showTalkFox && Boolean(foxIdleSprite) && styles.foxSpriteLayerHidden]}
                      resizeMode="cover"
                    />
                  )}
                </View>
              ) : (
                <Text style={isCompact ? styles.compactSpriteEmoji : styles.dialogueSpriteEmoji}>🦊</Text>
              )}
            </Animated.View>
            {/* Name as a portrait nameplate below the sprite (reclaims the
                wasted header space; the bubble now starts at the top). */}
            <Text numberOfLines={1} style={[isCompact ? styles.compactName : styles.dialogueName, { color: dt.nameColor }]}>Ember</Text>
            <View style={[isCompact ? styles.compactNameSep : styles.dialogueNameSep, { backgroundColor: dt.accentLine }]} />
          </View>

          {/* Text column */}
          <View style={isCompact ? styles.compactTextCol : styles.dialogueTextCol}>

            {/* Speech tray. The full dialogue card nests a parchment card-frame
                bubble (matches the home dialogue); the compact card is itself a
                card frame, so its text sits directly on the parchment to avoid a
                cramped box-in-a-box. */}
            <View style={isCompact ? styles.compactBubble : styles.dialogueBubble}>
              {!isCompact && (
                <NineSliceFrame
                  skin={FOX_SKIN.card}
                  cornerDp={CARD_CORNER_DP}
                  edgeDp={CARD_EDGE_DP}
                  fillColor={FOX_SKIN.fillCard}
                />
              )}
              <Animated.Text
                style={[isCompact ? styles.compactText : styles.dialogueText, { color: FOX_SURFACE.body, opacity: textFadeAnim }]}
              >
                {displayText}
              </Animated.Text>
            </View>

            {/* Footer: quiet Skip + solid purple pill. The footer keeps a
                stable min height even when no pill renders (move-required
                steps advance via the board), so the card never jumps when a
                continue action appears/disappears. While confirming a skip,
                the roles flip: staying is the prominent pill, skipping the
                quiet button — a stray tap resolves to the safe choice. */}
            <View style={isCompact ? styles.compactFooter : styles.dialogueFooter}>
              {confirmingSkip ? (
                <>
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={onSkip ? () => { hapticLight(); playUiSound('selection'); onSkip(); } : undefined}
                    accessibilityLabel="Yes, skip the whole intro"
                    accessibilityRole="button"
                  >
                    <Text style={[isCompact ? styles.compactSkipText : styles.dialogueSkipText, { color: dt.subtitleColor }]}>{getSkipConfirmLeaveLabel()}</Text>
                  </TouchableOpacity>
                  <FoxBevelButton
                    label={getSkipConfirmStayLabel()}
                    onPress={() => setConfirmingSkip(false)}
                    accessibilityLabel="Keep going with the intro"
                  />
                </>
              ) : (
                <>
                  {showSkip && onSkip && (
                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={() => { hapticLight(); playUiSound('selection'); setConfirmingSkip(true); }}
                      accessibilityLabel="Skip intro"
                      accessibilityRole="button"
                    >
                      <Text style={[isCompact ? styles.compactSkipText : styles.dialogueSkipText, { color: dt.subtitleColor }]}>Skip</Text>
                    </TouchableOpacity>
                  )}
                  {onContinue && (
                    <FoxBevelButton
                      label={buttonText}
                      onPress={onContinue}
                      accessibilityLabel={buttonText}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // ---- Shared container ----
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9000,
    paddingHorizontal: 16,
  },
  // Shared card anatomy (values copied from HomeScreen's dialogue modal)
  accentLine: {
    height: 3,
    width: '100%',
  },
  cardRow: {
    flexDirection: 'row',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  // ---- Dialogue variant (cottage wood-and-parchment sheet) ----
  // The pixel frame owns the edge — no borderRadius/borderWidth. Content clears
  // the panel wood band via the card padding below.
  dialogueCard: {
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    paddingTop: PANEL_EDGE_DP - 8,
    paddingLeft: SURFACE.panelPadX,
    paddingRight: SURFACE.panelPadX,
    paddingBottom: PANEL_EDGE_DP - 12,
  },
  // Sprite column - 30% width, zoomed in to fill (transparent — parchment shows)
  dialogueSpriteCol: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dialogueSpriteImage: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.48,
  },
  // Pre-mounted idle/talk stack (F29): absolute layers with EXPLICIT 100% size
  // (an inset-only Image collapses to intrinsic size on Fabric).
  foxSpriteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  foxSpriteLayerHidden: {
    opacity: 0,
  },
  dialogueSpriteEmoji: {
    fontFamily: BODY_FONT,
    fontSize: Math.min(80, SCREEN_WIDTH * 0.2),
  },
  // HomeScreen dialogueTextCol uses paddingBottom 34 because it is a bottom
  // sheet clearing the home indicator; this is a floating card, so the bottom
  // padding stays symmetric with the top instead.
  dialogueTextCol: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 6,
    // Inner gutter, NOT frame clearance (the bubble owns a card frame + its own
    // cardPadX). Compensates dialogueCard's rise to panelPadX so the cold-open
    // copy does not lose a character per line on the narrowest card in the game.
    paddingHorizontal: 6,
  },
  // Portrait nameplate below the sprite, centered in the alcove.
  dialogueName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 3,
  },
  dialogueNameSep: {
    height: 2,
    width: 26,
    borderRadius: 1,
    opacity: 0.5,
    alignSelf: 'center',
  },
  // Cottage parchment tray (NineSliceFrame card); clear the 12dp wood band.
  dialogueBubble: {
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 16,
    marginBottom: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  dialogueText: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.callout,
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  dialogueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    // Stable footer height (matches the cottage bevel strip) so the card
    // never jumps when the continue button appears/disappears.
    minHeight: BTN_MD_DP + BTN_SHADOW_DP,
  },
  dialogueSkipText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '600',
  },

  // ---- Compact variant: the same anatomy shrunk down (move-required steps,
  // must not cover the board). Uses the lighter CARD frame so it stays small;
  // content clears the 12dp card wood band via the padding below. ----
  compactCard: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    paddingVertical: CARD_EDGE_DP - 6,
    paddingHorizontal: SURFACE.cardPadX,
  },
  compactSpriteCol: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Same 3:4 crop-to-fill treatment as the dialogue sprite, smaller.
  compactSpriteImage: {
    width: 86,
    height: 114,
  },
  compactSpriteEmoji: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.giant,
  },
  compactTextCol: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 2,
    // Inner gutter; compensates compactCard's rise to cardPadX.
    paddingHorizontal: 4,
  },
  compactName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  compactNameSep: {
    height: 2,
    width: 20,
    borderRadius: 1,
    opacity: 0.5,
    alignSelf: 'center',
  },
  // Text sits directly on the card-frame parchment (no nested bubble), so only
  // light inner spacing is needed above the footer.
  compactBubble: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    marginBottom: 8,
    justifyContent: 'center',
  },
  compactText: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.bodyLg,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    // Stable footer height (cottage bevel strip) so move-required steps that
    // show only Skip don't make the card jump when a button appears.
    minHeight: BTN_MD_DP + BTN_SHADOW_DP,
  },
  compactSkipText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: 0.4,
  },
});

export default FoxGuide;
