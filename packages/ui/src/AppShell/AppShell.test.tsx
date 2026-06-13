import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell.js";
import { I18nProvider } from "../i18n/I18nContext.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

function renderShell(view: "home" | "room", onViewChange = vi.fn()) {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", "light");
  render(
    <ThemeProvider>
      <I18nProvider>
        <AppShell
          view={view}
          onViewChange={onViewChange}
          workspaceName="Agora Workspace"
          onOpenWorkspace={() => {}}
          home={<div>Workspace Graph Fullscreen</div>}
          contextGraph={<div>Room Mini Graph</div>}
          main={<div>Council Chat Surface</div>}
          sidecar={<div>Sidecar Surface</div>}
          composer={<div>Composer Surface</div>}
          onToggleTerminal={() => {}}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe("AppShell mode-driven layout", () => {
  it("renders Home as the primary graph surface without chat chrome", () => {
    renderShell("home");

    expect(screen.getByText("Workspace Graph Fullscreen")).toBeInTheDocument();
    expect(screen.queryByText("Council Chat Surface")).not.toBeInTheDocument();
    expect(screen.queryByText("Composer Surface")).not.toBeInTheDocument();
  });

  it("renders Room with the room mini graph, chat, composer, and sidecar", () => {
    renderShell("room");

    expect(screen.getByText("Room Mini Graph")).toBeInTheDocument();
    expect(screen.getByText("Council Chat Surface")).toBeInTheDocument();
    expect(screen.getByText("Composer Surface")).toBeInTheDocument();
    expect(screen.getByText("Sidecar Surface")).toBeInTheDocument();
  });

  it("uses product navigation to request surface changes", async () => {
    const onViewChange = vi.fn();
    renderShell("home", onViewChange);

    await userEvent.click(screen.getByRole("button", { name: "Room" }));
    expect(onViewChange).toHaveBeenCalledWith("room");
  });
});
