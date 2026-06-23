/**
 * DirectOpenAIProvider — 直接使用 API key 的 OpenAI 兼容 provider
 *
 * 不从环境变量读取，直接使用传入的 API key
 */

import type { RoleCallInput, RoleCallResult, RoleCard, CouncilMessage, ToolCall } from "@agora/shared";

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

export interface DirectOpenAIConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export class DirectOpenAIProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxOutputTokens: number;

  constructor(config: DirectOpenAIConfig) {
    this.baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.maxOutputTokens = config.maxOutputTokens ?? 2000;
  }

  async chat(messages: ChatMessage[]): Promise<{ content: string; thinking?: string; toolCalls?: ToolCall[] }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: this.maxOutputTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const error = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

          if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
            lastError = error;
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          throw error;
        }

        const data = (await res.json()) as ChatCompletionResponse;

        if (data.error) {
          throw new Error(`API error: ${data.error.message}`);
        }

        const choice = data.choices[0];
        if (!choice) {
          throw new Error("No choice in response");
        }

        return {
          content: choice.message.content,
          thinking: choice.message.reasoning_content,
          toolCalls: choice.message.tool_calls?.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          })),
        };
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("Request timeout");
        }

        if (attempt < MAX_RETRIES && RETRYABLE_STATUS.has(err.status)) {
          lastError = err;
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }

  async callModerator(params: {
    roomId: string;
    task: string;
    context: string;
  }): Promise<{ content: string; thinking?: string }> {
    const messages: ChatMessage[] = [
      { role: "system", content: params.context },
      { role: "user", content: `Task: ${params.task}` },
    ];

    return this.chat(messages);
  }
}
