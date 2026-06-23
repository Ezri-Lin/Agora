/**
 * run-evidence-search-eval — Evidence Search eval 入口
 *
 * 用法：
 *   tsx eval/run-evidence-search-eval.ts
 *   tsx eval/run-evidence-search-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { LocalToolRuntime } from "../packages/kernel/src/tools/LocalToolRuntime.js";
import { MockEvidenceSearchProvider } from "../packages/kernel/src/evidence/MockEvidenceSearchProvider.js";
import { WebEvidenceSearchTool } from "../packages/kernel/src/evidence/WebEvidenceSearchTool.js";
import type { ToolRequester } from "../packages/kernel/src/tools/ToolRuntimeTypes.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "evidence-search");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "evidence-search");
const TEST_WORKSPACE = join(ROOT_DIR, ".test-evidence-search");

// === Parse Args ===

function parseArgs(): { isCi: boolean } {
  const args = process.argv.slice(2);
  let isCi = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ci") {
      isCi = true;
    }
  }

  return { isCi };
}

// === Test Cases ===

interface TestCase {
  id: string;
  run: () => Promise<Record<string, unknown>>;
}

async function loadInput(testId: string): Promise<Record<string, unknown>> {
  const path = join(INPUTS_DIR, `${testId}.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

async function loadExpected(testId: string): Promise<Record<string, unknown>> {
  const path = join(EXPECTED_DIR, `${testId}.expected.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

function createTestCases(): TestCase[] {
  return [
    {
      id: "evidence-001",
      run: async () => {
        const input = await loadInput("evidence-001-basic-query");
        const searchInput = input.input as { query: string; limit: number };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);
        const provider = new MockEvidenceSearchProvider();
        const tool = new WebEvidenceSearchTool(provider);

        // Register tool
        runtime.register(tool.getManifest(), tool.getExecutor());

        // Create plan and invoke
        const plan = runtime.createPlan({
          toolName: "web_evidence_search",
          args: searchInput,
          reason: "Evidence search eval",
          requestedBy: { type: "assistant" },
        });
        const result = await runtime.invoke(plan);

        return {
          testId: "evidence-001",
          hasPacket: !!result.output,
          resultCount: (result.output as any)?.packet?.results?.length || 0,
          hasClaims: (result.output as any)?.packet?.extractedClaims?.length > 0,
          uncertainty: (result.output as any)?.packet?.uncertainty,
        };
      },
    },
    {
      id: "evidence-002",
      run: async () => {
        const input = await loadInput("evidence-002-claim-source-binding");
        const searchInput = input.input as { query: string; limit: number };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);
        const provider = new MockEvidenceSearchProvider();
        const tool = new WebEvidenceSearchTool(provider);

        // Register tool
        runtime.register(tool.getManifest(), tool.getExecutor());

        // Create plan and invoke
        const plan = runtime.createPlan({
          toolName: "web_evidence_search",
          args: searchInput,
          reason: "Evidence search eval",
          requestedBy: { type: "assistant" },
        });
        const result = await runtime.invoke(plan);

        const packet = result.output as any;
        const claims = packet?.packet?.extractedClaims || [];
        const items = packet?.packet?.results || [];
        const itemIds = new Set(items.map((item: any) => item.id));

        // Check all claims have valid source binding
        const allClaimsSourceBound = claims.every(
          (claim: any) =>
            claim.sourceItemIds &&
            claim.sourceItemIds.length > 0 &&
            claim.sourceItemIds.every((id: string) => itemIds.has(id))
        );

        const bindingRate =
          claims.length > 0
            ? claims.filter(
                (c: any) =>
                  c.sourceItemIds &&
                  c.sourceItemIds.length > 0 &&
                  c.sourceItemIds.every((id: string) => itemIds.has(id))
              ).length / claims.length
            : 1.0;

        return {
          testId: "evidence-002",
          hasPacket: !!result.output,
          allClaimsSourceBound,
          bindingRate,
        };
      },
    },
    {
      id: "evidence-003",
      run: async () => {
        const input = await loadInput("evidence-003-empty-results");
        const searchInput = input.input as { query: string; limit: number };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Create empty mock provider
        const emptyProvider = {
          name: "empty_mock",
          async search() {
            return [];
          },
        };
        const tool = new WebEvidenceSearchTool(emptyProvider);

        // Register tool
        runtime.register(tool.getManifest(), tool.getExecutor());

        // Create plan and invoke
        const plan = runtime.createPlan({
          toolName: "web_evidence_search",
          args: searchInput,
          reason: "Evidence search eval",
          requestedBy: { type: "assistant" },
        });
        const result = await runtime.invoke(plan);

        const packet = result.output as any;

        return {
          testId: "evidence-003",
          hasPacket: !!result.output,
          resultCount: packet?.packet?.results?.length || 0,
          claimCount: packet?.packet?.extractedClaims?.length || 0,
          uncertainty: packet?.packet?.uncertainty,
        };
      },
    },
    {
      id: "evidence-004",
      run: async () => {
        const input = await loadInput("evidence-004-ranking");
        const searchInput = input.input as { query: string; limit: number };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);
        const provider = new MockEvidenceSearchProvider();
        const tool = new WebEvidenceSearchTool(provider);

        // Register tool
        runtime.register(tool.getManifest(), tool.getExecutor());

        // Create plan and invoke
        const plan = runtime.createPlan({
          toolName: "web_evidence_search",
          args: searchInput,
          reason: "Evidence search eval",
          requestedBy: { type: "assistant" },
        });
        const result = await runtime.invoke(plan);

        const packet = result.output as any;
        const results = packet?.packet?.results || [];

        // Check if sorted by score descending
        let isSorted = true;
        for (let i = 1; i < results.length; i++) {
          if (results[i].score > results[i - 1].score) {
            isSorted = false;
            break;
          }
        }

        return {
          testId: "evidence-004",
          hasPacket: !!result.output,
          firstResultTitle: results[0]?.title || "",
          isSorted,
        };
      },
    },
    {
      id: "evidence-005",
      run: async () => {
        const input = await loadInput("evidence-005-tool-runtime-audit");
        const searchInput = input.input as { query: string; limit: number };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);
        const provider = new MockEvidenceSearchProvider();
        const tool = new WebEvidenceSearchTool(provider);

        // Register tool
        runtime.register(tool.getManifest(), tool.getExecutor());

        // Create plan and invoke
        const plan = runtime.createPlan({
          toolName: "web_evidence_search",
          args: searchInput,
          reason: "Evidence search eval",
          requestedBy: { type: "assistant" },
        });
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "evidence-005",
          hasPacket: !!result.output,
          toolInvocationStatus: result.status,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const { isCi } = parseArgs();

  console.log("Starting Evidence Search eval...");
  console.log(`CI: ${isCi}`);
  console.log("");

  // Clean up test workspace
  if (existsSync(TEST_WORKSPACE)) {
    await rm(TEST_WORKSPACE, { recursive: true });
  }

  const testCases = createTestCases();
  const results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }> = [];

  for (const testCase of testCases) {
    console.log(`Running ${testCase.id}...`);

    // Clean up test workspace before each test
    if (existsSync(TEST_WORKSPACE)) {
      await rm(TEST_WORKSPACE, { recursive: true });
    }

    try {
      const actual = await testCase.run();
      const expected = await loadExpected(testCase.id);

      // Compare results
      const failures: string[] = [];
      for (const key of Object.keys(expected)) {
        if (key === "testId" || key === "description") continue;
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
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

  // Clean up test workspace
  if (existsSync(TEST_WORKSPACE)) {
    await rm(TEST_WORKSPACE, { recursive: true });
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
