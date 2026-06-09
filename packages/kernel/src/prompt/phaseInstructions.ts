import type { PromptPhase, PromptRoomContext } from "./types.js";
import type { PersonaCompactField } from "@agora/shared";

/** Generate phase-specific instructions. */
export function getPhaseInstructions(
  phase: PromptPhase,
  roomContext: PromptRoomContext,
  compactFields: PersonaCompactField[],
): string {
  switch (phase) {
    case "opening":
      return buildOpeningInstructions(roomContext, compactFields);
    case "cross_exam":
      return buildCrossExamInstructions(roomContext, compactFields);
  }
}

function buildOpeningInstructions(
  ctx: PromptRoomContext,
  compactFields: PersonaCompactField[],
): string {
  const lines: string[] = [
    "## Phase: Opening Statement",
    "",
    "You are writing your opening statement for this council round.",
    "Address the topic directly from your role's perspective.",
    "Be specific and actionable. Reference documents when relevant.",
    "Keep response under 300 words.",
    "Respond in the same language as the user's message.",
    "",
  ];

  if (ctx.participants && ctx.participants.length > 0) {
    lines.push(
      "### Council Participants",
      ...ctx.participants.map((p) => `- ${p.name} (${p.id})`),
      "",
    );
  }

  lines.push(...buildCompactBlockInstructions(compactFields));

  return lines.join("\n");
}

function buildCrossExamInstructions(
  ctx: PromptRoomContext,
  compactFields: PersonaCompactField[],
): string {
  const lines: string[] = [
    "## Phase: Cross-Examination",
    "",
    "Review the other participants' opening statements.",
    "You MUST reference at least one other persona by name or role ID.",
    "You may:",
    "1. Challenge a specific claim you disagree with",
    "2. Ask a pointed question to expose a weakness",
    "3. Acknowledge a strong point and build on it",
    "",
    "Pick 1-2 responses to cross-examine. Be specific and direct.",
    "Keep each challenge under 150 words.",
    "Respond in the same language as the discussion.",
    "",
  ];

  if (ctx.participants && ctx.participants.length > 0) {
    lines.push(
      "### Council Participants",
      ...ctx.participants.map((p) => `- ${p.name} (${p.id})`),
      "",
    );
  }

  lines.push(...buildCompactBlockInstructions(compactFields));

  return lines.join("\n");
}

/**
 * Build the compact block format instructions.
 * Tells the LLM to emit a <compact> JSON block at the end of its response.
 * NOTE: Parsing is handled downstream (PR-4). Here we only instruct.
 */
function buildCompactBlockInstructions(fields: PersonaCompactField[]): string[] {
  const required = fields.filter((f) => f.required);
  const optional = fields.filter((f) => !f.required);

  const lines: string[] = [
    "## Output Format",
    "",
    "After your main response, append a compact block:",
    "",
    "```compact",
    "{",
  ];

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const comma = i < fields.length - 1 ? "," : "";
    const marker = f.required ? "" : " // optional";
    lines.push(`  "${f.key}": "<${f.description}>"${comma}${marker}`);
  }

  lines.push(
    "}",
    "```",
    "",
    "The compact block MUST be valid JSON.",
  );

  if (required.length > 0) {
    lines.push(
      `Required fields: ${required.map((f) => f.key).join(", ")}.`,
    );
  }

  lines.push("");

  return lines;
}
