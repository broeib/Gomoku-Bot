import { BOARD_SIZE } from '../../types/game';
import type { BoardState, Position, StoneType } from '../../types/game';
import { checkWin, getCandidateMoves } from '../gomokuLogic';
import { evaluatePoint, PATTERN_SCORES } from './patterns';

interface ScoredMove {
  pos: Position;
  score: number;
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWER' | 'UPPER';
  bestMove?: Position;
}

// Zobrist Hashing Table
const zobristTableHigh: number[][][] = Array(BOARD_SIZE)
  .fill(0)
  .map(() =>
    Array(BOARD_SIZE)
      .fill(0)
      .map(() => [
        Math.floor(Math.random() * 0x7fffffff), // black
        Math.floor(Math.random() * 0x7fffffff), // white
      ])
  );

const zobristTurn = [
  Math.floor(Math.random() * 0x7fffffff),
  Math.floor(Math.random() * 0x7fffffff),
];

// Transposition Table (Map with 64-bit combined string key or number)
const tt = new Map<number, TTEntry>();

export function getZobristHash(board: BoardState, isMaximizing: boolean = true): number {
  let hash = isMaximizing ? zobristTurn[0] : zobristTurn[1];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const stone = board[r][c];
      if (stone === 'black') {
        hash ^= zobristTableHigh[r][c][0];
      } else if (stone === 'white') {
        hash ^= zobristTableHigh[r][c][1];
      }
    }
  }
  return hash;
}

export function clearTranspositionTable(): void {
  tt.clear();
}

// Killer Moves Table (2 killer moves per ply up to depth 32)
const MAX_PLY = 32;
const killerMoves: (Position | null)[][] = Array(MAX_PLY)
  .fill(null)
  .map(() => [null, null]);

// History Heuristic Table
const historyTable: number[][] = Array(BOARD_SIZE)
  .fill(0)
  .map(() => Array(BOARD_SIZE).fill(0));

export function resetSearchTables(): void {
  for (let p = 0; p < MAX_PLY; p++) {
    killerMoves[p][0] = null;
    killerMoves[p][1] = null;
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      historyTable[r][c] = 0;
    }
  }
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

  // Weight offensive opportunities slightly higher than defense when evaluating whole board
  return maxScore - minScore * 1.15;
}

/**
 * Orders candidate moves by local tactical heuristic, TT move, killer moves, and history score.
 */
export function getOrderedCandidates(
  board: BoardState,
  currentPlayer: StoneType,
  limit: number = 14,
  ttMove?: Position | null,
  ply: number = 0
): Position[] {
  const opponent: StoneType = currentPlayer === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  if (candidates.length <= 1) return candidates;

  const scoredMoves: ScoredMove[] = [];

  for (const pos of candidates) {
    // 1. If this matches the Transposition Table best move, give it top priority
    if (ttMove && pos.row === ttMove.row && pos.col === ttMove.col) {
      scoredMoves.push({ pos, score: 200000000 });
      continue;
    }

    const attackScore = evaluatePoint(board, pos.row, pos.col, currentPlayer);
    const defenseScore = evaluatePoint(board, pos.row, pos.col, opponent);

    // Immediate winning move returns directly
    if (attackScore >= PATTERN_SCORES.WIN_FIVE) {
      return [pos];
    }

    // Heuristic combining attack and defense potential
    let combinedScore = attackScore * 1.08 + defenseScore * 1.0;
    if (defenseScore >= PATTERN_SCORES.WIN_FIVE) {
      combinedScore += PATTERN_SCORES.WIN_FIVE * 0.95;
    } else if (defenseScore >= PATTERN_SCORES.OPEN_FOUR) {
      combinedScore += PATTERN_SCORES.OPEN_FOUR * 0.92;
    } else if (defenseScore >= PATTERN_SCORES.OPEN_THREE * 1.5) {
      combinedScore += PATTERN_SCORES.OPEN_THREE * 1.2;
    }

    // Killer move bonus
    if (ply < MAX_PLY) {
      if (
        killerMoves[ply][0] &&
        pos.row === killerMoves[ply][0]!.row &&
        pos.col === killerMoves[ply][0]!.col
      ) {
        combinedScore += 25000;
      } else if (
        killerMoves[ply][1] &&
        pos.row === killerMoves[ply][1]!.row &&
        pos.col === killerMoves[ply][1]!.col
      ) {
        combinedScore += 15000;
      }
    }

    // History heuristic bonus
    combinedScore += Math.min(20000, historyTable[pos.row][pos.col]);

    scoredMoves.push({ pos, score: combinedScore });
  }

  // Sort descending by score
  scoredMoves.sort((a, b) => b.score - a.score);

  // Guarantee critical tactical threats (open fours, double threes, direct defense) are never pruned
  const highThreats = scoredMoves.filter(
    (m) => m.score >= PATTERN_SCORES.OPEN_THREE * 0.8
  );
  const remaining = scoredMoves.filter(
    (m) => m.score < PATTERN_SCORES.OPEN_THREE * 0.8
  );
  const selected = [
    ...highThreats,
    ...remaining.slice(0, Math.max(0, limit - highThreats.length)),
  ];

  return selected.map((m) => m.pos);
}

