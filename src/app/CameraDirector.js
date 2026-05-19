import { BATTLE_RADIUS, DEFAULT_ZOOM } from "./config.js?v=battle-test-43";

export class CameraDirector {
  constructor({ camera, canvas, iso, renderer }) {
    this.camera = camera;
    this.canvas = canvas;
    this.iso = iso;
    this.renderer = renderer;
  }

  focusOn(tile, zoom) {
    this.camera.zoom = zoom;
    const target = this.targetFor(tile, zoom);
    this.camera.x = target.x;
    this.camera.y = target.y;
  }

  animateTo(tile, zoom, duration) {
    const start = { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom };
    const end = { ...this.targetFor(tile, zoom), zoom };
    const started = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.x = mix(start.x, end.x, eased);
      this.camera.y = mix(start.y, end.y, eased);
      this.camera.zoom = mix(start.zoom, end.zoom, eased);
      this.renderer.requestRender();
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  battleZoom() {
    const worldWidth = this.iso.tileWidth * (BATTLE_RADIUS * 2 + 1);
    const worldHeight = this.iso.tileHeight * (BATTLE_RADIUS * 2 + 1);
    return Math.min(
      this.camera.maxZoom,
      Math.max(
        DEFAULT_ZOOM,
        Math.min(
          (this.canvas.clientWidth * 0.88) / worldWidth,
          (this.canvas.clientHeight * 0.78) / worldHeight,
        ),
      ),
    );
  }

  targetFor(tile, zoom) {
    const position = tile.center ?? tile;
    return {
      x: -position.x * zoom,
      y: this.canvas.clientHeight * 0.54 - 130 - position.y * zoom,
    };
  }
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}
