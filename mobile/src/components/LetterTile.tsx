
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Letter } from '../types';

interface LetterTileProps {
  letter: Letter;
  onPress?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
}

export const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  onPress,
  isSelected,
  isInteractable,
  highlight = 'default',
}) => {
  const getTileStyles = () => {
    if (highlight === 'locked') {
      return {
        container: styles.tileLocked,
        text: styles.textLocked,
      };
    }
    if (isSelected) {
      return {
        container: styles.tileSelected,
        text: styles.textSelected,
      };
    }
    if (isInteractable && highlight === 'source') {
      return {
        container: styles.tileSource,
        text: styles.textSource,
      };
    }
    return {
      container: styles.tileDefault,
      text: styles.textDefault,
    };
  };

  const tileStyles = getTileStyles();
  const isClickable = isInteractable || isSelected;

  const content = (
    <View style={[styles.tileBase, tileStyles.container]}>
      <Text style={[styles.letterText, tileStyles.text]}>{letter.char}</Text>

      {/* Glossy shine effect */}
      <View style={[styles.shine, highlight === 'locked' ? styles.shineDim : null]} />

      {/* Specular dot for interactive tiles */}
      {(isInteractable || isSelected) && (
        <View style={styles.specularDot} />
      )}

      {/* Lock icon for locked tiles */}
      {highlight === 'locked' && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </View>
  );

  if (isClickable && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  tileBase: {
    width: 48,
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },

  // Tile variants
  tileDefault: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tileLocked: {
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
  },
  tileSelected: {
    backgroundColor: '#EC4899',
    borderBottomWidth: 0,
    transform: [{ translateY: 2 }],
  },
  tileSource: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: '#E9D5FF',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Text variants
  letterText: {
    fontSize: 28,
    fontWeight: '900',
  },
  textDefault: {
    color: '#475569',
  },
  textLocked: {
    color: '#94A3B8',
  },
  textSelected: {
    color: '#FFFFFF',
  },
  textSource: {
    color: '#9333EA',
  },

  // Decorative elements
  shine: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: '33%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  shineDim: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  specularDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#CBD5E1',
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  lockIcon: {
    fontSize: 10,
  },
});
