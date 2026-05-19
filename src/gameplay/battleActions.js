import { BattleManager } from "./battle/BattleManager.js?v=battle-test-43";

export const battleManager = new BattleManager();

export const createBattle = (...args) => battleManager.createBattle(...args);
export const handleBattleTap = (...args) => battleManager.handleBattleTap(...args);
export const waitBattleTurn = (...args) => battleManager.waitBattleTurn(...args);
export const startBattle = (...args) => battleManager.startBattle(...args);
export const isEnemyTurn = (...args) => battleManager.isEnemyTurn(...args);
export const resolveEnemyTurn = (...args) => battleManager.resolveEnemyTurn(...args);
export const battleMoveTiles = (...args) => battleManager.battleMoveTiles(...args);
export const battleGuardTiles = (...args) => battleManager.battleGuardTiles(...args);
export const battleAttackTiles = (...args) => battleManager.battleAttackTiles(...args);
export const activeCombatant = (...args) => battleManager.activeCombatant(...args);
export const renameUnit = (...args) => battleManager.renameUnit(...args);
export const selectUnit = (...args) => battleManager.selectUnit(...args);
