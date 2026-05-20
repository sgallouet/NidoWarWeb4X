import { CameraDirector } from "./CameraDirector.js?v=battle-test-43";
import { ART_VERSION, DEFAULT_ZOOM } from "./config.js?v=battle-test-43";
import { HudController } from "./HudController.js?v=battle-test-43";
import { InputController } from "./InputController.js?v=battle-test-43";
import { loadArtCatalog } from "../engine/artCatalog.js";
import { createCamera } from "../engine/camera.js";
import { applyTileCenters, createIso, screenToTile, worldToScreen } from "../engine/iso.js?v=tile-pick-1";
import { createRenderer } from "../engine/renderer.js?v=perf-cache-1";
import { activeCombatant, battleAttackTiles, battleGuardTiles, battleMoveTiles, handleBattleTap, isEnemyTurn, renameUnit, resolveEnemyTurn, selectUnit, waitBattleTurn } from "../gameplay/battleActions.js?v=move-path-1";
import { attackableArmyTiles, engageTiles, handleTileTap, reachableTiles } from "../gameplay/worldActions.js?v=battle-test-43";
import { createScene } from "../universe/map.js?v=battle-test-43";
import { PerformanceMonitor } from "../ui/PerformanceMonitor.js?v=battle-test-43";

export class GameApp {
  constructor() {
    this.canvas = document.querySelector("#world");
    this.loading = document.querySelector("#loading");
    this.seed = 11;
    this.enemyTurnTimer = 0;
    this.renderer = null;
    this.performanceMonitor = new PerformanceMonitor({
      canvas: document.querySelector("#perfGraph"),
      valueNode: document.querySelector("#frameMs"),
    });
    this.camera = createCamera(this.canvas, () => this.renderer?.requestRender());
    this.camera.zoom = DEFAULT_ZOOM;
    this.hud = new HudController({
      battleHud: document.querySelector("#battleHud"),
      battleReadout: document.querySelector("#battleReadout"),
      healthStrip: document.querySelector("#healthStrip"),
      waitTurn: document.querySelector("#waitTurn"),
      worldEnemyGroup: document.querySelector("#worldEnemyGroup"),
      worldGroup: document.querySelector("#worldGroup"),
    });
  }

  async start() {
    try {
      await this.boot();
    } catch (error) {
      console.error(error);
      this.loading.textContent = "Art error";
    }
  }

  async boot() {
    this.artCatalog = await loadArtCatalog(`./ressources/art/assets.json?v=${ART_VERSION}`);
    this.iso = createIso(this.artCatalog);
    this.scene = createScene(this.seed);
    applyTileCenters(this.scene, this.iso);
    this.refreshTacticalSets();

    this.performanceMonitor.resize();
    this.renderer = createRenderer(this.canvas, this.camera, this.scene, this.artCatalog, {
      performanceMonitor: this.performanceMonitor,
    });
    window.__nidoApp = this;
    this.cameraDirector = new CameraDirector({
      camera: this.camera,
      canvas: this.canvas,
      iso: this.iso,
      renderer: this.renderer,
    });
    this.cameraDirector.focusOn(this.tileAt(14, 14), DEFAULT_ZOOM);
    this.renderer.start();
    window.addEventListener("resize", () => this.performanceMonitor.resize());

    document.body.classList.add("ready");
    new InputController(this.canvas).bind((screenX, screenY) => this.handleTap(screenX, screenY));
    this.hud.bind({
      onRename: (unitId) => this.handleRename(unitId),
      onSelect: (unitId) => this.handleSelectUnit(unitId),
      onWait: () => this.handleWait(),
    });
    this.bindControls();
    this.hud.update(this.scene);
  }

  bindControls() {
    const controls = document.querySelector("#worldControls");
    const toggle = document.querySelector("#controlsToggle");
    toggle.addEventListener("click", () => {
      const folded = controls.classList.toggle("is-folded");
      toggle.setAttribute("aria-expanded", String(!folded));
      toggle.setAttribute("aria-label", folded ? "Open controls" : "Close controls");
    });
    document.querySelector("#reroll").addEventListener("click", () => {
      this.seed += 1;
      this.resetScene(createScene(this.seed));
      this.cameraDirector.focusOn(this.tileAt(14, 14), DEFAULT_ZOOM);
      this.hud.update(this.scene);
      this.renderer.rebuildStatic();
    });
  }

  handleTap(screenX, screenY) {
    const tile = this.scene.battle
      ? screenToTile(screenX, screenY, this.canvas, this.camera, this.iso, this.scene, this.artCatalog)
      : this.selectedWorldTile(screenX, screenY);
    const result = this.scene.battle ? handleBattleTap(this.scene, tile) : handleTileTap(this.scene, tile);
    this.refreshAfterAction();
    if (result.type === "battle-started") {
      this.cameraDirector.animateTo(this.tileAt(result.center.x, result.center.y), this.cameraDirector.battleZoom(), 520);
    }
    this.scheduleEnemyTurns();
  }

