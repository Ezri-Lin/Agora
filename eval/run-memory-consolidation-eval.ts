/**
 * run-memory-consolidation-eval — Memory Consolidation eval 入口
 *
 * 用法：
 *   tsx eval/run-memory-consolidation-eval.ts
 *   tsx eval/run-memory-consolidation-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { LocalMemoryStore } from "../packages/kernel/src/memory/LocalMemoryStore.js";
import { LocalMemoryConsolidator } from "../packages/kernel/src/memory/LocalMemoryConsolidator.js";
import type { MemoryCandidate } from "../packages/kernel/src/memory/MemoryCandidate.js";
import type {
  SupersedeInput,
  ExpireInput,
  ContradictInput,
  DeduplicateInput,
} from "../packages/kernel/src/memory/MemoryConsolidationTypes.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "memory-consolidation");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "memory-consolidation");
const TEST_WORKSPACE = join(ROOT_DIR, ".test-memory-consolidation");

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
      id: "consolidate-001",
      run: async () => {
        const input = await loadInput("consolidate-001-supersede");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const supersedeInput = input.input as SupersedeInput;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const consolidator = new LocalMemoryConsolidator(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Execute supersede
        const result = await consolidator.supersede(supersedeInput);

        // Verify old memory status
        const oldMemory = await store.getById(supersedeInput.oldId);

        // Verify new memory status
        const newMemory = await store.getById(supersedeInput.newId);

        // Verify audit events
        const auditLog = await store.getAuditLog(supersedeInput.oldId);

        return {
          testId: "consolidate-001",
          action: result.action,
          affectedMemoryIds: result.affectedMemoryIds,
          oldMemoryStatus: oldMemory?.status,
          newMemoryStatus: newMemory?.status,
          auditEventCount: auditLog.length,
          dryRun: result.trace.dryRun,
        };
      },
    },
    {
      id: "consolidate-002",
      run: async () => {
        const input = await loadInput("consolidate-002-expire");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const expireInput = input.input as ExpireInput;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const consolidator = new LocalMemoryConsolidator(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Execute expire
        const result = await consolidator.expire(expireInput);

        // Verify memory status
        const memory = await store.getById(expireInput.id);

        // Verify audit events
        const auditLog = await store.getAuditLog(expireInput.id);

        return {
          testId: "consolidate-002",
          action: result.action,
          affectedMemoryIds: result.affectedMemoryIds,
          memoryStatus: memory?.status,
          auditEventCount: auditLog.length,
          dryRun: result.trace.dryRun,
        };
      },
    },
    {
      id: "consolidate-003",
      run: async () => {
        const input = await loadInput("consolidate-003-contradict");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const contradictInput = input.input as ContradictInput;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const consolidator = new LocalMemoryConsolidator(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Execute contradict
        const result = await consolidator.contradict(contradictInput);

        // Verify memory status
        const memory = await store.getById(contradictInput.id);

        // Verify audit events
        const auditLog = await store.getAuditLog(contradictInput.id);

        return {
          testId: "consolidate-003",
          action: result.action,
          affectedMemoryIds: result.affectedMemoryIds,
          memoryStatus: memory?.status,
          auditEventCount: auditLog.length,
          dryRun: result.trace.dryRun,
        };
      },
    },
    {
      id: "consolidate-004",
      run: async () => {
        const input = await loadInput("consolidate-004-deduplicate");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const deduplicateInput = input.input as DeduplicateInput;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const consolidator = new LocalMemoryConsolidator(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Execute deduplicate
        const result = await consolidator.deduplicate(deduplicateInput);

        // Verify candidate status
        const candidate = await store.getById(deduplicateInput.candidateId);

        // Verify original status
        const original = await store.getById("mem-original-001");

        // Verify audit events
        const auditLog = await store.getAuditLog(deduplicateInput.candidateId);

        return {
          testId: "consolidate-004",
          action: result.action,
          affectedMemoryIds: result.affectedMemoryIds,
          candidateStatus: candidate?.status,
          originalStatus: original?.status,
          auditEventCount: auditLog.length,
          dryRun: result.trace.dryRun,
        };
      },
    },
    {
      id: "consolidate-005",
      run: async () => {
        const input = await loadInput("consolidate-005-dry-run-no-mutation");
        const seedMemories = input.seedMemories as MemoryCandidate[];
        const supersedeInput = input.input as SupersedeInput;

        const store = new LocalMemoryStore(TEST_WORKSPACE);
        const consolidator = new LocalMemoryConsolidator(store);

        // Seed memories
        await store.appendCandidates(seedMemories);

        // Get initial state
        const oldMemoryBefore = await store.getById(supersedeInput.oldId);
        const newMemoryBefore = await store.getById(supersedeInput.newId);

        // Execute supersede with dryRun
        const result = await consolidator.supersede(supersedeInput);

        // Get state after dryRun
        const oldMemoryAfter = await store.getById(supersedeInput.oldId);
        const newMemoryAfter = await store.getById(supersedeInput.newId);

        // Verify no mutation
        const noFileMutated =
          oldMemoryBefore?.status === oldMemoryAfter?.status &&
          newMemoryBefore?.status === newMemoryAfter?.status;

        // Verify audit events (should be 0 for dryRun)
        const auditLog = await store.getAuditLog(supersedeInput.oldId);

        return {
          testId: "consolidate-005",
          action: result.action,
          affectedMemoryIds: result.affectedMemoryIds,
          oldMemoryStatus: oldMemoryAfter?.status,
          newMemoryStatus: newMemoryAfter?.status,
          auditEventCount: auditLog.length,
          dryRun: result.trace.dryRun,
          noFileMutated,
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const { isCi } = parseArgs();

  console.log("Starting Memory Consolidation eval...");
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
