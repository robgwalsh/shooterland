import { useEffect, useState } from 'react';
import type { AssetManifest } from 'shooterland';

const checker: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  backgroundColor: '#999',
  imageRendering: 'pixelated',
  display: 'inline-block',
};

/** Lists every converted image on a checkerboard so colour-key holes are visible. */
export function SheetGallery({ assetBaseUrl }: { assetBaseUrl: string }) {
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${assetBaseUrl}manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m: AssetManifest) => setManifest(m))
      .catch((e: Error) => setError(e.message));
  }, [assetBaseUrl]);

  if (error) return <p>Could not load manifest: {error}</p>;
  if (!manifest) return <p>Loading manifest…</p>;

  const worlds = Object.entries(manifest.worlds);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Sprite sheets ({Object.keys(manifest.images).length})</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {Object.entries(manifest.images).map(([key, img]) => (
          <figure key={key} style={{ margin: 0 }}>
            <figcaption>
              {key} {img.width}x{img.height}
            </figcaption>
            <img src={`${assetBaseUrl}${img.path}`} alt={key} style={checker} />
          </figure>
        ))}
      </div>
      <h2 style={{ margin: 0 }}>Fonts</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {Object.entries(manifest.fonts).map(([key, f]) => (
          <figure key={key} style={{ margin: 0 }}>
            <figcaption>{key}</figcaption>
            <img src={`${assetBaseUrl}${f.image}`} alt={key} style={{ ...checker, width: 256 }} />
          </figure>
        ))}
      </div>
      <h2 style={{ margin: 0 }}>Worlds</h2>
      {worlds.map(([n, w]) => (
        <div
          key={n}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}
        >
          <strong style={{ width: '100%' }}>World {n}</strong>
          {(['tiles', 'supplement', 'background', 'backgroundDark', 'map'] as const).map((k) => (
            <figure key={k} style={{ margin: 0 }}>
              <figcaption>{k}</figcaption>
              <img
                src={`${assetBaseUrl}${w[k]}`}
                alt={`world ${n} ${k}`}
                style={{
                  ...checker,
                  maxWidth: k === 'tiles' || k === 'supplement' ? undefined : 400,
                }}
              />
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}
