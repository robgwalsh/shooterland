import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  entry: {
    index: './src/index.ts',
    core: './src/core.ts',
    engine: './src/engine.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  // Only the React entry is a client module; core/engine stay directive-free.
  banner: ({ fileName }) => (/^index\.(js|cjs)$/.test(fileName) ? "'use client';" : undefined),
  define: {
    __SHOOTERLAND_VERSION__: JSON.stringify(pkg.version),
  },
  deps: {
    neverBundle: ['react', 'react-dom', 'react/jsx-runtime'],
  },
});
