# Kid Idle Delight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a game page the painted girl thinks, looks, and fidgets every 8–14s, and answers play with a tiny glance, nod, or hmm — without touching sort/hop/snap rules or the win dance.

**Architecture:** Pure helpers in `kid.js` (idle pick, glance side, skip rules). `app.js` owns a still/posing director: two timers, src swap on the *visible* game kid only, CSS classes on `.kid-art`. Two new paintings (`kid-think.png`, `kid-look.png`). `game.js`, `path.js`, and `puzzle.js` do not change.

**Tech Stack:** Vanilla JS, CSS keyframes, PNG assets. Tests: `node test/kid.test.js` (same `test` / `assert` harness as `test/menu.test.js`). No new libraries.

## Global Constraints

- Game pages only (Tide Pool, Crab Path, Beach Puzzle). Menu and difficulty stay still.
- Do not change `game.js`, `path.js`, or `puzzle.js`.
- Do not replace her with `assets/kid.svg`. Do not add pose files beyond `kid-think.png` and `kid-look.png`.
- One pose at a time. No queue. Winning action skips the reaction; cheer owns her.
- Idle wait is a random integer **8000–14000** ms. First idle in a quiet stretch is **think**; later idles are **look** or **fidget**, not the same twice in a row.
- `prefers-reduced-motion: reduce` never starts the director. Celebrate stays as today.
- Transforms and classes go on `.kid-art`, not the positioned host, so the puzzle reserve box does not move.
- No sound, no speech bubble, no tap target on the girl.

## File map

| File | Responsibility |
|------|----------------|
| `kid.js` | `idleDelay`, `nextIdle`, `glanceSide`, `canStart`, `POSE_MS`, `shouldReact` |
| `test/kid.test.js` | Node tests for those helpers |
| `assets/kid-think.png` | Hand-to-chin painting |
| `assets/kid-look.png` | Head turned screen-left |
| `styles.css` | Nod, hmm, fidget, look-flip, reduced-motion off |
| `app.js` | Director, preload, screen start/stop, game hooks |
| `index.html` | Load `kid.js` before `app.js` |
| `README.md` | Add `node test/kid.test.js` to the test list |

---

### Task 1: Idle helper module

**Files:**
- Create: `test/kid.test.js`
- Create: `kid.js`
- Modify: `README.md` (Tests list only)

**Interfaces:**
- Consumes: nothing.
- Produces: `window.BeachKid` / `module.exports` with exactly:

```
POSE_MS: { think: 1000, glance: 600, look: 1000, nod: 550, hmm: 550, fidget: 700 }
idleDelay(random) -> integer ms in 8000–14000 inclusive
nextIdle(lastIdle, thoughtThisStretch, random) -> "think" | "look" | "fidget"
glanceSide(kidCenterX, targetX) -> "left" | "right"
canStart(state) -> boolean
shouldReact(kind, info) -> boolean
```

`random` is a function that returns a number in `[0, 1)`. Omitted → `Math.random`.

`nextIdle`: if `thoughtThisStretch` is false, return `"think"`. Else if `lastIdle === "look"` return `"fidget"`. Else if `lastIdle === "fidget"` return `"look"`. Else (`lastIdle` is `"think"`, `null`, or anything else) use `random()`: `< 0.5` → `"look"`, else `"fidget"`.

`glanceSide`: `"left"` if `targetX < kidCenterX`, else `"right"` (equal x is right).

`canStart`: true only when `state === "still"`.

`shouldReact(kind, info)`: `kind` is `"glance"`, `"nod"`, or `"hmm"`. `info` may be missing; treat as `{}`. Return **false** when `info.won` is true; when `kind === "hmm"` and `info.didMiss` is not true; when `kind === "glance"` and `info.isDeselect` is true. Otherwise **true**.

- [ ] **Step 1: Write the failing tests**

Create `test/kid.test.js`:

