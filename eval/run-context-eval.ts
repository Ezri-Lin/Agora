/**
 * run-context-eval — Context Substrate eval 入口
 *
 * 用法：
 *   tsx eval/run-context-eval.ts
 *   tsx eval/run-context-eval.ts --mode contract
 *   tsx eval/run-context-eval.ts --mode compression
 *   tsx eval/run-context-eval.ts --mode compression --ci
 */

import { resolve, join } from "path";
import { runEval } from "../packages/kernel/src/eval/EvalRunner.js";
import { loadGoldenTranscript } from "../packages/kernel/src/eval/GoldenTranscriptLoader.js";
import { loadExpectedOutput } from "../packages/kernel/src/eval/ExpectedOutputLoader.js";
import { generateReport } from "../packages/kernel/src/eval/EvalReport.js";
import { ExpectedOutputCompressor } from "../packages/kernel/src/context/ExpectedOutputCompressor.js";
import { RuleBasedContextCompressor } from "../packages/kernel/src/context/RuleBasedContextCompressor.js";
import { LLMCompressorAdapter } from "../packages/kernel/src/context/LLMCompressorAdapter.js";
import { OpenAICompressorProvider } from "../packages/kernel/src/context/OpenAICompressorProvider.js";
import { DirectOpenAIProvider } from "../packages/kernel/src/llm/DirectOpenAIProvider.js";
import type { EvalMode, ConversationCompressor, GoldenEvalCase } from "../packages/kernel/src/eval/EvalRunner.js";
import type { ConversationSummaryV1 } from "../packages/kernel/src/context/ConversationSummary.js";
import type { LLMProvider } from "../packages/kernel/src/context/LLMContextCompressor.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const TRANSCRIPTS_DIR = join(ROOT_DIR, "eval", "golden-transcripts", "context-substrate");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "context-substrate");
const REPORTS_DIR = join(ROOT_DIR, "eval", "reports", "context-substrate");

// === Parse Args ===

function parseArgs(): { mode: EvalMode; isCi: boolean; compressorType: string } {
  const args = process.argv.slice(2);
  let mode: EvalMode = "contract";
  let isCi = false;
  let compressorType = "expected";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mode" && args[i + 1]) {
      mode = args[i + 1] as EvalMode;
      i++;
    } else if (args[i] === "--ci") {
      isCi = true;
    } else if (args[i] === "--compressor" && args[i + 1]) {
      compressorType = args[i + 1];
      i++;
    }
  }

  return { mode, isCi, compressorType };
}

// === Main ===

