export const UNIT_TYPES = {
  "units.banner": unit("Captain", "support", 12, 4, 3, 1, 82, ["command"]),
  "units.swordsman": unit("Swordsman", "warrior", 9, 4, 2, 1, 62, ["assist", "block", "counter1"]),
  "units.shield": unit("Shield", "warrior", 11, 3, 2, 1, 64, ["assist", "block", "guard", "counter2"]),
  "units.archer": unit("Archer", "ranger", 7, 3, 2, 3, 56, ["volley"]),
  "units.crossbow": unit("Crossbow", "ranger", 7, 4, 2, 3, 60, ["rootedShot"]),
  "units.wizard": unit("Wizard", "mage", 7, 4, 2, 3, 68, ["ranged", "magic"]),
  "units.purpleKnight": unit("Dusk Knight", "warrior", 10, 5, 2, 1, 72, ["assist", "block", "counter3"]),
  "units.purpleMage": unit("Dusk Mage", "mage", 7, 5, 2, 3, 74, ["ranged", "magic"]),
  "units.orcBrute": unit("Orc Brute", "warrior", 10, 4, 2, 1, 66, ["assist", "block"]),
  "units.orcAxe": unit("Orc Axe", "warrior", 9, 5, 2, 1, 68, ["assist", "block", "counter2"]),
  "units.goblinKnife": unit("Goblin", "scout", 6, 3, 3, 1, 46, ["swift"]),
  "units.skeletonSword": unit("Skeleton", "warrior", 8, 3, 2, 1, 52, ["assist", "block", "undead"]),
  "units.trollClub": unit("Troll", "warrior", 14, 5, 2, 1, 82, ["assist", "block", "heavy", "counter3"]),
  "units.skeletonArcher": unit("Bone Archer", "ranger", 7, 3, 1, 3, 54, ["skirmishShot"]),
  "units.zombie": unit("Zombie", "warrior", 11, 3, 1, 1, 50, ["assist", "block", "undead"]),
  "units.ghost": unit("Ghost", "spirit", 7, 4, 3, 1, 58, ["swift", "ethereal"]),
  "units.vampire": unit("Vampire", "warrior", 10, 5, 3, 1, 76, ["assist", "block", "swift"]),
  "units.demonImp": unit("Imp", "scout", 7, 4, 3, 1, 58, ["swift"]),
  "units.minotaur": unit("Minotaur", "warrior", 15, 6, 2, 1, 90, ["assist", "block", "heavy", "counter4"]),
  "units.darkMage": unit("Hex Mage", "mage", 8, 5, 2, 3, 78, ["ranged", "magic"]),
  "units.wolfRaider": unit("Wolf Raider", "scout", 9, 4, 4, 1, 70, ["swift"]),
};

export const PLAYER_POOL = [
  "units.banner",
  "units.swordsman",
  "units.shield",
  "units.archer",
  "units.crossbow",
  "units.wizard",
  "units.purpleKnight",
  "units.purpleMage",
  "units.vampire",
  "units.ghost",
  "units.wolfRaider",
];

export const ENEMY_POOL = [
  "units.orcBrute",
  "units.orcAxe",
  "units.goblinKnife",
  "units.skeletonSword",
  "units.trollClub",
  "units.skeletonArcher",
  "units.zombie",
  "units.ghost",
  "units.vampire",
  "units.demonImp",
  "units.minotaur",
  "units.darkMage",
  "units.wolfRaider",
];

export const NEW_MIXED_POOL = [
  "units.skeletonArcher",
  "units.zombie",
  "units.ghost",
  "units.vampire",
  "units.demonImp",
  "units.minotaur",
  "units.darkMage",
  "units.wolfRaider",
];

export function unitType(sprite) {
  return UNIT_TYPES[sprite] ?? unit("Unit", "support", 8, 3, 2, 1, 40, []);
}

export function counterPercent(traits) {
  if (traits.includes("counter4")) return 0.5;
  if (traits.includes("counter3")) return 0.4;
  if (traits.includes("counter2")) return 0.3;
  if (traits.includes("counter1")) return 0.2;
  return 0;
}

export function strongestUnitSprite(formation) {
  return [...formation].sort((a, b) => unitType(b).power - unitType(a).power)[0];
}

export function randomFormation(random, pool, count = 4) {
  const options = [...pool];
  const formation = [];
  while (formation.length < count && options.length) {
    const index = Math.floor(random() * options.length);
    formation.push(options.splice(index, 1)[0]);
  }
  return formation;
}

export function ensureFormationIncludes(random, formation, requiredPool) {
  if (formation.some((sprite) => requiredPool.includes(sprite))) return formation;
  const options = requiredPool.filter((sprite) => !formation.includes(sprite));
  if (!options.length) return formation;
  const replacementIndex = Math.floor(random() * formation.length);
  const required = options[Math.floor(random() * options.length)];
  return formation.map((sprite, index) => (index === replacementIndex ? required : sprite));
}

function unit(label, className, hp, damage, move, range, power, traits) {
  return { className, counterPercent: counterPercent(traits), damage, hp, label, move, power, range, traits };
}
