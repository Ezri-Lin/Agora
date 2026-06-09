import type { MessageCompact, CouncilRoundCompact } from "./types.js";

/**
 * Aggregate per-message compacts into a round-level compact.
 *
 * MVP logic: flatten disagreements, open questions, and memory candidates.
 * Consensus is left empty (requires LLM summarization in future PR).
 */
export function buildRoundCompact(args: {
  roundId: string;
  userQuestion: string;
  moderatorFraming?: string;
  selectedPersonas: string[];
  messageCompacts: MessageCompact[];
}): CouncilRoundCompact {
  const { roundId, userQuestion, moderatorFraming, selectedPersonas, messageCompacts } = args;

  const disagreements = messageCompacts.flatMap((m) => m.disagreements);
  const openQuestions = messageCompacts.flatMap((m) => m.openQuestions);
  const memoryCandidates = messageCompacts
    .filter((m) => m.memoryCandidate != null)
    .map((m) => m.memoryCandidate as string);

  return {
    roundId,
    userQuestion,
    moderatorFraming,
    selectedPersonas,
    messageCompacts,
    consensus: [],
    disagreements,
    openQuestions,
    memoryCandidates,
    docWriteCandidates: [],
  };
}
