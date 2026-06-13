import type { CouncilMessage, RoleCard } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { buildCrossExaminationPrompt } from "../context/promptContracts.js";
import { formatCompactsForPrompt } from "../compact/formatCompactsForPrompt.js";
import type { MessageCompact } from "../compact/types.js";

interface RunCrossExamInput {
  finalRoles: RoleCard[];
  roleMessages: CouncilMessage[];
  failedRoles: string[];
  messageCompacts: MessageCompact[];
  room: { id: string; settings: { allowCrossExamination: boolean } };
  recentMessages: CouncilMessage[];
  userMessage: CouncilMessage;
  llm: LLMProvider;
}

export async function runCrossExam(input: RunCrossExamInput): Promise<CouncilMessage[]> {
  const {
    finalRoles, roleMessages, failedRoles, messageCompacts,
    room, recentMessages, userMessage, llm,
  } = input;

  if (!room.settings.allowCrossExamination) return [];

  const okResponses = roleMessages.filter((m) => m.status !== "error");
  if (okResponses.length < 2) return [];

  const crossExaminationMessages: CouncilMessage[] = [];

  for (const role of finalRoles) {
    if (failedRoles.includes(role.id)) continue;
    const others = okResponses
      .filter((m) => m.senderId !== role.id)
      .map((m) => {
        const otherRole = finalRoles.find((r) => r.id === m.senderId);
        return { roleId: m.senderId, roleName: otherRole?.name ?? m.senderId, content: m.content };
      });
    if (others.length === 0) continue;

    const compactSummary = formatCompactsForPrompt(messageCompacts);
    const xPrompt = buildCrossExaminationPrompt(role, others)
      + (compactSummary ? "\n\n" + compactSummary : "");

    try {
      const xResult = await llm.callRole({
        roomId: room.id,
        role,
        sharedContext: xPrompt,
        roomSummary: "Cross-examination phase: challenge or question other roles' responses.",
        recentMessages: [...recentMessages, userMessage, ...roleMessages],
      });
      crossExaminationMessages.push({
        id: `msg_x_${role.id}_${Date.now()}`,
        roomId: room.id,
        senderType: "role",
        senderId: role.id,
        content: xResult.content,
        status: "ok",
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Cross-examination failure is non-fatal
    }
  }

  return crossExaminationMessages;
}
