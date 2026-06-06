import { generateId, nowISO, type MemoryCandidate, type CouncilMessage } from "@agora/shared";

/** Generate memory candidates from a session — stub implementation */
export function proposeMemory(
  roomId: string,
  messages: CouncilMessage[],
): MemoryCandidate[] {
  // Stub: create one candidate summarizing the session
  const content = messages
    .filter((m) => m.senderType === "role")
    .map((m) => `[${m.senderId}] ${m.content.slice(0, 100)}`)
    .join("\n");

  if (!content) return [];

  return [
    {
      id: generateId("mem"),
      roomId,
      scope: "session",
      domains: [],
      tags: ["auto-generated"],
      content: `Session summary candidate:\n${content}`,
      confidence: 0.5,
      status: "candidate",
      createdAt: nowISO(),
    },
  ];
}
