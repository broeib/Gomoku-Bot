import React from 'react';
import type { BoardTheme } from '../types/game';
import { Volume2, VolumeX, HelpCircle, Hash } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface NavbarProps {
  theme: BoardTheme;
  onSelectTheme: (theme: BoardTheme) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showMoveNumbers: boolean;
  onToggleMoveNumbers: () => void;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onSelectTheme,
  isMuted,
  onToggleMute,
  showMoveNumbers,
  onToggleMoveNumbers,
  onOpenRules,
}) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-500/20">
            <div className="w-4 h-4 rounded-full stone-black absolute -top-1 -left-1" />
            <div className="w-4 h-4 rounded-full stone-white absolute -bottom-1 -right-1" />
            <span className="font-heading font-extrabold text-slate-950 text-sm">五</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-heading">
                Gomoku Master
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                AI Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Five in a Row • Minimax & Pattern AI
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Board Theme Picker */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              id="theme-kaya"
              onClick={() => {
                soundManager.playClickSound();
                onSelectTheme('kaya');
              }}
              title="Kaya Wood Board"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                theme === 'kaya'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kaya
            </button>
            <button
              type="button"
              id="theme-dark"
              onClick={() => {
                soundManager.playClickSound();
                onSelectTheme('dark');
              }}
              title="Dark Rosewood Board"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-amber-950 text-amber-200 border border-amber-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              id="theme-slate"
              onClick={() => {
                soundManager.playClickSound();
                onSelectTheme('slate');
              }}
              title="Modern Slate Board"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                theme === 'slate'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Slate
            </button>
          </div>

          {/* Move Numbers Toggle */}
          <button
            type="button"
            id="toggle-move-numbers"
            onClick={() => {
              soundManager.playClickSound();
              onToggleMoveNumbers();
            }}
            title={showMoveNumbers ? 'Hide move numbers' : 'Show move numbers on stones'}
            className={`p-2 rounded-xl border transition-all ${
              showMoveNumbers
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            type="button"
            id="toggle-sound"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute audio effects' : 'Mute audio effects'}
            className={`p-2 rounded-xl border transition-all ${
              !isMuted
                ? 'bg-slate-900 text-slate-200 border-slate-800 hover:text-amber-400'
                : 'bg-rose-950/30 text-rose-400 border-rose-900/40'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rules Guide Modal Button */}
          <button
            type="button"
            id="btn-rules"
            onClick={() => {
              soundManager.playClickSound();
              onOpenRules();
            }}
            title="View Rules & Strategy"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>
        </div>
      </div>
    </header>
  );
};
