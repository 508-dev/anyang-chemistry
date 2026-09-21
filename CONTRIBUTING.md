# Contributing

## Setup

```bash
bun install
bun run dev
```

See `docs/development.md` for the full workflow.

## Kinds of contributions

- **Recipes and content**: most improvements are edits to `data/curated/`:
  new stroke-level recipes, fixes for awkward or colliding decompositions,
  positional variants, script overrides, and trophy collections. Run
  `bun run --cwd data build --report` to see which missing parts block the
  most characters, and commit the regenerated `data/game-data.json` with your
  TSV change. `docs/game-data.md` explains every file.
- **Game rules**: `packages/core`, with tests in `packages/core/tests`.
- **Interface**: `apps/web`. Player-facing text is Taiwan-style Traditional
  Chinese, usually with English alongside.

## Checks

```bash
./scripts/check-all.sh
```

CI runs the same checks and also fails if `data/game-data.json` is out of
date with the curated sources.

## Pull requests

Use the PR template: what changed, why, and how it was validated. Add
screenshots for UI changes. Don't commit local state (`node_modules`,
`.context/`, logs, screenshots).
