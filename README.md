# Shooterland

A rebuild of *Shooterland*, a 2006 puzzle game by 9 Minute Productions whose C++ source was lost. The original shipped data (`legacy/`) and an abandoned Android port (`android/`) are the sources; the result is an npm package, `shooterland`, with a pure TypeScript simulation, a WebGL renderer and a React component.

## Layout

| Path | What |
|---|---|
| `legacy/` | The original Windows beta: exes, graphics, fonts, sounds, level files, saves. Archival, never edited. |
| `android/` | Partial Java port and C# level editor. Reference only. |
| `packages/shooterland/` | The npm package. `src/core` is the deterministic simulation (no DOM); `src/render`, `src/scenes`, `src/engine`, `src/react` are presentation. `assets/` is generated. |
| `apps/playground/` | Vite dev app for playing and inspecting assets. |
| `tools/asset-pipeline/` | Node CLI that converts `legacy/` into `packages/shooterland/assets/`. |
| `docs/` | `RULES.md` (reconstructed gameplay), `FORMATS.md` (legacy file formats), `GAPS.md` (what is still unverified and how to resolve it). |

## Working on it

```sh
corepack pnpm install
corepack pnpm build        # builds packages/shooterland with tsdown
corepack pnpm test         # vitest
corepack pnpm dev          # playground at http://localhost:5199
corepack pnpm lint         # biome
corepack pnpm assets:build # regenerate packages/shooterland/assets from legacy/
```
