import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  BoardState,
  BoardTheme,
  Difficulty,
  GameMode,
  GameStats,
  GameStatus,
  Move,
  Position,
  StoneType,
  WinningInfo,
} from './types/game';
import {
  checkDraw,
  checkWin,
  createEmptyBoard,
  cloneBoard,
} from './utils/gomokuLogic';
import { computeAIMove, getHint } from './utils/ai/bot';
import { soundManager } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Board } from './components/Board';
import { TurnIndicator } from './components/TurnIndicator';
import { GameControls } from './components/GameControls';
import { Scoreboard } from './components/Scoreboard';
import { MoveHistory } from './components/MoveHistory';
import { WinnerModal } from './components/WinnerModal';
import { RulesModal } from './components/RulesModal';

const INITIAL_STATS: GameStats = {
  easy: { wins: 0, losses: 0, draws: 0 },
  medium: { wins: 0, losses: 0, draws: 0 },
  hard: { wins: 0, losses: 0, draws: 0 },
  pvp: { blackWins: 0, whiteWins: 0, draws: 0 },
  currentStreak: 0,
  bestStreak: 0,
};

export function App() {
  // Game Setup State
  const [board, setBoard] = useState<BoardState>(createEmptyBoard);
  const [currentTurn, setCurrentTurn] = useState<StoneType>('black');
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [winningInfo, setWinningInfo] = useState<WinningInfo | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [undoneMoves, setUndoneMoves] = useState<Move[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);

  // Configuration
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerColor, setPlayerColor] = useState<StoneType>('black');
  const [theme, setTheme] = useState<BoardTheme>('kaya');
  const [showMoveNumbers, setShowMoveNumbers] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());

  // AI & Tactical State
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [hintPos, setHintPos] = useState<Position | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState<boolean>(false);

  // Statistics with persistent localStorage
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('gomoku_game_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_STATS;
  });

  // Track AI turn request IDs to prevent race conditions
  const aiRequestIdRef = useRef<number>(0);
  const gameStatusRef = useRef(gameStatus);
  gameStatusRef.current = gameStatus;

  // Persist stats
  useEffect(() => {
    localStorage.setItem('gomoku_game_stats', JSON.stringify(stats));
  }, [stats]);

  // Handle Game End & Stats update
  const handleGameEnd = useCallback(
    (status: GameStatus, winInfo: WinningInfo | null) => {
      setGameStatus(status);
      setWinningInfo(winInfo);
      setIsWinnerModalOpen(true);
      setIsAiThinking(false);

      setStats((prev) => {
        const next = { ...prev };
        if (gameMode === 'pve') {
          const isPlayerWin =
            (status === 'black_win' && playerColor === 'black') ||
            (status === 'white_win' && playerColor === 'white');
          const isDraw = status === 'draw';

          const diffStats = { ...next[difficulty] };
          if (isDraw) {
            diffStats.draws++;
          } else if (isPlayerWin) {
            diffStats.wins++;
            next.currentStreak++;
            if (next.currentStreak > next.bestStreak) {
              next.bestStreak = next.currentStreak;
            }
          } else {
            diffStats.losses++;
            next.currentStreak = 0;
          }
          next[difficulty] = diffStats;
        } else if (gameMode === 'pvp') {
          const pvpStats = { ...next.pvp };
          if (status === 'black_win') pvpStats.blackWins++;
          else if (status === 'white_win') pvpStats.whiteWins++;
          else if (status === 'draw') pvpStats.draws++;
          next.pvp = pvpStats;
        }
        return next;
      });
    },
    [gameMode, playerColor, difficulty]
  );

  // Place a stone on the board
  const makeMove = useCallback(
    (row: number, col: number, player: StoneType, explanation?: string) => {
      soundManager.playStoneSound();

      const newBoard = cloneBoard(board);
      newBoard[row][col] = player;
      setBoard(newBoard);

      const moveNumber = moves.length + 1;
      const newMove: Move = {
        row,
        col,
        player,
        moveNumber,
        timestamp: Date.now(),
      };

      const updatedMoves = [...moves, newMove];
      setMoves(updatedMoves);
      setUndoneMoves([]);
      setCurrentMoveIndex(updatedMoves.length - 1);
      setHintPos(null);
      if (explanation) {
        setAiExplanation(explanation);
      }

      // Check Win
      const win = checkWin(newBoard, row, col);
      if (win) {
        handleGameEnd(player === 'black' ? 'black_win' : 'white_win', win);
        return;
      }

      // Check Draw
      if (checkDraw(newBoard)) {
        handleGameEnd('draw', null);
        return;
      }

      // Toggle Turn
      setCurrentTurn(player === 'black' ? 'white' : 'black');
    },
    [board, moves, handleGameEnd]
  );

  // User click on board intersection
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (
        gameStatus !== 'playing' ||
        board[row][col] !== null ||
        isAiThinking
      ) {
        return;
      }

      // If PvE mode and it's AI's turn, ignore clicks
      if (gameMode === 'pve' && currentTurn !== playerColor) {
        return;
      }

      // If EvE mode, ignore clicks
      if (gameMode === 'eve') {
        return;
      }

      makeMove(row, col, currentTurn);
    },
    [gameStatus, board, currentTurn, gameMode, playerColor, isAiThinking, makeMove]
  );

  // AI Turn Handler
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setIsAiThinking(false);
      return;
    }

    const isPvETurn = gameMode === 'pve' && currentTurn !== playerColor;
    const isEvETurn = gameMode === 'eve';

    if (isPvETurn || isEvETurn) {
      const requestId = ++aiRequestIdRef.current;
      setIsAiThinking(true);

      computeAIMove(board, difficulty, currentTurn).then((analysis) => {
        // Only apply move if this request is still current and game is playing
        if (aiRequestIdRef.current === requestId && gameStatusRef.current === 'playing') {
          setIsAiThinking(false);
          makeMove(
            analysis.bestMove.row,
            analysis.bestMove.col,
            currentTurn,
            analysis.explanation
          );
        }
      });
    } else {
      setIsAiThinking(false);
    }
  }, [board, currentTurn, gameMode, playerColor, difficulty, gameStatus, makeMove]);

  // Start New Game
  const handleNewGame = useCallback(() => {
    aiRequestIdRef.current++;
    setBoard(createEmptyBoard());
    setCurrentTurn('black');
    setGameStatus('playing');
    setWinningInfo(null);
    setMoves([]);
    setUndoneMoves([]);
    setCurrentMoveIndex(-1);
    setHintPos(null);
    setAiExplanation(null);
    setIsAiThinking(false);
    setIsWinnerModalOpen(false);
  }, []);

  // Undo Move
  const handleUndo = useCallback(() => {
    if (moves.length === 0 || isAiThinking || gameStatus !== 'playing') return;

    aiRequestIdRef.current++;
    let targetCount = moves.length;
    let popped: Move[] = [];

    if (gameMode === 'pve') {
      // In PvE, undo both AI and player moves so player gets their turn back
      const undoAmount = moves.length >= 2 ? 2 : 1;
      targetCount = moves.length - undoAmount;
      popped = moves.slice(targetCount);
    } else {
      // In PvP, undo 1 move
      targetCount = moves.length - 1;
      popped = moves.slice(targetCount);
    }

    const remaining = moves.slice(0, targetCount);
    const newBoard = createEmptyBoard();
    remaining.forEach((m) => {
      newBoard[m.row][m.col] = m.player;
    });

    setBoard(newBoard);
    setMoves(remaining);
    setUndoneMoves((prev) => [...popped.reverse(), ...prev]);
    setCurrentMoveIndex(remaining.length - 1);
    setCurrentTurn(remaining.length % 2 === 0 ? 'black' : 'white');
    setHintPos(null);
    setAiExplanation(null);
    setWinningInfo(null);
    setIsAiThinking(false);
  }, [moves, isAiThinking, gameStatus, gameMode]);

  // Redo Move
  const handleRedo = useCallback(() => {
    if (undoneMoves.length === 0 || isAiThinking || gameStatus !== 'playing') return;

    aiRequestIdRef.current++;
    let redoAmount = 1;
    if (gameMode === 'pve' && undoneMoves.length >= 2) {
      redoAmount = 2;
    }

    const toApply = undoneMoves.slice(0, redoAmount);
    const remainingUndone = undoneMoves.slice(redoAmount);

    const newBoard = cloneBoard(board);
    toApply.forEach((m) => {
      newBoard[m.row][m.col] = m.player;
    });

    const updatedMoves = [...moves, ...toApply];
    setBoard(newBoard);
    setMoves(updatedMoves);
    setUndoneMoves(remainingUndone);
    setCurrentMoveIndex(updatedMoves.length - 1);
    setCurrentTurn(updatedMoves.length % 2 === 0 ? 'black' : 'white');
    setHintPos(null);
    setIsAiThinking(false);

    // Check if redone move produced a win
    const lastM = toApply[toApply.length - 1];
    const win = checkWin(newBoard, lastM.row, lastM.col);
    if (win) {
      handleGameEnd(lastM.player === 'black' ? 'black_win' : 'white_win', win);
    }
  }, [undoneMoves, isAiThinking, gameStatus, gameMode, board, moves, handleGameEnd]);

  // Get AI Hint
  const handleGetHint = useCallback(() => {
    if (isAiThinking || gameStatus !== 'playing') return;

    const analysis = getHint(board, currentTurn);
    setHintPos(analysis.bestMove);
    setAiExplanation(`Hint: ${analysis.explanation}`);
  }, [board, currentTurn, isAiThinking, gameStatus]);

  // Resign Match
  const handleResign = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (window.confirm('Are you sure you want to resign this match?')) {
      aiRequestIdRef.current++;
      const winner: StoneType = currentTurn === 'black' ? 'white' : 'black';
      handleGameEnd(winner === 'black' ? 'black_win' : 'white_win', null);
    }
  }, [gameStatus, currentTurn, handleGameEnd]);

  // Jump to specific move (Replay)
  const handleJumpToMove = useCallback(
    (index: number) => {
      if (index < 0 || index >= moves.length) return;

      aiRequestIdRef.current++;
      const subMoves = moves.slice(0, index + 1);
      const newBoard = createEmptyBoard();
      subMoves.forEach((m) => {
        newBoard[m.row][m.col] = m.player;
      });

      setBoard(newBoard);
      setCurrentMoveIndex(index);
      setCurrentTurn((index + 1) % 2 === 0 ? 'black' : 'white');
      setIsAiThinking(false);

      // Check win for historical step
      const last = subMoves[subMoves.length - 1];
      const win = checkWin(newBoard, last.row, last.col);
      setWinningInfo(win);
    },
    [moves]
  );

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleGetHint();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewGame();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const next = soundManager.toggleMute();
        setIsMuted(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleGetHint, handleNewGame]);

  const lastPlacedMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        theme={theme}
        onSelectTheme={setTheme}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = soundManager.toggleMute();
          setIsMuted(next);
        }}
        showMoveNumbers={showMoveNumbers}
        onToggleMoveNumbers={() => setShowMoveNumbers(!showMoveNumbers)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Game Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col items-center">
        {/* Turn & Player Status Indicator */}
        <div className="w-full mb-4">
          <TurnIndicator
            currentTurn={currentTurn}
            gameStatus={gameStatus}
            gameMode={gameMode}
            playerColor={playerColor}
            difficulty={difficulty}
            isAiThinking={isAiThinking}
            moveCount={moves.length}
          />
        </div>

        {/* Board & Sidebars Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Scoreboard & Stats (Desktop 3 cols) */}
          <div className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-4">
            <Scoreboard
              stats={stats}
              currentDifficulty={difficulty}
              onResetStats={() => {
                setStats(INITIAL_STATS);
                localStorage.removeItem('gomoku_game_stats');
              }}
            />
          </div>

          {/* Center: Interactive Board & Controls (Desktop 6 cols) */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center gap-4">
            <Board
              board={board}
              onCellClick={handleCellClick}
              disabled={
                gameStatus !== 'playing' ||
                isAiThinking ||
                (gameMode === 'pve' && currentTurn !== playerColor) ||
                gameMode === 'eve'
              }
              currentTurn={currentTurn}
              lastMove={lastPlacedMove}
              winningInfo={winningInfo}
              hintPos={hintPos}
              showMoveNumbers={showMoveNumbers}
              theme={theme}
              moves={moves}
            />

            {/* Quick Action Controls */}
            <GameControls
              gameMode={gameMode}
              onSelectGameMode={(m) => {
                setGameMode(m);
                handleNewGame();
              }}
              difficulty={difficulty}
              onSelectDifficulty={(d) => {
                setDifficulty(d);
                handleNewGame();
              }}
              playerColor={playerColor}
              onSelectPlayerColor={(c) => {
                setPlayerColor(c);
                handleNewGame();
              }}
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              canUndo={moves.length > 0}
              onRedo={handleRedo}
              canRedo={undoneMoves.length > 0}
              onGetHint={handleGetHint}
              canHint={gameStatus === 'playing'}
              onResign={handleResign}
              gameStatus={gameStatus}
              isAiThinking={isAiThinking}
            />
          </div>

          {/* Right Side: Move History & Tactical Log (Desktop 3 cols) */}
          <div className="lg:col-span-3 order-3 flex flex-col gap-4">
            <MoveHistory
              moves={moves}
              currentMoveIndex={currentMoveIndex}
              onJumpToMove={handleJumpToMove}
              aiExplanation={aiExplanation}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          Gomoku Master (五目並べ) — Five in a Row Web Game with Minimax AI & Pattern Recognition.
        </p>
      </footer>

      {/* Modals */}
      {isWinnerModalOpen && (
        <WinnerModal
          gameStatus={gameStatus}
          gameMode={gameMode}
          playerColor={playerColor}
          difficulty={difficulty}
          totalMoves={moves.length}
          onRematch={handleNewGame}
          onClose={() => setIsWinnerModalOpen(false)}
        />
      )}

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}

export default App;
