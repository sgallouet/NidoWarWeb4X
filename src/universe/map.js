import { Tile } from "./tile/Tile.js?v=world-map-1";
import { Tileset } from "./tileset/Tileset.js?v=battle-test-43";
import { NEW_MIXED_POOL, PLAYER_POOL, ensureFormationIncludes, randomFormation } from "./unit/unitCatalog.js?v=battle-test-43";

const size = 54;
const center = Math.floor(size / 2);
const playerGateTile = { x: center, y: center + 3 };

export function createScene(seed = 7) {
  const random = mulberry32(seed);
  const terrain = createTerrainPlan(seed);
  const tiles = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = terrain[y][x];
      tiles.push(new Tile({
        x,
        y,
        sprite: cell.sprite,
        terrainBlocksMovement: cell.blocksMovement,
        items: [],
      }));
    }
  }

  clearCenter(tiles);
  addHillsAndRocks(tiles, terrain, random);
  addForestTexture(tiles, terrain, random);
  addPlayerKeep(tiles);

  const playerFormation = ensureFormationIncludes(random, randomFormation(random, PLAYER_POOL, 4), NEW_MIXED_POOL);
  const armies = [
    {
      id: "dawn-hero",
      faction: "player",
      x: playerGateTile.x,
      y: playerGateTile.y,
      move: 7,
      movementLeft: 7,
      sprite: "units.wolfRaider",
      formation: playerFormation,
    },
  ];

  return {
    armies,
    battle: null,
    selectedArmyId: null,
    size,
    tiles,
    tileset: new Tileset(size, tiles),
    world: {
      day: 1,
      timeIndex: 0,
      timeLabel: "6am",
    },
  };
}

function createTerrainPlan(seed) {
  const terrain = [];
  const land = [];

  for (let y = 0; y < size; y += 1) {
    land[y] = [];
    for (let x = 0; x < size; x += 1) {
      land[y][x] = isPath(x, y) || (isIslandLand(x, y, seed) && !isLakeOrChannel(x, y, seed));
      if (isCentralClearing(x, y)) land[y][x] = true;
    }
  }

  for (let y = 0; y < size; y += 1) {
    terrain[y] = [];
    for (let x = 0; x < size; x += 1) {
      const water = !land[y][x];
      const cliff = !water && isCliff(x, y, seed);
      terrain[y][x] = {
        blocksMovement: water || cliff,
        sprite: chooseTerrainSprite(x, y, { cliff, land, seed, water }),
      };
    }
  }

  return terrain;
}

function chooseTerrainSprite(x, y, { cliff, land, seed, water }) {
  const n = noise(x, y, seed + 31);
  if (water) {
    const touchingLand = neighborCount(x, y, land);
    if (touchingLand >= 2 && n > 0.8) return "tiles.pond";
    if (touchingLand >= 2) return n > 0.36 ? "tiles.shore" : "tiles.islandWater";
    if (touchingLand > 0) return n > 0.7 ? "tiles.shore" : "tiles.islandWater";
    return broadWaterPatch(x, y, seed) > 0.72 ? "tiles.deepWater" : "tiles.water";
  }

  if (cliff) return n > 0.48 ? "tiles.grassBlock" : "tiles.groundBlock";
  if (isPath(x, y)) return n > 0.5 ? "tiles.oldRoadMoss" : "tiles.oldRoad";
  if (isCentralClearing(x, y)) return n > 0.5 ? "tiles.grassClean" : "tiles.flowerGrass";
  if (nearWater(x, y, land)) return n > 0.46 ? "tiles.island" : "tiles.islandGround";
  if (n > 0.86) return "tiles.flowerGrassBright";
  if (n > 0.68) return "tiles.flowerGrassDense";
  if (n > 0.54) return "tiles.dirtRocks";
  return n > 0.24 ? "tiles.grass" : "tiles.grassClean";
}

function addHillsAndRocks(tiles, terrain, random) {
  for (const tile of tiles) {
    if (!terrain[tile.y][tile.x].blocksMovement || isWater(tile.sprite) || isCentralClearing(tile.x, tile.y)) continue;
    if (random() > 0.58) {
      place(tiles, tile.x, tile.y, "props.rockStack", 0, -6, 10);
    } else if (random() > 0.44) {
      place(tiles, tile.x, tile.y, "props.stoneCluster", 0, -4, 5);
    }
  }
}

function addForestTexture(tiles, terrain, random) {
  const trees = ["trees.pine", "trees.slimPine", "trees.oak", "trees.round"];
  for (const tile of tiles) {
    const cell = terrain[tile.y][tile.x];
    if (cell.blocksMovement || isPath(tile.x, tile.y) || isCentralClearing(tile.x, tile.y)) continue;
    const wooded = noise(tile.x, tile.y, 103) > 0.74 || neighborBlockedCount(tile.x, tile.y, terrain) >= 3;
    if (!wooded || random() > 0.68) continue;
    place(tiles, tile.x, tile.y, pick(random, trees));
  }
}

function addPlayerKeep(tiles) {
  const keepX = center - 2;
  const keepY = center - 2;
  for (let y = keepY; y < keepY + 4; y += 1) {
    for (let x = keepX; x < keepX + 4; x += 1) {
      const tile = at(tiles, x, y);
      if (tile) tile.terrainBlocksMovement = true;
    }
  }
  place(tiles, keepX, keepY, "buildings.castle", 0, -6, 18);
  for (const [x, y] of [[center, center + 2], [playerGateTile.x, playerGateTile.y]]) {
    const tile = at(tiles, x, y);
    if (!tile) continue;
    tile.sprite = "tiles.oldRoadMoss";
    tile.terrainBlocksMovement = false;
  }
}

