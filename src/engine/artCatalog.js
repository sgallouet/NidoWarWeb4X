export async function loadArtCatalog(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load art manifest: ${path}`);
  const manifest = await response.json();
  const entries = await Promise.all(
    Object.entries(manifest.assets).map(async ([id, asset]) => {
      if (asset.frames) {
        const frames = await Promise.all(
          asset.frames.map(async (frame) => ({ ...frame, image: await loadImage(withVersion(frame.file, manifest.cacheVersion)) })),
        );
        return [id, { ...asset, id, frames, image: frames[0].image }];
      }
      return [id, { ...asset, id, image: await loadImage(withVersion(asset.file, manifest.cacheVersion)) }];
    }),
  );
  return {
    tile: manifest.tile,
    assets: Object.fromEntries(entries),
  };
}

function withVersion(src, version) {
  if (!version) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}
