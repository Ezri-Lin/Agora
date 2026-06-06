import type { CouncilMessage, RoleCard } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

export class Moderator {
  constructor(private llm: LLMProvider) {}

  async analyzeScene(roomId: string, topic: string): Promise<string> {
    return this.llm.callModerator({
      roomId,
      task: "analyze",
      context: topic,
    });
  }

  async selectRoles(
    roomId: string,
    topic: string,
    available: RoleCard[],
  ): Promise<string[]> {
    const raw = await this.llm.callModerator({
      roomId,
      task: "select_roles",
      context: topic,
      availableRoles: available,
    });
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return ["skeptic_critic", "historian", "product_strategist"];
    }
  }

  async summarize(roomId: string, messages: CouncilMessage[]): Promise<string> {
    return this.llm.callModerator({
      roomId,
      task: "summarize",
      context: "",
      messages,
    });
  }
}
