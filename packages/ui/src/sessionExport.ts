import type { CouncilMessage } from "@agora/shared";

interface ExportRoom {
  id: string;
  title: string;
  createdAt: string;
  sourceRefs?: Array<{ label: string; path: string }>;
}

interface ExportDebug {
  moderatorIncludedDocCount: number;
  moderatorTotalChars: number;
  roleContextMode: string;
  roleDocCount: number;
  roleTotalChars: number;
}

export function buildSessionExport(
  room: ExportRoom,
  messages: CouncilMessage[],
  summary: string,
  debug?: ExportDebug,
): string {
  const lines = [
    `# Session Export`,
    "",
    `**Topic:** ${room.title}`,
    `**Room ID:** \`${room.id}\``,
    `**Date:** ${room.createdAt}`,
    "",
  ];

  // References
  if (room.sourceRefs && room.sourceRefs.length > 0) {
    lines.push("## References", "");
    for (const ref of room.sourceRefs) {
      lines.push(`- ${ref.label} (\`${ref.path}\`)`);
    }
    lines.push("");
  }

  // Context stats
  if (debug) {
    lines.push(
      "## Context Stats",
      "",
      `| Metric | Value |`,
      `|---|---|`,
      `| Moderator docs | ${debug.moderatorIncludedDocCount} |`,
      `| Moderator chars | ${debug.moderatorTotalChars.toLocaleString()} |`,
      `| Role mode | ${debug.roleContextMode} |`,
      `| Role docs | ${debug.roleDocCount} |`,
      `| Role chars | ${debug.roleTotalChars.toLocaleString()} |`,
      "",
    );
  }

  // Messages by type
  const userMsgs = messages.filter((m) => m.senderType === "user");
  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  const xMsgs = messages.filter((m) => m.senderType === "role" && m.id.includes("_x_"));
  const errorMsgs = messages.filter((m) => m.status === "error");
  const modMsgs = messages.filter((m) => m.senderType === "moderator");

  // User messages
  if (userMsgs.length > 0) {
    lines.push("## User Messages", "");
    for (const msg of userMsgs) {
      lines.push(`> ${msg.content}`, "");
    }
  }

  // Role responses
  const initialResponses = roleMsgs.filter((m) => !m.id.includes("_x_"));
  if (initialResponses.length > 0) {
    lines.push("## Role Responses", "");
    for (const msg of initialResponses) {
      lines.push(`### ${formatRoleName(msg.senderId)}`, "", msg.content, "");
    }
  }

  // Cross-examination
  if (xMsgs.length > 0) {
    lines.push("## Cross-Examination", "");
    for (const msg of xMsgs) {
      lines.push(`### ${formatRoleName(msg.senderId)} (challenges)`, "", msg.content, "");
    }
  }

  // Errors
  if (errorMsgs.length > 0) {
    lines.push("## Failed Roles", "");
    for (const msg of errorMsgs) {
      lines.push(`- **${msg.targetRoleId}**: ${msg.errorCode} — ${msg.errorMessage}`);
    }
    lines.push("");
  }

  // Summary
  lines.push("## Moderator Summary", "", summary, "");

  return lines.join("\n");
}

function formatRoleName(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
