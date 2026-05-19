import { createBattle } from "../battleActions.js?v=battle-test-43";

export class WorldManager {
  handleTileTap(scene, tile) {
    if (scene.battle) return { type: "battle-open" };
    if (!this.inBounds(scene, tile)) return { type: "miss" };

    const tappedArmy = this.armyAt(scene, tile.x, tile.y);
    if (tappedArmy?.faction === "player") {
      scene.selectedArmyId = tappedArmy.id;
      scene.inspectedArmyId = null;
      return { type: "selected", army: tappedArmy };
    }

    const selected = this.selectedArmy(scene);
    if (tappedArmy && selected && tappedArmy.faction !== selected.faction) {
      if (!this.adjacent(selected, tappedArmy)) return this.inspectEnemy(scene, tappedArmy);
      scene.battle = createBattle(scene, selected, tappedArmy);
      return { type: "battle-started", center: scene.battle.center };
    }

    if (tappedArmy && tappedArmy.faction !== "player") return this.inspectEnemy(scene, tappedArmy);

    if (!selected || !this.canReach(scene, selected, tile) || tappedArmy || this.tileBlocked(scene, tile.x, tile.y)) {
      return this.clearSelection(scene);
    }
    selected.x = tile.x;
    selected.y = tile.y;
    return { type: "moved", army: selected };
  }

  clearSelection(scene) {
    scene.selectedArmyId = null;
    scene.inspectedArmyId = null;
    return { type: "unselected" };
  }

  inspectEnemy(scene, army) {
    scene.selectedArmyId = null;
    scene.inspectedArmyId = army.id;
    return { type: "enemy-inspected", army };
  }

  reachableTiles(scene) {
    const army = this.selectedArmy(scene) ?? this.inspectedArmy(scene);
    if (!army || scene.battle) return new Set();
    const tiles = new Set();
    for (let y = 0; y < scene.size; y += 1) {
      for (let x = 0; x < scene.size; x += 1) {
        if (this.canReach(scene, army, { x, y }) && !this.armyAt(scene, x, y) && !this.tileBlocked(scene, x, y)) tiles.add(`${x},${y}`);
      }
    }
    return tiles;
  }

  engageTiles(scene) {
    const army = this.selectedArmy(scene);
    if (!army || scene.battle) return new Set();
    const tiles = new Set();
    for (const enemy of scene.armies) {
      if (enemy.faction === army.faction) continue;
      for (const tile of this.neighbors(enemy)) {
        if (this.inBounds(scene, tile) && this.canReach(scene, army, tile) && !this.armyAt(scene, tile.x, tile.y) && !this.tileBlocked(scene, tile.x, tile.y)) {
          tiles.add(`${tile.x},${tile.y}`);
        }
      }
    }
    return tiles;
  }

  attackableArmyTiles(scene) {
    const army = this.selectedArmy(scene);
    if (!army || scene.battle) return new Set();
    return new Set(scene.armies
      .filter((enemy) => enemy.faction !== army.faction && this.adjacent(army, enemy))
      .map((enemy) => `${enemy.x},${enemy.y}`));
  }

  selectedArmy(scene) {
    return scene.armies.find((army) => army.id === scene.selectedArmyId);
  }

  inspectedArmy(scene) {
    return scene.armies.find((army) => army.id === scene.inspectedArmyId);
  }

  armyAt(scene, x, y) {
    return scene.armies.find((army) => army.x === x && army.y === y);
  }

  canReach(scene, army, tile) {
    return this.reachableTileKeys(scene, army).has(`${tile.x},${tile.y}`);
  }

  reachableTileKeys(scene, army) {
    const reached = new Set([`${army.x},${army.y}`]);
    const queue = [{ x: army.x, y: army.y, distance: 0 }];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current.distance >= army.move) continue;
      for (const next of this.neighbors(current)) {
        const nextKey = `${next.x},${next.y}`;
        if (!this.inBounds(scene, next) || reached.has(nextKey)) continue;
        if (this.tileBlocked(scene, next.x, next.y) || this.armyAt(scene, next.x, next.y)) continue;
        reached.add(nextKey);
        queue.push({ ...next, distance: current.distance + 1 });
      }
    }
    return reached;
  }

  adjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  neighbors(tile) {
    return [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ];
  }

  inBounds(scene, tile) {
    return tile.x >= 0 && tile.y >= 0 && tile.x < scene.size && tile.y < scene.size;
  }

  tileBlocked(scene, x, y) {
    return Boolean(scene.tileset?.at(x, y)?.blocksMovement);
  }
}
