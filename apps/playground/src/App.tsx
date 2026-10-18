import { useRef, useState } from 'react';
import { type GameHandle, Shooterland } from 'shooterland';

const SIZES = [
  { label: 'Small (400px)', width: 400 },
  { label: 'Native (800px)', width: 800 },
  { label: 'Large (1200px)', width: 1200 },
  { label: 'Fluid (100%)', width: undefined },
] as const;

export function App() {
  const handle = useRef<GameHandle | null>(null);
  const [size, setSize] = useState<number | undefined>(800);
  const [mounted, setMounted] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Shooterland playground</strong>
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
      {mounted ? (
        <Shooterland
          ref={handle}
          style={size ? { width: size } : undefined}
          onEvent={(e) =>
            setLog((l) => [...l.slice(-19), `${new Date().toISOString().slice(11, 23)} ${e.type}`])
          }
        />
      ) : null}
      <pre style={{ margin: 0, opacity: 0.7 }}>{log.join('\n')}</pre>
    </div>
  );
}
