import type { BoardState, Position, StoneType } from '../../types/game';
import { getCandidateMoves } from '../gomokuLogic';
import { getFourThreats, getImmediateWinMoves, getThreeThreats, evaluatePoint, PATTERN_SCORES } from './patterns';
import { solveVCF } from './vcf';

export interface VCTResult {
  found: boolean;
  firstMove: Position;
  depth: number;
}

/**
 * Victory by Continuous Threes and Fours (VCT) Search Engine.
 * Searches for forced combination wins (Double Three, Four-Three, Open Four) where
 * attacker preserves continuous initiative.
 */
export function searchVCT(
  board: BoardState,
  attacker: StoneType,
  maxDepth: number = 10,
  startTime: number = Date.now(),
  maxTimeMs: number = 250,
  visited = new Set<string>()
): Position | null {
  if (maxDepth <= 0 || Date.now() - startTime > maxTimeMs) {
    return null;
  }

  const opponent: StoneType = attacker === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  // 1. Check if immediate win in 1 move
  const winMoves = getImmediateWinMoves(board, attacker, candidates);
  if (winMoves.length > 0) {
    return winMoves[0];
  }

  // 2. Fast check: Can VCF win directly?
  const vcf = solveVCF(board, attacker, 16, Math.min(100, maxTimeMs - (Date.now() - startTime)));
  if (vcf.found) {
    return vcf.firstMove;
  }

  // 3. Candidate Four Threats
  const fourThreats = getFourThreats(board, attacker, candidates);
  for (const ft of fourThreats) {
    if (ft.isOpenFour) {
      return ft.move;
    }
  }

  // 4. Candidate Three Threats (Double Three, Open Three)
  const threeThreats = getThreeThreats(board, attacker, candidates);

  for (const tt of threeThreats) {
    const atkMove = tt.move;

    // Double Three: Unstoppable in standard Gomoku!
    if (tt.isDoubleThree) {
      // Check if opponent has immediate win to counter
      const oppWins = getImmediateWinMoves(board, opponent, candidates);
      if (oppWins.length === 0) {
        return atkMove;
      }
    }

    // Four-Three fork combination check
    const atkScore = evaluatePoint(board, atkMove.row, atkMove.col, attacker);
    if (atkScore >= PATTERN_SCORES.OPEN_FOUR * 0.8) {
      const oppWins = getImmediateWinMoves(board, opponent, candidates);
      if (oppWins.length === 0) {
        return atkMove;
      }
    }

    // Open Three: Defender must block one of the defense points
    if (tt.defensePoints.length > 0 && maxDepth >= 2) {
      board[atkMove.row][atkMove.col] = attacker;

      let allDefensesBroke = true;

      // Test each defensive block
      for (const defPoint of tt.defensePoints) {
        if (board[defPoint.row][defPoint.col] !== null) continue;

        board[defPoint.row][defPoint.col] = opponent;

        const key = `${atkMove.row},${atkMove.col}-${defPoint.row},${defPoint.col}`;
        let subWin = false;

        if (!visited.has(key)) {
          visited.add(key);

          // Fast VCF or sub-VCT check after this branch
          const subVCF = solveVCF(board, attacker, 12, 40);
          if (subVCF.found) {
            subWin = true;
          } else if (maxDepth >= 4) {
            const subVCTMove = searchVCT(
              board,
              attacker,
              maxDepth - 2,
              startTime,
              maxTimeMs,
              visited
            );
            if (subVCTMove !== null) {
              subWin = true;
            }
          }
        }

        board[defPoint.row][defPoint.col] = null;

        if (!subWin) {
          allDefensesBroke = false;
          break;
        }
      }

      board[atkMove.row][atkMove.col] = null;

      if (allDefensesBroke && tt.defensePoints.length > 0) {
        return atkMove;
      }
    }
  }

  return null;
}

/**
 * High-level VCT solver.
 */
export function solveVCT(
  board: BoardState,
  attacker: StoneType,
  maxDepth: number = 10,
  maxTimeMs: number = 300
): VCTResult {
  const move = searchVCT(board, attacker, maxDepth, Date.now(), maxTimeMs);
  if (move) {
    return {
      found: true,
      firstMove: move,
      depth: maxDepth,
    };
  }
  return {
    found: false,
    firstMove: { row: -1, col: -1 },
    depth: 0,
  };
}
