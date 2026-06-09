import { describe, it, expect } from "vitest";
import { classifyDocumentChangeRisk, createDocumentChangePlan } from "../documentWrite/DocumentChangePlanner.js";
import { buildDocumentPatch } from "../documentWrite/DocumentPatchBuilder.js";
import { createDiffPreview } from "../documentWrite/DiffPreview.js";
import type { DocumentChangePlan } from "../documentWrite/types.js";

describe("classifyDocumentChangeRisk", () => {
  it("append_section classified low risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "append_section" })).toBe("low");
  });

  it("create_document classified low risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "create_document" })).toBe("low");
  });

  it("update_section classified medium risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "update_section" })).toBe("medium");
  });

  it("replace_section classified medium risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "replace_section" })).toBe("medium");
  });

  it("insert_after classified medium risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "insert_after" })).toBe("medium");
  });

  it("rename_heading classified medium risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "rename_heading" })).toBe("medium");
  });

  it("delete_section classified high risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "delete_section" })).toBe("high");
  });

  it("rewrite_document classified high risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "rewrite_document" })).toBe("high");
  });

  it("code target classified high risk regardless of mode", () => {
    expect(classifyDocumentChangeRisk({ mode: "append_section", targetKind: "code" })).toBe("high");
    expect(classifyDocumentChangeRisk({ mode: "update_section", targetKind: "code" })).toBe("high");
  });

  it("many affected sections classified high risk", () => {
    expect(classifyDocumentChangeRisk({ mode: "update_section", affectedSectionCount: 4 })).toBe("high");
    expect(classifyDocumentChangeRisk({ mode: "update_section", affectedSectionCount: 3 })).toBe("medium");
  });
});

describe("createDocumentChangePlan", () => {
  it("fills rollbackStrategy", () => {
    const plan = createDocumentChangePlan({
      targetPath: "/docs/test.md",
      mode: "append_section",
      intent: "Add new section",
    });

    expect(plan.rollbackStrategy).toBeDefined();
    expect(plan.rollbackStrategy.length).toBeGreaterThan(0);
  });

  it("high risk plan has manual review rollback", () => {
    const plan = createDocumentChangePlan({
      targetPath: "/docs/test.md",
      mode: "delete_section",
      intent: "Remove old section",
    });

    expect(plan.riskLevel).toBe("high");
    expect(plan.rollbackStrategy).toContain("manual review");
  });

  it("low risk plan has safe rollback", () => {
    const plan = createDocumentChangePlan({
      targetPath: "/docs/test.md",
      mode: "append_section",
      intent: "Add section",
    });

    expect(plan.riskLevel).toBe("low");
    expect(plan.rollbackStrategy).toContain("Safe");
  });

  it("generates stable ID", () => {
    const args = {
      targetPath: "/docs/test.md",
      mode: "append_section" as const,
      intent: "Add section",
    };
    const plan1 = createDocumentChangePlan(args);
    const plan2 = createDocumentChangePlan(args);

    expect(plan1.id).toBe(plan2.id);
  });

  it("includes affected sections and evidence", () => {
    const plan = createDocumentChangePlan({
      targetPath: "/docs/test.md",
      mode: "update_section",
      intent: "Update cost analysis",
      affectedSections: [{ headingPath: ["Cost", "Infrastructure"], reason: "Outdated numbers" }],
      requiredEvidence: [{ sourceId: "doc_aws", claim: "AWS costs reduced 30%" }],
    });

    expect(plan.affectedSections).toHaveLength(1);
    expect(plan.affectedSections[0].headingPath).toEqual(["Cost", "Infrastructure"]);
    expect(plan.requiredEvidence).toHaveLength(1);
    expect(plan.requiredEvidence[0].sourceId).toBe("doc_aws");
  });

  it("defaults rationale to mode description", () => {
    const plan = createDocumentChangePlan({
      targetPath: "/docs/test.md",
      mode: "append_section",
      intent: "Add section",
    });

    expect(plan.rationale).toContain("append_section");
  });
});

