import React from 'react';
import type { EvaluationResult } from '../utils/ai/evaluator';

interface EvalBarProps {
  evaluation: EvaluationResult;
  orientation?: 'vertical' | 'horizontal';
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evaluation,
  orientation = 'vertical',
}) => {
  const { percentage, displayText, rawScore } = evaluation;

  // percentage is Black's share: 0 (White win) to 100 (Black win)
  // White's share is 100 - percentage
  const blackPercent = Math.max(0, Math.min(100, percentage));
  const whitePercent = 100 - blackPercent;

  const isBlackAhead = rawScore > 0;
  const isWhiteAhead = rawScore < 0;

  if (orientation === 'horizontal') {
    return (
      <div className="w-full flex flex-col gap-1 select-none">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold px-1 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full stone-black inline-block" />
            <span>Black</span>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-xs ${
              isBlackAhead
                ? 'text-amber-400 bg-slate-900 border border-amber-500/30'
                : isWhiteAhead
                ? 'text-indigo-300 bg-slate-900 border border-indigo-500/30'
                : 'text-slate-300 bg-slate-900 border border-slate-700'
            }`}
          >
            {displayText}
          </span>
          <span className="flex items-center gap-1">
            <span>White</span>
            <span className="w-2 h-2 rounded-full stone-white inline-block" />
          </span>
        </div>
        {/* Horizontal Split Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-950 border border-slate-700 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-stone-900 to-stone-800 transition-all duration-500 ease-out"
            style={{ width: `${blackPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-slate-200 to-white transition-all duration-500 ease-out"
            style={{ width: `${whitePercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Vertical Bar for desktop layout
  return (
    <div
      data-testid="eval-bar"
      className="relative flex flex-col items-center justify-center select-none"
      title={`Live Evaluation: ${displayText} (${blackPercent}% Black / ${whitePercent}% White)`}
    >
      <div className="w-6 sm:w-7 h-[340px] sm:h-[480px] md:h-[540px] lg:h-[580px] rounded-xl overflow-hidden flex flex-col bg-slate-950 border border-slate-700/80 shadow-2xl relative">
        {/* Top: White Territory */}
        <div
          className="w-full bg-gradient-to-b from-white via-slate-100 to-slate-300 transition-all duration-500 ease-out relative flex items-start justify-center pt-2"
          style={{ height: `${whitePercent}%` }}
        >
          {isWhiteAhead && (
            <span className="text-[10px] sm:text-xs font-mono font-extrabold text-slate-900 transform -rotate-90 sm:rotate-0 tracking-tighter">
              {displayText}
            </span>
          )}
        </div>

        {/* Bottom: Black Territory */}
        <div
          className="w-full bg-gradient-to-t from-black via-stone-900 to-stone-800 transition-all duration-500 ease-out relative flex items-end justify-center pb-2"
          style={{ height: `${blackPercent}%` }}
        >
          {isBlackAhead && (
            <span className="text-[10px] sm:text-xs font-mono font-extrabold text-amber-400 transform -rotate-90 sm:rotate-0 tracking-tighter">
              {displayText}
            </span>
          )}
          {!isBlackAhead && !isWhiteAhead && (
            <span className="text-[10px] font-mono font-bold text-slate-400">0.0</span>
          )}
        </div>

        {/* Center Line indicator */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-500/40 pointer-events-none" />
      </div>
      <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">EVAL</span>
    </div>
  );
};
