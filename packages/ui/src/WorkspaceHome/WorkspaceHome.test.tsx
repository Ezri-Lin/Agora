import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceHome } from "./WorkspaceHome.js";
import { I18nProvider } from "../i18n/I18nContext.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

const docs = [
  { path: "notes/brief.md", name: "brief.md", ext: ".md" },
  { path: "notes/research.md", name: "research.md", ext: ".md" },
];

const rooms = [
  { id: "room-1", title: "Strategy Council", createdAt: "2026-06-10T00:00:00.000Z" },
];

function renderHome(overrides: Partial<React.ComponentProps<typeof WorkspaceHome>> = {}) {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", "light");
  const props: React.ComponentProps<typeof WorkspaceHome> = {
    graph: <div>Graph Canvas</div>,
    rooms,
    docs,
    onSelectRoom: vi.fn(),
    onOpenDocument: vi.fn(),
    onNewRoom: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <I18nProvider>
        <WorkspaceHome {...props} />
      </I18nProvider>
    </ThemeProvider>,
  );
  return props;
}

describe("WorkspaceHome", () => {
  it("collapses to a single column on narrow screens", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    renderHome();

    const root = screen.getByRole("region", { name: "Workspace Graph" }).closest("main");
    expect(root).toHaveStyle({ gridTemplateColumns: "minmax(0, 1fr)" });
  });

  it("uses the graph as the primary workspace surface", () => {
    renderHome();

    expect(screen.getByRole("region", { name: "Workspace Graph" })).toBeInTheDocument();
    expect(screen.getByText("Graph Canvas")).toBeInTheDocument();
    expect(screen.getByText("Strategy Council")).toBeInTheDocument();
    expect(screen.getByText("brief.md")).toBeInTheDocument();
  });

  it("opens rooms and documents from the home surface", async () => {
    const onSelectRoom = vi.fn();
    const onOpenDocument = vi.fn();
    renderHome({ onSelectRoom, onOpenDocument });

    await userEvent.click(screen.getByRole("button", { name: /Strategy Council/ }));
    expect(onSelectRoom).toHaveBeenCalledWith("room-1");

    await userEvent.click(screen.getByRole("button", { name: /brief.md/ }));
    expect(onOpenDocument).toHaveBeenCalledWith(docs[0]);
  });
});
