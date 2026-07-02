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
import { CandyColors, getDialogueTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

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

  if (!visible) return null;
  // Never render an empty shell: with no text Fox has nothing to say, and a
  // bare card (or a lone Skip button in an empty box) reads as a broken overlay.
  if (!text || text.trim().length === 0) return null;

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
      accessibilityLabel={isCompact ? `Ember says: ${text}` : undefined}
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
            <Text style={[isCompact ? styles.compactName : styles.dialogueName, { color: dt.nameColor }]}>Ember</Text>
            <View style={[isCompact ? styles.compactNameSep : styles.dialogueNameSep, { backgroundColor: dt.accentLine }]} />

            <View style={[isCompact ? styles.compactBubble : styles.dialogueBubble, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
              <Animated.Text
                style={[isCompact ? styles.compactText : styles.dialogueText, { color: dt.textColor, opacity: textFadeAnim }]}
              >
                {text}
              </Animated.Text>
            </View>

            {/* Footer: quiet Skip + solid purple pill. The footer keeps a
                stable min height even when no pill renders (move-required
                steps advance via the board), so the card never jumps when a
                continue action appears/disappears. */}
            <View style={isCompact ? styles.compactFooter : styles.dialogueFooter}>
              {showSkip && onSkip && (
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={onSkip}
                  accessibilityLabel="Skip intro"
                  accessibilityRole="button"
                >
                  <Text style={[isCompact ? styles.compactSkipText : styles.dialogueSkipText, { color: dt.subtitleColor }]}>Skip</Text>
                </TouchableOpacity>
              )}
              {onContinue && (
                <TouchableOpacity
                  style={[
                    isCompact ? styles.compactContinueBtn : styles.dialogueContinueBtn,
                    { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow },
                  ]}
                  onPress={onContinue}
                  accessibilityLabel={buttonText}
                  accessibilityRole="button"
                >
                  <View style={isCompact ? styles.compactBtnShine : styles.dialogueBtnShine} />
                  <Text style={isCompact ? styles.compactContinueBtnText : styles.dialogueContinueBtnText}>{buttonText}</Text>
                </TouchableOpacity>
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
  dialogueBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
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
    // Pill height (12 + 20 + 12 + 2 border): stable whether or not it renders.
    minHeight: 46,
  },
  dialogueSkipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogueContinueBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dialogueBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  dialogueContinueBtnText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
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
  compactBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    borderWidth: 1,
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
    // Pill height (8 + 17 + 8 + 2 border): stable whether or not it renders —
    // during move-required steps only Skip shows and the card doesn't jump.
    minHeight: 36,
  },
  compactSkipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  compactContinueBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactContinueBtnText: {
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    letterSpacing: 0.4,
  },
});

export default FoxGuide;
