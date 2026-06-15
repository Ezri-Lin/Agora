import React from "react";
import type { CouncilStageView } from "../AppShell/AppShell.types.js";

interface StageViewToggleProps {
  active: CouncilStageView;
  onChange: (view: CouncilStageView) => void;
}

export const StageViewToggle: React.FC<StageViewToggleProps> = ({ active, onChange }) => (
  <div style={{
    width: 76,
    height: 28,
    border: "1px solid var(--line)",
    borderRadius: 999,
    background: "rgba(255,255,255,.78)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(0,0,0,.035)",
  }}>
    {/* Center divider */}
    <div style={{
      position: "absolute",
      left: "50%",
      top: 6,
      bottom: 6,
      width: 1,
      background: "repeating-linear-gradient(180deg, #bdbdb6 0 3px, transparent 3px 6px)",
      opacity: 0.7,
      zIndex: 2,
    }} />
    <button
      onClick={() => onChange("meeting")}
      title="会议态势图"
      style={{
        border: 0,
        background: active === "meeting" ? "rgba(17,17,17,.055)" : "transparent",
        display: "grid",
        placeItems: "center",
        color: active === "meeting" ? "#111" : "rgba(23,23,23,.30)",
        cursor: "pointer",
        position: "relative",
        zIndex: 3,
        borderRadius: "999px 0 0 999px",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" style={{ width: 15, height: 15 }}>
        <circle cx="12" cy="7" r="3" />
        <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
        <path d="M4 10h3M17 10h3" />
      </svg>
    </button>
    <button
      onClick={() => onChange("graph")}
      title="议题图谱"
      style={{
        border: 0,
        background: active === "graph" ? "rgba(17,17,17,.055)" : "transparent",
        display: "grid",
        placeItems: "center",
        color: active === "graph" ? "#111" : "rgba(23,23,23,.30)",
        cursor: "pointer",
        position: "relative",
        zIndex: 3,
        borderRadius: "0 999px 999px 0",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" style={{ width: 15, height: 15 }}>
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M8.3 11l6.4-3M8.3 13l6.4 3" />
      </svg>
    </button>
  </div>
);
