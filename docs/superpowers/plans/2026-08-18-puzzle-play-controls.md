# Beach Puzzle play controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Beach Puzzle’s sand static, keep pieces on screen, add a Tidy button (clumps top / singles bottom), and add a finished-picture preview that opens and closes.

**Architecture:** Extract clamp and tidy packing into Node-testable `puzzle-layout.js`. `app.js` drops field pan, clamps on drag/snap/deal/win, and wires Tidy plus the preview overlay. `puzzle.js` snap/deal rules do not change.

**Tech Stack:** HTML, CSS, vanilla JS. Tests: Node `assert` (`node test/puzzle-layout.test.js` plus existing suite). No new libraries.

## Global Constraints

- No timer, no losing score, no required reading.
- Beach Puzzle play-screen only. Tide Pool Tidy and Crab Path do not change.
- `puzzle.js` and `test/puzzle.test.js` do not change.
- Sand does not pan. Only pieces/clumps drag.
- A piece or clump’s `.jig` box stays fully inside `#puzzle-field`.
- Tidy button: broom/sparkle mark plus the word `Tidy`, above the girl.
- Tidy: clumps (2+ pieces) along the top, singles along the bottom; jump, no slide.
- Tidy after `complete` is a no-op.
- Preview: current session picture, top-left of the sand, not a piece.
- Overlay: dim + large picture + `X`; close via `X` or dim; pieces unmoved.
- Overlay open: no piece drag, Tidy does not fire.
- Overlay starts closed on every deal. Games / Play again close it.
- Opening preview during cheer is allowed; close returns to cheer.
- No new painted assets. No pinch-zoom. No rotation.

## File map

| File | Responsibility |
|------|----------------|
| `puzzle-layout.js` | Clamp a group; tidy positions; center a group |
| `test/puzzle-layout.test.js` | Node tests for clamp and tidy |
| `index.html` | Preview, Tidy, peek overlay, script tag |
| `styles.css` | Static field, tidy, preview, overlay |
| `app.js` | Remove pan; call layout helpers; wire controls |
| `README.md` | Mention tidy and preview |

---

### Task 1: Layout helpers

**Files:**
- Create: `puzzle-layout.js`
- Create: `test/puzzle-layout.test.js`

**Interfaces:**
- Consumes: nothing from the UI. Pure numbers and `{ x, y }` maps.
- Produces:

```
PuzzleLayout.groupBox(pos, ids, box) → { x, y, w, h }
PuzzleLayout.clampGroup(pos, ids, box, fieldW, fieldH) → new pos
PuzzleLayout.centerGroup(pos, ids, box, fieldW, fieldH, bottomReserve) → new pos
PuzzleLayout.tidyPositions(opts) → new pos
```

`pos` is `{ [id]: { x, y } }` where `id` keys may be numbers or strings; treat them as the same id. `box` is the `.jig` width/height (cell + 2×tab). Every function **copies** `pos` and does not mutate the input.

`tidyPositions(opts)`:

```
{
  groups,      // array of piece-id arrays
  pos,
  box,
  fieldW,
  fieldH,
  preview,     // { x, y, w, h } reserved top-left
  reserve,     // { x, y, w, h } reserved bottom-right (girl + Tidy)
  gap,         // default 8
  complete     // if true, return a copy of pos unchanged
}
```

Packing rules (implement exactly):

1. If `complete`, return a copy of `pos`.
2. Split `groups` into clumps (`ids.length > 1`) and singles (`ids.length === 1`). Ignore empty groups.
3. Sort each list by current `groupBox.x`, then by first id.
4. Place clumps from the top: first row `y = gap`. If the row’s `y` overlaps the preview vertically, start `x` at `preview.x + preview.w + gap`; otherwise `x = gap`. If the next clump does not fit on the row (`x + w > fieldW - gap`), wrap (`y += rowH + gap`, reset `x`). If it still does not fit beside the preview, place it on a row with `y = max(y, preview.y + preview.h + gap)` and `x = gap`.
5. Place singles from the bottom: row `y = fieldH - box - gap`. Advance `x` by `box + gap`. If the next single would pass `fieldW - gap` or overlap `reserve`, wrap upward (`y -= box + gap`, `x = gap`). Skip `x` forward if the slot overlaps `preview`.
6. Try `gap`, then `max(2, floor(gap/2))`, then `2`. Use the first attempt where no two placed boxes overlap **and** no placed box overlaps `preview` or `reserve` (except singles may overlap each other on the last attempt).
7. `clampGroup` every placed group to the field.

