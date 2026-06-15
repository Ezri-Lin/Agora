import type { RolePersona } from "@agora/shared";

export const WRITING_EDITOR_PERSONA: RolePersona = {
  id: "writing_editor",
  domainId: "research_writing",
  familyId: "writing",
  name: "Writing Editor",
  nameCN: "文档编辑",
  subtitle: "文档结构、清晰度、规格撰写、摘要生成",
  mission: "Transform discussion outcomes into clear, well-structured documents.",
  whenToUse: ["document drafting", "content editing", "spec writing", "summary generation"],
  capabilities: ["document structuring", "clarity editing", "format adaptation"],
  deliverables: ["document draft", "editing notes"],
  exampleQueries: ["帮我整理成文档", "这段表达清楚吗", "写个规格说明"],
  tags: ["writing", "editing", "documentation", "clarity", "structure"],
  prompt: "",
  source: { type: "built_in" },
};
