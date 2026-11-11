# Decisions

Last reviewed: 2026-09-19

Durable project decisions. `docs/architecture.md` has the longer reasoning.

## Recipes are IDS

Decision: every recipe is an Ideographic Description Sequence whose parts are
playable elements (`奶 = ⿰女乃`). Board zones map to layouts: left/right →
⿰⿲, top/bottom → ⿱⿳, center → enclosures and overlay.

Why: IDS is the Unicode standard for character structure, existing
dictionaries already use it, and it makes "position matters" the core rule.

## Portable engine and data, web-first client

Decision: `packages/core` is dependency-free TypeScript and `game-data.json`
is the cross-platform contract. Ship the web build to Android/iOS with
Capacitor; port `core` to Kotlin/Swift only if a fully native app is needed.

Why: one codebase for all platforms now, and a small, well-tested engine keeps
a future native port cheap.

## Traditional first, scripts are separate games

Decision: traditional Chinese is the default and all UI text is Taiwan-style
traditional. Simplified is an optional mode. Each script is its own game
(elements of the other script removed, reachability re-run, separate saves).

Why: the audience is mostly in Taiwan, and mixing scripts cluttered the
palette with near-duplicates.

## Derived state is never stored

Decision: saves hold only the ordered discovery list; depth, end points,
trophies and hints are derived from the data at load time.

Why: saves stay tiny and survive data updates and script changes.

## Static hosting, no backend

Decision: the game is a static site with progress in the browser. See
`docs/deployment.md`.

Why: nothing needs a server yet; static hosting is free, fast, and has no
secrets to manage.

## Dependency cooldowns and locked installs

Decision: seven-day cooldowns in Bun and Renovate, committed `bun.lock`,
frozen installs in CI, SHA-pinned actions.

Why: new package versions are a supply-chain risk window.

Deviate when: a security fix requires an immediate update; note it in the PR.

## Host-run dev server with deterministic worktree ports

Decision: `scripts/dev.sh` runs Vite on the host with a port derived from the
worktree path.

Why: sibling worktrees can run concurrently without editing config.

## Per-branch betas have their own identity and key

Decision: pushes to any branch other than `main`, `gh-pages`, and
`release-please--...` build an installable **Anyang Chemistry Beta** APK that
sits beside the production app rather than replacing it. The `beta` build type
adds the `.beta` application ID suffix, overrides the app name and launcher
background, and inherits the release configuration (R8, resource shrinking).

Why: the easiest way to test work on a device is to install it alongside the
shipping app. Betas get their own signing key because a workflow that runs for
arbitrary branches must never have the release key; losing the beta key only
means beta users uninstall and reinstall. Each build uses the workflow run
number as its `versionCode` (it increases across branches), so a new APK always
installs over the previous beta. This is an output-level override only — the
generated production `versionCode`/`versionName` literals stay unchanged for
F-Droid's regex-based update bot. See `docs/beta-builds.md`.
