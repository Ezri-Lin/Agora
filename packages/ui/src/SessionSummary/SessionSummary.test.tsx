import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionSummaryPanel } from "./SessionSummaryPanel.js";
import { SummarySection } from "./SummarySection.js";
import type { SessionSummaryViewModel } from "./types.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function makeSummary(overrides: Partial<SessionSummaryViewModel> = {}): SessionSummaryViewModel {
  return {
    id: "summary-1",
    title: "Council Round Summary",
    topic: "User login flow optimization",
    roundCount: 2,
    consensus: ["OAuth2 is preferred", "Session timeout should be 30min"],
    disagreements: [
      { with: "Security Lens", point: "JWT tokens should be short-lived" },
      { point: "Rate limiting approach differs" },
    ],
    unresolvedQuestions: ["How to handle SSO fallback?"],
    decisions: ["Use OAuth2 with PKCE flow", "Implement 30-min session timeout"],
    actionItems: [
      { text: "Draft OAuth2 integration spec", owner: "tech_lead", due: "2026-06-15" },
      { text: "Review session management" },
    ],
    keyInsights: ["PKCE eliminates need for client secret"],
    docWriteCandidateCount: 3,
    memoryCandidateCount: 2,
    ...overrides,
  };
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    summary: makeSummary(),
    ...overrides,
  };
}

describe("SummarySection", () => {
  it("renders title and items", () => {
    renderWithTheme(
      <SummarySection title="共识" items={["Point A", "Point B"]} />,
    );
    expect(screen.getByText("共识")).toBeInTheDocument();
    expect(screen.getByText("Point A")).toBeInTheDocument();
    expect(screen.getByText("Point B")).toBeInTheDocument();
  });

  it("renders empty text when no items", () => {
    renderWithTheme(
      <SummarySection title="决策" items={[]} emptyText="暂无决策" />,
    );
    expect(screen.getByText("暂无决策")).toBeInTheDocument();
  });

  it("renders default empty text when not provided", () => {
    renderWithTheme(
      <SummarySection title="共识" items={[]} />,
    );
    expect(screen.getByText("暂无共识")).toBeInTheDocument();
  });
});

