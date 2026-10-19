import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkgSrc = (p: string): string =>
  fileURLToPath(new URL(`../../packages/shooterland/src/${p}`, import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: { port: 5199, strictPort: true, fs: { allow: ['../..'] } },
  // Serve the generated game assets at /assets/ (the playground passes assetBaseUrl="/assets/").
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  resolve: {
    // During `vite dev`, point at the package sources for instant reloads.
    // `vite build` goes through the real package `exports` so packaging bugs surface.
    alias:
      command === 'serve'
        ? [
            { find: /^shooterland\/core$/, replacement: pkgSrc('core.ts') },
            { find: /^shooterland\/engine$/, replacement: pkgSrc('engine.ts') },
            { find: /^shooterland$/, replacement: pkgSrc('index.ts') },
          ]
        : [],
  },
  define: {
    __SHOOTERLAND_VERSION__: JSON.stringify('dev'),
  },
}));
