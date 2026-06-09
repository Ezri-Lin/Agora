import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState.js";
import { I18nProvider } from "./i18n/I18nContext.js";
import { ThemeProvider } from "./theme/ThemeContext.js";

function renderWithProviders(ui: React.ReactElement, theme: "light" | "dark" = "light") {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", theme);
  return render(
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>,
  );
}

describe("EmptyState", () => {
  it("renders an accessible Agora logo card", () => {
    renderWithProviders(<EmptyState onOpen={() => {}} />);
    expect(screen.getByLabelText("Agora logo")).toBeInTheDocument();
  });

  it("keeps the dark theme logo foreground readable", () => {
    renderWithProviders(<EmptyState onOpen={() => {}} />, "dark");
    expect(screen.getByLabelText("Agora logo")).toHaveStyle({
      color: "rgb(13, 13, 15)",
    });
  });

  it("opens recent workspaces", async () => {
    const onOpenRecent = vi.fn();
    window.agora = {
      workspace: {
        getRecent: vi.fn().mockResolvedValue([{ path: "/tmp/agora", name: "Agora Workspace" }]),
      },
    } as unknown as typeof window.agora;

    renderWithProviders(<EmptyState onOpen={() => {}} onOpenRecent={onOpenRecent} />);

    await waitFor(() => expect(screen.getByText("Agora Workspace")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Agora Workspace/ }));
    expect(onOpenRecent).toHaveBeenCalledWith("/tmp/agora");
  });
});
