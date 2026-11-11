# GitHub Workflows

## CI (`.github/workflows/ci.yml`)

- `changes` detects whether game code, data, tooling or workflows changed.
- `typescript` runs Biome, typecheck, tests, checks that
  `data/game-data.json` matches a fresh `bun run data:build`, and builds the
  web app.
- `ci-passed` is the aggregate job to require in branch protection; path
  filtering may skip `typescript`, which is fine when detection succeeded.

## Beta (`.github/workflows/beta.yml`)

Every push to a branch other than `main`, `gh-pages`, or a
`release-please--...` branch builds a separately signed **Anyang Chemistry
Beta** APK and publishes it as a `beta-<branch>-<run>` pre-release; deleting a
branch removes its beta releases. It needs `contents: write` and the four
`BETA_*` repository secrets. See `docs/beta-builds.md`.

Keep workflows at `permissions: contents: read` unless a job must call PR APIs
or deploy. The GitHub Pages deploy described in `docs/deployment.md` is the
exception and grants only `pages: write` and `id-token: write` to its deploy job.

## Templates

`.github/PULL_REQUEST_TEMPLATE.md` and the issue forms under
`.github/ISSUE_TEMPLATE/` (bug, feature, docs) are intentionally short.
`.github/FUNDING.yml` points at the 508.dev GitHub Sponsors account.
