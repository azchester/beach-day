# Button icons — Design

Date: 2026-08-18  
Location: `ai-sync/beach-day/`  
Players: an adult and a child about to turn 4, sitting together. She cannot read yet. She can follow pictures.

## Purpose

Every **navigation** button shows a painted picture next to its word so she can pick it without reading. The adult still has the word.

This spec is **button pictures only**. Tide Pool Tidy, Beach Puzzle, and Crab Path rules stay the same.

## Player experience

She already picks a game from the three pictured menu cards. After that, the words she cannot use today are:

- **Games** (back to the menu, on the difficulty screen and every play screen)
- **Easy / Medium / Hard**
- **Play again**
- **More games**

Each of those keeps its word and gains a picture on the left. Tap target and click behavior do not change.

The menu cards already have pictures. Sand pieces, puzzle pieces, and path tiles already look like the things they are. Those stay as they are.

## Picture map

| Button | Picture | Meaning for her |
|--------|---------|-----------------|
| Games | Painted house | Go home, to the menu of games |
| More games | Same house | Same place as Games |
| Play again | Painted replay arrow | Do that game once more |
| Easy | 1 scallop shell | The gentlest pick |
| Medium | 2 scallop shells | The middle pick |
| Hard | 3 scallop shells | The fullest pick |

Games and More games use the **same** house so both “go to the menu” buttons match.

Difficulty uses **count**, not size or a different object per level. One shell is Easy. Two is Medium. Three is Hard.

## Assets

Reuse the Tide Pool scallop she already sorts:

- `assets/shell-scallop-peach.png` — one copy per shell on the difficulty buttons

Paint two new icons in the same thick ink-outline, flat-fill beach style as that scallop (coral roof / sunflower fill / foam walls, dark `#2a2438` stroke). They are small button pictures, not scenes.

- `assets/icon-house.png` — house, used by **Games** and **More games**
- `assets/icon-replay.png` — circular replay arrow with a filled center, used by **Play again**

Do not invent extra icons. Do not restyle the existing scallop. Do not replace the menu card art.

Transparent background. Square canvas. Readable at about 20–28px on the small Games button and about 26–32px on the yellow buttons.

## Markup and look

Each of those buttons is: **picture, then word**, in one row, vertically centered.

- The picture is decorative: `alt=""` and `aria-hidden="true"` (or an equivalent inline image that is hidden from the accessibility tree).
- The visible word stays in the button. Do not hide the label. Do not rely on `aria-label` instead of the word.
- **Games** still uses `.back-btn`. **Easy / Medium / Hard**, **Play again**, and **More games** still use `.btn` / `.btn-foam`.

CSS: the existing pill buttons become a horizontal flex row with a small gap. Icons scale with the button (smaller on `.back-btn`). The three-shell Hard button must stay on one pill; if the row is narrow, the **buttons** wrap, not the three shells inside Hard.

No new screens. No new copy. The “How hard today?” tag and cheer phrases stay as they are.

## What does not change

- Game start, difficulty, play-again, and back-to-menu behavior
- `game.js`, `path.js`, `puzzle.js` rules
- Exhibit cards on the menu
- In-play pieces, tiles, and puzzle jigs
- Fonts, colors, and the existing yellow / foam pill style, except the flex + icon sizing needed to sit the picture next to the word

## Testing

No new unit tests. Nothing in the session logic changes.

Check in the browser:

1. Menu still opens each game as today.
2. Difficulty screen: house + Games; 1 / 2 / 3 shells on Easy / Medium / Hard; each starts the right difficulty.
3. Every play screen: house + Games returns to the menu.
4. After a win: replay + Play again starts the same game at the same difficulty; house + More games returns to the menu.
5. Narrow phone width: difficulty buttons wrap cleanly; Hard still shows three shells on one pill.
6. Pictures are visible next to the words and still look like Beach Day paint, not outline clip-art.
