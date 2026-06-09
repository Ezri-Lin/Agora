# Code Map

## packages/shared/src/
- `types.ts` — Core types: Room, CouncilMessage, RoleCard, LLMConfig, SourceRef, MemoryCandidate, routing types (RoleRoutingSettings, RoleRoutingDecision, SuggestedPerspective, AIRoleScore, ExplicitRoleRequest, CandidateRecallResult)
- `utils.ts` — generateId, nowISO
- `ids.ts` — generateId
- `time.ts` — nowISO
- `result.ts` — ok/err Result type
- `paths.ts` — roomsDir, roomDir, memoryDir
- `summary.ts` — extractGraphSummary, firstMeaningfulSentence, buildPreview

## packages/kernel/src/
- `index.ts` — Barrel exports (runCouncilRound, RunCouncilRoundInput, ContextPack, MemoryStore, extractMemories, selectRoles, scoreRole, createProvider, buildContextPack, buildModeratorContextPack)
- `council/CouncilRunner.ts` — Orchestrates multi-role council rounds: dual-layer context → moderator analysis → role selection → role responses (concurrent, streaming, abort) → cross-examination → summary → memory extraction. Returns CouncilRunResult with routingDecision.
- `context/ContextPack.ts` — Builds role context with doc budgeting
- `context/ModeratorContextPack.ts` — Moderator-specific full-context assembly
- `context/extractExcerpt.ts` — Extracts relevant excerpts from docs
- `context/promptContracts.ts` — Prompt templates for moderator/roles/cross-examination
- `context/tokenBudget.ts` — Token budget allocation per context mode
- `routing/routeRoles.ts` — Route orchestrator: routeRolesLocal (sync), routeRoles (async with AI rerank), selectRoles (legacy compat wrapper)
- `routing/candidateRecall.ts` — Weighted scoring: retrieval doc 0.45 + capability 0.20 + example 0.15 + tag 0.10 + explicit 0.30, diversity bonus, recency/already-spoken penalty
- `routing/applyRoleCaps.ts` — Hard caps: relevanceThreshold, round cap, new entrant cap, family cap, already_spoken policy. Produces activeEntrants + suggestedPerspectives
- `routing/explicitRequests.ts` — @mention and alias parsing (UX→design, Legal→legal_compliance, etc.)
- `routing/aiRoleRerank.ts` — Optional AI rerank (Top-N 30, validate/merge/fallback), modes: enabled/disabled/fallback_local
- `routing/roleCardToPersona.ts` — RoleCard → RolePersona adapter (domain inference from tags/type)
- `routing/RoleRouter.ts` — Legacy sync routing (critic-priority, tag-matching, auto-invite lenses)
- `memory/MemoryStore.ts` — JSONL disk I/O for memory candidates
- `memory/MemoryExtractor.ts` — LLM-based extraction of durable insights
- `llm/OpenAICompatibleProvider.ts` — OpenAI-compatible API client
- `llm/MockMultiCallProvider.ts` — Mock provider for dev/testing
- `llm/createProvider.ts` — Provider factory
- `eval/runEval.ts` — CLI evaluation runner (baseline vs council comparison)
- `eval/cli.ts` — CLI entry point for eval
- `__tests__/RoutingBoundary.test.ts` — 33 boundary tests: settings normalization, candidate recall, hard caps, AI rerank, explicit requests, adapter, backward compat

## packages/roles/src/
- `index.ts` — Barrel exports for all role cards + catalog
- `roleCatalog.ts` — DEFAULT_ROLES array (5 core + 13 lenses/personas)
- `domains.ts` — 8 built-in domains
- `families.ts` — 13 built-in families
- `personas.ts` — 20 built-in personas
- `cards/moderator.ts` — Moderator role card
- `cards/skepticCritic.ts` — Skeptic/Critic core role
- `cards/historian.ts` — Historian core role
- `cards/productStrategist.ts` — Product Strategist core role
- `cards/systemsArchitect.ts` — Systems Architect core role
- `cards/jobsProductTasteLens.ts` — Jobs persona lens
- `cards/buffettBusinessLens.ts` — Buffett persona lens
- `cards/mungerMentalModelsLens.ts` — Munger persona lens
- `cards/growthMarketerLens.ts` — Growth Marketer persona lens

