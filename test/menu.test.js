/**
 * Menu crab placement.
 * Run: node test/menu.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var BeachMenu = require(path.join(__dirname, "..", "menu.js"));

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

test("missing rects is 0", function () {
  assert.strictEqual(BeachMenu.crabOffsetPx(null, { left: 0, width: 10 }), 0);
  assert.strictEqual(BeachMenu.crabOffsetPx({ left: 0, width: 10 }, null), 0);
});

test("card in the middle of the menu is 0", function () {
  assert.strictEqual(
    BeachMenu.crabOffsetPx({ left: 0, width: 1200 }, { left: 440, width: 320 }),
    0
  );
});

test("uses the selected card center, not a hardcoded 180px hop", function () {
  var dx = BeachMenu.crabOffsetPx(
    { left: 0, width: 1200 },
    { left: 98.55206298828125, width: 324.5052490234375 }
  );
  assert.ok(Math.abs(dx + 339.1953125) < 0.001, "got " + dx);
  assert.ok(Math.abs(dx + 180) > 100, "must not be the old -180 magic number");
});

test("right-hand card is the same distance the other way", function () {
  var dx = BeachMenu.crabOffsetPx(
    { left: 0, width: 1200 },
    { left: 779.1953125, width: 320 }
  );
  assert.ok(Math.abs(dx - 339.1953125) < 0.001, "got " + dx);
});

function card(game) {
  return { dataset: { game: game } };
}

test("gameIds is the data-game of each card in order", function () {
  assert.deepStrictEqual(
    BeachMenu.gameIds([card("tidy"), card("puzzle"), card("path")]),
    ["tidy", "puzzle", "path"]
  );
});

test("gameIds picks up a fourth card without a hardcoded list", function () {
  assert.deepStrictEqual(
    BeachMenu.gameIds([card("tidy"), card("puzzle"), card("path"), card("paint")]),
    ["tidy", "puzzle", "path", "paint"]
  );
});

test("gameIds picks up a fifth card without a hardcoded list", function () {
  assert.deepStrictEqual(
    BeachMenu.gameIds([
      card("tidy"),
      card("puzzle"),
      card("path"),
      card("paint"),
      card("crayon")
    ]),
    ["tidy", "puzzle", "path", "paint", "crayon"]
  );
});

test("gameIds skips cards with no data-game", function () {
  assert.deepStrictEqual(BeachMenu.gameIds([card("tidy"), card(""), card("path")]), ["tidy", "path"]);
  assert.deepStrictEqual(BeachMenu.gameIds(null), []);
});

console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
