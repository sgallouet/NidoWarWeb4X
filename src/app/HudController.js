import { activeCombatant } from "../gameplay/battleActions.js?v=battle-test-43";
import { unitType } from "../universe/unit/unitCatalog.js?v=battle-test-43";

export class HudController {
  constructor({ battleHud, battleReadout, healthStrip, waitTurn, worldEnemyGroup, worldGroup }) {
    this.battleHud = battleHud;
    this.battleReadout = battleReadout;
    this.healthStrip = healthStrip;
    this.waitTurn = waitTurn;
    this.worldEnemyGroup = worldEnemyGroup;
    this.worldGroup = worldGroup;
    this.traitTip = document.querySelector("#traitTip");
    this.onRename = null;
    this.onSelect = null;
  }

  bind({ onRename, onSelect, onWait }) {
    this.onRename = onRename;
    this.onSelect = onSelect;
    this.waitTurn.addEventListener("click", onWait);
    this.healthStrip.addEventListener("click", (event) => {
      if (this.handleTraitClick(event)) return;
      const button = event.target.closest("[data-rename-unit]");
      if (button) {
        this.onRename?.(button.dataset.renameUnit);
        return;
      }
      const token = event.target.closest("[data-select-unit]");
      if (token) this.onSelect?.(token.dataset.selectUnit);
    });
    this.worldGroup.addEventListener("click", (event) => this.handleTraitClick(event));
    this.worldEnemyGroup.addEventListener("click", (event) => this.handleTraitClick(event));
  }

  handleTraitClick(event) {
    const target = event.target.closest("[data-trait]");
    if (!target) return false;
    event.preventDefault();
    event.stopPropagation();
    this.showTraitInfo(target.dataset.trait);
    return true;
  }

  showTraitInfo(trait) {
    const info = TRAIT_INFO[trait] ?? { label: trait, text: "Trait details are not defined yet." };
    if (!this.traitTip) return;
    this.traitTip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = info.label;
    const text = document.createElement("span");
    text.textContent = info.text;
    this.traitTip.append(title, text);
    this.traitTip.hidden = false;
    clearTimeout(this.traitTipTimer);
    this.traitTipTimer = setTimeout(() => {
      this.traitTip.hidden = true;
    }, 3600);
  }

  update(scene) {
    if (!scene.battle) {
      this.battleHud.hidden = true;
      this.battleHud.classList.remove("is-prep");
      this.healthStrip.hidden = true;
      this.healthStrip.replaceChildren();
      this.renderWorldGroups(scene);
      return;
    }

    this.worldEnemyGroup.hidden = true;
    this.worldGroup.hidden = true;
    const battle = scene.battle;
    const active = activeCombatant(battle);
    this.battleHud.hidden = false;
    this.healthStrip.hidden = false;
    this.battleHud.classList.toggle("is-prep", battle.phase === "preparation");
    this.renderHealthStrip(battle);

    if (battle.phase === "preparation") {
      this.battleReadout.textContent = "Prepare";
      this.waitTurn.textContent = "Ready";
      this.waitTurn.title = "Ready";
      this.waitTurn.disabled = false;
      return;
    }

    if (battle.winner) {
      this.battleReadout.textContent = battle.winner === "player" ? "Victory" : "Defeat";
      this.waitTurn.disabled = true;
      return;
    }

    this.battleReadout.textContent = active ? `${active.name} ${active.class} ${active.hp}/${active.maxHp}` : "Select";
    this.waitTurn.textContent = "End";
    this.waitTurn.title = "End turn";
    this.waitTurn.disabled = false;
  }

  renderWorldGroups(scene) {
    this.renderWorldGroup({
      army: scene.armies.find((candidate) => candidate.id === scene.selectedArmyId && candidate.faction === "player"),
      hidden: false,
      node: this.worldGroup,
      title: "Group",
    });
    this.renderWorldGroup({
      army: scene.armies.find((candidate) => candidate.id === scene.inspectedArmyId && candidate.faction !== "player"),
      hidden: true,
      node: this.worldEnemyGroup,
      title: "Enemy",
    });
  }

  renderWorldGroup({ army, hidden, node, title }) {
    node.replaceChildren();
    node.hidden = !army;
    if (!army) return;

    const header = document.createElement("div");
    header.className = "world-group-title";
    header.textContent = title;
    node.append(header);

    for (const sprite of army.formation) {
      const type = unitType(sprite);
      const revealed = !hidden || sprite === army.sprite;
      node.append(this.renderWorldUnitToken(type, revealed));
    }
  }

  renderWorldUnitToken(type, revealed = true) {
    const token = document.createElement("div");
    token.className = `world-unit-token${revealed ? "" : " is-hidden"}`;

    const name = document.createElement("span");
    name.className = "world-unit-name";
    name.textContent = revealed ? type.label : "??";

    const meta = document.createElement("span");
    meta.className = "unit-meta";
    meta.textContent = revealed ? type.className : "??";

    const traits = document.createElement("div");
    traits.className = "trait-icons";
    if (revealed) {
      for (const trait of type.traits) traits.append(this.traitIcon(trait));
    }

    token.append(name, meta, traits);
    return token;
  }

