import { describe, expect, it } from "vitest";
import { darkColors } from "../../theme/tokens.js";
import { resolveGraphTheme } from "../theme/ThemeBridge.js";
import { NodeLayer } from "./NodeLayer.js";
import type { CoreNode } from "../model/coreTypes.js";

const node = (kind = "document"): CoreNode => ({
  id: `${kind}:a`,
  label: "A",
  kind,
  size: kind === "document" ? 4 : 3,
  color: kind === "ghost" ? "#777777" : "#999999",
});

describe("NodeLayer", () => {
  it("uses inverse square-root zoom scaling at overview zoom", () => {
    const layer = new NodeLayer();
    const docNode = node("document");

    layer.build([docNode], resolveGraphTheme(darkColors));
    layer.updatePositions([docNode], new Map([["document:a", { x: 0, y: 0 }]]));
    layer.applyZoom(0.25);
    layer.animate();

    const nodeGfx = layer.children[1];
    expect(nodeGfx?.scale.x).toBeCloseTo(2, 5);

    layer.destroy();
  });

  it("keeps ghost nodes subdued at overview zoom", () => {
    const layer = new NodeLayer();
    const theme = resolveGraphTheme(darkColors);
    const ghostNode = node("ghost");

    layer.build([ghostNode], theme);
    layer.updatePositions([ghostNode], new Map([["ghost:a", { x: 0, y: 0 }]]));
    layer.updateVisuals([ghostNode], null, null, theme);
    layer.applyZoom(0.5);
    layer.animate();

    const nodeGfx = layer.children[1];
    expect(nodeGfx?.alpha).toBeCloseTo(0.45, 5);

    layer.destroy();
  });

  it("keeps hovered ghost nodes readable at overview zoom", () => {
    const layer = new NodeLayer();
    const theme = resolveGraphTheme(darkColors);
    const ghostNode = node("ghost");

    layer.build([ghostNode], theme);
    layer.updatePositions([ghostNode], new Map([["ghost:a", { x: 0, y: 0 }]]));
    layer.updateVisuals([ghostNode], null, "ghost:a", theme);
    layer.applyZoom(0.5);
    layer.animate();

    const nodeGfx = layer.children[1];
    expect(nodeGfx?.alpha).toBe(1);

    layer.destroy();
  });
});
