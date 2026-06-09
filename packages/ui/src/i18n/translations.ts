export type Locale = "en" | "zh";

export interface Translations {
  // App
  appTitle: string;
  councilRoom: string;

  // Empty State
  openWorkspace: string;
  recentWorkspaces: string;
  noRecentWorkspaces: string;

  // Composer
  sendMessage: string;
  addReference: string;
  removeReference: string;

  // Inspector
  participants: string;
  references: string;
  outputs: string;
  context: string;
  memories: string;
  roles: string;

  // Participants
  noRolesActive: string;

  // References
  noReferences: string;

  // Outputs
  noOutputs: string;

  // Context
  noContextData: string;
  moderator: string;
  status: string;
  overflow: string;
  full: string;
  docsIncluded: string;
  totalChars: string;
  roles_: string;
  contextMode: string;
  truncatedDocs: string;

  // Memories
  noMemories: string;
  pending: string;
  accepted: string;
  rejected: string;
  accept: string;
  reject: string;
  openWorkspaceToView: string;

  // Custom Roles
  noCustomRoles: string;
  newRole: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: string;
  tags: string;
  systemPrompt: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  openWorkspaceToManage: string;

  // Role Types
  critic: string;
  historian: string;
  strategist: string;
  architect: string;
  lens: string;

  // Room List
  rooms: string;
  noRooms: string;

  // Loading
  loading: string;
  preparingContext: string;
  callingProvider: string;
  buildingMessages: string;

  // Error
  error: string;

  // Settings
  settings: string;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  testConnection: string;
  saveSettings: string;
  clearApiKey: string;

  // Session Export
  sessionExport: string;
  topic: string;
  roomId: string;
  date: string;
  references_: string;
  contextStats: string;
  userMessages: string;
  roleResponses: string;
  crossExamination: string;
  failedRoles: string;
  moderatorSummary: string;

  // Additional UI
  appSubtitle: string;
  darkMode: string;
  lightMode: string;
  localFirst: string;
  docsOnly: string;
  modelSettings: string;
  sendMessagePlaceholder: string;
  maxMsgsPerRole: string;
  autoDocs: string;
  crossExam: string;
  on_: string;
  sendToStart: string;
  rolesAreThinking: string;
  thinking: string;
  contextGraph: string;
  stop: string;
  addReferenceTitle: string;
  noDocumentsFound: string;
  mockTesting: string;
  openaiCompatible: string;
  show: string;
  hide: string;
  advanced: string;
  timeout: string;
  maxOutputTokens_: string;
  noKeyConfigured: string;
  usingEnvVar: string;
  sessionKey: string;
  saved_: string;
  saving: string;
  testing: string;
  connected: string;
  failed_: string;
  expandGraph: string;
  collapseGraph: string;
  councilMonitor: string;
  roleThinking: string;
  roleStreaming: string;
  roleDone: string;
  roleError: string;
  elapsed: string;
  jumpToLatest: string;
  inviteNextRound: string;
  suggestedPerspectives: string;
  addPerspective: string;
  expand: string;
  collapse: string;

  // Floating Panel — Role Selection
  stopTurn: string;
  removeFromRoom: string;
  roleHistory: string;
  activeRoles: string;
  suggestedRoles: string;
  sources: string;
  outputs_: string;
  memory_: string;
  autoInvited: string;
  manualInvite: string;
  roundHistory: string;
  noHistory: string;
  jumpToMessage: string;
  tagsMatched: string;
  budgetExhausted: string;
  belowThreshold: string;
  roundStopped: string;
  roundError: string;

  // Room Mode
  singleMode: string;
  councilMode: string;
  modeOnlyAffectsNext: string;
  singleModeHint: string;
  councilModeHint: string;

  // Terminal
  terminal: string;
  closeTerminal: string;
}

