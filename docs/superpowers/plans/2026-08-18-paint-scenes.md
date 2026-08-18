# Paint by Number scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flood-fill outline maps with eight authored full-page scenes so every blob including sky, water, and sand is a numbered paint, and the finished square is a real picture.

**Architecture:** Each picture is a closed-path SVG (`assets/paint/{id}-scene.svg`) that tiles `0 0 100 100`. `scripts/build-paint-layouts.py` validates those SVGs and emits `paint-layouts.js`. `paint.js` keeps fill rules and updates palettes; `Paint.pictureSrc` is removed. `app.js` draws only the scene SVG (no multiply outline PNG).

**Tech Stack:** HTML, CSS, vanilla JS, Python 3 stdlib. Tests: `node test/paint.test.js`. No new libraries.

## Global Constraints

- No timer, no losing score, no required reading.
- Pick a pot, then tap blobs. Wrong pot / no pot / already filled: wiggle, stay put. No peel. No undo. No pinch-zoom.
- One of 8 pictures at random. No Easy / Medium / Hard.
- Cheer: `What a picture!`
- About 18–20 blobs (build allows 16–22) and 7–8 pots `1..K` with no gaps.
- White / cream / foam is never a pot. Empty blobs are white because they are unfilled.
- Every scene uses sky, water, and sand. Pot 1 is the subject’s main fill.
- Paths tile the square: no holes > 2% of a 100×100 sample, no sliver < 1.2% of the page, no axis-aligned 4-corner rectangle cells.
- Palette order never shuffles. Sun stays sunny.
- Tidy, Puzzle, and Path rules do not change.
- `random` is `[0, 1)`; omitted → `Math.random`.
- No GitHub k-means pipeline. No live image generation. No new libraries.

## File map

| File | Responsibility |
|------|----------------|
| `test/paint.test.js` | Palette, layout-quality, and fill tests |
| `paint.js` | Palettes, layout read, fill; no `pictureSrc` |
| `assets/paint/{id}-scene.svg` | Authored tiled scenes (source of truth) |
| `scripts/build-paint-layouts.py` | Validate SVGs, emit `paint-layouts.js` + menu preview |
| `paint-layouts.js` | Generated `{ color, d, lx, ly }` plus optional ink paths |
| `app.js` | Draw scene SVG only; drop outline `<img>` |
| `index.html` | Drop `#paint-outline` |
| `styles.css` | Drop multiply overlay; paper texture on the page |
| `README.md` | One line: the picture is a full scene |

---

### Task 1: Palettes and API

**Files:**
- Modify: `test/paint.test.js`
- Modify: `paint.js`

**Interfaces:**
- Consumes: existing `Paint.layout` / `selectColor` / `fill`.
- Produces: palettes exactly as the spec table; `Paint.pictureSrc` removed; `Paint.colorName` never returns `foam` for a pot on any picture.

- [ ] **Step 1: Write the failing palette / API tests**

In `test/paint.test.js`, replace the `pictureIndex` test and the `sun palette` test, and add the scene-palette test. Keep fill tests as they are.

Replace:

```js
test("pictureIndex is 0..7 and pictureId 0 is sun", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.ok(s.pictureIndex >= 0 && s.pictureIndex <= 7);
  assert.strictEqual(Math.floor(s.pictureIndex), s.pictureIndex);
  assert.strictEqual(Paint.pictureId(s), "sun");
  assert.ok(Paint.pictureSrc(s).indexOf("sun-outline.png") !== -1);
});

test("sun palette and colorName", function () {
  var pal = Paint.palette(0);
  assert.deepStrictEqual(pal, ["sunflower", "orange", "sky", "kelp", "sand", "water", "coral", "peach"]);
  assert.strictEqual(Paint.palette(1)[0], "coral");
  assert.strictEqual(Paint.colorName(0, 1), "sunflower");
  assert.strictEqual(Paint.colorName(0, 9), null);
  assert.strictEqual(Paint.hex("sunflower"), "#ffe14a");
});
```

