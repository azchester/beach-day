# Paint by Number Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Paint by Number: she picks a numbered pot and taps matching blobs on a generated coloring-book outline. Easy 10/4, Medium 20/6, Hard 40/8.

**Architecture:** `paint.js` owns pictures, palettes, zone layouts, `selectColor`, `fill`, and `playAgain` (Node-testable). `app.js` owns pots, taps, wiggle, and cheer. Eight square coloring-book PNGs are generated at implementation time from existing Beach Day art and checked in; the browser never calls an image model.

**Tech Stack:** HTML, CSS, vanilla JS. Tests: `node test/paint.test.js` (same `test` / `assert` / `always` harness as `test/puzzle.test.js`). No new libraries.

## Global Constraints

- No timer, no losing score, no required reading.
- Pick a pot, then tap blobs. Wrong pot / no pot / already filled: wiggle, stay put. No peel. No undo. No pinch-zoom.
- Easy 10 cells / 4 colors. Medium 20 / 6. Hard 40 / 8. One of 8 pictures at random.
- Cheer: `What a picture!` Play again keeps difficulty, new picture roll.
- Outlines are generated coloring-book PNGs, square, no numerals. Blobs are authored SVG paths in viewBox `0 0 100 100`.
- Palette order never shuffles. Sun stays sunny.
- Tidy, Puzzle, and Path rules do not change.
- Default difficulty medium; unknown → medium.
- `random` is `[0, 1)`; omitted → `Math.random`.
- Menu order: Tide Pool Tidy, Beach Puzzle, Crab Path, Paint by Number.

## File map

| File | Responsibility |
|------|----------------|
| `paint.js` | Pictures, palettes, layouts, selectColor, fill, complete |
| `test/paint.test.js` | Node tests from the spec Testing section |
| `assets/paint/{id}-outline.png` | Eight generated coloring-book pages |
| `index.html` | Exhibit + `#paint-screen` |
| `styles.css` | Page, blobs, pots, cheer overlay |
| `app.js` | Menu, pots, tap, wiggle, cheer |
| `README.md` | Fourth game |

---

### Task 1: Rules engine

**Files:**
- Create: `test/paint.test.js`
- Create: `paint.js`

**Interfaces:**
- Consumes: nothing from other Beach Day games.
- Produces: `window.Paint` / `module.exports` with exactly:

```
PICTURE_COUNT: 8
PICTURES: ["sun","crab","sandcastle","fish","starfish","boat","shell","bucket"]
COLORS: ["sunflower","orange","coral","peach","sand","foam","sky","water","kelp","navy"]
grid(difficulty) -> { cells: 10|20|40, colors: 4|6|8 }
palette(pictureIndex, difficulty) -> string[]
colorName(pictureIndex, colorNumber) -> string | null
hex(name) -> string
layout(pictureIndex, difficulty) -> [{ id, color, d }]
pictureId(session) -> string
pictureSrc(session) -> string
createSession({ difficulty, random }) -> session
selectColor(session, n) -> { ok, session }
fill(session, cellId) -> { ok, session }
playAgain(session, random) -> session
```

Session shape:

```
{
  difficulty,      // "easy" | "medium" | "hard"
  pictureIndex,    // 0..7
  selectedColor,   // 1..K or null
  cells,           // [{ id, color }]
  filled,          // { [cellId]: true }
  complete
}
```

`color` on a cell is pot number `1..K`. `selectColor` / `fill` / `playAgain` copy; they do not mutate the input.

`hex` maps the ten paint names to the spec hex values. `colorName` uses the picture’s full 8-name list and ignores difficulty; `null` if `colorNumber` is not in `1..8`.

- [ ] **Step 1: Write the failing tests**

Create `test/paint.test.js`:

