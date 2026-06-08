import type { RoleCard } from "@agora/shared";
import type { ContextPack } from "./ContextPack.js";
import type { ModeratorContextPack } from "./ModeratorContextPack.js";

function buildModeratorContextNotice(pack: ModeratorContextPack): string {
  if (!pack.meta.hasOverflow) {
    return "You have received all user-selected primary materials in full. Read them carefully before proceeding.";
  }
  return [
    "⚠️ CONTEXT OVERFLOW DETECTED",
    `The following documents exceeded context capacity and were NOT fully included: ${pack.meta.overflowDocs.join(", ")}`,
    "Do NOT claim you have read these documents in full.",
    "State clearly what is missing and propose a chunked reading plan before final judgment.",
    "For documents that were included, you may reference them normally.",
  ].join("\n");
}

/** Build the full prompt for a moderator task (uses full-context ModeratorContextPack) */
export function buildModeratorPrompt(
  task: "analyze" | "select_roles" | "summarize",
  pack: ModeratorContextPack,
  extra?: string,
): string {
  const sections: string[] = [pack.sharedPrefix, ""];
  const contextNotice = buildModeratorContextNotice(pack);

  switch (task) {
    case "analyze":
      sections.push(
        "## Context Status",
        contextNotice,
        "",
        "## Task: Scene Analysis",
        "",
        "Analyze the current topic. Identify:",
        "1. The core question or decision",
        "2. Key dimensions to examine",
        "3. What the reference documents say about this topic",
        "4. Potential risks or blind spots",
        "",
        "Respond in the same language as the user's message.",
      );
      break;
    case "select_roles":
      sections.push(
        "## Context Status",
        contextNotice,
        "",
        "## Task: Select Roles",
        "",
        "Based on the topic AND the reference materials available to you,",
        "select the most valuable roles for this discussion.",
        "Return a JSON array of role IDs, e.g. [\"skeptic_critic\", \"historian\"]",
        "",
        "Rules:",
        "- MUST include at least 1 critic/skeptic",
        "- MUST NOT exceed 5 roles",
        "- Choose roles that provide diverse, conflicting perspectives",
        "- Consider what perspectives would best analyze the reference materials",
        "",
        extra ?? "",
      );
      break;
    case "summarize":
      sections.push(
        "## Context Status",
        contextNotice,
        "",
        "## Task: Summarize Discussion",
        "",
        "Synthesize the discussion into:",
        "1. Key insights from each role",
        "2. Points of agreement and disagreement",
        "3. How roles engaged with the reference materials",
        "4. Unresolved questions",
        "5. Recommended next steps",
        "",
        extra ?? "",
        "",
        "Respond in the same language as the discussion.",
      );
      break;
  }

  return sections.join("\n");
}

/** Build cross-examination prompt for a role to challenge others */
export function buildCrossExaminationPrompt(
  role: RoleCard,
  otherResponses: Array<{ roleId: string; roleName: string; content: string }>,
): string {
  const responsesText = otherResponses
    .map((r) => `### ${r.roleName} (${r.roleId})\n${r.content}`)
    .join("\n\n");

  return [
    `You are ${role.name} — ${role.subtitle}`,
    "",
    role.systemPrompt,
    "",
    "## Other Roles' Responses",
    "",
    responsesText,
    "",
    "## Cross-Examination Task",
    "",
    "Review the other roles' responses. You may:",
    "1. Challenge a specific claim you disagree with",
    "2. Ask a pointed question to expose a weakness",
    "3. Acknowledge a strong point and build on it",
    "",
    "Pick 1-2 responses to cross-examine. Be specific and direct.",
    "Keep each challenge under 150 words.",
    "Respond in the same language as the discussion.",
  ].join("\n");
}

/** Build the full prompt for a role call (uses budgeted RoleContextPack) */
export function buildRolePrompt(
  role: RoleCard,
  pack: ContextPack,
): string {
  return [
    pack.sharedPrefix,
    "",
    "## Your Role",
    `You are: ${role.name} — ${role.subtitle}`,
    `Role type: ${role.type}`,
    "",
    role.systemPrompt,
    "",
    "## Current Message",
    pack.userMessage,
    "",
    "## Instructions",
    "- You are receiving a budgeted excerpt selected for your role",
    "- Respond from your role's perspective",
    "- Be specific and actionable",
    "- Reference documents when relevant",
    "- If context is insufficient, explicitly state what additional information you need",
    "- Keep response under 300 words",
    "- Respond in the same language as the user's message",
    "",
    "After your response, add a final line with your core viewpoint in one sentence (≤30 words):",
    "<!-- summary: YOUR ONE-LINE SUMMARY HERE -->",
  ].join("\n");
}
