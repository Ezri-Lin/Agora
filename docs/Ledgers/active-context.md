# Active Context

## Current Phase

Final overhaul complete — all engineering debt cleared, routing system fully wired end-to-end.

## What Just Happened

- **Kernel API cleanup**: `runCouncilRound` refactored from 11 positional params to `RunCouncilRoundInput` object. `CouncilRunResult` now exposes `routingDecision`.
- **Routing data flow**: Kernel's `suggestedPerspectives` wired through `FloatingCouncilPanel` → `SuggestedRolesSection` (dual-mode: kernel primary, tag-count fallback).
- **Dynamic RoleMessage metadata**: Hardcoded `ROLE_META` replaced with catalog-driven `roleMetaMap` (useMemo), stable hash colors via `getRoleColor()`.
- **Routing boundary tests**: 33 tests covering settings normalization, candidate recall, hard caps, AI rerank, explicit requests, adapter, backward compat.
- **Ledger sync**: code-map, ui-map, active-context, progress all updated.

## Architecture State

- Routing pipeline: routeRolesLocal → candidateRecall → applyHardCaps → RoleRoutingDecision
- UI data flow: App.lastRoutingDecision → FloatingCouncilPanel.suggestedPerspectives → SuggestedRolesSection
- Role metadata: roles[] prop → RoleMessage.roleMetaMap (useMemo) → stable hash colors
- Tests: 58 passing (33 routing boundary + 13 RoleRouter + 6 RouteRoles + 6 MemoryStore)

## Next Steps

- Memory review UI (accept/reject candidates via Inspector)
- Full end-to-end test with real LLM provider
- Consider export improvements (PDF, structured reports)
