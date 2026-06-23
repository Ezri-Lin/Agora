# Runtime 003: Role Cannot Trigger

## 元数据

- **Test ID**: runtime-003-role-cannot-trigger
- **场景**: 普通角色尝试触发压缩
- **验证点**: 普通角色不能执行压缩，只能 suggest

## Input

```
Session ID: test-session-003
Mode: council
Requested by: role (skeptic_critic)
Executed by: role (skeptic_critic)
Token ratio: 0.85 (超过阈值)
```

## Expected Behavior

1. ContextCompressionController 检查执行权限
2. executedBy = role (skeptic_critic)
3. council mode 要求 executedBy = moderator
4. 权限检查失败，拒绝执行
5. 返回压缩未执行

## Expected Output

```json
{
  "testId": "runtime-003-role-cannot-trigger",
  "compressed": false,
  "rejected": true,
  "reason": "Executor not allowed: role cannot execute compression in council mode",
  "contextMutated": false
}
```
