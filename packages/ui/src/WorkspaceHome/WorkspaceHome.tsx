import React from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { radius, shadow, spacing, typography } from "../theme/tokens.js";
import { useNarrowViewport } from "../hooks/useNarrowViewport.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceHomeProps {
  graph: React.ReactNode;
  rooms: RoomEntry[];
  docs: ScannedDoc[];
  onSelectRoom: (roomId: string) => void;
  onOpenDocument: (doc: ScannedDoc) => void;
  onNewRoom?: () => void;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({
  graph,
  rooms,
  docs,
  onSelectRoom,
  onOpenDocument,
  onNewRoom,
}) => {
  const { colors } = useTheme();
  const isNarrow = useNarrowViewport();
  const styles = createStyles(colors, isNarrow);

  return (
    <main style={styles.root}>
      <aside style={styles.rail} aria-label="Workspace history">
        <div style={styles.railHeader}>
          <span style={styles.sectionLabel}>Rooms</span>
          {onNewRoom && (
            <button type="button" style={styles.smallButton} onClick={onNewRoom}>
              New
            </button>
          )}
        </div>
        <div style={styles.list}>
          {rooms.length === 0 && <div style={styles.empty}>No rooms yet</div>}
          {rooms.map((room) => (
            <button
              type="button"
              key={room.id}
              style={styles.rowButton}
              onClick={() => onSelectRoom(room.id)}
            >
              <span style={styles.rowTitle}>{room.title}</span>
              <span style={styles.rowMeta}>{formatDate(room.createdAt)}</span>
            </button>
          ))}
        </div>
        <div style={styles.railHeader}>
          <span style={styles.sectionLabel}>Documents</span>
        </div>
        <div style={styles.list}>
          {docs.length === 0 && <div style={styles.empty}>No documents found</div>}
          {docs.slice(0, 8).map((doc) => (
            <button
              type="button"
              key={doc.path}
              style={styles.rowButton}
              onClick={() => onOpenDocument(doc)}
            >
              <span style={styles.docExt}>{doc.ext.replace(".", "") || "doc"}</span>
              <span style={styles.rowTitle}>{doc.name}</span>
            </button>
          ))}
        </div>
      </aside>
      <section style={styles.graphSurface} role="region" aria-label="Workspace Graph">
        <div style={styles.graphHeader}>
          <div>
            <div style={styles.surfaceTitle}>Workspace Graph</div>
            <div style={styles.surfaceSubtitle}>
              Documents, rooms, roles, outputs, and memory will gather here as the workspace grows.
            </div>
          </div>
        </div>
        <div style={styles.graphCanvas}>{graph}</div>
      </section>
    </main>
  );
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const createStyles = (colors: ColorPalette, isNarrow: boolean): Record<string, React.CSSProperties> => ({
  root: {
    display: "grid",
    gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(220px, 280px) minmax(0, 1fr)",
    gridTemplateRows: isNarrow ? "minmax(420px, 1fr) auto" : undefined,
    minHeight: 0,
    height: "100%",
    background: colors.bg,
  },
  rail: {
    minWidth: 0,
    borderRight: `1px solid ${colors.border}`,
    borderTop: isNarrow ? `1px solid ${colors.border}` : undefined,
    background: colors.surface,
    padding: spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
    overflow: "auto",
    gridRow: isNarrow ? 2 : undefined,
  },
  railHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.sectionTitle.size,
    fontWeight: typography.sectionTitle.weight,
    letterSpacing: typography.sectionTitle.tracking,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.meta.size,
    padding: `${spacing.sm}px 0`,
  },
  rowButton: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    minHeight: 36,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    border: `1px solid transparent`,
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
    textAlign: "left",
  },
  rowTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: typography.chatBody.size,
    fontWeight: 600,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: typography.meta.size,
  },
  docExt: {
    minWidth: 28,
    borderRadius: radius.xs,
    border: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontSize: typography.meta.size,
    textAlign: "center",
    padding: `1px ${spacing.xs}px`,
  },
  graphSurface: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0,
    padding: isNarrow ? spacing.lg : spacing.xl,
    gap: spacing.md,
    background: colors.bg,
    gridRow: isNarrow ? 1 : undefined,
  },
  graphHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  surfaceTitle: {
    color: colors.text,
    fontSize: typography.heroTitle.size,
    fontWeight: typography.heroTitle.weight,
    lineHeight: typography.heroTitle.lineHeight,
  },
  surfaceSubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.chatBody.size,
    lineHeight: typography.chatBody.lineHeight,
  },
  graphCanvas: {
    flex: 1,
    minHeight: 0,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    background: colors.surface,
    boxShadow: shadow.card,
    overflow: "hidden",
  },
  smallButton: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.xs,
    background: colors.bg,
    color: colors.text,
    fontSize: typography.meta.size,
    padding: `${spacing.xxs}px ${spacing.sm}px`,
    cursor: "pointer",
  },
});
