# Paint by Number — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A fourth Beach Day game. She fills a generated coloring-book outline by matching numbered pots to numbered blobs. He talks it through. No timer, no losing score, no required reading.

Tide Pool Tidy stays sort. Beach Puzzle stays snap. Crab Path stays hop. Sandcastle Stack stays removed. Sea Glass stays unimplemented. This spec is **Paint by Number only**.

## Player experience

Menu has four cards. The new one is **Paint by Number**, blurb **Color the picture**. Tap it. The existing **How hard today?** screen appears, titled **Paint by Number**, with **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no extra “Let’s paint” step.

One of the eight outlines is chosen at random.

She taps a numbered color pot, then taps every blob with that number. The pot stays chosen until she taps another.

- Right pot on an empty blob: the blob fills with that color. The number goes away so the picture appears. She cannot peel the fill off or paint over it.
- Wrong pot, no pot chosen, or a blob that is already filled: the blob wiggles and stays as it was. Nothing scolds.

When every blob is filled, the kid cheers (**What a picture!**). Then **Play again** deals a new random picture at **the same difficulty**, or **More games** / **Games** return to the menu. Refresh returns to the menu so a different difficulty can be picked. No mid-play difficulty switch. No saved pictures.

No hint sentence she must read. Numbers on pots and empty blobs are matching symbols; the adult can say the number. The sky still has **Games** and the sun.

## Visual style

Same paint / crayon Beach Day look as the kid, the shells, and the twelve puzzle scenes: chunky navy outlines, bright field-trip colors, gouache-ish fills.

Each picture is a **generated coloring-book outline** — empty regions, thick outlines, no pre-filled paint except the paper/sand of the page, **no numerals** (numbers are drawn by the UI on empty SVG blobs). Square page (`1:1`) so the blob viewBox `0 0 100 100` lines up. Generated at implementation time with the existing kid and puzzle art as style references, then checked in as PNGs. The browser does not generate art while she plays. No network except the existing optional Google Fonts.

Not allowed: generic icon-font outlines, photoreal coloring pages, watercolor that does not match the puzzle scenes, or a live image-model call from `index.html`.

The numbered blobs are **authored SVG paths** drawn on top of that outline so Easy / Medium / Hard always have exact cell and color counts. Image models do not invent the numbers or the region map.

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
| foam      | `#fff8ee` | cream / cloud / sail       |
| sky       | `#4eb0ea` | blue sky                   |
| water     | `#2aa8a8` | teal sea                   |
| kelp      | `#2f7a52` | green                      |
| navy      | `#2a3a6a` | deep blue (jacket, door)   |

`Paint.COLORS` is `["sunflower","orange","coral","peach","sand","foam","sky","water","kelp","navy"]`.

Each picture’s palette is an ordered list of eight of those names. Easy uses the first 4, Medium the first 6, Hard the first 8. Numbers on pots are `1..K` in this order.

| Id         | Palette (1 → 8)                                              |
|------------|--------------------------------------------------------------|
| sun        | sunflower, orange, sky, foam, sand, water, coral, peach      |
| crab       | coral, sand, foam, kelp, orange, water, peach, sunflower     |
| sandcastle | sand, orange, sky, navy, foam, kelp, sunflower, water        |
| fish       | water, sunflower, foam, navy, coral, kelp, orange, peach     |
| starfish   | orange, sand, water, foam, coral, sunflower, peach, kelp     |
| boat       | coral, foam, sky, water, sunflower, navy, sand, orange       |
| shell      | peach, orange, sand, foam, sunflower, water, coral, sky      |
| bucket     | coral, sand, foam, navy, sky, orange, sunflower, water       |

Outline file for `{id}` is `assets/paint/{id}-outline.png`. One outline per subject. All three difficulties draw their blob maps on that same page. Easy blobs are large groups; Hard splits the same drawing into smaller blobs. Inner crayon lines on the outline may be finer than Easy’s blob borders; blob borders follow the major outlines so fills look intended.

## Difficulty

One picture per play. Difficulty chooses cell count and how many pots are open.

| Difficulty | Cells | Colors (`K`) | Grid helper            |
|------------|-------|--------------|------------------------|
| Easy       | 10    | 4            | `{ cells: 10, colors: 4 }` |
| Medium     | 20    | 6            | `{ cells: 20, colors: 6 }` |
| Hard       | 40    | 8            | `{ cells: 40, colors: 8 }` |

Default difficulty is **medium** when `createSession` is called with no options. Unknown difficulty string is treated as **medium**.

Every color in the open palette appears at least once. Exact cell counts by pot number (same for every picture):

| Difficulty | Color 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Total |
|------------|---------|---|---|---|---|---|---|---|-------|
| Easy       | 4       | 3 | 2 | 1 |   |   |   |   | 10    |
| Medium     | 5       | 4 | 3 | 3 | 3 | 2 |   |   | 20    |
| Hard       | 8       | 7 | 6 | 5 | 5 | 4 | 3 | 2 | 40    |

Color 1 is the subject’s main fill (sun face, crab body, castle sand, and so on).

