import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writePng } from './image';

export interface FontOutput {
  key: string;
  image: string;
  metrics: string;
}

/**
 * LMNOpc Bitmap Font Builder export: `font.ini` holds the texture size,
 * `font.raw` is an 8-bit greyscale texture of 16x16 glyph cells indexed by
 * character code, `font.dat` holds 256 advance widths. The texture becomes a
 * white RGBA image whose alpha is the greyscale value, so text can be tinted.
 */
export function convertFonts(
  legacyDir: string,
  outDir: string,
  log: (s: string) => void,
): FontOutput[] {
  mkdirSync(join(outDir, 'fonts'), { recursive: true });
  const out: FontOutput[] = [];
  for (const name of ['font1', 'font2', 'font3']) {
    const dir = join(legacyDir, 'fonts', name);
    const size = Number.parseInt(readFileSync(join(dir, 'font.ini'), 'latin1').trim(), 10);
    const raw = readFileSync(join(dir, 'font.raw'));
    const dat = readFileSync(join(dir, 'font.dat'));
    if (raw.length !== size * size)
      throw new Error(`${name}: font.raw is ${raw.length} bytes, expected ${size * size}`);
    if (dat.length !== 256)
      throw new Error(`${name}: font.dat is ${dat.length} bytes, expected 256`);

    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < raw.length; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = raw[i] ?? 0;
    }
    const image = `fonts/${name}.png`;
    const metrics = `fonts/${name}.json`;
    writePng(join(outDir, image), { width: size, height: size, data });
    writeFileSync(
      join(outDir, metrics),
      `${JSON.stringify({ size, cell: size / 16, advances: Array.from(dat) })}\n`,
    );
    log(`${image} ${size}x${size}, cell ${size / 16}`);
    out.push({ key: name, image, metrics });
  }
  return out;
}
