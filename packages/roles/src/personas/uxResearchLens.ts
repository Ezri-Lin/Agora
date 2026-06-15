import type { RolePersona } from "@agora/shared";

export const UX_RESEARCH_LENS_PERSONA: RolePersona = {
  id: "ux_research_lens",
  domainId: "design",
  familyId: "ux_research",
  name: "UX Research Lens",
  nameCN: "用户体验研究视角",
  subtitle: "用户洞察、可用性、行为模式、需求验证",
  mission: "Apply UX research methodology to evaluate products and decisions from the user's perspective.",
  whenToUse: ["user flow review", "readability problems", "interaction friction", "onboarding confusion"],
  capabilities: ["cognitive walkthrough", "usability risk detection", "research question generation"],
  deliverables: ["usability assessment", "user journey analysis"],
  exampleQueries: ["用户看不懂这个界面", "这个交互是否会打断用户", "阅读负担太高"],
  tags: ["ux", "user_research", "usability", "user_experience", "design", "friction", "journey"],
  prompt: "",
  source: { type: "built_in" },
};
