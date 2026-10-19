/**
 * Converts the legacy Shooterland data into web-ready assets plus a manifest.
 * Deterministic: running it twice yields identical output.
 *
 *   tsx src/index.ts --legacy ../../legacy --out ../../packages/shooterland/assets
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { AssetManifest } from '../../../packages/shooterland/src/assets/manifest';
import { convertAudio } from './audio';
import { convertFonts } from './fonts';
import { convertSheets, convertWorlds } from './images';
import { convertLevels } from './levels';

const { values } = parseArgs({
  options: {
    legacy: { type: 'string' },
    out: { type: 'string' },
    quiet: { type: 'boolean', default: false },
  },
});

if (!values.legacy || !values.out) {
  console.error('usage: asset-pipeline --legacy <dir> --out <dir> [--quiet]');
  process.exit(2);
}
const legacyDir = resolve(values.legacy);
const outDir = resolve(values.out);
for (const sub of ['graphics', 'fonts', 'levels', 'sounds']) {
  if (!existsSync(join(legacyDir, sub))) {
    console.error(`legacy directory is missing ${sub}/: ${legacyDir}`);
    process.exit(1);
  }
}
const log = values.quiet ? () => {} : (s: string) => console.log(`  ${s}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log('sprites');
const sheets = convertSheets(legacyDir, outDir, log);
console.log('worlds');
const worlds = convertWorlds(legacyDir, outDir, log);
console.log('fonts');
const fonts = convertFonts(legacyDir, outDir, log);
console.log('levels');
const levels = convertLevels(legacyDir, outDir, log);
console.log('audio');
const audio = convertAudio(legacyDir, outDir, log);

const manifest: AssetManifest = {
  version: 1,
  generatedFrom: 'legacy/ (Shooterland beta, 2006-04-09)',
  images: Object.fromEntries(
    sheets.map((s) => [s.key, { path: s.path, width: s.width, height: s.height }]),
  ),
  fonts: Object.fromEntries(fonts.map((f) => [f.key, { image: f.image, metrics: f.metrics }])),
  sounds: audio.sounds,
  music: audio.music,
  worlds: Object.fromEntries(
    worlds.map((w) => [
      String(w.world),
      {
        tiles: w.tiles,
        supplement: w.supplement,
        background: w.background,
        backgroundDark: w.backgroundDark,
        map: w.map,
      },
    ]),
  ),
  levels: levels.levels,
  times: levels.times,
  mapNodes: levels.mapNodes,
};
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json written to ${outDir}`);
