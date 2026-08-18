# Beach Puzzle play controls — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

Three play-screen fixes for Beach Puzzle. The sand stays still. A **Tidy** button stacks clumps and loose pieces. A small picture of the finished scene can be opened and closed.

Deal, snap, difficulty, pictures, cheer, Tide Pool Tidy, and Crab Path do not change. This spec is **Beach Puzzle play-screen only**.

## Player experience

She still drags a piece or a whole snapped clump. Neighbors still snap. The kid still cheers **What a puzzle!**

What changes:

- Dragging empty sand does nothing. The play area does not slide.
- A piece or clump cannot leave the visible sand.
- A **Tidy** button (small broom/sparkle picture plus the word **Tidy**) sits above the girl. Tap it: clumps line up along the top, bare pieces along the bottom.
- A small framed preview of *this* puzzle’s picture sits on the sand, top-left. Tap it: the full picture opens. Tap **X** or the dimmed sand: it closes. Pieces have not moved.

No timer, no score, no sentence she must read, no saved progress.

## Static sand

`#puzzle-field` no longer translates. Empty-sand pointer handlers that panned the field are removed.

Only `.jig` pieces (and the clump they belong to) follow the pointer.

**Clamp.** On every drag move, after a successful snap, after tidy, and after the win-centering step, the moving group’s axis-aligned box stays fully inside the visible `#puzzle-field` rectangle. If she pushes toward an edge, the clump stops there. If a snap would hang the new clump off an edge, the whole clump is nudged back on.

The box is the pieces’ layout rectangles (the `.jig` buttons, including tab padding), not only the photo cells.

On win, the finished picture still centers on the sand by shifting piece positions. It does not slide the field. Leave room at the bottom for the cheer banner, as today.

Initial scatter already aims to stay on the sand. Clamp it too, so a deal never starts with a piece off-screen.

## Tidy

### Control

A chunky foam-and-ink button, same family as **Games**. Content: a small broom/sparkle mark (inline SVG or CSS, crayon-outline feel, no new painted asset) plus the word **Tidy**.

It sits above the girl, bottom-right of `#puzzle-stage`. It is not a puzzle piece. Tapping it does not start a drag. It stays tappable: `z-index` above pieces.

She can tidy as often as she wants. Play is not paused. Snapped clumps stay snapped.

### Layout

Tidy rearranges current piece positions. It does not change `Puzzle` groups, seams, or the picture.

1. Split current groups into **clumps** (two or more piece ids) and **singles** (one piece id).
2. Sort each list left-to-right by the group’s current leftmost `x`.
3. Place clumps in one or more rows along the **top** of the sand.
4. Place singles in one or more rows along the **bottom** of the sand.

Reserved space that tidy must not cover:

- Preview thumbnail, top-left, plus a small gap.
- The girl and the Tidy button, bottom-right, plus a small gap.

The top row starts to the right of the preview. The bottom row stops short of the girl and button. If a row runs out of width, it wraps (clumps wrap downward, singles wrap upward). Shrink the gap between items before wrapping if that keeps a single row. Items never overlap each other.

A nearly-finished big clump sits in the top band. Leftover singles sit in the bottom band. If the two bands would collide (many items on a small phone), shrink gaps, then let the bands grow toward the middle, still without overlap, then clamp.

If they still cannot fit (Hard, many singles, short phone), singles may overlap each other slightly — same as the opening scatter. They still must not leave the sand, cover the preview, or cover the girl and Tidy button.

Once the puzzle is complete, Tidy does nothing. The cheer is showing; do not undo win-centering.

Pieces jump to the tidy positions. No slide.

## Preview

### Thumbnail

A small framed control on the sand, top-left of `#puzzle-stage`. It shows `Puzzle.pictureSrc` for the current session — the same photo the pieces use, not a fixed `01-beach.jpg`.

About 88–104px wide, chunky ink border, foam frame, same visual family as the menu puzzle thumb. It is not a `.jig`. Dragging it does not move it. Tidy never relocates it. `z-index` above pieces so a piece lying on that corner cannot trap it.

