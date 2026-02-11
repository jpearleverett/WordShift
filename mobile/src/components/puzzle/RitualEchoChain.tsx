import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CandyColors } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

interface RitualEchoChainProps {
  words: string[];
  phase: number;
  visible: boolean;
}

const FADE_IN_DURATION = 300;

/**
 * Displays the word chain building in real-time on the puzzle screen as rows
 * are completed. Words stack vertically along the left edge, connected by
 * arrows that shift from horizontal (Phase 0-2) to vertical (Phase 3-4).
 *
 * Phase-aware styling:
 * - Phase 0-1: Subtle pink/purple candy text, barely noticeable (0.3 opacity)
 * - Phase 2: Slightly more prominent, muted purple, words connected by thin lines
 * - Phase 3: Dark purple/crimson text, connected by vertical line, slightly glowing
 * - Phase 4: Crimson text on near-black bg, connected by pulsing line, incantation feel
 */
export const RitualEchoChain: React.FC<RitualEchoChainProps> = ({
  words,
  phase,
  visible,
}) => {
  // Track animated values for each word slot (max reasonable chain length)
  const wordAnimations = useRef<Animated.Value[]>([]).current;
  const previousCountRef = useRef(0);

  // Ensure we have enough Animated.Values for all words
  while (wordAnimations.length < words.length) {
    wordAnimations.push(new Animated.Value(0));
  }

  // Animate newly added words
  useEffect(() => {
    if (!visible) return;

    const prevCount = previousCountRef.current;
    const newCount = words.length;

    if (newCount > prevCount) {
      const { reducedMotion } = getSettingsSync();

      for (let i = prevCount; i < newCount; i++) {
        if (reducedMotion) {
          wordAnimations[i].setValue(1);
        } else {
          wordAnimations[i].setValue(0);
          Animated.timing(wordAnimations[i], {
            toValue: 1,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
          }).start();
        }
      }
    }

    previousCountRef.current = newCount;
  }, [words.length, visible]);

  // Reset animations when visibility is lost
  useEffect(() => {
    if (!visible) {
      previousCountRef.current = 0;
      wordAnimations.forEach((anim) => anim.setValue(0));
    }
  }, [visible]);

  if (!visible || words.length === 0) return null;

  const containerOpacity = getContainerOpacity(phase);
  const wordStyle = getWordStyle(phase);
  const arrowStyle = getArrowStyle(phase);
  const arrowChar = phase >= 3 ? '\u2193' : '\u2192'; // down arrow at Phase 3+, right arrow otherwise
  const connectorLineStyle = getConnectorLineStyle(phase);
  const showConnectorLine = phase >= 2;

  return (
    <View
      style={[styles.container, { opacity: containerOpacity }]}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`Word chain: ${words.join(', ')}`}
    >
      {showConnectorLine && phase >= 3 && (
        <View style={[styles.connectorLine, connectorLineStyle]} />
      )}
      {words.map((word, index) => (
        <Animated.View
          key={`${index}-${word}`}
          style={[
            styles.wordEntry,
            { opacity: wordAnimations[index] || 0 },
          ]}
        >
          <Text style={[styles.wordText, wordStyle]}>
            {word}
          </Text>
          {index < words.length - 1 && (
            <Text style={[styles.arrowText, arrowStyle]}>
              {arrowChar}
            </Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

function getContainerOpacity(phase: number): number {
  if (phase <= 1) return 0.3;
  if (phase === 2) return 0.45;
  if (phase === 3) return 0.6;
  return 0.7; // Phase 4
}

function getWordStyle(phase: number) {
  if (phase <= 1) {
    return styles.wordCandy;
  }
  if (phase === 2) {
    return styles.wordMuted;
  }
  if (phase === 3) {
    return styles.wordShadow;
  }
  return styles.wordCrimson; // Phase 4
}

function getArrowStyle(phase: number) {
  if (phase <= 1) {
    return styles.arrowCandy;
  }
  if (phase === 2) {
    return styles.arrowMuted;
  }
  if (phase === 3) {
    return styles.arrowShadow;
  }
  return styles.arrowCrimson; // Phase 4
}

function getConnectorLineStyle(phase: number) {
  if (phase === 2) {
    return styles.connectorThin;
  }
  if (phase === 3) {
    return styles.connectorGlow;
  }
  return styles.connectorPulse; // Phase 4
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    top: '20%',
    bottom: '20%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  connectorLine: {
    position: 'absolute',
    left: 18,
    top: 8,
    bottom: 8,
    width: 2,
  },
  connectorThin: {
    backgroundColor: 'rgba(140, 100, 180, 0.3)',
    width: 1,
  },
  connectorGlow: {
    backgroundColor: 'rgba(120, 60, 100, 0.5)',
    width: 2,
    shadowColor: '#6B2050',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  connectorPulse: {
    backgroundColor: 'rgba(180, 40, 50, 0.6)',
    width: 2,
    shadowColor: '#B02030',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  wordEntry: {
    alignItems: 'center',
    marginVertical: 2,
  },
  wordText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  arrowText: {
    fontSize: 8,
    fontWeight: '600',
    marginVertical: 1,
  },

  // Phase 0-1: Subtle candy pink/purple
  wordCandy: {
    color: CandyColors.pink.light,
  },
  arrowCandy: {
    color: CandyColors.purple.light,
  },

  // Phase 2: Muted purple
  wordMuted: {
    color: 'rgba(160, 130, 190, 0.9)',
  },
  arrowMuted: {
    color: 'rgba(140, 110, 170, 0.7)',
  },

  // Phase 3: Dark purple/crimson with glow
  wordShadow: {
    color: 'rgba(140, 50, 80, 0.95)',
    textShadowColor: 'rgba(100, 30, 60, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  arrowShadow: {
    color: 'rgba(120, 40, 70, 0.8)',
  },

  // Phase 4: Crimson incantation
  wordCrimson: {
    color: 'rgba(200, 50, 60, 0.95)',
    textShadowColor: 'rgba(180, 30, 40, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  arrowCrimson: {
    color: 'rgba(180, 40, 50, 0.85)',
    textShadowColor: 'rgba(160, 30, 40, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
