# Tide Pool Tidy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local browser game at `ai-sync/beach-day/` that a parent and almost-four-year-old can play together: drag beach things into sandcastle, shell, and rock tide pools.

**Architecture:** Pure front-end. `game.js` owns rounds and drop rules (Node-testable). `app.js` owns title screen, pointer drag-and-drop, cheer, and play-again. `index.html` + `styles.css` render a Magic School Bus–feeling beach (chunky outlines, bright field-trip color) with inline SVG pieces — no network except optional Google Fonts.

**Tech Stack:** HTML, CSS, vanilla JS. Tests: Node `assert` (same pattern as `ai-sync/sudoku/test`). No build step. Open `index.html`.

## Global Constraints

- No timer, no losing score, no required reading.
- No bus, no Ms. Frizzle, no Magic School Bus logos or characters.
- No accounts, no server, no autoplay sound.
- Six rounds in spec order; refresh and Play again restart at round 1.
- Round 6: shells pool accepts only orange shells; include orange sandcastle + rock; no pale shells.
- Driftwood counts as a rock. Lookalike: tall spiral shell ≠ sandcastle.
- Prefer pointer events over HTML5 drag-and-drop (trackpad + small fingers).
- Skip git commits unless the folder is already a repo.

## File map

| File | Responsibility |
|------|----------------|
| `game.js` | Round data, `createSession`, `drop`, `advance`, `playAgain` |
| `test/game.test.js` | Node tests for rules |
| `index.html` | Markup: title, sand, pools, cheer |
| `styles.css` | Beach layout, MSB-style pieces, motion |
| `app.js` | Wire UI to `TidePool` |
| `README.md` | How to open it with her |

---

### Task 1: Game rules engine

**Files:**
- Create: `ai-sync/beach-day/game.js`
- Test: `ai-sync/beach-day/test/game.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `TidePool.createSession() -> { roundIndex, sandIds, placed, complete, finished }`
  - `TidePool.currentRound(session) -> { id, items, pools }`
  - `TidePool.itemById(session, itemId) -> item`
  - `TidePool.drop(session, itemId, poolId) -> { ok, session }`
  - `TidePool.advance(session) -> session` (no-op unless `complete && !finished`)
  - `TidePool.playAgain() -> session` (fresh round 1)
  - Item: `{ id, kind, variant, color, label }`
  - Pool: `{ id, label, picture }` where `id` is `sandcastles` | `shells` | `rocks`
  - Round 6 pool `shells` has `picture: "orange-shell"` and only accepts `kind === "shell" && color === "orange"`

- [ ] **Step 1: Write the failing test**

```javascript
"use strict";
var path = require("path");
var assert = require("assert");
var TidePool = require(path.join(__dirname, "..", "game.js"));

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("PASS  " + name); }
  catch (e) { failed++; console.error("FAIL  " + name); console.error("      " + e.message); }
}

test("createSession starts at round 1 with one of each kind on the sand", function () {
  var s = TidePool.createSession();
  assert.strictEqual(s.roundIndex, 0);
  var round = TidePool.currentRound(s);
  var kinds = round.items.map(function (i) { return i.kind; }).sort();
  assert.deepStrictEqual(kinds, ["rock", "sandcastle", "shell"]);
  assert.strictEqual(s.sandIds.length, 3);
});

test("correct drop stays in the pool and leaves the sand", function () {
  var s = TidePool.createSession();
  var castle = TidePool.currentRound(s).items.find(function (i) { return i.kind === "sandcastle"; });
  var result = TidePool.drop(s, castle.id, "sandcastles");
  assert.strictEqual(result.ok, true);
  assert.ok(result.session.sandIds.indexOf(castle.id) === -1);
  assert.ok(result.session.placed.sandcastles.indexOf(castle.id) !== -1);
});

test("incorrect drop returns to the sand", function () {
  var s = TidePool.createSession();
  var castle = TidePool.currentRound(s).items.find(function (i) { return i.kind === "sandcastle"; });
  var result = TidePool.drop(s, castle.id, "shells");
  assert.strictEqual(result.ok, false);
  assert.ok(result.session.sandIds.indexOf(castle.id) !== -1);
  assert.deepStrictEqual(result.session.placed.shells, []);
});

test("emptying the sand marks the round complete", function () {
  var s = TidePool.createSession();
  TidePool.currentRound(s).items.forEach(function (item) {
    var pool = item.kind === "sandcastle" ? "sandcastles" : item.kind === "shell" ? "shells" : "rocks";
    s = TidePool.drop(s, item.id, pool).session;
  });
  assert.strictEqual(s.complete, true);
});

test("advance moves to the next round", function () {
  var s = TidePool.createSession();
  TidePool.currentRound(s).items.forEach(function (item) {
    var pool = item.kind === "sandcastle" ? "sandcastles" : item.kind === "shell" ? "shells" : "rocks";
    s = TidePool.drop(s, item.id, pool).session;
  });
  s = TidePool.advance(s);
  assert.strictEqual(s.roundIndex, 1);
  assert.strictEqual(s.complete, false);
  assert.ok(s.sandIds.length >= 4);
});

