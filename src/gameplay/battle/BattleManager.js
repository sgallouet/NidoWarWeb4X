import { Unit } from "../../universe/unit/Unit.js?v=battle-test-43";
import { UnitNameRegistry } from "./UnitNameRegistry.js?v=battle-test-43";

const BATTLE_RADIUS = 4;
const ASSIST_DELAY = 300;
const COUNTER_DELAY = 240;
const RETREAT_HEALTH = 0.4;

export class BattleManager {
  constructor({ names = new UnitNameRegistry() } = {}) {
    this.names = names;
  }

  createBattle(scene, attacker, defender) {
    const center = { x: defender.x, y: defender.y };
    const armies = scene.armies.filter((army) => this.inBattleBounds({ center }, army));
    const combatants = [
      ...this.createSide(armies.filter((army) => army.faction === attacker.faction), "player", center),
      ...this.createSide(armies.filter((army) => army.faction !== attacker.faction), "enemy", center),
    ];
    return {
      activeId: combatants.find((combatant) => combatant.side === "player")?.id,
      attackerFaction: attacker.faction,
      center,
      combatants,
      floaters: [],
      phase: "preparation",
      round: 1,
      size: scene.size,
      tileset: scene.tileset,
      turn: 0,
      winner: null,
    };
  }

  handleBattleTap(scene, tile) {
    const battle = scene.battle;
    if (!battle || battle.winner) return { type: "miss" };
    if (!this.inBattleBounds(battle, tile)) return this.clearSelection(battle);
    if (battle.phase === "preparation") return this.handlePreparationTap(battle, tile);

    const tapped = this.combatantAt(battle, tile.x, tile.y);
    if (tapped?.side === "player" && this.playerCanAct(battle)) {
      battle.activeId = tapped.id;
      return { type: "battle-selected", combatant: tapped };
    }

    const active = this.activeCombatant(battle);
    if (!active) return { type: "miss" };
    if (active.side !== "player") return { type: "enemy-turn" };

    const target = tapped;
    if (target?.side !== active.side && this.canAttack(active, target)) {
      return this.performAttack(battle, active, target, "player-attacked");
    }

    if (!target && this.canMove(battle, active, tile)) {
      if (this.isRetreatTile(battle, tile) && this.canRetreat(active)) {
        this.retreatUnit(battle, active, tile);
        return { type: "retreated", combatant: active };
      }

      this.moveUnit(battle, active, tile, 360);
      active.attackUnavailable = !this.canStillAttack(battle, active);
      return { type: "battle-moved", combatant: active, endedTurn: active.inactive };
    }

    return this.clearSelection(battle);
  }

  waitBattleTurn(scene) {
    if (!scene.battle || scene.battle.winner) return;
    if (scene.battle.phase === "preparation") {
      this.startBattle(scene);
      return;
    }
    this.endPlayerTurn(scene.battle);
  }

  startBattle(scene) {
    const battle = scene.battle;
    if (!battle || battle.phase === "battle") return { type: "already-started" };
    battle.phase = "battle";
    for (const combatant of battle.combatants) {
      combatant.moved = false;
      combatant.attacked = false;
      combatant.attackCount = 0;
      combatant.attackUnavailable = false;
      combatant.originX = combatant.x;
      combatant.originY = combatant.y;
    }
    battle.activeId = this.living(battle, "player")[0]?.id ?? battle.combatants[0]?.id;
    battle.revealStarted = performance.now();
    return { type: "battle-ready" };
  }

  isEnemyTurn(scene) {
    const battle = scene.battle;
    const active = battle && this.activeCombatant(battle);
    return Boolean(active && active.side === "enemy" && battle.phase === "battle" && !battle.winner);
  }

