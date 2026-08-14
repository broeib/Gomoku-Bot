export type StoneType = 'black' | 'white';

export type CellState = StoneType | null;

export type BoardState = CellState[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  row: number;
  col: number;
  player: StoneType;
  moveNumber: number;
  timestamp: number;
}

export type GameMode = 'pve' | 'pvp' | 'eve';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'god';

export type GameStatus = 'playing' | 'black_win' | 'white_win' | 'draw';

export type BoardTheme = 'kaya' | 'dark' | 'slate';

export interface WinningInfo {
  winner: StoneType;
  line: Position[];
}

export interface DifficultyStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface GameStats {
  easy: DifficultyStats;
  medium: DifficultyStats;
  hard: DifficultyStats;
  expert: DifficultyStats;
  god: DifficultyStats;
  pvp: {
    blackWins: number;
    whiteWins: number;
    draws: number;
  };
  currentStreak: number;
  bestStreak: number;
}

export interface AIAnalysis {
  bestMove: Position;
  score: number;
  explanation: string;
  depth?: number;
  nodesEvaluated?: number;
  durationMs?: number;
}

export type MoveClassification =
  | 'brilliant'
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book';

export interface ReviewedMove {
  moveIndex: number;
  move: Move;
  classification: MoveClassification;
  playedScore: number;
  bestMove: Position;
  bestScore: number;
  explanation: string;
  evalAfter: number; // Raw score from Black's perspective
  normalizedAdvantage: number; // 0 (100% White) to 100 (100% Black), 50 is even
  evalText: string; // e.g. "+2.4", "-1.8", "+M1", "0.0"
}

export interface GameReviewSummary {
  blackAccuracy: number;
  whiteAccuracy: number;
  reviewedMoves: ReviewedMove[];
  classificationsCount: {
    black: Record<MoveClassification, number>;
    white: Record<MoveClassification, number>;
  };
}

export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;
