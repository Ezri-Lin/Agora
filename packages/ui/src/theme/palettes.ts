export interface ColorPalette {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  // Role identity colors (theme-independent)
  moderator: string;
  critic: string;
  historian: string;
  strategist: string;
  user: string;
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

// Known role colors for the floating panel
const KNOWN_ROLE_COLORS: Record<string, string> = {
  moderator: "#7c4dff",
  skeptic_critic: "#ff5252",
  historian: "#ffa726",
  product_strategist: "#66bb6a",
  systems_architect: "#ab47bc",
  jobs_product_taste_lens: "#ff7043",
  buffett_business_lens: "#66bb6a",
  munger_mental_models_lens: "#7e57c2",
  growth_marketer_lens: "#ffca28",
  ethics_lens: "#26c6da",
  ux_research_lens: "#ec407a",
  legal_lens: "#78909c",
  narrative_lens: "#8d6e63",
  economics_lens: "#42a5f5",
  security_lens: "#ef5350",
  science_lens: "#66bb6a",
  psychology_lens: "#ab47bc",
};

const CUSTOM_ROLE_COLORS = ["#42a5f5", "#ab47bc", "#26c6da", "#ff7043", "#66bb6a", "#ec407a"];

export function getRoleColor(roleId: string): string {
  if (KNOWN_ROLE_COLORS[roleId]) return KNOWN_ROLE_COLORS[roleId];
  const hash = roleId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CUSTOM_ROLE_COLORS[hash % CUSTOM_ROLE_COLORS.length];
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
  moderator: "#7c4dff",
  critic: "#ff5252",
  historian: "#ffa726",
  strategist: "#66bb6a",
  user: "#4fc3f7",
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
  moderator: "#7c4dff",
  critic: "#ff5252",
  historian: "#ffa726",
  strategist: "#66bb6a",
  user: "#0288d1",
  danger: "#d32f2f",
  dangerBg: "rgba(211,47,47,0.08)",
  dangerBorder: "rgba(211,47,47,0.2)",
  success: "#2e7d32",
  successBg: "rgba(46,125,50,0.08)",
  successBorder: "rgba(46,125,50,0.2)",
  warning: "#e65100",
  overlay: "rgba(0,0,0,0.3)",
};
