import { useState, useCallback, useEffect } from "react";
import type { SourceRefImportance } from "@agora/shared";
import { getBridge, type ScannedDoc, type RecentWorkspace } from "../AgoraBridge.js";
import type { ContextDebug } from "../RunInspector/RunInspector.js";

export interface WorkspaceRef {
  type: "file";
  path: string;
  label: string;
  importance: SourceRefImportance;
}

export interface WorkspaceState {
  workspace: { path: string; name: string } | null;
  recentWorkspaces: RecentWorkspace[];
  availableDocs: ScannedDoc[];
  selectedRefs: WorkspaceRef[];
  showRefPicker: boolean;
  contextDebug: ContextDebug | undefined;
  openWorkspace: () => Promise<void>;
  openRecent: (path: string) => Promise<void>;
  addRef: (doc: ScannedDoc) => void;
  removeRef: (path: string) => void;
  toggleRefPicker: () => void;
  closeRefPicker: () => void;
  clearContextDebug: () => void;
  isLoading: boolean;
}

export function useWorkspaceState(
  onWorkspaceLoaded?: (path: string) => void,
): WorkspaceState {
  const [workspace, setWorkspace] = useState<{ path: string; name: string } | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);
  const [availableDocs, setAvailableDocs] = useState<ScannedDoc[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<WorkspaceRef[]>([]);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [contextDebug, setContextDebug] = useState<ContextDebug | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Auto-load most recent workspace on mount
  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.getLLMConfig(); // still load config
    bridge.workspace.getRecent().then(async (recent) => {
      setRecentWorkspaces(recent);
      if (recent.length === 0) {
        console.log("[useWorkspaceState] No recent workspaces");
        setIsLoading(false);
        return;
      }
      const last = recent[0]!;
      console.log("[useWorkspaceState] Loading workspace:", last.path);
      try {
        const ws = await bridge.workspace.init(last.path);
        setWorkspace(ws);
        const docs = await bridge.workspace.listDocs(last.path);
        console.log("[useWorkspaceState] Found", docs.length, "docs:", docs.slice(0, 5).map(d => d.name));
        setAvailableDocs(docs);
        onWorkspaceLoaded?.(last.path);
      } catch (err) {
        console.error("[useWorkspaceState] Failed to load workspace:", err);
      } finally {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for file changes and refresh docs
  useEffect(() => {
    const bridge = getBridge();
    if (!bridge || !workspace) return;

    const unsubscribe = bridge.workspace.onDocsChanged(async (data) => {
      console.log("[useWorkspaceState] Docs changed, refreshing...");
      try {
        const docs = await bridge.workspace.listDocs(workspace.path);
        console.log("[useWorkspaceState] Refreshed docs:", docs.length);
        setAvailableDocs(docs);
      } catch (err) {
        console.error("[useWorkspaceState] Failed to refresh docs:", err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [workspace]);

  const openWorkspace = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) return;
    const path = await bridge.workspace.openDialog();
    if (!path) return;
    const ws = await bridge.workspace.init(path);
    setWorkspace(ws);
    const docs = await bridge.workspace.listDocs(path);
    setAvailableDocs(docs);
    setSelectedRefs([]);
    setContextDebug(undefined);
    onWorkspaceLoaded?.(path);
  }, [onWorkspaceLoaded]);

  const openRecent = useCallback(async (path: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const ws = await bridge.workspace.init(path);
      setWorkspace(ws);
      const docs = await bridge.workspace.listDocs(path);
      setAvailableDocs(docs);
      setSelectedRefs([]);
      setContextDebug(undefined);
      onWorkspaceLoaded?.(path);
    } catch {
      // Workspace may have been deleted
    }
  }, [onWorkspaceLoaded]);

  const addRef = useCallback((doc: ScannedDoc) => {
    setSelectedRefs((prev) => {
      if (prev.some((r) => r.path === doc.path)) return prev;
      return [...prev, { type: "file" as const, path: doc.path, label: doc.name, importance: "primary" as const }];
    });
    setShowRefPicker(false);
  }, []);

  const removeRef = useCallback((path: string) => {
    setSelectedRefs((prev) => prev.filter((r) => r.path !== path));
  }, []);

  const toggleRefPicker = useCallback(() => setShowRefPicker((v) => !v), []);
  const closeRefPicker = useCallback(() => setShowRefPicker(false), []);
  const clearContextDebug = useCallback(() => setContextDebug(undefined), []);

  return {
    workspace,
    recentWorkspaces,
    availableDocs,
    selectedRefs,
    showRefPicker,
    contextDebug,
    openWorkspace,
    openRecent,
    addRef,
    removeRef,
    toggleRefPicker,
    closeRefPicker,
    clearContextDebug,
    isLoading,
  };
}
