# Tide Pool Tidy — Randomness and Difficulty

Date: 2026-08-16  
Location: `ai-sync/tide-pool-sort/`  
Extends: `docs/superpowers/specs/2026-08-16-tide-pool-tidy-design.md`

## Purpose

The same beach-sorting game, but each play is a new beach, and the adult can pick how hard the thinking is. She still decides where each thing goes. He still talks it through. No timer, no losing score, no required reading.

## Player experience

Title screen: **Tide Pool Tidy** and three chunky buttons — **Easy**, **Medium**, **Hard**. Tapping one starts that difficulty. There is no separate “Let’s tidy” step.

Play is unchanged: drag or tap-then-tap a beach thing into a pool. Correct splash. Wrong wiggle-and-return.

When the sand is empty, “All tidy!” then the next round. After round 6, **Play again** starts a new roll at **the same difficulty**, round 1. Refresh returns to the title screen so a different difficulty can be picked. No mid-play difficulty switch. No saved progress.

Hint line: `Round N of 6`. On Hard round 6 only, append ` This pool wants orange shells.` She does not have to read the difficulty name.

## What randomizes

Three things, every time a round is built:

1. **Which pieces** — drawn from the catalog to satisfy that round’s recipe.
2. **Sand order** — `sandIds` is a shuffle of those pieces.
3. **Pool order** — depends on difficulty (below).

Drop rules do not change: each generated piece has exactly one legal pool.

## Difficulty

Six rounds at every difficulty. Difficulty chooses both how messy the beach is and which rules appear.

| | Easy | Medium | Hard |
|---|---|---|---|
| Rules | Castle / shell / rock only | Adds spiral-vs-castle lookalike | Adds orange-shell two-rule |
| Pool order | Always sandcastles · shells · rocks | Shuffle once at play start; keep for all six rounds | Shuffle again at the start of every round |
| Piece style | No spiral, no orange | No orange. No spiral on round 1. Spiral allowed from round 2. Lookalike required on rounds 4–6 | No orange except round 6. No spiral on round 1. Spiral allowed on round 2. Lookalike required on rounds 3–5. Round 6 is two-rule only |
| Round 1 | 3, one of each | 3, one of each, no spiral | 4, at least one of each, no spiral |
| Round 2 | 3, one of each | 5, at least one of each; spiral allowed, not required | 5, at least one of each; spiral allowed, not required |
| Round 3 | 4, at least one of each | 6, at least one of each; spiral allowed, not required | 6, **lookalike required** |
| Round 4 | 4, at least one of each | **Lookalike** (spiral + turret + 2 extras) | Lookalike, 6 pieces |
| Round 5 | 5, at least one of each | 6 with lookalike still in the mix | Lookalike, 7 pieces |
| Round 6 | 5, at least one of each, still one-rule | 6 with lookalike, still one-rule | **Two-rule:** exactly 2 orange shells, 1 orange castle, 1 rock. No pale shells |

Each recipe is exactly: `{ count, atLeast: { sandcastle, shell, rock }, allowSpiral, lookalike, twoRule }`.

- Easy 0–5: lookalike false, allowSpiral false, twoRule false. Counts 3,3,4,4,5,5. `atLeast` is 1 of each kind.
- Medium 0: count 3, allowSpiral false, lookalike false, twoRule false.
- Medium 1–2: counts 5, 6, allowSpiral true, lookalike false, twoRule false.
- Medium 3–5: counts 4, 6, 6, allowSpiral true, lookalike true, twoRule false.
- Hard 0: count 4, allowSpiral false, lookalike false, twoRule false.
- Hard 1: count 5, allowSpiral true, lookalike false, twoRule false.
- Hard 2–4: counts 6, 6, 7, allowSpiral true, lookalike true, twoRule false.
- Hard 5: count 4, twoRule true, lookalike false, allowSpiral false (orange spiral may still appear as an orange shell).

**Lookalike** means the round must include a cream spiral shell and a sand turret castle. Spiral → shells. Turret → sandcastles.