```javascript
/**
 * Girl idle / react helpers.
 * Run: node test/kid.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var BeachKid = require(path.join(__dirname, "..", "kid.js"));

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

test("idleDelay stays inside 8000–14000", function () {
  assert.strictEqual(BeachKid.idleDelay(always(0)), 8000);
  assert.strictEqual(BeachKid.idleDelay(always(0.999999)), 14000);
  var n = BeachKid.idleDelay(always(0.5));
  assert.ok(n >= 8000 && n <= 14000, "got " + n);
  assert.strictEqual(n, Math.floor(n));
});

test("first idle in a stretch is think", function () {
  assert.strictEqual(BeachKid.nextIdle(null, false, always(0.9)), "think");
  assert.strictEqual(BeachKid.nextIdle("look", false, always(0.9)), "think");
  assert.strictEqual(BeachKid.nextIdle("fidget", false, always(0.1)), "think");
});

test("later idles are look or fidget and do not immediately repeat", function () {
  assert.strictEqual(BeachKid.nextIdle("look", true, always(0.1)), "fidget");
  assert.strictEqual(BeachKid.nextIdle("fidget", true, always(0.9)), "look");
  assert.strictEqual(BeachKid.nextIdle("think", true, always(0.1)), "look");
  assert.strictEqual(BeachKid.nextIdle("think", true, always(0.6)), "fidget");
  assert.strictEqual(BeachKid.nextIdle(null, true, always(0.1)), "look");
});

test("glanceSide left vs right, equal x is right", function () {
  assert.strictEqual(BeachKid.glanceSide(100, 50), "left");
  assert.strictEqual(BeachKid.glanceSide(100, 150), "right");
  assert.strictEqual(BeachKid.glanceSide(100, 100), "right");
});

test("canStart is true only while still", function () {
  assert.strictEqual(BeachKid.canStart("still"), true);
  assert.strictEqual(BeachKid.canStart("posing"), false);
  assert.strictEqual(BeachKid.canStart(undefined), false);
});

test("shouldReact skips win", function () {
  assert.strictEqual(BeachKid.shouldReact("nod", { won: true }), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { won: true, didMiss: true }), false);
  assert.strictEqual(BeachKid.shouldReact("glance", { won: true }), false);
});

test("shouldReact skips hmm when didMiss is false", function () {
  assert.strictEqual(BeachKid.shouldReact("hmm", {}), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { didMiss: false }), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { didMiss: true }), true);
});

test("shouldReact skips glance when isDeselect is true", function () {
  assert.strictEqual(BeachKid.shouldReact("glance", { isDeselect: true }), false);
  assert.strictEqual(BeachKid.shouldReact("glance", { isDeselect: false }), true);
  assert.strictEqual(BeachKid.shouldReact("glance", {}), true);
});

test("shouldReact allows nod on splash/snap/hop", function () {
  assert.strictEqual(BeachKid.shouldReact("nod", {}), true);
  assert.strictEqual(BeachKid.shouldReact("nod", { won: false }), true);
});

test("POSE_MS matches the spec table", function () {
  assert.deepStrictEqual(BeachKid.POSE_MS, {
    think: 1000,
    glance: 600,
    look: 1000,
    nod: 550,
    hmm: 550,
    fidget: 700
  });
});

console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node test/kid.test.js`

Expected: FAIL, cannot find module `kid.js` (or `BeachKid` is undefined).

- [ ] **Step 3: Implement `kid.js`**

Create `kid.js` in the same UMD shape as `menu.js`:

```javascript
/**
 * Girl idle / react helpers.
 * Works in Node (tests) and the browser (window.BeachKid).
 */
(function (root) {
  "use strict";

  var POSE_MS = {
    think: 1000,
    glance: 600,
    look: 1000,
    nod: 550,
    hmm: 550,
    fidget: 700
  };

  function rand(random) {
    return typeof random === "function" ? random() : Math.random();
  }

  function idleDelay(random) {
    return 8000 + Math.floor(rand(random) * 6001);
  }

  function nextIdle(lastIdle, thoughtThisStretch, random) {
    if (!thoughtThisStretch) return "think";
    if (lastIdle === "look") return "fidget";
    if (lastIdle === "fidget") return "look";
    return rand(random) < 0.5 ? "look" : "fidget";
  }

  function glanceSide(kidCenterX, targetX) {
    return targetX < kidCenterX ? "left" : "right";
  }

  function canStart(state) {
    return state === "still";
  }

  function shouldReact(kind, info) {
    info = info || {};
    if (info.won) return false;
    if (kind === "hmm" && !info.didMiss) return false;
    if (kind === "glance" && info.isDeselect) return false;
    return true;
  }

  var BeachKid = {
    POSE_MS: POSE_MS,
    idleDelay: idleDelay,
    nextIdle: nextIdle,
    glanceSide: glanceSide,
    canStart: canStart,
    shouldReact: shouldReact
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BeachKid;
  } else {
    root.BeachKid = BeachKid;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node test/kid.test.js`

