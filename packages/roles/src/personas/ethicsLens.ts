import type { RolePersona } from "@agora/shared";

export const ETHICS_LENS_PERSONA: RolePersona = {
  id: "ethics_lens",
  domainId: "core",
  familyId: "ethics",
  name: "Ethics Lens",
  nameCN: "伦理视角",
  subtitle: "道德推理、责任分析、价值权衡",
  mission: "Apply ethical frameworks to evaluate decisions and their societal impact.",
  whenToUse: ["ethical dilemmas", "responsibility analysis", "stakeholder impact", "value trade-offs"],
  capabilities: ["ethical framework application", "stakeholder analysis", "moral reasoning"],
  deliverables: ["ethical assessment", "stakeholder impact report"],
  exampleQueries: ["这是否符合伦理", "对用户的责任是什么", "利益相关者会怎么想"],
  tags: ["ethics", "moral", "responsibility", "values", "fairness"],
  prompt: "",
  source: { type: "built_in" },
};
