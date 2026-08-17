# Crab Path Randomness and Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crab Path uses Easy / Medium / Hard and a newly generated solvable board for each of six paths.

**Architecture:** Recipes in `path.js` feed a generator (place crab left, bucket right, sprinkle rocks/water, accept only if shortest walk is in band). Session stores the board. `app.js` reuses the existing difficulty screen for both games.

**Tech Stack:** Static HTML / CSS / JS. Node `assert` tests. No new libraries.

## Global Constraints

- Crab Path only; Tide Pool Tidy play rules stay the same.
- Six paths per play. Crab `x === 0`, bucket `x === width - 1`. Width ≤ 6.
- No timer, no score, no required reading. Hops stay orthogonal to glowing neighbors.
- `random` is a `[0, 1)` function; omitted `difficulty` is `"medium"`; unknown difficulty is medium.
- Generator retries 80 times, then loosens rocks, then water, then minPath. Never ships an unsolvable board.

---

### Task 1: Generator and hop API in `path.js`

**Files:**
- Modify: `path.js`
- Test: `test/path.test.js`

**Interfaces:**
- Produces: `CrabPath.PATH_COUNT`, `createSession({ difficulty, random })`, `createSessionAt(levelIndex, opts)`, `currentLevel(session)`, `cellAt`, `legalMoves`, `step`, `advance(session, random)`, `playAgain(session, random)`

- [ ] Write failing tests in `test/path.test.js` for default medium, Easy path 1 shape, water/rock recipes, solvability, playAgain keeping difficulty, two stubs differing.
- [ ] Run `node test/path.test.js` and confirm new assertions fail (missing `difficulty` / `PATH_COUNT` / generated boards).
- [ ] Replace hardcoded `LEVELS` with recipes + generator + session-owned `cells`. Keep hop rules.
- [ ] Run `node test/path.test.js` and `node test/game.test.js` — all pass.

### Task 2: Difficulty screen for Crab Path

**Files:**
- Modify: `app.js` (`openGame`, difficulty click, `startPath`, `playAgain`)
- Modify: `README.md` Crab Path paragraph

**Interfaces:**
- Consumes: `CrabPath.createSession({ difficulty })`, `CrabPath.playAgain(pathSession)`
- Produces: `pendingGame` is `"tidy"` or `"path"`; heading text matches.

- [ ] Point Crab Path at the existing Easy / Medium / Hard screen; start `startPath(difficulty)`.
- [ ] Play again passes `pathSession` so difficulty is kept.
- [ ] Update README. Verify in the browser: menu → Crab Path → Easy → hop; Games → Crab Path → Hard → larger board with rocks/water.

---

Spec coverage: player flow, recipes, generator fallback, API, tests, reuse of difficulty UI, Tidy unchanged.
