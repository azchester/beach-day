# Kid idle delight — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

The painted girl on a game page keeps quiet company. Every once in a while she thinks, looks around, or fidgets. She also notices play with a tiny glance, nod, or hmm. She never steals the win dance, never talks, and never covers the game.

This spec is **in-play kid motion only**. Tide Pool Tidy, Beach Puzzle, and Crab Path rules stay the same. The existing celebration frames stay the win.

## Player experience

She only moves on an open **game page**: Tide Pool Tidy, Crab Path, or Beach Puzzle. The menu kid and the difficulty-screen kid stay still. The cheer overlay kid only does the existing win dance.

Idle is rare. After a random **8–14 second** wait with no play, she does one short beat (about **1 second**), then stands. The next wait is a new random 8–14 seconds.

Reactions fire once, on the action, and last well under a second. A four-year-old can miss one and catch the next.

`prefers-reduced-motion: reduce` turns all of this off. She stands on `assets/kid.png`, then cheers exactly as she does today.

## When she moves

### Idle cycle

One timer. Opening a game page starts it. Any play action (defined below) resets it to a new 8–14 seconds and marks the quiet stretch as “not yet thought.” When a pose **ends**, start a new 8–14 second wait (this is not a play action). The timer is paused while a cheer is showing, while the puzzle peek is open, and whenever no game page is open. Closing peek starts a fresh 8–14 second wait; it does not play a pose.

When the timer fires:

1. If she has not thought yet in this quiet stretch, the pose is **think**. That is the pause reaction. There is no second think timer.
2. If she has already thought once in this quiet stretch, the pose is **look around** or **fidget**, not think. Do not play the same of those two twice in a row.

Leaving the game page, starting a cheer, or opening peek cancels a running pose and puts her back on the idle painting.

### Reactions

One pose at a time. If she is already posing, a new reaction is **dropped**, not queued.

| Game | Glance | Nod | Hmm |
|------|--------|-----|-----|
| Tide Pool | pointerdown on a sand thing (tap-to-select or drag start) | that thing splashes into the right pool | the pool wiggles (wrong drop) |
| Puzzle | pointerdown on a piece or clump | two groups snap | she dragged and the drop did not snap |
| Crab Path | — | the crab hops | a blocked tile wiggles |

Crab Path has no separate pick. A legal hop is **nod** only.

Skip the reaction when the same action **wins** the round, path, or puzzle. The win dance starts instead.

### What counts as a play action (resets the idle timer)

- Tide Pool: pointerdown on a sand thing; a drop attempt (right or wrong)
- Puzzle: pointerdown on a jig; a drag that ends (snap or not)
- Crab Path: tap on a tile (legal or not)

### What does not move her and does not reset the timer

Tidy, the puzzle preview thumbnail, Games, More games, Play again’s button chrome, difficulty, empty sand, and tapping a pool with nothing selected. Peek is not play: it pauses or restarts the wait (see Idle cycle) and never glances, nods, or hmms.

Deselecting a Tide Pool thing (tap the selected thing again) resets the timer but does **not** glance a second time.

A puzzle pointerdown that never becomes a drag may glance. It must **not** hmm.

A Tide Pool drop onto sand, between pools, or with no pool is not a miss. No hmm. Hmm only when the game already wiggles.

## What you see

She stays the painted PNG. Do **not** replace her with `assets/kid.svg` or any other vector.

### New paintings

Two new assets, same girl as `assets/kid.png` (same sunglasses, ponytail, teal hair tie, navy rash guard, wave shorts, bare feet, same thick ink, same smile). Transparent background. Same roughly-portrait framing so they swap without a jump.

- `assets/kid-think.png` — one hand to her chin, a small lean. Still a friend. Not worried, not sad.
- `assets/kid-look.png` — same body, head turned toward **screen-left**. We flip it in CSS for screen-right.

Do not add more pose files. Do not restyle the idle or celebration paintings.

### Beats

| Beat | Art | Motion | Duration |
|------|-----|--------|----------|
| Think | `kid-think.png` | still hold | ~1000ms |
| Glance | `kid-look.png` | none besides the swap | ~600ms |
| Look around | `kid-look.png` | screen-left, then flipped screen-right, then idle | ~1000ms total |
| Nod | `kid.png` | one yes-bob (CSS) | ~550ms |
| Hmm | `kid.png` | tiny tilt (~8°) and back (CSS). No frown. | ~550ms |
| Fidget | `kid.png` | one toe-bounce (CSS), not a loop | ~700ms |

Then she is always `assets/kid.png` again.

Glance side: compare the thing’s horizontal center to her horizontal center. Thing left of her → unflipped `kid-look.png` (screen-left). Thing right of her → CSS `scaleX(-1)` (screen-right). Tide Pool’s sand is usually to her right. A puzzle piece can be either. Crab Path does not glance.

Celebration frames (`kid.png` → `kid-cele-1.png` → `kid-cele-2.png` → `kid-cele-3.png` …) are unchanged. Never show think or look during a cheer.

## Architecture

Static browser game. No new libraries. No sound. No speech bubble.

