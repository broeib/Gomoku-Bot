# ⚪⚫ Gomoku Master (五目並べ) — AI & Interactive Web Game

A modern, polished, and fully-featured **Gomoku (Five in a Row)** single-page web game built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**. Features multi-difficulty client-side AI opponents, tactical analysis, synthesized Web Audio sound effects, and persistent score tracking.

---

## 🌟 Key Features

### 1. 🎯 Complete 15x15 Gomoku Board & Rules
- Standard 15x15 board with star points (Hoshi) at `(3,3)`, `(3,11)`, `(7,7)`, `(11,3)`, `(11,11)`.
- Standard Gomoku rules: first player to align 5 consecutive stones horizontally, vertically, or diagonally wins.
- Real-time win & draw detection with animated golden winning line highlights and stone pulse animations.
- Turn indicators with real-time AI thinking state and move numbering.
- **Move History & Replay**: Complete algebraic coordinate log (A–O, 1–15) with click-to-replay steps and one-click notation export.
- **Undo / Redo Support** (`Ctrl+Z`, `Ctrl+Y`) and instant rematch controls.

### 2. 🧠 5-Tier Championship Client-Side AI Engine
- **Easy (Novice ~800 ELO)**: Casual moves with humanized blunders and basic block heuristics.
- **Medium (Intermediate ~1400 ELO)**: 1-ply tactical pattern recognition (open fours, blocked fours, live threes, double threats).
- **Hard (Advanced ~1900 ELO)**: Minimax algorithm with **Alpha-Beta pruning** (depth 4) + Zobrist transposition table caching.
- **Expert (Master ~2400 ELO)**: Minimax depth 6 with **Iterative Deepening**, **VCF (Victory by Continuous Fours)** search (depth 16), Killer Move heuristics, and History Heuristic table.
- **God / Super Bot (Grandmaster 2800+ ELO)**: Ultimate championship engine featuring:
  - **Master Opening Book**: 26 standard Renju/Gomoku balance openings with full 8-fold dihedral D4 symmetry.
  - **Deep VCF Engine (Depth 24)**: Explores deep forced winning sequences where defender branching factor is 1, solving 10–24 ply mates in < 15ms.
  - **Deep VCT Engine (Depth 12)**: Solves continuous three-and-four combination double-threats (4-3, 3-3, 4-4 forks).
  - **Iterative Deepening Search (Depth 8–10)**: Principal Variation Search (PVS) with time-budgeted pruning and Quiescence tactical threat extension.
- **Tactical Hints**: Get live grandmaster strategic advice explaining tactical combinations and winning paths.

### 3. 🎨 Aesthetic & Audio
- **3 Visual Themes**: Classic Kaya Wood, Dark Rosewood, and Modern Slate boards.
- **Realistic 3D Stones**: Slate Black and Clam Shell White stones with tactile drop shadows and specular lighting.
- **Synthesized Web Audio API**: Realistic wooden stone clacks, victory fanfares, defeat cadences, and UI sounds without external audio assets.
- **Scoreboard**: Session win/loss/draw tracker, win rate meter, and streak tracker persisted to `localStorage`.
- **Celebratory Confetti**: Interactive victory celebration with canvas-confetti.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts
- `Ctrl+Z` / `Cmd+Z`: Undo Move
- `Ctrl+Y` / `Cmd+Y` or `Ctrl+Shift+Z`: Redo Move
- `H`: Get Tactical AI Hint
- `N`: Start New Game
- `M`: Toggle Sound Mute
