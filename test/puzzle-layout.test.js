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

test("snapSeat accepts an unclamped point whose aligned seat is off the field", function () {
  var cell = 90;
  var neighbor = { x: 0, y: 0 };
  var left = PuzzleLayout.snapSeat({ x: -86, y: 4 }, neighbor, -1, 0, cell);
  assert.strictEqual(left.x, -90);
  assert.strictEqual(left.y, 0);
  assert.strictEqual(left.ok, true);
  assert.strictEqual(PuzzleLayout.snapSeat({ x: 0, y: 0 }, neighbor, -1, 0, cell).ok, false);
  assert.strictEqual(PuzzleLayout.snapSeat({ x: 2, y: -88 }, neighbor, 0, -1, cell).ok, true);
  assert.strictEqual(PuzzleLayout.snapSeat({ x: 0, y: 0 }, neighbor, 0, -1, cell).ok, false);
});

test("clampGroup after an outward snap keeps cell spacing and returns the clump", function () {
  var next = PuzzleLayout.clampGroup(
    pos({ 0: { x: -90, y: 8 }, 1: { x: 0, y: 8 } }),
    [0, 1],
    120,
    400,
    300
  );
  assert.strictEqual(next[1].x - next[0].x, 90);
  assert.strictEqual(next[0].x, 0);
  assert.strictEqual(next[1].x, 90);
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
