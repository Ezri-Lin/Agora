# Runtime 004: Latest User Message Retained

## 元数据

- **Test ID**: runtime-004-latest-user-message-retained
- **场景**: 压缩后最新用户消息被保留
- **验证点**: 最新用户消息 raw 保留，且只出现一次

## Input

```
Session ID: test-session-004
Mode: council
Latest user message ID: msg-user-latest
Token ratio: 0.8 (超过阈值)
```

## Expected Behavior

1. 压缩触发
2. 最新用户消息不被压缩
3. 最新用户消息在结果中只出现一次
4. 最新用户消息保持 raw 格式

## Expected Output

```json
{
  "testId": "runtime-004-latest-user-message-retained",
  "compressed": true,
  "latestUserMessageRetained": true,
  "latestUserMessageId": "msg-user-latest",
  "latestUserMessageOccurrences": 1,
  "latestUserMessageFormat": "raw"
}
```
