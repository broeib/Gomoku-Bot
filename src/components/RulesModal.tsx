import React from 'react';
import { X, CheckCircle2, Zap, Keyboard } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col relative overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              五
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-heading">
                Gomoku Rules & Strategy Guide
              </h2>
              <p className="text-xs text-slate-400">Five in a Row (五目並べ)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs sm:text-sm leading-relaxed pr-1">
          {/* Core Rules */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Standard Objective & Rules
            </h3>
            <p className="text-slate-300">
              Gomoku is played on a 15x15 intersection grid. <strong>Black</strong> places the first stone at any intersection, followed alternately by <strong>White</strong>.
            </p>
            <p className="text-slate-300">
              The first player to form an unbroken alignment of <strong>5 or more stones</strong> horizontally, vertically, or diagonally immediately wins the game.
            </p>
          </section>

          {/* Tactical Patterns */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Key Tactical Patterns
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Open Four (Live Four)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <code>0XXXX0</code> — 4 stones with both ends open. Unstoppable win because the opponent can only block one side.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Open Three (Live Three)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <code>0XXX0</code> — 3 stones with open ends that can advance to an Open Four on your next move.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Double Threats (Fork)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Creating two simultaneous 3s or a 4-3 combo. Defending one leaves the other open to finish.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Blocked Four (Sleepy 4)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <code>2XXXX0</code> or <code>XX0XX</code> — 4 stones with one open end. Forces immediate response.
                </p>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-indigo-400" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">Undo Move</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">Ctrl+Z</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">Redo Move</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">Ctrl+Y</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">Tactical Hint</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">H</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">Toggle Eval Bar</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">E</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">New Game</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">N</kbd>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
