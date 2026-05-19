export function createIso(art) {
  return {
    tileWidth: art.tile.width,
    tileHeight: art.tile.height,
    objectOffsetY: art.tile.objectOffsetY ?? 0,
  };
}

export function projectIso(x, y, iso) {
  return {
    x: (x - y) * iso.tileWidth / 2,
    y: (x + y) * iso.tileHeight / 2,
  };
}

export function tileCenter(x, y, iso) {
  const origin = projectIso(x, y, iso);
  return { x: origin.x, y: origin.y + iso.objectOffsetY };
}

export function applyTileCenters(scene, iso) {
  for (const tile of scene.tiles) {
    const origin = projectIso(tile.x, tile.y, iso);
    const center = { x: origin.x, y: origin.y + iso.objectOffsetY };
    if (typeof tile.setGeometry === "function") {
      tile.setGeometry(origin, center);
    } else {
      tile.origin = origin;
      tile.center = center;
    }
  }
}

export function screenToTile(screenX, screenY, canvas, camera, iso, scene) {
  const world = screenToWorld(screenX, screenY, canvas, camera);
  const surfaceY = world.y - iso.objectOffsetY;
  const rawX = surfaceY / iso.tileHeight + world.x / iso.tileWidth;
  const rawY = surfaceY / iso.tileHeight - world.x / iso.tileWidth;
  const baseX = Math.round(rawX);
  const baseY = Math.round(rawY);
  let best = { x: baseX, y: baseY, score: Infinity };

  for (let y = baseY - 1; y <= baseY + 1; y += 1) {
    for (let x = baseX - 1; x <= baseX + 1; x += 1) {
      if (scene && (x < 0 || y < 0 || x >= scene.size || y >= scene.size)) continue;
      const center = scene ? tileAt(scene, x, y)?.center : tileCenter(x, y, iso);
      if (!center) continue;
      const score = Math.abs(world.x - center.x) / (iso.tileWidth / 2)
        + Math.abs(world.y - center.y) / (iso.tileHeight / 2);
      if (score < best.score) best = { x, y, score };
    }
  }

  return { x: best.x, y: best.y };
}

export function screenToWorld(screenX, screenY, canvas, camera) {
  const translateX = canvas.clientWidth / 2 + camera.x;
  const translateY = 130 + camera.y;
  return {
    x: (screenX - translateX) / camera.zoom,
    y: (screenY - translateY) / camera.zoom,
  };
}

export function worldToScreen(world, canvas, camera) {
  return {
    x: canvas.clientWidth / 2 + camera.x + world.x * camera.zoom,
    y: 130 + camera.y + world.y * camera.zoom,
  };
}

function tileAt(scene, x, y) {
  if (scene.tileset) return scene.tileset.at(x, y);
  return scene.tiles[y * scene.size + x];
}
