# AI Agent Development Guide

Anyang Chemistry (安陽字煉) is a Chinese-character combination game. Read
`README.md` for the overview and `docs/architecture.md` before structural
changes.

## Audience and language

- Players are mostly in Taiwan. All player-facing text is Traditional Chinese
  using Taiwan conventions (搜尋, 載入, 資訊), usually paired with English.
  Traditional is the default script; simplified is only an optional game mode.
- Keep Taiwan (TC) fonts first in font stacks; regional glyph shapes differ.

## Environment

- Only `python3` is guaranteed. Do not assume `python` exists.
- Use `bun run` for workspace scripts and the `scripts/*.sh` entrypoints.
- Treat install, dev, and test commands as executable code. Inspect manifests
  and scripts before running them.

## Repository shape

- `packages/core`: pure TypeScript engine (IDS, `RecipeBook`, board rules,
  reachability, progress, hints). No DOM, no dependencies. This is the code a
  native port would translate, so keep it small and portable.
- `data`: vendored sources, curated TSVs, the generator, and the generated
  `game-data.json` contract. See `docs/game-data.md`.
- `apps/web`: Vite + Svelte 5 client. Presentation and persistence only.
- `scripts`: stable entrypoints for dev, lint, typecheck, test, check-all.
- `docs`: architecture, data pipeline, development, deployment, supply chain.
- `.context/`: gitignored workspace-local scratch; promote durable knowledge
  into `docs/`.

## Editing rules

- Read target files, callers, exports, and tests before editing.
- Keep edits surgical; don't reformat unrelated files.
- Game rules belong in `packages/core`, not in Svelte components.
- Never hand-edit `data/game-data.json`. Change `data/curated/*.tsv` (or the
  generator) and run `bun run data:build`; commit both.
- Stroke-level recipes in `data/curated/components.tsv` are game design, not
  etymology, but they should be guessable. Check `bun run --cwd data build
  --report` for blockers and collisions after curation changes.
- Changing the `GameData` shape means bumping `GAME_DATA_SCHEMA_VERSION` and
  updating `docs/game-data.md`. Changing the save shape means bumping
  `SAVE_SCHEMA_VERSION` and keeping old saves loadable.
- Add or update tests when behavior changes; update docs when workflows change.

## Dependency safety

- Keep `bunfig.toml` `minimumReleaseAge = 604800` and commit `bun.lock`.
- CI uses `bun install --frozen-lockfile`.
- Pin GitHub Actions to commit SHAs. See `docs/supply-chain.md`.

## Validation

Before calling work complete:

```bash
./scripts/check-all.sh
```

For UI changes, also run the production build (`bun run build && bun run
--cwd apps/web preview`) and exercise drag and drop, tap-to-place, and both
scripts in a browser.
