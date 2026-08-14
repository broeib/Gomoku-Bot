import React from 'react';
import type { Difficulty, GameMode, GameStatus, StoneType } from '../types/game';
import { Bot, User, BrainCircuit, Trophy } from 'lucide-react';

interface TurnIndicatorProps {
  currentTurn: StoneType;
  gameStatus: GameStatus;
  gameMode: GameMode;
  playerColor: StoneType;
  difficulty: Difficulty;
  isAiThinking: boolean;
  moveCount: number;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  currentTurn,
  gameStatus,
  gameMode,
  playerColor,
  difficulty,
  isAiThinking,
  moveCount,
}) => {
  const isPvE = gameMode === 'pve';
  const isEvE = gameMode === 'eve';

  const getPlayerLabel = (stone: StoneType) => {
    if (isPvE) {
      if (stone === playerColor) return 'You';
      if (difficulty === 'god') return 'God AI (Grandmaster)';
      if (difficulty === 'expert') return 'Expert AI (Master)';
      return `Bot (${difficulty.toUpperCase()})`;
    }
    if (isEvE) {
      return stone === 'black' ? 'Bot 1 (Black)' : 'Bot 2 (White)';
    }
    return stone === 'black' ? 'Player 1 (Black)' : 'Player 2 (White)';
  };

  const isCurrentTurnAi = () => {
    if (isEvE) return true;
    if (isPvE && currentTurn !== playerColor) return true;
    return false;
  };

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xl">
      {/* Black Player Card */}
      <div
        className={`flex-1 flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
          currentTurn === 'black' && gameStatus === 'playing'
            ? 'bg-gradient-to-r from-slate-800 to-slate-800/60 border border-amber-500/50 shadow-md shadow-amber-500/10'
            : 'bg-slate-950/40 border border-slate-800/40 opacity-70'
        }`}
      >
        <div className="relative">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full stone-black flex items-center justify-center text-white border border-slate-700 shadow-inner">
            {isPvE && playerColor === 'white' ? (
              <Bot className="w-5 h-5 text-amber-400" />
            ) : isEvE ? (
              <BrainCircuit className="w-5 h-5 text-amber-400" />
            ) : (
              <User className="w-5 h-5 text-slate-200" />
            )}
          </div>
          {currentTurn === 'black' && gameStatus === 'playing' && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
            {getPlayerLabel('black')}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1">
            Black Stone • First
          </span>
        </div>
      </div>

      {/* Center Status / Move Badge */}
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
          Move #{moveCount + 1}
        </div>
        <div className="text-xs sm:text-sm font-semibold text-center mt-0.5">
          {gameStatus === 'playing' ? (
            isAiThinking && isCurrentTurnAi() ? (
              <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                <BrainCircuit className="w-3.5 h-3.5 animate-spin" /> Thinking...
              </span>
            ) : (
              <span className="text-slate-300">
                {currentTurn === playerColor && isPvE ? 'Your Turn' : `${currentTurn.toUpperCase()}'s Turn`}
              </span>
            )
          ) : gameStatus === 'draw' ? (
            <span className="text-slate-400 font-bold">Draw Game</span>
          ) : (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {gameStatus === 'black_win' ? 'Black Wins!' : 'White Wins!'}
            </span>
          )}
        </div>
      </div>

      {/* White Player Card */}
      <div
        className={`flex-1 flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all ${
          currentTurn === 'white' && gameStatus === 'playing'
            ? 'bg-gradient-to-r from-slate-800 to-slate-800/60 border border-amber-500/50 shadow-md shadow-amber-500/10'
            : 'bg-slate-950/40 border border-slate-800/40 opacity-70'
        }`}
      >
        <div className="relative">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full stone-white flex items-center justify-center text-slate-900 border border-slate-300 shadow-inner">
            {isPvE && playerColor === 'black' ? (
              <Bot className="w-5 h-5 text-indigo-600" />
            ) : isEvE ? (
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            ) : (
              <User className="w-5 h-5 text-slate-800" />
            )}
          </div>
          {currentTurn === 'white' && gameStatus === 'playing' && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
            {getPlayerLabel('white')}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1">
            White Stone • Second
          </span>
        </div>
      </div>
    </div>
  );
};
