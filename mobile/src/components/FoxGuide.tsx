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
import {
  getSkipConfirmText,
  getSkipConfirmStayLabel,
  getSkipConfirmLeaveLabel,
} from '../services/phaseNarrative';
import { getSurfaceTheme } from '../theme/surfaces';
import {
  getPixelSkin,
  CARD_CORNER_DP,
  CARD_EDGE_DP,
  BTN_CAP_DP,
  BTN_MD_DP,
  BTN_SHADOW_DP,
} from '../theme/pixelSkin.generated';
import { NineSliceFrame, ThreeSliceStrip } from './ui/NineSlice';

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
    onPress={onPress}
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
  label: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
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
  // Talk frame while the toggle is "on" (same source selection as the
  // HomeScreen dialogue portrait); fall back across missing sprites so the
  // portrait never flips to the emoji mid-conversation.
  const foxSprite = isTalking && foxTalkSprite ? foxTalkSprite : (foxIdleSprite ?? foxTalkSprite);

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
          {
            backgroundColor: dt.modalBg,
            borderColor: dt.modalBorder,
            shadowColor: dt.modalShadowColor,
          },
        ]}
      >
        {/* Decorative accent line at top (same as HomeScreen dialogue modal) */}
        <View style={[styles.accentLine, { backgroundColor: dt.accentLine }]} />

        <View style={styles.cardRow}>
          {/* Sprite panel — full card height, lavender, sprite zoomed to fill */}
          <View style={[isCompact ? styles.compactSpriteCol : styles.dialogueSpriteCol, { backgroundColor: dt.spriteBg }]}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
              {foxSprite ? (
                <Image
                  source={foxSprite}
                  style={isCompact ? styles.compactSpriteImage : styles.dialogueSpriteImage}
                  resizeMode="cover"
                  accessibilityLabel="Ember portrait"
                />
              ) : (
                <Text style={isCompact ? styles.compactSpriteEmoji : styles.dialogueSpriteEmoji}>🦊</Text>
              )}
            </Animated.View>
          </View>

          {/* Text column */}
          <View style={isCompact ? styles.compactTextCol : styles.dialogueTextCol}>
            {/* Name in the cottage parchment ink (not the old candy-purple),
                so the nameplate reads as part of the wood-and-parchment card
                rather than a foreign sans-serif label floating above it. */}
            <Text style={[isCompact ? styles.compactName : styles.dialogueName, { color: FOX_SURFACE.body }]}>Ember</Text>
            <View style={[isCompact ? styles.compactNameSep : styles.dialogueNameSep, { backgroundColor: dt.accentLine }]} />

            <View style={isCompact ? styles.compactBubble : styles.dialogueBubble}>
              <NineSliceFrame
                skin={FOX_SKIN.card}
                cornerDp={CARD_CORNER_DP}
                edgeDp={CARD_EDGE_DP}
                fillColor={FOX_SKIN.fillCard}
              />
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
                    onPress={onSkip}
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
                      onPress={() => setConfirmingSkip(true)}
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

  // ---- Dialogue variant (exact HomeScreen dialogue card values) ----
  dialogueCard: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  // Sprite column - 30% width, zoomed in to fill (HomeScreen dialogueSpriteCol)
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
  dialogueSpriteEmoji: {
    fontSize: Math.min(80, SCREEN_WIDTH * 0.2),
  },
  // HomeScreen dialogueTextCol uses paddingBottom 34 because it is a bottom
  // sheet clearing the home indicator; this is a floating card, so the bottom
  // padding stays symmetric with the top instead.
  dialogueTextCol: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  dialogueName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dialogueNameSep: {
    height: 2,
    width: 32,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 12,
  },
  // Cottage parchment tray (NineSliceFrame card); clear the 12dp wood band.
  dialogueBubble: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    // Stable-ish height so short and 2-3 line lines don't resize the card (and
    // slide the nameplate) as Fox pages through a session.
    minHeight: 66,
    justifyContent: 'center',
  },
  dialogueText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
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
    fontSize: 14,
    fontWeight: '600',
  },

  // ---- Compact variant: the same anatomy shrunk down (move-required steps,
  // must not cover the board) ----
  compactCard: {
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  compactSpriteCol: {
    width: 78,
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
    fontSize: 48,
  },
  compactTextCol: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  compactNameSep: {
    height: 2,
    width: 24,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 8,
  },
  // Cottage parchment tray, compact; still clears the 12dp wood band.
  compactBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  compactText: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.1,
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
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: 0.4,
  },
});

export default FoxGuide;