with:

```js
test("pictureIndex is 0..7 and pictureId 0 is sun", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.ok(s.pictureIndex >= 0 && s.pictureIndex <= 7);
  assert.strictEqual(Math.floor(s.pictureIndex), s.pictureIndex);
  assert.strictEqual(Paint.pictureId(s), "sun");
  assert.strictEqual(typeof Paint.pictureSrc, "undefined");
});

test("sun palette and colorName", function () {
  var pal = Paint.palette(0);
  assert.deepStrictEqual(pal, ["sunflower", "orange", "sky", "sand", "water", "kelp", "coral", "peach"]);
  assert.strictEqual(Paint.palette(1)[0], "coral");
  assert.strictEqual(Paint.colorName(0, 1), "sunflower");
  assert.strictEqual(Paint.colorName(0, 9), null);
  assert.strictEqual(Paint.hex("sunflower"), "#ffe14a");
});

test("every palette has sky water sand, no foam, pot 1 is subject", function () {
  var expected = {
    sun: ["sunflower", "orange", "sky", "sand", "water", "kelp", "coral", "peach"],
    crab: ["coral", "sand", "sky", "water", "orange", "kelp", "peach", "sunflower"],
    sandcastle: ["sand", "orange", "sky", "navy", "coral", "water", "sunflower", "kelp"],
    fish: ["sunflower", "water", "sky", "navy", "coral", "kelp", "orange", "sand"],
    starfish: ["orange", "sand", "water", "sky", "coral", "sunflower", "peach", "kelp"],
    boat: ["coral", "peach", "sky", "water", "sunflower", "navy", "sand", "orange"],
    shell: ["peach", "orange", "sand", "kelp", "sunflower", "water", "coral", "sky"],
    bucket: ["coral", "sand", "peach", "navy", "sky", "orange", "sunflower", "water"]
  };
  var subjectOne = {
    sun: "sunflower",
    crab: "coral",
    sandcastle: "sand",
    fish: "sunflower",
    starfish: "orange",
    boat: "coral",
    shell: "peach",
    bucket: "coral"
  };
  Paint.PICTURES.forEach(function (id, index) {
    var pal = Paint.palette(index);
    assert.deepStrictEqual(pal, expected[id]);
    assert.strictEqual(pal[0], subjectOne[id]);
    assert.ok(pal.indexOf("sky") !== -1);
    assert.ok(pal.indexOf("water") !== -1);
    assert.ok(pal.indexOf("sand") !== -1);
    assert.ok(pal.indexOf("foam") === -1);
    assert.notStrictEqual(Paint.colorName(index, 1), "foam");
  });
});
```

Do **not** yet assert 16–22 cells. Current maps would fail that; it comes in Task 4.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node test/paint.test.js`

Expected: FAIL — `pictureSrc` still exists; sun palette is still `sunflower, orange, sky, kelp, sand, water, coral, peach`; fish palette still starts with `water`.

- [ ] **Step 3: Update palettes and remove `pictureSrc`**

In `paint.js` set:

```js
var PALETTES = {
  sun: ["sunflower", "orange", "sky", "sand", "water", "kelp", "coral", "peach"],
  crab: ["coral", "sand", "sky", "water", "orange", "kelp", "peach", "sunflower"],
  sandcastle: ["sand", "orange", "sky", "navy", "coral", "water", "sunflower", "kelp"],
  fish: ["sunflower", "water", "sky", "navy", "coral", "kelp", "orange", "sand"],
  starfish: ["orange", "sand", "water", "sky", "coral", "sunflower", "peach", "kelp"],
  boat: ["coral", "peach", "sky", "water", "sunflower", "navy", "sand", "orange"],
  shell: ["peach", "orange", "sand", "kelp", "sunflower", "water", "coral", "sky"],
  bucket: ["coral", "sand", "peach", "navy", "sky", "orange", "sunflower", "water"]
};
```

Delete `pictureSrc` (the function and the `Paint.pictureSrc` export). Leave `pictureId`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test/paint.test.js`