Expected: every test PASS, `0 failed`.

- [ ] **Step 5: List the new test in README**

In `README.md`, under Tests, add `node test/kid.test.js` after `node test/menu.test.js`.

- [ ] **Step 6: Commit**

```bash
git add kid.js test/kid.test.js README.md
git commit -m "Add helpers for the girl's idle and reaction picks."
```

---

### Task 2: Think and look paintings

**Files:**
- Create: `assets/kid-think.png`
- Create: `assets/kid-look.png`

**Interfaces:**
- Consumes: `assets/kid.png` as the identity lock (same girl, same clothes, same ink).
- Produces: two transparent portrait PNGs at those exact paths, framed like `kid.png` so a src swap does not jump.

Do **not** use `assets/kid.svg`. Do **not** restyle `kid.png` or the `kid-cele-*.png` frames.

- [ ] **Step 1: Generate `assets/kid-think.png`**

Use Imagine `image_edit` with `image` = the absolute path to `assets/kid.png`.

Prompt (use this intent; keep her identity locked):

Same cartoon girl as the reference, same round sunglasses with teal lenses, blonde ponytail with a teal hair tie, navy zip rash guard, blue wave shorts, bare feet, thick dark ink outline, same smile. She is thinking: one hand up to her chin, a small friendly lean. Still a friend, not worried or sad. Transparent background, no beach, no ground, no extra objects. Same portrait framing as the reference so the feet stay at the bottom.

Copy the tool output file to `assets/kid-think.png`.

- [ ] **Step 2: Generate `assets/kid-look.png`**

Use Imagine `image_edit` with the same `assets/kid.png` reference (not the think pose).

Prompt:

Same cartoon girl as the reference, same sunglasses, ponytail, navy rash guard, wave shorts, bare feet, thick ink, same smile. Same standing body. Only the head turns toward screen-left (her right), as if she glanced that way. Transparent background, no beach, no extra objects. Same portrait framing as the reference.

Copy the tool output file to `assets/kid-look.png`.

- [ ] **Step 3: Open both PNGs next to `assets/kid.png` and check**

Expected:

- Same girl (sunglasses, ponytail, clothes). Not a redraw in a new style.
- Transparent (or easily isolatable) background, not a beach scene.
- Think reads as hand-to-chin at the size she appears in-game (~6–7rem).
- Look reads as a head turn to screen-left; flipping it in your head should look the other way.
- Feet sit in a similar place so a swap does not jump.
- If one fails, regenerate **that one only** from `kid.png`.

- [ ] **Step 4: Commit**

```bash
git add assets/kid-think.png assets/kid-look.png
git commit -m "Add painted think and look poses for the girl."
```

---

### Task 3: Director, CSS, and screen lifecycle

**Files:**
- Modify: `index.html` (add `<script src="kid.js"></script>` immediately before `app.js`)
- Modify: `styles.css` (kid motion classes + reduced-motion)
- Modify: `app.js` (director + start/stop; no Tide Pool / Path / Puzzle *reaction* hooks yet)

**Interfaces:**
- Consumes: `BeachKid` from Task 1; pose files from Task 2.
- Produces: these `app.js` functions, used by Task 4:

```
visibleKidHost() -> Element | null
visibleKidArt() -> HTMLImageElement | null
stopKidIdle()
startKidIdle()
maybeStartKidIdle()
noteKidPlay()
playKidPose(kind, side)
reactKid(kind, info, targetEl)
```

`kind` is `"think" | "glance" | "look" | "nod" | "hmm" | "fidget"`. `side` is `"left" | "right" | undefined`. `info` is the object `BeachKid.shouldReact` expects. `targetEl` is the thing she glances toward (optional).

- [ ] **Step 1: Load `kid.js` in the page**

In `index.html`, before `app.js`:

```html
    <script src="kid.js"></script>
    <script src="app.js"></script>
```

- [ ] **Step 2: Add motion CSS**

Append to `styles.css` after `.kid-art` (or at the end of the kid rules), on `.kid-art` only:

