---
name: nidowar-web4x
description: "Build and evolve the NidoWarWeb4X repo according to its README: small optimized isometric 3/4 turn-based 4X web game slices, sprite atlas rendering, phone/tablet performance, engine/gameplay/universe separation, and minimal retro J-RPG UI. Use when Codex works on this repo, adds world-map visuals, gameplay systems, rendering code, units, tiles, resources, buildings, or updates project instructions."
---

# NidoWar Web4X

## Core Rules

Build the game in small, readable slices. Keep files focused, avoid large central files, and separate code into engine, gameplay, and universe concepts.

- Prefer a sprite-only isometric 3/4 world map.
- Keep the first screen as the usable game surface, not a landing page.
- Optimize for phone and tablet: cull offscreen work, avoid blocking the frame, and keep async/non-render work outside the render pass.
- Use atlas-based sprites and batch-friendly canvas/WebGL patterns when possible.
- Keep UI minimal, tactile, and retro J-RPG inspired, with as little text as possible.
- Ask when requirements are genuinely ambiguous; otherwise choose the smallest maintainable implementation.
- Do not use Codex app steering/task-plan directives for this repo. They have repeatedly surfaced `{"detail":"Bad Request"}` in the user-visible thread and interrupt the work. Track progress with short normal messages only.
- Also use `nidowar-requirement-ledger` for this repo so new user requirements are kept as one-line memory entries when they are not already in `INSTRUCTION.md`.
- Keep entry files tiny: `src/main.js`, `src/engine/renderer.js`, and facade modules should only wire focused classes together. Put behavior in named managers such as `GameApp`, `WorldManager`, `BattleManager`, `Tile`, `Unit`, and rendering backends.
- Enforce one active unit or army per tile. Formation placement, world movement, battle movement, and AI movement must check tile occupancy before moving or spawning units.
- On the world map, clicking a non-adjacent enemy army inspects it: show its possible movement tiles and a right-side army panel. Reveal only the world-map representative unit; unknown formation members should render as `??` until battle or scouting rules reveal them.
- Battle HUD should show player units on the left and enemy units on the right. Player unit names are persistent per unit type, and move/attack actions are separate flags that grey out when spent.
- During player battle control, allow selecting any living player unit from the map or HUD. Movement is provisional until an attack or committed action, so a moved unit may choose a different reachable tile from its original turn position before attacking.
- Melee battle attacks use the 8 neighboring tiles, including diagonals. Ranged attacks keep their normal distance rule.
- Some warrior units can have leveled counter traits (`counter1` to `counter4`) that hit back only when melee attacked, scaling from 20% to 50% of their current damage.
- Props/buildings on tiles block world and battle movement. In battle, active-area props must render in color even while inactive tiles outside the fight are greyscale. Warrior units have a blocking trait: movement may enter reachable adjacent guard tiles, shown yellow, but cannot path through them to pass behind the warrior.
- Trees are non-blocking cover props. If a unit stands on a tree tile, draw the tree offset up/side and translucent so the unit remains readable; props near/over units should fade instead of hiding units. Compute these cover effects only for visible tiles. Use one unified visible-prop rendering path for world and battle so houses, trees, and other props follow the same readability rules in both modes.
- Unit stats, class, strength, and traits belong in `src/universe/unit/unitCatalog.js`. Test armies may randomly sample their formation from unit pools, and the world-map army sprite should use the strongest unit in that formation.
- Archer-style units should use one named shot trait from the catalog: `volley` attacks twice only if stationary, `rootedShot` attacks only if stationary, and `skirmishShot` can move then attack with low movement. Trait icons in army panels should be clickable and explain the trait.
- Tile highlights must alter the actual tile sprite using its source alpha, preferably through cached tinted tile variants. Do not draw separate rectangular or hand-guessed diamond overlays for movement/attack highlights; they drift from the art and create visible artifacts.
- Tile highlights must be drawn during the ground tile pass in back-to-front isometric diagonal order (`x + y`), never as a post-ground overlay, because isometric tile sprites can overlap and stacked highlights appear to climb above neighboring tiles.

** MANDATORY ** READ THE FULL INSTRUCTION.MD BEFORE STARTING. It contains critical information about project structure, art pipeline, gameplay memory, and validation steps.

## Project Shape

Use this folder intent unless the repo already has a stronger pattern:

- `src/engine/`: rendering, assets, camera, input, scheduling, viewport math.
- `src/gameplay/`: turns, movement, fog, economy, combat rules, AI.
- `src/universe/`: concrete tiles, units, buildings, resources, factions, maps.
- `ressources/art/assets.json`: authoritative art manifest for uneven atlas inputs, crop rects, runtime size, anchors, and depth.
- `ressources/sprites/`: owned cropped runtime sprites extracted from source atlases. Keep active world-map props static unless animation has been separately approved and validated.
- `ressources/atlases/`: source atlases copied into the repo. Preserve the existing `ressources` spelling.
- `tools/art_pipeline.py`: crop/debug helper for manifest-driven art extraction.

