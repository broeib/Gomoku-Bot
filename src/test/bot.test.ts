import { describe, it, expect } from 'vitest';
import { computeAIMove, getHint } from '../utils/ai/bot';
import { getZobristHash, minimaxAlphaBeta, evaluateBoard, getOrderedCandidates } from '../utils/ai/minimax';
import { createEmptyBoard, cloneBoard } from '../utils/gomokuLogic';

describe('Gomoku AI & Minimax Engine', () => {
  describe('Zobrist Hashing & Transposition', () => {
    it('should generate identical hash for identical boards', () => {
      const b1 = createEmptyBoard();
      b1[7][7] = 'black';
      b1[7][8] = 'white';

      const b2 = createEmptyBoard();
      b2[7][7] = 'black';
      b2[7][8] = 'white';

      expect(getZobristHash(b1)).toBe(getZobristHash(b2));
    });

    it('should generate different hash for different boards', () => {
      const b1 = createEmptyBoard();
      b1[7][7] = 'black';

      const b2 = createEmptyBoard();
      b2[7][8] = 'black';

      expect(getZobristHash(b1)).not.toBe(getZobristHash(b2));
    });
  });

  describe('Move Ordering & Candidate Ranking', () => {
    it('should place immediate winning move first in ordered candidates', () => {
      const board = createEmptyBoard();
      board[7][3] = 'white';
      board[7][4] = 'white';
      board[7][5] = 'white';
      board[7][6] = 'white';

      const candidates = getOrderedCandidates(board, 'white');
      expect(candidates.length).toBeGreaterThan(0);
      // (7,7) or (7,2) should be the first choice
      const topMove = candidates[0];
      expect(topMove.row).toBe(7);
      expect([2, 7]).toContain(topMove.col);
    });

    it('should place urgent defensive block first when opponent has 4-in-a-row', () => {
      const board = createEmptyBoard();
      board[7][3] = 'black';
      board[7][4] = 'black';
      board[7][5] = 'black';
      board[7][6] = 'black';

      // White evaluating move order must prioritize blocking at (7,7) or (7,2)
      const candidates = getOrderedCandidates(board, 'white');
      expect(candidates.length).toBeGreaterThan(0);
      const topMove = candidates[0];
      expect(topMove.row).toBe(7);
      expect([2, 7]).toContain(topMove.col);
    });
  });

  describe('Minimax Alpha-Beta', () => {
    it('should find immediate 1-ply winning move at depth 2', () => {
      const board = createEmptyBoard();
      board[7][3] = 'white';
      board[7][4] = 'white';
      board[7][5] = 'white';
      board[7][6] = 'white';

      const searchBoard = cloneBoard(board);
      const result = minimaxAlphaBeta(
        searchBoard,
        2,
        -Infinity,
        Infinity,
        true,
        'white',
        Date.now(),
        1000
      );

      expect(result.bestMove).toBeDefined();
      expect(result.bestMove?.row).toBe(7);
      expect([2, 7]).toContain(result.bestMove?.col);
      expect(result.score).toBeGreaterThan(1000000);
    });

    it('should block opponent win at depth 2', () => {
      const board = createEmptyBoard();
      // Black has 4 stones
      board[7][3] = 'black';
      board[7][4] = 'black';
      board[7][5] = 'black';
      board[7][6] = 'black';

      const searchBoard = cloneBoard(board);
      const result = minimaxAlphaBeta(
        searchBoard,
        2,
        -Infinity,
        Infinity,
        true,
        'white',
        Date.now(),
        1000
      );

      expect(result.bestMove).toBeDefined();
      expect(result.bestMove?.row).toBe(7);
      expect([2, 7]).toContain(result.bestMove?.col);
    });

    it('should evaluate full board relative to player', () => {
      const board = createEmptyBoard();
      board[7][7] = 'black';
      board[7][8] = 'black';
      const evalForBlack = evaluateBoard(board, 'black');
      const evalForWhite = evaluateBoard(board, 'white');

      expect(evalForBlack).toBeGreaterThan(0);
      expect(evalForWhite).toBeLessThan(0);
    });
  });

  describe('Bot Difficulty Modes (computeAIMove)', () => {
    it('Easy Bot should return valid move and explanation', async () => {
      const board = createEmptyBoard();
      board[7][7] = 'black';

      const res = await computeAIMove(board, 'easy', 'white');
      expect(res.bestMove).toBeDefined();
      expect(res.bestMove.row).toBeGreaterThanOrEqual(0);
      expect(res.bestMove.row).toBeLessThan(15);
      expect(res.bestMove.col).toBeGreaterThanOrEqual(0);
      expect(res.bestMove.col).toBeLessThan(15);
      expect(board[res.bestMove.row][res.bestMove.col]).toBeNull();
      expect(res.explanation).toBeTruthy();
    });

    it('Medium Bot should seize open win immediately', async () => {
      const board = createEmptyBoard();
      board[7][3] = 'white';
      board[7][4] = 'white';
      board[7][5] = 'white';
      board[7][6] = 'white';

      const res = await computeAIMove(board, 'medium', 'white');
      expect(res.bestMove.row).toBe(7);
      expect([2, 7]).toContain(res.bestMove.col);
      expect(res.explanation).toContain('5-in-a-row');
    });

    it('Hard Bot should seize open win immediately with Minimax', async () => {
      const board = createEmptyBoard();
      board[4][4] = 'white';
      board[5][5] = 'white';
      board[6][6] = 'white';
      board[7][7] = 'white';

      const res = await computeAIMove(board, 'hard', 'white');
      expect([
        { row: 3, col: 3 },
        { row: 8, col: 8 },
      ]).toContainEqual(res.bestMove);
      expect(res.depth).toBeGreaterThanOrEqual(1);
    });

    it('Hard Bot should block opponent threat on empty board opening with center', async () => {
      const board = createEmptyBoard();
      const res = await computeAIMove(board, 'hard', 'black');
      expect(res.bestMove).toEqual({ row: 7, col: 7 });
    });
  });

  describe('Hint System', () => {
    it('getHint should suggest winning tactical move', () => {
      const board = createEmptyBoard();
      board[7][3] = 'black';
      board[7][4] = 'black';
      board[7][5] = 'black';
      board[7][6] = 'black';

      const hint = getHint(board, 'black');
      expect(hint.bestMove.row).toBe(7);
      expect([2, 7]).toContain(hint.bestMove.col);
      expect(hint.explanation).toBeTruthy();
    });
  });
});
