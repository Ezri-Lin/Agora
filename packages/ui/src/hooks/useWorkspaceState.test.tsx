import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceState } from "./useWorkspaceState.js";

describe("useWorkspaceState", () => {
  it("does not enter a recent workspace when document scanning fails", async () => {
    const onWorkspaceLoaded = vi.fn();
    window.agora = {
      getLLMConfig: vi.fn(),
      workspace: {
        getRecent: vi.fn().mockResolvedValue([
          { path: "/vault/Golden House", name: "Golden House", lastOpened: "2026-06-25T00:00:00.000Z" },
        ]),
        init: vi.fn().mockResolvedValue({ path: "/vault/Golden House", name: "Golden House" }),
        listDocs: vi.fn().mockRejectedValue(new Error("EPERM")),
        onDocsChanged: vi.fn(() => () => {}),
      },
    } as unknown as typeof window.agora;

    const { result } = renderHook(() => useWorkspaceState(onWorkspaceLoaded));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workspace).toBeNull();
    expect(result.current.availableDocs).toEqual([]);
    expect(onWorkspaceLoaded).not.toHaveBeenCalled();
  });
});
