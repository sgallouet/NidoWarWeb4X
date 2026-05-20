import { createIso, projectIso, tileCenter } from "../iso.js?v=battle-test-43";
import { TILE_STATE } from "./tileStates.js?v=battle-test-43";

const BATTLE_RADIUS = 4;
const CACHE_PADDING = 620;
const MOVE_PATH_SPEED = 0.48;
const CACHE_BUILD_BUDGET_MS = 1.2;

export class CanvasRenderer {
  constructor(canvas, camera, scene, art, { performanceMonitor = null } = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.scene = scene;
    this.art = art;
    this.context = canvas.getContext("2d", { alpha: true });
    this.iso = createIso(art);
    this.groundCache = null;
    this.groundCacheKey = "";
    this.groundBuildPending = false;
    this.propCache = null;
    this.propCacheKey = "";
    this.propBuildPending = false;
    this.backdropCache = null;
    this.backdropCacheKey = "";
    this.propDrawables = [];
    this.tintedTileCache = new Map();
    this.performanceMonitor = performanceMonitor;
    this.frameRequested = false;
    this.animatedSpriteTimer = null;
    this.lastStats = { total: 0, ground: 0, props: 0, units: 0, floaters: 0, cachedGround: false };
    this.pixelRatio = 1;
    window.addEventListener("resize", () => this.requestRender());
  }

  start() {
    this.rebuildStatic();
    this.requestRender();
  }

  rebuildStatic() {
    this.propDrawables = this.createPropDrawables();
    this.invalidateGround();
    this.invalidateProps();
    this.requestRender();
  }

  invalidateGround() {
    this.groundCacheKey = "";
    this.scheduleGroundBuild();
  }

  scheduleGroundBuild() {
    if (this.groundBuildPending) return;
    this.groundBuildPending = true;
    const key = this.groundStateKey();
    const battle = this.scene.battle;
    const cache = this.createEmptyGroundCache();
    const context = cache.canvas.getContext("2d", { alpha: true });
    const maxDiagonal = (this.scene.size - 1) * 2;
    let diagonal = 0;
    const buildChunk = () => {
      const chunkStart = performance.now();
      while (diagonal <= maxDiagonal && performance.now() - chunkStart < CACHE_BUILD_BUDGET_MS) {
        this.drawGroundDiagonal(context, battle, null, diagonal);
        diagonal += 1;
      }
      if (diagonal <= maxDiagonal) {
        setTimeout(buildChunk, 0);
        return;
      }
      this.groundBuildPending = false;
      if (key === this.groundStateKey()) {
        this.groundCache = cache;
        this.groundCacheKey = key;
        this.requestRender();
        return;
      }
      this.scheduleGroundBuild();
    };
    setTimeout(() => {
      context.translate(-cache.x, -cache.y);
      buildChunk();
    }, 0);
  }

  requestRender = () => {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(() => this.draw());
  };

  draw() {
    const frameStart = performance.now();
    this.frameRequested = false;
    this.resize();
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBackdrop(context, this.canvas.clientWidth, this.canvas.clientHeight);

    const translateX = this.canvas.clientWidth / 2 + this.camera.x;
    const translateY = 130 + this.camera.y;
    const bounds = this.visibleBounds(translateX, translateY);
    const battle = this.scene.battle;

    context.save();
    context.translate(translateX, translateY);
    context.scale(this.camera.zoom, this.camera.zoom);

    const groundStart = performance.now();
    const cachedGround = this.drawGround(bounds, battle);
    const propsStart = performance.now();
    this.drawVisibleProps(bounds, battle);
    const unitsStart = performance.now();
    this.drawUnits(battle);
    const floatersStart = performance.now();
    if (battle) this.drawDamageFloaters(battle);
    const frameEnd = performance.now();
    context.restore();
    this.lastStats = {
      cachedGround,
      floaters: frameEnd - floatersStart,
      ground: propsStart - groundStart,
      props: unitsStart - propsStart,
      total: frameEnd - frameStart,
      units: floatersStart - unitsStart,
    };
    this.performanceMonitor?.record(this.lastStats.total);
  }

