import { createBattle } from "../battleActions.js?v=battle-test-43";

const WORLD_TIMES = ["6am", "1pm", "4pm", "8pm", "1am"];

export class WorldManager {
  handleTileTap(scene, tile) {
    if (scene.battle) return { type: "battle-open" };
    if (scene.armies.some((army) => army.animation?.kind === "move")) return { type: "army-moving" };
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
    this.moveArmy(scene, selected, tile);
    return { type: "moved", army: selected };
  }

  moveArmy(scene, army, tile) {
    const path = this.movementPath(scene, army, tile);
    const cost = Math.max(0, path.length - 1);
    army.animation = {
      fromX: army.x,
      fromY: army.y,
      kind: "move",
      path,
      started: performance.now(),
      toX: tile.x,
      toY: tile.y,
    };
    army.x = tile.x;
    army.y = tile.y;
    army.movementLeft = Math.max(0, (army.movementLeft ?? army.move) - cost);
  }

  endTurn(scene) {
    if (scene.battle) return { type: "battle-open" };
    if (scene.armies.some((army) => army.animation?.kind === "move")) return { type: "army-moving" };
    scene.world ??= { day: 1, timeIndex: 0, timeLabel: WORLD_TIMES[0] };
    scene.world.timeIndex = (scene.world.timeIndex + 1) % WORLD_TIMES.length;
    if (scene.world.timeIndex === 0) scene.world.day += 1;
    scene.world.timeLabel = WORLD_TIMES[scene.world.timeIndex];
    for (const army of scene.armies) {
      if (army.faction === "player") army.movementLeft = army.move;
    }
    return { type: "world-turn-ended", world: scene.world };
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
    for (const tileKey of this.reachableTileKeys(scene, army)) {
      const [x, y] = tileKey.split(",").map(Number);
      if (!this.armyAt(scene, x, y) && !this.tileBlocked(scene, x, y)) tiles.add(tileKey);
    }
    return tiles;
  }

  reachableDistances(scene) {
    const army = this.selectedArmy(scene) ?? this.inspectedArmy(scene);
    if (!army || scene.battle) return new Map();
    return this.reachableDistanceMap(scene, army);
  }

  engageTiles(scene) {
    const army = this.selectedArmy(scene);
    if (!army || scene.battle) return new Set();
    const tiles = new Set();
    const reachable = this.reachableTileKeys(scene, army);
    for (const enemy of scene.armies) {
      if (enemy.faction === army.faction) continue;
      for (const tile of this.neighbors(enemy)) {
        const tileKey = `${tile.x},${tile.y}`;
        if (this.inBounds(scene, tile) && reachable.has(tileKey) && !this.armyAt(scene, tile.x, tile.y) && !this.tileBlocked(scene, tile.x, tile.y)) {
          tiles.add(tileKey);
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
    return new Set(this.reachableDistanceMap(scene, army).keys());
  }

  reachableDistanceMap(scene, army) {
    const maxDistance = army.movementLeft ?? army.move;
    const reached = new Set([`${army.x},${army.y}`]);
    const distances = new Map([[`${army.x},${army.y}`, 0]]);
    const queue = [{ x: army.x, y: army.y, distance: 0 }];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current.distance >= maxDistance) continue;
      for (const next of this.neighbors(current)) {
        const nextKey = `${next.x},${next.y}`;
        if (!this.inBounds(scene, next) || reached.has(nextKey)) continue;
        if (this.tileBlocked(scene, next.x, next.y) || this.armyAt(scene, next.x, next.y)) continue;
        reached.add(nextKey);
        distances.set(nextKey, current.distance + 1);
        queue.push({ ...next, distance: current.distance + 1 });
      }
    }
    return distances;
  }

  movementPath(scene, army, destination) {
    const start = { x: army.x, y: army.y };
    const targetKey = key(destination.x, destination.y);
    if (key(start.x, start.y) === targetKey) return [start];

    const visited = new Set([key(start.x, start.y)]);
    const previous = new Map();
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const next of this.movementNeighbors(current, destination)) {
        const nextKey = key(next.x, next.y);
        if (visited.has(nextKey) || !this.inBounds(scene, next)) continue;
        const occupant = this.armyAt(scene, next.x, next.y);
        if (this.tileBlocked(scene, next.x, next.y) || (occupant && occupant.id !== army.id)) continue;
        visited.add(nextKey);
        previous.set(nextKey, key(current.x, current.y));
        if (nextKey === targetKey) return buildPath(previous, start, destination);
        queue.push(next);
      }
    }
    return [start, { x: destination.x, y: destination.y }];
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

  movementNeighbors(tile, destination) {
    return this.neighbors(tile).sort((a, b) => distance(a, destination) - distance(b, destination));
  }

  inBounds(scene, tile) {
    return tile.x >= 0 && tile.y >= 0 && tile.x < scene.size && tile.y < scene.size;
  }

  tileBlocked(scene, x, y) {
    return Boolean(scene.tileset?.at(x, y)?.blocksMovement);
  }
}

function key(x, y) {
  return `${x},${y}`;
}

function buildPath(previous, start, destination) {
  const path = [{ x: destination.x, y: destination.y }];
  let cursor = key(destination.x, destination.y);
  const startKey = key(start.x, start.y);
  while (cursor !== startKey) {
    cursor = previous.get(cursor);
    if (!cursor) return [start, { x: destination.x, y: destination.y }];
    const [x, y] = cursor.split(",").map(Number);
    path.push({ x, y });
  }
  return path.reverse();
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