  resolveEnemyTurn(scene) {
    const battle = scene.battle;
    const active = battle && this.activeCombatant(battle);
    if (!active || active.side !== "enemy" || battle.phase !== "battle" || battle.winner) return { type: "idle" };

    const firstTarget = this.nearestAttackTarget(battle, active);
    if (firstTarget) return this.performAttack(battle, active, firstTarget, "enemy-attacked");

    const nearest = this.nearestTarget(battle, active, "player");
    const destination = nearest && this.bestMoveToward(battle, active, nearest);
    if (destination) this.moveUnit(battle, active, destination, 360);

    const movedTarget = this.nearestAttackTarget(battle, active);
    if (movedTarget) return this.performAttack(battle, active, movedTarget, "enemy-attacked");
    this.advanceTurn(battle);
    return { type: destination ? "enemy-moved" : "enemy-waited", combatant: active };
  }

  selectUnit(battle, unitId) {
    const unit = battle?.combatants.find((combatant) => combatant.id === unitId && combatant.hp > 0 && !combatant.inactive);
    if (!unit || unit.side !== "player") return { type: "blocked" };
    if (battle.phase === "preparation") {
      battle.activeId = unit.id;
      return { type: "prep-selected", combatant: unit };
    }
    if (!this.playerCanAct(battle)) return { type: "blocked" };
    battle.activeId = unit.id;
    return { type: "battle-selected", combatant: unit };
  }

  battleMoveTiles(battle) {
    const active = this.activeCombatant(battle);
    const tiles = new Set();
    if (!active || battle.winner) return tiles;
    if (battle.phase === "preparation") {
      if (active.side !== "player") return tiles;
      for (const tile of this.deploymentTiles(battle)) {
        if (!this.combatantAt(battle, tile.x, tile.y) && !this.tileBlocked(battle, tile.x, tile.y)) tiles.add(key(tile.x, tile.y));
      }
      return tiles;
    }
    if (active.side === "player" && (active.attacked || active.attackCount > 0)) return tiles;
    for (let y = battle.center.y - BATTLE_RADIUS; y <= battle.center.y + BATTLE_RADIUS; y += 1) {
      for (let x = battle.center.x - BATTLE_RADIUS; x <= battle.center.x + BATTLE_RADIUS; x += 1) {
        if (!this.combatantAt(battle, x, y) && this.canMove(battle, active, { x, y })) tiles.add(key(x, y));
      }
    }
    return tiles;
  }

  battleGuardTiles(battle) {
    const active = this.activeCombatant(battle);
    const tiles = new Set();
    if (!active || battle.winner || battle.phase === "preparation") return tiles;
    for (const tileKey of this.reachableMovementTiles(battle, active)) {
      const [x, y] = tileKey.split(",").map(Number);
      if (this.isInWarriorBlockZone(battle, active, { x, y })) tiles.add(tileKey);
    }
    return tiles;
  }

  battleAttackTiles(battle) {
    const active = this.activeCombatant(battle);
    const tiles = new Set();
    if (!active || battle.winner || battle.phase === "preparation") return tiles;
    for (const target of this.living(battle, active.side === "player" ? "enemy" : "player")) {
      if (this.canAttack(active, target)) tiles.add(key(target.x, target.y));
    }
    return tiles;
  }

  activeCombatant(battle) {
    return battle.combatants.find((combatant) => combatant.id === battle.activeId && combatant.hp > 0 && !combatant.inactive);
  }

  handlePreparationTap(battle, tile) {
    const target = this.combatantAt(battle, tile.x, tile.y);
    if (target?.side === "player") {
      battle.activeId = target.id;
      return { type: "prep-selected", combatant: target };
    }

    const active = this.activeCombatant(battle);
    if (!active || active.side !== "player" || target || !this.inDeployment(battle, tile) || this.tileBlocked(battle, tile.x, tile.y)) {
      return this.clearSelection(battle);
    }
    this.moveUnit(battle, active, tile, 260);
    return { type: "prep-moved", combatant: active };
  }

  clearSelection(battle) {
    battle.activeId = null;
    return { type: "battle-unselected" };
  }

