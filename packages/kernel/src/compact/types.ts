/**
 * Types for the Tail Compact system.
 *
 * Parses structured `<compact>` JSON blocks from persona outputs,
 * enabling downstream consumers (UI, Room Protocol) to access
 * structured stance, claims, and interaction data.
 */

/** Raw payload extracted from the compact block. */
export interface TailCompactPayload {
  stance?: string;
  summary?: string;
  keyClaims?: string[] | string;
  risks?: string[];
  agreements?: Array<{ with: string; point: string }>;
  disagreements?: Array<{ with: string; point: string }>;
  openQuestions?: string[];
  memoryCandidate?: string | null;
  [key: string]: unknown;
}

/** Normalized compact data attached to a single message. */
export interface MessageCompact {
  messageId: string;
  speakerId: string;
  phase: "opening" | "cross_exam" | "synthesis";
  summary: string;
  keyClaims: string[];
  risks: string[];
  agreements: Array<{ with: string; point: string }>;
  disagreements: Array<{ with: string; point: string }>;
  openQuestions: string[];
  memoryCandidate?: string | null;
  raw?: TailCompactPayload;
}

/** Result of parsing a single message's compact block. */
export interface ParseTailCompactResult {
  /** Content with the compact block removed. */
  visibleContent: string;
  /** Parsed compact data, or null if no valid compact found. */
  compact: MessageCompact | null;
  /** Error message if parsing failed. */
  parseError?: string;
}

/** Aggregated compact for an entire council round. */
export interface CouncilRoundCompact {
  roundId: string;
  userQuestion: string;
  moderatorFraming?: string;
  selectedPersonas: string[];
  messageCompacts: MessageCompact[];
  consensus: string[];
  disagreements: Array<{ with: string; point: string }>;
  openQuestions: string[];
  memoryCandidates: string[];
  docWriteCandidates: string[];
}

/** A single persona's stance extracted from their compact. */
export interface PersonaStanceCompact {
  personaId: string;
  currentPosition: string;
  strongestClaim?: string;
  concerns: string[];
  agreements: Array<{ withPersonaId: string; point: string }>;
  disagreements: Array<{ withPersonaId: string; point: string }>;
  changedMind?: string;
}

/** Running brief that accumulates across rounds in a session. */
export interface SessionRunningBrief {
  sessionId?: string;
  topic: string;
  activeGoal?: string;
  latestUserIntent?: string;
  currentConsensus: string[];
  currentDisagreements: Array<{ with: string; point: string }>;
  unresolvedQuestions: string[];
  personaStances: PersonaStanceCompact[];
  importantDecisions: string[];
  memoryCandidates: string[];
  docWriteCandidates: string[];
  roundCount: number;
  updatedAt: string;
}
