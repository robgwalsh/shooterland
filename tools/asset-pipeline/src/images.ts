import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { applyColorKey, type ColorKey, readGif, readPng, writePng } from './image';

/**
 * Every sprite sheet in legacy/graphics with the colour key the original
 * applied to it. Keys were determined by sampling each file (corner pixel and
 * colour histograms); `null` means the sheet is drawn opaque.
 */
const SHEETS: Record<string, ColorKey> = {
  'beta.png': 'corner', // black
  'bonus.png': 'corner', // magenta
  'bonusbaddies.png': 'corner', // magenta
  'bubbles.png': 'corner', // black
  'buttonz.png': 'corner', // black
  'checkandstar.png': 'corner', // black
  'complete.png': 'corner', // black
  'defeat.png': 'corner', // black
  'explosion.png': 'corner', // black
  'items.PNG': 'corner', // black
  'logo.png': 'corner', // black
  'menusupplement.png': 'corner', // green #39a74c
  'mini.png': 'corner', // black
  'mouse.png': 'corner', // white (verify in the asset viewer)
  'Pause.png': 'corner', // black
  'plusminus.png': null,
  'raccoon.png': 'corner', // black
  'shooterland.png': null,
  'shooterlandsign.png': null,
  'shooters.png': 'corner', // black
  'StumpAndMoney.png': 'corner', // black
  'suffle.png': 'corner', // magenta
  'wood.png': 'corner', // black
};

export interface ImageOutput {
  key: string;
  path: string;
  width: number;
  height: number;
}

export interface WorldOutput {
  world: number;
  tiles: string;
  supplement: string;
  background: string;
  backgroundDark: string;
  map: string;
}

function findCaseInsensitive(dir: string, name: string): string {
  const hit = readdirSync(dir).find((f) => f.toLowerCase() === name.toLowerCase());
  if (!hit) throw new Error(`missing ${name} in ${dir}`);
  return join(dir, hit);
}

export function convertSheets(
  legacyDir: string,
  outDir: string,
  log: (s: string) => void,
): ImageOutput[] {
  const src = join(legacyDir, 'graphics');
  const dst = join(outDir, 'sprites');
  mkdirSync(dst, { recursive: true });
  const out: ImageOutput[] = [];
  for (const [name, key] of Object.entries(SHEETS)) {
    const img = readPng(findCaseInsensitive(src, name));
    const keyed = applyColorKey(img, key);
    const base = name.toLowerCase().replace(/\.png$/, '');
    const rel = `sprites/${base}.png`;
    writePng(join(outDir, rel), img);
    out.push({ key: base, path: rel, width: img.width, height: img.height });
    log(`${rel} ${img.width}x${img.height}${keyed ? ` (${keyed} px keyed)` : ''}`);
  }
  return out;
}

export function convertWorlds(
  legacyDir: string,
  outDir: string,
  log: (s: string) => void,
): WorldOutput[] {
  const out: WorldOutput[] = [];
  for (let w = 1; w <= 7; w++) {
    const src = join(legacyDir, 'graphics', `world${w}`);
    if (!existsSync(src)) break;
    const dst = join(outDir, 'worlds', String(w));
    mkdirSync(dst, { recursive: true });
    const write = (
      name: string,
      img: { width: number; height: number; data: Uint8Array },
    ): string => {
      const rel = `worlds/${w}/${name}.png`;
      writePng(join(outDir, rel), img);
      log(`${rel} ${img.width}x${img.height}`);
      return rel;
    };
    // The per-world tile sheet is black-keyed like the root sheets (the GIF has no transparent index).
    const tiles = readGif(findCaseInsensitive(src, 'image.gif'));
    applyColorKey(tiles, 'corner');
    const supplement = readGif(findCaseInsensitive(src, 'supplement.gif'));
    out.push({
      world: w,
      tiles: write('tiles', tiles),
      supplement: write('supplement', supplement),
      background: write('background', readPng(findCaseInsensitive(src, 'background.png'))),
      backgroundDark: write(
        'backgrounddark',
        readPng(findCaseInsensitive(src, 'backgrounddark.png')),
      ),
      map: write('map', readPng(findCaseInsensitive(src, 'map.png'))),
    });
  }
  return out;
}
