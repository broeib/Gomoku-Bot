import { BOARD_SIZE, WIN_LENGTH } from '../types/game';
import type { BoardState, Position, WinningInfo } from '../types/game';

export const DIRECTIONS: [number, number][] = [
  [0, 1],   // Horizontal
  [1, 0],   // Vertical
  [1, 1],   // Main Diagonal (\)
  [1, -1],  // Anti Diagonal (/)
];

export const STAR_POINTS: Position[] = [
  { row: 3, col: 3 },
  { row: 3, col: 11 },
  { row: 7, col: 7 },
  { row: 11, col: 3 },
  { row: 11, col: 11 },
];

export function createEmptyBoard(): BoardState {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row]);
}

export function isValidPos(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Checks for a win from the most recently placed stone.
 */
export function checkWin(board: BoardState, row: number, col: number): WinningInfo | null {
  const stone = board[row][col];
  if (!stone) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = [{ row, col }];

    // Check positive direction
    let r = row + dr;
    let c = col + dc;
    while (isValidPos(r, c) && board[r][c] === stone) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // Check negative direction
    r = row - dr;
    c = col - dc;
    while (isValidPos(r, c) && board[r][c] === stone) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= WIN_LENGTH) {
      return { winner: stone, line };
    }
  }

  return null;
}

/**
 * Full scan check for winning line anywhere on the board.
 */
export function checkWinFull(board: BoardState): WinningInfo | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) {
        const win = checkWin(board, r, c);
        if (win) return win;
      }
    }
  }
  return null;
}

export function checkDraw(board: BoardState): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

/**
 * Converts row/col indices into standard Gomoku algebraic coordinate (e.g. H8, C3).
 * Columns: A through O
 * Rows: 15 (top) to 1 (bottom)
 */
export function formatCoordinate(row: number, col: number): string {
  const colLetter = String.fromCharCode(65 + col); // A = 65
  const rowNumber = BOARD_SIZE - row;
  return `${colLetter}${rowNumber}`;
}

/**
 * Returns empty cells near existing stones (within given radius) to focus AI search space.
 */
export function getCandidateMoves(board: BoardState, radius: number = 2): Position[] {
  let stoneCount = 0;
  const candidatesMap = new Map<string, Position>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        stoneCount++;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (isValidPos(nr, nc) && board[nr][nc] === null) {
              const key = `${nr},${nc}`;
              if (!candidatesMap.has(key)) {
                candidatesMap.set(key, { row: nr, col: nc });
              }
            }
          }
        }
      }
    }
  }

  if (stoneCount === 0) {
    // Center point (Tengen) is optimal first move
    return [{ row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) }];
  }

  return Array.from(candidatesMap.values());
}
