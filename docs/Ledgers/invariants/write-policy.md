# Write Policy Invariants

## Docs-Only Write Policy

Agora is a document assistant, not a code editor. Writes are restricted to document formats.

### Allowed Write Targets

1. **Room files** — `.agora/rooms/<roomId>/` subdirectory only
   - `room.json` (structured JSON)
   - `messages.jsonl` (append-only)
   - `context.md`, `summary.md`, `memory-candidates.md` (full write)
   - `exports/session.md` (full write)

2. **Workspace metadata** — `.agora/` directory
   - `BOOT.md` (created once on init)

3. **User config** — `userData/` directory
   - `llm-config.json` (structured JSON)
   - `recent-workspaces.json` (structured JSON)
   - `audit.jsonl` (append-only)

### Forbidden Write Targets

- Files outside the user's chosen workspace
- System directories
- Source code files (.ts, .tsx, .js, .py, .rs, etc.)
- Binary files
- Other users' workspaces

## Write Modes

| Mode | Used For | Example |
|---|---|---|
| Full overwrite | Short documents, configs | summary.md, room.json, BOOT.md |
| Append | Logs, message streams | messages.jsonl, audit.jsonl |
| Structured update | JSON config | llm-config.json (parse → modify → write) |

## Future: Patch/Diff Mode

For modifying existing user documents (e.g., appending to a decision log, updating a roadmap), a patch/diff mode should be added:

```
AI generates diff → user previews → apply patch
```

This is not needed for v1 since current writes target fixed internal files.

## Audit Trail

Every write operation is logged to `audit.jsonl` with:
- Timestamp
- Action name
- Target path
- Success/failure status
- Optional detail or error message

The audit log is append-only and never rotated in v1.
