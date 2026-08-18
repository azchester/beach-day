# Sandcastle Stack — Design

Date: 2026-08-17  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A third Beach Day game. She looks at a small finished castle and builds the same one, ground up, from a tray of painted pieces. He talks it through with her. No timer, no losing score, no required reading.

Tide Pool Tidy stays sort. Crab Path stays hop. This spec is **Sandcastle Stack only**. Those two games do not change their rules.

## Player experience

Menu has three cards. The new one is **Sandcastle Stack**, blurb **Copy the castle**. Tap it. The existing **How hard today?** screen appears, titled **Sandcastle Stack**, with **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no extra “Let’s build” step.

A round shows three things at once:

1. A **picture** — the finished castle, small, made of the same painted piece images she will place. It stays visible the whole round.
2. A **build pad** — empty sand spots in the same arrangement as the picture. Only open spots accept a piece.
3. A **tray** — the pieces she needs, plus extras on later castles.

Play uses the same gestures as Tide Pool Tidy: drag a piece onto a spot, or tap the piece then tap the spot.

- Right piece on an open spot: it sits there. She cannot peel it off.
- Wrong piece, a locked spot, or a filled spot: the piece wiggles back to the tray. Nothing scolds.
- A locked spot never keeps a piece.

Hint line: `Castle N of 6.` She does not have to read the difficulty name.

When every required spot is filled, the kid cheers (**What a castle!**), then the next castle starts. After castle 6, **Play again** deals six new castles at **the same difficulty**. **More games** and **Games** return to the menu. Refresh returns to the menu so a different difficulty can be picked. No mid-play difficulty switch. No saved progress.

## Ground up

Spots unlock in layers:

1. Only **base** is open.
2. After the base is filled, **left** and **right** open if this castle has them. Either side is fine.
3. After every side this castle has is filled (or it has no sides), **top** opens if this castle has one.

Easy has no sides, so the top opens as soon as the base is in.

## Roles and art

Talk-through roles, using only existing painted PNGs:

| Spot | Kind | Files |
|------|------|--------|
| base | bucket | `assets/sandcastle-bucket-sand.png`, `assets/sandcastle-bucket-orange.png` |
| left, right | turret | `assets/sandcastle-turret-sand.png`, `assets/sandcastle-turret-orange.png` |
| top | drip, except Easy castles 2, 4, and 6 where top is a turret | drip or turret files above |

Easy uses a turret on top on those three castles so the picture is not the same sandy bucket-and-drip every time. Medium and Hard never put a turret on top. Hard’s top is always a drip.

The picture, the tray, and the pieces on the pad are those PNGs. Empty spots are Crab Path sand tiles: `assets/tile-sand.png`, thick ink border, rounded. Open spots are full opacity and accept drops. Locked spots are dimmer (about 45% opacity) and do not accept drops. Filled spots show the placed PNG and do not accept another piece.

No SVG icons, no icon fonts, no outline-only clip-art ghosts, no newly generated castle in a different style. The menu card is existing castle PNGs on the foam card, same construction as Tide Pool Tidy and Crab Path. If a later version needs a new piece, it is painted to match these files first. This version does not add a piece.

## Difficulty

Six castles at every difficulty. Difficulty chooses how many spots the castle has, how many extras sit in the tray, and how alike those pieces look.

### Easy — base + top, sandy picture

| Castle | Top | Target colors | Tray extras |
|--------|-----|---------------|-------------|
| 1 | drip | all sand | none |
| 2 | turret | all sand | none |
| 3 | drip | all sand | one sand turret |
| 4 | turret | all sand | one sand drip |
| 5 | drip | all sand | one sand turret and one orange unused piece |
| 6 | turret | all sand | one sand drip and one orange unused piece |

### Medium — base + left + right

| Castle | Target colors | Tray extras |
|--------|---------------|-------------|
| 1 | all sand | none |
| 2 | all sand | one sand drip |
| 3 | exactly one side orange, other side sand, base sand | one unused piece |
| 4 | mixed (at least one sand and one orange in the target) | two unused pieces |
| 5 | left and right different colors; base sand | two unused pieces |
| 6 | mixed | two unused pieces, at least one of them a drip |

### Hard — base + left + right + top (top is drip)

