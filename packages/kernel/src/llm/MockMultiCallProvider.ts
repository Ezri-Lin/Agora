import type { RoleCallInput, RoleCallResult, RoleCard, CouncilMessage } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

const ROLE_RESPONSES: Record<string, (ctx: string) => string> = {
  skeptic_critic: (ctx) =>
    `I have several key challenges to this proposal:\n\n1. **Hidden Assumptions** — ${ctx} contains implicit assumptions that need to be examined.\n2. **Counter-examples** — Historically, similar approaches have failed.\n3. **Blind Spots** — We may be overlooking second-order effects.\n\nI recommend validating these premises before proceeding.`,
  historian: (ctx) =>
    `From a historical cycle perspective:\n\n- The current phase resembles the early 2010s platform product window.\n- The path in ${ctx} has clear historical precedents.\n- But note the cycle rhythm: windows typically last 18-24 months.\n\nHistory doesn't repeat, but it rhymes.`,
  product_strategist: (ctx) =>
    `From a product strategy perspective:\n\n- **Core Value Proposition**: ${ctx}'s differentiation lies in memory + multi-role collaboration.\n- **Entry Point**: Start with individual knowledge workers.\n- **Moat Building**: Data accumulation + role templates + user habits.\n\nThe key is to validate PMF first, then scale.`,
  systems_architect: (ctx) =>
    `From a systems architecture perspective:\n\n- **Key Components**: ${ctx} requires a modular pipeline with clear boundaries.\n- **Bottlenecks**: Context budget management and LLM latency are the primary constraints.\n- **Tradeoffs**: Local-first storage limits collaboration but improves privacy.\n\nDesign for failure — every component should degrade gracefully.`,
  security_lens: (ctx) =>
    `From a security & threat perspective:\n\n- **Attack Surface**: ${ctx} exposes several trust boundaries that need explicit definition.\n- **Threat Model (STRIDE)**: Spoofing and tampering risks are highest at the API layer.\n- **Mitigations**: Defense-in-depth with least-privilege access and input validation at every boundary.\n\nSecurity is not a feature — it's a property of the architecture.`,
  science_lens: (ctx) =>
    `From a scientific methodology perspective:\n\n- **Evidence Quality**: ${ctx}'s core claims need stronger empirical backing.\n- **Falsifiability**: What experiment would disprove this hypothesis? Define it upfront.\n- **Base Rate**: Similar initiatives have a ~30% success rate — adjust confidence accordingly.\n\nCalibrate confidence to evidence strength, not enthusiasm.`,
  psychology_lens: (ctx) =>
    `From a psychology & behavior perspective:\n\n- **Cognitive Biases**: ${ctx} may be affected by optimism bias and planning fallacy.\n- **Motivation (SDT)**: Users need autonomy, competence, and relatedness — does this deliver?\n- **Habit Loop**: The cue-routine-reward cycle needs a clear trigger and variable reward.\n\nDesign for how people actually behave, not how you wish they would.`,
};

export class MockMultiCallProvider implements LLMProvider {
  async callRole(input: RoleCallInput): Promise<RoleCallResult> {
    // Simulate per-role independent call latency
    await delay(100 + Math.random() * 200);

    const generator = ROLE_RESPONSES[input.role.id]
      ?? (() => `[${input.role.name}] Regarding this topic, I believe we need to consider multiple dimensions comprehensively.`);

    return {
      roleId: input.role.id,
      content: generator(input.roomSummary),
    };
  }

  async callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize" | "extract_memories";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<{ content: string; thinking?: string }> {
    await delay(150);

    switch (params.task) {
      case "analyze":
        return { content: `**Scene Analysis**\n\nCurrent topic: ${params.context}\n\nThis is a topic that requires multi-dimensional examination. I recommend convening the following roles for discussion.` };
      case "select_roles":
        return { content: JSON.stringify(["skeptic_critic", "historian", "product_strategist"]) };
      case "summarize":
        return { content: `**Council Summary**\n\nThe roles examined this topic from different angles:\n- The Skeptic Critic identified hidden assumptions and potential risks\n- The Historian provided historical cycle analogies\n- The Product Strategist offered actionable recommendations\n\n**Consensus**: The direction is viable, but core assumptions need validation.\n**Next Steps**: Recommend a follow-up round on the execution path.` };
      case "extract_memories":
        return { content: JSON.stringify([
          { content: "Multi-role discussion helps reveal single-perspective blind spots", domains: ["decision-making"], tags: ["council", "diversity"], scope: "universal" },
        ]) };
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
