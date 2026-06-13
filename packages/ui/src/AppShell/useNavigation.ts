import { useState, useCallback, useRef, useEffect } from "react";
import type { AppView } from "./AppShell.types.js";

export function useNavigation(view: AppView, onViewChange?: (view: AppView) => void) {
  const [history, setHistory] = useState<AppView[]>(["room"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const isInternalNavRef = useRef(false);
  const prevViewRef = useRef(view);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = useCallback((target: AppView) => {
    if (target === view) return;
    isInternalNavRef.current = true;
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const next = [...truncated, target];
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(next.length - 1);
      return next;
    });
    onViewChange?.(target);
  }, [view, onViewChange]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    isInternalNavRef.current = true;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    onViewChange?.(history[newIndex]);
  }, [canGoBack, historyIndex, history, onViewChange]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    isInternalNavRef.current = true;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    onViewChange?.(history[newIndex]);
  }, [canGoForward, historyIndex, history, onViewChange]);

  // Track external view changes in history
  useEffect(() => {
    if (view === prevViewRef.current) return;
    prevViewRef.current = view;
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      return;
    }
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const next = [...truncated, view];
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [view]);

  return { canGoBack, canGoForward, goBack, goForward, navigateTo };
}
