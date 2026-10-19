import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEVELS_PER_WORLD,
  type LevelData,
  levelIndex,
} from '../../../packages/shooterland/src/core/level/LevelData';
import {
  parseMapDat,
  parseSll,
  parseTimesDat,
} from '../../../packages/shooterland/src/core/level/parseSll';

export interface LevelsOutput {
  levels: string;
  times: string;
  mapNodes: string;
  count: number;
}

/** Levels that exist in the beta only as unfinished copies (see docs/GAPS.md G20). */
function isPlaceholder(world: number, level: number): boolean {
  return world === 7 || (world === 6 && level >= 14);
}

export function convertLevels(
  legacyDir: string,
  outDir: string,
  log: (s: string) => void,
): LevelsOutput {
  const src = join(legacyDir, 'levels');
  mkdirSync(join(outDir, 'levels'), { recursive: true });

  const times = parseTimesDat(readFileSync(join(src, 'times.dat'), 'latin1'));
  const levels: LevelData[] = [];
  for (const file of readdirSync(src)) {
    const m = /^level(\d+)-(\d+)\.sll$/i.exec(file);
    if (!m) continue; // skips times.dat and the stray Level6-something.sll
    const world = Number(m[1]);
    const level = Number(m[2]);
    if (level < 1 || level > LEVELS_PER_WORLD) continue;
    const text = readFileSync(join(src, file), 'latin1');
    levels.push(
      parseSll(text, {
        world,
        level,
        timeToBeat: times[levelIndex(world, level)] ?? 0,
        placeholder: isPlaceholder(world, level),
      }),
    );
  }
  levels.sort((a, b) => a.world - b.world || a.level - b.level);

  const mapNodes = parseMapDat(readFileSync(join(legacyDir, 'graphics/world1/map.dat'), 'latin1'));

  const levelsPath = 'levels/levels.json';
  const timesPath = 'levels/times.json';
  const mapPath = 'levels/map-nodes.json';
  writeFileSync(join(outDir, levelsPath), `${JSON.stringify(levels)}\n`);
  writeFileSync(join(outDir, timesPath), `${JSON.stringify(times)}\n`);
  writeFileSync(join(outDir, mapPath), `${JSON.stringify(mapNodes)}\n`);
  log(
    `${levelsPath}: ${levels.length} levels (${levels.filter((l) => l.placeholder).length} placeholders)`,
  );
  return { levels: levelsPath, times: timesPath, mapNodes: mapPath, count: levels.length };
}
