/**
 * Agent Orchestrator — public API exports
 */

// Types
export {
  // State machine
  type AgentLoopState,
  type AgentLoopEvent,
  type AgentCompletionReason,

  // Policies
  type StopPolicy,
  type ToolExecutionPolicy,
  type ToolCallParserPolicy,
  DEFAULT_STOP_POLICY,
  DEFAULT_TOOL_EXECUTION_POLICY,
  DEFAULT_PARSER_POLICY,

  // Messages
  type AgentMessage,
  type ToolCall,
  type ToolResultMessage,

  // Stream
  type NormalizedToolCallDelta,
  type StreamAdapter,

  // Stop evaluation
  type StopEvaluationContext,
  type StopDecision,

  // Result
  type AgentExecutionResult,

  // Errors
  type AgentErrorCode,
  type AgentError,
  type ToolExecutionError,

  // Validation
  type ToolValidationResult,

  // LLM
  type LLMResponse,
} from "./types.js";

// Core classes
export { AgentLoopStateMachine } from "./AgentLoopStateMachine.js";
export { ToolCallParser } from "./ToolCallParser.js";
export {
  StreamToolCallAssembler,
  OpenAIStreamAdapter,
} from "./StreamToolCallAssembler.js";
export { ToolExecutionCoordinator } from "./ToolExecutionCoordinator.js";
export { StopConditionEvaluator } from "./StopConditionEvaluator.js";
export {
  AgentOrchestrator,
  type AgentLLMProvider,
} from "./AgentOrchestrator.js";