async function main() {
  const { mode, isCi, compressorType } = parseArgs();

  console.log("Starting Context Substrate eval...");
  console.log(`Mode: ${mode}`);
  console.log(`Compressor: ${compressorType}`);
  console.log(`CI: ${isCi}`);
  console.log("");

  // 1. Load golden transcripts
  console.log("Loading golden transcripts...");
  const transcriptFiles = [
    "session-001-product-decision.md",
    "session-002-architecture-review.md",
    "session-003-premortem.md",
    "session-004-evidence-grounded-discussion.md",
    "session-005-role-conflict-resolution.md",
    "session-006-long-council-session.md",
  ];

  const cases: GoldenEvalCase[] = [];
  const expectedOutputs = new Map<string, ConversationSummaryV1>();

  for (const file of transcriptFiles) {
    const sessionId = file.replace(".md", "");
    const shortId = sessionId.split("-").slice(0, 2).join("-");
    const transcriptPath = join(TRANSCRIPTS_DIR, file);
    const expectedPath = join(EXPECTED_DIR, `${shortId}.expected.json`);

    // Load expected output
    const expected = await loadExpectedOutput(expectedPath);
    expectedOutputs.set(sessionId, expected);

    cases.push({
      id: sessionId,
      transcriptPath,
      expectedPath,
    });
  }

  console.log(`Loaded ${cases.length} golden transcripts`);
  console.log("");

  // 2. Create compressor based on type
  let compressor: ConversationCompressor;

  switch (compressorType) {
    case "expected":
      compressor = new ExpectedOutputCompressor(expectedOutputs);
      break;
    case "rule-based":
      compressor = new RuleBasedContextCompressor();
      break;
    case "llm":
      // Check for real LLM config from Agora's llm-config.json
      const llmConfig = await getLLMConfig();
      if (llmConfig) {
        console.log("Using real LLM provider...");
        console.log(`  Provider: ${llmConfig.provider}`);
        console.log(`  Model: ${llmConfig.model}`);
        console.log(`  Base URL: ${llmConfig.baseUrl || "default"}`);

        const directProvider = new DirectOpenAIProvider({
          model: llmConfig.model,
          apiKey: llmConfig.apiKey!,
          baseUrl: llmConfig.baseUrl,
        });

        const compressorProvider = new OpenAICompressorProvider(directProvider);
        compressor = new LLMCompressorAdapter(compressorProvider);
      } else {
        console.log("No LLM config found, using mock provider...");
        const mockLLM: LLMProvider = {
          async call(input) {
            console.log(`Mock LLM call with ${input.prompt.length} chars`);
            return {
              content: JSON.stringify({
                sessionId: "mock",
                compressedAt: new Date().toISOString(),
                summaryText: "Mock summary",
                decisions: [],
                actionItems: [],
                openQuestions: [],
                keyInsights: [],
                roleStances: [],
                evidenceRefs: [],
                rawTranscriptRefs: [],
              }),
              tokenUsage: { input: 100, output: 50 },
            };
          },
        };
        compressor = new LLMCompressorAdapter(mockLLM);
      }
      break;
    default:
      console.error(`Unknown compressor type: ${compressorType}`);
      process.exit(1);
  }

  // 3. Run eval
  console.log("Running eval...");
  const result = await runEval({ cases, compressor, mode });

  // 4. Generate report
  console.log("Generating report...");
  await generateReport(result, {
    outputDir: REPORTS_DIR,
    format: "both",
    ci: isCi,
  });

  // 5. Print summary
  console.log("");
  console.log("=== Eval Summary ===");
  console.log(`Status: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Total Cases: ${result.aggregate.totalCases}`);
  console.log(`Passed Cases: ${result.aggregate.passedCases}`);
  console.log(`Failed Cases: ${result.aggregate.failedCases}`);
  console.log("");
  console.log("Average Metrics:");
  console.log(`  Decision Retention: ${formatPercent(result.aggregate.avgDecisionRetention)}`);
  console.log(`  Action Item Retention: ${formatPercent(result.aggregate.avgActionItemRetention)}`);
  console.log(`  Open Question Retention: ${formatPercent(result.aggregate.avgOpenQuestionRetention)}`);
  console.log(`  Role Stance Consistency: ${formatPercent(result.aggregate.avgRoleStanceConsistency)}`);

  // Token reduction - show N/A based on mode
  if (mode === "contract") {
    console.log(`  Token Reduction: N/A (contract mode)`);
  } else {
    const applicableCases = result.cases.filter((c) => c.tokenReductionApplicable);
    if (applicableCases.length > 0) {
      console.log(`  Token Reduction: ${formatPercent(result.aggregate.avgTokenReduction)} (${applicableCases.length} cases)`);
    } else {
      console.log(`  Token Reduction: N/A (no transcript exceeded compression gate)`);
    }
  }

  console.log(`  Reference Coverage: ${formatPercent(result.aggregate.avgReferenceCoverage)}`);
  console.log("");

  if (isCi && !result.passed) {
    console.error("Eval failed in CI mode. Exiting with error.");
    process.exit(1);
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function getLLMConfig(): Promise<LLMConfig | null> {
  // Read from Agora's llm-config.json
  const { homedir } = await import("os");
  const { join } = await import("path");
  const { readFile } = await import("fs/promises");

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
      return null;
    }

    return {
      provider: saved.provider || "openai_compatible",
      model: saved.model || "gpt-4",
      apiKey: saved.apiKey,
      baseUrl: saved.baseUrl,
    };
  } catch {
    return null;
  }
}

// Run
main().catch((error) => {
  console.error("Eval failed with error:", error);
  process.exit(1);
});
