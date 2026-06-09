import type { CouncilMessage, CouncilRoom } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import type { CouncilRunResult } from "@agora/kernel";
import type { AgoraBridge } from "../AgoraBridge.js";
import { buildSessionExport } from "../sessionExport.js";

interface PersistCouncilRunResultParams {
  bridge: AgoraBridge;
  workspacePath: string;
  roomId: string;
  roomForCouncil: CouncilRoom;
  messages: CouncilMessage[];
  userMsg: CouncilMessage;
  result: CouncilRunResult;
}

export async function persistCouncilRunResult({
  bridge,
  workspacePath,
  roomId,
  roomForCouncil,
  messages,
  userMsg,
  result,
}: PersistCouncilRunResultParams): Promise<string[]> {
  const modMsg: CouncilMessage = {
    id: generateId("msg"),
    roomId,
    senderType: "moderator",
    senderId: "moderator",
    content: result.moderatorAnalysis,
    createdAt: nowISO(),
  };
  const summaryMsg: CouncilMessage = {
    id: generateId("msg"),
    roomId,
    senderType: "moderator",
    senderId: "moderator",
    content: result.summary,
    createdAt: nowISO(),
  };
  const allNew = [
    userMsg,
    modMsg,
    ...result.roleMessages,
    ...result.crossExaminationMessages,
    summaryMsg,
  ];

  for (const msg of allNew) {
    await bridge.room.appendMessage(workspacePath, roomId, msg);
  }
  await bridge.room.writeSummary(workspacePath, roomId, result.summary);

  if (result.extractedMemories.length > 0) {
    const memLines = [
      "# Memory Candidates",
      "",
      ...result.extractedMemories.map(
        (m) =>
          `- **[${m.scope}]** ${m.content}\n  domains: ${m.domains.join(", ")} | tags: ${m.tags.join(", ")}`,
      ),
    ];
    await bridge.room.writeMemoryCandidates(workspacePath, roomId, memLines.join("\n"));
  }

  const sessionContent = buildSessionExport(
    {
      id: roomForCouncil.id,
      title: roomForCouncil.title,
      createdAt: roomForCouncil.createdAt,
      sourceRefs: roomForCouncil.sourceRefs.flatMap((ref) =>
        ref.path ? [{ label: ref.label ?? ref.path, path: ref.path }] : [],
      ),
    },
    [...messages, ...allNew],
    result.summary,
    result.contextDebug,
  );
  await bridge.room.exportSession(workspacePath, roomId, sessionContent);

  return bridge.room.listOutputs(workspacePath, roomId);
}
