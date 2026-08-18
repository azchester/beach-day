# Beach Puzzle — Design

Date: 2026-08-17  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A third Beach Day game. She snaps painted puzzle pieces into one picture of herself on a magical beach. He can talk it through. No timer, no losing score, no required reading.

Tide Pool Tidy stays sort. Crab Path stays hop. Sandcastle Stack stays removed. This spec is **Beach Puzzle only**.

## Player experience

Menu has three cards. The new one is **Beach Puzzle**, blurb **Snap the picture**. Tap it. The existing **How hard today?** screen appears, titled **Beach Puzzle**, with **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no extra “Let’s puzzle” step.

One of the twelve finished pictures is chosen at random and cut into pieces. The pieces lie scattered on the sand, already the right way up. They do not rotate.

She drags a piece (or a whole snapped clump) with the same pointer gesture as Tide Pool Tidy.

- Correct neighbor, close enough: they snap flush and become one clump.
- Wrong neighbor: no snap. Nothing scolds. The piece stays where she dropped it.
- A clump moves as one. She cannot peel snapped pieces apart.

When every piece is in one clump, the kid cheers (**What a puzzle!**). Then **Play again** deals a new random picture at **the same difficulty**, or **More games** / **Games** return to the menu. Refresh returns to the menu so a different difficulty can be picked. No mid-play difficulty switch. No saved progress.

No hint sentence she must read. The sky still has **Games** and the sun.

## Pictures

Twelve painted scenes, already in the repo, same cartoon girl and Beach Day crayon-outline style. Do not replace or restyle them in this spec.

| Index | File |
|-------|------|
| 0 | `assets/puzzles/01-beach.jpg` |
| 1 | `assets/puzzles/02-sandcastle.jpg` |
| 2 | `assets/puzzles/03-crab.jpg` |
| 3 | `assets/puzzles/04-dolphins.jpg` |
| 4 | `assets/puzzles/05-mermaid.jpg` |
| 5 | `assets/puzzles/06-kite.jpg` |
| 6 | `assets/puzzles/07-treasure.jpg` |
| 7 | `assets/puzzles/08-whale.jpg` |
| 8 | `assets/puzzles/09-night.jpg` |
| 9 | `assets/puzzles/10-shell-boat.jpg` |
| 10 | `assets/puzzles/11-rainbow.jpg` |
| 11 | `assets/puzzles/12-starfish.jpg` |

`Puzzle.PICTURE_COUNT` is `12`. A deal picks `pictureIndex` uniformly in `0 .. 11` with `random`.

The menu card uses a crop of `01-beach.jpg` (or the girl plus a shell from that set), not a new illustration and not generic SVG.

## Difficulty

One puzzle per play. Difficulty is only how many pieces.

| Difficulty | Pieces | Grid |
|------------|--------|------|
| Easy | 9 | 3×3 |
| Medium | 16 | 4×4 |
| Hard | 25 | 5×5 |

Default difficulty is **medium** when `createSession` is called with no options. Unknown difficulty string is treated as **medium**.

## Piece shapes

The grid is rectangular. Each cell is drawn as a **jigsaw piece**, not a square tile.

- Outer border of the finished picture: **flat** edges.
- Each inner seam is a complementary pair: one side **tab**, the other **blank**.
- Vertical seams sit between `(row, col)` and `(row, col + 1)`.
- Horizontal seams sit between `(row, col)` and `(row + 1, col)`.
- Each seam’s direction is chosen with `random` when the puzzle is dealt (tab pointing right vs left, or down vs up).

A piece is the matching rectangle of the chosen photo, masked to that jigsaw silhouette (tab sticking out, blank bitten in). No square frame around the photo. No stock puzzle-piece SVG that ignores the photo.

## Snap rules

Two pieces (or the clumps they belong to) may snap only if:

1. They are **orthogonal grid neighbors** (share a side; no diagonals).
2. They are not already in the same clump.
3. Their dragged edges are within a snap distance of about **one third of a piece width** (UI). The rules engine only answers “are these a legal pair?”

On success the two clumps **union**. Every piece in the new clump keeps its grid offset relative to the others, so the photo lines up.

On failure the engine returns `{ ok: false }` and does not change clumps. The UI leaves the piece where it was dropped.

When one clump contains `rows * cols` pieces, the puzzle is **complete**.

## Sand layout

Pieces start in a shuffled scatter on the sand. Slight overlap is allowed. They do not start pre-assembled.

The assembled picture is centered. On a phone, a Hard piece stays at least about a fingertip wide (target: at least 44px CSS). If the scatter is larger than the viewport, dragging empty sand pans the playfield. No pinch-zoom.

Reduced motion: snap is instant, no bounce.

## Architecture

Same pattern as Tidy and Path. No new libraries. No server. No network except the existing optional Google Fonts.

```
ai-sync/beach-day/
  puzzle.js                 # pictures, grid, edges, snap, complete
  test/puzzle.test.js
  app.js                    # third game: menu, drag, snap, cheer
  index.html                # exhibit + #puzzle-screen
  styles.css                # pieces, sand playfield, pan
  assets/puzzles/*.jpg      # twelve scenes (already present)
  README.md
```

Tidy and Path keep their APIs.

### Session

