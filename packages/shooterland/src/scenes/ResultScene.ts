import type { Assets, WorldAssets } from '../assets/AssetLoader';
import { GRID_SIZE, TICK_RATE, TILE_PX } from '../core/constants';
import type { GameSession } from '../core/sim/GameSession';
import type { InputEvent } from '../input/PointerInput';
import type { Renderer } from '../render/Renderer';
import { letterRect } from '../render/sprites';
import { drawSlot, drawSlotCentred, Slot } from './fonts';
import { LAYOUT } from './layout';
import type { Scene, SceneContext } from './Scene';
import { contains, type Rect, rect } from './ui';

export type ResultAction = 'next' | 'retry' | 'map';

export interface ResultOptions {
  readonly assets: Assets;
  readonly world: WorldAssets;
  readonly session: GameSession;
  readonly outcome: 'won' | 'lost';
  /** Best time before this run, 0 if never cleared. */
  readonly previousBest: number;
  /** Wins and losses on the file after this result, for "Current Record". */
  readonly record: { wins: number; losses: number; slot: number };
  /** True when this was the last playable level of the game. */
  readonly finalLevel: boolean;
  readonly onContinue: (action: ResultAction) => void;
}

/** OK and Retry (`FUN_004025a3`). */
const OK = rect(210, 530, 80, 60);
const RETRY = rect(310, 530, 80, 60);
const TEXT_X = 100;

/**
 * Level complete / defeat screen (`FUN_00406ea9`): the darkened background
 * with the grid, the bobbing letter strip, the run's numbers, then OK / Retry.
 */
export class ResultScene implements Scene {
  private ticks = 0;
  private hoverX = -1;
  private hoverY = -1;

  constructor(private readonly opts: ResultOptions) {}

  enter(_ctx: SceneContext): void {
    this.ticks = 0;
  }

  update(_dt: number, input: readonly InputEvent[]): void {
    this.ticks++;
    for (const e of input) {
      if (e.type === 'move') {
        this.hoverX = e.x;
        this.hoverY = e.y;
        continue;
      }
      if (this.ticks < 24) continue;
      if (e.type === 'key') {
        if (e.key === 'Enter' || e.key === ' ')
          this.opts.onContinue(this.opts.outcome === 'won' ? 'next' : 'retry');
        else if (e.key === 'Escape') this.opts.onContinue('map');
        continue;
      }
      if (e.type !== 'down' || e.button !== 0) continue;
      if (contains(OK, e.x, e.y))
        this.opts.onContinue(this.opts.outcome === 'won' ? 'next' : 'map');
      else if (contains(RETRY, e.x, e.y)) this.opts.onContinue('retry');
    }
  }

  private drawButton(renderer: Renderer, r: Rect, label: string): void {
    const lit = contains(r, this.hoverX, this.hoverY);
    const c = lit ? 0.9 : 0.4;
    renderer.drawRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, c, c, c);
    renderer.drawRect(r.x, r.y, r.w, r.h, 0.08, 0.05, 0.02);
    drawSlotCentred(renderer, this.opts.assets, Slot.white, label, r);
  }

  draw(renderer: Renderer): void {
    const { assets, world, session, outcome } = this.opts;
    renderer.begin();
    renderer.drawImage(world.backgroundDark, 0, 0);
    const { board } = LAYOUT;
    for (let i = 0; i <= GRID_SIZE; i++) {
      renderer.drawRect(board.x, board.y + i * TILE_PX, board.size, 1, 1 / 255, 0, 11 / 255);
      renderer.drawRect(board.x + i * TILE_PX, board.y, 1, board.size, 1 / 255, 0, 11 / 255);
    }

    const t = (this.ticks * 1000) / TICK_RATE;
    const won = outcome === 'won';
    const sheet = assets.image(won ? 'complete' : 'defeat');
    const count = won ? 8 : 6;
    const startX = won ? 51 : 70;
    const step = won ? 60 : 80;
    for (let i = 0; i < count; i++) {
      const r = letterRect(i, 60);
      const y = 40 + Math.sin((t + i * 800) / 500) * 20 + 20;
      renderer.drawSprite(sheet, r.x, r.y, r.w, r.h, startX + i * step, y);
    }

    const secs = session.elapsedSeconds;
    const ttb = session.level.timeToBeat;
    const best = this.opts.previousBest > 0 ? Math.min(this.opts.previousBest, secs) : secs;
    drawSlot(renderer, assets, Slot.white, `Time: ${secs} s (Best Time: ${best} s)`, TEXT_X, 180);
    drawSlot(renderer, assets, Slot.white, `Time to beat: ${ttb} s`, TEXT_X, 213);
    let starLine: string;
    if (session.level.world === 7) {
      starLine = won
        ? "Congratulations!  You've won the game!"
        : `Live at least ${ttb} seconds to beat this final challenge of the game!`;
    } else if (won && secs <= ttb) starLine = "You have this level's star!";
    else starLine = `Beat ${ttb} seconds to acquire this level's star.`;
    drawSlot(renderer, assets, Slot.smallWhite, starLine, TEXT_X, 246);
    drawSlot(renderer, assets, Slot.white, `Number of shots: ${session.stats.shots}`, TEXT_X, 300);
    drawSlot(
      renderer,
      assets,
      Slot.white,
      `Number of combos: ${session.stats.combos}`,
      TEXT_X,
      333,
    );
    const avg =
      session.stats.combos > 0
        ? `Average combo size: ${(session.stats.comboPieces / session.stats.combos).toFixed(2)}`
        : 'Average combo size: N/A';
    drawSlot(renderer, assets, Slot.white, avg, TEXT_X, 366);
    const { record } = this.opts;
    drawSlot(
      renderer,
      assets,
      Slot.white,
      record.slot === 3
        ? 'Current Record: I HATE CHICKEN!'
        : `Current Record: ${record.wins}-${record.losses}`,
      TEXT_X,
      430,
    );
    if (this.ticks >= 24) {
      this.drawButton(renderer, OK, 'OK');
      this.drawButton(renderer, RETRY, 'Retry');
    }
    renderer.end();
  }

  leave(): void {}
}
