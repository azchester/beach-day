# Paint by Number — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

**Pictures, layouts, outlines, and palette use:** see `2026-08-18-paint-scenes-design.md`. That spec replaces those sections below. Fill rules, session shape, and menu flow here still apply.

## Purpose

A fourth Beach Day game. She fills a generated coloring-book outline by matching numbered pots to numbered blobs. He talks it through. No timer, no losing score, no required reading.

Tide Pool Tidy stays sort. Beach Puzzle stays snap. Crab Path stays hop. Sandcastle Stack stays removed. Sea Glass stays unimplemented. This spec is **Paint by Number only**.

## Player experience

Menu has four cards. The new one is **Paint by Number**, blurb **Color the picture**. Tap it. Play starts on the coloring page — there is no **How hard today?** step for this game. Tide Pool Tidy, Beach Puzzle, and Crab Path still ask how hard.

One of the eight outlines is chosen at random.

She taps a numbered color pot, then taps every blob with that number. The pot stays chosen until she taps another.

- Right pot on an empty blob: the blob fills with that color. The number goes away so the picture appears. She cannot peel the fill off or paint over it.
- Wrong pot, no pot chosen, or a blob that is already filled: the blob wiggles and stays as it was. Nothing scolds.

When every blob is filled, the kid cheers (**What a picture!**). Then **Play again** deals a new random picture, or **More games** / **Games** return to the menu. Refresh returns to the menu. No saved pictures.

No hint sentence she must read. Numbers on pots and empty blobs are matching symbols; the adult can say the number. The sky still has **Games** and the sun.

## Visual style

Same paint / crayon Beach Day look as the kid, the shells, and the twelve puzzle scenes: chunky navy outlines, bright field-trip colors, gouache-ish fills.

Each picture is a **generated coloring-book outline** — empty regions, thick outlines, no pre-filled paint except the paper/sand of the page, **no numerals** (numbers are drawn by the UI on empty SVG blobs). Square page (`1:1`) so the blob viewBox `0 0 100 100` lines up. Generated at implementation time with the existing kid and puzzle art as style references, then checked in as PNGs. The browser does not generate art while she plays. No network except the existing optional Google Fonts.

Not allowed: generic icon-font outlines, photoreal coloring pages, watercolor that does not match the puzzle scenes, or a live image-model call from `index.html`.

The numbered blobs are **organic SVG paths** generated from the outline’s flood-fill pockets. One map per picture. Image models do not invent the numbers or the region map. Blob borders follow the ink; they are never replaced with bounding-box rectangles.

The menu card uses the sun outline plus a few numbered pots, same foam-card construction as the other exhibits.

## Pictures and paints

Eight subjects. A deal picks one at random. Each picture has a **fixed ordered palette**, so the sun stays sunny. Randomness is which picture — not a green sun.

| Index | Id         |
|-------|------------|
| 0     | sun        |
| 1     | crab       |
| 2     | sandcastle |
| 3     | fish       |
| 4     | starfish   |
| 5     | boat       |
| 6     | shell      |
| 7     | bucket     |

`Paint.PICTURE_COUNT` is `8`. A deal picks `pictureIndex` uniformly in `0 .. 7` with `random`.

Ten named paints in one shared box. Pots and fills use these names; numbers `1..K` are the index in that picture’s palette (1-based).

| Name      | Hex     | Role                         |
|-----------|---------|------------------------------|
| sunflower | `#ffe14a` | yellow                     |
| orange    | `#f4a03c` | amber / ray / starfish     |
| coral     | `#e24b3c` | crab, bucket, boat hull    |
| peach     | `#f7c09a` | shell, soft highlight      |
| sand      | `#f2d04a` | beach, castle              |
| foam      | `#fff8ee` | paper only — never a pot   |
| sky       | `#4eb0ea` | blue sky                   |
| water     | `#2aa8a8` | teal sea                   |
| kelp      | `#2f7a52` | green                      |
| navy      | `#2a3a6a` | deep blue (jacket, door)   |

`Paint.COLORS` is `["sunflower","orange","coral","peach","sand","foam","sky","water","kelp","navy"]`.

Each picture’s palette is an ordered list of eight of those names. A deal opens the pots that actually appear on that picture’s map (usually a handful of the first names). Numbers on pots are `1..K` in this order. Foam is the paper, never a pot — cream fills would vanish on the page.