  renameUnit(battle, unitId, nextName) {
    const unit = battle?.combatants.find((combatant) => combatant.id === unitId);
    if (!unit || unit.side !== "player") return "";
    return this.names.rename(unit, nextName);
  }

  createSide(armies, side, center) {
    const units = this.assignFormation(armies.flatMap((army) => Unit.fromArmy(army, side)), side, center);
    this.names.assign(units);
    return units;
  }

  assignFormation(units, side, center) {
    const rows = side === "player"
      ? [center.x - 1, center.x - 2, center.x - 3]
      : [center.x + 1, center.x + 2, center.x + 3];
    const ys = [center.y - 1, center.y, center.y + 1, center.y - 2, center.y + 2, center.y - 3, center.y + 3];
    const front = units.filter((unit) => unit.class === "warrior").sort((a, b) => b.hp - a.hp);
    const back = units.filter((unit) => unit.range > 1).sort((a, b) => b.range - a.range);
    const middle = units.filter((unit) => unit.class !== "warrior" && unit.range <= 1);
    const ordered = [...front, ...middle, ...back];
    const occupied = new Set();
    this.placeFormationGroup(front, rows, ys, [0, 1, 2], occupied);
    this.placeFormationGroup(middle, rows, ys, [1, 0, 2], occupied);
    this.placeFormationGroup(back, rows, ys, [2, 1, 0], occupied);
    this.assertUniqueTiles(units);
    return ordered;
  }

  placeFormationGroup(units, rows, ys, preferredRows, occupied) {
    for (const unit of units) {
      const tile = this.firstOpenFormationTile(rows, ys, preferredRows, occupied);
      unit.x = tile.x;
      unit.y = tile.y;
      occupied.add(key(tile.x, tile.y));
    }
  }

  firstOpenFormationTile(rows, ys, preferredRows, occupied) {
    for (const y of ys) {
      for (const row of preferredRows) {
        const tile = { x: rows[row], y };
        if (!occupied.has(key(tile.x, tile.y))) return tile;
      }
    }
    return { x: rows[rows.length - 1], y: ys[ys.length - 1] };
  }

  assertUniqueTiles(units) {
    const occupied = new Set();
    for (const unit of units) {
      const tileKey = key(unit.x, unit.y);
      if (occupied.has(tileKey)) throw new Error(`Duplicate battle unit tile: ${tileKey}`);
      occupied.add(tileKey);
    }
  }

  performAttack(battle, active, target, type) {
    active.animation = {
      duration: 280,
      fromX: active.x,
      fromY: active.y,
      kind: "strike",
      started: performance.now(),
      toX: target.x,
      toY: target.y,
    };
    active.attackUnavailable = false;
    active.attackCount += 1;
    this.damageTarget(battle, target, active.damage, 0, "hit");
    this.counterAttack(battle, active, target);

    for (const assist of this.assistWarriors(battle, active, target)) {
      assist.animation = {
        delay: ASSIST_DELAY,
        duration: 280,
        fromX: assist.x,
        fromY: assist.y,
        kind: "strike",
        started: performance.now(),
        toX: target.x,
        toY: target.y,
      };
      this.damageTarget(battle, target, Math.max(1, Math.round(assist.damage * 0.2)), ASSIST_DELAY, "assist");
    }

    if (!this.living(battle, "player").length || !this.living(battle, "enemy").length) {
      battle.winner = this.living(battle, "player").length ? "player" : "enemy";
      return { type: "battle-won", winner: battle.winner };
    }
    active.attacked = !this.canStillAttack(battle, active);
    if (active.attacked) this.selectNextPlayerOrEnemy(battle, active);
    return { type, target };
  }

  damageTarget(battle, target, amount, delay, style) {
    target.hp = Math.max(0, target.hp - amount);
    target.hit = { delay, duration: 360, started: performance.now() };
    this.pushDamageFloater(battle, target, amount, delay, style);
  }

