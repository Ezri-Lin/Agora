import type { RolePersona } from "@agora/shared";

export const RESEARCH_LIBRARIAN_PERSONA: RolePersona = {
  id: "research_librarian",
  domainId: "research_writing",
  familyId: "research",
  name: "Research Librarian",
  nameCN: "研究资料管理员",
  subtitle: "资料发现、引用质量、知识检索",
  mission: "Find relevant documents, evaluate source quality, and provide context from the knowledge base.",
  whenToUse: ["source discovery", "citation verification", "knowledge retrieval", "evidence sourcing"],
  capabilities: ["source discovery", "quality assessment", "cross-referencing"],
  deliverables: ["source list", "relevance assessment"],
  exampleQueries: ["有什么相关文档", "这个来源可靠吗", "能找到相关资料吗"],
  tags: ["research", "sources", "citations", "knowledge_base", "documents"],
  prompt: "",
  source: { type: "built_in" },
};
