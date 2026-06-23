# Session 003: Pre-mortem

## 元数据

- **Session ID**: session-003-premortem
- **场景**: 失败预演
- **角色**: Moderator, Risk Analyst, Skeptic Critic, Historian
- **轮次**: 3 轮
- **消息数**: 22 条
- **主要验证点**: risk extraction, rollback plan capture, mitigation strategy retention

## Transcript

### Round 1: 假设失败

**User**: 假设 Context Substrate 项目失败了，可能的原因是什么？

**Moderator**: 收到。让我们进行失败预演。请 Risk Analyst 先分析。

**Risk Analyst**: 基于历史案例，可能的失败原因：
1. **压缩质量差**：丢失关键决策，导致后续讨论基于错误信息
2. **性能问题**：压缩太慢，影响用户体验
3. **成本过高**：LLM 调用太多，超出预算
4. **用户不接受**：用户不信任压缩结果，要求查看原始 transcript

**Skeptic Critic**: 我补充：
5. **schema 过度设计**：schema 太复杂，实现和维护成本高
6. **边界情况**：特殊会话类型（如技术讨论、创意讨论）压缩效果差

**Historian**: 从历史看，类似的失败案例：
- Google Wave：功能太多，用户不理解
- Slack Threads：用户不习惯线程化讨论
- Notion AI：压缩质量差，用户抱怨丢失信息

### Round 2: 影响分析

**Moderator**: 让我们分析每个失败原因的影响。

**Risk Analyst**: 影响分析：
1. **压缩质量差**：高影响 - 用户流失，产品口碑下降
2. **性能问题**：中影响 - 用户体验差，但可优化
3. **成本过高**：高影响 - 商业模式不可持续
4. **用户不接受**：高影响 - 功能无用，浪费开发资源
5. **schema 过度设计**：中影响 - 开发周期延长，但可简化
6. **边界情况**：低影响 - 可通过配置和提示词优化

**Skeptic Critic**: 最严重的是 1 和 4。如果用户不信任压缩结果，整个功能就废了。

**Historian**: 同意。Notion AI 的教训是：压缩必须保留关键信息，否则用户会关闭功能。

### Round 3: 缓解策略

**Moderator**: 让我们制定缓解策略。

**Risk Analyst**: 缓解策略：
1. **压缩质量差**：
   - 建立 golden transcript eval
   - 保留决策、行动项、未解决问题
   - 提供"查看原始 transcript"选项

2. **性能问题**：
   - 异步压缩，不阻塞用户输入
   - 缓存压缩结果
   - 监控压缩耗时

3. **成本过高**：
   - 设置压缩频率上限
   - 使用更便宜的模型做压缩
   - 监控 LLM 调用成本

4. **用户不接受**：
   - 提供压缩透明度（显示保留了什么）
   - 允许用户手动触发压缩
   - 提供回滚选项

5. **schema 过度设计**：
   - v1 使用最简 schema
   - 迭代优化，不追求完美

6. **边界情况**：
   - 为不同会话类型提供不同压缩策略
   - 允许用户配置保留规则

**Skeptic Critic**: 最关键的是：压缩结果必须可审计，保留原始引用。

**Historian**: 同意。历史表明，透明度是用户信任的关键。

**User**: 好的，这些缓解策略需要写入 spec。

## 预期提取结果

### Decisions

1. **压缩透明度**
   - Statement: 提供压缩透明度，显示保留了什么
   - Rationale: 透明度是用户信任的关键
   - DecidedBy: council
   - Status: accepted

2. **回滚选项**
   - Statement: 提供回滚选项
   - Rationale: 用户不信任压缩结果时可以回滚
   - DecidedBy: council
   - Status: accepted

3. **压缩频率上限**
   - Statement: 设置压缩频率上限
   - Rationale: 控制 LLM 调用成本
   - DecidedBy: Risk Analyst
   - Status: accepted

4. **最简 schema**
   - Statement: v1 使用最简 schema
   - Rationale: 避免过度设计
   - DecidedBy: council
   - Status: accepted

### Action Items

1. **建立 golden transcript eval**
   - Text: 建立 golden transcript eval 验证压缩质量
   - Owner: Risk Analyst
   - Status: open

2. **提供"查看原始 transcript"选项**
   - Text: 提供"查看原始 transcript"选项
   - Owner: Skeptic Critic
   - Status: open

3. **异步压缩实现**
   - Text: 异步压缩，不阻塞用户输入
   - Owner: Implementation Reviewer
   - Status: open

4. **监控 LLM 调用成本**
   - Text: 监控 LLM 调用成本
   - Owner: Risk Analyst
   - Status: open

### Open Questions

1. **压缩模型选择**
   - Question: 使用哪个模型做压缩？便宜模型还是高质量模型？
   - Blocking: true

2. **压缩频率上限**
   - Question: 压缩频率上限设置为多少？
   - Blocking: false

### Key Insights

1. **用户信任**
   - Insight: 透明度是用户信任的关键
   - Confidence: high
   - Source: Notion AI 案例

2. **成本控制**
   - Insight: 频繁压缩会增加 LLM 调用成本
   - Confidence: medium
   - Source: 商业模式分析

3. **历史教训**
   - Insight: 类似功能失败的原因多是质量差或用户不接受
   - Confidence: high
   - Source: Google Wave, Slack Threads, Notion AI

### Role Stances

1. **Risk Analyst**
   - Stance: 积极分析风险，提供缓解策略
   - Confidence: high
   - Unresolved: 压缩模型选择

2. **Skeptic Critic**
   - Stance: 强调透明度和可审计性
   - Confidence: high
   - Unresolved: 无

3. **Historian**
   - Stance: 引用历史案例，支持缓解策略
   - Confidence: medium
   - Unresolved: 无

### Evidence Refs

- Google Wave 案例
- Slack Threads 案例
- Notion AI 案例

### Raw Transcript Refs

- session-003-premortem.md