| Castle | Target colors | Tray extras |
|--------|---------------|-------------|
| 1 | all sand | none |
| 2 | mixed | two unused pieces |
| 3 | left and right different colors; base and top each sand or orange | two unused pieces |
| 4 | mixed | three unused pieces, at least one drip of the color that is not on top |
| 5 | orange base; left, right, and top each sand or orange | three unused pieces |
| 6 | left and right different colors; mixed overall | three unused pieces |

Each recipe is exactly:

```
{
  spots,          // ["base","top"] | ["base","left","right"] | ["base","left","right","top"]
  topKind,        // "drip" | "turret"  (ignored if spots has no top; Hard is always "drip")
  colorMode,      // "sand" | "one-orange-side" | "mixed" | "sides-different" | "orange-base"
  decoys,         // exact count
  decoyNeed       // [] or a list of constraints, each "sand-turret" | "sand-drip" | "any-orange" | "any-drip" | "any-turret"
}
```

- Easy 0: `{ spots: ["base","top"], topKind: "drip", colorMode: "sand", decoys: 0, decoyNeed: [] }`
- Easy 1: `{ ..., topKind: "turret", colorMode: "sand", decoys: 0, decoyNeed: [] }`
- Easy 2: `{ ..., topKind: "drip", colorMode: "sand", decoys: 1, decoyNeed: ["sand-turret"] }`
- Easy 3: `{ ..., topKind: "turret", colorMode: "sand", decoys: 1, decoyNeed: ["sand-drip"] }`
- Easy 4: `{ ..., topKind: "drip", colorMode: "sand", decoys: 2, decoyNeed: ["sand-turret","any-orange"] }`
- Easy 5: `{ ..., topKind: "turret", colorMode: "sand", decoys: 2, decoyNeed: ["sand-drip","any-orange"] }`
- Medium 0: `{ spots: ["base","left","right"], topKind: "drip", colorMode: "sand", decoys: 0, decoyNeed: [] }`
- Medium 1: `{ ..., colorMode: "sand", decoys: 1, decoyNeed: ["sand-drip"] }`
- Medium 2: `{ ..., colorMode: "one-orange-side", decoys: 1, decoyNeed: [] }`
- Medium 3: `{ ..., colorMode: "mixed", decoys: 2, decoyNeed: [] }`
- Medium 4: `{ ..., colorMode: "sides-different", decoys: 2, decoyNeed: [] }`
- Medium 5: `{ ..., colorMode: "mixed", decoys: 2, decoyNeed: ["any-drip"] }`
- Hard 0: `{ spots: ["base","left","right","top"], topKind: "drip", colorMode: "sand", decoys: 0, decoyNeed: [] }`
- Hard 1: `{ ..., colorMode: "mixed", decoys: 2, decoyNeed: [] }`
- Hard 2: `{ ..., colorMode: "sides-different", decoys: 2, decoyNeed: [] }`
- Hard 3: `{ ..., colorMode: "mixed", decoys: 3, decoyNeed: ["any-drip"] }`
- Hard 4: `{ ..., colorMode: "orange-base", decoys: 3, decoyNeed: [] }`
- Hard 5: `{ ..., colorMode: "sides-different", decoys: 3, decoyNeed: [] }`

Default difficulty is **medium** when `createSession` is called with no options. Unknown difficulty string is treated as **medium**.

## What randomizes

Every time a castle is dealt:

1. **Target colors** — within that recipe’s `colorMode` (see Generator).
2. **Which unused pieces become extras** — after required `decoyNeed` items are placed.
3. **Tray order** — shuffle of needed pieces plus extras.

Spot layout and `topKind` do not randomize. Two Medium plays of castle 4 can differ in colors and extras.

## Architecture

Same shape as the other two games. No new libraries. No server. No network except the existing optional Google Fonts.

```
ai-sync/beach-day/
  stack.js              # recipes, generator, open spots, place, advance
  test/stack.test.js
  app.js                # third game: menu, difficulty title, tap/drag, wiggle, cheer
  index.html            # exhibit + #stack-screen
  styles.css            # picture, pad, spots, tray — painted tiles and PNGs only
  README.md
```

Tidy (`game.js`) and Path (`path.js`) keep their APIs. `app.js` gains a third session and screen the same way it gained Crab Path.

### Session

```
{
  difficulty,    // "easy" | "medium" | "hard"
  roundIndex,    // 0..5
  spots,         // ordered list of spot ids this castle has
  target,        // { [spotId]: { kind, color } }
  filled,        // { [spotId]: piece | null }
  tray,          // [piece] still in the tray
  complete,
  finished
}
```

