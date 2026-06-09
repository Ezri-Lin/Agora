import type { PersonaContract, PersonaCompactField } from "@agora/shared";
import type { ContextPackage } from "../context/ContextCompiler.js";

/** Phase of the council round. */
export type PromptPhase = "opening" | "cross_exam";

/** Room-level context injected into the prompt. */
export interface PromptRoomContext {
  topic: string;
  userMessage: string;
  moderatorFraming?: string;
  participants?: Array<{ id: string; name: string }>;
}

/** Input for compilePersonaPrompt. */
export interface CompilePersonaPromptInput {
  personaContract: PersonaContract;
  phase: PromptPhase;
  roomContext: PromptRoomContext;
  existingContext?: string;
  /** Retrieved workspace context to inject into the prompt. */
  contextPackage?: ContextPackage;
}

/** Compiled prompt output. */
export interface CompiledPersonaPrompt {
  /** Full system prompt text */
  system: string;
  /** Structured messages for the LLM */
  messages: Array<{ role: "system" | "user"; content: string }>;
  /** The compact schema fields expected in the response */
  expectedCompactSchema: PersonaCompactField[];
  /** Flat prompt text (for legacy callers that want a single string) */
  promptText: string;
}
