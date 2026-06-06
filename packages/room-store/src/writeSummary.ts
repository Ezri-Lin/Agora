import { writeText } from "./fs-utils.js";
import { roomDir } from "./paths.js";

export async function writeSummary(
  workspaceRoot: string,
  roomId: string,
  summary: string,
): Promise<void> {
  const dir = roomDir(workspaceRoot, roomId);
  await writeText(`${dir}/summary.md`, `# Summary\n\n${summary}\n`);
}
