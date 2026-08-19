/**
 * Crayon rules.
 * Run: node test/crayon.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var Paint = require(path.join(__dirname, "..", "paint.js"));
var Crayon = require(path.join(__dirname, "..", "crayon.js"));

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

test("createSession has no difficulty and starts on pot 1", function () {
  var s = Crayon.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, undefined);
  assert.strictEqual(s.selectedColor, 1);
  assert.strictEqual(s.complete, false);
  assert.strictEqual(Crayon.createSession().difficulty, undefined);
});

test("pictureIndex is 0..7 and pictureId 0 is sun", function () {
  var s = Crayon.createSession({ random: always(0) });
  assert.ok(s.pictureIndex >= 0 && s.pictureIndex <= 7);
  assert.strictEqual(Math.floor(s.pictureIndex), s.pictureIndex);
  assert.strictEqual(Crayon.pictureId(s), "sun");
});

test("createSession deals the same picture as Paint for the same random", function () {
  var c = Crayon.createSession({ random: always(0) });
  var p = Paint.createSession({ random: always(0) });
  assert.strictEqual(c.pictureIndex, p.pictureIndex);
  var c2 = Crayon.createSession({ random: always(0.99) });
  var p2 = Paint.createSession({ random: always(0.99) });
  assert.strictEqual(c2.pictureIndex, p2.pictureIndex);
});

test("selectColor(1) succeeds and does not mutate the input", function () {
  var s = Crayon.createSession({ random: always(0) });
  var result = Crayon.selectColor(s, 2);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.selectedColor, 2);
  assert.strictEqual(s.selectedColor, 1);
});

test("selectColor 0 and 99 fail and leave pot 1", function () {
  var s = Crayon.createSession({ random: always(0) });
  var a = Crayon.selectColor(s, 0);
  var b = Crayon.selectColor(s, 99);
  assert.strictEqual(a.ok, false);
  assert.strictEqual(b.ok, false);
  assert.strictEqual(a.session.selectedColor, 1);
  assert.strictEqual(b.session.selectedColor, 1);
});

test("selectColor of a color missing from the layout fails", function () {
  var s = Crayon.createSession({ random: always(0) });
  var used = {};
  Paint.layout(s.pictureIndex).forEach(function (c) {
    used[c.color] = true;
  });
  var missing = 1;
  while (missing <= 20 && used[missing]) missing++;
  var result = Crayon.selectColor(s, missing);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.selectedColor, 1);
});

test("done sets complete and does not mutate the input", function () {
  var s = Crayon.createSession({ random: always(0) });
  var result = Crayon.done(s);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.complete, true);
  assert.strictEqual(s.complete, false);
});

test("done of an already complete session stays complete", function () {
  var s = Crayon.done(Crayon.createSession({ random: always(0) })).session;
  var result = Crayon.done(s);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.complete, true);
});

test("playAgain resets pot and complete and may change picture", function () {
  var s = Crayon.done(Crayon.selectColor(Crayon.createSession({ random: always(0) }), 2).session).session;
  var next = Crayon.playAgain(s, always(0.99));
  assert.strictEqual(next.difficulty, undefined);
  assert.strictEqual(next.selectedColor, 1);
  assert.strictEqual(next.complete, false);
  assert.notStrictEqual(next.pictureIndex, s.pictureIndex);
});

test("two createSession stubs can differ in pictureIndex", function () {
  var a = Crayon.createSession({ random: always(0) });
  var b = Crayon.createSession({ random: always(0.99) });
  assert.notStrictEqual(a.pictureIndex, b.pictureIndex);
});

console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
