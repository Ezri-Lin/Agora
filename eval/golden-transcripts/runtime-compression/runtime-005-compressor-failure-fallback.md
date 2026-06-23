# Runtime 005: Compressor Failure Fallback

## 元数据

- **Test ID**: runtime-005-compressor-failure-fallback
- **场景**: 压缩器失败时的 fallback
- **验证点**: 压缩失败时对话不中断，使用 fallback 上下文

## Input

```
Session ID: test-session-005
Mode: council
Token ratio: 0.85 (超过阈值)
Compressor behavior: throws error
```

## Expected Behavior

1. 压缩触发
2. 压缩器抛出错误
3. 控制器捕获错误
4. 返回 fallback 结果
5. 对话不中断
6. 上下文不被部分更新

## Expected Output

```json
{
  "testId": "runtime-005-compressor-failure-fallback",
  "compressed": false,
  "fallbackUsed": true,
  "conversationContinues": true,
  "contextMutated": false,
  "reason": "Compression failed: ..."
}
```