```css
.kid-art {
  transform-origin: 50% 100%;
}

.kid-art.is-looking-right {
  transform: scaleX(-1);
}

.kid-art.is-nodding {
  animation: kid-nod 0.55s ease;
}

.kid-art.is-hmm {
  animation: kid-hmm 0.55s ease;
}

.kid-art.is-fidgeting {
  animation: kid-fidget 0.7s ease;
}

@keyframes kid-nod {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(6px); }
}

@keyframes kid-hmm {
  0%, 100% { transform: rotate(0deg); }
  35% { transform: rotate(-8deg); }
  70% { transform: rotate(4deg); }
}

@keyframes kid-fidget {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-7px); }
  55% { transform: translateY(0); }
  75% { transform: translateY(-3px); }
}
```

If `.kid-art` already has rules, **merge** `transform-origin` into the existing block. Do not duplicate the selector’s other properties.

In the existing `@media (prefers-reduced-motion: reduce)` block, add:

```css
  .kid-art.is-nodding,
  .kid-art.is-hmm,
  .kid-art.is-fidgeting {
    animation: none;
  }
```

- [ ] **Step 3: Add director state next to the existing kid constants in `app.js`**

Beside `KID_IDLE` / `KID_CELEBRATE`:

```javascript
  var KID_THINK = "assets/kid-think.png";
  var KID_LOOK = "assets/kid-look.png";
  var kidState = "still";
  var kidIdleTimer = null;
  var kidPoseTimer = null;
  var kidLookFlipTimer = null;
  var kidLastIdle = null;
  var kidThoughtThisStretch = false;
```

- [ ] **Step 4: Implement director functions in `app.js` (after `stopCelebrate` / `celebrateKid`)**

```javascript
  function visibleKidHost() {
    if (playScreen && !playScreen.hidden) return playScreen.querySelector(".sand-kid");
    if (pathScreen && !pathScreen.hidden) return pathScreen.querySelector(".path-kid");
    if (puzzleScreen && !puzzleScreen.hidden) return puzzleScreen.querySelector(".puzzle-kid");
    return null;
  }

  function visibleKidArt() {
    var host = visibleKidHost();
    return host ? host.querySelector(".kid-art") : null;
  }

  function clearKidTimers() {
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
    if (kidPoseTimer) {
      window.clearTimeout(kidPoseTimer);
      kidPoseTimer = null;
    }
    if (kidLookFlipTimer) {
      window.clearTimeout(kidLookFlipTimer);
      kidLookFlipTimer = null;
    }
  }

  function resetKidArt(img) {
    if (!img) return;
    img.src = KID_IDLE;
    img.classList.remove("is-looking-right", "is-nodding", "is-hmm", "is-fidgeting");
  }

  function stopKidIdle() {
    clearKidTimers();
    kidState = "still";
    resetKidArt(visibleKidArt());
  }

  function scheduleKidIdle() {
    if (reduceMotion) return;
    if (kidIdleTimer) window.clearTimeout(kidIdleTimer);
    kidIdleTimer = window.setTimeout(function () {
      kidIdleTimer = null;
      playKidPose(BeachKid.nextIdle(kidLastIdle, kidThoughtThisStretch, Math.random));
    }, BeachKid.idleDelay(Math.random));
  }

  function startKidIdle() {
    stopKidIdle();
    kidThoughtThisStretch = false;
    kidLastIdle = null;
    scheduleKidIdle();
  }

  function maybeStartKidIdle() {
    if (reduceMotion) return;
    if (cheerEl && !cheerEl.hidden) return;
    if (peekOpen()) return;
    if (!visibleKidHost()) return;
    startKidIdle();
  }

  function noteKidPlay() {
    kidThoughtThisStretch = false;
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
  }

  function playKidPose(kind, side) {
    if (reduceMotion) return;
    if (!BeachKid.canStart(kidState)) return;
    var img = visibleKidArt();
    if (!img) return;
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
    kidState = "posing";
    resetKidArt(img);
    if (kind === "think") {
      img.src = KID_THINK;
      kidThoughtThisStretch = true;
      kidLastIdle = "think";
    } else if (kind === "glance" || kind === "look") {
      img.src = KID_LOOK;
      if (kind === "glance" && side === "right") img.classList.add("is-looking-right");
      if (kind === "look") {
        kidLastIdle = "look";
        kidLookFlipTimer = window.setTimeout(function () {
          kidLookFlipTimer = null;
          img.classList.add("is-looking-right");
        }, Math.floor(BeachKid.POSE_MS.look / 2));
      }
    } else if (kind === "nod") {
      img.classList.add("is-nodding");
    } else if (kind === "hmm") {
      img.classList.add("is-hmm");
    } else if (kind === "fidget") {
      img.classList.add("is-fidgeting");
      kidLastIdle = "fidget";
    }
    var ms = BeachKid.POSE_MS[kind] || 600;
    kidPoseTimer = window.setTimeout(function () {
      kidPoseTimer = null;
      resetKidArt(img);
      kidState = "still";
      scheduleKidIdle();
    }, ms);
  }

  function reactKid(kind, info, targetEl) {
    if (reduceMotion) return;
    noteKidPlay();
    if (!BeachKid.shouldReact(kind, info || {})) {
      // A winning move is about to cheer; do not arm an idle under the overlay.
      if (kidState === "still" && !(info && info.won)) scheduleKidIdle();
      return;
    }
    if (!BeachKid.canStart(kidState)) return;
    var side;
    if (kind === "glance" && targetEl) {
      var host = visibleKidHost();
      if (host) {
        var kr = host.getBoundingClientRect();
        var tr = targetEl.getBoundingClientRect();
        side = BeachKid.glanceSide(kr.left + kr.width / 2, tr.left + tr.width / 2);
      }
    }
    playKidPose(kind, side);
  }
```