export interface MinimaxResult {
  bestMove: Position;
  score: number;
  nodesEvaluated: number;
  depth: number;
}

/**
 * Minimax with Alpha-Beta Pruning, Principal Variation Search (PVS), Move Ordering, and TT.
 */
export function minimaxAlphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  maxPlayer: StoneType,
  startTime: number,
  maxDurationMs: number = 1500,
  stats = { nodes: 0 },
  ply: number = 0
): { score: number; bestMove?: Position } {
  stats.nodes++;

  const originalAlpha = alpha;
  const originalBeta = beta;

  const minPlayer: StoneType = maxPlayer === 'black' ? 'white' : 'black';
  const currentPlayer = isMaximizing ? maxPlayer : minPlayer;

  // Check timeout to guarantee UI responsiveness
  if (Date.now() - startTime > maxDurationMs) {
    return { score: evaluateBoard(board, maxPlayer) };
  }

  // Transposition Table lookup
  const boardHash = getZobristHash(board, isMaximizing);
  const cached = tt.get(boardHash);
  let ttBestMove: Position | null = null;

  if (cached) {
    if (cached.bestMove) {
      ttBestMove = cached.bestMove;
    }
    if (cached.depth >= depth) {
      if (cached.flag === 'EXACT') return { score: cached.score, bestMove: cached.bestMove };
      if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
      else if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
      if (alpha >= beta) return { score: cached.score, bestMove: cached.bestMove };
    }
  }

  // Leaf node reached
  if (depth === 0) {
    const score = evaluateBoard(board, maxPlayer);
    return { score };
  }

  const candidateLimit = depth > 3 ? 14 : depth > 1 ? 10 : 8;
  const candidateMoves = getOrderedCandidates(
    board,
    currentPlayer,
    candidateLimit,
    ttBestMove,
    ply
  );

  if (candidateMoves.length === 0) {
    return { score: 0 };
  }

  let bestMove = candidateMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;

    for (let i = 0; i < candidateMoves.length; i++) {
      const move = candidateMoves[i];
      board[move.row][move.col] = maxPlayer;

      const win = checkWin(board, move.row, move.col);
      let evalScore: number;

      if (win) {
        evalScore = PATTERN_SCORES.WIN_FIVE + depth * 10000;
      } else {
        // Principal Variation Search (PVS)
        if (i === 0) {
          // Full window for first move (PV candidate)
          const res = minimaxAlphaBeta(
            board,
            depth - 1,
            alpha,
            beta,
            false,
            maxPlayer,
            startTime,
            maxDurationMs,
            stats,
            ply + 1
          );
          evalScore = res.score;
        } else {
          // Zero-window search for subsequent moves
          const res = minimaxAlphaBeta(
            board,
            depth - 1,
            alpha,
            alpha + 1,
            false,
            maxPlayer,
            startTime,
            maxDurationMs,
            stats,
            ply + 1
          );
          evalScore = res.score;

          // If null-window failed high, re-search with full window
          if (evalScore > alpha && evalScore < beta) {
            const reSearch = minimaxAlphaBeta(
              board,
              depth - 1,
              evalScore,
              beta,
              false,
              maxPlayer,
              startTime,
              maxDurationMs,
              stats,
              ply + 1
            );
            evalScore = reSearch.score;
          }
        }
      }

      board[move.row][move.col] = null; // Undo move

      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }

      if (evalScore > alpha) {
        alpha = evalScore;
      }

      // Beta Cutoff
      if (beta <= alpha) {
        // Store Killer Move
        if (ply < MAX_PLY) {
          if (
            !killerMoves[ply][0] ||
            killerMoves[ply][0]!.row !== move.row ||
            killerMoves[ply][0]!.col !== move.col
          ) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = move;
          }
        }
        // Increment history heuristic
        historyTable[move.row][move.col] += depth * depth * 10;
        break;
      }
    }

    // Save to Transposition Table with correct bounds flags
    let flag: 'EXACT' | 'LOWER' | 'UPPER' = 'EXACT';
    if (maxEval <= originalAlpha) flag = 'UPPER';
    else if (maxEval >= originalBeta) flag = 'LOWER';
    tt.set(boardHash, { depth, score: maxEval, flag, bestMove });

    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;

    for (let i = 0; i < candidateMoves.length; i++) {
      const move = candidateMoves[i];
      board[move.row][move.col] = minPlayer;

      const win = checkWin(board, move.row, move.col);
      let evalScore: number;

      if (win) {
        evalScore = -(PATTERN_SCORES.WIN_FIVE + depth * 10000);
      } else {
        if (i === 0) {
          const res = minimaxAlphaBeta(
            board,
            depth - 1,
            alpha,
            beta,
            true,
            maxPlayer,
            startTime,
            maxDurationMs,
            stats,
            ply + 1
          );
          evalScore = res.score;
        } else {
          // Null-window search for minimizing player: test if score < beta
          const res = minimaxAlphaBeta(
            board,
            depth - 1,
            beta - 1,
            beta,
            true,
            maxPlayer,
            startTime,
            maxDurationMs,
            stats,
            ply + 1
          );
          evalScore = res.score;

          // If null-window failed low, re-search with full window
          if (evalScore < beta && evalScore > alpha) {
            const reSearch = minimaxAlphaBeta(
              board,
              depth - 1,
              alpha,
              evalScore,
              true,
              maxPlayer,
              startTime,
              maxDurationMs,
              stats,
              ply + 1
            );
            evalScore = reSearch.score;
          }
        }
      }

      board[move.row][move.col] = null; // Undo move

      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }

      if (evalScore < beta) {
        beta = evalScore;
      }

      // Alpha Cutoff
      if (beta <= alpha) {
        if (ply < MAX_PLY) {
          if (
            !killerMoves[ply][0] ||
            killerMoves[ply][0]!.row !== move.row ||
            killerMoves[ply][0]!.col !== move.col
          ) {
            killerMoves[ply][1] = killerMoves[ply][0];
            killerMoves[ply][0] = move;
          }
        }
        historyTable[move.row][move.col] += depth * depth * 10;
        break;
      }
    }

    let flag: 'EXACT' | 'LOWER' | 'UPPER' = 'EXACT';
    if (minEval <= originalAlpha) flag = 'UPPER';
    else if (minEval >= originalBeta) flag = 'LOWER';
    tt.set(boardHash, { depth, score: minEval, flag, bestMove });

    return { score: minEval, bestMove };
  }
}

