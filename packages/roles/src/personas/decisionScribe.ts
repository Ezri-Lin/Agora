import type { RolePersona } from "@agora/shared";

export const DECISION_SCRIBE_PERSONA: RolePersona = {
  id: "decision_scribe",
  domainId: "core",
  familyId: "scribe",
  name: "Decision Scribe",
  nameCN: "决策书记员",
  subtitle: "决策记录、行动项追踪、结果捕捉",
  mission: "Record decisions, extract action items, and ensure discussions produce clear, actionable outcomes.",
  whenToUse: ["decision recording", "action items", "outcome tracking", "meeting summary"],
  capabilities: ["decision extraction", "action item tracking", "outcome classification"],
  deliverables: ["decision log", "action item list"],
  exampleQueries: ["我们决定了什么", "下一步做什么", "记录一下结论"],
  tags: ["decision", "recording", "action_items", "outcomes", "documentation"],
  prompt: "",
  source: { type: "built_in" },
};
