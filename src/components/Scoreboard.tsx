import React from 'react';
import type { Difficulty, GameStats } from '../types/game';
import { Trophy, Flame, Target, RotateCcw } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ScoreboardProps {
  stats: GameStats;
  currentDifficulty: Difficulty;
  onResetStats: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  stats,
  currentDifficulty,
  onResetStats,
}) => {
  const currentDiffStats = stats[currentDifficulty];
  const totalGames = currentDiffStats.wins + currentDiffStats.losses + currentDiffStats.draws;
  const winRate = totalGames > 0 ? Math.round((currentDiffStats.wins / totalGames) * 100) : 0;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Title & Difficulty Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">Session Scoreboard</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 capitalize border border-slate-700">
          {currentDifficulty} Mode
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        {/* Wins */}
        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Wins
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
            {currentDiffStats.wins}
          </div>
        </div>

        {/* Losses */}
        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
            Losses
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-300 mt-0.5">
            {currentDiffStats.losses}
          </div>
        </div>

        {/* Draws */}
        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Draws
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-300 mt-0.5">
            {currentDiffStats.draws}
          </div>
        </div>
      </div>

      {/* Win Rate Bar & Streaks */}
      <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-400" /> Win Rate
          </span>
          <span className="font-bold text-slate-200">{winRate}% ({totalGames} games)</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${winRate}%` }}
          />
        </div>

        {/* Streaks */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 mt-1">
          <div className="flex items-center gap-1 text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Current Streak:</span>
            <span className="font-bold text-amber-400">{stats.currentStreak}</span>
          </div>
          <div className="text-slate-400">
            <span>Best: </span>
            <span className="font-bold text-slate-200">{stats.bestStreak}</span>
          </div>
        </div>
      </div>

      {/* Reset Stats Link */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all score statistics?')) {
              soundManager.playClickSound();
              onResetStats();
            }
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Stats</span>
        </button>
      </div>
    </div>
  );
};
