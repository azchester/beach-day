# Crayon — Design

Date: 2026-08-19  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A fifth Beach Day game. Same eight coloring-book scenes as Paint by Number, but she crayons freely: a stroke follows her finger, any color, anywhere on the page, including over the ink.

Tide Pool Tidy stays sort. Beach Puzzle stays snap. Crab Path stays hop. Paint by Number stays match-the-number. Sandcastle Stack stays removed. Sea Glass stays unimplemented. This spec is **Crayon only**.

## Player experience

Menu has five cards. The new one is **Crayon**, blurb **Color your way**. Tap it. Play starts on the coloring page — there is no **How hard today?** step. Tide Pool Tidy, Beach Puzzle, and Crab Path still ask how hard. Paint by Number still skips it.

One of the eight outlines is chosen at random.

The page is the empty scene: white regions, navy ink, **no numbers**. Pots along the bottom are that picture’s paints, also unnumbered. Pot **1** (the subject’s main color) is already chosen so the first finger motion draws.

She drags: a fat round crayon follows. Strokes go over ink, sky, crab, leftover white, and other strokes. New color covers old. Lifting the finger ends the stroke; putting it down starts another. A tap without a drag leaves a round dot. Nothing wiggles. Drawing stays on the square (not the sand around it). Outlines do not clip the stroke.

**Done** sits in the sky, opposite **Games**. Always enabled, even on a blank page. Tap it: the canvas freezes, the kid cheers **What a picture!**, then **Play again** (new outline, blank canvas) or **More games**. **Games** / refresh abandon the drawing. No timer, no score, no save.

No hint sentence she must read. The adult can name the colors. The sky still has **Games** and the sun.

## Visual style

Same paint / crayon Beach Day look as Paint by Number: chunky navy outlines, bright field-trip colors, gouache-ish fills.

The outline is the same authored scene SVG Paint by Number uses (`Paint.layout`). Empty cells are white. Ink stays navy. Numbers are not drawn. A transparent canvas sits on top of that SVG; the crayon lives only on the canvas.

The menu card uses the sun outline **without numbers**, plus three unnumbered pots (sunflower, orange, sky). Same foam-card construction as the other exhibits.

## Pictures and paints

Same eight subjects, same random deal, same palettes as Paint by Number. Crayon does not invent pictures or shuffle palette order.

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

Pots are that picture’s used colors `1..K` (usually 7–8), in palette order, with no numerals. Foam is never a pot. The crayon uses `Paint.hex` for the chosen pot.

## One picture, no difficulty

Crayon has no Easy / Medium / Hard. Cell count does not matter for play; the layout is only the under-drawing.

## Draw rules

The engine does not store strokes. The canvas is the drawing.

A stroke may paint only when all of these are true:

1. A pot is chosen (`selectedColor` is an integer `1..K`). On a fresh deal this is already `1`.
2. The session is not complete.
3. The pointer is on the page canvas.

On success the UI strokes the canvas with that pot’s hex, round cap, round join, source-over. Stroke width is **6% of the page’s CSS width** (a fingertip). Coordinates outside the canvas are clipped by the canvas, not by SVG blobs.

On Done the engine marks `complete`. Further drawing is ignored. Play again / Games throw the bitmap away.

`selectColor` succeeds only when `n` is an integer in `1..K` for colors that appear on this picture’s layout. On success the copy’s `selectedColor` is `n`. On failure `{ ok: false }` and the previous choice stays. After complete, `selectColor` may still succeed; the UI does not draw.

## Architecture

Same pattern as Tidy, Path, Puzzle, and Paint. No new libraries. No server. No network except the existing optional Google Fonts.

```
ai-sync/beach-day/
  crayon.js                        # deal, selectColor, done, playAgain
  test/crayon.test.js
  app.js                           # fifth game: menu, pots, canvas stroke, Done, cheer
  index.html                       # exhibit + #crayon-screen
  styles.css                       # page, canvas, unnumbered pots, Done
  assets/paint/crayon-preview.svg  # sun outline, no numbers (menu thumb)
  README.md
```

Pictures, palettes, layouts, and hex values stay in `paint.js`. Crayon requires `Paint` (Node `require("./paint.js")`, browser `window.Paint`). Tidy, Puzzle, Path, and Paint keep their APIs.

### Session

```
{
  pictureIndex,    // 0..7
  selectedColor,   // 1..K (starts at 1)
  complete
}
```

No `cells`, no `filled`, no stroke list. `selectColor` / `done` / `playAgain` copy the session. They do not mutate the session they were given.

### API

- `Crayon.createSession({ random })` — omitted `random` is `Math.random`. Deals `pictureIndex` the same way Paint does (uniform `0..7`). `selectedColor` is `1`. `complete` is false.
- `Crayon.selectColor(session, n)` → `{ ok, session }`. Copies. `n` must be an integer in `1..K` for colors that appear on this picture’s `Paint.layout`.
- `Crayon.done(session)` → `{ ok: true, session }`. Copies. Sets `complete`. Idempotent if already complete.
- `Crayon.playAgain(session, random)` — new session, new picture roll, `selectedColor` 1, `complete` false. If `session` is omitted, same as `createSession()`.
- `Crayon.pictureId(session)` → `Paint.pictureId` for that `pictureIndex`.

