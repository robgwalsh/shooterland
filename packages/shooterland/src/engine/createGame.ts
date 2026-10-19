import { AssetLoader, type Assets } from '../assets/AssetLoader';
import { type GameAudio, NullAudio, WebAudioEngine } from '../audio/AudioEngine';
import { TICK_SECONDS } from '../core/constants';
import { DEFAULT_RULES, type Rules } from '../core/rules';
import { SaveService } from '../core/save/SaveService';
import { localStorageSaveStorage, type SaveStorage } from '../core/save/SaveStorage';
import type { SessionState } from '../core/sim/GameSession';
import { PointerInput } from '../input/PointerInput';
import { createGLContext } from '../render/gl';
import { Renderer } from '../render/Renderer';
import { Viewport } from '../render/Viewport';
import { AssetViewerScene } from '../scenes/AssetViewerScene';
import { BootScene } from '../scenes/BootScene';
import { LoadingScene } from '../scenes/LoadingScene';
import { SceneManager } from '../scenes/Scene';
import { type FlowEvent, GameFlow } from './GameFlow';

export type GameEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'error'; readonly error: Error }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | FlowEvent;

/**
 * Which screen to show once assets are loaded. The game normally starts at
 * the studio logo; the others exist for development and tests. 'boot' skips
 * asset loading entirely and shows the plumbing-test scene.
 */
export type StartScene =
  | 'logo'
  | 'title'
  | 'worldMap'
  | 'assetViewer'
  | 'boot'
  | {
      readonly kind: 'gameplay';
      readonly world: number;
      readonly level: number;
      readonly seed?: number | undefined;
    };

export interface GameOptions {
  /** Base URL (with trailing slash) where the package's `assets/` directory is served. */
  assetBaseUrl?: string | undefined;
  startScene?: StartScene | undefined;
  /** Where save files live. Defaults to browser localStorage. */
  storage?: SaveStorage | undefined;
  /** Gameplay constants; defaults to the reconstructed rules. */
  rules?: Rules | undefined;
  /** 'webaudio' (default) plays sound effects and synthesised MIDI music; 'none' is silent. */
  audio?: 'webaudio' | 'none' | undefined;
  /** Master volume 0..1. Default 1. */
  volume?: number | undefined;
  /** Resize the canvas backing store to its CSS box automatically. Default true. */
  autoResize?: boolean | undefined;
  /** Upper bound on devicePixelRatio used for the backing store. Default 2. */
  maxPixelRatio?: number | undefined;
  muted?: boolean | undefined;
  /** Seed for the simulation RNG; each level advances it. Default: time-based. */
  seed?: number | undefined;
  onEvent?: ((event: GameEvent) => void) | undefined;
  /** Aborting cancels asset loading and destroys the game. */
  signal?: AbortSignal | undefined;
}

export interface GameDebug {
  /** The live simulation state of the current level, if a level is being played. */
  session(): SessionState | null;
  /** Class name of the active scene. */
  scene(): string;
}

export interface GameHandle {
  readonly version: string;
  /** Resolves once assets are loaded and the first scene is running; rejects if loading fails. */
  readonly ready: Promise<void>;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  /** Sets the canvas backing-store size in device pixels. Only needed when `autoResize` is false. */
  resize(width: number, height: number): void;
  destroy(): void;
  readonly debug: GameDebug;
}

const MAX_CATCHUP_STEPS = 5;

export const PACKAGE_VERSION: string =
  typeof __SHOOTERLAND_VERSION__ === 'string' ? __SHOOTERLAND_VERSION__ : 'dev';

/** Where the published package's assets live when no `assetBaseUrl` is given. */
export function defaultAssetBaseUrl(): string {
  return `https://cdn.jsdelivr.net/npm/shooterland@${PACKAGE_VERSION}/assets/`;
}

/**
 * Boots the game on an existing canvas. Owns the GL context, the fixed-step
 * loop, input listeners, assets and the scene stack until `destroy()` is called.
 */
