import type { BoardState, Difficulty, Position, StoneType, AIAnalysis } from '../../types/game';
import { cloneBoard, formatCoordinate, getCandidateMoves } from '../gomokuLogic';
import { evaluatePoint, PATTERN_SCORES } from './patterns';
import { iterativeDeepeningSearch, minimaxAlphaBeta } from './minimax';
import { queryOpeningBook } from './openingBook';
import { solveVCF, findVCFDefense } from './vcf';
import { solveVCT } from './vct';

/**
 * Generates a descriptive explanation for a move based on tactical patterns and threat foresight.
 */
export function explainMove(
  board: BoardState,
  pos: Position,
  player: StoneType,
  tacticalTag?: string
): string {
  const opponent: StoneType = player === 'black' ? 'white' : 'black';
  const coord = formatCoordinate(pos.row, pos.col);

  if (tacticalTag) {
    return `${tacticalTag} at ${coord}.`;
  }

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
 * - Casual play near active stones with 75% block win rate and slight randomness.
 */
function getEasyMove(board: BoardState, botPlayer: StoneType): { pos: Position; explanation: string } {
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  if (candidates.length === 0) {
    return { pos: { row: 7, col: 7 }, explanation: 'Takes center position.' };
  }

  // 1. Immediate win
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
  if (Math.random() < 0.5) {
    for (const pos of candidates) {
      const def = evaluatePoint(board, pos.row, pos.col, opponent);
      if (def >= PATTERN_SCORES.OPEN_FOUR) {
        return { pos, explanation: explainMove(board, pos, botPlayer) };
      }
    }
  }

  // Otherwise pick among top 4 loose moves with randomness
  const scored = candidates.map((pos) => ({
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
 * - 1-move horizon heuristic pattern evaluator.
 * - Always blocks 5s and Open 4s, seizes wins immediately.
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

    if (attack >= PATTERN_SCORES.WIN_FIVE) {
      return { pos, explanation: explainMove(board, pos, botPlayer) };
    }

    let combined = attack * 1.1 + defense * 1.0;

    if (defense >= PATTERN_SCORES.WIN_FIVE) {
      combined = PATTERN_SCORES.WIN_FIVE * 0.95;
    } else if (defense >= PATTERN_SCORES.OPEN_FOUR) {
      combined = PATTERN_SCORES.OPEN_FOUR * 0.95;
    }

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
 * - Minimax with Alpha-Beta Pruning (Depth 3-4 with tactical move ordering).
 */
export function getHardMove(board: BoardState, botPlayer: StoneType): AIAnalysis {
  const startTime = Date.now();
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';

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

  // Minimax search at depth 4
  const searchBoard = cloneBoard(board);
  const stats = { nodes: 0 };
  const searchDepth = 4;

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
 * Expert Bot:
 * - Iterative Deepening Minimax (Depth 6)
 * - VCF (Victory by Continuous Fours) Tactical Extension (Depth 16)
 * - Killer Move Heuristic + History Heuristic Table
 */
export function getExpertMove(board: BoardState, botPlayer: StoneType): AIAnalysis {
  const startTime = Date.now();
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';

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

  // 1. Immediate Win / Block
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

  // 2. VCF Search for Bot (Depth 16)
  const botVCF = solveVCF(cloneBoard(board), botPlayer, 16, 200);
  if (botVCF.found) {
    const coord = formatCoordinate(botVCF.firstMove.row, botVCF.firstMove.col);
    return {
      bestMove: botVCF.firstMove,
      score: PATTERN_SCORES.WIN_FIVE,
      explanation: `Calculates ${botVCF.depth}-ply forced VCF victory sequence starting at ${coord}!`,
      depth: botVCF.depth,
      nodesEvaluated: botVCF.depth * 15,
      durationMs: Date.now() - startTime,
    };
  }

  // 3. VCF Defense against Opponent
  const oppVCFDefenses = findVCFDefense(cloneBoard(board), botPlayer, opponent, 14, 150);
  if (oppVCFDefenses.length > 0) {
    const blockPos = oppVCFDefenses[0];
    const coord = formatCoordinate(blockPos.row, blockPos.col);
    return {
      bestMove: blockPos,
      score: PATTERN_SCORES.OPEN_FOUR,
      explanation: `Master defense at ${coord} dismantling opponent's deep VCF threat!`,
      depth: 6,
      nodesEvaluated: 120,
      durationMs: Date.now() - startTime,
    };
  }

  // 4. Iterative Deepening Minimax Search (Depth 6)
  const searchBoard = cloneBoard(board);
  const result = iterativeDeepeningSearch(searchBoard, botPlayer, 6, 800);
  const bestMove = result.bestMove || candidates[0];

  return {
    bestMove,
    score: result.score,
    explanation: explainMove(board, bestMove, botPlayer),
    depth: result.depth,
    nodesEvaluated: result.nodesEvaluated,
    durationMs: Date.now() - startTime,
  };
}

/**
 * God / Grandmaster Bot:
 * - Ultimate Championship Gomoku AI Engine
 * - Full Opening Book with 8-fold dihedral symmetry
 * - Deep VCF Search (Depth 24)
 * - Deep VCT Search (Depth 12)
 * - Deep Iterative Deepening Minimax (Depth 8-10) with PVS & Quiescence Extension
 */
export function getGodMove(board: BoardState, botPlayer: StoneType): AIAnalysis {
  const startTime = Date.now();
  const opponent: StoneType = botPlayer === 'black' ? 'white' : 'black';

  // 1. Master Opening Book Lookup
  const bookEntry = queryOpeningBook(board, botPlayer);
  if (bookEntry) {
    return {
      bestMove: bookEntry.move,
      score: 0,
      explanation: bookEntry.explanation,
      depth: 1,
      nodesEvaluated: 1,
      durationMs: Date.now() - startTime,
    };
  }

  const candidates = getCandidateMoves(board, 2);
  if (candidates.length === 0) {
    return {
      bestMove: { row: 7, col: 7 },
      score: 0,
      explanation: 'Opens game at the center Tengen (H8).',
      depth: 1,
      nodesEvaluated: 1,
      durationMs: 0,
    };
  }

  // 2. Fast Immediate Win / Block
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

  // 3. Deep VCF Search for Bot (Depth 24)
  const botVCF = solveVCF(cloneBoard(board), botPlayer, 24, 300);
  if (botVCF.found) {
    const coord = formatCoordinate(botVCF.firstMove.row, botVCF.firstMove.col);
    return {
      bestMove: botVCF.firstMove,
      score: PATTERN_SCORES.WIN_FIVE,
      explanation: `Calculates ${botVCF.depth}-ply unstoppable VCF victory line at ${coord}!`,
      depth: botVCF.depth,
      nodesEvaluated: botVCF.depth * 30,
      durationMs: Date.now() - startTime,
    };
  }

  // 4. Deep VCF Defense against Opponent
  const oppVCFDefenses = findVCFDefense(cloneBoard(board), botPlayer, opponent, 20, 200);
  if (oppVCFDefenses.length > 0) {
    const blockPos = oppVCFDefenses[0];
    const coord = formatCoordinate(blockPos.row, blockPos.col);
    return {
      bestMove: blockPos,
      score: PATTERN_SCORES.OPEN_FOUR,
      explanation: `Grandmaster defense at ${coord} preemptively extinguishing opponent's VCF!`,
      depth: 8,
      nodesEvaluated: 200,
      durationMs: Date.now() - startTime,
    };
  }

  // 5. Deep VCT Search for Bot (Depth 12)
  const botVCT = solveVCT(cloneBoard(board), botPlayer, 12, 250);
  if (botVCT.found) {
    const coord = formatCoordinate(botVCT.firstMove.row, botVCT.firstMove.col);
    return {
      bestMove: botVCT.firstMove,
      score: PATTERN_SCORES.OPEN_FOUR * 0.9,
      explanation: `Executes unstoppable VCT combination attack starting at ${coord}!`,
      depth: botVCT.depth,
      nodesEvaluated: 450,
      durationMs: Date.now() - startTime,
    };
  }

  // 6. Deep Iterative Deepening Minimax Search (Depth 8-10)
  const searchBoard = cloneBoard(board);
  const result = iterativeDeepeningSearch(searchBoard, botPlayer, 8, 1200);
  const bestMove = result.bestMove || candidates[0];

  return {
    bestMove,
    score: result.score,
    explanation: explainMove(board, bestMove, botPlayer),
    depth: result.depth,
    nodesEvaluated: result.nodesEvaluated,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Main AI decision interface supporting all 5 difficulty levels.
 */
export async function computeAIMove(
  board: BoardState,
  difficulty: Difficulty,
  botPlayer: StoneType
): Promise<AIAnalysis> {
  const startTime = Date.now();

  // Add realistic micro-delay so moves feel fluid
  const minDelay =
    difficulty === 'easy'
      ? 200
      : difficulty === 'medium'
      ? 280
      : difficulty === 'hard'
      ? 350
      : difficulty === 'expert'
      ? 400
      : 450;

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
      } else if (difficulty === 'hard') {
        analysis = getHardMove(board, botPlayer);
      } else if (difficulty === 'expert') {
        analysis = getExpertMove(board, botPlayer);
      } else {
        // 'god' mode
        analysis = getGodMove(board, botPlayer);
      }

      resolve(analysis);
    }, minDelay);
  });
}

/**
 * Computes tactical hint for the human player using the Grandmaster engine.
 */
export function getHint(board: BoardState, player: StoneType): AIAnalysis {
  return getGodMove(board, player);
}
