import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryCandidateReviewPanel } from "./MemoryCandidateReviewPanel.js";
import { MemoryScopeBadge } from "./MemoryScopeBadge.js";
import type { MemoryCandidateViewModel } from "./types.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function makeCandidate(overrides: Partial<MemoryCandidateViewModel> = {}): MemoryCandidateViewModel {
  return {
    id: "mem-1",
    text: "The team prefers incremental rollouts over big-bang releases",
    scope: "project",
    reason: "Discussed in depth during deployment strategy round",
    tags: ["deployment", "strategy"],
    ...overrides,
  };
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    candidates: [makeCandidate()],
    onSave: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe("MemoryScopeBadge", () => {
  it("renders project scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="project" />);
    expect(screen.getByText("项目")).toBeInTheDocument();
  });

  it("renders decision scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="decision" />);
    expect(screen.getByText("决策")).toBeInTheDocument();
  });

  it("renders role_usage scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="role_usage" />);
    expect(screen.getByText("角色使用")).toBeInTheDocument();
  });

  it("renders global scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="global" />);
    expect(screen.getByText("全局")).toBeInTheDocument();
  });

  it("renders shared_experience scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="shared_experience" />);
    expect(screen.getByText("共同经历")).toBeInTheDocument();
  });

  it("renders domain scope label", () => {
    renderWithTheme(<MemoryScopeBadge scope="domain" />);
    expect(screen.getByText("领域")).toBeInTheDocument();
  });
});

describe("MemoryCandidateReviewPanel", () => {
  it("renders panel title", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("记忆候选")).toBeInTheDocument();
  });

  it("renders candidate text", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("The team prefers incremental rollouts over big-bang releases")).toBeInTheDocument();
  });

  it("renders scope badge on candidate", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("项目")).toBeInTheDocument();
  });

  it("renders reason", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("Discussed in depth during deployment strategy round")).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("deployment")).toBeInTheDocument();
    expect(screen.getByText("strategy")).toBeInTheDocument();
  });

  it("selectedByDefault initializes as selected", () => {
    const candidate = makeCandidate({ selectedByDefault: true });
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ candidates: [candidate] })} />,
    );
    const card = screen.getByText("The team prefers incremental rollouts over big-bang releases").closest("div[role='button']")! as HTMLElement;
    expect(within(card).getByText("✓")).toBeInTheDocument();
  });

  it("candidates without selectedByDefault are not selected", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    const card = screen.getByText("The team prefers incremental rollouts over big-bang releases").closest("div[role='button']")! as HTMLElement;
    expect(within(card).queryByText("✓")).not.toBeInTheDocument();
  });

  it("clicking card toggles selected", async () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    const card = screen.getByText("The team prefers incremental rollouts over big-bang releases").closest("div[role='button']")! as HTMLElement;
    await userEvent.click(card);
    expect(within(card).getByText("✓")).toBeInTheDocument();
    await userEvent.click(card);
    expect(within(card).queryByText("✓")).not.toBeInTheDocument();
  });

  it("footer shows selected count", async () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    expect(screen.getByText("请选择要保存的记忆")).toBeInTheDocument();
    const card = screen.getByText("The team prefers incremental rollouts over big-bang releases").closest("div[role='button']")! as HTMLElement;
    await userEvent.click(card);
    expect(screen.getByText("已选择 1 条")).toBeInTheDocument();
  });

  it("save disabled when no selection", () => {
    renderWithTheme(<MemoryCandidateReviewPanel {...makeProps()} />);
    const btn = screen.getByRole("button", { name: "保存选中" });
    expect(btn).toBeDisabled();
  });

  it("save calls onSave with selected candidates", async () => {
    const onSave = vi.fn();
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ onSave })} />,
    );
    const card = screen.getByText("The team prefers incremental rollouts over big-bang releases").closest("div[role='button']")! as HTMLElement;
    await userEvent.click(card);
    const btn = screen.getByRole("button", { name: "保存选中" });
    await userEvent.click(btn);
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ id: "mem-1" }),
    ]);
  });

  it("dismiss calls onDismiss", async () => {
    const onDismiss = vi.fn();
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ onDismiss })} />,
    );
    const btn = screen.getByRole("button", { name: "忽略全部" });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("empty state renders", () => {
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ candidates: [] })} />,
    );
    expect(screen.getByText("No memory candidates yet.")).toBeInTheDocument();
  });

  it("selection persists after toggling another candidate", async () => {
    const candidates = [
      makeCandidate({ id: "mem-1", text: "First memory" }),
      makeCandidate({ id: "mem-2", text: "Second memory" }),
    ];
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ candidates })} />,
    );
    const first = screen.getByText("First memory").closest("div[role='button']")! as HTMLElement;
    const second = screen.getByText("Second memory").closest("div[role='button']")! as HTMLElement;
    await userEvent.click(first);
    expect(within(first).getByText("✓")).toBeInTheDocument();
    await userEvent.click(second);
    expect(within(first).getByText("✓")).toBeInTheDocument();
    expect(within(second).getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("已选择 2 条")).toBeInTheDocument();
  });

  it("multiple scopes render correctly", () => {
    const candidates = [
      makeCandidate({ id: "mem-1", text: "Global insight", scope: "global" }),
      makeCandidate({ id: "mem-2", text: "Decision made", scope: "decision" }),
      makeCandidate({ id: "mem-3", text: "Role learned", scope: "role_usage" }),
    ];
    renderWithTheme(
      <MemoryCandidateReviewPanel {...makeProps({ candidates })} />,
    );
    expect(screen.getByText("全局")).toBeInTheDocument();
    expect(screen.getByText("决策")).toBeInTheDocument();
    expect(screen.getByText("角色使用")).toBeInTheDocument();
  });
});
