# Paint by Number scenes — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

This spec **replaces** the picture, layout, outline, and palette-use sections of `2026-08-18-paint-by-number-design.md`. Fill rules, session shape, menu flow, cheer, and the other three games stay as that spec has them.

## Purpose

Paint by Number still is: pick a pot, tap matching blobs, no timer, no score, no How-hard step.

What changes is the **page**. Today the generator flood-fills empty coloring-book PNGs, throws away anything that touches the edge, invents Voronoi cuts, and assigns colors with `i % 6`. The finished fish is a handful of shards on leftover cream. That is not a picture.

The page becomes a **real scene**. Sky, water, sand, waves, and the subject are numbered blobs. When the last blob fills, the whole square is painted. White is the empty default, never a paint.

## Player experience

Same verb as today. She taps Paint by Number. One of eight pictures deals at random. She picks a numbered pot, then taps every blob with that number. Wrong pot / no pot / already filled: the blob wiggles and stays. Last blob: **What a picture!** Play again deals a new picture. Games / More games / refresh return to the menu.

What she sees:

- **Empty.** A square coloring-book scene. Thick navy ink. Every numbered blob is white. A number sits on every blob that still needs paint. Sky, water, sand, and waves have numbers too.
- **Done.** The whole square is the scene. No cream frame of leftover paper. No white numbered pot. Numbers are gone from filled blobs.

About **18–20** blobs and **7–8** pots. Several blobs share a number (find every `3`). Blobs stay large enough for a finger. No slivers.

Smile, eye sparkle, claw dots, bucket rivets, and other tiny marks are **ink only**. They are not cells.

## Why the old pipeline cannot stay

