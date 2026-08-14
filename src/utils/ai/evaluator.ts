import type { BoardState } from '../../types/game';
import { PATTERN_SCORES, evaluatePoint } from './patterns';
import { BOARD_SIZE } from '../../types/game';

export interface EvaluationResult {
  rawScore: number; // Positive = Black, Negative = White
  percentage: number; // 0 to 100 (50 is equal, >50 favors Black, <50 favors White)
  displayText: string; // e.g. "+2.5", "-1.2", "+M1", "0.0"
}

/**
 * Computes live tactical evaluation of the board from Black's perspective.
 */
export function getBoardEvaluation(board: BoardState): EvaluationResult {
  let blackScore = 0;
  let whiteScore = 0;
  let blackMaxThreat = 0;
  let whiteMaxThreat = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'black') {
        const pt = evaluatePoint(board, r, c, 'black');
        blackScore += pt;
        if (pt > blackMaxThreat) blackMaxThreat = pt;
      } else if (board[r][c] === 'white') {
        const pt = evaluatePoint(board, r, c, 'white');
        whiteScore += pt;
        if (pt > whiteMaxThreat) whiteMaxThreat = pt;
      }
    }
  }

  // Raw score relative to Black
  const rawScore = blackScore - whiteScore;

  // Immediate mate/win detection
  if (blackMaxThreat >= PATTERN_SCORES.WIN_FIVE) {
    return {
      rawScore: PATTERN_SCORES.WIN_FIVE,
      percentage: 100,
      displayText: '+M1',
    };
  }
  if (whiteMaxThreat >= PATTERN_SCORES.WIN_FIVE) {
    return {
      rawScore: -PATTERN_SCORES.WIN_FIVE,
      percentage: 0,
      displayText: '-M1',
    };
  }

  if (blackMaxThreat >= PATTERN_SCORES.OPEN_FOUR) {
    return {
      rawScore: PATTERN_SCORES.OPEN_FOUR,
      percentage: 92,
      displayText: '+M2',
    };
  }
  if (whiteMaxThreat >= PATTERN_SCORES.OPEN_FOUR) {
    return {
      rawScore: -PATTERN_SCORES.OPEN_FOUR,
      percentage: 8,
      displayText: '-M2',
    };
  }

  // Smooth sigmoid/tanh scaling: 50% = equal
  // Normal range scores fall between -30000 and +30000
  const normalized = Math.tanh(rawScore / 18000);
  const percentage = Math.max(5, Math.min(95, Math.round(50 + normalized * 45)));

  // Display value in standard chess/gomoku pawn-style units (-9.9 to +9.9)
  const displayVal = (rawScore / 4000);
  let displayText = '0.0';
  if (Math.abs(displayVal) < 0.1) {
    displayText = '0.0';
  } else if (displayVal > 0) {
    displayText = `+${Math.min(9.9, displayVal).toFixed(1)}`;
  } else {
    displayText = `${Math.max(-9.9, displayVal).toFixed(1)}`;
  }

  return {
    rawScore,
    percentage,
    displayText,
  };
}