  counterAttack(battle, attacker, defender) {
    if (defender.hp <= 0 || defender.inactive || !defender.counterPercent) return;
    if (attacker.range > 1 || attackDistance(attacker, defender) > 1) return;
    const amount = Math.max(1, Math.round(defender.damage * defender.counterPercent));
    defender.animation = {
      delay: COUNTER_DELAY,
      duration: 260,
      fromX: defender.x,
      fromY: defender.y,
      kind: "strike",
      started: performance.now(),
      toX: attacker.x,
      toY: attacker.y,
    };
    this.damageTarget(battle, attacker, amount, COUNTER_DELAY, "counter");
  }

  assistWarriors(battle, active, target) {
    return battle.combatants.filter((unit) => unit.hp > 0
      && !unit.inactive
      && unit.id !== active.id
      && unit.side === active.side
      && unit.class === "warrior"
      && distance(unit, target) === 1);
  }

  moveUnit(battle, unit, tile, duration) {
    if (unit.originX === undefined || unit.originY === undefined) {
      unit.originX = unit.x;
      unit.originY = unit.y;
    }
    const path = this.movementPath(battle, unit, tile);
    unit.animation = {
      duration,
      fromX: unit.x,
      fromY: unit.y,
      kind: "move",
      path,
      started: performance.now(),
      toX: tile.x,
      toY: tile.y,
    };
    unit.x = tile.x;
    unit.y = tile.y;
    unit.moved = true;
    unit.attackUnavailable = false;
  }

  retreatUnit(battle, unit, tile) {
    this.moveUnit(battle, unit, tile, 320);
    unit.inactive = true;
    unit.retreating = true;
    this.advanceTurn(battle);
  }

  endPlayerTurn(battle) {
    for (const unit of this.living(battle, "player")) {
      unit.moved = true;
      unit.attacked = true;
      unit.attackUnavailable = false;
    }
    for (const unit of this.living(battle, "enemy")) this.resetCombatantTurn(unit);
    const nextEnemy = this.living(battle, "enemy").find((unit) => this.hasActionRemaining(battle, unit));
    if (nextEnemy) {
      battle.activeId = nextEnemy.id;
      battle.turn += 1;
      return;
    }
    this.startPlayerTurn(battle);
  }

  startPlayerTurn(battle) {
    battle.round += 1;
    battle.turn += 1;
    for (const unit of this.living(battle, "player")) this.resetCombatantTurn(unit);
    battle.activeId = this.living(battle, "player")[0]?.id ?? battle.activeId;
  }

  advanceTurn(battle) {
    const alive = battle.combatants.filter((combatant) => combatant.hp > 0 && !combatant.inactive);
    if (!alive.length) return;
    const previous = this.activeCombatant(battle);
    let index = alive.findIndex((combatant) => combatant.id === battle.activeId);
    index = (index + 1) % alive.length;
    if (alive[index].side === "player" && previous?.side === "enemy") {
      this.startPlayerTurn(battle);
      return;
    }
    if (index === 0) battle.round += 1;
    battle.turn += 1;
    battle.activeId = alive[index].id;
    this.resetCombatantTurn(alive[index]);
  }

  resetCombatantTurn(combatant) {
    combatant.moved = false;
    combatant.attacked = false;
    combatant.attackCount = 0;
    combatant.attackUnavailable = false;
    combatant.originX = combatant.x;
    combatant.originY = combatant.y;
  }

  canMove(battle, combatant, tile) {
    return this.reachableMovementTiles(battle, combatant).has(key(tile.x, tile.y));
  }

  canAttack(combatant, target) {
    return target
      && this.availableAttacks(combatant) > 0
      && attackDistance(combatant, target) <= combatant.range;
  }

  hasActionRemaining(battle, combatant) {
    if (combatant.hp <= 0 || combatant.inactive) return false;
    return this.canStillMove(battle, combatant) || this.canStillAttack(battle, combatant);
  }

