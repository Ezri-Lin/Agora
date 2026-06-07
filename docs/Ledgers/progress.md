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
