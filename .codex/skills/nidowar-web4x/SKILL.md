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
- Trees are one centered tree per tile; vary tree type and density by map placement, not by placing several trees inside one tile.
- Runtime tile coordinates project to the tile sprite's logical center; `tile.objectOffsetY` can lift object contact points onto the visible center of the top diamond. Keep `placement.center: { "x": 0, "y": 0 }` for 1x1 trees, props, towers, and units so the sprite contact point sits in the middle of its tile diamond. Multi-tile assets use `{ "x": (width - 1) / 2, "y": (height - 1) / 2 }`.
- Use `draw.anchorX`, `draw.anchorY`, and `draw.depth` for contact-point depth sorting. Sort by the object foot/contact point, not by sprite top or owning tile alone.
- Crop individual sprites with `python tools/art_pipeline.py --manifest ressources/art/assets.json --debug ressources/art/crop-debug.png`.
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

Run the lightest useful local validation. For art work, regenerate crops and inspect the debug sheet. For frontend visual work, open or serve the app and verify the canvas is nonblank at mobile and desktop sizes.
