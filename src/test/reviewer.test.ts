import { describe, it, expect } from 'vitest';
import { generateGameReview } from '../utils/ai/reviewer';
import type { Move } from '../types/game';

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

  it('should calculate realistic accuracy percentages for both players', () => {
    const moves: Move[] = [
      { row: 7, col: 7, player: 'black', moveNumber: 1, timestamp: Date.now() },
      { row: 7, col: 8, player: 'white', moveNumber: 2, timestamp: Date.now() },
      { row: 8, col: 7, player: 'black', moveNumber: 3, timestamp: Date.now() },
      { row: 6, col: 8, player: 'white', moveNumber: 4, timestamp: Date.now() },
    ];
    const review = generateGameReview(moves);
    expect(review.blackAccuracy).toBeGreaterThanOrEqual(50);
    expect(review.blackAccuracy).toBeLessThanOrEqual(100);
    expect(review.whiteAccuracy).toBeGreaterThanOrEqual(50);
    expect(review.whiteAccuracy).toBeLessThanOrEqual(100);
  });
});