```js
/**
 * Paint by Number rules.
 * Run: node test/paint.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var Paint = require(path.join(__dirname, "..", "paint.js"));

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

function always(v) {
  return function () {
    return v;
  };
}

function colorCounts(cells) {
  var map = {};
  cells.forEach(function (c) {
    map[c.color] = (map[c.color] || 0) + 1;
  });
  return map;
}

function fillAll(session) {
  var i;
  for (i = 0; i < session.cells.length; i++) {
    var cell = session.cells[i];
    var picked = Paint.selectColor(session, cell.color);
    assert.strictEqual(picked.ok, true);
    var result = Paint.fill(picked.session, cell.id);
    assert.strictEqual(result.ok, true);
    session = result.session;
  }
  return session;
}

test("createSession with no args is medium 20/6", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.cells.length, 20);
  assert.strictEqual(s.selectedColor, null);
  assert.strictEqual(s.complete, false);
  assert.strictEqual(Object.keys(colorCounts(s.cells)).length, 6);
  assert.strictEqual(Paint.createSession().difficulty, "medium");
  assert.strictEqual(Paint.PICTURE_COUNT, 8);
});

test("unknown difficulty is medium", function () {
  var s = Paint.createSession({ difficulty: "banana", random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  var g = Paint.grid("nope");
  assert.strictEqual(g.cells, 20);
  assert.strictEqual(g.colors, 6);
});

test("Easy is 10 cells colors 1-4 counts 4/3/2/1", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  assert.strictEqual(s.cells.length, 10);
  var counts = colorCounts(s.cells);
  assert.strictEqual(counts[1], 4);
  assert.strictEqual(counts[2], 3);
  assert.strictEqual(counts[3], 2);
  assert.strictEqual(counts[4], 1);
});

test("Hard is 40 cells colors 1-8 counts 8/7/6/5/5/4/3/2", function () {
  var s = Paint.createSession({ difficulty: "hard", random: always(0) });
  assert.strictEqual(s.cells.length, 40);
  var counts = colorCounts(s.cells);
  assert.strictEqual(counts[1], 8);
  assert.strictEqual(counts[2], 7);
  assert.strictEqual(counts[3], 6);
  assert.strictEqual(counts[4], 5);
  assert.strictEqual(counts[5], 5);
  assert.strictEqual(counts[6], 4);
  assert.strictEqual(counts[7], 3);
  assert.strictEqual(counts[8], 2);
});

test("pictureIndex is 0..7 and pictureId 0 is sun", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  assert.ok(s.pictureIndex >= 0 && s.pictureIndex <= 7);
  assert.strictEqual(Math.floor(s.pictureIndex), s.pictureIndex);
  assert.strictEqual(Paint.pictureId(s), "sun");
  assert.ok(Paint.pictureSrc(s).indexOf("sun-outline.png") !== -1);
});

test("sun easy palette and colorName", function () {
  var pal = Paint.palette(0, "easy");
  assert.deepStrictEqual(pal, ["sunflower", "orange", "sky", "foam"]);
  assert.strictEqual(Paint.palette(1, "easy")[0], "coral");
  assert.strictEqual(Paint.colorName(0, 1), "sunflower");
  assert.strictEqual(Paint.colorName(0, 9), null);
  assert.strictEqual(Paint.hex("sunflower"), "#ffe14a");
});

test("sun layouts use only open paints and all appear", function () {
  ["easy", "medium", "hard"].forEach(function (d) {
    var k = Paint.grid(d).colors;
    var layout = Paint.layout(0, d);
    var seen = {};
    layout.forEach(function (cell) {
      assert.ok(cell.color >= 1 && cell.color <= k);
      assert.ok(cell.d && cell.d.length > 0);
      seen[cell.color] = true;
    });
    var n;
    for (n = 1; n <= k; n++) assert.ok(seen[n], "missing color " + n);
  });
});

test("crab easy uses pots 1-4 and all four appear", function () {
  var layout = Paint.layout(1, "easy");
  var seen = {};
  layout.forEach(function (cell) {
    assert.ok(cell.color >= 1 && cell.color <= 4);
    seen[cell.color] = true;
  });
  assert.ok(seen[1] && seen[2] && seen[3] && seen[4]);
});

test("selectColor 1 succeeds and does not mutate input", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  var result = Paint.selectColor(s, 1);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.selectedColor, 1);
  assert.strictEqual(s.selectedColor, null);
});

test("selectColor 0 and 99 fail", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  assert.strictEqual(Paint.selectColor(s, 0).ok, false);
  assert.strictEqual(Paint.selectColor(s, 99).ok, false);
  assert.strictEqual(Paint.selectColor(s, 5).ok, false);
});

test("fill matching empty cell succeeds and does not mutate input", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  var cell = s.cells[0];
  s = Paint.selectColor(s, cell.color).session;
  var before = Object.keys(s.filled).length;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.filled[cell.id], true);
  assert.strictEqual(Object.keys(s.filled).length, before);
});

test("fill with no pot fails", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  var result = Paint.fill(s, s.cells[0].id);
  assert.strictEqual(result.ok, false);
});

test("fill wrong color fails", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  var cell = s.cells.filter(function (c) {
    return c.color === 1;
  })[0];
  s = Paint.selectColor(s, 2).session;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, false);
  assert.ok(!result.session.filled[cell.id]);
});

test("fill of a filled cell fails", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  var cell = s.cells[0];
  s = Paint.selectColor(s, cell.color).session;
  s = Paint.fill(s, cell.id).session;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, false);
});

test("fill of unknown cellId fails", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  s = Paint.selectColor(s, 1).session;
  assert.strictEqual(Paint.fill(s, 999).ok, false);
});

test("filling the last Easy cell sets complete", function () {
  var s = fillAll(Paint.createSession({ difficulty: "easy", random: always(0) }));
  assert.strictEqual(s.complete, true);
});

test("playAgain keeps difficulty and can change picture", function () {
  var s = Paint.createSession({ difficulty: "hard", random: always(0) });
  var again = Paint.playAgain(s, always(0.99));
  assert.strictEqual(again.difficulty, "hard");
  assert.notStrictEqual(again.pictureIndex, s.pictureIndex);
  assert.strictEqual(again.selectedColor, null);
  assert.strictEqual(Paint.playAgain().difficulty, "medium");
});

test("two random stubs differ in pictureIndex", function () {
  var a = Paint.createSession({ difficulty: "easy", random: always(0) });
  var b = Paint.createSession({ difficulty: "easy", random: always(0.99) });
  assert.notStrictEqual(a.pictureIndex, b.pictureIndex);
});

test("every picture layout has non-empty paths and spec counts", function () {
  Paint.PICTURES.forEach(function (_, index) {
    ["easy", "medium", "hard"].forEach(function (d) {
      var layout = Paint.layout(index, d);
      var expect = Paint.grid(d);
      assert.strictEqual(layout.length, expect.cells);
      var counts = colorCounts(layout);
      if (d === "easy") {
        assert.strictEqual(counts[1], 4);
        assert.strictEqual(counts[4], 1);
      }
      if (d === "medium") {
        assert.strictEqual(counts[1], 5);
        assert.strictEqual(counts[6], 2);
      }
      if (d === "hard") {
        assert.strictEqual(counts[1], 8);
        assert.strictEqual(counts[8], 2);
      }
      layout.forEach(function (cell) {
        assert.ok(cell.d && cell.d.charAt(0) === "M");
      });
    });
  });
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
```

