import { readFileSync, writeFileSync } from 'node:fs';
import { GifReader } from 'omggif';
import { PNG } from 'pngjs';

export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, row-major, 4 bytes per pixel. */
  data: Uint8Array;
}

export function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(file));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

/** Decodes the first frame of a GIF, honouring its transparent index if any. */
export function readGif(file: string): RgbaImage {
  const reader = new GifReader(readFileSync(file));
  const data = new Uint8Array(reader.width * reader.height * 4);
  reader.decodeAndBlitFrameRGBA(0, data);
  return { width: reader.width, height: reader.height, data };
}

export function writePng(file: string, img: RgbaImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  writeFileSync(file, PNG.sync.write(png, { deflateLevel: 9 }));
}

export type ColorKey = 'corner' | `#${string}` | null;

function parseHex(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/**
 * Makes every pixel matching the key colour fully transparent, mirroring the
 * original's SDL_SetColorKey. Returns the number of pixels keyed out.
 */
export function applyColorKey(img: RgbaImage, key: ColorKey): number {
  if (key === null) return 0;
  const d = img.data;
  const [kr, kg, kb] = key === 'corner' ? [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0] : parseHex(key);
  let count = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === kr && d[i + 1] === kg && d[i + 2] === kb) {
      d[i + 3] = 0;
      count++;
    }
  }
  return count;
}
