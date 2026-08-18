# Sea Glass — Design

Date: 2026-08-17  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A fourth Beach Day game. She fills a painted silhouette with frosted sea-glass chips. He talks it through. No timer, no losing score, no required reading.

Tide Pool Tidy stays sort. Beach Puzzle stays snap. Crab Path stays hop. Sandcastle Stack stays removed. This spec is **Sea Glass only**.

## Player experience

Menu has four cards. The new one is **Sea Glass**, blurb **Fill the picture**. Tap it. The existing **How hard today?** screen appears, titled **Sea Glass**, with **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no extra “Let’s make art” step.

One of the eight silhouettes is chosen at random. A tray of frosted glass chips sits under it.

She uses the same drag-or-tap as Tide Pool Tidy.

- Right color on an empty hole: the chip sits. She cannot peel it off.
- Wrong color, a filled hole, or an extra: the chip wiggles back. Nothing scolds.

When every hole has glass, the kid cheers (**What a picture!**). Then **Play again** deals a new silhouette at **the same difficulty**, or **More games** / **Games** return to the menu. Refresh returns to the menu so a different difficulty can be picked. No mid-play difficulty switch. No saved pictures.

No hint sentence she must read. The sky still has **Games** and the sun.

## Visual style

Same paint / crayon Beach Day look as the kid, the shells, and the twelve puzzle scenes: chunky outlines, bright field-trip colors, frosted glass that still reads as a drawing.

Every picture, chip, Medium paint-under, and Hard mini mosaic is a **painted PNG** generated or drawn to match those files.

Not allowed: generic SVG silhouettes, icon fonts, outline-only clip-art, stock sea-glass photos, or a sudden watercolor / photoreal style. If a later chip or picture is added, it is painted to match these files first.

## Pictures and glass

Eight silhouettes. A deal picks one at random. Each picture has a **fixed** color set, so the sun stays sunny and the fish stays watery. Randomness is which picture, which extras, and tray order — not a blue sun.

| Index | Id        | Hole colors              |
|-------|-----------|--------------------------|
| 0     | heart     | aqua, white, seafoam     |
| 1     | sun       | amber, white             |
| 2     | fish      | aqua, seafoam, white     |
| 3     | starfish  | amber, white             |
| 4     | boat      | cobalt, white, amber     |
| 5     | flower    | seafoam, amber, white    |
| 6     | crab      | amber, white, seafoam    |
| 7     | moon      | white, cobalt            |

`SeaGlass.PICTURE_COUNT` is `8`. A deal picks `pictureIndex` uniformly in `0 .. 7` with `random`.

Glass is **color only**. Five frosted chips:

| Color    | File                       |
|----------|----------------------------|
| white    | `assets/glass-white.png`   |
| seafoam  | `assets/glass-seafoam.png` |
| aqua     | `assets/glass-aqua.png`    |
| cobalt   | `assets/glass-cobalt.png`  |
| amber    | `assets/glass-amber.png`   |

One painted chip per color in this version. Shard shape may vary later as a cosmetic extra; `place` never looks at shape. Any aqua chip fits any aqua hole.

Each picture also has three painted PNGs, same crayon style, not SVG:

| Role                         | File                                      |
|------------------------------|-------------------------------------------|
| Empty outline (Easy + Hard board) | `assets/glass-pictures/{id}-outline.png` |
| Crayon painting (Medium board)    | `assets/glass-pictures/{id}-paint.png`   |
| Finished mosaic (Hard preview)    | `assets/glass-pictures/{id}-done.png`    |

`{id}` is the picture id (`heart`, `sun`, …). The Medium paint uses that picture’s color set in the same regions the holes sit on, so the color around a hole is the color that hole wants. The Hard done mosaic is the same 25-hole layout, already filled, so she can copy where each color sits.

The menu card uses painted chips on the heart picture, same foam-card construction as the other exhibits.

## Difficulty

One picture per play. Difficulty chooses hole count, how the picture talks, and whether extras sit in the tray.