- [ ] **Step 2: Run `node test/paint.test.js`**

Expected: FAIL because `paint.js` is missing (`Cannot find module`).

- [ ] **Step 3: Implement `paint.js`**

IIFE like `puzzle.js`. Put palettes, zone counts, box maps, and the packer in this file (do not split unless the file exceeds ~500 lines; if it does, keep the public API in `paint.js` and move only `BOXES` + `ZONE_COUNTS` to `paint-layouts.js` required/attached the same way — prefer one file).

```js
/**
 * Paint by Number — palettes, layouts, fill.
 * Works in Node (tests) and the browser (window.Paint).
 */
(function (root) {
  "use strict";

  var PICTURES = ["sun", "crab", "sandcastle", "fish", "starfish", "boat", "shell", "bucket"];
  var PICTURE_COUNT = PICTURES.length;
  var COLORS = ["sunflower", "orange", "coral", "peach", "sand", "foam", "sky", "water", "kelp", "navy"];
  var COLOR_HEX = {
    sunflower: "#ffe14a",
    orange: "#f4a03c",
    coral: "#e24b3c",
    peach: "#f7c09a",
    sand: "#f2d04a",
    foam: "#fff8ee",
    sky: "#4eb0ea",
    water: "#2aa8a8",
    kelp: "#2f7a52",
    navy: "#2a3a6a"
  };
  var PALETTES = {
    sun: ["sunflower", "orange", "sky", "foam", "sand", "water", "coral", "peach"],
    crab: ["coral", "sand", "foam", "kelp", "orange", "water", "peach", "sunflower"],
    sandcastle: ["sand", "orange", "sky", "navy", "foam", "kelp", "sunflower", "water"],
    fish: ["water", "sunflower", "foam", "navy", "coral", "kelp", "orange", "peach"],
    starfish: ["orange", "sand", "water", "foam", "coral", "sunflower", "peach", "kelp"],
    boat: ["coral", "foam", "sky", "water", "sunflower", "navy", "sand", "orange"],
    shell: ["peach", "orange", "sand", "foam", "sunflower", "water", "coral", "sky"],
    bucket: ["coral", "sand", "foam", "navy", "sky", "orange", "sunflower", "water"]
  };

  // 14 zones. Counts by difficulty are identical for every picture.
  // easy 4+3+2+1=10, medium 5+4+3+3+3+2=20, hard 8+7+6+5+5+4+3+2=40
  var ZONE_COUNTS = [
    { color: 1, easy: 1, medium: 2, hard: 3 },
    { color: 1, easy: 1, medium: 1, hard: 2 },
    { color: 1, easy: 1, medium: 1, hard: 2 },
    { color: 1, easy: 1, medium: 1, hard: 1 },
    { color: 2, easy: 1, medium: 2, hard: 3 },
    { color: 2, easy: 1, medium: 1, hard: 2 },
    { color: 2, easy: 1, medium: 1, hard: 2 },
    { color: 3, easy: 1, medium: 2, hard: 3 },
    { color: 3, easy: 1, medium: 1, hard: 3 },
    { color: 4, easy: 1, medium: 3, hard: 5 },
    { color: 5, easy: 0, medium: 3, hard: 5 },
    { color: 6, easy: 0, medium: 2, hard: 4 },
    { color: 7, easy: 0, medium: 0, hard: 3 },
    { color: 8, easy: 0, medium: 0, hard: 2 }
  ];

  // [x, y, w, h] in viewBox 0 0 100 100. Order matches ZONE_COUNTS.
  var BOXES = {
    sun: [
      [38, 36, 24, 24], [44, 8, 12, 26], [10, 42, 26, 14], [44, 64, 12, 26],
      [64, 16, 18, 16], [66, 42, 24, 14], [16, 64, 20, 16], [2, 2, 30, 22],
      [68, 2, 30, 20], [4, 72, 24, 14], [2, 86, 96, 12], [28, 78, 48, 10],
      [42, 48, 16, 8], [50, 40, 10, 8]
    ],
    crab: [
      [30, 38, 40, 24], [6, 24, 24, 18], [70, 24, 24, 18], [36, 30, 28, 14],
      [2, 78, 36, 18], [38, 82, 24, 14], [64, 78, 34, 18], [8, 68, 28, 12],
      [64, 68, 28, 12], [4, 4, 28, 22], [36, 4, 28, 16], [2, 2, 96, 14],
      [40, 44, 12, 8], [44, 10, 12, 10]
    ],
    sandcastle: [
      [30, 42, 40, 28], [34, 22, 14, 20], [52, 22, 14, 20], [40, 8, 20, 16],
      [8, 70, 22, 16], [70, 70, 22, 16], [38, 72, 24, 14], [2, 2, 32, 24],
      [66, 2, 32, 24], [42, 48, 16, 14], [2, 86, 96, 12], [20, 80, 60, 8],
      [4, 50, 16, 16], [80, 50, 16, 16]
    ],
    fish: [
      [22, 36, 40, 26], [62, 32, 22, 16], [62, 50, 22, 16], [18, 42, 14, 14],
      [70, 28, 22, 44], [8, 38, 12, 20], [40, 28, 16, 10], [2, 2, 40, 22],
      [58, 2, 40, 20], [8, 70, 30, 16], [2, 84, 96, 14], [30, 72, 50, 12],
      [36, 40, 10, 8], [48, 48, 10, 8]
    ],
    starfish: [
      [36, 36, 28, 28], [40, 8, 20, 26], [66, 28, 24, 22], [40, 66, 20, 26],
      [10, 28, 24, 22], [8, 66, 22, 18], [70, 66, 22, 18], [2, 2, 30, 20],
      [68, 2, 30, 20], [36, 44, 12, 12], [2, 84, 96, 14], [20, 78, 60, 10],
      [42, 40, 8, 8], [50, 48, 8, 8]
    ],
    boat: [
      [18, 50, 64, 22], [38, 16, 8, 36], [42, 18, 28, 24], [22, 58, 20, 12],
      [54, 10, 16, 16], [36, 12, 10, 12], [8, 70, 24, 14], [2, 2, 40, 22],
      [58, 2, 40, 20], [70, 50, 22, 16], [2, 78, 96, 10], [2, 86, 96, 12],
      [26, 62, 16, 8], [48, 62, 16, 8]
    ],
    shell: [
      [30, 28, 40, 44], [38, 16, 24, 16], [22, 40, 16, 24], [62, 40, 16, 24],
      [18, 68, 28, 16], [54, 68, 28, 16], [36, 72, 28, 14], [2, 78, 40, 18],
      [58, 78, 40, 18], [40, 48, 20, 16], [36, 8, 28, 12], [2, 86, 96, 12],
      [34, 36, 12, 10], [2, 2, 28, 20]
    ],
    bucket: [
      [30, 34, 40, 36], [34, 14, 32, 16], [36, 8, 28, 10], [38, 50, 24, 16],
      [2, 78, 40, 18], [58, 78, 40, 18], [36, 72, 28, 12], [2, 2, 36, 24],
      [62, 2, 36, 24], [42, 40, 16, 12], [8, 28, 16, 16], [76, 28, 16, 16],
      [2, 86, 96, 12], [30, 86, 40, 10]
    ]
  };

  function normalizeDifficulty(value) {
    if (value === "easy" || value === "hard" || value === "medium") return value;
    return "medium";
  }

  function grid(difficulty) {
    var d = normalizeDifficulty(difficulty);
    if (d === "easy") return { cells: 10, colors: 4 };
    if (d === "hard") return { cells: 40, colors: 8 };
    return { cells: 20, colors: 6 };
  }

  function pickIndex(n, random) {
    if (n <= 0) return 0;
    var i = Math.floor(random() * n);
    if (i < 0) return 0;
    if (i >= n) return n - 1;
    return i;
  }

  function clampPicture(index) {
    if (typeof index !== "number" || index !== index) return 0;
    var i = Math.floor(index);
    if (i < 0) return 0;
    if (i >= PICTURE_COUNT) return PICTURE_COUNT - 1;
    return i;
  }

  function palette(pictureIndex, difficulty) {
    var id = PICTURES[clampPicture(pictureIndex)];
    return PALETTES[id].slice(0, grid(difficulty).colors);
  }

  function colorName(pictureIndex, colorNumber) {
    if (colorNumber < 1 || colorNumber > 8 || colorNumber !== Math.floor(colorNumber)) return null;
    return PALETTES[PICTURES[clampPicture(pictureIndex)]][colorNumber - 1] || null;
  }

  function hex(name) {
    return COLOR_HEX[name] || "#fff8ee";
  }

  function roundedRect(x, y, w, h, r) {
    if (w < 0.5) w = 0.5;
    if (h < 0.5) h = 0.5;
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    return (
      "M" + (x + r) + " " + y +
      "H" + (x + w - r) +
      "Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + r) +
      "V" + (y + h - r) +
      "Q" + (x + w) + " " + (y + h) + " " + (x + w - r) + " " + (y + h) +
      "H" + (x + r) +
      "Q" + x + " " + (y + h) + " " + x + " " + (y + h - r) +
      "V" + (y + r) +
      "Q" + x + " " + y + " " + (x + r) + " " + y +
      "Z"
    );
  }

  function packBox(x, y, w, h, n) {
    var cols = Math.ceil(Math.sqrt(n));
    var rows = Math.ceil(n / cols);
    var cw = w / cols;
    var rh = h / rows;
    var pad = Math.min(cw, rh) * 0.08;
    var out = [];
    var i;
    for (i = 0; i < n; i++) {
      var c = i % cols;
      var r = Math.floor(i / cols);
      out.push(
        roundedRect(
          x + c * cw + pad,
          y + r * rh + pad,
          cw - pad * 2,
          rh - pad * 2,
          Math.min(cw, rh) * 0.22
        )
      );
    }
    return out;
  }

  function layout(pictureIndex, difficulty) {
    var d = normalizeDifficulty(difficulty);
    var boxes = BOXES[PICTURES[clampPicture(pictureIndex)]];
    var cells = [];
    var z;
    for (z = 0; z < ZONE_COUNTS.length; z++) {
      var n = ZONE_COUNTS[z][d];
      if (!n) continue;
      var box = boxes[z];
      var paths = packBox(box[0], box[1], box[2], box[3], n);
      var p;
      for (p = 0; p < paths.length; p++) {
        cells.push({
          id: cells.length,
          color: ZONE_COUNTS[z].color,
          d: paths[p]
        });
      }
    }
    return cells;
  }

  function cloneSession(s) {
    var filled = {};
    Object.keys(s.filled).forEach(function (k) {
      filled[k] = s.filled[k];
    });
    return {
      difficulty: s.difficulty,
      pictureIndex: s.pictureIndex,
      selectedColor: s.selectedColor,
      cells: s.cells.map(function (c) {
        return { id: c.id, color: c.color };
      }),
      filled: filled,
      complete: s.complete
    };
  }

  function createSession(opts) {
    opts = opts || {};
    var difficulty = normalizeDifficulty(opts.difficulty);
    var random = typeof opts.random === "function" ? opts.random : Math.random;
    var pictureIndex = pickIndex(PICTURE_COUNT, random);
    var cells = layout(pictureIndex, difficulty).map(function (c) {
      return { id: c.id, color: c.color };
    });
    return {
      difficulty: difficulty,
      pictureIndex: pictureIndex,
      selectedColor: null,
      cells: cells,
      filled: {},
      complete: false
    };
  }

  function pictureId(session) {
    return PICTURES[clampPicture(session.pictureIndex)];
  }

  function pictureSrc(session) {
    return "assets/paint/" + pictureId(session) + "-outline.png";
  }

  function selectColor(session, n) {
    var next = cloneSession(session);
    var k = grid(session.difficulty).colors;
    if (typeof n !== "number" || n !== Math.floor(n) || n < 1 || n > k) {
      return { ok: false, session: next };
    }
    next.selectedColor = n;
    return { ok: true, session: next };
  }

  function fill(session, cellId) {
    var next = cloneSession(session);
    if (next.selectedColor == null) return { ok: false, session: next };
    var cell = null;
    var i;
    for (i = 0; i < next.cells.length; i++) {
      if (next.cells[i].id === cellId) {
        cell = next.cells[i];
        break;
      }
    }
    if (!cell) return { ok: false, session: next };
    if (next.filled[cellId]) return { ok: false, session: next };
    if (cell.color !== next.selectedColor) return { ok: false, session: next };
    next.filled[cellId] = true;
    var done = true;
    for (i = 0; i < next.cells.length; i++) {
      if (!next.filled[next.cells[i].id]) done = false;
    }
    next.complete = done;
    return { ok: true, session: next };
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  var Paint = {
    PICTURE_COUNT: PICTURE_COUNT,
    PICTURES: PICTURES,
    COLORS: COLORS,
    grid: grid,
    palette: palette,
    colorName: colorName,
    hex: hex,
    layout: layout,
    pictureId: pictureId,
    pictureSrc: pictureSrc,
    createSession: createSession,
    selectColor: selectColor,
    fill: fill,
    playAgain: playAgain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Paint;
  } else {
    root.Paint = Paint;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
```

