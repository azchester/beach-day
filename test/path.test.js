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

function lcg(seed) {
  var s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function countType(session, type) {
  var level = CrabPath.currentLevel(session);
  var n = 0;
  for (var y = 0; y < level.height; y++) {
    for (var x = 0; x < level.width; x++) {
      if (CrabPath.cellAt(session, x, y) === type) n++;
    }
  }
  return n;
}

function shortestWalk(session) {
  var start = CrabPath.currentLevel(session).start;
  var goal = CrabPath.currentLevel(session).goal;
  var seen = {};
  var queue = [{ x: start.x, y: start.y, d: 0 }];
  seen[key(start)] = true;
  while (queue.length) {
    var here = queue.shift();
    if (here.x === goal.x && here.y === goal.y) return here.d;
    var dummy = {
      crab: { x: here.x, y: here.y },
      width: session.width,
      height: session.height,
      cells: session.cells,
      start: session.start,
      goal: session.goal,
      levelIndex: session.levelIndex
    };
    CrabPath.legalMoves(dummy).forEach(function (n) {
      var k = key(n);
      if (!seen[k]) {
        seen[k] = true;
        queue.push({ x: n.x, y: n.y, d: here.d + 1 });
      }
    });
  }
  return -1;
}

function walkableFromStart(session) {
  return shortestWalk(session) >= 0;
}

function neighborOf(session, cell) {
  var dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  for (var i = 0; i < dirs.length; i++) {
    var x = cell.x + dirs[i].x;
    var y = cell.y + dirs[i].y;
    var t = CrabPath.cellAt(session, x, y);
    if (t === "sand" || t === "goal") return { x: x, y: y };
  }
  return null;
}

test("createSession with no args is medium path 1", function () {
  var s = CrabPath.createSession({ random: lcg(1) });
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.levelIndex, 0);
  assert.strictEqual(CrabPath.PATH_COUNT, 6);
});

test("unknown difficulty is medium", function () {
  var s = CrabPath.createSession({ difficulty: "banana", random: lcg(2) });
  assert.strictEqual(s.difficulty, "medium");
});

test("legal moves are only adjacent walkable tiles", function () {
  var s = CrabPath.createSession({ random: lcg(3) });
  var moves = CrabPath.legalMoves(s);
  assert.ok(moves.length >= 1);
  moves.forEach(function (m) {
    assert.strictEqual(Math.abs(m.x - s.crab.x) + Math.abs(m.y - s.crab.y), 1);
    assert.notStrictEqual(CrabPath.cellAt(s, m.x, m.y), "rock");
    assert.notStrictEqual(CrabPath.cellAt(s, m.x, m.y), "water");
  });
});

test("cannot step onto a rock", function () {
  var s = CrabPath.createSessionAt(2, { difficulty: "easy", random: lcg(4) });
  var rock = null;
  var level = CrabPath.currentLevel(s);
  for (var y = 0; y < level.height && !rock; y++) {
    for (var x = 0; x < level.width; x++) {
      if (CrabPath.cellAt(s, x, y) === "rock") {
        rock = { x: x, y: y };
        break;
      }
    }
  }
  assert.ok(rock);
  var nextTo = null;
  [
    { x: rock.x - 1, y: rock.y },
    { x: rock.x + 1, y: rock.y },
    { x: rock.x, y: rock.y - 1 },
    { x: rock.x, y: rock.y + 1 }
  ].forEach(function (c) {
    var t = CrabPath.cellAt(s, c.x, c.y);
    if (t === "sand" || t === "goal") nextTo = c;
  });
  assert.ok(nextTo);
  s.crab = { x: nextTo.x, y: nextTo.y };
  var result = CrabPath.step(s, rock.x, rock.y);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.crab.x, nextTo.x);
  assert.strictEqual(result.session.crab.y, nextTo.y);
});

test("cannot step onto water", function () {
  var s = CrabPath.createSessionAt(5, { difficulty: "easy", random: lcg(5) });
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
  var nextTo = null;
  [
    { x: water.x - 1, y: water.y },
    { x: water.x + 1, y: water.y },
    { x: water.x, y: water.y - 1 },
    { x: water.x, y: water.y + 1 }
  ].forEach(function (c) {
    var t = CrabPath.cellAt(s, c.x, c.y);
    if (t === "sand" || t === "goal") nextTo = c;
  });
  assert.ok(nextTo);
  s.crab = { x: nextTo.x, y: nextTo.y };
  var result = CrabPath.step(s, water.x, water.y);
  assert.strictEqual(result.ok, false);
});

test("cannot hop two tiles away", function () {
  var s = CrabPath.createSession({ difficulty: "easy", random: lcg(6) });
  var result = CrabPath.step(s, s.crab.x + 2, s.crab.y);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.crab.x, s.crab.x);
});

test("stepping onto the bucket completes the path", function () {
  var s = CrabPath.createSession({ difficulty: "easy", random: lcg(7) });
  var goal = CrabPath.currentLevel(s).goal;
  var from = neighborOf(s, goal);
  assert.ok(from);
  s.crab = from;
  var result = CrabPath.step(s, goal.x, goal.y);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.session.complete, true);
  assert.strictEqual(result.session.crab.x, goal.x);
  assert.strictEqual(result.session.crab.y, goal.y);
});

