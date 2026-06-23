# Memory 005: Reject Unsupported

## 元数据

- **Test ID**: memory-005-reject-unsupported
- **场景**: 无 source 的记忆候选
- **验证点**: 无 source 的候选必须被拒绝

## Input

```json
{
  "sessionId": "test-session-005",
  "summary": {
    "sessionId": "test-session-005",
    "decisions": [],
    "actionItems": [],
    "openQuestions": [],
    "keyInsights": [
      {
        "id": "insight-001",
        "insight": "这个方案不可行",
        "confidence": "low",
        "sourceMessageIds": []
      }
    ],
    "roleStances": []
  }
}
```

## Expected Behavior

1. MemoryExtractor 从 summary 中提取洞察
2. 类型为 "insight"
3. sourceMessageIds 为空
4. 验证失败
5. 被拒绝

## Expected Output

```json
{
  "testId": "memory-005-reject-unsupported",
  "candidates": [],
  "rejected": [
    {
      "content": "这个方案不可行",
      "reason": "source.messageIds must not be empty"
    }
  ],
  "validationPassed": false
}
```
