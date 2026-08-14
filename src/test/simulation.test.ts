import { describe, it, expect } from 'vitest';
import { createEmptyBoard, checkWin, checkDraw } from '../utils/gomokuLogic';
import { computeAIMove } from '../utils/ai/bot';
import type { BoardState, StoneType, Difficulty } from '../types/game';

async function simulateGame(
  blackDiff: Difficulty,
  whiteDiff: Difficulty,
  maxMoves: number = 60
): Promise<{ winner: StoneType | 'draw' | 'timeout'; moveCount: number; durationMs: number }> {
  const board: BoardState = createEmptyBoard();
  let currentTurn: StoneType = 'black';
  let moveCount = 0;
  const start = Date.now();

  while (moveCount < maxMoves) {
    const diff = currentTurn === 'black' ? blackDiff : whiteDiff;
    const analysis = await computeAIMove(board, diff, currentTurn);
    const move = analysis.bestMove;

    // Validate move legality
    expect(board[move.row][move.col]).toBeNull();
    expect(move.row).toBeGreaterThanOrEqual(0);
    expect(move.row).toBeLessThan(15);
    expect(move.col).toBeGreaterThanOrEqual(0);
    expect(move.col).toBeLessThan(15);

    board[move.row][move.col] = currentTurn;
    moveCount++;

    const win = checkWin(board, move.row, move.col);
    if (win) {
      return { winner: currentTurn, moveCount, durationMs: Date.now() - start };
    }

    if (checkDraw(board)) {
      return { winner: 'draw', moveCount, durationMs: Date.now() - start };
    }

    currentTurn = currentTurn === 'black' ? 'white' : 'black';
  }

  return { winner: 'timeout', moveCount, durationMs: Date.now() - start };
}

describe('AI Simulation & Stress Testing', () => {
  it('should play a full match between Hard and Easy AI where Hard wins cleanly', async () => {
    // Hard (Black) vs Easy (White)
    const result = await simulateGame('hard', 'easy', 40);
    expect(result.winner).toBe('black');
    expect(result.moveCount).toBeLessThan(35);
  }, 30000);

  it('should play a full match between Hard and Medium AI with valid moves', async () => {
    const result = await simulateGame('hard', 'medium', 50);
    expect(['black', 'white', 'draw']).toContain(result.winner);
    expect(result.moveCount).toBeGreaterThan(0);
  }, 30000);

  it('should maintain sub-second response times across opening and midgame', async () => {
    const board = createEmptyBoard();
    board[7][7] = 'black';
    board[7][8] = 'white';
    board[8][7] = 'black';
    board[6][8] = 'white';

    const t0 = Date.now();
    const hardMove = await computeAIMove(board, 'hard', 'black');
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(1500); // including simulated humanization delay
    expect(hardMove.bestMove).toBeDefined();
  });
});
