# 安陽字煉 · Anyang Chemistry

A combination game for Chinese characters, in the spirit of the old Android
"alchemy" games. You start with nothing but strokes (橫 豎 撇 點 …) and drag
them together into components, then characters. **Where you drop a piece
matters**: 女 to the left of 乃 makes 奶; 木 above 林 makes 森; 水 dropped on
the left shrinks to 氵 and turns 每 into 海.

The name nods to Anyang (安陽), where the oracle-bone inscriptions, the oldest
known Chinese writing, were excavated.

- ~5,200 traditional characters (and ~5,350 in the optional simplified mode),
  all reachable from 20 strokes, up to nine combinations deep.
- Trophies for end points (characters nothing else builds on), themed
  collections (一到十, 五行, 木林森 …), and discovery milestones.
- Type any character into the search box to see how it's built.
- Traditional Chinese by default; the audience is mostly in Taiwan.

## Quickstart

Requires [Bun](https://bun.sh) (version in `package.json` → `packageManager`).

```bash
bun install
bun run dev              # dev server on this worktree's port (printed on start)
./scripts/check-all.sh   # lint, typecheck, tests, production build
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server (`./scripts/dev.sh`, deterministic per-worktree port) |
| `bun run build` | Production build to `apps/web/dist/` |
| `bun run --cwd apps/web preview` | Serve the production build locally |
| `bun run test` / `bun run typecheck` / `bun run lint` | Individual checks |
| `bun run format` | Apply Biome formatting |
| `bun run data:build` | Regenerate `data/game-data.json` from the curated sources |
| `bun run --cwd data build --report` | Curation diagnostics: blockers, collisions, cross-script parts |

## How it plays

The construction board has five drop zones around the current piece:

```
            上 top (⿱)
 左 left (⿰)  [ piece ]  右 right (⿰)
           下 bottom (⿱)
      合 center: surround / overlay (⿴⿵⿶⿷⿸⿹⿺⿻)
```

- Drag a tile onto the board, or tap a tile and then tap a zone (easier on
  phones).
- A row or column that matches nothing yet but could become a three-part
  character (川 = 丿丨丨) waits for its third piece.
- Some pieces change shape by position: 水→氵 left, 人→亻 left, 火→灬 bottom,
  心→忄 left, and so on.
- Several characters can share one arrangement (人/入, 土/士); dropping again
  reveals the next one.
- 繁 / 簡 in the header switches scripts. Each script is a separate game with
  its own save.

## Project layout

```
packages/core/   engine: IDS, RecipeBook, board rules, reachability, progress, hints
data/            vendored sources, curated TSVs, generator, generated game-data.json
apps/web/        Vite + Svelte 5 client and Capacitor Android project
scripts/         dev, lint, typecheck, test, check-all entrypoints
docs/            architecture, data, development, deployment, supply chain
```

The engine and the JSON data are deliberately platform-neutral: the Android
app wraps the same web build with Capacitor (iOS is planned), and a fully native
port would only need to translate the small `packages/core` engine.

## Documentation

- [docs/architecture.md](docs/architecture.md): design, board rules, scripts, hints, mobile plan
- [docs/game-data.md](docs/game-data.md): data pipeline and the `game-data.json` contract
- [docs/android.md](docs/android.md): Android builds, device testing, and native saves
- [docs/development.md](docs/development.md): local workflow, ports, content changes
- [docs/deployment.md](docs/deployment.md): static hosting (GitHub Pages and others), release checklist
- [docs/supply-chain.md](docs/supply-chain.md): dependency and CI safety
- [DECISIONS.md](DECISIONS.md): durable project decisions
- [CONTRIBUTING.md](CONTRIBUTING.md): how to add recipes and changes

## Deployment

The game is a static site with no backend: `bun run build` and publish
`apps/web/dist/` to any static host. [docs/deployment.md](docs/deployment.md)
has a ready-to-use GitHub Pages workflow, settings for Cloudflare Pages and
Netlify, cache headers, and a pre-release checklist.

## Status and roadmap

Playable web version and a local Capacitor Android build (`bun run android:build`).
See [docs/android.md](docs/android.md) for setup. Next up:

- Android release automation and store distribution; a Capacitor wrapper for iOS.
- A bundled Traditional Chinese font subset so rare components render
  identically everywhere.
- A multi-character word tier (火 + 山 → 火山).
- Commonness data (e.g. TOCFL levels) to rank hints and trophies.
- Better stroke-level recipes for the remaining blockers (鬼, 鹿, 龍 …).

## Credits and license

- Character data: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)
  `dictionary.txt` (LGPL-3.0-or-later), derived from Unihan and CJKlib.
- Simplified/traditional variants: the
  [Unihan database](https://www.unicode.org/charts/unihan.html) (Unicode
  License v3).

Both are vendored under `data/vendor/` with their licenses. The game itself is
licensed under the [GNU AGPL v3](LICENSE).
