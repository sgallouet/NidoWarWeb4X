import { createCanvasRenderer } from "./rendering/CanvasRenderer.js?v=battle-test-43";

export function createRenderer(canvas, camera, scene, art, options) {
  return createCanvasRenderer(canvas, camera, scene, art, options);
}
