import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewPanelHost } from "./ReviewPanelHost.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderWithTheme(ui: React.ReactElement) {
  localStorage.setItem("agora-theme", "light");
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function makeProps(overrides: Partial<React.ComponentProps<typeof ReviewPanelHost>> = {}) {
  return {
    showWriteProposalPanel: false,
    showMemoryReviewPanel: false,
    showSessionSummaryPanel: false,
    onCloseWriteProposalPanel: vi.fn(),
    onCloseMemoryReviewPanel: vi.fn(),
    onCloseSessionSummaryPanel: vi.fn(),
    onOpenMemoryReviewPanel: vi.fn(),
    ...overrides,
  };
}

describe("ReviewPanelHost", () => {
  it("renders the document write proposal empty state", () => {
    renderWithTheme(<ReviewPanelHost {...makeProps({ showWriteProposalPanel: true })} />);
    expect(screen.getByText("No document write proposals yet.")).toBeInTheDocument();
  });

  it("renders the memory review empty state", () => {
    renderWithTheme(<ReviewPanelHost {...makeProps({ showMemoryReviewPanel: true })} />);
    expect(screen.getByText("No memory candidates yet.")).toBeInTheDocument();
  });

  it("renders an empty session summary state", () => {
    renderWithTheme(<ReviewPanelHost {...makeProps({ showSessionSummaryPanel: true })} />);
    expect(screen.getByText("No session summary generated yet.")).toBeInTheDocument();
  });

  it("closes each hosted panel", async () => {
    const onCloseWriteProposalPanel = vi.fn();
    const onCloseMemoryReviewPanel = vi.fn();
    const onCloseSessionSummaryPanel = vi.fn();
    renderWithTheme(
      <ReviewPanelHost
        {...makeProps({
          showWriteProposalPanel: true,
          showMemoryReviewPanel: true,
          showSessionSummaryPanel: true,
          onCloseWriteProposalPanel,
          onCloseMemoryReviewPanel,
          onCloseSessionSummaryPanel,
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close write proposals" }));
    await userEvent.click(screen.getByRole("button", { name: "Close memory review" }));
    await userEvent.click(screen.getByRole("button", { name: "Close session summary" }));

    expect(onCloseWriteProposalPanel).toHaveBeenCalled();
    expect(onCloseMemoryReviewPanel).toHaveBeenCalled();
    expect(onCloseSessionSummaryPanel).toHaveBeenCalled();
  });

  it("opens memory review from the session summary footer", async () => {
    const onOpenMemoryReviewPanel = vi.fn();
    renderWithTheme(
      <ReviewPanelHost
        {...makeProps({
          showSessionSummaryPanel: true,
          onOpenMemoryReviewPanel,
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Review Memory Candidates" }));
    expect(onOpenMemoryReviewPanel).toHaveBeenCalled();
  });
});
