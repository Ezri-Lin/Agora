import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceGraph } from "./WorkspaceGraph.js";
import { I18nProvider } from "../i18n/I18nContext.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

describe("WorkspaceGraph", () => {
  it("renders workspace documents and rooms as graph nodes", () => {
    localStorage.setItem("agora-locale", "en");
    localStorage.setItem("agora-theme", "light");
    render(
      <ThemeProvider>
        <I18nProvider>
          <WorkspaceGraph
            docs={[{ path: "notes/brief.md", name: "brief.md", ext: ".md" }]}
            rooms={[{ id: "room-1", title: "Strategy Council", createdAt: "2026-06-10T00:00:00.000Z" }]}
          />
        </I18nProvider>
      </ThemeProvider>,
    );

    expect(screen.getByRole("img", { name: "Workspace Graph Canvas" })).toBeInTheDocument();
    expect(screen.getByText("brief.md")).toBeInTheDocument();
    expect(screen.getByText("Strategy Council")).toBeInTheDocument();
  });
});
