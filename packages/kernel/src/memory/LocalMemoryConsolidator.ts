/**
 * LocalMemoryConsolidator — deterministic/policy-based consolidation
 *
 * 设计原则：
 * - append-only status transitions
 * - audit events for every transition
 * - no LLM merge
 * - no semantic dedupe
 * - dryRun support
 */

import type {
  MemoryConsolidator,
  SupersedeInput,
  ExpireInput,
  ContradictInput,
  DeduplicateInput,
  MemoryConsolidationResult,
  MemoryConsolidationTrace,
  ConsolidationAction,
} from "./MemoryConsolidationTypes.js";
import type { MemoryStore } from "./MemoryStoreTypes.js";
import { MemoryConsolidationPolicy } from "./MemoryConsolidationPolicy.js";

// === LocalMemoryConsolidator ===

export class LocalMemoryConsolidator implements MemoryConsolidator {
  private store: MemoryStore;
  private policy: MemoryConsolidationPolicy;

  constructor(store: MemoryStore) {
    this.store = store;
    this.policy = new MemoryConsolidationPolicy(store);
  }

  async supersede(input: SupersedeInput): Promise<MemoryConsolidationResult> {
    const startedAt = new Date().toISOString();
    const { oldId, newId, reason, actor, dryRun = false } = input;

    // Check policy
    const check = await this.policy.checkSupersede(oldId, newId);
    if (!check.allowed) {
      return this.createNoopResult(startedAt, "supersede", check.error || "Policy check failed", dryRun);
    }

    // Dry run: return without mutation
    if (dryRun) {
      return this.createResult({
        startedAt,
        action: "supersede",
        affectedMemoryIds: [oldId],
        auditEventIds: [],
        scanned: 2,
        matched: 1,
        reason,
        dryRun: true,
      });
    }

    // Execute supersede
    const auditEventIds: string[] = [];

    // Update old memory status to superseded
    await this.store.updateStatus({
      id: oldId,
      status: "superseded",
      reason: `Superseded by ${newId}: ${reason}`,
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
    });

    // Get audit event ID
    const auditLog = await this.store.getAuditLog(oldId);
    const lastEvent = auditLog[auditLog.length - 1];
    if (lastEvent) {
      auditEventIds.push(lastEvent.id);
    }

    return this.createResult({
      startedAt,
      action: "supersede",
      affectedMemoryIds: [oldId],
      auditEventIds,
      scanned: 2,
      matched: 1,
      reason,
      dryRun: false,
    });
  }

  async expire(input: ExpireInput): Promise<MemoryConsolidationResult> {
    const startedAt = new Date().toISOString();
    const { id, reason, actor, dryRun = false } = input;

    // Check policy
    const check = await this.policy.checkExpire(id);
    if (!check.allowed) {
      return this.createNoopResult(startedAt, "expire", check.error || "Policy check failed", dryRun);
    }

    // Dry run: return without mutation
    if (dryRun) {
      return this.createResult({
        startedAt,
        action: "expire",
        affectedMemoryIds: [id],
        auditEventIds: [],
        scanned: 1,
        matched: 1,
        reason,
        dryRun: true,
      });
    }

    // Execute expire
    await this.store.updateStatus({
      id,
      status: "expired",
      reason,
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
    });

    // Get audit event ID
    const auditLog = await this.store.getAuditLog(id);
    const lastEvent = auditLog[auditLog.length - 1];
    const auditEventIds = lastEvent ? [lastEvent.id] : [];

    return this.createResult({
      startedAt,
      action: "expire",
      affectedMemoryIds: [id],
      auditEventIds,
      scanned: 1,
      matched: 1,
      reason,
      dryRun: false,
    });
  }

