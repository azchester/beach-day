# Tide Pool Randomness and Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each Tide Pool Tidy play is a new beach, and the adult picks Easy / Medium / Hard before the sand appears.

**Architecture:** `game.js` replaces static `ROUNDS` lists with per-difficulty recipes plus a generator. Sessions carry `difficulty`, `twoRule`, generated `items`, and ordered `pools`. `app.js` inserts a difficulty screen after choosing Tide Pool Tidy on the Beach Day menu. Tests inject `random()`.

**Tech Stack:** HTML, CSS, vanilla JS. Node `assert` tests. No build step. No new libraries.

## Global Constraints

- No timer, no losing score, no required reading, no autoplay sound, no accounts, no network except existing Google Fonts.
- Six rounds at every difficulty. Default difficulty is `medium`. Unknown difficulty is `medium`.
- Easy: no spiral, no orange, no two-rule; pool order always sandcastles · shells · rocks.
- Medium: lookalike (cream spiral + sand turret) on indexes 3–5; shuffle pools once per play and keep them.
- Hard: lookalike on indexes 2–4; two-rule only on index 5; reshuffle pools every round.
- Two-rule: `session.twoRule === true`; shells pool picture `orange-shell`; accept only orange shells; no pale shells; orange castle goes to sandcastles.
- `accepts` reads `session.twoRule`, never `roundIndex === 5`.
- Every generated piece has exactly one home. No duplicate `(kind, variant, color)` in a round.
- Folder is not a git repo: skip commits.
- Do not break Crab Path.

---

### File map

| File | Responsibility |
|------|----------------|
| `game.js` | Catalog, recipes, generator, drop, advance, playAgain |
| `test/game.test.js` | Node tests with injected `random` |
| `index.html` | Difficulty screen between menu and tidy play |
| `app.js` | Open difficulty after Tidy; start with chosen difficulty; hint uses `twoRule`; playAgain keeps difficulty |
| `styles.css` | Three chunky difficulty buttons |
| `README.md` | Easy / Medium / Hard; orange shells only on Hard last round |

---

### Task 1: Generator and session API

**Files:**
- Modify: `ai-sync/tide-pool-sort/test/game.test.js`
- Modify: `ai-sync/tide-pool-sort/game.js`

**Interfaces:**
- Consumes: existing `drop` / `advance` behavior
- Produces:
  - `TidePool.ROUND_COUNT === 6`
  - `TidePool.createSession({ difficulty, random })`
  - `TidePool.createSessionAt(roundIndex, { difficulty, random })`
  - `TidePool.currentRound(session) -> { id, items, pools }` from the session
  - `TidePool.itemById(session, itemId)`
  - `TidePool.drop(session, itemId, poolId) -> { ok, session }`
  - `TidePool.advance(session, random)`
  - `TidePool.playAgain(session, random)`
  - Session: `{ difficulty, roundIndex, twoRule, items, pools, sandIds, placed, complete, finished }`

- [ ] **Step 1: Write the failing tests**

Replace `test/game.test.js` with:

```javascript
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

if (failed) {
  console.error(failed + " failed, " + passed + " passed");
  process.exit(1);
}
console.log(passed + " passed");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node "/Users/aaronchester/Library/CloudStorage/GoogleDrive-azchester@gmail.com/My Drive/ai-sync/tide-pool-sort/test/game.test.js"`

Expected: FAIL on missing `difficulty` / `ROUND_COUNT` / `session.items` / hard two-rule via options — not on a syntax error in the test file.

- [ ] **Step 3: Implement the generator in `game.js`**

Replace static `ROUNDS` item lists with catalog + recipes + generator. Keep the same UMD wrapper.