Nudge a box if two Hard blobs look like slivers, but do not change `ZONE_COUNTS`.

- [ ] **Step 4: Run tests**

```bash
node test/paint.test.js && node test/game.test.js && node test/path.test.js && node test/puzzle.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add test/paint.test.js paint.js
git commit -m "Add Paint by Number rules engine and tests."
```

---

### Task 2: Coloring-book outlines

**Files:**
- Create: `assets/paint/sun-outline.png`
- Create: `assets/paint/crab-outline.png`
- Create: `assets/paint/sandcastle-outline.png`
- Create: `assets/paint/fish-outline.png`
- Create: `assets/paint/starfish-outline.png`
- Create: `assets/paint/boat-outline.png`
- Create: `assets/paint/shell-outline.png`
- Create: `assets/paint/bucket-outline.png`

**Interfaces:**
- Consumes: `Paint.PICTURES` from Task 1; style references `assets/kid.png`, `assets/puzzles/01-beach.jpg`, plus the matching prop PNG when it exists (`assets/sun.png`, `assets/crab.png`, `assets/sandcastle-turret-sand.png`, `assets/shell-scallop-peach.png`, `assets/bucket.png`).
- Produces: eight square PNGs at `assets/paint/{id}-outline.png`.

Load the `imagine` and `game-asset-core` skills before generating. Use `image_edit` with those references (not a fresh `image_gen` that ignores Beach Day). `aspect_ratio`: `1:1`.