- [ ] **Step 1: Write failing tests** in `test/puzzle-layout.test.js` using the same harness as `test/puzzle.test.js` (`test`, `assert`, `passed`/`failed`, exit 1 on failure).

```javascript
/**
 * Puzzle play-field layout.
 * Run: node test/puzzle-layout.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var PuzzleLayout = require(path.join(__dirname, "..", "puzzle-layout.js"));

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("PASS  " + name);
  } catch (e) {
    failed++;
    console.error("FAIL  " + name);
    console.error("      " + (e && e.message ? e.message : e));
  }
}

function pos(map) {
  return JSON.parse(JSON.stringify(map));
}

test("clampGroup does not mutate input", function () {
  var start = pos({ 0: { x: -10, y: 4 } });
  PuzzleLayout.clampGroup(start, [0], 80, 400, 300);
  assert.strictEqual(start[0].x, -10);
});

test("clampGroup leaves an on-field piece alone", function () {
  var next = PuzzleLayout.clampGroup(pos({ 0: { x: 20, y: 30 } }), [0], 80, 400, 300);
  assert.strictEqual(next[0].x, 20);
  assert.strictEqual(next[0].y, 30);
});

test("clampGroup nudges a piece left of 0 onto the field", function () {
  var next = PuzzleLayout.clampGroup(pos({ 0: { x: -12, y: 8 } }), [0], 80, 400, 300);
  assert.strictEqual(next[0].x, 0);
  assert.strictEqual(next[0].y, 8);
});

test("clampGroup nudges a piece past the right and bottom edges", function () {
  var next = PuzzleLayout.clampGroup(pos({ 0: { x: 360, y: 250 } }), [0], 80, 400, 300);
  assert.strictEqual(next[0].x, 320);
  assert.strictEqual(next[0].y, 220);
});

test("clampGroup pins an oversized group to 0,0", function () {
  var next = PuzzleLayout.clampGroup(pos({ 0: { x: 15, y: 15 } }), [0], 500, 400, 300);
  assert.strictEqual(next[0].x, 0);
  assert.strictEqual(next[0].y, 0);
});

test("clampGroup moves a clump as one and keeps relative offset", function () {
  var next = PuzzleLayout.clampGroup(
    pos({ 0: { x: -20, y: 10 }, 1: { x: 60, y: 10 } }),
    [0, 1],
    80,
    400,
    300
  );
  assert.strictEqual(next[1].x - next[0].x, 80);
  assert.strictEqual(next[0].x, 0);
  assert.strictEqual(next[0].y, 10);
});

test("groupBox is the union of jig rectangles", function () {
  var b = PuzzleLayout.groupBox(pos({ 0: { x: 10, y: 20 }, 1: { x: 90, y: 20 } }), [0, 1], 80);
  assert.strictEqual(b.x, 10);
  assert.strictEqual(b.y, 20);
  assert.strictEqual(b.w, 160);
  assert.strictEqual(b.h, 80);
});

test("centerGroup centers above a bottom reserve", function () {
  var next = PuzzleLayout.centerGroup(pos({ 0: { x: 0, y: 0 } }), [0], 80, 400, 300, 100);
  assert.strictEqual(next[0].x, 160);
  assert.strictEqual(next[0].y, 60);
});

test("tidyPositions does not mutate input", function () {
  var start = pos({ 0: { x: 200, y: 40 } });
  PuzzleLayout.tidyPositions({
    groups: [[0]],
    pos: start,
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: false
  });
  assert.strictEqual(start[0].x, 200);
  assert.strictEqual(start[0].y, 40);
});

test("tidyPositions is a no-op when complete", function () {
  var next = PuzzleLayout.tidyPositions({
    groups: [[0, 1]],
    pos: pos({ 0: { x: 40, y: 90 }, 1: { x: 120, y: 90 } }),
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: true
  });
  assert.strictEqual(next[0].x, 40);
  assert.strictEqual(next[1].y, 90);
});

test("tidyPositions puts singles along the bottom and clear of the reserve", function () {
  var next = PuzzleLayout.tidyPositions({
    groups: [[0], [1], [2]],
    pos: pos({ 0: { x: 300, y: 10 }, 1: { x: 20, y: 80 }, 2: { x: 500, y: 200 } }),
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: false
  });
  assert.ok(next[0].y >= 600 - 80 - 8 - 1);
  assert.ok(next[1].y >= 600 - 80 - 8 - 1);
  assert.ok(next[2].y >= 600 - 80 - 8 - 1);
  assert.ok(next[0].x + 80 <= 680);
  assert.ok(next[1].x + 80 <= 680);
  assert.ok(next[2].x + 80 <= 680);
});

test("tidyPositions keeps left-to-right order of singles", function () {
  var next = PuzzleLayout.tidyPositions({
    groups: [[0], [1]],
    pos: pos({ 0: { x: 400, y: 10 }, 1: { x: 50, y: 10 } }),
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: false
  });
  assert.ok(next[1].x < next[0].x);
});

test("tidyPositions puts clumps above singles", function () {
  var next = PuzzleLayout.tidyPositions({
    groups: [[0, 1], [2]],
    pos: pos({ 0: { x: 300, y: 200 }, 1: { x: 380, y: 200 }, 2: { x: 10, y: 10 } }),
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: false
  });
  var clump = PuzzleLayout.groupBox(next, [0, 1], 80);
  assert.ok(clump.y < next[2].y);
  assert.ok(clump.x >= 12 + 100);
  assert.ok(next[0].x < next[1].x);
  assert.strictEqual(next[1].x - next[0].x, 80);
});

test("tidyPositions keeps every jig on the field", function () {
  var next = PuzzleLayout.tidyPositions({
    groups: [[0], [1], [2], [3]],
    pos: pos({
      0: { x: -40, y: -20 },
      1: { x: 900, y: 10 },
      2: { x: 10, y: 700 },
      3: { x: 40, y: 50 }
    }),
    box: 80,
    fieldW: 800,
    fieldH: 600,
    preview: { x: 12, y: 12, w: 100, h: 80 },
    reserve: { x: 680, y: 420, w: 120, h: 180 },
    gap: 8,
    complete: false
  });
  [0, 1, 2, 3].forEach(function (id) {
    assert.ok(next[id].x >= 0);
    assert.ok(next[id].y >= 0);
    assert.ok(next[id].x + 80 <= 800);
    assert.ok(next[id].y + 80 <= 600);
  });
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
```

