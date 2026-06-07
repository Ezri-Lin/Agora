# Agora

Local-first, memory-aware multi-role council room document assistant.

Agora brings together diverse AI perspectives — strategists, critics, historians, architects — to analyze your documents and ideas through structured multi-role discussion.

## Features

- **Multi-Role Council** — 5 core roles (Moderator, Skeptic/Critic, Historian, Product Strategist, Systems Architect) + 4 persona lenses (Jobs, Buffett, Munger, Growth Marketer)
- **Cross-Examination** — Roles challenge and question each other's responses
- **Memory System** — Extracts durable insights from discussions, injects them into future rounds
- **Custom Roles** — Create your own roles via the Inspector panel
- **Auto-Invite** — Persona lenses automatically join when topics match their expertise
- **Dual-Layer Context** — Moderator reads full documents; roles receive budgeted excerpts
- **Local-First** — All data stays on your machine. No cloud dependencies for storage.
- **Workspace-Based** — Organize rooms, documents, and memories per project

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Install

```bash
pnpm install
```

### Development

```bash
# Start Vite dev server + Electron
cd apps/desktop
pnpm dev:vite &
pnpm dev:electron
```

### Build

```bash
# Build for production
cd apps/desktop
pnpm dist:mac    # macOS DMG
pnpm dist:win    # Windows NSIS
pnpm dist:linux  # Linux AppImage
```

## Architecture

```
packages/
  shared/        — Core types (Room, RoleCard, CouncilMessage, MemoryCandidate)
  kernel/        — Council orchestration, context building, memory, routing
  roles/         — Role card definitions (core roles + persona lenses)
  ui/            — React UI components (AppShell, Inspector, Composer, CouncilRoom)
  adapters/      — Workspace adapters (vault for file system)

apps/desktop/    — Electron app (main process + renderer)
```

### Council Round Flow

1. Inject relevant memories into context
2. Build moderator context (full docs) and role context (budgeted excerpts)
3. Moderator analyzes the scene
4. Select roles + auto-invite matching persona lenses
5. Each role responds independently
6. Cross-examination (roles challenge each other)
7. Moderator synthesizes summary
8. Extract memory candidates for future use

## Configuration

Agora supports any OpenAI-compatible API. Configure via Settings:

- **Provider** — openai, anthropic, or any compatible endpoint
- **Model** — Model ID (e.g., gpt-4, claude-3-sonnet)
- **Base URL** — Custom API endpoint
- **API Key** — Stored locally, never transmitted to third parties

## Storage

All data lives in your workspace:

```
<workspace>/
  .agora/
    rooms/<roomId>/
      room.json           — Room configuration
      messages.jsonl      — All messages (append-only)
      summary.md          — Moderator summary
      context.md          — Context description
      memory-candidates.md — Extracted insights
      exports/session.md  — Full session export
    memory/
      memories.jsonl      — Accepted memory candidates
    roles/
      custom-roles.json   — User-defined roles
```

## License

MIT
