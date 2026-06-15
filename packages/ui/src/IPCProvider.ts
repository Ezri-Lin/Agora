import type { RoleCallInput, RoleCallResult, RoleCard, CouncilMessage, LLMConfig, ProviderErrorCode, ToolCall } from "@agora/shared";
import type { LLMProvider } from "@agora/kernel";
import { getBridge } from "./AgoraBridge.js";

export type StatusCallback = (status: string) => void;

export class ProviderError extends Error {
  code: ProviderErrorCode;
  roleId?: string;

  constructor(code: ProviderErrorCode, message: string, roleId?: string) {
    super(message);
    this.code = code;
    this.roleId = roleId;
  }
}

function parseErrorCode(msg: string): ProviderErrorCode {
  if (msg.startsWith("missing_api_key")) return "missing_api_key";
  if (msg.startsWith("invalid_api_key")) return "invalid_api_key";
  if (msg.startsWith("rate_limited")) return "rate_limited";
  if (msg.startsWith("model_not_found")) return "model_not_found";
  if (msg.startsWith("network_error")) return "network_error";
  if (msg.startsWith("timeout")) return "timeout";
  if (msg.startsWith("empty_response")) return "empty_response";
  return "unknown";
}

/**
 * LLMProvider that proxies calls through Electron IPC.
 * API key stays in main process. Renderer never sees it.
 */
export class IPCProvider implements LLMProvider {
  private config: LLMConfig;
  private onStatus?: StatusCallback;

  constructor(config: LLMConfig, onStatus?: StatusCallback) {
    this.config = config;
    this.onStatus = onStatus;
  }

  async callRole(input: RoleCallInput): Promise<RoleCallResult> {
    const bridge = getBridge();
    if (!bridge) throw new ProviderError("unknown", "Agora bridge not available", input.role.id);

    this.onStatus?.(`${input.role.name} responding...`);

    const messages = [
      { role: "system" as const, content: input.sharedContext },
      { role: "user" as const, content: input.roomSummary },
    ];

    const result = await bridge.llm.chat({ messages, config: this.config });
    return {
      roleId: input.role.id,
      content: result.content,
      thinking: result.thinking,
      toolCalls: result.toolCalls as ToolCall[] | undefined,
    };
  }

  async callRoleStream(
    input: RoleCallInput,
    onChunk: (delta: string, thinkingDelta?: string) => void,
  ): Promise<RoleCallResult> {
    const bridge = getBridge();
    if (!bridge) throw new ProviderError("unknown", "Agora bridge not available", input.role.id);
    this.onStatus?.(`${input.role.name} responding...`);

    const messages = [
      { role: "system" as const, content: input.sharedContext },
      { role: "user" as const, content: input.roomSummary },
    ];

    const { streamId } = await bridge.llm.chatStream({ messages, config: this.config });

    return new Promise((resolve, reject) => {
      let fullContent = "";
      let fullThinking = "";

      const unsubChunk = bridge.llm.onChunk((data) => {
        if (data.streamId !== streamId) return;
        if (data.delta) fullContent += data.delta;
        if (data.thinkingDelta) fullThinking += data.thinkingDelta;
        onChunk(data.delta ?? "", data.thinkingDelta);
      });

      const unsubDone = bridge.llm.onDone((data) => {
        if (data.streamId !== streamId) return;
        unsubChunk();
        unsubDone();
        unsubErr();
        resolve({
          roleId: input.role.id,
          content: data.fullContent || fullContent,
          thinking: data.fullThinking || fullThinking || undefined,
          toolCalls: data.toolCalls as ToolCall[] | undefined,
        });
      });

      const unsubErr = bridge.llm.onStreamError((data) => {
        if (data.streamId !== streamId) return;
        unsubChunk();
        unsubDone();
        unsubErr();
        reject(new ProviderError("unknown", data.error, input.role.id));
      });
    });
  }

  async callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<{ content: string; thinking?: string }> {
    const bridge = getBridge();
    if (!bridge) throw new ProviderError("unknown", "Agora bridge not available");

    const taskLabel = {
      analyze: "",
      select_roles: "Moderator selecting roles...",
      summarize: "Moderator summarizing...",
    }[params.task];
    if (taskLabel) this.onStatus?.(taskLabel);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: params.context },
    ];

    if (params.task === "select_roles" && params.availableRoles) {
      const roleList = params.availableRoles
        .map((r) => `- ${r.id}: ${r.name} (${r.subtitle})`)
        .join("\n");
      messages.push({
        role: "user",
        content: `Available roles:\n${roleList}\n\nSelect roles for this discussion. Return JSON array of role IDs.`,
      });
    } else if (params.messages && params.messages.length > 0) {
      for (const msg of params.messages.slice(-10)) {
        const role = msg.senderType === "user" ? "user" as const : "assistant" as const;
        messages.push({ role, content: msg.content });
      }
    } else {
      messages.push({ role: "user", content: "Proceed with the task." });
    }

    const result = await bridge.llm.chat({ messages, config: this.config });
    return { content: result.content, thinking: result.thinking };
  }
}