Deal and **Play again** update the image to the new picture. **Games** / leaving the screen hides any open overlay.

### Overlay

Tap the thumbnail:

- The sand dims.
- The full current picture appears large in the middle, letterboxed with margin so it is not edge-to-edge on a phone.
- A chunky **X** sits on the picture (top-right of the picture frame).

Tap **X** or the dimmed sand: the overlay closes. Piece positions, clumps, and tidy layout are unchanged.

While the overlay is open, pieces cannot be dragged and Tidy does not fire. Closing returns to the same play state.

The thumbnail stays visible for the whole play, including after tidy and after the puzzle is complete. Opening the preview during cheer is allowed. Closing it returns to the cheer, not a new deal.

## Architecture

No change to `puzzle.js` or `test/puzzle.test.js`. Pixel positions stay in `app.js`.

```
ai-sync/beach-day/
  app.js          # remove pan; clamp; tidy layout; preview overlay
  index.html      # Tidy button, preview thumb, overlay + X
  styles.css      # static field, tidy, preview, overlay
  README.md       # mention tidy and preview
```

Tidy and Path screens are untouched.

### Data in `app.js`

Existing `puzzlePos` remains the source of piece coordinates. Remove `puzzlePan` and any `transform` on `#puzzle-field`.

New helpers (names flexible):

- `clampGroup(ids)` — translate the group the smallest amount so its union box is inside the field.
- `tidyPuzzle()` — compute new `puzzlePos` from the rules above, write positions, update DOM.
- Preview open/close toggles a hidden overlay. No session field.

### Screen markup

`#puzzle-screen` / `#puzzle-stage` gains:

- `#puzzle-preview` — button, thumbnail `img` of the current picture.
- `#puzzle-tidy` — button above `.puzzle-kid`.
- `#puzzle-peek` — hidden overlay: dim, framed `img`, close **X**.

`#puzzle-field` stays the piece layer only.

## Edges

- Unknown / existing Puzzle rules unchanged (difficulty, snap, play again).
- Overlay starts closed on every deal.
- Pointer down on empty sand: no pan, no piece move.
- Clamp applies to singles and multi-piece clumps.
- Tidy with zero clumps: only the bottom band fills. Tidy with zero singles: only the top band fills. Tidy after complete: no-op.
- Overlay open + **Games**: overlay closes, menu shows.
- Overlay open + **Play again**: overlay closes, new deal, new thumbnail.
- Tidy always jumps; reduced-motion users see the same snap-to-place.
- No autoplay sound, no accounts, no new network besides existing fonts.

## Testing

Keep Node `assert` tests as they are. This work is UI. Verify in the browser on Beach Puzzle (Easy and Hard):

- Dragging empty sand does not move the field or the pieces.
- A dragged piece or clump stops at the sand edge; nothing disappears off-screen.
- After a snap near an edge, the joined clump is still fully visible.
- **Tidy** puts multi-piece clumps along the top and singles along the bottom.
- Tidy does not cover the preview, the girl, or the Tidy button.
- Tidy does not unsnap clumps.
- Preview shows the current deal’s picture (change on Play again).
- Tap preview → large picture; tap **X** → play screen, pieces unmoved.
- Tap dimmed sand → same close.
- Tide Pool Tidy and Crab Path still start and play as before.
- `node test/puzzle.test.js && node test/game.test.js && node test/path.test.js` still PASS.

## Out of scope

Changing snap rules, piece shapes, pictures, difficulty grids, rotation, pinch-zoom, a six-puzzle sequence, Tidy-the-sorting-game, Crab Path, new painted art, timers, scores, sound.

## Spec coverage

This amends the Beach Puzzle play screen from `2026-08-17-beach-puzzle-design.md`. That spec allowed empty-sand pan when the scatter was larger than the viewport. This spec replaces that: the sand is static, pieces stay on screen, and tidy + preview are added.
