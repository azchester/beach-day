# Sandcastle Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sandcastle Stack as the third Beach Day game: copy a painted castle ground-up from a tray, with Easy / Medium / Hard.

**Architecture:** Same split as Tidy and Path. `stack.js` owns recipes, dealing, open spots, and place rules (Node-testable). `app.js` owns menu, difficulty, tap/drag, wiggle, and cheer. `index.html` + `styles.css` render picture, pad, and tray from existing painted PNGs only.

**Tech Stack:** HTML, CSS, vanilla JS. Tests: Node `assert` via `node test/stack.test.js`. No build step. No new libraries.

## Global Constraints

- No timer, no losing score, no required reading.
- No SVG icons, no generated vector castles, no new painted pieces. Use `assets/sandcastle-{bucket|turret|drip}-{sand|orange}.png` and `assets/tile-sand.png` for empty spots.
- Six castles per play; Play again keeps difficulty; Games / More games / refresh return to the menu.
- Ground up: only base open; then sides; then top after every side this castle has is filled.
- Wrong piece / locked / filled spot: `place` returns `{ ok: false }` with session unchanged; UI wiggles the piece back.
- Decoys never share `(kind, color)` with any target slot.
- Default difficulty is medium; unknown difficulty is medium.
- Tidy and Path rules do not change.
- `random` is a `[0, 1)` function; omitted → `Math.random`.
- Cheer copy: `What a castle!` Hint: `Castle N of 6.`

## File map

| File | Responsibility |
|------|----------------|
| `stack.js` | Recipes, generator, `openSpots`, `place`, `advance`, `playAgain` |
| `test/stack.test.js` | Node tests for deal + place rules |
| `index.html` | Third exhibit + `#stack-screen` |
| `styles.css` | Picture, pad, spots, tray |
| `app.js` | Wire `Sandcastle` like Path |
| `README.md` | How to play Stack |

---

### Task 1: Rules engine

**Files:**
- Create: `stack.js`
- Create: `test/stack.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Sandcastle.ROUND_COUNT === 6`
  - `Sandcastle.createSession({ difficulty, random })`
  - `Sandcastle.createSessionAt(roundIndex, { difficulty, random })` throws if `roundIndex` out of `0..5`
  - `Sandcastle.currentCastle(session) -> { spots, target, filled, tray }`
  - `Sandcastle.pieceById(session, id) -> piece | null`
  - `Sandcastle.openSpots(session) -> string[]`
  - `Sandcastle.place(session, pieceId, spotId) -> { ok, session }`
  - `Sandcastle.advance(session, random) -> session`
  - `Sandcastle.playAgain(session, random) -> session`
  - Piece: `{ id, kind, color }` with `kind` `bucket` | `turret` | `drip` and `color` `sand` | `orange`
  - Recipes exactly as `docs/superpowers/specs/2026-08-17-sandcastle-stack-design.md`

- [ ] **Step 1: Write failing tests** in `test/stack.test.js` using the same `test` / `assert` harness as `test/path.test.js`. Include a `always(v)` stub. Cover every case listed in the spec Testing section.

```javascript
"use strict";
var path = require("path");
var assert = require("assert");
var Sandcastle = require(path.join(__dirname, "..", "stack.js"));

function always(v) {
  return function () { return v; };
}

function placeCorrect(s, spot) {
  var want = s.target[spot];
  var piece = s.tray.filter(function (p) {
    return p.kind === want.kind && p.color === want.color;
  })[0];
  return Sandcastle.place(s, piece.id, spot);
}
```

Required tests (names and assertions from the spec):

- `createSession` with no args is medium castle 1
- unknown difficulty is medium
- Easy 0: spots base+top, sand bucket / sand drip, tray length 2, open is `["base"]`
- Easy 1: top is sand turret, tray length 2
- Easy 2: tray length 3, one sand turret decoy, open starts `["base"]`
- after correct base on Easy 0, open is `["top"]`
- Medium 0: spots base/left/right, no top; after base, open is left and right
- Hard 0: four spots; top closed until both sides filled; then open is `["top"]`
- wrong kind/color on an open spot → `ok: false`, tray and filled unchanged
- place on a locked spot → `ok: false`
- place of a piece not in the tray → `ok: false`
- correct place does not mutate the input session
- filling the last spot sets `complete`
- `advance` after complete goes to next `roundIndex` at same difficulty
- `advance` after complete castle 6 sets `finished`
- `playAgain(session)` is castle 1 at `session.difficulty`
- `playAgain()` with no session is medium castle 1
- no decoy shares kind+color with any target slot (loop all difficulties and rounds with a stub)
- Easy 4 tray includes a sand turret and one orange piece
- Medium 5 tray includes a drip decoy
- Hard 3 tray includes a drip whose color is not the top’s color
- two medium sessions with different stubs can differ in a target color or tray order
- `advance` keeps difficulty
- a decoy is never a clone of a target pair

- [ ] **Step 2: Run tests — they fail** because `stack.js` does not exist.

```bash
node test/stack.test.js
```

Expected: `Cannot find module` or `Sandcastle` missing.

- [ ] **Step 3: Implement `stack.js`** as an IIFE like `path.js` / `game.js` (`module.exports` in Node, `root.Sandcastle` in the browser). Follow the spec Generator, Open spots, and Place rules verbatim. Clone sessions in `place` / `advance`. Fisher-Yates shuffle same as `game.js`.

- [ ] **Step 4: Run tests — they pass**

```bash
node test/stack.test.js
node test/game.test.js
node test/path.test.js
```

Expected: all PASS. Tidy and Path still green.

- [ ] **Step 5: Commit**

```bash
git add stack.js test/stack.test.js
git commit -m "Add Sandcastle Stack rules engine and tests."
```

