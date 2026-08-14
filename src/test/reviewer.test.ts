import { describe, it, expect } from 'vitest';
import { generateGameReview } from '../utils/ai/reviewer';
import { getGodMove } from '../utils/ai/bot';
import { createEmptyBoard, checkWin, checkDraw } from '../utils/gomokuLogic';
import type { BoardState, Move, StoneType } from '../types/game';

describe('Game Review Engine (Chess.com-style)', () => {
  it('should classify opening center move as Book move', () => {
    const moves: Move[] = [
      { row: 7, col: 7, player: 'black', moveNumber: 1, timestamp: Date.now() },
    ];
    const review = generateGameReview(moves);
    expect(review.reviewedMoves.length).toBe(1);
    expect(review.reviewedMoves[0].classification).toBe('book');
    expect(review.blackAccuracy).toBe(100);
  });

  it('should classify multi-move opening book sequences correctly without blunders', () => {
    const moves: Move[] = [
      { row: 7, col: 7, player: 'black', moveNumber: 1, timestamp: Date.now() }, // Tengen
      { row: 7, col: 8, player: 'white', moveNumber: 2, timestamp: Date.now() }, // Direct defense
      { row: 6, col: 8, player: 'black', moveNumber: 3, timestamp: Date.now() }, // Kagetsu
      { row: 7, col: 9, player: 'white', moveNumber: 4, timestamp: Date.now() }, // Kagetsu defense
      { row: 8, col: 7, player: 'black', moveNumber: 5, timestamp: Date.now() }, // Kagetsu fork
    ];
    const review = generateGameReview(moves);
    expect(review.reviewedMoves.length).toBe(5);
    for (const rm of review.reviewedMoves) {
      expect(rm.classification).toBe('book');
    }
    expect(review.blackAccuracy).toBe(100);
    expect(review.whiteAccuracy).toBe(100);
    expect(review.classificationsCount.black.blunder).toBe(0);
    expect(review.classificationsCount.white.blunder).toBe(0);
  });

  it('should identify blunders when player misses immediate 5-in-a-row or open-four block', () => {
    const moves: Move[] = [
      // 1. Black center
      { row: 7, col: 7, player: 'black', moveNumber: 1, timestamp: Date.now() },
      // 2. White adjacent
      { row: 7, col: 8, player: 'white', moveNumber: 2, timestamp: Date.now() },
      // 3. Black builds line
      { row: 6, col: 7, player: 'black', moveNumber: 3, timestamp: Date.now() },
      // 4. White builds line
      { row: 7, col: 9, player: 'white', moveNumber: 4, timestamp: Date.now() },
      // 5. Black builds line
      { row: 5, col: 7, player: 'black', moveNumber: 5, timestamp: Date.now() },
      // 6. White builds line
      { row: 7, col: 10, player: 'white', moveNumber: 6, timestamp: Date.now() },
      // 7. Black builds 4 in a row
      { row: 4, col: 7, player: 'black', moveNumber: 7, timestamp: Date.now() },
      // 8. White plays random blunder at corner instead of blocking Black's 4
      { row: 0, col: 0, player: 'white', moveNumber: 8, timestamp: Date.now() },
    ];

    const review = generateGameReview(moves);
    expect(review.reviewedMoves.length).toBe(8);
    // White's last move at (0,0) must be flagged as a blunder
    const lastMoveReview = review.reviewedMoves[7];
    expect(lastMoveReview.classification).toBe('blunder');
    expect(lastMoveReview.explanation).toContain('Blunder');
  });

  it('should recognize critical defensive blocks as best or brilliant moves', () => {
    const moves: Move[] = [
      { row: 7, col: 7, player: 'black', moveNumber: 1, timestamp: Date.now() },
      { row: 7, col: 8, player: 'white', moveNumber: 2, timestamp: Date.now() },
      { row: 6, col: 7, player: 'black', moveNumber: 3, timestamp: Date.now() },
      { row: 7, col: 9, player: 'white', moveNumber: 4, timestamp: Date.now() },
      { row: 5, col: 7, player: 'black', moveNumber: 5, timestamp: Date.now() },
      { row: 7, col: 10, player: 'white', moveNumber: 6, timestamp: Date.now() },
      { row: 4, col: 7, player: 'black', moveNumber: 7, timestamp: Date.now() }, // Black has 4 in a row
      { row: 8, col: 7, player: 'white', moveNumber: 8, timestamp: Date.now() }, // White critical block at (8,7)
    ];

    const review = generateGameReview(moves);
    const blockReview = review.reviewedMoves[7];
    expect(['best', 'brilliant']).toContain(blockReview.classification);
    expect(blockReview.explanation).toContain('defense');
  });

  it('should review God vs God simulated game with 0 blunders and high accuracy', () => {
    const board: BoardState = createEmptyBoard();
    let currentTurn: StoneType = 'black';
    const moves: Move[] = [];

    for (let i = 0; i < 15; i++) {
      const analysis = getGodMove(board, currentTurn);
      board[analysis.bestMove.row][analysis.bestMove.col] = currentTurn;
      moves.push({
        row: analysis.bestMove.row,
        col: analysis.bestMove.col,
        player: currentTurn,
        moveNumber: i + 1,
        timestamp: Date.now(),
      });

      if (checkWin(board, analysis.bestMove.row, analysis.bestMove.col) || checkDraw(board)) {
        break;
      }
      currentTurn = currentTurn === 'black' ? 'white' : 'black';
    }

    const review = generateGameReview(moves);
    expect(review.classificationsCount.black.blunder).toBe(0);
    expect(review.classificationsCount.white.blunder).toBe(0);
    expect(review.blackAccuracy).toBeGreaterThanOrEqual(90);
    expect(review.whiteAccuracy).toBeGreaterThanOrEqual(90);
  }, 30000);
});