  renderHealthStrip(battle) {
    const player = this.renderUnitPanel("player", battle.combatants.filter((combatant) => combatant.side === "player"), battle);
    const enemy = battle.phase === "preparation"
      ? document.createElement("div")
      : this.renderUnitPanel("enemy", battle.combatants.filter((combatant) => combatant.side === "enemy"), battle);
    enemy.classList.add("unit-panel", "is-enemy");
    this.healthStrip.replaceChildren(player, enemy);
  }

  renderUnitPanel(side, combatants, battle) {
    const panel = document.createElement("div");
    panel.className = `unit-panel is-${side}`;
    for (const combatant of combatants) panel.append(this.renderUnitToken(combatant, battle));
    return panel;
  }

  renderUnitToken(combatant, battle) {
    const token = document.createElement("div");
    const health = Math.max(0, Math.round((combatant.hp / combatant.maxHp) * 100));
    token.className = [
      "health-token",
      combatant.side === "player" ? "is-player" : "is-enemy",
      combatant.id === battle.activeId ? "is-active" : "",
      combatant.hp <= 0 ? "is-down" : "",
      combatant.attacked && (combatant.moved || combatant.attackCount > 0) ? "is-spent" : "",
    ].filter(Boolean).join(" ");
    token.style.setProperty("--health", `${health}%`);
    token.title = `${combatant.name} ${combatant.hp}/${combatant.maxHp}`;
    token.dataset.selectUnit = combatant.id;

    const name = document.createElement("button");
    name.className = "unit-name";
    name.type = "button";
    name.textContent = combatant.name;

    const meta = document.createElement("span");
    meta.className = "unit-meta";
    meta.textContent = combatant.class;

    const traits = document.createElement("div");
    traits.className = "trait-icons";
    for (const trait of combatant.traits) traits.append(this.traitIcon(trait));

    const actions = document.createElement("div");
    actions.className = "unit-actions";
    actions.append(
      this.actionIcon("move", combatant.moved || combatant.attackCount > 0),
      this.actionIcon("attack", combatant.attacked || combatant.attackUnavailable),
    );

    const bar = document.createElement("small");
    token.append(name, meta, traits, actions, bar);
    if (combatant.side === "player") token.append(this.renameButton(combatant));
    return token;
  }

  actionIcon(kind, used) {
    const icon = document.createElement("i");
    icon.className = `unit-action is-${kind}${used ? " is-used" : ""}`;
    icon.title = kind === "move" ? "Move" : "Attack";
    icon.textContent = kind === "move" ? "M" : "A";
    return icon;
  }

  traitIcon(trait) {
    const icon = document.createElement("button");
    icon.className = `trait-icon is-${trait}`;
    icon.type = "button";
    icon.dataset.trait = trait;
    icon.title = TRAIT_INFO[trait]?.text ?? trait;
    icon.setAttribute("aria-label", TRAIT_INFO[trait]?.label ?? trait);
    icon.textContent = TRAIT_LABELS[trait] ?? trait[0]?.toUpperCase() ?? "?";
    return icon;
  }

  renameButton(combatant) {
    const button = document.createElement("button");
    button.className = "rename-unit";
    button.type = "button";
    button.title = "Rename";
    button.setAttribute("aria-label", `Rename ${combatant.name}`);
    button.dataset.renameUnit = combatant.id;
    button.textContent = "R";
    return button;
  }
}

const TRAIT_LABELS = {
  assist: "A",
  block: "B",
  command: "C",
  counter1: "C1",
  counter2: "C2",
  counter3: "C3",
  counter4: "C4",
  ethereal: "E",
  guard: "G",
  heavy: "H",
  magic: "M",
  ranged: "R",
  rootedShot: "R",
  skirmishShot: "S",
  swift: "S",
  undead: "U",
  volley: "V",
};

const TRAIT_INFO = {
  assist: { label: "Assist", text: "Warrior joins an adjacent allied attack for a small follow-up hit." },
  block: { label: "Block", text: "Enemy movement cannot pass through this unit's control zone." },
  command: { label: "Command", text: "Leader trait for army command." },
  counter1: { label: "Counter I", text: "When melee attacked, hits back for 20% of current damage." },
  counter2: { label: "Counter II", text: "When melee attacked, hits back for 30% of current damage." },
  counter3: { label: "Counter III", text: "When melee attacked, hits back for 40% of current damage." },
  counter4: { label: "Counter IV", text: "When melee attacked, hits back for 50% of current damage." },
  ethereal: { label: "Ethereal", text: "Spirit-like unit trait." },
  guard: { label: "Guard", text: "Defensive warrior trait." },
  heavy: { label: "Heavy", text: "Large unit with high staying power." },
  magic: { label: "Magic", text: "Uses magic attacks." },
  ranged: { label: "Ranged", text: "Can attack from multiple tiles away." },
  rootedShot: { label: "Rooted Shot", text: "Can attack only if it did not move this turn." },
  skirmishShot: { label: "Skirmish Shot", text: "Can move then attack, but the unit has low movement." },
  swift: { label: "Swift", text: "Fast movement trait." },
  undead: { label: "Undead", text: "Undead unit trait." },
  volley: { label: "Volley", text: "Can attack twice if it did not move; after moving, can attack once." },
};
