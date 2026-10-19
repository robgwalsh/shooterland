/** Framework-agnostic entry point: create the game on a canvas without React. */

export type {
  AssetManifest,
  FontEntry,
  FontMetrics,
  ImageEntry,
  WorldEntry,
} from './assets/manifest';
export * from './core';
export type {
  GameDebug,
  GameEvent,
  GameHandle,
  GameOptions,
  StartScene,
} from './engine/createGame';
export { createGame, defaultAssetBaseUrl, PACKAGE_VERSION } from './engine/createGame';
