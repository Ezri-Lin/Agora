/** Type-safe wrapper for the Electron IPC bridge (window.agora) */

export interface LLMSettingsView {
  provider: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxOutputTokens: number;
  keyStatus: { hasApiKey: boolean; maskedKey: string | null; source: "env" | "saved" | "session" | "missing" };
}

export interface SaveLLMSettingsInput {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface TestConnectionResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ScannedDoc {
  path: string;
  name: string;
  ext: string;
}

export interface CouncilRoundResult {
  moderatorAnalysis: string;
  roleMessages: Array<{
    id: string;
    roomId: string;
    senderType: "role";
    senderId: string;
    content: string;
    createdAt: string;
  }>;
  summary: string;
  contextDebug: {
    moderatorHasOverflow: boolean;
    moderatorOverflowDocs: string[];
    moderatorIncludedDocCount: number;
    moderatorTotalChars: number;
    roleContextMode: string;
    roleTruncatedDocs: number;
    roleTotalChars: number;
    roleDocCount: number;
  };
}

export interface AgoraBridge {
  getAppVersion(): Promise<string>;
  getPlatform(): Promise<string>;
  getLLMConfig(): Promise<{ provider: string; model: string; apiKeyEnv?: string; baseUrl?: string }>;
  workspace: {
    openDialog(): Promise<string | null>;
    init(workspacePath: string): Promise<{ path: string; name: string }>;
    listDocs(workspacePath: string): Promise<ScannedDoc[]>;
    readDoc(filePath: string): Promise<string | null>;
  };
  room: {
    create(workspaceRoot: string, room: unknown): Promise<unknown>;
    appendMessage(workspaceRoot: string, roomId: string, message: unknown): Promise<void>;
    writeSummary(workspaceRoot: string, roomId: string, summary: string): Promise<void>;
    writeMemoryCandidates(workspaceRoot: string, roomId: string, content: string): Promise<void>;
    exportSession(workspaceRoot: string, roomId: string, content: string): Promise<void>;
    readMessages(workspaceRoot: string, roomId: string): Promise<unknown[]>;
    listOutputs(workspaceRoot: string, roomId: string): Promise<string[]>;
  };
  llm: {
    chat(params: {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
    }): Promise<{ content: string }>;
  };
  settings: {
    getLLM(): Promise<LLMSettingsView>;
    saveLLM(input: SaveLLMSettingsInput): Promise<LLMSettingsView>;
    clearApiKey(): Promise<LLMSettingsView>;
    testConnection(): Promise<TestConnectionResult>;
  };
}

declare global {
  interface Window {
    agora: AgoraBridge;
  }
}

export function getBridge(): AgoraBridge | null {
  return typeof window !== "undefined" && window.agora ? window.agora : null;
}
