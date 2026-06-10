import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentSurface } from "./DocumentSurface.js";
import { I18nProvider } from "../i18n/I18nContext.js";
import { ThemeProvider } from "../theme/ThemeContext.js";

const docs = [
  { path: "notes/brief.md", name: "brief.md", ext: ".md" },
  { path: "notes/research.md", name: "research.md", ext: ".md" },
];

function renderDocumentSurface(overrides: Partial<React.ComponentProps<typeof DocumentSurface>> = {}) {
  localStorage.setItem("agora-locale", "en");
  localStorage.setItem("agora-theme", "light");
  const props: React.ComponentProps<typeof DocumentSurface> = {
    docs,
    activeDoc: docs[0],
    content: "# Brief\n\nA readable document body.",
    isLoading: false,
    onOpenDocument: vi.fn(),
    onAddReference: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <I18nProvider>
        <DocumentSurface {...props} />
      </I18nProvider>
    </ThemeProvider>,
  );
  return props;
}

describe("DocumentSurface", () => {
  it("collapses to a single column on narrow screens", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    renderDocumentSurface();

    const root = screen.getByRole("region", { name: "Document Surface" });
    expect(root).toHaveStyle({ gridTemplateColumns: "minmax(0, 1fr)" });
  });

  it("renders a Notion-like document surface with preview and edit modes", async () => {
    renderDocumentSurface();

    expect(screen.getByRole("region", { name: "Document Surface" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Brief")).toBeInTheDocument();
    expect(screen.getByText("A readable document body.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox", { name: "Document editor" })).toHaveValue("# Brief\n\nA readable document body.");
  });

  it("opens documents and can reference the active document in chat", async () => {
    const onOpenDocument = vi.fn();
    const onAddReference = vi.fn();
    renderDocumentSurface({ onOpenDocument, onAddReference });

    await userEvent.click(screen.getByRole("button", { name: /research.md/ }));
    expect(onOpenDocument).toHaveBeenCalledWith(docs[1]);

    await userEvent.click(screen.getByRole("button", { name: "Reference in Chat" }));
    expect(onAddReference).toHaveBeenCalledWith(docs[0]);
  });
});
