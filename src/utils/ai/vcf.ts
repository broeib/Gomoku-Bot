import type { BoardState, Position, StoneType } from '../../types/game';
import { checkWin, getCandidateMoves } from '../gomokuLogic';
import { getFourThreats, getImmediateWinMoves } from './patterns';

export interface VCFResult {
  found: boolean;
  path: Position[];
  firstMove: Position;
  depth: number;
}

/**
 * Victory by Continuous Fours (VCF) Search Engine.
 * Explores deep forced winning sequences where every attacker move is a four-threat.
 * Since the defender is forced to block the immediate five, the branching factor is ~1.
 */
export function searchVCF(
  board: BoardState,
  attacker: StoneType,
  maxDepth: number = 22,
  startTime: number = Date.now(),
  maxTimeMs: number = 300,
  visited = new Set<string>()
): Position[] | null {
  if (maxDepth <= 0 || Date.now() - startTime > maxTimeMs) {
    return null;
  }

  const opponent: StoneType = attacker === 'black' ? 'white' : 'black';
  const candidates = getCandidateMoves(board, 2);

  // 1. Immediate win in 1 move?
  const winMoves = getImmediateWinMoves(board, attacker, candidates);
  if (winMoves.length > 0) {
    return [winMoves[0]];
  }

  // 2. Opponent already has an immediate 5-in-a-row threat?
  // Attacker must have a four that blocks or wins before opponent
  const oppWins = getImmediateWinMoves(board, opponent, candidates);

  // 3. Find all candidate moves that form a 4 for attacker
  const fourThreats = getFourThreats(board, attacker, candidates);
  if (fourThreats.length === 0) {
    return null;
  }

  for (const threat of fourThreats) {
    const atkMove = threat.move;

    // If opponent had an immediate win threat, attacker's four must block that threat
    if (oppWins.length > 0) {
      const blocksOppWin = oppWins.some(
        (ow) => ow.row === atkMove.row && ow.col === atkMove.col
      );
      if (!blocksOppWin) {
        continue;
      }
    }

    // If Open Four: Unstoppable win!
    if (threat.isOpenFour || threat.threatPoints.length >= 2) {
      return [atkMove];
    }

    // Blocked Four: Exactly 1 threat point for defender to block
    if (threat.threatPoints.length === 1) {
      const defMove = threat.threatPoints[0];

      // Make sure defMove is legal and not already occupied
      if (board[defMove.row][defMove.col] !== null) {
        continue;
      }

      // Apply attacker move & defender forced block
      board[atkMove.row][atkMove.col] = attacker;

      // Check if attacker accidentally won immediately
      const directWin = checkWin(board, atkMove.row, atkMove.col);
      if (directWin) {
        board[atkMove.row][atkMove.col] = null;
        return [atkMove];
      }

      board[defMove.row][defMove.col] = opponent;

      // Check if defender's forced block accidentally formed 5-in-a-row for defender
      const oppWinCheck = checkWin(board, defMove.row, defMove.col);
      if (oppWinCheck) {
        // Undo and skip
        board[defMove.row][defMove.col] = null;
        board[atkMove.row][atkMove.col] = null;
        continue;
      }

      // Memoization state key
      const stateKey = `${atkMove.row},${atkMove.col}-${defMove.row},${defMove.col}`;
      if (visited.has(stateKey)) {
        board[defMove.row][defMove.col] = null;
        board[atkMove.row][atkMove.col] = null;
        continue;
      }
      visited.add(stateKey);

      // Recursive search for the rest of the VCF chain
      const subPath = searchVCF(
        board,
        attacker,
        maxDepth - 2,
        startTime,
        maxTimeMs,
        visited
      );

      // Undo moves
      board[defMove.row][defMove.col] = null;
      board[atkMove.row][atkMove.col] = null;

      if (subPath) {
        return [atkMove, defMove, ...subPath];
      }
    }
  }

  return null;
}

/**
 * High-level VCF solver for the current position.
 */
export function solveVCF(
  board: BoardState,
  attacker: StoneType,
  maxDepth: number = 24,
  maxTimeMs: number = 250
): VCFResult {
  const path = searchVCF(board, attacker, maxDepth, Date.now(), maxTimeMs);
  if (path && path.length > 0) {
    return {
      found: true,
      path,
      firstMove: path[0],
      depth: path.length,
    };
  }
  return {
    found: false,
    path: [],
    firstMove: { row: -1, col: -1 },
    depth: 0,
  };
}

/**
 * Checks if opponent has a VCF and finds all vital defensive moves to disrupt it.
 */
export function findVCFDefense(
  board: BoardState,
  botPlayer: StoneType,
  opponent: StoneType,
  maxDepth: number = 18,
  maxTimeMs: number = 200
): Position[] {
  const oppVCF = solveVCF(board, opponent, maxDepth, maxTimeMs);
  if (!oppVCF.found) {
    return [];
  }

  // The first move of opponent's VCF is a critical point to occupy
  const criticalMoves: Position[] = [oppVCF.firstMove];

  // Also check if any other moves disrupt the VCF
  const candidates = getCandidateMoves(board, 2);
  for (const pos of candidates) {
    if (pos.row === oppVCF.firstMove.row && pos.col === oppVCF.firstMove.col) continue;

    // Test placing bot stone here to see if it breaks opponent's VCF
    board[pos.row][pos.col] = botPlayer;
    const testOppVCF = solveVCF(board, opponent, Math.min(12, maxDepth), 40);
    board[pos.row][pos.col] = null;

    if (!testOppVCF.found) {
      criticalMoves.push(pos);
      if (criticalMoves.length >= 4) break;
    }
  }

  return criticalMoves;
}
