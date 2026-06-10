import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDocumentState } from "./useDocumentState.js";

const doc = { path: "notes/brief.md", name: "brief.md", ext: ".md" };

describe("useDocumentState", () => {
  it("opens a workspace document and loads its content", async () => {
    window.agora = {
      workspace: {
        readDoc: vi.fn().mockResolvedValue("# Brief\n\nLoaded content."),
      },
    } as unknown as typeof window.agora;

    const { result } = renderHook(() => useDocumentState());

    await act(async () => {
      await result.current.openDocument("/workspace", doc);
    });

    await waitFor(() => expect(result.current.activeDoc).toEqual(doc));
    expect(result.current.content).toBe("# Brief\n\nLoaded content.");
    expect(result.current.isLoading).toBe(false);
  });

  it("uses an empty draft when the bridge cannot read the document", async () => {
    window.agora = {
      workspace: {
        readDoc: vi.fn().mockResolvedValue(null),
      },
    } as unknown as typeof window.agora;

    const { result } = renderHook(() => useDocumentState());

    await act(async () => {
      await result.current.openDocument("/workspace", doc);
    });

    expect(result.current.activeDoc).toEqual(doc);
    expect(result.current.content).toBe("");
  });
});
