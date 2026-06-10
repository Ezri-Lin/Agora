import { useCallback, useState } from "react";
import { getBridge, type ScannedDoc } from "../AgoraBridge.js";

export interface DocumentState {
  activeDoc: ScannedDoc | null;
  content: string;
  isLoading: boolean;
  openDocument: (workspacePath: string, doc: ScannedDoc) => Promise<void>;
  clearDocument: () => void;
}

export function useDocumentState(): DocumentState {
  const [activeDoc, setActiveDoc] = useState<ScannedDoc | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const openDocument = useCallback(async (workspacePath: string, doc: ScannedDoc) => {
    const bridge = getBridge();
    setActiveDoc(doc);
    setIsLoading(true);
    try {
      const nextContent = await bridge?.workspace.readDoc(workspacePath, doc.path);
      setContent(nextContent ?? "");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearDocument = useCallback(() => {
    setActiveDoc(null);
    setContent("");
    setIsLoading(false);
  }, []);

  return {
    activeDoc,
    content,
    isLoading,
    openDocument,
    clearDocument,
  };
}
