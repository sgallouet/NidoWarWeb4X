---
name: nidowar-requirement-ledger
description: "Maintain a concise one-line ledger of NidoWarWeb4X user requirements. Use whenever working in D:/Codex/NidoWarWeb4X and the user gives new product, gameplay, UI, rendering, code-organization, workflow, or memory requirements that should not be forgotten."
---

# NidoWar Requirement Ledger

For every new durable rule in this repo:

- Check `D:/Codex/NidoWarWeb4X/INSTRUCTION.md` first.
- Record only reusable rules, constraints, preferences, and invariants that should guide future implementation.
- Do not record one-off tasks, temporary test-map requests, bug reports, or feature chores such as "build X", "add Y", or "fix Z".
- If the rule is already covered in `INSTRUCTION.md`, do not duplicate it here.
- If it is not covered and is not already listed below, append one concise numbered rule using the next `NW-R###` id.
- Do not edit `INSTRUCTION.md`; the user maintains it manually.

## Requirement Ledger

- NW-R001: Tile picking, placement, movement, and highlights must use real `Tile` geometry and `tile.center`, not guessed screen offsets.
- NW-R002: Multi-tile objects must be placed from the average center of their footprint tiles.
- NW-R003: Tile highlights must recolor the actual tile sprite source alpha, not draw separate geometric or hand-guessed overlays.
- NW-R004: Tile highlights and color states must render inside the actual tile-map pass in back-to-front isometric diagonal order, so selected tiles never stack above neighboring tiles.
- NW-R005: Zooming must preserve the centered tile instead of drifting the camera.
- NW-R006: Render only visible map content and keep render passes disciplined for phone/tablet performance.
- NW-R007: Keep entry/facade files tiny; put behavior in focused classes/modules such as `Tile`, `Unit`, `Tileset`, `WorldManager`, `BattleManager`, and renderer backends.
- NW-R008: Rendering code should stay generic enough to reuse in other games.
- NW-R009: Never allow two active units or armies on the same tile.
- NW-R010: World-map attacks require moving adjacent first; attack-adjacent tiles use yellow/engage highlighting.
- NW-R011: Battle setup uses one tile per unit, no subtile subdivision.
- NW-R012: Battle starts with a preparation phase where player units can be placed before enemies are revealed, then Ready enters fight mode directly.
- NW-R013: Unit movement animations must move to the destination tile center.
- NW-R014: Selected units render with a circle below the unit, ordered under the unit sprite.
- NW-R015: Damage must render as floating `-x` text above the damaged unit.
- NW-R016: Hit animations should include a quick attacker lunge/return, target vibration, and splashy damage numbers.
- NW-R017: Battle control should allow selecting any eligible player unit from the map or HUD.
- NW-R018: A moved unit may change its provisional destination until it attacks or triggers another committed action.
- NW-R019: If a unit has no attack opportunity after movement, mark attack spent too.
- NW-R020: Props and buildings block movement; trees are cover and do not block movement.
- NW-R021: Props inside active battle tiles should remain colored, not greyed out.
- NW-R022: World and battle props must share one unified fade/readability rendering path.
- NW-R023: Props that hide units in battle or world should become semi-transparent.
- NW-R024: When a unit stands on a tree tile, offset/fade the tree so the unit remains readable.
- NW-R025: Cover/fade calculations should be limited to visible tiles and updated around changed unit positions when possible.
- NW-R026: Warrior blocking trait applies in world and battle; movement may enter adjacent guard tiles but cannot path through the warrior control zone.
- NW-R027: Melee units can attack diagonally.
- NW-R028: Ranged units can attack at distance, with archer-style units using one named shot trait.
- NW-R029: Archer shot trait icons must be clickable and explain their behavior.
- NW-R030: Unit stats, class, strength, traits, and trait icons should come from the unit catalog.
- NW-R031: Unit panels should show unit class beside the unit name and icons for each trait.
- NW-R032: Battle unit panels should pin player units on the left and enemy units on the right.
- NW-R033: Unit names should be random, renameable, persistent per type, and preferred for future units of the same type.
- NW-R034: Unit UI should show separate move and attack icons; spent actions grey out, and fully spent units grey out.
- NW-R035: Selecting a unit by clicking its map tile or UI name should select that unit.
- NW-R036: Clicking a non-highlighted tile should unselect the current unit.
- NW-R037: Selecting a friendly world-map army should show a bottom-left group panel.
- NW-R038: Inspecting an enemy world-map army should show its possible movement and a right-side panel with unknown units as `??`.
- NW-R039: World-map army sprites should use the strongest unit in the army formation.
- NW-R040: Movement-possible tile tint should read a little blue in both battle and world.
- NW-R041: Top-left world controls should be foldable, folded by default, and should not include zoom `+/-` buttons.
- NW-R042: Keep `README.md` updated with how to start the game.
- NW-R043: After finishing repo tasks, restart the local game preview with `tools/restart_game.ps1` unless the user explicitly says not to.
- NW-R044: Avoid Codex app steering/task-plan directives because they caused user-visible `{"detail":"Bad Request"}` interruptions.
- NW-R045: To save tokens, only test when explicitly asked or when the change is risky enough that skipping validation would likely leave the project broken.
- NW-R046: Keep a project skill Don't Do List for repeated mistakes or failed approaches that are worth remembering.
- NW-R047: Some warrior units can have leveled counter traits that hit back only when melee attacked, scaling from 20% to 50% of their current damage.
- NW-R048: Large terrain/render cache rebuilds should be chunked asynchronously instead of built synchronously in one main-thread lump.
- NW-R049: Battle unit selection panels should sit at the bottom-left of the screen.
- NW-R050: Battle HUD unit selection must work the same during preparation and battle phases.
- NW-R051: Clicking trait icons is informational and must not spend or trigger a unit attack.
- NW-R052: In battle mode, the End button ends the player side's turn and passes control to the enemy side.
- NW-R053: Battle movement animations should travel tile-to-tile, may use diagonal steps, should avoid blocked/occupied tiles when possible, and should keep visually consistent speed.