- [ ] **Step 2: Run `node test/puzzle-layout.test.js`**

Expected: FAIL because `puzzle-layout.js` is missing (`Cannot find module`).

- [ ] **Step 3: Implement `puzzle-layout.js`** as an IIFE like `puzzle.js` (Node `module.exports` and `root.PuzzleLayout` in the browser).

```javascript
/**
 * Beach Puzzle — clamp, center, tidy positions.
 * Works in Node (tests) and the browser (window.PuzzleLayout).
 */
(function (root) {
  "use strict";

  function clonePos(pos) {
    var out = {};
    Object.keys(pos).forEach(function (key) {
      out[key] = { x: pos[key].x, y: pos[key].y };
    });
    return out;
  }

  function idsOf(ids) {
    return ids.map(function (id) {
      return id;
    });
  }

  function at(pos, id) {
    if (pos[id] !== undefined) return pos[id];
    return pos[String(id)];
  }

  function setAt(pos, id, x, y) {
    if (pos[id] !== undefined) {
      pos[id] = { x: x, y: y };
      return;
    }
    pos[String(id)] = { x: x, y: y };
  }

  function groupBox(pos, ids, box) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    idsOf(ids).forEach(function (id) {
      var p = at(pos, id);
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + box > maxX) maxX = p.x + box;
      if (p.y + box > maxY) maxY = p.y + box;
    });
    if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function translate(pos, ids, dx, dy) {
    idsOf(ids).forEach(function (id) {
      var p = at(pos, id);
      if (!p) return;
      setAt(pos, id, p.x + dx, p.y + dy);
    });
  }

  function clampGroup(pos, ids, box, fieldW, fieldH) {
    var next = clonePos(pos);
    if (!ids || !ids.length) return next;
    var b = groupBox(next, ids, box);
    var dx = 0;
    var dy = 0;
    if (b.w >= fieldW) dx = -b.x;
    else if (b.x < 0) dx = -b.x;
    else if (b.x + b.w > fieldW) dx = fieldW - b.x - b.w;
    if (b.h >= fieldH) dy = -b.y;
    else if (b.y < 0) dy = -b.y;
    else if (b.y + b.h > fieldH) dy = fieldH - b.y - b.h;
    translate(next, ids, dx, dy);
    return next;
  }

  function centerGroup(pos, ids, box, fieldW, fieldH, bottomReserve) {
    var next = clonePos(pos);
    var b = groupBox(next, ids, box);
    var usableH = fieldH - (bottomReserve || 0);
    var tx = (fieldW - b.w) / 2;
    var ty = (usableH - b.h) / 2;
    translate(next, ids, tx - b.x, ty - b.y);
    return clampGroup(next, ids, box, fieldW, fieldH);
  }

  function overlaps(ax, ay, aw, ah, r) {
    if (!r || !r.w || !r.h) return false;
    return ax < r.x + r.w && ax + aw > r.x && ay < r.y + r.h && ay + ah > r.y;
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveGroupTo(pos, ids, box, x, y) {
    var b = groupBox(pos, ids, box);
    translate(pos, ids, x - b.x, y - b.y);
  }

  function tidyPositions(opts) {
    var pos = clonePos(opts.pos);
    if (opts.complete) return pos;
    var box = opts.box;
    var fieldW = opts.fieldW;
    var fieldH = opts.fieldH;
    var gapWanted = opts.gap == null ? 8 : opts.gap;
    var preview = opts.preview || { x: 0, y: 0, w: 0, h: 0 };
    var reserve = opts.reserve || { x: fieldW, y: fieldH, w: 0, h: 0 };
    var source = clonePos(opts.pos);

    var clumps = [];
    var singles = [];
    (opts.groups || []).forEach(function (g) {
      var ids = g.slice();
      if (!ids.length) return;
      var item = { ids: ids, b: groupBox(source, ids, box) };
      if (ids.length > 1) clumps.push(item);
      else singles.push(item);
    });
    function byX(a, b) {
      if (a.b.x !== b.b.x) return a.b.x - b.b.x;
      return a.ids[0] - b.ids[0];
    }
    clumps.sort(byX);
    singles.sort(byX);

    var gaps = [gapWanted, Math.max(2, Math.floor(gapWanted / 2)), 2];
    var attempt;
    var best = null;
    for (attempt = 0; attempt < gaps.length; attempt++) {
      var trial = clonePos(source);
      var allowSingleOverlap = attempt === gaps.length - 1;
      placeClumps(trial, clumps, box, fieldW, fieldH, preview, gaps[attempt]);
      placeSingles(trial, singles, box, fieldW, fieldH, preview, reserve, gaps[attempt]);
      clumps.forEach(function (item) {
        var clamped = clampGroup(trial, item.ids, box, fieldW, fieldH);
        item.ids.forEach(function (id) {
          setAt(trial, id, at(clamped, id).x, at(clamped, id).y);
        });
      });
      singles.forEach(function (item) {
        var clamped = clampGroup(trial, item.ids, box, fieldW, fieldH);
        item.ids.forEach(function (id) {
          setAt(trial, id, at(clamped, id).x, at(clamped, id).y);
        });
      });
      if (validPack(trial, clumps, singles, box, preview, reserve, allowSingleOverlap)) {
        best = trial;
        break;
      }
      best = trial;
    }
    return best || pos;
  }

  function placeClumps(pos, clumps, box, fieldW, fieldH, preview, gap) {
    var x = gap;
    var y = gap;
    var rowH = 0;
    clumps.forEach(function (item) {
      var w = item.b.w;
      var h = item.b.h;
      function startXForRow(rowY) {
        if (rowY < preview.y + preview.h) return Math.max(gap, preview.x + preview.w + gap);
        return gap;
      }
      if (rowH === 0) x = startXForRow(y);
      if (x + w > fieldW - gap) {
        y += (rowH || h) + gap;
        rowH = 0;
        x = startXForRow(y);
        if (x + w > fieldW - gap) {
          y = Math.max(y, preview.y + preview.h + gap);
          x = gap;
        }
      }
      moveGroupTo(pos, item.ids, box, x, y);
      x += w + gap;
      rowH = Math.max(rowH, h);
    });
  }

  function placeSingles(pos, singles, box, fieldW, fieldH, preview, reserve, gap) {
    var x = gap;
    var y = fieldH - box - gap;
    singles.forEach(function (item) {
      function blocked(px, py) {
        return overlaps(px, py, box, box, preview) || overlaps(px, py, box, box, reserve);
      }
      if (x + box > fieldW - gap || blocked(x, y)) {
        if (blocked(x, y) && x + box <= fieldW - gap && !overlaps(x, y, box, box, reserve)) {
          x = preview.x + preview.w + gap;
        } else {
          y -= box + gap;
          x = gap;
        }
      }
      if (blocked(x, y)) {
        if (overlaps(x, y, box, box, preview)) x = preview.x + preview.w + gap;
        if (overlaps(x, y, box, box, reserve)) {
          y -= box + gap;
          x = gap;
        }
      }
      moveGroupTo(pos, item.ids, box, x, y);
      x += box + gap;
    });
  }

  function validPack(pos, clumps, singles, box, preview, reserve, allowSingleOverlap) {
    var placed = [];
    var ok = true;
    function consider(item, isSingle) {
      var b = groupBox(pos, item.ids, box);
      if (overlaps(b.x, b.y, b.w, b.h, preview)) ok = false;
      if (overlaps(b.x, b.y, b.w, b.h, reserve)) ok = false;
      placed.forEach(function (other) {
        if (!boxesOverlap(b, other.b)) return;
        if (allowSingleOverlap && isSingle && other.single) return;
        ok = false;
      });
      placed.push({ b: b, single: isSingle });
    }
    clumps.forEach(function (item) {
      consider(item, false);
    });
    singles.forEach(function (item) {
      consider(item, true);
    });
    return ok;
  }

  var PuzzleLayout = {
    groupBox: groupBox,
    clampGroup: clampGroup,
    centerGroup: centerGroup,
    tidyPositions: tidyPositions
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PuzzleLayout;
  } else {
    root.PuzzleLayout = PuzzleLayout;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
```

