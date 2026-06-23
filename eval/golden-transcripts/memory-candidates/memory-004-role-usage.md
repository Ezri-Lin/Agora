# Memory 004: Role Usage

## 元数据

- **Test ID**: memory-004-role-usage
- **场景**: 角色使用记忆
- **验证点**: 角色使用记忆只用于 routing，不进入事实记忆

## Input

```json
{
  "sessionId": "test-session-004",
  "summary": {
    "sessionId": "test-session-004",
    "decisions": [],
    "actionItems": [],
    "openQuestions": [],
    "keyInsights": [
      {
        "id": "insight-001",
        "insight": "Skeptic Critic 在技术讨论中表现活跃，经常提出有价值的问题",
        "confidence": "medium",
        "sourceMessageIds": ["msg-040", "msg-045"]
      }
    ],
    "roleStances": [
      {
        "roleId": "skeptic_critic",
        "roleName": "Skeptic Critic",
        "stance": "积极质疑技术方案",
        "confidence": "medium",
        "unresolvedConcerns": [],
        "sourceMessageIds": ["msg-040", "msg-045"]
      }
    ]
  }
}
```

## Expected Behavior

1. MemoryExtractor 从 summary 中提取角色使用信息
2. 类型为 "role_usage"
3. 作用域为 "role_usage"
4. 验证通过
5. 状态为 "candidate"

## Expected Output

```json
{
  "testId": "memory-004-role-usage",
  "candidates": [
    {
      "type": "role_usage",
      "scope": "role_usage",
      "content": "Skeptic Critic 在技术讨论中表现活跃，经常提出有价值的问题",
      "confidence": 0.7,
      "status": "candidate",
      "source": {
        "sessionId": "test-session-004",
        "messageIds": ["msg-040", "msg-045"]
      }
    }
  ],
  "rejected": [],
  "validationPassed": true
}
```
