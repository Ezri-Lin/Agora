/**
 * ProvenanceTracker — 来源链追踪
 *
 * 管理记忆的来源链，支持来源验证和推导关系
 * Provenance 作为旁路索引，不侵入 MemoryCandidate
 */

import type {
  ProvenanceSource,
  ProvenanceChain,
  ProvenanceValidation,
  ProvenanceStatus,
  RationaleStep,
} from "./graphTypes.js";

export interface ProvenanceStoreConfig {
  dataDir: string;
}

export const DEFAULT_PROVENANCE_CONFIG: ProvenanceStoreConfig = {
  dataDir: ".agora/memory/provenance",
};

interface ProvenanceRecord {
  memoryId: string;
  sources: ProvenanceSource[];
  derivedFrom: string[];
  rationaleSteps: RationaleStep[];
  createdAt: string;
  updatedAt: string;
}

export class ProvenanceTracker {
  private records = new Map<string, ProvenanceRecord>();

  /**
   * 附加来源到记忆
   */
  async attach(memoryId: string, sources: ProvenanceSource[]): Promise<void> {
    const existing = this.records.get(memoryId);
    if (existing) {
      existing.sources.push(...sources);
      existing.updatedAt = new Date().toISOString();
    } else {
      this.records.set(memoryId, {
        memoryId,
        sources,
        derivedFrom: [],
        rationaleSteps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 添加推导关系
   */
  async addDerivation(memoryId: string, parentId: string): Promise<void> {
    const existing = this.records.get(memoryId);
    if (existing) {
      if (!existing.derivedFrom.includes(parentId)) {
        existing.derivedFrom.push(parentId);
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      this.records.set(memoryId, {
        memoryId,
        sources: [],
        derivedFrom: [parentId],
        rationaleSteps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 添加 rationale step
   */
  async addRationaleStep(
    memoryId: string,
    step: RationaleStep
  ): Promise<void> {
    const existing = this.records.get(memoryId);
    if (existing) {
      existing.rationaleSteps.push(step);
      existing.updatedAt = new Date().toISOString();
    } else {
      this.records.set(memoryId, {
        memoryId,
        sources: [],
        derivedFrom: [],
        rationaleSteps: [step],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 获取完整 provenance chain
   */
  async getChain(memoryId: string): Promise<ProvenanceChain> {
    const record = this.records.get(memoryId);

    if (!record) {
      // Legacy memory without provenance
      return {
        memoryId,
        provenanceStatus: "missing_legacy",
        sources: [],
        derivedFrom: [],
        rationaleSteps: [],
      };
    }

    const provenanceStatus = this.calculateStatus(record);

    return {
      memoryId,
      provenanceStatus,
      sources: record.sources,
      derivedFrom: record.derivedFrom,
      rationaleSteps: record.rationaleSteps,
    };
  }

  /**
   * 验证 provenance 完整性
   */
  async validate(memoryId: string): Promise<ProvenanceValidation> {
    const chain = await this.getChain(memoryId);
    const issues: string[] = [];

    if (chain.provenanceStatus === "missing_legacy") {
      issues.push("Legacy memory without provenance");
    }

    if (chain.sources.length === 0) {
      issues.push("No provenance sources attached");
    }

    // Check source content hashes
    for (const source of chain.sources) {
      if (!source.contentHash) {
        issues.push(`Source ${source.ref} missing contentHash`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * 检查记忆是否有 provenance
   */
  hasProvenance(memoryId: string): boolean {
    return this.records.has(memoryId);
  }

  /**
   * 获取 provenance 状态
   */
  getProvenanceStatus(memoryId: string): ProvenanceStatus {
    const record = this.records.get(memoryId);
    if (!record) return "missing_legacy";
    return this.calculateStatus(record);
  }

  // === Private ===

  private calculateStatus(record: ProvenanceRecord): ProvenanceStatus {
    if (record.sources.length === 0) {
      return "partial";
    }

    // Check if all sources have content hashes
    const allHashed = record.sources.every((s) => !!s.contentHash);
    if (!allHashed) {
      return "partial";
    }

    return "complete";
  }
}