test("lookalike: spiral shell is not a sandcastle", function () {
  var s = TidePool.createSession();
  s.roundIndex = 3;
  s = TidePool.createSessionAt(3);
  var spiral = TidePool.currentRound(s).items.find(function (i) { return i.variant === "spiral"; });
  assert.ok(spiral);
  assert.strictEqual(TidePool.drop(s, spiral.id, "sandcastles").ok, false);
  assert.strictEqual(TidePool.drop(s, spiral.id, "shells").ok, true);
});

test("two-rule: only orange shells enter the shells pool; orange castle does not", function () {
  var s = TidePool.createSessionAt(5);
  var orangeShell = TidePool.currentRound(s).items.find(function (i) { return i.kind === "shell" && i.color === "orange"; });
  var orangeCastle = TidePool.currentRound(s).items.find(function (i) { return i.kind === "sandcastle" && i.color === "orange"; });
  var pale = TidePool.currentRound(s).items.find(function (i) { return i.kind === "shell" && i.color !== "orange"; });
  assert.ok(orangeShell);
  assert.ok(orangeCastle);
  assert.strictEqual(pale, undefined);
  assert.strictEqual(TidePool.drop(s, orangeCastle.id, "shells").ok, false);
  assert.strictEqual(TidePool.drop(s, orangeCastle.id, "sandcastles").ok, true);
  s = TidePool.createSessionAt(5);
  assert.strictEqual(TidePool.drop(s, orangeShell.id, "shells").ok, true);
});

test("play again and a new session both start at round 1", function () {
  var s = TidePool.playAgain();
  assert.strictEqual(s.roundIndex, 0);
  assert.strictEqual(TidePool.createSession().roundIndex, 0);
});

if (failed) process.exit(1);
console.log(passed + " passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/aaronchester/ai-sync/beach-day/test/game.test.js`  
Expected: FAIL with `Cannot find module` for `game.js`

- [ ] **Step 3: Write minimal implementation**

`game.js` UMD export. Six rounds as specified. `accepts(item, pool, round)`:

- Default: `sandcastles` ← `kind === "sandcastle"`; `shells` ← `kind === "shell"`; `rocks` ← `kind === "rock"`
- Round 6 (`roundIndex === 5`): `shells` ← `kind === "shell" && color === "orange"`

`drop` copies session (do not mutate the input). `advance` only if `complete`. After advancing from round 5 complete, `finished` is true and `advance` is a no-op besides setting `finished`.

Round 6 items: two orange shells, one orange sandcastle, one rock. No pale shells.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/aaronchester/ai-sync/beach-day/test/game.test.js`  
Expected: all PASS

---

### Task 2: Beach UI and drag-and-drop

**Files:**
- Create: `index.html`, `styles.css`, `app.js`, `README.md`

**Interfaces:**
- Consumes: `TidePool` from Task 1
- Produces: playable page

- [ ] **Step 1: Title + playfield markup**

`index.html`: title **Tide Pool Tidy**, button **Let’s tidy**, sand region, three pools (`sandcastles`, `shells`, `rocks`) with picture + optional word, hidden cheer **All tidy!**, hidden **Play again**.

- [ ] **Step 2: MSB-style CSS**

Tokens: sand `#F3D7A3`, water `#3DB8C5`, ink `#1B2A4A`, coral `#FF6A4D`, sunflower `#FFD23F`, foam `#FFF8EE`. Thick ink outlines, big tap targets (≥64px pieces, pools ≥28% width). `@media (prefers-reduced-motion: reduce)` short-circuits splash/wiggle.

- [ ] **Step 3: Pointer drag in app.js**

`pointerdown` lifts a sand piece; `pointerup` on a pool calls `TidePool.drop`. `ok` → piece moves into pool + short splash. `!ok` → piece returns + pool wiggle. Drop elsewhere → return home. When `session.complete`, show cheer then `advance` after ~1.2s (or immediately if reduced motion). If `finished`, show **Play again** → `TidePool.playAgain()` and re-render.

SVG pieces (inline, not raster): turret / drip / bucket castles; scallop / spiral / snail; pebble / speckled / driftwood. Orange variants use coral fill. Round 6 shells pool uses the orange-shell picture.

- [ ] **Step 4: README**

How to open `index.html` (double-click or drag onto a browser). One paragraph on how to play with her. How to run `node test/game.test.js`.

- [ ] **Step 5: Re-run unit tests and open the page**

Run: `node test/game.test.js`  
Expected: PASS  
Then open `index.html` and play round 1 + a wrong drop.

---

### Spec coverage

| Spec | Task |
|------|------|
| Title, Let’s tidy, three picture pools | 2 |
| Correct splash / wrong wiggle-return | 2 |
| Six rounds, lookalike, two-rule | 1 |
| Play again / refresh = round 1 | 1 + 2 |
| MSB feel, no franchise characters | 2 |
| Edges: miss drop, no stuck pieces | 2 |
| Tests listed in spec | 1 |
| No timer/score/network/sound | 1 + 2 |
