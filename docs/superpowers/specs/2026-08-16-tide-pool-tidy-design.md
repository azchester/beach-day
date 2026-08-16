# Tide Pool Tidy — Design

Date: 2026-08-16  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together

## Purpose

A quiet beach-sorting game. She decides where each thing goes. He talks it through with her. No timer, no losing score, no required reading.

## Player experience

Open `index.html`. Title screen: **Tide Pool Tidy** and one button, **Let’s tidy**.

A stretch of sand holds a few beach things. Three pools sit along the bottom, each with a picture and an optional word the adult can read: **sandcastles**, **shells**, **rocks**.

She drags one thing into a pool.

- Correct: it splashes in and stays.
- Incorrect: the pool shivers; the thing slides back onto the sand. Nothing scolds.

When the sand is empty, the pools sparkle, a short “all tidy!” shows, then the next round starts. After the last round, **Play again** restarts at round 1. Refresh also starts at round 1. No saved progress.

## Visual style

Magic School Bus *feel*, not the show: chunky crayon-outline drawings, bright field-trip colors, “we’re investigating the beach.” No bus, no Ms. Frizzle, no logos or trademarks.

Warm pale sand, shallow turquoise water, three rocky tide pools. Big, nameable pictures. High contrast. Large drop zones. Splash and wiggle stay short.

## Items

| Kind | Pieces | Goes in |
|------|--------|---------|
| Sandcastle | turret castle, drip castle, bucket-mold castle | sandcastles |
| Shell | scallop, spiral, snail | shells |
| Rock | smooth pebble, speckled stone, driftwood | rocks |

**Lookalike round:** a tall spiral shell (looks like a tower) vs a real sandcastle. Shell → shells. Castle → sandcastles.

**Two-rule round:** the shells pool is pictured as an **orange shell** and only accepts orange shells (must be orange *and* a shell). An orange sandcastle still goes to sandcastles. This round does not include pale shells, so every piece has exactly one home. The rule is a picture on the pool, not a sentence she must read.

## Rounds

Six short rounds, in this order:

1. One of each kind. Obvious.
2. Mixed, still obvious (about 4–5 items).
3. Mixed, more items (about 6).
4. Lookalike: spiral-shell tower vs sandcastle, plus a couple of clear extras.
5. Mixed with a lookalike still in the mix.
6. Two-rule: orange-shell pool. Items include at least two orange shells, one orange sandcastle, and one rock. No pale shells in this round.

After round 6, Play again.

## Architecture

Static browser game. No server, no accounts, no network, no startling sound.

```
ai-sync/beach-day/
  index.html
  styles.css
  app.js              # title, drag/drop, cheer, play again
  game.js             # rounds, membership rules, next-round
  README.md           # how to open it with her
  docs/superpowers/specs/2026-08-16-tide-pool-tidy-design.md
```

Rounds live as data in `game.js`: items on the sand, which pool each belongs to, and any special pool rule for that round.

## Turn flow

Screen parts: **sand** (loose items), **pools** (drop targets), **cheer** (all-tidy beat).

On drop:

1. Pool matches the item’s rule → item leaves the sand and sits in that pool.
2. Pool does not match → item returns to the sand; pool wiggles.
3. Sand empty → cheer, then next round (or Play again after round 6).

## Edges

- Drop on sand, between pools, or release too soon: item returns to where the drag started.
- Nothing can get stuck off-screen or in two pools.
- Wrong drops never lock her out or subtract a visible score.
- Reduced-motion preference: skip or shorten splash/wiggle.

## Testing

Verify:

- Correct drop stays in the pool.
- Incorrect drop returns to the sand.
- Empty sand advances the round.
- Lookalike scoring: spiral shell ≠ sandcastle pool.
- Two-rule scoring: only orange shells enter the special pool.
- Play again and refresh both restart at round 1.

## Out of scope

Timers, waves, scores she can lose, accounts, sound that autoplays, Magic School Bus characters, reading-required instructions, install steps beyond opening the HTML file.
