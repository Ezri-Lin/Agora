import React, { useEffect, useRef } from "react";
import type { ColorPalette } from "../theme/palettes.js";

export interface MentionItem {
  id: string;
  type: "document" | "role";
  title: string;
  subtitle?: string;
}

interface MentionPickerProps {
  visible: boolean;
  position: { top: number; left: number };
  query: string;
  items: MentionItem[];
  selectedIndex: number;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  colors: ColorPalette;
}

export const MentionPicker: React.FC<MentionPickerProps> = ({
  visible,
  position,
  query,
  items,
  selectedIndex,
  onSelect,
  colors,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: position.top - 10,
        left: position.left,
        transform: "translateY(-100%)",
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        width: 320,
        maxHeight: 240,
        overflowY: "auto",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        padding: 4,
      }}
      ref={listRef}
    >
      {items.length === 0 && (
        <div style={{ padding: "8px 12px", fontSize: 12, color: colors.textMuted }}>
          No results found for "{query}"
        </div>
      )}
      {items.map((item, index) => (
        <button
          key={`${item.type}-${item.id}`}
          onClick={() => onSelect(item)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 12px",
            background: index === selectedIndex ? `${colors.accent}15` : "transparent",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            textAlign: "left",
            color: colors.text,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${colors.accent}08`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = index === selectedIndex ? `${colors.accent}15` : "transparent";
          }}
        >
          <span style={{ 
            fontSize: 10, 
            padding: "2px 6px", 
            borderRadius: 4, 
            background: item.type === "role" ? `${colors.accent}20` : colors.border,
            color: item.type === "role" ? colors.accent : colors.textMuted 
          }}>
            {item.type === "role" ? "+" : "#"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.title}
            </span>
            {item.subtitle && (
              <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.subtitle}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
