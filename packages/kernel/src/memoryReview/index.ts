/**
 * Memory Candidate Review — public API exports
 */

// Types
export {
  // Status
  type ReviewStatus,

  // Context
  type MemoryReviewContext,

  // Item
  type MemoryReviewItem,

  // Provenance
  type ReviewProvenance,
  type ReviewSourceSpan,

  // Decision
  type ReviewDecisionActor,
  type ReviewDecision,

  // Queue Event
  type ReviewQueueEventType,
  type ReviewQueueEvent,
  type ReviewQueueEventData,

  // Policy
  type MemoryReviewPolicy,
  DEFAULT_REVIEW_POLICY,

  // Error
  type MemoryReviewErrorCode,
  type MemoryReviewError,

  // Result
  type MemoryReviewResult,

  // Helpers
  computeContentHash,
  generateReviewId,
} from "./types.js";

// Core classes
export { MemoryCandidateReviewQueue } from "./MemoryCandidateReviewQueue.js";
export {
  MemoryCandidateProvenanceBinder,
  type ProvenanceBindingPolicy,
  DEFAULT_BINDING_POLICY,
} from "./MemoryCandidateProvenanceBinder.js";
export { MemoryCandidateDecisionService } from "./MemoryCandidateDecisionService.js";
export { MemoryReviewPolicyEvaluator } from "./MemoryReviewPolicy.js";
