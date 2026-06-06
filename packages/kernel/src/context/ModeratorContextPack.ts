import type { CouncilRoom, CouncilMessage, SourceRef } from "@agora/shared";

export interface FullSelectedDocument {
  label: string;
  path: string;
  importance: string;
  fullContent: string;
  charCount: number;
}

export interface ModeratorContextPackMeta {
  totalSelectedChars: number;
  selectedDocCount: number;
  hasOverflow: boolean;
  overflowDocs: string[];
}

export interface ModeratorContextPack {
  mode: "full_selected";
  selectedDocs: FullSelectedDocument[];
  roomHistory: CouncilMessage[];
  userMessage: string;
  meta: ModeratorContextPackMeta;
  /** The assembled shared prefix for moderator prompts */
  sharedPrefix: string;
}

const MODERATOR_CHAR_LIMIT = 200_000;

/**
 * Build a ModeratorContextPack.
 *
 * Rule: user-selected primary documents are included in full.
 * Only when total content exceeds model context do we flag overflow.
 * We never silently truncate selected documents.
 */
export function buildModeratorContextPack(
  room: CouncilRoom,
  userMessage: string,
  recentMessages: CouncilMessage[],
  docContents?: Map<string, string>,
): ModeratorContextPack {
  const selectedDocs: FullSelectedDocument[] = [];
  let totalSelectedChars = 0;
  const overflowDocs: string[] = [];

  // Load full content for all user-selected (primary) refs
  const primaryRefs = room.sourceRefs.filter(
    (r) => (r.importance ?? "primary") === "primary",
  );

  for (const ref of primaryRefs) {
    const path = ref.path ?? "";
    const content = docContents?.get(path);
    const label = ref.label ?? path ?? "unknown";

    if (content) {
      const doc: FullSelectedDocument = {
        label,
        path,
        importance: ref.importance ?? "primary",
        fullContent: content,
        charCount: content.length,
      };
      selectedDocs.push(doc);
      totalSelectedChars += content.length;
    }
  }

  // Also include non-primary refs but as excerpts (head only, 2000 chars)
  const otherRefs = room.sourceRefs.filter(
    (r) => (r.importance ?? "primary") !== "primary",
  );
  for (const ref of otherRefs) {
    const path = ref.path ?? "";
    const content = docContents?.get(path);
    const label = ref.label ?? path ?? "unknown";
    if (content) {
      const trimmed = content.length > 2000
        ? content.slice(0, 2000) + "\n...[excerpt for moderator, non-primary ref]"
        : content;
      selectedDocs.push({
        label,
        path,
        importance: ref.importance ?? "supporting",
        fullContent: trimmed,
        charCount: trimmed.length,
      });
      totalSelectedChars += trimmed.length;
    }
  }

  // Detect overflow
  const hasOverflow = totalSelectedChars > MODERATOR_CHAR_LIMIT;
  if (hasOverflow) {
    for (const doc of selectedDocs) {
      if (doc.charCount > 10_000) {
        overflowDocs.push(doc.label);
      }
    }
  }

  // Assemble shared prefix
  const lines: string[] = [
    `# Council Room: ${room.title}`,
    "",
    "## Moderator Context",
    "",
    "You are the full-context reader and meeting moderator.",
    "You receive the user-selected materials as the authoritative basis.",
    "Read all materials carefully before organizing the discussion.",
    "",
  ];

  if (selectedDocs.length > 0) {
    lines.push("## User-Selected Reference Documents");
    lines.push("");
    for (const doc of selectedDocs) {
      lines.push(`### ${doc.label} [${doc.importance}]`);
      lines.push(`Characters: ${doc.charCount}`);
      lines.push("");
      lines.push(doc.fullContent);
      lines.push("");
    }
  }

  if (recentMessages.length > 0) {
    lines.push("## Discussion History");
    for (const msg of recentMessages.slice(-20)) {
      const label = msg.senderType === "user" ? "User" : msg.senderId;
      lines.push(`[${label}] ${msg.content}`);
    }
    lines.push("");
  }

  if (hasOverflow) {
    lines.push("---");
    lines.push("⚠️ OVERFLOW WARNING");
    lines.push(`Total selected content (${totalSelectedChars} chars) may exceed model context.`);
    lines.push(`Large docs: ${overflowDocs.join(", ")}`);
    lines.push("Consider chunked reading or pre-summarization for these documents.");
    lines.push("");
  }

  lines.push(`Current message: ${userMessage}`);

  const sharedPrefix = lines.join("\n");

  return {
    mode: "full_selected",
    selectedDocs,
    roomHistory: recentMessages,
    userMessage,
    meta: {
      totalSelectedChars,
      selectedDocCount: selectedDocs.length,
      hasOverflow,
      overflowDocs,
    },
    sharedPrefix,
  };
}
