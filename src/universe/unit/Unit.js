import { unitType } from "./unitCatalog.js?v=battle-test-43";

export class Unit {
  constructor({ armyId, id, index, side, sprite, x, y }) {
    const type = unitType(sprite);
    this.armyId = armyId;
    this.id = id;
    this.index = index;
    this.side = side;
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.class = type.className;
    this.counterPercent = type.counterPercent;
    this.damage = type.damage;
    this.hp = type.hp;
    this.label = type.label;
    this.maxHp = this.hp;
    this.move = type.move;
    this.power = type.power;
    this.range = type.range;
    this.traits = type.traits;
    this.blocksMovement = this.traits.includes("block");
    this.inactive = false;
    this.moved = false;
    this.attacked = false;
    this.attackCount = 0;
    this.attackUnavailable = false;
    this.name = "";
  }

  get healthRatio() {
    return this.maxHp ? this.hp / this.maxHp : 0;
  }

  static fromArmy(army, side) {
    return army.formation.map((sprite, index) => new Unit({
      armyId: army.id,
      id: `${army.id}-${index}`,
      index,
      side,
      sprite,
      x: army.x,
      y: army.y,
    }));
  }
}
