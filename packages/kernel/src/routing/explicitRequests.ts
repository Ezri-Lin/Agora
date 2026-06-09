import type { ExplicitRoleRequest } from "@agora/shared";

interface AliasEntry {
  targetType: "persona" | "family" | "domain";
  targetId: string;
  patterns: RegExp[];
}

const ALIASES: AliasEntry[] = [
  { targetType: "domain", targetId: "design", patterns: [/@UX\b/i, /引入.*UX/i, /让.*设计师/i, /找个.*设计/i] },
  { targetType: "domain", targetId: "legal_compliance", patterns: [/@Legal\b/i, /引入.*法律/i, /法律.*视角/i, /让.*律师/i] },
  { targetType: "domain", targetId: "security", patterns: [/@Security\b/i, /引入.*安全/i, /安全.*视角/i, /威胁.*建模/i] },
  { targetType: "domain", targetId: "engineering", patterns: [/@Architect\b/i, /让.*架构师/i, /架构.*审/i] },
  { targetType: "family", targetId: "critic", patterns: [/找个.*反方/i, /反方.*视角/i, /挑战.*假设/i] },
  { targetType: "family", targetId: "product_strategy", patterns: [/@Strategy\b/i, /产品.*策略/i, /商业.*视角/i] },
  { targetType: "family", targetId: "growth", patterns: [/@Growth\b/i, /增长.*视角/i, /营销.*视角/i] },
  { targetType: "domain", targetId: "research_writing", patterns: [/@Writer\b/i, /技术.*写作/i, /文档.*整理/i] },
];

export function parseExplicitRequests(text: string): ExplicitRoleRequest[] {
  const requests: ExplicitRoleRequest[] = [];
  const seen = new Set<string>();

  for (const entry of ALIASES) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        const key = `${entry.targetType}:${entry.targetId}`;
        if (!seen.has(key)) {
          seen.add(key);
          requests.push({
            targetType: entry.targetType,
            targetId: entry.targetId,
            confidence: 0.9,
            rawText: text,
          });
        }
        break;
      }
    }
  }

  // Also handle @ mentions like @persona_id
  const atMentions = text.match(/@(\w+)/g);
  if (atMentions) {
    for (const mention of atMentions) {
      const id = mention.slice(1).toLowerCase();
      const key = `persona:${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        requests.push({
          targetType: "persona",
          targetId: id,
          confidence: 0.95,
          rawText: mention,
        });
      }
    }
  }

  return requests;
}