describe("buildDocumentPatch", () => {
  const plan: DocumentChangePlan = {
    id: "plan_123",
    targetPath: "/docs/test.md",
    mode: "update_section",
    intent: "Update",
    rationale: "Test",
    affectedSections: [],
    requiredEvidence: [],
    riskLevel: "medium",
    rollbackStrategy: "Revert",
  };

  it("includes expectedHashBefore", () => {
    const patch = buildDocumentPatch({
      plan,
      currentContent: "old content",
      newText: "new content",
      expectedHashBefore: "abc123",
    });

    expect(patch.expectedHashBefore).toBe("abc123");
  });

  it("includes planId", () => {
    const patch = buildDocumentPatch({
      plan,
      newText: "content",
      expectedHashBefore: "hash",
    });

    expect(patch.planId).toBe("plan_123");
  });

  it("includes mode and targetPath", () => {
    const patch = buildDocumentPatch({
      plan,
      newText: "content",
      expectedHashBefore: "hash",
    });

    expect(patch.mode).toBe("update_section");
    expect(patch.targetPath).toBe("/docs/test.md");
  });

  it("preserves oldText when provided", () => {
    const patch = buildDocumentPatch({
      plan,
      currentContent: "original text",
      newText: "updated text",
      expectedHashBefore: "hash",
    });

    expect(patch.oldText).toBe("original text");
  });

  it("preserves insertionAnchor", () => {
    const patch = buildDocumentPatch({
      plan: { ...plan, mode: "insert_after" },
      newText: "inserted text",
      expectedHashBefore: "hash",
      insertionAnchor: { headingPath: ["Section A"], afterText: "Some text" },
    });

    expect(patch.insertionAnchor).toEqual({
      headingPath: ["Section A"],
      afterText: "Some text",
    });
  });
});

describe("createDiffPreview", () => {
  it("counts additions for append_section", () => {
    const plan: DocumentChangePlan = {
      id: "p1", targetPath: "/docs/test.md", mode: "append_section",
      intent: "Add", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "low", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan, newText: "Line 1\nLine 2\nLine 3", expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch });

    expect(preview.additions).toBe(3);
    expect(preview.deletions).toBe(0);
    expect(preview.diffText).toContain("+ Line 1");
    expect(preview.diffText).toContain("+ Line 3");
  });

  it("counts deletions for delete_section", () => {
    const plan: DocumentChangePlan = {
      id: "p1", targetPath: "/docs/test.md", mode: "delete_section",
      intent: "Delete", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "high", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan,
      currentContent: "Old line 1\nOld line 2",
      newText: "",
      expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch });

    expect(preview.additions).toBe(0);
    expect(preview.deletions).toBe(2);
    expect(preview.diffText).toContain("- Old line 1");
  });

  it("update_section preview includes old and new lines", () => {
    const plan: DocumentChangePlan = {
      id: "p1", targetPath: "/docs/test.md", mode: "update_section",
      intent: "Update", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "medium", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan,
      currentContent: "Keep this\nRemove this",
      newText: "Keep this\nAdd this",
      expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch });

    expect(preview.additions).toBeGreaterThan(0);
    expect(preview.diffText).toContain("+ Add this");
  });

  it("auto-generates summary when not provided", () => {
    const plan: DocumentChangePlan = {
      id: "p1", targetPath: "/docs/test.md", mode: "append_section",
      intent: "Add", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "low", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan, newText: "New line", expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch });

    expect(preview.summary).toContain("Append");
  });

  it("uses custom summary when provided", () => {
    const plan: DocumentChangePlan = {
      id: "p1", targetPath: "/docs/test.md", mode: "append_section",
      intent: "Add", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "low", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan, newText: "content", expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch, summary: "Custom summary" });

    expect(preview.summary).toBe("Custom summary");
  });

  it("risk level matches mode", () => {
    const modes: Array<{ mode: DocumentChangePlan["mode"]; expected: "low" | "medium" | "high" }> = [
      { mode: "create_document", expected: "low" },
      { mode: "append_section", expected: "low" },
      { mode: "update_section", expected: "medium" },
      { mode: "delete_section", expected: "high" },
      { mode: "rewrite_document", expected: "high" },
    ];

    for (const { mode, expected } of modes) {
      const plan: DocumentChangePlan = {
        id: "p1", targetPath: "/docs/test.md", mode,
        intent: "Test", rationale: "", affectedSections: [],
        requiredEvidence: [], riskLevel: expected, rollbackStrategy: "",
      };
      const patch = buildDocumentPatch({
        plan, newText: "content", expectedHashBefore: "h",
      });
      const preview = createDiffPreview({ patch });
      expect(preview.riskLevel).toBe(expected);
    }
  });

  it("includes targetPath and patchId", () => {
    const plan: DocumentChangePlan = {
      id: "plan_xyz", targetPath: "/docs/arch.md", mode: "append_section",
      intent: "Add", rationale: "", affectedSections: [],
      requiredEvidence: [], riskLevel: "low", rollbackStrategy: "",
    };
    const patch = buildDocumentPatch({
      plan, newText: "content", expectedHashBefore: "h",
    });

    const preview = createDiffPreview({ patch });

    expect(preview.patchId).toBe("plan_xyz");
    expect(preview.targetPath).toBe("/docs/arch.md");
  });
});
