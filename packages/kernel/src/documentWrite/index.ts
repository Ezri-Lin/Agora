export type {
  DocumentChangeMode,
  DocumentChangePlan,
  DocumentPatch,
  DiffPreview,
} from "./types.js";

export {
  classifyDocumentChangeRisk,
  createDocumentChangePlan,
} from "./DocumentChangePlanner.js";

export { buildDocumentPatch } from "./DocumentPatchBuilder.js";

export { createDiffPreview } from "./DiffPreview.js";

export {
  DocumentWriter,
  type ApplyDocumentPatchResult,
} from "./DocumentWriter.js";

export {
  InMemoryDocumentWriteAdapter,
  type DocumentWriteAdapter,
} from "./DocumentWriteAdapter.js";

export {
  InMemoryRollbackStore,
  type RollbackStore,
  type RollbackSnapshot,
} from "./RollbackStore.js";

export {
  verifyDocumentWrite,
  type DocumentWriteVerification,
} from "./DocumentWriteVerifier.js";

export {
  InMemoryWriteAuditLog,
  type WriteAuditLog,
  type DocumentWriteAuditEntry,
} from "./WriteAuditLog.js";

export {
  createVaultDocumentWriteAdapter,
  WritePolicyRejection,
  type VaultDocumentWriteAdapterDeps,
} from "./VaultDocumentWriteAdapter.js";

export { createReindexCallback } from "./reindexAfterWrite.js";

export { computeContentHash, stableHashInt } from "./contentHash.js";

export type { WriteAppliedCallback } from "./DocumentWriter.js";