| Id         | Palette (1 → 8)                                              |
|------------|--------------------------------------------------------------|
| sun        | sunflower, orange, sky, kelp, sand, water, coral, peach      |
| crab       | coral, sand, sky, kelp, orange, water, peach, sunflower     |
| sandcastle | sand, orange, sky, navy, coral, kelp, sunflower, water       |
| fish       | water, sunflower, sky, navy, coral, kelp, orange, peach      |
| starfish   | orange, sand, water, sky, coral, sunflower, peach, kelp      |
| boat       | coral, peach, sky, water, sunflower, navy, sand, orange      |
| shell      | peach, orange, sand, kelp, sunflower, water, coral, sky      |
| bucket     | coral, sand, peach, navy, sky, orange, sunflower, water      |

Outline file for `{id}` is `assets/paint/{id}-outline.png`. One outline per subject. One blob map per outline. Inner crayon lines on the outline may be finer than the blob borders; blob borders follow the major outlines so fills look intended.

## One picture, no difficulty

Paint by Number has no Easy / Medium / Hard. Cell count and pot count come from the picture’s natural ink pockets after tiny dust is folded into a neighbor. About six paints is typical. Color 1 is still the subject’s main fill (sun face, crab body, castle sand, and so on).

Blobs stay large enough to tap (fat hit stroke on the path). No sliver regions. Blobs do not overlap except shared strokes. They stay inside the picture box. A failed contour is skipped or merged — never turned into a rectangle.

## Fill rules

A blob may fill only when all of these are true:

1. A pot is chosen (`selectedColor` is an integer `1..K`).
2. The blob is on this picture and still empty.
3. `selectedColor` equals that blob’s `color`.

On success the blob is marked filled. She cannot take the color back off.

On failure the engine returns `{ ok: false }` and does not change the copy. The UI wiggles the blob.

`selectColor` succeeds only when `n` is an integer in `1..K`. On success the copy’s `selectedColor` is `n`. On failure `{ ok: false }` and the previous choice (including `null`) stays.

When every blob is filled, the picture is **complete**.

## Architecture

Same pattern as Tidy, Path, and Puzzle. No new libraries. No server. No network except the existing optional Google Fonts.

```
ai-sync/beach-day/
  paint.js                         # pictures, palettes, layouts, fill, complete
  test/paint.test.js
  app.js                           # fourth game: menu, pots, tap, wiggle, cheer
  index.html                       # exhibit + #paint-screen
  styles.css                       # outline, blobs, pots
  assets/paint/{id}-outline.png    # eight generated coloring-book pages
  README.md
```

Tidy, Puzzle, and Path keep their APIs.

### Session

```
{
  pictureIndex,    // 0..7
  selectedColor,   // 1..K or null
  cells,           // [{ id, color }]
  filled,          // { [cellId]: true }
  complete
}
```

A cell `id` is `0 .. n-1` in layout order. `color` is the pot number `1..K`, not the paint name.

`selectColor` / `fill` / `playAgain` copy the session. They do not mutate the session they were given.

Pixel paths live in `layout`, not in the session. The UI calls `layout` for SVG `d` values. `selectedColor` starts `null` (no pot chosen). `filled` starts as an empty object.

### API

- `Paint.PICTURE_COUNT` is `8`.
- `Paint.PICTURES` is `["sun","crab","sandcastle","fish","starfish","boat","shell","bucket"]`.
- `Paint.COLORS` is `["sunflower","orange","coral","peach","sand","foam","sky","water","kelp","navy"]`.
- `Paint.palette(pictureIndex)` → that picture’s full 8-name list. Unknown or out-of-range `pictureIndex` → sun (`0`). The UI only draws pots whose numbers appear on the layout.
- `Paint.colorName(pictureIndex, colorNumber)` → paint name for pot `colorNumber` on that picture’s **full 8-name list** (1-based). `null` if `colorNumber` is not in `1..8`. Unknown `pictureIndex` → sun.
- `Paint.layout(pictureIndex)` → organic `[{ id, color, d, lx, ly }]` for that picture. `d` is an SVG path in viewBox `0 0 100 100`. Unknown or out-of-range `pictureIndex` → sun (`0`).
- `Paint.pictureId(session)` → `Paint.PICTURES[session.pictureIndex]`.
- `Paint.pictureSrc(session)` → `assets/paint/{id}-outline.png`.
- `Paint.createSession({ random })` — omitted `random` is `Math.random`.
- `Paint.selectColor(session, n)` → `{ ok, session }`. Copies. `n` must be an integer in `1..K` for colors that appear on this deal.
- `Paint.fill(session, cellId)` → `{ ok, session }`. Copies. `ok` is false when the fill rules fail.
- `Paint.playAgain(session, random)` — new session, new picture roll, `selectedColor` null. If `session` is omitted, same as `createSession()`.

