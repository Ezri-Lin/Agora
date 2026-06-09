import type { CompilePersonaPromptInput, CompiledPersonaPrompt } from "./types.js";
import { renderPersonaContract } from "./renderPersonaContract.js";
import { getPhaseInstructions } from "./phaseInstructions.js";

/**
 * Compile a PersonaContract into a structured prompt for a council phase.
 *
 * This is the main entry point for PR-3. It renders the contract into
 * system instructions, adds phase-specific guidance, and returns both
 * structured messages and a flat promptText for legacy callers.
 */
export function compilePersonaPrompt(input: CompilePersonaPromptInput): CompiledPersonaPrompt {
  const { personaContract: contract, phase, roomContext, existingContext, contextPackage } = input;

  const sections: string[] = [];

  // 1. Role identity from contract
  sections.push(renderPersonaContract(contract));

  // 2. Room context
  sections.push(
    "## Room Context",
    `- Topic: ${roomContext.topic}`,
    "",
    "## User Message",
    roomContext.userMessage,
    "",
  );

  if (roomContext.moderatorFraming) {
    sections.push(
      "## Moderator Framing",
      roomContext.moderatorFraming,
      "",
    );
  }

  // 3. Existing context (e.g., from previous rounds)
  if (existingContext) {
    sections.push(
      "## Existing Context",
      existingContext,
      "",
    );
  }

  // 4. Retrieved workspace context
  if (contextPackage && contextPackage.relevantDocs.length > 0) {
    sections.push("## Retrieved Workspace Context");
    for (const doc of contextPackage.relevantDocs) {
      const sourceLine = doc.title
        ? `- Source: ${doc.title}${doc.path ? ` (${doc.path})` : ""}`
        : `- Source: ${doc.sourceId}`;
      sections.push(sourceLine);
      if (doc.headingPath && doc.headingPath.length > 0) {
        sections.push(`- Heading: ${doc.headingPath.join(" > ")}`);
      }
      if (doc.relevanceReason) {
        sections.push(`- Relevance: ${doc.relevanceReason}`);
      }
      sections.push("", doc.excerpt, "");
    }
    if (contextPackage.constraints.length > 0) {
      sections.push("### Context Constraints");
      for (const c of contextPackage.constraints) sections.push(`- ${c}`);
      sections.push("");
    }
  }

  // 5. Phase-specific instructions
  sections.push(getPhaseInstructions(phase, roomContext, contract.compactSchema.fields));

  const systemText = sections.join("\n");

  // Build structured messages
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemText },
    { role: "user", content: roomContext.userMessage },
  ];

  return {
    system: systemText,
    messages,
    expectedCompactSchema: contract.compactSchema.fields,
    promptText: systemText,
  };
}
