import type { Assets } from '../assets/AssetLoader';
import type { GameAudio } from '../audio/AudioEngine';
import type { LevelData } from '../core/level/LevelData';
import type { Rules } from '../core/rules';
import { bestTime, lastLevelOfWorld, type SlotNumber, worldExists } from '../core/save/SaveData';
import type { SaveService } from '../core/save/SaveService';
import type { SessionEvent } from '../core/sim/GameSession';
import { GameplayScene } from '../scenes/GameplayScene';
import { IntroScene } from '../scenes/IntroScene';
import { LogoScene } from '../scenes/LogoScene';
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

/** Leaving a level after this many seconds counts as a loss (`FUN_00402dc6`). */
const QUIT_LOSS_SECONDS = 5;

/**
 * The screen graph, as the exe's state machine has it: logo -> title -> files
 * -> world map -> level intro -> gameplay -> result -> world map, plus stats
 * and the retry / quit prompts.
 */
export class GameFlow {
  gameplay: GameplayScene | null = null;

  constructor(
    private readonly assets: Assets,
    private readonly scenes: SceneManager,
    private readonly saves: SaveService,
    private readonly audio: GameAudio,
    private readonly opts: FlowOptions,
  ) {}

  logo(): void {
    this.audio.music('titlescreen');
    this.scenes.go(new LogoScene(this.assets, () => this.title()));
  }

  title(): void {
    this.gameplay = null;
    this.audio.music('titlescreen');
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
    this.audio.music('maptheme');
    this.scenes.go(
      new WorldMapScene(
        this.assets,
        this.saves,
        this.opts.rules.starThresholds,
        {
          onPlay: (level) => void this.play(level),
          onMenu: () => this.title(),
          onStats: () => this.stats(),
        },
        at,
      ),
    );
  }

  stats(): void {
    this.scenes.go(new StatsScene(this.assets, this.saves, () => this.worldMap()));
  }

  /**
   * Loads a level: the intro screen shows the board standing still, and Play
   * starts the clock. `skipIntro` jumps straight in (deep links, retries).
   */
  async play(level: LevelData, seed = this.opts.nextSeed(), skipIntro = false): Promise<void> {
    const world = await this.assets.world(level.world);
    if (this.opts.isDestroyed()) return;
    const previousBest = bestTime(this.saves.data, level.world, level.level);
    this.audio.music(`world${Math.min(7, Math.max(1, level.world))}`);
    const leave = (scene: GameplayScene): void => {
      // Leaving a level after a few seconds of play counts as a loss, as in the exe.
      if (scene.session.seconds > QUIT_LOSS_SECONDS) {
        void this.saves.finishLevel(level, 'lost', {
          seconds: scene.session.seconds,
          shots: 0,
          combos: 0,
          comboPieces: 0,
        });
        this.opts.emit({ type: 'save', slot: this.saves.slot });
      }
    };
    const scene = new GameplayScene({
      assets: this.assets,
      world,
      level,
      seed,
      rules: this.opts.rules,
      audio: this.audio,
      onEvents: (events) => this.opts.emit({ type: 'session', events }),
      onQuit: () => {
        leave(scene);
        this.worldMap({ world: level.world, level: level.level });
      },
      onRetry: () => {
        leave(scene);
        void this.play(level, this.opts.nextSeed(), true);
      },
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
            star: session.elapsedSeconds <= level.timeToBeat,
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
            record: {
              wins: this.saves.data.wins,
              losses: this.saves.data.losses,
              slot: this.saves.slot,
            },
            finalLevel: this.isFinalLevel(level),
            onContinue: (action) => {
              if (action === 'retry') void this.play(level, this.opts.nextSeed(), true);
              else if (action === 'next') this.worldMap(this.nextPosition(level));
              else this.worldMap({ world: level.world, level: level.level });
            },
          }),
        );
      },
    });
    this.gameplay = scene;
    if (skipIntro) {
      this.scenes.go(scene);
    } else {
      this.scenes.go(
        new IntroScene(this.assets, world, scene, {
          onPlay: () => this.scenes.go(scene),
          onBack: () => this.worldMap({ world: level.world, level: level.level }),
        }),
      );
    }
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
