/**
 * Tide Pool Tidy rules.
 * Run: node test/game.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var TidePool = require(path.join(__dirname, "..", "game.js"));

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

function poolFor(item) {
  return item.kind === "sandcastle" ? "sandcastles" : item.kind === "shell" ? "shells" : "rocks";
}

function finishRound(s) {
  TidePool.currentRound(s).items.forEach(function (item) {
    s = TidePool.drop(s, item.id, poolFor(item)).session;
  });
  return s;
}

function sorted(ids) {
  return ids.slice().sort();
}

function hasCreamSpiral(s) {
  return TidePool.currentRound(s).items.some(function (i) {
    return i.kind === "shell" && i.variant === "spiral" && i.color === "cream";
  });
}

function hasSandTurret(s) {
  return TidePool.currentRound(s).items.some(function (i) {
    return i.kind === "sandcastle" && i.variant === "turret" && i.color === "sand";
  });
}

test("createSession with no args is medium round 1 with one of each kind", function () {
  var s = TidePool.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.roundIndex, 0);
  assert.strictEqual(TidePool.createSession().difficulty, "medium");
  var kinds = TidePool.currentRound(s).items.map(function (i) { return i.kind; }).sort();
  assert.deepStrictEqual(kinds, ["rock", "sandcastle", "shell"]);
  assert.strictEqual(s.sandIds.length, 3);
});

test("unknown difficulty is medium", function () {
  var s = TidePool.createSession({ difficulty: "banana", random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
});

test("sandIds is a permutation of item ids", function () {
  var s = TidePool.createSession({ random: always(0.3) });
  assert.deepStrictEqual(sorted(s.sandIds), sorted(s.items.map(function (i) { return i.id; })));
});

test("correct drop stays in the pool and leaves the sand", function () {
  var s = TidePool.createSession({ random: always(0) });
  var castle = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "sandcastle";
  });
  var result = TidePool.drop(s, castle.id, "sandcastles");
  assert.strictEqual(result.ok, true);
  assert.ok(result.session.sandIds.indexOf(castle.id) === -1);
  assert.ok(result.session.placed.sandcastles.indexOf(castle.id) !== -1);
});

test("incorrect drop returns to the sand", function () {
  var s = TidePool.createSession({ random: always(0) });
  var castle = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "sandcastle";
  });
  var result = TidePool.drop(s, castle.id, "shells");
  assert.strictEqual(result.ok, false);
  assert.ok(result.session.sandIds.indexOf(castle.id) !== -1);
  assert.deepStrictEqual(result.session.placed.shells, []);
});

test("emptying the sand marks the round complete", function () {
  var s = finishRound(TidePool.createSession({ random: always(0) }));
  assert.strictEqual(s.complete, true);
});

test("advance moves to the next round at the same difficulty", function () {
  var s = finishRound(TidePool.createSession({ random: always(0) }));
  s = TidePool.advance(s, always(0));
  assert.strictEqual(s.roundIndex, 1);
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.complete, false);
  assert.ok(s.sandIds.length >= 4);
});

test("medium lookalike: spiral is not a sandcastle", function () {
  var s = TidePool.createSessionAt(3, { difficulty: "medium", random: always(0) });
  var spiral = TidePool.currentRound(s).items.find(function (i) {
    return i.variant === "spiral" && i.color === "cream";
  });
  assert.ok(spiral);
  assert.ok(hasSandTurret(s));
  assert.strictEqual(TidePool.drop(s, spiral.id, "sandcastles").ok, false);
  s = TidePool.createSessionAt(3, { difficulty: "medium", random: always(0) });
  spiral = TidePool.currentRound(s).items.find(function (i) {
    return i.variant === "spiral" && i.color === "cream";
  });
  assert.strictEqual(TidePool.drop(s, spiral.id, "shells").ok, true);
});

test("hard two-rule: only orange shells enter the shells pool; orange castle does not", function () {
  var s = TidePool.createSessionAt(5, { difficulty: "hard", random: always(0) });
  assert.strictEqual(s.twoRule, true);
  var orangeShell = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "shell" && i.color === "orange";
  });
  var orangeCastle = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "sandcastle" && i.color === "orange";
  });
  var pale = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "shell" && i.color !== "orange";
  });
  assert.ok(orangeShell);
  assert.ok(orangeCastle);
  assert.strictEqual(pale, undefined);
  assert.strictEqual(TidePool.drop(s, orangeCastle.id, "shells").ok, false);
  assert.strictEqual(TidePool.drop(s, orangeCastle.id, "sandcastles").ok, true);
  s = TidePool.createSessionAt(5, { difficulty: "hard", random: always(0) });
  orangeShell = TidePool.currentRound(s).items.find(function (i) {
    return i.kind === "shell" && i.color === "orange";
  });
  assert.strictEqual(TidePool.drop(s, orangeShell.id, "shells").ok, true);
});

test("play again keeps difficulty and starts at round 1", function () {
  var s = TidePool.createSessionAt(2, { difficulty: "hard", random: always(0) });
  var again = TidePool.playAgain(s, always(0));
  assert.strictEqual(again.difficulty, "hard");
  assert.strictEqual(again.roundIndex, 0);
  assert.strictEqual(TidePool.playAgain().roundIndex, 0);
  assert.strictEqual(TidePool.playAgain().difficulty, "medium");
});

test("easy never emits spiral, orange, or two-rule", function () {
  assert.strictEqual(TidePool.ROUND_COUNT, 6);
  [always(0), always(0.5), always(0.99)].forEach(function (rng) {
    for (var i = 0; i < TidePool.ROUND_COUNT; i++) {
      var s = TidePool.createSessionAt(i, { difficulty: "easy", random: rng });
      assert.strictEqual(s.twoRule, false);
      TidePool.currentRound(s).items.forEach(function (item) {
        assert.notStrictEqual(item.variant, "spiral");
        assert.notStrictEqual(item.color, "orange");
      });
    }
  });
});

test("medium lookalike rounds include cream spiral and sand turret; round 1 has no spiral", function () {
  var r1 = TidePool.createSessionAt(0, { difficulty: "medium", random: always(0) });
  assert.strictEqual(hasCreamSpiral(r1), false);
  [3, 4, 5].forEach(function (idx) {
    var s = TidePool.createSessionAt(idx, { difficulty: "medium", random: always(0) });
    assert.ok(hasCreamSpiral(s));
    assert.ok(hasSandTurret(s));
  });
});

test("hard lookalike indexes 2-4; index 0 has no spiral; index 5 is two-rule", function () {
  var r1 = TidePool.createSessionAt(0, { difficulty: "hard", random: always(0) });
  assert.strictEqual(hasCreamSpiral(r1), false);
  [2, 3, 4].forEach(function (idx) {
    var s = TidePool.createSessionAt(idx, { difficulty: "hard", random: always(0) });
    assert.ok(hasCreamSpiral(s));
    assert.ok(hasSandTurret(s));
    assert.strictEqual(s.twoRule, false);
  });
  var last = TidePool.createSessionAt(5, { difficulty: "hard", random: always(0) });
  assert.strictEqual(last.twoRule, true);
  assert.strictEqual(hasCreamSpiral(last), false);
});

test("easy pool order is always castle shell rock", function () {
  var s = TidePool.createSession({ difficulty: "easy", random: always(0) });
  assert.deepStrictEqual(s.pools.map(function (p) { return p.id; }), [
    "sandcastles",
    "shells",
    "rocks"
  ]);
});

test("rock pool label names rocks and sticks", function () {
  var s = TidePool.createSession({ difficulty: "easy", random: always(0) });
  var rocks = s.pools.filter(function (p) { return p.id === "rocks"; })[0];
  assert.ok(rocks);
  assert.strictEqual(rocks.label, "rocks and sticks");
});

test("driftwood is named stick", function () {
  var wood = null;
  for (var i = 0; i < 80 && !wood; i++) {
    var s = TidePool.createSessionAt(5, { difficulty: "easy", random: lcg(i + 7) });
    wood = s.items.filter(function (item) { return item.variant === "driftwood"; })[0] || null;
  }
  assert.ok(wood);
  assert.strictEqual(wood.label, "stick");
});

test("medium keeps pool order across advance", function () {
  var s = TidePool.createSession({ difficulty: "medium", random: always(0) });
  var before = s.pools.map(function (p) { return p.id; }).join(",");
  s = finishRound(s);
  s = TidePool.advance(s, always(0.99));
  var after = s.pools.map(function (p) { return p.id; }).join(",");
  assert.strictEqual(after, before);
});

test("hard can change pool order on advance", function () {
  var s = TidePool.createSession({ difficulty: "hard", random: always(0) });
  var before = s.pools.map(function (p) { return p.id; }).join(",");
  s = finishRound(s);
  s = TidePool.advance(s, always(0.99));
  var after = s.pools.map(function (p) { return p.id; }).join(",");
  assert.notStrictEqual(after, before);
});

test("two different random stubs can produce different beaches", function () {
  var a = TidePool.createSession({ random: always(0) });
  var b = TidePool.createSession({ random: always(0.99) });
  var sameItems = sorted(a.items.map(function (i) { return i.id; })).join(",") ===
    sorted(b.items.map(function (i) { return i.id; })).join(",");
  var sameOrder = a.sandIds.join(",") === b.sandIds.join(",");
  assert.ok(!sameItems || !sameOrder);
});

function lcg(seed) {
  var s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("easy can draw the new castle, shell, and rock shapes", function () {
  var seenCastle = {};
  var seenShell = {};
  var seenRock = {};
  for (var i = 0; i < 90; i++) {
    var s = TidePool.createSessionAt(i % 6, { difficulty: "easy", random: lcg(i + 3) });
    s.items.forEach(function (item) {
      if (item.kind === "sandcastle") seenCastle[item.variant] = true;
      if (item.kind === "shell") seenShell[item.variant] = true;
      if (item.kind === "rock") seenRock[item.variant] = true;
    });
  }
  ["turret", "drip", "bucket", "keep", "mound", "cone"].forEach(function (v) {
    assert.ok(seenCastle[v], "missing castle " + v);
  });
  ["scallop", "snail", "conch", "cowrie", "clam"].forEach(function (v) {
    assert.ok(seenShell[v], "missing shell " + v);
  });
  ["pebble", "speckled", "driftwood", "barnacle", "kelp", "seaglass"].forEach(function (v) {
    assert.ok(seenRock[v], "missing rock " + v);
  });
});

test("kelp is named stick", function () {
  var found = null;
  for (var i = 0; i < 80 && !found; i++) {
    var s = TidePool.createSessionAt(5, { difficulty: "easy", random: lcg(i + 20) });
    found = s.items.filter(function (item) { return item.variant === "kelp"; })[0] || null;
  }
  assert.ok(found);
  assert.strictEqual(found.label, "stick");
});

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
