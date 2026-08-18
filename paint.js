/**
 * Paint by Number — palettes, layouts, fill.
 * Works in Node (tests) and the browser (window.Paint).
 */
(function (root) {
  "use strict";

  var PICTURES = ["sun", "crab", "sandcastle", "fish", "starfish", "boat", "shell", "bucket"];
  var PICTURE_COUNT = PICTURES.length;
  var COLORS = ["sunflower", "orange", "coral", "peach", "sand", "foam", "sky", "water", "kelp", "navy"];
  var COLOR_HEX = {
    sunflower: "#ffe14a",
    orange: "#f4a03c",
    coral: "#e24b3c",
    peach: "#f7c09a",
    sand: "#f2d04a",
    foam: "#fff8ee",
    sky: "#4eb0ea",
    water: "#2aa8a8",
    kelp: "#2f7a52",
    navy: "#2a3a6a"
  };
  var PALETTES = {
    sun: ["sunflower", "orange", "sky", "foam", "sand", "water", "coral", "peach"],
    crab: ["coral", "sand", "foam", "kelp", "orange", "water", "peach", "sunflower"],
    sandcastle: ["sand", "orange", "sky", "navy", "foam", "kelp", "sunflower", "water"],
    fish: ["water", "sunflower", "foam", "navy", "coral", "kelp", "orange", "peach"],
    starfish: ["orange", "sand", "water", "foam", "coral", "sunflower", "peach", "kelp"],
    boat: ["coral", "foam", "sky", "water", "sunflower", "navy", "sand", "orange"],
    shell: ["peach", "orange", "sand", "foam", "sunflower", "water", "coral", "sky"],
    bucket: ["coral", "sand", "foam", "navy", "sky", "orange", "sunflower", "water"]
  };

  var FACETS =
    typeof PAINT_FACETS !== "undefined"
      ? PAINT_FACETS
      : typeof require === "function"
        ? require("./paint-layouts.js")
        : {};

  function normalizeDifficulty(value) {
    if (value === "easy" || value === "hard" || value === "medium") return value;
    return "medium";
  }

  function grid(difficulty) {
    var d = normalizeDifficulty(difficulty);
    if (d === "easy") return { cells: 10, colors: 4 };
    if (d === "hard") return { cells: 40, colors: 8 };
    return { cells: 20, colors: 6 };
  }

  function pickIndex(n, random) {
    if (n <= 0) return 0;
    var i = Math.floor(random() * n);
    if (i < 0) return 0;
    if (i >= n) return n - 1;
    return i;
  }

  function clampPicture(index) {
    if (typeof index !== "number" || index !== index) return 0;
    var i = Math.floor(index);
    if (i < 0) return 0;
    if (i >= PICTURE_COUNT) return PICTURE_COUNT - 1;
    return i;
  }

  function palette(pictureIndex, difficulty) {
    var id = PICTURES[clampPicture(pictureIndex)];
    return PALETTES[id].slice(0, grid(difficulty).colors);
  }

  function colorName(pictureIndex, colorNumber) {
    if (colorNumber < 1 || colorNumber > 8 || colorNumber !== Math.floor(colorNumber)) return null;
    return PALETTES[PICTURES[clampPicture(pictureIndex)]][colorNumber - 1] || null;
  }

  function hex(name) {
    return COLOR_HEX[name] || "#fff8ee";
  }

  function layout(pictureIndex, difficulty) {
    var d = normalizeDifficulty(difficulty);
    var id = PICTURES[clampPicture(pictureIndex)];
    var rows = (FACETS[id] && FACETS[id][d]) || [];
    return rows.map(function (cell, i) {
      return {
        id: i,
        color: cell.color,
        d: cell.d,
        lx: cell.lx,
        ly: cell.ly
      };
    });
  }

  function cloneSession(s) {
    var filled = {};
    Object.keys(s.filled).forEach(function (k) {
      filled[k] = s.filled[k];
    });
    return {
      difficulty: s.difficulty,
      pictureIndex: s.pictureIndex,
      selectedColor: s.selectedColor,
      cells: s.cells.map(function (c) {
        return { id: c.id, color: c.color };
      }),
      filled: filled,
      complete: s.complete
    };
  }

  function createSession(opts) {
    opts = opts || {};
    var difficulty = normalizeDifficulty(opts.difficulty);
    var random = typeof opts.random === "function" ? opts.random : Math.random;
    var pictureIndex = pickIndex(PICTURE_COUNT, random);
    var cells = layout(pictureIndex, difficulty).map(function (c) {
      return { id: c.id, color: c.color };
    });
    return {
      difficulty: difficulty,
      pictureIndex: pictureIndex,
      selectedColor: null,
      cells: cells,
      filled: {},
      complete: false
    };
  }

  function pictureId(session) {
    return PICTURES[clampPicture(session.pictureIndex)];
  }

  function pictureSrc(session) {
    return "assets/paint/" + pictureId(session) + "-outline.png";
  }

  function selectColor(session, n) {
    var next = cloneSession(session);
    var k = grid(session.difficulty).colors;
    if (typeof n !== "number" || n !== Math.floor(n) || n < 1 || n > k) {
      return { ok: false, session: next };
    }
    next.selectedColor = n;
    return { ok: true, session: next };
  }

  function fill(session, cellId) {
    var next = cloneSession(session);
    if (next.selectedColor == null) return { ok: false, session: next };
    var cell = null;
    var i;
    for (i = 0; i < next.cells.length; i++) {
      if (next.cells[i].id === cellId) {
        cell = next.cells[i];
        break;
      }
    }
    if (!cell) return { ok: false, session: next };
    if (next.filled[cellId]) return { ok: false, session: next };
    if (cell.color !== next.selectedColor) return { ok: false, session: next };
    next.filled[cellId] = true;
    var done = true;
    for (i = 0; i < next.cells.length; i++) {
      if (!next.filled[next.cells[i].id]) done = false;
    }
    next.complete = done;
    return { ok: true, session: next };
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  var Paint = {
    PICTURE_COUNT: PICTURE_COUNT,
    PICTURES: PICTURES,
    COLORS: COLORS,
    grid: grid,
    palette: palette,
    colorName: colorName,
    hex: hex,
    layout: layout,
    pictureId: pictureId,
    pictureSrc: pictureSrc,
    createSession: createSession,
    selectColor: selectColor,
    fill: fill,
    playAgain: playAgain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Paint;
  } else {
    root.Paint = Paint;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
