# MVP Scope

## What Works

- Electron app with React UI
- Chat-first council room with mock multi-role responses
- Role message display with avatar, name, subtitle, bubble
- Composer with send/stop, settings popover
- Left ContextGraph (mock nodes)
- Right Inspector (Participants, References, Outputs tabs)
- Mock multi-call provider simulating independent role calls
- Room file protocol (create, load, append, export)
- Docs-only write policy enforcement
- Shared types for all core entities

## What Is Mocked

- LLM responses (MockMultiCallProvider)
- Context graph (static nodes)
- Memory retrieval (stub)
- Workspace file picker

## What Is Not Built

- Real LLM integration
- Vector search / embeddings
- Obsidian plugin
- Argus integration
- Cloud sync
- Authentication
- Auto updater