- [ ] **Step 4: Run `node test/puzzle-layout.test.js && node test/puzzle.test.js && node test/game.test.js && node test/path.test.js`**

Expected: all PASS. If a tidy test fails because of off-by-one packing, fix `placeClumps` / `placeSingles` until the tests pass. Do not weaken assertions.

- [ ] **Step 5: Commit**

```bash
git add puzzle-layout.js test/puzzle-layout.test.js
git commit -m "Add puzzle layout helpers for clamp, center, and tidy."
```

---

### Task 2: Static sand and on-screen clamp

**Files:**
- Modify: `index.html` (add `<script src="puzzle-layout.js"></script>` immediately before `app.js`)
- Modify: `app.js` (remove pan; clamp on deal, drag, snap, win)
- Modify: `styles.css` (field is not a grab surface)

**Interfaces:**
- Consumes: `PuzzleLayout.clampGroup`, `PuzzleLayout.centerGroup`, `PuzzleLayout.groupBox` from Task 1.
- Produces: a puzzle field that does not translate; `puzzlePan` gone.

- [ ] **Step 1: Load the helper**

In `index.html`, before `app.js`:

```html
<script src="puzzle-layout.js"></script>
```

- [ ] **Step 2: Remove pan from `app.js`**

Delete `var puzzlePan = { x: 0, y: 0 };`.

