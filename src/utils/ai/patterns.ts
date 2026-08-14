import type { BoardState, StoneType } from '../../types/game';
import { DIRECTIONS, isValidPos } from '../gomokuLogic';

export const PATTERN_SCORES = {
  WIN_FIVE: 100000000,    // 5 in a row
  OPEN_FOUR: 5000000,     // 0XXXX0 (Unstoppable win)
  BLOCKED_FOUR: 200000,   // 2XXXX0 or X0XXX or XX0XX
  OPEN_THREE: 50000,      // 0XXX0_ or 0X0XX0 (Will become open 4)
  BLOCKED_THREE: 3000,    // 2XXX00
  OPEN_TWO: 800,          // 0XX00
  BLOCKED_TWO: 100,       // 2XX00
  OPEN_ONE: 20,           // 0X0
};

/**
 * Fast pattern evaluator for a single line from a position in both positive and negative directions.
 */
export function evaluatePointDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: StoneType
): number {
  let count = 1; // current stone
  let openEnds = 0;
  let emptyBefore = 0;
  let emptyAfter = 0;

  // Scan positive direction
  let r = row + dr;
  let c = col + dc;
  while (isValidPos(r, c) && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  if (isValidPos(r, c) && board[r][c] === null) {
    openEnds++;
    // Count consecutive empty spaces for space potential
    let er = r;
    let ec = c;
    while (isValidPos(er, ec) && board[er][ec] === null && emptyAfter < 4) {
      emptyAfter++;
      er += dr;
      ec += dc;
    }
  }

  // Scan negative direction
  r = row - dr;
  c = col - dc;
  while (isValidPos(r, c) && board[r][c] === player) {
    count++;
    r -= dr;
    c -= dc;
  }
  if (isValidPos(r, c) && board[r][c] === null) {
    openEnds++;
    let er = r;
    let ec = c;
    while (isValidPos(er, ec) && board[er][ec] === null && emptyBefore < 4) {
      emptyBefore++;
      er -= dr;
      ec -= dc;
    }
  }

  // Check if total space (stone count + open spaces) can make 5
  const totalSpace = count + emptyBefore + emptyAfter;
  if (totalSpace < 5 && count < 5) {
    return 0; // Dead line that cannot reach 5 in a row
  }

  // 5 or more in a row
  if (count >= 5) {
    return PATTERN_SCORES.WIN_FIVE;
  }

  // 4 in a row
  if (count === 4) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_FOUR;
    if (openEnds === 1) return PATTERN_SCORES.BLOCKED_FOUR;
    return 0;
  }

  // 3 in a row
  if (count === 3) {
    if (openEnds === 2) {
      return PATTERN_SCORES.OPEN_THREE;
    }
    if (openEnds === 1) {
      return PATTERN_SCORES.BLOCKED_THREE;
    }
    return 0;
  }

  // 2 in a row
  if (count === 2) {
    if (openEnds === 2) return PATTERN_SCORES.OPEN_TWO;
    if (openEnds === 1) return PATTERN_SCORES.BLOCKED_TWO;
    return 0;
  }

  // 1 stone with room to expand
  if (count === 1 && openEnds >= 1 && totalSpace >= 5) {
    return PATTERN_SCORES.OPEN_ONE;
  }

  return 0;
}

/**
 * Checks jump patterns (e.g. XX_XX, X_XXX) around a placed stone
 */
function evaluateJumpPatterns(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: StoneType
): number {
  // Check 5-cell window centered on (row, col)
  let score = 0;

  for (let offset = -4; offset <= 0; offset++) {
    let myStones = 0;
    let emptySpaces = 0;
    let hasOpponent = false;

    for (let k = 0; k < 5; k++) {
      const currR = row + (offset + k) * dr;
      const currC = col + (offset + k) * dc;

      if (!isValidPos(currR, currC)) {
        hasOpponent = true;
        break;
      }

      const cell = (currR === row && currC === col) ? player : board[currR][currC];
      if (cell === player) {
        myStones++;
      } else if (cell === null) {
        emptySpaces++;
      } else {
        hasOpponent = true;
        break;
      }
    }

    if (!hasOpponent) {
      if (myStones === 4 && emptySpaces === 1) {
        // e.g. XX_XX or X_XXX
        score = Math.max(score, PATTERN_SCORES.BLOCKED_FOUR * 0.9);
      } else if (myStones === 3 && emptySpaces === 2) {
        // e.g. X_X_X or XX__X
        score = Math.max(score, PATTERN_SCORES.BLOCKED_THREE * 0.8);
      }
    }
  }

  return score;
}

/**
 * Calculates strategic positional value of placing a stone at (row, col).
 */
export function evaluatePoint(
  board: BoardState,
  row: number,
  col: number,
  player: StoneType
): number {
  let totalScore = 0;
  let openFourCount = 0;
  let blockedFourCount = 0;
  let openThreeCount = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const dirScore = evaluatePointDirection(board, row, col, dr, dc, player);
    const jumpScore = evaluateJumpPatterns(board, row, col, dr, dc, player);
    const bestScore = Math.max(dirScore, jumpScore);

    if (bestScore >= PATTERN_SCORES.WIN_FIVE) {
      return PATTERN_SCORES.WIN_FIVE;
    }
    if (bestScore >= PATTERN_SCORES.OPEN_FOUR) {
      openFourCount++;
    } else if (bestScore >= PATTERN_SCORES.BLOCKED_FOUR * 0.8) {
      blockedFourCount++;
    } else if (bestScore >= PATTERN_SCORES.OPEN_THREE * 0.8) {
      openThreeCount++;
    }

    totalScore += bestScore;
  }

  // Combinations (Double Threat)
  // Double Open Three is basically an unstoppable win
  if (openThreeCount >= 2) {
    totalScore += PATTERN_SCORES.OPEN_FOUR * 0.85;
  }
  // Four + Three combination
  if (blockedFourCount >= 1 && openThreeCount >= 1) {
    totalScore += PATTERN_SCORES.OPEN_FOUR * 0.9;
  }
  // Double Four
  if (blockedFourCount >= 2) {
    totalScore += PATTERN_SCORES.OPEN_FOUR * 0.95;
  }

  // Centrality bonus: Center is (7,7)
  const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
  totalScore += Math.max(0, 14 - centerDist) * 3;

  return totalScore;
}
