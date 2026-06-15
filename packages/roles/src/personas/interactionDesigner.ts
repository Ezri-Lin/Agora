import type { RolePersona } from "@agora/shared";

export const INTERACTION_DESIGNER_PERSONA: RolePersona = {
  id: "interaction_designer",
  domainId: "design",
  familyId: "interaction",
  name: "Interaction Designer",
  nameCN: "交互设计师",
  subtitle: "状态流、面板逻辑、信息层级、控件设计",
  mission: "Translate UX problems into concrete interaction solutions — states, controls, and flows.",
  whenToUse: ["state design", "panel behavior", "control logic", "information hierarchy"],
  capabilities: ["state machine design", "interaction pattern specification", "progressive disclosure"],
  deliverables: ["interaction spec", "state flow diagram"],
  exampleQueries: ["这个状态怎么切换", "面板怎么展开收起", "信息怎么分层"],
  tags: ["interaction", "design", "states", "ui", "flow", "controls"],
  prompt: "",
  source: { type: "built_in" },
};
