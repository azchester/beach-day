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

test("createSession with no args is medium", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  assert.ok(s.cells.length >= 2);
  assert.strictEqual(s.selectedColor, null);
  assert.strictEqual(s.complete, false);
  var nColors = Object.keys(colorCounts(s.cells)).length;
  assert.ok(nColors >= 1 && nColors <= 6);
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

test("Easy uses at most 4 color numbers", function () {
  var s = Paint.createSession({ difficulty: "easy", random: always(0) });
  assert.ok(s.cells.length >= 2);
  var counts = colorCounts(s.cells);
  Object.keys(counts).forEach(function (c) {
    assert.ok(Number(c) >= 1 && Number(c) <= 4);
  });
});

test("Hard is at least as detailed as Easy and uses at most 8 colors", function () {
  var easy = Paint.createSession({ difficulty: "easy", random: always(0) });
  var hard = Paint.createSession({ difficulty: "hard", random: always(0) });
  assert.ok(hard.cells.length >= easy.cells.length);
  var counts = colorCounts(hard.cells);
  Object.keys(counts).forEach(function (c) {
    assert.ok(Number(c) >= 1 && Number(c) <= 8);
  });
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

test("sun layouts use only open paints", function () {
  ["easy", "medium", "hard"].forEach(function (d) {
    var k = Paint.grid(d).colors;
    var layout = Paint.layout(0, d);
    var seen = {};
    layout.forEach(function (cell) {
      assert.ok(cell.color >= 1 && cell.color <= k);
      assert.ok(cell.d && cell.d.length > 0);
      seen[cell.color] = true;
    });
    if (layout.length >= k) {
      var n;
      for (n = 1; n <= k; n++) assert.ok(seen[n], "missing color " + n);
    }
  });
});

test("crab easy uses only pots 1-4", function () {
  var layout = Paint.layout(1, "easy");
  layout.forEach(function (cell) {
    assert.ok(cell.color >= 1 && cell.color <= 4);
  });
  assert.ok(layout.length >= 3);
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

test("every picture layout has organic cells and in-range colors", function () {
  Paint.PICTURES.forEach(function (_, index) {
    ["easy", "medium", "hard"].forEach(function (d) {
      var layout = Paint.layout(index, d);
      var expect = Paint.grid(d);
      assert.ok(layout.length >= 2);
      layout.forEach(function (cell) {
        assert.ok(cell.d && cell.d.charAt(0) === "M");
        assert.ok(cell.color >= 1 && cell.color <= expect.colors);
      });
    });
  });
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
