import type { CouncilRoom, CouncilMessage, SourceRef, ContextMode } from "@agora/shared";
import { CONTEXT_BUDGETS, getDocBudget, type ContextBudget } from "./tokenBudget.js";
import { extractRelevantExcerpt } from "./extractExcerpt.js";

export interface DocInclusion {
  label: string;
  importance: string;
  budgetChars: number;
  includedChars: number;
  wasTruncated: boolean;
  excerpt: string;
}

export interface ContextPackMeta {
  mode: ContextMode;
  budget: ContextBudget;
  totalUsedChars: number;
  docCount: number;
  truncatedDocs: number;
}

export interface ContextPack {
  /** Stable shared prefix for all roles */
  sharedPrefix: string;
  /** Structured metadata */
  meta: ContextPackMeta;
  /** Per-doc inclusion details */
  docs: DocInclusion[];
  /** Recent messages included */
  recentMessages: Array<{ sender: string; content: string }>;
  /** User's current message */
  userMessage: string;
}

/**
 * Build an adaptive ContextPack from room state.
 * Budgets are determined by contextMode + sourceRef importance.
 */
export function buildContextPack(
  room: CouncilRoom,
  userMessage: string,
  recentMessages: CouncilMessage[],
  docContents?: Map<string, string>,
): ContextPack {
  const mode = room.settings.contextMode ?? "standard";
  const budget = CONTEXT_BUDGETS[mode];

  // Process documents with importance-based budgets
  const docs: DocInclusion[] = [];
  for (const ref of room.sourceRefs) {
    const content = docContents?.get(ref.path ?? "");
    const docBudget = getDocBudget(ref.importance, budget);
    const label = ref.label ?? ref.path ?? "unknown";

    if (content) {
      const result = extractRelevantExcerpt(content, userMessage, docBudget);
      docs.push({
        label,
        importance: ref.importance ?? "primary",
        budgetChars: docBudget,
        includedChars: result.includedChars,
        wasTruncated: result.wasTruncated,
        excerpt: result.excerpt,
      });
    } else {
      docs.push({
        label,
        importance: ref.importance ?? "primary",
        budgetChars: docBudget,
        includedChars: 0,
        wasTruncated: false,
        excerpt: "[content not loaded]",
      });
    }
  }

  // Process recent messages
  const trimmedMessages = recentMessages
    .slice(-budget.historyMessages)
    .map((m) => ({
      sender: m.senderId,
      content: m.content.length > budget.historyMessageChars
        ? m.content.slice(0, budget.historyMessageChars) + "...[truncated]"
        : m.content,
    }));

  // Build shared prefix
  const prefixLines: string[] = [
    `# Council Room: ${room.title}`,
    "",
    `Context mode: ${mode}`,
    "",
  ];

  let totalUsedChars = prefixLines.join("\n").length;

  if (docs.length > 0) {
    prefixLines.push("## Reference Documents");
    prefixLines.push("");
    for (const doc of docs) {
      const section = `### ${doc.label} [${doc.importance}]\n${doc.excerpt}`;
      prefixLines.push(section);
      prefixLines.push("");
      totalUsedChars += section.length;
    }
  }

  if (trimmedMessages.length > 0) {
    prefixLines.push("## Discussion History");
    for (const msg of trimmedMessages) {
      const line = `[${msg.sender}] ${msg.content}`;
      prefixLines.push(line);
      totalUsedChars += line.length;
    }
    prefixLines.push("");
  }

  // Excerpted context notice
  prefixLines.push(
    "---",
    "Note: You are seeing an excerpted context pack, not necessarily the full document.",
    "If context is insufficient, explicitly state what additional section or document you need.",
    "Do not pretend you have read the full document.",
  );

  const sharedPrefix = prefixLines.join("\n");
  totalUsedChars = sharedPrefix.length;

  const truncatedDocs = docs.filter((d) => d.wasTruncated).length;

  return {
    sharedPrefix,
    meta: {
      mode,
      budget,
      totalUsedChars,
      docCount: docs.length,
      truncatedDocs,
    },
    docs,
    recentMessages: trimmedMessages,
    userMessage,
  };
}
