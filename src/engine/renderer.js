export function createRenderer(canvas, camera, scene, art) {
  const context = canvas.getContext("2d", { alpha: true });
  const tileWidth = art.tile.width;
  const tileHeight = art.tile.height;
  const objectOffsetY = art.tile.objectOffsetY ?? 0;
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
        const asset = art.assets[item.sprite];
        const itemPosition = projectItem(tile, asset);
        drawables.push({
          y: itemPosition.y + item.dy + (asset.draw.depth ?? 0) + (item.depth ?? 0),
          position: itemPosition,
          item,
          asset,
        });
      }
    }

    drawables
      .sort((a, b) => a.y - b.y)
      .forEach(({ position, item, asset }) => drawSprite(position.x + item.dx, position.y + item.dy, asset));

    context.restore();
  }

  function drawTile(position, sprite) {
    const asset = art.assets[sprite];
    const draw = asset.draw;
    context.drawImage(
      asset.image,
      position.x - draw.width * draw.anchorX,
      position.y - draw.height * draw.anchorY,
      draw.width,
      draw.height,
    );
  }

  function drawSprite(x, y, asset) {
    const draw = asset.draw;
    const image = asset.image;
    const height = draw.height;
    const width = draw.width ?? Math.round(image.width * (height / image.height));
    if (draw.shadow) drawShadow(x, y, width);
    context.drawImage(
      image,
      x - width * (draw.anchorX ?? 0.5),
      y - height * (draw.anchorY ?? 1),
      width,
      height,
    );
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

  function projectItem(tile, asset) {
    const placement = asset.placement ?? {};
    const footprint = placement.footprint ?? { width: 1, height: 1 };
    const center = placement.center ?? {
      x: (footprint.width - 1) / 2,
      y: (footprint.height - 1) / 2,
    };
    const position = project(tile.x + center.x, tile.y + center.y);
    return { x: position.x, y: position.y + objectOffsetY };
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

  return {
    start() {
      requestRender();
    },
    requestRender,
  };
}

function drawBackdrop(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#263a42");
  gradient.addColorStop(1, "#121820");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}
