export function loadAtlases(atlases) {
  return Promise.all(
    Object.entries(atlases).map(([key, src]) => loadImage(src).then((image) => [key, image])),
  ).then((entries) => Object.fromEntries(entries));
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
