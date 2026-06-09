# Progress

## 2026-06-08

### V1 Completion
- **Systems Architect**: 5th core role card, type="architect", 10 architecture tags
- **Auto-invite**: Persona lenses with ≥2 tag matches guaranteed inclusion after moderator selection
- **Memory Store**: JSONL disk I/O at `.agora/memory/memories.jsonl`, load/save/updateStatus
- **Memory Extraction**: LLM extracts 0-3 durable insights per council round
- **Memory Injection**: Accepted memories loaded by topic keywords, injected into context
- **Memory IPC**: `room:getMemories` handler + preload bridge + AgoraBridge types
- **App Integration**: Memories loaded before round, extracted candidates written after round
- **Provider Updates**: Added "extract_memories" task to LLMProvider type + both providers

### Earlier Passes
- **Pass 5.1**: 8 persona seed pack role cards (4 Core Roles + 4 Persona Lenses)
- **Pass 5.2**: Minimal Model Settings UI (provider/model/baseUrl/API key/test connection)
- **Feature**: Auto-open last workspace + recent workspaces list
- **Refactoring**: All files under 300 lines, extracted style modules and utility functions
- **Ledger**: Created documentation system (constitution, maps, progress)
- **Security**: Full write-safety layer — path traversal protection, room ID sanitization, file type whitelist, input validation, sender validation, structured audit logging

### Verification
- `pnpm --filter @agora/kernel typecheck` — passes clean
- `pnpm --filter @agora/roles typecheck` — passes clean
- `pnpm --filter @agora/ui typecheck` — passes clean
- All handler files ≤160 lines

## 2026-06-09

### Routing Refactor (Phase 1-8)
- New routing pipeline: routeRolesLocal → candidateRecall → applyHardCaps → RoleRoutingDecision
- Weighted scoring: retrieval doc 0.45 + capability 0.20 + example 0.15 + tag 0.10 + explicit 0.30
- Hard caps: relevanceThreshold, round cap, new entrant cap, family cap, already_spoken
- AI rerank (optional): Top-N 30, validate/merge/fallback, modes: enabled/disabled/fallback_local
- Explicit requests: @mention and alias parsing (UX→design, Legal→legal_compliance, etc.)
- Legacy compat: selectRoles wrapper maps to old RoleSelectionResult shape

### P1-A: Suggested Perspectives → Composer Chip
- SuggestedRolesSection "Add" button → perspective chip in Composer
- Chips converted to ExplicitRoleRequest[] on send, consumed by routing
- PendingPerspectiveChip state management, cleared on send

### P2-A: Rich Chat Bubble
- RoleMessage: timestamp, graphSummary badge, thinking block with char count + markdown
- CopyButton for message content

### P2-B: Room Mode Tabs
- RoomModeTabs: Single/Council mode switch with role count indicator
- Mode description hints (EN/CN)
- Ctrl+` keyboard shortcut for terminal toggle

### P2-C: Terminal Panel
- TerminalPanel: xterm.js + PTY integration
- Resizable drag handle (4px zone, 100px–60vh, default 250px)
- State-based height, body cursor override during drag

### Final Overhaul
- **Desktop dependency fix**: Added `@agora/ui` workspace dependency, 9/9 typecheck
- **Kernel API cleanup**: runCouncilRound 11 positional → RunCouncilRoundInput object, routingDecision exposed
- **Routing data flow**: lastRoutingDecision → FloatingCouncilPanel → SuggestedRolesSection (dual-mode)
- **Dynamic RoleMessage metadata**: Catalog-driven roleMetaMap with stable hash colors via getRoleColor()
- **Routing boundary tests**: 33 tests (settings normalization, candidate recall, hard caps, AI rerank, explicit requests, adapter, backward compat)
- **Ledger sync**: code-map, ui-map, active-context, progress updated

### Final Verification
- `pnpm -r run typecheck` — 9/9 packages pass
- `pnpm --filter @agora/kernel test` — 58/58 tests pass
- All files ≤291 lines (RoleMessage.tsx largest)