| Difficulty | Holes | Cue | `cue` value | Extras | Tray length |
|------------|-------|-----|-------------|--------|-------------|
| Easy | 9 | Each hole is **tinted** the color it wants. The silhouette is otherwise the empty outline. | `tint` | 0 | 9 |
| Medium | 16 | The **painted** picture sits under the holes. She matches glass to the color around the hole. The holes themselves are empty sand. | `paint` | 2 | 18 |
| Hard | 25 | Holes are empty sand. A **tiny finished mosaic** (`{id}-done.png`) sits beside the empty outline. She copies it. | `copy` | 3 | 28 |

Each silhouette has **three complete layouts** (9 / 16 / 25). Easy is nine bigger chips that still make a whole heart or sun — not a 25-hole picture with most spots missing. Chip size shrinks as the count grows, same idea as Beach Puzzle. A Hard chip stays at least about a fingertip wide (target: at least 44px CSS).

That picture’s color set does not change with difficulty.

Default difficulty is **medium** when `createSession` is called with no options. Unknown difficulty string is treated as **medium**.

### Color counts

Every hole color is in that picture’s set. Every color in the set appears at least once. Exact counts:

**Heart** (aqua, white, seafoam)

| Difficulty | aqua | white | seafoam |
|------------|------|-------|---------|
| Easy | 5 | 2 | 2 |
| Medium | 8 | 4 | 4 |
| Hard | 13 | 6 | 6 |

**Sun** (amber, white)

| Difficulty | amber | white |
|------------|-------|-------|
| Easy | 6 | 3 |
| Medium | 11 | 5 |
| Hard | 17 | 8 |

**Fish** (aqua, seafoam, white)

| Difficulty | aqua | seafoam | white |
|------------|------|---------|-------|
| Easy | 5 | 2 | 2 |
| Medium | 8 | 4 | 4 |
| Hard | 13 | 6 | 6 |

**Starfish** (amber, white)

| Difficulty | amber | white |
|------------|-------|-------|
| Easy | 6 | 3 |
| Medium | 11 | 5 |
| Hard | 17 | 8 |

**Boat** (cobalt, white, amber)

| Difficulty | cobalt | white | amber |
|------------|--------|-------|-------|
| Easy | 4 | 3 | 2 |
| Medium | 7 | 5 | 4 |
| Hard | 11 | 8 | 6 |

**Flower** (seafoam, amber, white)

| Difficulty | seafoam | amber | white |
|------------|---------|-------|-------|
| Easy | 5 | 2 | 2 |
| Medium | 8 | 4 | 4 |
| Hard | 13 | 6 | 6 |

**Crab** (amber, white, seafoam)

| Difficulty | amber | white | seafoam |
|------------|-------|-------|---------|
| Easy | 5 | 2 | 2 |
| Medium | 8 | 4 | 4 |
| Hard | 13 | 6 | 6 |

**Moon** (white, cobalt)

| Difficulty | white | cobalt |
|------------|-------|--------|
| Easy | 6 | 3 |
| Medium | 11 | 5 |
| Hard | 17 | 8 |

Hole positions for each layout live in `glass.js` as fractions of the silhouette box. Chips do not overlap. They stay inside the silhouette. Exact coordinates are implementation; tests check counts and color sets, not pixels.

## Place rules

A chip may sit in a hole only when all of these are true:

1. The chip is still in the tray.
2. The hole is on this picture and still empty.
3. The chip’s **color** matches the hole’s color.

On success the chip leaves the tray and fills that hole. She cannot take it back off.

On failure the engine returns `{ ok: false }` and does not change the copy. The UI wiggles the chip back to the tray.

Any aqua chip fits any aqua hole. Two white holes both accept either white chip.

An extra never shares a color with any hole on that picture, so it can never sit.

When every hole is filled, the picture is **complete**.

## Architecture

Same pattern as Tidy, Path, and Puzzle. No new libraries. No server. No network except the existing optional Google Fonts.

