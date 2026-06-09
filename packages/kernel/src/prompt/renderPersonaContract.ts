import type { PersonaContract } from "@agora/shared";

/**
 * Render a PersonaContract into structured prompt sections.
 * Each section is clearly delimited so the LLM can parse role boundaries.
 */
export function renderPersonaContract(contract: PersonaContract): string {
  const sections: string[] = [];

  // Identity
  sections.push(
    "## Identity",
    `- Name: ${contract.name}`,
    contract.nameCN ? `- 中文名: ${contract.nameCN}` : "",
    `- Role: ${contract.subtitle}`,
    `- Domain: ${contract.domainId}`,
    `- Family: ${contract.familyId}`,
    `- Mission: ${contract.mission}`,
    "",
  );

  // Responsibilities
  const resp = contract.responsibilities;
  sections.push("## Responsibilities");
  if (resp.must.length > 0) {
    sections.push("### Must");
    for (const r of resp.must) sections.push(`- ${r}`);
  }
  if (resp.should.length > 0) {
    sections.push("### Should");
    for (const r of resp.should) sections.push(`- ${r}`);
  }
  if (resp.mustNot.length > 0) {
    sections.push("### Must Not");
    for (const r of resp.mustNot) sections.push(`- ${r}`);
  }
  sections.push("");

  // Decision Rights
  const dr = contract.decisionRights;
  sections.push("## Decision Rights");
  if (dr.may.length > 0) {
    sections.push("### May");
    for (const r of dr.may) sections.push(`- ${r}`);
  }
  if (dr.mustNot.length > 0) {
    sections.push("### Must Not");
    for (const r of dr.mustNot) sections.push(`- ${r}`);
  }
  sections.push("");

  // Analysis Frameworks
  if (contract.analysisFrameworks.length > 0) {
    sections.push("## Analysis Frameworks");
    for (const fw of contract.analysisFrameworks) sections.push(`- ${fw}`);
    sections.push("");
  }

  // Evidence Policy
  const ep = contract.evidencePolicy;
  sections.push("## Evidence Policy");
  if (ep.groundingRules.length > 0) {
    sections.push("### Grounding Rules");
    for (const r of ep.groundingRules) sections.push(`- ${r}`);
  }
  if (ep.uncertaintyRules.length > 0) {
    sections.push("### Uncertainty Rules");
    for (const r of ep.uncertaintyRules) sections.push(`- ${r}`);
  }
  sections.push("");

  // Collaboration Rules
  if (contract.collaborationRules.length > 0) {
    sections.push("## Collaboration Rules");
    for (const r of contract.collaborationRules) sections.push(`- ${r}`);
    sections.push("");
  }

  // Voice
  sections.push(
    "## Voice",
    `- Tone: ${contract.voice.tone}`,
    "- Style Rules:",
  );
  for (const r of contract.voice.styleRules) sections.push(`  - ${r}`);
  if (contract.voice.languageRules) {
    sections.push("- Language Rules:");
    for (const r of contract.voice.languageRules) sections.push(`  - ${r}`);
  }
  sections.push("");

  // Output Schema
  sections.push(
    "## Output Schema",
    `- Format: ${contract.outputSchema.format}`,
    `- Template:\n${contract.outputSchema.template}`,
    "",
  );

  // Compact Schema
  sections.push("## Compact Schema", "- Format: json", "- Fields:");
  for (const f of contract.compactSchema.fields) {
    sections.push(`  - \`${f.key}\` (${f.required ? "required" : "optional"}): ${f.description}`);
  }
  sections.push("");

  // Boundaries
  if (contract.boundaries.length > 0) {
    sections.push("## Boundaries");
    for (const b of contract.boundaries) sections.push(`- ${b}`);
    sections.push("");
  }

  // Memory Hooks
  if (contract.memoryHooks && contract.memoryHooks.length > 0) {
    sections.push("## Memory Hooks");
    for (const h of contract.memoryHooks) {
      sections.push(`- Trigger: ${h.trigger} → ${h.candidateType}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}
