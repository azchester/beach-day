/**
 * Beach Puzzle — deal, seams, and snap.
 * Works in Node (tests) and the browser (window.Puzzle).
 */
(function (root) {
  "use strict";

  var PICTURES = [
    "assets/puzzles/01-beach.jpg",
    "assets/puzzles/02-sandcastle.jpg",
    "assets/puzzles/03-crab.jpg",
    "assets/puzzles/04-dolphins.jpg",
    "assets/puzzles/05-mermaid.jpg",
    "assets/puzzles/06-kite.jpg",
    "assets/puzzles/07-treasure.jpg",
    "assets/puzzles/08-whale.jpg",
    "assets/puzzles/09-night.jpg",
    "assets/puzzles/10-shell-boat.jpg",
    "assets/puzzles/11-rainbow.jpg",
    "assets/puzzles/12-starfish.jpg"
  ];

  var PICTURE_COUNT = PICTURES.length;

  function normalizeDifficulty(value) {
    if (value === "easy" || value === "hard" || value === "medium") return value;
    return "medium";
  }

  function grid(difficulty) {
    var d = normalizeDifficulty(difficulty);
    if (d === "easy") return { rows: 3, cols: 3 };
    if (d === "hard") return { rows: 5, cols: 5 };
    return { rows: 4, cols: 4 };
  }

  function pickIndex(n, random) {
    if (n <= 0) return 0;
    var i = Math.floor(random() * n);
    if (i < 0) return 0;
    if (i >= n) return n - 1;
    return i;
  }

  function cloneGroups(groups) {
    return groups.map(function (g) {
      return g.slice();
    });
  }

  function cloneSeams(seams) {
    return seams.map(function (row) {
      return row.slice();
    });
  }

  function cloneSession(s) {
    return {
      difficulty: s.difficulty,
      pictureIndex: s.pictureIndex,
      rows: s.rows,
      cols: s.cols,
      vSeams: cloneSeams(s.vSeams),
      hSeams: cloneSeams(s.hSeams),
      groups: cloneGroups(s.groups),
      complete: s.complete
    };
  }

  function createSession(opts) {
    opts = opts || {};
    var difficulty = normalizeDifficulty(opts.difficulty);
    var random = typeof opts.random === "function" ? opts.random : Math.random;
    var size = grid(difficulty);
    var rows = size.rows;
    var cols = size.cols;
    var vSeams = [];
    var hSeams = [];
    var groups = [];
    var r;
    var c;
    var id;
    for (r = 0; r < rows; r++) {
      vSeams[r] = [];
      for (c = 0; c < cols - 1; c++) {
        vSeams[r][c] = random() < 0.5 ? 1 : -1;
      }
    }
    for (r = 0; r < rows - 1; r++) {
      hSeams[r] = [];
      for (c = 0; c < cols; c++) {
        hSeams[r][c] = random() < 0.5 ? 1 : -1;
      }
    }
    for (id = 0; id < rows * cols; id++) {
      groups.push([id]);
    }
    return {
      difficulty: difficulty,
      pictureIndex: pickIndex(PICTURE_COUNT, random),
      rows: rows,
      cols: cols,
      vSeams: vSeams,
      hSeams: hSeams,
      groups: groups,
      complete: false
    };
  }

  function pictureSrc(session) {
    return PICTURES[session.pictureIndex];
  }

  function rowOf(session, id) {
    return Math.floor(id / session.cols);
  }

  function colOf(session, id) {
    return id % session.cols;
  }

  function rowCol(session, id) {
    return { row: rowOf(session, id), col: colOf(session, id) };
  }

  function inBounds(session, row, col) {
    return row >= 0 && col >= 0 && row < session.rows && col < session.cols;
  }

  function idAt(session, row, col) {
    if (!inBounds(session, row, col)) return -1;
    return row * session.cols + col;
  }

  function neighbors(session, pieceId) {
    var rc = rowCol(session, pieceId);
    var out = [];
    var spots = [
      [rc.row - 1, rc.col],
      [rc.row + 1, rc.col],
      [rc.row, rc.col - 1],
      [rc.row, rc.col + 1]
    ];
    var i;
    for (i = 0; i < spots.length; i++) {
      var id = idAt(session, spots[i][0], spots[i][1]);
      if (id >= 0) out.push(id);
    }
    return out;
  }

  function findGroup(session, id) {
    var i;
    for (i = 0; i < session.groups.length; i++) {
      if (session.groups[i].indexOf(id) !== -1) return i;
    }
    return -1;
  }

  function sameGroup(session, a, b) {
    var ga = findGroup(session, a);
    var gb = findGroup(session, b);
    return ga !== -1 && ga === gb;
  }

  function canSnap(session, a, b) {
    if (a === b) return false;
    if (sameGroup(session, a, b)) return false;
    return neighbors(session, a).indexOf(b) !== -1;
  }

  function snap(session, a, b) {
    var next = cloneSession(session);
    if (!canSnap(next, a, b)) return { ok: false, session: next };
    var ga = findGroup(next, a);
    var gb = findGroup(next, b);
    var merged = next.groups[ga].concat(next.groups[gb]);
    var groups = [];
    var i;
    for (i = 0; i < next.groups.length; i++) {
      if (i !== ga && i !== gb) groups.push(next.groups[i]);
    }
    groups.push(merged);
    next.groups = groups;
    next.complete = next.groups.length === 1 && merged.length === next.rows * next.cols;
    return { ok: true, session: next };
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  function edge(session, id, dir) {
    var rc = rowCol(session, id);
    if (dir === "n") {
      if (rc.row === 0) return "flat";
      return session.hSeams[rc.row - 1][rc.col] === 1 ? "blank" : "tab";
    }
    if (dir === "s") {
      if (rc.row === session.rows - 1) return "flat";
      return session.hSeams[rc.row][rc.col] === 1 ? "tab" : "blank";
    }
    if (dir === "w") {
      if (rc.col === 0) return "flat";
      return session.vSeams[rc.row][rc.col - 1] === 1 ? "blank" : "tab";
    }
    if (dir === "e") {
      if (rc.col === session.cols - 1) return "flat";
      return session.vSeams[rc.row][rc.col] === 1 ? "tab" : "blank";
    }
    return "flat";
  }

  var Puzzle = {
    PICTURE_COUNT: PICTURE_COUNT,
    grid: grid,
    createSession: createSession,
    pictureSrc: pictureSrc,
    neighbors: neighbors,
    sameGroup: sameGroup,
    canSnap: canSnap,
    snap: snap,
    playAgain: playAgain,
    rowCol: rowCol,
    edge: edge
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Puzzle;
  } else {
    root.Puzzle = Puzzle;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