A **piece** is `{ id, kind, color }` where `kind` is `"bucket"` | `"turret"` | `"drip"` and `color` is `"sand"` | `"orange"`. `id` is unique in that castle (two sand turrets on Medium castle 1 are two pieces).

Asset for a piece: `assets/sandcastle-` + kind + `-` + color + `.png`.

`place` / `advance` copy the session. They do not mutate the session they were given.

### API

- `Sandcastle.ROUND_COUNT` is `6`.
- `Sandcastle.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `Sandcastle.createSessionAt(roundIndex, { difficulty, random })` — same defaults; throws if `roundIndex` is out of range.
- `Sandcastle.currentCastle(session)` → `{ spots, target, filled, tray }` from the session.
- `Sandcastle.pieceById(session, id)` → piece or `null` (looks in tray and filled).
- `Sandcastle.openSpots(session)` → spot ids that may accept a piece right now.
- `Sandcastle.place(session, pieceId, spotId)` → `{ ok, session }`. Copies the session. Does not mutate the input.
- `Sandcastle.advance(session, random)` — no-op unless `complete && !finished`. After castle 6, sets `finished`. Otherwise deals the next recipe at the **same difficulty**.
- `Sandcastle.playAgain(session, random)` — new session at `session.difficulty`, castle 1, new roll. If `session` is omitted, same as `createSession()` (medium, castle 1).

`random` is a function that returns a number in `[0, 1)`, same contract as `Math.random`. Tests pass a stub so results are stable.

### Open spots

```
if base is empty → ["base"]
else
  open = every empty side this castle has (left, right)
  if this castle has top
     and top is empty
     and every side this castle has is filled
     → also open top
  return open
```

A castle with no sides treats “every side is filled” as true, so Easy’s top opens after the base.

### Place rules

`place` succeeds only when all of these are true:

1. `pieceId` is still in `tray`.
2. `spotId` is in `session.spots`.
3. That spot is empty.
4. That spot is in `openSpots(session)`.
5. The piece’s `kind` and `color` both match `target[spotId]`.

On success: remove the piece from `tray`, set `filled[spotId]` to the piece, set `complete` if every spot in `spots` is filled.

On failure: `{ ok: false, session }` with the copy unchanged. The UI wiggles the piece back to the tray.

Two target sides with the same kind and color (both sand turrets) both accept either matching tray turret.

A decoy never has the same `kind` and `color` as any target slot. If it did, dropping it on that slot would count as correct.

### Generator

Catalog is the six painted pairs: bucket/turret/drip × sand/orange.

1. Read the recipe for `(difficulty, roundIndex)`.
2. Build `target` kinds from spots: base → bucket, left/right → turret, top → `topKind` (Hard always drip).
3. Assign colors:
   - `sand`: every target slot sand.
   - `one-orange-side`: base sand; exactly one of left/right orange, the other sand; which side: `random() < 0.5` → left, else right.
   - `sides-different`: left sand if `random() < 0.5` else orange; right is the other color. Base: sand unless `colorMode` is `orange-base` (not combined in this spec’s table). Top if present: sand if `random() < 0.5` else orange.
   - `mixed`: each slot sand if `random() < 0.5` else orange. If every slot is sand, flip a slot chosen by `floor(random() * slotCount)` to orange. If every slot is orange, flip one the same way to sand.
   - `orange-base`: base orange; left, right, and top (if present) each sand if `random() < 0.5` else orange.
4. Create one tray piece per target slot, new ids, matching that slot’s kind and color. Two same-color sides are two pieces.
5. Build the unused list: catalog pairs whose `(kind, color)` is not used by any target slot.
6. Add `decoys` extras. First satisfy `decoyNeed` in order, each taking one unused pair (`sand-turret` → turret+sand, `any-orange` → first unused orange in catalog order bucket, turret, drip after shuffle of unused, `any-drip` / `any-turret` → first unused of that kind). Then fill remaining extra slots from leftover unused pairs, shuffled with `random`.
7. If a required decoy cannot be taken from unused (should not happen with these recipes), skip that constraint and take any leftover unused pair instead. Never invent a seventh shape. Never add a pair that matches a target slot. If unused pairs run out before `decoys` is met, clone an already-chosen unused pair with a new id (same kind and color). Do not clone a target pair.
8. Shuffle the tray with `random`.
9. `filled` starts with every spot `null`. `complete` and `finished` are false.

Do not loop-until-timeout.

Catalog order for deterministic “first unused” after a shuffle is whatever order `random` produced. Tests that care about a specific extra pass a stub and assert kind/color properties, not a particular id.

### Title / difficulty / menu

Reuse `#difficulty-screen`. When Sandcastle Stack is chosen, set the heading to **Sandcastle Stack** and `pendingGame = "stack"`. Crab Path and Tide Pool Tidy keep their existing titles and pending ids.

