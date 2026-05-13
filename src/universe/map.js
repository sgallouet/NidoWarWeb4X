import { buildings, props, terrain, units } from "./atlases.js";

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

  scatter(tiles, random, props.pine, 420, (x, y) => y < 32 || x < 17 || ridge(x, y));
  scatter(tiles, random, props.slimPine, 160, (x, y) => y < 38 || ridge(x, y));
  scatter(tiles, random, props.oak, 360, (x, y) => x < 42 || y < 48);
  scatter(tiles, random, props.roundTree, 260, (x, y) => x > 39 && y < 67);
  scatter(tiles, random, props.pinkTree, 55, (x, y) => x > 54 && y > 20 && y < 60);
  scatter(tiles, random, props.stoneCluster, 210, (x, y) => ridge(x, y) || y > 70);
  scatter(tiles, random, props.crystal, 34, (x, y) => x > 58 && y > 55);
  scatter(tiles, random, props.wagon, 18, nearAnySettlement);

  addTownDecor(tiles, 43, 42);
  addTownDecor(tiles, 21, 28);
  addTownDecor(tiles, 66, 24);

  placeUnit(tiles, 40, 39, units.swordsman);
  placeUnit(tiles, 42, 39, units.shield);
  placeUnit(tiles, 44, 39, units.archer);
  placeUnit(tiles, 46, 40, units.banner);
  placeUnit(tiles, 49, 46, units.horse);
  placeUnit(tiles, 37, 48, units.crossbow);
  placeUnit(tiles, 24, 25, units.wizard);
  placeUnit(tiles, 71, 60, units.purpleKnight);
  placeUnit(tiles, 73, 60, units.purpleMage);
  placeUnit(tiles, 64, 21, units.gryphon);
  placeUnit(tiles, 17, 62, units.dwarf);

  return { tiles, size };
}

function chooseTerrain({ x, y, random }) {
  const river = Math.abs(y - (58 + Math.sin(x / 7) * 6)) < 2.2 && x < 62;
  const shore = Math.abs(y - (58 + Math.sin(x / 7) * 6)) < 3.2 && x < 64;
  const village = nearAnySettlement(x, y);
  if (river) return terrain.water;
  if (shore) return terrain.shore;
  if (ridge(x, y)) return random() > 0.48 ? terrain.stone : terrain.snow;
  if (village) return random() > 0.42 ? terrain.plaza : terrain.oldRoad;
  if (x > 8 && x < 31 && y > 47 && y < 68) return random() > 0.5 ? terrain.farm : terrain.wheat;
  if (random() > 0.82) return terrain.flowerGrass;
  if (random() > 0.74) return terrain.dirt;
  return terrain.grass;
}

function addSettlement(tiles, x, y) {
  place(tiles, x, y, buildings.castle, 0, 4, 34);
  place(tiles, x - 4, y + 1, buildings.market, -4, 4, 30);
  place(tiles, x + 4, y + 1, buildings.church, 8, 4, 30);
  place(tiles, x + 2, y - 4, buildings.tower, 4, 0, 32);
  place(tiles, x + 7, y - 5, buildings.hall, 12, 8, 35);
  place(tiles, x - 6, y - 4, buildings.cottage, 0, 0, 28);
  place(tiles, x + 8, y + 5, buildings.manor, 0, 0, 31);
}

function addOutpost(tiles, x, y) {
  place(tiles, x, y, buildings.arena, 0, 8, 32);
  place(tiles, x + 3, y - 3, buildings.tower, 4, 0, 30);
  place(tiles, x - 3, y + 2, buildings.wall, 0, 0, 26);
}

function addTownDecor(tiles, x, y) {
  place(tiles, x - 2, y + 3, props.lamp, 0, 0, 24);
  place(tiles, x + 2, y + 3, props.lamp, 0, 0, 24);
  place(tiles, x - 1, y + 5, props.blueBanner, 0, 0, 24);
  place(tiles, x + 3, y + 5, props.blueBanner, 0, 0, 24);
  place(tiles, x - 6, y + 5, props.wagon, 0, 0, 22);
}

function scatter(tiles, random, sprite, count, predicate) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 30) {
    attempts += 1;
    const x = Math.floor(random() * size);
    const y = Math.floor(random() * size);
    if (!predicate(x, y)) continue;
    const tile = at(tiles, x, y);
    if (!tile || tile.items.length) continue;
    place(tiles, x, y, sprite, random() * 22 - 11, random() * 8);
    placed += 1;
  }
}

function placeUnit(tiles, x, y, sprite) {
  place(tiles, x, y, sprite, 0, -5, 22);
}

function place(tiles, x, y, sprite, dx = 0, dy = 0, sort = 18, bob = 0) {
  const tile = at(tiles, x, y);
  if (!tile) return;
  tile.items.push({ sprite, dx, dy, sort, bob });
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

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
