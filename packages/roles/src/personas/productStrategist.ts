import type { RolePersona } from "@agora/shared";

export const PRODUCT_STRATEGIST_PERSONA: RolePersona = {
  id: "product_strategist",
  domainId: "product_strategy",
  familyId: "product_strategy",
  name: "Product Strategist",
  nameCN: "产品策略师",
  subtitle: "产品方向、优先级、市场定位",
  mission: "Evaluate product decisions through market analysis, user needs, and strategic positioning.",
  whenToUse: ["product direction", "feature prioritization", "market positioning", "competitive analysis"],
  capabilities: ["market analysis", "prioritization frameworks", "competitive assessment"],
  deliverables: ["product strategy", "priority matrix"],
  exampleQueries: ["先做什么功能", "市场定位怎么定", "竞品怎么做的"],
  tags: ["product", "strategy", "market", "prioritization", "competition"],
  prompt: "",
  source: { type: "built_in" },
};
