import { loadArtCatalog } from "./engine/artCatalog.js";
import { createCamera, zoomCamera } from "./engine/camera.js";
import { createRenderer } from "./engine/renderer.js?v=hires-forest-2";
import { createScene } from "./universe/map.js";

const canvas = document.querySelector("#world");
const loading = document.querySelector("#loading");
const ART_VERSION = "hires-forest-2";
let seed = 11;
let renderer;
const camera = createCamera(canvas, () => renderer?.requestRender());
camera.zoom = 1;

boot().catch((error) => {
  console.error(error);
  loading.textContent = "Art error";
});

async function boot() {
  const art = await loadArtCatalog(`./ressources/art/assets.json?v=${ART_VERSION}`);
  const scene = createScene(seed);
  camera.y = -1720;
  renderer = createRenderer(canvas, camera, scene, art);
  renderer.start();
  document.body.classList.add("ready");

  document.querySelector("#zoomIn").addEventListener("click", () => zoomCamera(camera, 1.12, renderer.requestRender));
  document.querySelector("#zoomOut").addEventListener("click", () => zoomCamera(camera, 0.88, renderer.requestRender));
  document.querySelector("#reroll").addEventListener("click", () => {
    seed += 1;
    scene.tiles.splice(0, scene.tiles.length, ...createScene(seed).tiles);
    renderer.requestRender();
  });
}
