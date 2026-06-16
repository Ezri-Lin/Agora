import React from "react";

interface TopBarProps {
  workspaceName: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  workspaceName,
  sidebarCollapsed,
  onToggleSidebar,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  breadcrumb,
  actions,
}) => (
  <header className="main-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "40px", padding: "0 16px", paddingLeft: sidebarCollapsed ? "80px" : "16px", flexShrink: 0, WebkitAppRegion: "drag" } as any}>
    <div className="main-topbar-left" style={{ display: "flex", alignItems: "center", gap: "8px", WebkitAppRegion: "no-drag" } as any}>
      {sidebarCollapsed && (
        <>
          <label className="tool" title="Toggle Sidebar" onClick={onToggleSidebar} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </label>
          <label className="tool" title="Back" onClick={onGoBack} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoBack ? "pointer" : "default", color: canGoBack ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", opacity: canGoBack ? 1 : 0.4 }}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </label>
          <label className="tool" title="Forward" onClick={onGoForward} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoForward ? "pointer" : "default", color: canGoForward ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", opacity: canGoForward ? 1 : 0.4 }}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </label>
        </>
      )}
      <div className="breadcrumb" style={{ display: "flex", alignItems: "center", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginLeft: "4px" }}>
        <span style={{ opacity: 0.8 }}>{workspaceName}</span>
        {breadcrumb}
      </div>
    </div>
    {actions && (
      <div className="main-topbar-right" style={{ display: "flex", alignItems: "center", gap: "4px", WebkitAppRegion: "no-drag" } as any}>
        {actions}
      </div>
    )}
  </header>
);
