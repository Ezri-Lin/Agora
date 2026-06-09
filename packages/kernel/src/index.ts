export { MockMultiCallProvider } from "./llm/MockMultiCallProvider.js";
export { OpenAICompatibleProvider } from "./llm/OpenAICompatibleProvider.js";
export { createProvider } from "./llm/createProvider.js";
export { Moderator } from "./moderator/Moderator.js";
export { selectRoles, scoreRole } from "./routing/RoleRouter.js";
export { buildSharedContext, buildRoleSuffix } from "./context/ContextBuilder.js";
export { buildContextPack, type ContextPack, type ContextPackMeta, type DocInclusion } from "./context/ContextPack.js";
export { buildModeratorContextPack, type ModeratorContextPack, type ModeratorContextPackMeta, type FullSelectedDocument } from "./context/ModeratorContextPack.js";
export { buildModeratorPrompt, buildRolePrompt } from "./context/promptContracts.js";
export { compilePersonaPrompt } from "./prompt/compilePersonaPrompt.js";
export type { CompilePersonaPromptInput, CompiledPersonaPrompt, PromptPhase, PromptRoomContext } from "./prompt/types.js";
export { estimateTokens, CONTEXT_BUDGETS, getDocBudget, type ContextBudget } from "./context/tokenBudget.js";
export { extractRelevantExcerpt } from "./context/extractExcerpt.js";
export { KeywordExcerptRetriever } from "./context/KeywordExcerptRetriever.js";
export { compileContextPackage, type ContextPackage } from "./context/ContextCompiler.js";
export { fitToBudget } from "./context/TokenBudgeter.js";
export type { ReadMode, RetrievedContextChunk, RetrievalQuery, RetrievalResult, RetrievalEngine } from "./context/types.js";
export { parseDocument } from "./context/DocumentParser.js";
export type { DocumentMap, DocumentHeading, TextChunk } from "./context/documentTypes.js";
export type { DocumentIndex, ParsedDocumentInput } from "./context/DocumentIndex.js";
export { InMemoryDocumentIndex } from "./context/InMemoryDocumentIndex.js";
export { SqliteDocumentIndex } from "./context/SqliteDocumentIndex.js";
export { IndexedDocumentRetriever } from "./context/IndexedDocumentRetriever.js";
export { retrieveAndCompileContext, type RetrieveAndCompileInput } from "./context/retrieveAndCompileContext.js";
export { runCouncilRound, stopRole, type CouncilRunResult, type RunCouncilRoundInput, type ContextDebug } from "./council/CouncilRunner.js";
export { prepareCouncilDispatch } from "./council/prepareCouncilDispatch.js";
export type { PrepareCouncilDispatchInput, CouncilDispatchPreview } from "./council/dispatchTypes.js";
export { parseTailCompact, stripTailCompact, buildRoundCompact, formatCompactsForPrompt, buildSessionRunningBrief, formatSessionBriefForPrompt } from "./compact/index.js";
export type { TailCompactPayload, MessageCompact, ParseTailCompactResult, CouncilRoundCompact, PersonaStanceCompact, SessionRunningBrief } from "./compact/index.js";
// MemoryStore and extractMemories use node:fs — import directly from "./memory/MemoryStore.js"
// eval module uses node:fs — import directly from "./eval/runEval.js"
export {
  classifyDocumentChangeRisk,
  createDocumentChangePlan,
  buildDocumentPatch,
  createDiffPreview,
  DocumentWriter,
  InMemoryDocumentWriteAdapter,
  InMemoryRollbackStore,
  InMemoryWriteAuditLog,
  verifyDocumentWrite,
  createVaultDocumentWriteAdapter,
  WritePolicyRejection,
  createReindexCallback,
  computeContentHash,
  stableHashInt,
} from "./documentWrite/index.js";
export type {
  DocumentChangeMode,
  DocumentChangePlan,
  DocumentPatch,
  DiffPreview,
  DocumentWriteAdapter,
  RollbackStore,
  RollbackSnapshot,
  ApplyDocumentPatchResult,
  DocumentWriteVerification,
  WriteAuditLog,
  DocumentWriteAuditEntry,
  VaultDocumentWriteAdapterDeps,
  WriteAppliedCallback,
} from "./documentWrite/index.js";
export type { LLMProvider, CouncilSession } from "./types/index.js";
