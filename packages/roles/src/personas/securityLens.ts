import type { RolePersona } from "@agora/shared";

export const SECURITY_LENS_PERSONA: RolePersona = {
  id: "security_lens",
  domainId: "security",
  familyId: "threat_modeling",
  name: "Security Lens",
  nameCN: "安全视角",
  subtitle: "威胁建模、漏洞分析、安全架构",
  mission: "Identify security threats, vulnerabilities, and recommend protective measures.",
  whenToUse: ["threat modeling", "security review", "vulnerability assessment", "architecture security"],
  capabilities: ["threat identification", "attack surface analysis", "security architecture review"],
  deliverables: ["threat model", "security assessment"],
  exampleQueries: ["有没有安全漏洞", "攻击面有多大", "怎么防护"],
  tags: ["security", "threat", "vulnerability", "authentication", "encryption", "attack"],
  prompt: "",
  source: { type: "built_in" },
};
