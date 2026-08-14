import React from 'react';
import type { Difficulty, GameMode, GameStatus, StoneType } from '../types/game';
import {
  RotateCcw,
  Undo2,
  Redo2,
  Lightbulb,
  Flag,
  Bot,
  Users,
  Cpu,
  Zap,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameControlsProps {
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  difficulty: Difficulty;
  onSelectDifficulty: (diff: Difficulty) => void;
  playerColor: StoneType;
  onSelectPlayerColor: (color: StoneType) => void;
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onGetHint: () => void;
  canHint: boolean;
  onResign: () => void;
  onStartReview: () => void;
  canReview: boolean;
  isReviewMode: boolean;
  gameStatus: GameStatus;
  isAiThinking: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  onSelectGameMode,
  difficulty,
  onSelectDifficulty,
  playerColor,
  onSelectPlayerColor,
  onNewGame,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onGetHint,
  canHint,
  onResign,
  onStartReview,
  canReview,
  isReviewMode,
  gameStatus,
  isAiThinking,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
      {/* Top Options Bar: Game Mode, Difficulty & Color */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Game Mode Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mode
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              id="mode-pve"
              onClick={() => {
                soundManager.playClickSound();
                onSelectGameMode('pve');
              }}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                gameMode === 'pve'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI</span>
            </button>
            <button
              type="button"
              id="mode-pvp"
              onClick={() => {
                soundManager.playClickSound();
                onSelectGameMode('pvp');
              }}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                gameMode === 'pvp'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2P</span>
            </button>
            <button
              type="button"
              id="mode-eve"
              onClick={() => {
                soundManager.playClickSound();
                onSelectGameMode('eve');
              }}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                gameMode === 'eve'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Bot vs Bot</span>
            </button>
          </div>
        </div>

        {/* AI Difficulty Selector (Only in PvE/EvE) */}
        {gameMode !== 'pvp' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              AI Difficulty
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                id="diff-easy"
                onClick={() => {
                  soundManager.playClickSound();
                  onSelectDifficulty('easy');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  difficulty === 'easy'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Easy</span>
              </button>
              <button
                type="button"
                id="diff-medium"
                onClick={() => {
                  soundManager.playClickSound();
                  onSelectDifficulty('medium');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  difficulty === 'medium'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Medium</span>
              </button>
              <button
                type="button"
                id="diff-hard"
                onClick={() => {
                  soundManager.playClickSound();
                  onSelectDifficulty('hard');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  difficulty === 'hard'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Hard</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pass & Play
            </label>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              Local 2-Player Match
            </div>
          </div>
        )}

        {/* Player Side / Color Selector (PvE) */}
        {gameMode === 'pve' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Play As
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                id="color-black"
                onClick={() => {
                  soundManager.playClickSound();
                  onSelectPlayerColor('black');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  playerColor === 'black'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-3 h-3 rounded-full stone-black" />
                <span>Black (1st)</span>
              </button>
              <button
                type="button"
                id="color-white"
                onClick={() => {
                  soundManager.playClickSound();
                  onSelectPlayerColor('white');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  playerColor === 'white'
                    ? 'bg-slate-200 text-slate-900 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-3 h-3 rounded-full stone-white" />
                <span>White (2nd)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Turn Order
            </label>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              Black plays 1st
            </div>
          </div>
        )}
      </div>

      {/* Main Action Buttons Bar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 flex-wrap">
        {/* Left: New Game */}
        <button
          type="button"
          id="btn-new-game"
          onClick={() => {
            soundManager.playClickSound();
            onNewGame();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Game</span>
        </button>

        {/* Center: Undo & Redo & Hint & Game Review */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btn-undo"
            disabled={!canUndo || isAiThinking || isReviewMode}
            onClick={() => {
              soundManager.playUndoSound();
              onUndo();
            }}
            title="Undo move (Ctrl+Z)"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-700 active:scale-95"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            id="btn-redo"
            disabled={!canRedo || isAiThinking || isReviewMode}
            onClick={() => {
              soundManager.playClickSound();
              onRedo();
            }}
            title="Redo move (Ctrl+Y)"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-700 active:scale-95"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Redo</span>
          </button>

          <button
            type="button"
            id="btn-hint"
            disabled={!canHint || isAiThinking || gameStatus !== 'playing' || isReviewMode}
            onClick={() => {
              soundManager.playClickSound();
              onGetHint();
            }}
            title="Get tactical advice"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 hover:border-amber-500/50 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-700 active:scale-95"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Hint</span>
          </button>

          {/* Game Review Button */}
          <button
            type="button"
            id="btn-review"
            disabled={!canReview || isAiThinking}
            onClick={() => {
              soundManager.playClickSound();
              onStartReview();
            }}
            title="Review match move-by-move with AI analysis"
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-md active:scale-95 ${
              isReviewMode
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-teal-500/20'
                : 'bg-slate-800 hover:bg-teal-950/60 hover:text-teal-300 hover:border-teal-500/50 disabled:opacity-40 text-teal-400 border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Review</span>
          </button>
        </div>

        {/* Right: Resign */}
        {gameStatus === 'playing' && !isReviewMode && (
          <button
            type="button"
            id="btn-resign"
            onClick={() => {
              soundManager.playClickSound();
              onResign();
            }}
            title="Surrender current match"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs sm:text-sm font-semibold transition-all border border-red-800/40 active:scale-95"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Resign</span>
          </button>
        )}
      </div>
    </div>
  );
};
