import { describe, it, expect } from "vitest";
import { routeInputRuleFirst } from "../moderator/routeInputRules.js";
import type { RouteInputContext } from "@agora/shared";

const idleContext: RouteInputContext = {
  messageIndex: 1,
  hasDocuments: false,
  roomPhase: "idle",
  hasPendingDispatch: false,
  hasCompletedCouncilRound: false,
};

const awaitingActionContext: RouteInputContext = {
  ...idleContext,
  roomPhase: "awaiting_user_next_action",
  hasCompletedCouncilRound: true,
};

const awaitingDispatchContext: RouteInputContext = {
  ...idleContext,
  roomPhase: "awaiting_dispatch_confirmation",
  hasPendingDispatch: true,
};

describe("routeInputRuleFirst", () => {
  describe("chitchat (deterministic, no LLM)", () => {
    it("detects English greetings", () => {
      const result = routeInputRuleFirst("hi", idleContext);
      expect(result.kind).toBe("chitchat");
    });

    it("detects Chinese greetings", () => {
      const result = routeInputRuleFirst("你好", idleContext);
      expect(result.kind).toBe("chitchat");
    });

    it("detects very short input", () => {
      const result = routeInputRuleFirst("ok", idleContext);
      expect(result.kind).toBe("chitchat");
    });

    it("detects confirmations", () => {
      const result = routeInputRuleFirst("嗯", idleContext);
      expect(result.kind).toBe("chitchat");
    });

    it("detects empty string", () => {
      const result = routeInputRuleFirst("", idleContext);
      expect(result.kind).toBe("chitchat");
    });

    it("does NOT call LLM for obvious chitchat", () => {
      // If this returns needs_llm_route, the test fails
      const result = routeInputRuleFirst("hello", idleContext);
      expect(result.kind).not.toBe("needs_llm_route");
    });
  });

  describe("commands (context-dependent)", () => {
    it("detects '总结' in awaiting_user_next_action", () => {
      const result = routeInputRuleFirst("总结", awaitingActionContext);
      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.command).toBe("host_synthesize");
      }
    });

    it("detects '拍板' in awaiting_user_next_action", () => {
      const result = routeInputRuleFirst("拍板", awaitingActionContext);
      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.command).toBe("finalize_decision");
      }
    });

    it("detects '继续' in awaiting_user_next_action", () => {
      const result = routeInputRuleFirst("继续", awaitingActionContext);
      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.command).toBe("continue_discussion");
      }
    });

    it("detects '取消' in awaiting_dispatch_confirmation", () => {
      const result = routeInputRuleFirst("取消", awaitingDispatchContext);
      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.command).toBe("cancel_dispatch");
      }
    });

    it("does NOT match command in wrong phase", () => {
      // "总结" in idle phase should NOT be a command — falls to chitchat (short)
      const result = routeInputRuleFirst("总结", idleContext);
      expect(result.kind).toBe("chitchat");
    });
  });

  describe("light_response", () => {
    it("detects rephrase requests", () => {
      const result = routeInputRuleFirst("换个说法", idleContext);
      expect(result.kind).toBe("light_response");
    });

    it("detects short questions", () => {
      const result = routeInputRuleFirst("这是什么?", idleContext);
      expect(result.kind).toBe("light_response");
    });
  });

  describe("needs_llm_route (uncertain)", () => {
    it("returns needs_llm_route for substantive requests", () => {
      const result = routeInputRuleFirst(
        "帮我分析一下这个架构方案的可行性和商业价值",
        idleContext,
      );
      expect(result.kind).toBe("needs_llm_route");
    });

    it("returns needs_llm_route for complex Chinese text", () => {
      const result = routeInputRuleFirst(
        "我们需要讨论一下这个产品的定位和目标用户群",
        idleContext,
      );
      expect(result.kind).toBe("needs_llm_route");
    });
  });
});