---

### Task 2: Menu, screen, and play loop

**Files:**
- Modify: `index.html` (third exhibit; `#stack-screen`; script tag for `stack.js`)
- Modify: `app.js` (pendingGame `stack`, three-way menu crab and arrows, start/render/place/cheer)
- Modify: `styles.css` (stack layout; painted tiles only)
- Modify: `README.md`

**Interfaces:**
- Consumes: `Sandcastle.*` from Task 1
- Produces: playable third game in the browser

- [ ] **Step 1: Markup**

In `#exhibits`, insert between Tidy and Path:

```html
<button type="button" class="exhibit" data-game="stack" role="option" aria-selected="false">
  <div class="exhibit-art stack-art" aria-hidden="true">
    <img src="assets/sandcastle-bucket-sand.png" alt="" />
    <img src="assets/sandcastle-turret-sand.png" alt="" />
    <img src="assets/sandcastle-drip-sand.png" alt="" />
  </div>
  <span class="exhibit-name">Sandcastle Stack</span>
  <span class="exhibit-blurb">Copy the castle</span>
</button>
```

Add screen (same sky chrome as Path):

```html
<section id="stack-screen" class="screen path-screen stack-screen hidden" hidden>
  <div class="sky">
    <button type="button" class="back-btn" data-back>Games</button>
    <img class="sun small" src="assets/sun.png" alt="" aria-hidden="true" />
    <p class="hint" id="stack-hint"></p>
  </div>
  <div class="stack-stage">
    <div id="stack-picture" class="stack-picture" aria-label="castle to copy"></div>
    <div id="stack-pad" class="stack-pad" aria-label="build the castle"></div>
    <div id="stack-tray" class="stack-tray" aria-label="castle pieces"></div>
    <div class="path-kid stack-kid" data-kid aria-hidden="true"></div>
  </div>
</section>
```

Include `<script src="stack.js"></script>` before `app.js`.

- [ ] **Step 2: Wire `app.js`**

- `stackSession`, `stackScreen`, `stackHint`, `stackPicture`, `stackPad`, `stackTray`.
- `goMenu` / `openGame` hide `#stack-screen`. Difficulty title: `stack` → `Sandcastle Stack`.
- `setMenuPick`: cycle `["tidy","stack","path"]`. Crab `--crab-x`: tidy `-180px`, stack `0px`, path `180px`.
- Arrow keys step that list.
- Difficulty click: `pendingGame === "stack"` → `startStack(difficulty)`.
- `startStack`: `activeGame = "stack"`, `Sandcastle.createSession({ difficulty })`, show stack screen, `renderStack`.
- `renderStack`: hint `Castle N of 6.`; picture is a smaller pad of target pieces (same PNGs, not interactive); pad draws only this castle’s spots; empty spots use `tile-sand.png` + class `spot` / `is-open` / `is-locked` / `is-filled`; tray pieces are buttons with `assets/sandcastle-{kind}-{color}.png`.
- Reuse pointer drag from Tidy, dropping onto `[data-spot]`. Tap-select then tap spot. `Sandcastle.place`. Miss: wiggle piece or spot. Hit: piece sits. Last piece: cheer `What a castle!`, then `advance` after the same delay as Tidy; after castle 6 show Play again / More games.
- `playAgain` when `activeGame === "stack"` calls `Sandcastle.playAgain(stackSession)` and `renderStack`.
- Hide stack screen whenever starting Tidy or Path.

- [ ] **Step 3: Styles**

- `.stack-stage`: sand background like Path; grid with picture, pad, tray, kid.
- `.stack-picture` / `.stack-pad`: CSS grid

```
        [top]
[left] [base] [right]
```

Missing spots are not rendered (`display` via presence only). Picture pieces are the same imgs, smaller, `pointer-events: none`.
- `.spot`: same ink border and `tile-sand.png` as `.tile`. `.spot.is-locked { opacity: 0.45; }`.
- `.stack-tray`: flex row of `.piece` (reuse Tidy piece styles).
- `.stack-art img`: same size treatment as `.tidy-art img`.
- No SVG. No new illustration.

- [ ] **Step 4: README**

Change “Two quiet beach games” to three. Add a **Sandcastle Stack** section: tap, pick difficulty, copy the picture, bucket first, sides next, drip on top, extras on harder days, wiggle on a miss.

Add `node test/stack.test.js` to Tests.

- [ ] **Step 5: Verify**

```bash
node test/stack.test.js
node test/game.test.js
node test/path.test.js
```

Open the game in a browser. Menu: three cards, crab under Stack, difficulty titled Sandcastle Stack. Easy castle 1: two sandy pieces, only base open, wrong piece wiggles, correct build cheers. Medium shows three spots. Hard shows four; top stays locked until both sides are in. Tidy and Path still start and play.

Desktop and a narrow (~390px) viewport.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js styles.css README.md
git commit -m "Add Sandcastle Stack play screen and menu card."
```

---

## Spec coverage

| Spec section | Task |
|--------------|------|
| Player experience, cheer, hint, six-beat session | 2 |
| Ground up unlocks | 1 (rules) + 2 (UI locked spots) |
| Roles and painted art only | 1 (kinds) + 2 (PNG paths, tile-sand spots) |
| Difficulty recipes | 1 |
| Randomization / generator | 1 |
| Session + API | 1 |
| Menu / difficulty / arrows / crab | 2 |
| Screen layout | 2 |
| Edges + tests | 1 |
| Out of scope (no Tidy/Path rule changes) | both |

## Self-review

- No placeholders. `Sandcastle` names match the spec. Tidy `drop` / Path `step` stay as they are.
- Hard 3 decoy is `any-drip` (spec after self-review), not `any-turret`.
