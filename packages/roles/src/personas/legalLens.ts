import type { RolePersona } from "@agora/shared";

export const LEGAL_LENS_PERSONA: RolePersona = {
  id: "legal_lens",
  domainId: "legal_compliance",
  familyId: "contract_risk",
  name: "Legal Risk Lens",
  nameCN: "法律风险视角",
  subtitle: "合同风险、合规审查、知识产权",
  mission: "Identify legal risks, compliance requirements, and contractual obligations.",
  whenToUse: ["contract review", "compliance check", "data privacy", "IP concerns"],
  capabilities: ["risk identification", "compliance assessment", "contract analysis"],
  deliverables: ["legal risk report", "compliance checklist"],
  exampleQueries: ["有没有法律风险", "合规要求是什么", "数据隐私怎么处理"],
  tags: ["legal", "compliance", "contract", "privacy", "data", "ip", "risk"],
  prompt: "",
  source: { type: "built_in" },
};
