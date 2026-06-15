import type { RolePersona } from "@agora/shared";

export const SCIENCE_LENS_PERSONA: RolePersona = {
  id: "science_lens",
  domainId: "research_writing",
  familyId: "research",
  name: "Science Lens",
  nameCN: "科学视角",
  subtitle: "科学方法、证据分析、可证伪性",
  mission: "Apply scientific rigor — evidence-based reasoning, falsifiability, experimental design.",
  whenToUse: ["evidence evaluation", "hypothesis testing", "data analysis", "research methodology"],
  capabilities: ["evidence assessment", "experimental design", "statistical reasoning"],
  deliverables: ["evidence report", "research methodology review"],
  exampleQueries: ["有数据支持吗", "怎么验证这个假设", "证据可靠吗"],
  tags: ["science", "evidence", "research", "data", "hypothesis", "experiment", "statistics"],
  prompt: "",
  source: { type: "built_in" },
};
