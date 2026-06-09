/**
 * RollbackStore — save and retrieve rollback snapshots.
 *
 * PR-11: InMemoryRollbackStore for testing.
 */

export interface RollbackSnapshot {
  rollbackId: string;
  targetPath: string;
  previousHash: string;
  previousContent: string;
  createdAt: string;
  reason: string;
}

export interface RollbackStore {
  createSnapshot(args: {
    targetPath: string;
    previousHash: string;
    previousContent: string;
    reason: string;
  }): Promise<RollbackSnapshot>;

  getSnapshot(rollbackId: string): Promise<RollbackSnapshot | null>;
}

let nextId = 0;

function generateRollbackId(): string {
  return `rb_${Date.now()}_${++nextId}`;
}

export class InMemoryRollbackStore implements RollbackStore {
  private snapshots = new Map<string, RollbackSnapshot>();

  async createSnapshot(args: {
    targetPath: string;
    previousHash: string;
    previousContent: string;
    reason: string;
  }): Promise<RollbackSnapshot> {
    const snapshot: RollbackSnapshot = {
      rollbackId: generateRollbackId(),
      targetPath: args.targetPath,
      previousHash: args.previousHash,
      previousContent: args.previousContent,
      createdAt: new Date().toISOString(),
      reason: args.reason,
    };
    this.snapshots.set(snapshot.rollbackId, snapshot);
    return snapshot;
  }

  async getSnapshot(rollbackId: string) {
    return this.snapshots.get(rollbackId) ?? null;
  }
}
