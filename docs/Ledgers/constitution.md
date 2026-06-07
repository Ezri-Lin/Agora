# Agora Constitution

## Project

Agora — local-first, memory-aware, multi-role council room document assistant.

Users send a topic → Agora runs a multi-role council round → each role contributes a perspective → moderator synthesizes → summary and session exported to workspace.

## Tech Stack

- Electron + React 18 + TypeScript strict
- ESM modules throughout
- Inline styles (no CSS framework)
- Monorepo: `packages/` (shared, kernel, roles, ui) + `apps/desktop`

## Architecture

```
Renderer (React UI)
  → window.agora.* (preload bridge)
  → IPC handlers (main process)
  → Node fs (read/write)
  → .agora/ workspace directory
```

### Data Flow

```
User types topic
  → App.tsx: handleSend()
  → bridge.room.create() → room.ts IPC → writes .agora/rooms/<id>/
  → runCouncilRound() (kernel, pure in-memory)
  → IPCProvider.callModerator() → llm:chat IPC → fetch API
  → IPCProvider.callRole() → llm:chat IPC → fetch API
  → bridge.room.appendMessage() → room.ts IPC → messages.jsonl
  → bridge.room.writeSummary() → room.ts IPC → summary.md
  → bridge.room.exportSession() → room.ts IPC → exports/session.md
```

### LLM Provider Flow

```
Renderer → llm:chat IPC → llm-chat.ts
  → mock provider (fake responses, 200-500ms delay)
  → real provider (POST /chat/completions, session key > env var)
```

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
- All file paths validated against workspace root
- Room IDs sanitized to `[a-zA-Z0-9_-]`
- File type whitelist on read operations
- IPC sender validation against main window
- All writes logged to `audit.jsonl`

## Workspace Structure

```
<user-workspace>/
  .agora/
    BOOT.md            — workspace metadata
    rooms/
      <room-id>/
        room.json       — room config
        messages.jsonl  — append-only message log
        context.md      — context for moderator
        summary.md      — council round summary
        memory-candidates.md — extracted insights
        exports/
          session.md    — full session export
    memory/             — (future) persistent memory
```

## IPC Channels

| Channel | Handler | Purpose |
|---|---|---|
| `get-app-version` | index.ts | App version |
| `get-platform` | index.ts | OS platform |
| `get-llm-config` | llm-config.ts | Effective LLM config |
| `settings:getLLM` | llm-config.ts | Settings view |
| `settings:saveLLM` | llm-config.ts | Save LLM config |
| `settings:clearApiKey` | llm-config.ts | Clear session key |
| `settings:testConnection` | llm-config.ts | Test API connection |
| `llm:chat` | llm-chat.ts | Send chat to LLM |
| `workspace:getRecent` | workspace.ts | Recent workspaces |
| `workspace:removeRecent` | workspace.ts | Remove from recents |
| `workspace:openDialog` | workspace.ts | Open folder dialog |
| `workspace:init` | workspace.ts | Initialize workspace |
| `workspace:listDocs` | workspace.ts | List documents |
| `workspace:readDoc` | workspace.ts | Read document content |
| `room:create` | room.ts | Create room |
| `room:appendMessage` | room.ts | Append to messages.jsonl |
| `room:writeSummary` | room.ts | Write summary.md |
| `room:writeMemoryCandidates` | room.ts | Write memory candidates |
| `room:exportSession` | room.ts | Write session export |
| `room:readMessages` | room.ts | Read messages.jsonl |
| `room:listOutputs` | room.ts | List room output files |