## Art Pipeline

Treat supplied atlases as bad input by default: uneven spacing, inconsistent scale, no reliable grid, and occasional poor crop boundaries. Never hand-code atlas rectangles directly in runtime rendering.

- Copy every active source atlas into `ressources/atlases/`.
- Add or adjust asset entries in `ressources/art/assets.json`; each active sprite needs `atlas`, `rect`, `file`, `kind`, and `draw` metadata.
- Every object sprite should also declare `placement.footprint` and `placement.center`; use square tile footprints of `1x1`, `2x2`, `3x3`, or `4x4` unless the user explicitly wants a special shape. The renderer projects that footprint center automatically.
- Defense towers are `1x1` and centered in their owning tile. Castles are `4x4`. Medium buildings should generally be `2x2`; large civic buildings can be `3x3`.
- Use explicit `draw.height` or tile `draw.width`/`draw.height` to normalize runtime scale. In the world-map preview, use one visible unit sprite per tile and make humans large enough to read clearly at normal zoom.
- When adding units from mixed atlases, normalize humanoids around the established 56-66px world height, use larger monsters sparingly, and prefer a draw-time `flipX` flag for facing rather than altering source atlas art.
- Trees are one centered tree per tile; vary tree type and density by map placement, not by placing several trees inside one tile.
- Runtime tile coordinates project to the tile sprite's logical center; `tile.objectOffsetY` can lift object contact points onto the visible center of the top diamond. Keep `placement.center: { "x": 0, "y": 0 }` for 1x1 trees, props, towers, and units so the sprite contact point sits in the middle of its tile diamond. Multi-tile assets use `{ "x": (width - 1) / 2, "y": (height - 1) / 2 }`.
- Use `draw.anchorX`, `draw.anchorY`, and `draw.depth` for contact-point depth sorting. Sort by the object foot/contact point, not by sprite top or owning tile alone.
- Crop individual sprites with `python tools/art_pipeline.py --manifest ressources/art/assets.json --debug ressources/art/crop-debug.png`.
- For already-cropped transparent tile PNGs, mark manifest entries with `"source": "file"` so the crop pipeline visualizes them but does not overwrite them from an atlas.
- Inspect `ressources/art/crop-debug.png` before accepting art changes. It shows crop bounds, runtime size, and anchor/depth guides.
- Use `python tools/art_pipeline.py --components ressources/atlases/<atlas>.png` to print alpha-component rect candidates when authoring new manifest entries.
- Do not animate trees or world-map props by default. Static, well-scaled silhouettes are preferred until an animation pass is explicitly requested and validated in-game.
- If animated sprites are reintroduced later, define `frames`, `animations`, `defaultAnimation`, and bump `cacheVersion` in `ressources/art/assets.json` so the browser does not keep stale frame files.

## Gameplay Memory

- World map is turn-based with limited movement and actions per turn.
- Armies can contain up to four unit groups or heroes.
- Combat begins when moving onto an enemy tile, zooming into a 3x3 tile area; each tile has four subtiles for formation.
- Resources can generate gold, spawn merchants, be protected, captured, or consumed.
- Forest hides enemies beyond one tile, slows movement by 50%, and reduces incoming archer damage by 30%.
- Castles are captured after three days on top of them after defenders are defeated, and can build units through buildings.
- Towns generate population weekly and can grow an army by available population when entered.

## Before Finishing

Only test when the user explicitly asks for testing, or when the task is risky enough that skipping validation would likely leave the project broken. For easy/small tasks, avoid extra validation and browser checks to save tokens.

After finishing a task in this repo, restart the local game preview with `powershell -ExecutionPolicy Bypass -File tools\restart_game.ps1` so the browser gets the newest files.

Never emit Codex app workflow directives in the final answer for this repo unless the user explicitly asks for the corresponding app action. Use plain text summaries only.

## Don't Do List

Add a one-line entry here whenever an approach wastes tokens, breaks the flow, or fails in a way that is likely to be repeated.

- Do not use Codex app steering/task-plan directives in this repo; they caused user-visible `{"detail":"Bad Request"}` interruptions.
- Do not use `Set-Content` or shell write tricks for source edits on Windows; it can hit access errors and wastes tokens, so use `apply_patch`.
- Do not draw tile highlights as a post-ground overlay; draw tile color states inside the ground pass in isometric diagonal order.
- Do not build large terrain/render caches synchronously in one lump; chunk cache rebuilds asynchronously so the main thread can breathe between frames.
