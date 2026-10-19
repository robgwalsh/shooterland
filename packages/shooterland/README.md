# shooterland

*Shooterland* (2006) rebuilt for the web: a deterministic TypeScript simulation, a WebGL renderer, and a React component. Mary and Poindexter fire food at Rosco's army; line up three of a kind to clear them, buy weights and ramps from the store, and beat the clock before the raccoon empties your piggy bank.

## Install

```sh
npm install shooterland react react-dom
```

React 18 or 19 is an optional peer dependency: the `shooterland/engine` and `shooterland/core` entry points have no React dependency at all.

## Use

```tsx
import { Shooterland } from 'shooterland';

export function Page() {
  return <Shooterland style={{ height: '100vh' }} />;
}
```

The component fills its container and draws the game as the largest 4:3 box that fits, centred on black. Give the container (or the `style` prop) a height to let the game grow and shrink with the available space; with no height it becomes a 4:3 box as wide as its container. By default the game's assets (sprites, fonts, levels, sounds, an 8 MB General MIDI sound bank) load from jsDelivr for the installed version. To self-host, copy `node_modules/shooterland/assets` somewhere static and point `assetBaseUrl` at it:

```tsx
<Shooterland assetBaseUrl="/shooterland-assets/" />
```

### Props

| Prop | Default | What it does |
|---|---|---|
| `assetBaseUrl` | jsDelivr CDN | Base URL (trailing slash) of the `assets/` directory. |
| `storage` | `localStorage` | A `SaveStorage` implementation for the three save files. |
| `audio` | `'webaudio'` | `'none'` disables sound and music. |
| `muted`, `volume` | `false`, `1` | Master mute and volume (0..1). |
| `pauseWhenHidden` | `true` | Pauses the simulation while the tab is hidden. |
| `startScene` | `'title'` | `'worldMap'`, or `{ kind: 'gameplay', world, level, seed }` to jump straight into a level, skipping its intro screen. |
| `seed` | time-based | Seed for the deterministic simulation. |
| `onEvent` | | Receives `ready`, `levelStart`, `levelComplete`, `defeat`, `save`, `quit`, `session` and `error` events. |
| `fallback` | | Rendered when WebGL2 is unavailable. |

A `ref` gives you the `GameHandle` with `pause()`, `resume()`, `setMuted()`, `setVolume()` and `destroy()`.

### Without React

```ts
import { createGame } from 'shooterland/engine';

const handle = createGame(document.querySelector('canvas')!, { assetBaseUrl: '/shooterland-assets/' });
```

### Just the rules

`shooterland/core` exposes the pure simulation: `GameSession`, the level parser, the save model and the rule table, with no DOM dependency. It runs under Node for tests and tooling.

## Fidelity

The original C++ source is lost, so the rules were read from a disassembly of the shipped exe: ammo odds, shot stepping, ramps, the weight push/crush walk, the kill table, Rosco's timing, store prices, star thresholds and the stats formulas (the repository's `docs/RULES.md` and `docs/DISASSEMBLY.md`). Every constant lives in one rules table (`DEFAULT_RULES` from `shooterland/core`) so it can be tuned without touching the engine; one original quirk, the store's blank lane slots, sits behind `storeBlanksOtherLanes`.

## Licence

Code is MIT. Game art, levels and music belong to their original authors (9 Minute Productions). The bundled General MIDI sound bank is GeneralUser GS by S. Christian Collins; see `THIRD_PARTY_NOTICES.md`.
