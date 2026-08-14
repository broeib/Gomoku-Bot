import { BOARD_SIZE } from '../../types/game';
import type { BoardState, Position, StoneType } from '../../types/game';
import { checkWin, getCandidateMoves } from '../gomokuLogic';
import { evaluatePoint, PATTERN_SCORES } from './patterns';

interface ScoredMove {
  pos: Position;
  score: number;
}

// Zobrist Hashing for Board Transposition Cache
const zobristTable: number[][][] = Array(BOARD_SIZE)
  .fill(0)
  .map(() =>
    Array(BOARD_SIZE)
      .fill(0)
      .map(() => [
        Math.floor(Math.random() * 0x7fffffff), // black
        Math.floor(Math.random() * 0x7fffffff), // white
      ])
  );

const tt = new Map<number, { depth: number; score: number; flag: 'EXACT' | 'LOWER' | 'UPPER' }>();

export function getZobristHash(board: BoardState): number {
  let hash = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const stone = board[r][c];
      if (stone === 'black') {
        hash ^= zobristTable[r][c][0];
      } else if (stone === 'white') {
        hash ^= zobristTable[r][c][1];
      }
    }
  }
  return hash;
}

/**
 * Full board heuristic evaluation relative to the maximizing player.
 */
export function evaluateBoard(board: BoardState, maxPlayer: StoneType): number {
  const minPlayer: StoneType = maxPlayer === 'black' ? 'white' : 'black';

  let maxScore = 0;
  let minScore = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === maxPlayer) {
        maxScore += evaluatePoint(board, r, c, maxPlayer);
      } else if (board[r][c] === minPlayer) {
        minScore += evaluatePoint(board, r, c, minPlayer);
      }
    }
  }

  // Weight offense slightly higher than defense when evaluating whole board
  return maxScore - minScore * 1.15;
}

/**
 * Orders candidate moves by local tactical heuristic to maximize Alpha-Beta cutoffs.
 */
export function getOrderedCandidates(
  board: BoardState,
  currentPlayer: StoneType,
  limit: number = 14
): Position[] {
  const opponent: StoneType = currentPlayer === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  if (candidates.length <= 1) return candidates;

  const scoredMoves: ScoredMove[] = [];

  for (const pos of candidates) {
    const attackScore = evaluatePoint(board, pos.row, pos.col, currentPlayer);
    const defenseScore = evaluatePoint(board, pos.row, pos.col, opponent);

    // If this move is an immediate winning move, return it directly
    if (attackScore >= PATTERN_SCORES.WIN_FIVE) {
      return [pos];
    }

    // Heuristic combining attack and defense potential
    let combinedScore = attackScore * 1.05 + defenseScore * 1.0;
    if (defenseScore >= PATTERN_SCORES.WIN_FIVE) {
      combinedScore += PATTERN_SCORES.WIN_FIVE * 0.9;
    } else if (defenseScore >= PATTERN_SCORES.OPEN_FOUR) {
      combinedScore += PATTERN_SCORES.OPEN_FOUR * 0.9;
    }

    scoredMoves.push({ pos, score: combinedScore });
  }

  // Sort descending by score
  scoredMoves.sort((a, b) => b.score - a.score);

  return scoredMoves.slice(0, limit).map(m => m.pos);
}

export interface MinimaxResult {
  bestMove: Position;
  score: number;
  nodesEvaluated: number;
  depth: number;
}

/**
 * Minimax with Alpha-Beta Pruning, Move Ordering, and Transposition Table.
 */
export function minimaxAlphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  maxPlayer: StoneType,
  startTime: number,
  maxDurationMs: number = 1200,
  stats = { nodes: 0 }
): { score: number; bestMove?: Position } {
  stats.nodes++;

  const minPlayer: StoneType = maxPlayer === 'black' ? 'white' : 'black';
  const currentPlayer = isMaximizing ? maxPlayer : minPlayer;

  // Check timeout to ensure responsive UI
  if (Date.now() - startTime > maxDurationMs) {
    return { score: evaluateBoard(board, maxPlayer) };
  }

  // Transposition lookup
  const boardHash = getZobristHash(board);
  const cached = tt.get(boardHash);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'EXACT') return { score: cached.score };
    if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
    else if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return { score: cached.score };
  }

  // Terminal leaf or depth reached
  if (depth === 0) {
    const score = evaluateBoard(board, maxPlayer);
    return { score };
  }

  const candidateMoves = getOrderedCandidates(board, currentPlayer, depth > 1 ? 12 : 8);

  if (candidateMoves.length === 0) {
    return { score: 0 };
  }

  let bestMove = candidateMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;

    for (const move of candidateMoves) {
      board[move.row][move.col] = maxPlayer;

      // Fast check if this move wins immediately
      const win = checkWin(board, move.row, move.col);
      let evalScore: number;

      if (win) {
        evalScore = PATTERN_SCORES.WIN_FIVE + depth * 10000;
      } else {
        const res = minimaxAlphaBeta(
          board,
          depth - 1,
          alpha,
          beta,
          false,
          maxPlayer,
          startTime,
          maxDurationMs,
          stats
        );
        evalScore = res.score;
      }

      board[move.row][move.col] = null; // Undo move

      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }

      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) {
        break; // Beta cutoff
      }
    }

    // Cache transposition
    let flag: 'EXACT' | 'LOWER' | 'UPPER' = 'EXACT';
    if (maxEval <= alpha) flag = 'UPPER';
    else if (maxEval >= beta) flag = 'LOWER';
    tt.set(boardHash, { depth, score: maxEval, flag });

    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;

    for (const move of candidateMoves) {
      board[move.row][move.col] = minPlayer;

      const win = checkWin(board, move.row, move.col);
      let evalScore: number;

      if (win) {
        evalScore = -(PATTERN_SCORES.WIN_FIVE + depth * 10000);
      } else {
        const res = minimaxAlphaBeta(
          board,
          depth - 1,
          alpha,
          beta,
          true,
          maxPlayer,
          startTime,
          maxDurationMs,
          stats
        );
        evalScore = res.score;
      }

      board[move.row][move.col] = null; // Undo move

      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }

      beta = Math.min(beta, evalScore);
      if (beta <= alpha) {
        break; // Alpha cutoff
      }
    }

    let flag: 'EXACT' | 'LOWER' | 'UPPER' = 'EXACT';
    if (minEval <= alpha) flag = 'UPPER';
    else if (minEval >= beta) flag = 'LOWER';
    tt.set(boardHash, { depth, score: minEval, flag });

    return { score: minEval, bestMove };
  }
}
