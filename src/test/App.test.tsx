import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Gomoku App Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders application header, board, eval bar, and controls correctly', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Gomoku Master/i })).toBeInTheDocument();
    expect(screen.getByText(/Session Scoreboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Move History/i)).toBeInTheDocument();
    expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Game/i })).toBeInTheDocument();
  });

  it('allows toggling the evaluation bar visibility on and off', () => {
    render(<App />);
    expect(screen.getByTestId('eval-bar')).toBeInTheDocument();

    // Click toggle eval bar button in navbar
    const toggleEvalBtn = screen.getByRole('button', { name: /Eval/i });
    fireEvent.click(toggleEvalBtn);

    // EVAL bar should be hidden
    expect(screen.queryByTestId('eval-bar')).not.toBeInTheDocument();

    // Click again to show
    fireEvent.click(toggleEvalBtn);
    expect(screen.getByTestId('eval-bar')).toBeInTheDocument();
  });

  it('automatically responds with AI move in PvE mode when human places a stone', async () => {
    render(<App />);

    // Default mode is PvE, Player is Black
    const centerCell = document.getElementById('cell-7-7');
    expect(centerCell).toBeInTheDocument();
    fireEvent.click(centerCell!);

    // Human move should be recorded
    await waitFor(() => {
      expect(screen.getByText('H8')).toBeInTheDocument();
    });

    // AI should respond automatically within 1.5s
    await waitFor(
      () => {
        expect(screen.getByText(/2 moves/i)).toBeInTheDocument();
      },
      { timeout: 2500 }
    );
  });

  it('allows human player to place stone in PvP mode and tracks turn alternation', async () => {
    render(<App />);

    // Switch to PvP mode to test manual two-player turns
    const pvpButton = screen.getByRole('button', { name: /2P/i });
    fireEvent.click(pvpButton);

    // Place Black Stone at cell (7,7)
    const centerCell = document.getElementById('cell-7-7');
    expect(centerCell).toBeInTheDocument();
    fireEvent.click(centerCell!);

    // Move history should record H8 (Black)
    await waitFor(() => {
      expect(screen.getByText('H8')).toBeInTheDocument();
    });

    // Next turn should be White
    expect(screen.getByText(/White's Turn/i)).toBeInTheDocument();

    // Place White Stone at cell (7,8)
    const nextCell = document.getElementById('cell-7-8');
    fireEvent.click(nextCell!);

    // Move history should record I8 (White)
    await waitFor(() => {
      expect(screen.getByText('I8')).toBeInTheDocument();
    });
  });

  it('allows entering and navigating Game Review mode after moves are played', async () => {
    render(<App />);

    // Switch to PvP mode and make 2 moves
    fireEvent.click(screen.getByRole('button', { name: /2P/i }));
    fireEvent.click(document.getElementById('cell-7-7')!);
    fireEvent.click(document.getElementById('cell-7-8')!);

    // Click Review button
    const reviewBtn = screen.getByRole('button', { name: /Review/i });
    expect(reviewBtn).not.toBeDisabled();
    fireEvent.click(reviewBtn);

    // Game Review panel should be open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Game Review/i })).toBeInTheDocument();
      expect(screen.getByText(/Tactical Analysis/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Accuracy/i).length).toBeGreaterThan(0);
    });

    // Step forward in review
    const nextStepBtn = screen.getByTitle(/Next Move/i);
    fireEvent.click(nextStepBtn);

    // Exit review mode
    const closeReviewBtn = screen.getByTitle(/Exit Review Mode/i);
    fireEvent.click(closeReviewBtn);

    // Move history should be restored
    expect(screen.queryByText(/Tactical Analysis/i)).not.toBeInTheDocument();
  });

  it('handles Undo and Redo operations correctly', async () => {
    render(<App />);

    // Switch to PvP mode
    fireEvent.click(screen.getByRole('button', { name: /2P/i }));

    const cell1 = document.getElementById('cell-7-7');
    fireEvent.click(cell1!);
    expect(screen.getByText('H8')).toBeInTheDocument();

    const cell2 = document.getElementById('cell-7-8');
    fireEvent.click(cell2!);
    expect(screen.getByText('I8')).toBeInTheDocument();

    // Undo 1 move (White move)
    const undoButton = screen.getByRole('button', { name: /Undo/i });
    fireEvent.click(undoButton);

    // I8 should be undone
    expect(screen.queryByText('I8')).not.toBeInTheDocument();
    expect(screen.getByText('H8')).toBeInTheDocument();

    // Redo move
    const redoButton = screen.getByRole('button', { name: /Redo/i });
    fireEvent.click(redoButton);
    expect(screen.getByText('I8')).toBeInTheDocument();
  });

  it('resets the game when clicking New Game', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /2P/i }));
    fireEvent.click(document.getElementById('cell-7-7')!);
    expect(screen.getByText('H8')).toBeInTheDocument();

    // Click New Game
    fireEvent.click(screen.getByRole('button', { name: /New Game/i }));

    // Move history should be cleared
    expect(screen.getByText(/No moves placed yet/i)).toBeInTheDocument();
  });

  it('switches themes between Kaya, Dark, and Slate', () => {
    render(<App />);

    const kayaBtn = screen.getByRole('button', { name: /Kaya/i });
    const darkBtn = screen.getByRole('button', { name: /Dark/i });
    const slateBtn = screen.getByRole('button', { name: /Slate/i });

    fireEvent.click(darkBtn);
    expect(document.querySelector('.wood-board-dark')).toBeInTheDocument();

    fireEvent.click(slateBtn);
    expect(document.querySelector('.wood-board-slate')).toBeInTheDocument();

    fireEvent.click(kayaBtn);
    expect(document.querySelector('.wood-board-kaya')).toBeInTheDocument();
  });

  it('opens and closes the Rules guide modal', () => {
    render(<App />);

    const rulesBtn = screen.getByRole('button', { name: /Rules/i });
    fireEvent.click(rulesBtn);

    expect(screen.getByText(/Gomoku Rules & Strategy Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Objective & Rules/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Got It, Let's Play!/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Gomoku Rules & Strategy Guide/i)).not.toBeInTheDocument();
  });

  it('allows requesting a tactical hint', () => {
    render(<App />);

    // Click Hint button
    const hintBtn = screen.getByRole('button', { name: /Hint/i });
    fireEvent.click(hintBtn);

    // Analysis badge should appear
    expect(screen.getByText(/Analysis:/i)).toBeInTheDocument();
  });

  it('switches AI difficulty levels', () => {
    render(<App />);

    const easyBtn = screen.getByRole('button', { name: /Easy/i });
    const mediumBtn = screen.getByRole('button', { name: /Medium/i });
    const hardBtn = screen.getByRole('button', { name: /Hard/i });

    fireEvent.click(easyBtn);
    expect(screen.getByText(/easy mode/i)).toBeInTheDocument();

    fireEvent.click(hardBtn);
    expect(screen.getByText(/hard mode/i)).toBeInTheDocument();

    fireEvent.click(mediumBtn);
    expect(screen.getByText(/medium mode/i)).toBeInTheDocument();
  });
});
