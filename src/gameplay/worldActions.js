import { WorldManager } from "./world/WorldManager.js?v=battle-test-43";

export const worldManager = new WorldManager();

export const handleTileTap = (...args) => worldManager.handleTileTap(...args);
export const reachableTiles = (...args) => worldManager.reachableTiles(...args);
export const engageTiles = (...args) => worldManager.engageTiles(...args);
export const attackableArmyTiles = (...args) => worldManager.attackableArmyTiles(...args);
