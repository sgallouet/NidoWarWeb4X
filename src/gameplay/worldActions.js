import { WorldManager } from "./world/WorldManager.js?v=world-turn-1";

export const worldManager = new WorldManager();

export const handleTileTap = (...args) => worldManager.handleTileTap(...args);
export const endWorldTurn = (...args) => worldManager.endTurn(...args);
export const reachableTiles = (...args) => worldManager.reachableTiles(...args);
export const reachableDistances = (...args) => worldManager.reachableDistances(...args);
export const engageTiles = (...args) => worldManager.engageTiles(...args);
export const attackableArmyTiles = (...args) => worldManager.attackableArmyTiles(...args);