  resize() {
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.floor(this.canvas.clientWidth * this.pixelRatio);
    const height = Math.floor(this.canvas.clientHeight * this.pixelRatio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  drawGround(bounds, battle) {
    const key = this.groundStateKey();
    if (this.groundCache && this.groundCacheKey === key) {
      this.drawCacheLayer(this.groundCache, bounds);
      return true;
    }
    this.scheduleGroundBuild();
    if (this.groundCache) {
      this.drawCacheLayer(this.groundCache, bounds);
      return true;
    }
    this.drawGroundTiles(this.context, battle, bounds);
    return false;
  }

  createEmptyGroundCache() {
    const max = projectIso(this.scene.size - 1, this.scene.size - 1, this.iso);
    const canvas = document.createElement("canvas");
    const cache = {
      canvas,
      x: Math.floor(-this.scene.size * this.iso.tileWidth / 2 - CACHE_PADDING),
      y: Math.floor(-CACHE_PADDING),
      width: Math.ceil(this.scene.size * this.iso.tileWidth + CACHE_PADDING * 2),
      height: Math.ceil(max.y + CACHE_PADDING * 2),
    };
    cache.canvas.width = cache.width;
    cache.canvas.height = cache.height;
    return cache;
  }

  drawCacheLayer(cache, bounds) {
    const sx = clamp(bounds.left - cache.x, 0, cache.width);
    const sy = clamp(bounds.top - cache.y, 0, cache.height);
    const ex = clamp(bounds.right - cache.x, 0, cache.width);
    const ey = clamp(bounds.bottom - cache.y, 0, cache.height);
    const sw = Math.max(1, ex - sx);
    const sh = Math.max(1, ey - sy);
    this.context.drawImage(cache.canvas, sx, sy, sw, sh, cache.x + sx, cache.y + sy, sw, sh);
  }

  drawBackdrop(context, width, height) {
    const cacheKey = `${Math.ceil(width)}x${Math.ceil(height)}`;
    if (!this.backdropCache || this.backdropCacheKey !== cacheKey) {
      this.backdropCache = createBackdrop(width, height);
      this.backdropCacheKey = cacheKey;
    }
    context.drawImage(this.backdropCache, 0, 0, width, height);
  }

  drawGroundTiles(target, battle, bounds) {
    for (let diagonal = 0; diagonal <= (this.scene.size - 1) * 2; diagonal += 1) {
      this.drawGroundDiagonal(target, battle, bounds, diagonal);
    }
  }

  drawGroundDiagonal(target, battle, bounds, diagonal) {
    const minX = Math.max(0, diagonal - this.scene.size + 1);
    const maxX = Math.min(this.scene.size - 1, diagonal);
    for (let x = minX; x <= maxX; x += 1) {
      const y = diagonal - x;
      const tile = this.tileAt(x, y);
      if (!tile || (bounds && this.tileOutsideBounds(tile.x, tile.y, bounds))) continue;
      const state = this.tileState(tile, battle);
      if (battle && !this.inBattleBounds(battle, tile)) {
        this.drawTintedTile(target, tile, "battleFog");
      } else if (state) {
        this.drawTintedTile(target, tile, state);
      } else {
        this.drawTile(target, tile, tile.sprite);
      }
    }
  }

  tileState(tile, battle) {
    const id = key(tile.x, tile.y);
    if (battle) {
      if (!this.inBattleBounds(battle, tile)) return null;
      if ((this.scene.battleAttacks ?? new Set()).has(id)) return "attack";
      if ((this.scene.battleGuards ?? new Set()).has(id)) return "engage";
      if ((this.scene.battleMoves ?? new Set()).has(id)) return "move";
      return "inactive";
    }
    if ((this.scene.worldAttackTiles ?? new Set()).has(id)) return "attack";
    if ((this.scene.reachable ?? new Set()).has(id)) {
      return (this.scene.engageTiles ?? new Set()).has(id) ? "engage" : "move";
    }
    return null;
  }

  drawTintedTile(target, tile, state) {
    if (!tile) return;
    const asset = this.art.assets[tile.sprite];
    const draw = asset.draw;
    const origin = tile.origin ?? projectIso(tile.x, tile.y, this.iso);
    const image = this.tintedTileSprite(asset, state);
    target.drawImage(
      image,
      origin.x - draw.width * draw.anchorX,
      origin.y - draw.height * draw.anchorY,
      draw.width,
      draw.height,
    );
  }

  tintedTileSprite(asset, state) {
    const cacheKey = `${asset.file}:${state}`;
    const cached = this.tintedTileCache.get(cacheKey);
    if (cached) return cached;

    const style = TILE_STATE[state] ?? TILE_STATE.inactive;
    const draw = asset.draw;
    const width = Math.ceil(draw.width);
    const height = Math.ceil(draw.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.filter = style.filter;
    context.drawImage(asset.image, 0, 0, width, height);
    context.filter = "none";
    if (style.tint) {
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = style.tint;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
    }
    this.tintedTileCache.set(cacheKey, canvas);
    return canvas;
  }

  drawVisibleProps(bounds, battle) {
    const key = this.propStateKey(battle);
    if (this.propCache && this.propCacheKey === key) {
      this.drawCacheLayer(this.propCache, bounds);
      return;
    }
    this.schedulePropBuild();
    if (this.propCache) {
      this.drawCacheLayer(this.propCache, bounds);
      return;
    }
    const actors = this.coverActors(battle);
    for (const drawable of this.propDrawables) {
      if (this.drawableOutsideBounds(drawable, bounds)) continue;
      this.drawPropDrawable(this.context, drawable, battle, actors);
    }
  }

  invalidateProps() {
    this.propCacheKey = "";
    this.schedulePropBuild();
  }

  schedulePropBuild() {
    if (this.propBuildPending) return;
    this.propBuildPending = true;
    const battle = this.scene.battle;
    const key = this.propStateKey(battle);
    const actors = this.coverActors(battle);
    const cache = this.createEmptyGroundCache();
    const context = cache.canvas.getContext("2d", { alpha: true });
    let index = 0;
    const buildChunk = () => {
      const chunkStart = performance.now();
      while (index < this.propDrawables.length && performance.now() - chunkStart < CACHE_BUILD_BUDGET_MS) {
        this.drawPropDrawable(context, this.propDrawables[index], battle, actors);
        index += 1;
      }
      if (index < this.propDrawables.length) {
        setTimeout(buildChunk, 0);
        return;
      }
      this.propBuildPending = false;
      if (key === this.propStateKey(this.scene.battle)) {
        this.propCache = cache;
        this.propCacheKey = key;
        this.requestRender();
        return;
      }
      this.schedulePropBuild();
    };
    setTimeout(() => {
      context.translate(-cache.x, -cache.y);
      buildChunk();
    }, 0);
  }

  drawPropDrawable(target, drawable, battle, actors) {
    const presentation = this.propPresentation(drawable, actors);
    this.drawSprite(
      target,
      drawable.position.x + drawable.item.dx + presentation.offset.x,
      drawable.position.y + drawable.item.dy + presentation.offset.y,
      drawable.asset,
      1,
      presentation.alpha,
      this.propFilter(drawable.tile, battle),
    );
  }

  createPropDrawables() {
    const drawables = [];
    for (let y = 0; y < this.scene.size; y += 1) {
      for (let x = 0; x < this.scene.size; x += 1) {
        const tile = this.tileAt(x, y);
        if (!tile?.items.length) continue;
        for (const item of tile.items) {
          const asset = this.art.assets[item.sprite];
          const position = this.projectItem(tile, asset);
          drawables.push({
            asset,
            item,
            position,
            tile,
            y: position.y + item.dy + (asset.draw.depth ?? 0) + (item.depth ?? 0),
          });
        }
      }
    }
    return drawables.sort((a, b) => a.y - b.y);
  }

  propPresentation(drawable, actors) {
    const tree = isTree(drawable.item);
    const occupied = tree && actors.some((actor) => actor.x === drawable.tile.x && actor.y === drawable.tile.y);
    const near = occupied || actors.some((actor) => this.actorBehindProp(drawable, actor));
    return {
      alpha: near ? 0.46 : 1,
      offset: tree && occupied ? { x: 22, y: -18 } : { x: 0, y: 0 },
    };
  }

  propFilter(tile, battle) {
    return battle && !this.inBattleBounds(battle, tile) ? "grayscale(1) brightness(0.76)" : "none";
  }

  coverActors(battle) {
    if (battle) {
      return battle.combatants.filter((combatant) => this.combatantVisible(battle, combatant)
        && combatant.hp > 0
        && !combatant.inactive);
    }
    return this.scene.armies;
  }

  actorBehindProp(drawable, actor) {
    const footprint = drawable.asset.placement?.footprint ?? { width: 1, height: 1 };
    const actorCenter = this.centerFor(actor.x, actor.y);
    const closeToFootprint = this.footprintTiles(drawable.tile.x, drawable.tile.y, footprint)
      .some((covered) => Math.abs(actor.x - covered.x) + Math.abs(actor.y - covered.y) <= 1);
    return closeToFootprint && actorCenter.y <= drawable.position.y + 18;
  }

  footprintTiles(x, y, footprint) {
    const tiles = [];
    for (let dy = 0; dy < footprint.height; dy += 1) {
      for (let dx = 0; dx < footprint.width; dx += 1) tiles.push({ x: x + dx, y: y + dy });
    }
    return tiles;
  }

  drawTile(target, tile, sprite, filter = "none") {
    const asset = this.art.assets[sprite];
    const draw = asset.draw;
    const origin = tile.origin ?? projectIso(tile.x, tile.y, this.iso);
    target.save();
    target.filter = filter;
    target.drawImage(
      asset.image,
      origin.x - draw.width * draw.anchorX,
      origin.y - draw.height * draw.anchorY,
      draw.width,
      draw.height,
    );
    target.restore();
  }

  drawUnits(battle) {
    const drawables = [];
    if (battle) {
      for (const combatant of battle.combatants) {
        if (this.combatantVisible(battle, combatant)) {
          this.queueUnit(drawables, combatant.sprite, combatant, combatant.id === battle.activeId, combatant.side, combatant, this.revealAlpha(battle, combatant));
        }
      }
    } else {
      for (const army of this.scene.armies) {
        const selected = army.id === this.scene.selectedArmyId || army.id === this.scene.inspectedArmyId;
        this.queueUnit(drawables, army.sprite, army, selected, army.faction);
      }
    }

    drawables.sort((a, b) => a.y - b.y).forEach((drawable) => {
      if (drawable.kind === "circle") {
        this.drawSelectionCircle(drawable.position, drawable.side);
        return;
      }
      const { position, asset, alpha, combatant } = drawable;
      this.drawSprite(this.context, position.x, position.y, asset, 1, alpha);
      if (combatant && !combatant.inactive) this.drawHealthBar(position.x, position.y, combatant);
    });
  }

  queueUnit(drawables, sprite, unit, selected, side, combatant = null, alpha = 1) {
    if (combatant?.hp <= 0) return;
    const asset = this.art.assets[sprite];
    const position = this.animatedCenter(unit);
    if (selected && !combatant?.inactive) {
      drawables.push({ kind: "circle", position, side, y: position.y + (asset.draw.depth ?? 0) - 0.2 });
    }
    drawables.push({ alpha, asset, combatant, position, y: position.y + (asset.draw.depth ?? 0) });
  }

  drawSprite(target, x, y, asset, scale = 1, alpha = 1, filter = "none") {
    const draw = asset.draw;
    const image = this.spriteImage(asset);
    const height = draw.height * scale;
    const width = (draw.width ?? Math.round(image.width * (draw.height / image.height))) * scale;
    target.save();
    target.globalAlpha = alpha;
    target.filter = filter;
    if (draw.shadow) this.drawShadow(target, x, y, width);
    if (draw.flipX) {
      target.translate(x, y);
      target.scale(-1, 1);
      target.drawImage(image, -width * (draw.anchorX ?? 0.5), -height * (draw.anchorY ?? 1), width, height);
      target.restore();
      return;
    }
    target.drawImage(image, x - width * (draw.anchorX ?? 0.5), y - height * (draw.anchorY ?? 1), width, height);
    target.restore();
  }

  spriteImage(asset) {
    if (!asset.frames?.length) return asset.image;
    const animation = asset.animations?.[asset.defaultAnimation] ?? asset.animations?.idle;
    const frameIds = animation?.frames?.length ? animation.frames : asset.frames.map((_, index) => index);
    const frameMs = animation?.frameMs ?? 160;
    const now = performance.now();
    const frameId = frameIds[Math.floor(now / frameMs) % frameIds.length] ?? 0;
    this.scheduleAnimatedSpriteRender(frameMs - (now % frameMs) + 1);
    return asset.frames[frameId]?.image ?? asset.image;
  }

  scheduleAnimatedSpriteRender(delay) {
    if (this.animatedSpriteTimer) return;
    this.animatedSpriteTimer = window.setTimeout(() => {
      this.animatedSpriteTimer = null;
      this.requestRender();
    }, Math.max(16, delay));
  }

  drawShadow(target, x, y, width) {
    target.save();
    target.globalAlpha *= 0.14;
    target.fillStyle = "#000";
    target.beginPath();
    target.ellipse(x, y - 7, width * 0.26, 9, 0, 0, Math.PI * 2);
    target.fill();
    target.restore();
  }

  projectItem(tile, asset) {
    const footprint = asset.placement?.footprint ?? { width: 1, height: 1 };
    return this.averageFootprintCenter(tile.x, tile.y, footprint.width, footprint.height);
  }

  averageFootprintCenter(x, y, width, height) {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (let dy = 0; dy < height; dy += 1) {
      for (let dx = 0; dx < width; dx += 1) {
        const center = this.tileAt(x + dx, y + dy)?.center ?? tileCenter(x + dx, y + dy, this.iso);
        sumX += center.x;
        sumY += center.y;
        count += 1;
      }
    }
    return { x: sumX / count, y: sumY / count };
  }

  animatedCenter(unit) {
    const animation = unit.animation;
    let position = this.centerFor(unit.x, unit.y);
    if (!animation) return this.shakenPosition(unit, position);

    const elapsed = performance.now() - animation.started - (animation.delay ?? 0);
    if (elapsed < 0) {
      this.requestRender();
      return this.shakenPosition(unit, position);
    }
    if (animation.kind === "move" && animation.path?.length > 1) {
      const metrics = this.pathMetrics(animation);
      if (elapsed >= metrics.duration) {
        delete unit.animation;
        return this.shakenPosition(unit, position);
      }
      this.requestRender();
      return this.shakenPosition(unit, this.pathPosition(metrics, elapsed));
    }

    const progress = Math.min(1, elapsed / animation.duration);
    if (progress >= 1) {
      delete unit.animation;
      return this.shakenPosition(unit, position);
    }

    const from = this.centerFor(animation.fromX, animation.fromY);
    const to = this.centerFor(animation.toX, animation.toY);
    if (animation.kind === "strike") {
      const out = progress < 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
      const amount = Math.sin(out * Math.PI / 2) * 0.42;
      position = { x: mix(from.x, to.x, amount), y: mix(from.y, to.y, amount) };
    } else {
      const eased = 1 - Math.pow(1 - progress, 3);
      position = { x: mix(from.x, to.x, eased), y: mix(from.y, to.y, eased) };
    }
    this.requestRender();
    return this.shakenPosition(unit, position);
  }

  pathMetrics(animation) {
    if (animation.pathMetrics) return animation.pathMetrics;
    const points = animation.path.map((tile) => this.centerFor(tile.x, tile.y));
    const segments = [];
    let length = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
      const segmentLength = pointDistance(points[index], points[index + 1]);
      segments.push(segmentLength);
      length += segmentLength;
    }
    animation.pathMetrics = {
      duration: Math.max(80, length / MOVE_PATH_SPEED),
      points,
      segments,
    };
    return animation.pathMetrics;
  }

  pathPosition(metrics, elapsed) {
    let remaining = elapsed * MOVE_PATH_SPEED;
    for (let index = 0; index < metrics.segments.length; index += 1) {
      const from = metrics.points[index];
      const to = metrics.points[index + 1];
      const length = metrics.segments[index];
      if (remaining <= length) {
        const amount = length > 0 ? remaining / length : 1;
        return { x: mix(from.x, to.x, amount), y: mix(from.y, to.y, amount) };
      }
      remaining -= length;
    }
    return metrics.points[metrics.points.length - 1];
  }

  shakenPosition(unit, position) {
    const hit = unit.hit;
    if (!hit) return position;
    const elapsed = performance.now() - hit.started - (hit.delay ?? 0);
    if (elapsed < 0) {
      this.requestRender();
      return position;
    }
    if (elapsed >= hit.duration) {
      delete unit.hit;
      return position;
    }
    const fade = 1 - elapsed / hit.duration;
    this.requestRender();
    return {
      x: position.x + Math.sin(elapsed * 0.12) * 4 * fade,
      y: position.y + Math.sin(elapsed * 0.18) * 1.5 * fade,
    };
  }

  drawSelectionCircle(position, side) {
    this.context.save();
    this.context.fillStyle = side === "enemy" ? "rgba(239, 74, 50, 0.24)" : "rgba(64, 185, 255, 0.28)";
    this.context.strokeStyle = side === "enemy" ? "rgba(255, 133, 84, 0.88)" : "rgba(178, 241, 255, 0.9)";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.ellipse(position.x, position.y - 4, 24, 9, 0, 0, Math.PI * 2);
    this.context.fill();
    this.context.stroke();
    this.context.restore();
  }

  drawHealthBar(x, y, combatant) {
    const width = 48;
    const top = y - this.art.assets[combatant.sprite].draw.height - 9;
    this.context.save();
    this.context.fillStyle = "rgba(11, 13, 15, 0.82)";
    this.context.fillRect(x - width / 2, top, width, 5);
    this.context.fillStyle = combatant.side === "player" ? "#60c8ff" : "#ff8b5f";
    this.context.fillRect(x - width / 2, top, width * combatant.hp / combatant.maxHp, 5);
    this.context.restore();
  }

  drawDamageFloaters(battle) {
    if (!battle.floaters?.length) return;
    const now = performance.now();
    battle.floaters = battle.floaters.filter((floater) => now - floater.started < floater.duration + (floater.delay ?? 0));
    for (const floater of battle.floaters) {
      const elapsed = now - floater.started - (floater.delay ?? 0);
      if (elapsed < 0) {
        this.requestRender();
        continue;
      }
      const progress = elapsed / floater.duration;
      const position = this.centerFor(floater.x, floater.y);
      const boom = Math.sin(Math.min(1, progress * 2.5) * Math.PI);
      this.context.save();
      this.context.globalAlpha = 1 - progress;
      this.context.translate(position.x + Math.cos(floater.seed) * 13 * boom, position.y - 74 - progress * 28 + Math.sin(floater.seed) * 7 * boom);
      this.context.scale(1 + boom * (floater.style === "assist" ? 0.28 : 0.55), 1 + boom * (floater.style === "assist" ? 0.28 : 0.55));
      this.context.fillStyle = floater.style === "assist" ? "#fff0a9" : "#ffd39a";
      this.context.strokeStyle = "rgba(60, 17, 11, 0.85)";
      this.context.lineWidth = 3;
      this.context.font = `${floater.style === "assist" ? 700 : 900} ${floater.style === "assist" ? 14 : 20}px Georgia, 'Times New Roman', serif`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.strokeText(`-${floater.amount}`, 0, 0);
      this.context.fillText(`-${floater.amount}`, 0, 0);
      this.context.restore();
    }
    if (battle.floaters.length) this.requestRender();
  }

  combatantVisible(battle, combatant) {
    return battle.phase !== "preparation" || combatant.side === "player";
  }

  revealAlpha(battle, combatant) {
    if (combatant.side !== "enemy" || battle.phase !== "battle" || !battle.revealStarted) return 1;
    const progress = Math.min(1, (performance.now() - battle.revealStarted) / 520);
    if (progress < 1) this.requestRender();
    return progress;
  }

  visibleBounds(translateX, translateY) {
    const margin = 300;
    return {
      bottom: (this.canvas.clientHeight - translateY) / this.camera.zoom + margin,
      left: -translateX / this.camera.zoom - margin,
      right: (this.canvas.clientWidth - translateX) / this.camera.zoom + margin,
      top: -translateY / this.camera.zoom - margin,
    };
  }

  tileOutsideBounds(x, y, bounds) {
    const center = this.centerFor(x, y);
    return center.x + this.iso.tileWidth / 2 < bounds.left
      || center.x - this.iso.tileWidth / 2 > bounds.right
      || center.y + this.iso.tileHeight / 2 < bounds.top
      || center.y - this.iso.tileHeight / 2 > bounds.bottom;
  }

  drawableOutsideBounds(drawable, bounds) {
    const draw = drawable.asset.draw;
    return drawable.position.x + draw.width / 2 < bounds.left
      || drawable.position.x - draw.width / 2 > bounds.right
      || drawable.position.y + 32 < bounds.top
      || drawable.position.y - draw.height > bounds.bottom;
  }

  centerFor(x, y) {
    return this.tileAt(x, y)?.center ?? tileCenter(x, y, this.iso);
  }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.scene.size || y >= this.scene.size) return undefined;
    return this.scene.tileset?.at(x, y) ?? this.scene.tiles[y * this.scene.size + x];
  }

