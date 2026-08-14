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

### 2. 🧠 Multi-Difficulty Client-Side AI
- **Easy (Novice)**: Casual moves with basic instant-block detection.
- **Medium (Tactician)**: 1-ply tactical heuristic pattern recognition (open fours, blocked fours, open threes, double-threat combinations).
- **Hard (Grandmaster)**: Minimax algorithm with **Alpha-Beta pruning** (depth 2–3) + candidate move filtering and Zobrist transposition table caching, responding within 200–800ms.
- **Tactical Hints**: Get live strategic advice explaining tactical threats and best defensive/offensive placements.

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
