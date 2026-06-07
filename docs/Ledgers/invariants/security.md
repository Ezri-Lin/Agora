# Security Invariants

## API Key Handling
- API key is NEVER persisted to disk
- API key is held in `sessionApiKey` memory variable only
- Renderer can SET a key but NEVER read it back
- Main process returns `{ hasApiKey, maskedKey, source }` — never the raw key

## File Access Boundaries
- All file paths MUST be validated with `assertInWorkspace(resolved, workspaceRoot)`
- Room IDs MUST match `/^[a-zA-Z0-9_-]+$/`
- Read operations MUST check file extension against whitelist
- No handler may read/write outside the user's chosen workspace

## IPC Security
- All write handlers MUST call `assertSenderIsMain(e)`
- Only the main window's webContents may invoke file-modifying IPC
- Preload bridge is a transparent pass-through — validation happens in main process

## Write Policy
- Room writes target fixed filenames only (room.json, messages.jsonl, summary.md, etc.)
- Config writes go to `userData/llm-config.json` only
- No arbitrary path writes from renderer input
- All write operations logged to `audit.jsonl`

## Allowed File Extensions
`.md`, `.txt`, `.json`, `.jsonl`, `.yaml`, `.yml`, `.toml`
