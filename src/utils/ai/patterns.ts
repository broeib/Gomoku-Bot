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

export interface FourThreat {
  move: { row: number; col: number };
  threatPoints: { row: number; col: number }[]; // Points where attacker will win next turn
  isOpenFour: boolean;
}

/**
 * Returns all moves for 'player' that immediately create a 5-in-a-row win.
 */
export function getImmediateWinMoves(
  board: BoardState,
  player: StoneType,
  candidates?: { row: number; col: number }[]
): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = [];
  const searchSpace = candidates || [];
  
  if (searchSpace.length === 0) {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] === null) {
          if (evaluatePoint(board, r, c, player) >= PATTERN_SCORES.WIN_FIVE) {
            moves.push({ row: r, col: c });
          }
        }
      }
    }
  } else {
    for (const pos of searchSpace) {
      if (board[pos.row][pos.col] === null) {
        if (evaluatePoint(board, pos.row, pos.col, player) >= PATTERN_SCORES.WIN_FIVE) {
          moves.push(pos);
        }
      }
    }
  }
  return moves;
}

/**
 * Finds all four-threat forming moves (creating Open 4 or Blocked 4) and their defense points.
 */
export function getFourThreats(
  board: BoardState,
  player: StoneType,
  candidates: { row: number; col: number }[]
): FourThreat[] {
  const threats: FourThreat[] = [];

  for (const pos of candidates) {
    if (board[pos.row][pos.col] !== null) continue;

    // Temporarily place stone
    board[pos.row][pos.col] = player;

    const threatPointsMap = new Map<string, { row: number; col: number }>();
    let isOpenFour = false;

    // Scan all 4 directions from pos
    for (const [dr, dc] of DIRECTIONS) {
      // Check 5-cell windows along this direction
      for (let offset = -4; offset <= 0; offset++) {
        let count = 0;
        let emptyPos: { row: number; col: number } | null = null;
        let valid = true;

        for (let k = 0; k < 5; k++) {
          const r = pos.row + (offset + k) * dr;
          const c = pos.col + (offset + k) * dc;

          if (!isValidPos(r, c)) {
            valid = false;
            break;
          }

          const cell = board[r][c];
          if (cell === player) {
            count++;
          } else if (cell === null) {
            if (emptyPos === null) {
              emptyPos = { row: r, col: c };
            } else {
              valid = false;
              break;
            }
          } else {
            valid = false;
            break;
          }
        }

        if (valid && count === 4 && emptyPos !== null) {
          const key = `${emptyPos.row},${emptyPos.col}`;
          threatPointsMap.set(key, emptyPos);
        }
      }

      // Check if open four in this direction
      const dirScore = evaluatePointDirection(board, pos.row, pos.col, dr, dc, player);
      if (dirScore >= PATTERN_SCORES.OPEN_FOUR) {
        isOpenFour = true;
      }
    }

    // Undo move
    board[pos.row][pos.col] = null;

    if (threatPointsMap.size > 0) {
      threats.push({
        move: pos,
        threatPoints: Array.from(threatPointsMap.values()),
        isOpenFour: isOpenFour || threatPointsMap.size >= 2,
      });
    }
  }

  return threats;
}

export interface ThreeThreat {
  move: { row: number; col: number };
  defensePoints: { row: number; col: number }[];
  isDoubleThree: boolean;
}

/**
 * Finds all Open Three forming moves and their defensive blocking points.
 */
export function getThreeThreats(
  board: BoardState,
  player: StoneType,
  candidates: { row: number; col: number }[]
): ThreeThreat[] {
  const threats: ThreeThreat[] = [];

  for (const pos of candidates) {
    if (board[pos.row][pos.col] !== null) continue;

    board[pos.row][pos.col] = player;

    let openThreeCount = 0;
    const defenseMap = new Map<string, { row: number; col: number }>();

    for (const [dr, dc] of DIRECTIONS) {
      const dirScore = evaluatePointDirection(board, pos.row, pos.col, dr, dc, player);
      if (dirScore >= PATTERN_SCORES.OPEN_THREE) {
        openThreeCount++;

        // Find the ends of this open three
        let r = pos.row + dr;
        let c = pos.col + dc;
        while (isValidPos(r, c) && board[r][c] === player) {
          r += dr;
          c += dc;
        }
        if (isValidPos(r, c) && board[r][c] === null) {
          defenseMap.set(`${r},${c}`, { row: r, col: c });
        }

        r = pos.row - dr;
        c = pos.col - dc;
        while (isValidPos(r, c) && board[r][c] === player) {
          r -= dr;
          c -= dc;
        }
        if (isValidPos(r, c) && board[r][c] === null) {
          defenseMap.set(`${r},${c}`, { row: r, col: c });
        }
      }
    }

    board[pos.row][pos.col] = null;

    if (openThreeCount > 0) {
      threats.push({
        move: pos,
        defensePoints: Array.from(defenseMap.values()),
        isDoubleThree: openThreeCount >= 2,
      });
    }
  }

  return threats;
}

