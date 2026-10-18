/** Framework-agnostic entry point: create the game on a canvas without React. */
export * from './core';
export type { GameEvent, GameHandle, GameOptions } from './engine/createGame';
export { createGame } from './engine/createGame';
