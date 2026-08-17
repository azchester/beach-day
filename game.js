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
    { id: "rocks", label: "rocks and sticks", picture: "rock" }
  ];

  var ORANGE_SHELL_POOLS = [
    { id: "sandcastles", label: "sandcastles", picture: "sandcastle" },
    { id: "shells", label: "shells", picture: "orange-shell" },
    { id: "rocks", label: "rocks and sticks", picture: "rock" }
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
    { kind: "rock", variant: "driftwood", color: "brown", label: "stick" }
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
      add(
        pickOne(
          orangeShells.filter(function (t) {
            return keyOf(t) !== keyOf(first);
          }),
          random
        )
      );
      add(
        pickOne(
          CATALOG.filter(function (t) {
            return t.kind === "sandcastle" && t.color === "orange";
          }),
          random
        )
      );
      add(
        pickOne(
          CATALOG.filter(function (t) {
            return t.kind === "rock";
          }),
          random
        )
      );
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
        add(
          pickOne(
            eligible(rec, chosen).filter(function (t) {
              return t.kind === kind;
            }),
            random
          )
        );
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
      sandIds: shuffle(
        items.map(function (i) {
          return i.id;
        }),
        options.random
      ),
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
    next.sandIds = next.sandIds.filter(function (id) {
      return id !== itemId;
    });
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
