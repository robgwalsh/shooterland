import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { VIRTUAL_WIDTH } from '../core/constants';
import type { GameSession } from '../core/sim/GameSession';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { letterRect } from '../render/sprites';
import type { Scene, SceneContext } from './Scene';

export interface ResultOptions {
  readonly assets: Assets;
  readonly world: WorldAssets;
  readonly session: GameSession;
  readonly outcome: 'won' | 'lost';
  readonly onContinue: (action: 'retry' | 'next') => void;
}

/**
 * Level complete / defeat screen: the darkened background, the bobbing
 * letter strip and the run's numbers, then a click to continue.
 * (Phase 6 replaces this with the original's full flow.)
 */
export class ResultScene implements Scene {
  private t = 0;

  constructor(private readonly opts: ResultOptions) {}

  enter(_ctx: SceneContext): void {
    this.t = 0;
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    if (this.t < 0.4) return;
    for (const e of input) {
      if (e.type === 'down') {
        this.opts.onContinue(this.opts.outcome === 'won' ? 'next' : 'retry');
        return;
      }
    }
  }

  draw(renderer: Renderer): void {
    const { assets, world, session, outcome } = this.opts;
    renderer.begin();
    renderer.drawImage(world.backgroundDark, 0, 0);

    const word = outcome === 'won' ? 'COMPLETE' : 'DEFEAT';
    const sheet = assets.image(outcome === 'won' ? 'complete' : 'defeat');
    const size = 60;
    const startX = (VIRTUAL_WIDTH - word.length * size) / 2;
    for (let i = 0; i < word.length; i++) {
      const r = letterRect(i, size);
      const y = 120 + Math.sin(this.t * 3 + i * 0.6) * 10;
      renderer.drawSprite(sheet, r.x, r.y, r.w, r.h, startX + i * size, y);
    }

    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    const cx = VIRTUAL_WIDTH / 2;
    const secs = Math.floor(session.seconds);
    const lines =
      outcome === 'won'
        ? [
            `Time: ${secs} s   Time to beat: ${session.level.timeToBeat} s`,
            secs <= session.level.timeToBeat
              ? "You have this level's star!"
              : `Beat ${session.level.timeToBeat} seconds to acquire this level's star.`,
            `Number of shots: ${session.stats.shots}`,
            `Number of combos: ${session.stats.combos}`,
            `Average combo size: ${
              session.stats.combos > 0
                ? (session.stats.comboPieces / session.stats.combos).toFixed(2)
                : 'N/A'
            }`,
          ]
        : ['Rosco found your piggy bank empty!', 'Do you wish to retry the level?'];
    let y = 230;
    for (const line of lines) {
      renderer.drawText(font1, line, cx, y, { align: 'center' });
      y += 36;
    }
    if (this.t >= 0.4)
      renderer.drawText(font2, 'Click to return...', cx, 520, { align: 'center', a: 0.8 });
    renderer.end();
  }

  leave(): void {}
}
