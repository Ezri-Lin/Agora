/**
 * run-memory-store-eval — Memory Store eval 入口
 *
 * 用法：
 *   tsx eval/run-memory-store-eval.ts
 *   tsx eval/run-memory-store-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { LocalMemoryStore } from "../packages/kernel/src/memory/LocalMemoryStore.js";
import type { MemoryCandidate } from "../packages/kernel/src/memory/MemoryCandidate.js";
import type { MemoryStatusUpdate } from "../packages/kernel/src/memory/MemoryStoreTypes.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "memory-store");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "memory-store");
const TEST_WORKSPACE = join(ROOT_DIR, ".test-memory-store");

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
      id: "store-001",
      run: async () => {
        const input = await loadInput("store-001-append-candidate");
        const candidate = input.candidate as MemoryCandidate;
        const store = new LocalMemoryStore(TEST_WORKSPACE);

        try {
          await store.appendCandidate(candidate);

          // Verify candidate was persisted
          const list = await store.list({ status: ["candidate"] });
          const found = list.find((c) => c.id === candidate.id);

          // Verify audit event
          const auditLog = await store.getAuditLog(candidate.id);

          return {
            testId: "store-001",
            passed: !!found,
            candidatePersisted: !!found,
            auditEventCreated: auditLog.length > 0,
            auditEventType: auditLog[0]?.event,
          };
        } catch (error) {
          return {
            testId: "store-001",
            passed: false,
            error: String(error),
          };
        }
      },
    },
    {
      id: "store-002",
      run: async () => {
        const input = await loadInput("store-002-reject-source-less");
        const candidate = input.candidate as MemoryCandidate;
        const store = new LocalMemoryStore(TEST_WORKSPACE);

        try {
          let rejected = false;
          let rejectionReason = "";

          try {
            await store.appendCandidate(candidate);
          } catch (error) {
            rejected = true;
            rejectionReason = String(error);
          }

          // Verify no files were mutated
          const list = await store.list();
          const found = list.find((c) => c.id === candidate.id);

          return {
            testId: "store-002",
            passed: rejected && !found,
            candidateRejected: rejected,
            rejectionReason,
            noFileMutated: !found,
          };
        } catch (error) {
          return {
            testId: "store-002",
            passed: false,
            error: String(error),
          };
        }
      },
    },
    {
      id: "store-003",
      run: async () => {
        const input = await loadInput("store-003-status-transition");
        const candidate = input.candidate as MemoryCandidate;
        const statusUpdate = input.statusUpdate as MemoryStatusUpdate;
        const store = new LocalMemoryStore(TEST_WORKSPACE);

        try {
          // First append candidate
          await store.appendCandidate(candidate);

          // Verify candidate was persisted (before status update)
          const candidateListBefore = await store.list({ status: ["candidate"] });
          const candidateFoundBefore = candidateListBefore.find((c) => c.id === candidate.id);

          // Then update status
          await store.updateStatus(statusUpdate);

          // Verify accepted record (after status update)
          const acceptedList = await store.list({ status: ["accepted"] });
          const acceptedFound = acceptedList.find((c) => c.id === candidate.id);

          // Verify audit events
          const auditLog = await store.getAuditLog(candidate.id);
          const statusChangeEvent = auditLog.find(
            (e) => e.event === "memory_accepted"
          );

          return {
            testId: "store-003",
            passed: !!candidateFoundBefore && !!acceptedFound && !!statusChangeEvent,
            candidatePersisted: !!candidateFoundBefore,
            statusTransitionRecorded: !!statusChangeEvent,
            acceptedRecordCreated: !!acceptedFound,
            auditEventCreated: auditLog.length > 0,
            auditEventType: statusChangeEvent?.event,
          };
        } catch (error) {
          return {
            testId: "store-003",
            passed: false,
            error: String(error),
          };
        }
      },
    },
    {
      id: "store-004",
      run: async () => {
        const input = await loadInput("store-004-audit-log");
        const candidate = input.candidate as MemoryCandidate;
        const statusUpdate = input.statusUpdate as MemoryStatusUpdate;
        const store = new LocalMemoryStore(TEST_WORKSPACE);

        try {
          // Append candidate
          await store.appendCandidate(candidate);

          // Update status to rejected
          await store.updateStatus(statusUpdate);

          // Verify audit log
          const auditLog = await store.getAuditLog(candidate.id);
          const eventTypes = auditLog.map((e) => e.event);

          return {
            testId: "store-004",
            passed: auditLog.length === 2 && eventTypes.includes("candidate_created") && eventTypes.includes("memory_rejected"),
            candidatePersisted: true,
            statusTransitionRecorded: true,
            auditLogCount: auditLog.length,
            auditEvents: eventTypes,
          };
        } catch (error) {
          return {
            testId: "store-004",
            passed: false,
            error: String(error),
          };
        }
      },
    },
    {
      id: "store-005",
      run: async () => {
        const input = await loadInput("store-005-no-raw-chat");
        const candidate = input.candidate as MemoryCandidate;
        const store = new LocalMemoryStore(TEST_WORKSPACE);

        try {
          let rejected = false;
          let rejectionReason = "";

          try {
            await store.appendCandidate(candidate);
          } catch (error) {
            rejected = true;
            rejectionReason = String(error);
          }

          // Verify no files were mutated
          const list = await store.list();
          const found = list.find((c) => c.id === candidate.id);

          return {
            testId: "store-005",
            passed: rejected && !found,
            candidateRejected: rejected,
            rejectionReason,
            noFileMutated: !found,
          };
        } catch (error) {
          return {
            testId: "store-005",
            passed: false,
            error: String(error),
          };
        }
      },
    },
  ];
}

// === Main ===

async function main() {
  const { isCi } = parseArgs();

  console.log("Starting Memory Store eval...");
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
