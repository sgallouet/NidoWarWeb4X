export class Tile {
  constructor({ x, y, sprite, items = [] }) {
    this.x = x;
    this.y = y;
    this.sprite = sprite;
    this.items = items;
    this.center = { x: 0, y: 0 };
    this.origin = { x: 0, y: 0 };
  }

  addItem(item) {
    this.items.push(item);
  }

  get blocksMovement() {
    return this.items.some((item) => item.blocksMovement !== false);
  }

  setGeometry(origin, center) {
    this.origin = origin;
    this.center = center;
    return this;
  }
}
