import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { VIRTUAL_WIDTH } from '../core/constants';
import type { GameSession } from '../core/sim/GameSession';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { letterRect } from '../render/sprites';
import type { Scene, SceneContext } from './Scene';
import { contains, drawButton, rect } from './ui';

export type ResultAction = 'next' | 'retry' | 'map';

export interface ResultOptions {
  readonly assets: Assets;
  readonly world: WorldAssets;
  readonly session: GameSession;
  readonly outcome: 'won' | 'lost';
  /** Best time before this run, 0 if never cleared. */
  readonly previousBest: number;
  /** True when this was the last playable level of the game. */
  readonly finalLevel: boolean;
  readonly onContinue: (action: ResultAction) => void;
}

const RETRY = rect(250, 500, 130, 36);
const MAP = rect(420, 500, 130, 36);
const CONTINUE = rect(335, 500, 130, 36);

/**
 * Level complete / defeat screen: the darkened background, the bobbing
 * letter strip and the run's numbers (exe strings), then Retry / Continue.
 */
export class ResultScene implements Scene {
  private t = 0;
  private hoverX = -1;
  private hoverY = -1;

  constructor(private readonly opts: ResultOptions) {}

  enter(_ctx: SceneContext): void {
    this.t = 0;
  }

  update(dt: number, input: readonly InputEvent[]): void {
    this.t += dt;
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (this.t < 0.4) continue;
      if (e.type === 'key') {
        if (e.key === 'Enter' || e.key === ' ') {
          this.opts.onContinue(this.opts.outcome === 'won' ? 'next' : 'retry');
        } else if (e.key === 'Escape') this.opts.onContinue('map');
        continue;
      }
      if (e.type !== 'down') continue;
      if (this.opts.outcome === 'won') {
        if (contains(CONTINUE, e.x, e.y)) this.opts.onContinue('next');
      } else if (contains(RETRY, e.x, e.y)) this.opts.onContinue('retry');
      else if (contains(MAP, e.x, e.y)) this.opts.onContinue('map');
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
      const y = 110 + Math.sin(this.t * 3 + i * 0.6) * 10;
      renderer.drawSprite(sheet, r.x, r.y, r.w, r.h, startX + i * size, y);
    }

    const font1 = assets.font('font1');
    const font2 = assets.font('font2');
    const cx = VIRTUAL_WIDTH / 2;
    const secs = Math.floor(session.seconds);
    const ttb = session.level.timeToBeat;
    const best = this.opts.previousBest > 0 ? Math.min(this.opts.previousBest, secs) : secs;
    const lines: string[] = [];
    if (outcome === 'won') {
      if (this.opts.finalLevel) lines.push("Congratulations!  You've won the game!");
      lines.push(`Time: ${secs} s (Best Time: ${best} s)`);
      lines.push(`Time to beat: ${ttb} s`);
      lines.push(
        secs <= ttb
          ? "You have this level's star!"
          : `Beat ${ttb} seconds to acquire this level's star.`,
      );
      lines.push(`Number of shots: ${session.stats.shots}`);
      lines.push(`Number of combos: ${session.stats.combos}`);
      lines.push(
        `Average combo size: ${
          session.stats.combos > 0
            ? (session.stats.comboPieces / session.stats.combos).toFixed(2)
            : 'N/A'
        }`,
      );
    } else {
      lines.push('Rosco found your piggy bank empty!');
      lines.push(`You lasted ${secs} s with ${session.stats.shots} shots.`);
      lines.push('Do you wish to retry the level?');
    }
    let y = 220;
    lines.forEach((line, i) => {
      renderer.drawText(i === 0 ? font1 : font2, line, cx, y, { align: 'center' });
      y += i === 0 ? 40 : 26;
    });
    if (this.t >= 0.4) {
      if (outcome === 'won') {
        drawButton(
          renderer,
          font2,
          CONTINUE,
          'Continue',
          contains(CONTINUE, this.hoverX, this.hoverY),
        );
      } else {
        drawButton(renderer, font2, RETRY, 'Retry', contains(RETRY, this.hoverX, this.hoverY));
        drawButton(renderer, font2, MAP, 'World map', contains(MAP, this.hoverX, this.hoverY));
      }
    }
    renderer.end();
  }

  leave(): void {}
}
