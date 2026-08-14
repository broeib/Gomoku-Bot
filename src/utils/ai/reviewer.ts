import type {
  BoardState,
  GameReviewSummary,
  Move,
  MoveClassification,
  Position,
  ReviewedMove,
} from '../../types/game';
import { createEmptyBoard, formatCoordinate } from '../gomokuLogic';
import { evaluatePoint, PATTERN_SCORES } from './patterns';
import { getHardMove } from './bot';
import { getBoardEvaluation } from './evaluator';

/**
 * Classifies a move by comparing the played move with the optimal engine move.
 */
function classifyMove(
  boardBefore: BoardState,
  playedMove: Move,
  bestMove: Position,
  playedScore: number,
  bestScore: number,
  moveIndex: number
): { classification: MoveClassification; explanation: string } {
  const isSameMove = playedMove.row === bestMove.row && playedMove.col === bestMove.col;
  const playedCoord = formatCoordinate(playedMove.row, playedMove.col);
  const bestCoord = formatCoordinate(bestMove.row, bestMove.col);
  const opponent = playedMove.player === 'black' ? 'white' : 'black';

  // 1. Opening Book
  if (moveIndex === 0 && playedMove.row === 7 && playedMove.col === 7) {
    return {
      classification: 'book',
      explanation: `Standard opening: Controls the central Tengen point (${playedCoord}).`,
    };
  }

  // 2. Immediate Win Check
  const opponentDefScore = evaluatePoint(boardBefore, playedMove.row, playedMove.col, opponent);
  const opponentBestDef = evaluatePoint(boardBefore, bestMove.row, bestMove.col, opponent);

  // If player could have won immediately with 5-in-a-row, but missed it
  if (bestScore >= PATTERN_SCORES.WIN_FIVE && playedScore < PATTERN_SCORES.WIN_FIVE) {
    return {
      classification: 'blunder',
      explanation: `Blunder! Missed an immediate 5-in-a-row victory at ${bestCoord}.`,
    };
  }

  // If opponent had an immediate win threat (5 in a row), and player failed to block it
  if (opponentBestDef >= PATTERN_SCORES.WIN_FIVE && opponentDefScore < PATTERN_SCORES.WIN_FIVE) {
    return {
      classification: 'blunder',
      explanation: `Blunder! Failed to block opponent's winning 5-in-a-row threat at ${bestCoord}.`,
    };
  }

  // If opponent had an Open Four threat, and player failed to block it
  if (opponentBestDef >= PATTERN_SCORES.OPEN_FOUR && opponentDefScore < PATTERN_SCORES.OPEN_FOUR * 0.8) {
    return {
      classification: 'blunder',
      explanation: `Blunder! Allowed opponent an unstoppable Open-Four. Required block was ${bestCoord}.`,
    };
  }

  // 3. Best Move match
  if (isSameMove || playedScore >= bestScore * 0.98) {
    if (playedScore >= PATTERN_SCORES.OPEN_THREE * 1.8) {
      return {
        classification: 'brilliant',
        explanation: `Brilliant! Executed a lethal double-threat fork alignment at ${playedCoord}.`,
      };
    }
    if (opponentDefScore >= PATTERN_SCORES.WIN_FIVE || opponentDefScore >= PATTERN_SCORES.OPEN_FOUR) {
      return {
        classification: 'best',
        explanation: `Best move! Critical defense at ${playedCoord} defusing opponent's threat.`,
      };
    }
    return {
      classification: 'best',
      explanation: `Best move! Optimal placement at ${playedCoord} maximizing strategic control.`,
    };
  }

  // 4. Score Delta Evaluation
  const scoreDelta = bestScore - playedScore;

  if (scoreDelta < 2000) {
    return {
      classification: 'good',
      explanation: `Good move at ${playedCoord}. (${bestCoord} was marginally sharper).`,
    };
  }

  if (scoreDelta < 12000) {
    return {
      classification: 'inaccuracy',
      explanation: `Inaccuracy: ${playedCoord} is playable, but ${bestCoord} offered stronger attacking pressure.`,
    };
  }

  if (scoreDelta < 40000) {
    return {
      classification: 'mistake',
      explanation: `Mistake: ${playedCoord} conceded momentum. Best move was ${bestCoord}.`,
    };
  }

  return {
    classification: 'blunder',
    explanation: `Blunder! ${playedCoord} missed key tactical threats. Optimal move was ${bestCoord}.`,
  };
}

/**
 * Calculates CAPS-style move accuracy percentage from score loss.
 */
function calculateMoveAccuracy(loss: number): number {
  if (loss <= 0) return 100;
  // Exponential decay formula similar to Chess.com CAPS2
  return Math.max(10, Math.min(100, Math.round(100 * Math.exp(-loss / 8000))));
}

/**
 * Analyzes the entire game and returns a comprehensive Chess.com-style review summary.
 */
export function generateGameReview(moves: Move[]): GameReviewSummary {
  const reviewedMoves: ReviewedMove[] = [];
  const classificationsCount = {
    black: { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 },
    white: { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 },
  };

  const blackAccuracies: number[] = [];
  const whiteAccuracies: number[] = [];

  const board = createEmptyBoard();

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];

    // Find best move from current position before this move was made
    const bestAnalysis = getHardMove(board, m.player);
    const bestMove = bestAnalysis.bestMove;
    const bestScore = evaluatePoint(board, bestMove.row, bestMove.col, m.player);
    const playedScore = evaluatePoint(board, m.row, m.col, m.player);

    const { classification, explanation } = classifyMove(
      board,
      m,
      bestMove,
      playedScore,
      bestScore,
      i
    );

    // Apply move to board
    board[m.row][m.col] = m.player;

    // Get evaluation after this move
    const evalResult = getBoardEvaluation(board);

    // Track classification counts
    const counts = m.player === 'black' ? classificationsCount.black : classificationsCount.white;
    counts[classification]++;

    // Compute accuracy score
    const loss = Math.max(0, bestScore - playedScore);
    const moveAcc = calculateMoveAccuracy(loss);
    if (m.player === 'black') {
      blackAccuracies.push(moveAcc);
    } else {
      whiteAccuracies.push(moveAcc);
    }

    reviewedMoves.push({
      moveIndex: i,
      move: m,
      classification,
      playedScore,
      bestMove,
      bestScore,
      explanation,
      evalAfter: evalResult.rawScore,
      normalizedAdvantage: evalResult.percentage,
      evalText: evalResult.displayText,
    });
  }

  // Calculate average accuracies
  const blackAccuracy =
    blackAccuracies.length > 0
      ? Math.round((blackAccuracies.reduce((a, b) => a + b, 0) / blackAccuracies.length) * 10) / 10
      : 100;

  const whiteAccuracy =
    whiteAccuracies.length > 0
      ? Math.round((whiteAccuracies.reduce((a, b) => a + b, 0) / whiteAccuracies.length) * 10) / 10
      : 100;

  return {
    blackAccuracy,
    whiteAccuracy,
    reviewedMoves,
    classificationsCount,
  };
}
