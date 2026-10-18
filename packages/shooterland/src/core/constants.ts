/** The original game ran at a fixed 800x600; every scene draws in that virtual space. */
export const VIRTUAL_WIDTH = 800;
export const VIRTUAL_HEIGHT = 600;

/** Board geometry (see docs/FORMATS.md). */
export const GRID_SIZE = 13;
export const TILE_PX = 40;
export const BOARD_PX = GRID_SIZE * TILE_PX; // 520

/** Simulation runs at a fixed step so replays and star times are deterministic. */
export const TICK_RATE = 60;
export const TICK_SECONDS = 1 / TICK_RATE;
