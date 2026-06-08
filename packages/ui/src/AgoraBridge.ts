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

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
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
    readDoc(workspaceRoot: string, filePath: string): Promise<string | null>;
    getRecent(): Promise<RecentWorkspace[]>;
    removeRecent(path: string): Promise<void>;
  };
  room: {
    list(workspaceRoot: string): Promise<Array<{ id: string; title: string; createdAt: string }>>;
    load(workspaceRoot: string, roomId: string): Promise<{ room: unknown; messages: unknown[] } | null>;
    create(workspaceRoot: string, room: unknown): Promise<unknown>;
    appendMessage(workspaceRoot: string, roomId: string, message: unknown): Promise<void>;
    writeSummary(workspaceRoot: string, roomId: string, summary: string): Promise<void>;
    writeMemoryCandidates(workspaceRoot: string, roomId: string, content: string): Promise<void>;
    exportSession(workspaceRoot: string, roomId: string, content: string): Promise<void>;
    readMessages(workspaceRoot: string, roomId: string): Promise<unknown[]>;
    listOutputs(workspaceRoot: string, roomId: string): Promise<string[]>;
    getMemories(workspaceRoot: string): Promise<Array<{ id: string; content: string; domains: string[]; tags: string[]; scope: string; status: string; createdAt: string }>>;
    getAllMemories(workspaceRoot: string): Promise<Array<{ id: string; content: string; domains: string[]; tags: string[]; scope: string; status: string; createdAt: string }>>;
    updateMemoryStatus(workspaceRoot: string, memoryId: string, status: "accepted" | "rejected"): Promise<void>;
  };
  llm: {
    chat(params: {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
    }): Promise<{ content: string; thinking?: string }>;
    chatStream(params: {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
    }): Promise<{ streamId: string }>;
    onChunk(callback: (data: { streamId: string; delta?: string; thinkingDelta?: string }) => void): () => void;
    onDone(callback: (data: { streamId: string; fullContent: string; fullThinking?: string }) => void): () => void;
    onStreamError(callback: (data: { streamId: string; error: string }) => void): () => void;
  };
  customRoles: {
    list(workspaceRoot: string): Promise<Array<{
      id: string; name: string; nameCN: string; subtitle: string;
      type: string; systemPrompt: string; tags: string[];
    }>>;
    save(workspaceRoot: string, role: {
      id: string; name: string; nameCN: string; subtitle: string;
      type: string; systemPrompt: string; tags: string[];
    }): Promise<Array<{ id: string; name: string }>>;
    delete(workspaceRoot: string, roleId: string): Promise<Array<{ id: string; name: string }>>;
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