  canStillMove(battle, combatant) {
    if (combatant.attacked || combatant.attackCount > 0) return false;
    return this.reachableMovementTiles(battle, combatant).size > 0;
  }

  canStillAttack(battle, combatant) {
    if (this.availableAttacks(combatant) <= 0) return false;
    return this.living(battle, combatant.side === "player" ? "enemy" : "player")
      .some((target) => this.canAttack(combatant, target));
  }

  availableAttacks(combatant) {
    return Math.max(0, this.maxAttacks(combatant) - (combatant.attackCount ?? 0));
  }

  maxAttacks(combatant) {
    if (combatant.traits.includes("volley")) return combatant.moved ? 1 : 2;
    if (combatant.traits.includes("rootedShot")) return combatant.moved ? 0 : 1;
    return 1;
  }

  spendCombatant(battle, combatant) {
    combatant.moved = true;
    combatant.attacked = true;
    this.selectNextPlayerOrEnemy(battle, combatant);
  }

  selectNextPlayerOrEnemy(battle, from) {
    const nextPlayer = this.living(battle, "player")
      .filter((unit) => this.hasActionRemaining(battle, unit))
      .sort((a, b) => distance(from, a) - distance(from, b))[0];
    if (nextPlayer) {
      battle.activeId = nextPlayer.id;
      return;
    }
    const nextEnemy = this.living(battle, "enemy").find((unit) => this.hasActionRemaining(battle, unit));
    if (nextEnemy) battle.activeId = nextEnemy.id;
  }

  playerCanAct(battle) {
    const active = this.activeCombatant(battle);
    return battle.phase === "battle" && (!active || active.side === "player");
  }

  canRetreat(unit) {
    return unit.hp / unit.maxHp > RETREAT_HEALTH;
  }

  isRetreatTile(battle, tile) {
    return Math.abs(tile.x - battle.center.x) === BATTLE_RADIUS
      || Math.abs(tile.y - battle.center.y) === BATTLE_RADIUS;
  }

  nearestAttackTarget(battle, active) {
    return this.living(battle, active.side === "enemy" ? "player" : "enemy")
      .filter((target) => this.canAttack(active, target))
      .sort((a, b) => a.hp - b.hp || distance(active, a) - distance(active, b))[0];
  }

  nearestTarget(battle, active, side) {
    return this.living(battle, side).sort((a, b) => distance(active, a) - distance(active, b) || a.hp - b.hp)[0];
  }

  bestMoveToward(battle, active, target) {
    let best;
    for (let y = battle.center.y - BATTLE_RADIUS; y <= battle.center.y + BATTLE_RADIUS; y += 1) {
      for (let x = battle.center.x - BATTLE_RADIUS; x <= battle.center.x + BATTLE_RADIUS; x += 1) {
        const tile = { x, y };
        if (this.combatantAt(battle, x, y) || !this.canMove(battle, active, tile)) continue;
        const score = distance(tile, target) + (this.isRetreatTile(battle, tile) ? 0.2 : 0);
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    return best;
  }

  combatantAt(battle, x, y) {
    return battle.combatants.find((combatant) => combatant.hp > 0 && !combatant.inactive && combatant.x === x && combatant.y === y);
  }

  inBattleBounds(battle, tile) {
    return Math.abs(tile.x - battle.center.x) <= BATTLE_RADIUS
      && Math.abs(tile.y - battle.center.y) <= BATTLE_RADIUS;
  }

  reachableMovementTiles(battle, combatant) {
    const reached = new Set();
    if (combatant.attacked || combatant.attackCount > 0) return reached;
    const origin = { x: combatant.originX ?? combatant.x, y: combatant.originY ?? combatant.y };
    if ((origin.x !== combatant.x || origin.y !== combatant.y)
      && this.inBattleBounds(battle, origin)
      && !this.tileBlocked(battle, origin.x, origin.y)
      && !this.combatantAt(battle, origin.x, origin.y)) {
      reached.add(key(origin.x, origin.y));
    }
    const visited = new Set([key(origin.x, origin.y)]);
    const queue = [{ ...origin, distance: 0 }];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current.distance >= combatant.move) continue;
      if (current.distance > 0 && this.isInWarriorBlockZone(battle, combatant, current)) continue;
      for (const next of movementNeighbors(current)) {
        const nextKey = key(next.x, next.y);
        if (visited.has(nextKey) || !this.inBattleBounds(battle, next)) continue;
        const occupant = this.combatantAt(battle, next.x, next.y);
        if (this.tileBlocked(battle, next.x, next.y) || (occupant && occupant.id !== combatant.id)) continue;
        visited.add(nextKey);
        reached.add(nextKey);
        queue.push({ ...next, distance: current.distance + 1 });
      }
    }
    return reached;
  }

