import type {
  BoardState,
  GameReviewSummary,
  Move,
  MoveClassification,
  Position,
  ReviewedMove,
} from '../../types/game';
import { cloneBoard, createEmptyBoard, formatCoordinate, getCandidateMoves } from '../gomokuLogic';
import { evaluatePoint, getFourThreats, getImmediateWinMoves, PATTERN_SCORES } from './patterns';
import { getGodMove } from './bot';
import { getBoardEvaluation } from './evaluator';
import { queryOpeningBook } from './openingBook';

/**
 * Classifies a move by comparing the played move with the optimal engine move and tactical threats.
 */
function classifyMove(
  boardBefore: BoardState,
  playedMove: Move,
  bestMove: Position,
  bestAnalysisExplanation: string,
  playedScore: number,
  bestScore: number,
  moveIndex: number
): { classification: MoveClassification; explanation: string; scoreDelta: number } {
  const isSameMove = playedMove.row === bestMove.row && playedMove.col === bestMove.col;
  const playedCoord = formatCoordinate(playedMove.row, playedMove.col);
  const bestCoord = formatCoordinate(bestMove.row, bestMove.col);
  const opponent = playedMove.player === 'black' ? 'white' : 'black';

  // 1. Opening Book
  const bookEntry = queryOpeningBook(boardBefore, playedMove.player);
  if (
    (bookEntry && bookEntry.move.row === playedMove.row && bookEntry.move.col === playedMove.col) ||
    (moveIndex === 0 && playedMove.row === 7 && playedMove.col === 7)
  ) {
    return {
      classification: 'book',
      explanation: bookEntry?.explanation || `Standard opening: Controls the central Tengen point (${playedCoord}).`,
      scoreDelta: 0,
    };
  }

  const candidates = getCandidateMoves(boardBefore, 2);

  // 2. Immediate Win Check (5 in a row)
  const myWins = getImmediateWinMoves(boardBefore, playedMove.player, candidates);
  if (myWins.length > 0) {
    const isWin = myWins.some((w) => w.row === playedMove.row && w.col === playedMove.col);
    if (isWin) {
      return {
        classification: 'brilliant',
        explanation: `Winning move! Plays ${playedCoord} completing 5-in-a-row for the victory!`,
        scoreDelta: 0,
      };
    } else {
      return {
        classification: 'blunder',
        explanation: `Blunder! Missed an immediate 5-in-a-row victory at ${bestCoord}.`,
        scoreDelta: PATTERN_SCORES.WIN_FIVE,
      };
    }
  }

  // 3. Opponent Immediate Win Defense (5 in a row threat)
  const oppWins = getImmediateWinMoves(boardBefore, opponent, candidates);
  if (oppWins.length > 0) {
    const blocksOppWin = oppWins.some((w) => w.row === playedMove.row && w.col === playedMove.col);
    if (!blocksOppWin) {
      return {
        classification: 'blunder',
        explanation: `Blunder! Failed to block opponent's winning 5-in-a-row threat at ${bestCoord}.`,
        scoreDelta: PATTERN_SCORES.WIN_FIVE,
      };
    } else {
      return {
        classification: 'best',
        explanation: `Best move! Critical defense at ${playedCoord} defusing opponent's winning 5-in-a-row threat.`,
        scoreDelta: 0,
      };
    }
  }

  // 4. Opponent Open Four Defense
  const oppFourThreats = getFourThreats(boardBefore, opponent, candidates);
  const oppOpenFours = oppFourThreats.filter((t) => t.isOpenFour);
  if (oppOpenFours.length > 0) {
    const blocksOpenFour = oppOpenFours.some((t) =>
      t.threatPoints.some((p) => p.row === playedMove.row && p.col === playedMove.col)
    );
    if (!blocksOpenFour && !isSameMove) {
      return {
        classification: 'blunder',
        explanation: `Blunder! Allowed opponent an unstoppable Open-Four. Required block was ${bestCoord}.`,
        scoreDelta: PATTERN_SCORES.OPEN_FOUR,
      };
    }
  }

  // 5. Board Evaluation delta after played move vs after best move
  const boardPlayed = cloneBoard(boardBefore);
  boardPlayed[playedMove.row][playedMove.col] = playedMove.player;
  const evalPlayed = getBoardEvaluation(boardPlayed);

  const boardBest = cloneBoard(boardBefore);
  boardBest[bestMove.row][bestMove.col] = playedMove.player;
  const evalBest = getBoardEvaluation(boardBest);

  const playedAdvantage = playedMove.player === 'black' ? evalPlayed.rawScore : -evalPlayed.rawScore;
  const bestAdvantage = playedMove.player === 'black' ? evalBest.rawScore : -evalBest.rawScore;
  const scoreDelta = Math.max(0, bestAdvantage - playedAdvantage);

  if (isSameMove || scoreDelta <= 300) {
    if (
      bestAnalysisExplanation.includes('VCF') ||
      bestAnalysisExplanation.includes('VCT') ||
      bestAnalysisExplanation.includes('fork') ||
      bestAnalysisExplanation.includes('double-threat') ||
      bestAnalysisExplanation.includes('Master defense') ||
      bestAnalysisExplanation.includes('Grandmaster defense')
    ) {
      return {
        classification: 'brilliant',
        explanation: isSameMove
          ? `Brilliant! ${bestAnalysisExplanation}`
          : `Brilliant! Executed strong tactical alternative at ${playedCoord}.`,
        scoreDelta: 0,
      };
    }
    return {
      classification: 'best',
      explanation: isSameMove
        ? `Best move! ${bestAnalysisExplanation}`
        : `Best move! Optimal placement at ${playedCoord} maintaining strategic advantage.`,
      scoreDelta: 0,
    };
  }

  if (scoreDelta < 2500) {
    return {
      classification: 'good',
      explanation: `Good move at ${playedCoord}. (${bestCoord} was marginally sharper).`,
      scoreDelta,
    };
  }

  if (scoreDelta < 12000) {
    return {
      classification: 'inaccuracy',
      explanation: `Inaccuracy: ${playedCoord} is playable, but ${bestCoord} offered stronger attacking pressure.`,
      scoreDelta,
    };
  }

  if (scoreDelta < 45000) {
    return {
      classification: 'mistake',
      explanation: `Mistake: ${playedCoord} conceded momentum. Best move was ${bestCoord}.`,
      scoreDelta,
    };
  }

  return {
    classification: 'blunder',
    explanation: `Blunder! ${playedCoord} missed key tactical threats. Optimal move was ${bestCoord}.`,
    scoreDelta,
  };
}

