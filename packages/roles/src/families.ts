import type { RoleFamily } from "@agora/shared";

export const BUILT_IN_FAMILIES: RoleFamily[] = [
  // Core
  { id: "moderator", domainId: "core", name: "Moderator", nameCN: "主持人", description: "Facilitates discussion", tags: ["facilitation", "moderation"], enabledByDefault: true },
  { id: "critic", domainId: "core", name: "Critic", nameCN: "批评者", description: "Challenges assumptions, finds weaknesses", tags: ["criticism", "counterargument", "risk"], enabledByDefault: true },
  { id: "ethics", domainId: "core", name: "Ethics", nameCN: "伦理", description: "Ethical analysis and moral reasoning", tags: ["ethics", "moral", "responsibility"], enabledByDefault: true },

  // Engineering
  { id: "architecture", domainId: "engineering", name: "Software Architecture", nameCN: "软件架构", description: "System design, scalability, technical decisions", tags: ["architecture", "system_design", "scalability"], enabledByDefault: true },

  // Design
  { id: "ux_research", domainId: "design", name: "UX Research", nameCN: "用户体验研究", description: "Usability, user behavior, cognitive load", tags: ["ux", "usability", "user_research", "design"], enabledByDefault: true },

  // Product & Strategy
  { id: "product_strategy", domainId: "product_strategy", name: "Product Strategy", nameCN: "产品策略", description: "Product direction, taste, prioritization", tags: ["product", "strategy", "taste", "prioritization"], enabledByDefault: true },
  { id: "business_model", domainId: "product_strategy", name: "Business Model", nameCN: "商业模式", description: "Business analysis, mental models, valuation", tags: ["business", "economics", "valuation", "mental_models"], enabledByDefault: true },
  { id: "growth", domainId: "product_strategy", name: "Growth", nameCN: "增长", description: "Acquisition, retention, experimentation", tags: ["growth", "marketing", "acquisition", "retention"], enabledByDefault: true },

  // Marketing
  { id: "marketing_growth", domainId: "marketing", name: "Growth Marketing", nameCN: "增长营销", description: "Content, SEO, paid media, social", tags: ["marketing", "content", "seo", "growth"], enabledByDefault: false },

  // Legal & Compliance
  { id: "contract_risk", domainId: "legal_compliance", name: "Contract Risk", nameCN: "合同风险", description: "Legal risk, contracts, compliance", tags: ["legal", "contract", "compliance", "risk"], enabledByDefault: false },

  // Security
  { id: "threat_modeling", domainId: "security", name: "Threat Modeling", nameCN: "威胁建模", description: "Security threats, vulnerabilities, risk assessment", tags: ["security", "threat", "vulnerability", "risk"], enabledByDefault: false },

  // Research & Writing
  { id: "writing", domainId: "research_writing", name: "Technical Writing", nameCN: "技术写作", description: "Documentation, specs, narrative", tags: ["writing", "documentation", "narrative", "spec"], enabledByDefault: false },
  { id: "research", domainId: "research_writing", name: "Research Analysis", nameCN: "研究分析", description: "Scientific method, evidence analysis", tags: ["research", "science", "analysis", "evidence"], enabledByDefault: false },
];
