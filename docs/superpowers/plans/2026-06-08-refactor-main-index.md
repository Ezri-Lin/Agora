# Refactor main/index.ts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split 474-line `apps/desktop/src/main/index.ts` into domain-specific handler modules, each under 200 lines.

**Architecture:** Extract IPC handlers by domain into `handlers/` directory. Main `index.ts` becomes a thin orchestrator (~60 lines) that creates the window and calls handler registration functions. Each handler module exports a `register*Handlers()` function.

**Tech Stack:** TypeScript, Electron (CJS output), Node.js fs/path

---

## File Structure

| File | Responsibility | Est. Lines |
|------|---------------|------------|
| `main/index.ts` | App lifecycle, window creation, handler registration | ~50 |
| `main/handlers/llm-config.ts` | Session API key, config read/write, settings IPC | ~130 |
| `main/handlers/workspace.ts` | Workspace open/init/listDocs/readDoc, recent workspaces | ~90 |
| `main/handlers/room.ts` | Room CRUD (create, append, write, read, list) | ~80 |
| `main/handlers/llm-chat.ts` | LLM chat proxy (mock + real provider) | ~80 |

---

### Task 1: Create `handlers/llm-config.ts`

**Files:**
- Create: `apps/desktop/src/main/handlers/llm-config.ts`
- Source: `apps/desktop/src/main/index.ts:8-241` (sessionApiKey, config management, settings IPC)

- [ ] **Step 1: Create handler file with session key + config management**

Extract from `index.ts` lines 8-84: `sessionApiKey`, `SavedLLMConfig` interface, config path/read/write/cache, `getEffectiveConfig`, `maskKey`, `getKeyStatus`.

- [ ] **Step 2: Add settings IPC handlers**

Extract from `index.ts` lines 153-241: `get-llm-config`, `settings:getLLM`, `settings:saveLLM`, `settings:clearApiKey`, `settings:testConnection`.

- [ ] **Step 3: Export `getSessionApiKey()` and `getEffectiveConfig()` for llm-chat.ts**

- [ ] **Step 4: Verify typecheck**

```bash
cd apps/desktop && npx tsc -p tsconfig.electron.json
```

---

### Task 2: Create `handlers/workspace.ts`

**Files:**
- Create: `apps/desktop/src/main/handlers/workspace.ts`
- Source: `apps/desktop/src/main/index.ts:86-305` (recent workspaces + workspace IPC)

- [ ] **Step 1: Create handler with recent workspaces logic**

Extract: `RecentWorkspace` interface, `readRecentWorkspaces`, `writeRecentWorkspaces`, `recordWorkspace`, `getRecentWorkspacesPath`.

- [ ] **Step 2: Add workspace IPC handlers**

Extract: `workspace:getRecent`, `workspace:removeRecent`, `workspace:openDialog`, `workspace:init`, `workspace:listDocs`, `workspace:readDoc`, `SCAN_EXTENSIONS`.

- [ ] **Step 3: Export `registerWorkspaceHandlers(mainWindow)`**

Needs `mainWindow` ref for `dialog.showOpenDialog`.

- [ ] **Step 4: Verify typecheck**

---

### Task 3: Create `handlers/room.ts`

**Files:**
- Create: `apps/desktop/src/main/handlers/room.ts`
- Source: `apps/desktop/src/main/index.ts:307-384` (room store IPC)

- [ ] **Step 1: Create handler with all room IPC**

Extract: `roomsRoot`, `room:create`, `room:appendMessage`, `room:writeSummary`, `room:writeMemoryCandidates`, `room:exportSession`, `room:readMessages`, `room:listOutputs`.

- [ ] **Step 2: Export `registerRoomHandlers()`**

- [ ] **Step 3: Verify typecheck**

---

### Task 4: Create `handlers/llm-chat.ts`

**Files:**
- Create: `apps/desktop/src/main/handlers/llm-chat.ts`
- Source: `apps/desktop/src/main/index.ts:386-474` (LLM chat proxy)

- [ ] **Step 1: Create handler with llm:chat IPC**

Extract: `ChatMessage` interface, mock provider logic, real provider fetch, error normalization. Import `getSessionApiKey` from `llm-config.ts`.

- [ ] **Step 2: Export `registerLLMChatHandlers()`**

- [ ] **Step 3: Verify typecheck**

---

### Task 5: Rewrite `index.ts` as thin orchestrator

**Files:**
- Modify: `apps/desktop/src/main/index.ts`

- [ ] **Step 1: Replace full file with slim orchestrator**

Keep only: imports, `mainWindow`, `createWindow()`, app lifecycle, basic IPC (version/platform), handler registration calls.

Target: ~50 lines.

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Verify app launches correctly**

```bash
cd apps/desktop && pnpm dev:vite & pnpm dev:electron
```

- [ ] **Step 4: Commit and push**

```bash
git add apps/desktop/src/main/
git commit -m "refactor(main): split index.ts into domain handler modules"
git push origin main && git push private main
```