`random` is a function that returns a number in `[0, 1)`. Tests pass a stub.

`K` is the maximum `color` on `Paint.layout(pictureIndex)`.

### Title / difficulty / menu

Crayon skips `#difficulty-screen`. Choosing the exhibit calls `startCrayon()` and opens `#crayon-screen`. The other three difficulty games still use **How hard today?**. Paint by Number still skips it.

Exhibit order: **Tide Pool Tidy**, **Beach Puzzle**, **Crab Path**, **Paint by Number**, **Crayon**. Arrow keys cycle that list. The menu crab sits under the selected card. Five cards may wrap; crab math already uses the selected card’s center.

**Play again** calls `Crayon.playAgain(crayonSession)`, clears the canvas, and re-renders a new outline.

### Screen

New `#crayon-screen`, hidden until play, sand background like Paint, sky chrome with Games, Done, and the sun. No hint sentence.

- Square paper page (`1:1`), same size language as `#paint-page`.
- Bottom: scene SVG, every blob fill `#ffffff`, navy stroke, no labels, `pointer-events: none`.
- Top: transparent `<canvas id="crayon-canvas">` sized to the page (device pixel ratio). All pointer events hit the canvas.
- Unnumbered pots along the bottom (same band as Paint). The chosen pot has the existing selected ring. Extra pots wrap if needed.
- **Done** is a sky button, `position: absolute; right`, matching **Games** on the left in size and Fredoka, but **sunflower** fill so it reads as the finish action (Games stays foam).
- The beach kid stands beside the picture, same `data-kid` celebrate frames as the other games.

Cheer overlay reuses the Paint overlay (`is-paint`): **What a picture!**, Play again, More games. Hide the on-page kid while the overlay is up (`crayon-screen.is-won`).

Reduced motion: skip cheer motion. The crayon still draws.

`touch-action: none` on the page so the beach does not scroll while she colors. Mouse and a finger both work. `setPointerCapture` on pointerdown so a stroke is not lost if the pointer grazes the edge.

On window resize, the canvas is resized to the page and the existing bitmap is scaled onto the new canvas so the scribble still covers the same picture.

## Edges

- `random` omitted → `Math.random`.
- Reduced motion: skip cheer motion (existing pattern). The stroke still follows the finger.
- No pot chosen cannot happen on a fresh deal (`selectedColor` starts at `1`). `selectColor` outside `1..K` fails; the previous `selectedColor` stays.
- After `done`, drawing is ignored. Play again / Games drop the bitmap.
- Done on a blank page still cheers.
- Filled pixels can be painted over with a new color.
- Two different `random` stubs can yield a different `pictureIndex`.
- Palette order never shuffles.
- Refresh returns to the menu. No saved pictures.
- Drawing off the square does not paint the sand.

## Testing

Keep Node `assert` in `test/crayon.test.js`. Pass a fake `random` into every test that deals. Do not assert canvas pixels (no browser in Node).

- `createSession()` with no args has no `difficulty`, `selectedColor === 1`, `complete === false`.
- `pictureIndex` is an integer in `0..7`.
- `pictureId` for index 0 is `"sun"`.
- `createSession` with `always(0)` deals the same `pictureIndex` as `Paint.createSession({ random: always(0) })`.
- `selectColor(session, 1)` returns `ok: true`, sets `selectedColor` to `1`, and does not mutate the input session.
- `selectColor(session, 0)` and `selectColor(session, 99)` return `ok: false` and leave `selectedColor` at `1`.
- `selectColor` of a color that does not appear on this picture’s layout returns `ok: false`.
- `done(session)` returns `ok: true`, sets `complete`, and does not mutate the input.
- `done` of an already complete session stays complete.
- `playAgain(session)` has no `difficulty`, `selectedColor === 1`, `complete === false`, and may change `pictureIndex` when stubs differ.
- Two `createSession` calls with `always(0)` vs `always(0.99)` differ in `pictureIndex`.

Menu `gameIds` already reads `data-game` in order; a fifth card does not need a hardcoded list change. Keep the existing “picks up a fourth card” test; adding a fifth in that test is allowed.

## Out of scope

Changing Tidy, Puzzle, Path, or Paint by Number rules. Stay-inside-the-lines clipping. Stroke lists in the session. Undo / erase pot. Brush sizes. Saving pictures. Pinch-zoom. Easy / Medium / Hard. Timers, scores, sound, accounts. Live image generation. Sea Glass. Bringing Sandcastle Stack back.

## Spec coverage

This is a new game. It reuses Paint by Number’s pictures and palettes and adds one crayon verb: pick a pot (or keep 1), drag on the page, tap Done. Crayon skips the shared difficulty screen.