export const en: Translations = {
  appTitle: "Agora",
  councilRoom: "Council Room",
  openWorkspace: "Open Workspace",
  recentWorkspaces: "Recent Workspaces",
  noRecentWorkspaces: "No recent workspaces",
  sendMessage: "Send",
  addReference: "+ Add Reference",
  removeReference: "Remove",
  participants: "Participants",
  references: "References",
  outputs: "Outputs",
  context: "Context",
  memories: "Memories",
  roles: "Roles",
  noRolesActive: "No roles active",
  noReferences: "No references selected",
  noOutputs: "No outputs generated",
  noContextData: "No context data yet. Send a message first.",
  moderator: "Moderator",
  status: "Status",
  overflow: "OVERFLOW",
  full: "Full",
  docsIncluded: "Docs included",
  totalChars: "Total chars",
  roles_: "Roles",
  contextMode: "Context mode",
  truncatedDocs: "Truncated docs",
  noMemories: "No memories yet",
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  accept: "Accept",
  reject: "Reject",
  openWorkspaceToView: "Open a workspace to view memories",
  noCustomRoles: "No custom roles",
  newRole: "+ New Role",
  name: "Name",
  nameCN: "Name (CN)",
  subtitle: "Subtitle",
  type: "Type",
  tags: "Tags (comma-separated)",
  systemPrompt: "System Prompt",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  delete: "Delete",
  openWorkspaceToManage: "Open a workspace to manage roles",
  critic: "Critic",
  historian: "Historian",
  strategist: "Strategist",
  architect: "Architect",
  lens: "Lens",
  rooms: "Rooms",
  noRooms: "No rooms yet",
  loading: "Loading...",
  preparingContext: "Preparing context...",
  callingProvider: "Calling provider...",
  buildingMessages: "Building messages...",
  error: "Error",
  settings: "Settings",
  provider: "Provider",
  model: "Model",
  baseUrl: "Base URL",
  apiKey: "API Key",
  testConnection: "Test Connection",
  saveSettings: "Save",
  clearApiKey: "Clear API Key",
  sessionExport: "Session Export",
  topic: "Topic",
  roomId: "Room ID",
  date: "Date",
  references_: "References",
  contextStats: "Context Stats",
  userMessages: "User Messages",
  roleResponses: "Role Responses",
  crossExamination: "Cross-Examination",
  failedRoles: "Failed Roles",
  moderatorSummary: "Moderator Summary",
  appSubtitle: "Local-first, memory-aware council room",
  darkMode: "Dark",
  lightMode: "Light",
  localFirst: "Local-first",
  docsOnly: "Docs-only",
  modelSettings: "Model Settings",
  sendMessagePlaceholder: "Send a message to the council...",
  maxMsgsPerRole: "Max msgs/role",
  autoDocs: "Auto docs",
  crossExam: "Cross exam",
  on_: "On",
  sendToStart: "Send a message to start the council discussion",
  rolesAreThinking: "Roles are thinking...",
  thinking: "Thinking",
  contextGraph: "Context Graph",
  stop: "Stop",
  addReferenceTitle: "Add Reference",
  noDocumentsFound: "No documents found",
  mockTesting: "Mock (testing)",
  openaiCompatible: "OpenAI Compatible",
  show: "Show",
  hide: "Hide",
  advanced: "Advanced",
  timeout: "Timeout (ms)",
  maxOutputTokens_: "Max Output Tokens",
  noKeyConfigured: "No key configured",
  usingEnvVar: "Using env var",
  sessionKey: "Session key",
  saved_: "Saved",
  saving: "Saving...",
  testing: "Testing...",
  connected: "Connected",
  failed_: "Failed:",
  expandGraph: "Expand",
  collapseGraph: "Collapse",
  councilMonitor: "Council Monitor",
  roleThinking: "Thinking",
  roleStreaming: "Generating",
  roleDone: "Done",
  roleError: "Error",
  elapsed: "elapsed",
  jumpToLatest: "Jump to latest",
  inviteNextRound: "Invite next round",
  suggestedPerspectives: "Suggested perspectives",
  addPerspective: "Add",
  expand: "Expand",
  collapse: "Collapse",
  stopTurn: "Stop turn",
  removeFromRoom: "Remove from room",
  roleHistory: "History",
  activeRoles: "Active roles",
  suggestedRoles: "Suggested roles",
  sources: "Sources",
  outputs_: "Outputs",
  memory_: "Memory",
  autoInvited: "Auto-invited",
  manualInvite: "Manual invite",
  roundHistory: "Round history",
  noHistory: "No history yet",
  jumpToMessage: "Jump to message",
  tagsMatched: "tags matched",
  budgetExhausted: "Budget exhausted",
  belowThreshold: "Below threshold",
  roundStopped: "Stopped",
  roundError: "Error",
  singleMode: "Single",
  councilMode: "Council",
  modeOnlyAffectsNext: "Only affects next reply",
  singleModeHint: "One role, no cross-examination",
  councilModeHint: "Multiple roles, cross-examination",
  terminal: "Terminal",
  closeTerminal: "Close terminal",
};

