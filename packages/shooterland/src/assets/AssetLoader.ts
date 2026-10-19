import type { LevelData } from '../core/level/LevelData';
import { BitmapFont } from '../render/BitmapFont';
import { Texture } from '../render/Texture';
import type { AssetManifest, FontMetrics } from './manifest';

export interface WorldAssets {
  readonly tiles: Texture;
  readonly supplement: Texture;
  readonly background: Texture;
  readonly backgroundDark: Texture;
  readonly map: Texture;
}

export interface MapNode {
  readonly x: number;
  readonly y: number;
}

/** Everything loaded at boot. World art is fetched on demand via `world(n)`. */
export class Assets {
  private readonly worlds = new Map<number, Promise<WorldAssets>>();

  constructor(
    readonly manifest: AssetManifest,
    readonly images: ReadonlyMap<string, Texture>,
    readonly fonts: ReadonlyMap<string, BitmapFont>,
    readonly levels: readonly LevelData[],
    readonly times: readonly number[],
    readonly mapNodes: readonly MapNode[],
    private readonly loader: AssetLoader,
  ) {}

  image(key: string): Texture {
    const t = this.images.get(key);
    if (!t) throw new Error(`unknown image "${key}"`);
    return t;
  }

  font(key: string): BitmapFont {
    const f = this.fonts.get(key);
    if (!f) throw new Error(`unknown font "${key}"`);
    return f;
  }

  level(world: number, level: number): LevelData | undefined {
    return this.levels.find((l) => l.world === world && l.level === level);
  }

  world(n: number): Promise<WorldAssets> {
    let p = this.worlds.get(n);
    if (!p) {
      p = this.loader.loadWorld(this.manifest, n);
      this.worlds.set(n, p);
    }
    return p;
  }

  destroy(): void {
    for (const t of this.images.values()) t.destroy();
    for (const f of this.fonts.values()) f.texture.destroy();
    for (const p of this.worlds.values()) {
      p.then((w) => {
        for (const t of [w.tiles, w.supplement, w.background, w.backgroundDark, w.map]) t.destroy();
      }).catch(() => {});
    }
  }
}

export interface LoadProgress {
  loaded: number;
  total: number;
}

/** Fetches and decodes assets relative to a base URL into GL textures. */
export class AssetLoader {
  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly baseUrl: string,
    private readonly signal?: AbortSignal,
  ) {}

  /** Resolves a manifest path against the base URL. */
  resolve(path: string): string {
    return this.url(path);
  }

  private url(path: string): string {
    // Relative bases ("/assets/", "./assets/") resolve against the page; absolute ones stand alone.
    const pageHref = typeof location !== 'undefined' ? location.href : undefined;
    return new URL(path, new URL(this.baseUrl, pageHref)).toString();
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(this.url(path), this.signal ? { signal: this.signal } : undefined);
    if (!res.ok) throw new Error(`failed to load ${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  private async fetchTexture(path: string): Promise<Texture> {
    const res = await fetch(this.url(path), this.signal ? { signal: this.signal } : undefined);
    if (!res.ok) throw new Error(`failed to load ${path}: HTTP ${res.status}`);
    const bitmap = await createImageBitmap(await res.blob(), {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    try {
      return Texture.fromImage(this.gl, bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }

  async loadAll(onProgress?: (p: LoadProgress) => void): Promise<Assets> {
    const manifest = await this.fetchJson<AssetManifest>('manifest.json');
    const imageKeys = Object.keys(manifest.images);
    const fontKeys = Object.keys(manifest.fonts);
    const progress: LoadProgress = { loaded: 0, total: imageKeys.length + fontKeys.length * 2 + 3 };
    const tick = <T>(p: Promise<T>): Promise<T> =>
      p.then((v) => {
        progress.loaded++;
        onProgress?.(progress);
        return v;
      });

    const [images, fonts, levels, times, mapNodes] = await Promise.all([
      Promise.all(
        imageKeys.map(async (k) => {
          const entry = manifest.images[k];
          if (!entry) throw new Error(`manifest has no image "${k}"`);
          return [k, await tick(this.fetchTexture(entry.path))] as const;
        }),
      ),
      Promise.all(
        fontKeys.map(async (k) => {
          const entry = manifest.fonts[k];
          if (!entry) throw new Error(`manifest has no font "${k}"`);
          const [tex, metrics] = await Promise.all([
            tick(this.fetchTexture(entry.image)),
            tick(this.fetchJson<FontMetrics>(entry.metrics)),
          ]);
          return [k, new BitmapFont(tex, metrics)] as const;
        }),
      ),
      tick(this.fetchJson<LevelData[]>(manifest.levels)),
      tick(this.fetchJson<number[]>(manifest.times)),
      tick(this.fetchJson<MapNode[]>(manifest.mapNodes)),
    ]);
    return new Assets(manifest, new Map(images), new Map(fonts), levels, times, mapNodes, this);
  }

  async loadWorld(manifest: AssetManifest, n: number): Promise<WorldAssets> {
    const entry = manifest.worlds[String(n)];
    if (!entry) throw new Error(`manifest has no world ${n}`);
    const [tiles, supplement, background, backgroundDark, map] = await Promise.all([
      this.fetchTexture(entry.tiles),
      this.fetchTexture(entry.supplement),
      this.fetchTexture(entry.background),
      this.fetchTexture(entry.backgroundDark),
      this.fetchTexture(entry.map),
    ]);
    return { tiles, supplement, background, backgroundDark, map };
  }
}
