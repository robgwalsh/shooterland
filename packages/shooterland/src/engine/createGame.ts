import { AssetLoader, type Assets } from '../assets/AssetLoader';
import { TICK_SECONDS } from '../core/constants';
import type { LevelData } from '../core/level/LevelData';
import type { SessionEvent, SessionState } from '../core/sim/GameSession';
import { PointerInput } from '../input/PointerInput';
import { createGLContext } from '../render/gl';
import { Renderer } from '../render/Renderer';
import { Viewport } from '../render/Viewport';
import { AssetViewerScene } from '../scenes/AssetViewerScene';
import { BootScene } from '../scenes/BootScene';
import { GameplayScene } from '../scenes/GameplayScene';
import { LoadingScene } from '../scenes/LoadingScene';
import { ResultScene } from '../scenes/ResultScene';
import { SceneManager } from '../scenes/Scene';

export type GameEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'error'; readonly error: Error }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | { readonly type: 'levelStart'; readonly world: number; readonly level: number }
  | {
      readonly type: 'levelComplete';
      readonly world: number;
      readonly level: number;
      readonly seconds: number;
      readonly star: boolean;
    }
  | { readonly type: 'defeat'; readonly world: number; readonly level: number }
  | { readonly type: 'session'; readonly events: readonly SessionEvent[] };

/**
 * Which scene to show once assets are loaded. 'boot' skips asset loading
 * entirely and shows the plumbing-test scene.
 */
export type StartScene =
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
  /** Resize the canvas backing store to its CSS box automatically. Default true. */
  autoResize?: boolean | undefined;
  /** Upper bound on devicePixelRatio used for the backing store. Default 2. */
  maxPixelRatio?: number | undefined;
  muted?: boolean | undefined;
  /** Seed for the deterministic simulation RNG. Default: time-based. */
  seed?: number | undefined;
  onEvent?: ((event: GameEvent) => void) | undefined;
  /** Aborting cancels asset loading and destroys the game. */
  signal?: AbortSignal | undefined;
}

export interface GameDebug {
  /** The live simulation state of the current level, if a level is being played. */
  session(): SessionState | null;
}

export interface GameHandle {
  readonly version: string;
  /** Resolves once assets are loaded and the first scene is running; rejects if loading fails. */
  readonly ready: Promise<void>;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  setMuted(muted: boolean): void;
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

  const viewport = new Viewport();
  const gl = createGLContext(canvas);
  const renderer = new Renderer(gl, viewport);
  const input = new PointerInput(canvas, viewport);
  const scenes = new SceneManager();
  const abort = new AbortController();
  let assets: Assets | null = null;
  let gameplay: GameplayScene | null = null;

  let destroyed = false;
  let paused = false;
  let rafId = 0;
  let last = 0;
  let accumulator = 0;

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

  /** Starts a level, chaining into the result screen and back. */
  const startLevel = async (loaded: Assets, level: LevelData, seed: number): Promise<void> => {
    const world = await loaded.world(level.world);
    if (destroyed) return;
    const scene = new GameplayScene({
      assets: loaded,
      world,
      level,
      seed,
      onEvents: (events) => emit({ type: 'session', events }),
      onFinish: ({ outcome, session }) => {
        gameplay = null;
        if (outcome === 'won') {
          emit({
            type: 'levelComplete',
            world: level.world,
            level: level.level,
            seconds: session.seconds,
            star: session.seconds <= level.timeToBeat,
          });
        } else {
          emit({ type: 'defeat', world: level.world, level: level.level });
        }
        scenes.go(
          new ResultScene({
            assets: loaded,
            world,
            session,
            outcome,
            onContinue: (action) => {
              const next =
                action === 'next'
                  ? (loaded.level(level.world, level.level + 1) ??
                    loaded.level(level.world + 1, 1) ??
                    level)
                  : level;
              void startLevel(loaded, next, seed + 1);
            },
          }),
        );
      },
    });
    gameplay = scene;
    scenes.go(scene);
    emit({ type: 'levelStart', world: level.world, level: level.level });
  };

  const startScene = options.startScene ?? 'assetViewer';
  let ready: Promise<void>;
  if (startScene === 'boot') {
    scenes.go(new BootScene());
    ready = Promise.resolve();
  } else {
    const loading = new LoadingScene();
    scenes.go(loading);
    const loader = new AssetLoader(gl, options.assetBaseUrl ?? defaultAssetBaseUrl(), abort.signal);
    ready = loader
      .loadAll((p) => loading.setProgress(p.loaded, p.total))
      .then(async (loaded) => {
        if (destroyed) {
          loaded.destroy();
          return;
        }
        assets = loaded;
        if (startScene === 'assetViewer') {
          scenes.go(new AssetViewerScene(loaded));
          return;
        }
        const level = loaded.level(startScene.world, startScene.level);
        if (!level) throw new Error(`no level ${startScene.world}-${startScene.level}`);
        await startLevel(loaded, level, startScene.seed ?? options.seed ?? Date.now() & 0x7fffffff);
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
      emit({ type: 'paused' });
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      last = 0;
      accumulator = 0;
      emit({ type: 'resumed' });
    },
    setMuted(_muted: boolean) {
      // Audio arrives in phase 7.
    },
    resize,
    destroy,
    debug: {
      session: () => gameplay?.session ?? null,
    },
  };
}
