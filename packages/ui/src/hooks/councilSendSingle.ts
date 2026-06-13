import type { CouncilMessage } from "@agora/shared";
import type { LLMConfig } from "@agora/shared";
import { IPCProvider } from "../IPCProvider.js";

interface SendSingleInput {
  llmConfig: LLMConfig;
  roomId: string;
  messages: CouncilMessage[];
  userMsg: CouncilMessage;
  docContents: Map<string, string>;
  placeholderId: string;
  onResult: (placeholderId: string, content: string, thinking: string) => void;
  setLoadingStatus: (status: string) => void;
}

export async function sendSingleMode(input: SendSingleInput): Promise<void> {
  const { llmConfig, roomId, messages, userMsg, docContents, placeholderId, onResult, setLoadingStatus } = input;

  setLoadingStatus(`Calling ${llmConfig.provider} (${llmConfig.model})...`);
  const provider = new IPCProvider(llmConfig, (status) => setLoadingStatus(status));

  const contextLines: string[] = [
    "You are a helpful assistant. Respond directly and concisely.",
    "Respond in the same language as the user's message.",
  ];
  if (docContents.size > 0) {
    contextLines.push("", "## Reference Materials");
    for (const [path, content] of docContents) {
      contextLines.push("", `### ${path}`, content.slice(0, 4000));
    }
  }

  const result = await provider.callModerator({
    roomId,
    task: "analyze",
    context: contextLines.join("\n"),
    messages: [...messages, userMsg],
  });

  onResult(placeholderId, result.content, result.thinking ?? "");
}
