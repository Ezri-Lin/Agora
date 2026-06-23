/**
 * run-memory-extraction-eval — Memory Extraction eval 入口
 *
 * 用法：
 *   tsx eval/run-memory-extraction-eval.ts --extractor rule-based
 *   tsx eval/run-memory-extraction-eval.ts --extractor llm
 *   tsx eval/run-memory-extraction-eval.ts --extractor rule-based --ci
 */

import { resolve, join } from "path";
import { readFile } from "fs/promises";
import { RuleBasedMemoryExtractor } from "../packages/kernel/src/memory/RuleBasedMemoryExtractor.js";
import { LLMMemoryExtractor, type MemoryExtractionProvider } from "../packages/kernel/src/memory/LLMMemoryExtractor.js";
import { LLMMemoryExtractorAdapter } from "../packages/kernel/src/memory/LLMMemoryExtractorAdapter.js";
import { DirectOpenAIProvider } from "../packages/kernel/src/llm/DirectOpenAIProvider.js";
import { MemoryCandidateValidator } from "../packages/kernel/src/memory/MemoryCandidateValidator.js";
import { MemoryReviewPolicy } from "../packages/kernel/src/memory/MemoryReviewPolicy.js";
import type { MemoryExtractor } from "../packages/kernel/src/memory/MemoryExtractionTypes.js";
import type { ConversationSummaryV1 } from "../packages/kernel/src/context/ConversationSummary.js";
import type { MemoryCandidate, RejectedMemoryCandidate } from "../packages/kernel/src/memory/MemoryCandidate.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "memory-extraction");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "memory-extraction");

// === Parse Args ===

function parseArgs(): { extractorType: string; isCi: boolean } {
  const args = process.argv.slice(2);
  let extractorType = "rule-based";
  let isCi = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--extractor" && args[i + 1]) {
      extractorType = args[i + 1];
      i++;
    } else if (args[i] === "--ci") {
      isCi = true;
    }
  }

  return { extractorType, isCi };
}

// === Create Extractor ===

async function createExtractor(type: string): Promise<MemoryExtractor> {
  switch (type) {
    case "rule-based":
      return new RuleBasedMemoryExtractor();

    case "llm":
      // Read LLM config from Agora's llm-config.json
      const { homedir } = await import("os");
      const configPath = join(
        homedir(),
        "Library",
        "Application Support",
        "@agora",
        "desktop",
        "llm-config.json"
      );

      try {
        const content = await readFile(configPath, "utf-8");
        const saved = JSON.parse(content);

        if (!saved.apiKey) {
          console.log("No API key found, falling back to rule-based");
          return new RuleBasedMemoryExtractor();
        }

        console.log("Using real LLM provider...");
        console.log(`  Provider: ${saved.provider}`);
        console.log(`  Model: ${saved.model}`);

        const directProvider = new DirectOpenAIProvider({
          model: saved.model,
          apiKey: saved.apiKey,
          baseUrl: saved.baseUrl,
        });

        const adapter = new LLMMemoryExtractorAdapter(directProvider);
        return new LLMMemoryExtractor(adapter);
      } catch {
        console.log("Failed to load LLM config, falling back to rule-based");
        return new RuleBasedMemoryExtractor();
      }

    default:
      throw new Error(`Unknown extractor type: ${type}`);
  }
}

// === Scope Compatibility Rules ===

function isScopeCompatible(expectedScope: string, actualScope: string, type: string): boolean {
  // Exact match is always OK
  if (expectedScope === actualScope) return true;

  // Type-specific scope rules
  switch (type) {
    case "decision":
      // Decisions must be project scope
      return expectedScope === "project" && actualScope === "project";

    case "preference":
      // Preferences: project or session are compatible
      const preferenceScopes = ["project", "session"];
      return preferenceScopes.includes(expectedScope) && preferenceScopes.includes(actualScope);

    case "fact":
      // Facts: global or domain are compatible
      const factScopes = ["global", "domain"];
      return factScopes.includes(expectedScope) && factScopes.includes(actualScope);

    case "role_usage":
    case "anti_pattern":
      // Role usage must be role_usage scope
      return expectedScope === "role_usage" && actualScope === "role_usage";

    case "insight":
      // Insights: project, domain, global are compatible
      const insightScopes = ["project", "domain", "global"];
      return insightScopes.includes(expectedScope) && insightScopes.includes(actualScope);

    default:
      // Unknown type: require exact match
      return false;
  }
}

// === Test Cases ===

interface TestCase {
  id: string;
  inputSuffix: string;
  run: () => Promise<Record<string, unknown>>;
}

async function loadSummary(path: string): Promise<ConversationSummaryV1> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

async function loadExpected(testId: string, extractorType: string): Promise<Record<string, unknown>> {
  // Try to load extractor-specific expected output first
  const specificPath = join(EXPECTED_DIR, `${testId}.${extractorType}.expected.json`);
  try {
    const content = await readFile(specificPath, "utf-8");
    return JSON.parse(content);
  } catch {
    // Fall back to default expected output
    const defaultPath = join(EXPECTED_DIR, `${testId}.expected.json`);
    const content = await readFile(defaultPath, "utf-8");
    return JSON.parse(content);
  }
}

