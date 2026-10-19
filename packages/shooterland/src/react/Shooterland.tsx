import {
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  createGame,
  type GameEvent,
  type GameHandle,
  type GameOptions,
  type StartScene,
} from '../engine/createGame';

export interface ShooterlandProps {
  /** Base URL (with trailing slash) where the package's `assets/` directory is served. */
  assetBaseUrl?: string | undefined;
  /** Scene to show after loading. Defaults to the game's normal boot sequence. */
  startScene?: StartScene | undefined;
  muted?: boolean | undefined;
  /** Pause the simulation while the page is hidden. Default true. */
  pauseWhenHidden?: boolean | undefined;
  /** Seed for the deterministic simulation RNG. */
  seed?: number | undefined;
  className?: string | undefined;
  /** Applied to the wrapper. Defaults to a full-width 4:3 box. */
  style?: CSSProperties | undefined;
  onEvent?: ((event: GameEvent) => void) | undefined;
  onReady?: (() => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  /** Shown when WebGL2 is unavailable or the game failed to start. */
  fallback?: ReactNode | undefined;
}

const wrapperStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  background: '#000',
};

const canvasStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  touchAction: 'none',
  userSelect: 'none',
};

/**
 * The whole game as a component. Mounting creates the game on an internal
 * canvas; unmounting tears it down. The `ref` exposes the imperative handle.
 */
export const Shooterland = forwardRef<GameHandle | null, ShooterlandProps>(function Shooterland(
  {
    assetBaseUrl,
    startScene,
    muted,
    pauseWhenHidden = true,
    seed,
    className,
    style,
    onEvent,
    onReady,
    onError,
    fallback,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [failed, setFailed] = useState<Error | null>(null);

  // Keep the latest callbacks without re-creating the game when they change.
  const callbacks = useRef({ onEvent, onReady, onError });
  callbacks.current = { onEvent, onReady, onError };

  // The exposed handle is a stable proxy, so it stays valid across game re-creation
  // (for example when `assetBaseUrl` changes) and before the game has booted.
  // The start scene is compared by value so an inline object literal does not re-create the game.
  const startSceneKey = startScene === undefined ? '' : JSON.stringify(startScene);
  const startSceneRef = useRef(startScene);
  startSceneRef.current = startScene;

  useImperativeHandle(
    ref,
    (): GameHandle => ({
      get version() {
        return handleRef.current?.version ?? 'unmounted';
      },
      get ready() {
        return handleRef.current?.ready ?? Promise.resolve();
      },
      get paused() {
        return handleRef.current?.paused ?? false;
      },
      pause: () => handleRef.current?.pause(),
      resume: () => handleRef.current?.resume(),
      setMuted: (m) => handleRef.current?.setMuted(m),
      resize: (w, h) => handleRef.current?.resize(w, h),
      destroy: () => handleRef.current?.destroy(),
      debug: {
        session: () => handleRef.current?.debug.session() ?? null,
      },
    }),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: startScene is tracked by value through startSceneKey
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let handle: GameHandle | null = null;
    const options: GameOptions = {
      signal: controller.signal,
      onEvent: (event) => {
        callbacks.current.onEvent?.(event);
        if (event.type === 'ready') callbacks.current.onReady?.();
        if (event.type === 'error') callbacks.current.onError?.(event.error);
      },
    };
    if (assetBaseUrl !== undefined) options.assetBaseUrl = assetBaseUrl;
    if (startSceneRef.current !== undefined) options.startScene = startSceneRef.current;
    if (seed !== undefined) options.seed = seed;
    if (muted !== undefined) options.muted = muted;
    try {
      handle = createGame(canvas, options);
      handleRef.current = handle;
      setFailed(null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setFailed(err);
      callbacks.current.onError?.(err);
      return;
    }
    return () => {
      controller.abort();
      handleRef.current = null;
    };
  }, [assetBaseUrl, startSceneKey, seed, muted]);

  useEffect(() => {
    if (!pauseWhenHidden) return;
    const onVisibility = (): void => {
      const handle = handleRef.current;
      if (!handle) return;
      if (document.hidden) handle.pause();
      else handle.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pauseWhenHidden]);

  useEffect(() => {
    handleRef.current?.setMuted(muted ?? false);
  }, [muted]);

  return (
    <div className={className} style={style ? { ...wrapperStyle, ...style } : wrapperStyle}>
      {failed ? (fallback ?? <p style={{ color: '#fff', padding: 16 }}>{failed.message}</p>) : null}
      <canvas ref={canvasRef} style={failed ? { ...canvasStyle, display: 'none' } : canvasStyle} />
    </div>
  );
});
