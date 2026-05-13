export function createCamera(canvas, onChange = () => {}) {
  const camera = {
    x: 0,
    y: -120,
    zoom: 0.92,
    minZoom: 0.58,
    maxZoom: 1.52,
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
      camera.zoom = clamp(camera.zoom * (distance / lastDistance), camera.minZoom, camera.maxZoom);
      onChange();
    }
    lastDistance = distance;
  });

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    camera.zoom = clamp(camera.zoom * (event.deltaY > 0 ? 0.92 : 1.08), camera.minZoom, camera.maxZoom);
    onChange();
  }, { passive: false });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    lastDistance = 0;
  }

  return camera;
}

export function zoomCamera(camera, amount, onChange = () => {}) {
  camera.zoom = clamp(camera.zoom * amount, camera.minZoom, camera.maxZoom);
  onChange();
}

function point(event) {
  return { x: event.clientX, y: event.clientY };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
