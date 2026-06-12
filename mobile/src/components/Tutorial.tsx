/**
 * @deprecated The Tutorial overlay component is replaced by the new multi-screen
 * onboarding flow (see src/services/onboarding.ts and src/components/FoxGuide.tsx).
 * The utility functions (hasTutorialCompleted, markTutorialCompleted, resetTutorial)
 * are still used for backward compatibility with existing installs.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CandyColors, getTileColor } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { markTutorialSeedsPlanted } from '../services/amberCurrency';

const TUTORIAL_KEY = 'wordshift_tutorial_completed';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Check if tutorial has been completed
 */
export async function hasTutorialCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark tutorial as completed
 */
export async function markTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {}
}

/**
 * Reset tutorial state (for testing)
 */
export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
  } catch {}
}

// ============================================================================
// Fox character — uses talk sprite if available, emoji fallback
// ============================================================================

let foxTalkSprite: ImageSourcePropType | null = null;
try {
  foxTalkSprite = require('../../assets/characters/fox/talk.png');
} catch {
  foxTalkSprite = null;
}

const FoxCharacter: React.FC<{ size?: number; speaking?: boolean }> = ({ size = 80, speaking = false }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;
    if (speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -4, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      bounceAnim.setValue(0);
    }
    return () => bounceAnim.stopAnimation();
  }, [speaking]);

  return (
    <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
      {foxTalkSprite ? (
        <Image source={foxTalkSprite} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: size * 0.7 }}>🦊</Text>
      )}
    </Animated.View>
  );
};

// ============================================================================
// Mini letter tile — smaller version of LetterTile for tutorial puzzle
// ============================================================================

interface MiniTileProps {
  char: string;
  onPress?: () => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isLocked?: boolean;
  isPulsing?: boolean;
}

const MiniTile: React.FC<MiniTileProps> = ({ char, onPress, isSelected, isHighlighted, isLocked, isPulsing }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tileColor = getTileColor(char);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      scaleAnim.setValue(isSelected ? 1.15 : 1);
      return;
    }
    if (isSelected) {
      Animated.spring(scaleAnim, { toValue: 1.15, friction: 3, tension: 200, useNativeDriver: true }).start();
    } else {
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
  }, [isSelected]);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;
    if (isPulsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => pulseAnim.stopAnimation();
  }, [isPulsing]);

  const bgColor = isSelected ? CandyColors.pink.main
    : isLocked ? CandyColors.gray[300]
    : isHighlighted ? tileColor.bg
    : CandyColors.white;

  const textColor = (isSelected || isHighlighted) ? CandyColors.white
    : isLocked ? CandyColors.gray[500]
    : CandyColors.gray[600];

  const borderColor = isSelected ? CandyColors.pink.shadow
    : isLocked ? CandyColors.gray[400]
    : isHighlighted ? tileColor.border
    : CandyColors.gray[300];

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const tile = (
    <Animated.View style={[
      styles.miniTileOuter,
      { transform: [{ scale: Animated.multiply(scaleAnim, pulseScale) }] },
    ]}>
      <View style={[styles.miniTileBody, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <View style={styles.miniBevel} />
        <View style={styles.miniGlossy} />
        <Text style={[styles.miniTileText, { color: textColor }]}>{char}</Text>
        {!isLocked && <View style={styles.miniSpecular} />}
      </View>
      <View style={[styles.miniTileEdge, { backgroundColor: borderColor }]} />
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel={`Letter ${char}`} accessibilityRole="button">
        {tile}
      </TouchableOpacity>
    );
  }
  return tile;
};

// ============================================================================
// Mini drop slot for interactive tutorial
// ============================================================================

const MiniSlot: React.FC<{ onPress?: () => void; isPulsing?: boolean }> = ({ onPress, isPulsing }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;
    if (isPulsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => pulseAnim.stopAnimation();
  }, [isPulsing]);

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress} accessibilityLabel="Drop letter here" accessibilityRole="button">
      <Animated.View style={[styles.miniSlot, { transform: [{ scale }], opacity }]}>
        <Text style={styles.miniSlotText}>+</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// Speech bubble — Fox's dialogue
// ============================================================================

