import type { RoleCard, RolePersona } from "@agora/shared";

const TYPE_TO_DOMAIN: Record<string, string> = {
  moderator: "core",
  critic: "core",
  historian: "core",
  strategist: "product_strategy",
  architect: "engineering",
  lens: "core",
};

function inferDomain(role: RoleCard): string {
  if (role.domainId) return role.domainId;
  // Infer from tag hints
  const tagStr = role.tags.join(" ").toLowerCase();
  if (tagStr.includes("ux") || tagStr.includes("design")) return "design";
  if (tagStr.includes("security")) return "security";
  if (tagStr.includes("legal")) return "legal_compliance";
  if (tagStr.includes("marketing") || tagStr.includes("growth")) return "marketing";
  if (tagStr.includes("writing") || tagStr.includes("narrative")) return "research_writing";
  if (tagStr.includes("economics") || tagStr.includes("business")) return "product_strategy";
  return TYPE_TO_DOMAIN[role.type] ?? "core";
}

export function roleCardToPersona(role: RoleCard): RolePersona {
  return {
    id: role.personaId ?? role.id,
    domainId: inferDomain(role),
    familyId: role.familyId ?? role.id,
    name: role.name,
    nameCN: role.nameCN,
    subtitle: role.subtitle,
    mission: role.subtitle || role.name,
    whenToUse: [...role.tags],
    capabilities: [...role.tags],
    deliverables: [],
    exampleQueries: [],
    tags: [...role.tags],
    prompt: role.systemPrompt,
    source: { type: "built_in" },
  };
}

export function roleCardsToPersonas(roles: RoleCard[]): RolePersona[] {
  return roles.map(roleCardToPersona);
}
