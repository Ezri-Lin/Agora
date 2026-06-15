import type { RolePersona } from "@agora/shared";

export const NARRATIVE_LENS_PERSONA: RolePersona = {
  id: "narrative_lens",
  domainId: "research_writing",
  familyId: "writing",
  name: "Narrative Lens",
  nameCN: "叙事视角",
  subtitle: "故事结构、表达清晰度、说服力",
  mission: "Evaluate communication clarity, narrative structure, and persuasive power.",
  whenToUse: ["content clarity", "storytelling", "presentation structure", "messaging"],
  capabilities: ["narrative analysis", "clarity assessment", "structure evaluation"],
  deliverables: ["narrative feedback", "structure recommendations"],
  exampleQueries: ["表达清楚吗", "故事线怎么样", "怎么更有说服力"],
  tags: ["narrative", "storytelling", "communication", "clarity", "writing", "persuasion"],
  prompt: "",
  source: { type: "built_in" },
};
