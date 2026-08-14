import type { BoardState, Difficulty, Position, StoneType, AIAnalysis } from '../../types/game';
import { cloneBoard, formatCoordinate, getCandidateMoves } from '../gomokuLogic';
import { evaluatePoint, PATTERN_SCORES } from './patterns';
import { minimaxAlphaBeta } from './minimax';

/**
 * Generates an explanation for a move based on pattern values.
 */
function explainMove(
  board: BoardState,
  pos: Position,
  player: StoneType
): string {
  const opponent: StoneType = player === 'black' ? 'white' : 'black';
  const coord = formatCoordinate(pos.row, pos.col);

  const attackScore = evaluatePoint(board, pos.row, pos.col, player);
  const defenseScore = evaluatePoint(board, pos.row, pos.col, opponent);

  if (attackScore >= PATTERN_SCORES.WIN_FIVE) {
    return `Plays ${coord} to complete 5-in-a-row for an immediate victory!`;
  }
  if (defenseScore >= PATTERN_SCORES.WIN_FIVE) {
    return `Crucial block at ${coord} to stop opponent's imminent 5-in-a-row win.`;
  }
  if (attackScore >= PATTERN_SCORES.OPEN_FOUR) {
    return `Attacks at ${coord} creating an unstoppable Open-Four.`;
  }
  if (defenseScore >= PATTERN_SCORES.OPEN_FOUR) {
    return `Defends at ${coord} to block opponent's dangerous Open-Four threat.`;
  }
  if (attackScore >= PATTERN_SCORES.OPEN_THREE * 1.5) {
    return `Plays ${coord} setting up a lethal double-threat combination.`;
  }
  if (defenseScore >= PATTERN_SCORES.OPEN_THREE) {
    return `Defensive move at ${coord} preventing opponent from forming an Open-Four.`;
  }
  if (attackScore >= PATTERN_SCORES.OPEN_THREE) {
    return `Builds an Open-Three alignment at ${coord} applying strong pressure.`;
  }
  return `Strategic placement at ${coord} reinforcing stone connectivity and board control.`;
}

/**
 * Easy Bot:
 * - Plays mostly random moves near active pieces
 * - 70% chance to block/take an immediate win or open 4
 */
function getEasyMove(board: BoardState, botPlayer: StoneType): { pos: Position; explanation: string } {
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  if (candidates.length === 0) {
    return { pos: { row: 7, col: 7 }, explanation: 'Takes center position.' };
  }

  // 1. Check for immediate win
  for (const pos of candidates) {
    const attack = evaluatePoint(board, pos.row, pos.col, botPlayer);
    if (attack >= PATTERN_SCORES.WIN_FIVE) {
      return { pos, explanation: explainMove(board, pos, botPlayer) };
    }
  }

  // 2. 75% chance to block opponent immediate win
  if (Math.random() < 0.75) {
    for (const pos of candidates) {
      const def = evaluatePoint(board, pos.row, pos.col, opponent);
      if (def >= PATTERN_SCORES.WIN_FIVE) {
        return { pos, explanation: explainMove(board, pos, botPlayer) };
      }
    }
  }

  // 3. 50% chance to block open four
  if (Math.random() < 0.50) {
    for (const pos of candidates) {
      const def = evaluatePoint(board, pos.row, pos.col, opponent);
      if (def >= PATTERN_SCORES.OPEN_FOUR) {
        return { pos, explanation: explainMove(board, pos, botPlayer) };
      }
    }
  }

  // Otherwise pick among top 4 loose moves with randomness
  const scored = candidates.map(pos => ({
    pos,
    score: evaluatePoint(board, pos.row, pos.col, botPlayer) + Math.random() * 200,
  }));
  scored.sort((a, b) => b.score - a.score);

  const pickIndex = Math.floor(Math.random() * Math.min(4, scored.length));
  const chosen = scored[pickIndex].pos;

  return {
    pos: chosen,
    explanation: explainMove(board, chosen, botPlayer),
  };
}

/**
 * Medium Bot:
 * - 1-move horizon heuristic pattern evaluator
 * - Weights offensive opportunities and defensive threats (Open Fours, Blocked Fours, Live Threes)
 */
