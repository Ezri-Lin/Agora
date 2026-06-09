import type { RoleDomain } from "@agora/shared";

export const BUILT_IN_DOMAINS: RoleDomain[] = [
  { id: "core", name: "Core", nameCN: "核心", description: "Fundamental discussion roles", enabledByDefault: true },
  { id: "engineering", name: "Engineering", nameCN: "工程", description: "Architecture, code, infrastructure", enabledByDefault: true },
  { id: "design", name: "Design", nameCN: "设计", description: "UX, research, visual design", enabledByDefault: true },
  { id: "product_strategy", name: "Product & Strategy", nameCN: "产品与策略", description: "Product direction, business model, growth", enabledByDefault: true },
  { id: "marketing", name: "Marketing", nameCN: "营销", description: "Content, growth, acquisition", enabledByDefault: false },
  { id: "legal_compliance", name: "Legal & Compliance", nameCN: "法律合规", description: "Contracts, privacy, data compliance", enabledByDefault: false },
  { id: "security", name: "Security", nameCN: "安全", description: "Threat modeling, appsec, infrastructure risk", enabledByDefault: false },
  { id: "research_writing", name: "Research & Writing", nameCN: "研究与写作", description: "Technical writing, research analysis", enabledByDefault: false },
];
