import { describe, expect, it } from "vitest";
import { darkColors } from "../../theme/tokens.js";
import { resolveGraphTheme } from "./ThemeBridge.js";

describe("resolveGraphTheme", () => {
  it("keeps default graph edges behind nodes", () => {
    document.documentElement.className = "theme-dark";

    const theme = resolveGraphTheme(darkColors);

    expect(theme.edge.defaultAlpha).toBeCloseTo(0.22, 5);
    expect(theme.edge.highlightAlpha).toBeGreaterThan(theme.edge.defaultAlpha);
  });
});
