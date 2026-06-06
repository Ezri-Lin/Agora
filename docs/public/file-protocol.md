# File Protocol

## Room Structure

```
.agora/rooms/{room-id}/
  room.json          — Room metadata and settings
  messages.jsonl     — One JSON object per line
  context.md         — Current context document
  summary.md         — Session summary
  memory-candidates.md — Proposed memory entries
  exports/
    session.md       — Full session export
```

## Message Format (JSONL)

```json
{
  "id": "msg_xxx",
  "roomId": "room_xxx",
  "senderType": "role",
  "senderId": "skeptic_critic",
  "content": "Message text...",
  "createdAt": "2026-06-07T00:00:00.000Z"
}
```

## Write Policy

**Allowed**: .md, .txt, .json, .jsonl, .yaml, .yml, .toml, .csv
**Blocked**: .ts, .tsx, .js, .py, .swift, .rs, .go, binary files
