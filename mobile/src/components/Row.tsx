
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Letter, RowData } from '../types';
import { LetterTile } from './LetterTile';

interface RowProps {
  rowData: RowData;
  rowIndex: number;
  activeRowIndex: number;
  selectedLetter: Letter | null;
  onLetterPress: (letter: Letter, rowIndex: number) => void;
  onSlotPress: (targetIndex: number) => void;
  isProcessing: boolean;
}

const Slot: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <View style={styles.slot}>
      <Text style={styles.slotPlus}>+</Text>
    </View>
  </TouchableOpacity>
);

export const Row: React.FC<RowProps> = ({
  rowData,
  rowIndex,
  activeRowIndex,
  selectedLetter,
  onLetterPress,
  onSlotPress,
  isProcessing,
}) => {
  const isSource = rowIndex === activeRowIndex;
  const isTarget = rowIndex === activeRowIndex + 1;
  const isCompleted = rowIndex < activeRowIndex;

  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    const letters = rowData.words;

    // Target row with slots for dropping
    if (isTarget && selectedLetter && !isProcessing) {
      elements.push(<Slot key="slot-start" onPress={() => onSlotPress(0)} />);
      letters.forEach((letter, index) => {
        elements.push(
          <LetterTile
            key={letter.id}
            letter={letter}
            highlight={letter.isLocked ? 'locked' : 'default'}
          />
        );
        elements.push(
          <Slot key={`slot-${index + 1}`} onPress={() => onSlotPress(index + 1)} />
        );
      });
    } else {
      // Standard display
      letters.forEach((letter) => {
        elements.push(
          <LetterTile
            key={letter.id}
            letter={letter}
            isSelected={selectedLetter?.id === letter.id}
            isInteractable={isSource && !isProcessing && !letter.isLocked}
            highlight={letter.isLocked ? 'locked' : isSource ? 'source' : 'default'}
            onPress={() => onLetterPress(letter, rowIndex)}
          />
        );
      });
    }
    return elements;
  };

  const getContainerStyle = () => {
    if (isSource) {
      return [styles.rowContainer, styles.rowSource];
    }
    if (isTarget) {
      return [styles.rowContainer, styles.rowTarget];
    }
    if (isCompleted) {
      return [styles.rowContainer, styles.rowCompleted];
    }
    return [styles.rowContainer, styles.rowFuture];
  };

  return (
    <View style={getContainerStyle()}>
      {/* Badge label for source/target */}
      {isSource && (
        <View style={[styles.badge, styles.badgePick]}>
          <Text style={styles.badgeText}>PICK</Text>
        </View>
      )}
      {isTarget && selectedLetter && (
        <View style={[styles.badge, styles.badgeDrop]}>
          <Text style={styles.badgeText}>DROP</Text>
        </View>
      )}

      <View style={styles.lettersContainer}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 24,
    borderWidth: 2,
    position: 'relative',
  },
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Row variants
  rowSource: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: '#C4B5FD',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  rowTarget: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#F9A8D4',
    borderStyle: 'dashed',
  },
  rowCompleted: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  rowFuture: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    opacity: 0.2,
    transform: [{ scale: 0.9 }],
  },

  // Badge styles
  badge: {
    position: 'absolute',
    left: 4,
    top: -10,
    transform: [{ rotate: '-5deg' }],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  badgePick: {
    backgroundColor: '#A855F7',
    shadowColor: '#A855F7',
  },
  badgeDrop: {
    backgroundColor: '#F472B6',
    shadowColor: '#F472B6',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Slot styles
  slot: {
    width: 44,
    height: 64,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#F9A8D4',
    borderRadius: 16,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  slotPlus: {
    color: '#F9A8D4',
    fontSize: 24,
    fontWeight: '900',
  },
});