In `startPuzzleDeal`, delete `puzzlePan = { x: 0, y: 0 };`. After building `puzzlePos`, clamp every singleton:

```javascript
var field = puzzleField.getBoundingClientRect();
var box = puzzleCell + puzzleTab * 2;
for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) {
  puzzlePos = PuzzleLayout.clampGroup(puzzlePos, [id], box, field.width, field.height);
}
```

In `renderPuzzle`, delete `puzzleField.style.transform = ...`.

Delete the three `puzzleField` listeners whose `drag.kind === "pan"` (pointerdown / pointermove / pointerup / pointercancel). Empty sand does nothing.

- [ ] **Step 3: Clamp while dragging and after snap**

Add:

```javascript
function fieldSize() {
  var field = puzzleField.getBoundingClientRect();
  return { w: field.width, h: field.height, box: puzzleCell + puzzleTab * 2 };
}

function applyPuzzlePos() {
  Object.keys(puzzlePos).forEach(function (id) {
    var el = puzzleField.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    el.style.left = puzzlePos[id].x + "px";
    el.style.top = puzzlePos[id].y + "px";
  });
}
```

In the jig `pointermove` handler, after writing tentative `puzzlePos` from `starts + dx/dy`, replace with:

```javascript
var size = fieldSize();
puzzlePos = PuzzleLayout.clampGroup(puzzlePos, drag.ids, size.box, size.w, size.h);
applyPuzzlePos();
```