`playKidPose` calls `resetKidArt` at the start, which sets `src` back to idle before think/look assign the pose file. That is intentional so leftover classes die.

- [ ] **Step 5: Preload pose files and revert a broken pose src**

In `paintKids`, after filling `[data-kid]`:

```javascript
  function paintKids() {
    document.querySelectorAll("[data-kid]").forEach(function (el) {
      el.innerHTML = '<img class="kid-art" src="' + KID_IDLE + '" alt="" draggable="false" />';
    });
    document.querySelectorAll(".kid-art").forEach(function (img) {
      img.addEventListener("error", function () {
        if (img.getAttribute("src") === KID_IDLE) return;
        resetKidArt(img);
        kidState = "still";
      });
    });
    [KID_THINK, KID_LOOK].forEach(function (src) {
      var pre = new Image();
      pre.src = src;
    });
  }
```

- [ ] **Step 6: Hook lifecycle — stop on cheer / menu / peek; start when a game page is showing**

`celebrateKid` must begin with `stopKidIdle();` then the existing `stopCelebrate();` (or call `stopKidIdle` inside the current first line so a cheer never shares a think frame).

`hideCheer`: after the existing hide / `stopCelebrate()` work, call `maybeStartKidIdle();`.

`goMenu`: game screens are already hidden before `hideCheer()`, so `maybeStartKidIdle` will no-op. Still call `stopKidIdle()` at the top of `goMenu` so a mid-pose cannot outlive the screen.

`openPuzzlePeek`: after `show(puzzlePeek)`, call `stopKidIdle();`.

`closePuzzlePeek`: after hide, call `maybeStartKidIdle();`.

`startTidy` / `startPath` / `startPuzzle` already `show` the game screen then `hideCheer()`. That `hideCheer` → `maybeStartKidIdle` is enough. Do **not** also start from Play again’s extra path; `hideCheer()` there covers it.

Do **not** wire glance/nod/hmm in this task.

- [ ] **Step 7: Confirm existing unit tests still pass**

Run:

```bash
node test/kid.test.js
node test/game.test.js
node test/path.test.js
node test/puzzle.test.js
node test/puzzle-layout.test.js
node test/menu.test.js
```

Expected: all PASS. `game.js` / `path.js` / `puzzle.js` are untouched.

- [ ] **Step 8: Browser check — idle only**

Open `index.html`.

1. Menu: she does not move. Wait 15s.
2. Difficulty: she does not move. Wait 15s.
3. Start Tide Pool Easy. Do not touch anything. Within 14s she thinks (hand on chin), then stands. After another 8–14s she looks around or fidgets, then stands. She does not think twice in a row in that stretch.
4. Games back to menu: she is idle `kid.png` and stays still.
5. Repeat a wait on Crab Path and Beach Puzzle (same think-then-other idle).
6. Open puzzle peek during a wait: she snaps back to standing and does not pose until peek closes, then a fresh wait.