function getMediumMove(board: BoardState, botPlayer: StoneType): { pos: Position; explanation: string } {
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  if (candidates.length === 0) {
    return { pos: { row: 7, col: 7 }, explanation: 'Takes center position.' };
  }

  let bestMove = candidates[0];
  let bestScore = -Infinity;

  for (const pos of candidates) {
    const attack = evaluatePoint(board, pos.row, pos.col, botPlayer);
    const defense = evaluatePoint(board, pos.row, pos.col, opponent);

    // Immediate win is paramount
    if (attack >= PATTERN_SCORES.WIN_FIVE) {
      return { pos, explanation: explainMove(board, pos, botPlayer) };
    }

    let combined = attack * 1.1 + defense * 1.0;

    // Defense priority when opponent has open 4 or 5 threat
    if (defense >= PATTERN_SCORES.WIN_FIVE) {
      combined = PATTERN_SCORES.WIN_FIVE * 0.95;
    } else if (defense >= PATTERN_SCORES.OPEN_FOUR) {
      combined = PATTERN_SCORES.OPEN_FOUR * 0.95;
    }

    // Add tiny random jitter for variety between equal tactical moves
    combined += Math.random() * 10;

    if (combined > bestScore) {
      bestScore = combined;
      bestMove = pos;
    }
  }

  return {
    pos: bestMove,
    explanation: explainMove(board, bestMove, botPlayer),
  };
}

/**
 * Hard Bot:
 * - Minimax with Alpha-Beta Pruning (Depth 2-3 with tactical move ordering)
 * - Deep pattern evaluation and threat foresight
 */
export function getHardMove(board: BoardState, botPlayer: StoneType): AIAnalysis {
  const startTime = Date.now();
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';

  // Fast check: if board is empty, take center
  const candidates = getCandidateMoves(board, 2);
  if (candidates.length === 0 || (candidates.length === 1 && candidates[0].row === 7 && candidates[0].col === 7)) {
    return {
      bestMove: { row: 7, col: 7 },
      score: 0,
      explanation: 'Opens game at the center Tengen (H8).',
      depth: 1,
      nodesEvaluated: 1,
      durationMs: 0,
    };
  }

  // Fast immediate win / block check
  for (const pos of candidates) {
    const attack = evaluatePoint(board, pos.row, pos.col, botPlayer);
    if (attack >= PATTERN_SCORES.WIN_FIVE) {
      return {
        bestMove: pos,
        score: attack,
        explanation: explainMove(board, pos, botPlayer),
        depth: 1,
        nodesEvaluated: 1,
        durationMs: Date.now() - startTime,
      };
    }
  }

  for (const pos of candidates) {
    const def = evaluatePoint(board, pos.row, pos.col, opponent);
    if (def >= PATTERN_SCORES.WIN_FIVE) {
      return {
        bestMove: pos,
        score: def,
        explanation: explainMove(board, pos, botPlayer),
        depth: 1,
        nodesEvaluated: 1,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // Minimax search at depth 3
  const searchBoard = cloneBoard(board);
  const stats = { nodes: 0 };
  const searchDepth = 3;

  const result = minimaxAlphaBeta(
    searchBoard,
    searchDepth,
    -Infinity,
    Infinity,
    true,
    botPlayer,
    startTime,
    1000,
    stats
  );

  const bestMove = result.bestMove || candidates[0];
  const durationMs = Date.now() - startTime;

  return {
    bestMove,
    score: result.score,
    explanation: explainMove(board, bestMove, botPlayer),
    depth: searchDepth,
    nodesEvaluated: stats.nodes,
    durationMs,
  };
}

/**
 * Main AI decision interface.
 */
export async function computeAIMove(
  board: BoardState,
  difficulty: Difficulty,
  botPlayer: StoneType
): Promise<AIAnalysis> {
  const startTime = Date.now();

  // Add realistic humanized micro-delay so UI feels natural
  const minDelay = difficulty === 'easy' ? 250 : difficulty === 'medium' ? 350 : 450;

  return new Promise((resolve) => {
    setTimeout(() => {
      let analysis: AIAnalysis;

      if (difficulty === 'easy') {
        const res = getEasyMove(board, botPlayer);
        analysis = {
          bestMove: res.pos,
          score: 0,
          explanation: res.explanation,
          depth: 1,
          nodesEvaluated: 10,
          durationMs: Date.now() - startTime,
        };
      } else if (difficulty === 'medium') {
        const res = getMediumMove(board, botPlayer);
        analysis = {
          bestMove: res.pos,
          score: 0,
          explanation: res.explanation,
          depth: 1,
          nodesEvaluated: 25,
          durationMs: Date.now() - startTime,
        };
      } else {
        analysis = getHardMove(board, botPlayer);
      }

      resolve(analysis);
    }, minDelay);
  });
}

/**
 * Computes tactical hint for the human player.
 */
export function getHint(board: BoardState, player: StoneType): AIAnalysis {
  return getHardMove(board, player);
}
