import React from "react";
import { TitleBar } from "./TitleBar.js";
import { colors, sizes } from "../theme/tokens.js";

interface AppShellProps {
  workspaceName: string;
  onOpenWorkspace: () => void;
  contextGraph: React.ReactNode;
  main: React.ReactNode;
  inspector: React.ReactNode;
  composer: React.ReactNode;
  onAddRef?: () => void;
  onOpenSettings?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  workspaceName,
  onOpenWorkspace,
  contextGraph,
  main,
  inspector,
  composer,
  onAddRef,
  onOpenSettings,
}) => {
  return (
    <div style={styles.root}>
      <TitleBar workspaceName={workspaceName} onOpenWorkspace={onOpenWorkspace} onOpenSettings={onOpenSettings} />
      <div style={styles.body}>
        <div style={styles.left}>{contextGraph}</div>
        <div style={styles.center}>
          <div style={styles.chat}>
            <div style={styles.chatHeader}>
              <span style={styles.chatTitle}>Council Room</span>
              {onAddRef && (
                <button style={styles.addRefBtn} onClick={onAddRef}>
                  + Add Reference
                </button>
              )}
            </div>
            {main}
          </div>
          {composer}
        </div>
        <div style={styles.right}>{inspector}</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  left: {
    width: sizes.contextGraph,
    flexShrink: 0,
    overflow: "hidden",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chat: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
  chatTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addRefBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: "2px 8px",
    color: colors.accent,
    fontSize: 11,
    cursor: "pointer",
  },
  right: {
    width: sizes.inspector,
    flexShrink: 0,
    overflow: "hidden",
  },
};
