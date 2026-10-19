import { useEffect, useRef, useState } from 'react';
import { type GameHandle, Shooterland, type StartScene } from 'shooterland';
import { SheetGallery } from './SheetGallery';

const SIZES = [
  { label: 'Small (400px)', width: 400 },
  { label: 'Native (800px)', width: 800 },
  { label: 'Large (1200px)', width: 1200 },
  { label: 'Fluid (100%)', width: undefined },
] as const;

type SceneName = 'gameplay' | 'logo' | 'title' | 'worldMap' | 'assetViewer' | 'boot';
const SCENES: SceneName[] = ['gameplay', 'logo', 'title', 'worldMap', 'assetViewer', 'boot'];

interface Query {
  scene: SceneName;
  view: 'game' | 'sheets';
  level: string;
  seed: number;
  audio: 'webaudio' | 'none';
}

function readQuery(): Query {
  const q = new URLSearchParams(window.location.search);
  const scene = q.get('scene');
  return {
    scene: SCENES.includes(scene as SceneName) ? (scene as SceneName) : 'gameplay',
    view: q.get('view') === 'sheets' ? 'sheets' : 'game',
    level: /^\d+-\d+$/.test(q.get('level') ?? '') ? (q.get('level') as string) : '1-1',
    seed: Number.parseInt(q.get('seed') ?? '1', 10) || 1,
    audio: q.get('audio') === 'none' ? 'none' : 'webaudio',
  };
}

function toStartScene(q: Query): StartScene {
  if (q.scene !== 'gameplay') return q.scene;
  const [world, level] = q.level.split('-').map(Number);
  return { kind: 'gameplay', world: world ?? 1, level: level ?? 1, seed: q.seed };
}

declare global {
  interface Window {
    __shooterland?: GameHandle | null;
  }
}

export function App() {
  const handle = useRef<GameHandle | null>(null);
  const [query, setQuery] = useState(readQuery);
  const [size, setSize] = useState<number | undefined>(800);
  const [mounted, setMounted] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [levelDraft, setLevelDraft] = useState(query.level);

  useEffect(() => {
    const q = new URLSearchParams();
    if (query.scene !== 'gameplay') q.set('scene', query.scene);
    if (query.view !== 'game') q.set('view', query.view);
    if (query.level !== '1-1') q.set('level', query.level);
    if (query.seed !== 1) q.set('seed', String(query.seed));
    if (query.audio === 'none') q.set('audio', 'none');
    const qs = q.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [query]);

  const startScene = toStartScene(query);
  // Re-create the game only when the start scene actually changes.
  const sceneKey = JSON.stringify(startScene);

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
            value={query.scene}
            onChange={(e) => setQuery((s) => ({ ...s, scene: e.target.value as SceneName }))}
          >
            {SCENES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level{' '}
          <input
            value={levelDraft}
            size={5}
            onChange={(e) => setLevelDraft(e.target.value)}
            onBlur={() => {
              if (/^\d+-\d+$/.test(levelDraft)) setQuery((s) => ({ ...s, level: levelDraft }));
            }}
          />
        </label>
        <label>
          Seed{' '}
          <input
            type="number"
            value={query.seed}
            style={{ width: 70 }}
            onChange={(e) => setQuery((s) => ({ ...s, seed: Number(e.target.value) || 1 }))}
          />
        </label>
        {SIZES.map((s) => (
          <button key={s.label} type="button" onClick={() => setSize(s.width)}>
            {s.label}
          </button>
        ))}
        <button type="button" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'Unmount' : 'Mount'}
        </button>
        <label>
          <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />{' '}
          Mute
        </label>
        <button type="button" onClick={() => handle.current?.pause()}>
          Pause
        </button>
        <button type="button" onClick={() => handle.current?.resume()}>
          Resume
        </button>
      </header>
      {query.view === 'sheets' ? (
        <SheetGallery assetBaseUrl="/assets/" />
      ) : mounted ? (
        <Shooterland
          key={sceneKey}
          ref={(h) => {
            handle.current = h;
            window.__shooterland = h;
          }}
          assetBaseUrl="/assets/"
          startScene={startScene}
          audio={query.audio}
          muted={muted}
          style={size ? { width: size } : undefined}
          onEvent={(e) => {
            if (e.type === 'session') return;
            const detail =
              e.type === 'error'
                ? `: ${e.error.message}`
                : e.type === 'levelComplete'
                  ? ` ${e.world}-${e.level} in ${e.seconds.toFixed(1)}s${e.star ? ' (star)' : ''}`
                  : e.type === 'levelStart' || e.type === 'defeat'
                    ? ` ${e.world}-${e.level}`
                    : '';
            setLog((l) => [
              ...l.slice(-19),
              `${new Date().toISOString().slice(11, 23)} ${e.type}${detail}`,
            ]);
          }}
        />
      ) : null}
      <pre style={{ margin: 0, opacity: 0.7 }}>{log.join('\n')}</pre>
    </div>
  );
}
