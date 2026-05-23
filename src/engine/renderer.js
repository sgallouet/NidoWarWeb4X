import { createCanvasRenderer } from "./rendering/CanvasRenderer.js?v=world-turn-1";

export function createRenderer(canvas, camera, scene, art, options) {
  return createCanvasRenderer(canvas, camera, scene, art, options);
}