/**
 * Calculates CAPS-style move accuracy percentage from classification and evaluation loss.
 */
function calculateMoveAccuracy(classification: MoveClassification, loss: number): number {
  if (classification === 'book' || classification === 'best' || classification === 'brilliant') {
    return 100;
  }
  if (classification === 'good') {
    return Math.max(90, Math.min(98, Math.round(100 * Math.exp(-loss / 25000))));
  }
  if (classification === 'inaccuracy') {
    return Math.max(70, Math.min(88, Math.round(100 * Math.exp(-loss / 20000))));
  }
  if (classification === 'mistake') {
    return Math.max(40, Math.min(65, Math.round(100 * Math.exp(-loss / 15000))));
  }
  return Math.max(10, Math.min(30, Math.round(100 * Math.exp(-loss / 10000))));
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

    // Find best move from current position before this move was made using God engine
    const bestAnalysis = getGodMove(board, m.player);
    const bestMove = bestAnalysis.bestMove;
    const bestScore = evaluatePoint(board, bestMove.row, bestMove.col, m.player);
    const playedScore = evaluatePoint(board, m.row, m.col, m.player);

    const { classification, explanation, scoreDelta } = classifyMove(
      board,
      m,
      bestMove,
      bestAnalysis.explanation,
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
    const moveAcc = calculateMoveAccuracy(classification, scoreDelta);
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
