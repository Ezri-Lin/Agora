import type { RoleCallInput, RoleCallResult, RoleCard, CouncilMessage } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

const ROLE_RESPONSES: Record<string, (ctx: string) => string> = {
  skeptic_critic: (ctx) =>
    `我对当前议题有几个关键质疑：\n\n1. **前提假设风险** — ${ctx} 中可能存在的隐含假设需要被审视。\n2. **反例** — 历史上有类似路径失败的案例。\n3. **盲区** — 我们可能忽略了二阶效应。\n\n建议在推进前先验证这些前提。`,
  historian: (ctx) =>
    `从历史周期视角看：\n\n- 当前阶段类似 2010 年代早期的平台型产品窗口期。\n- ${ctx} 的路径有明确的历史先例。\n- 但需注意周期节奏：窗口期通常 18-24 个月。\n\n历史不会重复，但会押韵。`,
  product_strategist: (ctx) =>
    `从产品策略角度分析：\n\n- **核心价值主张**：${ctx} 的差异化在于记忆 + 多角色协作。\n- **切入点**：建议从个人知识工作者切入。\n- **护城河建设**：数据积累 + 角色模板 + 用户习惯。\n\n关键是先跑通 PMF，再谈规模化。`,
};

export class MockMultiCallProvider implements LLMProvider {
  async callRole(input: RoleCallInput): Promise<RoleCallResult> {
    // Simulate per-role independent call latency
    await delay(100 + Math.random() * 200);

    const generator = ROLE_RESPONSES[input.role.id]
      ?? (() => `[${input.role.name}] 关于当前议题，我的观点是需要综合考量多个维度。`);

    return {
      roleId: input.role.id,
      content: generator(input.roomSummary),
    };
  }

  async callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<string> {
    await delay(150);

    switch (params.task) {
      case "analyze":
        return `**场景分析**\n\n当前议题：${params.context}\n\n我认为这是一个需要多维度审视的议题，建议召集以下角色参与讨论。`;
      case "select_roles":
        return JSON.stringify(["skeptic_critic", "historian", "product_strategist"]);
      case "summarize":
        return `**会议总结**\n\n各位角色从不同角度对议题进行了深入讨论：\n- 反驳者指出了前提假设和潜在风险\n- 历史视角提供了周期类比\n- 产品策略给出了落地建议\n\n**共识**：方向可行，但需要先验证核心假设。\n**待办**：建议下一轮讨论具体执行路径。`;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
