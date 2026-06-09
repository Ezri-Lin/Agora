import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TerminalPanel } from "./TerminalPanel.js";
import { I18nProvider } from "../i18n/I18nContext.js";
import { ThemeProvider } from "../theme/ThemeContext.js";
import { zIndex } from "../theme/tokens.js";

function renderWithProviders(ui: React.ReactElement) {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", "dark");
  return render(
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>,
  );
}

describe("TerminalPanel", () => {
  it("renders as a bottom overlay activity console", () => {
    renderWithProviders(<TerminalPanel visible workspacePath="/tmp/workspace" onClose={() => {}} />);

    const panel = screen.getByRole("region", { name: "Activity Console" });
    expect(panel).toHaveStyle({
      position: "fixed",
      left: "0px",
      right: "0px",
      bottom: "0px",
      zIndex: String(zIndex.console),
    });
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    renderWithProviders(<TerminalPanel visible workspacePath="/tmp/workspace" onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Close terminal" }));
    expect(onClose).toHaveBeenCalled();
  });
});