**Two-rule** means the shells pool uses the orange-shell picture and accepts only `kind === "shell" && color === "orange"`. An orange castle still goes to sandcastles. This round includes no non-orange shells, so every piece has a home.

Every non-two-rule recipe has `atLeast` of 1 sandcastle, 1 shell, and 1 rock. Two-rule does not use `atLeast`; its four pieces are fixed by the generator step for that recipe.

Default difficulty is **medium** when `createSession` is called with no options (tests and any leftover caller).

Unknown difficulty string is treated as **medium**.

## Piece catalog

Only these templates exist. The generator never invents a new kind, variant, or color.

| Kind | Variant | Color | Label | Notes |
|------|---------|-------|-------|-------|
| sandcastle | turret | sand | castle | Lookalike castle |
| sandcastle | drip | sand | castle | |
| sandcastle | bucket | sand | castle | |
| sandcastle | turret | orange | castle | Two-rule only |
| sandcastle | drip | orange | castle | Two-rule only |
| sandcastle | bucket | orange | castle | Two-rule only |
| shell | scallop | peach | shell | |
| shell | snail | peach | shell | |
| shell | spiral | cream | shell | Lookalike shell |
| shell | scallop | orange | shell | Two-rule only |
| shell | snail | orange | shell | Two-rule only |
| shell | spiral | orange | shell | Two-rule only |
| rock | pebble | gray | rock | |
| rock | speckled | gray | rock | |
| rock | driftwood | brown | rock | |

Orange templates are eligible only when the recipe is two-rule. Cream spiral is eligible only when the recipe has `allowSpiral: true` or `lookalike: true`. Two-rule orange shells may include the orange spiral variant; that is not a lookalike pair.

A round never contains two pieces with the same `(kind, variant, color)`. Two orange shells on Hard round 6 are two different variants.

## Architecture

Static `ROUNDS` item lists go away. Each difficulty has six **recipes**. A generator turns `(recipe, random)` into `items` and applies the difficulty’s pool-order policy.

```
ai-sync/tide-pool-sort/
  game.js             # recipes, catalog, generator, drop, advance
  app.js              # title buttons, drag/drop, cheer, play again
  index.html
  styles.css
  test/game.test.js
  README.md
```

No new libraries. No server. No network except the existing optional Google Fonts.

### Session

```
{
  difficulty,   // "easy" | "medium" | "hard"
  roundIndex,   // 0..5
  twoRule,      // true only on Hard round 6
  items,        // generated for this round
  pools,        // ordered pool descriptors for this round
  sandIds,      // permutation of items[].id
  placed: { sandcastles: [], shells: [], rocks: [] },
  complete,
  finished
}
```

Items and pool order live on the session. Two Medium plays of round 4 can differ.

### API

- `TidePool.ROUND_COUNT` is `6`.
- `TidePool.createSession({ difficulty, random })` — omitted `difficulty` is `"medium"`; omitted `random` is `Math.random`.
- `TidePool.createSessionAt(roundIndex, { difficulty, random })` — same defaults; throws if `roundIndex` is out of range.
- `TidePool.currentRound(session)` → `{ id, items, pools }` from the **session**, not from a global table.
- `TidePool.itemById(session, itemId)` searches `session.items`.
- `TidePool.drop(session, itemId, poolId)` → `{ ok, session }`. Copies the session. Does not mutate the input.
- `TidePool.advance(session, random)` — no-op unless `complete && !finished`. After round 6, sets `finished`. Otherwise builds the next recipe at the **same difficulty**. Easy: pools stay sandcastles · shells · rocks. Medium: reuse `session.pools` order. Hard: shuffle pools again with `random`.
- `TidePool.playAgain(session, random)` — new session at `session.difficulty`, round 1, new roll. If `session` is omitted, same as `createSession()` (medium, round 1).

`random` is a function that returns a number in `[0, 1)`, same contract as `Math.random`. Tests pass a stub so results are stable.

Session also stores `twoRule: true | false`, copied from the recipe that built the round. Only Hard round 6 sets `twoRule: true`. `accepts` reads `session.twoRule`, never `roundIndex === 5`. When `twoRule` is true, the shells pool’s `picture` is `"orange-shell"`.

