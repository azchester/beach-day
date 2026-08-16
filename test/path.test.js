/**
 * Crab Path rules.
 * Run: node test/path.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var CrabPath = require(path.join(__dirname, "..", "path.js"));

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

function key(cell) {
  return cell.x + "," + cell.y;
}

test("createSession starts on path 1 with the crab left of the bucket", function () {
  var s = CrabPath.createSession();
  assert.strictEqual(s.levelIndex, 0);
  var level = CrabPath.currentLevel(s);
  assert.strictEqual(s.crab.x, level.start.x);
  assert.strictEqual(s.crab.y, level.start.y);
  assert.ok(s.crab.x < level.goal.x);
  assert.strictEqual(s.complete, false);
});

test("legal moves are only adjacent walkable tiles", function () {
  var s = CrabPath.createSession();
  var moves = CrabPath.legalMoves(s);
  assert.ok(moves.length >= 1);
  moves.forEach(function (m) {
    assert.strictEqual(Math.abs(m.x - s.crab.x) + Math.abs(m.y - s.crab.y), 1);
    assert.notStrictEqual(CrabPath.cellAt(s, m.x, m.y), "rock");
    assert.notStrictEqual(CrabPath.cellAt(s, m.x, m.y), "water");
  });
});

test("cannot step onto a rock", function () {
  var s = CrabPath.createSessionAt(1);
  var level = CrabPath.currentLevel(s);
  var rock = null;
  for (var y = 0; y < level.height && !rock; y++) {
    for (var x = 0; x < level.width; x++) {
      if (CrabPath.cellAt(s, x, y) === "rock") {
        rock = { x: x, y: y };
        break;
      }
    }
  }
  assert.ok(rock);
  s.crab = { x: rock.x - 1, y: rock.y };
  var result = CrabPath.step(s, rock.x, rock.y);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.crab.x, rock.x - 1);
});

test("cannot step onto water", function () {
  var s = CrabPath.createSessionAt(3);
  var water = null;
  var level = CrabPath.currentLevel(s);
  for (var y = 0; y < level.height && !water; y++) {
    for (var x = 0; x < level.width; x++) {
      if (CrabPath.cellAt(s, x, y) === "water") {
        water = { x: x, y: y };
        break;
      }
    }
  }
  assert.ok(water);
  s.crab = { x: water.x - 1, y: water.y };
  var result = CrabPath.step(s, water.x, water.y);
  assert.strictEqual(result.ok, false);
});

test("cannot hop two tiles away", function () {
  var s = CrabPath.createSession();
  var result = CrabPath.step(s, s.crab.x + 2, s.crab.y);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.crab.x, s.crab.x);
});

test("stepping onto the bucket completes the path", function () {
  var s = CrabPath.createSession();
  var goal = CrabPath.currentLevel(s).goal;
  s.crab = { x: goal.x - 1, y: goal.y };
  var result = CrabPath.step(s, goal.x, goal.y);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.complete, true);
  assert.strictEqual(result.session.crab.x, goal.x);
});

test("advance goes to the next path after a complete one", function () {
  var s = CrabPath.createSession();
  var goal = CrabPath.currentLevel(s).goal;
  s.crab = { x: goal.x - 1, y: goal.y };
  s = CrabPath.step(s, goal.x, goal.y).session;
  s = CrabPath.advance(s);
  assert.strictEqual(s.levelIndex, 1);
  assert.strictEqual(s.complete, false);
});

test("play again and a new session both start at path 1", function () {
  assert.strictEqual(CrabPath.playAgain().levelIndex, 0);
  assert.strictEqual(CrabPath.createSession().levelIndex, 0);
});

test("every path has a walk from the crab to the bucket", function () {
  for (var i = 0; i < CrabPath.LEVELS.length; i++) {
    var s = CrabPath.createSessionAt(i);
    var start = CrabPath.currentLevel(s).start;
    var goal = CrabPath.currentLevel(s).goal;
    var seen = {};
    var queue = [start];
    seen[key(start)] = true;
    var found = false;
    while (queue.length) {
      var here = queue.shift();
      if (here.x === goal.x && here.y === goal.y) {
        found = true;
        break;
      }
      var dummy = { crab: here, levelIndex: i };
      CrabPath.legalMoves(dummy).forEach(function (n) {
        var k = key(n);
        if (!seen[k]) {
          seen[k] = true;
          queue.push(n);
        }
      });
    }
    assert.ok(found, "level " + (i + 1) + " should be solvable");
  }
});

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