In `trySnapGroup`, after applying snap `dx`/`dy` to `ids`, clamp `ids` then `applyPuzzlePos` (or `renderPuzzle` as today — if you re-render, still clamp first).

Replace `centerCompletedPuzzle` with:

```javascript
function centerCompletedPuzzle() {
  var ids = [];
  var id;
  for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) ids.push(id);
  var size = fieldSize();
  puzzlePos = PuzzleLayout.centerGroup(puzzlePos, ids, size.box, size.w, size.h, 300);
  applyPuzzlePos();
}
```

- [ ] **Step 4: CSS** — `#puzzle-field` keeps `touch-action: none` but is not a grab cursor. Do not add `cursor: grab` on the field.

- [ ] **Step 5: Run `node test/puzzle-layout.test.js && node test/puzzle.test.js && node test/game.test.js && node test/path.test.js`**

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js styles.css
git commit -m "Stop panning Beach Puzzle and clamp pieces to the sand."
```

---

### Task 3: Tidy button and picture preview

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `PuzzleLayout.tidyPositions`, `Puzzle.pictureSrc`.
- Produces: `#puzzle-preview`, `#puzzle-tidy`, `#puzzle-peek` as specified.

- [ ] **Step 1: Markup** — inside `#puzzle-stage`, **siblings** of `#puzzle-field` (not inside it):

```html
<div class="puzzle-stage">
  <button type="button" id="puzzle-preview" class="puzzle-preview" aria-label="finished picture">
    <img id="puzzle-preview-img" alt="" draggable="false" />
  </button>
  <div id="puzzle-field" class="puzzle-field" aria-label="puzzle pieces"></div>
  <button type="button" id="puzzle-tidy" class="puzzle-tidy" aria-label="Tidy">
    <svg class="puzzle-tidy-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="#111111"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 3.5 L13.2 7.2 L17 8.4 L13.2 9.6 L12 13.3 L10.8 9.6 L7 8.4 L10.8 7.2 Z M6.5 15.5 L10 14.2 L17.5 19.5 L15.8 21 L8.2 15.8 Z"
      />
    </svg>
    <span>Tidy</span>
  </button>
  <div class="path-kid puzzle-kid" data-kid aria-hidden="true"></div>
</div>
<div id="puzzle-peek" class="puzzle-peek hidden" hidden>
  <button type="button" id="puzzle-peek-dim" class="puzzle-peek-dim" aria-label="close picture"></button>
  <div class="puzzle-peek-frame">
    <img id="puzzle-peek-img" alt="" draggable="false" />
    <button type="button" id="puzzle-peek-close" class="puzzle-peek-close" aria-label="close picture">X</button>
  </div>
</div>
```

