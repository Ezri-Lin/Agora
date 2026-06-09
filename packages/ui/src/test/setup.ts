import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const canvasContextStub = {
  arc: () => {},
  beginPath: () => {},
  clearRect: () => {},
  clip: () => {},
  closePath: () => {},
  createImageData: () => ({ data: [] }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  drawImage: () => {},
  fill: () => {},
  fillRect: () => {},
  fillText: () => {},
  getImageData: () => ({ data: [] }),
  lineTo: () => {},
  measureText: () => ({ width: 0 }),
  moveTo: () => {},
  putImageData: () => {},
  rect: () => {},
  restore: () => {},
  rotate: () => {},
  save: () => {},
  scale: () => {},
  setTransform: () => {},
  stroke: () => {},
  transform: () => {},
  translate: () => {},
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => canvasContextStub,
});

afterEach(() => {
  cleanup();
});