Expected: all PASS. Fill tests still use the old flood-fill layouts; that is OK.

- [ ] **Step 5: Commit**

```bash
git add test/paint.test.js paint.js
git commit -m "Point paint palettes at full-page scenes and drop pictureSrc."
```

---

### Task 2: Scene build script

**Files:**
- Modify: `scripts/build-paint-layouts.py` (replace the flood-fill pipeline)
- Create: `assets/paint/_fixture-ok.svg` only if you add a `--selftest` that writes and deletes a temp file; otherwise do not leave a fixture in `assets/paint/`. Prefer `--selftest` using `tempfile`.

**Interfaces:**
- Consumes: `assets/paint/{id}-scene.svg` with closed `<path data-role="…" data-color="N" d="…"/>`. Paths without `data-color` are ink-only (smile, eyes) and go to `PAINT_INK`.
- Produces: `python3 scripts/build-paint-layouts.py` reads the eight ids, validates, writes `paint-layouts.js` as `PAINT_FACETS` plus `PAINT_INK`, and writes `assets/paint/menu-preview.svg` from the sun cells. Exit 1 and do not write if any picture fails.

- [ ] **Step 1: Replace the builder with SVG parse + validate**

Rewrite `scripts/build-paint-layouts.py` so it **does not** load PNGs, downsample, flood-fill, `touches_edge`-skip, or `enrich_sparse` / `split_two`.

Keep `PICTURES`, `OUT_JS`, `MENU_SVG`, `label_point`, `rdp` / `path_to_d` only if you still convert polygons to quadratic `d`. Prefer emitting the authored `d` unchanged (already in viewBox `0 0 100 100`).

Required behavior:

```
parse_scene(svg_text) -> { "cells": [{role, color, d}], "ink": [d, ...] }
raster_path(d, size=100) -> set of pixel indices inside the path
validate(name, cells, palette_names) -> raises SystemExit on:
  len(cells) not in 16..22
  used colors not exactly 1..K with K in 7..8
  any color maps to foam / #fff / #fff8ee  (palette is hardcoded in the script, same table as paint.js)
  used names miss sky, water, or sand
  any open path (no trailing Z)
  any axis-aligned 4-corner rectangle (reuse is_axis_box on flattened points)
  any cell whose raster count < 1.2% of size*size
  uncovered pixels in the union raster > 2% of size*size
label each cell with label_point on its raster
write_js(all_layouts, all_ink)
write_menu_preview(sun cells)
```

Hard-code the same palettes as Task 1 inside the Python file (`PALETTES["sun"]` etc). Do not import JS.

Parse `d` with a small tokenizer for `M L H V Q C Z` (absolute). For `Q`/`C`, sample 6 points along the curve so raster and `is_axis_box` see a polyline. `H`/`V` become line points.

Raster: 100×100, even-odd fill of the flattened ring (scanline or winding). Union of cell rasters is the coverage mask.

`write_js` shape (note `PAINT_INK`):

```javascript
(function (root) {
  "use strict";
  var PAINT_FACETS = {
    "sun": [
      { color: 1, d: "M…Z", lx: 50, ly: 40 },
    ],
  };
  var PAINT_INK = {
    "sun": ["M…Z"],
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { FACETS: PAINT_FACETS, INK: PAINT_INK };
  } else {
    root.PAINT_FACETS = PAINT_FACETS;
    root.PAINT_INK = PAINT_INK;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
```

`paint.js` still reads `PAINT_FACETS` or `require("./paint-layouts.js")`. After this export change, `require` returns `{ FACETS, INK }`. Update `paint.js` `FACETS` load to:

```js
var LAYOUT_MOD =
  typeof PAINT_FACETS !== "undefined"
    ? { FACETS: PAINT_FACETS, INK: typeof PAINT_INK !== "undefined" ? PAINT_INK : {} }
    : typeof require === "function"
      ? require("./paint-layouts.js")
      : { FACETS: {}, INK: {} };
if (LAYOUT_MOD.FACETS && !LAYOUT_MOD.sun) {
  var FACETS = LAYOUT_MOD.FACETS;
} else {
  var FACETS = LAYOUT_MOD;
}
```

