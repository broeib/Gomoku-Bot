import { describe, it, expect } from 'vitest';
import { evaluatePoint, evaluatePointDirection, PATTERN_SCORES } from '../utils/ai/patterns';
import { createEmptyBoard } from '../utils/gomokuLogic';

describe('Gomoku Pattern Recognition & Scoring', () => {
  it('should score 5-in-a-row as immediate maximum win score', () => {
    const board = createEmptyBoard();
    board[7][3] = 'black';
    board[7][4] = 'black';
    board[7][5] = 'black';
    board[7][6] = 'black';

    // Evaluating placement at (7,7) completes 5
    const score = evaluatePoint(board, 7, 7, 'black');
    expect(score).toBeGreaterThanOrEqual(PATTERN_SCORES.WIN_FIVE);
  });

  it('should score Open-Four higher than Blocked-Four', () => {
    const boardOpen = createEmptyBoard();
    // 0XXX_0
    boardOpen[7][4] = 'black';
    boardOpen[7][5] = 'black';
    boardOpen[7][6] = 'black';
    // placing at 7,7 gives 0XXXX0
    const openFourScore = evaluatePoint(boardOpen, 7, 7, 'black');

    const boardBlocked = createEmptyBoard();
    boardBlocked[7][3] = 'white'; // block one side
    boardBlocked[7][4] = 'black';
    boardBlocked[7][5] = 'black';
    boardBlocked[7][6] = 'black';
    // placing at 7,7 gives 2XXXX0
    const blockedFourScore = evaluatePoint(boardBlocked, 7, 7, 'black');

    expect(openFourScore).toBeGreaterThan(blockedFourScore);
    expect(openFourScore).toBeGreaterThanOrEqual(PATTERN_SCORES.OPEN_FOUR);
  });

  it('should score Open-Three higher than Blocked-Three', () => {
    const boardOpen = createEmptyBoard();
    boardOpen[7][5] = 'black';
    boardOpen[7][6] = 'black';
    // placing at 7,7 gives 0XXX0
    const openThreeScore = evaluatePoint(boardOpen, 7, 7, 'black');

    const boardBlocked = createEmptyBoard();
    boardBlocked[7][4] = 'white'; // blocked end
    boardBlocked[7][5] = 'black';
    boardBlocked[7][6] = 'black';
    // placing at 7,7 gives 2XXX0
    const blockedThreeScore = evaluatePoint(boardBlocked, 7, 7, 'black');

    expect(openThreeScore).toBeGreaterThan(blockedThreeScore);
    expect(openThreeScore).toBeGreaterThanOrEqual(PATTERN_SCORES.OPEN_THREE);
  });

  it('should recognize jump-four patterns (e.g. XX_XX and X_XXX)', () => {
    const board = createEmptyBoard();
    board[7][4] = 'black';
    board[7][5] = 'black';
    // gap at 7,6
    board[7][7] = 'black';
    board[7][8] = 'black';

    // placing at gap (7,6) completes 5
    const winScore = evaluatePoint(board, 7, 6, 'black');
    expect(winScore).toBeGreaterThanOrEqual(PATTERN_SCORES.WIN_FIVE);
  });

  it('should recognize diagonal patterns identically to straight lines', () => {
    const board = createEmptyBoard();
    board[4][4] = 'white';
    board[5][5] = 'white';
    board[6][6] = 'white';

    const diagScore = evaluatePoint(board, 7, 7, 'white');
    expect(diagScore).toBeGreaterThanOrEqual(PATTERN_SCORES.OPEN_FOUR);
  });

  it('should detect double-threat fork combinations (e.g. Double 3 or 4-3)', () => {
    const board = createEmptyBoard();
    // Horizontal 2 stones
    board[7][6] = 'black';
    board[7][8] = 'black';
    // Vertical 2 stones
    board[6][7] = 'black';
    board[8][7] = 'black';

    // placing at (7,7) creates two intersecting open threes simultaneously
    const forkScore = evaluatePoint(board, 7, 7, 'black');
    expect(forkScore).toBeGreaterThan(PATTERN_SCORES.OPEN_THREE * 1.5);
  });

  it('should give a centrality bonus to the center Tengen (7,7)', () => {
    const board = createEmptyBoard();
    const centerScore = evaluatePoint(board, 7, 7, 'black');
    const cornerScore = evaluatePoint(board, 0, 0, 'black');
    expect(centerScore).toBeGreaterThan(cornerScore);
  });

  it('should return 0 for a dead line constrained by edges or blockers with < 5 space', () => {
    const board = createEmptyBoard();
    board[0][0] = 'white';
    board[0][3] = 'white';
    // Only 2 spaces between col 1 and 2
    const score = evaluatePointDirection(board, 0, 1, 0, 1, 'black');
    expect(score).toBe(0);
  });
});