```
ai-sync/beach-day/
  kid.js              # idle pick, glance side, durations, can-start
  app.js              # director: timers, src swap, CSS classes, hooks
  styles.css          # nod, hmm, fidget, look flip
  assets/kid-think.png
  assets/kid-look.png
  test/kid.test.js
```

`game.js`, `path.js`, and `puzzle.js` do not change. They still only return splash / wiggle / snap / hop. `app.js` already hears those results and taps the director.

`index.html` does not need new kid nodes. The existing `[data-kid]` hosts stay.

### Director

States: `still` and `posing`. Cheer is outside this machine: `celebrateKid()` calls `stopKidIdle()` first. `hideCheer()` starts the director again if a game page is still open.

Only the **visible game kid** changes: `.sand-kid` on Tide Pool, `.path-kid` on Crab Path, `.puzzle-kid` on Beach Puzzle. Menu, difficulty, and `.cheer-kid` stay on `kid.png` unless the existing celebrate path is painting the cheer / path win.

Today `setKidSrc` writes every `.kid-art`. Idle and react must not do that. Celebrate may keep painting the kids it already paints, then restore idle when it stops.

Clock:

- `idleTimer` — 8–14s, paused as above
- `poseTimer` — ends the current beat and returns to still
- Never share these with `celebrateTimer`

Start the director when a game page is shown (`startTidy` / `startPath` / `startPuzzle`). Stop it when leaving those screens, when peek opens, and when a cheer starts.

### `kid.js`

Pure helpers, no DOM:

- `idleDelay(random)` → integer ms in **8000–14000** inclusive
- `nextIdle(lastIdle, thoughtThisStretch, random)` → `"think"` if `thoughtThisStretch` is false; otherwise `"look"` or `"fidget"`. If both of those are allowed (last idle was `"think"` or unset), `random()` picks. If `lastIdle` is already `"look"` or `"fidget"`, return the other one.
- `glanceSide(kidCenterX, targetX)` → `"left"` if `targetX < kidCenterX`, else `"right"`
- `canStart(state)` → true only when `state === "still"`
- `POSE_MS` — the durations in the table above
- `shouldReact(kind, info)` — `kind` is `"glance"`, `"nod"`, or `"hmm"`. `info` is `{ won, isDeselect, didMiss }`. Return false when `won` is true; when `kind === "hmm"` and `didMiss` is false; when `kind === "glance"` and `isDeselect` is true. Otherwise true.

  Callers set `didMiss` only when the game already showed a miss: Tide Pool pool-wiggle, Crab Path tile-wiggle, or a puzzle **drag** that ended with no snap. A puzzle click that never dragged has `didMiss: false`.

`app.js` holds timers, finds the visible kid, swaps `img.src`, toggles classes (`is-looking-right`, `is-nodding`, `is-hmm`, `is-fidgeting`) on `.kid-art` (not the positioned container, so layout and the puzzle reserve box do not move).

### Assets load

Preload `kid-think.png` and `kid-look.png` when the page paints kids so the first think is not a blank swap.

If the visible kid node is missing, the director no-ops.

## Edges

- One pose at a time. No queue.
- Winning action → no nod/glance/hmm; cheer owns her.
- Peek open → freeze on idle art; timer paused; closing peek starts a fresh 8–14s wait.
- Screen change or Play again → stop, restore idle art, start fresh if a game page is showing.
- Reduced motion → never start. No class, no src swap except celebrate’s existing still last-frame.
- Missing pose file → still idle; do not leave a broken image up. Preload first; if a pose src errors, revert to `kid.png` and go still.
- Transforms live on `.kid-art`. `.sand-kid` / `.path-kid` / `.puzzle-kid` size and reserved space do not change. Puzzle Tidy’s girl box stays the same.
- No tap target on the girl. `pointer-events` stay none.

## Testing

New unit tests in `test/kid.test.js` for `kid.js` only:

- `idleDelay` stays inside 8000–14000
- First idle in a stretch is think; later idles are look or fidget and do not immediately repeat
- `glanceSide` left vs right, including equal x → right
- `canStart` is false while posing
- `shouldReact` skips win, skips hmm when `didMiss` is false, skips glance when `isDeselect` is true, allows glance on pick and nod on splash/snap/hop

Existing `game.js` / `path.js` / `puzzle.js` tests stay green with no edits to those modules.

Check in the browser (not unit tests):

1. Each game page: she thinks after a pause, then later looks or fidgets, then stands.
2. Tide Pool: pick → glance toward the thing; right pool → nod; wrong pool → hmm; drop on sand → no hmm.
3. Puzzle: pick up → glance; snap → nod; drag with no snap → hmm; tap without drag → no hmm; Tidy and preview → she does not react.
4. Crab Path: hop → nod; rock/water/non-neighbor → hmm; no glance.
5. Win on each game: existing dance only. No think/look frame in the cheer.
6. Menu and difficulty: she does not move.
7. `prefers-reduced-motion`: she never idles or reacts.
8. Think and look paintings match the idle girl (same clothes, no jump when they swap).

## Out of scope

Menu or difficulty motion. Extra pose files. Speech, sound, or a thought bubble. Replacing her with `assets/kid.svg`. Changing celebration frames. Changing sort / hop / snap rules. A second think timer. Queued reactions.
