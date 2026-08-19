# Button Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a painted picture next to the word on every navigation button so a pre-reader can pick Games, difficulty, Play again, and More games.

**Architecture:** Two new square PNG icons (`icon-house.png`, `icon-replay.png`) plus the existing scallop. Static HTML on the four Games buttons, the three difficulty buttons, Play again, and More games. CSS makes `.btn` / `.back-btn` a horizontal flex row. No JS or rules changes.

**Tech Stack:** HTML, CSS, PNG assets. Open `index.html`. Existing Node tests stay green; no new unit tests.

## Global Constraints

- Words stay visible. Picture on the left of the word.
- Games and More games use the same house.
- Easy / Medium / Hard are 1 / 2 / 3 copies of `assets/shell-scallop-peach.png`.
- New icons: thick ink-outline beach paint (`#2a2438` stroke, coral roof, sunflower fill, foam walls). Transparent background. Square canvas. Readable at ~20–28px on Games and ~26–32px on yellow pills.
- Do not invent extra icons. Do not restyle the scallop. Do not change menu cards or in-play pieces.
- Do not change `game.js`, `path.js`, `puzzle.js`, or click behavior.
- Pictures are decorative: `alt=""` and `aria-hidden="true"`. Do not replace the word with `aria-label`.
- Hard’s three shells stay on one pill. The difficulty **row** may wrap; the shells inside Hard may not.

## File map

| File | Responsibility |
|------|----------------|
| `assets/icon-house.png` | Painted house for Games and More games |
| `assets/icon-replay.png` | Painted replay arrow for Play again |
| `index.html` | Picture + word markup on the navigation buttons |
| `styles.css` | Flex pills, icon size, no-wrap shell group |

---

### Task 1: Painted house and replay icons

**Files:**
- Create: `assets/icon-house.png`
- Create: `assets/icon-replay.png`

**Interfaces:**
- Consumes: style of `assets/shell-scallop-peach.png` (thick `#2a2438` outline, flat fills).
- Produces: two square transparent PNGs that `index.html` will load at those exact paths.

- [x] **Step 1: Generate `assets/icon-house.png`**

Use Imagine `image_gen` (or `image_edit` with the scallop as the style reference) at 1:1.

Prompt must lock: children’s game UI icon, single house only, no text, no background, no ground, no sky, no extra objects. Thick dark ink outline `#2a2438`. Coral `#e24b3c` roof. Foam `#fff8ee` walls. Sunflower `#ffe14a` door. Flat painted fills like `assets/shell-scallop-peach.png`. Centered, large in the frame, readable at 24px.

Save the result as `assets/icon-house.png`.

- [x] **Step 2: Generate `assets/icon-replay.png`**

Same style lock. Prompt must lock: children’s game UI icon, circular replay arrow only, no text, no background. Thick dark ink outline `#2a2438`. Arrow body sunflower `#ffe14a` with a small coral `#e24b3c` center dot. Flat painted fills like the scallop. Centered, large in the frame, readable at 24px.

Save the result as `assets/icon-replay.png`.

- [x] **Step 3: Open both PNGs and check**

Expected:
- Transparent (or easily isolatable) background, not a beach scene.
- Same thick-outline paint language as the scallop, not thin line-art.
- House reads as a house at ~24px. Replay reads as “again” at ~24px.
- If either fails, regenerate that one only.

- [x] **Step 4: Commit**

```bash
git add assets/icon-house.png assets/icon-replay.png
git commit -m "Add painted house and replay button icons."
```

---

### Task 2: Picture + word on every navigation button

**Files:**
- Modify: `index.html` (the four `data-back` Games buttons, the three `[data-difficulty]` buttons, `#play-again`, `#more-games`)
- Modify: `styles.css` (`.btn`, `.back-btn`, new `.btn-icon`)

**Interfaces:**
- Consumes: `assets/icon-house.png`, `assets/icon-replay.png`, `assets/shell-scallop-peach.png`
- Produces: no new JS API. Existing `data-back`, `data-difficulty`, `#play-again`, `#more-games` selectors keep working.

- [x] **Step 1: Markup `index.html`**

Replace the four Games buttons with this pattern (keep each button’s existing classes: `back-btn`, plus `difficulty-back` on the difficulty screen):

```html
<button type="button" class="back-btn" data-back>
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/icon-house.png" alt="" />
  </span>
  Games
</button>
```

Difficulty buttons:

```html
<button type="button" class="btn" data-difficulty="easy">
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/shell-scallop-peach.png" alt="" />
  </span>
  Easy
</button>
<button type="button" class="btn" data-difficulty="medium">
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/shell-scallop-peach.png" alt="" />
    <img src="assets/shell-scallop-peach.png" alt="" />
  </span>
  Medium
</button>
<button type="button" class="btn" data-difficulty="hard">
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/shell-scallop-peach.png" alt="" />
    <img src="assets/shell-scallop-peach.png" alt="" />
    <img src="assets/shell-scallop-peach.png" alt="" />
  </span>
  Hard
</button>
```

Cheer buttons:

```html
<button type="button" id="play-again" class="btn hidden" hidden>
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/icon-replay.png" alt="" />
  </span>
  Play again
</button>
<button type="button" id="more-games" class="btn btn-foam hidden" hidden>
  <span class="btn-icon" aria-hidden="true">
    <img src="assets/icon-house.png" alt="" />
  </span>
  More games
</button>
```

Do not change exhibit cards or any other markup.

- [x] **Step 2: CSS in `styles.css`**

Add `display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;` to `.btn`.

Add `display: inline-flex; align-items: center; gap: 0.35rem;` to `.back-btn`. Keep its existing `position`, `transform`, and `.difficulty-back` override.

Add:

```css
.btn-icon {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.08em;
  flex-shrink: 0;
}

.btn-icon img {
  width: 1.35em;
  height: 1.35em;
  object-fit: contain;
  pointer-events: none;
}

.back-btn .btn-icon img {
  width: 1.25em;
  height: 1.25em;
}
```

`.difficulty-row` already wraps. Do not let `.btn-icon` wrap.

- [x] **Step 3: Keep existing tests green**

Run:

```bash
node test/game.test.js
node test/path.test.js
node test/puzzle.test.js
```

Expected: all PASS. No new tests.

- [x] **Step 4: Browser check**

Open `index.html`. Confirm:

1. Menu still opens each of the three games.
2. Difficulty: house + Games; 1 / 2 / 3 shells on Easy / Medium / Hard; each starts that difficulty.
3. Tidy, Path, and Puzzle play screens: house + Games returns to the menu.
4. After a win: replay + Play again replays the same game at the same difficulty; house + More games returns to the menu.
5. Narrow viewport (~390px): difficulty buttons wrap; Hard still shows three shells on one pill.
6. Icons look like Beach Day paint, sit left of the words, and stay crisp.

- [x] **Step 5: Commit**

```bash
git add index.html styles.css
git commit -m "Add pictures to navigation buttons."
```

## Spec coverage

| Spec | Task |
|------|------|
| `icon-house.png` and `icon-replay.png` painted in scallop style | 1 |
| Reuse `shell-scallop-peach.png` for 1 / 2 / 3 | 2 |
| Games + More games share the house | 2 |
| Play again uses replay | 2 |
| Picture then word, decorative image, words stay | 2 |
| Flex pills, Hard shells do not wrap | 2 |
| No rules / menu-card / piece changes | 2 (out of scope) |
| Browser checklist | 2 |
