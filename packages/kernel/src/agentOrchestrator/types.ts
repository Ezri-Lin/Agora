/**
 * Agent Orchestrator Types — v0 类型定义
 *
 * 设计原则：
 * - State/Event 分离
 * - Tool allowlist 强制
 * - Tool result untrusted
 * - AbortSignal 贯穿
 */

// === State Machine ===

export type AgentLoopState =
  | "idle"
  | "awaiting_model"
  | "parsing_tools"
  | "executing_tools"
  | "feeding_results"
  | "done"
  | "failed"
  | "cancelled";

export type AgentLoopEvent =
  | "start"
  | "model_requested"
  | "model_responded"
  | "tool_calls_parsed"
  | "tools_executed"
  | "results_fed"
  | "complete"
  | "fail"
  | "cancel";

export type AgentCompletionReason =
  | "final_response"
  | "done_signal"
  | "max_turns"
  | "max_tool_calls"
  | "max_tool_calls_per_turn"
  | "timeout"
  | "cancelled"
  | "error";

// === Stop Policy ===

export interface StopPolicy {
  maxTurns: number;
  maxToolCallsPerTurn: number;
  maxTotalToolCalls: number;
  maxConsecutiveErrors: number;
  timeoutMs: number;
}

export const DEFAULT_STOP_POLICY: StopPolicy = {
  maxTurns: 8,
  maxToolCallsPerTurn: 5,
  maxTotalToolCalls: 20,
  maxConsecutiveErrors: 2,
  timeoutMs: 60_000,
};

// === Tool Execution Policy ===

export interface ToolExecutionPolicy {
  allowedToolNames: string[];
  maxArgsBytes: number;
  maxResultBytes: number;
  allowParallel: boolean;
}

export const DEFAULT_TOOL_EXECUTION_POLICY: ToolExecutionPolicy = {
  allowedToolNames: [],
  maxArgsBytes: 32768,
  maxResultBytes: 65536,
  allowParallel: true,
};

// === Parser Policy ===

export interface ToolCallParserPolicy {
  allowTextFallback: boolean;
  maxToolCallJsonBytes: number;
  allowedToolNames: string[];
}

export const DEFAULT_PARSER_POLICY: ToolCallParserPolicy = {
  allowTextFallback: false,
  maxToolCallJsonBytes: 8192,
  allowedToolNames: [],
};

// === Messages ===

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  toolName: string;
  ok: boolean;
  content: string;
  rawOutput?: unknown;
  error?: ToolExecutionError;
}

// === Stream Delta ===

export interface NormalizedToolCallDelta {
  index: number;
  id?: string;
  nameDelta?: string;
  argsJsonDelta?: string;
  isComplete?: boolean;
}

export interface StreamAdapter {
  normalize(chunk: unknown): NormalizedToolCallDelta[];
}

// === Stop Evaluation ===

export interface StopEvaluationContext {
  state: AgentLoopState;
  turnsUsed: number;
  totalToolCalls: number;
  toolCallsThisTurn: number;
  consecutiveErrors: number;
  startedAt: number;
  lastToolResults?: ToolResultMessage[];
  cancelled?: boolean;
}

export interface StopDecision {
  shouldStop: boolean;
  reason?: AgentCompletionReason;
  message?: string;
}

// === Execution Result ===

export interface AgentExecutionResult {
  state: AgentLoopState;
  completionReason: AgentCompletionReason;
  messages: AgentMessage[];
  toolCallsExecuted: number;
  turnsUsed: number;
  finalResponse?: string;
  error?: AgentError;
}

// === Errors ===

export type AgentErrorCode =
  | "MAX_TURNS_EXCEEDED"
  | "MAX_TOOL_CALLS_PER_TURN_EXCEEDED"
  | "MAX_TOOL_CALLS_EXCEEDED"
  | "CONSECUTIVE_ERRORS"
  | "TIMEOUT"
  | "MODEL_ERROR"
  | "TOOL_PARSE_ERROR"
  | "TOOL_NOT_FOUND"
  | "TOOL_NOT_ALLOWED"
  | "TOOL_RISK_NOT_ALLOWED"
  | "TOOL_SCHEMA_VALIDATION_FAILED"
  | "TOOL_EXECUTION_FAILED"
  | "TOOL_RESULT_TOO_LARGE"
  | "STREAM_ASSEMBLY_ERROR"
  | "INVALID_STATE_TRANSITION"
  | "USER_CANCELLED";

export interface AgentError {
  code: AgentErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface ToolExecutionError {
  code: string;
  message: string;
  recoverable: boolean;
}

// === Tool Validation ===

export type ToolValidationResult =
  | { valid: true }
  | { valid: false; error: AgentError };

// === LLM Response (normalized) ===

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  reasoning?: string;
}
