# Memory 002: Project Decision

## 元数据

- **Test ID**: memory-002-project-decision
- **场景**: 项目决策
- **验证点**: 高置信度项目决策可以被自动接受

## Input

```json
{
  "sessionId": "test-session-002",
  "summary": {
    "sessionId": "test-session-002",
    "decisions": [
      {
        "id": "decision-001",
        "statement": "使用 TypeScript 作为主要开发语言",
        "decidedBy": "council",
        "status": "accepted",
        "sourceMessageIds": ["msg-020", "msg-025"]
      }
    ],
    "actionItems": [],
    "openQuestions": [],
    "keyInsights": [],
    "roleStances": []
  }
}
```

## Expected Behavior

1. MemoryExtractor 从 summary 中提取项目决策
2. 类型为 "decision"
3. 作用域为 "project"
4. 置信度 >= 0.9（council accepted）
5. 验证通过
6. 状态为 "accepted"（自动接受）

## Expected Output

```json
{
  "testId": "memory-002-project-decision",
  "candidates": [
    {
      "type": "decision",
      "scope": "project",
      "content": "使用 TypeScript 作为主要开发语言",
      "confidence": 0.95,
      "status": "accepted",
      "source": {
        "sessionId": "test-session-002",
        "messageIds": ["msg-020", "msg-025"]
      }
    }
  ],
  "rejected": [],
  "validationPassed": true
}
```
