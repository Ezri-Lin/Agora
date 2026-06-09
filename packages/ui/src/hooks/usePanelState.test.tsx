import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePanelState } from "./usePanelState.js";

function Harness() {
  const panels = usePanelState();

  return (
    <div>
      <div>{panels.showWriteProposalPanel ? "write-open" : "write-closed"}</div>
      <div>{panels.showMemoryReviewPanel ? "memory-open" : "memory-closed"}</div>
      <div>{panels.showSessionSummaryPanel ? "summary-open" : "summary-closed"}</div>
      <button type="button" onClick={panels.openWriteProposalPanel}>open write</button>
      <button type="button" onClick={panels.closeWriteProposalPanel}>close write</button>
      <button type="button" onClick={panels.openMemoryReviewPanel}>open memory</button>
      <button type="button" onClick={panels.closeMemoryReviewPanel}>close memory</button>
      <button type="button" onClick={panels.openSessionSummaryPanel}>open summary</button>
      <button type="button" onClick={panels.closeSessionSummaryPanel}>close summary</button>
    </div>
  );
}

describe("usePanelState review panels", () => {
  it("opens and closes document write proposals", async () => {
    render(<Harness />);

    expect(screen.getByText("write-closed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "open write" }));
    expect(screen.getByText("write-open")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "close write" }));
    expect(screen.getByText("write-closed")).toBeInTheDocument();
  });

  it("opens and closes memory review", async () => {
    render(<Harness />);

    expect(screen.getByText("memory-closed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "open memory" }));
    expect(screen.getByText("memory-open")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "close memory" }));
    expect(screen.getByText("memory-closed")).toBeInTheDocument();
  });

  it("opens and closes session summary", async () => {
    render(<Harness />);

    expect(screen.getByText("summary-closed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "open summary" }));
    expect(screen.getByText("summary-open")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "close summary" }));
    expect(screen.getByText("summary-closed")).toBeInTheDocument();
  });
});
