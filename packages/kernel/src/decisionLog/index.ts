/**
 * Decision Log — public API exports
 */

// Types
export {
  // Event types
  type DecisionLogEventType,

  // Actor
  type DecisionLogActor,

  // Source ref
  type DecisionLogSourceRefType,
  type DecisionLogSourceRef,

  // Entry
  type DecisionLogEntry,

  // Query
  type DecisionLogQuery,

  // Store
  type DecisionLogStore,

  // Error
  type DecisionLogErrorCode,
  type DecisionLogError,

  // Helpers
  generateDecisionLogId,
} from "./types.js";

// Core classes
export { InMemoryDecisionLogStore } from "./DecisionLogStore.js";
export { DecisionLogWriter } from "./DecisionLogWriter.js";
export { MemoryReviewDecisionLogger } from "./MemoryReviewDecisionLogger.js";
