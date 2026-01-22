
import React from 'react';
import { Letter, RowData } from '../types';
import { LetterTile } from './LetterTile';

interface RowProps {
  rowData: RowData;
  rowIndex: number;
  activeRowIndex: number;
  selectedLetter: Letter | null;
  onLetterClick: (letter: Letter, rowIndex: number) => void;
  onSlotClick: (targetIndex: number) => void;
  isProcessing: boolean;
}

export const Row: React.FC<RowProps> = ({
  rowData,
  rowIndex,
  activeRowIndex,
  selectedLetter,
  onLetterClick,
  onSlotClick,
  isProcessing
}) => {
  const isSource = rowIndex === activeRowIndex;
  const isTarget = rowIndex === activeRowIndex + 1;
  const isCompleted = rowIndex < activeRowIndex;

  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    const letters = rowData.words;

    // Slots logic for dropping letters
    if (isTarget && selectedLetter && !isProcessing) {
      elements.push(<Slot key="slot-start" onClick={() => onSlotClick(0)} />);
      letters.forEach((letter, index) => {
        elements.push(
          <LetterTile 
            key={letter.id} 
            letter={letter} 
            highlight={letter.isLocked ? 'locked' : 'default'}
          />
        );
        elements.push(<Slot key={`slot-${index + 1}`} onClick={() => onSlotClick(index + 1)} />);
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
            onClick={() => onLetterClick(letter, rowIndex)}
          />
        );
      });
    }
    return elements;
  };

  // Container styling
  let containerClasses = "relative flex flex-nowrap justify-center items-center px-3 py-2 sm:px-4 sm:py-3 rounded-3xl transition-all duration-500 gap-2 sm:gap-3 border-2";
  
  if (isSource) {
    // Active Source: Bright tray
    containerClasses += " bg-white/60 backdrop-blur-md border-purple-300 shadow-xl shadow-purple-200/50 scale-105 z-10";
  } else if (isTarget) {
    // Active Target: Dashed landing pad
    containerClasses += " bg-white/30 border-dashed border-pink-300 scale-100";
  } else if (isCompleted) {
    // History: Faded
    containerClasses += " bg-transparent border-transparent opacity-50 grayscale-[0.3] scale-95";
  } else {
    // Future: Invisible
    containerClasses += " bg-transparent border-transparent opacity-20 scale-90";
  }

  // Label Badge
  const badgeLabel = isSource ? 'PICK' : isTarget ? 'DROP' : null;
  const badgeColor = isSource ? 'bg-purple-500 text-white shadow-purple-300' : 'bg-pink-400 text-white shadow-pink-300';

  return (
    <div className={containerClasses}>
      {/* Floating Label */}
      {badgeLabel && (
        <div className={`
          absolute -left-2 lg:-left-6 top-1/2 -translate-y-1/2 -translate-x-full 
          hidden md:flex items-center justify-center 
          px-3 py-1.5 rounded-full font-black text-[10px] tracking-widest shadow-md transform rotate-[-5deg]
          ${badgeColor}
        `}>
          {badgeLabel}
        </div>
      )}

      {renderContent()}
    </div>
  );
};

const Slot: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div 
    onClick={onClick}
    className="w-10 h-16 sm:w-14 sm:h-20 flex items-center justify-center cursor-pointer group shrink-0 animate-pop"
  >
    <div className="w-full h-full border-4 border-dashed border-pink-300 rounded-2xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 group-hover:border-pink-400 group-hover:-translate-y-1 transition-all">
       <span className="text-pink-300 font-black text-2xl group-hover:scale-110 transition-transform">+</span>
    </div>
  </div>
);