  movementPath(battle, combatant, destination) {
    const start = { x: combatant.x, y: combatant.y };
    const targetKey = key(destination.x, destination.y);
    if (key(start.x, start.y) === targetKey) return [start];

    const visited = new Set([key(start.x, start.y)]);
    const previous = new Map();
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const next of movementNeighbors(current, destination)) {
        const nextKey = key(next.x, next.y);
        if (visited.has(nextKey) || !this.inBattleBounds(battle, next)) continue;
        const occupant = this.combatantAt(battle, next.x, next.y);
        if (this.tileBlocked(battle, next.x, next.y) || (occupant && occupant.id !== combatant.id)) continue;
        visited.add(nextKey);
        previous.set(nextKey, key(current.x, current.y));
        if (nextKey === targetKey) return buildPath(previous, start, destination);
        queue.push(next);
      }
    }
    return [start, { x: destination.x, y: destination.y }];
  }

  isInWarriorBlockZone(battle, combatant, tile) {
    return this.living(battle, combatant.side === "player" ? "enemy" : "player")
      .some((unit) => unit.blocksMovement && distance(unit, tile) === 1);
  }

  tileBlocked(battle, x, y) {
    return Boolean(battle.tileset?.at(x, y)?.blocksMovement);
  }

  deploymentTiles(battle) {
    const tiles = [];
    for (let y = battle.center.y - 3; y <= battle.center.y + 3; y += 1) {
      for (let x = battle.center.x - 4; x <= battle.center.x - 1; x += 1) {
        if (this.inBattleBounds(battle, { x, y })) tiles.push({ x, y });
      }
    }
    return tiles;
  }

  inDeployment(battle, tile) {
    return tile.x >= battle.center.x - 4
      && tile.x <= battle.center.x - 1
      && tile.y >= battle.center.y - 3
      && tile.y <= battle.center.y + 3
      && this.inBattleBounds(battle, tile);
  }

  living(battle, side) {
    return battle.combatants.filter((combatant) => combatant.side === side && combatant.hp > 0 && !combatant.inactive);
  }

  pushDamageFloater(battle, target, amount, delay, style) {
    battle.floaters.push({
      amount,
      delay,
      duration: style === "assist" ? 720 : 860,
      id: `${target.id}-${battle.turn}-${performance.now()}-${delay}`,
      seed: Math.random() * Math.PI * 2,
      started: performance.now(),
      style,
      x: target.x,
      y: target.y,
    });
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

function attackDistance(a, b) {
  if (a.range <= 1) return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  return distance(a, b);
}

function neighbors(tile) {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

function movementNeighbors(tile, destination = null) {
  const candidates = [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
    { x: tile.x + 1, y: tile.y + 1 },
    { x: tile.x + 1, y: tile.y - 1 },
    { x: tile.x - 1, y: tile.y + 1 },
    { x: tile.x - 1, y: tile.y - 1 },
  ];
  return destination
    ? candidates.sort((a, b) => distance(a, destination) - distance(b, destination))
    : candidates;
}