```
ai-sync/beach-day/
  glass.js                      # pictures, layouts, place, complete
  test/glass.test.js
  app.js                        # fourth game: menu, drag, wiggle, cheer
  index.html                    # exhibit + #glass-screen
  styles.css                    # silhouette, holes, tray, chips
  assets/glass-white.png
  assets/glass-seafoam.png
  assets/glass-aqua.png
  assets/glass-cobalt.png
  assets/glass-amber.png
  assets/glass-pictures/*.png   # eight outlines, paints, and done mosaics
  README.md
```

Tidy, Puzzle, and Path keep their APIs.

### Session

```
{
  difficulty,     // "easy" | "medium" | "hard"
  pictureIndex,   // 0..7
  cue,            // "tint" | "paint" | "copy"
  holes,          // [{ id, color }]  length 9 / 16 / 25
  filled,         // { [holeId]: piece | null }
  tray,           // [piece] still in the tray
  complete
}
```

A **piece** is `{ id, color }` where `color` is `"white"` | `"seafoam"` | `"aqua"` | `"cobalt"` | `"amber"`. `id` is an integer, unique in that play, starting at `0`.

`place` / `playAgain` copy the session. They do not mutate the session they were given.

Pixel positions live in `app.js` (scaled from the layout fractions in `glass.js`).

### API

- `SeaGlass.PICTURE_COUNT` is `8`.
- `SeaGlass.PICTURES` is `["heart","sun","fish","starfish","boat","flower","crab","moon"]`.
- `SeaGlass.COLORS` is `["white","seafoam","aqua","cobalt","amber"]`.
- `SeaGlass.grid(difficulty)` → `{ holes }` (`9` / `16` / `25`). Unknown difficulty → medium.
- `SeaGlass.extraCount(difficulty)` → `0` / `2` / `3`. Unknown difficulty → `2`.
- `SeaGlass.cueFor(difficulty)` → `"tint"` / `"paint"` / `"copy"`. Unknown difficulty → `"paint"`.
- `SeaGlass.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `SeaGlass.pictureId(session)` → `SeaGlass.PICTURES[session.pictureIndex]`.
- `SeaGlass.pictureColors(pictureIndex)` → the set of hole colors for that picture (array, stable order as in the Pictures table).
- `SeaGlass.layout(pictureIndex, difficulty)` → designed `[{ id, color, x, y }]` for that picture and difficulty. Hole `id` is `0 .. n-1` in layout order. `x` and `y` are `0..1` in the silhouette box. Unknown difficulty → medium layout. Unknown or out-of-range `pictureIndex` → heart (`0`).
- `SeaGlass.place(session, pieceId, holeId)` → `{ ok, session }`. Copies. `ok` is false when the place rules fail.
- `SeaGlass.pieceById(session, id)` → piece or `null` (looks in tray and filled).
- `SeaGlass.playAgain(session, random)` — new session at `session.difficulty`, new picture roll and new extras. If `session` is omitted, same as `createSession()` (medium).

`random` is a function that returns a number in `[0, 1)`. Tests pass a stub.

### Generator

1. Normalize `difficulty`. Read hole count, cue, extra count.
2. `pictureIndex = floor(random() * 8)` clamped to `0..7`.
3. Load `layout(pictureIndex, difficulty)`. Session `holes` is `{ id, color }` for each layout hole. UI calls `layout` again for `x,y`.
4. One tray piece per hole, matching that hole’s color, ids `0 .. n-1` in layout order.
5. Unused colors = `COLORS` minus that picture’s color set. Shuffle unused with `random`. Take extras from that shuffled list, ids continuing from `n`. If unused colors run out before the extra count is met, clone the first extra already chosen (new id). Never clone a color that is on the picture. Pictures with only two unused colors (heart, fish, boat, flower, crab) clone on Hard’s third extra.
6. Shuffle the tray with `random`.
7. `filled` starts with every hole `null`. `complete` is false.

Do not loop-until-timeout.

### Title / difficulty / menu

Reuse `#difficulty-screen`. When Sea Glass is chosen, heading **Sea Glass** and `pendingGame = "glass"`. The other three games keep their titles.

