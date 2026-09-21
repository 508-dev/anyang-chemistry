# Security Policy

## Reporting vulnerabilities

Please don't open public issues for vulnerabilities. Use GitHub's private
reporting instead: **Security → Report a vulnerability** on
`508-dev/anyang-chemistry`.

## Scope

The game is a static site with no backend, accounts, or secrets. Player
progress stays in the browser's `localStorage`. The most relevant risks are
dependency supply-chain issues and the integrity of the deployed build; see
`docs/supply-chain.md` for the defenses (cooldowns, locked installs,
SHA-pinned actions).

## Secrets

The repo needs none. If deployment or app-store publishing later adds
credentials, keep them in CI secrets or the platform's secret store, never in
the repository.
