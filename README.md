# NidoWarWeb4X

Isometric 3/4 turn-based 4X web prototype for testing world movement and battle flow.

## Start The Game

From this repo root:

```powershell
node tools\static_server.mjs . 4184 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4184/
```

If you already have the Codex in-app browser open, use the same URL. Add any query string such as `?v=dev-1` when you need to force a browser cache refresh.

To restart the preview after code changes:

```powershell
powershell -ExecutionPolicy Bypass -File tools\restart_game.ps1
```

Codex should run that restart script after finishing a task in this repo so the browser points at fresh code.

## Current Test Flow

Select the player hero, click reachable blue-tinted tiles to move, or click the red enemy tile to enter battle setup. In battle preparation, place your visible units, then press `Ready` to reveal enemies and start turn-by-turn combat.

## Project Notes

- Main page: `index.html`
- Entry point: `src/main.js` only starts `GameApp`.
- Runtime code: `src/engine`, `src/gameplay`, `src/universe`
- Gameplay managers: `src/gameplay/world/WorldManager.js` and `src/gameplay/battle/BattleManager.js`
- Engine rendering facade: `src/engine/renderer.js`; canvas backend: `src/engine/rendering/CanvasRenderer.js`
- Universe primitives: `src/universe/tile/Tile.js`, `src/universe/tileset/Tileset.js`, `src/universe/unit/Unit.js`
- Art manifest: `ressources/art/assets.json`
- Static server: `tools/static_server.mjs`
