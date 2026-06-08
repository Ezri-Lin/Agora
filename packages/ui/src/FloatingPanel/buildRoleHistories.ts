import type { CouncilMessage, RoleRoundHistory } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";

/**
 * Build role histories grouped by roleId from messages and stream states.
 * Scoped to current room — only includes messages for the given roomId.
 */
export function buildRoleHistories(params: {
  roomId: string | null;
  messages: CouncilMessage[];
  roleStreamStates: Map<string, RoleStreamState>;
}): Map<string, RoleRoundHistory[]> {
  const { roomId, messages, roleStreamStates } = params;
  const result = new Map<string, RoleRoundHistory[]>();

  if (!roomId) return result;

  // Collect role messages from the current room
  const roleMessages = messages.filter(
    (m) => m.roomId === roomId && m.senderType === "role" && m.status !== "error",
  );

  // Build history entries from persisted messages
  for (const msg of roleMessages) {
    const roleId = msg.senderId;
    if (!result.has(roleId)) result.set(roleId, []);
    const histories = result.get(roleId)!;

    const summary = msg.graphSummary ?? extractPreview(msg.content);
    histories.push({
      roomId,
      roleId,
      roundId: `round_${roomId}_${msg.createdAt}`,
      roundIndex: histories.length,
      messageId: msg.id,
      topic: "", // Not stored per-message; available at room level
      summary,
      preview: msg.content.slice(0, 120),
      status: "done",
      source: "message",
      timestamp: msg.createdAt,
    });
  }

  // Merge current streaming state as latest entry (if actively streaming)
  for (const [roleId, state] of roleStreamStates) {
    if (!result.has(roleId)) result.set(roleId, []);
    const histories = result.get(roleId)!;

    // Only add if actively streaming/thinking (not already captured as done)
    if (state.status === "thinking" || state.status === "streaming") {
      histories.push({
        roomId,
        roleId,
        roundId: `streaming_${roomId}_${state.startedAt}`,
        roundIndex: histories.length,
        topic: "",
        summary: state.microSummary || "Generating...",
        status: "partial",
        source: "stream",
        timestamp: new Date(state.startedAt).toISOString(),
      });
    }
  }

  // Sort each role's history by timestamp descending (newest first)
  for (const histories of result.values()) {
    histories.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  return result;
}

function extractPreview(content: string): string {
  // Try first meaningful line
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("<!--")) continue;
    if (trimmed.length < 10) continue;
    return trimmed.length > 100 ? trimmed.slice(0, 97) + "..." : trimmed;
  }
  return content.slice(0, 100);
}
