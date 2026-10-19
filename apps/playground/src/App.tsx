import { useEffect, useRef, useState } from 'react';
import { type GameHandle, Shooterland, type StartScene } from 'shooterland';
import { SheetGallery } from './SheetGallery';

const SIZES = [
  { label: 'Small (400px)', width: 400 },
  { label: 'Native (800px)', width: 800 },
  { label: 'Large (1200px)', width: 1200 },
  { label: 'Fluid (100%)', width: undefined },
] as const;

const SCENES: StartScene[] = ['assetViewer', 'boot'];

function readQuery(): { scene: StartScene; view: 'game' | 'sheets' } {
  const q = new URLSearchParams(window.location.search);
  const scene = q.get('scene');
  return {
    scene: SCENES.includes(scene as StartScene) ? (scene as StartScene) : 'assetViewer',
    view: q.get('view') === 'sheets' ? 'sheets' : 'game',
  };
}

export function App() {
  const handle = useRef<GameHandle | null>(null);
  const [{ scene, view }, setQuery] = useState(readQuery);
  const [size, setSize] = useState<number | undefined>(800);
  const [mounted, setMounted] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (scene !== 'assetViewer') q.set('scene', scene);
    if (view !== 'game') q.set('view', view);
    const qs = q.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [scene, view]);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Shooterland playground</strong>
        <button type="button" onClick={() => setQuery((s) => ({ ...s, view: 'game' }))}>
          Game
        </button>
        <button type="button" onClick={() => setQuery((s) => ({ ...s, view: 'sheets' }))}>
          Sheets
        </button>
        <span style={{ opacity: 0.6 }}>|</span>
        <label>
          Scene{' '}
          <select
            value={scene}
            onChange={(e) => setQuery((s) => ({ ...s, scene: e.target.value as StartScene }))}
          >
            {SCENES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {SIZES.map((s) => (
          <button key={s.label} type="button" onClick={() => setSize(s.width)}>
            {s.label}
          </button>
        ))}
        <button type="button" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'Unmount' : 'Mount'}
        </button>
        <button type="button" onClick={() => handle.current?.pause()}>
          Pause
        </button>
        <button type="button" onClick={() => handle.current?.resume()}>
          Resume
        </button>
      </header>
      {view === 'sheets' ? (
        <SheetGallery assetBaseUrl="/assets/" />
      ) : mounted ? (
        <Shooterland
          ref={handle}
          assetBaseUrl="/assets/"
          startScene={scene}
          style={size ? { width: size } : undefined}
          onEvent={(e) =>
            setLog((l) => [
              ...l.slice(-19),
              `${new Date().toISOString().slice(11, 23)} ${e.type}${e.type === 'error' ? `: ${e.error.message}` : ''}`,
            ])
          }
        />
      ) : null}
      <pre style={{ margin: 0, opacity: 0.7 }}>{log.join('\n')}</pre>
    </div>
  );
}
