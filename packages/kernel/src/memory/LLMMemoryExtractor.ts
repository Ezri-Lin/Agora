/**
 * LLMMemoryExtractor — 使用 LLM 提取记忆候选
 */

import type {
  MemoryExtractor,
  MemoryExtractionInput,
  MemoryExtractionResult,
} from "./MemoryExtractionTypes.js";
import type {
  MemoryCandidate,
  RejectedMemoryCandidate,
  MemoryExtractionTrace,
} from "./MemoryCandidate.js";
import { buildMemoryExtractionPrompt, buildMemoryExtractionRepairPrompt } from "./MemoryExtractionPrompt.js";
import { validateMemoryCandidate } from "./validateMemoryCandidate.js";

export interface MemoryExtractionProvider {
  complete(input: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens?: number;
  }): Promise<{
    text: string;
    model: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  }>;
}

export interface LLMMemoryExtractorConfig {
  maxRetries: number;
  temperature: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: LLMMemoryExtractorConfig = {
  maxRetries: 2,
  temperature: 0,
  timeoutMs: 60_000,
};

export class LLMMemoryExtractor implements MemoryExtractor {
  private provider: MemoryExtractionProvider;
  private config: LLMMemoryExtractorConfig;

  constructor(
    provider: MemoryExtractionProvider,
    config: Partial<LLMMemoryExtractorConfig> = {}
  ) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async extract(
    input: MemoryExtractionInput
  ): Promise<MemoryExtractionResult> {
    const startedAt = new Date().toISOString();
    const { sessionId, summary, projectId, domain } = input;

    const candidates: MemoryCandidate[] = [];
    const rejected: RejectedMemoryCandidate[] = [];
    const validationErrors: string[] = [];
    let retryCount = 0;
    let rawResponse = "";
    let parsedCandidateCount = 0;
    let validatedCandidateCount = 0;
    let reviewAcceptedCount = 0;
    let reviewCandidateCount = 0;

    // Build prompt
    const summaryJson = JSON.stringify(summary, null, 2);
    const prompt = buildMemoryExtractionPrompt(summaryJson, projectId, domain);

    // Debug: log input summary stats
    console.log(`[LLMMemoryExtractor] Input summary:`);
    console.log(`  sessionId: ${sessionId}`);
    console.log(`  decisions: ${summary.decisions.length}`);
    console.log(`  keyInsights: ${summary.keyInsights.length}`);
    console.log(`  roleStances: ${summary.roleStances.length}`);
    console.log(`  evidenceRefs: ${summary.evidenceRefs.length}`);

    let lastOutput = "";
    let lastErrors: string[] = [];

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Call LLM
        const result = await this.provider.complete({
          systemPrompt: "You are Agora Memory Extractor. Extract memory candidates from ConversationSummaryV1. Return JSON object: { \"candidates\": [...] }. Do NOT use markdown code blocks. Set status=\"candidate\" for all items.",
          userPrompt: attempt === 0 ? prompt : buildMemoryExtractionRepairPrompt(lastOutput, lastErrors),
          temperature: this.config.temperature,
          maxTokens: 16384, // Increase max tokens further
        });

        lastOutput = result.text;
        rawResponse = result.text;
        retryCount = attempt;

        // Debug: log raw response
        console.log(`[LLMMemoryExtractor] Raw response (attempt ${attempt}):`);
        console.log(`  length: ${result.text.length}`);
        console.log(`  preview: ${result.text.slice(0, 500)}`);

        // Parse JSON - handle markdown code blocks
        let parsed: unknown;
        try {
          let jsonText = result.text.trim();

          // Remove markdown code blocks if present
          if (jsonText.startsWith("```json")) {
            jsonText = jsonText.slice(7); // Remove ```json
          } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.slice(3); // Remove ```
          }
          if (jsonText.endsWith("```")) {
            jsonText = jsonText.slice(0, -3); // Remove trailing ```
          }
          jsonText = jsonText.trim();

          parsed = JSON.parse(jsonText);
        } catch (parseError) {
          lastErrors = [`Invalid JSON: ${parseError}`];
          validationErrors.push(...lastErrors);
          console.log(`[LLMMemoryExtractor] Parse error: ${parseError}`);
          continue;
        }