`random` is a function that returns a number in `[0, 1)`. Tests pass a stub.

### Generator

1. `pictureIndex = floor(random() * 8)` clamped to `0..7`.
2. Load `layout(pictureIndex)`. Session `cells` is `{ id, color }` for each layout cell. UI calls `layout` again for `d`.
3. `selectedColor` is `null`. `filled` is `{}`. `complete` is false.

Do not loop-until-timeout. Do not shuffle palette order.

### Title / difficulty / menu

Paint by Number skips `#difficulty-screen`. Choosing the exhibit calls `startPaint()` and opens `#paint-screen`. The other three games still use **How hard today?**.

Exhibit order: **Tide Pool Tidy**, **Beach Puzzle**, **Crab Path**, **Paint by Number**. Arrow keys cycle that list. The menu crab sits under the selected card (four positions).

**Play again** calls `Paint.playAgain(paintSession)` and re-renders a new picture.

### Screen

New `#paint-screen`, hidden until play, sand background like Puzzle and Path, sky chrome with Games and the sun. No hint sentence.

- Coloring-book outline centered on the sand.
- SVG blobs on top: empty blobs show their number; filled blobs are the pot’s paint color with no number.
- Numbered pots along the bottom (same band language as Tide Pool Tidy’s pools). The chosen pot has a clear selected ring. Extra pots wrap if needed.
- The beach kid stands beside the picture, same `data-kid` celebrate frames as the other games.

Reduced motion: skip wiggle and cheer motion.

## Edges

- `random` omitted → `Math.random`.
- Reduced motion: skip wiggle and cheer motion (existing pattern).
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.
- No pot chosen: `fill` fails; the cell stays empty.
- A miss leaves the cell empty (the failed `fill` copy is unchanged).
- Filled cells never succeed again.
- `selectColor` outside `1..K` fails; the previous `selectedColor` stays.
- Two different `random` stubs can yield a different `pictureIndex`.
- Palette order never shuffles.

## Testing

Keep Node `assert` in `test/paint.test.js`. Pass a fake `random` into every test that deals.

- `createSession()` with no args has no `difficulty`, at least 3 cells, `selectedColor === null`, `complete === false`.
- `pictureIndex` is an integer in `0..7`.
- `pictureId` for index 0 is `"sun"`.
- `pictureSrc` for sun ends with `sun-outline.png`.
- `palette(0)` is the sun’s full 8-name list. `palette(1)` starts with `"coral"`.
- `colorName(0, 1)` is `"sunflower"`. `colorName(0, 9)` is `null`.
- Every picture layout is organic (not an axis-aligned 4-corner rectangle).
- `selectColor(session, 1)` returns `ok: true`, sets `selectedColor` to `1`, and does not mutate the input session.
- `selectColor(session, 0)` and `selectColor(session, 99)` return `ok: false`.
- After `selectColor` of a cell’s color, `fill` of that empty cell returns `ok: true`, marks it filled, and does not mutate the input session.
- `fill` with `selectedColor === null` returns `ok: false`.
- `fill` of the wrong color returns `ok: false`.
- `fill` of a filled cell returns `ok: false`.
- `fill` of an unknown `cellId` returns `ok: false`.
- Filling the last cell sets `complete`.
- `playAgain(session)` has no `difficulty` and may change `pictureIndex` when stubs differ.
- Two `createSession` calls with `always(0)` vs `always(0.99)` differ in `pictureIndex`.

Layout path strings are required and non-empty; tests do not assert exact Bézier coordinates.

## Out of scope

Changing Tidy, Puzzle, or Path. Implementing Sea Glass or bringing Sandcastle Stack back. Live image generation while she plays. Undo / taking a correct fill off. Saving pictures. Pinch-zoom. Rectangular pixel grids. Easy / Medium / Hard for paint. Timers, scores, sound, accounts.

## Spec coverage

This is a new game. It reuses the Beach Day shell (menu, cheer, tap, wiggle, painted art) and adds one match-the-number verb: pick a pot, tap the blobs. Paint skips the shared difficulty screen.
