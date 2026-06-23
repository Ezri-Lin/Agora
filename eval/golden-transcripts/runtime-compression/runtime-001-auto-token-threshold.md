# Runtime 001: Auto Token Threshold

## 元数据

- **Test ID**: runtime-001-auto-token-threshold
- **场景**: 自动触发压缩（token 超阈值）
- **验证点**: token 超阈值时自动触发压缩，由 moderator 执行

## Input

```
Session ID: test-session-001
Mode: council
Moderator ID: moderator
Token ratio: 0.85 (超过 0.7 阈值)
Message count: 30 (未超过 50 阈值)
Elapsed time: 10 min (未超过 30 min 阈值)
Messages since last compression: 15 (超过 10 cooldown)
```

## Expected Behavior

1. ContextCompressionController 检查触发条件
2. token ratio 0.85 > 0.7，触发自动压缩
3. executedBy = moderator (council mode)
4. 压缩完成，返回 ConversationSummaryV1
5. 保留最近 8 条原始消息
6. 保留最新用户消息 raw

## Expected Output

```json
{
  "testId": "runtime-001-auto-token-threshold",
  "compressed": true,
  "requestedBy": {
    "type": "system",
    "reason": "token_budget"
  },
  "executedBy": {
    "type": "moderator",
    "roleId": "moderator"
  },
  "triggerReason": "token_budget",
  "tokenRatio": 0.85,
  "retainedRecentMessageCount": 8,
  "latestUserMessageRetained": true,
  "latestUserMessageOccurrences": 1
}
```