/**
 * Iterative Deepening Minimax Engine with time budget management.
 */
export function iterativeDeepeningSearch(
  board: BoardState,
  botPlayer: StoneType,
  targetDepth: number,
  maxTimeMs: number
): MinimaxResult {
  const startTime = Date.now();
  clearTranspositionTable();
  resetSearchTables();

  const stats = { nodes: 0 };
  let bestMove: Position = { row: 7, col: 7 };
  let bestScore = 0;
  let completedDepth = 1;

  for (let d = 1; d <= targetDepth; d++) {
    // If we've used more than 70% of time budget, don't start the next depth iteration
    if (d > 1 && Date.now() - startTime > maxTimeMs * 0.7) {
      break;
    }

    const result = minimaxAlphaBeta(
      board,
      d,
      -Infinity,
      Infinity,
      true,
      botPlayer,
      startTime,
      maxTimeMs,
      stats
    );

    if (result.bestMove) {
      bestMove = result.bestMove;
      bestScore = result.score;
      completedDepth = d;
    }

    // If an undeniable win/loss is detected, terminate early
    if (Math.abs(bestScore) >= PATTERN_SCORES.WIN_FIVE) {
      break;
    }
  }

  return {
    bestMove,
    score: bestScore,
    nodesEvaluated: stats.nodes,
    depth: completedDepth,
  };
}
