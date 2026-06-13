import type { ToolCall } from "@agora/shared";

/**
 * Parse tool calls from message content and thinking strings.
 * Temporary solution until kernel provides structured tool call data.
 */
export function parseToolCalls(content: string, thinking?: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const combined = `${thinking ?? ""}\n${content}`;
  let idCounter = 0;

  // Parse bash code blocks
  const bashRegex = /```(?:bash|sh|shell)\n([\s\S]*?)```/g;
  let match;
  while ((match = bashRegex.exec(combined)) !== null) {
    const command = match[1].trim();
    if (!command) continue;
    toolCalls.push({
      id: `parsed_bash_${idCounter++}`,
      name: "Bash",
      args: { command },
    });
  }

  // Parse edit/write patterns: "Editing file.ts", "Writing file.ts", "Creating file.ts"
  const editRegex = /(?:Editing|Writing|Creating|Modified)\s+`?([^\s`]+\.(?:ts|tsx|js|jsx|md|json|css|html|py|rs|go))`?/gi;
  while ((match = editRegex.exec(combined)) !== null) {
    const filePath = match[1];
    toolCalls.push({
      id: `parsed_edit_${idCounter++}`,
      name: "Edit",
      args: { path: filePath },
    });
  }

  // Parse diff-like patterns: "+N -M" stats
  const diffStatsRegex = /`?\+(\d+)\s*-\s*(\d+)`?\s*(?:lines?|changes?)?\s*(?:in|for|to)?\s*`?([^\s`]+)`?/gi;
  while ((match = diffStatsRegex.exec(combined)) !== null) {
    const additions = parseInt(match[1], 10);
    const deletions = parseInt(match[2], 10);
    const filePath = match[3];
    // Check if we already have this file from editRegex
    const existing = toolCalls.find(
      (tc) => tc.name === "Edit" && tc.args.path === filePath
    );
    if (existing) {
      existing.args.diffStats = `+${additions} -${deletions}`;
    }
  }

  return toolCalls;
}

/**
 * Extract file changes from tool calls for ProgressPanel display.
 */
export function extractFileChanges(toolCalls: ToolCall[]): Array<{
  path: string;
  additions: number;
  deletions: number;
}> {
  const changes = new Map<string, { path: string; additions: number; deletions: number }>();

  for (const tc of toolCalls) {
    if (tc.name === "Edit" || tc.name === "Write") {
      const path = tc.args.path ?? tc.args.filePath;
      if (!path) continue;

      const existing = changes.get(path) ?? { path, additions: 0, deletions: 0 };

      // Count additions from new_string or content
      const newContent = tc.args.new_string ?? tc.args.content ?? "";
      const oldContent = tc.args.old_string ?? "";
      if (newContent) {
        existing.additions += newContent.split("\n").length;
      }
      if (oldContent) {
        existing.deletions += oldContent.split("\n").length;
      }

      // Parse diffStats if present
      if (tc.args.diffStats) {
        const statsMatch = tc.args.diffStats.match(/\+(\d+)\s*-\s*(\d+)/);
        if (statsMatch) {
          existing.additions = parseInt(statsMatch[1], 10);
          existing.deletions = parseInt(statsMatch[2], 10);
        }
      }

      changes.set(path, existing);
    }
  }

  return Array.from(changes.values());
}