test("advance goes to the next path after a complete one and keeps difficulty", function () {
  var s = CrabPath.createSession({ difficulty: "easy", random: lcg(8) });
  var goal = CrabPath.currentLevel(s).goal;
  s.crab = neighborOf(s, goal);
  s = CrabPath.step(s, goal.x, goal.y).session;
  s = CrabPath.advance(s, lcg(9));
  assert.strictEqual(s.levelIndex, 1);
  assert.strictEqual(s.difficulty, "easy");
  assert.strictEqual(s.complete, false);
});

test("play again starts at path 1 at the same difficulty", function () {
  var s = CrabPath.createSessionAt(3, { difficulty: "hard", random: lcg(10) });
  var again = CrabPath.playAgain(s, lcg(11));
  assert.strictEqual(again.levelIndex, 0);
  assert.strictEqual(again.difficulty, "hard");
  assert.strictEqual(CrabPath.playAgain(null, lcg(12)).difficulty, "medium");
});

test("easy path 1 is a 5x2 empty walk of 4", function () {
  var s = CrabPath.createSessionAt(0, { difficulty: "easy", random: lcg(13) });
  var level = CrabPath.currentLevel(s);
  assert.strictEqual(level.width, 5);
  assert.strictEqual(level.height, 2);
  assert.strictEqual(countType(s, "rock"), 0);
  assert.strictEqual(countType(s, "water"), 0);
  assert.notStrictEqual(s.start.x + "," + s.start.y, s.goal.x + "," + s.goal.y);
  assert.strictEqual(shortestWalk(s), 4);
});

test("easy paths 0-4 have no water; path 5 has one water", function () {
  for (var i = 0; i < 5; i++) {
    var s = CrabPath.createSessionAt(i, { difficulty: "easy", random: lcg(20 + i) });
    assert.strictEqual(countType(s, "water"), 0, "easy " + i + " water");
  }
  var last = CrabPath.createSessionAt(5, { difficulty: "easy", random: lcg(30) });
  assert.strictEqual(countType(last, "water"), 1);
  assert.strictEqual(countType(last, "rock"), 1);
});

test("medium path 0 has one rock and no water", function () {
  var s = CrabPath.createSessionAt(0, { difficulty: "medium", random: lcg(40) });
  assert.strictEqual(s.width, 5);
  assert.strictEqual(s.height, 3);
  assert.strictEqual(countType(s, "rock"), 1);
  assert.strictEqual(countType(s, "water"), 0);
});

test("hard path 0 is 6x3 with two rocks and no water", function () {
  var s = CrabPath.createSessionAt(0, { difficulty: "hard", random: lcg(50) });
  assert.strictEqual(s.width, 6);
  assert.strictEqual(s.height, 3);
  assert.strictEqual(countType(s, "rock"), 2);
  assert.strictEqual(countType(s, "water"), 0);
});

test("hard path 5 is 6x4 with four rocks and two water", function () {
  var s = CrabPath.createSessionAt(5, { difficulty: "hard", random: lcg(60) });
  assert.strictEqual(s.width, 6);
  assert.strictEqual(s.height, 4);
  assert.strictEqual(countType(s, "rock"), 4);
  assert.strictEqual(countType(s, "water"), 2);
});

test("crab and bucket sit on different cells and are not locked to the left and right edges", function () {
  var seenOffEdge = false;
  for (var seed = 1; seed <= 40; seed++) {
    var s = CrabPath.createSession({ difficulty: "medium", random: lcg(seed) });
    assert.notStrictEqual(s.start.x + "," + s.start.y, s.goal.x + "," + s.goal.y);
    assert.strictEqual(CrabPath.cellAt(s, s.goal.x, s.goal.y), "goal");
    assert.strictEqual(s.crab.x, s.start.x);
    assert.strictEqual(s.crab.y, s.start.y);
    if (s.start.x !== 0 || s.goal.x !== s.width - 1) seenOffEdge = true;
  }
  assert.ok(seenOffEdge, "some boards should place crab or bucket off the left/right edges");
});

test("every generated path has a walk from the crab to the bucket", function () {
  ["easy", "medium", "hard"].forEach(function (diff) {
    for (var i = 0; i < CrabPath.PATH_COUNT; i++) {
      var s = CrabPath.createSessionAt(i, { difficulty: diff, random: lcg(200 + i * 3 + diff.length) });
      assert.ok(walkableFromStart(s), diff + " path " + i + " should be solvable");
    }
  });
});

test("two different random stubs can produce different boards", function () {
  var a = CrabPath.createSession({ difficulty: "medium", random: lcg(1) });
  var b = CrabPath.createSession({ difficulty: "medium", random: lcg(99) });
  assert.notStrictEqual(JSON.stringify(a.cells) + a.start.y + a.goal.y, JSON.stringify(b.cells) + b.start.y + b.goal.y);
});

test("step copies the session and does not mutate cells", function () {
  var s = CrabPath.createSession({ difficulty: "easy", random: lcg(70) });
  var before = JSON.stringify(s.cells);
  var moves = CrabPath.legalMoves(s);
  CrabPath.step(s, moves[0].x, moves[0].y);
  assert.strictEqual(JSON.stringify(s.cells), before);
  assert.strictEqual(s.crab.x, s.start.x);
});

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
