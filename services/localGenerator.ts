
import { WORDS_3, WORDS_4, WORDS_5, WORDS_6, COMMON_WORDS } from '../constants';
import { PuzzleConfig, PuzzleSolutionStep, Difficulty } from '../types';

// Organize sets for dynamic access
const WORD_SETS: Record<number, Set<string>> = {
  3: new Set(WORDS_3),
  4: new Set(WORDS_4),
  5: new Set(WORDS_5),
  6: new Set(WORDS_6),
};

export const validateWord = (word: string): boolean => {
  return COMMON_WORDS.has(word.toUpperCase());
};

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

interface PathNode {
  word: string; 
  tempState?: string; 
  letterReceived?: string;
  letterToGive?: string;
}

interface GenState {
  startTime: number;
  lastYieldTime: number;
}

export const generateLocalPuzzle = async (difficulty: Difficulty = 'MEDIUM'): Promise<PuzzleConfig> => {
  // Config based on difficulty
  const targetRows = difficulty === 'EASY' ? 3 : difficulty === 'MEDIUM' ? 4 : 5;
  const wordLength = difficulty === 'HARD' ? 5 : 4; 

  // Select dictionaries based on word length
  const dicts = {
    min: WORD_SETS[wordLength - 1],
    base: WORD_SETS[wordLength],
    max: WORD_SETS[wordLength + 1],
    baseArray: Array.from(WORD_SETS[wordLength]) // For shuffling candidates
  };

  const attempts = 100; // Increased attempts significantly as performance is better
  const candidatesW1 = shuffle(dicts.baseArray);

  const GLOBAL_TIMEOUT = 5000; // 5 seconds max for local generation
  const state: GenState = {
    startTime: Date.now(),
    lastYieldTime: Date.now()
  };

  for (let i = 0; i < Math.min(attempts, candidatesW1.length); i++) {
    if (Date.now() - state.startTime > GLOBAL_TIMEOUT) break;
    
    const w1 = candidatesW1[i];
    
    // Start DFS
    const path = await findPath(
      [{ word: w1, tempState: w1 }], 
      targetRows, 
      new Set([w1]), 
      dicts,
      GLOBAL_TIMEOUT,
      state
    );

    if (path) {
      // Convert path to solution format
      const words = path.map(n => n.word);
      const solution: PuzzleSolutionStep[] = [];

      for (let s = 0; s < path.length - 1; s++) {
        const sourceNode = path[s];
        const targetNode = path[s + 1];
        
        solution.push({
          stepIndex: s,
          sourceWord: sourceNode.word,
          targetWord: targetNode.word,
          letterToMove: sourceNode.letterToGive!,
          explanation: `Move ${sourceNode.letterToGive} from ${sourceNode.word} to ${targetNode.word}.`
        });
      }

      return {
        words,
        hint: `Start by shifting '${solution[0].letterToMove}'`,
        solution,
        wordLength
      };
    }
  }

  throw new Error("Could not generate valid puzzle locally");
};

/**
 * Recursive Depth-First Search
 */
async function findPath(
  chain: PathNode[], 
  targetDepth: number, 
  usedWords: Set<string>,
  dicts: { min: Set<string>, base: Set<string>, max: Set<string>, baseArray: string[] },
  timeoutLimit: number,
  state: GenState
): Promise<PathNode[] | null> {
  // Strict Timeout Check
  const now = Date.now();
  if (now - state.startTime > timeoutLimit) {
      return null;
  }
  
  // Smart Yielding: Only yield if we've been blocking the thread for > 15ms
  if (now - state.lastYieldTime > 15) {
     await new Promise(resolve => setTimeout(resolve, 0));
     state.lastYieldTime = Date.now();
  }

  const currentDepth = chain.length;
  
  if (currentDepth === targetDepth) {
    return chain;
  }

  const currentNode = chain[currentDepth - 1];
  const currentTempWord = currentNode.tempState!; 

  // 1. Find all valid letters we can remove
  const validMoves: { charToMove: string, remainder: string }[] = [];
  
  for (let j = 0; j < currentTempWord.length; j++) {
    const charToMove = currentTempWord[j];
    
    // Constraint: Don't move the letter just received
    if (currentNode.letterReceived && charToMove === currentNode.letterReceived) continue;

    const remainder = currentTempWord.slice(0, j) + currentTempWord.slice(j + 1);
    
    // If Depth 1 (Start Row), remainder must be MIN length
    // If Depth > 1 (Middle Row), remainder must be BASE length (settles back to base)
    const isValidRemainder = currentDepth === 1 ? dicts.min.has(remainder) : dicts.base.has(remainder);
    
    if (isValidRemainder) {
      // STRICT UNIQUENESS: The remainder must not have appeared anywhere else in the puzzle history
      if (usedWords.has(remainder)) {
          continue; 
      }
      validMoves.push({ charToMove, remainder });
    }
  }
  
  shuffle(validMoves);

  // 2. Try to extend the chain
  for (const move of validMoves) {
    if (Date.now() - state.startTime > timeoutLimit) return null;

    const { charToMove, remainder } = move;

    // Iterate through valid BASE words to see if they can accept the letter
    const potentialNextWords: { word: string, tempState: string }[] = [];
    
    // Optimization: Filter base array to only those that can form a valid max word with the char
    // We can't pre-calculate everything, but we can fast-fail.
    
    // Scan candidates
    for (const w of dicts.baseArray) {
        if (usedWords.has(w)) continue;

        // Check if w + charToMove makes a valid MAX length word
        let foundMatch = false;
        let validTempState = "";

        // Check insertion positions
        for(let k=0; k<=w.length; k++) {
            const combined = w.slice(0, k) + charToMove + w.slice(k);
            if (dicts.max.has(combined)) {
                if (usedWords.has(combined)) continue;
                foundMatch = true;
                validTempState = combined;
                break; 
            }
        }
        
        if (foundMatch) {
            potentialNextWords.push({ word: w, tempState: validTempState });
        }
    }

    shuffle(potentialNextWords);
    // Keep breadth reasonable - slightly larger breadth since we are faster now
    const candidatesToExplore = potentialNextWords.slice(0, 25);

    for (const nextCandidate of candidatesToExplore) {
        if (Date.now() - state.startTime > timeoutLimit) return null;

        const updatedCurrentNode = { ...currentNode, letterToGive: charToMove };
        const newChain = [...chain.slice(0, -1), updatedCurrentNode];

        const nextNode: PathNode = {
          word: nextCandidate.word,
          tempState: nextCandidate.tempState,
          letterReceived: charToMove
        };

        const newUsed = new Set(usedWords);
        newUsed.add(remainder); 
        newUsed.add(nextCandidate.word);
        newUsed.add(nextCandidate.tempState); 

        const result = await findPath([...newChain, nextNode], targetDepth, newUsed, dicts, timeoutLimit, state);
        if (result) return result;
    }
  }

  return null;
}