## packages/adapters/vault/src/
- `index.ts` — Barrel exports
- `filePolicy.ts` — Docs-only write policy (allowed/blocked extensions)
- `writeDocSafe.ts` — Safe document writer with policy checks
- `scanWorkspace.ts` — Workspace scanner
- `readDoc.ts` — Document reader

## packages/adapters/argus/src/
- `index.ts` — Argus adapter (reserved, not implemented in MVP)

## packages/ui/src/
- `App.tsx` — Root component, state management, council round orchestration, memory injection, routing decision binding
- `AgoraBridge.ts` — TypeScript bridge interface to Electron IPC
- `IPCProvider.ts` — LLM provider that calls IPC instead of fetch
- `EmptyState.tsx` — Workspace picker with recent workspaces
- `RefPicker.tsx` — Document reference picker overlay
- `appStyles.ts` — App-level style constants
- `sessionExport.ts` — Session export markdown builder
- `theme/palettes.ts` — Color palettes (dark/light), getRoleColor (stable hash + known map)
- `theme/ThemeContext.tsx` — Theme provider
- `i18n/translations.ts` — EN/CN translation strings
- `i18n/I18nContext.tsx` — i18n provider
- `AppShell/AppShell.tsx` — Layout shell (TitleBar, Ctrl+` terminal toggle, RoomModeTabs integration)
- `Composer/Composer.tsx` — Message input with ref chips + perspective chips, send button
- `CouncilRoom/CouncilRoom.tsx` — Message thread with roles prop, expansion management, jump-to-message
- `ContextGraph/ContextGraph.tsx` — Force-directed context visualization
- `Inspector/` — Side panel (Inspector, inspectorStyles)
- `Settings/SettingsModal.tsx` — Provider/model/API key settings
- `RoleMessage/RoleMessage.tsx` — Individual role message display, catalog-driven meta via roleMetaMap with stable hash colors
- `FloatingPanel/FloatingCouncilPanel.tsx` — Right-side panel: active roles, suggested perspectives, sources, outputs, memory
- `FloatingPanel/SuggestedRolesSection.tsx` — Dual-mode suggestions: kernel routing primary, tag-count fallback
- `FloatingPanel/ProgressSection.tsx` — Role progress indicators
- `FloatingPanel/AccordionSection.tsx` — Collapsible section
- `FloatingPanel/RoleCardItem.tsx` — Role card in panel
- `Terminal/TerminalPanel.tsx` — xterm.js + PTY, resizable drag handle (100px–60vh, default 250px)
- `RoomMode/RoomModeTabs.tsx` — Single/Council mode tabs with role count indicator and mode hints
- `ChatBubble/MessageContent.tsx` — Markdown renderer for message content
- `ChatBubble/CopyButton.tsx` — Copy-to-clipboard button

## apps/desktop/src/
- `main/index.ts` — Electron main process, window creation, IPC registration
- `main/handlers/llm-config.ts` — LLM config IPC (get/save/clear/test)
- `main/handlers/llm-chat.ts` — LLM chat IPC (mock + real providers)
- `main/handlers/workspace.ts` — Workspace IPC (open/init/listDocs/readDoc/recent)
- `main/handlers/room.ts` — Room IPC (create/messages/summary/export/memories)
- `main/handlers/safety.ts` — Path traversal, room ID sanitization, file type whitelist, input validation
- `main/handlers/audit.ts` — Structured JSONL audit log
- `main/handlers/sender.ts` — IPC sender validation (main window check)
- `preload/index.js` — Context bridge exposing IPC to renderer
- `renderer/main.tsx` — React entry point
