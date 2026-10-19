/**
 * Shape of `assets/manifest.json`, written by tools/asset-pipeline.
 * Paths are relative to the asset base URL.
 */
export interface ImageEntry {
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface FontEntry {
  readonly image: string;
  readonly metrics: string;
}

/** `fonts/fontN.json`: LMNOpc Bitmap Font Builder export converted by the pipeline. */
export interface FontMetrics {
  /** Texture size in pixels (square). */
  readonly size: number;
  /** Glyph cell size: size / 16. Glyphs are centred in their cells. */
  readonly cell: number;
  /** Advance width per character code (256 entries). */
  readonly advances: readonly number[];
}

export interface WorldEntry {
  readonly tiles: string;
  readonly supplement: string;
  readonly background: string;
  readonly backgroundDark: string;
  readonly map: string;
}

export interface AssetManifest {
  readonly version: 1;
  readonly generatedFrom: string;
  readonly images: Readonly<Record<string, ImageEntry>>;
  readonly fonts: Readonly<Record<string, FontEntry>>;
  readonly sounds: Readonly<Record<string, string>>;
  readonly music: Readonly<Record<string, string>>;
  readonly worlds: Readonly<Record<string, WorldEntry>>;
  readonly levels: string;
  readonly times: string;
  readonly mapNodes: string;
}