Simpler and required: keep `module.exports = PAINT_FACETS` as today, and also `module.exports.INK = PAINT_INK`. In Node, `require("./paint-layouts.js")` stays the facets object; `require("./paint-layouts.js").INK` is ink. In the browser, set both `root.PAINT_FACETS` and `root.PAINT_INK`.

```javascript
  if (typeof module !== "undefined" && module.exports) {
    module.exports = PAINT_FACETS;
    module.exports.INK = PAINT_INK;
  } else {
    root.PAINT_FACETS = PAINT_FACETS;
    root.PAINT_INK = PAINT_INK;
  }
```

`paint.js` does not need to change for ink. `app.js` in Task 5 reads `PAINT_INK`.

`--selftest`: if `sys.argv` contains `--selftest`, write a temp SVG with 18 simple **non-rectangular** closed blobs that tile a square, run `validate`, print `selftest ok`, exit 0. Do not write `paint-layouts.js` during `--selftest`. Include a second temp SVG that is an axis-aligned rectangle cell and assert `validate` raises.

- [ ] **Step 2: Run the self-test**

Run: `python3 scripts/build-paint-layouts.py --selftest`

Expected: `selftest ok` and exit 0. Do **not** run the full build yet — the eight scene SVGs do not exist, and the old outlines must not be flood-filled.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-paint-layouts.py paint.js
git commit -m "Build paint layouts from authored scene SVGs."
```

Only add `paint.js` if you changed the layout-module loader. If you kept `PAINT_FACETS` as the export, do not touch `paint.js` in this commit.

---

### Task 3: Author the eight scene SVGs

**Files:**
- Create: `assets/paint/sun-scene.svg`
- Create: `assets/paint/crab-scene.svg`
- Create: `assets/paint/sandcastle-scene.svg`
- Create: `assets/paint/fish-scene.svg`
- Create: `assets/paint/starfish-scene.svg`
- Create: `assets/paint/boat-scene.svg`
- Create: `assets/paint/shell-scene.svg`
- Create: `assets/paint/bucket-scene.svg`

**Interfaces:**
- Consumes: palettes from Task 1; builder rules from Task 2.
- Produces: eight SVGs, viewBox `0 0 100 100`, 16–22 closed `<path data-role data-color d>` each, tiled, plus optional ink paths with no `data-color`.

**Tiling method (use this, do not flood-fill, do not Voronoi-split):**

Reserve a **subject box** and a **landscape frame** that share edges. Every shared edge uses the same vertices. Bulge every edge with one midpoint so no cell is an axis-aligned 4-corner rectangle.

```
y = 0  +------------------------------+
       | skyL      skyC      skyR     |
y=36   +----------+--------+----------+
       | waterL   | SUBJECT | waterR  |
       |          |  22,28  |         |
       |          |  to     |         |
       |          |  78,78  |         |
y=78   +----------+--------+----------+
       | sandL     sandC     sandR    |
