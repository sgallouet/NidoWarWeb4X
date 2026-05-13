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

## Project Shape

Use this folder intent unless the repo already has a stronger pattern:

- `src/engine/`: rendering, assets, camera, input, scheduling, viewport math.
- `src/gameplay/`: turns, movement, fog, economy, combat rules, AI.
- `src/universe/`: concrete tiles, units, buildings, resources, factions, maps.
- `ressources/`: sprite atlases and other game assets. Preserve the existing spelling.

## Gameplay Memory

- World map is turn-based with limited movement and actions per turn.
- Armies can contain up to four unit groups or heroes.
- Combat begins when moving onto an enemy tile, zooming into a 3x3 tile area; each tile has four subtiles for formation.
- Resources can generate gold, spawn merchants, be protected, captured, or consumed.
- Forest hides enemies beyond one tile, slows movement by 50%, and reduces incoming archer damage by 30%.
- Castles are captured after three days on top of them after defenders are defeated, and can build units through buildings.
- Towns generate population weekly and can grow an army by available population when entered.

## Before Finishing

Run the lightest useful local validation. For frontend visual work, open or serve the app and verify the canvas is nonblank at mobile and desktop sizes.
