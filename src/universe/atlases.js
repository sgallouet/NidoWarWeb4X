export const ATLASES = {
  terrain: "./ressources/atlases/terrain.png",
  props: "./ressources/atlases/props.png",
  buildings: "./ressources/atlases/buildings.png",
  units: "./ressources/atlases/units-kingdom.png",
  mixedUnits: "./ressources/atlases/units-mixed.png",
};

export const terrain = {
  grass: sprite("terrain", 49, 33, 156, 118),
  flowerGrass: sprite("terrain", 446, 32, 157, 120),
  dirt: sprite("terrain", 1036, 31, 159, 120),
  oldRoad: sprite("terrain", 251, 165, 154, 117),
  stone: sprite("terrain", 644, 164, 154, 118),
  plaza: sprite("terrain", 45, 295, 159, 121),
  water: sprite("terrain", 40, 421, 155, 133),
  shore: sprite("terrain", 637, 421, 142, 133),
  farm: sprite("terrain", 38, 696, 146, 112),
  wheat: sprite("terrain", 582, 691, 136, 118),
  snow: sprite("terrain", 791, 821, 134, 114),
};

export const props = {
  pine: sprite("props", 25, 18, 80, 135, 0.82, true),
  slimPine: sprite("props", 313, 26, 43, 127, 0.82, true),
  oak: sprite("props", 467, 25, 86, 123, 0.82, true),
  roundTree: sprite("props", 572, 22, 93, 127, 0.82, true),
  pinkTree: sprite("props", 794, 19, 101, 131, 0.78, true),
  stump: sprite("props", 16, 298, 78, 71, 0.8, true),
  stoneCluster: sprite("props", 598, 292, 69, 70, 0.75, true),
  fence: sprite("props", 16, 401, 77, 79, 0.72, false),
  blueBanner: sprite("props", 172, 514, 55, 108, 0.72, true),
  lamp: sprite("props", 1082, 397, 47, 106, 0.68, true),
  wagon: sprite("props", 189, 658, 75, 75, 0.72, true),
  fountain: sprite("props", 976, 938, 101, 121, 0.72, true),
  crystal: sprite("props", 1127, 771, 88, 124, 0.72, true),
};

export const buildings = {
  cottage: sprite("buildings", 56, 59, 97, 115, 0.92, true),
  manor: sprite("buildings", 802, 28, 131, 151, 0.9, true),
  market: sprite("buildings", 29, 234, 166, 130, 0.9, true),
  tower: sprite("buildings", 418, 232, 92, 130, 0.88, true),
  church: sprite("buildings", 936, 221, 108, 139, 0.9, true),
  wall: sprite("buildings", 417, 586, 127, 100, 0.82, true),
  bridge: sprite("buildings", 643, 720, 115, 86, 0.86, true),
  castle: sprite("buildings", 26, 826, 289, 226, 0.86, true),
  hall: sprite("buildings", 363, 819, 231, 225, 0.86, true),
  arena: sprite("buildings", 1231, 864, 172, 163, 0.9, true),
};

export const units = {
  swordsman: sprite("units", 30, 56, 93, 118, 0.72, true),
  shield: sprite("units", 155, 58, 78, 117, 0.72, true),
  archer: sprite("units", 1124, 71, 77, 104, 0.7, true),
  crossbow: sprite("units", 40, 244, 83, 100, 0.72, true),
  horse: sprite("units", 402, 214, 102, 145, 0.7, true),
  wizard: sprite("units", 41, 411, 88, 115, 0.7, true),
  priest: sprite("units", 421, 414, 72, 113, 0.7, true),
  banner: sprite("units", 1125, 373, 72, 161, 0.76, true),
  dwarf: sprite("units", 32, 608, 83, 86, 0.72, true),
  gryphon: sprite("units", 27, 742, 111, 124, 0.68, true),
  purpleKnight: sprite("units", 868, 753, 74, 119, 0.72, true),
  purpleMage: sprite("units", 1211, 925, 104, 114, 0.7, true),
};

function sprite(atlas, x, y, w, h, scale = 1, shadow = false) {
  return { atlas, x, y, w, h, scale, shadow };
}
