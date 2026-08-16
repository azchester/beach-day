/**
 * Crab Path — hop to the bucket.
 * Works in Node (tests) and the browser (window.CrabPath).
 */
(function (root) {
  "use strict";

  function parse(rows) {
    var height = rows.length;
    var width = rows[0].length;
    var cells = [];
    var start = null;
    var goal = null;
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) {
        var ch = rows[y].charAt(x);
        var type = "sand";
        if (ch === "#") type = "rock";
        else if (ch === "~") type = "water";
        else if (ch === "C") {
          type = "sand";
          start = { x: x, y: y };
        } else if (ch === "B") {
          type = "goal";
          goal = { x: x, y: y };
        }
        row.push(type);
      }
      cells.push(row);
    }
    return { width: width, height: height, cells: cells, start: start, goal: goal };
  }

  var LEVELS = [
    parse(["C...B", "....."]),
    parse(["C.#.B", "....."]),
    parse(["C.#.B", ".#...", "....."]),
    parse(["C.~.B", ".#...", "....."]),
    parse(["C.#~B", "..#..", "....."]),
    parse(["C#..B", ".~.#.", "....."])
  ];

  function cloneSession(s) {
    return {
      levelIndex: s.levelIndex,
      crab: { x: s.crab.x, y: s.crab.y },
      complete: s.complete,
      finished: s.finished
    };
  }

  function sessionFromLevel(levelIndex) {
    var level = LEVELS[levelIndex];
    return {
      levelIndex: levelIndex,
      crab: { x: level.start.x, y: level.start.y },
      complete: false,
      finished: false
    };
  }

  function createSession() {
    return sessionFromLevel(0);
  }

  function createSessionAt(levelIndex) {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) {
      throw new Error("no such path");
    }
    return sessionFromLevel(levelIndex);
  }

  function currentLevel(session) {
    return LEVELS[session.levelIndex];
  }

  function inBounds(level, x, y) {
    return x >= 0 && y >= 0 && x < level.width && y < level.height;
  }

  function cellAt(session, x, y) {
    var level = currentLevel(session);
    if (!inBounds(level, x, y)) return "out";
    return level.cells[y][x];
  }

  function walkable(type) {
    return type === "sand" || type === "goal";
  }

  function legalMoves(session) {
    var dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    var moves = [];
    for (var i = 0; i < dirs.length; i++) {
      var x = session.crab.x + dirs[i].x;
      var y = session.crab.y + dirs[i].y;
      if (walkable(cellAt(session, x, y))) {
        moves.push({ x: x, y: y });
      }
    }
    return moves;
  }

  function step(session, x, y) {
    var next = cloneSession(session);
    var ok = false;
    var moves = legalMoves(next);
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].x === x && moves[i].y === y) {
        ok = true;
        break;
      }
    }
    if (!ok) return { ok: false, session: next };
    next.crab = { x: x, y: y };
    var goal = currentLevel(next).goal;
    next.complete = x === goal.x && y === goal.y;
    return { ok: true, session: next };
  }

  function advance(session) {
    var next = cloneSession(session);
    if (!next.complete || next.finished) return next;
    if (next.levelIndex >= LEVELS.length - 1) {
      next.finished = true;
      return next;
    }
    return sessionFromLevel(next.levelIndex + 1);
  }

  function playAgain() {
    return createSession();
  }

  var CrabPath = {
    LEVELS: LEVELS,
    createSession: createSession,
    createSessionAt: createSessionAt,
    currentLevel: currentLevel,
    cellAt: cellAt,
    legalMoves: legalMoves,
    step: step,
    advance: advance,
    playAgain: playAgain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CrabPath;
  } else {
    root.CrabPath = CrabPath;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
