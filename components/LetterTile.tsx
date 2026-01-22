
import React from 'react';
import { Letter } from '../types';

interface LetterTileProps {
  letter: Letter;
  onClick?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
}

export const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  onClick,
  isSelected,
  isInteractable,
  highlight = 'default',
}) => {
  
  // Base dimensions 
  const baseClasses = "relative flex items-center justify-center w-12 h-14 sm:w-16 sm:h-20 rounded-2xl transition-all duration-200 select-none animate-pop z-10";
  
  // Font styling - softer, rounder, colorful
  const fontClasses = "text-2xl sm:text-3xl font-black z-20";

  let visualClasses = "";
  let textClasses = "";
  let depthClasses = "";
  let shineOpacity = "opacity-30";

  if (highlight === 'locked') {
    // Locked: Frozen/Ice look
    visualClasses = "bg-slate-200 border-b-4 border-slate-300";
    textClasses = "text-slate-400";
    depthClasses = ""; 
    shineOpacity = "opacity-10";
  } 
  else if (isSelected) {
    // Selected: Bright Pink Candy, Pressed Down
    visualClasses = "bg-pink-500 border-b-0 border-pink-700 translate-y-1";
    textClasses = "text-white drop-shadow-sm";
    depthClasses = "shadow-inner"; // Inner shadow for pressed look
    shineOpacity = "opacity-20";
  } 
  else if (isInteractable && highlight === 'source') {
    // Source (Pickable): Bright Purple Candy, High 3D
    visualClasses = "bg-white border-b-[6px] border-purple-200 hover:-translate-y-1 hover:border-b-[8px] active:border-b-0 active:translate-y-1 transition-all cursor-pointer";
    textClasses = "text-purple-600";
    depthClasses = "shadow-lg shadow-purple-500/20";
    shineOpacity = "opacity-50";
  } 
  else if (highlight === 'default') {
    // Dropped/Target: Clean White/Cream
    visualClasses = "bg-white border-b-4 border-slate-200";
    textClasses = "text-slate-600";
    depthClasses = "shadow-md shadow-slate-400/10";
  }
  else {
    // History: Muted, settled
    visualClasses = "bg-white/80 border-b-2 border-slate-100 opacity-80";
    textClasses = "text-slate-400";
    depthClasses = "";
  }

  return (
    <div
      onClick={isInteractable || isSelected ? onClick : undefined}
      className={`${baseClasses} ${visualClasses} ${depthClasses}`}
    >
      <span className={`${fontClasses} ${textClasses}`}>
        {letter.char}
      </span>
      
      {/* Glossy Shine - The "Candy" Luster */}
      <div className={`absolute top-2 left-2 right-2 h-1/3 bg-gradient-to-b from-white to-transparent rounded-t-xl pointer-events-none ${shineOpacity}`} />
      
      {/* Specular Dot */}
      {(isInteractable || isSelected) && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-60 pointer-events-none" />
      )}

      {/* Lock Icon */}
      {highlight === 'locked' && (
        <div className="absolute -bottom-1 -right-1 bg-slate-300 rounded-full p-1 border-2 border-white shadow-sm z-30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};
