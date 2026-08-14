import React, { useState, useEffect } from 'react';
import type { GameReviewSummary, MoveClassification } from '../types/game';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  X,
  Target,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { formatCoordinate } from '../utils/gomokuLogic';

interface GameReviewPanelProps {
  summary: GameReviewSummary;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
}

const CLASSIFICATION_INFO: Record<
  MoveClassification,
  { label: string; icon: string; color: string; bg: string }
> = {
  brilliant: { label: 'Brilliant', icon: '★', color: 'text-teal-400', bg: 'bg-teal-500/20 border-teal-500/40' },
  best: { label: 'Best', icon: '✓', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  good: { label: 'Good', icon: '✓', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/40' },
  inaccuracy: { label: 'Inaccuracy', icon: '?!', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
  mistake: { label: 'Mistake', icon: '?', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
  blunder: { label: 'Blunder', icon: '??', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40' },
  book: { label: 'Book', icon: '📖', color: 'text-stone-400', bg: 'bg-stone-500/20 border-stone-500/40' },
};

export const GameReviewPanel: React.FC<GameReviewPanelProps> = ({
  summary,
  currentStepIndex,
  onStepChange,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { blackAccuracy, whiteAccuracy, reviewedMoves, classificationsCount } = summary;

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      onStepChange((currentStepIndex + 1) % reviewedMoves.length);
    }, 1500);

    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, reviewedMoves.length, onStepChange]);

  const currentMove = reviewedMoves[currentStepIndex] || reviewedMoves[0];
  const classInfo = CLASSIFICATION_INFO[currentMove.classification];

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-slate-200">
      {/* Header with Close */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading">Game Review</h3>
            <p className="text-[10px] text-slate-400">Chess.com-style Tactical Analysis</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            onClose();
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Exit Review Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Accuracy Header Cards */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/30 grid grid-cols-2 gap-2 text-center">
        {/* Black Accuracy */}
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1">
            <div className="w-3 h-3 rounded-full stone-black" />
            <span>Black</span>
          </div>
          <span className="text-xl font-black text-amber-400 font-mono">
            {blackAccuracy}%
          </span>
          <span className="text-[10px] text-slate-400">Accuracy</span>
        </div>

        {/* White Accuracy */}
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1">
            <div className="w-3 h-3 rounded-full stone-white" />
            <span>White</span>
          </div>
          <span className="text-xl font-black text-indigo-400 font-mono">
            {whiteAccuracy}%
          </span>
          <span className="text-[10px] text-slate-400">Accuracy</span>
        </div>
      </div>

      {/* Current Move Detail Card */}
      <div className="p-3.5 border-b border-slate-800 flex flex-col gap-2.5 bg-slate-950/40">
        {/* Step & Classification Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-400">
            Move {currentMove.moveIndex + 1} of {reviewedMoves.length}
          </span>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${classInfo.bg} ${classInfo.color}`}
          >
            <span>{classInfo.icon}</span>
            <span>{classInfo.label}</span>
          </div>
        </div>

        {/* Move Comparison */}
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span>
              Played Move:{' '}
              <strong className="text-white font-mono">
                {formatCoordinate(currentMove.move.row, currentMove.move.col)}
              </strong>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Eval: <strong className="text-amber-400">{currentMove.evalText}</strong>
            </span>
          </div>

          {currentMove.move.row !== currentMove.bestMove.row ||
          currentMove.move.col !== currentMove.bestMove.col ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Target className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Optimal:{' '}
                <strong className="font-mono text-emerald-300">
                  {formatCoordinate(currentMove.bestMove.row, currentMove.bestMove.col)}
                </strong>
              </span>
            </div>
          ) : null}
        </div>

        {/* Tactical Explanation */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
          {currentMove.explanation}
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            onStepChange(0);
          }}
          disabled={currentStepIndex === 0}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-all"
          title="First Move"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            onStepChange(Math.max(0, currentStepIndex - 1));
          }}
          disabled={currentStepIndex === 0}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-all"
          title="Previous Move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            setIsPlaying(!isPlaying);
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isPlaying ? 'Pause auto-play' : 'Start auto-play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            onStepChange(Math.min(reviewedMoves.length - 1, currentStepIndex + 1));
          }}
          disabled={currentStepIndex === reviewedMoves.length - 1}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-all"
          title="Next Move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playClickSound();
            onStepChange(reviewedMoves.length - 1);
          }}
          disabled={currentStepIndex === reviewedMoves.length - 1}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-all"
          title="Last Move"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Move List with Classification Icons */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[220px] font-mono text-xs">
        {reviewedMoves.map((rm, idx) => {
          const isCurrent = currentStepIndex === idx;
          const info = CLASSIFICATION_INFO[rm.classification];

          return (
            <button
              key={`rev-step-${idx}`}
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                onStepChange(idx);
              }}
              className={`w-full flex items-center justify-between p-1.5 px-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-5 text-left">{idx + 1}.</span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    rm.move.player === 'black' ? 'stone-black' : 'stone-white'
                  }`}
                />
                <span>{formatCoordinate(rm.move.row, rm.move.col)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">{rm.evalText}</span>
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${info.bg} ${info.color}`}
                >
                  {info.icon}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Breakdown Summary Stats Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] flex flex-col gap-1.5">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
          Classification Breakdown
        </span>
        <div className="grid grid-cols-4 gap-1 text-center font-mono">
          <div className="bg-slate-900 p-1 rounded border border-slate-800 text-teal-400">
            ★ {classificationsCount.black.brilliant + classificationsCount.white.brilliant}
          </div>
          <div className="bg-slate-900 p-1 rounded border border-slate-800 text-emerald-400">
            ✓ {classificationsCount.black.best + classificationsCount.white.best}
          </div>
          <div className="bg-slate-900 p-1 rounded border border-slate-800 text-amber-400">
            ?! {classificationsCount.black.inaccuracy + classificationsCount.white.inaccuracy}
          </div>
          <div className="bg-slate-900 p-1 rounded border border-slate-800 text-rose-400">
            ?? {classificationsCount.black.blunder + classificationsCount.white.blunder}
          </div>
        </div>
      </div>
    </div>
  );
};
