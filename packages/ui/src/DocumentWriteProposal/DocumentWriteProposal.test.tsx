import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentWriteProposalPanel } from "./DocumentWriteProposalPanel.js";
import { WriteRiskBadge } from "./WriteRiskBadge.js";
import type { DocWriteCandidateViewModel, DiffPreviewViewModel } from "./types.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function makeCandidate(overrides: Partial<DocWriteCandidateViewModel> = {}): DocWriteCandidateViewModel {
  return {
    id: "plan-1",
    targetPath: "docs/requirements.md",
    mode: "append_section",
    intent: "Append acceptance criteria section",
    rationale: "Discussion concluded with clear criteria",
    riskLevel: "low",
    ...overrides,
  };
}

function makeDiff(overrides: Partial<DiffPreviewViewModel> = {}): DiffPreviewViewModel {
  return {
    patchId: "plan-1",
    targetPath: "docs/requirements.md",
    summary: "Append acceptance criteria to requirements",
    additions: 8,
    deletions: 0,
    riskLevel: "low",
    diffText: "+ ## Acceptance Criteria\n+ - User can submit form\n+ - Validation shows errors",
    ...overrides,
  };
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    candidates: [makeCandidate()],
    onGenerateDiff: vi.fn(),
    onApply: vi.fn(),
    onDismiss: vi.fn(),
    onDismissAll: vi.fn(),
    onCloseDiff: vi.fn(),
    ...overrides,
  };
}

describe("WriteRiskBadge", () => {
  it("renders low risk label", () => {
    renderWithTheme(<WriteRiskBadge riskLevel="low" />);
    expect(screen.getByText("低风险")).toBeInTheDocument();
  });

  it("renders medium risk label", () => {
    renderWithTheme(<WriteRiskBadge riskLevel="medium" />);
    expect(screen.getByText("中风险")).toBeInTheDocument();
  });

  it("renders high risk label", () => {
    renderWithTheme(<WriteRiskBadge riskLevel="high" />);
    expect(screen.getByText("高风险")).toBeInTheDocument();
  });
});

describe("DocumentWriteProposalPanel", () => {
  it("renders panel title", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("文档写入建议")).toBeInTheDocument();
  });

  it("renders candidate target path", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("docs/requirements.md")).toBeInTheDocument();
  });

  it("renders candidate intent", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("Append acceptance criteria section")).toBeInTheDocument();
  });

  it("renders candidate rationale", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("Discussion concluded with clear criteria")).toBeInTheDocument();
  });

  it("renders risk badge on candidate", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("低风险")).toBeInTheDocument();
  });

  it("renders mode label", () => {
    renderWithTheme(<DocumentWriteProposalPanel {...makeProps()} />);
    expect(screen.getByText("追加章节")).toBeInTheDocument();
  });

  it("shows pending count in subtitle", () => {
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({ candidates: [makeCandidate(), makeCandidate({ id: "plan-2" })] })}
      />,
    );
    expect(screen.getByText("2 条待处理建议")).toBeInTheDocument();
  });

  it("clicking generate diff calls onGenerateDiff", async () => {
    const onGenerateDiff = vi.fn();
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ onGenerateDiff })} />,
    );
    const btn = screen.getByRole("button", { name: "生成 Diff Preview" });
    await userEvent.click(btn);
    expect(onGenerateDiff).toHaveBeenCalledWith("plan-1");
  });

  it("clicking dismiss calls onDismiss", async () => {
    const onDismiss = vi.fn();
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ onDismiss })} />,
    );
    const btn = screen.getByRole("button", { name: "忽略" });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledWith("plan-1");
  });

  it("renders diff preview when provided", () => {
    const diff = makeDiff();
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({ diffPreview: diff, previewForId: "plan-1" })}
      />,
    );
    expect(screen.getByText("Append acceptance criteria to requirements")).toBeInTheDocument();
    expect(screen.getByText("+8")).toBeInTheDocument();
    expect(screen.getByText("-0")).toBeInTheDocument();
    expect(screen.getByText("确认写入")).toBeInTheDocument();
  });

  it("clicking confirm calls onApply", async () => {
    const onApply = vi.fn();
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({
          diffPreview: makeDiff(),
          previewForId: "plan-1",
          onApply,
        })}
      />,
    );
    const btn = screen.getByRole("button", { name: "确认写入" });
    await userEvent.click(btn);
    expect(onApply).toHaveBeenCalledWith("plan-1");
  });

  it("clicking cancel in diff calls onCloseDiff", async () => {
    const onCloseDiff = vi.fn();
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({
          diffPreview: makeDiff(),
          previewForId: "plan-1",
          onCloseDiff,
        })}
      />,
    );
    const btn = screen.getByRole("button", { name: "取消" });
    await userEvent.click(btn);
    expect(onCloseDiff).toHaveBeenCalled();
  });

  it("shows success state after write", () => {
    const candidate = makeCandidate({ status: "success" });
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ candidates: [candidate] })} />,
    );
    expect(screen.getByText("写入成功")).toBeInTheDocument();
  });

  it("shows error state on candidate", () => {
    const candidate = makeCandidate({ status: "error", error: "Hash mismatch" });
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ candidates: [candidate] })} />,
    );
    expect(screen.getByText("Hash mismatch")).toBeInTheDocument();
  });

  it("unsupported mode shows disabled button", () => {
    const candidate = makeCandidate({ mode: "delete_section" });
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ candidates: [candidate] })} />,
    );
    const btn = screen.getByRole("button", { name: "暂不支持此变更类型" });
    expect(btn).toBeDisabled();
  });

  it("apply result success shows hash and rollback", () => {
    const result = { applied: true, newHash: "h_abc123", rollbackId: "rb-1", warnings: [] };
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({
          diffPreview: makeDiff(),
          previewForId: "plan-1",
          applyResult: result,
        })}
      />,
    );
    expect(screen.getByText(/h_abc123/)).toBeInTheDocument();
    expect(screen.getByText(/rb-1/)).toBeInTheDocument();
  });

  it("empty candidates shows empty state", () => {
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ candidates: [] })} />,
    );
    expect(screen.getByText("No document write proposals yet.")).toBeInTheDocument();
  });

  it("clicking dismiss all calls onDismissAll", async () => {
    const onDismissAll = vi.fn();
    renderWithTheme(
      <DocumentWriteProposalPanel
        {...makeProps({
          candidates: [makeCandidate(), makeCandidate({ id: "plan-2" })],
          onDismissAll,
        })}
      />,
    );
    const btn = screen.getByRole("button", { name: "全部忽略" });
    await userEvent.click(btn);
    expect(onDismissAll).toHaveBeenCalled();
  });

  it("high risk candidate shows high risk badge", () => {
    const candidate = makeCandidate({ riskLevel: "high" });
    renderWithTheme(
      <DocumentWriteProposalPanel {...makeProps({ candidates: [candidate] })} />,
    );
    expect(screen.getByText("高风险")).toBeInTheDocument();
  });
});
