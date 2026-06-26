/**
 * ProvenanceTracker 测试
 */

import { describe, it, expect } from "vitest";
import { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import type { ProvenanceSource } from "../memory/graphTypes.js";

function createSource(ref: string): ProvenanceSource {
  return {
    type: "message",
    ref,
    excerpt: `Excerpt from ${ref}`,
    timestamp: new Date().toISOString(),
    trustLevel: "user_provided",
    contentHash: `hash-${ref}`,
  };
}

describe("ProvenanceTracker", () => {
  it("should attach sources to memory", async () => {
    const tracker = new ProvenanceTracker();
    const sources = [createSource("msg-1"), createSource("msg-2")];

    await tracker.attach("mem-1", sources);

    const chain = await tracker.getChain("mem-1");
    expect(chain.sources).toHaveLength(2);
    expect(chain.provenanceStatus).toBe("complete");
  });

  it("should return missing_legacy for unknown memory", async () => {
    const tracker = new ProvenanceTracker();

    const chain = await tracker.getChain("mem-unknown");
    expect(chain.provenanceStatus).toBe("missing_legacy");
    expect(chain.sources).toHaveLength(0);
  });

  it("should add derivation relationship", async () => {
    const tracker = new ProvenanceTracker();

    await tracker.addDerivation("mem-1", "mem-0");

    const chain = await tracker.getChain("mem-1");
    expect(chain.derivedFrom).toContain("mem-0");
  });

  it("should add rationale steps", async () => {
    const tracker = new ProvenanceTracker();

    await tracker.addRationaleStep("mem-1", {
      step: 1,
      summary: "Initial analysis",
      evidenceRefs: ["msg-1"],
      confidence: 0.8,
    });

    const chain = await tracker.getChain("mem-1");
    expect(chain.rationaleSteps).toHaveLength(1);
    expect(chain.rationaleSteps[0].summary).toBe("Initial analysis");
  });

  it("should validate provenance completeness", async () => {
    const tracker = new ProvenanceTracker();

    // Missing legacy
    const validation1 = await tracker.validate("mem-unknown");
    expect(validation1.valid).toBe(false);
    expect(validation1.issues).toContain("Legacy memory without provenance");

    // Complete (source with contentHash)
    await tracker.attach("mem-1", [createSource("msg-1")]);
    const validation2 = await tracker.validate("mem-1");
    expect(validation2.valid).toBe(true);
  });

  it("should handle partial provenance", async () => {
    const tracker = new ProvenanceTracker();

    // Source without contentHash
    await tracker.attach("mem-1", [{
      type: "message",
      ref: "msg-1",
      excerpt: "test",
      timestamp: new Date().toISOString(),
    }]);

    const chain = await tracker.getChain("mem-1");
    expect(chain.provenanceStatus).toBe("partial");
  });
});
