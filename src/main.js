import { loadAtlases } from "./engine/assets.js";
import { createCamera, zoomCamera } from "./engine/camera.js";
import { createRenderer } from "./engine/renderer.js";
import { ATLASES } from "./universe/atlases.js";
import { createScene } from "./universe/map.js";

const canvas = document.querySelector("#world");
let seed = 11;
let renderer;
const camera = createCamera(canvas, () => renderer?.requestRender());
camera.zoom = 1;

const atlases = await loadAtlases(ATLASES);
let scene = createScene(seed);
camera.y = -1850;
renderer = createRenderer(canvas, camera, scene, atlases);
renderer.start();
document.body.classList.add("ready");

document.querySelector("#zoomIn").addEventListener("click", () => zoomCamera(camera, 1.12, renderer.requestRender));
document.querySelector("#zoomOut").addEventListener("click", () => zoomCamera(camera, 0.88, renderer.requestRender));
document.querySelector("#reroll").addEventListener("click", () => {
  seed += 1;
  scene.tiles.splice(0, scene.tiles.length, ...createScene(seed).tiles);
  renderer.requestRender();
});