function clearCenter(tiles) {
  for (const tile of tiles) {
    if (!isCentralClearing(tile.x, tile.y)) continue;
    tile.sprite = tile.x === center || tile.y === center ? "tiles.islandGround" : "tiles.grassClean";
    tile.terrainBlocksMovement = false;
    tile.items.length = 0;
  }
}

function isIslandLand(x, y, seed) {
  const dx = (x - center) / 24;
  const dy = (y - center) / 21;
  const main = 1.08 - (dx * dx * 1.05 + dy * dy * 1.24);
  const west = lobe(x, y, 13, 25, 12, 9);
  const north = lobe(x, y, 29, 12, 10, 8);
  const east = lobe(x, y, 43, 28, 10, 11);
  const south = lobe(x, y, 28, 42, 13, 8);
  return main + west + north + east + south + (noise(x, y, seed) - 0.5) * 0.34 > 0.28;
}

function isLakeOrChannel(x, y, seed) {
  if (isPath(x, y) || isCentralClearing(x, y)) return false;
  const channelWest = Math.abs(x - (15 + Math.sin(y * 0.34) * 3)) < 1.35 && y > 6 && y < 48;
  const channelSouth = Math.abs(y - (38 + Math.sin(x * 0.29) * 2.4)) < 1.25 && x > 9 && x < 47;
  const lakeA = basin(x, y, 16, 16, 5.7, 4.3, seed);
  const lakeB = basin(x, y, 39, 17, 4.8, 5.1, seed + 3);
  const lakeC = basin(x, y, 20, 39, 5.4, 4.7, seed + 5);
  const lakeD = basin(x, y, 41, 36, 4.5, 3.9, seed + 7);
  return channelWest || channelSouth || lakeA || lakeB || lakeC || lakeD;
}

function isCliff(x, y, seed) {
  if (isPath(x, y) || isCentralClearing(x, y)) return false;
  const ring = Math.abs(Math.hypot(x - center, y - center) - 9.6) < 1.1 && noise(x, y, seed + 9) > 0.28;
  const ridgeA = Math.abs(y - (9 + x * 0.48 + Math.sin(x * 0.41) * 2.4)) < 1.05 && x > 7 && x < 38;
  const ridgeB = Math.abs(y - (51 - x * 0.56 + Math.sin(x * 0.3) * 2.1)) < 1.25 && x > 20 && x < 50;
  const ridgeC = Math.abs(x - (42 + Math.sin(y * 0.38) * 2.2)) < 1.1 && y > 10 && y < 35;
  const cluster = basin(x, y, 12, 32, 4.5, 5, seed + 11)
    || basin(x, y, 32, 13, 5.5, 4.4, seed + 13)
    || basin(x, y, 45, 25, 4.2, 5.2, seed + 17);
  return ring || ridgeA || ridgeB || ridgeC || cluster;
}

function isPath(x, y) {
  const vertical = x === center + Math.round(Math.sin(y * 0.31) * 1.7) && y >= 7 && y <= 47;
  const horizontal = y === center + Math.round(Math.sin(x * 0.25) * 1.4) && x >= 7 && x <= 47;
  const northLoop = (x + y) === 43 && x > 18 && x < 33 && y > 8 && y < 23;
  const southLoop = (x - y) === -12 && x > 25 && x < 43 && y > 32 && y < 46;
  return vertical || horizontal || northLoop || southLoop;
}

function isCentralClearing(x, y) {
  return Math.abs(x - center) <= 5 && Math.abs(y - center) <= 5;
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

function neighborCount(x, y, land) {
  return neighbors(x, y).filter((tile) => land[tile.y]?.[tile.x]).length;
}

function neighborBlockedCount(x, y, terrain) {
  return neighbors(x, y).filter((tile) => terrain[tile.y]?.[tile.x]?.blocksMovement).length;
}

function nearWater(x, y, land) {
  return neighbors(x, y).some((tile) => land[tile.y]?.[tile.x] === false);
}

function neighbors(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ].filter((tile) => tile.x >= 0 && tile.y >= 0 && tile.x < size && tile.y < size);
}

function basin(x, y, cx, cy, rx, ry, seed) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy + (noise(x, y, seed) - 0.5) * 0.22 < 1;
}

function lobe(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return Math.max(0, 0.58 - (dx * dx + dy * dy)) * 0.9;
}

function pick(random, choices) {
  return choices[Math.floor(random() * choices.length)];
}

function isTree(sprite) {
  return sprite.startsWith("trees.");
}

function isWater(sprite) {
  return sprite === "tiles.water" || sprite === "tiles.deepWater" || sprite === "tiles.shore" || sprite === "tiles.islandWater" || sprite === "tiles.pond";
}

function broadWaterPatch(x, y, seed) {
  return (noise(Math.floor(x / 5), Math.floor(y / 5), seed + 71) * 0.6)
    + (noise(Math.floor(x / 11), Math.floor(y / 11), seed + 83) * 0.4);
}

function noise(x, y, seed) {
  let value = Math.imul(x + seed * 374761393, 668265263) ^ Math.imul(y + seed * 1442695041, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
