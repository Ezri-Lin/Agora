import type { CouncilRoom, CouncilMessage, RoleCard } from "@agora/shared";

/** Build shared context prefix — stable across all roles for cache optimization */
export function buildSharedContext(
  room: CouncilRoom,
  recentMessages: CouncilMessage[],
): string {
  const lines: string[] = [
    `# Council Room: ${room.title}`,
    `Room ID: ${room.id}`,
    "",
    "## Settings",
    `- Roles: ${room.settings.roleCount}`,
    `- Max messages per role: ${room.settings.maxMessagesPerRoleBeforeUserReply}`,
    `- Cross examination: ${room.settings.allowCrossExamination}`,
    "",
  ];

  if (room.sourceRefs.length > 0) {
    lines.push("## Referenced Documents");
    for (const ref of room.sourceRefs) {
      lines.push(`- ${ref.label ?? ref.path ?? ref.url ?? "unknown"}`);
    }
    lines.push("");
  }

  if (recentMessages.length > 0) {
    lines.push("## Recent Messages");
    for (const msg of recentMessages.slice(-10)) {
      lines.push(`[${msg.senderId}] ${msg.content.slice(0, 200)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Build role-specific suffix */
export function buildRoleSuffix(role: RoleCard): string {
  return [
    "",
    "## Your Role",
    `You are: ${role.name} — ${role.subtitle}`,
    `Type: ${role.type}`,
    "",
    role.systemPrompt,
  ].join("\n");
}
