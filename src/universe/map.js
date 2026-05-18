const size = 90;

export function createScene(seed = 7) {
  const random = mulberry32(seed);
  const tiles = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sprite = chooseTerrain({ x, y, random });
      tiles.push({ x, y, sprite, items: [] });
    }
  }

  addSettlement(tiles, 43, 42);
  addSettlement(tiles, 21, 28);
  addSettlement(tiles, 66, 24);
  addOutpost(tiles, 18, 61);
  addOutpost(tiles, 72, 62);

  scatter(tiles, random, "trees.pine", 1200, (x, y) => y < 36 || x < 20 || ridge(x, y));
  scatter(tiles, random, "trees.slimPine", 500, (x, y) => y < 45 || ridge(x, y));
  scatter(tiles, random, "trees.oak", 1100, (x, y) => x < 48 || y < 58 || x > 70);
  scatter(tiles, random, "trees.round", 900, (x, y) => x > 32 && y < 76);
  scatter(tiles, random, "trees.pink", 140, (x, y) => x > 50 && y > 17 && y < 68);
  scatter(tiles, random, "props.stoneCluster", 210, (x, y) => ridge(x, y) || y > 70);
  scatter(tiles, random, "props.crystal", 34, (x, y) => x > 58 && y > 55);
  scatter(tiles, random, "props.wagon", 18, nearAnySettlement);

  addTownDecor(tiles, 43, 42);
  addTownDecor(tiles, 21, 28);
  addTownDecor(tiles, 66, 24);

  place(tiles, 40, 39, "units.swordsman");
  place(tiles, 42, 39, "units.shield");
  place(tiles, 44, 39, "units.archer");
  place(tiles, 46, 40, "units.banner");
  place(tiles, 49, 46, "units.horse");
  place(tiles, 37, 48, "units.crossbow");
  place(tiles, 24, 25, "units.wizard");
  place(tiles, 71, 60, "units.purpleKnight");
  place(tiles, 73, 60, "units.purpleMage");
  place(tiles, 64, 21, "units.gryphon");
  place(tiles, 17, 62, "units.dwarf");

  return { tiles, size };
}

function chooseTerrain({ x, y, random }) {
  const river = Math.abs(y - (58 + Math.sin(x / 7) * 6)) < 2.2 && x < 62;
  const shore = Math.abs(y - (58 + Math.sin(x / 7) * 6)) < 3.2 && x < 64;
  const village = nearAnySettlement(x, y);
  if (river) return "tiles.water";
  if (shore) return "tiles.shore";
  if (ridge(x, y)) return random() > 0.42 ? pick(random, stoneTiles) : "tiles.snow";
  if (village) return random() > 0.36 ? pick(random, plazaTiles) : pick(random, roadTiles);
  if (x > 8 && x < 31 && y > 47 && y < 68) return random() > 0.45 ? "tiles.farm" : "tiles.wheat";
  if (random() > 0.78) return pick(random, flowerTiles);
  if (random() > 0.72) return pick(random, dirtTiles);
  return pick(random, grassTiles);
}

function addSettlement(tiles, x, y) {
  place(tiles, x, y, "buildings.castle");
  place(tiles, x - 5, y + 2, "buildings.market");
  place(tiles, x + 5, y + 2, "buildings.church");
  place(tiles, x + 1, y - 4, "buildings.tower");
  place(tiles, x + 7, y - 5, "buildings.hall");
  place(tiles, x - 6, y - 4, "buildings.cottage");
  place(tiles, x + 8, y + 5, "buildings.manor");
}

function addOutpost(tiles, x, y) {
  place(tiles, x, y, "buildings.arena");
  place(tiles, x + 4, y - 3, "buildings.tower");
  place(tiles, x - 3, y + 2, "buildings.wall");
}

function addTownDecor(tiles, x, y) {
  place(tiles, x - 2, y + 3, "props.lamp", 0, 0);
  place(tiles, x + 2, y + 3, "props.lamp", 0, 0);
  place(tiles, x - 1, y + 5, "props.blueBanner", 0, 0);
  place(tiles, x + 3, y + 5, "props.blueBanner", 0, 0);
  place(tiles, x - 6, y + 5, "props.wagon", 0, 0);
}

function scatter(tiles, random, sprite, count, predicate) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 30) {
    attempts += 1;
    const x = Math.floor(random() * size);
    const y = Math.floor(random() * size);
    if (!predicate(x, y) || (sprite.startsWith("trees.") && nearAnySettlement(x, y))) continue;
    const tile = at(tiles, x, y);
    if (!tile || tile.items.length) continue;
    place(tiles, x, y, sprite);
    placed += 1;
  }
}

function place(tiles, x, y, sprite, dx = 0, dy = 0, depth = 0) {
  const tile = at(tiles, x, y);
  if (!tile) return;
  tile.items.push({ sprite, dx, dy, depth, phase: ((x * 977 + y * 1319) % 5000) });
}

function at(tiles, x, y) {
  if (x < 0 || y < 0 || x >= size || y >= size) return undefined;
  return tiles[y * size + x];
}

function ridge(x, y) {
  return y < 10 || x > 74 || (x > 60 && y < 22) || (x < 10 && y > 68);
}

function nearAnySettlement(x, y) {
  return near(x, y, 43, 42, 8) || near(x, y, 21, 28, 7) || near(x, y, 66, 24, 7);
}

function near(x, y, cx, cy, radius) {
  return Math.abs(x - cx) + Math.abs(y - cy) <= radius;
}

function pick(random, choices) {
  return choices[Math.floor(random() * choices.length)];
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
