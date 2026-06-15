/**
 * Agora Design Tokens
 *
 * Extracted from agora_token_preview_fixed.html and agora_locked_ui_reference.html.
 * Single source of truth for all visual constants.
 *
 * Color naming follows the Agora CSS variable convention (--ag-*).
 * Light/Dark palettes are defined here; ColorPalette is derived via createAgoraPalette().
 */

// ─── Layout ───────────────────────────────────────────────────────────

export const layout = {
  titleBar: 44,
  leftRail: 260,
  leftRailMin: 240,
  leftRailMax: 280,
  miniGraph: 260,
  inspector: 320,
  documentSidecar: 420,
  composerMin: 52,
  maxChatWidth: 860,
  maxDocWidth: 760,
  maxThreadWidth: 860,
} as const;

// ─── Typography ───────────────────────────────────────────────────────

export const fontFamilies = {
  ui: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif",
  doc: "Inter, 'PingFang SC', 'Noto Serif SC', system-ui, sans-serif",
  mono: "'SF Mono', Menlo, monospace",
} as const;

export const typography = {
  chatBody:    { size: 13, lineHeight: 1.75, weight: 400 },
  meta:        { size: 11, lineHeight: 1.4, weight: 400 },
  badge:       { size: 10, lineHeight: 1.3, weight: 800, tracking: 0.14 },
  documentBody:{ size: 14, lineHeight: 1.85, weight: 400 },
  heading:     { size: 15, lineHeight: 1.4, weight: 600 },
  heroTitle:   { size: 24, lineHeight: 1.2, weight: 700 },
  roomTitle:   { size: 13, lineHeight: 1.4, weight: 700 },
  sectionTitle:{ size: 10, lineHeight: 1.3, weight: 800, tracking: 0.14 },
  docHeading:  { size: 28, lineHeight: 1.3, weight: 700 },
  console:     { size: 11, lineHeight: 1.7, weight: 400 },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  xxxl: 34,
} as const;

// ─── Radius ───────────────────────────────────────────────────────────

export const radius = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   18,
  xl:   24,
  pill: 999,
  // Legacy aliases — existing components use these; new components should use spec values.
  legacyXs: 4,
  legacySm: 6,
  legacyMd: 8,
  legacyLg: 12,
  legacyXl: 14,
} as const;

// ─── Shadow ───────────────────────────────────────────────────────────

export const shadow = {
  none:     "none",
  soft:     "0 8px 24px rgba(0,0,0,.06)",
  floating: "0 22px 70px rgba(0,0,0,.13)",
  popover:  "0 16px 48px rgba(0,0,0,.12)",
  card:     "0 4px 16px rgba(0,0,0,.035)",
  deep:     "0 30px 90px rgba(0,0,0,.25)",
} as const;

export const shadowDark = {
  none:     "none",
  soft:     "0 8px 28px rgba(0,0,0,.28)",
  floating: "0 24px 80px rgba(0,0,0,.42)",
  popover:  "0 16px 52px rgba(0,0,0,.38)",
  card:     "0 4px 16px rgba(0,0,0,.12)",
  deep:     "0 30px 90px rgba(0,0,0,.45)",
} as const;

// ─── Blur ─────────────────────────────────────────────────────────────

export const blur = {
  frosted: "blur(18px)",
  strong:  "blur(24px)",
} as const;

export const blurDark = {
  frosted: "blur(20px)",
  strong:  "blur(28px)",
} as const;

// ─── Motion ───────────────────────────────────────────────────────────

