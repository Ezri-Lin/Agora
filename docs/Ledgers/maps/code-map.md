# Code Map

## packages/shared/src/
- `types.ts` — Core types: Room, CouncilMessage, RoleCard, LLMConfig, SourceRef
- `utils.ts` — generateId, nowISO

## packages/kernel/src/
- `index.ts` — Barrel exports (runCouncilRound, ContextPack, OpenAICompatibleProvider)
- `council/CouncilRunner.ts` — Orchestrates multi-role council rounds
- `context/ContextPack.ts` — Builds moderator context with doc budgeting
- `context/ModeratorContextPack.ts` — Moderator-specific context assembly
- `context/extractExcerpt.ts` — Extracts relevant excerpts from docs
- `context/promptContracts.ts` — Prompt templates for moderator/roles
- `llm/OpenAICompatibleProvider.ts` — OpenAI-compatible API client
- `eval/runEval.ts` — CLI evaluation runner (not exported in barrel)
- `eval/cli.ts` — CLI entry point for eval

## packages/roles/src/
- `index.ts` — Barrel exports for all role cards + catalog
- `roleCatalog.ts` — DEFAULT_ROLES array (8 cards)
- `cards/*.ts` — Individual role card definitions

## packages/ui/src/
- `App.tsx` — Root component, state management, council round orchestration
- `AgoraBridge.ts` — TypeScript bridge interface to Electron IPC
- `IPCProvider.ts` — LLM provider that calls IPC instead of fetch
- `EmptyState.tsx` — Workspace picker with recent workspaces
- `RefPicker.tsx` — Document reference picker overlay
- `appStyles.ts` — App-level style constants
- `sessionExport.ts` — Session export markdown builder
- `theme/tokens.ts` — Color palette and design tokens
- `AppShell/` — Layout shell (TitleBar, AppShell)
- `Composer/` — Message input (Composer, composerStyles)
- `CouncilRoom/` — Message display (CouncilRoom)
- `ContextGraph/` — Context visualization
- `Inspector/` — Side panel (Inspector, inspectorStyles)
- `Settings/` — Settings modal (SettingsModal, settingsStyles)
- `RoleMessage/` — Individual role message display

## apps/desktop/src/
- `main/index.ts` — Electron main process, window creation, IPC registration
- `main/handlers/llm-config.ts` — LLM config IPC (get/save/clear/test)
- `main/handlers/llm-chat.ts` — LLM chat IPC (mock + real providers)
- `main/handlers/workspace.ts` — Workspace IPC (open/init/listDocs/readDoc/recent)
- `main/handlers/room.ts` — Room IPC (create/messages/summary/export)
- `main/handlers/safety.ts` — Path traversal, room ID sanitization, file type whitelist, input validation
- `main/handlers/audit.ts` — Structured JSONL audit log
- `main/handlers/sender.ts` — IPC sender validation (main window check)
- `preload/index.js` — Context bridge exposing IPC to renderer
- `renderer/main.tsx` — React entry point
