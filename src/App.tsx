import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  GameReviewSummary,
} from './types/game';
import {
  checkDraw,
  checkWin,
  createEmptyBoard,
  cloneBoard,
} from './utils/gomokuLogic';
import { computeAIMove, getHint } from './utils/ai/bot';
import { getBoardEvaluation } from './utils/ai/evaluator';
import { generateGameReview } from './utils/ai/reviewer';
import { soundManager } from './utils/audio';
import { Navbar } from './components/Navbar';
import { Board } from './components/Board';
import { TurnIndicator } from './components/TurnIndicator';
import { GameControls } from './components/GameControls';
import { Scoreboard } from './components/Scoreboard';
import { MoveHistory } from './components/MoveHistory';
import { WinnerModal } from './components/WinnerModal';
import { RulesModal } from './components/RulesModal';
import { EvalBar } from './components/EvalBar';
import { GameReviewPanel } from './components/GameReviewPanel';

const INITIAL_STATS: GameStats = {
  easy: { wins: 0, losses: 0, draws: 0 },
  medium: { wins: 0, losses: 0, draws: 0 },
  hard: { wins: 0, losses: 0, draws: 0 },
  expert: { wins: 0, losses: 0, draws: 0 },
  god: { wins: 0, losses: 0, draws: 0 },
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
  const [showEvalBar, setShowEvalBar] = useState<boolean>(() => {
    const saved = localStorage.getItem('gomoku_show_eval_bar');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());

  // AI & Tactical State
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [hintPos, setHintPos] = useState<Position | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Chess.com-style Game Review State
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewSummary, setReviewSummary] = useState<GameReviewSummary | null>(null);
  const [reviewStepIndex, setReviewStepIndex] = useState<number>(0);

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState<boolean>(false);

  // Statistics with persistent localStorage & safe migration
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('gomoku_game_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATS,
          ...parsed,
          easy: { ...INITIAL_STATS.easy, ...parsed.easy },
          medium: { ...INITIAL_STATS.medium, ...parsed.medium },
          hard: { ...INITIAL_STATS.hard, ...parsed.hard },
          expert: { ...INITIAL_STATS.expert, ...parsed.expert },
          god: { ...INITIAL_STATS.god, ...parsed.god },
        };
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

  // Toggle Eval Bar & Persist
  const handleToggleEvalBar = useCallback(() => {
    setShowEvalBar((prev) => {
      const next = !prev;
      localStorage.setItem('gomoku_show_eval_bar', String(next));
      return next;
    });
  }, []);

  // Live board evaluation calculation
  const liveEvaluation = useMemo(() => {
    if (isReviewMode && reviewSummary && reviewSummary.reviewedMoves[reviewStepIndex]) {
      const rm = reviewSummary.reviewedMoves[reviewStepIndex];
      return {
        rawScore: rm.evalAfter,
        percentage: rm.normalizedAdvantage,
        displayText: rm.evalText,
      };
    }
    return getBoardEvaluation(board);
  }, [board, isReviewMode, reviewSummary, reviewStepIndex]);

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
        isReviewMode ||
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
    [isReviewMode, gameStatus, board, currentTurn, gameMode, playerColor, isAiThinking, makeMove]
  );

  // AI Turn Handler
  useEffect(() => {
    if (isReviewMode || gameStatus !== 'playing') {
      setIsAiThinking(false);
      return;
    }

    const isPvETurn = gameMode === 'pve' && currentTurn !== playerColor;
    const isEvETurn = gameMode === 'eve';

    if (isPvETurn || isEvETurn) {
      const requestId = ++aiRequestIdRef.current;
      setIsAiThinking(true);

      computeAIMove(board, difficulty, currentTurn).then((analysis) => {
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
  }, [board, currentTurn, gameMode, playerColor, difficulty, gameStatus, isReviewMode, makeMove]);

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
    setIsReviewMode(false);
    setReviewSummary(null);
  }, []);

  // Launch Chess.com-style Game Review
  const handleStartReview = useCallback(() => {
    if (moves.length === 0) return;
    const summary = generateGameReview(moves);
    setReviewSummary(summary);
    setIsReviewMode(true);
    setReviewStepIndex(0);

    // Reconstruct board at move 0
    const stepBoard = createEmptyBoard();
    if (moves.length > 0) {
      stepBoard[moves[0].row][moves[0].col] = moves[0].player;
    }
    setBoard(stepBoard);
    setIsWinnerModalOpen(false);
  }, [moves]);

  // Step through Game Review
  const handleReviewStepChange = useCallback(
    (stepIndex: number) => {
      if (!reviewSummary || stepIndex < 0 || stepIndex >= reviewSummary.reviewedMoves.length) {
        return;
      }
      setReviewStepIndex(stepIndex);
      const subMoves = moves.slice(0, stepIndex + 1);
      const stepBoard = createEmptyBoard();
      subMoves.forEach((m) => {
        stepBoard[m.row][m.col] = m.player;
      });
      setBoard(stepBoard);

      const last = subMoves[subMoves.length - 1];
      const win = checkWin(stepBoard, last.row, last.col);
      setWinningInfo(win);
    },
    [reviewSummary, moves]
  );

  // Close Game Review and restore full board
  const handleCloseReview = useCallback(() => {
    setIsReviewMode(false);
    setReviewSummary(null);
    const restoredBoard = createEmptyBoard();
    moves.forEach((m) => {
      restoredBoard[m.row][m.col] = m.player;
    });
    setBoard(restoredBoard);
    if (moves.length > 0) {
      const last = moves[moves.length - 1];
      setWinningInfo(checkWin(restoredBoard, last.row, last.col));
    }
  }, [moves]);

  // Undo Move
  const handleUndo = useCallback(() => {
    if (moves.length === 0 || isAiThinking || gameStatus !== 'playing' || isReviewMode) return;

    aiRequestIdRef.current++;
    let targetCount = moves.length;
    let popped: Move[] = [];

    if (gameMode === 'pve') {
      const undoAmount = moves.length >= 2 ? 2 : 1;
      targetCount = moves.length - undoAmount;
      popped = moves.slice(targetCount);
    } else {
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
  }, [moves, isAiThinking, gameStatus, isReviewMode, gameMode]);

  // Redo Move
  const handleRedo = useCallback(() => {
    if (undoneMoves.length === 0 || isAiThinking || gameStatus !== 'playing' || isReviewMode) return;

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

    const lastM = toApply[toApply.length - 1];
    const win = checkWin(newBoard, lastM.row, lastM.col);
    if (win) {
      handleGameEnd(lastM.player === 'black' ? 'black_win' : 'white_win', win);
    }
  }, [undoneMoves, isAiThinking, gameStatus, isReviewMode, gameMode, board, moves, handleGameEnd]);

  // Get AI Hint
  const handleGetHint = useCallback(() => {
    if (isAiThinking || gameStatus !== 'playing' || isReviewMode) return;

    const analysis = getHint(board, currentTurn);
    setHintPos(analysis.bestMove);
    setAiExplanation(`Hint: ${analysis.explanation}`);
  }, [board, currentTurn, isAiThinking, gameStatus, isReviewMode]);

  // Resign Match
  const handleResign = useCallback(() => {
    if (gameStatus !== 'playing' || isReviewMode) return;
    if (window.confirm('Are you sure you want to resign this match?')) {
      aiRequestIdRef.current++;
      const winner: StoneType = currentTurn === 'black' ? 'white' : 'black';
      handleGameEnd(winner === 'black' ? 'black_win' : 'white_win', null);
    }
  }, [gameStatus, isReviewMode, currentTurn, handleGameEnd]);

  // Jump to specific move (Replay)
  const handleJumpToMove = useCallback(
    (index: number) => {
      if (index < 0 || index >= moves.length || isReviewMode) return;

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

      const last = subMoves[subMoves.length - 1];
      const win = checkWin(newBoard, last.row, last.col);
      setWinningInfo(win);
    },
    [moves, isReviewMode]
  );

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleToggleEvalBar();
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
  }, [handleUndo, handleRedo, handleGetHint, handleToggleEvalBar, handleNewGame]);

  const lastPlacedMove = isReviewMode
    ? reviewSummary?.reviewedMoves[reviewStepIndex]?.move || null
    : moves.length > 0
    ? moves[moves.length - 1]
    : null;

  const currentReviewedMove =
    isReviewMode && reviewSummary ? reviewSummary.reviewedMoves[reviewStepIndex] : null;

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
        showEvalBar={showEvalBar}
        onToggleEvalBar={handleToggleEvalBar}
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
            moveCount={isReviewMode ? reviewStepIndex : moves.length}
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

          {/* Center: Interactive Board, Eval Bar & Controls (Desktop 6 cols) */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center gap-4">
            {/* Mobile Horizontal Eval Bar (if enabled) */}
            {showEvalBar && (
              <div className="w-full block sm:hidden">
                <EvalBar evaluation={liveEvaluation} orientation="horizontal" />
              </div>
            )}

            {/* Desktop Center Flex: EvalBar + Board */}
            <div className="flex items-center gap-3 w-full justify-center">
              {/* Vertical Eval Bar (if enabled) */}
              {showEvalBar && (
                <div className="hidden sm:block">
                  <EvalBar evaluation={liveEvaluation} orientation="vertical" />
                </div>
              )}

              {/* Main Gomoku Board */}
              <Board
                board={board}
                onCellClick={handleCellClick}
                disabled={
                  isReviewMode ||
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
                moves={isReviewMode ? moves.slice(0, reviewStepIndex + 1) : moves}
                isReviewMode={isReviewMode}
                reviewedMove={currentReviewedMove}
              />
            </div>

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
              onStartReview={isReviewMode ? handleCloseReview : handleStartReview}
              canReview={moves.length > 0}
              isReviewMode={isReviewMode}
              gameStatus={gameStatus}
              isAiThinking={isAiThinking}
            />
          </div>

          {/* Right Side: Move History or Game Review Panel (Desktop 3 cols) */}
          <div className="lg:col-span-3 order-3 flex flex-col gap-4">
            {isReviewMode && reviewSummary ? (
              <GameReviewPanel
                summary={reviewSummary}
                currentStepIndex={reviewStepIndex}
                onStepChange={handleReviewStepChange}
                onClose={handleCloseReview}
              />
            ) : (
              <MoveHistory
                moves={moves}
                currentMoveIndex={currentMoveIndex}
                onJumpToMove={handleJumpToMove}
                aiExplanation={aiExplanation}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          Gomoku Master (五目並べ) — Five in a Row Web Game with Minimax AI & Game Review.
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
          onStartReview={handleStartReview}
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