export const motion = {
  fast:    "120ms ease",
  normal:  "200ms ease",
  slow:    "300ms ease",
  slower:  "500ms ease",
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────

export const zIndex = {
  base:      0,
  rail:      10,
  chat:      20,
  header:    30,
  inspector: 40,
  floating:  50,
  titleBar:  60,
  overlay:   70,
  modal:     80,
  console:   90,
  toast:     100,
} as const;

// ─── Opacity ──────────────────────────────────────────────────────────

export const opacity = {
  disabled: 0.45,
  muted:    0.65,
  hover:    0.06,
  border:   0.38,
  edgeDefault: 0.38,
  edgeMajor:   0.64,
  edgeRole:    0.46,
  gridDot:     0.45,
  frosted:     0.86,
} as const;

// ─── Graph tokens ─────────────────────────────────────────────────────

export const graph = {
  gridDotSize: 1,
  gridDotSpacing: 22,
  edgeWidth: 0.4,
  edgeWidthMajor: 0.6,
  edgeWidthRole: 0.5,
  edgeWidthSemantic: 0.7,
  // Obsidian-style: sqrt(degree+1) * 3, clamped 8–30
  nodeCoreRadius: 8,
  nodeRoomRadius: 6,
  nodeDocRadius: 5,
  nodeClaimRadius: 4,
  nodeRoleRadius: 5,
  nodeMicroRadius: 3,
  // Obsidian dark-mode palette — muted grays, not bright colors
  nodeFill:          "#999999",
  nodeStroke:        "#3f3f3f",
  nodeMutedFill:     "#666666",
  nodeMutedStroke:   "#3f3f3f",
  edgeSupport:       "#4a8c5c",
  edgeChallenge:     "#a04040",
  nodeSelectedRing:  "#a882ff",
  nodeThinkingRing:  "#a882ff",
  // Obsidian-style node colors — muted, not saturated
  nodeGreen:         "#4a8c5c",
  nodeYellow:        "#b8a642",
  nodeGray:          "#999999",
  nodeMuted:         "#666666",
  // Obsidian graph tags/attachments
  nodeTag:           "#44cf6e",
  nodeAttachment:    "#e0de71",
} as const;

// ─── Console tokens (always dark, independent of theme) ───────────────

export const consoleTokens = {
  bgLight:    "#111111",
  textLight:  "#f4f4f1",
  mutedLight: "#d2d2cc",
  bgDark:     "#050506",
  textDark:   "#f4f4f1",
  mutedDark:  "#9a9a94",
} as const;

// ─── Agora Color Palette ──────────────────────────────────────────────

export interface AgoraColorPalette {
  // Backgrounds
  bgApp: string;
  bgCanvas: string;
  bgPanel: string;
  bgSubtle: string;
  bgHover: string;
  bgSelected: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;

  // Accent
  accentPrimary: string;
  accentSupport: string;
  accentChallenge: string;
  accentInfo: string;
  accentWarning: string;
  accentViolet: string;

  // Surfaces
  surfacePlain: string;
  surfaceElevated: string;
  surfaceFrosted: string;
  surfaceFrostedStrong: string;

  // Graph
  graphGridDot: string;
  graphEdgeDefault: string;
  graphEdgeMajor: string;
  graphEdgeRole: string;

  // Semantic (derived)
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  overlay: string;
}

export const agoraLightColors: AgoraColorPalette = {
  // Backgrounds
  bgApp:       "#f7f7f5",
  bgCanvas:    "#f3f3ef",
  bgPanel:     "#ffffff",
  bgSubtle:    "#f1f1ef",
  bgHover:     "#edede8",
  bgSelected:  "#111111",

  // Text
  textPrimary:   "#171717",
  textSecondary: "#62625c",
  textMuted:     "#999891",
  textDisabled:  "#b8b7b0",
  textInverse:   "#ffffff",

  // Borders
  borderSubtle:  "#e8e8e3",
  borderDefault: "#deded8",
  borderStrong:  "#c9c9c1",

  // Accent
  accentPrimary:    "#111111",
  accentSupport:    "#2f8f5b",
  accentChallenge:  "#c2413d",
  accentInfo:       "#2f80ed",
  accentWarning:    "#b7791f",
  accentViolet:     "#6b5cff",

  // Surfaces
  surfacePlain:         "#ffffff",
  surfaceElevated:      "#ffffff",
  surfaceFrosted:       "rgba(255,255,255,.86)",
  surfaceFrostedStrong: "rgba(255,255,255,.94)",

  // Graph
  graphGridDot:     "#d8d8d2",
  graphEdgeDefault: "#bdbdb6",
  graphEdgeMajor:   "#4f4f49",
  graphEdgeRole:    "#777771",

  // Semantic
  danger:        "#c2413d",
  dangerBg:      "rgba(194,65,61,.08)",
  dangerBorder:  "rgba(194,65,61,.2)",
  success:       "#2f8f5b",
  successBg:     "rgba(47,143,91,.08)",
  successBorder: "rgba(47,143,91,.2)",
  warning:       "#e65100",
  overlay:       "rgba(0,0,0,.3)",
};

export const agoraDarkColors: AgoraColorPalette = {
  // Backgrounds
  bgApp:       "#0d0d0f",
  bgCanvas:    "#111114",
  bgPanel:     "#151518",
  bgSubtle:    "#1f1f23",
  bgHover:     "#26262a",
  bgSelected:  "#ffffff",

  // Text
  textPrimary:   "#f4f4f1",
  textSecondary: "#b7b7b0",
  textMuted:     "#77776f",
  textDisabled:  "#55555a",
  textInverse:   "#111111",

  // Borders
  borderSubtle:  "#26262a",
  borderDefault: "#34343a",
  borderStrong:  "#4a4a52",

  // Accent
  accentPrimary:    "#ffffff",
  accentSupport:    "#5dca8b",
  accentChallenge:  "#ef6a63",
  accentInfo:       "#6aa9ff",
  accentWarning:    "#d6a84f",
  accentViolet:     "#8d7dff",

  // Surfaces
  surfacePlain:         "#151518",
  surfaceElevated:      "#1b1b1f",
  surfaceFrosted:       "rgba(21,21,24,.86)",
  surfaceFrostedStrong: "rgba(21,21,24,.94)",

  // Graph
  graphGridDot:     "#2a2a2f",
  graphEdgeDefault: "#4a4a52",
  graphEdgeMajor:   "#b7b7b0",
  graphEdgeRole:    "#77776f",

  // Semantic
  danger:        "#ef6a63",
  dangerBg:      "rgba(239,106,99,.1)",
  dangerBorder:  "rgba(239,106,99,.25)",
  success:       "#5dca8b",
  successBg:     "rgba(93,202,139,.1)",
  successBorder: "rgba(93,202,139,.25)",
  warning:       "#ff9800",
  overlay:       "rgba(0,0,0,.42)",
};

// ─── Brand glow / dark glow ────────────────────────────────────────────

export const brandGlow = "0 0 18px rgba(255,255,255,.22), 0 0 42px rgba(255,255,255,.12)";
export const brandGlowDark = "0 0 18px rgba(255,255,255,.18), 0 0 48px rgba(255,255,255,.10)";
export const darkGlow = "0 0 18px rgba(0,0,0,.12)";
export const darkGlowDark = "0 0 24px rgba(255,255,255,.08)";

// ─── Role color pools (preserved from palettes.ts) ────────────────────

const DOMAIN_COLOR_POOL: Record<string, string[]> = {
  core:                ["#7c4dff", "#ff5252", "#ffa726", "#26c6da", "#ec407a", "#66bb6a", "#ab47bc", "#78909c"],
  engineering:         ["#ab47bc", "#42a5f5", "#26c6da", "#66bb6a", "#ff7043", "#7e57c2", "#78909c", "#8d6e63"],
  design:              ["#ec407a", "#26c6da", "#ab47bc", "#ffa726", "#7c4dff", "#ff7043", "#66bb6a", "#78909c"],
  product_strategy:    ["#66bb6a", "#ff7043", "#42a5f5", "#7e57c2", "#ffca28", "#ffa726", "#26c6da", "#ab47bc"],
  marketing:           ["#ffca28", "#ff7043", "#66bb6a", "#42a5f5", "#ec407a", "#ffa726", "#ab47bc", "#78909c"],
  legal_compliance:    ["#78909c", "#42a5f5", "#ff5252", "#ffa726", "#66bb6a", "#7e57c2", "#26c6da", "#ab47bc"],
  security:            ["#ef5350", "#ff5252", "#ffa726", "#42a5f5", "#78909c", "#ab47bc", "#26c6da", "#66bb6a"],
  research_writing:    ["#8d6e63", "#42a5f5", "#66bb6a", "#7e57c2", "#ec407a", "#ffa726", "#26c6da", "#ab47bc"],
};

const DEFAULT_POOL = ["#42a5f5", "#ab47bc", "#26c6da", "#ff7043", "#66bb6a", "#ec407a", "#ffa726", "#78909c"];

export const USER_COLOR = "#4fc3f7";

const ROLE_DOMAIN_MAP: Record<string, string> = {
  moderator: "core",
  skeptic_critic: "core",
  historian: "core",
  ethics_lens: "core",
  systems_architect: "engineering",
  ux_research_lens: "design",
  psychology_lens: "design",
  product_strategist: "product_strategy",
  jobs_product_taste_lens: "product_strategy",
  buffett_business_lens: "product_strategy",
  munger_mental_models_lens: "product_strategy",
  growth_marketer_lens: "product_strategy",
  economics_lens: "product_strategy",
  legal_lens: "legal_compliance",
  security_lens: "security",
  narrative_lens: "research_writing",
  science_lens: "research_writing",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

export function getRoleColor(roleId: string): string {
  const pool = DOMAIN_COLOR_POOL[ROLE_DOMAIN_MAP[roleId]] ?? DEFAULT_POOL;
  return pool[(hashString(roleId) >>> 0) % pool.length];
}

// ─── Backward-compatible ColorPalette bridge ──────────────────────────
// This preserves the existing ColorPalette interface so all components
// using `createStyles(colors)` continue to work without changes.

export interface ColorPalette {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  overlay: string;
}

/** Derive a ColorPalette from an AgoraColorPalette for backward compatibility. */
export function createAgoraPalette(agora: AgoraColorPalette): ColorPalette {
  return {
    bg:           agora.bgApp,
    surface:      agora.surfacePlain,
    surfaceHover: agora.bgSubtle,
    border:       agora.borderDefault,
    text:         agora.textPrimary,
    textMuted:    agora.textMuted,
    accent:       agora.accentInfo,
    accentDim:    agora.accentPrimary,
    danger:       agora.danger,
    dangerBg:     agora.dangerBg,
    dangerBorder: agora.dangerBorder,
    success:      agora.success,
    successBg:    agora.successBg,
    successBorder:agora.successBorder,
    warning:      agora.warning,
    overlay:      agora.overlay,
  };
}

/** Light theme ColorPalette (backward-compatible). */
export const darkColors: ColorPalette = createAgoraPalette(agoraDarkColors);

/** Light theme ColorPalette (backward-compatible). */
export const lightColors: ColorPalette = createAgoraPalette(agoraLightColors);

// Re-export sizes for backward compatibility with existing imports
export const sizes = {
  titleBar: layout.titleBar,
  contextGraph: "22%",
  councilRoom: "58%",
  inspector: "20%",
  composerMin: layout.composerMin,
} as const;
