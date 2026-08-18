/**
 * Beach Puzzle rules.
 * Run: node test/puzzle.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var Puzzle = require(path.join(__dirname, "..", "puzzle.js"));

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

function groupOf(s, id) {
  var i;
  for (i = 0; i < s.groups.length; i++) {
    if (s.groups[i].indexOf(id) !== -1) return s.groups[i].slice().sort();
  }
  return [];
}

function snapAllNeighbors(s) {
  var guard = 0;
  var a;
  var b;
  var result;
  while (!s.complete && guard < 200) {
    var progressed = false;
    for (a = 0; a < s.rows * s.cols; a++) {
      var n = Puzzle.neighbors(s, a);
      for (b = 0; b < n.length; b++) {
        if (Puzzle.canSnap(s, a, n[b])) {
          result = Puzzle.snap(s, a, n[b]);
          assert.strictEqual(result.ok, true);
          s = result.session;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
    guard += 1;
  }
  return s;
}

test("createSession with no args is medium 4x4", function () {
  var s = Puzzle.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.rows, 4);
  assert.strictEqual(s.cols, 4);
  assert.strictEqual(s.groups.length, 16);
  assert.strictEqual(Puzzle.createSession().difficulty, "medium");
  assert.strictEqual(Puzzle.PICTURE_COUNT, 12);
});

test("unknown difficulty is medium", function () {
  var s = Puzzle.createSession({ difficulty: "banana", random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  var g = Puzzle.grid("nope");
  assert.strictEqual(g.rows, 4);
  assert.strictEqual(g.cols, 4);
});

test("Easy is 3x3 with 9 groups", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  assert.strictEqual(s.rows, 3);
  assert.strictEqual(s.cols, 3);
  assert.strictEqual(s.groups.length, 9);
});

test("Hard is 5x5 with 25 groups", function () {
  var s = Puzzle.createSession({ difficulty: "hard", random: always(0) });
  assert.strictEqual(s.rows, 5);
  assert.strictEqual(s.cols, 5);
  assert.strictEqual(s.groups.length, 25);
});

test("pictureIndex is in range and pictureSrc matches index 0", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  assert.ok(s.pictureIndex >= 0 && s.pictureIndex <= 11);
  assert.ok(Number.isInteger(s.pictureIndex));
  var zero = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  zero.pictureIndex = 0;
  assert.ok(Puzzle.pictureSrc(zero).indexOf("01-beach.jpg") !== -1);
});

test("corner piece 0 has flat north and west", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  assert.strictEqual(Puzzle.edge(s, 0, "n"), "flat");
  assert.strictEqual(Puzzle.edge(s, 0, "w"), "flat");
  var east = Puzzle.edge(s, 0, "e");
  var south = Puzzle.edge(s, 0, "s");
  assert.ok(east === "tab" || east === "blank");
  assert.ok(south === "tab" || south === "blank");
});

test("every seam is +1 or -1", function () {
  var s = Puzzle.createSession({ difficulty: "hard", random: always(0.3) });
  var r;
  var c;
  for (r = 0; r < s.rows; r++) {
    for (c = 0; c < s.cols - 1; c++) {
      assert.ok(s.vSeams[r][c] === 1 || s.vSeams[r][c] === -1);
    }
  }
  for (r = 0; r < s.rows - 1; r++) {
    for (c = 0; c < s.cols; c++) {
      assert.ok(s.hSeams[r][c] === 1 || s.hSeams[r][c] === -1);
    }
  }
});

test("canSnap on a fresh 3x3", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  assert.strictEqual(Puzzle.canSnap(s, 0, 1), true);
  assert.strictEqual(Puzzle.canSnap(s, 0, 3), true);
  assert.strictEqual(Puzzle.canSnap(s, 0, 2), false);
  assert.strictEqual(Puzzle.canSnap(s, 0, 4), false);
});

test("snap joins neighbors and does not mutate the input", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  var before = s.groups.length;
  var result = Puzzle.snap(s, 0, 1);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(s.groups.length, before);
  assert.deepStrictEqual(groupOf(result.session, 0), groupOf(result.session, 1));
  assert.ok(groupOf(result.session, 0).indexOf(0) !== -1);
  assert.ok(groupOf(result.session, 0).indexOf(1) !== -1);
});

test("second snap of the same pair fails", function () {
  var s = Puzzle.snap(
    Puzzle.createSession({ difficulty: "easy", random: always(0) }),
    0,
    1
  ).session;
  var again = Puzzle.snap(s, 0, 1);
  assert.strictEqual(again.ok, false);
});

test("diagonal snap fails", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  var result = Puzzle.snap(s, 0, 4);
  assert.strictEqual(result.ok, false);
});

test("union of 0-1 then 1-2 puts 0,1,2 in one group", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  s = Puzzle.snap(s, 0, 1).session;
  s = Puzzle.snap(s, 1, 2).session;
  assert.deepStrictEqual(groupOf(s, 0), [0, 1, 2]);
});

test("snapping every Easy neighbor completes the puzzle", function () {
  var s = snapAllNeighbors(Puzzle.createSession({ difficulty: "easy", random: always(0) }));
  assert.strictEqual(s.complete, true);
  assert.strictEqual(s.groups.length, 1);
  assert.strictEqual(s.groups[0].length, 9);
});

test("playAgain keeps difficulty", function () {
  var s = Puzzle.createSession({ difficulty: "hard", random: always(0) });
  var again = Puzzle.playAgain(s, always(0.5));
  assert.strictEqual(again.difficulty, "hard");
  assert.strictEqual(again.rows, 5);
  assert.strictEqual(Puzzle.playAgain().difficulty, "medium");
});

test("two different stubs can differ in picture or seams", function () {
  var a = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  var b = Puzzle.createSession({ difficulty: "easy", random: always(0.99) });
  var samePic = a.pictureIndex === b.pictureIndex;
  var sameSeam = JSON.stringify(a.vSeams) === JSON.stringify(b.vSeams) &&
    JSON.stringify(a.hSeams) === JSON.stringify(b.hSeams);
  assert.ok(!samePic || !sameSeam);
});

test("complementary east-west edges", function () {
  var s = Puzzle.createSession({ difficulty: "easy", random: always(0) });
  var e = Puzzle.edge(s, 0, "e");
  var w = Puzzle.edge(s, 1, "w");
  assert.ok((e === "tab" && w === "blank") || (e === "blank" && w === "tab"));
});

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
