export function createRenderer(canvas, camera, scene, atlases) {
  const context = canvas.getContext("2d", { alpha: true });
  const tileWidth = 112;
  const tileHeight = 56;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frameRequested = false;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.floor(canvas.clientWidth * pixelRatio);
    height = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function requestRender() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(draw);
  }

  function draw() {
    frameRequested = false;
    resize();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawBackdrop(context, canvas.clientWidth, canvas.clientHeight);

    const translateX = canvas.clientWidth / 2 + camera.x;
    const translateY = 130 + camera.y;
    const bounds = visibleBounds(translateX, translateY);

    context.save();
    context.translate(translateX, translateY);
    context.scale(camera.zoom, camera.zoom);

    const drawables = [];
    for (const tile of scene.tiles) {
      const position = project(tile.x, tile.y);
      if (!isVisible(position, bounds)) continue;
      drawTile(position, tile.sprite);
      for (const item of tile.items) {
        drawables.push({
          y: position.y + item.sort,
          position,
          item,
        });
      }
    }

    drawables
      .sort((a, b) => a.y - b.y)
      .forEach(({ position, item }) => drawSprite(position.x + item.dx, position.y + item.dy, item.sprite));

    context.restore();
  }

  function drawTile(position, sprite) {
    const image = atlases[sprite.atlas];
    context.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, position.x - 76, position.y - 38, 152, 104);
  }

  function drawSprite(x, y, sprite) {
    const image = atlases[sprite.atlas];
    const scale = sprite.scale ?? 1;
    const width = sprite.w * scale;
    const height = sprite.h * scale;
    if (sprite.shadow) drawShadow(x, y, width);
    context.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, x - width / 2, y - height, width, height);
  }

  function drawShadow(x, y, width) {
    context.save();
    context.globalAlpha = 0.14;
    context.fillStyle = "#000";
    context.beginPath();
    context.ellipse(x, y - 7, width * 0.26, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function project(x, y) {
    return {
      x: (x - y) * tileWidth / 2,
      y: (x + y) * tileHeight / 2,
    };
  }

  function visibleBounds(translateX, translateY) {
    const margin = 760;
    return {
      left: -translateX / camera.zoom - margin,
      right: (canvas.clientWidth - translateX) / camera.zoom + margin,
      top: -translateY / camera.zoom - margin,
      bottom: (canvas.clientHeight - translateY) / camera.zoom + margin,
    };
  }

  function isVisible(position, bounds) {
    return position.x >= bounds.left
      && position.x <= bounds.right
      && position.y >= bounds.top
      && position.y <= bounds.bottom;
  }

  window.addEventListener("resize", requestRender);

  return { start: requestRender, requestRender };
}

function drawBackdrop(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#263a42");
  gradient.addColorStop(1, "#121820");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}