Exhibit order: **Tide Pool Tidy**, **Sandcastle Stack**, **Crab Path**. Arrow Left / Arrow Right cycle that list. The menu crab sits under the selected card (three positions, not the current two-offset tidy/path toggle).

Difficulty buttons: if `pendingGame === "stack"` call `startStack(difficulty)`; path and tidy unchanged.

**Play again** on Sandcastle Stack calls `Sandcastle.playAgain(stackSession)` and re-renders the stack screen. Difficulty does not change.

### Screen

New `#stack-screen`, hidden until play, same sky chrome as the other play screens (Games, sun, hint).

Pad layout, using the same spots the recipe named:

```
        [top]
[left] [base] [right]
```

A castle that lacks a spot does not draw that pad. Easy is a centered column (base, top). Medium is a row (left, base, right). Hard is the full plus.

The picture is a smaller copy of that same layout with every target piece already shown. It is not a second illustration.

Tray is a row of the remaining pieces under the pad, same chunky piece treatment as Tide Pool Tidy’s sand.

The beach kid stands beside the pad, same `data-kid` celebrate frames as the other games.

## Edges

- Unknown difficulty → medium.
- `random` omitted → `Math.random`.
- Reduced motion: skip or shorten wiggle and cheer (existing pattern).
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.
- A miss leaves the piece in the tray (the failed `place` copy is unchanged).
- Locked and filled spots never succeed.
- Easy castle 1 has exactly two tray pieces: sand bucket, sand drip.
- Hard castle 1 has exactly four tray pieces, all sand: bucket, two turrets, drip.

## Testing

Keep Node `assert` in `test/stack.test.js`. Pass a fake `random` into every test that deals a castle.

In tests, castle numbers are **0-based** (`roundIndex` 0 is Easy castle 1 in the tables).

- `createSession()` with no args has `difficulty === "medium"` and `roundIndex === 0`.
- Unknown difficulty string yields medium.
- Easy 0: spots `base` and `top`, target base is sand bucket, target top is sand drip, tray length 2, `openSpots` is `["base"]`.
- Easy 1: top is sand turret, tray length 2.
- Easy 2: tray length 3, one tray piece is sand turret, `openSpots` starts as `["base"]`.
- After a correct base on Easy 0, `openSpots` is `["top"]`.
- Medium 0: spots `base`, `left`, `right`; no top; after a correct base, `openSpots` is `left` and `right` (either order).
- Hard 0: four spots; top stays closed until both sides are filled; after base + left + right, `openSpots` is `["top"]`.
- `place` of the wrong kind or color on an open spot returns `ok: false` and does not change `tray` or `filled`.
- `place` on a locked spot returns `ok: false`.
- `place` of a piece not in the tray returns `ok: false`.
- Correct places do not mutate the input session.
- Filling the last spot sets `complete`.
- `advance` after a complete castle goes to the next `roundIndex` at the same difficulty.
- `advance` after complete castle 6 sets `finished` and does not wrap.
- `playAgain(session)` returns castle 1 at `session.difficulty`.
- `playAgain()` with no session is medium castle 1.
- No decoy shares `kind` and `color` with any target slot.
- Easy 4 tray includes a sand turret and one orange piece.
- Medium 5 tray includes a drip decoy.
- Hard 3 tray includes a drip whose color is not the top’s color.
- Two `createSession({ difficulty: "medium" })` calls with two different stubs can differ in a target color or tray order.
- `advance` keeps `difficulty`.
- A decoy is never a clone of a target `(kind, color)` pair.

## Out of scope

Changing Tidy or Path rules. New painted pieces. SVG or generated vector art. Undo / taking a correct piece off. A fifth spot. Diagonal or free placement. Timers, scores, sound, accounts. Magic School Bus characters.

## Spec coverage

This is a new game. It reuses the Beach Day shell (menu, difficulty, six-beat session, cheer, tap/drag, wiggle, painted assets) and adds one build/copy verb.
