import type { CouncilMessage } from "@agora/shared";

export function buildSessionExport(
  room: { id: string; title: string; createdAt: string },
  messages: CouncilMessage[],
  summary: string,
): string {
  const lines = [
    `# Session Export: ${room.title}`,
    "",
    `Room ID: ${room.id}`,
    `Date: ${room.createdAt}`,
    "",
    "---",
    "",
    "## Messages",
    "",
  ];
  for (const msg of messages) {
    const label = msg.senderType === "user" ? "User" : msg.senderId;
    lines.push(`### ${label}`, "", msg.content, "");
  }
  lines.push("---", "", "## Summary", "", summary);
  return lines.join("\n");
}