y=100  +------------------------------+
```

Wavy horizontals (use these x-stops on every scene except sun, which uses the same idea with a thinner sand/water band):

```
X = [0, 22, 50, 78, 100]
sky/water Y = [36, 34, 37, 35, 36]
water/sand Y = [78, 80, 76, 79, 78]
```

`skyL` = (0,0) → (22,0) → down the x=22 line to the sky/water wave at x=22 → along the wave to x=0 → up.
Same pattern for the other frame cells. `waterL` / `waterR` go from the sky/water wave to the water/sand wave. Sand cells go from that wave to y=100.

Add two **wave** cells along the sky/water line (closed bumps that sit half in skyC and half in water, **instead of** a straight skyC/water contact there). SkyC and the water cells must notch around those wave polygons so they still tile.

Add one **peach foam** cell only on starfish and shell (pot for peach). Other scenes use peach on a dune or sail, not as white foam.

**Subject box (22,28)–(78,78)** is split into the parts below. Parts tile the box (shared inner edges). Pot numbers are `data-color`.

| Id | Subject parts (role → color) | Frame extras so total is 16–22 and pots are 1..K |
|----|------------------------------|--------------------------------------------------|
| sun | face → 1; 6 rays alternating 1 and 2; 2 sky wedges → 3 | skyL/C/R → 3; waterL/R → 5; sandL/C/R → 4; kelp clump in sandC → 6; coral flower in sandL → 7; peach dune in sandR → 8. Sun box is higher: (18,8)–(82,72), water/sand bands thinner (water 72–84, sand 84–100). Eyes + smile = ink paths. |
| crab | body → 1; clawL → 1; clawR → 5; leg×4 → 1 | sky×3 → 3; water×2 → 4; wave×2 → 4; sand×3 → 2; peach pebble → 7. Eyes ink. |
| sandcastle | keep → 1; towerL → 2; towerR → 2; doorL → 4; doorR → 4; dripL → 1; dripR → 5 | sky×3 → 3; water×2 → 6; sand×3 → 1. |
| fish | head → 1; body → 1; belly → 5; dorsal → 6; pectoral → 7; tailU → 4; tailD → 4 | sky×3 → 3; water×2 → 2; wave×3 → 2; sand×2 → 8. Eye ink. |
| starfish | center → 1; 5 arms → 1 | sky×3 → 4; water×2 → 3; foam → 7; sand×3 → 2; kelp → 8. Face ink. |
| boat | hull → 1; sailL → 5; sailR → 2; deck → 6 | sky×3 → 3; water×2 → 4; wave×3 → 4; sand×2 → 7. Mast is a tap-wide vertical blob → 6, or ink if it would be < 1.2%. |
| shell | hinge → 1; 6 ribs → 1,2,4,5,1,2 | sky×2 → 8; water×2 → 6; foam → 1 (peach is pot 1 — foam on this page is peach, not white); sand×3 → 3. |
| bucket | rim → 1; inside sand → 2; bandU → 1; bandM → 3; bandD → 1; handle → 4 | sky×3 → 5; water×2 → 8; ripple×2 → 8; sand×2 → 2. Rivets ink. |

Sun must still use pots 1–8 with no gaps (kelp 6, coral 7, peach 8 live in the sand band).

Ink paths: `<path d="…" fill="none"/>` with **no** `data-color`. Builder stores them in `PAINT_INK`.

Each file starts:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
```

- [ ] **Step 1: Write all eight SVGs using the frame + subject box**

Author the paths as `M … L … Z` (or `Q`) in viewBox units. Shared edges must match. No cell may be a 4-corner axis-aligned rectangle — put a bulge midpoint on every long edge.

Do not use the old outline PNGs as a flood-fill source.

- [ ] **Step 2: Build layouts**

Run: `python3 scripts/build-paint-layouts.py`

Expected: prints `  {id}  cells=N` with N in 16–22 for each id, then `wrote paint-layouts.js` and `wrote assets/paint/menu-preview.svg`. Exit 0. If a picture fails, fix that SVG (usually a hole at a shared edge, a sliver, or a missing pot) and rerun. Do not loosen the validator.

- [ ] **Step 3: Commit**

```bash
git add assets/paint/*-scene.svg assets/paint/menu-preview.svg paint-layouts.js
git commit -m "Author full-page paint-by-number scene SVGs."
```

---

### Task 4: Layout quality tests

**Files:**
- Modify: `test/paint.test.js`
- Modify: `paint-layouts.js` only if a test finds a real hole or sliver — fix the SVG and rebuild, do not hand-edit `paint-layouts.js`.

**Interfaces:**
- Consumes: `Paint.layout`, `Paint.colorName`, `Paint.palette` from Tasks 1–3.
- Produces: tests that match the spec Testing section.

