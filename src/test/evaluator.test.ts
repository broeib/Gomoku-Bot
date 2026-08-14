import { describe, it, expect } from 'vitest';
import { getBoardEvaluation } from '../utils/ai/evaluator';
import { createEmptyBoard } from '../utils/gomokuLogic';

describe('Board Evaluator & Advantage Normalizer', () => {
  it('should return 50% / 0.0 for an empty board', () => {
    const board = createEmptyBoard();
    const evalResult = getBoardEvaluation(board);
    expect(evalResult.rawScore).toBe(0);
    expect(evalResult.percentage).toBe(50);
    expect(evalResult.displayText).toBe('0.0');
  });

  it('should report +M1 and 100% when Black has 5 in a row', () => {
    const board = createEmptyBoard();
    for (let c = 3; c <= 7; c++) {
      board[7][c] = 'black';
    }
    const evalResult = getBoardEvaluation(board);
    expect(evalResult.displayText).toBe('+M1');
    expect(evalResult.percentage).toBe(100);
  });

  it('should report -M1 and 0% when White has 5 in a row', () => {
    const board = createEmptyBoard();
    for (let r = 2; r <= 6; r++) {
      board[r][4] = 'white';
    }
    const evalResult = getBoardEvaluation(board);
    expect(evalResult.displayText).toBe('-M1');
    expect(evalResult.percentage).toBe(0);
  });

  it('should report +M2 when Black has an unstoppable Open-Four', () => {
    const board = createEmptyBoard();
    // 0XXXX0
    board[7][4] = 'black';
    board[7][5] = 'black';
    board[7][6] = 'black';
    board[7][7] = 'black';
    const evalResult = getBoardEvaluation(board);
    expect(evalResult.displayText).toBe('+M2');
    expect(evalResult.percentage).toBeGreaterThanOrEqual(90);
  });

  it('should report -M2 when White has an unstoppable Open-Four', () => {
    const board = createEmptyBoard();
    board[5][3] = 'white';
    board[5][4] = 'white';
    board[5][5] = 'white';
    board[5][6] = 'white';
    const evalResult = getBoardEvaluation(board);
    expect(evalResult.displayText).toBe('-M2');
    expect(evalResult.percentage).toBeLessThanOrEqual(10);
  });
});