const SpeechBubble: React.FC<{ text: string; emphasis?: boolean }> = ({ text, emphasis }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      fadeAnim.setValue(1);
      return;
    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [text]);

  return (
    <Animated.View style={[styles.speechBubble, emphasis && styles.speechBubbleEmphasis, { opacity: fadeAnim }]}>
      {/* Accent bar at the left edge */}
      <View style={[styles.speechAccentBar, emphasis && styles.speechAccentBarEmphasis]} />
      {/* Shine overlay at top */}
      <View style={styles.speechShine} />
      <Text style={[styles.speechText, emphasis && styles.speechTextEmphasis]}>{text}</Text>
      {/* Tail pointing up toward the fox */}
      <View style={styles.speechTailOuter}>
        <View style={[styles.speechTail, emphasis && styles.speechTailEmphasis]} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// Tutorial phases — Fox-guided interactive onboarding
// ============================================================================

type TutorialPhase =
  | 'welcome'         // Fox greets the player
  | 'show_puzzle'     // Show the mini puzzle
  | 'pick_letter'     // Prompt to tap H
  | 'letter_picked'   // H selected, brief pause
  | 'drop_letter'     // Prompt to tap a slot
  | 'move_complete'   // Move done — celebrate
  | 'house_intro';    // The house, the others, the invitation

interface TutorialProps {
  onComplete: () => void;
}

/*
 * Interactive tutorial puzzle: HEAT → ATE
 * Player picks H from HEAT → EAT (valid), drops H into ATE → HATE (valid)
 * One move teaches pick + drop + validation in a guided, character-driven flow.
 */
export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<TutorialPhase>('welcome');
  const overlayFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const puzzleSlide = useRef(new Animated.Value(40)).current;
  const celebrateScale = useRef(new Animated.Value(0)).current;
  const reducedMotion = getSettingsSync().reducedMotion;

  // Mini puzzle state
  const [row1Letters, setRow1Letters] = useState(['H', 'E', 'A', 'T']);
  const [row2Letters, setRow2Letters] = useState(['A', 'T', 'E']);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [moveComplete, setMoveComplete] = useState(false);

  // Entry animation
  useEffect(() => {
    if (reducedMotion) {
      overlayFade.setValue(1);
      return;
    }
    Animated.timing(overlayFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const animateContentChange = useCallback((nextPhase: TutorialPhase) => {
    if (reducedMotion) {
      setPhase(nextPhase);
      return;
    }
    Animated.timing(contentFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPhase(nextPhase);
      Animated.timing(contentFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [contentFade, reducedMotion]);

  const showPuzzle = useCallback(() => {
    animateContentChange('show_puzzle');
    if (reducedMotion) {
      puzzleSlide.setValue(0);
      setTimeout(() => setPhase('pick_letter'), 300);
      return;
    }
    puzzleSlide.setValue(40);
    setTimeout(() => {
      Animated.spring(puzzleSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
      setTimeout(() => setPhase('pick_letter'), 1000);
    }, 300);
  }, [puzzleSlide, animateContentChange, reducedMotion]);

  const handleLetterPick = useCallback((char: string) => {
    if (phase !== 'pick_letter' || char !== 'H') return;
    setSelectedChar('H');
    setPhase('letter_picked');
    setTimeout(() => setPhase('drop_letter'), 800);
  }, [phase]);

  const handleSlotPress = useCallback(() => {
    if (phase !== 'drop_letter') return;
    // H drops at position 0 → HATE
    setSelectedChar(null);
    setRow1Letters(['E', 'A', 'T']);
    setRow2Letters(['H', 'A', 'T', 'E']);
    setMoveComplete(true);
    setPhase('move_complete');

    if (reducedMotion) {
      celebrateScale.setValue(1);
    } else {
      celebrateScale.setValue(0);
      Animated.spring(celebrateScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
    }
  }, [phase, celebrateScale, reducedMotion]);

  const handleComplete = async () => {
    await markTutorialCompleted();
    // Track that tutorial seeds were planted - Fox will reference these later at higher phases
    // "We've been waiting for someone like you" and "Every puzzle you solve helps us build the house"
    await markTutorialSeedsPlanted().catch(() => {});
    if (reducedMotion) {
      onComplete();
      return;
    }
    Animated.timing(overlayFade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onComplete());
  };

  // ============================================================================
  // Fox dialogue per phase
  // ============================================================================

  const renderFoxDialogue = () => {
    switch (phase) {
      case 'welcome':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={90} speaking />
            <SpeechBubble text={`Oh! A visitor!\nI'm Ember. Welcome to our little house.\nWe've been waiting for someone like you.`} />
            <TouchableOpacity style={styles.continueBtn} onPress={showPuzzle} accessibilityLabel="Nice to meet you" accessibilityRole="button">
              <View style={styles.continueBtnShine} />
              <Text style={styles.continueBtnText}>Nice to meet you!</Text>
            </TouchableOpacity>
          </View>
        );

      case 'show_puzzle':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={64} speaking />
            <SpeechBubble text="Let me show you how things work around here..." />
          </View>
        );

      case 'pick_letter':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={64} speaking />
            <SpeechBubble text={`See these letters? Try tapping the 'H'!`} emphasis />
          </View>
        );

      case 'letter_picked':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={64} speaking />
            <SpeechBubble text="You picked it up! Now let's move it down..." />
          </View>
        );

      case 'drop_letter':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={64} speaking />
            <SpeechBubble text={`Now tap a '+' slot below to drop it in.\nBoth words must be real!`} emphasis />
          </View>
        );

      case 'move_complete':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={64} speaking />
            <SpeechBubble text={`HEAT → EAT, and ATE → HATE!\nBoth real words. You're a natural.`} />
            <TouchableOpacity style={styles.continueBtn} onPress={() => animateContentChange('house_intro')} accessibilityLabel="That was fun" accessibilityRole="button">
              <View style={styles.continueBtnShine} />
              <Text style={styles.continueBtnText}>That was fun!</Text>
            </TouchableOpacity>
          </View>
        );

      case 'house_intro':
        return (
          <View style={styles.dialogueArea}>
            <FoxCharacter size={90} speaking />
            <SpeechBubble text={`Every puzzle you solve helps us build the house. The others are going to love you.\nThere's so much more to discover... together.`} />
            <TouchableOpacity style={[styles.continueBtn, styles.continueBtnFinal]} onPress={handleComplete} accessibilityLabel="Start playing" accessibilityRole="button">
              <View style={styles.continueBtnShine} />
              <Text style={styles.continueBtnText}>Let&apos;s play!</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Interactive mini puzzle
  // ============================================================================

  const renderMiniPuzzle = () => {
    const showPuzzleRows = phase !== 'welcome' && phase !== 'house_intro';
    if (!showPuzzleRows) return null;

    const isPickPhase = phase === 'pick_letter';
    const isDropPhase = phase === 'drop_letter';
    const isRow1Active = !moveComplete;

    return (
      <Animated.View style={[styles.puzzleArea, { transform: [{ translateY: puzzleSlide }] }]}>
        {/* Source row label */}
        <View style={styles.rowLabelContainer}>
          <Text style={[styles.rowLabel, isRow1Active && styles.rowLabelActive]}>
            {moveComplete ? '✓' : 'PICK'}
          </Text>
        </View>

        {/* Row 1 — source word */}
        <View style={styles.miniRow}>
          {row1Letters.map((char, i) => (
            <MiniTile
              key={`r1-${i}-${char}`}
              char={char}
              isHighlighted={isRow1Active && !moveComplete}
              isSelected={selectedChar === char && char === 'H' && !moveComplete}
              isPulsing={isPickPhase && char === 'H'}
              isLocked={moveComplete}
              onPress={isPickPhase ? () => handleLetterPick(char) : undefined}
            />
          ))}
        </View>

        {/* Arrow */}
        <Text style={styles.arrowText}>⬇️</Text>

        {/* Target row label */}
        <View style={styles.rowLabelContainer}>
          <Text style={[styles.rowLabel, !isRow1Active && styles.rowLabelActive]}>
            {moveComplete ? '✓' : 'DROP'}
          </Text>
        </View>

        {/* Row 2 — target word (with drop slots when active) */}
        <View style={styles.miniRow}>
          {isDropPhase ? (
            <>
              <MiniSlot onPress={() => handleSlotPress()} isPulsing />
              {row2Letters.map((char, i) => (
                <React.Fragment key={`r2-slot-${i}`}>
                  <MiniTile char={char} />
                  <MiniSlot onPress={() => handleSlotPress()} isPulsing />
                </React.Fragment>
              ))}
            </>
          ) : (
            row2Letters.map((char, i) => (
              <MiniTile
                key={`r2-${i}-${char}`}
                char={char}
                isLocked={moveComplete && i === 0}
                isHighlighted={moveComplete && i === 0}
              />
            ))
          )}
        </View>

        {/* Success celebration */}
        {moveComplete && (
          <Animated.View style={[styles.celebrateContainer, { transform: [{ scale: celebrateScale }] }]}>
            <Text style={styles.celebrateText}>Both words are valid!</Text>
            <Text style={styles.celebrateEmoji}>✨</Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  // Progress dots
  const getProgress = (): number => {
    switch (phase) {
      case 'welcome': return 0;
      case 'show_puzzle': case 'pick_letter': return 1;
      case 'letter_picked': case 'drop_letter': return 2;
      case 'move_complete': return 3;
      case 'house_intro': return 4;
      default: return 0;
    }
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === getProgress() && styles.dotActive,
              i < getProgress() && styles.dotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Main content card */}
      <Animated.View style={[styles.card, { opacity: contentFade }]}>
        {phase === 'welcome' && (
          <Text style={styles.welcomeTitle}>Welcome to WordShift</Text>
        )}

        {renderFoxDialogue()}
        {renderMiniPuzzle()}
      </Animated.View>

      {/* Skip button */}
      {phase !== 'house_intro' && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} accessibilityLabel="Skip tutorial" accessibilityRole="button">
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(50, 20, 100, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 20,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    backgroundColor: CandyColors.pink.main,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: CandyColors.purple.light,
  },
  card: {
    backgroundColor: CandyColors.white,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    overflow: 'hidden',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // Fox dialogue area
  dialogueArea: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  speechBubble: {
    backgroundColor: '#F5F0FF',
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 20,
    paddingRight: 16,
    marginTop: 12,
    marginBottom: 12,
    width: '100%',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.12)',
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  speechBubbleEmphasis: {
    backgroundColor: '#EDE5FF',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    shadowOpacity: 0.15,
  },
  speechAccentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: CandyColors.purple.light,
    opacity: 0.6,
  },
  speechAccentBarEmphasis: {
    opacity: 1,
    backgroundColor: CandyColors.purple.main,
    width: 4,
  },
  speechShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  speechText: {
    fontSize: 15,
    color: CandyColors.gray[600],
    textAlign: 'center',
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  speechTextEmphasis: {
    fontWeight: '600',
    color: CandyColors.purple.dark,
  },
  speechTailOuter: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 8,
    overflow: 'hidden',
  },
  speechTail: {
    position: 'absolute',
    bottom: -5,
    left: 2,
    width: 12,
    height: 12,
    backgroundColor: '#F5F0FF',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.12)',
    transform: [{ rotate: '45deg' }],
  },
  speechTailEmphasis: {
    backgroundColor: '#EDE5FF',
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },

  // Continue / action buttons
  continueBtn: {
    backgroundColor: CandyColors.purple.main,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: CandyColors.purple.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  continueBtnFinal: {
    backgroundColor: CandyColors.green.main,
    shadowColor: CandyColors.green.shadow,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  continueBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
  },

  // Mini puzzle area
  puzzleArea: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginVertical: 4,
  },
  rowLabelContainer: {
    marginBottom: 2,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CandyColors.gray[300],
    letterSpacing: 2,
  },
  rowLabelActive: {
    color: CandyColors.purple.main,
  },
  arrowText: {
    fontSize: 16,
    marginVertical: 2,
  },

  // Mini tile styles (smaller LetterTile for tutorial)
  miniTileOuter: {
    width: 44,
    height: 54,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  miniTileBody: {
    width: 44,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  miniBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  miniGlossy: {
    position: 'absolute',
    top: 3,
    left: 5,
    right: 5,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 6,
  },
  miniTileText: {
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  miniSpecular: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 3,
  },
  miniTileEdge: {
    position: 'absolute',
    bottom: 0,
    left: 3,
    right: 3,
    height: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    zIndex: -1,
  },

  // Mini drop slot
  miniSlot: {
    width: 24,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CandyColors.purple.light,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
  },
  miniSlotText: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.purple.light,
  },

  // Success celebration
  celebrateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    backgroundColor: '#F0FFF0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90EE90',
  },
  celebrateText: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.green.main,
  },
  celebrateEmoji: {
    fontSize: 18,
  },

  // Skip
  skipBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipBtnText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
});

export default Tutorial;