- [ ] **Step 1: Generate each outline**

For each id, one `image_edit` call. Keep the subject in the same place as that picture’s `BOXES` (sun face center, crab body center, castle lower-middle, fish facing left, starfish center, boat hull lower half, shell center, bucket center). Prompt pattern (swap the subject clause only):

> A square children's coloring-book page of a big simple [SUBJECT] in the same cartoon crayon style as the reference drawings: thick navy outlines, empty unfilled regions on cream paper, chunky field-trip shapes, no numbers, no letters, no pre-painted fills, no photoreal shading. Centered subject, lots of empty sky around it, 1:1.

Subjects: smiling sun with short rays; round crab with two claws; three-tower sandcastle; side-view fish with one tail; five-point starfish; sailboat with one sail; scallop shell; beach bucket with a handle.

- [ ] **Step 2: Verify each file**

Read every PNG. Fail and regenerate that one if any of these is true: numerals or words, photoreal, missing outline, not square-ish, style that does not match the kid/puzzle crayon look, or a different character than the subject.

- [ ] **Step 3: Commit**

```bash
git add assets/paint
git commit -m "Add Paint by Number coloring-book outlines."
```

---

### Task 3: Menu card and play screen

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: every `Paint.*` method from Task 1 and the eight outline PNGs from Task 2.
- Produces: fourth exhibit `data-game="paint"`; `#paint-screen` that can complete a picture.

