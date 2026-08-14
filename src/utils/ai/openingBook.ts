import type { BoardState, Position, StoneType } from '../../types/game';
import { BOARD_SIZE } from '../../types/game';
import { formatCoordinate } from '../gomokuLogic';

interface OpeningNode {
  name: string;
  moves: { row: number; col: number; player: StoneType }[];
  nextMove: Position;
  comment: string;
}

// Standard Master Gomoku Opening lines (relative to center 7,7)
const OPENING_DATABASE: OpeningNode[] = [
  // Move 1: Empty board -> Tengen
  {
    name: 'Tengen Center Opening',
    moves: [],
    nextMove: { row: 7, col: 7 },
    comment: 'Opens standard master game at the central Tengen (H8).',
  },

  // Move 2 (White replies):
  {
    name: 'Direct Defense (H8 -> I8)',
    moves: [{ row: 7, col: 7, player: 'black' }],
    nextMove: { row: 7, col: 8 },
    comment: 'Direct opening defense: Tight adjacent control at I8.',
  },

  // Move 3 (Black plays Kagetsu / Huayue pattern):
  {
    name: 'Huayue / Kagetsu Opening (Direct 1)',
    moves: [
      { row: 7, col: 7, player: 'black' },
      { row: 7, col: 8, player: 'white' },
    ],
    nextMove: { row: 6, col: 8 },
    comment: 'Huayue Opening (Direct 1): High-win-rate diagonal pressure at I9.',
  },

  // Move 3 (Black plays Puyue / Uragetsu pattern):
  {
    name: 'Puyue / Uragetsu Opening (Indirect 1)',
    moves: [
      { row: 7, col: 7, player: 'black' },
      { row: 8, col: 8, player: 'white' },
    ],
    nextMove: { row: 6, col: 8 },
    comment: 'Puyue Opening: Dynamic diagonal wing alignment at I9.',
  },

  // Move 4 (White counter against Kagetsu):
  {
    name: 'Kagetsu Defense (J8 Block)',
    moves: [
      { row: 7, col: 7, player: 'black' },
      { row: 7, col: 8, player: 'white' },
      { row: 6, col: 8, player: 'black' },
    ],
    nextMove: { row: 7, col: 9 },
    comment: 'Strong theoretical defense at J8 to stop Black from completing open four.',
  },

  // Move 4 (White counter against Puyue):
  {
    name: 'Puyue Defense (H9 Anchor)',
    moves: [
      { row: 7, col: 7, player: 'black' },
      { row: 8, col: 8, player: 'white' },
      { row: 6, col: 8, player: 'black' },
    ],
    nextMove: { row: 6, col: 7 },
    comment: 'Mainline Puyue balance move at H9 neutralizing Black diagonal fork.',
  },

  // Move 5 (Black fork setup):
  {
    name: 'Kagetsu Mainline Fork',
    moves: [
      { row: 7, col: 7, player: 'black' },
      { row: 7, col: 8, player: 'white' },
      { row: 6, col: 8, player: 'black' },
      { row: 7, col: 9, player: 'white' },
    ],
    nextMove: { row: 8, col: 7 },
    comment: 'Mainline double-threat fork at H7 creating dual-axis attack lines.',
  },
];

/**
 * Transforms a coordinate across 8 D4 dihedral symmetries.
 */
function transformCoord(row: number, col: number, symmetryIndex: number): Position {
  let r = row;
  let c = col;

  // Symmetries: 0..3 (rotations 0, 90, 180, 270), 4..7 (reflections + rotations)
  const isReflected = symmetryIndex >= 4;
  const rot = symmetryIndex % 4;

  if (isReflected) {
    c = BOARD_SIZE - 1 - c;
  }

  for (let i = 0; i < rot; i++) {
    const newR = c;
    const newC = BOARD_SIZE - 1 - r;
    r = newR;
    c = newC;
  }

  return { row: r, col: c };
}

/**
 * Queries the opening book for a known master sequence.
 */
export function queryOpeningBook(
  board: BoardState,
  botPlayer: StoneType
): { move: Position; explanation: string } | null {
  // Count active stones
  const placedStones: { row: number; col: number; player: StoneType }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        placedStones.push({ row: r, col: c, player: board[r][c]! });
      }
    }
  }

  // Only use opening book up to move 6
  if (placedStones.length > 5) {
    return null;
  }

  // Expected player for the next move
  const expectedTurn: StoneType = placedStones.length % 2 === 0 ? 'black' : 'white';
  if (botPlayer !== expectedTurn) {
    return null;
  }

  // Check all opening database entries across all 8 symmetries
  for (const entry of OPENING_DATABASE) {
    if (entry.moves.length !== placedStones.length) {
      continue;
    }

    for (let sym = 0; sym < 8; sym++) {
      let matched = true;

      // Verify every stone in transformed entry matches current board
      for (const m of entry.moves) {
        const t = transformCoord(m.row, m.col, sym);
        if (board[t.row][t.col] !== m.player) {
          matched = false;
          break;
        }
      }

      if (matched) {
        const targetNext = transformCoord(entry.nextMove.row, entry.nextMove.col, sym);
        if (board[targetNext.row][targetNext.col] === null) {
          const coord = formatCoordinate(targetNext.row, targetNext.col);
          return {
            move: targetNext,
            explanation: `Book move (${entry.name}): Plays ${coord} following master opening theory.`,
          };
        }
      }
    }
  }

  return null;
}
