import React, { useEffect } from 'react';
import type { Difficulty, GameMode, GameStatus, StoneType } from '../types/game';
import { Trophy, RefreshCw, Eye, Sparkles, Frown, Equal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface WinnerModalProps {
  gameStatus: GameStatus;
  gameMode: GameMode;
  playerColor: StoneType;
  difficulty: Difficulty;
  totalMoves: number;
  onRematch: () => void;
  onClose: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  gameStatus,
  gameMode,
  playerColor,
  difficulty,
  totalMoves,
  onRematch,
  onClose,
}) => {
  const isPlayerWin =
    (gameStatus === 'black_win' && playerColor === 'black') ||
    (gameStatus === 'white_win' && playerColor === 'white');

  const isBotWin =
    (gameStatus === 'black_win' && playerColor === 'black' && gameMode === 'pve') ||
    (gameStatus === 'white_win' && playerColor === 'white' && gameMode === 'pve');

  const isDraw = gameStatus === 'draw';

  useEffect(() => {
    if (gameStatus === 'playing') return;

    if (isPlayerWin || (gameMode === 'pvp' && !isDraw)) {
      soundManager.playWinSound();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#3b82f6', '#10b981', '#ec4899'],
        });
      } catch {}
    } else if (isBotWin) {
      soundManager.playLossSound();
    }
  }, [gameStatus, isPlayerWin, isBotWin, isDraw, gameMode]);

  if (gameStatus === 'playing') return null;

  const getTitle = () => {
    if (isDraw) return 'Game Drawn!';
    if (gameMode === 'pve') {
      return isPlayerWin ? 'Victory!' : 'Defeat!';
    }
    if (gameMode === 'eve') {
      return gameStatus === 'black_win' ? 'Black Bot Wins!' : 'White Bot Wins!';
    }
    return gameStatus === 'black_win' ? 'Player 1 (Black) Wins!' : 'Player 2 (White) Wins!';
  };

  const getSubtitle = () => {
    if (isDraw) return 'The entire 15x15 board has been filled with no five-in-a-row!';
    if (gameMode === 'pve') {
      return isPlayerWin
        ? `Incredible game! You triumphed against the ${difficulty.toUpperCase()} AI.`
        : `The ${difficulty.toUpperCase()} AI found a winning alignment. Better luck next time!`;
    }
    return 'Five stones successfully aligned in a continuous row!';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
            isPlayerWin ? 'bg-amber-500' : isBotWin ? 'bg-rose-600' : 'bg-slate-400'
          }`}
        />

        {/* Icon Avatar */}
        <div className="relative mb-4">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border ${
              isPlayerWin
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/10'
                : isBotWin
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/10'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isPlayerWin ? (
              <Trophy className="w-10 h-10 animate-bounce" />
            ) : isBotWin ? (
              <Frown className="w-10 h-10" />
            ) : (
              <Equal className="w-10 h-10" />
            )}
          </div>
          {isPlayerWin && (
            <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-spin" />
          )}
        </div>

        {/* Header Text */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
          {getTitle()}
        </h2>
        <p className="text-slate-300 text-sm mt-2 max-w-xs leading-relaxed">
          {getSubtitle()}
        </p>

        {/* Stats Pill */}
        <div className="flex items-center gap-4 my-6 py-2.5 px-5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300">
          <div>
            <span className="text-slate-500 block">Total Moves</span>
            <span className="font-bold text-amber-400 text-base">{totalMoves}</span>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <span className="text-slate-500 block">Winner</span>
            <span className="font-bold capitalize text-white">
              {isDraw ? 'None' : gameStatus === 'black_win' ? 'Black' : 'White'}
            </span>
          </div>
          {gameMode === 'pve' && (
            <>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Difficulty</span>
                <span className="font-bold capitalize text-indigo-400">{difficulty}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700"
          >
            <Eye className="w-4 h-4" />
            <span>Review Board</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onRematch();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
