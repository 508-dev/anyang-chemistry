# Claude Code Instructions

The canonical agent instructions are in `AGENTS.md`.

Follow the same repo rules as other agents:

- Read before editing.
- Prefer repo-provided scripts: `bun run` and `./scripts/*.sh`.
- Keep changes scoped.
- Update tests and docs when contracts change (`docs/game-data.md` for the
  data format).
- Use gitignored `.context/` for concise workspace-local operational memory.
  Promote durable knowledge into tracked docs instead of committing `.context/`.