[drakarah/paintbynumbersgenerator](https://github.com/drakarah/paintbynumbersgenerator) turns a **colored painting** into regions by k-means, shared-border tracing, and wavelet smoothing. This app copied only the quadratic SVG penmanship.

`scripts/build-paint-layouts.py` instead:

1. Downsamples an empty outline to 260px
2. Flood-fills cream pockets
3. Discards any region that touches the page edge (the background, and every open wave)
4. Cuts large rooms with a sine-wobble Voronoi
5. Assigns pots with `(i % 6) + 1`

The eight outline PNGs are decorative line art, not closed paint maps. That pipeline is deleted. The GitHub k-means path is not brought in. The twelve puzzle paintings stay Beach Puzzle.

## Pictures

Same eight ids, same random deal (`pictureIndex` in `0..7`).

| Index | Id | Scene |
|------:|----|-------|
| 0 | sun | Face and rays in a blue sky, water and sand below |
| 1 | crab | Crab on wet sand, shallow water, closed waves |
| 2 | sandcastle | Castle on a beach, sky, waterline |
| 3 | fish | Fish in the water, closed waves, sky, sand |
| 4 | starfish | Starfish at the waterline, sky, wet sand, peach foam |
| 5 | boat | Sailboat on the water, sky, waves, distant sand |
| 6 | shell | Shell on the sand, sky, water, peach foam |
| 7 | bucket | Bucket on the sand, sky, water, closed ripples |

## Paints

The named box is unchanged. Hex values are unchanged.

| Name | Hex | Role |
|------|-----|------|
| sunflower | `#ffe14a` | yellow |
| orange | `#f4a03c` | amber / ray / starfish |
| coral | `#e24b3c` | crab, bucket, boat hull |
| peach | `#f7c09a` | shell, wave cap, soft highlight |
| sand | `#f2d04a` | beach, castle |
| foam | `#fff8ee` | paper / empty fill only — **never a pot** |
| sky | `#4eb0ea` | blue sky |
| water | `#2aa8a8` | teal sea |
| kelp | `#2f7a52` | green |
| navy | `#2a3a6a` | deep blue |

**White is not a paint.** If a region’s finished color would be white, cream, or foam, it is not a cell. No pot, no number. It stays paper or becomes ink. Empty numbered blobs are white because they are not done yet — that white is “unfilled,” not “paint this white.”

Wave caps use **peach**, or they are not blobs. Clouds are peach or paper. `Paint.COLORS` may still list `foam` for the paper/empty fill; `colorName` never returns `foam` for a pot.

Every scene’s palette includes **sky**, **water**, and **sand**. Pot **1** is the subject’s main fill.

| Id | Palette (1 → 8) |
|----|-----------------|
| sun | sunflower, orange, sky, sand, water, kelp, coral, peach |
| crab | coral, sand, sky, water, orange, kelp, peach, sunflower |
| sandcastle | sand, orange, sky, navy, coral, water, sunflower, kelp |
| fish | sunflower, water, sky, navy, coral, kelp, orange, sand |
| starfish | orange, sand, water, sky, coral, sunflower, peach, kelp |
| boat | coral, peach, sky, water, sunflower, navy, sand, orange |
| shell | peach, orange, sand, kelp, sunflower, water, coral, sky |
| bucket | coral, sand, peach, navy, sky, orange, sunflower, water |

A picture uses pots `1..K` with **K = 7 or 8** and no gaps (if 7 is used, 1–6 are used). Several cells share a number. The UI draws pots `1..K`.

### How each scene is cut

About 18–20 blobs. Counts are targets; the build allows 16–22.

| Picture | Blobs |
|---------|-------|
| sun | Face; 6–8 rays (sunflower / orange); sky pockets between rays; water strip; sand strip; 1–2 small accents. Eyes and smile are ink. |
| crab | Body; 2 claws; 4–6 legs; sand patches; water; 2–3 closed waves; sky. Eye dots are ink. |
| sandcastle | Keep; 2 towers; 2 doors; 1–2 drip masses (not each drip); beach; waterline; sky. |
| fish | Head and main body (pot 1, sunflower); belly; dorsal; pectoral; tail; water patches; 3–4 closed waves; sky; sand. Eye is ink. |
| starfish | Center; 5 arms; wet sand; water; peach foam; sky. Face is ink. |
| boat | Hull; 2 sails; deck band; water; 3 waves; sky; distant sand. Mast is a tap-sized blob, or ink if it would be a sliver. |
| shell | Hinge; 6–8 ribs; sand; water; 1–2 peach foam bits; sky. |
| bucket | Rim; inside sand; 2–3 body bands; handle; ground; water; 2 ripples; sky. Rivets are ink. |

## Scene files

Source of truth is one authored SVG per picture:

```
assets/paint/{id}-scene.svg
```

ViewBox is `0 0 100 100`. Each cell is one closed `<path>`:

```svg
<path data-role="sky" data-color="3" d="M…Z"/>
```

- `data-role` is a short name (`sky`, `water`, `sand`, `wave`, `body`, `fin`, …). It is for authors and the build, not for play.
- `data-color` is the pot number `1..K` on that picture’s palette. It is never a foam/white paint.
- `d` is a closed path. Paths **tile** the square: no gaps, no overlapping fills. They may share an edge.
- Paths stay inside the viewBox.

The build, not the author, places the number. It writes `lx`, `ly` at the pole of inaccessibility of that path.

`assets/paint/{id}-outline.png` is not used for play. Delete the eight outline PNGs in the same change that ships the scenes. There is no multiply overlay.

## Build

`scripts/build-paint-layouts.py` no longer flood-fills PNGs, no longer discards edge-touching regions, and no longer runs `enrich_sparse` / `split_two`.

It reads the eight scene SVGs and writes `paint-layouts.js` in the current consumer shape:

```
{ color, d, lx, ly }
```

`role` does not need to ship in the JS if play does not use it.

The build **fails** (nonzero exit, no write) if any picture has:

- fewer than 16 or more than 22 cells
- fewer than 7 or more than 8 distinct pot numbers
- pot numbers that are not exactly `1..K` (gaps or a missing 1)
- a pot whose name is `foam` (or any fill that is white / `#fff` / `#fff8ee`)
- sky, water, or sand missing from the used pots
- an open path, an axis-aligned 4-corner rectangle used as a cell, or a sliver smaller than 1.2% of the page
- more than 2% of a 100×100 sample uncovered (hole in the tile)

`assets/paint/menu-preview.svg` is rebuilt from the sun scene (paths + numbers), not from a flood-fill.

## Play screen

`#paint-outline` and `Paint.pictureSrc` go away. The page is one SVG of the scene paths on a light paper texture.

- Empty cell: fill `#ffffff`, navy stroke, number visible.
- Filled cell: fill the pot’s hex, navy stroke, no number.
- Stroke is the ink (chunky, round joins). Not a second drawing on top of a PNG.
- Fat invisible hit stroke stays so thin shared edges still catch a finger.
- Pots are the 7–8 colors that appear on this deal.
- Kid, Games, sun, wiggle, cheer, Play again, More games stay as they are.

`Paint.layout(pictureIndex)` still returns `[{ id, color, d, lx, ly }]`. `selectColor` / `fill` / `playAgain` are unchanged. Session `cells` stay `{ id, color }`.

## Architecture

```
assets/paint/{id}-scene.svg     # authored closed scenes (source of truth)
scripts/build-paint-layouts.py  # validate + emit layouts
paint-layouts.js                # generated; play reads this
paint.js                        # palettes updated; pictureSrc removed
app.js                          # no outline <img>; SVG is the page
index.html                      # drop #paint-outline
styles.css                      # drop multiply overlay
test/paint.test.js              # layout + palette checks below
```

No new libraries. No network except the existing optional Google Fonts. The browser does not generate art while she plays.

## Testing

Keep Node `assert` in `test/paint.test.js`. Existing fill / select / play-again cases stay.

Add (or replace outline-PNG cases with):

- Every picture layout has 16–22 cells and 7–8 distinct colors.
- Every picture uses pot 1.
- Every cell `d` is a non-empty closed path and is not an axis-aligned 4-corner rectangle.
- No cell color maps to `foam`.
- `colorName` for each used pot on each picture is one of sky, water, sand, or a subject paint — and each picture uses sky, water, and sand at least once.
- `pictureSrc` is gone. Tests that required `sun-outline.png` are deleted.
- Fill rules are unchanged: right pot fills, wrong pot / no pot / already filled fail, last fill sets `complete`.

The build’s coverage and sliver checks are the scene tests. If the build would refuse a committed SVG, `node test/paint.test.js` also fails (either by requiring the builder, or by asserting the same counts on the emitted JS).

## Edges

- `random` omitted → `Math.random`.
- Reduced motion: skip wiggle and cheer motion (existing pattern).
- No pot chosen: `fill` fails; the cell stays empty and numbered.
- A miss leaves the cell empty.
- Filled cells never succeed again.
- Palette order never shuffles. The sun stays sunny.
- Refresh returns to the menu. No saved pictures.

## Out of scope

Easy / Medium / Hard for paint. The GitHub k-means / shared-border / wavelet pipeline. Converting the twelve puzzle paintings. Live image generation while she plays. Undo. Pinch-zoom. White / foam pots. Changing Tidy, Puzzle, or Path. Sea Glass. Bringing Sandcastle Stack back.

## Spec coverage

This is a replacement of how Paint by Number **pages** are made and shown. The match-the-number verb, the four-card menu, and the other games do not change.