- [ ] **Step 9: Commit**

```bash
git add index.html styles.css app.js
git commit -m "Play the girl's idle poses on game pages."
```

---

### Task 4: Glance, nod, and hmm hooks

**Files:**
- Modify: `app.js` only (`bindDrag` / `tryDrop` / `bindJigDrag` / `finishJig` / `trySnapGroup` / path click). No `game.js`, `path.js`, or `puzzle.js`.

**Interfaces:**
- Consumes: `reactKid(kind, info, targetEl)` from Task 3; `BeachKid.shouldReact` skip rules.
- Produces: the reaction table in the spec. `trySnapGroup` must **return** `true` when a snap happened and `false` otherwise (it currently returns `undefined`).

- [ ] **Step 1: Tide Pool glance on pointerdown**

In `bindDrag`’s `pointerdown`, after the `drag = { ... }` assignment:

```javascript
      reactKid("glance", { isDeselect: selectedId === item.id }, btn);
```

A second tap on the selected thing sets `isDeselect: true` → no glance, timer still resets via `noteKidPlay`.

- [ ] **Step 2: Tide Pool nod / hmm on drop**

Replace the end of `tryDrop` so a win does not nod, and a sand drop never hmms:

```javascript
  function tryDrop(itemId, poolEl) {
    if (!poolEl) return false;
    var result = TidePool.drop(session, itemId, poolEl.dataset.pool);
    session = result.session;
    selectedId = result.ok ? null : itemId;
    renderTidy();
    var fresh = poolsEl.querySelector('[data-pool="' + poolEl.dataset.pool + '"]');
    pulse(fresh, result.ok ? "splash" : "wiggle");
    if (result.ok) {
      reactKid("nod", { won: session.complete });
      if (session.complete) afterTidyRound();
    } else {
      reactKid("hmm", { didMiss: true });
    }
    return true;
  }
```

`finishPointer` still calls `if (!tryDrop(id, poolEl)) renderTidy();` — no pool means no `reactKid("hmm")`.

- [ ] **Step 3: Puzzle glance on jig pointerdown**

In `bindJigDrag`’s `pointerdown`, after the drag object is created (and after the peek / button guards):

```javascript
      reactKid("glance", {}, btn);
```

- [ ] **Step 4: Puzzle nod on snap, hmm only after a drag that did not snap**

Change `trySnapGroup` so each successful snap `return true;` and the function `return false;` at the end (today both paths fall off the end).

Change `finishJig` to keep `moved` and react:

```javascript
  function finishJig() {
    if (!drag || drag.kind !== "jig") return;
    var ids = drag.ids;
    var unclamped = drag.unclamped;
    var moved = drag.moved;
    drag = null;
    ids.forEach(function (pid) {
      var el = puzzleField.querySelector('[data-id="' + pid + '"]');
      if (el) el.classList.remove("dragging");
    });
    var snapped = trySnapGroup(ids, unclamped);
    if (snapped) {
      reactKid("nod", { won: puzzleSession.complete });
    } else if (moved) {
      reactKid("hmm", { didMiss: true });
    }
  }
```

A tap that never dragged: glance already fired; no hmm. Tidy and preview are not jigs: no `reactKid`.

`afterPuzzle` still runs from `trySnapGroup` when `puzzleSession.complete`. `reactKid("nod", { won: true })` no-ops. `celebrateKid` already `stopKidIdle()`.

- [ ] **Step 5: Crab Path nod on hop, hmm on wiggle, no glance**

In the `pathBoard` click handler, after a failed `CrabPath.step`:

```javascript
    if (!result.ok) {
      pulse(tile, "wiggle");
      reactKid("hmm", { didMiss: true });
      return;
    }
```

After a successful hop, only nod when the path is **not** complete:

```javascript
    pathSession = result.session;
    renderPath();
    var fresh = pathBoard.querySelector('[data-x="' + x + '"][data-y="' + y + '"]');
    pulse(fresh, "splash");
    if (pathSession.complete) afterPath();
    else reactKid("nod", {});
```

