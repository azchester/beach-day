# Beach Puzzle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Beach Puzzle: one random painted scene cut into jigsaw pieces that snap together. Easy 9, Medium 16, Hard 25.

**Architecture:** `puzzle.js` owns deal, seams, neighbors, snap, complete (Node-testable). `app.js` owns scatter, drag, snap distance, pan, cheer. Pieces are photo tiles clipped to tab/blank silhouettes.

**Tech Stack:** HTML, CSS, vanilla JS. Tests: `node test/puzzle.test.js`. No new libraries.

## Global Constraints

- No timer, no losing score, no required reading.
- Pieces do not rotate. No peel after snap. No pinch-zoom.
- Easy 3×3 / Medium 4×4 / Hard 5×5. One of 12 pictures at random.
- Cheer: `What a puzzle!` Play again keeps difficulty, new picture roll.
- Jigsaw tabs, not squares. Photos from `assets/puzzles/*.jpg` only.
- Tidy and Path rules do not change.
- Default difficulty medium; unknown → medium.
- `random` is `[0, 1)`; omitted → `Math.random`.

## File map

| File | Responsibility |
|------|----------------|
| `puzzle.js` | Pictures, grid, seams, snap |
| `test/puzzle.test.js` | Node tests from the spec Testing section |
| `index.html` | Exhibit + `#puzzle-screen` |
| `styles.css` | Playfield, pieces |
| `app.js` | Menu, drag, snap UI, cheer |
| `README.md` | How to play |

---

### Task 1: Rules engine

**Files:**
- Create: `puzzle.js`
- Create: `test/puzzle.test.js`

**Interfaces:**
- Produces exactly the spec API: `PICTURE_COUNT`, `grid`, `createSession`, `pictureSrc`, `neighbors`, `sameGroup`, `canSnap`, `snap`, `playAgain`.
- Also export `rowCol(session, id)` and `edge(session, id, dir)` where `dir` is `"n"|"e"|"s"|"w"` and the value is `"flat"|"tab"|"blank"` — UI needs this to draw tabs. Derived from `vSeams` / `hSeams` as specified.

- [ ] **Step 1: Write failing tests** in `test/puzzle.test.js` covering every bullet in the spec Testing section, using the same `test` / `assert` / `always(v)` harness as `test/path.test.js`.

- [ ] **Step 2: Run `node test/puzzle.test.js`** — fail because `puzzle.js` is missing.

- [ ] **Step 3: Implement `puzzle.js`** as an IIFE like `path.js`. Generator, snap union, clone session. Picture list in index order from the spec.

- [ ] **Step 4: Run `node test/puzzle.test.js && node test/game.test.js && node test/path.test.js`** — all PASS.

- [ ] **Step 5: Commit** `Add Beach Puzzle rules engine and tests.`

---

### Task 2: Play screen

**Files:**
- Modify: `index.html`, `app.js`, `styles.css`, `README.md`

**Interfaces:**
- Consumes `Puzzle.*` from Task 1.

- [ ] **Step 1: Markup** — exhibit between Tidy and Path (`data-game="puzzle"`, blurb Snap the picture, art from `assets/puzzles/01-beach.jpg`). Screen `#puzzle-screen` with sky (Games, sun), `#puzzle-field` pannable sand, `#puzzle-pieces`, kid. Script `puzzle.js` before `app.js`.

- [ ] **Step 2: Wire `app.js`**
  - `pendingGame === "puzzle"` → `startPuzzle`. Title **Beach Puzzle**.
  - Menu cycle `["tidy","puzzle","path"]`. Crab `-180px` / `0` / `180px`.
  - Hide `#puzzle-screen` from goMenu / other starts.
  - `startPuzzle`: `Puzzle.createSession({ difficulty })`, scatter pieces, `renderPuzzle`.
  - Each piece: `position:absolute`, size `cell` px, extra padding for tabs (~22% of cell). Background = picture, `background-size` = full puzzle, `background-position` = `-col*cell -row*cell`. `clip-path: path(...)` from `Puzzle.edge`.
  - Drag piece or its whole group. On pointerup, if a legal neighbor’s matching edge is within `cell/3`, `Puzzle.snap` and translate the moving group so cells line up.
  - Pan: pointerdown on empty field.
  - Complete → cheer `What a puzzle!`, Play again / More games.
  - `playAgain` → `Puzzle.playAgain`.

- [ ] **Step 3: CSS** — sand playfield, `.jig` pieces, drop-shadow, z-index while dragging. Hard cell ≥ 44px. No square frames.

- [ ] **Step 4: README** — third game, piece counts, snap, tests include `node test/puzzle.test.js`.

- [ ] **Step 5: Verify** tests + browser: menu, Easy 9 pieces that snap, Hard 25, Tidy and Path still work.

- [ ] **Step 6: Commit** `Add Beach Puzzle play screen and menu card.`

## Spec coverage

| Spec | Task |
|------|------|
| Deal, seams, snap, complete, playAgain | 1 |
| Pictures, difficulty grids | 1 |
| Menu, drag, snap distance, pan, cheer, clip | 2 |
| Art from `assets/puzzles` | 2 |