- [ ] **Step 1: Write the failing (or already-passing) layout tests**

Add to `test/paint.test.js`:

```js
function usedColors(layout) {
  var set = {};
  layout.forEach(function (c) {
    set[c.color] = true;
  });
  return Object.keys(set)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    });
}

test("every picture is a 16-22 cell scene with pots 1..K and no foam", function () {
  Paint.PICTURES.forEach(function (id, index) {
    var layout = Paint.layout(index);
    assert.ok(layout.length >= 16 && layout.length <= 22, id + " cells=" + layout.length);
    var used = usedColors(layout);
    var k = used[used.length - 1];
    assert.ok(k >= 7 && k <= 8, id + " K=" + k);
    used.forEach(function (n, i) {
      assert.strictEqual(n, i + 1, id + " gap at " + n);
    });
    var names = used.map(function (n) {
      return Paint.colorName(index, n);
    });
    assert.ok(names.indexOf("sky") !== -1, id + " missing sky");
    assert.ok(names.indexOf("water") !== -1, id + " missing water");
    assert.ok(names.indexOf("sand") !== -1, id + " missing sand");
    names.forEach(function (name) {
      assert.notStrictEqual(name, "foam");
      assert.notStrictEqual(name, null);
    });
    layout.forEach(function (cell) {
      assert.ok(cell.d && cell.d.charAt(0) === "M");
      assert.ok(/Z\s*$/.test(cell.d));
      assert.strictEqual(isAxisAlignedRectangle(cell.d), false, id + " cell " + cell.id + " is a rectangle");
      assert.ok(cell.lx >= 0 && cell.lx <= 100);
      assert.ok(cell.ly >= 0 && cell.ly <= 100);
    });
  });
});
```

Tighten the existing `"every picture layout has organic cells"` test if it still says `>= 3` — leave it; the new test is the gate.

- [ ] **Step 2: Run tests**

Run: `node test/paint.test.js`

Expected: PASS. If FAIL on counts, pots, rectangles, or foam, fix the **SVG** and rerun `python3 scripts/build-paint-layouts.py`, then rerun the test. Do not patch `paint-layouts.js` by hand.

- [ ] **Step 3: Commit**

```bash
git add test/paint.test.js paint-layouts.js assets/paint/*-scene.svg
git commit -m "Require full-page paint layouts in tests."
```

---

### Task 5: Play screen — SVG is the page

**Files:**
- Modify: `index.html` (paint-page markup)
- Modify: `app.js` (`paintOutline`, `renderPaint`)
- Modify: `styles.css` (`.paint-outline`, `.paint-page`, `.paint-blobs`)
- Delete: `assets/paint/sun-outline.png`, `crab-outline.png`, `sandcastle-outline.png`, `fish-outline.png`, `starfish-outline.png`, `boat-outline.png`, `shell-outline.png`, `bucket-outline.png`
- Modify: `README.md`

**Interfaces:**
- Consumes: `Paint.layout`, `Paint.hex`, `Paint.colorName`, `window.PAINT_INK` (may be missing).
- Produces: no `#paint-outline`; empty cells white + number; filled cells pot color + no number; navy stroke is the ink; optional `PAINT_INK[id]` drawn stroke-only, no hit target.

- [ ] **Step 1: Drop the outline image and multiply CSS**

In `index.html` delete:

```html
<img id="paint-outline" class="paint-outline" alt="" draggable="false" />
```

Keep `#paint-blobs` and `#paint-labels`.

In `app.js` delete `paintOutline` and the `paintOutline.src = Paint.pictureSrc(...)` line.

In `styles.css` delete `.paint-outline` (the multiply overlay block). Set `.paint-page` background to `#fff8ee` (paper). Raise `.paint-blobs path` stroke to read as crayon ink:

