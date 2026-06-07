# Agora Agent Protocol

## Product

Agora — local-first, memory-aware, multi-role council room document assistant.

## Architecture

```
packages/shared/       — types, constants
packages/kernel/       — context, routing, council orchestration, LLM providers
packages/roles/        — role cards and catalog
packages/ui/           — React components (renderer, inline styles only)
packages/adapters/     — vault (file policy, safe write), argus (reserved)
apps/desktop/          — Electron main process + preload
```

## Tech Stack

- Electron + React 18 + TypeScript (strict)
- ESM modules (`"type": "module"`)
- Inline styles only (no CSS files, no Tailwind, no styled-components)
- Theme tokens: `packages/ui/src/theme/tokens.ts`

## Repository Split

Two remotes, same codebase. Push to both:

```bash
git push origin main && git push private main
```

| Repo | URL | Purpose |
|---|---|---|
| `origin` | `https://github.com/Ezri-Lin/Agora.git` | Public — source code, open to community |
| `private` | `https://github.com/Ezri-Lin/Agora-Private.git` | Private — internal docs, Ledgers, invariants, plans |

### What goes where

**Public (`origin`)**:
- All source code (`packages/`, `apps/`)
- Public docs (`docs/public/`, `docs/roles-design.md`)
- Build config (`tsconfig`, `package.json`, `vite.config`)
- `.gitignore`, `README.md`

**Private (`private`)**:
- Ledger documentation (`docs/Ledgers/`) — constitution, maps, invariants, progress
- Agent protocol (`AGENTS.md`)
- Internal plans (`docs/superpowers/plans/`)
- Anything with internal business rules, security invariants, or strategic context

**Neither (local only)**:
- `.agora/` — workspace data
- `node_modules/`, `dist/`, build outputs
- `.env` files

## Security

- API key must never be sent to renderer. Main process only.
- API key stored in memory (session-only) or env var. Never in workspace files.
- All file paths validated against workspace root (`assertInWorkspace`)
- Room IDs sanitized to `[a-zA-Z0-9_-]`
- File type whitelist on read operations
- IPC sender validation against main window
- All write operations logged to `audit.jsonl`

## Build & Typecheck

```bash
pnpm --filter @agora/shared typecheck
pnpm --filter @agora/kernel typecheck
pnpm --filter @agora/roles typecheck
pnpm --filter @agora/ui typecheck
cd apps/desktop && npx tsc -p tsconfig.electron.json
```

## Invariants to Protect

- Dual-layer context (moderator full, roles budgeted)
- Error semantics (failed roles → system/error messages, not fake content)
- API key never reaches renderer
- Docs-only write policy (no code file writes from AI)
- Path containment (no workspace escape)
