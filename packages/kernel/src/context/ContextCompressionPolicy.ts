/**
 * ContextCompressionPolicy — 上下文压缩策略
 */

export interface ContextCompressionPolicy {
  auto: {
    enabled: boolean;
    tokenThresholdRatio: number; // e.g. 0.7
    messageCountThreshold: number; // e.g. 50
    elapsedMinutesThreshold: number; // e.g. 30
    cooldownMessages: number; // e.g. 10 — 压缩后至少过 N 条消息才再次自动压缩
  };
  manual: {
    commands: string[]; // ["/compact", "/compress"]
    force: boolean; // 即使上下文短也强制压缩
  };
  preserveRecentMessages: number; // e.g. 8 — 保留最近 N 条原始消息
}

export const DEFAULT_COMPRESSION_POLICY: ContextCompressionPolicy = {
  auto: {
    enabled: true,
    tokenThresholdRatio: 0.7,
    messageCountThreshold: 50,
    elapsedMinutesThreshold: 30,
    cooldownMessages: 10,
  },
  manual: {
    commands: ["/compact", "/compress"],
    force: true,
  },
  preserveRecentMessages: 8,
};

export type CompressionRequestedBy =
  | { type: "user"; command: "/compact" | "/compress" }
  | { type: "system"; reason: "token_budget" | "message_count" | "elapsed_time" }
  | { type: "role"; roleId: string; reason: "suggested_context_pressure" };

export type CompressionExecutedBy =
  | { type: "assistant" }
  | { type: "moderator"; roleId: string };

export interface ContextMessage {
  id: string;
  senderType: "user" | "moderator" | "role" | "system";
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ContextCompressionResult {
  compressed: boolean;
  summary?: import("./ConversationSummary.js").ConversationSummaryV1;
  retainedRecentMessages: ContextMessage[];
  latestUserMessage?: ContextMessage;
  reason: string;
  trace?: import("./ContextCompressor.js").CompressionTrace;
}