Do not call `reactKid("glance", ...)` on Path.

- [ ] **Step 6: Run unit tests again**

```bash
node test/kid.test.js
node test/game.test.js
node test/path.test.js
node test/puzzle.test.js
node test/puzzle-layout.test.js
node test/menu.test.js
```

Expected: all PASS. Diff must not include `game.js`, `path.js`, or `puzzle.js`.

- [ ] **Step 7: Browser check — reactions**

Tide Pool:

1. Tap a thing: she glances toward the sand (usually flipped / screen-right).
2. Tap the same thing again: no second glance.
3. Tap the right pool: she nods, then stands.
4. Tap the wrong pool: she hmms (tiny tilt), pool still wiggles.
5. Drag onto empty sand: no hmm.
6. Finish a round: existing **All tidy!** dance only. No think/look frame in the cheer.

Puzzle:

1. Pointer down on a piece: glance toward that piece.
2. Snap to a neighbor: nod.
3. Drag and drop with no snap: hmm.
4. Click a piece without dragging: no hmm.
5. Tidy and preview: she does not react. Peek still freezes her.
6. Finish the puzzle: existing **What a puzzle!** dance only.

Crab Path:

1. Tap a glowing square: nod (no glance).
2. Tap a rock / water / non-neighbor: hmm, tile wiggles.
3. Reach the bucket: existing dance only.

All three: Games / More games / menu / difficulty she is still. Play again starts a fresh idle wait.

- [ ] **Step 8: Commit**

```bash
git add app.js
git commit -m "React with glance, nod, and hmm while she plays."
```

---

### Task 5: Reduced motion and full-pass verification

**Files:**
- None unless a Task 3–4 bug shows up. Fix in place; do not expand scope.

**Interfaces:**
- Consumes: the director’s `if (reduceMotion) return` paths and the CSS `animation: none` rules.
- Produces: a verified build that matches the spec Testing / browser list.

- [ ] **Step 1: Reduced-motion check**

In DevTools, emulate `prefers-reduced-motion: reduce` (or use the OS setting) and reload.

Expected:

- She never swaps to think/look.
- She never nods / hmms / fidgets.
- Win dance still uses today’s last celebrate frame (no hop animation, same as now).
- Games still play.

- [ ] **Step 2: Full browser list from the spec**

Without reduced motion, walk the spec’s eight browser checks (idle on each game, Tide Pool reactions, Puzzle reactions, Path reactions, wins, menu/difficulty still, reduced motion, paintings match). Hunt for: two poses at once, think during cheer, puzzle reserve box shifting, glance on Path, hmm on a puzzle click, hmm on a Tide Pool sand drop.

- [ ] **Step 3: Run the full unit suite one last time**

```bash
node test/kid.test.js && node test/game.test.js && node test/path.test.js && node test/puzzle.test.js && node test/puzzle-layout.test.js && node test/menu.test.js
```

Expected: all PASS.

- [ ] **Step 4: Commit only if you had to fix something**

If the tree is dirty:

```bash
git add app.js styles.css
git commit -m "Keep the girl's idle motion off when motion is reduced."
```

If clean, do not empty-commit.

---

## Self-review (author)

**Spec coverage**

| Spec section | Task |
|--------------|------|
| Game pages only; menu/difficulty still | 3, 5 |
| 8–14s idle; think first; then look/fidget no repeat | 1, 3 |
| Peek pauses; close starts a fresh wait | 3 |
| Cheer stops director; hideCheer may restart | 3 |
| Tide Pool glance / nod / hmm; no hmm on sand | 4 |
| Puzzle glance / nod / hmm-after-drag; no Tidy/preview react | 4 |
| Path nod / hmm; no glance | 4 |
| Skip reaction on win | 4 |
| Two paintings; no SVG replacement | 2 |
| CSS nod/hmm/fidget; look flip | 3 |
| Classes on `.kid-art`; reserve box unchanged | 3 |
| Preload + broken src revert | 3 |
| `kid.js` unit tests | 1 |
| `game.js` / `path.js` / `puzzle.js` untouched | 1–5 |
| Reduced motion off | 3, 5 |
| One pose, no queue | 3 (`canStart`) |

**No leftover placeholders.** Signatures in Task 3 match Task 4 call sites. `POSE_MS` keys match `playKidPose` branches.
