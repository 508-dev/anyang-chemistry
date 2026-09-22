# Development

## Commands

```bash
bun install                # locked by bun.lock; see docs/supply-chain.md
bun run dev                # Vite dev server on this worktree's port
bun run data:build         # regenerate data/game-data.json
bun run --cwd data build --report   # curation diagnostics (see docs/game-data.md)
./scripts/check-all.sh     # lint, typecheck, test, build (what CI runs)
./scripts/format.sh        # apply Biome formatting
```

Workspaces:

| Path | Package | What it is |
| --- | --- | --- |
| `packages/core` | `@anyang/core` | Engine: IDS, recipe book, board rules, reachability, progress, hints. No DOM, no dependencies. |
| `data` | `@anyang/data` | Vendored sources, curated TSVs, the generator, and the generated `game-data.json`. |
| `apps/web` | `@anyang/web` | Vite + Svelte 5 client. |

## Ports

`./scripts/dev.sh` derives a stable port from the worktree path so sibling
worktrees can run at the same time. `./scripts/worktree-ports.sh env` prints
it (`WEB_URL` first). Set `WEB_PORT` to override. If an old dev server from
this worktree is still holding the port:

```bash
./scripts/dev.sh --reclaim-ports
```

It only stops a process whose working directory is inside this worktree and
whose command looks like a JS dev server.

## Changing game content

Edit the TSVs in `data/curated/`, run `bun run data:build`, and commit the
regenerated `data/game-data.json` alongside the TSV change. CI fails if the
two disagree. `docs/game-data.md` explains each file and the `--report`
output.

## Testing in a browser

`bun run build && bun run --cwd apps/web preview` serves the production
build. Useful things to check by hand after UI changes:

- Drag with a mouse, and tap-a-tile-then-tap-a-zone on a touch device (or
  Chrome device emulation). Touch drags start after a short press.
- Both scripts (繁 / 簡); each keeps its own save in `localStorage`.
- A single character in the search box shows its construction tree.

## Android

`bun run android:build` packages the production web build into a debug APK.
`bun run android:run` installs it on a device or emulator. See
[android.md](android.md) for the JDK/SDK setup and native parity checks.

## Worktrees and workspace notes

`.worktreeinclude` lists ignored local files copied into new sibling
worktrees. `.context/` is gitignored scratch for agents and humans; promote
anything durable into these docs instead of committing it.