```javascript
/**
 * Tide Pool Tidy — recipes, generator, and drop rules.
 * Works in Node (tests) and the browser (window.TidePool).
 */
(function (root) {
  "use strict";

  var ROUND_COUNT = 6;

  var STANDARD_POOLS = [
    { id: "sandcastles", label: "sandcastles", picture: "sandcastle" },
    { id: "shells", label: "shells", picture: "shell" },
    { id: "rocks", label: "rocks", picture: "rock" }
  ];

  var ORANGE_SHELL_POOLS = [
    { id: "sandcastles", label: "sandcastles", picture: "sandcastle" },
    { id: "shells", label: "shells", picture: "orange-shell" },
    { id: "rocks", label: "rocks", picture: "rock" }
  ];

  var CATALOG = [
    { kind: "sandcastle", variant: "turret", color: "sand", label: "castle" },
    { kind: "sandcastle", variant: "drip", color: "sand", label: "castle" },
    { kind: "sandcastle", variant: "bucket", color: "sand", label: "castle" },
    { kind: "sandcastle", variant: "turret", color: "orange", label: "castle" },
    { kind: "sandcastle", variant: "drip", color: "orange", label: "castle" },
    { kind: "sandcastle", variant: "bucket", color: "orange", label: "castle" },
    { kind: "shell", variant: "scallop", color: "peach", label: "shell" },
    { kind: "shell", variant: "snail", color: "peach", label: "shell" },
    { kind: "shell", variant: "spiral", color: "cream", label: "shell" },
    { kind: "shell", variant: "scallop", color: "orange", label: "shell" },
    { kind: "shell", variant: "snail", color: "orange", label: "shell" },
    { kind: "shell", variant: "spiral", color: "orange", label: "shell" },
    { kind: "rock", variant: "pebble", color: "gray", label: "rock" },
    { kind: "rock", variant: "speckled", color: "gray", label: "rock" },
    { kind: "rock", variant: "driftwood", color: "brown", label: "rock" }
  ];

  function recipe(count, allowSpiral, lookalike, twoRule) {
    return {
      count: count,
      atLeast: twoRule ? null : { sandcastle: 1, shell: 1, rock: 1 },
      allowSpiral: !!allowSpiral,
      lookalike: !!lookalike,
      twoRule: !!twoRule
    };
  }

  var RECIPES = {
    easy: [
      recipe(3, false, false, false),
      recipe(3, false, false, false),
      recipe(4, false, false, false),
      recipe(4, false, false, false),
      recipe(5, false, false, false),
      recipe(5, false, false, false)
    ],
    medium: [
      recipe(3, false, false, false),
      recipe(5, true, false, false),
      recipe(6, true, false, false),
      recipe(4, true, true, false),
      recipe(6, true, true, false),
      recipe(6, true, true, false)
    ],
    hard: [
      recipe(4, false, false, false),
      recipe(5, true, false, false),
      recipe(6, true, true, false),
      recipe(6, true, true, false),
      recipe(7, true, true, false),
      recipe(4, false, false, true)
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

  function keyOf(t) {
    return t.kind + ":" + t.variant + ":" + t.color;
  }

  function findTemplate(kind, variant, color) {
    for (var i = 0; i < CATALOG.length; i++) {
      var t = CATALOG[i];
      if (t.kind === kind && t.variant === variant && t.color === color) return t;
    }
    throw new Error("missing template");
  }

  function pickOne(list, random) {
    if (!list.length) throw new Error("no piece available");
    var i = Math.floor(random() * list.length);
    if (i >= list.length) i = list.length - 1;
    return list[i];
  }

  function eligible(rec, chosen) {
    var out = [];
    for (var i = 0; i < CATALOG.length; i++) {
      var t = CATALOG[i];
      if (chosen[keyOf(t)]) continue;
      if (t.color === "orange") continue;
      var creamSpiral = t.kind === "shell" && t.variant === "spiral" && t.color === "cream";
      if (creamSpiral && !rec.allowSpiral && !rec.lookalike) continue;
      out.push(t);
    }
    return out;
  }

  function generateItems(roundIndex, rec, random) {
    var items = [];
    var chosen = {};

    function add(t) {
      var k = keyOf(t);
      if (chosen[k]) throw new Error("duplicate piece");
      chosen[k] = true;
      items.push({
        id: "r" + roundIndex + "-" + t.kind + "-" + t.variant + "-" + t.color,
        kind: t.kind,
        variant: t.variant,
        color: t.color,
        label: t.label
      });
    }

    if (rec.twoRule) {
      var orangeShells = CATALOG.filter(function (t) {
        return t.kind === "shell" && t.color === "orange";
      });
      var first = pickOne(orangeShells, random);
      add(first);
      add(pickOne(orangeShells.filter(function (t) { return keyOf(t) !== keyOf(first); }), random));
      add(pickOne(CATALOG.filter(function (t) {
        return t.kind === "sandcastle" && t.color === "orange";
      }), random));
      add(pickOne(CATALOG.filter(function (t) { return t.kind === "rock"; }), random));
      return items;
    }

    if (rec.lookalike) {
      add(findTemplate("shell", "spiral", "cream"));
      add(findTemplate("sandcastle", "turret", "sand"));
    }

    function countKind(kind) {
      var n = 0;
      for (var i = 0; i < items.length; i++) if (items[i].kind === kind) n++;
      return n;
    }

    ["sandcastle", "shell", "rock"].forEach(function (kind) {
      while (countKind(kind) < rec.atLeast[kind]) {
        add(pickOne(eligible(rec, chosen).filter(function (t) { return t.kind === kind; }), random));
      }
    });

    while (items.length < rec.count) {
      add(pickOne(eligible(rec, chosen), random));
    }
    return items;
  }

  function clonePools(pools) {
    return pools.map(function (p) {
      return { id: p.id, label: p.label, picture: p.picture };
    });
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

  function basePools(twoRule) {
    return clonePools(twoRule ? ORANGE_SHELL_POOLS : STANDARD_POOLS);
  }

  function sessionFromRound(roundIndex, opts, previousPools) {
    var options = normalizeOptions(opts);
    var rec = RECIPES[options.difficulty][roundIndex];
    var items = generateItems(roundIndex, rec, options.random);
    var pools;
    if (options.difficulty === "easy") {
      pools = basePools(rec.twoRule);
    } else if (options.difficulty === "medium" && previousPools) {
      pools = clonePools(previousPools);
    } else {
      pools = shuffle(basePools(rec.twoRule), options.random);
    }
    return {
      difficulty: options.difficulty,
      roundIndex: roundIndex,
      twoRule: rec.twoRule,
      items: items,
      pools: pools,
      sandIds: shuffle(items.map(function (i) { return i.id; }), options.random),
      placed: { sandcastles: [], shells: [], rocks: [] },
      complete: false,
      finished: false
    };
  }

  function createSession(opts) {
    return sessionFromRound(0, opts, null);
  }

  function createSessionAt(roundIndex, opts) {
    if (roundIndex < 0 || roundIndex >= ROUND_COUNT) throw new Error("no such round");
    return sessionFromRound(roundIndex, opts, null);
  }

  function currentRound(session) {
    return { id: session.roundIndex + 1, items: session.items, pools: session.pools };
  }

  function itemById(session, itemId) {
    var items = session.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) return items[i];
    }
    return null;
  }

  function cloneSession(s) {
    return {
      difficulty: s.difficulty,
      roundIndex: s.roundIndex,
      twoRule: s.twoRule,
      items: s.items.map(function (i) {
        return { id: i.id, kind: i.kind, variant: i.variant, color: i.color, label: i.label };
      }),
      pools: clonePools(s.pools),
      sandIds: s.sandIds.slice(),
      placed: {
        sandcastles: s.placed.sandcastles.slice(),
        shells: s.placed.shells.slice(),
        rocks: s.placed.rocks.slice()
      },
      complete: s.complete,
      finished: s.finished
    };
  }

  function accepts(item, poolId, session) {
    if (poolId === "sandcastles") return item.kind === "sandcastle";
    if (poolId === "rocks") return item.kind === "rock";
    if (poolId === "shells") {
      if (session.twoRule) return item.kind === "shell" && item.color === "orange";
      return item.kind === "shell";
    }
    return false;
  }

  function drop(session, itemId, poolId) {
    var next = cloneSession(session);
    var item = itemById(next, itemId);
    if (!item || next.sandIds.indexOf(itemId) === -1) {
      return { ok: false, session: next };
    }
    if (!accepts(item, poolId, next)) {
      return { ok: false, session: next };
    }
    next.sandIds = next.sandIds.filter(function (id) { return id !== itemId; });
    next.placed[poolId].push(itemId);
    next.complete = next.sandIds.length === 0;
    return { ok: true, session: next };
  }

  function advance(session, random) {
    var next = cloneSession(session);
    if (!next.complete || next.finished) return next;
    if (next.roundIndex >= ROUND_COUNT - 1) {
      next.finished = true;
      return next;
    }
    var opts = { difficulty: next.difficulty, random: random };
    var prev = next.difficulty === "medium" ? next.pools : null;
    return sessionFromRound(next.roundIndex + 1, opts, prev);
  }

  function playAgain(session, random) {
    if (!session) return createSession({ random: random });
    return createSession({ difficulty: session.difficulty, random: random });
  }

  var TidePool = {
    ROUND_COUNT: ROUND_COUNT,
    createSession: createSession,
    createSessionAt: createSessionAt,
    currentRound: currentRound,
    itemById: itemById,
    drop: drop,
    advance: advance,
    playAgain: playAgain
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TidePool;
  } else {
    root.TidePool = TidePool;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node "/Users/aaronchester/Library/CloudStorage/GoogleDrive-azchester@gmail.com/My Drive/ai-sync/tide-pool-sort/test/game.test.js"`

