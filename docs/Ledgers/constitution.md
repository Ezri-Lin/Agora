# Agora Constitution

## Project

Agora — local-first, memory-aware, multi-role council room document assistant.

## Tech Stack

- Electron + React 18 + TypeScript strict
- ESM modules throughout
- Inline styles (no CSS framework)
- Monorepo: `packages/` (shared, kernel, roles, ui) + `apps/desktop`

## File Rules

- ≤200 lines ideal, >400 warning, >1000 severe
- One concern per file
- Extract hooks when React component exceeds ~150 lines
- Group IPC/API handlers by domain in separate files

## Naming

- Files: camelCase for modules, PascalCase for React components
- Directories: PascalCase for UI components, camelCase for modules
- IPC channels: `domain:action` (e.g., `room:create`, `settings:getLLM`)

## Git

- Two remotes: `origin` (public Ezri-Lin/Agora) and `private` (Ezri-Lin/Agora-Private)
- Push to both remotes
- Never add Co-Authored-By or AI attribution to commits

## Security

- API key never sent to renderer
- Non-secret config in `userData/llm-config.json`
- API key in session memory only