- [ ] **Step 1: Markup**

In `index.html`, add the exhibit **after Crab Path** (`data-game="paint"`, name **Paint by Number**, blurb **Color the picture**). Art: `assets/paint/sun-outline.png` cropped in a square thumb plus three small numbered circles (1 sunflower, 2 orange, 3 sky) — foam card like the others, not a generic icon font.

Add `#paint-screen` after `#puzzle-screen`, same Games + house-icon back button as Path/Puzzle:

```html
<section id="paint-screen" class="screen path-screen paint-screen hidden" hidden>
  <div class="sky">
    <button type="button" class="back-btn" data-back>
      <span class="btn-icon" aria-hidden="true">
        <img src="assets/icon-house.png" alt="" />
      </span>
      Games
    </button>
    <img class="sun small" src="assets/sun.png" alt="" aria-hidden="true" />
  </div>
  <div class="paint-stage">
    <div class="paint-page" id="paint-page">
      <img id="paint-outline" class="paint-outline" alt="" draggable="false" />
      <svg id="paint-blobs" class="paint-blobs" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-label="coloring page"></svg>
    </div>
    <div class="path-kid paint-kid" data-kid aria-hidden="true"></div>
  </div>
  <div id="paint-pots" class="paint-pots" aria-label="paints"></div>
</section>
```

