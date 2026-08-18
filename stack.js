/**
 * Sandcastle Stack — recipes, generator, and place rules.
 * Works in Node (tests) and the browser (window.Sandcastle).
 */
(function (root) {
  "use strict";

  var ROUND_COUNT = 6;

  var CATALOG = [
    { kind: "bucket", color: "sand" },
    { kind: "turret", color: "sand" },
    { kind: "drip", color: "sand" },
    { kind: "bucket", color: "orange" },
    { kind: "turret", color: "orange" },
    { kind: "drip", color: "orange" }
  ];

  function recipe(spots, topKind, colorMode, decoys, decoyNeed) {
    return {
      spots: spots.slice(),
      topKind: topKind,
      colorMode: colorMode,
      decoys: decoys,
      decoyNeed: decoyNeed.slice()
    };
  }

  var BASE_TOP = ["base", "top"];
  var FORT = ["base", "left", "right"];
  var FULL = ["base", "left", "right", "top"];

  var RECIPES = {
    easy: [
      recipe(BASE_TOP, "drip", "sand", 0, []),
      recipe(BASE_TOP, "turret", "sand", 0, []),
      recipe(BASE_TOP, "drip", "sand", 1, ["sand-turret"]),
      recipe(BASE_TOP, "turret", "sand", 1, ["sand-drip"]),
      recipe(BASE_TOP, "drip", "sand", 2, ["sand-turret", "any-orange"]),
      recipe(BASE_TOP, "turret", "sand", 2, ["sand-drip", "any-orange"])
    ],
    medium: [
      recipe(FORT, "drip", "sand", 0, []),
      recipe(FORT, "drip", "sand", 1, ["sand-drip"]),
      recipe(FORT, "drip", "one-orange-side", 1, []),
      recipe(FORT, "drip", "mixed", 2, []),
      recipe(FORT, "drip", "sides-different", 2, []),
      recipe(FORT, "drip", "mixed", 2, ["any-drip"])
    ],
    hard: [
      recipe(FULL, "drip", "sand", 0, []),
      recipe(FULL, "drip", "mixed", 2, []),
      recipe(FULL, "drip", "sides-different", 2, []),
      recipe(FULL, "drip", "mixed", 3, ["any-drip"]),
      recipe(FULL, "drip", "orange-base", 3, []),
      recipe(FULL, "drip", "sides-different", 3, [])
    ]
  };

  function normalizeDifficulty(value) {
    if (value === "easy" || value === "hard" || value === "medium") return value;
    return "medium";
  }

  function normalizeOptions(opts) {
    opts = opts || {};
    return {
      difficulty: normalizeDifficulty(opts.difficulty),
      random: typeof opts.random === "function" ? opts.random : Math.random
    };
  }

  function kindForSpot(spot, topKind) {
    if (spot === "base") return "bucket";
    if (spot === "left" || spot === "right") return "turret";
    return topKind;
  }

  function pairKey(kind, color) {
    return kind + "-" + color;
  }

  function shuffle(arr, random) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function assignColors(spots, colorMode, random) {
    var colors = {};
    var i;
    if (colorMode === "sand") {
      for (i = 0; i < spots.length; i++) colors[spots[i]] = "sand";
      return colors;
    }
    if (colorMode === "one-orange-side") {
      colors.base = "sand";
      if (random() < 0.5) {
        colors.left = "orange";
        colors.right = "sand";
      } else {
        colors.left = "sand";
        colors.right = "orange";
      }
      return colors;
    }
    if (colorMode === "sides-different") {
      colors.left = random() < 0.5 ? "sand" : "orange";
      colors.right = colors.left === "sand" ? "orange" : "sand";
      colors.base = "sand";
      if (spots.indexOf("top") !== -1) colors.top = random() < 0.5 ? "sand" : "orange";
      return colors;
    }
    if (colorMode === "orange-base") {
      colors.base = "orange";
      if (spots.indexOf("left") !== -1) colors.left = random() < 0.5 ? "sand" : "orange";
      if (spots.indexOf("right") !== -1) colors.right = random() < 0.5 ? "sand" : "orange";
      if (spots.indexOf("top") !== -1) colors.top = random() < 0.5 ? "sand" : "orange";
      return colors;
    }
    for (i = 0; i < spots.length; i++) {
      colors[spots[i]] = random() < 0.5 ? "sand" : "orange";
    }
    var hasSand = false;
    var hasOrange = false;
    for (i = 0; i < spots.length; i++) {
      if (colors[spots[i]] === "sand") hasSand = true;
      else hasOrange = true;
    }
    if (!hasOrange) {
      colors[spots[Math.floor(random() * spots.length)]] = "orange";
    } else if (!hasSand) {
      colors[spots[Math.floor(random() * spots.length)]] = "sand";
    }
    return colors;
  }

  function matchesNeed(entry, need) {
    if (need === "sand-turret") return entry.kind === "turret" && entry.color === "sand";
    if (need === "sand-drip") return entry.kind === "drip" && entry.color === "sand";
    if (need === "any-orange") return entry.color === "orange";
    if (need === "any-drip") return entry.kind === "drip";
    if (need === "any-turret") return entry.kind === "turret";
    return false;
  }

  function takeFirst(list, pred) {
    for (var i = 0; i < list.length; i++) {
      if (pred(list[i])) {
        return list.splice(i, 1)[0];
      }
    }
    return null;
  }

  function sessionFromRound(roundIndex, opts) {
    var options = normalizeOptions(opts);
    var rec = RECIPES[options.difficulty][roundIndex];
    var spots = rec.spots.slice();
    var colors = assignColors(spots, rec.colorMode, options.random);
    var target = {};
    var used = {};
    var tray = [];
    var filled = {};
    var nextId = 0;
    var i;

    function addPiece(kind, color) {
      var piece = { id: "p" + nextId, kind: kind, color: color };
      nextId += 1;
      tray.push(piece);
      return piece;
    }

    for (i = 0; i < spots.length; i++) {
      var spot = spots[i];
      var kind = kindForSpot(spot, rec.topKind);
      var color = colors[spot];
      target[spot] = { kind: kind, color: color };
      used[pairKey(kind, color)] = true;
      filled[spot] = null;
      addPiece(kind, color);
    }

    var unused = [];
    for (i = 0; i < CATALOG.length; i++) {
      if (!used[pairKey(CATALOG[i].kind, CATALOG[i].color)]) {
        unused.push({ kind: CATALOG[i].kind, color: CATALOG[i].color });
      }
    }
    unused = shuffle(unused, options.random);

    var extras = [];
    for (i = 0; i < rec.decoyNeed.length; i++) {
      var needed = rec.decoyNeed[i];
      var found = takeFirst(unused, function (entry) {
        return matchesNeed(entry, needed);
      });
      if (found) extras.push(found);
    }
    unused = shuffle(unused, options.random);
    while (extras.length < rec.decoys && unused.length) {
      extras.push(unused.shift());
    }
    while (extras.length < rec.decoys) {
      if (!extras.length) break;
      extras.push({ kind: extras[0].kind, color: extras[0].color });
    }
    for (i = 0; i < extras.length; i++) {
      addPiece(extras[i].kind, extras[i].color);
    }

    return {
      difficulty: options.difficulty,
      roundIndex: roundIndex,
      spots: spots,
      target: target,
      filled: filled,
      tray: shuffle(tray, options.random),
      complete: false,
      finished: false
    };
  }

  function clonePiece(p) {
    if (!p) return null;
    return { id: p.id, kind: p.kind, color: p.color };
  }

  function cloneSession(s) {
    var filled = {};
    var target = {};
    var i;
    for (i = 0; i < s.spots.length; i++) {
      var spot = s.spots[i];
      filled[spot] = clonePiece(s.filled[spot]);
      target[spot] = { kind: s.target[spot].kind, color: s.target[spot].color };
    }
    return {
      difficulty: s.difficulty,
      roundIndex: s.roundIndex,
      spots: s.spots.slice(),
      target: target,
      filled: filled,
      tray: s.tray.map(clonePiece),
      complete: s.complete,
      finished: s.finished
    };
  }

  function createSession(opts) {
    return sessionFromRound(0, opts);
  }

  function createSessionAt(roundIndex, opts) {
    if (roundIndex < 0 || roundIndex >= ROUND_COUNT) throw new Error("no such castle");
    return sessionFromRound(roundIndex, opts);
  }

  function currentCastle(session) {
    return {
      spots: session.spots.slice(),
      target: cloneSession(session).target,
      filled: cloneSession(session).filled,
      tray: session.tray.map(clonePiece)
    };
  }

  function pieceById(session, id) {
    var i;
    for (i = 0; i < session.tray.length; i++) {
      if (session.tray[i].id === id) return clonePiece(session.tray[i]);
    }
    for (i = 0; i < session.spots.length; i++) {
      var piece = session.filled[session.spots[i]];
      if (piece && piece.id === id) return clonePiece(piece);
    }
    return null;
  }

  function hasSpot(session, id) {
    return session.spots.indexOf(id) !== -1;
  }

  function openSpots(session) {
    if (!session.filled.base) return ["base"];
    var open = [];
    if (hasSpot(session, "left") && !session.filled.left) open.push("left");
    if (hasSpot(session, "right") && !session.filled.right) open.push("right");
    var sidesReady =
      (!hasSpot(session, "left") || session.filled.left) &&
      (!hasSpot(session, "right") || session.filled.right);
    if (hasSpot(session, "top") && !session.filled.top && sidesReady) open.push("top");
    return open;
  }

  function trayIndex(session, id) {
    for (var i = 0; i < session.tray.length; i++) {
      if (session.tray[i].id === id) return i;
    }
    return -1;
  }

  function place(session, pieceId, spotId) {
    var next = cloneSession(session);
    var index = trayIndex(next, pieceId);
    if (index === -1) return { ok: false, session: next };
    if (!hasSpot(next, spotId)) return { ok: false, session: next };
    if (next.filled[spotId]) return { ok: false, session: next };
    if (openSpots(next).indexOf(spotId) === -1) return { ok: false, session: next };
    var piece = next.tray[index];
    var want = next.target[spotId];
    if (piece.kind !== want.kind || piece.color !== want.color) {
      return { ok: false, session: next };
    }
    next.tray.splice(index, 1);
    next.filled[spotId] = piece;
    var done = true;
    for (var i = 0; i < next.spots.length; i++) {
      if (!next.filled[next.spots[i]]) done = false;
    }
    next.complete = done;
    return { ok: true, session: next };
  }

  function advance(session, random) {
    var next = cloneSession(session);
    if (!next.complete || next.finished) return next;
    if (next.roundIndex >= ROUND_COUNT - 1) {
      next.finished = true;
      return next;
    }
    return sessionFromRound(next.roundIndex + 1, {
      difficulty: next.difficulty,
      random: random
    });
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  var Sandcastle = {
    ROUND_COUNT: ROUND_COUNT,
    createSession: createSession,
    createSessionAt: createSessionAt,
    currentCastle: currentCastle,
    pieceById: pieceById,
    openSpots: openSpots,
    place: place,
    advance: advance,
    playAgain: playAgain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Sandcastle;
  } else {
    root.Sandcastle = Sandcastle;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