```css
.paint-page {
  position: relative;
  width: min(72vw, 52vh, 420px);
  aspect-ratio: 1;
  background: #fff8ee;
  border: 5px solid var(--ink);
  border-radius: 1.1rem;
  overflow: hidden;
  box-shadow: 5px 5px 0 var(--ink);
}

.paint-blobs path:not(.paint-hit) {
  stroke: #2a2438;
  stroke-width: 1.1;
  stroke-linejoin: round;
  stroke-linecap: round;
}
```

Remove the per-path `stroke-width="0.35"` in `renderPaint` or set it to `1.1` to match. Filled / empty fills stay as they are (`#ffffff` empty, pot hex filled).

After the cell paths (and before hits), if `window.PAINT_INK` has an array for this picture, append each ink `d` as a path: `fill="none"`, `stroke="#2a2438"`, `stroke-width="1.1"`, no `data-cell`.

- [ ] **Step 2: Delete the eight outline PNGs**

```bash
rm -f assets/paint/sun-outline.png \
  assets/paint/crab-outline.png \
  assets/paint/sandcastle-outline.png \
  assets/paint/fish-outline.png \
  assets/paint/starfish-outline.png \
  assets/paint/boat-outline.png \
  assets/paint/shell-outline.png \
  assets/paint/bucket-outline.png
```

Grep the repo for `outline.png` and `pictureSrc` under paint (not Puzzle). Only docs that describe the old pipeline may still mention them.

- [ ] **Step 3: Update README**

Replace the Paint by Number paragraph with:

```markdown
### Paint by Number

Tap Paint by Number and a beach picture is waiting. Tap a numbered pot, then tap every blob with that number — sky, water, and sand too. Wrong number? It wiggles and stays empty. No Easy / Medium / Hard, no timer, no score.
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
node test/paint.test.js
node test/game.test.js
node test/path.test.js
node test/puzzle.test.js
node test/puzzle-layout.test.js
node test/menu.test.js
node test/kid.test.js
```

Expected: all PASS.

- [ ] **Step 5: Browser check**

Open `index.html`. Tap Paint by Number.

- Empty page is a full scene: numbers on sky, water, sand, waves, and the subject. No cream void around a floating outline.
- No second multiply drawing on top of the blobs.
- Pots are 7 or 8. None look white/cream.
- Fill pot 1 on the subject; it paints. Wrong pot wiggles.
- Fill every blob. The whole square is a picture. Cheer: **What a picture!**
- Play again deals another of the eight. Games returns to the menu.
- Tidy, Puzzle, and Path still start and play.
- Phone-width viewport: blobs still tappable.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js styles.css README.md assets/paint
git commit -m "Show paint-by-number as a full authored scene."
```

---

## Self-review

**Spec coverage**

| Spec item | Task |
|-----------|------|
| Same 8 ids, random deal, no difficulty | unchanged; Task 1 keeps session tests |
| Palettes + pot 1 subject + sky/water/sand + no foam | Task 1 |
| 16–22 cells, pots `1..K` no gaps | Tasks 3–4 |
| Authored SVG source of truth | Task 3 |
| Builder: no flood-fill / edge-discard / Voronoi | Task 2 |
| Builder fail on holes, slivers, rectangles, foam, bad K | Task 2 |
| `lx,ly` pole of inaccessibility | Task 2 |
| Menu preview from sun scene | Task 2 (rebuild) / Task 3 (sun exists) |
| Drop `#paint-outline` and `pictureSrc` | Tasks 1 and 5 |
| Empty white + number; filled pot color; navy stroke ink | Task 5 |
| Delete outline PNGs | Task 5 |
| Ink-only smile/eyes | Task 3 (`PAINT_INK`) + Task 5 draw |
| Fill rules unchanged | Task 1 (existing tests) |
| README | Task 5 |
| Out of scope (k-means, puzzle convert, difficulty) | not scheduled |

**Placeholders:** none. Scene geometry is the frame + subject-box table, not “draw something nice.”

**Types:** `layout` stays `[{ id, color, d, lx, ly }]`. Session `cells` stay `{ id, color }`. `PAINT_INK` is `{ [id]: string[] }`.