export function createGame(canvas: HTMLCanvasElement, options: GameOptions = {}): GameHandle {
  const emit = (event: GameEvent): void => options.onEvent?.(event);
  const rules = options.rules ?? DEFAULT_RULES;

  const viewport = new Viewport();
  const gl = createGLContext(canvas);
  const renderer = new Renderer(gl, viewport);
  const input = new PointerInput(canvas, viewport);
  const scenes = new SceneManager();
  const abort = new AbortController();
  let assets: Assets | null = null;
  let flow: GameFlow | null = null;
  let audio: GameAudio = new NullAudio();
  // Autoplay policies require the AudioContext to be created inside a gesture.
  const unlockAudio = (): void => audio.unlock();
  canvas.addEventListener('pointerdown', unlockAudio, { signal: abort.signal });
  canvas.addEventListener('keydown', unlockAudio, { signal: abort.signal });

  let destroyed = false;
  let paused = false;
  let rafId = 0;
  let last = 0;
  let accumulator = 0;
  let seed = (options.seed ?? Date.now() & 0x7fffffff) >>> 0;

  const resize = (width: number, height: number): void => {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    viewport.resize(w, h);
  };

  let observer: ResizeObserver | null = null;
  if (options.autoResize !== false && typeof ResizeObserver !== 'undefined') {
    const maxDpr = options.maxPixelRatio ?? 2;
    const fitCanvas = (): void => {
      const dpr = Math.min(maxDpr, globalThis.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      resize(r.width * dpr, r.height * dpr);
    };
    observer = new ResizeObserver(fitCanvas);
    observer.observe(canvas);
    fitCanvas();
  } else {
    resize(canvas.width, canvas.height);
  }

  const frame = (now: number): void => {
    if (destroyed) return;
    rafId = requestAnimationFrame(frame);
    if (last === 0) last = now;
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > MAX_CATCHUP_STEPS * TICK_SECONDS) elapsed = MAX_CATCHUP_STEPS * TICK_SECONDS;
    if (paused) {
      input.drain();
      scenes.draw(renderer);
      return;
    }
    accumulator += elapsed;
    while (accumulator >= TICK_SECONDS) {
      scenes.update(TICK_SECONDS, input.drain());
      accumulator -= TICK_SECONDS;
    }
    scenes.draw(renderer);
  };

  const startScene = options.startScene ?? 'logo';
  let ready: Promise<void>;
  if (startScene === 'boot') {
    scenes.go(new BootScene());
    ready = Promise.resolve();
  } else {
    const loading = new LoadingScene();
    scenes.go(loading);
    const baseUrl = options.assetBaseUrl ?? defaultAssetBaseUrl();
    const loader = new AssetLoader(gl, baseUrl, abort.signal);
    ready = loader
      .loadAll((p) => loading.setProgress(p.loaded, p.total))
      .then(async (loaded) => {
        if (destroyed) {
          loaded.destroy();
          return;
        }
        assets = loaded;
        if (options.audio !== 'none') {
          audio = new WebAudioEngine(loaded.manifest, (p) => loader.resolve(p), abort.signal, {
            muted: options.muted,
          });
          if (options.volume !== undefined) audio.setVolume(options.volume);
        }
        if (startScene === 'assetViewer') {
          scenes.go(new AssetViewerScene(loaded));
          return;
        }
        const saves = new SaveService(
          options.storage ?? localStorageSaveStorage(),
          loaded.levels,
          rules.starThresholds,
        );
        flow = new GameFlow(loaded, scenes, saves, audio, {
          rules,
          nextSeed: () => {
            seed = (seed + 0x9e3779b9) >>> 0;
            return seed;
          },
          emit,
          isDestroyed: () => destroyed,
        });
        if (startScene === 'logo') flow.logo();
        else if (startScene === 'title') flow.title();
        else if (startScene === 'worldMap') {
          await saves.select(1);
          flow.worldMap();
        } else {
          const level = loaded.level(startScene.world, startScene.level);
          if (!level) throw new Error(`no level ${startScene.world}-${startScene.level}`);
          await saves.select(1);
          await flow.play(level, startScene.seed ?? seed);
        }
      })
      .catch((error: unknown) => {
        if (destroyed) return;
        loading.setFailed();
        const err = error instanceof Error ? error : new Error(String(error));
        emit({ type: 'error', error: err });
        throw err;
      });
  }
  ready.then(
    () => {
      if (!destroyed) emit({ type: 'ready' });
    },
    () => {},
  );
  rafId = requestAnimationFrame(frame);

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    cancelAnimationFrame(rafId);
    observer?.disconnect();
    input.destroy();
    scenes.destroy();
    audio.destroy();
    assets?.destroy();
    renderer.destroy();
    // The GL context is intentionally left alive: a host (React StrictMode, prop changes)
    // may create a new game on the same canvas, and a lost context cannot be re-acquired.
  };

  options.signal?.addEventListener('abort', destroy, { once: true });

  return {
    version: PACKAGE_VERSION,
    ready,
    get paused() {
      return paused;
    },
    pause() {
      if (paused || destroyed) return;
      paused = true;
      audio.suspend();
      emit({ type: 'paused' });
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      last = 0;
      accumulator = 0;
      audio.resume();
      emit({ type: 'resumed' });
    },
    setMuted(muted: boolean) {
      audio.setMuted(muted);
    },
    setVolume(volume: number) {
      audio.setVolume(volume);
    },
    resize,
    destroy,
    debug: {
      session: () => flow?.gameplay?.session ?? null,
      scene: () => scenes.currentName,
    },
  };
}