  inBattleBounds(battle, tile) {
    return Math.abs(tile.x - battle.center.x) <= BATTLE_RADIUS
      && Math.abs(tile.y - battle.center.y) <= BATTLE_RADIUS;
  }
}

export function createCanvasRenderer(canvas, camera, scene, art, options) {
  return new CanvasRenderer(canvas, camera, scene, art, options);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function key(x, y) {
  return `${x},${y}`;
}

function setKey(set) {
  return [...(set ?? new Set())].sort().join(";");
}

CanvasRenderer.prototype.groundStateKey = function groundStateKey() {
  const battle = this.scene.battle;
  const keys = this.scene.renderKeys;
  if (battle) {
    return [
      "battle",
      battle.phase,
      battle.center.x,
      battle.center.y,
      keys?.battleMoves ?? setKey(this.scene.battleMoves),
      keys?.battleGuards ?? setKey(this.scene.battleGuards),
      keys?.battleAttacks ?? setKey(this.scene.battleAttacks),
    ].join("|");
  }
  return [
    "world",
    keys?.reachable ?? setKey(this.scene.reachable),
    keys?.engageTiles ?? setKey(this.scene.engageTiles),
    keys?.worldAttackTiles ?? setKey(this.scene.worldAttackTiles),
  ].join("|");
};

CanvasRenderer.prototype.propStateKey = function propStateKey(battle = this.scene.battle) {
  const actors = this.scene.renderKeys?.actors ?? this.coverActors(battle)
    .map((actor) => `${actor.id ?? actor.armyId ?? actor.sprite}:${actor.x},${actor.y}:${actor.hp ?? ""}:${actor.inactive ? 1 : 0}`)
    .sort()
    .join(";");
  if (battle) {
    return [
      "battle-props",
      battle.phase,
      battle.center.x,
      battle.center.y,
      actors,
    ].join("|");
  }
  return ["world-props", actors].join("|");
};

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createBackdrop(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const context = canvas.getContext("2d", { alpha: true });
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#263a42");
  gradient.addColorStop(1, "#121820");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  return canvas;
}

function isTree(item) {
  return item.sprite.startsWith("trees.");
}
