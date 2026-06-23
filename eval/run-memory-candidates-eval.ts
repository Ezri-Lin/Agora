/**
 * run-memory-candidates-eval — Memory Candidate Pipeline eval 入口
 *
 * 用法：
 *   tsx eval/run-memory-candidates-eval.ts
 *   tsx eval/run-memory-candidates-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile } from "fs/promises";
import { MemoryCandidateValidator } from "../packages/kernel/src/memory/MemoryCandidateValidator.js";
import { MemoryReviewPolicy } from "../packages/kernel/src/memory/MemoryReviewPolicy.js";
import type {
  MemoryCandidate,
  MemoryExtractionInput,
  MemoryExtractionResult,
  RejectedMemoryCandidate,
  MemoryType,
  MemoryScope,
} from "../packages/kernel/src/memory/MemoryCandidate.js";
import type { ConversationSummaryV1 } from "../packages/kernel/src/context/ConversationSummary.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "memory-candidates");

// === Mock Extractor ===

function extractCandidatesFromSummary(
  input: MemoryExtractionInput
): MemoryExtractionResult {
  const { sessionId, summary } = input;
  const candidates: MemoryCandidate[] = [];
  const rejected: RejectedMemoryCandidate[] = [];

  // Extract from keyInsights
  for (const insight of summary.keyInsights) {
    if (insight.sourceMessageIds.length === 0) {
      rejected.push({
        content: insight.insight,
        reason: "source.messageIds must not be empty",
      });
      continue;
    }

    // Infer type from content
    let type: MemoryType = "insight";
    let scope: MemoryScope = "project";
    let confidence = insight.confidence === "high" ? 0.9 : insight.confidence === "medium" ? 0.7 : 0.5;

    // Check if it's a preference (user preference)
    if (insight.insight.includes("用户") && insight.insight.includes("偏好")) {
      type = "preference";
      confidence = 0.9; // User explicitly stated
    }

    // Check if it's a fact with evidence
    if (summary.evidenceRefs && summary.evidenceRefs.length > 0) {
      type = "fact";
      scope = "global";
      confidence = 0.95;
    }

    // Check if it's role usage
    if (insight.insight.includes("Skeptic Critic") || insight.insight.includes("角色")) {
      type = "role_usage";
      scope = "role_usage";
    }

    candidates.push({
      id: `mem-${insight.id}`,
      scope,
      type,
      content: insight.insight,
      source: {
        sessionId,
        messageIds: insight.sourceMessageIds,
        evidenceRefs: type === "fact" ? summary.evidenceRefs : undefined,
      },
      confidence,
      status: "candidate",
      tags: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Extract from decisions
  for (const decision of summary.decisions) {
    if (decision.sourceMessageIds.length === 0) {
      rejected.push({
        content: decision.statement,
        reason: "source.messageIds must not be empty",
      });
      continue;
    }

    candidates.push({
      id: `mem-${decision.id}`,
      scope: "project",
      type: "decision",
      content: decision.statement,
      source: {
        sessionId,
        messageIds: decision.sourceMessageIds,
      },
      confidence: decision.status === "accepted" ? 0.95 : 0.7,
      status: "candidate",
      tags: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Extract from roleStances
  for (const stance of summary.roleStances) {
    if (stance.sourceMessageIds.length === 0) {
      rejected.push({
        content: stance.stance,
        reason: "source.messageIds must not be empty",
      });
      continue;
    }

    candidates.push({
      id: `mem-stance-${stance.roleId}`,
      scope: "role_usage",
      type: "role_usage",
      content: `${stance.roleName}: ${stance.stance}`,
      source: {
        sessionId,
        messageIds: stance.sourceMessageIds,
      },
      confidence: stance.confidence === "high" ? 0.8 : stance.confidence === "medium" ? 0.6 : 0.4,
      status: "candidate",
      tags: [stance.roleId],
      createdAt: new Date().toISOString(),
    });
  }

  return {
    candidates,
    rejected,
    trace: {
      extractor: "rule_based",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      candidateCount: candidates.length,
      rejectedCount: rejected.length,
      validationErrors: [],
    },
  };
}

// === Test Cases ===

interface TestCase {
  id: string;
  expectedPath: string;
  run: () => Promise<Record<string, unknown>>;
}

async function loadExpected(testId: string): Promise<Record<string, unknown>> {
  const path = join(EXPECTED_DIR, `${testId}.expected.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

function createTestCases(): TestCase[] {
  const validator = new MemoryCandidateValidator();
  const reviewPolicy = new MemoryReviewPolicy();

  return [
    // memory-001: User preference
    {
      id: "memory-001",
      expectedPath: "memory-001.expected.json",
      run: async () => {
        const input: MemoryExtractionInput = {
          sessionId: "test-session-001",
          summary: {
            sessionId: "test-session-001",
            compressedAt: new Date().toISOString(),
            summaryText: "Test summary",
            decisions: [],
            actionItems: [],
            openQuestions: [],
            keyInsights: [
              {
                id: "insight-001",
                insight: "用户偏好简洁的代码风格，不喜欢过多的注释",
                confidence: "high",
                sourceMessageIds: ["msg-010"],
              },
            ],
            roleStances: [],
            evidenceRefs: [],
            rawTranscriptRefs: [],
          },
        };

        const extractionResult = extractCandidatesFromSummary(input);

        // Validate and review each candidate
        const validatedCandidates: MemoryCandidate[] = [];
        const rejectedCandidates: RejectedMemoryCandidate[] = [...extractionResult.rejected];

        for (const candidate of extractionResult.candidates) {
          const validation = validator.validate(candidate);
          if (!validation.valid) {
            rejectedCandidates.push({
              content: candidate.content,
              reason: validation.errors[0],
              source: candidate.source,
            });
            continue;
          }

          const reviewDecision = reviewPolicy.review(candidate);
          validatedCandidates.push({
            ...candidate,
            status: reviewDecision.status,
          });
        }

        return {
          testId: "memory-001-user-preference",
          candidates: validatedCandidates.map((c) => ({
            type: c.type,
            scope: c.scope,
            content: c.content,
            confidence: c.confidence,
            status: c.status,
            source: c.source,
          })),
          rejected: rejectedCandidates,
          validationPassed: rejectedCandidates.length === 0,
        };
      },
    },

    // memory-002: Project decision
    {
      id: "memory-002",
      expectedPath: "memory-002.expected.json",
      run: async () => {
        const input: MemoryExtractionInput = {
          sessionId: "test-session-002",
          summary: {
            sessionId: "test-session-002",
            compressedAt: new Date().toISOString(),
            summaryText: "Test summary",
            decisions: [
              {
                id: "decision-001",
                statement: "使用 TypeScript 作为主要开发语言",
                decidedBy: "council",
                status: "accepted",
                sourceMessageIds: ["msg-020", "msg-025"],
              },
            ],
            actionItems: [],
            openQuestions: [],
            keyInsights: [],
            roleStances: [],
            evidenceRefs: [],
            rawTranscriptRefs: [],
          },
        };

        const extractionResult = extractCandidatesFromSummary(input);

        const validatedCandidates: MemoryCandidate[] = [];
        const rejectedCandidates: RejectedMemoryCandidate[] = [...extractionResult.rejected];

        for (const candidate of extractionResult.candidates) {
          const validation = validator.validate(candidate);
          if (!validation.valid) {
            rejectedCandidates.push({
              content: candidate.content,
              reason: validation.errors[0],
              source: candidate.source,
            });
            continue;
          }

          const reviewDecision = reviewPolicy.review(candidate);
          validatedCandidates.push({
            ...candidate,
            status: reviewDecision.status,
          });
        }

        return {
          testId: "memory-002-project-decision",
          candidates: validatedCandidates.map((c) => ({
            type: c.type,
            scope: c.scope,
            content: c.content,
            confidence: c.confidence,
            status: c.status,
            source: c.source,
          })),
          rejected: rejectedCandidates,
          validationPassed: rejectedCandidates.length === 0,
        };
      },
    },

    // memory-003: Fact with evidence
    {
      id: "memory-003",
      expectedPath: "memory-003.expected.json",
      run: async () => {
        const input: MemoryExtractionInput = {
          sessionId: "test-session-003",
          summary: {
            sessionId: "test-session-003",
            compressedAt: new Date().toISOString(),
            summaryText: "Test summary",
            decisions: [],
            actionItems: [],
            openQuestions: [],
            keyInsights: [
              {
                id: "insight-001",
                insight: "根据 Anthropic 研究，记忆系统可以减少 60% 的重复问题",
                confidence: "high",
                sourceMessageIds: ["msg-030"],
              },
            ],
            roleStances: [],
            evidenceRefs: ["https://anthropic.com/research/memory"],
            rawTranscriptRefs: [],
          },
        };

        const extractionResult = extractCandidatesFromSummary(input);

        const validatedCandidates: MemoryCandidate[] = [];
        const rejectedCandidates: RejectedMemoryCandidate[] = [...extractionResult.rejected];

        for (const candidate of extractionResult.candidates) {
          // Add evidenceRefs for facts
          if (input.summary.evidenceRefs.length > 0) {
            candidate.source.evidenceRefs = input.summary.evidenceRefs;
          }

          const validation = validator.validate(candidate);
          if (!validation.valid) {
            rejectedCandidates.push({
              content: candidate.content,
              reason: validation.errors[0],
              source: candidate.source,
            });
            continue;
          }

          const reviewDecision = reviewPolicy.review(candidate);
          validatedCandidates.push({
            ...candidate,
            status: reviewDecision.status,
          });
        }

        return {
          testId: "memory-003-fact-with-evidence",
          candidates: validatedCandidates.map((c) => ({
            type: c.type,
            scope: c.scope,
            content: c.content,
            confidence: c.confidence,
            status: c.status,
            source: c.source,
          })),
          rejected: rejectedCandidates,
          validationPassed: rejectedCandidates.length === 0,
        };
      },
    },

    // memory-004: Role usage
    {
      id: "memory-004",
      expectedPath: "memory-004.expected.json",
      run: async () => {
        const input: MemoryExtractionInput = {
          sessionId: "test-session-004",
          summary: {
            sessionId: "test-session-004",
            compressedAt: new Date().toISOString(),
            summaryText: "Test summary",
            decisions: [],
            actionItems: [],
            openQuestions: [],
            keyInsights: [
              {
                id: "insight-001",
                insight: "Skeptic Critic 在技术讨论中表现活跃，经常提出有价值的问题",
                confidence: "medium",
                sourceMessageIds: ["msg-040", "msg-045"],
              },
            ],
            roleStances: [
              {
                roleId: "skeptic_critic",
                roleName: "Skeptic Critic",
                stance: "积极质疑技术方案",
                confidence: "medium",
                unresolvedConcerns: [],
                sourceMessageIds: ["msg-040", "msg-045"],
              },
            ],
            evidenceRefs: [],
            rawTranscriptRefs: [],
          },
        };

        const extractionResult = extractCandidatesFromSummary(input);

        const validatedCandidates: MemoryCandidate[] = [];
        const rejectedCandidates: RejectedMemoryCandidate[] = [...extractionResult.rejected];

        for (const candidate of extractionResult.candidates) {
          const validation = validator.validate(candidate);
          if (!validation.valid) {
            rejectedCandidates.push({
              content: candidate.content,
              reason: validation.errors[0],
              source: candidate.source,
            });
            continue;
          }

          const reviewDecision = reviewPolicy.review(candidate);
          validatedCandidates.push({
            ...candidate,
            status: reviewDecision.status,
          });
        }

        return {
          testId: "memory-004-role-usage",
          candidates: validatedCandidates.map((c) => ({
            type: c.type,
            scope: c.scope,
            content: c.content,
            confidence: c.confidence,
            status: c.status,
            source: c.source,
          })),
          rejected: rejectedCandidates,
          validationPassed: rejectedCandidates.length === 0,
        };
      },
    },

    // memory-005: Reject unsupported
    {
      id: "memory-005",
      expectedPath: "memory-005.expected.json",
      run: async () => {
        const input: MemoryExtractionInput = {
          sessionId: "test-session-005",
          summary: {
            sessionId: "test-session-005",
            compressedAt: new Date().toISOString(),
            summaryText: "Test summary",
            decisions: [],
            actionItems: [],
            openQuestions: [],
            keyInsights: [
              {
                id: "insight-001",
                insight: "这个方案不可行",
                confidence: "low",
                sourceMessageIds: [],
              },
            ],
            roleStances: [],
            evidenceRefs: [],
            rawTranscriptRefs: [],
          },
        };

        const extractionResult = extractCandidatesFromSummary(input);

        const validatedCandidates: MemoryCandidate[] = [];
        const rejectedCandidates: RejectedMemoryCandidate[] = [...extractionResult.rejected];

        for (const candidate of extractionResult.candidates) {
          const validation = validator.validate(candidate);
          if (!validation.valid) {
            rejectedCandidates.push({
              content: candidate.content,
              reason: validation.errors[0],
              source: candidate.source,
            });
            continue;
          }

          const reviewDecision = reviewPolicy.review(candidate);
          validatedCandidates.push({
            ...candidate,
            status: reviewDecision.status,
          });
        }

        return {
          testId: "memory-005-reject-unsupported",
          candidates: validatedCandidates.map((c) => ({
            type: c.type,
            scope: c.scope,
            content: c.content,
            confidence: c.confidence,
            status: c.status,
            source: c.source,
          })),
          rejected: rejectedCandidates,
          validationPassed: rejectedCandidates.length === 0,
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const isCi = process.argv.includes("--ci");

  console.log("Starting Memory Candidate Pipeline eval...");
  console.log(`CI: ${isCi}`);
  console.log("");

  const testCases = createTestCases();
  const results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }> = [];

  for (const testCase of testCases) {
    console.log(`Running ${testCase.id}...`);

    try {
      const actual = await testCase.run();
      const expected = await loadExpected(testCase.id);

      // Compare results
      const failures: string[] = [];
      for (const key of Object.keys(expected)) {
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          failures.push(`${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`);
        }
      }

      results.push({
        id: testCase.id,
        passed: failures.length === 0,
        failures,
      });

      console.log(`  ${failures.length === 0 ? "✅ PASSED" : "❌ FAILED"}`);
      if (failures.length > 0) {
        for (const failure of failures) {
          console.log(`    - ${failure}`);
        }
      }
    } catch (error) {
      results.push({
        id: testCase.id,
        passed: false,
        failures: [`Error: ${error}`],
      });
      console.log(`  ❌ ERROR: ${error}`);
    }
  }

  console.log("");
  console.log("=== Eval Summary ===");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log(`Status: ${failed === 0 ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("");

  for (const result of results) {
    console.log(`${result.id}: ${result.passed ? "✅" : "❌"}`);
  }

  if (isCi && failed > 0) {
    console.error("Eval failed in CI mode. Exiting with error.");
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Eval failed with error:", error);
  process.exit(1);
});
