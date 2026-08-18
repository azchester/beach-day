/**
 * Sandcastle Stack rules.
 * Run: node test/stack.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var Sandcastle = require(path.join(__dirname, "..", "stack.js"));

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

function sorted(arr) {
  return arr.slice().sort();
}

function targetPairs(s) {
  return s.spots.map(function (spot) {
    return s.target[spot].kind + "-" + s.target[spot].color;
  });
}

function trayOf(s, kind, color) {
  return s.tray.filter(function (p) {
    return p.kind === kind && p.color === color;
  });
}

function placeMatching(s, spot) {
  var want = s.target[spot];
  var piece = s.tray.filter(function (p) {
    return p.kind === want.kind && p.color === want.color;
  })[0];
  assert.ok(piece, "no tray piece for " + spot);
  return Sandcastle.place(s, piece.id, spot);
}

function fillCastle(s) {
  var guard = 0;
  while (!s.complete && guard < 12) {
    var open = Sandcastle.openSpots(s);
    assert.ok(open.length, "no open spots while incomplete");
    s = placeMatching(s, open[0]).session;
    guard += 1;
  }
  return s;
}

function decoyPairs(s) {
  var used = {};
  s.spots.forEach(function (spot) {
    used[s.target[spot].kind + "-" + s.target[spot].color] = true;
  });
  return s.tray
    .filter(function (p) {
      return !used[p.kind + "-" + p.color];
    })
    .map(function (p) {
      return p.kind + "-" + p.color;
    });
}

test("createSession with no args is medium castle 1", function () {
  var s = Sandcastle.createSession({ random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
  assert.strictEqual(s.roundIndex, 0);
  assert.strictEqual(Sandcastle.createSession().difficulty, "medium");
  assert.strictEqual(Sandcastle.ROUND_COUNT, 6);
});

test("unknown difficulty is medium", function () {
  var s = Sandcastle.createSession({ difficulty: "banana", random: always(0) });
  assert.strictEqual(s.difficulty, "medium");
});

test("Easy 0 is sand bucket plus sand drip and only the base is open", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  assert.deepStrictEqual(s.spots, ["base", "top"]);
  assert.deepStrictEqual(s.target.base, { kind: "bucket", color: "sand" });
  assert.deepStrictEqual(s.target.top, { kind: "drip", color: "sand" });
  assert.strictEqual(s.tray.length, 2);
  assert.deepStrictEqual(Sandcastle.openSpots(s), ["base"]);
  var castle = Sandcastle.currentCastle(s);
  assert.deepStrictEqual(castle.spots, s.spots);
});

test("Easy 1 has a sand turret on top", function () {
  var s = Sandcastle.createSessionAt(1, { difficulty: "easy", random: always(0) });
  assert.deepStrictEqual(s.target.top, { kind: "turret", color: "sand" });
  assert.strictEqual(s.tray.length, 2);
});

test("Easy 2 has a sand turret decoy and starts with base open", function () {
  var s = Sandcastle.createSessionAt(2, { difficulty: "easy", random: always(0) });
  assert.strictEqual(s.tray.length, 3);
  assert.strictEqual(trayOf(s, "turret", "sand").length, 1);
  assert.deepStrictEqual(Sandcastle.openSpots(s), ["base"]);
});

test("after a correct Easy 0 base the top opens", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var before = s.tray.length;
  s = placeMatching(s, "base").session;
  assert.deepStrictEqual(Sandcastle.openSpots(s), ["top"]);
  assert.strictEqual(s.tray.length, before - 1);
  assert.strictEqual(s.filled.base.kind, "bucket");
});

test("Medium 0 opens left and right after the base", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "medium", random: always(0) });
  assert.deepStrictEqual(sorted(s.spots), ["base", "left", "right"]);
  assert.ok(s.spots.indexOf("top") === -1);
  s = placeMatching(s, "base").session;
  assert.deepStrictEqual(sorted(Sandcastle.openSpots(s)), ["left", "right"]);
});

test("Hard 0 keeps the top closed until both sides are filled", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "hard", random: always(0) });
  assert.deepStrictEqual(sorted(s.spots), ["base", "left", "right", "top"]);
  assert.strictEqual(s.tray.length, 4);
  s = placeMatching(s, "base").session;
  assert.ok(Sandcastle.openSpots(s).indexOf("top") === -1);
  s = placeMatching(s, "left").session;
  assert.ok(Sandcastle.openSpots(s).indexOf("top") === -1);
  s = placeMatching(s, "right").session;
  assert.deepStrictEqual(Sandcastle.openSpots(s), ["top"]);
});

test("wrong kind or color on an open spot is rejected", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var drip = trayOf(s, "drip", "sand")[0];
  var trayBefore = s.tray.map(function (p) { return p.id; }).slice();
  var result = Sandcastle.place(s, drip.id, "base");
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(
    result.session.tray.map(function (p) { return p.id; }),
    trayBefore
  );
  assert.strictEqual(result.session.filled.base, null);
});

test("place on a locked spot is rejected", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var drip = trayOf(s, "drip", "sand")[0];
  var result = Sandcastle.place(s, drip.id, "top");
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.session.filled.top, null);
});

test("place of a piece not in the tray is rejected", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var result = Sandcastle.place(s, "no-such-piece", "base");
  assert.strictEqual(result.ok, false);
});

test("correct place does not mutate the input session", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var trayLen = s.tray.length;
  var result = placeMatching(s, "base");
  assert.strictEqual(result.ok, true);
  assert.strictEqual(s.tray.length, trayLen);
  assert.strictEqual(s.filled.base, null);
  assert.ok(result.session.filled.base);
});

test("filling the last spot sets complete", function () {
  var s = fillCastle(Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) }));
  assert.strictEqual(s.complete, true);
  assert.strictEqual(s.tray.length, 0);
});

test("advance goes to the next castle at the same difficulty", function () {
  var s = fillCastle(Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) }));
  s = Sandcastle.advance(s, always(0));
  assert.strictEqual(s.roundIndex, 1);
  assert.strictEqual(s.difficulty, "easy");
  assert.strictEqual(s.complete, false);
});

test("advance after complete castle 6 sets finished", function () {
  var s = fillCastle(Sandcastle.createSessionAt(5, { difficulty: "easy", random: always(0) }));
  s = Sandcastle.advance(s, always(0));
  assert.strictEqual(s.roundIndex, 5);
  assert.strictEqual(s.finished, true);
});

test("playAgain returns castle 1 at the same difficulty", function () {
  var s = Sandcastle.createSessionAt(3, { difficulty: "hard", random: always(0) });
  var again = Sandcastle.playAgain(s, always(0));
  assert.strictEqual(again.roundIndex, 0);
  assert.strictEqual(again.difficulty, "hard");
  assert.strictEqual(Sandcastle.playAgain().roundIndex, 0);
  assert.strictEqual(Sandcastle.playAgain().difficulty, "medium");
});

test("no decoy shares kind and color with a target slot", function () {
  ["easy", "medium", "hard"].forEach(function (diff) {
    for (var i = 0; i < 6; i++) {
      var s = Sandcastle.createSessionAt(i, { difficulty: diff, random: always(0.3) });
      var used = {};
      s.spots.forEach(function (spot) {
        used[s.target[spot].kind + "-" + s.target[spot].color] = true;
      });
      decoyPairs(s).forEach(function (pair) {
        assert.strictEqual(used[pair], undefined, diff + " " + i + " decoy " + pair);
      });
    }
  });
});

test("Easy 4 tray includes a sand turret and one orange piece", function () {
  var s = Sandcastle.createSessionAt(4, { difficulty: "easy", random: always(0) });
  assert.ok(trayOf(s, "turret", "sand").length >= 1);
  assert.ok(
    s.tray.some(function (p) {
      return p.color === "orange";
    })
  );
});

test("Medium 5 tray includes a drip decoy", function () {
  var s = Sandcastle.createSessionAt(5, { difficulty: "medium", random: always(0) });
  assert.ok(decoyPairs(s).some(function (pair) { return pair.indexOf("drip-") === 0; }));
});

test("Hard 3 tray includes a drip whose color is not the top color", function () {
  var s = Sandcastle.createSessionAt(3, { difficulty: "hard", random: always(0) });
  var topColor = s.target.top.color;
  assert.ok(
    s.tray.some(function (p) {
      return p.kind === "drip" && p.color !== topColor;
    })
  );
});

test("two medium sessions with different stubs can differ", function () {
  var a = Sandcastle.createSession({ difficulty: "medium", random: always(0) });
  var b = Sandcastle.createSession({ difficulty: "medium", random: always(0.99) });
  var sameTarget = JSON.stringify(targetPairs(a)) === JSON.stringify(targetPairs(b));
  var sameTray = JSON.stringify(
    a.tray.map(function (p) { return p.kind + "-" + p.color; })
  ) === JSON.stringify(
    b.tray.map(function (p) { return p.kind + "-" + p.color; })
  );
  assert.ok(!sameTarget || !sameTray);
});

test("advance keeps difficulty", function () {
  var s = fillCastle(Sandcastle.createSession({ difficulty: "hard", random: always(0) }));
  s = Sandcastle.advance(s, always(0));
  assert.strictEqual(s.difficulty, "hard");
});

test("a decoy is never a clone of a target pair", function () {
  ["easy", "medium", "hard"].forEach(function (diff) {
    for (var i = 0; i < 6; i++) {
      var s = Sandcastle.createSessionAt(i, { difficulty: diff, random: always(0.7) });
      var used = {};
      s.spots.forEach(function (spot) {
        used[s.target[spot].kind + "-" + s.target[spot].color] = true;
      });
      s.tray.forEach(function (p) {
        var pair = p.kind + "-" + p.color;
        var needed = s.spots.filter(function (spot) {
          return s.target[spot].kind === p.kind && s.target[spot].color === p.color;
        }).length;
        var copies = s.tray.filter(function (q) {
          return q.kind === p.kind && q.color === p.color;
        }).length;
        if (!used[pair]) return;
        assert.ok(copies <= needed, diff + " " + i + " extra " + pair);
      });
    }
  });
});

test("pieceById finds tray and filled pieces", function () {
  var s = Sandcastle.createSessionAt(0, { difficulty: "easy", random: always(0) });
  var id = s.tray[0].id;
  assert.strictEqual(Sandcastle.pieceById(s, id).id, id);
  s = placeMatching(s, "base").session;
  assert.strictEqual(Sandcastle.pieceById(s, s.filled.base.id).kind, "bucket");
  assert.strictEqual(Sandcastle.pieceById(s, "missing"), null);
});

test("createSessionAt throws for a bad round index", function () {
  var threw = false;
  try {
    Sandcastle.createSessionAt(9, { difficulty: "easy", random: always(0) });
  } catch (e) {
    threw = true;
  }
  assert.ok(threw);
});

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
