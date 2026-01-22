
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RowData, Letter, GameState, MoveHistory, PuzzleSolutionStep, Difficulty } from './types';
import { Row } from './components/Row';
import { generateLocalPuzzle, validateWord } from './services/localGenerator';
import { FALLBACK_PUZZLE, FALLBACK_PUZZLE_HARD, COMMON_WORDS } from './constants';

export default function App() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [message, setMessage] = useState<string>("Loading puzzle...");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MoveHistory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [solution, setSolution] = useState<PuzzleSolutionStep[] | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [currentWordLength, setCurrentWordLength] = useState(4);
  const [showRules, setShowRules] = useState(false);

  // Initialize with common words for instant validation
  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));

  useEffect(() => {
     startNewGame('MEDIUM');
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initGame = (words: string[], puzzleHint?: string, puzzleSolution?: PuzzleSolutionStep[], wordLength: number = 4) => {
    const newRows: RowData[] = words.map(word => ({
      id: uuidv4(),
      originalWord: word,
      words: word.split('').map(char => ({
        id: uuidv4(),
        char: char,
        isLocked: false
      }))
    }));
    setRows(newRows);
    setActiveRowIndex(0);
    setSelectedLetter(null);
    setHistory([]);
    setGameState(GameState.PLAYING);
    setMessage("Tap a tile to begin!");
    setError(null);
    setHint(puzzleHint || "");
    setSolution(puzzleSolution);
    setCurrentWordLength(wordLength);
  };

  const startNewGame = async (selectedDifficulty: Difficulty = difficulty) => {
    setGameState(GameState.LOADING);
    setMessage("Mixing up words...");
    setError(null);
    if (selectedDifficulty !== difficulty) {
        setDifficulty(selectedDifficulty);
    }

    try {
      await new Promise(r => setTimeout(r, 600)); // Simulate "Juicy" loading
      const puzzle = await generateLocalPuzzle(selectedDifficulty);
      initGame(puzzle.words, puzzle.hint, puzzle.solution, puzzle.wordLength);
    } catch (localErr) {
      console.log("Local generation failed, using fallback...");
      if (selectedDifficulty === 'HARD') {
          initGame(FALLBACK_PUZZLE_HARD, "Challenge Mode", undefined, 5);
      } else if (selectedDifficulty === 'EASY') {
          initGame(FALLBACK_PUZZLE.slice(0, 3), "Simple Start", undefined, 4);
      } else {
          initGame(FALLBACK_PUZZLE, "Classic Setup", undefined, 4);
      }
    }
  };

  const handleLetterClick = (letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError("Locked letter!");
      return;
    }

    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    } else {
      setSelectedLetter(letter);
      setError(null);
    }
  };

  const shakeError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 1500);
  };

  const checkValidation = (word: string): boolean => {
    // Check local dictionary cache (synchronous and instant)
    return validWordsCache.current.has(word.toUpperCase());
  };

  const handleHint = () => {
    if (gameState !== GameState.PLAYING || isProcessing) return;
    
    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[activeRowIndex + 1].words.map(l => l.char).join("");
    
    const relevantStep = solution?.find(s => 
      s.stepIndex === activeRowIndex && 
      s.sourceWord === currentSourceWord && 
      s.targetWord === currentTargetWord
    );

    if (relevantStep) {
      setMessage(`Try moving: ${relevantStep.letterToMove}`);
    } else {
      setMessage("Try undoing previous moves.");
    }
  };

  const handleSlotClick = async (targetIndex: number) => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return;

    const sourceRow = rows[activeRowIndex];
    const targetRow = rows[activeRowIndex + 1];

    const newSourceLetters = sourceRow.words.filter(l => l.id !== selectedLetter.id);
    const newTargetLetters = [...targetRow.words];
    
    const movedLetter: Letter = { ...selectedLetter, isLocked: true };
    newTargetLetters.splice(targetIndex, 0, movedLetter);

    const sourceWordStr = newSourceLetters.map(l => l.char).join("");
    const targetWordStr = newTargetLetters.map(l => l.char).join("");

    setIsProcessing(true);

    const isStartRow = activeRowIndex === 0;
    const expectedSourceLength = isStartRow ? currentWordLength - 1 : currentWordLength;
    const expectedTargetLength = currentWordLength + 1;
    
    if (sourceWordStr.length !== expectedSourceLength) {
      shakeError(`Source needs ${expectedSourceLength} letters`);
      setIsProcessing(false);
      return;
    }
    
    if (targetWordStr.length !== expectedTargetLength) {
      shakeError(`Target needs ${expectedTargetLength} letters`);
      setIsProcessing(false);
      return;
    }

    // Synchronous local checks
    const isSourceValid = checkValidation(sourceWordStr);
    if (!isSourceValid) {
      shakeError(`"${sourceWordStr}" is not a word!`);
      setIsProcessing(false);
      return;
    }

    const isTargetValid = checkValidation(targetWordStr);
    if (!isTargetValid) {
      shakeError(`"${targetWordStr}" is not a word!`);
      setIsProcessing(false);
      return;
    }

    setHistory(prev => [...prev, { rows: JSON.parse(JSON.stringify(rows)), activeRowIndex }]);

    const newRows = [...rows];
    newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
    newRows[activeRowIndex + 1] = {
      ...targetRow,
      words: newTargetLetters.map(l => ({
        ...l,
        isLocked: l.id === selectedLetter.id
      }))
    };

    setRows(newRows);
    setSelectedLetter(null);
    setError(null);

    const maxMoves = rows.length - 1;
    if (activeRowIndex === maxMoves - 1) {
      const finalWords = newRows.map(r => r.words.map(l => l.char).join(""));
      const uniqueWords = new Set(finalWords);
      if (uniqueWords.size !== newRows.length) {
        setMessage("Solved! (with duplicates)");
        setGameState(GameState.WON); 
      } else {
        setMessage("Sweet Victory!");
        setGameState(GameState.WON);
      }
    } else {
      setActiveRowIndex(prev => prev + 1);
      setMessage("Tasty! Keep going.");
    }
    
    setIsProcessing(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setRows(lastState.rows);
    setActiveRowIndex(lastState.activeRowIndex);
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setMessage("Oops! Let's try that again.");
  };

  return (
    <div className="h-screen w-full flex flex-col items-center relative overflow-hidden">
      
      {/* Top HUD */}
      <header className="w-full max-w-lg px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
            <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
                WORD<span className="text-pink-500">SHIFT</span>
            </h1>
            </div>
            <button 
                onClick={() => setShowRules(true)}
                className="w-8 h-8 rounded-full bg-white text-pink-500 shadow-md flex items-center justify-center text-lg font-black hover:scale-110 transition-transform"
                aria-label="How to play"
            >
                ?
            </button>
        </div>

        <div className="relative group z-50">
           <button className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-lg border-2 border-white text-purple-600 font-bold transition-transform active:scale-95">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-sm uppercase">{difficulty}</span>
              <span className="text-xs opacity-50">▼</span>
           </button>
           <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-2 hidden group-hover:block animate-pop">
               {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                   <button 
                       key={d}
                       onClick={() => startNewGame(d)}
                       className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold mb-1 ${difficulty === d ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-50'}`}
                   >
                       {d}
                   </button>
               ))}
           </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-lg px-2 flex flex-col justify-center relative z-10 pb-20">
        
        {/* Toast Notification */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className={`
              px-6 py-3 rounded-full shadow-xl transition-all duration-300 transform border-2
              ${error ? 'bg-red-400 border-red-500 text-white rotate-1' : 'bg-white border-white text-purple-600'}
              ${!error && !message ? '-translate-y-10 opacity-0' : 'translate-y-2 opacity-100'}
            `}>
                <span className="text-sm font-black tracking-wide">
                   {error || message}
                </span>
            </div>
        </div>

        {/* Loading Spinner */}
        {(gameState === GameState.LOADING || isProcessing) && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-white/50 backdrop-blur-sm rounded-3xl">
             <div className="w-16 h-16 border-8 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Game Grid */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <Row
              key={row.id}
              rowData={row}
              rowIndex={idx}
              activeRowIndex={activeRowIndex}
              selectedLetter={selectedLetter}
              onLetterClick={handleLetterClick}
              onSlotClick={handleSlotClick}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </main>

      {/* How to Play Modal */}
      {showRules && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-purple-900/40 backdrop-blur-sm p-6 animate-pop" onClick={() => setShowRules(false)}>
            <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full shadow-2xl relative border-b-8 border-purple-100" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 font-bold">✕</button>
                
                <h2 className="text-2xl font-black text-purple-600 mb-6 text-center">
                    HOW TO PLAY
                </h2>
                
                <div className="space-y-6">
                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-500 flex items-center justify-center font-black shrink-0 border-b-4 border-pink-200">1</div>
                        <div>
                            <p className="text-slate-700 font-bold">Pick a Letter</p>
                            <p className="text-slate-400 text-xs">Tap a candy tile in the bright active row.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-500 flex items-center justify-center font-black shrink-0 border-b-4 border-sky-200">2</div>
                        <div>
                            <p className="text-slate-700 font-bold">Drop it Down</p>
                            <p className="text-slate-400 text-xs">Tap a slot below to move it.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center font-black shrink-0 border-b-4 border-amber-200">3</div>
                        <div>
                            <p className="text-slate-700 font-bold">Make Words</p>
                            <p className="text-slate-400 text-xs">Both words created must be valid!</p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setShowRules(false)} 
                    className="w-full mt-8 py-4 bg-purple-500 text-white rounded-2xl font-black text-lg tracking-wide shadow-lg border-b-4 border-purple-700 active:border-b-0 active:translate-y-1 transition-all"
                >
                    GOT IT!
                </button>
            </div>
        </div>
      )}

      {/* Victory Modal */}
      {gameState === GameState.WON && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md animate-pop">
            <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-pink-100">
              <div className="text-7xl mb-4 animate-bounce-gentle">🧁</div>
              <h2 className="text-3xl font-black text-pink-500 mb-2">DELICIOUS!</h2>
              <p className="text-slate-400 font-bold mb-8">Puzzle Completed</p>
              <button 
                onClick={() => startNewGame()}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-black text-lg shadow-xl border-b-4 border-purple-700 active:border-b-0 active:translate-y-1 transition-all"
              >
                NEXT LEVEL
              </button>
            </div>
          </div>
      )}

      {/* Bottom Controls (Thumb Zone) */}
      <div className="w-full max-w-lg px-6 pb-10 pt-4 z-20">
         <div className="grid grid-cols-3 gap-4">
             <CandyButton 
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />}
                label="UNDO" 
                color="bg-amber-400"
                borderColor="border-amber-600"
                onClick={handleUndo} 
                disabled={history.length === 0 || gameState === GameState.WON} 
             />
             <CandyButton 
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />}
                label="HINT" 
                color="bg-sky-400"
                borderColor="border-sky-600"
                onClick={handleHint} 
                disabled={gameState !== GameState.PLAYING} 
             />
             <CandyButton 
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                label="RESET" 
                color="bg-red-400"
                borderColor="border-red-600"
                onClick={() => startNewGame()} 
             />
         </div>
      </div>
      
    </div>
  );
}

// Reusable "Candy" Action Button
const CandyButton: React.FC<{ 
  onClick: () => void, 
  icon: React.ReactNode, 
  disabled?: boolean, 
  label: string,
  color: string,
  borderColor: string
}> = ({ onClick, icon, disabled, label, color, borderColor }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className={`
        w-16 h-16 rounded-2xl ${color} ${borderColor} border-b-[6px] 
        group-active:border-b-0 group-active:translate-y-[6px] transition-all 
        flex items-center justify-center text-white shadow-xl
    `}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-7 h-7 drop-shadow-md">
            {icon}
        </svg>
    </div>
    <span className="text-[11px] font-black tracking-wider text-slate-400 group-hover:text-slate-600">{label}</span>
  </button>
);