`accepts(item, poolId, session)`:

- `sandcastles` ← `item.kind === "sandcastle"`
- `rocks` ← `item.kind === "rock"`
- `shells` ← if `session.twoRule`: `item.kind === "shell" && item.color === "orange"`; else `item.kind === "shell"`

### Generator

1. Start with an empty list.
2. If the recipe is two-rule: add two different orange shell variants, one orange castle variant, one rock. Stop — that is the full set (count 4).
3. If the recipe is lookalike: add cream spiral shell and sand turret castle.
4. While any `atLeast` kind is short, add a random eligible piece of that kind.
5. While `length < count`, add a random eligible piece of any kind.
6. Eligible = catalog rows allowed by the recipe (no orange unless two-rule; cream spiral only if `lookalike` or `allowSpiral`; not already chosen).
7. Assign unique ids (`r{roundIndex}-{kind}-{variant}-{color}` is enough because duplicates are forbidden).
8. Shuffle a copy of those ids into `sandIds`.
9. Build `pools`: start from the standard three (or orange-shell picture on two-rule). Then apply pool-order policy.

The catalog is large enough for every recipe. Do not loop-until-timeout. If a recipe cannot be filled (programming error), throw.

### Title screen

Replace the single **Let’s tidy** button with three buttons: **Easy**, **Medium**, **Hard**. Each calls `createSession({ difficulty })` and shows the play screen.

**Play again** calls `playAgain(session)` and re-renders play, still on the play screen. Difficulty does not change.

## Edges

- Drop of an id that is not on the sand: `{ ok: false }` and no state change beyond the usual copy.
- Drop on sand, between pools, or release too soon: piece returns (existing UI).
- Nothing can sit in two pools or off-screen.
- Wrong drops never lock her out or subtract a score.
- Reduced-motion: skip or shorten splash/wiggle (existing).
- Unknown difficulty → medium.
- `random` omitted → `Math.random`.
- No timer, no score, no autoplay sound, no accounts, no network besides fonts.

## Testing

Keep Node `assert` in `test/game.test.js`. Pass a fake `random` into every test that builds a session.

Existing behaviors, re-stated against the generator:

- Medium (default) round 1 has one of each kind and three `sandIds`.
- Correct drop stays in the pool; incorrect drop returns to the sand.
- Emptying the sand sets `complete`.
- `advance` moves to the next round at the same difficulty.
- Medium lookalike round (index 3): cream spiral and sand turret are present; spiral → shells, not sandcastles.
- Hard two-rule (index 5, `{ difficulty: "hard" }`): orange shell → shells; orange castle → sandcastles, not shells; no non-orange shell in `items`.
- `playAgain(session)` returns round 1 at `session.difficulty`.

New:

- Easy rounds never include `variant === "spiral"` or `color === "orange"` or `twoRule === true`.
- Medium indexes 3, 4, 5 each include a cream spiral and a sand turret. Medium indexes 0 has no spiral.
- Hard indexes 2, 3, 4 each include a cream spiral and a sand turret. Hard index 0 has no spiral. Hard index 5 is two-rule, not lookalike.
- `sandIds` sorted equals `items` ids sorted.
- Easy `pools` ids are always `["sandcastles", "shells", "rocks"]`.
- Medium: after completing round 1 and `advance`, pool id order is unchanged.
- Hard: a `random` that is not constant can produce a different pool order on `advance` than on the previous round. (A constant `random` that always returns `0` may leave order unchanged; use a sequence stub.)
- Two `createSession` calls with two different stubs can differ in item ids or `sandIds` order.
- `createSession()` with no args has `difficulty === "medium"`.

## Out of scope

Changing difficulty mid-play. A dedicated “back to title” control (refresh is enough). More than three difficulties. Variable round counts. Pale shells on the two-rule round. Timers, scores, sound, accounts, Magic School Bus characters, reading-required instructions.

## Spec coverage vs original game

The original six-round scripted lists are replaced by these recipes. Visual style, drag/drop, cheer, and “no scolding” are unchanged.