`#puzzle-peek` is inside `#puzzle-screen`, after `.puzzle-stage`.

- [ ] **Step 2: CSS** — add after `.puzzle-kid`:

```css
.puzzle-preview {
  appearance: none;
  position: absolute;
  left: 0.7rem;
  top: 0.7rem;
  z-index: 6;
  width: 96px;
  padding: 0;
  border: 5px solid var(--ink);
  border-radius: 0.85rem;
  background: var(--foam);
  box-shadow: 0 4px 0 var(--ink);
  cursor: pointer;
  overflow: hidden;
}

.puzzle-preview img {
  display: block;
  width: 100%;
  height: 72px;
  object-fit: cover;
  pointer-events: none;
}

.puzzle-tidy {
  appearance: none;
  position: absolute;
  right: 0.4rem;
  bottom: 5.3rem;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 4px solid var(--ink);
  background: var(--foam);
  color: var(--ink);
  font-family: Fredoka, "Trebuchet MS", sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.28rem 0.7rem 0.36rem 0.5rem;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 3px 0 var(--ink);
}

.puzzle-tidy-mark {
  width: 1.25rem;
  height: 1.25rem;
  display: block;
}

.puzzle-peek {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
}

.puzzle-peek-dim {
  appearance: none;
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(27, 42, 74, 0.45);
  cursor: pointer;
}

.puzzle-peek-frame {
  position: relative;
  z-index: 1;
  max-width: min(92vw, 720px);
  max-height: 82%;
  border: 6px solid var(--ink);
  border-radius: 1.1rem;
  background: var(--foam);
  box-shadow: 6px 6px 0 var(--ink);
  overflow: hidden;
}

.puzzle-peek-frame img {
  display: block;
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
}

.puzzle-peek-close {
  appearance: none;
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 2.2rem;
  height: 2.2rem;
  border: 4px solid var(--ink);
  border-radius: 999px;
  background: var(--sunflower);
  color: var(--ink);
  font-family: Fredoka, "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 3px 0 var(--ink);
}

@media (max-width: 700px) {
  .puzzle-preview {
    width: 80px;
  }

  .puzzle-preview img {
    height: 60px;
  }

  .puzzle-tidy {
    bottom: 4.1rem;
    font-size: 0.92rem;
  }
}
```

`#puzzle-screen` must be `position: relative` (it already is, via `.path-screen`). Peek sits over the stage, above `.cheer` (`z-index: 30`) so the picture is visible during cheer.

- [ ] **Step 3: Wire `app.js`**

Cache:

```javascript
var puzzlePreview = document.getElementById("puzzle-preview");
var puzzlePreviewImg = document.getElementById("puzzle-preview-img");
var puzzleTidy = document.getElementById("puzzle-tidy");
var puzzlePeek = document.getElementById("puzzle-peek");
var puzzlePeekImg = document.getElementById("puzzle-peek-img");
var puzzlePeekClose = document.getElementById("puzzle-peek-close");
var puzzlePeekDim = document.getElementById("puzzle-peek-dim");
```

```javascript
function closePuzzlePeek() {
  if (puzzlePeek) hide(puzzlePeek);
}

function openPuzzlePeek() {
  if (!puzzleSession || !puzzlePeek || !puzzlePeekImg) return;
  puzzlePeekImg.src = Puzzle.pictureSrc(puzzleSession);
  show(puzzlePeek);
}

function peekOpen() {
  return puzzlePeek && !puzzlePeek.hidden;
}
```

