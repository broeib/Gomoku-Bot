import React, { useState } from 'react';
import { BOARD_SIZE } from '../types/game';
import type { BoardState, BoardTheme, Position, StoneType, WinningInfo, Move } from '../types/game';
import { STAR_POINTS, formatCoordinate } from '../utils/gomokuLogic';

interface BoardProps {
  board: BoardState;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
  currentTurn: StoneType;
  lastMove: Move | null;
  winningInfo: WinningInfo | null;
  hintPos: Position | null;
  showMoveNumbers: boolean;
  theme: BoardTheme;
  moves: Move[];
}

export const Board: React.FC<BoardProps> = ({
  board,
  onCellClick,
  disabled,
  currentTurn,
  lastMove,
  winningInfo,
  hintPos,
  showMoveNumbers,
  theme,
  moves,
}) => {
  const [hoveredPos, setHoveredPos] = useState<Position | null>(null);

  // Map to quickly find move number for any coordinate
  const moveNumberMap = React.useMemo(() => {
    const map = new Map<string, number>();
    moves.forEach((m) => {
      map.set(`${m.row},${m.col}`, m.moveNumber);
    });
    return map;
  }, [moves]);

  // Check if a position is part of winning 5-in-a-row
  const isWinningPos = (row: number, col: number): boolean => {
    if (!winningInfo) return false;
    return winningInfo.line.some((p) => p.row === row && p.col === col);
  };

  const getThemeClass = () => {
    switch (theme) {
      case 'dark':
        return 'wood-board-dark border-amber-950/80';
      case 'slate':
        return 'wood-board-slate border-slate-700/80';
      case 'kaya':
      default:
        return 'wood-board-kaya border-amber-800/80';
    }
  };

  const getGridLineColor = () => {
    switch (theme) {
      case 'dark':
        return 'rgba(217, 119, 6, 0.35)';
      case 'slate':
        return 'rgba(148, 163, 184, 0.35)';
      case 'kaya':
      default:
        return 'rgba(68, 36, 6, 0.65)';
    }
  };

  const getCoordTextColor = () => {
    switch (theme) {
      case 'dark':
        return 'text-amber-400/70 font-semibold';
      case 'slate':
        return 'text-slate-400 font-semibold';
      case 'kaya':
      default:
        return 'text-amber-950/75 font-bold';
    }
  };

  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  const rowLabels = Array.from({ length: BOARD_SIZE }, (_, i) => BOARD_SIZE - i);

  return (
    <div className="relative select-none flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Board Container */}
      <div
        className={`relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] md:w-[540px] md:h-[540px] lg:w-[580px] lg:h-[580px] rounded-xl sm:rounded-2xl p-4 sm:p-7 transition-all duration-300 ${getThemeClass()}`}
      >
        {/* Top Coordinate Rulers (A-O) */}
        <div className="absolute top-1 left-4 right-4 sm:top-1.5 sm:left-7 sm:right-7 flex justify-between pointer-events-none px-2">
          {colLabels.map((char) => (
            <span
              key={`top-${char}`}
              className={`text-[9px] sm:text-xs text-center w-[6.66%] ${getCoordTextColor()}`}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Bottom Coordinate Rulers (A-O) */}
        <div className="absolute bottom-1 left-4 right-4 sm:bottom-1.5 sm:left-7 sm:right-7 flex justify-between pointer-events-none px-2">
          {colLabels.map((char) => (
            <span
              key={`bot-${char}`}
              className={`text-[9px] sm:text-xs text-center w-[6.66%] ${getCoordTextColor()}`}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Left Coordinate Rulers (15-1) */}
        <div className="absolute left-1 top-4 bottom-4 sm:left-1.5 sm:top-7 sm:bottom-7 flex flex-col justify-between pointer-events-none py-2">
          {rowLabels.map((num) => (
            <span
              key={`left-${num}`}
              className={`text-[9px] sm:text-xs text-center h-[6.66%] flex items-center justify-center ${getCoordTextColor()}`}
            >
              {num}
            </span>
          ))}
        </div>

        {/* Right Coordinate Rulers (15-1) */}
        <div className="absolute right-1 top-4 bottom-4 sm:right-1.5 sm:top-7 sm:bottom-7 flex flex-col justify-between pointer-events-none py-2">
          {rowLabels.map((num) => (
            <span
              key={`right-${num}`}
              className={`text-[9px] sm:text-xs text-center h-[6.66%] flex items-center justify-center ${getCoordTextColor()}`}
            >
              {num}
            </span>
          ))}
        </div>

        {/* SVG Grid Lines & Star Points Layer */}
        <svg
          className="absolute inset-4 sm:inset-7 w-[calc(100%-2rem)] h-[calc(100%-2rem)] sm:w-[calc(100%-3.5rem)] sm:h-[calc(100%-3.5rem)] pointer-events-none"
          viewBox="0 0 1400 1400"
          preserveAspectRatio="none"
        >
          {/* Grid lines (15 horizontal, 15 vertical) */}
          {Array.from({ length: BOARD_SIZE }).map((_, i) => {
            const pos = (i / (BOARD_SIZE - 1)) * 1400;
            const isBorder = i === 0 || i === BOARD_SIZE - 1;
            const strokeWidth = isBorder ? '3.5' : '1.8';

            return (
              <g key={`lines-${i}`}>
                {/* Horizontal line */}
                <line
                  x1="0"
                  y1={pos}
                  x2="1400"
                  y2={pos}
                  stroke={getGridLineColor()}
                  strokeWidth={strokeWidth}
                />
                {/* Vertical line */}
                <line
                  x1={pos}
                  y1="0"
                  x2={pos}
                  y2="1400"
                  stroke={getGridLineColor()}
                  strokeWidth={strokeWidth}
                />
              </g>
            );
          })}

          {/* Star points (Hoshi) */}
          {STAR_POINTS.map((sp) => {
            const cx = (sp.col / (BOARD_SIZE - 1)) * 1400;
            const cy = (sp.row / (BOARD_SIZE - 1)) * 1400;
            return (
              <circle
                key={`star-${sp.row}-${sp.col}`}
                cx={cx}
                cy={cy}
                r="10"
                fill={theme === 'kaya' ? '#3e1d00' : theme === 'dark' ? '#d97706' : '#cbd5e1'}
              />
            );
          })}

          {/* Winning Line Highlight SVG connection */}
          {winningInfo && winningInfo.line.length >= 2 && (
            <line
              x1={(winningInfo.line[0].col / (BOARD_SIZE - 1)) * 1400}
              y1={(winningInfo.line[0].row / (BOARD_SIZE - 1)) * 1400}
              x2={(winningInfo.line[winningInfo.line.length - 1].col / (BOARD_SIZE - 1)) * 1400}
              y2={(winningInfo.line[winningInfo.line.length - 1].row / (BOARD_SIZE - 1)) * 1400}
              stroke="#eab308"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="6 6"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Interactive 15x15 Grid Intersections */}
        <div
          className="relative w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          }}
          onMouseLeave={() => setHoveredPos(null)}
        >
          {Array.from({ length: BOARD_SIZE }).map((_, row) =>
            Array.from({ length: BOARD_SIZE }).map((_, col) => {
              const stone = board[row][col];
              const isHovered =
                hoveredPos?.row === row &&
                hoveredPos?.col === col &&
                !stone &&
                !disabled &&
                !winningInfo;
              const isLast = lastMove?.row === row && lastMove?.col === col;
              const isWin = isWinningPos(row, col);
              const isHint = hintPos?.row === row && hintPos?.col === col && !stone;
              const moveNum = moveNumberMap.get(`${row},${col}`);

              return (
                <button
                  key={`cell-${row}-${col}`}
                  type="button"
                  id={`cell-${row}-${col}`}
                  aria-label={`Intersection ${formatCoordinate(row, col)}`}
                  disabled={disabled || !!stone || !!winningInfo}
                  onClick={() => onCellClick(row, col)}
                  onMouseEnter={() => setHoveredPos({ row, col })}
                  className="relative flex items-center justify-center p-0 m-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full group disabled:cursor-default"
                >
                  {/* Placed Stone */}
                  {stone && (
                    <div
                      className={`relative w-[86%] h-[86%] rounded-full flex items-center justify-center stone-enter ${
                        stone === 'black' ? 'stone-black text-slate-200' : 'stone-white text-slate-800'
                      } ${isWin ? 'stone-winning ring-4 ring-amber-400' : ''}`}
                    >
                      {/* Move number display */}
                      {showMoveNumbers && moveNum !== undefined && (
                        <span className="text-[9px] sm:text-xs font-bold leading-none select-none">
                          {moveNum}
                        </span>
                      )}

                      {/* Last Move Indicator Marker */}
                      {isLast && !isWin && (
                        <div
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                            stone === 'black' ? 'bg-amber-400' : 'bg-red-500'
                          } shadow-sm animate-pulse`}
                        />
                      )}
                    </div>
                  )}

                  {/* Ghost Hover Preview Stone */}
                  {isHovered && (
                    <div
                      className={`w-[84%] h-[84%] rounded-full opacity-65 pointer-events-none transition-transform transform scale-90 group-hover:scale-95 ${
                        currentTurn === 'black'
                          ? 'bg-stone-900/80 border border-stone-600 shadow-md'
                          : 'bg-white/85 border border-stone-300 shadow-md'
                      }`}
                    />
                  )}

                  {/* AI Hint Pulsing Marker */}
                  {isHint && (
                    <div className="absolute w-[90%] h-[90%] rounded-full border-2 border-amber-400 bg-amber-400/30 animate-ping pointer-events-none" />
                  )}
                  {isHint && (
                    <div className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-md pointer-events-none" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
