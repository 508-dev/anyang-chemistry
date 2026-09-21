# Architecture

Anyang Chemistry is a combination game for Chinese characters, in the style of
the Android "alchemy" games. You start with the strokes (橫 豎 撇 點 …) and
combine them into components, then characters. Where you place a piece
matters: 女 to the left of 乃 makes 奶.

## Core idea: recipes are IDS

Unicode already has a notation for how characters are built: Ideographic
Description Sequences. `奶 = ⿰女乃` means 女 on the left and 乃 on the right.
Every recipe in the game is one IDS whose parts are all playable elements:

| Layout | Meaning | How the player makes it |
| --- | --- | --- |
| `⿰` `⿲` | left to right (2 or 3 parts) | drop on the 左/右 zones |
| `⿱` `⿳` | top to bottom (2 or 3 parts) | drop on the 上/下 zones |
| `⿴⿵⿶⿷⿸⿹⿺⿻` | enclosure / overlay | drop on the center 合 zone |

Adding a third part: if a two-part row or column matches nothing, but some
three-part recipe starts or ends with it, the board holds the pair so the
player can add a third part along the same axis. If the pair *did* make
something (丿 + 丨 = 亻), the board remembers that pair, so a third piece in
line still completes a three-part character (亻 + 丨 → 川 = ⿲丿丨丨).

Center drops try each enclosing layout in both directions. When several
characters share one arrangement (人/入, 土/士, simplified/traditional pairs),
the first one the player hasn't found yet wins. Repeating the drop reveals
the next one.

**Positional variants**: some elements change shape in some positions. For
example 水 becomes 氵 on the left, and 火 becomes 灬 at the bottom. A base
element dropped into its variant slot also matches recipes written with the
variant, and the board draws the variant form. That covers the idea of
dragging something to the side of the board and having it shrink.

## Layers

```
data/                 portable content: sources, generator, game-data.json
packages/core/        pure TypeScript engine, no DOM, no dependencies
apps/web/             Vite + Svelte 5 client
```

- **`data/game-data.json`** is the contract every client loads. Its format is
  in [game-data.md](game-data.md). It's generated, but it's committed so
  clients never need the pipeline, and CI checks that it's up to date.
- **`packages/core`** is about 400 lines: IDS parsing, the recipe index
  (`RecipeBook`), board rules (`placePiece`), and progress/scoring
  (`Progress`, `achievements`, `score`). Everything is a pure function or
  an immutable value.
- **`apps/web`** is only presentation: drag and drop, rendering composites,
  and persistence through a `SaveStore` interface.

Saves contain only the ordered list of discoveries. Scores, trophies, end
points, and hints are all derived, so saves stay tiny and survive data
updates. Ids that no longer exist are dropped when a save is restored.

## Scripts

Simplified and traditional are separate games. `new RecipeBook(data, { script })`
removes the other script's elements, then re-runs reachability from the
strokes. Anything that could only be built through the other script is gone
too, along with its depth, end points and collection members. Each script has
its own save. The audience is mostly in Taiwan, so traditional is the
default and all interface text, stroke names and collection titles are in
traditional Chinese; simplified remains available as a game mode. The
choice is remembered per device. Shapes that shared characters need (幺 in 幼) are marked `both`
in `data/curated/scripts.tsv`.

## Hints

Typing a single character into the search box shows `howToMake()`: a
construction tree that follows the shallowest recipe at each step. It stops at
pieces the player already has and labels each part with its zone
(左右上下, or 合/疊/外 for center drops). Components with no gloss (𠂉) are
described by the characters they help build. Strokes that are also characters
keep their reading, so 一 is found by "yi" or "one".

## Scoring and end points

- **Discovered**: count out of all reachable elements.
- **终 End points**: elements that no recipe builds on. These are the "human
  life" trophies of this game.
- **Collections**: curated sets (一到十, 五行, 木林森, …) in
  `data/curated/collections.tsv`.
- **Milestones**: 10, 25, 50, … discoveries.
- **Depth**: the fewest combinations needed to reach an element from the
  strokes.

## Mobile and cross-platform plan

Decision: web first, then wrap the same build as native apps with
**Capacitor**. Keep the engine and data portable enough that a fully native
rewrite stays cheap.

Why:

- The game is 2D UI with drag and drop and text glyphs. A WebView handles
  this well, and Capacitor ships the exact web build to Android and iOS with
  access to native APIs. That means one codebase and no rewrite.
- The logic that must behave the same everywhere is small and has no
  dependencies (`packages/core`). The content is plain JSON. If we later want
  native Kotlin/Compose or Swift/SwiftUI, porting `core` is a single,
  well-bounded LLM translation, checked against the same `game-data.json`
  and a port of `packages/core/tests`.
- Persistence already goes through an async `SaveStore`. The Capacitor
  version only needs a Preferences-backed store.

Alternatives considered:

- React Native / Expo: one codebase too, but the drag-and-drop and animation
  stack (gesture-handler, reanimated) is heavier, and its web target is a
  second-class citizen.
- Flutter: strong for games, but it's a separate language and ecosystem, and
  nothing here needs its renderer.
- Kotlin Multiplatform / Compose Multiplatform: good for sharing logic with a
  native Android app, but the web target is still immature.

Pointer events (not HTML5 drag and drop) are used so touch works. Touch drags
start after a short press so the palette can still scroll. Tapping a tile and
then tapping a zone also works.

## Open questions

- Multi-character words (火 + 山 → 火山) as a tier above characters.
- Commonness data (HSK or a frequency list) to rank hints and trophies.
- A bundled font subset, so rare components (𠂉, CJK stroke glyphs) render the
  same everywhere.
