export interface ColorPalette {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  // Semantic tokens
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  overlay: string;
}

// Domain-based color pools — each domain gets 8 distinct, accessible colors.
// Any roleId maps deterministically to a color via hash(roleId) % pool.length.
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

/** Fixed color for user identity (not a role). */
export const USER_COLOR = "#4fc3f7";

// Well-known roleId → domain mapping for deterministic color assignment.
// Only used to select the color pool; unknown IDs fall back to DEFAULT_POOL.
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

/** Deterministic color for any roleId. New personas get a color automatically. */
export function getRoleColor(roleId: string): string {
  const pool = DOMAIN_COLOR_POOL[ROLE_DOMAIN_MAP[roleId]] ?? DEFAULT_POOL;
  return pool[(hashString(roleId) >>> 0) % pool.length];
}

export const darkColors: ColorPalette = {
  bg: "#1a1a2e",
  surface: "#16213e",
  surfaceHover: "#1f3056",
  border: "#2a3a5c",
  text: "#e0e0e0",
  textMuted: "#8892a4",
  accent: "#4fc3f7",
  accentDim: "#2196f3",
  danger: "#e74c3c",
  dangerBg: "rgba(231,76,60,0.1)",
  dangerBorder: "rgba(231,76,60,0.3)",
  success: "#27ae60",
  successBg: "rgba(39,174,96,0.1)",
  successBorder: "rgba(39,174,96,0.3)",
  warning: "#e67e22",
  overlay: "rgba(0,0,0,0.4)",
};

export const lightColors: ColorPalette = {
  bg: "#f5f5f5",
  surface: "#ffffff",
  surfaceHover: "#f0f0f0",
  border: "#e0e0e0",
  text: "#1a1a1a",
  textMuted: "#666666",
  accent: "#0288d1",
  accentDim: "#0277bd",
  danger: "#d32f2f",
  dangerBg: "rgba(211,47,47,0.08)",
  dangerBorder: "rgba(211,47,47,0.2)",
  success: "#2e7d32",
  successBg: "rgba(46,125,50,0.08)",
  successBorder: "rgba(46,125,50,0.2)",
  warning: "#e65100",
  overlay: "rgba(0,0,0,0.3)",
};
