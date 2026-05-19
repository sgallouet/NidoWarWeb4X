export function createCamera(canvas, onChange = () => {}) {
  const camera = {
    x: 0,
    y: -120,
    zoom: 0.92,
    minZoom: 0.58,
    maxZoom: 1.52,
    canvas,
  };

  const pointers = new Map();
  let lastDistance = 0;

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point(event));
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const next = point(event);
    pointers.set(event.pointerId, next);

    if (pointers.size === 1) {
      camera.x += next.x - previous.x;
      camera.y += next.y - previous.y;
      onChange();
      return;
    }

    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (lastDistance) {
      const midpoint = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
      zoomAt(camera, distance / lastDistance, midpoint.x, midpoint.y);
      onChange();
    }
    lastDistance = distance;
  });

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(camera, event.deltaY > 0 ? 0.92 : 1.08, event.clientX, event.clientY);
    onChange();
  }, { passive: false });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    lastDistance = 0;
  }

  return camera;
}

export function zoomCamera(camera, amount, onChange = () => {}) {
  zoomAt(camera, amount, camera.canvas.clientWidth / 2, camera.canvas.clientHeight / 2);
  onChange();
}

export function zoomAt(camera, amount, screenX, screenY) {
  const nextZoom = clamp(camera.zoom * amount, camera.minZoom, camera.maxZoom);
  if (nextZoom === camera.zoom) return;

  const worldX = (screenX - (camera.canvas.clientWidth / 2 + camera.x)) / camera.zoom;
  const worldY = (screenY - (130 + camera.y)) / camera.zoom;
  camera.zoom = nextZoom;
  camera.x = screenX - camera.canvas.clientWidth / 2 - worldX * nextZoom;
  camera.y = screenY - 130 - worldY * nextZoom;
}

function point(event) {
  return { x: event.clientX, y: event.clientY };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
