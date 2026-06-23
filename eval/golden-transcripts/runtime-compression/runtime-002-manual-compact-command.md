# Runtime 002: Manual Compact Command

## 元数据

- **Test ID**: runtime-002-manual-compact-command
- **场景**: 用户手动触发 /compact 命令
- **验证点**: /compact 命令被正确处理，不进入 council fan-out

## Input

```
Session ID: test-session-002
Mode: council
User message: /compact
Token ratio: 0.45 (未超过阈值)
Message count: 20 (未超过阈值)
```

## Expected Behavior

1. CommandRouter 识别 /compact 命令
2. CompactCommand 执行压缩
3. requestedBy = user
4. executedBy = moderator (council mode)
5. 不进入 council fan-out
6. 返回压缩结果摘要

## Expected Output

```json
{
  "testId": "runtime-002-manual-compact-command",
  "commandHandled": true,
  "compressed": true,
  "fanOutSkipped": true,
  "requestedBy": {
    "type": "user",
    "command": "/compact"
  },
  "executedBy": {
    "type": "moderator",
    "roleId": "moderator"
  },
  "messageContains": "已压缩当前会话上下文"
}
```