Expected: all PASS. Also run `node test/path.test.js` — still all PASS.

- [ ] **Step 5: Skip commit** (folder is not a git repo)

---

### Task 2: Difficulty screen and tidy wiring

**Files:**
- Modify: `ai-sync/tide-pool-sort/index.html`
- Modify: `ai-sync/tide-pool-sort/app.js`
- Modify: `ai-sync/tide-pool-sort/styles.css`
- Modify: `ai-sync/tide-pool-sort/README.md`

**Interfaces:**
- Consumes: Task 1 `TidePool` API
- Produces: Beach Day → Tide Pool Tidy → Easy/Medium/Hard → play. Play again keeps difficulty. Hint uses `session.twoRule`.

- [ ] **Step 1: Add the difficulty screen to `index.html`**

Insert after `#menu-screen`:

```html
<section id="difficulty-screen" class="screen title-screen difficulty-screen hidden" hidden>
  <div class="sun" aria-hidden="true"></div>
  <h1>Tide Pool Tidy</h1>
  <p class="tag">How hard today?</p>
  <div class="difficulty-row">
    <button type="button" class="btn" data-difficulty="easy">Easy</button>
    <button type="button" class="btn" data-difficulty="medium">Medium</button>
    <button type="button" class="btn" data-difficulty="hard">Hard</button>
  </div>
  <button type="button" class="back-btn difficulty-back" data-back>Games</button>
</section>
```