Exhibit order: **Tide Pool Tidy**, **Beach Puzzle**, **Crab Path**, **Sea Glass**. Arrow keys cycle that list. The menu crab sits under the selected card (four positions).

Difficulty buttons: `pendingGame === "glass"` → `startGlass(difficulty)`.

**Play again** calls `SeaGlass.playAgain(glassSession)` and re-renders. Difficulty does not change.

### Screen

New `#glass-screen`, hidden until play, sand background like Puzzle and Path, sky chrome with Games and sun.

- **Easy / Medium:** silhouette in the center, tray of chips under it.
- **Hard:** tiny finished mosaic beside (or above) the empty silhouette, tray under it.

Empty holes are sand-colored circles with a thick ink rim (same language as Crab Path’s sand tiles). Easy tints the inside of that hole the target color. Medium leaves the hole sand and puts the color in `{id}-paint.png` around it. Hard leaves every hole sand; the color lives only on `{id}-done.png`.

Chips in the tray are the painted glass PNGs. The Hard tray wraps (28 chips).

The beach kid stands beside the picture, same `data-kid` celebrate frames as the other games.

Reduced motion: skip wiggle and cheer motion.

## Edges

- Unknown difficulty → medium.
- `random` omitted → `Math.random`.
- Reduced motion: skip wiggle and cheer motion (existing pattern).
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.
- A miss leaves the chip in the tray (the failed `place` copy is unchanged).
- Filled holes never succeed.
- An extra never shares a color with any hole on that picture.
- Two different `random` stubs can yield a different `pictureIndex` or a different tray order.
- Heart / fish / boat / flower / crab Hard extras: two unused colors plus one clone of an unused color.

## Testing

Keep Node `assert` in `test/glass.test.js`. Pass a fake `random` into every test that deals.

- `createSession()` with no args has `difficulty === "medium"`, `cue === "paint"`, 16 holes, 2 extras, tray length 18.
- Unknown difficulty string yields medium.
- Easy: 9 holes, cue `"tint"`, 0 extras, tray length 9.
- Hard: 25 holes, cue `"copy"`, 3 extras, tray length 28.
- `pictureIndex` is an integer in `0..7`.
- `pictureId` for index 0 is `"heart"`.
- `pictureId` for index 1 is `"sun"`.
- Sun layouts at every difficulty use only amber and white on holes, and both colors appear.
- Heart layouts use only aqua, white, and seafoam, and all three appear.
- Easy sun hole colors: 6 amber, 3 white.
- Medium sun hole colors: 11 amber, 5 white.
- Hard sun hole colors: 17 amber, 8 white.
- `place` of a matching color on an empty hole returns `ok: true`, moves the piece from tray to `filled`, and does not mutate the input session.
- `place` of the wrong color returns `ok: false`.
- `place` of an extra returns `ok: false`.
- `place` on a filled hole returns `ok: false`.
- `place` of a chip not in the tray returns `ok: false`.
- Two holes of the same color both accept either matching chip.
- Filling the last Easy hole sets `complete`.
- `playAgain(session)` keeps `difficulty` and may change `pictureIndex` when stubs differ.
- `playAgain()` with no session is medium.
- No extra shares a color with any hole.
- Hard heart extras are only cobalt and/or amber (the unused colors), length 3.

## Out of scope

Changing Tidy, Puzzle, or Path. Beachcomb-then-craft. Free decorate. Shape-matching. Rotating chips. Undo / taking a correct chip off. Saving pictures. Pinch-zoom. Generic SVG or stock art. Timers, scores, sound, accounts.

## Spec coverage

This is a new game. It reuses the Beach Day shell (menu, difficulty, cheer, tap/drag, wiggle, painted art) and adds one fill-the-picture verb.
