# Dependency Supply-Chain Policy

Dependencies are few (Vite, Svelte, TypeScript, Vitest, Biome) and the game
ships as static files, but new package versions are still a supply-chain risk
window. Defenses:

## Cooldowns

`bunfig.toml` refuses package versions published less than seven days ago:

```toml
[install]
minimumReleaseAge = 604800          # seconds
minimumReleaseAgeExcludes = ["@types/bun", "typescript"]
linker = "isolated"
```

`renovate.json` uses the same window (`minimumReleaseAge: "7 days"`) so
dependency PRs don't fight the cooldown.

## Locked installs

`bun.lock` is committed. CI runs `bun install --frozen-lockfile`; do the same
locally when you only want to reproduce CI.

## Vendored data

`data/vendor/` holds third-party data copied into the repo with its license:
Make Me a Hanzi (`LGPL-3.0-or-later`) and a filtered Unihan extract
(Unicode License v3). Update them deliberately, rebuild `game-data.json`, and
review the diff; they are not fetched at build time.

## GitHub Actions

Workflows pin actions to commit SHAs, keep `permissions: contents: read`, use
`persist-credentials: false`, and run `harden-runner` in audit mode. Update
pinned SHAs intentionally rather than switching back to moving tags.

## When native apps arrive

A Capacitor Android/iOS shell adds Gradle and CocoaPods/SPM dependencies.
Track their versions in the native projects (e.g. `gradle/libs.versions.toml`)
so Renovate can update them on the same cooldown.