Call `closePuzzlePeek()` from `goMenu`, `startPuzzleDeal` (start of function), and leave `hideCheer` alone (closing peek must not dismiss cheer).

In `startPuzzleDeal` / `renderPuzzle`, set:

```javascript
var src = Puzzle.pictureSrc(puzzleSession);
if (puzzlePreviewImg) puzzlePreviewImg.src = src;
if (puzzlePeekImg && peekOpen()) puzzlePeekImg.src = src;
```

Tidy:

```javascript
function rectOnField(el, field) {
  if (!el) return { x: 0, y: 0, w: 0, h: 0 };
  var r = el.getBoundingClientRect();
  return {
    x: r.left - field.left,
    y: r.top - field.top,
    w: r.width,
    h: r.height
  };
}

function unionRect(a, b) {
  var x = Math.min(a.x, b.x);
  var y = Math.min(a.y, b.y);
  var r = Math.max(a.x + a.w, b.x + b.w);
  var bot = Math.max(a.y + a.h, b.y + b.h);
  return { x: x, y: y, w: r - x, h: bot - y };
}

function tidyPuzzle() {
  if (!puzzleSession || puzzleSession.complete || peekOpen()) return;
  var field = puzzleField.getBoundingClientRect();
  var kid = puzzleScreen.querySelector(".puzzle-kid");
  var preview = rectOnField(puzzlePreview, field);
  var reserve = unionRect(rectOnField(puzzleTidy, field), rectOnField(kid, field));
  puzzlePos = PuzzleLayout.tidyPositions({
    groups: puzzleSession.groups,
    pos: puzzlePos,
    box: puzzleCell + puzzleTab * 2,
    fieldW: field.width,
    fieldH: field.height,
    preview: preview,
    reserve: reserve,
    gap: 10,
    complete: puzzleSession.complete
  });
  applyPuzzlePos();
}
```

Listeners:

```javascript
if (puzzleTidy) puzzleTidy.addEventListener("click", tidyPuzzle);
if (puzzlePreview) puzzlePreview.addEventListener("click", openPuzzlePeek);
if (puzzlePeekClose) puzzlePeekClose.addEventListener("click", closePuzzlePeek);
if (puzzlePeekDim) puzzlePeekDim.addEventListener("click", closePuzzlePeek);
```

In `bindJigDrag` pointerdown and pointermove: if `peekOpen()` return immediately.

- [ ] **Step 4: README** — under Beach Puzzle, add:

```
Tap the small picture in the corner to peek at the finished scene; tap X to close it.
Tap Tidy to line clumps along the top and leftover pieces along the bottom.
Pieces stay on the sand. The sand itself does not slide.
```

Add `node test/puzzle-layout.test.js` to the Tests list.

- [ ] **Step 5: Verify**

```bash
node test/puzzle-layout.test.js && node test/puzzle.test.js && node test/game.test.js && node test/path.test.js
```

Expected: all PASS.

Browser (Beach Puzzle Easy and Hard):

- Empty sand does not pan.
- A piece stops at the sand edge.
- Tidy: clumps top, singles bottom; preview and girl stay clear.
- Preview opens the current picture; X and dim close it; pieces unmoved.
- Play again updates the thumbnail. Games closes the overlay.
- Tide Pool Tidy and Crab Path still play.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css app.js README.md
git commit -m "Add Beach Puzzle tidy button and finished-picture preview."
```

---

## Spec coverage

| Spec | Task |
|------|------|
| Static sand, no pan | 2 |
| Clamp on drag, snap, deal, win | 1 + 2 |
| Win centers by moving pieces | 1 (`centerGroup`) + 2 |
| Tidy packing rules | 1 |
| Tidy button above girl | 3 |
| Tidy no-op when complete / peek open | 3 |
| Preview thumb current picture, top-left | 3 |
| Overlay + X + dim | 3 |
| Overlay closed on deal / Games | 3 |
| Tidy/Path unchanged | 2 + 3 (no edits there) |
| `puzzle.js` unchanged | all |