export const zh: Translations = {
  appTitle: "Agora",
  councilRoom: "议事厅",
  openWorkspace: "打开工作区",
  recentWorkspaces: "最近的工作区",
  noRecentWorkspaces: "暂无最近的工作区",
  sendMessage: "发送",
  addReference: "+ 添加引用",
  removeReference: "移除",
  participants: "参与者",
  references: "引用",
  outputs: "输出",
  context: "上下文",
  memories: "记忆",
  roles: "角色",
  noRolesActive: "暂无活跃角色",
  noReferences: "暂无选中的引用",
  noOutputs: "暂无生成的输出",
  noContextData: "暂无上下文数据，请先发送消息。",
  moderator: "主持人",
  status: "状态",
  overflow: "溢出",
  full: "完整",
  docsIncluded: "包含文档数",
  totalChars: "总字符数",
  roles_: "角色",
  contextMode: "上下文模式",
  truncatedDocs: "截断文档数",
  noMemories: "暂无记忆",
  pending: "待审核",
  accepted: "已接受",
  rejected: "已拒绝",
  accept: "接受",
  reject: "拒绝",
  openWorkspaceToView: "打开工作区以查看记忆",
  noCustomRoles: "暂无自定义角色",
  newRole: "+ 新建角色",
  name: "名称",
  nameCN: "中文名称",
  subtitle: "副标题",
  type: "类型",
  tags: "标签（逗号分隔）",
  systemPrompt: "系统提示词",
  save: "保存",
  cancel: "取消",
  edit: "编辑",
  delete: "删除",
  openWorkspaceToManage: "打开工作区以管理角色",
  critic: "批评者",
  historian: "历史学家",
  strategist: "策略师",
  architect: "架构师",
  lens: "视角",
  rooms: "房间",
  noRooms: "暂无房间",
  loading: "加载中...",
  preparingContext: "准备上下文...",
  callingProvider: "调用模型中...",
  buildingMessages: "构建消息中...",
  error: "错误",
  settings: "设置",
  provider: "提供商",
  model: "模型",
  baseUrl: "API 地址",
  apiKey: "API 密钥",
  testConnection: "测试连接",
  saveSettings: "保存",
  clearApiKey: "清除密钥",
  sessionExport: "会话导出",
  topic: "主题",
  roomId: "房间 ID",
  date: "日期",
  references_: "引用",
  contextStats: "上下文统计",
  userMessages: "用户消息",
  roleResponses: "角色回应",
  crossExamination: "交叉审查",
  failedRoles: "失败的角色",
  moderatorSummary: "主持人总结",
  appSubtitle: "本地优先、记忆感知的议事厅",
  darkMode: "深色",
  lightMode: "浅色",
  localFirst: "本地优先",
  docsOnly: "文档模式",
  modelSettings: "模型设置",
  sendMessagePlaceholder: "向议事厅发送消息...",
  maxMsgsPerRole: "每角色最大消息数",
  autoDocs: "自动文档",
  crossExam: "交叉审查",
  on_: "开启",
  sendToStart: "发送消息开始议事讨论",
  rolesAreThinking: "角色们正在思考...",
  thinking: "思考过程",
  contextGraph: "上下文图谱",
  stop: "停止",
  addReferenceTitle: "添加引用",
  noDocumentsFound: "未找到文档",
  mockTesting: "模拟（测试）",
  openaiCompatible: "OpenAI 兼容",
  show: "显示",
  hide: "隐藏",
  advanced: "高级",
  timeout: "超时（毫秒）",
  maxOutputTokens_: "最大输出 Token",
  noKeyConfigured: "未配置密钥",
  usingEnvVar: "使用环境变量",
  sessionKey: "会话密钥",
  saved_: "已保存",
  saving: "保存中...",
  testing: "测试中...",
  connected: "已连接",
  failed_: "失败：",
  expandGraph: "展开",
  collapseGraph: "收起",
  councilMonitor: "议事监控",
  roleThinking: "思考中",
  roleStreaming: "生成中",
  roleDone: "完成",
  roleError: "出错",
  elapsed: "已用时",
  jumpToLatest: "跳到最新",
  inviteNextRound: "邀请下轮参与",
  suggestedPerspectives: "推荐视角",
  addPerspective: "添加",
  expand: "展开",
  collapse: "折叠",
  stopTurn: "停止本轮",
  removeFromRoom: "移出房间",
  roleHistory: "历史",
  activeRoles: "活跃角色",
  suggestedRoles: "推荐角色",
  sources: "资源",
  outputs_: "输出",
  memory_: "记忆",
  autoInvited: "自动邀请",
  manualInvite: "手动邀请",
  roundHistory: "轮次历史",
  noHistory: "暂无历史",
  jumpToMessage: "跳转到消息",
  tagsMatched: "标签匹配",
  budgetExhausted: "名额已满",
  belowThreshold: "未达门槛",
  roundStopped: "已停止",
  roundError: "出错",
  singleMode: "单角色",
  councilMode: "议会",
  modeOnlyAffectsNext: "仅影响下一轮",
  singleModeHint: "单角色回复，无交叉审查",
  councilModeHint: "多角色讨论，交叉审查",
  terminal: "终端",
  closeTerminal: "关闭终端",
};

export const translations: Record<Locale, Translations> = { en, zh };