Add `<script src="paint.js"></script>` before `app.js`.

- [ ] **Step 2: Wire `app.js`**

Add:

```js
var paintScreen = document.getElementById("paint-screen");
var paintOutline = document.getElementById("paint-outline");
var paintBlobs = document.getElementById("paint-blobs");
var paintPots = document.getElementById("paint-pots");
var paintSession = null;
var MENU_GAMES = ["tidy", "puzzle", "path", "paint"];
var CRAB_X = { tidy: "-240px", puzzle: "-80px", path: "80px", paint: "240px" };
```

Hide `paintScreen` from `goMenu`, `openGame`, `startTidy`, `startPath`, `startPuzzle`. In `hideCheer`, also `cheerEl.classList.remove("is-paint")` and `paintScreen.classList.remove("is-won")`.

`openGame` title:

```js
difficultyTitle.textContent =
  game === "path"
    ? "Crab Path"
    : game === "puzzle"
      ? "Beach Puzzle"
      : game === "paint"
        ? "Paint by Number"
        : "Tide Pool Tidy";
```

Difficulty click: `else if (pendingGame === "paint") startPaint(btn.dataset.difficulty);`

Play again: `else if (activeGame === "paint") { paintSession = Paint.playAgain(paintSession); renderPaint(); }`

```js
function startPaint(difficulty) {
  activeGame = "paint";
  hide(menuScreen);
  hide(difficultyScreen);
  hide(playScreen);
  hide(pathScreen);
  hide(puzzleScreen);
  show(paintScreen);
  hideCheer();
  paintSession = Paint.createSession({ difficulty: difficulty });
  renderPaint();
}

function renderPaint() {
  var src = Paint.pictureSrc(paintSession);
  paintOutline.src = src;
  var layout = Paint.layout(paintSession.pictureIndex, paintSession.difficulty);
  paintBlobs.innerHTML = "";
  layout.forEach(function (cell) {
    var pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", cell.d);
    pathEl.setAttribute("data-cell", String(cell.id));
    pathEl.setAttribute("stroke", "#2a2438");
    pathEl.setAttribute("stroke-width", "1.4");
    pathEl.setAttribute("stroke-linejoin", "round");
    if (paintSession.filled[cell.id]) {
      pathEl.setAttribute("fill", Paint.hex(Paint.colorName(paintSession.pictureIndex, cell.color)));
      paintBlobs.appendChild(pathEl);
    } else {
      pathEl.setAttribute("fill", "rgba(255,248,238,0.35)");
      paintBlobs.appendChild(pathEl);
      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      var bb = pathEl.getBBox();
      label.setAttribute("x", String(bb.x + bb.width / 2));
      label.setAttribute("y", String(bb.y + bb.height / 2 + 1.2));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("font-family", "Nunito, sans-serif");
      label.setAttribute("font-weight", "800");
      label.setAttribute("font-size", paintSession.difficulty === "hard" ? "4" : "6");
      label.setAttribute("fill", "#2a2438");
      label.setAttribute("pointer-events", "none");
      label.textContent = String(cell.color);
      paintBlobs.appendChild(label);
    }
  });

  var pots = Paint.palette(paintSession.pictureIndex, paintSession.difficulty);
  paintPots.innerHTML = "";
  pots.forEach(function (name, i) {
    var n = i + 1;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "paint-pot";
    if (paintSession.selectedColor === n) btn.classList.add("is-on");
    btn.style.background = Paint.hex(name);
    btn.dataset.color = String(n);
    btn.setAttribute("aria-label", "color " + n);
    btn.textContent = String(n);
    paintPots.appendChild(btn);
  });
}

paintPots.addEventListener("click", function (event) {
  var btn = event.target.closest ? event.target.closest("[data-color]") : null;
  if (!btn || !paintSession) return;
  var result = Paint.selectColor(paintSession, Number(btn.dataset.color));
  if (!result.ok) return;
  paintSession = result.session;
  renderPaint();
});

paintBlobs.addEventListener("click", function (event) {
  var node = event.target.closest ? event.target.closest("[data-cell]") : event.target;
  if (!node || !node.getAttribute || !paintSession) return;
  var id = Number(node.getAttribute("data-cell"));
  if (id !== id) return;
  var result = Paint.fill(paintSession, id);
  if (!result.ok) {
    pulse(node, "wiggle");
    return;
  }
  paintSession = result.session;
  renderPaint();
  if (paintSession.complete) afterPaint();
});

function afterPaint() {
  paintScreen.classList.add("is-won");
  cheerEl.classList.add("is-paint");
  cheerWords.textContent = "What a picture!";
  show(cheerEl);
  celebrateKid();
  show(playAgainBtn);
  show(moreGamesBtn);
}
```

