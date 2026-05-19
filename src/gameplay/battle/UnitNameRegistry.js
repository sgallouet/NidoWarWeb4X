const STORAGE_KEY = "nidowar.unitNames.v1";

const DEFAULT_NAMES = {
  banner: ["Avel", "Ryn", "Maelle", "Corvin", "Liora"],
  swordsman: ["Garran", "Tovin", "Bran", "Kael", "Merek"],
  shield: ["Borin", "Hadric", "Sella", "Orven", "Dain"],
  archer: ["Neris", "Elian", "Fenn", "Sylva", "Rook"],
  orcBrute: ["Grukk", "Mogran", "Vorga", "Brakka", "Thrum"],
  orcAxe: ["Korga", "Drog", "Urzan", "Makka", "Roth"],
  goblinKnife: ["Nib", "Skiv", "Pik", "Zat", "Kree"],
  skeletonSword: ["Voss", "Nihl", "Ossian", "Karth", "Rattle"],
  skeletonArcher: ["Marrow", "Fletch", "Rib", "Hollow", "Nock"],
  zombie: ["Groll", "Murk", "Slough", "Grain", "Mottle"],
  ghost: ["Veil", "Whisper", "Hush", "Pale", "Mourn"],
  vampire: ["Noct", "Veyra", "Sable", "Carmine", "Mora"],
  demonImp: ["Cinder", "Pip", "Spite", "Kindle", "Vex"],
  minotaur: ["Bramm", "Tor", "Gorun", "Mallet", "Karn"],
  darkMage: ["Hex", "Umbra", "Nyx", "Vesper", "Mal"],
  wolfRaider: ["Fang", "Rusk", "Howl", "Brisk", "Varg"],
  default: ["Rune", "Ash", "Vale", "Moss", "Flint"],
};

export class UnitNameRegistry {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.memory = this.load();
  }

  assign(units) {
    const used = new Set();
    for (const unit of units) {
      unit.name = this.nextName(unit.sprite, used);
      used.add(`${this.typeKey(unit.sprite)}:${unit.name}`);
    }
  }

  rename(unit, nextName) {
    const name = nextName.trim();
    if (!name) return unit.name;
    unit.name = name.slice(0, 18);
    const type = this.typeKey(unit.sprite);
    const current = this.memory[type] ?? [];
    this.memory[type] = [unit.name, ...current.filter((known) => known !== unit.name)].slice(0, 12);
    this.save();
    return unit.name;
  }

  nextName(sprite, used) {
    const type = this.typeKey(sprite);
    const names = [...(this.memory[type] ?? []), ...(DEFAULT_NAMES[type] ?? DEFAULT_NAMES.default)];
    return names.find((name) => !used.has(`${type}:${name}`)) ?? `${names[0]} ${used.size + 1}`;
  }

  typeKey(sprite) {
    return sprite.replace("units.", "");
  }

  load() {
    try {
      return JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  }

  save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch {
      // Persistence is a convenience; gameplay should still work without it.
    }
  }
}
