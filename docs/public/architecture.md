# Architecture Overview

## Tech Stack

- **Runtime**: Electron (main) + React (renderer)
- **Language**: TypeScript
- **Package Manager**: pnpm workspaces
- **Storage**: File protocol (Markdown, JSON, JSONL)
- **LLM**: Multi-call per role architecture

## Package Structure

| Package | Purpose |
|---------|---------|
| `@agora/shared` | Types, IDs, time, result utilities |
| `@agora/kernel` | Council orchestration, moderator, routing |
| `@agora/room-store` | Room file protocol |
| `@agora/memory` | Memory substrate (stub) |
| `@agora/roles` | Role catalog & scoring |
| `@agora/vault-adapter` | Local file adapter with write policy |
| `@agora/argus-adapter` | Reserved for future integration |
| `@agora/ui` | React components |

## Key Constraints

- **Multi-call per role**: Each role gets an independent LLM call
- **Docs-only write policy**: Only .md/.txt/.json/.jsonl/.yaml/.yml/.toml/.csv
- **Electron security**: contextIsolation: true, nodeIntegration: false
