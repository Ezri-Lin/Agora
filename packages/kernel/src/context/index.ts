// RetrievalEngine interface + types
export type {
  ReadMode,
  RetrievedContextChunk,
  RetrievalQuery,
  RetrievalResult,
  RetrievalEngine,
} from "./types.js";

// Adapter
export { KeywordExcerptRetriever } from "./KeywordExcerptRetriever.js";

// ContextCompiler
export { compileContextPackage, type ContextPackage } from "./ContextCompiler.js";

// TokenBudgeter
export { estimateTokens, truncateToTokens, fitToBudget, type TokenBudget } from "./TokenBudgeter.js";

// Document types
export type { DocumentMap, DocumentHeading, TextChunk } from "./documentTypes.js";

// Document parser
export { parseDocument } from "./DocumentParser.js";

// Document index
export type { DocumentIndex, ParsedDocumentInput } from "./DocumentIndex.js";
export { InMemoryDocumentIndex } from "./InMemoryDocumentIndex.js";
export { IndexedDocumentRetriever } from "./IndexedDocumentRetriever.js";

// Helper
export { retrieveAndCompileContext, type RetrieveAndCompileInput } from "./retrieveAndCompileContext.js";
