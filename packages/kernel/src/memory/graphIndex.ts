/**
 * Memory Graph Module — public API exports
 *
 * 注意: 使用 graphIndex.ts 而不是 index.ts
 * 避免与现有 memory 模块的默认导出冲突
 */

// Graph Types
export {
  // Edge types
  type MemoryEdgeType,
  type MemoryEdge,
  type MemoryEdgeRecord,

  // Provenance types
  type ProvenanceStatus,
  type TrustLevel,
  type ProvenanceSource,
  type RationaleStep,
  type ProvenanceChain,
  type ProvenanceValidation,

  // Graph traversal
  type MemoryGraphNeighbor,
  type MemoryGraphTraversal,

  // Query types
  type MemoryQueryContext,
  type MemoryQuery,
  type MemoryQueryResult,
  type MemoryQueryHit,
  type QueryTrace,

  // Index types
  type MemoryIndexEntry,
  type IndexStats,

  // Error types
  type MemoryQueryErrorCode,
  type MemoryQueryError,

  // Tool output
  type MemoryToolOutput,

  // Constants
  MAX_RELATED_DEPTH,
  MAX_RELATED_NODES,
  QUERY_SCORE_WEIGHTS,
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
} from "./graphTypes.js";

// Core classes
export { MemoryGraph } from "./MemoryGraph.js";
export {
  InMemoryGraphStore,
  type MemoryGraphStore,
  type MemoryGraphStoreConfig,
  DEFAULT_GRAPH_STORE_CONFIG,
} from "./MemoryGraphStore.js";
export {
  ProvenanceTracker,
  type ProvenanceStoreConfig,
  DEFAULT_PROVENANCE_CONFIG,
} from "./ProvenanceTracker.js";
export { StructuredIndexer } from "./StructuredIndexer.js";
export { MemoryQueryEngine } from "./MemoryQueryEngine.js";

// Tool manifests and executors
export {
  memorySearchManifest,
  memoryGetManifest,
  memoryRelatedManifest,
  createMemorySearchExecutor,
  createMemoryGetExecutor,
  createMemoryRelatedExecutor,
} from "./MemoryTools.js";
