import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CouncilDispatchGate, type RoleViewModel } from "./CouncilDispatchGate.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const RECOMMENDED: RoleViewModel[] = [
  {
    id: "moderator",
    name: "Moderator",
    subtitle: "Facilitates discussion",
    domainId: "core",
    domainLabel: "核心",
    tags: ["facilitation"],
    reason: "Always included",
    bio: "Facilitates council rounds",
    responsibilities: ["Guide discussion", "Summarize"],
  },
  {
    id: "ux_research",
    name: "UX Research",
    subtitle: "Usability lens",
    domainId: "design",
    domainLabel: "设计",
    tags: ["ux"],
  },
];

const ALTERNATIVE: RoleViewModel[] = [
  {
    id: "security_lens",
    name: "Security Lens",
    subtitle: "Threat modeling",
    domainId: "security",
    domainLabel: "安全",
    tags: ["security"],
  },
];

const ALL_ROLES = [...RECOMMENDED, ...ALTERNATIVE];

const PREVIEW = {
  moderatorSummary: "讨论用户登录流程优化方案",
  defaultSelectedRoleIds: ["moderator", "ux_research"],
  alternativeRoleIds: ["security_lens"],
};

function makeProps(overrides: Partial<React.ComponentProps<typeof CouncilDispatchGate>> = {}) {
  return {
    preview: PREVIEW,
    roles: ALL_ROLES,
    selectedRoleIds: ["moderator", "ux_research"],
    onSelectionChange: vi.fn(),
    onCancel: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
}

function getFirst(text: string | RegExp) {
  return screen.getAllByText(text)[0];
}

describe("CouncilDispatchGate", () => {
  it("does not render nested button controls", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("validateDOMNesting"),
      expect.anything(),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("renders moderator summary", () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    expect(getFirst("讨论用户登录流程优化方案")).toBeInTheDocument();
  });

  it("renders recommended roles", () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    expect(getFirst("建议参与者")).toBeInTheDocument();
    expect(getFirst("Moderator")).toBeInTheDocument();
    expect(getFirst("UX Research")).toBeInTheDocument();
  });

  it("renders alternative roles", () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    expect(getFirst("可选参与者")).toBeInTheDocument();
    expect(getFirst("Security Lens")).toBeInTheDocument();
  });

  it("default roles are selected (check indicator visible)", () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    const moderatorCard = getFirst("Moderator").closest("button")!;
    expect(within(moderatorCard).getByText("✓")).toBeInTheDocument();
  });

  it("clicking card toggles selection", async () => {
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ onSelectionChange })} />,
    );
    const card = getFirst("Security Lens").closest("button")!;
    await userEvent.click(card);
    expect(onSelectionChange).toHaveBeenCalledWith([
      "moderator",
      "ux_research",
      "security_lens",
    ]);
  });

  it("clicking selected card deselects it", async () => {
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ onSelectionChange })} />,
    );
    const card = getFirst("Moderator").closest("button")!;
    await userEvent.click(card);
    expect(onSelectionChange).toHaveBeenCalledWith(["ux_research"]);
  });

  it("footer shows selected count", () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    expect(getFirst("已选择 2 人")).toBeInTheDocument();
  });

  it("footer shows placeholder when none selected", () => {
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ selectedRoleIds: [] })} />,
    );
    expect(getFirst("请选择参与者")).toBeInTheDocument();
  });

  it("Continue calls onContinue with selectedRoleIds", async () => {
    const onContinue = vi.fn();
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ onContinue })} />,
    );
    const btn = screen.getAllByRole("button", { name: /继续/ })[0];
    await userEvent.click(btn);
    expect(onContinue).toHaveBeenCalledWith(["moderator", "ux_research"]);
  });

  it("Continue disabled when no selection", () => {
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ selectedRoleIds: [] })} />,
    );
    const btn = screen.getAllByRole("button", { name: /继续/ })[0];
    expect(btn).toBeDisabled();
  });

  it("Cancel calls onCancel", async () => {
    const onCancel = vi.fn();
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ onCancel })} />,
    );
    const btn = screen.getAllByRole("button", { name: "取消" })[0];
    await userEvent.click(btn);
    expect(onCancel).toHaveBeenCalled();
  });

  it("search filters role cards", async () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    const input = screen.getAllByPlaceholderText("搜索角色、领域、标签…")[0] as HTMLInputElement;
    await userEvent.type(input, "Security");
    // After search, Moderator card should not be in the recommended section
    const moderatorCards = screen.queryAllByRole("button", { name: /Moderator/ });
    expect(moderatorCards).toHaveLength(0);
    // Security Lens should still be present
    expect(getFirst("Security Lens")).toBeInTheDocument();
  });

  it("empty search result renders empty state", async () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    const input = screen.getAllByPlaceholderText("搜索角色、领域、标签…")[0] as HTMLInputElement;
    await userEvent.type(input, "nonexistent_xyz");
    expect(getFirst("没有找到匹配角色")).toBeInTheDocument();
  });

  it("clicking info opens bio panel", async () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    const infoBtn = screen.getAllByLabelText("查看 Moderator 详情")[0];
    await userEvent.click(infoBtn);
    expect(getFirst("Facilitates council rounds")).toBeInTheDocument();
    expect(getFirst("为什么推荐：")).toBeInTheDocument();
  });

  it("closing bio panel hides it", async () => {
    renderWithTheme(<CouncilDispatchGate {...makeProps()} />);
    await userEvent.click(screen.getAllByLabelText("查看 Moderator 详情")[0]);
    expect(getFirst("Facilitates council rounds")).toBeInTheDocument();
    await userEvent.click(screen.getAllByLabelText("关闭")[0]);
    expect(
      screen.queryByText("Facilitates council rounds"),
    ).not.toBeInTheDocument();
  });

  it("clicking info does not toggle selection", async () => {
    const onSelectionChange = vi.fn();
    renderWithTheme(
      <CouncilDispatchGate {...makeProps({ onSelectionChange })} />,
    );
    await userEvent.click(screen.getAllByLabelText("查看 Moderator 详情")[0]);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
