import type { Assets } from '../assets/AssetLoader';
import type { LevelData } from '../core/level/LevelData';
import type { Rules } from '../core/rules';
import { bestTime, lastLevelOfWorld, type SlotNumber, worldExists } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { SessionEvent } from '../core/sim/GameSession';
import { GameplayScene } from '../scenes/GameplayScene';
import { LogoScene } from '../scenes/LogoScene';
import { PreviewScene } from '../scenes/PreviewScene';
import { ResultScene } from '../scenes/ResultScene';
import { SaveSelectScene } from '../scenes/SaveSelectScene';
import type { SceneManager } from '../scenes/Scene';
import { StatsScene } from '../scenes/StatsScene';
import { TitleScene } from '../scenes/TitleScene';
import { WorldMapScene } from '../scenes/WorldMapScene';

export type FlowEvent =
  | { readonly type: 'levelStart'; readonly world: number; readonly level: number }
  | {
      readonly type: 'levelComplete';
      readonly world: number;
      readonly level: number;
      readonly seconds: number;
      readonly star: boolean;
    }
  | { readonly type: 'defeat'; readonly world: number; readonly level: number }
  | { readonly type: 'session'; readonly events: readonly SessionEvent[] }
  | { readonly type: 'save'; readonly slot: SlotNumber }
  | { readonly type: 'quit' };

export interface FlowOptions {
  readonly rules: Rules;
  /** Seed for the next level; called per level start so replays can pin it. */
  readonly nextSeed: () => number;
  readonly emit: (event: FlowEvent) => void;
  readonly isDestroyed: () => boolean;
}

/**
 * The screen graph: logo -> title -> save files -> world map -> (preview) ->
 * gameplay -> result -> world map, plus stats and the pause menu's quit.
 */
export class GameFlow {
  gameplay: GameplayScene | null = null;

  constructor(
    private readonly assets: Assets,
    private readonly scenes: SceneManager,
    private readonly saves: SaveService,
    private readonly opts: FlowOptions,
  ) {}

  logo(): void {
    this.scenes.go(new LogoScene(this.assets, () => this.title()));
  }

  title(): void {
    this.gameplay = null;
    this.scenes.go(
      new TitleScene(this.assets, {
        onStart: () => this.saveSelect(),
        onQuit: () => {
          this.opts.emit({ type: 'quit' });
          this.logo();
        },
      }),
    );
  }

  saveSelect(): void {
    this.scenes.go(
      new SaveSelectScene(this.assets, this.saves, {
        onLoad: (slot) => {
          void this.saves.select(slot).then(() => {
            if (!this.opts.isDestroyed()) this.worldMap();
          });
        },
        onBack: () => this.title(),
      }),
    );
  }

  worldMap(at?: { world: number; level: number }): void {
    this.gameplay = null;
    this.scenes.go(
      new WorldMapScene(
        this.assets,
        this.saves,
        this.opts.rules.starThresholds,
        {
          onPlay: (level) => void this.play(level),
          onPreview: (level) => this.preview(level),
          onMenu: () => this.title(),
          onStats: () => this.stats(),
        },
        at,
      ),
    );
  }

  preview(level: LevelData): void {
    this.scenes.go(
      new PreviewScene(this.assets, this.saves, level, {
        onPlay: () => void this.play(level),
        onBack: () => this.worldMap({ world: level.world, level: level.level }),
      }),
    );
  }

  stats(): void {
    this.scenes.go(new StatsScene(this.assets, this.saves, () => this.worldMap()));
  }

  async play(level: LevelData, seed = this.opts.nextSeed()): Promise<void> {
    const world = await this.assets.world(level.world);
    if (this.opts.isDestroyed()) return;
    const previousBest = bestTime(this.saves.data, level.world, level.level);
    const scene = new GameplayScene({
      assets: this.assets,
      world,
      level,
      seed,
      rules: this.opts.rules,
      onEvents: (events) => this.opts.emit({ type: 'session', events }),
      onQuit: () => this.worldMap({ world: level.world, level: level.level }),
      onFinish: ({ outcome, session }) => {
        this.gameplay = null;
        void this.saves.finishLevel(level, outcome, {
          seconds: session.seconds,
          shots: session.stats.shots,
          combos: session.stats.combos,
          comboPieces: session.stats.comboPieces,
        });
        this.opts.emit({ type: 'save', slot: this.saves.slot });
        if (outcome === 'won') {
          this.opts.emit({
            type: 'levelComplete',
            world: level.world,
            level: level.level,
            seconds: session.seconds,
            star: session.seconds <= level.timeToBeat,
          });
        } else {
          this.opts.emit({ type: 'defeat', world: level.world, level: level.level });
        }
        this.scenes.go(
          new ResultScene({
            assets: this.assets,
            world,
            session,
            outcome,
            previousBest,
            finalLevel: this.isFinalLevel(level),
            onContinue: (action) => {
              if (action === 'retry') void this.play(level);
              else if (action === 'next') this.worldMap(this.nextPosition(level));
              else this.worldMap({ world: level.world, level: level.level });
            },
          }),
        );
      },
    });
    this.gameplay = scene;
    this.scenes.go(scene);
    void this.saves.setPosition(level.world, level.level);
    this.opts.emit({ type: 'levelStart', world: level.world, level: level.level });
  }

  private isFinalLevel(level: LevelData): boolean {
    const levels = this.assets.levels;
    return (
      level.level === lastLevelOfWorld(levels, level.world) && !worldExists(levels, level.world + 1)
    );
  }

  /** After a win the map selects the following level, rolling into the next world. */
  private nextPosition(level: LevelData): { world: number; level: number } {
    const levels = this.assets.levels;
    if (level.level < lastLevelOfWorld(levels, level.world)) {
      return { world: level.world, level: level.level + 1 };
    }
    if (worldExists(levels, level.world + 1) && this.saves.worldUnlocked(level.world + 1)) {
      return { world: level.world + 1, level: 1 };
    }
    return { world: level.world, level: level.level };
  }
}
