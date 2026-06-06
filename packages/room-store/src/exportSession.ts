import type { CouncilMessage, CouncilRoom } from "@agora/shared";
import { writeText } from "./fs-utils.js";
import { roomDir } from "./paths.js";

export async function exportSession(
  workspaceRoot: string,
  room: CouncilRoom,
  messages: CouncilMessage[],
  summary: string,
): Promise<string> {
  const lines: string[] = [
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
    lines.push(`### ${label}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(summary);

  const content = lines.join("\n");
  const dir = roomDir(workspaceRoot, room.id);
  await writeText(`${dir}/exports/session.md`, content);
  return content;
}
