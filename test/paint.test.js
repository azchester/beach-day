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

function pathCorners(d) {
  var pts = [];
  var re = /([MLQ])\s*(-?[\d.]+)[,\s]+(-?[\d.]+)(?:\s+(-?[\d.]+)[,\s]+(-?[\d.]+))?/g;
  var m;
  while ((m = re.exec(d))) {
    if (m[1] === "Q") pts.push({ x: Number(m[4]), y: Number(m[5]) });
    else pts.push({ x: Number(m[2]), y: Number(m[3]) });
  }
  var uniq = [];
  pts.forEach(function (p) {
    var last = uniq[uniq.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.08 || Math.abs(last.y - p.y) > 0.08) {
      uniq.push(p);
    }
  });
  if (uniq.length >= 2) {
    var a = uniq[0];
    var b = uniq[uniq.length - 1];
    if (Math.abs(a.x - b.x) < 0.08 && Math.abs(a.y - b.y) < 0.08) uniq.pop();
  }
  return uniq;
}

function isAxisAlignedRectangle(d) {
  var uniq = pathCorners(d);
  if (uniq.length !== 4) return false;
  var xs = uniq.map(function (p) {
    return p.x;
  });
  var ys = uniq.map(function (p) {
    return p.y;
  });
  var minX = Math.min.apply(null, xs);
  var maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxY = Math.max.apply(null, ys);
  if (maxX - minX < 1 || maxY - minY < 1) return false;
  return uniq.every(function (p) {
    var onX = Math.abs(p.x - minX) < 0.4 || Math.abs(p.x - maxX) < 0.4;
    var onY = Math.abs(p.y - minY) < 0.4 || Math.abs(p.y - maxY) < 0.4;
    return onX && onY;
  });
}

test("createSession has no difficulty and deals one picture", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, undefined);
  assert.ok(s.cells.length >= 3);
  assert.strictEqual(s.selectedColor, null);
  assert.strictEqual(s.complete, false);
  var nColors = Object.keys(colorCounts(s.cells)).length;
  assert.ok(nColors >= 2 && nColors <= 8);
  assert.strictEqual(Paint.createSession().difficulty, undefined);
  assert.strictEqual(Paint.PICTURE_COUNT, 8);
});

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

test("no picture uses a white or cream pot", function () {
  Paint.PICTURES.forEach(function (_, index) {
    var pal = Paint.palette(index);
    assert.ok(pal.indexOf("foam") === -1, Paint.PICTURES[index] + " palette still has foam");
    Paint.layout(index).forEach(function (cell) {
      var name = Paint.colorName(index, cell.color);
      var hex = Paint.hex(name).toLowerCase();
      assert.notStrictEqual(name, "foam");
      assert.notStrictEqual(hex, "#fff8ee");
      assert.notStrictEqual(hex, "#ffffff");
    });
  });
});

test("sun layout uses only open paints and organic paths", function () {
  var layout = Paint.layout(0);
  var seen = {};
  assert.ok(layout.length >= 3);
  layout.forEach(function (cell) {
    assert.ok(cell.color >= 1 && cell.color <= 8);
    assert.ok(cell.d && cell.d.charAt(0) === "M");
    assert.strictEqual(isAxisAlignedRectangle(cell.d), false, "sun cell " + cell.id + " is a rectangle");
    seen[cell.color] = true;
  });
  assert.ok(Object.keys(seen).length >= 2);
});

test("crab layout is organic, not boxed", function () {
  var layout = Paint.layout(1);
  assert.ok(layout.length >= 3);
  layout.forEach(function (cell) {
    assert.ok(cell.color >= 1 && cell.color <= 8);
    assert.ok(cell.d && cell.d.charAt(0) === "M");
    assert.strictEqual(isAxisAlignedRectangle(cell.d), false, "crab cell " + cell.id + " is a rectangle");
  });
});

test("selectColor 1 succeeds and does not mutate input", function () {
  var s = Paint.createSession({ random: always(0) });
  var result = Paint.selectColor(s, 1);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.selectedColor, 1);
  assert.strictEqual(s.selectedColor, null);
});

test("selectColor 0 and 99 fail", function () {
  var s = Paint.createSession({ random: always(0) });
  assert.strictEqual(Paint.selectColor(s, 0).ok, false);
  assert.strictEqual(Paint.selectColor(s, 99).ok, false);
});

test("fill matching empty cell succeeds and does not mutate input", function () {
  var s = Paint.createSession({ random: always(0) });
  var cell = s.cells[0];
  s = Paint.selectColor(s, cell.color).session;
  var before = Object.keys(s.filled).length;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.filled[cell.id], true);
  assert.strictEqual(Object.keys(s.filled).length, before);
});

test("fill with no pot fails", function () {
  var s = Paint.createSession({ random: always(0) });
  var result = Paint.fill(s, s.cells[0].id);
  assert.strictEqual(result.ok, false);
});

test("fill wrong color fails", function () {
  var s = Paint.createSession({ random: always(0) });
  var cell = s.cells.filter(function (c) {
    return c.color === 1;
  })[0];
  var other = s.cells.filter(function (c) {
    return c.color !== 1;
  })[0];
  assert.ok(cell && other);
  s = Paint.selectColor(s, other.color).session;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, false);
  assert.ok(!result.session.filled[cell.id]);
});

test("fill of a filled cell fails", function () {
  var s = Paint.createSession({ random: always(0) });
  var cell = s.cells[0];
  s = Paint.selectColor(s, cell.color).session;
  s = Paint.fill(s, cell.id).session;
  var result = Paint.fill(s, cell.id);
  assert.strictEqual(result.ok, false);
});

test("fill of unknown cellId fails", function () {
  var s = Paint.createSession({ random: always(0) });
  s = Paint.selectColor(s, 1).session;
  assert.strictEqual(Paint.fill(s, 999).ok, false);
});

test("filling the last cell sets complete", function () {
  var s = fillAll(Paint.createSession({ random: always(0) }));
  assert.strictEqual(s.complete, true);
});

test("playAgain deals a new picture and keeps no difficulty", function () {
  var s = Paint.createSession({ random: always(0) });
  var again = Paint.playAgain(s, always(0.99));
  assert.strictEqual(again.difficulty, undefined);
  assert.notStrictEqual(again.pictureIndex, s.pictureIndex);
  assert.strictEqual(again.selectedColor, null);
  assert.strictEqual(Paint.playAgain().difficulty, undefined);
});

test("two random stubs differ in pictureIndex", function () {
  var a = Paint.createSession({ random: always(0) });
  var b = Paint.createSession({ random: always(0.99) });
  assert.notStrictEqual(a.pictureIndex, b.pictureIndex);
});

test("every picture layout has organic cells and in-range colors", function () {
  Paint.PICTURES.forEach(function (_, index) {
    var layout = Paint.layout(index);
    assert.ok(layout.length >= 3, Paint.PICTURES[index] + " too few cells");
    layout.forEach(function (cell) {
      assert.ok(cell.d && cell.d.charAt(0) === "M");
      assert.ok(cell.color >= 1 && cell.color <= 8);
      assert.strictEqual(
        isAxisAlignedRectangle(cell.d),
        false,
        Paint.PICTURES[index] + " cell " + cell.id + " is a rectangle"
      );
    });
  });
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
