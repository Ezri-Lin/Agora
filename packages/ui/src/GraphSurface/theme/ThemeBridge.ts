/**
 * ThemeBridge — resolves Agora color tokens into PIXI-compatible values.
 * Called only on init and theme-change, never per frame.
 * Renderer reads ResolvedGraphTheme, never CSS directly.
 */

import type { ColorPalette } from "../../theme/tokens.js";
import { graph as graphTokens } from "../../theme/tokens.js";

export interface ResolvedGraphTheme {
  mode: "light" | "dark";
  backgroundAlpha: number;

  node: {
    defaultTint: number;
    hoverTint: number;
    selectedRingTint: number;
    mutedAlpha: number;
  };

  edge: {
    defaultTint: number;
    defaultAlpha: number;
    highlightAlpha: number;
  };

  label: {
    tint: number;
    alpha: number;
  };

  stance: {
    supportTint: number;
    opposeTint: number;
    contradictTint: number;
    questionTint: number;
    refineTint: number;
  };
}

/** Convert hex "#rrggbb" to PIXI tint number (0xRRGGBB). */
export function hexToPixiTint(hex: string): number {
  const cleaned = hex.replace("#", "");
  return parseInt(cleaned, 16);
}

/** Blend a hex color toward white by a factor (0.9 = Obsidian's tint blending). */
export function hexToPixiTintBlended(hex: string, factor = 0.9): number {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const br = Math.round(r * factor + 255 * (1 - factor));
  const bg = Math.round(g * factor + 255 * (1 - factor));
  const bb = Math.round(b * factor + 255 * (1 - factor));
  return (br << 16) | (bg << 8) | bb;
}

/** Detect whether the current theme is dark. */
function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  return (
    root.classList.contains("theme-dark") ||
    root.getAttribute("data-theme") === "dark" ||
    (!root.classList.contains("theme-light") &&
      root.getAttribute("data-theme") !== "light")
  );
}

/** Resolve all graph theme values from Agora tokens. */
export function resolveGraphTheme(palette: ColorPalette): ResolvedGraphTheme {
  const dark = isDarkMode();

  return {
    mode: dark ? "dark" : "light",
    backgroundAlpha: 0,

    node: {
      defaultTint: hexToPixiTintBlended(graphTokens.nodeFill, 0.9),
      hoverTint: hexToPixiTintBlended(graphTokens.nodeSelectedRing, 0.9),
      selectedRingTint: hexToPixiTint(graphTokens.nodeSelectedRing),
      mutedAlpha: dark ? 0.28 : 0.22,
    },

    edge: {
      defaultTint: hexToPixiTint(graphTokens.nodeStroke),
      defaultAlpha: dark ? 0.38 : 0.38,
      highlightAlpha: dark ? 0.6 : 0.45,
    },

    label: {
      tint: hexToPixiTint(dark ? "#d7d7d7" : "#2f2f2f"),
      alpha: dark ? 0.85 : 0.9,
    },

    stance: {
      supportTint: hexToPixiTint(graphTokens.edgeSupport),
      opposeTint: hexToPixiTint(graphTokens.edgeChallenge),
      contradictTint: hexToPixiTint(graphTokens.edgeChallenge), // same red as oppose, thicker arc
      questionTint: hexToPixiTint("#d29922"),
      refineTint: hexToPixiTint("#a882ff"),
    },
  };
}

/**
 * Watch for theme changes via MutationObserver on <html> class/data-theme.
 * Returns an unsubscribe function.
 */
export function watchGraphTheme(
  palette: ColorPalette,
  onChange: (theme: ResolvedGraphTheme) => void,
): () => void {
  const observer = new MutationObserver(() => {
    onChange(resolveGraphTheme(palette));
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  return () => observer.disconnect();
}
