import React, { useRef, useEffect } from 'react';
import type { Move } from '../types/game';
import { formatCoordinate } from '../utils/gomokuLogic';
import { History, Copy, Check, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex: number;
  onJumpToMove: (index: number) => void;
  aiExplanation?: string | null;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onJumpToMove,
  aiExplanation,
}) => {
  const [copied, setCopied] = React.useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new move is added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

  const copyNotation = () => {
    soundManager.playClickSound();
    const notation = moves
      .map((m, idx) => `${idx + 1}. ${m.player === 'black' ? 'B' : 'W'}-${formatCoordinate(m.row, m.col)}`)
      .join(' ');
    navigator.clipboard.writeText(notation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group moves into pairs (Black, White)
  const pairedMoves: { number: number; black?: Move; white?: Move }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push({
      number: Math.floor(i / 2) + 1,
      black: moves[i],
      white: moves[i + 1],
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">Move History</h3>
          <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            {moves.length} moves
          </span>
        </div>

        {moves.length > 0 && (
          <button
            type="button"
            onClick={copyNotation}
            title="Copy game moves notation"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors bg-slate-800 hover:bg-slate-700/80 px-2 py-1 rounded-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        )}
      </div>

      {/* AI Tactical Explanation Box (if active) */}
      {aiExplanation && (
        <div className="m-3 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-400">Analysis: </span>
            <span className="text-slate-300">{aiExplanation}</span>
          </div>
        </div>
      )}

      {/* Moves List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[300px] sm:max-h-[360px] text-xs font-mono"
      >
        {moves.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8 text-xs font-sans">
            <p>No moves placed yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Black places the first stone.</p>
          </div>
        ) : (
          pairedMoves.map((pair, pIdx) => {
            const blackIdx = pIdx * 2;
            const whiteIdx = pIdx * 2 + 1;

            const isBlackActive = currentMoveIndex === blackIdx;
            const isWhiteActive = currentMoveIndex === whiteIdx;

            return (
              <div
                key={`pair-${pair.number}`}
                className="grid grid-cols-7 items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800/40 transition-colors"
              >
                {/* Round Number */}
                <div className="col-span-1 text-slate-500 font-semibold">
                  {pair.number}.
                </div>

                {/* Black Move */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClickSound();
                    onJumpToMove(blackIdx);
                  }}
                  className={`col-span-3 flex items-center gap-1.5 py-1 px-2 rounded-md transition-all ${
                    isBlackActive
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full stone-black flex-shrink-0" />
                  <span>{formatCoordinate(pair.black!.row, pair.black!.col)}</span>
                </button>

                {/* White Move */}
                {pair.white ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      onJumpToMove(whiteIdx);
                    }}
                    className={`col-span-3 flex items-center gap-1.5 py-1 px-2 rounded-md transition-all ${
                      isWhiteActive
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full stone-white flex-shrink-0" />
                    <span>{formatCoordinate(pair.white.row, pair.white.col)}</span>
                  </button>
                ) : (
                  <div className="col-span-3 text-slate-600 px-2">-</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