  handleWait() {
    waitBattleTurn(this.scene);
    this.refreshAfterAction();
    this.scheduleEnemyTurns();
  }

  handleRename(unitId) {
    const unit = this.scene.battle?.combatants.find((combatant) => combatant.id === unitId);
    if (!unit) return;
    const nextName = window.prompt("Rename unit", unit.name);
    if (nextName === null) return;
    renameUnit(this.scene.battle, unitId, nextName);
    this.refreshAfterAction();
  }

  handleSelectUnit(unitId) {
    if (!this.scene.battle) return;
    selectUnit(this.scene.battle, unitId);
    this.refreshAfterAction();
  }

  refreshAfterAction() {
    this.refreshTacticalSets();
    this.hud.update(this.scene);
    this.renderer.requestRender();
  }

  resetScene(next) {
    this.scene.tiles.splice(0, this.scene.tiles.length, ...next.tiles);
    this.scene.armies.splice(0, this.scene.armies.length, ...next.armies);
    this.scene.selectedArmyId = next.selectedArmyId;
    this.scene.inspectedArmyId = next.inspectedArmyId;
    this.scene.battle = next.battle;
    this.scene.tileset = next.tileset;
    clearTimeout(this.enemyTurnTimer);
    this.enemyTurnTimer = 0;
    applyTileCenters(this.scene, this.iso);
    this.refreshTacticalSets();
  }

  selectedWorldTile(screenX, screenY) {
    const hit = this.armyHit(screenX, screenY);
    if (hit) return { x: hit.x, y: hit.y };
    return screenToTile(screenX, screenY, this.canvas, this.camera, this.iso, this.scene, this.artCatalog);
  }

  armyHit(screenX, screenY) {
    let best;
    for (const army of this.scene.armies) {
      const asset = this.artCatalog.assets[army.sprite];
      const draw = asset.draw;
      const image = asset.image;
      const center = this.tileAt(army.x, army.y).center;
      const screen = worldToScreen(center, this.canvas, this.camera);
      const height = draw.height * this.camera.zoom;
      const width = (draw.width ?? Math.round(image.width * (draw.height / image.height))) * this.camera.zoom;
      const left = screen.x - width * (draw.anchorX ?? 0.5) - 8;
      const right = left + width + 16;
      const top = screen.y - height * (draw.anchorY ?? 1) - 8;
      const bottom = screen.y + 12;
      if (screenX < left || screenX > right || screenY < top || screenY > bottom) continue;
      const score = Math.hypot(screenX - screen.x, screenY - screen.y);
      if (!best || score < best.score) best = { ...army, score };
    }
    return best;
  }

  refreshTacticalSets() {
    this.scene.reachable = reachableTiles(this.scene);
    this.scene.engageTiles = engageTiles(this.scene);
    this.scene.worldAttackTiles = attackableArmyTiles(this.scene);
    const playerControl = this.scene.battle && activeCombatant(this.scene.battle)?.side === "player";
    this.scene.battleMoves = playerControl ? battleMoveTiles(this.scene.battle) : new Set();
    this.scene.battleGuards = playerControl ? battleGuardTiles(this.scene.battle) : new Set();
    this.scene.battleAttacks = playerControl ? battleAttackTiles(this.scene.battle) : new Set();
    this.scene.renderKeys = {
      actors: actorRenderKey(this.scene),
      battleAttacks: setRenderKey(this.scene.battleAttacks),
      battleGuards: setRenderKey(this.scene.battleGuards),
      battleMoves: setRenderKey(this.scene.battleMoves),
      engageTiles: setRenderKey(this.scene.engageTiles),
      reachable: setRenderKey(this.scene.reachable),
      worldAttackTiles: setRenderKey(this.scene.worldAttackTiles),
    };
  }

  scheduleEnemyTurns() {
    clearTimeout(this.enemyTurnTimer);
    if (!isEnemyTurn(this.scene)) return;
    this.enemyTurnTimer = setTimeout(() => {
      resolveEnemyTurn(this.scene);
      this.refreshAfterAction();
      this.scheduleEnemyTurns();
    }, 520);
  }

  tileAt(x, y) {
    return this.scene.tileset?.at(x, y) ?? this.scene.tiles[y * this.scene.size + x];
  }
}

function setRenderKey(set) {
  return [...(set ?? new Set())].sort().join(";");
}

function actorRenderKey(scene) {
  const battle = scene.battle;
  const actors = battle
    ? battle.combatants.filter((combatant) => (battle.phase !== "preparation" || combatant.side === "player")
      && combatant.hp > 0
      && !combatant.inactive)
    : scene.armies;
  return actors
    .map((actor) => `${actor.id ?? actor.armyId ?? actor.sprite}:${actor.x},${actor.y}:${actor.hp ?? ""}:${actor.inactive ? 1 : 0}`)
    .sort()
    .join(";");
}
