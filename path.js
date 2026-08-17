/**
 * Crab Path — hop to the bucket.
 * Works in Node (tests) and the browser (window.CrabPath).
 */
(function (root) {
  "use strict";

  var PATH_COUNT = 6;

  var RECIPES = {
    easy: [
      rec(5, 2, 0, 0, 4, 4, "top", "same"),
      rec(5, 2, 0, 0, 4, 5, "any", "any"),
      rec(5, 2, 1, 0, 4, 6, "any", "any"),
      rec(5, 3, 1, 0, 5, 7, "any", "any"),
      rec(5, 3, 1, 0, 5, 7, "any", "any"),
      rec(5, 3, 1, 1, 5, 8, "any", "any")
    ],
    medium: [
      rec(5, 3, 1, 0, 5, 7, "any", "any"),
      rec(5, 3, 2, 0, 5, 8, "any", "any"),
      rec(5, 3, 1, 1, 6, 8, "any", "any"),
      rec(6, 3, 2, 1, 6, 9, "any", "any"),
      rec(6, 3, 2, 1, 7, 10, "any", "any"),
      rec(6, 3, 2, 2, 7, 10, "any", "any")
    ],
    hard: [
      rec(6, 3, 2, 0, 6, 9, "any", "any"),
      rec(6, 4, 2, 1, 7, 11, "any", "any"),
      rec(6, 4, 3, 1, 8, 12, "any", "any"),
      rec(6, 4, 3, 2, 8, 13, "any", "any"),
      rec(6, 4, 3, 2, 9, 14, "any", "any"),
      rec(6, 4, 4, 2, 9, 14, "any", "any")
    ]
  };

  function rec(width, height, rocks, water, minPath, maxPath, crabRow, goalAlign) {
    return {
      width: width,
      height: height,
      rocks: rocks,
      water: water,
      minPath: minPath,
      maxPath: maxPath,
      crabRow: crabRow,
      goalAlign: goalAlign
    };
  }

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

  function pickIndex(n, random) {
    if (n <= 0) return 0;
    var i = Math.floor(random() * n);
    if (i < 0) return 0;
    if (i >= n) return n - 1;
    return i;
  }

  function shuffle(arr, random) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = pickIndex(i + 1, random);
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function emptyGrid(width, height) {
    var cells = [];
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) row.push("sand");
      cells.push(row);
    }
    return cells;
  }

  function copyCells(cells) {
    return cells.map(function (row) {
      return row.slice();
    });
  }

  function walkableType(type) {
    return type === "sand" || type === "goal";
  }

  function shortestLen(cells, start, goal) {
    var height = cells.length;
    var width = cells[0].length;
    var seen = {};
    var queue = [{ x: start.x, y: start.y, d: 0 }];
    seen[start.x + "," + start.y] = true;
    var dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    while (queue.length) {
      var here = queue.shift();
      if (here.x === goal.x && here.y === goal.y) return here.d;
      for (var i = 0; i < dirs.length; i++) {
        var nx = here.x + dirs[i].x;
        var ny = here.y + dirs[i].y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        var k = nx + "," + ny;
        if (seen[k]) continue;
        if (!walkableType(cells[ny][nx])) continue;
        seen[k] = true;
        queue.push({ x: nx, y: ny, d: here.d + 1 });
      }
    }
    return -1;
  }

  function tryOnce(recipe, random) {
    var width = recipe.width;
    var height = recipe.height;
    var cells = emptyGrid(width, height);
    var spots = [];
    var y;
    var x;
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) spots.push({ x: x, y: y });
    }
    spots = shuffle(spots, random);
    if (spots.length < 2) return null;
    var start = { x: spots[0].x, y: spots[0].y };
    var goal = { x: spots[1].x, y: spots[1].y };
    cells[goal.y][goal.x] = "goal";

    var open = spots.slice(2);
    var need = recipe.rocks + recipe.water;
    if (open.length < need) return null;
    var i;
    for (i = 0; i < recipe.rocks; i++) cells[open[i].y][open[i].x] = "rock";
    for (i = 0; i < recipe.water; i++) {
      var p = open[recipe.rocks + i];
      cells[p.y][p.x] = "water";
    }
    var len = shortestLen(cells, start, goal);
    if (len < recipe.minPath || len > recipe.maxPath) return null;
    return { width: width, height: height, cells: cells, start: start, goal: goal };
  }

  function loosen(recipe) {
    if (recipe.rocks > 0) {
      return {
        width: recipe.width,
        height: recipe.height,
        rocks: recipe.rocks - 1,
        water: recipe.water,
        minPath: recipe.minPath,
        maxPath: recipe.maxPath,
        crabRow: recipe.crabRow,
        goalAlign: recipe.goalAlign
      };
    }
    if (recipe.water > 0) {
      return {
        width: recipe.width,
        height: recipe.height,
        rocks: recipe.rocks,
        water: recipe.water - 1,
        minPath: recipe.minPath,
        maxPath: recipe.maxPath,
        crabRow: recipe.crabRow,
        goalAlign: recipe.goalAlign
      };
    }
    if (recipe.minPath > 1) {
      return {
        width: recipe.width,
        height: recipe.height,
        rocks: recipe.rocks,
        water: recipe.water,
        minPath: recipe.minPath - 1,
        maxPath: recipe.maxPath,
        crabRow: recipe.crabRow,
        goalAlign: recipe.goalAlign
      };
    }
    return null;
  }

  function generateBoard(recipe, random) {
    var current = recipe;
    while (current) {
      for (var attempt = 0; attempt < 80; attempt++) {
        var board = tryOnce(current, random);
        if (board) return board;
      }
      current = loosen(current);
    }
    throw new Error("could not build a path");
  }

  function cloneSession(s) {
    return {
      difficulty: s.difficulty,
      levelIndex: s.levelIndex,
      width: s.width,
      height: s.height,
      cells: copyCells(s.cells),
      start: { x: s.start.x, y: s.start.y },
      goal: { x: s.goal.x, y: s.goal.y },
      crab: { x: s.crab.x, y: s.crab.y },
      complete: s.complete,
      finished: s.finished
    };
  }

  function sessionFromRound(levelIndex, opts) {
    var options = normalizeOptions(opts);
    var list = RECIPES[options.difficulty];
    if (levelIndex < 0 || levelIndex >= list.length) throw new Error("no such path");
    var board = generateBoard(list[levelIndex], options.random);
    return {
      difficulty: options.difficulty,
      levelIndex: levelIndex,
      width: board.width,
      height: board.height,
      cells: board.cells,
      start: { x: board.start.x, y: board.start.y },
      goal: { x: board.goal.x, y: board.goal.y },
      crab: { x: board.start.x, y: board.start.y },
      complete: false,
      finished: false
    };
  }

  function createSession(opts) {
    return sessionFromRound(0, opts);
  }

  function createSessionAt(levelIndex, opts) {
    return sessionFromRound(levelIndex, opts);
  }

  function currentLevel(session) {
    return {
      width: session.width,
      height: session.height,
      cells: session.cells,
      start: session.start,
      goal: session.goal
    };
  }

  function inBounds(session, x, y) {
    return x >= 0 && y >= 0 && x < session.width && y < session.height;
  }

  function cellAt(session, x, y) {
    if (!inBounds(session, x, y)) return "out";
    return session.cells[y][x];
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
      var type = cellAt(session, x, y);
      if (walkableType(type)) moves.push({ x: x, y: y });
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
    next.complete = x === next.goal.x && y === next.goal.y;
    return { ok: true, session: next };
  }

  function advance(session, random) {
    var next = cloneSession(session);
    if (!next.complete || next.finished) return next;
    if (next.levelIndex >= PATH_COUNT - 1) {
      next.finished = true;
      return next;
    }
    return sessionFromRound(next.levelIndex + 1, {
      difficulty: next.difficulty,
      random: random
    });
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  var CrabPath = {
    PATH_COUNT: PATH_COUNT,
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