describe("SessionSummaryPanel", () => {
  it("renders title", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("Council Round Summary")).toBeInTheDocument();
  });

  it("renders topic", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText(/User login flow optimization/)).toBeInTheDocument();
  });

  it("renders round count", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText(/轮次：2/)).toBeInTheDocument();
  });

  it("renders consensus items", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("OAuth2 is preferred")).toBeInTheDocument();
    expect(screen.getByText("Session timeout should be 30min")).toBeInTheDocument();
  });

  it("renders disagreements with source", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("[Security Lens]")).toBeInTheDocument();
    expect(screen.getByText("JWT tokens should be short-lived")).toBeInTheDocument();
  });

  it("renders disagreements without source", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("Rate limiting approach differs")).toBeInTheDocument();
  });

  it("renders unresolved questions", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("How to handle SSO fallback?")).toBeInTheDocument();
  });

  it("renders decisions", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("Use OAuth2 with PKCE flow")).toBeInTheDocument();
  });

  it("renders action items", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("Draft OAuth2 integration spec")).toBeInTheDocument();
    expect(screen.getByText("Review session management")).toBeInTheDocument();
  });

  it("renders action item owner", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("@tech_lead")).toBeInTheDocument();
  });

  it("renders action item due", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("due: 2026-06-15")).toBeInTheDocument();
  });

  it("renders key insights", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("PKCE eliminates need for client secret")).toBeInTheDocument();
  });

  it("renders candidate counts", () => {
    renderWithTheme(<SessionSummaryPanel {...makeProps()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("empty consensus fallback", () => {
    const summary = makeSummary({ consensus: [] });
    renderWithTheme(<SessionSummaryPanel {...makeProps({ summary })} />);
    expect(screen.getByText("暂无明确共识")).toBeInTheDocument();
  });

  it("empty disagreements fallback", () => {
    const summary = makeSummary({ disagreements: [] });
    renderWithTheme(<SessionSummaryPanel {...makeProps({ summary })} />);
    expect(screen.getByText("暂无记录的分歧")).toBeInTheDocument();
  });

  it("empty unresolved questions fallback", () => {
    const summary = makeSummary({ unresolvedQuestions: [] });
    renderWithTheme(<SessionSummaryPanel {...makeProps({ summary })} />);
    expect(screen.getByText("暂无未解决问题")).toBeInTheDocument();
  });

  it("empty decisions fallback", () => {
    const summary = makeSummary({ decisions: [] });
    renderWithTheme(<SessionSummaryPanel {...makeProps({ summary })} />);
    expect(screen.getByText("暂无决策")).toBeInTheDocument();
  });

  it("save summary calls onSaveSummary", async () => {
    const onSaveSummary = vi.fn();
    const summary = makeSummary();
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ summary, onSaveSummary })} />,
    );
    const btn = screen.getByRole("button", { name: "保存 Summary" });
    await userEvent.click(btn);
    expect(onSaveSummary).toHaveBeenCalledWith(summary);
  });

  it("save decision log calls onSaveDecisionLog", async () => {
    const onSaveDecisionLog = vi.fn();
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ onSaveDecisionLog })} />,
    );
    const btn = screen.getByRole("button", { name: "保存 Decision Log" });
    await userEvent.click(btn);
    expect(onSaveDecisionLog).toHaveBeenCalledWith([
      "Use OAuth2 with PKCE flow",
      "Implement 30-min session timeout",
    ]);
  });

  it("create note seed calls onCreatePermanentNoteSeed", async () => {
    const onCreatePermanentNoteSeed = vi.fn();
    const summary = makeSummary();
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ summary, onCreatePermanentNoteSeed })} />,
    );
    const btn = screen.getByRole("button", { name: "生成 Note Seed" });
    await userEvent.click(btn);
    expect(onCreatePermanentNoteSeed).toHaveBeenCalledWith(summary);
  });

  it("dismiss calls onDismiss", async () => {
    const onDismiss = vi.fn();
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ onDismiss })} />,
    );
    const btn = screen.getByRole("button", { name: "关闭" });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("opens memory review from the footer", async () => {
    const onOpenMemoryReview = vi.fn();
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ onOpenMemoryReview })} />,
    );
    const btn = screen.getByRole("button", { name: "Review Memory Candidates" });
    await userEvent.click(btn);
    expect(onOpenMemoryReview).toHaveBeenCalled();
  });

  it("save decision log disabled when no decisions", async () => {
    const onSaveDecisionLog = vi.fn();
    const summary = makeSummary({ decisions: [] });
    renderWithTheme(
      <SessionSummaryPanel {...makeProps({ summary, onSaveDecisionLog })} />,
    );
    const btn = screen.getByRole("button", { name: "保存 Decision Log" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onSaveDecisionLog).not.toHaveBeenCalled();
  });

  it("does not call callbacks on render", () => {
    const onSaveSummary = vi.fn();
    const onSaveDecisionLog = vi.fn();
    const onCreatePermanentNoteSeed = vi.fn();
    const onDismiss = vi.fn();
    renderWithTheme(
      <SessionSummaryPanel
        {...makeProps({ onSaveSummary, onSaveDecisionLog, onCreatePermanentNoteSeed, onDismiss })}
      />,
    );
    expect(onSaveSummary).not.toHaveBeenCalled();
    expect(onSaveDecisionLog).not.toHaveBeenCalled();
    expect(onCreatePermanentNoteSeed).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("renders default title when not provided", () => {
    const summary = makeSummary({ title: undefined });
    renderWithTheme(<SessionSummaryPanel {...makeProps({ summary })} />);
    expect(screen.getByText("本轮总结")).toBeInTheDocument();
  });
});
