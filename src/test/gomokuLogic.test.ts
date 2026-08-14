import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  cloneBoard,
  formatCoordinate,
  checkWin,
  checkWinFull,
  checkDraw,
  getCandidateMoves,
  isValidPos,
} from '../utils/gomokuLogic';
import { BOARD_SIZE } from '../types/game';

describe('Gomoku Core Logic', () => {
  it('should initialize an empty 15x15 board', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(15);
    expect(board[0].length).toBe(15);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(board[r][c]).toBeNull();
      }
    }
  });

  it('should clone board immutably', () => {
    const board = createEmptyBoard();
    board[7][7] = 'black';
    const cloned = cloneBoard(board);
    expect(cloned[7][7]).toBe('black');

    cloned[7][7] = 'white';
    expect(board[7][7]).toBe('black'); // original unaffected
  });

  it('should validate positions accurately', () => {
    expect(isValidPos(0, 0)).toBe(true);
    expect(isValidPos(14, 14)).toBe(true);
    expect(isValidPos(7, 7)).toBe(true);
    expect(isValidPos(-1, 5)).toBe(false);
    expect(isValidPos(15, 0)).toBe(false);
    expect(isValidPos(0, 15)).toBe(false);
  });

  it('should format coordinates in standard Go/Gomoku notation', () => {
    // Top-left (0,0) is A15
    expect(formatCoordinate(0, 0)).toBe('A15');
    // Center (7,7) is H8
    expect(formatCoordinate(7, 7)).toBe('H8');
    // Bottom-right (14,14) is O1
    expect(formatCoordinate(14, 14)).toBe('O1');
    // Row 14, Col 0 is A1
    expect(formatCoordinate(14, 0)).toBe('A1');
  });

  describe('Win Detection', () => {
    it('should detect horizontal win (5 in a row)', () => {
      const board = createEmptyBoard();
      // Place 5 black stones horizontally at row 7, cols 3..7
      for (let c = 3; c <= 7; c++) {
        board[7][c] = 'black';
      }
      const win = checkWin(board, 7, 7);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('black');
      expect(win?.line.length).toBe(5);
    });

    it('should detect vertical win (5 in a column)', () => {
      const board = createEmptyBoard();
      // Place 5 white stones vertically at col 4, rows 2..6
      for (let r = 2; r <= 6; r++) {
        board[r][4] = 'white';
      }
      const win = checkWin(board, 6, 4);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('white');
      expect(win?.line.length).toBe(5);
    });

    it('should detect main diagonal win (top-left to bottom-right)', () => {
      const board = createEmptyBoard();
      for (let i = 0; i < 5; i++) {
        board[3 + i][3 + i] = 'black';
      }
      const win = checkWin(board, 5, 5);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('black');
      expect(win?.line.length).toBe(5);
    });

    it('should detect anti diagonal win (top-right to bottom-left)', () => {
      const board = createEmptyBoard();
      for (let i = 0; i < 5; i++) {
        board[2 + i][10 - i] = 'white';
      }
      const win = checkWin(board, 4, 8);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('white');
      expect(win?.line.length).toBe(5);
    });

    it('should detect win on board boundaries and edges', () => {
      const board = createEmptyBoard();
      // Top edge
      for (let c = 0; c < 5; c++) {
        board[0][c] = 'black';
      }
      const win = checkWin(board, 0, 0);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('black');

      // Right edge
      for (let r = 10; r < 15; r++) {
        board[r][14] = 'white';
      }
      const win2 = checkWin(board, 14, 14);
      expect(win2).not.toBeNull();
      expect(win2?.winner).toBe('white');
    });

    it('should detect overline (6 in a row) as win in standard Gomoku', () => {
      const board = createEmptyBoard();
      for (let c = 2; c <= 7; c++) {
        board[5][c] = 'black';
      }
      const win = checkWin(board, 5, 4);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('black');
      expect(win?.line.length).toBe(6);
    });

    it('should NOT report win for 4 in a row', () => {
      const board = createEmptyBoard();
      for (let c = 3; c <= 6; c++) {
        board[7][c] = 'black';
      }
      const win = checkWin(board, 7, 5);
      expect(win).toBeNull();
    });

    it('should NOT report win for broken lines', () => {
      const board = createEmptyBoard();
      board[7][2] = 'black';
      board[7][3] = 'black';
      board[7][4] = null; // gap
      board[7][5] = 'black';
      board[7][6] = 'black';
      const win = checkWin(board, 7, 3);
      expect(win).toBeNull();
    });

    it('checkWinFull should find winning line anywhere on board', () => {
      const board = createEmptyBoard();
      for (let r = 1; r <= 5; r++) {
        board[r][1] = 'white';
      }
      const win = checkWinFull(board);
      expect(win).not.toBeNull();
      expect(win?.winner).toBe('white');
    });
  });

  describe('Draw Detection', () => {
    it('should return false for empty or partially filled boards', () => {
      const board = createEmptyBoard();
      expect(checkDraw(board)).toBe(false);

      board[7][7] = 'black';
      expect(checkDraw(board)).toBe(false);
    });

    it('should return true when all 225 cells are occupied', () => {
      const board = createEmptyBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          board[r][c] = (r + c) % 2 === 0 ? 'black' : 'white';
        }
      }
      expect(checkDraw(board)).toBe(true);
    });
  });

  describe('Candidate Moves Generation', () => {
    it('should return center (7,7) on completely empty board', () => {
      const board = createEmptyBoard();
      const candidates = getCandidateMoves(board);
      expect(candidates.length).toBe(1);
      expect(candidates[0]).toEqual({ row: 7, col: 7 });
    });

    it('should return cells surrounding placed stones within radius', () => {
      const board = createEmptyBoard();
      board[7][7] = 'black';
      const candidates = getCandidateMoves(board, 1);
      // 8 neighbor cells around (7,7)
      expect(candidates.length).toBe(8);
      expect(candidates.every(c => Math.abs(c.row - 7) <= 1 && Math.abs(c.col - 7) <= 1)).toBe(true);
      expect(candidates.some(c => c.row === 7 && c.col === 7)).toBe(false);
    });
  });
});