        // Handle both formats: array or { candidates: [] }
        let candidateArray: unknown[];
        if (Array.isArray(parsed)) {
          candidateArray = parsed;
        } else if (parsed && typeof parsed === "object" && "candidates" in parsed) {
          candidateArray = (parsed as any).candidates || [];
        } else {
          lastErrors = ["Output must be an array or { candidates: [] }"];
          validationErrors.push(...lastErrors);
          console.log(`[LLMMemoryExtractor] Invalid format: ${JSON.stringify(parsed).slice(0, 200)}`);
          continue;
        }

        parsedCandidateCount = candidateArray.length;
        console.log(`[LLMMemoryExtractor] Parsed candidates: ${parsedCandidateCount}`);

        // Validate each candidate
        const validCandidates: MemoryCandidate[] = [];
        const invalidCandidates: RejectedMemoryCandidate[] = [];

        for (const item of candidateArray) {
          // Post-process: fill in missing fields
          const processed = this.postProcessCandidate(item, sessionId);
          const validation = validateMemoryCandidate(processed);

          if (validation.valid) {
            validCandidates.push(processed as MemoryCandidate);
          } else {
            invalidCandidates.push({
              content: processed.content || String(item),
              reason: validation.errors[0],
              source: processed.source,
            });
            console.log(`[LLMMemoryExtractor] Validation failed: ${validation.errors[0]}`);
          }
        }

        validatedCandidateCount = validCandidates.length;
        console.log(`[LLMMemoryExtractor] Validated candidates: ${validatedCandidateCount}`);

        // Apply review policy
        for (const candidate of validCandidates) {
          if (this.canAutoApply(candidate)) {
            candidate.status = "accepted";
            reviewAcceptedCount++;
          } else {
            reviewCandidateCount++;
          }
          candidates.push(candidate);
        }

        rejected.push(...invalidCandidates);

        // If we have valid candidates OR empty array (valid response), we're done
        // Empty array means LLM found no candidates to extract - this is valid
        if (candidates.length > 0 || parsedCandidateCount === 0 || attempt === this.config.maxRetries) {
          break;
        }

        lastErrors = ["No valid candidates extracted"];
        validationErrors.push(...lastErrors);
      } catch (error) {
        lastErrors = [
          `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
        ];
        validationErrors.push(...lastErrors);
        retryCount = attempt + 1;
      }
    }

    const completedAt = new Date().toISOString();

    console.log(`[LLMMemoryExtractor] Final results:`);
    console.log(`  candidates: ${candidates.length}`);
    console.log(`  rejected: ${rejected.length}`);
    console.log(`  reviewAccepted: ${reviewAcceptedCount}`);
    console.log(`  reviewCandidate: ${reviewCandidateCount}`);

    return {
      candidates,
      rejected,
      trace: {
        extractor: "llm",
        startedAt,
        completedAt,
        model: "unknown",
        rawResponse,
        parsedCandidateCount,
        validatedCandidateCount,
        rejectedCandidateCount: rejected.length,
        reviewAcceptedCount,
        reviewCandidateCount,
        validationErrors,
        retryCount,
        fallbackUsed: false,
      },
    };
  }

  private postProcessCandidate(item: any, sessionId: string): any {
    const now = new Date().toISOString();

    return {
      id: item.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope: item.scope || "project",
      type: item.type || "insight",
      content: item.content || "",
      source: {
        sessionId: item.source?.sessionId || sessionId,
        messageIds: item.source?.messageIds || [],
        summaryId: item.source?.summaryId,
        evidenceRefs: item.source?.evidenceRefs,
      },
      confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
      status: "candidate", // Force status to candidate
      tags: Array.isArray(item.tags) ? item.tags : [],
      createdAt: item.createdAt || now,
    };
  }

  private canAutoApply(candidate: MemoryCandidate): boolean {
    // Only candidate status can be auto-accepted
    if (candidate.status !== "candidate") {
      return false;
    }

    // Type-specific rules
    switch (candidate.type) {
      case "decision":
        return (
          candidate.scope === "project" &&
          candidate.confidence >= 0.9
        );

      case "insight":
        return candidate.confidence >= 0.95;

      case "constraint":
        return candidate.confidence >= 0.9;

      case "fact":
        return (
          candidate.confidence >= 0.95 &&
          candidate.source.evidenceRefs &&
          candidate.source.evidenceRefs.length > 0
        );

      default:
        return false;
    }
  }
}