```
{
  difficulty,       // "easy" | "medium" | "hard"
  pictureIndex,     // 0..11
  rows,
  cols,
  vSeams,           // [rows][cols-1] each +1 or -1
  hSeams,           // [rows-1][cols] each +1 or -1
  groups,           // array of piece-id arrays; partition of all cells
  complete
}
```

A **piece id** is `row * cols + col` (0-based). `vSeams[r][c] === +1` means the piece at `(r, c)` has a **tab on its east** edge and `(r, c+1)` has a **blank on its west**. `-1` is the opposite. `hSeams[r][c] === +1` means `(r, c)` has a **tab on its south** and `(r+1, c)` has a **blank on its north**. `-1` is the opposite.

`snap` / `playAgain` copy the session. They do not mutate the session they were given.

Pixel positions live in `app.js`, not in the session.

### API

- `Puzzle.PICTURE_COUNT` is `12`.
- `Puzzle.grid(difficulty)` → `{ rows, cols }` (`3,3` / `4,4` / `5,5`). Unknown difficulty → medium.
- `Puzzle.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `Puzzle.pictureSrc(session)` → the file path for `session.pictureIndex`.
- `Puzzle.neighbors(session, pieceId)` → orthogonal neighbor ids.
- `Puzzle.sameGroup(session, a, b)` → boolean.
- `Puzzle.canSnap(session, a, b)` → true iff they are neighbors and not already the same group.
- `Puzzle.snap(session, a, b)` → `{ ok, session }`. Copies. `ok` is false when `canSnap` is false.
- `Puzzle.playAgain(session, random)` — new session at `session.difficulty`, new picture roll and new seams. If `session` is omitted, same as `createSession()` (medium).

`random` is a function that returns a number in `[0, 1)`. Tests pass a stub.

There is no `advance` through a six-puzzle list. One deal is the whole play.

### Generator

1. `difficulty` → `rows`, `cols`.
2. `pictureIndex = floor(random() * 12)` clamped to `0..11`.
3. For each vertical seam, `vSeams[r][c] = random() < 0.5 ? +1 : -1`.
4. For each horizontal seam, `hSeams[r][c] = random() < 0.5 ? +1 : -1`.
5. `groups` is one singleton `[id]` per cell, ids `0 .. rows*cols-1`.
6. `complete` is false.

Do not loop-until-timeout.

### Title / difficulty / menu

Reuse `#difficulty-screen`. When Beach Puzzle is chosen, heading **Beach Puzzle** and `pendingGame = "puzzle"`. Tidy and Path keep their titles.

Exhibit order: **Tide Pool Tidy**, **Beach Puzzle**, **Crab Path**. Arrow keys cycle that list. The menu crab sits under the selected card (three positions).

Difficulty buttons: `pendingGame === "puzzle"` → `startPuzzle(difficulty)`.

**Play again** calls `Puzzle.playAgain(puzzleSession)` and re-renders. Difficulty does not change.

### Screen

New `#puzzle-screen`, sand background like Crab Path, sky chrome with Games and sun. A pannable playfield holds the pieces. The beach kid stands to the side and cheers when complete.

Each piece is a button (or pointer target) whose background is the chosen photo, positioned and clipped so only that cell plus its tabs shows.

## Edges

- Unknown difficulty → medium.
- `random` omitted → `Math.random`.
- Reduced motion: skip snap bounce.
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.
- Diagonal pieces never snap.
- Already-joined neighbors: `canSnap` is false; no-op.
- Two different `random` stubs can yield different `pictureIndex` or different seams.

## Testing

Keep Node `assert` in `test/puzzle.test.js`. Pass a fake `random` into every test that deals.

- `createSession()` with no args has `difficulty === "medium"`, `rows === 4`, `cols === 4`, 16 singletons.
- Unknown difficulty string yields medium.
- Easy: 3×3, 9 groups.
- Hard: 5×5, 25 groups.
- `pictureIndex` is an integer in `0..11`.
- `pictureSrc` for index 0 ends with `01-beach.jpg`.
- Outer edges of corner piece `0` have no west or north seam (only east and south exist).
- Every `vSeams` / `hSeams` entry is `+1` or `-1`.
- On a fresh 3×3 deal: `canSnap(0, 1)` is true (east/west neighbors); `canSnap(0, 3)` is true (south/north neighbors); `canSnap(0, 2)` is false (same row, not adjacent); `canSnap(0, 4)` is false (diagonal).
- `snap(0, 1)` returns `ok: true`, those two share a group, input session unchanged.
- A second `snap` of the same pair returns `ok: false`.
- `snap` of a diagonal returns `ok: false`.
- Union: snap `0-1`, then snap `1-2` on a 3×3 puts `0,1,2` in one group.
- After uniting all 9 Easy pieces through a chain of neighbor snaps, `complete` is true.
- `playAgain(session)` keeps `difficulty` and may change `pictureIndex` when stubs differ.
- `playAgain()` with no session is medium.
- Two `createSession({ difficulty: "easy" })` calls with `always(0)` vs `always(0.99)` differ in `pictureIndex` or at least one seam.

## Out of scope

Changing Tidy or Path. Bringing Sandcastle Stack back. Rotating pieces. Pinch-zoom. Six puzzles in a row. New painted scenes. Photoreal cuts. Timers, scores, sound, accounts.

## Spec coverage

This is a new game. It reuses the Beach Day shell (menu, difficulty, cheer, drag, painted art) and adds one snap-together jigsaw verb.
