# Deployment

The game is a static site: no server, no database, no secrets. Progress lives
in the player's browser (`localStorage`, one save per script).

```bash
bun install --frozen-lockfile
bun run build            # -> apps/web/dist/
```

`apps/web/dist/` contains `index.html` plus hashed assets (JS, CSS and
`game-data-<hash>.json`, ~170 kB gzipped). Vite is configured with
`base: "./"`, so the build works from a domain root or any sub-path without
changes. There is no client-side routing, so no SPA rewrite rules are needed.

## Caching

- `assets/*` file names are content-hashed: cache them for a year
  (`Cache-Control: public, max-age=31536000, immutable`).
- `index.html` should revalidate (`no-cache`) so players pick up new builds.

## GitHub Pages (recommended)

The repo already lives on GitHub (`508-dev/anyang-chemistry`), so Pages is the
lowest-effort host. One-time setup: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. Then add `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: step-security/harden-runner@ab7a9404c0f3da075243ca237b5fac12c98deaa5 # v2
        with:
          egress-policy: audit
      - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5
        with:
          persist-credentials: false
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2
        with:
          bun-version: 1.3.13
      - run: bun install --frozen-lockfile
      - run: ./scripts/check-all.sh
      - uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0
      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
```

The site appears at `https://508-dev.github.io/anyang-chemistry/`. For a
custom domain, add it under Settings → Pages and create the DNS record GitHub
shows; no code change is needed thanks to the relative base path. Pages sets
its own cache headers (10 minutes for everything), which is acceptable here.

Rollback: re-run the Deploy workflow for an earlier commit, or revert on
`main`.

## Other static hosts

Any static host works with the same build command and output directory:

| Host | Build command | Output dir | Notes |
| --- | --- | --- | --- |
| Cloudflare Pages | `bun install --frozen-lockfile && bun run build` | `apps/web/dist` | Fast in Taiwan; add a `_headers` file in `apps/web/public/` for the cache rules above. |
| Netlify | same | `apps/web/dist` | Cache rules via `netlify.toml` `[[headers]]`. |
| Any web server / CDN bucket | run locally or in CI | `apps/web/dist` | Upload the directory; apply the cache rules above. |

Set the host's Bun version to match `packageManager` in `package.json`.

## Before each release

1. `./scripts/check-all.sh` passes (CI enforces this too).
2. If `data/curated/*` changed, `data/game-data.json` was regenerated and
   committed (CI checks this).
3. `game-data.json` changes are safe for existing players: saves store only
   discovered ids, and ids that no longer exist are dropped on load. Renaming
   or removing an element does remove it from players' collections.
4. Smoke-test the production build: `bun run --cwd apps/web preview`.

## Android App Release & Publishing

The Capacitor Android app lives in `apps/web/android/` and packages the same
web build. Run `bun run android:build` to produce a local debug APK. See
[android.md](android.md) for prerequisites, device testing, save behavior,
and the parity checklist.

### Automated Release Workflow

Releases are automated via the `.github/workflows/release.yml` workflow:

1. Merge a PR to `main` → release-please opens a "chore(main): release X.Y.Z" PR
2. Review the PR (it updates `version.txt`, `CHANGELOG.md`, and derived files)
3. Merge the PR → workflow tags vX.Y.Z and builds signed APK/AAB
4. Artifacts are attached to the GitHub Release
5. Optionally publishes to Google Play (internal track) and/or F-Droid

For full setup and troubleshooting, see [android-release.md](android-release.md).

The application ID is `dev.co508.anyangchemistry`. The Android project contains
no Google Services plugin configuration. Keep new runtime dependencies
compatible with F-Droid's inclusion requirements. An iOS wrapper remains planned.