`getBBox` only works in the browser after the path is in the SVG — that is fine. Tests do not use the UI.

If `startPuzzle` / `startTidy` do not hide `paintScreen`, add `hide(paintScreen)` there.

- [ ] **Step 3: CSS**

Add after the puzzle-screen block in `styles.css`:

```css
.paint-screen {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.paint-stage {
  position: relative;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding: 0.6rem 0.6rem 0.2rem;
}

.paint-page {
  position: relative;
  width: min(72vw, 52vh, 420px);
  aspect-ratio: 1;
  justify-self: end;
  margin-right: 0.4rem;
  background: var(--foam);
  border: 5px solid var(--ink);
  border-radius: 1.1rem;
  overflow: hidden;
  box-shadow: 5px 5px 0 var(--ink);
}

.paint-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.paint-blobs {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.paint-blobs path {
  cursor: pointer;
}

.paint-blobs path.wiggle {
  animation: wiggle 0.4s ease;
}

.paint-kid {
  width: 6.4rem;
}

.paint-pots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.7rem 0.7rem 0.9rem;
  background: var(--water);
  border-top: 5px solid var(--ink);
}

.paint-pot {
  appearance: none;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  border: 4px solid var(--ink);
  font-family: Nunito, sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--ink);
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--ink);
}

.paint-pot.is-on {
  box-shadow: 0 0 0 4px var(--sunflower), 3px 3px 0 var(--ink);
}

.cheer.is-paint {
  background: transparent;
  justify-content: flex-end;
  gap: 0.55rem;
  padding: 0 1rem 0.9rem;
  pointer-events: none;
}

.cheer.is-paint .cheer-kid {
  width: 7.2rem;
}

.cheer.is-paint .cheer-words,
.cheer.is-paint .cheer-actions {
  pointer-events: auto;
}

.paint-screen.is-won .paint-kid {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .paint-blobs path.wiggle,
  .paint-pot {
    animation: none;
  }
}
```

Hard page must keep blobs tappable. If a Hard blob is under ~44px on a 360px-wide phone, enlarge `.paint-page` (target `min(92vw, 56vh, 460px)` on narrow screens) rather than shrinking pots.

- [ ] **Step 4: Verify**

```bash
node test/paint.test.js && node test/game.test.js && node test/path.test.js && node test/puzzle.test.js
```

In the browser: menu shows four cards; crab sits under Paint by Number; difficulty title is **Paint by Number**; Easy sun (or whatever deals) has 4 pots; tapping pot 1 then a `1` blob fills it; a `2` blob wiggles; last blob cheers **What a picture!**; Play again keeps difficulty; Games returns to the menu; Tidy, Puzzle, and Path still start and play. Check Easy and Hard, and a phone-width viewport.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js styles.css
git commit -m "Add Paint by Number menu card and play screen."
```

---

### Task 4: README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the shipped fourth game from Tasks 1–3.
- Produces: play instructions and the new test command.

- [ ] **Step 1: Update README**

Change the opening line from three games to four. After the Crab Path section add:

```md
### Paint by Number

Tap Paint by Number, then Easy, Medium, or Hard.

One of eight coloring-book pictures is waiting. Tap a numbered pot, then tap every blob with that number. Wrong number? It wiggles and stays empty. Easy is 10 blobs and 4 colors. Medium is 20 and 6. Hard is 40 and 8. No timer, no score.
```

Add `node test/paint.test.js` to the Tests list.

- [ ] **Step 2: Re-run tests**

```bash
node test/paint.test.js && node test/game.test.js && node test/path.test.js && node test/puzzle.test.js
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document Paint by Number."
```

---

## Spec coverage

| Spec | Task |
|------|------|
| Deal, palettes, layout counts, selectColor, fill, complete, playAgain | 1 |
| Exact Easy/Medium/Hard counts and unknown → medium | 1 |
| Generated square coloring-book outlines, no numerals | 2 |
| Menu card, difficulty title, pots, tap, wiggle, cheer, Play again | 3 |
| Four crab positions, hide/show with other games | 3 |
| README | 4 |
| No timer/score/reading; Tidy/Puzzle/Path unchanged | 1–4 |
