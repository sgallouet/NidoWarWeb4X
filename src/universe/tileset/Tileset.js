export class Tileset {
  constructor(size, tiles) {
    this.size = size;
    this.tiles = tiles;
  }

  at(x, y) {
    if (!this.inBounds(x, y)) return undefined;
    return this.tiles[y * this.size + x];
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  [Symbol.iterator]() {
    return this.tiles[Symbol.iterator]();
  }
}
