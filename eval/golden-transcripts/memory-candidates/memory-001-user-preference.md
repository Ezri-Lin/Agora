# Memory 001: User Preference

## 元数据

- **Test ID**: memory-001-user-preference
- **场景**: 用户明确表达偏好
- **验证点**: 高置信度用户偏好可以被接受

## Input

```json
{
  "sessionId": "test-session-001",
  "summary": {
    "sessionId": "test-session-001",
    "decisions": [],
    "actionItems": [],
    "openQuestions": [],
    "keyInsights": [
      {
        "id": "insight-001",
        "insight": "用户明确表示偏好简洁的代码风格，不喜欢过多的注释",
        "confidence": "high",
        "sourceMessageIds": ["msg-010"]
      }
    ],
    "roleStances": []
  }
}
```

## Expected Behavior

1. MemoryExtractor 从 summary 中提取用户偏好
2. 类型为 "preference"
3. 置信度 >= 0.8（用户明确表达）
4. 验证通过
5. 状态为 "candidate"（需要用户确认）

## Expected Output

```json
{
  "testId": "memory-001-user-preference",
  "candidates": [
    {
      "type": "preference",
      "scope": "project",
      "content": "用户偏好简洁的代码风格，不喜欢过多的注释",
      "confidence": 0.9,
      "status": "candidate",
      "source": {
        "sessionId": "test-session-001",
        "messageIds": ["msg-010"]
      }
    }
  ],
  "rejected": [],
  "validationPassed": true
}
```