- [ ] **Step 2: Style the row**

Add to `styles.css` (near `.btn`):

```css
.difficulty-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.8rem;
}

.difficulty-screen {
  padding-bottom: 4rem;
}

.difficulty-back {
  position: absolute;
  top: 0.8rem;
  left: 0.8rem;
}
```

- [ ] **Step 3: Wire `app.js`**

- `var difficultyScreen = document.getElementById("difficulty-screen");`
- `goMenu` also `hide(difficultyScreen)`.
- `openGame("tidy")` shows difficulty screen instead of `startTidy()`.
- Clicks on `[data-difficulty]` call `startTidy(btn.dataset.difficulty)`.
- `startTidy(difficulty)` → `TidePool.createSession({ difficulty: difficulty })`.
- Play again tidy: `TidePool.playAgain(session)`.
- `renderTidyHint`: extra sentence only if `session.twoRule`.
- `afterTidyRound`: compare against `TidePool.ROUND_COUNT`, not `TidePool.ROUNDS.length`.

```javascript
function openGame(game) {
  hideCheer();
  if (game === "path") {
    hide(menuScreen);
    hide(difficultyScreen);
    startPath();
  } else {
    hide(menuScreen);
    hide(playScreen);
    hide(pathScreen);
    show(difficultyScreen);
  }
}

function startTidy(difficulty) {
  activeGame = "tidy";
  selectedId = null;
  session = TidePool.createSession({ difficulty: difficulty });
  hide(menuScreen);
  hide(difficultyScreen);
  hide(pathScreen);
  show(playScreen);
  hideCheer();
  renderTidy();
}

function renderTidyHint() {
  var n = session.roundIndex + 1;
  var extra = session.twoRule ? " This pool wants orange shells." : "";
  hintEl.textContent = "Round " + n + " of " + TidePool.ROUND_COUNT + "." + extra;
}
```

Play-again tidy branch:

```javascript
session = TidePool.playAgain(session);
```

Last-round check:

```javascript
if (session.roundIndex >= TidePool.ROUND_COUNT - 1) {
```

- [ ] **Step 4: Update README**

Tide Pool Tidy section:

```
Tap Tide Pool Tidy, then Easy, Medium, or Hard.

Tap a thing, then tap its pool (or drag). Wrong pool? It wiggles back. No timer, no score.

Hard’s last round: the shell pool only wants **orange shells**. An orange castle still goes with the castles.
```

- [ ] **Step 5: Re-run tests and play the UI**

Run: `node test/game.test.js` and `node test/path.test.js`  
Expected: PASS  

Open `index.html`. Choose Tide Pool Tidy → Medium → confirm shuffled pieces. Play again stays Medium. Games returns to the menu. Crab Path still opens.

---

## Spec coverage

| Spec | Task |
|------|------|
| Random pieces, sand order, pool order | 1 |
| Easy / Medium / Hard recipes | 1 |
| twoRule on session, not round index | 1 |
| Default / unknown → medium | 1 |
| Tests listed in spec | 1 |
| Title/menu: pick difficulty then play | 2 |
| Play again same difficulty | 1 + 2 |
| Hint only on Hard two-rule | 2 |
| README | 2 |
| Crab Path untouched | 1 (path tests) |

## Placeholder / type check

- `ROUND_COUNT`, `createSession({ difficulty, random })`, `playAgain(session, random)`, `session.twoRule` used the same way in both tasks.
- No TBD / “handle edges later”.
- Commits omitted because there is no git repo.
