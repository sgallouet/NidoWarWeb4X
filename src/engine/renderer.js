import { createCanvasRenderer } from "./rendering/CanvasRenderer.js?v=perf-cache-1";

export function createRenderer(canvas, camera, scene, art, options) {
  return createCanvasRenderer(canvas, camera, scene, art, options);
}
