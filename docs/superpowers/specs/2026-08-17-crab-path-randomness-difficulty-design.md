# Crab Path — Randomness and Difficulty

Date: 2026-08-17  
Location: `ai-sync/beach-day/`  
Extends: Tide Pool Tidy’s Easy / Medium / Hard picker and six-beat session  
Players: an adult and a child about to turn 4, sitting together

## Purpose

Crab Path stays a quiet hop-to-the-bucket game. Each play is a new set of beaches. The adult picks how hard the walking is. She still only taps a glowing neighbor. No timer, no losing score, no required reading.

Tide Pool Tidy already has Easy / Medium / Hard and a new mix each play. This spec is **Crab Path only**. Tidy does not change.

## Player experience

Tap **Crab Path** on the menu. The existing **How hard today?** screen appears, titled **Crab Path**, with **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no extra “Let’s hop” step.

Play is unchanged: the crab sits on a sand tile; only adjacent walkable tiles glow; tap one to hop. Rocks and water never accept a hop (they wiggle). The bucket is the goal.

Hint line stays `Path N of 6.` She does not have to read the difficulty name.

After path 6, **Play again** starts a new roll at **the same difficulty**, path 1. **More games** (and **Games**) return to the menu. Refresh returns to the menu so a different difficulty can be picked. No mid-play difficulty switch. No saved progress.

## What randomizes

Every time a path is built:

1. **Obstacle cells** — which sand squares become rocks or water, within that path’s recipe counts.
2. **Crab row and bucket row** — except where the recipe pins them (Easy path 1 is always the same row, crab on the top row).
3. **Which legal layout** — the generator retries until the shortest walk sits in that recipe’s length band.

Hop rules do not change: one step to an adjacent sand or bucket tile.

## Difficulty

Six paths at every difficulty. Difficulty chooses board size, how many rocks and water, and how long the shortest walk must be.

Crab is always in the **leftmost column**. Bucket is always in the **rightmost column**. Boards are at most **6 tiles wide** so they still fit a phone.

| Path | Easy | Medium | Hard |
|------|------|--------|------|
| 1 | 5×2, 0 rock, 0 water, same row, walk 4 | 5×3, 1 rock, 0 water, walk 5–7 | 6×3, 2 rocks, 0 water, walk 6–9 |
| 2 | 5×2, 0 rock, 0 water, bucket may move rows, walk 4–5 | 5×3, 2 rocks, 0 water, walk 5–8 | 6×4, 2 rocks, 1 water, walk 7–11 |
| 3 | 5×2, 1 rock, 0 water, walk 4–6 | 5×3, 1 rock, 1 water, walk 6–8 | 6×4, 3 rocks, 1 water, walk 8–12 |
| 4 | 5×3, 1 rock, 0 water, walk 5–7 | 6×3, 2 rocks, 1 water, walk 6–9 | 6×4, 3 rocks, 2 water, walk 8–13 |
| 5 | 5×3, 1 rock, 0 water, walk 5–7 | 6×3, 2 rocks, 1 water, walk 7–10 | 6×4, 3 rocks, 2 water, walk 9–14 |
| 6 | 5×3, 1 rock, 1 water, walk 5–8 | 6×3, 2 rocks, 2 water, walk 7–10 | 6×4, 4 rocks, 2 water, walk 9–14 |

Walk lengths are the **shortest** path in hops (Manhattan on an empty 5-wide same-row board is 4).

Easy introduces one new idea at a time: open hop, then a second-row bucket, then a rock, then a taller board, then water on path 6. Hard is a bigger beach with more things to go around, not a new kind of move.

Each recipe is exactly:

```
{ width, height, rocks, water, minPath, maxPath, crabRow, goalAlign }
```

- `crabRow` is `"top"` or `"any"`. Only Easy path 1 uses `"top"`.
- `goalAlign` is `"same"` or `"any"`. Easy path 1 uses `"same"`. All later recipes use `"any"`.
- `rocks` and `water` are exact counts, not ranges.

Default difficulty is **medium** when `createSession` is called with no options. Unknown difficulty string is treated as **medium**.

## Architecture

The six hardcoded `LEVELS` strings go away as the play source. Each difficulty has six **recipes**. A generator turns `(recipe, random)` into a board that is solvable and inside the walk band.

```
ai-sync/beach-day/
  path.js             # recipes, generator, hop rules, advance
  app.js              # difficulty screen reused for Crab Path; render; hop
  index.html          # same difficulty buttons; heading set in JS
  test/path.test.js
  README.md
```

No new libraries. No server. No network except the existing optional Google Fonts. Painted tile art does not change.

### Session

```
{
  difficulty,   // "easy" | "medium" | "hard"
  levelIndex,   // 0..5
  width,
  height,
  cells,        // height rows of width cells: "sand" | "rock" | "water" | "goal"
  start,        // { x, y } crab start; x === 0
  goal,         // { x, y } bucket; x === width - 1
  crab,         // { x, y } current
  complete,
  finished
}
```

`currentLevel(session)` reads **the session**, not a global table. Two Medium plays of path 4 can differ. `step` / `advance` copy the session, including a copy of `cells`, so hops never mutate the board they started on.

The old `LEVELS` array is not used for play. Tests that need a known shape call `createSessionAt` with a stub `random`, or pass a fixture through the generator.

