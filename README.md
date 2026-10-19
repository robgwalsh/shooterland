# Shooterland

A rebuild of *Shooterland*, a 2006 puzzle game by 9 Minute Productions whose C++ source was lost. The original shipped data (`legacy/`) and an abandoned Android port (`android/`) are the sources; the result is an npm package, `shooterland`, with a pure TypeScript simulation, a WebGL renderer and a React component. See `packages/shooterland/README.md` for how to use the package.

## Layout

| Path | What |
|---|---|
| `legacy/` | The original Windows beta: exes, graphics, fonts, sounds, level files, saves. Archival, never edited. |
| `android/` | Partial Java port and C# level editor. Reference only. |
| `packages/shooterland/` | The npm package. `src/core` is the deterministic simulation (no DOM); `src/render`, `src/scenes`, `src/audio`, `src/engine`, `src/react` are presentation. `assets/` is generated and committed. |
| `apps/playground/` | Vite dev app for playing, inspecting assets and jumping to any level; Playwright tests live in `e2e/`. |
| `tools/asset-pipeline/` | Node CLI that converts `legacy/` into `packages/shooterland/assets/`. `vendor/` holds the GeneralUser GS sound bank and its licence. |
| `docs/` | `RULES.md` (reconstructed gameplay), `FORMATS.md` (legacy file formats), `GAPS.md` (what is still unverified), `RECONCILIATION.md` (what to check in the original exe). |

## Working on it

```sh
pnpm install
pnpm run build          # packages/shooterland: library (dist/) and the synth worker (assets/music/)
pnpm run assets:build   # regenerate packages/shooterland/assets from legacy/ (run after build so the worker is kept)
pnpm run test           # vitest: level parser against every legacy file, simulation, saves
pnpm run dev            # playground at http://localhost:5199
pnpm -C apps/playground run e2e   # Playwright (chromium) against the playground
pnpm run lint           # biome
pnpm run typecheck
```

Playground URL parameters: `?level=1-11&seed=3` jumps into a level, `?scene=title|worldMap|assetViewer|boot` picks a screen, `?audio=none` silences it, `?view=sheets` lists every converted sprite sheet.

## Status

Worlds 1 to 6-13 are playable with the rules reconstructed so far. `docs/GAPS.md` lists every rule and constant that still needs confirming against the original exe, and `docs/RECONCILIATION.md` is the checklist for doing that.
