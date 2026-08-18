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

  // 14 zones. Counts by difficulty are identical for every picture.
  // easy 4+3+2+1=10, medium 5+4+3+3+3+2=20, hard 8+7+6+5+5+4+3+2=40
  var ZONE_COUNTS = [
    { color: 1, easy: 1, medium: 2, hard: 3 },
    { color: 1, easy: 1, medium: 1, hard: 2 },
    { color: 1, easy: 1, medium: 1, hard: 2 },
    { color: 1, easy: 1, medium: 1, hard: 1 },
    { color: 2, easy: 1, medium: 2, hard: 3 },
    { color: 2, easy: 1, medium: 1, hard: 2 },
    { color: 2, easy: 1, medium: 1, hard: 2 },
    { color: 3, easy: 1, medium: 2, hard: 3 },
    { color: 3, easy: 1, medium: 1, hard: 3 },
    { color: 4, easy: 1, medium: 3, hard: 5 },
    { color: 5, easy: 0, medium: 3, hard: 5 },
    { color: 6, easy: 0, medium: 2, hard: 4 },
    { color: 7, easy: 0, medium: 0, hard: 3 },
    { color: 8, easy: 0, medium: 0, hard: 2 }
  ];

  // [x, y, w, h] in viewBox 0 0 100 100. Order matches ZONE_COUNTS.
  var BOXES = {
    sun: [
      [38, 36, 24, 24], [44, 8, 12, 26], [10, 42, 26, 14], [44, 64, 12, 26],
      [64, 16, 18, 16], [66, 42, 24, 14], [16, 64, 20, 16], [2, 2, 30, 22],
      [68, 2, 30, 20], [4, 72, 24, 14], [2, 86, 96, 12], [28, 78, 48, 10],
      [42, 48, 16, 8], [50, 40, 10, 8]
    ],
    crab: [
      [30, 38, 40, 24], [6, 24, 24, 18], [70, 24, 24, 18], [36, 30, 28, 14],
      [2, 78, 36, 18], [38, 82, 24, 14], [64, 78, 34, 18], [8, 68, 28, 12],
      [64, 68, 28, 12], [4, 4, 28, 22], [36, 4, 28, 16], [2, 2, 96, 14],
      [40, 44, 12, 8], [44, 10, 12, 10]
    ],
    sandcastle: [
      [30, 42, 40, 28], [34, 22, 14, 20], [52, 22, 14, 20], [40, 8, 20, 16],
      [8, 70, 22, 16], [70, 70, 22, 16], [38, 72, 24, 14], [2, 2, 32, 24],
      [66, 2, 32, 24], [42, 48, 16, 14], [2, 86, 96, 12], [20, 80, 60, 8],
      [4, 50, 16, 16], [80, 50, 16, 16]
    ],
    fish: [
      [22, 36, 40, 26], [62, 32, 22, 16], [62, 50, 22, 16], [18, 42, 14, 14],
      [70, 28, 22, 44], [8, 38, 12, 20], [40, 28, 16, 10], [2, 2, 40, 22],
      [58, 2, 40, 20], [8, 70, 30, 16], [2, 84, 96, 14], [30, 72, 50, 12],
      [36, 40, 10, 8], [48, 48, 10, 8]
    ],
    starfish: [
      [36, 36, 28, 28], [40, 8, 20, 26], [66, 28, 24, 22], [40, 66, 20, 26],
      [10, 28, 24, 22], [8, 66, 22, 18], [70, 66, 22, 18], [2, 2, 30, 20],
      [68, 2, 30, 20], [36, 44, 12, 12], [2, 84, 96, 14], [20, 78, 60, 10],
      [42, 40, 8, 8], [50, 48, 8, 8]
    ],
    boat: [
      [18, 50, 64, 22], [38, 16, 8, 36], [42, 18, 28, 24], [22, 58, 20, 12],
      [54, 10, 16, 16], [36, 12, 10, 12], [8, 70, 24, 14], [2, 2, 40, 22],
      [58, 2, 40, 20], [70, 50, 22, 16], [2, 78, 96, 10], [2, 86, 96, 12],
      [26, 62, 16, 8], [48, 62, 16, 8]
    ],
    shell: [
      [30, 28, 40, 44], [38, 16, 24, 16], [22, 40, 16, 24], [62, 40, 16, 24],
      [18, 68, 28, 16], [54, 68, 28, 16], [36, 72, 28, 14], [2, 78, 40, 18],
      [58, 78, 40, 18], [40, 48, 20, 16], [36, 8, 28, 12], [2, 86, 96, 12],
      [34, 36, 12, 10], [2, 2, 28, 20]
    ],
    bucket: [
      [30, 34, 40, 36], [34, 14, 32, 16], [36, 8, 28, 10], [38, 50, 24, 16],
      [2, 78, 40, 18], [58, 78, 40, 18], [36, 72, 28, 12], [2, 2, 36, 24],
      [62, 2, 36, 24], [42, 40, 16, 12], [8, 28, 16, 16], [76, 28, 16, 16],
      [2, 86, 96, 12], [30, 86, 40, 10]
    ]
  };

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

  function roundedRect(x, y, w, h, r) {
    if (w < 0.5) w = 0.5;
    if (h < 0.5) h = 0.5;
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    return (
      "M" + (x + r) + " " + y +
      "H" + (x + w - r) +
      "Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + r) +
      "V" + (y + h - r) +
      "Q" + (x + w) + " " + (y + h) + " " + (x + w - r) + " " + (y + h) +
      "H" + (x + r) +
      "Q" + x + " " + (y + h) + " " + x + " " + (y + h - r) +
      "V" + (y + r) +
      "Q" + x + " " + y + " " + (x + r) + " " + y +
      "Z"
    );
  }

  function packBox(x, y, w, h, n) {
    var cols = Math.ceil(Math.sqrt(n));
    var rows = Math.ceil(n / cols);
    var cw = w / cols;
    var rh = h / rows;
    var pad = Math.min(cw, rh) * 0.08;
    var out = [];
    var i;
    for (i = 0; i < n; i++) {
      var c = i % cols;
      var r = Math.floor(i / cols);
      out.push(
        roundedRect(
          x + c * cw + pad,
          y + r * rh + pad,
          cw - pad * 2,
          rh - pad * 2,
          Math.min(cw, rh) * 0.22
        )
      );
    }
    return out;
  }

  function layout(pictureIndex, difficulty) {
    var d = normalizeDifficulty(difficulty);
    var boxes = BOXES[PICTURES[clampPicture(pictureIndex)]];
    var cells = [];
    var z;
    for (z = 0; z < ZONE_COUNTS.length; z++) {
      var n = ZONE_COUNTS[z][d];
      if (!n) continue;
      var box = boxes[z];
      var paths = packBox(box[0], box[1], box[2], box[3], n);
      var p;
      for (p = 0; p < paths.length; p++) {
        cells.push({
          id: cells.length,
          color: ZONE_COUNTS[z].color,
          d: paths[p]
        });
      }
    }
    return cells;
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