### API

- `CrabPath.PATH_COUNT` is `6`.
- `CrabPath.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `CrabPath.createSessionAt(levelIndex, { difficulty, random })` — same defaults; throws if `levelIndex` is out of range.
- `CrabPath.currentLevel(session)` → `{ width, height, cells, start, goal }` from the session.
- `CrabPath.cellAt(session, x, y)` → cell type, or `"out"`.
- `CrabPath.legalMoves(session)` → adjacent walkable cells (`sand` or `goal`).
- `CrabPath.step(session, x, y)` → `{ ok, session }`. Copies the session. Does not mutate the input.
- `CrabPath.advance(session, random)` — no-op unless `complete && !finished`. After path 6, sets `finished`. Otherwise generates the next recipe at the **same difficulty**.
- `CrabPath.playAgain(session, random)` — new session at `session.difficulty`, path 1, new roll. If `session` is omitted, same as `createSession()` (medium, path 1).

`random` is a function that returns a number in `[0, 1)`, same contract as `Math.random`. Tests pass a stub so results are stable.

Hop rules stay:

- Walkable = `sand` or `goal`.
- Rocks and water are never legal.
- Only orthogonal neighbors (no diagonals, no two-tile hops).
- Landing on `goal` sets `complete`.

### Generator

1. Build a `width` × `height` grid of `sand`.
2. Choose crab row: `0` if `crabRow === "top"`, else a uniform row in `0 .. height-1`. Place `start` at `{ x: 0, y: crabRow }`.
3. Choose bucket row: `start.y` if `goalAlign === "same"`, else a uniform row. Place `goal` at `{ x: width - 1, y: bucketRow }`. Mark that cell `"goal"`.
4. Collect empty sand cells (not start, not goal). Place exactly `rocks` rocks and `water` waters on distinct cells from that list, shuffled with `random`.
5. BFS from start to goal through walkable cells. Let `len` be the shortest hop count.
6. Accept if a path exists and `minPath <= len <= maxPath`.
7. Otherwise retry from step 2, up to 80 attempts.

Fallback if 80 attempts fail (in order, then retry that loosened recipe from scratch, still capped):

1. `rocks = max(0, rocks - 1)`
2. `water = max(0, water - 1)`
3. `minPath = max(width - 1, minPath - 1)`

An empty board with crab left and bucket right is always solvable. Throw only if even that fails (programming error).

Do not loop-until-timeout. Do not place an obstacle on start or goal. Do not overlap rock and water.

### Title / difficulty screen

Reuse `#difficulty-screen`. When Crab Path is chosen, set the heading to **Crab Path** and remember `pendingGame = "path"`. When Tide Pool Tidy is chosen, heading stays **Tide Pool Tidy** and `pendingGame = "tidy"`. Easy / Medium / Hard then start that pending game.

**Play again** on Crab Path calls `CrabPath.playAgain(pathSession)` and re-renders the path screen. Difficulty does not change.

## Edges

- Hop onto rock, water, a non-neighbor, or off the board: `{ ok: false }`; crab does not move; tile wiggles.
- Reduced-motion: skip or shorten splash/wiggle (existing).
- Unknown difficulty → medium.
- `random` omitted → `Math.random`.
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.
- Easy path 1 never has obstacles and always has a 4-hop walk on a 5×2 same-row board.

## Testing

Keep Node `assert` in `test/path.test.js`. Pass a fake `random` into every test that builds a session.

In tests, path numbers are **0-based** (`levelIndex` 0 is Easy path 1 in the table).

Keep, restated against the generator:

- Legal moves are only adjacent walkable tiles.
- Cannot step onto a rock (use a recipe that includes a rock, e.g. Easy path 3 or Medium path 1).
- Cannot step onto water (use a recipe that includes water, e.g. Easy path 6).
- Cannot hop two tiles away.
- Stepping onto the bucket completes the path.
- `advance` after a complete path goes to the next `levelIndex` at the same difficulty.
- `playAgain(session)` returns path 1 at `session.difficulty`.
- Every generated path in a session has a walk from crab to bucket.

New:

- `createSession()` with no args has `difficulty === "medium"` and `levelIndex === 0`.
- Easy path 1: `width === 5`, `height === 2`, zero rocks, zero water, `start.y === goal.y === 0`, shortest walk is 4.
- Easy paths 0–4 have `water === 0`. Easy path 5 has exactly one water.
- Medium path 0 has no water and exactly one rock.
- Hard path 0 is 6×3 with two rocks and no water.
- Hard path 5 is 6×4 with four rocks and two water (unless fallback loosened it — tests use a stub that succeeds without fallback).
- `start.x === 0` and `goal.x === width - 1` on every generated board.
- Two `createSession({ difficulty: "medium" })` calls with two different stubs can differ in `cells` or `start.y` / `goal.y`.
- `advance` keeps `difficulty`.
- Unknown difficulty string yields medium.

## Out of scope

Changing difficulty mid-play. Boards wider than 6. Diagonal hops. Moving obstacles. Timers, scores, sound, accounts. Changing Tide Pool Tidy. Magic School Bus characters.

## Spec coverage vs original Crab Path

The original six scripted boards are replaced by these recipes. Visual style, hop, glow neighbors, cheer, and “no scolding” are unchanged.
