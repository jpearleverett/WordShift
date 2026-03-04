import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing as REasing,
} from 'react-native-reanimated';
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
  /** Button label (defaults to "Continue") */
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
 * variant='compact' — small floating card (used on home screen onboarding)
 * variant='dialogue' — side-by-side layout matching the HomeScreen animal dialogue box
 */
export const FoxGuide: React.FC<FoxGuideProps> = ({
  visible,
  text,
  buttonText = 'Continue',
  onContinue,
  position = 'bottom',
  anchorStyle,
  showSkip = false,
  onSkip,
  speaking = true,
  variant = 'compact',
}) => {
  // All animations use Reanimated shared values — runs on UI thread, no JS round-trips.
  // Cancels previous animations before starting new ones to prevent overlap jank.
  const fadeVal = useSharedValue(0);
  const slideVal = useSharedValue(30);
  const bounceProgress = useSharedValue(0);
  const textFadeVal = useSharedValue(1);
  const reducedMotion = getSettingsSync().reducedMotion;
  const hasInteractiveControls = Boolean(onContinue || (showSkip && onSkip));

  // Show/hide animation
  useEffect(() => {
    if (reducedMotion) {
      fadeVal.value = visible ? 1 : 0;
      slideVal.value = visible ? 0 : 30;
      return;
    }
    if (visible) {
      cancelAnimation(fadeVal);
      cancelAnimation(slideVal);
      slideVal.value = 30;
      fadeVal.value = withTiming(1, { duration: 300 });
      slideVal.value = withSpring(0, { damping: 12, stiffness: 100 });
    } else {
      cancelAnimation(fadeVal);
      fadeVal.value = withTiming(0, { duration: 200 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fox bounce when speaking — Reanimated
  useEffect(() => {
    if (reducedMotion || !speaking || !visible) {
      cancelAnimation(bounceProgress);
      bounceProgress.value = 0;
      return;
    }
    bounceProgress.value = 0;
    bounceProgress.value = withRepeat(
      withTiming(1, { duration: 600, easing: REasing.inOut(REasing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(bounceProgress);
  }, [speaking, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * bounceProgress.value }],
  }));

  // Animate text changes
  useEffect(() => {
    if (reducedMotion) {
      textFadeVal.value = 1;
      return;
    }
    cancelAnimation(textFadeVal);
    textFadeVal.value = 0;
    textFadeVal.value = withTiming(1, { duration: 250 });
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize position style so it's stable across re-renders
  const resolvedPositionStyle = useMemo(
    () =>
      anchorStyle ||
      (position === 'top'
        ? { top: Math.max(80, SCREEN_HEIGHT * 0.12) }
        : position === 'middle'
          ? { top: Math.max(180, SCREEN_HEIGHT * 0.25) }
          : { bottom: Math.max(30, SCREEN_HEIGHT * 0.04) }),
    [position, anchorStyle],
  );

  // Container animated style — combines fade + slide with position-aware direction.
  // Negation for top position handled inline (replaces the old Animated.multiply ref).
  const isTop = position === 'top';
  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeVal.value,
    transform: [{ translateY: isTop ? -slideVal.value : slideVal.value }],
  }));

  // Text fade style
  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textFadeVal.value,
  }));

  if (!visible) return null;

  // Dialogue theme for the dialogue variant (always Phase 0 during tutorial)
  const dt = getDialogueTheme(0);

  if (variant === 'dialogue') {
    const foxSprite = speaking ? foxTalkSprite : foxIdleSprite;
    return (
      <Reanimated.View
        style={[styles.container, resolvedPositionStyle, containerAnimStyle]}
        pointerEvents={hasInteractiveControls ? 'box-none' : 'none'}
      >
        <View style={[
          styles.dialogueCard,
          {
            backgroundColor: dt.modalBg,
            borderColor: dt.modalBorder,
            shadowColor: dt.modalShadowColor,
          },
        ]}>
          {/* Accent line at top */}
          <View style={[styles.dialogueAccentLine, { backgroundColor: dt.accentLine }]} />

          <View style={styles.dialogueRow}>
            {/* Sprite column — 28% width */}
            <View style={[styles.dialogueSpriteCol, { backgroundColor: dt.spriteBg }]}>
              <Reanimated.View style={bounceStyle}>
                {foxSprite ? (
                  <Image
                    source={foxSprite}
                    style={styles.dialogueSpriteImage}
                    resizeMode="cover"
                    accessibilityLabel="Ember portrait"
                  />
                ) : (
                  <Text style={styles.dialogueSpriteEmoji}>🦊</Text>
                )}
              </Reanimated.View>
            </View>

            {/* Text column — 72% */}
            <View style={styles.dialogueTextCol}>
              <Text style={[styles.dialogueName, { color: dt.nameColor }]}>Ember</Text>
              <View style={[styles.dialogueNameSep, { backgroundColor: dt.accentLine }]} />

              <View style={[styles.dialogueBubble, { backgroundColor: dt.bubbleBg, borderColor: dt.bubbleBorder }]}>
                <Reanimated.Text
                  style={[styles.dialogueText, { color: dt.textColor }, textAnimStyle]}
                >
                  {text}
                </Reanimated.Text>
              </View>

              {/* Action row */}
              <View style={styles.dialogueFooter}>
                {showSkip && onSkip && (
                  <TouchableOpacity
                    style={styles.dialogueSkipBtn}
                    onPress={onSkip}
                    accessibilityLabel="Skip intro"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.dialogueSkipText, { color: dt.subtitleColor }]}>Skip</Text>
                  </TouchableOpacity>
                )}
                {onContinue && (
                  <TouchableOpacity
                    style={[
                      styles.dialogueContinueBtn,
                      { backgroundColor: dt.primaryButtonBg, shadowColor: dt.primaryButtonShadow },
                    ]}
                    onPress={onContinue}
                    accessibilityLabel={buttonText}
                    accessibilityRole="button"
                  >
                    <View style={styles.dialogueBtnShine} />
                    <Text style={styles.dialogueContinueBtnText}>{buttonText}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Reanimated.View>
    );
  }

  // Compact variant (original floating card)
  return (
    <Reanimated.View
      style={[styles.container, resolvedPositionStyle, containerAnimStyle]}
      // Let puzzle/home interactions pass through when Fox is informational only.
      pointerEvents={hasInteractiveControls ? 'box-none' : 'none'}
      accessibilityRole="alert"
      accessibilityLabel={`Ember says: ${text}`}
    >
      <View style={styles.guideCard}>
        {/* Fox sprite */}
        <Reanimated.View
          style={[
            styles.foxContainer,
            bounceStyle,
          ]}
        >
          {foxTalkSprite ? (
            <Image
              source={foxTalkSprite}
              style={styles.foxImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.foxEmoji}>🦊</Text>
          )}
        </Reanimated.View>

        {/* Speech content */}
        <View style={styles.speechArea}>
          <View style={styles.speechBubble}>
            <View style={styles.speechAccentBar} />
            <View style={styles.speechShine} />
            <Reanimated.Text
              style={[styles.speechText, textAnimStyle]}
            >
              {text}
            </Reanimated.Text>
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            {showSkip && onSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                accessibilityLabel="Skip intro"
                accessibilityRole="button"
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
            {onContinue && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={onContinue}
                accessibilityLabel={buttonText}
                accessibilityRole="button"
              >
                <View style={styles.continueButtonShine} />
                <Text style={styles.continueButtonText}>{buttonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Reanimated.View>
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
  containerBottom: {
    bottom: 30,
  },
  containerTop: {
    top: 100,
  },
  containerMiddle: {
    top: 220,
  },

  // ---- Compact variant (floating card) ----
  guideCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 16, 44, 0.95)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(190, 145, 255, 0.28)',
  },
  foxContainer: {
    width: 58,
    height: 58,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foxImage: {
    width: 58,
    height: 58,
  },
  foxEmoji: {
    fontSize: 40,
  },
  speechArea: {
    flex: 1,
  },
  speechBubble: {
    backgroundColor: 'rgba(248, 244, 255, 0.97)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 83, 210, 0.24)',
  },
  speechAccentBar: {
    position: 'absolute',
    left: 0,
    top: 5,
    bottom: 5,
    width: 2,
    borderRadius: 2,
    backgroundColor: CandyColors.purple.light,
    opacity: 0.85,
  },
  speechShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  speechText: {
    fontSize: 14,
    color: '#3D3158',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 7,
    gap: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#7A49D8',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: CandyColors.purple.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  continueButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  continueButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: CandyColors.white,
    letterSpacing: 0.4,
  },

  // ---- Dialogue variant (matches HomeScreen dialogue box) ----
  dialogueCard: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dialogueAccentLine: {
    height: 3,
    width: '100%',
  },
  dialogueRow: {
    flexDirection: 'row',
  },
  dialogueSpriteCol: {
    width: '28%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dialogueSpriteImage: {
    width: SCREEN_WIDTH * 0.30,
    height: SCREEN_WIDTH * 0.36,
  },
  dialogueSpriteEmoji: {
    fontSize: Math.min(60, SCREEN_WIDTH * 0.15),
  },
  dialogueTextCol: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
  dialogueName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  dialogueNameSep: {
    height: 2,
    width: 28,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 10,
  },
  dialogueBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  dialogueText: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  dialogueFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  dialogueSkipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dialogueSkipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogueContinueBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dialogueContinueBtnText: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default FoxGuide;