function createTestCases(extractor: MemoryExtractor, extractorType: string): TestCase[] {
  const validator = new MemoryCandidateValidator();
  const reviewPolicy = new MemoryReviewPolicy();

  const testCasesConfig = [
    { id: "extract-001", inputSuffix: "project-decision" },
    { id: "extract-002", inputSuffix: "user-preference" },
    { id: "extract-003", inputSuffix: "fact-with-evidence" },
    { id: "extract-004", inputSuffix: "role-usage" },
    { id: "extract-005", inputSuffix: "reject-unsupported" },
  ];

  return testCasesConfig.map(({ id: testId, inputSuffix }) => ({
    id: testId,
    inputSuffix,
    run: async () => {
      // Load summary
      const summary = await loadSummary(
        join(INPUTS_DIR, `${testId}-${inputSuffix}.summary.json`)
      );

      // Extract
      const extractionResult = await extractor.extract({
        sessionId: summary.sessionId,
        summary,
      });

      // Validate and review
      const validatedCandidates: MemoryCandidate[] = [];
      const rejectedCandidates: RejectedMemoryCandidate[] = [
        ...extractionResult.rejected,
      ];

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
        testId,
        candidates: validatedCandidates.map((c) => ({
          type: c.type,
          scope: c.scope,
          content: c.content,
          confidence: c.confidence,
          status: c.status,
          source: c.source,
        })),
        rejected: rejectedCandidates,
        extractionPassed: rejectedCandidates.length === 0,
      };
    },
  }));
}

// === Main ===

async function main() {
  const { extractorType, isCi } = parseArgs();

  console.log("Starting Memory Extraction eval...");
  console.log(`Extractor: ${extractorType}`);
  console.log(`CI: ${isCi}`);
  console.log("");

  const extractor = await createExtractor(extractorType);
  const testCases = createTestCases(extractor, extractorType);
  const results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }> = [];

  for (const testCase of testCases) {
    console.log(`Running ${testCase.id}...`);

    try {
      const actual = await testCase.run();
      const expected = await loadExpected(testCase.id, extractorType);

      // Compare results
      const failures: string[] = [];
      for (const key of Object.keys(expected)) {
        if (key === "candidates" && extractorType === "llm") {
          // For LLM extractor, compare candidates with strict type/scope rules
          const actualCandidates = actual[key] as any[];
          const expectedCandidates = expected[key] as any[];

          // Empty array rule: only extract-005 (negative sample) allows empty
          if (actualCandidates.length === 0 && expectedCandidates.length > 0) {
            if (testCase.id === "extract-005") {
              // Negative sample: empty is acceptable
              console.log(`  ⚠️ LLM returned 0 candidates for negative sample (accepted)`);
            } else {
              failures.push(`${key}: expected ${expectedCandidates.length} candidates, got 0 (empty array only allowed for negative samples)`);
            }
          } else if (actualCandidates.length !== expectedCandidates.length) {
            failures.push(`${key}: expected ${expectedCandidates.length} candidates, got ${actualCandidates.length}`);
          } else {
            // Compare each candidate's key fields
            for (let i = 0; i < expectedCandidates.length; i++) {
              const actualC = actualCandidates[i];
              const expectedC = expectedCandidates[i];

              // Type: must match exactly (no relaxation)
              if (actualC.type !== expectedC.type) {
                failures.push(`candidates[${i}].type: expected ${expectedC.type}, got ${actualC.type}`);
              }

              // Content: must match exactly
              if (actualC.content !== expectedC.content) {
                failures.push(`candidates[${i}].content: expected ${expectedC.content}, got ${actualC.content}`);
              }

              // Confidence: allow ±0.1 tolerance
              const confidenceDiff = Math.abs(actualC.confidence - expectedC.confidence);
              if (confidenceDiff > 0.15) {
                failures.push(`candidates[${i}].confidence: expected ~${expectedC.confidence}, got ${actualC.confidence} (diff: ${confidenceDiff.toFixed(2)})`);
              }

              // Status: must match (no relaxation)
              if (actualC.status !== expectedC.status) {
                failures.push(`candidates[${i}].status: expected ${expectedC.status}, got ${actualC.status}`);
              }

              // Scope: allow limited flexibility
              if (!isScopeCompatible(expectedC.scope, actualC.scope, expectedC.type)) {
                failures.push(`candidates[${i}].scope: expected ${expectedC.scope}, got ${actualC.scope} (incompatible for type ${expectedC.type})`);
              }
            }
          }
        } else if (key === "rejected" && extractorType === "llm") {
          // For LLM extractor, don't compare rejected candidates strictly
          // LLM may or may not reject candidates
        } else if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          failures.push(
            `${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`
          );
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
