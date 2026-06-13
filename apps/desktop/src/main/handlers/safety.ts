import { resolve, extname } from "node:path";

// File types Agora is allowed to read/write
const ALLOWED_EXTENSIONS = new Set([
  // Docs
  ".md", ".txt", ".rst", ".adoc",
  // Config
  ".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
  // Code
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyi", ".pyx",
  ".rs", ".go", ".java", ".kt", ".kts",
  ".rb", ".php",
  ".c", ".cpp", ".h", ".hpp", ".cc",
  ".swift", ".m", ".mm",
  ".sh", ".bash", ".zsh", ".fish",
  ".sql", ".graphql", ".gql",
  // Web
  ".html", ".htm", ".css", ".scss", ".less", ".svg",
  // Data
  ".csv", ".tsv", ".xml",
  // Build
  ".lock", ".gradle", ".cmake", ".makefile",
]);

// Room ID format: alphanumeric, dash, underscore only
const ROOM_ID_RE = /^[a-zA-Z0-9_-]+$/;

// Allowed providers
const ALLOWED_PROVIDERS = new Set(["mock", "openai_compatible"]);

/**
 * Assert that a file path is within the workspace root.
 * Prevents path traversal attacks (../../etc/passwd).
 */
export function assertInWorkspace(filePath: string, workspaceRoot: string): void {
  const resolvedFile = resolve(filePath);
  const resolvedRoot = resolve(workspaceRoot);
  if (!resolvedFile.startsWith(resolvedRoot + "/") && resolvedFile !== resolvedRoot) {
    throw new Error(`security_violation: Path ${filePath} is outside workspace ${workspaceRoot}`);
  }
}

/**
 * Sanitize a room ID. Only alphanumeric, dash, underscore allowed.
 * Rejects anything containing path separators or traversal sequences.
 */
export function sanitizeRoomId(roomId: string): string {
  if (!roomId || !ROOM_ID_RE.test(roomId)) {
    throw new Error(`security_violation: Invalid room ID "${roomId}" — only [a-zA-Z0-9_-] allowed`);
  }
  return roomId;
}

/**
 * Check if a file extension is in the allowed whitelist.
 */
export function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Assert file extension is allowed for read operations.
 */
export function assertAllowedFileType(filePath: string): void {
  if (!isAllowedExtension(filePath)) {
    throw new Error(`security_violation: File type ${extname(filePath)} not allowed`);
  }
}

/**
 * Validate LLM settings input fields.
 */
export function validateLLMInput(input: {
  provider?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}): void {
  if (input.provider !== undefined && !ALLOWED_PROVIDERS.has(input.provider)) {
    throw new Error(`security_violation: Unknown provider "${input.provider}"`);
  }
  if (input.model !== undefined && (typeof input.model !== "string" || input.model.length > 200)) {
    throw new Error(`security_violation: Invalid model name`);
  }
  if (input.baseUrl !== undefined) {
    if (typeof input.baseUrl !== "string" || input.baseUrl.length > 2000) {
      throw new Error(`security_violation: Invalid baseUrl`);
    }
    // Must be https or http
    if (input.baseUrl && !input.baseUrl.startsWith("https://") && !input.baseUrl.startsWith("http://")) {
      throw new Error(`security_violation: baseUrl must start with http:// or https://`);
    }
  }
  if (input.timeoutMs !== undefined && (typeof input.timeoutMs !== "number" || input.timeoutMs < 1000 || input.timeoutMs > 300000)) {
    throw new Error(`security_violation: timeoutMs must be between 1000 and 300000`);
  }
  if (input.maxOutputTokens !== undefined && (typeof input.maxOutputTokens !== "number" || input.maxOutputTokens < 1 || input.maxOutputTokens > 100000)) {
    throw new Error(`security_violation: maxOutputTokens must be between 1 and 100000`);
  }
}
