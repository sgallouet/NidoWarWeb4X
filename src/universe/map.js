import { Tile } from "./tile/Tile.js?v=battle-test-43";
import { Tileset } from "./tileset/Tileset.js?v=battle-test-43";
import { ENEMY_POOL, NEW_MIXED_POOL, PLAYER_POOL, ensureFormationIncludes, randomFormation, strongestUnitSprite } from "./unit/unitCatalog.js?v=battle-test-43";

const size = 30;

export function createScene(seed = 7) {
  const random = mulberry32(seed);
  const tiles = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sprite = chooseTerrain({ x, y, random });
      tiles.push(new Tile({
        x,
        y,
        sprite,
        items: [],
      }));
    }
  }

  addForest(tiles, random);
  addHamlet(tiles);
  addBattleTrees(tiles, random);

  const playerFormation = ensureFormationIncludes(random, randomFormation(random, PLAYER_POOL, 4), NEW_MIXED_POOL);
  const enemyFormation = ensureFormationIncludes(random, randomFormation(random, ENEMY_POOL, 4), NEW_MIXED_POOL);
  const armies = [
    {
      id: "dawn-hero",
      faction: "player",
      x: 12,
      y: 13,
      move: 6,
      sprite: strongestUnitSprite(playerFormation),
      formation: playerFormation,
    },
    {
      id: "grave-host",
      faction: "enemy",
      x: 16,
      y: 15,
      move: 2,
      sprite: strongestUnitSprite(enemyFormation),
      formation: enemyFormation,
    },
  ];

  return { armies, battle: null, selectedArmyId: null, size, tiles, tileset: new Tileset(size, tiles) };
}

function chooseTerrain({ x, y, random }) {
  if (isRoad(x, y)) return pick(random, roadTiles);
  if (isHamlet(x, y)) return random() > 0.45 ? pick(random, plazaTiles) : pick(random, roadTiles);
  if (x > 20 && y > 20) return random() > 0.55 ? "tiles.farm" : "tiles.wheat";
  if (x < 3 || y < 3 || x > 26 || y > 26) return random() > 0.4 ? "tiles.stonePlants" : "tiles.stone";
  if (random() > 0.78) return pick(random, flowerTiles);
  if (random() > 0.68) return pick(random, dirtTiles);
  return pick(random, grassTiles);
}

function addForest(tiles, random) {
  const trees = ["trees.pine", "trees.slimPine", "trees.oak", "trees.round"];
  for (const tile of tiles) {
    if (isRoad(tile.x, tile.y) || isHamlet(tile.x, tile.y) || isBattleClearing(tile.x, tile.y)) continue;
    const edge = tile.x < 6 || tile.y < 6 || tile.x > 23 || tile.y > 23;
    const dense = edge || random() > 0.34;
    if (!dense) continue;
    place(tiles, tile.x, tile.y, pick(random, trees));
  }
}

function addHamlet(tiles) {
  place(tiles, 9, 12, "buildings.cottage");
  place(tiles, 11, 10, "buildings.market");
  place(tiles, 19, 12, "buildings.cottage");
  place(tiles, 21, 18, "buildings.manor");
  place(tiles, 10, 19, "buildings.tower");
  place(tiles, 12, 17, "props.wagon");
  place(tiles, 18, 17, "props.lamp");
  place(tiles, 6, 22, "props.stoneCluster");
  place(tiles, 24, 8, "props.crystal");
}

function addBattleTrees(tiles, random) {
  const trees = ["trees.pine", "trees.slimPine", "trees.oak", "trees.round"];
  for (const [x, y] of [[13, 12], [15, 13], [18, 14], [14, 16], [17, 17], [12, 18]]) {
    place(tiles, x, y, pick(random, trees));
  }
}

function place(tiles, x, y, sprite, dx = 0, dy = 0, depth = 0) {
  const tile = at(tiles, x, y);
  if (!tile) return;
  tile.addItem({
    blocksMovement: !isTree(sprite),
    sprite,
    dx,
    dy,
    depth,
    phase: ((x * 977 + y * 1319) % 5000),
  });
}

function at(tiles, x, y) {
  if (x < 0 || y < 0 || x >= size || y >= size) return undefined;
  return tiles[y * size + x];
}

function isRoad(x, y) {
  return y === 15 && x >= 6 && x <= 23;
}

function isHamlet(x, y) {
  return x >= 8 && x <= 22 && y >= 10 && y <= 19;
}

function isBattleClearing(x, y) {
  return x >= 8 && x <= 20 && y >= 9 && y <= 19;
}

function pick(random, choices) {
  return choices[Math.floor(random() * choices.length)];
}

function isTree(sprite) {
  return sprite.startsWith("trees.");
}

const grassTiles = ["tiles.grass", "tiles.grassClean"];
const flowerTiles = ["tiles.flowerGrass", "tiles.flowerGrassBright", "tiles.flowerGrassDense"];
const dirtTiles = ["tiles.dirt", "tiles.dirtRocks"];
const roadTiles = ["tiles.oldRoad", "tiles.oldRoadMoss"];
const stoneTiles = ["tiles.stone", "tiles.stonePlants"];
const plazaTiles = ["tiles.plaza", "tiles.plazaMoss", "tiles.oldRoad", "tiles.oldRoadMoss"];

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
