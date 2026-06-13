import type { RoleCallInput, RoleCallResult, RoleCard, CouncilMessage, ToolCall } from "@agora/shared";
import type { LLMConfig } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ChatCompletionChoice {
  message: {
    content: string;
    reasoning_content?: string;
    tool_calls?: OpenAIToolCall[];
  };
}

interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
  error?: { message: string; type: string };
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class OpenAICompatibleProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(config: LLMConfig) {
    this.baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = config.model;
    const envKey = config.apiKeyEnv ?? "OPENAI_API_KEY";
    this.apiKey = process.env[envKey] ?? "";
    if (!this.apiKey) {
      throw new Error(`missing_api_key: API key not found in env: ${envKey}`);
    }
  }

  async callRole(input: RoleCallInput): Promise<RoleCallResult> {
    const messages: ChatMessage[] = [
      { role: "system", content: input.sharedContext },
      { role: "user", content: input.roomSummary },
    ];

    const result = await this.chat(messages);
    return {
      roleId: input.role.id,
      content: result.content,
      thinking: result.thinking,
      toolCalls: result.toolCalls,
    };
  }

  async callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize" | "extract_memories";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<{ content: string; thinking?: string }> {
    const messages: ChatMessage[] = [
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

    const result = await this.chat(messages);
    return { content: result.content, thinking: result.thinking };
  }

  private async chat(messages: ChatMessage[]): Promise<{ content: string; thinking?: string; toolCalls?: ToolCall[] }> {
    const body = {
      model: this.model,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as ChatCompletionResponse;
        if (data.error) {
          throw new Error(`llm_error: ${data.error.message}`);
        }
        const content = data.choices?.[0]?.message?.content;
        const thinking = data.choices?.[0]?.message?.reasoning_content;
        const rawToolCalls = data.choices?.[0]?.message?.tool_calls;

        // Parse tool calls if present
        const toolCalls = rawToolCalls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          args: parseToolCallArgs(tc.function.arguments),
        }));

        if (!content && (!toolCalls || toolCalls.length === 0)) {
          throw new Error("empty_response: LLM returned empty content");
        }

        return {
          content: content ?? "",
          thinking: thinking || undefined,
          toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        };
      }

      const text = await res.text().catch(() => "");
      lastError = parseError(res.status, text);

      if (!RETRYABLE_STATUS.has(res.status)) {
        throw lastError;
      }
    }

    throw lastError ?? new Error("unknown: LLM request failed after retries");
  }
}

function parseToolCallArgs(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function parseError(status: number, body: string): Error {
  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed.error?.message ?? parsed.message ?? body;
  } catch {
    detail = body;
  }

  switch (status) {
    case 401:
      return new Error(`invalid_api_key: Authentication failed — check your API key`);
    case 403:
      return new Error(`invalid_api_key: Access denied — ${detail}`);
    case 404:
      return new Error(`model_not_found: Model '${detail || "unknown"}' not found — check model name`);
    case 429:
      return new Error(`rate_limited: Rate limited — ${detail}`);
    case 500:
    case 502:
    case 503:
    case 504:
      return new Error(`network_error: Server error (${status}) — ${detail}`);
    default:
      return new Error(`unknown: LLM API error ${status}: ${detail}`);
  }
}
