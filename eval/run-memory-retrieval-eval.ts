/**
 * run-memory-retrieval-eval — Memory Retrieval eval 入口
 *
 * 用法：
 *   tsx eval/run-memory-retrieval-eval.ts
 *   tsx eval/run-memory-retrieval-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { LocalMemoryStore } from "../packages/kernel/src/memory/LocalMemoryStore.js";
import { LocalMemoryRetriever } from "../packages/kernel/src/memory/LocalMemoryRetriever.js";
import type { MemoryCandidate } from "../packages/kernel/src/memory/MemoryCandidate.js";
import type { MemoryRetrievalQuery, MemoryRetrievalBudget } from "../packages/kernel/src/memory/MemoryRetrievalTypes.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "memory-retrieval");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "memory-retrieval");
const TEST_WORKSPACE = join(ROOT_DIR, ".test-memory-retrieval");

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
      id: "retrieve-001",
      run: async () => {
        const input = await loadInput("retrieve-001-keyword");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const query = input.query as MemoryRetrievalQuery;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const retriever = new LocalMemoryRetriever(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Retrieve
        const result = await retriever.retrieve(query);

        return {
          testId: "retrieve-001",
          returnedCount: result.memories.length,
          firstMemoryId: result.memories[0]?.candidate.id,
          firstMemoryScore: result.memories[0]?.score,
          firstMemoryMatchedBy: result.memories[0]?.matchedBy,
          budgetApplied: result.trace.budgetApplied,
        };
      },
    },
    {
      id: "retrieve-002",
      run: async () => {
        const input = await loadInput("retrieve-002-filter-status");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const query = input.query as MemoryRetrievalQuery;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const retriever = new LocalMemoryRetriever(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Retrieve
        const result = await retriever.retrieve(query);

        return {
          testId: "retrieve-002",
          returnedCount: result.memories.length,
          firstMemoryId: result.memories[0]?.candidate.id,
          firstMemoryStatus: result.memories[0]?.candidate.status,
          budgetApplied: result.trace.budgetApplied,
        };
      },
    },
    {
      id: "retrieve-003",
      run: async () => {
        const input = await loadInput("retrieve-003-filter-scope-type");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const query = input.query as MemoryRetrievalQuery;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const retriever = new LocalMemoryRetriever(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Retrieve
        const result = await retriever.retrieve(query);

        return {
          testId: "retrieve-003",
          returnedCount: result.memories.length,
          firstMemoryId: result.memories[0]?.candidate.id,
          firstMemoryScope: result.memories[0]?.candidate.scope,
          firstMemoryType: result.memories[0]?.candidate.type,
          budgetApplied: result.trace.budgetApplied,
        };
      },
    },
    {
      id: "retrieve-004",
      run: async () => {
        const input = await loadInput("retrieve-004-exclude-rejected-expired");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const query = input.query as MemoryRetrievalQuery;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const retriever = new LocalMemoryRetriever(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Retrieve (default: exclude terminal statuses)
        const result = await retriever.retrieve(query);

        const returnedIds = result.memories.map((m) => m.candidate.id);
        const returnedStatuses = result.memories.map((m) => m.candidate.status);
        const hasRejected = returnedStatuses.includes("rejected");
        const hasExpired = returnedStatuses.includes("expired");
        const hasSuperseded = returnedStatuses.includes("superseded");

        return {
          testId: "retrieve-004",
          returnedCount: result.memories.length,
          returnedIds,
          excludedStatuses: ["rejected", "expired", "superseded"].filter(
            (s) => !returnedStatuses.includes(s as any)
          ),
          budgetApplied: result.trace.budgetApplied,
        };
      },
    },
    {
      id: "retrieve-005",
      run: async () => {
        const input = await loadInput("retrieve-005-budget-limit");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const query = input.query as MemoryRetrievalQuery;
        const budget = input.budget as MemoryRetrievalBudget;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const retriever = new LocalMemoryRetriever(store, budget);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Retrieve
        const result = await retriever.retrieve(query);

        return {
          testId: "retrieve-005",
          returnedCount: result.memories.length,
          budgetApplied: result.trace.budgetApplied,
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const { isCi } = parseArgs();

  console.log("Starting Memory Retrieval eval...");
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
