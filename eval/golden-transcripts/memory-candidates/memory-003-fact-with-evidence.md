# Memory 003: Fact with Evidence

## 元数据

- **Test ID**: memory-003-fact-with-evidence
- **场景**: 有证据支持的事实
- **验证点**: 有证据的事实可以被接受

## Input

```json
{
  "sessionId": "test-session-003",
  "summary": {
    "sessionId": "test-session-003",
    "decisions": [],
    "actionItems": [],
    "openQuestions": [],
    "keyInsights": [
      {
        "id": "insight-001",
        "insight": "根据 Anthropic 研究，记忆系统可以减少 60% 的重复问题",
        "confidence": "high",
        "sourceMessageIds": ["msg-030"]
      }
    ],
    "roleStances": [],
    "evidenceRefs": ["https://anthropic.com/research/memory"]
  }
}
```

## Expected Behavior

1. MemoryExtractor 从 summary 中提取事实
2. 类型为 "fact"
3. 有 evidenceRefs 支持
4. 置信度 >= 0.95
5. 验证通过
6. 状态为 "accepted"（自动接受）

## Expected Output

```json
{
  "testId": "memory-003-fact-with-evidence",
  "candidates": [
    {
      "type": "fact",
      "scope": "global",
      "content": "根据 Anthropic 研究，记忆系统可以减少 60% 的重复问题",
      "confidence": 0.95,
      "status": "accepted",
      "source": {
        "sessionId": "test-session-003",
        "messageIds": ["msg-030"],
        "evidenceRefs": ["https://anthropic.com/research/memory"]
      }
    }
  ],
  "rejected": [],
  "validationPassed": true
}
```