A Hard blob stays at least about a fingertip wide (target: at least 44px CSS). No sliver regions. Blobs do not overlap except shared strokes. They stay inside the picture box.

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
  difficulty,      // "easy" | "medium" | "hard"
  pictureIndex,    // 0..7
  selectedColor,   // 1..K or null
  cells,           // [{ id, color }]  length 10 / 20 / 40
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
- `Paint.grid(difficulty)` → `{ cells, colors }` (`10,4` / `20,6` / `40,8`). Unknown difficulty → medium.
- `Paint.palette(pictureIndex, difficulty)` → that picture’s first `K` paint names (array). Unknown difficulty → medium. Unknown or out-of-range `pictureIndex` → sun (`0`).
- `Paint.colorName(pictureIndex, colorNumber)` → paint name for pot `colorNumber` on that picture’s **full 8-name list** (1-based, ignores difficulty). `null` if `colorNumber` is not in `1..8`. Unknown `pictureIndex` → sun.
- `Paint.layout(pictureIndex, difficulty)` → designed `[{ id, color, d }]` for that picture and difficulty. `d` is an SVG path in viewBox `0 0 100 100`. Unknown difficulty → medium layout. Unknown or out-of-range `pictureIndex` → sun (`0`).
- `Paint.pictureId(session)` → `Paint.PICTURES[session.pictureIndex]`.
- `Paint.pictureSrc(session)` → `assets/paint/{id}-outline.png`.
- `Paint.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `Paint.selectColor(session, n)` → `{ ok, session }`. Copies.
- `Paint.fill(session, cellId)` → `{ ok, session }`. Copies. `ok` is false when the fill rules fail.
- `Paint.playAgain(session, random)` — new session at `session.difficulty`, new picture roll, `selectedColor` null. If `session` is omitted, same as `createSession()` (medium).

`random` is a function that returns a number in `[0, 1)`. Tests pass a stub.

### Generator

1. Normalize `difficulty`. Read cell count and `K`.
2. `pictureIndex = floor(random() * 8)` clamped to `0..7`.
3. Load `layout(pictureIndex, difficulty)`. Session `cells` is `{ id, color }` for each layout cell. UI calls `layout` again for `d`.
4. `selectedColor` is `null`. `filled` is `{}`. `complete` is false.

Do not loop-until-timeout. Do not shuffle palette order.

### Title / difficulty / menu

Reuse `#difficulty-screen`. When Paint by Number is chosen, heading **Paint by Number** and `pendingGame = "paint"`. The other three games keep their titles.

Exhibit order: **Tide Pool Tidy**, **Beach Puzzle**, **Crab Path**, **Paint by Number**. Arrow keys cycle that list. The menu crab sits under the selected card (four positions).

Difficulty buttons: `pendingGame === "paint"` → `startPaint(difficulty)`.

**Play again** calls `Paint.playAgain(paintSession)` and re-renders. Difficulty does not change.

### Screen

New `#paint-screen`, hidden until play, sand background like Puzzle and Path, sky chrome with Games and the sun. No hint sentence.

- Coloring-book outline centered on the sand.
- SVG blobs on top: empty blobs show their number; filled blobs are the pot’s paint color with no number.
- Numbered pots along the bottom (same band language as Tide Pool Tidy’s pools). The chosen pot has a clear selected ring. Hard’s eight pots wrap.
- The beach kid stands beside the picture, same `data-kid` celebrate frames as the other games.

Reduced motion: skip wiggle and cheer motion.

## Edges

- Unknown difficulty → medium.
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

- `createSession()` with no args has `difficulty === "medium"`, 20 cells, 6 distinct cell colors, `selectedColor === null`, `complete === false`.
- Unknown difficulty string yields medium.
- Easy: 10 cells, colors `1..4`, counts 4 / 3 / 2 / 1.
- Hard: 40 cells, colors `1..8`, counts 8 / 7 / 6 / 5 / 5 / 4 / 3 / 2.
- `pictureIndex` is an integer in `0..7`.
- `pictureId` for index 0 is `"sun"`.
- `pictureSrc` for sun ends with `sun-outline.png`.
- `palette(0, "easy")` is `["sunflower","orange","sky","foam"]`.
- `palette(1, "easy")` starts with `"coral"`.
- `colorName(0, 1)` is `"sunflower"`. `colorName(0, 9)` is `null`.
- Sun layouts at every difficulty use only that picture’s open paints, and every open paint appears.
- Crab Easy cell colors use only pots 1–4, and all four appear.
- `selectColor(session, 1)` returns `ok: true`, sets `selectedColor` to `1`, and does not mutate the input session.
- `selectColor(session, 0)` and `selectColor(session, 99)` return `ok: false`.
- After `selectColor` of a cell’s color, `fill` of that empty cell returns `ok: true`, marks it filled, and does not mutate the input session.
- `fill` with `selectedColor === null` returns `ok: false`.
- `fill` of the wrong color returns `ok: false`.
- `fill` of a filled cell returns `ok: false`.
- `fill` of an unknown `cellId` returns `ok: false`.
- Filling the last Easy cell sets `complete`.
- `playAgain(session)` keeps `difficulty` and may change `pictureIndex` when stubs differ.
- `playAgain()` with no session is medium.
- Two `createSession({ difficulty: "easy" })` calls with `always(0)` vs `always(0.99)` differ in `pictureIndex`.

Layout path strings are required and non-empty; tests do not assert exact Bézier coordinates.

## Out of scope

Changing Tidy, Puzzle, or Path. Implementing Sea Glass or bringing Sandcastle Stack back. Live image generation while she plays. Undo / taking a correct fill off. Saving pictures. Pinch-zoom. Rectangular pixel grids. Auto-flattened region maps that miss the exact counts. Timers, scores, sound, accounts.

## Spec coverage

This is a new game. It reuses the Beach Day shell (menu, difficulty, cheer, tap, wiggle, painted art) and adds one match-the-number verb: pick a pot, tap the blobs.