  async contradict(input: ContradictInput): Promise<MemoryConsolidationResult> {
    const startedAt = new Date().toISOString();
    const { id, contradictedBy, reason, actor, dryRun = false } = input;

    // Check policy
    const check = await this.policy.checkContradict(id, contradictedBy);
    if (!check.allowed) {
      return this.createNoopResult(startedAt, "contradict", check.error || "Policy check failed", dryRun);
    }

    // Dry run: return without mutation
    if (dryRun) {
      return this.createResult({
        startedAt,
        action: "contradict",
        affectedMemoryIds: [id],
        auditEventIds: [],
        scanned: 2,
        matched: 1,
        reason: `Contradicted by ${contradictedBy}: ${reason}`,
        dryRun: true,
      });
    }

    // Execute contradict
    await this.store.updateStatus({
      id,
      status: "contradicted",
      reason: `Contradicted by ${contradictedBy}: ${reason}`,
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
    });

    // Get audit event ID
    const auditLog = await this.store.getAuditLog(id);
    const lastEvent = auditLog[auditLog.length - 1];
    const auditEventIds = lastEvent ? [lastEvent.id] : [];

    return this.createResult({
      startedAt,
      action: "contradict",
      affectedMemoryIds: [id],
      auditEventIds,
      scanned: 2,
      matched: 1,
      reason: `Contradicted by ${contradictedBy}: ${reason}`,
      dryRun: false,
    });
  }

  async deduplicate(input: DeduplicateInput): Promise<MemoryConsolidationResult> {
    const startedAt = new Date().toISOString();
    const { candidateId, dryRun = false } = input;

    // Check policy
    const check = await this.policy.checkDeduplicate(candidateId);
    if (!check.allowed) {
      return this.createNoopResult(
        startedAt,
        "deduplicate",
        check.error || "No duplicates found",
        dryRun
      );
    }

    // Dry run: return without mutation
    if (dryRun) {
      return this.createResult({
        startedAt,
        action: "deduplicate",
        affectedMemoryIds: [candidateId],
        auditEventIds: [],
        scanned: check.duplicates.length + 1,
        matched: check.duplicates.length,
        reason: `Duplicate of ${check.duplicates.map((d) => d.id).join(", ")}`,
        dryRun: true,
      });
    }

    // Execute deduplicate: reject the candidate
    await this.store.updateStatus({
      id: candidateId,
      status: "rejected",
      reason: `Duplicate of ${check.duplicates.map((d) => d.id).join(", ")}`,
      decidedBy: "policy",
      decidedAt: new Date().toISOString(),
    });

    // Get audit event ID
    const auditLog = await this.store.getAuditLog(candidateId);
    const lastEvent = auditLog[auditLog.length - 1];
    const auditEventIds = lastEvent ? [lastEvent.id] : [];

    return this.createResult({
      startedAt,
      action: "deduplicate",
      affectedMemoryIds: [candidateId],
      auditEventIds,
      scanned: check.duplicates.length + 1,
      matched: check.duplicates.length,
      reason: `Duplicate of ${check.duplicates.map((d) => d.id).join(", ")}`,
      dryRun: false,
    });
  }

  // === Helpers ===

  private createResult(params: {
    startedAt: string;
    action: ConsolidationAction;
    affectedMemoryIds: string[];
    auditEventIds: string[];
    scanned: number;
    matched: number;
    reason: string;
    dryRun: boolean;
  }): MemoryConsolidationResult {
    return {
      action: params.action,
      affectedMemoryIds: params.affectedMemoryIds,
      auditEventIds: params.auditEventIds,
      trace: {
        startedAt: params.startedAt,
        completedAt: new Date().toISOString(),
        scanned: params.scanned,
        matched: params.matched,
        action: params.action,
        reason: params.reason,
        dryRun: params.dryRun,
      },
    };
  }

  private createNoopResult(
    startedAt: string,
    action: ConsolidationAction,
    reason: string,
    dryRun: boolean
  ): MemoryConsolidationResult {
    return {
      action: "noop",
      affectedMemoryIds: [],
      auditEventIds: [],
      trace: {
        startedAt,
        completedAt: new Date().toISOString(),
        scanned: 0,
        matched: 0,
        action,
        reason,
        dryRun,
      },
    };
  }
}
